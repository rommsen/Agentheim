// Static guard for the board card's hover-revealed red trash-can dismiss affordance
// (agentic-workflow-048).
//
// The board's React glue has no DOM render harness in this project — the established
// idiom (aw-016/020/022/023/024/026/028/049) is: the pure command string gets
// node --test coverage (dismissCommandFor in modeling-command.test.mjs), the bridge
// decision is already covered (bridge-launch.test.mjs), and the board's wiring is
// guarded by reading its source. This suite locks the aw-048 acceptance criteria
// that are NOT pure string logic:
//   - backlog AND todo cards render a board-local top-right trash-can OVERLAY
//     (a sibling of the styleguide TicketCard, NOT its cornerAction slot);
//   - doing / done cards never render it (backlog/todo only);
//   - the trash uses the shared Icon name="trash-2" (ds-017) tinted with the
//     --obligation danger token (ADR-0016), consumed unforked;
//   - the button is hidden (opacity 0) until card hover OR its own focus, and
//     highlights on its own hover;
//   - clicking opens the shared styleguide ConfirmDialog (ds-018) with
//     destructive=true, naming the card, consumed unforked (no styleguide edit);
//   - confirm fires dismissCommandFor(id) via launchOrCopy; cancel (onClose) closes
//     with no effect;
//   - the dialog body conveys the agent's cascade dismiss (lists + re-confirms the
//     full set in the spawned session);
//   - the click is propagation-isolated so dismissing never opens the slide-over;
//   - the trash THREADS the armed skipPermissions signal (aw-051) from the shared
//     skip-permissions-state store, exactly like the launch buttons — posting
//     skipPermissions only when armed, omitting it otherwise (strict-`true` contract).
//
// Reading source is deliberately blunt, but it catches the regression classes this
// task cares about without standing up a React+DOM test rig the project doesn't have.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { launchOrCopy } from '../app/bridge-launch.js';
import { dismissCommandFor } from '../app/modeling-command.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');
const boardSrc = readFileSync(path.join(dashboardDir, 'app', 'board.js'), 'utf8');

// A scriptable fetch that records the /run POST, mirroring bridge-launch.test.mjs.
function makeFetch(routes) {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url: String(url), opts });
    for (const [needle, responder] of routes) {
      if (String(url).includes(needle)) return responder(url, opts);
    }
    throw new Error(`unrouted fetch: ${url}`);
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}
function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}
function makeCopy(result = true) {
  const copied = [];
  const copy = async (text) => { copied.push(text); return result; };
  copy.copied = copied;
  return copy;
}

function fn(name) {
  const m = boardSrc.match(new RegExp(`function ${name}\\b[\\s\\S]*?\\n}`));
  assert.ok(m, `${name} must exist in board.js`);
  return m[0];
}

test('the board imports ConfirmDialog from the styleguide (ds-018), consumed unforked', () => {
  assert.match(
    boardSrc,
    /import\s*\{[^}]*ConfirmDialog[^}]*\}\s*from\s*"[^"]*styleguide\/app\/confirm-dialog\.js"/,
    'board.js must import ConfirmDialog from the styleguide confirm-dialog.js (ADR-0003)',
  );
});

test('the board imports dismissCommandFor from the pure modeling-command module', () => {
  assert.match(
    boardSrc,
    /import\s*\{[^}]*dismissCommandFor[^}]*\}\s*from\s*"\.\/modeling-command\.js"/,
    'dismissCommandFor must come from the pure modeling-command module',
  );
});

test('a board-local trash-can component renders the shared trash-2 glyph tinted --obligation', () => {
  // The trash button is board-local (the styleguide TicketCard exposes no top-right
  // slot), but the GLYPH is the shared Icon name="trash-2" (ds-017), tinted with the
  // --obligation danger token (ADR-0016), never the reserved ochre accent.
  const card = fn('CardTrashCan');
  assert.match(card, /name="trash-2"/, 'the trash button must use the shared Icon name="trash-2" (ds-017)');
  assert.match(card, /var\(--obligation\)/, 'the trash glyph must be tinted with the --obligation danger token (ADR-0016)');
  assert.doesNotMatch(card, /accent-ochre-soft/, 'danger must NOT use the reserved selection accent (ADR-0016)');
});

