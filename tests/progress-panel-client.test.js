'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseWorkflow } = require('../skills/production-engineering/scripts/progress-parser');
// 在内存 DOM 执行真正的页面脚本，核对交互与断线状态；不替代浏览器布局验收。
class Element {
  constructor(tag = 'div') { this.tag = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.events = {}; this._text = ''; this.hidden = false; }
  set textContent(text) { this.children = []; this._text = String(text); }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this._text = ''; this.children = [...nodes]; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(name, callback) { this.events[name] = callback; }
  trigger(name, event = { target: this }) { this.events[name]?.(event); }
}
function page() {
  const elements = new Map(), timers = [];
  const filters = ['all', 'open', 'blocked'].map(filter => { const node = new Element('button'); node.dataset.filter = filter; return node; });
  const document = { hidden: false, getElementById: id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); }, createElement: tag => new Element(tag), createTextNode: text => ({ textContent: text }), querySelectorAll: () => filters, addEventListener() {} };
  const projects = [
    { id: 'a', name: '项目甲', root: '/project/a', updatedAt: '2026-10-06T00:00:00Z', status: 'ready', tasks: parseWorkflow('## 任务：OLD — 旧任务\n- [x] O001【已完成】旧记录\n## 任务：NOW — 当前任务\n当前项：W002；下一步：真实验证\n- [x] W001【已完成】实现\n- [ ] W002【进行中】调试\n- [ ] W003【阻塞】账号缺失') },
    { id: 'b', name: '项目乙', root: '/project/b', updatedAt: null, status: 'missing', tasks: [], error: '没有工作流程.md；面板不会创建清单' },
  ];
  let online = true;
  const context = vm.createContext({ document, setInterval: callback => timers.push(callback), fetch: async () => { if (!online) throw new Error('offline'); return { ok: true, json: async () => ({ observedAt: '2026-10-06T00:00:00Z', projects: structuredClone(projects) }) }; } });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../skills/production-engineering/assets/progress-panel/panel.js'), 'utf8'), context);
  return { elements, filters, timers, projects, offline: () => { online = false; } };
}
const settled = () => new Promise(resolve => setImmediate(resolve));

test('真正页面脚本选择最新任务，项目/任务切换及筛选不会混合历史', async () => {
  const p = page(); await settled(); const get = id => p.elements.get(id);
  assert.equal(get('project-title').textContent, '项目甲');
  assert.match(get('focus-title').textContent, /W002/);
  assert.equal(get('progress-label').textContent, '1 / 3 项已记录完成');
  p.filters[2].trigger('click'); assert.equal(get('steps').children.length, 1); assert.match(get('steps').textContent, /账号缺失/);
  get('task-select').value = 'OLD'; get('task-select').trigger('change'); assert.equal(get('progress-label').textContent, '1 / 1 项已记录完成');
  get('projects').children[1].trigger('click'); assert.equal(get('project-title').textContent, '项目乙'); assert.equal(get('task-select').disabled, true); assert.match(get('empty').textContent, /不会创建/);
  get('projects').children[0].trigger('click'); assert.equal(get('progress-label').textContent, '1 / 3 项已记录完成');
});

test('自动刷新实际记录变化，断线保留上次数据并明确标识', async () => {
  const p = page(); await settled(); const get = id => p.elements.get(id);
  p.projects[0].tasks[1] = parseWorkflow('## 任务：NOW — 当前任务\n- [x] W001【已完成】实现\n- [x] W002【已完成】验证\n- [ ] W003【阻塞】账号缺失')[0];
  p.timers[0](); await settled(); assert.equal(get('progress-label').textContent, '2 / 3 项已记录完成');
  p.offline(); p.timers[0](); await settled(); assert.equal(get('connection').textContent, '连接中断'); assert.equal(get('notice').hidden, false); assert.match(get('notice').textContent, /上次读取/); assert.equal(get('progress-label').textContent, '2 / 3 项已记录完成');
});
