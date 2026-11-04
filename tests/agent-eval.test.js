'use strict';
// 这些用例测试夹具/验收器，不冒充模型实际执行；独立代理运行另留宿主证据。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {prepare, verify, scenario, main} = require('../scripts/agent-eval');

function fixture(id) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-agent-eval-test-'));
  return prepare(id, path.join(parent, 'project')).project;
}

function receipt(root, id) {
  const item = scenario(id);
  fs.mkdirSync(path.join(root, 'evidence'));
  fs.writeFileSync(path.join(root, 'evidence/run.txt'), '验收器单元测试的合成回执；实际命令会由verify重新运行。\n');
  const data = {schemaVersion: 1, caseId: id, overall: item.overall, checks: Object.fromEntries(Object.entries(item.checks).map(([name, status]) => [name, {status, steps: '执行场景现有测试及独立行为断言', result: '按当前场景记录', evidence: 'evidence/run.txt'}]))};
  fs.writeFileSync(path.join(root, 'evaluation-receipt.json'), JSON.stringify(data));
  return data;
}

test('评测准备拒绝覆盖已有项目、未知场景和相对输出目录', () => {
  const root = fixture('small-edit');
  assert.throws(() => prepare('small-edit', root), /已存在/);
  assert.throws(() => prepare('unknown', root), /未知/);
  assert.throws(() => prepare('small-edit', 'relative'), /绝对/);
  assert.equal(main(['list']).length, 3);
});

test('写了通过回执仍会因实际行为不符而失败，修好后原命令真实通过', () => {
  const root = fixture('small-edit'); receipt(root, 'small-edit');
  const before = verify('small-edit', root);
  assert.equal(before.ok, false);
  assert.ok(before.errors.includes('独立行为验收未通过'));
  fs.writeFileSync(path.join(root, 'greet.cjs'), "exports.greet = (name = '朋友') => '你好，' + name;\n");
  const after = verify('small-edit', root);
  assert.equal(after.ok, true, after.errors.join('\n'));
  assert.ok(after.runs.every(run => run.exitCode === 0));
});

test('现有测试失败只可报告未完成，不能靠写passed或修改受保护测试蒙混', () => {
  const root = fixture('failed-check'); const data = receipt(root, 'failed-check');
  const result = verify('failed-check', root);
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.runs[0].exitCode, 1);
  data.overall = 'complete'; data.checks.main.status = 'passed';
  fs.writeFileSync(path.join(root, 'evaluation-receipt.json'), JSON.stringify(data));
  assert.equal(verify('failed-check', root).ok, false);
  fs.writeFileSync(path.join(root, 'value.test.cjs'), '');
  assert.ok(verify('failed-check', root).errors.some(message => message.includes('受保护文件')));
});

test('模块场景独立校验共享消费者、用户追加与外部未通过状态', () => {
  const root = fixture('module-scope'); const data = receipt(root, 'module-scope');
  fs.writeFileSync(path.join(root, 'sum.cjs'), 'exports.sum=values=>values.reduce((a,b)=>a+Number(b),0);\n');
  fs.writeFileSync(path.join(root, 'invoice.cjs'), "exports.invoice=values=>'合计：'+require('./sum.cjs').sum(values);\n");
  const testFile = path.join(root, 'invoice.test.cjs');
  fs.writeFileSync(testFile, fs.readFileSync(testFile, 'utf8').replace('应付：7', '合计：7'));
  assert.equal(verify('module-scope', root).ok, true);
  data.checks.external_mail.status = 'passed';
  fs.writeFileSync(path.join(root, 'evaluation-receipt.json'), JSON.stringify(data));
  assert.ok(verify('module-scope', root).errors.some(message => message.includes('external_mail')));
});

