'use strict';
const { assertAgentDelegates } = require('./entry-contract-helper');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const refs = path.join(skill, 'references');
const read = file => fs.readFileSync(file, 'utf8');
const policy = read(path.join(refs, 'novice-clarification.md'));
const ui = read(path.join(refs, 'ui-design-workflow.md'));
const entry = read(path.join(skill, 'SKILL.md'));
const globalAgents = read(path.join(root, 'global-AGENTS.example.md')).trim();
const personal = read(path.join(root, 'docs/personal-custom-instructions.md'));
const openai = read(path.join(skill, 'agents/openai.yaml'));
const { planBatch, stages } = require(path.join(skill, 'scripts/rule-batch.js'));

test('小白反问只问结果歧义，不把技术选择甩给用户', () => {
  for (const value of [
    '必须反问的是“结果会不会变”的歧义',
    '不应反问的是 AI 自己能查明的技术事实',
    '给 2–3 个**结果选项**',
    '用户已经明确结果时直接执行',
    '“随便 / 你看着办”不是无限授权',
  ]) assert.ok(policy.includes(value), `缺少小白反问规则：${value}`);
  assert.match(policy, /你要 Vue 还是 React/);
  assert.match(policy, /我建议 B/);
});

test('原有阶段自动加载小白反问规则，记录收尾只处理已确认事实', () => {
  const originalStages = ['只读', '小改', '实现', '验证', '提交', '推送', '评审', '回滚'];
  assert.ok(originalStages.every(stage => stages.includes(stage)));
  for (const stage of originalStages) {
    const plan = planBatch(stage, []);
    assert.ok(plan.references.includes('novice-clarification.md'), `${stage} 未加载反问规则`);
  }
  const record = planBatch('记录收尾');
  assert.ok(!record.references.includes('novice-clarification.md'), '确认事实的记录回填不加载完整反问专项');
  for (const file of ['source-policy.md', 'verification-report.md', 'workflow-checklist.md',
    'bounded-completion.md', 'project-write-boundary.md']) assert.ok(record.references.includes(file), file);
});

test('记录收尾证据不明时需升级，CLI帮助不把阶段选择当授权', () => {
  const result = spawnSync(process.execPath, [path.join(skill, 'scripts/read-rules.js'), '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /记录收尾：仅更新已确认事实/);
  assert.match(result.stdout, /相关实现未变且原证据有效/);
  assert.match(result.stdout, /证据失效\/不明时改用适用阶段/);
  assert.match(result.stdout, /阶段只是读取清单，不能代替这些判断/);
});

test('UI 重写与原样迁移不再因有源码而自动混淆', () => {
  for (const value of [
    '仅仅提供了源码或演示站，不自动等于要求保留旧视觉',
    'UI 全重写',
    '旧源码/演示站仍用于盘点功能、字段、流程和交互',
    '必须按 `novice-clarification.md` 用人话反问',
  ]) assert.ok(ui.includes(value), `缺少 UI 意图分流：${value}`);
});

test('Skill 入口和隐式调用提示都要求人话反问', () => {
  assert.match(entry, /结果歧义暂停，用人话给 2–3 个选项和推荐/);
  assert.match(entry, /2–3 个选项和推荐/);
  assertAgentDelegates(openai);
  assert.match(openai, /allow_implicit_invocation: true/);
});

test('全局与个性化模板保持一致且适合短调度', () => {
  const block = personal.match(/```markdown\n([\s\S]*?)\n```/);
  assert.ok(block, '个人模板缺少 markdown 调度块');
  assert.equal(block[1].trim(), globalAgents);
  assert.match(globalAgents, /用户只需说想要的结果/);
  assert.match(globalAgents, /“随便”不是无限授权/);
  assert.ok(Buffer.byteLength(globalAgents) <= 1800, 'global AGENTS 模板超过 1800 bytes');
  assert.ok(Buffer.byteLength(entry) <= 6000, 'SKILL.md 超过 6000 bytes');
});
