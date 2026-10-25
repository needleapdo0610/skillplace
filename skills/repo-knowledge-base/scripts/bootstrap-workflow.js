export const meta = {
  name: 'repo-knowledge-base-bootstrap',
  description: 'Write and adversarially verify one CONTEXT.md per module from code, git history and existing docs',
  whenToUse: 'Bootstrapping an in-repo knowledge base after the module list is planned (repo-knowledge-base skill)',
  phases: [
    { title: 'Write', detail: 'one writer per module: code + git history + existing docs -> CONTEXT.md' },
    { title: 'Verify', detail: 'one skeptic per doc: check every claim against code and history, fix in place' },
  ],
}

const SKILL = args.skillDir
const MAX_FILES = 150

const WRITE_SCHEMA = {
  type: 'object',
  properties: {
    doc: { type: 'string' },
    lines: { type: 'number' },
    decisions_logged: { type: 'number' },
    open_questions: { type: 'array', items: { type: 'string' } },
  },
  required: ['doc', 'lines', 'decisions_logged', 'open_questions'],
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    doc: { type: 'string' },
    claims_checked: { type: 'number' },
    fixed: { type: 'array', items: { type: 'string' } },
    removed: { type: 'array', items: { type: 'string' } },
    remaining_doubts: { type: 'array', items: { type: 'string' } },
  },
  required: ['doc', 'claims_checked', 'fixed', 'removed', 'remaining_doubts'],
}

function fileList(m) {
  if (m.filesPath) return `(${m.fileCount ?? 'see'} files) — read the list from ${m.filesPath}`
  const shown = m.files.slice(0, MAX_FILES)
  const extra = m.files.length - shown.length
  return shown.join('\n') + (extra > 0 ? `\n... and ${extra} more (list them with \`git ls-files\` against the covers globs)` : '')
}

function writePrompt(m) {
  return `You are writing one module doc for an in-repo knowledge base. Repository root: ${args.repo}. Work only from that directory.

TARGET DOC: ${m.doc}
COVERS (frontmatter globs, copy exactly):
${m.covers.map(c => '  - ' + c).join('\n')}
${m.hint ? 'MODULE HINT: ' + m.hint + '\n' : ''}
FILES THIS DOC GOVERNS:
${fileList(m)}

Goal: a future engineer or coding agent reads ONLY this doc before changing these files and learns the purpose, business rules, and especially WHY things are the way they are — so they don't undo a deliberate decision.

Steps:
1. Read the template: ${SKILL}/references/context-template.md. Follow its section order and frontmatter. Drop the HTML comment block from your output.
2. Read the code. Start with the largest / most-imported files and public entry points; skim the rest. Find business rules, guards, invariants, magic values, feature gates.
3. Mine the why from history (this is the most valuable part):
   - \`git log --no-merges --date=short --format='%h %ad %s' -- <the covered paths> | head -200\`
   - \`git log --merges --date=short --format='%h %ad %s%n%b' -- <paths> | head -120\` (PR titles live in merge bodies)
   - For commits whose subject says fix / revert / change / switch / remove / restore, or that carry a ticket key, read \`git show --stat --format=%B <sha>\` (and the diff if needed) to learn the reason.
   - Look for reversals (A -> B -> back to A) and record both rows, the later one referencing the earlier.
${args.ticketLookup ? '   - For at most 5 key decisions whose reason is only in a ticket, read it: ' + args.ticketLookup + '\n' : ''}4. Find existing docs about this module: \`grep -rl\` the module's directory name and key file names under docs/ and any nested CLAUDE.md/AGENTS.md/README.md near the files. Link them under Related; summarize, never copy.
5. Write ${m.doc}. Hard rules:
   - Every rule, decision and gotcha cites evidence: \`path:symbol\`, a commit sha, a ticket key, or a test name. Paths in backticks must be real repo-relative paths.
   - If the reason for something is not recorded anywhere, write "Why: not recorded (introduced in <sha>)". NEVER invent a reason.
   - Decision log: newest first, 5–25 rows, only behavior-changing decisions (not refactors, formatting, or dependency bumps).
   - Under ~150 lines. English. Business vocabulary, not code narration.
   - Write ONLY ${m.doc}. Do not edit any other file.
6. Return the structured result. open_questions = things you could not determine that a human owner should answer.`
}

function verifyPrompt(m, written) {
  return `You are a skeptical reviewer of one knowledge-base doc. Repository root: ${args.repo}. Work only from that directory.

DOC: ${m.doc}
Its writer reported: ${JSON.stringify(written || {})}

Your default assumption is that the doc contains mistakes. Check every factual claim:
- Every backticked path exists (\`git ls-files\` / \`ls\`), and every cited symbol exists in that file (\`grep -n\`).
- Every commit sha exists (\`git cat-file -t <sha>\`) and its message/diff actually supports the stated decision AND the stated why.
- Every business rule/invariant is really enforced where the doc says. Every cited test exists and tests that rule.
- Any "why" that is not backed by a commit, ticket, comment, spec or test is a fabrication: replace it with "Why: not recorded (introduced in <sha>)".
- The frontmatter covers globs must stay exactly as they are: ${JSON.stringify(m.covers)}.
- Template conformance: ${SKILL}/references/context-template.md section order, under ~150 lines, no HTML comment block.

Fix problems by editing ${m.doc} in place (only that file). Delete claims you cannot verify. Then return the structured result: what you fixed, what you removed, and doubts you could neither confirm nor refute.`
}

phase('Write')
log(`${args.modules.length} modules; writer/verifier model: ${args.model || 'session default'}`)
const truncated = args.modules.filter(m => m.files && m.files.length > MAX_FILES)
if (truncated.length) log(`file list truncated to ${MAX_FILES} in prompt for: ${truncated.map(m => m.doc).join(', ')}`)

const opts = phaseName => (args.model ? { phase: phaseName, model: args.model } : { phase: phaseName })

const results = await pipeline(
  args.modules,
  m => agent(writePrompt(m), { ...opts('Write'), label: `write:${m.doc}`, schema: WRITE_SCHEMA }),
  (written, m) => agent(verifyPrompt(m, written), { ...opts('Verify'), label: `verify:${m.doc}`, schema: VERIFY_SCHEMA })
    .then(v => ({ module: m.doc, written, verified: v })),
)

const done = results.filter(Boolean)
const failed = args.modules.map(m => m.doc).filter(d => !done.some(r => r.module === d))
if (failed.length) log(`no result for: ${failed.join(', ')}`)
return { done, failed }
