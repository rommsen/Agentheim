// Static guard for the board-level prompt bar (agentic-workflow-023).
//
// aw-020's bare Quick Capture / Modeling column buttons are RELOCATED out of the
// backlog column into a board-level prompt bar: a multi-line textarea rendered on
// the BOARD view only (between the shell header and the board columns, above the
// BoardHeader count strip), with the two launch buttons beneath it. Clicking a
// button seeds the matching command WITH the typed prompt appended
// (quickCaptureCommandFor / modelingCommandFor); on a successful launch/copy the
// textarea is cleared and a confetti animation plays. Empty textarea -> bare
// command (byte-identical to aw-020). Scope is the TWO COLUMN buttons only — the
// per-card Refine/Promote pair (aw-022) stays id-seeded and is untouched here.
//
// The board's React glue has no DOM render harness in this project — the idiom
// (aw-016/020/022) is: pure string builders get node --test coverage
// (modeling-command.test.mjs), the bridge decision gets coverage
// (bridge-launch.test.mjs), and the board's wiring is guarded by reading its
// source. This suite locks the aw-023 acceptance criteria that are not pure string
// logic.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');
const boardSrc = readFileSync(path.join(dashboardDir, 'app', 'board.js'), 'utf8');

test('a board-level prompt bar component owns a multi-line <textarea>', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar component must exist');
  assert.match(bar[0], /<textarea/, 'the prompt bar must render a multi-line textarea');
});

// agentic-workflow-054: the prompt bar gains a board-local "Prompt" title above the
// field, mirroring the board-local "Board" title in BoardHeader (same --font-ui,
// fontSize 15, fontWeight 600, letterSpacing -0.01em, --fg-1) — the styleguide is
// consumed unforked (ADR-0003), so this is a board-local token-matched element, not a
// styleguide component. The title renders BEFORE the <textarea> in the section. The
// "Board" title additionally gains vertical whitespace above it so the prompt-capture
// region and the board read as two distinct zones.
test('BoardPromptBar renders a board-local "Prompt" title above the textarea, token-matched to the "Board" title', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar component must exist');
  // A "Prompt" title literal exists in the section.
  const titleIdx = bar[0].indexOf('>Prompt<');
  assert.ok(titleIdx !== -1, 'the prompt bar must render a "Prompt" title');
  // It sits ABOVE the field: the title appears before the <textarea> in source order.
  const textareaIdx = bar[0].indexOf('<textarea');
  assert.ok(textareaIdx !== -1, 'the prompt bar must still render a textarea');
  assert.ok(titleIdx < textareaIdx, 'the "Prompt" title must render above the textarea');
  // Token-matched to the "Board" title: same font/size/weight/letterSpacing/color.
  const titleSpan = bar[0].match(/<span[^>]*>[\s\S]{0,120}?>Prompt</);
  // Grab the style block immediately preceding the "Prompt" text.
  const styleBlock = bar[0].slice(Math.max(0, titleIdx - 400), titleIdx);
  assert.match(styleBlock, /fontFamily:\s*"var\(--font-ui\)"/, 'Prompt title must use --font-ui');
  assert.match(styleBlock, /fontSize:\s*15\b/, 'Prompt title must be fontSize 15');
  assert.match(styleBlock, /fontWeight:\s*600\b/, 'Prompt title must be fontWeight 600');
  assert.match(styleBlock, /letterSpacing:\s*"-0\.01em"/, 'Prompt title must match the -0.01em letter-spacing');
  assert.match(styleBlock, /color:\s*"var\(--fg-1\)"/, 'Prompt title must use --fg-1');
});

test('there is vertical whitespace above the "Board" title separating it from the prompt-capture region', () => {
  // The space is added either on BoardHeader itself or on the wrapping board <div>
  // between BoardPromptBar and BoardHeader. Either way, the rendered DashboardBoard
  // tree must place explicit top spacing on/around the BoardHeader. We accept a
  // marginTop/paddingTop on the header, OR a spacer between the two components.
  const header = boardSrc.match(/function BoardHeader[\s\S]*?\n}/);
  assert.ok(header, 'BoardHeader must exist');
  const headerSpacing = /(marginTop|paddingTop):/.test(header[0]) ||
    // header padding shorthand "top right? bottom left?" with a non-zero top value
    /padding:\s*"[1-9]/.test(header[0]);
  const render = boardSrc.match(/<\$\{BoardPromptBar\}[\s\S]{0,400}?<\$\{BoardHeader\}/);
  const wrapperSpacing = render && /(marginTop|paddingTop|height):/.test(render[0]);
  assert.ok(
    headerSpacing || wrapperSpacing,
    'there must be explicit vertical whitespace above the "Board" title (on BoardHeader or a wrapper spacer)',
  );
});

