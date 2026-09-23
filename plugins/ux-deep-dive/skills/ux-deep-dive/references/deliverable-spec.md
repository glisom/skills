# Deliverable spec

One folder, plain ASCII name, self-contained. Everything a reader needs is inside it; nothing in it depends on the machine that produced it. This is the complete bundle when all capabilities are available; see the reduced-output rules below.

```
<App>-UX-Audit-<YYYY-MM-DD>/
  README.md               start here
  <App>-UX-Audit.pdf      the annotated walkthrough
  motion.html             the clips, with notes
  motion/                 NN-<slug>.mp4
  raw/                    NN-<slug>.png, full resolution
  findings-dev.md         build blockers
  build/
    audit.json            the findings; the PDF is generated from this
    motion.json           the clips' notes; motion.html is generated from this
    inventory.md          the coverage table
    fixture-server.js     the fixture used, if one was
    audit.html            annotated HTML (keep when no PDF is delivered)
    img/                  HTML images (keep with audit.html)
```

## Reduced output

Record unavailable capabilities and their effect in the README. Select the deliverable from what the host can actually produce:

- Without a PDF renderer, deliver `build/audit.html` and `build/img/` together with the raw captures. Link the HTML as the primary annotated walkthrough. Keep the relative paths intact in the archive.
- Without Python/script execution, deliver a Markdown walkthrough with finding IDs, tags, evidence, and links to the available captures. Mark HTML/PDF unavailable.
- Without recording, omit `motion.html`, `motion.json`, and the motion directory when no clips exist. Describe missing motion evidence explicitly. With recordings but no transcoder, retain the original format, point the motion page at those files, and disclose playback limitations.
- Without writable files, use host-supported artifacts or present the findings in the conversation. Say which files and archive could not be created.
- Without a runnable or controllable app, deliver the blocker report after cleanup. Do not claim full live coverage.

The README's file table lists only files actually produced. Visual QA applies to the delivered format; when viewing is unavailable, state that visual QA is incomplete. No fallback relaxes the severity ladder's evidence requirements.

## The PDF

Built by `assets/build_audit.py` from `build/audit.json`. Landscape, one screen per page.

- **Cover.** App name and "UX Audit", a one-sentence tagline, chips with the screen count and the count per tag, the identity block (ref or snapshot, date, device and OS, build configuration), and the data note. Include a pointer to `motion.html` only when that file is produced.
- **How to read this document.** The marker convention (markers sit near what they describe, not pixel-exact), the severity legend with a "how I used it" column, and the caveat paragraph: build type, data source, which findings need a release-build check.
- **Section divider.** Letter, title, blurb.
- **Screen page.** Left: the capture at full page height with numbered, colored markers. Right: the section crumb, the screen title, the file pointer in monospace, and the numbered notes, each opening with its tag. Bottom right: deliberate white space with a faint "for your notes" line. The white space is a feature; the reader asked for something to mark up.
- **Index.** Every note, ranked P0 to KEEP, with its id, its screen, and its text, split across pages of about twenty rows.
- Page numbers on every page after the cover.

### `audit.json`

```json
{
  "title": "Acme Mobile",
  "subtitle": "iOS UX Audit",
  "tagline": "A screen-by-screen walkthrough of the app as it stands today.",
  "page": "a4",
  "meta": {
    "ref": "main @ 0123abc",
    "date": "2026-09-01",
    "device": "iPhone 17 Pro, iOS 26.5 simulator",
    "build": "Debug build, dev bundle",
    "data": "Synthetic throughout: the app's review fixture plus a local fixture server. No real user data appears anywhere.",
    "companion": "motion.html"
  },
  "caveat": "Driven on a simulator, in a debug build, against fixture data. Findings A3.1 and G2.2 need a release-build check before they are treated as shipping defects.",
  "sections": [
    { "id": "A", "title": "Authentication and onboarding", "blurb": "Cold launch to the first authenticated screen." }
  ],
  "screens": [
    {
      "file": "raw/01-auth-login.png",
      "section": "A",
      "title": "Sign in",
      "where": "app/(auth)/login.tsx",
      "notes": [
        { "sev": "p3", "x": 50, "y": 44, "text": "The primary action is dimmed until the email parses, and nothing says why." },
        { "sev": "keep", "x": 50, "y": 92, "text": "Legal line and account creation are present and legible." }
      ]
    }
  ]
}
```

