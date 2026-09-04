# Design And Testing

Use this reference for feature implementation, refactoring, module/interface design, testability, TDD, wide migrations, and throwaway prototypes.

## Start From Project Language

Read the nearest project rules, existing public interfaces, tests, and architecture decisions. If the repository has a glossary such as `CONTEXT.md` or ADRs, use their terms and constraints.

Do not create a glossary or ADR automatically. Create or update one only when the user asks, a terminology conflict blocks correctness, or a hard-to-reverse and surprising trade-off needs a durable explanation.

## Design A Deep Module

A module may be a function, class, package, or larger slice. Its **interface** is everything callers must know: operations, invariants, ordering, errors, configuration, and performance expectations.

Prefer:

- a small interface that hides meaningful implementation complexity;
- one clear seam where callers and tests observe behavior;
- dependencies supplied at the seam instead of constructed deep inside business logic;
- results returned explicitly, with side effects isolated behind an adapter;
- adapters only where behavior genuinely varies, not for hypothetical flexibility;
- locality: one change should be fixed and verified in one place rather than scattered across callers.

Use the deletion test: if deleting the module merely removes pass-through code and leaves no complexity to relocate, the module may be too shallow.

Before refactoring, state the protected behavior and why the new interface improves leverage, locality, or testability. Do not add abstractions solely for imagined future needs.

## Test Through Public Behavior

A durable test reads like a capability and crosses a public seam. It should survive internal refactoring when behavior is unchanged.

Avoid:

- tests of private methods or internal call order;
- mocks of collaborators that are not part of the public contract;
- assertions that recompute the expected value with the same algorithm as production code;
- database or implementation side channels when the real interface can verify the behavior;
- broad snapshots with no focused behavioral signal.

Expected values should come from a worked example, a specification, a known-good fixture, or another independent source of truth.

Identify the critical test seams before writing tests. Codex should choose ordinary technical placement from the repository. Ask the user only when the seam changes business behavior, external compatibility, or acceptance scope.

## Implement In Vertical Slices

Prefer one narrow end-to-end behavior at a time:

1. choose one externally observable capability;
2. add one failing check at the agreed seam;
3. confirm the check can fail for the intended reason;
4. implement only enough behavior to pass;
5. run the focused check;
6. clean the design without changing behavior;
7. repeat for the next capability.

Do not write an entire horizontal layer of tests followed by an entire layer of implementation. Each slice should be independently demonstrable or verifiable.

Run fast type/lint/focused checks during the work, then the broadest relevant suite once the current diff is ready. Validation depth still comes from `task-lanes.md`.

## Wide Refactors And Compatibility

When one mechanical change has a wide blast radius and cannot land as an independently green vertical slice, use expand–migrate–contract:

1. **Expand**: add the new form beside the old while preserving compatibility.
2. **Migrate**: move callers in bounded batches; keep both forms working.
3. **Contract**: remove the old form only after no caller remains and cleanup is separately authorized.

For schema or historical-data changes, the database compatibility rules remain authoritative and destructive cleanup stays a separate high-risk step.

## Throwaway Prototypes

A prototype answers one design question; it is not an early production implementation.

- Name the question first: logic/state behavior or UI shape.
- Mark the artifact clearly as disposable.
- Make it trivial to run.
- Keep state in memory unless persistence is the question being tested.
- Skip production polish, generalized abstractions, and broad test suites.
- Surface relevant state so the user can see what changed.
- Keep it out of the formal branch unless the user explicitly asks to retain it.
- Carry the validated decision into production code; do not carry accidental prototype structure.

## Design Review Questions

Before finishing, ask:

- Is the interface smaller and clearer than the behavior it hides?
- Does each seam correspond to real variability or observation?
- Can callers use the module without knowing internal ordering or storage details?
- Do tests prove behavior rather than implementation?
- Is each change slice independently verifiable?
- Did the diff introduce speculative hooks, pass-through wrappers, or scattered responsibility?

See `upstream-notes.md` for methodology attribution.
