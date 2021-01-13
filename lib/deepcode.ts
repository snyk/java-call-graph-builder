import * as _ from 'lodash';
import { Graph } from 'graphlib';
import { analyzeFolders, ISuggestion } from '@deepcode/tsc';

interface Exploitability {
  [vulnId: string]: 'MaybeExploitable' | 'NotExploitable';
}

export async function getExploitability(
  sourceFolder: string,
): Promise<Exploitability> {
  const dcResponse = await callDc(sourceFolder);

  const analysisResults = dcResponse.analysisResults;
  const suggestions = Object.keys(analysisResults.suggestions).map(
    (id) => analysisResults.suggestions[id],
  );

  const STAR_MAYBE_EXPLOITABLE = 'MaybeExploitable';
  const STAR_NOT_EXPLOITABLE = 'NotExploitable';

  const vulnsMap = {};

  for (const suggestion of suggestions) {
    const ruleKey = suggestion.rule;

    // key: <vulnId>:<status>

    if (
      !ruleKey.includes(STAR_MAYBE_EXPLOITABLE) &&
      !ruleKey.includes(STAR_NOT_EXPLOITABLE)
    ) {
      continue;
    }

    const [vulnId, status] = ruleKey.split('~');

    if (!(vulnId in vulnsMap)) {
      vulnsMap[vulnId] = [];
    }

    vulnsMap[vulnId].push(status);
  }

  const result: Exploitability = {};

  for (const vulnId of Object.keys(vulnsMap)) {
    const statuses = vulnsMap[vulnId];

    result[vulnId] = statuses.includes(STAR_MAYBE_EXPLOITABLE)
      ? STAR_MAYBE_EXPLOITABLE
      : STAR_NOT_EXPLOITABLE;
  }

  return result;
}

async function callDc(sourceFolder: string) {
  const baseURL = process.env['DC_API'];
  const sessionToken = process.env['DC_TOKEN'];

  try {
    return await analyzeFolders(baseURL, sessionToken, false, 1, [
      sourceFolder,
    ]);
  } catch (error) {
    console.log('Error querying DC API: ' + error);
    throw error;
  }
}

///////////

export async function getCallGraphWithDeepcode(
  sourceFolder: string,
  timeout?: number,
): Promise<Graph> {
  if (timeout) {
    const p = Promise.race([
      getReachableFunctionFromDeepcode(sourceFolder),
      new Promise((resolve, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error('Call Graph Creation With DC timed-out'));
        }, timeout);
      }),
    ]);

    const reachableF = await p;
    return createFakeCallGraph(reachableF as Set<ReachableFunction>);
  } else {
    const reachableVulnFunctions = await getReachableFunctionFromDeepcode(
      sourceFolder,
    );
    return createFakeCallGraph(reachableVulnFunctions);
  }
}

interface ReachableFunction {
  fqFunctionName: string;
  packageName: string;
}

async function getReachableFunctionFromDeepcode(
  sourceFolder: string,
): Promise<Set<ReachableFunction>> {
  const baseURL = process.env['DC_API'];
  const sessionToken = process.env['DC_TOKEN'];
  let suggestions: ISuggestion[];
  try {
    const bundle = await analyzeFolders(baseURL, sessionToken, false, 1, [
      sourceFolder,
    ]);
    const analysisResults = bundle.analysisResults;
    suggestions = Object.keys(analysisResults.suggestions).map(
      (id) => analysisResults.suggestions[id],
    );
  } catch (error) {
    console.log('Error querying DC API: ' + error);
    throw error;
  }

  const output = new Set<ReachableFunction>();
  const ruleKey = 'VulnerableMethodReachable';
  for (const suggestion of suggestions) {
    if (suggestion.rule === ruleKey) {
      const { vulnId, methodName, packageName } = parseReachabilityMessage(
        suggestion.message,
      );

      console.log(
        'Queried Deepcode and got: ' +
          vulnId +
          ' package: ' +
          packageName +
          ' method: ' +
          methodName,
      );

      // need to replace org.apache.Cookie.get to org.apache.Cookie:get
      const lastDotIndex = methodName.lastIndexOf('.');
      const methodNameSanitized =
        methodName.substring(0, lastDotIndex) +
        ':' +
        methodName.substring(lastDotIndex + 1, methodName.length);
      output.add({ fqFunctionName: methodNameSanitized, packageName });
    }
  }

  return output;
}

function createFakeCallGraph(
  reachableVulnFunctions: Set<ReachableFunction>,
): Graph {
  const callGraph = new Graph();

  // we need a root node, and so we will set it to what we also use in WALA, just to make sure the
  // downstream code does not break for our fake call graph
  const rootNode = {
    fqFunctionName: 'com.ibm.wala.FakeRootClass:fakeRootMethod',
    packageName: 'com.ibm.wala',
  };
  callGraph.setNode(
    rootNode.fqFunctionName,
    getFakeDeepcodeGraphLabel(rootNode),
  );

  reachableVulnFunctions.forEach((vulnFunction) => {
    callGraph.setNode(
      vulnFunction.fqFunctionName,
      getFakeDeepcodeGraphLabel(vulnFunction),
    );
  });

  return callGraph;
}

function parseReachabilityMessage(
  message: string,
): { vulnId; methodName; packageName } {
  // example message "SNYK-JAVA-COMSQUAREUPOKHTTP-30380: Vulnerable Method org.apache.SSL.get is reachable."
  const regex = /^(?<vulnId>.*): Vulnerable Method (?<methodName>.*) is reachable\.$/;
  const matchObj = regex.exec(message);
  return {
    vulnId: matchObj!.groups!.vulnId,
    methodName: matchObj!.groups!.methodName,
    // package name is no longer reported by the deepcode ontology
    packageName: 'unknown',
  };
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
