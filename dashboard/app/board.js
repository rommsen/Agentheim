/* ============================================================
   Agentheim — dashboard board view (agentic-workflow-006)

   The dashboard's home view: the FLAT Kanban board rendered over
   live project data. It fetches the read projection (/api/tree,
   aw-005), pools every bounded context's tasks into the four
   lifecycle columns (board-data.treeToColumns), and renders them
   through the APPROVED styleguide components imported from the
   design-system single source (ADR-0003) — Column / TicketCard /
   ColumnHeader / EmptyColumn — AS-IS, no fork, no new pattern.

   Clicking a card emits an "open this task" intent (onOpen(ticket))
   the slide-over (aw-007) consumes. The shell below (DashboardApp)
   lays out the styleguide §05 left-rail chrome (aw-026): a full-height
   ShellRail (brand → Board → the live Workspace tree → a footer with
   the theme + skip-permissions toggles) beside a main column (a topbar
   carrying the Work launch over this scrollable board).

   The board is READ-ONLY (ADR-0017): it never writes lifecycle
   state. The dashboard has no write path at all — skills (`modeling`
   / `work`) are the sole owners of task-lifecycle transitions. The
   board's single interactivity concern is staying current:
   - LIVE-UPDATE: the board subscribes to the SSE stream (GET
     /api/events) via createLiveUpdate; every tree-changed frame
     (or reconnect) just RE-FETCHES /api/tree and re-projects — the
     raw event is never interpreted as a transition. As skills move
     files on disk, the board reflects it within a frame.
   ============================================================ */
import { useState, useEffect, useCallback, useRef } from "react";

// Styleguide single source (ADR-0003): import the approved Kanban components
// across the BC boundary. They are CONSUMED, never copied — the design-system
// styleguide remains the one source of UI truth, the dashboard is a consumer.
import confetti from "canvas-confetti";

import { html } from "../../.agentheim/contexts/design-system/styleguide/app/html.js";
import { ColumnHeader, TicketCard } from "../../.agentheim/contexts/design-system/styleguide/app/kanban.js";
import { EmptyColumn } from "../../.agentheim/contexts/design-system/styleguide/app/empty.js";
import { Icon } from "../../.agentheim/contexts/design-system/styleguide/app/icons.js";
import { Glyph, ThemeCtx } from "../../.agentheim/contexts/design-system/styleguide/app/foundations.js";
import { RailItem, TreeGroup } from "../../.agentheim/contexts/design-system/styleguide/app/library.js";
import { Collapsible } from "../../.agentheim/contexts/design-system/styleguide/app/collapsible.js";
import { ThemeToggle } from "../../.agentheim/contexts/design-system/styleguide/app/live.js";

import { COLUMN_ORDER, treeToColumns } from "./board-data.js";
import { resolveTheme, saveTheme } from "./theme-state.js";
import { loadSkipPermissions, saveSkipPermissions } from "./skip-permissions-state.js";
import { SORT_OPTIONS, DEFAULT_SORT, sortTickets } from "./board-sort.js";
import { refineCommandFor, promoteCommandFor, quickCaptureCommandFor, modelingCommandFor, WORK_COMMAND, STOP_DASHBOARD_COMMAND } from "./modeling-command.js";
import { launchOrCopy } from "./bridge-launch.js";
import { groupTickets } from "./board-group.js";
import { loadViewState, saveViewState, defaultColumnState } from "./board-view-state.js";
import { SlideOver } from "./slide-over.js";
import { MainPaneReader } from "./main-pane-reader.js";
import { treeToLibrary } from "./library-data.js";
import { resolveConfettiColors } from "./confetti-palette.js";
import { isTaskIntent } from "./intent-route.js";
import { createLiveUpdate } from "./live-update.js";

/**
 * React hook: subscribe to the SSE live-update stream and call `onResync` on
 * connect and every tree-changed frame. The board passes a /api/tree re-fetch;
 * the consumer never interprets the raw event (ADR-0001). `onResync` is held in a
 * ref so the subscription is established ONCE, not re-built on every render.
 */
function useLiveTree(onResync) {
  const cb = useRef(onResync);
  cb.current = onResync;
  useEffect(() => {
    if (typeof EventSource === "undefined") return undefined;
    const live = createLiveUpdate({ onResync: (evt) => cb.current && cb.current(evt) });
    return () => live.close();
  }, []);
}

const EMPTY_COLUMNS = (() => {
  const c = {};
  for (const k of COLUMN_ORDER) c[k] = [];
  return c;
})();

// A quiet board header strip — sized off the styleguide tokens, no new pattern.
function BoardHeader({ count }) {
  return html`
    <header style=${{
      display: "flex", alignItems: "center", gap: 12,
      padding: "0 4px 18px",
    }}>
      <span style=${{
        fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 600,
        letterSpacing: "-0.01em", color: "var(--fg-1)",
      }}>Board</span>
      <span style=${{
        fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-3)",
        fontFeatureSettings: '"tnum"',
      }}>${count} ${count === 1 ? "task" : "tasks"}</span>
    </header>`;
}

function LoadState({ children }) {
  return html`
    <div style=${{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 10, padding: "80px 16px",
      fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--fg-3)",
    }}>${children}</div>`;
}

// The per-column sort control. A board-only affordance rendered as a SIBLING of
// the styleguide ColumnHeader (the board composes the styleguide sub-components and
// adds its own controls beside them): the styleguide kanban.js is consumed
// unmodified, never forked (ADR-0003). A plain native <select> styled off the
// design-system tokens —
// no new styleguide pattern. Changing it lifts the column's choice into board
// view-state via onChange; it never reorders anything itself (the pure
// board-sort.sortTickets does that, board-side, after the projection).
function ColumnSortControl({ status, value, onChange }) {
  return html`
    <label style=${{
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      <span style=${{
        fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--fg-4)",
      }}>Sort</span>
      <select
        aria-label=${`Sort ${status} column`}
        value=${value}
        onChange=${(e) => onChange(e.target.value)}
        className="focusable"
        style=${{
          fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--fg-2)",
          background: "var(--surface-1)", border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-sm)", padding: "3px 6px", cursor: "pointer",
        }}>
        ${SORT_OPTIONS.map((o) => html`<option key=${o.value} value=${o.value}>${o.label}</option>`)}
      </select>
    </label>`;
}

// The per-column group-by-BC toggle (aw-014). A board-only affordance, SIBLING of
// the sort control — same precedent: the styleguide kanban.js is consumed
// unmodified (ADR-0003), the control is native and token-styled, no new styleguide
// pattern. Flipping it lifts the column's grouped choice into persisted board
// view-state; the pure board-group.groupTickets does the partitioning at render
// time, so a live re-projection re-applies the choice rather than resetting it.
function ColumnGroupToggle({ status, grouped, onToggle }) {
  return html`
    <button
      type="button"
      className="focusable"
      aria-pressed=${grouped}
      aria-label=${`Group ${status} column by bounded context`}
      onClick=${() => onToggle(!grouped)}
      style=${{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontFamily: "var(--font-ui)", fontSize: 11.5,
        color: grouped ? "var(--fg-1)" : "var(--fg-2)",
        background: grouped ? "var(--surface-2)" : "var(--surface-1)",
        border: `1px solid ${grouped ? "var(--hairline-strong)" : "var(--hairline)"}`,
        borderRadius: "var(--radius-sm)", padding: "3px 7px", cursor: "pointer",
        transition: "background var(--duration-fast) var(--ease-base)",
      }}>
      <${Icon} name="box" size=${12.5} color=${grouped ? "var(--fg-1)" : "var(--fg-3)"} />
      <span>Group</span>
    </button>`;
}

