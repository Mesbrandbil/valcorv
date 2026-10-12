#!/usr/bin/env python3
"""Turns the ElevenLabs takes downloaded from invideo into the mix's sources in "audio sources/elevenlabs".

The takes were generated through the invideo connector (project "Priora film soundtrack"), which runs the
ElevenLabs models server side, and downloaded as they came into "audio sources/elevenlabs/downloads":
  <id> take<n>.mp3            the 18 lines: Eleven Multilingual v2, narrator George at speed 1.0 and the
                              worker Liam at 1.1 (stability 0.5 / 0.4, similarity 0.8, style 0.1 / 0.2,
                              speaker boost, seed 11), 44.1 kHz mono
  effects/<kind> take<n>.mp3  the nine effects (ElevenLabs Sound Effects, 3 s each; the welding a 4 s loop)
  music take<n>.mp3           the bed (Mureka 9 Instrumental: invideo's credits did not cover a full-length
                              ElevenLabs Music piece)
TAKES below names the take kept for each. This writes:
  voice/<id>.flac   each line matched to -18 LUFS with its rare peaks held under -1.5 dBFS (the worker's
                    under -4.5, before the telephone band) by the same look-ahead limiter as make-voice.py,
                    trimmed at -48 dBFS, 44.1 kHz 24 bit; and voice/lines.json: per line the fit as the mix
                    will measure it, what the recogniser hears, and its word times (the mix uses W1's)
  effects/<kind>.flac  as make-elevenlabs.py makes them: trimmed to the onset, levelled, the pitched ones tuned
                    to the music's pentatonic scale, the agents' notes and the summons' threads as rising runs
  music.flac        brought to exactly 90 BPM from its first downbeat, then cut to the film: see MUSIC_EDIT

Usage (from priora-motion-film, with the venv that has numpy, scipy, soundfile and sherpa-onnx):
  python -I scripts/audio/prepare-elevenlabs.py [--only voice,effects,music]
"""
import argparse
import importlib.util
import json
import math
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'audio sources' / 'elevenlabs'
DOWN = OUT / 'downloads'


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


EL = load_module('make_elevenlabs', ROOT / 'scripts/audio/make-elevenlabs.py')
MV = EL.MV
sys.path.insert(0, str(ROOT / 'scripts/audio/check'))
from asr import transcribe  # noqa: E402

VOICE_RATE = 44100
# the take kept for each line and effect (all take 1 unless listed)
TAKES = {'paper': 3}  # paper takes 1 and 2 are rustles; take 3 holds one clean contact (EFFECT_WINDOW)
SOURCE = {
    'voice': {'narrator': 'George (JBFqnCBsd6RMkjVDRZzb), speed 1.0, stability 0.5, similarity 0.8, style 0.1',
              'worker': 'Liam (TX3LPaxmHKxFdv7VOQHJ), speed 1.1, stability 0.4, similarity 0.8, style 0.2',
              'model': 'ElevenLabs Eleven Multilingual v2 (via invideo)', 'seed': 11},
    'effects': 'ElevenLabs Sound Effects (via invideo)',
    'music': 'Mureka 9 Instrumental (via invideo)',
}
# where "route" is said as in British English ("root"), the recogniser writes the homophone
HOMOPHONES = {('route', 'root')}


def take(name):
    return f"{name} take{TAKES.get(name, 1)}.mp3"


