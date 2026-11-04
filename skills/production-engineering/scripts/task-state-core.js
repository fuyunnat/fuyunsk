'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { labels, reverse, valueOut, valueIn } = require('./task-state-language');
const { runGit } = require('./task-state-git');
const { codexHome, externalStatePath, validateStatePath, assertSafeFile, readPrivateText, writePrivateText, directoryChain } = require('./task-state-storage');

const FIELD_ORDER = [
  'Task ID',
  'Updated at',
  'Latest user goal',
  'Acceptance criteria',
  'Task status',
  'Implementation status',
  'Verification status',
  'Current mode',
  'Current lane and reason',
  'Repository/path',
  'Branch and stable point',
  'Current fingerprint',
  'Verified fingerprint',
  'Existing user changes',
  'Authorization',
  'Do-not-touch',
  'Source references',
  'Migration manifest',
  'Migration baseline',
  'Migration history',
  'Decisions',
  'Changed/planned files',
  'Validation evidence',
  'Current blockers',
  'Next step',
  'PR/CI/remote state',
  'Rollback',
  'Unverified risk',
];

const OPTION_TO_FIELD = {
  'task-status': 'Task status',
  'implementation-status': 'Implementation status',
  'verification-status': 'Verification status',
  goal: 'Latest user goal',
  acceptance: 'Acceptance criteria',
  mode: 'Current mode',
  lane: 'Current lane and reason',
  authorization: 'Authorization',
  'do-not-touch': 'Do-not-touch',
  'source-references': 'Source references',
  decisions: 'Decisions',
  'changed-files': 'Changed/planned files',
  blockers: 'Current blockers',
  'next-step': 'Next step',
  'remote-state': 'PR/CI/remote state',
  rollback: 'Rollback',
  'unverified-risk': 'Unverified risk',
};

function now() {
  return new Date().toISOString();
}

function isGitRepository(candidate) {
  return runGit(candidate, ['rev-parse', '--is-inside-work-tree'], true).status === 0;
}

function canonicalProject(input) {
  const candidate = path.resolve(input || process.cwd());
  if (!fs.existsSync(candidate)) {
    throw new Error(`项目路径不存在：${candidate}`);
  }

  if (isGitRepository(candidate)) {
    return fs.realpathSync(runGit(candidate, ['rev-parse', '--show-toplevel']).stdout.trim());
  }
  return fs.realpathSync(candidate);
}

function legacyRegistryPath() {
  return path.join(codexHome(), 'task-states', 'index.json');
}

function registryDirectory() {
  return path.join(codexHome(), 'task-states', 'index');
}

function registryRecordPath(repo) {
  const key = crypto.createHash('sha256').update(repo).digest('hex').slice(0, 24);
  return path.join(registryDirectory(), `${key}.json`);
}

function readJsonFile(file, label) {
  let parsed;
  try {
    parsed = JSON.parse(readPrivateText(file));
  } catch (error) {
    throw new Error(`${label} 不是有效 JSON：${file}\n${error.message}`);
  }
  return parsed;
}

function readLegacyRegistry() {
  const file = legacyRegistryPath();
  if (!assertSafeFile(file)) {
    return { version: 1, projects: {} };
  }

  const parsed = readJsonFile(file, '旧任务状态索引');
  if (!parsed || parsed.version !== 1 || !parsed.projects || Array.isArray(parsed.projects) || typeof parsed.projects !== 'object') {
    throw new Error(`旧任务状态索引格式不支持：${file}`);
  }
  return parsed;
}

function readRegistryRecord(repo) {
  const file = registryRecordPath(repo);
  if (assertSafeFile(file)) {
    const record = readJsonFile(file, '任务状态索引记录');
    if (!record || record.version !== 1 || record.repository !== repo || typeof record.statePath !== 'string') {
      throw new Error(`任务状态索引记录格式不支持：${file}`);
    }
    validateStatePath(repo, record.statePath);
    return record;
  }
  const record = readLegacyRegistry().projects[repo] || null;
  if (record) validateStatePath(repo, record.statePath);
  return record;
}

