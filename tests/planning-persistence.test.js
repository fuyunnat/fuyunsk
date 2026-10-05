'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const refs = path.join(skill, 'references');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const planning = read('skills/production-engineering/references/planning-persistence.md');
const template = read('skills/production-engineering/templates/workflow.example.md');
const agent = read('skills/production-engineering/agents/openai.yaml');
const globalAgents = read('global-AGENTS.example.md').trim();
const personal = read('docs/personal-custom-instructions.md');
const { planBatch } = require(path.join(skill, 'scripts/rule-batch.js'));

const includesAll = (body, values) => values.forEach(value => assert.ok(body.includes(value), `缺少：${value}`));

test('后续实现依赖的规划不能只留聊天，必须先落工作流程', () => {
  includesAll(planning, [
    '聊天不是唯一记忆',
    '在第一处业务代码写入之前',
    'PROJECT_ROOT/工作流程.md',
    '不能只写',
    '按聊天中的方案实现',
    '没有历史聊天的新会话',
  ]);
});

test('先列清单再实施只授权任务文档，不提前授权业务代码', () => {
  includesAll(planning, [
    '先列清单再做',
    '允许先更新这一个任务文档',
    '不等于授权提前修改业务代码',
    '只讨论、不要改任何文件、连清单文件也不要写',
  ]);
});

test('字段和流程清单保存到可恢复的详细粒度', () => {
  includesAll(planning, [
    '详细清单',
    '已确认决定',
    '未知与阻塞',
    '字段/配置类任务',
    '当前来源',
    '目标位置',
    '兼容/迁移',
    '发现漏项只能追加',
    '不能为了看起来接近完成而删行',
  ]);
});

test('上下文压缩、换会话和暂停前必须有可恢复断点', () => {
  includesAll(planning, [
    '准备压缩上下文、换会话、阶段暂停或遇到阻塞时',
    '当前项、下一步、阻塞、重要决定已经落盘',
    '聊天摘要、模型记忆',
    '不能替代这一步',
  ]);
});

test('规划清单专项在只读盘点阶段可读但普通任务不常驻加载', () => {
  const planned = planBatch('只读', ['规划清单']);
  for (const file of ['planning-persistence.md', 'workflow-checklist.md', 'context-memory-continuity.md']) {
    assert.ok(planned.references.includes(file), `规划阶段缺少 ${file}`);
  }

  const ordinaryRead = planBatch('只读', ['接口']);
  assert.ok(!ordinaryRead.references.includes('planning-persistence.md'));
  assert.ok(!ordinaryRead.references.includes('workflow-checklist.md'));

  const bug = planBatch('小改', ['故障修复']);
  assert.ok(!bug.references.includes('planning-persistence.md'));
});

test('工作流程模板保留已确认方案和详细清单，不依赖聊天', () => {
  includesAll(template, [
    '已确认方案 / 规划快照',
    '不能只写“见聊天/按上文方案”',
    '已确认决定',
    '未知/待查',
    '| ID | 项目/字段/能力 | 当前来源/旧位置 | 目标位置/结果 | 处理方式 | 验收 | 状态 |',
    '发现必要漏项先关联原目标与失败证据再追加',
    '非阻塞建议另记',
    '不为了“看起来完成”把详细字段缩成“其他”',
  ]);
});

test('自然语言入口识别先列清单和字段清单并要求落盘', () => {
  includesAll(agent, ['先列清单', '字段清单', '重新做个流程', 'PROJECT_ROOT/工作流程.md', '不能只留在聊天里']);
});

test('全局个性化仍短小并和个人模板完全一致', () => {
  includesAll(globalAgents, ['实现依赖的详细清单', 'PROJECT_ROOT/工作流程.md', '不能只留聊天', '纯只读不写']);
  assert.ok(Buffer.byteLength(globalAgents) <= 1800, `global AGENTS 超过 1800 bytes: ${Buffer.byteLength(globalAgents)}`);
  const block = personal.match(/```markdown\n([\s\S]*?)\n```/);
  assert.ok(block, '个人模板缺少 markdown 调度块');
  assert.equal(block[1].trim(), globalAgents);
});
