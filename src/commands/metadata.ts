import * as path from 'path';
import { createCommand } from '../command';
import { makeDir, readFile, writeFile } from '../utils/file';

const setFile = (key: string, value: string) => writeFile(path.resolve(key), value);

const parseObject = async (obj: object, parent: string) => {
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    const value = obj[key];
    const p = `${parent}/${key}`;
    if (typeof value === 'string') {
      await setFile(path.resolve(`${p}.txt`), value);
    } else {
      await makeDir(path.resolve(p));
      await parseObject(value, p);
    }
  }
};

const set = (obj: object, key: string, value: string) => {
  const parts = key.split('.');
  parts.slice(0, parts.length - 1).forEach((key) => {
    if (!obj[key]) {
      obj[key] = {};
    }
    obj = obj[key];
  });
  obj[parts[parts.length - 1]] = value;
};

const setMultiple = (obj: object, keys: string[], value: string) =>
  keys.forEach(key => set(obj, key, value));

export const metadata = createCommand(
  'metadata',
  {
    sourceJson: undefined,
    metadataRoot: undefined,
  },
  async ({ config }) => {
    const { sourceJson, metadataRoot } = config;
    if (!sourceJson || !metadataRoot) {
      console.log('Missing --src or --meta argument. Both source json file and output directory are required`');
      process.exit(1);
    }
    const metadata = JSON.parse(await readFile(sourceJson));
    if (metadata.common) {
      for (const language in metadata.common) {
        if (!metadata.common.hasOwnProperty(language)) {
          continue;
        }
        const values = metadata.common[language];
        if (values.title) {
          setMultiple(
            metadata,
            [`ios.metadata.${language}.name`, `android.${language}.title`],
            values.title
          );
        }
        if (values.subtitle) {
          setMultiple(
            metadata,
            [`ios.metadata.${language}.subtitle`, `android.${language}.short_description`],
            values.subtitle
          );
        }
        if (values.description) {
          setMultiple(
            metadata,
            [
              `ios.metadata.${language}.description`,
              'ios.metadata.review_information.beta_app_description',
              `android.${language}.full_description`,
            ],
            values.description
          );
        }
      }
    }
    delete metadata.common;
    await parseObject(metadata, metadataRoot);
  }
);
