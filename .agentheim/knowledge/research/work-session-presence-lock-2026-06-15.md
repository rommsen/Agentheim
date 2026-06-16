---
topic: Deterministic on-disk "work session is live" marker for disabling the dashboard Work button, scoped to /agentheim:work sessions only
date: 2026-06-15
requested_by: user
related_tasks: []
---

# Research: Work-session presence lock (project-scoped, work-only liveness marker)

## Question
The dashboard's "Work" button should be DISABLED while a `/agentheim:work` worker session is actively running in this specific project, and re-enabled when none is. What deterministic mechanism can write a "work session is live" marker to disk (which the read-only dashboard already watches), keep it accurate while the session runs, and remove/expire it on session end or crash — scoped to WORK sessions specifically, not every Claude session in the project?

## Summary
- **Recommended design: skill-frontmatter hook writing a lock + a Stop-driven heartbeat timestamp + a dashboard-side staleness window. NOT a clean SessionStart-writes / SessionEnd-removes bracket.** Two independent constraints force this: (a) scoping, and (b) crash safety.
- **Scoping (the crux):** `settings.json` / project hooks fire for EVERY Claude session in the project and cannot be matched by skill or slash-command, so they cannot distinguish "a worker is running" from "any Claude session is open." The documented mechanism to scope a hook to one skill is the `hooks` field in SKILL.md frontmatter: those hooks "are scoped to the component's lifecycle and only run when that component is active" [1][2]. So the work-only signal MUST come from the work SKILL.md's frontmatter hooks, not from project settings.
- **No clean start/end bracket from a skill.** Skill content (and thus its scoped hooks) loads when the skill is invoked and stays in context for the rest of the session [2]; there is no documented "skill ended" event that fires when `/agentheim:work` is logically done. So you cannot rely on a skill-scoped SessionEnd to remove the lock at the right moment. The reliable per-turn signal is `Stop`, which the docs say fires on every turn the skill is active — usable as a heartbeat that bumps `lastHeartbeat` [1].
- **SessionEnd is NOT a reliable lock-remover.** The official docs do not guarantee SessionEnd fires on crash/SIGKILL, and a tracked, closed-as-not-planned GitHub issue shows SessionEnd does NOT fire on `/exit` (only on ctrl-d) [3]. A staleness/heartbeat fallback is therefore mandatory, mirroring the repo's existing pid-liveness reaping idiom.
- **No PID is exposed.** No hook payload or environment variable documented by Anthropic exposes the Claude CLI process PID [1]. The dashboard cannot `process.kill(pid,0)`-probe a Claude session the way it probes its own pidfile. Liveness for a Claude work session must be inferred from a heartbeat timestamp + staleness window, not a PID probe. (Single-source-of-truth caveat below.)
- **`${CLAUDE_PROJECT_DIR}` is available** to hook commands as both a `${...}` placeholder and an exported env var, so a hook can deterministically write into `.agentheim/.dashboard/` [1].

## Findings

### 1. SessionStart hook

**Exists and fires as you'd expect.** SessionStart runs "when Claude Code starts a new session or resumes an existing session." The matcher/`source` values are [1]:
- `startup` — new session
- `resume` — `--resume`, `--continue`, or `/resume`
- `clear` — `/clear`
- `compact` — auto or manual compaction

**Stdin payload (verbatim field set from the docs example) [1]:**
```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.../<uuid>.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "SessionStart",
  "source": "startup",
  "model": "claude-sonnet-4-6"
}
```
Optional additional fields: `agent_type`, `session_title`.

