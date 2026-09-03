#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8').replace(/\r\n/g, '\n');
}

function assertFile(relPath) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    throw new Error(`Missing required file: ${relPath}`);
  }
}

function assertIncludes(relPath, phrases) {
  const content = read(relPath);
  for (const phrase of phrases) {
    if (!content.includes(phrase)) {
      throw new Error(`${relPath} is missing required phrase: ${phrase}`);
    }
  }
}

function assertNotIncludes(relPath, phrases) {
  const content = read(relPath);
  for (const phrase of phrases) {
    if (content.includes(phrase)) {
      throw new Error(`${relPath} contains forbidden phrase: ${phrase}`);
    }
  }
}

function assertMatch(relPath, pattern, message) {
  if (!pattern.test(read(relPath))) {
    throw new Error(`${relPath} ${message}`);
  }
}

function assertNoMatch(relPath, pattern, message) {
  if (pattern.test(read(relPath))) {
    throw new Error(`${relPath} ${message}`);
  }
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseSkillFrontmatter() {
  const content = read('skills/production-engineering/SKILL.md');
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    throw new Error('SKILL.md is missing valid YAML frontmatter');
  }

  const fields = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([a-z_]+):\s*(.+)$/);
    if (field) {
      fields[field[1]] = unquote(field[2]);
    }
  }
  return { content, fields };
}

function getQuotedYamlValue(content, key) {
  const match = content.match(new RegExp(`^\\s*${key}:\\s*(["'][^"']*["'])\\s*$`, 'm'));
  if (!match) {
    throw new Error(`agents/openai.yaml is missing quoted field: ${key}`);
  }
  return unquote(match[1]);
}

function assertFileBudget(relPath, maxLines, maxBytes) {
  const content = read(relPath);
  const lines = content.endsWith('\n') ? content.split('\n').length - 1 : content.split('\n').length;
  const bytes = Buffer.byteLength(content, 'utf8');
  if (lines > maxLines || bytes > maxBytes) {
    throw new Error(
      `${relPath} exceeds progressive-disclosure budget: ${lines}/${maxLines} lines, ${bytes}/${maxBytes} bytes`,
    );
  }
}

function assertFileFloor(relPath, minLines, minBytes) {
  const content = read(relPath);
  const lines = content.endsWith('\n') ? content.split('\n').length - 1 : content.split('\n').length;
  const bytes = Buffer.byteLength(content, 'utf8');
  if (lines < minLines || bytes < minBytes) {
    throw new Error(
      `${relPath} appears truncated: ${lines}/${minLines} minimum lines, ${bytes}/${minBytes} minimum bytes`,
    );
  }
}

function assertCombinedBudget(relPaths, maxBytes) {
  const bytes = relPaths.reduce((total, relPath) => total + Buffer.byteLength(read(relPath), 'utf8'), 0);
  if (bytes > maxBytes) {
    throw new Error(`Always-loaded guidance exceeds budget: ${bytes}/${maxBytes} bytes`);
  }
}

function assertNodeCommand(relPath, args = []) {
  const result = spawnSync(process.execPath, [path.join(root, relPath), ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `${relPath} ${args.join(' ')} failed:\n${(result.stderr || result.stdout || '').trim()}`,
    );
  }
}

const requiredFiles = [
  'README.md',
  'AGENTS.md',
  'global-AGENTS.example.md',
  'docs/ai-installation.md',
  'docs/personal-custom-instructions.md',
  '.gitignore',
  'tests/routing-cases.json',
  'scripts/validate-routing-cases.js',
  'scripts/validate-repository-hygiene.js',
  'scripts/validate-task-state.js',
  'skills/production-engineering/SKILL.md',
  'skills/production-engineering/agents/openai.yaml',
  'skills/production-engineering/scripts/task-state.js',
  'skills/production-engineering/scripts/task-state-core.js',
  'skills/production-engineering/references/code-risk-review.md',
  'skills/production-engineering/references/content-writing-quality.md',
  'skills/production-engineering/references/context-memory-continuity.md',
  'skills/production-engineering/references/frontend-interface-quality.md',
  'skills/production-engineering/references/wrapped-workspace-ui.md',
  'skills/production-engineering/references/project-understanding.md',
  'skills/production-engineering/references/routing.md',
  'skills/production-engineering/references/task-lanes.md',
  'skills/production-engineering/references/full-production-engineering.md',
];