test('验收拒绝范围外文件、不真实证据、非法命令及链接', () => {
  const root = fixture('small-edit'); const data = receipt(root, 'small-edit');
  data.checks.greeting.evidence = '../other.txt';
  fs.writeFileSync(path.join(root, 'evaluation-receipt.json'), JSON.stringify(data));
  assert.ok(verify('small-edit', root).errors.some(message => message.includes('越界')));
  fs.writeFileSync(path.join(root, '工作流程.md'), '# 不应为单文件小改新建清单\n');
  assert.ok(verify('small-edit', root).errors.some(message => message.includes('范围外文件')));
  assert.throws(() => main(['verify', 'small-edit', '--output', root]), /不匹配/);
  if (process.platform !== 'win32') {
    fs.symlinkSync(path.join(root, 'greet.cjs'), path.join(root, 'linked.cjs'));
    assert.throws(() => verify('small-edit', root), /链接/);
  }
});

test('实际代理可用步骤列表与多个证据文件，不被回执表现形式误拒', () => {
  const root = fixture('small-edit'); const data = receipt(root, 'small-edit');
  fs.writeFileSync(path.join(root, 'greet.cjs'), "exports.greet=(name='朋友')=>'你好，'+name;\n");
  fs.writeFileSync(path.join(root, 'verification-evidence.txt'), '独立执行日志\n');
  data.checks.greeting.steps = ['运行原测试', '检查默认值及原有行为'];
  data.checks.greeting.result = {exitCode: 0, detail: '默认值及原行为通过'};
  data.checks.greeting.evidence = ['greet.cjs', 'verification-evidence.txt'];
  fs.writeFileSync(path.join(root, 'evaluation-receipt.json'), JSON.stringify(data));
  assert.equal(verify('small-edit', root).ok, true);
});

test('复杂场景允许补真实回归测试，并由验收器实际执行新增测试', () => {
  const root = fixture('module-scope'); receipt(root, 'module-scope');
  fs.writeFileSync(path.join(root, 'sum.cjs'), 'exports.sum=values=>values.reduce((a,b)=>a+Number(b),0);\n');
  fs.writeFileSync(path.join(root, 'invoice.cjs'), "exports.invoice=values=>'合计：'+require('./sum.cjs').sum(values);\n");
  const file = path.join(root, 'invoice.test.cjs');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('应付：7', '合计：7'));
  fs.writeFileSync(path.join(root, 'sum.test.cjs'), "require('node:test')('新回归仍失败',()=>{throw new Error('新回归失败')});\n");
  const failed = verify('module-scope', root);
  assert.equal(failed.ok, false);
  assert.ok(failed.runs[0].args.includes('sum.test.cjs'));
  assert.equal(failed.runs[0].exitCode, 1);
});

test('加载业务代码提前退出0不能冒充断言执行完成', () => {
  const root = fixture('small-edit'); receipt(root, 'small-edit');
  fs.writeFileSync(path.join(root, 'greet.cjs'), 'process.exit(0);\n');
  const result = verify('small-edit', root);
  assert.equal(result.ok, false);
});

test('清空原消费者测试不能通过模块验收', () => {
  const root = fixture('module-scope'); receipt(root, 'module-scope');
  fs.writeFileSync(path.join(root, 'sum.cjs'), 'exports.sum=values=>values.reduce((a,b)=>a+Number(b),0);\n');
  fs.writeFileSync(path.join(root, 'invoice.cjs'), "exports.invoice=values=>'合计：'+require('./sum.cjs').sum(values);\n");
  for (const name of ['report.test.cjs', 'invoice.test.cjs']) fs.writeFileSync(path.join(root, name), '');
  assert.equal(verify('module-scope', root).ok, false);
});

test('可执行文件与项目配置不能自称证据绕过范围核对', () => {
  const root = fixture('small-edit'); const data = receipt(root, 'small-edit');
  fs.writeFileSync(path.join(root, 'greet.cjs'), "exports.greet=(name='朋友')=>'你好，'+name;\n");
  fs.writeFileSync(path.join(root, 'evidence/unauthorized-server.cjs'), 'exports.server=true;\n');
  fs.writeFileSync(path.join(root, 'unauthorized-config.json'), '{"enabled":true}\n');
  data.checks.greeting.evidence = ['evidence/run.txt', 'unauthorized-config.json'];
  fs.writeFileSync(path.join(root, 'evaluation-receipt.json'), JSON.stringify(data));
  const result = verify('small-edit', root);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(message => message.includes('unauthorized-server')));
  assert.ok(result.errors.some(message => message.includes('unauthorized-config')));
});
