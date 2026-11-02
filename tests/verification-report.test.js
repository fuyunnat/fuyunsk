'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const read = file => fs.readFileSync(path.join(skill, file), 'utf8');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch'));
const reader = require(path.join(skill, 'scripts/read-rules'));
const reportFields = ['做了啥', '没做完啥', '怎么测的', '没测啥', '缺啥'];

test('写入任务统一优先真实测试并固定五项收尾报告', () => {
  const report = read('references/verification-report.md');
  for (const phrase of ['先做真实验收', '真实项目、真实运行入口或安全隔离环境', '不能单独冒充业务行为已经测试', '账号、密钥、服务、测试数据、依赖、浏览器或权限', ...reportFields, '规则/文档验证', '布局是否合理、组件是否协调', '用安全的测试值实际填写和操作', '报告要短，先说结果']) {
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
  assert.ok(read('SKILL.md').includes(reportFields.join('、')));
  assert.match(read('references/quick-core.md'), /真实测试优先/);
  assert.match(read('references/task-card.md'), /真实测试条件/);
  assert.match(read('references/task-card.md'), /未验证\/缺口/);
  assert.match(read('references/frontend-delivery-loop.md'), /用安全测试值实际填写和操作/);
  assert.match(read('references/frontend-delivery-loop.md'), /布局是否合理、组件是否协调/);
});

test('报告模板保留用户指定的五个白话字段，不用技术检查数替代实际结果', () => {
  const body = read('references/verification-report.md');
  const template = body.match(/```markdown\n([\s\S]*?)\n```/)[1];
  assert.deepEqual(template.split('\n').filter(Boolean).map(line => line.split('：')[0]), reportFields);
  for (const phrase of ['实际能不能用', '术语随口解释', 'AI能做的继续做', '技术证据', '不能只报命令、检查数或提交号']) assert.ok(body.includes(phrase), phrase);
});

test('前端和Git按真实读取链路拿到同一份白话报告，专项细节不能另成一套收尾', () => {
  const body = read('references/verification-report.md');
  for (const [stage, topic] of [['实现', '前端'], ['提交', '内容'], ['推送', '内容']]) {
    const out = reader.readBatch(reader.parse(['--stage', stage, '--topic', topic]));
    const reports = out.references.filter(ref => ref.file === 'verification-report.md');
    assert.equal(reports.length, 1);
    assert.equal(reports[0].text, body);
  }
  for (const file of ['frontend-delivery-loop.md', 'git-team-delivery.md']) assert.ok(read('references/' + file).includes('verification-report.md'), file);
});

test('安装说明列出验证报告且不把业务清单带进安装目录', () => {
  const body = fs.readFileSync(path.join(root, 'docs/ai-installation.md'), 'utf8');
  assert.match(body, /references\/verification-report\.md/);
  assert.match(body, /不创建任何业务 `工作流程\.md`/);
});

test('入口统一工作流程触发条件，并把已有前端视觉优先级放在入口', () => {
  const entry = read('SKILL.md');
  const global = fs.readFileSync(path.join(root, 'global-AGENTS.example.md'), 'utf8');
  const personal = fs.readFileSync(path.join(root, 'docs/personal-custom-instructions.md'), 'utf8');
  const taskCard = read('references/task-card.md');
  const quick = read('references/quick-core.md');
  for (const body of [entry, global, personal, taskCard, quick]) {
    assert.match(body, /跨.{0,4}文件/);
    assert.match(body, /真实测试条件/);
    assert.match(body, /交接/);
    assert.match(body, /已有清单/);
  }
  assert.match(entry, /已有前端先沿用原框架、配色、字体、图标；无前端用 mc-ui/);
  assert.match(quick, /改页面\/样式：打开真实路由看桌面\/手机布局、配色、字体、图标/);
  assert.match(taskCard, /视觉基线来源|交接摘要/);
});
