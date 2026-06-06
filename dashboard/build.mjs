#!/usr/bin/env node
// Dashboard asset build (infrastructure-002, ADR-0003 / ADR-0002).
//
// Consumes the design-system styleguide ES-module source (the SINGLE source of
// truth — read-only here, never copied or forked) and emits a COMMITTED
// dashboard/dist/ that ADR-0002's static handler serves directly.
//
//   esbuild bundles React (production) / ReactDOM / marked / htm IN, transforms
//   at build time, minifies. No runtime CDN for the framework, no in-browser
//   Babel, no import map. One command regenerates dist/:
//
//       cd dashboard && npm install && npm run build
//
// esbuild is a BUILD-TIME dependency only — never installed or invoked to RUN
// the dashboard.

import { build } from 'esbuild';
import { mkdir, rm, writeFile, copyFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// dashboard/ -> repo root -> styleguide source (single source of truth).
const REPO_ROOT = path.resolve(__dirname, '..');
const STYLEGUIDE = path.join(
  REPO_ROOT,
  '.agentheim', 'contexts', 'design-system', 'styleguide',
);
const ENTRY = path.join(STYLEGUIDE, 'app', 'app.js');
const STYLES_DIR = path.join(STYLEGUIDE, 'styles');
const FONTS_DIR = path.join(STYLES_DIR, 'fonts');
const DIST = path.join(__dirname, 'dist');

const CSS_FILES = ['colors_and_type.css', 'agentheim.css'];
const BUNDLE_NAME = 'app.js';

// index.html shell — reproduces styleguide/index.html (head, token CSS order,
// #root, dark-first) but loads LOCAL css + the BUNDLED js instead of the import
// map + esm.sh. No CDN/import-map/Babel for the framework.
function indexHtml() {
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Agentheim — Dashboard</title>
  <link rel="stylesheet" href="./colors_and_type.css" />
  <link rel="stylesheet" href="./agentheim.css" />
  <style>
    html, body { margin: 0; padding: 0; min-height: 100%; }
    body { background: var(--surface-0); color: var(--fg-1); }
    *, *::before, *::after { box-sizing: border-box; }
    button { font-family: inherit; }
    ::selection { background: var(--accent-ochre-soft); color: var(--fg-1); }
  </style>

  <!--
    Pre-bundled dashboard assets (infrastructure-002, ADR-0003 / ADR-0002).
    The styleguide ES-module source (.agentheim/contexts/design-system/
    styleguide/app/*.js) is bundled by esbuild into ./${BUNDLE_NAME} with
    React (production) / ReactDOM / marked / htm bundled IN. No import map and
    no remote framework script: the UI loads offline from this committed dist/.
    Regenerate with:  cd dashboard && npm install && npm run build
  -->
</head>
<body>
  <div id="root"></div>

  <script type="module" src="./${BUNDLE_NAME}"></script>
</body>
</html>
`;
}

async function main() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  // Bundle the styleguide entry. esbuild resolves react / react-dom/client /
  // marked / htm from dashboard/node_modules at build time and inlines them.
  await build({
    entryPoints: [ENTRY],
    outfile: path.join(DIST, BUNDLE_NAME),
    bundle: true,
    // The styleguide source lives OUTSIDE dashboard/, so esbuild's default
    // node_modules walk (rooted at each importing file) never reaches our
    // build-time deps. nodePaths points the resolver at dashboard/node_modules
    // for the bare specifiers (react, react-dom/client, marked, htm) without
    // touching or copying the source.
    nodePaths: [path.join(__dirname, 'node_modules')],
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    // Select React's PRODUCTION build (drops dev-only warnings/DCE).
    define: { 'process.env.NODE_ENV': '"production"' },
    legalComments: 'none',
    logLevel: 'warning',
  });

  // Copy the token CSS (single source of truth — referenced, not edited).
  for (const css of CSS_FILES) {
    await copyFile(path.join(STYLES_DIR, css), path.join(DIST, css));
  }

  // Copy the vendored webfonts (design-system-003). The token CSS @font-face
  // rules reference url('fonts/<file>.woff2') relative to the CSS. The CSS is
  // copied to dist root (flat), so the fonts must sit at dist/fonts/ for that
  // relative path to resolve when served from dashboard/dist/. Mirrors the CSS
  // copy above — the woff2 (+ OFL licenses) remain owned by design-system; this
  // pipeline only relocates them into the derived dist artifact.
  await cp(FONTS_DIR, path.join(DIST, 'fonts'), { recursive: true });

  // Emit the HTML shell.
  await writeFile(path.join(DIST, 'index.html'), indexHtml(), 'utf8');

  process.stdout.write(`Built dashboard/dist/ (${BUNDLE_NAME} + ${CSS_FILES.join(', ')} + fonts/ + index.html)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
