import process from 'node:process';
import { got } from 'got';
import createDebug from 'debug';
import { apiUrl } from './constants.js';
import { applyPatchDiff } from './diff.js';
import { isUrl } from './util.js';

const debug = createDebug('ai');

export type FixSettings = {
  context?: string;
  outputDiff?: boolean;
};

export type FixResponse = {
  sourceCode: string;
};

export async function suggestFix(file: string, code: string, issues: string[] = [], options: FixSettings = {}) {
  // const isFileUrl = isUrl(file);
  const outputDiff = options.outputDiff ?? false;
  const url = process.env.A11Y_API_URL ?? apiUrl;
  debug(`Using a11y API URL: ${url}`);

  const response = await got.post(`${url}/a11y/fix`, {
    json: {
      // ...(isFileUrl ? { sourceUrl: file } : { sourceCode: code }),
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