test('the trash button is hidden until card hover OR its own focus (opacity-driven reveal)', () => {
  // The button is always in the DOM at opacity 0 and transitions to opacity 1 on host
  // hover or its own keyboard focus, so it is keyboard-reachable without a pointer.
  assert.match(boardSrc, /opacity/, 'the trash reveal must be opacity-driven (hidden by default)');
  // Focus-driven reveal: a focus handler raises the button so it is keyboard-reachable.
  assert.match(boardSrc, /onFocus=/, 'the trash button must reveal on its own focus (keyboard reach)');
});

test('only backlog and todo cards render the trash overlay; doing/done never do', () => {
  // The BoardCard gates the trash on the lifecycle status — backlog OR todo only.
  const card = fn('BoardCard');
  assert.match(
    card,
    /status === "backlog" \|\| status === "todo"/,
    'the trash overlay must be gated to backlog/todo cards only (doing/done never show it)',
  );
});

test('clicking the trash opens the shared ConfirmDialog with destructive=true, naming the card', () => {
  assert.match(boardSrc, /<\$\{ConfirmDialog\}/, 'the card must render the shared ConfirmDialog');
  const dialog = boardSrc.match(/<\$\{ConfirmDialog\}[\s\S]*?\/>|<\$\{ConfirmDialog\}[\s\S]*?<\/\$\{ConfirmDialog\}>|<\$\{ConfirmDialog\}[\s\S]*?<\/\/>/);
  assert.ok(dialog, 'ConfirmDialog usage not found');
  assert.match(dialog[0], /destructive=\$\{true\}|destructive=\{true\}|destructive=true/, 'the dialog must be destructive=true');
  // The title names this card (interpolates the ticket title/id).
  assert.match(dialog[0], /Dismiss/, 'the dialog title must name a dismiss of this card');
});

test('confirming fires dismissCommandFor(id) via launchOrCopy; cancelling closes with no effect', () => {
  // The dialog's onConfirm seeds the dismiss command for this card and runs it through
  // the existing launchOrCopy bridge path; onClose just closes the dialog.
  assert.match(boardSrc, /dismissCommandFor\(/, 'confirm must seed dismissCommandFor(id)');
  assert.match(boardSrc, /launchOrCopy\(/, 'dismiss must fire through the existing launchOrCopy bridge path');
});

test('the dialog body conveys the agent runs the cascade dismiss (lists + re-confirms the full set)', () => {
  // ADR-0022: the board card can only name the card it sits on, so the body must make
  // clear the spawned session lists + re-confirms the FULL cascade set before deleting.
  assert.match(boardSrc, /cascade|dependent|re-?confirm|full set|everything queued/i,
    'the dialog body must convey the agent\'s cascade dismiss + in-session re-confirmation (ADR-0022)');
});

test('the trash click is propagation-isolated so dismissing never opens the slide-over', () => {
  // The trash button (and the dialog) stop propagation so the click never bubbles to
  // the card onClick (which opens the slide-over).
  assert.match(boardSrc, /stopPropagation/, 'the trash affordance must stop propagation (never open the slide-over)');
});

test('the trash THREADS the armed skipPermissions signal into launchOrCopy (aw-051)', () => {
  // aw-051 reverses aw-048: the dismiss now honours the armed toggle like every other
  // launch. The launchOrCopy call inside the dismiss fire must pass skipPermissions,
  // and it must be guarded by the strict-`true` check (skipPermissions === true) so the
  // OFF path stays byte-identical (the bridge POST omits the field unless armed, per the
  // strict-`true` contract in amended ADR-0018).
  const card = fn('CardTrashCan');
  const launch = card.match(/launchOrCopy\(\{[\s\S]*?\}\)/);
  assert.ok(launch, 'CardTrashCan must call launchOrCopy');
  assert.match(launch[0], /skipPermissions:\s*skipPermissions === true/,
    'the dismiss launchOrCopy must thread the armed skipPermissions via the strict-`true` check (aw-051)');
});

test('CardTrashCan reads the armed signal via a prop, not a second source of truth', () => {
  // The armed value must arrive as the `skipPermissions` prop threaded down from
  // DashboardApp (the single skip-permissions-state store), NOT re-read from localStorage
  // or probed off /api/bridge inside the component (one source of truth, ADR-0019).
  const card = fn('CardTrashCan');
  assert.match(card, /function CardTrashCan\(\{[^}]*skipPermissions[^}]*\}\)/,
    'CardTrashCan must accept skipPermissions as a prop (single store, no second source)');
  assert.doesNotMatch(card, /loadSkipPermissions|localStorage|\/api\/bridge/,
    'CardTrashCan must not re-read the armed state or probe the bridge on render (ADR-0017/0019)');
});

