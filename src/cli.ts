import process from 'node:process';
import debug from 'debug';
import glob from 'fast-glob';
import minimist from 'minimist';
import { fix, report } from './commands/index.js';
import { getPackageJson } from './util.js';
import { reportOutputFile } from './constants.js';

const help = `Usage: a11y <files> [options]

If no files are specified, it will scan the current directory and
subdirectories for HTML files.

Options:
  -f, --fix             Automatically apply fixes suggestions
  -l, --patch-diff      Use patch-like diff instead of character diff
  -r, --report          Generate a report instead of fixing files
  --verbose             Show detailed logs
  --help                Show this help
`;

export async function run(args: string[]) {
  const options = minimist(args, {
    boolean: ['fix', 'verbose', 'version', 'help', 'patch-diff', 'report'],
    alias: {
      f: 'fix',
      p: 'patch-diff',
      r: 'report',
      v: 'version'
    }
  });

  if (options.version) {
    const pkg = await getPackageJson();
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
    ignore: ['**/node_modules/**', reportOutputFile]
  });

  if (files.length === 0) {
    console.error('No files found');
    process.exitCode = 1;
    return;
  }

  if (options.report) {
    await report(files);
  } else {
    await fix(files, {
      interactive: !options.fix,
      patchDiff: Boolean(options['patch-diff'])
    });
  }
}
