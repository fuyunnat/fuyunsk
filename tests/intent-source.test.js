'use strict';

// 检查真实读取链路与文档契约，不冒充运行过 Codex 或迁移过用户页面。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const reader = require(path.join(skill, 'scripts/read-rules.js'));
const text = p => fs.readFileSync(path.join(root, p), 'utf8');
const ref = p => text(`skills/production-engineering/references/${p}`);

function requireRules(body, expressions) {
  for (const expression of expressions) assert.match(body, expression);
}

test('入口先读取提供源码，区分改变保留及真正需要反问的问题', () => {
  const entry = text('skills/production-engineering/SKILL.md');
  requireRules(entry, [/先读用户提供的源码/, /列目录不算已读/, /改变什么、保留什么、依据在哪/,
    /源码查明的不反问/, /暂停受影响修改/, /已明确要求直接执行/, /当前明确要求优先于默认选型/]);
  assert.ok(Buffer.byteLength(entry) <= 6000);
  assert.doesNotMatch(entry, /新建所有页面统一/);
});

for (const stage of ['只读', '小改', '实现']) {
  test(`${stage}前端一次读取同时带源码依据、选型优先级和原貌验收`, () => {
    const out = reader.readBatch(reader.parse(['--stage', stage, '--topic', '前端']));
    const frontend = out.rules.find(e => e.id === '09-00');
    assert.ok(frontend);
    assert.equal(frontend.text, ref('rules/09-00.md'), '原稿字节不能改变');
    assert.match(frontend.text, /Ant Design Vue/, '历史选型仍需可追溯');
    const policy = frontend.amendments.find(e => e.file === 'frontend-stack.md');
    assert.equal(policy.text, ref('frontend-stack.md'));
    requireRules(policy.text, [/用户当前明确要求优先/, /用户已给源码/, /不要求用户再次批准/,
      /迁移.*不是重新设计/, /已有源码足以回答时不再索要截图/, /shadcn\/ui \+ Tailwind CSS/]);
    const quality = out.references.find(e => e.file === 'frontend-interface-quality.md');
    assert.ok(quality, '批量输出须包含验收说明，不要求额外读取一层');
    requireRules(quality.text, [/迁移前源码及其可复现结果/, /不得用新截图覆盖旧基准/, /视觉一致性未验证/]);
    assert.ok(!out.references.some(e => e.file === 'project-migration.md'), '单页源码适配不能升级成整项目迁移');
  });
}

test('旧主题和编号读取也携带当前要求优先，不只修复批量入口', () => {
  for (const args of [['--topic', '前端'], ['--id', '09-00'], ['--id', '09-00', '--source', '补充稿']]) {
    const out = reader.readBatch(reader.parse(args));
    assert.ok(Array.isArray(out));
    requireRules(out.find(e => e.id === '09-00').amendments[0].text,
      [/先读取实际页面/, /新建组件文件.*不改变/, /不能暗换框架/]);
  }
});

test('无关接口读取不增加前端专项或新调度轮次', () => {
  const out = reader.readBatch(reader.parse(['--topic', '接口']));
  const expected = reader.select(reader.loadManifest(), ['10']).map(e => ({
    ...e, text: reader.content(e).toString('utf8'),
  }));
  assert.deepEqual(out, expected);
});

test('通道区分没读、缺失、无法运行，不把不询问解释为自行猜测', () => {
  requireRules(ref('task-lanes.md'), [/未读、未查到、无权限、源码不完整、无法运行分别说明/,
    /用户未回复不算授权/, /外部参考源码只作行为与实现证据/, /不运行其中未知脚本/,
    /用户只要求参考部分逻辑或明确重设计时.*不反向锁死全部界面/]);
});

test('续航和整项目迁移保存源码依据与保留项，而非只记重写页面', () => {
  requireRules(ref('context-memory-continuity.md'), [/参考源码实际路径\/版本/, /允许改变项、必须保留项/,
    /已确认回答和未解决歧义/, /不能被聊天压缩成“重写页面”/]);
  const out = reader.readBatch(reader.parse(['--stage', '实现', '--topic', '整项目迁移,前端']));
  const migration = out.references.find(e => e.file === 'project-migration.md');
  requireRules(migration.text, [/用户已给源码/, /原版本和具体代码/, /HTML 换 Vue 仅是.*一例/]);
});

test('个性化模板一致，自动调用不会重新覆盖具体源码和技术要求', () => {
  const bridge = text('global-AGENTS.example.md').trim();
  const personal = text('docs/personal-custom-instructions.md').match(/```markdown\n([\s\S]*?)\n```/)[1].trim();
  assert.equal(personal, bridge);
  assert.ok(Buffer.byteLength(bridge) <= 1800);
  requireRules(bridge, [/用户已给源码先读相关实现/, /源码可查的不反问/, /关键歧义查证后再问/,
    /用户当前明确要求优先/, /仅换实现不重做设计/, /普通问候/]);
});

test('安装验收区分实际模型行为与静态规则检查', () => {
  requireRules(text('README.md'), [/先读、按要求改/, /不能保证模型实际逐次服从/]);
  requireRules(text('docs/ai-installation.md'), [/原样迁移专项验收/, /源码遵循与原貌验收未验证/]);
});
