# fuyunsk

个人 Codex skill 仓库。当前包含 `production-engineering`，用于生产级工程交付、代码审计、修复、验证、Git/PR/CI、数据库、部署和后台页面开发流程。

## 安装方式

在 Codex 里直接对它说：

```text
安装这个 skill：https://github.com/fuyunnat/fuyunsk/tree/main/skills/production-engineering
```

如果你想用命令安装，可以在本机执行：

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py --repo fuyunnat/fuyunsk --path skills/production-engineering
```

安装后，下一轮对话开始时 Codex 就能发现这个 skill。

## 触发方式

最稳的方式是显式触发：

```text
用 $production-engineering 修这个问题
```

也可以自然表达。以下任务会尽量自动触发：

- 实现、修复、重构、交付代码
- 启动项目并验证
- 代码评审、安全审计、漏洞或后门排查
- Git 提交、分支、推送、PR、CI
- 数据库迁移、部署配置、高风险操作
- 后台页面、管理端、配置页、运营后台

重要说明：

- Skill 的“自动触发”依赖 Codex 当前版本和宿主环境的匹配机制，不能保证在所有客户端、所有模型、所有表达里 100% 自动触发。
- 想要最稳，直接在任务里写 `$production-engineering`。
- 想要仓库级硬约束，把 `global-AGENTS.example.md` 的关键内容合并到全局或项目 `AGENTS.md`，让写操作必须先路由到这个 skill。

## 更稳的全局路由

如果想让 Codex 更稳定地自动使用这个 skill，可以把 `global-AGENTS.example.md` 里的内容合并到自己的：

```text
~/.codex/AGENTS.md
```

不要直接覆盖已有全局文件，先备份。

其中最关键的是 `global-AGENTS.example.md` 里的“写操作硬门禁”和“绝对禁止”：

- 凡是可能修改文件、Git、数据库、远端仓库、线上服务、配置、依赖或外部状态的任务，必须先使用 `$production-engineering`。
- 如果 skill 不可用、未触发或无法确认已经接管当前写操作，Codex 应停止写操作并说明原因。
- 生产数据库、真实用户数据、删除数据、强推、主分支直推、未知脚本、密钥提交、覆盖用户改动等禁区必须写在全局 `AGENTS.md`，不要只放在 skill 里。

## Bug 修复用法

遇到 Bug、报错、页面异常、接口不通或行为不符合预期时，推荐这样写：

```text
用 $production-engineering 先定位这个 Bug 的原因，说明证据和最小修改方案，再修复并验证。
```

这个 skill 会要求 Codex 先定位相关文件、函数、接口、配置、日志或调用链，再进行最小修改，避免一上来大范围重构。

## 后台页面默认栈

新建后台页面、管理端、配置页或运营后台，且用户没有指定其他技术栈时：

- Vue 3 + Vite
- Ant Design Vue
- Pinia
- Vue Router
- 普通 `.vue` / `.js`，不是 TypeScript 项目

二开已有项目时，永远优先跟随真实项目栈。
