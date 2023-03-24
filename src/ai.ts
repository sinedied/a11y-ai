import process from 'node:process';
import { got } from 'got';
import createDebug from 'debug';
import { apiUrl } from './constants.js';

const debug = createDebug('ai');

export type FixResponse = {
  sourceCode: string;
};

export async function suggestFix(code: string, issues: string[] = []) {
  const url = process.env.A11Y_API_URL ?? apiUrl;
  debug(`Using a11y API URL: ${url}`);

  const response = await got.post(`${url}/a11y/fix`, {
    json: {
      sourceCode: code,
      issues: issues?.length > 0 ? issues : undefined
    }
  });
  const json = JSON.parse(response.body) as FixResponse;
  const suggestion = json?.sourceCode;
  return suggestion;
}
