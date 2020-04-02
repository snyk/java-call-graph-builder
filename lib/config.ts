import * as snykConfig from 'snyk-config';
import * as path from 'path';

interface Config {
  CALL_GRAPH_GENERATOR_URL: string;
  CALL_GRAPH_GENERATOR_CHECKSUM: string;
}

const config: Config = (snykConfig.loadConfig(
  path.join(__dirname, '..'),
) as unknown) as Config;

export = config;