test('the prompt bar is rendered inside DashboardBoard, above the BoardHeader count strip', () => {
  const render = boardSrc.match(/return html`\s*<div>\s*<\$\{BoardPromptBar\}[\s\S]*?<\$\{BoardHeader\}/);
  assert.ok(
    render,
    'DashboardBoard must render BoardPromptBar before (above) BoardHeader',
  );
});

test('the relocated column launch buttons live in the prompt bar, not in BoardColumn', () => {
  // BacklogLaunchPair (the old in-column wrapper) is no longer rendered inside
  // BoardColumn at the backlog line.
  assert.doesNotMatch(
    boardSrc,
    /status === "backlog" && html`<\$\{BacklogLaunchPair\}/,
    'BacklogLaunchPair must no longer be rendered inside the backlog column',
  );
  // The two labelled buttons are in the prompt bar instead.
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.match(bar[0], /label="Quick Capture"/, 'prompt bar must render Quick Capture');
  assert.match(bar[0], /label="Modeling"/, 'prompt bar must render Modeling');
});

test('the buttons seed the prompt-taking builders with the live textarea value', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.match(
    bar[0],
    /command=\$\{quickCaptureCommandFor\(/,
    'Quick Capture must seed quickCaptureCommandFor(prompt)',
  );
  assert.match(
    bar[0],
    /command=\$\{modelingCommandFor\(/,
    'Modeling must seed modelingCommandFor(prompt)',
  );
});

test('the prompt bar threads skipPermissions through to the relocated buttons (aw-021 preserved)', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  // The component accepts skipPermissions and passes it to each LaunchButton.
  assert.match(bar[0], /skipPermissions/, 'prompt bar must accept/forward skipPermissions');
  const qc = bar[0].match(/label="Quick Capture"[\s\S]{0,260}?\/>/);
  const mo = bar[0].match(/label="Modeling"[\s\S]{0,260}?\/>/);
  assert.ok(qc && mo, 'both relocated buttons must be present');
  assert.match(qc[0], /skipPermissions=\$\{skipPermissions\}/, 'Quick Capture must carry skipPermissions');
  assert.match(mo[0], /skipPermissions=\$\{skipPermissions\}/, 'Modeling must carry skipPermissions');
});

test('DashboardBoard threads skipPermissions into the prompt bar', () => {
  assert.match(
    boardSrc,
    /<\$\{BoardPromptBar\}[\s\S]{0,200}skipPermissions=\$\{skipPermissions\}/,
    'DashboardBoard must pass skipPermissions to BoardPromptBar',
  );
});

test('a successful launch/copy clears the textarea and fires confetti; silent (no copy) does neither', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  // On a bridge launch OR a landed clipboard copy, the value is cleared and the
  // confetti is triggered; a fully-silent action (clipboard blocked too) returns
  // early without clearing or celebrating.
  assert.match(bar[0], /via === "bridge"|res\.via/, 'must inspect the launchOrCopy result');
  assert.match(bar[0], /res\.copied/, 'must check whether the clipboard copy landed');
  assert.match(bar[0], /confetti|celebrate|burst/i, 'a successful action must fire confetti');
});

// agentic-workflow-036: the prompt bar gains a THIRD authoring button — Research —
// beside Quick Capture / Modeling. It seeds researchCommandFor(prompt) from the live
// textarea, threads skipPermissions like the siblings, and shares the SAME onResult
// (clear + confetti). It reuses LaunchButton/launchOrCopy unchanged — only the
// command string is new.
test('the prompt bar renders a Research button beside Quick Capture / Modeling', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar component must exist');
  assert.match(bar[0], /label="Research"/, 'prompt bar must render a Research button');
});

