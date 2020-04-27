import 'source-map-support/register';
import { getClassPathFromMvn } from './mvn-wrapper';
import { getCallGraphGradle } from './gradle-wrapper';
import { getCallGraph } from './java-wrapper';
import { Graph } from 'graphlib';
import { timeIt, getMetrics, Metrics } from './metrics';

export async function getCallGraphMvn(targetPath: string): Promise<Graph> {
  const classPath = await timeIt('getMvnClassPath', () =>
    getClassPathFromMvn(targetPath),
  );

  return await timeIt('getCallGraph', () =>
    getCallGraph(classPath, targetPath),
  );
}

export async function getClassGraphGradle(targetPath: string): Promise<Graph> {
  const classPath = await timeIt('getGradleClassPath', () =>
    getCallGraphGradle(targetPath),
  );

  return await timeIt('getCallGraph', () =>
    getCallGraph(classPath, targetPath),
  );
}

export function runtimeMetrics(): Metrics {
  return getMetrics();
}
