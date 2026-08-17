# Context Memory Continuity

Use this reference for long tasks, multi-stage development, context compaction recovery, task handoff, repeated project work, "别忘了", "继续开发", "上下文不见了", "AI 忘记事情了", or any task that needs durable working memory.

This file absorbs general memory-system ideas from TencentDB Agent Memory without depending on that project. Do not install, start, configure, or call any external memory server, proxy, database, hook, plugin, or network service unless the user explicitly asks for that integration and confirms the operational risk.

## Default Local Memory

The default mechanism is still local, white-box, and recoverable:

- Use `work/task-state.md` or an equivalent ignored task-state file for active task memory.
- Keep the state file short enough to read quickly, but concrete enough to resume safely.
- Do not commit task-state files unless the project or user explicitly requires that artifact.
- Never record secrets, tokens, passwords, private keys, production credentials, raw private logs, real user data, or sensitive configuration.
- Treat the state file as task memory, not as proof that the repository, runtime, remote, or production state is current. Re-check the real surface before acting.

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

For long or risky tasks, keep a compact structure like this:

```md
# Task State

- Latest user goal:
- Current mode:
- Current channel:
- Repository/path:
- Branch and stable point:
- Existing user changes:
- Do-not-touch:
- Source references:
- Decisions:
- Changed files:
- Commands and results:
- Current blockers:
- Next step:
- PR/CI/remote state:
- Rollback:
- Unverified risk:
```

Update it at phase boundaries: before edits, after implementation, after validation, after commit/push/PR, and when the task is complete.

## External Memory Systems

TencentDB Agent Memory and similar systems can be useful as optional infrastructure because they emphasize layered memory, asset permissions, code graphs, wiki-style knowledge, skill extraction, and retrieval budgets. They are not a default dependency for this skill.

Before using any external memory system, all of these must be true:

- The user explicitly asks to use or integrate it.
- It is already installed/configured or the user explicitly authorizes installation.
- Its data location, network endpoints, credentials, retention, ACL, and visibility are understood.
- It will not capture secrets, private logs, production data, user data, or repository contents outside the approved scope.
- It will not proxy model traffic or modify agent behavior without explicit user approval.
- Its recalled memory is treated as a hint, not truth; verify against current files, Git, runtime, and external systems before acting.

If the host provides safe read-only memory, wiki, or code graph tools, use them only as evidence pointers. Do not let recalled memory override project-local `AGENTS.md`, the user's latest request, current repository state, or security boundaries.

## Completion Rule

At the end of a long task, the final answer should match the state file:

- What changed.
- What was verified.
- Branch, commit, push, PR, and CI state.
- What did not enter main.
- Remaining risk and rollback.

Then mark the local task-state file complete. Do not stage it unless it is intentionally part of the deliverable.
