// Static guard for the Workflow guide page's HAND-AUTHORED flow diagrams
// (agentic-workflow-060, governed by ADR-0003 / ADR-0017). aw-059 landed the page
// shell with placeholder diagram slots; this task fills those slots with three
// honest, per-segment HTML+CSS diagrams built from board-local primitives.
//
// The board's React glue has no DOM render harness in this project; the established
// idiom (aw-026 / aw-027 / aw-039 / aw-058 / aw-059) is source-reading static guards.
// This suite follows it, asserting against the diagram primitives + the three diagram
// component sources in board.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');
const boardSrc = readFileSync(path.join(dashboardDir, 'app', 'board.js'), 'utf8');

// Slice the diagram block: from the first diagram primitive (WNode) through the END
// of PromoteWorkDiagram, so every assertion has the primitives AND the three diagram
// components in scope.
function diagramSource() {
  const start = boardSrc.indexOf('function WNode(');
  assert.ok(start > -1, 'the WNode diagram primitive must exist in board.js');
  const lastAt = boardSrc.indexOf('function PromoteWorkDiagram(');
  assert.ok(lastAt > -1, 'PromoteWorkDiagram must exist in board.js');
  const after = boardSrc.indexOf('\nfunction ', lastAt + 'function PromoteWorkDiagram('.length);
  const end = after > -1 ? after : boardSrc.length;
  return boardSrc.slice(start, end);
}

const dg = diagramSource();
// Strip single-line // comments for the "no library / no SVG" structural checks so
// the doc-comments (which legitimately mention SVG / library to record their absence)
// don't trip the assertions.
const dgCode = dg.replace(/^\s*\/\/.*$/gm, '');

