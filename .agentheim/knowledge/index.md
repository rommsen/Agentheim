# Index

Top-level catalog of this project's bounded contexts, global decisions, and research.
For BC-scoped artifacts, see each BC's `INDEX.md`.

> Updated by: `modeling` (BC creation), `work` (global ADRs), `research` (reports tagged global / cross-BC), backfill script.
> Hand-edits are fine but the skills will append at the section markers below.

---

## Bounded contexts

<!-- bc-list:start -->
- **agentic-workflow** — running a domain-driven, human-in-the-loop agentic workflow on Claude Code; the single core context — `contexts/agentic-workflow/INDEX.md`
- **design-system** — frontend infrastructure: the styleguide and component patterns any UI-bearing feature must conform to (supporting) — `contexts/design-system/INDEX.md`
- **infrastructure** — globally-true tech/runtime concerns; currently scoped tightly to the dashboard web-server runtime & transport (supporting) — `contexts/infrastructure/INDEX.md`
<!-- bc-list:end -->

## Global ADRs (scope: global)

<!-- adr-global:start -->
<!-- adr-global:end -->

## Cross-BC research

Research reports relevant to more than one BC (or to the project as a whole). BC-specific
reports are listed in each BC's `INDEX.md`.

<!-- research-global:start -->
- **Naming a Claude Code terminal/session: local IDE tab vs cloud session** (2026-06-15) — local IDE terminal tab (always "Claude") is NOT custom-nameable: no setting/flag/env var, the CLI overwrites the title every spinner tick (manual rename / OSC / `/rename` all lose), only workaround a third-party VS Code ext (Claude Terminal Name Sync, macOS/Linux only). BUT cloud / Remote-Control sessions auto-name from the first prompt and are user-renameable — because the named object there is an Anthropic-owned session-list row, not an OS terminal tab the CLI can't own. Documents the title precedence (`--name`/`/remote-control` > `/rename` > last meaningful message > placeholder). Native local auto-titling (#47176) closed not-planned — `knowledge/research/claude-code-terminal-session-naming-2026-06-15.md`
- **Detecting a live Work session (disable the button while one runs)** (2026-06-15) — project-scoped, work-only liveness marker; a clean SessionStart/SessionEnd bracket is NOT achievable, so the robust design is a skill-frontmatter `Stop` hook writing a lock + heartbeat timestamp, with a dashboard-side staleness window (mirrors the repo's pid-liveness reaping) — `knowledge/research/work-session-presence-lock-2026-06-15.md`
- **Knowing when the Work terminal is finished** (2026-06-15) — can the read-only dashboard learn when a `/agentheim:work` terminal session is done? Compares Claude Code hooks (Stop vs SessionEnd vs SubagentStop) against VS Code terminal-lifecycle APIs and headless `-p`; the deterministic on-disk signal is a pre-configured hook that writes a file — `knowledge/research/work-terminal-completion-signal-2026-06-15.md`
- **Dashboard button → Claude Code in a VS Code terminal** (2026-06-09) — bridge options for triggering `claude` from a Simple-Browser dashboard button; recommends a tiny localhost-listener VS Code extension — `knowledge/research/vscode-dashboard-terminal-bridge-2026-06-09.md`
<!-- research-global:end -->

## Pointers

- Vision: `vision.md`
- Context map: `context-map.md` (not warranted — single-BC domain)
- Protocol (chronological log): `knowledge/protocol.md` — newest entries on top
- All ADRs: `knowledge/decisions/`
- All research: `knowledge/research/`
