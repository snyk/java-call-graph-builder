import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as needle from 'needle';
import * as ciInfo from 'ci-info';
import * as ProgressBar from 'progress';
import * as tempDir from 'temp-dir';

export function getVersion(): string {
  const pkgInfo = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'),'utf-8'));
  return pkgInfo['snyk-wala-analyzer-version'];
}

export function getBinaryName(): string {
  return 'java-call-graph-generator.jar';
}

const DOWNLOAD_URL = `https://snyk.io/resources/cli/plugins/wala-analyzer/${getVersion()}/${getBinaryName()}`; // jscs:ignore maximumLineLength

function getBinaryLocalPath(): string {
  const name = getBinaryName();
  return path.join(tempDir, 'call-graph-generator', name);
}

function createProgressBar(total: number, name: string): ProgressBar {
  return new ProgressBar(`downloading ${name} [:bar] :rate/Kbps :percent :etas remaining`, { // jscs:ignore maximumLineLength
    complete: '=',
    incomplete: '.',
    width: 20,
    total: total / 1000,
  });
}

async function downloadAnalyzer(localPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fsStream = fs.createWriteStream(localPath + '.part');
    let bar: ProgressBar;
    try {
      const req = needle.get(DOWNLOAD_URL);
      req
        .on('response', (res) => {
          if (res.statusCode >= 400) {
            const err = new Error(
              'Bad HTTP response for snyk-wala-analyzer download');
            // TODO: add custom error for status code
            // err.statusCode = res.statusCode;
            fsStream.destroy();
            return reject(err);
          }

          if (ciInfo.isCI) {
            console.log(`downloading ${getBinaryName()} ...`);
          } else {
            const total = parseInt(res.headers['content-length'], 10);
            progressBar = createProgressBar(total, getBinaryName());
          }
        })
        .on('data', (chunk) => {
          if (progressBar) {
            progressBar.tick(chunk.length / 1000);
          }
        })
        .on('error',(err) => {
          return reject(err);
        })
        .pipe(fsStream)
        .on('error', (err) => {
          fsStream.destroy();
          return reject(err);
        })
        .on('finish', () => {
          fs.renameSync(localPath + '.part', localPath);
          const CHMOD_WITH_EXEC = '0755';
          fs.chmodSync(localPath, CHMOD_WITH_EXEC);
          resolve(localPath);
        })
    } catch (err) {
      reject(err);
    }
  })
}

export async function fetch(): Promise<string> {
  const localPath = getBinaryLocalPath();
  if (fs.existsSync(localPath)) {
    return Promise.resolve(localPath);
  }
  fsExtra.ensureDirSync(path.dirname(localPath));

  return downloadAnalyzer(getBinaryLocalPath());
}
