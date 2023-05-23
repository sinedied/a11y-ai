import path from 'node:path';
import process from 'node:process';
import chalk from 'chalk';
import createDebug from 'debug';
import ora from 'ora';
import { type AxeIssue, scanIssues } from '../core/index.js';
import { isHtmlFile, isUrl, resolveFilesOrUrls } from '../util/index.js';

const debug = createDebug('scan');

export type ScanOptions = {
  format?: 'text' | 'json';
};

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
    console.info(formatScanResults(results, options));
  } catch (error: unknown) {
    spinner?.fail();
    const error_ = error as Error;
    console.error(error_.message);
    process.exitCode = 1;
  }
}

export function formatScanResults(results: ScanResult[], options: ScanOptions = {}): string {
  if (options.format === 'json') {
    return JSON.stringify(results, null, 2);
  }

  let output = '';
  for (const result of results) {
    if (result.issues.length > 0) {
      output += `${result.file}: ${result.issues.length} issues\n`;
      for (const issue of result.issues) {
        output += `  - ${chalk.red(issue.help)}\n`;
      }
    } else if (result.skipped) {
      output += `${chalk.dim(result.file)}: skipped (cannot scan for issues in non-HTML files)\n`;
    }
  }
  return output;
}

export async function scanFile(file: string, options: ScanOptions = {}): Promise<ScanResult> {
  try {
    if (!isUrl(file) && !isHtmlFile(file)) {
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
