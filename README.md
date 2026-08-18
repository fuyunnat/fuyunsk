# fuyunsk

`fuyunsk` 是一个个人维护的 Codex skill 仓库，当前聚焦于 `production-engineering`：一套面向工程实现、修复、审计、验证、GitHub 交付、数据库/部署变更和后台页面开发的生产级执行规范。

该仓库不依赖第三方 skill、hooks 或代理框架。规则以轻量入口、按需路由和完整规范分层组织，便于安装、审查、同步和回滚。

## 设计目标

- 将工程任务从“直接改代码”约束为“先读真实项目、判断风险、最小修改、验证、汇报、可回滚”的闭环。
- 在 skill 自动触发不稳定时，通过全局或项目 `AGENTS.md` 提供兜底路由。
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
  references/frontend-interface-quality.md

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
- Git 分支、提交、推送、PR、CI 和回滚说明。
- 数据库、配置、部署、依赖和生产风险相关任务。
- 后台页面、管理端、配置页和运营后台开发。

### 风险审查

`references/code-risk-review.md` 将“有没有问题”“帮我看看代码”这类泛化请求转换为具体检查项，包括空值、重复请求、并发、权限、超时、异常处理和敏感信息泄露。

### 上下文续航

`references/context-memory-continuity.md` 规定长任务使用 `work/task-state.md` 或等价状态文件记录目标、决策、改动、验证、PR 状态和回滚方式。状态文件只保存恢复所需摘要和证据路径，不记录密钥、隐私数据、生产凭证或完整敏感日志。

### 前端界面质量

`references/frontend-interface-quality.md` 补充后台页面和管理端的界面要求，覆盖表格、筛选区、表单、弹窗、loading、empty、error、disabled、权限不足、登录失效、响应式和可访问性。

### 执行成本控制

`references/task-lanes.md` 用于在读取完整规范前判断 read-only、quick、standard、full、frontend/UI、context 等任务车道。它不会删减或削弱完整规范，只负责让简单任务少读少跑，高风险任务自动升级到完整规则。

## 安装

在 Codex 中直接安装：

```text
安装这个 skill：https://github.com/fuyunnat/fuyunsk/tree/main/skills/production-engineering
```

也可以使用本地命令安装：

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py --repo fuyunnat/fuyunsk --path skills/production-engineering
```

安装后，重新开始一轮对话即可被 Codex 发现。

协作者安装时可参考：

- [docs/ai-installation.md](docs/ai-installation.md)

个性化提示词可参考：

- [docs/personal-custom-instructions.md](docs/personal-custom-instructions.md)

## 使用方式

推荐显式触发：

```text
用 $production-engineering 修复这个问题，并验证后提交到仓库。
```

自然语言也可能触发，例如：

- 修复这个 Bug。
- 检查代码有没有隐藏问题。
- 启动项目并验证。
- 提交代码并开 PR。
- 做一个后台配置页。

自动触发依赖 Codex 宿主环境的 skill 匹配机制。对稳定性要求高的任务，应在请求中明确写出 `$production-engineering`，并要求 Codex 在读取或修改项目业务文件前输出：

```text
已使用 $production-engineering，并已读取 SKILL.md / routing.md。
```

## 全局兜底

若需要更稳定的默认约束，可将 `global-AGENTS.example.md` 的关键内容合并到：

```text
~/.codex/AGENTS.md
```

合并前应先备份已有文件。全局 `AGENTS.md` 适合放置不能依赖 skill 自动触发的硬门禁，例如：

- 写操作必须先路由到 `$production-engineering`。
- skill 不可用或未接管时停止写操作。
- 禁止永久删除文件，删除必须进入系统回收站或可恢复位置。
- 禁止提交密钥、覆盖用户改动、强推、主分支直推或伪造验证结果。
- 高风险任务必须先只读调查、说明风险和回滚方式，再等待明确确认。

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

自检会确认关键文件、触发词、删除策略、上下文状态、GitHub 提交规则、后台默认栈、执行成本控制和第三方隔离规则没有丢失。
