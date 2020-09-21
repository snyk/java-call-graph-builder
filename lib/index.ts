import 'source-map-support/register';
import { getClassPathFromMvn } from './mvn-wrapper';
import { getClassPathFromGradle } from './gradle-wrapper';
import { getCallGraph } from './java-wrapper';
import { Graph } from 'graphlib';
import { timeIt, getMetrics, Metrics } from './metrics';
import { CallGraphGenerationError, MissingTargetFolderError } from './errors';
import { glob } from './promisified-fs-glob';
import * as path from 'path';

export async function getCallGraphMvn(
  targetPath: string,
  timeout?: number,
): Promise<Graph> {
  try {
    const [classPath, targets] = await Promise.all([
      timeIt('getMvnClassPath', () => getClassPathFromMvn(targetPath)),
      timeIt('getEntrypoints', () => getTargets(targetPath, 'mvn')),
    ]);

    return await timeIt('getCallGraph', () =>
      getCallGraph(classPath, targetPath, targets, timeout),
    );
  } catch (e) {
    throw new CallGraphGenerationError(
      e.userMessage ||
        'Failed to scan for reachable vulnerabilities. Please contact our support or submit an issue at https://github.com/snyk/java-call-graph-builder/issues. Re-running the command with the `-d` flag will provide useful information for the support engineers.',
      e,
    );
  }
}

export async function getCallGraphGradle(
  targetPath: string,
  timeout?: number,
): Promise<Graph> {
  const [classPath, targets] = await Promise.all([
    timeIt('getGradleClassPath', () => getClassPathFromGradle(targetPath)),
    timeIt('getEntrypoints', () => getTargets(targetPath, 'gradle')),
  ]);

  return await timeIt('getCallGraph', () =>
    getCallGraph(classPath, targetPath, targets, timeout),
  );
}

export function runtimeMetrics(): Metrics {
  return getMetrics();
}

export async function getTargets(
  targetPath: string,
  packageManager: 'mvn' | 'gradle',
): Promise<string[]> {
  const targetFoldersByPackageManager = {
    mvn: 'target',
    gradle: 'build',
  };
  const targetDirs = await glob(
    path.join(
      targetPath,
      `**/${targetFoldersByPackageManager[packageManager]}`,
    ),
  );
  if (!targetDirs.length) {
    throw new MissingTargetFolderError(targetPath);
  }

  return targetDirs;
}
