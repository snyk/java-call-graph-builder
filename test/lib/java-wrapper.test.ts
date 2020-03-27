import { parseJavaCommandOutput } from '../../lib/java-wrapper';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as graphlib from 'graphlib';

const readFile = promisify(fs.readFile);

test('parse example call graph', async () => {
  const callGraph = await readFile(
    path.join(__dirname, '../fixtures/call-graph.txt'),
    'utf-8',
  );
  const expectedCallGraph = JSON.parse(
    await readFile(
      path.join(__dirname, '../fixtures/expected-call-graph.json'),
      'utf-8',
    ),
  );
  const res = parseJavaCommandOutput(callGraph);
  expect(graphlib.json.write(res)).toEqual(expectedCallGraph);
});
