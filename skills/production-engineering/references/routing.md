# Production Engineering Routing

Use this file first after the user explicitly invokes `$production-engineering`.

## Entry Gate

This skill is explicit-only by default. If the user did not invoke `$production-engineering`, ordinary chat, greetings, generic programming explanations, translations, simple commands, and unscoped questions should be answered without loading this workflow.

After invocation, select the cheapest safe mode and load only the references required for that mode.

## Task Modes

- **Answer-only**: explain status, commands, rules, performance, or prior changes. No project read, Git work, task state, validation suite, or full-spec load unless evidence is requested.
- **Read-only**: understand a project, review code, diagnose, audit, plan, or respond to “先看 / 别改”. Inspect only.
- **Implementation**: add, modify, fix, refactor, build, package, or verify. Inspect the real target and recovery boundary before editing.
- **High-risk**: production, database writes, data deletion, credentials, payments, balances, orders, auth, security policy, CI/CD, deployment, dependencies, force push, direct formal-branch writes, or remote settings. Investigate first; risky writes require explicit authorization immediately before execution.

## Authorization Map

- “改一下 / 修一下 / 做一个”: scoped local edit and validation only.
- “保存好 / 留个恢复点 / 别丢了”: local commit or recoverable backup after validation.
- “上传仓库 / 提交到仓库 / 同步 GitHub / 别只放本地”: commit and push a task branch; no review request or formal merge.
- “开 PR / 提交审核 / 准备合并”: create or update a review request; do not merge.
- “搞到主线 / 合并到主库 / 正式用这个版本”: normal formal-branch integration after checking the actual branch, diff, validation, and repository policy.
- “上线 / 部署”: identify the exact target environment first.
- “删除 / 清理”: use trash or a recoverable backup; ambiguous or broad deletion requires exact scope confirmation.

## Default Workflow

1. Confirm explicit invocation and classify the mode.
2. For implementation, delivery, high-risk, or uncertain work, read `task-lanes.md`.
3. Inspect the nearest project rules, entrypoints, Git/backup boundary, current diff, and user-owned changes.
4. Define the smallest authorized change, protected old behavior, acceptance criteria, and file responsibility boundary.
5. Load only the specialized reference needed.
6. Implement the authorized scope.
7. Validate the current diff with the smallest proving checks.
8. Report change, evidence, local/remote/formal state, rollback, and remaining risk.

## Continuity Gate

Do not run `scripts/task-state.js resume` merely because a conversation is new.

Use `context-memory-continuity.md` and the task-state helper only when at least one is true:

- the user asks to continue or recover prior work;
- an unfinished task is already known;
- the task is multi-stage, interruption-prone, or requires handoff;
- source changes span multiple responsibility layers and need durable checkpoints;
- the user explicitly mentions context loss, compaction, “别忘了”, or “继续开发”.

A small, self-contained task does not need task state. Built-in memories remain hints and never replace current repository evidence.

## Cost Control

- Start with the cheapest lane.
- Quick work reads target files and nearest context only.
- Do not scan the whole repository, load every reference, initialize task state, open a PR, or wait on broad CI unless the lane or evidence requires it.
- Escalate only when impact is uncertain, shared/high-risk surfaces appear, tests fail, or the diff contains unexplained changes.
- `task-lanes.md` is authoritative for lane selection and cannot expand user authorization.
- `full-production-engineering.md` adds detail only; conflicting workflow breadth yields to this file and `task-lanes.md`.

## Specialized Routing

- Bugs, vague review, hidden defects, security, vulnerabilities, or backdoors: `code-risk-review.md`.
- Continuation, handoff, compaction, or durable state: `context-memory-continuity.md`.
- README, documentation, changelog, release notes, PR text, customer notes, or UI copy: `content-writing-quality.md`.
- Frontend/admin/UI: `frontend-interface-quality.md`; wrapped workspaces also use `wrapped-workspace-ui.md`.
- Project understanding, architecture teardown, or onboarding: `project-understanding.md`.
- Detailed backend/API/database/performance/deployment/testing rules: search the relevant heading in `full-production-engineering.md`.

## Responsibility Boundary

Before implementation, identify where UI, state, API client, business logic, persistence, config, utilities, and tests belong. Do not append unrelated behavior to whichever file is already open.

## Final Report

Keep it brief and factual: lane used, changed files, validation evidence, remote/formal status, rollback, and remaining risk. Never invent verification or delivery results.
