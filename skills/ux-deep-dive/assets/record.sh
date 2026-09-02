#!/usr/bin/env bash
# record.sh start <slug>   begin recording the simulator or emulator screen
# record.sh stop           end the recording and transcode it to motion/NN-<slug>.mp4
#
# Environment:
#   UXDD_PLATFORM  ios | android                  (default: ios)
#   UXDD_DEVICE    simulator UDID or adb serial   (default: the booted simulator / the only adb device)
#   UXDD_MOTION    clips folder                   (default: ./motion)
#   UXDD_WIDTH     output width in pixels         (default: 402)
#
# One recording at a time. The recorder is stopped with SIGINT so the container is finalized; a SIGKILL
# leaves an unreadable file. Requires ffmpeg for the transcode.
set -euo pipefail

PLATFORM="${UXDD_PLATFORM:-ios}"
MOTION="${UXDD_MOTION:-./motion}"
WIDTH="${UXDD_WIDTH:-402}"
STATE="$MOTION/.recording"
mkdir -p "$MOTION"
cmd="${1:?usage: record.sh start <slug> | stop}"

adb_cmd() {
  if [[ -n "${UXDD_DEVICE:-}" ]]; then adb -s "$UXDD_DEVICE" "$@"; else adb "$@"; fi
}

case "$cmd" in
  start)
    slug="${2:?usage: record.sh start <slug>}"
    if [[ -f "$STATE" ]]; then
      echo "record.sh: a recording is already in progress ($(cat "$STATE")); run 'record.sh stop' first" >&2
      exit 1
    fi
    if [[ "$slug" =~ ^[0-9]{2}- ]]; then
      name="$slug"
    else
      last=$( (ls "$MOTION" 2>/dev/null | grep -E '^[0-9]{2}-' | sort | tail -1 | cut -c1-2) || true)
      name=$(printf '%02d-%s' "$(( 10#${last:-0} + 1 ))" "$slug")
    fi
    case "$PLATFORM" in
      ios)
        xcrun simctl io "${UXDD_DEVICE:-booted}" recordVideo --codec=h264 --force "$MOTION/$name.mov" >/dev/null 2>&1 &
        ;;
      android)
        adb_cmd shell screenrecord --time-limit 180 "/sdcard/uxdd-$name.mp4" >/dev/null 2>&1 &
        ;;
      *)
        echo "record.sh: unknown UXDD_PLATFORM '$PLATFORM' (ios | android)" >&2
        exit 2
        ;;
    esac
    echo "$! $PLATFORM $name" > "$STATE"
    sleep 1
    echo "recording $name (pid $!); perform the interaction, then run: record.sh stop"
    ;;
  stop)
    if [[ ! -f "$STATE" ]]; then
      echo "record.sh: no recording in progress" >&2
      exit 1
    fi
    read -r pid plat name < "$STATE"
    kill -INT "$pid" 2>/dev/null || true
    for _ in $(seq 1 40); do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
    sleep 1
    case "$plat" in
      ios)
        src="$MOTION/$name.mov"
        ;;
      android)
        adb_cmd pull "/sdcard/uxdd-$name.mp4" "$MOTION/$name-src.mp4" >/dev/null
        adb_cmd shell rm -f "/sdcard/uxdd-$name.mp4" >/dev/null 2>&1 || true
        src="$MOTION/$name-src.mp4"
        ;;
    esac
    if [[ ! -s "$src" ]]; then
      rm -f "$STATE"
      echo "record.sh: no recording was written to $src" >&2
      exit 1
    fi
    ffmpeg -y -loglevel error -i "$src" -vf "scale=${WIDTH}:-2" -c:v libx264 -preset veryfast -crf 26 \
      -pix_fmt yuv420p -movflags +faststart "$MOTION/$name.mp4"
    rm -f "$src" "$STATE"
    echo "wrote $MOTION/$name.mp4"
    ;;
  *)
    echo "usage: record.sh start <slug> | stop" >&2
    exit 2
    ;;
esac
