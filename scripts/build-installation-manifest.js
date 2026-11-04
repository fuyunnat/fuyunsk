#!/usr/bin/env node
'use strict';

// 仅由维护者在分发文件增删后运行；安装诊断只读这份清单，不自行重建。
const fs = require('node:fs');
const path = require('node:path');
const { manifestPath, validateInstallationManifest } = require('../skills/production-engineering/scripts/doctor');
const skillRoot = path.resolve(__dirname, '../skills/production-engineering');

function createManifest(root) {
  function walk(relative) {
    return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
      const file = relative ? relative + '/' + entry.name : entry.name;
      if (entry.isDirectory()) return walk(file);
      if (!entry.isFile()) throw new Error('分发目录包含非普通文件或符号链接：' + file);
      return file === manifestPath ? [] : [file];
    });
  }
  const manifest = { schemaVersion: 1, files: [...walk(''), manifestPath].sort() };
  validateInstallationManifest(manifest);
  return manifest;
}
function renderManifest(root) {
  return JSON.stringify(createManifest(root), null, 2) + '\n';
}
function updateManifest(root) {
  const content = renderManifest(root);
  fs.writeFileSync(path.join(root, manifestPath), content);
  return JSON.parse(content).files.length;
}
function checkManifest(root) {
  const expected = renderManifest(root);
  let actual;
  try { actual = fs.readFileSync(path.join(root, manifestPath), 'utf8'); }
  catch { throw new Error('安装清单缺失；运行 node scripts/build-installation-manifest.js 生成'); }
  if (actual !== expected) throw new Error('安装清单与技能分发文件不一致；运行 node scripts/build-installation-manifest.js 更新');
  return JSON.parse(actual).files.length;
}
function main(argv) {
  if (argv.length > 1 || (argv.length && argv[0] !== '--check')) throw new Error('用法：node scripts/build-installation-manifest.js [--check]');
  const count = argv.length ? checkManifest(skillRoot) : updateManifest(skillRoot);
  process.stdout.write('安装清单' + (argv.length ? '一致性检查通过' : '已更新') + '：' + count + ' 个分发文件。\n');
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
module.exports = { createManifest, renderManifest, updateManifest, checkManifest };
