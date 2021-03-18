import { getGradleCommandArgs } from '../../lib/gradle-wrapper';

import * as path from 'path';
import { platform } from 'os';

test('get right args for gradle command', async () => {
  expect(
    getGradleCommandArgs('directory_name', 'some_script.gradle.kts'),
  ).toEqual([
    'printClasspath',
    '-I',
    path.join(__dirname, '../../bin/init.gradle'),
    '-q',
    '-p',
    'directory_name',
    '--init-script',
    'some_script.gradle.kts',
  ]);
});

test('get right args for gradle command without init script', async () => {
  expect(getGradleCommandArgs('directory_name')).toEqual([
    'printClasspath',
    '-I',
    path.join(__dirname, '../../bin/init.gradle'),
    '-q',
    '-p',
    'directory_name',
  ]);
});

test('get right args for gradle command with configuration attributes', async () => {
  const isWin = /^win/.test(platform());
  const quot = isWin ? '"' : "'";

  expect(
    getGradleCommandArgs(
      'directory_name',
      undefined,
      'buildtype:release,usage:java-runtime,backend:prod',
    ),
  ).toEqual([
    'printClasspath',
    '-I',
    path.join(__dirname, '../../bin/init.gradle'),
    '-q',
    '-p',
    'directory_name',
    `-PconfAttrs=${quot}buildtype:release,usage:java-runtime,backend:prod${quot}`,
  ]);
});
