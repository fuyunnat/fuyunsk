'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skillDir = path.join(root, 'skills/production-engineering');
const refs = path.join(skillDir, 'references');
const supplement = fs.readFileSync(path.join(refs, 'proven-engineering-methods.md'), 'utf8');
const routing = fs.readFileSync(path.join(refs, 'routing.md'), 'utf8');
const { planBatch } = require(path.join(skillDir, 'scripts/rule-batch.js'));

test('补充层明确低于现有规则且禁止覆盖关键边界', () => {
  for (const value of [
    '本 Skill 现有规则、原文、行为锁、数据库保护、写入边界、Bug 快速修复、Git 与高风险授权',
    '立即舍弃本文件对应方法',
    '不得：',
    '自动安装、复制或运行第三方 Skill',
    '普通 Bug、局部小改或已明确任务升级成大型设计/审计流程',
  ]) {
    assert.ok(supplement.includes(value), `缺少不覆盖边界：${value}`);
  }
});

test('普通 Bug 不加载外部工程增强层', () => {
  const plan = planBatch('实现', ['故障修复']);
  assert.ok(plan.references.includes('bugfix-fast-loop.md'));
  assert.ok(!plan.references.includes('proven-engineering-methods.md'));
  assert.match(routing, /只有升级条件才读 `diagnosis-feedback-loop.md`/);
});

test('性能任务加载影响优先补充层', () => {
  const plan = planBatch('实现', ['性能']);
  assert.ok(plan.references.includes('diagnosis-feedback-loop.md'));
  assert.ok(plan.references.includes('proven-engineering-methods.md'));
  assert.match(supplement, /先处理会叠加完整网络\/IO 等待时间的串行依赖和 waterfall/);
  assert.match(supplement, /最后才考虑局部 JavaScript 微优化/);
});

test('工程增强可显式按需加载，不自动扩大普通阶段', () => {
  const enhanced = planBatch('实现', ['工程增强']);
  assert.ok(enhanced.references.includes('proven-engineering-methods.md'));

  const normal = planBatch('实现', []);
  assert.ok(!normal.references.includes('proven-engineering-methods.md'));

  const review = planBatch('评审', []);
  assert.ok(!review.references.includes('proven-engineering-methods.md'));
});

test('补充层只确认已有等价方法，不重复叠加流程', () => {
  for (const value of [
    '事实由 Agent 查，结果决策才问用户',
    'Bug 建立紧反馈闭环',
    '行为驱动的小步实现 / TDD 思路',
    '需求/意图与代码质量分开审查',
    '渐进加载',
  ]) {
    assert.ok(supplement.includes(value), `缺少已存在方法映射：${value}`);
  }
});
