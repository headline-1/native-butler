export type Args = Record<string, string>;

export const parseCommand = (argv: string[]): string[] => argv[2]
  .split(':');

export const parseArgs = (argv: string[]): Args => argv
  .map(arg => arg.match(/^--(.+?)(?:=(.+))?$/))
  .filter(arg => !!arg)
  .reduce((args, arg) => ({ ...args, [arg[1]]: arg[2] !== undefined ? arg[2] : 'true' }), {});

export const assertProperty = (config: any, key: string, validator: string | RegExp) => {
  const keys: string[] = key.split('.');
  let value: any = config;
  for (const k of keys) {
    if (!value) {
      break;
    }
    value = value[k];
  }
  const type = typeof validator === 'string' ? validator : 'string';
  const regex = typeof validator === 'string' ? undefined : validator;

  if ((Array.isArray(value) ? `${typeof value[0]}[]` : typeof value) !== type) {
    throw new Error(`${key} should be a ${type}, but is ${typeof value}`);
  }
  if (regex && !value.match(regex)) {
    throw new Error(`${key} should match ${type}, but it equals to ${value}`);
  }
};
