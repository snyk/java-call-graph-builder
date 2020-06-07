import * as path from 'path';
import * as tempDir from 'temp-dir';

import * as config from '../../lib/config';
import * as fetchSnykJavaCallGraphGenerator from '../../lib/fetch-snyk-java-call-graph-generator';

jest.setTimeout(30000);
test('check real java call graph builder checksum', async () => {
  const jarPath = path.join(
    tempDir,
    'call-graph-generator',
    fetchSnykJavaCallGraphGenerator.JAR_NAME,
  );

  expect(
    await fetchSnykJavaCallGraphGenerator.fetch(
      config.CALL_GRAPH_GENERATOR_URL,
      config.CALL_GRAPH_GENERATOR_CHECKSUM,
    ),
  ).toEqual(jarPath);
});
