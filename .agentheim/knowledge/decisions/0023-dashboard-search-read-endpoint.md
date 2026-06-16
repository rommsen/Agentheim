# ADR-0023 — The dashboard's `/api/search` is the read-only server's first content-search endpoint — a pure corpus walk, title-first ranking, body-excerpting

- Status: Proposed
- Date: 2026-06-16
- Context (BC): agentic-workflow
- Supersedes: —
- Related: ADR-0002 (dashboard runtime/transport — `/api/tree` + `/api/doc`, the `startsWith(root)` in-root guard, stdlib-only read endpoints; this endpoint is a sibling of those), ADR-0017 (dashboard is read-only — this endpoint performs no write and keeps that contract total), ADR-0021 (open-intent splits on artifact kind — search results route through the SAME `isTaskIntent` discriminator), ADR-0003 (styleguide single source of UI truth — search shapes DATA, never forks the styleguide), agentic-workflow-050 (the search task this ADR refines), agentic-workflow-005 (the read-projection task whose `dashboard/tree.mjs` walk + pure-transform idiom this endpoint mirrors)

## Context

Through ADR-0002 the read-only dashboard server exposes two reads with a deliberate split: `GET /api/tree` projects the `.agentheim/` corpus as **pointers + metadata only** — per BC its four lifecycle folders and each task's frontmatter (`id, title, status, type, context, path`), plus the *locations* of vision / context-map / BC READMEs / ADRs / research — and **never** carries document bodies; `GET /api/doc?path=` is the validated raw-markdown carrier that streams **one** body at a time. The single exception the tree projection allows itself — the project name parsed from `vision.md`'s heading (aw-015) — is explicitly held to one trimmed string precisely so the "pointers and metadata only, never bodies" contract still holds.

A topbar global search needs something neither endpoint provides: it must look **inside** artifact bodies across the **whole** corpus to find a term, and return ranked, grouped hits with a snippet of surrounding text. `/api/tree` cannot answer it — by contract it has no bodies. Fanning out to `/api/doc` from the client (fetch the tree, then fetch every body and grep in the browser) would pull the entire corpus over the wire on every keystroke-debounce and duplicate the walk the server already knows how to do. So search is the **first** read that must read document *bodies* to search their *content* — a genuine new capability, hence this ADR.

The decisions about *what* search matches and *how* it ranks were already settled by the builder (aw-050); this ADR records the **architecture** that carries them: a new endpoint rather than an extension of `/api/tree`, a pure walk/rank/excerpt seam mirroring `tree.mjs`, and how each result routes through the existing open-intent split (ADR-0021).

## Decision

**Add `GET /api/search?q=<term>` as a third read endpoint on the same stdlib HTTP server — a pure corpus walk that reads bodies, ranks title-first, and returns body-excerpted matches. It is the only read that touches bodies in bulk; it stays read-only and reuses the existing in-root guard.**

### 1. A new endpoint, not an extension of `/api/tree`

`/api/tree` is, by its stated contract, pointers + metadata and **never** bodies; every consumer (board, slide-over, navigation, SSE re-projection) rebuilds from it on every change and pays for its full payload each time. Loading bodies into it — or adding a `?q=` mode to it — would either bloat the always-fetched projection with content nobody but search needs, or fork its meaning. Search gets its **own** endpoint so the tree projection's contract stays exactly as ADR-0002 wrote it, and so search's body-reading cost is paid only when someone searches.

`GET /api/search?q=<term>` returns `{ query, results: [...] }` as `application/json`. It is a **pure read**: no file is written, the read-only contract of ADR-0017 stays total, and search is simply a fourth read alongside `/api/tree`, `/api/doc`, `/api/bridge` and the `/api/events` SSE stream.

### 2. A pure walk/rank/excerpt seam, mirroring `tree.mjs`

The walk, the match, the ranking, and the excerpting are a **pure, stdlib-only, DOM-free transform** in its own module (`dashboard/search.mjs`), separately unit-tested under `node --test` — exactly the idiom of `dashboard/tree.mjs` (server-side walk) and `dashboard/app/board-data.js` / `library-data.js` (pure transforms). The thin HTTP route in `dashboard/read-api.mjs` (`handleSearch`) does only request plumbing: read `q`, guard the root, call the pure function, serialize. The pure core takes the resolved root + query and returns the result array; it never throws on a malformed or unreadable file (loss-tolerant, never abort the walk — the same posture `projectTask`/`parseFrontmatter` already take).

The walk reuses `tree.mjs`'s discovery of the corpus (the same BC × lifecycle task files plus the vision / context-map / BC README / ADR / research locations), then opens each artifact's body to match against it. Reusing `buildTree(root)` to enumerate WHAT to search keeps the corpus definition in one place, so a new artifact kind added to the tree projection is automatically searchable.

### 3. Match scope and ranking (encoding aw-050's settled rules)

