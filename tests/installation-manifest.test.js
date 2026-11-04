'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createManifest, updateManifest, checkManifest } = require('../scripts/build-installation-manifest');
const { manifestPath, validateInstallationManifest } = require('../skills/production-engineering/scripts/doctor');

test('分发清单与当前技能所有文件一致，新增专项、脚本和资产不会漏列', () => {
  const root = path.resolve(__dirname, '../skills/production-engineering');
  assert.ok(checkManifest(root) > 0);
  const manifest = createManifest(root);
  for (const file of [
    'references/qa-acceptance.md', 'references/verification-report.md', 'references/release-packaging.md',
    'scripts/migration-core.js', 'assets/progress-panel/panel.js', 'references/rules/04-00.md', manifestPath,
  ]) assert.ok(manifest.files.includes(file), file);
  assert.equal(manifest.files.filter(file => file === manifestPath).length, 1);
  assert.deepEqual(manifest.files, [...manifest.files].sort());
  assert.ok(manifest.files.every(file => typeof file === 'string'));
});

test('生成器只记录路径，检查不改文件；增删分发文件后必须刷新', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-manifest-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'references'));
  fs.mkdirSync(path.join(root, 'assets'));
  fs.writeFileSync(path.join(root, 'references/example.md'), '# 示例\n');
  assert.throws(() => checkManifest(root), /安装清单缺失/);
  assert.equal(updateManifest(root), 2);
  const file = path.join(root, manifestPath), before = fs.readFileSync(file);
  assert.equal(checkManifest(root), 2);
  assert.deepEqual(fs.readFileSync(file), before);
  fs.appendFileSync(path.join(root, 'references/example.md'), '正文改变无需重做路径清单。\n');
  assert.equal(checkManifest(root), 2);
  fs.writeFileSync(path.join(root, 'assets/new.js'), '// 新资产\n');
  assert.throws(() => checkManifest(root), /不一致/);
  assert.deepEqual(fs.readFileSync(file), before);
  assert.equal(updateManifest(root), 3);
  fs.unlinkSync(path.join(root, 'references/example.md'));
  assert.throws(() => checkManifest(root), /不一致/);
  assert.equal(updateManifest(root), 2);
  assert.equal(checkManifest(root), 2);
});

test('清单严格检查版本、非空、重复与技能内相对路径，不接受目录或穿越写法', () => {
  for (const manifest of [null, {}, { schemaVersion: 2, files: [manifestPath] },
    { schemaVersion: 1, files: [] }, { schemaVersion: 1, files: [manifestPath, manifestPath] },
    { schemaVersion: 1, files: ['SKILL.md'] }]) {
    assert.throws(() => validateInstallationManifest(manifest));
  }
  for (const invalid of ['', null, 1, '/tmp/private', '../private', 'references/../private',
    './SKILL.md', 'references//a.md', 'references/', 'C:/private', 'C:private',
    '\\private', 'references\\private', 'references/\0private']) {
    assert.throws(() => validateInstallationManifest({ schemaVersion: 1, files: [manifestPath, invalid] }));
  }
  assert.deepEqual(validateInstallationManifest({ schemaVersion: 1, files: [manifestPath, 'references/本机.md'] }),
    [manifestPath, 'references/本机.md']);
});
