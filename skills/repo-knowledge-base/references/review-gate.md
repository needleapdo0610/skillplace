# Snippet: review-agent knowledge gate

Add to the review agent's procedure (repository-agnostic: it only activates when the reviewed
repo has adopted the knowledge base). Read the **base** version of the map and docs so a PR
cannot weaken the contract it is reviewed against.

---

### Knowledge gate (when the base ref contains `CONTEXT-MAP.md`)

1. Read `CONTEXT-MAP.md` from the base ref (`git show <base_sha>:CONTEXT-MAP.md`). For each
   changed non-test, non-doc source path, pick the governing doc: the row whose `covers` glob
   matches the path, most specific (longest) glob wins. If the head tree has
   `scripts/kb.py`, `python3 scripts/kb.py changed <base_sha>` computes the same list.
2. For each governing doc the diff does not touch, decide from the hunks whether the change
   alters business behavior: a rule, condition, default, mapping, permission, data contract,
   user-visible flow, or deletes/adds a capability. Pure refactor, rename, formatting, logging,
   test-only and dependency bumps are not business changes.
3. Business change without a doc update → `[Knowledge - Required]`: name the doc, the changed
   rule (file:line), and the one line the doc needs (new rule, Decision log row, or deletion of a
   now-false statement).
4. Doc touched → spot-check that it no longer contradicts the diff (a rule the diff removed must
   not survive in the doc) and that a reversed decision got a new row rather than a silent edit.
   A contradiction is `[Knowledge - Required]`.
5. Added/moved/deleted files the base map does not cover, or a doc whose `covers` now match
   nothing → `[Knowledge - Required]` asking for the `covers:` fix and `kb.py map`.
6. The PR description may justify an untouched doc as "no business change"; accept it when the
   hunks agree, and raise the finding when they do not.

`[Knowledge - Required]` follows the same enforcement level as the review agent's other
`[... - Required]` tags.
