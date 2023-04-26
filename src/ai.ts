import process from 'node:process';
import { got } from 'got';
import createDebug from 'debug';
import { apiUrl } from './constants.js';
import { applyPatchDiff } from './diff.js';

const debug = createDebug('ai');

export type FixSettings = {
  context?: string;
  outputDiff?: boolean;
};

export type FixResponse = {
  sourceCode: string;
};

export async function suggestFix(code: string, issues: string[] = [], options: FixSettings = {}) {
  const outputDiff = options.outputDiff ?? false;
  const url = process.env.A11Y_API_URL ?? apiUrl;
  debug(`Using a11y API URL: ${url}`);

  const response = await got.post(`${url}/a11y/fix`, {
    json: {
      sourceCode: code,
      issues: issues?.length > 0 ? issues : undefined,
      context: options.context ?? undefined,
      onlyProvidedIssues: true,
      outputDiff
    }
  });
  const json = JSON.parse(response.body) as FixResponse;
  const suggestion = applyPatchDiff(code, json?.sourceCode, outputDiff);
  return suggestion;
}
