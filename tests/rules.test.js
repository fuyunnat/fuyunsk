'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const refs=path.join(root,'skills/production-engineering/references');
const {splitSource,generated}=require('../scripts/build-rules');
const {loadManifest,select,content}=require('../skills/production-engineering/scripts/read-rules');
const state=require('../skills/production-engineering/scripts/task-state-core');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fixed={
 'source-original.md':'452be0f79ded97517c0ca6fcf5eb455528548dc565ad4120ba65a79f0d2671e8',
 'full-production-engineering.md':'35adb27495a86713e712275d17925b5f8cbc84c291664ed82e24cae533c9cadc',
 'source-speed.md':'a13db3c27742e341f1b6c9570cde51deaf9ac750c2da39123b624aac45e53d9d',
};
const manifest=loadManifest();
test('两份上传原稿与锁定的独立校验值完全相同',()=>{
 for(const [f,h] of Object.entries(fixed))assert.equal(hash(fs.readFileSync(path.join(refs,f))),h);
});
for(const source of ['原文','补充稿'])test(`${source}全部字节连续覆盖并能无损拼回`,()=>{
 const es=manifest.entries.filter(e=>e.source===source);let offset=0,line=1;
 for(const e of es){assert.equal(e.startByte,offset);assert.equal(e.startLine,line);assert.equal(e.endByte-e.startByte,e.bytes);assert.equal(hash(content(e)),e.sha256);offset=e.endByte;line=e.endLine+1;}
 const raw=fs.readFileSync(path.join(refs,es[0].sourceFile));assert.equal(offset,raw.length);assert.deepEqual(Buffer.concat(es.map(e=>content(e))),raw);
 assert.equal(new Set(es.filter(e=>e.id!=='preface').map(e=>e.id.slice(0,2))).size,25);
});
test('生成结果与已发布切片和覆盖表逐字节一致',()=>{
 for(const [file,bytes] of generated().files)assert.deepEqual(fs.readFileSync(path.join(refs,file)),bytes,file);
});
test('代码围栏中的伪标题不会成为规则分段',()=>{
 const raw=Buffer.from('# 标题\r\n\r\n## 零、原则\r\n```text\r\n## 一、不是章节\r\n```\r\n### 小节\r\n原样保留\r\n');
 const es=splitSource(raw,'测试','fixture.md','rules');assert.deepEqual(es.map(e=>e.id),['preface','00-00','00-01']);assert.deepEqual(Buffer.concat(es.map(e=>e.content)),raw);
});
test('未闭合围栏必须失败，不能静默漏掉后文',()=>assert.throws(()=>splitSource(Buffer.from('## 零、原则\n```\n正文\n'),'测试','x','r'),/未闭合/));
test('重叠条款只读取一次且顺序稳定',()=>assert.deepEqual(select(manifest,['09','09-00','09']).map(e=>e.id),['09-00']));
test('未知编号和路径穿越请求失败',()=>{
 assert.throws(()=>select(manifest,['99']),/不存在/);assert.throws(()=>select(manifest,['../source-original']),/非法/);assert.throws(()=>select(manifest,['09'],'未知'),/来源/);
});
test('篡改的片段与越界索引失败',()=>{
 const e=select(manifest,['09'])[0];assert.throws(()=>content({...e,sha256:'0'.repeat(64)}),/校验失败/);assert.throws(()=>content({...e,file:'../../../../etc/passwd'}),/目录外/);
});
test('默认不读取全文，缺少参数必须报错',()=>{
 const r=spawnSync(process.execPath,[path.join(root,'skills/production-engineering/scripts/read-rules.js')],{encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/不会默认加载全部原文/);assert.equal(r.stdout,'');
});
test('条款读取不修改源文件',()=>{
 const before=manifest.entries.map(e=>[e.file,fs.statSync(path.join(refs,e.file)).mtimeMs]);select(manifest,['09','04-04']).forEach(e=>content(e));for(const [f,t] of before)assert.equal(fs.statSync(path.join(refs,f)).mtimeMs,t);
});
test('中文状态显示兼容旧版英文状态文件',()=>{
 const old='- Task ID: fixture\n- Task status: active\n- Implementation status: in progress\n- Verification status: pending\n- Latest user goal: 中文任务\n';
 const parsed=state.parseState(old);const chinese=state.renderState(parsed);assert.match(chinese,/# 任务状态/);assert.match(chinese,/- 任务状态: 进行中/);assert.equal(state.parseState(chinese)['Task status'],'active');assert.equal(state.parseState(chinese)['Implementation status'],'in progress');assert.equal(state.parseState(chinese)['Latest user goal'],'中文任务');
});
test('所有主要状态中文来回转换不改变内部协议',()=>{
 for(const [f,values] of [['Task status',['active','blocked','complete']],['Implementation status',['not started','in progress','complete']],['Verification status',['pending','passed','failed','unavailable']],['Current mode',['read-only','implementation']]])for(const v of values)assert.equal(state.parseState(state.renderState({[f]:v}))[f],v);
});
test('所有原文章节均可经主题读取到，不存在孤立章节',()=>{
 const topics=JSON.parse(fs.readFileSync(path.join(refs,'rule-topics.json'),'utf8'));const reached=new Set(select(manifest,Object.values(topics).flat()).map(e=>e.id));
 for(const e of manifest.entries.filter(e=>e.source==='原文'))assert.ok(reached.has(e.id),`未被主题覆盖的条款：${e.id}`);
});

test('无损切片不制造新增文件末尾空白行',()=>{ for(const e of manifest.entries)assert.ok(!/\n[ \t]*\n$/.test(content(e).toString('utf8')),e.file); });
