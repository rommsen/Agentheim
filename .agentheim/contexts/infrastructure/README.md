# Infrastructure

## Purpose

The standing home for Agentheim's **globally-true tech concerns** — runtime, hosting,
shared transport, and the like: the plumbing that exists to *serve* the core, not the
product itself. BC-local infrastructure (an adapter, a repository implementation, a
single BC's own queue handler) stays inside its originating BC; only concerns that are
true independent of any one BC live here.

In practice Agentheim is a Claude Code plugin distributed as **markdown and prompts** —
it has almost no conventional infrastructure: no database, no server, no deploy target,
and until the dashboard, no runtime at all. So this BC is deliberately born **tightly
scoped to a single concern: the dashboard's web-server runtime and transport.** Other
cross-cutting tech (plugin packaging/distribution, the eval harness, shared runtime
tooling) folds in **only if and when it actually appears** — not pre-emptively. The BC's
job today is to keep that one runtime concern from leaking into the domain, and to give
future tech concerns a home so they never fragment into ad-hoc `monitoring/` / `deploy/`
contexts.

## Classification

**supporting (generic-leaning)** — generic tech plumbing that serves the core
`agentic-workflow` context. It carries no domain rules of its own; its value is that it
lets the core run a UI without the core having to grow a runtime.

## Actors

- **Builder** — the single human user. Launches the dashboard runtime from a terminal and
  stops it; never interacts with this BC except through that lifecycle.
- **Internal machinery (not external actors)** — the local web-server process itself, the
  static-asset serving, the JSON API, and the write transport. These are how the context
  does its work, not parties it serves. The skills (`modeling`, `work`, …) and the
  dashboard UI are *clients* of the transport, not actors inside it.

## Ubiquitous language

Generic ops vocabulary, not project-specific domain terms — that thinness is expected
for an infrastructure BC.

- **Runtime** — the local process the `dashboard` command boots. Assumed to run on
  **Node** (Claude Code's own runtime, treated as guaranteed present); no extra global
  install.
- **Transport** — the mechanism that serves `.agentheim/` to the UI and carries writes
  back: static assets + a JSON API over localhost.
- **Launch / Stop** — how the runtime is started from a terminal inside a Claude Code
  plugin context, on a chosen host/port, and how it is torn down.
- **Project discovery** — how the running runtime locates and reads the current project's
  `.agentheim/` folder.
- **Write API** — the endpoints that apply a UI-initiated change to disk (e.g. moving a
  task file between lifecycle folders). The transport *carries* the write; it does **not**
  own what a valid write means — that authority lives in `agentic-workflow`.

## Owned mechanisms

This BC has no domain aggregates. What it protects instead:

- **Runtime/transport** — protects: the runtime stays local and single-user (localhost
  only); the transport serves `.agentheim/` and is the *only* path UI writes take to disk;
  no domain rules are encoded here — the transport stays a dumb, conformist carrier of
  domain-authorized operations.

## Key events

Past-tense, domain-language. Runtime started · Runtime stopped · Project discovered ·
Asset served · Write request received · Write request applied.

## Key commands

Intents entering the context. Launch runtime · Stop runtime · Serve `.agentheim/` ·
Apply write request.

## Relationships with other contexts

- **agentic-workflow** — the crux of why this BC exists. The split is **transport vs.
  meaning**:
  - This BC *supplies* the transport (web server, launch, static serving, project
    discovery, the raw write endpoints). For that, `agentic-workflow` is the **downstream
    customer** of infrastructure (customer–supplier; infrastructure = supplier).
  - But what a write *means* — that moving a task card is a **Task lifecycle transition**
    (`Task promoted` / `Task claimed`), bound by the Task aggregate invariants *status
    matches folder* and *one task = one commit*, plus the concurrency story when the UI
    mutates the same files `modeling`/`work` edit — belongs entirely to
    `agentic-workflow`. On those rules this BC is a **conformist**: the transport obeys
    the domain's definition of a valid move; it never invents its own.
  - One-line test for what lands where: *if the dashboard were strictly read-only, would
    this concern still exist?* If yes → infrastructure (transport). If no → it's about the
    meaning of a write → agentic-workflow.

- **design-system** — the dashboard UI served over this transport conforms to the
  design-system styleguide. The visual language is supplied by design-system; this BC only
  serves the assets.

## Open questions

- **Where exactly the transport/meaning seam lands** for the write API — the precise
  contract between the dumb write endpoint here and the Task-lifecycle policy in
  `agentic-workflow`. To be settled when the dashboard runtime decision is relocated and
  refined into this BC (the architect writes the ADR).
- **Concurrency story** — the UI writing to `.agentheim/` while `modeling`/`work` also
  edit those files. Owned by `agentic-workflow` (it's about Task semantics) but the
  transport must not make it worse. Flagged here as a known seam.
- **Future remit** — whether plugin packaging/distribution, the eval harness, or shared
  runtime tooling eventually fold into this BC. Deliberately deferred; fold in only when
  the concern actually appears.
