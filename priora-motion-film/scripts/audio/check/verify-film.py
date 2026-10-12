#!/usr/bin/env python3
"""Checks an exported film's soundtrack from beginning to end, and fails loudly if anything is off.

For each MP4 given it checks:
  - a video stream (1920x1080, 30 fps, every frame) and an audio stream (AAC, 48 kHz, stereo) that covers it,
    and that the file decodes end to end without errors;
  - loudness about -16 LUFS integrated (within 1 LU) and true peak at or under -1 dBTP, with no clipped samples;
  - that the embedded audio is the current mix (public/audio/narration.wav + sound.wav), sample-aligned;
  - that every narration line sits on its beat in the film's own audio (matched filtering against the mix's
    processed line, out/mix/<id>.wav), within half a frame;
  - that a whole-film transcript (the Parakeet recogniser in 12 s pieces) hears every word of every line in its
    window, and no speech outside the windows. "Priora" written by the recogniser as "Priyora" or similar counts
    as heard, since it is the brand name pronounced as intended.
It also reports, per line, how far the voice sits above the music and effects (from the two stems).

Usage (from priora-motion-film, with a Python that has numpy, scipy, soundfile and sherpa-onnx):
  python -I scripts/audio/check/verify-film.py <film.mp4> [<film.mp4> ...] [--report out.json]
Exits 1 if any film fails a check.
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import correlate, lfilter, resample_poly

sys.path.insert(0, str(Path(__file__).resolve().parent))
from asr import transcribe  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
FPS, SR = 30, 48000
BRAND = re.compile(r"^pr\w*ora$")


def narration():
    with tempfile.TemporaryDirectory() as d:
        entry = Path(d) / 'dump.ts'
        entry.write_text(f"import {{ NARRATION, FILM_FRAMES }} from '{ROOT}/src/lib/timeline';\nconsole.log(JSON.stringify({{ lines: NARRATION, frames: FILM_FRAMES }}));\n")
        out = subprocess.run(['node', str(ROOT / 'scripts/run-ts.mjs'), str(entry)], capture_output=True, text=True, check=True, cwd=ROOT).stdout
    return json.loads(out)


def decode(path):
    """The film's audio as stereo float samples (a mono downmix would add the channels and overstate peaks)."""
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path), '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)


def norm(text):
    return re.sub(r"[^a-z0-9' ]", ' ', text.lower().replace('\u2019', "'")).split()


def errors(want, got):
    same = lambda a, b: a == b or (BRAND.match(a) and BRAND.match(b))
    d = [[i + j if i * j == 0 else 0 for j in range(len(got) + 1)] for i in range(len(want) + 1)]
    for i in range(1, len(want) + 1):
        for j in range(1, len(got) + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (0 if same(want[i - 1], got[j - 1]) else 1))
    return d[-1][-1]


def kweight(x):
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    return lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], lfilter(b1, a1, x, axis=0), axis=0)


