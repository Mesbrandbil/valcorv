"""Minimal Standard MIDI File writer, a deterministic fluidsynth renderer and
per-note tuning.

Notes are placed in absolute seconds (the score is anchored to cue times, not
to a bar grid), so the file uses one fixed tempo: 120 BPM at 960 ticks per
quarter, which is 1920 ticks per second (0.52 ms resolution).

Tuning: the soundfont's samples are not all at A = 440 Hz (measured on
MuseScore General: the cello's low zone about 8 cents flat, the slow strings'
low zone wobbling by 20 cents, some contrabass zones 37 cents sharp). Every
part is therefore tuned note by note: measure_tuning() renders each pitch a
part uses, reads its sustained pitch (median of a pitch track), and the
writer spreads the part over MIDI channels, one per correction, each with a
pitch bend that brings its notes to equal temperament at A = 440 Hz.
"""
from __future__ import annotations

import hashlib
import os
import struct
import subprocess
import tempfile

import numpy as np
import soundfile as sf

from .dsp import SR

TPQ = 960
TICKS_PER_S = 1920.0  # 120 BPM
SOUNDFONT = "/usr/share/sounds/sf3/MuseScore_General_Full.sf3"
# fluidsynth starts rendering this many samples late; measured and removed
FLUID_OFFSET = None


def _vlq(v: int) -> bytes:
    v = int(v)
    out = [v & 0x7F]
    v >>= 7
    while v:
        out.append(0x80 | (v & 0x7F))
        v >>= 7
    return bytes(reversed(out))


BEND_RANGE_CENTS = 200.0  # pitch-bend sensitivity written into every channel (RPN 0: 2 semitones)
CHANNELS = [c for c in range(16) if c != 9]  # channel 10 is percussion in GM


def _channels_for(notes, tuning):
    """Assign each pitch a channel by its correction (cents, 0.25 c steps).
    Returns ({pitch: channel}, {channel: cents})."""
    tuning = tuning or {}
    groups = {}
    for p in sorted({int(nn[2]) for nn in notes}):
        c = round(float(tuning.get(p, 0.0)) * 4) / 4
        groups.setdefault(c, []).append(p)
    keys = sorted(groups)
    while len(keys) > len(CHANNELS):  # merge the two closest corrections
        d = [keys[i + 1] - keys[i] for i in range(len(keys) - 1)]
        i = int(np.argmin(d))
        a, b = keys[i], keys[i + 1]
        m = (a * len(groups[a]) + b * len(groups[b])) / (len(groups[a]) + len(groups[b]))
        groups[m] = groups.pop(a) + groups.pop(b)
        keys = sorted(groups)
    pch, cents = {}, {}
    for i, k in enumerate(keys):
        ch = CHANNELS[i]
        cents[ch] = k
        for p in groups[k]:
            pch[p] = ch
    return pch, cents


