export { Metrics, timeIt, getMetrics };

interface Metrics {
  fetchCallGraphBuilder?: number;
  getMvnClassPath?: number;
  getGradleClassPath?: number;
  getEntrypoints: number;
  generateCallGraph: number;
  mapClassesPerJar: number;
  getCallGraph: number;
}

const metricsState: {
  [metric in keyof Metrics]: { seconds: number; nanoseconds: number };
} = {
  getEntrypoints: { seconds: 0, nanoseconds: 0 },
  generateCallGraph: { seconds: 0, nanoseconds: 0 },
  mapClassesPerJar: { seconds: 0, nanoseconds: 0 },
  getCallGraph: { seconds: 0, nanoseconds: 0 },
};

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
  const metrics = {} as Metrics;

  for (const [metric, value] of Object.entries(metricsState)) {
    if (!value) {
      continue;
    }

    const { seconds, nanoseconds } = value;
    metrics[metric] = seconds + nanoseconds / 1e9;
  }

  return metrics;
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
