# fuyunsk

`fuyunsk` maintains one Codex skill: `production-engineering`.

The current release is performance-first. The skill is **explicit-only by default** so normal chat does not carry a large engineering workflow.

## Why This Changed

Older versions combined:

- implicit skill invocation;
- a large global `AGENTS.md` fallback;
- optional personal instructions;
- automatic first-turn task recovery.

That design was safe but expensive. Even a greeting could inherit engineering rules, skill routing, and continuity guidance. The new default keeps ordinary turns small and loads the workflow only when it is requested.

## Usage

For ordinary chat, just chat normally.

For real project work, invoke the skill explicitly:

```text
$production-engineering 修一下这个报错，先只改本地并验证。
```

```text
$production-engineering 检查这个仓库有没有隐藏 Bug，先别改。
```

```text
$production-engineering 优化完成后提交到仓库，但不要合并主线。
```

The explicit prefix is intentional. It trades a few typed characters for predictable performance and prevents accidental engineering context injection.

## Authorization

| What the user says | Authorized result |
| --- | --- |
| “改一下 / 修一下 / 做一个” | Scoped local edits and validation |
| “保存好 / 留个恢复点” | Local commit or recoverable backup |
| “上传仓库 / 提交到仓库” | Validated task-branch push |
| “开 PR / 提交审核” | Create or update a review request |
| “搞到主线 / 正式用这个版本” | Normal formal-branch integration after checks |
| “上线 / 部署” | Confirm the exact environment, risk, and rollback first |

Production, database writes, data deletion, credentials, payments, permissions, security policy, CI/CD, force push, direct formal-branch writes, and remote settings remain high risk.

## Install

Ask Codex to install or update:

```text
请安装或原位更新这个 skill：
https://github.com/fuyunnat/fuyunsk/tree/main/skills/production-engineering

保持 policy.allow_implicit_invocation: false。
不要默认合并 global-AGENTS.example.md 或 docs/personal-custom-instructions.md。
同名 skill 只保留一份。
```

The client chooses the active user-level skill directory. Do not install duplicate copies under both `~/.agents/skills` and `~/.codex/skills`.

Detailed migration and verification steps are in [docs/ai-installation.md](docs/ai-installation.md).

## Performance Model

The workflow now uses progressive disclosure:

1. Normal turn: no production-engineering workflow.
2. Explicit invocation: load `SKILL.md` and `references/routing.md`.
3. Implementation or delivery: add `references/task-lanes.md`.
4. Specialized work: add only the matching reference.
5. Full specification: search and load only the needed heading.
6. Task-state recovery: only for continuation, handoff, multi-stage work, or context-loss risk.

Do not install both global fallback documents. Most users need neither.

## Capabilities

When explicitly invoked, the skill supports:

- implementation, debugging, refactoring, and focused validation;
- code review, security review, vulnerability and backdoor investigation;
- Git commits, pushes, review requests, formal integration, and rollback reporting;
- database-compatible evolution and production-risk handling;
- frontend/admin UI quality;
- engineering documentation and release notes;
- durable task state for genuine long-running or interrupted work.

## Structure

```text
skills/production-engineering/
  SKILL.md
  agents/openai.yaml
  scripts/task-state.js
  scripts/task-state-core.js
  references/routing.md
  references/task-lanes.md
  references/context-memory-continuity.md
  references/code-risk-review.md
  references/content-writing-quality.md
  references/frontend-interface-quality.md
  references/wrapped-workspace-ui.md
  references/project-understanding.md
  references/full-production-engineering.md

global-AGENTS.example.md
docs/personal-custom-instructions.md
docs/ai-installation.md
scripts/validate-skill.js
scripts/validate-routing-cases.js
tests/routing-cases.json
```

## Optional Global Fallback

`global-AGENTS.example.md` and `docs/personal-custom-instructions.md` are optional short fallbacks. Choose at most one. Neither should auto-load the skill.

To restore automatic invocation, an advanced user may change:

```yaml
policy:
  allow_implicit_invocation: true
```

This is not the recommended default because it can increase context size and latency.

## Validation

Repository maintenance should run:

```bash
node scripts/validate-skill.js
git diff --check
```

The validator enforces explicit-only invocation, prompt-size budgets, routing cases, repository hygiene, and task-state helper checks.

## Migration

From an older release:

1. Back up the current skill directory and global instructions.
2. Update the skill in place.
3. Remove the old long production-engineering block from global `AGENTS.md`.
4. Remove duplicate personal/global copies.
5. Confirm `allow_implicit_invocation: false`.
6. Restart Codex if the client does not refresh automatically.
7. Test a normal greeting and an explicit `$production-engineering` request.

The old commit remains available in Git history for rollback.
