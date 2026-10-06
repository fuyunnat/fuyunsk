'use strict';
const $ = id => document.getElementById(id);
const state = { projects: [], project: '', task: '', filter: 'all', taskScope: 'all', query: '', followLatest: true, loading: false, snapshot: '' };
const keys = { '待做': 'pending', '进行中': 'running', '待验证': 'verifying', '阻塞': 'blocked', '已完成': 'completed', '已取消': 'cancelled', '未知': 'unknown' };
const blankCounts = { total: 0, completed: 0, running: 0, verifying: 0, pending: 0, blocked: 0, eligible: 0, cancelled: 0, unknown: 0 };
function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function badge(status) { return element('span', `status status-${keys[status] || 'unknown'}`, status); }
function date(value) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'; }
function selection() { const project = state.projects.find(p => p.id === state.project); return { project, task: project?.tasks.find(t => t.id === state.task) }; }
function taskStatus(task) {
  const c = task.counts;
  if (c.blocked) return '阻塞'; if (c.running) return '进行中'; if (c.verifying) return '待验证';
  if (c.unknown) return '未知'; if (c.eligible && c.completed === c.eligible) return '已完成';
  return c.eligible ? '待做' : '已取消';
}
function projectSummary(project) {
  if (project.status === 'missing') return '尚未建立清单';
  if (project.status === 'error') return '清单无法读取';
  if (project.status === 'empty') return '暂无任务记录';
  const count = project.tasks.filter(t => t.counts.completed < t.counts.eligible).length;
  return `${project.tasks.length} 条记录 · ${count} 条未完成`;
}
function selectTask(id) {
  const {project} = selection(); state.task = id; state.filter = 'all'; state.followLatest = id === project?.tasks.at(-1)?.id; render();
}
function renderProjects() {
  $('project-count').textContent = state.projects.length;
  $('projects').replaceChildren(...state.projects.map(project => {
    const button = element('button', 'project-button'); button.type = 'button'; button.setAttribute('aria-current', String(project.id === state.project));
    const label = element('div', 'project-label'); label.append(element('strong', '', project.name), element('small', '', projectSummary(project)));
    button.append(element('span', 'project-initial', project.name.slice(0, 1)), label);
    button.addEventListener('click', () => { state.project = project.id; state.task = ''; state.filter = 'all'; state.followLatest = true; state.query = ''; $('task-search').value = ''; render(); });
    return button;
  }));
}
function renderTasks(project) {
  const tasks = project?.tasks || [], latest = tasks.at(-1)?.id;
  $('task-count').textContent = tasks.length;
  const visible = [...tasks].reverse().filter(t => (state.taskScope === 'all' || t.counts.completed < t.counts.eligible) && `${t.title} ${t.id} ${t.conversation}`.toLowerCase().includes(state.query.toLowerCase()));
  const nodes = []; let group;
  for (const task of visible) {
    const nextGroup = task.id === latest ? '最近记录' : '历史记录';
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
function currentItem(task) {
  const id = task?.current.match(/^[\w.-]+/)?.[0];
  return task?.items.find(i => i.id === id) || ['进行中', '阻塞', '待验证', '待做', '未知'].map(s => task?.items.find(i => i.status === s)).find(Boolean);
}
function renderFocus(task, project) {
  const counts = task?.counts || blankCounts, current = currentItem(task); let status;
  if (current) {
    $('focus-label').textContent = current.status === '阻塞' ? '当前阻塞' : '当前一步';
    $('focus-title').textContent = `${current.id} · ${recordParts(current).title}`;
    $('next-step').textContent = task.next ? `下一步：${task.next}` : current.status === '阻塞' ? task.blocker || '清单记录为阻塞，需补齐条件后继续。' : '当前项来自清单；完整记录见下方执行流程。'; status = current.status;
  } else {
    $('focus-label').textContent = '记录状态';
    $('focus-title').textContent = task ? counts.eligible && counts.completed === counts.eligible ? '清单事项已记录完成' : counts.eligible === 0 ? '任务已取消' : '状态需要核实' : '暂无可显示的任务';
    $('next-step').textContent = task ? '完成状态以清单为准，验证证据单独展示。' : project?.error || 'AI 更新项目清单后，这里会显示任务。'; status = task ? taskStatus(task) : '暂无记录';
  }
  $('focus-status').textContent = status; $('focus-status').className = `status status-${keys[status] || 'unknown'}`;
  return current;
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
  const items = (task?.items || []).filter(item => state.filter === 'all' || (state.filter === 'open' ? !['已完成', '已取消'].includes(item.status) : item.status === '阻塞'));
  const nodes = items.map(item => {
    const index = task.items.indexOf(item), key = keys[item.status] || 'unknown', parts = recordParts(item);
    const li = element('li', `step ${current?.id === item.id ? 'current-step' : ''}`); li.id = `step-${index}`;
    const marker = element('span', `step-marker ${key}`, key === 'completed' ? '✓' : key === 'blocked' ? '!' : String(index + 1)); marker.setAttribute('aria-hidden', 'true');
    const body = element('div', 'step-body'), heading = element('div', 'step-heading'); heading.append(element('strong', 'step-id', item.id), badge(item.status));
    body.append(heading, element('p', 'step-title', parts.title));
    const detail = element('details', 'step-detail'); detail.append(element('summary', '', parts.evidence ? '完整记录与证据' : '查看完整记录'), element('p', '', parts.full));
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
  const attention = (task?.items || []).filter(i => ['阻塞', '待验证', '未知'].includes(i.status));
  const alerts = attention.map(item => { const node = element('div', 'attention-item'); node.append(badge(item.status), element('strong', '', item.id), element('p', '', recordParts(item).full)); return node; });
  if (task?.blocker) alerts.unshift(element('p', 'blocker-note', task.blocker));
  $('blockers').replaceChildren(...(alerts.length ? alerts : [element('p', 'context-empty', '清单未记录阻塞或待验证项。')]));
  $('attention-count').textContent = attention.length + (task?.blocker ? 1 : 0);
  const records = (task?.items || []).map(item => ({ item, evidence: recordParts(item).evidence })).filter(r => r.evidence);
  $('evidence-count').textContent = records.length;
  const evidence = records.map(({item,evidence}) => { const detail = element('details', 'evidence-item'); detail.append(element('summary', '', `${item.id} · ${item.status}`), element('p', '', evidence)); return detail; });
  if (!evidence.length) evidence.push(element('p', 'context-empty', '清单尚未附具体验证证据。'));
  const noProof = (task?.items || []).filter(i => i.status === '已完成' && !recordParts(i).evidence).length;
  if (noProof) evidence.push(element('p', 'context-note', `${noProof} 项标记完成，未单独附证据。`));
  $('evidence').replaceChildren(...evidence);
}
function render() {
  if (!state.projects.some(p => p.id === state.project)) { state.project = state.projects[0]?.id || ''; state.task = ''; state.followLatest = true; }
  const project = state.projects.find(p => p.id === state.project); renderProjects();
  const tasks = project?.tasks || [];
  if (state.followLatest || !tasks.some(t => t.id === state.task)) state.task = tasks.at(-1)?.id || '';
  const task = tasks.find(t => t.id === state.task), counts = task?.counts || blankCounts;
  $('project-title').textContent = project?.name || '暂无项目'; $('project-path').textContent = project?.root || '';
  $('task-title').textContent = task?.title || '暂无任务记录'; $('conversation').textContent = task?.conversation ? `对话：${task.conversation}` : '独立任务记录 · 历史保留';
  $('task-status').textContent = task ? taskStatus(task) : '暂无记录'; $('task-status').className = `status status-${keys[task ? taskStatus(task) : '未知']}`;
  $('updated').textContent = `最后更新：${date(project?.updatedAt)}`; renderTasks(project);
  $('completed').textContent = counts.completed; $('active').textContent = counts.running + counts.verifying; $('pending').textContent = counts.pending + counts.blocked + counts.unknown;
  $('step-count').textContent = counts.total; $('progress').max = Math.max(1, counts.eligible); $('progress').value = counts.completed;
  $('progress-label').textContent = task ? `${counts.completed} / ${counts.eligible} 项已记录完成${counts.cancelled ? ` · ${counts.cancelled} 项取消` : ''}` : '暂无清单';
  $('warnings').hidden = !task?.warnings.length; $('warnings').textContent = task?.warnings.join('；') || '';
  const current = renderFocus(task, project); renderFlow(task, current); renderSteps(task, current); renderContext(task);
}
async function refresh() {
  if (state.loading) return; state.loading = true; $('refresh').disabled = true;
  try {
    const response = await fetch('/api/projects', { cache: 'no-store' }); if (!response.ok) throw new Error('读取失败');
    const data = await response.json(), snapshot = JSON.stringify(data.projects);
    if (snapshot !== state.snapshot) { state.projects = data.projects; state.snapshot = snapshot; render(); }
    $('connection').textContent = `已连接 · ${new Date(data.observedAt).toLocaleTimeString('zh-CN', { hour12: false })}`; $('notice').hidden = true;
  } catch {
    $('connection').textContent = '连接中断'; $('notice').hidden = false;
    $('notice').textContent = '无法连接本机面板。当前显示上次读取的记录，请检查面板进程或刷新。';
  } finally { state.loading = false; $('refresh').disabled = false; }
}
$('task-search').addEventListener('input', event => { state.query = event.target.value; renderTasks(selection().project); });
for (const scope of ['all', 'open']) $(`scope-${scope}`).addEventListener('click', () => { state.taskScope = scope; renderTasks(selection().project); });
$('refresh').addEventListener('click', refresh);
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { state.filter = button.dataset.filter; renderSteps(selection().task, currentItem(selection().task)); }));
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px)').matches) $('task-browser').open = false;
refresh(); setInterval(() => { if (!document.hidden) refresh(); }, 4000);
