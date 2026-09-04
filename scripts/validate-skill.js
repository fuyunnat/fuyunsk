#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function full(relPath) {
  return path.join(root, relPath);
}

function read(relPath) {
  return fs.readFileSync(full(relPath), 'utf8').replace(/\r\n/g, '\n');
}

function assertFile(relPath) {
  if (!fs.existsSync(full(relPath)) || !fs.statSync(full(relPath)).isFile()) {
    throw new Error(`Missing required file: ${relPath}`);
  }
}

function assertIncludes(relPath, phrases) {
  const content = read(relPath);
  for (const phrase of phrases) {
    if (!content.includes(phrase)) {
      throw new Error(`${relPath} is missing required phrase: ${phrase}`);
    }
  }
}

function assertNotIncludes(relPath, phrases) {
  const content = read(relPath);
  for (const phrase of phrases) {
    if (content.includes(phrase)) {
      throw new Error(`${relPath} contains forbidden phrase: ${phrase}`);
    }
  }
}

function assertMatch(relPath, pattern, message) {
  if (!pattern.test(read(relPath))) {
    throw new Error(`${relPath} ${message}`);
  }
}

function assertBudget(relPath, maxLines, maxBytes) {
  const content = read(relPath);
  const lines = content.endsWith('\n') ? content.split('\n').length - 1 : content.split('\n').length;
  const bytes = Buffer.byteLength(content, 'utf8');
  if (lines > maxLines || bytes > maxBytes) {
    throw new Error(`${relPath} exceeds budget: ${lines}/${maxLines} lines, ${bytes}/${maxBytes} bytes`);
  }
}

function assertFloor(relPath, minBytes) {
  const bytes = Buffer.byteLength(read(relPath), 'utf8');
  if (bytes < minBytes) {
    throw new Error(`${relPath} appears truncated: ${bytes}/${minBytes} bytes`);
  }
}

function runNode(relPath, args = []) {
  const result = spawnSync(process.execPath, [full(relPath), ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`${relPath} ${args.join(' ')} failed:\n${(result.stderr || result.stdout || '').trim()}`);
  }
}

const requiredFiles = [
  'README.md',
  'AGENTS.md',
  'global-AGENTS.example.md',
  'docs/ai-installation.md',
  'docs/personal-custom-instructions.md',
  '.gitignore',
  'tests/routing-cases.json',
  'scripts/validate-routing-cases.js',
  'scripts/validate-repository-hygiene.js',
  'scripts/validate-task-state.js',
  'skills/production-engineering/SKILL.md',
  'skills/production-engineering/agents/openai.yaml',
  'skills/production-engineering/scripts/task-state.js',
  'skills/production-engineering/scripts/task-state-core.js',
  'skills/production-engineering/references/code-risk-review.md',
  'skills/production-engineering/references/content-writing-quality.md',
  'skills/production-engineering/references/context-memory-continuity.md',
  'skills/production-engineering/references/frontend-interface-quality.md',
  'skills/production-engineering/references/wrapped-workspace-ui.md',
  'skills/production-engineering/references/project-understanding.md',
  'skills/production-engineering/references/routing.md',
  'skills/production-engineering/references/task-lanes.md',
  'skills/production-engineering/references/full-production-engineering.md',
];

for (const relPath of requiredFiles) {
  assertFile(relPath);
}

assertBudget('global-AGENTS.example.md', 40, 3_500);
assertBudget('docs/personal-custom-instructions.md', 70, 4_500);
assertBudget('docs/ai-installation.md', 120, 8_000);
assertBudget('skills/production-engineering/SKILL.md', 100, 7_000);
assertBudget('skills/production-engineering/references/routing.md', 130, 9_000);
assertFloor('skills/production-engineering/references/full-production-engineering.md', 100_000);

const combined = [
  'global-AGENTS.example.md',
  'skills/production-engineering/SKILL.md',
  'skills/production-engineering/references/routing.md',
].reduce((sum, relPath) => sum + Buffer.byteLength(read(relPath), 'utf8'), 0);

if (combined > 18_000) {
  throw new Error(`Performance-sensitive guidance exceeds combined budget: ${combined}/18000 bytes`);
}

const skill = read('skills/production-engineering/SKILL.md');
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);
if (!frontmatter) {
  throw new Error('SKILL.md is missing YAML frontmatter');
}

assertIncludes('skills/production-engineering/SKILL.md', [
  'name: production-engineering',
  'Explicit opt-in workflow',
  'user explicitly invokes $production-engineering',
  'Do not use for greetings',
  'Do not run it merely because a conversation is new',
  'Load only what the current task needs',
]);

assertMatch(
  'skills/production-engineering/agents/openai.yaml',
  /^\s*allow_implicit_invocation:\s*false\s*$/m,
  'must disable implicit invocation',
);

assertIncludes('skills/production-engineering/agents/openai.yaml', [
  '$production-engineering',
  'load only the references required',
]);

assertIncludes('global-AGENTS.example.md', [
  'Do not install it by default',
  'Do not load `$production-engineering` automatically',
  'choose at most one',
]);

assertIncludes('docs/personal-custom-instructions.md', [
  'Do not also install `global-AGENTS.example.md`',
  'allow_implicit_invocation: false',
  'Normal chat should not trigger the skill',
]);

assertIncludes('docs/ai-installation.md', [
  'performance-first, explicit-only mode',
  'allow_implicit_invocation 为 false',
  '默认不要把 global-AGENTS.example.md',
  '不要因为新对话自动运行 task-state resume',
  'Migration From Older Versions',
]);

assertIncludes('README.md', [
  'explicit-only by default',
  'Why This Changed',
  '$production-engineering',
  'Do not install both global fallback documents',
  'allow_implicit_invocation: false',
  'Migration',
]);

for (const relPath of [
  'global-AGENTS.example.md',
  'docs/personal-custom-instructions.md',
  'docs/ai-installation.md',
  'skills/production-engineering/SKILL.md',
  'skills/production-engineering/references/routing.md',
]) {
  assertNotIncludes(relPath, [
    '每个新对话的第一个工程请求',
    'first engineering turn in every conversation',
  ]);
}

assertNotIncludes('skills/production-engineering/agents/openai.yaml', [
  'allow_implicit_invocation: true',
]);

const policyFiles = [
  'README.md',
  'global-AGENTS.example.md',
  'docs/ai-installation.md',
  'docs/personal-custom-instructions.md',
  'skills/production-engineering/SKILL.md',
  'skills/production-engineering/references/routing.md',
];

for (const relPath of policyFiles) {
  const content = read(relPath);
  if (/\/Users\/fuyun|C:\\\\Users\\\\fuyun/i.test(content)) {
    throw new Error(`${relPath} contains a machine-specific path`);
  }
  if (/fuyun-[A-Za-z0-9_-]{20,}/.test(content)) {
    throw new Error(`${relPath} contains a value that looks like a live token`);
  }
}

runNode('scripts/validate-routing-cases.js');
runNode('scripts/validate-repository-hygiene.js');
runNode('scripts/validate-task-state.js');

console.log('production-engineering skill validation passed (explicit-only, performance-first)');
