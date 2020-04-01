import 'source-map-support/register';
import { getClassPathFromMvn } from './mvn-wrapper';
import { getCallGraphGradle } from './gradle-wrapper';
import {getCallGraph} from "./java-wrapper";
import { Graph } from 'graphlib';

export async function getCallGraphMvn(targetPath?: string): Promise<Graph> {
  const classPath = await getClassPathFromMvn(targetPath);

  return await getCallGraph(classPath, targetPath);
}

export async function getClassGraphGradle(targetPath?: string): Promise<Graph> {
  const classPath = await getCallGraphGradle(targetPath);

  return await getCallGraph(classPath, targetPath);
}

