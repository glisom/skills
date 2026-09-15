---
name: ux-deep-dive
description: "Drive every screen of a mobile or web app on a simulator, emulator, or browser, capture all of its routes and states as screenshots and short clips, and hand back a pre-annotated, markup-ready UX audit: a one-screen-per-page PDF with numbered callouts and a severity-ranked findings index, a companion motion page for what a still cannot carry, the raw captures, the fixture data used, and the build blockers hit on the way. Use when someone wants a thorough, evidence-backed UX/UI review of an app as it stands today. Trigger phrases include: UX deep dive, screenshot every screen, walk the whole app, capture 100% of the app, UX audit, review the app's UX, full app walkthrough, annotate every screen, what does the app look like right now, pre-annotate the screenshots."
---

# ux-deep-dive

Every screen, every state, one PDF you can mark up.

Announce at start: which app and which ref will be audited, on which device or browser, where the deliverable folder will be written, and that the repository will be restored to exactly its starting state when the run ends.

## What this is not

- Not a test run. CI proves the code compiles and the tests that exist pass; this drives the live app and records what a person would see.
- Not a persona or mystery-shopper loop. One informed reviewer walks the whole surface once, and that reviewer is allowed to read the code. First-person friction logging is a different tool.
- Not a bug fixer. It changes no application code. Every temporary change made to get clean captures is reverted before the run ends, and every finding is handed back as evidence, not as a patch.
- Not an accessibility audit. Dark mode and large text are captured as states so the reviewer can see them; nothing here scores a standard.
- Not a critique of the design intent. It judges the build as it stands on the day, against the pinned ref.

## The evidence rule

Every finding in the deliverable is one of two things: a runtime observation that was reproduced, or a line of code that was read and is cited by path. Nothing else is a finding. "It looks like" is a note to investigate, and it either becomes one of the two or it is dropped before assembly.

Load `references/severity-ladder.md` for the five tags and what each one requires as evidence. Skipping it produces a deliverable where a hunch and a reproduced crash carry the same weight, and the reader cannot tell which is which.

## Phase 0: pin the build

1. Find the app in the workspace and read whatever the repository already says about standing it up: a contributing guide, an environment file, an existing verification skill.
2. Fetch before anything else. A local checkout goes stale fast, and an audit of last month's tree is an audit of nothing.
3. If the working tree is dirty, stash it under a dated, named stash (`pre-uxdd-<date>: <what it was>`) and record the branch you left. The user's work in progress is not yours to lose; the stash is popped in Phase 7.
4. Check out the requested ref (default: the default branch, pulled fast-forward only) and record the identity block: app name, ref and short SHA, date, device or browser with OS version, build configuration, and the data source the screens will render from. This block goes on the PDF cover, in the README, and in the motion page header, verbatim.

Never audit an unpinned build. A finding that cannot say which commit it was observed on cannot be re-checked, and cannot be diffed on a re-run.

## Phase 1: stand up the environment

Load `references/environment-ladder.md`. It decides where the data on screen comes from, in order of preference: the app's own mock or demo mode, a real backend that starts with one command, or a dependency-free fixture server whose response shapes are taken from the app's own types and hooks. Synthetic data only, on every path; label it as sample data wherever the app will show it. Skipping the ladder produces a fixture built from guesses, and every guess becomes a finding you later retract.

Start the long-pole build (native compile, dependency install) in the background first, then investigate the backend while it runs. Waiting on a build with nothing else in flight is the most expensive idle time in the run.

Turn every feature flag on. A flag-gated surface that is never rendered is a screen the audit silently missed.

Every blocker hit while standing the app up is a developer-experience finding, recorded as it happens with the exact error and the exact fix, in its own document, separate from the UX findings. See the `findings-dev.md` section of `references/deliverable-spec.md`.

If the app cannot be launched after the blockers are recorded, the deliverable is the DX document alone. Report that plainly and stop; never invent screens.

## Phase 2: calibrate the capture rig

Load `references/capture-rig.md` and the platform file that matches the target: `references/platform-ios.md`, `references/platform-android.md`, or `references/platform-web.md`. The helpers in `assets/` implement the rig (`assets/capture.sh`, `assets/record.sh`, `assets/web-capture.mjs`); the references say when to use them and what to do when they cannot.

Before trusting a single "the control did not respond" observation, run the probe: capture, compute the expected coordinate of a known control from the capture's own pixel dimensions, tap it, capture again. A preview image with a distorted aspect ratio produces misses that look exactly like broken buttons, and the probe is the only thing that separates the two.

Captures are numbered and slugged (`NN-flow-state.png`), full resolution, written to `raw/` in the deliverable folder as they are taken. The number is the walk order; the slug is what a reader will search for.

## Phase 3: inventory the surface

