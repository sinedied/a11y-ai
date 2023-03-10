import chalk from 'chalk';
import { createPatch, diffChars } from 'diff';

export function generateColoredDiff(content: string, suggestion: string) {
  const diff = diffChars(content, suggestion);
  let coloredDiff = '';
  for (const part of diff) {
    if (part.added) {
      coloredDiff += chalk.green(part.value);
    } else if (part.removed) {
      coloredDiff += chalk.red(part.value);
    } else {
      coloredDiff += part.value;
    }
  }

  return coloredDiff.trim();
}

export function generatePatchDiff(file: string, content: string, suggestion: string, colors = true) {
  let diff = createPatch(file, content, suggestion);
  // Remove header
  diff = diff
    .split(/={10,}/)
    .slice(1)
    .join('')
    .trim();

  if (colors) {
    diff = diff
      .split('\n')
      .map((line) => {
        switch (line[0]) {
          case '+': {
            return line.startsWith('+++') ? line : chalk.green(line);
          }

          case '-': {
            return line.startsWith('---') ? line : chalk.red(line);
          }

          case '@': {
            return chalk.cyan(line);
          }

          case '\\': {
            return chalk.dim(line);
          }

          default: {
            return line;
          }
        }
      })
      .join('\n')
      .trim();
  }

  return diff;
}
