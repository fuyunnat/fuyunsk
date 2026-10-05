---
name: production-engineering
description: "实现、修复、调试、UI、SEO、Git、数据库、部署、迁移、规划清单、进度面板、配置化、模板二开和上游同步。项目里‘这个太丑了、这里不对、继续、跑起来、跟原站不像、按钮没反应、补上功能、保存一下、先列清单、旧模板别动、别写死’也触发；用户无需提供技术术语、文件名或实现方案。普通闲聊、翻译、计算和脱离项目的概念解释不触发。"
---

# 生产级工程

默认中文。例外见 `references/source-policy.md`；用户要求优先，Skill 非权限沙箱。

## 一个执行流程

1. **查明目标**：先读用户提供的源码，列目录不算已读；明确改变什么、保留什么、依据在哪。源码可查不反问；明确要求直接执行。结果歧义暂停受影响修改，用人话反问，给 2–3 个结果选项和推荐；见 `references/novice-clarification.md`。
2. **确定边界**：所有写入遵守 `references/project-write-boundary.md`。核实当前聊天关联源文件夹 `PROJECT_ROOT`，非 Codex/技能目录；保护用户改动。原业务逻辑、API、数据、配置、权限、副作用和流程默认锁定；重构、优化、UI/框架/语言重写不授权改变结果。
3. **开始工作**：工作流程写入门禁见 `references/workflow-checklist.md`。默认先读/建/更新 `PROJECT_ROOT/工作流程.md`，第一项标为“进行中”；门禁失败停止业务写入并报告。小改也记、续作先读；清单原文恢复或禁止写入按专项例外，不反向追加记录。
4. **实施与验证**：同批读适用规则。Bug 有证据即修复，两次最小修复失败再深入诊断。范围与停止见 `references/bounded-completion.md`。回归只验相关影响，不为记录重跑全套。
5. **收尾**：验收通过后交付并停止；阻塞列原因和恢复条件，独立已授权项继续。简报结果；提交/推送/PR/main/部署分别报告。

## 按需读取

| 场景 | 读取内容 |
| --- | --- |
| 开始/只读 | `references/rules/00-00.md`、`01-00.md`、`02-01.md` |
| 局部小改 | 零章条件与三/六/七/二十适用；不加代理、迁移、全仓审计 |
| Bug、报错、功能异常且用户要求修复 | `references/bugfix-fast-loop.md`；升级后才读 `diagnosis-feedback-loop.md` |
| 规划清单/模板二开/别写死/写代码 | `planning-persistence.md`、`parallel-template-development.md`、`configuration-localization.md`、`code-craft.md`，按需选择 |
| 前端/后台 | 第九章、`frontend-stack.md`、`frontend-interface-quality.md`、`ui-design-workflow.md` |
| UI视觉：委托、太大占屏、跑版、参考图 | `frontend-design-intelligence.md`、`ui-visual-verification.md`，按需 |
| 工程开始/继续、进度面板 | `workflow-progress-panel.md`，自动检查面板 |
| 二开上游同步 | `upstream-sync.md`；吸收目标，保护二开，不默认追平 |
| SEO/收录 | `seo-engineering.md`；普通公开前台按需轻量检查，后台不全站审计 |
| 整项目迁移 | `project-migration.md`；旧功能对照、迁移台账与逐项验收，局部修改不加载 |
| 长任务或恢复旧任务 | `context-memory-continuity.md`；确需独立复核再读 `agentic-execution.md`、`spec-review.md` |
| Git交付/回滚 | 原文第四章当前阶段、`git-team-delivery.md`，按阶段读 |
| 后端/接口/数据库 | `references/routing.md` 对应领域与原文章节 |

读取：`node <技能目录>/scripts/read-rules.js --stage 实现 --topic 前端,接口`。阶段不扩大授权，输出截断必须续读。无 Node.js 按表与路由读文件，不装依赖。旧主题/编号接口不变。

## 核心保护

- 保留八荣八耻、第一性原理、最小改动和适用原文。原稿字节不改，明确例外按 source-policy 执行。
- 高风险：不清库、不重建现有数据库；启动/测试先查隐式迁移。恢复代码不授权回滚数据，详见 `references/database-upgrade-safety.md`。
- 默认可恢复；用户明确放弃指定代码改动并要求不备份时，按授权范围执行，不扩到数据、配置或未知文件。
- 旧新接口、数据、配置和客户端先兼容共存，验证后再淘汰；不顺手重构/格式化/切栈。代码组织按原文 300/400/600 行风险阈值、函数 80 行要求及 `code-craft.md` 执行。
- 新设计默认 shadcn/ui + Tailwind CSS、Morphicons；用户指定框架/源码原貌优先。UI 是一级验收，保留交互，尺寸与首屏密度按视觉专项核对。
- 不盲试、不叠加失败补丁、不删测试或伪造通过；生产后端关键失败留脱敏日志。不自动合并主线、强推、删远端分支或部署。

不因新对话自动续旧任务。业务任务跑业务项目测试，不跑技能自检；复用有效证据，无法验证如实报告。只读可批量，共享写入顺序执行。
