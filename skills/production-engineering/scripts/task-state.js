#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
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
} = require('./task-state-core');

function usage() {
  process.stdout.write(`用法：
  task-state.js resume --repo <路径> [--json]
  task-state.js init --repo <路径> --goal <文字> --lane <文字> [选项]
  task-state.js update --repo <路径> [字段选项]
  task-state.js implementation-complete --repo <路径> [--next-step <文字>]
  task-state.js run --repo <路径> -- <程序> <参数...>
  task-state.js check --repo <路径> [--require-complete] [--json]
  task-state.js finalize --repo <路径> [--unverified-risk <文字>]
  task-state.js fingerprint --repo <路径>
  task-state.js self-test
`);
}

function parseCli(argv) {
  const command = argv[0] || 'help';
  const options = {};
  let passthrough = [];

  for (let index = 1; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--') {
      passthrough = argv.slice(index + 1);
      break;
    }
    if (!value.startsWith('--')) {
      throw new Error(`未预期的参数：${value}`);
    }

    const key = value.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }

  return { command, options, passthrough };
}

function output(value) {
  process.stdout.write(`${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}\n`);
}

function resumeResult(repository, statePath, fields, discoveredFromScope = '') {
  const repositoryExists = fs.existsSync(repository);
  const current = repositoryExists ? fingerprint(repository) : 'unavailable:repository-missing';
  const status = (fields['Task status'] || '').toLowerCase();
  return {
    found: true,
    active: status === 'active' || status === 'blocked',
    ambiguous: false,
    repository,
    repositoryExists,
    statePath,
    discoveredFromScope: discoveredFromScope || undefined,
    taskId: fields['Task ID'] || '',
    taskStatus: status,
    implementationStatus: fields['Implementation status'] || '',
    verificationStatus: fields['Verification status'] || '',
    currentFingerprint: current,
    recordedCurrentFingerprint: fields['Current fingerprint'] || '',
    verifiedFingerprint: fields['Verified fingerprint'] || '',
    stale: Boolean(
      current.startsWith('unavailable:') ||
      (fields['Current fingerprint'] && fields['Current fingerprint'] !== current) ||
      (fields['Verified fingerprint'] &&
        fields['Verified fingerprint'] !== 'none' &&
        fields['Verified fingerprint'] !== current)
    ),
  };
}

function commandResume(repo, options) {
  const exact = readState(repo);
  const exactStatus = (exact.fields?.['Task status'] || '').toLowerCase();
  if (exact.fields && (exactStatus === 'active' || exactStatus === 'blocked')) {
    const result = resumeResult(repo, exact.statePath, exact.fields);
    output(result);
    if (!options.json) {
      process.stdout.write(fs.readFileSync(exact.statePath, 'utf8'));
    }
    return;
  }

  const candidates = registeredUnfinishedStates(repo);
  if (candidates.length === 1) {
    const candidate = candidates[0];
    const result = resumeResult(
      candidate.repository,
      candidate.statePath,
      candidate.fields,
      repo,
    );
    output(result);
    if (!options.json) {
      process.stdout.write(fs.readFileSync(candidate.statePath, 'utf8'));
    }
    return;
  }

  if (candidates.length > 1) {
    output({
      found: true,
      active: true,
      ambiguous: true,
      repository: repo,
      candidates: candidates.map((candidate) => ({
        repository: candidate.repository,
        repositoryExists: candidate.repositoryExists,
        statePath: candidate.statePath,
        taskId: candidate.fields['Task ID'] || '',
        taskStatus: candidate.fields['Task status'] || '',
        latestUserGoal: candidate.fields['Latest user goal'] || '',
        branchAndStablePoint: candidate.fields['Branch and stable point'] || '',
        updatedAt: candidate.updatedAt,
      })),
    });
    return;
  }

  if (exact.fields) {
    const result = resumeResult(repo, exact.statePath, exact.fields);
    output(result);
    if (!options.json) {
      process.stdout.write(fs.readFileSync(exact.statePath, 'utf8'));
    }
    return;
  }

  output({ found: false, active: false, ambiguous: false, repository: repo, statePath: exact.statePath });
}