def check(film, nar, stems):
    res = {'file': str(film), 'fail': []}
    fail = res['fail'].append
    probe = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(film)], capture_output=True, check=True).stdout)
    v = [s for s in probe['streams'] if s['codec_type'] == 'video']
    a = [s for s in probe['streams'] if s['codec_type'] == 'audio']
    if not v or not a:
        fail('missing a video or an audio stream')
        return res
    v, a = v[0], a[0]
    res['video'] = f"{v['codec_name']} {v['width']}x{v['height']} {v['r_frame_rate']} {v.get('nb_frames')} frames"
    res['audio'] = f"{a['codec_name']} {a['sample_rate']} Hz {a['channels']} ch {float(a.get('duration', 0)):.3f} s"
    if (v['width'], v['height'], v['r_frame_rate']) != (1920, 1080, '30/1') or int(v.get('nb_frames', 0)) != nar['frames']:
        fail(f"video is not 1920x1080 at 30 fps with {nar['frames']} frames")
    if a['codec_name'] != 'aac' or int(a['sample_rate']) != SR or int(a['channels']) != 2:
        fail('audio is not AAC 48 kHz stereo')
    if float(a.get('duration', 0)) < nar['frames'] / FPS - 1 / FPS:
        fail('audio is shorter than the picture')
    dec = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(film), '-f', 'null', '-'], capture_output=True, text=True)
    if dec.returncode or dec.stderr.strip():
        fail('does not decode cleanly: ' + dec.stderr.strip()[:300])

    err = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', str(film), '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    summary = err[err.rfind('Summary:'):]
    lufs = float(re.search(r'I:\s*(-?[\d.]+)', summary).group(1))
    tp = float(re.search(r'Peak:\s*(-?[\d.]+)', summary).group(1))
    res['loudness'] = {'lufs': lufs, 'true_peak': tp}
    if abs(lufs + 16) > 1:
        fail(f'loudness {lufs} LUFS, not about -16')
    if tp > -1:
        fail(f'true peak {tp} dBTP, over -1')

    stereo = decode(film)
    clipped = int(np.sum(np.abs(stereo) >= 0.999))
    x = stereo.mean(axis=1)
    res['clipped_samples'] = clipped
    if clipped:
        fail(f'{clipped} clipped samples')

    # the embedded audio is the current mix, sample-aligned
    voice, _ = sf.read(stems[0]); sound, _ = sf.read(stems[1])
    ref = (voice + sound).mean(axis=1)
    lags = []
    for t0 in (5, 25, 45, 65, 85):
        s0, s1 = int(t0 * SR), int((t0 + 8) * SR)
        c = correlate(ref[s0 - 4800:s1 + 4800], x[s0:s1], mode='valid')
        lags.append(int(np.argmax(np.abs(c))) - 4800)
    res['mix_offset_ms'] = [round(l / SR * 1000, 2) for l in lags]
    if any(abs(l) > SR // 1000 for l in lags):
        fail(f'embedded audio is offset from the mix: {res["mix_offset_ms"]} ms')

    # each line on its beat
    place = []
    for ln in nar['lines']:
        clip, sr = sf.read(ROOT / 'out/mix' / f"{ln['id']}.wav")
        clip = clip.mean(axis=1) if clip.ndim > 1 else clip
        if sr != SR:
            clip = resample_poly(clip, SR, sr)
        at = int(ln['from'] / FPS * SR); lo = max(0, at - SR)
        seg = x[lo:at + SR + len(clip)]
        lag = lo + int(np.argmax(correlate(seg, clip, mode='valid'))) - at
        place.append({'id': ln['id'], 'offset_ms': round(lag / SR * 1000, 2)})
        if abs(lag) > SR / FPS / 2:
            fail(f"{ln['id']} is {lag / SR * 1000:.1f} ms off its beat")
    res['placement'] = place

    # whole-film transcript in 12 s pieces
    words, t, dur, size, step = [], 0.0, len(x) / SR, 12.0, 8.0
    while t < dur:
        edge = (size - step) / 2
        lo, hi = (t + edge if t > 0 else 0), (t + size - edge if t + size < dur else 1e9)
        words += [w for w in transcribe(str(film), t, size)['words'] if lo <= w['start'] < hi]
        t += step
    used, per = set(), []
    for ln in nar['lines']:
        a0, b0 = ln['from'] / FPS, (ln['to'] + 1) / FPS
        idx = [i for i, w in enumerate(words) if a0 - 0.3 <= w['start'] <= b0 + 0.1]
        used.update(idx)
        heard = norm(' '.join(words[i]['w'] for i in idx))
        e = errors(norm(ln['text']), heard)
        per.append({'id': ln['id'], 'word_errors': e, 'heard': ' '.join(heard)})
        if e:
            fail(f"{ln['id']}: {e} word(s) not heard as written ('{' '.join(heard)}')")
    stray = [w['w'] for i, w in enumerate(words) if i not in used]
    res['transcript'] = per
    if stray:
        fail(f'speech outside the narration windows: {stray[:10]}')

    # voice over music and effects, per line (from the stems)
    kv, ks = kweight(voice), kweight(sound)
    win, hop = int(0.4 * SR), int(0.1 * SR)
    lv = lambda k, s: -0.691 + 10 * np.log10(np.mean(np.sum(k[s:s + win] ** 2, axis=1)) + 1e-12)
    over = []
    for ln in nar['lines']:
        a0, b0 = int(ln['from'] / FPS * SR), int((ln['to'] + 1) / FPS * SR)
        rows = [(lv(kv, s), lv(ks, s)) for s in range(a0, max(a0 + 1, b0 - win), hop)]
        top = max(r[0] for r in rows)
        d = [r[0] - r[1] for r in rows if r[0] > top - 20]
        over.append({'id': ln['id'], 'median_db': round(float(np.median(d)), 1), 'worst_db': round(float(min(d)), 1)})
        if np.median(d) < 10:
            fail(f"{ln['id']}: the voice is only {np.median(d):.1f} dB over the music and effects")
    res['voice_over_rest'] = over
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('films', nargs='+')
    ap.add_argument('--report')
    args = ap.parse_args()
    nar = narration()
    stems = [ROOT / 'public/audio/narration.wav', ROOT / 'public/audio/sound.wav']
    results = [check(Path(f), nar, stems) for f in args.films]
    for r in results:
        print(f"\n{r['file']}")
        print(f"  {r.get('video')} | {r.get('audio')} | {r.get('loudness')} | clipped {r.get('clipped_samples')} | mix offset {r.get('mix_offset_ms')} ms")
        if 'placement' in r:
            print(f"  lines on their beats within {max(abs(p['offset_ms']) for p in r['placement']):.2f} ms")
        if 'transcript' in r:
            print(f"  transcript: {sum(p['word_errors'] for p in r['transcript'])} word errors over {len(r['transcript'])} lines")
        if 'voice_over_rest' in r:
            print(f"  voice over music and effects: median {min(o['median_db'] for o in r['voice_over_rest'])} to {max(o['median_db'] for o in r['voice_over_rest'])} dB by line")
        print('  PASS' if not r['fail'] else '  FAIL:\n    ' + '\n    '.join(r['fail']))
    if args.report:
        Path(args.report).write_text(json.dumps(results, indent=1))
    sys.exit(1 if any(r['fail'] for r in results) else 0)


if __name__ == '__main__':
    main()
