'use strict';
const { assertAgentDelegates } = require('./entry-contract-helper');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skillDir = path.join(root, 'skills/production-engineering');
const refs = path.join(skillDir, 'references');
const read = p => fs.readFileSync(p, 'utf8');
const { planBatch } = require(path.join(skillDir, 'scripts/rule-batch.js'));

const seo = read(path.join(refs, 'seo-engineering.md'));
const routing = read(path.join(refs, 'routing.md'));
const skill = read(path.join(skillDir, 'SKILL.md'));
const agent = read(path.join(skillDir, 'agents/openai.yaml'));
const globalAgents = read(path.join(root, 'global-AGENTS.example.md')).trim();
const personal = read(path.join(root, 'docs/personal-custom-instructions.md'));

test('SEO 对新手隐藏技术细节并分轻量保护和完整工程两层', () => {
  for (const value of [
    '用户不会 SEO 不是阻塞项',
    'SEO Guard',
    'SEO Engineering',
    '不要把“canonical 应该怎么写”“该用哪种 Schema”“hreflang 怎么配”这种技术题甩给用户',
  ]) assert.ok(seo.includes(value), `缺少 SEO 新手规则：${value}`);
});

test('SEO 覆盖抓取、索引、canonical、sitemap、Schema 和真实渲染', () => {
  for (const value of [
    'robots.txt',
    'meta robots',
    'canonical',
    '站点地图',
    'JavaScript 渲染',
    '结构化数据',
    'JSON-LD 必须可解析',
  ]) assert.ok(seo.includes(value), `缺少技术 SEO：${value}`);
});

test('多语言和商城 SEO 接真实项目能力而不是写死', () => {
  for (const value of [
    '多语言与国际 SEO',
    'hreflang',
    'x-default',
    '不能写成所有网站强制要求',
    '电商 SEO',
    'Product / Offer / ProductGroup / Breadcrumb',
    'SEO 可运营字段',
    '优先后台配置',
  ]) assert.ok(seo.includes(value), `缺少多语言/商城 SEO：${value}`);
});

test('SEO 不使用玄学 AI 标记且不保证排名收录', () => {
  assert.match(seo, /不默认添加 `llms\.txt`/);
  assert.match(seo, /不承诺排名第几、多久收录、一定出现富媒体结果或一定被 AI 引用/);
  assert.match(seo, /当前官方资料/);
});

test('SEO 高影响改动继续受行为锁和确认保护', () => {
  for (const value of [
    '批量改公开 URL',
    '大面积新增 `noindex`',
    '批量修改 canonical',
    '批量改 hreflang',
    'SEO 不能绕过 `behavior-preservation.md`',
    '禁止黑帽/欺骗性做法',
  ]) assert.ok(seo.includes(value), `缺少 SEO 风险保护：${value}`);
});

test('公开页面改造要求 SEO Drift 与真实验证，不能只看 build', () => {
  for (const value of [
    'SEO Drift',
    '原始 HTML 与渲染后 DOM',
    'build 成功不等于 SEO 正常',
    '请求真实 URL',
    '未验证',
  ]) assert.ok(seo.includes(value), `缺少 SEO 验证规则：${value}`);
});

test('SEO 专项按需加载，普通 Bug 和普通前端不自动变重', () => {
  const audit = planBatch('只读', ['SEO']);
  assert.ok(audit.references.includes('seo-engineering.md'));
  assert.ok(!audit.references.includes('diagnosis-feedback-loop.md'));
  assert.ok(!audit.references.includes('database-upgrade-safety.md'));

  const implement = planBatch('实现', ['SEO']);
  assert.ok(implement.references.includes('seo-engineering.md'));
  assert.ok(implement.references.includes('behavior-preservation.md'));

  const bug = planBatch('小改', ['故障修复']);
  assert.ok(!bug.references.includes('seo-engineering.md'));

  const frontend = planBatch('小改', ['前端']);
  assert.ok(!frontend.references.includes('seo-engineering.md'), '普通前端只有模型判定公开可索引/SEO 相关时才追加 SEO topic');
});

test('入口和路由能自然命中 SEO 且保持短入口', () => {
  assert.match(routing, /SEO、收录/);
  assert.match(routing, /公开可索引前台新建\/大改按需做轻量 SEO Guard/);
  assert.match(skill, /SEO/);
  assertAgentDelegates(agent);
  assert.match(seo, /用户不会 SEO 不是阻塞项/);
  assert.ok(Buffer.byteLength(skill) <= 6000, 'SKILL.md 应保持 6000 bytes 以内');
});

test('全局个性化识别 SEO 且模板保持一致', () => {
  assert.match(globalAgents, /SEO\/收录/);
  assert.ok(Buffer.byteLength(globalAgents) <= 1800, 'global AGENTS 模板超过 1800 bytes');
  const block = personal.match(/```markdown\n([\s\S]*?)\n```/);
  assert.ok(block, '个人模板缺少 markdown 调度块');
  assert.equal(block[1].trim(), globalAgents);
});
