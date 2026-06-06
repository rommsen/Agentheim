/* ============================================================
   Agentheim — dashboard universal slide-over (agentic-workflow-007)

   The right-hand detail panel that opens for ANY artifact — a board
   task or a non-task artifact (BC README, vision, context map,
   research, ADR). It is a thin React wrapper around the APPROVED
   styleguide `Drawer` (ADR-0003: imported across the BC boundary,
   never forked) plus the styleguide `Markdown` renderer the Drawer
   already uses internally.

   Behaviour (acceptance criteria aw-007):
   1. Opens on an open-intent (the board's onOpen, aw-006), animating
      in from the right; Esc + scrim-click close it — all inherited
      AS-IS from the styleguide Drawer.
   2. On open it fetches GET /api/doc?path= and the Drawer renders the
      markdown CLIENT-SIDE (styleguide Markdown → marked). No SSR.
   3. Uniform for tasks AND every non-task artifact — only the fetched
      path differs (intentToDrawerItem shapes both identically).
   4. The Drawer itself is the approved styleguide pattern, loaded from
      the committed dist bundle.

   Navigation/library (aw-008), SSE live-update + Promote (aw-009) are
   out of scope; this builds only the panel and wires it to the board's
   existing open-intent seam.
   ============================================================ */
import { useState, useEffect } from "react";

import { html } from "../../.agentheim/contexts/design-system/styleguide/app/html.js";
import { Drawer } from "../../.agentheim/contexts/design-system/styleguide/app/drawer.js";

import { docUrl, intentToDrawerItem } from "./slide-over-data.js";

// The Drawer renders position:absolute inside its nearest positioned ancestor
// (in the styleguide demo, the framed app). On the live dashboard the panel must
// slide over the WHOLE viewport, so this wrapper is a fixed, full-viewport,
// positioned, pointer-transparent layer; the Drawer's own scrim re-enables
// pointer events when open. zIndex sits above the board chrome.
const OVERLAY_STYLE = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  pointerEvents: "none",
};

/**
 * The universal detail slide-over.
 *
 * @param {object|null} intent — the open-intent (clicked task/artifact). Null = closed.
 * @param {() => void} onClose — close sink; the parent clears `intent`.
 * @param {(path: string) => Promise<string>} [fetchDoc] — overridable doc fetcher (tests).
 */
export function SlideOver({ intent, onClose, fetchDoc = defaultFetchDoc }) {
  // `phase` drives the body the Drawer shows while the markdown is in flight.
  const [item, setItem] = useState(null);

  useEffect(() => {
    if (!intent) {
      // Closing: hand the Drawer a null item so it plays its exit animation.
      setItem(null);
      return;
    }
    let alive = true;
    // Show an immediate, quiet loading body so the panel opens without waiting
    // on the network — the Drawer animates in, then the body swaps to the doc.
    setItem(intentToDrawerItem(intent, "_Loading…_"));
    fetchDoc(intent.path)
      .then((md) => { if (alive) setItem(intentToDrawerItem(intent, md)); })
      .catch(() => {
        if (alive) {
          setItem(intentToDrawerItem(
            intent,
            `# Could not load this document\n\nFailed to fetch \`${intent.path}\` from /api/doc.`,
          ));
        }
      });
    return () => { alive = false; };
  }, [intent, fetchDoc]);

  return html`
    <div style=${OVERLAY_STYLE}>
      <div style=${{ position: "absolute", inset: 0, pointerEvents: item ? "auto" : "none" }}>
        <${Drawer} item=${item} headerVariant="contextual" onClose=${onClose} />
      </div>
    </div>`;
}

/** Default doc fetcher: GET /api/doc?path= → raw markdown text (client-side). */
async function defaultFetchDoc(path) {
  const res = await fetch(docUrl(path));
  if (!res.ok) throw new Error(`/api/doc ${res.status}`);
  return res.text();
}
