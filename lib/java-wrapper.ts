import 'source-map-support/register';

import * as jszip from 'jszip';
import { Graph } from 'graphlib';
import * as path from 'path';
import * as config from './config';

import { execute } from './sub-process';
import { fetch } from './fetch-snyk-java-call-graph-generator';
import { buildCallGraph } from './call-graph';
import { glob, readFile } from './promisified-fs-glob';
import { toFQclassName } from './class-parsing';

function getJavaCommandArgs(
  classPath: string,
  jarPath: string,
  entrypoints: string[],
): string[] {
  return [
    '-cp',
    jarPath,
    'io.snyk.callgraph.app.App',
    '--application-classpath',
    classPath,
    '--classes-to-get-entrypoints',
    entrypoints.join(','),
  ];
}

async function runJavaCommand(
  javaCommandArgs: string[],
  targetPath: string,
): Promise<string> {
  return execute('java', javaCommandArgs, { cwd: targetPath });
}

export async function getEntrypoints(targetPath: string): Promise<string[]> {
  const entrypointsFiles = await glob(
    path.join(targetPath, '**/target/classes/**/*.class'),
  );

  return entrypointsFiles.map((entrypoint) =>
    entrypoint
      .split('target/classes/')[1]
      .replace('.class', '')
      // Some build paths also include "java/main/" or "main/, which is not part of the class name
      .replace(/(^java\/main\/)|(^main\/)/, ''),
  );
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
): Promise<Graph> {
  const jarPath = await fetch(
    config.CALL_GRAPH_GENERATOR_URL,
    config.CALL_GRAPH_GENERATOR_CHECKSUM,
  );
  const entrypoints = await getEntrypoints(targetPath);
  if (!entrypoints.length) {
    throw new Error('No entrypoints found.');
  }
  const javaCommandArgs = getJavaCommandArgs(classPath, jarPath, entrypoints);
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
