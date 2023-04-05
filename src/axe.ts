import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import createDebug from 'debug';
// import puppeteer from 'puppeteer';
import { isHtmlPartial, pathExists, runCommand } from './util.js';

const debug = createDebug('axe');
const __dirname = dirname(fileURLToPath(import.meta.url));

export type AxeIssue = {
  id: string;
  impact: string;
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: Node[];
};

async function getChromeDriverPath() {
  const targetPath = 'node_modules/chromedriver/bin/chromedriver';
  let chromedriverPath = path.join(__dirname, '..', targetPath);
  if (!(await pathExists(chromedriverPath))) {
    // Try one level up
    chromedriverPath = path.join(__dirname, '..', '..', targetPath);
  }

  if (!(await pathExists(chromedriverPath))) {
    throw new Error('Could not find chromedriver');
  }

  debug('chromedriver path: %s', chromedriverPath);
  return chromedriverPath;
}

// function getChromePath() {
//   const chromePath = puppeteer.executablePath();
//   debug('chrome path: %s', chromePath);
//   return chromePath;
// }

export async function scanIssues(file: string): Promise<AxeIssue[]> {
  try {
    const inputFilePath = `file://${path.resolve(file)}`;

    // TODO: not working! find a way to make Axe use this binary
    // process.env.CHROME_BIN = getChromePath();

    const axeOptions = [
      `--chromedriver-path "${await getChromeDriverPath()}"`,
      '--stdout'
    ];

    const isPartial = await isHtmlPartial(file);
    if (isPartial) {
      // Disable rules that require a full HTML document
      axeOptions.push('--disable html-has-lang,document-title,landmark-one-main,region,page-has-heading-one');
    }

    const command = `axe ${axeOptions.join(' ')} "${inputFilePath}"`;
    debug(`Running axe command: ${command}`);
    const results = await runCommand(command);
    const json = JSON.parse(results) as Record<string, any>;
    const issues = json[0].violations as AxeIssue[];
    debug(`Found ${issues.length} issues`);
    debug('Issues details: %o', issues);
    return issues;
  } catch (error: unknown) {
    const error_ = error as Error;
    const message = `Error while running axe: ${error_.message ?? error_}`;
    debug(message);
    throw new Error(message);
  }
}
