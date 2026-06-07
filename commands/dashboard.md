---
description: Launch, stop, or check the status of the local Agentheim dashboard web UI.
argument-hint: "[stop|status]"
allowed-tools: Bash(node:*)
---

# /dashboard — the Agentheim dashboard launcher

This is a deliberate, documented **slash-command exception** to Agentheim's
"phrasing, not slash commands" principle: the dashboard is a process-launcher,
not a Socratic dialogue, so a literal command is the right surface.

It is a thin trigger over the single cross-platform launcher
`dashboard/launch.mjs` (ADR-0002 — one launcher, all OS differences confined
there). Pass the verb straight through; do not re-implement launch/stop/status
logic here.

The argument (if any) is: `$ARGUMENTS`

Run **exactly one** Bash command based on that argument, from the project root:

- No argument (empty) → launch (or reuse) the detached server and auto-open the
  browser:

  ```
  node dashboard/launch.mjs
  ```

- `stop` → terminate the detached server and remove the runfile:

  ```
  node dashboard/launch.mjs stop
  ```

- `status` → report whether a server is running and on which port, without
  launching or stopping:

  ```
  node dashboard/launch.mjs status
  ```

The launcher is detached, so the command returns to a prompt immediately. Report
the printed URL / pid / status back to the builder verbatim — do not poll, do not
open anything yourself (auto-open is the launcher's job), and do not run any
further commands.
