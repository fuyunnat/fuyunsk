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

const methodReferences = [
  'skills/production-engineering/references/diagnosis-feedback-loop.md',
  'skills/production-engineering/references/design-testing.md',
  'skills/production-engineering/references/spec-review.md',
  'skills/production-engineering/references/upstream-notes.md',
];

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
  ...methodReferences,
];

for (const relPath of requiredFiles) {
  assertFile(relPath);
}

assertBudget('global-AGENTS.example.md', 40, 3_500);
assertBudget('docs/personal-custom-instructions.md', 70, 4_500);
assertBudget('docs/ai-installation.md', 120, 8_000);
assertBudget('skills/production-engineering/SKILL.md', 115, 8_000);
assertBudget('skills/production-engineering/references/routing.md', 165, 12_000);
assertBudget('skills/production-engineering/references/diagnosis-feedback-loop.md', 150, 11_000);
assertBudget('skills/production-engineering/references/design-testing.md', 150, 11_000);
assertBudget('skills/production-engineering/references/spec-review.md', 175, 13_000);
assertBudget('skills/production-engineering/references/upstream-notes.md', 80, 7_000);
assertFloor('skills/production-engineering/references/full-production-engineering.md', 100_000);

const combined = [
  'global-AGENTS.example.md',
  'skills/production-engineering/SKILL.md',
  'skills/production-engineering/references/routing.md',
].reduce((sum, relPath) => sum + Buffer.byteLength(read(relPath), 'utf8'), 0);

if (combined > 20_000) {
  throw new Error(`Performance-sensitive guidance exceeds combined budget: ${combined}/20000 bytes`);
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
  'diagnosis-feedback-loop.md',
  'design-testing.md',
  'spec-review.md',
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

assertIncludes('skills/production-engineering/references/routing.md', [
  'Method Routing',
  'diagnosis-feedback-loop.md',
  'design-testing.md',
  'spec-review.md',
  'If an exact reproduction loop cannot be built',
  'Review standards/quality separately from spec/intent',
  'Do not load it during normal task execution',
]);

assertIncludes('skills/production-engineering/references/diagnosis-feedback-loop.md', [
  'observable pass/fail verdict',
  'Build The Tightest Useful Feedback Loop',
  'Rank Falsifiable Hypotheses',
  'unique searchable marker',
  'original, non-minimized feedback loop',
  'result remains provisional',
]);

assertIncludes('skills/production-engineering/references/design-testing.md', [
  'Design A Deep Module',
  'Test Through Public Behavior',
  'Implement In Vertical Slices',
  'expand–migrate–contract',
  'A prototype answers one design question',
  'Do not add abstractions solely for imagined future needs',
]);

assertIncludes('skills/production-engineering/references/spec-review.md', [
  'Synthesize Before Interviewing',
  'Break Work Into Vertical Slices',
  'Map Large Uncertain Work',
  'Pin A Review Fixed Point',
  'Review On Two Independent Axes',
  'no spec available',
]);

assertIncludes('skills/production-engineering/references/upstream-notes.md', [
  'mattpocock/skills',
  '3cca18b368ae95cdbdebbff572ccafa662551015',
  'MIT License',
  'Copyright (c) 2026 Matt Pocock',
  'does not vendor or require another skill collection at runtime',
]);

for (const relPath of methodReferences.slice(0, 3)) {
  assertIncludes(relPath, ['See `upstream-notes.md` for methodology attribution.']);
  assertNotIncludes(relPath, [
    'Call the Skill tool',
    '/setup-matt-pocock-skills',
    'docs/agents/issue-tracker.md',
    'disable-model-invocation',
  ]);
}

assertIncludes('AGENTS.md', [
  '只提炼并重写适用流程',
  '注明来源和许可证',
  '不得复制整套第三方 skill',
  '不得借此开启隐式调用',
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
  '默认仅支持**显式调用**',
  '## 方法工具箱',
  'diagnosis-feedback-loop.md',
  'design-testing.md',
  'spec-review.md',
  'mattpocock/skills',
  'allow_implicit_invocation: false',
  '## 从旧版本迁移',
]);

assertNotIncludes('README.md', [
  '## Why This Changed',
  '## Usage',
  '## Method Toolkit',
  '## Authorization',
  '## Install',
  '## Performance Model',
  '## Capabilities',
  '## Structure',
  '## Optional Global Fallback',
  '## Validation',
  '## Migration',
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
  'AGENTS.md',
  'global-AGENTS.example.md',
  'docs/ai-installation.md',
  'docs/personal-custom-instructions.md',
  'skills/production-engineering/SKILL.md',
  'skills/production-engineering/references/routing.md',
  ...methodReferences,
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

console.log('production-engineering skill validation passed (explicit-only, method-routed, attributed)');
