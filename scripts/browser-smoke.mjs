import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import { ROOT } from './validate.mjs';

const exec = promisify(execFile);
const pdfBrowser = process.env.CHROME_BIN || chromium.executablePath();

test('standalone web capture uses scratch dependencies and produces screenshots, video, and PDF', { timeout: 90000 }, async () => {
  const scratch = mkdtempSync(join(tmpdir(), 'uxdd browser '));
  const installed = join(scratch, 'installed skill');
  const output = join(scratch, 'audit output');
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<html><body><h1>${req.url === '/settings' ? 'Settings' : 'Home'}</h1>${req.url === '/settings' ? '<script>console.error("fixture error evidence")</script>' : ''}</body></html>`);
  });
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    cpSync(join(ROOT, 'plugins/ux-deep-dive/skills/ux-deep-dive'), installed, { recursive: true });
    mkdirSync(output);
    // External packages belong to the scratch project, never to the installed skill folder.
    symlinkSync(join(ROOT, 'node_modules'), join(output, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    writeFileSync(join(output, 'package.json'), '{"private":true}\n');
    writeFileSync(join(output, 'routes.txt'), '/\n/settings\n');
    const preflight = await exec('python3', [join(installed, 'assets/preflight.py'), '--platform', 'web', '--json', '--chrome', pdfBrowser], { cwd: output });
    const readiness = JSON.parse(preflight.stdout);
    assert.equal(readiness.capture.ready, true);
    assert.equal(readiness.pdf.ready, true);
    await exec(process.execPath, [join(installed, 'assets/web-capture.mjs'),
      '--base', `http://127.0.0.1:${server.address().port}`, '--routes', 'routes.txt',
      '--out', 'raw', '--viewport', '240x320', '--wait', '0', '--video', 'motion/walk.webm',
    ], { cwd: output, timeout: 30000 });
    for (const file of ['01-home.png', '02-settings.png']) {
      const png = readFileSync(join(output, 'raw', file));
      assert.equal(png.subarray(1, 4).toString(), 'PNG');
      assert.equal(png.readUInt32BE(16), 240);
      assert.equal(png.readUInt32BE(20), 320);
    }
    assert.match(readFileSync(join(output, 'build/web-console.log'), 'utf8'), /fixture error evidence/);
    assert.ok(readFileSync(join(output, 'motion/walk.webm')).length > 0);

    const audit = { title: 'Portable', meta: {}, sections: [{ id: 'A', title: 'Web', blurb: 'Smoke test' }],
      screens: [{ section: 'A', title: 'Home', file: 'raw/01-home.png', notes: [{ sev: 'keep', x: 50, y: 50, text: 'Visible heading.' }] }] };
    writeFileSync(join(output, 'build/audit.json'), JSON.stringify(audit));
    await exec('python3', [join(installed, 'assets/build_audit.py'), join(output, 'build/audit.json'),
      '--pdf', '--no-downscale', '--chrome', pdfBrowser,
    ], { cwd: output, timeout: 45000 });
    const pdf = readFileSync(join(output, 'Portable-UX-Audit.pdf'));
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
    assert.ok(!existsSync(join(installed, 'raw')));
    assert.ok(!existsSync(join(installed, 'build')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(scratch, { recursive: true, force: true });
  }
});
