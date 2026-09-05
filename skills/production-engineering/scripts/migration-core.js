'use strict';

// 仅核对已登记功能和本地证据，不运行测试、不联网、不修改项目。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const mandatoryChecks = ['full-regression', 'resume-drill', 'rollback-drill'];
const states = new Set(['未开始', '进行中', '已实现', '已验证', '保留旧实现', '确认废弃']);
function requireValue(ok, message) { if (!ok) throw new Error(message); }
function text(value) { return typeof value === 'string' && value.trim().length > 0; }
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function array(value, label, nonempty = true) {
  requireValue(Array.isArray(value) && (!nonempty || value.length > 0), `${label} 必须是${nonempty ? '非空' : ''}数组`);
  return value;
}
function unique(values, label) {
  requireValue(values.every(text) && new Set(values).size === values.length, `${label} 包含空值或重复项`);
}
function safeFile(root, relative) {
  requireValue(text(relative) && !/[\\\0:]/.test(relative) && !path.isAbsolute(relative), '文件路径必须是普通相对路径');
  const segments = relative.split('/');
  requireValue(!segments.some(s => !s || s === '..' || s === '.' || s === '.git'), '拒绝越界或保留目录路径');
  const base = fs.realpathSync(root);
  const file = path.join(base, relative);
  requireValue(fs.lstatSync(file).isFile(), `不是普通文件：${relative}`);
  const real = fs.realpathSync(file);
  requireValue(real.startsWith(base + path.sep), `拒绝越界符号链接：${relative}`);
  return real;
}
function json(file) {
  requireValue(fs.statSync(file).size <= 4 * 1024 * 1024, '迁移记录超过 4 MiB，请按模块整理');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new Error(`无法解析迁移 JSON：${path.basename(file)}`); }
}
function artifact(root, spec) {
  requireValue(object(spec) && /^[a-f0-9]{64}$/.test(spec.sha256 || ''), '证据缺少有效 SHA-256');
  const file = safeFile(root, spec.path);
  requireValue(hash(fs.readFileSync(file)) === spec.sha256, `证据已变化：${spec.path}`);
  return file;
}
function validateInventory(data) {
  requireValue(object(data) && data.version === 1, '盘点基线版本不支持');
  requireValue(/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(data.sourceRevision || ''), '旧版本必须固定为完整提交或内容哈希');
  for (const key of ['sourceLanguage', 'targetLanguage', 'scope', 'reviewReference']) {
    requireValue(text(data[key]), `盘点基线缺少 ${key}`);
  }
  array(data.discovery, '盘点来源').forEach(d => {
    requireValue(object(d) && text(d.surface) && text(d.evidence), '盘点来源必须记录入口类别与证据位置');
  });
  const features = array(data.features, '旧功能清单');
  unique(features.map(f => f?.id), '旧功能编号');
  const checks = [];
  for (const f of features) {
    requireValue(/^[a-z0-9][a-z0-9._-]*$/.test(f.id), '功能编号使用小写字母、数字、点、下划线和连字符');
    requireValue(text(f.name) && text(f.behavior), `${f.id} 缺少名称或受保护行为`);
    unique(array(f.oldLocations, `${f.id} 旧入口`), `${f.id} 旧入口`);
    unique(array(f.requiredChecks, `${f.id} 验收用例`), `${f.id} 验收用例`);
    array(f.dependsOn, `${f.id} 依赖`, false);
    unique(f.dependsOn, `${f.id} 依赖`);
    checks.push(...f.requiredChecks);
  }
  const system = array(data.acceptanceChecks, '全局验收用例');
  system.forEach(c => requireValue(object(c) && text(c.id) && text(c.description), '全局验收用例缺少说明'));
  const ids = system.map(c => c.id);
  requireValue(mandatoryChecks.every(id => ids.includes(id)), '缺少全量回归、恢复演练或回滚演练');
  checks.push(...ids);
  unique(checks, '全局唯一验收编号');
  requireValue(checks.every(id => /^[a-z0-9][a-z0-9._-]*$/.test(id)), '验收编号格式无效');
  const byId = new Map(features.map(f => [f.id, f]));
  const active = new Set(); const visited = new Set();
  function visit(id) {
    requireValue(byId.has(id), `依赖不存在：${id}`);
    requireValue(!active.has(id), `依赖形成环：${id}`);
    if (visited.has(id)) return;
    active.add(id);
    for (const dep of byId.get(id).dependsOn) visit(dep);
    active.delete(id); visited.add(id);
  }
  for (const f of features) visit(f.id);
  return new Set(checks);
}
function load(manifestFile, expectedBaseline) {
  requireValue(fs.lstatSync(manifestFile).isFile(), '迁移台账必须是普通文件');
  const file = fs.realpathSync(manifestFile); const dir = path.dirname(file);
  const manifest = json(file);
  requireValue(object(manifest) && manifest.version === 1, '迁移台账版本不支持');
  const inventoryFile = artifact(dir, manifest.baseline);
  if (expectedBaseline) requireValue(manifest.baseline.sha256 === expectedBaseline, '盘点基线与任务绑定值不同，不能删项或改验收以通过');
  const inventory = json(inventoryFile); const cases = validateInventory(inventory);
  unique(array(manifest.targetFiles, '目标代码、测试与配置清单'), '目标文件清单');
  array(manifest.items, '迁移进度'); unique(manifest.items.map(i => i?.id), '迁移进度编号');
  requireValue(object(manifest.checks), '验收证据映射必须是对象');
  array(manifest.blockers, '阻塞清单', false);
  return { file, dir, manifest, inventory, cases };
}
function targetDigest(repo, files) {
  const h = crypto.createHash('sha256');
  for (const relative of [...files].sort()) {
    const file = safeFile(repo, relative); const data = fs.readFileSync(file);
    h.update(JSON.stringify([relative, fs.statSync(file).mode & 0o111, hash(data)]) + '\n');
  }
  return h.digest('hex');
}
function checkReceipt(context, id, digest) {
  const { dir, manifest, inventory } = context;
  requireValue(Object.hasOwn(manifest.checks, id), `缺少验收证据：${id}`);
  const receipt = json(artifact(dir, manifest.checks[id]));
  requireValue(receipt.format === 'fuyunsk-migration-receipt-v1' && (receipt.caseId === id || (Array.isArray(receipt.caseIds) && receipt.caseIds.includes(id))), `${id} 不是对应的执行凭据`);
  requireValue(receipt.baselineSha256 === manifest.baseline.sha256 && receipt.sourceRevision === inventory.sourceRevision, `${id} 旧系统基线不一致`);
  if (id === 'resume-drill') requireValue(receipt.handoffSha256 === manifest.handoff?.sha256, '交接材料在恢复演练后变化，必须补做恢复核对');
  requireValue(receipt.targetDigest === digest && receipt.afterDigest === digest, `${id} 目标代码、测试或配置变化，必须重新验证`);
  requireValue(receipt.status === 'passed' && receipt.exitCode === 0 && !receipt.error, `${id} 尚未通过`);
  requireValue(Array.isArray(receipt.command) && receipt.command.length > 0 && text(receipt.executedAt), `${id} 缺少实际命令或执行时间`);
}
function checkMigration(repo, manifestFile, expectedBaseline) {
  const context = load(manifestFile, expectedBaseline);
  const { manifest, inventory } = context;
  const errors = []; const counts = {};
  const attempt = fn => { try { fn(); } catch (e) { errors.push(e.message); } };
  const digest = targetDigest(repo, manifest.targetFiles);
  const byId = new Map(manifest.items.map(i => [i.id, i]));
  const known = new Set(inventory.features.map(f => f.id));
  for (const item of manifest.items) requireValue(known.has(item.id), `进度中出现未盘点功能：${item.id}`);
  for (const feature of inventory.features) {
    attempt(() => {
      const item = byId.get(feature.id);
      requireValue(item, `遗漏旧功能：${feature.id}`);
      requireValue(states.has(item.status), `${feature.id} 状态无效`);
      counts[item.status] = (counts[item.status] || 0) + 1;
      if (item.status === '确认废弃') {
        requireValue(text(item.reason) && text(item.approvedBy), `${feature.id} 废弃需要原因与授权来源`);
        artifact(context.dir, item.approvalEvidence);
        return;
      }
      requireValue(item.status === '已验证', `${feature.id} 仍为“${item.status}”，不能宣布整项目重写完成`);
      unique(array(item.newLocations, `${feature.id} 新入口`), `${feature.id} 新入口`);
      requireValue(item.newLocations.every(p => manifest.targetFiles.includes(p)), `${feature.id} 新实现未包含在目标指纹范围`);
      for (const dependency of feature.dependsOn) {
        requireValue(byId.get(dependency)?.status === '已验证', `${feature.id} 依赖 ${dependency} 未验证，需先核实兼容方案`);
      }
      for (const id of feature.requiredChecks) checkReceipt(context, id, digest);
    });
  }
  for (const check of inventory.acceptanceChecks) attempt(() => checkReceipt(context, check.id, digest));
  for (const id of Object.keys(manifest.checks)) requireValue(context.cases.has(id), `未知验收证据：${id}`);
  attempt(() => artifact(context.dir, manifest.handoff));
  if (manifest.blockers.length) errors.push(`仍有 ${manifest.blockers.length} 个阻塞项`);
  return { ok: errors.length === 0, counts, total: inventory.features.length, errors,
    baselineSha256: manifest.baseline.sha256, targetDigest: digest,
    limitation: '只证明已登记范围及执行凭据一致；不证明盘点绝无遗漏、测试断言充分或已经生产切换。' };
}
function bindMigration(repo, manifestFile) {
  const context = load(path.resolve(repo, manifestFile));
  return { 'Migration manifest': context.file, 'Migration baseline': context.manifest.baseline.sha256 };
}
function extendBinding(repo, fields, file, reason) {
  requireValue(text(reason) && text(fields['Migration manifest']), '扩充迁移基线需要已有绑定和明确原因');
  const previous = load(fields['Migration manifest'], fields['Migration baseline']);
  const next = load(path.resolve(repo, file));
  requireValue(previous.file !== next.file && previous.manifest.baseline.sha256 !== next.manifest.baseline.sha256, '扩充必须使用新台账和新基线，保留旧记录');
  for (const key of ['sourceRevision', 'sourceLanguage', 'targetLanguage', 'scope']) {
    requireValue(previous.inventory[key] === next.inventory[key], `扩充不能改变旧迁移边界：${key}`);
  }
  for (const key of ['features', 'acceptanceChecks']) {
    for (const item of previous.inventory[key]) {
      requireValue(next.inventory[key].some(x => x.id === item.id && JSON.stringify(x) === JSON.stringify(item)), `扩充不能删除或改写既有${key}：${item.id}`);
    }
  }
  return { 'Migration manifest': next.file, 'Migration baseline': next.manifest.baseline.sha256,
    'Migration history': [fields['Migration history'], `${previous.file} @ ${fields['Migration baseline']}；扩充原因：${reason}`].filter(Boolean).join(' | ') };
}
function checkBoundMigration(repo, fields) {
  if (!fields['Migration manifest'] && !fields['Migration baseline']) return { ok: true, applicable: false };
  try {
    requireValue(text(fields['Migration manifest']) && text(fields['Migration baseline']), '迁移任务绑定不完整');
    return { applicable: true, ...checkMigration(repo, fields['Migration manifest'], fields['Migration baseline']) };
  } catch (error) { return { applicable: true, ok: false, errors: [error.message] }; }
}
module.exports = { hash, json, safeFile, artifact, load, targetDigest, checkMigration, bindMigration, checkBoundMigration, extendBinding };
