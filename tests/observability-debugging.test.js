'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const skill = path.resolve(__dirname, '../skills/production-engineering');
const read = file => fs.readFileSync(path.join(skill, file), 'utf8');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch'));

test('修 Bug 先复现、看懂根因再改、亲自验证，旧的读取次数上限已废止', () => {
  const fast = read('references/bugfix-fast-loop.md');
  for (const s of ['先复现', '读完整条相关路径', '日志不够就先补日志', '能用一句话说清根因再改', '亲自再试一次', '这一步我没法亲自确认']) assert.ok(fast.includes(s), s);
  assert.match(fast, /已废止/);
  assert.match(read('SKILL.md'), /先复现、看懂再改、亲自验证/);
  assert.match(read('references/quick-core.md'), /用改之前的同一套步骤再试一次/);
});

test('日志要能定位问题，缺日志就补，前端也记录', () => {
  const obs = read('references/observability-debugging.md');
  for (const s of ['入口', '关键分支', '外部调用', '堆栈', 'request_id', '项目缺日志就补上', '不需要用户另外要求', '前端也要记', '保留下来', '本次启动的日志文件完整路径']) assert.ok(obs.includes(s), s);
  assert.match(read('references/quick-core.md'), /项目没有日志就顺手补一个统一入口/);
});

test('日志默认写到 log 目录，每次启动新建带时间戳的文件', () => {
  const obs = read('references/observability-debugging.md');
  for (const s of ['项目根目录下的 `log/`', '每次进程启动新建一份带时间戳的日志文件', '不要追加到上一次启动的文件里', 'app-20261017-143052.log', '.gitignore', '本次启动的日志文件完整路径']) assert.ok(obs.includes(s), s);
  assert.match(read('references/quick-core.md'), /每次启动新建带时间戳的文件/);
  assert.match(read('references/source-policy.md'), /日志写到 log 文件、启动新建带时间戳（2026-10-17）/);
});

test('线上报错先分清 CDN、代理还是源站，不擅自改 CDN 配置', () => {
  const obs = read('references/observability-debugging.md');
  for (const s of ['先分清是哪一层', 'CF-Ray', '绕过 CDN 直接访问源站', '524', '525', 'CF-Connecting-IP', '可信代理', '需要用户明确同意']) assert.ok(obs.includes(s), s);
});

test('脱敏要求保持', () => {
  const obs = read('references/observability-debugging.md');
  for (const s of ['密码', '完整令牌', 'Cookie', '授权头']) assert.ok(obs.includes(s), s);
});

test('写代码和修 Bug 的读取都带上日志与排查规则，只读不额外加载', () => {
  assert.ok(planBatch('小改', ['故障修复']).references.includes('observability-debugging.md'));
  assert.ok(planBatch('实现', ['前端']).references.includes('observability-debugging.md'));
  assert.ok(planBatch('实现', ['后端']).references.includes('observability-debugging.md'));
  assert.ok(!planBatch('只读', ['前端']).references.includes('observability-debugging.md'));
});

test('项目内普通编辑不再每次跑路径检查，高风险写入仍须检查', () => {
  const boundary = read('references/project-write-boundary.md');
  for (const s of ['减少重复预检', '不必每次运行检查脚本', '复制/解压/同步/批量生成', '终端命令会写文件']) assert.ok(boundary.includes(s), s);
});
