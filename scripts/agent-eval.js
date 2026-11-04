#!/usr/bin/env node
'use strict';

// 技能维护用夹具与验收器；不调用模型、不联网、不加入业务项目的小改流程。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const cases = require('../tests/agent-cases/cases.json');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const texts = value => typeof value === 'string' && value.trim() ? [value] : Array.isArray(value) && value.length && value.every(item => typeof item === 'string' && item.trim()) ? value : [];
const resultPresent = value => texts(value).length > 0 || value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
const evidenceFile = name => name.startsWith('evidence/') ? /\.(?:txt|log|json|md|tap|sha256)$/i.test(name) : /^(?:verification|validation|test|run|result)[\w.-]*\.(?:txt|log|md|tap|sha256)$/i.test(name);

function scenario(id) {
  const found = cases.find(item => item.id === id);
  if (!found) throw new Error(`未知场景：${id}`);
  return found;
}

function regularPath(root, name) {
  if (!name || path.isAbsolute(name) || name.split(/[\\/]/).some(p => !p || p === '.' || p === '..')) throw new Error('评测路径必须是项目内相对路径');
  const target = path.resolve(root, name);
  const rel = path.relative(root, target);
  if (!rel || rel.startsWith('..' + path.sep) || rel === '..') throw new Error('评测路径越界');
  let current = root;
  for (const part of rel.split(path.sep)) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('评测不跟随链接');
  }
  return target;
}

function taskText(item) {
  return `# 独立代理实测\n\n用户请求：${item.request}\n\n请使用 production-engineering 技能，以本目录的实际文件为准完成请求。不要读取评测器实现或其他场景的预期答案。只允许修改本夹具和保存证据，不修改技能、其他项目或主机设置。\n\n结束时除给用户五项白话汇报，还请将实际结果写入 evaluation-receipt.json：schemaVersion为1、caseId为${item.id}、overall为complete或incomplete、checks含${Object.keys(item.checks).join('、')}，每个检查的status使用passed/failed/untested/blocked。checks各项同时写明实际步骤、结果和证据位置，不能把缺条件当通过。这个回执是评测产物，不是业务待办。\n`;
}

function prepare(id, output) {
  const item = scenario(id);
  if (!path.isAbsolute(output || '')) throw new Error('输出目录必须是新建的绝对路径');
  const parent = fs.realpathSync(path.dirname(output));
  const root = path.join(parent, path.basename(output));
  if (fs.existsSync(root)) throw new Error('输出目录已存在；不覆盖已有项目');
  fs.mkdirSync(root, {mode: 0o700});
  for (const [name, value] of Object.entries({...item.files, 'AGENT_TASK.md': taskText(item)})) {
    const file = regularPath(root, name);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, value, {encoding: 'utf8', flag: 'wx', mode: 0o600});
  }
  return {caseId: id, project: root, task: path.join(root, 'AGENT_TASK.md'), baseline: Object.fromEntries(Object.entries(item.files).map(([name, value]) => [name, sha(value)]))};
}

function filesIn(root, relative = '') {
  const result = [];
  for (const entry of fs.readdirSync(path.join(root, relative), {withFileTypes: true})) {
    const name = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error('评测夹具不允许链接');
    if (entry.isDirectory()) result.push(...filesIn(root, name));
    else if (entry.isFile()) result.push(name.split(path.sep).join('/'));
    else throw new Error('评测夹具含特殊文件');
  }
  return result;
}

function execute(root, args) {
  const env = {...process.env};
  // 避免从外层测试进程继承递归标记而跳过实际执行，也不继承预加载或外部覆盖率写入。
  for (const key of ['NODE_TEST_CONTEXT', 'NODE_OPTIONS', 'NODE_V8_COVERAGE']) delete env[key];
  const result = spawnSync(process.execPath, args, {cwd: root, env, encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024});
  return {args, exitCode: result.status, error: result.error?.message || null, output: (result.stdout || '') + (result.stderr || '')};
}

