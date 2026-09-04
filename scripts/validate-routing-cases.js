#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const cases = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'routing-cases.json'), 'utf8'));

function fail(message) {
  throw new Error(message);
}

function includes(item, field, value) {
  return Array.isArray(item[field]) && item[field].includes(value);
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

  for (const field of ['requiredReferences', 'authorizedEffects', 'forbiddenEffects']) {
    if (!Array.isArray(item[field])) {
      fail(`${item.id}.${field} must be an array`);
    }
  }

  const overlap = item.authorizedEffects.filter((effect) => item.forbiddenEffects.includes(effect));
  if (overlap.length > 0) {
    fail(`${item.id} authorizes and forbids the same effects: ${overlap.join(', ')}`);
  }

  const explicit = item.prompt.includes('$production-engineering');
  if (item.skill !== explicit) {
    fail(`${item.id} must match the explicit-only invocation policy`);
  }

  if (item.skill && !includes(item, 'requiredReferences', 'routing.md')) {
    fail(`${item.id} must load routing.md`);
  }

  if (
    item.skill &&
    ['implementation', 'high-risk'].includes(item.mode) &&
    item.lane !== 'context' &&
    !includes(item, 'requiredReferences', 'task-lanes.md')
  ) {
    fail(`${item.id} must load task-lanes.md`);
  }

  if (item.mode === 'read-only' && item.authorizedEffects.some((effect) => /write|edit|push|merge|deploy/.test(effect))) {
    fail(`${item.id} grants a write effect in read-only mode`);
  }
}

const requiredIds = [
  'greeting-no-skill',
  'generic-explanation-no-skill',
  'ordinary-engineering-no-explicit',
  'explicit-read-only-review',
  'explicit-quick-fix',
  'explicit-ui-standard',
  'explicit-remote-save',
  'explicit-review-request',
  'explicit-formal-main',
  'explicit-production-database',
  'explicit-context-resume',
  'explicit-recoverable-delete',
];

for (const id of requiredIds) {
  if (!ids.has(id)) {
    fail(`Missing required routing scenario: ${id}`);
  }
}

const byId = Object.fromEntries(cases.map((item) => [item.id, item]));

for (const id of ['greeting-no-skill', 'generic-explanation-no-skill', 'ordinary-engineering-no-explicit']) {
  if (byId[id].skill !== false) {
    fail(`${id} must not auto-load production-engineering`);
  }
}

if (!includes(byId['explicit-quick-fix'], 'forbiddenEffects', 'task-state-init')) {
  fail('A self-contained quick fix must not initialize task state');
}

if (!includes(byId['explicit-remote-save'], 'forbiddenEffects', 'formal-merge')) {
  fail('Remote save must not imply formal integration');
}

if (!includes(byId['explicit-formal-main'], 'forbiddenEffects', 'force-push')) {
  fail('Formal integration must forbid force push');
}

if (!includes(byId['explicit-context-resume'], 'requiredReferences', 'context-memory-continuity.md')) {
  fail('Continuation must load context-memory-continuity.md');
}

if (!includes(byId['explicit-recoverable-delete'], 'forbiddenEffects', 'permanent-delete')) {
  fail('Deletion must forbid permanent deletion');
}

console.log(`routing scenario validation passed (${cases.length} cases, explicit-only)`);
