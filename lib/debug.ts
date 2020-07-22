import * as debugModule from 'debug';

// To enable debugging output, use `snyk -d`
export function debug(s: string): void {
  if (process.env.DEBUG) {
    debugModule.enable(process.env.DEBUG);
  }
  return debugModule(`snyk-java-call-graph-builder`)(s);
}
