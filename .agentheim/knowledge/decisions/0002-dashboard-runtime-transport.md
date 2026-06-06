---
id: ADR-0002
title: Dashboard runtime — Node-stdlib localhost transport with detached launch
scope: infrastructure
status: proposed
date: 2026-06-05
related_tasks: [infrastructure-001, agentic-workflow-001, agentic-workflow-002, agentic-workflow-003]
related_adrs: [ADR-0006]
superseded_in_part_by: [ADR-0006]
---

# ADR-0002: Dashboard runtime — Node-stdlib localhost transport with detached launch

> **Superseded in part by [ADR-0006](0006-dashboard-live-update-sse.md).** This ADR chose
> request/response only and listed live file-watch as *deferred*. ADR-0006 reverses **that one
> clause** by adding a Server-Sent-Events push channel (`GET /api/events`) backed by an
> `.agentheim/` file-watcher. **Every other clause below still stands**: Node-stdlib / zero
> dependencies, `127.0.0.1` binding, detached launch + runfile + explicit stop, walk-up project
> discovery, in-root path validation, and the `applyTaskMove` write seam.

## Context

The dashboard (agentic-workflow-001) is Agentheim's **first runtime**. Until it, the
plugin was markdown + prompts: no server, no database, no deploy target. The infrastructure
BC exists to keep this runtime from leaking into the domain, and this decision fixes the
**transport** — the local web server, how the `dashboard` command launches and stops it
cross-platform, how it discovers `.agentheim/`, and the shape of the read/write endpoints —
**as transport only**.

Constraints from locked inputs:

- **Single-user, localhost-only.** No multi-user, no auth, no network exposure.
- **Windows *and* macOS/Linux.** The builder runs Windows; POSIX must work too. The hardest
  part is cross-platform launch/stop of a background process.
- **No extra global install.** Claude Code already ships Node, so Node is treated as
  guaranteed; nothing else may be assumed.
- **v1 is interactive but write-minimal.** The UI writes exactly one task move (Promote,
  `backlog→todo`) back to disk. *What* a write means belongs to `agentic-workflow`
  (ADR-0001); this BC carries it as dumb transport.

The governing test for what belongs here: *if the dashboard were read-only, would this
concern still exist?* If yes, it is transport and lives in this decision.

## Decision

### Server stack — Node standard library, zero dependencies

Serve from a **Node standard-library HTTP server**: `node:http` for the server,
`node:fs`/`node:path` for file access. **No framework, no `node_modules`, no install step.**
The plugin ships the server as plain `.js`/`.mjs` and runs it with the Node that Claude Code
already provides. This is the "zero extra global install" constraint taken to its conclusion.

**Static assets** — the pre-bundled dashboard UI (committed output of design-system-001,
delivered by infrastructure-002) — are served from a known plugin-relative directory by a
small static handler: resolve the request path against the asset root, reject path traversal,
stream with a minimal content-type map. There is **no runtime bundler and no in-browser
Babel**; the UI's committed build output *is* the asset set.

### JSON API shape — localhost-only, two reads + one write

Two read endpoints and one write endpoint over the same server:

- `GET /api/tree` — the project's `.agentheim/` structure the UI needs: every BC, its four
  lifecycle folders, the task files in each (id, title, status, type, path — from
  frontmatter), plus the locations of vision / context-map / BC READMEs / research / ADRs.
  Pointers and metadata, **not** full bodies.
- `GET /api/doc?path=<relative>` — raw markdown of one artifact by its `.agentheim/`-relative
  path, validated against the discovered root (no escape). Markdown → HTML rendering happens
  **client-side**, keeping the server a dumb file carrier.
- `POST /api/task/move` — the **single** write endpoint. Body
  `{ "id": "<bc>-NNN", "from": "<lifecycle-folder>", "to": "<lifecycle-folder>" }`. The
  transport's job is narrow and total: (1) resolve `id`+`from` to a file under the discovered
  root, (2) verify the file is where `from` claims (precondition), (3) delegate the move,
  (4) return the new state or a structured error. It does **not** decide whether the move is a
  legal lifecycle transition — see the seam below.

### Launch mechanism — single Node launcher, detached, 127.0.0.1 only

The `dashboard` command spawns the server **as a detached background process** so the
terminal stays usable, and records enough state to stop it later.

- **Host/port:** bind `127.0.0.1` only — **never** `0.0.0.0`. Bind an ephemeral port (`:0`),
  read the OS-assigned port back, write it to the runfile, print the URL. (A fixed default with
  EADDRINUSE fallback is an acceptable alternative; ephemeral is simpler and collision-free.)
- **Runfile:** on launch, write `.agentheim/.dashboard/runtime.json` =
  `{ pid, port, startedAt }`. This is the **sole** piece of runtime state on disk and the
  basis for both "open the URL" and "stop it." `.agentheim/.dashboard/` is gitignored.
