# 原文执行路由

只选读取范围，不重复执行规则。阶段/领域已知时同批读取：

```bash
node <技能目录>/scripts/read-rules.js --stage 实现 --topic 前端,接口
node <技能目录>/scripts/read-rules.js --id 04-04
```

无 Node.js 直接读文件，不安装依赖。旧主题/编号接口和原文内容不变；第九章携带 `frontend-stack.md` 当前选型。只有内容缺失、截断或版本变化才重读。原文与授权例外见 `source-policy.md`；读取器不扫描项目、不执行写入、不恢复任务。

## 领域路由

| 主题 | 原文范围；专项 |
| --- | --- |
| 实施前评估/方案选择 | 一/二/三/七/十一/二十；`preflight-decision.md` |
| 任何会写项目文件 | 工作流程门禁；`workflow-checklist.md`、`bounded-completion.md`、`project-write-boundary.md` |
| 通用/明确局部小改 | 零/一/二/三及六/七/二十适用部分 |
| Bug、报错、功能异常且用户要求修复 | 六/七/二十；先 `bugfix-fast-loop.md`；只有升级条件才读 `diagnosis-feedback-loop.md` |
| 二开/派生项目同步上游、官方修复或新功能 | 六/七/二十；`upstream-sync.md` |
| SEO、收录 | 前端/性能/配置/内容及二十；`seo-engineering.md` |
| 前端模板并行二开 | 六/七/九/二十；`parallel-template-development.md` |
| 工程开始/继续、进度面板 | `workflow-progress-panel.md`，自动检查只读面板 |
| 先列清单、字段盘点 | 二/六/二十；`planning-persistence.md` |
| 后台可调业务参数/配置化 | 十五及实现/验证；`configuration-localization.md` |
| 前端与后台 | 六/七/九/二十；`frontend-stack.md`、`frontend-interface-quality.md`、`ui-design-workflow.md`、配置化专项 |
| 前端交付 | 前端/接口/验证/Git；`frontend-delivery-loop.md` |
| 视觉设计 | 前端/验证；`frontend-design-intelligence.md` |
| UI视觉验证 | 前端/验证；`ui-visual-verification.md` |
| 包裹式工作台 | 前端；`wrapped-workspace-ui.md` |
| 后端/接口/并发 | 七/八/十/十四/十七/十八/二十；`design-testing.md`、配置化专项 |
| 性能 | 十一及受影响领域；`diagnosis-feedback-loop.md`、`proven-engineering-methods.md` |
| 数据库/迁移/部署启动 | 十/十二/十三/十五/十六/二十；`database-upgrade-safety.md`、配置化专项 |
| 安全/审计/依赖 | 五/十六至十九/二十三；`code-risk-review.md`，默认只读 |
| 日志 | 十八；沿用项目日志，不改造全仓 |
| 删除/恢复 | 一/五及实际影响；`source-policy.md` 的明确授权例外 |
| 内容/文档 | 二/六/二十一/二十三；`content-writing-quality.md` |
| 任务续航/整项目迁移 | 二章六节；`context-memory-continuity.md`；整项目重写另读 `project-migration.md` |
| 大型多阶段/独立复核 | 六/七/二十/二十二/二十三；`agentic-execution.md`、`spec-review.md` |
| 项目理解/完成报告 | 零/一/二与适用领域、二十至二十四；`project-understanding.md` |

交叉领域取并集，不漏权限、幂等和接口。写代码默认应用专业代码工艺 `code-craft.md`；纯文档/只读不加载。复杂业务的维护注释与错误处理在该专项，不再复制到入口。

## 专项选择

视觉设计：重新设计、精修、太丑、质感、不会美工、你看着弄。AI 定方向，不要求用户提供美工参数；纯提问/仅发图不写文件。尺寸/密度、跑版、溢出或参考图追加 UI视觉验证。普通按钮修复和严格原样迁移不加载重设计。详细触发及设计/多视口验收分别在两份视觉专项。

公开可索引前台新建/大改按需做轻量 SEO Guard；明确 SEO 才完整加载；后台不做全站审计。配置化区分启动连接与后台运营参数，前台文案沿用 i18n。上游同步只吸收已确认目标；完成条件见 bounded-completion，源文件不覆盖派生功能。

代理、独立 reviewer 和 worktree 只在有实际价值且授权适用时使用。子代理给最小上下文，真正独立才并行；普通小改不增加这一层。安全和业务风险不因读取速度而降级。

## Git 按阶段读取

原文第四章拆为 `04-00.md` 至 `04-10.md`：00 边界，01 提交，02 测试，03 分支/推送，04 中文提交格式，05 检查，06 远端风险，07 PR，08 回滚，09 CI，10 证据。按当前阶段读取，主线/合并/部署以明确授权为准，详见 `git-team-delivery.md`。

生产日志是交付能力，不是额外装饰；关键失败路径完全无日志不能交付。“buglog”不强制一定是单独文件，可用 stdout/stderr；不得记录密码、Token、Cookie、密钥和隐私原文。完整门槛按原文第十八章，不在普通小改中重做日志体系。

原稿、速度稿差异和补充方法优先级见 source-policy；`rules-speed/01-01.md`、`01-02.md` 保留组织/回归补充。外部方法按需选 `design-testing.md`、`proven-engineering-methods.md`；来源维护才读 `upstream-notes.md`。
