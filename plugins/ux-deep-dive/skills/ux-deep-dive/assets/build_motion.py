#!/usr/bin/env python3
"""build_motion.py: render build/motion.json into motion.html, the companion page for the clips.

Usage:
  build_motion.py MOTION_JSON [--check]

The audit folder is resolved the same way as build_audit.py: the parent of a directory named "build",
otherwise the directory holding MOTION_JSON. Clip paths inside are relative to the audit folder, and
motion.html is written there. Python 3.8+, no packages.
"""
from __future__ import annotations

import argparse
import html
import json
import sys
from pathlib import Path

SEV = {
    "p0": ("P0 &middot; crash", "#B3261E"),
    "p1": ("P1 &middot; wrong data", "#C2410C"),
    "p2": ("P2 &middot; friction", "#9A6700"),
    "p3": ("P3 &middot; polish", "#4B5563"),
    "keep": ("Working well", "#0F7B4F"),
}
ALIASES = {"ok": "keep", "good": "keep"}

CSS = """
  :root { --ink:#12263F; --paper:#F4F2ED; --line:#E0DDD5; --body:#25292E; --quiet:#5B6672; --gold:#C9A227; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--paper); color:var(--body); font:16px/1.6 -apple-system,"Helvetica Neue",Arial,sans-serif; }
  header { background:var(--ink); color:#fff; padding:56px 32px 44px; }
  header .wrap { max-width:1080px; margin:0 auto; }
  header h1 { margin:0 0 10px; font-size:40px; letter-spacing:-1px; line-height:1.05; }
  header p { margin:0; color:#AFC3DA; max-width:720px; }
  header .meta { margin-top:22px; font-size:13px; color:#8FA8C4; line-height:1.9; }
  code { font-family:ui-monospace,Menlo,monospace; font-size:.88em; background:rgba(0,0,0,.06); padding:1px 5px; border-radius:3px; }
  header code { background:#1B3350; color:#DCE7F3; }
  main { max-width:1080px; margin:0 auto; padding:40px 32px 80px; }
  .clip { display:grid; grid-template-columns:300px 1fr; gap:32px; background:#fff; border:1px solid var(--line);
    border-radius:16px; padding:28px; margin-bottom:28px; align-items:start; }
  .vid { position:sticky; top:24px; }
  video { width:100%; border-radius:14px; background:#000; display:block; box-shadow:0 6px 20px rgba(0,0,0,.14); }
  .tag { display:inline-block; color:#fff; font-size:11px; font-weight:800; letter-spacing:.8px; padding:4px 9px;
    border-radius:4px; text-transform:uppercase; }
  h2 { margin:12px 0 4px; font-size:23px; color:var(--ink); letter-spacing:-.4px; line-height:1.25; }
  .where { margin:0 0 16px; font-family:ui-monospace,Menlo,monospace; font-size:12.5px; color:var(--quiet); }
  .watch { background:var(--paper); border-left:3px solid var(--gold); padding:12px 16px; border-radius:0 8px 8px 0;
    margin:0 0 16px; font-size:15px; }
  .detail p { margin:0 0 12px; }
  .detail ul { margin:0 0 12px; padding-left:20px; }
  .detail li { margin-bottom:8px; }
  pre { background:var(--ink); color:#DCE7F3; padding:14px 16px; border-radius:10px; font-size:12.5px; line-height:1.55; overflow-x:auto; }
  .caveat { font-size:14px; color:var(--quiet); border-top:1px dashed var(--line); padding-top:12px; }
  footer { max-width:1080px; margin:0 auto; padding:0 32px 64px; color:var(--quiet); font-size:14px; }
  footer h3 { color:var(--ink); font-size:17px; margin-bottom:8px; }
  @media (max-width:820px) {
    .clip { grid-template-columns:1fr; } .vid { position:static; max-width:300px; }
    header { padding:40px 20px 32px; } header h1 { font-size:30px; } main { padding:28px 20px 60px; }
  }
"""


def esc(text) -> str:
    return html.escape(str(text if text is not None else ""), quote=True)


def audit_root(json_path: Path) -> Path:
    d = json_path.resolve().parent
    return d.parent if d.name == "build" else d