function commandInit(repo, options) {
  if (!options.goal || options.goal === true) {
    throw new Error('init 需要 --goal <文字>');
  }
  if (!options.lane || options.lane === true) {
    throw new Error('init 需要 --lane <文字>');
  }

  const existing = readState(repo, true);
  if (existing.fields) {
    const status = (existing.fields['Task status'] || '').toLowerCase();
    if (status === 'active' || status === 'blocked') {
      throw new Error(`${existing.statePath} 已有未完成任务，请先恢复并确认，不得覆盖。`);
    }
    archiveCompletedState(existing.statePath, existing.fields);
  }

  const summary = gitSummary(repo);
  const current = fingerprint(repo);
  const fields = {
    'Task ID': options['task-id'] && options['task-id'] !== true ? options['task-id'] : taskId(),
    'Latest user goal': options.goal,
    'Acceptance criteria': options.acceptance && options.acceptance !== true ? options.acceptance : '明确并验证请求结果，不扩大范围。',
    'Task status': 'active',
    'Implementation status': options.mode === 'read-only' ? 'not started' : 'in progress',
    'Verification status': 'pending',
    'Current mode': options.mode && options.mode !== true ? options.mode : 'implementation',
    'Current lane and reason': options.lane,
    'Branch and stable point': `${summary.branch} @ ${summary.head}`,
    'Current fingerprint': current,
    'Verified fingerprint': 'none',
    'Existing user changes': summary.changes,
    'Authorization': options.authorization && options.authorization !== true ? options.authorization : '当前仅授权本地范围工作；远端及高风险写入按原文和最新授权判断。',
    'Do-not-touch': options['do-not-touch'] && options['do-not-touch'] !== true ? options['do-not-touch'] : '无关用户改动、密钥、生产数据和范围外文件。',
    'Source references': options['source-references'] && options['source-references'] !== true ? options['source-references'] : '当前项目规则、真实文件与适用原文条款。',
    Decisions: options.decisions && options.decisions !== true ? options.decisions : '暂无',
    'Changed/planned files': options['changed-files'] && options['changed-files'] !== true ? options['changed-files'] : '暂无',
    'Validation evidence': 'none',
    'Current blockers': 'none',
    'Next step': options['next-step'] && options['next-step'] !== true ? options['next-step'] : '检查真实项目，确定最小安全改动。',
    'PR/CI/remote state': '尚未执行远端操作。',
    Rollback: options.rollback && options.rollback !== true ? options.rollback : '使用已确认的 Git 稳定点或非 Git 备份。',
    'Unverified risk': '实现和验证尚未完成。',
  };

  writeState(repo, existing.statePath, fields);
  output({ created: true, repository: repo, statePath: existing.statePath, taskId: fields['Task ID'] });
}

function validateUpdateTransitions(options) {
  const allowed = {
    'task-status': ['active', 'blocked'],
    'implementation-status': ['not started', 'in progress'],
    'verification-status': ['pending', 'failed', 'unavailable'],
  };

  for (const [option, values] of Object.entries(allowed)) {
    const value = options[option];
    if (value !== undefined && value !== true && !values.includes(value)) {
      throw new Error(`${option} 必须是以下值之一：${values.join(', ')}. 完成或通过状态必须使用专门的转换命令。`);
    }
  }
}

function commandUpdate(repo, options) {
  validateUpdateTransitions(options);
  const state = requireState(repo);
  const current = fingerprint(repo);
  refreshStaleVerification(state.fields, current);
  state.fields['Verified fingerprint'] ||= 'none';
  state.fields['Validation evidence'] ||= 'none';

  for (const [option, field] of Object.entries(OPTION_TO_FIELD)) {
    if (options[option] !== undefined && options[option] !== true) {
      state.fields[field] = options[option];
    }
  }

  if (options['implementation-status'] !== undefined || options['verification-status'] !== undefined) {
    state.fields['Verified fingerprint'] = 'none';
    if (options['verification-status'] === undefined) {
      state.fields['Verification status'] = 'pending';
    }
    if (state.fields['Task status'] !== 'blocked') {
      state.fields['Task status'] = 'active';
    }
  }

  state.fields['Current fingerprint'] = current;
  writeState(repo, state.statePath, state.fields);
  output({ updated: true, statePath: state.statePath, currentFingerprint: current });
}

