import 'source-map-support/register';
import { execute } from './sub-process';
import {fetch} from './fetch-snyk-wala-analyzer';


export function getJavaCommandArgs(classPath: string, jarPath: string, targetPath = '.'): string[] {
  // TODO return parameters according to the Wala jar
  throw new Error('Not implemented');
}

async function runJavaCommand(javaCommandArgs: string[], targetPath?: string): Promise<string> {
  return execute('java', javaCommandArgs, {cwd: targetPath});
}

export function parseJavaCommandOutput(javaCommandOutput: string): unknown {
  // TODO implement based on the results from Wala call
  throw new Error('Not implemented');
}


export async function getCallGraph(classPath: string, targetPath?: string): Promise<unknown> {
  const jarPath = await fetch();
  const javaCommandArgs = getJavaCommandArgs(classPath, jarPath, targetPath);
  try {
    const javaOutput = await runJavaCommand(javaCommandArgs, targetPath);
    return parseJavaCommandOutput(javaOutput);
  } catch(e) {
    throw new Error(`java command 'java ${javaCommandArgs.join(' ')} failed with error: ${e}`);
  }
}
