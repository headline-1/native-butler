import { Args } from './utils/args';

type CommandExec<Config> = (input: CommandInput<Config>) => Promise<void>;

interface Command<Config> {
  name: string;
  exec: CommandExec<Config>;
  defaultConfig: Config;
}

interface CommandInput<Config> {
  commandParams: string[];
  args: Args;
  config: Config;
}

export const createCommand = <Config>(
  name: string,
  defaultConfig: Config,
  exec: CommandExec<Config>
): Command<Config> => ({
  name,
  exec,
  defaultConfig,
});
