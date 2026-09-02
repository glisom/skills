import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ROOT,
  checkAssets,
  checkManifests,
  checkNeutrality,
  checkProse,
  checkReferences,
  checkSkills,
  checkTestsExist,
  extractRefTokens,
  parseFrontmatter,
  skillDirs,
} from './validate.mjs';

const SKILL = 'ux-deep-dive';
const ASSETS = join(ROOT, 'skills', SKILL, 'assets');

function scratch() {
  return mkdtempSync(join(tmpdir(), 'uxdd-'));
}

function fakeSkill(root, name, body) {
  const dir = join(root, 'skills', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), body);
  return dir;
}

// ---- manifests ------------------------------------------------------------------------------------

test('the real repo manifests are valid', () => {
  assert.deepEqual(checkManifests(), []);
});

test('a version mismatch between the two manifests is reported', () => {
  const root = scratch();
  mkdirSync(join(root, '.claude-plugin'), { recursive: true });
  writeFileSync(join(root, '.claude-plugin/plugin.json'), JSON.stringify({ name: 'x', version: '1.0.0', description: 'd' }));
  writeFileSync(join(root, '.claude-plugin/marketplace.json'), JSON.stringify({ name: 'x', plugins: [{ name: 'x', source: './', version: '2.0.0' }] }));
  const errors = checkManifests(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /version/);
});

test('a missing plugin.json is reported rather than thrown', () => {
  const root = scratch();
  mkdirSync(join(root, '.claude-plugin'), { recursive: true });
  writeFileSync(join(root, '.claude-plugin/marketplace.json'), JSON.stringify({ plugins: [] }));
  assert.ok(checkManifests(root).some((e) => /plugin\.json.*missing/.test(e)));
});

test('the real repo test files exist', () => {
  assert.deepEqual(checkTestsExist(), []);
});

test('a missing test file is reported', () => {
  const root = scratch();
  mkdirSync(join(root, 'scripts'), { recursive: true });
  const errors = checkTestsExist(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /test\.mjs/);
});

// ---- skill frontmatter ---------------------------------------------------------------------------

test('frontmatter parses single-line key/value pairs', () => {
  const fm = parseFrontmatter('---\nname: demo\ndescription: "A thing"\n---\n\n# Body\n');
  assert.equal(fm.name, 'demo');
  assert.equal(fm.description, '"A thing"');
});

test('frontmatter returns null when the block is unterminated', () => {
  assert.equal(parseFrontmatter('---\nname: demo\n\n# Body\n'), null);
});

test('the real skill passes the frontmatter checks', () => {
  assert.deepEqual(skillDirs(), [SKILL]);
  assert.deepEqual(checkSkills(), []);
});

test('an over-budget description is reported', () => {
  const root = scratch();
  fakeSkill(root, SKILL, `---\nname: ${SKILL}\ndescription: ${'x'.repeat(1100)}\n---\n\n# Body\n`);
  assert.ok(checkSkills(root).some((e) => /1100 chars/.test(e)));
});

test('a name that disagrees with the directory is reported', () => {
  const root = scratch();
  fakeSkill(root, SKILL, '---\nname: wrong\ndescription: d\n---\n\n# Body\n');
  assert.ok(checkSkills(root).some((e) => /"wrong".*"ux-deep-dive"/.test(e)));
});

// ---- reference and asset paths -------------------------------------------------------------------

test('reference and asset tokens are found in backtick and link form', () => {
  const source = 'Load `references/a.md`, run `assets/b.py`, then [the ladder](references/c.md).';
  assert.deepEqual(extractRefTokens(source).sort(), ['assets/b.py', 'references/a.md', 'references/c.md']);
});

test('tokens are deduplicated', () => {
  assert.deepEqual(extractRefTokens('`references/a.md` again `references/a.md`'), ['references/a.md']);
});

test('the real skill has no dangling references or asset paths', () => {
  assert.deepEqual(checkReferences(), []);
});

test('a dangling reference is reported', () => {
  const root = scratch();
  fakeSkill(root, SKILL, 'Load `references/gone.md` and run `assets/gone.py`.\n');
  const errors = checkReferences(root);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /references\/gone\.md/);
  assert.match(errors[1], /assets\/gone\.py/);
});

// ---- neutrality and prose ------------------------------------------------------------------------

