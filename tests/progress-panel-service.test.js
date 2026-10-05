'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const skill = path.resolve(__dirname, '../skills/production-engineering');
const { ensurePanel, stopPanel, probe, runtimeDirectory, readLock } = require(path.join(skill, 'scripts/progress-panel-service'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function freePort() {
  const s = http.createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r));
  const p = s.address().port; await new Promise(r => s.close(r)); return p;
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-service-test-'));
  const original = '## 任务：A — 项目\n- [ ] A001【进行中】实现\n';
  fs.writeFileSync(path.join(root, '工作流程.md'), original); fs.writeFileSync(path.join(root, '.env'), 'DO_NOT_READ=secret');
  const ports=[]; t.after(async () => { for(const port of ports) await stopPanel({projects:[{root}],port,explicitPort:true}); fs.rmSync(root,{recursive:true,force:true}); }); return { root, original, ports };
}
async function waitFor(fn, message) {
  const until = Date.now() + 7000;
  while (Date.now() < until) { const result = await fn(); if (result) return result; await delay(60); }
  assert.fail(message);
}
function cli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(skill, 'scripts/progress-panel-service.js'), ...args]); let stdout='', stderr='';
    child.stdout.on('data', b => stdout+=b); child.stderr.on('data', b => stderr+=b); child.on('error', reject);
    child.on('close', code => resolve({code, stdout, stderr}));
  });
}

test('真实健康接口识别面板而不是任意 200 页面', async t => {
  const {root} = fixture(t), port = await freePort();
  const server = http.createServer((req,res) => res.end(JSON.stringify({ application: 'other-service' })));
  await new Promise(r=>server.listen(port,'127.0.0.1',r)); t.after(()=>new Promise(r=>server.close(r)));
  assert.equal((await probe(port)).healthy, false);
  await assert.rejects(ensurePanel({projects:[{root}],port,explicitPort:true}), /占用/);
  assert.equal((await fetch(`http://127.0.0.1:${port}`)).status, 200);
});

test('并发 CLI 自动启动仅一个守护；杀掉面板子进程后恢复，清单和配置不变', async t => {
  const {root,original,ports} = fixture(t), port=await freePort(); ports.push(port);
  const args=['--ensure','--project',root,'--port',String(port)];
  const results=await Promise.all([cli(args),cli(args),cli(args)]);
  for(const r of results) assert.equal(r.code,0,r.stderr);
  const before=await probe(port); assert.equal(before.healthy,true);
  assert.deepEqual(before.data.projectIds,require(path.join(skill,'scripts/progress-panel')).registerProjects([{root}]).map(p=>p.id));
  const lock=readLock(runtimeDirectory(),port); assert.ok(lock.pid>0);
  const again=await ensurePanel({projects:[{root}],port,explicitPort:true}); assert.equal(again.status,'reused');
  assert.equal(readLock(runtimeDirectory(),port).pid,lock.pid);
  process.kill(before.data.pid,'SIGKILL');
  const recovered=await waitFor(async()=>{const p=await probe(port);return p.healthy && p.data.pid!==before.data.pid ? p:false;},'面板未自动恢复');
  assert.equal(recovered.data.instanceId,before.data.instanceId);
  assert.equal(readLock(runtimeDirectory(),port).pid,lock.pid);
  assert.equal(fs.readFileSync(path.join(root,'工作流程.md'),'utf8'),original);
  assert.equal(fs.readFileSync(path.join(root,'.env'),'utf8'),'DO_NOT_READ=secret');
  const stop=await stopPanel({projects:[{root}],port,explicitPort:true}); assert.equal(stop.stopped,true);
  await waitFor(async()=>!(await probe(port)).occupied,'停止后仍监听端口');
  await delay(500); assert.equal((await probe(port)).healthy,false);
  const restarted=await ensurePanel({projects:[{root}],port,explicitPort:true});assert.equal(restarted.status,'started');
});

test('默认端口被别的服务占用时另选本机端口，不停止、不接管现有服务', async t => {
  const {root,ports}=fixture(t), port=await freePort();
  const server=http.createServer((req,res)=>res.end('foreign'));
  await new Promise(r=>server.listen(port,'127.0.0.1',r)); t.after(()=>new Promise(r=>server.close(r)));
  const r=await ensurePanel({projects:[{root}],port,explicitPort:false});
  ports.push(r.port);
  assert.notEqual(r.port,port); assert.equal(await (await fetch(`http://127.0.0.1:${port}`)).text(),'foreign');
});

test('不停止其他项目的守护；运行锁是私有运行记录，不包含任务进度', async t => {
  const a=fixture(t),b=fixture(t),port=await freePort();
  a.ports.push(port); await ensurePanel({projects:[{root:a.root}],port,explicitPort:true});
  await assert.rejects(stopPanel({projects:[{root:b.root}],port,explicitPort:true}), /其他项目/);
  assert.equal((await probe(port)).healthy,true);
  const lock=readLock(runtimeDirectory(),port);assert.ok(!JSON.stringify(lock).includes('A001'));
  assert.deepEqual(lock.roots,[a.root]);
});

