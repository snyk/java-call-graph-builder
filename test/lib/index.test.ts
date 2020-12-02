import { findBuildDirs } from '../../lib/index';
import { MissingTargetFolderError } from '../../lib/errors';

test('get targets - maven - no target folder throws and error', async () => {
  const targetPath = 'some-bogus-folder-that-does-not-exist';
  const expectedError = new MissingTargetFolderError(targetPath, 'mvn');
  expect(findBuildDirs(targetPath, 'mvn')).rejects.toEqual(expectedError);
  expect(expectedError.userMessage).toEqual(
    "Could not find the project's output directory. Please build your project and try again. The reachable vulnerabilities feature only supports the default Maven project layout, where the output directory is named 'target'.",
  );
});

test('get targets - gradle - no target folder throws an error', async () => {
  const targetPath = 'some-bogus-folder-that-does-not-exist';
  const expectedError = new MissingTargetFolderError(targetPath, 'gradle');

  expect(findBuildDirs(targetPath, 'gradle')).rejects.toEqual(expectedError);
  expect(expectedError.userMessage).toEqual(
    "Could not find the project's target folder. Please compile your code and try again.",
  );
});
