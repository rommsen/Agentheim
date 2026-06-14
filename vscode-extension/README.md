# Agentheim Bridge (VS Code extension)

Agentheim's first deployable VS Code component. It runs a tiny `127.0.0.1`-only
HTTP listener inside the editor so the dashboard — served into VS Code's
sandboxed Simple Browser — can open a **real, visible, interactive** terminal
running `claude "<prompt>"`. This is the only path that works from inside the
browser sandbox; see ADR-0018 and the research report
`knowledge/research/vscode-dashboard-terminal-bridge-2026-06-09.md`.

The bridge is **generic**: it launches whatever prompt it is handed, so the
board's buttons (agentic-workflow-020) and any future affordance share it.

## What it does (ADR-0018 contract)

On activation it:

- Binds a `node:http` listener to `127.0.0.1` only (never `0.0.0.0`) on the
  fixed port **31425**, with a bounded fallback ladder `31425 → 31426 → 31427`
  on `EADDRINUSE`.
- Generates a fresh per-activation token (32 hex chars) and writes the
  discovery file `.agentheim/.dashboard/bridge.json` =
  `{ port, token, pid, startedAt, v }`. The dashboard server reads this to find
  and authenticate the live listener.
- Removes `bridge.json` on deactivation, so a dead editor leaves no live
  discovery file behind. Because the token is regenerated every activation, a
  stale `bridge.json` carries a token no live listener will accept.

HTTP surface (every request requires the `X-Agentheim-Bridge-Token` header):

| Method + path     | Behaviour |
|-------------------|-----------|
| `POST /run { prompt }` | Opens a `Claude` terminal, shows it, seeds `claude "<prompt>"`. → `202` |
| `GET /health`     | Liveness probe for the frontend. → `200` |
| `OPTIONS *`       | CORS preflight (load-bearing — the custom-header JSON POST is preflighted). → `204` |

Rejections: missing/mismatched token → `401`; malformed or empty body → `400`.

### Trust boundary

Loopback-only bind **plus** the shared-secret token header. Acceptable for a
single-user dev box; **not** for any networked or multi-user deployment. The
launch never hard-wires `--dangerously-skip-permissions` or any other
permission-bypass flag.

### Out of scope

The inject-into-a-running-session path (`POST /inject`) is deferred per
ADR-0018 — named, not built.

## Architecture

- `src/bridge.js` — pure, editor-free core: bind + fallback ladder, token,
  `bridge.json` lifecycle, body parsing, CORS, routing. Takes the terminal-launch
  action as an injected callback, so it is fully unit-tested without the editor.
  Stdlib only (`node:http`, `node:crypto`, `node:fs`, `node:path`); zero runtime
  deps.
- `extension.js` — thin activation glue; the **only** file that touches the
  `vscode` API. Wires `vscode.window.createTerminal` into the injected callback.

## Tests

```sh
cd vscode-extension
npm test          # node --test --test-concurrency=1
```

Covers: loopback bind on the fixed port, the fallback ladder, `bridge.json`
write/overwrite/remove, token gating (401), body validation (400), `GET /health`,
the `OPTIONS` preflight, and that `POST /run` launches `claude "<prompt>"` with no
permission-bypass flag.

## Install (outside the marketplace)

This extension is not published to the VS Code Marketplace; install the `.vsix`
locally.

```sh
cd vscode-extension
npm install                       # only to get @vscode/vsce (packaging tool)
npx vsce package                  # produces agentheim-bridge-0.1.0.vsix
code --install-extension agentheim-bridge-0.1.0.vsix
```

Then reload VS Code. On startup, with an Agentheim project open in the
workspace, the bridge binds and writes `.agentheim/.dashboard/bridge.json`.

## Uninstall

```sh
code --uninstall-extension agentheim.agentheim-bridge
```

Or via the Extensions view (search "Agentheim Bridge" → Uninstall). On
deactivation the extension removes `bridge.json`.
