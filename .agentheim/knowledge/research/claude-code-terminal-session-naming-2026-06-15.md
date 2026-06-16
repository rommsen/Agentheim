---
topic: Naming Claude Code sessions — local IDE terminal tabs (no) vs cloud/web session list (auto-named from the prompt)
date: 2026-06-15
requested_by: [user]
related_tasks: []
note: Extended 2026-06-15 with a "Cloud sessions — auto-naming from the prompt" section answering a follow-up question.
---

# Research: Naming Claude Code terminal sessions in an IDE

## Question
When starting a Claude Code terminal session from inside an IDE, can the terminal session/tab be given a custom name? Today every concurrent session shows up labeled "Claude" (or "Claude Code"), making multiple sessions indistinguishable. The user said "Visual Studio plugin" — this report distinguishes the **VS Code extension** (mature, official), the **Visual Studio (proper) extension** (third-party only), and the CLI running in any integrated terminal.

## Summary
- **No official, supported setting, CLI flag, or environment variable exists** to set or customize the terminal tab name of a Claude Code session. This is a confirmed, repeatedly-reported limitation, not something you've configured wrong. [1][2][3][4][5]
- The root cause: the Claude Code **CLI actively rewrites the terminal title on every spinner tick** (to "Claude Code" / a task description). It overwrites anything you set — manual rename, OSC escape sequences, AppleScript — within a fraction of a second. [2][4][5]
- Anthropic has **closed the relevant feature requests as duplicate / not-planned / stale** as of early–mid 2026. There is demand (a dozen+ issues) but no shipped fix and no maintainer commitment. [1][2][3][4][5]
- The `/rename` command renames the session **internally only**; it does **not** propagate to the terminal tab title. [3][5][6]
- The **most promising practical workaround for VS Code** is a third-party (non-Anthropic) extension, **"Claude Terminal Name Sync"**, which watches Claude session state and renames the VS Code tab to match `/rename`. Caveat: it is documented as **macOS/Linux only, Windows untested**, and has a tiny install base. [7]
- For the **VS Code extension's graphical chat panel** (not the integrated terminal), sessions *do* get AI-generated titles you can rename — but that is a different surface than CLI terminal tabs. [6]
- There is **no official Anthropic extension for Visual Studio (proper)**; only third-party extensions exist, and a native VS integration is still just a feature request. The user's "Visual Studio plugin" is most likely the **VS Code** extension or the CLI in VS Code's integrated terminal. [8][9]

