---
name: repo-knowledge-base
description: Build and maintain an in-repo business knowledge base — one CONTEXT.md per module recording purpose, business rules, the WHY behind decisions (mined from git history), and gotchas — plus the rules and review gate that keep it in sync with every add/change/delete. Use to bootstrap a knowledge base for a repo from zero, to update the governing doc after a business change, or to audit docs for drift. Triggers: "建立知識庫", "repo knowledge base", "bootstrap CONTEXT.md", "幫這個 repo 建 docs", "更新知識庫", "知識庫有沒有過期", "kb check".
---

# Repo knowledge base

Code says *what* and *how*. Commits scatter the *why*. This skill puts the why next to the code
so every engineer and every agent reads the same module context before changing it, instead of
re-deriving it by scanning the repo.

## The format (same for every repo)

- `<dir>/CONTEXT.md` per module; a flat directory with several domains may split into
  `<dir>/CONTEXT.<topic>.md`.
- Frontmatter `covers:` globs (repo-relative, `fnmatch`) say which files a doc governs. Most
  specific (longest) matching glob wins. A root `CONTEXT.md` with `covers: ["*"]` is the
  fallback owner of everything else.
- `CONTEXT-MAP.md` at the root is generated from frontmatter (`kb.py map`); never hand-edit it.
- Body sections: Purpose / Entry points / Business rules & invariants / Decision log / Gotchas /
  Related. Template: `references/context-template.md`.
- Every claim cites evidence (`path:symbol`, sha, ticket, test). Unknown reason → "Why: not
  recorded (<sha>)". Fabricated whys are worse than none.
- Tool: `scripts/kb.py` (stdlib Python): `which`, `map`, `check`, `changed`, `stale`.

## Mode A — Bootstrap a repo from zero (~1–3 h wall clock for a mid-size repo)

1. **Branch.** Work in a worktree/feature branch, never on the default branch.
2. **Inventory.** `git ls-files`, count files per directory, read the root README / agent
   instruction files and any `docs/` index. Note existing specs and nested
   `CLAUDE.md`/`AGENTS.md`/`README.md` — docs link to them, never duplicate them.
3. **Plan modules** (you, not a subagent — this is the architecture call). Aim for docs of
   ~5–60 source files each:
   - one doc per deployable/context root (`backend/`, `frontend/`, root `CONTEXT.md` for
     infra/CI/repo-wide with `covers: ["*"]`);
   - one per cohesive directory (an app, a feature area, a layer like `api/`, `stores/`);
   - flat mega-directories split by domain prefix into `CONTEXT.<topic>.md` with explicit
     globs;
   - tiny directories fold into their parent's doc; vendored/generated/assets are covered by the
     parent but not described.
   Build the module list: `[{doc, covers:[globs], hint, files:[owned files]}]`, or for big repos
   write each module's owned files to a text file and pass `{doc, covers, hint, filesPath,
   fileCount}` instead of `files` to keep the Workflow args small.
   Compute `files` with `kb.py`'s rule (longest glob wins) so every file has exactly one owner,
   and check the split: no doc should own >150 non-test files.
4. **Run the bootstrap workflow** (needs the user's explicit opt-in to multi-agent work):
   `Workflow({scriptPath: "<this skill>/scripts/bootstrap-workflow.js", args: {repo, skillDir,
   model, ticketLookup, modules}})`. It pipelines writer → adversarial verifier per module.
   `model`: the user's choice (a small model is fine; the verifier catches fabrication).
   `ticketLookup`: optional shell recipe for reading a ticket by key, or omit.
5. **Wire it up.** Copy `scripts/kb.py` to `<repo>/scripts/kb.py`. Run `python3 scripts/kb.py
   map && python3 scripts/kb.py check`; fix every error. Paste `references/agents-rules.md` into
   the root `AGENTS.md` and import it from `CLAUDE.md` (`@AGENTS.md`). Remove or fix any older
   instruction that contradicts the contract (e.g. "don't create context docs upfront").
6. **Verify yourself.** Read 3–5 docs end to end, including the biggest module and one with
   lots of history; spot-check ~10 cited shas and paths. Report doc count, coverage numbers
   from `kb.py check`, the `open_questions`/`remaining_doubts` the workflow returned (these are
   questions for human owners), and anything you could not verify.
7. **Enforce.** Add `references/review-gate.md` to the team's review agent. Optionally run
   `kb.py check` in CI.

## Mode B — Maintain (every business change; this is the contract)

1. Before editing: `python3 scripts/kb.py which <files>` → read those docs.
2. After editing, in the same PR: update rules/invariants, add a Decision log row (date, what,
   why, sha/ticket), delete statements your change made false; adjust `covers:` for
   new/moved/deleted files; delete a removed module's doc.
3. `python3 scripts/kb.py map && python3 scripts/kb.py check`.
4. `python3 scripts/kb.py changed origin/<base>` → each printed doc is either updated or
   justified as "no business change" in the PR description.

## Mode C — Audit drift

Run `kb.py check`, then `kb.py stale` (lists docs whose covered files have commits after the
doc's `last_verified: <date> @ <sha>`; exit 1 if any). For each stale doc, re-run the bootstrap workflow on just those modules
(same args, filtered `modules`), then review the diff of each doc.
