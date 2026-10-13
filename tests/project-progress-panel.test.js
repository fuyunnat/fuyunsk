'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const skill = path.resolve(__dirname, '../skills/production-engineering');
const { parseWorkflow } = require(path.join(skill, 'scripts/progress-parser'));
const { registerProjects, readProject, createPanelServer, parseArgs } = require(path.join(skill, 'scripts/progress-panel'));
const { planBatch } = require(path.join(skill, 'scripts/rule-batch'));
const fixture = () => fs.mkdtempSync(path.join(os.tmpdir(), 'progress-panel-'));

test('按任务解析六种状态，代码块示例不计进度，取消不是完成', () => {
  const tasks = parseWorkflow('# 工作流程\n## 任务：A — 第一项\n当前项：W002；下一步：验证\n- [x] W001【已完成】实现；证据：局部检查\n- [ ] W002【进行中】验证\n- [ ] W003【待验证】页面\n- [ ] W004【阻塞】缺接口\n- [ ] W005【已取消】取消\n- [ ] W006【待做】交付\n```markdown\n- [x] FAKE【已完成】示例\n```\n## 任务：B — 第二项\n- [ ] B001【待做】另一任务');
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].id, 'A');
  assert.equal(tasks[0].items.length, 6);
  assert.deepEqual(tasks[0].counts, { total: 6, eligible: 5, completed: 1, pending: 1, running: 1, verifying: 1, blocked: 1, cancelled: 1, deferred: 0, unknown: 0 });
  assert.equal(tasks[0].current, 'W002');
});

test('同编号冲突和勾选矛盾不给假完成，规划表保留完整分母', () => {
  const tasks = parseWorkflow('## 任务：T — 迁移\n| ID | 能力 | 验收 | 状态 |\n| --- | --- | --- | --- |\n| P001 | 登录 | 真实流程 | 待做 |\n| P002 | 支付 | 回调 | 已完成 |\n- [x] W001【待做】矛盾\n- [x] W002【已完成】第一次\n- [ ] W002【阻塞】实际失败\n- [ ] W003【已完成】尚未勾选');
  assert.equal(tasks[0].counts.total, 5);
  assert.equal(tasks[0].counts.completed, 1);
  assert.equal(tasks[0].counts.blocked, 1);
  assert.equal(tasks[0].counts.verifying, 2);
  assert.ok(tasks[0].warnings.length >= 3);
});

test('截图同形的旧阶段状态和当前目标可读，退出本轮不等于取消或完成', () => {
  const [task] = parseWorkflow('## 稳定版本官方回迁\n- 当前目标（四组已验收收尾）：四组已验；其余不做\n- 禁改/禁止：业务库不动\n- [ ] FIX-AUDIT【本轮不实施】剩余不在本轮\n- [x] FIX-IMPLEMENT【本批已实施，停止新增】实现结束\n- [x] FIX-VERIFY【本批证据已核对】隔离证据\n- [x] FIX-FINAL【本批已收尾，保留未提交成果】收尾结束\n- [x] INV-REMAINING【盘点已完成，非完整语义审查】仅盘点\n- [x] REVIEW-118【已完成／只读审查】只读结束');
  assert.equal(task.goal, '四组已验；其余不做');
  assert.equal(task.constraints, '业务库不动');
  assert.equal(task.counts.completed, 5);
  assert.equal(task.counts.deferred, 1);
  assert.equal(task.counts.cancelled, 0);
  assert.equal(task.counts.eligible, 5);
  assert.deepEqual(task.warnings, []);
  assert.equal(task.items[4].recordedStatus, '盘点已完成，非完整语义审查');
});

test('兼容明确验收范围，但未知标签和勾选矛盾仍不能冒充完成', () => {
  const [task] = parseWorkflow('## 任务：A — 验证\n- [x] A01【已完成隔离验收】本地mock\n- [x] A02【已完成静态验证】只编译\n- [x] A03【已完成但未验证】不能完成\n- [ ] A04【已完成隔离验收】没勾选\n- [ ] A05【本轮不做】范围外\n- [x] A06【本轮不做】勾选矛盾');
  assert.equal(task.counts.completed, 2);
  assert.equal(task.counts.deferred, 2);
  assert.equal(task.counts.verifying, 2);
  assert.equal(task.counts.eligible, 4);
  assert.ok(task.warnings.some(w => w.includes('A03')));
  assert.ok(task.warnings.some(w => w.includes('A04')));
  assert.ok(task.warnings.some(w => w.includes('A06')));
  assert.equal(task.items[0].recordedStatus, '已完成隔离验收');
});

