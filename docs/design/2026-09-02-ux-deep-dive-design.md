# ux-deep-dive design

Date: 2026-09-02
Status: approved, implemented in the same pass

## The problem

Asking an agent to "review the UX of this app" produces a review of whatever
the agent happened to reach. The screens it found are judged; the screens it
never opened are invisible; the judgments are not separable from the captures;
and nothing about the run can be repeated against the next build.

ux-deep-dive is the repeatable procedure for the full version of that request:
drive every screen of a mobile or web app on a simulator, emulator, or
browser, capture all of it, trace every anomaly to a line or a reproduction,
and hand back a folder that a product team can mark up and that a later run
can diff against.

## Provenance

This design is generalized from one real run on 2026-09-01, against a
pre-launch React Native (Expo) iOS app in a regulated consumer domain, in a
private client workspace. One prompt, no steering until the end:

> Open the iOS simulator, screenshot all views, and convert it into a PDF I
> can mark up. Go through all flows, click on all screens, explore the app
> fully and capture 100% of it. You are welcome to provide your own feedback.
> Pull to have the most up to date version. Pre-annotate the screenshots.
> Anything that involves motion or cannot be captured in a screenshot, create
> an HTML page of clips with the feedback attached.

The run's shape, which the phase structure below encodes:

| Phase of the run | Wall clock | What happened |
|---|---|---|
| Orient, pin, stand up | 15 min | Fetched (78 commits behind), stashed uncommitted work, regenerated the native project, worked around four build blockers, wrote a fixture backend while the native build ran |
| Calibrate and walk | 46 min | Probed the coordinate mapping, enabled the software keyboard, silenced a dev overlay, walked every route in the router tree with deep links, traced each anomaly to a line |
| Record and assemble | 14 min | Four clips, a 70-page pre-annotated PDF built from a findings file, a motion page, a README, a DX findings file, the repo restored |
| Package | 4 min, on request | A zip with an ASCII root after the first one broke on Windows |

Output: 50 screens, 114 notes (4 P0, 18 P1, 38 P2, 54 P3, 43 KEEP), 4 clips,
5 build blockers, one folder. Two hard crashes, one of them native and
uncatchable by the app's own error handling, and one root cause behind two
invisible primary buttons.

## Non-goals

1. **Not a test run.** The skill drives the live app and records what a person
   sees. Whether the tests pass is a different question with a different tool.
2. **Not a persona loop.** A first-person, blind, in-character friction pass
   is valuable and different: it must not read the code, and it produces raw
   perception. This skill is one informed reviewer who is allowed to read the
   code and is required to cite it.
3. **Not a bug fixer.** No application code changes. Temporary changes made
   for clean captures (an overlay suppressed) are marked and reverted.
4. **Not an accessibility audit.** Dark mode and large text are captured as
   states so the reviewer can see them. Nothing is scored against a standard.
5. **Not a critique of intent.** The build as it stands on the pinned ref is
   the subject. Whether the design should be different is for the reader.

## The evidence rule

Every finding is one of two things: a runtime observation that was
reproduced, or a line of code that was read and is cited. This is the rule
the whole skill hangs on. The 2026-09-01 run produced at least five
observations that looked like app bugs and were the fixture, the driving
tool, or the reviewer's own typo. Each was caught only because the rule forced
a trace before the note was recorded. Without it, the deliverable would have
carried retractable findings, and a deliverable with one retractable finding
is read as a deliverable where any finding might be.

## The severity ladder

Five tags: P0 (crash or blocked), P1 (wrong data or unusable control), P2
(real friction), P3 (polish), KEEP (working well). The tag decides the
evidence: P0 needs two reproductions and the native log line; P1 needs a
cited line; P2 needs the inference named; P3 and KEEP need the capture.

Two parts of the ladder earned their place in the run rather than being
designed in advance.

**KEEP is mandatory, not optional.** The best interaction in the product
under review was also the one most at risk from a redesign, because a reader
who receives only a list of complaints has no reason to protect anything.
Forty-three KEEP notes out of 114 is the right ratio, not filler.

**Decisions are not defects.** One observation in the run was copy that a
regulator would read differently from a product manager. Filing it as a P3
copy edit would have gotten it edited; it needed a decision. The ladder now
carries a "Decision:" prefix and the README carries a section for them.

## Run shape

Eight phases, in order, with a single output folder growing through them.

| Phase | Does | Rule it encodes |
|---|---|---|
| 0 Pin | fetch, stash, checkout, identity block | never audit an unpinned or stale build; never lose the user's work |
| 1 Stand up | background the long pole, choose the data rung, turn flags on, record blockers | plumbing time is the enemy; every blocker is a finding |
| 2 Calibrate | capture helper, the probe, keyboard, overlays, deep links | a tap that lands wrong looks like a broken button |
| 3 Inventory | routes from the code, lettered sections, states, coverage table | coverage is a contract, and could-not-reach is an output |
| 4 Walk | capture, observe, trace, log to the findings file as you go | evidence before the note; fixture faults are dropped, not hedged |
| 5 Record | clips for what a still cannot carry, with "what to watch" | motion findings need motion evidence |
| 6 Assemble | PDF from the findings file, motion page, README last | look at the PDF before shipping it |
| 7 Restore | revert, unstash, verify, package, hand off | the repo ends exactly as it began |

Expected budget on a fifty-screen app: about a quarter of the time on
standing up, half on walking, a quarter on assembly. The environment ladder's
first instruction, start the long pole before investigating anything else, is
the single largest time saving in the run.

## What went wrong in the run, and the rule each one became

