'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const skill = path.resolve(__dirname, '../skills/production-engineering');
const run = args => spawnSync(process.execPath, [path.join(skill, 'scripts/read-rules.js'), ...args],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 });

test('目标提示词从真实只读CLI加载规划分支，不默认加载执行设施', () => {
  const result = run(['--stage', '只读', '--topic', '目标提示词', '--json']);
  assert.equal(result.status, 0, result.stderr);
  const out = JSON.parse(result.stdout);
  const planning = out.references.find(r => r.file === 'planning-persistence.md');
  assert.ok(planning);
  assert.equal(planning.text, fs.readFileSync(path.join(skill, 'references/planning-persistence.md'), 'utf8'));
  for (const name of ['workflow-checklist.md', 'workflow-progress-panel.md', 'code-craft.md', 'task-card.md']) {
    assert.ok(!out.references.some(r => r.file === name), name);
  }
  const branch = planning.text.indexOf('目标提示词：只输出');
  assert.ok(branch >= 0 && branch < planning.text.indexOf('核心原则：'));
});

test('目标提示词不能混作实施阶段读取，报错不输出部分成功规则', () => {
  for (const stage of ['小改', '实现', '记录收尾', '提交', '推送']) {
    const result = run(['--stage', stage, '--topic', '目标提示词', '--json']);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /目标提示词.*只读/);
  }
});
