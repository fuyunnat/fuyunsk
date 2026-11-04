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
function page(projectsOverride) {
  const elements = new Map(), timers = [];
  const filters = ['all', 'open', 'blocked'].map(filter => { const node = new Element('button'); node.dataset.filter = filter; return node; });
  const document = { hidden: false, getElementById: id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); }, createElement: tag => new Element(tag), createTextNode: text => ({ textContent: text }), querySelectorAll: () => filters, addEventListener() {} };
  const projects = projectsOverride || [
    { id: 'a', name: '项目甲', root: '/project/a', updatedAt: '2026-10-06T00:00:00Z', status: 'ready', tasks: parseWorkflow('## 任务：OLD — 旧任务\n- [x] O001【已完成】旧记录\n## 任务：NOW — 当前任务\n当前项：W002；下一步：真实验证\n- [x] W001【已完成】实现\n- [ ] W002【进行中】调试\n- [ ] W003【阻塞】账号缺失') },
    { id: 'b', name: '项目乙', root: '/project/b', updatedAt: null, status: 'missing', tasks: [], error: '没有工作流程.md；面板不会创建清单' },
  ];
  let online = true;
  const context = vm.createContext({ document, setInterval: callback => timers.push(callback), fetch: async () => { if (!online) throw new Error('offline'); return { ok: true, json: async () => ({ observedAt: '2026-10-06T00:00:00Z', projects: structuredClone(projects) }) }; } });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../skills/production-engineering/assets/progress-panel/panel.js'), 'utf8'), context);
  return { elements, filters, timers, projects, offline: () => { online = false; } };
}
const settled = () => new Promise(resolve => setImmediate(resolve));

test('真正页面脚本选择默认任务，项目/任务切换及筛选不会混合历史', async () => {
  const p = page(); await settled(); const get = id => p.elements.get(id);
  assert.equal(get('project-title').textContent, '项目甲');
  assert.match(get('focus-title').textContent, /W002/);
  assert.equal(get('progress-label').textContent, '1 / 3 项已记录完成');
  p.filters[2].trigger('click'); assert.equal(get('steps').children.length, 1); assert.match(get('steps').textContent, /账号缺失/);
  get('tasks').children.find(node => node.attributes?.['aria-label'] === '旧任务').trigger('click'); assert.equal(get('progress-label').textContent, '1 / 1 项已记录完成');
  get('projects').children[1].trigger('click'); assert.equal(get('project-title').textContent, '项目乙'); assert.equal(get('task-empty').hidden, false); assert.match(get('empty').textContent, /不会创建/);
  get('projects').children[0].trigger('click'); assert.equal(get('progress-label').textContent, '1 / 3 项已记录完成');
});

test('任务搜索、未完成范围与自动跟随保留手动选择的记录', async () => {
  const p = page(); await settled(); const get = id => p.elements.get(id);
  const titles = () => get('tasks').children.filter(n => n.tag === 'button').map(n => n.attributes['aria-label']);
  assert.deepEqual(titles(), ['当前任务', '旧任务']);
  get('scope-open').trigger('click'); assert.deepEqual(titles(), ['当前任务']);
  get('scope-all').trigger('click'); get('task-search').value = 'OLD'; get('task-search').trigger('input');
  assert.deepEqual(titles(), ['旧任务']);
  get('tasks').children.find(n => n.tag === 'button').trigger('click');
  p.projects[0].tasks.push(parseWorkflow('## 任务：NEW — 新记录\n- [ ] N001【待做】新事项')[0]);
  p.timers[0](); await settled(); assert.equal(get('task-title').textContent, '旧任务');
  get('task-search').value = ''; get('task-search').trigger('input');
  get('tasks').children.find(n => n.attributes?.['aria-label'] === '新记录').trigger('click');
  p.projects[0].tasks.push(parseWorkflow('## 任务：NEXT — 后续记录\n- [ ] N002【进行中】开始')[0]);
  p.timers[0](); await settled(); assert.equal(get('task-title').textContent, '后续记录');
  get('task-search').value = '无此任务'; get('task-search').trigger('input');
  assert.equal(get('task-empty').hidden, false); assert.equal(get('task-title').textContent, '后续记录');
});

