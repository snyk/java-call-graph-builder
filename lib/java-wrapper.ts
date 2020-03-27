import 'source-map-support/register';
import { execute } from './sub-process';
import {fetch} from './fetch-snyk-wala-analyzer';
import * as config from './config';
import { Graph } from 'graphlib';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getJavaCommandArgs(classPath: string, targetPath = '.'): string[] {
  // TODO return parameters according to the Wala jar
  throw new Error('Not implemented');
}

async function runJavaCommand(javaCommandArgs: string[], targetPath?: string): Promise<string> {
  return execute('java', javaCommandArgs, {cwd: targetPath});
}

function removeParams(functionCall: string):string {
  // com/ibm/wala/FakeRootClass.fakeRootMethod:()V
  return functionCall.split(':')[0];
}

function getNodeLabel(functionCall: string): {} {
  // com/ibm/wala/FakeRootClass.fakeRootMethod
  const [className, functionName] = functionCall.split('.');

  return {
    className,
    functionName
  }
}

export function parseJavaCommandOutput(javaCommandOutput: string): Graph {
  const graph = new Graph();

  for (const line of javaCommandOutput.trim().split('\n')) {
    const [caller, callee] = line.trim().split(' -> ').map(removeParams);
    graph.setNode(caller, getNodeLabel(caller));
    graph.setNode(callee, getNodeLabel(callee));
    graph.setEdge(caller, callee);
  }

  return graph;
}

export async function getCallGraph(classPath: string, targetPath?: string): Promise<unknown> {
  const jarPath = await fetch(config.CALL_GRAPH_GENERATOR_URL, config.CALL_GRAPH_GENERATOR_CHECKSUM);
  const javaCommandArgs = getJavaCommandArgs(classPath, jarPath, targetPath);
  try {
    const javaOutput = await runJavaCommand(javaCommandArgs, targetPath);
    return parseJavaCommandOutput(javaOutput);
  } catch(e) {
    throw new Error(`java command 'java ${javaCommandArgs.join(' ')} failed with error: ${e}`);
  }
}
