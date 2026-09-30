'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const refs = path.join(skill, 'references');
const policy = fs.readFileSync(path.join(refs, 'database-upgrade-safety.md'), 'utf8');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch.js'));

test('线上数据库升级默认只做兼容增量迁移', () => {
  for (const value of [
    '增量迁移，不重建数据库',
    '自动执行已随版本发布并经过审查的 migration',
    'DROP DATABASE',
    'DROP TABLE',
    'DROP COLUMN',
    'TRUNCATE',
    '全表 `DELETE`',
    '覆盖线上数据库',
    'expand / contract',
    '多实例部署时必须使用单一迁移执行者',
    '原有表和关键历史数据仍存在',
  ]) assert.ok(policy.includes(value), `数据库升级规则缺少：${value}`);
});

test('数据库和部署任务自动加载数据库升级保护', () => {
  for (const topic of ['数据库', '配置部署', '整项目迁移']) {
    const plan = planBatch('实现', [topic]);
    assert.ok(plan.references.includes('database-upgrade-safety.md'), `${topic} 未加载数据库升级保护`);
  }
});

test('普通前端任务不额外加载数据库升级规则', () => {
  const plan = planBatch('实现', ['前端']);
  assert.ok(!plan.references.includes('database-upgrade-safety.md'));
});

test('清库硬限制覆盖直接命令、隐式启动和错误推断', () => {
  const entry = fs.readFileSync(path.join(skill, 'SKILL.md'), 'utf8');
  const agent = fs.readFileSync(path.join(skill, 'agents/openai.yaml'), 'utf8');
  const dispatcher = fs.readFileSync(path.join(root, 'global-AGENTS.example.md'), 'utf8');
  for (const phrase of [
    '本 Skill 不执行清库',
    'DROP DATABASE', 'TRUNCATE', '无范围的 DELETE',
    '删除 SQLite 文件', 'down -v', 'force sync',
    '启动或测试前', '真实环境身份', '迁移日志不等于实际迁移',
    'UI 小改', '临时预览库', '清库重试',
    '备份不构成清库授权',
  ]) assert.ok(policy.includes(phrase), `缺少压力场景或限制：${phrase}`);
  assert.ok(entry.includes('不执行清库、全表清空或重建现有数据库'));
  assert.ok(agent.includes('不清库、不重建现有数据库'));
  assert.ok(dispatcher.includes('不清库、不重建现有数据库'));
});

test('只读和无关前端不被要求连接数据库，但启动的隐式副作用必须检查', () => {
  assert.ok(policy.includes('纯只读排查不得写数据库'));
  assert.ok(policy.includes('无关页面改动不触发 migration'));
  assert.ok(policy.includes('启动命令可能隐式迁移'));
  const front = planBatch('实现', ['前端']);
  assert.ok(!front.references.includes('database-upgrade-safety.md'));
  const deployment = planBatch('实现', ['配置部署']);
  assert.ok(deployment.references.includes('database-upgrade-safety.md'));
});
