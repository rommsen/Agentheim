---
id: agentic-workflow-079
title: Sweep id-minting prose in the three live skills from next-number to random token
status: backlog
type: chore
context: agentic-workflow
created: 2026-06-17
completed:
depends_on: [agentic-workflow-078]
blocks: []
tags: [identity, ids, skills, modeling, quick-capture, brainstorm]
related_adrs: [0028]
related_research: []
prior_art: [agentic-workflow-077]
---

## Why

ADR-0028 ratifies the `<bc>-<token>` id scheme. The minting *instruction* currently lives as
prose in three live skills and still tells the skill to "scan existing files to determine the
next number" — the single-writer counter that ADR-0028 abolishes. Those instructions must move
to "emit a fresh 5-char random token (leading letter)". Depends on aw-078 so the runtime
(`deriveContext`) already accepts token ids before the skills start minting them.

## What

Update the id-minting prose and the retirement prose in the three live skills to ADR-0028's
token scheme; resolve the well-known foundation-id reservation in the same skills per ADR-0028 §7.
Leave the `capture-workspace/` eval fixtures unchanged.

## Acceptance criteria

- [ ] `skills/quick-capture/SKILL.md` (~line 154) — the "determine the next number by scanning
      all four" step is replaced with the token-emit instruction (grammar per ADR-0028 §1:
      5 chars, alphabet `0123456789abcdefghjkmnpqrstvwxyz`, first char a letter, lowercase).
- [ ] `skills/modeling/SKILL.md` (~line 263) — the CAPTURE "look at existing task files to
      determine the next number" step is replaced with the same token-emit instruction.
- [ ] `skills/modeling/SKILL.md` (~line 206) — the retirement prose ("a dismissed number is
      retired … a future capture takes the next free number") is restated per ADR-0028 §5:
      never-reuse holds by construction for tokens; the next-free-number clause stays only for
      legacy ids.
- [ ] `skills/brainstorm/SKILL.md` — greenfield foundation tasks keep their **reserved
      deterministic** ids (`design-system-001-styleguide` and the walking-skeleton foundation
      id) per ADR-0028 §7; ordinary captures elsewhere use random tokens. The styleguide-gate
      references (`depends_on: design-system-001-styleguide` in modeling, brainstorm, and the
      frontend-bearing BC READMEs) stay literal and valid.
- [ ] `skills/capture-workspace/` fixtures are NOT modified (they are snapshots, not a live
      skill) — verify the diff touches no path under `capture-workspace/`.
- [ ] A minted token id is still greppable as a `[<bc>-<token>]` commit trailer (ADR-0026 —
      no change needed, just confirm the prose doesn't break it).

## Notes

- Reserved foundation ids are the only digit-tailed ids minted going forward (ADR-0028 §7);
  everything `modeling` / `quick-capture` mints is a random token.
- This is documentation/prose only — no code. The runtime change is aw-078.
