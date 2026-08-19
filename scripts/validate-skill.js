#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

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

const requiredFiles = [
  'README.md',
  'AGENTS.md',
  'global-AGENTS.example.md',
  'docs/ai-installation.md',
  'docs/personal-custom-instructions.md',
  '.gitignore',
  'skills/production-engineering/SKILL.md',
  'skills/production-engineering/agents/openai.yaml',
  'skills/production-engineering/references/code-risk-review.md',
  'skills/production-engineering/references/content-writing-quality.md',
  'skills/production-engineering/references/context-memory-continuity.md',
  'skills/production-engineering/references/frontend-interface-quality.md',
  'skills/production-engineering/references/project-understanding.md',
  'skills/production-engineering/references/routing.md',
  'skills/production-engineering/references/task-lanes.md',
  'skills/production-engineering/references/full-production-engineering.md',
];

for (const relPath of requiredFiles) {
  assertFile(relPath);
}

assertFileBudget('skills/production-engineering/SKILL.md', 100, 12_000);
assertFileBudget('skills/production-engineering/references/routing.md', 200, 20_000);
assertFileBudget('skills/production-engineering/references/task-lanes.md', 240, 20_000);

const { content: skillContent, fields: skillFields } = parseSkillFrontmatter();
if (skillFields.name !== 'production-engineering') {
  throw new Error('SKILL.md frontmatter name must be production-engineering');
}

const description = skillFields.description || '';
if (description.length < 180 || description.length > 520) {
  throw new Error(`SKILL.md description length must be 180-520 characters; got ${description.length}`);
}
for (const phrase of ['software', 'verification', 'rollback', 'plain-language', 'Do not use']) {
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
  'Bug Report Workflow',
  'Code Risk Review Workflow',
  'Context Memory Workflow',
  'Content Writing Quality Workflow',
  'Project Understanding Workflow',
  'Execution Cost Control Workflow',
  'code-risk-review.md',
  'content-writing-quality.md',
  'context-memory-continuity.md',
  'project-understanding.md',
  'task-lanes.md',
  'remote delivery overlay',
  'Admin Frontend Default',
  'frontend-interface-quality.md',
  'Vue 3 + Vite',
  'Ant Design Vue',
  'ordinary `.vue` / `.js`',
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
  'only when it is already ignored',
  'Do not rewrite it for every small edit or test retry',
  'Layered Memory Model',
  'Progressive Disclosure',
  'Traceability',
  'External Memory Systems',
  'Do not install, start, configure, or call any external memory server',
]);

assertIncludes('skills/production-engineering/references/frontend-interface-quality.md', [
  'Frontend Interface Quality',
  'Vercel',
  'Icon-only buttons',
  'Do not use clickable `div` or `span`',
  'Never block paste',
  'Do not use `transition: all`',
  'Large lists and tables',
  'Vue 3 + Vite + Ant Design Vue',
]);

assertIncludes('skills/production-engineering/references/task-lanes.md', [
  'Execution Cost Control',
  'full specification remains authoritative',
  'Do not weaken hard gates',
  'Quick lane',
  'Standard implementation lane',
  'Full lane',
  'one clear final commit per user task',
  'Remote Delivery Overlay',
  'Local implementation does not authorize remote push',
  'A routine commit, task-branch push, or review request alone does not require a state file',
  'Do not assume every Git remote is GitHub',
  'Project understanding lane',
  'project-understanding.md',
  'Content writing lane',
  'Escalation',
  'Verification Matrix',
  'node scripts/validate-skill.js',
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
  '不会删减或削弱完整规范',
  '避免明显的 AI 味',
  '简单任务少读少跑',
]);

assertIncludes('skills/production-engineering/references/full-production-engineering.md', [
  '### 全局文件删除策略',
  'Windows 必须进入资源管理器回收站',
  'work/task-state.md',
  '本地提交、远端保存和正式合并必须分开授权',
  '修改代码只授权本地范围内的实现和验证，不自动授权远端写入',
  '只有用户要求远端保存时才推送任务分支',
  '用户要求审核时才创建或更新评审请求',
  '只做本地修改时可以使用已确认的本地稳定点',
  '一个任务默认一个最终提交',
  '稳定检查点提交',
  '避免主线 commit 数膨胀',
  'Vue 3 + Vite',
  'Ant Design Vue',
  '普通 `.vue` / `.js`',
]);

assertIncludes('AGENTS.md', [
  '本仓库只维护自家的 `production-engineering` skill',
  '不要引入、复制或依赖 Ponytail 等第三方 skill',
  '保持 `SKILL.md` 精简',
  'node scripts/validate-skill.js',
  '不提交 `work/`',
  '只有用户明确要求远端保存时才推送任务分支',
]);

assertIncludes('global-AGENTS.example.md', [
  '$production-engineering',
  '写操作硬门禁',
  '已使用 $production-engineering，并已读取 SKILL.md / routing.md',
  '“已完成”不是完成',
  '空值、重复请求、并发、权限、超时、异常处理和敏感信息泄露',
  '一个用户任务通常一个任务分支、一个清晰最终提交',
  '“改一下、修一下、做一个”只授权本地修改和验证',
  '只有用户同时说“上传仓库、提交到仓库、同步 GitHub、别只放本地”时，才推送任务分支',
  '用户日常只需要说目标，不应被要求每次手动写 `$production-engineering`',
  'AI 味太重',
  '内容写作质量规则',
  '项目理解规则',
  '默认主动读取',
  'work/task-state.md',
  '不得默认安装、启动、调用或通过外部记忆系统',
  '禁止使用 `rm`',
  '禁止把未经验证的功能、测试、部署、推送、CI 或生产状态说成已经完成',
]);

assertIncludes('docs/ai-installation.md', [
  'https://github.com/fuyunnat/fuyunsk/tree/main/skills/production-engineering',
  '$skill-installer',
  'OpenAI 当前文档列出 `$HOME/.agents/skills`',
  '不得在 `.agents/skills` 和 `.codex/skills` 各装一份',
  '不要照抄其他人的 `/Users/...`',
  'content-writing-quality.md',
  'task-lanes.md',
  'docs/personal-custom-instructions.md',
  'allow_implicit_invocation',
  '把其中的 `<SKILL_DIR>` 替换成第 2 步确认的实际完整目录',
  '不要保留未替换占位符',
  '不要把两份全文重复塞进同一个位置',
  '不要要求我另开任务',
  '日常使用时，用户只需要说目标',
  'Test-Path',
]);

assertIncludes('docs/personal-custom-instructions.md', [
  '$production-engineering',
  '<SKILL_DIR> 必须是安装时已经确认并替换好的',
  'OpenAI 当前文档列出的用户级根目录是 $HOME/.agents/skills',
  '不得把其他机器的 /Users/...',
  '已使用 $production-engineering，并已读取 SKILL.md / routing.md',
  '“已完成”不是完成',
  '<SKILL_DIR>/SKILL.md',
  '<SKILL_DIR>/references/routing.md',
  '<SKILL_DIR>/references/task-lanes.md',
  '<SKILL_DIR>/references/code-risk-review.md',
  '<SKILL_DIR>/references/context-memory-continuity.md',
  '<SKILL_DIR>/references/content-writing-quality.md',
  '<SKILL_DIR>/references/project-understanding.md',
  '一个用户任务通常一个任务分支、一个清晰最终提交',
  '“改一下、修一下、做一个”只授权本地修改和验证',
  '普通本地提交、任务分支推送或按要求创建评审请求',
  'AI 味太重',
  '默认主动读取',
  '必须停止写操作',
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

console.log('production-engineering skill validation passed');
