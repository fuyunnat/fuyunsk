# Production Engineering Routing

Use this file first after the skill triggers.

## Task Modes

- **Read-only mode**: understanding a project, architecture teardown, explaining code, planning, review, diagnosis, audit, security review, or "先看/先理解/别改/不要动代码". Inspect only; do not modify files, Git, databases, remotes, or external state.
- **Implementation mode**: user asks to add, modify, fix, refactor, build, deliver, start and verify, commit, push, or package. Edit only after real project inspection and Git/non-Git recovery checks.
- **Security audit mode**: user asks for vulnerabilities, backdoors, suspicious logic, unsafe code, or whether the project is secure. Default read-only. Do not run unknown code. Stop and preserve evidence if a suspected backdoor appears.
- **High-risk mode**: production, database writes, data deletion, credentials, payments, balances, orders, authorization, security policy, CI/CD, deployment config, remote repository settings, force push, direct main branch push, or destructive filesystem work. Do read-only investigation first; risky writes require explicit confirmation.

## Default Workflow

1. Confirm scope and task mode from the newest user request.
2. Read `task-lanes.md` and choose read-only, quick, standard, full, frontend/UI, or context lane.
3. Inspect local rules and real project state before assumptions.
4. If modifying files, check Git state first. If not a Git repo, create a timestamped backup before overwriting existing files.
5. Define the smallest safe change and what existing behavior must remain unchanged.
6. Implement only the scoped change.
7. Verify with commands appropriate to the risk and chosen lane.
8. Review diffs for unrelated changes, secrets, large files, generated artifacts, and accidental formatting.
9. Final response: lane used, what changed, verification evidence, rollback path, unverified areas, remaining risk.

## Execution Cost Control Workflow

1. Use `task-lanes.md` to avoid loading the whole full specification when a task is genuinely narrow, local, reversible, and low risk.
2. Do not use execution-cost control to bypass hard gates: user changes, Git recovery, deletion safety, secrets, production, database, auth, payment, deployment, remote, validation truthfulness, and rollback still apply.
3. Escalate to the stricter lane immediately when the impact is uncertain, shared/high-risk files are touched, tests fail, diffs are unexplained, or the user asks for "最稳", "别出问题", "提交线上", "推送", "PR", "CI", or "部署".
4. For skill, prompt, docs, or workflow-rule changes, the default validation baseline is `node scripts/validate-skill.js`, `git diff --check`, diff review, sensitive-information scan, and generated/large-file check.

## Bug Report Workflow

When the user reports a bug, error, abnormal UI, failing API, broken command, or unexpected behavior:

1. Do not start with broad code edits.
2. First locate likely relevant files, functions, routes, configs, logs, tests, or call chains.
3. Before editing, state the observed symptom, likely root cause, evidence, files to change, smallest fix, and old behavior that must remain unchanged.
4. If the user says "directly fix" or the bug blocks execution, locate and fix in one pass, but still report root cause, evidence, validation, and residual risk.
5. Do not refactor unrelated code, format the whole repo, or expand scope unless the evidence requires it.

## Code Risk Review Workflow

When the user asks "有没有问题", "帮我看看代码", "查隐藏 Bug", code review, bug diagnosis, security audit, vulnerability review, or backdoor review:

1. Read `code-risk-review.md`.
2. Make the vague request concrete by checking null/empty values, duplicate requests, concurrency, permissions, timeouts, exception handling, and sensitive information leakage when applicable.
3. Lead with confirmed findings and evidence. If no confirmed issue is found, state the reviewed scope and unverified areas; do not claim the whole system is risk-free after a narrow scan.
4. Keep audit and review tasks read-only unless the user explicitly asks to fix.

## Context Memory Workflow

When the user mentions context loss, compaction, handoff, repeated work, long-running development, "别忘了", "继续开发", "上下文不见了", or "AI 忘记事情了":

