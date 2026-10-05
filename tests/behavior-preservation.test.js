'use strict';
const { assertAgentDelegates } = require('./entry-contract-helper');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skillDir = path.join(root, 'skills/production-engineering');
const refs = path.join(skillDir, 'references');
const policy = fs.readFileSync(path.join(refs, 'behavior-preservation.md'), 'utf8');
const skill = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const agent = fs.readFileSync(path.join(skillDir, 'agents/openai.yaml'), 'utf8');
const globalAgents = fs.readFileSync(path.join(root, 'global-AGENTS.example.md'), 'utf8').trim();
const personal = fs.readFileSync(path.join(root, 'docs/personal-custom-instructions.md'), 'utf8');
const reader = require(path.join(skillDir, 'scripts/read-rules.js'));

test('原有行为锁覆盖常见擅改逻辑场景', () => {
  for (const value of [
    '现有可观察行为默认视为受保护合同',
    '重构、解耦、拆文件',
    'UI 重写',
    '后端换语言/框架',
    '性能优化',
    '无关或顺手变化',
    '发现旧逻辑像 Bug',
    '未授权逻辑差异',
    '构建成功、类型通过、页面能打开、接口返回 200',
  ]) assert.ok(policy.includes(value), `缺少原有行为保护规则：${value}`);
});

test('所有会写或交付的阶段自动加载行为保护，纯只读不强制加载', () => {
  for (const stage of ['小改', '实现', '验证', '提交', '推送', '评审', '回滚']) {
    const out = reader.readBatch(reader.parse(['--stage', stage, '--topic', '接口']));
    assert.ok(out.references.some(r => r.file === 'behavior-preservation.md'), `${stage} 未加载行为保护`);
  }
  const readOnly = reader.readBatch(reader.parse(['--stage', '只读', '--topic', '接口']));
  assert.ok(!readOnly.references.some(r => r.file === 'behavior-preservation.md'), '纯只读无需增加行为保护读取成本');
});

test('Skill 和隐式调用入口明确禁止重构/UI 重写擅改业务结果', () => {
  assert.match(skill, /原业务逻辑、API、数据、配置、权限、副作用和流程默认锁定/);
  assert.match(skill, /UI\/框架\/语言重写不授权改变结果/);
  assertAgentDelegates(agent);
  assert.match(globalAgents, /原业务逻辑、接口、权限、数据和流程默认锁定/);
  assert.match(globalAgents, /重构\/优化\/UI 重写不授权改结果/);
  assert.ok(Buffer.byteLength(skill) <= 6000, 'SKILL.md 应保持 6000 bytes 以内');
  assert.ok(Buffer.byteLength(globalAgents) <= 1800, '全局短调度模板应保持 1800 bytes 以内');
});

test('个性化模板继续与 global-AGENTS 完全一致', () => {
  const match = personal.match(/```markdown\n([\s\S]*?)\n```/);
  assert.ok(match, '缺少个性化模板代码块');
  assert.equal(match[1].trim(), globalAgents);
});
