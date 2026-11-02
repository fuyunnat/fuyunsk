'use strict';
const { assertAgentDelegates } = require('./entry-contract-helper');
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
const legacyMigration = read('docs/legacy-personalization-migration.md');

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
    assertAgentDelegates(agent);
    assert.ok(globalAgents.includes(item.global), `global AGENTS 漏触发：${item.domain}`);
  }
});

test('Code Craft 不是独立自然语言领域，但必须从代码实现入口自动可达', () => {
  for (const body of [skill, routing, batch]) assert.ok(body.includes('code-craft.md') || body.includes('Code Craft'));
  // 表格标签可简写；实现入口必须保留完整领域连接。
  const codeEntry = skill.split('\n').find(line => line.startsWith('| ') && line.includes('code-craft.md'));
  assert.match(codeEntry, /代码/);
  for (const ref of ['planning-persistence.md', 'parallel-template-development.md', 'configuration-localization.md', 'code-craft.md']) {
    assert.ok(codeEntry.includes(ref), ref);
  }
  assert.match(routing, /写代码默认应用专业代码工艺/);
  assert.match(batch, /codeCraftStages/);
});

test('规划清单与禁止业务硬编码在主入口有直接语义，不只藏在专项文件', () => {
  for (const value of ['先列清单', '旧模板别动', '别写死']) assert.ok(skill.includes(value));
  assertAgentDelegates(agent);
  assert.match(globalAgents, /字段清单/);
  assert.match(routing, /planning-persistence\.md/);
  assert.match(routing, /configuration-localization\.md/);
  assert.ok(batch.includes('configuration-localization.md'));
});

test('全局个性化模板保持同源且仍然轻量', () => {
  const block = personal.match(/```markdown\n([\s\S]*?)\n```/);
  assert.ok(block, '个人模板缺少 markdown 调度块');
  assert.equal(block[1].trim(), globalAgents);
  assert.ok(Buffer.byteLength(globalAgents) <= 1800, 'global AGENTS 模板超过 1800 bytes');
});

test('旧长版个性化必须替换成唯一短调度块，不能两套规则并存', () => {
  for (const fingerprint of ['# 全局 Codex 工作规则', '## 自动使用生产工程技能', '本机兜底路径', '## 小白优先沟通', '## 轻任务优先']) {
    assert.ok(legacyMigration.includes(fingerprint), `缺少旧模板识别特征：${fingerprint}`);
  }
  for (const requirement of [
    '旧长块和新短块不能共存',
    '带时间戳备份',
    '旧长块之外的用户个人习惯',
    '原样保留',
    '不要把旧界面内容再次点保存覆盖新文件',
    '只有一个 `production-engineering` 短调度块',
  ]) {
    assert.ok(legacyMigration.includes(requirement), `缺少旧个性化迁移要求：${requirement}`);
  }
  assert.ok(personal.includes('旧长版必须收口'));
  assert.ok(personal.includes('legacy-personalization-migration.md'));
  assert.ok(personal.includes('不能只在文件尾追加新块'));
});

test('SKILL 主入口保持轻量，详细规则继续按需下沉', () => {
  assert.ok(Buffer.byteLength(skill) <= 6000, 'SKILL.md 超过 6000 bytes');
  for (const ref of ['planning-persistence.md', 'parallel-template-development.md', 'configuration-localization.md', 'code-craft.md']) {
    assert.ok(skill.includes(ref), `SKILL.md 未指向专项：${ref}`);
  }
});