function commandImplementationComplete(repo, options) {
  const state = requireState(repo);
  const current = fingerprint(repo);
  refreshStaleVerification(state.fields, current);
  state.fields['Task status'] = 'active';
  state.fields['Implementation status'] = 'complete';
  state.fields['Verification status'] = 'pending';
  state.fields['Current fingerprint'] = current;
  state.fields['Verified fingerprint'] = 'none';
  state.fields['Next step'] = options['next-step'] && options['next-step'] !== true
    ? options['next-step']
    : '执行当前差异的全部适用验证。';
  state.fields['Unverified risk'] = '实现已结束，但当前差异尚未完成验证。';
  writeState(repo, state.statePath, state.fields);
  output({ updated: true, implementationStatus: 'complete', verificationStatus: 'pending', currentFingerprint: current });
}

function commandRun(repo, passthrough) {
  if (passthrough.length === 0) {
    throw new Error('run 需要在 -- 后指定程序');
  }

  const state = requireState(repo);
  const before = fingerprint(repo);
  refreshStaleVerification(state.fields, before);
  const display = redactCommand(passthrough);
  const result = spawnSync(passthrough[0], passthrough.slice(1), {
    cwd: repo,
    stdio: 'inherit',
    shell: false,
  });
  const exitCode = Number.isInteger(result.status) ? result.status : 1;
  const after = fingerprint(repo);
  const changedDuringValidation = before !== after;
  const passed = exitCode === 0 && !changedDuringValidation;
  const outcome = passed ? '通过' : changedDuringValidation ? '验证过程中仓库发生变化' : '失败';

  appendEvidence(state.fields, `[${now()}] ${display} => ${outcome} （退出码 ${exitCode}） @ ${after}`);
  state.fields['Current fingerprint'] = after;
  state.fields['Task status'] = 'active';

  if (passed) {
    state.fields['Verification status'] = 'passed';
    state.fields['Verified fingerprint'] = after;
    state.fields['Current blockers'] = 'none';
    state.fields['Next step'] = '完成剩余适用检查后，再运行 check 和 finalize。';
    state.fields['Unverified risk'] = '可能仍有其他适用检查；一次命令通过不代表任务完成。';
  } else {
    state.fields['Verification status'] = changedDuringValidation ? 'pending' : 'failed';
    state.fields['Verified fingerprint'] = 'none';
    state.fields['Current blockers'] = changedDuringValidation
      ? '验证改变了仓库；先检查新差异再重新验证。'
      : `验证命令失败，退出码 ${exitCode}。`;
    state.fields['Next step'] = changedDuringValidation
      ? '检查发生变化的差异，再重新验证。'
      : '修复失败后重新验证。';
    state.fields['Unverified risk'] = '当前差异尚未验证。';
  }

  writeState(repo, state.statePath, state.fields);
  process.exitCode = exitCode === 0 && changedDuringValidation ? 3 : exitCode;
}

function commandCheck(repo, options) {
  const state = requireState(repo);
  const current = fingerprint(repo);
  const stale = refreshStaleVerification(state.fields, current);
  const missing = [
    'Task ID',
    'Latest user goal',
    'Task status',
    'Implementation status',
    'Verification status',
    'Repository/path',
    'Do-not-touch',
    'Next step',
    'Rollback',
  ].filter((field) => !state.fields[field]);

  const implementationComplete = state.fields['Implementation status'] === 'complete';
  const verificationCurrent = (
    state.fields['Verification status'] === 'passed' &&
    state.fields['Verified fingerprint'] === current
  );
  const complete = state.fields['Task status'] === 'complete';
  const readyToFinalize = implementationComplete && verificationCurrent;
  const ok = (
    missing.length === 0 &&
    !stale &&
    readyToFinalize &&
    (!options['require-complete'] || complete)
  );

  if (stale) {
    writeState(repo, state.statePath, state.fields);
  }

  output({
    ok,
    readyToFinalize,
    complete,
    statePath: state.statePath,
    missing,
    staleVerification: stale,
    taskStatus: state.fields['Task status'] || '',
    implementationStatus: state.fields['Implementation status'] || '',
    verificationStatus: state.fields['Verification status'] || '',
    currentFingerprint: current,
    verifiedFingerprint: state.fields['Verified fingerprint'] || '',
  });

  if (missing.length > 0) {
    process.exitCode = 2;
  } else if (stale) {
    process.exitCode = 3;
  } else if (!readyToFinalize) {
    process.exitCode = 4;
  } else if (options['require-complete'] && !complete) {
    process.exitCode = 5;
  }
}

