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

## Phase 2: scout for mechanisms, not features

## Phase 3: check the host for prior art

## Phase 4: classify

Give every extracted mechanism exactly one verdict, resolving its target through the Phase 0 map.

Load `references/granularity-ladder.md` for the four verdicts and their selection criteria. Skipping it collapses the ladder into "add a new skill", which is the outcome this skill exists to prevent.

## Phase 5: one approval gate

## Phase 6: absorb

## Re-run behavior

## Stop conditions
