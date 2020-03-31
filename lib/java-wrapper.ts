import 'source-map-support/register';

import * as path from 'path';
import { Graph } from 'graphlib';
import * as jszip from 'jszip';
import * as config from './config';

import { execute } from './sub-process';
import {fetch} from './fetch-snyk-wala-analyzer';
import { buildCallGraph } from './call-graph';
import { readFile } from './promisified-fs';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getJavaCommandArgs(classPath: string, jarPath: string, targetPath = '.'): string[] {
  // TODO return parameters according to the Wala jar
  throw new Error('Not implemented');
}

async function runJavaCommand(javaCommandArgs: string[], targetPath?: string): Promise<string> {
  return execute('java', javaCommandArgs, {cwd: targetPath});
}

export async function getClassPerJarMapping(classPath: string): Promise<{[index: string]: string}> {
  const classPerJarMapping: {[index: string]: string} = {};
  for (const jar of classPath.split(':')) {
    const jarFileContent = await readFile(jar);
    const jarContent = await jszip.loadAsync(jarFileContent);
    for (const classFile of Object.keys(jarContent.files).filter((name) => name.endsWith('.class'))) {
      const className = classFile.slice(0, -6); // removing .class from name
      classPerJarMapping[className] = path.parse(jar).base;
    }
  }
  return classPerJarMapping;
}

// TODO: move jarmapping and merging to index and keep this file as a java wrapper only
export function mergeCallGraphWithJarMapping(callGraph: Graph, classPerJarMapping:{[index: string]: string}) {
  for (const node of callGraph.nodes()) {
    const nodeLabel = callGraph.node(node);
    const className = nodeLabel.className;
    const jarName = classPerJarMapping[className];
    if (!jarName) {
      throw new Error(`Class ${className} wasn't found in jars in classpath.`);
    }
    callGraph.setNode(node, {...nodeLabel, jarName});
  }
}

export async function getCallGraph(classPath: string, targetPath?: string): Promise<unknown> {
  const jarPath = await fetch(config.CALL_GRAPH_GENERATOR_URL, config.CALL_GRAPH_GENERATOR_CHECKSUM);
  const javaCommandArgs = getJavaCommandArgs(classPath, jarPath, targetPath);
  try {
    const [javaOutput, classPerJarMapping] = await Promise.all([
      runJavaCommand(javaCommandArgs, targetPath),
      getClassPerJarMapping(classPath),
    ]);
    const callGraph = buildCallGraph(javaOutput);

    return mergeCallGraphWithJarMapping(callGraph, classPerJarMapping);
  } catch(e) {
    throw new Error(`java command 'java ${javaCommandArgs.join(' ')} failed with error: ${e}`);
  }
}
