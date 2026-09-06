#!/usr/bin/env node
'use strict';

// 只读预检，不执行传入命令、不写业务文件；不能替代操作系统沙箱。
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const limitation = '仅检查本次列出的路径；不证明任务授权，不拦截其他工具、脚本副作用、并发换链或同设备挂载。';
const ensure = (ok, message) => { if (!ok) throw new Error(message); };

function absolute(value, label) {
  ensure(typeof value === 'string' && value.trim(), `${label} 必须提供绝对路径`);
  ensure(!/[\x00-\x1f\x7f*?\[\]{}$~]/.test(value), `${label} 包含未展开变量、通配符或控制字符`);
  ensure(path.isAbsolute(value), `${label} 必须是绝对路径，不能依赖当前工作目录`);
  ensure(process.platform === 'win32' || !/[\\:]/.test(value), `${label} 不是当前系统的普通路径`);
  ensure(!value.split(/[\\/]/).some(p => p === '..' || p === '.'), `${label} 不允许 . 或 .. 路径片段`);
  if (process.platform === 'win32') {
    ensure(/^[a-z]:[\\/]/i.test(value) && !value.slice(2).includes(':'), '拒绝网络路径、设备路径及备用数据流');
  }
  return path.normalize(value);
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function statMaybe(file) {
  try { return fs.lstatSync(file); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

function canonicalIfPresent(file) {
  return fs.existsSync(file) ? fs.realpathSync(file) : path.resolve(file);
}

function binding(projectRoot) {
  const provided = absolute(projectRoot, '项目根目录');
  const root = fs.realpathSync(provided);
  const stat = fs.statSync(root);
  ensure(stat.isDirectory(), '项目根目录不是已有目录，不能自动新建或改选邻接项目');
  const home = canonicalIfPresent(os.homedir());
  const protectedRoots = [
    process.env.CODEX_HOME || path.join(home, '.codex'),
    path.join(home, '.codex'), path.join(home, '.agents'), path.resolve(__dirname, '..'),
  ].map(canonicalIfPresent);
  ensure(root !== path.parse(root).root && root !== home, '不能绑定文件系统根目录或用户主目录');
  ensure(!protectedRoots.some(p => inside(p, root)), '不能绑定 Codex 配置或技能安装目录');
  const rootId = crypto.createHash('sha256').update(JSON.stringify([root, String(stat.dev), String(stat.ino)])).digest('hex');
  return { projectRoot: root, rootId, device: stat.dev };
}

function inspect(bound, input, label, readOnlyRoots = []) {
  const dest = absolute(input, label);
  const root = bound.projectRoot;
  ensure(inside(root, dest), `${label} 越出绑定项目：${dest}`);
  const rel = path.relative(root, dest);
  ensure(!readOnlyRoots.some(p => inside(p, dest)), `${label} 命中只读参考目录：${dest}`);
  let cursor = root;
  const parts = rel ? rel.split(path.sep) : [];
  let last = fs.lstatSync(root);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    ensure(!['.git', '.codex', '.agents'].includes(part.toLowerCase()), `${label} 命中受保护元数据目录`);
    cursor = path.join(cursor, part);
    last = statMaybe(cursor);
    if (!last) continue; // 尚未创建的后缀仍以已核对的已有祖先为边界。
    ensure(!last.isSymbolicLink(), `${label} 含符号链接或目录联接，先核对真实路径：${cursor}`);
    ensure(last.isFile() || last.isDirectory(), `${label} 不是普通文件或目录：${cursor}`);
    ensure(last.dev === bound.device, `${label} 跨设备挂载，不能自动写入：${cursor}`);
    ensure(inside(root, fs.realpathSync(cursor)), `${label} 真实路径越界：${cursor}`);
    ensure(!(last.isFile() && last.nlink > 1), `${label} 是硬链接文件，可能影响其他项目：${cursor}`);
    ensure(i === parts.length - 1 || last.isDirectory(), `${label} 的父路径不是目录：${cursor}`);
    if (last.isDirectory()) ensure(!statMaybe(path.join(cursor, '.git')), `${label} 进入嵌套独立仓库：${cursor}`);
  }
  return { path: dest, exists: !!last, kind: last ? (last.isDirectory() ? 'directory' : 'file') : 'missing' };
}

function check(options) {
  const bound = binding(options.projectRoot);
  ensure(/^[a-f0-9]{64}$/.test(options.rootId || ''), '缺少首次绑定的 rootId，不能临时重算以放行');
  ensure(bound.rootId === options.rootId, '项目根目录身份变化；停止写入并重新核对当前聊天目标');
  ensure(['file', 'new-project'].includes(options.operation || 'file'), '操作只支持 file 或 new-project');
  const readOnlyRoots = (options.readOnlyRoots || []).map(p => canonicalIfPresent(absolute(p, '只读参考目录')));
  const cwd = inspect(bound, options.cwd, '工具工作目录', readOnlyRoots);
  ensure(cwd.exists && cwd.kind === 'directory', '工具工作目录必须是项目内已有目录');
  ensure(Array.isArray(options.paths) && options.paths.length > 0 && options.paths.length <= 256, '一次提供 1 至 256 个具体目标路径');
  const paths = [...new Set(options.paths)].map(p => {
    const item = inspect(bound, p, '写入目标', readOnlyRoots);
    ensure(item.path !== bound.projectRoot, '禁止把整个项目根作为写入或覆盖目标');
    if (options.operation === 'new-project') {
      ensure(!item.exists, '新工程目标已经存在；不得清空、覆盖或合并现有项目');
    } else {
      ensure(item.kind !== 'directory', '逐文件写入必须列出具体文件，不能把目录通过当作递归操作授权');
    }
    return item;
  });
  return { pathCheckPassed: true, projectRoot: bound.projectRoot, rootId: bound.rootId,
    cwd: cwd.path, paths, scope: 'preflight-only', limitation };
}

function parse(args) {
  const command = args[0];
  if (command === '--help' || command === '-h') return { command: 'help' };
  ensure(['bind', 'check'].includes(command), '使用 bind 或 check；--help 查看用法');
  const result = { command, paths: [], readOnlyRoots: [] };
  const names = { '--project-root': 'projectRoot', '--root-id': 'rootId', '--cwd': 'cwd', '--operation': 'operation' };
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    ensure(Object.hasOwn(names, arg) || ['--path', '--read-only'].includes(arg), `未知参数：${arg}`);
    const value = args[++i];
    ensure(value && !value.startsWith('--'), `参数缺少值：${arg}`);
    if (arg === '--path') result.paths.push(value);
    else if (arg === '--read-only') result.readOnlyRoots.push(value);
    else { ensure(result[names[arg]] === undefined, `参数不可重复：${arg}`); result[names[arg]] = value; }
  }
  if (command === 'bind') ensure(!result.cwd && !result.rootId && !result.operation && !result.paths.length && !result.readOnlyRoots.length, 'bind 只接受 --project-root');
  return result;
}

function main(args) {
  const options = parse(args);
  if (options.command === 'help') {
    console.log(`用法：project-path-check.js bind --project-root <当前聊天项目绝对路径>
预检：project-path-check.js check --project-root <绑定返回的真实根目录> --root-id <首次绑定值> --cwd <本次工具工作目录> --path <目标绝对路径> [--path <其他文件>] [--read-only <只读参考目录>] [--operation file|new-project]
只读预检；失败退出码 2。不会执行命令、写文件、安装依赖或修改沙箱。rootId 不是授权凭证。
${limitation}`);
    return;
  }
  const out = options.command === 'bind' ? { ...binding(options.projectRoot), scope: 'binding-only', limitation } : check(options);
  console.log(JSON.stringify(out, null, 2));
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`路径预检拒绝：${error.message}`); process.exitCode = 2; }
}
module.exports = { binding, check, inside, parse };
