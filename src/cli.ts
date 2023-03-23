import process from 'node:process';
import debug from 'debug';
import glob from 'fast-glob';
import minimist from 'minimist';
import { fix, report, scan } from './commands/index.js';
import { getPackageJson } from './util.js';
import { reportOutputFilename } from './constants.js';

const help = `Usage: a11y <command> <files> [options]

If no files are specified, it will scan the current directory and
subdirectories for HTML files.

Commands:
  s, scan     Scan files for accessibility issues
  f, fix      Fix accessibility issues interactively
    -y, --yes        Apply fixes without prompting
    -c, --char-diff  Use character diff instead of patch-like diff
  r, report   Generate a report of issues and fix suggestions
    -o, --format <format> Report format [html, md] (default: html)

General options:
  --verbose             Show detailed logs
  --help                Show this help
`;

export async function run(args: string[]) {
  const options = minimist(args, {
    string: ['format'],
    boolean: ['yes', 'verbose', 'version', 'help', 'char-diff'],
    alias: {
      y: 'yes',
      c: 'char-diff',
      o: 'format',
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
    debug.enable('*,-puppeteer:*');
  }

  const [command, ...files] = options._;
  const filesOrGlobs = files.length > 0 ? files : ['**/*.html'];
  const resolvedFiles = await glob(filesOrGlobs, {
    dot: true,
    ignore: ['**/node_modules/**', `${reportOutputFilename}.*`]
  });

  if (resolvedFiles.length === 0) {
    console.error('No files found');
    process.exitCode = 1;
    return;
  }

  switch (command) {
    case undefined:
    case 'f':
    case 'fix': {
      await fix(resolvedFiles, {
        interactive: !options.fix,
        patchDiff: !options['char-diff']
      });
      break;
    }

    case 's':
    case 'scan': {
      await scan(resolvedFiles);
      break;
    }

    case 'r':
    case 'report': {
      await report(resolvedFiles, {
        format: options.format as 'html' | 'md'
      });
      break;
    }

    default: {
      console.error(`Unknown command: ${command}`);
      process.exitCode = 1;
      console.info(help);
    }
  }
}
