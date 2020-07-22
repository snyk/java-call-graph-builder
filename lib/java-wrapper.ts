import 'source-map-support/register';

import * as jszip from 'jszip';
import { Graph } from '@snyk/graphlib';
import * as path from 'path';
import * as config from './config';

import { execute } from './sub-process';
import { fetch } from './fetch-snyk-java-call-graph-generator';
import { buildCallGraph } from './call-graph';
import { glob, readFile } from './promisified-fs-glob';
import { toFQclassName } from './class-parsing';
import { timeIt } from './metrics';
import { debug } from './debug';

function getCallGraphGenCommandArgs(
  classPath: string,
  jarPath: string,
  targets: string[],
): string[] {
  return [
    '-cp',
    jarPath,
    'io.snyk.callgraph.app.App',
    '--application-classpath',
    classPath,
    '--dirs-to-get-entrypoints',
    targets.join(','),
  ];
}

async function runJavaCommand(
  javaCommandArgs: string[],
  targetPath: string,
  timeout?: number,
): Promise<string> {
  debug(`executing java command: "java ${javaCommandArgs.join(' ')}"`);
  return execute('java', javaCommandArgs, {
    cwd: targetPath,
    timeout,
  });
}

export async function getTargets(targetPath: string): Promise<string[]> {
  const targetDirs = await glob(path.join(targetPath, '**/target'));
  if (!targetDirs.length) {
    throw new Error('Could not find a target folder');
  }

  return targetDirs;
}

export async function getClassPerJarMapping(
  classPath: string,
): Promise<{ [index: string]: string }> {
  const classPerJarMapping: { [index: string]: string } = {};
  for (const classPathItem of classPath.split(':')) {
    // classpath can also contain local directories with classes - we don't need them for package mapping
    if (!classPathItem.endsWith('.jar')) {
      continue;
    }
    const jarFileContent = await readFile(classPathItem);
    const jarContent = await jszip.loadAsync(jarFileContent);
    for (const classFile of Object.keys(jarContent.files).filter((name) =>
      name.endsWith('.class'),
    )) {
      const className = toFQclassName(classFile.replace('.class', '')); // removing .class from name
      classPerJarMapping[className] = classPathItem;
    }
  }
  return classPerJarMapping;
}

export async function getCallGraph(
  classPath: string,
  targetPath: string,
  timeout?: number,
): Promise<Graph> {
  const jarPath = await fetch(
    config.CALL_GRAPH_GENERATOR_URL,
    config.CALL_GRAPH_GENERATOR_CHECKSUM,
  );
  const targets = await timeIt('getEntrypoints', () => getTargets(targetPath));

  const callgraphGenCommandArgs = getCallGraphGenCommandArgs(
    classPath,
    jarPath,
    targets,
  );
  try {
    const javaOutput = await timeIt('generateCallGraph', () =>
      runJavaCommand(callgraphGenCommandArgs, targetPath, timeout),
    );
    const classPerJarMapping = await timeIt('mapClassesPerJar', () =>
      getClassPerJarMapping(classPath),
    );

    return buildCallGraph(javaOutput, classPerJarMapping);
  } catch (e) {
    throw new Error(
      `java command 'java ${callgraphGenCommandArgs.join(
        ' ',
      )} failed with error: ${e}`,
    );
  }
}
