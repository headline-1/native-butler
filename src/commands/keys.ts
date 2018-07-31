import * as crypto from 'crypto';
import * as path from 'path';
import { createCommand } from '../command';
import { assertProperty } from '../utils/args';
import { readDir, readFile, writeFile } from '../utils/file';

export const keys = createCommand(
  'keys',
  {
    passwordEnvVar: 'ENCRYPTION_PASSWORD',
    extensions: ['keystore', 'json', 'cer', 'p12', 'mobileprovision'],
    directory: 'keys',
    encryption: 'aes-256-cbc',
    encryptedExtension: '.enc',
  },
  async ({ commandParams, config }) => {
    const [action] = commandParams;
    const { passwordEnvVar, extensions, directory, encryption, encryptedExtension } = config;

    assertProperty(config, 'passwordEnvVar', 'string');
    assertProperty(config, 'extensions', 'string[]');
    assertProperty(config, 'directory', 'string');
    assertProperty(config, 'encryption', 'string');
    assertProperty(config, 'encryptedExtension', /^\..+$/);

    const password = process.env[passwordEnvVar];
    if (!password) {
      throw new Error(`keys: password is missing (environment variable "${passwordEnvVar}" not defined)`);
    }

    const key = crypto.createHash('md5').update(password, 'utf8').digest('hex').toUpperCase();
    const sourceEncoding = 'binary';
    const encryptionEncoding = 'base64';

    const encrypt = async (path: string) => {
      console.log(path);
      const resultPath = path + encryptedExtension;
      const file = await readFile(path, sourceEncoding);
      const iv = Buffer.alloc(16);
      const cipher = crypto.createCipheriv(encryption, key, iv);
      const data = cipher.update(file, sourceEncoding, encryptionEncoding) + cipher.final(encryptionEncoding);
      await writeFile(resultPath, data, encryptionEncoding);
    };

    const decrypt = async (path: string) => {
      console.log(path);
      const resultPath = path.substring(0, path.length - encryptedExtension.length);
      const file = await readFile(path, encryptionEncoding);
      const iv = Buffer.alloc(16);
      const decipher = crypto.createDecipheriv(encryption, key, iv);
      const data = decipher.update(file, encryptionEncoding, sourceEncoding) + decipher.final(sourceEncoding);
      await writeFile(resultPath, data, sourceEncoding);
    };

    switch (action) {
      case 'encrypt': {
        console.log('keys: encrypting...');

        const files = (await readDir(directory))
          .map(file => path.join(directory, file))
          .filter((file) => {
            for (const ext of extensions) {
              if (file.endsWith(ext)) {
                return true;
              }
            }
            return false;
          });

        for (const file of files) {
          await encrypt(file);
        }
        break;
      }
      case 'decrypt': {
        console.log('keys: decrypting...');

        const files = (await readDir(directory))
          .map(file => path.join(directory, file))
          .filter(file => file.endsWith(encryptedExtension));

        for (const file of files) {
          await decrypt(file);
        }
        break;
      }
      default:
        console.log(
          'Invalid argument. Usage:\n' +
          ' keys:encrypt - Encrypts all keys according to configuration\n' +
          ' keys:decrypt - Decrypts all keys according to configuration'
        );
        break;
    }
  }
);