test('守护的有限重试、只读边界、默认入口和安装条件接通', () => {
  for(const file of ['SKILL.md','references/workflow-checklist.md','references/routing.md']) {
    const s=fs.readFileSync(path.join(skill,file),'utf8');assert.match(s,/自动.*(?:检查|确保|启动)/,file);
  }
  const r=fs.readFileSync(path.join(skill,'references/workflow-progress-panel.md'),'utf8');
  for(const phrase of ['progress-panel-service.js','--ensure','--stop','有限','闲聊','安装','不启动业务服务','第二套'])assert.ok(r.includes(phrase),phrase);
  const service=fs.readFileSync(path.join(skill,'scripts/progress-panel-service.js'),'utf8');assert.doesNotMatch(service,/shell:\s*true|execSync|pkill|killall/);
});

test('旧手动面板观察复用，原进程停止后接续启动；守护本身退出后下一次检查重建', async t => {
  const {root,ports}=fixture(t),port=await freePort();ports.push(port);
  const {registerProjects,createPanelServer}=require(path.join(skill,'scripts/progress-panel'));
  const manual=createPanelServer(registerProjects([{root}]));await new Promise(r=>manual.listen(port,'127.0.0.1',r));
  t.after(()=>new Promise(r=>{manual.closeAllConnections();manual.close(r);}));
  const reused=await ensurePanel({projects:[{root}],port,explicitPort:true});assert.equal(reused.supervised,true);
  assert.equal((await probe(port)).data.pid,process.pid);
  await new Promise(r=>{manual.closeAllConnections();manual.close(r);});
  const recovered=await waitFor(async()=>{const p=await probe(port);return p.healthy && p.data.pid!==process.pid?p:false;},'旧面板退出后未恢复');
  const previous=readLock(runtimeDirectory(),port);process.kill(previous.pid,'SIGKILL');
  await waitFor(()=>{try{process.kill(previous.pid,0);return false;}catch(e){return e.code==='ESRCH';}},'守护未退出');
  await ensurePanel({projects:[{root}],port,explicitPort:true});
  assert.notEqual(readLock(runtimeDirectory(),port).pid,previous.pid);
  process.kill(recovered.data.pid,'SIGKILL');
  await waitFor(async()=>{const p=await probe(port);return p.healthy && p.data.pid!==recovered.data.pid;},'重建守护未接续恢复');
});

test('面板连续退出五次后停止恢复，不无限重启', async t => {
  const {root,ports}=fixture(t),port=await freePort();ports.push(port);
  await ensurePanel({projects:[{root}],port,explicitPort:true});
  for(let n=0;n<5;n++) {
    const before=await waitFor(async()=>{const p=await probe(port);return p.healthy?p:false;},'恢复期间面板未上线');
    process.kill(before.data.pid,'SIGKILL');
    if(n<4) await waitFor(async()=>{const p=await probe(port);return p.healthy && p.data.pid!==before.data.pid;},'有限恢复未发生');
  }
  await waitFor(()=>readLock(runtimeDirectory(),port)===null,'五次失败后仍保留守护');
  await delay(1200);assert.equal((await probe(port)).occupied,false);
});

test('停止响应的自建面板恢复，外部服务不被信号影响', {skip:process.platform==='win32'}, async t => {
  const {root,ports}=fixture(t),port=await freePort();ports.push(port);
  await ensurePanel({projects:[{root}],port,explicitPort:true});const before=await probe(port);
  process.kill(before.data.pid,'SIGSTOP');
  await waitFor(async()=>{const p=await probe(port,150);return p.healthy && p.data.pid!==before.data.pid;},'无响应面板未恢复');
});


test('面板重启保持原根身份，根替换为外部符号链接后不跨项目读取', {skip:process.platform==='win32'}, async t => {
  const a=fixture(t),b=fixture(t),port=await freePort();
  fs.writeFileSync(path.join(b.root,'工作流程.md'),'## 任务：SECRET — 外部\n- [x] B001【已完成】外部记录');
  await ensurePanel({projects:[{root:a.root}],port,explicitPort:true});
  const before=await probe(port),old=a.root+'-original';fs.renameSync(a.root,old);fs.symlinkSync(b.root,a.root);
  t.after(()=>fs.rmSync(old,{recursive:true,force:true}));
  const api=await (await fetch(`http://127.0.0.1:${port}/api/projects`)).json();assert.equal(api.projects[0].status,'error');
  process.kill(before.data.pid,'SIGKILL');
  await waitFor(()=>readLock(runtimeDirectory(),port)===null,'根变化后的失败守护未停止');
  assert.equal((await probe(port)).healthy,false);
  assert.ok(!JSON.stringify(api).includes('外部记录'));
});


test('前台托管模式保留执行会话，停止守护后父命令也退出', async t => {
  const {root,ports}=fixture(t),port=await freePort();ports.push(port);
  const child=spawn(process.execPath,[path.join(skill,'scripts/progress-panel-service.js'),'--ensure','--foreground','--project',root,'--port',String(port)]);
  let output='',errors='',closed=false;child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>errors+=b);
  const ended=new Promise(resolve=>child.on('close',code=>{closed=true;resolve(code);}));
  await waitFor(()=>output.includes('"supervised":true'),errors || '前台模式未报告就绪');
  await delay(300);assert.equal(closed,false);assert.equal((await probe(port)).healthy,true);
  await stopPanel({projects:[{root}],port,explicitPort:true});assert.equal(await ended,0);
});
