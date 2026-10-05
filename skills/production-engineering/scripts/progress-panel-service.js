#!/usr/bin/env node
'use strict';
const http = require('node:http');
const { spawn } = require('node:child_process');
const { registerProjects, createPanelServer, parseArgs } = require('./progress-panel');
const { runtimeDirectory, readLock, alive, writeOwner, release, acquire, clearStale } = require('./panel-runtime');
const application = 'production-engineering-progress-panel';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const sameRoots = (a, b) => a.length === b.length && a.every(root => b.includes(root));

function probe(port, timeout = 600) {
  return new Promise(resolve => {
    let done = false; const finish = result => { if (!done) { done = true; resolve(result); } };
    const request = http.get({ hostname: '127.0.0.1', port, path: '/api/health', agent: false }, response => {
      let body = ''; response.on('data', chunk => { body += chunk; if (body.length > 32768) { finish({ occupied: true, healthy: false }); response.destroy(); } });
      response.on('end', () => {
        try {
          const data = JSON.parse(body);
          const healthy = response.statusCode === 200 && data.application === application && data.protocol === 1 && Array.isArray(data.projectIds) && data.projectIds.every(id => typeof id === 'string') && Number.isInteger(data.pid);
          finish({ occupied: true, healthy, data: healthy ? data : null });
        } catch { finish({ occupied: true, healthy: false }); }
      });
      response.on('error', () => finish({ occupied: true, healthy: false }));
    });
    request.setTimeout(timeout, () => { finish({ occupied: true, healthy: false }); request.destroy(); });
    request.on('error', error => finish({ occupied: error.code !== 'ECONNREFUSED', healthy: false }));
  });
}
function childArgs(mode, projects, port, token) {
  const args = [__filename, mode, '--token', token, '--port', String(port)];
  for (const p of projects) args.push('--project', p.root, '--label', p.name);
  return args;
}
function matches(health, projects) { return health.healthy && projects.every(p => health.data.projectIds.includes(p.id)); }
async function waitReady(dir, port, projects, token, observing = false) {
  const until = Date.now() + 5000;
  while (Date.now() < until) {
    const health = await probe(port), lock = readLock(dir, port);
    if (matches(health, projects) && lock && ['running', 'observing'].includes(lock.state) && alive(lock.pid) && (!token || observing || health.data.instanceId === token)) return health; if (!lock || (!lock.pending && !alive(lock.pid))) break;
    await delay(80);
  }
  throw new Error('面板正在恢复或启动失败，尚未确认在线；未重复启动，请查看运行状态');
}
async function ensureAt(projects, port, dir, attempts = 0, foreground = false) {
  if (attempts > 5) throw new Error('启动竞争尚未结束，未无限重试，请稍后检查');
  const health = await probe(port), current = readLock(dir, port);
  if (matches(health, projects) && current && !current.pending && alive(current.pid) && sameRoots(current.roots, projects.map(p => p.root)) && (current.token === health.data.instanceId || current.state === 'observing')) return { status: 'reused', port, url: `http://127.0.0.1:${port}`, supervised: true };
  if (current && (current.pending || alive(current.pid))) {
    if (!current.pending && !sameRoots(current.roots, projects.map(p => p.root))) return null;
    await waitReady(dir, port, projects, current.token, current.state === 'observing');
    return { status: 'reused', port, url: `http://127.0.0.1:${port}`, supervised: true };
  }
  if (health.occupied && !matches(health, projects)) return null;
  clearStale(dir, port, current);
  const lock = acquire(dir, port, projects.map(p => p.root), projects.map(p => ({ root: p.root, device: p.device, inode: p.inode })));
  if (!lock) { await delay(80); return ensureAt(projects, port, dir, attempts + 1, foreground); }
  const args = childArgs('--supervise', projects, port, lock.token);
  const observing = matches(health, projects); if (observing) args.push('--observe');
  const child = spawn(process.execPath, args, { detached: !foreground, stdio: 'ignore', windowsHide: true });
  if (foreground) {
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill('SIGTERM'));
  } else child.unref();
  child.on('error', () => { try { release(dir, port, lock.token); } catch {} });
  await waitReady(dir, port, projects, lock.token, observing);
  return { status: observing ? 'reused' : 'started', port, url: `http://127.0.0.1:${port}`, supervised: true };
}
async function ensurePanel(options) {
  const projects = registerProjects(options.projects), dir = runtimeDirectory();
  const first = options.port || 4318, last = options.explicitPort ? first : Math.min(first + 19, 65535);
  for (let port = first; port <= last; port++) { const result = await ensureAt(projects, port, dir, 0, !!options.foreground); if (result) return result; }
  throw new Error('面板端口被占用或属于其他项目；未停止任何现有服务，请指定其他端口');
}
async function stopPanel(options) {
  const projects = registerProjects(options.projects), dir = runtimeDirectory();
  const first = options.port || 4318, last = options.explicitPort ? first : Math.min(first + 19, 65535);
  for (let port = first; port <= last; port++) {
    const lock = readLock(dir, port); if (!lock || lock.pending) continue;
    if (!sameRoots(lock.roots, projects.map(p => p.root))) { if (options.explicitPort) throw new Error('面板属于其他项目，拒绝停止'); continue; }
    release(dir, port, lock.token);
    const until = Date.now() + 5000;
    while (Date.now() < until) { const p = await probe(port); if (!p.healthy || p.data.instanceId !== lock.token) return { stopped: true, port, panelStillRunning: p.healthy && p.data.instanceId !== lock.token }; await delay(80); }
    throw new Error('已请求停止守护，但面板退出尚未确认');
  }
  return { stopped: false };
}

