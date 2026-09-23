#!/usr/bin/env python3
"""Check local UX audit dependencies without installing anything or changing the app.

Run from the audit scratch directory, where Playwright is installed for web captures.
Exit 0: capture prerequisites found. Exit 1: capture prerequisites missing.
Optional PDF and motion dependencies never block still captures. A successful check
does not prove the app launches, the browser sandbox works, or a device is connected.
"""
import argparse
import json
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True
from build_audit import find_chrome


def capability(missing):
    return {"ready": not missing, "missing": missing}


def check(platform, browser_tool=False, chrome=None):
    missing = []
    if platform == "web" and not browser_tool:
        node = shutil.which("node")
        if not node:
            missing.append("Node.js >= 20 (or use the host's browser tool)")
        else:
            probe = """
if (Number(process.versions.node.split('.')[0]) < 20) {
  console.error('Node.js >= 20'); process.exit(1);
}
try {
  const { chromium } = require('playwright');
  if (!require('node:fs').existsSync(chromium.executablePath())) {
    console.error('Playwright Chromium: run npx playwright install chromium in this scratch directory');
    process.exit(1);
  }
} catch {
  console.error('Playwright: run npm install --save-dev playwright in this scratch directory');
  process.exit(1);
}
"""
            try:
                result = subprocess.run([node, "-e", probe], capture_output=True, text=True, timeout=15)
                if result.returncode:
                    missing.append(result.stderr.strip() or "Node/Playwright dependency probe failed")
            except (OSError, subprocess.TimeoutExpired) as error:
                missing.append("Node/Playwright dependency probe failed: " + str(error))
    if platform in ("ios", "android"):
        if not shutil.which("bash"):
            missing.append("Bash for the bundled capture and recording helpers")
        if platform == "ios":
            if sys.platform != "darwin":
                missing.append("macOS with Xcode for the iOS simulator")
            if not shutil.which("xcrun"):
                missing.append("Xcode command-line tools (xcrun)")
        elif not shutil.which("adb"):
            missing.append("Android platform tools (adb)")
    binary = find_chrome(chrome)
    return {
        "platform": platform,
        "capture": capability(missing),
        "pdf": {**capability([] if binary else ["Chrome, Chromium, or Edge; use --chrome PATH or CHROME_BIN"]), "browser": binary},
        "motion": capability([] if shutil.which("ffmpeg") else ["ffmpeg for MP4 transcoding"]),
        "notes": [
            "Dependency presence only. Verify browser launch or device connection before capturing.",
            "The host must be able to view images and drive the target UI. --browser-tool asserts that capability; it does not discover it.",
            "Motion also needs a recording-capable browser or device. Without it, deliver stills and document the gap.",
            "Write artifacts in a writable output directory; keep installed skill files unchanged.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--platform", choices=("web", "ios", "android"), required=True)
    parser.add_argument("--browser-tool", action="store_true", help="web capture uses an available host browser tool instead of Playwright")
    parser.add_argument("--chrome", help="browser binary for PDF output")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    if args.browser_tool and args.platform != "web":
        parser.error("--browser-tool applies only to --platform web")
    result = check(args.platform, args.browser_tool, args.chrome)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        for name in ("capture", "pdf", "motion"):
            feature = result[name]
            print(name + ": " + ("dependencies found" if feature["ready"] else "; ".join(feature["missing"])))
        for note in result["notes"]:
            print(note)
    return 0 if result["capture"]["ready"] else 1


if __name__ == "__main__":
    sys.exit(main())
