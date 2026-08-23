# skill-thief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `glisom/skill-thief` as an installable Claude Code plugin whose single harness-neutral skill body evaluates an external agent-tooling source and routes each extracted mechanism through a four-outcome granularity ladder.

**Architecture:** A plugin manifest pair plus one skill directory. All behavior lives in prose (`SKILL.md` and five reference files), so the only executable code in the repo is a zero-dependency validator that enforces the contracts the prose depends on. The validator deliberately includes reference-path integrity, which is the mechanism the 2026-08-23 source review identified as the highest-value steal. The repo enforces on itself the discipline the tool teaches.

**Tech Stack:** Node.js >= 20 (built-in `node:test` runner, verified on v24.16.0), zero runtime and zero dev dependencies, Markdown, JSON.

**Spec:** `docs/design/2026-08-23-skill-thief-design.md`

## Global Constraints

- **No em dashes in prose.** Use a comma, a period, or parentheses. Applies to every Markdown file in the repo.
- **Zero dependencies.** No `node_modules`, no lockfile, no package manager install step. `package.json` declares scripts only.
- **License: MIT.** Copyright holder: Grant Isom.
- **Harness-neutral skill body.** `skills/skill-thief/SKILL.md` and everything under `skills/skill-thief/references/` must not contain: the token `/loop`, an unguarded `${CLAUDE_*}` variable, or a hardcoded `.claude/` path. `README.md` is exempt because install instructions legitimately name real directories.
- **One body only.** No per-harness twin of the skill body, ever. Portability is achieved by neutral wording, not by duplication.
- **Description budget:** skill frontmatter `description` at most 1024 characters, on a single physical line.
- **Homes are created on demand.** No task may scaffold a verdict home (rejection record, conventions doc, findings directory) into a host repo before an approved verdict needs it.
- **Plugin version starts at `0.1.0`** and is identical in `plugin.json` and the `marketplace.json` entry.

---

### Task 1: Repo scaffold and manifest gate

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `scripts/validate.mjs`
- Create: `scripts/validate.test.mjs`
- Create: `.claude-plugin/plugin.json`
- Create: `.claude-plugin/marketplace.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `checkManifests(root?: string) => string[]` exported from `scripts/validate.mjs`. Returns an array of human-readable error strings; empty array means valid. Every later validator function follows this same signature and return contract.

- [ ] **Step 1: Write the failing test**

Create `scripts/validate.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkManifests } from './validate.mjs';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Developer/skill-thief && node --test scripts/`
Expected: FAIL with `Cannot find module` for `./validate.mjs`.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/validate.mjs`:

```js
#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readJson(root, rel, errors) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    errors.push(`${rel}: missing`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`${rel}: invalid JSON (${error.message})`);
    return null;
  }
}

export function checkManifests(root = ROOT) {
  const errors = [];
  const plugin = readJson(root, '.claude-plugin/plugin.json', errors);
  const market = readJson(root, '.claude-plugin/marketplace.json', errors);

  if (plugin) {
    for (const field of ['name', 'version', 'description']) {
      if (!plugin[field]) errors.push(`plugin.json: missing "${field}"`);
    }
    if (plugin.version && !/^\d+\.\d+\.\d+$/.test(plugin.version)) {
      errors.push(`plugin.json: version "${plugin.version}" is not MAJOR.MINOR.PATCH`);
    }
  }

  if (market) {
    if (!Array.isArray(market.plugins)) {
      errors.push('marketplace.json: "plugins" must be an array');
    } else if (plugin?.name) {
      const entry = market.plugins.find((p) => p.name === plugin.name);
      if (!entry) {
        errors.push(`marketplace.json: no entry for plugin "${plugin.name}"`);
      } else if (entry.version && entry.version !== plugin.version) {
        errors.push(
          `marketplace.json: entry version "${entry.version}" does not match plugin.json version "${plugin.version}"`,
        );
      }
    }
  }

  return errors;
}

const CHECKS = [checkManifests];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = CHECKS.flatMap((check) => check());
  for (const error of errors) console.error(`error: ${error}`);
  console.log(errors.length ? `validate: ${errors.length} error(s)` : 'validate: ok');
  process.exit(errors.length ? 1 : 0);
}
```

