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
import * as promisifedFs from './promisified-fs-glob';
import * as tempDir from 'temp-dir';

export function getCallGraphGenCommandArgs(
  classPath: string,
  jarPath: string,
  targets: string[],
): string[] {
  return [
    '-cp',
    jarPath,
    'io.snyk.callgraph.app.App',
    '--application-classpath-file',
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
  for (const classPathItem of classPath.split(path.delimiter)) {
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
  const [jarPath, targets, { tmpDir, classPathFile }] = await Promise.all([
    fetch(
      config.CALL_GRAPH_GENERATOR_URL,
      config.CALL_GRAPH_GENERATOR_CHECKSUM,
    ),
    timeIt('getEntrypoints', () => getTargets(targetPath)),
    writeClassPathToTempDir(classPath),
  ]);

  const callgraphGenCommandArgs = getCallGraphGenCommandArgs(
    classPathFile,
    jarPath,
    targets,
  );

  try {
    const [javaOutput, classPerJarMapping] = await Promise.all([
      timeIt('generateCallGraph', () =>
        runJavaCommand(callgraphGenCommandArgs, targetPath, timeout),
      ),
      timeIt('mapClassesPerJar', () => getClassPerJarMapping(classPath)),
    ]);

    return buildCallGraph(javaOutput, classPerJarMapping);
  } catch (e) {
    throw new Error(
      `java command 'java ${callgraphGenCommandArgs.join(
        ' ',
      )} failed with error: ${e}`,
    );
  } finally {
    // Fire and forget - we don't have to wait for a deletion of a temporary file
    cleanupTempDir(classPathFile, tmpDir);
  }
}

async function writeClassPathToTempDir(classPath) {
  const tmpDir = await promisifedFs.mkdtemp(
    path.join(tempDir, 'call-graph-generator'),
  );
  const classPathFile = path.join(tmpDir, 'callgraph-classpath');
  await promisifedFs.writeFile(classPathFile, classPath);

  return { tmpDir, classPathFile };
}

async function cleanupTempDir(classPathFile: string, tmpDir: string) {
  try {
    await promisifedFs.unlink(classPathFile);
    await promisifedFs.rmdir(tmpDir);
  } catch {
    // we couldn't delete temporary data in temporary folder, no big deal
  }
}
