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

每个新对话的第一个工程请求还会先执行一个轻量只读恢复命令。脚本先检查当前项目；如果对话从工作区上层目录开始，只会查询 Codex 本地索引中登记的下级项目，不遍历目录树或整台机器。没有未完成状态时不加载完整续航文档；发现唯一未完成任务时会返回其准确路径，发现多个候选时不会擅自选择。

个性化自定义提示词可参考 [docs/personal-custom-instructions.md](docs/personal-custom-instructions.md)。

## 设计目标

- 小任务先走轻量通道：只读目标文件和最近上下文，做一个能证明结果的局部检查；不默认全仓库扫描、完整规范加载、PR、CI 或反复写任务状态。
- 将工程任务从“直接改代码”约束为“先读真实项目、判断风险、最小修改、验证、汇报、可回滚”的闭环。
- 通过 `allow_implicit_invocation: true` 开启隐式调用，并用全局或项目 `AGENTS.md` 为工程写操作提供兜底路由。
- 把高风险规则写成硬门禁：用户改动保护、密钥保护、删除进回收站、禁止主线直推、禁止伪造验证结果。
- 用可发现的任务状态和 Git 指纹处理上下文压缩、新对话、模型切换和任务中断；内置 Memories 只作辅助线索。
- 任务状态只做断点检查点，不写成开发日记；通常只在开始、实现完成、验证结果、远端保存或正式合并这些阶段更新。
- 代码组织先看职责边界：不同功能、接口请求、业务规则、数据库访问、状态管理和 UI 组件不能为了省事堆在一个文件里；命中职责边界才改对应最小文件，优化只压重复、整理结构，不删安全门栏。
- 数据库更新默认走兼容演进：新增结构、分批回填、新旧并存、受控切换、观察后清理，禁止为了让新代码运行而直接改字段或覆盖历史数据。
- 只让安全硬门禁保留双重兜底，流程细节由单一 reference 负责，减少重复加载但不削弱规则。
- 对前端后台页面补充界面质量规则，避免只实现功能、不处理状态和细节。

## 目录结构

```text
skills/production-engineering/
  SKILL.md                                # skill 入口和触发说明
  agents/openai.yaml                      # agent 元数据
  scripts/task-state.js                   # 任务状态命令入口
  scripts/task-state-core.js              # 状态发现、内容指纹和持久化核心
  references/routing.md                   # 任务模式和 reference 路由
  references/task-lanes.md                # 执行成本控制和任务车道
  references/full-production-engineering.md
  references/code-risk-review.md
  references/context-memory-continuity.md
  references/content-writing-quality.md
  references/frontend-interface-quality.md
  references/wrapped-workspace-ui.md
  references/project-understanding.md

docs/
  ai-installation.md                      # 给协作者或 AI 的安装说明
  personal-custom-instructions.md         # 可合并到 Codex 个性化提示词

global-AGENTS.example.md                  # 全局 AGENTS.md 参考模板
scripts/validate-skill.js                 # 仓库自检脚本
scripts/validate-routing-cases.js         # 普通话路由和授权场景检查
scripts/validate-repository-hygiene.js    # 密钥、产物和大文件检查
scripts/validate-task-state.js            # 状态发现、指纹和完成门禁检查
tests/routing-cases.json                  # 触发、通道、授权和禁止行为样例
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

`references/context-memory-continuity.md` 规定：每个新对话先按当前项目或工作区查找未完成状态；标准/完整源代码任务、多文件、多阶段、长任务和明确需要继续的规划必须维护状态。优先使用已忽略的 `work/task-state.md`，否则使用 `$CODEX_HOME/task-states/` 下的项目索引和状态文件。索引按项目分文件保存，多个 Codex 任务并行时不会共同覆盖一个索引文件；旧 `index.json` 只读兼容。助手先查精确项目，再查索引中登记的下级项目，不扫描磁盘。它会把未跟踪文件内容也计入 Git 指纹，并禁止普通状态更新绕过“实现完成、验证通过、当前 diff 未变化”这三个完成条件。

### 数据库兼容演进

代码更新不能擅自重命名、删除、复用或改变现有数据库字段，也不能用重建表、清空、全量替换或批量覆盖历史数据来适配新版本。默认做法是先增加兼容结构，再分批回填，让新旧代码和数据在切换期共存；旧字段清理必须作为观察后的独立高风险步骤处理。

### 前端界面质量

`references/frontend-interface-quality.md` 补充后台页面和管理端的界面要求，覆盖表格、筛选区、表单、弹窗、loading、empty、error、disabled、权限不足、登录失效、响应式和可访问性。

### 包裹式工作台 UI

`references/wrapped-workspace-ui.md` 补充框架中立的专业桌面工作台设计能力：外层画布、连续侧栏、内嵌工作区、同级多面板、内容列密度和底部信息栏的对齐关系，以及去除重复分界线、响应式适配和视觉验收清单。它只约束空间组合与信息层级，不替换项目已有的技术栈、颜色或组件库。

### 内容写作质量

`references/content-writing-quality.md` 约束 README、自述文件、安装说明、PR 描述、发布说明、客户技术说明和后台页面文案。凡是生成或修改这类内容，默认主动保留事实、去掉聊天痕迹和模板化表达，避免明显的 AI 味；不需要用户专门提出“去 AI 味”。

### 执行成本控制

`references/task-lanes.md` 是 answer-only、read-only、tiny、quick、standard、full 及附加通道的唯一选择依据。它先用客观判定表分级：问“改了啥、为什么慢、怎么用”只短答；错别字、README、单页局部样式、按钮/标签/字体整理、明确单文件小修走轻量处理；数据库、权限、安全、支付、生产、依赖、删除、主线合并和影响不明才进入完整通道。完整规范继续保留全部详细规则，但不能反向扩大授权或把普通跨文件修改、任务分支上传、以及“稳一点”这类口语机械升级为完整通道。如果附近代码已经正确，保持不动。

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

主自检会自动运行路由场景检查和任务状态助手验证，并确认入口元数据、隐式调用策略、常驻规则体积、reference 路径、普通话授权边界、删除策略、新对话恢复、验证指纹、数据库兼容演进、Git 交付、后台默认栈、硬编码路径和旧规则残留。
