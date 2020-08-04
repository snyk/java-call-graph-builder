import * as metrics from '../../lib/metrics';

describe('timing metrics', () => {
  test('works if no metrics available', async () => {
    expect(metrics.getMetrics()).toBeTruthy();
  });

  test('should run function being timed', () => {
    const result = metrics.timeIt('fetchCallGraphBuilder', () =>
      Promise.resolve(10),
    );
    expect(result).resolves.toBe(10);
  });

  test('should time function correctly', async () => {
    const mock = jest.spyOn(process, 'hrtime');
    mock
      .mockImplementationOnce(() => [0, 10])
      .mockImplementationOnce(() => [10, 20]);

    await metrics.timeIt('fetchCallGraphBuilder', () => Promise.resolve(10));
    expect(mock).toBeCalledTimes(2);
    expect(mock.mock.calls).toEqual([[], [[0, 10]]]);
  });

  test('should return metrics correctly', async () => {
    const mock = jest.spyOn(process, 'hrtime');
    mock
      .mockImplementationOnce(() => [0, 10])
      .mockImplementationOnce(() => [10, 20]);

    await metrics.timeIt('fetchCallGraphBuilder', () => Promise.resolve(10));
    expect(metrics.getMetrics()).toMatchObject({
      fetchCallGraphBuilder: 10.00000002,
    });
  });
});
