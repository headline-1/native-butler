import { spawn } from 'child_process';
import { createCommand } from '../command';

const MAX_COMMAND_DEPTH = 32;

export const build = createCommand(
  'build',
  {
    branches: {
      '!default': 'test',
      master: 'production',
      staging: 'staging',
      develop: 'development',
    },
    commands: {
      '!always': 'yarn fastlane {PLATFORM} test',
      '!default': 'yarn fastlane {PLATFORM} {BUILD_TYPE}',
    },
  },
  async ({ commandParams, config, args }) => {
    const isPR = args['pull-request'];
    if (commandParams.length < 2 || isPR === undefined) {
      throw new Error(
        'build: Expected 2 command params and argument. Syntax:\n' +
        'build:{PLATFORM}:{BRANCH} --pull-request={IS_PR},\n' +
        'i.e. build:ios:develop --pull-request=true'
      );
    }
    const [platform, branch] = commandParams;
    if (!platform) {
      throw new Error('build: platform command param is not specified');
    }
    if (!branch) {
      throw new Error('build: branch command param is not specified');
    }
    if (!config.branches) {
      throw new Error('build: branches object is missing from configuration');
    }
    if (!config.commands) {
      throw new Error('build: commands object is missing from configuration');
    }
    if (!config.branches['!default']) {
      config.branches['!default'] = 'test';
    }

    const processCommands = (command: any, depth = 0): string[] => {
      if (depth > MAX_COMMAND_DEPTH) {
        throw new Error(
          `build: command depth exceeded ${MAX_COMMAND_DEPTH}; ` +
          `you probably have a circular dependency in your command chain.`
        );
      }
      if (typeof command === 'string') {
        if (command[0] === '!' && config.commands[command]) {
          return [...processCommands(config.commands[command], depth + 1)];
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
      throw new Error(`build: command ${JSON.stringify(command)} has unsupported type of ${typeof command}`);
    };

    const type = (isPR === 'true' && config.branches[branch]) || config.branches['!default'];
    const commands = processCommands(config.commands[type] || config.commands['!default']);
    const environment = {
      PLATFORM: platform,
      BRANCH: branch,
      IS_PR: isPR,
    };

    const executeCommand = (command: string): Promise<void> => new Promise((resolve, reject) => {
      for (const key in environment) {
        if (environment.hasOwnProperty(key)) {
          command = command.replace(new RegExp(`{${key}}`, 'g'), environment[key]);
        }
      }

      const [commandName, ...args] = command.split(' ');
      const child = spawn(commandName, args);
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('child process exited with code ' + code));
        }
      });
    });

    for (const command of commands) {
      await executeCommand(command);
    }
  }
);
