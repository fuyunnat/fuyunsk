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

const behavior = read(path.join(refs, 'behavior-preservation.md'));
const routing = read(path.join(refs, 'routing.md'));
const agent = read(path.join(skillDir, 'agents/openai.yaml'));
const globalAgents = read(path.join(root, 'global-AGENTS.example.md')).trim();
const personal = read(path.join(root, 'docs/personal-custom-instructions.md'));

test('普通前后端默认不再无条件加载性能，但后端保留日志', () => {
  const frontend = planBatch('实现', ['前端']);
  assert.ok(frontend.topics.includes('前端'));
  assert.ok(!frontend.topics.includes('性能'));

  const backend = planBatch('实现', ['后端']);
  assert.ok(backend.topics.includes('后端'));
  assert.ok(backend.topics.includes('日志'));
  assert.ok(!backend.topics.includes('性能'));

  const perf = planBatch('实现', ['性能']);
  assert.ok(perf.topics.includes('性能'));
  assert.ok(perf.references.includes('proven-engineering-methods.md'));
});

test('整项目迁移保留数据库保护并纳入生产日志', () => {
  const migration = planBatch('实现', ['整项目迁移']);
  assert.ok(migration.topics.includes('日志'));
  assert.ok(migration.references.includes('database-upgrade-safety.md'));
  assert.ok(migration.references.includes('project-migration.md'));
});

test('行为锁要求证据驱动且失败改动不能叠加', () => {
  for (const value of [
    '证据驱动修改，不叠加未验证试错',
    '不得把失败补丁保留着继续加第二层猜测',
    '没有新证据时，不因“再试一个也许能好”继续修改生产逻辑',
    '可逆的小步修改优先于一次性大改',
  ]) assert.ok(behavior.includes(value), `缺少安全变更约束：${value}`);
});

test('生产日志是交付门槛，默认写到 log 目录并启动新建带时间戳文件', () => {
  assert.match(routing, /生产日志是交付能力/);
  assert.match(routing, /失败路径无日志不能交付/);
  assert.match(routing, /默认写项目 `log\/`/);
  assert.match(routing, /每次启动新建带时间戳文件/);
  assert.match(routing, /stdout\/stderr/);
  assert.match(routing, /禁密码\/Token\/Cookie\/密钥\/隐私/);
});

test('隐式调用入口同步强调不盲试和脱敏错误日志', () => {
  assertAgentDelegates(agent);
  assert.match(globalAgents, /不盲试，生产后端关键失败留脱敏日志/);
  assert.ok(Buffer.byteLength(globalAgents) <= 1800, 'global AGENTS 模板超过 1800 bytes');

  const block = personal.match(/```markdown\n([\s\S]*?)\n```/);
  assert.ok(block, '个人模板缺少 markdown 调度块');
  assert.equal(block[1].trim(), globalAgents);
});
