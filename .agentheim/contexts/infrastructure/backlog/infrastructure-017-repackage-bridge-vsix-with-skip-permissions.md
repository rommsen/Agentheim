---
id: infrastructure-017
title: Re-package & version the bridge .vsix carrying the skip-permissions change
status: backlog
type: chore
context: infrastructure
created: 2026-06-15
completed:
commit:
depends_on: [infrastructure-016]
blocks: []
tags: [bridge, extension, packaging, release]
related_adrs: [0018]
related_research: []
prior_art: []
---

## Why
infrastructure-016 added the opt-in `skipPermissions` command-construction to the
bridge extension's pure core (`vscode-extension/src/bridge.js`). The shipped
`.vsix` artifact still reflects the pre-amendment behaviour and version. To get
the new behaviour into an installed editor, the extension must be re-packaged and
the `package.json` `version` bumped.

## What
- Decide the version bump (this is an additive, off-by-default behaviour change to
  `POST /run` — likely a minor bump from `0.1.0`).
- Re-run `npm run package` (vsce) to produce the new `.vsix`.
- Confirm `extension.js` (the only `vscode`-API file) still needs no change —
  infrastructure-016 was confined to the pure core.
- Update the extension README if its surface description lags.

## Notes
- Open question carried over from infrastructure-016's "Open for refine": how the
  `.vsix` is re-packaged/versioned for this change.
- Needs refinement: confirm the release/distribution channel for the `.vsix`
  (is it committed, attached to a release, or built on demand?).