def validate(data: dict, root: Path):
    errors, warnings = [], []
    if not isinstance(data, dict):
        return ["motion.json: top level must be an object"], warnings
    if not data.get("title"):
        errors.append('motion.json: missing "title"')
    clips = data.get("clips") or []
    if not clips:
        errors.append("motion.json: no clips")
    for i, clip in enumerate(clips):
        label = f"clips[{i}]"
        if not isinstance(clip, dict):
            errors.append(f"{label}: must be an object")
            continue
        for key in ("file", "title", "watch"):
            if not clip.get(key):
                errors.append(f"{label}: missing {key}")
        if clip.get("file") and not (root / clip["file"]).exists():
            warnings.append(f"{label}: {clip['file']} not found under {root} (the page will still be written)")
        sev = ALIASES.get(str(clip.get("sev", "keep")).lower(), str(clip.get("sev", "keep")).lower())
        if sev not in SEV:
            errors.append(f'{label}: sev "{clip.get("sev")}" is not one of {sorted(SEV)}')
    return errors, warnings


def meta_lines(meta: dict) -> str:
    lines = []
    if meta.get("companion"):
        lines.append(f"Companion to <code>{esc(meta['companion'])}</code>")
    head = " &middot; ".join(esc(meta[k]) for k in ("ref", "date", "device", "build") if meta.get(k))
    if head:
        lines.append(head)
    if meta.get("data"):
        lines.append(esc(meta["data"]))
    return "<br>".join(lines)


def card(clip: dict) -> str:
    sev = ALIASES.get(str(clip.get("sev", "keep")).lower(), str(clip.get("sev", "keep")).lower())
    label, colour = SEV[sev]
    caveat = f'<p class="caveat">{clip["caveat"]}</p>' if clip.get("caveat") else ""
    where = f'<p class="where">{esc(clip["where"])}</p>' if clip.get("where") else ""
    return f"""
<section class="clip">
  <div class="vid">
    <video controls preload="metadata" playsinline loop>
      <source src="{esc(clip['file'])}" type="video/mp4">
      Your browser cannot play this clip. It is at <code>{esc(clip['file'])}</code>.
    </video>
  </div>
  <div class="txt">
    <span class="tag" style="background:{colour}">{label}</span>
    <h2>{esc(clip['title'])}</h2>
    {where}
    <p class="watch"><b>What to watch:</b> {esc(clip['watch'])}</p>
    <div class="detail">{clip.get('detail', '')}</div>
    {caveat}
  </div>
</section>"""


def render(data: dict) -> str:
    title = esc(data["title"])
    subtitle = esc(data.get("subtitle", "Motion and interaction notes"))
    intro = esc(data.get("intro", "The things in this app that a screenshot cannot carry."))
    footer = data.get("footer") or ("Clips were recorded on the same build and device as the screenshots and "
                                    "transcoded to H.264 at a small size for portability. Synthetic data throughout.")
    cards = "".join(card(c) for c in data["clips"])
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}: {subtitle}</title>
<style>{CSS}</style></head><body>
<header><div class="wrap">
  <h1>{subtitle}</h1>
  <p>{intro}</p>
  <div class="meta">{meta_lines(data.get("meta") or {})}</div>
</div></header>
<main>{cards}</main>
<footer><h3>How these were recorded</h3><p>{esc(footer)}</p></footer>
</body></html>
"""


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("motion_json", type=Path)
    ap.add_argument("--check", action="store_true", help="validate; write nothing")
    args = ap.parse_args(argv)
    if not args.motion_json.exists():
        print(f"error: {args.motion_json} not found", file=sys.stderr)
        return 2
    root = audit_root(args.motion_json)
    try:
        data = json.loads(args.motion_json.read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        print(f"error: invalid JSON ({err})", file=sys.stderr)
        return 2
    errors, warnings = validate(data, root)
    for w in warnings:
        print(f"warning: {w}", file=sys.stderr)
    for e in errors:
        print(f"error: {e}", file=sys.stderr)
    if errors:
        print(f"check: {len(errors)} error(s)")
        return 1
    print(f"check: ok. {len(data['clips'])} clips")
    if args.check:
        return 0
    out = root / "motion.html"
    out.write_text(render(data), encoding="utf-8")
    print(f"html: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
