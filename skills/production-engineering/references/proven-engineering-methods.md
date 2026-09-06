# 高质量工程方法补充层

本文件只吸收公开高质量开发 Skill 中与当前 `production-engineering` **不冲突、且现有规则尚未充分覆盖**的方法。它不是第二套规范，也不是新的最高优先级规则。

## 一、优先级与不可覆盖边界

执行顺序始终是：

1. 用户当前明确要求；
2. 本 Skill 现有规则、原文、行为锁、数据库保护、写入边界、Bug 快速修复、Git 与高风险授权；
3. 本文件的补充方法。

只要本文件与现有规则存在冲突、扩大授权、增加破坏性、拖慢当前快速通道或改变业务结果，**立即舍弃本文件对应方法，继续按现有规则执行**。

本文件不得：

- 修改或替代 `source-original.md`、`source-speed.md`、`source-lock.json`；
- 覆盖 `novice-clarification.md`、`behavior-preservation.md`、`database-upgrade-safety.md`、`bugfix-fast-loop.md`、`project-write-boundary.md`；
- 把普通 Bug、局部小改或已明确任务升级成大型设计/审计流程；
- 自动安装、复制或运行第三方 Skill；
- 因外部“最佳实践”改变用户现有业务逻辑、框架、数据库、权限或交付授权。

## 二、已经存在的优秀方法不要重复叠加

以下外部思路当前 Skill 已有等价或更适合本用户的实现，因此只确认来源，不再新增第二套流程：

- **事实由 Agent 查，结果决策才问用户**：继续以 `novice-clarification.md` 为准，不引入高强度连续盘问。
- **Bug 建立紧反馈闭环**：普通 Bug 继续以 `bugfix-fast-loop.md` 为准；难复现、偶发、跨边界或升级后的故障再用 `diagnosis-feedback-loop.md`。
- **行为驱动的小步实现 / TDD 思路**：继续以 `design-testing.md` 的“一个外部可见行为 → 失败检查 → 最小实现 → 验证 → 保持行为整理”为准。
- **需求/意图与代码质量分开审查**：继续以 `spec-review.md` 的双轴审查为准，不再叠加另一套强制 review 仪式。
- **渐进加载**：继续保持当前短入口 + `references/` 按需读取，不把外部方法重新塞回 `SKILL.md`。

这样吸收优点，但不重复增加耗时和上下文。

## 三、补充方法 1：影响优先，而不是平均用力

用于性能、容量、加载速度、前端响应和资源优化。先测量，再按影响排序，不因为某个优化“看起来专业”就先做。

优先级原则：

1. 先处理会叠加完整网络/IO 等待时间的串行依赖和 waterfall；
2. 再处理明显影响首屏、启动和传输成本的 bundle / 资源体积；
3. 再处理服务端关键路径、数据获取和缓存边界；
4. 再处理客户端重复请求、重复计算和明显重渲染；
5. 最后才考虑局部 JavaScript 微优化和没有测量依据的小技巧。

React / Next.js 项目可把 Vercel 的类别优先级作为**候选检查顺序**，但必须先确认项目真实技术栈、版本和瓶颈；不能把 React/Next 专用建议套到 Vue、Go 或其他宿主。

任何优化仍受 `behavior-preservation.md` 约束：不能为了速度静默改变一致性、排序、精度、缓存时效、超时、重试、事务、权限或用户可见结果。

## 四、补充方法 2：每种重方法都必须有“什么时候不要用”

高质量 Skill 的共同优点之一，是明确使用范围，而不是能力越多越全开。

采用以下约束：

- 安全审计、深度架构扫描、差异攻击面分析只在真实风险或用户明确要求时使用；普通业务修复不自动加载。
- 大型规格/计划/多轮 review 只用于大任务、多阶段、难回滚或真实需要协作交接的工作；局部 Bug、小改继续走现有快速闭环。
- 性能方法只在有性能目标、指标或真实退化时使用；不能把所有实现任务都变成性能优化。
- 原型只回答明确的设计问题，不把原型流程强加给已经明确的正式实现。
- 外部方法若需要新工具、子代理、额外文件或运行时依赖，默认不启用；先看当前工具和现有规则能否完成。

**风险越高，流程可以越严格；任务越局部、越可恢复，流程应越轻。** 不得反过来。

## 五、补充方法 3：大型审查先限定范围，再深入

仅用于大型改动、重要 review、跨模块变更；普通 Bug 不适用。

审查顺序：

1. 先固定真实 diff / 提交 / 分支范围；
2. 先读 changed files；
3. 只有能说出一个具体风险时，才向相邻调用方、共享状态、权限、事务、公共 API 等位置扩展；
4. 跨切面风险如锁顺序、公共契约、共享状态、权限边界可以扩大检查，但必须说明为什么；
5. 分别给出“需求/意图是否满足”和“代码/测试质量是否成立”的结论，不能互相代替。

这层方法用于**减少无目的全仓扫描**，不是增加一次额外全仓审计。

如果环境支持真正独立的 review Agent，可以在大型且可并行的任务上用独立复核；环境不支持时正常完成当前双轴审查，不因为缺少子代理阻塞交付。

## 六、补充方法 4：高风险差异先看 blast radius

用于安全、权限、公共 API、共享状态、并发、资金、数据库等高风险变化。

在已经触发高风险审查时，优先确认：

- 改动影响哪些调用方、角色、数据路径和外部副作用；
- 是否移除了验证、权限检查、边界条件或错误处理；
- 公共接口、共享状态或事务边界是否扩大影响范围；
- 测试是否真的覆盖受影响的关键路径。

只在高风险任务触发，不把它变成普通小改的前置全仓扫描。已有 `code-risk-review.md`、`behavior-preservation.md` 和数据库规则仍是主规则。

## 七、补充方法 5：维护 Skill 时 description 只负责“命中”，正文负责“执行”

本条只约束以后维护本 Skill 的方式，不回写或强制改动当前已经验证的 frontmatter。

未来若调整 Skill 元数据：

- description 优先描述**什么场景应命中**，避免把完整执行流程塞进 description；
- 具体步骤继续放在 `SKILL.md` 和按需 reference；
- 命中词应描述问题/场景，而不是绑定某一种语言或实现细节；
- 修改 description 必须单独验证隐式命中率，不能为了“更标准”破坏当前口语高命中能力。

这样减少模型只读 description 就跳过正文的风险，同时保护当前已经为小白优化过的触发方式。

## 八、外部来源与使用方式

本文件只重新表述通用方法，不复制第三方 Skill 原文，不把第三方 Skill 作为运行依赖。

方法参考：

- Anthropic Skills / skill-creator：渐进加载、references 按需读取、Skill 结构组织
  - https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md
- Matt Pocock Skills：事实与决策分离、难 Bug 紧反馈闭环、回归验证
  - https://github.com/mattpocock/skills
  - https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnosing-bugs/SKILL.md
- obra/superpowers：Skill 触发描述与正文分离、任务级规范/质量双阶段 review 的方法
  - https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md
  - https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md
- Vercel Agent Skills：React/Next 性能规则按影响等级排序，优先处理 waterfall 和 bundle 等高影响问题
  - https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md
- Trail of Bits Skills：明确 When to Use / When NOT to Use、风险越高流程越严格、差异审查优先 blast radius
  - https://github.com/trailofbits/skills/blob/main/CLAUDE.md
  - https://github.com/trailofbits/skills/blob/main/plugins/differential-review/skills/differential-review/SKILL.md

外部项目后续变化不会自动改变本文件；需要再次人工审查后才能吸收新的方法。