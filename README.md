# fuyunsk

`fuyunsk` 目前维护一个 Codex skill：`production-engineering`。它用于工程实现、修复、审计、验证、Git 交付、数据库或部署变更，以及后台页面开发。

这套规则面向普通使用者。你只需要说清楚目标，Codex 负责检查项目、选择安全的修改方式、执行验证，并把保存位置、正式版本状态和恢复方法讲明白。

## 你只需要怎么说

| 你说的话 | Codex 应该做什么 | 不会顺带做什么 |
| --- | --- | --- |
| “改一下”“修一下”“做一个” | 在本地检查、修改并验证 | 不上传仓库，不合并主线，不上线 |
| “保存好”“留个恢复点”“别丢了” | 建立本地 Git 提交或可恢复备份 | 不上传远端 |
| “上传仓库”“提交到仓库”“别只放本地” | 验证后推送当前任务分支 | 不开评审请求，不合并主线 |
| “开 PR”“提交审核”“准备合并” | 创建或更新评审请求 | 不自动合并 |
| “搞到主线”“合并到主库”“正式用这个版本” | 检查差异和 CI 后按仓库流程合并 | 不自动部署 |
| “上线”“部署” | 先确认目标环境，再说明风险和回滚 | 不把测试环境和生产环境混为一谈 |

例如，你可以直接说：

```text
修一下这个报错，保存好。
```

```text
做一个后台配置页，上传仓库，但先不要合并主线。
```

遇到生产环境、数据库写入、数据删除、密钥、支付、权限或其他高风险操作时，Codex 仍会先用普通中文说明影响和恢复方式，再等待明确确认。

## 安装

把下面这句话发给 Codex：

```text
使用 $skill-installer 安装这个 skill：https://github.com/fuyunnat/fuyunsk/tree/main/skills/production-engineering
```

让当前 Codex 自带的安装器选择它支持的目录。OpenAI 当前文档列出的用户级目录是 `$HOME/.agents/skills`；部分现有客户端和内置安装器仍使用 `$CODEX_HOME/skills`，默认通常是 `~/.codex/skills`。如果已经存在同名 skill，应原位更新，不能在两个目录重复安装。Codex 不会合并同名 skill，重复副本可能同时出现在选择列表中。

给朋友或其他 AI 安装时，直接使用 [AI 安装教程](docs/ai-installation.md)。教程包含路径识别、旧规则备份、自动调用配置和安装后验证。

