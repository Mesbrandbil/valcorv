#!/usr/bin/env python3
"""Records the film's 18 narration lines with Kokoro-82M v1.0 (Apache-2.0), locally and deterministically.

The words, start beats and `by` frames come from VOICE in src/lib/timeline.ts, so the lines can never
disagree with the picture. For each line it:

  1. turns the text into phonemes with espeak-ng (the phonemizer that kokoro-onnx ships with), converted to
     the misaki US phoneme set Kokoro was trained on (the same conversion misaki's own espeak fallback
     makes), with a small lexicon for what espeak or the voice gets wrong: "Priora" is "pree-OR-uh"
     everywhere, and the z of "compares" is held into "safeguards";
  2. synthesizes it: the narrator is af_heart at speed 0.95, raised in 0.01 steps (to at most 1.08) only
     for a line that would not otherwise fit its window, and only if no speed is enough, its pauses are
     tightened too (never below 150 ms); the worker (W1) is tried as am_puck, am_michael
     and am_fenrir at the smallest speed from 1.00 to 1.08 that fits, and the take the recogniser
     transcribes most exactly (then most confidently) is kept;
  3. matches it to -18 LUFS, a look-ahead limiter holding its rare single-pulse peaks under -1.5 dBFS (4x
     oversampled) so it stays at -18 LUFS without clipping in the mix, then trims it at -48 dBFS so
     the first audible sound is 20 ms after the file start and about 150 ms of fading silence follows the
     last, and writes audio sources/voice/<id>.flac (24 kHz, 24 bit);
  4. checks the fit, length = ceil(trimmed seconds * 30) frames, end = start + length - 1 <= by (W1 also
     <= F0483, where its words grey out), and also measures the length the mix itself will see (the mix's
     own trim chain, read from scripts/mix-audio.ts, run through ffmpeg);
  5. transcribes the written file with the Parakeet recogniser and compares it with the text (ignoring
     case and punctuation), and writes audio sources/voice/lines.json.

Usage (from priora-motion-film, with the venv that has kokoro-onnx, sherpa-onnx, numpy, scipy, soundfile):
  python -I scripts/audio/make-voice.py --model DIR/kokoro-v1.0.onnx --voices DIR/voices-v1.0.bin --asr DIR/asr.py
or set KOKORO_MODEL, KOKORO_VOICES and PRIORA_ASR. Needs ffmpeg on the PATH.
"""
import argparse
import difflib
import importlib.util
import json
import math
import os
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.signal import lfilter, resample_poly

ROOT = Path(__file__).resolve().parents[2]
FPS = 30
RATE = 24000  # Kokoro's native rate; the mix resamples
LUFS_TARGET = -18.0  # the mix matches every line to -18 LUFS too, so its trim sees what this one sees
PEAK_CEILING_DB = -1.5  # 4x oversampled peak, so the true peak stays under -1 dBFS
# The mix's telephone band takes more loudness than peak off the worker's line (about 2 dB more), so the
# line is held lower, and keeps about 1 dB of headroom once the mix brings it back to -18 LUFS
WORKER_CEILING_DB = -4.5
TRIM_DB = -48.0  # the fit rule and the mix both trim at -48 dBFS
PAUSE_DB = -45.0  # 10 ms frames this quiet (the line at -18 LUFS) are part of a pause
PAUSE_FLOOR_S = 0.150  # a pause is never tightened below this
LEAD_S = 0.020  # the first audible sound sits this far after the file start
TAIL_S = 0.150  # and this much fading silence follows the last
WORKER_GREY_FRAME = 483  # the worker's words grey out at F0484, so W1 must end by F0483

NARRATOR = {'voice': 'af_heart', 'speeds': [round(0.95 + 0.01 * i, 2) for i in range(14)]}  # 0.95 .. 1.08
WORKER = {'voices': ['am_puck', 'am_michael', 'am_fenrir'], 'speeds': [round(1.00 + 0.01 * i, 2) for i in range(9)]}  # 1.00 .. 1.08

