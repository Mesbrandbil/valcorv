#!/usr/bin/env python3
"""Composes, renders and mixes the film's music bed: audio sources/music.flac and audio sources/music.mid.

An original piece at 90 BPM, 4/4, in D major. The score below is written as MIDI with mido, each instrument
is rendered with fluidsynth from a General MIDI soundfont (its own reverb and chorus off), and the stems are
darkened, balanced and put in a small warm room (a seeded synthetic convolution reverb) in Python. Nothing is
random at run time, so the same soundfont and fluidsynth give the same file.

The form, on the bar lines of "narration script.md" (one bar is 80 frames, bar n starts at n * 2.6667 s):

  bars 0-7    almost empty: the pad and a few single piano notes             Dadd9, Bm7, A7sus4
  bars 8-15   a gentle repeating piano figure begins under the assembled case  D, A/C#, Bm7, A11
  bars 16-17  the route opens: a warm sustained Gmaj9, the fullest moment     Gmaj9 (+ soft strings)
  bars 18-21  a condition slips: thinner, suspended, no tonic                Esus4(add9), C# F# B E
  bars 22-30  the figure returns lightly through the decision rooms          B7sus4, Gmaj13, Esus4(add9), A7sus4
  bars 31-32  the interval settles: the suspended D falls to C#              A7
  bars 33-35  a soft resolution on D, thinning                                D
  from 94.13 s (F2824) the last chord decays to near silence

The bass line under bars 8-17 steps down D, C#, B, A, G; the pad's upper voices hold common tones and move
by step wherever they can. Bars 18-30 never sound a D chord or a D in the bass.

Instruments (bank/program in MuseScore General): Mellow Grand Piano 8/0 played softly and low-passed (the
felt piano), Vibraphone 0/11 (soft mallets), Warm Pad 0/89 (the low warm pad), Strings Slow 0/49 (bars 16-17
only, under the pad), Woodblock 0/115 on D3 (a dry tick on a few beats).

Usage (from priora-motion-film, with a Python that has mido, numpy, scipy and soundfile):
  python -I scripts/audio/make-music.py [--soundfont FILE] [--fluidsynth PATH] [--out DIR]
or set PRIORA_SOUNDFONT and FLUIDSYNTH. The default soundfont is /usr/share/sounds/sf3/MuseScore_General.sf3
(MIT licensed), then /usr/share/sounds/sf2/FluidR3_GM.sf2.
"""
import argparse
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

import mido
import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parents[2]
RATE = 48000
BPM = 90
TPB = 480  # MIDI ticks per beat
BEAT_S = 60 / BPM  # 0.6667 s, 20 frames
BAR = 4  # beats per bar
LENGTH_S = 98.0  # the film is 96.1 s; the rest is the natural tail, which the mix trims
END_BEAT = 147  # the MIDI runs to here (98.0 s) so fluidsynth renders every release
PEAK_DBFS = -3.0  # sample peak of the written file (true peak stays well under -1 dBTP)
SEED = 9090

# GM parts: channel, bank, program, the preset name expected in the soundfont, pan (CC10)
PARTS = {
    'piano': dict(ch=0, bank=8, prog=0, name='Mellow Grand Piano', pan=58),
    'mallet': dict(ch=1, bank=0, prog=11, name='Vibraphone', pan=80),
    'pad': dict(ch=2, bank=0, prog=89, name='Warm Pad', pan=64),
    'strings': dict(ch=3, bank=0, prog=49, name='Strings Slow', pan=50),
    'wood': dict(ch=4, bank=0, prog=115, name='Woodblock', pan=44),
}
# Per stem after rendering: high-pass and low-pass corners (Hz, None for none), gain (dB), reverb send.
# The piano is low-passed hard so it reads as felted; the pad is kept dark, under the speech band.
STEMS = {
    'piano': dict(hp=55, lp=1300, gain=0.0, send=0.50),
    'mallet': dict(hp=120, lp=2600, gain=3.0, send=0.60),
    'pad': dict(hp=32, lp=850, gain=-9.0, send=0.40),
    'strings': dict(hp=60, lp=700, gain=-12.0, send=0.50),
    'wood': dict(hp=280, lp=1700, gain=-2.0, send=0.30),
}
WET = 0.42  # the room's level against the dry sum

NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def pitch(name):
    """'F#4' -> 66 (C4 = 60)."""
    m = re.fullmatch(r'([A-G])(#|b)?(-?\d)', name)
    if not m:
        raise ValueError(name)
    acc = {'#': 1, 'b': -1, None: 0}[m.group(2)]
    return 12 * (int(m.group(3)) + 1) + NOTE[m.group(1)] + acc


def at(bar, beat=0.0):
    return bar * BAR + beat


# ---------------------------------------------------------------- the harmony (the pad plays it)
# (first bar, chord name, bass, upper voices). Each chord lasts until the next one; common tones are tied.
CHORDS = [
    (0, 'Dadd9', 'D2', ['A3', 'E4']),  # it opens almost empty: an open D with the ninth
    (2, 'Dadd9', 'D2', ['A3', 'E4', 'F#4']),  # the third arrives
    (4, 'Bm7', 'B1', ['A3', 'D4', 'F#4']),
    (6, 'A7sus4', 'A1', ['G3', 'D4', 'E4']),
    (8, 'Dadd9', 'D2', ['F#3', 'A3', 'E4']),  # the figure begins
    (10, 'A/C#', 'C#2', ['E3', 'A3', 'E4']),
    (12, 'Bm7', 'B1', ['F#3', 'A3', 'D4']),
    (14, 'A11 (Em7/A)', 'A1', ['G3', 'B3', 'D4']),
    (16, 'Gmaj9', 'G1', ['F#3', 'B3', 'D4', 'A4']),  # the route opens: the fullest chord
    (18, 'Esus4(add9)', 'E2', ['F#3', 'B3', 'A4']),  # a condition slips: thinner, no tonic
    (20, 'C# F# B E (F#7sus4/C#)', 'C#2', ['F#3', 'B3', 'E4']),
    (22, 'B7sus4', 'B1', ['F#3', 'A3', 'E4']),  # the figure returns, lightly
    (24, 'Gmaj13', 'G1', ['F#3', 'B3', 'E4']),
    (26, 'Esus4(add9)', 'E2', ['F#3', 'B3', 'A4']),
    (28, 'A7sus4', 'A1', ['G3', 'D4', 'E4']),
    (31, 'A7', 'A1', ['G3', 'C#4', 'E4']),  # the interval settles: D falls to C#
    (33, 'D', 'D2', ['F#3', 'A3', 'D4']),  # the soft resolution
]
PAD_OFF = at(35)  # the pad lets go on bar 35 and decays through its release
LAST_OFF = 144.0  # the piano and mallet ring on from bar 33 and let go at 96.0 s, as the film ends

# ---------------------------------------------------------------- the piano: (bar, beat, note, velocity, beats)
# None for the length means: ring to the end of the chord (as if the pedal were held for the chord).
PIANO = [
    # bars 0-7: a few single notes over the pad
    (0, 0, 'F#4', 42, 7), (1, 2, 'E4', 34, 6), (2, 0, 'D4', 38, 7), (3, 2, 'A3', 32, 6),
    (4, 0, 'F#4', 40, 7), (5, 2, 'B3', 32, 6), (6, 0, 'E4', 38, 7), (7, 2, 'D4', 32, 6),
]
# bars 8-15: the figure. Bar A: bass on 1, the fifth on 2, the ninth on 3; bar B: the top on 1, then down on 3 and 4.
FIGURE = [
    (8, ['D3', 'A3', 'E4'], ['F#4', 'E4', 'D4']),
    (10, ['C#3', 'A3', 'E4'], ['E4', 'C#4', 'A3']),
    (12, ['B2', 'F#3', 'D4'], ['D4', 'B3', 'A3']),
    (14, ['A2', 'E3', 'D4'], ['E4', 'D4', 'B3']),
]
for bar, (a1, a2, a3), (b1, b3, b4) in FIGURE:
    PIANO += [(bar, 0, a1, 44, None), (bar, 1, a2, 34, None), (bar, 2, a3, 38, None),
              (bar + 1, 0, b1, 42, None), (bar + 1, 2, b3, 36, None), (bar + 1, 3, b4, 32, None)]
