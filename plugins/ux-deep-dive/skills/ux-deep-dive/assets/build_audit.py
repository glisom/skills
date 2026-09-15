#!/usr/bin/env python3
"""build_audit.py: render build/audit.json plus the raw captures into the annotated audit HTML and PDF.

Usage:
  build_audit.py AUDIT_JSON [--pdf] [--check] [--no-downscale] [--chrome PATH]

The audit folder is the parent of the directory holding AUDIT_JSON when that directory is named
"build", otherwise the directory holding AUDIT_JSON. Every path inside AUDIT_JSON is relative to it.

Writes, relative to the audit folder:
  build/audit.html           the PDF source
  build/img/                 downscaled captures for the PDF
  <Title>-UX-Audit.pdf       with --pdf, rendered by Chrome, Chromium, or Edge in headless mode

Python 3.8+, no required packages. Pillow is used for downscaling when installed; sips on macOS
otherwise; full-size copies when neither exists.
"""
from __future__ import annotations

import argparse
import html
import json
import math
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

SEV = {
    "p0": ("P0", "#B3261E", "Crash / blocks the feature",
           "The app terminates or the screen cannot render at all. Reproduced at least twice."),
    "p1": ("P1", "#C2410C", "Wrong data or unusable",
           "A user is shown something false, or a control they need does not work. Traced to a specific line."),
    "p2": ("P2", "#9A6700", "Real friction",
           "Works, but costs the user time, trust, or a wrong inference."),
    "p3": ("P3", "#4B5563", "Polish",
           "Craft, consistency, and copy. Worth a pass before launch, not worth blocking on."),
    "keep": ("KEEP", "#0F7B4F", "Working well",
             "Called out deliberately. These are patterns to protect and reuse, not filler."),
}
ORDER = ["p0", "p1", "p2", "p3", "keep"]
ALIASES = {"ok": "keep", "good": "keep"}
STATUSES = {"new", "resolved", "persisting", "regressed"}
PAGE_SIZES = {"a4": ("297mm", "210mm"), "letter": ("11in", "8.5in")}
INDEX_ROWS = 20
DEFAULT_CAVEAT = (
    "This was driven on a simulator or emulator, in a debug build, against synthetic data. Anything that "
    "could plausibly be a debug-only artifact should be reproduced on a release build before it is treated "
    "as a shipping defect, and treated as one until that check is clean. Anything that could not be driven "
    "has been left out rather than guessed at."
)

