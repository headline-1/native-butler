import { exec as processExec, spawn as processSpawn } from 'child_process';
import { promisify } from 'util';

export const execAndLog = (command: string): Promise<number> => new Promise((resolve, reject) => {
  const child = processSpawn(command, [], { shell: true });
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  child.on('close', (code: number) => {
    if (code === 0) {
      resolve(code);
    } else {
      reject(new Error(`process has exited with non-zero code: ${code}`));
    }
  });
});

export const exec = promisify(processExec);
