import path from 'node:path';
import fs from 'node:fs/promises';
import process from 'node:process';
import createDebug from 'debug';
import chalk from 'chalk';
import AnsiToHtml from 'ansi-to-html';
import ora from 'ora';
import { HTTPError } from 'got';
import { scanIssues, suggestFix } from '../core/index.js';
import {
  generatePatchDiff,
  getPackageJson,
  escapeForHtml,
  resolveFilesOrUrls,
  isUrl,
  downloadPageUrl
} from '../util/index.js';
import { reportOutputFilename } from '../constants.js';

const debug = createDebug('report');

export type ReportOptions = {
  format?: 'html' | 'md';
  issues?: string[];
  context?: string;
  outputDiff?: boolean;
  chunkSize?: number;
};

export type FileReport = {
  file: string;
  issues: string[];
  suggestion?: string;
  patch?: string;
  rawPatch?: string;
};

export type ReportResult = {
  reports: FileReport[];
  outputFile: string;
  contents: string;
};

export async function report(files: string[], options: ReportOptions = {}): Promise<ReportResult | undefined> {
  const format = options.format === 'md' ? 'md' : 'html';
  let spinner;
  try {
    files = await resolveFilesOrUrls(files);
    spinner = ora('Generating report...').start();
    // Force color output for HTML report
    const oldLevel = chalk.level;
    chalk.level = 1;
    const promises = files.map(async (file) => reportFile(file, options));
    const reports = await Promise.all(promises);

    const contents = format === 'md' ? await generateMarkdownReport(reports) : await generateHtmlReport(reports);
    const outputFile = reportOutputFilename + `.${format}`;

    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, contents);

    chalk.level = oldLevel;
    spinner.succeed(`Generated report to ${chalk.cyan(outputFile)}`);
    return {
      reports,
      outputFile,
      contents
    };
  } catch (error: unknown) {
    spinner?.fail();
    const error_ = error as Error;
    console.error(error_.message);
    process.exitCode = 1;
  }
}

export async function generateHtmlReport(reports: FileReport[]) {
  const ansiToHtml = new AnsiToHtml({
    fg: '#000',
    colors: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      2: '#070',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      6: '#077'
    }
  });
  const pkg = await getPackageJson();
  const repoUrl = pkg.repository.url as string;

  let html =
    '<!doctype html><html><head><meta charset="utf-8"><title>Accessibility Suggestions Report</title><style>*{box-sizing:border-box}html{margin: 10px}</style></head><body>';
  html += '<h1>Accessibility Suggestions Report</h1>';
  html += `<em>Generated by <a href="${repoUrl}">a11y-ai</a> on ${new Date().toLocaleString()}</em>`;

  for (const report of reports) {
    if (report.suggestion !== undefined && report.patch !== undefined) {
      html += `<hr>`;
      html += `<h3>Report for <code>${report.file}</code></h3>`;
      html += `<h4>Issues</h4>`;

      if (report.issues.length === 0) {
        html += '<p>No issues found</p>';
      } else {
        html += '<ul>';
        for (const issue of report.issues) {
          html += `<li>${escapeForHtml(issue)}</li>`;
        }

        html += '</ul>';
        html += `<h4>Suggested fixes</h4>`;
        html += '<details><summary>Raw suggestion</summary>';
        html += `<pre><textarea rows="5" style="width:100%">${escapeForHtml(
          report.suggestion
        )}</textarea></pre></details>`;
        html += `<p><pre>${ansiToHtml.toHtml(escapeForHtml(report.patch))}</pre></p>`;
      }
    }
  }

  return html;
}

export async function generateMarkdownReport(reports: FileReport[]) {
  const pkg = await getPackageJson();
  const repoUrl = pkg.repository.url as string;

  let md = '# Accessibility Suggestions Report\n';
  md += `_Generated by [a11y-ai](${repoUrl}) on ${new Date().toLocaleString()}_\n\n`;

  for (const report of reports) {
    if (report.suggestion !== undefined && report.rawPatch !== undefined) {
      md += `---\n\n`;
      md += `### Report for \`${report.file}\`\n\n`;
      md += `#### Issues\n\n`;

      if (report.issues.length === 0) {
        md += 'No issues found\n\n';
      } else {
        md += report.issues.map((issue) => `- ${escapeForHtml(issue)}`).join('\n');
        md += '\n\n';
        md += `#### Suggested fixes for \`${report.file}\`\n\n`;
        md += '<details><summary>Raw suggestion</summary>';
        md += `<pre><textarea rows="5" style="width:100%">${escapeForHtml(
          report.suggestion
        )}</textarea></pre></details>\n\n`;
        md += `\`\`\`diff\n${report.rawPatch}\n\`\`\`\n\n`;
      }
    }
  }

  return md;
}

export async function reportFile(file: string, options: ReportOptions = {}): Promise<FileReport> {
  try {
    let issues = options.issues ?? [];
    const scan = issues.length === 0 && (path.extname(file) === '.html' || isUrl(file));
    if (scan) {
      debug(`Scanning for acessibility issues in '${file}'...`);
      const issueDetails = await scanIssues(file);
      issues = issueDetails.map((issue) => issue.help);
      if (issues.length === 0) {
        debug(`No issues found in ${file}`);
        return { file, issues };
      }
    } else {
      debug(`Using provided issues for '${file}'`);
    }

    debug(`Searching fixes for '${file}'...`);
    const content = isUrl(file) ? await downloadPageUrl(file) : await fs.readFile(file, 'utf8');
    const { code, suggestion } = await suggestFix(file, content, issues, options);
    if (!suggestion) {
      debug(`No fix suggestion for '${file}'`);
      return { file, issues };
    }

    debug(`Suggested fix for '${file}':`);
    const patch = generatePatchDiff(file, code, suggestion);
    const rawPatch = generatePatchDiff(file, code, suggestion, false);
    debug(patch);
    return { file, issues, suggestion, patch, rawPatch };
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
