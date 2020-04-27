import * as _ from 'lodash';

export { Metrics, timeIt, getMetrics };

interface Metrics {
  fetchCallGraphBuilder?: number;
  getMvnClassPath?: number;
  getGradleClassPath?: number;
  getEntrypoints?: number;
  generateCallGraph?: number;
  mapClassesPerJar?: number;
  getCallGraph?: number;
}

const metricsState: {
  [metric in keyof Metrics]: { seconds: number; nanoseconds: number };
} = {};

function start(metric: keyof Metrics) {
  const [secs, nsecs] = process.hrtime();
  metricsState[metric] = { seconds: secs, nanoseconds: nsecs };
}

function stop(metric: keyof Metrics) {
  const { seconds, nanoseconds } = metricsState[metric] || {
    seconds: 0,
    nanoseconds: 0,
  };
  const [secs, nsecs] = process.hrtime([seconds, nanoseconds]);
  metricsState[metric] = { seconds: secs, nanoseconds: nsecs };
}

function getMetrics(): Metrics {
  return _(metricsState)
    .mapValues<number>(
      ({ seconds, nanoseconds }: any) => seconds + nanoseconds / 1e9,
    )
    .value();
}

async function timeIt<T>(
  metric: keyof Metrics,
  fn: () => Promise<T>,
): Promise<T> {
  start(metric);
  const x = await fn();
  stop(metric);
  return x;
}