function validateIdentities(projects, record) {
  if (!record || !Array.isArray(record.identities) || projects.length !== record.identities.length || projects.some(p => !record.identities.some(i => i.root === p.root && i.device === p.device && i.inode === p.inode))) throw new Error('项目根身份发生变化，未跨项目重新启动');
}
function serve(options, token) {
  const projects = registerProjects(options.projects), record = readLock(runtimeDirectory(), options.port);
  if (!record || record.token !== token) throw new Error('面板运行锁已撤销');
  validateIdentities(projects, record);
  const server = createPanelServer(projects, { instanceId: token });
  server.on('error', () => { process.exitCode = 1; });
  server.listen(options.port, '127.0.0.1');
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.closeAllConnections(); server.close(); });
}
function supervise(options, token) {
  const projects = registerProjects(options.projects), dir = runtimeDirectory();
  const owner = readLock(dir, options.port);
  if (!owner || owner.token !== token || !sameRoots(owner.roots, projects.map(p => p.root))) throw new Error('没有本次启动的运行锁');
  validateIdentities(projects, owner);
  const record = { ...owner, pid: process.pid }; delete record.inode;
  writeOwner(dir, options.port, record);
  let child, timer, restarting, stopping = false, checking = false, failedProbes = 0, observing = !!options.observe;
  const failures = [];
  const update = state => { const lock = readLock(dir, options.port); if (lock && lock.token === token) writeOwner(dir, options.port, { ...record, state, restarts: failures.length }); };
  function stop() {
    if (stopping) return; stopping = true; clearInterval(timer); clearTimeout(restarting);
    if (child) {
      const owned = child; owned.kill('SIGTERM'); const force = setTimeout(() => owned.kill('SIGKILL'), 1500);
      owned.once('close', () => clearTimeout(force));
    }
    release(dir, options.port, token);
  }
  function launch() {
    if (stopping) return;
    const lock = readLock(dir, options.port); if (!lock || lock.token !== token) return stop();
    failedProbes = 0; child = spawn(process.execPath, childArgs('--serve', projects, options.port, token), { stdio: 'ignore', windowsHide: true });
    let closed = false;
    function lost() {
      if (closed) return; closed = true; child = null; if (stopping) return;
      const now = Date.now(); while (failures.length && failures[0] < now - 60000) failures.shift();
      failures.push(now); if (failures.length >= 5) { update('failed'); return stop(); }
      update('restarting'); restarting = setTimeout(launch, Math.min(250 * 2 ** (failures.length - 1), 4000));
    }
    child.on('error', lost); child.on('close', lost); update('running');
  }
  timer = setInterval(async () => {
    if (checking || stopping) return; checking = true;
    try {
      const lock = readLock(dir, options.port); if (!lock || lock.token !== token) return stop();
      if (observing) {
        const health = await probe(options.port);
        if (matches(health, projects)) return;
        if (health.occupied) return stop();
        observing = false; return launch();
      }
      if (!child) return;
      const owned = child, health = await probe(options.port);
      if (owned !== child || stopping) return;
      if (health.healthy && health.data.instanceId === token) failedProbes = 0;
      else if (++failedProbes >= 3) {
        owned.kill('SIGTERM'); const force = setTimeout(() => { if (owned === child) owned.kill('SIGKILL'); }, 1500);
        owned.once('close', () => clearTimeout(force));
      }
    } catch { stop(); } finally { checking = false; }
  }, 1000);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop);
  if (observing) update('observing'); else launch();
}
function parseServiceArgs(argv) {
  let mode = '--ensure', token, observe = false, foreground = false; const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (['--ensure', '--stop', '--serve', '--supervise'].includes(argv[i])) mode = argv[i];
    else if (argv[i] === '--foreground') foreground = true;
    else if (argv[i] === '--observe') observe = true;
    else if (argv[i] === '--token') token = argv[++i]; else rest.push(argv[i]);
  }
  return { mode, token, options: { ...parseArgs(rest), observe, foreground, explicitPort: rest.includes('--port') } };
}
if (require.main === module) (async () => {
  const { mode, token, options } = parseServiceArgs(process.argv.slice(2));
  if (options.help) return console.log('用法：node progress-panel-service.js --ensure|--stop --project "项目=/绝对路径" [--port 4318] [--foreground]\n自动复用本机面板，离线启动守护；仅守护自己创建的子进程，不关闭外部服务。');
  if (mode === '--serve' || mode === '--supervise') { if (!/^[a-f0-9]{32}$/.test(token || '')) throw new Error('内部运行标识缺失'); return mode === '--serve' ? serve(options, token) : supervise(options, token); }
  const result = mode === '--stop' ? await stopPanel(options) : await ensurePanel(options);
  console.log(JSON.stringify(result));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { ensurePanel, stopPanel, probe, runtimeDirectory, readLock };
