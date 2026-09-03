# Execution Cost Control

Use after `routing.md` for implementation, delivery, high-risk, or uncertain-impact work. This file is authoritative for lane selection and remote overlays; `full-production-engineering.md` adds detail after selection and must not reclassify the lane, expand authorization.

## Core Rule

Start cheap, then escalate only when evidence requires it. Do not weaken hard gates.

Never skip hard gates: protect user-owned changes, unrelated/untracked work, recovery boundaries, secrets, trash/recycle-bin deletion, production/database/payment/auth/security/CI/deploy/remote risks, force/direct-main writes, truthful validation, and final reporting. Existing database fields and historical data use additive compatibility by default; no destructive schema replacement or bulk overwrite. Responsibility/file-boundary check keeps features, API calls, business rules, persistence, state, UI, config, utilities, and tests separated by real project structure.

Optimization: classify first, load fewer references, write fewer task-state updates, and run smaller validation for reversible work.

## Fast-First Default

First prove the cheapest safe lane. Escalate only when target, diff, rules, or wording gives an objective trigger. Do not treat "严谨点", "稳一点", "小白不会 Git", or "提交仓库" as automatic full-lane triggers.

Answer-only: short answer; no Git/task-state/full-spec/validation unless asked to modify, verify, deliver, save, push, merge, deploy, or inspect live evidence.

Quick-lane budget: read `routing.md`, this file, target/context; run one focused check when enough; report briefly. Do not scan repo, load full spec, keep a task-state diary, create a PR, or wait on broad CI unless this table requires it.

## Objective Lane Table

Use this table before heavy reasoning/extra references; conflicts choose the stricter row.

| Lane | Objective trigger | Action |
| --- | --- | --- |
| Answer-only | What changed, why slow, Git/skill use, rule meaning, status, or opinion; no file/project change. | Short answer; no Git, task-state, validation, or full-spec load. |
| Read-only | Explain, plan, review, diagnose, audit, "先看/别改". | Inspect evidence; no writes, commits, or external changes. |
| Tiny | One clear README/docs/copy/style/label/font/button tweak or obvious single-file fix; no shared/data/auth/config/dependency/remote/production effect. | Read target/context; edit; one small check/diff review. |
| Quick | Local reversible change, clear files, small blast radius, focused validation proves it. | Bounded inspect/edit/check/report. |
| Standard | Ordinary feature/fix spans files or responsibility layers, no high-risk surface. | Maintain state, keep boundaries, run targeted validation. |
| Full | DB/schema/data, auth/permission/security, payment/order/balance, production/deploy/CI, deps/lockfile, deletion, secret, force/direct-main/remote settings, formal merge, or unknown impact. | Read refs, explain risk/rollback, validate, ask before risky writes. |

Tiny fixes stay quick. A quick README/docs/copy/style tweak should finish as one change with one focused check. Table controls cost; hard gates still apply.

## Big-Change Rule

Treat a task as big if it hits shared/public/global/remote/DB/security surfaces, spans two or more responsibility layers, or needs submit, push, PR, merge, release, deploy, or online validation. If unsure, check target/context first; escalate only if risk remains real. Only a local, reversible, low-risk, single-file change stays quick.

## Lanes

Choose one lane before editing. If unsure after bounded target check, escalate.

### Read-only lane

For explanation, project understanding, architecture teardown, planning, diagnosis, code review, security review, "先看", "先讨论", "别改", or "不要动代码". Do not modify files, Git, databases, remotes, browsers, services, or external state. Read needed files only. For hidden bugs read `code-risk-review.md`; for understanding read `project-understanding.md`.

### Project understanding lane

Use with read-only lane for understand,拆解,接手,梳理, or architecture analysis. Read `project-understanding.md`; do not create `architecture.md` unless asked. Start with essence, main problem, core flow, central idea, mechanisms, and next deep-dive. Separate facts, inferences, unknowns, and next checks. Do not route fixes, UI, README, Git delivery, or deployment here unless understanding was requested.

### Quick lane

Use only when scope/target files are clear; the change is local and reversible; it touches no shared module, public API, global config, data model, auth, permission, security, deployment, dependency, lockfile, database, production, remote, or external side effect; no file/directory is permanently deleted; impact is proven by small diff review, keyword check, local command, or focused smoke test.

Rules: read `routing.md`, this file, target files, and nearest context. Do not load the whole full specification by default. Do not create `work/task-state.md`, PR, CI review, or broad regression by default. A genuinely single-step change touching at most one source-code file may skip task state; existing state updates only at phase boundaries. Authorized remote save is one commit and one push to current task branch or small maintainer branch. If work changes more than one source-code file, becomes multi-step, or may be interrupted, add context lane and maintain ignored/project-external state. Check Git/backup boundaries before overwriting; remote delivery alone does not turn quick work into a full audit.

### Standard implementation lane

For ordinary implementation or fixes larger than quick and not high-risk. Read relevant project files, `routing.md`, this file, and relevant references. Search headings in `full-production-engineering.md`; check Git; keep code in the right module; do not create a large mixed-responsibility file. Before the first source-code edit, add context lane and initialize/refresh state through `context-memory-continuity.md`. Docs-only or one non-code artifact may skip state unless multi-stage/interruption-prone. Validate with the smallest proving command set. Commit locally for requested recovery. Push only for repository/remote delivery or explicit handoff. Default to one clear final commit per user task and one clear final commit per user goal. Split only for independent, reviewable, reversible changes.

