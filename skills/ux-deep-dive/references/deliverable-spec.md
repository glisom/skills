# Deliverable spec

One folder, plain ASCII name, self-contained. Everything a reader needs is inside it; nothing in it depends on the machine that produced it.

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
    audit.html            the PDF source (excluded from the archive)
    img/                  downscaled captures for the PDF (excluded from the archive)
```

## The PDF

Built by `assets/build_audit.py` from `build/audit.json`. Landscape, one screen per page.

- **Cover.** App name and "UX Audit", a one-sentence tagline, chips with the screen count and the count per tag, the identity block (ref and SHA, date, device and OS, build configuration), the data note, and a pointer to `motion.html`.
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

`build_audit.py --check` validates the file and reports the counts without rendering; run it before every build.

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
2. **What's here.** A table of every file in the folder and what it is for. The PDF row says "the deliverable".
3. **Severity.** The five tags, what each means, and the count of each.
4. **The N that matter most.** Three to five, chosen by the precedence in `references/severity-ladder.md`. Each names the file and line or the reproduction, in two or three sentences.
5. **Decisions, not defects.** Anything tagged as a decision, with why it needs a decision rather than a fix.
6. **What's genuinely good.** The KEEP notes that matter most, named as patterns to protect.
7. **How this was produced, and its limits.** The data source, the build type caveat with the findings it applies to, the statement that fixture-caused artifacts were removed rather than reported, and the coverage totals from the inventory.
8. **Build blockers.** One paragraph pointing at `findings-dev.md` with the headline blocker.

## `findings-dev.md`

Entries `D-01`, `D-02`, and so on, ordered by how much time each cost. Each entry: a tier from the same ladder, the symptom verbatim, the root cause, the fix that worked, and a "the failure mode is worse than the failure" sentence when the error pointed away from its cause. The document ends with a "Reproducing this audit" section: the fixture command, the app command with its flags, and any mode switch needed for a second pass.

## Packaging

1. Archive the folder with a root directory whose name is plain ASCII and equals the archive name. A non-ASCII character in the root name is stored without a UTF-8 flag by some archivers and extracts as mojibake on other operating systems, on every entry.
2. Exclude `build/img/`, `build/audit.html`, and OS metadata files. They are duplicates of `raw/` and the PDF.
3. Verify: list the archive and check for non-ASCII names; test its integrity; extract it to a temporary folder and confirm the PDF page count and that every clip path in `motion.html` resolves.
4. State the size against the destination's limit. As of this writing, Slack allows 1 GB, Gmail 25 MB before encoding overhead, and most drives are effectively unlimited. Over the limit means a shared link, not a smaller audit.

## The hand-off message

The identity block, the coverage totals, the count per tag, the handful that matter most, any decision, the path to the folder and the archive, and the list of processes left running with the command that stops each.
