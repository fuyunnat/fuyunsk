# Execution Cost Control

Use after `routing.md` for implementation, delivery, high-risk, or uncertain-impact work. This file is authoritative for lane selection and remote-delivery overlays; `full-production-engineering.md` adds detail after lane selection and must not reclassify the lane, expand authorization.

## Core Rule

Start cheap, then escalate only when evidence requires it. Do not weaken hard gates.

Never skip hard gates: user-owned changes, unrelated diffs, untracked files, recovery boundaries, secrets, trash/recycle-bin deletion, production/database/payment/auth/security/CI/deploy/remote risks, force/direct-main writes, truthful validation, and final reporting. Existing database fields and historical data require additive compatibility by default; never use destructive schema replacement or bulk overwrite as an implicit shortcut. Responsibility/file-boundary check means separate unrelated features, API calls, business rules, persistence, state, UI, config, utilities, and tests by the real project structure.

Optimization: classify first, load fewer references, write fewer task-state updates, and run smaller validation for local, reversible work.

## Fast-First Default

First try to prove quick lane. Escalate only when target area, diff, project rules, or wording gives a real reason. Do not treat "严谨点", "稳一点", "小白不会 Git", or "提交仓库" as automatic full-lane triggers.

Answer-only: short answer; no Git/task-state/full-spec/validation unless asked to modify, verify, or deliver.

Quick-lane budget: read `routing.md`, this file, target, and nearby context; run one check; give a short report. Do not scan the repo, load full spec, keep a task-state diary, create a PR, or wait on broad CI unless needed.

## Big-Change Rule

Treat a task as big if it hits a shared/public/global/remote/DB/security surface, spans two or more responsibility layers, or needs submit, push, PR, merge, release, deploy, or online validation. If unsure, escalate after checking the target file and nearby context. Only a local, reversible, low-risk, single-file change stays quick.

Tiny fixes stay quick.

## Lane Selection

Choose one lane before editing files. If unsure, escalate.

### Read-only lane

Use for explanation, project understanding, architecture teardown, planning, diagnosis, code review, security review, "先看", "先讨论", "别改", or "不要动代码".

Rules: do not modify files, Git, databases, remotes, browsers, services, or external state. Read only needed files. For vague review or hidden-bug tasks, read `code-risk-review.md`; for project understanding, architecture teardown, or onboarding, read `project-understanding.md`.

### Project understanding lane

Use with read-only lane when the user asks to understand,拆解,接手,梳理, or analyze a project/repository architecture.

Rules: read `project-understanding.md`; do not create `architecture.md` or analysis files unless explicitly asked. Start with a global map: project essence, main problem, core flow, central architecture idea, first mechanisms, and next deep-dive direction. For follow-ups, focus on one problem and 2 to 4 supporting points; separate confirmed facts, reasonable inferences, unknowns, and next checks. Do not route ordinary fixes, UI work, README edits, Git delivery, or deployment through this lane unless the user first asks to understand the project.

### Quick lane

Use only when scope/target files are clear; the change is local and reversible; it touches no shared module, public API, global config, data model, auth, permission, security, deployment, dependency, lockfile, database, production, remote, or external side effect; no file/directory is permanently deleted; impact can be proven with small diff review, keyword check, local command, or focused smoke test.

Rules:

- Read `routing.md`, this file, target files, and nearest necessary context.
- Do not load the whole full specification by default.
- Do not create `work/task-state.md`, PR, CI review, or broad regression by default.
- A genuinely single-step change touching at most one source-code file may skip task state. Existing state is updated only at phase boundaries, not for each small edit.
- A quick README/docs/copy/style tweak should finish as one change with one focused check. Remote save, when authorized, should be one commit and one push to the current task branch or a small direct maintainer branch.
- If the task changes more than one source-code file, becomes multi-step, or may be interrupted, add context lane and maintain ignored/project-external state before further edits.
- Still check Git or backup boundaries before overwriting. If the user asks to save remotely, apply the remote overlay; remote delivery alone does not turn quick work into a full audit.

### Standard implementation lane

Use for ordinary implementation or fixes that are larger than quick lane and not high-risk.

Rules: read relevant project files, `routing.md`, this file, and relevant references. Use heading searches in `full-production-engineering.md`; check Git state; keep code in the right module; do not create a large mixed-responsibility file. Before the first source-code edit, add context lane and initialize/refresh state through `context-memory-continuity.md`. Documentation-only or one non-code artifact may skip new state unless multi-stage or interruption-prone. Validate with the smallest command set that proves the change. Commit locally for a requested recovery point. Push only for repository/remote delivery or explicit project-local handoff policy. Default to one clear final commit per user task and one clear final commit per user goal. Split only for independent, reviewable, separately reversible changes.

### Full lane

Use when any escalation trigger exists.

Rules: read directly relevant references and `full-production-engineering.md`. For implementation writes, read `context-memory-continuity.md` and initialize/refresh state before editing. A routine commit, task-branch push, or review request with no implementation change still does not require new state. Use Git recovery gates, diff review, risk explanation, validation evidence, rollback plan, and final delivery reporting. Use one task branch. Create/update one review request only when needed. Use task-state files, diff review, and the task branch as recovery checkpoints; do not create a new commit for every small fix, test retry, wording tweak, or file edit.

### Frontend/UI lane