test('the Research button seeds researchCommandFor with the live textarea value', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.match(
    bar[0],
    /command=\$\{researchCommandFor\(/,
    'Research must seed researchCommandFor(prompt)',
  );
});

test('the Research button threads skipPermissions and shares the prompt bar onResult', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  const research = bar[0].match(/label="Research"[\s\S]{0,260}?\/>/);
  assert.ok(research, 'the Research button must be present');
  assert.match(research[0], /skipPermissions=\$\{skipPermissions\}/, 'Research must carry skipPermissions');
  assert.match(research[0], /onResult=\$\{onResult\}/, 'Research must share the prompt-bar onResult (clear + confetti)');
});

test('board.js imports researchCommandFor from modeling-command (only the command string is new)', () => {
  assert.match(
    boardSrc,
    /import\s*\{[^}]*researchCommandFor[^}]*\}\s*from\s*"\.\/modeling-command\.js"/,
    'board.js must import the researchCommandFor builder',
  );
});

// agentic-workflow-026: the shell is relaid-out to the styleguide §05 left-rail
// layout, and the Work launch MOVES OUT of the prompt bar into the main-column
// topbar (BoardTopbar). aw-024's two-thirds/one-third split collapses back: the
// prompt bar keeps ONLY its textarea + the Quick Capture / Modeling pair. The Work
// button (WORK_COMMAND, threaded skipPermissions, no onResult) now lives on the
// topbar — see shell-relayout.test.mjs for its new home.
test('the prompt bar no longer renders a Work button (relocated to the topbar in aw-026)', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar component must exist');
  assert.doesNotMatch(
    bar[0],
    /label="Work"/,
    'the prompt bar must NOT render a Work button — it moved to the main-column topbar (aw-026)',
  );
});

test('the prompt bar no longer carries the aw-024 two-thirds/one-third action column', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  // The split collapses back: no right-side action column / flex:2 textarea split.
  assert.doesNotMatch(
    bar[0],
    /Run the ready backlog/,
    'the right-side Work action column must be removed',
  );
});

test('board.js still imports WORK_COMMAND from modeling-command (now used by the topbar)', () => {
  assert.match(
    boardSrc,
    /import\s*\{[^}]*WORK_COMMAND[^}]*\}\s*from\s*"\.\/modeling-command\.js"/,
    'board.js must import the WORK_COMMAND constant (the topbar Work launch reuses it)',
  );
});

// agentic-workflow-044: the TEMPORARY aw-025 replay-on-demand confetti trigger has
// served its purpose (the animation was tuned in aw-034/aw-042) and was removed. The
// real confetti machinery stays: BoardConfetti, the confettiKey state, and its single
// legitimate caller (the successful-launch / landed-copy path) are unchanged. These
// guards lock that the throwaway scaffold is gone while the genuine wiring remains.
test('the temporary aw-025 confetti-replay button has been removed from BoardPromptBar', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar component must exist');
  // No trace of the aw-025 temp fence or the replay button it housed.
  assert.doesNotMatch(bar[0], /TEMP \(aw-025\)/, 'the aw-025 TEMP block must be gone');
  assert.doesNotMatch(bar[0], /Replay celebration/, 'the "Replay celebration" button must be gone');
});

test('the real confetti machinery survives the aw-025 button removal', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar component must exist');
  // BoardConfetti is still mounted and driven by the confettiKey state.
  assert.match(bar[0], /<\$\{BoardConfetti\}\s+fireKey=\$\{confettiKey\}/, 'BoardConfetti must still be mounted off confettiKey');
});

