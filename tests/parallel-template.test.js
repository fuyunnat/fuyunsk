'use strict';
const { assertAgentDelegates } = require('./entry-contract-helper');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const skillDir = path.join(root, 'skills/production-engineering');
const refs = path.join(skillDir, 'references');
const read = p => fs.readFileSync(p, 'utf8');
const { planBatch } = require(path.join(skillDir, 'scripts/rule-batch.js'));
const { checkInventory } = require(path.join(skillDir, 'scripts/template-inventory-check.js'));

const rules = read(path.join(refs, 'parallel-template-development.md'));
const routing = read(path.join(refs, 'routing.md'));
const agent = read(path.join(skillDir, 'agents/openai.yaml'));
const globalAgents = read(path.join(root, 'global-AGENTS.example.md')).trim();
const personal = read(path.join(root, 'docs/personal-custom-instructions.md'));

function sha(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

test('模板二开默认旧模板只读并在独立目录并行开发', () => {
  for (const value of [
    '旧模板是只读基线，新模板独立并行',
    '默认禁止写入 `SOURCE_TEMPLATE_ROOT`',
    '新模板独立目录/入口',
    '不自动把新模板设成默认模板',
    '不删除旧模板',
  ]) assert.ok(rules.includes(value), `缺少并行模板保护：${value}`);
});

test('模板功能分母覆盖页面、状态、API、权限、多语言和 SEO', () => {
  for (const value of [
    '页面与路由',
    '交互',
    '状态',
    '数据与 API',
    '权限与用户差异',
    '业务副作用',
    '多语言与本地化',
    '公开页面 SEO',
    '视觉与资源',
  ]) assert.ok(rules.includes(value), `缺少模板盘点面：${value}`);
});

test('固定分母只能追加，implemented 不能冒充 verified', () => {
  for (const value of [
    '分母只能增加，不能缩水',
    '开发途中发现遗漏入口，只能追加新条目',
    '`implemented` 不等于 `verified`',
    '只有用户明确说“不需要这个功能”才能标 `approved-omit`',
    '旧模板已盘点总能力 = verified + approved-omit',
  ]) assert.ok(rules.includes(value), `缺少防遗漏门禁：${value}`);
});

test('模板二开要求新旧真实并行验证并逆向查漏', () => {
  for (const value of [
    '新旧模板可在同一代码版本并行启动/访问',
    '最终查漏门禁',
    '从 V1 台账逐项问“这个在 V2 哪里”',
    '构建成功、类型通过、页面 200、单张截图都不能作为完成证据',
  ]) assert.ok(rules.includes(value), `缺少模板验收门禁：${value}`);
});

test('模板二开专项按需加载，普通前端和 Bug 不自动变重', () => {
  const template = planBatch('实现', ['模板二开']);
  assert.ok(template.references.includes('parallel-template-development.md'));
  assert.ok(template.references.includes('frontend-interface-quality.md'));
  assert.ok(template.references.includes('configuration-localization.md'));
  assert.ok(template.references.includes('behavior-preservation.md'));
  assert.ok(!template.references.includes('project-migration.md'), '新增 V2 模板不应自动升级成整项目迁移');
  assert.ok(!template.references.includes('seo-engineering.md'), '公开模板由模型按需追加 SEO topic，不应让后台模板自动加载完整 SEO');

  const frontend = planBatch('小改', ['前端']);
  assert.ok(!frontend.references.includes('parallel-template-development.md'));
  const bug = planBatch('小改', ['故障修复']);
  assert.ok(!bug.references.includes('parallel-template-development.md'));
});

test('自然语言可以命中模板二开且全局模板保持一致', () => {
  assert.match(routing, /前端模板并行二开/);
  assertAgentDelegates(agent);
  assert.match(fs.readFileSync(path.join(root, 'skills/production-engineering/SKILL.md'), 'utf8'), /旧模板别动/);
  assert.match(globalAgents, /二开模板/);
  assert.match(globalAgents, /二开模板/);
  assert.ok(Buffer.byteLength(globalAgents) <= 1800, 'global AGENTS 模板超过 1800 bytes');
  const block = personal.match(/```markdown\n([\s\S]*?)\n```/);
  assert.ok(block, '个人模板缺少 markdown 调度块');
  assert.equal(block[1].trim(), globalAgents);
});

test('模板台账检查器允许全部 verified + 合法不适用 SEO 的私有模板', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'parallel-template-ok-'));
  fs.mkdirSync(path.join(repo, 'v1'));
  fs.mkdirSync(path.join(repo, 'v2'));
  fs.mkdirSync(path.join(repo, 'evidence'));
  const receipt = path.join(repo, 'evidence', 'run.txt');
  fs.writeFileSync(receipt, 'real browser/e2e evidence\n');
  const evidence = [{ path: 'evidence/run.txt', sha256: sha(receipt) }];
  const acceptance = [
    ['source-template-unchanged', 'verified'],
    ['parallel-run', 'verified'],
    ['full-feature-reconciliation', 'verified'],
    ['responsive-and-states', 'verified'],
  ].map(([id, status]) => ({ id, status, evidence }));
  acceptance.push({ id: 'public-seo-regression', status: 'not-applicable', evidence: [], note: '后台私有模板，不参与公开索引' });
  const inventory = {
    version: 1,
    sourceTemplateRoot: 'v1',
    targetTemplateRoot: 'v2',
    sourceRevision: 'abc123',
    scope: '仅新增并行后台模板 V2，V1 保持',
    reviewReference: '工作流程.md#模板盘点',
    publicIndexable: false,
    discovery: [{ surface: 'routes+source+runtime', evidence: 'reviewed' }],
    features: [{
      id: 'login', name: '登录', sourceLocations: ['v1/login'], behavior: '正常登录并显示错误',
      states: ['normal', 'error'], dependencies: ['/api/login'], requiredChecks: ['login-ok', 'login-error'],
      targetLocations: ['v2/login'], status: 'verified', evidence, approvalSource: null,
    }],
    acceptanceChecks: acceptance,
  };
  fs.writeFileSync(path.join(repo, 'inventory.json'), JSON.stringify(inventory, null, 2));
  const result = checkInventory(repo, 'inventory.json');
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.counts.total, 1);
  assert.equal(result.counts.verified, 1);

  // 局部能力结项与整体交付分别记账：其他能力缺外部条件时保留已验结果。
  inventory.features.push({
    id: 'external-mail', name: '邮件', sourceLocations: ['v1/mail'], behavior: '真实隔离邮件成功',
    states: ['normal'], dependencies: ['隔离邮件服务'], requiredChecks: ['mail-real-success'],
    targetLocations: ['v2/mail'], status: 'implemented', evidence: [], approvalSource: null,
    note: '请求字段本机已测；真实成功缺隔离账号与回调入口，条件到位后验证服务回执',
  });
  fs.writeFileSync(path.join(repo, 'inventory.json'), JSON.stringify(inventory, null, 2));
  const partial = checkInventory(repo, 'inventory.json');
  assert.equal(partial.ok, false, '外部成功未测，整体不能完成');
  assert.equal(partial.counts.total, 2);
  assert.equal(partial.counts.verified, 1, '保留无关能力已验结果');
  assert.equal(partial.counts.implemented, 1);
  assert.equal(partial.counts.unresolved, 1);
});

