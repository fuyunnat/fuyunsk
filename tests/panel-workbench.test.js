'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseWorkflow } = require('../skills/production-engineering/scripts/progress-parser');
const assets=path.resolve(__dirname,'../skills/production-engineering/assets/progress-panel');

test('工作台沿用清单目标、保留、验收与停止原文，不捏造进度或执行时间',()=>{
  const t=parseWorkflow('## 任务：A — 修复\n目标：兼容官方修复；保持二开功能\n保留：旧权限；不连接业务库\n验收与停止：真实测试；通过后停止\n当前项：W002；下一步：验收\n- [x] W001【已完成】检查；证据：差异已核实\n- [ ] W002【进行中】实现')[0];
  assert.equal(t.goal,'兼容官方修复；保持二开功能');assert.equal(t.constraints,'旧权限；不连接业务库');assert.equal(t.acceptance,'真实测试；通过后停止');assert.equal(t.current,'W002');assert.equal(t.next,'验收');
  assert.equal(t.items[0].description,'检查；证据：差异已核实');assert.ok(!Object.hasOwn(t,'startedAt'));
});

test('项目工作台任务直达可检索，阶段与证据区语义可访问，保持只读资产',()=>{
  const html=fs.readFileSync(path.join(assets,'index.html'),'utf8');
  for(const id of ['tasks','task-search','task-scope','task-title','flow','goal','blockers','evidence','acceptance','constraints'])assert.match(html,new RegExp(`id="${id}"`),id);
  assert.match(html,/任务记录/);assert.match(html,/执行流程/);assert.match(html,/验证证据/);
  assert.doesNotMatch(html,/<select[^>]*id="task-select"/);
  const js=fs.readFileSync(path.join(assets,'panel.js'),'utf8');
  assert.doesNotMatch(js,/innerHTML|insertAdjacentHTML|eval\(/);assert.doesNotMatch(js,/method:\s*['"](?:POST|PUT|DELETE)/);
  const css=fs.readFileSync(path.join(assets,'panel.css'),'utf8');assert.match(css,/prefers-reduced-motion/);assert.match(css,/@media/);
});
