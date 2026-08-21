#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const files = {
  cli: 'skills/production-engineering/scripts/task-state.js',
  core: 'skills/production-engineering/scripts/task-state-core.js',
};

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8').replace(/\r\n/g, '\n');
}

function assertIncludes(relPath, phrases) {
  const content = read(relPath);
  for (const phrase of phrases) {
    if (!content.includes(phrase)) {
      throw new Error(`${relPath} is missing task-state behavior: ${phrase}`);
    }
  }
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`node ${args.join(' ')} failed:\n${(result.stderr || result.stdout || '').trim()}`);
  }
}

for (const relPath of Object.values(files)) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    throw new Error(`Missing task-state source: ${relPath}`);
  }
  if (/\b(?:rmSync|rmdirSync|unlinkSync)\b|fs\.rm\s*\(|fs\.unlink\s*\(|fs\.rmdir\s*\(/.test(read(relPath))) {
    throw new Error(`${relPath} must not permanently delete files`);
  }
  runNode(['--check', fullPath]);
}

assertIncludes(files.cli, [
  "require('./task-state-core')",
  'registeredUnfinishedStates(repo)',
  'ambiguous: true',
  'Use the dedicated transition command for complete or passed states',
  'readyToFinalize',
  'shell: false',
  'contentHash',
  'guardedTransitions',
]);

assertIncludes(files.core, [
  'task-states',
  'registeredUnfinishedStates',
  'pathIsWithin',
  'hashFileContent',
  'workingTreeDescriptor',
  'fs.readlinkSync',
  'refreshStaleVerification',
  'writePrivateText',
]);

runNode([path.join(root, files.cli), 'self-test']);
runNode([path.join(root, files.cli), 'fingerprint', '--repo', root]);

console.log('task-state helper validation passed');
