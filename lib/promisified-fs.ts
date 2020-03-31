import {promisify} from 'util';
import * as fs from 'fs';

export const exists = promisify(fs.exists);
export const rename = promisify(fs.rename);
export const unlink = promisify(fs.unlink);
export const readFile = promisify(fs.readFile);
