import * as path from 'path';
import { getClassPerJarMapping } from '../../lib/java-wrapper';

test('classes per jar mapping is created', async () => {
  const expectedMapping = {
    'io/github/todolist/core/domain/Priority': 'todolist-core-1.0-SNAPSHOT.jar',
    'io/github/todolist/core/domain/Todo': 'todolist-core-1.0-SNAPSHOT.jar',
    'io/github/todolist/core/domain/User': 'todolist-core-1.0-SNAPSHOT.jar',
    'io/github/todolist/core/repository/api/TodoRepository':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io/github/todolist/core/repository/api/UserRepository':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io/github/todolist/core/repository/impl/TodoRepositoryImpl':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io/github/todolist/core/repository/impl/UserRepositoryImpl':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io/github/todolist/core/service/api/TodoService':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io/github/todolist/core/service/api/UserService':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io/github/todolist/core/service/impl/TodoServiceImpl':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io/github/todolist/core/service/impl/UserServiceImpl':
      'todolist-core-1.0-SNAPSHOT.jar',
  };
  expect(
    await getClassPerJarMapping(
      path.join(__dirname, '../fixtures/todolist-core-1.0-SNAPSHOT.jar'),
    ),
  ).toStrictEqual(expectedMapping);
});

// TODO: implement
test('jars are merged to the callgraph', async () => {
  throw new Error('Not implemented');
});
