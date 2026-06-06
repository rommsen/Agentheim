---
id: agentic-workflow-010
title: Dashboard cross-OS verification — POSIX leg
status: backlog
type: spike
context: agentic-workflow
created: 2026-06-06
completed:
commit:
depends_on: [agentic-workflow-001]
blocks: []
tags: [dashboard, cross-os, posix, verification, runtime]
related_adrs: [ADR-0002, ADR-0004]
related_research: []
prior_art: [agentic-workflow-004]
---

## Why

The dashboard runtime (ADR-0002) is required to work on the builder's Windows box **and** at
least one POSIX OS (macOS/Linux). The aw-001 integration epic verified the full end-to-end
flow on Windows only, because the integration pass ran from a Windows-only environment; its v1
acceptance bar was narrowed to Windows on 2026-06-06 (builder decision) and the POSIX leg was
carved out here.

The POSIX-specific risk is concentrated in the runtime/transport, not the read-rendered UI:
detached launch (`spawn(..., { detached: true, stdio: 'ignore' }).unref()`), explicit stop via
`process.kill(pid)`, project discovery by walking up for `.agentheim/`, and the neutral-cwd +
`AGENTHEIM_ROOT` contract (ADR-0004). These have only been exercised on Windows so far.

## What

Run the dashboard's launch/stop and full end-to-end flow on at least one POSIX OS
(macOS or Linux) and confirm parity with the Windows leg. Fix any POSIX-only divergence found
in the launcher/server (the single `launch.mjs` confines OS differences to `spawn` options and
the kill path — that is where regressions, if any, will live).

## Acceptance criteria

- [ ] `dashboard` launches the detached server on a POSIX OS: terminal returns, server reachable
      on the `127.0.0.1` ephemeral port recorded in `runtime.json`.
- [ ] `dashboard stop` terminates the detached process and removes the runfile on POSIX.
- [ ] Project discovery (walk-up for `.agentheim/`) and the `AGENTHEIM_ROOT` / neutral-cwd
      contract (ADR-0004) behave identically to Windows.
- [ ] The end-to-end flow works on POSIX: launch → board → open any artifact in the slide-over →
      board live-updates when a skill moves a file on disk → drag `backlog→todo` Promotes.
- [ ] The dashboard test suite (lib + dashboard) runs green on the POSIX OS.
- [ ] Any POSIX-only fix is captured in the BC README / an ADR addendum if it changes the
      documented runtime contract.

## Notes

- Likely needs the builder's hand on a POSIX box — this is environmental verification, not new
  feature work. A worker on a Windows-only host cannot satisfy these criteria; keep in backlog
  until a POSIX environment is available.
- Governing decisions: ADR-0002 (Node-stdlib localhost transport, detached launch, walk-up
  discovery), ADR-0004 (neutral cwd + `AGENTHEIM_ROOT`). The Windows launch/stop path was the
  one explicitly flagged as needing per-OS testing in ADR-0002's Consequences — POSIX is the
  mirror of that.
- Prior art: aw-004 (server bootstrap) built and Windows-verified the launcher/server this task
  re-verifies on POSIX.
