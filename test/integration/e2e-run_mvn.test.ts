import * as path from 'path';
import * as fs from '../../lib/promisified-fs-glob';

import { getCallGraphMvn } from '../../lib';

jest.setTimeout(60000);

let tmpFilePath;

describe('callgraph for maven', () => {
  it('callgraph for maven is created', async () => {
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

  it(`callgraph for maven is created when given a file that exists`, async () => {
    const mkdtempSpy = jest.spyOn(fs, 'mkdtemp');
    const writeFileSpy = jest.spyOn(fs, 'writeFile');
    await getCallGraphMvn(
      path.join(
        __dirname,
        ...'../fixtures/java-reachability-playground'.split('/'),
      ),
      undefined,
      ['-s=settings.xml'],
    );

    // verify tempdir was not created and file not written
    expect(mkdtempSpy.mock.calls.length).toEqual(1);
    expect(writeFileSpy.mock.calls.length).toEqual(1);
    tmpFilePath = writeFileSpy.mock.calls[0][0];
  });

  it(`throws an error when given a file that doesn't exist`, async () => {
    await expect(
      getCallGraphMvn(
        path.join(
          __dirname,
          ...'../fixtures/java-reachability-playground'.split('/'),
        ),
        undefined,
        ['-s=nonexistingfile.xml'],
      ),
    ).rejects.toThrow();
  });

  it(`callgraph for maven is created when given an empty arr`, async () => {
    const mkdtempSpy = jest.spyOn(fs, 'mkdtemp');
    const writeFileSpy = jest.spyOn(fs, 'writeFile');
    await getCallGraphMvn(
      path.join(
        __dirname,
        ...'../fixtures/java-reachability-playground'.split('/'),
      ),
      undefined,
      [],
    );

    // verify tempdir was created and file written
    expect(mkdtempSpy.mock.calls.length).toEqual(1);
    expect(writeFileSpy.mock.calls.length).toEqual(1);
    tmpFilePath = writeFileSpy.mock.calls[0][0];
  });

  it(`throws an error when given a wrong argument`, async () => {
    await expect(
      getCallGraphMvn(
        path.join(
          __dirname,
          ...'../fixtures/java-reachability-playground'.split('/'),
        ),
        undefined,
        ['-something=settings.xml'],
      ),
    ).rejects.toThrow();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // verify tmp file was written; deletion is not awaited in main function,
    // therefore it is verified after it finishes
    expect(await fs.exists(tmpFilePath)).toBeFalsy();
  });
});
