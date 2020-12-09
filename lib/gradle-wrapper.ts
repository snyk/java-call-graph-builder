import 'source-map-support/register';
import { execute } from './sub-process';
import * as path from 'path';
import { ClassPathGenerationError } from './errors';

export function getGradleCommandArgs(targetPath: string): string[] {
  const gradleArgs = [
    'printClasspath',
    '-I',
    path.join(__dirname, ...'../bin/init.gradle'.split('/')),
    '-q',
  ];
  if (targetPath) {
    gradleArgs.push('-p', targetPath);
  }

  return gradleArgs;
}

export async function getClassPathFromGradle(
  targetPath: string,
  gradlePath: string,
): Promise<string> {
  const args = getGradleCommandArgs(targetPath);
  try {
    const output = await execute(gradlePath, args, { cwd: targetPath });
    return output.trim();
  } catch (e) {
    console.log(e);
    throw new ClassPathGenerationError(e);
  }
}
