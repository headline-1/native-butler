import 'source-map-support/register';

import chalk from 'chalk';
import { Commands } from './commands';
import { readConfig } from './config';
import { parseArgs } from './utils/args';
import { ButlerError } from './utils/butler-error';

const run = async () => {
  const command = process.argv[2];
  if (!command) {
    console.log(
      'Please specify command to execute. Supported commands: ' + Commands.map(cmd => cmd.name).join(', ')
    );
    process.exit(1);
  }
  const commandParams = command.split(':');
  const commandName = commandParams.shift();
  const config = await readConfig();

  for (const command of Commands) {
    if (command.name === commandName) {
      try {
        await command.exec({
          commandParams,
          args: parseArgs(process.argv),
          config: config[commandName]
            ? { ...command.defaultConfig, ...config[commandName] }
            : command.defaultConfig,
        });
      } catch (error) {
        if (error instanceof ButlerError) {
          console.log(chalk.red(chalk.bold(error.command) + ': ' + error.message));
          if (error.details) {
            console.log(chalk.bold.magenta('details:\n') + JSON.stringify(error.details));
          }
        } else {
          throw error;
        }
      }
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
