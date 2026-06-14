// Agentheim VS Code bridge extension — activation glue (ADR-0018).
//
// This file is the ONLY part that touches the `vscode` API. All contractual
// logic (loopback bind, fallback ladder, per-activation token, bridge.json
// discovery file, body/CORS handling) lives in ./src/bridge.js, which is pure
// and unit-tested without the editor. Here we just wire the injected
// terminal-launch action to `vscode.window.createTerminal`.

const vscode = require('vscode');
const path = require('node:path');
const { existsSync, statSync } = require('node:fs');
const { startBridge } = require('./src/bridge.js');

/** Walk up from a start dir to the nearest `.agentheim/` holder (ADR-0002). */
function discoverRoot(startDir) {
  let dir = path.resolve(startDir);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = path.join(dir, '.agentheim');
    if (existsSync(candidate) && statSync(candidate).isDirectory()) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Resolve the Agentheim project root from the open workspace, if any. */
function resolveRoot() {
  const folders = vscode.workspace.workspaceFolders || [];
  for (const f of folders) {
    const root = discoverRoot(f.uri.fsPath);
    if (root) return root;
  }
  return null;
}

let bridge = null;

async function activate(context) {
  const root = resolveRoot();
  if (!root) {
    // No Agentheim project open: nothing to bridge. The frontend treats an
    // absent bridge as a normal mode (clipboard fallback), so we stay quiet.
    return;
  }

  // The single editor seam: open a real, visible, interactive terminal and
  // seed it with the `claude "<prompt>"` command the bridge built. We never
  // hard-wire any permission-bypass flag (ADR-0018) — `command` is used as-is.
  const launchTerminal = (command) => {
    const terminal = vscode.window.createTerminal({ name: 'Claude', cwd: root });
    terminal.show();
    terminal.sendText(command);
  };

  try {
    bridge = await startBridge({ root, launchTerminal });
    context.subscriptions.push({ dispose: () => bridge && bridge.close() });
    console.log(`[agentheim-bridge] listening on 127.0.0.1:${bridge.port}`);
  } catch (err) {
    vscode.window.showWarningMessage(
      `Agentheim bridge could not start (ports 31425-31427 busy?): ${err && err.message}`
    );
  }
}

function deactivate() {
  // Remove/invalidate bridge.json and close the listener so a dead host leaves
  // no live discovery file behind (ADR-0018 deactivation contract).
  if (bridge) {
    bridge.close();
    bridge = null;
  }
}

module.exports = { activate, deactivate };
