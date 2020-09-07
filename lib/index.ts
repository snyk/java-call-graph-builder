import 'source-map-support/register';
import { getClassPathFromMvn } from './mvn-wrapper';
import { getCallGraphGradle } from './gradle-wrapper';
import { getCallGraph, getClassPerJarMapping } from './java-wrapper';
import { Graph } from '@snyk/graphlib';
import { timeIt, getMetrics, Metrics } from './metrics';
import * as fs from 'fs';
import { buildCallGraph } from './call-graph';
import { debug } from './debug';

export async function getCallGraphMvn(
  targetPath: string,
  timeout?: number,
  precomputedCallgraph?: string,
  precomputedClasspath?: string
): Promise<Graph> {
  let classPath: string;
  if (precomputedClasspath) {
    if (!fs.existsSync(precomputedClasspath)) {
        throw new Error('Could not find file or directory ' + precomputedClasspath);
    }
    debug(`Using precomputed classpath loaded from ${precomputedClasspath}`);
    classPath = fs.readFileSync(precomputedClasspath, 'utf-8');
  } else {
    classPath = await timeIt('getMvnClassPath', () =>
      getClassPathFromMvn(targetPath),
    );
  }

  if (precomputedCallgraph) {
    if (!fs.existsSync(precomputedCallgraph)) {
        throw new Error('Could not find file or directory ' + precomputedClasspath);
    }
    debug(`Using precomputed callgraph loaded from ${precomputedCallgraph}`);
    const callGraphInput = fs.readFileSync(precomputedCallgraph, 'utf-8');

    return buildCallGraph(callGraphInput, await getClassPerJarMapping(classPath));
  }

  return await timeIt('getCallGraph', () =>
    getCallGraph(classPath, targetPath, timeout),
  );
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
