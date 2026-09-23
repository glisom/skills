import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  ROOT,
  CHECKS,
  checkAssets,
  checkMarketplace,
  checkNeutrality,
  checkPlugins,
  checkProse,
  checkReferences,
  checkSkills,
  checkTestsExist,
  extractRefTokens,
  parseFrontmatter,
  pluginDirs,
  skillEntries,
} from './validate.mjs';

// ---- fixtures ------------------------------------------------------------------------------------

function addPlugin(root, plugin, skill = plugin, version = '1.0.0') {
  const dir = join(root, 'plugins', plugin);
  mkdirSync(join(dir, '.claude-plugin'), { recursive: true });
  mkdirSync(join(dir, 'skills', skill, 'references'), { recursive: true });
  writeFileSync(join(dir, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: plugin, version, description: 'd' }));
  writeFileSync(join(dir, 'README.md'), '# plugin\n');
  writeFileSync(join(dir, 'CHANGELOG.md'), `# Changelog\n\n## [${version}] - 2026-01-01\n`);
  writeFileSync(join(dir, 'skills', skill, 'SKILL.md'), `---\nname: ${skill}\ndescription: "fine"\n---\n\nSee \`references/guide.md\`.\n`);
  writeFileSync(join(dir, 'skills', skill, 'references', 'guide.md'), '# guide\n');
  return dir;
}

function writeMarketplace(root, plugins) {
  writeFileSync(
    join(root, '.claude-plugin', 'marketplace.json'),
    JSON.stringify({ name: 'fixture', owner: { name: 'Fixture' }, plugins }),
  );
}

function fixtureRepo() {
  const root = mkdtempSync(join(tmpdir(), 'skills-'));
  mkdirSync(join(root, '.claude-plugin'), { recursive: true });
  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(join(root, 'README.md'), '# fixture\n');
  writeFileSync(join(root, 'scripts', 'x.test.mjs'), '');
  writeMarketplace(root, [{ name: 'alpha', source: './plugins/alpha', version: '1.0.0', description: 'd' }]);
  addPlugin(root, 'alpha');
  return root;
}

