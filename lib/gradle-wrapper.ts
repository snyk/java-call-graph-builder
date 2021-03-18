import 'source-map-support/register';
import { execute } from './sub-process';
import * as path from 'path';
import { EOL, platform } from 'os';
import { ClassPathGenerationError } from './errors';

export function getGradleCommandArgs(
  targetPath: string,
  initScript?: string,
  confAttrs?: string,
): string[] {
  const gradleArgs = [
    'printClasspath',
    '-I',
    path.join(__dirname, ...'../bin/init.gradle'.split('/')),
    '-q',
  ];
  if (targetPath) {
    gradleArgs.push('-p', targetPath);
  }
  if (initScript) {
    gradleArgs.push('--init-script', initScript);
  }
  if (confAttrs) {
    const isWin = /^win/.test(platform());
    const quot = isWin ? '"' : "'";

    gradleArgs.push(`-PconfAttrs=${quot}${confAttrs}${quot}`);
  }

  return gradleArgs;
}

export async function getClassPathFromGradle(
  targetPath: string,
  gradlePath: string,
  initScript?: string,
  confAttrs?: string,
): Promise<string> {
  const args = getGradleCommandArgs(targetPath, initScript, confAttrs);
  try {
    const output = await execute(gradlePath, args, { cwd: targetPath });
    const lines = output.trim().split(EOL);
    const lastLine = lines[lines.length - 1];

    return lastLine.trim();
  } catch (e) {
    console.log(e);
    throw new ClassPathGenerationError(e);
  }
}
