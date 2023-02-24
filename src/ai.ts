import { got } from 'got';
import { API_URL } from './constants.js';

export async function suggestFix(content: string) {
  const response = await got.post(API_URL, { body: content });
  const suggestion = response.body;
  return suggestion.trim();
}
