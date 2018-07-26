import chalk from 'chalk';
import { spawn } from 'child_process';
import * as path from 'path';
import { ButlerError } from '../../utils/butler-error';
import { exists } from '../../utils/file';
import { sleep } from '../../utils/sleep';
import { DeviceStatus, getDeviceStatus } from './device-status';

const TAG = 'start-avd';

interface StartAvdParams {
  androidHome: string;
  deviceName: string;
  timeout: number;
}

export const startAvd = async (params: StartAvdParams) => {
  const {
    androidHome,
    deviceName,
    timeout,
  } = params;

  let emulator = path.join(androidHome, './emulator/emulator');

  if (!await exists(emulator)) {
    emulator = path.join(androidHome, './tools/emulator');
    if (!await exists(emulator)) {
      throw new ButlerError(
        TAG,
        `could not find emulator in ${androidHome} `,
        { params }
      );
    }
  }

  const emulatorProcess = spawn(
    emulator,
    ['-avd', deviceName],
    { cwd: path.dirname(emulator), detached: true }
  );

  emulatorProcess.stdout.on('data', (data) => {
    const stringifiedData = data.toString().trim();
    console.log(chalk.green.bold(`${TAG}: `) + chalk.green(stringifiedData));
  });
  emulatorProcess.stderr.on('data', (data) => {
    const stringifiedData = data.toString().trim();
    console.log(chalk.red.bold(`${TAG}: `) + chalk.red(stringifiedData));
    if (stringifiedData.toLowerCase().indexOf('fatal') >= 0) {
      emulatorProcess.kill('SIGKILL');
      throw new ButlerError(
        TAG,
        'fatal error while starting emulator.',
        { params }
      );
    }
  });

  const couldNotStart = () => {
    throw new ButlerError(TAG, `could not start ${deviceName}`, { params });
  };

  const start = Date.now();
  let sleeps = 0;
  while (await getDeviceStatus() === DeviceStatus.WAITING) {
    if (emulatorProcess.killed) {
      couldNotStart();
    }
    const time = Date.now() - start;
    if (time > timeout) {
      emulatorProcess.kill('SIGKILL');
      throw new ButlerError(
        TAG,
        'timeout exceeded while waiting for avd to start; SIGKILL signal sent.',
        { params }
      );
    }
    await sleep(500);
    if ((sleeps++) % 10 === 0) {
      console.log(`${TAG}: waiting for avd...`);
    }
  }
  if (emulatorProcess.killed) {
    couldNotStart();
  }
  const bootTime = (Date.now() - start) / 1000;
  console.log(`${TAG}: avd started successfully after ${bootTime.toFixed(2)}s.`);
};
