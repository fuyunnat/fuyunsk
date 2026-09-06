'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const refs = path.join(skill, 'references');
const policy = fs.readFileSync(path.join(refs, 'frontend-stack.md'), 'utf8');
const reader = require(path.join(skill, 'scripts/read-rules.js'));

test('源码与演示站共同作为前端证据，演示凭证不持久化', () => {
  for (const value of [
    '源码、演示站与实际运行效果共同作为证据',
    '不能二选一',
    '演示站默认只读',
    '不写入源码、Git、`工作流程.md`',
    '不能因为演示站暂时打不开',
  ]) assert.ok(policy.includes(value), `缺少前端参考基线规则：${value}`);
});

test('指定 Vue 不取消当前 Design System，也不冒充官方 React 组件', () => {
  for (const value of [
    '框架选择与 Design System 分离',
    '不能把“不是 React”理解为“视觉规则失效”',
    '官方 shadcn/ui React 组件不得直接塞进 `.vue`',
    '不能谎称使用了官方 React shadcn/ui 组件',
    '后台自由设计',
  ]) assert.ok(policy.includes(value), `缺少跨框架视觉规则：${value}`);
});

test('多页面后台先验收代表页并支持长任务实时预览', () => {
  for (const value of [
    '多页面后台先定代表页，再批量扩散',
    '不能先批量铺完几十个页面再做视觉验收',
    '长任务边开发、边运行、边验证',
    'Vite HMR',
    '稳定的用户端、管理后台和 API 本地访问地址',
  ]) assert.ok(policy.includes(value), `缺少 UI 防扩散/预览规则：${value}`);
});

test('所有前端规则读取路径继续自动附带最新 frontend-stack', () => {
  for (const args of [
    ['--topic', '前端'],
    ['--id', '09'],
    ['--stage', '实现', '--topic', '前端'],
  ]) {
    const out = reader.readBatch(reader.parse(args));
    const rules = Array.isArray(out) ? out : out.rules;
    const frontend = rules.find(e => e.id === '09-00');
    assert.ok(frontend);
    assert.equal(frontend.amendments.length, 1);
    assert.equal(frontend.amendments[0].file, 'frontend-stack.md');
    assert.equal(frontend.amendments[0].text, policy);
  }
});
