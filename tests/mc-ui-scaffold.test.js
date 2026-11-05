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
  assert.match(stack, /Morphicons 官网/);
});

test('脚手架裁剪演示业务、替换品牌并接真实数据，不把演示逻辑当生产', () => {
  const scaffold = read('references/mc-ui-scaffold.md');
  for (const s of ['mock/', '演示登录', '替换梦创 UI 名称', '数据服务层', '不能把演示 transport', '记录提交 SHA', '不使用 npm 上的同名包']) {
    assert.ok(scaffold.includes(s), s);
  }
});

test('mc-ui 上游版本锁定，不在普通任务中自动追踪 main', () => {
  const scaffold = read('references/mc-ui-scaffold.md');
  for (const s of ['记录提交 SHA', 'main` 会继续变化', '不在每次任务中自动拉取更新', '只在明确要求时同步', '选择性合并', '禁止把上游目录整份覆盖']) {
    assert.ok(scaffold.includes(s), s);
  }
  assert.match(read('references/frontend-stack.md'), /来源提交要锁定并记录，后续不自动追踪 `main`/);
});

test('设计基线写明 mc-ui 的无边框分层、黑色主按钮与统一状态', () => {
  const scaffold = read('references/mc-ui-scaffold.md');
  for (const s of ['全站不用描边', '--layer-canvas', '--fill-subtle', '阴影只给浮层', '主按钮是近黑', '--focus-ring', '--fill-hatch', 'StatusBadge', '`Panel` + `PanelHeader`', '224px', '1200px', '已有前端只作参考']) {
    assert.ok(scaffold.includes(s), s);
  }
});

test('已有非 mc-ui 前端借鉴结构但继承原项目配色', () => {
  const scaffold = read('references/mc-ui-scaffold.md');
  for (const s of ['借鉴它的页面层次', '不直接搬它的颜色', 'Geist/Vercel 色板', '先从现有项目提取一份简短映射', '没有对应 token 时', '参考 mc-ui”不等于换成 mc-ui 的黑白主按钮']) {
    assert.ok(scaffold.includes(s), s);
  }
  assert.match(read('references/frontend-stack.md'), /先做原项目 token 映射/);
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

test('明确授权的独立新模板是已有前端不并存默认的例外', () => {
  assert.ok(planBatch('实现', ['前端']).references.includes('mc-ui-scaffold.md'));
  const scaffold = read('references/mc-ui-scaffold.md');
  const independent = scaffold.split(/\n\s*\n/).filter(p => /独立.{0,25}(?:新模板|新前端)|新模板|新前端/.test(p)).join('\n');
  assert.ok(independent, '应在选路时明确独立新模板的授权例外');
  assert.ok(/明确|授权|用户指定/.test(independent), '例外必须来自用户明确的新模板要求');
  assert.ok(/例外|不适用|不能.{0,20}(?:一律|禁止)|允许/.test(independent), '不能让已有前端默认禁止覆盖独立模板授权');
  assert.ok(/mc-ui|MC-UI/.test(independent) && /布局|样式|视觉|组件/.test(independent), '独立模板采用明确指定的设计参考');
  assert.ok(/业务|功能/.test(independent) && /API|接口/.test(independent), '继续复用旧业务契约');
  assert.ok(/旧模板|原模板|旧前端/.test(independent) && /保留|隔离|不动|不改/.test(independent), '旧模板应保留');
  assert.ok(scaffold.includes('不并存第二套组件库'), '普通已有前端参考的默认保护继续保留');
});
