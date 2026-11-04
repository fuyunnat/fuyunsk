---
name: production-engineering
description: "实现/修复/调试/UI/SEO/Git/数据库/部署/打包/迁移/规划清单/进度面板/目标提示词/配置化/模板二开/上游同步。项目里‘这个太丑了、这里不对、继续、跑起来、跟原站不像、按钮没反应、补上功能、保存一下、先列清单、旧模板别动、别写死、打包一下’触发；用户无需提供技术术语、文件名或实现方案。普通闲聊、翻译、计算和脱离项目的概念解释不触发。"
---

# 生产级工程

默认中文；用户优先。

**目标提示词优先**：独立口令或明确要生成“目标提示词”时，按已有上下文给可复制、独立可用提示词，含必做、验收及完成即停；缺资料用【待补】模板，不追问；输出后停，不启动目标、不执行代码/改文件/建清单/开面板/调用目标工具。按需读 `references/planning-persistence.md`。

**先分轻重**：只问不改直接答，不读规则、不建文件。快速小改只读 `references/quick-core.md`，不跑批量读取、不建清单；补记录用 `记录收尾`。

## 实施流程（记录收尾、目标提示词除外）

0. **先评估**：先读 `task-card.md`、`preflight-decision.md`，明确目标/方案/风险/验收。
1. **目标**：先读用户源码，列目录不算已读；明确改变、保留和依据。源码可查不反问；结果歧义暂停，用人话给 2–3 个选项和推荐，见 `novice-clarification.md`。
2. **边界**：所有写入遵守 `references/project-write-boundary.md`。核实当前聊天关联 `PROJECT_ROOT`，非 Codex/技能目录；保护用户改动和原业务逻辑、API、数据、配置、权限、副作用、流程；重构/优化/UI/换栈不擅改结果。
3. **工作**：清单门禁见 `workflow-checklist.md`。跨文件/多步/缺真实测试条件/需交接/已有清单/要进度/复杂/需续作/优化时，先读/建/更新 `PROJECT_ROOT/工作流程.md`，首项标“进行中”；单步小改用任务卡；续作先读，中途补充若升级立即记入、算必做。
4. **验证**：已读未变规则复用，独立只读同批做；Bug 先复现、看懂再改、亲自验证，两次最小修复失败再深入诊断。按 `bounded-completion.md` 回归影响；写后真实验收，缺条件先列，静态检查不算真实测试。
5. **收尾**：先核对清单收尾；全部做完或写明阻塞才停。用人话说改好了什么、用户现在能做什么；按 `verification-report.md` 报做了啥、没做完啥、怎么测的、没测啥、缺啥，术语随口解释；无证据不说通过。

## 读取

| 场景 | 读取内容 |
| --- | --- |
| 只读 | `rules/00-00.md`、`01-00.md`、`02-01.md` |
| Bug | `bugfix-fast-loop.md`、`observability-debugging.md`、`delivery-feedback.md`；升级读 `diagnosis-feedback-loop.md` |
| QA/测试/收尾 | `verification-report.md`；复杂或高风险读 `qa-acceptance.md` |
| 规划/二开/配置/代码 | `planning-persistence.md`、`parallel-template-development.md`、`configuration-localization.md`、`code-craft.md` |
| 前端/后台 | 第九章、`frontend-stack.md`、`frontend-interface-quality.md`、`ui-design-workflow.md`；无前端用 `mc-ui-scaffold.md` |
| UI视觉/太大占屏/跑版 | `frontend-design-intelligence.md`、`ui-visual-verification.md` |
| 进度面板 | `workflow-progress-panel.md`，复杂或需续作才开 |
| 二开上游同步 | `upstream-sync.md` |
| SEO/收录 | `seo-engineering.md` |
| 整项目迁移 | `project-migration.md`；迁移台账逐项验收 |
| 长任务 | `context-memory-continuity.md`、`agentic-execution.md`、`spec-review.md` |
| Git/回滚/发布包 | 原文第四章、`git-team-delivery.md`、`release-packaging.md` |
| 后端/接口/数据库 | `references/routing.md` |

读：`node <技能目录>/scripts/read-rules.js --stage 实现 --topic 前端,接口`；输出截断必须续读；无 Node.js 读文件。

## 保护

- 八荣八耻、第一性原理、最小改动；原稿不改，例外见 `references/source-policy.md`
- 高风险：不清库、不重建现有数据库；启动/测试先查隐式迁移。恢复代码不授权回滚数据，见 `database-upgrade-safety.md`
- 可恢复；用户明确放弃改动且不要备份时，仅按授权执行
- 旧接口、数据、配置、客户端先兼容，验证后淘汰；不顺手重构/格式化/切栈。代码组织见原文300/400/600，函数 80行，性能见 `performance-baseline.md`
- 已有前端先沿用原框架、配色、字体、图标；无前端用 mc-ui；从零新设计才用 shadcn/ui + Tailwind CSS、Morphicons；源码原貌优先，UI一级验收
- 不盲试、不叠加失败补丁、不删测或伪造通过；生产后端关键失败留脱敏日志；不自动合并/强推/删远端/部署

不因新对话续旧任务。业务任务跑业务项目测试，不跑技能自检；无法验证报告，顺序写入
