import 'source-map-support/register';
import { execute } from './sub-process';

export function getMvnCommandArgs(
  targetPath: string,
  useDependencyPlugin: boolean,
): string[] {
  // there are two ways of getting classpath - either from maven plugin or by exec command
  if (useDependencyPlugin) {
    return ['dependency:build-classpath', '-f', targetPath];
  }
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
      // try `mvn exec` for classpath
      mvnCommandArgs = getMvnCommandArgs(targetPath, false);
      mvnOutput = await runMvnCommand(mvnCommandArgs, targetPath);
      classPaths = parseMvnDependencyPluginCommandOutput(mvnOutput);
    } catch (e) {
      // if it fails, fallback to mvn dependency:build-classpath
      mvnCommandArgs = getMvnCommandArgs(targetPath, true);
      mvnOutput = await runMvnCommand(mvnCommandArgs, targetPath);
      classPaths = parseMvnExecCommandOutput(mvnOutput);
    }
    return mergeMvnClassPaths(classPaths);
  } catch (e) {
    throw new Error(
      `mvn command 'mvn ${mvnCommandArgs.join(' ')} failed with error: ${e}`,
    );
  }
}