// The board-only control strip beneath the styleguide ColumnHeader: sort + group,
// laid out as siblings. Both are board view-state affordances; neither forks the
// styleguide (ADR-0003).
function ColumnControls({ status, sort, onSortChange, grouped, onGroupToggle }) {
  return html`
    <div style=${{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      padding: "0 4px 12px", marginTop: -4,
    }}>
      <${ColumnSortControl} status=${status} value=${sort} onChange=${onSortChange} />
      <${ColumnGroupToggle} status=${status} grouped=${grouped} onToggle=${onGroupToggle} />
    </div>`;
}

// Write `text` to the system clipboard with a graceful, no-throw fallback. The
// board's copy affordance is a convenience — a blocked/absent clipboard API (no
// secure context, denied permission, an old browser) must NEVER crash the board
// or surface an error (aw-016 AC). Returns a Promise<boolean> that resolves to
// whether the write succeeded; the caller only uses it for the transient
// "copied" feedback, so a false (or a rejection swallowed here) just means no
// feedback flashes — never a thrown error.
function copyToClipboard(text) {
  try {
    const clip = typeof navigator !== "undefined" ? navigator.clipboard : null;
    if (clip && typeof clip.writeText === "function") {
      return clip.writeText(text).then(() => true, () => false);
    }
  } catch {
    // navigator access itself threw (exotic sandbox) — fall through.
  }
  return Promise.resolve(false);
}

// A backlog LAUNCH button (agentic-workflow-020, extended aw-022). Clicking it
// tries to open a REAL, interactive Claude session seeded with `command` through
// the VS Code bridge (ADR-0018); if the bridge is unavailable for ANY reason — not
// in VS Code's Simple Browser, listener unreachable, timeout, CORS rejection — it
// SILENTLY falls back to copying `command` to the clipboard (the aw-016 behavior),
// flashing the same quiet "Copied" feedback. The whole try-bridge-then-copy
// decision is the pure `launchOrCopy` (bridge-launch.js); this is thin glue that
// supplies window.fetch + the no-throw copyToClipboard and renders the feedback.
// The board stays a projection of disk (ADR-0001): launching is an external
// side-effect, never a lifecycle write.
//
// `emphasis` (aw-022): "default" (the column pair's look) | "primary" (filled,
// emphasised — the expected card default) | "quiet" (text-weight, de-emphasised —
// the rarer/committing card action). All three stay within the styleguide's
// quiet-by-default law: token-styled, no new hue (the flash is the existing
// --st-done). When this button sits inside the styleguide card's cornerAction slot
// (aw-022) the slot already stops propagation; `isolateClick` adds a defensive
// stopPropagation here too so a future change to that wrapper can't re-open the
// card from this button (mirrors CopyCommandButton's belt-and-suspenders).
// `skipPermissions` (aw-021): when ARMED (true), each launch threads
// `skipPermissions: true` into launchOrCopy so the bridge seeds
// `claude --dangerously-skip-permissions`. When armed, the button ALSO carries an
// at-a-glance per-launch DANGER indicator (a "skips permissions" cue) so the
// conscious moment is each launch, not the one-time arm (amended ADR-0018). The
// indicator reflects the armed TOGGLE state, not a live bridge probe — it never
// probes /api/bridge on render (that would break the silent-absence contract and
// add a probe to every paint); it signals armed INTENT.
// `onResult` (aw-023): an optional callback invoked with the `launchOrCopy`
// resolution ({ via: "bridge" } | { via: "clipboard", copied }) AFTER the button's
// own quiet flash is scheduled. The board prompt bar uses it to clear its textarea
// and fire confetti only on a successful launch/landed-copy; a fully-silent action
// (clipboard blocked too) passes { via: "clipboard", copied: false } so the caller
// can stay silent. Default no-op keeps every existing caller (column pair, per-card
// pair) unchanged.
function LaunchButton({ label, command, icon, emphasis = "default", isolateClick = false, skipPermissions = false, onResult }) {
  // feedback: "idle" | "launched" | "copied". A transient label/colour swap, same
  // quiet treatment as CopyCommandButton — never an error state (absence is normal).
  const [feedback, setFeedback] = useState("idle");
  const timer = useRef(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onClick = useCallback((e) => {
    if (isolateClick && e && typeof e.stopPropagation === "function") e.stopPropagation();
    const fetchImpl = typeof window !== "undefined" && typeof window.fetch === "function"
      ? window.fetch.bind(window)
      : undefined;
    launchOrCopy({ prompt: command, fetchImpl, copy: copyToClipboard, skipPermissions: skipPermissions === true }).then((res) => {
      // Bridge launched -> a real terminal opened (flash "Launched"). Bridge absent
      // -> the command was copied (flash "Copied" only if the copy actually landed,
      // matching CopyCommandButton's quiet contract). Either way: never an error.
      // Hand the raw result to any onResult listener first (aw-023's prompt bar
      // clears + celebrates off it) — the button's own flash is unchanged.
      if (typeof onResult === "function") onResult(res);
      if (res.via === "bridge") setFeedback("launched");
      else if (res.copied) setFeedback("copied");
      else return; // clipboard blocked too — stay silent.
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setFeedback("idle"), 1100);
    });
  }, [command, isolateClick, skipPermissions, onResult]);

  const flashed = feedback !== "idle";
  const labelText = feedback === "launched" ? "Launched" : feedback === "copied" ? "Copied" : label;
  const primary = emphasis === "primary";
  const quiet = emphasis === "quiet";
  // `inverse` (aw-026): the §05 "New ticket" look — a FILLED inverse button
  // (background + border var(--fg-1), text var(--surface-0)). It is the topbar's
  // primary action (the Work launch); the styleguide section-05 BoardTopbar uses
  // exactly this treatment. Consumed by emphasis, not forked from the styleguide.
  const inverse = emphasis === "inverse";
  // Idle treatment by emphasis (all token-styled, no new hue):
  //   inverse -> filled --fg-1 + --surface-0 text (the §05 topbar action);
  //   primary -> filled surface-2 + stronger hairline + fg-1 (draws the eye);
  //   quiet   -> transparent, no border, fg-3 (recedes — text-weight);
  //   default -> the column pair's bordered surface-1 chip.
  const idleColor = inverse ? "var(--surface-0)" : primary ? "var(--fg-1)" : quiet ? "var(--fg-3)" : "var(--fg-2)";
  const idleBg = inverse ? "var(--fg-1)" : primary ? "var(--surface-2)" : quiet ? "transparent" : "var(--surface-1)";
  const idleBorder = inverse ? "1px solid var(--fg-1)" : quiet ? "1px solid transparent" : `1px solid ${primary ? "var(--hairline-strong)" : "var(--hairline)"}`;
  // ARMED per-launch indicator (aw-021, narrowed by aw-030; amended ADR-0019).
  // When the toggle is on, each launch button carries ONLY a small "skips
  // permissions" dot — the at-a-glance per-launch cue mandated by amended
  // ADR-0018. aw-030 toned the cue DOWN from the original button-wide red
  // (--obligation border + label) to the dot alone: the armed button body is now
  // IDENTICAL to an unarmed one. The dot still uses the EXISTING --obligation
  // token (the styleguide's negative/red family) — consumed unforked (ADR-0003),
  // and deliberately NOT the reserved selection accent --accent-ochre-soft
  // (ADR-0016). The cue reflects the armed toggle, not a live bridge probe; the
  // flash (launched/copied) still wins so feedback reads. The SkipPermissionsToggle
  // remains the single control wearing the full --obligation danger treatment.
  const armed = skipPermissions === true && !flashed;
  return html`
    <button
      type="button"
      className="focusable"
      title=${armed
        ? `${label} — launch ${command} with --dangerously-skip-permissions (armed; copies to clipboard if the bridge is unavailable — the clipboard copy does NOT skip permissions)`
        : `${label} — launch ${command} (copies to clipboard if the bridge is unavailable)`}
      aria-label=${armed
        ? `${label} — launch ${command} (skips permissions)`
        : `${label} — launch ${command}`}
      onClick=${onClick}
      style=${{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontFamily: "var(--font-ui)", fontSize: 11.5,
        fontWeight: primary || inverse ? 600 : 500,
        color: flashed ? "var(--st-done)" : idleColor,
        background: flashed ? "var(--surface-1)" : idleBg,
        border: flashed ? "1px solid var(--st-done)" : idleBorder,
        borderRadius: "var(--radius-sm)", padding: "4px 9px", cursor: "pointer",
        boxShadow: "none",
        transition: "color var(--duration-fast) var(--ease-base), box-shadow var(--duration-fast) var(--ease-base), background var(--duration-fast) var(--ease-base)",
      }}
      ${/* Hover RAISE (aw-030): a stronger box-shadow off the styleguide --shadow
            scale (ADR-0003) plus a background highlight — the same "clearly hovered"
            feel the cards get, WITHOUT shifting content (no vertical nudge,
            no transform).
            Skipped while flashed (the launched/copied treatment owns the surface).
            The :focus affordance is the focusable class, untouched. */ ""}
      onMouseEnter=${(e) => { if (!flashed) { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.background = "var(--surface-2)"; } }}
      onMouseLeave=${(e) => { if (!flashed) { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = inverse ? "var(--fg-1)" : idleBg; } }}>
      ${armed
        ? html`<span aria-hidden="true" title="This launch skips permissions" style=${{
            width: 6, height: 6, borderRadius: 99, background: "var(--obligation)", flexShrink: 0,
          }} />`
        : html`<${Icon} name=${icon} size=${12.5}
            color=${flashed ? "var(--st-done)" : (inverse ? "var(--surface-0)" : primary ? "var(--fg-2)" : "var(--fg-3)")} />`}
      <span>${labelText}</span>
    </button>`;
}

