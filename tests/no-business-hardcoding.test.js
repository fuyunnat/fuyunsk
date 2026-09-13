'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const refs = path.join(root, 'skills/production-engineering/references');
const read = file => fs.readFileSync(path.join(refs, file), 'utf8');
const config = read('configuration-localization.md');
const craft = read('code-craft.md');
const { planBatch } = require(path.join(root, 'skills/production-engineering/scripts/rule-batch.js'));

const requireText = (body, values) => values.forEach(value => {
  assert.ok(body.includes(value), `缺少硬编码门禁：${value}`);
});

test('运行时业务参数必须先分类且管理员可调值禁止散落硬编码', () => {
  requireText(config, [
    '业务硬编码门禁',
    '运行时可运营值',
    '部署值',
    '代码不变量',
    '局部实现细节',
    '没有完成分类前，不允许为了赶进度先写一个数字再说以后配置化',
    '同步/轮询/刷新/清理/重算/对账',
    '执行间隔',
    '业务重试次数',
    '保留天数',
    '批量大小',
  ]);
});

test('默认值只能有一个权威来源且命名常量不能冒充配置化', () => {
  requireText(config, [
    '默认值可以存在，但只能有一个权威来源',
    '后台值 → 兼容旧配置 → 集中默认值',
    '调度器就必须通过同一个配置键得到 5 分钟',
    '不能用“提取成 `const DEFAULT_SYNC_MINUTES = 5`”冒充配置化',
  ]);
  requireText(craft, [
    '不能只做“提取常量”就结束',
    '管理员/运营调整的值不得在业务执行路径里硬编码',
    '`const DEFAULT_SYNC_MINUTES = 5`',
    '拿命名常量冒充配置化',
  ]);
});

test('后台配置必须真实控制消费方并验证非默认值生效', () => {
  requireText(config, [
    '“可配置”必须真的控制运行行为',
    '实际消费方',
    '生效语义',
    '不能偷偷只在进程启动时读取一次',
    '多实例/多进程',
    '把一个运行时业务参数改成非默认值后，真实消费方按约定时机采用新值',
    '如果承诺无需重启，必须实际证明不重启也生效',
    '“后台出现输入框”也不等于运行逻辑已经配置化',
  ]);
});

test('Code Craft 自检会检查业务硬编码而不把所有常量都后台化', () => {
  requireText(craft, [
    '运行时配置 / 部署配置 / 代码不变量 / 局部细节',
    '协议常量、安全底线和算法不变量可以留代码',
    '不把所有值都配置化',
  ]);
});

test('后端与接口任务仍会加载配置化规则，Bug 写代码会加载 Code Craft', () => {
  const backend = planBatch('实现', ['后端']);
  assert.ok(backend.references.includes('configuration-localization.md'));
  assert.ok(backend.references.includes('code-craft.md'));

  const api = planBatch('小改', ['接口']);
  assert.ok(api.references.includes('configuration-localization.md'));
  assert.ok(api.references.includes('code-craft.md'));

  const bug = planBatch('小改', ['故障修复']);
  assert.ok(bug.references.includes('code-craft.md'));
});
