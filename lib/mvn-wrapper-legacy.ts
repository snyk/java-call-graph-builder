import 'source-map-support/register';
import { execute } from './sub-process';
import { ClassPathGenerationError, EmptyClassPathError } from './errors';
import * as path from 'path';
import * as os from 'os';

export function getMvnCommandArgsForMvnExec(targetPath: string): string[] {
  return process.platform === 'win32'
    ? [
        '-q',
        'exec:exec',
        '-Dexec.classpathScope="compile"',
        '-Dexec.executable="cmd"',
        '-Dexec.args="/c echo %classpath"',
        '-f',
        targetPath,
      ]
    : [
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

export function parseMvnDependencyPluginCommandOutput(
  mvnCommandOutput: string,
): string[] {
  const outputLines = mvnCommandOutput.split(os.EOL);
  const uniqueClassPaths = new Set<string>();
  let startIndex = 0;
  let i = outputLines.indexOf('[INFO] Dependencies classpath:', startIndex);
  while (i > -1) {
    if (outputLines[i + 1] !== '') {
      uniqueClassPaths.add(outputLines[i + 1]);
    }
    startIndex = i + 2;
    i = outputLines.indexOf('[INFO] Dependencies classpath:', startIndex);
  }
  return Array.from(uniqueClassPaths.values()).sort();
}

export function parseMvnExecCommandOutput(mvnCommandOutput: string): string[] {
  return mvnCommandOutput
    .trim()
    .split(os.EOL)
    .sort();
}

export function mergeMvnClassPaths(classPaths: string[]): string {
  // this magic joins all items in array with :, splits result by : again
  // makes Set (to uniq items), create Array from it and join it by : to have
  // proper path like format
  return Array.from(
    new Set(classPaths.join(path.delimiter).split(path.delimiter)),
  )
    .sort()
    .join(path.delimiter);
}

export async function getClassPathFromMvn(
  targetPath: string,
  customMavenArgs: string[] = [],
): Promise<string> {
  let classPaths: string[] = [];
  let args: string[] = [];
  try {
    try {
      // there are two ways of getting classpath - either from maven plugin or by exec command
      // try `mvn exec` for classpath
      args = getMvnCommandArgsForMvnExec(targetPath).concat(customMavenArgs);
      const output = await execute('mvn', args, { cwd: targetPath });
      classPaths = parseMvnExecCommandOutput(output);
    } catch (e) {
      // if it fails, try mvn dependency:build-classpath
      // TODO send error message for further analysis
      args = getMvnCommandArgsForDependencyPlugin(targetPath).concat(
        customMavenArgs,
      );
      const output = await execute('mvn', args, { cwd: targetPath });
      classPaths = parseMvnDependencyPluginCommandOutput(output);
    }
  } catch (e) {
    throw new ClassPathGenerationError(e);
  }
  if (classPaths.length === 0) {
    throw new EmptyClassPathError(`mvn ${args.join(' ')}`);
  }
  return mergeMvnClassPaths(classPaths);
}
