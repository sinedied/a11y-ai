import fs from 'node:fs/promises';
import process from 'node:process';
import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { createPatch, diffChars } from 'diff';
import createDebug from 'debug';
import { suggestFix } from './ai.js';

const debug = createDebug('fix');

export type FixOptions = {
  interactive?: boolean;
  patchDiff?: boolean;
};

export async function fixFiles(files: string[], options: FixOptions = {}) {
  try {
    if (options.interactive) {
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        await fixFile(file, options);
      }
    } else {
      const promises = files.map(async (file) => fixFile(file, options));
      await Promise.all(promises);
    }
  } catch (error: unknown) {
    const error_ = error as Error;
    console.error(error_.message);
    process.exitCode = 1;
  }
}

export async function fixFile(file: string, options: FixOptions = {}) {
  const interactive = options.interactive ?? true;
  try {
    debug(`Searching fixes for '${file}'...`);
    const content = await fs.readFile(file, 'utf8');
    const suggestion = await suggestFix(content);
    if (!suggestion) {
      debug(`No fix suggestion for '${file}'`);
      if (!interactive) {
        console.info(chalk.dim(file));
      }

      return false;
    }

    if (interactive) {
      await interactiveFix(file, content, suggestion, options);
    } else {
      debug(`Suggested fix for '${file}':`);
      debug(generatePatchDiff(file, content, suggestion));
      await fs.writeFile(file, suggestion);
      debug(`Applied fix for '${file}'`);
      console.info(file);
    }
  } catch (error: unknown) {
    const error_ = error as Error;
    const message = `Could not suggest or apply fix for '${file}': ${error_.message ?? error_}`;
    debug(message);
    throw new Error(message);
  }
}

export function generateColoredDiff(content: string, suggestion: string) {
  const diff = diffChars(content, suggestion);
  let coloredDiff = '';
  for (const part of diff) {
    if (part.added) {
      coloredDiff += chalk.green(part.value);
    } else if (part.removed) {
      coloredDiff += chalk.red(part.value);
    } else {
      coloredDiff += part.value;
    }
  }

  return coloredDiff.trim();
}

export function generatePatchDiff(file: string, content: string, suggestion: string) {
  const diff = createPatch(file, content, suggestion);
  return (
    diff
      // Remove header
      .split(/={10,}/)
      .slice(1)
      .join('')
      .split('\n')
      .map((line) => {
        switch (line[0]) {
          case '+': {
            return line.startsWith('+++') ? line : chalk.green(line);
          }

          case '-': {
            return line.startsWith('---') ? line : chalk.red(line);
          }

          case '@': {
            return chalk.cyan(line);
          }

          case '\\': {
            return chalk.dim(line);
          }

          default: {
            return line;
          }
        }
      })
      .join('\n')
      .trim()
  );
}

export async function interactiveFix(file: string, content: string, suggestion: string, options: FixOptions = {}) {
  console.info(`Changes suggested for ${chalk.cyan(file)}:\n${chalk.dim('---')}`);
  if (options.patchDiff) {
    console.info(generatePatchDiff(file, content, suggestion));
  } else {
    console.info(generateColoredDiff(content, suggestion));
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
