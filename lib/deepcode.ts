import { Graph } from "graphlib";
import { analyzeFolders, ISuggestion, startSession } from '@deepcode/tsc';


export async function getCallGraphWithDeepcode(sourceFolder: string): Promise<Graph> {
  const reachableVulnFunctions = await getReachableFunctionFromDeepcode(sourceFolder);

  const callGraph = new Graph();

  // we need a root node, and so we will set it to what we also use in WALA, just to make sure the
  // downstream code does not break for our fake call graph
  const rootNode = "com.ibm.wala.FakeRootClass:fakeRootMethod";
  callGraph.setNode(rootNode, getFakeDeepcodeGraphLabel(rootNode));

  reachableVulnFunctions.forEach(vulnFunction => {
    callGraph.setNode(vulnFunction, getFakeDeepcodeGraphLabel(vulnFunction));
  });

  return callGraph;
}

async function getReachableFunctionFromDeepcode(sourceFolder: string): Promise<Set<string>> {
  // todo should I be hitting a separate URL?
  const baseURL = 'https://www.deepcode.ai';
  const loginResponse = await startSession({
    baseURL,
    source: 'reachabilityPOC',
  });

  if (loginResponse.type === 'error') {
    throw new Error("Failed to log in to Deepcode: " + loginResponse.error);
  }

  const { sessionToken, } = loginResponse.value;
  const bundle = await analyzeFolders(baseURL, sessionToken, false, 1, [sourceFolder]);
  const analysisResults = bundle.analysisResults;

  const suggestions:ISuggestion[] = Object.keys(analysisResults.suggestions)
    .map(id => analysisResults.suggestions[id]);

  const output = new Set<string>();
  const ruleKey = "VulnerableMethodReachable";
  for (const suggestion of suggestions) {
    if (suggestion.rule === ruleKey) {
      // todo we can get package here as well
      // todo no idea how to get keys here
      const snykIdentifier = suggestion.tags[0];
      const pckg = suggestion.tags[1];
      let method = suggestion.tags[2];

      console.log("Queried Deepcode and got: " + snykIdentifier + " package: " + pckg + " method: " + method);

      // need to replace org.apache.Cookie.get to org.apache.Cookie:get
      const lastDotIndex = method.lastIndexOf(".");
      method = method.substring(0, lastDotIndex) + ":" + method.substring(lastDotIndex+1, method.length);
      output.add(method);
    }
  }
  return output;
}

// this is consistent with what we do for WALA, except we do not set the jar name, and so "reachable by package"
// is meaningless for Deepcode
function getFakeDeepcodeGraphLabel(functionCall: string): {} {
  const [className, functionName] = functionCall.split(':');
  return {
    className,
    functionName,
    jarName: "there.is.no.jar",
  };
}