def smf_bytes(program: int, notes, ccs=(), channel: int = 0, tail: float = 4.0,
              bank: int = 0, tuning: dict | None = None) -> bytes:
    """notes: [(t_on, t_off, pitch, velocity)], ccs: [(t, controller, value)].

    tuning: {pitch: correction in cents}; notes are spread over channels by
    correction, each channel bent by its correction (see module docstring).
    Without tuning every note is on `channel` with no bend (cut 2 files are
    unchanged byte for byte)."""
    ev = []  # (tick, order, bytes)
    if tuning is None:
        pch, cents = {int(nn[2]): channel for nn in notes}, {channel: None}
    else:
        pch, cents = _channels_for(notes, tuning)
        if not cents:
            cents = {channel: 0.0}
    for ch, c in sorted(cents.items()):
        ev.append((0, 0, bytes([0xB0 | ch, 0, bank])))
        ev.append((0, 1, bytes([0xC0 | ch, program])))
        ev.append((0, 2, bytes([0xB0 | ch, 7, 100])))    # channel volume fixed
        ev.append((0, 2, bytes([0xB0 | ch, 91, 0])))     # no built-in reverb send
        ev.append((0, 2, bytes([0xB0 | ch, 93, 0])))     # no built-in chorus send
        if c is not None:  # bend range, then the channel's correction
            for cc, v in ((101, 0), (100, 0), (6, int(BEND_RANGE_CENTS // 100)), (38, 0), (101, 127), (100, 127)):
                ev.append((0, 2, bytes([0xB0 | ch, cc, v])))
            b = int(np.clip(round(8192 + c / BEND_RANGE_CENTS * 8192), 0, 16383))
            ev.append((0, 3, bytes([0xE0 | ch, b & 0x7F, (b >> 7) & 0x7F])))
    last = 0.0
    for (t, c, v) in ccs:
        for ch in sorted(cents):
            ev.append((int(round(t * TICKS_PER_S)), 3, bytes([0xB0 | ch, int(c), int(np.clip(v, 0, 127))])))
        last = max(last, t)
    for (on, off, p, v) in notes:
        ch = pch[int(p)]
        a = int(round(on * TICKS_PER_S))
        b = max(int(round(off * TICKS_PER_S)), a + 1)
        ev.append((a, 5, bytes([0x90 | ch, int(p), int(np.clip(v, 1, 127))])))
        ev.append((b, 4, bytes([0x80 | ch, int(p), 0])))  # offs before ons at a tick
        last = max(last, off)
    end_tick = int(round((last + tail) * TICKS_PER_S))
    first = sorted(cents)[0]
    ev.append((end_tick, 6, bytes([0xB0 | first, 121, 0])))  # reset controllers: an anchor at the end
    ev.sort(key=lambda e: (e[0], e[1], e[2]))
    trk = bytearray()
    trk += _vlq(0) + b"\xff\x51\x03" + (500000).to_bytes(3, "big")  # 120 BPM
    prev = 0
    for tick, _, data in ev:
        trk += _vlq(tick - prev) + data
        prev = tick
    trk += _vlq(0) + b"\xff\x2f\x00"
    head = b"MThd" + struct.pack(">IHHH", 6, 0, 1, TPQ)
    return head + b"MTrk" + struct.pack(">I", len(trk)) + bytes(trk)


def cache_dir() -> str:
    d = os.environ.get("PRIORA_AUDIO_CACHE") or os.path.join(tempfile.gettempdir(), "priora-audio-cache")
    os.makedirs(d, exist_ok=True)
    return d


def _fluid(mid_path: str, wav_path: str, gain: float, soundfont: str):
    cmd = ["fluidsynth", "-ni", "-q", "-F", wav_path, "-T", "wav", "-O", "float", "-r", str(SR),
           "-g", f"{gain}", "-o", "synth.reverb.active=0", "-o", "synth.chorus.active=0",
           "-o", "synth.cpu-cores=1", "-o", "synth.polyphony=256", soundfont, mid_path]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def fluid_offset(soundfont: str = SOUNDFONT) -> int:
    """Measure fluidsynth's render latency once: a note written at 0.5 s."""
    global FLUID_OFFSET
    if FLUID_OFFSET is not None:
        return FLUID_OFFSET
    data = smf_bytes(0, [(0.5, 0.9, 72, 100)], tail=0.5)
    y = _render_bytes(data, 1.0, soundfont, raw=True)
    m = np.abs(y).max(axis=1)
    on = int(np.argmax(m > m.max() * 0.02))
    FLUID_OFFSET = max(on - int(0.5 * SR), 0)
    return FLUID_OFFSET


def _render_bytes(data: bytes, gain: float, soundfont: str, raw: bool = False) -> np.ndarray:
    key = hashlib.sha256(data + f"|{gain}|{soundfont}|{SR}".encode()).hexdigest()[:24]
    path = os.path.join(cache_dir(), f"fluid-{key}.wav")
    if not os.path.exists(path):
        with tempfile.TemporaryDirectory() as td:
            mid = os.path.join(td, "score.mid")
            with open(mid, "wb") as fh:
                fh.write(data)
            tmp = os.path.join(td, "out.wav")
            _fluid(mid, tmp, gain, soundfont)
            _copy(tmp, path)
    y, sr = sf.read(path, dtype="float64", always_2d=True)
    assert sr == SR
    return y


def _copy(a, b):
    import shutil
    shutil.copyfile(a, b + ".part")
    os.replace(b + ".part", b)


def render(program: int, notes, ccs=(), length_s: float | None = None, gain: float = 0.5,
           soundfont: str = SOUNDFONT, bank: int = 0, tuning: dict | None = None) -> np.ndarray:
    """Render one instrument part to a stereo float array aligned to t = 0
    (tuning: {pitch: cents}, see smf_bytes)."""
    if not notes:
        n = int(round((length_s or 1.0) * SR))
        return np.zeros((n, 2))
    data = smf_bytes(program, notes, ccs, bank=bank, tuning=tuning)
    y = _render_bytes(data, gain, soundfont)
    off = fluid_offset(soundfont)
    y = y[off:]
    if length_s is not None:
        n = int(round(length_s * SR))
        y = y[:n] if len(y) >= n else np.concatenate([y, np.zeros((n - len(y), 2))])
    return y


# ---------------------------------------------------------------- tuning

_TUNING: dict = {}
NOTE_S, GAP_S = 1.8, 0.5  # measuring notes: held 1.8 s, 0.5 s apart


def _pitch_track(y: np.ndarray, t0: float, t1: float, f_nom: float, hop: float = 0.02, win: float = 0.25):
    """Pitch track (cents from f_nom) of the strongest of harmonics 1 to 4, in
    a band of +-6 percent around it: 0.25 s Hann windows, zero-padded FFT,
    parabolic peak interpolation."""
    m = y.mean(axis=1) if y.ndim == 2 else y
    seg = m[int(t0 * SR):int(t1 * SR)]
    N = 1 << 17
    S = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), 1 << 18))
    f = np.fft.rfftfreq(1 << 18, 1 / SR)
    best, kbest = -1.0, 1
    for k in (1, 2, 3, 4):
        sel = (f > k * f_nom * 0.97) & (f < k * f_nom * 1.03)
        if np.any(sel) and S[sel].max() > best * (1.0 if k == 1 else 1.6):  # prefer the fundamental
            best, kbest = S[sel].max(), k
    fk = kbest * f_nom
    w = int(win * SR)
    win_ = np.hanning(w)
    ff = np.fft.rfftfreq(N, 1 / SR)
    sel = np.nonzero((ff > fk * 0.94) & (ff < fk * 1.06))[0]
    out = []
    t = t0
    while t + win <= t1:
        x = m[int(t * SR):int(t * SR) + w] * win_
        X = np.abs(np.fft.rfft(x, N))
        i = sel[np.argmax(X[sel])]
        a, b, c = np.log(X[i - 1:i + 2] + 1e-12)
        den = a - 2 * b + c
        p = 0.5 * (a - c) / den if den != 0 else 0.0
        out.append(1200 * np.log2((ff[i] + p * (ff[1] - ff[0])) / fk))
        t += hop
    return np.array(out), kbest