test('多项目固定绝对根且去重，缺清单不创建、不读取其他文件', () => {
  const a = fixture(), b = fixture();
  fs.writeFileSync(path.join(a, '工作流程.md'), '## 任务：A — 甲\n- [ ] W001【进行中】写代码');
  fs.writeFileSync(path.join(a, '.env'), 'PASSWORD=must-not-read');
  const projects = registerProjects([{ name: '甲', root: a }, { name: '乙', root: b }]);
  assert.equal(readProject(projects[0]).tasks[0].id, 'A');
  assert.equal(readProject(projects[1]).status, 'missing');
  assert.ok(!fs.existsSync(path.join(b, '工作流程.md')));
  assert.ok(!JSON.stringify(readProject(projects[0])).includes('must-not-read'));
  assert.throws(() => registerProjects([{ root: a }, { root: a }]), /重复/);
  assert.throws(() => registerProjects([{ root: 'relative' }]), /绝对/);
});

test('符号链接清单与项目根替换不能跨项目读取', () => {
  const a = fixture(), b = fixture();
  fs.writeFileSync(path.join(b, 'secret.md'), 'private');
  fs.symlinkSync(path.join(b, 'secret.md'), path.join(a, '工作流程.md'));
  const registered = registerProjects([{ root: a }])[0];
  assert.equal(readProject(registered).status, 'error');
  fs.renameSync(a, a + '-old'); fs.symlinkSync(b, a);
  assert.equal(readProject(registered).status, 'error');
});

test('真实 HTTP 只绑定本机、拒绝写入/外部来源/未知路径，文件更新后重新读取', async t => {
  const a = fixture();const file = path.join(a, '工作流程.md');
  const original = '## 任务：A — 当前\n- [ ] W001【进行中】开发';fs.writeFileSync(file, original);
  const server = createPanelServer(registerProjects([{ name: '项目', root: a }]));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  assert.equal(server.address().address, '127.0.0.1');
  const base = `http://127.0.0.1:${server.address().port}`;
  let res = await fetch(base + '/api/projects');assert.equal(res.status, 200);
  let data = await res.json();assert.equal(data.projects[0].tasks[0].counts.running, 1);
  assert.ok(data.projects[0].updatedAt);
  assert.equal((await fetch(base + '/api/projects', { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/api/projects', { headers: { Origin: 'https://evil.example' } })).status, 403);
  const badHostStatus = await new Promise((resolve, reject) => {
    const request = http.get(base + '/api/projects', { headers: { Host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); }); request.on('error', reject);
  });
  assert.equal(badHostStatus, 403);
  assert.equal((await fetch(base + '/api/projects?path=.env')).status, 400);
  assert.equal((await fetch(base + '/.env')).status, 404);
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  const updated = original.replace('[ ] W001【进行中】', '[x] W001【已完成隔离验收】') + '\n当前目标（本轮）：只验隔离流程\n- [ ] W002【本轮不实施】以后再做';
  fs.writeFileSync(file, updated);
  data = await (await fetch(base + '/api/projects')).json();
  const task = data.projects[0].tasks[0];
  assert.equal(task.counts.completed, 1);assert.equal(task.counts.deferred, 1);assert.equal(task.counts.eligible, 1);
  assert.equal(task.goal, '只验隔离流程');assert.equal(task.items[0].recordedStatus, '已完成隔离验收');assert.deepEqual(task.warnings, []);
  assert.equal(fs.readFileSync(file, 'utf8'), updated);
  res = await fetch(base);assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(await res.text(), /AI 工作进度/);
});

test('工程面板默认检查，规则读取本身不启动服务、不加第二套任务状态', () => {
  const view = planBatch('只读', ['进度面板']);assert.ok(view.references.includes('workflow-progress-panel.md'));
  const ordinary = planBatch('小改', ['内容']);assert.ok(ordinary.references.includes('workflow-progress-panel.md'));
  const rules = fs.readFileSync(path.join(skill, 'references/workflow-progress-panel.md'), 'utf8');
  for (const phrase of ['工作流程.md', '不再自动检查或启动面板', '不是 AI 内部实时状态', '同一实际项目', '不创建第二套']) assert.ok(rules.includes(phrase), phrase);
  assert.deepEqual(parseArgs(['--project', '甲=/tmp/a', '--project', '/tmp/b', '--port', '4510']).projects, [{ name: '甲', root: '/tmp/a' }, { root: '/tmp/b' }]);
  assert.throws(() => parseArgs(['--host', '0.0.0.0']), /未知/);
});


test('面板读规则能从短入口和调度到达，资产齐全且没有 HTML 插入', () => {
  for (const file of ['SKILL.md', 'references/routing.md', 'references/workflow-checklist.md']) assert.ok(fs.readFileSync(path.join(skill, file), 'utf8').includes('workflow-progress-panel.md'), file);
  const global = fs.readFileSync(path.resolve(__dirname, '../global-AGENTS.example.md'), 'utf8'); assert.ok(global.includes('进度面板'));
  const js = fs.readFileSync(path.join(skill, 'assets/progress-panel/panel.js'), 'utf8'); assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|eval\(/);
  for (const file of ['index.html', 'panel.js', 'panel.css']) assert.ok(fs.existsSync(path.join(skill, 'assets/progress-panel', file)));
});