function withFixture(fn) {
  const root = fixtureRepo();
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeSkill(root, plugin, skill, body) {
  writeFileSync(join(root, 'plugins', plugin, 'skills', skill, 'SKILL.md'), body);
}

// ---- the real repository ---------------------------------------------------------------------------

test('the real repository passes every check', () => {
  assert.deepEqual(CHECKS.flatMap((check) => check(ROOT)), []);
});

test('the real repository ships the expected plugins and one skill each', () => {
  assert.deepEqual(pluginDirs(), ['decide', 'skill-thief', 'ux-deep-dive', 'write-like-grant']);
  assert.deepEqual(
    skillEntries().map((s) => `${s.plugin}/${s.name}`),
    ['decide/decide', 'skill-thief/skill-thief', 'ux-deep-dive/ux-deep-dive', 'write-like-grant/write-like-grant'],
  );
});

test('fixture repository passes every check', () => {
  withFixture((root) => assert.deepEqual(CHECKS.flatMap((check) => check(root)), []));
});

// ---- marketplace ----------------------------------------------------------------------------------

test('a plugin directory without a marketplace entry is reported', () => {
  withFixture((root) => {
    addPlugin(root, 'beta');
    assert.match(checkMarketplace(root).join('\n'), /no entry for plugins\/beta/);
  });
});

test('an entry whose source or directory is wrong is reported', () => {
  withFixture((root) => {
    writeMarketplace(root, [
      { name: 'alpha', source: './alpha', version: '1.0.0', description: 'd' },
      { name: 'ghost', source: './plugins/ghost', version: '1.0.0', description: 'd' },
    ]);
    const errors = checkMarketplace(root).join('\n');
    assert.match(errors, /entry "alpha": source "\.\/alpha" should be "\.\/plugins\/alpha"/);
    assert.match(errors, /entry "ghost": plugins\/ghost\/ does not exist/);
  });
});

test('a marketplace without a kebab-case name or an owner is reported', () => {
  withFixture((root) => {
    writeFileSync(join(root, '.claude-plugin', 'marketplace.json'), JSON.stringify({ name: 'Not Kebab', plugins: [] }));
    const errors = checkMarketplace(root).join('\n');
    assert.match(errors, /name "Not Kebab" is not kebab-case/);
    assert.match(errors, /missing "owner\.name"/);
  });
});

test('a duplicated entry is reported', () => {
  withFixture((root) => {
    const entry = { name: 'alpha', source: './plugins/alpha', version: '1.0.0', description: 'd' };
    writeMarketplace(root, [entry, entry]);
    assert.match(checkMarketplace(root).join('\n'), /listed more than once/);
  });
});

// ---- plugins ------------------------------------------------------------------------------------

test('a marketplace entry version that disagrees with plugin.json is reported', () => {
  withFixture((root) => {
    writeMarketplace(root, [{ name: 'alpha', source: './plugins/alpha', version: '2.0.0', description: 'd' }]);
    assert.match(checkPlugins(root).join('\n'), /version "2\.0\.0" does not match plugin\.json version "1\.0\.0"/);
  });
});

test('plugin.json must exist, name its directory, and carry a semver version', () => {
  withFixture((root) => {
    const manifest = join(root, 'plugins', 'alpha', '.claude-plugin', 'plugin.json');
    writeFileSync(manifest, JSON.stringify({ name: 'other', version: '1.0', description: 'd' }));
    const errors = checkPlugins(root).join('\n');
    assert.match(errors, /name "other" does not match directory "alpha"/);
    assert.match(errors, /version "1\.0" is not MAJOR\.MINOR\.PATCH/);
    rmSync(manifest);
    assert.match(checkPlugins(root).join('\n'), /plugin\.json: missing/);
  });
});

test('the changelog must carry a section for the current version', () => {
  withFixture((root) => {
    writeFileSync(join(root, 'plugins', 'alpha', 'CHANGELOG.md'), '# Changelog\n\n## [0.9.0] - 2025-01-01\n');
    assert.match(checkPlugins(root).join('\n'), /no "## \[1\.0\.0\]" section/);
  });
});

test('a plugin that nests its own marketplace, lacks a README, or has no skills is reported', () => {
  withFixture((root) => {
    const dir = join(root, 'plugins', 'alpha');
    writeFileSync(join(dir, '.claude-plugin', 'marketplace.json'), '{}');
    rmSync(join(dir, 'README.md'));
    rmSync(join(dir, 'skills'), { recursive: true });
    const errors = checkPlugins(root).join('\n');
    assert.match(errors, /must not nest a marketplace/);
    assert.match(errors, /README\.md: missing/);
    assert.match(errors, /skills\/: no skill directories found/);
  });
});

test('a repository without unit tests is reported', () => {
  withFixture((root) => {
    rmSync(join(root, 'scripts'), { recursive: true });
    assert.deepEqual(checkTestsExist(root), ['scripts/: no *.test.mjs files found']);
  });
});

// ---- skill frontmatter ---------------------------------------------------------------------------

test('frontmatter name must match the directory and the description must fit the budget', () => {
  withFixture((root) => {
    writeSkill(root, 'alpha', 'alpha', `---\nname: beta\ndescription: "${'x'.repeat(1100)}"\n---\n`);
    const errors = checkSkills(root).join('\n');
    assert.match(errors, /name "beta" does not match directory "alpha"/);
    assert.match(errors, /description 1100 chars, limit 1024/);
  });
});

test('an empty description and a malformed frontmatter block are reported', () => {
  withFixture((root) => {
    writeSkill(root, 'alpha', 'alpha', '---\nname: alpha\ndescription:\n---\n');
    assert.match(checkSkills(root).join('\n'), /empty description/);
    writeSkill(root, 'alpha', 'alpha', '# no frontmatter\n');
    assert.match(checkSkills(root).join('\n'), /missing or malformed frontmatter/);
  });
});

test('a skill directory name outside the allowed pattern is reported', () => {
  withFixture((root) => {
    const bad = join(root, 'plugins', 'alpha', 'skills', 'Bad_Name');
    mkdirSync(bad, { recursive: true });
    writeFileSync(join(bad, 'SKILL.md'), '---\nname: Bad_Name\ndescription: "d"\n---\n');
    assert.match(checkSkills(root).join('\n'), /directory "Bad_Name" must be lowercase/);
  });
});

// ---- reference and asset paths -------------------------------------------------------------------

test('reference, asset, and script tokens are found in backtick, link, and SKILL_DIR form', () => {
  const tokens = extractRefTokens(
    'Load `references/a.md#x`, run `assets/b.py`, see [c](references/c.md "title"), then node "$SKILL_DIR/scripts/d.mjs".',
  );
  assert.deepEqual(tokens.sort(), ['assets/b.py', 'references/a.md', 'references/c.md', 'scripts/d.mjs']);
});

test('tokens are deduplicated', () => {
  assert.deepEqual(extractRefTokens('`references/a.md` again `references/a.md`'), ['references/a.md']);
});

test('missing references, assets, and scripts are reported', () => {
  withFixture((root) => {
    writeSkill(
      root,
      'alpha',
      'alpha',
      '---\nname: alpha\ndescription: "d"\n---\n\nLoad `references/gone.md`, run `assets/gone.py`, then `python3 "$SKILL_DIR/scripts/gone.py"`.\n',
    );
    const errors = checkReferences(root);
    assert.equal(errors.length, 3);
    assert.match(errors.join('\n'), /references\/gone\.md/);
    assert.match(errors.join('\n'), /assets\/gone\.py/);
    assert.match(errors.join('\n'), /scripts\/gone\.py/);
  });
});

test('a token that escapes the skill directory is reported even when the target exists', () => {
  withFixture((root) => {
    writeFileSync(join(root, 'plugins', 'alpha', 'skills', 'elsewhere.md'), '# elsewhere\n');
    writeSkill(root, 'alpha', 'alpha', '---\nname: alpha\ndescription: "d"\n---\n\nLoad `references/../../elsewhere.md`.\n');
    const errors = checkReferences(root);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /escapes the skill directory/);
  });
});

