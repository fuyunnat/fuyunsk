'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const read = file => fs.readFileSync(path.join(skill, file), 'utf8');
const globalAgents = fs.readFileSync(path.join(root, 'global-AGENTS.example.md'), 'utf8');

test('用户补充按纠错替换追加处理，不被当作AI建议搁置', () => {
  const bounded = read('references/bounded-completion.md');
  for (const concept of [/用户[^\n。]*补充/, /纠错|更正/, /替换|取代/, /追加|新增需求/, /记录|记入|登记/]) assert.match(bounded, concept);
  assert.match(bounded, /AI 自己的新增发现先分类/);
  const checklist = read('references/workflow-checklist.md');
  assert.doesNotMatch(checklist, /用户中途补充了第二件事，也视为升级/);
  assert.match(checklist, /bounded-completion/);
  assert.match(checklist, /本批(?:范围|目标|结果|交付)/);
});

test('明确完整目标持续执行，本批完成与用户暂停有明确边界', () => {
  const bounded = read('references/bounded-completion.md');
  for (const s of ['不缩减', '用户明确要求', '停止条件', '其他独立已授权项继续']) assert.ok(bounded.includes(s), s);
  assert.match(bounded, /(?:暂停|本批结束后停止)/);
  const entry = read('SKILL.md');
  assert.match(entry, /bounded-completion\.md/);
  assert.match(globalAgents, /补充若触发升级就记入清单/);
  assert.match(globalAgents, /本批(?:范围|目标|结果|交付)/);
});

test('轻量入口保留任务卡和升级门槛，不因补充说明强制升级', () => {
  const bullets = globalAgents.split('\n').filter(l => l.startsWith('- '));
  assert.match(bullets[0], /实施前先选任务卡/);
  assert.match(globalAgents, /只提一件小事可不建清单/);
  const quick = read('references/quick-core.md');
  assert.doesNotMatch(quick, /这就不再是快速小改/);
  assert.match(quick, /补充(?:说明|要求|内容)/);
  assert.match(quick, /(?:影响|范围)[^\n。]*(?:升级|扩大)|(?:升级|扩大)[^\n。]*(?:影响|范围)/);
  assert.match(quick, /bounded-completion\.md/);
});

test('最新授权覆盖旧绝对追加规则，保留历史来源', () => {
  const sourcePolicy = read('references/source-policy.md');
  assert.match(sourcePolicy, /2026-10-13/);
  assert.match(sourcePolicy, /2026-11-05/);
  assert.match(sourcePolicy, /本批(?:范围|目标|结果|交付)/);
  assert.match(sourcePolicy, /覆盖|取代|替代/);
});
