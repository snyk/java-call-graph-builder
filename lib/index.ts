import 'source-map-support/register';
import { getClassPathFromMvn } from './mvn-wrapper';
import { getCallGraphGradle } from './gradle-wrapper';
import { getCallGraph } from './java-wrapper';
import { Graph } from '@snyk/graphlib';
import { timeIt, getMetrics, Metrics } from './metrics';
import * as promisifedFs from './promisified-fs-glob';
import * as tempDir from 'temp-dir';
import * as path from 'path';

export async function getCallGraphMvn(
  targetPath: string,
  timeout?: number,
): Promise<Graph> {
  const classPath = await timeIt('getMvnClassPath', () =>
    getClassPathFromMvn(targetPath),
  );

  const tmpDir = await promisifedFs.mkdtemp(
    path.join(tempDir, 'call-graph-generator'),
  );
  const filePath = path.join(tmpDir, 'callgraph-classpath');
  await promisifedFs.writeFile(filePath, classPath);

  try {
    return await timeIt('getCallGraph', () =>
      getCallGraph(classPath, targetPath, timeout),
    );
  } finally {
    try {
      promisifedFs.unlink(filePath);
      promisifedFs.rmdir(tmpDir);
    } catch (e) {
      // we couldn't delete temporary data in temporary folder, no big deal
    }
  }
}

export async function getClassGraphGradle(
  targetPath: string,
  timeout?: number,
): Promise<Graph> {
  const classPath = await timeIt('getGradleClassPath', () =>
    getCallGraphGradle(targetPath),
  );

  return await timeIt('getCallGraph', () =>
    getCallGraph(classPath, targetPath, timeout),
  );
}

export function runtimeMetrics(): Metrics {
  return getMetrics();
}
