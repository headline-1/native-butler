import { exists, readFile } from './utils/file';

export interface Config {

}

const CONFIG_FILE = '.butler.json';
const DEFAULT_CONFIG: Config = {};

export const readConfig = async () => await exists(CONFIG_FILE)
  ? {
    ...DEFAULT_CONFIG,
    ...JSON.parse(await readFile(CONFIG_FILE)),
  }
  : DEFAULT_CONFIG;