CSS = """
@page { size: __PAGE_W__ __PAGE_H__; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin:0; padding:0; background:#fff;
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color:#111; }
.page { width:__PAGE_W__; height:__PAGE_H__; page-break-after: always; position:relative;
  display:flex; overflow:hidden; }
.page:last-child { page-break-after: auto; }
.cover { flex-direction:column; justify-content:center; padding:0 30mm; background:#12263F; color:#fff; }
.cover h1 { font-size:44pt; line-height:1.02; margin:0 0 6mm; letter-spacing:-1.4px; font-weight:800; }
.cover .sub { font-size:13pt; color:#AFC3DA; margin:0 0 14mm; max-width:190mm; line-height:1.5; }
.cover .meta { font-size:9.5pt; color:#8FA8C4; line-height:1.9; }
.cover .meta code { color:#DCE7F3; background:#1B3350; }
.cover .chips { display:flex; gap:4mm; margin:0 0 12mm; flex-wrap:wrap; }
.cover .chip { border:1px solid #34506F; border-radius:3mm; padding:2.5mm 4mm; font-size:9pt; color:#DCE7F3; }
.cover .chip b { font-size:13pt; display:block; margin-bottom:0.5mm; }
.divider { flex-direction:column; justify-content:center; padding:0 30mm; background:#F4F2ED; }
.divider .letter { font-size:80pt; font-weight:800; color:#C9A227; line-height:1; margin-bottom:4mm; }
.divider h2 { font-size:30pt; margin:0; color:#12263F; letter-spacing:-0.8px; }
.divider p { font-size:11pt; color:#5B6672; margin-top:4mm; max-width:170mm; line-height:1.6; }
.left { width:110mm; background:#F4F2ED; display:flex; align-items:center; justify-content:center;
  position:relative; border-right:1px solid #E0DDD5; }
.shot { position:relative; height:186mm; }
.shot img { height:186mm; width:auto; display:block; border-radius:4mm;
  box-shadow:0 2mm 6mm rgba(0,0,0,.16); }
.marker { position:absolute; width:7mm; height:7mm; border-radius:50%; color:#fff;
  font-size:8.5pt; font-weight:700; display:flex; align-items:center; justify-content:center;
  transform:translate(-50%,-50%); border:0.6mm solid #fff; box-shadow:0 0.6mm 1.6mm rgba(0,0,0,.35); }
.right { flex:1; padding:12mm 12mm 10mm; display:flex; flex-direction:column; }
.crumb { font-size:8.5pt; letter-spacing:1.6px; text-transform:uppercase; color:#9A8C6A; font-weight:700; }
.right h2 { font-size:21pt; margin:2mm 0 1.5mm; letter-spacing:-0.5px; color:#12263F; }
.right .file { font-size:8.5pt; color:#7A828C; font-family:ui-monospace,Menlo,monospace; margin-bottom:5mm; }
.notes { list-style:none; margin:0; padding:0; }
.notes li { display:flex; gap:3mm; margin-bottom:3.6mm; page-break-inside:avoid; }
.num { flex:0 0 6.5mm; height:6.5mm; border-radius:50%; color:#fff; font-size:8.5pt; font-weight:700;
  display:flex; align-items:center; justify-content:center; margin-top:0.4mm; }
.body { font-size:9.6pt; line-height:1.5; color:#25292E; }
.tag { display:inline-block; font-size:7pt; font-weight:800; letter-spacing:0.8px; padding:0.5mm 1.6mm;
  border-radius:1mm; color:#fff; margin-right:1.6mm; vertical-align:1px; }
.status { display:inline-block; font-size:7pt; font-weight:700; letter-spacing:0.6px; padding:0.4mm 1.4mm;
  border-radius:1mm; color:#12263F; background:#E8E4D8; margin-left:1.4mm; vertical-align:1px; text-transform:uppercase; }
code { font-family:ui-monospace,Menlo,monospace; font-size:8.6pt; background:#EFEDE7;
  padding:0.3mm 1mm; border-radius:0.8mm; }
.markup { margin-top:auto; border-top:1px dashed #CFCABC; padding-top:3mm;
  font-size:8pt; color:#9AA0A6; font-style:italic; }
.pnum { position:absolute; bottom:6mm; right:8mm; font-size:8pt; color:#B0B5BB; }
.summary { flex-direction:column; padding:14mm 16mm; }
.summary h2 { font-size:24pt; margin:0 0 5mm; color:#12263F; letter-spacing:-0.6px; }
.summary h3 { font-size:16pt; margin:10mm 0 3mm; color:#12263F; }
.summary p { font-size:10pt; line-height:1.6; color:#333; max-width:210mm; margin:0 0 3mm; }
table { width:100%; border-collapse:collapse; font-size:8.6pt; }
th { text-align:left; font-size:7.5pt; letter-spacing:1px; text-transform:uppercase;
  color:#8A9099; border-bottom:1.2px solid #D8D4CA; padding:2mm 2mm; }
td { padding:2.2mm 2mm; border-bottom:1px solid #EDEAE3; vertical-align:top; line-height:1.4; }
td.sev { white-space:nowrap; width:16mm; }
td.id { white-space:nowrap; width:14mm; color:#7A828C; font-family:ui-monospace,Menlo,monospace; }
td.where { width:52mm; color:#5B6672; }
"""


def audit_root(json_path: Path) -> Path:
    d = json_path.resolve().parent
    return d.parent if d.name == "build" else d


