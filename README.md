# fuyunsk：小白也能用的中文工程技能

**你只管说想要什么，剩下的交给 AI。**

这是一个装在 Codex / Cursor 里的 AI 技能（`production-engineering`）。装好以后，你用大白话说“这个按钮没反应”“页面太丑了”“帮我加个功能”，AI 会自己去看代码、动手修改、检查结果，再用人话告诉你改好了什么。

不需要懂专业名词，不需要记命令，也不要求你每次手写技能名。

---

## 它能帮你做什么

- **修问题**：“按钮没反应”“这里报错了”“跑不起来”。
- **改界面**：“这个太丑了”“跟原站不像”“手机上排版乱了”。
- **加功能**：“补上导出功能”“加个后台配置页”。
- **从零做前端**：项目还没有页面时，直接用一套现成的好看界面起步（见下文“前端”）。
- **看代码、查问题**：“帮我看看这个项目有没有漏洞，先别改”。
- **保存和上传**：“保存一下”“提交到 GitHub”，只有你明确说了才会动远程仓库。

## 怎么用

直接说结果就行，比如：

```text
登录页的按钮点了没反应，帮我修一下。
这个后台太丑了，你看着改好看点，功能别动。
帮我看看这个项目有什么问题，先不要改文件。
```

AI 会按事情大小自动选择做法：

| 你说的事 | AI 怎么做 |
| --- | --- |
| 只是问问题（“这段代码什么意思”） | 直接回答，不改任何文件 |
| 小改动（改文案、调样式、修一个明确的小问题） | 看一页要点就动手，改完验证，一句话告诉你结果 |
| 大事（动数据库、权限、支付、上线，或要改很多地方） | 切换到完整、谨慎的流程，先列清单再一步步做 |

意思不明确时，AI 会用人话问你，并给出 2–3 个选项和推荐，不会让你回答技术问题。

## 它会替你守住什么

- **不乱动你的数据**：不清空数据库，不删除你的文件。
- **不改坏原来能用的东西**：原有功能、页面和数据格式默认保持不变，除非你就是要改它。
- **只改当前项目**：不会把改动写到别的项目里。
- **不擅自上线**：不会自己合并主线、强制推送或部署，这些都要你明确同意。
- **不瞎试**：改不好会先查清原因，不在错误上继续叠补丁；做不到的会如实告诉你。

## 让 AI 自动安装（复制这段）

把下面这段发给**你电脑上的 AI**（Codex 或 Cursor 都可以），它会自己完成安装，不用你找目录：

```text
请在当前这台电脑安装或原位更新：
https://github.com/fuyunnat/fuyunsk

先读取仓库 main 的 README.md 和 docs/ai-installation.md，按同一提交完成安装。
本次授权你备份并更新本技能，以及个人全局指令中与本技能有关的自动调用部分。
必须同时完成：完整技能安装、个性化 / Codex 说明的短规则接入、旧规则冲突检查和验证。
使用 docs/personal-custom-instructions.md 与 global-AGENTS.example.md 的同一短模板，
由你直接合并到当前生效的个人规则中；不要让我自己复制粘贴。
短模板只绑定 `$production-engineering` 技能名，不写入 `SKILL.md` 绝对路径；
另外检查 CODEX_HOME、实际技能发现结果和 AGENTS.override.md。
如果是 Cursor：技能装到 ~/.cursor/skills/production-engineering，
短模板写成 ~/.cursor/rules/production-engineering.mdc（alwaysApply: true）。
保留我的其他指令和本机定制；同名技能只留一份有效安装，旧副本移到扫描目录外备份。
不要把完整工程规范塞回个性化，也不要要求我每次输入 $production-engineering。
安装或升级阶段不要在 ~/.codex、~/.cursor、CODEX_HOME、Skill 目录或任意业务项目中创建 `工作流程.md`。
不要更改 API Key、模型、MCP、插件、记忆、沙箱、审批或其他无关配置。
文件安装和自动调用要分别验证，不能只说“已启用”。每完成一个阶段给我简短进度。
遇到必须由我批准的权限或无法确认的冲突，只问那一个阻塞点；其他步骤由你完成。
最后用中文报告来源提交、安装路径、个人规则文件、备份位置、验证结果和剩余待办。
```

装好后重启一下 Cursor / Codex，或者开一个新对话就能用。想确认技能已经生效，可以在对话框输入 `/production-engineering`。

只能访问 GitHub、碰不到你电脑文件的远端 AI 没法替你安装；它说“装好了”也不算数。

## 前端：没有就用 mc-ui，有就沿用

