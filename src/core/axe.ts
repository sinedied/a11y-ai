import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import createDebug from 'debug';
import { isHtmlPartial, isUrl, pathExists, runCommand } from '../util/index.js';

const debug = createDebug('axe');
const __dirname = dirname(fileURLToPath(import.meta.url));
const urlEnvProperty = 'A11Y_AI_URL';
const configPath = path.resolve(__dirname, '../../scan/playwright.config.cjs');
const issuesRegex = /===ISSUES_BEGIN===\n([\s\S]*?)===ISSUES_END===/m;

export type AxeIssue = {
  id: string;
  impact: string;
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: Node[];
};

export async function scanIssues(file: string): Promise<AxeIssue[]> {
  try {
    const isFileUrl = isUrl(file);
    const inputFilePath = isFileUrl ? file : `file://${path.resolve(file)}`;



    // TODO!!!!!
    // const isPartial = !isFileUrl && (await isHtmlPartial(file));
    // if (isPartial) {
    //   // Disable rules that require a full HTML document
    //   axeOptions.push('--disable html-has-lang,document-title,landmark-one-main,region,page-has-heading-one');
    // }

    const command = `npx playwright test --config "${configPath}"`;
    debug(`Running command: ${command}`);
    const stdout = await runCommand(command, { [urlEnvProperty]: inputFilePath }, true);
    const issues = getViolationFromOutput(stdout);
    debug(`Found ${issues.length} issues`);
    debug('Issues details: %o', issues);
    return issues;
  } catch (error: unknown) {
    const error_ = error as Error;
    const message = `Error while running axe scan: ${error_.message ?? error_}`;
    debug(message);
    throw new Error(message);
  }
}

function getViolationFromOutput(output: string): AxeIssue[] {
  const match = issuesRegex.exec(output);
  if (!match) {
    console.log(output);
    throw new Error('Could not find issues in command output');
  }
  const rawIssues = match[1];
  const issues = JSON.parse(rawIssues) as AxeIssue[];
  return issues;
}