// Fire the celebration burst via canvas-confetti (agentic-workflow-034, amends
// ADR-0020). The hand-rolled CSS-keyframe burst (the injected style rule + the
// DOM-span pieces) is GONE; canvas-confetti gives the real
// particle physics the builder wanted ("way better"). It is the dashboard's first
// BUNDLED frontend runtime dependency — `import`ed above so esbuild folds it into
// the committed dist/app.js (no CDN; the board runs offline on 127.0.0.1).
//
// canvas-confetti's default global confetti() paints a fixed FULL-VIEWPORT canvas
// (pointer-events: none, above content, auto-cleared). We fire from an origin near
// the prompt-bar buttons (lower-left of the viewport) so particles rain across the
// page — a deliberate full-window step up from the old contained-over-the-buttons
// footprint. It stays a board-OWNED, board-local transient ACK (ADR-0020): the
// board injects the call, it is consumed within the BC, and it is NOT promoted to a
// design-system motion primitive — "board-local" was always about ownership, not
// pixel footprint.
//
// Colors are resolved at FIRE TIME (resolveConfettiColors, confetti-palette.js) off
// the document root — the four status bases (--st-done/--st-todo/--st-doing/
// --st-backlog), so the burst tracks the active light/dark theme and stays a true
// projection of the styleguide tokens (ADR-0003). Never the reserved selection
// accent --accent-ochre-soft (ADR-0016) nor the --obligation skip-permissions hue
// (aw-021) — both excluded by construction (neither is a status base).
function fireConfetti() {
  if (typeof document === "undefined" || typeof confetti !== "function") return;
  const colors = resolveConfettiColors(getComputedStyle(document.documentElement));
  // Lively defaults; the exact tuning is iterated via the aw-025 replay button.
  // Origin sits near the prompt-bar buttons (lower-left), spraying up-and-out.
  confetti({
    particleCount: 120,
    spread: 75,
    startVelocity: 48,
    gravity: 0.9,
    scalar: 0.9,
    ticks: 220,
    origin: { x: 0.18, y: 0.92 },
    angle: 75,
    ...(colors.length ? { colors } : {}),
  });
}

// A board-local confetti burst (agentic-workflow-023, reimplemented aw-034) marking
// the prompt bar's clearance after a successful launch/copy. It is keyed by a
// monotonic `fireKey` from the parent: each successful action bumps the key,
// remounting a fresh BoardConfetti that fires once on mount. Under
// `prefers-reduced-motion: reduce` it renders NOTHING and never invokes confetti()
// — the clearance stays a quiet, motionless ACK (ADR-0014 strip-to-plain).
function BoardConfetti({ fireKey }) {
  const reduce = typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    // The matchMedia guard wraps the canvas-confetti call: under reduce it is never
    // invoked (ADR-0014), and a falsy fireKey (initial mount) fires nothing.
    if (reduce || !fireKey) return;
    fireConfetti();
  }, [fireKey, reduce]);
  // canvas-confetti owns its own full-viewport canvas; BoardConfetti renders no DOM.
  return null;
}