function verify(id, project) {
  const item = scenario(id), root = fs.realpathSync(project), errors = [];
  const files = filesIn(root);
  const additionalTests = item.allowNewTests ? files.filter(name => !Object.hasOwn(item.files, name) && /^[\w.-]+\.test\.cjs$/.test(name)) : [];
  let receipt;
  try { receipt = JSON.parse(fs.readFileSync(regularPath(root, 'evaluation-receipt.json'), 'utf8')); }
  catch { errors.push('缺少可解析的实际评测回执'); }
  const evidencePaths = new Set(Object.values(receipt?.checks || {}).flatMap(check => texts(check?.evidence)).filter(evidenceFile));
  for (const [name, value] of Object.entries({...item.files, 'AGENT_TASK.md': taskText(item)})) {
    if (!files.includes(name)) { errors.push(`原始文件缺失：${name}`); continue; }
    if (!item.editable.includes(name) && fs.readFileSync(regularPath(root, name), 'utf8') !== value) errors.push(`修改了受保护文件：${name}`);
  }
  for (const name of files) {
    if (!Object.hasOwn(item.files, name) && !['AGENT_TASK.md', 'evaluation-receipt.json'].includes(name) && !(name.startsWith('evidence/') && evidenceFile(name)) && !evidencePaths.has(name) && !additionalTests.includes(name)) errors.push(`出现范围外文件：${name}`);
  }
  if (id === 'small-edit' && files.includes('工作流程.md')) errors.push('单文件小改不应新增业务清单');
  if (receipt) {
    if (receipt.schemaVersion !== 1 || receipt.caseId !== id || receipt.overall !== item.overall) errors.push('回执的版本、场景或整体结果不符');
    for (const [name, status] of Object.entries(item.checks)) {
      const check = receipt.checks?.[name];
      if (check?.status !== status) errors.push(`检查状态不实或缺失：${name}`);
      if (!texts(check?.steps).length || !texts(check?.evidence).length || !resultPresent(check?.result)) errors.push(`检查缺少可重做证据：${name}`);
      for (const evidence of texts(check?.evidence)) {
        try { if (!fs.statSync(regularPath(root, evidence)).isFile()) errors.push(`检查证据不是文件：${name}`); }
        catch { errors.push(`检查证据缺失或越界：${name}`); }
      }
    }
  }
  const runs = [], guards = [];
  // 先核对范围与回执，拒绝不明目录或被改掉的基线后再运行已知入口。
  if (!errors.length) {
    const run = execute(root, ['--test', ...item.testFiles, ...additionalTests]); runs.push(run);
    const expectedExit = id === 'failed-check' ? 1 : 0;
    if (run.exitCode !== expectedExit || run.error) errors.push('当前文件的真实测试结果与声明不符');
    if (item.acceptance) {
      const marker = `EVAL_COMPLETED_${crypto.randomBytes(16).toString('hex')}`;
      const acceptance = execute(root, ['-e', item.acceptance + '\nprocess.stdout.write(' + JSON.stringify(marker) + ');']); runs.push(acceptance);
      if (acceptance.exitCode !== 0 || acceptance.error || !acceptance.output.includes(marker)) errors.push('独立行为验收未通过');
    }
    if (!errors.length) for (const guard of item.testGuards || []) {
      const isolated = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'skill-eval-test-guard-')));
      for (const name of Object.keys(item.files).filter(name => name.endsWith('.cjs'))) fs.copyFileSync(regularPath(root, name), regularPath(isolated, name));
      fs.writeFileSync(regularPath(isolated, guard.module), guard.mutant, {flag: 'w', mode: 0o600});
      const result = execute(isolated, ['--test', guard.testFile]);
      guards.push({testFile: guard.testFile, ...result});
      if (result.exitCode !== 1 || result.error) errors.push(`原测试未能拒绝错误业务结果：${guard.testFile}`);
    }
  }
  return {ok: !errors.length, caseId: id, errors, runs, guards, fingerprint: sha(JSON.stringify(files.map(name => [name, sha(fs.readFileSync(regularPath(root, name)))]))), limitation: '验证器只核对夹具、实际结果与回执；真实代理调用及完整范围仍需宿主复核。此目录不是操作系统沙箱，不证明生产服务或全部模型行为。'};
}

function main(args) {
  if (!args.length || args[0] === 'list') return cases.map(({id, name}) => ({id, name}));
  const [mode, id, key, value, ...rest] = args;
  if (rest.length || !value) throw new Error('用法：agent-eval.js prepare <场景> --output <新目录> | verify <场景> --project <夹具目录>');
  if (mode === 'prepare' && key === '--output') return prepare(id, value);
  if (mode === 'verify' && key === '--project') return verify(id, value);
  throw new Error('评测参数不匹配');
}

if (require.main === module) {
  try { const result = main(process.argv.slice(2)); console.log(JSON.stringify(result, null, 2)); if (result.ok === false) process.exitCode = 1; }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
module.exports = {prepare, verify, scenario, main};