**PID exposure — NO.** The payload exposes `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `source`, `model` (+ optional `agent_type`, `session_title`). There is **no `pid` / `CLAUDE_PID` / parent-process-id field documented anywhere in the hooks reference**, for SessionStart or any other event [1]. This changes the liveness design: the dashboard cannot do a `process.kill(pid,0)` probe against the Claude session the way it does against its own pidfile, because it never learns the PID through any documented channel. Liveness must be inferred from a heartbeat timestamp.

**`${CLAUDE_PROJECT_DIR}` — YES, available.** The hooks reference documents path placeholders that are also exported to the hook process environment: `${CLAUDE_PROJECT_DIR}` (env var `CLAUDE_PROJECT_DIR`), plus `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` [1]. So a hook command can reliably resolve the project root and write into `.agentheim/.dashboard/`. (`cwd` in the payload is an additional, redundant signal.) SessionStart also gets `CLAUDE_ENV_FILE` for persisting env vars; that is not needed here.

**Supported hook types for SessionStart:** the hooks reference states SessionStart supports `type: "command"` and `type: "mcp_tool"` only [1]. A shell-command hook (what we want) is supported.

**Scoping limitation (important):** a SessionStart hook placed in project `settings.json` fires for EVERY session start in the project — modeling, ad-hoc chat, anything — and SessionStart has no skill/command matcher. So a settings-level SessionStart cannot by itself mean "a worker started." It only becomes work-scoped if declared in the work SKILL.md frontmatter (see §2), and even then it fires at session start, not at skill-invocation time (see §2 caveat).

### 2. Skill-scoped hooks (the crux — scoping to work only)

**The mechanism exists and is the documented way to scope a hook to one skill.** SKILL.md frontmatter has a `hooks` field, described in the skills reference as "Hooks scoped to this skill's lifecycle" [2]. The hooks reference's "Hooks in skills and agents" section states verbatim [1]:

> "In addition to settings files and plugins, hooks can be defined directly in skills and subagents using frontmatter. These hooks are scoped to the component's lifecycle and only run when that component is active.
> All hook events are supported. For subagents, `Stop` hooks are automatically converted to `SubagentStop` since that is the event that fires when a subagent completes.
> Hooks use the same configuration format as settings-based hooks but are scoped to the component's lifetime and cleaned up when it finishes."

So three documented facts:
1. **All hook events are supported** in skill frontmatter [1]. (Practical caveat: a tracked open bug, #17688 on Claude Code 2.1.5, reports skill-frontmatter hooks NOT firing when the skill is loaded as part of a *plugin* — see Open questions. Agentheim's work skill is a project `.claude/skills/` skill, not a plugin skill, so this bug may not apply, but it should be verified by test [4].)
2. **They only run when the component is active** and are **cleaned up when it finishes** [1].
3. **For `context: fork` skills, `Stop` is auto-converted to `SubagentStop`** [1]. The repo states the work SKILL.md runs INLINE (no `context: fork`), so its `Stop` hook stays a real `Stop` and fires per assistant turn while the skill drives the session.

**What "scoped to the skill's lifecycle" actually means — and why it is NOT a clean start/end bracket.** The skills reference is explicit about skill lifecycle: "When you or Claude invoke a skill, the rendered `SKILL.md` content enters the conversation as a single message and stays there for the rest of the session. Claude Code does not re-read the skill file on later turns" [2]. So for an inline skill, "active" effectively means "from invocation through the rest of the session" — there is no documented event that fires when the skill is *logically done* mid-session. Consequences:
- A skill-frontmatter **SessionStart** hook does not fire at `/agentheim:work` invocation time; SessionStart fires at session start, and the skill content only enters context once invoked. (Whether a skill-scoped SessionStart can ever fire for an already-started session is undocumented — flagged under Open questions.) This means SessionStart is not the natural "work started" trigger for a slash-command-invoked skill.
- There is **no skill-scoped "skill ended" / SessionEnd that fires the moment work concludes**. The skill content persists for the session; cleanup happens "when it finishes" [1], which for an inline skill is tied to the session/component lifetime, not to a clean logical end of the work procedure.

**Therefore the lock cannot be a clean SessionStart-writes / SessionEnd-removes bracket scoped to work.** The robust, documented signal a work skill can emit per turn is `Stop`. `Stop` "fires on every occurrence" with no matcher [1], so a `Stop` hook in the work SKILL.md frontmatter runs a shell command at the end of every assistant turn while the work skill is active — ideal for (a) writing/creating the lock on the first turn and (b) bumping `lastHeartbeat` on every subsequent turn. Each spawned worker subagent additionally produces `SubagentStop` [1], which could also bump the heartbeat, but the inline orchestrator's per-turn `Stop` already covers liveness.

**Contrast with project `settings.json` hooks (confirming the scoping argument).** Hooks in `settings.json` (user/project/local/managed) are project- or user-global and fire for every matching event in any session in that scope. The hooks reference's matcher system matches on tool names (PreToolUse/PostToolUse) or `source`/`reason`/agent-type for lifecycle events — there is **no documented matcher that scopes a `settings.json` hook to a specific skill or slash command** [1]. So a plain SessionStart/SessionEnd/Stop in project settings cannot distinguish "a `/agentheim:work` worker is running" from "any Claude session is open." Skill-frontmatter hooks are the documented way to achieve work-only scoping [1][2].

### 3. SessionEnd reliability for lock removal

**The official docs do NOT guarantee SessionEnd fires on crash/SIGKILL, and there is positive evidence it skips at least one common clean-exit path.**

What the hooks reference documents [1]:
- SessionEnd "runs when a session terminates," cannot block termination, and carries a `reason` of `clear` / `resume` / `logout` / `prompt_input_exit` / `other`.
- The docs are **silent on crash/signal behavior** — no statement that SessionEnd "always fires" on SIGKILL, terminal-window-close, or process crash. There is no reliability guarantee to lean on.

What the (non-primary but authoritative) tracker shows:
- **SessionEnd does NOT fire on `/exit`** — only on ctrl-d. Reported, marked stale, closed as not planned with no maintainer commitment to fix [3]. So even a *clean, user-initiated* exit path can leave the lock un-removed.
- Documentation ambiguity: an example JSON in the docs reportedly shows `"reason": "exit"`, a value not in the documented enum, indicating the area is under-specified [3].

**Conclusion for design:** "delete the lock on SessionEnd" is necessary-but-insufficient. Because (a) the docs give no crash guarantee and (b) a confirmed path (`/exit`) skips it, a stale lock WILL occur in practice. A **staleness / heartbeat fallback is mandatory** — the dashboard must treat the lock as dead if `lastHeartbeat` is older than a window (e.g. N minutes), exactly mirroring the repo's existing pidfile reaping (`process.kill(pid,0)` → ESRCH=dead). SessionEnd-removes is a best-effort *fast-path* cleanup layered on top of the staleness window, not the primary correctness mechanism.

Additional caveat: SessionEnd hooks doing "non-trivial async work" can be killed before completing (the process exits without awaiting the hook) per community reports; keep any SessionEnd cleanup a single synchronous file delete [3 thread].

### 4. Heartbeat viability

**Confirmed viable.** `Stop` fires when Claude finishes responding to a turn, on every occurrence, with no matcher and supporting `type: "command"` hooks [1]. A `Stop` hook declared in the work SKILL.md frontmatter therefore deterministically runs a shell command at the end of each assistant turn while the work skill is active, which can:
1. Create the lock file on first fire (write `{startedAt, lastHeartbeat, session_id, cwd}` — fields available from the Stop payload's `session_id`/`cwd` plus `${CLAUDE_PROJECT_DIR}` [1]).
2. Bump `lastHeartbeat` to the current time on every subsequent fire.

Because the work orchestrator runs INLINE (no `context: fork`), its `Stop` is a real per-turn `Stop`, not converted to `SubagentStop` [1] — so the heartbeat ticks on the orchestrator's own turns, independent of subagent activity. Each spawned worker subagent additionally fires `SubagentStop` [1], available as an extra heartbeat source if desired.

The dashboard (read-only, already watching `.agentheim/`) then reads the lock and computes: live iff `now - lastHeartbeat < stalenessWindow`. This is the Claude-session analogue of the existing pid-liveness reaper, substituting a timestamp window for the `process.kill(pid,0)` probe (which is unavailable here because no PID is exposed).

**One known gap in `Stop`:** a community-reported issue notes `Stop` may not fire if Claude stalls mid-turn after a tool result (silent tool stop) [5]. This is an edge case, not the normal turn-completion path, and the staleness window absorbs it gracefully (a stalled session stops heart-beating and is reaped). Flagged under Open questions.

## Sources
1. [Hooks reference — Claude Code Docs](https://code.claude.com/docs/en/hooks) — PRIMARY. SessionStart/SessionEnd/Stop/SubagentStop payloads, matchers, supported hook types, env vars (`CLAUDE_PROJECT_DIR`), "Hooks in skills and agents" section (verbatim). No PID field anywhere.
2. [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills) — PRIMARY. `hooks` frontmatter field ("Hooks scoped to this skill's lifecycle"); skill content lifecycle ("enters the conversation as a single message and stays there for the rest of the session"); `context: fork` semantics.
3. [Issue #17885 — SessionEnd hook doesn't fire on /exit](https://github.com/anthropics/claude-code/issues/17885) — AUTHORITATIVE TRACKER (anthropics/claude-code). SessionEnd fires on ctrl-d but NOT `/exit`; closed as not planned; docs/enum ambiguity. Fills the crash/exit gap the official docs leave silent.
4. [Issue #17688 — Skill-scoped hooks in SKILL.md frontmatter not triggered within plugins](https://github.com/anthropics/claude-code/issues/17688) — AUTHORITATIVE TRACKER. Open bug on Claude Code 2.1.5 (macOS): skill-frontmatter hooks don't fire when the skill is a *plugin* skill. Caveat for whether the recommended mechanism works in all packagings.
5. [Issue #29881 — Stop hook not fired when Claude stalls mid-turn after tool result](https://github.com/anthropics/claude-code/issues/29881) — AUTHORITATIVE TRACKER. Edge case where Stop may not fire (silent tool stop).

Search-surfaced secondary sources (used only to locate primary docs, NOT cited as evidence): claudefa.st hooks guides, morphllm hooks reference, datacamp tutorial, agentpatterns.ai frontmatter reference. Vendor/community blogs — treated as pointers, not authority.

## Open questions
- **PID exposure (environment-specific, NOT asserted as universal):** The hooks reference documents no PID field [1]. It is conceivable a future version or an undocumented env var exposes a PID, or that the launching dashboard could discover the Claude child PID itself at spawn time (it controls the terminal launch). That spawn-side PID capture is an Agentheim-implementation option outside the docs' scope and should be evaluated separately — if the dashboard can record the PID of the terminal/Claude process it launches, a `process.kill(pid,0)` probe becomes possible AND would be more robust than the heartbeat. Flagged rather than assumed.
- **Does a skill-scoped SessionStart ever fire?** SessionStart fires at session start; the work skill is invoked via slash command after start. Whether a skill-frontmatter SessionStart can fire for an in-progress session (or only on resume/compact within the skill's active span) is undocumented. Treat skill-scoped SessionStart as unreliable for "work started"; prefer first-`Stop` to create the lock.
- **Plugin packaging bug (#17688):** If Agentheim ever ships the work skill as a *plugin* skill rather than a project `.claude/skills/` skill, skill-frontmatter hooks may silently not fire on 2.1.x [4]. Verify by test on the target Claude Code version before relying on it; confirm fix status for versions after 2.1.5.
- **Exact SessionEnd `reason` for terminal-window-close / SIGKILL:** undocumented; not in the `clear/resume/logout/prompt_input_exit/other` enum mapping cleanly [1][3]. The staleness window makes this moot for correctness but means the fast-path cleanup coverage is unknown.
- **Windows behavior:** All payload/env facts are from docs that use POSIX path examples; Agentheim runs on Windows 11. Whether `${CLAUDE_PROJECT_DIR}`, hook command execution, and SessionEnd-on-window-close behave identically on Windows/PowerShell is not separately verified here and should be smoke-tested (note SKILL.md frontmatter supports `shell: powershell` for inline blocks, but hook `command` execution shell on Windows is unverified) [2].
- **Staleness window length:** No doc basis; choose empirically. Must exceed the longest expected gap between assistant turns in a work session (long tool runs, user think-time) to avoid false "dead" reaping, while staying short enough that a crashed session re-enables the button promptly.
