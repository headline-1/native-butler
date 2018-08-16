import chalk from 'chalk';
import { CommandBuilder } from '../../command';
import { replaceVariables } from '../../utils/args';
import { ButlerError } from '../../utils/butler-error';
import { exists } from '../../utils/file';
import { abis, deviceIds, targets } from './allowed-values';
import { createAvd } from './create-avd';
import { startAvd } from './start-avd';

const TAG = 'android-emulator';
const ANDROID_HOME_DEFAULTS = [
  '/Applications/ADT/sdk',
  '/Users/{USER}/Library/Android/sdk/',
  '/home/{USER}/Android/Sdk',
  'C:\\Users\\{USERNAME}\\AppData\\Local\\Android\\android-sdk',
];

interface Config {
  defaultDevice: string;
  defaultSdk: string;
  defaultAbi: string;
  defaultTarget: string;
  timeout: number;
}

interface Args {
  device: string;
  sdk: string;
  abi: string;
  target: string;
}

export const androidEmulator = new CommandBuilder<Config, Args>()
  .name(TAG)
  .defaultConfig({
    defaultDevice: 'nexus_6p',
    defaultSdk: '27',
    defaultAbi: 'x86',
    defaultTarget: 'google_apis',
    timeout: 30000,
  })
  .envVars({
    ANDROID_HOME: {
      type: 'string',
      description: 'Location of Android SDK installation',
      required: false,
    },
  })
  .config({
    defaultDevice: { type: Object.keys(deviceIds), description: 'Physical device to emulate.' },
    defaultSdk: { type: 'string', description: 'Android SDK level.' },
    defaultAbi: { type: abis, description: 'Architecture to emulate. x86 is obviously faster.' },
    defaultTarget: { type: targets, description: 'Target extensions to be used. ' +
        'It\'s recommended to use Google APIs if the application requires Firebase or Play Services.' },
    timeout: { type: 'number', description: 'Device launch timeout in milliseconds.' },
  })
  .args({
    device: { type: Object.keys(deviceIds), description: 'Physical device to emulate.' },
    sdk: { type: 'string', description: 'Android SDK level.' },
    abi: { type: abis, description: 'Architecture to emulate. x86 is obviously faster.' },
    target: { type: targets, description: 'Target extensions to be used. ' +
        'It\'s recommended to use Google APIs if the application requires Firebase or Play Services.' },
  })
  .execute(async ({ config, args }) => {
    const { ANDROID_HOME } = process.env;
    const { defaultDevice, defaultSdk, defaultAbi, defaultTarget, timeout } = config;
    const { device, sdk, abi, target } = args;

    let androidHome = ANDROID_HOME;
    if (!androidHome) {
      for (let home of ANDROID_HOME_DEFAULTS) {
        home = replaceVariables(home, process.env);
        if (await exists(home)) {
          androidHome = home;
          break;
        }
      }
      if (!androidHome) {
        throw new ButlerError(
          TAG,
          'ANDROID_HOME env var is missing and we couldn\'t find SDK in any of default directories',
          { env: process.env, config }
        );
      }
      console.log(chalk.cyan(`ANDROID_HOME env var not found; using default "${androidHome}"`));
    }

    const deviceName = await createAvd({
      androidHome,
      target: target || defaultTarget,
      sdk: sdk || defaultSdk,
      abi: abi || defaultAbi,
      device: device || defaultDevice,
    });

    console.log(`${TAG}: starting...`);
    await startAvd({
      androidHome,
      deviceName,
      timeout,
    });
    console.log(`${TAG}: avd started successfully`);
  })
  .build();
