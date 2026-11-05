'use strict';
const { assertAgentDelegates } = require('./entry-contract-helper');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const skill = read('skills/production-engineering/SKILL.md');
const routing = read('skills/production-engineering/references/routing.md');
const batchSource = read('skills/production-engineering/scripts/rule-batch.js');
const batch = require(path.join(root, 'skills/production-engineering/scripts/rule-batch.js'));
const agent = read('skills/production-engineering/agents/openai.yaml');
const globalAgents = read('global-AGENTS.example.md').trim();
const personal = read('docs/personal-custom-instructions.md');
const reference = read('skills/production-engineering/references/frontend-delivery-loop.md');
const quickCore = read('skills/production-engineering/references/quick-core.md');
const assertRule = (body, pattern, message) => assert.ok(pattern.test(body), message);
test('前端交付专项接入全部入口且按需可批量读取', () => { for (const body of [routing, batchSource, globalAgents, personal, reference]) assert.ok(body.includes('前端交付')); assertAgentDelegates(agent); assert.ok(skill.includes('references/routing.md')); assert.ok(routing.includes('frontend-delivery-loop.md')); assert.ok(batchSource.includes("'前端交付':")); assert.ok(batchSource.includes('frontend-delivery-loop.md')); const plan = batch.planBatch('只读', ['前端交付']); assert.ok(plan.references.includes('frontend-delivery-loop.md')); assert.ok(plan.topics.includes('前端')); });
test('前端交付不能把缺失工具或未做验收写成完成', () => { for (const phrase of ['不可用/被阻塞', '视觉验收未完成', '不声称已 Review、部署或上线', '未验证']) assert.ok(reference.includes(phrase)); assert.match(reference, /设计上下文[\s\S]*语义代码理解[\s\S]*真实页面验收[\s\S]*协作与预览/); });
test('普通前端页面读取默认加载前端交付专项', () => {
  const plan = batch.planBatch('实现', ['前端']);
  assert.ok(plan.references.includes('frontend-delivery-loop.md'));
  assert.match(reference, /页面或样式修改默认加载/);
  assert.match(reference, /代表页通过布局、响应式和关键交互验收前，不批量复制/);
});

test('普通页面和快速入口均要求先给持续预览，不等整轮交付', () => {
  const plan = batch.planBatch('实现', ['前端']);
  const delivered = plan.references.map(file => read(`skills/production-engineering/references/${file}`)).join('\n');
  for (const [name, body] of [['普通前端实际读取', delivered], ['快速小改', quickCore]]) {
    assertRule(body, /边改边(?:可以)?看|边看边改|持续.{0,18}(?:预览|访问)/, `${name} 缺少持续可见的开发预览`);
    assertRule(body, /(?:先|开始|尽早|初期)[\s\S]{0,120}(?:预览|地址|页面)/, `${name} 应在开发初期给出可访问入口`);
  }
  assertRule(reference, /(?:不等|不要等|不必等|无需等)[\s\S]{0,60}(?:做完|完工|全部|整轮|验收结束)/, '不能把用户预览留到完整验收之后');
  assertRule(quickCore, /不[\s\S]{0,45}(?:全套|新建|平台|重复启动|重启)/, '持续预览不能把小改升级为新平台或全套验收');
});

test('持续预览复用真实可达入口，并区分自动更新与刷新', () => {
  assertRule(reference, /(?:复用|沿用)[\s\S]{0,90}(?:健康|已运行|现有|已有)/, '应先复用已有健康服务');
  assertRule(reference, /(?:同一|原|稳定)[\s\S]{0,25}(?:地址|URL|端口)/, '用户应有持续可用的访问地址');
  assertRule(reference, /热更新|自动更新/, '支持项目已有的自动更新');
  assertRule(reference, /(?:不支持|没有|无法|否则|需要)[\s\S]{0,100}刷新|刷新[\s\S]{0,60}(?:说明|告诉|提示)/, '不能把手动刷新谎称热更新');
  assertRule(reference, /(?:实际|真实)[\s\S]{0,60}(?:可达|打开|访问)[\s\S]{0,80}(?:地址|URL|路由)|(?:地址|URL)[\s\S]{0,70}(?:实际|真实)[\s\S]{0,40}(?:打开|可达|访问)/, '进程启动或截图不能替代实际可访问入口');
  assertRule(reference, /(?:远程|容器|转发)[\s\S]{0,130}(?:本机|用户|可达|访问)/, '远端启动不等于用户本机可访问');
});

test('指定现有配置不授权启动副作用，也不能静默更换数据来源', () => {
  assertRule(reference, /(?:用户|明确|指定)[\s\S]{0,100}\.env/, '应遵守用户明确指定的现有环境配置');
  assertRule(reference, /(?:启动前|先)[\s\S]{0,120}(?:迁移|改表)[\s\S]{0,90}(?:后台|定时|外部)/, '连接已有数据库前应查明启动副作用');
  assertRule(reference, /(?:不能|不得|不)[\s\S]{0,45}(?:静默|悄悄|擅自)[\s\S]{0,80}(?:mock|SQLite|假数据|模拟)/i, '不能悄悄换库后冒充真实预览');
  assertRule(reference, /(?:不等于|不代表|不扩大)[\s\S]{0,100}(?:生产|写入|改库|付款|支付|发信|付费)/, '预览授权不能扩大为生产写操作');
  assertRule(reference, /(?:数据来源|真实数据|隔离数据|模拟数据)/, '应明确页面实际使用的数据来源');
});

test('新模板的视觉阶段不反向要求现有页面小改解绑业务', () => {
  assertRule(reference, /(?:新模板|新设计)[\s\S]{0,160}视觉阶段/,
    '前端通用入口应说明新模板的视觉阶段');
  assertRule(reference, /(?:现有页面|已有页面|普通小改)[\s\S]{0,180}(?:保留|保持|沿用)[\s\S]{0,80}(?:已接|现有|已有)[\s\S]{0,60}(?:接口|业务)/,
    '普通现有页面小改继续保持已接业务');
  assertRule(reference, /(?:不必|无需|不得|不要求|不应|不强制)[\s\S]{0,80}(?:解绑|拆掉|断开|改成模拟|改为模拟)/,
    '视觉优先规则不能要求现有已接页面先解绑或退回模拟数据');
});
