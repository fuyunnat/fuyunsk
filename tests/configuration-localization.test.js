'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skillDir = path.join(root, 'skills/production-engineering');
const refs = path.join(skillDir, 'references');
const read = p => fs.readFileSync(p, 'utf8');
const rule = read(path.join(refs, 'configuration-localization.md'));
const agent = read(path.join(skillDir, 'agents/openai.yaml'));
const { planBatch } = require(path.join(skillDir, 'scripts/rule-batch.js'));

test('配置化规则区分启动级基础设施和后台运行时配置', () => {
  for (const value of [
    '启动级基础设施',
    'MySQL、Redis 连接',
    'SMTP 主机、端口、发件人、账号、启停和发送策略',
    '优先通过后台配置并持久化',
    '不是强制所有项目都新建配置中心',
  ]) assert.ok(rule.includes(value), `缺少配置化约束：${value}`);
});

test('后台敏感配置要求加密、脱敏、权限和审计', () => {
  for (const value of [
    '必须**加密存储**',
    '页面只显示脱敏值',
    '最小权限控制和审计记录',
    '测试连接/测试发送/验证凭据',
    '不得记录完整密码、Token、Cookie、私钥或第三方 Secret',
  ]) assert.ok(rule.includes(value), `缺少敏感配置保护：${value}`);
});

test('前台默认多语言友好但不强制后台自身多语言', () => {
  assert.match(rule, /前台在\*\*新建、重写或新增功能\*\*时/);
  assert.match(rule, /默认按多语言友好方式实现/);
  assert.match(rule, /后台管理端本身不自动要求多语言/);
  assert.match(rule, /不要在组件、模板、JS\/TS 中散落中文\/英文硬编码/);
  assert.match(rule, /旧内容作为默认语言\/fallback 保持可读/);
});

test('前后端、接口、配置部署和整项目迁移按需加载配置多语言规则', () => {
  for (const topic of ['前端', '后端', '接口', '配置部署', '整项目迁移', '配置化']) {
    const plan = planBatch('实现', [topic]);
    assert.ok(plan.references.includes('configuration-localization.md'), `${topic} 未加载 configuration-localization.md`);
  }
});

test('普通故障修复不因为本规则自动升级加载', () => {
  const plan = planBatch('小改', ['故障修复']);
  assert.ok(plan.references.includes('bugfix-fast-loop.md'));
  assert.ok(!plan.references.includes('configuration-localization.md'));
});

test('Skill 默认提示同步后台配置和前台多语言偏好', () => {
  assert.match(agent, /能由运营在运行时调整的配置优先后台管理/);
  assert.match(agent, /MySQL\/Redis 等启动级连接用部署 Secret\/\.env/);
  assert.match(agent, /前台新建、重写和新增功能默认多语言友好/);
});
