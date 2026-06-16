---
topic: Deterministic completion signal for the dashboard "Work" Claude Code terminal session
date: 2026-06-15
requested_by: user
related_tasks: []
---

# Research: Detecting when the "Work" Claude Code terminal session is finished

## Question
The dashboard "Work" button launches a real, interactive Claude Code terminal
(`vscode.window.createTerminal` then `terminal.sendText('claude "/agentheim:work"')`).
The dashboard is strictly read-only — a projection of the on-disk `.agentheim/` tree
served over HTTP+SSE, watching the filesystem; it never writes.

Is there a **deterministic** way for the dashboard to learn when that work session is
"finished working"? Investigate (A) Claude Code lifecycle hooks, (B) VS Code terminal
lifecycle observation, and (C) headless/print mode — reporting what each can and cannot do.

## Summary
- **The only deterministic, on-disk signal the read-only dashboard can observe is a Claude Code hook that runs a shell command and writes/touches a file.** Hooks can run arbitrary shell commands; the dashboard already watches the FS, so a hook-written marker file flows through SSE automatically. [1]
- **Stop vs SessionEnd is the crucial distinction.** `Stop` fires "when Claude finishes responding" — i.e. at the end of **every assistant turn** while the session keeps running. `SessionEnd` fires once when the session terminates (the CLI exits). An interactive session firing `Stop` does **not** mean the process exited. [1]
- For "the work skill has produced its result for this turn," `Stop` is the closest event — but it fires on every turn, so it signals "this turn is done / awaiting input," not "the whole task is complete and the user is done." For "the user closed the session," use `SessionEnd` with `reason` (e.g. `logout`, `prompt_input_exit`, `other`). [1]
- **Avenue B (VS Code terminal events) cannot distinguish turn-completion from process-exit for an interactive REPL.** `onDidCloseTerminal` / `exitStatus` fire only when the terminal is disposed (the user quit `claude`). Shell-integration's `onDidEndTerminalShellExecution` fires when the long-running `claude` command ends — also only when the REPL exits — not at each Claude turn. So both VS Code signals mean "user quit Claude," not "work task completed." Also, these are not on-disk signals; the bridge extension would have to write the marker, and the extension does the launching, so that is feasible — but it still only detects process exit. [3][4][5]
- **There is no in-prompt / in-skill runtime mechanism to register a hook or emit a completion signal.** Hooks are configured only via settings.json files, plugin `hooks/hooks.json`, or skill/subagent **frontmatter**; a skill cannot dynamically register a hook at runtime. A skill's frontmatter `Stop` hook is scoped to the skill's lifecycle, but a non-forked skill stays in context for the rest of the session, so its "Stop" still rides the per-turn `Stop` cadence (only a `context: fork` subagent skill gets a discrete `SubagentStop`). [1][2]
- **Avenue C (headless `claude -p`)** does give a clean process-exit signal: the process runs non-interactively and exits when done, so `onDidCloseTerminal`/`exitStatus` or a `&& touch done` would fire naturally — at the cost of losing the visible interactive terminal. [6]

## Findings

### Avenue A — Claude Code lifecycle hooks (primary avenue)

**Hook events and cadence.** The official hooks reference groups events into three
cadences: once per session (`SessionStart`, `SessionEnd`), once per turn
(`UserPromptSubmit`, `Stop`, `StopFailure`), and once per tool call inside the agentic
loop (`PreToolUse`, `PostToolUse`). [1]

**Stop — fires at the end of every assistant turn.** The docs state `Stop` fires "When
Claude finishes responding," and it is explicitly a once-**per-turn** event. The session
stays alive afterward; `Stop` is not a session-terminating event. A `Stop` hook can even
block the stop (`decision: "block"` / `continue: false` / exit code 2) to force the
conversation to continue. [1]
Implication for the work session: in the interactive REPL, `Stop` fires every time
`/agentheim:work` (or any later prompt the user types) finishes a response and the prompt
returns to await input. So `Stop` means "this turn ended," not "the whole work task is
finished and the user is leaving." It is the most granular completion signal available,
but it is not unique to the work task. (Note: `stop_hook_active` was not documented on the
current hooks reference; treat any reliance on that field as unverified.)

Stop stdin payload (JSON): `session_id`, `transcript_path`, `cwd`, `permission_mode`,
`hook_event_name: "Stop"`, and `effort.level`. No matcher support — fires on every
occurrence. [1]

