import { Graph } from '@snyk/graphlib';
import { removeParams, toFQclassName } from './class-parsing';

function getNodeLabel(
  functionCall: string,
  classPerJarMapping: { [index: string]: string },
): {} {
  // com.ibm.wala.FakeRootClass:fakeRootMethod
  const [className, functionName] = functionCall.split(':');
  const jarName = classPerJarMapping[className];

  return {
    className,
    functionName,
    jarName,
  };
}

export function buildCallGraph(
  input: string,
  classPerJarMapping: { [index: string]: string },
): Graph {
  const graph = new Graph();

  for (const line of input.trim().split('\n')) {
    const [caller, callee] = line
      .trim()
      .split(' -> ')
      .map(removeParams)
      .map(toFQclassName);
    graph.setNode(caller, getNodeLabel(caller, classPerJarMapping));
    graph.setNode(callee, getNodeLabel(callee, classPerJarMapping));
    graph.setEdge(caller, callee);
  }

  return graph;
}
