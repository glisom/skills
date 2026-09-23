# skills

Grant Isom's portable Agent Skills, with one Claude Code plugin per skill. Each skill has one source directory that can also be installed in Codex, Gemini CLI, or another host that supports the [Agent Skills standard](https://agentskills.io/specification).

## Skills

| Skill | What it does | Standalone source directory |
|---|---|---|
| [decide](plugins/decide/) | Work through open decisions one at a time, with three options and a recommendation. | `plugins/decide/skills/decide/` |
| [skill-thief](plugins/skill-thief/) | Evaluate external agent tooling and decide which mechanisms belong in your setup. | `plugins/skill-thief/skills/skill-thief/` |
| [ux-deep-dive](plugins/ux-deep-dive/) | Walk an app and produce an evidence-backed UX audit with captures and annotations. | `plugins/ux-deep-dive/skills/ux-deep-dive/` |
| [write-like-grant](plugins/write-like-grant/) | Draft in Grant's personal voice, matching the reader and occasion. | `plugins/write-like-grant/skills/write-like-grant/` |

## Install in Codex or Gemini CLI

Both hosts discover standalone skills in `.agents/skills/` inside a project or `~/.agents/skills/` for personal use. Copy the **whole skill directory**, including its `references/`, `assets/`, and `LICENSE.txt`. Cloning this repository alone does not install its nested skills.

From a clone of this repository, install one skill on macOS or Linux:

```sh
mkdir -p "$HOME/.agents/skills"
# Use an unused destination name; do not merge this with another installed copy.
test ! -e "$HOME/.agents/skills/decide" && cp -R plugins/decide/skills/decide "$HOME/.agents/skills/decide"
```

On Windows, in PowerShell:

```powershell
$SkillsDestination = Join-Path $HOME '.agents/skills'
$SkillDestination = Join-Path $SkillsDestination 'decide'
New-Item -ItemType Directory -Force $SkillsDestination | Out-Null
if (Test-Path $SkillDestination) { throw "Skill already exists: $SkillDestination" }
Copy-Item -Recurse ./plugins/decide/skills/decide $SkillDestination
```

Replace `decide` with the name you want. For project scope, use the target project's `.agents/skills/` directory. To update a standalone installation, replace your previously installed copy as a whole so removed resources do not linger. Choose standalone or plugin installation for a given host; installing both can expose duplicate skill names.

In Codex CLI or its IDE extension, invoke `$decide` or select it through `/skills`. In Gemini CLI, inspect `/skills list` and ask to use `decide`. Natural-language requests such as “Use skill-thief on this repository” are portable across hosts. Reload skills or restart the host if a new copy is not visible.

Sources: [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills), [Gemini CLI skills](https://geminicli.com/docs/cli/skills/).

## Install in Claude Code

Add the marketplace once, then install only the plugins you want:

```text
/plugin marketplace add glisom/skills
/plugin install decide@glisom
/plugin install skill-thief@glisom
/plugin install ux-deep-dive@glisom
/plugin install write-like-grant@glisom
```

Or from a shell:

```sh
claude plugin marketplace add glisom/skills
claude plugin install skill-thief@glisom
```

The marketplace and per-plugin manifests are retained. Codex also documents support for Claude-compatible manifests and marketplaces; see its [plugin packaging guide](https://developers.openai.com/plugins/build/plugins). Standalone folders are the simplest shared installation route here and do not need a plugin manifest.

## Other agents and capability requirements

Copy a complete standalone source directory into the host's documented skills location. Installation paths and invocation syntax are host conventions, not part of the shared skill body. A host without skill discovery can read `SKILL.md` and load its bundled resources explicitly, but it must still supply any required tools.

| Skill | Required capabilities | Optional capabilities and fallback |
|---|---|---|
| `write-like-grant` | Read instructions and draft text | No tools required |
| `decide` | Ask and receive user answers | Structured question tool when usable; otherwise plain text |
| `skill-thief` | Read/search source and host conventions; write files and run host validation when applying changes | Sequential review without subagents; local source snapshots without network |
| `ux-deep-dive` | Source access, image viewing, UI control, and output storage for a live audit | Browser tool or Playwright; HTML without PDF rendering; Markdown without Python; stills without recording |

The UX helpers need Python 3.8+, Node 20+ and Playwright for scripted web captures, Chrome/Chromium/Edge for PDF, and FFmpeg for MP4 transcoding. Mobile helpers additionally need Bash and the platform tools: Xcode on macOS for iOS, or Android platform tools for Android. Native Windows supports the Node and Python helpers; mobile shell helpers require a configured Bash environment and device access. See [UX runtime checks](plugins/ux-deep-dive/skills/ux-deep-dive/references/runtime.md).

“Portable” means one set of instructions with explicit capability requirements. It does not mean a text-only assistant can drive a simulator, or that installing a skill installs its dependencies. See [verification coverage](docs/portability.md) for tested behavior and remaining platform limits.

## Layout

```text
.claude-plugin/marketplace.json   existing Claude marketplace
plugins/<name>/
  .claude-plugin/plugin.json     plugin metadata and version
  README.md                     installation, usage, and requirements
  CHANGELOG.md                  per-plugin release history
  skills/<name>/
    SKILL.md                    shared instructions and standard metadata
    LICENSE.txt                 travels with standalone copies
    references/  assets/        optional bundled resources
scripts/validate.mjs             manifests, YAML, resource paths, neutrality, helpers
scripts/portability.test.mjs     standalone copies and runtime capability checks
scripts/browser-smoke.mjs        real browser capture and PDF smoke test
docs/design  docs/plans  docs/examples   design and run history
```

Keep one source directory per skill. Platform-specific installation instructions live in READMEs; shared skill prose selects capabilities rather than provider-specific paths or tool names. Resolve resource paths from the loaded `SKILL.md`, use explicit interpreters for helpers, and write outputs outside the installed skill directory.

## Checks

Repository development needs Node >= 20 and Python >= 3.8. YAML parsing and Playwright are development dependencies; copying a skill does not require installing this repository's npm dependencies.

```sh
npm ci
npm test
npm run validate
# Browser smoke test, including screenshots, video, and PDF from a standalone copy:
npx playwright install chromium
npm run test:browser
# Existing Claude manifest checks:
claude plugin validate --strict .
```

CI configures unit/asset validation on Linux, macOS, and Windows, plus a real Chromium smoke test on Linux. The browser job installs Chromium's system dependencies. The validator checks standard YAML field types and budgets, complete references, common provider-specific paths/tools, and helper syntax. Runtime scenario checks are documented separately; passing static validation is not proof of every agent's behavior.

## Releasing a plugin

1. Bump `version` in `plugins/<name>/.claude-plugin/plugin.json` and its marketplace entry. The validator rejects disagreement.
2. Add a `## [x.y.z] - YYYY-MM-DD` section to the plugin's changelog.
3. Run the checks above, then use the existing `claude plugin tag plugins/<name>` release workflow.

Standalone consumers install the same skill files from the chosen repository ref. Platform-specific packaging can be added around those directories without maintaining separate instruction copies.

## History

skill-thief and ux-deep-dive began as standalone repositories, `glisom/skill-thief` and `glisom/ux-deep-dive`. They were merged here with their full history in September 2026. The old repositories are archived and point here.

## License

MIT. See [LICENSE](LICENSE). Each standalone skill includes the same license notice.