test('reference files are scanned too', () => {
  withFixture((root) => {
    writeFileSync(join(root, 'plugins', 'alpha', 'skills', 'alpha', 'references', 'guide.md'), 'See `references/nope.md`.\n');
    assert.match(checkReferences(root).join('\n'), /references\/guide\.md: references "references\/nope\.md"/);
  });
});

// ---- neutrality and prose ------------------------------------------------------------------------

test('harness-specific tokens are reported', () => {
  withFixture((root) => {
    writeSkill(root, 'alpha', 'alpha', '---\nname: alpha\ndescription: "d"\n---\n\nRun /loop 10m, read ${CLAUDE_SKILL_DIR}/x and .claude/skills/y.\n');
    assert.equal(checkNeutrality(root).length, 3);
  });
});

test('an em dash is reported with its file and line number, in skills and READMEs alike', () => {
  withFixture((root) => {
    writeSkill(root, 'alpha', 'alpha', '---\nname: alpha\ndescription: "d"\n---\n\nFine line.\nBad — line.\n');
    writeFileSync(join(root, 'plugins', 'alpha', 'README.md'), 'Also — bad.\n');
    const errors = checkProse(root);
    assert.equal(errors.length, 2);
    assert.match(errors.join('\n'), /plugins\/alpha\/README\.md:1: em dash/);
    assert.match(errors.join('\n'), /SKILL\.md:7: em dash/);
  });
});

// ---- assets --------------------------------------------------------------------------------------