路径和发现规则以 OpenAI Docs 的 [Build skills](https://learn.chatgpt.com/docs/build-skills) 为准。Codex 通常会自动发现新安装或更新的 skill；没有出现时再重启客户端。

## 自动调用与全局兜底

skill 自带以下配置：

```yaml
policy:
  allow_implicit_invocation: true
```

这表示宿主允许 Codex 根据任务内容自动选择该 skill。自动匹配仍取决于 Codex 当前版本和宿主环境，不能把它描述成所有场景都能百分之百触发。

对写代码、改文件、Git、数据库和部署等任务，最稳的配置是同时安装 skill，并把 [全局 AGENTS 示例](global-AGENTS.example.md) 合并到当前用户的 `~/.codex/AGENTS.md`。全局规则负责硬门禁和路由，skill 负责完整执行细节。合并前必须备份已有文件，不能直接覆盖旧规则。

安装后可以用一句普通话验证：

```text
看看当前项目有没有问题，先别改。
```

在读取项目业务文件前，Codex 应明确输出：

```text
已使用 $production-engineering，并已读取 SKILL.md / routing.md。
```

如果没有出现这句话，说明当前任务没有确认接管。此时不要继续写操作，先检查 skill 安装目录、`agents/openai.yaml` 和全局 `AGENTS.md`。显式写 `$production-engineering` 可以用于排查，但完成全局配置后，日常使用不应要求用户每次手动写 skill 名称。

个性化自定义提示词可参考 [docs/personal-custom-instructions.md](docs/personal-custom-instructions.md)。

## 设计目标

- 将工程任务从“直接改代码”约束为“先读真实项目、判断风险、最小修改、验证、汇报、可回滚”的闭环。
- 通过 `allow_implicit_invocation: true` 开启隐式调用，并用全局或项目 `AGENTS.md` 为工程写操作提供兜底路由。
- 把高风险规则写成硬门禁：用户改动保护、密钥保护、删除进回收站、禁止主线直推、禁止伪造验证结果。
- 对长任务维护可恢复状态，降低上下文压缩、模型切换或任务中断造成的遗漏。
- 对前端后台页面补充界面质量规则，避免只实现功能、不处理状态和细节。

## 目录结构

```text
skills/production-engineering/
  SKILL.md                                # skill 入口和触发说明
  agents/openai.yaml                      # agent 元数据
  references/routing.md                   # 任务模式和 reference 路由
  references/task-lanes.md                # 执行成本控制和任务车道
  references/full-production-engineering.md
  references/code-risk-review.md
  references/context-memory-continuity.md
  references/content-writing-quality.md
  references/frontend-interface-quality.md
  references/project-understanding.md

docs/
  ai-installation.md                      # 给协作者或 AI 的安装说明
  personal-custom-instructions.md         # 可合并到 Codex 个性化提示词

global-AGENTS.example.md                  # 全局 AGENTS.md 参考模板
scripts/validate-skill.js                 # 仓库自检脚本
```

## 核心能力

### 工程交付

`production-engineering` 会要求 Codex 在修改前读取真实项目状态、识别 Git/恢复边界、保护用户已有改动，并在完成后执行与风险匹配的验证。

适用场景包括：

- 功能实现、Bug 修复、重构和启动验证。
- 代码审查、安全审计、漏洞和后门排查。
- Git 分支、提交、推送、评审请求、CI 和回滚说明。
- 数据库、配置、部署、依赖和生产风险相关任务。
- 后台页面、管理端、配置页和运营后台开发。

### 风险审查

`references/code-risk-review.md` 将“有没有问题”“帮我看看代码”这类泛化请求转换为具体检查项，包括空值、重复请求、并发、权限、超时、异常处理和敏感信息泄露。

### 上下文续航

`references/context-memory-continuity.md` 规定：标准或完整通道只要修改源代码，就在首次代码编辑前维护已被忽略的 `work/task-state.md` 或项目外等价位置；超过一个源代码文件、多阶段、长任务和可能中断的任务同样强制维护。只有真正的单步骤快速小改、最多一个源代码文件且没有中断风险时可以跳过。AI 会自动维护任务、实现和验证三项状态：代码改完但未验证时任务仍是进行中，最新代码验证通过后才标记完成，失败、无法验证或验证后再次改代码都会撤销完成状态。状态文件只在实现、验证、远端交付和任务结束等阶段边界更新，不会在每次细节编辑时反复重写；它只保存恢复所需摘要和证据路径，不记录密钥、隐私数据、生产凭证或完整敏感日志，也不进入业务提交。

### 前端界面质量

`references/frontend-interface-quality.md` 补充后台页面和管理端的界面要求，覆盖表格、筛选区、表单、弹窗、loading、empty、error、disabled、权限不足、登录失效、响应式和可访问性。

### 内容写作质量

`references/content-writing-quality.md` 约束 README、自述文件、安装说明、PR 描述、发布说明、客户技术说明和后台页面文案。凡是生成或修改这类内容，默认主动保留事实、去掉聊天痕迹和模板化表达，避免明显的 AI 味；不需要用户专门提出“去 AI 味”。

### 执行成本控制

`references/task-lanes.md` 用于在读取完整规范前判断 read-only、quick、standard、full、frontend/UI、context 等任务车道。它不会删减或削弱完整规范，只负责让简单任务少读少跑，高风险任务自动升级到完整规则。

### 项目理解和架构拆解

`references/project-understanding.md` 用于“先看懂项目”“拆一下这个仓库”“我想接手这个项目”这类只读任务。它要求 Codex 先给出项目本质、主流程、核心约束和最值得优先理解的机制，再按单个问题继续深入；不默认写文件、不安装第三方 skill，也不把普通修 bug 拖成完整架构报告。

## 默认后台前端栈

新建后台页面、管理端、配置页或运营后台，且用户没有指定其他技术栈时，默认使用：

- Vue 3 + Vite
- Ant Design Vue
- Pinia
- Vue Router
- 普通 `.vue` / `.js`，不是 TypeScript 项目

二次开发已有项目时，始终以真实项目栈为准，不为了套默认选型迁移现有项目。

## 维护规则

维护本仓库时应遵守根目录 [AGENTS.md](AGENTS.md)：

- `SKILL.md` 保持轻量，只负责入口和路由。
- 详细规范放在 `references/`。
- 不压缩、不删减 `full-production-engineering.md`，除非用户明确要求。
- 不新增第三方依赖；自检脚本优先使用 Node.js 标准库。
- `work/` 用于任务状态和临时记录，默认不提交。

## 自检

修改本仓库后至少执行：

```bash
node scripts/validate-skill.js
git diff --check
```

自检会确认入口元数据、隐式调用策略、reference 路径、普通话授权边界、删除策略、上下文状态、Git 交付、后台默认栈、硬编码路径和旧规则残留。