| What happened | Rule | Where it lives |
|---|---|---|
| Checkout was 12 commits behind with uncommitted work in the tree | fetch first; named stash; pop in Phase 7 | SKILL.md Phase 0 |
| A dependency install failed on a locale error, masked by a pipe's exit code | set the locale; read the build's own exit status | environment-ladder, platform-ios |
| A stale generated native project silently dropped a native SDK | regenerate when the generated tree predates config | platform-ios |
| The CLI resolved to a physical device with none attached | build directly against the booted simulator | platform-ios |
| Unquoted paths in a generated build phase broke on a space, after compiling, before embedding, with a misleading loader error at launch | the paths-with-spaces rule; the "failure mode worse than the failure" DX sentence | platform-ios, deliverable-spec |
| A signing flag stripped entitlements and the secure store threw | use an ad-hoc identity, not signing-disabled | platform-ios |
| The real backend was a separate stack that would have eaten the budget | the environment ladder; a fixture with shapes from the app's hooks | environment-ladder |
| The app's own mock persona disagreed with the fixture persona | one persona everywhere, aligned with app-side mocks | environment-ladder |
| Mock mode forced one list empty while the fixture filled it | the two-pass rule | environment-ladder, SKILL.md Phase 4 |
| The driving tool's preview was aspect-distorted; taps missed and looked like dead controls | the probe; own captures for coordinates | capture-rig |
| The driving tool mistyped a symbol; a dimmed sign-in was the reviewer's typo | clipboard entry; verify the field before judging the control | capture-rig |
| Hardware-key injection hid the keyboard and opened the dev menu | keyboard rule; clipboard route | capture-rig, platform-ios |
| A warnings toast polluted captures, and its text was a real finding | read overlays first, suppress reversibly, revert | capture-rig |
| Fixture shape mismatches produced fake findings (blank rows, "No data" charts) | shapes from the app's types; fix the fixture, drop the note | environment-ladder, severity-ladder |
| A persisted query cache hid a fixture fix | wipe state before concluding | environment-ladder, capture-rig |
| The keychain survived a reinstall and auto-signed-in over the login capture | reset the credential store for logged-out captures | capture-rig, platform-ios |
| A back-navigation bug made the walk slow | deep links after the tab-level walk | capture-rig |
| A native crash with nothing catching it | the crash protocol: process check, log, second reproduction, clip, caught-or-not | capture-rig |
| A crash overlay from one screen spoiled the next two captures | the cleanliness gate | capture-rig |
| Two captures with dev artifacts made it into the first PDF | look at the PDF; recapture; rebuild | SKILL.md Phase 6 |
| The best screen in the product had no place in a defect list | KEEP is mandatory | severity-ladder |
| A compliance observation was not a bug | decisions, not defects | severity-ladder |
| One button component behind two invisible buttons | one root cause, many symptoms | severity-ladder |
| A zip root with a non-ASCII character extracted as mojibake on Windows | ASCII root; round-trip verify | deliverable-spec |
| A duplicate image set doubled the archive | exclude the PDF's downscaled images | deliverable-spec |

## The deliverable

A PDF rather than a page, because the reader asked for something to mark up
and a PDF is what gets marked up. Landscape, one screen per page, the capture
on the left with numbered markers, the notes on the right, and deliberate
white space at the bottom. The white space is the most-asked-about feature
and the cheapest.

A motion page rather than clips in the PDF, because a PDF cannot play a clip
and a clip without a "what to watch" line is a puzzle.

The raw captures, because the reader will crop and annotate and drop them
into their own tools.

The findings as data (`build/audit.json`), because the PDF is a rendering and
the data is what a re-run diffs against. The builder assigns stable ids so a
prior finding can be marked resolved, persisting, or regressed.

The fixture server, because a screenshot of synthetic data is only
reproducible if the synthetic data is.

The DX findings, because getting the app to run cost a fifth of the run and
every blocker is a bug the next contributor will hit.

## Platform neutrality

The skill body and the rig are platform-neutral; the commands are not, and
pretending otherwise produces a reference that is wrong everywhere. Three
platform files carry the concrete commands (iOS simulator, Android emulator,
web), and the helpers under `assets/` branch on an environment variable. The
iOS file is the one the run exercised end to end. The Android and web files
were written against the platform tools' documented behavior and checked
where the tools were available; the first full run on each will correct them.

## Harness neutrality

Same rule as skill-thief: one body, no per-harness twin, no scheduler tokens,
no harness-specific tool names, no unguarded platform variables. Where the run
used a harness-specific simulator-control tool for taps and swipes, the skill
says "the harness's device-control tool" and the platform file gives the
fallback. The validator enforces the neutral wording.

## Validation

The repo enforces on itself what the skill asks of its users. The
zero-dependency validator checks manifest integrity, frontmatter budgets,
reference and asset path integrity, harness neutrality, prose style (no em
dashes in shipped prose), and that every asset script parses and the audit
builder validates the bundled example. The test suite additionally renders
the example end to end and asserts the page and marker counts.

## Limitations

A thin inventory weakens the coverage claim: a stack without file-based
routing (SwiftUI, UIKit) needs the reviewer to enumerate destinations by hand,
and the could-not-reach list is only as honest as that enumeration.

Fixture quality bounds finding quality. A screen rendered from a wrong shape
is wrong in a way the app is not, and the reviewer has to notice. The
environment ladder's rules reduce this; they do not remove it.

Re-run diffing is designed and unexercised. The builder supports carried ids
and statuses; no second run against the same app has been done yet.

## Open questions

- Whether a web run should produce three PDFs (one per viewport) or one PDF
  at the mobile viewport with the other sizes in `raw/`. The current answer
  is the second, until a web run shows otherwise.
- Whether the Android clipboard gap (no built-in write without a helper app)
  is worth a bundled helper, or whether typing plus verification is enough.