// The board-level PROMPT BAR (agentic-workflow-023). aw-020's bare Quick Capture /
// Modeling buttons are RELOCATED out of the backlog column to sit beneath a
// board-level multi-line textarea, rendered on the board view only (between the
// shell header and the columns). The builder authors a prompt once and hands it to
// whichever skill they pick: clicking a button seeds the matching command WITH the
// typed prompt appended (quickCaptureCommandFor / modelingCommandFor) — or the bare
// command when the textarea is empty (byte-identical to aw-020). On a successful
// launch (bridge) or landed clipboard copy, the textarea is CLEARED and a confetti
// burst plays; a fully-silent action (clipboard blocked too) clears nothing and
// fires no confetti.
//
// The textarea is a board-local, token-matched control: the styleguide has no
// text-input primitive, and the board-control precedent (the sort <select>, the
// group toggle) keeps the styleguide consumed UNFORKED (ADR-0003) — this is a
// native control beside the primitives, flagged as a design-system follow-up (a
// shared TextArea/prompt-input). The board stays a projection of disk (ADR-0001):
// launching is an external side-effect, never a lifecycle write.
//
// `skipPermissions` (aw-021 preserved): threaded through to both relocated buttons
// so an armed launch from the prompt bar still posts `skipPermissions: true`.
//
// aw-026: the right-side Work button (aw-024) was REMOVED from the prompt bar and
// relocated to the main-column topbar (BoardTopbar) — one Work entry point. The
// aw-024 two-thirds/one-third split collapses back: the prompt bar is now just a
// full-width textarea above the Quick Capture / Modeling pair.
function BoardPromptBar({ skipPermissions = false }) {
  const [prompt, setPrompt] = useState("");
  const [confettiKey, setConfettiKey] = useState(0);

  // Fire only on a successful launch / landed copy (aw-023). A fully-silent action
  // (clipboard blocked too) leaves the textarea and plays no confetti.
  const onResult = useCallback((res) => {
    const succeeded = res && (res.via === "bridge" || res.copied === true);
    if (!succeeded) return;
    setPrompt("");
    setConfettiKey((k) => k + 1);
  }, []);

  return html`
    <section aria-label="Author a prompt, then launch a capture or modeling session" style=${{
      position: "relative",
      display: "flex", flexDirection: "column", gap: 10,
      padding: "0 4px 20px",
    }}>
      <textarea
        className="focusable"
        aria-label="Prompt for the launched session"
        placeholder="Type a prompt, then choose how to file it — Quick Capture or Modeling…"
        rows=${2}
        value=${prompt}
        onChange=${(e) => setPrompt(e.target.value)}
        style=${{
          resize: "vertical", minHeight: 52,
          fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.5,
          color: "var(--fg-1)", background: "var(--surface-1)",
          border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)",
          padding: "10px 12px",
          transition: "border-color var(--duration-fast) var(--ease-base)",
        }}
        onFocus=${(e) => { e.currentTarget.style.borderColor = "var(--hairline-strong)"; }}
        onBlur=${(e) => { e.currentTarget.style.borderColor = "var(--hairline)"; }} />
      <div role="group" aria-label="Start a session seeded with the prompt above" style=${{
        position: "relative",
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      }}>
        <${LaunchButton} label="Quick Capture" command=${quickCaptureCommandFor(prompt)}
          icon="plus" skipPermissions=${skipPermissions} onResult=${onResult} />
        <${LaunchButton} label="Modeling" command=${modelingCommandFor(prompt)}
          icon="compass" skipPermissions=${skipPermissions} onResult=${onResult} />
        ${/* TEMP (aw-025): replay-on-demand trigger for the celebration confetti, so the
             animation can be iterated on without authoring + launching a real session.
             It is throwaway scaffolding — delete this one contiguous block to remove it.
             It only bumps the existing confettiKey (reusing BoardConfetti unchanged); it
             does NOT launch, hit the bridge, copy, clear the textarea, or write lifecycle
             state. Under prefers-reduced-motion BoardConfetti stays silent (ADR-0014). */ ""}
        <button
          type="button"
          className="focusable"
          aria-label="Replay the celebration animation (temporary, aw-025)"
          onClick=${() => setConfettiKey((k) => k + 1)}
          style=${{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "var(--font-ui)", fontSize: 12, lineHeight: 1,
            color: "var(--fg-2)", background: "var(--surface-1)",
            border: "1px dashed var(--hairline-strong)", borderRadius: "var(--radius-md)",
            padding: "7px 10px", cursor: "pointer",
          }}>🎉 Replay celebration</button>
        ${/* END TEMP (aw-025) */ ""}
        <${BoardConfetti} fireKey=${confettiKey} />
      </div>
    </section>`;
}

// The per-CARD backlog launch group (agentic-workflow-022). The single per-card
// Copy affordance (aw-016) is REPLACED by TWO launch buttons composed INTO the
// styleguide TicketCard's existing single `cornerAction` render-prop slot
// (design-system-006): cornerAction's contract is "consumer owns what renders", so
// the board hands it a two-button group rather than one icon button — consuming the
// primitive UNFORKED (ADR-0003), not extending it. The styleguide keeps owning the
// slot's placement + its propagation-stopping wrapper; the board owns the group's
// internal layout and each button's launch behavior.
//
// A backlog card invites two real actions, so the pair is:
//   - Refine  (PRIMARY, emphasised) -> `/agentheim:modeling refine <id>` — the full
//     Socratic refinement; the expected default, since most backlog items need
//     deepening before they're ready.
//   - Promote (QUIET, de-emphasised) -> `/agentheim:modeling promote <id>` — the
//     readiness check + backlog → todo move; the rarer, more committing action.
// Each opens a real seeded terminal through the bridge, with the silent clipboard
// fallback (reusing aw-020's LaunchButton/launchOrCopy unchanged). Promote only
// ever runs backlog → todo, so this group belongs on backlog cards only.
function BacklogCardLaunchPair({ id, skipPermissions = false }) {
  return html`
    <div role="group" aria-label="Refine or promote this backlog item" style=${{
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      <${LaunchButton} label="Refine" command=${refineCommandFor(id)}
        icon="compass" emphasis="primary" isolateClick=${true} skipPermissions=${skipPermissions} />
      <${LaunchButton} label="Promote" command=${promoteCommandFor(id)}
        icon="arrow-right" emphasis="quiet" isolateClick=${true} skipPermissions=${skipPermissions} />
    </div>`;
}

// The board's per-BC section now COMPOSES the shared styleguide Collapsible
// primitive (design-system-005), CONTROLLED: the board owns each (column, BC)
// collapse state in its persisted view-state store (ADR-0015), so it supplies
// `open` + `onToggle` and the primitive writes no internal state of its own. The
// former board-local section header (a token-matched clone) is retired — the
// header look now lives once, in the styleguide, consumed unforked (ADR-0003).

// A read-only lifecycle column that COMPOSES the approved styleguide
// sub-components (ColumnHeader, TicketCard, EmptyColumn) exactly as the styleguide
// `Column` does — same pattern, no fork. The board carries NO drag affordances
// (ADR-0017): columns are inert projections of disk, never drop targets, and the
// dashboard never writes a lifecycle move. It hosts the board-only per-column sort
// control (aw-012) as a sibling of ColumnHeader; `tickets` arrives already ordered
// (the board sorts before passing it in).
// One TicketCard. Factored out so the flat list and the grouped sections render
// cards identically (same selection ring).
function BoardCard({ ticket, status, selectedId, onOpen, skipPermissions = false }) {
  // Backlog cards carry a Refine / Promote launch pair (aw-022) in the styleguide
  // card's bottom-right cornerAction slot (design-system-006), replacing aw-016's
  // single Copy affordance: Refine (primary) seeds `/agentheim:modeling refine
  // <id>` and Promote (quiet) seeds `/agentheim:modeling promote <id>`, each
  // opening a real seeded terminal through the bridge (clipboard fallback). The
  // board hands the slot's consumer-owned render-prop a two-button GROUP — unforked
  // consumption (ADR-0003), not an extension of the slot. Other columns pass no
  // cornerAction, so their cards render the slot empty (and, since ds-006, no dead
  // estimate chip either). The slot is click-isolated by the styleguide, so
  // launching never opens the slide-over.
  const cornerAction = status === "backlog"
    ? () => html`<${BacklogCardLaunchPair} id=${ticket.id} skipPermissions=${skipPermissions} />`
    : undefined;
  return html`
    <${TicketCard} key=${ticket.id} ticket=${ticket} variant="rail"
      selected=${selectedId === ticket.id} onClick=${() => onOpen(ticket)}
      cornerAction=${cornerAction} />`;
}

