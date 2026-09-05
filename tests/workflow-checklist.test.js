'use strict';

// 验证规则可到达、模板格式与旧行为；不冒充模型实际更新过用户项目。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills/production-engineering');
const refs = path.join(skill, 'references');
const reader = require(path.join(skill, 'scripts/read-rules'));
const text = file => fs.readFileSync(path.join(root, file), 'utf8');
const rules = () => text('skills/production-engineering/references/workflow-checklist.md');
const requireText = (body, expected) => expected.forEach(s => assert.ok(body.includes(s), `缺少要求：${s}`));

for (const stage of ['小改', '实现', '验证', '提交', '推送', '评审', '回滚']) {
  test(`${stage}阶段一次读取根目录清单规则，不增加另一轮读取`, () => {
    const out = reader.readBatch(reader.parse(['--stage', stage, '--topic', '内容']));
    const files = out.references.filter(e => e.file === 'workflow-checklist.md');
    assert.equal(files.length, 1);
    assert.equal(files[0].text, rules());
    assert.equal(files[0].bytes, Buffer.byteLength(rules()));
  });
}

test('只读不自动附加写清单步骤，旧接口读取内容不变', () => {
  const out = reader.readBatch(reader.parse(['--stage', '只读', '--topic', '接口']));
  assert.ok(!out.references.some(e => e.file === 'workflow-checklist.md'));
  const legacy = reader.readBatch(reader.parse(['--topic', '接口']));
  const expected = reader.select(reader.loadManifest(), ['10']).map(e => ({
    ...e, text: reader.content(e).toString('utf8'),
  }));
  assert.deepEqual(legacy, expected);
  requireText(rules(), ['只读、先讨论、不要改文件时不创建或更新', '不能由此修改业务代码', '普通聊天不创建清单']);
});

test('显式重复指定去重，缺失规则拒绝假装完整读取', () => {
  const out = reader.readBatch(reader.parse(['--stage', '小改', '--reference', 'workflow-checklist.md,workflow-checklist.md']));
  assert.equal(out.references.filter(e => e.file === 'workflow-checklist.md').length, 1);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-reference-'));
  fs.cpSync(refs, tmp, { recursive: true });
  fs.renameSync(path.join(tmp, 'workflow-checklist.md'), path.join(tmp, 'workflow-checklist.backup'));
  assert.throws(() => reader.readBatch(reader.parse(['--stage', '小改']), tmp), /ENOENT/);
});

