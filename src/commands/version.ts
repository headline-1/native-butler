import { CommandBuilder } from '../command';
import { readFile, writeFile } from '../utils/file';

const TAG = 'version';

interface Config {
  files: string[];
}

const replacePlistValue = (plistString: string, key: string, value: string | number) =>
  plistString.replace(
    new RegExp(`(<key>${key}<\\/key>\\n\\s<string>).+(<\\/string>)`),
    `$1${value}$2`
  );

const setPlistVersion = async (plistPath: string, version: number, displayableVersion: string) => {
  let file = await readFile(plistPath);
  file = replacePlistValue(file, 'CFBundleVersion', version);
  file = replacePlistValue(file, 'CFBundleShortVersionString', displayableVersion);
  await writeFile(plistPath, file);
};

const setBuildGradleVersion = async (buildGradlePath: string, version: number, displayableVersion: string) => {
  let file = await readFile(buildGradlePath);
  file = file.replace(/(versionCode\s).+(\n)/, `$1${version}$2`);
  file = file.replace(/(versionName\s).+(\n)/, `$1"${displayableVersion}"$2`);
  await writeFile(buildGradlePath, file);
};

const setPackageJsonVersion = async (packageJsonPath: string, buildNumber: number, versionString: string) => {
  const file = JSON.parse(await readFile(packageJsonPath));
  file.build = buildNumber;
  file.version = versionString;
  await writeFile(packageJsonPath, JSON.stringify(file, null, 2) + '\n');
};

const setConfigVersion = async (configPath: string, version: number, displayableVersion: string) => {
  const file = JSON.parse(await readFile(configPath));
  file.DISPLAYABLE_VERSION = displayableVersion;
  file.VERSION = version;
  await writeFile(configPath, JSON.stringify(file, null, 2) + '\n');
};

export const version = new CommandBuilder<Config>()
  .name(TAG)
  .defaultConfig({
    files: [],
  })
  .config({
    files: {
      type: 'string[]',
      required: true,
      description: ' Array of all Info.plist and app/build.gradle files that will get the updated version.',
    },
  })
  .params([
    { type: 'string', required: false, description: 'Optional action to execute: bump|reflect' },
  ])
  .execute(async ({ commandParams, config }) => {
      let { build, version } = JSON.parse(await readFile('./package.json'));
      if (!build || typeof build !== 'number') {
        throw new Error('Build number is in invalid format. Expected non-zero number.');
      }

      if (!version || typeof version !== 'string' || !version.match(/^\d+\.\d+\.\d+$/)) {
        throw new Error('Version is in invalid format. Expected semver string.');
      }

      console.log(`${version} (${build})`);

      const bumpPackageJson = async (level: string) => {
        let [major, minor, patch] = version.split('.');
        major = parseInt(major, 10);
        minor = parseInt(minor, 10);
        patch = parseInt(patch, 10);
        switch (level) {
          case 'major':
            major++;
            minor = 0;
            patch = 0;
            break;
          case 'minor':
            minor++;
            patch = 0;
            break;
          case 'patch':
            patch++;
            break;
          default:
            throw new Error('Expected bump level to equal either major, minor or patch.');
        }
        build++;
        version = `${major}.${minor}.${patch}`;
        await setPackageJsonVersion('./package.json', build, version);
        console.log(`Bumped version to ${version} (build ${build})`);
      };

      const reflect = async () => {
        if (!config.files || !config.files.length) {
          return console.log(
            'version: files field is not specified or empty; ' +
            'put the paths to your project files (i.e. ./android/app/build.gradle) inside'
          );
        }
        if (config.files.find((file: string) => !file.match(/\.(plist|gradle|json)$/))) {
          return console.log(
            'version: files contain a path with invalid extension; ' +
            'only gradle, plist and json are supported'
          );
        }
        await Promise.all(config.files.map((path) => {
          console.log(`Processing: ${path}`);
          if (path.endsWith('.plist')) {
            return setPlistVersion(path, build, version);
          }
          if (path.endsWith('.gradle')) {
            return setBuildGradleVersion(path, build, version);
          }
          if (path.endsWith('.json')) {
            return setConfigVersion(path, build, version);
          }
          return Promise.reject(new Error(`version: unsupported file extension: ${path}`));
        }));
      };

      switch (commandParams[0]) {
        case 'bump': {
          await bumpPackageJson(commandParams[1] || 'patch');
          await reflect();
          break;
        }
        case 'reflect': {
          await reflect();
          break;
        }
        default:
          break;
      }
    }
  )
  .build();