function BoardColumn({
  status, tickets, sort, onSortChange, grouped, onGroupToggle,
  collapsed, onToggleSection,
  selectedId, onOpen, skipPermissions = false,
}) {
  // Pipeline: tickets arrive ALREADY sorted (the board sorts before passing them
  // in); group them into sections here (board-group.groupTickets, pure). A flat
  // column yields one null-bc section; the toggle re-shapes presentation only.
  const sections = groupTickets(tickets, { grouped, collapsed });

  const renderCard = (t) => html`
    <${BoardCard} key=${t.id} ticket=${t} status=${status}
      selectedId=${selectedId} onOpen=${onOpen} skipPermissions=${skipPermissions} />`;

  return html`
    <div style=${{
      flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column",
      borderRadius: "var(--radius-md)",
    }}>
      <${ColumnHeader} status=${status} count=${tickets.length} />
      <${ColumnControls} status=${status} sort=${sort} onSortChange=${onSortChange}
        grouped=${grouped} onGroupToggle=${onGroupToggle} />
      ${tickets.length === 0
        ? html`<div style=${{ paddingBottom: 8 }}><${EmptyColumn} status=${status} /></div>`
        : grouped
          ? html`
            <div style=${{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 8 }}>
              ${sections.map((sec) => html`
                <${Collapsible} key=${sec.bc} label=${sec.bc} count=${sec.count}
                  open=${!sec.collapsed} onToggle=${() => onToggleSection(sec.bc)}
                  bodyStyle=${{ gap: 10, paddingLeft: 2 }}>
                  ${sec.tickets.map(renderCard)}
                </${Collapsible}>`)}
            </div>`
          : html`
            <div style=${{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 8 }}>
              ${sections[0].tickets.map(renderCard)}
            </div>`}
    </div>`;
}

/**
 * The dashboard board. Self-contained: fetches /api/tree, transforms it into the
 * four flat columns, renders a read-only column per lifecycle, and (aw-009) stays
 * live via the SSE stream. It is READ-ONLY (ADR-0017): the dashboard never writes
 * lifecycle state — skills are the sole owners.
 *
 * Live-update: subscribes to GET /api/events; every tree-changed frame (or
 * reconnect) re-fetches /api/tree and re-projects — the raw event is never
 * interpreted as a transition. As skills move files on disk the board reflects it.
 *
 * @param {(ticket: object) => void} [onOpen] — open-intent sink (aw-007 wires it).
 * @param {string} [treeUrl] — overridable for tests / alternate mounts.
 */
export function DashboardBoard({ onOpen, treeUrl = "/api/tree", skipPermissions = false }) {
  const [columns, setColumns] = useState(EMPTY_COLUMNS);
  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [selectedId, setSelectedId] = useState(null);

  // Per-column VIEW LENS — { grouped, sort, collapsed } per column, independent
  // per column. PERSISTED across reloads via the single versioned localStorage
  // store (aw-014, reversing ADR-0009's no-localStorage clause; supersedes
  // aw-012's in-session-only sort). It is VIEW-STATE ONLY: the board's CONTENT
  // stays a projection of disk, re-fetched on every SSE frame. A column with no
  // stored state defaults to flat + default sort + all-expanded. The order and
  // grouping are DERIVED below at render time, so every loadTree re-projection
  // (SSE tree-changed / reconnect) re-applies the current choice — never resets.
  const [view, setView] = useState(() => {
    const storage = typeof window !== "undefined" ? window.localStorage : null;
    const stored = loadViewState(storage);
    const v = {};
    for (const c of COLUMN_ORDER) v[c] = { ...defaultColumnState(), ...(stored[c] || {}) };
    return v;
  });

  // Persist on every change. A failed preference write is swallowed by the store;
  // it must never surface as a board error.
  useEffect(() => {
    const storage = typeof window !== "undefined" ? window.localStorage : null;
    saveViewState(storage, view);
  }, [view]);

  const setColumnSort = useCallback((status, value) => {
    setView((prev) => (prev[status].sort === value
      ? prev
      : { ...prev, [status]: { ...prev[status], sort: value } }));
  }, []);

  const setColumnGrouped = useCallback((status, grouped) => {
    setView((prev) => (prev[status].grouped === grouped
      ? prev
      : { ...prev, [status]: { ...prev[status], grouped } }));
  }, []);

  // Toggle one (column, BC) section's collapse state. Stored as the list of
  // COLLAPSED BC names per column — absent = expanded (the all-expanded default).
  const toggleSection = useCallback((status, bc) => {
    setView((prev) => {
      const col = prev[status];
      const has = col.collapsed.includes(bc);
      const collapsed = has ? col.collapsed.filter((x) => x !== bc) : [...col.collapsed, bc];
      return { ...prev, [status]: { ...col, collapsed } };
    });
  }, []);

  // The single board re-projection: re-fetch /api/tree and rebuild the columns.
  // Called on mount and on every SSE tree-changed frame / reconnect — the board
  // is always rebuilt from disk, never mutated in place.
  const loadTree = useCallback(() => {
    let alive = true;
    fetch(treeUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`/api/tree ${r.status}`);
        return r.json();
      })
      .then((tree) => {
        if (!alive) return;
        setColumns(treeToColumns(tree));
        setPhase("ready");
      })
      .catch(() => {
        if (!alive) return;
        setColumns(EMPTY_COLUMNS);
        setPhase("error");
      });
    return () => { alive = false; };
  }, [treeUrl]);

  // Initial load.
  useEffect(() => { setPhase("loading"); return loadTree(); }, [loadTree]);

  // Live-update: re-sync the board on connect and every tree-changed frame. The
  // move's own SSE echo is just another tree-changed frame → one more re-fetch,
  // idempotent, no double-apply (ADR-0001).
  useLiveTree(loadTree);

  // Card click → emit the open intent (aw-007 consumes it). Selection state is
  // tracked here so the clicked card shows the styleguide selected ring.
  const handleOpen = useCallback((ticket) => {
    setSelectedId(ticket.id);
    if (typeof onOpen === "function") onOpen(ticket);
  }, [onOpen]);

  const total = COLUMN_ORDER.reduce((n, c) => n + columns[c].length, 0);

  if (phase === "loading") {
    return html`<${LoadState}><${Icon} name="loader" size=${15} color="var(--fg-4)" /> Loading board…</${LoadState}>`;
  }
  if (phase === "error") {
    return html`<${LoadState}><${Icon} name="triangle-alert" size=${15} color="var(--st-doing)" /> Could not load the board. Is the dashboard server running?</${LoadState}>`;
  }

  return html`
    <div>
      <${BoardPromptBar} skipPermissions=${skipPermissions} />
      <${BoardHeader} count=${total} />
      <div className="scroll-quiet" style=${{ overflowX: "auto", paddingBottom: 8 }}>
        <div style=${{ minWidth: 880 }}>
          <div style=${{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            ${COLUMN_ORDER.map((status) => html`
              <${BoardColumn} key=${status} status=${status}
                tickets=${sortTickets(columns[status], view[status].sort)}
                sort=${view[status].sort} onSortChange=${(v) => setColumnSort(status, v)}
                grouped=${view[status].grouped} onGroupToggle=${(g) => setColumnGrouped(status, g)}
                collapsed=${view[status].collapsed} onToggleSection=${(bc) => toggleSection(status, bc)}
                selectedId=${selectedId} onOpen=${handleOpen} skipPermissions=${skipPermissions} />`)}
          </div>
        </div>
      </div>
    </div>`;
}