test('a broken asset or helper script is reported', () => {
  withFixture((root) => {
    const assets = join(root, 'plugins', 'alpha', 'skills', 'alpha', 'assets');
    const scripts = join(root, 'plugins', 'alpha', 'skills', 'alpha', 'scripts');
    mkdirSync(assets);
    mkdirSync(scripts);
    writeFileSync(join(assets, 'broken.sh'), 'if [ x; then\n');
    writeFileSync(join(scripts, 'broken.py'), 'def (:\n');
    const errors = checkAssets(root).join('\n');
    assert.match(errors, /assets\/broken\.sh: syntax check failed/);
    assert.match(errors, /scripts\/broken\.py: syntax check failed/);
  });
});

// The ux-deep-dive builders are real shipped scripts; render the bundled example through them.
const UX_ASSETS = join(ROOT, 'plugins', 'ux-deep-dive', 'skills', 'ux-deep-dive', 'assets');

function copyExample() {
  const root = mkdtempSync(join(tmpdir(), 'uxdd-'));
  cpSync(join(UX_ASSETS, 'example'), root, { recursive: true });
  // Drop anything a local render may have left in the example folder, so the test sees only the inputs.
  rmSync(join(root, 'build'), { recursive: true, force: true });
  rmSync(join(root, 'motion.html'), { force: true });
  for (const entry of readdirSync(root)) if (entry.endsWith('.pdf')) rmSync(join(root, entry), { force: true });
  return root;
}

