# fuyunsk

个人 Codex skill 仓库。当前只维护自家的 `production-engineering`，用于生产级工程交付、代码审计、修复、验证、Git/PR/CI、数据库、部署和后台页面开发流程。

本仓库不依赖 Ponytail 或其他第三方 skill。设计目标是让朋友安装后能直接使用同一套生产工程规则，并且在 skill 自动触发不稳定时，仍然可以通过 `AGENTS.md` 兜底。

前端界面质量规则已吸收通用 Web Interface Guidelines 思路，但改写成自家 `production-engineering` 参考文件：`skills/production-engineering/references/frontend-interface-quality.md`。不安装第三方 skill，不运行第三方安装脚本。

隐藏 Bug 审查规则已吸收“把泛化问题变成具体检查项”的思路，放在 `skills/production-engineering/references/code-risk-review.md`。当用户说“有没有问题”“帮我看看代码”“查隐藏 Bug”时，skill 会要求重点检查空值、重复请求、并发、权限、超时、异常处理和敏感信息泄露。

上下文记忆规则已吸收 TencentDB Agent Memory 的分层记忆、按需召回、证据可追溯和权限边界思路，放在 `skills/production-engineering/references/context-memory-continuity.md`。本仓库不默认安装或调用 TencentDB Agent Memory；只有用户明确要求集成外部记忆系统并确认风险时，才允许另行处理。

## 安装方式

在 Codex 里直接对它说：

```text
安装这个 skill：https://github.com/fuyunnat/fuyunsk/tree/main/skills/production-engineering
```

如果你想用命令安装，可以在本机执行：

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py --repo fuyunnat/fuyunsk --path skills/production-engineering
```

安装后，下一轮对话开始时 Codex 就能发现这个 skill。

如果你要把这个仓库发给朋友，推荐直接让 AI 读取并执行：

- [docs/ai-installation.md](docs/ai-installation.md)

如果你要配置“个性化自定义提示词”，直接复制或合并：

- [docs/personal-custom-instructions.md](docs/personal-custom-instructions.md)

## 触发方式

最稳的方式是显式触发：

```text
用 $production-engineering 修这个问题
```

也可以自然表达。以下任务会尽量自动触发：

- 实现、修复、重构、交付代码
- 启动项目并验证
- 代码评审、安全审计、漏洞或后门排查
- Git 提交、分支、推送、PR、CI
- 数据库迁移、部署配置、高风险操作
- 后台页面、管理端、配置页、运营后台

重要说明：

- Skill 的“自动触发”依赖 Codex 当前版本和宿主环境的匹配机制，不能保证在所有客户端、所有模型、所有表达里 100% 自动触发。
- 想要当前聊天最稳，直接在任务里写 `$production-engineering`。
- 想要长期默认生效，把 `docs/personal-custom-instructions.md` 合并到 Codex 个性化自定义提示词，或把 `global-AGENTS.example.md` 的关键内容合并到全局或项目 `AGENTS.md`，让写操作必须先路由到这个 skill。
- 触发 `$production-engineering` 后，AI 必须在第一次读取或修改项目业务文件前明确说明已使用该 skill，并说明已读取 `SKILL.md` / `routing.md` 以及本次额外 reference。没有这句报备，用户可以直接判定它没有按本仓库最稳规则开始。

## 更稳的全局路由

如果想让 Codex 更稳定地自动使用这个 skill，可以把 `global-AGENTS.example.md` 里的内容合并到自己的：

```text
~/.codex/AGENTS.md
```

不要直接覆盖已有全局文件，先备份。

其中最关键的是 `global-AGENTS.example.md` 里的“写操作硬门禁”和“绝对禁止”：

- 凡是可能修改文件、Git、数据库、远端仓库、线上服务、配置、依赖或外部状态的任务，必须先使用 `$production-engineering`。
- 如果 skill 不可用、未触发或无法确认已经接管当前写操作，Codex 应停止写操作并说明原因。
- 生产数据库、真实用户数据、删除数据、强推、主分支直推、未知脚本、密钥提交、覆盖用户改动等禁区必须写在全局 `AGENTS.md`，不要只放在 skill 里。

## 仓库级兜底

本仓库根目录提供了 `AGENTS.md`，用于约束维护这个 skill 仓库时的行为：

- 只维护自家的 `production-engineering`。
- 不引入、复制或依赖第三方 skill、hooks 或命令。
- `SKILL.md` 保持轻量，完整规范继续放在 `references/full-production-engineering.md`。
- 任务状态文件放在 `work/`，并通过 `.gitignore` 排除，避免误提交。

如果你要把这套规则给其他项目使用，应优先复制或合并 `global-AGENTS.example.md`，不要直接复制本仓库的维护规则。

## Bug 修复用法

遇到 Bug、报错、页面异常、接口不通或行为不符合预期时，推荐这样写：

```text
用 $production-engineering 先定位这个 Bug 的原因，说明证据和最小修改方案，再修复并验证。
```

这个 skill 会要求 Codex 先定位相关文件、函数、接口、配置、日志或调用链，再进行最小修改，避免一上来大范围重构。

如果是想找隐藏 Bug 或做代码审查，也可以写：

```text
用 $production-engineering 检查这段代码有没有隐藏 Bug，重点看空值、重复请求、并发、权限、超时、异常处理和敏感信息泄露。
```

即使用户只说“有没有问题”或“帮我看看代码”，skill 也会把检查范围自动具体化，避免只给泛泛结论。

## 上下文续航用法

长任务、分阶段开发、需要提交推送、或担心 AI 开发到一半忘事时，推荐这样写：

```text
用 $production-engineering 继续这个任务，并维护 work/task-state.md，按阶段记录目标、决策、改动、验证、PR 状态和回滚方式。
```

这个 skill 会把任务记忆分层处理：状态文件只放可恢复摘要和证据路径，不塞长日志；继续任务时先读状态、Git、diff 和最新用户要求，再继续执行。

## 后台页面默认栈

新建后台页面、管理端、配置页或运营后台，且用户没有指定其他技术栈时：

- Vue 3 + Vite
- Ant Design Vue
- Pinia
- Vue Router
- 普通 `.vue` / `.js`，不是 TypeScript 项目

二开已有项目时，永远优先跟随真实项目栈。

涉及前端页面、后台页面、管理端、配置页、运营后台、共享 UI 组件或 UI 审查时，skill 会额外读取：

```text
skills/production-engineering/references/frontend-interface-quality.md
```

这份参考补充键盘可操作、focus、表单、URL 状态、长文本、表格、动画、图片、性能、响应式和可访问性检查。

## 自检

修改本仓库后，至少运行：

```bash
node scripts/validate-skill.js
git diff --check
```

自检会确认关键文件存在，并检查触发词、删除策略、上下文状态、GitHub 提交规则、后台默认栈和第三方 skill 隔离规则没有丢。
