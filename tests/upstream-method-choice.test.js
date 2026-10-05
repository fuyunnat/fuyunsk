'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const text = fs.readFileSync(path.resolve(__dirname, '../skills/production-engineering/references/upstream-sync.md'), 'utf8');
test('按实际差异选择直接引入与语义适配，不固定手工第一', () => {
  assert.doesNotMatch(text, /语义补丁\/手工适配 >.*cherry-pick/);
  for (const phrase of ['按差异选择', 'cherry-pick', '补丁已生效', '共同基线', '必要依赖', '原文一致', '路径历史', '现有任务分支']) assert.ok(text.includes(phrase), phrase);
});
