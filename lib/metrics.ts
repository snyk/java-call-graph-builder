import * as _ from 'lodash';

interface Metrics {
  fetchCallGraphBuilder?: number;
  getMvnClassPath?: number;
  getGradleClassPath?: number;
  getEntrypoints?: number;
  generateCallGraph?: number;
  mapClassesPerJar?: number;
  getCallGraph?: number;
}

const metricsState: { [x in keyof Metrics]: [number, number] | undefined } = {};

function start(label: keyof Metrics) {
  metricsState[label] = process.hrtime();
}

function stop(label: keyof Metrics) {
  const previous = metricsState[label];
  metricsState[label] = process.hrtime(previous);
}

function getMetrics(): Metrics {
  return _(metricsState)
    .mapValues<number>(
      (hrtime) => _.get(hrtime, '[0]', 0) + (_.get(hrtime, '[1]', 0) / 1e9),
    )
    .value();
}

async function timeIt<T>(
  label: keyof Metrics,
  fn: () => Promise<T>,
): Promise<T> {
  start(label);
  const x = await fn();
  stop(label);
  return x;
}

export { Metrics, timeIt, getMetrics };
