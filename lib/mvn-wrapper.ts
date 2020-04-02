import 'source-map-support/register';
import { execute } from './sub-process';

export function getMvnCommandArgs(targetPath: string): string[] {
  return ['dependency:build-classpath', '-f', targetPath];
}

async function runMvnCommand(
  mvnCommandArgs: string[],
  targetPath: string,
): Promise<string> {
  return execute('mvn', mvnCommandArgs, { cwd: targetPath });
}

export function parseMvnCommandOutput(mvnCommandOutput: string): string[] {
  const outputLines = mvnCommandOutput.split('\n');
  const mvnClassPaths: string[] = [];
  let startIndex = 0;
  let i = outputLines.indexOf('[INFO] Dependencies classpath:', startIndex);
  while (i > -1) {
    if (outputLines[i + 1] !== '') {
      mvnClassPaths.push(outputLines[i + 1]);
    }
    startIndex = i + 2;
    i = outputLines.indexOf('[INFO] Dependencies classpath:', startIndex);
  }

  return mvnClassPaths;
}

export function mergeMvnClassPaths(classPaths: string[]): string {
  // this magic joins all items in array with :, splits result by : again
  // makes Set (to uniq items), create Array from it and join it by : to have
  // proper path like format
  return Array.from(new Set(classPaths.join(':').split(':'))).join(':');
}

export async function getClassPathFromMvn(targetPath: string): Promise<string> {
  const mvnCommandArgs = getMvnCommandArgs(targetPath);
  try {
    const mvnOutput = await runMvnCommand(mvnCommandArgs, targetPath);
    const classPaths = parseMvnCommandOutput(mvnOutput);
    return mergeMvnClassPaths(classPaths);
  } catch (e) {
    throw new Error(
      `mvn command 'mvn ${mvnCommandArgs.join(' ')} failed with error: ${e}`,
    );
  }
}
