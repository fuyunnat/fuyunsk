# fuyunsk

`fuyunsk` maintains one Codex skill: `production-engineering`.

The current release is performance-first. The skill is **explicit-only by default** so normal chat does not carry a large engineering workflow.

## Why This Changed

Older versions combined implicit invocation, a large global fallback, optional personal instructions, and automatic first-turn recovery. That design was safe but expensive. The current default keeps ordinary turns small and loads engineering guidance only after the user invokes `$production-engineering`.

## Usage

For ordinary chat, just chat normally.

For real project work:

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

## Method Toolkit

After explicit invocation, the router loads only the method needed:

- `diagnosis-feedback-loop.md`: create an exact, fast feedback loop; reproduce and minimize; test falsifiable hypotheses; prove the regression is gone.
- `design-testing.md`: design small public interfaces around clean seams, test behavior instead of internals, implement vertical slices, and use expand–migrate–contract for wide changes.
- `spec-review.md`: synthesize specs from known context, split work into independently verifiable slices, map unresolved decisions, and review standards separately from intended behavior.
- existing references still own security/risk review, frontend quality, documentation, continuity, database safety, deployment, and Git delivery.

These methods are concise adaptations from [`mattpocock/skills`](https://github.com/mattpocock/skills) at commit `3cca18b368ae95cdbdebbff572ccafa662551015`. Attribution and design differences are recorded in [`references/upstream-notes.md`](skills/production-engineering/references/upstream-notes.md). The external repository is MIT-licensed; this skill does not depend on it at runtime.

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

The workflow uses progressive disclosure:

1. Normal turn: no production-engineering workflow.
2. Explicit invocation: load `SKILL.md` and `references/routing.md`.
3. Implementation or delivery: add `references/task-lanes.md`.
4. Specialized work: add only the matching method/reference.
5. Full specification: search and load only the needed heading.
6. Task-state recovery: only for continuation, handoff, multi-stage work, or context-loss risk.

Do not install both global fallback documents. Most users need neither. The methodology attribution file is maintenance documentation and is not loaded during normal tasks.

## Capabilities

When explicitly invoked, the skill supports:

- implementation, debugging, refactoring, and focused validation;
- feedback-loop-first diagnosis and performance measurement;
- interface/seam design, behavior-focused tests, TDD, vertical slices, and prototypes;
- specifications, work breakdown, decision maps, and two-axis diff review;
- code/security review, vulnerabilities, and backdoor investigation;
- Git commits, pushes, review requests, formal integration, and rollback reporting;
- database-compatible evolution and production-risk handling;
- frontend/admin UI quality and engineering documentation;
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
  references/diagnosis-feedback-loop.md
  references/design-testing.md
  references/spec-review.md
  references/upstream-notes.md
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

The validator enforces explicit-only invocation, prompt-size budgets, specialized method routing, upstream attribution, repository hygiene, and task-state helper checks.

## Migration

From an older release:

1. Back up the current skill directory and global instructions.
2. Update the skill in place.
3. Remove the old long production-engineering block from global `AGENTS.md`.
4. Remove duplicate personal/global copies.
5. Confirm `allow_implicit_invocation: false`.
6. Restart Codex if the client does not refresh automatically.
7. Test a normal greeting and an explicit `$production-engineering` request.

The old commits remain available in Git history for rollback.
