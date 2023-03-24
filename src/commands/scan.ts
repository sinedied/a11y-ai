import process from 'node:process';
import chalk from 'chalk';
import createDebug from 'debug';
import ora from 'ora';
import { type AxeIssue, scanIssues } from '../axe.js';

const debug = createDebug('scan');

export type ScanOptions = Record<string, unknown>;

export type ScanResult = {
  file: string;
  issues: AxeIssue[];
};

export async function scan(files: string[], options: ScanOptions = {}) {
  let spinner;
  try {
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
    debug(`Scanning issues for '${file}'...`);
    const issues = await scanIssues(file);
    return { file, issues };
  } catch (error: unknown) {
    const error_ = error as Error;
    const message = `Could not scan issues for '${file}': ${error_.message ?? error_}`;
    debug(message);
    throw new Error(message);
  }
}
