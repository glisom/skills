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

Inventory what this project actually has, then produce a verdict-target map answering, for each of the four verdicts, where it would land here. Show the map before reading the source so a wrong guess is corrected while it is still cheap.

Load `references/host-discovery.md` for the inventory checklist and the on-demand rule for creating verdict homes. Skipping it produces a map that invents locations, and every later verdict inherits that error.

## Phase 1: pin the source

Record the exact version read: a commit SHA, an installed version compared
against upstream, or a publish date, plus the URL. An unpinned finding is not
reproducible and cannot be diffed later, which breaks re-run behavior before
it even starts.

Abort on any read failure with the exact error. Never continue on partial
state; a finding built on half a source is worse than no finding, because it
looks complete at the gate.

Load `references/source-adapters.md` for the pin rule per medium. Skipping it
produces findings attributed to "the repo" or "the talk" with nothing
specific enough to re-check later.

## Phase 2: scout for mechanisms, not features

Extract the mechanism behind each idea, the rubric, schema, gate, loop, or
state model, rather than the feature it ships as. Restate it in neutral
vocabulary. A mechanism carried over under its source's marketing name
arrives with that source's assumptions attached, and those assumptions are
harder to spot once the name has stuck.

For a large source, use a bounded parallel fan-out: scouts write full
evidence to scratch and return short summaries, so the orchestrating context
stays small no matter how big the source is. For a small source, run this
phase inline; a fan-out for three files is overhead with nothing to show for
it.

## Phase 3: check the host for prior art

Grep-first, against the surfaces the Phase 0 inventory found.

Evidence of absence is required, not asserted. A scoped search that finds
nothing must widen before absence is claimed: more paths, more patterns, more
terms, before the finding is allowed to say the host lacks something. "I did
not see it" and "I searched these six paths with these three patterns and
found nothing" are different claims, and only the second one supports a
verdict. Each finding records how its absence was established, using the
evidence-of-absence section of `references/findings-template.md`; a finding
that only asserts absence has not satisfied this phase, no matter how
confident the assertion reads.

This phase also produces the already-stronger list as an output in its own
right, not a byproduct of the search: places where the host already has
something better than the source's version. That list is what stops a
well-known mechanism from displacing a better local one on reputation alone.

## Phase 4: classify

Give every extracted mechanism exactly one verdict, resolving its target through the Phase 0 map.

Load `references/granularity-ladder.md` for the four verdicts and their selection criteria. Skipping it collapses the ladder into "add a new skill", which is the outcome this skill exists to prevent.

## Phase 5: one approval gate

Present the ranked gate table from `references/findings-template.md` exactly
once. Nothing is written before this gate, and everything is written after
it. This is a single gate for the whole review, not one approval per finding;
a mechanism-by-mechanism approval loop defeats the point of ranking findings
into one table for a single decision.

Wait for explicit approval before Phase 6 touches anything. A partial
approval (some rows approved, some rejected, some deferred) is still a single
pass through the gate; it does not reopen the gate per row.

## Phase 6: absorb

Apply the approved verdicts only, resolving each target through the Phase 0
map. Create a verdict home only where an approved item actually needs one;
an approved verdict targeting an existing file needs nothing created.

Write rejections using `references/rejection-template.md`, one file per
rejected concept, restating the two guardrails as part of writing each entry.

Run whatever validation Phase 0 discovered the host already has, and report
which commands actually ran along with their actual results. Do not claim
success generically; a report that says "validation passed" without naming
the command and its output is not distinguishable from a report that skipped
validation entirely.

## Re-run behavior

Re-running against a source that already has a findings document enters diff
mode: read the prior findings document, resolve the source's current
version, and report only what changed since the version pinned in that prior
document. A re-run is not a fresh Phase 0 through Phase 6 pass; it is scoped
to the delta.

## Stop conditions

- Abort at Phase 1 if the source cannot be read; report the exact error and
  stop rather than continuing on partial state.
- Stop at Phase 5 if the user rejects everything in the gate table; that is a
  complete, valid outcome, not a failure to retry.
- Never proceed past the gate without explicit approval, partial or full.
- Stop after Phase 6's validation report. Absorbing findings and reporting
  which validation commands ran and what they returned is the end of the
  run; nothing continues past that report.
