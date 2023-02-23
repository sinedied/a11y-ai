import fs from 'node:fs/promises';
import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { diffChars } from 'diff';
import Debug from 'debug';
import { suggestFix } from './ai.js';

const debug = Debug('fix');

export async function fixFiles(files: string[], interactive = true) {
  const promises = files.map(file => fixFile(file, interactive));
  const results = await Promise.all(promises);
}

export async function fixFile(file: string, interactive = true) {
  try {
    debug(`Searching fixes for '${file}'...`);
    const content = await fs.readFile(file, 'utf8');
    const suggestion = await suggestFix(content);
    if (!suggestion) {
      debug(`No fix suggestion for '${file}'`);
      return false;
    }

    if (interactive) {
      await interactiveFix(file, content, suggestion)
    } else {
      await fs.writeFile(file, suggestion);
      debug(`Applied fix for '${file}'`);
    }
  } catch (error: unknown) {
    const err = error as Error;
    const message = `Could not suggest or apply fix for '${file}': ${err.message ?? err}`;
    debug(message);
    throw new Error(message);
  }
}

export async function interactiveFix(file: string, content: string, suggestion: string) {
  console.log(`Changes suggested for ${chalk.cyan(file)}:\n${chalk.dim('---')}`);
  const diff = diffChars(content, suggestion);
  for (const part of diff) {
    if (part.added) {
      process.stdout.write(chalk.green(part.value));
    } else if (part.removed) {
      process.stderr.write(chalk.red(part.value));
    } else {
      process.stdout.write(part.value);
    }
  }
  const confirm = await askForConfirmation(`${chalk.dim('---')}\nApply changes?`);
  if (confirm) {
    await fs.writeFile(file, suggestion);
    debug(`Applied fix for '${file}'`);
  } else {
    debug(`Rejected fix for '${file}'`);
  }
}

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