1. Read `context-memory-continuity.md`.
2. Maintain `work/task-state.md` or an equivalent ignored task-state file for active task memory.
3. Use layered memory: short task summary and decisions in the state file, evidence paths for raw logs/diffs/reports, and current real files/Git/runtime as the source of truth.
4. Do not install, start, call, or route through external memory systems unless the user explicitly asks for that integration and approves the operational risk.
5. After compaction or continuation, read task state, current Git status, current diff, and the newest user request before acting.

## Content Writing Quality Workflow

When the task writes or edits README files, engineering documentation, repository descriptions, installation guides, changelogs, release notes, PR descriptions, customer-facing technical notes, admin UI copy, or product settings copy, always apply this workflow proactively. The user does not need to ask for "去 AI 味"; that phrase is only an extra signal.

1. Read `content-writing-quality.md`.
2. Preserve accurate technical facts, commands, paths, limits, and verification evidence.
3. Remove chat residue, generic praise, over-broad claims, and filler that does not help the target reader.
4. Match the document's real audience: user, maintainer, operator, reviewer, or customer.
5. Keep the result concrete, restrained, readable, and reviewable.

## Project Understanding Workflow

When the user asks to understand,拆解,接手,梳理, or analyze a project/repository architecture:

1. Read `project-understanding.md`.
2. Keep the task read-only unless the user explicitly asks to create a file or modify code.
3. Inspect the real entrypoints, routes, configs, package scripts, service boundaries, storage/runtime clues, and project-local rules before making architecture claims.
4. First provide a global map: project essence, main problem, core flow, central architecture idea, 2 to 4 mechanisms worth understanding first, and the next best deep-dive direction.
5. For follow-up deep dives, explain one core problem at a time; do not turn every implementation, bug fix, or README task into a full architecture teardown.
6. Separate confirmed facts, reasonable inferences, unknowns, and next checks. Do not claim the whole architecture is understood after a narrow scan.

## Detailed Reference Map

Read targeted sections from `full-production-engineering.md`:

- Global priority and task modes: `## 零`, `## 一`, `## 二`.
- Task lanes and execution cost control: `task-lanes.md`.
- Git gate and delivery: `## 三`, `## 四`.
- Context memory and task-state continuity: `context-memory-continuity.md`, plus `上下文续航`.
- Bug-first diagnosis: `Bug 修复前置规则`.
- Hidden bug and code risk review: `code-risk-review.md`.
- Content writing quality, README, docs, PR descriptions, release notes, UI copy, and anti-AI-style editing: `content-writing-quality.md`.
- Project understanding, architecture teardown, and codebase onboarding: `project-understanding.md`.
- Risk and requirement boundaries: `## 五`, `## 六`.
- Module/file size and comments: `## 七`.
- Backend: `## 八`.
- Frontend/admin pages: `## 九`.
- Detailed frontend interface quality and UI review: `frontend-interface-quality.md`.
- API compatibility: `## 十`.
- Performance/capacity: `## 十一`.
- Feature flags and rollback: `## 十二`.
- Database and migration: `## 十三`.
- Concurrency/idempotency: `## 十四`.
- Config/deployment: `## 十五`.
- Dependencies/supply chain: `## 十六`.
- Security: `## 十七`, `## 十九`.
- Logging/observability: `## 十八`.
- Testing and quality evidence: `## 二十`.
- Minimal-change principle: `## 二十一`.
- Definition of done and final output: `## 二十二`, `## 二十三`, `## 二十四`.

## Admin Frontend Default

For newly created admin pages, management consoles, configuration pages, or operations dashboards when the user does not specify another stack:

- Use Vue 3 + Vite.
- Use Ant Design Vue for tables, forms, modals, drawers, menus, pagination, messages, and common states.
- Use Pinia only for real cross-page, cross-module, or global admin state.
- Use Vue Router for multiple pages, menu navigation, details pages, or permission routes.
- Use ordinary `.vue` / `.js`; do not convert the admin project to TypeScript unless explicitly requested.
- For existing projects, always follow the real current stack instead of this default.

For frontend pages, admin pages, management consoles, configuration pages, operations dashboards, shared UI components, or UI review tasks, also read `frontend-interface-quality.md`.
