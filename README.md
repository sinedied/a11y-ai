# :robot: a11y-ai

[![NPM version](https://img.shields.io/npm/v/a11y-ai.svg)](https://www.npmjs.com/package/a11y-ai)
[![Build Status](https://github.com/sinedied/a11y-ai/workflows/build/badge.svg)](https://github.com/sinedied/a11y-ai/actions)
![Node version](https://img.shields.io/node/v/a11y-ai.svg)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Experimental tool to automatically detect accessibility issues in web pages using OpenAI and provide suggestions for fixing them.

![a11y-ai portrait by another AI](https://user-images.githubusercontent.com/593151/221144683-af658535-500b-4024-afe9-032526b3eec9.png)

*Can I help fixing your a11y issues?*

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

If no files are specified, it will scan the current directory and
subdirectories for HTML files.

Options:
  -f, --fix             Automatically apply fixes suggestions
  -l, --patch-diff      Use patch-like diff instead of character diff
  -r, --report          Generate a report instead of fixing files
  --verbose             Show detailed logs
  --help                Show this help
```
