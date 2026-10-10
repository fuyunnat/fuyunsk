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
    home: config.home, codexHome: config.codexHome, skillRoot,
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
