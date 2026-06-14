# Agentic Workflow

## Purpose

The one bounded context of Agentheim: running a domain-driven, human-in-the-loop agentic
workflow on top of Claude Code. Everything the tool does — turning an idea into a vision,
a vision into a modeled backlog, and a backlog into committed code — happens here. There
is no second context to map against; the workflow *is* the domain.

## Classification

**core** — this is the product. There is nothing supporting or generic to factor out yet;
if a cross-cutting infrastructure concern ever earns its own home, it would split off as a
separate BC, but today the whole tool lives in this one.

## Actors

- **Builder** — the single human user. Drives every Socratic dialogue, reviews every gate,
  and is never bypassed: no code without a no-code brainstorm first, no `work` without
  reviewed tasks, escalation on repeated verification failure.
- **Internal machinery (not external actors)** — the `orchestrator` (router, never writes
  code), the specialists (`strategic-modeler`, `tactical-modeler`, `architect`,
  `researcher`, `worker`), and the two adversarial gates (`verifier`, `research-reviewer`).
  They are how the context does its work, not parties it serves.

## Ubiquitous language

- **Skill** — a natural-language-triggered capability: `brainstorm`, `modeling`,
  `research`, `work` (plus doctrine docs: TDD, verification-before-completion,
  research-review). Triggered by phrasing, not slash commands.
- **Slash-command exception (`/dashboard`)** — the **single, deliberate** departure from the
  "phrasing, not slash commands" rule above (decided agentic-workflow-011). The dashboard is a
  process-launcher, not a Socratic dialogue, so a literal slash command (`/dashboard`,
  `/dashboard stop`, `/dashboard status`) is the right surface. Documenting the exception here
  keeps the principle intact: skills stay phrase-triggered; `/dashboard` is the named carve-out,
  not an erosion. The command file (`commands/dashboard.md`) is a thin trigger that passes the verb
  straight through to the one cross-platform launcher `dashboard/launch.mjs` — all OS-divergent
  spawn/kill/open logic stays there (ADR-0002). See *Dashboard* under Key commands.
- **Mode** — one of six conversational stances (Interrogator, Suggestor, Challenger,
  Storyteller, Facilitator, Synthesizer) for `brainstorm` and `modeling`. Serves model
  quality; switchable mid-session.
- **Vision** — the strategic root artifact: what's being built, for whom, why.
- **Bounded context (modeled)** — a domain area *in the builder's project*, given a
  `contexts/<name>/` folder. (Note the recursion: this README is itself such a folder, for
  Agentheim's own domain.)
- **Task** — a unit of work as a markdown file with frontmatter, moving through a
  lifecycle. `type`: feature | bug | refactor | chore | spike | decision.
- **Orchestrator / Specialist** — the router and the focused agents it delegates to. The
  orchestrator never writes code or does deep modeling itself.
- **Adversarial gate** — a fresh-context skeptic with no exposure to the producer's
  reasoning, judging the producer's output. `verifier` audits a worker's diff before
  commit; `research-reviewer` re-verifies a report before it's citable. A deliberate,
  recurring motif.
- **ADR** — Architecture Decision Record, global or BC-scoped; flows through the backlog as
  `type: decision`.
- **Protocol** — the chronological project diary, newest on top; every action appends.
- **Index** — a flat catalog (`knowledge/index.md` + per-BC `INDEX.md`) that *points*,
  never duplicates. The memory layer for prior-art and dependency lookup.
- **Tree projection** — the single read model the dashboard's views (board, slide-over,
  navigation) and the SSE consumer all rebuild from. `GET /api/tree` (built in
  agentic-workflow-005 as `dashboard/tree.mjs`) walks the discovered `.agentheim/` and returns,
  per BC, its four lifecycle folders and each task's frontmatter projection
  (`id, title, status, type, context, path`) plus the *locations* of vision / context-map / BC
  READMEs+INDEXes+concepts / ADRs / research — pointers and metadata only, never document
  bodies. It also carries `project: { name }` — the project name parsed server-side from
  `vision.md`'s `# Vision: <name>` heading (aw-015), so the dashboard header can show which
  project's `.agentheim/` is being viewed; missing/headingless vision degrades to `null`. This
  is the one projection value drawn from a markdown *body* rather than frontmatter, kept to a
  single trimmed string so the pointers-and-metadata-only contract still holds. A task whose
  `status`/`context` frontmatter is missing falls back to its folder / BC
  name (disk is the source of truth), and malformed frontmatter degrades gracefully — the card
  is still listed, the walk never aborts. Document bodies are carried separately by
  `GET /api/doc?path=<in-root path>`, a validated raw-markdown carrier (rendering is
  client-side). Both endpoints are pure reads and reuse the root-resolution `startsWith(root)`
  guard; neither writes nor interprets a lifecycle move. See ADR-0002.
