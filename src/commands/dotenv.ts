import { createCommand } from '../command';
import { writeFile } from '../utils/file';

export const dotEnv = createCommand('dotenv', {}, async ({ commandParams }) => {
  const environment = commandParams[0];
  if (!environment) {
    console.log('Environment not specified. Try `butler dotenv:development`');
    process.exit(1);
  }

  await writeFile('.env', 'NODE_ENV=' + environment + '\n');
});
