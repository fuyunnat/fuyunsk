# fuyunsk：中文工程技能

这是按用户完整自定义指令组织的中文 `production-engineering` 技能，用于真实工程实现、修复、前端界面、代码审计、验证、Git 交付、数据库和部署。

**保留原文，不靠删规则提速；工程任务允许自动匹配，普通聊天不加载工程正文。**

## 使用方法

直接描述工程目标，例如“修一下这个页面的按钮，只改本地并验证”。需要明确点名或排查匹配时可写：

```text
$production-engineering 做一个后台配置页，沿用当前项目技术栈。
$production-engineering 检查这个仓库有没有漏洞，先不要改文件。
```

自动匹配取决于客户端与模型，不把静态测试通过当作所有真实请求均命中的保证。

## 原始规范怎么保留

两份上传原稿分别固定为 `references/source-original.md` 和 `references/source-speed.md`；重构前仓库完整规范也未删除。`source-lock.json` 固定校验值；生成器按章节逐字节切片，顺序拼接必须与原稿完全相同。最后上传原文是执行基准，速度稿补充及冲突单独记录，不静默改变“必须”“禁止”和例外。

[逐段覆盖表](skills/production-engineering/references/rules-index.md)给出源行号和实际读取位置。[差异与采用说明](skills/production-engineering/references/source-policy.md)记录两版的通道、状态、Git 检查和授权差异。

## 核心要求

保留中文沟通和中文提交评审、八荣八耻、第一性原理检查、真实项目查证、用户改动保护、Git 门禁、可恢复删除、最小改动、职责分层、原有功能回归、API 兼容、数据库迁移、幂等、安全审计、证据和回滚要求。

前端不是只求能用：保留设计系统、布局、状态、响应式和视觉验收。已有项目不换栈；新后台默认 Vue 3、Vite、Ant Design Vue、普通 `.vue/.js`，只按需使用路由、状态管理和其他依赖。

完整通道保留原文条件式任务分支推送和评审流程；只读、小改、不具备远端条件等按原文处理。**提交或推送不等于允许合并主线、强推、删除远端分支或操作生产。**

## 速度从哪里来

初始匹配只需要简短名称与描述；选中技能后读取短入口。原文已在维护阶段拆好，运行时只读当前领域和阶段的片段，不启动生成器、不联网拉规则、不默认恢复任务、不反复扫描或运行相同检查。完整任务仍须覆盖所有适用条款。

[只读条款助手](skills/production-engineering/scripts/read-rules.js)是可选工具，无第三方依赖；也可以直接用文件工具读取切片。文件体积和本地读取基准不等于模型端到端速度，实际改善需要在同一环境对照测量。

## 安装和升级

[安装教程](docs/ai-installation.md)说明原位更新、备份、去重和本机验收。同名技能只安装一份，不把全文复制进全局指令；[短全局模板](global-AGENTS.example.md)和[个性化模板](docs/personal-custom-instructions.md)最多选择一个。

## 按需方法

在原文规则之外，保留此前从 `mattpocock/skills` 提炼的诊断闭环、模块设计、行为测试、纵向切片和双轴审查；全部使用中文说明，不能覆盖原规范。来源与许可证见[来源说明](skills/production-engineering/references/upstream-notes.md)。

## 验证

```bash
node scripts/build-rules.js --check
node scripts/validate-skill.js
git diff --check
```

校验包含原稿锁定、逐段重建、主题读取、中文入口、路径与错误处理、状态助手、秘密与产物检查。程序测试不代表真实 Codex 行为测试；安装后的触发、中文交付和实际耗时需按教程另行验收。
