// Long-running server entry (ADR-0002). This is the process spawned DETACHED by
// launch.mjs. It binds 127.0.0.1 on a DETERMINISTIC, project-root-derived port
// (ADR-0002 addendum, infrastructure-018) so the browser origin is stable across
// relaunches — keeping the origin-keyed localStorage stores (theme, board
// view-state, skip-permissions) from being orphaned. On EADDRINUSE it walks a
// bounded ladder of 8 within window 41000–42023. It then reads the bound port
// back and writes { pid, port, startedAt } to the runfile, and serves until
// killed. Project root is discovered from cwd (the launcher sets cwd) or taken
// from AGENTHEIM_ROOT when provided.

import { discoverRoot } from './discovery.mjs';
import { createDashboardServer, defaultAssetRoot } from './server.mjs';
import { writeRunfile } from './runfile.mjs';
import { listenOnLadder } from './port.mjs';

const root = process.env.AGENTHEIM_ROOT
  ? process.env.AGENTHEIM_ROOT
  : discoverRoot(process.cwd());

// Asset root is module-relative by default (infrastructure-004): the committed
// dist/ lives beside the dashboard module, NOT under the discovered project root
// (ADR-0004 decouples the two). AGENTHEIM_DASHBOARD_DIST is a dev override seam.
const assetRoot = process.env.AGENTHEIM_DASHBOARD_DIST || defaultAssetRoot();

const server = createDashboardServer({ root, assetRoot });

/**
 * One bind attempt: resolves when the server is listening on `port`, rejects
 * with an EADDRINUSE-coded error so listenOnLadder advances to the next rung.
 * The transient error listener is removed on either outcome so a later runtime
 * error never re-triggers this promise.
 */
function tryListen(port) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.removeListener('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.removeListener('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

try {
  const port = await listenOnLadder(root, tryListen);
  writeRunfile(root, { pid: process.pid, port, startedAt: new Date().toISOString() });
  // When attached (parent kept a pipe), announce the URL; harmless when detached.
  process.stdout.write(`Dashboard listening at http://127.0.0.1:${port}/\n`);
} catch (err) {
  // A genuine third-party collision across the whole ladder (or a fatal bind
  // error): fail loudly and exit cleanly — no orphaned, never-listening process.
  process.stderr.write(`Dashboard failed to bind: ${err.message}\n`);
  process.exit(1);
}

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
