'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const read = file => fs.readFileSync(path.join(skill, file), 'utf8');
const globalAgents = fs.readFileSync(path.join(root, 'global-AGENTS.example.md'), 'utf8');

test('用户中途补充一律记入清单、算必做，不当作建议搁置', () => {
  const bounded = read('references/bounded-completion.md');
  for (const s of ['用户中途补充的要求一律是当前任务的必做项', '立即追加到当前任务区块', '没有清单就当场', '不等用户再说一次', '只适用于 **AI 自己发现** 的问题']) assert.ok(bounded.includes(s), s);
  assert.match(bounded, /AI 自己的新增发现先分类/);
  const checklist = read('references/workflow-checklist.md');
  assert.match(checklist, /用户中途补充了第二件事，也视为升级/);
  assert.match(checklist, /用户中途补充的立即记为必做项/);
});

test('全部做完才停，不中途问要不要继续', () => {
  const bounded = read('references/bounded-completion.md');
  for (const s of ['全部做完才停', '不得结束、不得停下来问', '只问那一个问题']) assert.ok(bounded.includes(s), s);
  const entry = read('SKILL.md');
  assert.match(entry, /用户中途补充（含小改）立即记入、算必做/);
  assert.match(entry, /全部做完或写明阻塞才停/);
  assert.match(globalAgents, /中途补充即记入清单算必做，全做完才停/);
  assert.doesNotMatch(globalAgents, /完成即停/);
});

test('每轮必带的全局规则把“先记清单、做完才停”放在第一条，小改路线也写明', () => {
  const bullets = globalAgents.split('\n').filter(l => l.startsWith('- '));
  assert.match(bullets[0], /每轮先做/);
  assert.match(bullets[0], /含中途补充/);
  assert.match(bullets[0], /只缺用户才能给的信息时才停/);
  assert.match(globalAgents, /只提一件小事可不建清单/);
  const quick = read('references/quick-core.md');
  for (const s of ['这就不再是快速小改', '把原来的事和补充的事都写进去', '不停下来问']) assert.ok(quick.includes(s), s);
});

test('授权变更有记录', () => {
  assert.match(read('references/source-policy.md'), /中途补充即必做、全部做完才停的明确授权（2026-10-13）/);
});
