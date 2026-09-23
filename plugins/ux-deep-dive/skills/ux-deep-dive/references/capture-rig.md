# Capture rig

The rig is the set of habits that make a capture trustworthy. Set it up once in Phase 2, before the walk, and do not improvise it mid-screen.

## The capture helper

Run `bash "$SKILL_DIR/assets/capture.sh" <slug>` from the audit directory to write `raw/NN-<slug>.png` at full resolution and a preview for coordinate work. Resolve `SKILL_DIR` using `references/runtime.md`. `NN` is assigned as the next number in the folder unless the slug already starts with one. Environment variables select the platform, device, and output folder; the script header lists them. On the web, `assets/web-capture.mjs` captures a list of routes.

Naming rules, because `build/audit.json` refers to these files and a rename after the fact breaks it:

- `NN` is walk order, two digits, never reused.
- The slug is `flow-state`: `auth-login`, `auth-login-keyboard`, `home-scroll1`, `claims-empty`.
- Evidence of a defect may carry a `BUG-` prefix in the slug so it can be found later.
- Never rename or renumber after Phase 4 starts.

## The probe

Before the first real capture, and again after any change of device, orientation, or window size:

1. Capture a screen with a known control on it.
2. Read the capture's pixel dimensions. Divide by the platform's scale factor to get the point size; that is the coordinate space any tap tool uses.
3. Compute the control's point coordinate from the capture and tap it.
4. Capture again and confirm the control responded.

A harness screenshot tool that returns a resized or aspect-distorted image produces taps that land in the wrong place, and a tap that lands in the wrong place looks exactly like an unresponsive button. Every "the control did not respond" observation in the audit is only valid after the probe passed on that device. Use your own full-resolution captures for coordinate work, never the preview a driving tool returns.

## Text entry

Typing through a driving tool can mangle symbols (an `@` that arrives as something else), and hardware-key injection can dismiss the software keyboard or open a developer menu. When a field matters:

1. Put the value on the clipboard through the platform (the platform reference has the command).
2. Select all in the field, then paste.
3. Look at the field in a capture before judging any control that depends on it.

A disabled primary action after a mistyped email is the app working correctly. It is also a P3 if nothing tells the user why the control is disabled; the two are different findings and only the second one is real.

## Keyboard-up states

Enable the software keyboard (the platform reference says how; on some simulators this needs a restart) and capture every form with it open. What the keyboard hides is a finding class of its own: a recovery link, a submit button, a legal line.

## Overlays

Developer toasts, warning boxes, "connected to the bundler" pills, framework error overlays, and cookie banners all end up in captures. The order is fixed:

1. Read them first. A recurring warning is often a real finding about the code (a require cycle, a deprecated API, a missing key).
2. Suppress them in the isolated audit environment with a reversible change, marked with a comment you can search for, and record the change in the Phase 7 revert list. With no writable isolated environment, record the overlay as a capture limitation; preserve the original checkout.
3. Never crop an overlay out to conceal it. When it cannot be suppressed in the audit environment, retain the labeled evidence and mark the affected clean-capture coverage incomplete.

## Status bar and chrome

Set a clean status bar for the captures where the platform allows it: a fixed time, full battery, full signal. It is cosmetic, and reviewers notice a 3 percent battery more than the finding beside it.

## Navigation

Walk the tab-level flows by tapping, so the real navigation is exercised and its bugs are observed. After that, prefer deep links to reach the rest of the inventory; the surface inventory carries a link for every route that has one. When a link fails, tap into the screen once to separate "the link is broken" from "the screen is broken" before recording either.

## Scrolled captures

Overlap consecutive captures by roughly a fifth of the screen so nothing falls between them. Name them `-scroll1`, `-scroll2`. A long screen with new content at every position is several captures; a long screen that repeats itself is one capture and a note.

## The crash protocol

1. Write down the exact action that preceded the crash.
2. Confirm the process is gone using the platform command, so a crash is not confused with a navigation reset.
3. Pull the native log for the last minute, filtered to the process, and keep the exception line verbatim.
4. Relaunch and reproduce a second time. One occurrence is a note; two is a P0.
5. Record a clip on the second or third reproduction when recording is available. Otherwise keep stills and the required crash evidence and record the missing clip as a limitation.
6. Say whether the app's own error boundary caught it or the operating system did. A caught error is a broken screen; an uncaught one is a terminated session, and the fix path differs.

## Wiping state

Between data passes, and whenever a recapture unexpectedly does not change, wipe persisted state: reinstall the app, clear app data, or clear site data. Reset the credential store separately when a logged-out capture is needed; on some platforms it survives a reinstall, and the app auto-signs-in over your login capture.

## Appearance passes

At the end of the walk, capture the six to eight most important screens again in dark mode and once more at a large text size. Name them `-dark` and `-xl-text`. They are captured as states for the reviewer, not scored.

## The cleanliness gate

Before assembly, look at every capture in `raw/` at thumbnail size in one grid. Recapture dev artifacts introduced by this run, mistyped values, overlays left over from a prior screen, and wrong screens. When an environment limit prevents a clean recapture, label that evidence and mark the affected coverage incomplete. If image viewing is unavailable, explicitly mark visual QA incomplete.
