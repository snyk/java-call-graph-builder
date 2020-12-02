import { ClassPath } from '../../lib/classpath';
import * as path from 'path';

test('ClassPath', () => {
  expect(
    new ClassPath(`${path.delimiter}${path.delimiter}`).toString(),
  ).toEqual('');
  expect(new ClassPath('').concat(new ClassPath('')).toString()).toEqual('');
  expect(
    new ClassPath(`aaa${path.delimiter}bbb`)
      .concat(new ClassPath('ccc'))
      .toString(),
  ).toEqual(`aaa${path.delimiter}bbb${path.delimiter}ccc`);
  expect(
    new ClassPath(`aaa${path.delimiter}bbb`)
      .concat(new ClassPath(''))
      .toString(),
  ).toEqual(`aaa${path.delimiter}bbb`);
  expect(
    new ClassPath('')
      .concat(new ClassPath(`aaa${path.delimiter}bbb`))
      .toString(),
  ).toEqual(`aaa${path.delimiter}bbb`);
  expect(
    new ClassPath(`aaa${path.delimiter}`)
      .concat(new ClassPath('bbb'))
      .toString(),
  ).toEqual(`aaa${path.delimiter}bbb`);
  expect(
    new ClassPath(`aaa${path.delimiter}`)
      .concat(new ClassPath(`${path.delimiter}bbb`))
      .toString(),
  ).toEqual(`aaa${path.delimiter}bbb`);
  expect(new ClassPath('').concat(new ClassPath('')).toString()).toEqual('');
});