// The shell-header SKIP-PERMISSIONS armed toggle (aw-021). It lives in the
// ShellRail header next to the theme toggle (the aw-017 persisted-control
// precedent) — NOT a settings panel, since there is one setting today. It carries
// an ARMED / DANGER visual treatment so it never reads as a neutral preference:
// when on, it is filled with the existing --obligation token (the styleguide's
// negative/red family), consumed UNFORKED (ADR-0003) — deliberately NOT the
// reserved selection accent --accent-ochre-soft (ADR-0016). Off, it is a quiet,
// recessed control. Toggling it flips the persisted store (skip-permissions-state.js)
// in DashboardApp, which threads the armed flag into every launchOrCopy.
function SkipPermissionsToggle({ armed, onToggle }) {
  return html`
    <button
      type="button"
      className="focusable"
      role="switch"
      aria-checked=${armed}
      aria-label="Arm skip-permissions for bridge launches"
      title=${armed
        ? "Skip-permissions ARMED — every bridge launch starts claude --dangerously-skip-permissions. Click to disarm."
        : "Skip-permissions off — bridge launches prompt for permissions normally. Click to arm (launches will skip permission prompts)."}
      onClick=${() => onToggle(!armed)}
      style=${{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: armed ? 600 : 500,
        color: armed ? "var(--obligation)" : "var(--fg-3)",
        background: armed ? "var(--obligation-soft)" : "transparent",
        border: `1px solid ${armed ? "var(--obligation)" : "var(--hairline)"}`,
        borderRadius: "var(--radius-sm)", padding: "4px 9px", cursor: "pointer",
        transition: "color var(--duration-fast) var(--ease-base), border-color var(--duration-fast) var(--ease-base), background var(--duration-fast) var(--ease-base)",
      }}>
      <span aria-hidden="true" style=${{
        width: 7, height: 7, borderRadius: 99,
        background: armed ? "var(--obligation)" : "transparent",
        border: `1.5px solid ${armed ? "var(--obligation)" : "var(--fg-4)"}`,
        flexShrink: 0,
      }} />
      <span>${armed ? "Skips permissions" : "Skip permissions"}</span>
    </button>`;
}

