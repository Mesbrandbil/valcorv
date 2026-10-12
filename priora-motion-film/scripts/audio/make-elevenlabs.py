#!/usr/bin/env python3
"""Generates the film's soundtrack with ElevenLabs: the 18 narration lines, the sound effects and the music bed,
into "audio sources/elevenlabs", where `AUDIO_SOURCES="audio sources/elevenlabs" npm run mix` picks them up.

Voice (Text to Speech, with timestamps), as "narration script.md" specifies:
  - narrator George, worker Liam (each found by name in the account's voices, else the default library ids),
    model Eleven Multilingual v2, stability 0.55, similarity 0.75, style 0.15, speaker boost on, speed 0.95 for
    the narrator and 1.05 for the worker; each line knows the line before and after it (previous_text and
    next_text), so the delivery runs on naturally;
  - the words, beats and `by` frames come from VOICE in src/lib/timeline.ts. Each line is taken with a few seeds
    in turn, and the first take is kept that fits its window as the mix will measure it (the worker's by F0483,
    where its words grey out) and that the recogniser hears exactly as written. If none does, the take that
    fits best is kept and the shortfall is reported;
  - each kept line's word timings come from ElevenLabs' own character alignment, written to
    voice/lines.json, so the worker's words on screen and the subtitles follow the real recording.
Effects (Sound Effects): one short sound per kind in CUES of scripts/mix-audio.ts, trimmed to its onset, faded
  to silence and levelled; the welding as a loop. The five agents' notes and the five summons' threads are the
  note and the thread pitched to an ascending run in the music's key (sampler style).
Music (Music): one instrumental bed, its sections composed to the bar form of "narration script.md", then
  brought to exactly 90 BPM with a downbeat at 0 s, so the bar lines fall where the film expects them.

Every request is cached by its content under takes/ (the audio and the JSON reply), so running this again
never spends credits on what already exists. --dry-run shows what would be requested, and how many characters
and seconds, without calling ElevenLabs.

Usage (from priora-motion-film, with ELEVENLABS_API_KEY set and a Python with numpy, scipy and soundfile; the
recogniser check also needs sherpa-onnx and its model, see scripts/audio/setup-tools.sh):
  python -I scripts/audio/make-elevenlabs.py [--only voice,effects,music] [--dry-run] [--no-asr]
"""
import argparse
import base64
import hashlib
import importlib.util
import json
import math
import os
import re
import shutil
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import stft

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get('ELEVENLABS_OUT') or ROOT / 'audio sources' / 'elevenlabs')
TAKES = OUT / 'takes'
API = os.environ.get('ELEVENLABS_API_BASE') or 'https://api.elevenlabs.io'
FPS = 30
RATE = 48000

# ---------------------------------------------------------------- the voices ("narration script.md")
MODEL = 'eleven_multilingual_v2'
SETTINGS = {'stability': 0.55, 'similarity_boost': 0.75, 'style': 0.15, 'use_speaker_boost': True}
# the default library's ids, used only if the account's voice list does not name them
VOICES = {
    'narrator': {'name': 'George', 'id': 'JBFqnCBsd6RMkjVDRZzb', 'speed': 0.95},
    'worker': {'name': 'Liam', 'id': 'TX3LPaxmHKxFdv7VOQHJ', 'speed': 1.05},
}
SEEDS = [11, 23, 37, 41, 53]  # takes, in order, until one fits and is heard exactly
FORMATS = ['mp3_44100_192', 'mp3_44100_128']  # the best the plan allows

