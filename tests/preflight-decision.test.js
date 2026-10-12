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

  assert.match(skill, /先评估再执行|实施前/);
  assert.match(routing, /preflight-decision\.md/);
});

test('实现和小改会加载评估专项 只读和评审不额外加载', () => {
  const implementation = planBatch('实现', []);
  const smallChange = planBatch('小改', []);
  const readOnly = planBatch('只读', []);
  const review = planBatch('评审', []);

  assert.ok(implementation.references.includes('preflight-decision.md'));
  assert.ok(smallChange.references.includes('preflight-decision.md'));
  assert.ok(!readOnly.references.includes('preflight-decision.md'));
  assert.ok(!review.references.includes('preflight-decision.md'));
});
