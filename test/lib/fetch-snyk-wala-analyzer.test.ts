import {
  fetch,
  getVersion,
  getBinaryName,
} from '../../lib/fetch-snyk-wala-analyzer';
import * as nock from 'nock';
import * as fs from 'fs';
import * as path from 'path';
import * as tempDir from 'temp-dir';

nock.disableNetConnect();
const tmpPath = path.join(
  tempDir,
  'snyk-wala-analyzer',
  getVersion(),
  getBinaryName(),
);

beforeEach(async () => {
  jest.resetAllMocks();
  try {
    fs.unlinkSync(tmpPath);
  } catch (e) {
    // ignore
  }
});

test('analyzer is fetched', async () => {
  nock('https://snyk.io')
    .get(/\/resources\/.*/)
    .reply(200, () => {
      return fs.createReadStream(
        path.join(__dirname, '../fixtures/wala-analyzer.txt'),
      );
    });
  expect(await fetch()).toEqual(tmpPath);
});

test('analyzer is not fetched when available', async () => {
  jest.spyOn(fs, 'existsSync').mockReturnValue(true);
  nock('https://snyk.io')
    .get(/\/resources\/.*/)
    .reply(500);
  expect(await fetch()).toEqual(tmpPath);
});

test('analyzer fetch error is caught', async () => {
  nock('https://snyk.io')
    .get(/\/resources\/.*/)
    .reply(404);
  await expect(fetch()).rejects.toThrowError(
    'Bad HTTP response for snyk-wala-analyzer download',
  );
});
