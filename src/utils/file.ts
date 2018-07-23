import * as fs from 'fs';
import globCallback from 'glob';
import mkdirp from 'mkdirp';
import { ncp } from 'ncp';
import rimraf from 'rimraf';
import { promisify } from 'util';

export const exists = promisify(fs.exists);
export const remove = promisify(rimraf);
export const glob = promisify(globCallback);
export const copy = promisify(ncp);

const rename = promisify(fs.rename);
const read = promisify(fs.readFile);
const write = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export const readFile = (file: string, format = 'utf8') => read(file, format);

export const writeFile = async (file: string, data: any, format = 'utf8') => {
  const fileExists = await exists(file);
  if (fileExists) {
    await rename(file, file + '.old');
  }
  await write(file, data, format);
  if (fileExists) {
    await unlink(file + '.old');
  }
};

export const copyFile = async (source: string, destination: string) => {
  await write(destination, await readFile(source, 'binary'), 'binary');
};

export const makeDir = (path: string) => new Promise((resolve, reject) => {
  mkdirp(path, err => err ? reject(err) : resolve());
});

export const readDir = promisify(fs.readdir);
