'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const script = path.join(root, 'skills/production-engineering/scripts/read-rules.js');
const refs = path.join(root, 'skills/production-engineering/references');
const reader = require(script);
const { planBatch, stages } = require('../skills/production-engineering/scripts/rule-batch');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const run = args => spawnSync(process.execPath, [script, ...args], {
  encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
});

for (const stage of stages) test(`${stage}阶段：一次读取结果与原条款及专项文件逐字节相同`, () => {
  const result = run(['--stage', stage, '--topic', '前端,接口', '--json']);
  assert.equal(result.status, 0, result.stderr);
  const out = JSON.parse(result.stdout);
  assert.equal(out.stage, stage);
  const legacy = run(['--topic', out.topics.join(','), '--id', '06-00', '--json']);
  assert.equal(legacy.status, 0, legacy.stderr);
  assert.deepEqual(out.rules, JSON.parse(legacy.stdout));
  assert.equal(new Set(out.rules.map(e => e.id)).size, out.rules.length);
  assert.equal(new Set(out.references.map(e => e.file)).size, out.references.length);
  for (const e of out.references) {
    const b = fs.readFileSync(path.join(refs, e.file));
    assert.equal(e.text, b.toString('utf8'));
    assert.equal(e.sha256, sha(b));
    assert.equal(e.bytes, b.length);
  }
});

test('多领域批量保留前端、接口、数据库和并发安全条款', () => {
  const out = reader.readBatch(reader.parse(['--stage', '实现', '--topic', '前端,接口,数据库,并发']));
  const ids = new Set(out.rules.map(e => e.id));
  for (const id of ['00-00', '00-02', '01-00', '02-01', '02-05', '02-06', '03-00', '06-00', '07-01', '09-00', '10-00', '13-00', '14-00', '17-00', '20-00']) {
    assert.ok(ids.has(id), `不能省略 ${id}`);
  }
});

test('只读审计不额外读取状态恢复或任务分支流程', () => {
  const out = reader.readBatch(reader.parse(['--stage', '只读', '--topic', '审计']));
  assert.ok(out.rules.some(e => e.id === '19-00'));
  assert.ok(!out.rules.some(e => e.id === '02-06' || e.id.startsWith('04-')));
  assert.ok(!out.references.some(e => e.file === 'context-memory-continuity.md'));
});

test('小改阶段不自动增加推送评审或状态恢复', () => {
  const out = reader.readBatch(reader.parse(['--stage', '小改', '--topic', '内容']));
  assert.ok(out.rules.some(e => e.id === '00-02'), '快速读取不能隐去风险升级条件');
  assert.ok(out.rules.some(e => e.id === '20-00'), '小改仍须验证');
  assert.ok(!out.rules.some(e => e.id === '02-06' || e.id.startsWith('04-')));
});

test('旧命令及 JSON 数组接口保持兼容', () => {
  for (const args of [['--topic', '前端,接口'], ['--id', '04-04'], ['--id', '01-01', '--source', '补充稿']]) {
    const r = run([...args, '--json']);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(Array.isArray(JSON.parse(r.stdout)));
  }
});

test('无参数、未知阶段、混用来源和非法专项路径不能输出部分规则', () => {
  for (const args of [[], ['--stage', '未定义'], ['--stage', '只读', '--topic', '未知'],
    ['--stage', '实现', '--source', '补充稿'], ['--reference', 'design-testing.md'],
    ['--stage', '实现', '--stage', '推送'], ['--stage', '实现', '--reference', '../../秘密.md'],
    ['--stage', '实现', '--reference', '__proto__'], ['--stage']]) {
    const r = run(args);
    assert.notEqual(r.status, 0);
    assert.equal(r.stdout, '');
    assert.ok(r.stderr.trim());
  }
});

test('同一专项说明显式重复指定只输出一次', () => {
  const p = planBatch('实现', ['前端', '前端'], ['frontend-interface-quality.md']);
  assert.equal(p.references.filter(f => f === 'frontend-interface-quality.md').length, 1);
  assert.throws(() => planBatch('__proto__'), /未知/);
});

