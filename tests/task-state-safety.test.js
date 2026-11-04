'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const cli = path.resolve(__dirname, '../skills/production-engineering/scripts/task-state.js');

function fixture() {
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fuyunsk-state-safety-')));
  const repo = path.join(temp, 'repo'); fs.mkdirSync(repo);
  const env = { ...process.env, CODEX_HOME: path.join(temp, 'codex'), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(temp, 'empty-config') };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_') && !['GIT_CONFIG_NOSYSTEM', 'GIT_CONFIG_GLOBAL'].includes(key)) delete env[key];
  fs.writeFileSync(env.GIT_CONFIG_GLOBAL, '');
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: repo, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
  };
  const run = (args, extra = {}) => spawnSync(process.execPath, [cli, ...args, '--repo', repo], { env: { ...env, ...extra }, encoding: 'utf8' });
  git('init', '-q');
  fs.writeFileSync(path.join(repo, 'sample.txt'), '初始内容\n'); git('add', '--', 'sample.txt');
  git('-c', 'user.name=Local Fixture', '-c', 'user.email=fixture@invalid', 'commit', '-qm', '隔离夹具');
  const key = crypto.createHash('sha256').update(repo).digest('hex');
  const registry = path.join(env.CODEX_HOME, 'task-states', 'index', `${key.slice(0, 24)}.json`);
  const external = path.join(env.CODEX_HOME, 'task-states', key.slice(0, 16), 'task-state.md');
  return { temp, repo, env, git, run, registry, external };
}
function pass(result) { assert.equal(result.status, 0, result.stderr); return result; }
function init(f) { return pass(f.run(['init', '--goal', '隔离安全测试', '--lane', '完整通道'])); }
function absent(file) { assert.equal(fs.existsSync(file), false, `不应执行仓库扩展：${file}`); }

test('状态与指纹检查不执行本地 fsmonitor、过滤器、外部 diff 或 textconv', () => {
  const f = fixture(), marker = path.join(f.temp, 'extension-executed');
  const hook = path.join(f.temp, 'extension.sh');
  fs.writeFileSync(hook, `#!/bin/sh\nprintf x >> '${marker}'\ncat\n`, { mode: 0o700 });
  f.git('config', 'core.fsmonitor', hook); f.git('config', 'diff.external', hook);
  f.git('config', 'diff.fixture.textconv', hook); f.git('config', 'filter.fixture.clean', hook);
  f.git('config', 'filter.fixture.process', hook); f.git('config', 'filter.fixture.required', 'true');
  fs.writeFileSync(path.join(f.repo, '.gitattributes'), '*.txt filter=fixture diff=fixture\n');
  fs.writeFileSync(path.join(f.repo, 'sample.txt'), '修改后的内容\n');
  const first = f.run(['fingerprint']); absent(marker); pass(first);
  init(f); pass(f.run(['resume', '--json'])); absent(marker);
});

test('Git 环境注入不改变项目身份，也不执行环境指定的扩展', () => {
  const f = fixture(), other = fixture(), marker = path.join(f.temp, 'environment-executed');
  const hook = path.join(f.temp, 'environment.sh');
  fs.writeFileSync(hook, `#!/bin/sh\nprintf x >> '${marker}'\ncat\n`, { mode: 0o700 });
  const clean = JSON.parse(pass(f.run(['fingerprint'])).stdout);
  const injected = JSON.parse(pass(f.run(['fingerprint'], {
    GIT_DIR: path.join(other.repo, '.git'), GIT_WORK_TREE: other.repo,
    GIT_EXTERNAL_DIFF: hook, GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.fsmonitor', GIT_CONFIG_VALUE_0: hook,
  })).stdout);
  assert.deepEqual(injected, clean); absent(marker);
});

