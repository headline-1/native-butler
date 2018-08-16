import * as path from 'path';
import { CommandBuilder } from '../command';
import { makeDir, readFile, writeFile } from '../utils/file';

const TAG = 'metadata';

interface Config {
  source: string;
  metadataPath: string;
}

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

export const metadata = new CommandBuilder<Config>()
  .name(TAG)
  .description(
    'Extracts metadata from a single JSON file to multiple *.txt files'
  )
  .config({
    source: { type: 'string', required: true, description: 'Source JSON file path' },
    metadataPath: { type: 'string', required: true, description: 'Metadata output directory' },
  })
  .execute(
    async ({ config }) => {
      const { source, metadataPath } = config;

      const metadata = JSON.parse(await readFile(source));
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
      await parseObject(metadata, metadataPath);
    }
  )
  .build();
