import { build } from './commands/build';
import { changelog } from './commands/changelog';
import { dotEnv } from './commands/dotenv';
import { keys } from './commands/keys';
import { metadata } from './commands/metadata';
import { patch } from './commands/patch';
import { version } from './commands/version';
import { readConfig } from './config';
import { parseArgs } from './utils/args';

const COMMANDS = [
  build,
  changelog,
  dotEnv,
  keys,
  metadata,
  patch,
  version,
];

const run = async () => {
  const command = process.argv[2];
  if (!command) {
    console.log(
      'Please specify command to execute. Supported commands: ' + COMMANDS.map(cmd => cmd.name).join(', ')
    );
    process.exit(1);
  }
  const commandParams = command.split(':');
  const commandName = commandParams.shift();
  const config = await readConfig();

  for (const command of COMMANDS) {
    if (command.name === commandName) {
      await command.exec({
        commandParams,
        args: parseArgs(process.argv),
        config: config[commandName]
          ? { ...command.defaultConfig, ...config[commandName] }
          : command.defaultConfig,
      });
    }
  }
};

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('An error occurred while running Native Butler.\n', err);
    process.exit(1);
  });
