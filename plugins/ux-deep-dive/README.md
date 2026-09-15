# ux-deep-dive

Every screen, every state, one PDF you can mark up.

## The problem

A UX review of an app usually arrives as one of two things. A slide deck with
nine screenshots someone picked because they were easy to reach, which tells
you what the reviewer found in twenty minutes and nothing about the sixty
screens they never opened. Or a wall of tickets with no pictures, which tells
you what is wrong and nothing about what it looks like, so every ticket starts
with a developer reproducing it.

Both share a cause: the capture and the judgment happen in one undocumented
pass, so neither can be checked, repeated, or diffed against the next build.

ux-deep-dive is the procedure for the third thing. Drive the live app on a
simulator, emulator, or browser; capture every route and every state it has;
trace every anomaly to a line of code or a reproduction; and hand back a
folder a product team can mark up, argue with, and re-run against the next
build.

## What it does

From one prompt, one run produces one folder:

| File | What it is |
|---|---|
| `README.md` | Start here. The build that was audited, the counts, the handful of findings that matter, the decisions, what is good, and the limits. |
| `<App>-UX-Audit.pdf` | One screen per landscape page: the capture with numbered callouts on the left, the notes on the right, room to write at the bottom. Ends with every finding ranked. |
| `motion.html` and `motion/` | Short clips for what a still cannot carry: a crash on a gesture, a map, a live total, a transition. |
| `raw/` | Every capture at full resolution. |
| `findings-dev.md` | Every blocker hit while standing the app up, with the fix. |
| `build/` | The findings as data, the fixture server used, the coverage table, and the PDF source, so the run can be repeated. |

Every note carries one of five tags, and the tag decides what evidence the
note must have:

| Tag | Means | Evidence required |
|---|---|---|
| **P0** | Crash, or the feature is blocked entirely | Reproduced twice; the native log line, verbatim |
| **P1** | Wrong data shown, or a needed control does not work | Traced to a cited file and line |
| **P2** | Real friction: costs time, trust, or a wrong inference | The capture, and the inference named |
| **P3** | Craft, consistency, copy | The capture |
| **KEEP** | Working well, called out so it is protected | The capture, and why it beats the norm |

The rule underneath: every finding is either a reproduced runtime observation
or a line of code that was read and cited. Anything else is deleted before
assembly, not shipped with a hedge.

## Install (Claude Code)

```
/plugin marketplace add glisom/ux-deep-dive
/plugin install ux-deep-dive
```

## Install (other harnesses)

Copy `skills/ux-deep-dive/` into your agent's skills directory (for Claude
Code specifically, that is `.claude/skills/`). The skill body is written
harness-neutral on purpose: no scheduler tokens, no harness-specific tool
names, no unguarded platform path variables. The helpers under `assets/` are
plain Bash, Python, and Node with no required packages, so the same files that
ship in the plugin work as a plain copy.

## Usage

```
Use ux-deep-dive on the iOS app in ./mobile. Pull latest main first, screenshot
every screen, and give me a PDF I can mark up.

Run a UX deep dive on the web app at http://localhost:3000, mobile viewport,
every route.

Re-run ux-deep-dive against the new build and tell me what changed since the
last audit.
```

Each run pins the build, stands the app up on synthetic data, calibrates the
capture rig, inventories every route from the code, walks all of them, records
the clips, assembles the folder, and restores the repository to exactly the
state it found.

## What it will not do

1. **Not a test suite.** It drives the live app; it does not run yours.
2. **Not a bug fixer.** It changes no application code and files nothing.
   Temporary changes made for clean captures are reverted before the run ends.
3. **Not a persona loop.** One informed reviewer, one pass, allowed to read
   the code. First-person friction logging is a different tool.
4. **Not an accessibility audit.** Dark mode and large text are captured as
   states; nothing is scored against a standard.

## Limitations

Simulator, emulator, and debug builds are not shipping builds. A P0 or P1 that
could plausibly be a debug artifact says so in the note and in the README, and
is treated as shipping until a release build clears it.

Synthetic data only. When the fixture is wrong, the screen is wrong, and the
audit has to notice before the reader does. The environment ladder exists to
keep the fixture honest; it does not make it real.

The iOS simulator path is the one this skill was generalized from. The Android
and web references carry the equivalent commands and were checked against the
platform tools, but no full run has been done on them yet.

## Development

Zero dependencies. Node >= 20, Python 3.8+ for the asset checks.

```bash
node --test
node scripts/validate.mjs
```

The tests cover manifest integrity, skill frontmatter budgets, reference and
asset path integrity, harness neutrality, prose style, and that the asset
scripts parse and the audit builder renders the bundled example. To see the
example deliverable end to end (needs Chrome, Chromium, or Edge for the PDF):

```bash
python3 skills/ux-deep-dive/assets/build_audit.py skills/ux-deep-dive/assets/example/audit.json --pdf
python3 skills/ux-deep-dive/assets/build_motion.py skills/ux-deep-dive/assets/example/motion.json
```

CI runs `node --test` and `node scripts/validate.mjs` on every push and pull
request; see `.github/workflows/ci.yml`.

## License

MIT. See [LICENSE](LICENSE).
