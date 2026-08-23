# skill-thief design

Date: 2026-08-23
Status: approved, pre-implementation

## The problem

Engineers regularly read someone else's agent tooling (a repo, a plugin, a
conference talk) and come away with ideas worth adopting. Two failure modes
follow, and both are common.

The first is **cargo-culting**: installing the whole thing. The tool gets added
to the marketplace, its skills load into every session, and its descriptions
compete with the ones already there. Adoption cost is paid forever; the actual
insight was three paragraphs.

The second is **evaporation**: extracting the good ideas by hand, applying two
of them, and losing the reasoning. Six months later the same source is read
again from scratch, the same ideas are re-derived, and the ideas that were
deliberately rejected get re-proposed because nothing recorded the rejection.

skill-thief is the repeatable procedure between those two failures. It reads an
external source, extracts the mechanisms behind its ideas, decides at what
granularity each one should land in **your** setup, and records both what was
taken and what was refused.

## Provenance

This design is generalized from three real runs in one ten-day window, all in a
private repo:

| Date | Source | Outcome |
|---|---|---|
| 2026-08-12 | a public skills repo | one PR absorbing five discipline rules into existing skills |
| 2026-08-20 | a conference video | one merged PR |
| 2026-08-23 | a public engineering plugin | this design |

The first run's commit message already contained the governing rule, stated
once and then never written down anywhere an agent could find it:

> Rules adopted from the review rather than minted as new skills (granularity:
> a rule beats a skill when no independent trigger exists).

Encoding that judgment is the point of this tool. The reading is the easy part.

## Non-goals

1. **Not an installer.** skill-thief never adds a marketplace, enables a
   third-party plugin, or vendors someone else's code. Its output is changes to
   your own configuration.
2. **Not a plugin-surface auditor.** "What is installed, is it stale, do the
   triggers collide" is a different question on a different cadence. It belongs
   in a periodic audit, not in a per-source extraction run.
3. **Not a feature-code writer.** It changes agent configuration, never
   application code.
4. **Not a substitute for knowing your own repo.** See Limitations.

## The granularity ladder

Every extracted mechanism receives exactly one verdict. This is the core of the
tool and the part that is hardest to re-derive.

| Verdict | Applies when | Lands in |
|---|---|---|
| **Absorb as a rule** (default) | No independent trigger exists. Nobody would ever invoke this by name. | An existing skill body, the agent instruction file, or a conventions doc |
| **Mint a new skill** | It has its own trigger. A user would invoke it at a time when no existing skill would fire. | A new skill directory |
| **Harden a gate** | The mechanism is a check, not prose. Its value is that it fails a build. | A validation script or test tier |
| **Reject** | There is a durable, concept-level reason not to adopt it. | The rejection record |

Implementation added two Phase 3 exits, already-stronger and
not-applicable-yet, that let a mechanism leave the review before any of the
four verdicts above is assigned; see `skills/skill-thief/references/granularity-ladder.md`.

The default is deliberately the cheapest verdict. Minting a skill is the
expensive outcome: it consumes description budget in every future session and
competes for routing with everything already installed. The ladder's bias
against it is the tool's main defense against the bloat it exists to prevent.

Two guardrails on Reject:

- A deferral is not a rejection. "We are busy this quarter" does not belong in
  the rejection record. Only durable, concept-level reasons do.
- Never record an already-implemented idea as rejected. That poisons future
  lookups. Point at where the thing already lives instead.

### The fourth verdict earned its place

An early three-verdict version (rule, skill, reject) was wrong. The best steal
from the 2026-08-23 run was a test that asserts every file path mentioned in a
skill actually exists on disk. It touches no skill prose at all. Under a
three-verdict ladder it would have been misfiled as a rule and quietly lost its
enforcement. Mechanisms whose whole value is that they fail a build need their
own verdict.

## Run shape

An orchestrator with a bounded scout fan-out. Scouts write full evidence to a
scratch dossier and return short summaries, so the orchestrator's context stays
small on large sources. Small sources run inline without fan-out.

### Phase 0: discover the host

Inventory what this repo actually has: skill directories, the agent instruction
file (`CLAUDE.md`, `AGENTS.md`, or equivalent), slash commands, hooks,
subagents, validation scripts, any conventions or pitfalls document, any
rejection record, any notes directory.

Produce a **verdict-target map**: for each of the four verdicts, where would it
land here? Show the map before reading the source, so a wrong guess is corrected
while it is cheap instead of at the approval gate.

Homes are created on demand, never upfront. A repo with no rejection record does
not get one until the first Reject is approved. Scaffolding a stranger's repo
with unused structure is how tools get uninstalled.

### Phase 1: pin the source

Record the exact version, commit SHA, or publish date, plus the URL.

This is not bookkeeping. In the 2026-08-23 run the locally installed copy of the
source was two months and nine minor versions behind its upstream. Every
conclusion about "do they have X" depended on which of the two was being read.
An unpinned finding is not reproducible and cannot be diffed later.

