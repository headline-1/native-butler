import { CommandBuilder } from '../command';
import { ButlerError } from '../utils/butler-error';
import { writeFile } from '../utils/file';

const TAG = 'dotenv';

export const dotEnv = new CommandBuilder()
  .name(TAG)
  .syntax('dotenv:{environment}')
  .description(
    'Creates the new .env file in the project\'s root directory, containing NODE_ENV variable. ' +
    'It can be used together with "react-native-dotenv" package to use multiple configurations multiple environments.'
  )
  .params([
    {
      type: 'string',
      description: 'Defines NODE_ENV value set in .env file',
    },
  ]).execute(async ({ commandParams }) => {
    const environment = commandParams[0];
    if (!environment) {
      throw new ButlerError(TAG, 'Environment not specified.');
    }

    await writeFile('.env', 'NODE_ENV=' + environment + '\n');
  })
  .build();
