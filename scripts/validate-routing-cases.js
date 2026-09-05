#!/usr/bin/env node
'use strict';
// 实际测试条款读取器；这些主题输入不冒充模型的自然语言匹配结果。
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');const cases=JSON.parse(fs.readFileSync(path.join(root,'tests/routing-cases.json'),'utf8'));const names=new Set();
assert.ok(cases.length>=18,'主题读取用例不足');
for(const c of cases){
 assert.ok(!names.has(c.name),'用例名称重复');names.add(c.name);
 const r=spawnSync(process.execPath,[path.join(root,'skills/production-engineering/scripts/read-rules.js'),'--topic',c.topic,'--json'],{encoding:'utf8',maxBuffer:1024*1024});
 assert.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout);assert.deepEqual(out.map(e=>e.id),c.expectedIds,c.name);assert.ok(out.map(e=>e.text).join('\n').includes(c.needle),c.name);
}
console.log(`条款主题读取测试通过：${cases.length} 项（实际程序调用，不代表模型端到端测试）。`);
