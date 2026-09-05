#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {spawnSync}=require('node:child_process');const root=path.resolve(__dirname,'..');const skill='skills/production-engineering/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function run(args){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});process.stdout.write(r.stdout||'');if(r.status!==0)throw new Error(`检查失败：node ${args.join(' ')}\n${r.stderr||''}`);}
function includes(file,items){for(const s of items)assert.ok(read(file).includes(s),`${file} 缺少必需要求：${s}`);}
function budget(file,max){const n=Buffer.byteLength(read(file));assert.ok(n<=max,`${file} 超出体积预算 ${n}/${max}`);}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const entry=read(skill+'SKILL.md');assert.match(entry,/^---\nname: production-engineering\ndescription: "[^\n]*[\u4e00-\u9fff][^\n]*"\n---/);
assert.match(read(skill+'agents/openai.yaml'),/allow_implicit_invocation: true/);
budget(skill+'SKILL.md',6000);budget(skill+'references/routing.md',5000);budget('global-AGENTS.example.md',1800);
const description=entry.match(/^description: "(.*)"$/m)[1];assert.ok(Buffer.byteLength(description)<700,'自动匹配描述过长');
includes(skill+'SKILL.md',['默认中文','八荣八耻','第一性原理','300/400/600','函数 80','shadcn/ui','Tailwind CSS','回归','原文第四章','高风险','不因新对话','无法']);
includes(skill+'references/routing.md',['前端与后台','中文提交格式','只读','04-00.md','source-policy.md']);
includes(skill+'references/source-policy.md',['最后上传','原始字节','差异','冲突','不擅自']);
includes(skill+'references/frontend-stack.md',['最新用户要求','新建前端页面','shadcn/ui + Tailwind CSS','tsx: false','已有项目的边界','其他要求继续执行']);
includes('README.md',['原文','中文','验证','不等于','仅维护本技能','--stage']);
includes(skill+'SKILL.md',['--stage 实现','业务任务跑业务项目测试','输出截断必须续读']);
includes(skill+'references/task-lanes.md',['同一仓库写操作不并行','退出码','之前的测试证据']);
includes(skill+'references/project-migration.md',['旧功能对照','恢复演练','不等于','只读','shadcn/ui + Tailwind CSS']);
includes(skill+'SKILL.md',['整项目迁移','迁移台账','工作流程.md']);
budget(skill+'references/workflow-checklist.md',8500);
assert.ok(fs.existsSync(path.join(root,skill,'templates/workflow.example.md')));
budget(skill+'references/project-migration.md',14000);
// 安装说明的静态契约不等于已在用户电脑完成安装或自动调用验证。
includes('README.md',['## 让 AI 自动安装','个性化 / Codex 说明','AGENTS.override.md','不要求你每次手写技能名','文件安装和自动调用要分别验证']);
includes('docs/ai-installation.md',['默认安装必须完成本步骤','保留块外所有无关要求','扫描目录之外','同一短块','实际自动调用待验证','不能算自动触发通过']);
const bridge=read('global-AGENTS.example.md').trim();
const personal=read('docs/personal-custom-instructions.md').match(/```markdown\n([\s\S]*?)\n```/);
assert.ok(personal,'个性化说明缺少可合并的短模板');
assert.equal(personal[1].trim(),bridge,'个性化与全局模板必须一致，避免安装两套规则');
for(const marker of ['<!-- production-engineering:auto:start -->','<!-- production-engineering:auto:end -->'])assert.equal(bridge.split(marker).length-1,1,'短模板的边界标记必须唯一');
assert.ok(bridge.includes('<已核实的SKILL.md绝对路径>'),'短模板必须要求绑定实际技能入口');

includes(skill+'references/upstream-notes.md',['mattpocock/skills','3cca18b368ae95cdbdebbff572ccafa662551015','MIT License','Copyright (c) 2026 Matt Pocock']);
for(const name of ['task-state.js','task-state-core.js'])assert.ok(read(skill+'scripts/'+name).split('\n').length<=600,`${name} 超过 600 行`);
// 原稿及其无损切片保持原始技术术语，不进行破坏保真的语言改写。
const excluded=new Set(['source-original.md','source-speed.md','full-production-engineering.md']);
const docs=[...walk(path.join(root,skill)),...walk(path.join(root,'docs')),path.join(root,'README.md'),path.join(root,'AGENTS.md'),path.join(root,'global-AGENTS.example.md')].filter(p=>p.endsWith('.md')&&!excluded.has(path.basename(p))&&!/[\\/]rules(?:-speed)?[\\/]/.test(p));
for(const p of docs){
 let s=fs.readFileSync(p,'utf8');s=s.replace(/^---\n[\s\S]*?\n---\n/,'').replace(/```[\s\S]*?```/g,'');
 assert.match(s.split('\n').find(l=>l.startsWith('# '))||'',/[\u4e00-\u9fff]/,`${p} 标题不是中文`);
 for(const line of s.split('\n')){const clean=line.replace(/`[^`]*`/g,'').replace(/https?:\/\/\S+/g,'');if(/[A-Za-z]{3,}\s+[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(clean)&&!/[\u4e00-\u9fff]/.test(clean))throw new Error(`发现未中文化说明：${p}: ${line}`);}
 for(const match of s.matchAll(/`(references\/[a-zA-Z0-9_./-]+\.md)`/g))assert.ok(fs.existsSync(path.join(root,skill,match[1])),`入口引用缺失：${match[1]}`);
}
run(['scripts/build-rules.js','--check']);
run(['--test','tests/rules.test.js','tests/task-state-behavior.test.js','tests/rule-batch.test.js','tests/migration.test.js','tests/frontend-stack.test.js','tests/intent-source.test.js','tests/workflow-checklist.test.js']);
run(['scripts/validate-routing-cases.js']);
run(['scripts/validate-repository-hygiene.js']);
run(['scripts/validate-task-state.js']);
console.log('中文原文保真技能自检通过；实际 Codex 触发、遵循情况和端到端耗时仍需本机验收。');
