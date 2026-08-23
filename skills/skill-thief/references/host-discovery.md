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

## Building the verdict-target map

For each of the four verdicts on the granularity ladder (absorb as a rule,
mint a new skill, harden a gate, reject), name the specific file or
directory in this host where that verdict would land, using what the
inventory above actually turned up. A host with a conventions doc points
"absorb as a rule" at that doc; a host with no rejection record still names
where one would go if the first Reject is approved, without creating it yet.

Show this map before reading the source material. A wrong guess here is
cheap to correct at this point. The same wrong guess discovered after the
approval gate means every mechanism already classified against it has to be
re-checked.

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
verdict-target map (for example, "no rejection record found; Reject
verdicts would need one created here"). Never invent a location for a
surface that is not there. An invented path looks like a finding and reads
as one at the approval gate, but nothing backs it, and whoever approves the
map is now approving a location that does not exist.