- **Dashboard frontend app** — the live dashboard UI, owned by this BC, living in
  `dashboard/app/` (entry `dashboard/app/app.js`). It *consumes* the design-system styleguide
  source across the BC boundary (imports `Column`/`TicketCard`/`ColumnHeader`/`EmptyColumn`/
  `html` as-is — never forks them), so the styleguide stays the single source of UI truth
  (ADR-0003). esbuild bundles this app (not the styleguide canvas) into the committed
  `dashboard/dist/` the static handler serves; the canvas remains the separate buildless
  review surface. The three view tasks — **board** (agentic-workflow-006), **slide-over** (aw-007),
  and **library/navigation** (aw-008) — all built, compose into this one app shell, with a
  board↔library toggle in the shell built from the styleguide `RailItem`. See ADR-0009.
- **Board view** — the dashboard's home view (agentic-workflow-006): a **flat** Kanban of the
  four lifecycle columns (`backlog`/`todo`/`doing`/`done`) with tasks from **all** bounded
  contexts pooled into those columns — no swimlanes; each card carries its BC via the styleguide
  `context` chip. Rendered over the live tree projection (`GET /api/tree`); a status-driven,
  loss-tolerant transform (`dashboard/app/board-data.js`) buckets each task by status (unknown
  status → backlog) and shapes it for the styleguide card. **Read-only** (ADR-0017) — clicking a
  card emits an *open-this-task* intent the slide-over (aw-007) consumes; the board never writes a
  lifecycle move. Lifecycle changes are owned entirely by the skills (`modeling` / `work`); the
  board stays **live** by subscribing to the SSE stream and re-fetching `/api/tree` on any change,
  so a skill's on-disk move shows up within a frame (see *Live-update* below). To promote a task,
  use `modeling` — backlog cards carry a *copy `/agentheim:modeling <id>`* affordance (aw-016) for
  exactly this. See ADR-0009, ADR-0017.
- **Column sort** — each board column has its own **independent** sort control (agentic-workflow-012),
  a board-only `<select>` rendered as a *sibling* of the styleguide `ColumnHeader` (the board-column
  precedent — the styleguide `kanban.js` is consumed unmodified, ADR-0003). Orderings: **Name** (task
  `title`) asc/desc and **Modification-date** desc/asc, where modification time is the per-task `mtimeMs`
  the projection carries (aw-013). Default per column is **modification-date descending**, so
  recently-touched cards sit at the top. The reordering is a **pure** function of the already-projected
  list — `dashboard/app/board-sort.js` (`sortTickets`, unit-tested under `node --test`), run board-side
  *after* `treeToColumns`; it never mutates the transform, the read model, or disk. Name ties and
  mod-date ties both break by `id` ascending, and an absent/`null` `mtimeMs` sorts as oldest (never
  `NaN`, never a throw). The choice is now **persisted** (agentic-workflow-014 / ADR-0015) in the
  single versioned `localStorage` view-state store, so it survives a reload; because the order is
  derived at render, every live re-projection (SSE `tree-changed` / reconnect) re-applies the
  column's current choice rather than silently resetting it. (This supersedes aw-012's original
  in-session-only clause; aw-012 stays `done`.)
