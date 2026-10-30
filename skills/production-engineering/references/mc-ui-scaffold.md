# 无前端项目：mc-ui 脚手架与设计基线

来源：[MoeAgent/mc-ui](https://github.com/MoeAgent/mc-ui)（梦创 UI）。React 19 + TypeScript + Tailwind CSS 4 + shadcn（new-york）+ Radix + Lucide，含基础控件、界面模式、工作空间外壳、数据表格、深浅主题和组件展厅。

## 先判断走哪条路

| 项目现状 | 做法 |
| --- | --- |
| 没有任何前端（无页面、无前端工程，或只有后端/API） | 用 mc-ui 当脚手架起前端，按下文裁剪 |
| 已有前端，且不是 mc-ui | **沿用该项目自己的框架、组件库、样式和视觉**，不换成 mc-ui、不并存第二套组件库；mc-ui 只作为下文“设计基线”的质量参考 |
| 已经基于 mc-ui | 遵循项目内 `AGENTS.md` 与已有组件，按其约定扩展 |

“有前端”看真实代码：页面/模板、前端依赖、构建配置、组件目录任一存在即算。只有后端模板渲染的少量页面也算已有前端，不擅自另起 SPA。用户明确指定其他框架或视觉体系时，用户要求优先。已有前端的视觉改版仍受原样迁移、行为保护与整站换栈授权限制。

## 已有非 mc-ui 前端：借鉴结构，继承原项目视觉

用户要求“参考 mc-ui”时，默认借鉴它的页面层次、信息密度、工作台布局、表格/表单模式、状态表达和交互细节；**不直接搬它的颜色、字体、Geist/Vercel 色板、token 数值或 `tokens.css`**。已有项目的品牌色、主题变量、字体、组件 API、圆角、间距和状态语义优先，mc-ui 只提供质量参考。

开始写页面前，先从现有项目提取一份简短映射：

```markdown
mc-ui 参考项 → 当前项目实现
canvas / sheet / card / float → 现有背景、面板、卡片、浮层 token
primary / link / success / warning / destructive → 现有语义颜色
标题 / 正文 / 辅助文字 → 现有字体层级和颜色
Panel / StatusBadge / DataTable → 当前项目已有等价组件或最小适配
```

没有对应 token 时，先从项目已有色板和主题变量推导；不要凭感觉新增一套十六进制颜色。若原项目没有完整 Design System，先补最小 token 映射，再做代表页，确认新页面与旧页面配色协调后才扩展到其他页面。代表页未通过时，只修共享 token/组件，不批量复制。

只有用户明确要求“连 mc-ui 的配色也一起采用”时，才讨论替换原项目视觉；否则“参考 mc-ui”不等于换成 mc-ui 的黑白主按钮、Geist 字体或 Vercel 色板。

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
7. **验证**：`npm ci`、`npm run typecheck`、`npm run build:demo`（或裁剪后对应脚本）通过，再在浏览器检查代表页的桌面/手机、浅色/深色和关键状态。构建通过不等于视觉验收。启动后确认关键入口能打开且不是空白页；内页按项目组件补齐列表/表单/详情等真实交互，不要只改外壳。若是另起一套前端、旧前端保留，同时遵守 `parallel-template-development.md`：功能缺口先对照旧模板，再继续铺新页。

## 设计基线（mc-ui 项目必须遵循，已有前端只作参考）

依据 mc-ui `src/styles/tokens.css`、`src/components/` 与 `AGENTS.md`（参考提交 `1b59992`）。以项目内实际令牌为准，下列数值用于核对，不在业务代码里另抄一份。

**层次：无边框，靠底色分层**

- 全站不用描边：`--border`、`--input` 为透明，残留 `border` 类也不显色。不给卡片、面板、输入框加边框来区分区域。
- 四层底色由暗到亮：画布 `--layer-canvas` → 主面板 `--layer-sheet` → 卡片 `--layer-card` → 浮层 `--layer-float`（浅色约 `#e5e5ea / #f0f0f3 / #fff / #fff`，深色 `#000 / #0e0e10 / #18181b / #212125`）。
- 卡片内的分区、控件底色、悬停与选中用半透明叠加：`--fill-subtle`（约 4.5%）、`--fill`（7.5%）、`--fill-strong`（12%）、选中 `--fill-selected`（蓝 12%）；叠在任何一层都比所在层深一档，不新写实色灰。
- 分栏只用极淡的 `--divider`（约 7% 不透明度），不用实线边框。
- 阴影只给浮层（菜单、弹窗，`--shadow-menu`）；卡片和面板 `--shadow-surface: none`，不加阴影和渐变（套餐等已有专用视觉除外）。

**颜色**

- 色板取自 Vercel Geist（`--ds-gray-*`、`--ds-blue/red/amber/green-*`），深浅主题成对定义。
- **主按钮是近黑**（浅色）/**近白**（深色）：`--primary` 为 `--ds-gray-1000`，不是蓝色。蓝色只用于链接 `--link`、聚焦、选中。
- 语义色：绿 `--success` 成功，琥珀 `--warning` 提示，红 `--destructive` 危险；状态同时配文字或图标。
- 只用语义变量和 Tailwind 主题色（`bg-card`、`text-muted-foreground` 等），不写单主题的十六进制颜色。

**字体、尺寸与形状**

- 字体 Geist Variable，中文回退苹方 / 微软雅黑；代码与 ID 用 Geist Mono。正文约 13px，页面标题约 28px（移动端约 24px）。
- 圆角尺度 5 / 7 / 10 / 14 / 18px（`--radius-xs/sm/md/lg/xl`），默认 10px；外壳圆角 16px、外壳间距 8px。
- 侧栏宽 224px，内容区最大宽度 1200px。
- 按钮高度：默认 36px（`h-9`），小号 32px，迷你 24px，大号 40px；图标按钮同尺寸正方形。图标 16–20px。

**状态与交互**

- 聚焦统一：1.5px 蓝色细环 + 外圈淡蓝光晕（`--focus-ring`），只在键盘聚焦时出现。
- “规划中 / 未启用 / 占位”用斜纹底 `--fill-hatch`，不用虚线框。
- 状态一律用 `StatusBadge`：圆点 + 中文文案（成功、运行中、待处理、已支付、待复核、已停用等），新增状态在其映射里补中文，不在页面里各写一套颜色。
- 侧栏菜单悬停浅、选中深（`--nav-hover` / `--nav-active`），不靠蓝色高亮。
- hover、focus、disabled、loading、empty、error 完整；保留键盘、aria、弹窗焦点和 reduced-motion；工作台滚动用 `ScrollArea`，移动端抽屉导航，宽表格横向滚动。

**组件复用**

- 先用现成的：基础控件在 `components/ui`（按钮、输入、下拉、弹窗、抽屉、标签页、开关、表格、提示等），界面模式在 `components/patterns`（`Panel` / `PanelHeader`、`MetricCard`、`StatusBadge`、`ConfirmDialog`、`EmptyState`、`Dropzone`、`Timeline`、`Steps`、`CopyField`、`SegmentedControl`、`FormField` 等），外壳在 `components/layout`，表格用 `DataTable`。
- 页面里的卡片统一用 `Panel` + `PanelHeader`（标题、说明、右侧操作），不另写 `xxx-card` 样式。
- 类名合并用 `cn`；简单变体用 CVA，复杂布局用语义类与对应 CSS；共享样式登记在 `styles/components.css`。
- 新增公开组件同步 `library.ts`，并在组件展厅补预览与用法。

**每次界面修改**检查浅色与深色、桌面与移动端，并对照组件展厅确认没有新长出一套风格。

已有前端吸收这些做法时（如去掉多余描边、改用底色分层、统一状态徽标），只在授权范围内、用该项目自己的组件和令牌实现等价效果，不引入 mc-ui 依赖、不复制其样式文件，也不因此整站换风格。

## 授权与许可

mc-ui 仓库未附开源许可证。用户于 2026-10-13 说明该仓库为其朋友所有并授权在本技能的项目中直接使用；此授权记录在 `source-policy.md`。对外发布或再分发前，提醒用户与作者确认许可。第三方依赖、字体与图标仍遵循各自许可证。
