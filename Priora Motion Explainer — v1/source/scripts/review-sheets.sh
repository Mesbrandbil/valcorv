#!/usr/bin/env bash
# Review aid: render a draft of the whole film, then cut it into timestamped contact sheets.
# Usage: scripts/review-sheets.sh OUTDIR [fps-per-sheet-frame, default 2]
# Writes OUTDIR/film-draft.mp4, OUTDIR/sheet-NN.jpg (4 x 4 frames, 8 s per sheet at 2 fps) and OUTDIR/frames/tNN.N.jpg
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
OUT="${1:?usage: review-sheets.sh OUTDIR [fps]}"
FPS="${2:-2}"
mkdir -p "$OUT/frames"
cd "$ROOT"
export PRODUCER_HEADLESS_SHELL_PATH="${PRODUCER_HEADLESS_SHELL_PATH:-$ROOT/scripts/chrome/chrome-headless-shell}"
npx --yes hyperframes@0.8.92 render --quality draft --workers 2 --output "$OUT/film-draft.mp4" >/dev/null
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf
ffmpeg -y -loglevel error -i "$OUT/film-draft.mp4" -vf "fps=$FPS,scale=480:270,drawtext=fontfile=$FONT:text='%{pts\\:hms}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6,tile=4x4:padding=4:color=black" -q:v 3 "$OUT/sheet-%02d.jpg"
ffmpeg -y -loglevel error -i "$OUT/film-draft.mp4" -vf "fps=$FPS" -q:v 3 "$OUT/frames/f%04d.jpg"
# rename full frames by time
python3 - "$OUT/frames" "$FPS" <<'EOF'
import os, sys
d, fps = sys.argv[1], float(sys.argv[2])
for f in sorted(os.listdir(d)):
    if f.startswith("f") and f.endswith(".jpg"):
        n = int(f[1:5]) - 1
        os.replace(os.path.join(d, f), os.path.join(d, "t%05.1f.jpg" % (n / fps)))
EOF
ls "$OUT" | head -30
