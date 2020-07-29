import { promisify } from 'util';
import * as fs from 'fs';
import * as globOrig from 'glob';

export const exists = promisify(fs.exists);
export const rename = promisify(fs.rename);
export const unlink = promisify(fs.unlink);
export const mkdir = promisify(fs.mkdir);
export const mkdtemp = promisify(fs.mkdtemp);
export const readFile = promisify(fs.readFile);
export const writeFile = promisify(fs.writeFile);
export const rmdir = promisify(fs.rmdir);
export const glob = promisify(globOrig);
