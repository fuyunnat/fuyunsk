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
  assert.deepEqual(tasks[0].counts, { total: 6, eligible: 5, completed: 1, pending: 1, running: 1, verifying: 1, blocked: 1, cancelled: 1, unknown: 0 });
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
  fs.writeFileSync(file, original.replace('[ ] W001【进行中】', '[x] W001【已完成】'));
  data = await (await fetch(base + '/api/projects')).json();assert.equal(data.projects[0].tasks[0].counts.completed, 1);
  res = await fetch(base);assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(await res.text(), /AI 工作进度/);
});

test('工程面板默认检查，规则读取本身不启动服务、不加第二套任务状态', () => {
  const view = planBatch('只读', ['进度面板']);assert.ok(view.references.includes('workflow-progress-panel.md'));
  const ordinary = planBatch('小改', ['内容']);assert.ok(ordinary.references.includes('workflow-progress-panel.md'));
  const rules = fs.readFileSync(path.join(skill, 'references/workflow-progress-panel.md'), 'utf8');
  for (const phrase of ['工作流程.md', '自动检查', '不是 AI 内部实时状态', '同一实际项目', '不创建第二套']) assert.ok(rules.includes(phrase), phrase);
  assert.deepEqual(parseArgs(['--project', '甲=/tmp/a', '--project', '/tmp/b', '--port', '4510']).projects, [{ name: '甲', root: '/tmp/a' }, { root: '/tmp/b' }]);
  assert.throws(() => parseArgs(['--host', '0.0.0.0']), /未知/);
});


test('面板读规则能从短入口和调度到达，资产齐全且没有 HTML 插入', () => {
  for (const file of ['SKILL.md', 'references/routing.md', 'references/workflow-checklist.md']) assert.ok(fs.readFileSync(path.join(skill, file), 'utf8').includes('workflow-progress-panel.md'), file);
  const global = fs.readFileSync(path.resolve(__dirname, '../global-AGENTS.example.md'), 'utf8'); assert.ok(global.includes('进度面板'));
  const js = fs.readFileSync(path.join(skill, 'assets/progress-panel/panel.js'), 'utf8'); assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|eval\(/);
  for (const file of ['index.html', 'panel.js', 'panel.css']) assert.ok(fs.existsSync(path.join(skill, 'assets/progress-panel', file)));
});
