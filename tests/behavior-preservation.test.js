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

test('批量读取的写入和交付阶段加载行为保护，纯只读不强制加载', () => {
  for (const stage of ['小改', '实现', '验证', '提交', '推送', '评审', '回滚']) {
    const out = reader.readBatch(reader.parse(['--stage', stage, '--topic', '接口']));
    assert.ok(out.references.some(r => r.file === 'behavior-preservation.md'), `${stage} 未加载行为保护`);
  }
  const readOnly = reader.readBatch(reader.parse(['--stage', '只读', '--topic', '接口']));
  assert.ok(!readOnly.references.some(r => r.file === 'behavior-preservation.md'), '纯只读无需增加行为保护读取成本');
});

test('小改直读入口自带关联检查、原正常用法对照与报告证据', () => {
  // SKILL 的小改入口不调用批量读取器，单独核对实际会读的文件。
  assert.match(skill, /快速小改只读 `references\/quick-core\.md`/);
  const quick = fs.readFileSync(path.join(refs, 'quick-core.md'), 'utf8');
  assert.match(quick, /直接调用方/);
  assert.match(quick, /原本正常用法/);
  assert.match(quick, /改前.*改后/);
  assert.match(quick, /修复结果.*原有功能.*未测/);
  assert.match(quick, /不扫全仓/);
  assert.ok(Buffer.byteLength(quick) <= 3500);
});

test('Skill 和隐式调用入口明确禁止重构/UI 重写擅改业务结果', () => {
  assert.match(skill, /原业务逻辑、API、数据、配置、权限、副作用、流程/);
  assert.match(skill, /重构\/优化\/UI\/换栈不擅改结果/);
  assertAgentDelegates(agent);
  assert.match(globalAgents, /仅换实现不改结果/);
  assert.match(globalAgents, /旧业务、接口、权限、数据、配置和客户端先兼容，验证后再淘汰/);
  assert.ok(Buffer.byteLength(skill) <= 6000, 'SKILL.md 应保持 6000 bytes 以内');
  assert.ok(Buffer.byteLength(globalAgents) <= 1800, '全局短调度模板应保持 1800 bytes 以内');
});

test('个性化模板继续与 global-AGENTS 完全一致', () => {
  const match = personal.match(/```markdown\n([\s\S]*?)\n```/);
  assert.ok(match, '缺少个性化模板代码块');
  assert.equal(match[1].trim(), globalAgents);
});