**Follow-up: cloud sessions DO auto-name from the prompt — here's why, and why local doesn't (added 2026-06-15):**
- **Cloud/web sessions name a different object than the local IDE.** Claude Code on the web (claude.ai/code) presents a **session list in a sidebar** — conversation-thread objects Anthropic fully owns and renders. The local IDE shows **OS/VS Code terminal tabs** that Anthropic does *not* own. Naming the former is easy; naming the latter is the unsolved problem from the rest of this report. [13][14][16]
- **The cloud auto-name is documented and official.** Per Anthropic's Remote Control docs, the session title follows an explicit precedence: (1) name from `--name`/`--remote-control`/`/remote-control`, (2) `/rename`, (3) last meaningful message in history, (4) an auto-generated `hostname-graceful-unicorn` placeholder — and crucially: **"If you didn't set an explicit name, the title updates to reflect your prompt once you send one."** That is the behavior the user observed. [13]
- **Why it works in the cloud but not locally:** in the cloud Claude *is* the UI — it writes whatever string it wants into a session-list row it controls. Locally, the terminal tab title is owned by the OS/VS Code, and the CLI can only push an OSC title string that it then overwrites on every spinner tick (see §3). Different surface, different owner. [13][16]
- **The cloud title is editable and persists**, but across **two non-reconciling stores**: a native desktop `aiTitle` store and a **cloud "Bridge" store** (`updateBridgeSessionTitle`). claude.ai/code and mobile read the Bridge store; the desktop sidebar reads `aiTitle`. They can diverge — web/mobile may show the raw first user message while desktop shows a cleaner AI title. Only the Desktop **Rename** button updates both. [15]
- **There is still no way to get this prompt-derived naming onto a *local IDE terminal tab*.** The cloud mechanism names a UI row, not an OS tab; it does not solve the local case. The Remote Control footer instead just *links* to the cloud session. The native "auto-title CLI sessions from the first message" request (#47176) was **closed as not planned**. [13][17]

## Findings

### 1. What creates the terminal session, and what sets its name

There are two distinct surfaces, and they behave differently:

**(a) The VS Code extension's graphical chat panel.** This is the recommended, official way to use Claude Code in VS Code. Conversations open as panels/tabs, not OS terminal tabs. New sessions "receive AI-generated titles based on your first message," and you can hover a session to "rename to give it a descriptive title." [6] So *panel* sessions are nameable — but the user's complaint about tabs labeled "Claude" points at the terminal, not this panel.

**(b) The Claude Code CLI running in an integrated terminal.** When you run `claude` in VS Code's integrated terminal (or any terminal), the CLI takes over the terminal title. The displayed name is **set by the CLI**, which writes "Claude Code" (plus a spinner/task) repeatedly. It is effectively hard-coded by the CLI, with no exposed config. [2][4][5] VS Code's own default for a tab title is "what the shell's detected process name" is, customizable via `terminal.integrated.tabs.title`. [10]

The `@terminal:name` mention feature in the docs uses "the terminal's title" as `name` — confirming the terminal title is the identifier in play — but the docs give no way to set that title for a Claude session. [6]

### 2. Is there a Claude Code setting / flag / env var for the tab name?

**No, as of mid-2026.** Across the official VS Code docs and multiple GitHub issues, no `terminalTitle` setting, `--title` flag, `disableTerminalTitle` flag, or environment variable exists. The official VS Code extension settings table lists `useTerminal`, `preferredLocation`, `environmentVariables`, etc., but **nothing for terminal/tab naming**. [6] Issue #29349 explicitly requests exactly such a setting (`terminalTitle` in settings.json, or a `disableTerminalTitle` flag) and was **closed as duplicate with no current workaround documented**. [2] Issue #52258 requests a `/title` command, a `TitleChange` hook, or a `"titleFormat"` config template, and was **closed as not planned (duplicate, stale)**. [4]

### 3. IDE-side rename — does it stick?

You can right-click a VS Code terminal tab and choose **Rename**. [11] But for a Claude CLI session this **does not persist**: the CLI overwrites the title on every spinner tick. Issue #23998 documents that Claude "continuously overwrites the terminal tab's `custom_title` property on every spinner tick," defeating manual renames, OSC sequences to stdout, OSC to `/dev/tty`, and `osascript` alike — all reset on each tick. [5] Issue #29349 reports the same aggressive override defeating manual renames. [2]

One VS Code-side mechanism *can* help: setting `"terminal.integrated.tabs.title": "${sequence}"` makes VS Code display the title the process sets via escape sequences. [3][10] But because Claude Code currently does **not** emit a *useful, stable* OSC title (and what it does emit is the generic "Claude Code"/task spinner), this doesn't give you distinct per-session names today. The variable `${sequence}` is "the name provided to the terminal by the process." [10] Precedence: a manual rename normally wins until the process pushes a new sequence title; with Claude that push happens continuously, so the manual name is effectively lost. (This precedence detail is inferred from issue reports rather than stated explicitly in VS Code docs — see Open questions.) [3][5]

### 4. Setting the name at launch / per-session

- **CLI flag at launch:** none exists for the title. [6]
- **`/rename` inside the session:** renames the session label internally; does **not** change the terminal tab. This is the single most-requested fix — see issues #18326, #23998, #55197 — all asking that `/rename` emit OSC 0/2 (`\033]2;...\007` / `\033]0;...\007`) so the tab follows. All are **closed (duplicate / not planned / stale)**; the behavior is not implemented. [3][5][12]
- **OSC 0/2 escape sequences yourself (e.g., `printf '\033]0;My Name\007'`):** overwritten by Claude on the next tick. [4][5]
- **Windows Terminal `--suppressApplicationTitle`:** ignores OSC sequences entirely, so even a correctly-emitted title wouldn't take. Workaround there is manual right-click → Rename Tab. [12]
- **tmux / multiplexer wrapper:** not directly covered by the sources. In principle a tmux window name set via tmux's own controls (not relying on the inner program's OSC) could survive, but no source confirms a working recipe, so treat as unverified.

