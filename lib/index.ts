import 'source-map-support/register';
import { getClassPathFromMvn } from './mvn-wrapper';
import { getCallGraphGradle } from './gradle-wrapper';
import {getCallGraph} from "./java-wrapper";

export async function getCallGraphMvn(targetPath?: string): Promise<unknown> {
  const classPath = await getClassPathFromMvn(targetPath);

  return await getCallGraph(classPath, targetPath);
}

export async function getClassGraphGradle(targetPath?: string): Promise<unknown> {
  const classPath = await getCallGraphGradle(targetPath);

  return await getCallGraph(classPath, targetPath);
}

