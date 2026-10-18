---
name: production-engineering
description: "实现、修复、调试、UI、SEO、Git、数据库、部署、打包、迁移、规划清单、进度面板、配置化、模板二开和上游同步。项目里‘这个太丑了、这里不对、继续、跑起来、跟原站不像、按钮没反应、补上功能、保存一下、先列清单、旧模板别动、别写死、打包一下’也触发；用户无需提供技术术语、文件名或实现方案。普通闲聊、翻译、计算和脱离项目的概念解释不触发；只问不改直接回答。"
---

# 生产级工程

默认中文。例外见 `references/source-policy.md`；用户要求优先，Skill 非权限沙箱。

**先分轻重**：只问不改直接答，不读规则、不建文件。快速小改（局部、易撤回、不碰数据/权限）只读 `references/quick-core.md`，不跑批量读取、不建清单。其余按下文。

## 一个执行流程

0. **先评估再执行**：写文件前按 `preflight-decision.md` 确认目标、方案、风险和验收；中高风险或只说“优化”先记入 `工作流程.md`。
1. **查明目标**：先读用户提供的源码，列目录不算已读；明确改变什么、保留什么、依据在哪。源码可查不反问；明确要求直接执行。结果歧义暂停受影响修改，用人话反问，给 2–3 个结果选项和推荐；见 `novice-clarification.md`。
2. **确定边界**：所有写入遵守 `references/project-write-boundary.md`。核实当前聊天关联源文件夹 `PROJECT_ROOT`，非 Codex/技能目录；保护用户改动。原业务逻辑、API、数据、配置、权限、副作用和流程默认锁定；重构、优化、UI/框架/语言重写不授权改变结果。
3. **开始工作**：工作流程写入门禁见 `workflow-checklist.md`。快速小改以外先读/建/更新 `PROJECT_ROOT/工作流程.md`，第一项标为“进行中”；门禁失败停止业务写入并报告。续作先读；用户中途补充（含小改）立即记入、算必做
4. **实施与验证**：同批读适用规则。Bug 有证据即修复，两次最小修复失败再深入诊断。范围与停止见 `bounded-completion.md`。回归只验相关影响。
5. **收尾**：原有和补充的事项全部做完或写明阻塞才停，不中途问是否继续。用人话说改好了什么、用户现在能做什么；提交/推送/PR/main/部署分别报告。

## 按需读取

| 场景 | 读取内容 |
| --- | --- |
| 开始/只读 | `rules/00-00.md`、`01-00.md`、`02-01.md` |
| Bug、报错、功能异常且用户要求修复 | `bugfix-fast-loop.md`、`observability-debugging.md`、`delivery-feedback.md`：先复现、看懂再改、亲自验证；升级后才读 `diagnosis-feedback-loop.md` |
| 规划清单/模板二开/别写死/写代码 | `planning-persistence.md`、`parallel-template-development.md`、`configuration-localization.md`、`code-craft.md` |
| 前端/后台 | 第九章、`frontend-stack.md`、`frontend-interface-quality.md`、`ui-design-workflow.md`；无前端用 `mc-ui-scaffold.md` |
| UI视觉、太大占屏、跑版 | `frontend-design-intelligence.md`、`ui-visual-verification.md` |
| 进度面板 | `workflow-progress-panel.md`，工程任务自动打开 |
| 二开上游同步 | `upstream-sync.md` |
| SEO/收录 | `seo-engineering.md` |
| 整项目迁移 | `project-migration.md`；迁移台账逐项验收 |
| 长任务/续作 | `context-memory-continuity.md`、`agentic-execution.md`、`spec-review.md` |
| Git交付/回滚/发布包 | 原文第四章、`git-team-delivery.md`、`release-packaging.md` |
| 后端/接口/数据库 | `references/routing.md` |

完整读取：`node <技能目录>/scripts/read-rules.js --stage 实现 --topic 前端,接口`；输出截断必须续读，无 Node.js 直接读文件。

## 核心保护

- 保留八荣八耻、第一性原理、最小改动和适用原文。原稿字节不改，例外按 source-policy。
- 高风险：不清库、不重建现有数据库；启动/测试先查隐式迁移。恢复代码不授权回滚数据，见 `database-upgrade-safety.md`。
- 默认可恢复；用户明确放弃改动且不要备份时，只按授权范围执行。
- 旧新接口、数据、配置和客户端先兼容共存，验证后再淘汰；不顺手重构/格式化/切栈。代码组织按原文 300/400/600 行、函数 80 行及 `code-craft.md`，性能底线 `performance-baseline.md`
- 新设计默认 shadcn/ui + Tailwind CSS、Morphicons（mc-ui 用 Lucide）；用户指定框架/源码原貌优先。UI 是一级验收，尺寸密度按视觉专项。
- 不盲试、不叠加失败补丁、不删测试或伪造通过；生产后端关键失败留脱敏日志，缺日志就补。不自动合并主线、强推、删远端分支或部署。

不因新对话自动续旧任务。业务任务跑业务项目测试，不跑技能自检；复用有效证据，无法验证如实报告；只读可批量，写入顺序执行。