- [ ] **Step 4: Create the manifests and supporting files**

Create `.claude-plugin/plugin.json`:

```json
{
  "name": "skill-thief",
  "version": "0.1.0",
  "description": "Evaluate someone else's agent tooling, extract the mechanisms worth taking, and decide where each one lands in your own setup.",
  "author": { "name": "Grant Isom", "url": "https://github.com/glisom" },
  "homepage": "https://github.com/glisom/skill-thief",
  "repository": "https://github.com/glisom/skill-thief",
  "license": "MIT",
  "keywords": ["skills", "agent-tooling", "code-review", "knowledge-management", "plugin"]
}
```

Create `.claude-plugin/marketplace.json`:

```json
{
  "name": "skill-thief",
  "owner": { "name": "Grant Isom", "url": "https://github.com/glisom" },
  "plugins": [
    {
      "name": "skill-thief",
      "source": "./",
      "version": "0.1.0",
      "description": "Evaluate someone else's agent tooling, extract the mechanisms worth taking, and decide where each one lands in your own setup."
    }
  ]
}
```

Create `package.json`:

```json
{
  "name": "skill-thief",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Steal the ideas, not the install.",
  "license": "MIT",
  "scripts": {
    "test": "node --test scripts/",
    "validate": "node scripts/validate.mjs"
  }
}
```

Create `.gitignore`:

```
node_modules/
.DS_Store
*.log
scratch/
```

Create `LICENSE` containing the standard MIT License text with `Copyright (c) 2026 Grant Isom`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd ~/Developer/skill-thief && node --test scripts/ && node scripts/validate.mjs`
Expected: 3 tests pass; validator prints `validate: ok` and exits 0.

- [ ] **Step 6: Commit**

```bash
cd ~/Developer/skill-thief
git add package.json .gitignore LICENSE scripts/ .claude-plugin/
git commit -m "feat: plugin manifests and zero-dependency validation gate"
```

---

### Task 2: Skill frontmatter checks and the SKILL.md skeleton

**Files:**
- Modify: `scripts/validate.mjs` (add `parseFrontmatter`, `checkSkill`, register in `CHECKS`)
- Modify: `scripts/validate.test.mjs` (append tests)
- Create: `skills/skill-thief/SKILL.md`

**Interfaces:**
- Consumes: `ROOT` from Task 1.
- Produces: `parseFrontmatter(source: string) => Record<string,string> | null` and `checkSkill(root?: string) => string[]`. `parseFrontmatter` returns `null` for missing or malformed frontmatter, otherwise a flat map of single-line `key: value` pairs with quotes preserved.

- [ ] **Step 1: Write the failing test**

Append to `scripts/validate.test.mjs`:

```js
import { parseFrontmatter, checkSkill } from './validate.mjs';

test('frontmatter parses single-line key/value pairs', () => {
  const fm = parseFrontmatter('---\nname: demo\ndescription: "A thing"\n---\n\n# Body\n');
  assert.equal(fm.name, 'demo');
  assert.equal(fm.description, '"A thing"');
});

test('frontmatter returns null when the block is unterminated', () => {
  assert.equal(parseFrontmatter('---\nname: demo\n\n# Body\n'), null);
});

test('the real skill passes the frontmatter checks', () => {
  assert.deepEqual(checkSkill(), []);
});

test('an over-budget description is reported', () => {
  const root = mkdtempSync(join(tmpdir(), 'st-'));
  const dir = join(root, 'skills/skill-thief');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: skill-thief\ndescription: ${'x'.repeat(1100)}\n---\n\n# Body\n`,
  );
  const errors = checkSkill(root);
  assert.ok(errors.some((e) => /1100 chars/.test(e)));
});

test('a name that disagrees with the directory is reported', () => {
  const root = mkdtempSync(join(tmpdir(), 'st-'));
  const dir = join(root, 'skills/skill-thief');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), '---\nname: wrong\ndescription: d\n---\n\n# Body\n');
  const errors = checkSkill(root);
  assert.ok(errors.some((e) => /"wrong".*"skill-thief"/.test(e)));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Developer/skill-thief && node --test scripts/`
Expected: FAIL with `parseFrontmatter is not a function` (or an import error for the new named exports).

- [ ] **Step 3: Write minimal implementation**

Add to `scripts/validate.mjs`, above the `CHECKS` array:

```js
export const SKILL_NAME = 'skill-thief';
const DESCRIPTION_MAX = 1024;