# bars 16-17: the warm chord, rolled softly, and one high note
PIANO += [(16, 0.08 * i, n, v, None) for i, (n, v) in enumerate(zip(['G2', 'D3', 'B3', 'F#4', 'A4'], [48, 40, 38, 40, 46]))]
PIANO += [(17, 0, 'B4', 34, None)]
# bars 18-21: thin again: a low bass under each chord, then one note a bar, falling
PIANO += [(18, 0, 'E2', 36, None), (18, 2, 'A4', 38, 6), (19, 2, 'F#4', 34, 6),
          (20, 0, 'C#2', 32, None), (20, 2, 'E4', 36, 6), (21, 2, 'B3', 32, 6)]
# bars 22-30: the figure again, lightly (four notes in two bars, softer)
LIGHT = [
    (22, ['B2', 'E4'], ['F#4', 'A3']),
    (24, ['G2', 'A3'], ['E4', 'B3']),
    (26, ['E3', 'F#4'], ['A4', 'E4']),
    (28, ['A2', 'D4'], ['E4', 'G3']),
]
for bar, (a1, a3), (b1, b4) in LIGHT:
    PIANO += [(bar, 0, a1, 38, None), (bar, 2, a3, 32, None), (bar + 1, 0, b1, 36, None), (bar + 1, 3, b4, 30, None)]
PIANO += [(30, 0, 'A2', 34, None), (30, 2, 'D4', 34, None)]  # the suspension, held into bar 31
# bars 31-32: it settles (D4 to C#4 on the downbeat), then the seventh G4 waits for bar 33
PIANO += [(31, 0, 'A2', 40, None), (31, 0, 'C#4', 38, None), (31, 2, 'E4', 32, None),
          (32, 0, 'A3', 30, None), (32, 2, 'G4', 36, None)]
# bars 33-35: the resolution on D, rolled, the seventh falling to F#4 on top; then one last note, and it rings away
PIANO += [(33, 0.07 * i, n, v, None) for i, (n, v) in enumerate(zip(['D2', 'A2', 'F#3', 'D4', 'F#4'], [44, 38, 36, 36, 42]))]
PIANO += [(34, 0, 'A4', 32, None)]

# ---------------------------------------------------------------- the mallets: one soft note in the figure's rest
MALLET = [
    (9, 1, 'A4', 34, 6), (11, 1, 'C#5', 32, 6), (13, 1, 'B4', 32, 6), (15, 1, 'A4', 32, 3),
    (16, 0, 'B4', 36, 8), (17, 2, 'A4', 32, 6),
    (23, 1, 'C#5', 30, 6), (25, 1, 'B4', 30, 6), (27, 1, 'A4', 30, 6), (29, 1, 'G4', 30, 8),
    (31, 0, 'C#5', 32, 8), (33, 0, 'D5', 32, None),
]
# ---------------------------------------------------------------- the wooden tick: the fourth beat of a few bars
# (not bar 10, whose fourth beat would sit between the felt landing at F0858 and the tick effect at F0876)
# The block barely follows the key (two semitones move it about 40 cents); on D3 its partials sit near D5, E5 and
# F#6, and every MIDI note stays in D major.
WOOD = [(b, 3, 'D3', 30, 0.25) for b in (8, 12, 14, 22, 26, 28)]
# ---------------------------------------------------------------- the strings: under the warm chord only
STRINGS = [(16, 0, n, 48, 8) for n in ('G2', 'D3', 'B3', 'F#4')]

# Expression (CC11) breakpoints in beats: the pad's slow dynamics, the strings' swell, the piano's last decay.
# The A7sus4 of bars 28-30 swells on this pad, so it is held about 2 dB lower there (stepped on its attack at bar
# 28, where no note is tied over), keeping bars 18-30 under the figure of bars 8-15 without a rise into bar 31.
PAD_EXPR = [(0, 60), (8, 82), (32, 82), (32.01, 96), (64, 98), (66, 110), (70, 108), (72, 86), (88, 86),
            (88.01, 92), (111.99, 92), (112, 82), (124, 84), (131.99, 92), (132, 100), (136, 90), (140, 60), (145, 0)]
STRINGS_EXPR = [(64, 40), (66.5, 100), (70, 96), (72, 30)]
# The soundfont's piano holds a flat sustain after a few seconds, so the last chord is let down by hand, about
# linearly in dB (CC11 = 127 * 10^(dB/40)): -6 dB at bar 35, -14 dB at F2824, -34 dB as the film ends.
PIANO_EXPR = [(0, 127), (137, 127), (140, 90), (141.2, 57), (142.5, 32), (144, 18)]
SECTIONS = [(0, 'bars 0-7: almost empty'), (8, 'bar 8: the figure begins'), (16, 'bar 16: the warm chord'),
            (18, 'bar 18: a condition slips'), (22, 'bar 22: the figure returns lightly'),
            (31, 'bar 31: the interval settles'), (33, 'bar 33: resolution on D'), (35.3, 'F2824: decay')]


