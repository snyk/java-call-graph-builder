import { getCallGraphWithDeepcode } from '../../lib/deepcode';

test('create a fake call graph from deepcode output', async () => {
  const projectToTest = "/Users/chrishuszcza/Checkout/WebGoat";
  const graph = await getCallGraphWithDeepcode(projectToTest);
});
