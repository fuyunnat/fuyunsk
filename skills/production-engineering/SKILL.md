---
name: production-engineering
description: "Use for changes or reviews in a real software project: implementation, debugging, code/security review, Git, databases, deployment, admin UI, wrapped workspace shells, or engineering docs. Requires project inspection, scoped edits, recovery, current-diff verification, and plain-language reporting. Also matches 修复报错、实现功能、审计代码、后台页面、包裹式 UI、工作台壳层、底部信息栏、部署. Do not use for generic programming explanations, standalone snippets, ordinary chat, translation, or non-engineering writing."
---

# Production Engineering

Use this skill for controlled engineering work: classify risk first, read the real project, use the cheapest safe lane, make scoped changes, verify the current diff, and report rollback and residual risk.

## First Steps

1. Read `references/routing.md` first.
2. For implementation, delivery, high-risk, or uncertain-impact work, read `references/task-lanes.md`; it is authoritative for quick/standard/full lane selection and execution cost. Use the cheapest lane that still satisfies the hard gates.
3. Read only the specialized references selected by `routing.md`. For quick-lane work, stop once lane, target files, nearest context, and focused validation are clear. Use heading search in `references/full-production-engineering.md`; load the whole file only for maximum rigor or genuinely broad work.
4. At the first engineering turn in a conversation, determine the current repository/workspace and run `node <SKILL_DIR>/scripts/task-state.js resume --repo <PROJECT_OR_WORKSPACE_PATH> --json` before planning or editing. It checks the exact project first, then registered descendants only; it never scans broadly. A negative result does not require loading the full continuity reference.
5. Follow the nearest project `AGENTS.md`, docs, scripts, and architecture when more specific and compatible.

## Operating Rules

- At the start of every task handled by this skill, before reading or modifying project business files, explicitly tell the user: `已使用 $production-engineering，并已读取 SKILL.md / routing.md。` Also list extra references read. If the skill entry and required references cannot be confirmed, stop writes and continue only with read-only investigation or risk explanation.
- Inspect the real project, applicable rules, Git/non-Git recovery boundary, current diff, and user-owned changes before writing. For quick work, use a bounded target-area check, not a full audit. Never guess interfaces, data models, configuration, commands, or external state.
- Keep responsibility boundaries explicit. Before coding, decide where page/component, API client, state/store, business/service/domain, persistence/repository/DAO/model/migration, config, utilities, and tests belong. Do not add unrelated features to a file just because it is open; split by existing structure unless one cohesive flow is clearer.
- Protect user work and secrets. Do not revert or mix unrelated changes; do not expose or commit credentials, private data, logs, dependency output, large generated files, or release artifacts.
- Move deletions to the system trash/recycle bin or a recoverable backup. If that is impossible, stop and ask before using any permanent alternative.
- Treat production, database writes, credentials, payments, balances, orders, permissions, security policy, CI/CD, deployment, force push, direct main-branch push, and remote settings as high risk. Investigate read-only first and obtain explicit confirmation immediately before the risky write.
- Evolve existing database schemas and data compatibly by default. Do not silently rename, drop, repurpose, or narrow existing fields, rebuild tables, or bulk-overwrite historical data to make new code work; use staged additive migration and a tested rollback path.
- A local implementation request does not authorize push, review-request creation, formal-branch merge, release, or deployment. Apply the plain-language authorization map in `references/routing.md` and the remote overlay in `references/task-lanes.md`.
- Validate the current diff with the smallest sufficient checks, then review old behavior, failure paths, permissions, duplicate effects, secrets, unrelated changes, and rollback. A task cannot be complete when validation failed, is unavailable, stale, or applies to an older diff.
- Use the task-state helper for required state transitions and stale-verification detection. Do not rely on chat context or built-in memories as the only record of unfinished work.
- Never claim testing, verification, commit, push, review, merge, deployment, CI, audit, or online results without current evidence.

## Beginner-First Communication

- Ordinary users should be able to state the goal without naming the skill. Codex owns branch, commit, test, remote, review, CI, and rollback mechanics unless a real business choice or risky authorization is missing.
- Do not ask the user to choose technical Git details that can be determined from the repository. Explain unavoidable terms immediately in plain language.
- A request to change code authorizes local scoped edits and verification, not remote push, review-request creation, main-line merge, release, or deployment.
- Interpret ordinary phrases through the authorization map in `references/routing.md`; ask only when the wording would materially change remote, production, data, security, or destructive effects.
- User-facing updates and final reports must answer plainly: what changed, whether it was verified, whether it was saved remotely, whether it entered the formal version, and how to recover.

## Continuity Bootstrap

- Run the resume command in First Steps directly. Read `references/context-memory-continuity.md` only when unfinished state is found or the selected lane requires durable state.
- At the first engineering turn in every conversation, check the current project/workspace for active or blocked state. Completed state is history and must not replace the newest user request.
- When a matching unfinished state exists, re-check its repository path, branch, `HEAD`, current diff, prohibited operations, and next step. Current files and the newest user request always win over remembered text.
- Standard/full source-code work, multi-file or multi-stage work, interruption-prone work, and substantial planning explicitly needing continuity must keep durable state. Task state is a checkpoint, not a diary; quick single-step work should not rewrite it unless the lane escalates or continuation is needed.

## Invocation Reliability

Keep implicit invocation enabled through `agents/openai.yaml`, and use `global-AGENTS.example.md` or a project `AGENTS.md` as the hard-gate fallback for engineering write operations. Explicit `$production-engineering` invocation is a diagnostic fallback, not a per-request requirement.

## Reference Loading

- Lane choice, validation depth, and remote delivery: `references/task-lanes.md`.
- Context continuity, new-conversation resume, task-state helper, and stale verification: `references/context-memory-continuity.md`.
- Code review, hidden bugs, diagnosis, security, vulnerabilities, or backdoors: `references/code-risk-review.md`.
- README, docs, release notes, PR descriptions, customer notes, UI copy, and AI-style cleanup: `references/content-writing-quality.md`.
- Frontend/admin/UI implementation or review: `references/frontend-interface-quality.md`; for a wrapped workspace shell, also read `references/wrapped-workspace-ui.md`.
- Project understanding, architecture teardown, or repository onboarding: `references/project-understanding.md`.
- Detailed Git, backend, API, database, performance, deployment, security, testing, and rollback rules: relevant headings in `references/full-production-engineering.md`.

Load only what the current task needs. Safety hard gates above are intentionally duplicated with global guidance; detailed workflow text should have one canonical owner.
