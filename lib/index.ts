import 'source-map-support/register';
import { getClassPathFromMvn } from './mvn-wrapper-legacy';
import { getClassPathFromGradle } from './gradle-wrapper';
import { getCallGraph } from './java-wrapper';
import { Graph } from '@snyk/graphlib';
import { timeIt, getMetrics, Metrics } from './metrics';
import { CallGraphGenerationError, MissingTargetFolderError } from './errors';
import { glob } from './promisified-fs-glob';
import * as path from 'path';
import { makeMavenProject } from './mvn-wrapper';
import { debug } from './debug';
import * as tmp from 'tmp';

tmp.setGracefulCleanup();

export async function getCallGraphMvnLegacy(
  targetPath: string,
  timeout?: number,
  customMavenArgs?: string[],
): Promise<Graph> {
  try {
    const [classPath, targets] = await Promise.all([
      timeIt('getMvnClassPath', () =>
        getClassPathFromMvn(targetPath, customMavenArgs),
      ),
      timeIt('getEntrypoints', () => findBuildDirs(targetPath, 'mvn')),
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

export async function getCallGraphMvn(
  targetPath: string,
  timeout?: number,
  customMavenArgs?: string[],
): Promise<Graph> {
  try {
    const project = await makeMavenProject(targetPath, customMavenArgs);
    const classPath = project.getClassPath();
    const buildDirectories = await Promise.all(
      project.modules.map((m) => m.buildDirectory),
    );

    return await timeIt('getCallGraph', () =>
      getCallGraph(classPath, targetPath, buildDirectories, timeout),
    );
  } catch (e) {
    debug(
      `Failed to get the call graph for the Maven project in: ${targetPath}. ' +
      'Falling back to the legacy method.`,
    );
    return getCallGraphMvnLegacy(targetPath, timeout, customMavenArgs);
  }
}

export async function getCallGraphGradle(
  targetPath: string,
  gradlePath = 'gradle',
  initScript?: string,
  confAttrs?: string,
  timeout?: number,
): Promise<Graph> {
  const [classPath, targets] = await Promise.all([
    timeIt('getGradleClassPath', () =>
      getClassPathFromGradle(targetPath, gradlePath, initScript, confAttrs),
    ),
    timeIt('getEntrypoints', () => findBuildDirs(targetPath, 'gradle')),
  ]);

  debug(`got class path: ${classPath}`);
  debug(`got targets: ${targets}`);

  return await timeIt('getCallGraph', () =>
    getCallGraph(classPath, targetPath, targets, timeout),
  );
}

export function runtimeMetrics(): Metrics {
  return getMetrics();
}

export async function findBuildDirs(
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
    throw new MissingTargetFolderError(targetPath, packageManager);
  }

  return targetDirs;
}