test('目标、证据与待验当前项使用实际清单，取消不算完成，特殊文本安全显示', async () => {
  const p = page(); await settled(); const get = id => p.elements.get(id);
  p.projects[0].tasks[1] = parseWorkflow('## 任务：NOW — 当前任务\n目标：<img src=x onerror=alert(1)>\n保留：业务库不动\n验收与停止：浏览器验收后停止\n当前项：W002（待验）\n- [x] W001【已完成】实现；证据：node --test 通过\n- [ ] W002【待验证】真实浏览器\n- [ ] W003【已取消】旧范围')[0];
  p.timers[0](); await settled();
  assert.equal(get('goal').textContent, '<img src=x onerror=alert(1)>'); assert.equal(get('goal').children.length, 0);
  assert.equal(get('constraints').textContent, '业务库不动'); assert.match(get('acceptance').textContent, /浏览器验收后停止/);
  assert.match(get('focus-title').textContent, /W002/); assert.equal(get('focus-status').textContent, '待验证');
  assert.match(get('progress-label').textContent, /1 \/ 2.*1 项取消/);
  assert.match(get('blockers').textContent, /W002/); assert.match(get('evidence').textContent, /1 条证据/); assert.match(get('steps').textContent, /node --test 通过/);
  p.filters[2].trigger('click'); assert.equal(get('steps').children.length, 0);
  get('flow').children[1].children[0].trigger('click'); assert.equal(get('steps').children.length, 3);
  assert.equal(p.filters[0].attributes['aria-pressed'], 'true');
});

test('自动刷新实际记录变化，断线保留上次数据并明确标识', async () => {
  const p = page(); await settled(); const get = id => p.elements.get(id);
  p.projects[0].tasks[1] = parseWorkflow('## 任务：NOW — 当前任务\n- [x] W001【已完成】实现\n- [x] W002【已完成】验证\n- [ ] W003【阻塞】账号缺失')[0];
  p.timers[0](); await settled(); assert.equal(get('progress-label').textContent, '2 / 3 项已记录完成');
  p.offline(); p.timers[0](); await settled(); assert.equal(get('connection').textContent, '连接中断'); assert.equal(get('notice').hidden, false); assert.match(get('notice').textContent, /上次读取/); assert.equal(get('progress-label').textContent, '2 / 3 项已记录完成');
});

test('手选任务明示，退出本轮排除分母但保留阶段范围，不编造最新任务', async () => {
  const p = page(); await settled(); const get = id => p.elements.get(id);
  get('tasks').children.find(node => node.attributes?.['aria-label'] === '旧任务').trigger('click');
  assert.match(get('conversation').textContent, /手选任务/);
  p.projects[0].tasks[1] = parseWorkflow('## 任务：NOW — 当前任务\n- 当前目标（已收尾）：只验本批\n- [x] W001【已完成隔离验收】隔离测试\n- [ ] W002【本轮不实施】后续范围')[0];
  get('tasks').children.find(node => node.attributes?.['aria-label'] === '当前任务').trigger('click');
  p.timers[0](); await settled();
  assert.equal(get('goal').textContent, '只验本批');
  assert.match(get('progress-label').textContent, /1 \/ 1.*1 项本轮不做/);
  assert.match(get('steps').textContent, /已完成隔离验收/);
  p.filters[1].trigger('click'); assert.equal(get('steps').children.length, 0);
  p.projects[0].tasks[1] = parseWorkflow('## 任务：NOW — 当前任务\n- [ ] W002【本轮不做】后续范围')[0];
  p.timers[0](); await settled();
  assert.equal(get('task-status').textContent, '本轮不做');
  assert.equal(get('focus-title').textContent, '任务本轮不做');
  assert.equal(get('task-count').textContent, '2');
});