for (const relPath of requiredFiles) {
  assertFile(relPath);
}

assertFileBudget('global-AGENTS.example.md', 80, 9_000);
assertFileBudget('skills/production-engineering/SKILL.md', 80, 9_000);
assertFileBudget('skills/production-engineering/references/routing.md', 120, 12_000);
assertFileBudget('skills/production-engineering/references/task-lanes.md', 240, 20_000);
assertFileBudget('skills/production-engineering/references/context-memory-continuity.md', 200, 15_000);
assertFileBudget('skills/production-engineering/references/wrapped-workspace-ui.md', 360, 30_000);
assertFileBudget('skills/production-engineering/scripts/task-state.js', 600, 24_000);
assertFileBudget('skills/production-engineering/scripts/task-state-core.js', 600, 20_000);
assertFileFloor('skills/production-engineering/references/full-production-engineering.md', 1_800, 100_000);
assertCombinedBudget([
  'global-AGENTS.example.md',
  'skills/production-engineering/SKILL.md',
  'skills/production-engineering/references/routing.md',
  'skills/production-engineering/references/task-lanes.md',
], 38_000);

const { content: skillContent, fields: skillFields } = parseSkillFrontmatter();
if (skillFields.name !== 'production-engineering') {
  throw new Error('SKILL.md frontmatter name must be production-engineering');
}

const description = skillFields.description || '';
if (description.length < 160 || description.length > 480) {
  throw new Error(`SKILL.md description length must be 160-480 characters; got ${description.length}`);
}
for (const phrase of ['real software project', 'current-diff verification', 'plain-language', 'generic programming explanations', 'Do not use']) {
  if (!description.includes(phrase)) {
    throw new Error(`SKILL.md description is missing routing boundary: ${phrase}`);
  }
}

const referencedFiles = new Set(
  [...skillContent.matchAll(/`(references\/[a-z0-9-]+\.md)`/g)].map((match) => match[1]),
);
if (referencedFiles.size < 8) {
  throw new Error(`SKILL.md should route to all maintained references; found ${referencedFiles.size}`);
}
for (const relPath of referencedFiles) {
  assertFile(path.join('skills/production-engineering', relPath));
}

const openaiYaml = read('skills/production-engineering/agents/openai.yaml');
assertMatch(
  'skills/production-engineering/agents/openai.yaml',
  /^\s*allow_implicit_invocation:\s*true\s*$/m,
  'must keep policy.allow_implicit_invocation enabled',
);
const defaultPrompt = getQuotedYamlValue(openaiYaml, 'default_prompt');
if (!defaultPrompt.includes('$production-engineering') || !/plain language/i.test(defaultPrompt)) {
  throw new Error('agents/openai.yaml default_prompt must name the skill and request plain-language delivery');
}
const shortDescription = getQuotedYamlValue(openaiYaml, 'short_description');
if (shortDescription.length < 25 || shortDescription.length > 64) {
  throw new Error(
    `agents/openai.yaml short_description length must be 25-64 characters; got ${shortDescription.length}`,
  );
}

assertIncludes('skills/production-engineering/SKILL.md', [
  'name: production-engineering',
  '已使用 $production-engineering，并已读取 SKILL.md / routing.md',
  'Move deletions to the system trash/recycle bin',
  'Beginner-First Communication',
  'A request to change code authorizes local scoped edits and verification',
  'what changed, whether it was verified, whether it was saved remotely',
  'Ordinary users should be able to state the goal without naming the skill',
  'Continuity Bootstrap',
  'first engineering turn in every conversation',
  'task-state helper',
  'Validate the current diff',
  'Keep responsibility boundaries explicit',
  'registered descendants only',
  'A negative result does not require loading the full continuity reference',
  'Evolve existing database schemas and data compatibly by default',
  'task-lanes.md`; it is authoritative',
  'Use the cheapest lane',
  'detailed workflow text should have one canonical owner',
  'references/routing.md',
  'references/task-lanes.md',
  'references/content-writing-quality.md',
  'references/code-risk-review.md',
  'references/context-memory-continuity.md',
  'references/frontend-interface-quality.md',
  'references/project-understanding.md',
  'references/full-production-engineering.md',
]);

