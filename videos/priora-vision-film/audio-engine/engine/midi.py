"""Minimal Standard MIDI File writer and a deterministic fluidsynth renderer.

Notes are placed in absolute seconds (the score is anchored to cue times, not
to a bar grid), so the file uses one fixed tempo: 120 BPM at 960 ticks per
quarter, which is 1920 ticks per second (0.52 ms resolution).
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


def smf_bytes(program: int, notes, ccs=(), channel: int = 0, tail: float = 4.0,
              bank: int = 0) -> bytes:
    """notes: [(t_on, t_off, pitch, velocity)], ccs: [(t, controller, value)]."""
    ev = []  # (tick, order, bytes)
    ev.append((0, 0, bytes([0xB0 | channel, 0, bank])))
    ev.append((0, 1, bytes([0xC0 | channel, program])))
    ev.append((0, 2, bytes([0xB0 | channel, 7, 100])))    # channel volume fixed
    ev.append((0, 2, bytes([0xB0 | channel, 91, 0])))     # no built-in reverb send
    ev.append((0, 2, bytes([0xB0 | channel, 93, 0])))     # no built-in chorus send
    last = 0.0
    for (t, c, v) in ccs:
        ev.append((int(round(t * TICKS_PER_S)), 3, bytes([0xB0 | channel, int(c), int(np.clip(v, 0, 127))])))
        last = max(last, t)
    for (on, off, p, v) in notes:
        a = int(round(on * TICKS_PER_S))
        b = max(int(round(off * TICKS_PER_S)), a + 1)
        ev.append((a, 5, bytes([0x90 | channel, int(p), int(np.clip(v, 1, 127))])))
        ev.append((b, 4, bytes([0x80 | channel, int(p), 0])))  # offs before ons at a tick
        last = max(last, off)
    end_tick = int(round((last + tail) * TICKS_PER_S))
    ev.append((end_tick, 6, bytes([0xB0 | channel, 121, 0])))  # reset controllers: an anchor at the end
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
           soundfont: str = SOUNDFONT, bank: int = 0) -> np.ndarray:
    """Render one instrument part to a stereo float array aligned to t = 0."""
    if not notes:
        n = int(round((length_s or 1.0) * SR))
        return np.zeros((n, 2))
    data = smf_bytes(program, notes, ccs, bank=bank)
    y = _render_bytes(data, gain, soundfont)
    off = fluid_offset(soundfont)
    y = y[off:]
    if length_s is not None:
        n = int(round(length_s * SR))
        y = y[:n] if len(y) >= n else np.concatenate([y, np.zeros((n - len(y), 2))])
    return y


def write_mid(path: str, program: int, notes, ccs=()):
    with open(path, "wb") as fh:
        fh.write(smf_bytes(program, notes, ccs))