function withExample(fn) {
  const root = copyExample();
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('build_audit.py renders the example into the expected number of pages', () => {
  withExample((root) => {
    const result = spawnSync('python3', [join(UX_ASSETS, 'build_audit.py'), join(root, 'audit.json')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const html = readFileSync(join(root, 'build', 'audit.html'), 'utf8');
    const data = JSON.parse(readFileSync(join(root, 'audit.json'), 'utf8'));
    const notes = data.screens.reduce((n, s) => n + s.notes.length, 0);
    const sections = new Set(data.screens.map((s) => s.section)).size;
    const expected = 2 + sections + data.screens.length + Math.max(1, Math.ceil(notes / 20));
    assert.equal((html.match(/class="page/g) || []).length, expected);
    assert.equal((html.match(/class="marker"/g) || []).length, notes);
    assert.ok(html.includes('A1.1'), 'the index carries generated note ids');
    assert.ok(html.includes('<code>motion.html</code>'), 'an explicit companion is included');
    assert.equal(readdirSync(join(root, 'build', 'img')).length, data.screens.length);
  });
});

test('build_audit.py --check reports a missing capture instead of rendering', () => {
  withExample((root) => {
    const data = JSON.parse(readFileSync(join(root, 'audit.json'), 'utf8'));
    data.screens[0].file = 'raw/99-missing.png';
    writeFileSync(join(root, 'audit.json'), JSON.stringify(data));
    const result = spawnSync('python3', [join(UX_ASSETS, 'build_audit.py'), join(root, 'audit.json'), '--check'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /99-missing\.png.*not found/);
    assert.ok(!existsSync(join(root, 'build', 'audit.html')));
  });
});

test('a still-only audit does not advertise a nonexistent motion companion', () => {
  withExample((root) => {
    const input = join(root, 'audit.json');
    const data = JSON.parse(readFileSync(input, 'utf8'));
    delete data.meta.companion;
    writeFileSync(input, JSON.stringify(data));
    const result = spawnSync('python3', [join(UX_ASSETS, 'build_audit.py'), input], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!readFileSync(join(root, 'build/audit.html'), 'utf8').includes('<code>motion.html</code>'));
  });
});

test('build_audit.py rejects an unknown severity and an out-of-range marker', () => {
  withExample((root) => {
    const data = JSON.parse(readFileSync(join(root, 'audit.json'), 'utf8'));
    data.screens[0].notes[0].sev = 'p9';
    data.screens[0].notes[1].x = 140;
    writeFileSync(join(root, 'audit.json'), JSON.stringify(data));
    const result = spawnSync('python3', [join(UX_ASSETS, 'build_audit.py'), join(root, 'audit.json'), '--check'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /sev "p9"/);
    assert.match(result.stderr, /x must be a number from 0 to 100/);
  });
});

test('build_motion.py renders one card per clip', () => {
  withExample((root) => {
    const result = spawnSync('python3', [join(UX_ASSETS, 'build_motion.py'), join(root, 'motion.json')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const html = readFileSync(join(root, 'motion.html'), 'utf8');
    const data = JSON.parse(readFileSync(join(root, 'motion.json'), 'utf8'));
    assert.equal((html.match(/<section class="clip">/g) || []).length, data.clips.length);
    assert.ok(html.includes('What to watch:'));
  });
});

test('original WebM recordings keep their media type without claiming transcoding', () => {
  withExample((root) => {
    const input = join(root, 'motion.json');
    const data = JSON.parse(readFileSync(input, 'utf8'));
    data.clips[0].file = 'motion/original.webm';
    data.clips[1].file = 'motion/original.mov';
    delete data.footer;
    writeFileSync(input, JSON.stringify(data));
    const result = spawnSync('python3', [join(UX_ASSETS, 'build_motion.py'), input], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const html = readFileSync(join(root, 'motion.html'), 'utf8');
    assert.match(html, /original.webm" type="video\/webm"/);
    assert.match(html, /original.mov" type="video\/quicktime"/);
    assert.ok(!html.includes('transcoded to H.264'));
  });
});

// ---- parsing ------------------------------------------------------------------------------------

test('frontmatter parser reads simple fields and rejects bodies without a block', () => {
  assert.deepEqual(parseFrontmatter('---\nname: a\ndescription: "b"\n---\nbody'), { name: 'a', description: 'b' });
  assert.equal(parseFrontmatter('no frontmatter'), null);
});

test('valid YAML frontmatter survives Windows newlines, quoting, and folded descriptions', () => {
  withFixture((root) => {
    writeSkill(root, 'alpha', 'alpha', '---\r\nname: "alpha"\r\ndescription: >-\r\n  Review an app:\r\n  capture its screens.\r\ncompatibility: Requires a browser.\r\nmetadata:\r\n  version: "1.0"\r\n---\r\n');
    assert.deepEqual(checkSkills(root), []);
  });
});

test('invalid YAML and duplicate keys are rejected instead of silently accepted', () => {
  withFixture((root) => {
    for (const fields of [
      'name: alpha\ndescription: "unterminated',
      'name: alpha\ndescription: first\ndescription: second',
      'name: alpha\ndescription: bad: mapping',
    ]) {
      writeSkill(root, 'alpha', 'alpha', `---\n${fields}\n---\n`);
      assert.match(checkSkills(root).join('\n'), /malformed frontmatter/);
    }
  });
});

test('frontmatter field types and optional compatibility budgets are validated', () => {
  withFixture((root) => {
    for (const field of ['description: [one, two]', 'description: 42', 'description: true']) {
      writeSkill(root, 'alpha', 'alpha', `---\nname: alpha\n${field}\n---\n`);
      assert.match(checkSkills(root).join('\n'), /description.*string/);
    }
    for (const field of ['compatibility: 42', `compatibility: "${'x'.repeat(501)}"`, 'metadata: [one, two]', 'metadata:\n  version: 1']) {
      writeSkill(root, 'alpha', 'alpha', `---\nname: alpha\ndescription: Fine\n${field}\n---\n`);
      assert.ok(checkSkills(root).length > 0, field);
    }
  });
});

test('neutrality checks flag additional provider paths and variables in portable instructions', () => {
  withFixture((root) => {
    for (const body of ['Read $CLAUDE_PLUGIN_ROOT/file.', 'Read ~/.codex/skills/my-skill/file.', 'Read C:\\Users\\Grant\\.claude\\skills\\my-skill\\file.']) {
      writeSkill(root, 'alpha', 'alpha', `---\nname: alpha\ndescription: Fine\n---\n${body}\n`);
      assert.ok(checkNeutrality(root).length > 0, body);
    }
  });
});
