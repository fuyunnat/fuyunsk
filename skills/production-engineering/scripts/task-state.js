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
  process.stdout.write(`Usage:
  task-state.js resume --repo <path> [--json]
  task-state.js init --repo <path> --goal <text> --lane <text> [options]
  task-state.js update --repo <path> [field options]
  task-state.js implementation-complete --repo <path> [--next-step <text>]
  task-state.js run --repo <path> -- <program> <args...>
  task-state.js check --repo <path> [--require-complete] [--json]
  task-state.js finalize --repo <path> [--unverified-risk <text>]
  task-state.js fingerprint --repo <path>
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
      throw new Error(`Unexpected argument: ${value}`);
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
    throw new Error('init requires --goal <text>');
  }
  if (!options.lane || options.lane === true) {
    throw new Error('init requires --lane <text>');
  }

  const existing = readState(repo, true);
  if (existing.fields) {
    const status = (existing.fields['Task status'] || '').toLowerCase();
    if (status === 'active' || status === 'blocked') {
      throw new Error(`An unfinished task already exists at ${existing.statePath}. Resume it before starting another task in this working tree.`);
    }
    archiveCompletedState(existing.statePath, existing.fields);
  }

  const summary = gitSummary(repo);
  const current = fingerprint(repo);
  const fields = {
    'Task ID': options['task-id'] && options['task-id'] !== true ? options['task-id'] : taskId(),
    'Latest user goal': options.goal,
    'Acceptance criteria': options.acceptance && options.acceptance !== true ? options.acceptance : 'Define and verify the requested outcome without expanding scope.',
    'Task status': 'active',
    'Implementation status': options.mode === 'read-only' ? 'not started' : 'in progress',
    'Verification status': 'pending',
    'Current mode': options.mode && options.mode !== true ? options.mode : 'implementation',
    'Current lane and reason': options.lane,
    'Branch and stable point': `${summary.branch} @ ${summary.head}`,
    'Current fingerprint': current,
    'Verified fingerprint': 'none',
    'Existing user changes': summary.changes,
    'Authorization': options.authorization && options.authorization !== true ? options.authorization : 'Local scoped work only; remote and high-risk writes require separate authorization.',
    'Do-not-touch': options['do-not-touch'] && options['do-not-touch'] !== true ? options['do-not-touch'] : 'Unrelated user changes, secrets, production data, and out-of-scope files.',
    'Source references': options['source-references'] && options['source-references'] !== true ? options['source-references'] : 'Current project rules, real files, and selected skill references.',
    Decisions: options.decisions && options.decisions !== true ? options.decisions : 'none yet',
    'Changed/planned files': options['changed-files'] && options['changed-files'] !== true ? options['changed-files'] : 'none yet',
    'Validation evidence': 'none',
    'Current blockers': 'none',
    'Next step': options['next-step'] && options['next-step'] !== true ? options['next-step'] : 'Inspect the real project and define the smallest safe change.',
    'PR/CI/remote state': 'No remote action performed.',
    Rollback: options.rollback && options.rollback !== true ? options.rollback : 'Use the confirmed Git stable point or non-Git backup.',
    'Unverified risk': 'Implementation and validation are not complete.',
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
      throw new Error(`${option} must be one of: ${values.join(', ')}. Use the dedicated transition command for complete or passed states.`);
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
    : 'Run all required validation for the current diff.';
  state.fields['Unverified risk'] = 'Implementation is complete but the current diff is not fully verified.';
  writeState(repo, state.statePath, state.fields);
  output({ updated: true, implementationStatus: 'complete', verificationStatus: 'pending', currentFingerprint: current });
}

function commandRun(repo, passthrough) {
  if (passthrough.length === 0) {
    throw new Error('run requires a program after --');
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
  const outcome = passed ? 'passed' : changedDuringValidation ? 'changed repository during validation' : 'failed';

  appendEvidence(state.fields, `[${now()}] ${display} => ${outcome} (exit ${exitCode}) @ ${after}`);
  state.fields['Current fingerprint'] = after;
  state.fields['Task status'] = 'active';

  if (passed) {
    state.fields['Verification status'] = 'passed';
    state.fields['Verified fingerprint'] = after;
    state.fields['Current blockers'] = 'none';
    state.fields['Next step'] = 'Run any remaining required checks, then check and finalize.';
    state.fields['Unverified risk'] = 'Other required checks may still remain; a passing command does not complete the task by itself.';
  } else {
    state.fields['Verification status'] = changedDuringValidation ? 'pending' : 'failed';
    state.fields['Verified fingerprint'] = 'none';
    state.fields['Current blockers'] = changedDuringValidation
      ? 'Validation changed the repository; inspect the new diff before re-running checks.'
      : `Validation command failed with exit code ${exitCode}.`;
    state.fields['Next step'] = changedDuringValidation
      ? 'Review the changed diff and run validation again.'
      : 'Fix the failure and re-run validation.';
    state.fields['Unverified risk'] = 'The current diff is not verified.';
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
    throw new Error('Repository content changed after verification. Re-run validation before finalizing.');
  }
  if (current.startsWith('non-git:')) {
    throw new Error('Automatic finalization requires a Git fingerprint. Use explicit backup/hash evidence for a non-Git project.');
  }
  if (state.fields['Implementation status'] !== 'complete') {
    throw new Error('Implementation status must be complete before finalization.');
  }
  if (state.fields['Verification status'] !== 'passed') {
    throw new Error('Verification status must be passed before finalization.');
  }
  if (state.fields['Verified fingerprint'] !== current) {
    throw new Error('Verified fingerprint does not match the current repository diff.');
  }

  state.fields['Task status'] = 'complete';
  state.fields['Current fingerprint'] = current;
  state.fields['Next step'] = 'Task complete; preserve evidence and report delivery state plainly.';
  state.fields['Current blockers'] = 'none';
  state.fields['Unverified risk'] = options['unverified-risk'] && options['unverified-risk'] !== true
    ? options['unverified-risk']
    : 'none stated';
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
    throw new Error('Task-state parse/render self-test failed.');
  }

  const redacted = redactCommand([
    'tool',
    '--token',
    'secret-value',
    '--password=hunter2',
    'https://user:password@example.invalid/path',
  ]);
  if (redacted.includes('secret-value') || redacted.includes('hunter2') || redacted.includes('user:password')) {
    throw new Error('Command redaction self-test failed.');
  }
  const scope = path.join(path.parse(process.cwd()).root, 'task-state-scope');
  if (
    !pathIsWithin(scope, path.join(scope, 'project')) ||
    pathIsWithin(scope, path.join(`${scope}-other`, 'project'))
  ) {
    throw new Error('Scoped registry discovery self-test failed.');
  }
  const streamedHash = hashFileContent(__filename);
  const directHash = crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex');
  if (streamedHash !== directHash) {
    throw new Error('Streaming content fingerprint self-test failed.');
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
    throw new Error('Dedicated state-transition self-test failed.');
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
      throw new Error(`Unknown command: ${command}`);
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