Abort on any read failure with the exact error. Never continue on partial state.

### Phase 2: scout for mechanisms, not features

Extract the mechanism behind each idea: the rubric, the schema, the gate, the
loop, the state model. Restate it in neutral vocabulary rather than the source's
branding.

Naming discipline matters here. A mechanism carried over under its original
marketing name arrives with assumptions attached and is harder to evaluate on
its merits.

### Phase 3: check the host for prior art

Grep-first, against the surfaces found in Phase 0.

**Evidence of absence is required, not asserted.** A scoped grep that finds
nothing must widen before absence is claimed, and each finding records how
absence was established. "I did not see it" and "I searched these six paths with
these three patterns" are different claims, and only the second one supports a
verdict.

This phase also produces the **already stronger** list: places where the host
already has something better than the source's version. That list is an output,
not a byproduct. Its job is to stop a famous mechanism from displacing a better
local one.

### Phase 4: classify

Apply the granularity ladder. Resolve each verdict's target through Phase 0's
map.

### Phase 5: one approval gate

A single ranked table, presented once:

`mechanism · source name -> neutral name · verdict · target · evidence · confidence`

Nothing is written before this gate. Everything is written after it. One gate,
not one per finding.

### Phase 6: absorb

Apply the approved verdicts. Create verdict homes where an approved item needs
one. Run whatever validation Phase 0 discovered, and report which commands ran
and their results rather than claiming success generically.

## Re-run behavior

Re-running against a previously evaluated source enters **diff mode**: read the
prior findings document, resolve the source's current version, and report only
what changed since the pinned version.

Proof case: re-running the 2026-08-23 source today should surface exactly the
three skills added upstream since that run, and nothing else.

## What makes this more than asking a model to compare two repos

Four provisions, each earned from a real failure:

1. **The ladder defaults to rule, not skill.** Direct bias against surface
   growth.
2. **The already-stronger list.** Prevents replacing something better with
   something better-known.
3. **The durable rejection record.** The same idea does not get re-proposed
   every quarter, and the reasoning survives the session.
4. **Evidence of absence is required.** A gap claim that no one verified is how
   duplicate mechanisms get adopted.

The failure this prevents is concrete. In the repo that motivated this tool, six
distinct jobs (code review, simplify, brainstorm, debug, worktree management,
commit) were each covered by three or four separately installed skills, all
loaded simultaneously, purely from unexamined adoption.

## Packaging

Ships as a Claude Code plugin with a marketplace manifest, so installation is
one command.

```
.claude-plugin/plugin.json
.claude-plugin/marketplace.json
skills/skill-thief/SKILL.md
skills/skill-thief/references/
    granularity-ladder.md
    host-discovery.md
    source-adapters.md
    findings-template.md
    rejection-template.md
README.md
LICENSE          (MIT)
CHANGELOG.md
docs/design/
```

### One body, two install paths

The skill body is written harness-neutral: no scheduler tokens, no
harness-specific tool names, no unguarded platform path variables. Claude Code
users install the plugin. Codex, Cursor, and Gemini users copy the same
`SKILL.md` into their own skills directory.

There is deliberately **no second copy of the body** for other harnesses. A
duplicated body needs a parity checker to stay honest, and the parity checker
becomes its own maintenance tax. One body that reads correctly everywhere beats
two bodies that drift.

### Source adapters

The gather step differs by medium; everything downstream is identical. Adapters
cover: git repository, installed plugin or marketplace, video or talk, and
article or documentation. All three motivating runs used a different medium,
which is why medium is an input rather than a constraint.

## Limitations

**Thin host repos weaken Phase 3.** With little prior art to find, every
mechanism looks like a gap, and the tool will over-recommend. Per-finding
confidence and evidence-of-absence at the gate reduce this but do not solve it.
This is a documented limitation, not a solved problem.

**Judgment quality tracks host familiarity.** The verdicts are only as good as
the Phase 0 inventory. A repo whose conventions live in people's heads rather
than in files will get worse verdicts than one that writes them down.

## Decisions taken

| Decision | Choice | Rejected alternative |
|---|---|---|
| Distribution | Claude Code plugin plus marketplace | Loose skill folder, copy-paste only |
| Steal target | Whole agent-config surface | Skills only (would misfile the gate verdict) |
| Host conventions | Discover, create homes on demand | Config file; opinionated init scaffold |
| Harness support | One neutral body, two install paths | Per-harness twin bodies; full multi-target converter |
| Run shape | Orchestrator plus bounded scout fan-out | Single-pass inline; split scout/absorb skills |
| Output boundary | Findings, one gate, then absorb | Report-only; file to an issue tracker |

The split scout/absorb option was rejected on self-consistency grounds: two
triggers for one job is exactly what the granularity ladder tells users not to
do.