assertIncludes('skills/production-engineering/references/routing.md', [
  'Beginner-First Interaction',
  '“改一下 / 修一下 / 做一个”',
  '“保存好 / 留个恢复点 / 别丢了”',
  '“上传仓库 / 提交到仓库 / 同步 GitHub / 别只放本地”',
  '“开 PR / 提交审核 / 准备合并”',
  '“搞到主线 / 合并到主库 / 正式用这个版本”',
  'This does not authorize push',
  'Bug And Risk Review Routing',
  'Context Memory Workflow',
  'first engineering turn in a conversation',
  'scripts/task-state.js resume',
  'A negative result does not require loading `context-memory-continuity.md`',
  'provided helper',
  'Built-in memories are secondary hints',
  'Content Writing Quality Workflow',
  'Project Understanding Workflow',
  'Execution Cost Control Workflow',
  'Start by trying to prove the task fits quick lane',
  'avoid task-state/PR/CI/full-spec overhead',
  'Responsibility Boundary Workflow',
  'Do not keep appending unrelated features to the current file',
  'task-lanes.md` is authoritative',
  'cannot reclassify a task or expand authorization',
  'code-risk-review.md',
  'content-writing-quality.md',
  'context-memory-continuity.md',
  'project-understanding.md',
  'task-lanes.md',
  'remote overlay in `task-lanes.md`',
  'frontend-interface-quality.md',
  'wrapped-workspace-ui.md',
  'framework-neutral shell contract',
]);

assertIncludes('skills/production-engineering/references/project-understanding.md', [
  'Project Understanding',
  'architecture teardown',
  'read-only by default',
  'Do not create `architecture.md`',
  'Confirmed',
  'Reasonable inference',
  'Unknown',
  'Next check',
  'Do not copy third-party skill text wholesale',
]);

assertIncludes('skills/production-engineering/references/content-writing-quality.md', [
  'Content Writing Quality',
  'README files',
  'Apply this proactively',
  'AI-style writing',
  'Self-referential phrasing',
  'README And Repository Documentation',
  'Technical And Customer-Facing Notes',
  'PR Descriptions And Release Notes',
  'UI And Admin Copy',
  'Final Check',
]);

assertIncludes('skills/production-engineering/references/code-risk-review.md', [
  'Code Risk Review',
  '有没有问题',
  '帮我看看代码',
  'Duplicate requests',
  'Concurrency',
  'Authentication',
  'Timeout',
  'Exception handling',
  'Sensitive information leakage',
]);

assertIncludes('skills/production-engineering/references/context-memory-continuity.md', [
  'Context Memory Continuity',
  'TencentDB Agent Memory',
  'work/task-state.md',
  'first engineering turn in each conversation',
  'A negative resume result alone does not require loading this file',
  'only when it is already ignored',
  '$CODEX_HOME/task-states/index/',
  'A legacy `index.json` is read for compatibility but is not rewritten',
  'New-Conversation Resume Bootstrap',
  'scripts/task-state.js resume',
  'A substantial read-only plan',
  'An old task snapshot does not satisfy the requirement',
  'Automatic State Transitions',
  'checkpoint against lost context',
  'Write Frequency',
  'Do not rewrite state after every tiny edit',
  'Task status: active, blocked, or complete',
  'Implementation status: not started, in progress, or complete',
  'Verification status: pending, passed, failed, or unavailable',
  'The user does not need to ask it to change task state',
  '"Tested" only describes an attempted action',
  'Do not rewrite it for every small edit or test retry',
  'Task state counts as maintained only when',
  'Task-State Helper',
  '`init` refuses to overwrite a different active task',
  '`update` cannot directly set task/implementation state to complete',
  '`run` executes one validation command without a shell',
  'including untracked file content',
  '`check` automatically invalidates a passing result',
  'returns failure until implementation is complete',
  '`finalize` succeeds only when implementation is complete',
  'Layered Memory Model',
  'Progressive Disclosure',
  'Traceability',
  'External Memory Systems',
  'Do not install, start, configure, or call any external memory server',
  'Built-in Codex Memories may carry useful context',
]);

