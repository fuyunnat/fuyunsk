#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const result = spawnSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
  cwd: root,
  encoding: 'utf8',
});

if (result.status !== 0) {
  throw new Error(`Unable to list Git-visible files:\n${(result.stderr || result.stdout || '').trim()}`);
}

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
];

function assertLocalMarkdownLinks(relPath, content) {
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = match[1].trim();
    if (target.startsWith('<') && target.endsWith('>')) {
      target = target.slice(1, -1);
    }
    if (!target || target.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(target)) {
      continue;
    }

    let fileTarget;
    try {
      fileTarget = decodeURIComponent(target.split('#')[0]);
    } catch {
      throw new Error(`Invalid encoded Markdown link in ${relPath}: ${target}`);
    }
    if (fileTarget && !fs.existsSync(path.resolve(root, path.dirname(relPath), fileTarget))) {
      throw new Error(`Broken local Markdown link in ${relPath}: ${target}`);
    }
  }
}

for (const relPath of result.stdout.split('\0').filter(Boolean)) {
  if (/(^|\/)(?:node_modules|dist|build|coverage)(\/|$)|(^|\/)\.DS_Store$/.test(relPath)) {
    throw new Error(`Unexpected generated or dependency path: ${relPath}`);
  }

  const fullPath = path.join(root, relPath);
  const stat = fs.lstatSync(fullPath);
  if (stat.isFile() && stat.size > 2 * 1024 * 1024) {
    throw new Error(`Unexpected large Git-visible file: ${relPath} (${stat.size} bytes)`);
  }

  if (stat.isFile() && /\.(?:md|js|json|ya?ml|txt)$/i.test(relPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        throw new Error(`Potential secret detected in ${relPath}: ${pattern}`);
      }
    }
    if (relPath.endsWith('.md')) {
      assertLocalMarkdownLinks(relPath, content);
    }
  }
}

console.log('repository hygiene validation passed');