def norm_sev(value):
    if not isinstance(value, str):
        return None
    key = value.strip().lower()
    key = ALIASES.get(key, key)
    return key if key in SEV else None


def esc(text) -> str:
    return html.escape(str(text if text is not None else ""), quote=True)


def slugify(text: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-")
    return slug or "Audit"


def load(json_path: Path) -> dict:
    with json_path.open(encoding="utf-8") as fh:
        return json.load(fh)


def validate(data: dict, root: Path):
    """Return (errors, warnings). Errors block rendering; warnings do not."""
    errors, warnings = [], []
    if not isinstance(data, dict):
        return ["audit.json: top level must be an object"], warnings
    for key in ("title", "sections", "screens"):
        if key not in data:
            errors.append(f'audit.json: missing "{key}"')
    if errors:
        return errors, warnings
    page = str(data.get("page", "a4")).lower()
    if page not in PAGE_SIZES:
        errors.append(f'audit.json: page "{page}" is not one of {sorted(PAGE_SIZES)}')
    sections = data.get("sections") or []
    ids = []
    for i, sec in enumerate(sections):
        sid = sec.get("id") if isinstance(sec, dict) else None
        if not sid:
            errors.append(f"sections[{i}]: missing id")
            continue
        if sid in ids:
            errors.append(f'sections[{i}]: duplicate id "{sid}"')
        ids.append(sid)
        if not sec.get("title"):
            errors.append(f'sections[{i}] ({sid}): missing title')
    screens = data.get("screens") or []
    if not screens:
        errors.append("audit.json: no screens")
    seen_files = set()
    for i, scr in enumerate(screens):
        label = f"screens[{i}]"
        if not isinstance(scr, dict):
            errors.append(f"{label}: must be an object")
            continue
        f = scr.get("file")
        if not f:
            errors.append(f"{label}: missing file")
        else:
            label = f"{label} ({f})"
            if not (root / f).exists():
                errors.append(f"{label}: file not found under {root}")
            if f in seen_files:
                warnings.append(f"{label}: the same capture is used twice")
            seen_files.add(f)
        if scr.get("section") not in ids:
            errors.append(f'{label}: section "{scr.get("section")}" is not declared in sections')
        if not scr.get("title"):
            errors.append(f"{label}: missing title")
        notes = scr.get("notes") or []
        if len(notes) > 6:
            warnings.append(f"{label}: {len(notes)} notes; the reference budget is six per capture")
        for j, note in enumerate(notes):
            nl = f"{label} note {j + 1}"
            if not isinstance(note, dict):
                errors.append(f"{nl}: must be an object")
                continue
            if norm_sev(note.get("sev")) is None:
                errors.append(f'{nl}: sev "{note.get("sev")}" is not one of {ORDER}')
            for axis in ("x", "y"):
                v = note.get(axis)
                if not isinstance(v, (int, float)) or not 0 <= v <= 100:
                    errors.append(f"{nl}: {axis} must be a number from 0 to 100 (percent)")
            if not note.get("text"):
                errors.append(f"{nl}: missing text")
            status = note.get("status")
            if status is not None and status not in STATUSES:
                errors.append(f'{nl}: status "{status}" is not one of {sorted(STATUSES)}')
    return errors, warnings


def assign_ids(data: dict):
    """Give every note an id of the form <section><screen>.<note> unless it already has one."""
    per_section = {}
    for scr in data["screens"]:
        sec = scr["section"]
        per_section[sec] = per_section.get(sec, 0) + 1
        scr["_ordinal"] = per_section[sec]
        for j, note in enumerate(scr.get("notes") or [], start=1):
            note.setdefault("id", f"{sec}{scr['_ordinal']}.{j}")
            note["_sev"] = norm_sev(note["sev"])


def counts(data: dict) -> dict:
    out = {k: 0 for k in ORDER}
    for scr in data["screens"]:
        for note in scr.get("notes") or []:
            out[norm_sev(note["sev"])] += 1
    return out


def downscale(root: Path, screens, no_downscale: bool) -> dict:
    """Write build/img/<name> for every capture; return {file: relative path from build/}."""
    img_dir = root / "build" / "img"
    img_dir.mkdir(parents=True, exist_ok=True)
    mapping = {}
    try:
        from PIL import Image  # type: ignore
    except Exception:  # Pillow is optional
        Image = None
    sips = shutil.which("sips")
    for scr in screens:
        src = root / scr["file"]
        dst = img_dir / src.name
        mapping[scr["file"]] = f"img/{src.name}"
        if no_downscale:
            shutil.copyfile(src, dst)
            continue
        if Image is not None:
            with Image.open(src) as im:
                if im.width > 900:
                    im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
                im.save(dst, optimize=True)
            continue
        if sips:
            subprocess.run([sips, "--resampleWidth", "600", str(src), "--out", str(dst)],
                           check=True, capture_output=True)
            continue
        shutil.copyfile(src, dst)
    return mapping


def tag(sev: str) -> str:
    label, colour, _, _ = SEV[sev]
    return f'<span class="tag" style="background:{colour}">{label}</span>'


def status_chip(note: dict) -> str:
    s = note.get("status")
    return f'<span class="status">{esc(s)}</span>' if s else ""


def meta_block(meta: dict, companion_default: str = "motion.html") -> str:
    lines = []
    ref = meta.get("ref")
    date = meta.get("date")
    if ref or date:
        parts = []
        if ref:
            parts.append(f"Build <code>{esc(ref)}</code>")
        if date:
            parts.append(esc(date))
        lines.append(" &nbsp;&middot;&nbsp; ".join(parts))
    dev = " &middot; ".join(esc(meta[k]) for k in ("device", "build") if meta.get(k))
    if dev:
        lines.append(dev)
    if meta.get("data"):
        lines.append(esc(meta["data"]))
    companion = meta.get("companion", companion_default)
    if companion:
        lines.append(f"Motion, transitions, and any crash reproduction are in the companion page: "
                     f"<code>{esc(companion)}</code>")
    return "<br>".join(lines)


def cover_page(data: dict, cnt: dict) -> str:
    title = esc(data["title"])
    subtitle = esc(data.get("subtitle", "UX Audit"))
    tagline = esc(data.get("tagline", "A screen-by-screen walkthrough of the app as it stands today, "
                                       "every route, every state, pre-annotated for markup."))
    chips = [f'<div class="chip"><b>{len(data["screens"])}</b>screens</div>']
    for sev in ORDER:
        label, _, short, _ = SEV[sev]
        chips.append(f'<div class="chip"><b>{cnt[sev]}</b>{label} &middot; {esc(short.split(" / ")[0].lower())}</div>')
    return f"""
<div class="page cover">
  <h1>{title}<br>{subtitle}</h1>
  <p class="sub">{tagline}</p>
  <div class="chips">{''.join(chips)}</div>
  <div class="meta">{meta_block(data.get("meta") or {})}</div>
</div>"""


def how_to_read_page(data: dict, page_no: int) -> str:
    rows = []
    for sev in ORDER:
            label, colour, short, usage = SEV[sev]
            rows.append(f'<tr><td class="sev"><span class="tag" style="background:{colour}">{label}</span></td>'
                        f'<td>{esc(short)}</td><td>{esc(usage)}</td></tr>')
    caveat = data.get("caveat") or DEFAULT_CAVEAT
    return f"""
<div class="page summary">
  <h2>How to read this document</h2>
  <p>One screen per page. The screenshot carries numbered markers; the matching note sits to its right.
     Markers are positioned near what they describe, not pixel-exact. Every page has deliberate white
     space at the bottom for your own notes.</p>
  <table style="margin-top:6mm;max-width:210mm">
    <tr><th style="width:20mm">Tag</th><th style="width:52mm">Means</th><th>How it was used</th></tr>
    {''.join(rows)}
  </table>
  <h3>A caveat worth stating plainly</h3>
  <p>{esc(caveat)}</p>
  <div class="pnum">{page_no}</div>
</div>"""


def divider_page(sec: dict) -> str:
    return f"""
<div class="page divider">
  <div class="letter">{esc(sec["id"])}</div>
  <h2>{esc(sec["title"])}</h2>
  <p>{esc(sec.get("blurb", ""))}</p>
</div>"""


def screen_page(scr: dict, sec: dict, img: str, page_no: int) -> str:
    markers, items = [], []
    for i, note in enumerate(scr.get("notes") or [], start=1):
        colour = SEV[note["_sev"]][1]
        markers.append(f'<div class="marker" style="left:{note["x"]}%;top:{note["y"]}%;background:{colour}">{i}</div>')
        items.append(f'<li><div class="num" style="background:{colour}">{i}</div>'
                     f'<div class="body">{tag(note["_sev"])}{note["text"]}{status_chip(note)}</div></li>')
    where = scr.get("where", "")
    return f"""
<div class="page">
  <div class="left"><div class="shot">
    <img src="{esc(img)}" alt="{esc(scr["title"])}">
    {''.join(markers)}
  </div></div>
  <div class="right">
    <div class="crumb">{esc(sec["id"])} &middot; {esc(sec["title"])}</div>
    <h2>{esc(scr["title"])}</h2>
    <div class="file">{esc(where)}</div>
    <ul class="notes">{''.join(items)}</ul>
    <div class="markup">Space below is intentional, for your notes.</div>
  </div>
  <div class="pnum">{page_no}</div>
</div>"""


def ranked_notes(data: dict, sec_by_id: dict):
    rows = []
    for scr in data["screens"]:
        for note in scr.get("notes") or []:
            rows.append((ORDER.index(note["_sev"]), scr, note))
    rows.sort(key=lambda r: r[0])  # stable: section and walk order preserved within a tier
    return rows


def index_pages(data: dict, sec_by_id: dict, first_page_no: int):
    rows = ranked_notes(data, sec_by_id)
    has_status = any(r[2].get("status") for r in rows)
    pages = []
    total = max(1, math.ceil(len(rows) / INDEX_ROWS))
    for chunk in range(total):
        part = rows[chunk * INDEX_ROWS:(chunk + 1) * INDEX_ROWS]
        trs = []
        for _, scr, note in part:
            sec = sec_by_id[scr["section"]]
            status = f'<td class="sev">{status_chip(note)}</td>' if has_status else ""
            trs.append(f'<tr><td class="id">{esc(note["id"])}</td><td class="sev">{tag(note["_sev"])}</td>'
                       f'<td class="where">{esc(sec["id"])} &middot; {esc(scr["title"])}</td>'
                       f'<td>{note["text"]}</td>{status}</tr>')
        status_th = "<th>Status</th>" if has_status else ""
        heading = "All findings, ranked" + (f" ({chunk + 1} of {total})" if total > 1 else "")
        pages.append(f"""
<div class="page summary">
  <h2>{heading}</h2>
  <table>
    <tr><th>Id</th><th>Tag</th><th>Where</th><th>Finding</th>{status_th}</tr>
    {''.join(trs)}
  </table>
  <div class="pnum">{first_page_no + chunk}</div>
</div>""")
    return pages


def render(data: dict, img_map: dict) -> str:
    sec_by_id = {s["id"]: s for s in data["sections"]}
    cnt = counts(data)
    page_w, page_h = PAGE_SIZES[str(data.get("page", "a4")).lower()]
    css = CSS.replace("__PAGE_W__", page_w).replace("__PAGE_H__", page_h)
    pages = [cover_page(data, cnt)]
    page_no = 2
    pages.append(how_to_read_page(data, page_no))
    page_no += 1
    for sec in data["sections"]:
        screens = [s for s in data["screens"] if s["section"] == sec["id"]]
        if not screens:
            continue
        pages.append(divider_page(sec))
        page_no += 1
        for scr in screens:
            pages.append(screen_page(scr, sec, img_map[scr["file"]], page_no))
            page_no += 1
    pages.extend(index_pages(data, sec_by_id, page_no))
    title = esc(f'{data["title"]} {data.get("subtitle", "UX Audit")}')
    return (f"<!doctype html><html><head><meta charset='utf-8'><title>{title}</title>"
            f"<style>{css}</style></head><body>{''.join(pages)}</body></html>")


def find_chrome(explicit: str | None) -> str | None:
    candidates = [explicit, os.environ.get("CHROME_BIN")]
    candidates += [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ]
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "chrome"):
        found = shutil.which(name)
        if found:
            candidates.append(found)
    for c in candidates:
        if c and Path(c).exists():
            return c
    return None


