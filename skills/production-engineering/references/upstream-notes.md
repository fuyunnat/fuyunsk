# Upstream Methodology Notes

This repository's `production-engineering` skill remains an independent, explicit-only Codex skill. It does not vendor or require another skill collection at runtime.

The following references were conceptually adapted and rewritten after studying [`mattpocock/skills`](https://github.com/mattpocock/skills) at commit [`3cca18b368ae95cdbdebbff572ccafa662551015`](https://github.com/mattpocock/skills/commit/3cca18b368ae95cdbdebbff572ccafa662551015):

- `diagnosis-feedback-loop.md`: feedback-loop-first diagnosis, minimization, falsifiable hypotheses, targeted instrumentation, and regression proof.
- `design-testing.md`: deep modules, public seams, behavior-focused tests, vertical slices, compatibility sequencing, and question-driven prototypes.
- `spec-review.md`: specification synthesis, tracer-bullet work breakdown, decision maps, and separate standards/spec review axes.
- explicit user invocation and progressive disclosure as protection against unnecessary context loading.

Important differences from the upstream collection:

- this repository keeps one user-invoked `production-engineering` skill instead of installing many interdependent skills;
- no external issue tracker, setup skill, background-agent framework, or Skill-tool dependency is required;
- no long global prompt or automatic first-turn recovery is reintroduced;
- user authorization, recoverable deletion, secret protection, database compatibility, and formal-branch controls remain owned by this repository;
- the adapted references are concise paraphrases fitted to this repository's routing model, not vendored copies.

Upstream license: MIT License, Copyright (c) 2026 Matt Pocock. See the upstream [`LICENSE`](https://github.com/mattpocock/skills/blob/3cca18b368ae95cdbdebbff572ccafa662551015/LICENSE).

Repository maintainers should preserve this attribution when substantial adapted methodology remains. Future updates should compare ideas, not copy whole upstream files, and must keep the always-loaded prompt budget unchanged.
