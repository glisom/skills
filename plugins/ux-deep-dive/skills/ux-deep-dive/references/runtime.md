# Runtime and capability checks

Choose tools from the capabilities actually exposed by the host. A skill supplies instructions and resources; it does not grant filesystem, network, browser, device, or process access.

## Locate resources and output

Resolve the directory containing this loaded `SKILL.md` from the path supplied by the host. All `references/` and `assets/` paths are relative to that directory, never the app's working directory. If the host supplies resource identifiers instead of local paths, read them through its resource API. Run helpers only when those resources are available as local files.

`SKILL_DIR` below is a variable you set to that resolved absolute directory, not a variable the host supplies. `AUDIT_DIR` is a separate writable output directory. Replace the example paths with the actual locations; quote paths containing spaces. Keep installed resources unchanged.

```bash
SKILL_DIR="/absolute/path/to/installed/ux-deep-dive"
AUDIT_DIR="/absolute/path/to/App-UX-Audit-date"
mkdir -p "$AUDIT_DIR/build" "$AUDIT_DIR/raw" "$AUDIT_DIR/motion"
cd "$AUDIT_DIR"
python3 "$SKILL_DIR/assets/preflight.py" --platform web
```

Use `--platform ios` or `--platform android` for mobile. For web captures using an already available host browser tool, add `--browser-tool`; this asserts a capability you checked, it does not install or discover a browser tool. `--json` gives structured results. Exit 1 means capture dependencies are missing; optional PDF or transcoding dependencies do not block still captures. The check does not prove device connectivity, browser launch, credentials, or app readiness. Verify those separately before the walk.

If Python or a shell is unavailable, inspect the capability table directly. Do not attempt the preflight command in a host that cannot execute it.

| Capability | Needed for | Fallback when absent |
|---|---|---|
| Source read/search | Route inventory and code-backed findings | Scope to supplied source/screens; label coverage incomplete and omit findings that need unavailable evidence |
| Image viewing and UI control | Live walkthrough | Ship a blocker report; do not claim a live audit based only on source |
| Writable output | Folder and capture bundle | Use host-supported artifacts or in-conversation findings; do not invent saved paths |
| Python 3.8+ | HTML/PDF and motion-page builders | Markdown walkthrough with available captures |
| Node 20+, Playwright package and Chromium | Bundled web capture helper | Available host browser tool |
| macOS, Xcode, Bash, simulator control | iOS capture/record helpers | Supported remote device access or a blocker report |
| Bash, Android platform tools and device control | Android capture/record helpers | Supported remote device access or a blocker report |
| Chrome, Chromium, or Edge | PDF rendering | Annotated HTML plus `build/img/`; label PDF unavailable |
| Browser/device recording | Motion evidence | Stills and logs, with missing motion evidence recorded |
| FFmpeg | MP4 transcoding | Original recording with its format and playback limit disclosed |

Install missing packages only within the host's permissions and the user's task scope. Keep packages in an audit scratch project, outside the app and installed skill. On Linux, Playwright may also need system browser libraries. Native Windows can run the Node and Python helpers; the bundled mobile shell helpers require Bash (for example, a suitably configured WSL environment) and device access from that environment. iOS simulation still requires macOS.

For PDF rendering on Ubuntu, downloaded Chromium builds can fail with `No usable sandbox!` even when preflight finds the binary. Prefer an installed Chrome with a working sandbox via `--chrome PATH` or `CHROME_BIN`. See [Chromium's Ubuntu sandbox guidance](https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md). If launch remains blocked, keep the annotated HTML and report PDF unavailable.

## Run helpers from the audit directory

Keep the current directory at `AUDIT_DIR`: the web helper resolves Playwright from that directory and writes its default logs there. Always use absolute installed helper paths.

```bash
node "$SKILL_DIR/assets/web-capture.mjs" --base http://localhost:3000 --routes build/routes.txt --out raw
bash "$SKILL_DIR/assets/capture.sh" auth-login
bash "$SKILL_DIR/assets/record.sh" start live-total
bash "$SKILL_DIR/assets/record.sh" stop
python3 "$SKILL_DIR/assets/build_audit.py" build/audit.json --check
python3 "$SKILL_DIR/assets/build_audit.py" build/audit.json --pdf
python3 "$SKILL_DIR/assets/build_motion.py" build/motion.json
```

These commands are alternatives for the chosen platform and available capabilities, not a batch to run unconditionally. Set the capture/record helpers' `UXDD_PLATFORM` and device variables from their headers. The bundled `record.sh` requires FFmpeg; without it, use the direct native recording commands in the platform reference or a host recorder and keep the original file. Omit `--pdf` to render HTML only. Run the motion builder only when recordings exist. In PowerShell, use `$SkillDir` and `Join-Path` for absolute helper paths, then call `node` or `python` with those paths; the same separation of resources and output applies.

## Preserve the workspace

Record the initial Git state before doing work. The default input is the current checkout, including requested work in progress. Preserve detached HEAD and managed worktrees. When another ref or temporary app changes are needed, use the host's isolated-checkout capability or a separate writable copy. Offline snapshots are valid when their version and content identity are recorded; they are not evidence of the latest upstream state.

If a requested ref is unavailable, report that blocker and wait for the user's choice before changing the audit target. If startup, capture, or rendering fails, keep the evidence and capability limits, perform Phase 7 cleanup, and hand off the appropriate partial deliverable. Never bypass host permissions to complete a phase.
