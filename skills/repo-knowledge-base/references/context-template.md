---
summary: <one line, < 120 chars: what this module owns, in business terms>
covers:
  - <repo-relative glob, e.g. backend/app/services/billing_*.py>
  - <another glob, e.g. backend/app/billing/**>
last_verified: <YYYY-MM-DD> @ <short sha>
---

# <Module name>

<!--
Rules for whoever edits this file (human or agent):
- Record only what the code cannot say: purpose, business rules, the WHY behind decisions, traps.
- Every claim cites evidence: `path/to/file.py:symbol`, a commit sha, a ticket key, or a test.
- Unknown why? Write "Why: not recorded (introduced in <sha>)". Never invent a reason.
- Keep it under ~150 lines. Link to longer specs instead of copying them.
-->

## Purpose

2–4 lines: what business problem this module solves and who uses it.

## Entry points

- `path/to/file.py:function_or_class` — what calls it and when.

## Business rules & invariants

- **<rule>** — why it exists. Enforced at `path:symbol`; pinned by `tests/path::test_name` (or "no test").

## Decision log

Newest first. One row per decision that changed behavior. Reversals reference the row they undo.

| Date | Decision | Why | Ref |
|---|---|---|---|
| YYYY-MM-DD | Changed X from A to B | <reason, from commit/PR/ticket> | `<sha>` / TICKET-123 |

## Gotchas

- <trap that already bit someone> — evidence: `<sha>` or `path:symbol`.

## Related

- `path/to/other/CONTEXT.md` — how the two interact.
- `docs/specs/<spec>.md` — full spec, if one exists.
