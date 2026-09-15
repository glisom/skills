# skill-thief

Steal the ideas, not the install.

## The problem

Reading someone else's agent tooling, a repo, a plugin, a conference talk,
usually turns up ideas worth having. Two failure modes follow from there, and
both are common.

The first is cargo-culting: installing the whole thing. The tool gets added
to the marketplace, its skills load into every session from then on, and its
descriptions compete for routing with everything already there. The adoption
cost is paid forever, on every future session, and the actual insight that
justified any of it was three paragraphs.

The second is evaporation: extracting the good ideas by hand and applying two
of them. The reasoning behind the rest gets lost, and six months later the
same source gets read again from scratch. The same ideas get re-derived, and
the ideas that were deliberately rejected get re-proposed, because nothing
recorded that the rejection happened or why.

skill-thief is the repeatable procedure between those two failures. It reads
an external source, extracts the mechanism behind each idea rather than the
feature it ships as, decides at what granularity that mechanism belongs in
your own setup, and records both what was taken and what was refused.

## What it does

Every mechanism pulled from a source gets exactly one verdict, chosen from a
four-item ladder:

| Verdict | Applies when | Lands in |
|---|---|---|
| **Absorb as a rule** (default) | No independent trigger exists. Nobody would ever invoke this mechanism by name. | An existing skill body, the agent instruction file, or a conventions doc |
| **Mint a new skill** | The mechanism has its own trigger. A user would invoke it at a time when no existing skill would fire. | A new skill directory |
| **Harden a gate** | The mechanism is a check, not prose. Its value is that it fails a build. | A validation script or test tier |
| **Reject** | There is a durable, concept-level reason not to adopt it. | The rejection record |

Absorb-as-a-rule is the default because minting a skill is the expensive
verdict, not the neutral one. A new skill spends description budget in every
session from then on and competes for routing with everything already
installed. A mechanism only earns "mint a new skill" by showing its own
independent trigger, not by being useful.

## Install (Claude Code)

```
/plugin marketplace add glisom/skills
/plugin install skill-thief@glisom
```


## Install (other harnesses)

Copy `skills/skill-thief/` into your agent's skills directory (for Claude
Code specifically, that is `.claude/skills/`). The skill body is written
harness-neutral on purpose, no scheduler tokens, no harness-specific tool
names, no unguarded platform path variables, so the same files that ship in
the plugin work as a plain copy. There is no separate copy of the body to
keep in sync.

## Usage

Point it at a source and a medium:

```
Use skill-thief on https://github.com/example/agent-skills, a public skills
repo, and tell me what's worth taking.

Use skill-thief on this conference talk: <video URL>. Same evaluation.

Compare our setup against the "acme-engineering" Claude Code plugin and tell
me what to absorb.
```

Each run inventories what this project already has, pins the exact version
of the source being read, scouts it for mechanisms, checks for prior art,
classifies every finding against the ladder above, and stops at a single
approval gate before writing anything.

## What it will not do

1. **Not an installer.** It never adds a marketplace, enables a third-party
   plugin, or vendors someone else's code. Its output is changes to your own
   configuration.
2. **Not a plugin-surface auditor.** Whether what is already installed is
   stale, or whether existing triggers collide, is a different question on a
   different cadence, not something this run answers.
3. **Not a feature-code writer.** It changes agent configuration only, never
   application code.
4. **Not a substitute for knowing your own repo.** See Limitations below.

## Limitations

A thin host repo weakens the prior-art check: with little existing tooling to
find, every mechanism looks like a gap, and the tool will over-recommend.

Verdict quality tracks how much of the host's conventions are written down
rather than held in people's heads. A repo whose conventions live in files
gets better verdicts than one where the same knowledge lives only with the
people who work in it.

## Development

Zero dependencies. Node >= 20.

```bash
node --test
node scripts/validate.mjs
```

The first runs the test suite, covering manifest integrity, skill
frontmatter budgets, reference-path integrity, and harness neutrality. The
second runs this repository's own zero-dependency validator against those
same surfaces. This is a development-time gate on this repo; it is not what
Phase 6 runs, which is whatever validation Phase 0 discovered the host
being reviewed already has, a different repo and a different validator each
time skill-thief runs.

CI runs both `node --test` and `node scripts/validate.mjs` on every push and
pull request; see `.github/workflows/ci.yml`.

## License

MIT. See [LICENSE](LICENSE).
