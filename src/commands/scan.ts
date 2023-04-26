import path from 'node:path';
import process from 'node:process';
import chalk from 'chalk';
import createDebug from 'debug';
import ora from 'ora';
import { type AxeIssue, scanIssues } from '../axe.js';
import { isUrl, resolveFilesOrUrls } from '../util.js';

const debug = createDebug('scan');

export type ScanOptions = Record<string, unknown>;

export type ScanResult = {
  file: string;
  issues: AxeIssue[];
  skipped: boolean;
};

export async function scan(files: string[], options: ScanOptions = {}) {
  let spinner;
  try {
    files = await resolveFilesOrUrls(files);
    spinner = ora('Scanning files for issues...').start();
    const promises = files.map(async (file) => scanFile(file, options));
    const results = await Promise.all(promises);
    spinner.stop();
    for (const result of results) {
      if (result.issues.length > 0) {
        console.info(`${result.file}: ${result.issues.length} issues`);
        for (const issue of result.issues) {
          console.info(`  - ${chalk.red(issue.help)}`);
        }
      } else if (result.skipped) {
        console.info(`${chalk.dim(result.file)}: skipped (cannot scan for issues in non-HTML files)`);
      }
    }
  } catch (error: unknown) {
    spinner?.fail();
    const error_ = error as Error;
    console.error(error_.message);
    process.exitCode = 1;
  }
}

export async function scanFile(file: string, options: ScanOptions = {}): Promise<ScanResult> {
  try {
    if (!isUrl(file) && path.extname(file) !== '.html') {
      return { file, issues: [], skipped: true };
    }

    debug(`Scanning issues for '${file}'...`);
    const issues = await scanIssues(file);
    return { file, issues, skipped: false };
  } catch (error: unknown) {
    const error_ = error as Error;
    const message = `Could not scan issues for '${file}': ${error_.message ?? error_}`;
    debug(message);
    throw new Error(message);
  }
}
