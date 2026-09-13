'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const skill = read('skills/production-engineering/SKILL.md');
const routing = read('skills/production-engineering/references/routing.md');
const batch = read('skills/production-engineering/scripts/rule-batch.js');
const agent = read('skills/production-engineering/agents/openai.yaml');
const globalAgents = read('global-AGENTS.example.md').trim();
const personal = read('docs/personal-custom-instructions.md');

const capabilities = [
  { domain: '上游同步', ref: 'upstream-sync.md', skill: '上游同步', route: '二开/派生项目同步上游', agent: '同步官方这个修复', global: '同步上游' },
  { domain: 'SEO', ref: 'seo-engineering.md', skill: 'SEO', route: 'SEO、收录', agent: 'SEO搞一下', global: 'SEO/收录' },
  { domain: '模板二开', ref: 'parallel-template-development.md', skill: '模板二开', route: '前端模板并行二开', agent: '再做一套模板', global: '二开模板' },
  { domain: '规划清单', ref: 'planning-persistence.md', skill: '规划清单', route: '先列清单、字段盘点', agent: '先列清单', global: '先列清单' },
  { domain: '配置化', ref: 'configuration-localization.md', skill: '配置化', route: '后台可调业务参数', agent: '别写死', global: '别写死' },
];

test('用户可见专项能力必须同时接到入口、路由、批量加载、Agent 和全局触发', () => {
  for (const item of capabilities) {
    assert.ok(skill.includes(item.skill), `SKILL.md 漏接：${item.domain}`);
    assert.ok(routing.includes(item.route), `routing.md 漏接：${item.domain}`);
    assert.ok(batch.includes(`'${item.domain}':`), `rule-batch.js 漏接 domain：${item.domain}`);
    assert.ok(batch.includes(item.ref), `rule-batch.js 漏接 reference：${item.ref}`);
    assert.ok(agent.includes(item.agent), `openai.yaml 漏触发：${item.domain}`);
    assert.ok(globalAgents.includes(item.global), `global AGENTS 漏触发：${item.domain}`);
  }
});

test('Code Craft 不是独立自然语言领域，但必须从代码实现入口自动可达', () => {
  for (const body of [skill, routing, batch, agent]) assert.ok(body.includes('code-craft.md') || body.includes('Code Craft'));
  assert.match(skill, /规划清单\/模板二开\/别写死\/写代码.*code-craft\.md/);
  assert.match(routing, /写代码默认应用专业代码工艺/);
  assert.match(batch, /codeCraftStages/);
});

test('规划清单与禁止业务硬编码在主入口有直接语义，不只藏在专项文件', () => {
  for (const value of ['先列清单', '旧模板别动', '别写死']) assert.ok(skill.includes(value));
  assert.match(agent, /字段清单/);
  assert.match(globalAgents, /字段清单/);
  assert.match(routing, /planning-persistence\.md/);
  assert.match(routing, /configuration-localization\.md/);
  assert.match(agent, /后台可配置/);
});

test('全局个性化模板保持同源且仍然轻量', () => {
  const block = personal.match(/```markdown\n([\s\S]*?)\n```/);
  assert.ok(block, '个人模板缺少 markdown 调度块');
  assert.equal(block[1].trim(), globalAgents);
  assert.ok(Buffer.byteLength(globalAgents) <= 1800, 'global AGENTS 模板超过 1800 bytes');
});

test('SKILL 主入口保持轻量，详细规则继续按需下沉', () => {
  assert.ok(Buffer.byteLength(skill) <= 6000, 'SKILL.md 超过 6000 bytes');
  for (const ref of ['planning-persistence.md', 'parallel-template-development.md', 'configuration-localization.md', 'code-craft.md']) {
    assert.ok(skill.includes(ref), `SKILL.md 未指向专项：${ref}`);
  }
});
