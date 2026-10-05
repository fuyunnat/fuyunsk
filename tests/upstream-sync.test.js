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

const upstream = read(path.join(refs, 'upstream-sync.md'));
const routing = read(path.join(refs, 'routing.md'));
const skill = read(path.join(skillDir, 'SKILL.md'));
const agent = read(path.join(skillDir, 'agents/openai.yaml'));
const globalAgents = read(path.join(root, 'global-AGENTS.example.md')).trim();
const personal = read(path.join(root, 'docs/personal-custom-instructions.md'));

test('上游同步默认是选择性补丁，不是追平或覆盖官方', () => {
  for (const value of [
    '同步上游不等于把当前项目更新成上游最新版',
    '默认补丁式吸收，不整仓覆盖',
    '直接用上游同名文件覆盖派生项目文件',
    'merge upstream/main',
    '整仓 rebase',
    '上游删除了代码、字段、接口或功能，就自动在派生项目同步删除',
  ]) assert.ok(upstream.includes(value), `缺少上游同步保护：${value}`);
});

test('上游同步保护二开成果并要求语义融合', () => {
  for (const value of [
    '要理解**语义变化**',
    '冲突时优先保护二开成果',
    '派生项目已有的新功能、支付方式、权限、佣金、多语言、后台配置、接口扩展、数据库兼容',
    '不能 AI 自己一刀切',
  ]) assert.ok(upstream.includes(value), `缺少二开保护：${value}`);
});

test('目标模式要求真实测试、启动交付后停止', () => {
  for (const value of [
    '测试必须证明两件事，而不是只看编译',
    '上游目标真的生效',
    '派生项目自己的能力没有被破坏',
    '构建成功',
    '启动/预览先确认授权与数据库隔离',
    '交付影响清单 → 停止等待用户测试',
    '立即停止',
    '不把开发分支合并到 `main/master`',
  ]) assert.ok(upstream.includes(value), `缺少目标模式交付门禁：${value}`);
});

test('主线基线只在用户明确授权时更新', () => {
  assert.match(upstream, /只有用户明确要求“先把当前状态提交\/推送到 main\/master 作为恢复点”/);
  assert.match(upstream, /该授权只用于建立这次同步前的基线/);
});

test('上游同步专项按需加载，普通 Bug 不自动变重', () => {
  const sync = planBatch('实现', ['上游同步']);
  assert.ok(sync.references.includes('upstream-sync.md'));
  assert.ok(sync.references.includes('behavior-preservation.md'));
  assert.ok(sync.references.includes('project-write-boundary.md'));
  assert.ok(!sync.references.includes('database-upgrade-safety.md'), '未命中数据库时不应预加载数据库专项');
  assert.ok(!sync.references.includes('diagnosis-feedback-loop.md'), '上游同步不默认加载深入诊断');

  const bug = planBatch('小改', ['故障修复']);
  assert.ok(!bug.references.includes('upstream-sync.md'));
});

test('入口和路由能命中二开同步且保持短入口', () => {
  assert.match(routing, /二开\/派生项目同步上游、官方修复或新功能/);
  assertAgentDelegates(agent);
  assert.match(upstream, /补丁式/);
  assert.match(skill, /二开上游同步/);
  assert.ok(Buffer.byteLength(skill) <= 6000, 'SKILL.md 应保持 6000 bytes 以内');
});

test('全局个性化同步命中上游任务且模板保持一致', () => {
  assert.match(globalAgents, /同步上游/);
  assert.match(routing, /上游同步只吸收已确认目标/);
  assert.ok(Buffer.byteLength(globalAgents) <= 1800, 'global AGENTS 模板超过 1800 bytes');
  const block = personal.match(/```markdown\n([\s\S]*?)\n```/);
  assert.ok(block, '个人模板缺少 markdown 调度块');
  assert.equal(block[1].trim(), globalAgents);
});