- `sev` is one of `p0`, `p1`, `p2`, `p3`, `keep`.
- `x` and `y` are percentages of the capture's width and height, marker center.
- `text` is HTML: `<b>`, `<i>`, and `<code>` are the intended vocabulary.
- `id` on a note is optional; the builder assigns `<section><screen>.<note>` (for example `A1.2`) when absent. Set it explicitly on a re-run to carry a prior id forward, and add `status` (`new`, `resolved`, `persisting`, `regressed`) so the index can show it.
- `page` is `a4` (default) or `letter`.
- `meta.companion` names an existing motion page. Omit it when no companion page is produced; the builder then omits that pointer.

Run `python3 "$SKILL_DIR/assets/build_audit.py" build/audit.json --check` before every build. `SKILL_DIR` is resolved as described in `references/runtime.md`.

## The motion page

Built by `assets/build_motion.py` from `build/motion.json`. A single HTML page that plays the clips from `motion/` with no dependencies.

- **Header.** Title, a one-sentence intro naming what the clips carry that the stills cannot, the identity block, the data note.
- **One card per clip.** The tag, the title, the file pointer, a "what to watch" line that says what the clip proves before it plays, the detail, and an optional caveat.
- **Footer.** How the clips were recorded and their limits.

### `motion.json`

```json
{
  "title": "Acme Mobile",
  "intro": "The four things a screenshot cannot carry: a crash, a map, a navigation model, and the one interaction that genuinely works.",
  "meta": { "ref": "main @ 0123abc", "date": "2026-09-01", "device": "iPhone 17 Pro, iOS 26.5 simulator", "build": "Debug build", "data": "Synthetic data throughout." },
  "clips": [
    {
      "file": "motion/01-map-list-crash.mp4",
      "sev": "p0",
      "title": "Results map to list view terminates the app",
      "where": "app/(stacks)/shop/map/[code].tsx, list toggle",
      "watch": "The map pans normally. One tap on the list toggle and the app is gone.",
      "detail": "<p>A native crash, not a JS error, so no error boundary catches it.</p><pre>the exception line, verbatim</pre>",
      "caveat": "Observed on a debug simulator build. Confirm on a release build."
    }
  ],
  "footer": "Recorded with the platform recorder and transcoded to H.264 at 402px wide."
}
```

## The README

Written last, from the finished index. Sections, in order:

1. **Identity line.** App, date, ref and SHA, device and OS, build configuration.
2. **What's here.** A table of every produced file and what it is for. Name the primary deliverable: PDF, annotated HTML, or Markdown.
3. **Severity.** The five tags, what each means, and the count of each.
4. **The N that matter most.** Three to five, chosen by the precedence in `references/severity-ladder.md`. Each names the file and line or the reproduction, in two or three sentences.
5. **Decisions, not defects.** Anything tagged as a decision, with why it needs a decision rather than a fix.
6. **What's genuinely good.** The KEEP notes that matter most, named as patterns to protect.
7. **How this was produced, and its limits.** The data source, the build type caveat with the findings it applies to, the statement that fixture-caused artifacts were removed rather than reported, and the coverage totals from the inventory.
8. **Build blockers.** One paragraph pointing at `findings-dev.md` with the headline blocker.

## `findings-dev.md`

Entries `D-01`, `D-02`, and so on, ordered by how much time each cost. Each entry: a tier from the same ladder, the symptom verbatim, the confirmed root cause (or "cause unconfirmed"), the fix that worked (or "no working fix found" with attempts and errors), and a "the failure mode is worse than the failure" sentence when the error pointed away from its cause. The document ends with a "Reproducing this audit" section: the fixture command, the app command with its flags, and any mode switch needed for a second pass.

## Packaging

1. Archive the folder with a root directory whose name is plain ASCII and equals the archive name. A non-ASCII character in the root name is stored without a UTF-8 flag by some archivers and extracts as mojibake on other operating systems, on every entry.
2. When a verified PDF is included, exclude `build/img/` and `build/audit.html` as duplicates. When HTML is the deliverable, include both and verify every image link. Exclude OS metadata files in either case.
3. Verify the artifacts actually produced: list the archive, test its integrity, and extract it to a temporary folder. Confirm the PDF page count when present and resolve the HTML image and motion links when present. When archive tools are unavailable, hand off the folder or host-supported artifacts and say no archive was created.
4. State the size against the destination's currently documented limit. Over the limit means a shared link, not a smaller audit.

## The hand-off message

The identity block, the coverage totals, the count per tag, the handful that matter most, any decision, the path to the folder and the archive, and the list of processes left running with the command that stops each.