test('each segment is carried by a hand-authored diagram component', () => {
  assert.match(dg, /function PreparationDiagram\(/, 'Preparation must have an authored diagram');
  assert.match(dg, /function CapturingDiagram\(/, 'Capturing must have an authored diagram');
  assert.match(dg, /function PromoteWorkDiagram\(/, 'Promote & Work must have an authored diagram');
});

test('the diagrams are built with HTML + CSS — NO inline SVG, NO diagramming library', () => {
  assert.doesNotMatch(dgCode, /<svg|createElement\(['"]svg|\bpath d=/i, 'no inline SVG allowed');
  assert.doesNotMatch(dgCode, /mermaid|d3|reactflow|react-flow|cytoscape|gojs|dagre/i,
    'no diagramming library may be referenced');
});

test('Preparation is linear then FANS OUT to the four foundation outputs', () => {
  // brainstorm → (vision.md + context-map) → fan-out → four outputs
  assert.match(dg, /label="brainstorm"/, 'Preparation names the brainstorm skill');
  assert.match(dg, /label="vision\.md"/, 'Preparation names the vision.md artifact');
  assert.match(dg, /label="context-map"/, 'Preparation names the context-map artifact');
  assert.match(dg, /WFanRow/, 'Preparation uses a fan-out row for the foundation outputs');
  for (const out of ['infrastructure BC', 'foundation tasks', 'walking skeleton', 'styleguide gate']) {
    assert.ok(dg.includes(`label="${out}"`), `Preparation fan-out must include "${out}"`);
  }
});

test('Capturing is a BACKLOG HUB with the refine / research / dismiss LOOPS', () => {
  assert.match(dg, /label="quick-capture"/, 'Capturing names the quick-capture intake door');
  assert.match(dg, /label="modeling"[\s\S]*?verb="CAPTURE"/, 'Capturing names the modeling CAPTURE intake door');
  assert.match(dg, /label="backlog"/, 'Capturing has a central backlog hub node');
  assert.match(dg, /verb="REFINE"/, 'Capturing shows the modeling REFINE loop');
  assert.match(dg, /label="research"/, 'Capturing shows the research feed-in');
  assert.match(dg, /verb="DISMISS"/, 'Capturing shows the modeling DISMISS loop');
});

test('Promote & Work is a PIPELINE with the verifier FAIL → ×2 → escalate retry loop', () => {
  assert.match(dg, /verb="PROMOTE"/, 'Promote & Work shows modeling PROMOTE');
  assert.match(dg, /backlog → todo/, 'Promote & Work shows the backlog → todo transition');
  assert.match(dg, /label="work"/, 'Promote & Work names the work skill');
  assert.match(dg, /label="verifier"/, 'the verifier renders as an edge checkpoint');
  assert.match(dg, /FAIL → re-dispatch ×2 → escalate/, 'the FAIL retry loop is shown');
  assert.match(dg, /one task = one commit/, 'Promote & Work states one task = one commit');
});

test('gates / human checks render as edge CHECKPOINTS, never as agent boxes', () => {
  // WCheckpoint is the edge-checkpoint primitive; the verifier / reviewer / human
  // review are checkpoints, NOT WNode boxes.
  assert.match(dg, /function WCheckpoint\(/, 'a dedicated edge-checkpoint primitive must exist');
  // No orchestrator / specialist / research-reviewer agent BOXES (WNode label=...).
  assert.doesNotMatch(dg, /label="orchestrator"/, 'orchestrator must not be a node box');
  assert.doesNotMatch(dg, /label="research-reviewer"/, 'research-reviewer must not be a node box');
  assert.doesNotMatch(dg, /<\$\{WNode\}[^>]*label="verifier"/, 'verifier must be a checkpoint, not a node box');
  assert.doesNotMatch(dg, /<\$\{WNode\}[^>]*label="specialist"/, 'no specialist node box');
});

test('every color / border / fill is a design-system CSS var (light/dark theme tracking)', () => {
  // The diagram primitives must use var(--…) tokens, and must NOT hardcode hex colors.
  assert.match(dg, /var\(--accent-ochre\)/, 'skill nodes tint from the accent token');
  assert.match(dg, /var\(--hairline-strong\)/, 'connectors / artifact borders use a hairline token');
  assert.match(dg, /var\(--obligation\)/, 'the FAIL loop colors from the obligation token');
  assert.doesNotMatch(dg, /#[0-9a-fA-F]{3,8}\b/, 'no hardcoded hex colors — tokens only, for theme tracking');
});

test('the diagrams are read-only and static: no fetch, no write, no motion by default', () => {
  assert.doesNotMatch(dgCode, /fetch\(|\/api\//, 'diagrams perform no fetch (read-only, ADR-0017)');
  assert.doesNotMatch(dgCode, /method:\s*["'](POST|PUT|PATCH|DELETE)["']/i, 'diagrams perform no write');
  // No motion is added; if it ever were, it must sit behind prefers-reduced-motion.
  if (/animation|transition:\s*[^;]*(transform|opacity)/i.test(dgCode)) {
    assert.match(dgCode, /prefers-reduced-motion/, 'any motion must honor prefers-reduced-motion');
  }
});

test('the segment diagram frame keeps role="img" with a descriptive aria-label (real flow)', () => {
  const seg = boardSrc.slice(boardSrc.indexOf('function WorkflowSegment('));
  assert.match(seg, /role="img"/, 'the segment diagram frame stays role="img"');
  assert.match(seg, /aria-label=\$\{diagramLabel\}/, 'the frame uses the passed-in descriptive aria-label');
  // The page passes a real-flow aria-label per segment — never "placeholder".
  const page = boardSrc.slice(boardSrc.indexOf('function WorkflowPage('));
  assert.match(page, /diagramLabel="Preparation flow:/, 'Preparation passes a real-flow aria-label');
  assert.match(page, /diagramLabel="Capturing flow:/, 'Capturing passes a real-flow aria-label');
  assert.match(page, /diagramLabel="Promote and Work flow:/, 'Promote & Work passes a real-flow aria-label');
  assert.doesNotMatch(page, /diagramLabel="[^"]*placeholder/i, 'no aria-label may say "placeholder"');
});
