# Host discovery

Phase 0 exists because every later verdict in this skill resolves its target
through what gets found here. A wrong or missing entry in the inventory
propagates into every mechanism classified afterward, so this phase runs
before the source is even read.

## Inventory checklist

Walk the host project and record what actually exists for each of these
surfaces. Absence is a valid answer; a guess is not.

- Skill directories
- The agent instruction file (the project-level and user-level convention
  files that get loaded into every session)
- Slash commands
- Hooks
- Subagents
- Validation scripts
- Any conventions or pitfalls document
- Any rejection record
- Any notes directory
- Any existing findings document, or the directory that holds them

## Building the verdict-target map

For each of the four verdicts on the granularity ladder (absorb as a rule,
mint a new skill, harden a gate, reject), name the specific file or
directory in this host where that verdict would land, using what the
inventory above actually turned up. A host with a conventions doc points
"absorb as a rule" at that doc. A host with no rejection record has no
target to name yet; see "When a surface is absent" below for how to record
that without inventing one.

Show this map before reading the source material. A wrong guess here is
cheap to correct at this point. The same wrong guess discovered after the
approval gate means every mechanism already classified against it has to be
re-checked.

## Locating the findings document

The inventory also determines whether a prior findings document already
exists, since `SKILL.md`'s re-run behavior depends on finding it. If the
inventory turns up one, name it in the map the same way an existing
conventions doc becomes the target for "absorb as a rule": that document (or
the directory holding several) is where this run reads the prior findings
from and where a new one belongs. If none exists, report the absence in the
map and propose no path, exactly as any other absent surface below; a first
run has nothing to diff against, and Phase 6 decides where to create a new
findings document only if and when this run actually needs to write one.

## The on-demand rule

A verdict home is created only when an approved verdict actually needs it,
never scaffolded upfront. Do not create an empty rejection record, an empty
notes directory, or a placeholder skill just because the inventory found
none. Scaffolding a stranger's repo with structure nobody asked for and
nothing yet fills is how a tool like this gets uninstalled: it reads as
noise added to someone else's project rather than a considered change.

## When a surface is absent

If the inventory turns up no conventions doc, no rejection record, or no
equivalent for any checklist item, report that absence directly in the
verdict-target map (for example, "no rejection record found") and stop
there. Never invent a location for a surface that is not there, and never
propose a specific new path as a stand-in, even one labeled "not yet
created." An invented path looks like a finding and reads as one at the
approval gate, but nothing backs it, and whoever approves the map is now
approving a location that does not exist. If a verdict needing that kind of
surface is later approved at the gate, Phase 6 decides the actual location
then, using whatever directory conventions this host has at that time, not
a guess made before the source was even read.
