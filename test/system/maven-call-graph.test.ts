import { getCallGraphMvn } from '../../lib';
import * as path from 'path';
import { CallGraphNode } from '../../lib/types';

jest.setTimeout(60000);

test('simple call graph', async () => {
  const callGraph = await getCallGraphMvn(
    path.join(__dirname, '../fixtures/java-project-integration-test'),
  );

  expect(callGraph.edgeCount()).toBeGreaterThan(0);
  expect(callGraph.nodeCount()).toBeGreaterThan(0);
  expect(
    callGraph.hasNode('cy.alavrov.jminerguide.data.ship.Ship:getMaxDrones'),
  ).toBeTruthy;

  const userLandNode = callGraph.node(
    'cy.alavrov.jminerguide.data.ship.Ship:getMaxDrones',
  ) as CallGraphNode;
  expect(userLandNode.className).toEqual(
    'cy.alavrov.jminerguide.data.ship.Ship',
  );
  expect(userLandNode.functionName).toEqual('getMaxDrones');
  expect(userLandNode.jarName).toBeUndefined(); // user land code doesn't have a jar

  const thirdPartyNode = callGraph.node(
    'java.util.zip.Inflater:finalize',
  ) as CallGraphNode;
  expect(thirdPartyNode.className).toEqual('java.util.zip.Inflater');
  expect(thirdPartyNode.functionName).toEqual('finalize');
  expect(thirdPartyNode.jarName).toBeUndefined(); // TODO seems like a bug
});