// The full-height LEFT RAIL (agentic-workflow-026). It replaces aw-008's horizontal
// top header with the styleguide §05 "Components in context" layout: a vertical,
// full-height nav composed from styleguide PRIMITIVES (Glyph / RailItem / TreeGroup
// / TreeItem) — consumed UNFORKED (ADR-0003), NOT the styleguide AppRail (which is
// hardwired to the demo LIBRARY constant). Top-to-bottom:
//   brand (Glyph + "Agentheim" + live projectName)
//   → a single Board RailItem (the only nav item — the always-visible tree below IS
//     the library, so there is NO separate Library RailItem; ADR-0011)
//   → divider → "Workspace" label
//   → the LIVE library tree, fed by treeToLibrary(/api/tree) (never the demo data)
//   → a footer holding the theme toggle + the skip-permissions armed toggle
//     (relocated out of the retired horizontal header; the footer gives the
//     skip-permissions danger treatment a stable home, ADR-0019).
//
// The rail is a discovery surface, so it stays LIVE the same way the board does: it
// fetches /api/tree on mount and re-fetches on every SSE tree-changed frame /
// reconnect (useLiveTree), re-projecting via treeToLibrary. Read-only throughout
// (ADR-0017): clicking a non-task row emits the open-intent the shell routes — a
// non-task document now opens in the MAIN PANE (aw-027), so the rail's selected
// edge follows the selected DOCUMENT (`selectedId`, fed from selectedDoc), and the
// Board RailItem returns the main pane to the board (onSelectBoard) and is `active`
// exactly when no document is selected.
function ShellRail({ projectName, selectedId, onOpen, onSelectBoard }) {
  const [groups, setGroups] = useState([]);

  // Re-project the rail tree from /api/tree (the non-task half, treeToLibrary). A
  // failed fetch leaves the tree empty rather than crashing the rail — the board's
  // own error state already reports an unreachable server.
  const loadTree = useCallback(() => {
    let alive = true;
    fetch("/api/tree")
      .then((r) => (r.ok ? r.json() : null))
      .then((tree) => { if (alive) setGroups(tree ? treeToLibrary(tree) : []); })
      .catch(() => { if (alive) setGroups([]); });
    return () => { alive = false; };
  }, []);
  useEffect(() => loadTree(), [loadTree]);
  useLiveTree(loadTree);

  return html`
    <nav style=${{
      width: 248, flexShrink: 0, alignSelf: "stretch", boxSizing: "border-box",
      background: "var(--surface-0)", borderRight: "1px solid var(--hairline)",
      display: "flex", flexDirection: "column",
    }}>
      <!-- Brand -->
      <div style=${{ display: "flex", alignItems: "center", gap: 9, padding: "16px 16px 14px" }}>
        <${Glyph} size=${22} />
        <span style=${{
          display: "flex", alignItems: "baseline", gap: 7, minWidth: 0,
          fontFamily: "var(--font-ui)", letterSpacing: "-0.01em",
        }}>
          <span style=${{ fontSize: 15, fontWeight: 600, color: "var(--fg-1)" }}>Agentheim</span>
          ${projectName ? html`
            <span aria-hidden="true" style=${{ color: "var(--fg-4)", fontSize: 13 }}>·</span>
            <span style=${{
              fontSize: 13.5, fontWeight: 500, color: "var(--fg-3)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>${projectName}</span>` : null}
        </span>
      </div>

      <!-- Primary nav: the single Board item (the tree below IS the library) -->
      <div style=${{ padding: "4px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        <${RailItem} icon="square-kanban" label="Board"
          active=${!selectedId}
          onClick=${() => onSelectBoard && onSelectBoard()} />
      </div>

      <div style=${{ height: 1, background: "var(--hairline)", margin: "12px 16px" }} />

      <!-- Live file tree (the library) -->
      <div className="scroll-quiet" style=${{ flex: 1, overflowY: "auto", padding: "0 8px 16px" }}>
        <div style=${{
          padding: "0 8px 8px", fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
          letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--fg-3)",
        }}>Workspace</div>
        ${groups.map((g) => html`
          <${TreeGroup} key=${g.group} group=${g.group} items=${g.items}
            selectedId=${selectedId} onOpen=${onOpen}
            defaultOpen=${g.group !== "Research"} />`)}
      </div>
    </nav>`;
}

// The post-stop "Dashboard stopped" overlay (agentic-workflow-028). A board-local,
// token-matched full-pane cover over the MAIN CONTENT AREA (absolutely filling the
// relatively-positioned content wrapper) — NOT a styleguide primitive: there is no
// full-screen modal in the styleguide and the Drawer is a side panel, so this is
// composed from existing tokens (ADR-0003, consumed unforked). It is the honest end
// state: the page is now talking to a server that is shutting down, so the board below
// is covered and the only message is that it is safe to close the tab. Rendered ONLY on
// a bridge dispatch (the clipboard fallback stopped nothing and never mounts this).
function StoppedOverlay() {
  return html`
    <div
      role="status"
      aria-live="polite"
      style=${{
        position: "absolute", inset: 0, zIndex: 5,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 14, padding: 32, textAlign: "center",
        background: "var(--surface-0)",
      }}>
      <${Icon} name="x" size=${30} color="var(--fg-3)" />
      <div style=${{ fontFamily: "var(--font-ui)", fontSize: 16, fontWeight: 600, color: "var(--fg-1)" }}>
        Dashboard stopped — safe to close this tab
      </div>
      <div style=${{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--fg-3)", maxWidth: 360, lineHeight: 1.5 }}>
        The dashboard server is shutting down. Reopen it any time with
        <span style=${{ fontFamily: "var(--font-mono)", color: "var(--fg-2)" }}> /dashboard</span> from a session.
      </div>
    </div>`;
}

// The main-column TOPBAR (agentic-workflow-026) — the styleguide §05 board topbar.
// A ~52px strip over the scrollable board carrying a board title / breadcrumb and a
// single primary action that FOLLOWS the active theme (aw-033 — the primary emphasis,
// light fill+dark text in light mode and dark fill+light text in dark mode; it earlier
// wore the §05 inverse/opposite-scheme treatment, which read as the wrong theme). That
// button IS the WORK launch (relocated here from the prompt bar, aw-024): a read-only launch of the
// bare /agentheim:work via launchOrCopy (WORK_COMMAND, ADR-0017/0018), threading
// skipPermissions (aw-021) and passing NO onResult (Work never consumed a prompt).
// NO Search box is rendered — the dashboard is read-only with no search backend.
//
// The top-right cluster groups the session-level controls (aw-029): the theme
// toggle and the skip-permissions armed toggle, LEFT of the Work launch — read,
// left → right: [ theme ][ skip-permissions ][ Work ]. Both controls are consumed
// from the styleguide unforked (ADR-0003): the theme toggle keeps its persisted
// light/dark behaviour (aw-017) and the skip-permissions toggle keeps its armed /
// danger (--obligation) treatment, off-by-default persistence, and threading of
// skipPermissions through every launch (aw-021 / ADR-0019). This is the only
// home for the two toggles — the rail footer that held them (aw-026) is retired.
//
// A QUIET "Stop dashboard" launch (aw-028) sits at the FAR LEFT, after the breadcrumb
// and BEFORE the flex spacer — set APART from the right-side [theme][skip-perms][Work]
// cluster so it never reads or fat-fingers as the Work primary. It reuses the same
// launchOrCopy seam to run STOP_DASHBOARD_COMMAND (`/agentheim:dashboard stop`); the
// spawned session runs `/dashboard stop` → stopDashboard(root) (aw-011), so the server
// is never asked to stop itself (ADR-0017 read-only). NO confirmation step (a single
// click stops, matching the directness of `/dashboard stop`). It deliberately does NOT
// thread skipPermissions — a stop is not a risky work launch, so it never wears the
// armed/danger --obligation per-launch cue (aw-021/ADR-0019 is a non-goal here). Its
// onResult flips the shell-level "stopped" overlay ONLY on a bridge dispatch
// (`res.via === "bridge"`); a clipboard fallback stopped nothing, so it shows no overlay
// and just lets LaunchButton flash the existing quiet "Copied" feedback.
function BoardTopbar({ theme, setTheme, skipPermissions = false, setSkipPermissions, onStopped }) {
  const onStopResult = useCallback((res) => {
    // Optimistic on dispatch: `res.via === "bridge"` means POST /run landed (the
    // terminal opened to run `/dashboard stop`), so the page is now talking to a
    // server that is shutting down — the overlay is the honest end state. A clipboard
    // fallback stopped nothing (the command was only copied), so we show no overlay.
    if (res && res.via === "bridge" && typeof onStopped === "function") onStopped();
  }, [onStopped]);
  return html`
    <div style=${{
      display: "flex", alignItems: "center", gap: 12,
      padding: "0 18px", minHeight: 52, flexShrink: 0,
      borderBottom: "1px solid var(--hairline)", background: "var(--surface-0)",
    }}>
      <span style=${{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--fg-1)" }}>
        Board
      </span>
      <span style=${{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
        agentheim / tickets
      </span>
      <!-- Stop dashboard — quiet, far-left, set APART from the right-side cluster (aw-028). -->
      <${LaunchButton} label="Stop dashboard" command=${STOP_DASHBOARD_COMMAND}
        icon="x" emphasis="quiet" onResult=${onStopResult} />
      <div style=${{ flex: 1 }} />
      <!-- Session-level controls, left → right: theme, skip-permissions, Work (aw-029) -->
      <div style=${{ display: "flex", alignItems: "center", gap: 9 }}>
        <${ThemeToggle} value=${theme} onChange=${setTheme} options=${[
          { value: "dark", label: "Dark", icon: "moon" },
          { value: "light", label: "Light", icon: "sun" },
        ]} />
        <${SkipPermissionsToggle} armed=${skipPermissions} onToggle=${setSkipPermissions} />
        <${LaunchButton} label="Work" command=${WORK_COMMAND}
          icon="arrow-right" emphasis="primary" skipPermissions=${skipPermissions} />
      </div>
    </div>`;
}

/**
 * The dashboard application shell. Minimal and composable: it owns the theme + the
 * skip-permissions arm state, and lays out the styleguide §05 "Components in
 * context" chrome — a full-height left RAIL (ShellRail) beside a MAIN COLUMN (a
 * topbar over the scrollable board), all in one bordered, elevated frame (aw-026).
 *
 * The rail's always-visible Workspace tree IS the library (aw-008's full-pane
 * library surface + the board↔library toggle are retired). Both the rail's tree
 * rows and the board's cards emit the SAME open-intent shape; the shell ROUTES it
 * on artifact KIND (aw-027, pure intent-route.isTaskIntent):
 *   - a board TASK intent (carries a lifecycle `status`) opens in the right-hand
 *     SlideOver (aw-007) — a transient detail panel beside the board, unchanged;
 *   - a non-task DOCUMENT intent (a rail row — vision, context map, BC README,
 *     ADR, research) opens in the MAIN PANE (MainPaneReader), where there is room
 *     to read. Both render targets share ONE /api/doc fetch mechanism (docUrl).
 * The shell holds TWO selection states: `openIntent` (task → SlideOver; drives the
 * board card ring) and `selectedDoc` (non-task doc → main pane; drives the rail
 * row's selected edge). The main pane shows EITHER the selected document OR the
 * board (the default); the Board RailItem returns it to the board by clearing
 * `selectedDoc`, and is `active` exactly when `selectedDoc` is null. The dashboard
 * stays read-only (ADR-0017): opening a doc performs no write.
 */
export function DashboardApp() {
  // Theme is owned here and fed to the ThemeCtx.Provider + the data-theme effect.
  // First paint resolves from a persisted override (versioned localStorage) or,
  // on a first visit, the OS prefers-color-scheme — mirroring the styleguide's
  // "dark-first with a light toggle". The resolution is pure (theme-state.js) and
  // safe-degrades a malformed/stale/absent blob to the system default. The lazy
  // initializer keeps it a ONE-TIME read on mount, so an SSE re-projection of
  // /api/tree (a re-render of the surfaces below) never resets the chosen theme.
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return resolveTheme(window.localStorage, window.matchMedia);
  });
  // Reflect the theme onto the documentElement and animate the flip with the
  // styleguide's theme-fade transition, matching the styleguide App() behaviour.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.add("theme-fade");
    const t = setTimeout(() => document.documentElement.classList.remove("theme-fade"), 320);
    return () => clearTimeout(t);
  }, [theme]);
  // The user's explicit toggle is the only thing we persist — once set, it
  // overrides the system preference on the next reload.
  const onThemeChange = useCallback((next) => {
    setTheme(next);
    if (typeof window !== "undefined") saveTheme(window.localStorage, next);
  }, []);

  // The SKIP-PERMISSIONS armed toggle (aw-021), owned here and threaded down to
  // every launch button so each bridge launch posts `skipPermissions: true` when
  // armed (else omits it). DEFAULT OFF, and a malformed/stale/absent persisted
  // blob degrades to OFF (the bypass is never silently on — skip-permissions-state.js).
  // The lazy initializer keeps it a one-time read on mount, so an SSE re-projection
  // never resets the armed choice. It is presentation view-state only — never a
  // disk lifecycle write — so the dashboard stays read-only over .agentheim/.
  const [skipPermissions, setSkipPermissions] = useState(() => {
    if (typeof window === "undefined") return false;
    return loadSkipPermissions(window.localStorage);
  });
  const onSkipPermissionsChange = useCallback((next) => {
    const armed = next === true;
    setSkipPermissions(armed);
    if (typeof window !== "undefined") saveSkipPermissions(window.localStorage, armed);
  }, []);

  // .agentheim is being viewed (Agentheim is installed across many repos). It
  // rides the existing /api/tree projection (project.name, parsed server-side
  // from vision.md's `# Vision:` heading). The vision name is static within a
  // session, so a one-time read on mount suffices — no SSE re-read needed.
  const [projectName, setProjectName] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/tree")
      .then((r) => (r.ok ? r.json() : null))
      .then((tree) => { if (alive && tree && tree.project) setProjectName(tree.project.name); })
      .catch(() => {}); // header name is non-essential; failure leaves "Agentheim" alone
    return () => { alive = false; };
  }, []);

  // TWO open-intent sinks, split on artifact KIND (aw-027, pure isTaskIntent):
  //   - openIntent  — the clicked TASK, or null when the slide-over is closed. It
  //     drives the board card selection ring (DashboardBoard tracks its own ring
  //     off the click; the SlideOver consumes this).
  //   - selectedDoc — the selected non-task DOCUMENT, or null when the main pane
  //     shows the board (the default). It drives the rail row's selected edge and
  //     the MainPaneReader.
  // A board card emits a task intent → SlideOver; a rail row emits a doc intent →
  // main pane. The two are mutually exclusive: opening one clears the other so the
  // selection ring and the rail edge never both show.
  const [openIntent, setOpenIntent] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const onOpen = useCallback((item) => {
    if (typeof window !== "undefined") window.__agentheimLastOpen = item;
    if (isTaskIntent(item)) {
      setSelectedDoc(null);   // a task takes the slide-over; clear any open doc.
      setOpenIntent(item);
    } else {
      setOpenIntent(null);    // a doc takes the main pane; close any open slide-over.
      setSelectedDoc(item);
    }
  }, []);
  const onClose = useCallback(() => setOpenIntent(null), []);
  // The Board RailItem returns the main pane to the board: clear the selected doc.
  const onSelectBoard = useCallback(() => setSelectedDoc(null), []);

  // The shell-level "stopped" state (aw-028). The topbar's quiet Stop dashboard launch
  // calls onStopped ONLY when launchOrCopy returned `via: "bridge"` — i.e. POST /run
  // dispatched the `/agentheim:dashboard stop` session, so the server this page talks to
  // is shutting down. We then render a full-pane "Dashboard stopped — safe to close this
  // tab" overlay over the main content area. It is OPTIMISTIC on dispatch (the spawned
  // session still has to run `/dashboard stop`); the SSE stream dropping a moment later
  // (live-update already tracks connection state) naturally corroborates it. A clipboard
  // fallback stopped nothing, so it never reaches here — no overlay, just the button's
  // own quiet "Copied" flash. The overlay is board-local and token-matched (ADR-0003);
  // there is no full-screen modal primitive and the Drawer is a side panel, not used here.
  const [stopped, setStopped] = useState(false);
  const onStopped = useCallback(() => setStopped(true), []);

  return html`
    <${ThemeCtx.Provider} value=${theme}>
      <div style=${{
        display: "flex", flexDirection: "row",
        minHeight: "100vh", background: "var(--surface-0)",
      }}>
        <${ShellRail} projectName=${projectName}
          selectedId=${selectedDoc ? selectedDoc.id : null}
          onOpen=${onOpen} onSelectBoard=${onSelectBoard} />
        <div style=${{
          flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
          background: "var(--surface-0)",
        }}>
          <${BoardTopbar}
            theme=${theme} setTheme=${onThemeChange}
            skipPermissions=${skipPermissions} setSkipPermissions=${onSkipPermissionsChange}
            onStopped=${onStopped} />
          <div style=${{ flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column" }}>
            <div className="scroll-quiet" style=${{ flex: 1, overflowY: "auto", padding: "22px 24px 40px" }}>
              ${selectedDoc
                ? html`<${MainPaneReader} doc=${selectedDoc} />`
                : html`<${DashboardBoard} onOpen=${onOpen} skipPermissions=${skipPermissions} />`}
            </div>
            ${stopped ? html`<${StoppedOverlay} />` : null}
          </div>
        </div>
      </div>
      <${SlideOver} intent=${openIntent} onClose=${onClose} />
    </${ThemeCtx.Provider}>`;
}
