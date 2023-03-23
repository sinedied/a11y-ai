import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import createDebug from 'debug';
import puppeteer from 'puppeteer';
import { pathExists, runCommand } from './util.js';

const debug = createDebug('axe');
const __dirname = dirname(fileURLToPath(import.meta.url));

export interface AxeIssue {
  id: string;
  impact: string;
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: Node[];
}

async function getChromeDriverPath() {
  const targetPath = 'node_modules/chromedriver/bin/chromedriver';
  let chromedriverPath = path.join(__dirname, '..', targetPath);
  if (!await pathExists(chromedriverPath)) {
    // Try one level up
    chromedriverPath = path.join(__dirname, '..', '..', targetPath);
  }
  if (!await pathExists(chromedriverPath)) {
    throw new Error('Could not find chromedriver');
  }
  debug('chromedriver path: %s', chromedriverPath);
  return chromedriverPath;
}

function getChromePath() {
  const chromePath = puppeteer.executablePath();
  debug('chrome path: %s', chromePath);
  return chromePath;
}

export async function scanIssues(file: string): Promise<AxeIssue[]> {
  try {
    const inputFilePath = `file://${path.resolve(file)}`;
    process.env['CHROME_BIN'] = getChromePath();
    const command = `axe --chromedriver-path ${await getChromeDriverPath()} --stdout ${inputFilePath}`;
    debug(`Running axe command: ${command}`);
    const results = await runCommand(command);
    const json = JSON.parse(results);
    const issues = json[0].violations;
    debug(`Found ${issues.length} issues`);
    return issues as AxeIssue[];
  } catch (error: unknown) {
    const error_ = error as Error;
    const message = `Error while running axe: ${error_.message ?? error_}`;
    debug(message);
    throw new Error(message);
  }
}
