import * as path from 'path';
import { getClassPerJarMapping, getTargets } from '../../lib/java-wrapper';

test('classes per jar mapping is created', async () => {
  const mapping = await getClassPerJarMapping(
    path.join(
      __dirname,
      '../fixtures/example-java-project/target/todolist-core-1.0-SNAPSHOT.jar',
    ),
  );

  for (const item of Object.values(mapping)) {
    expect(item.startsWith('/')).toBeTruthy();
    expect(item.endsWith('/todolist-core-1.0-SNAPSHOT.jar')).toBeTruthy();
  }
});

test('not target folder throw error', async () => {
  expect(
    getTargets('some-bogus-folder-that-does-not-exist'),
  ).rejects.toThrowError('Could not find a target folder');
});
