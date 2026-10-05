'use strict';

// 只在合成临时项目验证预检行为；不使用用户真实业务目录，不代表宿主沙箱已验证。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const script = path.join(repo, 'skills/production-engineering/scripts/project-path-check.js');
const guard = require(script);
const reader = require('../skills/production-engineering/scripts/read-rules');
const read = name => fs.readFileSync(path.join(repo, name), 'utf8');

function fixture() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'project-boundary-')));
  const project = path.join(base, '开发', '好运来');
  const other = path.join(base, '开发', '开发', '商城');
  fs.mkdirSync(path.join(project, 'src'), { recursive: true });
  fs.mkdirSync(other, { recursive: true });
  fs.writeFileSync(path.join(other, 'existing.txt'), '另一项目原有内容');
  const bound = guard.binding(project);
  return { base, project, other, bound,
    options: { projectRoot: project, rootId: bound.rootId, cwd: project, paths: [path.join(project, 'src', 'new.vue')] } };
}
function cli(args, cwd, env = process.env) {
  return spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: 'utf8' });
}

test('合法中文路径与空格文件可批量预检，程序不创建文件', () => {
  const f = fixture();
  f.options.paths.push(path.join(f.project, 'src', '新 页面.vue'));
  const out = guard.check(f.options);
  assert.equal(out.pathCheckPassed, true); assert.equal(out.paths.length, 2);
  for (const p of f.options.paths) assert.equal(fs.existsSync(p), false);
  assert.equal(out.scope, 'preflight-only');
});

test('模拟事故：好运来任务被指向开发/开发/商城时拒绝，商城内容保持原样', () => {
  const f = fixture(); const target = path.join(f.other, 'existing.txt');
  const before = fs.readFileSync(target);
  const r = cli(['check', '--project-root', f.project, '--root-id', f.bound.rootId,
    '--cwd', f.project, '--path', target], f.project);
  // 调用方仅在预检成功时写入，证明这条受检查的执行路径被截断。
  if (r.status === 0) fs.writeFileSync(target, '不应该发生的覆盖');
  assert.equal(r.status, 2); assert.equal(r.stdout, '');
  assert.match(r.stderr, /越出绑定项目/);
  assert.deepEqual(fs.readFileSync(target), before);
});

test('同前缀兄弟目录不算子目录', () => {
  const f = fixture();
  assert.throws(() => guard.check({ ...f.options, paths: [`${f.project}-旧版/a.js`] }), /越出/);
});

test('临时 cd 不改变绑定，错误工具工作目录被拒绝', () => {
  const f = fixture();
  assert.throws(() => guard.check({ ...f.options, cwd: f.other }), /工作目录.*越出/);
  const r = cli(['check', '--project-root', f.project, '--root-id', f.bound.rootId,
    '--cwd', f.project, '--path', f.options.paths[0]], f.other);
  assert.equal(r.status, 0, r.stderr); // 工具预检路径不取决于预检程序自身 cwd。
});

test('沿用原身份却把根参数换成另一项目时拒绝', () => {
  const f = fixture();
  assert.throws(() => guard.check({ ...f.options, projectRoot: f.other, cwd: f.other,
    paths: [path.join(f.other, 'existing.txt')] }), /身份变化/);
});

test('没有根、没有身份、没有工具工作目录或没有目标时拒绝', () => {
  const f = fixture();
  for (const key of ['projectRoot', 'rootId', 'cwd', 'paths']) {
    const opts = { ...f.options }; delete opts[key];
    assert.throws(() => guard.check(opts));
  }
});

test('相对路径、父级跳转、未展开变量与通配符拒绝', () => {
  const f = fixture();
  const cases = ['src/a.vue', path.join(f.project, 'src') + '/../a.vue', '$PROJECT_ROOT/a.vue',
    path.join(f.project, '*.vue'), path.join(f.project, 'a\nb.vue')];
  for (const p of cases) assert.throws(() => guard.check({ ...f.options, paths: [p] }), p);
});

test('已有文件和新深层后缀均可检查，但文件不能当父目录', () => {
  const f = fixture(); const p = path.join(f.project, 'file.txt'); fs.writeFileSync(p, '原文');
  assert.equal(guard.check({ ...f.options, paths: [p] }).paths[0].kind, 'file');
  assert.equal(guard.check({ ...f.options, paths: [path.join(f.project, 'new', 'deep', 'a.js')] }).paths[0].exists, false);
  assert.throws(() => guard.check({ ...f.options, paths: [path.join(p, 'child')] }), /父路径不是目录/);
});

test('新工程目标已存在时即使为空也不覆盖，独立新目录可以预检', () => {
  const f = fixture();
  for (const target of [f.project, path.join(f.project, 'src')]) {
    assert.throws(() => guard.check({ ...f.options, operation: 'new-project', paths: [target] }));
  }
  const target = path.join(f.project, 'new-app');
  assert.equal(guard.check({ ...f.options, operation: 'new-project', paths: [target] }).pathCheckPassed, true);
  assert.equal(fs.existsSync(target), false);
});

