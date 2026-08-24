#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
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

export function checkTestsExist(root = ROOT) {
  const errors = [];
  const scriptsDir = join(root, 'scripts');

  if (!existsSync(scriptsDir)) {
    errors.push('scripts/: missing');
    return errors;
  }

  try {
    const files = readdirSync(scriptsDir);
    const hasTestFile = files.some((file) => file.endsWith('.test.mjs'));
    if (!hasTestFile) {
      errors.push('scripts/: no *.test.mjs files found');
    }
  } catch (error) {
    errors.push(`scripts/: cannot read directory (${error.message})`);
  }

  return errors;
}

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

const HARNESS_SPECIFIC = [
  [/\/loop\b/g, 'scheduler token "/loop" is harness-specific'],
  [/\$\{CLAUDE_[A-Z_]+\}/g, 'unguarded ${CLAUDE_*} variable; use ${CLAUDE_SKILL_DIR:-.}'],
  [/\.claude\/skills\//g, 'hardcoded .claude/ path; say "your skills directory" instead'],
];

function stripFragmentAndQuery(token) {
  return token.split(/[#?]/)[0];
}

export function extractRefTokens(source) {
  const tokens = new Set();
  const TOKEN_CHARS = /references\/[A-Za-z0-9._/#?-]+/;
  for (const m of source.matchAll(new RegExp('`(' + TOKEN_CHARS.source + ')`', 'g'))) {
    const token = stripFragmentAndQuery(m[1]);
    if (token) tokens.add(token);
  }
  // Link target, optionally followed by a "title" or 'title' before the closing paren.
  const linkPattern = new RegExp(
    '\\]\\((' + TOKEN_CHARS.source + ')(?:\\s+(?:"[^"]*"|\'[^\']*\'))?\\)',
    'g',
  );
  for (const m of source.matchAll(linkPattern)) {
    const token = stripFragmentAndQuery(m[1]);
    if (token) tokens.add(token);
  }
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
      const resolved = join(dir, token);
      const rel = relative(dir, resolved);
      if (rel === '..' || rel.startsWith(`..${sep}`)) {
        errors.push(`${relative(root, file)}: references "${token}" which escapes the skill directory`);
        continue;
      }
      if (!existsSync(resolved)) {
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

const CHECKS = [checkManifests, checkTestsExist, checkSkill, checkReferences, checkNeutrality];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = CHECKS.flatMap((check) => check());
  for (const error of errors) console.error(`error: ${error}`);
  console.log(errors.length ? `validate: ${errors.length} error(s)` : 'validate: ok');
  process.exit(errors.length ? 1 : 0);
}