def count_pdf_pages(pdf: Path):
    try:
        return len(re.findall(rb"/Type\s*/Page\b", pdf.read_bytes()))
    except OSError:
        return None


def to_pdf(html_path: Path, out_pdf: Path, chrome: str | None) -> int:
    binary = find_chrome(chrome)
    if not binary:
        print("pdf: no Chrome, Chromium, or Edge found; pass --chrome PATH or set CHROME_BIN", file=sys.stderr)
        return 2
    cmd = [binary, "--headless", "--disable-gpu", "--no-pdf-header-footer",
           f"--print-to-pdf={out_pdf}", "--virtual-time-budget=25000", html_path.resolve().as_uri()]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not out_pdf.exists():
        print(f"pdf: render failed ({result.returncode})\n{result.stderr[-2000:]}", file=sys.stderr)
        return 1
    pages = count_pdf_pages(out_pdf)
    size_kb = out_pdf.stat().st_size // 1024
    print(f"pdf: {out_pdf} ({pages if pages else '?'} pages, {size_kb} KB)")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audit_json", type=Path)
    ap.add_argument("--pdf", action="store_true", help="also render the PDF with a headless browser")
    ap.add_argument("--check", action="store_true", help="validate and report counts; write nothing")
    ap.add_argument("--no-downscale", action="store_true", help="use full-size captures in the PDF source")
    ap.add_argument("--chrome", help="path to a Chrome, Chromium, or Edge binary")
    args = ap.parse_args(argv)

    json_path: Path = args.audit_json
    if not json_path.exists():
        print(f"error: {json_path} not found", file=sys.stderr)
        return 2
    root = audit_root(json_path)
    try:
        data = load(json_path)
    except json.JSONDecodeError as err:
        print(f"error: {json_path}: invalid JSON ({err})", file=sys.stderr)
        return 2

    errors, warnings = validate(data, root)
    for w in warnings:
        print(f"warning: {w}", file=sys.stderr)
    for e in errors:
        print(f"error: {e}", file=sys.stderr)
    if errors:
        print(f"check: {len(errors)} error(s)")
        return 1

    assign_ids(data)
    cnt = counts(data)
    summary = ", ".join(f"{SEV[k][0]} {cnt[k]}" for k in ORDER)
    print(f"check: ok. {len(data['screens'])} screens, {sum(cnt.values())} notes ({summary}), "
          f"{len(data['sections'])} sections")
    if args.check:
        return 0

    build_dir = root / "build"
    build_dir.mkdir(parents=True, exist_ok=True)
    img_map = downscale(root, data["screens"], args.no_downscale)
    html_path = build_dir / "audit.html"
    html_path.write_text(render(data, img_map), encoding="utf-8")
    page_total = 2 + len({s['section'] for s in data['screens']}) + len(data['screens']) + \
        max(1, math.ceil(sum(cnt.values()) / INDEX_ROWS))
    print(f"html: {html_path} ({page_total} pages)")
    if not args.pdf:
        return 0
    pdf_name = data.get("pdf") or f"{slugify(data['title'])}-UX-Audit.pdf"
    return to_pdf(html_path, root / pdf_name, args.chrome)


if __name__ == "__main__":
    sys.exit(main())
