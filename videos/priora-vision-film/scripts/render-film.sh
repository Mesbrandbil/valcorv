#!/usr/bin/env bash
# Assemble, check, snapshot and render the Priora vision film, then mux the
# mastered audio onto the picture.
#
# Usage (from anywhere):
#   scripts/render-film.sh [--quality draft|looks|delivery] [--name NAME] [--skip-check] [--skip-snapshots]
#
# Output: renders/<NAME>.mp4 (picture from HyperFrames, audio from
# assets/audio/master.wav when it exists, otherwise the stems summed with a
# safety limiter, otherwise the voice alone), plus stills/<NAME>/ snapshots and
# contact sheets at every scene midpoint and key beat.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$ROOT"

QUALITY=looks
NAME=priora-vision-film
CHECK=1
SNAPS=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --quality) QUALITY="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --skip-check) CHECK=0; shift ;;
    --skip-snapshots) SNAPS=0; shift ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
done

HF="npx --yes hyperframes@0.8.92"
mkdir -p renders/tmp stills

echo "== 1. cues and index"
node scripts/build-cues.mjs

if [[ $CHECK == 1 ]]; then
  echo "== 2. hyperframes check"
  $HF check
fi

if [[ $SNAPS == 1 ]]; then
  echo "== 3. snapshots"
  AT="$(python3 - <<'EOF'
import json
r = json.load(open('cues/resolved.json'))
c = r['cues']; ts = set()
for s in r['scenes'].values() if isinstance(r['scenes'], dict) else r['scenes']:
    st, du = s['start'], s['duration']
    ts.add(round(st + du / 2, 2))
for k in ['hour', 'workMoves', 'accepted', 'checklists', 'moving', 'inPlace', 'landing', 'offline', 'nobody',
          'q3', 'tooLate', 'rewindStart', 'rewindEnd', 'riskChanged', 'six', 'connectionHold', 'keepsRecord',
          'proof', 'immediately', 'cross', 'change', 'retain', 'cover', 'decisionsL18', 'chainCapacity',
          'infrastructure']:
    if k in c: ts.add(round(c[k] + 0.4, 2))
ts.add(round(r['duration'] - 0.5, 2))
print(','.join(str(t) for t in sorted(ts)))
EOF
)"
  rm -rf "stills/$NAME"
  $HF snapshot . --at "$AT" --no-end -o "stills/$NAME"
fi

echo "== 4. render picture ($QUALITY)"
PIC="renders/tmp/$NAME-picture.mp4"
$HF render --quality "$QUALITY" --output "$PIC"

echo "== 5. audio"
AUDIO="assets/audio/master.wav"
if [[ ! -f "$AUDIO" ]]; then
  AUDIO="renders/tmp/$NAME-premix.wav"
  inputs=(-i assets/audio/voice.wav); n=1
  [[ -f assets/audio/music.wav ]] && inputs+=(-i assets/audio/music.wav) && n=$((n + 1))
  [[ -f assets/audio/sfx.wav ]] && inputs+=(-i assets/audio/sfx.wav) && n=$((n + 1))
  ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "amix=inputs=$n:normalize=0,alimiter=limit=0.89" -ar 48000 -ac 2 "$AUDIO"
  echo "no master.wav yet: used $n stem(s) with a safety limiter"
fi

echo "== 6. mux"
OUT="renders/$NAME.mp4"
ffmpeg -y -loglevel error -i "$PIC" -i "$AUDIO" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact "$OUT"
echo "done: $OUT"