function readAllRegistryRecords() {
  const records = { ...readLegacyRegistry().projects };
  const directory = registryDirectory();
  directoryChain(directory);
  if (!fs.existsSync(directory)) {
    return records;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.name.endsWith('.json')) {
      continue;
    }
    const file = path.join(directory, entry.name);
    const record = readJsonFile(file, '任务状态索引记录');
    if (!record || record.version !== 1 || typeof record.repository !== 'string' || typeof record.statePath !== 'string' ||
        !path.isAbsolute(record.repository) || record.repository !== path.resolve(record.repository)) {
      throw new Error(`任务状态索引记录格式不支持：${file}`);
    }
    if (file !== registryRecordPath(record.repository)) throw new Error(`任务状态索引文件与项目身份不一致：${file}`);
    records[record.repository] = record;
  }
  return records;
}

function registerState(repo, statePath, fields) {
  const record = {
    version: 1,
    repository: repo,
    statePath: path.resolve(statePath),
    taskId: fields['Task ID'] || '',
    status: fields['Task status'] || '',
    updatedAt: fields['Updated at'] || now(),
  };
  writePrivateText(registryRecordPath(repo), `${JSON.stringify(record, null, 2)}\n`);
}

function isIgnored(repo, relativePath) {
  if (!isGitRepository(repo)) {
    return false;
  }
  return runGit(repo, ['check-ignore', '-q', '--', relativePath], true).status === 0;
}

function locateState(repo, forInitialization = false) {
  const registered = readRegistryRecord(repo)?.statePath;
  const registeredPath = registered ? validateStatePath(repo, registered) : null;
  if (registeredPath && (assertSafeFile(registeredPath) || forInitialization)) {
    return registeredPath;
  }

  const local = path.join(repo, 'work', 'task-state.md');
  if (assertSafeFile(local)) {
    return local;
  }
  if (forInitialization && isIgnored(repo, 'work/task-state.md')) {
    return local;
  }
  return validateStatePath(repo, externalStatePath(repo));
}

function parseState(content) {
  const fields = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^- ([^:]+):\s*(.*)$/);
    if (match) {
      const key = reverse[match[1].trim()] || match[1].trim();
      fields[key] = valueIn(key, match[2].trim());
    }
  }
  return fields;
}

function singleLine(value) {
  return String(value || '').replace(/\s*\r?\n\s*/g, ' / ').trim();
}

function renderState(fields) {
  const lines = ['# 任务状态', ''];
  for (const field of FIELD_ORDER) {
    lines.push(`- ${labels[field] || field}: ${singleLine(valueOut(field, fields[field]))}`);
  }
  return `${lines.join('\n')}\n`;
}

function readState(repo, forInitialization = false) {
  const statePath = locateState(repo, forInitialization);
  if (!fs.existsSync(statePath)) {
    return { statePath, fields: null };
  }
  return {
    statePath,
    fields: parseState(readPrivateText(statePath)),
  };
}

function writeState(repo, statePath, fields) {
  statePath = validateStatePath(repo, statePath);
  assertSafeFile(registryRecordPath(repo));
  fields['Updated at'] = now();
  fields['Repository/path'] = repo;
  writePrivateText(statePath, renderState(fields));
  registerState(repo, statePath, fields);
}

