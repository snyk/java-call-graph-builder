import { getTargets } from '../../lib/index';

test('not target folder throw error', async () => {
  expect(
    getTargets('some-bogus-folder-that-does-not-exist', 'mvn'),
  ).rejects.toThrowError(
    'Could not find the target folder starting in "some-bogus-folder-that-does-not-exist"',
  );
});