export function parseFrontmatter(source) {
  if (!source.startsWith('---\n')) return null;
  const end = source.indexOf('\n---', 3);
  if (end === -1) return null;
  const fields = {};
  for (const line of source.slice(4, end).split('\n')) {
    const match = line.match(/^([a-z][a-z0-9_-]*):\s*(.*)$/);
    if (match) fields[match[1]] = match[2].trim();
  }
  return fields;
}

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && /^(".*"|'.*')$/s.test(trimmed)) return trimmed.slice(1, -1);
  return trimmed;
}

export function checkSkill(root = ROOT) {
  const errors = [];
  const file = join(root, 'skills', SKILL_NAME, 'SKILL.md');
  if (!existsSync(file)) {
    errors.push(`skills/${SKILL_NAME}/SKILL.md: missing`);
    return errors;
  }
  const fields = parseFrontmatter(readFileSync(file, 'utf8'));
  if (!fields) {
    errors.push(`skills/${SKILL_NAME}/SKILL.md: missing or malformed frontmatter`);
    return errors;
  }
  if (fields.name !== SKILL_NAME) {
    errors.push(`SKILL.md: name "${fields.name}" does not match directory "${SKILL_NAME}"`);
  }
  const description = unquote(fields.description ?? '');
  if (!description) {
    errors.push('SKILL.md: empty description');
  } else if (description.length > DESCRIPTION_MAX) {
    errors.push(`SKILL.md: description ${description.length} chars, limit ${DESCRIPTION_MAX}`);
  }
  return errors;
}
```

Change the `CHECKS` line to:

```js
const CHECKS = [checkManifests, checkSkill];
```

- [ ] **Step 4: Create the skill body skeleton**

Create `skills/skill-thief/SKILL.md`. Frontmatter plus the six phase headings and the gate. Reference links are added in Task 3, so this step introduces none.

```markdown
---
name: skill-thief
description: "Evaluate an external agent-tooling source (a repo, a plugin, a video, an article), extract the mechanisms behind its ideas, and decide at what granularity each one should land in this project: as a rule inside an existing skill, as a new skill, as a validation gate, or as a recorded rejection. Use when the user wants to review someone else's setup and take what is worth taking without installing it wholesale. Trigger phrases include: steal from this repo, what should we take from, compare our setup to, review their skills, what can we learn from this plugin, evaluate this tool for ideas, should we adopt this."
---

# skill-thief

Steal the ideas, not the install.

Announce at start: which source is being reviewed, and that no changes are written before the approval gate.

## What this is not

- Not an installer. This skill never adds a marketplace, enables a third-party plugin, or vendors someone else's code.
- Not a plugin-surface auditor. What is installed and whether it is stale is a different question on a different cadence.
- Not a feature-code writer. It changes agent configuration only.

## Phase 0: discover the host

## Phase 1: pin the source

## Phase 2: scout for mechanisms, not features

## Phase 3: check the host for prior art

## Phase 4: classify

## Phase 5: one approval gate

## Phase 6: absorb

## Re-run behavior

## Stop conditions
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd ~/Developer/skill-thief && node --test scripts/ && node scripts/validate.mjs`
Expected: 8 tests pass; `validate: ok`.

- [ ] **Step 6: Commit**

```bash
cd ~/Developer/skill-thief
git add scripts/ skills/
git commit -m "feat: skill frontmatter checks and SKILL.md skeleton"
```

---

### Task 3: Reference-path integrity and harness neutrality

This task implements the mechanism identified as the highest-value steal from the 2026-08-23 source review. A renamed or deleted reference file must fail the build rather than fail silently at skill load time.

**Files:**
- Modify: `scripts/validate.mjs` (add `extractRefTokens`, `checkReferences`, `checkNeutrality`)
- Modify: `scripts/validate.test.mjs` (append tests)
- Create: `skills/skill-thief/references/granularity-ladder.md`
- Create: `skills/skill-thief/references/host-discovery.md`
- Modify: `skills/skill-thief/SKILL.md` (fill Phases 0 and 4, link the two references)

**Interfaces:**
- Consumes: `ROOT`, `SKILL_NAME` from Tasks 1 and 2.
- Produces: `extractRefTokens(source: string) => string[]` returning deduplicated `references/...` paths found in backtick code spans and Markdown link targets. `checkReferences(root?) => string[]` and `checkNeutrality(root?) => string[]`.

- [ ] **Step 1: Write the failing test**

Append to `scripts/validate.test.mjs`:

```js
import { extractRefTokens, checkReferences, checkNeutrality } from './validate.mjs';

