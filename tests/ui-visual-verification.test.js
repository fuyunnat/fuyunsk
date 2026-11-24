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

test('常规前端有对齐、点击和反馈选型，快改也实际试受影响控件', () => {
  const file = 'frontend-interface-quality.md';
  for (const topic of ['前端', '前端交付', 'UI视觉验证']) {
    assert.ok(batch.planBatch('实现', [topic]).references.includes(file), topic);
  }
  assert.ok(!batch.planBatch('实现', ['后端']).references.includes(file));
  const body = read('skills/production-engineering/references/' + file);
  assert.match(body, /视觉重心[^\n]*点击范围/);
  assert.match(body, /斜向[^\n]*误切换/);
  assert.match(body, /未保存[^\n]*遮罩[^\n]*Escape/);
  for (const name of ['Tooltip', 'Toast', 'Alert', 'Popconfirm', 'Dialog', 'Drawer']) {
    assert.ok(body.includes(name), name);
  }
  assert.match(reference, /实际点[^\n]*空白[^\n]*斜着/);
  assert.match(read('skills/production-engineering/references/quick-core.md'), /实点控件/);
});
