import 'source-map-support/register';
import { getClassPathFromMvn } from './mvn-wrapper';
import { getClassPathFromGradle } from './gradle-wrapper';
import { getCallGraph } from './java-wrapper';
import { Graph } from '@snyk/graphlib';
import { timeIt, getMetrics, Metrics } from './metrics';
import { CallGraphGenerationError } from './errors';

export async function getCallGraphMvn(
  targetPath: string,
  timeout?: number,
): Promise<Graph> {
  try {
    const classPath = await timeIt('getMvnClassPath', () =>
      getClassPathFromMvn(targetPath),
    );

    return await timeIt('getCallGraph', () =>
      getCallGraph(classPath, targetPath, timeout),
    );
  } catch (e) {
    throw new CallGraphGenerationError(
      e.userMessage ||
        'Failed to scan for reachable vulnerabilities. Please contact our support or submit an issue at https://github.com/snyk/java-call-graph-builder/issues. Re-running the command with the `-d` flag will provide useful information for the support engineers.',
      e,
    );
  }
}

export async function getClassGraphGradle(
  targetPath: string,
  timeout?: number,
): Promise<Graph> {
  const classPath = await timeIt('getGradleClassPath', () =>
    getClassPathFromGradle(targetPath),
  );

  return await timeIt('getCallGraph', () =>
    getCallGraph(classPath, targetPath, timeout),
  );
}

export function runtimeMetrics(): Metrics {
  return getMetrics();
}
