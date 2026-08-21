# Context Memory Continuity

Use this reference when the lightweight first-turn resume command finds unfinished state, and for every standard/full implementation that modifies source code, multi-file or multi-stage work, substantial planning that must continue later, context compaction recovery, task handoff, repeated project work, "别忘了", "继续开发", "上下文不见了", "AI 忘记事情了", or any task that needs durable working memory. A negative resume result alone does not require loading this file.

This file absorbs general memory-system ideas from TencentDB Agent Memory without depending on that project. Do not install, start, configure, or call any external memory server, proxy, database, hook, plugin, or network service unless the user explicitly asks for that integration and confirms the operational risk.

## Default Local Memory

The default mechanism is still local, white-box, and recoverable:

- Before the first source-code edit, standard and full implementation lanes must create or refresh task state. A quick-lane task may skip it only when the work is genuinely single-step, touches at most one source-code file, and has no meaningful interruption or handoff risk.
- Use `work/task-state.md` only when it is already ignored, or use an equivalent ignored/project-external Codex task-state location. Check the ignore boundary before creating it; do not change the project's `.gitignore` only to hide agent state.
- If `work/` is not ignored, use an existing ignored directory or the project-external Codex task-state directory selected by `scripts/task-state.js`. The helper records one registry file per project under `$CODEX_HOME/task-states/index/` so concurrent tasks do not overwrite one shared index. A legacy `index.json` is read for compatibility but is not rewritten.
- A substantial read-only plan, diagnosis, or audit may write only non-sensitive Codex-local continuity state when the user mentions context loss, asks to continue later, or the work is clearly multi-stage. This exception does not permit project, Git, database, remote, service, browser, or business-state changes.
- At the start of a new task, replace or refresh stale completed state so it names the active goal, status, branch/stable point, current change boundary, and next step. An old task snapshot does not satisfy the requirement.
- Keep the state file short enough to read quickly, but concrete enough to resume safely.
- Do not commit task-state files unless the project or user explicitly requires that artifact.
- Never record secrets, tokens, passwords, private keys, production credentials, raw private logs, real user data, or sensitive configuration.
- Treat the state file as task memory, not as proof that the repository, runtime, remote, or production state is current. Re-check the real surface before acting.

## New-Conversation Resume Bootstrap

At the first engineering turn in each conversation:

1. Determine the current repository root or the narrowest known workspace path without reading broad parent trees.
2. Run `node <SKILL_DIR>/scripts/task-state.js resume --repo <PROJECT_OR_WORKSPACE_PATH> --json`.
3. The helper checks an exact project state first. If the supplied path is a workspace parent, it consults only registered unfinished descendant projects under `$CODEX_HOME/task-states/index/`; it does not scan project directories or the whole machine.
4. If exactly one unfinished descendant is registered, resume output identifies it. If several remain, do not choose blindly; show the short candidate list and ask only which business task should continue.
5. If no active or blocked state exists, continue with the newest user request and initialize state only when the selected lane requires it.
6. If matching unfinished state exists, read it before planning or editing. Re-check repository path, branch, `HEAD`, current diff, user-owned changes, prohibited operations, and the newest user request.
7. If state conflicts with current reality or the newest request, current reality and the newest request win. Mark stale evidence pending instead of following it blindly.
8. Completed state is history. Do not silently resume it or use it to replace a new goal.

If multiple projects or active tasks remain ambiguous after matching the current project and branch, explain the conflict in plain language and ask only which business task should continue.

## Layered Memory Model

Do not dump everything into one prompt or one huge note. Use layers:

- L0 evidence: raw command output, logs, screenshots, reports, diffs, browser findings, API responses, or user-provided artifacts. Keep these in existing output paths or referenced files when they are safe to store.
- L1 facts: concise extracted facts, constraints, decisions, risks, file paths, commands, and validation results.
- L2 scenario: task-level summary of current goal, architecture slice, implementation plan, changed files, blocked items, and rollback path.
- L3 durable preference: stable user or project rules that should be promoted only when the user explicitly asks to update long-term memory or repository policy.

For normal Codex work, `work/task-state.md` should mostly contain L1 and L2. It should point to L0 evidence paths instead of copying long raw logs.

## Progressive Disclosure

Load only the memory needed for the current step:

- Start with the task-state summary.
- Drill down to referenced diffs, logs, reports, screenshots, PRs, commits, or source files only when needed.
- Do not inject full historical logs into context when a short summary plus evidence pointer is enough.
- If the summary conflicts with current Git status, file content, live process state, PR status, database state, or the user's latest message, the current real surface wins.
- When continuing after compaction, read task state, current Git status, current diff, and the newest user request before making or reporting changes.

## Traceability

Every important remembered claim should have a way back to evidence:

- Decision -> why it was chosen -> alternatives rejected.
- Finding -> file/line, command, log, report, screenshot, API response, or source artifact.
- Validation -> command run -> result summary -> remaining unverified area.
- Git delivery -> branch -> commit -> push/PR/CI state -> rollback command.
- External source idea -> source URL or repo commit -> adapted local rule.

Avoid irreversible summaries such as "everything is done" or "tests passed" without command names, outputs, paths, commit IDs, or PR links.

