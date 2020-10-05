import * as fs from 'fs';
import * as path from 'path';
import * as needle from 'needle';
import * as ciInfo from 'ci-info';
import * as ProgressBar from 'progress';
import * as tempDir from 'temp-dir';
import * as crypto from 'crypto';
import { debug } from './debug';

import * as metrics from './metrics';
import ReadableStream = NodeJS.ReadableStream;

import * as promisifedFs from './promisified-fs-glob';

export const JAR_NAME = 'java-call-graph-generator.jar';

const LOCAL_PATH = path.join(tempDir, 'call-graph-generator', JAR_NAME);

function createProgressBar(total: number, name: string): ProgressBar {
  return new ProgressBar(
    `downloading ${name} [:bar] :rate/Kbps :percent :etas remaining`,
    {
      complete: '=',
      incomplete: '.',
      width: 20,
      total: total / 1000,
      clear: true,
    },
  );
}

async function downloadAnalyzer(
  url: string,
  localPath: string,
  expectedChecksum: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const fsStream = fs.createWriteStream(localPath + '.part');
    try {
      let progressBar: ProgressBar;
      debug(`fetching java graph generator from ${url}`);
      const req = needle.get(url);
      let matchChecksum: Promise<boolean>;
      let hasError = false;
      // TODO: Try pump (https://www.npmjs.com/package/pump) for more organised flow
      req
        .on('response', async (res) => {
          if (res.statusCode >= 400) {
            const err = new Error(
              'Bad HTTP response for snyk-call-graph-generator download',
            );
            // TODO: add custom error for status code => err.statusCode = res.statusCode;
            fsStream.destroy();
            hasError = true;
            return reject(err);
          }
          matchChecksum = verifyChecksum(req, expectedChecksum);
          debug(`downloading ${JAR_NAME} ...`);
          if (!ciInfo.isCI) {
            const total = parseInt(res.headers['content-length'], 10);
            progressBar = createProgressBar(total, JAR_NAME);
          }
        })
        .on('data', (chunk) => {
          if (progressBar) {
            progressBar.tick(chunk.length / 1000);
          }
        })
        .on('error', (err) => {
          return reject(err);
        })
        .pipe(fsStream)
        .on('error', (err) => {
          fsStream.destroy();
          return reject(err);
        })
        .on('finish', async () => {
          if (hasError) {
            await promisifedFs.unlink(localPath + '.part');
          } else {
            if (!(await matchChecksum)) {
              return reject(
                new Error('Wrong checksum of downloaded call-graph-generator.'),
              );
            }
            await promisifedFs.rename(localPath + '.part', localPath);
            resolve(localPath);
          }
        });
    } catch (err) {
      reject(err);
    }
  });
}

async function verifyChecksum(
  localPathStream: ReadableStream,
  expectedChecksum: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    localPathStream
      .on('error', reject)
      .on('data', (chunk) => {
        hash.update(chunk);
      })
      .on('end', () => {
        resolve(hash.digest('hex') === expectedChecksum);
      });
  });
}

export async function fetch(
  url: string,
  expectedChecksum: string,
): Promise<string> {
  const localPath = LOCAL_PATH;

  if (await promisifedFs.exists(localPath)) {
    if (
      await verifyChecksum(fs.createReadStream(localPath), expectedChecksum)
    ) {
      return localPath;
    }
    debug(`new version of ${JAR_NAME} available`);
  }

  if (!(await promisifedFs.exists(path.dirname(localPath)))) {
    await promisifedFs.mkdir(path.dirname(localPath));
  }

  return await metrics.timeIt('fetchCallGraphBuilder', () =>
    downloadAnalyzer(url, localPath, expectedChecksum),
  );
}
