---
description: Release Agentheim itself (maintainer-only, run from the Agentheim source repo) — bump the manifest, push main, tag, and publish GitHub release notes for vX.Y.Z. Refuses in projects that merely use Agentheim as a plugin.
argument-hint: "x.y.z"
allowed-tools: Bash(git:*), Bash(gh:*), Read, Edit, Grep
---

# /release — cut an Agentheim release

This command automates the **`RELEASE.md` checklist** end-to-end for the version
passed as the argument. `RELEASE.md` is the policy of record (semver against the
plugin contract; ADR-0013). This card is its executable form — keep the two in
sync; if they ever disagree, `RELEASE.md` wins.

A release is **one act with marketplace consequences**: pushing a bumped manifest
to `main` is what moves every plugin user off *"already at latest"*. Treat it as
outward-facing — run the steps in order, stop and report on the first failure, and
never force-push or `git add -A`.

## Why this is a project-local command — invisible to plugin consumers

This card lives in the Agentheim repo's **`.claude/commands/`**, *not* in the plugin's
distributed **`commands/`** directory (where `/dashboard` lives). That placement is
deliberate and load-bearing: project commands are loaded **only** when you are working
in *this* repo, so they are **never shipped to projects that install Agentheim as a
plugin** and never appear in a consumer's command list. `/release` releases Agentheim
*itself* — it has no meaning in a consumer project, so consumers must not even see it.

> Keep this file under `.claude/commands/`. If it is ever moved into the plugin's
> `commands/` directory it becomes `agentheim:release` and leaks into every install —
> exactly what we do not want.

## Precondition — operate only on the Agentheim source repo

This is the **mirror image of `/dashboard`**. `/dashboard` reaches into the plugin via
`$CLAUDE_PLUGIN_ROOT` and runs against a **foreign** cwd. `/release` is the opposite: it
operates on the **current working directory's git repo**, and that repo **must be the
Agentheim source repo**. The `.claude/commands/` placement already keeps consumers from
ever seeing this command; the checks below are the belt-and-suspenders guard against
running it against the wrong repo (e.g. a copy, or a fresh clone with a misconfigured
remote).

**Do not** use `$CLAUDE_PLUGIN_ROOT` anywhere in this command — every path is
**cwd-relative** (`./.claude-plugin/plugin.json`), and every git op targets the cwd
repo's `origin`.

Before doing anything else, confirm **all** of these. If **any** fails → **STOP** and
tell the builder: *"`/release` only releases the Agentheim source repo, and this does not
look like it — refusing so I don't bump/push the wrong repository."* Make no edits, no
commits.

1. `./.claude-plugin/plugin.json` exists **at cwd** and its `name` is exactly
   `agentheim`. (A consumer project does not carry Agentheim's own manifest; this file
   ships *inside* the plugin, not into projects that install it.)
2. `./RELEASE.md` and `./.claude-plugin/marketplace.json` both exist at cwd — the
   Agentheim **source** repo markers.
3. `git remote get-url origin` resolves and points at the Agentheim repository
   (case-insensitively contains `heimeshoff/Agentheim`). This guarantees the push and
   tag in later steps land on Agentheim's own remote, never a foreign project's.

Only if all three hold are you in the Agentheim source repo and may proceed.

The requested version is: `$ARGUMENTS`

## Step 0 — validate the argument (stop on any failure)

1. If `$ARGUMENTS` is empty or not exactly three dot-separated integers
   (`X.Y.Z`, no `v` prefix, no suffix) → stop and tell the builder the expected
   form is `/release x.y.z` (e.g. `/release 0.8.4`).
2. Read `.claude-plugin/plugin.json` and note the current `version` — call it
   `OLD`. This is the **only** version source (`marketplace.json` carries none).
3. Compare `X.Y.Z` against `OLD` by semver. If it is **not strictly greater**
   (equal or lower) → stop and report; a release must move the number forward.
