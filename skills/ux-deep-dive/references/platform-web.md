# Platform: web

A browser is the device. Captures come from the harness's browser tool when it has one, or from Playwright through `assets/web-capture.mjs` for bulk capture; both are fine, and the rig rules are the same.

## Viewports

Capture at three sizes unless the product is single-form-factor: mobile (390 by 844), tablet (768 by 1024), desktop (1440 by 900). The mobile size is the primary one for a responsive product; the PDF's page layout was designed around a phone-shaped capture, so mobile captures go in the PDF, and the other two sizes go in `raw/` with a note when they differ in a way that matters.

Two captures per route at the primary size: the viewport (what the user sees before scrolling) and the full page. The viewport capture is what the PDF page shows; the full-page capture is for the reader.

## Bulk capture

```bash
npm i -D playwright && npx playwright install chromium     # once, in a scratch project, not in the app repo
node assets/web-capture.mjs --base http://localhost:3000 --routes build/routes.txt --out raw \
  --viewport 390x844 --full-page --storage build/state.json --video motion/walk.webm
```

`routes.txt` is one path per line, from the surface inventory. The script writes `NN-<slug>.png` per route, records the whole walk as one video when asked, and appends every console error and failed request per route to `build/web-console.log`. Console errors and failed requests are an evidence class of their own on the web: a screen that looks fine with three errors in the console is a P2 with a cited message.

Single captures without the script:

```bash
npx playwright screenshot --viewport-size=390,844 --full-page http://localhost:3000/settings raw/NN-settings.png
npx playwright screenshot --device="iPhone 13" --color-scheme=dark http://localhost:3000/ raw/NN-home-dark.png
```

## Authenticated captures

Log in once through the harness's browser, or through `npx playwright open --save-storage=build/state.json <url>`, then load the storage state for every capture. Never type credentials into a page yourself; use the harness's credential flow if it has one, or ask the user to log in and save state.

## Navigate

Every route is a URL, so the deep-link rule is the default. Still walk the primary navigation by clicking once, so broken links, wrong active states, and focus traps are observed.

## Overlays

Framework development overlays (the Next.js error overlay, the Vite error overlay, a hot-reload badge) and cookie banners appear in captures. Read the overlay first; it is a finding. Decline non-essential cookies rather than accepting, then capture. Never crop.

## Keyboard and input states

The on-screen keyboard does not appear in a desktop browser. For a form, capture the focused field, a validation failure, and the submitted state instead. At the mobile viewport, Playwright's device descriptors emulate touch; a hover-only affordance with no touch equivalent is a P2.

## Appearance passes

`--color-scheme=dark` for dark mode, reduced motion through the context option where the tool supports it, and browser zoom at 150 percent for the large-text pass (set a smaller viewport instead of zooming when the tool cannot zoom).

## Record

Playwright records to WebM through the `recordVideo` context option; `web-capture.mjs` does this for the whole walk when `--video` is passed. Transcode to MP4 so the motion page plays everywhere:

```bash
ffmpeg -y -i motion/walk.webm -vf "scale=402:-2" -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p \
  -movflags +faststart motion/NN-slug.mp4
```

For a single interaction, the harness's browser tool with a recording feature is faster than a script.

## The crash equivalent

A web app does not terminate; it goes blank, shows a framework error page, or renders an error boundary. The protocol is the same: note the action, capture the screen, keep the console's exception line verbatim, reload and reproduce a second time, and say whether a boundary caught it.

## State

Clear site data for the origin (cookies, local storage, IndexedDB) between passes. With Playwright, a fresh context is a clean state; with a persistent browser, use its site-data controls.
