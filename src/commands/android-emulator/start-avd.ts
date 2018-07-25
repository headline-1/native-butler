import chalk from 'chalk';
import { spawn } from 'child_process';
import * as path from 'path';
import { ButlerError } from '../../utils/butler-error';
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

  const emulatorDirectory = path.join(androidHome, './tools');

  const emulatorProcess = spawn(
    path.join(emulatorDirectory, 'emulator'),
    ['-avd', deviceName],
    { cwd: emulatorDirectory, detached: true }
  );

  let emulatorOutput = '';
  emulatorProcess.stdout.on('data', (data) => {
    emulatorOutput += data.toString();
  });
  emulatorProcess.stderr.on('data', (data) => {
    emulatorOutput += chalk.bold.red(data.toString());
  });

  const couldNotStart = () => {
    emulatorOutput = chalk.green(emulatorOutput);
    throw new ButlerError(
      TAG,
      `could not start ${deviceName};\n${chalk.bold('emulator output:')}\n${emulatorOutput}`,
      { params }
    );
  };

  const start = Date.now();
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
    await sleep(1000);
    console.log(`${TAG}: waiting for avd...`);
  }
  if (emulatorProcess.killed) {
    couldNotStart();
  }
  const bootTime = (Date.now() - start) / 1000;
  console.log(`${TAG}: avd started successfully after ${bootTime.toFixed(2)}s.`);
};