test('原文校验错误及专项缺失不会被当作完整成功', () => {
  // 测试副本留在系统临时目录，不触碰或永久删除用户文件。
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-batch-test-'));
  fs.cpSync(refs, dir, { recursive: true });
  fs.appendFileSync(path.join(dir, 'rules/09-00.md'), '\n篡改');
  const opts = reader.parse(['--stage', '实现', '--topic', '前端']);
  assert.throws(() => reader.readBatch(opts, dir), /校验失败/);
  fs.copyFileSync(path.join(refs, 'rules/09-00.md'), path.join(dir, 'rules/09-00.md'));
  fs.renameSync(path.join(dir, 'frontend-interface-quality.md'), path.join(dir, 'frontend.backup'));
  assert.throws(() => reader.readBatch(opts, dir), /ENOENT/);
  fs.symlinkSync(path.join(root, 'README.md'), path.join(dir, 'frontend-interface-quality.md'));
  assert.throws(() => reader.readBatch(opts, dir), /越界符号链接/);
});

test('新增批量读取不修改技能文件或运行项目和网络命令', () => {
  const before = fs.statSync(path.join(refs, 'rules-manifest.json')).mtimeMs;
  const out = reader.readBatch(reader.parse(['--stage', '实现', '--topic', '前端']));
  assert.ok(out.rules.length > 0);
  assert.equal(fs.statSync(path.join(refs, 'rules-manifest.json')).mtimeMs, before);
  for (const file of [script, path.join(path.dirname(script), 'rule-batch.js')]) {
    const code = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(code, /require\(['"](?:node:)?(?:child_process|http|https|net)['"]\)/);
    assert.doesNotMatch(code, /fs\.(?:write|append|rm|unlink|mkdir)/);
  }
});


test('普通实现不预读长任务续航，显式续航和规划仍完整可达', () => {
  const regular = planBatch('实现', ['前端']);
  assert.ok(!regular.references.includes('context-memory-continuity.md'));
  assert.ok(regular.references.includes('task-lanes.md'));
  assert.ok(regular.references.includes('behavior-preservation.md'));
  assert.ok(regular.references.includes('bounded-completion.md'));
  for (const topics of [['续航'], ['规划清单'], ['代理执行']]) {
    assert.ok(planBatch('实现', topics).references.includes('context-memory-continuity.md'), topics.join(','));
  }
  assert.ok(planBatch('实现', ['前端'], ['context-memory-continuity.md']).references.includes('context-memory-continuity.md'));
});

test('单纯前端故障修复只读实现纪律，不误载设计与后台配置专项', () => {
  for (const stage of ['小改', '实现']) {
    const out = reader.readBatch(reader.parse(['--stage', stage, '--topic', '前端,故障修复']));
    const names = new Set(out.references.map(e => e.file));
    for (const required of [
      'bugfix-fast-loop.md', 'frontend-interface-quality.md', 'behavior-preservation.md',
      'bounded-completion.md', 'workflow-checklist.md', 'project-write-boundary.md',
    ]) assert.ok(names.has(required), required);
    assert.ok(!names.has('ui-design-workflow.md'));
    assert.ok(!names.has('configuration-localization.md'));
    assert.ok(out.rules.some(e => e.id === '20-00'));
    const frontend = out.rules.find(e => e.id === '09-00');
    assert.ok(frontend?.amendments?.some(e => e.file === 'frontend-stack.md'));
  }
});

test('视觉/配置/交付混合修复及显式专项仍完整加载，不扩大或缩减授权', () => {
  for (const domain of ['视觉设计', 'UI视觉验证', '前端交付', '配置化', '接口', '模板二开']) {
    const normal = planBatch('实现', ['前端', '故障修复', domain]);
    assert.ok(normal.references.includes('ui-design-workflow.md'), domain);
    assert.ok(normal.references.includes('configuration-localization.md'), domain);
  }
  const forced = planBatch('小改', ['前端', '故障修复'],
    ['ui-design-workflow.md', 'configuration-localization.md']);
  assert.ok(forced.references.includes('ui-design-workflow.md'));
  assert.ok(forced.references.includes('configuration-localization.md'));
  assert.ok(planBatch('实现', ['前端']).references.includes('ui-design-workflow.md'));
  assert.ok(planBatch('实现', ['前端']).references.includes('configuration-localization.md'));
});
