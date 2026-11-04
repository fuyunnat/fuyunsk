'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const skillRoot = path.resolve(__dirname, '../skills/production-engineering');
const script = path.join(skillRoot, 'scripts/doctor.js');
const short = fs.readFileSync(path.resolve(__dirname, '../global-AGENTS.example.md'), 'utf8');

function setup(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-doctor-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const codexHome = path.join(home, '.codex');
  const installed = path.join(home, '.agents', 'skills', 'production-engineering');
  fs.mkdirSync(path.dirname(installed), { recursive: true });
  fs.cpSync(skillRoot, installed, { recursive: true });
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(path.join(codexHome, 'AGENTS.md'), short);
  return { home, codexHome, installed };
}

function run(config) {
  return require(script).diagnose({
    home: config.home, codexHome: config.codexHome, skillRoot: config.skillRoot || skillRoot,
  });
}
const status = (result, id) => result.checks.find(item => item.id === id)?.status;

test('正确安装只有一份、短指令有效且原稿完整时诊断通过', t => {
  const config = setup(t), result = run(config);
  for (const id of ['installation', 'duplicates', 'version', 'source-integrity', 'personal-rule']) {
    assert.equal(status(result, id), 'ok', id);
  }
  assert.equal(result.overall, 'ok');
  assert.equal(result.locations.filter(x => x.exists).length, 1);
  assert.match(result.limitations.join(' '), /真实.*自动调用.*未验证/);
});

