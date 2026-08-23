# The granularity ladder

Every mechanism extracted from a source gets exactly one verdict. This is the
core judgment call of the whole skill, and the part most likely to be gotten
wrong by defaulting to the loudest option (mint a new skill for everything).

| Verdict | Applies when | Lands in |
|---|---|---|
| **Absorb as a rule** (default) | No independent trigger exists. Nobody would ever invoke this mechanism by name. | An existing skill body, the agent instruction file, or a conventions doc |
| **Mint a new skill** | The mechanism has its own trigger. A user would invoke it at a time when no existing skill would fire. | A new skill directory |
| **Harden a gate** | The mechanism is a check, not prose. Its value is that it fails a build. | A validation script or test tier |
| **Reject** | There is a durable, concept-level reason not to adopt it. | The rejection record |

## Why absorb-as-a-rule is the default

Minting a skill is the expensive verdict, not the neutral one. A new skill
spends description budget in every future session from then on, and it
competes for routing with every skill already installed. Two overlapping
triggers do not average out to good coverage; they make the router's job
harder for both of them.

Absorbing a mechanism as a rule costs nothing at routing time. It only pays
off if the mechanism is used, at the moment an already-triggered skill or the
agent instruction file is read. The ladder is deliberately biased toward that
cheap outcome, and a mechanism only climbs to "mint a new skill" when it can
show its own independent trigger, not just usefulness.

## The two Reject guardrails

Reject records a durable, concept-level reason not to adopt something. Two
things must never be filed there:

- **A deferral is not a rejection.** "We are busy this quarter," "not a
  priority right now," or any reason that could change with scheduling does
  not belong in the rejection record. Only reasons that would still hold if
  the team had unlimited time belong there.
- **Never record an already-implemented idea as rejected.** If the host
  already does the thing the source mechanism proposes, that is prior art,
  not a rejection, and filing it as Reject poisons future lookups: a later
  reviewer will read the rejection record, conclude the idea was tried and
  discarded, and miss that it is live and working. Point at where it already
  lives instead.

## Why three verdicts are not enough

An earlier version of this ladder had three verdicts: rule, skill, reject.
It was wrong, and the mechanism that exposed the gap is worth restating as
the worked example.

Consider a test that asserts every file path mentioned in a skill's prose
actually exists on disk. It touches no skill prose at all: it is not
something a user invokes, and it carries no instructions for an agent to
follow. Under a three-verdict ladder, a mechanism that is not a skill and is
not being rejected has nowhere to go but "absorb as a rule." That misfiling
loses the thing that made the mechanism valuable in the first place: it is
supposed to fail a build, and prose absorbed into a skill body or a
conventions doc cannot do that. A ladder without "harden a gate" quietly
converts every build-failing check it encounters into advice that can be
skipped.