- **项目还没有前端**：直接用 [mc-ui（梦创 UI）](https://github.com/MoeAgent/mc-ui) 当起点。它自带整套组件、侧栏外壳、数据表格和深浅主题，AI 会删掉里面的演示内容，换成你的项目名称和真实数据。
- **项目已经有前端**：继续用你项目原来的框架和风格，不会被强行换掉。mc-ui 只作为“好界面长什么样”的参考。
- **其他新页面**默认用 shadcn/ui + Tailwind CSS，图标用 [Morphicons](https://www.morphicons.com/)；基于 mc-ui 的项目保留它自带的 Lucide 图标。

改界面时，AI 会自己判断视觉方向，在电脑和手机两种尺寸下检查效果，不需要你会美工。规则详见 [mc-ui 脚手架规则](skills/production-engineering/references/mc-ui-scaffold.md) 和 [前端选型](skills/production-engineering/references/frontend-stack.md)。

## 想看 AI 做到哪一步

说一句也行，但不用等你说。做工程任务时，AI 会在你电脑上打开本地进度页，并让它一直运行。页面按 mc-ui 的分层样子显示当前任务和每一步。闲聊、只问不改、或你说停，则不打开。

---

以下内容给想了解细节或维护本技能的人看，普通使用可以跳过。

## 项目根目录工作流程

做稍大的任务时，AI 会在**目标项目根目录**放一份 `工作流程.md`，把要做的事列出来，做完一项勾一项。快速小改不建清单，只在对话里说一句。

- 位置是当前对话正在开发的目标项目根目录，不是 `CODEX_HOME`、`~/.codex/`、`~/.cursor/` 或技能安装目录。参考源码和目标工程分开时，只写在目标工程里。
- 换会话、上下文被压缩或你问进度时，AI 先读这份清单再继续，不靠聊天记忆。
- 直接给目标就行，AI 会自己拆分和补全清单，不必先逐项审批；你明确要求先确认时除外。
- 没验证过的事项不会打勾；新需求追加在后面，旧记录保留。

本仓库根目录的 `工作流程.md` 只记录 fuyunsk 自身维护，不会被复制到你的项目里。清单规则见 [工作清单规则](skills/production-engineering/references/workflow-checklist.md)，空白格式见 [模板](skills/production-engineering/templates/workflow.example.md)。

## 已提供源码：先读、按要求改

你给了源码，AI 会先读相关页面、样式和交互，再动手，不会让你重新描述一遍。“保持原样，只换框架”就只换实现方式，不擅自重新设计。真正查不清、又会影响结果的地方，才会问你一个具体问题。

## 自动调用是怎么接上的

```text
个性化 / Codex 说明（或 Cursor 规则）里的一小段调度规则
    → 遇到工程类请求时自动调用本机技能
    → 读技能入口 SKILL.md
    → 按事情大小只读需要的规则
```

调度规则很短，只写技能名，不写死安装路径；完整规则都在技能里。默认位置是 `~/.codex/AGENTS.md`（Codex）或 `~/.cursor/rules/production-engineering.mdc`（Cursor）；如果存在 `AGENTS.override.md`，安装时也会同步。详见 [安装教程](docs/ai-installation.md)、[个性化模板](docs/personal-custom-instructions.md)、[旧版个性化迁移](docs/legacy-personalization-migration.md)。

自动调用由客户端和模型判断，不能保证每句话都命中；没调用到时，在开头加 `/production-engineering` 就行。

## 团队 Git 交付

提交、推送和回滚时，AI 会读 [团队 Git 交付规则](skills/production-engineering/references/git-team-delivery.md)：按能单独检查、单独撤回的小单元提交；推送前确认远程主线有没有被别人改过；绝不用强制推送覆盖别人的工作。

“已推送”不等于“已进入 main”。只有你明确说“提交到 main”时，才会把改动放进主线；每次都会说明提交编号、是否已进入主线、怎么撤回。

## 复杂任务执行编排

大型、多阶段任务才会启用 [代理执行规则](skills/production-engineering/references/agentic-execution.md)，普通修改不会因此变慢：

- 独立任务才并行，共享文件或有先后依赖的保持顺序；
- 子任务只拿必要的上下文；
- 重要改动做“需求对不对、代码好不好”两轮复查；
- 宣布完成前做 fresh verification（在最后一次修改之后重新验证），不拿旧结果充数。

这些方法选择性吸收自 `obra/superpowers`，对应关系见 [方法吸收映射](docs/superpowers-method-absorption.md)。

## 其他专项能力

需要时才加载，平时不占用：

- **整项目换语言 / 迁移**：先盘点旧功能，逐项对照验收，见 [迁移规则](skills/production-engineering/references/project-migration.md)。
- **上游同步 / 模板二开**：只吸收需要的更新，保护你的二次开发。
- **SEO / 收录**：公开页面按需检查，后台不做全站审计。
- **数据库升级**：只做向下兼容的增量修改，不清库、不重建。
- **跨项目误写保护**：写文件前核对路径，防止改到别的项目，见 [写入边界](skills/production-engineering/references/project-write-boundary.md)。

## 原始规范怎么保留

作者上传的两份原始规范（下称原文）完整保留在技能里（`references/source-original.md`、`references/source-speed.md`），并用校验值锁定、按章节无损切片，保证一个字都没改。后来的调整都写在 [差异与授权说明](skills/production-engineering/references/source-policy.md) 里，每段条款的出处见 [覆盖表](skills/production-engineering/references/rules-index.md)。

技能入口和说明全部用中文；代码、命令和路径保留原样。

## 给维护者：读取与验证（仅维护本技能）

完整流程下，AI 用读取脚本一次取齐需要的规则：

```bash
node "<技能目录>/scripts/read-rules.js" --stage 实现 --topic 前端,接口
node "<技能目录>/scripts/read-rules.js" --stage 只读 --topic 审计
```

修改本仓库后运行：

```bash
node scripts/validate-skill.js
git diff --check
```

日常用技能改别的项目时，跑的是那个项目自己的测试，不跑这里的自检。本机安装情况可以用 `node scripts/doctor.js` 只读诊断。

这些检查证明的是规则文件、读取链路和原稿完整性没问题，不等于模型每次都会照做，也不能保证模型实际逐次服从；实际效果要在真实使用中观察。速度说明见 [运行延迟说明](docs/runtime-latency.md)，第三方方法来源与许可证见 [来源说明](skills/production-engineering/references/upstream-notes.md)。

## 更新

GitHub 上更新以后，你电脑上的技能不会自动跟着变。想更新时，把上面“让 AI 自动安装”那段再发给 AI 一次就行，它会原位更新并保留你的其他设置。
