import * as path from 'path';
import * as fs from '../../lib/promisified-fs-glob';

import { getCallGraphMvn } from '../../lib';

jest.setTimeout(60000);

let tmpFilePath;

test('callgraph for maven is created', async () => {
  const mkdtempSpy = jest.spyOn(fs, 'mkdtemp');
  const writeFileSpy = jest.spyOn(fs, 'writeFile');
  await getCallGraphMvn(
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

afterAll(async () => {
  // verify tmp file was written; deletion is not awaited in main function,
  // therefore it is verified after it finishes
  expect(await fs.exists(tmpFilePath)).toBeFalsy();
});
