import { got } from 'got';

const apiUrl = 'https://a11y.nubesgen.com';

export async function suggestFix(content: string) {
  const response = await got.post(apiUrl, { body: content });
  const suggestion = response.body;
  return suggestion.trim();
}
