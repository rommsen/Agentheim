// Static guard for the topbar RIGHT-ALIGN layout fix (agentic-workflow-053).
//
// The BoardTopbar is meant to read, left → right: [ search field ] … [ ⚙ ] [ Work ]
// (aw-052 / aw-049) — search anchored left (bounded `flex: 1, maxWidth: 520`), the
// settings gear + standing Work launch flush against the RIGHT edge. Before this fix
// the right-hand control group had no left push, so on any viewport wider than the
// search cap the group floated just past the search field with empty space trailing
// to the edge. The fix is a consumer-side flex tweak (`marginLeft: "auto"` on the
// gear+Work group) — no styleguide change (ADR-0003), presentation-only (ADR-0017).
//
// The board's React glue has no DOM render harness in this project — the established
// idiom (aw-016/020/022/023/026/027/039/049/052) is source-reading static guards.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');
const boardSrc = readFileSync(path.join(dashboardDir, 'app', 'board.js'), 'utf8');

function fn(src, name) {
  const m = src.match(new RegExp(`function ${name}\\b[\\s\\S]*?\\n}`));
  assert.ok(m, `${name} must exist`);
  return m[0];
}

test('the settings gear + Work group is pushed flush right (marginLeft: auto)', () => {
  const topbar = fn(boardSrc, 'BoardTopbar');
  // The group div holding SettingsMenu + the Work LaunchButton (the `gap: 9` group)
  // must carry a left-auto margin so all unconsumed free space collects BEFORE it,
  // seating the group against the topbar's right edge.
  const groupDiv = topbar.match(/<div style=\$\{\{[^}]*gap:\s*9[^}]*\}\}>/);
  assert.ok(groupDiv, 'the gear+Work group div must exist');
  assert.match(groupDiv[0], /marginLeft:\s*["']auto["']/,
    'the gear+Work group must be right-aligned via marginLeft: auto');
});

test('the search field stays LEFT-anchored with its bounded width (not stretched full-bar)', () => {
  const comp = fn(boardSrc, 'TopbarSearch');
  // The search keeps its bounded cap so it does not consume the whole bar; the free
  // space (not the field) is what the right group pushes off of.
  assert.match(comp, /flex:\s*1/, 'the search field grows within its cap');
  assert.match(comp, /maxWidth:\s*520/, 'the search field keeps its 520px cap');
});
