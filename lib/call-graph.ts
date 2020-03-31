import { Graph } from 'graphlib';

function removeParams(functionCall: string):string {
  // com/ibm/wala/FakeRootClass.fakeRootMethod:()V
  return functionCall.split(':')[0];
}

function getNodeLabel(functionCall: string): {} {
  // com/ibm/wala/FakeRootClass.fakeRootMethod
  const [className, functionName] = functionCall.split('.');

  return {
    className,
    functionName
  }
}

export function buildCallGraph(input: string) {
  const graph = new Graph();

  for (const line of input.trim().split('\n')) {
    const [caller, callee] = line.trim().split(' -> ').map(removeParams);
    graph.setNode(caller, getNodeLabel(caller));
    graph.setNode(callee, getNodeLabel(callee));
    graph.setEdge(caller, callee);
  }

  return graph;

}
