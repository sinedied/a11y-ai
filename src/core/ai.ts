import process from 'node:process';
import { got } from 'got';
import createDebug from 'debug';
import { HTTPError } from 'got';
import { apiUrl } from '../constants.js';
import { applyPatchDiff } from '../util/index.js';
import { preprocessInput } from './preprocess.js';

const debug = createDebug('ai');

const rateLimitRegex = /rate limit.*?Please retry after (\d+) seconds/mi;
const timeoutRegex = /The operation was timeout/mi;

export type FixSettings = {
  context?: string;
  outputDiff?: boolean;
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

  const chunks = preprocessInput(file, code);
  debug(`Preprocessed input into ${chunks.length} chunk(s)`);

  const suggestions: string[] = [];
  const patches: string[] | undefined = outputDiff ? [] : undefined;
  
  // Serialize the requests to avoid hitting the rate limit, even though it's (way) slower
  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    debug(`Requesting fix for chunk ${index + 1}/${chunks.length}`);

    let chunkContext = context;
    // if (chunks.length > 1) {
    //   chunkContext = context ? `${context}\n` : '';
    //   chunkContext += `The code has been split into  ${chunks.length} chunks, and this is chunk ${index + 1}. `;
    //   chunkContext += `Do not fix unclosed tags in this chunk, as it will be merged with the other chunks later.`;
    // }

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
    
    debug(`Should apply patch diff: ${outputDiff}`);
    const chunkSuggestion = applyPatchDiff(chunks[index].code, json?.sourceCode, outputDiff);

    // debug(`Suggestion for chunk ${index}:\n${chunkSuggestion}`);
    suggestions.push(chunkSuggestion);
  }

  const result = {
    code: chunks.map(chunk => chunk.code).join(''),
    suggestion: suggestions.join(''),
    patches: patches
  }

  return result;
}

async function retryWithinLimits<T>(fn: () => Promise<T>, maxRetries = 3) {
  let retries = 0;
  let result: T | undefined;
  let requestError: Error | undefined;

  while (retries < maxRetries) {
    try {
      result = await fn();
      break;
    } catch (error) {
      requestError = error as Error;
      retries++;

      if (error instanceof HTTPError) {
        const details = JSON.parse((error.response.body as string) ?? '{}') as Record<string, any>;
        const innerError = details?.error ?? '';

        // Check if we hit a rate limit
        const rateLimitMatch = innerError.match(rateLimitRegex);
        if (rateLimitMatch) {
          const retryDelay = Number(rateLimitMatch[1]);
          debug(`Hit rate limit, retrying in ${retryDelay} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, (retryDelay + 1) * 1000));
          continue;
        }

        // Check if we hit a timeout
        const timeoutMatch = innerError.match(timeoutRegex);
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
    throw requestError;
  }

  return result;
}
