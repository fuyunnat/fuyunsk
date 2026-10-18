'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const skill = path.resolve(__dirname, '../skills/production-engineering');
const read = file => fs.readFileSync(path.join(skill, file), 'utf8');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch'));

test('打包产物规则是通用交付纪律，覆盖核对标识、密钥配置与同标识重打', () => {
  const doc = read('references/release-packaging.md');
  for (const s of [
    '通用交付纪律',
    'Git 短 SHA',
    '不要把真实密钥配置打进包',
    '.env.example',
    '该标识对应的代码',
    '打包不等于已部署',
    '不写死某一种语言',
  ]) assert.ok(doc.includes(s), s);
});

test('打包领域与配置部署会加载 release-packaging，普通小改不预载', () => {
  assert.ok(planBatch('实现', ['打包']).references.includes('release-packaging.md'));
  assert.ok(planBatch('实现', ['配置部署']).references.includes('release-packaging.md'));
  assert.ok(!planBatch('小改', ['前端']).references.includes('release-packaging.md'));
  assert.ok(!planBatch('提交', []).references.includes('release-packaging.md'));
});

test('入口与路由能命中打包，现场排查与优化误伤有对应通用条款', () => {
  assert.match(read('SKILL.md'), /release-packaging\.md/);
  assert.match(read('references/routing.md'), /打包\/发布产物/);
  assert.match(read('references/observability-debugging.md'), /环境要对上问题现场/);
  assert.match(read('references/performance-baseline.md'), /优化不要把原来的结果改掉/);
  assert.match(read('references/parallel-template-development.md'), /功能明显不全/);
  assert.match(read('references/source-policy.md'), /交付与排查的通用原则补充（2026-10-18）/);
});