function overviewRows(p) {
  return (p.elements.get('task-overview-body')?.children || []).filter(row => row.tag === 'tr' && row.children[1]?.children[0]?.tag === 'button');
}
function overviewTitles(p) { return overviewRows(p).map(row => row.children[1].children[0].textContent); }

test('任务总览按五列表格显示真实完成率，取消与本轮不做不进入分母', async () => {
  const p = page(); await settled();
  p.projects[0].tasks = parseWorkflow('## 任务：MIX — 范围核对\n- [x] M001【已完成】已验\n- [ ] M002【待做】待做\n- [ ] M003【已取消】取消\n- [ ] M004【本轮不做】下轮\n## 任务：ZERO — 无本轮范围\n- [ ] Z001【已取消】取消\n- [ ] Z002【本轮不做】下轮\n## 任务：DONE — 全部完成\n- [x] D001【已完成】已验');
  p.timers[0](); await settled();
  const rows = overviewRows(p);
  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert.equal(row.children.length, 5);
    assert.ok(row.children.every(cell => cell.tag === 'td'));
    assert.ok(row.children[0].textContent.trim(), '阶段列必须提供可读文本');
  }
  const rowFor = title => rows.find(row => row.children[1].children[0].textContent === title);
  assert.equal(rowFor('范围核对').children[2].textContent, '待做');
  assert.match(rowFor('范围核对').children[3].textContent, /1\s*\/\s*2/);
  assert.equal(rowFor('范围核对').children[4].textContent.trim(), '50%');
  assert.match(rowFor('无本轮范围').children[3].textContent, /0\s*\/\s*0/);
  assert.equal(rowFor('无本轮范围').children[4].textContent.trim(), '—');
  assert.equal(rowFor('全部完成').children[4].textContent.trim(), '100%');
  assert.equal(p.elements.get('overview-count').textContent, '3');
});

test('任务总览未全部完成不会四舍五入成100%，特殊标题按纯文本显示', async () => {
  const p = page(); await settled();
  const unsafe = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  const completed = Array.from({ length: 200 }, (_, i) => `- [x] R${i + 1}【已完成】已验`).join('\n');
  p.projects[0].tasks = parseWorkflow(`## 任务：RATIO — ${unsafe}\n${completed}\n- [ ] R999【待验证】最后一项`);
  p.timers[0](); await settled();
  const rows = overviewRows(p);
  assert.equal(rows.length, 1);
  const [row] = rows, button = row.children[1].children[0];
  assert.equal(button.textContent, unsafe);
  assert.equal(button.children.length, 0, '标题应由 textContent 写入，不能插入可执行标签');
  assert.match(row.children[3].textContent, /200\s*\/\s*201/);
  const percent = row.children[4].textContent.trim();
  assert.ok(percent === '<100%' || (/^\d+(?:\.\d+)?%$/.test(percent) && Number.parseFloat(percent) < 100));
  button.trigger('click');
  assert.equal(p.elements.get('task-title').textContent, unsafe);
  assert.equal(p.elements.get('task-details').open, true);
});

test('任务总览和原任务列表共享搜索及未完成范围，过滤不更改所选详情', async () => {
  const p = page(); await settled(); const get = id => p.elements.get(id);
  p.projects[0].tasks = parseWorkflow('## 任务：PAST — 已完成历史\n对话：共同词\n- [x] P001【已完成】完成\n## 任务：NEXT — 继续实施\n对话：共同词\n- [ ] N001【进行中】继续\n## 任务：LAST — 最新记录\n- [ ] L001【待做】等待');
  p.timers[0](); await settled();
  const sidebarTitles = () => get('tasks').children.filter(node => node.tag === 'button').map(node => node.attributes['aria-label']);
  get('task-search').value = '共同词'; get('task-search').trigger('input');
  assert.deepEqual(overviewTitles(p), ['已完成历史', '继续实施']);
  assert.deepEqual(overviewTitles(p).sort(), sidebarTitles().sort());
  assert.equal(get('overview-count').textContent, '2');
  get('scope-open').trigger('click');
  assert.deepEqual(overviewTitles(p), ['继续实施']);
  assert.deepEqual(overviewTitles(p), sidebarTitles());
  assert.equal(get('overview-count').textContent, '1');
  assert.equal(get('task-title').textContent, '最新记录');
  get('task-search').value = '无此任务'; get('task-search').trigger('input');
  assert.equal(overviewRows(p).length, 0);
  assert.deepEqual(sidebarTitles(), []);
  assert.equal(get('overview-count').textContent, '0');
  assert.equal(get('task-title').textContent, '最新记录');
});

