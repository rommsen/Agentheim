// Long-running server entry (ADR-0002). This is the process spawned DETACHED by
// launch.mjs. It binds 127.0.0.1 on an ephemeral port, reads the OS-assigned
// port back, writes { pid, port, startedAt } to the runfile, and serves until
// killed. Project root is discovered from cwd (the launcher sets cwd) or taken
// from AGENTHEIM_ROOT when provided.

import { discoverRoot } from './discovery.mjs';
import { createDashboardServer, defaultAssetRoot } from './server.mjs';
import { writeRunfile } from './runfile.mjs';

const root = process.env.AGENTHEIM_ROOT
  ? process.env.AGENTHEIM_ROOT
  : discoverRoot(process.cwd());

const server = createDashboardServer({ root, assetRoot: defaultAssetRoot(root) });

server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  writeRunfile(root, { pid: process.pid, port, startedAt: new Date().toISOString() });
  // When attached (parent kept a pipe), announce the URL; harmless when detached.
  process.stdout.write(`Dashboard listening at http://127.0.0.1:${port}/\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