### 5. Community signal, known-limitation status, and workarounds

This is a **widely reported, acknowledged-by-volume limitation**. At least these issues all describe the same problem from different angles: #14343, #15802, #18326, #23998, #26063, #29310, #29349, #52258, #55197, #65243. [1][2][3][4][5][12] Several explicitly mention VS Code's terminal panel showing identical "Claude" tabs. [3] Anthropic's disposition so far: closed as duplicate / not planned / stale — i.e., **no committed fix**.

Workarounds found (all third-party, none official):

- **Claude Terminal Name Sync** (VS Code Marketplace, publisher "Jesse H. / jesshart"). Watches `~/.claude/sessions/<pid>.json` and uses process-tree analysis to map a VS Code terminal to its Claude child process, then retitles the tab to match `/rename`. **Not an Anthropic product.** Documented limits: **macOS/Linux only, Windows untested**; requires the CLI; closing a session leaves the last name (no VS Code API to clear it); ~36 installs at time of writing. Includes a "Sync Now" command and an optional cwd-basename fallback. [7] This is the closest thing to a real answer for VS Code, but verify it works on the user's OS before relying on it.
- **`claude-code-terminal-title`** (bluzername) and **`claude-code-iterm2-tab-status`/TabChroma** and **iterm2-claude-integration** — community scripts/hooks that update terminal titles based on tasks. The iTerm2 ones are macOS-specific; issue #52258 notes such hacks "don't persist because Claude Code's TUI re-renders the title on every cycle." Treat as fragile. [1][4]

### Which IDE does this apply to?

