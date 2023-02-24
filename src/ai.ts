import { got } from 'got';
import { apiUrl } from './constants.js';

export async function suggestFix(content: string) {
  const response = await got.post(apiUrl, { body: content });
  const suggestion = response.body;
  return suggestion.trim();
}
