type CommandExec<Config, Arguments> = (input: CommandInput<Config, Arguments>) => Promise<void>;

interface Input {
  type: string | RegExp | string[];
  required?: boolean;
  description: string;
}

interface Command<Config, Arguments> {
  name: string;
  syntax: string;
  description: string;
  params: Input[];
  args: Record<keyof Arguments, Input>;
  envVars: Record<string, Input>;
  config: Record<keyof Config, Input>;
  exec: CommandExec<Config, Arguments>;
  defaultConfig: Config;
}

interface CommandInput<Config, Arguments> {
  commandParams: string[];
  args: Arguments;
  config: Config;
}

export class CommandBuilder<Config = {}, Arguments = {}> {
  private command: Partial<Command<Config, Arguments>> = {};

  name = (name: string): this => {
    this.command.name = name;
    return this;
  };

  syntax = (syntax: string): this => {
    this.command.syntax = syntax;
    return this;
  };

  description = (description: string): this => {
    this.command.description = description;
    return this;
  };

  params = (params: Input[]): this => {
    this.command.params = params;
    return this;
  };

  args = (args: Record<keyof Arguments, Input>): this => {
    this.command.args = args;
    return this;
  };

  envVars = (envVars: Record<string, Input>): this => {
    this.command.envVars = envVars;
    return this;
  };

  config = (config: Record<keyof Config, Input>): this => {
    this.command.config = config;
    return this;
  };

  execute = (exec: CommandExec<Config, Arguments>): this => {
    this.command.exec = exec;
    return this;
  };

  defaultConfig = (defaultConfig: Config): this => {
    this.command.defaultConfig = defaultConfig;
    return this;
  };

  build = (): Command<Config, Arguments> => this.command as any;
}
