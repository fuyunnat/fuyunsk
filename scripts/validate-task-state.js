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
      throw new Error(`${relPath} 缺少任务状态行为：${phrase}`);
    }
  }
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`node ${args.join(' ')} 失败：\n${(result.stderr || result.stdout || '').trim()}`);
  }
}

for (const relPath of Object.values(files)) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    throw new Error(`缺少任务状态源码：${relPath}`);
  }
  if (/\b(?:rmSync|rmdirSync|unlinkSync)\b|fs\.rm\s*\(|fs\.unlink\s*\(|fs\.rmdir\s*\(/.test(read(relPath))) {
    throw new Error(`${relPath} 不得永久删除文件`);
  }
  runNode(['--check', fullPath]);
}

assertIncludes(files.cli, [
  "require('./task-state-core')",
  'registeredUnfinishedStates(repo)',
  'ambiguous: true',
  '完成或通过状态必须使用专门的转换命令',
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

console.log('任务状态助手校验通过');