test('任务总览每页十行，翻页和刷新保留历史详情，搜索与切项目重置页码', async () => {
  const p = page(); await settled(); const get = id => p.elements.get(id);
  p.projects[0].tasks = Array.from({ length: 23 }, (_, i) => parseWorkflow(`## 任务：T${i + 1} — 记录${i + 1}\n- [ ] S${i + 1}【待做】执行`)[0]);
  p.projects[1].tasks = parseWorkflow('## 任务：B1 — 乙项目独立记录\n- [ ] B001【待做】执行');
  p.projects[1].status = 'ready';
  p.timers[0](); await settled();
  assert.equal(overviewRows(p).length, 10);
  assert.equal(get('overview-count').textContent, '23');
  assert.equal(get('overview-prev').disabled, true);
  assert.equal(get('overview-next').disabled, false);
  assert.match(get('overview-summary').textContent, /1.*10.*23/);
  get('overview-next').trigger('click');
  assert.equal(overviewRows(p).length, 10);
  assert.match(get('overview-summary').textContent, /11.*20.*23/);
  const chosen = overviewRows(p)[0].children[1].children[0];
  const chosenTitle = chosen.textContent; chosen.trigger('click');
  assert.equal(get('task-details').open, true);
  assert.equal(get('task-title').textContent, chosenTitle);
  get('overview-next').trigger('click');
  assert.equal(overviewRows(p).length, 3);
  assert.equal(get('overview-next').disabled, true);
  assert.equal(get('task-title').textContent, chosenTitle);
  p.projects[0].tasks.push(parseWorkflow('## 任务：T24 — 新增记录24\n- [ ] S024【待做】执行')[0]);
  p.timers[0](); await settled();
  assert.equal(get('task-title').textContent, chosenTitle);
  assert.match(get('conversation').textContent, /手选任务/);
  get('task-search').value = 'T24'; get('task-search').trigger('input');
  assert.deepEqual(overviewTitles(p), ['新增记录24']);
  assert.equal(get('overview-prev').disabled, true);
  assert.equal(get('task-title').textContent, chosenTitle);
  get('task-search').value = ''; get('task-search').trigger('input');
  assert.equal(overviewRows(p).length, 10);
  get('overview-next').trigger('click');
  get('projects').children[1].trigger('click');
  assert.deepEqual(overviewTitles(p), ['乙项目独立记录']);
  assert.equal(get('task-title').textContent, '乙项目独立记录');
  assert.equal(get('overview-prev').disabled, true);
  get('projects').children[0].trigger('click');
  assert.equal(overviewRows(p).length, 10);
  assert.equal(get('overview-prev').disabled, true);
  assert.equal(get('task-title').textContent, '新增记录24');
});