### Full lane

Use when any escalation trigger exists. Read relevant references and `full-production-engineering.md`. For implementation writes, read `context-memory-continuity.md` and initialize/refresh state before editing. A routine commit, task-branch push, or review request with no implementation change still does not require new state. Use Git recovery gates, diff review, risk explanation, validation evidence, rollback plan, and final reporting. Use one task branch and one review request when needed. Use task-state files, diff review, and the task branch as checkpoints; do not create a new commit for every small fix, test retry, wording tweak, or file edit.

### Frontend/UI lane

Use in addition to quick, standard, or full lane for frontend pages, admin pages, management consoles, shared UI components, tables, forms, modals, menus, layout, or visual states. Read `frontend-interface-quality.md`; match the real stack. For new admin work with no project-specific stack, default to Vue 3 + Vite + Ant Design Vue + Pinia + Vue Router, ordinary `.vue` / `.js`. This fallback does not constrain the framework-neutral `wrapped-workspace-ui.md` contract or authorize stack migration. Validate layout, states, text fitting, disabled/loading/empty/error behavior, and responsive behavior by risk.

### Context lane

Use in addition to standard/full when source code changes need durable state. Also use for quick work that grows beyond one source-code file, continuation planning, long work, multi-stage development, handoff, compaction recovery, "继续开发", "别忘了", or context-loss concerns. Read `context-memory-continuity.md` and use its helper for bounded project/workspace discovery, state transitions, current-diff fingerprints, and completion checks. Keep recovery-critical facts and evidence pointers only; never store secrets or full sensitive logs. On continuation, reread state, current files, Git status/diff, and newest request. Treat state as a checkpoint: start/in progress, implementation complete/pending verification, verified, submitted, or complete. Do not rewrite it after every small edit or repeated failed command unless status, next step, changed-file set, blocker, validation evidence, or remote state changed.

### Content writing lane

Use in addition to read-only, quick, standard, or full lane for README files, engineering docs, repository descriptions, installation guides, PR descriptions, release notes, customer-facing technical notes, admin UI copy, or product settings copy. Apply proactively; users do not need to say "AI 味" for it to apply. Read `content-writing-quality.md`; preserve facts, commands, paths, constraints, validation evidence, and rollback notes; remove generic AI-style filler, overclaiming, chat residue, and self-referential prompting language; match the reader/document type; do not invent product claims, test results, customer impact, security guarantees, or compatibility promises.

## Escalation

Escalate from quick to standard/full when impact is uncertain; files/modules exceed expectation; tests fail; state or diff is abnormal; user-owned changes affect target area; work touches shared code, public API, global state, routing, request wrappers, auth, permission, security, data, database, production, deployment, dependencies, lockfile, remote repository settings, external systems; different features/UI states/data access/business rules/configuration accumulate in one file; or the user requests full standard, maximum-rigor/no-omissions, production deployment, CI/CD changes, formal-branch merge, or equivalent high-impact handling. Ordinary phrases such as "稳一点" or "别出问题" do not override a clearly quick or standard scope by themselves.

When escalating, stop broadening the change, explain the reason briefly, read the required references, and continue under the stricter lane.

## Remote Delivery Overlay

Apply this overlay to quick, standard, or full lanes when Git or a hosted repository is involved: Local implementation does not authorize remote push, review-request creation, formal-branch merge, release, or deployment. “保存好 / 留个恢复点” authorizes a local commit or recoverable backup after validation. “上传仓库 / 提交到仓库 / 别只放本地” authorizes one validated remote save; reuse a matching task branch, do not create a new branch for each small follow-up, and do not create review request or formal merge. “开 PR / 提交审核 / 准备合并” authorizes creating/updating a review request, not merging. “搞到主线 / 正式用这个版本” authorizes normal merge only after branch, diff, validation, and CI/status checks are explained plainly. If no enforced review workflow exists, a maintainer may fast-forward or merge locally and push main after validation; report that this is now the formal version. Detect the actual hosting provider; Do not assume every Git remote is GitHub. Never print remote URLs with embedded credentials. Explain remote state plainly: local save point, remote task copy, waiting for review, or already in the formal version.

## Verification Matrix

- Skill, prompt, docs, or workflow rule changes: run `node scripts/validate-skill.js` and `git diff --check`; the main validator should cover routing scenarios, task-state helper self-tests, hygiene, sensitive-information, and generated/large-file checks so the default workflow does not repeat the same suite.
- Project understanding or architecture teardown: no file changes by default; verify claims by citing inspected evidence and state unknown areas.
- Frontend page or admin UI changes: run lint/build or a focused page smoke test where available; verify loading, empty, error, disabled, long text, and responsive states when affected.
- Backend API/service changes: run targeted tests or API smoke tests; for shared code, check main callers and compatibility.
- Database or migration changes: verify migration direction, rollback/recovery plan, affected data paths, and target environment before running anything stateful.
- Security, auth, permission, payment, balance, order, production, deployment, or CI changes: use full lane; verify success/failure paths, old behavior, rollback, and CI/status evidence when available.

Do not invent validation. If unavailable, say what was not verified and why.

## Final Report

State the lane used and why when the task involved file changes, Git delivery, high-risk surfaces, or a non-obvious choice. Final output should stay short but include what changed, what was verified, whether there is a local recovery point/remote save/review request/formal version, what was intentionally not run and why, remaining risk, and rollback.
