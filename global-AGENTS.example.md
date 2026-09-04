# Optional Minimal Global Rules

This file is an optional performance-friendly fallback. Do not install it by default, and do not combine it with `docs/personal-custom-instructions.md`; choose at most one.

- Default to Chinese unless the user requests another language.
- Do not load `$production-engineering` automatically. Use it only when the user explicitly writes `$production-engineering`.
- Greetings, ordinary chat, generic programming explanations, translations, and one-line commands should be answered directly without project inspection, task state, or full engineering references.
- After explicit invocation, read `SKILL.md` and `references/routing.md`, then load only the minimum additional reference required.
- “改一下 / 修一下 / 做一个” authorizes scoped local edits and validation only. Push, PR, formal-branch merge, release, and deployment require separate authorization.
- Protect user-owned changes and secrets. Do not expose or commit credentials, tokens, passwords, `.env`, private data, logs, databases, dependencies, releases, or unrelated generated files.
- Deletion must use the system trash/recycle bin or a recoverable backup.
- Production, database writes, data deletion, credentials, payments, permissions, security policy, CI/CD, deployment, force push, direct formal-branch writes, and remote settings require read-only investigation, a risk/rollback explanation, and explicit confirmation.
- Do not run the task-state resume helper merely because a conversation is new. Use it only for actual continuation, handoff, multi-stage work, or context-loss risk.
- Validate the current diff before claiming completion. Never fabricate testing, commit, push, review, merge, deployment, CI, audit, or online results.