test('缺失的部分克隆对象不能让只读检查调用远端扩展程序', () => {
  const f = fixture(), marker = path.join(f.temp, 'remote-helper-executed'), hook = path.join(f.temp, 'remote-helper.sh');
  fs.writeFileSync(hook, `#!/bin/sh\nprintf x >> '${marker}'\nexit 1\n`, { mode: 0o700 });
  const tree = f.git('rev-parse', 'HEAD^{tree}');
  const object = path.join(f.repo, '.git/objects', tree.slice(0, 2), tree.slice(2)); fs.renameSync(object, `${object}.retained`);
  f.git('config', 'remote.origin.url', `ext::${hook}`); f.git('config', 'remote.origin.promisor', 'true');
  f.git('config', 'protocol.ext.allow', 'always');
  const result = f.run(['fingerprint']); absent(marker); assert.notEqual(result.status, 0);
});

test('子模块自身的过滤器不执行，修改子模块仍会使指纹变化', () => {
  const f = fixture(), child = fixture();
  f.git('-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', child.repo, 'child');
  f.git('-c', 'user.name=Local Fixture', '-c', 'user.email=fixture@invalid', 'commit', '-qam', '子模块夹具');
  const nested = path.join(f.repo, 'child');
  const childGit = (...args) => {
    const result = spawnSync('git', args, { cwd: nested, env: f.env, encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr);
  };
  const before = JSON.parse(pass(f.run(['fingerprint'])).stdout).fingerprint;
  const marker = path.join(f.temp, 'child-filter-executed'), hook = path.join(f.temp, 'child-filter.sh');
  fs.writeFileSync(hook, `#!/bin/sh\nprintf x >> '${marker}'\ncat\n`, { mode: 0o700 });
  childGit('config', 'filter.child.clean', hook);
  fs.writeFileSync(path.join(nested, '.gitattributes'), '*.txt filter=child\n');
  fs.writeFileSync(path.join(nested, 'sample.txt'), '初始更改\n');
  const result = f.run(['fingerprint']); absent(marker); pass(result);
  assert.notEqual(JSON.parse(result.stdout).fingerprint, before);
  init(f); absent(marker);
  assert.match(fs.readFileSync(f.external, 'utf8'), /存在改动/);
});

for (const scenario of ['work-link', 'state-link', 'state-hardlink', 'registry-link', 'registry-hardlink', 'registry-directory-link', 'external-directory-link', 'arbitrary-registration', 'codex-home-registration', 'legacy-registration']) {
  test(`状态写入拒绝异常落点：${scenario}`, () => {
    const f = fixture(), outside = path.join(f.temp, 'outside'); fs.mkdirSync(outside);
    const victim = path.join(outside, 'task-state.md'); let before = '# 私有原文件\n'; fs.writeFileSync(victim, before);
    if (scenario === 'work-link') {
      fs.writeFileSync(path.join(f.repo, '.gitignore'), 'work/\n'); fs.symlinkSync(outside, path.join(f.repo, 'work'), 'dir');
    } else if (scenario.startsWith('state-')) {
      fs.mkdirSync(path.join(f.repo, 'work'));
      if (scenario === 'state-link') fs.symlinkSync(victim, path.join(f.repo, 'work/task-state.md'));
      else fs.linkSync(victim, path.join(f.repo, 'work/task-state.md'));
    } else if (scenario === 'registry-link' || scenario === 'registry-hardlink') {
      fs.mkdirSync(path.dirname(f.registry), { recursive: true });
      before = JSON.stringify({ version: 1, repository: f.repo, statePath: f.external }); fs.writeFileSync(victim, before);
      if (scenario === 'registry-link') fs.symlinkSync(victim, f.registry); else fs.linkSync(victim, f.registry);
    } else if (scenario === 'registry-directory-link') {
      fs.mkdirSync(path.dirname(path.dirname(f.registry)), { recursive: true });
      fs.symlinkSync(outside, path.dirname(f.registry), 'dir');
    } else if (scenario === 'external-directory-link') {
      fs.mkdirSync(path.dirname(path.dirname(f.external)), { recursive: true });
      fs.symlinkSync(outside, path.dirname(f.external), 'dir');
    } else {
      const target = scenario === 'codex-home-registration' ? path.join(f.env.CODEX_HOME, 'config.toml') : victim;
      fs.mkdirSync(path.dirname(f.registry), { recursive: true }); fs.writeFileSync(target, before);
      if (scenario === 'legacy-registration') fs.writeFileSync(path.join(f.env.CODEX_HOME, 'task-states/index.json'), JSON.stringify({ version: 1, projects: { [f.repo]: { statePath: target } } }));
      else fs.writeFileSync(f.registry, JSON.stringify({ version: 1, repository: f.repo, statePath: target }));
    }
    const result = f.run(['init', '--goal', '必须拒绝', '--lane', '完整通道']);
    assert.notEqual(result.status, 0, `应拒绝 ${scenario}`);
    assert.equal(fs.readFileSync(victim, 'utf8'), before);
    if (scenario === 'codex-home-registration') assert.equal(fs.readFileSync(path.join(f.env.CODEX_HOME, 'config.toml'), 'utf8'), before);
  });
}

test('已创建状态被换成链接时，update/check/finalize/run 都在执行前拒绝', () => {
  for (const command of ['update', 'check', 'finalize', 'run']) {
    const f = fixture(); init(f);
    const victim = path.join(f.temp, 'victim.md'), before = '# 原样保存\n'; fs.writeFileSync(victim, before);
    fs.renameSync(f.external, `${f.external}.original`); fs.symlinkSync(victim, f.external);
    const marker = path.join(f.temp, 'verification-executed');
    const args = command === 'run'
      ? ['run', '--repo', f.repo, '--', process.execPath, '-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'x')`]
      : [command, ...(command === 'update' ? ['--goal', '不可写入'] : [])];
    const result = command === 'run'
      ? spawnSync(process.execPath, [cli, ...args], { env: f.env, encoding: 'utf8' }) : f.run(args);
    assert.notEqual(result.status, 0); assert.equal(fs.readFileSync(victim, 'utf8'), before); absent(marker);
  }
});

test('已完成状态的归档目录链接不会写到项目外', () => {
  const f = fixture(); init(f);
  const outside = path.join(f.temp, 'history-outside'); fs.mkdirSync(outside);
  const state = fs.readFileSync(f.external, 'utf8').replace('- 任务状态: 进行中', '- 任务状态: 已完成');
  fs.writeFileSync(f.external, state);
  fs.symlinkSync(outside, path.join(path.dirname(f.external), 'task-history'), 'dir');
  assert.notEqual(f.run(['init', '--goal', '拒绝归档链接', '--lane', '完整通道']).status, 0);
  assert.deepEqual(fs.readdirSync(outside), []); assert.equal(fs.readFileSync(f.external, 'utf8'), state);
});

test('合法旧索引仍可恢复并更新，旧索引原文件保留', () => {
  const f = fixture(); init(f);
  const record = JSON.parse(fs.readFileSync(f.registry, 'utf8')); fs.renameSync(f.registry, `${f.registry}.retained`);
  const legacy = path.join(f.env.CODEX_HOME, 'task-states/index.json');
  const before = JSON.stringify({ version: 1, projects: { [f.repo]: record } }); fs.writeFileSync(legacy, before);
  assert.equal(JSON.parse(pass(f.run(['resume', '--json'])).stdout).statePath, f.external);
  pass(f.run(['update', '--goal', '继续合法旧任务']));
  assert.equal(fs.readFileSync(legacy, 'utf8'), before); assert.equal(fs.existsSync(f.registry), true);
});

test('下级项目索引不能借项目路径链接跳到其他项目', () => {
  const f = fixture(), other = fixture(), alias = path.join(f.repo, 'nested'); fs.symlinkSync(other.repo, alias, 'dir');
  const hash = crypto.createHash('sha256').update(alias).digest('hex');
  const state = path.join(f.env.CODEX_HOME, 'task-states', hash.slice(0, 16), 'task-state.md');
  fs.mkdirSync(path.dirname(state), { recursive: true }); fs.writeFileSync(state, '- Task status: active\n');
  const record = path.join(f.env.CODEX_HOME, 'task-states/index', `${hash.slice(0, 24)}.json`);
  fs.mkdirSync(path.dirname(record)); fs.writeFileSync(record, JSON.stringify({ version: 1, repository: alias, statePath: state }));
  assert.notEqual(f.run(['resume', '--json']).status, 0);
});

test('标准 Git worktree 与未初始化的子模块不会误判或递归到父项目', () => {
  const f = fixture(), child = fixture();
  f.git('-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', child.repo, 'child');
  f.git('-c', 'user.name=Local Fixture', '-c', 'user.email=fixture@invalid', 'commit', '-qam', '子模块夹具');
  fs.renameSync(path.join(f.repo, 'child'), path.join(f.temp, 'retained-child')); fs.mkdirSync(path.join(f.repo, 'child'));
  pass(f.run(['fingerprint'])); init(f);
  const worktree = path.join(f.temp, 'worktree'); f.git('worktree', 'add', '-qb', 'fixture-worktree', worktree);
  const result = spawnSync(process.execPath, [cli, 'fingerprint', '--repo', worktree], { env: f.env, encoding: 'utf8' });
  assert.equal(JSON.parse(pass(result).stdout).repository, worktree);
});

for (const scenario of ['parent-swapped', 'opened-file-moved', 'opened-file-hardlinked']) {
  test(`打开临时文件时发生置换，拒绝前不写出状态正文：${scenario}`, () => {
    const { writePrivateText } = require('../skills/production-engineering/scripts/task-state-storage');
    const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fuyunsk-state-write-race-')));
    const inside = path.join(temp, 'inside'), outside = path.join(temp, 'outside');
    fs.mkdirSync(inside); fs.mkdirSync(outside);
    const target = path.join(inside, 'task-state.md'), original = '原状态保留\n'; fs.writeFileSync(target, original);
    const originalOpen = fs.openSync; let attacked = false;
    fs.openSync = function(file, ...args) {
      if (!attacked && typeof file === 'string' && path.dirname(file) === inside && file.endsWith('.tmp')) {
        attacked = true;
        if (scenario === 'parent-swapped') {
          fs.renameSync(inside, `${inside}.retained`); fs.symlinkSync(outside, inside, 'dir');
          return originalOpen.call(fs, file, ...args);
        }
        const descriptor = originalOpen.call(fs, file, ...args), moved = path.join(outside, path.basename(file));
        if (scenario === 'opened-file-moved') { fs.renameSync(file, moved); fs.writeFileSync(file, '置换文件\n'); }
        else fs.linkSync(file, moved);
        return descriptor;
      }
      return originalOpen.call(fs, file, ...args);
    };
    try { assert.throws(() => writePrivateText(target, '不得泄漏的完整状态正文\n')); }
    finally { fs.openSync = originalOpen; }
    assert.equal(attacked, true);
    const observed = fs.readdirSync(outside); assert.equal(observed.length, 1);
    for (const file of observed) assert.equal(fs.readFileSync(path.join(outside, file), 'utf8'), '', '拒绝时外部临时文件必须没有正文');
    assert.equal(fs.readFileSync(scenario === 'parent-swapped' ? path.join(`${inside}.retained`, 'task-state.md') : target, 'utf8'), original);
  });
}

test('正常本地状态完整旧流程仍可运行，并用新私有文件原子替换', () => {
  const f = fixture(); fs.writeFileSync(path.join(f.repo, '.gitignore'), 'work/\n');
  f.git('add', '.gitignore'); f.git('-c', 'user.name=Local Fixture', '-c', 'user.email=fixture@invalid', 'commit', '-qm', '忽略私有状态');
  init(f); const state = path.join(f.repo, 'work/task-state.md'), old = fs.statSync(state);
  pass(f.run(['update', '--goal', '更新安全状态']));
  assert.notEqual(fs.statSync(state).ino, old.ino, '通过同目录新文件原子替换');
  if (process.platform !== 'win32') assert.equal(fs.statSync(state).mode & 0o777, 0o600);
  pass(f.run(['implementation-complete']));
  pass(spawnSync(process.execPath, [cli, 'run', '--repo', f.repo, '--', process.execPath, '-e', 'process.exit(0)'], { env: f.env, encoding: 'utf8' }));
  pass(f.run(['check', '--json'])); pass(f.run(['finalize']));
  assert.equal(JSON.parse(pass(f.run(['resume', '--json'])).stdout).taskStatus, 'complete');
  init(f); assert.equal(fs.readdirSync(path.join(path.dirname(state), 'task-history')).length, 1);
});
