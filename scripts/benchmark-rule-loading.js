#!/usr/bin/env node
'use strict';

// 仅维护时手动运行；比较相同输出的分开读取与批量读取，不调用模型或业务命令。
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { planBatch } = require('../skills/production-engineering/scripts/rule-batch');
const root = path.resolve(__dirname, '..');
const script = path.join(root, 'skills/production-engineering/scripts/read-rules.js');
const refs = path.join(root, 'skills/production-engineering/references');
const args = process.argv.slice(2);
const runs = args.length === 2 && args[0] === '--runs' ? Number(args[1]) : 7;
if ((args.length && !(args.length === 2 && args[0] === '--runs')) || !Number.isInteger(runs) || runs < 1 || runs > 50) {
  console.error('用法：node scripts/benchmark-rule-loading.js [--runs 1至50]');
  process.exit(1);
}
function execute(args) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`读取失败：${result.stderr}`);
  return result.stdout;
}
const median = a => {
  const s = [...a].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};
const cases = [
  { name: '局部文档修改', stage: '小改', topics: ['内容'] },
  { name: '前端实现', stage: '实现', topics: ['前端'] },
  { name: '只读安全审计', stage: '只读', topics: ['审计'] },
  { name: '提交阶段', stage: '提交', topics: [] },
];
const rows = [];
for (const item of cases) {
  const plan = planBatch(item.stage, item.topics);
  const plainArgs = [script, '--topic', plan.topics.join(','), '--json'];
  if (plan.ids.length) plainArgs.push('--id', plan.ids.join(','));
  const batchArgs = [script, '--stage', item.stage, '--json'];
  if (item.topics.length) batchArgs.push('--topic', item.topics.join(','));
  const separate = () => ({
    rules: JSON.parse(execute(plainArgs)),
    references: plan.references.map(file => ({
      file,
      text: execute(['-e', 'process.stdout.write(require("node:fs").readFileSync(process.argv[1]))', path.join(refs, file)]),
    })),
  });
  const batch = () => JSON.parse(execute(batchArgs));
  const old = separate(), current = batch();
  assert.deepEqual(current.rules, old.rules);
  assert.deepEqual(current.references.map(({ file, text }) => ({ file, text })), old.references);
  const times = { separate: [], batch: [] };
  for (let i = 0; i < runs; i++) {
    for (const [name, fn] of i % 2 ? [['batch', batch], ['separate', separate]] : [['separate', separate], ['batch', batch]]) {
      const start = performance.now(); fn(); times[name].push(performance.now() - start);
    }
  }
  rows.push({
    场景: item.name, 重复次数: runs, 内容逐字节一致: true,
    分开读取次数: 1 + plan.references.length, 批量读取次数: 1,
    分开读取中位毫秒: +median(times.separate).toFixed(2),
    批量读取中位毫秒: +median(times.batch).toFixed(2),
    原文及专项字节: [...current.rules, ...current.references, ...current.rules.flatMap(e => e.amendments || [])].reduce((n, e) => n + Buffer.byteLength(e.text), 0),
  });
}
console.log(JSON.stringify({
  说明: '比较一次原文读取加逐个专项读取，与一次合并读取。旧版已支持多主题，此基线不是逐条原文串行读取；能自行合并工具的客户端未必有同样收益。',
  限制: '仅本机进程和文件读取，不包含模型、网络、客户端初始化、业务执行或验证。不能作为 Codex 端到端提速证据。',
  环境: { node: process.version, platform: process.platform, arch: process.arch },
  结果: rows,
}, null, 2));
