'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const agentic = read('skills/production-engineering/references/agentic-execution.md');
const map = read('docs/superpowers-method-absorption.md');
const readme = read('README.md');
const { planBatch } = require(path.join(root, 'skills/production-engineering/scripts/rule-batch.js'));

const allUpstreamSkills = [
  'using-superpowers',
  'brainstorming',
  'writing-plans',
  'executing-plans',
  'subagent-driven-development',
  'dispatching-parallel-agents',
  'requesting-code-review',
  'receiving-code-review',
  'systematic-debugging',
  'test-driven-development',
  'using-git-worktrees',
  'verification-before-completion',
  'finishing-a-development-branch',
  'writing-skills',
];

const requireText = (body, values) => values.forEach(value => {
  assert.ok(body.includes(value), `缺少 Superpowers 吸收要求：${value}`);
});

test('十四个上游 Skill 都有明确吸收或不采用说明', () => {
  for (const name of allUpstreamSkills) assert.ok(map.includes(`\`${name}\``), `映射表漏掉：${name}`);
  assert.ok(map.includes('b36e0829c6d0140e93cfef2ca599b1b07d4a7797'));
});

test('复杂任务补齐形态分级、计划契约和条件等待', () => {
  requireText(agentic, [
    '探针/Spike',
    '边界型/Bounded',
    '架构型/Architectural',
    '跨任务接口写清谁消费、谁产出',
    '禁止 `TBD`',
    '能独立测试、能独立 review、失败时容易定位',
    '等条件而不是写固定 `sleep 5`',
    '轮询必须有上限',
  ]);
});

test('保留高价值代理执行方法并拒绝绝对主义流程', () => {
  requireText(agentic, [
    '子代理只吃最小必要上下文',
    '只有真正独立的事情才并行',
    '需求符合 → 代码质量',
    '收到评审意见先验证，不盲改',
    '完成声明必须基于最后一次改动后的新鲜证据',
    '不因为测试全绿自动合并 `main/master`',
    '不采用“任何任务都必须先 brainstorming”的全局硬门',
    '不采用“测试不是先写就删除现有代码重来”的绝对做法',
  ]);
});

test('代理执行只按需加载，普通 Bug 不因此自动变重', () => {
  const agentPlan = planBatch('实现', ['代理执行']);
  assert.ok(agentPlan.references.includes('agentic-execution.md'));
  assert.ok(agentPlan.references.includes('spec-review.md'));

  const bug = planBatch('小改', ['故障修复']);
  assert.ok(!bug.references.includes('agentic-execution.md'));
  assert.ok(bug.references.includes('bugfix-fast-loop.md'));
});

test('README 必须公开说明复杂任务执行能力和吸收映射', () => {
  requireText(readme, [
    '复杂任务执行编排',
    'superpowers-method-absorption.md',
    '独立任务才并行',
    'fresh verification',
  ]);
});