test('空白模板只含真实未勾选事项，不冒充其他项目完成记录', () => {
  const template = text('skills/production-engineering/templates/workflow.example.md');
  assert.match(template, /^# 工作流程\n/);
  const items = [...template.matchAll(/^- \[([ x])\] (W\d+)【([^】]+)】(.+)$/gm)];
  assert.equal(items.length, 3);
  assert.equal(new Set(items.map(i => i[2])).size, items.length);
  assert.ok(items.every(i => i[1] === ' ' && i[3] === '待做'));
  requireText(template, ['目标项目根目录', '不覆盖历史', '允许改变', '必须保留', '禁止操作', '证据', '阻塞', '回滚']);
});

test('状态约定禁止提前打勾，保留失败、追加事项与用户历史', () => {
  const body = rules();
  for (const status of ['待做', '进行中', '待验证', '阻塞', '已取消']) {
    assert.match(body, new RegExp(`^- \\[ \\] W\\d+【${status}】`, 'm'));
  }
  assert.match(body, /^- \[x\] W\d+【已完成】.*证据/m);
  requireText(body, ['做完立即更新该项', '不能等全部做完才回填', '验证通过才打勾', '新增需求继续追加',
    '不重置未完成项', '不删失败和取消记录', '源码或验收变化', '父项必须等适用子项均通过', '历史或其他任务']);
});

test('根路径、同名文件、用户内容和读写权限必须查证', () => {
  requireText(rules(), ['真实工作树根目录', '多项目各自记录', '符号链接', '不能覆盖', '保留用户说明和历史',
    '无写权限时报告实际阻塞', '不能静默退回隐藏目录', '不为了隐藏它改 `.gitignore`']);
});

test('续作先读根目录且与旧快照及迁移检查共存', () => {
  requireText(rules(), ['每次继续、换会话、上下文压缩', '先读根目录当前任务区块', '不能只凭聊天回忆',
    '不维护三份互相独立的待办', '清单打勾不替代', '修改清单后旧指纹失效', '不手填成功或排除文件绕过',
    '不能预先声明成功', '无限递归提交']);
  for (const file of ['context-memory-continuity.md', 'task-lanes.md', 'project-migration.md', 'source-policy.md']) {
    assert.ok(fs.readFileSync(path.join(refs, file), 'utf8').includes('工作流程.md'), file);
  }
  requireText(text('skills/production-engineering/references/project-migration.md'), ['原 `check` / `finalize` 逐项凭据检查不变']);
});

test('入口与个性化同一短模板接入清单，小改不升级迁移程序', () => {
  const entry = text('skills/production-engineering/SKILL.md');
  const bridge = text('global-AGENTS.example.md').trim();
  const personal = text('docs/personal-custom-instructions.md').match(/```markdown\n([\s\S]*?)\n```/)[1].trim();
  assert.equal(personal, bridge);
  assert.ok(Buffer.byteLength(bridge) <= 1800);
  assert.ok(Buffer.byteLength(entry) <= 6000);
  requireText(entry, ['工作流程.md', '小改也记', '续作先读']);
  requireText(bridge, ['工作流程.md', '保留历史', '未授权只读不写']);
  const out = reader.readBatch(reader.parse(['--stage', '小改', '--topic', '内容']));
  assert.ok(!out.references.some(e => ['project-migration.md', 'context-memory-continuity.md'].includes(e.file)));
  assert.ok(!out.rules.some(e => e.id === '02-06' || e.id.startsWith('04-')));
});

test('安装只提供空模板，不把本仓库历史冒充业务项目进度', () => {
  requireText(text('docs/ai-installation.md'), ['templates/workflow.example.md', '不要把本技能仓库根目录', '只读测试不得创建清单',
    '根目录清单实际维护与恢复未验证']);
  requireText(text('README.md'), ['## 项目根目录工作流程', '工作流程.md', '换会话', '小改也记']);
});


test('目标项目根与 Codex、技能和上级仓库根明确区分', () => {
  requireText(rules(), ['正在开发的目标项目根目录', '`CODEX_HOME`', '`~/.codex/`',
    '真实工作树根目录只是定位线索', '不能机械把上级 Git 根当作当前子项目根',
    '写在目标工程', '参考源码目录默认只读', '原位迁移就写原项目根目录']);
  requireText(text('skills/production-engineering/templates/workflow.example.md'),
    ['项目根目录：', '目标项目绝对路径', '不是 Codex 或技能目录']);
});

test('入口和安装说明不把目标清单导向 Codex 配置目录', () => {
  for (const file of ['README.md', 'docs/ai-installation.md']) {
    requireText(text(file), ['目标项目根目录', '`CODEX_HOME`', '`~/.codex/`', '目标工程']);
  }
  assert.ok(text('skills/production-engineering/SKILL.md').includes('非 Codex/技能目录'));
  assert.ok(text('global-AGENTS.example.md').includes('不是 Codex/技能目录'));
});


// 这些是执行文案与读取链路回归检查，不是模型端到端的目录隔离证明。
test('清单根绑定当前聊天源文件夹，显示名和 src 子目录都不是绝对路径', () => {
  requireText(rules(), ['当前聊天所属项目关联的源文件夹', '项目名称只是显示名', '不是工程内部名为 `src/`', 'PROJECT_ROOT/工作流程.md']);
});
test('读取技能改变 cwd 不能改变业务清单根，不在全局模板锁死业务路径', () => {
  requireText(rules(), ['SKILL_DIR', '__dirname', 'PROJECT_ROOT` 不随 `cd` 改变', '不能把任一业务项目根目录写死']);
  const entry = text('skills/production-engineering/SKILL.md');
  const bridge = text('global-AGENTS.example.md');
  requireText(entry, ['当前聊天关联源文件夹', 'PROJECT_ROOT/工作流程.md']);
  requireText(bridge, ['当前聊天关联源目录', '不跨项目共用']);
});
test('多源目录和多聊天的清单隔离必须核对实际归属', () => {
  requireText(rules(), ['多个源文件夹', '不按第一个目录或显示名盲选', '重新核对绑定', '同一实际项目', '独立任务区块', '不自动把总清单移进去']);
});
test('错放清单只合并本项目记录，不删除原记录或带入其他项目', () => {
  requireText(rules(), ['先停止更新错处', '其他项目条目不得带入', '原文件不删除、不清空、不覆盖', '报告旧路径、正确路径']);
});
test('目标模式没有预先审批清单也要拆解，开始后补建不重置成果', () => {
  requireText(rules(), ['不以用户没有预先审批整份清单为由等待', '先确认方案或清单再动手', '保留正确成果，不重置任务', '不凭聊天回忆补打勾']);
});
test('中途漏项纳入完成条件但不能自行扩权，独立明确工作继续', () => {
  requireText(rules(), ['发现依据、对应目标、验收方式', '新发现的必做事项也属于完成条件', '不能靠加入清单自行授权', '其他独立、明确且已授权事项继续', '不只验收最初清单']);
});
test('安装区分维护历史与业务清单并要求两个项目实际验证', () => {
  requireText(text('docs/ai-installation.md'), ['不要把本技能仓库根目录的 `工作流程.md` 复制到技能安装目录', '项目甲的任务不得出现在项目乙', '不把静态文案测试说成已实测']);
  requireText(text('README.md'), ['只记录 fuyunsk 自身维护', '不必先逐项审批']);
});
test('同批读取携带目录隔离与动态清单而不改变原稿接口', () => {
  const out = reader.readBatch(reader.parse(['--stage', '实现', '--topic', '前端,整项目迁移']));
  const files = out.references.filter(e => e.file === 'workflow-checklist.md');
  assert.equal(files.length, 1);
  requireText(files[0].text, ['PROJECT_ROOT/工作流程.md', '目标模式与动态追加', '新旧页面对照', '真实后端联调']);
});