- **Column grouping (group by bounded context)** — each board column also has its own **independent**
  group-by-BC toggle (agentic-workflow-014), a board-only control rendered as a *sibling* of the sort
  `<select>` (same board-column precedent — the styleguide `kanban.js` is consumed unmodified, ADR-0003).
  Toggling a column **on** partitions its cards into per-BC sections, each with a header showing the BC
  name + a card count; a BC with zero cards in that column renders **no** section, and sections are
  ordered by BC name **ascending**. Each section is independently **collapsible** (collapsing hides its
  cards, retains the count). Cards *within* a section still obey the column's current sort — the
  pipeline is **project (`treeToColumns`) → sort (`board-sort.js`) → group (`board-group.js`)**; grouping
  only partitions, never re-orders, so all sort semantics are preserved inside each section. The
  partitioning is a **pure** function of the already-sorted list — `dashboard/app/board-group.js`
  (`groupTickets`, unit-tested under `node --test`); it never mutates the transform, the read model, or
  disk. A column with no stored state, or a brand-new BC, defaults to **flat + default sort +
  all-expanded** (never `NaN`, never a throw). The collapsible section header is **board-local**,
  token-matched (the styleguide `TreeGroup` primitive is coupled to `TreeItem` rows and owns its own
  open state — it does not fit a board section rendering `TicketCard`s with externally-persisted
  collapse state); a `design-system` capture (design-system-005) is filed for the shared primitive. See
  ADR-0015, ADR-0009, ADR-0003.
- **Persisted board view-state** — the per-column **view lens** — grouped/flat, sort choice, and each
  `(column, BC)` collapse state — is persisted across reloads in a **single versioned `localStorage`
  store** (`dashboard/app/board-view-state.js`, key `agentheim.board.viewState`; agentic-workflow-014,
  ADR-0015). This deliberately **reverses** ADR-0009's "in-session view-state only — no `localStorage`"
  clause, but the reversal is bounded to **presentation view-state**: the store never records lifecycle
  truth — which task is in which column stays a pure projection of disk (`/api/tree`), re-fetched on
  every SSE frame. A stale-version / malformed / absent blob degrades to "every column defaults" rather
  than throwing — a corrupt preference can never blank the board. See ADR-0015, ADR-0001.
- **Persisted theme choice (light/dark toggle)** — the dashboard consumes the styleguide's "dark-first
  with a light toggle" theme switch **unforked** (ADR-0003): the `Segmented` Dark/Light control (from
  `styleguide/app/live.js`) sits in the `ShellRail` header next to the project name and the board↔library
  switch, feeding the existing `ThemeCtx.Provider` and a `data-theme` documentElement effect that animates
  the flip with the styleguide `theme-fade` transition (agentic-workflow-017). **Theme resolution +
  persistence** is a sibling presentation concern to the board view-state: a **separate** versioned
  `localStorage` store (`dashboard/app/theme-state.js`, key `agentheim.dashboard.theme`) with the same
  safe-degradation shape. On a **first visit** (no stored override) the OS `prefers-color-scheme` wins;
  once the user toggles, that override is remembered across reloads. A malformed / stale-version / absent
  blob degrades to the **system default**, and the resolved theme is read once on mount so an SSE
  re-projection never resets it mid-session. See ADR-0015, ADR-0009, ADR-0003.
