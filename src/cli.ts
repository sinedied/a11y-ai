import process from 'node:process';
import dns from 'node:dns';
import chalk from 'chalk';
import debug from 'debug';
import updateNotifier from 'update-notifier';
import minimist from 'minimist';
import { fix, report, scan } from './commands/index.js';
import { getPackageJson } from './util.js';

dns.setDefaultResultOrder('ipv4first');

const help = `${chalk.bold('Usage:')} a11y <command> <files_or_urls> [options]

If no files are specified, it will scan the current directory and
subdirectories for HTML files.

${chalk.bold('Commands:')}
  s, scan                 Scan files or URLs for accessibility issues

  f, fix                  Fix accessibility issues interactively
    -i, --issues <issues> Comma-separated list of issues to fix (disable scan)
    -c, --char-diff       Use character diff instead of patch-like diff
    -y, --yes             Apply fixes without prompting
    --context <context>   Provide additional context
    --gpt-diff            Make AI generate diff of fixes (experimental)

  r, report               Generate a report of issues with fix suggestions
    -i, --issues <issues> Comma-separated list of issues to fix (disable scan)
    -o, --format <format> Report format [html, md] (default: html)
    --context <context>   Provide additional context
    --gpt-diff            Make AI generate diff of fixes (experimental)

${chalk.bold('General options:')}
  --api                   Use specified API URL
  --verbose               Show detailed logs
  --help                  Show this help
`;

export async function run(args: string[]) {
  const options = minimist(args, {
    string: ['format', 'api', 'issues', 'context'],
    boolean: ['yes', 'verbose', 'version', 'help', 'char-diff', 'gpt-diff'],
    alias: {
      y: 'yes',
      c: 'char-diff',
      i: 'issues',
      o: 'format',
      v: 'version'
    }
  });

  const pkg = await getPackageJson();
  // Check for updates at every run during alpha phase
  updateNotifier({ pkg: pkg as any, updateCheckInterval: 0 }).notify();

  if (options.version) {
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

  if (options.api) {
    process.env.A11Y_API_URL = (options.api && options.api !== '' ? options.api : process.env.A11Y_API_URL) as string;
  }

  const [command, ...filesOrUrls] = options._;

  switch (command) {
    case undefined:
    case 'f':
    case 'fix': {
      await fix(filesOrUrls, {
        interactive: !options.fix,
        patchDiff: !options['char-diff'],
        issues: options.issues?.split(','),
        context: options.context,
        outputDiff: Boolean(options['gpt-diff']),
      });
      break;
    }

    case 's':
    case 'scan': {
      await scan(filesOrUrls);
      break;
    }

    case 'r':
    case 'report': {
      await report(filesOrUrls, {
        format: options.format as 'html' | 'md',
        issues: options.issues?.split(','),
        context: options.context,
        outputDiff: Boolean(options['gpt-diff']),
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