test('单个目录通过不能冒充递归复制所有目标通过', () => {
  const f = fixture();
  assert.throws(() => guard.check({ ...f.options, paths: [path.join(f.project, 'src')] }), /具体文件/);
});

test('目录符号链接、文件符号链接与悬空链接均拒绝', () => {
  const f = fixture();
  fs.symlinkSync(f.other, path.join(f.project, 'alias'), 'dir');
  fs.symlinkSync(path.join(f.other, 'existing.txt'), path.join(f.project, 'file-link'));
  fs.symlinkSync(path.join(f.other, 'missing'), path.join(f.project, 'dangling'));
  for (const target of ['alias/new.txt', 'file-link', 'dangling']) {
    assert.throws(() => guard.check({ ...f.options, paths: [path.join(f.project, target)] }), /符号链接/);
  }
  assert.equal(fs.readFileSync(path.join(f.other, 'existing.txt'), 'utf8'), '另一项目原有内容');
});

test('检查后发生目录换链，下次检查重新拒绝而不复用旧结论', () => {
  const f = fixture(); guard.check(f.options);
  fs.renameSync(path.join(f.project, 'src'), path.join(f.project, 'src-original'));
  fs.symlinkSync(f.other, path.join(f.project, 'src'), 'dir');
  assert.throws(() => guard.check(f.options), /符号链接/);
});

test('硬链接共享文件被拒绝且不改变另一项目', () => {
  const f = fixture(); const target = path.join(f.project, 'hard-link');
  fs.linkSync(path.join(f.other, 'existing.txt'), target);
  assert.throws(() => guard.check({ ...f.options, paths: [target] }), /硬链接/);
  assert.equal(fs.readFileSync(target, 'utf8'), '另一项目原有内容');
});

test('嵌套仓库、Git 元数据与只读参考目录不能借父项目写入', () => {
  const f = fixture(); const nested = path.join(f.project, 'nested');
  fs.mkdirSync(path.join(nested, '.git'), { recursive: true });
  for (const target of ['nested/index.js', '.git/config', '.codex/config.toml', '.agents/skills/a']) {
    assert.throws(() => guard.check({ ...f.options, paths: [path.join(f.project, target)] }));
  }
  assert.throws(() => guard.check({ ...f.options, readOnlyRoots: [path.join(f.project, 'src')] }), /只读参考/);
});

test('批次里有一个越界就整批拒绝，不输出部分通过', () => {
  const f = fixture();
  assert.throws(() => guard.check({ ...f.options, paths: [...f.options.paths, path.join(f.other, 'x')] }), /越出/);
  assert.equal(fs.existsSync(f.options.paths[0]), false);
});

test('不绑定用户主目录、系统根或 Codex 配置根，不提供强制放行', () => {
  const f = fixture();
  assert.throws(() => guard.binding(os.homedir()));
  assert.throws(() => guard.binding(path.parse(f.project).root));
  const r = cli(['bind', '--project-root', f.other], f.project, { ...process.env, CODEX_HOME: f.other });
  assert.equal(r.status, 2); assert.match(r.stderr, /Codex/);
  assert.throws(() => guard.parse(['check', '--force']), /未知参数/);
  assert.throws(() => guard.parse(['check', '--execute', 'anything']), /未知参数/);
});

for (const stage of ['小改', '实现', '验证', '提交', '推送', '评审', '回滚']) {
  test(`${stage}阶段同批携带全写入规则且去重`, () => {
    const out = reader.readBatch(reader.parse(['--stage', stage, '--topic', '内容', '--reference', 'project-write-boundary.md']));
    const selected = out.references.filter(r => r.file === 'project-write-boundary.md');
    assert.equal(selected.length, 1);
    assert.equal(selected[0].text, read('skills/production-engineering/references/project-write-boundary.md'));
  });
}

test('只读不自动增加写入预检，旧读取仍保持接口不变', () => {
  const out = reader.readBatch(reader.parse(['--stage', '只读', '--topic', '接口']));
  assert.ok(!out.references.some(r => r.file === 'project-write-boundary.md'));
  assert.ok(Array.isArray(reader.readBatch(reader.parse(['--topic', '接口']))));
});

test('入口模板说明真实边界，不将预检包装成沙箱或清单授权', () => {
  const doc = read('skills/production-engineering/references/project-write-boundary.md');
  for (const text of ['所有写入', '不是操作系统沙箱', 'rootId', '复制', '解压', '构建', '重定向', '不能靠加入清单', '只读查证', '不自动恢复']) assert.ok(doc.includes(text), text);
  assert.ok(read('skills/production-engineering/SKILL.md').includes('references/project-write-boundary.md'));
  const bridge = read('global-AGENTS.example.md');
  const personal = read('docs/personal-custom-instructions.md').match(/```markdown\n([\s\S]*?)\n```/)[1];
  assert.equal(bridge.trim(), personal.trim());
  assert.ok(bridge.includes('所有写入')); assert.ok(doc.includes('越界'));
  assert.ok(read('skills/production-engineering/SKILL.md').includes('references/project-write-boundary.md'));
  assert.ok(read('docs/project-boundary-installation.md').includes('真实沙箱隔离未验证'));
});