- **Copy modeling command (backlog refine affordance)** -- a backlog ticket's next action is to
  **refine** it by running `/agentheim:modeling <id>` in the Claude Code terminal (the fully-qualified
  command, not the bare `/modeling` alias). The board surfaces this (agentic-workflow-016) as a one-click
  copy-to-clipboard: each **backlog** card carries a small **Copy** button supplied *into* the styleguide
  `TicketCard`'s `cornerAction` slot (design-system-006) -- the card's bottom-right meta slot where the
  now-dropped `... pt` estimate chip used to sit -- writing exactly `/agentheim:modeling <id>`. Other
  columns get no corner action. The slot is click-isolated by the styleguide,
  so copying never opens the slide-over. The **add-ticket affordances are backlog-only**
  (agentic-workflow-018): the styleguide `EmptyColumn` empty-state **"Add ticket"** button and the
  `ColumnHeader` **`+`** are now **optional slots** keyed off an `onAdd` prop (default OFF, mirroring
  ds-006's `cornerAction`); todo / doing / done render the empty-state icon + "No tickets in
  &lt;status&gt;." copy and a header with **no `+`** -- the board is a projection of disk (ADR-0001),
  you don't *add* tickets to those columns from here. The command **string** is a **pure** function of the id --
  `dashboard/app/modeling-command.js` (`modelingCommandFor`, `MODELING_COMMAND`, unit-tested under
  `node --test`); a missing/non-string id degrades to the bare command (never `[object Object]`, never a
  throw). The clipboard write uses `navigator.clipboard.writeText` with a graceful, no-throw fallback --
  a blocked/absent clipboard API simply skips the transient "Copied" feedback, it never crashes or
  surfaces an error. This is a clipboard side-effect only: it adds **no** lifecycle write, the board stays
  a projection of disk. "Copy into memory" here means the **system clipboard** (for Ctrl+V), not
  Agentheim's `.agentheim/` memory. See ADR-0003, ADR-0009.
- **Backlog launch buttons (Quick Capture / Modeling)** -- the backlog column's former single
  add-ticket **`+`** is replaced (agentic-workflow-020) by **two** labelled launch buttons rendered
  as a board-composed sibling of the styleguide `ColumnHeader` (same precedent as the sort / group
  controls; the styleguide stays consumed **unforked**, ADR-0003): **Quick Capture** seeds
  `/agentheim:quick-capture` (the fast idea-dump, renamed in aw-019) and **Modeling** seeds
  `/agentheim:modeling` (the full Socratic session). Each opens a **real, interactive Claude session**
  through the VS Code **bridge** (ADR-0018): the frontend discovers the listener via the dashboard's
  own `GET /api/bridge` (port + per-activation token, never hardcoded -- infrastructure-014), confirms
  it is live with a token-bearing `GET /health` (~800 ms timeout), then `POST /run { prompt }` with the
  `X-Agentheim-Bridge-Token` header; the extension wraps the prompt as `claude "<prompt>"` and opens
  the terminal. **Bridge-absence is a normal mode, never an error**: when the page is not in VS Code's
  Simple Browser, or the listener is unreachable, or `/health`/`/run` time out / refuse / reject CORS /
  return non-200 -- *any* failure -- the button falls back **silently** to copying its command to the
  clipboard (the aw-016 `copyToClipboard` no-throw guard + the same quiet "Copied" feedback). No toast,
  no console crash, no broken-looking button. The **launch-vs-copy decision** is a **pure**, framework-free
  function of an injected `fetch` + `copy` -- `dashboard/app/bridge-launch.js` (`launchOrCopy`,
  `BRIDGE_TOKEN_HEADER`, unit-tested under `node --test`); it never throws or rejects. The exact
  launched/copied command **strings** come from `dashboard/app/modeling-command.js`
  (`QUICK_CAPTURE_COMMAND`, `MODELING_COMMAND`) -- one source of truth for both paths. Launching a
  session is an **external side-effect** (like the clipboard copy), **not** a lifecycle write: the board
  stays a projection of disk (ADR-0001). See ADR-0018, ADR-0003, ADR-0001, ADR-0009.
- **Live-update (SSE consumer)** — the board keeps itself current (agentic-workflow-009) by
  subscribing to `GET /api/events` (the SSE transport, infrastructure-003 / ADR-0006) via the
  framework-free `dashboard/app/live-update.js` (`createLiveUpdate`). On every `tree-changed`
  frame — and on every (re)connect — it does **one** thing: re-fetch `/api/tree` and re-project
  the whole board. It **never** interprets the raw pointer as a transition (the watcher stays
  transport-only); re-fetching is idempotent, so a burst of changes collapses into re-fetches with
  no double-apply. EventSource auto-reconnects and the board re-syncs on reconnect — no
  missed-event bookkeeping. Disk is the source of truth; the board is a projection rebuilt from it.
  This is the **only** way state reaches the board — there is no UI write to echo (ADR-0017). See
  ADR-0012, ADR-0006, ADR-0017.
- **No write path (read-only dashboard)** — the dashboard never writes lifecycle state (ADR-0017).
  The former drag-to-Promote endpoint (`POST /api/task/move`, agentic-workflow-009) and its client
  (`dashboard/app/promote.js`) were **removed**: cards are not drag sources, columns are not drop
  targets, and the HTTP server exposes only reads + the SSE stream + static assets. Task-lifecycle
  transitions are owned entirely by the skills (`modeling` promotes, `work` claims/completes),
  which move files on disk together with the readiness check, `depends_on`/gate guard, INDEX
  update, and protocol entry; the board reflects those moves via the live-update stream. See
  ADR-0017, ADR-0007.
- **Slide-over** — the dashboard's universal right-hand detail panel (agentic-workflow-007):
  one Notion-style drawer that opens for *any* artifact — a board task or a non-task artifact
  (BC README, vision, context-map, research, ADR). It consumes the board's *open-this-task*
  intent (and, later, aw-008 navigation's), fetches the body via `GET /api/doc?path=`, and
  renders the markdown **client-side** (no server-side rendering) through the approved
  styleguide `Drawer` + `Markdown` — imported as-is from the committed dist, never forked
  (ADR-0003). Tasks and non-task artifacts render through one identical path; the only
  difference is which `path` is fetched. The slide-over hands the `Drawer` a *doc-shaped* item
  (`{ type, meta: <real path>, body }`) so the real in-root path is shown and the fetched
  markdown rendered uniformly (ADR-0010). Lives in `dashboard/app/slide-over.js` over the pure,
  unit-tested `dashboard/app/slide-over-data.js`. Esc and scrim-click close it. See ADR-0010,
  ADR-0009.
- **Library / navigation** — the dashboard's discovery surface (agentic-workflow-008): makes the
  *non-task* knowledge base browsable — vision, context map, every BC README, ADRs, research —
  drawn from the **artifact-location half** of the same tree projection the board uses (`tree.locations`
  + per-BC `readme`). Tasks are deliberately excluded (the board owns them), so each artifact has
  exactly one home. A pure, unit-tested transform (`dashboard/app/library-data.js` → `treeToLibrary`)
  pools the locations into fixed, legible groups — Product / Bounded contexts / Decisions / Research —
  rendered through the approved styleguide `TreeGroup`/`TreeItem` (imported as-is, never forked —
  ADR-0003) in `dashboard/app/library.js`. Selecting any row emits the *same* open-intent shape the
  board emits (`{ type, title, path }`), routed into the one universal slide-over (aw-007). A
  board↔library toggle in the shell (built from the styleguide `RailItem`) switches surfaces. See
  ADR-0011, ADR-0009.
- **Task transition** — a lifecycle move of a task between folders (`backlog→todo` Promote,
  `todo→doing` Claim, `doing→done` Complete), never a raw file operation: it is a command on the
  **Task** aggregate, enforcing *status matches folder*. Owned by the skills (`modeling` / `work`),
  not the dashboard, which is read-only (ADR-0017).
- **`applyTaskMove`** — the canonical lifecycle-transition operation, owned by agentic-workflow and
  available to the skills; enforcer of *status matches folder* and the legal-move policy. Built in
  agentic-workflow-003 as `lib/task-lifecycle.mjs` (BC-owned domain logic, node stdlib only). The
  dashboard does **not** call it — the board is read-only (ADR-0017). Signature
  `applyTaskMove(rootDir, id, from, to, options)` — takes `rootDir` explicitly (no ambient cwd);
  `options.policy` is `'skill'` (the forward set: Promote, Claim, Complete) or `'ui'` (a retained
  restricted Promote-only set, no longer wired to a caller); `options.expectedMtimeMs` is the
  optimistic mtime precondition. Returns `{ ok: true, state }` or a structured rejection
  `{ ok: false, code, reason }` (`code` ∈ illegal-move | blocked-dependency |
  stale-precondition | not-found). It owns ONLY the move + status rewrite + precondition;
  INDEX/protocol side-effects stay with the skills/orchestrator (ADR-0007). It is addressed by
  the **bare id** but resolves the real on-disk file `<id>-<slug>.md` (anchored so `alpha-001`
  never collides with `alpha-0010`) and preserves that filename across the move — only the folder
  changes, the id is stable (ADR-0012). See ADR-0017, ADR-0007, ADR-0012.

## Aggregates

- **Task** — protects: status always matches its folder (`backlog/` → `todo/` → `doing/` →
  `done/`); one task = one commit; IDs (`<bc>-NNN`) are stable and never renumbered.
- **Vision** — protects: a single, two-minute-readable strategic root per project.
- **Knowledge base** (protocol + ADRs + research + indexes) — protects: every action is
  logged; indexes point rather than duplicate; ADR↔task backlinks stay bidirectional.
- **Bounded context (modeled)** — protects: a task belongs to exactly one BC; the BC's
  ubiquitous language is the single source of truth its tasks, code, and ADRs conform to.

## Key events

Past-tense, domain-language. Vision created · Bounded context identified · Idea captured ·
Task refined · Task promoted · Task claimed · Task completed · Task verified · Task bounced ·
Decision recorded (ADR) · Research published · Research reviewed.

## Key commands

Intents entering the context. Brainstorm · Quick Capture · Refine · Promote · Work · Research ·
Dashboard.

**Dashboard** launches the local web UI over the project's `.agentheim/` folder — a flat Kanban
board of every BC's tasks, a universal slide-over that renders any artifact (tasks, BC READMEs,
the vision, the context map, ADRs, research) as markdown, live-updating as skills move files on
disk. It is **read-only** (ADR-0017): no write-back — task lifecycle is owned by the skills, and
the board reflects their moves rather than making them. Invoked via the `/dashboard`
slash command (agentic-workflow-011 — the documented slash-command exception above), with three
verbs: bare `/dashboard` launches-or-reuses the detached server and **auto-opens** the default
browser at `http://127.0.0.1:<port>/`; `/dashboard stop` terminates it and removes the runfile;
`/dashboard status` reports running/not-running + port from the runfile only (never launches or
stops). The command is a thin trigger over `dashboard/launch.mjs`; auto-open is the one new
OS-divergent path (`cmd /c start` / `open` / `xdg-open`), confined to the launcher per ADR-0002.

## Relationships with other contexts

- **design-system** — this BC's first UI-bearing feature (the `dashboard`,
  agentic-workflow-001) depends on the design-system styleguide. **Frontend gate:** every
  UI/frontend task here must list `design-system-001-styleguide` in its `depends_on`, and
  no frontend task may be promoted to `todo` ahead of the approved styleguide.

A `context-map.md` may now be warranted as the BC count grows beyond one; revisit during
the next modeling pass.

## Open questions

- **Brainstorm on existing code (next iteration).** When `brainstorm` runs in a folder that
  already contains code, it should reverse-engineer a best-guess vision and domain from the
  code, present it, then continue the Socratic dialogue. Likely multi-agent; to be built via
  the skill-creator. Not present today.
- **Does `infrastructure/` ever split out?** For a markdown-and-prompts plugin there's no
  runtime infrastructure yet. Revisit if a genuine cross-cutting concern appears.
- **Merge gap.** `research-reviewer` + the `research-review` doctrine doc exist, but
  `skills/research/SKILL.md` is the older copy that doesn't call the gate. Reconcile on merge.
- **Stale framing.** `references/modes.md` still says modes are "designed for workshop use";
  with teaching dropped, rephrase toward model quality.
</content>
