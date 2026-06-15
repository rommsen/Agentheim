// Deterministic dashboard port derivation (ADR-0002 addendum, infrastructure-018).
//
// PURE, stdlib-only, no DOM, no server — unit-testable in isolation.
//
// The dashboard binds a port derived from the ABSOLUTE project root path so the
// browser origin (127.0.0.1:<port>) is stable across stop+relaunch. That keeps
// the three origin-keyed localStorage stores (theme, board view-state,
// skip-permissions armed toggle) from being orphaned on every relaunch.
//
// Window 41000–42023 (1024-wide): non-privileged, clear of the OS ephemeral
// range (49152+), clear of ADR-0018's bridge band (31425–31427), and clear of
// common dev ports (3000 / 5173 / 8080). On EADDRINUSE the bind walks a bounded
// ladder of 8 that WRAPS within the window (mirrors ADR-0018's collision idiom).

import { createHash } from 'node:crypto';
import path from 'node:path';

/** First port of the derivation window. */
export const PORT_WINDOW_START = 41000;

/** Width of the window (41000–42023 inclusive). */
export const PORT_WINDOW_SIZE = 1024;

/** Bounded ladder length walked on EADDRINUSE, mirroring ADR-0018. */
export const LADDER_LENGTH = 8;

/**
 * Stable, deterministic hash of the resolved absolute root, folded into the
 * window. Uses sha256 (stdlib) so the mapping is fixed across Node versions —
 * unlike the non-portable string hashes some bridges use.
 */
export function derivePort(root) {
  const absolute = path.resolve(root);
  const digest = createHash('sha256').update(absolute).digest();
  // Read 32 unsigned bits and fold into the window; ample entropy for 1024 slots.
  const slot = digest.readUInt32BE(0) % PORT_WINDOW_SIZE;
  return PORT_WINDOW_START + slot;
}

/**
 * The bounded ladder of LADDER_LENGTH ports to try on EADDRINUSE, starting at
 * the derived port and wrapping within the window so every entry stays in-band:
 *   port = 41000 + ((hash(root) mod 1024) + step) mod 1024, step = 0..7.
 */
export function portLadder(root) {
  const base = derivePort(root) - PORT_WINDOW_START;
  const ladder = [];
  for (let step = 0; step < LADDER_LENGTH; step++) {
    ladder.push(PORT_WINDOW_START + ((base + step) % PORT_WINDOW_SIZE));
  }
  return ladder;
}

/**
 * Walk the bounded ladder for `root`, attempting `tryListen(port)` at each
 * rung. `tryListen` must resolve once bound, or reject with an Error whose
 * `code === 'EADDRINUSE'` so the walk advances to the next rung. Any other
 * rejection is fatal (re-thrown immediately — not a collision). When the WHOLE
 * ladder is busy, rejects with a clear error rather than crashing or leaking a
 * process. Resolves with the port that bound.
 *
 * The deterministic port is tried FIRST; when it is free the ladder is never
 * consulted (tryListen is called exactly once).
 */
export async function listenOnLadder(root, tryListen) {
  const ladder = portLadder(root);
  for (const port of ladder) {
    try {
      await tryListen(port);
      return port;
    } catch (err) {
      if (err && err.code === 'EADDRINUSE') continue;
      throw err;
    }
  }
  const err = new Error(
    `Dashboard could not bind: all ${LADDER_LENGTH} ports in the deterministic ` +
      `ladder [${ladder.join(', ')}] are in use.`,
  );
  err.code = 'EADDRINUSE_LADDER_EXHAUSTED';
  throw err;
}
