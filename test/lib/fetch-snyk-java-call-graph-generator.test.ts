import * as fetchSnykJavaCallGraphGenerator from '../../lib/fetch-snyk-java-call-graph-generator';
import * as nock from 'nock';
import * as fs from 'fs';
import * as path from 'path';
import * as tempDir from 'temp-dir';
import * as needle from 'needle';

import * as promisifiedFs from '../../lib/promisified-fs-glob';

nock.disableNetConnect();
const tmpPath = path.join(
  tempDir,
  'call-graph-generator',
  fetchSnykJavaCallGraphGenerator.JAR_NAME,
);

beforeEach(async () => {
  jest.restoreAllMocks();
  try {
    fs.unlinkSync(tmpPath);
  } catch (e) {
    // ignore
  }
});

const URL = 'https://snyk.test/resources/testing-address.jar';
const EXPECTED_CHECKSUM =
  '56293a80e0394d252e995f2debccea8223e4b5b2b150bee212729b3b39ac4d46';

test('analyzer is fetched when does not exist', async () => {
  nock('https://snyk.test')
    .get('/resources/testing-address.jar')
    .replyWithFile(
      200,
      __dirname + '/../fixtures/snyk-call-graph-generator.txt',
      { 'Content-Length': '446' },
    );

  expect(
    await fetchSnykJavaCallGraphGenerator.fetch(URL, EXPECTED_CHECKSUM),
  ).toEqual(tmpPath);
});

test('analyzer is not fetched when actual version is available', async () => {
  jest.spyOn(promisifiedFs, 'exists').mockResolvedValue(true);
  jest
    .spyOn(fs, 'createReadStream')
    .mockReturnValue(
      fs.createReadStream(
        path.join(__dirname, '../fixtures/snyk-call-graph-generator.txt'),
      ),
    );
  jest.spyOn(needle, 'get');
  expect(
    await fetchSnykJavaCallGraphGenerator.fetch(URL, EXPECTED_CHECKSUM),
  ).toEqual(tmpPath);
  expect(needle.get).not.toHaveBeenCalled();
});

test('analyzer is fetched when older version is available', async () => {
  jest.spyOn(promisifiedFs, 'exists').mockResolvedValue(true);

  nock('https://snyk.test')
    .get('/resources/testing-address.jar')
    .replyWithFile(
      200,
      __dirname + '/../fixtures/snyk-call-graph-generator.txt',
      { 'Content-Length': '446' },
    );

  jest.spyOn(fs, 'createReadStream').mockImplementationOnce(() => {
    return fs.createReadStream(
      path.join(__dirname, '../fixtures/snyk-call-graph-generator_old.txt'),
    );
  });

  const a = await fetchSnykJavaCallGraphGenerator.fetch(URL, EXPECTED_CHECKSUM);
  expect(a).toEqual(tmpPath);
});

test('analyzer fetch error is caught', async () => {
  nock('https://snyk.test')
    .get('/resources/testing-address.jar')
    .reply(404);
  await expect(
    fetchSnykJavaCallGraphGenerator.fetch(URL, EXPECTED_CHECKSUM),
  ).rejects.toThrowError(
    'Bad HTTP response for snyk-call-graph-generator download',
  );
});

test('analyzer wrong checksum after download is caught', async () => {
  nock('https://snyk.test')
    .get('/resources/testing-address.jar')
    .replyWithFile(
      200,
      __dirname + '/../fixtures/snyk-call-graph-generator_old.txt',
      { 'Content-Length': '446' },
    );

  await expect(
    fetchSnykJavaCallGraphGenerator.fetch(URL, EXPECTED_CHECKSUM),
  ).rejects.toThrowError('Wrong checksum of downloaded call-graph-generator.');
});