def chord_end(bar):
    """The beat where the chord sounding at this bar ends."""
    starts = [c[0] for c in CHORDS] + [35]
    return at(min(s for s in starts if s > bar))


def notes_of(table, part, rng, humanize):
    out = []
    for bar, beat, name, vel, length in table:
        start = at(bar, beat)
        end = chord_end(bar) if length is None else start + length
        if part in ('piano', 'mallet') and bar >= 33:
            end = LAST_OFF
        if humanize and beat != 0 and abs(beat - round(beat)) < 1e-9:
            start += rng.uniform(-0.012, 0.012)  # under 10 ms either way, never on a downbeat
        vel = int(np.clip(vel + (rng.integers(-2, 3) if humanize else 0), *((30, 60) if part == 'piano' else (1, 127))))
        out.append(dict(start=start, end=end, pitch=pitch(name), vel=vel))
    return out


def pad_notes():
    out, active = [], {}
    for i, (bar, _, bass, upper) in enumerate(CHORDS):
        here = {pitch(n) for n in [bass] + upper}
        t = at(bar)
        for p in [p for p in active if p not in here]:
            out.append(dict(start=active.pop(p), end=t, pitch=p, vel=50))
        for p in here:
            active.setdefault(p, t)
    out += [dict(start=s, end=PAD_OFF, pitch=p, vel=50) for p, s in active.items()]
    return out


def unoverlap(notes):
    """A repeated pitch on one channel ends just before it is struck again."""
    notes = sorted(notes, key=lambda n: (n['pitch'], n['start']))
    for a, b in zip(notes, notes[1:]):
        if a['pitch'] == b['pitch'] and a['end'] > b['start'] - 0.03:
            a['end'] = b['start'] - 0.03
    return sorted(notes, key=lambda n: n['start'])


def expression(points, step=0.25):
    """CC11 values along the breakpoints, one every `step` beats where the value changes."""
    out, last = [], None
    t = points[0][0]
    xs, ys = zip(*points)
    while t <= xs[-1] + 1e-9:
        v = int(round(np.interp(t, xs, ys)))
        if v != last:
            out.append((t, v))
            last = v
        t += step
    return out


def score():
    rng = np.random.default_rng(SEED)
    return {
        'piano': unoverlap(notes_of(PIANO, 'piano', rng, True)),
        'mallet': unoverlap(notes_of(MALLET, 'mallet', rng, True)),
        'pad': unoverlap(pad_notes()),
        'strings': unoverlap(notes_of(STRINGS, 'strings', rng, False)),
        'wood': unoverlap(notes_of(WOOD, 'wood', rng, False)),
    }


# ---------------------------------------------------------------- MIDI
def tick(beat):
    return int(round(beat * TPB))


def conductor():
    tr = mido.MidiTrack()
    tr.append(mido.MetaMessage('track_name', name='Priora music bed', time=0))
    tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM), time=0))
    tr.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
    tr.append(mido.MetaMessage('key_signature', key='D', time=0))
    now = 0
    for bar, text in SECTIONS:
        t = tick(at(bar))
        tr.append(mido.MetaMessage('marker', text=text, time=t - now))
        now = t
    tr.append(mido.MetaMessage('end_of_track', time=tick(END_BEAT) - now))
    return tr


