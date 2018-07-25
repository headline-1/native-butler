import { exec } from '../../utils/execute';

export enum DeviceStatus {
  READY, WAITING, INVALID,
}

export const getDeviceStatus = async (): Promise<DeviceStatus> => {
  const notReady = [
    'device not found',
    'device still connecting',
    'device offline',
    'running',
    'no emulators found',
  ];
  let result = '';
  try {
    const { stdout, stderr } = await exec('adb -e shell getprop init.svc.bootanim');
    result = stdout + '\n' + stderr;
  } catch (error) {
    result += error.stderr + '\n' + error.stdout;
  }
  for (const status of notReady) {
    if (result.indexOf(status) >= 0) {
      return DeviceStatus.WAITING;
    }
  }
  if (result.indexOf('stopped') >= 0) {
    return DeviceStatus.READY;
  }
  return DeviceStatus.INVALID;
};
