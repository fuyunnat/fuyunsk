'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skillDir = path.join(root, 'skills/production-engineering');
const refs = path.join(skillDir, 'references');
const read = p => fs.readFileSync(p, 'utf8');
const { planBatch } = require(path.join(skillDir, 'scripts/rule-batch.js'));

const preflight = read(path.join(refs, 'preflight-decision.md'));
const skill = read(path.join(skillDir, 'SKILL.md'));
const routing = read(path.join(refs, 'routing.md'));

test('实施前评估保持通用并覆盖问题、方案、成本和验收', () => {
  for (const value of [
    '目标',
    '证据',
    '边界',
    '候选方案',
    '代价与风险',
    '选择与验收',
    '性能优化先定位真实热路径',
    '不能用想象补齐',
  ]) assert.ok(preflight.includes(value), `缺少评估门禁：${value}`);

  assert.match(skill, /先评估|task-card\.md/);
  assert.match(routing, /preflight-decision\.md/);
});

test('实现和小改会加载评估专项 只读和评审不额外加载', () => {
  const implementation = planBatch('实现', []);
  const smallChange = planBatch('小改', []);
  const readOnly = planBatch('只读', []);
  const review = planBatch('评审', []);

  assert.ok(implementation.references.includes('preflight-decision.md'));
  assert.ok(smallChange.references.includes('preflight-decision.md'));
  assert.ok(implementation.references.includes('task-card.md'));
  assert.ok(smallChange.references.includes('task-card.md'));
  assert.ok(!readOnly.references.includes('preflight-decision.md'));
  assert.ok(!review.references.includes('preflight-decision.md'));
});

test('任务卡区分对话内小改与需要落盘的复杂任务', () => {
  const card = read(path.join(refs, 'task-card.md'));
  for (const field of ['任务级别', '目标', '证据/基线', '必须保持', '允许范围', '方案', '风险与回退', '验收', '当前动作']) {
    assert.match(card, new RegExp(field));
  }
  assert.match(card, /快速小改/);
  assert.match(card, /复杂、跨阶段、跨模块、需要续作/);
  assert.match(card, /不替代用户授权/);
  assert.match(card, /用户只需说想要的结果/);
  assert.match(card, /简单大白话说清/);
  assert.match(card, /2–3 个结果选项和推荐/);
  assert.ok(fs.existsSync(path.join(skillDir, 'templates/task-card.example.md')));
});

test('方案讨论和倾向不等于实施交办，明确授权后不重复确认', () => {
  assert.match(preflight, /(?:讨论|倾向)[\s\S]{0,180}(?:不等于|不代表|不能视为)[\s\S]{0,80}(?:授权|交办|实施)/,
    '讨论删除、重做或表达倾向，不能直接当作实施授权');
  assert.match(preflight, /(?:跨项目|其他项目|另一项目)[\s\S]{0,160}(?:授权|交办|范围)|(?:授权|交办|范围)[\s\S]{0,160}(?:跨项目|其他项目|另一项目)/,
    '方案涉及另一项目时，不能把讨论扩张成该项目的写入范围');
  assert.match(preflight, /(?:明确交办|明确授权|已获授权)[\s\S]{0,180}(?:不重复|不再|不在)[\s\S]{0,50}(?:确认|询问)/,
    '明确交办当前目标后应继续执行，不因阶段或局部方案再次确认');
});
