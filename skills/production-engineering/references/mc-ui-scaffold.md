# 无前端项目：mc-ui 脚手架与设计基线

来源：[MoeAgent/mc-ui](https://github.com/MoeAgent/mc-ui)（梦创 UI）。React 19 + TypeScript + Tailwind CSS 4 + shadcn（new-york）+ Radix + Lucide，含基础控件、界面模式、工作空间外壳、数据表格、深浅主题和组件展厅。

## 先判断走哪条路

| 项目现状 | 做法 |
| --- | --- |
| 没有任何前端（无页面、无前端工程，或只有后端/API） | 用 mc-ui 当脚手架起前端，按下文裁剪 |
| 已有前端，且不是 mc-ui | **沿用该项目自己的框架、组件库、样式和视觉**，不换成 mc-ui、不并存第二套组件库；mc-ui 只作为下文“设计基线”的质量参考 |
| 已经基于 mc-ui | 遵循项目内 `AGENTS.md` 与已有组件，按其约定扩展 |

“有前端”看真实代码：页面/模板、前端依赖、构建配置、组件目录任一存在即算。只有后端模板渲染的少量页面也算已有前端，不擅自另起 SPA。用户明确指定其他框架或视觉体系时，用户要求优先。已有前端的视觉改版仍受原样迁移、行为保护与整站换栈授权限制。

## 用 mc-ui 起脚手架

1. **固定来源**：从 GitHub 获取 `main`，记录提交 SHA 到 `工作流程.md`；不使用 npm 上的同名包（作者未发布，同名包不是它）。需要 Node.js 22.18+。
2. **落到目标位置**：在当前项目根内新的前端目录（如 `web/`、`frontend/`，沿用项目已有命名习惯）复制源码，不带上游 `.git`；目标目录已存在且非空时停止，不覆盖。
3. **保持原样技术栈**：沿用 mc-ui 的 TypeScript、Tailwind 4、Radix、Lucide（`lucide-react`）、`cn`、目录分层和样式组织。不转 JavaScript、不把图标换成 Morphicons、不重新 `shadcn init`、不升级依赖大版本。此为对 `frontend-stack.md` 中 JS/JSX 与 Morphicons 默认的明确例外。
4. **保留骨架，裁剪演示**：
   - 保留：`components/`（ui、patterns、layout、theme、data-table、icons）、`lib/utils`、`lib/storage`、`lib/format`、`hooks/`、`styles/`（tokens、base、components 及所需模块）、`ThemeProvider`、`TooltipProvider`、Sonner `Toaster`、外壳布局与命令菜单、组件展厅（建议保留在开发路由，便于对照）。
   - 按业务需要删除或替换：审核测试台、编排画布、账单/套餐/支付、模型、虚构账户和 `mock/` 演示数据、演示登录；删页面时同步删除其专属样式、依赖（如 `@xyflow/react`、`recharts`）和路由，最后确认无悬空导入。
   - 品牌：替换梦创 UI 名称、Logo、`index.html` 标题和 README 为当前项目；不得继续以“梦创 UI”名义发布。
5. **接入真实数据**：新建项目自己的数据服务层替换 `lib/api.ts` 对 `mock/transport.mjs` 的动态加载；认证、支付等必须由真实后端实现，不能把演示 transport、演示登录当生产逻辑。
6. **按部署方式调整**：mc-ui 默认 Hash Router、相对 `base` 和全屏工作空间 `body` 滚动约束。需要 History 路由、SEO 或嵌入既有站点时按项目实际修改并验证。组件不是 SSR 安全的，需要 SSR 时先说明影响。
7. **验证**：`npm ci`、`npm run typecheck`、`npm run build:demo`（或裁剪后对应脚本）通过，再在浏览器检查代表页的桌面/手机、浅色/深色和关键状态。构建通过不等于视觉验收。

## 设计基线（新页面遵循，已有前端只作参考）

- **层次**：画布 → 主面板 → 卡片 → 浮层，以底色明度分层（mc-ui 令牌 `--layer-canvas/sheet/card/float`）；不给每张卡片都加描边、阴影或渐变。
- **颜色**：常规界面克制中性色；蓝色表示交互，绿成功、琥珀提示、红危险；状态同时配文字或图标，不只靠颜色。颜色只用语义变量，不散落单主题硬编码。
- **排版与密度**：正文约 13px，页面标题约 28px（移动端约 24px），紧凑但舒适；代码与 ID 用等宽字体。
- **形状**：圆角使用统一尺度（mc-ui 为 5/7/10/14/18px）；图标 16–20px。
- **状态与交互**：hover、focus、disabled、loading、empty、error 完整；保留键盘、aria、弹窗焦点和 reduced-motion；工作台滚动用统一滚动容器，移动端抽屉导航，宽表格横向滚动。
- **复用**：新增界面先复用已有组件与模式，基础控件、界面模式、外壳、业务组合分层存放；新增公开组件同步展厅预览与用法。
- **每次界面修改**检查浅色与深色、桌面与移动端。

已有前端吸收这些做法时，只在授权范围内、用该项目自己的组件和令牌实现等价效果，不引入 mc-ui 依赖或复制其样式文件。

## 授权与许可

mc-ui 仓库未附开源许可证。用户于 2026-10-13 说明该仓库为其朋友所有并授权在本技能的项目中直接使用；此授权记录在 `source-policy.md`。对外发布或再分发前，提醒用户与作者确认许可。第三方依赖、字体与图标仍遵循各自许可证。
