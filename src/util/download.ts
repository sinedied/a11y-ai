import { got } from 'got';

export async function downloadPageUrl(url: string): Promise<string> {
  const response = await got(url);
  // Const response = await (await fetch(url)).text();
  return response.body;
}
