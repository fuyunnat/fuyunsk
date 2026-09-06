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
