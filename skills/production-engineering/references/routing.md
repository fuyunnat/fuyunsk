# Production Engineering Routing

Use this file first after the skill triggers.

## Task Modes

- **Read-only mode**: understanding a project, explaining code, planning, review, diagnosis, audit, security review, or "先看/先理解/别改/不要动代码". Inspect only; do not modify files, Git, databases, remotes, or external state.
- **Implementation mode**: user asks to add, modify, fix, refactor, build, deliver, start and verify, commit, push, or package. Edit only after real project inspection and Git/non-Git recovery checks.
- **Security audit mode**: user asks for vulnerabilities, backdoors, suspicious logic, unsafe code, or whether the project is secure. Default read-only. Do not run unknown code. Stop and preserve evidence if a suspected backdoor appears.
- **High-risk mode**: production, database writes, data deletion, credentials, payments, balances, orders, authorization, security policy, CI/CD, deployment config, remote repository settings, force push, direct main branch push, or destructive filesystem work. Do read-only investigation first; risky writes require explicit confirmation.

## Default Workflow

1. Confirm scope and task mode from the newest user request.
2. Inspect local rules and real project state before assumptions.
3. If modifying files, check Git state first. If not a Git repo, create a timestamped backup before overwriting existing files.
4. Define the smallest safe change and what existing behavior must remain unchanged.
5. Implement only the scoped change.
6. Verify with commands appropriate to the risk.
7. Review diffs for unrelated changes, secrets, large files, generated artifacts, and accidental formatting.
8. Final response: what changed, verification evidence, rollback path, unverified areas, remaining risk.

## Bug Report Workflow

When the user reports a bug, error, abnormal UI, failing API, broken command, or unexpected behavior:

1. Do not start with broad code edits.
2. First locate likely relevant files, functions, routes, configs, logs, tests, or call chains.
3. Before editing, state the observed symptom, likely root cause, evidence, files to change, smallest fix, and old behavior that must remain unchanged.
4. If the user says "directly fix" or the bug blocks execution, locate and fix in one pass, but still report root cause, evidence, validation, and residual risk.
5. Do not refactor unrelated code, format the whole repo, or expand scope unless the evidence requires it.

## Detailed Reference Map

Read targeted sections from `full-production-engineering.md`:

- Global priority and task modes: `## 零`, `## 一`, `## 二`.
- Git gate and delivery: `## 三`, `## 四`.
- Bug-first diagnosis: `Bug 修复前置规则`.
- Risk and requirement boundaries: `## 五`, `## 六`.
- Module/file size and comments: `## 七`.
- Backend: `## 八`.
- Frontend/admin pages: `## 九`.
- Detailed frontend interface quality and UI review: `frontend-interface-quality.md`.
- API compatibility: `## 十`.
- Performance/capacity: `## 十一`.
- Feature flags and rollback: `## 十二`.
- Database and migration: `## 十三`.
- Concurrency/idempotency: `## 十四`.
- Config/deployment: `## 十五`.
- Dependencies/supply chain: `## 十六`.
- Security: `## 十七`, `## 十九`.
- Logging/observability: `## 十八`.
- Testing and quality evidence: `## 二十`.
- Minimal-change principle: `## 二十一`.
- Definition of done and final output: `## 二十二`, `## 二十三`, `## 二十四`.

## Admin Frontend Default

For newly created admin pages, management consoles, configuration pages, or operations dashboards when the user does not specify another stack:

- Use Vue 3 + Vite.
- Use Ant Design Vue for tables, forms, modals, drawers, menus, pagination, messages, and common states.
- Use Pinia only for real cross-page, cross-module, or global admin state.
- Use Vue Router for multiple pages, menu navigation, details pages, or permission routes.
- Use ordinary `.vue` / `.js`; do not convert the admin project to TypeScript unless explicitly requested.
- For existing projects, always follow the real current stack instead of this default.

For frontend pages, admin pages, management consoles, configuration pages, operations dashboards, shared UI components, or UI review tasks, also read `frontend-interface-quality.md`.
