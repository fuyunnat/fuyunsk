# Frontend Interface Quality

Use this reference for frontend pages, admin pages, management consoles, configuration pages, operations dashboards, shared UI components, and UI review tasks.

This file absorbs framework-agnostic interface quality ideas from Vercel Labs `vercel-labs/web-interface-guidelines` and adapts them to this skill. It does not install or depend on that third-party rule set. For existing projects, always follow the real current stack and design system first.

## Usage

- For new or changed admin pages, use this together with `full-production-engineering.md` section `## 九`.
- For quick, low-risk UI changes, check only the touched region and adjacent layout.
- For full-channel frontend tasks, new admin pages, complex forms, tables, dialogs, shared components, or UI review, apply the full checklist below.
- For a framed or wrapped workspace shell, read `wrapped-workspace-ui.md` for the shell geometry, footer boundary, separator-line diagnosis, and acceptance checks. Keep this reference complementary to the project’s real stack and design system.
- In Vue 3 + Vite + Ant Design Vue projects, prefer Ant Design Vue native components and props before custom ARIA, focus, modal, table, form, or tooltip logic.
- For complex admin pages, keep page shell, filters/forms, table/list, modal/drawer, API service, store/state, validation/constants, and formatting helpers in the project's existing responsibility structure. Do not put multiple independent workflows into one `.vue` file just because it is faster.

## Interaction And Accessibility

- All interactive flows must be keyboard-operable.
- Focus must be visible. Do not remove outlines unless an equivalent `:focus-visible` replacement exists.
- Modals, drawers, popovers, dropdowns, and confirm dialogs must manage focus: move focus in, trap where appropriate, restore focus on close, support Escape when safe.
- Use semantic elements first: `button` for actions, `a` or router link for navigation, `label` for controls, `table` for tabular data.
- Do not use clickable `div` or `span` as a substitute for button or link.
- Icon-only buttons must have a descriptive accessible name and, when useful, a tooltip.
- Decorative icons and purely decorative elements must be hidden from assistive tech.
- Toasts, inline validation, and async status changes should be announced with polite live-region semantics when the component library does not already do this.
- Status must not rely on color alone; pair color with text, icon shape, or explicit label.
- Hit targets must be forgiving: at least 24px on desktop and 44px on touch screens; expand hit area when the visible icon is smaller.
- Do not disable browser zoom. On mobile, keep input text at 16px or larger to avoid unwanted iOS zoom.

## Forms

- Every field needs a visible label or an accessible label. Placeholder text is not a replacement for a label.
- Clicking a label should focus or toggle the associated control.
- Use meaningful `name`, `autocomplete`, `type`, and `inputmode` values.
- Never block paste in input, textarea, password, OTP, code, phone, email, or token fields.
- Do not block typing to enforce validation. Accept text, then show clear validation feedback.
- Keep submit available until the request actually starts; then show submitting/loading state and prevent duplicate submission.
- Loading buttons should keep their original label and add a spinner or progress indicator.
- Errors must appear near the relevant field; after submit, focus the first invalid field when feasible.
- Allow incomplete submission when needed to surface all validation errors at once.
- Warn before navigation when unsaved user input would be lost.
- Checkboxes and radios must avoid dead zones: label and control should share one generous hit target.
- Disable spellcheck only where appropriate, such as emails, codes, usernames, keys, and IDs.
- Password managers and 2FA flows must not be broken by custom fields.
- Trim user input only at the correct boundary, such as before validation or submit, and avoid surprising visible edits while typing.

## Navigation And State

- Navigation must use real links or router links so Cmd/Ctrl-click, middle-click, copy link, and open in new tab work.
- Filters, search terms, tabs, pagination, sort order, selected row, and expanded panels should be reflected in the URL when users need refresh, share, history, or back/forward support.
- Back/Forward should restore meaningful scroll position and view state when feasible.
- Every page, state, dialog, or error screen should offer a next step, retry, undo, close, back, or recovery path.
- Destructive actions require confirmation, a clear risk label, or an undo window. They must not execute from accidental single clicks.

## Layout And Visual Quality