- **Scope: title + body only.** Frontmatter (ids, tags, type, dates) is NOT searched. Match is **case-insensitive substring**. For a task, "title" is the frontmatter `title`; for a non-task doc, "title" is its display title (the same one `library-data.js` derives). The body is the markdown text after frontmatter.
- **Ranking: title-hits-first, then fixed category order.** Two tiers: rows whose **title** matched rank above rows that matched only in the **body**. Within each tier, a fixed category order: **Bounded contexts (READMEs) → Decisions (ADRs) → Research → Tickets (tasks)**. (This is the discovery order of `library-data.js`'s groups with Tickets appended last, since tasks are normally the board's surface, not the library's.)
- **Defaults (builder may override):** min query length **2**; empty/whitespace `q` returns `{ query, results: [] }` (the server does no walk); client-side debounce ~200ms is a frontend concern, noted only so the server is understood to be hit per settled keystroke, not per keypress.

### 4. Result shape and routing through the existing open-intent split

Each match is `{ category, title, excerpt, path, ...intent }`:

- `category` — one of `Bounded contexts | Decisions | Research | Tickets` (drives the grouped UI and the tier-2 ordering).
- `title` — the row label.
- `excerpt` — a short window (~60 chars each side) around the **first** occurrence of the term in that artifact, with enough surrounding text for the client to locate and mark the matched term. When the title matched but the body did not, the excerpt is drawn from the title.
- `path` — the real in-root `.agentheim/`-relative path `/api/doc` fetches by (and the same path the in-root guard validated).
- **the intent fields the opener routes on (ADR-0021).** Selecting a result opens it the same way the existing surfaces do, and that routing is keyed by `isTaskIntent` (`dashboard/app/intent-route.js`: "has truthy `status` → task; else → non-task document"). So each category's result carries exactly what that discriminator and the open path need:
  - **Non-task docs (BC README, ADR, research):** the result carries a styleguide content **`type`** (`context | adr | research`), `title`, and `path` — identical to the `library-data.js` open-intent. `isTaskIntent` is **false**, so it loads into the **main content pane** via `MainPaneReader` (ADR-0021 §2).
  - **Tickets (tasks):** the result carries a ticket-shaped intent with a lifecycle **`status`** (plus `id`, `title`, `path`, `context`), identical to the board's `treeTicket` open-intent. `isTaskIntent` is **true** — but per the builder's decision (consistent with aw-039 "open in full screen"), tickets ALSO render in the **main pane**, via the aw-039 full-screen handler (`setSelectedDoc(openIntent); setOpenIntent(null)`), **not** the slide-over. The result payload therefore carries the full ticket so that path has the `status` it needs; the *render target* is the main pane for every search result, by routing each category through the surface ADR-0021 already established for it.

This means search invents **no** new intent shape: a non-task result is byte-compatible with a `library-data.js` item, a task result is byte-compatible with a `board-data.js` ticket, and the existing `isTaskIntent` fork plus the aw-039 main-pane override do all the routing.

### 5. In-root guard and read-only intact

The walk only ever opens paths it discovered **inside** the root, and the route validates the same way every other read does — `resolveInRoot` (ADR-0002's `path.resolve` + `startsWith(root)` separator-safe guard) — so no request can search outside the project and the `q` parameter can never become a traversal vector. Nothing is written; the read-only contract (ADR-0017) is untouched.

## Consequences

**Positive**

- The tree projection's "pointers + metadata only, never bodies" contract (ADR-0002) stays exactly as written — search's body-reading lives in a separate endpoint and is paid for only on search, not on every board re-projection.
- The walk/rank/excerpt core is pure and `node --test`-able with no server and no DOM, exactly like `tree.mjs` and `board-data.js` — the testable seam the project already standardizes on.
- Search invents no new intent shape and no new render target: results reuse the `library-data.js` doc-intent and the `board-data.js` ticket-intent verbatim, route through the existing `isTaskIntent` discriminator (ADR-0021), and the styleguide stays byte-unchanged (ADR-0003).
- The corpus definition stays single-sourced: search enumerates what to read via the same tree walk, so a future artifact kind becomes searchable for free.
- Read-only (ADR-0017) and the in-root guard (ADR-0002) carry over unchanged — near-zero new attack surface.

**Negative**

- This is the first read that opens **every** body in the corpus. For a large `.agentheim/` that is real I/O per request. It is bounded by the corpus being local single-user files and gated behind a 200ms debounce + min-length-2; if it ever bites, the mitigation is an in-process cache invalidated by the existing SSE file-watcher (ADR-0006) — deliberately **not** built now (don't invent infrastructure the task doesn't demand).
- Excerpting has edge cases the pure core and its tests must pin: a term at the very start (no left window), at the very end (no right window), spanning a markdown construct, appearing multiple times (first occurrence wins), and case-folding offsets (match case-insensitively but slice the original-case body so the excerpt reads naturally). Multi-line bodies should collapse whitespace in the window so the excerpt is one legible line.

**Neutral**

- Disk stays the single source of truth; the server stays stateless beyond the per-request walk. Markdown is never rendered server-side — the excerpt is a plain-text slice, and the full body, if the user opens a result, is still fetched through the one `/api/doc` path and rendered client-side (ADR-0021 §4).

## Alternatives considered

- **Extend `/api/tree` with bodies or a `?q=` mode.** Bloats the always-fetched projection with content only search needs, or forks its contract. Rejected — a separate endpoint keeps ADR-0002's tree contract intact and pays the body cost only on search.
- **Client-side search: fetch the tree, then fan out to `/api/doc` for every body and grep in the browser.** Pulls the whole corpus over the wire on every debounce and reimplements the walk the server already owns. Rejected against the localhost-but-still-wasteful cost and the duplicate-walk smell.
- **A search index (lunr / SQLite FTS / a daemon).** Reintroduces a dependency and an index-staleness problem for a single-user, localhost, modest-corpus tool — the architecture of a SaaS for a personal dashboard. Rejected per the zero-dependency posture (ADR-0002); a pure linear walk is the boring, reversible choice, and the SSE-invalidated cache is the heavier tool to reach for only if the linear walk ever measurably hurts.