# ---------------------------------------------------------------- the effects (CUES in scripts/mix-audio.ts)
EFFECTS = {
    'paper': ('A single soft paper contact: a sheet of thick paper laid gently down on a wooden desk. Close, dry, quiet, very short.', 0.6),
    'tick': ('One dry, soft wooden tick: a small wooden block tapped once, lightly. Close, very short, no reverb.', 0.5),
    'thread': ('A single fine plucked thread: one delicate high string plucked once, soft, with a short natural decay. No reverb.', 1.0),
    'felt': ('A muted felt landing: a small soft felt pad dropped onto a wooden table. Low, soft and short, no click.', 0.6),
    'card': ('A soft card landing on paper: a stiff card dropped flat onto a sheet of paper. Light, close, short.', 0.6),
    'weld': ('Faint arc welding crackle heard from across a quiet factory hall: a steady, soft sizzle with small crackles. Even, continuous, no hum, no voices.', 4.0),
    'tone': ('A soft, clear bell-like tone: one gentle chime struck once, warm and pure, with a long, smooth decay.', 2.5),
    'wood': ('One low wooden note: a deep marimba bar struck softly with a felt mallet, warm, with a natural decay.', 1.6),
    'note': ('One delicate high celesta note, soft and glassy, struck once, with a short natural decay.', 1.0),
}
LOOP = {'weld'}
# the pitched sounds are tuned to the nearest note of the music's pentatonic scale (D E F# A B in D major), so they
# keep their own register; the five agents' notes and the five summons' threads climb that scale from there
PITCHED = {'note', 'thread', 'tone', 'wood'}
RUNS = {'note', 'thread'}
PENTATONIC = [0, 2, 4, 7, 9]  # from the tonic

# ---------------------------------------------------------------- the music (the bar form, one bar = 2.6667 s)
BAR_MS = 8000 / 3
MUSIC_SECTIONS = [
    ('Opening', 8, ['almost empty', 'a soft low warm pad', 'a few single felt piano notes', 'very quiet', 'spacious']),
    ('Pattern', 8, ['a gentle repeating felt piano pattern begins', 'soft muted mallets', 'calm', 'restrained', 'steady pulse']),
    ('Warm chord', 2, ['the music opens into one warm sustained chord', 'the fullest moment', 'still soft', 'gentle swell']),
    ('Unresolved', 13, ['thinner', 'a small unresolved space', 'suspended chords that do not resolve', 'the pattern returns lightly', 'quiet']),
    ('Settle', 2, ['the unresolved interval settles', 'calm', 'soft']),
    # a section runs at least 3 s, so the last bar's decay is part of the resolution
    ('Resolution', 4, ['a soft resolution on the home chord', 'thinning out', 'gentle', 'the last chord decays away to near silence']),
]
MUSIC_GLOBAL = ['calm intimate instrumental underscore for a thoughtful product film', '90 BPM', '4/4', 'D major', 'felt piano',
                'soft muted mallets', 'low warm pad', 'a dry wooden tick on some beats', 'sparse', 'restrained', 'warm small room']
MUSIC_NEGATIVE = ['drums', 'drum kit', 'vocals', 'singing', 'build-ups', 'big drops', 'risers', 'bright synth leads', 'distortion', 'loud']
MUSIC_PROMPT = ('Calm, intimate instrumental at 90 BPM, 4/4, in D major, for a thoughtful product film. Felt piano and soft muted mallets over a '
                'low warm pad, with a dry wooden tick on some beats. Sparse and restrained; no drums, no vocals, no build-ups, no big drops. It opens '
                'almost empty for about 21 seconds, settles into a gentle repeating pattern, at about 43 seconds warms into one sustained chord, '
                'from about 48 seconds thins to leave a small unresolved space, settles at about 83 seconds, resolves softly from about 88 seconds '
                'and ends nearly silent at about 96 seconds.')


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# the fit rule, the mix's own trim and telephone chains, and the text comparison, shared with make-voice.py
MV = load_module('make_voice', ROOT / 'scripts/audio/make-voice.py')


