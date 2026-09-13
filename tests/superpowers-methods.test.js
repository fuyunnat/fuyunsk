'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const refs = path.join(skill, 'references');
const readRef = name => fs.readFileSync(path.join(refs, name), 'utf8');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const agentic = readRef('agentic-execution.md');
const review = readRef('spec-review.md');
const routing = readRef('routing.md');
const upstream = readRef('upstream-notes.md');
const agent = read('skills/production-engineering/agents/openai.yaml');
const repoAgents = read('AGENTS.md');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch.js'));

const requireText = (body, values) => values.forEach(value => {
  assert.ok(body.includes(value), `缺少选择性吸收要求：${value}`);
});

test('复杂执行吸收持续执行、最小上下文子代理、独立并行和 fresh verification', () => {
  requireText(agentic, [
    '持续执行，不反复问“继续吗”',
    '最小任务包',
    '只有真正独立的事情才并行',
    '需求符合 → 代码质量',
    '收到评审意见先验证，不盲改',
    '最后一次相关代码修改之后',
    '新鲜证据',
  ]);
});

test('worktree 和子代理是按需工具，不会改变普通 Git 工作流', () => {
  requireText(agentic, [
    '创建新的 worktree 需要用户对这次隔离方式有明确授权',
    '普通分支仍是默认',
    '只清理本次明确创建且来源可证明的隔离工作区',
    '不因为本规则自动改变用户 Git 工作流',
  ]);
});

test('TDD 只吸收失败证据与红绿闭环，不采用删除已有实现的绝对规则', () => {
  requireText(agentic, [
    'TDD 吸收原则',
    '实际看到失败',
    '不照搬“只要测试不是先写，就必须删除现有生产代码”的绝对规则',
    '不能因为流程顺序删除用户有效实现',
    'Bug 快修仍以 `bugfix-fast-loop.md` 的最短证据链为主',
  ]);
});

test('不会把 brainstorming 与 using-superpowers 的绝对门禁照搬进来', () => {
  requireText(agentic, [
    '不采用“任何任务都必须先 brainstorming”的全局硬门',
    '不采用“相关 Skill 必须在任何响应前强制调用”的绝对规则',
    '不让 worktree、子代理、TDD、review 变成简单任务的额外仪式',
  ]);
});

test('复杂评审使用新鲜上下文双阶段复核且 review 反馈需技术验证', () => {
  requireText(review, [
    '新鲜上下文',
    '需求符合审查',
    '代码质量审查',
    '阻塞',
    '收到评审意见先验证，再实现',
    '复核修复本身带来的影响',
  ]);
});

test('代理执行只按需加载，普通 Bug 与小改不会常驻读取', () => {
  const heavy = planBatch('实现', ['代理执行']);
  assert.ok(heavy.references.includes('agentic-execution.md'));
  assert.ok(heavy.references.includes('spec-review.md'));

  const bug = planBatch('小改', ['故障修复']);
  assert.ok(!bug.references.includes('agentic-execution.md'));
  assert.ok(bug.references.includes('bugfix-fast-loop.md'));

  const frontend = planBatch('小改', ['前端']);
  assert.ok(!frontend.references.includes('agentic-execution.md'));
});

test('路由和默认 Agent 提示能进入复杂代理执行，但不强制普通任务', () => {
  requireText(routing, [
    '大型/多阶段、多个独立子任务、需要子代理/并行或独立复核',
    '`agentic-execution.md` + `spec-review.md`',
    '普通 Bug、小改、简单文档不因为支持子代理就加载这一层',
  ]);
  requireText(agent, [
    '大型、多阶段、多个相对独立子任务或需要独立复核时按需加载代理执行专项',
    '不反复问继续',
    '需求符合→代码质量双阶段复核',
    '最后一次修改后的新鲜证据',
  ]);
});

test('Skill 自身维护吸收 writing-skills 的行为回归驱动而不是只改 Markdown', () => {
  requireText(repoAgents, [
    '技能行为修改先锁回归',
    '回归/压力场景',
    '应该命中和不应该命中',
    '只加 reference 文件不算完成',
    '真实代理行为未验证',
  ]);
});

test('来源记录明确是选择性吸收而不是安装 Superpowers 整套规则', () => {
  requireText(upstream, [
    'obra/superpowers',
    'agentic-execution.md',
    '没有安装该技能集合',
    '所有任务先 brainstorming',
    '测试不先写就删生产代码',
    '所有相关 Skill 在任何响应前强制调用',
  ]);
});
