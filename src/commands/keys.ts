import * as crypto from 'crypto';
import * as path from 'path';
import { CommandBuilder } from '../command';
import { readDir, readFile, writeFile } from '../utils/file';

const TAG = 'keys';

interface Config {
  passwordEnvVar: string;
  extensions: string[];
  directory: string;
  encryption: string;
  encryptedExtension: string;
}

export const keys = new CommandBuilder<Config>()
  .name(TAG)
  .description(
    'Encrypts and decrypts private keys, so they can be stored in repository. ' +
    'The repository though *has to* be private'
  )
  .syntax('keys:{decrypt|encrypt}')
  .defaultConfig({
    passwordEnvVar: 'ENCRYPTION_PASSWORD',
    extensions: ['keystore', 'json', 'cer', 'p12', 'mobileprovision'],
    directory: 'keys',
    encryption: 'aes-256-cbc',
    encryptedExtension: '.enc',
  })
  .params([
    { type: 'string', required: true, description: 'Action to perform: decrypt or encrypt' },
  ])
  .config({
    passwordEnvVar: {
      type: 'string',
      required: true,
      description: 'Name of the environmental variable that contains the encryption password',
    },
    extensions: {
      type: 'string[]',
      required: true,
      description: 'Array of extensions of files that have to be encrypted',
    },
    directory: {
      type: 'string',
      required: true,
      description: 'Directory to store both encrypted and unencrypted keys',
    },
    encryption: { type: 'string', required: true, description: 'Encryption algorithm used to encrypt the files' },
    encryptedExtension: { type: /^\..+$/, required: true, description: 'Extension appended to encrypted files' },
  })
  .execute(async ({ commandParams, config }) => {
    const [action] = commandParams;
    const { passwordEnvVar, extensions, directory, encryption, encryptedExtension } = config;

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
  })
  .build();
