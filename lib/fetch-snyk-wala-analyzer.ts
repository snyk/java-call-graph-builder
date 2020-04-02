import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as needle from 'needle';
import * as ciInfo from 'ci-info';
import * as ProgressBar from 'progress';
import * as tempDir from 'temp-dir';
import * as crypto from 'crypto';
import ReadableStream = NodeJS.ReadableStream;

import * as promisifedFs from './promisified-fs';

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
      const req = needle.get(url);
      let matchChecksum: Promise<boolean>;
      let hasError = false;
      // TODO: Try pump (https://www.npmjs.com/package/pump) for more organised flow
      req
        .on('response', async (res) => {
          if (res.statusCode >= 400) {
            const err = new Error(
              'Bad HTTP response for snyk-wala-analyzer download',
            );
            // TODO: add custom error for status code => err.statusCode = res.statusCode;
            fsStream.destroy();
            hasError = true;
            return reject(err);
          }
          matchChecksum = verifyChecksum(req, expectedChecksum);
          if (ciInfo.isCI) {
            console.log(`downloading ${JAR_NAME} ...`);
          } else {
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
      .pipe(hash)
      .on('finish', () => {
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
    console.log(`New version of ${JAR_NAME} available`);
  }
  await fsExtra.ensureDir(path.dirname(localPath));

  return await downloadAnalyzer(url, localPath, expectedChecksum);
}
