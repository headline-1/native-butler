import * as path from 'path';
import { replaceVariables } from '../../utils/args';
import { ButlerError } from '../../utils/butler-error';
import { execAndLog } from '../../utils/execute';
import { copy, exists, readDir, readFile, writeFile } from '../../utils/file';
import { deviceIds } from './allowed-values';

const TAG = 'create-avd';

const configurationTemplate = `
showDeviceFrame=yes
skin.dynamic=yes
skin.name={selectedDevice}
skin.path={deviceSkinsDirectory}
hw.gpu.enabled=yes
hw.gpu.mode=auto
hw.keyboard=yes
hw.ramSize=1536
`;

interface CreateAvdParams {
  androidHome: string;
  device: string;
  sdk: string;
  target: string;
  abi: string;
}

export const createAvd = async (params: CreateAvdParams): Promise<string> => {
  const {
    device, sdk, abi, target, androidHome,
  } = params;

  const deviceName = `${device}_${sdk}_${target}_${abi}`;
  const deviceId = deviceIds[device];
  const deviceDirectory = path.join(androidHome, './devices/', deviceName);
  const skinsDirectory = path.join(androidHome, 'skins');
  const deviceSkinsDirectory = path.join(skinsDirectory, device);
  const sourceSkinsDirectory = path.resolve(__dirname, '../assets/skins');

  const details = {
    deviceName, deviceId, deviceDirectory, skinsDirectory, deviceSkinsDirectory, sourceSkinsDirectory,
  };

  const avdManager = path.join(androidHome, './tools/bin/avdmanager');
  const sdkManager = path.join(androidHome, './tools/bin/sdkmanager');
  if (!await exists(avdManager)) {
    throw new ButlerError(
      TAG,
      'avdmanager tool has not been found in ANDROID_HOME tools directory',
      { params }
    );
  }

  if (!deviceId) {
    throw new ButlerError(
      TAG,
      'there is no identifier defined for selected device, please choose one of available devices',
      { deviceIds }
    );
  }

  if (!await exists(deviceSkinsDirectory)) {
    if (!await exists(sourceSkinsDirectory)) {
      throw new ButlerError(
        TAG,
        'source skins directory does not exist - your environment isn\'t configured properly',
        details
      );
    }
    console.log(`${TAG}: copying bundled skins to Android SDK directory`);
    await copy(sourceSkinsDirectory, skinsDirectory);
    if (!await exists(deviceSkinsDirectory)) {
      throw new ButlerError(
        TAG,
        'there are no skins available for selected device, please choose one of available devices',
        { supportedSkins: await readDir(sourceSkinsDirectory) }
      );
    }
  }

  const packageName = `system-images;android-${sdk};${target};${abi}`;

  const call = async (command: string, errorMessage: string) => {
    try {
      await execAndLog(command);
    } catch (error) {
      throw new ButlerError(
        TAG,
        `${errorMessage}: ${error.message}`,
        { command, params, details }
      );
    }
  };

  if (!await exists(deviceDirectory)) {
    console.log(`${TAG}: avd does not exist yet, creating "${deviceName}..."`);

    console.log(`${TAG}: assuring that the package "${packageName}" exists...`);
    await call(`${sdkManager} --install '${packageName}'`, 'package installation failure');

    console.log(`${TAG}: creating the Android Virtual Device...`);
    await call(`${avdManager} --silent create avd \
        --force \
        --name ${deviceName} \
        --package "${packageName}" \
        --tag "${target}" \
        --device ${deviceIds[device]} \
        --path ${deviceDirectory} \
    `, 'avd creation failure');

    const configPath = path.join(deviceDirectory, 'config.ini');
    const configFile = (
      await readFile(configPath)
      + replaceVariables(configurationTemplate, {
        device, deviceSkinsDirectory,
      })
    )
      .trim()
      .replace(/\n\n/g, '\n');
    await writeFile(configPath, configFile);
  } else {
    console.log(`${TAG}: ${deviceName} avd already exists`);
  }
  return deviceName;
};
