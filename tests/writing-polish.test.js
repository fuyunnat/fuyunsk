'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skillDir = path.join(root, 'skills/production-engineering');
const refs = path.join(skillDir, 'references');
const read = p => fs.readFileSync(p, 'utf8');
const { planBatch } = require(path.join(skillDir, 'scripts/rule-batch.js'));

const polish = read(path.join(refs, 'writing-polish.md'));
const content = read(path.join(refs, 'content-writing-quality.md'));
const routing = read(path.join(refs, 'routing.md'));

test('润色先保护技术事实和证据强度', () => {
  for (const value of [
    '先保真，再润色',
    '数字、日期、版本号',
    '命令、路径、URL',
    'API/字段名、错误码',
    '责任主体、归因关系、条件、例外、否定、权限和不确定性',
    '已验证/未验证、成功/失败、支持/不支持、兼容/不兼容',
    '不能为了自然补出不存在的数据、案例、经历、用户反馈、性能提升、引用、原因或结论',
  ]) assert.ok(polish.includes(value), `缺少保真要求：${value}`);
});

test('去模板感不是机械禁词或强制口语化', () => {
  for (const value of [
    '风险信号，不是违禁词',
    '不要反过来建立绝对禁词表',
    '不以“越口语越像人”为目标',
    '不要为了显得像真人随机改变句长',
    '故意加错别字',
    'AI 检测分数降低”不是本模块的完成条件',
  ]) assert.ok(polish.includes(value), `缺少去模板边界：${value}`);
});

test('润色按场景并保护用户声口', () => {
  for (const value of [
    'README / 安装 / 运维说明',
    'PR / 更新日志 / 发布说明',
    '客户/用户技术说明',
    '产品界面文案',
    '正式报告/技术文章',
    '已有项目、品牌或用户自己的稳定声口优先',
    '只把稳定、重复出现的差异当偏好',
    '不自动修改全局 Skill、AGENTS 或建立永久画像',
  ]) assert.ok(polish.includes(value), `缺少场景或声口规则：${value}`);
});

test('开发载荷不被润色层误改', () => {
  for (const value of [
    '代码、SQL、JSON/YAML、配置值和协议 payload',
    '日志、堆栈、错误码和需要逐字保真的报错',
    'shell 命令、路径、环境变量和接口字段',
    '功能正确性、兼容性和真实测试优先',
  ]) assert.ok(polish.includes(value), `缺少开发载荷保护：${value}`);
});

test('文案润色专项按需加载，普通内容和 Bug 不自动变重', () => {
  const polished = planBatch('实现', ['文案润色']);
  assert.ok(polished.references.includes('content-writing-quality.md'));
  assert.ok(polished.references.includes('writing-polish.md'));

  const contentOnly = planBatch('实现', ['内容']);
  assert.ok(contentOnly.references.includes('content-writing-quality.md'));
  assert.ok(!contentOnly.references.includes('writing-polish.md'), '普通内容任务不应默认加载深度润色层');

  const bug = planBatch('小改', ['故障修复']);
  assert.ok(!bug.references.includes('writing-polish.md'), '普通 Bug 不应加载写作润色');
});

test('路由和基础写作规则明确渐进加载', () => {
  assert.match(routing, /文案润色、去模板感、说人话/);
  assert.match(routing, /写作润色是按需旁路，不拖慢开发主线/);
  assert.match(content, /再叠加 `writing-polish\.md`/);
  assert.match(content, /代码、日志、命令、配置原文和协议载荷不套润色层/);
});
