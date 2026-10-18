'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const skill = path.resolve(__dirname, '../skills/production-engineering');
const read = file => fs.readFileSync(path.join(skill, file), 'utf8');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch'));

test('交付反馈规则覆盖文档对照、副作用、失败交付与第三方只读', () => {
  const doc = read('references/delivery-feedback.md');
  for (const s of [
    '通用原则',
    '先读这些材料',
    '会不会重复收费',
    '原地更新',
    '数字带**单位**',
    '默认只做查询/只读',
    '对着改',
    '还能用的做法',
    '在哪里做',
    '就跳过',
  ]) assert.ok(doc.includes(s), s);
});

test('故障修复、后端、接口、前端会加载交付反馈，纯内容不预载', () => {
  for (const topic of ['故障修复', '后端', '接口', '前端', '交付反馈']) {
    assert.ok(planBatch('实现', [topic]).references.includes('delivery-feedback.md'), topic);
  }
  assert.ok(planBatch('只读', ['前端']).references.includes('delivery-feedback.md'), '只读看前端时也可对照交付反馈');
  assert.ok(!planBatch('小改', ['内容']).references.includes('delivery-feedback.md'));
  assert.ok(!planBatch('只读', ['安全']).references.includes('delivery-feedback.md'));
});

test('入口路由与授权记录接通交付反馈', () => {
  assert.match(read('SKILL.md'), /delivery-feedback\.md/);
  assert.match(read('references/routing.md'), /对接\/长任务反馈/);
  assert.match(read('references/source-policy.md'), /对接与长任务反馈原则（2026-10-19）/);
  assert.match(read('references/bugfix-fast-loop.md'), /delivery-feedback\.md/);
  assert.match(read('references/frontend-interface-quality.md'), /delivery-feedback\.md/);
});
