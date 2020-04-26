import * as path from 'path';
import {
  getClassPerJarMapping,
  getEntrypoints,
  getCallGraph,
} from '../../lib/java-wrapper';

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
    getEntrypoints('some-bogus-folder-that-does-not-exist'),
  ).rejects.toThrowError('Could not find target folder');
});

test('entrypoints are found correctly', async () => {
  const expectedEntrypoints = [
    'io/github/todolist/core/domain/Priority',
    'io/github/todolist/core/domain/Todo',
    'io/github/todolist/core/domain/User',
    'io/github/todolist/core/repository/api/TodoRepository',
    'io/github/todolist/core/repository/api/UserRepository',
    'io/github/todolist/core/repository/impl/TodoRepositoryImpl',
    'io/github/todolist/core/repository/impl/UserRepositoryImpl',
    'io/github/todolist/core/service/api/TodoService',
    'io/github/todolist/core/service/api/UserService',
    'io/github/todolist/core/service/impl/TodoServiceImpl',
    'io/github/todolist/core/service/impl/UserServiceImpl',
  ];
  expect(
    await getEntrypoints(
      path.join(__dirname, '../fixtures/example-java-project'),
    ),
  ).toStrictEqual(expectedEntrypoints);
});

test('getCallGraph throws if cannot find entry points', async () => {
  const noEntrypointsTargetFolder = path.join(
    __dirname,
    '../fixtures/java-project-no-entrypoints',
  );
  expect(
    getCallGraph('some-class-paths', noEntrypointsTargetFolder),
  ).rejects.toThrowError('No entrypoints found');
});
