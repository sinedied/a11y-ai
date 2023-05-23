import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import createDebug from 'debug';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import { HTTPError } from 'got';
import { scanIssues, suggestFix } from '../core/index.js';
import {
  generateColoredDiff,
  generatePatchDiff,
  askForConfirmation,
  isUrl,
  resolveFilesOrUrls,
  downloadPageUrl,
  patchOriginalContent,
  isHtmlFile
} from '../util/index.js';

const debug = createDebug('fix');

export type FixOptions = {
  interactive?: boolean;
  patchDiff?: boolean;
  issues?: string[];
  context?: string;
  outputDiff?: boolean;
  chunkSize?: number;
  spinner?: Ora;
};

export type FixFileResult = {
  file: string;
  scanned: boolean;
  issues: string[];
  fixed: boolean;
  accepted?: boolean;
};

export async function fix(files: string[], options: FixOptions = {}) {
  let spinner;
  try {
    files = await resolveFilesOrUrls(files);
    if (options.interactive) {
      for (const file of files) {
        spinner = ora(`Fixing acessibility issues in ${chalk.cyan(file)}...`).start();
        // eslint-disable-next-line no-await-in-loop
        const result = await fixFile(file, { ...options, spinner });
        if (result.issues.length === 0) {
          spinner.succeed(`No issues found in ${chalk.cyan(file)}`);
        } else if (result.issues.length > 0) {
          if (result.accepted) {
            spinner.succeed(`Fixes applied to ${chalk.cyan(file)}`);
          } else {
            spinner.fail(`Fixes rejected for ${chalk.cyan(file)}`);
          }
        }
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

export async function fixFile(file: string, options: FixOptions = {}): Promise<FixFileResult> {
  const interactive = options.interactive ?? true;
  let issues = options.issues ?? [];

  try {
    const scan = issues.length === 0 && (isHtmlFile(file) || isUrl(file));
    if (scan) {
      debug(`Scanning for acessibility issues in '${file}'...`);
      const issueDetails = await scanIssues(file);
      issues = issueDetails.map((issue) => issue.help);
      if (interactive) {
        if (issues.length === 0) {
          options.spinner?.stop();
          debug(`No issues found in ${file}`);
          return { file, scanned: scan, issues, fixed: false };
        }

        if (options.spinner) {
          options.spinner.text = `Searching fixes for ${chalk.cyan(file)}...`;
        }
      }
    } else {
      debug(`Skipping scan for '${file}' (not an HTML file)`);
    }

    debug(`Searching fixes for '${file}'...`);
    const content = isUrl(file) ? await downloadPageUrl(file) : await fs.readFile(file, 'utf8');
    const { code, suggestion } = await suggestFix(file, content, issues, options);
    if (!suggestion) {
      debug(`No fix suggestion for '${file}'`);
      return { file, scanned: scan, issues, fixed: false };
    }

    if (interactive) {
      options.spinner?.stop();
      if (scan || issues.length > 0) {
        console.info(
          `${issues.length} issue${issues.length > 1 ? 's' : ''} ${scan ? 'found' : 'to fix'} in ${chalk.cyan(file)}:`
        );
        for (const issue of issues) {
          console.info(`  - ${chalk.red(issue)}`);
        }
      } else {
        console.info(`Skipped scan for ${chalk.cyan(file)} (not an HTML file), but found potential fixes:`);
      }

      console.info();
      const result = await interactiveFix(file, code, suggestion, options);
      return { file, scanned: scan, issues, fixed: true, accepted: result };
    }

    debug(`Suggested fix for '${file}':`);
    debug(generatePatchDiff(file, code, suggestion));
    const patchedContent = patchOriginalContent(file, content, code, suggestion);
    await fs.writeFile(file, patchedContent);

    debug(`Applied fix for '${file}'`);
    return { file, scanned: scan, issues, fixed: true, accepted: true };
  } catch (error: unknown) {
    let message = `Could not suggest or apply fix for '${file}': `;

    if (error instanceof HTTPError) {
      const details = JSON.parse((error.response.body as string) ?? '{}') as Record<string, any>;
      message += String(details?.error ?? error.message ?? error);
    } else {
      const error_ = error as Error;
      message = error_.message ?? error_;
    }

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