test('模板台账检查器拒绝 implemented 冒充完成和无授权省略', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'parallel-template-bad-'));
  fs.mkdirSync(path.join(repo, 'v1'));
  fs.mkdirSync(path.join(repo, 'v2'));
  const inventory = {
    version: 1,
    sourceTemplateRoot: 'v1', targetTemplateRoot: 'v2', sourceRevision: 'abc123',
    scope: '并行模板', reviewReference: 'review.md', publicIndexable: false,
    discovery: [{ surface: 'routes', evidence: 'reviewed' }],
    features: [
      { id: 'a', name: 'A', sourceLocations: ['v1/a'], behavior: 'A', requiredChecks: ['a'], targetLocations: ['v2/a'], status: 'implemented', evidence: [] },
      { id: 'b', name: 'B', sourceLocations: ['v1/b'], behavior: 'B', requiredChecks: ['b'], targetLocations: [], status: 'approved-omit', evidence: [], approvalSource: '' },
    ],
    acceptanceChecks: [
      { id: 'source-template-unchanged', status: 'pending', evidence: [] },
      { id: 'parallel-run', status: 'pending', evidence: [] },
      { id: 'full-feature-reconciliation', status: 'pending', evidence: [] },
      { id: 'responsive-and-states', status: 'pending', evidence: [] },
      { id: 'public-seo-regression', status: 'not-applicable', note: 'private', evidence: [] },
    ],
  };
  fs.writeFileSync(path.join(repo, 'inventory.json'), JSON.stringify(inventory, null, 2));
  const result = checkInventory(repo, 'inventory.json');
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(v => v.includes('仍有 1 个功能未完成真实验证')));
  assert.ok(result.errors.some(v => v.includes('省略必须记录用户明确批准来源')));
});