# ---------------------------------------------------------------- the API
class ElevenLabs:
    def __init__(self, dry_run=False):
        self.key = os.environ.get('ELEVENLABS_API_KEY', '')
        self.dry = dry_run
        if not self.key and not dry_run:
            sys.exit('ELEVENLABS_API_KEY is not set')
        ca = os.environ.get('SSL_CERT_FILE') or os.environ.get('REQUESTS_CA_BUNDLE')
        if not ca and Path('/root/.ccr/ca-bundle.crt').exists():
            ca = '/root/.ccr/ca-bundle.crt'
        self.ctx = ssl.create_default_context(cafile=ca) if ca else ssl.create_default_context()
        self.spent = {'tts_characters': 0, 'effects_seconds': 0.0, 'music_seconds': 0.0, 'requests': 0}

    def call(self, method, path, body=None, want_json=True):
        req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                     headers={'xi-api-key': self.key, 'Content-Type': 'application/json', 'Accept': '*/*'})
        try:
            with urllib.request.urlopen(req, context=self.ctx, timeout=600) as r:
                data = r.read()
        except urllib.error.HTTPError as e:
            detail = e.read().decode('utf-8', 'replace')[:800]
            raise RuntimeError(f'ElevenLabs {method} {path.split("?")[0]} answered {e.code}: {detail}') from None
        self.spent['requests'] += 1
        return json.loads(data) if want_json else data

    def cached(self, kind, path, body, ext, want_json):
        """One request, cached by its content: returns (reply, cache file)."""
        digest = hashlib.sha1(json.dumps([path, body], sort_keys=True).encode()).hexdigest()[:12]
        f = TAKES / kind / f'{digest}.{ext}'
        self.fresh = False
        if f.exists():
            return (json.loads(f.read_text()) if want_json else f.read_bytes()), f
        if self.dry:
            self.fresh = True
            return None, f
        f.parent.mkdir(parents=True, exist_ok=True)
        reply = self.call('POST', path, body, want_json)
        f.write_text(json.dumps(reply)) if want_json else f.write_bytes(reply)
        self.fresh = True
        return reply, f

    def first_format(self, kind, make_path, body, ext, want_json):
        last = None
        for fmt in FORMATS:
            try:
                return self.cached(kind, make_path(fmt), body, ext, want_json)
            except RuntimeError as e:
                last = e
                msg = str(e)
                # only a format the plan does not allow is worth another try with the next format
                if 'format' not in msg.lower():
                    raise
        raise last

    def voice_ids(self):
        if self.dry:
            return {k: v['id'] for k, v in VOICES.items()}
        found = {}
        try:
            voices = self.call('GET', '/v1/voices')['voices']
        except RuntimeError as e:
            print(f'could not list voices ({e}); using the default library ids')
            voices = []
        for who, v in VOICES.items():
            match = [x for x in voices if x.get('name', '').split(' ')[0].lower() == v['name'].lower()]
            found[who] = match[0]['voice_id'] if match else v['id']
            print(f"{who}: {v['name']} ({found[who]}){'' if match else ' from the default library'}")
        return found


# ---------------------------------------------------------------- audio helpers
def run(args):
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', *args], check=True)


def read(path, rate=RATE, channels=2):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path), '-ac', str(channels), '-ar', str(rate), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).astype(np.float64)


def write(path, x, rate=RATE):
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), x, rate, subtype='PCM_24')


