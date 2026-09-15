# Worked example: the run this skill was generalized from

This is the 2026-09-01 run described in the design document, retold against
the skill's phase names, which did not exist when it happened. The app was a
pre-launch React Native (Expo) iOS app in a private client workspace; the
product, the client, and the specific findings are left out. What remains is
the shape of the run, the numbers, and the moments where a rule was earned.

Announcement (as the skill now requires): auditing the mobile app at the
default branch's head, on an iPhone 17 Pro simulator running iOS 26.5, a
debug build, writing to a dated deliverable folder beside the repo, and
restoring the repo to its starting branch and stash at the end.

## Phase 0: pin the build

The local checkout was 12 commits behind the remote and carried uncommitted
work on a feature branch. A named stash took the work; a fast-forward pull
brought the default branch current (78 commits). The identity block recorded
the short SHA, the date, the device and OS, and "Debug build, dev bundle".

Elapsed: 1 minute.

## Phase 1: stand up the environment

The app expected a backend on a local port and had a dev-mode auth bypass.
Its own review mode (rung 1) covered a handful of routes and forced one list
empty. The real backend (rung 2) was a separate multi-service stack. The
choice was a dependency-free fixture server (rung 3) with shapes read from
the app's hooks and its shared types package, aligned to the same persona
the app's review mode used, plus the review mode for the routes it covered:
a two-pass run.

The native build was started in the background before any of that
investigation and hit four blockers, each recorded as it happened:

| Entry | Blocker | Cost |
|---|---|---|
| D-01 | Generated build phases interpolated script paths unquoted; the checkout path had a space; the build failed after compiling and the app died at launch with a loader error that pointed elsewhere | the most time |
| D-02 | The generated native project predated a native SDK's config plugin, so a module was missing with no hint about regeneration | second |
| D-03 | The CLI resolved to a physical device with none attached; building directly against the booted simulator worked | third |
| D-04 | The dependency installer needed an explicit UTF-8 locale | least |

A fifth entry recorded a require cycle warning that fired on every launch,
found by reading the dev overlay before suppressing it.

Elapsed: 14 minutes to the first launch. The fixture was written during the
build.

## Phase 2: calibrate the capture rig

The first taps on a lower-screen control did not land, and for four minutes
the screen looked like it had two dead links. The probe found the cause: the
driving tool's preview image was aspect-distorted, so coordinates computed
from it missed. Switching to the rig's own full-resolution captures and
dividing by the 3x scale fixed every "dead" control at once. This is the
single rule in the skill most likely to save a false P1.

Text entry through the driving tool mangled one symbol, which produced a
dimmed primary action that was the app working correctly; the clipboard route
replaced typing for the rest of the run. Enabling the software keyboard
needed a simulator restart and immediately produced a real finding (a
recovery link hidden under the keyboard). The warnings overlay was read, then
suppressed with a marked one-line change that Phase 7 reverted.

Deep links worked on the first try and became the navigation strategy after
the tab-level walk, which mattered because the app had a back-navigation bug
that would otherwise have cost an hour.

## Phase 3: inventory the surface

Every file in the router tree, grouped into eleven lettered sections in the
order a new user meets them: authentication and onboarding, then the four
tabs, then the hub menu's destinations, settings and consent, a flag-gated
upload flow, a flag-gated shopping flow, and a closing section for error and
edge states. Fifty routes planned; fifty captured.

## Phase 4: walk, capture, trace

Forty-six minutes for fifty screens with their states. The trace-before-record
rule fired constantly. A sample of what it separated:

- A blank column on one screen was the fixture sending snake_case where the
  app read camelCase. Fixture fixed, note dropped.
- "No data" on two charts was a cache that survived the fixture fix. State
  wiped, charts rendered, note dropped.
- A banner reading "NaN days remaining, balance $0.00" was real: a hook
  unwrapped an envelope in a way that turned the documented null reply into a
  truthy object. P1, cited line.
- A phone number corrupted on a gate was real: a formatter took ten of an
  eleven-digit number, and the gate wrote it back. P1, cited line.
- A screen with no primary button was real: the button's background sat in
  a function-form style prop while its label color was static, so it
  rendered white on white. The same component was behind a second invisible
  button on another screen. One root cause, two symptoms, P1.
- A notifications screen that threw on every open was real: a gesture
  component required a root wrapper the app never rendered. P0, caught by
  the error boundary, so a broken screen rather than a terminated session.
- A results map that terminated the app on its list toggle was real and
  native: an uncaught view-registry exception in the simulator log,
  reproduced twice, process confirmed gone each time. P0, and the headline.
- The best interaction in the product, a live-updating estimate with honest
  handling of unpriced items, got a KEEP and a clip.
- One piece of copy was a decision for a compliance owner, not a copy edit.
  Tagged by user impact, opened with "Decision:", given its own README
  section.

## Phase 5: record what a still cannot carry

Four clips: the native crash, a map's pan and zoom and clustering, tab
switching with a pull-to-refresh, and the live estimate. Recorded with the
simulator's own recorder, stopped with SIGINT, transcoded to H.264 at 402
pixels wide. Each got a "what to watch" line.

## Phase 6: assemble the deliverable

A findings file with 114 notes across 50 screens built a 70-page landscape
PDF: cover with counts, how-to-read page with the legend and the debug-build
caveat, eleven dividers, fifty screen pages, and a ranked index. Looking at
the PDF found two login captures carrying dev artifacts; both were
recaptured, which took a keychain reset because the credential store had
survived a reinstall and auto-signed-in over the login screen. The motion
page was checked in a browser at two widths. The README was written last.

Elapsed: 14 minutes.

## Phase 7: restore and hand off

The overlay suppression was reverted, the original branch checked out, the
stash popped, and the working tree confirmed against the Phase 0 record. The
bundler and the fixture server were left running, with the two commands to
stop them stated in the hand-off.

Packaging came as a follow-up request. The first archive used the folder's
name as its root, which contained a non-ASCII character; the archive stored
it without a UTF-8 flag, and on a Windows machine every one of the 63
entries would have extracted under a mojibake path. The second archive used
an ASCII root equal to the archive name, dropped the PDF's downscaled image
set (a 6.8 MB duplicate of the raw captures), and was verified by a
round-trip extract: page count, clip paths, no non-ASCII names. Sixteen
megabytes, against the recipient's channel limits.

## What this run did not do, and the skill now does

- No inventory table was kept as a file; coverage was asserted from the
  router tree in the reviewer's head. `build/inventory.md` is now required.
- No dark-mode or large-text pass. The appearance passes are now a step.
- No clean status bar. The override is now in the rig.
- The findings file was a Python module; it is now JSON with a schema the
  builder validates, so a re-run can carry ids forward.
