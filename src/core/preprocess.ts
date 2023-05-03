import createDebug from 'debug';
import { encoding_for_model } from '@dqbd/tiktoken';
import { maxChunkTokenSize } from '../constants.js';

const debug = createDebug('preprocess');

export type InputChunk = {
  code: string;
  tokens: number;
};

export function preprocessInput(file: string, code: string, maxTokens: number = maxChunkTokenSize): InputChunk[] {
  let newCode = code;
  let tokens = countTokens(code);
  debug(`Input tokens before preprocessing: ${tokens} (max chunk size: ${maxTokens})`);

  newCode = removeScriptTags(code);
  tokens = countTokens(newCode);
  debug(`Input tokens after removing scripts: ${tokens}`);

  newCode = removeEmptyLines(newCode);
  tokens = countTokens(newCode);
  debug(`Input tokens after removing empty lines: ${tokens}`);

  if (tokens <= maxTokens) {
    return [
      {
        code: newCode,
        tokens
      }
    ];
  }

  // Chunk input into multiple parts
  const chunks = splitInput(newCode, maxTokens).map((chunk) => {
    return {
      code: chunk,
      tokens: countTokens(chunk)
    };
  });
  debug(
    `Input split into ${chunks.length} chunks with token lengths: ${chunks.map((chunk) => chunk.tokens).join(', ')}`
  );
  return chunks;
}

export function splitInput(input: string, maxTokens: number): string[] {
  let remainingInput = input;
  const chunks: string[] = [];

  do {
    const tokens = countTokens(remainingInput);
    const remainingChunks = Math.ceil(tokens / maxTokens);
    const maxIndex =
      remainingChunks === 1 ? remainingInput.length : Math.floor(remainingInput.length / remainingChunks);
    const splitIndex = remainingChunks === 1 ? remainingInput.length : remainingInput.lastIndexOf('<', maxIndex);

    if (splitIndex <= 0) {
      const message = `Error, could not split input into chunks: HTML contains elements with too many tokens`;
      debug(message);
      throw new Error(message);
    }

    const chunk = remainingInput.slice(0, splitIndex);
    chunks.push(chunk);
    remainingInput = remainingInput.slice(splitIndex);
  } while (remainingInput.length > 0);

  return chunks;
}

export function checkTokenLimits(content: string, maxToken: number): boolean {
  return content.length <= maxToken;
}

export function countTokens(content: string): number {
  const encoder = encoding_for_model('gpt-4');
  const tokens = encoder.encode(content);
  encoder.free();
  return tokens.length;
}

export function removeScriptTags(content: string): string {
  return content.replace(/<script[\s\S]*?<\/script>/gi, '<!-- script removed -->');
}

export function removeEmptyLines(content: string): string {
  return content; // .replace(/^\s*[\r\n]/gm, '');
}
