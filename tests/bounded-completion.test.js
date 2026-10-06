'use strict';
const { assertAgentDelegates } = require('./entry-contract-helper');

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
  assert.equal(new Set(cases.map(c => c.id)).size, 12);
  assert.ok(cases.every(c => c.user && c.facts && c.expected.length >= 2));
  assertAgentDelegates(read('agents/openai.yaml'));
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

test('固定来源不能替代有限工作量，保留明确完整审查目标', () => {
  for (const s of ['固定来源不等于冻结工作量', '审查边界', '候选 ID 与总数', '已分类 K/N', '实施清单', '不边审边补', '不得自行缩减完整审查']) assert.ok(policy().includes(s), s);
  for (const id of ['固定来源仍在扩项', '完整审查不可偷停', '笼统补丁请求', '冻结后真实回归']) assert.ok(cases.some(c => c.id === id), id);
});

test('用户收窄目标终止旧审查，未覆盖不冒充完成', () => {
  for (const s of ['用户明确改为本批收尾', '停止旧审查', '本轮不做 / 未覆盖', '不伪造原审查完成', '不再实施新项']) assert.ok(policy().includes(s), s);
  for (const s of ['审查分母', '当前项和下一步', '用户改目标']) assert.ok(read('references/workflow-checklist.md').includes(s), s);
  assert.ok(cases.some(c => c.id === '用户改为本批收尾'));
});

test('入口、路由、Agent、执行及恢复规则和模板接通', () => {
  for (const file of ['SKILL.md', 'references/routing.md', 'references/workflow-checklist.md', 'references/agentic-execution.md', 'references/upstream-sync.md', 'references/bugfix-fast-loop.md', 'references/context-memory-continuity.md', 'references/planning-persistence.md', 'references/spec-review.md']) assert.ok(read(file).includes('bounded-completion.md'), file);
  assertAgentDelegates(read('agents/openai.yaml'));
  for (const s of ['固定验收范围', '停止条件', '待后续建议', '唯一当前状态']) assert.ok(read('templates/workflow.example.md').includes(s), s);
  assert.ok(Buffer.byteLength(read('references/workflow-checklist.md')) <= 8500);
});
