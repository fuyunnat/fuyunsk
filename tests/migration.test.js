'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const base = path.resolve(__dirname, '../skills/production-engineering');
const core = require(path.join(base, 'scripts/migration-core'));
const batch = require(path.join(base, 'scripts/read-rules'));
const cli = path.join(base, 'scripts/migration-check.js');
const stateCli = path.join(base, 'scripts/task-state.js');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-gate-test-'));
  const repo = path.join(dir, 'repo'); const records = path.join(dir, 'records');
  fs.mkdirSync(repo); fs.mkdirSync(records); fs.mkdirSync(path.join(records, 'evidence'));
  fs.writeFileSync(path.join(repo, 'app.cjs'), 'module.exports = n => n * 2;\n');
  fs.writeFileSync(path.join(repo, 'test.cjs'), "require('node:assert/strict').equal(require('./app.cjs')(3), 6);\n");
  fs.writeFileSync(path.join(records, 'handoff.md'), '# 交接测试夹具\n已验证模块、待办、禁改范围和回退点由真实任务另外验收。\n');
  const inv = { version: 1, sourceRevision: 'a'.repeat(40), sourceLanguage: '旧版测试夹具', targetLanguage: '新版测试夹具',
    scope: '仅测试检查器，不声称真实跨语言迁移或模型恢复演练', reviewReference: '合成测试中的审阅记录',
    discovery: [{ surface: '公开函数与其调用方', evidence: 'app.cjs 和 test.cjs，均为合成夹具' }],
    features: [{ id: 'double', name: '计算功能', oldLocations: ['old/app.cjs'], behavior: '三的结果为六', dependsOn: [], requiredChecks: ['double-test'] }],
    acceptanceChecks: ['full-regression', 'resume-drill', 'rollback-drill'].map(id => ({ id, description: '仅检查该用例编号的执行凭据机制' })) };
  const inventory = path.join(records, 'inventory.json'); write(inventory, inv);
  const ledger = { version: 1, baseline: { path: 'inventory.json', sha256: core.hash(fs.readFileSync(inventory)) },
    targetFiles: ['app.cjs', 'test.cjs'], items: [{ id: 'double', status: '未开始', newLocations: ['app.cjs'] }], checks: {},
    handoff: { path: 'handoff.md', sha256: core.hash(fs.readFileSync(path.join(records, 'handoff.md'))) }, blockers: [] };
  const file = path.join(records, 'ledger.json'); write(file, ledger);
  const env = { ...process.env, CODEX_HOME: path.join(dir, 'codex') };
  let sequence = 0;
  function runCase(id, program = [process.execPath, 'test.cjs'], extra = []) {
    return spawnSync(process.execPath, [cli, 'run', '--repo', repo, '--manifest', file, '--case', id,
      '--output', `evidence/${id}-${++sequence}.json`, ...extra, '--', ...program], { env, encoding: 'utf8' });
  }
  function save() { write(file, ledger); }
  function passAll() {
    for (const id of ['double-test', 'full-regression', 'resume-drill', 'rollback-drill']) {
      const result = runCase(id); assert.equal(result.status, 0, result.stderr);
      ledger.checks[id] = JSON.parse(result.stdout).evidence;
    }
    ledger.items[0].status = '已验证'; save();
  }
  function modifyReceipt(id, mutate) {
    const spec = ledger.checks[id]; const f = path.join(records, spec.path);
    const value = JSON.parse(fs.readFileSync(f, 'utf8')); mutate(value); write(f, value);
    spec.sha256 = core.hash(fs.readFileSync(f)); save();
  }
  function git(...args) {
    const r = spawnSync('git', args, { cwd: repo, env, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout;
  }
  function initGit() {
    git('init', '-q'); git('add', '--', 'app.cjs', 'test.cjs');
    git('-c', 'user.name=Local Test Fixture', '-c', 'user.email=fixture@invalid', 'commit', '-qm', 'test: 本地独立夹具');
  }
  function state(args) { return spawnSync(process.execPath, [stateCli, ...args], { env, encoding: 'utf8' }); }
  return { dir, repo, records, inv, inventory, ledger, file, env, save, passAll, runCase, modifyReceipt, initGit, state,
    check: () => core.checkMigration(repo, file) };
}

test('真实验证程序生成逐项凭据，完整登记后检查通过且只读', () => {
  const f = fixture(); f.passAll(); const before = fs.readFileSync(f.file);
  assert.equal(f.check().ok, true); assert.deepEqual(fs.readFileSync(f.file), before);
});
test('遗漏旧能力、只有已实现、仍保留旧实现均不得宣布全量完成', () => {
  const f = fixture(); f.passAll();
  for (const status of ['未开始', '进行中', '已实现', '保留旧实现']) {
    f.ledger.items[0].status = status; f.save(); assert.equal(f.check().ok, false);
  }
  // 保留一个无关条目不能掩盖旧清单缺项。
  f.ledger.items = [{ id: 'other', status: '已验证' }]; f.save(); assert.throws(f.check, /未盘点/);
  f.ledger.items = []; f.save(); assert.throws(f.check, /迁移进度/);
});
test('重复功能编号、重复用例和未知依赖被拒绝', () => {
  const f = fixture(); f.inv.features.push({ ...f.inv.features[0] }); write(f.inventory, f.inv);
  f.ledger.baseline.sha256 = core.hash(fs.readFileSync(f.inventory)); f.save(); assert.throws(f.check, /重复/);
});
test('没有实际凭据或把其他用例冒充本用例，不能通过', () => {
  const f = fixture(); f.passAll(); delete f.ledger.checks['double-test']; f.save(); assert.equal(f.check().ok, false);
  f.passAll(); f.modifyReceipt('double-test', r => { r.caseId = 'full-regression'; }); assert.equal(f.check().ok, false);
});
test('目标源码或测试修改使全部旧证据失效', () => {
  for (const file of ['app.cjs', 'test.cjs']) {
    const f = fixture(); f.passAll(); fs.appendFileSync(path.join(f.repo, file), '\n// 新变化\n'); assert.equal(f.check().ok, false);
  }
});
test('证据被篡改、旧版标识被替换均失败', () => {
  const f = fixture(); f.passAll(); fs.appendFileSync(path.join(f.records, f.ledger.checks['double-test'].path), ' ');
  assert.equal(f.check().ok, false);
  f.passAll(); f.modifyReceipt('double-test', r => { r.sourceRevision = 'b'.repeat(40); }); assert.equal(f.check().ok, false);
});
test('失败、超时和执行时修改代码不能生成通过凭据', () => {
  const f = fixture();
  for (const [program, extra] of [
    [[process.execPath, '-e', 'process.exit(1)'], []],
    [[process.execPath, '-e', 'setTimeout(()=>{},1000)'], ['--timeout-ms', '10']],
    [[process.execPath, '-e', "require('node:fs').appendFileSync('app.cjs','\\n//变更');"], []],
  ]) {
    const r = f.runCase('double-test', program, extra); assert.notEqual(r.status, 0, r.stderr);
    const saved = JSON.parse(r.stdout); assert.equal(saved.status, 'failed');
  }
});
test('越界文件、越界符号链接和伪证据路径被拒绝', () => {
  const f = fixture(); f.passAll();
  f.ledger.targetFiles.push('../secret'); f.save(); assert.throws(f.check, /越界/);
  f.ledger.targetFiles = ['app.cjs', 'test.cjs', 'escape']; fs.symlinkSync(f.inventory, path.join(f.repo, 'escape')); f.save();
  assert.throws(f.check, /普通文件/);
  f.ledger.targetFiles = ['app.cjs', 'test.cjs']; f.ledger.checks['double-test'].path = '../inventory.json'; f.save();
  assert.equal(f.check().ok, false);
});
test('废弃需要可核对批准，保留旧实现不能被废弃标记偷换', () => {
  const f = fixture(); f.passAll(); f.ledger.items[0] = { id: 'double', status: '确认废弃' }; f.save(); assert.equal(f.check().ok, false);
  fs.writeFileSync(path.join(f.records, 'approval.md'), '合成夹具：代表已批准废弃的测试证据，不是真实用户授权。');
  Object.assign(f.ledger.items[0], { reason: '测试批准记录', approvedBy: '合成授权引用',
    approvalEvidence: { path: 'approval.md', sha256: core.hash(fs.readFileSync(path.join(f.records, 'approval.md'))) } });
  f.save(); assert.equal(f.check().ok, true);
});
test('缺少全局演练、交接被改或存在阻塞时拒绝完成', () => {
  const f = fixture(); f.passAll(); delete f.ledger.checks['resume-drill']; f.save(); assert.equal(f.check().ok, false);
  f.passAll(); f.ledger.blockers = ['还有接口未联调']; f.save(); assert.equal(f.check().ok, false);
  f.ledger.blockers = []; f.save(); fs.appendFileSync(path.join(f.records, 'handoff.md'), '\n新决定'); assert.equal(f.check().ok, false);
});
test('任务完成检查强制接入台账，普通命令成功不能绕过漏项', () => {
  const f = fixture(); f.initGit();
  let r = f.state(['init', '--repo', f.repo, '--goal', '迁移夹具', '--lane', '完整通道', '--migration', f.file]); assert.equal(r.status, 0, r.stderr);
  r = f.state(['implementation-complete', '--repo', f.repo]); assert.equal(r.status, 0, r.stderr);
  r = f.state(['run', '--repo', f.repo, '--', process.execPath, '-e', 'process.exit(0)']); assert.equal(r.status, 0, r.stderr);
  r = f.state(['check', '--repo', f.repo, '--json']); assert.notEqual(r.status, 0); assert.equal(JSON.parse(r.stdout).migration.ok, false);
  assert.notEqual(f.state(['finalize', '--repo', f.repo]).status, 0);
  f.passAll(); r = f.state(['finalize', '--repo', f.repo]); assert.equal(r.status, 0, r.stderr);
  const resumed = JSON.parse(f.state(['resume', '--repo', f.repo, '--json']).stdout);
  assert.equal(resumed.migrationManifest, f.file); assert.equal(resumed.migrationBaseline, f.ledger.baseline.sha256);
});
test('任务绑定后改盘点锁或用 update 清除绑定被拒绝', () => {
  const f = fixture(); f.initGit();
  assert.equal(f.state(['init', '--repo', f.repo, '--goal', '迁移夹具', '--lane', '完整通道', '--migration', f.file]).status, 0);
  for (const key of ['--migration', '--migration-baseline', '--migration-manifest']) {
    assert.notEqual(f.state(['update', '--repo', f.repo, key, 'none']).status, 0);
  }
  f.inv.features[0].behavior += '未经确认的新行为'; write(f.inventory, f.inv);
  f.ledger.baseline.sha256 = core.hash(fs.readFileSync(f.inventory)); f.save();
  const r = f.state(['check', '--repo', f.repo, '--json']); assert.notEqual(r.status, 0);
  assert.match(JSON.parse(r.stdout).migration.errors.join(' '), /绑定值/);
});
test('旧任务可显式追加迁移绑定，绑定后不可覆盖', () => {
  const f = fixture(); f.initGit();
  assert.equal(f.state(['init', '--repo', f.repo, '--goal', '旧任务', '--lane', '完整通道']).status, 0);
  const args = ['attach-migration', '--repo', f.repo, '--migration', f.file];
  const first = f.state(args); assert.equal(first.status, 0, first.stderr); assert.notEqual(f.state(args).status, 0);
});
test('专项仅按迁移领域加载，小改和普通后端不额外读取', () => {
  const migrated = batch.readBatch(batch.parse(['--stage', '实现', '--topic', '整项目迁移,后端']));
  assert.equal(migrated.references.filter(x => x.file === 'project-migration.md').length, 1);
  for (const args of [['--stage', '小改', '--topic', '内容'], ['--stage', '实现', '--topic', '后端']]) {
    assert.ok(!batch.readBatch(batch.parse(args)).references.some(x => x.file === 'project-migration.md'));
  }
  const readonly = batch.readBatch(batch.parse(['--stage', '只读', '--topic', '整项目迁移']));
  assert.ok(readonly.references.some(x => x.file === 'project-migration.md'));
  assert.ok(!readonly.references.some(x => x.file === 'context-memory-continuity.md'));
});
test('初始模板不可能被当作已盘点、已验证的真实项目', () => {
  const f = path.join(base, 'templates/migration-ledger.example.json'); assert.throws(() => core.load(f));
});
// 夹具只证明程序门禁，不冒充真正的跨语言兼容或新会话恢复验收；按项目规则保留临时目录。

test('相同测试套件可一次为多个明确用例生成凭据，避免重复执行', () => {
  const f = fixture(); const ids = ['double-test', 'full-regression', 'resume-drill', 'rollback-drill'];
  const r = f.runCase(ids.join(',')); assert.equal(r.status, 0, r.stderr);
  const evidence = JSON.parse(r.stdout).evidence;
  for (const id of ids) f.ledger.checks[id] = evidence;
  f.ledger.items[0].status = '已验证'; f.save(); assert.equal(f.check().ok, true);
});
test('空必需用例、缺全局验收、未知依赖和循环依赖拒绝作为固定基线', () => {
  const f = fixture();
  for (const mutate of [
    i => { i.features[0].requiredChecks = []; },
    i => { i.acceptanceChecks = i.acceptanceChecks.filter(c => c.id !== 'resume-drill'); },
    i => { i.features[0].dependsOn = ['missing']; },
    i => { i.features[0].dependsOn = ['double']; },
  ]) {
    const data = JSON.parse(JSON.stringify(f.inv)); mutate(data); write(f.inventory, data);
    f.ledger.baseline.sha256 = core.hash(fs.readFileSync(f.inventory)); f.save(); assert.throws(f.check);
  }
});
test('多个旧功能中漏掉一个，不能用剩余功能全部通过掩盖', () => {
  const f = fixture(); f.inv.features.push({ id: 'job', name: '定时任务', oldLocations: ['old/job.cjs'], behavior: '过期清理', dependsOn: [], requiredChecks: ['job-test'] });
  write(f.inventory, f.inv); f.ledger.baseline.sha256 = core.hash(fs.readFileSync(f.inventory)); f.save(); f.passAll();
  const result = f.check(); assert.equal(result.ok, false); assert.match(result.errors.join(' '), /遗漏旧功能：job/);
});
test('恢复演练后的交接更改，即使重新登记文档哈希仍需补做演练', () => {
  const f = fixture(); f.passAll(); const file = path.join(f.records, 'handoff.md');
  fs.appendFileSync(file, '\n下一步变更'); f.ledger.handoff.sha256 = core.hash(fs.readFileSync(file)); f.save();
  assert.equal(f.check().ok, false);
});
test('拒绝覆盖执行凭据，拒绝 check 夹带执行程序', () => {
  const f = fixture(); f.passAll(); const existing = f.ledger.checks['double-test'].path;
  const before = fs.readFileSync(path.join(f.records, existing));
  const r = spawnSync(process.execPath, [cli, 'run', '--repo', f.repo, '--manifest', f.file, '--case', 'double-test', '--output', existing,
    '--', process.execPath, '-e', 'process.exit(0)'], { encoding: 'utf8' });
  assert.notEqual(r.status, 0); assert.deepEqual(fs.readFileSync(path.join(f.records, existing)), before);
  const blocked = spawnSync(process.execPath, [cli, 'check', '--repo', f.repo, '--manifest', f.file, '--', process.execPath, '-e', 'process.exit(0)'], { encoding: 'utf8' });
  assert.notEqual(blocked.status, 0);
});

test('发现遗漏后仅可追加基线，保留历史绑定并使验证失效', () => {
  const f = fixture(); f.initGit();
  assert.equal(f.state(['init', '--repo', f.repo, '--goal', '迁移夹具', '--lane', '完整通道', '--migration', f.file]).status, 0);
  const inv2 = JSON.parse(JSON.stringify(f.inv));
  inv2.features.push({ id: 'job', name: '新发现的定时任务', oldLocations: ['old/job.cjs'], behavior: '保留到期检查', dependsOn: [], requiredChecks: ['job-test'] });
  const nextInventory = path.join(f.records, 'inventory-2.json'); write(nextInventory, inv2);
  const next = JSON.parse(JSON.stringify(f.ledger));
  next.baseline = { path: 'inventory-2.json', sha256: core.hash(fs.readFileSync(nextInventory)) };
  next.items.push({ id: 'job', status: '未开始', newLocations: [] });
  const ledger2 = path.join(f.records, 'ledger-2.json'); write(ledger2, next);
  const r = f.state(['extend-migration', '--repo', f.repo, '--migration', ledger2, '--reason', '发现旧任务入口，需要增加盘点']);
  assert.equal(r.status, 0, r.stderr);
  const resumed = JSON.parse(f.state(['resume', '--repo', f.repo, '--json']).stdout);
  assert.equal(resumed.migrationManifest, ledger2); assert.equal(resumed.verificationStatus, 'pending');
  const saved = fs.readFileSync(resumed.statePath, 'utf8'); assert.match(saved, /迁移基线历史/); assert.ok(saved.includes(f.ledger.baseline.sha256));
  const fields = { 'Migration manifest': f.file, 'Migration baseline': f.ledger.baseline.sha256 };
  inv2.features[0].requiredChecks = ['weakened']; write(nextInventory, inv2); next.baseline.sha256 = core.hash(fs.readFileSync(nextInventory)); write(ledger2, next);
  assert.throws(() => core.extendBinding(f.repo, fields, ledger2, '不能弱化'), /不能删除或改写/);
});
test('整项目迁移不能误选快速小改读取', () => {
  assert.throws(() => batch.readBatch(batch.parse(['--stage', '小改', '--topic', '整项目迁移'])), /不能使用小改/);
});
