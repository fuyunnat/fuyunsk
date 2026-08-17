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
  'skills/production-engineering/references/context-memory-continuity.md',
  'skills/production-engineering/references/frontend-interface-quality.md',
  'skills/production-engineering/references/routing.md',
  'skills/production-engineering/references/full-production-engineering.md',
];

for (const relPath of requiredFiles) {
  assertFile(relPath);
}

assertIncludes('skills/production-engineering/SKILL.md', [
  'name: production-engineering',
  'Use automatically',
  'implement',
  'fix',
  'debug',
  'admin pages',
  '后台页面',
  'Move deletions to the system trash/recycle bin',
  'references/routing.md',
  'references/code-risk-review.md',
  'references/context-memory-continuity.md',
  'references/frontend-interface-quality.md',
  'references/full-production-engineering.md',
]);

assertIncludes('skills/production-engineering/references/routing.md', [
  'Bug Report Workflow',
  'Code Risk Review Workflow',
  'Context Memory Workflow',
  'code-risk-review.md',
  'context-memory-continuity.md',
  'Admin Frontend Default',
  'frontend-interface-quality.md',
  'Vue 3 + Vite',
  'Ant Design Vue',
  'ordinary `.vue` / `.js`',
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

assertIncludes('skills/production-engineering/references/full-production-engineering.md', [
  '### 全局文件删除策略',
  'Windows 必须进入资源管理器回收站',
  'work/task-state.md',
  '用户说“提交代码”“提交到仓库”时，默认只代表提交并推送任务分支',
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
]);

assertIncludes('global-AGENTS.example.md', [
  '$production-engineering',
  '写操作硬门禁',
  '空值、重复请求、并发、权限、超时、异常处理和敏感信息泄露',
  'work/task-state.md',
  '不得默认安装、启动、调用或通过外部记忆系统',
  '禁止使用 `rm`',
  '禁止把未经验证的功能、测试、部署、推送、CI 或生产状态说成已经完成',
]);

assertIncludes('docs/ai-installation.md', [
  'https://github.com/fuyunnat/fuyunsk/tree/main/skills/production-engineering',
  'docs/personal-custom-instructions.md',
  '不要引入 Ponytail',
  '以后我是否还需要每次手动写 `$production-engineering`',
]);

assertIncludes('docs/personal-custom-instructions.md', [
  '$production-engineering',
  '~/.codex/skills/production-engineering/SKILL.md',
  '~/.codex/skills/production-engineering/references/routing.md',
  '~/.codex/skills/production-engineering/references/code-risk-review.md',
  '~/.codex/skills/production-engineering/references/context-memory-continuity.md',
  '必须停止写操作',
  'Vue 3 + Vite',
  'Ant Design Vue',
]);

assertIncludes('.gitignore', ['work/']);

assertNotIncludes('skills/production-engineering/SKILL.md', [
  'Ponytail',
  'ponytail',
]);

console.log('production-engineering skill validation passed');
