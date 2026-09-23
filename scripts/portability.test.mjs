import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { ROOT, extractRefTokens, parseFrontmatter, skillEntries } from './validate.mjs';

// No marketplace, original checkout, or host-specific environment is needed by an installed skill.
test('standalone skill copies include their references, helpers, and license', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'standalone skills '));
  try {
    for (const { name, dir } of skillEntries()) {
      const installed = join(scratch, '.agents', 'skills', name);
      cpSync(dir, installed, { recursive: true });
      const source = readFileSync(join(installed, 'SKILL.md'), 'utf8');
      assert.equal(parseFrontmatter(source).name, name);
      for (const ref of extractRefTokens(source)) assert.ok(existsSync(join(installed, ref)), `${name}: ${ref}`);
      assert.ok(existsSync(join(installed, 'LICENSE.txt')), `${name}: license travels with the skill`);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('installed builders render from a separate working directory with spaces', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'installed helpers '));
  try {
    const installed = join(scratch, 'skill copy');
    const output = join(scratch, 'audit output');
    cpSync(join(ROOT, 'plugins/ux-deep-dive/skills/ux-deep-dive'), installed, { recursive: true });
    cpSync(join(installed, 'assets/example'), output, { recursive: true });
    for (const [script, input, artifact] of [
      ['build_audit.py', 'audit.json', 'build/audit.html'],
      ['build_motion.py', 'motion.json', 'motion.html'],
    ]) {
      const result = spawnSync('python3', [join(installed, 'assets', script), join(output, input)], { cwd: output, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      assert.ok(existsSync(join(output, artifact)));
    }
    assert.ok(!existsSync(join(installed, 'build')), 'installed resources stay unchanged');
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('preflight distinguishes missing capture dependencies from optional deliverable tools', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'preflight '));
  const python = spawnSync('python3', ['-c', 'import sys; print(sys.executable)'], { encoding: 'utf8' }).stdout.trim();
  const script = join(ROOT, 'plugins/ux-deep-dive/skills/ux-deep-dive/assets/preflight.py');
  mkdirSync(join(scratch, 'empty-path'));
  try {
    const options = { cwd: scratch, encoding: 'utf8', env: { ...process.env, PATH: join(scratch, 'empty-path') } };
    const missing = spawnSync(python, [script, '--platform', 'web', '--json'], options);
    assert.equal(missing.status, 1, missing.stderr);
    const blocked = JSON.parse(missing.stdout);
    assert.equal(blocked.capture.ready, false);
    assert.match(blocked.capture.missing.join(' '), /Node/);
    const browserTool = spawnSync(python, [script, '--platform', 'web', '--browser-tool', '--json'], options);
    assert.equal(browserTool.status, 0, browserTool.stderr);
    const usable = JSON.parse(browserTool.stdout);
    assert.equal(usable.capture.ready, true);
    assert.equal(usable.motion.ready, false);
    assert.match(usable.motion.missing.join(' '), /ffmpeg/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('PDF failures retain the browser startup error before a long crash trace', () => {
  const assets = join(ROOT, 'plugins/ux-deep-dive/skills/ux-deep-dive/assets');
  const result = spawnSync('python3', ['-c', `
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0, sys.argv[1])
from build_audit import to_pdf
failure = SimpleNamespace(returncode=-6, stderr="Browser startup failed: no usable sandbox!\\n" + "stack frame\\n" * 300)
with patch("build_audit.find_chrome", return_value="chrome"), patch("build_audit.subprocess.run", return_value=failure):
    assert to_pdf(Path("audit.html"), Path("audit.pdf"), None) == 1
`, assets], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Browser startup failed: no usable sandbox!/);
});
