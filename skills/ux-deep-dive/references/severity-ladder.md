# Severity ladder

Five tags. Every note in the audit carries exactly one, and the tag decides what evidence the note must carry before it is allowed into the deliverable.

| Tag | Means | Evidence required |
|---|---|---|
| **P0** | The app terminates, or the screen cannot render at all. The feature is blocked outright. | Reproduced at least twice. The native log line or the error-boundary text, verbatim. Confirmation that the process actually died (or that the boundary actually caught it). A clip if the trigger is a gesture. |
| **P1** | The user is shown something false (wrong data, wrong math, corrupted input), or a control they need does not work. | Traced to a specific file and line, cited in the note. A capture showing the false value or the dead control. |
| **P2** | It works, but it costs the user time, trust, or invites a wrong inference. Real friction. | The capture, plus one sentence that names the inference a user would draw. |
| **P3** | Craft, consistency, copy. Worth a pass before launch, not worth blocking on. | The capture. |
| **KEEP** | Working well. Called out deliberately so it is protected and reused as the product grows. | The capture, plus what makes it better than the category norm. |

The index ranks P0 first and KEEP last; within a tier, notes follow section order. The cover chips count notes, not screens.

## What is not a finding

Drop these before assembly, without a hedge:

- Anything the fixture caused. The tell is a value that appears nowhere in the app's own types. Fix the fixture, recapture, and delete the note.
- Anything a dev-only overlay caused: a warnings toast, a debugger banner, a "connected" pill. Read the overlay first (its text is often a real finding about the code), then suppress it reversibly and recapture.
- Anything your own input caused. A disabled primary action after a mistyped email is the app working. Verify the field contents before judging the control.
- Anything the code says is conditional on the environment (a camera button hidden on a simulator, a native module stubbed in debug). Put it in the could-not-reach list instead.
- Anything you did not observe and did not read. "Probably" is not a tier.

## Decisions, not defects

Some observations are not about execution: copy that a regulator would read as an inducement, a metric shown to end users that only means something to the business, a flow the product strategy has not decided on. Tag these by their user impact like any other note, but open the note text with **Decision:** and list them in the README's own "Decisions, not defects" section. A decision filed as a copy edit gets fixed as a copy edit, which is the wrong outcome.

## One root cause, many symptoms

When several screens share a cause (one button component, one date formatter, one envelope-unwrapping hook), the note on the first screen carries the trace and the tier, and every later screen's note says "same root cause as" the first note's id, with the tier repeated. The index then shows the blast radius without inflating the count of distinct problems, and the README names the root cause once.

## Choosing the handful that matter

The README leads with three to five findings. Pick them in this order of precedence, and stop when you have five:

1. It blocks the thing the product exists to do.
2. It shows wrong money, wrong health, or wrong safety information.
3. It is one root cause behind many symptoms.
4. It fails silently, so nobody will report it.
5. It corrupts data on a path the user cannot avoid (a gate, a required form).

## Build caveats

A debug build on a simulator or emulator is not a shipping build. Where a P0 or P1 could plausibly be a debug-only artifact (a style the release bundler applies differently, a native fault tied to a dev-only module), say in the note that it needs confirmation on a release build, and say in the README that it should be treated as shipping until that check is clean. Both halves; never only the first.

## Note budget per screen

Zero to six notes per capture. A screen that needs more than six is two captures (two states, or the top and the scrolled view), each with its own notes. Past six, markers stop being readable and the page stops being markable.