assertIncludes('skills/production-engineering/references/frontend-interface-quality.md', [
  'Frontend Interface Quality',
  'Vercel',
  'Icon-only buttons',
  'Do not use clickable `div` or `span`',
  'Do not put multiple independent workflows into one `.vue` file',
  'Never block paste',
  'Do not use `transition: all`',
  'Large lists and tables',
  'Vue 3 + Vite + Ant Design Vue',
]);

assertIncludes('skills/production-engineering/references/wrapped-workspace-ui.md', [
  '参考图提炼',
  '多面板桌面工作台',
  '表面层级、内容宽度和信息密度',
  '框架中立的实现契约',
  '不指定 Vue、React、Svelte、CSS 方案或组件库',
  '桌面壳层模式',
  '窄列详情',
  '内容边界',
  '滚动、调整大小和状态稳定性',
  'reduced-motion',
  'Footer 左右内容与工作区边缘对齐',
]);

assertIncludes('skills/production-engineering/references/task-lanes.md', [
  'Execution Cost Control',
  'authoritative for lane selection',
  'must not reclassify the lane, expand authorization',
  'Do not weaken hard gates',
  'Fast-First Default',
  'Start cheap, then escalate only when evidence requires it',
  'Objective Lane Table',
  'Answer-only',
  'Tiny fixes stay quick',
  'no Git, task-state, validation, or full-spec load',
  'quick README/docs/copy/style tweak',
  'Quick lane',
  'A genuinely single-step change touching at most one source-code file may skip task state',
  'Standard implementation lane',
  'Before the first source-code edit',
  'Full lane',
  'For implementation writes, read `context-memory-continuity.md`',
  'bounded project/workspace discovery',
  'Existing database fields and historical data',
  'Responsibility/file-boundary check',
  'do not create a large mixed-responsibility file',
  'one clear final commit per user task',
  'one clear final commit per user goal',
  'Do not rewrite it after every small edit',
  'Remote Delivery Overlay',
  'Local implementation does not authorize remote push',
  'A routine commit, task-branch push, or review request with no implementation change still does not require new state',
  'Do not assume every Git remote is GitHub',
  'Project understanding lane',
  'project-understanding.md',
  'Content writing lane',
  'Escalation',
  'Ordinary phrases such as "稳一点" or "别出问题"',
  'Verification Matrix',
  'node scripts/validate-skill.js',
  'task-state helper self-tests',
]);

assertIncludes('README.md', [
  'production-engineering',
  '你只需要怎么说',
  '“改一下”“修一下”“做一个”',
  '“保存好”“留个恢复点”“别丢了”',
  '“上传仓库”“提交到仓库”“别只放本地”',
  '“搞到主线”“合并到主库”“正式用这个版本”',
  'allow_implicit_invocation: true',
  '$HOME/.agents/skills',
  '不能在两个目录重复安装',
  '日常使用不应要求用户每次手动写 skill 名称',
  'content-writing-quality.md',
  'project-understanding.md',
  'task-lanes.md',
  'answer-only、read-only、tiny、quick、standard、full',
  '客观判定表',
  '完整规范继续保留全部详细规则',
  '小任务先走轻量通道',
  '任务状态只做断点检查点',
  '避免明显的 AI 味',
  '只会查询 Codex 本地索引中登记的下级项目',
  '不遍历目录树或整台机器',
  'task-state-core.js',
  '未跟踪文件内容也计入 Git 指纹',
  '禁止普通状态更新绕过',
  '数据库兼容演进',
  '代码组织先看职责边界',
  '不能擅自重命名、删除、复用或改变现有数据库字段',
  '主自检会自动运行路由场景检查和任务状态助手验证',
]);

