'use strict';
const { assertAgentDelegates } = require('./entry-contract-helper');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const refs = path.join(skill, 'references');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const craft = fs.readFileSync(path.join(refs, 'code-craft.md'), 'utf8');
const routing = fs.readFileSync(path.join(refs, 'routing.md'), 'utf8');
const agent = read('skills/production-engineering/agents/openai.yaml');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch.js'));

const requireText = (body, values) => values.forEach(value => {
  assert.ok(body.includes(value), `缺少 Code Craft 要求：${value}`);
});

test('Code Craft 覆盖正规工程代码的核心维度', () => {
  requireText(craft, [
    '单一职责',
    'God Object / God Function',
    '契约、类型和边界',
    '业务不变量',
    '错误处理分层',
    '依赖方向与副作用',
    '数据结构与复杂度',
    'O(n²)',
    'N+1 查询',
    '让代码天然可测试',
    '提交前做代码工艺自检',
    '保持务实，不把科班变成仪式',
    '解耦分三件事，不要只记拆文件',
    '拆文件按原文第七章 `rules/07-02.md`',
    '不为了增加文件数量',
    '隔离易变依赖按下面第六部分',
    '没有真实替换、测试或边界价值就不新增接口',
    '拆完后用户能看到的结果保持不变，见 `behavior-preservation.md`',
  ]);
});

test('复杂业务必须写解释为什么和约束的维护注释', () => {
  requireText(craft, [
    '写代码时需要注释',
    '非显而易见的业务规则',
    '历史兼容原因',
    '金额/精度/舍入',
    '并发、锁、幂等、重试、事务、补偿、缓存一致性',
    '安全、权限、签名、加密、回调校验',
    '移除条件',
    '公开导出的函数、类、组件、Hook、接口',
    '半年后的维护者',
  ]);
});

test('注释不能退化成逐行翻译、过期说明或注释掉的死代码', () => {
  requireText(craft, [
    '逐行翻译代码的废话',
    '改逻辑时必须同步改注释或删除失效注释',
    '大段注释解释本应通过命名/拆函数就能表达的混乱代码',
    '注释掉的大段旧代码',
  ]);
});

test('代码小改和实现自动加载 Code Craft，Bug 同时保留快速修复规则', () => {
  const frontend = planBatch('小改', ['前端']);
  assert.ok(frontend.references.includes('code-craft.md'));

  const backend = planBatch('实现', ['后端']);
  assert.ok(backend.references.includes('code-craft.md'));

  const bug = planBatch('小改', ['故障修复']);
  assert.ok(bug.references.includes('code-craft.md'));
  assert.ok(bug.references.includes('bugfix-fast-loop.md'));
  assert.ok(bug.references.includes('behavior-preservation.md'));
});

test('纯内容、纯规划、只读和验证不会无谓加载 Code Craft', () => {
  assert.ok(!planBatch('小改', ['内容']).references.includes('code-craft.md'));
  assert.ok(!planBatch('实现', ['规划清单']).references.includes('code-craft.md'));
  assert.ok(!planBatch('只读', ['前端']).references.includes('code-craft.md'));
  assert.ok(!planBatch('验证', ['前端']).references.includes('code-craft.md'));

  const mixed = planBatch('实现', ['内容', '前端']);
  assert.ok(mixed.references.includes('code-craft.md'), '内容任务同时改前端代码时仍应加载 Code Craft');
});

test('路由接到代码工艺，Agent 调用入口而不复制细则', () => {
  requireText(routing, ['写代码默认应用专业代码工艺', '`code-craft.md`']);
  requireText(craft, ['注释是维护契约', '移除条件', '逐行翻译代码的废话']);
  assertAgentDelegates(agent);
});
