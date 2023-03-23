import { createInterface } from 'node:readline';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function askForInput(question: string): Promise<string> {
  return new Promise((resolve, _reject) => {
    const read = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    read.question(question, (answer) => {
      read.close();
      resolve(answer);
    });
  });
}

export async function askForConfirmation(question: string): Promise<boolean> {
  const answer = await askForInput(`${question} [Y/n] `);
  return answer.toLowerCase() !== 'n';
}

export async function getPackageJson(): Promise<Record<string, any>> {
  const file = await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf8');
  const pkg = JSON.parse(file) as Record<string, any>;
  return pkg;
}

export function escapeForHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function pathExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function runCommand(command: string): Promise<string> {
  const result = await promisify(exec)(command);
  return result.stdout.toString();
}
