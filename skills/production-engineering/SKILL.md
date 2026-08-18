---
name: production-engineering
description: Production-grade engineering workflow for Codex. Use automatically when the user asks to implement, fix, debug, refactor, deliver, start and verify a project, inspect or modify code, understand or tear down a project, handle a bug report, error, broken page, failing API, unexpected behavior, code review, security audit, vulnerability or backdoor analysis, Git commits, branches, pushes, PRs, CI, database migrations, deployment configuration, backend work, frontend work, admin pages, README or engineering documentation, PR descriptions, release notes, admin UI copy, or any task requiring maintainable, verifiable, reversible production-quality software changes. Also use when the user says production-grade, 工程交付, 理解项目, 拆解项目, 接手项目, 看看这个仓库, 架构分析, Bug, 报错, 异常, 修复, 实现, 交付, 审计, 漏洞, 后门, 启动验证, 提交, 推送, PR, CI, README, 自述文件, 文档, 文案, AI 味, 后台页面, 管理端, 数据库, 部署, 最稳, 别出问题, or 高风险操作.
---

# Production Engineering

Use this skill to turn software work into a controlled production-grade workflow: read the real project first, choose the correct task mode, make the smallest safe change, verify honestly, and report rollback paths and residual risk.

## First Steps

1. Read `references/routing.md` first for task-mode routing.
2. Read `references/task-lanes.md` to choose read-only, quick, standard, full, frontend/UI, or context lane before deciding how much extra material to load.
3. For non-trivial engineering work, read only the relevant sections of `references/full-production-engineering.md` using heading search, not the whole file by default.
4. For code review, hidden bug hunting, vague "有没有问题/看看代码" requests, bug diagnosis, security audit, vulnerability review, or backdoor review, also read `references/code-risk-review.md`.
5. For long tasks, multi-stage development, context compaction recovery, task handoff, repeated project work, or "AI 忘记事情/上下文不见了" requests, also read `references/context-memory-continuity.md`.
6. For README files, engineering documentation, repository descriptions, installation guides, PR descriptions, release notes, customer-facing technical notes, UI copy, or "AI 味/像 AI 写的" wording concerns, also read `references/content-writing-quality.md`.
7. For frontend pages, admin pages, management consoles, configuration pages, operations dashboards, shared UI components, or UI review tasks, also read `references/frontend-interface-quality.md`.
8. For project understanding, architecture teardown, repository onboarding, or "先理解这个项目" requests, also read `references/project-understanding.md`.
9. If the user explicitly asks for the full standard, maximum rigor, or no omissions, read `references/full-production-engineering.md` directly.
10. Follow project-local `AGENTS.md`, README, package scripts, existing architecture, and user instructions when they are more specific and do not conflict with higher-priority rules.

## Operating Rules

- Default to Chinese unless the user explicitly requests another language.
- At the start of every task handled by this skill, before reading or modifying project business files, explicitly tell the user: `已使用 $production-engineering，并已读取 SKILL.md / routing.md。` Also list any extra reference files read for this task. If you cannot confirm the skill entry and required references were read, stop write operations and continue only with read-only investigation or risk explanation.
- For read-only tasks, inspect and report; do not modify files, Git, databases, remotes, or external state.
- For implementation tasks, inspect the real entrypoints, configs, dependencies, existing patterns, Git state, and user changes before editing.
- For bug reports and errors, locate the most relevant files, functions, routes, configs, logs, or call chains first; explain the likely cause, evidence, and smallest fix before broad edits.
- Before modifying files, determine whether the target is inside a Git repository. If it is not, create a timestamped backup or equivalent recovery point before overwriting existing files.
- Protect user changes. Do not revert or mix unrelated user edits into the task.
- Move deletions to the system trash/recycle bin or a recoverable backup location; do not use permanent deletion commands or APIs.
- Treat production, databases, credentials, payments, balances, orders, permissions, CI/CD, deployment, force push, direct main-branch push, and remote settings changes as high risk. Do read-only investigation first and wait for explicit confirmation before risky writes.
- Verify with the smallest command set that matches the risk: lint, typecheck, tests, build, smoke tests, page checks, API checks, migration checks, or security regression checks as applicable.
- Never claim something was tested, pushed, merged, deployed, or verified unless current evidence proves it.
- Before final output, apply first-principles review: point out flawed assumptions, factual errors, missing risk controls, and invalid acceptance criteria directly with actionable fixes.

## Invocation Reliability

For the most reliable use, invoke this skill explicitly with `$production-engineering`. Implicit invocation depends on the host application's skill matching. For repository-wide enforcement, combine this skill with the provided `global-AGENTS.example.md` or a project `AGENTS.md` that routes engineering write operations to `$production-engineering`.

## Reference Loading

Use heading searches in `references/full-production-engineering.md`:

- Execution cost control, quick/standard/full lane choice, and validation depth: read `references/task-lanes.md`.
- README, docs, release notes, PR descriptions, customer-facing notes, UI copy, and "AI 味" writing cleanup: read `references/content-writing-quality.md`.
- Project understanding, architecture teardown, codebase onboarding, and "理解项目/拆解项目/接手项目" requests: read `references/project-understanding.md`.
- Git, branches, commits, PRs, CI, rollback: search `## 三`, `## 四`, `回滚`, `CI`.
- Long tasks, task-state, context continuity, compaction recovery, handoff, and optional external memory systems: read `references/context-memory-continuity.md`, then search `上下文续航`.
- Code review, hidden bugs, bug diagnosis, vague "有没有问题/看看代码" requests, vulnerability and backdoor review: read `references/code-risk-review.md`, then search `Bug 修复前置规则`, `## 十四`, `## 十七`, `## 十九`.
- Frontend, admin pages, UI validation: read `references/frontend-interface-quality.md`, then search `## 九`.
- Backend APIs and service boundaries: search `## 八`, `## 十`.
- Database, migration, consistency: search `## 十三`, `## 十四`.
- Security audit, vulnerabilities, backdoors: search `## 十七`, `## 十九`.
- Testing and final reporting: search `## 二十`, `## 二十二`, `## 二十三`.

Load only the needed parts unless the user explicitly asks to inspect or rewrite the whole standard.
