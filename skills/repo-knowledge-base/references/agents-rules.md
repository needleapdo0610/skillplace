# Snippet: repository `AGENTS.md` knowledge-base rules

Paste this section into the repository's root `AGENTS.md` (create it if absent; agent-neutral —
Codex, Cursor, Copilot and others read it). In `CLAUDE.md`, import it with a line `@AGENTS.md`
so Claude Code loads the same rules instead of a drifting copy.

---

## Knowledge base — read before you change, update when you change

This repo keeps its business knowledge next to the code: one `CONTEXT.md` per module (flat
directories may split into `CONTEXT.<topic>.md`). Each doc's frontmatter `covers:` globs say
which files it governs; the most specific match wins. [`CONTEXT-MAP.md`](CONTEXT-MAP.md) is
the generated index.

**Before changing code:** find the governing doc and read it first.

```bash
python3 scripts/kb.py which path/to/file.py
```

It tells you the module's business rules, the decisions already made and why, and the traps.
Do not reverse a logged decision without saying so in the PR and adding a new decision row.

**In the same PR as any add / change / delete of business behavior:**

1. Update the governing doc: rules & invariants, a new Decision log row (date, what changed,
   why, commit/ticket), gotchas you hit. Delete statements your change made false.
2. New module or moved files → add/adjust that doc's `covers:` globs; removed module → delete
   its doc.
3. Run `python3 scripts/kb.py map && python3 scripts/kb.py check` and commit the result.
4. `python3 scripts/kb.py changed origin/<base>` lists governing docs your diff did not touch.
   Every line it prints must be either fixed or justified in the PR description as
   "no business change" (pure refactor, rename, test-only, formatting, dependency bump).

**Writing rules:** record what the code cannot say (purpose, rules, the why). Cite evidence
(`path:symbol`, commit sha, ticket, test). Unknown reason → "Why: not recorded (<sha>)"; never
invent one. Keep each doc under ~150 lines. Inline code comments are fine for local,
line-level why; module-level business why belongs in the doc.

The review agent enforces this: a behavior change without its doc update is a
`[Knowledge - Required]` finding.
