import { getCallGraphWithDeepcode } from '../../lib/deepcode';

jest.setTimeout(120000);
test('create a fake call graph from deepcode output', async () => {
  const projectToTest = "/Users/chrishuszcza/Checkout/labs/fixtures/dcreachability";
  const graph = await getCallGraphWithDeepcode(projectToTest);
});