test('reference tokens are found in both backtick and link form', () => {
  const source = 'Load `references/a.md` and then [the ladder](references/b.md).';
  assert.deepEqual(extractRefTokens(source).sort(), ['references/a.md', 'references/b.md']);
});

test('reference tokens are deduplicated', () => {
  const source = '`references/a.md` again `references/a.md`';
  assert.deepEqual(extractRefTokens(source), ['references/a.md']);
});

test('the real skill has no dangling references', () => {
  assert.deepEqual(checkReferences(), []);
});

test('a dangling reference is reported', () => {
  const root = mkdtempSync(join(tmpdir(), 'st-'));
  const dir = join(root, 'skills/skill-thief');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), 'Load `references/gone.md` first.\n');
  const errors = checkReferences(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /references\/gone\.md/);
});

test('the real skill body is harness neutral', () => {
  assert.deepEqual(checkNeutrality(), []);
});

test('harness-specific tokens in the body are reported', () => {
  const root = mkdtempSync(join(tmpdir(), 'st-'));
  const dir = join(root, 'skills/skill-thief');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), 'Run /loop 10m and read ${CLAUDE_SKILL_DIR}/x and .claude/skills/y.\n');
  const errors = checkNeutrality(root);
  assert.equal(errors.length, 3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Developer/skill-thief && node --test scripts/`
Expected: FAIL on the new named imports not being exported.

- [ ] **Step 3: Write minimal implementation**

Add to `scripts/validate.mjs`. Add `readdirSync` to the `node:fs` import and `relative` to the `node:path` import.

```js
const HARNESS_SPECIFIC = [
  [/\/loop\b/g, 'scheduler token "/loop" is harness-specific'],
  [/\$\{CLAUDE_[A-Z_]+\}/g, 'unguarded ${CLAUDE_*} variable; use ${CLAUDE_SKILL_DIR:-.}'],
  [/\.claude\/skills\//g, 'hardcoded .claude/ path; say "your skills directory" instead'],
];

export function extractRefTokens(source) {
  const tokens = new Set();
  for (const m of source.matchAll(/`(references\/[A-Za-z0-9._/-]+)`/g)) tokens.add(m[1]);
  for (const m of source.matchAll(/\]\((references\/[A-Za-z0-9._/-]+)\)/g)) tokens.add(m[1]);
  return [...tokens];
}

function skillMarkdownFiles(root) {
  const dir = join(root, 'skills', SKILL_NAME);
  if (!existsSync(dir)) return [];
  const files = [];
  const skillFile = join(dir, 'SKILL.md');
  if (existsSync(skillFile)) files.push(skillFile);
  const refDir = join(dir, 'references');
  if (existsSync(refDir)) {
    for (const entry of readdirSync(refDir)) {
      if (entry.endsWith('.md')) files.push(join(refDir, entry));
    }
  }
  return files;
}

export function checkReferences(root = ROOT) {
  const errors = [];
  const dir = join(root, 'skills', SKILL_NAME);
  for (const file of skillMarkdownFiles(root)) {
    const source = readFileSync(file, 'utf8');
    for (const token of extractRefTokens(source)) {
      if (!existsSync(join(dir, token))) {
        errors.push(`${relative(root, file)}: references "${token}" which does not exist`);
      }
    }
  }
  return errors;
}

export function checkNeutrality(root = ROOT) {
  const errors = [];
  for (const file of skillMarkdownFiles(root)) {
    const source = readFileSync(file, 'utf8');
    for (const [pattern, message] of HARNESS_SPECIFIC) {
      for (const match of source.matchAll(pattern)) {
        errors.push(`${relative(root, file)}: ${message} (found "${match[0]}")`);
      }
    }
  }
  return errors;
}
```

Change the `CHECKS` line to:

```js
const CHECKS = [checkManifests, checkSkill, checkReferences, checkNeutrality];
```

- [ ] **Step 4: Write the two load-bearing reference files**

Create `skills/skill-thief/references/granularity-ladder.md`. Contents: the four verdicts (absorb as a rule, mint a new skill, harden a gate, reject) with the applies-when column and the target column, copied from the spec's ladder table; the statement that absorb-as-a-rule is the default and why (a new skill spends description budget in every future session and competes for routing); the two Reject guardrails (a deferral is not a rejection; never record an already-implemented idea as rejected, point at where it lives); and the worked example explaining why a three-verdict ladder misfiles a build-failing check.

Create `skills/skill-thief/references/host-discovery.md`. Contents: the inventory checklist (skill directories, agent instruction file, slash commands, hooks, subagents, validation scripts, conventions or pitfalls document, rejection record, notes directory); how to build the verdict-target map from that inventory; the on-demand rule stating that a verdict home is created only when an approved verdict needs one and never scaffolded upfront; and what to do when a surface is absent (report the absence in the map rather than inventing a location).

Then fill `SKILL.md` Phase 0 and Phase 4, each ending with a load instruction naming its reference and the failure mode of skipping it:

```markdown
## Phase 0: discover the host

Inventory what this project actually has, then produce a verdict-target map answering, for each of the four verdicts, where it would land here. Show the map before reading the source so a wrong guess is corrected while it is still cheap.

Load `references/host-discovery.md` for the inventory checklist and the on-demand rule for creating verdict homes. Skipping it produces a map that invents locations, and every later verdict inherits that error.

## Phase 4: classify

Give every extracted mechanism exactly one verdict, resolving its target through the Phase 0 map.

Load `references/granularity-ladder.md` for the four verdicts and their selection criteria. Skipping it collapses the ladder into "add a new skill", which is the outcome this skill exists to prevent.
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd ~/Developer/skill-thief && node --test scripts/ && node scripts/validate.mjs`
Expected: 14 tests pass; `validate: ok`.

- [ ] **Step 6: Verify the gate actually fires**

```bash
cd ~/Developer/skill-thief
git mv skills/skill-thief/references/granularity-ladder.md skills/skill-thief/references/ladder.md
node scripts/validate.mjs; echo "exit=$?"
git mv skills/skill-thief/references/ladder.md skills/skill-thief/references/granularity-ladder.md
node scripts/validate.mjs; echo "exit=$?"
```

Expected: the first run reports the dangling `references/granularity-ladder.md` and exits 1; the second prints `validate: ok` and exits 0. If the first run exits 0, the check is not wired into `CHECKS` and the whole task is vacuous.

- [ ] **Step 7: Commit**

```bash
cd ~/Developer/skill-thief
git add scripts/ skills/
git commit -m "feat: reference-path integrity and harness-neutrality checks"
```

---

### Task 4: The remaining phases and reference files

**Files:**
- Create: `skills/skill-thief/references/source-adapters.md`
- Create: `skills/skill-thief/references/findings-template.md`
- Create: `skills/skill-thief/references/rejection-template.md`
- Modify: `skills/skill-thief/SKILL.md` (fill Phases 1, 2, 3, 5, 6, re-run behavior, stop conditions)

**Interfaces:**
- Consumes: `checkReferences` and `checkNeutrality` from Task 3, which now cover the three new files automatically.
- Produces: no new code. The validator's existing checks are the gate.

- [ ] **Step 1: Write the three reference files**

`source-adapters.md`: one section per medium (git repository, installed plugin or marketplace, video or talk, article or documentation). Each names how to gather, and what "pin the source" means for that medium (commit SHA, installed version compared against upstream, publish date and timestamp, publish date and URL). State that everything downstream of gathering is identical across media.

`findings-template.md`: the findings document skeleton. Front section records source identity and the pinned version. Then the ranked gate table with columns `mechanism | source name -> neutral name | verdict | target | evidence | confidence`. Then the already-stronger list. Then a section recording, per finding, how absence was established.

`rejection-template.md`: the rejection record entry format. One file per rejected concept. Sections: what was proposed, why it is rejected (durable and concept-level), and what to do instead. Restate the two guardrails.

- [ ] **Step 2: Fill the remaining SKILL.md phases**

Phase 1 must state: record the exact version, commit SHA, or publish date plus the URL; an unpinned finding is not reproducible and cannot be diffed later; abort on any read failure with the exact error and never continue on partial state. Load `references/source-adapters.md`.

Phase 2 must state: extract the mechanism (the rubric, schema, gate, loop, or state model) rather than the feature; restate it in neutral vocabulary because a mechanism carried over under its marketing name arrives with assumptions attached; use a bounded parallel fan-out for large sources with scouts writing full evidence to scratch and returning short summaries, and run inline for small ones.

Phase 3 must state: grep-first against the Phase 0 surfaces; evidence of absence is required, not asserted; a scoped search that finds nothing must widen before absence is claimed; each finding records how absence was established; and this phase also produces the already-stronger list as an output, not a byproduct.

Phase 5 must state: exactly one gate, presented once, using the table from `references/findings-template.md`; nothing is written before it and everything is written after it.

Phase 6 must state: apply approved verdicts; create verdict homes only where an approved item needs one; write rejections using `references/rejection-template.md`; run whatever validation Phase 0 discovered and report which commands ran with their results rather than claiming success generically.

Re-run behavior must state: diff mode against a prior findings document, reporting only what changed since the pinned version.

Stop conditions must state: stop after Phase 6's validation report; stop at Phase 5 if the user rejects everything; abort at Phase 1 on an unreadable source; and never proceed past the gate without explicit approval.

- [ ] **Step 3: Run test to verify it passes**

Run: `cd ~/Developer/skill-thief && node --test scripts/ && node scripts/validate.mjs`
Expected: 14 tests pass; `validate: ok`. The new reference files are covered by `checkReferences` and `checkNeutrality` without new test code.

- [ ] **Step 4: Verify no em dashes and no leaked proprietary names**

```bash
cd ~/Developer/skill-thief
grep -rn '—' skills/ docs/ README.md 2>/dev/null; echo "em-dash exit=$?"
grep -rniE '[A-Z]{2,5}-[0-9]{2,}' skills/ 2>/dev/null; echo "ticket-id exit=$?"
```

Expected: both greps produce no output and exit 1 (no matches).

The second grep catches issue-tracker ticket ids, which are the most common way a private project's identifiers leak into prose drafted from a private context. Also re-read the skill body for the names of any private repository, client, or internal tool. That part is a human check, not a grep: a private name has to be recognized to be found, and hardcoding a list of them into a public file would itself be the disclosure it is meant to prevent.

- [ ] **Step 5: Commit**

```bash
cd ~/Developer/skill-thief
git add skills/
git commit -m "feat: complete phase bodies, source adapters, and output templates"
```

---

### Task 5: README and CHANGELOG

**Files:**
- Create: `README.md`
- Create: `CHANGELOG.md`

**Interfaces:**
- Consumes: the plugin name and version from Task 1's manifests.
- Produces: no code.

- [ ] **Step 1: Write README.md**

Required sections, in order:

1. **Title and one-line pitch:** "Steal the ideas, not the install."
2. **The problem:** the two failure modes from the spec, cargo-culting and evaporation, in three sentences each.
3. **What it does:** the four-outcome ladder as a table.
4. **Install (Claude Code):**

   ````markdown
   ```
   /plugin marketplace add glisom/skill-thief
   /plugin install skill-thief
   ```
   ````

5. **Install (other harnesses):** copy `skills/skill-thief/` into your agent's skills directory. State explicitly that the body is harness-neutral and that there is no separate copy to keep in sync.
6. **Usage:** three example invocations covering a repo, a plugin, and a video.
7. **What it will not do:** the four non-goals from the spec.
8. **Limitations:** thin host repos weaken the prior-art phase, and verdict quality tracks how much of the host's conventions are written down rather than held in people's heads.
9. **Development:** `node --test scripts/` and `node scripts/validate.mjs`, noting zero dependencies and Node >= 20.
10. **License:** MIT.

The README is exempt from the harness-neutrality rule and may name `.claude/skills/` in the install instructions.

- [ ] **Step 2: Write CHANGELOG.md**

Keep-a-Changelog format. One entry:

```markdown
## [0.1.0] - 2026-08-23

### Added
- Initial release: the skill-thief skill, the four-outcome granularity ladder, host discovery with on-demand verdict homes, source adapters for repositories, plugins, videos, and articles, and a zero-dependency validator covering manifest integrity, skill frontmatter budgets, reference-path integrity, and harness neutrality.
```

- [ ] **Step 3: Verify the documented commands actually work**

```bash
cd ~/Developer/skill-thief
node --test scripts/ && node scripts/validate.mjs
```

Expected: both succeed, matching what the README's Development section claims. A README that documents a failing command is a defect.

- [ ] **Step 4: Commit**

```bash
cd ~/Developer/skill-thief
git add README.md CHANGELOG.md
git commit -m "docs: README and initial changelog"
```

---

### Task 6: Self-hosting dry run

The tool's first real test is running it against a source and checking the output shape. This task produces evidence that the skill works, not just that the repo validates.

**Files:**
- Create: `docs/examples/2026-08-23-dry-run.md`
- Modify: `skills/skill-thief/SKILL.md` or `references/*` only if the dry run exposes a defect

**Interfaces:**
- Consumes: the complete skill from Tasks 2 through 4.
- Produces: a worked example committed as documentation.

- [ ] **Step 1: Run the skill against a real source**

Invoke `skill-thief` in a session opened on this repository, with a public agent-tooling repository as the source. Walk Phases 0 through 5 and stop at the gate without approving anything.

- [ ] **Step 2: Check the output against five criteria**

1. Phase 0 produced a verdict-target map naming real paths in this repo, and did not invent a rejection-record location that does not exist.
2. Phase 1 pinned a specific commit SHA or version, not "latest".
3. Phase 3 stated how absence was established for at least one finding, not merely that the thing was absent.
4. At least one finding received a verdict other than "mint a new skill", proving the ladder's default bias is operating.
5. The gate table rendered once, with all six columns populated.

Any criterion that fails is a defect in the prose. Fix it in `SKILL.md` or the relevant reference file, re-run `node scripts/validate.mjs`, and repeat this step.

- [ ] **Step 3: Record the dry run**

Write `docs/examples/2026-08-23-dry-run.md` containing the source, its pinned version, the gate table as produced, and a note on which of the five criteria needed a prose fix. This doubles as the example output referenced from the README's Usage section.

- [ ] **Step 4: Final validation and push**

```bash
cd ~/Developer/skill-thief
node --test scripts/ && node scripts/validate.mjs
git add docs/examples/ skills/
git commit -m "docs: worked dry-run example and prose fixes it exposed"
git push
```

Expected: tests and validator both green, push succeeds.

---

## Self-review notes

**Spec coverage.** Every spec section maps to a task: the ladder to Task 3, the six phases to Tasks 2 through 4, discovery to Task 3, re-run diff mode to Task 4, packaging and the one-body rule to Tasks 1 and 5, limitations to Task 5's README, and the anti-cargo-cult provisions to Tasks 3 and 4. The four non-goals appear in the SKILL.md skeleton in Task 2 and in the README in Task 5.

**Deviation from the skill's default plan location.** Saved to `docs/plans/` rather than `docs/superpowers/plans/`, matching the spec's location at `docs/design/` and keeping tool-specific directory names out of a public repository.

**Type consistency.** All validator functions share the `(root = ROOT) => string[]` signature. `SKILL_NAME` is defined once in Task 2 and reused in Task 3. `extractRefTokens` is the only function taking a source string rather than a root path, and its callers pass file contents read inside `checkReferences`.

**Known gap accepted deliberately.** There is no automated test that the skill's prose produces good verdicts. Task 6 is the manual substitute, with five explicit pass criteria. Automating prose quality would require the measurement harness described in the spec's provenance section, which is out of scope for 0.1.0.