test('the real skill body is harness neutral', () => {
  assert.deepEqual(checkNeutrality(), []);
});

test('harness-specific tokens in the body are reported', () => {
  const root = scratch();
  fakeSkill(root, SKILL, 'Run /loop 10m and read ${CLAUDE_SKILL_DIR}/x and .claude/skills/y.\n');
  assert.equal(checkNeutrality(root).length, 3);
});

test('the shipped prose has no em dashes', () => {
  assert.deepEqual(checkProse(), []);
});

test('an em dash is reported with its line number', () => {
  const root = scratch();
  fakeSkill(root, SKILL, '---\nname: x\ndescription: d\n---\n\nFine line.\nBad \u2014 line.\n');
  const errors = checkProse(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /SKILL\.md:7: em dash/);
});

// ---- assets --------------------------------------------------------------------------------------

test('the real asset scripts parse and the bundled example validates', () => {
  assert.deepEqual(checkAssets(), []);
});

test('a broken asset script is reported', () => {
  const root = scratch();
  const dir = join(root, 'skills', SKILL, 'assets');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'broken.sh'), 'if [ x; then\n');
  assert.ok(checkAssets(root).some((e) => /broken\.sh: syntax check failed/.test(e)));
});

function copyExample() {
  const root = scratch();
  cpSync(join(ASSETS, 'example'), root, { recursive: true });
  // Drop anything a local render may have left in the example folder, so the test sees only the inputs.
  rmSync(join(root, 'build'), { recursive: true, force: true });
  rmSync(join(root, 'motion.html'), { force: true });
  for (const entry of readdirSync(root)) if (entry.endsWith('.pdf')) rmSync(join(root, entry), { force: true });
  return root;
}

test('build_audit.py renders the example into the expected number of pages', () => {
  const root = copyExample();
  const result = spawnSync('python3', [join(ASSETS, 'build_audit.py'), join(root, 'audit.json')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const html = readFileSync(join(root, 'build', 'audit.html'), 'utf8');
  const data = JSON.parse(readFileSync(join(root, 'audit.json'), 'utf8'));
  const notes = data.screens.reduce((n, s) => n + s.notes.length, 0);
  const sections = new Set(data.screens.map((s) => s.section)).size;
  const expected = 2 + sections + data.screens.length + Math.max(1, Math.ceil(notes / 20));
  assert.equal((html.match(/class="page/g) || []).length, expected);
  assert.equal((html.match(/class="marker"/g) || []).length, notes);
  assert.ok(html.includes('A1.1'), 'the index carries generated note ids');
  assert.equal(readdirSync(join(root, 'build', 'img')).length, data.screens.length);
});

test('build_audit.py --check reports a missing capture instead of rendering', () => {
  const root = copyExample();
  const data = JSON.parse(readFileSync(join(root, 'audit.json'), 'utf8'));
  data.screens[0].file = 'raw/99-missing.png';
  writeFileSync(join(root, 'audit.json'), JSON.stringify(data));
  const result = spawnSync('python3', [join(ASSETS, 'build_audit.py'), join(root, 'audit.json'), '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /99-missing\.png.*not found/);
  assert.ok(!existsSync(join(root, 'build', 'audit.html')));
});

test('build_audit.py rejects an unknown severity and an out-of-range marker', () => {
  const root = copyExample();
  const data = JSON.parse(readFileSync(join(root, 'audit.json'), 'utf8'));
  data.screens[0].notes[0].sev = 'p9';
  data.screens[0].notes[1].x = 140;
  writeFileSync(join(root, 'audit.json'), JSON.stringify(data));
  const result = spawnSync('python3', [join(ASSETS, 'build_audit.py'), join(root, 'audit.json'), '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /sev "p9"/);
  assert.match(result.stderr, /x must be a number from 0 to 100/);
});

test('build_motion.py renders one card per clip', () => {
  const root = copyExample();
  const result = spawnSync('python3', [join(ASSETS, 'build_motion.py'), join(root, 'motion.json')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const html = readFileSync(join(root, 'motion.html'), 'utf8');
  const data = JSON.parse(readFileSync(join(root, 'motion.json'), 'utf8'));
  assert.equal((html.match(/<section class="clip">/g) || []).length, data.clips.length);
  assert.ok(html.includes('What to watch:'));
});