def part_track(part, notes):
    cfg = PARTS[part]
    ch = cfg['ch']
    events = []  # (tick, order, message); note-offs sort before note-ons at the same tick
    for n in notes:
        events.append((tick(n['start']), 2, mido.Message('note_on', channel=ch, note=n['pitch'], velocity=n['vel'])))
        events.append((tick(n['end']), 0, mido.Message('note_off', channel=ch, note=n['pitch'], velocity=0)))
    curve = {'pad': PAD_EXPR, 'strings': STRINGS_EXPR, 'piano': PIANO_EXPR}.get(part)
    if curve:
        for t, v in expression(curve):
            events.append((tick(t), 1, mido.Message('control_change', channel=ch, control=11, value=v)))
    events.sort(key=lambda e: (e[0], e[1]))
    tr = mido.MidiTrack()
    tr.append(mido.MetaMessage('track_name', name=f"{part}: {cfg['name']}", time=0))
    head = [mido.Message('control_change', channel=ch, control=0, value=cfg['bank']),
            mido.Message('control_change', channel=ch, control=32, value=0),
            mido.Message('program_change', channel=ch, program=cfg['prog']),
            mido.Message('control_change', channel=ch, control=7, value=100),
            mido.Message('control_change', channel=ch, control=10, value=cfg['pan']),
            mido.Message('control_change', channel=ch, control=91, value=0),
            mido.Message('control_change', channel=ch, control=93, value=0)]
    if not curve:
        head.append(mido.Message('control_change', channel=ch, control=11, value=127))
    for m in head:
        tr.append(m.copy(time=0))
    now = 0
    for t, _, m in events:
        tr.append(m.copy(time=t - now))
        now = t
    tr.append(mido.MetaMessage('end_of_track', time=max(0, tick(END_BEAT) - now)))
    return tr


def midi_file(parts):
    mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
    mid.tracks.append(conductor())
    for part, notes in parts.items():
        mid.tracks.append(part_track(part, notes))
    return mid


# ---------------------------------------------------------------- the soundfont
def presets(path):
    """(bank, program) -> preset name, read from the soundfont's phdr chunk (SF2 and SF3 share it)."""
    data = Path(path).read_bytes()
    if data[:4] != b'RIFF':
        raise SystemExit(f'{path} is not a soundfont')
    found, pos = {}, 12
    while pos + 8 <= len(data):
        cid, size = data[pos:pos + 4], struct.unpack('<I', data[pos + 4:pos + 8])[0]
        if cid == b'LIST' and data[pos + 8:pos + 12] == b'pdta':
            p, end = pos + 12, pos + 8 + size
            while p + 8 <= end:
                sid, ss = data[p:p + 4], struct.unpack('<I', data[p + 4:p + 8])[0]
                if sid == b'phdr':
                    for i in range(0, ss - 38, 38):  # the last record is the terminal EOP
                        name, prog, bank = struct.unpack('<20sHH', data[p + 8 + i:p + 8 + i + 24])
                        found[(bank, prog)] = name.split(b'\0')[0].decode('latin1').strip()
                p += 8 + ss + (ss & 1)
        pos += 8 + size + (size & 1)
    return found


def render(fluidsynth, soundfont, mid_path, wav_path, gain):
    subprocess.run([fluidsynth, '-ni', '-q', '-R', '0', '-C', '0', '-O', 'float', '-r', str(RATE), '-g', str(gain),
                    '-F', str(wav_path), str(soundfont), str(mid_path)], check=True, capture_output=True)
    x, sr = sf.read(str(wav_path), dtype='float64', always_2d=True)
    if sr != RATE:
        raise SystemExit(f'fluidsynth wrote {sr} Hz, expected {RATE}')
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    return x


# ---------------------------------------------------------------- the room
def filt(x, hp=None, lp=None, order=2):
    if hp:
        x = sosfilt(butter(order, hp, 'highpass', fs=RATE, output='sos'), x, axis=0)
    if lp:
        x = sosfilt(butter(order, lp, 'lowpass', fs=RATE, output='sos'), x, axis=0)
    return x


def room_ir(seed=SEED, length=2.4, predelay=0.011):
    """A small warm room: a few early reflections, then a diffuse tail that dies faster in the highs
    (RT60 about 1.25 s below 400 Hz, 0.95 s in the middle, 0.45 s above 3.5 kHz). Stereo, decorrelated."""
    rng = np.random.default_rng(seed)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    ir = np.zeros((n, 2))
    for c in range(2):
        noise = rng.standard_normal(n)
        low = filt(noise, lp=400)
        high = filt(noise, hp=3500)
        mid = filt(noise, hp=400, lp=3500)
        env = lambda rt: np.exp(-6.91 * t / rt)
        tail = low * env(1.25) + mid * env(0.95) + 0.5 * high * env(0.45)
        tail *= 1 - np.exp(-t / 0.025)  # the diffuse field builds up over the first tens of ms
        er = np.zeros(n)
        for _ in range(10):
            d = rng.uniform(0.004, 0.045)
            er[int(d * RATE)] += rng.choice([-1, 1]) * rng.uniform(0.35, 0.8) * np.exp(-d / 0.03)
        er = filt(er, lp=4500)
        sig = 0.55 * er / (np.sqrt((er ** 2).sum()) + 1e-12) + tail / np.sqrt((tail ** 2).sum())
        shift = int(predelay * RATE)
        ir[shift:, c] = sig[:n - shift]
    return ir / np.sqrt((ir ** 2).sum() / 2)


