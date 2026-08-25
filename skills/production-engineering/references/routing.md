# Production Engineering Routing

Use this file first after the skill triggers.

## Task Modes

- **Read-only mode**: understanding a project, architecture teardown, explaining code, planning, review, diagnosis, audit, security review, or "先看/先理解/别改/不要动代码". Inspect only; do not modify files, Git, databases, remotes, or external state.
- **Implementation mode**: user asks to add, modify, fix, refactor, build, deliver, start and verify, commit, push, or package. Edit only after real project inspection and Git/non-Git recovery checks.
- **Security audit mode**: user asks for vulnerabilities, backdoors, suspicious logic, unsafe code, or whether the project is secure. Default read-only. Do not run unknown code. Stop and preserve evidence if a suspected backdoor appears.
- **High-risk mode**: production, database writes, data deletion, credentials, payments, balances, orders, authorization, security policy, CI/CD, deployment config, remote repository settings, force push, direct main branch push, or destructive filesystem work. Do read-only investigation first; risky writes require explicit confirmation.

## Beginner-First Interaction

The user should be able to describe the goal in ordinary language. Codex must inspect the repository and decide branch names, stable points, tests, review flow, and rollback mechanics without turning those technical choices into user homework.

Ask the user only when a missing answer changes business behavior or authorizes a risky effect. Do not ask which base branch, rebase mode, merge strategy, CI job, or Git command to use when the repository can answer it.

Interpret common phrases as follows:

- **“改一下 / 修一下 / 做一个”**: inspect, make scoped local changes, and verify them. This does not authorize push, a review request, main-line merge, release, or deployment.
- **“保存好 / 留个恢复点 / 别丢了”**: create a local Git commit or a recoverable non-Git backup after suitable validation. This does not authorize remote upload unless the user also says the repository or remote should contain it.
- **“上传仓库 / 提交到仓库 / 同步 GitHub / 别只放本地”**: commit and push the current task branch after validation. Do not create a review request or merge the formal branch unless separately requested.
- **“开 PR / 提交审核 / 准备合并”**: create or update the repository's review request after checking the branch and diff. This does not authorize merging it.
- **“搞到主线 / 合并到主库 / 正式用这个版本”**: explicit authorization to prepare and perform the normal merge only after validation, CI/status checks when available, and a plain-language risk summary.
- **“上线 / 部署”**: identify the exact target environment first. Production or unclear deployment targets require a risk and rollback explanation before execution.
- **“删除 / 清理”**: use the system trash or a recoverable backup. Broad, ambiguous, cross-disk, production, or data deletion requires exact-target confirmation.

Translate unavoidable terms immediately. For example, explain a task branch as “an isolated copy that does not affect the formal version” and a review request as “a request waiting to be checked and merged; it is not formal yet.”

## Default Workflow

1. Use the newest user request to select the task mode.
2. On the first engineering turn in a conversation, run `node <SKILL_DIR>/scripts/task-state.js resume --repo <PROJECT_OR_WORKSPACE_PATH> --json`. A negative result does not require loading `context-memory-continuity.md`; read it when unfinished state is found or the selected lane requires durable state.
3. For implementation, delivery, high-risk, or uncertain-impact work, read `task-lanes.md`; it alone selects quick, standard, full, and additive lanes.
4. Inspect applicable project rules, real entrypoints/config/scripts, Git or backup boundaries, and user-owned changes.
5. Define the smallest change, protected old behavior, acceptance criteria, prohibited scope, and responsibility/file boundary.
6. Implement only the authorized scope.
7. Validate the current diff, review it for regressions/unrelated changes/secrets, and update task state when required.
8. Report plainly what changed, verification evidence, local/remote/formal state, rollback, and remaining risk.

## Execution Cost Control Workflow

1. `task-lanes.md` is authoritative for lane selection and validation depth. The full specification supplies detailed checks but cannot reclassify a task or expand authorization.
2. Cost control never bypasses user-change protection, recovery, deletion safety, secrets, high-risk confirmation, remote authorization, current-diff validation, or truthful reporting.
3. Escalate when impact becomes uncertain, shared/high-risk surfaces appear, tests fail, or the diff contains unexplained changes.

## Responsibility Boundary Workflow

For implementation work, identify where page/component, state/store, API/client, business/domain/service, persistence/migration, config, utilities, and tests live before editing. Do not keep appending unrelated features to the current file; split mixed responsibilities using the project structure, or state why one cohesive file is clearer.

## Bug And Risk Review Routing

- For bugs or errors, locate the real file/function/route/config/log/call chain first and identify the smallest evidence-backed fix. Do not begin with broad edits or unrelated refactors.
- For vague review, hidden bugs, security, vulnerabilities, or backdoors, read `code-risk-review.md`. Audit stays read-only until the user asks to fix.
- Report confirmed findings separately from suspicions and unreviewed areas.

## Context Memory Workflow

When a standard or full implementation modifies source code, a task changes more than one source-code file, or the user mentions context loss, compaction, handoff, repeated work, long-running development, "别忘了", "继续开发", "上下文不见了", or "AI 忘记事情了":

1. Read `context-memory-continuity.md` and reuse the first-turn resume result. Run the bounded project/workspace check now only if the lightweight bootstrap was not already executed.
2. Required implementation state must exist before the first source-code edit. Substantial read-only planning may write only Codex-local continuity metadata when continuation risk is explicit; project and external business state remain read-only.
3. Use the provided helper to locate/register state, record current-diff verification, detect stale evidence, and prevent completion after later edits.
4. Codex updates task, implementation, and verification status at phase boundaries without waiting for the user.
5. Built-in memories are secondary hints. The state file plus current project/Git/runtime are the recovery source of truth.

## Content Writing Quality Workflow

For README files, engineering docs, installation guides, changelogs, release notes, PR descriptions, customer notes, admin UI copy, or product settings copy, read `content-writing-quality.md` proactively. Preserve facts and evidence; remove chat residue, filler, generic praise, and unsupported claims.

## Project Understanding Workflow

For project understanding, architecture teardown, or repository onboarding, read `project-understanding.md` and stay read-only. Start with the project essence, main flow, core constraints, 2 to 4 important mechanisms, and the next deep-dive direction; separate facts, inferences, unknowns, and next checks.

## Detailed Reference Map

Read targeted sections from `full-production-engineering.md`:

- Priority, modes, requirements, and risk boundaries: `## 零`, `## 一`, `## 二`, `## 五`, `## 六`.
- Git, branches, commits, remote review, CI, and rollback: remote overlay in `task-lanes.md`, then `## 三`, `## 四`.
- Context continuity and task state: `context-memory-continuity.md`, then search `上下文续航` only when more detail is needed.
- Frontend/admin/UI work: `frontend-interface-quality.md`, then `## 九` when needed.
- Backend/API/database/concurrency: `## 八`, `## 十`, `## 十三`, `## 十四`.
- Performance/flags/config/deployment/dependencies: `## 十一`, `## 十二`, `## 十五`, `## 十六`.
- Security/logging/testing/completion: `## 十七` through `## 二十四` as applicable.
