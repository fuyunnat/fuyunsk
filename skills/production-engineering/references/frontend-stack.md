# 当前前端选型：shadcn/ui + Tailwind CSS

## 最新用户要求

用户在 2026-09-05 明确要求“页面都是用 shadcn/ui + tailwindcss 来写”。这是对原文第九章默认技术栈的定向修改，不是性能优化的附带删减。

新建前端页面、后台管理、配置页、用户端、独立工具和营销页面，统一使用 **shadcn/ui + Tailwind CSS**。不再默认选择 Vue、Ant Design Vue、Pinia 或 Vue Router，也不另起第二套组件库。没有宿主项目时采用 React + Vite；已有兼容的 React 项目沿用其框架、构建、路由和目录，不因本规则强行换成 Vite。

原稿的 Vue 3 + Vite + Ant Design Vue 与普通 .vue/.js 选型、Pinia/Vue Router 默认值、仅后台适用的默认栈，以及 Ant Design Vue 的默认安装例外，不再作为新页面的选型依据。代码语言仍沿用现有项目；无明确要求的新项目使用 JavaScript / JSX，shadcn 的 `components.json` 可设置 `tsx: false`，不因官方示例使用 TypeScript 就擅自转换项目。

## 已有项目的边界

先核实真实框架、`components.json`、依赖、主题和组件目录。已有 shadcn/ui 页面复用当前组件；新建独立项目直接采用新选型。已有非 React 项目或混用其他组件库的项目，先说明兼容或迁移影响并取得对应授权；不能静默退回旧默认，也不能把改技能规则当成已获整站迁移授权。不得把官方 shadcn/ui 的 React 组件直接塞进 `.vue`，也不擅自换成同名社区移植。

## 组件与样式

- 复用已安装的 shadcn/ui 组件和当前项目实际使用的底层实现；缺什么按需添加什么，不重新初始化项目、不整库下载、不覆盖已定制组件。
- 组件保持在已有 UI 基础层，页面负责组合，业务逻辑、请求、状态和校验按原职责分离，不把所有东西堆进 `.jsx` 或 `.tsx`。
- Tailwind CSS 用于布局、响应式和样式；色彩、圆角、间距、字体使用统一主题变量和语义标记。沿用现有 `cn`、变体及组件属性，避免重复类名、随机值、无边界全局覆盖。
- Tailwind、组件 API 与底层依赖按已安装版本核实；不混用不同大版本的初始化命令，不为样式小改升级依赖。
- 表格、表单、弹窗、抽屉、导航和状态组件优先复用；焦点、键盘、可访问性不能在自定义样式中丢失。

## 不变的原规范

本修改只替换上述技术栈默认值，其他要求继续执行：中文交付、已有行为保护、职责分层、接口安全、状态完整、布局整洁、响应式、视觉验收、依赖审查、验证证据和授权边界。原稿与切片原始字节不改；读取原文不表示旧默认重新生效。

技术机制依据：[shadcn 安装](https://ui.shadcn.com/docs/installation)、[JavaScript 配置](https://ui.shadcn.com/docs/javascript)、[主题](https://ui.shadcn.com/docs/theming)、[Tailwind 安装](https://tailwindcss.com/docs/installation/using-vite)。具体版本以项目实际依赖为准。
