# :robot: a11y-ai

[![NPM version](https://img.shields.io/npm/v/a11y-ai.svg)](https://www.npmjs.com/package/a11y-ai)
[![Build Status](https://github.com/sinedied/a11y-ai/workflows/build/badge.svg)](https://github.com/sinedied/a11y-ai/actions)
![Node version](https://img.shields.io/node/v/a11y-ai.svg)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Experimental tool to automatically detect accessibility issues in web pages and provide suggestions for fixing them.

## Quickstart

Run it directly on your project without installing it:

```bash
npx a11y-ai
```

It will scan for all HTML files in the current directory and subdirectories, and will interactively ask you to apply each suggestions found.

## Installation

```bash
npm install -g a11y-ai
```

## Usage

```
Usage: a11y-ai [<files>] [options]

Options:
  -f, --fix             Automatically apply fixes suggestions
  --no-color            Disable color output
  --verbose             Show detailed logs
  --help                Show this help
```