## Task-State Template

For every task that requires state, keep a compact structure like this:

```md
# Task State

- Task ID:
- Updated at:
- Latest user goal:
- Acceptance criteria:
- Task status: active, blocked, or complete
- Implementation status: not started, in progress, or complete
- Verification status: pending, passed, failed, or unavailable
- Current mode:
- Current lane and reason:
- Repository/path:
- Branch and stable point:
- Current fingerprint:
- Verified fingerprint:
- Existing user changes:
- Authorization:
- Do-not-touch:
- Source references:
- Decisions:
- Changed/planned files:
- Validation evidence:
- Current blockers:
- Next step:
- PR/CI/remote state:
- Rollback:
- Unverified risk:
```

## Task-State Helper

The skill includes `scripts/task-state.js` and its internal `scripts/task-state-core.js` module, implemented with the Node.js standard library and no external service.

Common commands:

```text
node <SKILL_DIR>/scripts/task-state.js resume --repo <PROJECT_OR_WORKSPACE_PATH> --json
node <SKILL_DIR>/scripts/task-state.js init --repo <PROJECT_PATH> --goal "<GOAL>" --lane "<LANE>"
node <SKILL_DIR>/scripts/task-state.js implementation-complete --repo <PROJECT_PATH>
node <SKILL_DIR>/scripts/task-state.js run --repo <PROJECT_PATH> -- <PROGRAM> <ARGS...>
node <SKILL_DIR>/scripts/task-state.js check --repo <PROJECT_PATH>
node <SKILL_DIR>/scripts/task-state.js finalize --repo <PROJECT_PATH>
```

Rules:

- `resume` is read-only. It checks the exact project first, then only registered unfinished projects below the supplied workspace path; it does not scan the disk.
- `init` refuses to overwrite a different active task. Completed state is copied to an ignored/project-external history directory before reuse.
- `update` cannot directly set task/implementation state to complete or verification to passed; those transitions require the dedicated commands.
- `run` executes one validation command without a shell, records its exit result, and binds successful evidence to the current Git fingerprint, including untracked file content. Do not pass secrets in command arguments.
- `check` automatically invalidates a passing result when the current fingerprint differs from the verified fingerprint, and returns failure until implementation is complete and current verification is ready for finalization.
- `finalize` succeeds only when implementation is complete, verification passed, and the verified fingerprint still matches the current diff.
- For non-Git projects, the helper can store and discover state but cannot prove a repository fingerprint; use timestamped backups and explicit file hashes/evidence, and do not claim automatic current-diff proof.

## Automatic State Transitions

Codex must update these fields itself. The user does not need to ask it to change task state.

- Before the first source-code edit: task active, implementation in progress, verification pending.
- After code implementation but before validation: run `implementation-complete`; keep the task active and verification pending.
- Run required checks through `run` when practical. A successful command records evidence for the current fingerprint but does not complete the task by itself.
- After all required checks pass, run `check`, then `finalize`. Only `finalize` may set task complete when the fingerprint still matches.
- If a check fails: task active unless genuinely blocked, verification failed, with the failing command/evidence and next repair step recorded.
- If required validation cannot run: task active or blocked, verification unavailable, with the reason and remaining risk recorded. Do not mark the task complete.
- If source code changes after a passing check: the previous evidence becomes stale for the new diff. Immediately return task status to active and verification status to pending, then revalidate.
- "Tested" only describes an attempted action. Use passed, failed, or unavailable to describe the result.

Update state at meaningful phase boundaries: before the first source-code edit, after implementation, after validation, after an authorized commit/push/review request/merge/deploy action, and when the task is complete. Do not rewrite it for every small edit or test retry.

Task state counts as maintained only when its goal, task/implementation/verification statuses, branch, changed/planned files, validation summary, next step, and prohibited operations still match current reality.

## External Memory Systems

TencentDB Agent Memory and similar systems can be useful as optional infrastructure because they emphasize layered memory, asset permissions, code graphs, wiki-style knowledge, skill extraction, and retrieval budgets. They are not a default dependency for this skill.

Before using any external memory system, all of these must be true:

- The user explicitly asks to use or integrate it.
- It is already installed/configured or the user explicitly authorizes installation.
- Its data location, network endpoints, credentials, retention, ACL, and visibility are understood.
- It will not capture secrets, private logs, production data, user data, or repository contents outside the approved scope.
- It will not proxy model traffic or modify agent behavior without explicit user approval.
- Its recalled memory is treated as a hint, not truth; verify against current files, Git, runtime, and external systems before acting.

Built-in Codex Memories may carry useful context across conversations, but generation can be delayed or skipped. Use them as a secondary hint only. If the host provides other safe read-only memory, wiki, or code graph tools, use them only as evidence pointers. Do not let recalled memory override project-local `AGENTS.md`, the user's latest request, task state, current repository state, or security boundaries.

## Completion Rule

At the end of a long task, the final answer should match the state file:

- What changed.
- What was verified.
- Whether there is a local recovery point, a remote task copy, or a review request.
- Whether the work entered the formal branch.
- Remaining risk and rollback.

Then mark the local task-state file complete. Do not stage it unless it is intentionally part of the deliverable.
