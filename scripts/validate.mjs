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
