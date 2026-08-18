# Project Understanding

Use this file for read-only project understanding, architecture teardown, codebase onboarding, and "help me understand this repository" tasks.

The goal is to explain why the project is shaped this way, not to produce a long module inventory. Keep the analysis tied to the real files, runtime paths, and observable project structure.

## When To Use

Read this file when the user asks to:

- Understand,拆解,接手,梳理,学习, or explain a project.
- Explain the architecture, main flow, module responsibilities, or system design.
- Compare why a project uses caching, async jobs, queues, RAG, memory, middleware, storage layers, permissions, deployment boundaries, or observability.
- Continue a previous architecture deep dive.

Do not use this as the default path for ordinary bug fixing, implementation, README editing, UI work, deployment work, or Git delivery. Those tasks should stay on the normal production-engineering lanes unless the user explicitly asks to understand the project first.

## Hard Boundary

Project understanding is read-only by default.

- Do not modify files, Git, databases, services, browser state, remotes, or external systems.
- Do not create `architecture.md`, diagrams, reports, task-state files, or other artifacts unless the user explicitly asks for a file.
- Do not install, copy, or depend on third-party skills, hooks, memory services, or analysis frameworks.
- Do not run unknown project scripts or binaries just to understand architecture.
- If a bug, security issue, or risky design is discovered, report evidence and impact; fix only after the user explicitly asks to modify.

## First Pass

For the first explanation, give a global map only. Avoid trying to explain every module.

Answer these points when the real project provides enough evidence:

- One-sentence judgment: what this project essentially is.
- Main user or business problem it solves.
- Core request, task, or data flow through the system.
- The central architecture idea or constraint.
- The 2 to 4 mechanisms most worth understanding first.
- What should be examined next if the user wants a deeper dive.

Keep code paths selective. Mention the few files, routes, commands, configs, or modules that prove the judgment, not every matching file.

## Deep Dive

For follow-up questions, focus on one core problem per answer.

Good deep dives explain:

- What pressure or constraint forced this mechanism to exist.
- What would break or become costly without it.
- What the current solution does in plain language.
- How it is triggered and implemented at a concrete level.
- How it connects to upstream and downstream modules.
- What it trades off.
- When this layer would need to be upgraded.

Do not drift into a generic architecture lecture. Keep every claim tied back to this project: "this repository does X because its flow/config/state shows Y".

## Evidence Standard

Separate these clearly:

- **Confirmed**: directly supported by files, configs, routes, tests, docs, logs, or runtime output.
- **Reasonable inference**: likely from structure or naming, but not directly proven.
- **Unknown**: not visible from the inspected scope.
- **Next check**: the most useful file, flow, command, or question to inspect next.

Never claim the whole architecture is understood after a narrow scan. State the reviewed scope and the important areas not inspected.

## Output Shape

For a normal chat answer, prefer this short structure:

```text
一句话判断

项目主线

核心流程

最值得先懂的 2-4 个机制

已确认 / 推断 / 未确认

下一步最值得看什么
```

If the user explicitly asks for a Markdown document, write a concise document under the path they request. If no path is given, ask before creating files or provide the content in chat.

## Source Note

This workflow can learn from public project-teardown style methods, but it must remain this repository's own rule set. Do not copy third-party skill text wholesale, do not require third-party skill installation, and do not turn learning-oriented teardown into a mandatory step for every engineering task.