# Words and phrases espeak-ng (or the voice) gets wrong, in misaki US phonemes. Each replaces what espeak
# makes of the same words, and must be found in the line exactly as often as the words are.
LEXICON = {
    # espeak reads the name as "PRY-or-uh" (pɹˈIɔɹə); it is "pree-OR-uh"
    'Priora': 'pɹiˈɔɹə',
    # af_heart runs the z of "compares" into the s of "safeguards", so it is heard as "compare
    # safeguards"; a held sibilant across the join keeps the z, as a careful speaker does
    'compares safeguards': 'kəmpˈɛɹzs sˈAfɡɑɹdz',
}

# misaki's espeak fallback (misaki/espeak.py, Apache-2.0): espeak IPA, with tied diphthongs and
# affricates, to the single-letter misaki symbols Kokoro was trained on.
E2M = sorted({
    'ʔˌn\u0329': 'tn', 'ʔn\u0329': 'tn', 'ʔn': 'tn', 'ʔ': 't',
    'a^ɪ': 'I', 'a^ʊ': 'W', 'd^ʒ': 'ʤ', 'e^ɪ': 'A', 'e': 'A', 't^ʃ': 'ʧ', 'ɔ^ɪ': 'Y', 'ə^l': 'ᵊl',
    'ʲo': 'jo', 'ʲə': 'jə', 'ʲ': '', 'ɚ': 'əɹ', 'r': 'ɹ', 'x': 'k', 'ç': 'k', 'ɬ': 'l', '\u0303': '',
}.items(), key=lambda kv: -len(kv[0]))


# ---------------------------------------------------------------- the lines, from the film's own timeline
def read_voice_table(timeline: Path):
    src = timeline.read_text(encoding='utf-8')
    beat = int(re.search(r'export const BEAT = (\d+);', src).group(1))
    block = src[src.index('export const VOICE = ['):]
    block = block[:block.index('] as const;')]
    rows = re.findall(r"\{ id: '(\w+)', beat: (\d+), by: (\d+), text: '([^']*)'(?:, who: '(\w+)')? \}", block)
    lines = [{'id': i, 'beat': int(b), 'start': int(b) * beat, 'by': int(by), 'text': t, 'who': w or 'narrator'} for i, b, by, t, w in rows]
    if len(lines) != block.count('{ id:'):
        sys.exit(f'could not read every VOICE row in {timeline}')
    return lines


def read_mix_chains(mixer: Path):
    """The trim and telephone chains the mix applies, so the length it will measure can be checked here."""
    src = mixer.read_text(encoding='utf-8')
    get = lambda name: re.search(rf"const {name} = '([^']*)';", src).group(1)
    return get('TRIM'), get('PHONE')


# ---------------------------------------------------------------- phonemes
class Phonemizer:
    def __init__(self):
        # kokoro_onnx.Kokoro() has already pointed phonemizer at the espeak-ng library it ships with
        from phonemizer.backend import EspeakBackend
        self.backend = EspeakBackend(language='en-us', preserve_punctuation=True, with_stress=True, tie='^')
        self.lexicon = {w: (self.espeak(w), p) for w, p in LEXICON.items()}

    def espeak(self, text: str) -> str:
        ps = self.backend.phonemize([text])[0].strip()
        for old, new in E2M:
            ps = ps.replace(old, new)
        ps = re.sub('(\\S)\u0329', 'ᵊ\\1', ps).replace(chr(809), '')
        # the article "a" stays ɐ (as misaki says it); elsewhere espeak's ɐ is a plain schwa
        ps = ' '.join(w if w.strip('.,:;!?') == 'ɐ' else w.replace('ɐ', 'ə') for w in ps.split(' '))
        ps = ps.replace('o^ʊ', 'O').replace('ɜːɹ', 'ɜɹ').replace('ɜː', 'ɜɹ').replace('ɪə', 'iə').replace('ː', '')
        ps = ps.replace('o', 'ɔ').replace('^', '')
        # espeak writes "around" as ɚɹˈaʊnd and "for a" as fɚɹə, which the conversion doubles to ɹɹ
        return re.sub('ɹ+', 'ɹ', ps)

    def __call__(self, text: str) -> str:
        ps = self.espeak(text.replace('’', "'"))
        for word, (theirs, ours) in self.lexicon.items():
            wanted = len(re.findall(rf'\b{re.escape(word)}\b', text))
            if ps.count(theirs) != wanted:
                sys.exit(f'"{word}" should appear {wanted} time(s) in the phonemes of "{text}" as {theirs}: {ps}')
            ps = ps.replace(theirs, ours)
        return ps


