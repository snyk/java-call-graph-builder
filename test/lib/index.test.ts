import { getTargets } from '../../lib/index';
import { MissingTargetFolderError } from '../../lib/errors';

test('get targets - maven - no target folder throws and error', async () => {
  const targetPath = 'some-bogus-folder-that-does-not-exist';
  const expectedError = new MissingTargetFolderError(targetPath, 'mvn');
  expect(getTargets(targetPath, 'mvn')).rejects.toEqual(expectedError);
  expect(expectedError.userMessage).toEqual(
    "Could not find the project's target folder. Please compile your code by running `mvn compile` and try again.",
  );
});

test('get targets - gradle - no target folder throws an error', async () => {
  const targetPath = 'some-bogus-folder-that-does-not-exist';
  const expectedError = new MissingTargetFolderError(targetPath, 'gradle');

  expect(getTargets(targetPath, 'gradle')).rejects.toEqual(expectedError);
  expect(expectedError.userMessage).toEqual(
    "Could not find the project's target folder. Please compile your code and try again.",
  );
});
