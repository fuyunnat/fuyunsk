# AI 安装教程

把下面这段话发给 Codex，让它按步骤安装并验证本仓库的 `production-engineering` skill。

```text
请安装并启用这个生产工程 skill：

https://github.com/fuyunnat/fuyunsk/tree/main/skills/production-engineering

要求：

1. 使用 Codex 的 skill 安装方式，把 `skills/production-engineering` 安装到本机 `~/.codex/skills/production-engineering`。
2. 安装后确认以下文件存在：
   - `~/.codex/skills/production-engineering/SKILL.md`
   - `~/.codex/skills/production-engineering/references/routing.md`
   - `~/.codex/skills/production-engineering/references/task-lanes.md`
   - `~/.codex/skills/production-engineering/references/project-understanding.md`
   - `~/.codex/skills/production-engineering/references/content-writing-quality.md`
   - `~/.codex/skills/production-engineering/references/full-production-engineering.md`
3. 把仓库里的 `docs/personal-custom-instructions.md` 内容合并到我的 Codex 个性化自定义提示词或全局 `~/.codex/AGENTS.md`。
4. 如果写入 `~/.codex/AGENTS.md`，先备份原文件，不能直接覆盖丢失旧规则。
5. 验证个性化规则里包含 `$production-engineering`、`SKILL.md`、`routing.md` 和“读不到则停止写操作”。
6. 验证安装后的 skill 能被发现；如果不能确认自动触发，工程类任务必须显式或主动读取该 skill。
7. 不要引入 Ponytail 或其他第三方 skill、hooks、命令或多平台代理适配。

最终请用中文告诉我：

- 安装到了哪里。
- 个性化自定义提示词或 `AGENTS.md` 改了什么。
- 是否备份了旧文件，备份路径是什么。
- 如何验证。
- 以后我是否还需要每次手动写 `$production-engineering`。
```

## 手动命令

下面的 `~/.codex` 表示当前用户自己的 Codex 目录，不是固定机器路径。AI 安装时必须先识别当前环境的 Codex Home：优先使用 `$CODEX_HOME`，未设置时 macOS/Linux 通常是 `$HOME/.codex`；Windows 通常是 `%USERPROFILE%\\.codex` 或当前 Codex 客户端配置的目录。不得把其他人的 `/Users/...`、`C:\\Users\\...` 等绝对路径照抄到自己的机器。

如果 Codex 支持本地命令安装，可以使用：

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py --repo fuyunnat/fuyunsk --path skills/production-engineering
```

安装后检查：

```bash
test -f ~/.codex/skills/production-engineering/SKILL.md
test -f ~/.codex/skills/production-engineering/references/routing.md
test -f ~/.codex/skills/production-engineering/references/task-lanes.md
test -f ~/.codex/skills/production-engineering/references/project-understanding.md
test -f ~/.codex/skills/production-engineering/references/content-writing-quality.md
test -f ~/.codex/skills/production-engineering/references/full-production-engineering.md
```

## 重要边界

- Skill 的隐式自动触发依赖 Codex 当前版本和宿主匹配机制，不要声称所有场景 100% 自动触发。
- 最稳做法是：安装 skill + 个性化自定义提示词短硬门禁 + 全局或项目 `AGENTS.md` 兜底。
- 当前聊天如果已经开始，可能不会重新加载刚写入的全局文件；用户可以在当前聊天直接说“本聊天从现在开始必须按 `$production-engineering` 执行”。
