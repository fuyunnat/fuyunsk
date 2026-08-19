# Execution Cost Control

Use this file after `routing.md` for implementation, delivery, high-risk, or uncertain-impact tasks and before loading detailed references. A narrow read-only explanation does not need this file unless routing requires a specialized lane.

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

Use for explanation, project understanding, architecture teardown, planning, diagnosis, code review, security review, "先看", "先讨论", "别改", or "不要动代码".

Rules:

- Do not modify files, Git, databases, remotes, browsers, services, or external state.
- Read only the files needed to answer the question.
- For vague review or hidden-bug tasks, also read `code-risk-review.md`.
- For project understanding, architecture teardown, or codebase onboarding, also read `project-understanding.md`.

### Project understanding lane

Use with read-only lane when the user asks to understand,拆解,接手,梳理, or analyze a project/repository architecture.

Rules:

- Read `project-understanding.md`.
- Do not create `architecture.md` or any analysis artifact unless the user explicitly asks for a file.
- Start with a global map instead of a full report: project essence, main problem, core flow, central architecture idea, first mechanisms to understand, and next deep-dive direction.
- For follow-up deep dives, focus on one core problem and 2 to 4 supporting points.
- Keep confirmed facts, reasonable inferences, unknowns, and next checks separate.
- Do not route ordinary fixes, UI work, README edits, Git delivery, or deployment tasks through this lane unless the user first asks to understand the project.

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
- A genuinely single-step change touching at most one source-code file may skip task state. If the task changes more than one source-code file, becomes multi-step, or may be interrupted, add the context lane and maintain an ignored or project-external state file before further edits.
- Still check Git or backup boundaries before overwriting.
- If the user asks to save remotely, apply the remote delivery overlay after validation; remote delivery alone does not turn a quick local change into a full engineering audit.

### Standard implementation lane

Use for ordinary implementation or fixes that are not high-risk but are larger than quick lane.

Rules:

- Read relevant project files, `routing.md`, this file, and only the relevant reference files.
- Use heading searches in `full-production-engineering.md` for the sections that match the actual surface.
- Check Git state before editing.
- Before the first source-code edit, add the context lane and maintain `work/task-state.md` or an equivalent ignored/project-external state file. A standard task that changes only documentation or one non-code artifact may skip it unless the work is multi-stage or interruption-prone.
- Validate with the smallest command set that proves the changed behavior.
- Commit locally when the user asks for a recovery point. Push only when the user asks for repository or remote delivery, or when an explicit project-local policy requires that handoff.
- Default to one clear final commit per user task. Split commits only for genuinely independent, reviewable, and separately reversible changes.

### Full lane

Use when any escalation trigger exists.

Rules:

- Read all directly relevant reference files and the relevant sections of `full-production-engineering.md`.
- For implementation writes, read `context-memory-continuity.md` and maintain `work/task-state.md` or an equivalent ignored/project-external state file before editing, even when the task is not long. A routine commit, task-branch push, or review request with no implementation change still does not require a state file.
- Use Git recovery gates, diff review, risk explanation, validation evidence, rollback plan, and final delivery reporting.
- Use one task branch. Create or update one review request only when the user asks for review/merge preparation or an explicit project workflow requires it.
- Use task-state files, diff review, and the task branch as recovery checkpoints during development; do not create a new commit for every small fix, test retry, wording tweak, or file edit.

### Frontend/UI lane

Use in addition to quick, standard, or full lane when touching frontend pages, admin pages, management consoles, shared UI components, tables, forms, modals, menus, layout, or visual states.

Rules:

- Read `frontend-interface-quality.md`.
- Match the real project stack first.
- For new admin work with no project-specific stack, default to Vue 3 + Vite + Ant Design Vue + Pinia + Vue Router, ordinary `.vue` / `.js`.
- Validate layout, states, text fitting, disabled/loading/empty/error behavior, and responsive behavior according to risk.

### Context lane

Use in addition to standard or full lane whenever source code is modified. Also use it for quick-lane work that changes more than one source-code file, and for long work, multi-stage development, handoff, compaction recovery, "继续开发", "别忘了", or context-loss concerns.

Rules:

- Read `context-memory-continuity.md`.
- Keep only recovery-critical facts in the state file.
- Codex updates task, implementation, and verification status itself at phase boundaries; the user does not need to remind it.
- After implementation, keep the task active with implementation complete and verification pending. Mark the task complete only after current-diff validation passes. A failed/unavailable check or any later code edit keeps or returns verification to pending/failed and prevents completion.
- Do not rewrite the file after every tiny edit or test retry.
- Do not store secrets, private data, full logs, real user data, production credentials, or sensitive config.
- After continuation or compaction, reread state, current files, Git status, current diff, and the newest user request before acting.

### Content writing lane

Use in addition to read-only, quick, standard, or full lane when writing or editing README files, engineering docs, repository descriptions, installation guides, PR descriptions, release notes, customer-facing technical notes, admin UI copy, or product settings copy. Apply this lane proactively; users do not need to say "AI 味" for it to apply.

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
- The task touches shared code, public API, global state, routing, request wrappers, auth, permission, security, data, database, production, deployment, dependencies, lockfile, remote repository settings, or external systems.
- The user asks for "最稳", "别出问题", "生产级", production deployment, CI/CD changes, formal-branch merge, or equivalent high-impact handling.

When escalating, stop broadening the change, explain the reason briefly, read the required references, and continue under the stricter lane.

## Remote Delivery Overlay

Apply this overlay to quick, standard, or full lanes when Git or a hosted repository is involved:

- Local implementation does not authorize remote push, review-request creation, formal-branch merge, release, or deployment.
- “保存好 / 留个恢复点” authorizes a local commit or recoverable backup after suitable validation.
- “上传仓库 / 提交到仓库 / 别只放本地” authorizes pushing the current task branch after validation. It does not authorize a review request or formal merge.
- “开 PR / 提交审核 / 准备合并” authorizes creating or updating the repository's review request. It does not authorize merging.
- “搞到主线 / 正式用这个版本” authorizes the normal merge only after branch, diff, validation, and CI/status checks are explained plainly.
- Detect the actual hosting provider and use its existing workflow: Pull Request, Merge Request, change request, or equivalent. Do not assume every Git remote is GitHub.
- Never print a remote URL containing embedded credentials. Redact user information, passwords, and tokens before reporting it.
- Explain remote state in plain language: local save point, remote task copy, waiting for review, or already in the formal version.

## Verification Matrix

Use this as the starting point, then adjust to the real project.

- Skill, prompt, docs, or workflow rule changes: run `node scripts/validate-skill.js`, `git diff --check`, diff review, sensitive-information scan, and large-file/generated-artifact check.
- Project understanding or architecture teardown: no file changes by default; verify claims by citing inspected files, configs, routes, scripts, docs, or runtime evidence, and state unknown areas.
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
- Whether the work has a local recovery point, was saved remotely, is waiting for review, or entered the formal version; include technical branch/commit/PR details only as supporting evidence.
- What was intentionally not run and why.
- Remaining risk and rollback.
