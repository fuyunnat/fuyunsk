'use strict';
const $ = id => document.getElementById(id);
const state = { projects: [], project: '', task: '', filter: 'all', loading: false, snapshot: '' };
const keys = { '待做': 'pending', '进行中': 'running', '待验证': 'verifying', '阻塞': 'blocked', '已完成': 'completed', '已取消': 'cancelled', '未知': 'unknown' };
function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function badge(status) { return element('span', `status status-${keys[status] || 'unknown'}`, status); }
function date(value) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'; }
function projectSummary(project) {
  if (project.status === 'missing') return '尚未建立清单';
  if (project.status === 'error') return '清单无法读取';
  if (project.status === 'empty') return '暂无任务记录';
  const count = project.tasks.filter(task => task.counts.completed < task.counts.eligible).length;
  return `${project.tasks.length} 个任务 · ${count} 个有未完项`;
}
function renderProjects() {
  $('project-count').textContent = state.projects.length;
  $('projects').replaceChildren(...state.projects.map(project => {
    const button = element('button', 'project-button'); button.type = 'button'; button.setAttribute('aria-current', String(project.id === state.project));
    const label = element('div'); label.append(element('strong', '', project.name), element('small', '', projectSummary(project)));
    button.append(element('span', 'project-initial', project.name.slice(0, 1)), label);
    button.addEventListener('click', () => { state.project = project.id; state.task = ''; state.filter = 'all'; render(); });
    return button;
  }));
}
function render() {
  if (!state.projects.some(project => project.id === state.project)) state.project = state.projects[0]?.id || '';
  const project = state.projects.find(project => project.id === state.project);
  renderProjects();
  if (!project) return;
  $('project-title').textContent = project.name; $('project-path').textContent = project.root;
  $('updated').textContent = `清单更新时间：${date(project.updatedAt)}`;
  const tasks = project.tasks;
  if (!tasks.some(task => task.id === state.task)) state.task = tasks.at(-1)?.id || '';
  $('task-select').replaceChildren(...tasks.map(task => { const option = element('option', '', task.title); option.value = task.id; return option; }));
  $('task-select').value = state.task; $('task-select').disabled = !tasks.length;
  const task = tasks.find(task => task.id === state.task);
  $('warnings').hidden = !task?.warnings.length; $('warnings').textContent = task?.warnings.join('；') || '';
  $('conversation').textContent = task?.conversation ? `对话：${task.conversation}` : '';
  $('steps').replaceChildren();
  const counts = task?.counts || { completed: 0, running: 0, verifying: 0, pending: 0, blocked: 0, eligible: 0, cancelled: 0, unknown: 0 };
  $('completed').textContent = counts.completed;
  $('active').textContent = counts.running + counts.verifying;
  $('pending').textContent = counts.pending + counts.blocked + counts.unknown;
  $('progress').max = Math.max(1, counts.eligible); $('progress').value = counts.completed;
  $('progress-label').textContent = task ? `${counts.completed} / ${counts.eligible} 项已记录完成${counts.cancelled ? ` · ${counts.cancelled} 项取消` : ''}` : '暂无清单';
  const current = task?.items.find(item => item.id === task.current) || task?.items.find(item => item.status === '进行中') || task?.items.find(item => item.status === '阻塞') || task?.items.find(item => item.status === '待验证') || task?.items.find(item => item.status === '待做');
  let status = '暂无记录';
  if (current) {
    $('focus-label').textContent = current.status === '阻塞' ? '当前阻塞' : '当前一步';
    $('focus-title').textContent = `${current.id} · ${current.description.split(/证据[：:]/)[0].replace(/[；;]\s*$/, '')}`;
    $('next-step').textContent = current.status === '阻塞' ? task.blocker || task.next || '需要补齐条件后继续' : task.next ? `下一步：${task.next}` : task.goal;
    status = current.status;
  } else {
    $('focus-label').textContent = '当前任务';
    $('focus-title').textContent = task ? counts.eligible && counts.completed === counts.eligible ? '清单事项已记录完成' : counts.eligible === 0 ? '任务已取消' : '状态需要核实' : '暂无可显示的任务';
    $('next-step').textContent = task ? '面板读取清单状态，不替代实际验收。' : project.error || 'AI 开始实施并更新清单后，这里会显示进度。';
    status = task && counts.completed === counts.eligible && counts.eligible ? '已完成' : task ? '待核实' : '暂无记录';
  }
  $('focus-status').textContent = status; $('focus-status').className = `status status-${keys[status] || 'unknown'}`;
  const items = (task?.items || []).filter(item => state.filter === 'all' || (state.filter === 'open' ? !['已完成', '已取消'].includes(item.status) : item.status === '阻塞'));
  for (const item of items) {
    const li = element('li', 'step'); const key = keys[item.status] || 'unknown';
    const marker = element('span', `step-marker ${key}`, key === 'completed' ? '✓' : key === 'blocked' ? '!' : key === 'running' ? '•' : ''); marker.setAttribute('aria-hidden', 'true');
    const text = element('div', 'step-title'); const parts = item.description.split(/(?:[；;]\s*)?证据[：:]/);
    text.append(element('strong', '', item.id), document.createTextNode(parts[0]));
    if (parts.length > 1) text.append(element('p', '', `证据：${parts.slice(1).join('证据：')}`));
    li.append(marker, text, badge(item.status)); $('steps').append(li);
  }
  $('empty').hidden = items.length > 0;
  $('empty').textContent = !task ? project.error || '没有可显示的复选框或规划表记录' : state.filter === 'blocked' ? '当前没有阻塞项' : state.filter === 'open' ? '当前没有未完成项' : '暂无步骤';
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter)));
}
async function refresh() {
  if (state.loading) return;
  state.loading = true; $('refresh').disabled = true;
  try {
    const response = await fetch('/api/projects', { cache: 'no-store' });
    if (!response.ok) throw new Error('读取失败');
    const data = await response.json();
    const snapshot = JSON.stringify(data.projects);
    if (snapshot !== state.snapshot) { state.projects = data.projects; state.snapshot = snapshot; render(); }
    $('connection').textContent = `已连接 · ${new Date(data.observedAt).toLocaleTimeString('zh-CN', { hour12: false })}`;
    $('notice').hidden = true;
  } catch {
    $('connection').textContent = '连接中断'; $('notice').hidden = false;
    $('notice').textContent = '无法连接本机面板。当前显示的是上次读取的记录，请检查面板进程或点击刷新。';
  } finally { state.loading = false; $('refresh').disabled = false; }
}
$('task-select').addEventListener('change', event => { state.task = event.target.value; state.filter = 'all'; render(); });
$('refresh').addEventListener('click', refresh);
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { state.filter = button.dataset.filter; render(); }));
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
refresh(); setInterval(() => { if (!document.hidden) refresh(); }, 4000);
