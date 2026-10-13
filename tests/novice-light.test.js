'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const read = file => fs.readFileSync(path.join(skill, file), 'utf8');
const globalAgents = fs.readFileSync(path.join(root, 'global-AGENTS.example.md'), 'utf8');

test('先分轻重：只问不改直接答，快速小改只读一页要点', () => {
  const entry = read('SKILL.md');
  for (const s of ['先分轻重', '只问不改', '不读规则、不建文件', 'references/quick-core.md', '不跑批量读取、不建清单']) assert.ok(entry.includes(s), s);
  assert.match(globalAgents, /只问不改的代码解释直接回答/);
});

test('快速小改要点短小，并写明何时回到完整流程', () => {
  const core = read('references/quick-core.md');
  assert.ok(Buffer.byteLength(core) <= 3500, 'quick-core.md 应保持一页');
  for (const s of ['最小改动', '不清库', '不盲试', '最小验证', '汇报用人话', '立刻改用完整流程', '数据库', '权限', '多个模块']) assert.ok(core.includes(s), s);
});

test('快速小改不建清单，但续作已有清单和升级后照常记录', () => {
  const rules = read('references/workflow-checklist.md');
  for (const s of ['快速小改例外', '不创建、不更新', '照常更新对应项', '先补建清单再继续', '门禁失败停止业务写入']) assert.ok(rules.includes(s), s);
});

test('进度面板只在用户要看时启动，不在后台自动拉起', () => {
  const panel = read('references/workflow-progress-panel.md');
  assert.match(panel, /工程对话开始\/继续不再自动检查或启动面板/);
  assert.match(panel, /用户没提进度时.*不运行 `--ensure`/);
  assert.match(globalAgents, /进度面板用户要看才开/);
  assert.doesNotMatch(globalAgents, /工程开始\/继续自动检查/);
});

test('汇报用人话，授权变更有记录且安全规则不变', () => {
  assert.match(read('SKILL.md'), /用人话说改好了什么、用户现在能做什么/);
  assert.match(globalAgents, /汇报用人话少术语/);
  const policy = read('references/source-policy.md');
  assert.match(policy, /小白减负的明确授权（2026-10-13）/);
  assert.match(policy, /安全规则不变/);
  assert.match(read('SKILL.md'), /不清库、不重建现有数据库/);
});
