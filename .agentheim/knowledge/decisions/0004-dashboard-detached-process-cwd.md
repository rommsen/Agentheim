---
id: ADR-0004
title: Detached dashboard server uses a neutral cwd and AGENTHEIM_ROOT, not the project dir
scope: agentic-workflow
status: proposed
date: 2026-06-06
related_tasks: [agentic-workflow-004]
related_adrs: [ADR-0002]
---

# ADR-0004: Detached dashboard server uses a neutral cwd and AGENTHEIM_ROOT, not the project dir

## Context

ADR-0002 fixed the dashboard transport: a single `launch.mjs` spawns the server
**detached** and the server **discovers the project by walking up from its
invocation directory** for `.agentheim/`. The obvious implementation is to spawn the
detached child with `cwd: <project root>` so its discovery walk starts there.

On Windows a running process holds an **open handle on its current working
directory** — that directory cannot be renamed or deleted while the process lives.
The dashboard is a long-lived background process; pinning its cwd to the project root
would lock the very directory the workflow is editing (task files move between
lifecycle folders, the tree is read and rewritten). It also broke test cleanup
(temp project dirs could not be removed while the server ran), a faithful proxy for
the production hazard.

## Decision

The detached server child is spawned with **`cwd: os.tmpdir()`** — a neutral
location — and the project root is passed explicitly via the **`AGENTHEIM_ROOT`**
environment variable. `serve.mjs` resolves the root from `AGENTHEIM_ROOT` when
present and falls back to walking up from `cwd` only when it is absent (the direct
`node serve.mjs` path, where cwd genuinely is inside the project).

`launch.mjs` itself still discovers the root by walking up from the *invocation*
cwd (ADR-0002, unchanged); it then hands that resolved absolute root to the child.

## Consequences

**Positive:** the dashboard never holds a lock on the project directory, so task
moves, folder renames, and cleanup are never blocked by a running server on Windows;
discovery stays deterministic (an explicit root beats an ambient cwd). **Neutral:**
introduces one environment variable as the launcher→server contract. **Negative:**
the server no longer self-discovers from a meaningful cwd when launched the normal
way — but the launcher always supplies `AGENTHEIM_ROOT`, and the cwd-walk fallback
remains for direct invocation.

## Alternatives considered

- **`cwd: <project root>`** (the obvious choice) — locks the project dir on Windows
  for the server's lifetime; rejected.
- **Pass the root as a CLI argument instead of an env var** — equivalent; the env
  var keeps `serve.mjs`'s argv free and reads naturally as ambient configuration.
- **`process.chdir()` inside the server after discovery** — same lock hazard, just
  relocated; no benefit.
