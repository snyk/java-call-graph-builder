import 'source-map-support/register';

import * as jszip from 'jszip';
import * as config from './config';

import { execute } from './sub-process';
import { fetch } from './fetch-snyk-wala-analyzer';
import { buildCallGraph } from './call-graph';
import { readFile } from './promisified-fs';
import { toFQclassName } from './class-parsing';
import { Graph } from 'graphlib';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getJavaCommandArgs(
  classPath: string,
  jarPath: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  targetPath = '.',
): string[] {
  // TODO return parameters according to the Wala jar
  throw new Error('Not implemented');
}

async function runJavaCommand(
  javaCommandArgs: string[],
  targetPath: string,
): Promise<string> {
  return execute('java', javaCommandArgs, { cwd: targetPath });
}

export async function getClassPerJarMapping(
  classPath: string,
): Promise<{ [index: string]: string }> {
  const classPerJarMapping: { [index: string]: string } = {};
  for (const jar of classPath.split(':')) {
    const jarFileContent = await readFile(jar);
    const jarContent = await jszip.loadAsync(jarFileContent);
    for (const classFile of Object.keys(jarContent.files).filter((name) =>
      name.endsWith('.class'),
    )) {
      const className = toFQclassName(classFile.replace('.class', '')); // removing .class from name
      classPerJarMapping[className] = jar;
    }
  }
  return classPerJarMapping;
}

export async function getCallGraph(
  classPath: string,
  targetPath: string,
): Promise<Graph> {
  const jarPath = await fetch(
    config.CALL_GRAPH_GENERATOR_URL,
    config.CALL_GRAPH_GENERATOR_CHECKSUM,
  );
  const javaCommandArgs = getJavaCommandArgs(classPath, jarPath, targetPath);
  try {
    const [javaOutput, classPerJarMapping] = await Promise.all([
      runJavaCommand(javaCommandArgs, targetPath),
      getClassPerJarMapping(classPath),
    ]);

    return buildCallGraph(javaOutput, classPerJarMapping);
  } catch (e) {
    throw new Error(
      `java command 'java ${javaCommandArgs.join(' ')} failed with error: ${e}`,
    );
  }
}
