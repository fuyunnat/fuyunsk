#!/usr/bin/env node
'use strict';

// 可选的本地只读入口：不联网、不执行项目命令、不创建状态。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { planBatch, stages } = require('./rule-batch');
const base = path.resolve(__dirname, '../references');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function loadManifest(dir = base) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, 'rules-manifest.json'), 'utf8'));
  if (data.version !== 1 || !Array.isArray(data.entries)) throw new Error('条款索引格式不支持');
  return data;
}

function select(manifest, selectors, source = '原文') {
  if (!['原文', '补充稿'].includes(source)) throw new Error('来源只能是“原文”或“补充稿”');
  const entries = manifest.entries.filter(e => e.source === source);
  const chosen = new Set();
  for (const id of selectors) {
    if (!/^(?:preface|\d{2}(?:-\d{2})?)$/.test(id)) throw new Error(`非法条款编号：${id}`);
    const found = entries.filter(e => e.id === id || (id.length === 2 && e.id.startsWith(`${id}-`)));
    if (!found.length) throw new Error(`条款不存在：${id}`);
    for (const e of found) chosen.add(e);
  }
  return entries.filter(e => chosen.has(e));
}

function readWithin(file, dir = base) {
  const root = fs.realpathSync(dir);
  const dest = path.resolve(root, file);
  const inside = p => {
    const rel = path.relative(root, p);
    return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
  };
  if (!inside(dest)) throw new Error('拒绝读取技能目录外的文件');
  const real = fs.realpathSync(dest);
  if (!inside(real)) throw new Error('拒绝越界符号链接');
  return fs.readFileSync(real);
}

function content(entry, dir = base) {
  const bytes = readWithin(entry.file, dir);
  if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) {
    throw new Error(`条款内容校验失败：${entry.file}`);
  }
  return bytes;
}

function parse(args) {
  const opts = { source: '原文', ids: [], topics: [], references: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') { opts.help = true; continue; }
    if (a === '--json') { opts.json = true; continue; }
    if (a === '--list') { opts.list = true; continue; }
    if (!['--topic', '--id', '--source', '--stage', '--reference'].includes(a)) {
      throw new Error(`未知参数：${a}`);
    }
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(`参数缺少值：${a}`);
    if (a === '--source') opts.source = value;
    else if (a === '--stage') {
      if (opts.stage) throw new Error('一次只指定一个当前阶段，不能重复 --stage');
      opts.stage = value;
    } else {
      const key = { '--topic': 'topics', '--id': 'ids', '--reference': 'references' }[a];
      opts[key].push(...value.split(',').filter(Boolean));
    }
  }
  return opts;
}

function readBatch(opts, dir = base) {
  if (opts.stage && opts.source !== '原文') throw new Error('阶段批量读取仅使用最后上传原文');
  if (!opts.stage && opts.references.length) throw new Error('--reference 必须与 --stage 一起使用');
  const plan = opts.stage ? planBatch(opts.stage, opts.topics, opts.references) : null;
  const topics = JSON.parse(fs.readFileSync(path.join(dir, 'rule-topics.json'), 'utf8'));
  const ids = [...opts.ids, ...(plan?.ids || [])];
  for (const topic of plan?.topics || opts.topics) {
    if (!Object.hasOwn(topics, topic)) throw new Error(`未知主题：${topic}`);
    ids.push(...topics[topic]);
  }
  if (!ids.length) throw new Error('请指定主题或条款编号；不会默认加载全部原文');
  if (opts.source !== '原文' && opts.topics.length) {
    throw new Error('主题映射属于最后上传原文；补充稿请按编号读取');
  }
  const entries = select(loadManifest(dir), ids, opts.source);
  // 所有条款与专项文件先完整读取，任一失败不输出部分成功结果。
  const rules = entries.map(e => ({ ...e, text: content(e, dir).toString('utf8') }));
  // 原文保持逐字节可追溯；最新选型作为额外说明随第九章返回，旧 text 不被篡改。
  const frontend = rules.find(e => e.id.startsWith('09-'));
  if (frontend) {
    const file = 'frontend-stack.md';
    const bytes = readWithin(file, dir);
    frontend.amendments = [{ file, bytes: bytes.length, sha256: hash(bytes), text: bytes.toString('utf8') }];
  }
  if (!plan) return rules; // 保持旧数组与原字段；仅第九章增加 amendments 元数据。
  const references = plan.references.map(file => {
    const bytes = readWithin(file, dir);
    return { file, bytes: bytes.length, sha256: hash(bytes), text: bytes.toString('utf8') };
  });
  return { stage: plan.stage, topics: plan.topics, rules, references };
}

function main(args) {
  const opts = parse(args);
  if (opts.help) {
    console.log(`用法：read-rules.js --topic 前端,接口 | --id 04-04 [--source 原文|补充稿] [--json]
批量：read-rules.js --stage 实现 --topic 前端,接口 [--reference design-testing.md] [--json]
阶段：${stages.join('、')}。--list 只列主题；所有方式均不执行工程操作。
选择阶段前须判断只读、风险与授权；阶段只是读取清单，不能代替这些判断。
验证、提交等后续阶段用于已开始的任务；新任务从中途开始时追加 --topic 通用,适用方式。`);
    return;
  }
  if (opts.list) {
    console.log(Object.keys(JSON.parse(fs.readFileSync(path.join(base, 'rule-topics.json'), 'utf8'))).join('、'));
    return;
  }
  const out = readBatch(opts);
  if (opts.json) { process.stdout.write(`${JSON.stringify(out)}\n`); return; }
  const rules = Array.isArray(out) ? out : out.rules;
  const amendments = new Map(rules.flatMap(e => (e.amendments || []).map(a => [a.file, a])));
  const parts = rules.map(e => `\n【${e.source} ${e.id}｜${e.sourceFile}:${e.startLine}–${e.endLine}】\n${e.text}\n`);
  parts.unshift(...[...amendments.values()].map(e =>
    `【当前生效的定向修改 ${e.file}：下方原文旧选型仅供追溯】\n${e.text}\n`));
  if (!Array.isArray(out)) {
    parts.unshift(`【批量读取：${out.stage}；只提供条款，不代表已执行、已验证或已授权】\n`);
    for (const e of out.references) parts.push(`\n【专项说明 ${e.file}】\n${e.text}\n`);
  }
  process.stdout.write(parts.join(''));
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { loadManifest, select, content, parse, readBatch };
