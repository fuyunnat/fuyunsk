'use strict';

// 只验证规则完整性及实际读取链路。cases 供代理前向测试，不冒充模型行为证明。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const read = file => fs.readFileSync(path.join(skill, file), 'utf8');
const reader = require(path.join(skill, 'scripts/read-rules'));
const cases = require('./bounded-completion-cases.json');
const policy = () => read('references/bounded-completion.md');

test('压力场景同时保留完整目标、必要遗漏与停止边界', () => {
  assert.equal(new Set(cases.map(c => c.id)).size, 7);
  assert.ok(cases.every(c => c.user && c.facts && c.expected.length >= 2));
  for (const s of ['固定验收范围', '必要缺口', '非阻塞建议', '不缩减', '恢复条件']) assert.ok(policy().includes(s), s);
});

test('实现、验证、交付读取同一停止规则，纯只读不自动附加', () => {
  for (const stage of ['小改', '实现', '验证', '提交', '推送', '评审', '回滚']) {
    const batch = reader.readBatch(reader.parse(['--stage', stage, '--topic', '内容']));
    const refs = batch.references.filter(r => r.file === 'bounded-completion.md');
    assert.equal(refs.length, 1, stage);
    assert.equal(refs[0].text, policy());
  }
  const ro = reader.readBatch(reader.parse(['--stage', '只读', '--topic', '内容']));
  assert.ok(!ro.references.some(r => r.file === 'bounded-completion.md'));
});

test('规则限制失效范围、无进展循环与重复审查', () => {
  for (const s of ['相关代码、配置、测试或环境', '两轮没有新增有效证据或验收进展', '一次有边界诊断', '停止同一路径修改和复跑', '一次范围内最终复核', '不重开整分支审查', '状态回填']) assert.ok(policy().includes(s), s);
});

test('保留历史并只维护一个当前状态，缺历史版本不能编造恢复', () => {
  for (const s of ['唯一当前状态', '最小局部更新', '写前读取最新文件', '原历史区块保持原样', 'Git 历史或备份', '不凭记忆重建', '未完成子项 ID']) assert.ok(policy().includes(s), s);
});

test('入口、路由、Agent、执行及恢复规则和模板接通', () => {
  for (const file of ['SKILL.md', 'references/routing.md', 'agents/openai.yaml', 'references/workflow-checklist.md', 'references/agentic-execution.md', 'references/upstream-sync.md', 'references/bugfix-fast-loop.md', 'references/context-memory-continuity.md', 'references/planning-persistence.md', 'references/spec-review.md']) assert.ok(read(file).includes('bounded-completion.md'), file);
  for (const s of ['固定验收范围', '停止条件', '待后续建议', '唯一当前状态']) assert.ok(read('templates/workflow.example.md').includes(s), s);
  assert.ok(Buffer.byteLength(read('references/workflow-checklist.md')) <= 8500);
});
