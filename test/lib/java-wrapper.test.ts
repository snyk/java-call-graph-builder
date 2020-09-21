import * as path from 'path';
import {
  getClassPerJarMapping,
  getCallGraphGenCommandArgs,
} from '../../lib/java-wrapper';

test('classes per jar mapping is created', async () => {
  const mapping = await getClassPerJarMapping(
    path.join(
      __dirname,
      ...'../fixtures/example-java-project/target/todolist-core-1.0-SNAPSHOT.jar'.split(
        '/',
      ),
    ),
  );

  for (const item of Object.values(mapping)) {
    const root = __dirname.split(path.sep)[0];
    expect(item.startsWith(root)).toBeTruthy();
    expect(
      item.endsWith(`${path.sep}todolist-core-1.0-SNAPSHOT.jar`),
    ).toBeTruthy();
  }
});

test('callgraph arguments contain `--application-path-file`', async () => {
  expect(
    getCallGraphGenCommandArgs('someFileName', 'someJarPath', []),
  ).toContain('--application-classpath-file');
});
