import { CommandBuilder } from '../command';
import { assertProperty } from '../utils/args';
import { copy, copyFile, exists, glob, readFile, remove, writeFile } from '../utils/file';

interface AndroidPatchOptions {
  compileSdkVersion: number;
  buildToolsVersion: string;
  targetSdkVersion: number;
  appcompatVersion: string;
  gradleVersion: string;
}

interface Config {
  gradlePatchOptions?: AndroidPatchOptions;
  remove: string[];
  copy: { from: string, to: string, file?: boolean }[];
}

const TAG = 'patch';

const forceAndroidBuildVersions = async (filePath: string, options: AndroidPatchOptions) => {
  let file = await readFile(filePath);
  // Replace existing Android build versions
  file = file.replace(/(compileSdkVersion\s+).+(\n)/g, `$1${options.compileSdkVersion}$2`);
  file = file.replace(/(buildToolsVersion\s+).+(\n)/g, `$1"${options.buildToolsVersion}"$2`);
  file = file.replace(/(targetSdkVersion\s+).+(\n)/g, `$1${options.targetSdkVersion}$2`);
  const buildscriptMatch = file.match(/buildscript\s*{\s*[^}]*repositories\s*{(?:\S|\s)*?}/);
  if (buildscriptMatch) {
    const buildscript = buildscriptMatch[0];
    if (buildscript.indexOf('google()') < 0) {
      file = file.replace(buildscript, buildscript.replace(/(repositories\s*{)/, '$1\n        google()'));
    }
  }

  // Replace support package versions to a single one
  const supportPackages = [
    'com.android.support.appcompat-v7',
    'com.android.support:exifinterface',
    'com.android.support:animated-vector-drawable',
    'com.android.support:support-media-compat',
    'com.android.support:support-annotations',
    'com.android.support:support-v4',
  ];

  const supportPackagesRegex = new RegExp(`((?:compile|compileOnly|implementation|api)\\s+["'](?:${
    supportPackages
      .map(pkg => pkg.replace(/\./g, '\\.'))
      .join('|')
    }):).+(["']\\n)`);
  file = file.replace(supportPackagesRegex, `$1${options.appcompatVersion}$2`);

  file = file.replace(/(classpath\s+["']com.android.tools.build:gradle:).+(["']\n)/g, `$1${options.gradleVersion}$2`);

  // Remove definitions present in one library
  file = file.replace(/def _compileSdkVersion [0-9]+\n/, '');
  file = file.replace(/def _buildToolsVersion ["'][0-9.]+["']\n/, '');
  file = file.replace(/def _targetSdkVersion [0-9]+\n/, '');

  // Update deprecated Gradle dependencies to a new format (gradleVersion 3.1.0+)
  file = file
    .replace(/apk\s["'](.+?)["']/g, 'runtimeOnly "$1"')
    .replace(/apk\s?\(["'](.+?)["']\)/g, 'runtimeOnly("$1")')
    .replace(/compile\s["'](.+?)["']/g, 'implementation "$1"')
    .replace(/compile\s?\(["'](.+?)["']\)/g, 'implementation("$1")')
    .replace(/provided\s["'](.+?)["']/g, 'compileOnly "$1"')
    .replace(/provided\s?\(["'](.+?)["']\)/g, 'compileOnly("$1")');
  await writeFile(filePath, file);
};

export const patch = new CommandBuilder<Config>()
  .name(TAG)
  .description('Mainly patches node_modules, because some of dependencies may require overriding parts of it.' +
    ' Also allows to set a single SDK version for Android dependencies and project.')
  .defaultConfig(
    {
      gradlePatchOptions: undefined,
      remove: [],
      copy: [],
    })
  .config({
    gradlePatchOptions: { type: 'object', description: 'Android build.gradle patching options' },
    remove: { type: 'string[]', description: 'Files or folders to remove from project directory' },
    copy: { type: 'object[]', description: 'Files or folders to copy (i.e. from project directory to node_modules' },
  })
  .execute(async ({ config }) => {
      if (config.remove && config.remove.length > 0) {
        for (const path of config.remove) {
          if (typeof path !== 'string' || path.match(/(\.\.[\/\\]|[\/\\]\.\.)/)) {
            throw new Error('removeModules should contain array of paths that don\'t ' +
              'refer to directories above current working directory level: ' + JSON.stringify(module));
          }
          console.log('Remove: ' + path);
          await remove(path);
        }
      }

      if (config.copy && config.copy.length > 0) {
        for (const file of config.copy) {
          if (typeof file !== 'object' || typeof file.from !== 'string' || typeof file.to !== 'string') {
            throw new Error('copy should contain objects with "from" and "to" ' +
              'fields containing source and destination paths that don\'t ' +
              'refer to directories above current working directory level: ' + JSON.stringify(file));
          }
          console.log(`Copy: ${file.from} to ${file.to}`);
          if (file.file) {
            await copyFile(file.from, file.to);
          } else {
            await copy(file.from, file.to);
          }
        }
      }

      if (await exists('./patches')) {
        console.log('Patching overridden modules...');
        await copy('./patches/**', './node_modules');
      }

      if (config.gradlePatchOptions) {
        const patchOptions: AndroidPatchOptions = config.gradlePatchOptions;
        console.log('Patching Android gradle files...');

        const versionString = /^\d+\.\d+\.\d+$/;

        assertProperty(config, 'gradlePatchOptions.compileSdkVersion', 'number');
        assertProperty(config, 'gradlePatchOptions.buildToolsVersion', versionString);
        assertProperty(config, 'gradlePatchOptions.targetSdkVersion', 'number');
        assertProperty(config, 'gradlePatchOptions.appcompatVersion', versionString);
        assertProperty(config, 'gradlePatchOptions.gradleVersion', versionString);

        await Promise.all([
          ...await glob('./node_modules/**/build.gradle'),
          './android/build.gradle',
          './android/app/build.gradle',
        ].map((filePath: string) => {
          console.log(`Patching: ${filePath}`);
          return forceAndroidBuildVersions(filePath, patchOptions);
        }));
      }
    }
  )
  .build();
