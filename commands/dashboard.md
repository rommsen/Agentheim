---
description: Launch, stop, or check the status of the local Agentheim dashboard web UI.
argument-hint: "[stop|status]"
allowed-tools: Bash(node:*)
---

# /dashboard — the Agentheim dashboard launcher

This is a deliberate, documented **slash-command exception** to Agentheim's
"phrasing, not slash commands" principle: the dashboard is a process-launcher,
not a Socratic dialogue, so a literal command is the right surface.

It is a thin trigger over the single cross-platform launcher `launch.mjs`
(ADR-0002 — one launcher, all OS differences confined there). Pass the verb
straight through; do not re-implement launch/stop/status logic here.

## Locating the launcher — it ships with the plugin, not the project

`launch.mjs` lives **inside this plugin's install directory**, not in the
project you are pointing the dashboard at. When Agentheim runs as an installed
plugin against a foreign codebase, there is **no** `dashboard/` folder beside
that project's `.agentheim/` — so a bare `node dashboard/launch.mjs` from the
project root fails with `Cannot find module '...\<project>\dashboard\launch.mjs'`.

Claude Code exports **`$CLAUDE_PLUGIN_ROOT`** into the command's shell
environment, pointing at this plugin's active install dir. Use it to reach the
launcher. The launcher must still run with the **consumer project as the current
working directory** (the default) — it discovers the foreign `.agentheim/` by
walking **up from cwd**, so the script can live in the plugin cache while the
project stays the cwd. Do **not** `cd` anywhere; do **not** pass a project path.

The argument (if any) is: `$ARGUMENTS`

Run **exactly one** Bash command based on that argument. Each command resolves
the launcher via `$CLAUDE_PLUGIN_ROOT`, with a fallback to the repo-local path
for the case where Agentheim is being run from its **own** repo during
development (where `$CLAUDE_PLUGIN_ROOT` is unset but `dashboard/launch.mjs`
exists beside `.agentheim/`):

- No argument (empty) → launch (or reuse) the detached server and auto-open the
  browser:

  ```
  node "${CLAUDE_PLUGIN_ROOT:-.}/dashboard/launch.mjs"
  ```

- `stop` → terminate the detached server and remove the runfile:

  ```
  node "${CLAUDE_PLUGIN_ROOT:-.}/dashboard/launch.mjs" stop
  ```

- `status` → report whether a server is running and on which port, without
  launching or stopping:

  ```
  node "${CLAUDE_PLUGIN_ROOT:-.}/dashboard/launch.mjs" status
  ```

The `${CLAUDE_PLUGIN_ROOT:-.}` form expands to the plugin install dir when
installed, and to `.` (the current project) when run from the Agentheim repo
itself — so the same command is correct in both contexts. If the chosen verb
ever fails with a module-not-found error, the launcher path is wrong, not the
project: report the error verbatim and stop — do **not** start guessing or
listing the plugin cache by hand.

The launcher is detached, so the command returns to a prompt immediately. Report
the printed URL / pid / status back to the builder verbatim — do not poll, do not
open anything yourself (auto-open is the launcher's job), and do not run any
further commands.
