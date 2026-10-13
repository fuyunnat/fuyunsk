'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const skill = path.resolve(__dirname, '../skills/production-engineering');
const read = file => fs.readFileSync(path.join(skill, file), 'utf8');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch'));

test('无前端用 mc-ui 当脚手架，已有前端沿用自身框架与视觉', () => {
  const scaffold = read('references/mc-ui-scaffold.md');
  for (const s of ['https://github.com/MoeAgent/mc-ui', '没有任何前端', '沿用该项目自己的框架', '不并存第二套组件库', '目标目录已存在且非空时停止']) {
    assert.ok(scaffold.includes(s), s);
  }
  const stack = read('references/frontend-stack.md');
  assert.match(stack, /没有前端的项目用 mc-ui 当脚手架/);
  assert.match(stack, /已有前端且不是 mc-ui 时继续沿用该项目自己的框架/);
});

test('mc-ui 脚手架保持 TypeScript 与 Lucide，其余新设计仍用 Morphicons', () => {
  const scaffold = read('references/mc-ui-scaffold.md');
  for (const s of ['TypeScript', '`lucide-react`', '不转 JavaScript', '不把图标换成 Morphicons']) assert.ok(scaffold.includes(s), s);
  const stack = read('references/frontend-stack.md');
  assert.match(stack, /mc-ui 的项目沿用其 `lucide-react` 图标/);
  assert.match(stack, /统一通过 \[Morphicons 官网\]/);
});

test('脚手架裁剪演示业务、替换品牌并接真实数据，不把演示逻辑当生产', () => {
  const scaffold = read('references/mc-ui-scaffold.md');
  for (const s of ['mock/', '演示登录', '替换梦创 UI 名称', '数据服务层', '不能把演示 transport', '记录提交 SHA', '不使用 npm 上的同名包']) {
    assert.ok(scaffold.includes(s), s);
  }
});

test('设计基线写明 mc-ui 的无边框分层、黑色主按钮与统一状态', () => {
  const scaffold = read('references/mc-ui-scaffold.md');
  for (const s of ['全站不用描边', '--layer-canvas', '--fill-subtle', '阴影只给浮层', '主按钮是近黑', '--focus-ring', '--fill-hatch', 'StatusBadge', '`Panel` + `PanelHeader`', '224px', '1200px', '已有前端只作参考']) {
    assert.ok(scaffold.includes(s), s);
  }
});

test('授权与许可边界有记录', () => {
  assert.match(read('references/source-policy.md'), /无前端用 mc-ui 脚手架的明确授权（2026-10-13）/);
  assert.match(read('references/mc-ui-scaffold.md'), /未附开源许可证/);
});

test('前端读取自动带上 mc-ui 专项，单纯前端故障修复不额外加载', () => {
  assert.ok(planBatch('实现', ['前端']).references.includes('mc-ui-scaffold.md'));
  assert.ok(!planBatch('小改', ['前端', '故障修复']).references.includes('mc-ui-scaffold.md'));
  assert.ok(!planBatch('实现', ['后端']).references.includes('mc-ui-scaffold.md'));
  assert.ok(read('SKILL.md').includes('mc-ui-scaffold.md'));
  assert.ok(read('references/routing.md').includes('mc-ui-scaffold.md'));
});
