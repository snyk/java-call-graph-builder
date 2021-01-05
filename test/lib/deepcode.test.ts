import { getCallGraphWithDeepcode } from '../../lib/deepcode';

jest.setTimeout(120000);
test('create a fake call graph from deepcode output', async () => {
  const projectToTest = "/Users/chrishuszcza/Checkout/dcreachability";
  const graph = await getCallGraphWithDeepcode(projectToTest, 1);
  console.log(graph.nodes());
});
