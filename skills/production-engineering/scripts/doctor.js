#!/usr/bin/env node
'use strict';

// 只读、有限范围的本机诊断：不联网、不执行其他进程、不创建文件，也不声称验证真实 Codex 自动调用。
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const name = 'production-engineering';
const manifestPath = 'references/installation-manifest.json';
const versionFiles = ['SKILL.md', 'agents/openai.yaml', 'references/source-lock.json', 'scripts/read-rules.js', manifestPath];
const markers = ['<!-- production-engineering:auto:start -->', '<!-- production-engineering:auto:end -->'];
const oldSignatures = ['# 全局 Codex 工作规则', '## 自动使用生产工程技能', '本机兜底路径', '## 小白优先沟通', '## 轻任务优先'];
const sha256 = content => crypto.createHash('sha256').update(content).digest('hex');
const existing = file => { try { return fs.lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };
const mark = (id, status, detail) => ({ id, status, detail });
function validAbsolute(value, label) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.includes('\0')) {
    throw new Error(label + ' 必须是绝对路径');
  }
  return path.resolve(value);
}
function directory(file) {
  const stat = existing(file);
  if (!stat) return false;
  try { return fs.statSync(file).isDirectory(); } catch (e) { if (e.code === 'ENOENT') return false; throw e; }
}
function readable(file, limit = 2 * 1024 * 1024) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > limit) throw new Error('文件不可读或超过安全检查大小');
  return fs.readFileSync(file);
}
function validateInstallationManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.files) || !manifest.files.length) {
    throw new Error('安装清单格式、版本或非空文件列表无效');
  }
  const files = manifest.files;
  if (files.some(file => typeof file !== 'string' || !file || file.includes('\0') || file.includes('\\')
    || path.posix.isAbsolute(file) || path.win32.isAbsolute(file) || /^[A-Za-z]:/.test(file)
    || file.split('/').some(part => !part || part === '.' || part === '..'))) {
    throw new Error('安装清单只能包含技能内的正规相对文件路径');
  }
  if (new Set(files).size !== files.length) throw new Error('安装清单存在重复路径');
  if (!files.includes(manifestPath)) throw new Error('安装清单必须包含自身路径');
  return files;
}
function readInstallationManifest(root) {
  let manifest;
  try { manifest = JSON.parse(readable(path.join(root, manifestPath)).toString('utf8')); }
  catch { throw new Error('安装清单 ' + manifestPath + ' 缺失、不可读或 JSON 损坏'); }
  return validateInstallationManifest(manifest);
}
function checkInstallation(installed, skillRoot) {
  if (!installed.length) return mark('installation', 'error', '候选用户级目录中未发现技能；不等于已证明所有自定义位置也不存在');
  let required;
  try { required = readInstallationManifest(skillRoot); }
  catch (error) { return mark('installation', 'error', '诊断源' + error.message); }
  const missing = new Set(), invalid = [];
  for (const loc of installed) {
    let candidateFiles = [];
    try { candidateFiles = readInstallationManifest(loc.realPath); }
    catch (error) { invalid.push(error.message); }
    for (const relative of new Set([...required, ...candidateFiles])) {
      try { if (!fs.statSync(path.join(loc.realPath, relative)).isFile()) missing.add(relative); }
      catch { missing.add(relative); }
    }
  }
  const details = [];
  if (missing.size) details.push('已安装候选存在缺失内容：' + [...missing].sort().join('、'));
  if (invalid.length) details.push([...new Set(invalid)].join('；'));
  return mark('installation', details.length ? 'error' : 'ok',
    details.length ? details.join('；') : '已按安装清单核对候选目录中全部分发文件存在；未要求定制内容逐字一致');
}
function folderCandidates(home, codexHome) {
  return [...new Set([
    path.join(home, '.agents', 'skills', name),
    path.join(home, '.codex', 'skills', name),
    path.join(codexHome, 'skills', name),
  ])];
}
function checkPersonal(codexHome) {
  const main = path.join(codexHome, 'AGENTS.md');
  const override = path.join(codexHome, 'AGENTS.override.md');
  const activeOverride = existing(override) && fs.statSync(override).isFile() && fs.statSync(override).size > 0;
  const effective = activeOverride ? override : main;
  const result = { effective: path.basename(effective), found: Boolean(existing(effective)) };
  if (!result.found) return { ...result, status: 'warning', detail: '未发现当前生效的个人规则文件；不能确认自动调度已接入' };
  const content = readable(effective, 256 * 1024).toString('utf8');
  const starts = content.split(markers[0]).length - 1;
  const ends = content.split(markers[1]).length - 1;
  const first = content.indexOf(markers[0]);
  const last = content.indexOf(markers[1]);
  const span = first >= 0 && last > first ? content.slice(first, last + markers[1].length) : '';
  const old = oldSignatures.filter(s => content.includes(s)).length >= 2;
  const correct = starts === 1 && ends === 1 && span.includes('$production-engineering') && !old;
  if (correct) return { ...result, status: 'ok', detail: '当前生效规则包含唯一的稳定技能名短调度块；客户端实际调用尚未验证' };
  const reason = old ? '存在可识别的旧长版调度规则'
    : starts !== 1 || ends !== 1 ? '短调度标记缺失、重复或不完整'
      : '短调度块未绑定稳定技能名';
  return { ...result, status: 'warning', detail: reason + '；仅报告，不自动覆盖配置' };
}
function checkIntegrity(root) {
  try {
    const lock = JSON.parse(readable(path.join(root, 'references/source-lock.json')).toString('utf8'));
    const sourceNames = ['source-original.md', 'source-speed.md', 'full-production-engineering.md'];
    for (const file of sourceNames) {
      if (!/^[a-f0-9]{64}$/.test(lock[file] || '')) return false;
      if (sha256(readable(path.join(root, 'references', file))) !== lock[file]) return false;
    }
    return true;
  } catch { return false; }
}
function diagnose(options = {}) {
  const home = validAbsolute(options.home || os.homedir(), '用户主目录');
  const codexHome = validAbsolute(options.codexHome || process.env.CODEX_HOME || path.join(home, '.codex'), 'CODEX_HOME');
  const skillRoot = validAbsolute(options.skillRoot || path.resolve(__dirname, '..'), '技能目录');
  const roots = folderCandidates(home, codexHome);
  const locations = roots.map(candidate => {
    try {
      const found = directory(candidate);
      return { path: candidate, exists: found, realPath: found ? fs.realpathSync(candidate) : null };
    } catch {
      return { path: candidate, exists: false, realPath: null, error: '技能路径无法安全读取' };
    }
  });
  const installed = locations.filter(x => x.exists);
  const actual = [...new Set(installed.map(x => x.realPath))];
  const checks = [];

  checks.push(checkInstallation(installed, skillRoot));

  checks.push(mark('duplicates', actual.length > 1 ? 'warning' : 'ok',
    actual.length > 1 ? '不同真实目录存在多份同名技能，须核对客户端实际发现结果' : '未发现多个不同真实目录的同名候选技能'));

  let changed = [];
  for (const realPath of actual) {
    for (const rel of versionFiles) {
      try {
        if (sha256(readable(path.join(realPath, rel))) !== sha256(readable(path.join(skillRoot, rel)))) changed.push(rel);
      } catch { changed.push(rel); }
    }
  }
  checks.push(mark('version', changed.length ? 'warning' : 'ok',
    changed.length ? '候选技能与运行此诊断的版本不一致：' + [...new Set(changed)].join('、') : '候选技能与诊断源的主要入口文件一致；不代表与远端最新提交一致'));

  const corrupt = actual.filter(root => !checkIntegrity(root));
  checks.push(mark('source-integrity', corrupt.length ? 'error' : 'ok',
    corrupt.length ? '至少一份候选技能的原稿或锁值无法通过 SHA-256 校验' : '所有找到的候选技能原始规范与对应锁值相符'));

  let personal;
  try { personal = checkPersonal(codexHome); }
  catch { personal = { effective: '未知', found: false, status: 'warning', detail: '个人规则路径不可读或内容超出检查边界' }; }
  checks.push(mark('personal-rule', personal.status, personal.detail));

  const overall = checks.some(c => c.status === 'error') ? 'error'
    : checks.some(c => c.status === 'warning') ? 'warning' : 'ok';
  return {
    overall, checks, locations,
    personalRules: { effective: personal.effective, found: personal.found },
    referenceFingerprint: sha256(readable(path.join(skillRoot, 'SKILL.md'))).slice(0, 16),
    limitations: [
      '只检查已知用户级候选目录和个人规则，不扫描磁盘、业务项目或其他技能',
      '真实 Codex 自动调用、客户端发现结果、本机界面及远端最新版本均未验证',
      '不读取或输出个人规则正文，不修改任何文件、权限、进程或网络配置',
    ],
  };
}
function parse(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--json' || flag === '--help') { args[flag.slice(2)] = true; continue; }
    if (!['--home', '--codex-home'].includes(flag)) throw new Error('未知参数：' + flag);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(flag + ' 缺少路径');
    args[flag === '--home' ? 'home' : 'codexHome'] = value;
  }
  return args;
}
function main(argv) {
  const args = parse(argv);
  if (args.help) {
    process.stdout.write('用法：node <技能目录>/scripts/doctor.js [--json] [--home 绝对路径] [--codex-home 绝对路径]\n只读诊断已知技能目录、版本和个人短调度；不证明真实 Codex 自动调用。\n');
    return;
  }
  const result = diagnose(args);
  if (args.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  else {
    process.stdout.write('工程技能只读诊断：' + result.overall + '\n');
    for (const item of result.checks) process.stdout.write('[' + item.status + '] ' + item.id + '：' + item.detail + '\n');
    for (const line of result.limitations) process.stdout.write('限制：' + line + '\n');
  }
  if (result.overall === 'error') process.exitCode = 1;
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { process.stderr.write('诊断失败：' + error.message + '\n'); process.exitCode = 2; }
}
module.exports = { diagnose, parse, main, manifestPath, validateInstallationManifest, readInstallationManifest };