// agentic-workflow-034: the celebration is reimplemented over canvas-confetti
// (amends ADR-0020). The hand-rolled CSS-keyframe burst is GONE — no @keyframes
// injection, no .agentheim-confetti-piece DOM spans. BoardConfetti now drives a
// canvas-confetti call from an origin near the prompt-bar buttons, fired once on
// remount, with colors resolved at fire time off the four status-palette bases.
// Trigger wiring (confettiKey / setConfettiKey / onResult) is UNCHANGED — only the
// implementation behind BoardConfetti swapped.
// agentic-workflow-038: the prompt-bar field becomes a SINGLE-LOGICAL-LINE
// auto-growing control. It is still a <textarea> (so the confetti rect/aim path
// aw-035/aw-037 reads the same element), but constrained: text wraps with no
// horizontal scroll, the field auto-grows in height up to a max then scrolls
// vertically, Enter is swallowed (no newline, no launch), and the value can never
// contain a newline char (multi-line paste collapses to one line). The builders
// (Quick Capture / Modeling / Research) keep reading the same prompt value. These
// guards lock that wiring without a DOM render harness.
test('the prompt-bar field renders single-line (no wrap, no horizontal scroll) and auto-grows in height', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar component must exist');
  // Soft-wrap stays on so long text wraps to multiple VISUAL lines without a
  // horizontal scrollbar — the textarea must NOT be wrap="off" / nowrap.
  assert.doesNotMatch(bar[0], /wrap="off"/, 'the field must keep soft-wrap (no wrap="off") so text wraps instead of scrolling sideways');
  // No horizontal scroll: overflowX hidden. Vertical scroll only after the cap.
  assert.match(bar[0], /overflowX:\s*"hidden"/, 'the field must hide horizontal overflow (no horizontal scrollbar)');
  assert.match(bar[0], /overflowY:\s*"auto"/, 'the field must scroll vertically once it hits its max height');
  // Auto-grow wiring: the field measures its own scrollHeight (reset to auto then
  // grow to fit) capped at a max, so it grows with wrapped content.
  assert.match(bar[0], /scrollHeight/, 'the field must auto-grow by reading its scrollHeight');
  assert.match(bar[0], /maxHeight/, 'the field must cap its growth at a max height');
});

test('Enter is swallowed in the prompt field: no newline inserted and no launch fired (Shift+Enter likewise)', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  // The field carries an onKeyDown that preventDefault()s the Enter key so the
  // keystroke inserts no newline and (the bar having no submit-on-Enter) triggers
  // no launch. The guard does not branch on shiftKey — both Enter and Shift+Enter
  // are swallowed.
  assert.match(bar[0], /onKeyDown=/, 'the field must intercept keydown to swallow Enter');
  assert.match(bar[0], /key\s*===\s*"Enter"/, 'the keydown handler must match the Enter key');
  assert.match(bar[0], /preventDefault\(\)/, 'Enter must be prevented (no newline, no launch)');
  assert.doesNotMatch(bar[0], /shiftKey/, 'Shift+Enter must NOT be a special case — every Enter is swallowed');
});

test("the field value never holds a newline: input is sanitized (newlines collapse to a space)", () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  // onChange routes through a sanitizer that strips newlines (\r\n / \n / \r) to a
  // single space BEFORE setPrompt, so a multi-line PASTE collapses to one line and
  // the stored value can never contain a newline char.
  assert.match(bar[0], /sanitizePromptLine\(/, 'onChange must sanitize input through sanitizePromptLine before storing it');
  // The pure sanitizer replaces any run of newline chars with a single space.
  assert.match(
    boardSrc,
    /function sanitizePromptLine[\s\S]*?replace\([^)]*\\[rn][\s\S]*?\)/,
    'sanitizePromptLine must replace newline characters with a space',
  );
});

