'use strict';
const $ = id => document.getElementById(id);
const state = { projects: [], project: '', task: '', autoTask: '', filter: 'all', taskScope: 'all', query: '', overviewPage: 0, followLatest: true, loading: false, snapshot: '' };
const overviewPageSize = 10;
const keys = { '待做': 'pending', '进行中': 'running', '待验证': 'verifying', '阻塞': 'blocked', '已完成': 'completed', '已取消': 'cancelled', '本轮不做': 'deferred', '未知': 'unknown' };
const blankCounts = { total: 0, completed: 0, running: 0, verifying: 0, pending: 0, blocked: 0, eligible: 0, cancelled: 0, deferred: 0, unknown: 0 };
function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function badge(status) { return element('span', `status status-${keys[status] || 'unknown'}`, status); }
function date(value) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'; }
function selection() { const project = state.projects.find(p => p.id === state.project); return { project, task: project?.tasks.find(t => t.id === state.task) }; }
function taskDate(task) {
  const dates = [...`${task.id} ${task.title}`.matchAll(/(?:^|[^A-Za-z0-9])(20\d{2})-?(\d{2})-?(\d{2})(?=$|[^A-Za-z0-9])/g)].map(match => {
    const [, year, month, day] = match, value = `${year}-${month}-${day}`, parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(value) ? Number(`${year}${month}${day}`) : 0;
  });
  return Math.max(0, ...dates);
}
function automaticTask(project, previous, rememberedId = '') {
  const tasks = project?.tasks || [], latestDate = Math.max(0, ...tasks.map(taskDate));
  const candidates = latestDate ? tasks.filter(task => taskDate(task) === latestDate) : tasks;
  const added = previous ? candidates.filter(task => !previous.tasks.some(old => old.id === task.id)) : [];
  if (added.length === 1) return added[0];
  const running = candidates.filter(task => task.counts.running > 0);
  if (latestDate && running.length === 1) return running[0];
  return candidates.find(task => task.id === rememberedId) || (latestDate ? candidates[0] : candidates.at(-1));
}
function taskStatus(task) {
  const c = task.counts;
  if (c.blocked) return '阻塞'; if (c.running) return '进行中'; if (c.verifying) return '待验证';
  if (c.unknown) return '未知'; if (c.eligible && c.completed === c.eligible) return '已完成';
  return c.eligible ? '待做' : c.deferred ? '本轮不做' : '已取消';
}
function projectSummary(project) {
  if (project.status === 'missing') return '尚未建立清单';
  if (project.status === 'error') return '清单无法读取';
  if (project.status === 'empty') return '暂无任务记录';
  const count = project.tasks.filter(t => t.counts.completed < t.counts.eligible).length;
  return `${project.tasks.length} 条记录 · ${count} 条未完成`;
}
function selectTask(id) {
  const {project} = selection(); state.task = id; state.filter = 'all'; state.followLatest = id === state.autoTask;
  const index = matchingTasks(project).findIndex(task => task.id === id);
  if (index >= 0) state.overviewPage = Math.floor(index / overviewPageSize);
  $('task-details').open = true; render();
  $('task-details').querySelector?.('summary')?.focus?.();
}
function matchingTasks(project) {
  return (project?.tasks || []).filter(t => (state.taskScope === 'all' || t.counts.completed < t.counts.eligible) && `${t.title} ${t.id} ${t.conversation}`.toLowerCase().includes(state.query.toLowerCase()));
}
function renderOverview(project) {
  const focusedTask = document.activeElement?.dataset?.overviewTask;
  const tasks = matchingTasks(project);
  state.overviewPage = Math.min(state.overviewPage, Math.max(0, Math.ceil(tasks.length / overviewPageSize) - 1));
  const start = state.overviewPage * overviewPageSize;
  const rows = tasks.slice(start, start + overviewPageSize).map(task => {
    const row = element('tr', 'overview-row'), c = task.counts;
    row.setAttribute('aria-selected', String(task.id === state.task));
    const stage = element('td', 'overview-stage', String(project.tasks.indexOf(task) + 1).padStart(2, '0'));
    stage.title = task.id;
    const content = element('td', 'overview-content'), button = element('button', 'overview-task-button', task.title);
    button.dataset.overviewTask = task.id;
    button.type = 'button'; button.title = task.title; button.setAttribute('aria-controls', 'task-details');
    button.setAttribute('aria-expanded', String(task.id === state.task && $('task-details').open));
    button.addEventListener('click', () => selectTask(task.id)); content.append(button);
    if (task.goal) { const goal = element('small', 'overview-goal', task.goal); goal.title = task.goal; content.append(goal); }
    const status = element('td', 'overview-status'); status.append(badge(taskStatus(task)));
    if (task.warnings.length) status.append(element('small', 'overview-warning', '需核对'));
    const progress = element('td', 'overview-progress'); progress.append(element('strong', '', `${c.completed} / ${c.eligible}`));
    const excluded = [c.cancelled ? `${c.cancelled}项取消` : '', c.deferred ? `${c.deferred}项本轮不做` : ''].filter(Boolean);
    if (excluded.length) progress.append(element('small', 'overview-excluded', excluded.join(' · ')));
    const rounded = c.eligible ? Math.round(c.completed * 100 / c.eligible) : null;
    const percent = rounded === null ? '—' : rounded === 100 && c.completed < c.eligible ? '<100%' : `${rounded}%`;
    row.append(stage, content, status, progress, element('td', 'overview-percent', percent)); return row;
  });
  $('task-overview-body').replaceChildren(...rows); $('overview-empty').hidden = rows.length > 0;
  if (focusedTask) rows.find(row => row.children[1].children[0].dataset.overviewTask === focusedTask)?.children[1].children[0].focus?.({ preventScroll: true });
  $('overview-empty').textContent = project?.error || (project?.tasks.length ? '没有符合搜索或筛选条件的任务' : '尚未记录任务');
  $('overview-count').textContent = String(tasks.length);
  $('overview-summary').textContent = tasks.length ? `第 ${start + 1}–${Math.min(start + overviewPageSize, tasks.length)} 条，共 ${tasks.length} 条` : '共 0 条';
  $('overview-prev').disabled = state.overviewPage === 0;
  $('overview-next').disabled = start + overviewPageSize >= tasks.length;
}
function renderProjects() {
  $('project-count').textContent = state.projects.length;
  $('projects').replaceChildren(...state.projects.map(project => {
    const button = element('button', 'project-button'); button.type = 'button'; button.setAttribute('aria-current', String(project.id === state.project));
    const label = element('div', 'project-label'); label.append(element('strong', '', project.name), element('small', '', projectSummary(project)));
    button.append(element('span', 'project-initial', project.name.slice(0, 1)), label);
    button.addEventListener('click', () => { if (project.id === state.project) return; state.project = project.id; state.task = ''; state.autoTask = ''; state.filter = 'all'; state.taskScope = 'all'; state.followLatest = true; state.query = ''; state.overviewPage = 0; $('task-search').value = ''; $('task-details').open = false; render(); });
    return button;
  }));
}
function renderTasks(project) {
  const tasks = project?.tasks || [];
  $('task-count').textContent = tasks.length;
  const visible = matchingTasks(project).reverse().sort((a, b) => Number(b.id === state.autoTask) - Number(a.id === state.autoTask));
  const nodes = []; let group;
  for (const task of visible) {
    const nextGroup = task.id === state.autoTask ? '默认记录' : '其他记录';
    if (group !== nextGroup) { nodes.push(element('span', 'task-group', nextGroup)); group = nextGroup; }
    const button = element('button', 'task-button'); button.type = 'button'; button.setAttribute('aria-current', String(task.id === state.task)); button.setAttribute('aria-label', task.title); button.title = task.title;
    const status = taskStatus(task), label = element('div', 'task-label');
    label.append(element('strong', '', task.title), element('small', '', `${task.conversation ? `${task.conversation} · ` : ''}${status} · ${task.counts.completed}/${task.counts.eligible}`));
    button.append(element('span', `task-dot ${keys[status] || 'unknown'}`), label); button.addEventListener('click', () => selectTask(task.id)); nodes.push(button);
  }
  $('tasks').replaceChildren(...nodes); $('task-empty').hidden = visible.length > 0;
  $('task-scope').textContent = `${visible.length}/${tasks.length}`;
  for (const scope of ['all', 'open']) $(`scope-${scope}`).setAttribute('aria-pressed', String(state.taskScope === scope));
}
function recordParts(item) {
  const parts = item.description.split(/(?:[；;]\s*)?证据[：:]/);
  return { title: parts[0].split(/[；;。]/)[0] || item.id, full: item.description, evidence: parts.length > 1 ? parts.slice(1).join('证据：') : '' };
}
function brief(value, limit = 100) { const text = value.replace(/\s+/g, ' ').trim(); return text.length > limit ? `${text.slice(0, limit)}…` : text; }
function currentItem(task) {
  const id = task?.current.match(/^[\w.-]+/)?.[0];
  return task?.items.find(i => i.id === id) || ['进行中', '阻塞', '待验证', '待做', '未知'].map(s => task?.items.find(i => i.status === s)).find(Boolean);
}
function renderFocus(task, project) {
  const counts = task?.counts || blankCounts, current = currentItem(task); let status;
  if (current) {
    $('focus-label').textContent = '所选任务 · 清单当前项';
    $('focus-title').textContent = `${current.id} · ${brief(recordParts(current).title)}`; status = current.status;
  } else {
    $('focus-label').textContent = '记录状态';
    $('focus-title').textContent = task ? counts.eligible && counts.completed === counts.eligible ? '清单事项已记录完成' : counts.eligible === 0 ? counts.deferred ? '任务本轮不做' : '任务已取消' : '状态需要核实' : '暂无可显示的任务';
    status = task ? taskStatus(task) : '暂无记录';
  }
  $('focus-title').title = current ? `${current.id} · ${recordParts(current).title}` : $('focus-title').textContent;
  $('next-step').textContent = task?.next ? brief(task.next, 140) : task ? '未记录下一步。' : project?.error || 'AI 更新项目清单后显示。';
  $('next-step').title = task?.next || '';
  const blocked = (task?.items || []).filter(item => item.status === '阻塞');
  const blocker = task?.blocker || blocked.map(item => `${item.id} · ${recordParts(item).title}`).join('；');
  $('blockers-summary').textContent = blocker ? brief(blocker, 140) : '清单未记录卡点。'; $('blockers-summary').title = blocker;
  $('blockers-summary').className = blocker ? 'has-blocker' : '';
  $('focus-status').textContent = status; $('focus-status').className = `status status-${keys[status] || 'unknown'}`;
  return current;
}
function renderChecklist(task) {
  const items = (task?.items || []).map((item, index) => {
    const row = element('li', 'compact-step'), button = element('button', 'compact-step-link'); button.type = 'button';
    button.append(element('span', 'step-id', item.id), element('span', 'compact-step-title', brief(recordParts(item).title, 120)));
    button.title = recordParts(item).title; button.setAttribute('aria-label', `${item.id}，${recordParts(item).title}，查看完整记录`);
    button.addEventListener('click', () => { if(typeof PanelTools !== 'undefined')PanelTools.show('records'); state.filter = 'all'; renderSteps(task, currentItem(task)); $(`step-${index}`)?.scrollIntoView?.({ block: 'nearest' }); });
    row.append(button, badge(item.status)); return row;
  });
  $('checklist').replaceChildren(...(items.length ? items : [element('li', 'empty', '暂无事项记录。')]));
}
function renderFlow(task, current) {
  $('flow').replaceChildren(...(task?.items || []).map((item, index) => {
    const key = keys[item.status] || 'unknown', li = element('li', `flow-item ${key}`), button = element('button', 'flow-button'); button.type = 'button';
    button.setAttribute('aria-label', `${item.id}，${item.status}，跳转记录`); if (current?.id === item.id) button.setAttribute('aria-current', 'step');
    const label = element('div'); label.append(element('strong', '', item.id), element('small', '', item.status));
    button.append(element('span', 'flow-number', key === 'completed' ? '✓' : String(index + 1)), label);
    button.addEventListener('click', () => { state.filter = 'all'; renderSteps(task, current); $(`step-${index}`)?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' }); });
    li.append(button); return li;
  }));
}
function renderSteps(task, current) {
  const items = (task?.items || []).filter(item => state.filter === 'all' || (state.filter === 'open' ? !['已完成', '已取消', '本轮不做'].includes(item.status) : item.status === '阻塞'));
  const nodes = items.map(item => {
    const index = task.items.indexOf(item), key = keys[item.status] || 'unknown', parts = recordParts(item);
    const li = element('li', `step ${current?.id === item.id ? 'current-step' : ''}`); li.id = `step-${index}`;
    const marker = element('span', `step-marker ${key}`, key === 'completed' ? '✓' : key === 'blocked' ? '!' : String(index + 1)); marker.setAttribute('aria-hidden', 'true');
    const body = element('div', 'step-body'), heading = element('div', 'step-heading'); heading.append(element('strong', 'step-id', item.id), badge(item.status));
    body.append(heading, element('p', 'step-title', parts.title));
    const detail = element('details', 'step-detail'); detail.append(element('summary', '', parts.evidence ? '完整记录与证据' : '查看完整记录'), element('p', '', parts.full));
    if (item.recordedStatus && item.recordedStatus !== item.status) detail.append(element('p', 'context-note', `状态原文：${item.recordedStatus}；仅表示此事项的记录范围，不代表全部功能验收。`));
    body.append(detail); li.append(marker, body); return li;
  });
  $('steps').replaceChildren(...nodes); $('empty').hidden = !!items.length;
  const {project} = selection();
  $('empty').textContent = !task ? project?.error || '没有可显示的复选框或规划表记录' : state.filter === 'blocked' ? '清单当前没有阻塞项' : state.filter === 'open' ? '清单当前没有未完成项' : '暂无步骤';
  $('filter-summary').textContent = `${items.length} 条记录`;
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter)));
}
function renderContext(task) {
  $('goal').textContent = task?.goal || '此任务尚未单独记录目标。';
  $('constraints').textContent = task?.constraints || '此任务尚未单独记录保留项与边界。';
  $('acceptance').textContent = task?.acceptance || '此任务尚未单独记录验收与停止条件。';
  $('record-current').textContent = task?.current || '未记录'; $('record-next').textContent = task?.next || '未记录'; $('record-blocker').textContent = task?.blocker || '未记录';
  const attention = (task?.items || []).filter(i => ['阻塞', '待验证', '未知'].includes(i.status));
  const alerts = attention.map(item => { const node = element('details', 'attention-item'); const summary = element('summary'); summary.append(badge(item.status), element('strong', '', `${item.id} · ${recordParts(item).title}`)); node.append(summary, element('p', '', recordParts(item).full)); return node; });
  if (task?.blocker) alerts.unshift(element('p', 'blocker-note', task.blocker));
  $('blockers').replaceChildren(...(alerts.length ? alerts : [element('p', 'context-empty', '清单未记录阻塞或待验证项。')]));
  $('attention-count').textContent = attention.length + (task?.blocker ? 1 : 0);
  const records = (task?.items || []).map(item => ({ item, evidence: recordParts(item).evidence })).filter(r => r.evidence);
  $('evidence-count').textContent = records.length;
  const noProof = (task?.items || []).filter(i => i.status === '已完成' && !recordParts(i).evidence).length;
  $('evidence').textContent = `${records.length ? `清单已登记 ${records.length} 条证据。` : '证据未记录。'}${noProof ? `${noProof} 项标记完成，未单独附证据。` : ''}`;
}
function render() {
  if (!state.projects.some(p => p.id === state.project)) { state.project = state.projects[0]?.id || ''; state.task = ''; state.autoTask = ''; state.followLatest = true; }
  const project = state.projects.find(p => p.id === state.project); renderProjects();
  const tasks = project?.tasks || [];
  if (!tasks.some(t => t.id === state.autoTask)) state.autoTask = automaticTask(project)?.id || '';
  if (state.followLatest || !tasks.some(t => t.id === state.task)) state.task = state.autoTask;
  const task = tasks.find(t => t.id === state.task), counts = task?.counts || blankCounts;
  $('project-title').textContent = project?.name || '暂无项目'; $('project-path').textContent = project?.root || '';
  $('task-title').textContent = task?.title || '暂无任务记录'; $('conversation').textContent = `${task?.conversation ? `对话：${task.conversation}` : '独立任务记录'} · ${state.followLatest ? '默认选择 · 仅展示清单记录' : '手选任务 · 刷新保留选择'}`;
  $('task-status').textContent = task ? taskStatus(task) : '暂无记录'; $('task-status').className = `status status-${keys[task ? taskStatus(task) : '未知']}`;
  $('updated').textContent = `最后更新：${date(project?.updatedAt)}`; renderTasks(project); renderOverview(project);
  $('details-task-title').textContent = task?.title || '暂无任务记录';
  $('completed').textContent = counts.completed; $('active').textContent = counts.running + counts.verifying; $('pending').textContent = counts.pending + counts.blocked + counts.unknown;
  $('step-count').textContent = counts.total; $('progress').max = Math.max(1, counts.eligible); $('progress').value = counts.completed;
  $('progress-label').textContent = task ? `${counts.completed} / ${counts.eligible} 项已记录完成${counts.cancelled ? ` · ${counts.cancelled} 项取消` : ''}${counts.deferred ? ` · ${counts.deferred} 项本轮不做` : ''}` : '暂无清单';
  $('warnings').hidden = !task?.warnings.length; $('warnings').textContent = task?.warnings.join('；') || '';
  const current = renderFocus(task, project); renderChecklist(task); renderFlow(task, current); renderSteps(task, current); renderContext(task);
  if(typeof PanelTools!=='undefined')PanelTools.select(project,task);
  else { const message=$('tools-message');if(message){message.hidden=false;message.textContent='工具模块未加载。技能更新后需重启本项目面板；任务进度与下方完整记录仍可查看。';} $('tool-records').hidden=false; }
}
async function refresh() {
  if (state.loading) return; state.loading = true; $('refresh').disabled = true;
  try {
    const response = await fetch('/api/projects', { cache: 'no-store' }); if (!response.ok) throw new Error('读取失败');
    const data = await response.json(), snapshot = JSON.stringify(data.projects);
    if (snapshot !== state.snapshot) {
      const previous = state.projects.find(project => project.id === state.project), project = data.projects.find(project => project.id === state.project);
      if (project) state.autoTask = automaticTask(project, previous, state.autoTask)?.id || '';
      state.projects = data.projects; state.snapshot = snapshot; render();
    }
    $('connection').textContent = `已连接 · ${new Date(data.observedAt).toLocaleTimeString('zh-CN', { hour12: false })}`; $('notice').hidden = true;
  } catch {
    $('connection').textContent = '连接中断'; $('notice').hidden = false;
    $('notice').textContent = '无法连接本机面板。当前显示上次读取的记录，请检查面板进程或刷新。';
  } finally { state.loading = false; $('refresh').disabled = false; }
}
$('task-search').addEventListener('input', event => { state.query = event.target.value; state.overviewPage = 0; renderTasks(selection().project); renderOverview(selection().project); });
for (const scope of ['all', 'open']) $(`scope-${scope}`).addEventListener('click', () => { state.taskScope = scope; state.overviewPage = 0; renderTasks(selection().project); renderOverview(selection().project); });
for (const [id, delta] of [['overview-prev', -1], ['overview-next', 1]]) $(id).addEventListener('click', () => { state.overviewPage = Math.max(0, state.overviewPage + delta); renderOverview(selection().project); });
$('task-details').addEventListener('toggle', () => renderOverview(selection().project));
function applyTheme(value) {
  const theme = ['light', 'dark'].includes(value) ? value : 'system';
  document.documentElement?.setAttribute('data-theme', theme); $('theme-select').value = theme;
}
$('theme-select').addEventListener('change', event => {
  applyTheme(event.target.value);
  try { localStorage.setItem('production-panel-theme', event.target.value); } catch { /* 不依赖浏览器存储权限。 */ }
});
try { applyTheme(localStorage.getItem('production-panel-theme')); } catch { applyTheme('system'); }
$('refresh').addEventListener('click', refresh);
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { state.filter = button.dataset.filter; renderSteps(selection().task, currentItem(selection().task)); }));
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
if (typeof window !== 'undefined' && window.matchMedia) {
  const mobile = window.matchMedia('(max-width: 760px)');
  if (mobile.matches) $('task-browser').open = false;
  mobile.addEventListener?.('change', event => { if (event.matches) $('task-browser').open = false; });
}
refresh(); setInterval(() => { if (!document.hidden) refresh(); }, 4000);
