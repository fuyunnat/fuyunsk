'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const skill = path.resolve(__dirname, '../skills/production-engineering');
const read = file => fs.readFileSync(path.join(skill, file), 'utf8');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch'));

test('性能底线覆盖后端、数据库、前端与改完自检', () => {
  const perf = read('references/performance-baseline.md');
  for (const s of ['先想清楚数据量', '列表必须分页', '不在循环里查数据库', '新查询检查索引', '外部调用必须设超时', '大批量处理分批', '虚拟滚动', '防抖', '请求不串成瀑布', '实际测一下', '如实说明', '不做没有依据的微优化']) {
    assert.ok(perf.includes(s), s);
  }
});

test('写代码阶段默认带上性能底线与第十一章，只读不额外加载', () => {
  for (const [stage, topics] of [['小改', ['前端']], ['实现', ['前端']], ['实现', ['后端']], ['实现', ['接口']], ['小改', ['故障修复']]]) {
    const plan = planBatch(stage, topics);
    assert.ok(plan.references.includes('performance-baseline.md'), `${stage}+${topics}`);
    assert.ok(plan.ids.includes('11-00'), `${stage}+${topics} 缺第十一章`);
  }
  assert.ok(!planBatch('只读', ['前端']).references.includes('performance-baseline.md'));
  assert.ok(!planBatch('实现', ['前端']).references.includes('diagnosis-feedback-loop.md'), '普通实现不预载性能深入诊断');
});

test('入口、小改要点与代码工艺都指向性能底线', () => {
  assert.ok(read('SKILL.md').includes('performance-baseline.md'));
  assert.match(read('references/quick-core.md'), /守住性能底线/);
  assert.match(read('references/code-craft.md'), /性能底线必须做到/);
  assert.match(read('references/source-policy.md'), /写代码默认守住性能底线的明确授权（2026-10-16）/);
});
