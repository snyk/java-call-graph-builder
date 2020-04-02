import * as path from 'path';
import { getClassPerJarMapping } from '../../lib/java-wrapper';

test('classes per jar mapping is created', async () => {
  const mapping = await getClassPerJarMapping(
    path.join(__dirname, '../fixtures/todolist-core-1.0-SNAPSHOT.jar'),
  );

  for (const item of Object.values(mapping)) {
    expect(item.startsWith('/')).toBeTruthy();
    expect(item.endsWith('/todolist-core-1.0-SNAPSHOT.jar')).toBeTruthy();
  }
});
