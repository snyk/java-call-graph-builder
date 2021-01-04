import { Graph } from "graphlib";
import { analyzeFolders, ISuggestion, startSession } from '@deepcode/tsc';

export async function getCallGraphWithDeepcode(sourceFolder: string): Promise<Graph> {
  const reachableVulnFunctions = await getReachableFunctionFromDeepcode(sourceFolder);
  return createFakeCallGraph(reachableVulnFunctions);
}

interface ReachableFunction {
  fqFunctionName: string,
  packageName: string
}

async function getReachableFunctionFromDeepcode(sourceFolder: string): Promise<Set<ReachableFunction>> {
  const baseURL = 'http://localhost:8080';
  const sessionToken = process.env['DC_TOKEN'];
  let suggestions:ISuggestion[];
  try {
    const bundle = await analyzeFolders(baseURL, sessionToken, false, 1, [sourceFolder]);
    const analysisResults = bundle.analysisResults;
    suggestions = Object.keys(analysisResults.suggestions).map(id => analysisResults.suggestions[id]);
  } catch (error) {
    console.log("Error querying DC API: " + error);
    throw error;
  }

  const output = new Set<ReachableFunction>();
  const ruleKey = "VulnerableMethodReachable";
  for (const suggestion of suggestions) {
    if (suggestion.rule === ruleKey) {
      const {vulnId, methodName, packageName} = parseReachabilityMessage(suggestion.message);

      console.log("Queried Deepcode and got: " + vulnId + " package: " + packageName + " method: " + methodName);

      // need to replace org.apache.Cookie.get to org.apache.Cookie:get
      const lastDotIndex = methodName.lastIndexOf(".");
      const methodNameSanitized = methodName.substring(0, lastDotIndex) + ":" + methodName.substring(lastDotIndex+1, methodName.length);
      output.add({fqFunctionName: methodNameSanitized, packageName});
    }
  }

  // todo REMOVE THIS, this is just to test the flow from here across all of SNYK stack before we have reachability
  //  working on the engine side
  output.add({
    fqFunctionName: "com.squareup.okhttp.internal.http.SocketConnector.connectTls",
    packageName: "com.squareup.okhttp:okhttp"
  });

  return output;
}

function createFakeCallGraph(reachableVulnFunctions: Set<ReachableFunction>): Graph {
  const callGraph = new Graph();

  // we need a root node, and so we will set it to what we also use in WALA, just to make sure the
  // downstream code does not break for our fake call graph
  const rootNode = {
    fqFunctionName: "com.ibm.wala.FakeRootClass:fakeRootMethod",
    packageName: "com.ibm.wala"
  };
  callGraph.setNode(rootNode.fqFunctionName, getFakeDeepcodeGraphLabel(rootNode));

  reachableVulnFunctions.forEach(vulnFunction => {
    callGraph.setNode(vulnFunction.fqFunctionName, getFakeDeepcodeGraphLabel(vulnFunction));
  });

  return callGraph;
}

function parseReachabilityMessage(message:string): {vulnId, methodName, packageName} {
  // example message "SNYK-JAVA-COMSQUAREUPOKHTTP-30380: Vulnerable Method org.apache.SSL.get from package org.apache:apache is reachable."
  const regex = /^(?<vulnId>.*): Vulnerable Method (?<methodName>.*) from package (?<packageName>.*) is reachable\.$/;
  const matchObj = regex.exec(message);
  return {
    vulnId: matchObj!.groups!.vulnId,
    methodName: matchObj!.groups!.methodName,
    packageName: matchObj!.groups!.packageName
  }
}

// this is consistent with what we do for WALA, except we do not set the jar name, and so "reachable by package"
// is meaningless for Deepcode
function getFakeDeepcodeGraphLabel(vulnFunc: ReachableFunction): {} {
  const [className, functionName] = vulnFunc.fqFunctionName.split(':');
  return {
    className,
    functionName,
    // todo is anything here expecting .jar or is it actually package name?
    jarName: vulnFunc.packageName,
  };
}