# ---------------------------------------------------------------- levels and trimming
def k_weighting(fs):
    """The two BS.1770 pre-filters for any sample rate (the formulas libebur128 uses)."""
    k = math.tan(math.pi * 1681.974450955533 / fs)
    q = 0.7071752369554196
    vh = 10 ** (3.999843853973347 / 20)
    vb = vh ** 0.4996667741545416
    a0 = 1 + k / q + k * k
    shelf = (np.array([(vh + vb * k / q + k * k), 2 * (k * k - vh), (vh - vb * k / q + k * k)]) / a0,
             np.array([1.0, 2 * (k * k - 1) / a0, (1 - k / q + k * k) / a0]))
    k = math.tan(math.pi * 38.13547087602444 / fs)
    q = 0.5003270373238773
    a0 = 1 + k / q + k * k
    highpass = (np.array([1.0, -2.0, 1.0]), np.array([1.0, 2 * (k * k - 1) / a0, (1 - k / q + k * k) / a0]))
    return shelf, highpass


def loudness(x: np.ndarray, fs: int) -> float:
    """Integrated loudness (ITU-R BS.1770-4: K-weighting, 400 ms blocks, absolute and relative gates)."""
    y = np.concatenate([x, np.zeros(fs)])  # a short line still fills a measuring block, as the mix pads it
    for b, a in k_weighting(fs):
        y = lfilter(b, a, y)
    block, hop = int(0.4 * fs), int(0.1 * fs)
    z = np.array([np.mean(y[i:i + block] ** 2) for i in range(0, len(y) - block + 1, hop)])
    lk = -0.691 + 10 * np.log10(np.maximum(z, 1e-12))
    z = z[lk > -70]
    rel = -0.691 + 10 * np.log10(z.mean()) - 10
    z = z[(-0.691 + 10 * np.log10(z)) > rel]
    return float(-0.691 + 10 * np.log10(z.mean()))


def peak_db(x: np.ndarray) -> float:
    return float(20 * np.log10(np.abs(resample_poly(x, 4, 1)).max() + 1e-12))


def limit(x: np.ndarray, ceiling_db: float) -> np.ndarray:
    """A look-ahead peak limiter (2 ms attack, 60 ms release) on the 4x oversampled peaks. Kokoro now and then
    makes a single glottal pulse far above the speech round it (as at "When", "asks" and "outside"); this
    takes those down without touching the rest, so every line reaches -18 LUFS with its peaks under the ceiling."""
    ceiling = 10 ** (ceiling_db / 20)
    env = np.abs(resample_poly(x, 4, 1))[:len(x) * 4].reshape(-1, 4).max(1)
    want = np.minimum(1.0, ceiling / np.maximum(env, 1e-12))
    if want.min() >= 1.0:
        return x
    look = int(0.002 * RATE)
    g = uniform_filter1d(minimum_filter1d(want, 2 * look + 1), 2 * look + 1)
    rel = 1 - math.exp(-1 / (0.060 * RATE))
    out = np.empty_like(g)
    prev = 1.0
    for i, v in enumerate(g):
        prev = min(v, prev + (1 - prev) * rel)
        out[i] = prev
    return x * out


def level(x: np.ndarray, ceiling_db: float = PEAK_CEILING_DB) -> np.ndarray:
    """To -18 LUFS, with the peaks held under the ceiling by the limiter (a few passes, as limiting lowers the loudness)."""
    for _ in range(4):
        x = x * 10 ** ((LUFS_TARGET - loudness(x, RATE)) / 20)
        x = limit(x, ceiling_db - 0.2)
        if abs(loudness(x, RATE) - LUFS_TARGET) < 0.05:
            break
    # whatever the limiter could not quite reach is taken off the whole line
    return x * 10 ** (min(0.0, ceiling_db - peak_db(x)) / 20)


