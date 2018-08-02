import * as path from 'path';
import { replaceVariables } from '../../utils/args';
import { ButlerError } from '../../utils/butler-error';
import { execAndLog } from '../../utils/execute';
import { copy, exists, readDir, readFile, writeFile } from '../../utils/file';

const TAG = 'create-avd';

const deviceIds = {
  AndroidWearRound: 2,
  AndroidWearSquare: 4,
  galaxy_nexus: 5,
  nexus_4: 7,
  nexus_5: 8,
  nexus_5x: 9,
  nexus_6: 10,
  nexus_6p: 11,
  nexus_7: 13,
  nexus_7_2013: 12,
  nexus_9: 14,
  nexus_10: 6,
  nexus_one: 15,
  nexus_s: 16,
  pixel: 17,
  pixel_c: 18,
  pixel_xl: 19,
  tv_720p: 1,
  tv_1080p: 0,
};

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
  const sourceSkinsDirectory = path.resolve(__dirname, '../../../assets/skins');

  const avdManager = path.join(androidHome, './tools/bin/avdmanager');
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
    throw new ButlerError(
      TAG,
      'there are no skins available for selected device, please choose one of available devices',
      { supportedSkins: await readDir(sourceSkinsDirectory) }
    );
  }

  if (!await exists(deviceDirectory)) {
    console.log(`${TAG}: avd does not exist yet, creating "${deviceName}"`);
    const command = `${avdManager} --silent create avd \
          --force \
          --name ${deviceName} \
          --package "system-images;android-${sdk};${target};${abi}" \
          --tag "${target}" \
          --device ${deviceIds[device]} \
          --path ${deviceDirectory} \
      `;
    try {
      await execAndLog(command);
    } catch (error) {
      throw new ButlerError(
        TAG,
        'avd creation failure: ' + error.message,
        { command, params }
      );
    }

    if (!await exists(deviceSkinsDirectory)) {
      console.log(`${TAG}: copying bundled skins to Android SDK directory`);
      await copy(sourceSkinsDirectory, skinsDirectory);
    }

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
