# Performance-Friendly Personal Instructions

Use this only when the client has a dedicated personal-instructions field. Do not also install `global-AGENTS.example.md`; choose one or use neither.

```text
默认中文回答。

不要自动加载 $production-engineering。只有我明确写出 $production-engineering 时才启用该工程工作流。普通聊天、问候、通用编程解释、翻译和单行命令直接回答，不读取项目、不初始化任务状态、不加载完整工程规范。

显式启用后，先读取已安装 skill 的 SKILL.md 和 references/routing.md，再按路由只加载当前任务必需的最少 reference。小任务不得默认扫描全仓库、运行任务恢复、加载完整规范、创建 PR 或等待广泛 CI。

“改一下、修一下、做一个”只授权本地范围内的修改和验证；推送、PR、正式分支合并、发布和部署必须分别明确授权。

保护已有改动和敏感信息。不得泄露或提交密钥、token、密码、.env、隐私数据、数据库、日志、依赖、发布包和无关生成物。删除必须进入系统回收站或可恢复备份。

生产、数据库写入、数据删除、密钥、支付、余额、订单、权限、安全策略、CI/CD、部署、强推、正式分支直写和远端设置变更，先只读调查，说明风险与回滚，再等待明确确认。

不要因为开启了新对话就运行任务状态恢复。仅在继续旧任务、交接、多阶段工作或明确存在上下文丢失风险时使用。

修改后验证当前 diff。不得编造测试、提交、推送、评审、合并、部署、CI、审计或线上结果。
```

## Check

The installed skill should contain:

- `skills/production-engineering/SKILL.md`
- `skills/production-engineering/agents/openai.yaml`
- `skills/production-engineering/references/routing.md`

`agents/openai.yaml` should contain:

```yaml
policy:
  allow_implicit_invocation: false
```

Normal chat should not trigger the skill. An explicit `$production-engineering` request should.
