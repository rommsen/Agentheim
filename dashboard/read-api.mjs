// Dashboard read endpoints (agentic-workflow-005, ADR-0002):
//   GET /api/tree          — the BC × lifecycle × task projection + artifact
//                            locations (pointers/metadata, never bodies).
//   GET /api/doc?path=<rel> — raw markdown for one in-root artifact; a validated
//                            file carrier (rendering is client-side, aw-007).
// Both are PURE READS. Path safety reuses the aw-004 root guard (resolveInRoot:
// path.resolve + startsWith(root)) so no request escapes the project.

import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolveInRoot } from './discovery.mjs';
import { buildTree } from './tree.mjs';

/** GET /api/tree — serialize the read projection of the discovered root. */
export function handleTree(req, res, root) {
  let body;
  try {
    body = JSON.stringify(buildTree(root));
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Failed to build tree projection: ${err.message}`);
    return;
  }
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  res.end(body);
}

/**
 * GET /api/doc?path=<.agentheim-relative-or-project-relative path> — stream the
 * raw markdown of one in-root file. Validates the requested path against the
 * project root; an escaping path is rejected 403 and touches no file.
 */
export function handleDoc(req, res, root, requestUrl) {
  const rawPath = requestUrl.searchParams.get('path');
  if (!rawPath) {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Missing required query parameter: path');
    return;
  }

  let target;
  try {
    target = resolveInRoot(root, rawPath);
  } catch {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden: path traversal rejected');
    return;
  }

  if (!existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(target).pipe(res);
}
