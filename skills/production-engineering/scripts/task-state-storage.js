'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function rawCodexHome() { return path.resolve(process.env.CODEX_HOME || path.join(os.homedir(), '.codex')); }

function codexHome() {
  const raw = rawCodexHome();
  let parent = path.dirname(raw), suffix = [path.basename(raw)];
  while (!statOrNull(parent)) { suffix.unshift(path.basename(parent)); parent = path.dirname(parent); }
  if (fs.lstatSync(parent).isSymbolicLink()) throw new Error(`任务状态目录祖先不可为链接：${parent}`);
  return path.join(fs.realpathSync(parent), ...suffix);
}

function externalStatePath(repo) {
  const key = crypto.createHash('sha256').update(repo).digest('hex').slice(0, 16);
  return path.join(codexHome(), 'task-states', key, 'task-state.md');
}

function validateStatePath(repo, candidate) {
  if (typeof candidate !== 'string' || !path.isAbsolute(candidate) || candidate !== path.resolve(candidate)) {
    throw new Error('任务状态索引目标必须是明确的绝对路径');
  }
  const local = path.join(repo, 'work', 'task-state.md'), external = externalStatePath(repo);
  // 兼容旧记录中的系统目录别名（如 macOS /var），不跟随状态路径自身的链接。
  const legacyExternal = path.join(rawCodexHome(), path.relative(codexHome(), external));
  const target = candidate === legacyExternal ? external : candidate;
  if (target !== local && target !== external) throw new Error(`任务状态索引目标不属于当前项目的专用状态文件：${candidate}`);
  assertSafeFile(target);
  return target;
}

function statOrNull(file) {
  try { return fs.lstatSync(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function directoryChain(directory, create = false) {
  const absolute = path.resolve(directory), root = path.parse(absolute).root;
  let current = root;
  const identities = [];
  for (const part of absolute.slice(root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat = statOrNull(current);
    if (!stat && create) {
      try { fs.mkdirSync(current, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      stat = fs.lstatSync(current);
    }
    if (!stat) return identities;
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`任务状态目录不可为链接或其他文件：${current}`);
    identities.push([current, stat.dev, stat.ino]);
  }
  return identities;
}

function assertSafeFile(file) {
  directoryChain(path.dirname(file));
  const stat = statOrNull(file);
  if (stat && (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1)) {
    throw new Error(`任务状态文件不可为链接、共享硬链接或特殊文件：${file}`);
  }
  return stat;
}

function sameFile(left, right) { return left && right && left.dev === right.dev && left.ino === right.ino; }

function readPrivateText(file) {
  const before = assertSafeFile(file);
  if (!before) throw new Error(`任务状态文件不存在：${file}`);
  const descriptor = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const opened = fs.fstatSync(descriptor);
    if (!sameFile(before, opened) || !opened.isFile() || opened.nlink !== 1 || !sameFile(opened, assertSafeFile(file))) {
      throw new Error(`任务状态文件在读取前发生变化：${file}`);
    }
    return fs.readFileSync(descriptor, 'utf8');
  } finally { fs.closeSync(descriptor); }
}

function writePrivateText(file, content) {
  assertSafeFile(file);
  const parents = directoryChain(path.dirname(file), true), before = assertSafeFile(file);
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${crypto.randomBytes(16).toString('hex')}.tmp`);
  const descriptor = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0), 0o600);
  try {
    const opened = fs.fstatSync(descriptor), openedParents = directoryChain(path.dirname(file));
    if (JSON.stringify(openedParents) !== JSON.stringify(parents)) throw new Error(`任务状态目录在写入正文前发生变化：${file}`);
    const located = assertSafeFile(temporary);
    if (!opened.isFile() || opened.nlink !== 1 || !sameFile(opened, located) || fs.realpathSync(temporary) !== temporary) {
      throw new Error(`任务状态临时文件在写入正文前发生变化：${file}`);
    }
    fs.writeFileSync(descriptor, content, 'utf8');
    fs.fsyncSync(descriptor);
  } finally { fs.closeSync(descriptor); }
  const currentParents = directoryChain(path.dirname(file));
  if (JSON.stringify(currentParents) !== JSON.stringify(parents)) throw new Error(`任务状态目录在写入前发生变化：${file}`);
  const current = assertSafeFile(file);
  if (Boolean(current) !== Boolean(before) || (before && !sameFile(before, current))) throw new Error(`任务状态文件在写入前发生变化：${file}`);
  fs.renameSync(temporary, file);
  assertSafeFile(file);
}

module.exports = { codexHome, externalStatePath, validateStatePath, assertSafeFile, readPrivateText, writePrivateText, directoryChain };