test('简明进度与任务标题不铺技术日志，原始记录和真实卡点仍完整保留',async()=>{
  const p=page();await settled();const get=id=>p.elements.get(id);
  const log='实现说明'.repeat(100);
  p.projects[0].tasks=parseWorkflow(`## 任务：READ — 阅读优化\n目标：简明进度\n当前项：R001；下一步：真实浏览器检查\n阻塞：测试账号待提供\n- [ ] R001【进行中】整理信息层级；实现说明：${log}；证据：仅静态检查\n- [ ] R002【待验证】浏览器验收；未验证：手机布局\n- [ ] R003【阻塞】账号检查；缺少条件：隔离测试账号`);
  p.timers[0]();await settled();
  assert.equal(get('focus-title').textContent,'R001 · 整理信息层级');
  assert.equal(get('next-step').textContent,'真实浏览器检查');
  assert.match(get('blockers-summary').textContent,/测试账号待提供/);
  assert.doesNotMatch(get('checklist').textContent,/实现说明|仅静态检查/);
  assert.equal(get('checklist').children.length,3);
  assert.match(get('steps').textContent,new RegExp(log));
  assert.equal(get('record-next').textContent,'真实浏览器检查');
});

test('自动选择按有效任务日期支持新任务在顶部，同日唯一进行中优先，不把文件末项说成最新',async()=>{
  const tasks=parseWorkflow('## 任务：new-20261105 — 顶部新任务\n当前项：A001\n- [ ] A001【进行中】本轮实施\n## 任务：closed-20261105 — 同日已交付\n- [x] C001【已完成】已交付\n## 任务：old-20261030 — 底部旧任务\n当前项：O001\n- [ ] O001【待验证】历史外部条件');
  const p=page([{id:'a',name:'日期项目',status:'ready',tasks}]);await settled();const get=id=>p.elements.get(id);
  assert.equal(get('task-title').textContent,'顶部新任务');assert.match(get('focus-title').textContent,/A001/);
  assert.match(get('focus-label').textContent,/所选任务/);assert.doesNotMatch(get('focus-label').textContent,/正在做/);
  assert.doesNotMatch(get('conversation').textContent,/最近记录|最新任务/);
  p.projects[0].tasks.push(...parseWorkflow('## 任务：future-invalid-20261350 — 无效日期不能冒充最新\n- [ ] I001【进行中】无效日期'));
  p.timers[0]();await settled();assert.equal(get('task-title').textContent,'顶部新任务');
  p.projects[0].tasks.push(...parseWorkflow('## 任务：APPEND — 新日期任务 2026-11-06\n- [ ] N001【待做】明确新日期'));
  p.timers[0]();await settled();assert.equal(get('task-title').textContent,'新日期任务 2026-11-06');
  p.projects[0].tasks.unshift(...parseWorkflow('## 任务：import-20261001 — 导入旧日期记录\n- [ ] H001【进行中】历史记录'));
  p.timers[0]();await settled();assert.equal(get('task-title').textContent,'新日期任务 2026-11-06');
});

test('前插和追加的新记录均能自动跟随，手选其他任务后轮询只更新数据不抢选择',async()=>{
  const p=page();await settled();const get=id=>p.elements.get(id);
  p.projects[0].tasks.unshift(...parseWorkflow('## 任务：TOP — 前插记录\n- [ ] T001【进行中】前插任务'));
  p.timers[0]();await settled();assert.equal(get('task-title').textContent,'前插记录');
  get('tasks').children.find(node=>node.attributes?.['aria-label']==='旧任务').trigger('click');
  p.projects[0].tasks.push(...parseWorkflow('## 任务：BOTTOM — 追加记录\n- [ ] B001【进行中】追加任务'));
  p.timers[0]();await settled();assert.equal(get('task-title').textContent,'旧任务');assert.match(get('conversation').textContent,/手选/);
  get('tasks').children.find(node=>node.attributes?.['aria-label']==='追加记录').trigger('click');
  p.projects[0].tasks.unshift(...parseWorkflow('## 任务：HEAD — 再次前插\n- [ ] H001【待做】新任务'));
  p.timers[0]();await settled();assert.equal(get('task-title').textContent,'再次前插');
  p.projects[0].tasks.push(...parseWorkflow('## 任务：TAIL — 再次追加\n- [ ] L001【待做】新任务'));
  p.timers[0]();await settled();assert.equal(get('task-title').textContent,'再次追加');
});
