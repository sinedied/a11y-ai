import { got } from 'got';

export async function downloadPageUrl(url: string): Promise<string> {
  const response = await got(url);
  return response.body;
}
