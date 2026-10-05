'use strict';
const { assertAgentDelegates } = require('./entry-contract-helper');
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
  assert.match(routing, /严格原样迁移不加载重设计/);
  assert.match(design, /不替代源码遵循、功能保护/);
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
  assertAgentDelegates(agent);
  assert.match(routing, /视觉设计：重新设计、精修、太丑/);
  assert.match(design, /UI\/UX 审查/);
  const plan = planBatch('实现', ['视觉设计']);
  assert.ok(plan.references.includes('frontend-design-intelligence.md'));

});

test('不会美工时自动接管设计判断并要求真实视觉复查', () => {
  for (const phrase of ['不会美工', '你来设计', '自行选择一个有依据的主方向', '不要求用户提供配色、字体或间距参数']) {
    assert.ok(design.includes(phrase), `缺少非设计师委托规则：${phrase}`);
  }
  assert.match(routing, /视觉设计：.*不会美工/);
  assert.match(routing, /追加 UI视觉验证/);
  assertAgentDelegates(agent);
  const plan = planBatch('实现', ['视觉设计', 'UI视觉验证']);
  assert.ok(plan.references.includes('frontend-design-intelligence.md'));
  assert.ok(plan.references.includes('ui-visual-verification.md'));
});

test('视觉复查不因后端有迁移副作用而阻断纯前端任务', () => {
  const visualCheck = fs.readFileSync(path.join(refs, 'ui-visual-verification.md'), 'utf8');
  for (const phrase of ['隔离的前端 mock', '不启动连接现有业务库的服务', '实际截图', '未验证']) {
    assert.ok(visualCheck.includes(phrase), `缺少隔离验收边界：${phrase}`);
  }
});

test('口语视觉反馈不要求固定提示词，纯问图也不擅自写入', () => {
  for (const phrase of ['这页怪怪的', '看着不顺眼', '有点乱', '你看着弄', '不用用户写固定提示词']) {
    assert.ok(design.includes(phrase), `缺少口语意图规则：${phrase}`);
  }
  assert.match(design, /只发截图.*没有改动意图.*不擅自改文件/);
  assert.match(routing, /视觉设计：.*你看着弄/);
  assert.match(routing, /纯提问\/仅发图不写文件/);
  assertAgentDelegates(agent);
});

test('产品页面过大占屏时检查密度而非全局缩小', () => {
  const visualCheck = fs.readFileSync(path.join(refs, 'ui-visual-verification.md'), 'utf8');
  for (const phrase of ['一屏只能看到', '首屏可见信息量', '按钮、卡片、弹窗', '不能用全局缩放']) {
    assert.ok(design.includes(phrase) || visualCheck.includes(phrase), `缺少尺寸密度规则：${phrase}`);
  }
  assert.match(visualCheck, /宽屏.*手机.*触控/);
  assert.match(routing, /尺寸\/密度、跑版、溢出或参考图追加 UI视觉验证/);
  assertAgentDelegates(agent);
  assert.match(fs.readFileSync(path.join(skill, 'SKILL.md'), 'utf8'), /太大占屏/);
});
