# 方法来源与许可

本仓库只保留一个独立工程技能，不依赖其他技能集合、外部记忆、后台代理框架或议题系统。

此前经用户授权，参考 [mattpocock/skills](https://github.com/mattpocock/skills) 的提交 `3cca18b368ae95cdbdebbff572ccafa662551015`，提炼并重写诊断闭环、公开行为测试、纵向切片、规格整理和双轴审查。对应 `diagnosis-feedback-loop.md`、`design-testing.md`、`spec-review.md`。上游 MIT 许可证，版权归 Matt Pocock（2026）；不把上游的自动提交、外部工具依赖或原型清理方式覆盖到用户原文。

经用户再次明确授权，参考 [obra/superpowers](https://github.com/obra/superpowers)（MIT，作者 Jesse Vincent）中的 `brainstorming`、`systematic-debugging`、`test-driven-development`、`writing-plans`、`executing-plans`、`subagent-driven-development`、`dispatching-parallel-agents`、`requesting-code-review`、`receiving-code-review`、`verification-before-completion`、`using-git-worktrees`、`finishing-a-development-branch`、`writing-skills` 和 `using-superpowers`。只提炼计划预审、持续执行、最小上下文子代理、独立任务并行、双阶段评审、评审意见验证、fresh verification、可选隔离工作区与 Skill 行为测试等方法；没有安装该技能集合，也没有照搬其“所有任务先 brainstorming”“测试不先写就删生产代码”“所有相关 Skill 在任何响应前强制调用”等绝对策略。对应 `agentic-execution.md`、`spec-review.md` 和仓库 `AGENTS.md`。

前端质量补充此前参考 Vercel Labs 的 `vercel-labs/web-interface-guidelines`，并按当前项目与原始规范调整；没有安装该规则集。来源说明不是执行前置，不要求正常任务联网获取这些仓库。

本次新增的原文保真切片以用户上传文件为准；重构只调整组织和语言，不把第三方方法当作更高优先级。

## 上游 MIT 许可原文

以下法律文本保留原语言，不属于技能操作说明。

```text
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

`obra/superpowers` 同样声明 MIT 许可（其插件元数据标注 `license: MIT`）；本仓库仅保留上面的来源说明与中文重写方法，不复制其完整技能正文。\n\n## UI视觉方法（2026-09-21）\n\n经用户明确要求，审查并提炼 [pbakaus/impeccable](https://github.com/pbakaus/impeccable)（Apache-2.0，仓库当前主线）、[mizchi/vlmkit](https://github.com/mizchi/vlmkit)（MIT，仓库当前主线）和 [aochengyu/pixel-twin](https://github.com/aochengyu/pixel-twin)（仓库未声明明确许可证）。仅以独立措辞吸收产品/视觉上下文分离、确定性 UI 缺陷扫描、多视口基线差异、覆盖表、computed styles 和外到内证据闭环；不复制 Pixel Twin 的代码/脚本或任何项目的完整 Skill，不把外部依赖加入本仓库。