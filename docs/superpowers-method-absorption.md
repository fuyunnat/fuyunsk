# obra/superpowers 方法吸收映射

本文件记录 `production-engineering` 对 `obra/superpowers` 开发类 Skill 的审查与吸收结果，避免以后重复安装、重复造规则或误以为“没有照搬”就是“没有吸收”。

审查基线：`obra/superpowers` `main` 提交 `b36e0829c6d0140e93cfef2ca599b1b07d4a7797`（Release v6.3.0）。本仓库只重新表述与现有规则兼容的方法，不复制整套 Skill，不把上游仓库变成运行依赖；上游后续变化也不会自动进入本 Skill。

## 总原则

优先级仍然是：用户当前明确要求 > 本 Skill 现有行为保护/安全/Git/数据库/项目边界 > 本次吸收的方法。

吸收时坚持三条：

- **重复能力合并，不叠第二套流程。** 已有 `bugfix-fast-loop.md`、`diagnosis-feedback-loop.md`、`design-testing.md`、`spec-review.md`、`planning-persistence.md`、`code-craft.md` 的地方继续以现有规则为主。
- **重流程只在重任务加载。** 普通 Bug、小改、简单文档不因为“方法更专业”被升级成设计会、worktree、多代理或多轮 review。
- **不照抄绝对主义。** 不采用任何任务都必须先 brainstorming、1% 可能命中就强制调用、测试不是先写就删除已有代码等规则。

## 14 项逐一映射

| Superpowers Skill | 本仓库吸收位置 | 采用方式 |
| --- | --- | --- |
| `using-superpowers` | `SKILL.md`、`routing.md`、全局短 dispatcher | 保留自然语言自动命中与阶段路由；**不采用**“1% 可能适用就必须先调用”的全局硬门。 |
| `brainstorming` | `agentic-execution.md` | 吸收 Spike / Bounded / Architectural 的任务形态判断；架构型先设计，边界型明确时直接做；**不采用**所有小改都必须等用户再次批准。 |
| `writing-plans` | `planning-persistence.md`、`agentic-execution.md`、`工作流程.md` | 任务要有目标、文件/模块、依赖、接口、验证和完成证据；禁止关键占位话术。继续使用根目录 `工作流程.md`，不另造一套 plans 目录作为唯一真相。 |
| `executing-plans` | `agentic-execution.md` | 执行前先审计划；已授权完整目标后连续执行；遇真实阻塞/高风险/结果冲突才停，不每项都问“继续吗”。 |
| `subagent-driven-development` | `agentic-execution.md` | 子代理使用最小自包含任务包；协调者负责复核；复杂任务可做任务级复核 + 最终整体复核；不强制每个机械小任务都派代理。 |
| `dispatching-parallel-agents` | `agentic-execution.md` | 只有无共享状态、无写入冲突、无顺序依赖的任务才并行；关联 Bug 或共享数据库/文件顺序做。 |
| `requesting-code-review` | `agentic-execution.md`、`spec-review.md` | 重大功能、复杂 Bug、跨模块改动和主线前优先独立 review；固定需求、base/head、diff 和验证证据，先审需求符合再审代码质量。 |
| `receiving-code-review` | `agentic-execution.md` | review 只是证据来源；先验证源码和上下文，再逐项修改；错误建议要技术性拒绝，不能机械全收。 |
| `systematic-debugging` | `bugfix-fast-loop.md`、`diagnosis-feedback-loop.md` | 保留根因、复现、最近变化、边界证据、单一假设、小步验证；普通可复现 Bug 仍走更快的“短证据 → 最小修复 → 立即验证”。 |
| `test-driven-development` | `design-testing.md`、`agentic-execution.md` | 对有稳定测试面的新行为/复杂 Bug 优先先得到失败证据，再最小实现、验证、整理；**不采用**“没先写测试就必须删掉已有生产代码”。 |
| `using-git-worktrees` | `agentic-execution.md` | 先识别是否已经隔离；优先宿主原生隔离；普通分支仍默认；新 worktree 需明确授权并验证基线，不自动清理未知 worktree。 |
| `verification-before-completion` | `agentic-execution.md`、既有验证章节 | 完成声明必须基于最后一次相关修改后的 fresh evidence；子代理总结、旧 CI、旧测试都不能代替当前证据。 |
| `finishing-a-development-branch` | `agentic-execution.md`、Git 原文规则 | 先验证再谈集成；PR/保留/合并按用户授权；不自动合主线，不默认删分支/worktree，不主动提供破坏性 discard 路径。 |
| `writing-skills` | 根 `AGENTS.md`、现有技能测试、入口一致性测试 | 修改触发/路由/纪律时先或同时补能暴露缺口的回归/压力场景；description 负责命中、正文负责执行；新增专项必须检查入口、路由、批量加载和 dispatcher 接线。 |

## 额外吸收：异步等待不要靠死时间

`systematic-debugging` / 并行代理方法中的 condition-based waiting 思想合并进 `agentic-execution.md`：能等事件、状态、文件、端口或任务结果就等条件；固定 sleep 只作为确实没有可观察条件时的最后选择，并必须有超时和诊断输出。

## 没有吸收的部分

以下内容是刻意不采用，不是遗漏：

- 所有任务都先停下来做 brainstorming 并等待一次额外批准；
- 只要 1% 觉得某 Skill 可能有用，就必须在任何回答/澄清前强制加载；
- 测试写晚了就删除已经存在且有效的生产实现；
- 每个小任务都强制创建 worktree、派子代理、两轮 review；
- 固定使用 Superpowers 自己的 `docs/superpowers/...`、`.superpowers/...` 目录替代本仓库的 `工作流程.md` 和既有任务状态；
- 安装 `obra/superpowers` 作为本 Skill 的运行依赖。

这些选择是为了保留当前 Skill 已经验证过的速度、小白交互、旧行为保护和 Git 授权边界。