assertIncludes('skills/production-engineering/references/full-production-engineering.md', [
  '### 全局文件删除策略',
  '禁止因为“当前文件正在改”',
  'Windows 必须进入资源管理器回收站',
  'work/task-state.md',
  '标准实现通道或完整通道并修改源代码时',
  '修改超过一个源代码文件',
  '仍指向上一项已完成任务的旧内容不算已经维护',
  '状态快照只在关键阶段更新',
  '任务状态：进行中、阻塞或已完成',
  '实现状态：未开始、进行中或已完成',
  '验证状态：待验证、已通过、未通过或无法验证',
  '禁止把任务总状态写成“完成/待测试”',
  '旧验证对新 diff 立即失效',
  '本地提交、远端保存和正式合并必须分开授权',
  '修改代码只授权本地范围内的实现和验证，不自动授权远端写入',
  '只有用户要求远端保存时才推送任务分支',
  '用户要求审核时才创建或更新评审请求',
  '只做本地修改时可以使用已确认的本地稳定点',
  '一个任务默认一个最终提交',
  '稳定检查点提交',
  '避免主线 commit 数膨胀',
  '### 默认采用兼容演进，不做一刀切替换',
  '扩展 → 迁移 → 切换 → 清理',
  '禁止无条件全表覆盖',
  '无法做到向后兼容',
  'Vue 3 + Vite',
  'Ant Design Vue',
  '普通 `.vue` / `.js`',
  '默认先尝试证明任务可以轻量完成',
  '反复重写任务状态',
  '防止上下文丢失的检查点',
]);

assertIncludes('AGENTS.md', [
  '本仓库只维护自家的 `production-engineering` skill',
  '不要引入、复制或依赖 Ponytail 等第三方 skill',
  '保持 `SKILL.md` 精简',
  'node scripts/validate-skill.js',
  '`validate-skill.js` 必须自动运行路由场景和任务状态助手验证',
  '`task-state-core.js` 负责状态发现、指纹和持久化',
  '数据库兼容演进',
  '不提交 `work/`',
  '只有用户明确要求远端保存时才推送任务分支',
]);

assertIncludes('global-AGENTS.example.md', [
  '$production-engineering',
  '写操作硬门禁',
  '已使用 $production-engineering，并已读取 SKILL.md / routing.md',
  '“改一下、修一下、做一个”只授权本地修改和验证',
  '只有用户同时说“上传仓库、提交到仓库、同步 GitHub、别只放本地”时，才推送任务分支',
  '日常使用不应要求用户手动写 `$production-engineering`',
  '每个新对话的第一个工程请求',
  '有边界的恢复检查',
  '默认先判断是否可以走轻量通道',
  '任务状态是断点检查点',
  '不扫描磁盘',
  '没有未完成状态时不必只为恢复检查加载完整续航文档',
  'work/task-state.md',
  '内置 Memories 只作辅助线索',
  '当前 diff 验证通过后才能完成',
  'Skill 不可用、未读取或无法确认接管时，停止写操作',
  '禁止使用 `rm`',
  '不得擅自重命名、删除、复用或改变已有数据库字段',
  '职责边界与文件拆分',
  '禁止因为当前正在改某个文件',
  '新增兼容结构、分批回填、新旧并存、受控切换和可回滚迁移',
  '禁止编造测试、验证、提交、推送、评审、合并、部署、CI、审计或线上结果',
]);

assertIncludes('docs/ai-installation.md', [
  'https://github.com/fuyunnat/fuyunsk/tree/main/skills/production-engineering',
  '$skill-installer',
  'OpenAI 当前文档列出 `$HOME/.agents/skills`',
  '不得在 `.agents/skills` 和 `.codex/skills` 各装一份',
  '不要照抄其他人的 `/Users/...`',
  'content-writing-quality.md',
  'task-lanes.md',
  'scripts/task-state.js',
  'scripts/task-state-core.js',
  'docs/personal-custom-instructions.md',
  'allow_implicit_invocation',
  '把其中的 `<SKILL_DIR>` 替换成第 2 步确认的实际完整目录',
  '默认先判断轻量通道',
  '任务状态只在关键阶段更新',
  '不要保留未替换占位符',
  '不要把两份全文重复塞进同一个位置',
  '不要要求我另开任务',
  'task-state.js self-test',
  'PROJECT_OR_WORKSPACE_PATH',
  '数据库字段和历史数据默认兼容演进',
  '职责边界和文件拆分',
  '日常使用时，用户只需要说目标',
  'Test-Path',
]);

