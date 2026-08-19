---
name: production-engineering
description: "Use for software implementation, bug fixes, debugging, code or security review, Git commits/push/merge, database or deployment changes, frontend/admin pages, and engineering docs. Requires real-project inspection, scoped changes, verification, rollback, and plain-language delivery. Also matches 修复报错、实现功能、审计代码、提交仓库、后台页面或部署. Do not use for ordinary chat, translation, general writing, or non-engineering questions."
---

# Production Engineering

Use this skill to turn software work into a controlled production-grade workflow: read the real project first, choose the correct task mode, make the smallest safe change, verify honestly, and report rollback paths and residual risk.

## First Steps

1. Read `references/routing.md` first for task-mode routing.
2. For implementation, delivery, high-risk, or uncertain-impact tasks, read `references/task-lanes.md` before deciding how much extra material to load. A narrow read-only explanation may skip it unless `routing.md` says otherwise.
3. For non-trivial engineering work, read only the relevant sections of `references/full-production-engineering.md` using heading search, not the whole file by default.
4. For code review, hidden bug hunting, vague "有没有问题/看看代码" requests, bug diagnosis, security audit, vulnerability review, or backdoor review, also read `references/code-risk-review.md`.
5. For standard or full implementation that modifies source code, changes spanning more than one source-code file, long tasks, multi-stage development, context compaction recovery, task handoff, repeated project work, or "AI 忘记事情/上下文不见了" requests, also read `references/context-memory-continuity.md`.
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
- When task state is required, Codex must update it without waiting for the user: after implementation but before validation, keep the task active with implementation complete and verification pending; only validation against the current diff may set the task complete and verification passed. Failed or unavailable validation cannot be marked complete, and any later code edit resets verification to pending.
- Never claim something was tested, pushed, merged, deployed, or verified unless current evidence proves it.
- Before final output, apply first-principles review: point out flawed assumptions, factual errors, missing risk controls, and invalid acceptance criteria directly with actionable fixes.

## Beginner-First Communication

- The user may describe only the desired outcome. Codex owns branch, commit, test, remote, review, CI, and rollback mechanics unless a real business choice or risky authorization is missing.
- Do not ask the user to choose technical Git details that can be determined from the repository. Explain unavoidable terms immediately in plain language.
- A request to change code authorizes local scoped edits and verification, not remote push, review-request creation, main-line merge, release, or deployment.
- Interpret ordinary phrases through the authorization map in `references/routing.md`; ask only when the wording would materially change remote, production, data, security, or destructive effects.
- User-facing updates and final reports must answer plainly: what changed, whether it was verified, whether it was saved remotely, whether it entered the formal version, and how to recover.

## Invocation Reliability

Keep implicit invocation enabled through `agents/openai.yaml`, and use the provided `global-AGENTS.example.md` or a project `AGENTS.md` as the hard-gate fallback for engineering write operations. Ordinary users should be able to state the goal without naming the skill. Explicit `$production-engineering` invocation is a diagnostic or one-off fallback when host matching cannot be confirmed, not a per-request requirement.

## Reference Loading

Use heading searches in `references/full-production-engineering.md`:

- Execution cost control, quick/standard/full lane choice, remote delivery overlay, and validation depth: read `references/task-lanes.md` when implementation, delivery, risk, or uncertainty requires it.
- README, docs, release notes, PR descriptions, customer-facing notes, UI copy, and "AI 味" writing cleanup: read `references/content-writing-quality.md`.
- Project understanding, architecture teardown, codebase onboarding, and "理解项目/拆解项目/接手项目" requests: read `references/project-understanding.md`.
- Git, branches, commits, remote save, review requests, CI, rollback, and plain-language authorization: read the remote delivery overlay in `references/task-lanes.md`, then search `## 三`, `## 四`, `回滚`, `CI` as needed.
- Standard/full source-code implementation, changes spanning more than one source-code file, long tasks, task-state, context continuity, compaction recovery, handoff, and optional external memory systems: read `references/context-memory-continuity.md`, then search `上下文续航`.
- Code review, hidden bugs, bug diagnosis, vague "有没有问题/看看代码" requests, vulnerability and backdoor review: read `references/code-risk-review.md`, then search `Bug 修复前置规则`, `## 十四`, `## 十七`, `## 十九`.
- Frontend, admin pages, UI validation: read `references/frontend-interface-quality.md`, then search `## 九`.
- Backend APIs and service boundaries: search `## 八`, `## 十`.
- Database, migration, consistency: search `## 十三`, `## 十四`.
- Security audit, vulnerabilities, backdoors: search `## 十七`, `## 十九`.
- Testing and final reporting: search `## 二十`, `## 二十二`, `## 二十三`.

Load only the needed parts unless the user explicitly asks to inspect or rewrite the whole standard.
