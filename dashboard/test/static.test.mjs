import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentTypeFor } from '../static.mjs';

test('contentTypeFor maps common dashboard asset extensions', () => {
  assert.equal(contentTypeFor('index.html'), 'text/html; charset=utf-8');
  assert.equal(contentTypeFor('app.js'), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeFor('app.mjs'), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeFor('styles.css'), 'text/css; charset=utf-8');
  assert.equal(contentTypeFor('data.json'), 'application/json; charset=utf-8');
  assert.equal(contentTypeFor('icon.svg'), 'image/svg+xml');
  assert.equal(contentTypeFor('logo.png'), 'image/png');
  assert.equal(contentTypeFor('font.woff2'), 'font/woff2');
});

test('contentTypeFor falls back to octet-stream for unknown extensions', () => {
  assert.equal(contentTypeFor('mystery.zzz'), 'application/octet-stream');
  assert.equal(contentTypeFor('noext'), 'application/octet-stream');
});

test('contentTypeFor is case-insensitive on the extension', () => {
  assert.equal(contentTypeFor('INDEX.HTML'), 'text/html; charset=utf-8');
});