def prepare_voice():
    lines = MV.read_voice_table(ROOT / 'src/lib/timeline.ts')
    chains = MV.read_mix_chains(ROOT / 'scripts/mix-audio.ts')
    MV.RATE = VOICE_RATE  # make-voice's level, limiter and trim run at the recording's own rate
    report = []
    for ln in lines:
        src = DOWN / take(ln['id'])
        x = EL.read(src, VOICE_RATE, 1)[:, 0]
        y = MV.level(x, MV.WORKER_CEILING_DB if ln['who'] == 'worker' else MV.PEAK_CEILING_DB)
        y, spoken = MV.trim(y)
        out = OUT / 'voice' / f"{ln['id']}.flac"
        EL.write(out, y, VOICE_RATE)
        frames, peak = MV.mix_view(out, ln, chains)
        end = ln['start'] + frames - 1
        limit = min(ln['by'], MV.WORKER_GREY_FRAME) if ln['who'] == 'worker' else ln['by']
        heard = transcribe(str(out))
        diffs = [d for d in MV.compare(ln['text'], heard['text']) if not any(f"'{a}' -> '{b}'" in d for a, b in HOMOPHONES)]
        diffs = [d for d in diffs if not (d.startswith("replace: 'priora'") and "-> 'pr" in d)]
        words = heard['words'] if len(heard['words']) == len(ln['text'].split(' ')) else []
        for w, t in zip(words, ln['text'].split(' ')):
            w['w'] = t
        report.append({'id': ln['id'], 'who': ln['who'], 'text': ln['text'], 'take': src.name, 'frames': frames, 'end': end, 'by': limit,
                       'slack': limit - end, 'peak_in_mix_db': peak, 'heard': heard['text'], 'differences': diffs, 'matches': not diffs,
                       'words': [{'w': w['w'], 'start': round(w['start'], 3), 'end': round(w['end'], 3)} for w in words]})
        flag = 'OK  ' if not diffs and limit >= end and peak < 0 else 'FAIL'
        print(f"{flag} {ln['id']:5} {frames:4} frames, ends F{end:04d} (by F{limit:04d}, {limit - end:+d}), peak {peak:+.2f} dB in the mix: {heard['text']}"
              + (f'  {diffs}' if diffs else ''))
    (OUT / 'voice' / 'lines.json').write_text(json.dumps({
        'source': SOURCE['voice'], 'words': "the recogniser's word times, seconds from each file's start", 'lines': report}, indent=1, ensure_ascii=False))
    bad = [r['id'] for r in report if not r['matches'] or r['slack'] < 0 or r['peak_in_mix_db'] >= 0]
    print(f"voice: {len(report) - len(bad)} of {len(report)} lines fit and are heard as written" + (f'; check {", ".join(bad)}' if bad else ''))


# where a take holds more than the one sound, the part kept (seconds of the take): the paper's one clean contact,
# the first tick of two, the felt landing after a faint touch, the card's landing without the flutter after it
EFFECT_WINDOW = {'paper': (2.15, 2.26), 'tick': (0.15, 0.60), 'felt': (1.85, 2.60), 'card': (0.33, 0.62)}
# the struck sounds ring for 3 s as made; the runs of five sit 0.13 to 0.6 s apart, so each is held this long,
# its last 40 % faded out, and they stay clear of each other
EFFECT_LENGTH = {'note': 1.2, 'thread': 1.5, 'wood': 2.0, 'tone': 2.5}


def window(x, a, b, fade_s=0.06):
    y = x[int(a * EL.RATE):int(b * EL.RATE)].copy()
    n = int(fade_s * EL.RATE)
    y[-n:] *= (np.cos(np.linspace(0, math.pi / 2, n)) ** 2)[:, None]
    return y


def hold(y, seconds):
    if len(y) <= seconds * EL.RATE:
        return y
    y = y[:int(seconds * EL.RATE)].copy()
    n = int(0.4 * len(y))
    y[-n:] *= (np.cos(np.linspace(0, math.pi / 2, n)) ** 2)[:, None]
    return y


def prepare_effects(key_offset):
    rate = EL.RATE
    out = OUT / 'effects'
    tonic = 2 + key_offset
    scale = sorted((tonic + d) % 12 for d in EL.PENTATONIC)
    for kind in EL.EFFECTS:
        x = EL.read(DOWN / 'effects' / take(kind))
        if kind in EL.LOOP:
            n = int(0.05 * rate)
            y = x[:len(x) - n].copy()
            y[:n] = y[:n] * np.linspace(0, 1, n)[:, None] + x[-n:] * np.linspace(1, 0, n)[:, None]
        else:
            y = EL.onset_trim(window(x, *EFFECT_WINDOW[kind]) if kind in EFFECT_WINDOW else x)
        y = EL.level(hold(y, EFFECT_LENGTH[kind]) if kind in EFFECT_LENGTH else y, -3.0)
        note = ''
        if kind in EL.PITCHED:
            f = EL.f0_of(y)
            target = None
            if f:
                now = 12 * math.log2(f / 261.6256)
                target = min((o * 12 + pc for o in range(-4, 5) for pc in scale), key=lambda c: abs(c - now))
                y = EL.shift(y, target - now)
                note = f', {f:.1f} Hz tuned {target - now:+.2f} semitones to the scale'
            else:
                note = ', no clear pitch: left as made'
            if kind in EL.RUNS:
                steps = ([c - target for c in sorted(c for c in (o * 12 + pc for o in range(-4, 6) for pc in scale) if c >= target)[:5]]
                         if target is not None else EL.PENTATONIC)
                for i, st in enumerate(steps, 1):
                    EL.write(out / f'{kind} {i}.flac', EL.level(EL.shift(y, st), -3.0))
                note += f', run of five ({", ".join(f"{s:+d}" for s in steps)})'
        EL.write(out / f'{kind}.flac', EL.level(y, -3.0))
        print(f'  {kind:6} {len(y) / rate:.2f} s{note}')


