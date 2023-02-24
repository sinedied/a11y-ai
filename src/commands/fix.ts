import fs from 'node:fs/promises';
import process from 'node:process';
import chalk from 'chalk';
import createDebug from 'debug';
import ora, { type Ora } from 'ora';
import { suggestFix } from '../ai.js';
import { generateColoredDiff, generatePatchDiff } from '../diff.js';
import { askForConfirmation } from '../util.js';

const debug = createDebug('fix');

export type FixOptions = {
  interactive?: boolean;
  patchDiff?: boolean;
  spinner?: Ora;
};

export type FixResult = {
  file: string;
  fixed: boolean;
};

export async function fix(files: string[], options: FixOptions = {}) {
  let spinner;
  try {
    if (options.interactive) {
      for (const file of files) {
        spinner = ora(`Searching fixes for ${chalk.cyan(file)}...`).start();
        // eslint-disable-next-line no-await-in-loop
        await fixFile(file, { ...options, spinner });
      }
    } else {
      spinner = ora('Automatically fixing files...').start();
      const promises = files.map(async (file) => fixFile(file, options));
      const results = await Promise.all(promises);
      spinner.stop();
      for (const result of results) {
        console.info(result.fixed ? result.file : chalk.dim(result.file));
      }
    }
  } catch (error: unknown) {
    spinner?.fail();
    const error_ = error as Error;
    console.error(error_.message);
    process.exitCode = 1;
  }
}

export async function fixFile(file: string, options: FixOptions = {}): Promise<FixResult> {
  const interactive = options.interactive ?? true;
  try {
    debug(`Searching fixes for '${file}'...`);
    const content = await fs.readFile(file, 'utf8');
    const suggestion = await suggestFix(content);
    if (!suggestion) {
      debug(`No fix suggestion for '${file}'`);
      return { file, fixed: false };
    }

    if (interactive) {
      options.spinner?.stop();
      const result = await interactiveFix(file, content, suggestion, options);
      return { file, fixed: result };
    }

    debug(`Suggested fix for '${file}':`);
    debug(generatePatchDiff(file, content, suggestion));
    await fs.writeFile(file, suggestion);
    debug(`Applied fix for '${file}'`);
    return { file, fixed: true };
  } catch (error: unknown) {
    const error_ = error as Error;
    const message = `Could not suggest or apply fix for '${file}': ${error_.message ?? error_}`;
    debug(message);
    throw new Error(message);
  }
}

export async function interactiveFix(
  file: string,
  content: string,
  suggestion: string,
  options: FixOptions = {}
): Promise<boolean> {
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
    return true;
  }

  debug(`Rejected fix for '${file}'`);
  return false;
}