function pathIsWithin(scope, candidate) {
  const relative = path.relative(scope, candidate);
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function registeredUnfinishedStates(scope) {
  const candidates = [];

  for (const [repository, record] of Object.entries(readAllRegistryRecords())) {
    if (!path.isAbsolute(repository) || repository !== path.resolve(repository)) throw new Error(`任务状态索引项目路径必须是明确的绝对路径：${repository}`);
    const candidateRepo = path.resolve(repository);
    if (candidateRepo === scope || !pathIsWithin(scope, candidateRepo)) {
      continue;
    }
    if (fs.existsSync(candidateRepo) && fs.realpathSync(candidateRepo) !== candidateRepo) throw new Error(`任务状态索引项目路径不可为链接：${candidateRepo}`);
    if (!record || typeof record.statePath !== 'string') {
      continue;
    }
    const statePath = validateStatePath(candidateRepo, record.statePath);
    if (!assertSafeFile(statePath)) continue;
    const fields = parseState(readPrivateText(statePath));
    const status = (fields['Task status'] || record.status || '').toLowerCase();
    if (status !== 'active' && status !== 'blocked') {
      continue;
    }

    candidates.push({
      repository: candidateRepo,
      repositoryExists: fs.existsSync(candidateRepo),
      statePath,
      fields,
      updatedAt: fields['Updated at'] || record.updatedAt || '',
    });
  }

  return candidates.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function gitSummary(repo) {
  if (!isGitRepository(repo)) {
    return {
      branch: '(non-git)',
      head: '(non-git)',
      changes: '非 Git 项目；使用备份和明确文件证据',
    };
  }

  const branch = runGit(repo, ['branch', '--show-current'], true).stdout.trim() || '(detached)';
  const head = runGit(repo, ['rev-parse', 'HEAD']).stdout.trim();
  const changed = runGit(repo, ['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=dirty']).stdout.trim();
  const nestedChanges = submodulePaths(repo).some(relativePath => {
    const nested = path.join(repo, relativePath);
    return isNestedGitRepository(nested) && gitSummary(nested).changes !== '没有改动；工作区干净';
  });
  return {
    branch,
    head,
    changes: changed || nestedChanges ? '存在改动；编辑前检查具体状态' : '没有改动；工作区干净',
  };
}

function submodulePaths(repo) {
  return runGit(repo, ['ls-files', '--stage', '-z']).stdout.split('\0')
    .filter(entry => entry.startsWith('160000 ')).map(entry => entry.slice(entry.indexOf('\t') + 1));
}

function isNestedGitRepository(directory) {
  const stat = fs.lstatSync(directory, { throwIfNoEntry: false });
  if (!stat?.isDirectory() || stat.isSymbolicLink() || !isGitRepository(directory)) return false;
  return fs.realpathSync(runGit(directory, ['rev-parse', '--show-toplevel']).stdout.trim()) === fs.realpathSync(directory);
}

function hashFileContent(file) {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  const descriptor = fs.openSync(file, 'r');

  try {
    let bytesRead;
    do {
      bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead > 0) {
        hash.update(buffer.subarray(0, bytesRead));
      }
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(descriptor);
  }

  return hash.digest('hex');
}

function workingTreeDescriptor(repo, relativePath) {
  const fullPath = path.join(repo, relativePath);
  let stat;
  try {
    stat = fs.lstatSync(fullPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return `${relativePath}:missing`;
    }
    throw new Error(`无法计算未跟踪路径的指纹：${relativePath}: ${error.message}`);
  }

  const mode = (stat.mode & 0o7777).toString(8);
  if (stat.isSymbolicLink()) {
    return `${relativePath}:symlink:${mode}:${fs.readlinkSync(fullPath)}`;
  }
  if (stat.isFile()) {
    return `${relativePath}:file:${mode}:${stat.size}:${hashFileContent(fullPath)}`;
  }
  if (stat.isDirectory() && isNestedGitRepository(fullPath)) {
    return `${relativePath}:submodule:${fingerprint(fullPath)}`;
  }
  return `${relativePath}:other:${mode}:${stat.size}`;
}

function fingerprint(repo) {
  if (!isGitRepository(repo)) {
    return 'non-git:manual-evidence-required';
  }

  const head = runGit(repo, ['rev-parse', 'HEAD']).stdout.trim();
  const changedPaths = runGit(repo, [
    'diff',
    '--no-ext-diff',
    '--no-textconv',
    '--name-only',
    '--no-renames',
    '--ignore-submodules=all',
    '-z',
    'HEAD',
    '--',
  ]).stdout.split('\0').filter(Boolean);
  const untrackedPaths = runGit(repo, [
    'ls-files',
    '-o',
    '--exclude-standard',
    '-z',
  ]).stdout.split('\0').filter(Boolean);
  // 禁止 Git 内部递归到未单独清理配置的子模块；下面以同一安全入口递归计算。
  const status = runGit(repo, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=all']).stdout;
  const statusEntries = status.split('\0').filter(Boolean);
  const conflictCodes = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU']);
  const conflictStatus = statusEntries
    .filter((entry) => conflictCodes.has(entry.slice(0, 2)))
    .join('\0');
  const descriptors = [...new Set([...changedPaths, ...untrackedPaths, ...submodulePaths(repo)])]
    .sort()
    .map((relativePath) => workingTreeDescriptor(repo, relativePath));

  const digest = crypto
    .createHash('sha256')
    .update(head)
    .update('\0')
    .update(descriptors.join('\n'))
    .update('\0')
    .update(conflictStatus)
    .digest('hex');

  return `git:${head.slice(0, 12)}:${digest.slice(0, 20)}`;
}

function taskId() {
  return `task-${now().replace(/\D/g, '').slice(0, 17)}`;
}

function safeName(value) {
  const original = String(value || 'task');
  const readable = original
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'task';
  const suffix = crypto.createHash('sha256').update(original).digest('hex').slice(0, 8);
  return `${readable}-${suffix}`;
}

function archiveCompletedState(statePath, fields, repo) {
  const status = (fields['Task status'] || '').toLowerCase();
  if (status !== 'complete') {
    return;
  }
  statePath = validateStatePath(repo, statePath);
  const historyDir = path.join(path.dirname(statePath), 'task-history');
  const suffix = now().replace(/\D/g, '').slice(0, 17);
  const destination = path.join(historyDir, `${safeName(fields['Task ID'])}-${suffix}-${crypto.randomBytes(4).toString('hex')}.md`);
  writePrivateText(destination, readPrivateText(statePath));
}

function appendEvidence(fields, entry) {
  const current = fields['Validation evidence'];
  const values = !current || current === 'none' ? [] : current.split(' | ');
  values.push(entry);
  fields['Validation evidence'] = values.slice(-12).join(' | ');
}

function refreshStaleVerification(fields, currentFingerprint) {
  const verified = fields['Verified fingerprint'];
  if (!verified || verified === 'none' || verified === currentFingerprint) {
    return false;
  }

  fields['Task status'] = 'active';
  fields['Verification status'] = 'pending';
  fields['Verified fingerprint'] = 'none';
  fields['Current fingerprint'] = currentFingerprint;
  fields['Next step'] = '完成前重新验证当前差异。';
  fields['Unverified risk'] = '记录验证通过后，仓库内容又发生变化。';
  return true;
}

function redactCommand(args) {
  let redactNext = false;
  return args.map((arg) => {
    if (redactNext) {
      redactNext = false;
      return '[REDACTED]';
    }
    if (/^--?(?:token|password|secret|api[-_]?key|authorization|cookie)$/i.test(arg)) {
      redactNext = true;
      return arg;
    }
    if (/(?:token|password|secret|api[-_]?key|authorization|cookie)=/i.test(arg)) {
      return `${arg.split('=')[0]}=[REDACTED]`;
    }
    if (/^(?:authorization|cookie)\s*:/i.test(arg)) {
      return `${arg.split(':')[0]}: [REDACTED]`;
    }
    if (/^[a-z][a-z0-9+.-]*:\/\/[^/\s@]+@/i.test(arg)) {
      return arg.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/\s@]+@/i, '$1[REDACTED]@');
    }
    return /\s/.test(arg) ? JSON.stringify(arg) : arg;
  }).join(' ');
}

function requireState(repo) {
  const state = readState(repo);
  if (!state.fields) {
    throw new Error(`没有找到 ${repo} 的任务状态，请先运行 init。`);
  }
  return state;
}

module.exports = {
  FIELD_ORDER,
  OPTION_TO_FIELD,
  appendEvidence,
  archiveCompletedState,
  canonicalProject,
  fingerprint,
  gitSummary,
  hashFileContent,
  now,
  parseState,
  pathIsWithin,
  readState,
  redactCommand,
  refreshStaleVerification,
  registeredUnfinishedStates,
  renderState,
  requireState,
  taskId,
  writeState,
};