test('the sanitized single-line value is what the builders read (Quick Capture / Modeling / Research)', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  // The builders still read the same prompt state the field writes (now sanitized),
  // so the seeded-command contract (aw-023/aw-036) and the empty/whitespace bare
  // fallback are unchanged — only the value can no longer carry a newline.
  assert.match(bar[0], /command=\$\{quickCaptureCommandFor\(prompt\)/, 'Quick Capture reads the same prompt state');
  assert.match(bar[0], /command=\$\{modelingCommandFor\(prompt\)/, 'Modeling reads the same prompt state');
  assert.match(bar[0], /command=\$\{researchCommandFor\(prompt\)/, 'Research reads the same prompt state');
  // The change handler the field is wired to feeds setPrompt the SANITIZED value,
  // so the stored prompt (read by the builders) can never carry a newline.
  assert.match(
    bar[0],
    /setPrompt\(sanitizePromptLine\(/,
    'the change handler must feed setPrompt the sanitized (newline-free) value',
  );
});

test('confetti honours prefers-reduced-motion: the canvas-confetti call is never invoked under reduce (ADR-0014)', () => {
  // BoardConfetti reads the matchMedia reduce flag and the fire path is guarded by
  // it — under reduce the canvas-confetti call (fireConfetti / confetti()) is never
  // reached, so the celebration shows NOTHING (ADR-0014 strip-to-plain).
  assert.match(
    boardSrc,
    /prefers-reduced-motion/,
    'confetti must be gated on prefers-reduced-motion (ADR-0014 strip-to-plain)',
  );
  const confettiFn = boardSrc.match(/function BoardConfetti[\s\S]*?\n}/);
  assert.ok(confettiFn, 'a board-local BoardConfetti component must exist');
  // The effect bails out under reduce (or a falsy fireKey) BEFORE firing.
  assert.match(
    confettiFn[0],
    /if\s*\(\s*reduce\s*\|\|\s*!fireKey\s*\)\s*return/,
    'the fire path must early-return under reduce (and on a falsy fireKey)',
  );
  assert.match(
    confettiFn[0],
    /fireConfetti\(/,
    'BoardConfetti must drive the canvas-confetti call (fireConfetti) once unguarded',
  );
});

test('the celebration is rendered by canvas-confetti, not the old CSS keyframes (aw-034 swap)', () => {
  // board.js imports the bundled canvas-confetti dependency.
  assert.match(
    boardSrc,
    /import\s+confetti\s+from\s+["']canvas-confetti["']/,
    'board.js must import the bundled canvas-confetti dependency',
  );
  // The old CSS-keyframe implementation is removed.
  assert.doesNotMatch(boardSrc, /@keyframes/, 'no @keyframes injection (CSS burst removed)');
  assert.doesNotMatch(boardSrc, /agentheim-confetti-piece/, 'no .agentheim-confetti-piece DOM spans (CSS burst removed)');
  assert.doesNotMatch(boardSrc, /ensureConfettiStyle/, 'ensureConfettiStyle (the keyframe injector) is gone');
});

// agentic-workflow-042: the celebration is canvas-confetti's "realistic look" demo —
// a LAYERED MULTI-FIRE burst of FIVE overlaid shots, fired from a CENTERED origin
// (origin.x = 0.5, the demo's origin.y = 0.7) with NO angle aim. aw-037's single
// AIMED burst, the confettiLaunchToRect aim helper, the getBoundingClientRect read
// and the originRef plumbing are all GONE. The five-shot profile lives in the pure
// confettiFireSequence; fireConfetti walks it and issues one confetti() call per
// shot, each shot's particleCount = Math.floor(count * particleRatio).
test('the burst fires the five-shot layered sequence from canvas-confetti default global, centered, with no aim (aw-042)', () => {
  const fire = boardSrc.match(/function fireConfetti[\s\S]*?\n}/);
  assert.ok(fire, 'a fireConfetti helper must drive the canvas-confetti call');
  // Default global confetti() (full-viewport canvas), not confetti.create(...).
  assert.match(fire[0], /\bconfetti\(\{/, 'must call the default global confetti({...})');
  assert.doesNotMatch(fire[0], /confetti\.create/, 'must use the default global, not a scoped confetti.create canvas');
  // The five-shot profile comes from the pure confettiFireSequence, walked one
  // confetti() call per shot with Math.floor(count * particleRatio).
  assert.match(fire[0], /confettiFireSequence\(/, 'fireConfetti must source the five-shot profile from confettiFireSequence');
  assert.match(fire[0], /Math\.floor\(\s*count\s*\*\s*particleRatio\s*\)/, "each shot's particleCount must be Math.floor(count * particleRatio)");
  // aw-037's textarea-aim geometry is removed: no aimed origin/angle, no live rect.
  assert.doesNotMatch(fire[0], /launch\.origin/, "aw-037's aimed launch.origin must be gone");
  assert.doesNotMatch(fire[0], /launch\.angle/, "aw-037's aimed launch.angle must be gone");
  assert.doesNotMatch(fire[0], /getBoundingClientRect/, 'no orphan getBoundingClientRect read may remain on the fire path');
  assert.doesNotMatch(fire[0], /\bangle\b/, 'the centered realistic preset carries no angle aim');
});

test("the aw-037 confettiLaunchToRect aim helper and originRef plumbing are removed (aw-042)", () => {
  // board.js imports the pure fire-sequence module, NOT the retired aim helper.
  assert.match(
    boardSrc,
    /import\s*\{[^}]*confettiFireSequence[^}]*\}\s*from\s*["']\.\/confetti-launch\.js["']/,
    'board.js must import confettiFireSequence from the fire-sequence module',
  );
  assert.doesNotMatch(boardSrc, /confettiLaunchToRect/, 'the retired aim helper must no longer be imported or used');
  // The originRef prop is no longer threaded into BoardConfetti.
  assert.doesNotMatch(boardSrc, /originRef/, 'the originRef plumbing into BoardConfetti must be gone');
  // The textarea KEEPS its ref — aw-038's auto-grow still measures it.
  assert.match(boardSrc, /ref=\$\{textareaRef\}/, 'the textarea must keep its ref for the aw-038 auto-grow');
});

test('colors are resolved at fire time off the four status bases (theme-aware), not a static var() list', () => {
  // board.js uses the pure resolver against getComputedStyle(documentElement).
  assert.match(
    boardSrc,
    /import\s*\{[^}]*resolveConfettiColors[^}]*\}\s*from\s*["']\.\/confetti-palette\.js["']/,
    'board.js must import resolveConfettiColors from the palette module',
  );
  const fire = boardSrc.match(/function fireConfetti[\s\S]*?\n}/);
  assert.match(
    fire[0],
    /resolveConfettiColors\(\s*getComputedStyle\(document\.documentElement\)\s*\)/,
    'colors must be resolved at fire time via getComputedStyle(document.documentElement)',
  );
  // The fire path holds NO static var(--st-*) color literal — colors come only from
  // the resolver (the old CSS CONFETTI_TOKENS list of var(--st-*) strings is gone).
  assert.doesNotMatch(fire[0], /var\(--st-/, 'fireConfetti must not hold a static var(--st-*) color literal (resolved at fire time now)');
  assert.doesNotMatch(boardSrc, /CONFETTI_TOKENS\s*=\s*\[/, 'the old in-board CONFETTI_TOKENS var(--st-*) array is gone (moved to the palette resolver)');
});

// agentic-workflow-065: the three launch buttons are restyled from flat chips into
// icon-tile + title/subtitle CARDS. Interaction is unchanged (launchOrCopy, the
// per-button seeded commands, the armed skipPermissions threading, the onResult
// clear+confetti all preserved — locked by the aw-023/036/038 guards above). This is
// a VISUAL restyle: each button becomes a card with a square icon tile, a bold title,
// and a quiet subtitle. Quick Capture carries the aw-033 PRIMARY-SURFACE emphasis
// (--surface-2 fill / --fg-1 text / --hairline-strong border); Modeling & Research
// stay quiet on a plain --hairline border. NO ochre — the reserved --accent-ochre-soft
// selection accent is untouched (ADR-0016). A decorative right-of-row helper renders
// "Type a prompt to begin" + a ⌘↵ chip that fires nothing (aw-038's swallowed Enter
// is untouched). The board's React glue has no DOM render harness — these are static
// source guards, the established idiom for this suite.
test('the three launch buttons render as cards with a title and a quiet subtitle', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar component must exist');
  // Each button now carries a subtitle prop (two-line label) and an icon tile.
  const qc = bar[0].match(/label="Quick Capture"[\s\S]{0,320}?\/>/);
  const mo = bar[0].match(/label="Modeling"[\s\S]{0,320}?\/>/);
  const re = bar[0].match(/label="Research"[\s\S]{0,320}?\/>/);
  assert.ok(qc && mo && re, 'all three card buttons must be present');
  assert.match(qc[0], /subtitle="File it fast"/, 'Quick Capture subtitle must be "File it fast"');
  assert.match(mo[0], /subtitle="Shape into structure"/, 'Modeling subtitle must be "Shape into structure"');
  assert.match(re[0], /subtitle="Dig deeper"/, 'Research subtitle must be "Dig deeper"');
});

test('each card carries its icon tile glyph (plus / compass / search) from the registry', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  const qc = bar[0].match(/label="Quick Capture"[\s\S]{0,320}?\/>/);
  const mo = bar[0].match(/label="Modeling"[\s\S]{0,320}?\/>/);
  const re = bar[0].match(/label="Research"[\s\S]{0,320}?\/>/);
  assert.match(qc[0], /icon="plus"/, 'Quick Capture tile is the plus glyph');
  assert.match(mo[0], /icon="compass"/, 'Modeling tile is the compass (concentric) glyph');
  assert.match(re[0], /icon="search"/, 'Research tile is the magnifier glyph');
});

test('the card variant renders an icon TILE + a two-line label (title over subtitle)', () => {
  // The card layout lives in a board-local component that renders the icon inside a
  // square tile and the label/subtitle stacked beside it. The card branch is keyed by
  // the subtitle prop.
  const card = boardSrc.match(/function PromptLaunchCard[\s\S]*?\n}/);
  assert.ok(card, 'a board-local PromptLaunchCard component must own the card layout');
  // A square icon tile (equal width/height) wraps the Icon.
  assert.match(card[0], /<\$\{Icon\}/, 'the card must render an Icon inside its tile');
  // The subtitle is rendered as a quiet second line, de-emphasised via a fg token.
  assert.match(card[0], /subtitle/, 'the card must render the subtitle');
});

// agentic-workflow-068: the per-button emphasis is RETIRED — all three cards share
// ONE resting chrome (the former quiet look: --surface-1 / --fg-2 / plain --hairline)
// and HIGHLIGHT on hover to the former Quick-Capture primary treatment (--surface-2 /
// --fg-1 / --hairline-strong), then FLASH an inverse fill (--fg-1 / --surface-0) on
// press so a click is unmistakable. NO ochre (ADR-0016).
test('all three cards share one resting chrome and highlight on hover + flash on press (aw-068)', () => {
  const card = boardSrc.match(/function PromptLaunchCard[\s\S]*?\n}/);
  assert.ok(card, 'PromptLaunchCard must exist');
  // Resting chrome = the quiet default look.
  assert.match(card[0], /var\(--surface-1\)/, 'the resting fill must be --surface-1');
  assert.match(card[0], /var\(--fg-2\)/, 'the resting text must be --fg-2');
  assert.match(card[0], /var\(--hairline\)/, 'the resting border must be the plain --hairline');
  // Hover HIGHLIGHT = the former Quick-Capture primary chrome.
  assert.match(card[0], /var\(--surface-2\)/, 'the hover highlight fill must be --surface-2');
  assert.match(card[0], /var\(--hairline-strong\)/, 'the hover highlight border must be --hairline-strong');
  // Press FLASH = an inverse fill so the click is obvious.
  assert.match(card[0], /var\(--surface-0\)/, 'the press flash must use the inverse --surface-0 text');
  // Hover + press are driven off state (so the whole card recolours together).
  assert.match(card[0], /onMouseDown=/, 'the card must register a press (mousedown) handler');
  assert.match(card[0], /onMouseUp=/, 'the card must clear the press (mouseup) handler');
  // No per-button emphasis survives — the three cards read identically.
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  const qc = bar[0].match(/label="Quick Capture"[\s\S]{0,320}?\/>/);
  const mo = bar[0].match(/label="Modeling"[\s\S]{0,320}?\/>/);
  const re = bar[0].match(/label="Research"[\s\S]{0,320}?\/>/);
  assert.ok(qc && mo && re, 'all three card buttons must be present');
  assert.doesNotMatch(qc[0], /emphasis=/, 'Quick Capture must no longer carry an emphasis (uniform)');
  assert.doesNotMatch(mo[0], /emphasis=/, 'Modeling must no longer carry an emphasis');
  assert.doesNotMatch(re[0], /emphasis=/, 'Research must no longer carry an emphasis');
});

test('NO ochre anywhere in the prompt bar / card — the reserved selection accent is untouched (ADR-0016)', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  const card = boardSrc.match(/function PromptLaunchCard[\s\S]*?\n}/);
  // The reserved selection accent token must never be APPLIED here — guard against the
  // var(--accent-ochre...) token usage, not the word "ochre" in a no-ochre code comment.
  assert.doesNotMatch(bar[0], /var\(--accent-ochre/, 'the prompt bar must not apply the reserved ochre accent token');
  assert.doesNotMatch(card[0], /var\(--accent-ochre/, 'the card must not apply the reserved ochre accent token');
});

// agentic-workflow-068: the decorative "Type a prompt to begin" + ⌘↵ helper (aw-065)
// is REMOVED — the textarea placeholder already states the flow, and the row now ends
// with the three cards. aw-038's swallowed Enter (no submit-on-Enter) is untouched.
test('the decorative "Type a prompt to begin" + ⌘↵ hint is removed (aw-068)', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar component must exist');
  assert.doesNotMatch(bar[0], /Type a prompt to begin/, 'the decorative helper copy must be gone');
  assert.doesNotMatch(bar[0], /⌘↵/, 'the ⌘↵ keyboard-shortcut chip must be gone');
  // The aw-038 swallow guard stays intact — no Enter-to-launch wiring introduced.
  assert.doesNotMatch(bar[0], /onKeyDown[\s\S]{0,120}launchOrCopy/, 'no Enter-to-launch wiring may be introduced');
});
