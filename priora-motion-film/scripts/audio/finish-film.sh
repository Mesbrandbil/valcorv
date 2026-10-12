#!/usr/bin/env bash
# Finishes the Priora film with ElevenLabs audio, end to end, on the approved picture:
#   1. generates the 18 narration lines, the effects and the music with ElevenLabs (scripts/audio/make-elevenlabs.py;
#      every request is cached in "audio sources/elevenlabs/takes", so a re-run spends nothing on what exists)
#   2. mixes them on the 90 BPM grid (npm run mix), which also times the worker's words on screen and the
#      subtitles to the recordings; it stops if a line runs past its window, so its beat can be moved in
#      src/lib/timeline.ts (VOICE) before running this again
#   3. regenerates narration.srt and runs the film's checks (npm run qa)
#   4. renders the film, places the review subtitles from it, and renders the subtitled film
#   5. makes the two chat copies (under 30 MiB) and verifies all four files from beginning to end
# Needs ELEVENLABS_API_KEY, and network access to api.elevenlabs.io.
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${ELEVENLABS_API_KEY:?set ELEVENLABS_API_KEY to an ElevenLabs API key}"
bash scripts/audio/setup-tools.sh
PY=.venv-audio/bin/python
[ -d node_modules ] || npm install
if [ -z "${BROWSER_EXECUTABLE:-}" ]; then
  for b in /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell; do [ -x "$b" ] && export BROWSER_EXECUTABLE="$b"; done
fi
export AUDIO_SOURCES="audio sources/elevenlabs"

"$PY" -I scripts/audio/make-elevenlabs.py
npm run mix
npm run srt
npm run qa
npm run render:film
"$PY" -I scripts/place-subtitles.py
npm run render:review

mkdir -p renders/chat
chat() {
  local log; log="$(mktemp -d)/x264"
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "renders/$1.mp4" -c:v libx264 -preset slow -x264-params ref=4 -b:v 2200k -pass 1 -passlogfile "$log" -an -f mp4 /dev/null
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "renders/$1.mp4" -c:v libx264 -preset slow -x264-params ref=4 -b:v 2200k -pass 2 -passlogfile "$log" \
    -pix_fmt yuv420p -c:a aac -b:a 160k -ar 48000 -movflags +faststart "renders/chat/$2.mp4"
}
chat "Priora film master" "Priora film with sound"
chat "Priora film review with subtitles" "Priora film with sound and subtitles"

"$PY" -I scripts/audio/check/verify-film.py "renders/Priora film master.mp4" "renders/Priora film review with subtitles.mp4" \
  "renders/chat/Priora film with sound.mp4" "renders/chat/Priora film with sound and subtitles.mp4" --report renders/verify.json
