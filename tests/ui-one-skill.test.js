'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const refs = path.join(skill, 'references');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch.js'));
const ui = fs.readFileSync(path.join(refs, 'ui-design-workflow.md'), 'utf8');
const frontendStack = fs.readFileSync(path.join(refs, 'frontend-stack.md'), 'utf8');

function expectAll(text, values, label) {
  for (const value of values) assert.ok(text.includes(value), `${label}缺少：${value}`);
}

test('前端实现阶段自动加载统一 UI 工作流', () => {
  const plan = planBatch('实现', ['前端']);
  assert.ok(plan.references.includes('frontend-interface-quality.md'));
  assert.ok(plan.references.includes('ui-design-workflow.md'));
  assert.ok(plan.references.includes('project-write-boundary.md'));
});

test('一个 production-engineering Skill 内完成 UI，不依赖外部 Skill 安装', () => {
  expectAll(ui, [
    '不要求再安装其他 UI Skill',
    '不要为了获得 UI 能力去执行 `skills add`',
    '业务执行仍只需要 `production-engineering` 一个 Skill',
  ], '单 Skill 规则');
});

test('React 与 Vue 都有项目感知的 shadcn 适配路径', () => {
  expectAll(ui, [
    'shadcn/ui + Tailwind CSS',
    '`components.json`',
    '`shadcn info --json`',
    'shadcn-vue + Tailwind CSS',
    '`shadcn-vue info --json`',
    '不得无审查重新初始化',
  ], '框架适配');
});

test('UI 工作流区分忠实迁移、新设计和精修', () => {
  expectAll(ui, [
    '忠实迁移模式',
    '新设计模式',
    '精修模式',
    '同一页面不能一边声称原样迁移、一边擅自换皮肤',
  ], '模式判断');
  expectAll(frontendStack, [
    '源码、演示站与实际运行效果共同作为证据',
    '不能把“不是 React”理解为“视觉规则失效”',
  ], '既有前端基线');
});

test('反 AI 模板与代表页门禁被明确写入', () => {
  expectAll(ui, [
    '反 AI 模板硬约束',
    '巨型统计 Card',
    '浏览器式多标签页',
    'Card 套 Card',
    '代表页未通过时，禁止把同一视觉方案批量复制到其他页面',
    '组件库拼装感',
    'AI Admin 模板感',
  ], 'UI 质量门禁');
});

test('长任务要求浏览器在环而不是 build 代替视觉验收', () => {
  expectAll(ui, [
    '浏览器在环',
    '稳定预览地址',
    'HMR/重启',
    '构建成功、组件能渲染、单张新版截图',
    '视觉未验证',
  ], '浏览器验收');
});
