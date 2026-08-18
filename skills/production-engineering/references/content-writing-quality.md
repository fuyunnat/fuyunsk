# Content Writing Quality

Use this file when writing or editing engineering documentation, README files, repository descriptions, installation guides, changelogs, release notes, PR descriptions, customer-facing technical notes, admin UI copy, product settings copy, empty/error/loading text, or any user-facing wording in a software project.

The goal is not to make text decorative. The goal is to make it sound like a responsible maintainer or product engineer wrote it: concrete, restrained, useful, and credible.

Apply this proactively for the content types above. Users normally will not say "remove AI style"; the writer must perform this quality pass by default whenever producing repository documentation, engineering copy, PR/release text, customer-facing notes, or admin/product UI copy. A user explicitly mentioning "AI 味" only makes this rule more urgent; it is not required for the rule to apply.

## Default Standard

Before finalizing text, remove obvious AI-style writing:

- Generic praise, cheerleading, and sales language.
- Repetitive "this will help / this ensures / this makes it easy" filler.
- Over-broad claims such as "complete", "perfect", "seamless", "robust", "enterprise-grade", or "fully secure" unless proven and necessary.
- Self-referential phrasing such as "this skill will", "the AI will", "we have absorbed", "based on your request", or "as an AI".
- Vague verbs such as "optimize", "enhance", "streamline", "empower", "leverage", "ensure", and "improve" when they hide the actual behavior.
- Long stacked lists where a short paragraph or table would be clearer.
- Repeating the same sentence shape across sections.
- Explaining internal prompting or model behavior to end users unless the document is specifically about Codex behavior.

Prefer:

- A clear subject, concrete verb, and real object.
- Short paragraphs with one job each.
- Specific scope and boundaries.
- Honest limitations and prerequisites.
- Installation, usage, verification, and rollback steps when relevant.
- Terms that match the repository, product, or customer domain.

## README And Repository Documentation

For README, self-description, setup, installation, usage, and repository overview:

- Start with what the project is and what it is for.
- Put installation and usage before long background explanation.
- Keep design goals concrete and verifiable.
- Use directory trees only when they help a reader find files.
- Separate "what it does", "how to install", "how to use", "limits", and "maintenance".
- Do not write like a changelog unless the section is a changelog.
- Do not mention friends, screenshots, previous conversation, or prompt-history context.
- Do not over-explain why text was written unless the reader needs that to use the project.

Bad:

```text
This project helps you easily and efficiently manage powerful production-grade workflows.
```

Better:

```text
This repository contains a Codex skill for controlled engineering changes: inspect the project, make scoped edits, validate them, and report the rollback path.
```

## Technical And Customer-Facing Notes

For customer-facing or collaborator-facing technical text:

- Avoid internal vendor version names, private implementation history, prompt fragments, and "upstream" wording unless the customer needs them.
- Describe current behavior, supported paths, known limits, and operational impact.
- Use formal but readable language.
- Do not promise stability, security, compatibility, or performance without evidence.
- If something is unverified, say what was checked and what remains unknown.

## PR Descriptions And Release Notes

For PR descriptions:

- State the user-visible or maintainer-visible change first.
- List the main files or modules only when it helps review.
- Include validation evidence and known omissions.
- Keep risk and rollback concrete.
- Do not restate every commit mechanically.

For release notes:

- Group by user impact.
- Avoid internal refactor detail unless it changes behavior or maintenance.
- Include migration or rollback notes when required.

## UI And Admin Copy

For buttons, labels, table empty states, errors, modals, tooltips, settings pages, and admin copy:

- Use action verbs for buttons.
- Use nouns for labels and tabs.
- Keep empty/error/loading states short and specific.
- Tell the user what happened and what they can do next.
- Avoid blame, jokes, and vague "something went wrong" messages when a more specific state is available.
- Do not expose stack traces, tokens, internal service names, or sensitive config in user-facing text.

Examples:

- Button: `保存配置`, not `点击这里进行保存`.
- Empty state: `暂无兑换记录`, not `这里还没有任何神奇的数据`.
- Error: `保存失败，请检查网络后重试`, not `系统繁忙，请稍后再试` when the failure is network-related.
- Permission: `当前账号无权查看余额记录`, not `你没有权限`.

## Editing Workflow

When rewriting existing text:

1. Preserve accurate technical facts, commands, paths, and constraints.
2. Remove conversational residue from prior chat context.
3. Replace generic claims with concrete behavior.
4. Keep the document's target reader in mind: user, maintainer, operator, reviewer, or customer.
5. Read the final text once as a skeptical reviewer and remove any sentence that sounds impressive but says nothing.

## Final Check

Before final output or commit, check:

- Does the first paragraph explain the actual object?
- Can a new reader install, use, or review the change without reading the chat?
- Are limitations and verification stated honestly?
- Are there unnecessary "AI", "skill", "prompt", or "we" references?
- Are there words that sound polished but hide behavior?
- Would this text look acceptable in a public repository or customer handoff?