# the bed is cut to the film's 36 bars on bar lines (one bar = 8/3 s at 90 BPM) after the tempo correction,
# counting bars from the music's first bar line: each [from_bar, to_bar) span is kept in order. At a join the
# next span comes in PRE_S before its bar line, faded in over twice that, so its downbeat keeps its attack, and
# what was sounding rings on over TAIL_S, fading out, as a sustain would. The track runs 59 bars; the film keeps its calm opening and middle (bars 1 to 31),
# leaves out bars 32 to 34, where a bright, busy figure comes in, and goes on from bar 35, where the music
# thins again, so the film's last bar is the home chord (bar 39) as the mix fades it. The join is chosen where
# the beats either side of it most resemble the music's own continuation (chroma, spectral balance, level)
# and falls under N7b, while the music is ducked.
MUSIC_EDIT = [(1, 32), (35, 40)]
PRE_S, TAIL_S = 0.02, 0.4


def prepare_music():
    rate = EL.RATE
    src = DOWN / take('music')
    x = EL.read(src)
    tempo, down = EL.tempo_and_downbeat(x)
    stretched = ROOT / 'out' / 'music stretched.wav'  # an intermediate, not kept
    stretched.parent.mkdir(parents=True, exist_ok=True)
    ratio = 90 / tempo if 80 <= tempo <= 100 else 1.0
    EL.run(['-i', str(src), '-af', f'atempo={ratio:.6f},aresample={rate}', '-ac', '2', '-c:a', 'pcm_s24le', str(stretched)])
    y = EL.read(stretched)
    tempo2, down2 = EL.tempo_and_downbeat(y)
    first = down2 % (8 / 3)  # the first bar line, counting back from the first strong downbeat
    y = y[int(round(first * rate)):]
    print(f'music: {tempo:.2f} BPM as made (first strong downbeat {down:.3f} s), brought to {tempo2:.2f} BPM, first bar line {first:.3f} s, '
          f'{len(y) / rate:.1f} s from there')
    bar = 8 / 3 * rate
    if MUSIC_EDIT:
        at = lambda b: int(round(b * bar))
        pre, tail = int(PRE_S * rate), int(TAIL_S * rate)
        z = y[at(MUSIC_EDIT[0][0]):at(MUSIC_EDIT[0][1])].copy()
        for (a0, b0), (a, b) in zip(MUSIC_EDIT, MUSIC_EDIT[1:]):
            line = len(z)
            new = y[at(a) - pre:at(b)].copy()
            new[:2 * pre] *= (np.sin(np.linspace(0, math.pi / 2, 2 * pre)) ** 2)[:, None]
            ring = y[at(b0) - pre:at(b0) + tail] * (np.cos(np.linspace(0, math.pi / 2, pre + tail)) ** 2)[:, None]
            z = np.concatenate([z[:line - pre], new])
            z[line - pre:line + tail] += ring
        y = z
        print(f'  cut to bars {MUSIC_EDIT}: {len(y) / rate:.1f} s')
    EL.write(OUT / 'music.flac', EL.level(y, -3.0))
    (OUT / 'music.json').write_text(json.dumps({'source': SOURCE['music'], 'take': src.name, 'generated_bpm': tempo, 'atempo': ratio, 'bpm': tempo2,
                                                'first_bar_line_s': first, 'edit_bars': MUSIC_EDIT, 'join_pre_s': PRE_S, 'join_tail_s': TAIL_S}, indent=1))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--only', default='voice,music,effects')
    parts = set(ap.parse_args().only.split(','))
    if 'voice' in parts:
        prepare_voice()
    if 'music' in parts:
        prepare_music()
    if 'effects' in parts:
        prepare_effects(EL.music_key_offset(OUT / 'music.flac'))


if __name__ == '__main__':
    main()
