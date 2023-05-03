import process from 'node:process';
import { got, HTTPError } from 'got';
import createDebug from 'debug';
import { apiUrl, maxChunkTokenSize } from '../constants.js';
import { applyPatchDiff } from '../util/index.js';
import { preprocessInput } from './preprocess.js';

const debug = createDebug('ai');

const rateLimitRegex = /rate limit.*?please retry after (\d+) seconds/im;
const timeoutRegex = /the operation was timeout/im;

export type FixSettings = {
  context?: string;
  outputDiff?: boolean;
  chunkSize?: number;
};

export type FixResponse = {
  sourceCode: string;
};

export type FixResult = {
  code: string;
  suggestion: string;
  patches?: string;
};

export async function suggestFix(file: string, code: string, issues: string[] = [], options: FixSettings = {}) {
  const outputDiff = options.outputDiff ?? false;
  const context = options.context ?? undefined;
  const url = process.env.A11Y_API_URL ?? apiUrl;
  debug(`Using a11y API URL: ${url}`);

  const chunks = preprocessInput(file, code, options.chunkSize ?? maxChunkTokenSize);
  debug(`Preprocessed input into ${chunks.length} chunk(s)`);

  const suggestions: string[] = [];
  const patches: string[] | undefined = outputDiff ? [] : undefined;
  const now = Date.now();

  // Serialize the requests to avoid hitting the rate limit, even though it's (way) slower
  for (let index = 0; index < chunks.length; index++) {
    const startTime = Date.now();
    const chunk = chunks[index];
    debug(`Requesting fix for chunk ${index + 1}/${chunks.length}`);

    const chunkContext = context;
    // If (chunks.length > 1) {
    //   chunkContext = context ? `${context}\n` : '';
    //   chunkContext += `The code has been split into  ${chunks.length} chunks, and this is chunk ${index + 1}. `;
    //   chunkContext += `Do not fix unclosed tags in this chunk, as it will be merged with the other chunks later.`;
    // }

    // eslint-disable-next-line no-await-in-loop
    const response = await retryWithinLimits(async () => {
      return got.post(`${url}/a11y/fix`, {
        json: {
          sourceCode: chunk.code,
          issues: issues?.length > 0 ? issues : undefined,
          context: chunkContext ?? undefined,
          onlyProvidedIssues: true,
          outputDiff
        }
      });
    });

    const json = JSON.parse(response.body) as FixResponse;
    debug(`Received response from API:`);
    debug(json);

    if (outputDiff) {
      patches?.push(chunks[index].code);
    }

    debug(`Should apply patch diff: ${String(outputDiff)}`);
    const chunkSuggestion = applyPatchDiff(chunks[index].code, json?.sourceCode, outputDiff);

    // Debug(`Suggestion for chunk ${index}:\n${chunkSuggestion}`);
    suggestions.push(chunkSuggestion);

    debug(`Chunk ${index + 1}/${chunks.length} took ${(Date.now() - startTime) / 1000}s to process`);
  }

  debug(`Received ${suggestions.length} suggestion(s) in ${(Date.now() - now) / 1000}s`);

  const result = {
    code: chunks.map((chunk) => chunk.code).join(''),
    suggestion: suggestions.join(''),
    patches
  };

  return result;
}

async function retryWithinLimits<T>(fn: () => Promise<T>, maxRetries = 3) {
  let retries = 0;
  let result: T | undefined;
  let requestError: Error | undefined;

  while (retries < maxRetries) {
    try {
      // eslint-disable-next-line no-await-in-loop
      result = await fn();
      break;
    } catch (error: unknown) {
      requestError = error as Error;
      retries++;

      if (error instanceof HTTPError) {
        const details = JSON.parse((error.response.body as string) ?? '{}') as Record<string, any>;
        const innerError = (details?.error as string) ?? '';

        // Check if we hit a rate limit
        const rateLimitMatch = rateLimitRegex.exec(innerError);
        if (rateLimitMatch) {
          const retryDelay = Number(rateLimitMatch[1]);
          debug(`Hit rate limit, retrying in ${retryDelay} seconds...`);
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => {
            setTimeout(resolve, (retryDelay + 1) * 1000);
          });
          continue;
        }

        // Check if we hit a timeout
        const timeoutMatch = timeoutRegex.exec(innerError);
        if (timeoutMatch) {
          debug(`Hit timeout, retrying...`);
          continue;
        }
      }

      debug(`Hit error that is not a rate limit or timeout, giving up`);
      throw error;
    }
  }

  if (!result) {
    throw requestError!;
  }

  return result;
}
