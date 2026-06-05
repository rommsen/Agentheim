// Project discovery + in-root path validation (ADR-0002).
// Walk up from an invocation directory until a `.agentheim/` folder is found,
// the way git finds `.git`. Resolve an absolute root once; validate every
// served path against it so no request can escape the project.

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Walk up from `startDir` until a directory containing `.agentheim/` is found.
 * Returns the absolute path of that directory. Fails loudly if none is found
 * up to the filesystem root.
 */
export function discoverRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = path.join(dir, '.agentheim');
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `No .agentheim/ project found walking up from ${path.resolve(startDir)} to the filesystem root.`
      );
    }
    dir = parent;
  }
}

/**
 * Resolve a (relative or absolute) request path against `root` and guarantee
 * the result stays inside `root`. Throws on any traversal/escape attempt.
 * The separator check defeats prefix-collision (`/root-evil` vs `/root`).
 */
export function resolveInRoot(root, requestPath) {
  const absRoot = path.resolve(root);
  const cleaned = String(requestPath ?? '').replace(/^[/\\]+/, '');
  const resolved = path.resolve(absRoot, cleaned);
  const withSep = absRoot.endsWith(path.sep) ? absRoot : absRoot + path.sep;
  if (resolved !== absRoot && !resolved.startsWith(withSep)) {
    throw new Error(`Path "${requestPath}" resolves outside the project root (traversal rejected).`);
  }
  return resolved;
}