Load `references/surface-inventory.md`. Enumerate every route and screen from the code before walking any of them: the router's file tree, the navigation graph, the tab bar, every modal and sheet, every flag-gated branch. Group them into lettered sections in the order a first-time user meets them.

The inventory is the coverage contract. Every entry ends the run in one of two lists: captured, or could-not-reach with the reason. The second list is an output of the audit, not an admission.

For each screen, the states worth a capture are listed in the reference. At minimum: the default view, every scroll position with new content, the empty state, the error state, the keyboard-up state on any form, and the disabled and enabled states of the primary action.

## Phase 4: walk, capture, trace

Walk the inventory in section order. For each screen:

1. Capture the default state, then each state from Phase 3 that the screen has.
2. Look at the capture as a first-time user would, then as an engineer would. Write down what is wrong, what is missing, and what is working well, in that order.
3. For anything wrong, trace it before recording it. Open the component, find the line, and cite it. If the cause is your fixture rather than the app, fix the fixture, recapture, and drop the note. If the cause is a dev-only overlay or your own mistyped input, the same.
4. For a crash, follow the crash protocol in `references/capture-rig.md`: capture the native log, confirm the process is gone, reproduce a second time, and keep the log line verbatim.
5. Append the notes to `build/audit.json` now, with the marker position, the tag, and the text. The findings file grows during the walk; it is never reconstructed from memory at the end.

Record what is working well on every screen that has something worth protecting. A `KEEP` note is not filler. It is the only thing that stops a good pattern from being redesigned away by someone who only received a list of complaints.

When two data sources disagree (the app's own mock forces one screen empty while the fixture fills it), run two passes and say in the screen's note which pass the capture came from. Never blend them into one screen that no real configuration produces.

Prefer deep links to reach screens once the tab-level flows have been walked by hand. A navigation bug in the app under audit is a finding, not a reason to lose an hour walking around it.

## Phase 5: record what a still cannot carry

Some findings are motion: a crash on a gesture, a map that pans, a total that updates live, a tab transition, a refresh. For each one, record a short clip of only that behavior, transcode it small, and write a one-line "what to watch" so a reader knows what the clip proves before it plays. Four to six clips is typical. The platform reference has the record and transcode commands; `assets/record.sh` wraps them for a simulator or emulator.

## Phase 6: assemble the deliverable

Load `references/deliverable-spec.md`. Skipping it produces a folder whose files each look fine and which nobody can navigate. The layout is fixed:

```
<App>-UX-Audit-<date>/
  README.md              start here: identity block, counts, the handful that matter, decisions, what is good, limits
  <App>-UX-Audit.pdf     one screen per page, numbered callouts, ranked index, room to mark up
  motion.html            the clips with their notes
  motion/                the clips
  raw/                   every capture at full resolution
  findings-dev.md        the build blockers
  build/                 audit.json, motion.json, inventory.md, the fixture server, the PDF source
```

Build the PDF with `assets/build_audit.py` and the motion page with `assets/build_motion.py`, then open the PDF and look at it. Check the cover, a divider, three screen pages, and the index. A capture that carries a dev artifact (a toast, a debugger banner, a mistyped field) is recaptured and the PDF rebuilt; it is never shipped with a note explaining the artifact.

Write the README last, from the finished index, not from memory.

## Phase 7: restore and hand off

1. Revert every temporary change made for clean captures (an overlay suppressed, a fixture URL, a flag). Grep the tree for the marker you left on each one.
2. Return to the branch recorded in Phase 0 and pop the stash. Confirm the working tree matches what Phase 0 recorded, and say so with the output.
3. State which processes are still running (a dev server, a fixture server, a simulator) and the exact command that stops each. Leaving them up is fine; leaving them unmentioned is not.
4. Package for the recipient: an archive whose root folder name is plain ASCII and matches the archive name, without duplicate image sets, verified by a round-trip extract. Note the size against the limit of wherever it is going.
5. Hand off with the identity block, the coverage totals, the count per tag, the handful of findings that matter most, and the path to the folder.

## Re-run behavior

If a prior audit folder for the same app exists, load its `build/audit.json` and walk its screen list first, before adding new screens. Carry each note's id forward. In the new index, mark every prior finding as resolved, persisting, or regressed, and every new one as new. The point of pinning the ref in Phase 0 is that this diff is possible.

## Stop conditions

- Stop at Phase 1 if the app cannot be launched after the blockers are recorded. Ship the DX document, report, and stop.
- Never record a finding without its evidence. A note with neither a reproduced observation nor a cited line is deleted before assembly, not shipped with a hedge.
- Never end a run with the user's stash unpopped or a temporary change still in the tree.
- Stop after the Phase 7 hand-off. Fixing what was found is a different run with a different mandate.
