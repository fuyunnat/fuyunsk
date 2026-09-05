# 安装和升级

把下面内容交给本机 Codex：

```text
请原位安装或更新 https://github.com/fuyunnat/fuyunsk/tree/main/skills/production-engineering 。
先识别当前客户端实际使用的技能目录；同名技能只保留一份，不在 ~/.agents/skills 和 ~/.codex/skills 重复安装。
升级前给旧技能和将要修改的全局规则建立带时间戳的可恢复备份。
读取新版 SKILL.md；确认中文说明、原文切片和来源校验文件齐全，allow_implicit_invocation 为 true。
不要把完整原文复制进全局 AGENTS.md 或个性化提示词，不改 API Key、模型、MCP、沙箱或其他无关配置。
旧版要求“只有手写技能名才执行”的规则应只在本技能管理的范围内更新；保留我的其他规则。
报告安装位置、备份位置和验证结果，未实际执行的检查不要说通过。
```

## 安装后检查

技能目录应包含 `SKILL.md`、`agents/openai.yaml`、`references/source-original.md`、`references/source-speed.md`、`references/rules/`、`references/rules-speed/`、`references/rules-manifest.json` 和 `references/rules-index.md`。原文切片已随仓库发布，正常使用不需要先运行生成器。

客户端未刷新时退出重开。在全新会话分别验证：普通“你好”没有工程读文件或任务恢复；“修一下当前项目的按钮文案，先只改本地”能匹配工程规范；“审计但不要改”不会写入；实际提交和评审说明为中文。检查工具轨迹与真实文件，不能仅凭助手自称已使用。

## 原文和生成文件

从仓库根运行 `node scripts/build-rules.js --check` 校验原稿与切片一致；维护者改生成逻辑后执行 `node scripts/build-rules.js`。未经用户明确变更规则，不更新原稿锁定值。完整自检运行 `node scripts/validate-skill.js`。

## 本机延迟对比

使用相同客户端、模型、推理设置、项目与网络，各做几次旧版/新版对照，记录发送到首个实际内容和整个请求耗时。排除首次加载、缓存与上游波动；查看是否额外扫描、初始化或重试。只读助手的本地耗时不是 Codex 总响应时间，不承诺所有请求秒回。

## 回退

保留旧技能备份并在需要时恢复同一安装目录；不要永久删除用户文件。仓库回退使用正常反向提交，不能强推改历史。仓库更新不等于用户电脑自动升级。
