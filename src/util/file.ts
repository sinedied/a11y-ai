import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import fs from 'node:fs/promises';
import glob from 'fast-glob';
import { reportOutputFilename } from '../constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function pathExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function getPackageJson(): Promise<Record<string, any>> {
  const file = await fs.readFile(path.join(__dirname, '..', '..', 'package.json'), 'utf8');
  const pkg = JSON.parse(file) as Record<string, any>;
  return pkg;
}

export async function isHtmlPartial(file: string): Promise<boolean> {
  const content = await fs.readFile(file, 'utf8');
  return /<html[\s\S]*<\/html>/im.exec(content) === null;
}

export function isUrl(file: string): boolean {
  return /https?:/.test(file);
}

export async function resolveFilesOrUrls(filesOrUrls: string[]): Promise<string[]> {
  const globs = filesOrUrls.length > 0 ? filesOrUrls : ['**/*.html'];
  if (isUrl(globs[0])) {
    return globs;
  }

  const resolvedFiles = await glob(globs, {
    dot: true,
    ignore: ['**/node_modules/**', `${reportOutputFilename}.*`]
  });

  if (resolvedFiles.length === 0) {
    console.error('No files found');
    process.exitCode = 1;
    return [];
  }

  return resolvedFiles;
}
