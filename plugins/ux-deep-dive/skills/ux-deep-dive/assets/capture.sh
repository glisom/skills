#!/usr/bin/env bash
# capture.sh <slug>
#   Capture the current screen of a simulator or emulator into the audit's raw/ folder as NN-<slug>.png,
#   and write a point-scale preview for coordinate work (in the preview, pixel x,y equals tap point x,y).
#
# Environment:
#   UXDD_PLATFORM  ios | android                  (default: ios)
#   UXDD_DEVICE    simulator UDID or adb serial   (default: the booted simulator / the only adb device)
#   UXDD_OUT       raw folder                     (default: ./raw)
#   UXDD_PREVIEW   preview path                   (default: ./build/preview.png)
#   UXDD_SCALE     pixels per point               (default: 3 on ios; density/160 on android)
#
# If <slug> already starts with two digits and a dash, that number is kept; otherwise the next free number
# in the raw folder is used. Numbers are never reused, so a recapture of screen 07 is "07-<slug>" again.
set -euo pipefail

PLATFORM="${UXDD_PLATFORM:-ios}"
OUT="${UXDD_OUT:-./raw}"
PREVIEW="${UXDD_PREVIEW:-./build/preview.png}"
slug="${1:?usage: capture.sh <slug>}"
mkdir -p "$OUT" "$(dirname "$PREVIEW")"

if [[ "$slug" =~ ^[0-9]{2}- ]]; then
  name="$slug"
else
  last=$( (ls "$OUT" 2>/dev/null | grep -E '^[0-9]{2}-' | sort | tail -1 | cut -c1-2) || true)
  next=$(( 10#${last:-0} + 1 ))
  name=$(printf '%02d-%s' "$next" "$slug")
fi
file="$OUT/$name.png"

case "$PLATFORM" in
  ios)
    DEVICE="${UXDD_DEVICE:-booted}"
    xcrun simctl io "$DEVICE" screenshot --type=png "$file" >/dev/null
    SCALE="${UXDD_SCALE:-3}"
    ;;
  android)
    ADB=(adb)
    [[ -n "${UXDD_DEVICE:-}" ]] && ADB=(adb -s "$UXDD_DEVICE")
    "${ADB[@]}" exec-out screencap -p > "$file"
    if [[ -n "${UXDD_SCALE:-}" ]]; then
      SCALE="$UXDD_SCALE"
    else
      density=$("${ADB[@]}" shell wm density | grep -oE '[0-9]+' | tail -1 || echo 160)
      SCALE=$(python3 -c "print(round(${density:-160}/160, 2))")
    fi
    ;;
  *)
    echo "capture.sh: unknown UXDD_PLATFORM '$PLATFORM' (ios | android)" >&2
    exit 2
    ;;
esac

python3 - "$file" "$PREVIEW" "$SCALE" <<'PY'
import shutil, struct, subprocess, sys
src, dst, scale = sys.argv[1], sys.argv[2], float(sys.argv[3])
with open(src, "rb") as fh:
    head = fh.read(24)
if head[:8] != b"\x89PNG\r\n\x1a\n":
    sys.exit(f"capture.sh: {src} is not a PNG; the device may not have answered")
w, h = struct.unpack(">II", head[16:24])
pw, ph = int(round(w / scale)), int(round(h / scale))
try:
    from PIL import Image
    Image.open(src).resize((pw, ph), Image.LANCZOS).save(dst)
except ImportError:
    if shutil.which("sips"):
        subprocess.run(["sips", "--resampleWidth", str(pw), src, "--out", dst], check=True, capture_output=True)
    else:
        shutil.copy(src, dst)
        pw, ph = w, h
print(f"saved {src} ({w}x{h}); preview {dst} ({pw}x{ph}); tap point = pixel / {scale:g}")
PY
