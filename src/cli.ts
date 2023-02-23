import process from 'node:process';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import debug from 'debug';
import glob from 'fast-glob';
import minimist from 'minimist';
import { fixFiles } from './fix.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const help = `Usage: a11y <files> [options]

Options:
  -f, --fix             Automatically apply fixes suggestions
  -l, --patch-diff      Use patch-like diff instead of character diff
  --verbose             Show detailed logs
  --help                Show this help
`;

export async function run(args: string[]) {
  const options = minimist(args, {
    boolean: ['fix', 'verbose', 'version', 'help', 'patch-diff'],
    alias: {
      v: 'version',
      b: 'fix',
      p: 'patch-diff'
    }
  });

  if (options.version) {
    const file = fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8');
    const pkg = JSON.parse(file) as Record<string, string>;
    console.info(pkg.version);
    return;
  }

  if (options.help) {
    console.info(help);
    return;
  }

  if (options.verbose) {
    debug.enable('*');
  }

  const filesOrGlobs = options._.length > 0 ? options._ : ['**/*.html'];
  const files = await glob(filesOrGlobs, {
    dot: true,
    ignore: ['**/node_modules/**']
  });

  if (files.length === 0) {
    console.error('No files found');
    process.exitCode = 1;
    return;
  }

  await fixFiles(files, {
    interactive: !options.fix,
    patchDiff: Boolean(options['patch-diff'])
  });
}
