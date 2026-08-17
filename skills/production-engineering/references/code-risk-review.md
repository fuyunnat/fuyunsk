# Code Risk Review

Use this reference when the user asks for code review, "有没有问题", "帮我看看代码", hidden bug hunting, bug diagnosis, security audit, vulnerability review, backdoor review, or suspicious behavior analysis.

The goal is to make vague review requests concrete. Do not answer only "looks fine" or "no obvious issue" after a shallow scan. Inspect the real code paths and report evidence, uncertainty, and unverified areas.

## Default Scope

For broad or vague review requests, inspect at least the touched entrypoints, data flow, state changes, external calls, authorization path, error path, and logs. If the repository is too large, narrow by risk and tell the user what was covered.

Always check these high-value bug classes when applicable:

- Empty, null, undefined, zero, missing field, empty array, empty string, and partial API response handling.
- Duplicate requests, double-click submit, retry replay, repeated webhook/callback, repeated payment/order/balance operation, and idempotency.
- Concurrency, race conditions, locks, transactions, unique constraints, stale reads, lost updates, and state-machine transitions.
- Authentication, authorization, role checks, ownership checks, tenant isolation, admin-only paths, route guards, and backend enforcement.
- Timeout, cancellation, retry, backoff, circuit breaking, long-running jobs, and external service failure.
- Exception handling, panic/crash paths, swallowed errors, fallback behavior, rollback/compensation, and user-visible error feedback.
- Sensitive information leakage in responses, logs, console output, errors, metrics, traces, screenshots, exports, cache, local storage, and Git diff.

## Review Method

1. Identify what the code is supposed to protect: data, money, orders, permissions, credentials, user actions, availability, or correctness.
2. Trace the real request or execution path from entrypoint to persistence or external side effect.
3. Check the happy path, then check failure paths and boundary inputs.
4. Search for duplicate call paths and shared helpers so the same bug is not hidden behind another route or component.
5. Verify whether frontend checks are backed by backend checks. Treat frontend-only permission or validation as insufficient for security.
6. Prefer concrete proof: file and line, call chain, request/response shape, config, test, log, or command result.
7. Separate confirmed findings from suspicions and from areas not reviewed.

## Web And API Checklist

- Missing required field, wrong type, empty body, malformed JSON, oversized body, and unexpected enum values.
- Unauthorized, forbidden, expired session, wrong tenant, wrong owner, deleted resource, and disabled account.
- Pagination, sorting, filtering, search, date range, timezone, and numeric precision boundaries.
- Duplicate create/update/delete from refresh, retry, double click, network reconnect, or client race.
- API timeout and cancellation behavior; no request should hang indefinitely without user feedback.
- Error response compatibility; old clients should still receive stable codes and fields unless a breaking change was requested.

## Data And State Checklist

- Transaction boundary covers all related writes.
- Unique constraints or idempotency keys prevent duplicate business effects.
- State transitions reject invalid jumps and repeated terminal-state operations.
- Partial failure does not leave money, inventory, permissions, quota, or order status inconsistent.
- Background jobs, queues, cron tasks, webhooks, and callbacks can retry safely.
- Migration/default values handle old rows and null historical data.

## Frontend Checklist

- Loading, empty, error, retry, disabled, submitting, permission denied, login expired, offline, and timeout states render cleanly.
- Buttons that trigger mutations prevent duplicate submission while preserving clear labels.
- Requests are cancelled or ignored when components unmount, filters change, or stale responses return out of order.
- User input validation handles empty values, long values, pasted values, IME input, and slow network.
- Sensitive tokens, private IDs, full responses, and user data are not printed to console, toasts, URL, local storage, or analytics.

## Security And Privacy Checklist

- Backend authorization is checked at the resource boundary, not only at the menu, route, or UI button.
- Logs and errors are useful for diagnosis but do not expose passwords, tokens, cookies, private keys, personal data, or full payment/order secrets.
- File paths, redirects, URLs, template names, commands, SQL fragments, and object keys are validated before use.
- Feature flags, debug routes, test accounts, hidden parameters, and hardcoded roles do not create hidden admin paths.
- Dependency, script, and build hooks are not trusted without source and purpose review.

## Output Requirements

Lead with findings, not general encouragement. For each issue, include:

- Severity: Critical, High, Medium, Low, or Info.
- Evidence: file path, line, call chain, config, or command result.
- Impact: what can go wrong and under what condition.
- Fix: smallest safe correction.
- Verification: how to prove the issue is fixed or absent.

If no confirmed issue is found, say exactly what was checked and what was not checked. Avoid absolute claims such as "没有任何问题" unless the reviewed scope is truly exhaustive and verified.