- Every element must intentionally align to a grid, edge, baseline, or optical center. No accidental floating controls.
- Prefer CSS flex, grid, and intrinsic layout over JavaScript measurement.
- Avoid unwanted scrollbars and horizontal overflow; test with visible scrollbars and long content.
- Respect safe areas on full-bleed or mobile layouts.
- Text and icon lockups must balance weight, size, spacing, and color.
- Nested radii should be visually consistent; child radius should not exceed parent radius unless the design system says so.
- Borders, shadows, and backgrounds should support hierarchy and clarity, not decoration for its own sake.
- Hover, active, disabled, loading, readonly, selected, error, success, and focus states must be visually distinct and stable.
- For admin pages, preserve scan efficiency: dense but readable tables, stable toolbars, clear filters, predictable actions, and visible recovery states.

## Content Handling

- Text containers must handle empty, short, normal, and very long content.
- Long labels, IDs, URLs, emails, model names, user names, order numbers, and file paths must truncate, wrap, clamp, or show details intentionally.
- Flex children that must truncate need `min-width: 0` or the framework equivalent.
- Empty arrays, empty strings, null values, sparse data, and partial API responses must render clean empty or fallback states.
- Skeletons and loading placeholders should reserve the final shape to avoid layout shift.
- Use tabular numbers for comparable numeric columns, counters, prices, balances, quotas, timestamps, and metrics.
- Dates, times, numbers, currencies, and file sizes should use locale-aware formatting where the project supports it.
- Brand names, code tokens, model IDs, environment variables, command snippets, and technical identifiers should be protected from unwanted translation when relevant.
- Error messages should explain the next action, not only state that something failed.

## Animation And Motion

- Animation is optional and must serve clarity. Do not add decorative motion to hide weak layout.
- Respect reduced-motion preferences.
- Prefer CSS transitions or component-library motion before adding animation dependencies.
- Animate compositor-friendly properties such as `transform` and `opacity`.
- Do not use `transition: all`; list the actual properties.
- Avoid animating layout properties such as width, height, top, left, margin, and padding unless there is a measured reason.
- Animations should be interruptible and tied to user input or state changes, not unbounded autoplay.
- SVG transforms should be applied in a cross-browser-safe way; when needed, animate a wrapper group instead of fragile child geometry.

## Images And Media

- Images must include useful alt text, or empty alt text when decorative.
- Reserve image dimensions or aspect ratio to prevent layout shift.
- Critical above-fold images may be preloaded or prioritized when the stack supports it; below-fold images should lazy-load.
- Do not ship oversized media when a smaller asset satisfies the viewport and density needs.

## Performance

- Large lists and tables need pagination, lazy loading, virtualization, or `content-visibility` style containment; do not render hundreds of heavy rows by default.
- Avoid layout reads and DOM measurement during render. Batch reads and writes when measurement is unavoidable.
- Search, filter, autocomplete, and expensive input-driven operations need debounce, cancellation, or cheap per-keystroke updates.
- Mutating requests should give quick feedback; if slow, show progress, disable duplicate actions, and make retry/rollback clear.
- Preconnect, preload fonts, and asset hints should follow project conventions and only target domains actually used by the page.
- Profile on constrained CPU/network when performance is part of the issue.

## Frontend Review Checklist

When reviewing or final-verifying UI code, check:

- Accessibility: labels, accessible names, semantic controls, keyboard path, focus ring, live regions, color-independent status.
- Forms: labels, autocomplete, input mode, paste support, validation, first-error focus, submit loading, duplicate-submit protection, unsaved-change warning.
- Navigation: real links, URL state, back/forward behavior, recovery path, destructive confirmation.
- Layout: alignment, spacing, safe areas, overflows, scrollbars, long content, empty/sparse/dense/error states.
- Tables/lists: stable columns, tabular numbers, long text handling, pagination/virtualization, row actions, bulk actions, loading and empty states.
- Motion: reduced-motion support, no `transition: all`, transform/opacity preference, interruptible state-driven animation.
- Media: alt text, explicit dimensions/aspect ratio, lazy loading or priority where appropriate.
- Performance: large render loops, layout measurement, unnecessary re-renders, input cost, image/font loading.
- Responsive: desktop, normal laptop, tablet, mobile, ultra-wide where relevant.

## Review Output

For UI review tasks, lead with concrete findings. Use file and line references when available:

```text
src/views/AdminUsers.vue:42 - icon-only action button needs aria-label or tooltip.
src/views/AdminUsers.vue:88 - filter state is local only; pagination/search should be URL-backed for refresh/back support.
src/views/AdminUsers.vue:137 - table amount column should use tabular numbers and stable alignment.
```

If no issue is found, say the checked scope passed and list any unverified browser, device, account, data, or screenshot limitations.
