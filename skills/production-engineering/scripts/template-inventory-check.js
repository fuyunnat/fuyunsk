#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const FEATURE_STATUSES = new Set(['pending', 'implementing', 'implemented', 'verified', 'approved-omit', 'unknown']);
const ACCEPTANCE_STATUSES = new Set(['pending', 'verified', 'not-applicable']);
const REQUIRED_ACCEPTANCE = [
  'source-template-unchanged',
  'parallel-run',
  'full-feature-reconciliation',
  'responsive-and-states',
  'public-seo-regression',
];

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function inside(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}

function resolveInside(repo, value, label, errors) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label} 缺失`);
    return null;
  }
  const resolved = path.resolve(repo, value);
  if (!inside(repo, resolved)) {
    errors.push(`${label} 越出项目根目录：${value}`);
    return null;
  }
  return resolved;
}

function verifyEvidence(repo, evidence, owner, errors) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    errors.push(`${owner} 已标验证但没有证据`);
    return;
  }
  for (const [index, item] of evidence.entries()) {
    if (!item || typeof item !== 'object') {
      errors.push(`${owner} evidence[${index}] 格式无效`);
      continue;
    }
    const file = resolveInside(repo, item.path, `${owner} evidence[${index}].path`, errors);
    if (!file) continue;
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      errors.push(`${owner} 证据文件不存在：${item.path}`);
      continue;
    }
    if (!/^[a-f0-9]{64}$/i.test(item.sha256 || '')) {
      errors.push(`${owner} 证据缺少有效 sha256：${item.path}`);
      continue;
    }
    const actual = hashFile(file);
    if (actual.toLowerCase() !== item.sha256.toLowerCase()) {
      errors.push(`${owner} 证据哈希不匹配：${item.path}`);
    }
  }
}

function uniqueIds(items, label, errors) {
  const seen = new Set();
  for (const item of items) {
    const id = item && typeof item.id === 'string' ? item.id.trim() : '';
    if (!id) {
      errors.push(`${label} 存在空 id`);
      continue;
    }
    if (seen.has(id)) errors.push(`${label} id 重复：${id}`);
    seen.add(id);
  }
  return seen;
}

function checkInventory(repoInput, inventoryInput) {
  const repo = fs.realpathSync(repoInput);
  const inventoryPath = path.resolve(repo, inventoryInput);
  if (!inside(repo, inventoryPath)) throw new Error('台账必须位于项目根目录内');
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const errors = [];

  if (inventory.version !== 1) errors.push('template inventory version 必须为 1');
  if (!inventory.sourceRevision || /替换|填写|example/i.test(String(inventory.sourceRevision))) errors.push('sourceRevision 必须记录真实旧模板基线');
  if (!inventory.scope || !String(inventory.scope).trim()) errors.push('scope 不能为空');
  if (!inventory.reviewReference || !String(inventory.reviewReference).trim()) errors.push('reviewReference 不能为空');
  if (typeof inventory.publicIndexable !== 'boolean') errors.push('publicIndexable 必须是 boolean');

  const sourceRoot = resolveInside(repo, inventory.sourceTemplateRoot, 'sourceTemplateRoot', errors);
  const targetRoot = resolveInside(repo, inventory.targetTemplateRoot, 'targetTemplateRoot', errors);
  if (sourceRoot && targetRoot) {
    if (sourceRoot === targetRoot || inside(sourceRoot, targetRoot) || inside(targetRoot, sourceRoot)) {
      errors.push('新旧模板目录必须独立且不能互相嵌套');
    }
    if (!fs.existsSync(sourceRoot) || !fs.statSync(sourceRoot).isDirectory()) errors.push('旧模板目录不存在或不是目录');
    if (!fs.existsSync(targetRoot) || !fs.statSync(targetRoot).isDirectory()) errors.push('新模板目录不存在或不是目录');
  }

  if (!Array.isArray(inventory.discovery) || inventory.discovery.length === 0) errors.push('discovery 不能为空；必须记录盘点来源');
  if (!Array.isArray(inventory.features) || inventory.features.length === 0) errors.push('features 不能为空；不能以空清单宣告完成');

  const features = Array.isArray(inventory.features) ? inventory.features : [];
  uniqueIds(features, 'features', errors);
  const counts = { pending: 0, implementing: 0, implemented: 0, verified: 0, 'approved-omit': 0, unknown: 0 };

  for (const feature of features) {
    const id = feature && feature.id ? feature.id : '<unknown>';
    const owner = `feature ${id}`;
    if (!feature || typeof feature !== 'object') continue;
    if (!feature.name || !String(feature.name).trim()) errors.push(`${owner} 缺少 name`);
    if (!Array.isArray(feature.sourceLocations) || feature.sourceLocations.length === 0) errors.push(`${owner} 缺少 sourceLocations`);
    if (!feature.behavior || !String(feature.behavior).trim()) errors.push(`${owner} 缺少 behavior`);
    if (!Array.isArray(feature.requiredChecks) || feature.requiredChecks.length === 0) errors.push(`${owner} 缺少 requiredChecks`);
    if (!FEATURE_STATUSES.has(feature.status)) {
      errors.push(`${owner} status 无效：${feature.status}`);
      continue;
    }
    counts[feature.status] += 1;

    if (feature.status === 'verified') {
      if (!Array.isArray(feature.targetLocations) || feature.targetLocations.length === 0) errors.push(`${owner} 已验证但没有 targetLocations`);
      verifyEvidence(repo, feature.evidence, owner, errors);
    }
    if (feature.status === 'approved-omit') {
      if (!feature.approvalSource || !String(feature.approvalSource).trim()) errors.push(`${owner} 省略必须记录用户明确批准来源`);
    }
  }

  const acceptance = Array.isArray(inventory.acceptanceChecks) ? inventory.acceptanceChecks : [];
  const acceptanceIds = uniqueIds(acceptance, 'acceptanceChecks', errors);
  for (const id of REQUIRED_ACCEPTANCE) {
    if (!acceptanceIds.has(id)) errors.push(`缺少全局验收项：${id}`);
  }
  for (const check of acceptance) {
    if (!check || typeof check !== 'object') continue;
    const owner = `acceptance ${check.id || '<unknown>'}`;
    if (!ACCEPTANCE_STATUSES.has(check.status)) {
      errors.push(`${owner} status 无效：${check.status}`);
      continue;
    }
    if (check.id === 'public-seo-regression' && check.status === 'not-applicable') {
      if (inventory.publicIndexable !== false) errors.push('公开可索引模板不能把 public-seo-regression 标为 not-applicable');
      if (!check.note || !String(check.note).trim()) errors.push('SEO 验收不适用时必须写 note 说明依据');
      continue;
    }
    if (check.status === 'not-applicable') {
      errors.push(`${owner} 不能标 not-applicable`);
      continue;
    }
    if (check.status === 'verified') verifyEvidence(repo, check.evidence, owner, errors);
  }

  const unresolved = counts.pending + counts.implementing + counts.implemented + counts.unknown;
  if (unresolved > 0) errors.push(`仍有 ${unresolved} 个功能未完成真实验证`);
  if (features.length > 0 && counts.verified + counts['approved-omit'] !== features.length) errors.push('功能分母不守恒：总能力必须等于 verified + approved-omit');

  for (const check of acceptance) {
    if (!check || !check.id) continue;
    if (check.id === 'public-seo-regression' && inventory.publicIndexable === false && check.status === 'not-applicable') continue;
    if (check.status !== 'verified') errors.push(`全局验收尚未通过：${check.id}`);
  }

  return {
    ok: errors.length === 0,
    counts: { total: features.length, ...counts, unresolved },
    errors,
    limitation: '此检查只验证已登记台账、状态和证据文件完整性；不能自动发现未登记业务能力，也不能替代浏览器/端到端/业务回归测试。',
  };
}

function main(args) {
  if (!args.length || args.includes('--help') || args.includes('-h')) {
    console.log('用法：template-inventory-check.js --repo <项目根> --inventory <台账相对路径> [--json]');
    return;
  }
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (key === '--json') { options.json = true; continue; }
    if (!['--repo', '--inventory'].includes(key)) throw new Error(`未知参数：${key}`);
    const value = args[++i];
    if (!value) throw new Error(`参数缺少值：${key}`);
    options[key.slice(2)] = value;
  }
  if (!options.repo || !options.inventory) throw new Error('必须提供 --repo 和 --inventory');
  const result = checkInventory(options.repo, options.inventory);
  console.log(options.json ? JSON.stringify(result, null, 2) : `${result.ok ? '模板二开台账检查通过' : '模板二开尚未通过完成检查'}\n${result.errors.join('\n')}\n${result.limitation}`);
  if (!result.ok) process.exitCode = 1;
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 2; }
}

module.exports = { checkInventory, main };