def trim(x: np.ndarray):
    """Cut at -48 dBFS, keeping 20 ms before the first audible sample and 150 ms after the last, faded to zero."""
    loud = np.nonzero(np.abs(x) >= 10 ** (TRIM_DB / 20))[0]
    first, last = int(loud[0]), int(loud[-1])
    lead, tail = int(round(LEAD_S * RATE)), int(round(TAIL_S * RATE))
    padded = np.concatenate([np.zeros(lead), x, np.zeros(tail)])
    y = padded[first:last + 1 + lead + tail].copy()
    y[:lead] *= np.sin(np.linspace(0, math.pi / 2, lead, endpoint=False)) ** 2
    y[-tail:] *= np.cos(np.linspace(0, math.pi / 2, tail)) ** 2
    return y, (last - first + 1) / RATE


def pauses(y: np.ndarray):
    """The pauses inside a line as (start, length) in samples: quiet runs of at least PAUSE_FLOOR_S."""
    hop = RATE // 100
    n = len(y) // hop
    rms = 20 * np.log10(np.sqrt((y[:n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-12)
    quiet = np.concatenate([[False], rms < PAUSE_DB, [False]])
    edges = np.flatnonzero(np.diff(quiet.astype(int)))
    runs = [(a * hop, (b - a) * hop) for a, b in zip(edges[::2], edges[1::2])]
    inner = int((LEAD_S + 0.05) * RATE), len(y) - int((TAIL_S + 0.05) * RATE)
    return [(a, n_) for a, n_ in runs if a > inner[0] and a + n_ < inner[1] and n_ >= PAUSE_FLOOR_S * RATE]


def tighten(y: np.ndarray, cut_s: float):
    """Shortens the longest pauses (never below PAUSE_FLOOR_S) by cut_s in all, from their quiet middles with a
    10 ms crossfade, so the words and their natural ends are untouched. None if the pauses are too short."""
    found = sorted(pauses(y), key=lambda r: -r[1])
    spare = [n_ - int(PAUSE_FLOOR_S * RATE) for _, n_ in found]
    need = int(math.ceil(cut_s * RATE))
    if need <= 0 or sum(spare) < need:
        return None
    cuts, left = [], need
    for (a, n_), room in zip(found, spare):
        c = min(room, left)
        if c > 0:
            cuts.append((a + (n_ - c) // 2, c))
            left -= c
    fade = RATE // 100
    for at, c in sorted(cuts, reverse=True):
        ramp = np.linspace(0, 1, fade)
        joined = y[at - fade:at] * (1 - ramp) + y[at + c - fade:at + c] * ramp
        y = np.concatenate([y[:at - fade], joined, y[at + c:]])
    return y, [round(c / RATE, 3) for _, c in cuts]


# ---------------------------------------------------------------- checks
def fit(line, seconds):
    frames = math.ceil(seconds * FPS)
    end = line['start'] + frames - 1
    limit = min(line['by'], WORKER_GREY_FRAME) if line['who'] == 'worker' else line['by']
    return frames, end, limit - end


def mix_view(path: Path, line, chains):
    """What the mix will make of this file: its own trim (and the phone band for W1) at 48 kHz. Returns the
    frames it will count, and the peak the line will have once the mix has matched it to -18 LUFS (the mix's
    intermediate files are 16 bit, so this must stay under 0 dBFS)."""
    trim_chain, phone = chains
    chain = ','.join([phone if line['who'] == 'worker' else 'anull', trim_chain, 'aresample=48000'])
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path), '-af', chain, '-ac', '1', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    y = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    return math.ceil(len(y) / 48000 * FPS), round(peak_db(y) - loudness(y, 48000) + LUFS_TARGET, 2)


def words_of(text: str):
    return re.sub(r'[^a-z0-9 ]+', ' ', text.lower().replace('’', '').replace("'", '').replace('-', ' ')).split()


def compare(text: str, transcript: str):
    want, got = words_of(text), words_of(transcript)
    diffs = []
    for op, a0, a1, b0, b1 in difflib.SequenceMatcher(a=want, b=got, autojunk=False).get_opcodes():
        if op != 'equal':
            diffs.append(f"{op}: '{' '.join(want[a0:a1])}' -> '{' '.join(got[b0:b1])}'")
    return diffs


class Recogniser:
    def __init__(self, path: Path):
        spec = importlib.util.spec_from_file_location('asr', path)
        self.asr = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.asr)

    def __call__(self, path: Path):
        r = self.asr.transcribe(str(path))
        # the recogniser's own confidence, to break ties between equally exact takes
        s = self.asr.recognizer().create_stream()
        s.accept_waveform(16000, self.asr.load(str(path)))
        self.asr.recognizer().decode_stream(s)
        probs = list(s.result.ys_log_probs)
        r['confidence'] = float(np.mean(probs)) if probs else float('-inf')
        return r


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--model', default=os.environ.get('KOKORO_MODEL'), help='kokoro-v1.0.onnx (or KOKORO_MODEL)')
    ap.add_argument('--voices', default=os.environ.get('KOKORO_VOICES'), help='voices-v1.0.bin (or KOKORO_VOICES)')
    ap.add_argument('--asr', default=os.environ.get('PRIORA_ASR'), help='the Parakeet recogniser script asr.py (or PRIORA_ASR)')
    ap.add_argument('--timeline', default=str(ROOT / 'src/lib/timeline.ts'))
    ap.add_argument('--mixer', default=str(ROOT / 'scripts/mix-audio.ts'))
    ap.add_argument('--out', default=str(ROOT / 'audio sources/voice'))
    args = ap.parse_args()
    for name in ('model', 'voices', 'asr'):
        if not getattr(args, name) or not Path(getattr(args, name)).exists():
            sys.exit(f'--{name} is missing or does not exist (see --help)')

    from kokoro_onnx import Kokoro
    kokoro = Kokoro(args.model, args.voices)
    g2p = Phonemizer()
    hear = Recogniser(Path(args.asr))
    chains = read_mix_chains(Path(args.mixer))
    lines = read_voice_table(Path(args.timeline))
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    scratch = out / '.takes'
    scratch.mkdir(exist_ok=True)

    def take(line, voice, speed, phonemes, tight=False):
        raw, sr = kokoro.create(phonemes, voice=voice, speed=speed, is_phonemes=True, trim=False)
        assert sr == RATE
        audio, seconds = trim(level(raw.astype(np.float64), WORKER_CEILING_DB if line['who'] == 'worker' else PEAK_CEILING_DB))
        cuts = []
        frames, end, slack = fit(line, seconds)
        if tight and slack < 0:
            # just enough off the pauses for the line to end on its `by` frame
            done = tighten(audio, seconds - (frames + slack) / FPS + 0.001)
            if done:
                audio, cuts = done
                audio, seconds = trim(audio)
                frames, end, slack = fit(line, seconds)
        return {'audio': audio, 'voice': voice, 'speed': speed, 'seconds': seconds, 'frames': frames, 'end': end, 'slack': slack, 'pauseCuts': cuts}

    def first_fitting(line, voice, speeds, phonemes):
        # the speed first (the smallest that fits); only if none does, the pauses are tightened as well
        for tight in (False, True):
            for speed in speeds:
                t = take(line, voice, speed, phonemes, tight)
                if t['slack'] >= 0:
                    return t, True
        return t, False

    report = []
    for line in lines:
        phonemes = g2p(line['text'])
        candidates = []
        if line['who'] == 'worker':
            takes = []
            for voice in WORKER['voices']:
                t, ok = first_fitting(line, voice, WORKER['speeds'], phonemes)
                path = scratch / f"{line['id']} {voice}.flac"
                sf.write(path, t['audio'], RATE, subtype='PCM_24')
                heard = hear(path)
                t.update(fits=ok, heard=heard, diffs=compare(line['text'], heard['text']))
                takes.append(t)
                candidates.append({'voice': voice, 'speed': t['speed'], 'frames': t['frames'], 'endFrame': t['end'], 'fits': ok,
                                   'transcript': heard['text'], 'differences': t['diffs'], 'confidence': round(heard['confidence'], 5)})
            best = min(takes, key=lambda t: (not t['fits'], len(t['diffs']), -t['heard']['confidence']))
        else:
            best, ok = first_fitting(line, NARRATOR['voice'], NARRATOR['speeds'], phonemes)
            best['fits'] = ok
        path = out / f"{line['id']}.flac"
        sf.write(path, best['audio'], RATE, subtype='PCM_24')
        heard = hear(path)
        diffs = compare(line['text'], heard['text'])
        mixed, matched_peak = mix_view(path, line, chains)
        audio = best['audio']
        entry = {
            'id': line['id'], 'who': line['who'], 'voice': best['voice'], 'speed': best['speed'], 'text': line['text'], 'phonemes': phonemes,
            'seconds': round(best['seconds'], 3), 'fileSeconds': round(len(audio) / RATE, 3), 'frames': best['frames'],
            'startFrame': line['start'], 'endFrame': best['end'], 'by': line['by'], 'slack': best['slack'], 'fits': best['fits'], 'pauseCuts': best['pauseCuts'],
            'mixFrames': mixed, 'mixEndFrame': line['start'] + mixed - 1, 'mixSlack': line['by'] - (line['start'] + mixed - 1), 'mixMatchedPeak': matched_peak,
            'loudness': round(loudness(audio, RATE), 2), 'peak': round(peak_db(audio), 2),
            'transcript': heard['text'], 'matches': not diffs, 'differences': diffs, 'confidence': round(heard['confidence'], 5),
            'words': [{'w': w['w'], 'start': round(w['start'], 3), 'end': round(w['end'], 3)} for w in heard['words']],
        }
        if line['who'] == 'worker':
            entry['limit'] = WORKER_GREY_FRAME
            entry['candidates'] = candidates
        report.append(entry)
        print(f"{entry['id']:5s} {entry['voice']:10s} {entry['speed']:.2f}  {entry['frames']:4d} fr  F{entry['endFrame']:04d} by F{entry['by']:04d}"
              f"  slack {entry['slack']:+d}  (mix {entry['mixFrames']} fr, {entry['mixSlack']:+d}, peak {entry['mixMatchedPeak']:+.1f})  {'match' if entry['matches'] else 'DIFF ' + '; '.join(diffs)}", flush=True)

    for f in scratch.iterdir():
        f.unlink()
    scratch.rmdir()
    meta = {
        'generator': 'scripts/audio/make-voice.py', 'tts': 'Kokoro-82M v1.0 (Apache-2.0) via kokoro-onnx, espeak-ng phonemes in the misaki US set',
        'recogniser': 'NVIDIA Parakeet TDT 0.6b v2 (CC-BY-4.0) via sherpa-onnx', 'sampleRate': RATE, 'fps': FPS,
        'fitRule': 'frames = ceil(seconds above -48 dBFS * 30); end = start + frames - 1 <= by (W1 also <= F0483)',
        'file': f'first audible sound at {int(LEAD_S * 1000)} ms, about {int(TAIL_S * 1000)} ms of fading silence after the last; {LUFS_TARGET:g} LUFS, 4x oversampled peaks under {PEAK_CEILING_DB:g} dBFS (W1 {WORKER_CEILING_DB:g})',
        'lexicon': LEXICON,
    }
    (out / 'lines.json').write_text(json.dumps({**meta, 'lines': report}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    bad = [e['id'] for e in report if not e['fits'] or not e['matches']]
    print(f"wrote {len(report)} lines and lines.json to {out}" + (f"; check: {', '.join(bad)}" if bad else '; every line fits and matches its text'))


if __name__ == '__main__':
    main()
