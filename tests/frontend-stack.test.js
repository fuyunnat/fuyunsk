'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const refs = path.join(skill, 'references');
const reader = require(path.join(skill, 'scripts/read-rules.js'));
const raw = file => fs.readFileSync(path.join(refs, file), 'utf8');

for (const args of [
  ['--topic', '前端'],
  ['--id', '09'],
  ['--id', '09-00', '--source', '补充稿'],
  ['--stage', '小改', '--topic', '前端'],
  ['--stage', '实现', '--topic', '前端,接口'],
  ['--stage', '只读', '--topic', '前端'],
  ['--stage', '实现', '--id', '09-00'],
]) test(`前端读取附带最新选型且不改原文：${args.join(' ')}`, () => {
  const out = reader.readBatch(reader.parse(args));
  const rules = Array.isArray(out) ? out : out.rules;
  const frontend = rules.find(e => e.id === '09-00');
  assert.ok(frontend);
  assert.equal(frontend.text, raw(frontend.file));
  assert.match(frontend.text, /Ant Design Vue/, '原稿历史选型仍可追溯');
  assert.equal(frontend.amendments.length, 1);
  assert.equal(frontend.amendments[0].file, 'frontend-stack.md');
  assert.equal(frontend.amendments[0].text, raw('frontend-stack.md'));
  assert.match(frontend.amendments[0].text, /shadcn\/ui \+ Tailwind CSS/);
  assert.match(frontend.amendments[0].text, /不再默认选择 Vue/);
  assert.match(frontend.amendments[0].text, /整站迁移授权/);
});

test('非前端旧读取保持原数组及每个原字段，不注入前端规则', () => {
  const out = reader.readBatch(reader.parse(['--topic', '接口']));
  const expected = reader.select(reader.loadManifest(), ['10']).map(e => ({
    ...e, text: reader.content(e).toString('utf8'),
  }));
  assert.deepEqual(out, expected);
});

test('文本先说明新选型，重复主题只附加一次修改说明', () => {
  const r = spawnSync(process.execPath, [path.join(skill, 'scripts/read-rules.js'), '--topic', '前端,前端'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.indexOf('当前生效的定向修改') < r.stdout.indexOf('【原文 09-00'));
  assert.equal(r.stdout.split('# 当前前端选型：').length - 1, 1);
});

test('缺失选型修改文件时拒绝退回旧默认', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frontend-policy-test-'));
  fs.cpSync(refs, dir, { recursive: true });
  fs.renameSync(path.join(dir, 'frontend-stack.md'), path.join(dir, 'frontend-stack.backup'));
  assert.throws(() => reader.readBatch(reader.parse(['--topic', '前端']), dir), /ENOENT/);
});

test('当前入口、模板和专项都指向同一前端选型', () => {
  for (const file of ['SKILL.md', 'references/frontend-interface-quality.md', 'references/frontend-stack.md']) {
    const s = fs.readFileSync(path.join(skill, file), 'utf8');
    assert.match(s, /shadcn\/ui \+ Tailwind CSS/);
    assert.doesNotMatch(s, /新后台默认 Vue/);
  }
  for (const file of ['README.md', 'global-AGENTS.example.md', 'docs/personal-custom-instructions.md']) {
    assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /shadcn\/ui \+ Tailwind CSS/);
  }
  assert.match(raw('frontend-stack.md'), /tsx: false/);
  assert.match(raw('frontend-stack.md'), /状态完整、布局整洁、响应式、视觉验收/);
});
