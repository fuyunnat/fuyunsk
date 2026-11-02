'use strict';
const { assertAgentDelegates } = require('./entry-contract-helper');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skill = fs.readFileSync(path.join(root, 'skills/production-engineering/SKILL.md'), 'utf8');
const agent = fs.readFileSync(path.join(root, 'skills/production-engineering/agents/openai.yaml'), 'utf8');
const globalAgents = fs.readFileSync(path.join(root, 'global-AGENTS.example.md'), 'utf8').trim();
const personal = fs.readFileSync(path.join(root, 'docs/personal-custom-instructions.md'), 'utf8');

test('Skill 元数据覆盖小白口语工程意图，同时保留闲聊排除', () => {
  for (const value of ['这个太丑了', '这里不对', '继续', '跑起来', '跟原站不像', '按钮没反应', '补上功能', '保存一下']) {
    assert.ok(skill.includes(value), `Skill 描述缺少口语触发例：${value}`);
  }
  assert.match(skill, /用户无需提供技术术语、文件名或实现方案/);
  assert.match(skill, /普通闲聊、翻译、计算和脱离项目的概念解释不触发/);
  assert.ok(Buffer.byteLength(skill) <= 6000, 'SKILL.md 应保持短入口');
});

test('隐式调用元数据明确让用户只说结果', () => {
  assert.match(agent, /allow_implicit_invocation: true/);
  assert.match(agent, /口语短句/);
  assert.match(agent, /用户只需说结果/);
  assertAgentDelegates(agent);
});

test('全局自动调用把短指代绑定当前项目，不要求技术术语', () => {
  for (const value of ['看、改、修、跑、继续', '这个太丑了', '跟原站不像', '按钮没反应', '用户只需说想要的结果', '由 AI 自己查']) {
    assert.ok(globalAgents.includes(value), `全局入口缺少：${value}`);
  }
  assert.match(globalAgents, /普通问候、闲聊、翻译、简单计算/);
  assert.match(globalAgents, /命中技能不等于全仓扫描、扩大权限/);
  assert.ok(Buffer.byteLength(globalAgents) <= 1800, '全局短调度规则应保持 1800 bytes 以内');
});

test('个性化文档中的模板与 global-AGENTS 完全一致', () => {
  const match = personal.match(/```markdown\n([\s\S]*?)\n```/);
  assert.ok(match, '缺少个性化模板代码块');
  assert.equal(match[1].trim(), globalAgents);
});

test('目标提示词接入可发现入口，隐式调用先走只输出分支', () => {
  const description = skill.match(/^description: (.*)$/m)?.[1];
  assert.ok(description?.includes('目标提示词'), 'Skill 元数据应识别目标提示词');
  for (const body of [globalAgents, personal]) assert.ok(body.includes('目标提示词'));
  assert.match(globalAgents.split('\n').find(line => line.startsWith('- ')), /目标提示词只输出；实施前先选任务卡/);
  const prompt = agent.match(/default_prompt: (.*)$/m)?.[1];
  assert.match(prompt, /先按 SKILL\.md 判别“目标提示词”只输出分支/);
  assert.match(prompt, /独立口令或明确要求生成才命中，讨论\/修改该约定不算/);
  assert.match(prompt, /缺资料用【待补】模板，不追问/);
  assert.match(prompt, /含必做、验收及完成即停/);
  assert.match(prompt, /输出后停/);
  assert.ok(prompt.indexOf('目标提示词') < prompt.indexOf('先评估'), '隐式提示不得先评估实施再判别只输出请求');
});

test('只要目标提示词时不被任务卡、清单、面板或执行流程抢先', () => {
  const branch = skill.match(/\*\*目标提示词优先\*\*：[\s\S]*?(?=\n\n)/)?.[0];
  assert.ok(branch, '入口缺少优先的目标提示词分支');
  assert.match(branch, /独立口令或明确要生成“目标提示词”时/);
  assert.match(branch, /已有上下文/);
  assert.match(branch, /可复制、独立可用/);
  assert.match(branch, /缺资料用【待补】模板，不追问/);
  assert.match(branch, /含必做、验收及完成即停/);
  assert.match(branch, /输出后停/);
  assert.match(branch, /不启动目标、不执行代码\/改文件\/建清单\/开面板\/调用目标工具/);
  assert.match(branch, /按需读 `references\/planning-persistence\.md`/);
  assert.ok(skill.indexOf(branch) < skill.indexOf('**先分轻重**'), '只输出分支须先于任务卡分流');
  assert.match(skill, /## 实施流程（记录收尾、目标提示词除外）/);
  assert.ok(Buffer.byteLength(skill) <= 5000, '新增分支后不得放宽 SKILL.md 的 5000 bytes 预算');
});
