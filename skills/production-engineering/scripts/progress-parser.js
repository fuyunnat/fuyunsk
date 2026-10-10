'use strict';
const crypto = require('node:crypto');
const statusKeys = { '待做': 'pending', '进行中': 'running', '待验证': 'verifying', '阻塞': 'blocked', '已完成': 'completed', '已取消': 'cancelled', '本轮不做': 'deferred', '未知': 'unknown' };
// 只兼容明确的旧阶段标签，不从勾选、包含“完成”或实现结束猜测验收通过。
const statusAliases = new Map([
  ['本轮不实施', '本轮不做'], ['本轮不做 / 未覆盖', '本轮不做'],
  ['本批已实施，停止新增', '已完成'], ['本批证据已核对', '已完成'],
  ['本批已收尾，保留未提交成果', '已完成'], ['盘点已完成，非完整语义审查', '已完成'],
  ['已完成／只读审查', '已完成'], ['已完成隔离验收', '已完成'], ['已完成静态验证', '已完成'],
]);
const clean = value => value.trim().replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
const metadata = [['当前项', 'current'], ['下一步', 'next'], ['目标', 'goal'], ['当前目标', 'goal'], ['保留', 'constraints'], ['禁改/禁止', 'constraints'], ['验收与停止', 'acceptance'], ['验收', 'acceptance'], ['停止条件', 'acceptance'], ['对话', 'conversation'], ['阻塞', 'blocker'], ['基准', 'base']];
const metadataNames = metadata.map(([prefix]) => prefix).join('|');
const annotation = '(?:[（(][^）)\\r\\n]*[）)])?';

function makeTask(title, index) {
  const match = title.match(/^(?:任务|本次任务)[：:]\s*([^—]+?)\s*[—–]\s*(.+)$/);
  const id = match ? match[1].trim() : `task-${crypto.createHash('sha256').update(title).digest('hex').slice(0, 10)}-${index}`;
  return { id, title: match ? clean(match[2]) : clean(title), current: '', next: '', goal: '', constraints: '', acceptance: '', conversation: '', blocker: '', base: '', items: [], warnings: [] };
}

function normalizeItem(item, task) {
  item.recordedStatus = item.status;
  item.status = statusAliases.get(item.status) || item.status;
  if (!Object.hasOwn(statusKeys, item.status)) {
    task.warnings.push(`${item.id} 的状态无法识别`); item.status = '未知';
  }
  if (item.checked !== null && ((item.checked && item.status !== '已完成') || (!item.checked && item.status === '已完成'))) {
    task.warnings.push(`${item.id} 的勾选与状态矛盾，请核实`);
    // 明确阻塞保留；其他矛盾不得显示为已完成。
    if (!['阻塞', '已取消', '本轮不做'].includes(item.status)) item.status = '待验证';
  }
  const existing = task.items.find(old => old.id === item.id);
  if (!existing) { task.items.push(item); return; }
  if (existing.status !== item.status) {
    task.warnings.push(`${item.id} 有重复且冲突的状态，请核实`);
    existing.status = existing.status === '阻塞' || item.status === '阻塞' ? '阻塞' : '待验证';
    existing.description = `${existing.description} / ${item.description}`;
  } else if (existing.description !== item.description) {
    task.warnings.push(`${item.id} 出现重复记录，按同一编号计数`);
  }
}

function parseWorkflow(source) {
  const tasks = []; let task = makeTask('当前任务', 0), fence = null, columns = null;
  const finish = () => { if (task.items.length) tasks.push(task); };
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0];
      else if (fence === fenceMatch[1][0]) fence = null;
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) { finish(); task = makeTask(heading[1], tasks.length); columns = null; continue; }
    const checkbox = line.match(/^\s*[-*+]\s+\[([ xX])\]\s*(?:(\w[\w.-]*)\s*)?(?:【([^】]+)】\s*)?(.*)$/);
    if (checkbox) {
      const checked = checkbox[1].toLowerCase() === 'x';
      normalizeItem({ id: checkbox[2] || `L${index + 1}`, status: checkbox[3] || (checked ? '已完成' : '待做'), checked, description: clean(checkbox[4]), line: index + 1 }, task);
      continue;
    }
    for (const [prefix, field] of metadata) {
      const match = line.match(new RegExp(`(?:^|[；;])\\s*(?:-\\s*)?${prefix}${annotation}[：:]\\s*(.*?)(?=[；;]\\s*(?:-\\s*)?(?:${metadataNames})${annotation}[：:]|$)`));
      if (match) task[field] = clean(match[1]);
    }
    if (line.trim().startsWith('|')) {
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(clean);
      if (cells.some(cell => cell === '状态') && cells.some(cell => /^(?:ID|编号)$/i.test(cell))) {
        columns = { id: cells.findIndex(cell => /^(?:ID|编号)$/i.test(cell)), status: cells.indexOf('状态') }; continue;
      }
      if (columns && cells[columns.id] && !/^-+$/.test(cells[columns.id])) {
        const id = cells[columns.id];
        if (/^[A-Za-z][\w.-]*\d[\w.-]*$/.test(id)) normalizeItem({ id, status: cells[columns.status] || '未知', checked: null, description: cells.filter((_, i) => i !== columns.id && i !== columns.status).join(' · '), line: index + 1 }, task);
      }
    } else if (line.trim()) columns = null;
  }
  finish();
  for (const entry of tasks) {
    entry.counts = { total: entry.items.length, eligible: 0, completed: 0, pending: 0, running: 0, verifying: 0, blocked: 0, cancelled: 0, deferred: 0, unknown: 0 };
    for (const item of entry.items) entry.counts[statusKeys[item.status]]++;
    entry.counts.eligible = entry.counts.total - entry.counts.cancelled - entry.counts.deferred;
  }
  return tasks;
}
module.exports = { parseWorkflow };
