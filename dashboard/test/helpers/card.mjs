// Shared pure helpers for the command-card guards (infrastructure-009).
// Lives outside *.test.mjs so importing it from another test file does NOT
// re-register the guard's tests under `node --test`.

/**
 * Extract every `node ...launch.mjs ...` invocation line from a command-card
 * markdown source. The card puts each runnable command inside a fenced block; we
 * match any line that invokes launch.mjs via node, trimming surrounding whitespace.
 */
export function extractLauncherInvocations(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^node\b.*launch\.mjs\b/.test(line));
}

/** Classify an extracted invocation by its trailing verb (launch is the empty verb). */
export function verbOf(line) {
  const m = line.match(/launch\.mjs(?:["'])?\s*(\w+)?/);
  return (m && m[1]) || 'launch';
}

/** True iff the invocation reaches the launcher via ${CLAUDE_PLUGIN_ROOT...}. */
export function isPluginRooted(line) {
  return /\$\{CLAUDE_PLUGIN_ROOT(?:[:\-].*?)?\}/.test(line);
}
