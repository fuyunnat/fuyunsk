'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const refPath = path.join(root, 'skills/production-engineering/references/git-team-delivery.md');
const ref = fs.readFileSync(refPath, 'utf8');
const { planBatch } = require('../skills/production-engineering/scripts/rule-batch');

test('团队 Git 专项存在且标题为中文', () => {
  assert.match(ref, /^# 团队 Git 交付专项/m);
});

test('专项明确不会因读取扩大权限', () => {
  assert.match(ref, /不会因为被读取就扩大远端写入权限/);
});

test('交付前必须固定远端稳定基线和 SHA', () => {
  assert.match(ref, /记录实际基线 SHA/);
  assert.match(ref, /不能只凭经验猜 `main` 或 `master`/);
});

test('用户已有改动不能混入当前提交', () => {
  assert.match(ref, /不覆盖、不回滚、不格式化，也不把它们混入本次提交/);
});

test('提交按逻辑单元而不是按文件数量切分', () => {
  assert.match(ref, /可审查、可验证、可回滚的逻辑单元/);
  assert.match(ref, /不要制造无意义的微型提交/);
});

test('提交前检查敏感信息和计划外变化', () => {
  assert.match(ref, /敏感信息、生成物、日志、缓存、本地配置和计划外格式化/);
});

test('远端保存与合并主线是不同状态', () => {
  assert.match(ref, /推送不等于合并/);
  assert.match(ref, /是否已经进入稳定主线/);
});

test('直接主线写入必须有明确授权', () => {
  assert.match(ref, /直接进入主线只接受明确授权/);
  assert.match(ref, /该授权只覆盖当前已说明的改动/);
});

test('直接主线更新必须复核 HEAD 且禁止 force', () => {
  assert.match(ref, /远端主线 HEAD/);
  assert.match(ref, /禁止用 force/);
  assert.match(ref, /如果主线在最后确认后又移动/);
});

test('PR 保持一个任务一条评审线并复核 base head', () => {
  assert.match(ref, /一个任务一条评审线/);
  assert.match(ref, /`base\.\.\.head`/);
});

test('PR 合并与删除远端分支不能被隐式授权', () => {
  assert.match(ref, /未经明确授权，不自动点击 Merge，也不自动删除远端分支/);
});

test('团队并发不能用 ours/theirs 机械覆盖', () => {
  assert.match(ref, /不能只选“ours”或“theirs”/);
  assert.match(ref, /不重写旧提交/);
});

test('共享历史回滚使用新的可审计改动', () => {
  assert.match(ref, /通过 `revert` 或新的修复提交/);
  assert.match(ref, /不通过强推把历史改没/);
});

test('只有 Git 交付阶段自动同批加载专项', () => {
  for (const stage of ['提交', '推送', '评审', '回滚']) {
    assert.ok(planBatch(stage).references.includes('git-team-delivery.md'), `${stage} 阶段必须加载团队 Git 专项`);
  }
  for (const stage of ['只读', '小改', '实现', '验证']) {
    assert.ok(!planBatch(stage).references.includes('git-team-delivery.md'), `${stage} 阶段不应常驻团队 Git 专项`);
  }
});
