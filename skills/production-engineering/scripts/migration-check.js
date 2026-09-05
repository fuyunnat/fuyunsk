#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const core = require('./migration-core');
const { redactCommand } = require('./task-state-core');

function parse(args) {
  const command = args.shift(); const options = {}; let program = [];
  while (args.length) {
    const key = args.shift();
    if (key === '--') { program = args; break; }
    if (key === '--json') { options.json = true; continue; }
    if (!['--repo', '--manifest', '--case', '--output', '--timeout-ms'].includes(key)) throw new Error(`未知参数：${key}`);
    if (Object.hasOwn(options, key.slice(2))) throw new Error(`重复参数：${key}`);
    const value = args.shift();
    if (!value || value.startsWith('--')) throw new Error(`参数缺少值：${key}`);
    options[key.slice(2)] = value;
  }
  return { command, options, program };
}
function runCase(repo, file, options, program) {
  const context = core.load(file); const { manifest, inventory } = context;
  const caseIds = (options.case || '').split(',');
  if (new Set(caseIds).size !== caseIds.length || !caseIds.every(id => context.cases.has(id))) throw new Error('请指定盘点基线中的不重复验收编号');
  if (caseIds.includes('resume-drill')) core.artifact(context.dir, manifest.handoff);
  if (!program.length) throw new Error('run 必须在 -- 后提供已审查的验证程序及参数');
  if (!options.output || /[\\\0:]/.test(options.output) || path.isAbsolute(options.output) || options.output.split('/').some(s => !s || s === '.' || s === '..' || s === '.git')) {
    throw new Error('凭据输出必须是台账目录内的相对文件路径');
  }
  const out = path.resolve(context.dir, options.output);
  const parent = fs.realpathSync(path.dirname(out));
  if (parent !== context.dir && !parent.startsWith(context.dir + path.sep)) throw new Error('拒绝越界输出目录');
  if (fs.existsSync(out)) throw new Error('不覆盖旧凭据；请使用新的结果文件名');
  const timeout = Number(options['timeout-ms'] || 120000);
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 600000) throw new Error('验证超时必须在 1–600000 毫秒之间');
  const before = core.targetDigest(repo, manifest.targetFiles);
  const executedAt = new Date().toISOString();
  // 仅显式 run 会启动用户指定程序；不把清单里的字符串作为 shell 执行。
  const result = spawnSync(program[0], program.slice(1), { cwd: repo, shell: false, timeout,
    encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  let after; let error = result.error?.code || null;
  try { after = core.targetDigest(repo, manifest.targetFiles); } catch { error = '目标文件在验证中变得不可读'; }
  const exitCode = Number.isInteger(result.status) ? result.status : 1;
  const receipt = { format: 'fuyunsk-migration-receipt-v1',
    ...(caseIds.length === 1 ? { caseId: caseIds[0] } : { caseIds }),
    handoffSha256: caseIds.includes('resume-drill') ? manifest.handoff.sha256 : null,
    baselineSha256: manifest.baseline.sha256, sourceRevision: inventory.sourceRevision,
    targetDigest: before, afterDigest: after || null, executedAt,
    command: [redactCommand(program)], exitCode, error,
    status: exitCode === 0 && !error && before === after ? 'passed' : 'failed',
    stdoutSha256: core.hash(result.stdout || ''), stderrSha256: core.hash(result.stderr || '') };
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const response = { caseId: options.case, status: receipt.status,
    evidence: { path: options.output, sha256: core.hash(fs.readFileSync(out)) },
    note: '将此证据登记到台账 checks；命令退出成功不替代对测试断言和新旧行为的审查。' };
  process.stdout.write(JSON.stringify(response, null, 2) + '\n');
  if (receipt.status !== 'passed') process.exitCode = 1;
}
function main(args) {
  if (!args.length || ['--help', '-h', 'help'].includes(args[0])) {
    console.log('用法：migration-check.js check --repo <项目> --manifest <台账> [--json]\n      migration-check.js run --repo <项目> --manifest <台账> --case <验收编号[,编号]> --output <新凭据相对路径> [--timeout-ms 120000] -- <程序> <参数...>\ncheck 只读；run 执行前须确认授权和隔离环境，不自动切换或删除。');
    return;
  }
  const { command, options, program } = parse([...args]);
  if (!options.repo || !options.manifest) throw new Error('必须明确指定 --repo 和 --manifest');
  const repo = fs.realpathSync(options.repo); const file = path.resolve(repo, options.manifest);
  if (command === 'run') return runCase(repo, file, options, program);
  if (command !== 'check' || program.length || options.case || options.output || options['timeout-ms']) throw new Error('check 不接受执行程序或写入参数');
  const result = core.checkMigration(repo, file);
  console.log(options.json ? JSON.stringify(result, null, 2) : `${result.ok ? '迁移清单与证据检查通过' : '迁移尚未通过完成检查'}\n${result.errors.join('\n')}\n${result.limitation}`);
  if (!result.ok) process.exitCode = 1;
}
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 2; }
}
module.exports = { main, parse };