- **VS Code extension (official):** chat-panel sessions are nameable; CLI-in-integrated-terminal sessions are **not** (the subject of this report). [6]
- **Visual Studio (Microsoft's VS, proper):** **No official Anthropic extension.** Third-party extensions exist (e.g., `dliedke.ClaudeCodeExtension` "Claude Code Extension for Visual Studio", `GlassBeaver.ClaudeVS`) that embed a terminal/tool-window running the CLI; a native VS integration is an open feature request (#15942). These wrap the same CLI, so the same title-override behavior applies inside them; none is documented to solve naming. [8][9] Separately, "Claude" in *GitHub Copilot for Visual Studio* is a model choice, not Claude Code, and is unrelated to this question. [8]
- **JetBrains plugin:** not separately investigated here; the underlying CLI behavior (title override, `/rename` not propagating) is CLI-level and would apply the same way. (Unverified for JetBrains specifically.)

## Cloud sessions — auto-naming from the prompt

This section answers the follow-up: *"How does Claude name the session based on my prompt in a Cloud session, and why can't I get that locally?"* The short answer: the cloud names a **conversation/session object in a UI Anthropic fully controls**, not an OS terminal tab — so it can render any title it likes, including one derived from your prompt.

### What is being named in a cloud session — session, not terminal tab

In **Claude Code on the web** (claude.ai/code) and **Remote Control**, sessions appear as rows in a **sidebar session list**: *"Sessions appear in the sidebar at claude.ai/code. From there you can review changes, share with teammates, archive finished work, or delete sessions."* [14] Each row is a conversation/thread object, not an operating-system terminal tab. You manage its title from a **dropdown next to the session title** (e.g., Delete sits there). [14]

This is a fundamentally different surface from the rest of this report:

| Surface | What carries the name | Who owns/renders it | Prompt-derived auto-name? |
| :-- | :-- | :-- | :-- |
| Cloud web / Remote Control session list (claude.ai/code, mobile) | A session-list **row title** | Anthropic's own web/app UI | **Yes** [13][14] |
| claude.ai chat conversations | Conversation title | Anthropic's web UI | Yes (LLM-summarized from first message) [18][19] |
| VS Code extension **chat panel** sessions | Panel/session title | The extension UI | Yes ("AI-generated titles based on your first message") [6] |
| Local CLI **terminal tab** (this report's main subject) | OS/VS Code **terminal tab title** | The OS / VS Code terminal, not Claude | **No** — CLI can only push an OSC string it then overwrites [2][4][5] |

The decisive distinction: in the first three rows, **Claude is the UI** and writes the title into a surface it controls. In the last row, the tab belongs to the terminal emulator; the CLI is a guest that can only emit an escape-sequence title, which its own spinner re-renders away (see §3). That ownership difference — not a missing setting — is why the cloud names sessions and the local terminal tab stays "Claude."

### How the cloud auto-name is produced and when it fires

The authoritative, **official** description is in Anthropic's Remote Control docs, which lay out the exact title-selection precedence for the session shown at claude.ai/code: [13]

1. The name you passed to `--name`, `--remote-control`, or `/remote-control`
2. The title you set with `/rename`
3. The **last meaningful message** in existing conversation history
4. An auto-generated placeholder like `myhost-graceful-unicorn` (hostname or your `--remote-control-session-name-prefix`)

And the key line matching the user's observation: **"If you didn't set an explicit name, the title updates to reflect your prompt once you send one."** [13] So with no explicit `--name`/`/rename`, the row starts as a `hostname-graceful-unicorn` placeholder and then **re-titles from your prompt after you send your first message** — exactly the "named based on whatever the prompt is" behavior. For the VS Code Remote Control command specifically, the docs say plainly: *"The session title is derived from your conversation history or first prompt."* [13]

This matches the broader pattern: the CLI session picker likewise shows *"the session name if set, otherwise the conversation summary or first prompt."* [16] And it's the same family of mechanism that titles **claude.ai chat conversations** — Anthropic generates the title from the first message/exchange. [18][19] Whether the cloud title is a verbatim slice of the prompt or a short LLM-generated summary appears to **depend on the surface**: issue #64304 reports the web/mobile Bridge view often shows the **raw first/last user message** (and can even fall back to junk like `session interrupted by user`), while the **desktop** sidebar shows a cleaner **AI-generated `aiTitle`**. [15] (The precise "summary vs. verbatim" rule per surface is not stated in the official docs — see Open questions.)

### Where the cloud title is stored, editability, and persistence

The title is **editable and persists**, but issue #64304 documents that it lives in **two independent stores that don't reconcile**: [15]

- A **native desktop store** (`aiTitle`), read by the Desktop app sidebar.
- A **cloud "Bridge" store**, updated via an internal `updateBridgeSessionTitle` call and read by **claude.ai/code and the mobile app**.

Consequences reported in that issue: renaming from iOS/web updates only the Bridge store; a desktop-generated `aiTitle` does **not** propagate to the Bridge, so web/mobile can keep showing the raw first message. **Only the Desktop "Rename" button updates both stores at once.** [15] The local CLI transcript (`~/.claude/projects/.../<id>.jsonl`) and `.claude.json` reportedly carry **no title field at all** for these, so the title does not sync through the CLI path. [15] (#64304 is a community bug report describing current behavior, not an official spec — treat the store mechanics as well-evidenced-but-inferred. The user-facing editability via the session dropdown and `/rename`, and the auto-from-prompt behavior, are confirmed by official docs. [13][14])

The official docs do confirm you can `--name`, `/rename`, archive, share, and delete these sessions, and that they **persist even if you close the browser**. [13][14]

### Can this prompt-derived naming be applied to a local IDE terminal tab?

**No** — and this is the tie-back to the main report. The cloud mechanism names a **session-list row inside Anthropic's UI**, which is a categorically different object than a VS Code/OS terminal tab. None of the cloud machinery emits or controls an OS terminal-tab title:

- Remote Control's only local-terminal surface is a **footer indicator** (`/rc active`) that is just a **clickable link to the cloud session** — it does not rename your terminal tab. [13]
- The request to natively **auto-title local CLI sessions from the first user message** (the direct analogue of the cloud behavior) is issue #47176, **closed as not planned**; current options it lists are external MCP tools (e.g. Happy's `mcp__happy__change_title`) or manual `/rename`. [17]
- Everything in §§2–5 still holds: no `terminalTitle` setting/flag/env var, `/rename` doesn't propagate to the tab, OSC sequences get overwritten on each tick. [2][4][5]

So the user's mental model is correct: the cloud gets prompt-derived names *because Claude owns that UI*; locally the terminal tab is owned by VS Code/the OS and the CLI can't make a prompt-derived name stick there. The closest local approximations remain the VS Code **chat panel** (AI-titled, but a panel not a terminal tab) [6] and the third-party **Claude Terminal Name Sync** extension (syncs `/rename` to the tab; macOS/Linux only, Windows untested) [7].

## Sources
1. [Allow users to customize the terminal/tab title — anthropics/claude-code #52258](https://github.com/anthropics/claude-code/issues/52258) — feature request; closed not planned. Opened 2026-04-23.
2. [Allow customizing or disabling terminal title override — #29349](https://github.com/anthropics/claude-code/issues/29349) — documents aggressive title override; closed as duplicate. Opened 2026-02-27.
3. [Propagate session name to terminal title via escape sequences — #18326](https://github.com/anthropics/claude-code/issues/18326) — VS Code-specific; asks `/rename` to emit OSC 0/2; closed. Opened 2026-01-15.
4. [Allow users to customize the terminal/tab title — #52258 (proposals: /title, hook, titleFormat)](https://github.com/anthropics/claude-code/issues/52258) — lists community workarounds that don't persist.
5. [Include session name in terminal tab title after /rename — #23998](https://github.com/anthropics/claude-code/issues/23998) — documents per-tick overwrite defeating all manual/OSC/osascript attempts (macOS Terminal.app). Closed duplicate 2026-02-07.
6. [Use Claude Code in VS Code — official docs (code.claude.com/docs/en/vs-code)](https://code.claude.com/docs/en/vs-code) — settings table has no terminal-naming option; panel sessions get AI-generated titles + rename; `@terminal:name` uses the terminal's title.
7. [Claude Terminal Name Sync — VS Code Marketplace (jesshart)](https://marketplace.visualstudio.com/items?itemName=jesshart.claude-terminal-name-sync) — third-party extension syncing tab name to `/rename`; macOS/Linux only, Windows untested.
8. [Add support for Visual Studio 2026 Integration — #15942](https://github.com/anthropics/claude-code/issues/15942) — confirms no native official VS integration yet (feature request).
9. [Claude Code Extension for Visual Studio (dliedke) — Marketplace](https://marketplace.visualstudio.com/items?itemName=dliedke.ClaudeCodeExtension) — third-party VS extension embedding the CLI in a tool window.
10. [VS Code — Terminal Appearance docs](https://code.visualstudio.com/docs/terminal/appearance) — `terminal.integrated.tabs.title`/`.description`, variables incl. `${sequence}` = "the name provided to the terminal by the process."
11. [VS Code — Terminal Basics docs](https://code.visualstudio.com/docs/terminal/basics) — right-click a terminal → Rename.
12. [Sync terminal tab title with /rename — #55197](https://github.com/anthropics/claude-code/issues/55197) — closed as not planned/stale; notes Windows Terminal `--suppressApplicationTitle` ignores OSC.
13. [Continue local sessions from any device with Remote Control — official docs (code.claude.com/docs/en/remote-control)](https://code.claude.com/docs/en/remote-control) — **primary source for cloud auto-naming.** Documents the session-title precedence (1 `--name`/`/remote-control`, 2 `/rename`, 3 last meaningful message, 4 `hostname-graceful-unicorn`) and the key line "the title updates to reflect your prompt once you send one"; VS Code RC title "derived from your conversation history or first prompt"; footer indicator is just a link to the session.
14. [Use Claude Code on the web — official docs (code.claude.com/docs/en/claude-code-on-the-web)](https://code.claude.com/docs/en/claude-code-on-the-web) — cloud sessions appear as a sidebar **session list**; archive/share/delete/rename via the session dropdown; sessions persist after closing the browser. Research preview as of mid-2026.
15. [Session title diverges between Desktop app and mobile/web — #64304](https://github.com/anthropics/claude-code/issues/64304) — community bug report: two non-reconciling title stores (native `aiTitle` vs cloud Bridge / `updateBridgeSessionTitle`); web/mobile may show the raw first message, desktop shows AI title; only the Desktop Rename button unifies both. Describes current behavior, not an official spec.
16. [Manage sessions — official docs (code.claude.com/docs/en/sessions)](https://code.claude.com/docs/en/sessions) — CLI session picker row shows "the session name if set, otherwise the conversation summary or first prompt"; `claude -n`, `/rename`, plan-accept naming; transcripts at `~/.claude/projects/<project>/<session-id>.jsonl`.
17. [Feature: Native auto-session-title generation on first user message — #47176](https://github.com/anthropics/claude-code/issues/47176) — requests for the local CLI the same auto-titling that web/claude.ai already do; **closed as not planned**; current options are external MCP tools or manual `/rename`.
18. [How to Find Old Claude Conversations — LLMnesia (blog)](https://www.llmnesia.com/blog/how-to-find-old-claude-conversations) — secondary: claude.ai auto-generates conversation titles from the first message; descriptive opening messages improve them. Third-party blog, not Anthropic.
19. [Search Claude Conversation History — LLMnesia (blog)](https://www.llmnesia.com/blog/search-claude-conversation-history) — secondary corroboration that claude.ai titles come from the first message/exchange. Third-party blog.

## Open questions
- **Exact VS Code precedence** between a manual tab rename and a process-pushed OSC title is not stated outright in VS Code's docs; it's inferred from issue reports (the manual name holds until the process pushes a new sequence title, which Claude does continuously). Worth a quick local test to confirm on the user's VS Code version.
- **Windows specifics:** the best workaround (Claude Terminal Name Sync) is "Windows untested." If the user is on Windows 11 (they are, per env), this needs hands-on verification before recommending.
- **JetBrains** behavior was not separately confirmed; assumed to inherit CLI-level behavior.
- **Has any newer CLI version (post my Jan 2026 cutoff, e.g., the 2.1.x line referenced in docs) quietly added a title setting?** All evidence says no, but a 30-second check of `claude --help` and the latest CHANGELOG on the user's installed version would close this definitively.
- **Cloud auto-name: verbatim prompt slice vs. LLM summary, per surface.** Official docs say the title "updates to reflect your prompt" but don't specify whether it's a truncated copy of the prompt or an LLM-generated summary; #64304 suggests web/mobile lean toward the raw message while desktop shows a generated `aiTitle`. The exact rule and which surface summarizes is not documented — would need direct observation in the user's account.
- **Exactly when the cloud re-title fires** (on send of the first message vs. after the first assistant turn) is implied ("once you send one") but not pinned down in the docs.
- **The two-store / `updateBridgeSessionTitle` mechanics** come from a single community issue (#64304), not official docs; treat as well-evidenced inference rather than confirmed spec.
