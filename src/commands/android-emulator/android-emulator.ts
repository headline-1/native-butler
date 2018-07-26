import chalk from 'chalk';
import { createCommand } from '../../command';
import { assertProperty, replaceVariables } from '../../utils/args';
import { ButlerError } from '../../utils/butler-error';
import { exists } from '../../utils/file';
import { createAvd } from './create-avd';
import { startAvd } from './start-avd';

const TAG = 'android-emulator';
const ANDROID_HOME_DEFAULTS = [
  '/Applications/ADT/sdk',
  '/Users/{USER}/Library/Android/sdk/',
  '/home/{USER}/Android/Sdk',
  'C:\\Users\\{USERNAME}\\AppData\\Local\\Android\\android-sdk',
];

export const androidEmulator = createCommand(
  TAG,
  {
    defaultDevice: 'nexus_6p',
    defaultSdk: '27',
    defaultAbi: 'x86',
    defaultTarget: 'google_apis',
    timeout: 30000,
  },
  async ({ config, args }) => {
    const { ANDROID_HOME } = process.env;
    const { defaultDevice, defaultSdk, defaultAbi, defaultTarget, timeout } = config;
    const { device, sdk, abi, target } = args;

    assertProperty(config, 'defaultDevice', 'string');
    assertProperty(config, 'defaultSdk', 'string');
    assertProperty(config, 'defaultAbi', 'string');
    assertProperty(config, 'defaultTarget', 'string');

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
  }
);