Use in addition to quick, standard, or full lane when touching frontend pages, admin pages, management consoles, shared UI components, tables, forms, modals, menus, layout, or visual states.

Rules: read `frontend-interface-quality.md`; match the real project stack first. For new admin work with no project-specific stack, default to Vue 3 + Vite + Ant Design Vue + Pinia + Vue Router, ordinary `.vue` / `.js`. This is only a fallback for an otherwise unspecified new admin project; it does not constrain the framework-neutral `wrapped-workspace-ui.md` contract or authorize a stack migration. Validate layout, states, text fitting, disabled/loading/empty/error behavior, and responsive behavior according to risk.

### Context lane

Use in addition to standard or full lane when source code is modified and the task needs durable state. Also use it for quick work that expands beyond one source-code file, substantial planning that must survive a new conversation, long work, multi-stage development, handoff, compaction recovery, "继续开发", "别忘了", or context-loss concerns.

Rules: read `context-memory-continuity.md` and use its helper for bounded project/workspace discovery, state transitions, current-diff fingerprints, and completion checks. Keep only recovery-critical facts and evidence pointers; never store secrets or full sensitive logs. On a new conversation or continuation, reread state, current files, Git status/diff, and newest user request before acting. Treat task state as a checkpoint file: start/in progress, implementation complete/pending verification, verified, submitted, or complete. Do not rewrite it after every small edit or repeated failed command unless status, next step, changed-file set, blocker, validation evidence, or remote state changed.

### Content writing lane

Use in addition to read-only, quick, standard, or full lane when writing or editing README files, engineering docs, repository descriptions, installation guides, PR descriptions, release notes, customer-facing technical notes, admin UI copy, or product settings copy. Apply this lane proactively; users do not need to say "AI 味" for it to apply.

Rules: read `content-writing-quality.md`; preserve facts, commands, paths, constraints, validation evidence, and rollback notes; remove generic AI-style filler, overclaiming, chat residue, and self-referential prompting language; match the target reader and document type; do not invent product claims, test results, customer impact, security guarantees, or compatibility promises.

## Escalation

Escalate from quick to standard or full lane when impact is uncertain; more files/modules are touched than expected; tests fail; state is abnormal; diff contains unexplained changes; user-owned changes affect the target area; the task touches shared code, public API, global state, routing, request wrappers, auth, permission, security, data, database, production, deployment, dependencies, lockfile, remote repository settings, or external systems; different features/UI states/data access/business rules/configuration accumulate in one file; or the user explicitly requests full standard, maximum-rigor/no-omissions execution, production deployment, CI/CD changes, formal-branch merge, or equivalent high-impact handling. Ordinary phrases such as "稳一点" or "别出问题" do not override a clearly quick or standard scope by themselves.

When escalating, stop broadening the change, explain the reason briefly, read the required references, and continue under the stricter lane.

## Remote Delivery Overlay

Apply this overlay to quick, standard, or full lanes when Git or a hosted repository is involved:

- Local implementation does not authorize remote push, review-request creation, formal-branch merge, release, or deployment.
- “保存好 / 留个恢复点” authorizes a local commit or recoverable backup after suitable validation.
- “上传仓库 / 提交到仓库 / 别只放本地” authorizes one validated remote save for the current user goal. Reuse the current task branch when it matches the work; do not create a new branch for each small follow-up. It does not authorize a review request or formal merge.
- “开 PR / 提交审核 / 准备合并” authorizes creating or updating the repository's review request. It does not authorize merging.
- “搞到主线 / 正式用这个版本” authorizes the normal merge only after branch, diff, validation, and CI/status checks are explained plainly. If the user explicitly asks for main and the repository has no enforced review workflow, a maintainer may fast-forward or merge locally and push main after validation; still report that this is now the formal version.
- Detect the actual hosting provider and use its existing workflow: Pull Request, Merge Request, change request, or equivalent. Do not assume every Git remote is GitHub. Never print remote URLs with embedded credentials; explain remote state in plain language: local save point, remote task copy, waiting for review, or already in the formal version.

## Verification Matrix

- Skill, prompt, docs, or workflow rule changes: run `node scripts/validate-skill.js` and `git diff --check`; the main validator should cover routing scenarios, task-state helper self-tests, hygiene, sensitive-information, and generated/large-file checks so the default workflow does not repeat the same suite.
- Project understanding or architecture teardown: no file changes by default; verify claims by citing inspected evidence and state unknown areas.
- Frontend page or admin UI changes: run lint/build or a focused page smoke test where available; verify loading, empty, error, disabled, long text, and responsive states when affected.
- Backend API/service changes: run targeted tests or API smoke tests; for shared code, check main callers and compatibility.
- Database or migration changes: verify migration direction, rollback/recovery plan, affected data paths, and target environment before running anything stateful.
- Security, auth, permission, payment, balance, order, production, deployment, or CI changes: use full lane; verify success/failure paths, old behavior, rollback, and CI/status evidence when available.

Do not invent validation. If unavailable, say exactly what was not verified and why.

## Final Report

State the lane used and why when the task involved file changes, Git delivery, high-risk surfaces, or a non-obvious choice. Final output should stay short but include what changed, what was verified, whether there is a local recovery point/remote save/review request/formal version, what was intentionally not run and why, remaining risk, and rollback.