test('报告不同真实目录的重复技能；同目标符号链接不算重复', t => {
  const config = setup(t);
  const duplicate = path.join(config.home, '.codex', 'skills', 'production-engineering');
  fs.mkdirSync(path.dirname(duplicate), { recursive: true });
  fs.cpSync(skillRoot, duplicate, { recursive: true });
  assert.equal(status(run(config), 'duplicates'), 'warning');
  fs.rmSync(duplicate, { recursive: true, force: true });
  try {
    fs.symlinkSync(config.installed, duplicate, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (process.platform === 'win32' && /EPERM|EACCES|UNKNOWN/.test(error.code || '')) return;
    throw error;
  }
  assert.equal(status(run(config), 'duplicates'), 'ok');
});

test('识别已存在覆盖文件优先级以及覆盖文件缺少短块', t => {
  const config = setup(t);
  fs.writeFileSync(path.join(config.codexHome, 'AGENTS.override.md'), '# 仅保留其它规则\n');
  const result = run(config);
  assert.equal(result.personalRules.effective, 'AGENTS.override.md');
  assert.equal(status(result, 'personal-rule'), 'warning');
  assert.equal(fs.readFileSync(path.join(config.codexHome, 'AGENTS.md'), 'utf8'), short);
});

test('拒绝把旧长模板、重复标记、缺文件冒充安装成功', t => {
  const config = setup(t);
  fs.writeFileSync(path.join(config.codexHome, 'AGENTS.md'),
    '# 全局 Codex 工作规则\n## 自动使用生产工程技能\n本机兜底路径\n');
  assert.equal(status(run(config), 'personal-rule'), 'warning');
  fs.writeFileSync(path.join(config.codexHome, 'AGENTS.md'), short + short);
  assert.equal(status(run(config), 'personal-rule'), 'warning');
  fs.unlinkSync(path.join(config.installed, 'scripts/read-rules.js'));
  assert.equal(status(run(config), 'installation'), 'error');
});

for (const relative of [
  'references/qa-acceptance.md',
  'references/verification-report.md',
  'references/release-packaging.md',
  'references/rules/04-00.md',
  'scripts/migration-core.js',
  'assets/progress-panel/panel.js',
  'templates/task-card.example.md',
  'references/installation-manifest.json',
]) {
  test('完整安装诊断拒绝缺少分发文件：' + relative, t => {
    const config = setup(t);
    fs.unlinkSync(path.join(config.installed, relative));
    const result = run(config);
    assert.equal(status(result, 'installation'), 'error');
    assert.equal(result.overall, 'error');
    assert.ok(result.checks.find(item => item.id === 'installation').detail.includes(relative));
  });
}

test('已安装脚本在缺少专项时同样失败；损坏和缺失的自带清单不会退回正常', t => {
  const config = setup(t);
  fs.unlinkSync(path.join(config.installed, 'references/qa-acceptance.md'));
  const response = spawnSync(process.execPath,
    [path.join(config.installed, 'scripts/doctor.js'), '--json', '--home', config.home, '--codex-home', config.codexHome],
    { encoding: 'utf8' });
  assert.equal(response.status, 1, response.stderr);
  assert.equal(JSON.parse(response.stdout).overall, 'error');
  const manifest = path.join(config.installed, 'references/installation-manifest.json');
  fs.writeFileSync(manifest, '{损坏');
  let result = run({ ...config, skillRoot: config.installed });
  assert.equal(status(result, 'installation'), 'error');
  assert.match(result.checks.find(item => item.id === 'installation').detail, /安装清单.*损坏/);
  fs.unlinkSync(manifest);
  result = run({ ...config, skillRoot: config.installed });
  assert.equal(result.overall, 'error');
  assert.match(result.checks.find(item => item.id === 'installation').detail, /安装清单.*缺失/);
});

test('安装清单格式错误必须报错，不能当作空清单跳过', t => {
  const config = setup(t), relative = 'references/installation-manifest.json';
  const file = path.join(config.installed, relative);
  for (const manifest of [
    { schemaVersion: 2, files: [relative] },
    { schemaVersion: 1, files: [] },
    { schemaVersion: 1, files: [relative, relative] },
    { schemaVersion: 1, files: [relative, '../外部凭据'] },
  ]) {
    fs.writeFileSync(file, JSON.stringify(manifest));
    const result = run(config);
    assert.equal(status(result, 'installation'), 'error');
    assert.equal(result.overall, 'error');
    assert.doesNotMatch(JSON.stringify(result), /外部凭据/);
  }
});

test('安装版额外声明的必要文件也必须实际存在', t => {
  const config = setup(t), file = path.join(config.installed, 'references/installation-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  manifest.files.push('references/custom-required.md');
  fs.writeFileSync(file, JSON.stringify(manifest));
  assert.equal(status(run(config), 'installation'), 'error');
  fs.writeFileSync(path.join(config.installed, 'references/custom-required.md'), '# 自定义专项\n');
  assert.equal(status(run(config), 'installation'), 'ok');
});

test('保留专项内容定制与额外本机文件，不按整个目录字节差异判坏', t => {
  const config = setup(t);
  const custom = path.join(config.installed, 'references/qa-acceptance.md');
  fs.appendFileSync(custom, '\n本机附加验收条件。\n');
  fs.writeFileSync(path.join(config.installed, 'references/local-custom.md'), '# 本机定制\n');
  const before = fs.readFileSync(custom);
  const result = run(config);
  assert.equal(result.overall, 'ok');
  assert.equal(status(result, 'installation'), 'ok');
  assert.deepEqual(fs.readFileSync(custom), before);
});

test('发现版本不一致和原始规范校验错误，绝不更新锁值', t => {
  const config = setup(t);
  fs.appendFileSync(path.join(config.installed, 'SKILL.md'), '\n本机另有修改\n');
  assert.equal(status(run(config), 'version'), 'warning');
  fs.appendFileSync(path.join(config.installed, 'references/source-original.md'), '\n原稿被篡改\n');
  assert.equal(status(run(config), 'source-integrity'), 'error');
});

test('CLI JSON 可解析，检查过程不新建工作流程或修改个人配置', t => {
  const config = setup(t);
  const cfg = path.join(config.codexHome, 'AGENTS.md');
  const before = fs.readFileSync(cfg);
  const response = spawnSync(process.execPath,
    [script, '--json', '--home', config.home, '--codex-home', config.codexHome],
    { encoding: 'utf8' });
  assert.equal(response.status, 0, response.stderr);
  const parsed = JSON.parse(response.stdout);
  assert.equal(parsed.overall, 'ok');
  assert.deepEqual(fs.readFileSync(cfg), before);
  assert.ok(!fs.existsSync(path.join(config.codexHome, '工作流程.md')));
  assert.ok(!fs.existsSync(path.join(config.home, '工作流程.md')));
  const code = fs.readFileSync(script, 'utf8');
  assert.doesNotMatch(code, /(?:node:)?child_process|fs\.(?:writeFile|appendFile|mkdir|rmSync|unlink|rename)/);
});

test('非法 CLI 参数失败且不泄露配置正文', t => {
  const config = setup(t);
  const result = spawnSync(process.execPath, [script, '--json', '--unknown'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /未知参数/);
  const inspect = run(config);
  assert.doesNotMatch(JSON.stringify(inspect), /工程技能自动调用/);
});
