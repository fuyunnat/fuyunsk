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

可以显式触发：

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

## 更稳的全局路由

如果想让 Codex 更稳定地自动使用这个 skill，可以把 `global-AGENTS.example.md` 里的内容合并到自己的：

```text
~/.codex/AGENTS.md
```

不要直接覆盖已有全局文件，先备份。

## 后台页面默认栈

新建后台页面、管理端、配置页或运营后台，且用户没有指定其他技术栈时：

- Vue 3 + Vite
- Ant Design Vue
- Pinia
- Vue Router
- 普通 `.vue` / `.js`，不是 TypeScript 项目

二开已有项目时，永远优先跟随真实项目栈。