test('BoardCard threads its skipPermissions prop down into the CardTrashCan', () => {
  // The armed flag flows DashboardApp -> DashboardBoard -> BoardColumn -> BoardCard ->
  // CardTrashCan, the same chain the launch buttons ride.
  const card = fn('BoardCard');
  assert.match(card, /<\$\{CardTrashCan\}[^>]*skipPermissions=\$\{skipPermissions\}/,
    'BoardCard must thread skipPermissions into CardTrashCan');
});

// ---- dismiss bridge body shape, both armed states (aw-051) ------------------
// The dismiss fires `launchOrCopy({ prompt: dismissCommandFor(id), ..., skipPermissions:
// skipPermissions === true })`. These drive the REAL launchOrCopy with the REAL dismiss
// command to lock the exact POST /run body for a dismiss in each armed state.

test('ARMED dismiss -> POST /run body is { prompt: dismiss-command, skipPermissions:true }', async () => {
  let runCall = null;
  const fetchImpl = makeFetch([
    ['/api/bridge', () => jsonResponse(200, { port: 31440, token: 't', v: 1 })],
    ['/health', () => jsonResponse(200, { ok: true })],
    ['/run', (url, opts) => { runCall = { url, opts }; return jsonResponse(202, { ok: true }); }],
  ]);
  const armed = true;
  const result = await launchOrCopy({
    prompt: dismissCommandFor('agentic-workflow-051'),
    fetchImpl, copy: makeCopy(), skipPermissions: armed === true,
  });
  assert.equal(result.via, 'bridge');
  assert.deepEqual(JSON.parse(runCall.opts.body), {
    prompt: '/agentheim:modeling dismiss agentic-workflow-051',
    skipPermissions: true,
  });
});

test('UNARMED dismiss -> POST /run body OMITS skipPermissions (byte-identical to aw-048)', async () => {
  let runCall = null;
  const fetchImpl = makeFetch([
    ['/api/bridge', () => jsonResponse(200, { port: 31441, token: 't', v: 1 })],
    ['/health', () => jsonResponse(200, { ok: true })],
    ['/run', (url, opts) => { runCall = { url, opts }; return jsonResponse(202, { ok: true }); }],
  ]);
  const armed = false;
  await launchOrCopy({
    prompt: dismissCommandFor('agentic-workflow-051'),
    fetchImpl, copy: makeCopy(), skipPermissions: armed === true,
  });
  const body = JSON.parse(runCall.opts.body);
  assert.deepEqual(body, { prompt: '/agentheim:modeling dismiss agentic-workflow-051' });
  assert.equal('skipPermissions' in body, false, 'OFF dismiss must OMIT the field, never send false');
});

test('ARMED dismiss with NO bridge -> clipboard fallback carries NO bypass (startup-only)', async () => {
  // --dangerously-skip-permissions is startup-only; the clipboard pastes the slash
  // command into a RUNNING session, so the fallback never carries the bypass even armed.
  const fetchImpl = makeFetch([
    ['/api/bridge', () => jsonResponse(200, { present: false })],
  ]);
  const copy = makeCopy();
  const cmd = dismissCommandFor('agentic-workflow-051');
  const result = await launchOrCopy({ prompt: cmd, fetchImpl, copy, skipPermissions: true });
  assert.notEqual(result.via, 'bridge');
  assert.deepEqual(copy.copied, [cmd], 'the fallback copies exactly the dismiss command, no bypass marker');
});

test('the styleguide TicketCard is consumed unforked — no new prop is added for placement', () => {
  // The trash is a board-local overlay (a sibling of the card in a relative host),
  // NOT a new TicketCard prop. The card is still rendered with its existing props.
  assert.match(boardSrc, /<\$\{TicketCard\}/, 'the board still renders the styleguide TicketCard');
  // The overlay host wraps the card with position: relative so the absolutely-
  // positioned trash sits at the host's top-right (outside the card overflow).
  assert.match(boardSrc, /position:\s*"relative"/, 'the board must wrap the card in a position: relative host for the overlay');
});