def db(x):
    return 20 * np.log10(max(x, 1e-12))


def main():
    default_sf = next((p for p in ('/usr/share/sounds/sf3/MuseScore_General.sf3', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
                       if Path(p).exists()), None)
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--soundfont', default=os.environ.get('PRIORA_SOUNDFONT', default_sf), help='GM soundfont (or PRIORA_SOUNDFONT)')
    ap.add_argument('--fluidsynth', default=os.environ.get('FLUIDSYNTH', 'fluidsynth'), help='fluidsynth binary (or FLUIDSYNTH)')
    ap.add_argument('--gain', type=float, default=1.0, help='fluidsynth master gain (float output, so it cannot clip)')
    ap.add_argument('--out', default=str(ROOT / 'audio sources'))
    ap.add_argument('--stems', help='also write each processed stem here, for checking')
    args = ap.parse_args()
    if not args.soundfont or not Path(args.soundfont).exists():
        raise SystemExit('no soundfont: pass --soundfont or set PRIORA_SOUNDFONT')
    fluid = shutil.which(args.fluidsynth) or args.fluidsynth
    if not Path(fluid).exists():
        raise SystemExit(f'fluidsynth not found: {args.fluidsynth}')

    have = presets(args.soundfont)
    for part, cfg in PARTS.items():
        got = have.get((cfg['bank'], cfg['prog']))
        if got is None:
            raise SystemExit(f"{Path(args.soundfont).name} has no preset {cfg['bank']}/{cfg['prog']} for the {part}")
        print(f"{part:8s} {cfg['bank']}/{cfg['prog']:<3d} {got}" + ('' if got == cfg['name'] else f"  (expected {cfg['name']})"))

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    parts = score()
    midi_file(parts).save(str(out / 'music.mid'))

    n = int(LENGTH_S * RATE)
    dry = np.zeros((n, 2))
    send = np.zeros((n, 2))
    stems = {}
    with tempfile.TemporaryDirectory() as tmp:
        for part, notes in parts.items():
            mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
            mid.tracks += [conductor(), part_track(part, notes)]
            mp, wp = Path(tmp) / f'{part}.mid', Path(tmp) / f'{part}.wav'
            mid.save(str(mp))
            x = render(fluid, args.soundfont, mp, wp, args.gain)
            raw_peak = np.abs(x).max()
            x = np.pad(x, ((0, max(0, n - len(x))), (0, 0)))[:n]
            cfg = STEMS[part]
            x = filt(x, cfg['hp'], cfg['lp']) * 10 ** (cfg['gain'] / 20)
            stems[part] = x
            dry += x
            send += cfg['send'] * x
            print(f"  rendered {part:8s} {len(notes):3d} notes, fluidsynth peak {db(raw_peak):6.1f} dBFS")
    ir = room_ir()
    wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:n] for c in range(2)], axis=1)
    mix = filt(dry + WET * wet, hp=25)
    fade = int(0.4 * RATE)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2  # the tail is already near silence here
    scale = 10 ** (PEAK_DBFS / 20) / np.abs(mix).max()
    mix *= scale
    sf.write(str(out / 'music.flac'), mix.astype(np.float32), RATE, subtype='PCM_24', format='FLAC')
    if args.stems:
        sd = Path(args.stems)
        sd.mkdir(parents=True, exist_ok=True)
        for part, x in stems.items():
            sf.write(str(sd / f'{part}.flac'), (x * scale).astype(np.float32), RATE, subtype='PCM_24', format='FLAC')
        sf.write(str(sd / 'room.flac'), (WET * wet * scale).astype(np.float32), RATE, subtype='PCM_24', format='FLAC')
    print(f"wrote {out / 'music.flac'} ({LENGTH_S:.1f} s, {RATE} Hz stereo, peak {db(np.abs(mix).max()):.1f} dBFS) and {out / 'music.mid'}")


if __name__ == '__main__':
    sys.exit(main())
