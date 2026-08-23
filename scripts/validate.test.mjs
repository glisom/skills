import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkManifests, checkTestsExist } from './validate.mjs';

test('the real repo manifests are valid', () => {
  assert.deepEqual(checkManifests(), []);
});

test('a version mismatch between the two manifests is reported', () => {
  const root = mkdtempSync(join(tmpdir(), 'st-'));
  mkdirSync(join(root, '.claude-plugin'), { recursive: true });
  writeFileSync(
    join(root, '.claude-plugin/plugin.json'),
    JSON.stringify({ name: 'x', version: '1.0.0', description: 'd' }),
  );
  writeFileSync(
    join(root, '.claude-plugin/marketplace.json'),
    JSON.stringify({ name: 'x', plugins: [{ name: 'x', source: './', version: '2.0.0' }] }),
  );
  const errors = checkManifests(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /version/);
});

test('a missing plugin.json is reported rather than thrown', () => {
  const root = mkdtempSync(join(tmpdir(), 'st-'));
  mkdirSync(join(root, '.claude-plugin'), { recursive: true });
  writeFileSync(join(root, '.claude-plugin/marketplace.json'), JSON.stringify({ plugins: [] }));
  const errors = checkManifests(root);
  assert.ok(errors.some((e) => /plugin\.json.*missing/.test(e)));
});

test('the real repo test files exist', () => {
  assert.deepEqual(checkTestsExist(), []);
});

test('a missing test file is reported', () => {
  const root = mkdtempSync(join(tmpdir(), 'st-'));
  mkdirSync(join(root, 'scripts'), { recursive: true });
  const errors = checkTestsExist(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /test\.mjs/);
});
