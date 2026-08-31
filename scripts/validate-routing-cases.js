#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const casesPath = path.join(root, 'tests', 'routing-cases.json');
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

function fail(message) {
  throw new Error(message);
}

function includes(caseItem, field, value) {
  return Array.isArray(caseItem[field]) && caseItem[field].includes(value);
}

if (!Array.isArray(cases) || cases.length < 10) {
  fail('routing-cases.json must contain at least 10 realistic scenarios');
}

const ids = new Set();
for (const item of cases) {
  for (const field of [
    'id',
    'prompt',
    'skill',
    'mode',
    'lane',
    'requiredReferences',
    'authorizedEffects',
    'forbiddenEffects',
  ]) {
    if (item[field] === undefined) {
      fail(`${item.id || '<unknown>'} is missing ${field}`);
    }
  }
  if (ids.has(item.id)) {
    fail(`Duplicate routing case id: ${item.id}`);
  }
  ids.add(item.id);

  if (!Array.isArray(item.requiredReferences) || !Array.isArray(item.authorizedEffects) || !Array.isArray(item.forbiddenEffects)) {
    fail(`${item.id} must use arrays for references and effects`);
  }
  const overlap = item.authorizedEffects.filter((effect) => item.forbiddenEffects.includes(effect));
  if (overlap.length > 0) {
    fail(`${item.id} authorizes and forbids the same effects: ${overlap.join(', ')}`);
  }
  if (item.mode === 'read-only' && item.authorizedEffects.some((effect) => /write|edit|push|merge|deploy/.test(effect))) {
    fail(`${item.id} grants a write effect in read-only mode`);
  }
  if (item.skill && ['implementation', 'high-risk'].includes(item.mode) && item.lane !== 'context' && !includes(item, 'requiredReferences', 'task-lanes.md')) {
    fail(`${item.id} must load task-lanes.md for implementation/high-risk routing`);
  }
}

const requiredIds = [
  'generic-explanation',
  'read-only-review',
  'single-file-quick-fix',
  'quick-doc-remote-save',
  'quick-ui-polish',
  'multi-file-standard-fix',
  'frontend-admin',
  'wrapped-workspace-ui',
  'remote-save-only',
  'formal-merge',
  'production-database',
  'database-compatible-evolution',
  'recover-active-task',
  'stale-verification',
  'recoverable-delete',
];
for (const id of requiredIds) {
  if (!ids.has(id)) {
    fail(`Missing required routing scenario: ${id}`);
  }
}

const byId = Object.fromEntries(cases.map((item) => [item.id, item]));
if (byId['generic-explanation'].skill !== false) {
  fail('Generic programming explanation must not require production-engineering');
}
if (!includes(byId['read-only-review'], 'forbiddenEffects', 'file-write')) {
  fail('Read-only review must forbid file writes');
}
if (!includes(byId['quick-doc-remote-save'], 'forbiddenEffects', 'full-spec-load')) {
  fail('Quick docs work must not load the full specification by default');
}
if (!includes(byId['quick-ui-polish'], 'forbiddenEffects', 'task-state-diary')) {
  fail('Quick UI polish must not keep a task-state diary');
}
if (!includes(byId['wrapped-workspace-ui'], 'requiredReferences', 'wrapped-workspace-ui.md')) {
  fail('Wrapped workspace UI must load wrapped-workspace-ui.md');
}
if (byId['wrapped-workspace-ui'].mode !== 'implementation' || byId['wrapped-workspace-ui'].lane !== 'standard') {
  fail('Wrapped workspace UI must remain a standard implementation scenario');
}
if (!includes(byId['remote-save-only'], 'forbiddenEffects', 'formal-merge')) {
  fail('Remote save must not imply formal merge');
}
if (!includes(byId['formal-merge'], 'forbiddenEffects', 'direct-main-push')) {
  fail('Formal merge must not become a direct main push');
}
for (const effect of ['database-write', 'direct-field-rename', 'drop-field', 'bulk-overwrite', 'one-shot-cutover']) {
  if (!includes(byId['database-compatible-evolution'], 'forbiddenEffects', effect)) {
    fail(`Compatible database evolution must forbid ${effect}`);
  }
}
if (!includes(byId['database-compatible-evolution'], 'authorizedEffects', 'additive-migration-code')) {
  fail('Compatible database evolution must allow additive local migration code');
}
if (!includes(byId['recover-active-task'], 'requiredReferences', 'context-memory-continuity.md')) {
  fail('New-conversation recovery must load context-memory-continuity.md');
}
if (!includes(byId['recover-active-task'], 'forbiddenEffects', 'blind-resume')) {
  fail('New-conversation recovery must forbid blind resume');
}
if (!includes(byId['stale-verification'], 'forbiddenEffects', 'mark-complete')) {
  fail('Stale verification must prevent task completion');
}
if (!includes(byId['recoverable-delete'], 'forbiddenEffects', 'permanent-delete')) {
  fail('Deletion scenario must forbid permanent deletion');
}

console.log(`routing scenario validation passed (${cases.length} cases)`);
