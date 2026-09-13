'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const refs = path.join(skill, 'references');
const design = fs.readFileSync(path.join(refs, 'frontend-design-intelligence.md'), 'utf8');
const routing = fs.readFileSync(path.join(refs, 'routing.md'), 'utf8');
const agent = fs.readFileSync(path.join(skill, 'agents/openai.yaml'), 'utf8');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch.js'));

const need = values => values.forEach(value => assert.ok(design.includes(value), `缺少设计能力：${value}`));

test('吸收七类前端设计方法但不安装第三方运行依赖', () => {
  need([
    '品牌型', '产品型', 'VARIANCE', 'MOTION', 'DENSITY',
    'DESIGN.md', 'Critique', 'Polish', 'Distill', 'Harden',
    'prefers-reduced-motion', '语义 HTML', '键盘操作',
    'Anthropic `frontend-design`', 'ui-ux-pro-max-skill', 'Leonxlnx/taste-skill',
    'pbakaus/impeccable', 'emilkowalski/skills', 'vercel-labs/web-interface-guidelines',
    'Google Labs `design-md`',
  ]);
  assert.match(design, /不复制第三方 Skill 的完整文本、命令系统、数据库或运行依赖/);
});

test('视觉设计是按需领域，普通前端和普通 Bug 不额外加载', () => {
  const visual = planBatch('实现', ['视觉设计']);
  assert.ok(visual.references.includes('frontend-design-intelligence.md'));
  assert.ok(visual.references.includes('ui-design-workflow.md'));
  assert.ok(visual.references.includes('frontend-interface-quality.md'));
  assert.ok(visual.references.includes('code-craft.md'));

  const frontend = planBatch('实现', ['前端']);
  assert.ok(!frontend.references.includes('frontend-design-intelligence.md'));

  const bug = planBatch('小改', ['故障修复']);
  assert.ok(!bug.references.includes('frontend-design-intelligence.md'));
});

test('严格原样迁移不能被品味重设计覆盖', () => {
  need(['严格原样迁移不因为本规则自动创建新的视觉规范']);
  assert.match(routing, /严格迁移仍以源码\/演示基线为准/);
  assert.match(routing, /不允许“品味提升”覆盖原貌/);
});

test('多页面视觉契约写 DESIGN.md，任务进度仍写工作流程.md', () => {
  need([
    '多页面新设计或整套后台/前台重做',
    '`DESIGN.md` 只记录稳定的设计契约',
    '任务状态、待办、已验证/未验证仍写 `PROJECT_ROOT/工作流程.md`',
    '已有 `DESIGN.md` 时禁止整文件覆盖',
  ]);
});

test('UI 设计不只看视觉，还要求交互、无障碍和边界状态', () => {
  need([
    'hover / active / focus / disabled / loading / pressed',
    '错误提示是否告诉用户下一步',
    '所有可交互元素可键盘操作',
    'icon-only 控件有可访问名称',
    'sticky/fixed 元素不遮住内容',
    '移动浏览器高度',
    '阻塞任务 > 交互错误 > 可访问性 > 信息层级 > 一致性 > 纯装饰',
  ]);
});

test('自然语言重新设计与精修会命中视觉设计专项', () => {
  for (const phrase of ['太丑', '重新设计', '高级点', '精修一下', 'UI审查', '做套设计系统']) {
    assert.ok(agent.includes(phrase), `openai.yaml 未识别 ${phrase}`);
  }
  assert.match(agent, /追加视觉设计专项/);
  assert.match(routing, /重新设计、精修、太丑、提升质感、UI\/UX 审查、建立设计系统/);
});
