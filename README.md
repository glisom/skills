# skills

Grant Isom's Claude Code plugins. One plugin per skill, so you install only what you want and each one versions on its own.

## Plugins

| Plugin | What it does | Install |
|---|---|---|
| [skill-thief](plugins/skill-thief/) | Evaluate someone else's agent tooling, extract the mechanisms worth taking, and decide where each one lands in your own setup. Steal the ideas, not the install. | `/plugin install skill-thief@glisom` |
| [ux-deep-dive](plugins/ux-deep-dive/) | Drive every screen of a mobile or web app, capture all of it, and hand back a pre-annotated, markup-ready UX audit. Every screen, every state, one PDF you can mark up. | `/plugin install ux-deep-dive@glisom` |

## Install

Add the marketplace once, then install the plugins you want. Inside Claude Code:

```
/plugin marketplace add glisom/skills
/plugin install skill-thief@glisom
/plugin install ux-deep-dive@glisom
```

Or from a shell:

```sh
claude plugin marketplace add glisom/skills
claude plugin install skill-thief@glisom
```

Each plugin's README covers what it produces, what it needs, and how to run it.

## Layout

```
.claude-plugin/marketplace.json   lists every plugin; each source is ./plugins/<name>
plugins/<name>/
  .claude-plugin/plugin.json      name, version, description: the unit of install
  README.md                       what the plugin does and how to use it
  CHANGELOG.md                    per plugin, Keep a Changelog, semantic versioning
  skills/<name>/SKILL.md          the skill, with references/ and assets/ beside it
docs/design  docs/plans  docs/examples   design history, dated and prefixed by plugin
scripts/validate.mjs              the checks below; validate.test.mjs covers them
```

A plugin is the unit of install and of versioning. Its README and changelog ship with it when installed; the design docs at the root do not.

The layout is the documented Claude Code marketplace pattern, and each skill follows the Agent Skills specification: a `SKILL.md` whose `name` matches its directory and whose `description` says what it does and when to use it, with supporting material in `references/`, `assets/`, or `scripts/` next to it.

## Conventions

- **Format.** `SKILL.md` frontmatter carries `name` (lowercase letters, digits, single hyphens, matching the directory, at most 64 characters) and `description` (at most 1024 characters). Detail lives in `references/` and is loaded on demand, so the skill body stays short.
- **Harness neutral.** Skill prose never hardcodes a `.claude/` path, a `${CLAUDE_*}` variable, or a scheduler token. A skill should read the same in any harness that understands `SKILL.md`.
- **Self-contained.** Everything a skill references lives inside its own directory. The validator rejects paths that escape it.
- **Prose.** No em dashes in READMEs or skill files.

## Checks

```sh
npm test                            # unit tests, including rendering the ux-deep-dive example through its builders
npm run validate                    # manifests, frontmatter budgets, reference integrity, neutrality, prose, asset syntax
claude plugin validate --strict .   # the official manifest check; CI runs it on every push
```

## Releasing a plugin

1. Bump `version` in `plugins/<name>/.claude-plugin/plugin.json` and in its marketplace entry. The validator fails if they disagree.
2. Add a `## [x.y.z] - YYYY-MM-DD` section to the plugin's changelog. The validator checks that the current version has one.
3. Run `claude plugin tag plugins/<name>`. It creates the `<name>--v<x.y.z>` tag after confirming the two manifests agree.

## History

skill-thief and ux-deep-dive began as standalone repositories, `glisom/skill-thief` and `glisom/ux-deep-dive`. They were merged here with their full history in September 2026. The old repositories are archived and point here.

## License

MIT. See [LICENSE](LICENSE).
