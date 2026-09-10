'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skillDir = path.join(root, 'skills/production-engineering');
const refs = path.join(skillDir, 'references');
const read = p => fs.readFileSync(p, 'utf8');
const { planBatch } = require(path.join(skillDir, 'scripts/rule-batch.js'));

const behavior = read(path.join(refs, 'behavior-preservation.md'));
const database = read(path.join(refs, 'database-upgrade-safety.md'));
const bugfix = read(path.join(refs, 'bugfix-fast-loop.md'));

test('全局行为保护明确要求旧新兼容而不是一刀切', () => {
  for (const value of [
    '兼容优先：旧新先共存，禁止无授权一刀切',
    '旧客户端、旧接口、旧字段、旧数据、旧配置、旧协议、旧消息、旧缓存/会话、旧任务或仍在运行的旧版本',
    '淘汰旧路径是单独动作',
    '新版本能跑”本身不能证明旧路径可以删除',
  ]) assert.ok(behavior.includes(value), `缺少兼容优先规则：${value}`);
});

test('兼容规则覆盖 API 配置数据格式和数据库', () => {
  for (const value of [
    'API / 请求字段 / 返回字段',
    '配置 / 环境变量',
    '数据格式 / 文件 / 消息 / 缓存 / 会话',
    '数据库',
  ]) assert.ok(behavior.includes(value), `缺少兼容场景：${value}`);
});

test('数据库升级要求滚动发布期间旧新版本都能工作', () => {
  assert.match(database, /不能只保证新版能读，而让仍在线的旧版马上失效/);
  assert.match(database, /库没删数据，但旧程序已经读不了/);
  assert.match(database, /仍受支持的旧版本路径和一个新版本路径/);
  assert.match(database, /“连接新数据库”/);
});

test('Bug 修复不能靠切断旧路径获得表面成功', () => {
  assert.match(bugfix, /修目标 Bug 不等于授权切断旧路径/);
  assert.match(bugfix, /同时支持旧新路径的最小修复/);
});

test('所有会写代码的常见通道仍加载行为兼容保护', () => {
  for (const [stage, topics] of [
    ['小改', ['故障修复']],
    ['实现', ['前端']],
    ['实现', ['后端']],
    ['实现', ['接口']],
    ['实现', ['数据库']],
  ]) {
    const plan = planBatch(stage, topics);
    assert.ok(plan.references.includes('behavior-preservation.md'), `${stage}/${topics.join(',')} 未加载行为兼容保护`);
  }
});
