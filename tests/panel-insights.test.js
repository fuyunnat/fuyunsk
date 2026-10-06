'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const skill = path.resolve(__dirname, '../skills/production-engineering');
const { registerProjects, createPanelServer } = require(path.join(skill, 'scripts/progress-panel'));
const { readChanges, readDiff, evidenceFiles, readEvidence } = require(path.join(skill, 'scripts/panel-insights'));
const { parseWorkflow } = require(path.join(skill, 'scripts/progress-parser'));
function repo(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-insights-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
  git('init'); git('config','user.name','Panel Fixture'); git('config','user.email','panel@example.invalid');
  fs.mkdirSync(path.join(root,'web'));fs.writeFileSync(path.join(root,'web/app.ts'),'const size = 12;\n');
  git('add','web/app.ts');git('commit','-m','fixture');
  return { root, git, project: registerProjects([{ root }])[0], base: git('rev-parse','HEAD') };
}
test('真实 Git 显示已暂存、未暂存和新增文件，任务基准可追溯已提交改动', async t => {
  const f = repo(t);fs.writeFileSync(path.join(f.root,'web/app.ts'),'const size = 14;\n');
  f.git('add','web/app.ts');fs.writeFileSync(path.join(f.root,'web/new.ts'),'export const n = 1;\n');
  let changes = await readChanges(f.project, { id:'A', base:'' });
  assert.equal(changes.status,'ready');assert.match(changes.source,/未提交/);assert.equal(changes.files.length,2);
  const app=changes.files.find(file=>file.path==='web/app.ts');assert.equal(app.category,'前端');
  assert.match((await readDiff(f.project,{ id:'A',base:'' },app.id)).text,/\+const size = 14/);
  assert.match((await readDiff(f.project,{ id:'A',base:'' },changes.files.find(file=>file.path==='web/new.ts').id)).text,/export const n/);
  f.git('add','web/new.ts');f.git('commit','-m','change');
  assert.equal((await readChanges(f.project,{ id:'A',base:'' })).files.length,0);
  changes=await readChanges(f.project,{ id:'A',base:f.base });assert.match(changes.source,/任务基准/);assert.equal(changes.files.length,2);
  const task=parseWorkflow(`## 任务：A — 当前\n基准：${f.base}\n- [ ] W001【进行中】实现`)[0];assert.equal(task.base,f.base);
});
test('改动预览拒绝敏感路径、符号链接、伪造 ID、无效基准及换根，不执行 Git 扩展',async t=>{
  const f=repo(t);fs.writeFileSync(path.join(f.root,'.env'),'PASSWORD=super-secret');
  fs.writeFileSync(path.join(f.root,'web/app.ts'),'const size = 14;\nconst api_key = "sk-sensitive-value";\n');
  const hook=path.join(f.root,'hook.sh');fs.writeFileSync(hook,'#!/bin/sh\ntouch ran-hook\n');fs.chmodSync(hook,0o700);
  f.git('config','core.fsmonitor',hook);f.git('config','diff.external',hook);
  f.git('config','filter.fixture.clean',hook);f.git('config','filter.fixture.process',hook);f.git('config','filter.fixture.required','true');fs.writeFileSync(path.join(f.root,'.gitattributes'),'*.ts filter=fixture\n');
  const changes=await readChanges(f.project,{id:'A',base:''});assert.ok(!changes.files.some(file=>file.path==='.env'));
  const app=changes.files.find(file=>file.path==='web/app.ts');const diff=await readDiff(f.project,{id:'A',base:''},app.id);
  assert.doesNotMatch(diff.text,/sk-sensitive-value/);assert.match(diff.text,/隐藏/);assert.ok(!fs.existsSync(path.join(f.root,'ran-hook')));
  await assert.rejects(readDiff(f.project,{id:'A',base:''},'../../.env'));
  assert.equal((await readChanges(f.project,{id:'A',base:'--output=bad'})).status,'unavailable');
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'panel-outside-'));t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
  fs.writeFileSync(path.join(outside,'private.ts'),'do-not-display');fs.symlinkSync(path.join(outside,'private.ts'),path.join(f.root,'web/link.ts'));
  const next=await readChanges(f.project,{id:'A',base:''});assert.ok(!next.files.some(file=>file.path==='web/link.ts'));
  fs.renameSync(f.root,f.root+'-old');t.after(()=>fs.rmSync(f.root+'-old',{recursive:true,force:true}));fs.symlinkSync(outside,f.root);
  assert.equal((await readChanges(f.project,{id:'A',base:''})).status,'unavailable');
});
test('证据只允许清单显式链接的本项目截图和日志，拒绝外链、越界、SVG 和秘密文件',t=>{
  const f=repo(t);fs.mkdirSync(path.join(f.root,'work'));
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8WQAAAAASUVORK5CYII=','base64');
  fs.writeFileSync(path.join(f.root,'work/check.png'),png);fs.writeFileSync(path.join(f.root,'work/test.log'),'2 tests passed\nAPI_KEY=do-not-display\n');
  const task=parseWorkflow('## 任务：A — 验收\n- [ ] W001【待验证】页面；证据：[截图](work/check.png) [日志](work/test.log) [外部](https://evil/a.png) [越界](../a.png) [秘密](.env) [SVG](work/a.svg)')[0];
  const files=evidenceFiles(task);assert.equal(files.length,2);
  assert.equal(readEvidence(f.project,task,files[0].id).type,'image/png');
  const log=readEvidence(f.project,task,files[1].id);assert.match(log.body.toString(),/2 tests passed/);assert.doesNotMatch(log.body.toString(),/do-not-display/);
  assert.throws(()=>readEvidence(f.project,task,'unregistered'));
  fs.unlinkSync(path.join(f.root,'work/check.png'));fs.symlinkSync('/etc/hosts',path.join(f.root,'work/check.png'));
  assert.throws(()=>readEvidence(f.project,task,files[0].id));
});
test('真实 HTTP 改动与附件固定项目/任务/文件 ID，仍拒绝写入和跨站请求',async t=>{
  const f=repo(t);fs.writeFileSync(path.join(f.root,'web/app.ts'),'const size = 16;\n');
  fs.mkdirSync(path.join(f.root,'work'));fs.writeFileSync(path.join(f.root,'work/check.log'),'PASS: unit\nPASSWORD=hidden-value\n');
  fs.writeFileSync(path.join(f.root,'工作流程.md'),'## 任务：A — 当前\n- [ ] W001【进行中】页面；证据：[日志](work/check.log)');
  const server=createPanelServer([f.project]);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const base=`http://127.0.0.1:${server.address().port}`,route=`/api/insights/${f.project.id}/A`;
  const result=await(await fetch(base+route)).json();assert.equal(result.changes.status,'ready');
  const file=result.changes.files.find(file=>file.path==='web/app.ts');
  assert.match((await(await fetch(`${base}/api/diff/${f.project.id}/A/${file.id}`)).json()).text,/size = 16/);
  const log=await fetch(`${base}/api/evidence/${f.project.id}/A/${result.attachments[0].id}`);assert.equal(log.status,200);assert.match(log.headers.get('content-type'),/text\/plain/);assert.doesNotMatch(await log.text(),/hidden-value/);
  assert.ok((await(await fetch(base+'/api/health')).json()).features.includes('insights'));
  assert.equal((await fetch(base+'/panel-tools.js')).status,200);
  assert.equal((await fetch(base+route,{method:'POST'})).status,405);
  assert.equal((await fetch(base+route,{headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal((await fetch(base+route+'?path=.env')).status,400);
  assert.equal((await fetch(`${base}/api/diff/${f.project.id}/A/fake`)).status,404);
  assert.equal((await fetch(`${base}/api/insights/${f.project.id}/OTHER`)).status,404);
});

test('非 Git 项目和外置工作树明确不可用；大差异截断、超大新文件与日志拒绝读取',async t=>{
  const f=repo(t);fs.writeFileSync(path.join(f.root,'web/app.ts'),'// visible\n'.repeat(10000));
  let changes=await readChanges(f.project,{id:'A',base:''});const diff=await readDiff(f.project,{id:'A',base:''},changes.files[0].id);
  assert.equal(diff.truncated,true);assert.ok(Buffer.byteLength(diff.text)<=64*1024);
  fs.writeFileSync(path.join(f.root,'web/huge.ts'),'x'.repeat(129*1024));changes=await readChanges(f.project,{id:'A',base:''});await assert.rejects(readDiff(f.project,{id:'A',base:''},changes.files.find(file=>file.path==='web/huge.ts').id));
  fs.mkdirSync(path.join(f.root,'work'));fs.writeFileSync(path.join(f.root,'work/huge.log'),'x'.repeat(65*1024));
  const task=parseWorkflow('## 任务：A — 验收\n- [ ] W001【待验证】检查；证据：[日志](work/huge.log)')[0];assert.throws(()=>readEvidence(f.project,task,evidenceFiles(task)[0].id));
  const plain=path.join(f.root,'plain');fs.mkdirSync(plain);const project=registerProjects([{root:plain}])[0];assert.equal((await readChanges(project,{id:'A',base:''})).status,'unavailable');
  fs.writeFileSync(path.join(plain,'.git'),'gitdir: ../.git\n');assert.match((await readChanges(project,{id:'A',base:''})).error,/外置/);
});

test('面板专项保持有限基准、升级和复制纪律，入口接通且不内联扩张',()=>{
  const rules=fs.readFileSync(path.join(skill,'references/workflow-progress-panel.md'),'utf8');
  for(const phrase of ['已有基准保留','不重置','不猜历史基准','未归属本轮','不能每轮重启','不强杀','只复制到剪贴板','不作为新增授权','不自动截屏'])assert.ok(rules.includes(phrase),phrase);
  for(const file of ['SKILL.md','references/routing.md','scripts/rule-batch.js'])assert.ok(fs.readFileSync(path.join(skill,file),'utf8').includes('workflow-progress-panel.md'),file);
  for(const file of ['panel.js','panel-tools.js'])assert.doesNotMatch(fs.readFileSync(path.join(skill,'assets/progress-panel',file),'utf8'),/innerHTML|insertAdjacentHTML|eval\(/);
});
