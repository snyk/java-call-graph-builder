import * as childProcess from 'child_process';
import { debug } from './debug';
import { SubprocessError, SubprocessTimeoutError } from './errors';

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

    debug(`executing command: "${command} ${args.join(' ')}"`);
    const proc = childProcess.spawn(command, args, spawnOptions);

    let timerId: NodeJS.Timer | null = null;
    if (options?.timeout) {
      timerId = setTimeout(() => {
        proc.kill();
        const err = new SubprocessTimeoutError(
          command,
          args.join(' '),
          options.timeout || 0,
        );
        debug(err.message);
        reject(err);
      }, options.timeout);
    }

    proc.stdout.on('data', (data: Buffer) => {
      stdout = stdout + data;
    });
    proc.stderr.on('data', (data: Buffer) => {
      stderr = stderr + data;
    });

    proc.on('close', (code: number) => {
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      if (code !== 0) {
        const trimmedStackTrace = stderr
          .replace(/\t/g, '')
          .split('\n')
          .slice(0, 5)
          .join(', ');
        const err = new SubprocessError(
          command,
          args.join(' '),
          code,
          trimmedStackTrace,
        );
        debug(err.message);
        return reject(err);
      }
      resolve(stdout);
    });
  });
}
