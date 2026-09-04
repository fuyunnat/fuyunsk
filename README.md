# fuyunsk

`fuyunsk` 当前维护一个 Codex Skill：`production-engineering`。

当前版本以性能优先。这个 Skill 默认仅支持**显式调用**，普通聊天不会自动携带完整工程工作流。

## 为什么这样调整

旧版本同时使用隐式调用、较长的全局兜底规则、可选个性化提示词，以及新对话自动恢复。安全性较高，但代价是普通问候也可能加载大量工程规则。现在只有用户明确输入 `$production-engineering` 后，才会加载工程指导。

## 使用方法

普通聊天直接正常交流即可。

处理真实项目时，在目标前加上 `$production-engineering`：

```text
$production-engineering 修一下这个报错，先只改本地并验证。
```

```text
$production-engineering 检查这个仓库有没有隐藏 Bug，先别改。
```

```text
$production-engineering 优化完成后提交到仓库，但不要合并主线。
```

显式前缀是刻意设计的：只多输入几个字符，就能换来更稳定的性能，并避免无关工程上下文被注入普通对话。

## 方法工具箱

显式调用后，路由器只加载当前任务真正需要的方法：

- `diagnosis-feedback-loop.md`：建立准确、快速的反馈闭环；复现并缩小问题；验证可证伪假设；证明回归已经消失。
- `design-testing.md`：围绕清晰接缝设计小型公开接口；测试外部行为而不是内部实现；按纵向切片交付；大范围迁移使用“扩展 → 迁移 → 收缩”。
- `spec-review.md`：根据已有上下文整理规格；把工作拆成可独立验证的任务；记录尚未解决的决策；分别审查代码质量与需求实现情况。
- 其他现有 reference 继续负责安全与风险审查、前端质量、文档、上下文续航、数据库安全、部署和 Git 交付。

这些方法参考 [`mattpocock/skills`](https://github.com/mattpocock/skills) 在提交 `3cca18b368ae95cdbdebbff572ccafa662551015` 时的设计思路，并结合本仓库规则重新提炼。来源说明和设计差异记录在 [`references/upstream-notes.md`](skills/production-engineering/references/upstream-notes.md)。上游采用 MIT 许可证，本 Skill 运行时不依赖上游仓库。

## 授权边界

| 用户说法 | 已授权的结果 |
| --- | --- |
| “改一下 / 修一下 / 做一个” | 在本地做范围明确的修改和验证 |
| “保存好 / 留个恢复点” | 建立本地提交或可恢复备份 |
| “上传仓库 / 提交到仓库” | 验证后推送任务分支 |
| “开 PR / 提交审核” | 创建或更新评审请求 |
| “搞到主线 / 正式用这个版本” | 检查通过后按仓库流程进入正式分支 |
| “上线 / 部署” | 先确认具体环境、风险和回滚方式 |

生产环境、数据库写入、数据删除、密钥、支付、权限、安全策略、CI/CD、强推、直接写正式分支和远端设置仍属于高风险操作，必须先调查并说明影响和恢复方式，再取得明确授权。

## 安装

让 Codex 执行：

```text
请安装或原位更新这个 Skill：
https://github.com/fuyunnat/fuyunsk/tree/main/skills/production-engineering

保持 policy.allow_implicit_invocation: false。
不要默认合并 global-AGENTS.example.md 或 docs/personal-custom-instructions.md。
同名 Skill 只保留一份。
```

客户端会自行识别当前有效的用户级 Skill 目录。不要在 `~/.agents/skills` 和 `~/.codex/skills` 中同时安装两份同名 Skill。

更完整的迁移和验证步骤见 [AI 安装教程](docs/ai-installation.md)。

## 性能模型

工作流采用渐进加载：

1. 普通对话：不加载 `production-engineering` 工程工作流。
2. 显式调用：加载 `SKILL.md` 和 `references/routing.md`。
3. 实现或交付任务：再加载 `references/task-lanes.md`。
4. 专项任务：只加载匹配的方法或 reference。
5. 完整规范：只搜索并读取当前需要的标题。
6. 任务状态恢复：仅用于续作、交接、多阶段任务或上下文丢失风险。

不要同时安装两份全局兜底文档，大多数用户不需要其中任何一份。`upstream-notes.md` 仅用于维护和来源说明，正常任务不会加载它。

## 能力范围

显式调用后，这个 Skill 可以处理：

- 功能实现、调试、重构和针对性验证；
- 反馈闭环优先的问题诊断和性能测量；
- 接口与接缝设计、行为测试、TDD、纵向切片和原型验证；
- 规格整理、任务拆分、决策地图和双轴差异审查；
- 代码与安全审查、漏洞和后门排查；
- Git 提交、推送、评审请求、正式合并和回滚说明；
- 数据库兼容演进和生产风险控制；
- 前端与后台界面质量、工程文档；
- 真正长任务或中断任务的可恢复状态。

## 目录结构

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

## 可选全局兜底

`global-AGENTS.example.md` 和 `docs/personal-custom-instructions.md` 都是可选的短兜底规则，最多选择其中一份。它们都不应自动加载这个 Skill。

高级用户确实需要自动调用时，可以改成：

```yaml
policy:
  allow_implicit_invocation: true
```

这不是推荐默认值，因为它可能增加上下文体积和响应延迟。

## 验证

维护本仓库时运行：

```bash
node scripts/validate-skill.js
git diff --check
```

校验脚本会检查显式调用策略、提示词体积预算、专项方法路由、上游来源说明、仓库卫生和任务状态助手。

## 从旧版本迁移

1. 备份当前 Skill 目录和全局指令。
2. 原位更新 Skill。
3. 从全局 `AGENTS.md` 中移除旧版较长的 `production-engineering` 规则块。
4. 删除重复的个性化或全局副本。
5. 确认 `allow_implicit_invocation: false`。
6. 客户端没有自动刷新时，彻底退出并重新打开 Codex。
7. 分别测试一次普通问候和一次显式 `$production-engineering` 请求。

旧提交仍保留在 Git 历史中，可用于回退。