4. `git tag --list vX.Y.Z` — if the tag already exists → stop and report; the
   release was already cut.
5. `git status --porcelain` — capture the pre-existing dirty/untracked files
   **now**, so later steps add *only* release files and never sweep these in.

If all five pass, state the transition plainly: `OLD → X.Y.Z` and the semver
level it implies (patch / minor / major), then proceed.

## Step 1 — bump the manifest

Edit `.claude-plugin/plugin.json` → set `version` to `X.Y.Z`. Touch nothing else
in the manifest.

## Step 2 — commit the bump (scoped add only)

```
git add .claude-plugin/plugin.json
git commit -m "chore(release): vX.Y.Z"
```

Use **only** that pathspec — never `git add -A`/`.` (the working tree may carry
unrelated edits from a parallel session, per the Step 0.5 snapshot).

## Step 3 — push main (the step that reaches users)

```
git push origin main
```

If this fails (rejected / non-fast-forward / auth) → stop and report verbatim. Do
**not** force-push. The release has changed nothing for users until this succeeds.

## Step 4 — tag and push the tag

```
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

The tag string must equal the manifest version with a `v` prefix.

## Step 5 — compose the release notes

Find the previous release tag: `git describe --tags --abbrev=0 vX.Y.Z^` (the most
recent tag before this one). Then read what landed since it:

```
git log --oneline <prev-tag>..vX.Y.Z
```

Write a **concise one-paragraph** note (2–4 sentences) describing what changed,
in the builder's voice:
- Lead with the semver level and the headline capability/fix.
- Group by what actually shipped — features and bug fixes by their `[task-id]`.
- **Omit the noise**: `chore(release)`, `chore(protocol)`, SHA-stamp and
  bookkeeping commits are not release notes. (This is exactly why we do **not**
  use `gh --generate-notes`, which would dump them all — we commit straight to
  `main`.)

Cross-check against the `.agentheim/knowledge/protocol.md` "Task verified and
completed" entries since the last release if the commit subjects are terse.

## Step 6 — publish the GitHub Release

First check the CLI is available and authenticated: `gh auth status`.

- **If `gh` works** → create the release on the tag with the Step 5 notes:

  ```
  gh release create vX.Y.Z --title "vX.Y.Z" --notes "<the one-paragraph note>"
  ```

- **If `gh` is missing or not authenticated** → do **not** fail the release (it
  already "counts": manifest pushed + tag pushed). Instead, tell the builder the
  release is shipped but the GitHub Release object is not yet created, print the
  exact `gh release create` line above with the notes filled in so they can run
  it after `gh auth login`, and offer the web-UI fallback (*Releases → Draft a
  new release → pick tag `vX.Y.Z` → paste the notes → Publish*).

## Step 7 — log to the protocol

Prepend a `Release shipped` entry to `.agentheim/knowledge/protocol.md` (newest on
top, right after the `---` on line 4). Use today's date and this shape:

```markdown
## YYYY-MM-DD HH:MM -- Release shipped: vX.Y.Z

**Type:** Release
**Version:** OLD → X.Y.Z (<patch|minor|major> — <one-line what & why>)
**Manifest:** `.claude-plugin/plugin.json` bumped, committed `<short-sha>`
**Pushed to main:** yes (`<range>` on `origin/main`)
**Tag:** `vX.Y.Z` (annotated) → `<short-sha>`, pushed to origin
**GitHub Release:** created via `gh` | deferred (gh unavailable — notes handed to builder)

---
```

Then commit and push just the protocol:

```
git add .agentheim/knowledge/protocol.md
git commit -m "chore(protocol): record vX.Y.Z release shipped [work]"
git push origin main
```

## Step 8 — report

Tell the builder, in plain prose: `OLD → X.Y.Z` shipped; manifest on `origin/main`
(this is what clears the marketplace "already at latest" cache); tag pushed; the
GitHub Release status (created, or the exact command to run if deferred). Surface
anything that needed a fallback.
