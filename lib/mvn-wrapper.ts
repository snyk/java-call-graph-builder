import 'source-map-support/register';
import { execute } from './sub-process';
import { ClassPathGenerationError, EmptyClassPathError } from './errors';
import * as fs from 'fs';
import * as path from 'path';
import * as tmp from 'tmp';
import { debug } from './debug';

const os = require('os');

async function runCommandWithOutputToFile(
  f: (string) => Promise<void>,
): Promise<string> {
  // NOTE(alexmu): We have to do this little dance with output written to files
  // because that seems to be the only way to get the output without having to
  // parse maven logs
  const outputName = tmp.tmpNameSync();
  try {
    await f(outputName);
    return fs.readFileSync(outputName, 'utf8');
  } catch (error) {
    debug(`Failed to execute command. ${error}`);
    throw error;
  } finally {
    try {
      fs.unlinkSync(outputName);
    } catch (error) {
      debug(`unlinkSync failed. ${error}`);
    }
  }
}

async function getDependenciesClassPath(targetPath: string): Promise<string> {
  return runCommandWithOutputToFile(async (outputFile) => {
    await execute(
      'mvn',
      [
        'dependency:build-classpath',
        `-Dmdep.outputFile=${outputFile}`,
        '-f',
        targetPath,
      ],
      { cwd: targetPath },
    );
  });
}

async function getOutputDirectory(targetPath: string): Promise<string> {
  return runCommandWithOutputToFile(async (outputFile) => {
    await execute(
      'mvn',
      [
        'help:evaluate',
        '-Dexpression="project.build.outputDirectory"',
        `-Doutput=${outputFile}`,
        '-f',
        targetPath,
      ],
      { cwd: targetPath },
    );
  });
}

export function buildFullClassPath(
  dependenciesClassPath: string,
  outputDirectory: string,
): string {
  if (dependenciesClassPath.length === 0) {
    debug('Failed to determine the dependencies classpath.');
  }
  if (outputDirectory.length === 0) {
    debug('Failed to determine the project output directory.');
  }
  const sanitisedOutputDirectory = outputDirectory.trim();
  let sanitisedClassPath = dependenciesClassPath.trim();
  while (sanitisedClassPath.endsWith(path.delimiter)) {
    sanitisedClassPath = sanitisedClassPath.slice(0, -1);
  }
  if (sanitisedClassPath.length === 0) {
    return sanitisedOutputDirectory;
  } else if (sanitisedOutputDirectory.length === 0) {
    return sanitisedClassPath;
  } else {
    return `${sanitisedClassPath}${path.delimiter}${sanitisedOutputDirectory}`;
  }
}

// NOTE(alexmu): This is deprecated, and will be removed in the future
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

// NOTE(alexmu): This is deprecated, and will be removed in the future
function getMvnCommandArgsForDependencyPlugin(targetPath: string): string[] {
  return ['dependency:build-classpath', '-f', targetPath];
}

// NOTE(alexmu): This is deprecated, and will be removed in the future
export function parseMvnDependencyPluginCommandOutput(
  mvnCommandOutput: string,
): string[] {
  const outputLines = mvnCommandOutput.split(os.EOL);
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

// NOTE(alexmu): This is deprecated, and will be removed in the future
export function parseMvnExecCommandOutput(mvnCommandOutput: string): string[] {
  return mvnCommandOutput.trim().split(os.EOL);
}

// NOTE(alexmu): This is deprecated, and will be removed in the future
export function mergeMvnClassPaths(classPaths: string[]): string {
  // this magic joins all items in array with :, splits result by : again
  // makes Set (to uniq items), create Array from it and join it by : to have
  // proper path like format
  return Array.from(new Set(classPaths.join(':').split(':'))).join(':');
}

// NOTE(alexmu): This is deprecated, and will be removed in the future
async function getClassPathFromMvnLegacy(targetPath: string): Promise<string> {
  let classPaths: string[] = [];
  let args: string[] = [];
  try {
    try {
      // there are two ways of getting classpath - either from maven plugin or by exec command
      // try `mvn exec` for classpath
      args = getMvnCommandArgsForMvnExec(targetPath);
      const output = await execute('mvn', args, { cwd: targetPath });
      classPaths = parseMvnExecCommandOutput(output);
    } catch (e) {
      // if it fails, try mvn dependency:build-classpath
      // TODO send error message for further analysis
      args = getMvnCommandArgsForDependencyPlugin(targetPath);
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

export async function getClassPathFromMvn(targetPath: string): Promise<string> {
  try {
    const [dependenciesClassPath, outputDirectory] = await Promise.all([
      getDependenciesClassPath(targetPath),
      getOutputDirectory(targetPath),
    ]);
    const fullClassPath = buildFullClassPath(
      dependenciesClassPath,
      outputDirectory,
    );
    if (fullClassPath.length === 0) {
      throw new EmptyClassPathError('mvn');
    }
    return fullClassPath;
  } catch (e) {
    // NOTE(alexmu): Fall back to the legacy method of determining the classpath
    debug(
      `Failed to determine the classpath using the new method. Falling back to the legacy method. ${e}`,
    );
    return getClassPathFromMvnLegacy(targetPath);
  }
}
