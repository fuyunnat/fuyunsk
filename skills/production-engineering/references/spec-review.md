# Specification, Work Breakdown, And Review

Use this reference to synthesize a specification, split work into verifiable units, map a large uncertain effort, or review a branch/PR/WIP diff against both repository standards and intended behavior.

## Synthesize Before Interviewing

Start from the current conversation, repository evidence, existing issue/spec, glossary, and ADRs. Do not repeat questions already answered. Ask only when an unresolved choice changes business behavior, acceptance criteria, compatibility, risk, or authorization.

A compact specification should contain:

1. **Problem**: the user-visible problem and affected actor.
2. **Outcome**: what must become possible or stop happening.
3. **Acceptance criteria**: observable pass/fail behavior, including important failure paths.
4. **Implementation decisions**: module/interface, data, integration, and compatibility decisions that are already settled.
5. **Testing seams**: public boundaries where the outcome will be proven.
6. **Out of scope**: adjacent work deliberately excluded.
7. **Risks and rollback**: only where the change can cause material harm.

Prefer stable behavior and interface decisions over fragile file paths or speculative code snippets.

## Break Work Into Vertical Slices

Each work item should deliver a narrow but complete behavior through the necessary layers. It must be independently demonstrable or verifiable and small enough for one focused implementation cycle.

For every item, record:

- title;
- user-visible behavior delivered;
- acceptance criteria;
- blockers that must finish first;
- protected behavior and compatibility constraints.

Do not split primarily by “database task”, “API task”, and “UI task” when none works alone. Use horizontal work only for a genuinely wide mechanical refactor; then use expand–migrate–contract from `design-testing.md`.

A preliminary refactor is justified only when it makes the requested change materially safer or simpler. Do not turn ordinary implementation into an architecture cleanup project.

An external issue tracker is optional. Use the repository's existing tracker when configured; otherwise present the plan in chat or the user-authorized local document. Do not create issues merely because this reference was loaded.

## Map Large Uncertain Work

For work too uncertain to specify end to end, maintain a low-resolution decision map:

- **Destination**: the concrete state that ends planning.
- **Decisions made**: short conclusions with evidence pointers.
- **Open decisions**: precise questions that can be resolved now.
- **Not yet precise**: in-scope uncertainty that cannot yet be phrased as a useful question.
- **Out of scope**: work beyond the destination.

Resolve one decision at a time from the current frontier. Do not pre-slice vague uncertainty into fake tickets. Planning remains read-only unless the user separately authorizes implementation or tracker writes.

## Pin A Review Fixed Point

Before reviewing code:

1. resolve the supplied commit, tag, branch, or base branch;
2. compare from the merge base (`git diff <base>...HEAD`) unless repository policy requires another form;
3. record `git log <base>..HEAD --oneline`;
4. stop early for an invalid ref or empty diff.

If the user gives no fixed point and the repository cannot infer the normal base branch safely, ask one focused question.

## Find The Intent And Standards Sources

Intent/spec sources, in order:

1. linked issue or spec named in commits/branch metadata;
2. user-provided path or URL;
3. matching repository spec/plan/ADR;
4. the explicit acceptance criteria in the current conversation.

If no source exists, state “no spec available”; do not manufacture requirements.

Standards sources include the nearest `AGENTS.md`, contribution/coding guides, project conventions, tests, linters, and architecture decisions. Tool-enforced formatting should not be repeated as manual review noise.

## Review On Two Independent Axes

### Standards And Quality

Check whether the diff follows project rules and preserves sound design. Useful heuristics include:

- unclear names;
- duplicated logic;
- repeated primitive groups that deserve a domain type;
- repeated branching on the same concept;
- one logical change scattered across many files;
- one file changing for unrelated reasons;
- speculative abstraction;
- pass-through wrappers that add no leverage;
- tests coupled to implementation.

These are judgement calls unless a repository rule makes them mandatory. Repository-specific standards win.

### Spec And Intent

Check:

- requirements missing or only partly implemented;
- behavior added without authorization;
- behavior that appears implemented but contradicts the acceptance criteria;
- failure paths, compatibility, or rollback requirements omitted;
- tests that do not prove the intended outcome.

A change can pass one axis and fail the other. Keep the reports separate so neither masks the other.

## Review Output

Lead with findings ordered by severity within each axis. For each finding include:

- evidence: file/hunk, rule, spec statement, or command;
- impact and triggering condition;
- smallest safe correction;
- verification needed.

Then report:

- **Standards and quality**: findings or pass with reviewed scope.
- **Spec and intent**: findings, pass, or “no spec available”.
- **Coverage gaps**: areas not inspected or evidence unavailable.
- **Summary**: finding count and worst issue inside each axis, without collapsing both into one score.

Parallel reviewers may be used when the environment supports them, but they are an optimization, not a dependency.

See `upstream-notes.md` for methodology attribution.
