import chalk from 'chalk';
import { CommandBuilder } from '../command';
import { replaceVariables } from '../utils/args';
import { ButlerError } from '../utils/butler-error';
import { execAndLog } from '../utils/execute';

const MAX_COMMAND_DEPTH = 32;
const TAG = 'build';

interface Config {
  buildTypes: Record<string, string>;
  commands: Record<string, string | string[]>;
}

interface Arguments {
  pr: string;
  branch: string;
  platform: string;
}

export const build = new CommandBuilder<Config, Arguments>()
  .name(TAG)
  .config({
    buildTypes: {
      type: 'object',
      required: false,
      description: '',
    },
    commands: {
      type: 'object',
      required: false,
      description: 'Commands that are executed for specific `buildTypes`. ' +
        'Each command can be a simple bash command to execute or an array of multiple commands. ' +
        'Commands can also point to other commands, i.e. "!myCommand" will point to a command named "myCommand"',
    },
  })
  .defaultConfig({
    buildTypes: {
      default: 'test',
      master: 'production',
      staging: 'staging',
      develop: 'development',
    },
    commands: {},
  })
  .args({
    pr: {
      type: ['true', 'false'],
      required: true,
      description: 'Flag determining if the build is a pull request build. ' +
        'PR builds always resolve to `default` build type so that they won\'t trigger any deployment.',
    },
    branch: {
      type: 'string',
      required: true,
      description: 'Current branch. This is used to infer the correct buildType.',
    },
    platform: {
      type: ['ios', 'android'],
      required: true,
      description: 'A target platform to build for. This can be later used in commands.',
    },
  })
  .execute(async ({ config, args }) => {
    const { pr, branch, platform } = args;

    if (!config.buildTypes.default) {
      config.buildTypes.default = 'test';
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

    const type = (pr === 'false' && config.buildTypes[branch]) || config.buildTypes.default;
    const commands = processCommands(config.commands[type] || config.commands.default);
    const environment = {
      PLATFORM: platform,
      BUILD_TYPE: type,
      BRANCH: branch,
      IS_PR: pr,
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
  })
  .build();
