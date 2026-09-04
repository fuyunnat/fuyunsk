---
name: production-engineering
description: "Explicit opt-in workflow for real software projects: implementation, debugging, code/security review, Git, databases, deployment, admin UI, and engineering docs. Use when the user explicitly invokes $production-engineering. Do not use for greetings, ordinary chat, generic programming explanations, translation, or one-line commands."
---

# Production Engineering

Use this skill only after the user explicitly invokes `$production-engineering`. The explicit-only default keeps ordinary Codex turns small and prevents this engineering workflow from being injected into greetings, simple explanations, translations, and one-line commands.

## First Steps

1. Read `references/routing.md`.
2. For implementation, delivery, high-risk, or uncertain-impact work, read `references/task-lanes.md`.
3. Read only the specialized reference selected by `routing.md`; never preload the whole `references/` directory.
4. Inspect the real repository, its nearest `AGENTS.md`, current Git state, and user-owned changes before writing.
5. Run `scripts/task-state.js resume` only for an actual continuation, handoff, multi-stage task, or context-loss risk. Do not run it merely because a conversation is new.

Before reading or modifying project business files, say:

`已使用 $production-engineering，并已读取 SKILL.md / routing.md。`

Also name any extra reference loaded.

## Core Rules

- Answer-only questions stay answer-only. Do not inspect Git, initialize task state, or load the full production specification just to explain a command, status, rule, or performance issue.
- Keep changes scoped. Do not reformat, refactor, rename, or clean unrelated files.
- Protect user work and secrets. Never expose or commit credentials, tokens, `.env` files, private data, logs, database files, dependencies, releases, or unrelated generated output.
- Move deletions to the system trash/recycle bin or a recoverable backup. If that cannot be done, stop before permanent deletion.
- Treat production, database writes, data deletion, credentials, payments, balances, orders, permissions, security policy, CI/CD, deployment, force push, direct formal-branch writes, and remote settings as high risk.
- A local change request authorizes scoped local edits and validation only. Push, review requests, formal-branch merge, release, and deployment require separate user authorization.
- Evolve existing database schemas and historical data compatibly by default. Do not silently rename, drop, repurpose, rebuild, truncate, or bulk-overwrite.
- Validate the current diff with the smallest sufficient checks. Never claim a test, commit, push, review, merge, deployment, audit, or online result without current evidence.

## Cost Control

Use progressive disclosure:

- Always loaded: skill frontmatter only.
- On explicit invocation: this file and `routing.md`.
- For implementation or delivery: add `task-lanes.md`.
- For a specialized task: add only the matching reference.
- Load `full-production-engineering.md` by heading only when a narrower reference is insufficient.
- Use task state only when the task genuinely needs continuity.

The full specification supplies detail but cannot broaden authorization, reclassify a cheaper lane, or force task-state work that `task-lanes.md` does not require.

## Beginner-First Communication

The user states the goal in ordinary language after invoking the skill. Codex owns repository inspection, branch choice, validation, commit mechanics, and rollback details unless a business decision or risky authorization is missing.

Final reports should state:

- what changed;
- what was verified;
- whether it was saved locally or remotely;
- whether it entered the formal version;
- how to recover;
- what remains unverified.

## Reference Routing

- Lane choice, validation depth, and remote delivery: `references/task-lanes.md`.
- Continuation, handoff, compaction, or durable state: `references/context-memory-continuity.md`.
- Bugs, hidden defects, code review, security, or backdoors: `references/code-risk-review.md`.
- README, docs, release notes, PR text, customer notes, and UI copy: `references/content-writing-quality.md`.
- Frontend/admin/UI: `references/frontend-interface-quality.md`.
- Wrapped desktop workspaces: `references/wrapped-workspace-ui.md`.
- Architecture understanding and repository onboarding: `references/project-understanding.md`.
- Detailed backend, API, database, performance, Git, deployment, and testing rules: relevant headings in `references/full-production-engineering.md`.

Load only what the current task needs.
