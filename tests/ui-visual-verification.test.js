'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const skill = read('skills/production-engineering/SKILL.md');
const routing = read('skills/production-engineering/references/routing.md');
const batchSource = read('skills/production-engineering/scripts/rule-batch.js');
const batch = require(path.join(root, 'skills/production-engineering/scripts/rule-batch.js'));
const reference = read('skills/production-engineering/references/ui-visual-verification.md');
test('UI视觉验证专项按需接入入口、路由和批量读取', () => {
  for (const body of [skill, routing, batchSource, reference]) assert.ok(body.includes('UI视觉'));
  assert.ok(routing.includes('ui-visual-verification.md'));
  assert.ok(batchSource.includes("'UI视觉验证':"));
  const plan = batch.planBatch('只读', ['UI视觉验证']);
  assert.ok(plan.references.includes('ui-visual-verification.md'));
  assert.ok(plan.topics.includes('前端'));
});
test('普通前端任务不自动加载视觉验证专项', () => {
  const plan = batch.planBatch('实现', ['前端']);
  assert.ok(!plan.references.includes('ui-visual-verification.md'));
});
test('视觉验收必须保留证据和降级边界', () => {
  for (const phrase of ['覆盖表', 'computed styles', '多视口', '视觉验收未完成', '不复制其代码']) assert.ok(reference.includes(phrase));
});
