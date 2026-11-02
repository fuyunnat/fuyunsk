---
name: production-engineering
description: "实现、修复、调试、UI、SEO、Git、数据库、部署、打包、迁移、规划清单、进度面板、配置化、模板二开和上游同步。项目里‘这个太丑了、这里不对、继续、跑起来、跟原站不像、按钮没反应、补上功能、保存一下、先列清单、旧模板别动、别写死、打包一下’也触发；用户无需提供技术术语、文件名或实现方案。普通闲聊、翻译、计算和脱离项目的概念解释不触发；只问不改直接回答。"
---

# 生产级工程

默认中文。例外见 `references/source-policy.md`；用户要求优先。

**先分轻重**：只问不改直接答，不读规则、不建文件。快速小改只读 `references/quick-core.md`，不跑批量读取、不建清单；仅补记录用 `记录收尾`；复杂或需续作先读 `task-card.md`。

## 实施流程（记录收尾除外）

0. **先评估**：实施前读 `task-card.md`、`preflight-decision.md`，确认目标、方案、风险和验收；复杂/需续作或优化时记入 `工作流程.md`。
1. **查明目标**：先读用户源码，列目录不算已读；明确改变、保留和依据。源码可查不反问；结果歧义暂停，用人话给 2–3 个选项和推荐；见 `novice-clarification.md`。
2. **确定边界**：所有写入遵守 `references/project-write-boundary.md`。核实当前聊天关联 `PROJECT_ROOT`，非 Codex/技能目录；保护用户改动和原业务逻辑、API、数据、配置、权限、副作用、流程；重构/优化/UI/换栈不擅改结果。
3. **开始工作**：清单门禁见 `workflow-checklist.md`。跨文件/多步/缺真实测试条件/需交接/已有清单/要进度时，先读/建/更新 `PROJECT_ROOT/工作流程.md`，首项标“进行中”；单步小改用任务卡；续作先读，中途补充若升级立即记入、算必做。
4. **实施与验证**：已读未变规则复用，独立只读同批完成；Bug 先复现、看懂再改、亲自验证，两次最小修复失败再深入诊断。范围见 `bounded-completion.md`，只回归相关影响；写入后真实验收，缺条件先列，不把静态检查当真实测试。
5. **收尾**：先核对清单收尾；全部做完或写明阻塞才停。用人话说改好了什么、用户现在能做什么；按 `verification-report.md` 用大白话报做了啥、没做完啥、怎么测的、没测啥、缺啥，术语随口解释；无证据不说通过。

## 按需读取

| 场景 | 读取内容 |
| --- | --- |
| 开始/只读 | `rules/00-00.md`、`01-00.md`、`02-01.md` |
| Bug、报错、修复 | `bugfix-fast-loop.md`、`observability-debugging.md`、`delivery-feedback.md`；升级后读 `diagnosis-feedback-loop.md` |
| 写入后测试与收尾 | `verification-report.md`；真实验收、缺条件和五项交付报告 |
| 规划/二开/配置/代码 | `planning-persistence.md`、`parallel-template-development.md`、`configuration-localization.md`、`code-craft.md` |
| 前端/后台 | 第九章、`frontend-stack.md`、`frontend-interface-quality.md`、`ui-design-workflow.md`；无前端用 `mc-ui-scaffold.md` |
| UI视觉、太大占屏、跑版 | `frontend-design-intelligence.md`、`ui-visual-verification.md` |
| 进度面板 | `workflow-progress-panel.md`，复杂或需要续作的工程任务才自动打开 |
| 二开上游同步 | `upstream-sync.md` |
| SEO/收录 | `seo-engineering.md` |
| 整项目迁移 | `project-migration.md`；迁移台账逐项验收 |
| 长任务/续作 | `context-memory-continuity.md`、`agentic-execution.md`、`spec-review.md` |
| Git交付/回滚/发布包 | 原文第四章、`git-team-delivery.md`、`release-packaging.md` |
| 后端/接口/数据库 | `references/routing.md` |

完整读取：`node <技能目录>/scripts/read-rules.js --stage 实现 --topic 前端,接口`；输出截断必须续读，无 Node.js 读文件。

## 核心保护

- 保留八荣八耻、第一性原理、最小改动。原稿字节不改，例外按 source-policy。
- 高风险：不清库、不重建现有数据库；启动/测试先查隐式迁移。恢复代码不授权回滚数据，见 `database-upgrade-safety.md`。
- 默认可恢复；用户明确放弃改动且不要备份时，只按授权范围执行。
- 旧接口、数据、配置、客户端先兼容，验证后淘汰；不顺手重构/格式化/切栈。代码组织见原文 300/400/600，函数 80 行，性能见 `performance-baseline.md`
- 已有前端先沿用原框架、配色、字体、图标；无前端用 mc-ui；从零新设计才用 shadcn/ui + Tailwind CSS、Morphicons；源码原貌优先，UI 是一级验收。
- 不盲试、不叠加失败补丁、不删测或伪造通过；生产后端关键失败留脱敏日志；不自动合并/强推/删远端/部署。

不因新对话续旧任务。业务任务跑业务项目测试，不跑技能自检；无法验证就报告，写入顺序执行。
