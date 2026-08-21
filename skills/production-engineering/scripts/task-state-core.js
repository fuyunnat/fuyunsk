'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

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

function codexHome() {
  return path.resolve(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'));
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function writePrivateText(file, content) {
  ensureDirectory(path.dirname(file));
  fs.writeFileSync(file, content, { encoding: 'utf8', mode: 0o600 });
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(file, 0o600);
    } catch (error) {
      if (!['ENOSYS', 'ENOTSUP', 'EOPNOTSUPP', 'EPERM'].includes(error.code)) {
        throw error;
      }
    }
  }
}

function runGit(repo, args, allowFailure = false) {
  const result = spawnSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.status !== 0 && !allowFailure) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`Git command failed: git ${args.join(' ')}${detail ? `\n${detail}` : ''}`);
  }
  return result;
}

function isGitRepository(candidate) {
  return runGit(candidate, ['rev-parse', '--is-inside-work-tree'], true).status === 0;
}

function canonicalProject(input) {
  const candidate = path.resolve(input || process.cwd());
  if (!fs.existsSync(candidate)) {
    throw new Error(`Project path does not exist: ${candidate}`);
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
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${file}\n${error.message}`);
  }
  return parsed;
}

function readLegacyRegistry() {
  const file = legacyRegistryPath();
  if (!fs.existsSync(file)) {
    return { version: 1, projects: {} };
  }

  const parsed = readJsonFile(file, 'Legacy task-state registry');
  if (!parsed || parsed.version !== 1 || !parsed.projects || Array.isArray(parsed.projects) || typeof parsed.projects !== 'object') {
    throw new Error(`Legacy task-state registry has an unsupported structure: ${file}`);
  }
  return parsed;
}

function readRegistryRecord(repo) {
  const file = registryRecordPath(repo);
  if (fs.existsSync(file)) {
    const record = readJsonFile(file, 'Task-state registry record');
    if (!record || record.version !== 1 || record.repository !== repo || typeof record.statePath !== 'string') {
      throw new Error(`Task-state registry record has an unsupported structure: ${file}`);
    }
    return record;
  }
  return readLegacyRegistry().projects[repo] || null;
}

function readAllRegistryRecords() {
  const records = { ...readLegacyRegistry().projects };
  const directory = registryDirectory();
  if (!fs.existsSync(directory)) {
    return records;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }
    const file = path.join(directory, entry.name);
    const record = readJsonFile(file, 'Task-state registry record');
    if (!record || record.version !== 1 || typeof record.repository !== 'string' || typeof record.statePath !== 'string') {
      throw new Error(`Task-state registry record has an unsupported structure: ${file}`);
    }
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

function externalStatePath(repo) {
  const key = crypto.createHash('sha256').update(repo).digest('hex').slice(0, 16);
  return path.join(codexHome(), 'task-states', key, 'task-state.md');
}

function locateState(repo, forInitialization = false) {
  const registered = readRegistryRecord(repo)?.statePath;
  if (registered && (fs.existsSync(registered) || forInitialization)) {
    return path.resolve(registered);
  }

  const local = path.join(repo, 'work', 'task-state.md');
  if (fs.existsSync(local)) {
    return local;
  }
  if (forInitialization && isIgnored(repo, 'work/task-state.md')) {
    return local;
  }
  return externalStatePath(repo);
}

function parseState(content) {
  const fields = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^- ([^:]+):\s*(.*)$/);
    if (match) {
      fields[match[1].trim()] = match[2].trim();
    }
  }
  return fields;
}

function singleLine(value) {
  return String(value || '').replace(/\s*\r?\n\s*/g, ' / ').trim();
}

function renderState(fields) {
  const lines = ['# Task State', ''];
  for (const field of FIELD_ORDER) {
    lines.push(`- ${field}: ${singleLine(fields[field])}`);
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
    fields: parseState(fs.readFileSync(statePath, 'utf8')),
  };
}

function writeState(repo, statePath, fields) {
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
    const candidateRepo = path.resolve(repository);
    if (candidateRepo === scope || !pathIsWithin(scope, candidateRepo)) {
      continue;
    }
    if (!record || typeof record.statePath !== 'string' || !fs.existsSync(record.statePath)) {
      continue;
    }

    const fields = parseState(fs.readFileSync(record.statePath, 'utf8'));
    const status = (fields['Task status'] || record.status || '').toLowerCase();
    if (status !== 'active' && status !== 'blocked') {
      continue;
    }

    candidates.push({
      repository: candidateRepo,
      repositoryExists: fs.existsSync(candidateRepo),
      statePath: path.resolve(record.statePath),
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
      changes: 'non-Git project; use backups and explicit file evidence',
    };
  }

  const branch = runGit(repo, ['branch', '--show-current'], true).stdout.trim() || '(detached)';
  const head = runGit(repo, ['rev-parse', 'HEAD']).stdout.trim();
  const changed = runGit(repo, ['status', '--porcelain=v1', '--untracked-files=all']).stdout.trim();
  return {
    branch,
    head,
    changes: changed ? 'present; inspect exact status before editing' : 'none; worktree clean',
  };
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
    throw new Error(`Unable to fingerprint untracked path ${relativePath}: ${error.message}`);
  }

  const mode = (stat.mode & 0o7777).toString(8);
  if (stat.isSymbolicLink()) {
    return `${relativePath}:symlink:${mode}:${fs.readlinkSync(fullPath)}`;
  }
  if (stat.isFile()) {
    return `${relativePath}:file:${mode}:${stat.size}:${hashFileContent(fullPath)}`;
  }
  if (stat.isDirectory() && isGitRepository(fullPath)) {
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
    '--name-only',
    '--no-renames',
    '--ignore-submodules=none',
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
  const status = runGit(repo, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).stdout;
  const statusEntries = status.split('\0').filter(Boolean);
  const conflictCodes = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU']);
  const conflictStatus = statusEntries
    .filter((entry) => conflictCodes.has(entry.slice(0, 2)))
    .join('\0');
  const descriptors = [...new Set([...changedPaths, ...untrackedPaths])]
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

function archiveCompletedState(statePath, fields) {
  const status = (fields['Task status'] || '').toLowerCase();
  if (status !== 'complete') {
    return;
  }

  const historyDir = path.join(path.dirname(statePath), 'task-history');
  ensureDirectory(historyDir);
  const suffix = now().replace(/\D/g, '').slice(0, 17);
  const destination = path.join(historyDir, `${safeName(fields['Task ID'])}-${suffix}.md`);
  fs.copyFileSync(statePath, destination, fs.constants.COPYFILE_EXCL);
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
  fields['Next step'] = 'Re-run required validation for the current diff before completion.';
  fields['Unverified risk'] = 'Repository content changed after the recorded passing verification.';
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
    throw new Error(`No task state found for ${repo}. Run init first.`);
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
