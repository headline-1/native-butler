import chalk from 'chalk';
import { createCommand } from '../command';
import { replaceVariables } from '../utils/args';
import { ButlerError } from '../utils/butler-error';
import { execAndLog } from '../utils/execute';

const MAX_COMMAND_DEPTH = 32;
const TAG = 'build';

export const build = createCommand(
  TAG,
  {
    branches: {
      '!default': 'test',
      master: 'production',
      staging: 'staging',
      develop: 'development',
    },
    commands: {},
  },
  async ({ commandParams, config, args }) => {
    const isPR = args['pull-request'];
    if (commandParams.length < 2 || isPR === undefined) {
      throw new ButlerError(
        TAG,
        'expected 2 command params and argument',
        {
          syntax: 'build:{PLATFORM}:{BRANCH} --pull-request={IS_PR}',
          example: 'build:ios:develop --pull-request=true',
        }
      );
    }
    const [platform, branch] = commandParams;
    if (!platform) {
      throw new ButlerError(TAG, 'platform command param is not specified', { commandParams });
    }
    if (!branch) {
      throw new ButlerError(TAG, 'branch command param is not specified', { commandParams });
    }
    if (!config.branches) {
      throw new ButlerError(TAG, 'branches object is missing from configuration', { config });
    }
    if (!config.commands) {
      throw new ButlerError(TAG, 'commands object is missing from configuration', { config });
    }
    if (!config.branches['!default']) {
      config.branches['!default'] = 'test';
    }

    const processCommands = (command: any, depth = 0): string[] => {
      if (depth > MAX_COMMAND_DEPTH) {
        throw new ButlerError(
          TAG,
          `command depth exceeded ${MAX_COMMAND_DEPTH}; you probably have a circular dependency in your command chain`,
          config.commands
        );
      }
      if (typeof command === 'string') {
        if (command[0] === '!') {
          const foundCommand = config.commands[command.substring(1)];
          return [...processCommands(foundCommand, depth + 1)];
        }
        return [command];
      }
      if (Array.isArray(command)) {
        return command
          .map(c => processCommands(c, depth + 1))
          .reduce((commands: string[], command: string[]) => {
            commands.push(...command);
            return commands;
          }, []);
      }
      throw new ButlerError(
        TAG,
        `command ${JSON.stringify(command)} has unsupported type of ${typeof command}`,
        config.commands
      );
    };

    const type = (isPR === 'false' && config.branches[branch]) || config.branches['!default'];
    const commands = processCommands(config.commands[type] || config.commands['!default']);
    const environment = {
      PLATFORM: platform,
      BUILD_TYPE: type,
      BRANCH: branch,
      IS_PR: isPR,
    };

    const executeCommand = async (command: string) => {
      command = replaceVariables(command, environment);
      console.log(chalk.bold.magenta('build: ' + command));

      try {
        await execAndLog(command);
      } catch (error) {
        throw new ButlerError(TAG, error.message, { command });
      }
    };

    for (const command of commands) {
      await executeCommand(command);
    }
  }
);
