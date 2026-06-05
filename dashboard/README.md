# Dashboard runtime

The Agentheim dashboard server — Agentheim's first runtime. Node standard library
only: **no framework, no `node_modules`, no install step**. Runs on the Node that
Claude Code already provides. See **ADR-0002**
(`.agentheim/knowledge/decisions/0002-dashboard-runtime-transport.md`) for the
transport/launch/discovery decision this implements.

## Scope (agentic-workflow-004)

Server **skeleton only**: static asset serving + a health check. Deliberately *not*
here:

- `GET /api/tree`, `GET /api/doc` — agentic-workflow-005
- SSE live-update stream — infrastructure-003
- `POST /api/task/move` write path (delegates to `applyTaskMove`) — agentic-workflow-009
- The pre-bundled `dist/` assets — infrastructure-002

Until infrastructure-002 lands, `dashboard/dist/` is absent and the static handler
returns a graceful 404 ("assets not built yet"). The server itself runs fine.

## Usage

```sh
node dashboard/launch.mjs        # launch (detached); prints the http://127.0.0.1:<port>/ URL
node dashboard/launch.mjs stop   # stop: kill by pid, remove the runfile
```

`launch` spawns the server **detached** so the terminal returns to a prompt. The
server binds `127.0.0.1` **only** on an **ephemeral** port, reads the OS-assigned
port back, and writes the sole runtime artifact:

```
.agentheim/.dashboard/runtime.json   = { pid, port, startedAt }   (gitignored)
```

Relaunch is idempotent: a **live** runfile is reused (no second process); a **stale**
runfile (dead pid) is reaped and replaced — nothing is orphaned.

### Windows stop fallback

`stop` uses `process.kill(pid)` on both OSes. On Windows, if the process is stubborn
the launcher falls back to `taskkill /PID <pid> /F /T`. Manual fallback:

```sh
taskkill /PID <pid> /F /T
```

## Files

- `discovery.mjs` — walk up for `.agentheim/`, resolve an absolute root, validate
  every served path (`path.resolve` + separator-safe `startsWith`).
- `static.mjs` — content-type map + static handler (traversal → 403, missing/absent
  dist → 404, otherwise stream).
- `server.mjs` — `node:http` server: `/healthz` + static. No API/SSE/write routes.
- `runfile.mjs` — runfile read/write/delete, pid-liveness probe, reuse-or-replace.
- `serve.mjs` — the long-running entry spawned detached; binds, writes the runfile.
- `launch.mjs` — the single cross-platform launcher (`launch` / `stop` CLI).

## Tests

```sh
node --test "dashboard/test/*.test.mjs"
```

Covers discovery + traversal rejection, content-type mapping, runfile
reuse-or-replace, the HTTP server (health check, static streaming, traversal 4xx,
graceful absent-dist 404), and a real detached launch → health check → stop cycle.

## Verification status

- **Windows** — launch + stop verified on the builder's box (this implementation
  run): detached launch returns the prompt, runfile written, health check reachable,
  stop kills by pid and removes the runfile, reuse/stale-replace confirmed.
- **POSIX (macOS/Linux)** — **pending builder verification** (acceptance criterion
  5). The POSIX spawn path is `spawn(..., { detached: true, stdio: 'ignore' }).unref()`,
  written per ADR-0002 but not executed here. Run the Usage commands on one POSIX OS
  to close the criterion.
