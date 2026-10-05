'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

function safeDirectory(dir, create = false) {
  if (create) { try { fs.mkdirSync(dir, { mode: 0o700 }); } catch (e) { if (e.code !== 'EEXIST') throw e; } }
  const stat = fs.lstatSync(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink() || fs.realpathSync(dir) !== dir) throw new Error('面板运行目录不安全');
  if (process.getuid && (stat.uid !== process.getuid() || (stat.mode & 0o077))) throw new Error('面板运行目录不是当前用户私有目录');
  return stat;
}
function runtimeDirectory() {
  const owner = process.getuid ? String(process.getuid()) : crypto.createHash('sha256').update(os.userInfo().username).digest('hex').slice(0, 12);
  const dir = path.join(fs.realpathSync(os.tmpdir()), `production-engineering-panel-${owner}`);
  safeDirectory(dir, true); return dir;
}
const lockDirectory = (dir, port) => path.join(dir, `port-${port}.lock`);
function readLock(dir, port) {
  const lock = lockDirectory(dir, port);
  try {
    const stat = safeDirectory(lock);
    const fd = fs.openSync(path.join(lock, 'owner.json'), fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    try {
      const s = fs.fstatSync(fd); if (!s.isFile() || s.size > 32768) throw new Error('面板运行记录无效');
      const data = JSON.parse(fs.readFileSync(fd, 'utf8'));
      if (!Number.isInteger(data.pid) || data.pid < 1 || data.pid > 2147483647 || !/^[a-f0-9]{32}$/.test(data.token) || !Array.isArray(data.roots) || data.roots.some(r => typeof r !== 'string' || !path.isAbsolute(r))) throw new Error('面板运行记录无效');
      return { ...data, inode: stat.ino };
    } finally { fs.closeSync(fd); }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    try { const stat = safeDirectory(lock); return { pending: true, createdAt: stat.mtimeMs, inode: stat.ino }; }
    catch (missing) { if (missing.code === 'ENOENT') return null; throw missing; }
  }
}
function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { if (e.code === 'ESRCH') return false; if (e.code === 'EPERM') return true; throw e; }
}
function writeOwner(dir, port, data) {
  const lock = lockDirectory(dir, port); safeDirectory(lock);
  const file = path.join(lock, `owner-${data.token}.tmp`);
  fs.writeFileSync(file, JSON.stringify(data), { flag: 'wx', mode: 0o600 });
  fs.renameSync(file, path.join(lock, 'owner.json'));
}
function release(dir, port, token) {
  const current = readLock(dir, port); if (!current || current.token !== token) return false;
  const lock = lockDirectory(dir, port); if (safeDirectory(lock).ino !== current.inode) return false;
  const retired = `${lock}.stopping-${token}`; fs.renameSync(lock, retired);
  for (const name of ['owner.json', `owner-${token}.tmp`]) { try { fs.unlinkSync(path.join(retired, name)); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
  try { fs.rmdirSync(retired); } catch (e) { if (e.code !== 'ENOTEMPTY') throw e; }
  return true;
}
function acquire(dir, port, roots, identities) {
  const lock = lockDirectory(dir, port);
  try { fs.mkdirSync(lock, { mode: 0o700 }); }
  catch (e) { if (e.code === 'EEXIST') return null; throw e; }
  const data = { pid: process.pid, token: crypto.randomBytes(16).toString('hex'), roots, identities, createdAt: Date.now(), state: 'starting' };
  try { writeOwner(dir, port, data); return data; }
  catch (e) { try { fs.rmdirSync(lock); } catch {} throw e; }
}
function clearStale(dir, port, current) {
  if (!current) return;
  if (current.pending) {
    if (Date.now() - current.createdAt > 10000 && safeDirectory(lockDirectory(dir, port)).ino === current.inode) fs.rmdirSync(lockDirectory(dir, port));
  } else if (!alive(current.pid)) release(dir, port, current.token);
}
module.exports = { runtimeDirectory, readLock, alive, writeOwner, release, acquire, clearStale };
