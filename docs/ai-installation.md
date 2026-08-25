# AI 安装教程

把下面整段发给 Codex。用户不需要先了解 skill、Git 或安装目录。

```text
请安装并启用这个工程 skill，并让当前任务和后续工程任务都能按规则使用：

https://github.com/fuyunnat/fuyunsk/tree/main/skills/production-engineering

要求：

1. 先识别当前 Codex 实际使用的用户级 skill 目录，并检查是否已经存在 `production-engineering`。OpenAI 当前文档列出 `$HOME/.agents/skills`；部分现有客户端和内置安装器仍使用 `$CODEX_HOME/skills`，默认通常是 `~/.codex/skills`。以当前客户端的可用 skill 列表、安装器结果和现有目录为准，不要照抄其他人的 `/Users/...` 或 `C:\\Users\\...` 路径。
2. 使用当前 Codex 自带的 `$skill-installer` 从上述 GitHub 路径安装，并记录 `production-engineering` 的实际完整目录为 `<SKILL_DIR>`。如果同名 skill 已存在，先建立带时间戳的可恢复备份，再原位更新；不得在 `.agents/skills` 和 `.codex/skills` 各装一份。不要安装整个仓库，也不要引入第三方 skill、hooks、代理框架或额外依赖。
3. 安装后确认 `<SKILL_DIR>/` 下的 `SKILL.md`、`agents/openai.yaml`、`scripts/task-state.js`、`scripts/task-state-core.js`、`references/routing.md`、`references/task-lanes.md`、`references/context-memory-continuity.md`、`references/content-writing-quality.md` 和 `references/full-production-engineering.md` 都存在。
4. 检查 `agents/openai.yaml`：`policy.allow_implicit_invocation` 必须是 `true`，`default_prompt` 必须包含 `$production-engineering`。不要声称这等于所有宿主和所有说法都能 100% 自动触发。
5. 读取我现有的全局 `AGENTS.md` 和客户端个性化自定义提示词。修改前建立带时间戳的可恢复备份。全局 `AGENTS.md` 以仓库的 `global-AGENTS.example.md` 为参考；只有客户端提供独立的个性化提示词输入框时，才使用 `docs/personal-custom-instructions.md`，并把其中的 `<SKILL_DIR>` 替换成第 2 步确认的实际完整目录。不要保留未替换占位符，不要把两份全文重复塞进同一个位置，保留原有规则并去掉重复内容，不能整文件盲目覆盖。
6. 验证全局硬门禁至少包含：工程写操作路由到 `$production-engineering`；先读取 `SKILL.md` 和 `routing.md`；读不到或无法确认接管时停止写操作；职责边界和文件拆分；删除进入回收站；保护用户已有改动；数据库字段和历史数据默认兼容演进；本地修改、远端保存、评审、合并和部署分开授权。
7. 安装完成后不要要求我另开任务。在当前任务中立即读取已安装的 `SKILL.md` 和 `routing.md`，并明确输出：`已使用 $production-engineering，并已读取 SKILL.md / routing.md。`
8. 运行 `node <SKILL_DIR>/scripts/task-state.js self-test`。再对当前项目或工作区运行 `node <SKILL_DIR>/scripts/task-state.js resume --repo <PROJECT_OR_WORKSPACE_PATH> --json`，确认命令只读取精确项目或本地索引登记的下级项目，不扫描磁盘，也不会覆盖未完成状态。
9. 用普通话做一次只读验证，例如“看看当前项目有没有问题，先别改”。确认它会先路由到该 skill，且不会因为“看看”而修改文件或 Git。验证过程不得制造业务改动。
10. 最后检查没有写死安装者路径、没有泄露远端凭证、没有覆盖旧规则，也没有新增计划外文件。

最终请用中文告诉我：

- 安装到了哪里。
- 旧规则备份在哪里，合并了哪些硬门禁。
- 隐式调用配置是否开启，当前任务是否已经读取 skill。
- 任务状态助手自测、恢复检查和只读路由验证分别是什么结果。
- 日常使用是否还需要手动写 `$production-engineering`；如果仍有宿主限制，要直接说明。
```

## 手动检查

优先让当前 Codex 的 `$skill-installer` 完成安装，不要猜安装脚本或目标目录。安装器应返回实际路径；下面命令只适用于它确认使用 `$HOME/.agents/skills` 的情况。如果安装器返回 `$CODEX_HOME/skills`，把检查路径替换成实际目录，不要两套命令都执行。

```bash
test -f ~/.agents/skills/production-engineering/SKILL.md
test -f ~/.agents/skills/production-engineering/agents/openai.yaml
test -f ~/.agents/skills/production-engineering/scripts/task-state.js
test -f ~/.agents/skills/production-engineering/scripts/task-state-core.js
test -f ~/.agents/skills/production-engineering/references/routing.md
test -f ~/.agents/skills/production-engineering/references/task-lanes.md
test -f ~/.agents/skills/production-engineering/references/project-understanding.md
test -f ~/.agents/skills/production-engineering/references/content-writing-quality.md
test -f ~/.agents/skills/production-engineering/references/full-production-engineering.md
grep -F 'allow_implicit_invocation: true' ~/.agents/skills/production-engineering/agents/openai.yaml
grep -F '$production-engineering' ~/.agents/skills/production-engineering/agents/openai.yaml
node ~/.agents/skills/production-engineering/scripts/task-state.js self-test
```

Windows PowerShell 不需要写复杂脚本。确认安装器返回的实际路径后，使用简单的 `Test-Path` 逐个检查即可；下面展示 OpenAI 当前文档中的用户级目录：

```powershell
Test-Path "$env:USERPROFILE\.agents\skills\production-engineering\SKILL.md"
Test-Path "$env:USERPROFILE\.agents\skills\production-engineering\agents\openai.yaml"
Test-Path "$env:USERPROFILE\.agents\skills\production-engineering\scripts\task-state.js"
Test-Path "$env:USERPROFILE\.agents\skills\production-engineering\scripts\task-state-core.js"
Test-Path "$env:USERPROFILE\.agents\skills\production-engineering\references\routing.md"
node "$env:USERPROFILE\.agents\skills\production-engineering\scripts\task-state.js" self-test
```

当前路径规则见 OpenAI Docs 的 [Build skills](https://learn.chatgpt.com/docs/build-skills)。Codex 通常会自动发现 skill 变更；如果没有出现，再重启客户端。

## 重要边界

- `allow_implicit_invocation: true` 表示允许隐式选择，不等于任何 Codex 版本、任何宿主、任何说法都能 100% 命中。
- 最稳做法是：安装 skill + 保留隐式调用配置 + 个性化提示词短硬门禁 + 全局或项目 `AGENTS.md` 兜底。
- 已开始的任务可能不会自动重新加载刚写入的全局文件。安装代理应在当前任务中直接读取已安装的 `SKILL.md` 和 `routing.md`，不应把“另开任务”当成唯一办法。
- 日常使用时，用户只需要说目标。显式写 `$production-engineering` 主要用于排查自动路由或临时加强约束。
