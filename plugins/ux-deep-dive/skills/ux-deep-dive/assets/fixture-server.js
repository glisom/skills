#!/usr/bin/env node
/**
 * fixture-server.js: a dependency-free stand-in for the app's backend, so every data-driven screen renders
 * with plausible synthetic content instead of an error state.
 *
 * Copy this file into the audit's build/ folder, then:
 *   1. Set PORT and PREFIX to what the app expects (its API base URL).
 *   2. Fill ROUTES with the paths the app calls. Take the response shapes from the app's own hooks and
 *      types, field for field, including the envelope ({ data: ... } or a bare body). An envelope mismatch
 *      is where fake findings come from.
 *   3. Keep one persona across every route, obviously synthetic, with dates computed from now.
 *   4. Put the edge states in on purpose: an empty list, a failed item, a pending item, an inactive item,
 *      an unknown value.
 *   5. Watch the log while walking. Every "unmatched" line is a shape the fixture still owes.
 *
 * Run: node fixture-server.js
 */
const http = require('http');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3006);
const PREFIX = process.env.PREFIX || '/api/v1';

const iso = (d) => new Date(d).toISOString();
const daysAgo = (n) => iso(Date.now() - n * 86400000);
const daysAhead = (n) => iso(Date.now() + n * 86400000);

// ---------------------------------------------------------------------------------------------------
// One persona, everywhere. Obviously synthetic.
// ---------------------------------------------------------------------------------------------------
const PERSONA = {
  id: 'usr_sample_001',
  first_name: 'Jordan',
  last_name: 'Sample',
  email: 'jordan.sample@example.com',
  phone: '+15555550142',
  created_at: daysAgo(214),
};

const ITEMS = [
  { id: 'itm_1', title: 'Office visit (sample)', status: 'complete', amount: 33.6, date: daysAgo(12) },
  { id: 'itm_2', title: 'Lab panel (sample)', status: 'pending', amount: 96.5, date: daysAgo(5) },
  { id: 'itm_3', title: 'Imaging (sample)', status: 'failed', amount: null, date: daysAgo(63) }, // unknown value on purpose
  { id: 'itm_4', title: 'Prescription (sample)', status: 'inactive', amount: 22.0, date: daysAgo(400) },
];

// ---------------------------------------------------------------------------------------------------
// Routes: [method, path or RegExp, handler(match, url, body) => response]
// A handler may return null for a 204, or { __status: 401, ...body } to force a status code.
// ---------------------------------------------------------------------------------------------------
const ROUTES = [
  ['GET', '/me', () => ({ data: PERSONA })],
  ['GET', '/items', (m, url) => {
    const status = url.searchParams.get('status');
    return { data: status ? ITEMS.filter((i) => i.status === status) : ITEMS };
  }],
  ['GET', /^\/items\/(?<id>[^/]+)$/, (m) => {
    const item = ITEMS.find((i) => i.id === m.groups.id);
    return item ? { data: item } : { __status: 404, error: 'not found' };
  }],
  ['GET', '/notifications', () => ({ data: [] })], // the empty state, on purpose
  ['GET', '/next-appointment', () => ({ data: { id: 'apt_1', scheduled_at: daysAhead(9), with: 'A. Osei, MD (sample)' } })],
  ['POST', '/items', (m, url, body) => ({ data: { id: `itm_${ITEMS.length + 1}`, ...body, status: 'pending', date: iso(Date.now()) } })],
];

function matchRoute(method, path) {
  for (const [m, pattern, handler] of ROUTES) {
    if (m !== method) continue;
    if (typeof pattern === 'string' && pattern === path) return { handler, match: null };
    if (pattern instanceof RegExp) {
      const match = pattern.exec(path);
      if (match) return { handler, match };
    }
  }
  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return; }

  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    let body = {};
    if (raw) { try { body = JSON.parse(raw); } catch { body = { raw }; } }
    const path = url.pathname.startsWith(PREFIX) ? url.pathname.slice(PREFIX.length) || '/' : url.pathname;
    const route = matchRoute(req.method, path);
    if (!route) {
      console.log(`  x  404 ${req.method} ${url.pathname}   <- unmatched: the app expects a shape here`);
      res.writeHead(404, headers);
      res.end(JSON.stringify({ error: 'fixture: no route', path }));
      return;
    }
    const result = route.handler(route.match, url, body);
    if (result === null || result === undefined) { res.writeHead(204, headers); res.end(); console.log(`  -  204 ${req.method} ${url.pathname}`); return; }
    const { __status: status = 200, ...payload } = result;
    console.log(`  ${status < 400 ? 'ok' : '!!'} ${status} ${req.method} ${url.pathname}`);
    res.writeHead(status, headers);
    res.end(JSON.stringify(payload));
  });
});

server.listen(PORT, () => {
  console.log(`fixture server on http://localhost:${PORT}${PREFIX}  (${ROUTES.length} routes; synthetic data only)`);
});
