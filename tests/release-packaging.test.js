'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const skill = path.resolve(__dirname, '../skills/production-engineering');
const read = file => fs.readFileSync(path.join(skill, file), 'utf8');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch'));
const { readBatch, parse } = require(path.join(skill, 'scripts/read-rules'));

test('打包产物规则覆盖来源、密钥配置与真实产物验收', () => {
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

// 下面是规则/读取契约；是否会正确执行另用独立代理真实打包验证。
test('打包入口能读到有限验收与输入失效规则，不强制每次提交重打', () => {
  const batch = readBatch(parse(['--stage', '实现', '--topic', '打包']));
  const refs = batch.references.filter(r => r.file === 'release-packaging.md');
  assert.equal(refs.length, 1);
  const doc = refs[0].text;
  for (const s of ['已有脚本', '解压或安装', '实际打包输入', '纯工作记录', '停止同一路径', 'verification-report.md', 'bounded-completion.md']) assert.ok(doc.includes(s), s);
  assert.ok(!doc.includes('再打一次包'), '不因提交动作本身无条件重打');
});

test('快速入口对普通打包分流，但保留远端与复杂任务升级', () => {
  const quick = read('references/quick-core.md');
  assert.ok(quick.includes('release-packaging.md'));
  assert.ok(!quick.includes('配置部署、打包发布产物、第三方写入'));
  for (const s of ['两步实现/测试', '缺真实测试条件', '远端', '密钥', '完整流程']) assert.ok(quick.includes(s), s);
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