function commandFinalize(repo, options) {
  const state = requireState(repo);
  const current = fingerprint(repo);
  const stale = refreshStaleVerification(state.fields, current);
  if (stale) {
    writeState(repo, state.statePath, state.fields);
    throw new Error('验证后仓库内容变化，完成前必须重新验证。');
  }
  if (current.startsWith('non-git:')) {
    throw new Error('自动完成需要 Git 指纹；非 Git 项目请使用明确备份和哈希证据。');
  }
  if (state.fields['Implementation status'] !== 'complete') {
    throw new Error('实现完成后才能结束任务。');
  }
  if (state.fields['Verification status'] !== 'passed') {
    throw new Error('验证通过后才能结束任务。');
  }
  if (state.fields['Verified fingerprint'] !== current) {
    throw new Error('已验证指纹与当前差异不一致。');
  }

  state.fields['Task status'] = 'complete';
  state.fields['Current fingerprint'] = current;
  state.fields['Next step'] = '任务完成；保留证据并清楚报告交付状态。';
  state.fields['Current blockers'] = 'none';
  state.fields['Unverified risk'] = options['unverified-risk'] && options['unverified-risk'] !== true
    ? options['unverified-risk']
    : '未声明';
  writeState(repo, state.statePath, state.fields);
  output({ finalized: true, statePath: state.statePath, fingerprint: current });
}

function commandSelfTest() {
  const sample = {};
  for (const field of FIELD_ORDER) {
    sample[field] = field === 'Task status' ? 'active' : `${field} value`;
  }
  sample['Latest user goal'] = 'first line\nsecond line';
  const parsed = parseState(renderState(sample));
  if (
    parsed['Task status'] !== 'active' ||
    parsed['Task ID'] !== 'Task ID value' ||
    parsed['Latest user goal'] !== 'first line / second line'
  ) {
    throw new Error('任务状态读写自检失败。');
  }

  const redacted = redactCommand([
    'tool',
    '--token',
    'secret-value',
    '--password=hunter2',
    'https://user:password@example.invalid/path',
  ]);
  if (redacted.includes('secret-value') || redacted.includes('hunter2') || redacted.includes('user:password')) {
    throw new Error('命令脱敏自检失败。');
  }
  const scope = path.join(path.parse(process.cwd()).root, 'task-state-scope');
  if (
    !pathIsWithin(scope, path.join(scope, 'project')) ||
    pathIsWithin(scope, path.join(`${scope}-other`, 'project'))
  ) {
    throw new Error('限定范围索引查找自检失败。');
  }
  const streamedHash = hashFileContent(__filename);
  const directHash = crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex');
  if (streamedHash !== directHash) {
    throw new Error('流式文件指纹自检失败。');
  }

  let transitionBlocked = 0;
  for (const options of [
    { 'task-status': 'complete' },
    { 'implementation-status': 'complete' },
    { 'verification-status': 'passed' },
  ]) {
    try {
      validateUpdateTransitions(options);
    } catch {
      transitionBlocked += 1;
    }
  }
  if (transitionBlocked !== 3) {
    throw new Error('专用状态转换自检失败。');
  }

  output({
    ok: true,
    fields: FIELD_ORDER.length,
    redaction: true,
    scopedDiscovery: true,
    contentHash: true,
    guardedTransitions: true,
  });
}

function main() {
  const { command, options, passthrough } = parseCli(process.argv.slice(2));
  if (command === 'help' || command === '--help' || command === '-h') {
    usage();
    return;
  }
  if (command === 'self-test') {
    commandSelfTest();
    return;
  }

  const repo = canonicalProject(options.repo === true ? process.cwd() : options.repo || process.cwd());
  switch (command) {
    case 'resume':
    case 'status':
      commandResume(repo, options);
      break;
    case 'init':
      commandInit(repo, options);
      break;
    case 'update':
      commandUpdate(repo, options);
      break;
    case 'implementation-complete':
      commandImplementationComplete(repo, options);
      break;
    case 'run':
      commandRun(repo, passthrough);
      break;
    case 'check':
      commandCheck(repo, options);
      break;
    case 'finalize':
      commandFinalize(repo, options);
      break;
    case 'fingerprint':
      output({ repository: repo, fingerprint: fingerprint(repo) });
      break;
    default:
      throw new Error(`未知命令：${command}`);
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
