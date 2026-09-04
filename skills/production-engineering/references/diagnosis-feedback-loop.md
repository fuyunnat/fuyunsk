# Diagnosis Feedback Loop

Use this reference for hard bugs, intermittent failures, incorrect output, crashes, and performance regressions. The goal is evidence-backed diagnosis, not a plausible story.

## Safety And Authorization

- Redact credentials, cookies, private data, auth headers, and sensitive payloads from commands, logs, screenshots, and reports.
- Prefer environment variables over putting secrets in command arguments or captured artifacts.
- Read-only diagnosis may inspect and measure. Product-code changes, persistent instrumentation, production changes, and external writes still require the authorization selected by `routing.md` and `task-lanes.md`.

## 1. Define The Exact Symptom

Write down:

- expected behavior;
- observed behavior;
- the smallest known trigger;
- environment and timing conditions;
- one observable pass/fail verdict.

For performance work, record a baseline number before proposing a fix. “Feels slow” is not a baseline.

## 2. Build The Tightest Useful Feedback Loop

Prefer the cheapest loop that reaches the real failure path:

1. focused failing test at a public behavior seam;
2. `curl` or HTTP script against a controlled service;
3. CLI command with a fixed fixture and expected output;
4. headless browser check over DOM, console, and network;
5. replay of a redacted request, event, trace, or payload;
6. small harness around the affected module;
7. differential check between known-good and failing versions/configurations;
8. repeat/stress loop for flaky failures;
9. automated bisection when a known good and bad revision exist.

A useful loop is:

- **specific**: it detects the user's symptom, not merely any nearby error;
- **repeatable**: repeated runs give a dependable verdict, or a measured failure rate for flaky bugs;
- **fast enough**: narrow setup and skip unrelated initialization;
- **agent-runnable**: it can be re-run without undocumented manual steps.

Tighten an existing loop before broadening the investigation.

## 3. Reproduce And Minimize

Run the loop and capture the exact failure evidence. Then remove inputs, configuration, callers, services, and steps one at a time. Keep a removal only when the same failure still occurs.

The minimized case should preserve the original symptom while shrinking the number of possible causes. Do not silently substitute a different, easier-to-reproduce failure.

## 4. Rank Falsifiable Hypotheses

Create two to five ranked hypotheses. Each must include a prediction:

> If X is the cause, changing or observing Y should produce Z.

Test one prediction at a time. Re-rank when evidence changes. Do not present the first plausible explanation as the root cause.

When user domain knowledge can materially re-rank the list, show the short list; do not block progress on routine technical choices.

## 5. Instrument Deliberately

Prefer:

1. debugger or REPL inspection;
2. targeted boundary logs or counters;
3. profiler, trace, query plan, allocation data, or timing spans for performance;
4. version/config/data bisection.

Every temporary log must have a unique searchable marker such as `[DIAG-7f3a]`. Do not “log everything and grep later.” Change one variable per probe so the result can distinguish hypotheses.

## 6. Lock The Bug At The Correct Seam

When a stable public behavior seam exists:

1. turn the minimized reproduction into a failing regression check;
2. confirm it fails before the fix;
3. apply the smallest correction;
4. confirm the regression check passes;
5. re-run the original, non-minimized feedback loop.

Do not test private methods or internal wiring merely because they are convenient. If no honest seam can express the bug, record that as an architecture limitation and use `design-testing.md` before inventing a misleading test.

## 7. Cleanup And Completion

Before declaring the bug fixed:

- original symptom is green under the original loop;
- minimized regression is green, or the missing seam is explicitly documented;
- performance is compared with the recorded baseline;
- all temporary `[DIAG-...]` instrumentation is removed;
- throwaway captures are deleted, moved to an approved debug location, or deliberately retained with a reason;
- the confirmed cause and evidence are stated separately from discarded hypotheses.

If no adequate loop can be built, list the attempts and request the smallest missing artifact or access: a redacted request, log, trace, dump, recording with timestamps, reproducible environment, or permission for narrowly scoped instrumentation. The result remains provisional.

## Report Shape

Report:

- symptom and feedback-loop command;
- baseline or failing evidence;
- confirmed cause, or “not yet confirmed”;
- fix and affected behavior;
- regression evidence;
- remaining uncertainty and cleanup status.

See `upstream-notes.md` for methodology attribution.
