import { buildCallGraph } from '../../lib/call-graph';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as graphlib from '@snyk/graphlib';

const readFile = promisify(fs.readFile);

test('parse example call graph', async () => {
  const callGraph = await readFile(
    path.join(__dirname, '../fixtures/call-graph.txt'),
    'utf-8',
  );
  const jarMapping = {
    'io.github.todolist.core.domain.Priority': 'todolist-core-1.0-SNAPSHOT.jar',
    'io.github.todolist.core.domain.Todo': 'todolist-core-1.0-SNAPSHOT.jar',
    'io.github.todolist.core.domain.User': 'todolist-core-1.0-SNAPSHOT.jar',
    'io.github.todolist.core.repository.api.TodoRepository':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io.github.todolist.core.repository.api.UserRepository':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io.github.todolist.core.repository.impl.TodoRepositoryImpl':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io.github.todolist.core.repository.impl.UserRepositoryImpl':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io.github.todolist.core.service.api.TodoService':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io.github.todolist.core.service.api.UserService':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io.github.todolist.core.service.impl.TodoServiceImpl':
      'todolist-core-1.0-SNAPSHOT.jar',
    'io.github.todolist.core.service.impl.UserServiceImpl':
      'todolist-core-1.0-SNAPSHOT.jar',
  };
  const expectedCallGraph = JSON.parse(
    await readFile(
      path.join(__dirname, '../fixtures/expected-call-graph.json'),
      'utf-8',
    ),
  );
  const res = buildCallGraph(callGraph, jarMapping);
  expect(graphlib.json.write(res)).toEqual(expectedCallGraph);
});
