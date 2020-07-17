import * as childProcess from 'child_process';

export function execute(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    timeout?: number;
  },
): Promise<string> {
  const spawnOptions: childProcess.SpawnOptions = { shell: true };
  if (options && options.cwd) {
    spawnOptions.cwd = options.cwd;
  }

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const proc = childProcess.spawn(command, args, spawnOptions);

    if (options?.timeout) {
      const timeoutSeconds = options.timeout / 1000;
      setTimeout(() => {
        proc.kill();
        reject(
          `Timeout; It took longer than ${timeoutSeconds}s to generate the call graph.`,
        );
      }, options.timeout);
    }

    proc.stdout.on('data', (data: Buffer) => {
      stdout = stdout + data;
    });
    proc.stderr.on('data', (data: Buffer) => {
      stderr = stderr + data;
    });

    proc.on('close', (code: number) => {
      if (code !== 0) {
        return reject(stdout || stderr);
      }
      resolve(stdout || stderr);
    });
  });
}
