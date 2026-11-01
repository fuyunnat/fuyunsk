'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const read = file => fs.readFileSync(path.join(skill, file), 'utf8');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch'));

test('写入任务统一优先真实测试并固定五项收尾报告', () => {
  const report = read('references/verification-report.md');
  for (const phrase of ['先做真实验收', '真实项目、真实运行入口或安全隔离环境', '不能单独冒充业务行为已经测试', '账号、密钥、服务、测试数据、依赖、浏览器或权限', '做了什么', '没做/卡在哪里', '怎么测的', '还没测什么', '缺什么', '规则/文档验证', '布局是否合理、组件是否协调', '用安全的测试值实际填写和操作', '报告要短，先说结果']) {
    assert.ok(report.includes(phrase), phrase);
  }
});

test('所有写入阶段都能读到真实测试与收尾规则', () => {
  for (const stage of ['小改', '实现', '验证', '提交', '推送', '评审', '回滚']) {
    assert.ok(planBatch(stage, []).references.includes('verification-report.md'), `${stage} 未加载 verification-report.md`);
  }
  assert.ok(!planBatch('只读', []).references.includes('verification-report.md'));
});

test('短入口和任务卡都提醒真实测试与缺口报告', () => {
  assert.match(read('SKILL.md'), /真实验收/);
  assert.match(read('SKILL.md'), /做了什么、没做\/卡在哪里、怎么测的、还没测什么、缺什么/);
  assert.match(read('references/quick-core.md'), /真实测试优先/);
  assert.match(read('references/task-card.md'), /真实测试条件/);
  assert.match(read('references/task-card.md'), /未验证\/缺口/);
  assert.match(read('references/frontend-delivery-loop.md'), /用安全测试值实际填写和操作/);
  assert.match(read('references/frontend-delivery-loop.md'), /布局是否合理、组件是否协调/);
});

test('安装说明列出验证报告且不把业务清单带进安装目录', () => {
  const body = fs.readFileSync(path.join(root, 'docs/ai-installation.md'), 'utf8');
  assert.match(body, /references\/verification-report\.md/);
  assert.match(body, /不创建任何业务 `工作流程\.md`/);
});
