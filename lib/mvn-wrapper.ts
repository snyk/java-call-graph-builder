import 'source-map-support/register';
import { execute } from './sub-process';

function getMvnCommandArgsForMvnExec(targetPath: string): string[] {
  return [
    '-q',
    'exec:exec',
    '-Dexec.classpathScope="compile"',
    '-Dexec.executable="echo"',
    '-Dexec.args="%classpath"',
    '-f',
    targetPath,
  ];
}

function getMvnCommandArgsForDependencyPlugin(targetPath: string): string[] {
  return ['dependency:build-classpath', '-f', targetPath];
}

async function runMvnCommand(
  mvnCommandArgs: string[],
  targetPath: string,
): Promise<string> {
  return execute('mvn', mvnCommandArgs, { cwd: targetPath });
}

export function parseMvnDependencyPluginCommandOutput(
  mvnCommandOutput: string,
): string[] {
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

export function parseMvnExecCommandOutput(mvnCommandOutput: string): string[] {
  return mvnCommandOutput.trim().split('\n');
}

export function mergeMvnClassPaths(classPaths: string[]): string {
  // this magic joins all items in array with :, splits result by : again
  // makes Set (to uniq items), create Array from it and join it by : to have
  // proper path like format
  return Array.from(new Set(classPaths.join(':').split(':'))).join(':');
}

export async function getClassPathFromMvn(targetPath: string): Promise<string> {
  let mvnCommandArgs: string[] = [];
  let mvnOutput: string;
  let classPaths: string[] = [];
  try {
    try {
      // there are two ways of getting classpath - either from maven plugin or by exec command
      // try `mvn exec` for classpath
      mvnCommandArgs = getMvnCommandArgsForMvnExec(targetPath);
      mvnOutput = await runMvnCommand(mvnCommandArgs, targetPath);
      classPaths = parseMvnExecCommandOutput(mvnOutput);
    } catch (e) {
      // if it fails, try mvn dependency:build-classpath
      // TODO send error message for further analysis
      mvnCommandArgs = getMvnCommandArgsForDependencyPlugin(targetPath);
      mvnOutput = await runMvnCommand(mvnCommandArgs, targetPath);
      classPaths = parseMvnDependencyPluginCommandOutput(mvnOutput);
    }
    return mergeMvnClassPaths(classPaths);
  } catch (e) {
    throw new Error(
      `mvn command 'mvn ${mvnCommandArgs.join(' ')} failed with error: ${e}`,
    );
  }
}
