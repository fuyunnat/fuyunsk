'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const skill = path.resolve(__dirname, '../skills/production-engineering');
const refs = path.join(skill, 'references');
const script = path.join(skill, 'scripts/read-rules.js');
const reader = require(script);
const { planBatch } = require(path.join(skill, 'scripts/rule-batch.js'));
const qaFile = 'qa-acceptance.md';
const reportFile = 'verification-report.md';
const codingFiles = ['code-craft.md', 'observability-debugging.md', 'performance-baseline.md'];
const run = args => spawnSync(process.execPath, [script, ...args], {
  encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
});

function assertCompleteReference(out, file) {
  const entries = out.references.filter(entry => entry.file === file);
  assert.equal(entries.length, 1, `${file} 应完整返回且不重复`);
  const bytes = fs.readFileSync(path.join(refs, file));
  assert.equal(entries[0].text, bytes.toString('utf8'), `${file} 不得截断`);
  assert.equal(entries[0].bytes, bytes.length);
  assert.equal(entries[0].sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
}

test('QA 从真实只读和验证 CLI 完整读取验收及报告专项，不隐式加入 Git 交付或重设计', () => {
  for (const stage of ['只读', '验证']) {
    const result = run(['--stage', stage, '--topic', 'QA', '--json']);
    assert.equal(result.status, 0, result.stderr);
    const out = JSON.parse(result.stdout);
    assert.equal(out.stage, stage);
    assertCompleteReference(out, qaFile);
    assertCompleteReference(out, reportFile);
    assert.ok(out.rules.some(rule => rule.id === '20-00'), `${stage} QA 保留真实验证条款`);
    for (const topic of ['Git提交', 'Git推送', '内容', '前端']) {
      assert.ok(!out.topics.includes(topic), `${stage} QA 不隐式扩大到 ${topic}`);
    }
    for (const file of ['git-team-delivery.md', 'content-writing-quality.md', 'ui-design-workflow.md',
      'frontend-design-intelligence.md', 'mc-ui-scaffold.md']) {
      assert.ok(!out.references.some(entry => entry.file === file), `${stage} QA 不隐式加载 ${file}`);
    }
  }
});

test('验证阶段默认加载 QA 验收，并由真实 reader 返回全文', () => {
  const plan = planBatch('验证');
  assert.ok(plan.references.includes(qaFile));
  assert.ok(plan.references.includes(reportFile));
  const out = reader.readBatch(reader.parse(['--stage', '验证']));
  assertCompleteReference(out, qaFile);
  assertCompleteReference(out, reportFile);
});

test('小改、普通只读、目标提示词和记录收尾保持按需读取，不默认增加 QA 全文', () => {
  for (const [stage, topics] of [
    ['小改', []], ['只读', []], ['只读', ['目标提示词']], ['记录收尾', []],
  ]) {
    const plan = planBatch(stage, topics);
    assert.ok(!plan.references.includes(qaFile), `${stage}/${topics.join(',')} 应保持轻量`);
    const args = ['--stage', stage, ...(topics.length ? ['--topic', topics.join(',')] : [])];
    const out = reader.readBatch(reader.parse(args));
    assert.ok(!out.references.some(entry => entry.file === qaFile), args.join(' '));
  }
});

test('纯 QA 在小改和实现阶段不自动变成代码生成，明确混合后端时仍保留代码纪律', () => {
  for (const stage of ['小改', '实现']) {
    const qa = planBatch(stage, ['QA']);
    assert.ok(qa.references.includes(qaFile));
    assert.ok(qa.references.includes(reportFile));
    for (const file of codingFiles) assert.ok(!qa.references.includes(file), `${stage} QA 不需要 ${file}`);
    assert.ok(!qa.ids.includes('11-00'), `${stage} QA 不自动读取代码生成约束`);

    const mixed = planBatch(stage, ['QA', '后端']);
    assert.ok(mixed.references.includes(qaFile));
    for (const file of codingFiles) assert.ok(mixed.references.includes(file), `${stage} 混合后端仍需要 ${file}`);
    assert.ok(mixed.ids.includes('11-00'));
    const out = reader.readBatch(reader.parse(['--stage', stage, '--topic', 'QA,后端']));
    assert.ok(out.rules.some(rule => rule.id === '10-00'), '后端规则不得因 QA 混合而被丢弃');
  }
});

test('QA 任务不能借记录收尾阶段绕过适用阶段选择', () => {
  const result = run(['--stage', '记录收尾', '--topic', 'QA', '--json']);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /记录收尾仅用于/);
});

test('QA 专项可从技能与领域路由入口发现，代理入口继续委托技能流程', () => {
  for (const file of ['SKILL.md', 'references/routing.md']) {
    const body = fs.readFileSync(path.join(skill, file), 'utf8');
    assert.ok(body.includes(qaFile), `${file} 应接入 QA 专项`);
  }
  const agent = fs.readFileSync(path.join(skill, 'agents/openai.yaml'), 'utf8');
  assert.ok(agent.includes('SKILL.md'), '代理入口必须继续委托技能流程');
});
