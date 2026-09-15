#!/usr/bin/env node
// web-capture.mjs: bulk-capture a list of routes with Playwright, one numbered PNG per route.
//
// Usage:
//   node web-capture.mjs --base http://localhost:3000 --routes build/routes.txt --out raw
//        [--viewport 390x844] [--device "iPhone 13"] [--dark] [--full-page]
//        [--storage build/state.json] [--video motion/walk.webm] [--wait 1500] [--log build/web-console.log]
//
// routes.txt is one path per line; blank lines and lines starting with # are ignored.
// Writes NN-<slug>.png per route (and NN-<slug>-full.png with --full-page), appends console errors,
// page errors, failed requests, and 4xx/5xx responses per route to the log, and records the whole walk
// as one WebM when --video is given.
//
// Requires the playwright package resolvable from the current directory:
//   npm i -D playwright && npx playwright install chromium
import { createRequire } from 'node:module';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

function parseArgs(argv) {
  const out = { wait: 1500, out: 'raw', log: 'build/web-console.log', viewport: '390x844' };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    const flag = ['dark', 'full-page'].includes(name);
    out[name] = flag ? true : argv[i + 1];
    if (!flag) i += 1;
  }
  return out;
}

function slugify(route) {
  const s = route.replace(/^\/+|\/+$/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return s || 'home';
}

function nextNumber(dir) {
  if (!existsSync(dir)) return 1;
  const nums = readdirSync(dir).map((f) => /^(\d{2})-/.exec(f)).filter(Boolean).map((m) => Number(m[1]));
  return nums.length ? Math.max(...nums) + 1 : 1;
}

const args = parseArgs(process.argv.slice(2));
if (!args.base || !args.routes) {
  console.error('usage: web-capture.mjs --base <url> --routes <file> [--out raw] [--viewport WxH] [--device name] [--dark] [--full-page] [--storage state.json] [--video out.webm] [--wait ms] [--log file]');
  process.exit(2);
}

const require = createRequire(join(process.cwd(), 'package.json'));
let playwright;
try {
  playwright = require('playwright');
} catch {
  console.error('playwright not found here: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}
const { chromium, devices } = playwright;

const routes = readFileSync(args.routes, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));
if (!routes.length) {
  console.error(`no routes in ${args.routes}`);
  process.exit(2);
}

mkdirSync(args.out, { recursive: true });
mkdirSync(dirname(args.log), { recursive: true });
const [vw, vh] = String(args.viewport).split('x').map(Number);
const videoDir = args.video ? join(tmpdir(), `uxdd-video-${Date.now()}`) : null;

const contextOptions = {
  colorScheme: args.dark ? 'dark' : 'light',
  ...(args.device ? devices[args.device] : { viewport: { width: vw, height: vh } }),
  ...(args.storage ? { storageState: args.storage } : {}),
  ...(videoDir ? { recordVideo: { dir: videoDir, size: args.device ? undefined : { width: vw, height: vh } } } : {}),
};
if (args.device && !devices[args.device]) {
  console.error(`unknown device "${args.device}"; see playwright's device list`);
  process.exit(2);
}

const browser = await chromium.launch();
const context = await browser.newContext(contextOptions);
const page = await context.newPage();

let events = [];
page.on('console', (m) => { if (m.type() === 'error') events.push(`console.error: ${m.text()}`); });
page.on('pageerror', (e) => events.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => events.push(`requestfailed: ${r.method()} ${r.url()} (${r.failure()?.errorText ?? ''})`));
page.on('response', (r) => { if (r.status() >= 400) events.push(`http ${r.status()}: ${r.request().method()} ${r.url()}`); });

let n = nextNumber(args.out);
const base = String(args.base).replace(/\/+$/, '');
for (const route of routes) {
  events = [];
  const url = route.startsWith('http') ? route : `${base}${route.startsWith('/') ? '' : '/'}${route}`;
  const name = `${String(n).padStart(2, '0')}-${slugify(route)}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  } catch (err) {
    events.push(`goto: ${err.message.split('\n')[0]}`);
  }
  await page.waitForTimeout(Number(args.wait));
  const file = join(args.out, `${name}.png`);
  await page.screenshot({ path: file });
  if (args['full-page']) await page.screenshot({ path: join(args.out, `${name}-full.png`), fullPage: true });
  const lines = [`## ${name}  ${url}`, ...(events.length ? events : ['(clean: no console errors, page errors, or failed requests)']), ''];
  appendFileSync(args.log, `${lines.join('\n')}\n`);
  console.log(`${file}  ${events.length ? `${events.length} event(s) logged` : 'clean'}`);
  n += 1;
}

if (videoDir) {
  const video = page.video();
  await context.close();
  const recorded = await video.path();
  mkdirSync(dirname(resolve(args.video)), { recursive: true });
  renameSync(recorded, resolve(args.video));
  console.log(`video: ${args.video} (transcode to mp4 with ffmpeg before it goes in motion.html)`);
} else {
  await context.close();
}
await browser.close();
console.log(`log: ${args.log}`);
