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

test('原样迁移、现有页面参考与独立新模板的业务和视觉基准分开', () => {
  const out = reader.readBatch(reader.parse(['--stage', '实现', '--topic', '前端']));
  const rules = Array.isArray(out) ? out : out.rules;
  const loaded = rules.find(e => e.id === '09-00').amendments.find(e => e.file === 'frontend-stack.md').text;
  const independent = loaded.split(/\n\s*\n/).filter(p => /独立.{0,25}(?:新模板|新前端)|新模板|新前端/.test(p)).join('\n');
  assert.ok(independent, '读取到的规则应先识别独立新模板，而不是一律继承旧视觉');
  for (const concept of [/业务|功能/, /API|接口/, /字段/, /权限/]) assert.ok(concept.test(independent), '旧源码仍是业务契约依据');
  assert.ok(/(?:指定|新|参考|mc-ui|MC-UI)[\s\S]{0,100}(?:视觉|设计|布局|样式)/.test(independent), '新模板视觉应以指定参考为准');
  assert.ok(/(?:不|禁止)[\s\S]{0,80}(?:照搬|继承|复用|嵌入)[\s\S]{0,80}(?:布局|样式|组件|CSS)|(?:布局|样式|组件)[\s\S]{0,60}(?:不照搬|不继承|不复用)/.test(independent), '不能把旧视觉组件当新模板业务复用');
  assert.ok(/(?:保留|不改|不动|隔离)[\s\S]{0,50}(?:旧|原)(?:模板|前端)|(?:旧|原)(?:模板|前端)[\s\S]{0,60}(?:保留|不改|不动|隔离)/.test(independent), '独立新模板不能改坏旧模板');
  assert.ok(/原样迁移|原样保留，只换框架/.test(loaded), '原样迁移仍受原貌保护');
  for (const concept of [/配色|颜色/, /字体/, /图标/]) assert.ok(concept.test(loaded), '普通已有前端参考仍保护原视觉');
});
