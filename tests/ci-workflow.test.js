'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/validate.yml'), 'utf8');

test('技能仓库推送主线和合并请求自动检查，保留手动入口', () => {
  const events = source.match(/^on:\n([\s\S]*?)(?=^\S)/m)?.[1] || '';
  for (const event of ['push', 'pull_request', 'workflow_dispatch']) {
    assert.match(events, new RegExp(`^  ${event}:`, 'm'), event);
  }
  assert.match(events, /push:\n    branches: \[main\]/);
  assert.doesNotMatch(events, /pull_request_target/);
});

test('自动检查只读权限、有界运行并保留完整自检失败退出', () => {
  assert.match(source, /^permissions:\n  contents: read\n/m);
  assert.doesNotMatch(source, /continue-on-error: true|contents: write|secrets: inherit/);
  assert.match(source, /timeout-minutes: 10/);
  assert.match(source, /persist-credentials: false/);
  assert.match(source, /run: node scripts\/validate-skill\.js/);
  assert.match(source, /cancel-in-progress: true/);
});
