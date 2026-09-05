'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const {spawnSync}=require('node:child_process');
const cli=path.resolve(__dirname,'../skills/production-engineering/scripts/task-state.js');
test('任务状态真实命令验证：保护未完成任务、拒绝伪完成、旧验证失效',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fuyunsk-state-test-'));const repo=path.join(temp,'repo');fs.mkdirSync(repo);const env={...process.env,CODEX_HOME:path.join(temp,'codex')};
 function git(...args){const r=spawnSync('git',args,{cwd:repo,env,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout;}
 function run(args,ok=true){const r=spawnSync(process.execPath,[cli,...args,'--repo',repo],{env,encoding:'utf8'});if(ok)assert.equal(r.status,0,r.stderr);else assert.notEqual(r.status,0);return r;}
 git('init','-q');fs.writeFileSync(path.join(repo,'sample.txt'),'原始夹具\n');git('add','--','sample.txt');git('-c','user.name=Local Test Fixture','-c','user.email=fixture@invalid','commit','-qm','test: 本地测试夹具');
 run(['init','--goal','测试任务','--lane','完整通道']);run(['init','--goal','不可覆盖','--lane','完整通道'],false);
 run(['update','--task-status','complete'],false);run(['finalize'],false);run(['implementation-complete']);run(['finalize'],false);
 const passed=spawnSync(process.execPath,[cli,'run','--repo',repo,'--',process.execPath,'-e','process.exit(0)'],{env,encoding:'utf8'});assert.equal(passed.status,0,passed.stderr);
 run(['check','--json']);run(['finalize']);const resumed=JSON.parse(run(['resume','--json']).stdout);assert.equal(resumed.taskStatus,'complete');assert.match(fs.readFileSync(resumed.statePath,'utf8'),/# 任务状态/);
 fs.writeFileSync(path.join(repo,'new.txt'),'未跟踪新内容\n');const stale=run(['check','--json'],false);assert.equal(JSON.parse(stale.stdout).staleVerification,true);run(['finalize'],false);
 // 临时夹具留在独立系统临时目录，按本仓库策略不调用永久删除 API。
});
