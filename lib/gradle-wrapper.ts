import 'source-map-support/register';
import { execute } from './sub-process';
import * as path from 'path';
import * as fs from 'fs';

export function getGradleCommandArgs(targetPath: string): string[] {
  const gradleArgs = [
    'printClasspath',
    '-I',
    path.join(__dirname, '../bin/init.gradle'),
    '-q',
  ];
  if (targetPath) {
    gradleArgs.push('-p', targetPath);
  }

  return gradleArgs;
}

export function getGradleCommand(targetPath: string): string {
  const pathToWrapper = path.resolve(targetPath || '', './gradlew');

  if (fs.existsSync(pathToWrapper)) {
    return pathToWrapper;
  }

  return 'gradle';
}

async function runGradleCommand(
  gradleCommand: string,
  gradleCommandArgs: string[],
  targetPath: string,
): Promise<string> {
  return execute('gradle', gradleCommandArgs, { cwd: targetPath });
}

export async function getCallGraphGradle(targetPath: string): Promise<string> {
  const gradleCommandArgs = getGradleCommandArgs(targetPath);
  const gradleCommand = getGradleCommand(targetPath);
  try {
    const gradleOutput = await runGradleCommand(
      gradleCommand,
      gradleCommandArgs,
      targetPath,
    );
    return gradleOutput.trim();
  } catch (e) {
    throw new Error(
      `gradle command '${gradleCommand} ${gradleCommandArgs.join(
        ' ',
      )} failed with error: ${e}`,
    );
  }
}
