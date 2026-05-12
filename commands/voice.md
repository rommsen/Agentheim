---
description: Pick the Mockingbird voice this repo uses for Claude Code TTS notifications (or `off` to disable)
argument-hint: "[voice-id | off]"
allowed-tools: PowerShell, Bash, AskUserQuestion, Write
---

Set the per-repo Mockingbird voice. The selection is written to `./.claude/agenthoff-voice` (a single line containing the voice id, or the literal `off` to mute this repo) and read on every hook fire by `scripts/mockingbird-speak.ps1` — no Claude restart needed.

**Cross-platform note:** Mockingbird is a Windows-only WPF app. On macOS / Linux the PowerShell hook scripts won't run at all (no `powershell` on PATH), so you'll get silent no-ops by default — no opt-out needed. The `off` value is mainly useful on Windows when you want to mute *this* repo while leaving the global default (`$env:MOCKINGBIRD_VOICE`) intact for other repos.

## Behavior

Interpret `$ARGUMENTS`:

- **`off` / `none` / `-`** — write `off` to `./.claude/agenthoff-voice`. The speak script honors this as an explicit disable.
- **Any other non-empty value** — treat it as a voice id. Skip the prompt, validate that it's in the catalog (warn if not, but still write), persist it.
- **Empty** — fetch the catalog, prompt the user with `AskUserQuestion` (include "Off — mute this repo" as the last option), persist their choice.

## Step 1 — fetch the voice catalog

On Windows, prefer the `PowerShell` tool to avoid Bash-quoting issues with `$_` and `$(...)`. Run:

```powershell
try { (Invoke-WebRequest -Uri http://127.0.0.1:7223/voices -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop).Content } catch { "UNREACHABLE: $($_.Exception.Message)" }
```

On non-Windows or if the PowerShell tool isn't available, fall back to `Bash`:

```bash
curl -s --max-time 3 http://127.0.0.1:7223/voices || echo "UNREACHABLE"
```

The response is a JSON array of voice objects: `{id, name, engine, isBuiltIn}`. Built-ins ship with pocket-tts (alba, marius, javert, jean, fantine, cosette, eponine, azelma); the rest are user-cloned voices.

**If you get `UNREACHABLE:`** — Mockingbird isn't running. Tell the user "Mockingbird isn't reachable at 127.0.0.1:7223 — start the Mockingbird tray app and try again." Stop here.

## Step 2 — prompt (only when no argument was given)

Parse the JSON and present the voices via `AskUserQuestion`. Format each option as `<name>` with description `<id> · <built-in|cloned>`. Always include **"Off — mute this repo"** as the last option (writes `off`). If there are more than 4 voices, group sensibly (built-ins as the primary set; offer "Show cloned voices" as a follow-up if cloned voices exist and the user picks it) — but keep the "Off" option in the primary set so disabling is always one click away.

## Step 3 — persist

Write the chosen voice id to `./.claude/agenthoff-voice`. Create the `.claude/` directory if it doesn't exist. The file is a single line, no trailing newline required, plain UTF-8 (NOT UTF-16 BOM — pass `-Encoding utf8` if using PowerShell `Set-Content`/`Out-File`, or use the `Write` tool directly).

## Step 4 — confirm

Report in one short line, e.g. `voice: marius`, `voice: marius (cloned)`, or `voice: off (this repo is muted)`. Mention that it takes effect on the very next hook fire.
