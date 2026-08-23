# Findings document template

This is the skeleton for the single document presented at the Phase 5
approval gate. Nothing is written before that gate; this document is the
first artifact produced, and it is produced once.

## Front section: source identity

Record before anything else:

- Source name and URL
- Medium (git repository, installed plugin or marketplace, video or talk,
  article or documentation), per `references/source-adapters.md`
- The pinned version: commit SHA, installed version compared against
  upstream, or publish date, matching whichever adapter applies
- Date this review was run
- Which host inventory (Phase 0's verdict-target map) this review resolved
  targets against

## The ranked gate table

One row per extracted mechanism, ranked so the reviewer sees the strongest
candidates first. Columns, in order:

| mechanism | source name -> neutral name | verdict | target | evidence | confidence |
|---|---|---|---|---|---|

- **mechanism**: the rubric, schema, gate, loop, or state model, described in
  one line.
- **source name -> neutral name**: the mechanism's name in the source,
  followed by the neutral vocabulary it was restated in for evaluation. Both
  sides are shown so the reader can trace the restatement back to what it
  came from.
- **verdict**: one of the four granularity-ladder outcomes, per
  `references/granularity-ladder.md`.
- **target**: the specific file or directory this verdict resolves to,
  drawn from the Phase 0 verdict-target map.
- **evidence**: what was found (or not found) in the host that supports this
  verdict, including the prior-art check from Phase 3.
- **confidence**: how sure this verdict is, and why. Low confidence is a
  valid entry; it tells the approver where to look harder before approving.

## The already-stronger list

Mechanisms where the host already has something better than the source's
version. Each entry names the mechanism, points at where the host's stronger
version already lives, and states briefly why it is stronger. This list
exists to stop a well-known mechanism from displacing a better local one
purely because it arrived with a bigger name attached.

## The not-applicable-yet list

Mechanisms whose relevance depends on a scale or shape the host does not
currently have, per `references/granularity-ladder.md`'s test (would the
reason still hold if the host doubled in size or scope). Each entry names
the mechanism and states the condition the host would need to meet before
it becomes a live finding. These are not Reject entries: recording one in
the rejection record would poison it for the version of the host where the
mechanism would actually apply.

## Evidence of absence, per finding

For every finding in the gate table whose verdict depends on the host
lacking something, record how that absence was established, not just that it
was observed. A description of a search does not substitute for the search:
record the literal command run (or the exact grep/search invocation) and its
actual output, including the empty result that establishes absence, plus
whether the initial scoped search was widened before absence was concluded.
"I did not see it" and "I searched these six paths with these three
patterns and found nothing" are different claims, and inventing plausible
paths and patterns after the fact is indistinguishable from the first one.
Only a recorded command with its recorded output supports a verdict. A
finding whose absence evidence carries no command and no output is not ready
for the gate, and this section is where that command and output are written
down so the approver can check them rather than take them on faith.
