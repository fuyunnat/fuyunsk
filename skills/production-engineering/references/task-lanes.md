# Execution Cost Control

Use this file after `routing.md` and before loading detailed references.

This file controls how much context to load and how much validation to run. The full specification remains authoritative. If this file conflicts with `full-production-engineering.md`, follow the full specification and the higher-priority user, system, and project rules.

## Core Rule

Do not weaken hard gates to save time.

Never skip these checks when they apply:

- User-owned changes, unrelated diffs, untracked files, and recovery boundaries.
- Secrets, tokens, passwords, private data, logs, generated artifacts, large files, and dependency output.
- Trash/recycle-bin deletion policy.
- Production, database, payments, balances, orders, permissions, auth, security, CI/CD, deployment, remote settings, force push, and direct main-branch push boundaries.
- Truthful validation and final reporting.

The optimization is only this: load fewer reference files and run smaller validation when the task is genuinely narrow, local, reversible, and low risk.

## Lane Selection

Choose one lane before editing files. If unsure, escalate.

### Read-only lane

Use for explanation, planning, diagnosis, code review, security review, "先看", "先讨论", "别改", or "不要动代码".

Rules:

- Do not modify files, Git, databases, remotes, browsers, services, or external state.
- Read only the files needed to answer the question.
- For vague review or hidden-bug tasks, also read `code-risk-review.md`.

### Quick lane

Use only when all are true:

- Scope and target files are clear.
- The change is local and reversible.
- No shared module, public API, global config, data model, auth, permission, security, deployment, dependency, lockfile, database, production, remote, or external side effect is touched.
- No file or directory is permanently deleted.
- The impact can be proven with a small diff review, keyword check, local command, or focused smoke test.

Rules:

- Read `routing.md`, this file, target files, and only the nearest necessary context.
- Do not load the whole full specification by default.
- Do not create `work/task-state.md`, PR, CI review, or broad regression by default.
- Still check Git or backup boundaries before overwriting.
- If the user asks to save to GitHub, push the task branch after validation.

### Standard implementation lane

Use for ordinary implementation or fixes that are not high-risk but are larger than quick lane.

Rules:

- Read relevant project files, `routing.md`, this file, and only the relevant reference files.
- Use heading searches in `full-production-engineering.md` for the sections that match the actual surface.
- Check Git state before editing.
- Validate with the smallest command set that proves the changed behavior.
- Commit and push when the user asks for repository delivery or when the task requires the normal GitHub handoff.

### Full lane

Use when any escalation trigger exists.

Rules:

- Read all directly relevant reference files and the relevant sections of `full-production-engineering.md`.
- Maintain `work/task-state.md` or an equivalent ignored state file for long, staged, pushed, PR, deployment, or context-loss-prone tasks.
- Use Git recovery gates, diff review, risk explanation, validation evidence, rollback plan, and final delivery reporting.
- Create or update one task branch and one PR when GitHub delivery applies.

### Frontend/UI lane

Use in addition to quick, standard, or full lane when touching frontend pages, admin pages, management consoles, shared UI components, tables, forms, modals, menus, layout, or visual states.

Rules:

- Read `frontend-interface-quality.md`.
- Match the real project stack first.
- For new admin work with no project-specific stack, default to Vue 3 + Vite + Ant Design Vue + Pinia + Vue Router, ordinary `.vue` / `.js`.
- Validate layout, states, text fitting, disabled/loading/empty/error behavior, and responsive behavior according to risk.

### Context lane

Use in addition to standard or full lane for long work, multi-stage development, handoff, compaction recovery, "继续开发", "别忘了", or context-loss concerns.

Rules:

- Read `context-memory-continuity.md`.
- Keep only recovery-critical facts in the state file.
- Do not store secrets, private data, full logs, real user data, production credentials, or sensitive config.
- After continuation or compaction, reread state, current files, Git status, current diff, and the newest user request before acting.

### Content writing lane

Use in addition to read-only, quick, standard, or full lane when writing or editing README files, engineering docs, repository descriptions, installation guides, PR descriptions, release notes, customer-facing technical notes, admin UI copy, product settings copy, or text the user says has "AI 味".

Rules:

- Read `content-writing-quality.md`.
- Preserve facts, commands, paths, constraints, validation evidence, and rollback notes.
- Remove generic AI-style filler, overclaiming, chat residue, and self-referential prompting language.
- Match the target reader and document type.
- Do not invent product claims, test results, customer impact, security guarantees, or compatibility promises.

## Escalation

Escalate from quick to standard or full lane if any of these appear:

- Impact is uncertain.
- More files or modules are touched than expected.
- Existing tests fail or the current state is abnormal.
- Diff contains unexplained changes.
- User-owned changes affect the target area.
- The task touches shared code, public API, global state, routing, request wrappers, auth, permission, security, data, database, production, deployment, dependencies, lockfile, remote repository, or external systems.
- The user asks for "最稳", "别出问题", "生产级", "提交线上", "推送", "PR", "CI", "部署", or equivalent.

When escalating, stop broadening the change, explain the reason briefly, read the required references, and continue under the stricter lane.

## Verification Matrix

Use this as the starting point, then adjust to the real project.

- Skill, prompt, docs, or workflow rule changes: run `node scripts/validate-skill.js`, `git diff --check`, diff review, sensitive-information scan, and large-file/generated-artifact check.
- Frontend page or admin UI changes: run the project's lint/build or focused page smoke test where available; verify loading, empty, error, disabled, long text, and responsive states when affected.
- Backend API or service changes: run targeted tests or API smoke tests; for shared code, also check main callers and compatibility.
- Database or migration changes: verify migration direction, rollback or recovery plan, affected data paths, and target environment before running anything stateful.
- Security, auth, permission, payment, balance, order, production, deployment, or CI changes: use full lane; verify success and failure paths, old behavior, rollback, and CI/status evidence when available.

Do not invent validation. If a command or environment is unavailable, say exactly what was not verified and why.

## Final Report

State the lane used and why when the task involved file changes, Git delivery, high-risk surfaces, or a non-obvious choice.

Final output should stay short, but must include:

- What changed.
- What was verified.
- Git branch, commit, push, PR, CI, and main-line status when applicable.
- What was intentionally not run and why.
- Remaining risk and rollback.