def measure_tuning(program: int, pitches, velocity: int = 40, soundfont: str = SOUNDFONT, bank: int = 0) -> dict:
    """{pitch: {"cents": median offset from A = 440 equal temperament, "sd": spread of the pitch
    track in cents, "harmonic": the harmonic tracked}} for each pitch, from one
    deterministic fluidsynth render (cached like every render)."""
    todo = sorted({int(p) for p in pitches} - {k[1] for k in _TUNING if k[0] == (program, bank, velocity)})
    if todo:
        notes = [(0.3 + i * (NOTE_S + GAP_S), 0.3 + i * (NOTE_S + GAP_S) + NOTE_S, p, velocity)
                 for i, p in enumerate(todo)]
        y = render(program, notes, [], length_s=notes[-1][1] + 1.0, gain=0.6, soundfont=soundfont, bank=bank)
        for (on, off, p, _) in notes:
            f_nom = 440.0 * 2 ** ((p - 69) / 12.0)
            tr, k = _pitch_track(y, on + 0.45, off - 0.1, f_nom)
            _TUNING[((program, bank, velocity), p)] = {"cents": round(float(np.median(tr)), 2),
                                                       "sd": round(float(np.std(tr)), 2), "harmonic": k}
    return {int(p): _TUNING[((program, bank, velocity), int(p))] for p in pitches}


def corrections(program: int, pitches, velocity: int = 40, bank: int = 0) -> dict:
    """{pitch: cents to bend} that bring each pitch to A = 440 equal temperament."""
    t = measure_tuning(program, pitches, velocity, bank=bank)
    return {p: -v["cents"] for p, v in t.items()}


def write_mid(path: str, program: int, notes, ccs=()):
    with open(path, "wb") as fh:
        fh.write(smf_bytes(program, notes, ccs))
