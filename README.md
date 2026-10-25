# skillplace

my own skills

## Skills

| Skill | What it does |
|---|---|
| [repo-knowledge-base](skills/repo-knowledge-base) | Build and maintain an in-repo business knowledge base: one `CONTEXT.md` per module (purpose, business rules, the WHY from git history, gotchas) plus a review gate that keeps docs in sync. |

## Install

```bash
git clone https://github.com/needleapdo0610/skillplace
cp -R skillplace/skills/repo-knowledge-base ~/.claude/skills/
```

Then in Claude Code, say "建立知識庫" or "repo knowledge base" in the target repo.

## repo-knowledge-base: 運作邏輯

核心想法：程式碼只說 what / how，why 散落在 commit。這個 skill 把 why 放在程式碼旁邊，工程師與 agent 改動前先讀同一份 module context。

**格式**
- 每個 module 一份 `<dir>/CONTEXT.md`（大目錄可拆 `CONTEXT.<topic>.md`）。
- frontmatter 的 `covers:` glob 決定這份文件管哪些檔案；最長（最具體）的 glob 勝出；根目錄 `CONTEXT.md`（`covers: ["*"]`）是兜底。
- `CONTEXT-MAP.md` 由 `kb.py map` 從 frontmatter 產生，不手改。
- 內容：Purpose / Entry points / Business rules / Decision log / Gotchas / Related。每個說法都要附證據（`path:symbol`、sha、ticket、test）；查不到原因就寫「not recorded」，不編造。

**三種模式**

| Mode | 何時用 | 流程 |
|---|---|---|
| A. Bootstrap | repo 從零建知識庫 | 開 branch → 盤點檔案 → 規劃 module（每份約 5–60 檔，每檔恰好一個 owner）→ Workflow：每個 module 先 writer 寫、再 adversarial verifier 查證 → 複製 `kb.py`、跑 `map` + `check`、把規則貼進 `AGENTS.md` → 人工抽查 3–5 份文件與約 10 個 sha → 加 review gate |
| B. Maintain | 每次業務變更 | `kb.py which <files>` 先讀相關文件 → 同一個 PR 內更新規則、Decision log、`covers:` → `map` + `check` → `kb.py changed origin/<base>` 列出的文件，要嘛已更新、要嘛在 PR 說明「無業務變更」 |
| C. Audit | 查文件有沒有過期 | `kb.py check` + `kb.py stale`；只對 stale 的 module 重跑 bootstrap，再 review diff |

**工具**：`scripts/kb.py`（純 stdlib Python）提供 `which`、`map`、`check`、`changed`、`stale`（`last_verified` 之後有新 commit 的文件）。測試：`python3 -m unittest discover -s skills/repo-knowledge-base/tests`。`references/review-gate.md` 給 review agent 當關卡，`references/agents-rules.md` 貼進 repo 的 `AGENTS.md`。
