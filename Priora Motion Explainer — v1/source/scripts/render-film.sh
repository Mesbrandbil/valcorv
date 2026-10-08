#!/usr/bin/env bash
# Render the Priora motion explainer and deliver the two MP4s.
#
# Usage (from anywhere):
#   scripts/render-film.sh [--quality draft|looks|delivery] [--crf N] [--skip-audio] [--out DIR]
#   (default: delivery quality at CRF 14, so the paper grain survives the encode)
#
# 1. sound: extracts the picture's sound events and rebuilds the stems and masters (audio/build.py)
# 2. picture: HyperFrames renders index.html (1920x1080, 30 fps, 2700 frames)
# 3. mux: the picture with assets/audio/master.wav, and again with master-no-narration.wav
# 4. checks: duration 90.000 s, 2700 frames, 1920x1080, audio present
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$ROOT"
QUALITY=delivery
CRF=14
AUDIO=1
OUT="$(cd "$ROOT/.." && pwd -P)"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --quality) QUALITY="$2"; shift 2 ;;
    --crf) CRF="$2"; shift 2 ;;
    --skip-audio) AUDIO=0; shift ;;
    --out) OUT="$2"; shift 2 ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
done

HF="npx --yes hyperframes@0.8.92"
# LCD (subpixel) text antialiasing off, so every frame is identical whatever was rendered before it.
export PRODUCER_HEADLESS_SHELL_PATH="${PRODUCER_HEADLESS_SHELL_PATH:-$ROOT/scripts/chrome/chrome-headless-shell}"
mkdir -p renders/tmp

if [[ $AUDIO == 1 ]]; then
  echo "== 1. sound"
  python3 audio/build.py
fi

echo "== 2. lint"
$HF lint

echo "== 3. picture ($QUALITY)"
PIC="renders/tmp/picture-$QUALITY.mp4"
$HF render --quality "$QUALITY" --crf "$CRF" --workers 2 --output "$PIC"

echo "== 4. mux"
FULL="$OUT/Priora Motion Explainer v1.mp4"
NONAR="$OUT/Priora Motion Explainer v1 no narration.mp4"
mux() {
  ffmpeg -y -loglevel error -i "$PIC" -i "$1" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -ar 48000 \
    -t 90 -movflags +faststart -metadata title="Priora motion explainer v1" "$2"
}
mux assets/audio/master.wav "$FULL"
mux assets/audio/master-no-narration.wav "$NONAR"

echo "== 5. checks"
for f in "$FULL" "$NONAR"; do
  python3 - "$f" <<'EOF'
import json, subprocess, sys
f = sys.argv[1]
p = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-count_frames", "-of", "json", f]))
v = [s for s in p["streams"] if s["codec_type"] == "video"][0]
a = [s for s in p["streams"] if s["codec_type"] == "audio"]
dur = float(p["format"]["duration"])
frames = int(v.get("nb_read_frames", 0))
ok = v["width"] == 1920 and v["height"] == 1080 and frames == 2700 and abs(dur - 90.0) < 0.05 and len(a) == 1
print(("OK " if ok else "CHECK ") + f.split("/")[-1], f"{v['width']}x{v['height']}", f"{frames} frames", f"{dur:.3f} s",
      f"audio {a[0]['codec_name']} {a[0]['sample_rate']} Hz" if a else "no audio", f"{int(p['format']['size'])/1e6:.1f} MB")
sys.exit(0 if ok else 1)
EOF
done
echo "done"
