'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const assets=path.resolve(__dirname,'../skills/production-engineering/assets/progress-panel');
class Element {
  constructor(tag='div'){this.tag=tag;this.children=[];this.attributes={};this.dataset={};this.events={};this._text='';this.hidden=false;this.value='';}
  set textContent(value){this.children=[];this._text=String(value);}
  get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this._text='';this.children=[...nodes];}
  setAttribute(key,value){this.attributes[key]=String(value);}addEventListener(key,fn){this.events[key]=fn;}
  trigger(key){return this.events[key]?.({target:this});}focus(){this.focused=true;}select(){this.selected=true;}
}
function page(options={}){
  const html=fs.readFileSync(path.join(assets,'index.html'),'utf8');const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(match=>[match[1],new Element()]));
  const tabs=['changes','proof','prompts'].map(name=>{const button=new Element('button');button.dataset.toolTab=name;return button;});
  const calls=[],clipboard=[];
  const document={getElementById:id=>elements.get(id),createElement:tag=>new Element(tag),querySelectorAll:()=>tabs};
  const response={changes:{status:'ready',source:'项目未提交改动（未归属本轮）',baseline:'a'.repeat(40),total:1,hidden:1,files:[{id:'f'.repeat(24),path:'web/<x>.tsx',category:'前端',status:'修改',preview:true}],observedAt:'2026-10-06T07:00:00Z'},attachments:[{id:'e'.repeat(24),item:'W002',label:'截图',kind:'image',path:'work/view.png'}]};
  const context=vm.createContext({document,navigator:{clipboard:{writeText:async text=>{if(options.copyFails)throw Error('denied');clipboard.push(text);}}},fetch:async(url,args)=>{calls.push({url,args});if(options.fetch)return options.fetch(url);return{ok:true,json:async()=>url.includes('/api/diff/')?{path:'web/<x>.tsx',text:'<script>untrusted()</script>',hidden:0,source:response.changes.source}:structuredClone(response)};}});
  vm.runInContext(fs.readFileSync(path.join(assets,'panel-tools.js'),'utf8'),context);
  return{get:id=>elements.get(id),tabs,calls,clipboard,select:(project,task)=>vm.runInContext('PanelTools',context).select(project,task),response};
}
const settled=()=>new Promise(resolve=>setImmediate(resolve));
const project={id:'a'.repeat(16),name:'项目甲'};
const task={id:'A',title:'任务甲',base:'',items:[{id:'W001',status:'已完成',description:'实现；证据：node --test 通过'},{id:'W002',status:'待验证',description:'页面；证据：[截图](work/view.png)'},{id:'W003',status:'已完成',description:'未附证据'}]};
test('真正工具脚本展示项目改动来源、分类和安全差异，证据不冒充浏览器验收',async()=>{
  const p=page();p.select(project,task);await settled();
  assert.match(p.get('changes-source').textContent,/未归属本轮/);assert.match(p.get('change-list').textContent,/前端|web\/<x>.tsx/);
  p.get('change-list').children[0].children.find(node=>node.tag==='button').trigger('click');await settled();
  assert.equal(p.get('diff-text').textContent,'<script>untrusted()</script>');assert.equal(p.get('diff-text').children.length,0);
  p.tabs[1].trigger('click');assert.match(p.get('proof-list').textContent,/已完成|待验证|未单独附证据/);
  const cards=p.get('proof-list').children,attachment=cards[1].children.find(node=>node.className==='proof-attachments');
  const image=attachment.children[0].children.find(node=>node.tag==='img');assert.match(image.src,/^\/api\/evidence\//);assert.doesNotMatch(image.src,/work\/|https:/);
  assert.ok(p.calls.every(call=>!call.args?.method||call.args.method==='GET'));
});
test('提示词仅复制到剪贴板；被拒绝时选择文本手动复制，不执行项目动作',async()=>{
  const p=page();p.select(project,task);await settled();p.tabs[2].trigger('click');
  await p.get('copy-prompt').trigger('click');assert.equal(p.clipboard.length,1);assert.match(p.clipboard[0],/完成后停止|完成后.*停止/);assert.match(p.clipboard[0],/清空.*数据库/);
  assert.match(p.get('prompt-message').textContent,/已复制/);
  const q=page({copyFails:true});q.select(project,task);await settled();q.tabs[2].trigger('click');await q.get('copy-prompt').trigger('click');
  assert.equal(q.clipboard.length,0);assert.equal(q.get('prompt-text').selected,true);assert.match(q.get('prompt-message').textContent,/手动复制/);assert.doesNotMatch(q.get('prompt-message').textContent,/已复制/);
});
test('切换项目/任务后迟到的响应与差异不会覆盖当前记录，读取失败清楚标记',async()=>{
  let resolveOld;
  const p=page({fetch:url=>url.endsWith('/A')?new Promise(resolve=>{resolveOld=resolve;}):Promise.resolve({ok:true,json:async()=>({changes:{status:'unavailable',source:'Git 改动未读取',files:[],error:'当前无 Git'},attachments:[]})})});
  p.select(project,task);p.select({id:'b'.repeat(16),name:'项目乙'},{...task,id:'B',title:'任务乙'});await settled();
  resolveOld({ok:true,json:async()=>p.response});await settled();assert.match(p.get('changes-source').textContent,/Git 改动未读取/);assert.match(p.get('change-list').textContent,/当前无 Git/);
  p.tabs[2].trigger('click');assert.match(p.get('prompt-text').value,/项目乙|任务乙/);assert.doesNotMatch(p.get('prompt-text').value,/任务甲/);
});
