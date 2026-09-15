#!/usr/bin/env node
// Zero-dependency validator for the glisom marketplace.
//
// Walks every plugin under plugins/ and checks: marketplace and plugin manifest
// integrity, skill frontmatter budgets, reference and asset path integrity,
// harness neutrality, prose style, and asset script health. Run it with
// `npm run validate`; validate.test.mjs exercises every check against fixtures
// and against the real repository.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DESCRIPTION_MAX = 1024;
export const NAME_MAX = 64;
export const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

function isDir(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function listDirs(dir) {
  if (!isDir(dir)) return [];
  return readdirSync(dir)
    .filter((name) => isDir(join(dir, name)))
    .sort();
}

function readJson(path, label, errors) {
  if (!existsSync(path)) {
    errors.push(`${label}: missing`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`${label}: invalid JSON (${error.message})`);
    return null;
  }
}

export function pluginDirs(root = ROOT) {
  return listDirs(join(root, 'plugins'));
}

export function skillDirs(pluginDir) {
  return listDirs(join(pluginDir, 'skills'));
}

// Every skill in the repository as { plugin, name, dir }.
export function skillEntries(root = ROOT) {
  const entries = [];
  for (const plugin of pluginDirs(root)) {
    const pluginDir = join(root, 'plugins', plugin);
    for (const name of skillDirs(pluginDir)) {
      entries.push({ plugin, name, dir: join(pluginDir, 'skills', name) });
    }
  }
  return entries;
}

function readMarketplace(root, errors) {
  return readJson(join(root, '.claude-plugin', 'marketplace.json'), 'marketplace.json', errors);
}

// ---- manifests -----------------------------------------------------------------------------------

export function checkMarketplace(root = ROOT) {
  const errors = [];
  const market = readMarketplace(root, errors);
  if (!market) return errors;
  if (!market.name) errors.push('marketplace.json: missing "name"');
  else if (!NAME_PATTERN.test(market.name)) errors.push(`marketplace.json: name "${market.name}" is not kebab-case`);
  if (!market.owner?.name) errors.push('marketplace.json: missing "owner.name"');
  if (!Array.isArray(market.plugins)) {
    errors.push('marketplace.json: "plugins" must be an array');
    return errors;
  }
  const seen = new Set();
  for (const entry of market.plugins) {
    if (!entry?.name) {
      errors.push('marketplace.json: entry without a "name"');
      continue;
    }
    const label = `marketplace.json entry "${entry.name}"`;
    if (seen.has(entry.name)) errors.push(`${label}: listed more than once`);
    seen.add(entry.name);
    const expected = `./plugins/${entry.name}`;
    if (entry.source !== expected) errors.push(`${label}: source "${entry.source}" should be "${expected}"`);
    if (!isDir(join(root, 'plugins', entry.name))) errors.push(`${label}: plugins/${entry.name}/ does not exist`);
    if (!entry.description) errors.push(`${label}: missing "description"`);
    if (entry.version && !SEMVER.test(entry.version)) errors.push(`${label}: version "${entry.version}" is not MAJOR.MINOR.PATCH`);
  }
  for (const name of pluginDirs(root)) {
    if (!seen.has(name)) errors.push(`marketplace.json: no entry for plugins/${name}`);
  }
  return errors;
}

export function checkPlugins(root = ROOT) {
  const errors = [];
  const market = readMarketplace(root, []);
  const entries = new Map((market?.plugins ?? []).filter((p) => p?.name).map((p) => [p.name, p]));
  const names = pluginDirs(root);
  if (names.length === 0) errors.push('plugins/: no plugin directories found');
  for (const name of names) {
    const dir = join(root, 'plugins', name);
    const label = `plugins/${name}`;
    const manifest = `${label}/.claude-plugin/plugin.json`;
    const plugin = readJson(join(dir, '.claude-plugin', 'plugin.json'), manifest, errors);
    if (plugin) {
      for (const field of ['name', 'version', 'description']) {
        if (!plugin[field]) errors.push(`${manifest}: missing "${field}"`);
      }
      if (plugin.name && plugin.name !== name) {
        errors.push(`${manifest}: name "${plugin.name}" does not match directory "${name}"`);
      }
      if (plugin.version && !SEMVER.test(plugin.version)) {
        errors.push(`${manifest}: version "${plugin.version}" is not MAJOR.MINOR.PATCH`);
      }
      const entry = entries.get(name);
      if (entry?.version && plugin.version && entry.version !== plugin.version) {
        errors.push(
          `marketplace.json entry "${name}": version "${entry.version}" does not match plugin.json version "${plugin.version}"`,
        );
      }
      const changelog = join(dir, 'CHANGELOG.md');
      if (!existsSync(changelog)) errors.push(`${label}/CHANGELOG.md: missing`);
      else if (plugin.version && !readFileSync(changelog, 'utf8').includes(`## [${plugin.version}]`)) {
        errors.push(`${label}/CHANGELOG.md: no "## [${plugin.version}]" section for the current version`);
      }
    }
    if (!existsSync(join(dir, 'README.md'))) errors.push(`${label}/README.md: missing`);
    if (existsSync(join(dir, '.claude-plugin', 'marketplace.json'))) {
      errors.push(`${label}/.claude-plugin/marketplace.json: a plugin must not nest a marketplace; the root marketplace.json lists it`);
    }
    if (skillDirs(dir).length === 0) errors.push(`${label}/skills/: no skill directories found`);
  }
  return errors;
}

export function checkTestsExist(root = ROOT) {
  const errors = [];
  const scriptsDir = join(root, 'scripts');
  if (!isDir(scriptsDir) || !readdirSync(scriptsDir).some((file) => file.endsWith('.test.mjs'))) {
    errors.push('scripts/: no *.test.mjs files found');
  }
  return errors;
}

// ---- skill frontmatter ---------------------------------------------------------------------------

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

export function checkSkills(root = ROOT) {
  const errors = [];
  for (const { plugin, name, dir } of skillEntries(root)) {
    const rel = `plugins/${plugin}/skills/${name}/SKILL.md`;
    const file = join(dir, 'SKILL.md');
    if (!existsSync(file)) {
      errors.push(`${rel}: missing`);
      continue;
    }
    if (!NAME_PATTERN.test(name) || name.length > NAME_MAX) {
      errors.push(`${rel}: directory "${name}" must be lowercase letters, digits, and single hyphens, at most ${NAME_MAX} chars`);
    }
    const fields = parseFrontmatter(readFileSync(file, 'utf8'));
    if (!fields) {
      errors.push(`${rel}: missing or malformed frontmatter`);
      continue;
    }
    if (fields.name !== name) errors.push(`${rel}: name "${fields.name}" does not match directory "${name}"`);
    const description = unquote(fields.description ?? '');
    if (!description) errors.push(`${rel}: empty description`);
    else if (description.length > DESCRIPTION_MAX) {
      errors.push(`${rel}: description ${description.length} chars, limit ${DESCRIPTION_MAX}`);
    }
  }
  return errors;
}

// ---- reference, asset, and script paths ----------------------------------------------------------

const TOKEN_CHARS = /(?:references|assets|scripts)\/[A-Za-z0-9._/#?-]+/;

function stripFragmentAndQuery(token) {
  return token.split(/[#?]/)[0];
}

export function extractRefTokens(source) {
  const tokens = new Set();
  for (const m of source.matchAll(new RegExp('`(' + TOKEN_CHARS.source + ')`', 'g'))) {
    const token = stripFragmentAndQuery(m[1]);
    if (token) tokens.add(token);
  }
  // Link target, optionally followed by a "title" or 'title' before the closing paren.
  const linkPattern = new RegExp('\\]\\((' + TOKEN_CHARS.source + ')(?:\\s+(?:"[^"]*"|\'[^\']*\'))?\\)', 'g');
  for (const m of source.matchAll(linkPattern)) {
    const token = stripFragmentAndQuery(m[1]);
    if (token) tokens.add(token);
  }
  // Invocations inside fenced commands: "$SKILL_DIR/scripts/x.py".
  for (const m of source.matchAll(/\$SKILL_DIR\/((?:scripts|assets)\/[A-Za-z0-9._/-]+)/g)) tokens.add(m[1]);
  return [...tokens];
}

function skillMarkdownFiles(dir) {
  const files = [];
  const skillFile = join(dir, 'SKILL.md');
  if (existsSync(skillFile)) files.push(skillFile);
  const refDir = join(dir, 'references');
  if (isDir(refDir)) {
    for (const entry of readdirSync(refDir)) if (entry.endsWith('.md')) files.push(join(refDir, entry));
  }
  return files;
}

export function checkReferences(root = ROOT) {
  const errors = [];
  for (const { dir } of skillEntries(root)) {
    for (const file of skillMarkdownFiles(dir)) {
      const source = readFileSync(file, 'utf8');
      for (const token of extractRefTokens(source)) {
        const resolved = join(dir, token);
        const rel = relative(dir, resolved);
        if (rel === '..' || rel.startsWith(`..${sep}`)) {
          errors.push(`${relative(root, file)}: references "${token}" which escapes the skill directory`);
          continue;
        }
        if (!existsSync(resolved)) errors.push(`${relative(root, file)}: references "${token}" which does not exist`);
      }
    }
  }
  return errors;
}

// ---- harness neutrality and prose ----------------------------------------------------------------

const HARNESS_SPECIFIC = [
  [/\/loop\b/g, 'scheduler token "/loop" is harness-specific'],
  [/\$\{CLAUDE_[A-Z_]+\}/g, 'unguarded ${CLAUDE_*} variable; resolve the skill directory from the file location instead'],
  [/\.claude\/skills\//g, 'hardcoded .claude/ path; say "your skills directory" instead'],
];

export function checkNeutrality(root = ROOT) {
  const errors = [];
  for (const { dir } of skillEntries(root)) {
    for (const file of skillMarkdownFiles(dir)) {
      const source = readFileSync(file, 'utf8');
      for (const [pattern, message] of HARNESS_SPECIFIC) {
        for (const match of source.matchAll(pattern)) {
          errors.push(`${relative(root, file)}: ${message} (found "${match[0]}")`);
        }
      }
    }
  }
  return errors;
}

function proseFiles(root) {
  const files = [];
  const readme = join(root, 'README.md');
  if (existsSync(readme)) files.push(readme);
  for (const plugin of pluginDirs(root)) {
    const pluginReadme = join(root, 'plugins', plugin, 'README.md');
    if (existsSync(pluginReadme)) files.push(pluginReadme);
  }
  for (const { dir } of skillEntries(root)) files.push(...skillMarkdownFiles(dir));
  return files;
}

export function checkProse(root = ROOT) {
  const errors = [];
  for (const file of proseFiles(root)) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (line.includes('—')) {
          errors.push(`${relative(root, file)}:${index + 1}: em dash; use a comma, a period, or parentheses`);
        }
      });
  }
  return errors;
}

// ---- asset and script health ---------------------------------------------------------------------

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  return {
    ok: result.status === 0 && !result.error,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
    error: result.error,
  };
}

function syntaxCheck(file) {
  if (file.endsWith('.sh')) return run('bash', ['-n', file]);
  if (file.endsWith('.mjs') || file.endsWith('.js')) return run(process.execPath, ['--check', file]);
  if (file.endsWith('.py')) return run('python3', ['-c', 'import ast,sys; ast.parse(open(sys.argv[1]).read())', file]);
  return null;
}

export function checkAssets(root = ROOT) {
  const errors = [];
  for (const { dir } of skillEntries(root)) {
    for (const sub of ['assets', 'scripts']) {
      const folder = join(dir, sub);
      if (!isDir(folder)) continue;
      for (const entry of readdirSync(folder)) {
        const file = join(folder, entry);
        if (!statSync(file).isFile()) continue;
        const result = syntaxCheck(file);
        if (!result) continue;
        const rel = relative(root, file);
        if (result.error) errors.push(`${rel}: could not run the syntax check (${result.error.message})`);
        else if (!result.ok) errors.push(`${rel}: syntax check failed\n${result.output}`);
      }
    }
    // A bundled example must still build with the shipped builders.
    const assets = join(dir, 'assets');
    for (const [input, builder] of [
      ['audit.json', 'build_audit.py'],
      ['motion.json', 'build_motion.py'],
    ]) {
      const example = join(assets, 'example', input);
      const script = join(assets, builder);
      if (!existsSync(example) || !existsSync(script)) continue;
      const result = run('python3', [script, example, '--check']);
      if (result.error) errors.push(`${relative(root, script)}: could not run (${result.error.message})`);
      else if (!result.ok) errors.push(`${relative(root, script)} --check on the bundled example failed\n${result.output}`);
    }
  }
  return errors;
}

export const CHECKS = [
  checkMarketplace,
  checkPlugins,
  checkTestsExist,
  checkSkills,
  checkReferences,
  checkNeutrality,
  checkProse,
  checkAssets,
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = CHECKS.flatMap((check) => check());
  for (const error of errors) console.error(`error: ${error}`);
  console.log(errors.length ? `validate: ${errors.length} error(s)` : 'validate: ok');
  process.exit(errors.length ? 1 : 0);
}
