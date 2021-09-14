import 'source-map-support/register';
import { execute } from './sub-process';
import * as path from 'path';
import { EOL, platform } from 'os';
import { ClassPathGenerationError } from './errors';
import * as fs from 'fs';
import * as tmp from 'tmp';

export function getGradleCommandArgs(
  targetPath: string,
  initScript?: string,
  confAttrs?: string,
): string[] {
  // For binary releases, the original file would be in the binary build and inaccesible
  const originalPath = path.join(__dirname, ...'../bin/init.gradle'.split('/'));
  const tmpFilePath = tmp.fileSync().name;
  fs.copyFileSync(originalPath, tmpFilePath);

  const gradleArgs = ['printClasspath', '-I', tmpFilePath, '-q'];
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