**SubagentStop — fires when a subagent finishes.** Payload includes `session_id`,
`transcript_path`, `cwd`, `hook_event_name: "SubagentStop"`, `agent_type`, `agent_id`.
Matchers filter by agent type. Critically, a `Stop` hook defined in a **subagent's**
frontmatter is automatically converted to `SubagentStop`, because that is the event that
fires when a subagent completes. This is relevant only if `/agentheim:work` runs as a
forked subagent (`context: fork`); a plain inline skill does not get a SubagentStop. [1][2]

**SessionEnd — fires once when the session terminates (CLI exits).** Payload: `session_id`,
`transcript_path`, `cwd`, `hook_event_name: "SessionEnd"`, and `reason`. Documented
`reason` values: `clear` (ran `/clear`), `resume` (session resumed), `logout` (user logged
out), `prompt_input_exit` (non-interactive session ended), `bypass_permissions_disabled`,
and `other`. SessionEnd has **no decision control** — it is for cleanup/logging only and
cannot block. This is the event that corresponds to "the user closed the session." [1]

**Notification — fires when Claude Code sends a notification.** Matchers include
`permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`,
`elicitation_complete`, `elicitation_response`. Payload includes a `message` field. Non-
blocking; side effects only. Notably `idle_prompt` indicates Claude has gone idle waiting
on the user, which is adjacent to "turn finished," but it is a notification trigger, not a
clean task-completion signal. [1]

**Can a hook deterministically run an arbitrary shell command (e.g. touch a file)? Yes.**
Command hooks (`"type": "command"`) run arbitrary shell commands. Two forms: a *shell form*
(no `args`) runs via `sh -c` on macOS/Linux or Git Bash on Windows and supports pipes,
`&&`, globs, and variable expansion; and an *exec form* (with `args`) that spawns directly
without a shell. Default timeout 600s (SessionEnd has a configurable timeout). The
placeholder `${CLAUDE_PROJECT_DIR}` expands to the project root, which lets a hook write
into `.agentheim/` deterministically. This is the mechanism that produces an on-disk signal
the read-only dashboard can observe via its existing FS watcher + SSE. [1]

**Configuration and scoping.** Hooks live under a top-level `hooks` key. Settings locations
and scope: `~/.claude/settings.json` (all your projects, machine-local), project
`.claude/settings.json` (committable), `.claude/settings.local.json` (gitignored), managed
policy settings (org-wide), plugin `hooks/hooks.json`, and skill/agent **frontmatter**. The
structure is `hooks` → event name → array of `{ matcher, hooks: [{ type, command, ... }] }`.
`disableAllHooks` can turn everything off. [1]

**Can a slash command / skill register or trigger a hook at runtime? No.** The only ways to
configure hooks are settings files, plugin hooks, and skill/subagent **frontmatter** —
"there is no API for a skill or prompt to dynamically register hooks at runtime." [1]
Frontmatter hooks are "scoped to the component's lifecycle and only run when that component
is active." But the skill-content lifecycle docs note that when a skill is invoked inline,
its rendered `SKILL.md` "enters the conversation as a single message and stays there for the
rest of the session" — there is no discrete "skill finished" boundary for an inline skill.
Only a `context: fork` skill runs in an isolated subagent that ends discretely (yielding a
`SubagentStop`). [2]
Practical reading: if the deterministic completion marker must be emitted from within the
work flow itself, the realistic options are (a) a settings.json / frontmatter `Stop` or
`SessionEnd` hook (pre-configured, not "in-prompt"), or (b) instructing the skill prompt to
have Claude itself run a Bash command writing a marker file as its last step — but (b) is
**not deterministic**: it depends on the model choosing to run that command. If you need
determinism, it must be a configured hook. [1][2]

### Avenue B — VS Code extension terminal lifecycle observation

The bridge extension creates the terminal, so it can attach listeners. None of the
available terminal events distinguish a Claude *turn* from a *process exit* for an
interactive REPL.

**onDidCloseTerminal / Terminal.exitStatus.** `onDidCloseTerminal` is "An Event which fires
when a terminal is disposed." `Terminal.exitStatus` is `undefined` "while the terminal is
active" and only becomes a `TerminalExitStatus` after the terminal closes;
`TerminalExitStatus.code` is "the exit code of the terminal, where `undefined` means unknown
and `0` means success." For the interactive REPL, the terminal is disposed only when the
user quits `claude` (or closes the terminal). So `onDidCloseTerminal` signals **"user quit
Claude," not "work task completed."** [3][4]

