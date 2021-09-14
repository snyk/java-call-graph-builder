import { getGradleCommandArgs } from '../../lib/gradle-wrapper';

import * as path from 'path';
import { platform } from 'os';

test('get right args for gradle command', async () => {
  const commandArgs = getGradleCommandArgs(
    'directory_name',
    'some_script.gradle.kts',
  );
  const initGradlePath = commandArgs[2]; // Contains a temporary path
  expect(commandArgs).toEqual([
    'printClasspath',
    '-I',
    initGradlePath,
    '-q',
    '-p',
    'directory_name',
    '--init-script',
    'some_script.gradle.kts',
  ]);
});

test('get right args for gradle command without init script', async () => {
  const commandArgs = getGradleCommandArgs('directory_name');
  const initGradlePath = commandArgs[2]; // Contains a temporary path
  expect(commandArgs).toEqual([
    'printClasspath',
    '-I',
    initGradlePath,
    '-q',
    '-p',
    'directory_name',
  ]);
});

test('get right args for gradle command with configuration attributes', async () => {
  const isWin = /^win/.test(platform());
  const quot = isWin ? '"' : "'";

  const commandArgs = getGradleCommandArgs(
    'directory_name',
    undefined,
    'buildtype:release,usage:java-runtime,backend:prod',
  );
  const initGradlePath = commandArgs[2]; // Contains a temporary path

  expect(commandArgs).toEqual([
    'printClasspath',
    '-I',
    initGradlePath,
    '-q',
    '-p',
    'directory_name',
    `-PconfAttrs=${quot}buildtype:release,usage:java-runtime,backend:prod${quot}`,
  ]);
});
