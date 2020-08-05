import 'source-map-support/register';
import { execute } from './sub-process';
import * as path from 'path';
import * as fs from 'fs';
import { ClassPathGenerationError } from './errors';

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

export async function getClassPathFromGradle(
  targetPath: string,
): Promise<string> {
  const cmd = getGradleCommand(targetPath);
  const args = getGradleCommandArgs(targetPath);
  try {
    const output = await execute(cmd, args, { cwd: targetPath });
    return output.trim();
  } catch (e) {
    throw new ClassPathGenerationError(e);
  }
}