**Shell integration: onDidStartTerminalShellExecution / onDidEndTerminalShellExecution.**
`onDidEndTerminalShellExecution` fires "when a terminal command is ended" and "only when
shell integration is activated for the terminal," carrying a `TerminalShellExecutionEndEvent`
whose `exitCode` is the command's exit status (`undefined` means unavailable). These APIs
were introduced in VS Code **1.93 (August 2024)** and are part of the stable API. [3][5]
The caveat: the single shell command here is `claude` itself (the REPL). That one execution
does **not** "end" each time Claude finishes a turn — it ends only when the REPL exits.
Within an interactive `claude` session, individual turns are not separate shell executions
visible to VS Code. So `onDidEndTerminalShellExecution` for the `claude` command also
signals **"user quit Claude," not "turn/task complete."** (Shell integration may also simply
not be active for the terminal, in which case the start/end events never fire at all.) [3][5]

**Process-exit vs turn-completion (the key caveat).** For an interactive REPL, the terminal
stays open at the prompt awaiting input after each Claude response. Therefore both VS Code
mechanisms detect only **process exit** (REPL quit), which maps to Claude Code's
`SessionEnd`, never to per-turn `Stop`. And VS Code events are observed in the extension
process — they are not on-disk; to feed the read-only dashboard, the extension would have to
write a marker file. That is feasible (the extension already does the launching), but it
still only ever detects "the user quit," not "the work is done."

### Avenue C — headless / print mode (brief)

If work were launched non-interactively with `claude -p "/agentheim:work"` (a.k.a.
`--print`), the process runs to completion and exits — giving a natural process-exit
completion signal. The docs confirm `-p`/`--print` runs Claude Code in non-interactive mode,
and user-invoked skills/custom commands work in `-p` mode (include `/skill-name` in the
prompt string and it expands before running). With a print run, `onDidCloseTerminal` /
`exitStatus` would fire when done, or you could append `&& touch .agentheim/.work-done` to
emit an on-disk marker. (Caveat: background Bash tasks started during a `-p` run are killed
~5s after the final result.) [6]
Tradeoff: this loses the visible, interactive terminal — the user can no longer converse
with the session, which is the whole point of the current "Work" UX. It also changes plan
billing semantics: per the docs, from June 15 2026 `claude -p` usage on subscription plans
draws from a separate monthly Agent SDK credit. [6]

## Sources
1. [Hooks reference — Claude Code Docs](https://code.claude.com/docs/en/hooks) — primary; hook events (Stop/SubagentStop/SessionEnd/Notification), cadences, payload fields, reason values, settings scoping, command hook execution. Current as of 2026-06-15.
2. [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills) — primary; skill frontmatter `hooks` field, skill-content lifecycle ("stays in context for the rest of the session"), `context: fork` subagent execution.
3. [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api) — primary; onDidCloseTerminal, Terminal.exitStatus, TerminalExitStatus.code, onDidEndTerminalShellExecution, TerminalShellExecutionEndEvent.exitCode, shell-integration activation requirement.
4. [VS Code API — Terminal.exitStatus / TerminalExitStatus](https://code.visualstudio.com/api/references/vscode-api#Terminal) — primary; "undefined while the terminal is active," code semantics.
5. [VS Code 1.93 release notes (Aug 2024)](https://code.visualstudio.com/updates/v1_93) — primary; introduction of terminal shell execution event APIs (onDidStart/EndTerminalShellExecution).
6. [Run Claude Code programmatically (headless `-p`/`--print`)](https://code.claude.com/docs/en/headless) — primary; non-interactive print mode, skills in `-p`, background-task termination, billing note.

## Open questions
- Does the `/agentheim:work` skill run inline or with `context: fork`? Only a forked subagent yields a discrete `SubagentStop`; an inline skill rides per-turn `Stop`. (Check the SKILL.md frontmatter in-repo — not researched here.)
- Is `stop_hook_active` still a documented Stop payload field? It appears in older community guides but was not found on the current official hooks reference; do not rely on it without confirming against the installed CLI version.
- For an interactive session, is there any hook that fires exactly once when a specific skill completes (as opposed to every turn)? No such event was found in the docs — `Stop` is per-turn and frontmatter `Stop` on an inline skill is not converted to anything skill-specific.
- Whether VS Code shell integration is reliably active for the bridge-created terminal on the target platform (Windows/PowerShell) — if not, the shell-execution events never fire and only `onDidCloseTerminal` is available. Not verified for this environment.
