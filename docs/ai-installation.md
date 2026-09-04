# AI Installation Guide

Install the skill in performance-first, explicit-only mode.

## Installation Request

Send this to Codex:

```text
请安装或原位更新这个 skill：

https://github.com/fuyunnat/fuyunsk/tree/main/skills/production-engineering

要求：
1. 识别当前客户端实际使用的用户级 skill 目录；同名 skill 只保留一份，不要同时安装到 ~/.agents/skills 和 ~/.codex/skills。
2. 已有同名 skill 时，先做可恢复备份，再原位更新。
3. 安装后确认 SKILL.md、agents/openai.yaml、references/routing.md、references/task-lanes.md 和 scripts/task-state.js 存在。
4. 确认 agents/openai.yaml 中 policy.allow_implicit_invocation 为 false。
5. 默认不要把 global-AGENTS.example.md 或 docs/personal-custom-instructions.md 合并到全局上下文。确需兜底时二选一，并保持内容最小。
6. 发现旧版长全局规则、旧个性化提示词或两个目录中的重复 skill 时，先备份，再移除重复或替换为当前短版；不要直接覆盖用户其他规则。
7. 运行 node <SKILL_DIR>/scripts/task-state.js self-test。
8. 用“你好”和“解释一下 JavaScript 闭包”验证不会自动加载 skill。
9. 再用“$production-engineering 看看当前项目有没有问题，先别改”验证显式调用可用。
10. 不要因为新对话自动运行 task-state resume；只有继续旧任务、交接、多阶段工作或上下文丢失风险时才运行。
11. 最后报告实际安装路径、备份路径、是否存在重复副本、隐式调用是否关闭，以及三项验证结果。
```

## Expected Layout

```text
<SKILL_DIR>/
  SKILL.md
  agents/openai.yaml
  scripts/task-state.js
  scripts/task-state-core.js
  references/routing.md
  references/task-lanes.md
  references/context-memory-continuity.md
```

Use the directory selected by the current Codex client. Do not copy another machine's absolute path.

## Performance Rules

- Install the skill itself first.
- Do not preload the whole repository.
- Do not install both global fallback files.
- Keep `allow_implicit_invocation: false`.
- Invoke the workflow explicitly with `$production-engineering`.
- Load `routing.md` first, then only the reference needed.
- Do not run task-state recovery for ordinary new conversations.

## Migration From Older Versions

Older releases recommended implicit invocation plus a large global `AGENTS.md` fallback. That could make every turn carry engineering policy even when the user only said “hi”.

Migration:

1. Back up the current global `AGENTS.md`, personal instructions, and installed skill directory.
2. Update the skill in place.
3. Remove the old production-engineering block from global instructions, or replace it with the current minimal example.
4. Do not keep the same rules in both global instructions and personal instructions.
5. Remove duplicate installations after confirming the active directory.
6. Restart Codex only when the client does not refresh skills automatically.
7. Verify both a normal chat turn and an explicit skill turn.

## Manual Checks

Replace `<SKILL_DIR>` with the actual path:

```bash
test -f <SKILL_DIR>/SKILL.md
test -f <SKILL_DIR>/agents/openai.yaml
test -f <SKILL_DIR>/references/routing.md
grep -F 'allow_implicit_invocation: false' <SKILL_DIR>/agents/openai.yaml
node <SKILL_DIR>/scripts/task-state.js self-test
```

Normal usage now requires explicit invocation:

```text
$production-engineering 修一下这个报错，先只改本地并验证。
```
