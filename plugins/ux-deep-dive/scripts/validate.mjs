#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DESCRIPTION_MAX = 1024;

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
    if (!files.some((file) => file.endsWith('.test.mjs'))) errors.push('scripts/: no *.test.mjs files found');
  } catch (error) {
    errors.push(`scripts/: cannot read directory (${error.message})`);
  }
  return errors;
}

export function skillDirs(root = ROOT) {
  const dir = join(root, 'skills');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isDirectory())
    .sort();
}

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
  const names = skillDirs(root);
  if (names.length === 0) {
    errors.push('skills/: no skill directories found');
    return errors;
  }
  for (const name of names) {
    const file = join(root, 'skills', name, 'SKILL.md');
    if (!existsSync(file)) {
      errors.push(`skills/${name}/SKILL.md: missing`);
      continue;
    }
    const fields = parseFrontmatter(readFileSync(file, 'utf8'));
    if (!fields) {
      errors.push(`skills/${name}/SKILL.md: missing or malformed frontmatter`);
      continue;
    }
    if (fields.name !== name) {
      errors.push(`skills/${name}/SKILL.md: name "${fields.name}" does not match directory "${name}"`);
    }
    const description = unquote(fields.description ?? '');
    if (!description) {
      errors.push(`skills/${name}/SKILL.md: empty description`);
    } else if (description.length > DESCRIPTION_MAX) {
      errors.push(`skills/${name}/SKILL.md: description ${description.length} chars, limit ${DESCRIPTION_MAX}`);
    }
  }
  return errors;
}

const TOKEN_CHARS = /(?:references|assets)\/[A-Za-z0-9._/#?-]+/;

function stripFragmentAndQuery(token) {
  return token.split(/[#?]/)[0];
}

export function extractRefTokens(source) {
  const tokens = new Set();
  for (const m of source.matchAll(new RegExp('`(' + TOKEN_CHARS.source + ')`', 'g'))) {
    const token = stripFragmentAndQuery(m[1]);
    if (token) tokens.add(token);
  }
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

function skillMarkdownFiles(root, name) {
  const dir = join(root, 'skills', name);
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
  for (const name of skillDirs(root)) {
    const dir = join(root, 'skills', name);
    for (const file of skillMarkdownFiles(root, name)) {
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
  }
  return errors;
}

const HARNESS_SPECIFIC = [
  [/\/loop\b/g, 'scheduler token "/loop" is harness-specific'],
  [/\$\{CLAUDE_[A-Z_]+\}/g, 'unguarded ${CLAUDE_*} variable; use ${CLAUDE_SKILL_DIR:-.}'],
  [/\.claude\/skills\//g, 'hardcoded .claude/ path; say "your skills directory" instead'],
];

export function checkNeutrality(root = ROOT) {
  const errors = [];
  for (const name of skillDirs(root)) {
    for (const file of skillMarkdownFiles(root, name)) {
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
  for (const name of skillDirs(root)) files.push(...skillMarkdownFiles(root, name));
  return files;
}

export function checkProse(root = ROOT) {
  const errors = [];
  for (const file of proseFiles(root)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (line.includes('\u2014')) {
        errors.push(`${relative(root, file)}:${index + 1}: em dash; use a comma, a period, or parentheses`);
      }
    });
  }
  return errors;
}

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  return { ok: result.status === 0 && !result.error, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(), error: result.error };
}

export function checkAssets(root = ROOT) {
  const errors = [];
  for (const name of skillDirs(root)) {
    const dir = join(root, 'skills', name, 'assets');
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      const file = join(dir, entry);
      if (!statSync(file).isFile()) continue;
      const rel = relative(root, file);
      let result;
      if (entry.endsWith('.sh')) result = run('bash', ['-n', file]);
      else if (entry.endsWith('.mjs') || entry.endsWith('.js')) result = run(process.execPath, ['--check', file]);
      else if (entry.endsWith('.py')) result = run('python3', ['-c', `import ast,sys; ast.parse(open(sys.argv[1]).read())`, file]);
      else continue;
      if (result.error) errors.push(`${rel}: could not run the syntax check (${result.error.message})`);
      else if (!result.ok) errors.push(`${rel}: syntax check failed\n${result.output}`);
    }
    const example = join(dir, 'example', 'audit.json');
    const builder = join(dir, 'build_audit.py');
    if (existsSync(example) && existsSync(builder)) {
      const result = run('python3', [builder, example, '--check']);
      if (result.error) errors.push(`${relative(root, builder)}: could not run (${result.error.message})`);
      else if (!result.ok) errors.push(`${relative(root, builder)} --check on the bundled example failed\n${result.output}`);
    }
    const motionExample = join(dir, 'example', 'motion.json');
    const motionBuilder = join(dir, 'build_motion.py');
    if (existsSync(motionExample) && existsSync(motionBuilder)) {
      const result = run('python3', [motionBuilder, motionExample, '--check']);
      if (result.error) errors.push(`${relative(root, motionBuilder)}: could not run (${result.error.message})`);
      else if (!result.ok) errors.push(`${relative(root, motionBuilder)} --check on the bundled example failed\n${result.output}`);
    }
  }
  return errors;
}

const CHECKS = [checkManifests, checkTestsExist, checkSkills, checkReferences, checkNeutrality, checkProse, checkAssets];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = CHECKS.flatMap((check) => check());
  for (const error of errors) console.error(`error: ${error}`);
  console.log(errors.length ? `validate: ${errors.length} error(s)` : 'validate: ok');
  process.exit(errors.length ? 1 : 0);
}
