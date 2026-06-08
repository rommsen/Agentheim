// Read projection of the project's `.agentheim/` tree (agentic-workflow-005,
// ADR-0002). Walks the discovered root and projects, for the dashboard's read
// views (board aw-006, slide-over aw-007, navigation aw-008, SSE consumer aw-009):
//   - every BC, its four lifecycle folders, and each task's frontmatter
//     (id, title, status, type, context, path, mtimeMs) — POINTERS + METADATA only,
//   - the LOCATIONS of vision / context-map / BC READMEs+INDEXes+concepts /
//     research reports / ADRs.
// No document bodies cross this boundary — /api/doc carries those. "Disk is the
// source of truth; the tree is a projection" — this module never writes and never
// interprets a lifecycle move (aw-009 owns interpretation).

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const LIFECYCLE_FOLDERS = ['backlog', 'todo', 'doing', 'done'];

// Frontmatter keys the projection surfaces. Everything else in the frontmatter is
// deliberately dropped — the board only needs to label and sort cards.
const TASK_FIELDS = ['id', 'title', 'status', 'type', 'context'];

/** Project-root-relative, forward-slashed path for a file inside the project. */
function relPointer(root, abs) {
  return path.relative(root, abs).split(path.sep).join('/');
}

/** List `.md` files directly in `dir` (non-recursive), sorted, abs paths. */
function listMarkdown(dir) {
  if (!existsSync(dir)) return [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map((e) => path.join(dir, e.name))
    .sort();
}

/**
 * Parse the leading `---`-fenced YAML-ish frontmatter of a markdown file into a
 * flat string map. Intentionally tiny (no YAML dep, stdlib-only per ADR-0002):
 * handles `key: value` and simple `[a, b]` lists, which is all task frontmatter
 * uses. Malformed or missing frontmatter yields `{}` — the caller degrades
 * gracefully rather than aborting the walk.
 */
export function parseFrontmatter(text) {
  const src = String(text ?? '');
  if (!src.startsWith('---')) return {};
  // Find the closing fence on its own line.
  const lines = src.split(/\r?\n/);
  if (lines[0].trim() !== '---') return {};
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return {}; // unterminated fence → no frontmatter
  const fm = {};
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_-]+):\s?(.*)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    fm[key] = value;
  }
  return fm;
}

/**
 * Project a single task file into the tree shape. Never throws: an unreadable or
 * frontmatter-less file still produces a card with a filename-derived id so the
 * board can show it. No document body is ever included.
 */
export function projectTask(root, absFile, folder, bcName) {
  let fm = {};
  try {
    fm = parseFrontmatter(readFileSync(absFile, 'utf8'));
  } catch {
    fm = {};
  }
  const base = path.basename(absFile);
  // Filename convention is `<id>-<slug>.md`; derive a fallback id from it.
  const fallbackId = base.replace(/\.md$/i, '');
  // mtimeMs is per-task METADATA within ADR-0002's pointers+metadata contract
  // (not a document body), carried so the board can sort by modification date
  // (aw-012). A stat failure degrades to null and never aborts the walk — same
  // posture as frontmatter parsing above.
  let mtimeMs = null;
  try {
    mtimeMs = statSync(absFile).mtimeMs;
  } catch {
    mtimeMs = null;
  }
  const task = {
    id: typeof fm.id === 'string' && fm.id ? fm.id : fallbackId,
    title: typeof fm.title === 'string' ? fm.title : '',
    // status falls back to the owning folder — disk is the source of truth.
    status: typeof fm.status === 'string' && fm.status ? fm.status : folder,
    type: typeof fm.type === 'string' ? fm.type : '',
    context: typeof fm.context === 'string' && fm.context ? fm.context : bcName,
    path: relPointer(root, absFile),
    mtimeMs,
  };
  return task;
}

/** Project one bounded-context folder. */
function projectContext(root, bcDir, bcName) {
  const lifecycle = {};
  for (const folder of LIFECYCLE_FOLDERS) {
    const dir = path.join(bcDir, folder);
    lifecycle[folder] = listMarkdown(dir).map((abs) =>
      projectTask(root, abs, folder, bcName)
    );
  }
  const readmePath = path.join(bcDir, 'README.md');
  const indexPath = path.join(bcDir, 'INDEX.md');
  const conceptsDir = path.join(bcDir, 'concepts');
  return {
    name: bcName,
    readme: existsSync(readmePath) ? relPointer(root, readmePath) : null,
    index: existsSync(indexPath) ? relPointer(root, indexPath) : null,
    concepts: listMarkdown(conceptsDir).map((abs) => relPointer(root, abs)),
    lifecycle,
  };
}

/**
 * Build the full read projection for the project rooted at `root` (the directory
 * holding `.agentheim/`). Pure read; returns a plain JSON-serializable object.
 */
export function buildTree(root) {
  const absRoot = path.resolve(root);
  const ah = path.join(absRoot, '.agentheim');

  const visionPath = path.join(ah, 'vision.md');
  const contextMapPath = path.join(ah, 'context-map.md');
  const adrsDir = path.join(ah, 'knowledge', 'decisions');
  const researchDir = path.join(ah, 'knowledge', 'research');

  const contextsDir = path.join(ah, 'contexts');
  let bcNames = [];
  if (existsSync(contextsDir)) {
    try {
      bcNames = readdirSync(contextsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
    } catch {
      bcNames = [];
    }
  }

  const contexts = bcNames.map((name) =>
    projectContext(absRoot, path.join(contextsDir, name), name)
  );

  return {
    root: absRoot,
    locations: {
      vision: existsSync(visionPath) ? relPointer(absRoot, visionPath) : null,
      contextMap: existsSync(contextMapPath) ? relPointer(absRoot, contextMapPath) : null,
      adrs: listMarkdown(adrsDir).map((abs) => relPointer(absRoot, abs)),
      research: listMarkdown(researchDir).map((abs) => relPointer(absRoot, abs)),
    },
    contexts,
  };
}