assertIncludes('docs/personal-custom-instructions.md', [
  '$production-engineering',
  '<SKILL_DIR> 必须是安装时已经确认并替换好的',
  'OpenAI 当前文档列出的用户级根目录是 $HOME/.agents/skills',
  '不得把其他机器的 /Users/...',
  '已使用 $production-engineering，并已读取 SKILL.md / routing.md',
  '<SKILL_DIR>/SKILL.md',
  '<SKILL_DIR>/references/routing.md',
  '<SKILL_DIR>/scripts/task-state.js',
  '<SKILL_DIR>/scripts/task-state-core.js',
  '<PROJECT_OR_WORKSPACE_PATH>',
  '不扫描目录树或整台机器',
  '默认先判断能否轻量完成',
  '任务状态是断点检查点',
  '没有未完成状态时不必只为这一步加载完整续航文档',
  '内置 Memories 只作辅助线索',
  '“改一下、修一下、做一个”只授权本地修改和验证',
  '实现完成但未验证时任务仍是进行中',
  '当前 diff 的必要验证通过',
  '擅自重命名、删除、复用或改变已有数据库字段',
  '写代码前必须判断职责边界',
  '新增兼容字段、分批可重复回填、新旧结构并存、受控切换',
  '不得继续写操作',
  'Vue 3 + Vite',
  'Ant Design Vue',
]);

assertIncludes('.gitignore', ['work/']);

assertNotIncludes('skills/production-engineering/SKILL.md', [
  'Ponytail',
  'ponytail',
]);

const policyFiles = [
  'README.md',
  'AGENTS.md',
  'global-AGENTS.example.md',
  'docs/ai-installation.md',
  'docs/personal-custom-instructions.md',
  'skills/production-engineering/SKILL.md',
  'skills/production-engineering/references/context-memory-continuity.md',
  'skills/production-engineering/references/full-production-engineering.md',
  'skills/production-engineering/references/routing.md',
  'skills/production-engineering/references/task-lanes.md',
];

const forbiddenLegacyPhrases = [
  '用户说“提交代码”“提交到仓库”时，默认只代表提交并推送任务分支',
  '一个用户任务通常一个任务分支、一个 PR、一个清晰最终提交',
  '### 3. 提交后必须推送到 GitHub 任务分支',
  '完整通道的普通低中风险任务在预检通过后可以按本规范自动推送任务分支',
  '最稳方式是在任务里显式写 `$production-engineering`',
  'For the most reliable use, invoke this skill explicitly with `$production-engineering`',
  '空仓库首次创建主分支、用户明确要求提交线上仓库时除外',
  'git remote -v',
  '创建任务分支前必须获取远端最新引用，并记录实际稳定点 commit；禁止不看远端状态直接在过期本地主线上开发。',
  '只有长任务、跨阶段任务、部署/交接任务或存在上下文丢失风险时，才额外维护任务状态快照',
  'Maintain `work/task-state.md` or an equivalent ignored state file for long, multi-stage, deployment, handoff, or context-loss-prone tasks.',
];

for (const relPath of policyFiles) {
  assertNotIncludes(relPath, forbiddenLegacyPhrases);
  assertNoMatch(
    relPath,
    /\/Users\/fuyun|C:\\\\Users\\\\fuyun/i,
    'contains a machine-specific user path',
  );
}

assertNoMatch(
  'skills/production-engineering/references/full-production-engineering.md',
  /完整通道[^\n]{0,100}(?:自动|必须)推送任务分支/,
  'must not make task-branch push an automatic full-lane side effect',
);
assertNoMatch(
  'skills/production-engineering/references/full-production-engineering.md',
  /GitHub 单文件限制|GitHub Releases|自动点击 GitHub Merge/,
  'must not assume GitHub-specific hosting behavior',
);
assertIncludes('skills/production-engineering/references/full-production-engineering.md', [
  '实际托管平台单文件限制',
  '托管平台的发布区',
  '未经明确授权不得操作托管平台的合并按钮',
]);

assertNodeCommand('scripts/validate-routing-cases.js');
assertNodeCommand('scripts/validate-repository-hygiene.js');
assertNodeCommand('scripts/validate-task-state.js');

console.log('production-engineering skill validation passed');
