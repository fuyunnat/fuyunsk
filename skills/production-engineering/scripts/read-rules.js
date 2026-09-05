#!/usr/bin/env node
'use strict';
// 可选的本地只读入口：不联网、不执行项目命令、不创建状态。
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const base=path.resolve(__dirname,'../references');
function fail(message){throw new Error(message);}
function loadManifest(dir=base){
  const data=JSON.parse(fs.readFileSync(path.join(dir,'rules-manifest.json'),'utf8'));
  if(data.version!==1||!Array.isArray(data.entries))fail('条款索引格式不支持');
  return data;
}
function select(manifest,selectors,source='原文'){
  if(!['原文','补充稿'].includes(source))fail('来源只能是“原文”或“补充稿”');
  const entries=manifest.entries.filter(e=>e.source===source);const chosen=new Set();
  for(const id of selectors){
    if(!/^(?:preface|\d{2}(?:-\d{2})?)$/.test(id))fail(`非法条款编号：${id}`);
    const found=entries.filter(e=>e.id===id||(id.length===2&&e.id.startsWith(`${id}-`)));
    if(!found.length)fail(`条款不存在：${id}`);
    for(const e of found)chosen.add(e);
  }
  return entries.filter(e=>chosen.has(e));
}
function content(entry,dir=base){
  const root=fs.realpathSync(dir);const p=path.resolve(root,entry.file);
  const relative=path.relative(root,p);
  if(relative.startsWith('..')||path.isAbsolute(relative))fail('拒绝读取技能目录外的文件');
  const real=fs.realpathSync(p);const rel=path.relative(root,real);
  if(rel.startsWith('..')||path.isAbsolute(rel))fail('拒绝越界符号链接');
  const b=fs.readFileSync(real);
  if(b.length!==entry.bytes||crypto.createHash('sha256').update(b).digest('hex')!==entry.sha256)fail(`条款内容校验失败：${entry.file}`);
  return b;
}
function main(args){
  const opts={source:'原文',ids:[],topics:[]};
  for(let i=0;i<args.length;i++){
    const a=args[i];
    if(a==='--help'||a==='-h'){console.log('用法：read-rules.js --topic 前端,接口 | --id 04-04 [--source 原文|补充稿] [--json]\n--list 只列主题；不执行任何工程操作。');return;}
    if(a==='--json'){opts.json=true;continue;}
    if(a==='--list'){opts.list=true;continue;}
    if(!['--topic','--id','--source'].includes(a))fail(`未知参数：${a}`);
    const v=args[++i];if(!v||v.startsWith('--'))fail(`参数缺少值：${a}`);
    if(a==='--source')opts.source=v;else opts[a==='--topic'?'topics':'ids'].push(...v.split(',').filter(Boolean));
  }
  const topics=JSON.parse(fs.readFileSync(path.join(base,'rule-topics.json'),'utf8'));
  if(opts.list){console.log(Object.keys(topics).join('、'));return;}
  for(const topic of opts.topics){if(!Object.hasOwn(topics,topic))fail(`未知主题：${topic}`);opts.ids.push(...topics[topic]);}
  if(!opts.ids.length)fail('请指定主题或条款编号；不会默认加载全部原文');
  if(opts.source!=='原文'&&opts.topics.length)fail('主题映射属于最后上传原文；补充稿请按编号读取');
  const entries=select(loadManifest(),opts.ids,opts.source);
  // 全部校验成功才输出，避免失败时把部分条款误认为完整结果。
  const out=entries.map(e=>({...e,text:content(e).toString('utf8')}));
  if(opts.json){console.log(JSON.stringify(out));return;}
  for(const e of out){console.log(`\n【${e.source} ${e.id}｜${e.sourceFile}:${e.startLine}–${e.endLine}】\n${e.text}`);}
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={loadManifest,select,content};
