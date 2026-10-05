'use strict';
// 规则与读取契约检查；真实行为另用隔离项目验证。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const read = p => fs.readFileSync(path.join(skill, p), 'utf8');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch'));

test('入口和隐式提示精简，预算不靠放宽阈值解决', () => {
  assert.ok(Buffer.byteLength(read('SKILL.md')) <= 5000);
  assert.ok(Buffer.byteLength(read('references/routing.md')) <= 5000);
  assert.ok(Buffer.byteLength(read('agents/openai.yaml')) <= 2200);
});

test('明确放弃代码且不备份时执行范围内恢复，保护数据边界', () => {
  const policy = read('references/source-policy.md');
  for (const s of ['明确放弃', '不备份', '不重复确认', '不新增备份', '数据库', '未授权']) assert.ok(policy.includes(s), s);
  for (const f of ['SKILL.md', 'references/workflow-checklist.md', 'references/bounded-completion.md', 'references/git-team-delivery.md']) assert.ok(read(f).includes('source-policy.md'), f);
});

test('原文恢复和禁止清单写入有明确例外，不反向加记录', () => {
  const rules = read('references/workflow-checklist.md');
  for (const s of ['原文恢复', '不追加记录', '对话中', '不得先写新任务', '仍须核对项目根']) assert.ok(rules.includes(s), s);
});

test('小改一至三项，活跃区块限制而详细需求与旧历史不截断', () => {
  const rules = read('references/workflow-checklist.md');
  for (const s of ['10 行', '40 行', '不删除或截断', '详细方案', '索引', '不为写记录重跑']) assert.ok(rules.includes(s), s);
  assert.ok(read('templates/workflow.example.md').split('\n').length <= 40);
});

test('小改没有默认全套代理流程，读规则不运行自身自检', () => {
  const p = planBatch('小改', ['故障修复']);
  for (const f of ['agentic-execution.md', 'project-migration.md', 'diagnosis-feedback-loop.md']) assert.ok(!p.references.includes(f));
  assert.ok(p.references.includes('source-policy.md'), '同批加载授权例外，不能只保留旧原文限制');
  assert.ok(read('SKILL.md').includes('业务任务跑业务项目测试'));
});
