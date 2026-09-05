#!/usr/bin/env node
'use strict';
// 仅维护阶段执行：逐字节分段，不改写原稿或运行时配置。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const refs = path.join(root, 'skills/production-engineering/references');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const numbers = ['零','一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','二十一','二十二','二十三','二十四'];
const specs = [['原文','source-original.md','rules'], ['补充稿','source-speed.md','rules-speed']];

function splitSource(data, name, source, directory) {
  const lines = data.toString('utf8').match(/[^\n]*\n|[^\n]+$/g) || [];
  const marks = [{start: 0, offset: 0, id: 'preface', title: '适用目标与语言'}];
  let fence = null, chapter = null, sub = 0, offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r?\n$/, '');
    const delimiter = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (delimiter) {
      if (!fence) fence = delimiter[1];
      else if (delimiter[1][0] === fence[0] && delimiter[1].length >= fence.length && !delimiter[2].trim()) fence = null;
    } else if (!fence) {
      const head = line.match(/^(#{2,3}) (.+)$/);
      if (head) {
        if (head[1].length === 2) {
          const n = numbers.indexOf(head[2].split('、')[0]);
          if (n < 0) throw new Error(`无法识别章节：${source}:${i+1}`);
          chapter = String(n).padStart(2,'0'); sub = 0;
        } else if (chapter !== null) sub++;
        if (chapter !== null) {
          // 空白分隔属于下一段开头，既可无损重组，也不产生新增文件末尾空行。
          let start = i, begin = offset;
          while (start > marks[marks.length - 1].start && !lines[start - 1].trim()) {
            start--; begin -= Buffer.byteLength(lines[start]);
          }
          marks.push({start, offset: begin, id: `${chapter}-${String(sub).padStart(2,'0')}`, title: head[2]});
        }
      }
    }
    offset += Buffer.byteLength(lines[i]);
  }
  if (fence) throw new Error(`原稿代码围栏未闭合：${source}`);
  return marks.map((m,i) => {
    const end = marks[i+1]?.start ?? lines.length;
    const endByte = marks[i+1]?.offset ?? data.length;
    const content = data.subarray(m.offset,endByte);
    return {source: name, sourceFile: source, id: m.id, title:m.title, file:`${directory}/${m.id}.md`, startLine:m.start+1, endLine:end, startByte:m.offset, endByte, bytes:content.length, sha256:hash(content), content};
  });
}
function generated() {
  const lock=JSON.parse(fs.readFileSync(path.join(refs,'source-lock.json'),'utf8'));
  for (const [file,digest] of Object.entries(lock)) {
    if (hash(fs.readFileSync(path.join(refs,file)))!==digest) throw new Error(`原稿校验失败，禁止擅自更新锁值：${file}`);
  }
  const entries = specs.flatMap(([name,source,directory])=>splitSource(fs.readFileSync(path.join(refs,source)),name,source,directory));
  const files=new Map(entries.map(e=>[e.file,e.content]));
  files.set('rules-manifest.json',Buffer.from(JSON.stringify({version:1,sources:lock,entries:entries.map(({content,...meta})=>meta)},null,2)+'\n'));
  const rows=['# 原始规范逐段覆盖表','','由 `node scripts/build-rules.js` 生成；每个片段是对应原稿的原始字节，不是摘要。默认执行最后上传原文，补充稿差异按 `source-policy.md` 处理。','','| 来源 | 编号 | 原文标题 | 原稿行号 | 执行文件 | 字节 |','| --- | --- | --- | --- | --- | --- |'];
  for(const e of entries) rows.push(`| ${e.source} | ${e.id} | ${e.title.replaceAll('|','\\|')} | ${e.startLine}–${e.endLine} | [读取](${e.file}) | ${e.bytes} |`);
  rows.push('','索引含全部行和分隔符；程序按字节偏移核对连续覆盖并重建原稿。原始技术词、命令和代码保持原样。');
  files.set('rules-index.md',Buffer.from(rows.join('\n')+'\n'));
  return {entries,files};
}
function main() {
  const args=process.argv.slice(2);
  if(args.length>1 || (args.length===1 && args[0]!=='--check')) throw new Error('用法：node scripts/build-rules.js [--check]');
  const check=args[0]==='--check'; const {files,entries}=generated();
  for(const [rel,data] of files) {
    const dest=path.join(refs,rel);
    if(check) {
      if(!fs.existsSync(dest)||!fs.readFileSync(dest).equals(data)) throw new Error(`生成文件缺失或过期：${rel}`);
    } else {fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data);}
  }
  // 过期文件不直接删除，维护者须先确认并可恢复地移出。
  for(const dir of ['rules','rules-speed']) for(const file of fs.readdirSync(path.join(refs,dir))) if(!files.has(`${dir}/${file}`)) throw new Error(`存在未登记切片，请可恢复地处理：${dir}/${file}`);
  console.log(`原文保真${check?'校验':'生成'}通过：${entries.length} 个片段，两份原稿逐字节保留。`);
}
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={splitSource,generated};