- **One launcher, not two.** Ship a single `launch.mjs` invoked by the skill — *not* a
  `.sh` + `.bat` pair with divergent, rot-prone logic. All OS differences are confined to
  `spawn` options and the kill path:
  - **POSIX (macOS/Linux):** `spawn(..., { detached: true, stdio: 'ignore' }).unref()`; the
    process outlives the spawning shell.
  - **Windows:** no `&`/`disown`, and `detached` behaves differently. Spawn with
    `{ detached: true, windowsHide: true, stdio: 'ignore' }` + `unref()`; do **not** rely on
    shell job control or `start /b` semantics that tie the child to the console window.

### Stop — explicit command, never Ctrl+C

The process is detached, so there is no foreground signal to interrupt. Ship a `dashboard stop`
path: read `runtime.json`, terminate `pid` (POSIX and Windows both via `process.kill(pid)`,
with `taskkill /PID <pid> /F` as a documented Windows fallback), delete the runfile, confirm.
A relaunch over a live/stale runfile **detects and reuses-or-replaces** rather than orphaning a
process.

### Project discovery — walk up for `.agentheim/`

Find the project's `.agentheim/` by **walking up from the invocation directory** until a
`.agentheim/` folder is found (the way git finds `.git`). Resolve an **absolute root once at
startup**, store it, and validate **every** read and write path against it — `path.resolve` +
`startsWith(root)` on every request — so no request can escape the project. If none is found up
to the filesystem root, **fail loudly**.

### The write-endpoint contract as a seam (transport ↔ meaning)

This BC owns the **mechanics** of `POST /api/task/move`: parse, locate, precondition-check
`from`, perform the move, respond. It is a **conformist** on **whether** a `from→to` is allowed
— that predicate lives in `agentic-workflow`. Concretely:

> The write API calls a single agentic-workflow-owned operation —
> `applyTaskMove(rootDir, id, from, to)` (delivered by agentic-workflow-003, per ADR-0001) —
> which encapsulates the legal-move policy (Promote-only in v1, including the `depends_on`
> guards), the *status-matches-folder* invariant (folder rename **and** frontmatter `status`
> rewrite together), the optimistic precondition (`from` + mtime guard), and the rename itself.
> The transport supplies `rootDir` + the parsed request; it does **not** reimplement the rename
> or the rules. On rejection it translates the domain's reason into a 4xx (e.g. 409 for a stale
> board) and touches **no** file. The transport never moves a file by itself.

This keeps a **single writer** of `.agentheim/` task state shared by skills and UI, exactly as
ADR-0001 mandates.

## Consequences

**Positive**

- Zero install / zero dependencies; the launcher uses only Node already present.
- One launcher across all OSes — differences confined to `spawn` options and the kill path —
  so no per-OS script drift.
- `127.0.0.1`-only binding + in-root path validation on every request ⇒ near-zero attack
  surface.
- One shared writer for UI and skills; the transport cannot drift from the domain's rules.

**Negative**

- Hand-rolled static serving / routing / content-types need care on path-traversal and
  content-type edges.
- Detached processes bring stale-runfile / orphan failure modes that the relaunch and stop
  paths must handle.
- Windows `process.kill` / detached semantics need explicit testing plus the `taskkill`
  fallback.

**Neutral**

- Markdown is rendered client-side; the server stays a dumb file carrier.
- `runtime.json` under `.agentheim/.dashboard/` is the only runtime artifact, and it is
  gitignored.

## Alternatives considered

- **Express / Fastify / micro-framework** — reintroduces `node_modules` + an install step for a
  handful of routes. Rejected against the zero-install constraint.
- **Self-contained binary (pkg / Go / Rust)** — off the table per locked inputs; pure cost given
  Node is already present.
- **Foreground server + Ctrl+C** — occupies the terminal the feature wants kept free, and Ctrl+C
  behaves differently on Windows anyway. Rejected.
- **Bash + batch launcher pair** — divergent per-OS logic rots; one Node launcher with branching
  confined to `spawn` options is strictly better.
- **Fixed default port with EADDRINUSE fallback** — viable, but ephemeral `:0` is simpler and
  collision-free; recorded as an acceptable alternative rather than rejected.

## Scope note

This ADR records the **decision only**. The runtime itself (`launch.mjs`, the HTTP server, the
static handler, `/api/tree`, `/api/doc`, `/api/task/move`) is built by **agentic-workflow-001**
(the dashboard), once **agentic-workflow-003** (`applyTaskMove`) and the pre-bundled UI assets
(**infrastructure-002**) land. The transport's write endpoint cannot exist before the operation
it delegates to.
