#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { parseWorkflow } = require('./progress-parser');
const assets = path.resolve(__dirname, '../assets/progress-panel');
const maxBytes = 5 * 1024 * 1024;
const staticRoutes = { '/': ['index.html', 'text/html'], '/panel.js': ['panel.js', 'text/javascript'], '/panel.css': ['panel.css', 'text/css'] };

function registerProjects(entries) {
  if (!entries.length) throw new Error('至少指定一个 --project 绝对路径；不自动扫描项目');
  const seen = new Set();
  return entries.map(entry => {
    if (!path.isAbsolute(entry.root)) throw new Error('项目根必须是已核实的绝对路径');
    const root = fs.realpathSync(entry.root);
    if (!fs.statSync(root).isDirectory()) throw new Error('项目根不是目录');
    if (seen.has(root)) throw new Error('同一实际项目重复登记');
    seen.add(root);
    const identity = fs.statSync(root);
    return Object.freeze({ device: identity.dev, inode: identity.ino, id: crypto.createHash('sha256').update(root).digest('hex').slice(0, 16), name: entry.name || path.basename(root), root });
  });
}

function readProject(project) {
  const { device, inode, ...publicProject } = project;
  const result = { ...publicProject, status: 'ready', updatedAt: null, tasks: [], error: '' };
  let fd;
  try {
    const rootStat = fs.statSync(project.root);
    if (fs.realpathSync(project.root) !== project.root || rootStat.dev !== device || rootStat.ino !== inode) throw new Error('项目根发生变化，请重新核实');
    const file = path.join(project.root, '工作流程.md');
    // 只读固定文件，拒绝符号链接；不接受浏览器传入路径，不读取配置、数据库或状态快照。
    if (fs.lstatSync(file).isSymbolicLink()) throw new Error('清单为符号链接，拒绝读取');
    fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) throw new Error('清单不是普通文件');
    if (stat.size > maxBytes) throw new Error('清单超过 5MB；未截断，请按授权整理后再看');
    const buffer = fs.readFileSync(fd);
    if (buffer.length > maxBytes) throw new Error('清单超过 5MB；未截断，请按授权整理后再看');
    result.tasks = parseWorkflow(buffer.toString('utf8'));
    result.updatedAt = stat.mtime.toISOString();
    if (!result.tasks.length) result.status = 'empty';
  } catch (error) {
    result.status = error.code === 'ENOENT' ? 'missing' : 'error';
    result.error = error.code === 'ENOENT' ? '没有工作流程.md；面板不会创建清单' : error.code === 'EACCES' ? '清单不可读，请核实权限' : error.code ? '读取失败，请核实项目路径与文件' : error.message;
  } finally { if (fd !== undefined) fs.closeSync(fd); }
  return result;
}

function createPanelServer(projects, options = {}) {
  return http.createServer((request, response) => {
    const port = String(response.socket.localPort);
    const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'" };
    const send = (code, body, type = 'text/plain') => { response.writeHead(code, { ...headers, 'Content-Type': `${type}; charset=utf-8` }); response.end(body); };
    if (!hosts.has(request.headers.host)) return send(403, '只允许本机访问');
    if (request.headers.origin && !hosts.has(request.headers.origin.replace(/^http:\/\//, ''))) return send(403, '拒绝外部来源');
    if (request.headers['sec-fetch-site'] === 'cross-site') return send(403, '拒绝跨站请求');
    if (request.method !== 'GET') return send(405, '面板只读，不支持写入');
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.search) return send(400, '不接受浏览器传入项目路径或参数');
    if (url.pathname === '/api/health') return send(200, JSON.stringify({ application: 'production-engineering-progress-panel', protocol: 1, instanceId: options.instanceId || null, pid: process.pid, projectIds: projects.map(p => p.id) }), 'application/json');
    if (url.pathname === '/api/projects') return send(200, JSON.stringify({ observedAt: new Date().toISOString(), projects: projects.map(readProject) }), 'application/json');
    if (!Object.hasOwn(staticRoutes, url.pathname)) return send(404, '没有这个页面');
    const [file, type] = staticRoutes[url.pathname];
    try { send(200, fs.readFileSync(path.join(assets, file)), type); }
    catch { send(500, '面板资源缺失，请核实技能安装'); }
  });
}

function parseArgs(argv) {
  const options = { projects: [], port: 4318, help: false };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--help') { options.help = true; continue; }
    if (!['--project', '--port', '--label'].includes(key)) throw new Error(`未知参数：${key}`);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`${key} 缺少值`);
    if (key === '--label') {
      if (!options.projects.length) throw new Error('--label 必须跟在 --project 后');
      options.projects.at(-1).name = value;
    } else if (key === '--project') {
      const equals = value.indexOf('=');
      options.projects.push(equals > 0 && !path.isAbsolute(value) ? { name: value.slice(0, equals), root: value.slice(equals + 1) } : { root: value });
    } else {
      options.port = Number(value);
      if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) throw new Error('端口必须为 1–65535 的整数');
    }
  }
  return options;
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) console.log('用法：node progress-panel.js --project "项目甲=/绝对路径/项目甲" [--project "/绝对路径/项目乙"] [--port 4318]\n本机只读面板；Ctrl+C 停止。不扫描项目，不启动业务服务，不写进度文件。');
    else {
      const projects = registerProjects(options.projects), server = createPanelServer(projects);
      server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? '端口已占用，用 --port 指定其他端口' : `面板启动失败：${error.message}`); process.exitCode = 1; });
      server.listen(options.port, '127.0.0.1', () => console.log(`AI 工作进度：http://127.0.0.1:${options.port}\n只读 ${projects.length} 个指定项目的工作流程.md；Ctrl+C 停止。`));
      for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.closeAllConnections(); server.close(); });
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { registerProjects, readProject, createPanelServer, parseArgs };
