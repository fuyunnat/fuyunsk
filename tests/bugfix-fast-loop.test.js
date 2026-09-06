'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skillDir = path.join(root, 'skills/production-engineering');
const refs = path.join(skillDir, 'references');
const read = p => fs.readFileSync(p, 'utf8');

const fast = read(path.join(refs, 'bugfix-fast-loop.md'));
const diagnosis = read(path.join(refs, 'diagnosis-feedback-loop.md'));
const lanes = read(path.join(refs, 'task-lanes.md'));
const routing = read(path.join(refs, 'routing.md'));
const skill = read(path.join(skillDir, 'SKILL.md'));
const { planBatch } = require(path.join(skillDir, 'scripts/rule-batch.js'));

test('普通 Bug 明确是修复任务，短诊断后尽快落代码且不盲试', () => {
  for (const value of [
    '修 Bug 默认是修复任务，不是只读诊断任务',
    '一个相关源码读取批次加一个针对性复现/验证批次',
    '证据优先，禁止盲目试错',
    '为什么怀疑这里、改动会影响什么、改完马上怎么验证',
    '不得为了试错同时改多个互不确定的点',
    '第二次修复只有在第一次失败后取得了**新的、能区分假设的证据**时才允许',
    '行为锁不能变成修复前的全量盘点',
  ]) assert.ok(fast.includes(value), `缺少 Bug 快速修复规则：${value}`);
});

test('深入诊断不会撤销用户已有的修复授权', () => {
  assert.match(diagnosis, /用户明确要求“修复\/解决\/改掉”时，本文件只负责诊断阶段/);
  assert.match(diagnosis, /普通可复现 Bug 先按 `bugfix-fast-loop\.md`/);
  assert.match(diagnosis, /不撤销用户已经明确给出的普通 Bug 修复授权/);
});

test('任务通道不再因为出现错误就强制普通 Bug 走完整通道', () => {
  assert.match(lanes, /“出现失败\/异常”本身不再自动/);
  assert.match(lanes, /普通 Bug 若满足这些条件，即使当前表现为报错\/失败也可使用快速通道/);
  assert.match(lanes, /定位、修复、验证/);
});

test('故障修复领域只先加载快速闭环，不预加载深入诊断', () => {
  const plan = planBatch('小改', ['故障修复']);
  assert.ok(plan.references.includes('bugfix-fast-loop.md'));
  assert.ok(!plan.references.includes('diagnosis-feedback-loop.md'));
});

test('入口和路由明确区分普通修复与深入诊断', () => {
  assert.match(skill, /Bug、报错、功能异常且用户要求修复/);
  assert.match(skill, /连续两次有依据的最小修复失败再升级深入诊断/);
  assert.match(routing, /先 `bugfix-fast-loop\.md`；只有升级条件才读 `diagnosis-feedback-loop\.md`/);
  assert.ok(Buffer.byteLength(skill) <= 6000, 'SKILL.md 应保持 6000 bytes 以内');
});
