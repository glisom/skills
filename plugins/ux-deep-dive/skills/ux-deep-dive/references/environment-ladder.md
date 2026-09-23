# Environment ladder

Where the data on screen comes from is decided once, before the first capture, and recorded in the identity block. Pick the cheapest rung that renders every data-driven screen with plausible content.

## Rung 1: the app's own mock, demo, or review mode

Look for it before building anything: a mock adapter behind a flag, a review persona, a storybook, a demo account. It costs nothing and its data is already shaped correctly. Its limits are also known in advance; a review mode that forces one list empty to keep a demo tidy is a limit to record, not a bug to report.

## Rung 2: the real backend, locally, with synthetic seed data

Take it only if it starts with one command and seeds itself. A backend that takes an hour to stand up spends the whole audit budget on plumbing. If it does start, point the app at it and confirm the auth path (a dev bypass token, a seeded user) before the first capture.

## Rung 3: a fixture server

A dependency-free HTTP server that answers the routes the app calls with synthetic JSON. `assets/fixture-server.js` is the skeleton. The rules that keep it from generating fake findings:

- **Shapes come from the app.** Read the hooks and the shared types package and copy the field names exactly. A field the app reads that the fixture does not send renders as a blank, a dash, or `NaN`, and every one of those is a finding you will later have to retract.
- **Envelope discipline.** If the app unwraps `{ data: ... }`, send `{ data: ... }`. If it reads the body directly, send the body. Envelope mismatch is the most common source of fake findings, and it is also where real bugs hide: a hook that unwraps with `data?.data ?? data` turns a `{ data: null }` reply into a truthy object. When the app's documented shape produces a wrong screen, that is a real P1. Record it, then switch the fixture to the shape that lets you continue.
- **One persona, everywhere.** Same name, same ids, same dates across every route, and aligned with any app-side mock persona so the two rungs never disagree about who the user is.
- **Obviously synthetic.** Names like Jordan Sample, `example.com` addresses, `+1 555` numbers, and a `(sample)` suffix on anything that could be mistaken for a real business. No real customer data on any path, ever.
- **Relative dates.** Compute from now, so "3 days ago" and "next Tuesday" read correctly on the day of the walk.
- **Edge states on purpose.** Put one empty list, one failed item, one pending item, one discontinued or inactive item, and one unpriced or unknown value into the data. Screens are judged on how they handle those, and a fixture with only happy rows never exercises them.
- **Log every request, and every miss.** An unmatched route in the log is a shape the fixture still owes. Watch the log during the walk.

## Mixing rungs

Allowed, with the two-pass rule: when rung 1 forces a screen into a state that rung 3 fills (or the reverse), capture both, say which pass each capture came from, and never blend them into one screen that no real configuration produces.

## Feature flags

Exercise every flag that can be configured in the isolated audit environment. Search the config for the flag prefix (`EXPO_PUBLIC_`, `NEXT_PUBLIC_`, `VITE_`, remote-config keys, a flags file) and record the set used in the identity block. Record flag-gated surfaces that could not be reached as coverage gaps. If two flags conflict, that is another two-pass case. Preserve the original checkout and respect read-only configuration.

## Order of operations

1. Start the long pole (dependency install, native compile) in the background when the host can track its process and logs; otherwise run it sequentially. With no execution capability, use an existing accessible build or report the blocker.
2. While it runs, read the API surface the app expects and choose the rung.
3. Write the fixture or start the backend.
4. Poll the build. Read its log when it finishes, and read the build's own exit status rather than the exit status of whatever you piped it through. A build that "succeeded" can still have failed a late script phase and produced an app that dies at launch.

## Persisted state

Caches (a key-value store, local storage, an in-app query cache) survive a fixture fix and keep showing the old shape. When a recapture does not change, wipe state before concluding anything: reinstall the app, clear app data, clear site data. Credential stores are separate and survive a reinstall on some platforms; reset them explicitly when a logged-out capture is needed. The platform reference has the commands.

## Developer-experience findings

Every blocker met on the way to the first capture is a finding in its own right, in `findings-dev.md`, separate from the UX findings and ordered by how much time it cost. Each entry records the symptom verbatim, the confirmed root cause (or "cause unconfirmed"), the fix that worked (or "no working fix found" with attempts and errors), and, when the failure mode points away from its cause, a sentence saying so. The document ends with the three commands that reproduce the walk. See `references/deliverable-spec.md`.

If the app cannot be launched or controlled after those entries are written, the DX document is the deliverable. Perform Phase 7 cleanup, say so, and stop.
