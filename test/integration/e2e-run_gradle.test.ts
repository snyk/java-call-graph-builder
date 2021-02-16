import * as path from 'path';
import * as fs from '../../lib/promisified-fs-glob';
import { getCallGraphGradle } from '../../lib';

jest.setTimeout(60000);

let tmpFilePath;
test('callgraph for gradle is created without an init script', async () => {
  const mkdtempSpy = jest.spyOn(fs, 'mkdtemp');
  const writeFileSpy = jest.spyOn(fs, 'writeFile');
  await getCallGraphGradle(
    path.join(
      __dirname,
      ...'../fixtures/java-reachability-playground'.split('/'),
    ),
  );

  // verify tempdir was created and file written
  expect(mkdtempSpy.mock.calls.length).toEqual(1);
  expect(writeFileSpy.mock.calls.length).toEqual(1);
  tmpFilePath = writeFileSpy.mock.calls[0][0];
});

test('callgraph for gradle is created with an init script', async () => {
  const mkdtempSpy = jest.spyOn(fs, 'mkdtemp');
  const writeFileSpy = jest.spyOn(fs, 'writeFile');
  mkdtempSpy.mockClear(); // removes preserved state given by previous test
  writeFileSpy.mockClear();
  await getCallGraphGradle(
    path.join(
      __dirname,
      ...'../fixtures/java-reachability-playground'.split('/'),
    ),
    'gradle',
    'init.gradle',
  );

  // verify tempdir was created and file written
  expect(mkdtempSpy.mock.calls.length).toEqual(1);
  expect(writeFileSpy.mock.calls.length).toEqual(1);
  tmpFilePath = writeFileSpy.mock.calls[0][0];
});

afterAll(async () => {
  // verify tmp file was written; deletion is not awaited in main function,
  // therefore it is verified after it finishes
  expect(await fs.exists(tmpFilePath)).toBeFalsy();
});
