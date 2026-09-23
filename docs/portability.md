# Portability verification

The repository keeps one source directory per skill. Claude plugins and standalone installations use the same Markdown and bundled helpers. Installation does not grant tools or install runtime dependencies.

## Local checks

On 2026-09-23, the portability changes were exercised on macOS with Node 24 and Python 3.14:

- `npm test`: standalone copies, builders run from a separate directory with spaces, missing-dependency preflight, YAML validity and field types, resource integrity, and existing repository tests.
- `npm run validate`: all four skills and their existing Claude manifests.
- `npm run test:browser`: an installed copy outside the repository, a separate scratch project, actual Chromium screenshots and video, console evidence, and PDF generation. It serves a small synthetic app on loopback and removes temporary files afterward.
- `claude plugin validate --strict .` plus validation of each plugin directory.

The new regression cases were first run against the old behavior. They exposed unsupported YAML styles, malformed YAML being accepted, incomplete provider-path checks, missing standalone license notices, absent preflight, and a still-only audit linking to an unproduced motion page. The documented relative web-helper command was also reproduced failing from a separate audit directory. The browser smoke test confirms the corrected absolute-helper invocation while resolving Playwright from the scratch project.

The preflight reports dependency presence, not successful app launch or device connectivity. A host browser tool is a capability asserted by the caller with `--browser-tool`, not something this Python helper can discover.

## Instruction scenarios

An independent agent read the old and updated instructions and selected concrete next actions for the cases below. These are scenario checks in this Codex session, not end-to-end executions inside every named host.

| Scenario | Old behavior | Updated behavior |
|---|---|---|
| Structured question tool has a different name | Plain-text fallback despite a usable tool | Select by capability and actual schema |
| Question call returns before the user answers | No explicit asynchronous waiting rule | Keep the decision pending; continue only independent work |
| Question tool is restricted to another mode | Availability was underspecified | Use plain text in the current mode |
| Large source, no subagents | Fan-out required with no executable fallback | Review bounded sections sequentially |
| No writable scratch before approval | Scratch instruction conflicted with the gate | Keep temporary evidence in conversation; project writes remain gated |
| Dirty detached managed worktree, offline | Fetch, stash, and checkout required | Audit the requested current snapshot without switching or stashing |
| Installed helper separate from working directory | Relative helper path fails | Absolute helper path; dependencies and outputs stay in scratch |
| No recording or PDF renderer | Full deliverable required | Stills with evidence gaps; annotated HTML and its images retained |
| No Python | Builders required | Markdown walkthrough with available captures |
| Build fails early | Stop could bypass restoration | Clean up this run's changes and deliver the blocker report |

## CI and support boundaries

Hosted unit and asset checks passed on Linux, macOS, and Windows on 2026-09-23. A separate Linux browser job exercises real screenshots, video, console evidence, and PDF generation. It uses Playwright's Chromium for capture and the runner's installed Chrome for PDF rendering, whose sandbox is supported by Ubuntu's AppArmor policy. The smoke test accepts `CHROME_BIN` to select a PDF browser on other machines. Browser startup errors are retained in full if rendering fails.

Codex and Gemini installation paths are based on their linked official documentation in the root README. No live Gemini, Copilot, or other agent session was used to certify full workflow behavior. The text-only writing skill has no runtime dependencies; the decision skill can use plain text in any interactive host that reads its instructions.

The UX procedure's original full run was on iOS. The browser smoke test covers capture and rendering mechanics, not a complete product walkthrough. A full Android audit and native Windows device-control run remain unverified. iOS simulation requires macOS/Xcode; mobile shell helpers require Bash and device access. Environments without UI control cannot perform the live audit and must report that limit.

## Reproduce

From the repository root:

```sh
npm ci
npm test
npm run validate
npx playwright install chromium
npm run test:browser
```

On Linux, use `npx playwright install --with-deps chromium` when browser system libraries are missing and the environment permits their installation. This is test setup; the skills themselves never silently install those dependencies.