def onset_trim(x, rel_db=-40.0, tail_db=-60.0, fade_s=0.01):
    """From the sound's onset to its decay into silence, faded at both ends."""
    mono = np.abs(x).max(axis=1)
    peak = mono.max() or 1.0
    above = np.flatnonzero(mono > peak * 10 ** (rel_db / 20))
    tail = np.flatnonzero(mono > peak * 10 ** (tail_db / 20))
    a = max(0, above[0] - int(0.002 * RATE)) if above.size else 0
    b = min(len(x), tail[-1] + int(0.02 * RATE)) if tail.size else len(x)
    y = x[a:b].copy()
    n = min(int(fade_s * RATE), len(y) // 4)
    y[:int(0.001 * RATE)] *= np.linspace(0, 1, int(0.001 * RATE))[:, None]
    y[-n:] *= np.linspace(1, 0, n)[:, None] ** 2
    return y


def level(x, peak_db=-3.0):
    return x * (10 ** (peak_db / 20) / (np.abs(x).max() or 1.0))


def f0_of(x):
    """The fundamental of a pitched sound's first 0.3 s (harmonic product spectrum), or None."""
    m = x.mean(axis=1)[: int(0.3 * RATE)]
    if len(m) < 2048:
        return None
    spec = np.abs(np.fft.rfft(m * np.hanning(len(m)), n=1 << 16))
    freqs = np.fft.rfftfreq(1 << 16, 1 / RATE)
    hps = spec.copy()
    for h in (2, 3):
        dec = spec[::h]
        hps[:len(dec)] *= dec
    lo, hi = np.searchsorted(freqs, 60), np.searchsorted(freqs, 4000)
    k = lo + int(np.argmax(hps[lo:hi]))
    clear = hps[k] / (np.median(hps[lo:hi]) + 1e-20)
    return float(freqs[k]) if clear > 1e3 else None


def shift(x, semitones):
    """Sampler-style pitch shift (pitch and length together, as a struck sound would)."""
    if abs(semitones) < 0.02:
        return x
    r = 2 ** (semitones / 12)
    n = int(len(x) / r)
    t = np.arange(n) * r
    return np.stack([np.interp(t, np.arange(len(x)), x[:, c]) for c in range(x.shape[1])], axis=1)


def music_key_offset(path):
    """Semitones from D to the music's own major key (a minor key counts as its relative major)."""
    if not path.exists():
        return 0
    x = read(path, 22050, 1)[:, 0]
    f, _, z = stft(x, 22050, nperseg=4096)
    mag = np.abs(z).mean(axis=1)
    chroma = np.zeros(12)
    for fi, m in zip(f, mag):
        if 55 <= fi <= 2000:
            chroma[int(round(12 * math.log2(fi / 261.6256))) % 12] += m
    major = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    scores = [(np.corrcoef(np.roll(p, t), chroma)[0, 1], t, mode) for t in range(12) for p, mode in ((major, 'major'), (minor, 'minor'))]
    best = max(scores)
    d_major = next(c for c, t, mode in scores if t == 2 and mode == 'major')
    if best[0] - d_major < 0.1:  # a piece that sits on its dominant can read as that key; D major unless clearly not
        print(f'music key: D major as asked (best fit {"C C# D D# E F F# G G# A A# B".split()[best[1]]} {best[2]} by only {best[0] - d_major:.2f})')
        return 0
    tonic = best[1] if best[2] == 'major' else (best[1] + 3) % 12
    offset = ((tonic - 2 + 6) % 12) - 6  # from D (pitch class 2), within a tritone
    names = 'C C# D D# E F F# G G# A A# B'.split()
    print(f"music key: {names[best[1]]} {best[2]} (correlation {best[0]:.2f}); tonal effects move {offset:+d} semitones from D major")
    return offset


# ---------------------------------------------------------------- voice
def words_from_alignment(text, alignment):
    """Each space-separated word of the text with its start and end seconds, from ElevenLabs' character alignment."""
    chars = alignment['characters']
    starts = alignment['character_start_times_seconds']
    ends = alignment['character_end_times_seconds']
    words, cur = [], None
    for c, s, e in zip(chars, starts, ends):
        if c.isspace():
            if cur:
                words.append(cur)
            cur = None
            continue
        if cur is None:
            cur = {'w': '', 'start': s, 'end': e}
        cur['w'] += c
        cur['end'] = e
    if cur:
        words.append(cur)
    want = text.split(' ')
    if len(words) != len(want):
        print(f'  alignment gave {len(words)} words for {len(want)}; word timings are left out for this line')
        return []
    for w, t in zip(words, want):
        w['w'] = t
    return words


def make_voice(el, use_asr):
    lines = MV.read_voice_table(ROOT / 'src/lib/timeline.ts')
    chains = MV.read_mix_chains(ROOT / 'scripts/mix-audio.ts')
    asr = None
    if use_asr:
        try:
            asr = MV.Recogniser(ROOT / 'scripts/audio/check/asr.py')
        except Exception as e:  # sherpa-onnx or its model missing
            print(f'recogniser unavailable ({e}); takes are chosen on fit alone')
    ids = el.voice_ids()
    report = []
    chars = sum(len(l['text']) for l in lines)
    print(f'voice: {len(lines)} lines, {chars} characters a take, up to {len(SEEDS)} takes each')
    for i, line in enumerate(lines):
        who = 'worker' if line['who'] == 'worker' else 'narrator'
        v = VOICES[who]
        prev = lines[i - 1]['text'] if i > 0 else None
        nxt = lines[i + 1]['text'] if i + 1 < len(lines) else None
        tried = []
        for seed in SEEDS:
            body = {'text': line['text'], 'model_id': MODEL, 'seed': seed, 'voice_settings': {**SETTINGS, 'speed': v['speed']}}
            if prev:
                body['previous_text'] = prev
            if nxt:
                body['next_text'] = nxt
            reply, cache = el.first_format('voice', lambda fmt: f"/v1/text-to-speech/{ids[who]}/with-timestamps?output_format={fmt}", body, 'json', True)
            if el.fresh:
                el.spent['tts_characters'] += len(line['text'])
            if reply is None:  # dry run
                break
            if not cache.with_suffix('.mp3').exists():
                cache.with_suffix('.mp3').write_bytes(base64.b64decode(reply['audio_base64']))
            mp3 = cache.with_suffix('.mp3')
            frames, peak = MV.mix_view(mp3, line, chains)
            limit = min(line['by'], MV.WORKER_GREY_FRAME) if who == 'worker' else line['by']
            end = line['start'] + frames - 1
            heard = asr(mp3) if asr else {'text': '', 'confidence': 0.0}
            diffs = [d for d in MV.compare(line['text'], heard['text'])] if asr else []
            # the recogniser has no word for the brand and may spell it Pryora or Priyora: that is the name, heard
            diffs = [d for d in diffs if not re.fullmatch(r"replace: 'priora' -> 'pr\w*ora'", d)]
            take = {'seed': seed, 'file': mp3, 'reply': reply, 'frames': frames, 'end': end, 'slack': limit - end, 'peak': peak,
                    'transcript': heard['text'], 'differences': diffs, 'confidence': heard.get('confidence', 0.0)}
            tried.append(take)
            if take['slack'] >= 0 and not diffs:
                break
        if not tried:
            report.append({'id': line['id'], 'planned': True})
            continue
        ok = [t for t in tried if t['slack'] >= 0 and not t['differences']]
        best = ok[0] if ok else max(tried, key=lambda t: (t['slack'] >= 0, -len(t['differences']), t['slack']))
        dest = OUT / 'voice' / f"{line['id']}.mp3"
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(best['file'], dest)
        words = words_from_alignment(line['text'], best['reply']['alignment'])
        status = 'fits, heard exactly' if ok else ('FITS, but heard: ' + '; '.join(best['differences']) if best['slack'] >= 0 else f"RUNS {-best['slack']} FRAMES PAST F{limit}")
        print(f"{line['id']:5} {v['name']:6} seed {best['seed']:<3} {best['frames']:4} fr  F{line['start']:04d}-F{best['end']:04d} by F{limit:04d}  {status}  ({len(tried)} take(s))")
        report.append({
            'id': line['id'], 'who': who, 'voice': v['name'], 'voiceId': ids[who], 'model': MODEL, 'settings': {**SETTINGS, 'speed': v['speed']},
            'seed': best['seed'], 'text': line['text'], 'startFrame': line['start'], 'by': line['by'], 'mixFrames': best['frames'],
            'mixEndFrame': best['end'], 'slack': best['slack'], 'fits': best['slack'] >= 0, 'transcript': best['transcript'],
            'differences': best['differences'], 'matches': not best['differences'], 'takes': len(tried), 'words': words,
        })
    if all('planned' not in r for r in report):
        (OUT / 'voice' / 'lines.json').write_text(json.dumps({
            'generator': 'scripts/audio/make-elevenlabs.py', 'tts': f'ElevenLabs {MODEL}', 'fps': FPS,
            'words': "ElevenLabs' character alignment, seconds from each file's start", 'lines': report}, indent=1, ensure_ascii=False))
    return report


# ---------------------------------------------------------------- effects
def make_effects(el, key_offset):
    print(f'effects: {len(EFFECTS)} sounds, {sum(d for _, d in EFFECTS.values()):.1f} s in all')
    made = {}
    for kind, (prompt, dur) in EFFECTS.items():
        body = {'text': prompt, 'duration_seconds': dur, 'prompt_influence': 0.6}
        if kind in LOOP:
            body['loop'] = True
            body['model_id'] = 'eleven_text_to_sound_v2'
        try:
            data, cache = el.first_format('effects', lambda fmt: f'/v1/sound-generation?output_format={fmt}', body, 'mp3', False)
        except RuntimeError as e:
            if kind in LOOP and ('loop' in str(e) or 'model' in str(e)):
                body = {'text': prompt, 'duration_seconds': dur, 'prompt_influence': 0.6}
                data, cache = el.first_format('effects', lambda fmt: f'/v1/sound-generation?output_format={fmt}', body, 'mp3', False)
            else:
                raise
        if el.fresh:
            el.spent['effects_seconds'] += dur
        if data is None:
            continue
        x = read(cache)
        if kind in LOOP:
            # a loop keeps its whole length; a short crossfade of its ends hides any seam
            n = int(0.05 * RATE)
            x = x[:len(x) - n].copy()
            x[:n] = x[:n] * np.linspace(0, 1, n)[:, None] + read(cache)[-n:] * np.linspace(1, 0, n)[:, None]
            y = level(x, -3.0)
        else:
            y = level(onset_trim(x), -3.0)
        made[kind] = y
    if not made:
        return
    out = OUT / 'effects'
    tonic = 2 + key_offset  # pitch class of the key's tonic (D = 2)
    scale = sorted((tonic + d) % 12 for d in PENTATONIC)
    for kind, y in made.items():
        if kind in PITCHED:
            f = f0_of(y)
            if f:
                now = 12 * math.log2(f / 261.6256)  # semitones from C4
                cands = [o * 12 + pc for o in range(-4, 5) for pc in scale]
                target = min(cands, key=lambda c: abs(c - now))
                y = shift(y, target - now)
                print(f"  {kind:6} {f:.1f} Hz, tuned {target - now:+.2f} semitones to the scale")
            else:
                target = None
                print(f'  {kind:6} no clear pitch; left as made')
            if kind in RUNS and target is not None:
                above = sorted(c for c in (o * 12 + pc for o in range(-4, 6) for pc in scale) if c >= target)[:5]
                for i, c in enumerate(above, 1):
                    write(out / f'{kind} {i}.flac', level(shift(y, c - target), -3.0))
            elif kind in RUNS:
                for i, st in enumerate(PENTATONIC, 1):
                    write(out / f'{kind} {i}.flac', level(shift(y, st), -3.0))
        write(out / f'{kind}.flac', level(y, -3.0))
    print(f'  wrote {len(list(out.glob("*.flac")))} effect files')


# ---------------------------------------------------------------- music
def onset_envelope(x, hop=256):
    m = x.mean(axis=1)
    _, _, z = stft(m, RATE, nperseg=2048, noverlap=2048 - hop)
    mag = np.log1p(np.abs(z))
    flux = np.maximum(0, np.diff(mag, axis=1)).sum(axis=0)
    env = np.maximum(flux - np.convolve(flux, np.ones(32) / 32, mode='same'), 0)
    return env / (env.max() or 1.0), RATE / hop


def tempo_and_downbeat(x):
    """The music's tempo (BPM, to a hundredth) and its first downbeat (s).

    The tempo is the beat period whose comb of beats, at its best phase, gathers the most onset energy over the
    whole piece (searched from 80 to 100 BPM in 0.01 BPM steps, so the drift over the film stays under a
    frame). The downbeat is the beat at the music's first strong onset: generated music opens on a downbeat."""
    env, fr = onset_envelope(x)
    n = len(env)
    idx = np.arange(n)
    best = (-1.0, 90.0, 0.0)
    for bpm in np.arange(80.0, 100.0, 0.01):
        p = fr * 60 / bpm
        k = np.arange(int((n - 1) / p))
        phases = np.linspace(0, p, 48, endpoint=False)
        pos = phases[:, None] + k[None, :] * p
        score = np.interp(pos, idx, env).sum(axis=1) / len(k)
        j = int(np.argmax(score))
        if score[j] > best[0]:
            best = (float(score[j]), float(bpm), float(phases[j]))
    _, bpm, phase = best
    p = fr * 60 / bpm
    first = int(np.flatnonzero(env > 0.3)[0]) if (env > 0.3).any() else 0
    beat = phase + round((first - phase) / p) * p
    if beat < 0:
        beat += p
    return bpm, beat / fr


def make_music(el):
    sections = [{'section_name': n, 'positive_local_styles': s, 'negative_local_styles': [], 'duration_ms': int(round(b * BAR_MS)), 'lines': []}
                for n, b, s in MUSIC_SECTIONS]
    total = sum(s['duration_ms'] for s in sections)
    print(f'music: {total / 1000:.1f} s in {len(sections)} sections')
    # a composition plan and a prompt are mutually exclusive; the plan's sections set the length
    plan = {'composition_plan': {'positive_global_styles': MUSIC_GLOBAL, 'negative_global_styles': MUSIC_NEGATIVE, 'sections': sections}}
    try:
        data, cache = el.first_format('music', lambda fmt: f'/v1/music?output_format={fmt}', plan, 'mp3', False)
    except RuntimeError as e:
        print(f'  the composition plan was refused ({str(e)[:200]}); asking with the prompt instead')
        body = {'prompt': MUSIC_PROMPT + ' Instrumental only.', 'music_length_ms': total}
        data, cache = el.first_format('music', lambda fmt: f'/v1/music?output_format={fmt}', body, 'mp3', False)
    if el.fresh:
        el.spent['music_seconds'] += total / 1000
    if data is None:
        return
    x = read(cache)
    tempo, down = tempo_and_downbeat(x)
    print(f'  as generated: {tempo:.2f} BPM, first downbeat at {down:.3f} s, {len(x) / RATE:.1f} s long')
    stretched = TAKES / 'music' / 'stretched.wav'
    # atempo above 1 speeds the music up: from its own tempo to exactly 90 BPM
    ratio = 90 / tempo if 80 <= tempo <= 100 else 1.0
    run(['-i', str(cache), '-af', f'atempo={ratio:.6f},aresample={RATE}', '-ac', '2', '-c:a', 'pcm_s24le', str(stretched)])
    y = read(stretched)
    tempo2, down2 = tempo_and_downbeat(y)
    y = y[int(down2 * RATE):]
    print(f'  brought to {tempo2:.2f} BPM (atempo {ratio:.4f}), started on its downbeat ({down2:.3f} s trimmed), {len(y) / RATE:.1f} s left')
    if len(y) / RATE < 96.1:
        print('  shorter than the film: the mix pads the end with silence')
    write(OUT / 'music.flac', level(y, -3.0))
    (OUT / 'music.json').write_text(json.dumps({'request': plan, 'generated_bpm': tempo, 'atempo': ratio, 'bpm': tempo2, 'downbeat_trim_s': down2}, indent=1))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--only', default='voice,effects,music')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--no-asr', action='store_true')
    args = ap.parse_args()
    parts = set(args.only.split(','))
    el = ElevenLabs(args.dry_run)
    OUT.mkdir(parents=True, exist_ok=True)
    if 'voice' in parts:
        make_voice(el, not args.no_asr)
    if 'music' in parts:
        try:
            make_music(el)
        except RuntimeError as e:
            # the Music API is not on every plan: fall back to the bed composed for the film, and say so
            print(f'MUSIC NOT MADE WITH ELEVENLABS: {e}')
            fallback = ROOT / 'audio sources' / 'music.flac'
            shutil.copyfile(fallback, OUT / 'music.flac')
            (OUT / 'music.json').write_text(json.dumps({'source': 'audio sources/music.flac (composed for the film)', 'reason': str(e)}, indent=1))
            print('  using the composed bed (audio sources/music.flac) instead')
    if 'effects' in parts:
        make_effects(el, music_key_offset(OUT / 'music.flac'))
    s = el.spent
    print(f"{'would request' if args.dry_run else 'requested'}: {s['tts_characters']} characters of speech, {s['effects_seconds']:.1f} s of effects, "
          f"{s['music_seconds']:.1f} s of music ({s['requests']} calls; cached requests cost nothing)")


if __name__ == '__main__':
    main()
