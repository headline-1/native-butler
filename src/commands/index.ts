import { androidEmulator } from './android-emulator';
import { build } from './build';
import { changelog } from './changelog';
import { dotEnv } from './dotenv';
import { keys } from './keys';
import { metadata } from './metadata';
import { patch } from './patch';
import { version } from './version';

export const Commands = [
  androidEmulator,
  build,
  changelog,
  dotEnv,
  keys,
  metadata,
  patch,
  version,
];
