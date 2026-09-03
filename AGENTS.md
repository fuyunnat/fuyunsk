# fuyunsk 仓库工作规则

本仓库只维护自家的 `production-engineering` skill。不要引入、复制或依赖 Ponytail 等第三方 skill、hooks、命令或多平台代理规则，除非用户再次明确要求。

默认使用中文回答。

## 仓库目标

- `skills/production-engineering/SKILL.md` 是轻量入口，负责触发和路由。
- `skills/production-engineering/references/routing.md` 是执行前第一读取文件，负责模式判断和章节选择。
- `skills/production-engineering/references/full-production-engineering.md` 是完整生产工程规范，按需读取相关章节。
- `skills/production-engineering/scripts/task-state.js` 是命令入口，`task-state-core.js` 负责状态发现、指纹和持久化；两个手写文件都不得超过 600 行。
- `global-AGENTS.example.md` 是给用户复制到全局或项目 `AGENTS.md` 的示例，不等于当前仓库的全部实现。

## 修改规则

- 修改 skill 行为前，先读取当前真实文件，不凭记忆改触发词、流程或路径。
- 默认先判断是否可以轻量完成；明确的小文案、README、单文件小修和局部 UI 整理，不要拖成全仓库扫描、完整规范加载、PR、CI 或任务状态日记。
- 保持 `SKILL.md` 精简，不把完整规范全文塞回入口文件。
- 详细规则放在 `references/`，可执行校验放在 `scripts/`。
- 不压缩、不删减 `full-production-engineering.md`，除非用户明确要求。
- 优化只压重复、整理结构；命中对应职责边界才改对应最小文件，安全门栏不删。
- 不新增第三方依赖；自检脚本优先使用 Node.js 标准库。
- 不提交 `work/` 里的任务状态、临时记录或本地恢复文件。

## 交付边界

- 改代码前检查 Git 状态，保护用户已有改动。
- 同一任务继续使用当前任务分支，不为每次补改重复创建分支。
- 提交按稳定检查点划分，提交说明默认中文；一个维护任务默认一个清晰提交，复杂任务才拆成少量提交，避免为每次小修制造 commit。
- 只有用户明确要求远端保存时才推送任务分支；用户明确要求“搞到主线/主库/main”时，验证后按仓库实际流程进入正式分支。未经用户明确授权，不得创建或合并评审请求、直接推送 `main`/`master`/`production`、强推或删除远端分支。
- 删除文件或目录必须进入系统回收站或可恢复备份位置；禁止使用永久删除命令绕过恢复机制。

## 验证要求

修改 skill 仓库后至少执行：

```bash
node scripts/validate-skill.js
git status --short
git diff --check
```

`validate-skill.js` 必须自动运行路由场景和任务状态助手验证；不要在默认流程里重复执行同一组检查。

如果自检脚本、路径、触发词、删除策略、Git 规则、上下文状态规则、数据库兼容演进或前端后台默认栈有变化，必须说明影响范围和回滚方式。
