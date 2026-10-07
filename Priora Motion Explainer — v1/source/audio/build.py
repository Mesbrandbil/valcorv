#!/usr/bin/env python3
"""Priora motion explainer: the sound engine (sound design, music, mix and master).

Deterministic and offline. Every sound is synthesised here (no samples, no network),
every random choice is seeded, so two runs write bit-identical files.

Inputs
  index.html (headless Chrome)    the picture's sound events, <script id="pk-events">
  narration/timing.json           voice line and word times (ducking, music turns)
  assets/audio/voice.wav          narrator + worker (scripts/voice.py, about -19 LUFS mono)
  assets/audio/voice-worker.wav   the worker's voice note alone

Outputs (48 kHz, 24-bit, stereo, exactly 90.000 s = 4,320,000 samples)
  assets/audio/music.wav                 music stem, ducked under the voice, at master level
  assets/audio/sfx.wav                   sound-design stem, at master level
  assets/audio/master.wav                voice + music + sfx, -16 LUFS, <= -1 dBTP
  assets/audio/master-no-narration.wav   worker voice note + music + sfx, -17 LUFS, <= -1 dBTP
  audio/events.json                      the extracted event list
  audio/report.json                      QA measurements and spec checks

Usage (from anywhere)
  python3 audio/build.py                  # extract events with Chrome, build everything
  python3 audio/build.py --cached-events  # reuse audio/events.json instead of running Chrome

docs/sound.md describes the sound of every event kind, the music plan and the mix targets.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import re
import subprocess
import sys
import zlib
from collections import Counter
from functools import lru_cache
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.signal import butter, fftconvolve, lfilter, resample_poly, sosfilt, sosfiltfilt

# ---------------------------------------------------------------------------------------------
# constants

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "audio"
OUT_DIR = ROOT / "assets" / "audio"
EVENTS_JSON = AUDIO_DIR / "events.json"
REPORT_JSON = AUDIO_DIR / "report.json"
TIMING_JSON = ROOT / "narration" / "timing.json"

SR = 48000
DUR = 90.0
N = int(round(DUR * SR))  # 4,320,000
A4 = 440.0

# Level plan, in the "mix frame": the voice is placed as dual mono at its file level
# (voice.wav at about -19 LUFS mono measures about -16 LUFS as L = R), so the mix frame
# is within a fraction of a dB of the final master.
REF_EVENT_LUFS = -21.0  # an event with gain_db 0 and trim 0 peaks at this 100 ms loudness
EVENT_JITTER_DB = 0.6  # seeded per-instance level variation (organic, not mechanical)
MUSIC_LUFS = -28.5  # music bed integrated loudness before ducking (cut 3: lowered with the shallower duck)
MUSIC_PAUSE_CAP_LUFS = -26.0  # master frame: the bed never rises above this momentary loudness (no pumping)
MUSIC_MAX_MOVE_DB = 6.0  # QA: the bed never moves more than this within 1 s
SFX_CAP_LUFS = -25.0  # sfx bus leveller: momentary (400 ms) ceiling, catches pile-ups only
HIERARCHY_CAP_LUFS = -28.0  # every event except the deviation and the human's decision stays at or under this (100 ms)
S7_SOFTER = (78.0, 84.0, ("lock", "decision", "resolve"), -3.0)  # the densest passage, under "stays in control"
SMALL_KINDS = ("speech-fragment", "packet")  # not lifted with the background in the no-narration master
NONAR_SFX_W01_PEAK_DBFS = -20.0  # QA: sfx peak under the worker's voice note in the no-narration master

# Voice levelling in the mix (voice.wav stays the raw stem)
NARRATOR_TARGET_LUFS = -16.0  # every narrator sentence, measured in the master
NARRATOR_TOL = 1.0
WORKER_TARGET_LUFS = -16.5  # the worker's voice note, just under the narrator
RIDES = (("L06", "kept", 1, 4.0),)  # short gain rides on single words: (line, word, occurrence, dB)

MASTER_LUFS = -16.0
NONAR_LUFS = -17.0
LUFS_TOL = 0.5
TP_MAX = -1.0  # dBTP, oversampled 4x
LIMITER_CEILING = -1.3  # dBTP the limiter aims at (0.3 dB of safety)

DUCK_NARRATOR_DB = 5.0
DUCK_WORKER_DB = 5.0
DUCK_ATTACK = 0.35  # s, the ramp ends at the first sound of the line
DUCK_HOLD = 0.10  # s after the last sound of the line
DUCK_RELEASE = 1.50  # s
DUCK_BRIDGE = 2.00  # s, gaps shorter than this stay ducked (no pumping between lines)

BED_FADE = (88.7, 1.2)  # the music's final raised-cosine fade: start, length (silent from 89.9)
WORDMARK_SILENT_AT = 89.9  # the wordmark note decays naturally to -60 dB (re its peak) by here
END_SAFE = 89.95  # no event sound may run past this (then a fade); outputs end in silence
FADE_OUT = (89.93, 89.995)  # final raised-cosine fade on every output, then digital zero

WARNINGS: list[str] = []


def warn(msg: str) -> None:
    WARNINGS.append(msg)
    print("WARNING: " + msg, file=sys.stderr)


# ---------------------------------------------------------------------------------------------
# small DSP helpers


def db(x: float) -> float:
    return 20.0 * math.log10(max(float(x), 1e-12))


def undb(d: float) -> float:
    return 10.0 ** (d / 20.0)


def hz(m: float) -> float:
    return A4 * 2.0 ** ((m - 69.0) / 12.0)


KEY_PCS = {2, 4, 6, 7, 9, 11, 1}  # D major: D E F# G A B C#


def snap(f: float) -> float:
    """Nearest pitch of the D major collection (A = 440): every pitched sound shares the music's key."""
    m = 69.0 + 12.0 * math.log2(f / A4)
    best = min((r for r in range(int(m) - 2, int(m) + 3) if r % 12 in KEY_PCS), key=lambda r: (abs(r - m), r))
    return hz(best)


def seed_of(*parts) -> int:
    return zlib.crc32("|".join(str(p) for p in parts).encode("utf-8"))


def rng_for(*parts) -> np.random.Generator:
    return np.random.default_rng(seed_of(*parts))


def tax(n: int) -> np.ndarray:
    return np.arange(n) / SR


def ns(seconds: float) -> int:
    return max(1, int(round(seconds * SR)))


def rc(x):
    """Raised-cosine 0..1 ramp of a 0..1 parameter."""
    x = np.clip(x, 0.0, 1.0)
    return 0.5 - 0.5 * np.cos(np.pi * x)


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def ramp_on(n: int) -> np.ndarray:
    return rc(np.arange(n) / max(1, n))


@lru_cache(maxsize=None)
def _sos(btype: str, freq, order: int):
    return butter(order, freq, btype=btype, fs=SR, output="sos")


def lp(x, fc, order=2):
    return sosfilt(_sos("lowpass", float(min(fc, 0.45 * SR)), order), x, axis=0)


def hp(x, fc, order=2):
    return sosfilt(_sos("highpass", float(fc), order), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(_sos("bandpass", (float(lo), float(min(hi, 0.45 * SR))), order), x, axis=0)


def rms(x) -> float:
    return float(np.sqrt(np.mean(np.square(x)) + 1e-30))


def cnoise(rng, n, lo, hi, order=2):
    """Band-limited noise of unit RMS (filter warm-up discarded)."""
    pad = 2048
    w = rng.standard_normal(n + pad)
    if lo <= 0:
        y = lp(w, hi, order)
    elif hi >= 0.45 * SR:
        y = hp(w, lo, order)
    else:
        y = bp(w, lo, hi, order)
    y = y[pad:]
    return y / rms(y)


def env_exp(n, tau, att=0.001):
    e = np.exp(-tax(n) / max(tau, 1e-4))
    a = min(n, int(att * SR))
    if a > 1:
        e[:a] *= ramp_on(a)
    return e


def arch(n, att=0.3, rel=0.4, power=1.0):
    """Smooth swell: raised-cosine attack over att, release over rel (fractions of n)."""
    x = np.arange(n) / max(1, n - 1)
    e = np.minimum(rc(x / max(att, 1e-3)), rc((1.0 - x) / max(rel, 1e-3)))
    return e**power


def modes(n, freqs, amps, taus, att=0.001, phases=None):
    """Sum of exponentially damped sinusoids (modal synthesis)."""
    t = tax(n)
    x = np.zeros(n)
    for i, (f, a, tau) in enumerate(zip(freqs, amps, taus)):
        if a == 0 or f >= 0.45 * SR:
            continue
        ph = 0.0 if phases is None else phases[i]
        x += a * np.exp(-t / tau) * np.sin(2 * np.pi * f * t + ph)
    k = min(n, int(att * SR))
    if k > 1:
        x[:k] *= ramp_on(k)
    return x


def phase_of(fcurve):
    return 2 * np.pi * np.cumsum(fcurve) / SR


def nb_noise(rng, n, fcurve, bw):
    """Narrow-band noise of unit RMS centred on a (time-varying) frequency (heterodyned)."""
    sos = _sos("lowpass", float(bw / 2.0), 2)
    pad = 4096
    i = sosfilt(sos, rng.standard_normal(n + pad))[pad:]
    q = sosfilt(sos, rng.standard_normal(n + pad))[pad:]
    ph = phase_of(np.broadcast_to(fcurve, (n,)))
    y = i * np.cos(ph) - q * np.sin(ph)
    return y / rms(y)


# ---------------------------------------------------------------------------------------------
# materials (all mono, peak or RMS around 1; every event is loudness-calibrated afterwards)


def wood(rng, dur, f, decay=0.05, hard=0.5):
    """Small wooden piece struck: inharmonic modes plus a soft contact noise. hard 0..1 (felt..wood)."""
    n = ns(dur)
    f = snap(f) * 2.0 ** (rng.uniform(-6, 6) / 1200.0)  # in key, a few cents of natural variation
    ratios = (1.0, 2.57, 4.21, 6.30)
    amps = (1.0, 0.10 + 0.50 * hard, 0.25 * hard, 0.10 * hard)
    taus = (decay, decay * 0.60, decay * 0.40, decay * 0.25)
    ph = rng.uniform(0, 0.3, 4)
    x = modes(n, [f * r for r in ratios], amps, taus, att=0.0004 + 0.003 * (1.0 - hard), phases=ph)
    x += cnoise(rng, n, 1200, 7000) * env_exp(n, 0.0008 + 0.0015 * (1.0 - hard), att=0.0002) * 0.22 * hard
    return lp(x, 2000 + 7000 * hard)


def felt_thud(rng, dur, f=80.0, decay=0.09, drop=0.3):
    """Low soft felt thud: a sine whose pitch settles from above, plus low felt noise."""
    n = ns(dur)
    t = tax(n)
    f = snap(f)
    fc = f * (1.0 + drop * np.exp(-t / 0.018))
    x = np.sin(phase_of(fc)) * env_exp(n, decay, att=0.004)
    x += cnoise(rng, n, 0, 320) * env_exp(n, 0.022, att=0.003) * 0.35
    return x


def tine(rng, dur, f, decay=1.4, strike=0.35, cents=None):
    """A glass or metal tine struck very softly (cantilever modes 1 : 6.27, with a faint 2.76).
    cents: optional array (detune over time) for settling or drifting tines."""
    n = ns(dur)
    t = tax(n)
    det = 1.0 if cents is None else 2.0 ** (np.asarray(cents)[:n] / 1200.0)
    x = np.zeros(n)
    for r, a, tf in ((1.0, 1.0, 1.0), (2.756, 0.03 * strike, 0.22), (6.267, 0.10 * strike, 0.09)):
        if f * r >= 0.42 * SR:
            continue
        fc = f * r * det
        ph = phase_of(np.broadcast_to(fc, (n,))) + rng.uniform(0, 2 * np.pi)
        x += a * np.exp(-t / (decay * tf)) * np.sin(ph)
    k = int((0.0025 + 0.004 * (1.0 - strike)) * SR)
    x[:k] *= ramp_on(k)
    x += cnoise(rng, n, 0, 3000) * env_exp(n, 0.0015, att=0.0004) * 0.015 * strike
    return x


def mallet(rng, dur, f, decay=1.4, att=0.008, bright=0.15):
    """Soft felt mallet on a warm bar: near-sine with faint 2nd and 3rd partials."""
    n = ns(dur)
    t = tax(n)
    x = np.exp(-t / decay) * np.sin(2 * np.pi * f * t)
    x += bright * np.exp(-t / (decay * 0.45)) * np.sin(2 * np.pi * 2.0 * f * t + rng.uniform(0, 6.28))
    x += bright * 0.35 * np.exp(-t / (decay * 0.3)) * np.sin(2 * np.pi * 3.01 * f * t + rng.uniform(0, 6.28))
    k = int(att * SR)
    x[:k] *= ramp_on(k)
    x += cnoise(rng, n, 0, 1800) * env_exp(n, 0.003, att=0.001) * 0.02
    return lp(x, 3000)


def hollow(rng, dur, f, decay=0.07, bend=0.0):
    """Hollow wooden tube tok (odd partials); bend > 0 lifts the pitch a little, like a question."""
    n = ns(dur)
    t = tax(n)
    f = snap(f * (1.0 + bend)) / (1.0 + bend)  # the bend lands in key
    fc = f * (1.0 + bend * smoothstep(t / 0.045))
    ph = phase_of(fc)
    x = np.exp(-t / decay) * np.sin(ph)
    x += 0.30 * np.exp(-t / (decay * 0.5)) * np.sin(3 * ph)
    x += 0.10 * np.exp(-t / (decay * 0.3)) * np.sin(5 * ph)
    k = int(0.0015 * SR)
    x[:k] *= ramp_on(k)
    x += cnoise(rng, n, 1000, 5000) * env_exp(n, 0.0012, att=0.0003) * 0.10
    return lp(x, 3500)


def mech_click(rng, f0=2100.0, size=1.0):
    """Soft small mechanism click (latch), felt-damped: high modes plus a low plastic body."""
    n = ns(0.06)
    x = modes(n, [f0, f0 * 1.63, f0 * 2.72], [1.0, 0.6, 0.3], [0.010 * size, 0.007 * size, 0.004 * size], att=0.0003)
    x += modes(n, [640.0 * rng.uniform(0.97, 1.03)], [0.6], [0.016 * size], att=0.0006)
    x += cnoise(rng, n, 1500, 9000) * env_exp(n, 0.0006, att=0.0001) * 0.25
    return lp(x, 7000)


def paper_flick(rng, length=0.05, tau=0.007):
    """Tiny soft paper flick: a breath of high paper noise with two or three micro crackles."""
    n = ns(length)
    x = cnoise(rng, n, 1500, 8000) * env_exp(n, tau, att=0.0006)
    m = ns(0.0015)
    for _ in range(int(rng.integers(2, 4))):
        p = int(rng.uniform(0.001, 0.018) * SR)
        if p + m < n:
            x[p : p + m] += cnoise(rng, m + 64, 2500, 9000)[:m] * env_exp(m, 0.0004, att=0.0001) * rng.uniform(0.4, 0.9)
    return hp(x, 900)


def graphite(rng, dur, grain=0.7, lo=1500, hi=6500):
    """Soft graphite on paper: scratchy band noise with stick-slip grain."""
    n = ns(dur)
    base = cnoise(rng, n, lo, hi)
    g = np.abs(cnoise(rng, n, 0, 90)) ** 1.6
    g /= g.mean() + 1e-12
    x = base * ((1.0 - 0.6 * grain) + 0.6 * grain * g)
    x += cnoise(rng, n, 250, 900) * 0.18
    return x * arch(n, min(0.4, 0.012 / max(dur, 1e-3)), min(0.5, 0.025 / max(dur, 1e-3)))


def graphite_dab(rng, length=0.028):
    n = ns(length)
    return graphite(rng, length, grain=0.85) * env_exp(n, length * 0.35, att=0.002)


def paper_slide(rng, dur, att=0.4, rel=0.5):
    """Very soft paper slide: static mid band (no sweep, so never a whoosh) with a gentle grain."""
    n = ns(dur)
    am = 1.0 + 0.3 * cnoise(rng, n, 0, 14)
    x = cnoise(rng, n, 500, 4000) * am + cnoise(rng, n, 150, 500) * 0.25
    return x * arch(n, att, rel)


def air(rng, dur, att=0.45, rel=0.55):
    """A soft breath of air: low, smooth, static band."""
    n = ns(dur)
    am = 1.0 + 0.15 * cnoise(rng, n, 0, 4)
    return cnoise(rng, n, 120, 1100) * am * arch(n, att, rel)


def friction(rng, dur, lo=250, hi=1500, rate=55.0):
    """Wood sliding on wood: band noise driven by an irregular stick-slip pulse train."""
    n = ns(dur)
    train = np.zeros(n)
    pos = 0.0
    while True:
        pos += SR / rate * (1.0 + 0.35 * rng.uniform(-1, 1))
        i = int(pos)
        if i >= n:
            break
        train[i] = rng.uniform(0.3, 1.0)
    am = lfilter([1.0], [1.0, -math.exp(-1.0 / (0.005 * SR))], train)
    am /= am.max() + 1e-9
    return cnoise(rng, n, lo, hi) * (0.4 + 1.6 * am)


# ---------------------------------------------------------------------------------------------
# sound events: one synth per kind


class Snd:
    """A small layered sound: mono layers placed in time (seconds, may be negative = pre-roll)
    and in the stereo field (pan offsets added to the event's pan)."""

    def __init__(self):
        self.layers = []

    def add(self, x, at=0.0, pan=0.0, gain=1.0):
        self.layers.append((int(round(at * SR)), np.asarray(x, dtype=np.float64) * gain, pan))
        return self

    def render(self, base_pan: float):
        s0 = min(s for s, _, _ in self.layers)
        s1 = max(s + len(x) for s, x, _ in self.layers)
        out = np.zeros((s1 - s0, 2))
        for s, x, p in self.layers:
            th = (float(np.clip(base_pan + p, -1.0, 1.0)) + 1.0) * np.pi / 4.0  # constant power
            out[s - s0 : s - s0 + len(x), 0] += x * math.cos(th)
            out[s - s0 : s - s0 + len(x), 1] += x * math.sin(th)
        return out, -s0 / SR


def ev_dur(ev, default, lo=0.08, hi=4.0):
    try:
        d = float(ev.get("dur", default))
    except (TypeError, ValueError):
        d = default
    if not math.isfinite(d):
        d = default
    return float(np.clip(d, lo, hi))


HINT_KEYS = ("part", "material", "size", "agent", "room", "variant")


def hint(ev) -> str:
    """Free-text hints the picture may add to an event (part, material, size, agent, room, variant)."""
    return " ".join(str(ev.get(k, "")) for k in HINT_KEYS).lower()


def is_distant(ev) -> bool:
    """Simulated things (the Transfer room) sound muted, hollow and a little distant."""
    return ev["kind"] in DISTANT_KINDS or "sim" in hint(ev) or "transfer" in hint(ev)


AGENT_PITCH = (("site", 74), ("rule", 74), ("insurer", 76), ("condition", 76), ("fire", 78), ("risk", 81), ("engineer", 81), ("evidence", 83), ("photo", 83))
SUMMON_CYCLE = (74, 76, 78, 81, 83)  # D5 E5 F#5 A5 B5, D major pentatonic


def agent_pitch(ev, idx):
    h = hint(ev)
    for key, m in AGENT_PITCH:
        if key in h:
            return m
    return SUMMON_CYCLE[idx % len(SUMMON_CYCLE)]


def k_print(ev, rng, idx):
    h = hint(ev)
    s = Snd()
    if "ghost" in h:  # a faint outline, not a real form: paper only, muted
        n = ns(0.15)
        return s.add(lp(cnoise(rng, n, 700, 3500) * env_exp(n, 0.02, att=0.004), 2500))
    if "small" in h:
        s.add(felt_thud(rng, 0.3, f=rng.uniform(130, 150), decay=0.05, drop=0.2))
        s.add(cnoise(rng, ns(0.08), 1200, 5000) * env_exp(ns(0.08), 0.01, att=0.0015), 0.002, gain=0.3)
        return s
    s.add(felt_thud(rng, 0.45, f=rng.uniform(92, 108), decay=0.075, drop=0.25))
    s.add(cnoise(rng, ns(0.12), 900, 4200) * env_exp(ns(0.12), 0.014, att=0.002), 0.002, gain=0.30)
    s.add(cnoise(rng, ns(0.08), 2500, 8000) * env_exp(ns(0.08), 0.012, att=0.006), 0.05, gain=0.07)
    return s


def k_speech_fragment(ev, rng, idx):
    """A tiny soft paper flick: 3.5 ms attack, about 15 ms decay, low-passed at 4.5 kHz."""
    n = ns(0.03)
    t = tax(n)
    a = ns(0.0035)
    e = np.exp(-np.maximum(t - a / SR, 0.0) / 0.0045)
    e[:a] *= ramp_on(a)
    e *= 1.0 - rc((t - 0.012) / 0.0065)  # the decay tapers to nothing by 18.5 ms (15 ms after the peak)
    x = cnoise(rng, n, 1200, 7000) * e
    m = ns(0.0015)
    for _ in range(int(rng.integers(1, 3))):
        p = int(rng.uniform(0.002, 0.012) * SR)
        x[p : p + m] += cnoise(rng, m + 64, 2000, 6000)[:m] * env_exp(m, 0.0004, att=0.0002) * rng.uniform(0.3, 0.6)
    return Snd().add(lp(hp(x, 700), 4500, 4))


def k_summon(ev, rng, idx):
    s = Snd()
    if "ghost" in hint(ev):  # agents dim to ghost outlines and back: a muted, short tine
        return s.add(lp(tine(rng, 0.9, hz(agent_pitch(ev, idx)), decay=0.5, strike=0.15), 1800))
    s.add(tine(rng, 1.4, hz(agent_pitch(ev, idx)), decay=1.0, strike=0.35))
    s.add(cnoise(rng, ns(0.15), 2000, 6000) * arch(ns(0.15), 0.3, 0.6), 0.0, gain=0.025)
    return s


ARRIVE = {  # f, decay, hardness, felt amount
    "small": (1500.0, 0.028, 0.32, 0.0),
    "facet": (1020.0, 0.040, 0.38, 0.12),
    "token": (800.0, 0.050, 0.42, 0.20),
    "agent": (800.0, 0.050, 0.42, 0.20),
    "case": (540.0, 0.060, 0.42, 0.45),
    "large": (420.0, 0.070, 0.42, 0.55),
}


AGENT_TOK = (  # each specialist's token has its own small voice: (key, f, hardness)
    ("site", 760.0, 0.55), ("rule", 760.0, 0.55),  # rounded square: firmer wood
    ("insurer", 690.0, 0.45), ("condition", 690.0, 0.45),  # brackets
    ("fire", 980.0, 0.40),  # small triangle: higher
    ("risk", 860.0, 0.50), ("engineer", 860.0, 0.50),  # diamond
    ("evidence", 820.0, 0.35), ("photo", 820.0, 0.35),  # disc with a lens: softer
)


def k_arrive(ev, rng, idx):
    size = str(ev.get("size", "facet")).lower()
    f, dec, hard, felt = ARRIVE.get(size, ARRIVE["facet"])
    agent = str(ev.get("agent", "")).lower()
    for key, fa, ha in AGENT_TOK:
        if agent and key in agent:
            f, hard = fa, ha
            break
    mat = str(ev.get("material", "")).lower()
    if "felt" in mat:
        hard *= 0.5
    elif "wood" in mat:
        hard = min(0.8, hard * 1.4)
    f *= rng.uniform(0.97, 1.03)
    s = Snd()
    s.add(wood(rng, 0.3, f, dec, hard))
    if felt:
        s.add(felt_thud(rng, 0.3, f=f / 4.5, decay=0.05, drop=0.2), gain=felt)
    s.add(cnoise(rng, ns(0.05), 1500, 6000) * env_exp(ns(0.05), 0.004, att=0.0005), gain=0.05)
    return s


def k_move(ev, rng, idx):
    d = ev_dur(ev, 0.8)
    h = hint(ev)
    if "paper" in h:
        return Snd().add(paper_slide(rng, d))
    if "step" in h:  # one short orthogonal step of a token: a tiny slide and a soft tick
        s = Snd().add(paper_slide(rng, 0.11, 0.3, 0.5), 0.0, gain=0.5)
        return s.add(wood(rng, 0.1, 1300 * rng.uniform(0.97, 1.03), 0.018, 0.35), 0.1)
    if "wood" in h:  # a wooden piece slid along a rail
        n = ns(d)
        return Snd().add(friction(rng, d, 300, 1800, 70.0) * arch(n, 0.3, 0.35))
    if "case" in h or "packet" in h:  # a small weighted piece slid over paper: lower, softer
        n = ns(d)
        return Snd().add((cnoise(rng, n, 200, 1800) + 0.3 * cnoise(rng, n, 1800, 4000)) * arch(n, 0.35, 0.5))
    return Snd().add(air(rng, d))


def thread_pull(rng, d):
    n = ns(d)
    t = tax(n)
    f0 = rng.uniform(1900, 2300)
    fc = f0 * (1.0 + 0.05 * smoothstep(t / d))
    x = nb_noise(rng, n, fc, 25) * 0.6 + nb_noise(rng, n, 2 * fc, 50) * 0.22
    x += cnoise(rng, n, 3000, 9000) * 0.3
    x *= arch(n, 0.45, 0.2)
    m = ns(0.25)
    pl = np.sin(2 * np.pi * fc[-1] * tax(m)) * env_exp(m, 0.05, att=0.001)
    return x, pl


def k_thread(ev, rng, idx):
    d = ev_dur(ev, 0.6)
    h = hint(ev)
    s = Snd()
    if any(k in h for k in ("pencil", "graphite", "ink", "line")):
        s.add(graphite(rng, d, grain=0.7) * arch(ns(d), 0.15, 0.3))
    else:
        x, pl = thread_pull(rng, d)
        s.add(x).add(pl, d - 0.01, gain=0.22)
    return s


def k_packet(ev, rng, idx):
    s = Snd()
    if "small" in hint(ev):
        s.add(paper_flick(rng), 0.0, gain=0.6)
        return s.add(wood(rng, 0.2, 820 * rng.uniform(0.97, 1.03), 0.035, 0.3), 0.05)
    s.add(paper_flick(rng), 0.0, gain=0.7).add(paper_flick(rng), 0.045, gain=0.5)
    s.add(wood(rng, 0.25, 620 * rng.uniform(0.97, 1.03), 0.05, 0.3), 0.085)
    s.add(felt_thud(rng, 0.25, f=140, decay=0.04), 0.085, gain=0.3)
    return s


def wood_tick(rng, f=2400.0, hard=0.25, dec=0.012):
    return wood(rng, 0.08, f * rng.uniform(0.97, 1.03), dec, hard)


def k_inspect(ev, rng, idx):
    h = hint(ev)
    s = Snd()
    if "fire" in h:  # three small dots, then a soft ping of arcs
        for k in range(3):
            s.add(wood_tick(rng, 2600), 0.07 * k, gain=0.6)
        s.add(tine(rng, 0.9, hz(81), decay=0.5, strike=0.2), 0.24, gain=0.3)
    elif "site" in h or "rule" in h:  # a straight ruled line with end ticks
        s.add(wood_tick(rng, 2200), 0.0, gain=0.5)
        s.add(graphite(rng, 0.35, grain=0.3) * arch(ns(0.35), 0.1, 0.1), 0.01, gain=0.7)
        s.add(wood_tick(rng, 2200), 0.37, gain=0.5)
    elif "insurer" in h or "bracket" in h or "condition" in h:  # brackets open and close
        s.add(wood(rng, 0.1, 760 * rng.uniform(0.97, 1.03), 0.02, 0.45), 0.0)
        s.add(wood(rng, 0.1, 720 * rng.uniform(0.97, 1.03), 0.02, 0.45), 0.2, gain=0.85)
    elif "risk" in h or "engineer" in h:  # a dry quarter turn, then a dashed radius
        s.add(wood_tick(rng, 1800), 0.0, gain=0.6).add(wood_tick(rng, 1700), 0.05, gain=0.5)
        for k in range(4):
            s.add(graphite_dab(rng), 0.2 + 0.08 * k, gain=0.5)
    elif "evidence" in h or "lens" in h or "photo" in h:  # corners close on the photo, a tick
        s.add(mech_click(rng, 2300, 0.8), 0.0, gain=0.6)
        s.add(tine(rng, 0.6, hz(86), decay=0.35, strike=0.2), 0.12, gain=0.25)
    else:  # two soft graphite dabs and a tiny tick
        s.add(graphite_dab(rng), 0.0).add(graphite_dab(rng), 0.09, gain=0.8)
        s.add(wood_tick(rng, 2400), 0.16, gain=0.4)
    return s


def k_evidence(ev, rng, idx):
    f0 = 2100 * rng.uniform(0.98, 1.02)
    s = Snd()
    s.add(mech_click(rng, f0)).add(mech_click(rng, f0 * 0.93), 0.078, gain=0.7)
    part = str(ev.get("part", "")).lower()
    if "send" in part:
        s.add(paper_slide(rng, 0.25, 0.3, 0.6), 0.10, gain=0.25)
    elif "accept" in part or "fill" in part:
        s.add(wood(rng, 0.2, 700, 0.04, 0.25), 0.16, gain=0.5)
    return s


def k_request(ev, rng, idx):
    s = Snd()
    if "timer" in hint(ev):  # a dashed timer ring running out: soft ticks, fading, nothing answers
        d = ev_dur(ev, 0.7, 0.3, 3.0)
        k_n = max(4, int(round(d / 0.11)))
        for k in range(k_n):
            s.add(wood_tick(rng, 2000, 0.2, 0.01), d * k / k_n, gain=0.6 * (1.0 - 0.7 * k / k_n))
        return s
    for k in range(4):  # the dashed thread
        s.add(graphite_dab(rng, 0.025), 0.07 * k, gain=0.35 * (1.0 - 0.12 * k))
    s.add(hollow(rng, 0.35, 520 * rng.uniform(0.98, 1.02), decay=0.07, bend=0.07), 0.30)
    s.add(tine(rng, 0.9, hz(76), decay=0.6, strike=0.25), 0.36, gain=0.16)
    return s


def k_return(ev, rng, idx):
    s = Snd()
    s.add(wood(rng, 0.2, 1700 * rng.uniform(0.97, 1.03), 0.022, 0.3))
    s.add(tine(rng, 0.8, hz(86), decay=0.5, strike=0.2), 0.01, gain=0.2)
    return s


def k_align(ev, rng, idx):
    s = Snd()
    n = ns(2.4)
    t = tax(n)
    voices = ((74, 22.0, 0.0, -0.3, 1.0), (81, -18.0, 0.09, 0.3, 0.8), (78, 14.0, 0.18, 0.0, 0.75))
    if "small" in hint(ev):  # two tines, lighter
        voices = ((74, 16.0, 0.0, -0.2, 1.0), (81, -14.0, 0.08, 0.2, 0.8))
    for m, c0, at, pan, g in voices:
        s.add(tine(rng, 2.4, hz(m), decay=1.7 if len(voices) == 3 else 1.1, strike=0.3, cents=c0 * np.exp(-t / 0.22)), at, pan, g)
    return s


def k_lock(ev, rng, idx):
    s = Snd()
    if any(k in hint(ev) for k in ("tick", "small")):  # a small seat or tick: lighter, higher
        s.add(mech_click(rng, 3600, 0.4), -0.018, gain=0.2)
        s.add(wood(rng, 0.15, 1500 * rng.uniform(0.98, 1.02), 0.025, 0.55))
        return s
    s.add(mech_click(rng, 3300, 0.5), -0.022, gain=0.25)
    s.add(wood(rng, 0.2, 1150 * rng.uniform(0.98, 1.02), 0.035, 0.62))
    s.add(felt_thud(rng, 0.2, f=240, decay=0.045, drop=0.1), gain=0.35)
    return s


def k_deviate(ev, rng, idx):
    s = Snd()
    s.add(felt_thud(rng, 0.6, f=hz(38), decay=0.16, drop=0.25))
    s.add(tine(rng, 2.4, hz(74), decay=1.8, strike=0.28), 0.02, -0.25, 0.55)
    s.add(tine(rng, 2.4, hz(81), decay=1.8, strike=0.28), 0.05, 0.25, 0.5)
    t = tax(ns(2.4))
    drift = -12.0 - 20.0 * (1.0 - np.exp(-t / 0.6))  # F#5 slides from -12 to -32 cents
    s.add(tine(rng, 2.4, hz(78), decay=1.9, strike=0.3, cents=drift), 0.09, 0.05, 0.55)
    return s


def k_assemble(ev, rng, idx):
    small = "small" in hint(ev)
    d = ev_dur(ev, 0.45 if small else 0.6, 0.15, 1.5)
    s = Snd()
    s.add(paper_slide(rng, d, 0.7, 0.3), 0.0, gain=0.35 if small else 0.5)
    f = 820.0 if small else 650.0
    s.add(wood(rng, 0.25, f * rng.uniform(0.97, 1.03), 0.045, 0.32), d - 0.02)
    s.add(felt_thud(rng, 0.25, f=130, decay=0.04), d - 0.02, gain=0.35)
    return s


def k_escalate(ev, rng, idx):
    d = ev_dur(ev, 2.0, 0.6, 4.0)
    n = ns(d)
    t = tax(n)
    f = hz(50) * (hz(45) / hz(50)) ** smoothstep(t / d)  # D3 gliding slowly down to A2
    ph = phase_of(f)
    x = np.sin(ph) + 0.22 * (-np.sin(3 * ph) / 9.0 + np.sin(5 * ph) / 25.0) * 8 / np.pi**2
    x = lp(x, 650) * arch(n, 0.35, 0.45, 1.2)
    s = Snd().add(x)
    s.add(paper_slide(rng, d, 0.4, 0.5), 0.0, gain=0.06)
    return s


def k_door_open(ev, rng, idx):
    d = ev_dur(ev, 0.42, 0.15, 1.2)
    s = Snd()
    s.add(friction(rng, d) * arch(ns(d), 0.25, 0.25), gain=0.35)
    s.add(wood(rng, 0.2, 380 * rng.uniform(0.97, 1.03), 0.05, 0.3), d, gain=0.6)
    return s


def k_door_close(ev, rng, idx):
    d = ev_dur(ev, 0.32, 0.12, 1.0)
    s = Snd()
    s.add(friction(rng, d) * arch(ns(d), 0.3, 0.2), gain=0.3)
    s.add(wood(rng, 0.25, 170 * rng.uniform(0.97, 1.03), 0.08, 0.35), d, gain=0.9)
    s.add(felt_thud(rng, 0.3, f=95, decay=0.09, drop=0.2), d, gain=0.7)
    return s


def k_reject(ev, rng, idx):
    s = Snd()
    for k, a in enumerate((1.0, 0.7, 0.45)):
        s.add(wood(rng, 0.15, 190 * rng.uniform(0.95, 1.05), 0.035, 0.3), 0.048 * k, gain=a)
        s.add(felt_thud(rng, 0.15, f=110, decay=0.03, drop=0.1), 0.048 * k, gain=0.3 * a)
    return s


def k_route(ev, rng, idx):
    d = ev_dur(ev, 1.0, 0.3, 3.0)
    n = ns(d)
    t = tax(n)
    fc = hz(81) * (0.985 + 0.015 * smoothstep(t / (0.4 * d)))  # A5 settling up into tune
    x = nb_noise(rng, n, fc, 30) * 0.55 + nb_noise(rng, n, 2 * fc, 60) * 0.18 + np.sin(phase_of(fc)) * 0.10
    x += cnoise(rng, n, 300, 2500) * 0.22
    return Snd().add(x * arch(n, 0.35, 0.55))


def k_record(ev, rng, idx):
    s = Snd()
    s.add(wood(rng, 0.1, 2300, 0.01, 0.3), 0.0, gain=0.25)  # the pencil touches
    s.add(graphite(rng, 0.035, grain=0.9) * env_exp(ns(0.035), 0.02, att=0.003), 0.005, gain=0.8)
    s.add(graphite(rng, 0.075, grain=0.9) * arch(ns(0.075), 0.2, 0.5), 0.06)
    return s


def k_compare(ev, rng, idx):
    f = (820.0, 900.0, 980.0)[idx % 3] * rng.uniform(0.98, 1.02)
    s = Snd()
    s.add(cnoise(rng, ns(0.06), 800, 5000) * env_exp(ns(0.06), 0.006, att=0.001), gain=0.35)
    s.add(wood(rng, 0.25, f, 0.045, 0.45), 0.004)
    s.add(felt_thud(rng, 0.2, f=220, decay=0.03, drop=0.1), 0.004, gain=0.3)
    return s


def k_resolve(ev, rng, idx):
    s = Snd()
    for k, (m, g) in enumerate(((62, 1.0), (66, 0.8), (69, 0.75))):
        s.add(mallet(rng, 2.6, hz(m), decay=1.5), 0.035 * k, (k - 1) * 0.3, g)
    return s


def k_decision(ev, rng, idx):
    """The human's black line: a low wooden bar (D3, marimba-like 1 : 4 : 10 tuning), firm mallet.
    part 'reach' (the line reaching to open a door) is the same bar, struck lighter and shorter."""
    reach = "reach" in hint(ev)
    n = ns(1.0 if reach else 1.8)
    f = hz(50)
    dec = 0.38 if reach else 0.7
    x = modes(n, [f, 3.99 * f, 9.95 * f], [1.0, 0.22 if reach else 0.32, 0.04 if reach else 0.07], [dec, dec * 0.28, 0.05], att=0.0016 if reach else 0.0012, phases=rng.uniform(0, 0.4, 3))
    x += cnoise(rng, n, 0, 2500) * env_exp(n, 0.002, att=0.0004) * (0.10 if reach else 0.18)
    x += np.sin(2 * np.pi * hz(38) * tax(n)) * env_exp(n, 0.18 if reach else 0.25, att=0.004) * 0.35
    return Snd().add(lp(x, 2600 if reach else 3500))


def k_simulated(ev, rng, idx):
    s = Snd()
    s.add(hollow(rng, 0.5, 330 * rng.uniform(0.98, 1.02), decay=0.09))
    s.add(tine(rng, 1.2, hz(71), decay=0.8, strike=0.2), 0.04, gain=0.25)
    return s


def k_title(ev, rng, idx):
    n = ns(0.6)
    e = np.minimum(rc(tax(n) / 0.07), np.exp(-np.maximum(tax(n) - 0.07, 0) / 0.13))
    s = Snd().add(cnoise(rng, n, 150, 2200) * e)
    s.add(felt_thud(rng, 0.3, f=90, decay=0.05), 0.06, gain=0.3)
    return s


def k_wordmark(ev, rng, idx):
    """One soft low note (felt mallet on D3 over a D2 body). Its decay is natural (exponential, no
    fade) and timed so the note is 60 dB down by WORDMARK_SILENT_AT, whatever its start time."""
    avail = WORDMARK_SILENT_AT - float(ev["t"])
    if avail < 0.8:
        warn(f"wordmark at {ev['t']} leaves only {avail:.2f} s to decay before {WORDMARK_SILENT_AT}")
    avail = max(avail, 0.3)
    tau = float(np.clip((avail - 0.12) / 6.91, 0.04, 0.85))
    n = ns(avail)
    x = mallet(rng, avail, hz(50), decay=tau, bright=0.12)
    x += np.sin(2 * np.pi * hz(38) * tax(n)) * env_exp(n, tau, att=0.012) * 0.4
    return Snd().add(x)


# kind -> (synth, trim dB against REF_EVENT_LUFS, reverb send into the small room); docs/sound.md describes each
KINDS = {
    "print": (k_print, 0.0, 0.18),
    "speech-fragment": (k_speech_fragment, -10.0, 0.08),
    "summon": (k_summon, -6.0, 0.30),
    "arrive": (k_arrive, -2.0, 0.15),
    "move": (k_move, -6.0, 0.12),
    "thread": (k_thread, -6.0, 0.15),
    "packet": (k_packet, -4.0, 0.15),
    "inspect": (k_inspect, -6.0, 0.15),
    "evidence": (k_evidence, -2.0, 0.12),
    "request": (k_request, -4.0, 0.20),
    "return": (k_return, -6.0, 0.20),
    "align": (k_align, -3.0, 0.35),
    "lock": (k_lock, -2.0, 0.15),
    "deviate": (k_deviate, -3.0, 0.30),
    "assemble": (k_assemble, -4.0, 0.15),
    "escalate": (k_escalate, -4.0, 0.30),
    "door-open": (k_door_open, -4.0, 0.20),
    "door-close": (k_door_close, -4.0, 0.20),
    "reject": (k_reject, -4.0, 0.15),
    "route": (k_route, -4.0, 0.30),
    "record": (k_record, -6.0, 0.10),
    "compare": (k_compare, -4.0, 0.15),
    "resolve": (k_resolve, -4.0, 0.35),
    "decision": (k_decision, -4.0, 0.25),
    "simulated": (k_simulated, -5.0, 0.30),
    "title": (k_title, -6.0, 0.20),
    "wordmark": (k_wordmark, -3.0, 0.12),
}
UNKNOWN_FALLBACK = "arrive"  # a soft facet tok
DISTANT_KINDS = {"simulated"}  # always muted, hollow and distant; any event with 'sim' in part/material too

# ---------------------------------------------------------------------------------------------
# events: extraction and rendering


def extract_events_chrome() -> list:
    chrome = ROOT / "scripts" / "chrome" / "chrome-headless-shell"
    cmd = [str(chrome), "--headless", "--no-sandbox", "--allow-file-access-from-files", "--virtual-time-budget=5000", "--dump-dom", (ROOT / "index.html").as_uri()]
    p = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True, timeout=180)
    m = re.search(r'<script[^>]*\bid="pk-events"[^>]*>(.*?)</script>', p.stdout, re.S)
    if not m:
        raise RuntimeError("no <script id=pk-events> in the dumped DOM (chrome exit %s)" % p.returncode)
    data = json.loads(html.unescape(m.group(1)).strip() or "[]")
    if not isinstance(data, list):
        raise RuntimeError("pk-events is not a JSON list")
    return data


def clean_events(raw: list) -> list:
    evs = []
    for i, e in enumerate(raw):
        if not isinstance(e, dict) or "kind" not in e:
            warn(f"event {i} ignored: not an object with a kind: {e!r}")
            continue
        try:
            t = float(e.get("t"))
        except (TypeError, ValueError):
            warn(f"event {i} ({e.get('kind')}) ignored: bad t {e.get('t')!r}")
            continue
        if not math.isfinite(t):
            warn(f"event {i} ({e.get('kind')}) ignored: t not finite")
            continue
        d = dict(e)
        d["kind"] = str(e["kind"])
        d["t"] = round(t, 4)
        evs.append(d)
    evs.sort(key=lambda d: (d["t"], d["kind"], json.dumps(d, sort_keys=True)))
    out = []
    for d in evs:  # identical kind within 12 ms: one sound (stacking would only add level and phase)
        prev = next((o for o in reversed(out[-8:]) if o["kind"] == d["kind"] and abs(o["t"] - d["t"]) < 0.012), None)
        if prev is not None:
            warn(f"duplicate {d['kind']} at {d['t']} merged with {prev['t']}")
            if float(d.get("gain_db", 0) or 0) > float(prev.get("gain_db", 0) or 0):
                prev["gain_db"] = d.get("gain_db")
            continue
        out.append(d)
    return out


# BS.1770 K-weighting at 48 kHz
_KW1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
_KW2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def kweight(x):
    return lfilter(*_KW2, lfilter(*_KW1, x, axis=0), axis=0)


def window_loudness(x, win=0.4, hop=0.01):
    """Ungated K-weighted loudness of sliding windows (momentary when win = 0.4).
    Returns (window centre times, LUFS)."""
    x = np.atleast_2d(x.T).T
    k = kweight(x)
    p = np.sum(k * k, axis=1)
    W, H = ns(win), ns(hop)
    if len(p) < W:
        p = np.concatenate([p, np.zeros(W - len(p))])
    cs = np.concatenate([[0.0], np.cumsum(p)])
    st = np.arange(0, len(p) - W + 1, H)
    ms = (cs[st + W] - cs[st]) / W
    return (st + W / 2) / SR, -0.691 + 10 * np.log10(np.maximum(ms, 1e-20))


def event_loudness(st) -> float:
    pad = np.zeros((ns(0.1), 2))
    _, L = window_loudness(np.vstack([pad, st, pad]), win=0.1, hop=0.005)
    return float(L.max())


def trim_tail(st, floor_db=-75.0):
    a = np.max(np.abs(st), axis=1)
    pk = a.max()
    if pk <= 0:
        return st[:1]
    idx = np.nonzero(a > pk * undb(floor_db))[0]
    end = min(len(st), idx[-1] + ns(0.01))
    st = st[:end].copy()
    k = min(len(st), ns(0.01))
    st[-k:] *= (1.0 - ramp_on(k))[:, None]
    return st


def make_ir(seed, rt60, length, predelay, early=0, tone=(1.0, 0.8, 0.35)):
    """Synthetic stereo reverb impulse response: one white noise per channel split into three
    bands (below 500 Hz, 500 to 3500 Hz, above) that decay at their own rate, decorrelated left
    and right, optional early reflections. Normalised so the mean energy response over
    200 to 4000 Hz is 1: a send of s then puts the reverb about 20 log10(s) dB under the dry sound."""
    rng = np.random.default_rng(seed)
    n = ns(length)
    t = tax(n)
    out = np.zeros((n, 2))
    pad = 4096
    for ch in range(2):
        w = rng.standard_normal(n + pad)  # equal spectral density in every band
        bands = (lp(w, 500, 4)[pad:], bp(w, 500, 3500, 2)[pad:], hp(w, 3500, 4)[pad:])
        x = sum(g * b * np.exp(-6.91 * t / rt) for g, b, rt in zip(tone, bands, rt60))
        k = ns(0.005)
        x[:k] *= ramp_on(k)
        for _ in range(early):
            p = int(rng.uniform(0.003, 0.03) * SR)
            x[p] += rng.uniform(0.3, 0.6) * rng.choice([-1.0, 1.0]) * np.abs(x).max()
        x = np.concatenate([np.zeros(ns(predelay)), x])[:n]
        k = ns(length * 0.1)
        x[-k:] *= 1.0 - ramp_on(k)
        H = np.abs(np.fft.rfft(x)) ** 2
        f = np.fft.rfftfreq(n, 1 / SR)
        out[:, ch] = x / np.sqrt(H[(f >= 200) & (f <= 4000)].mean())
    return out


def convolve_st(x, ir):
    return np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)


def full_conv(x, ir):
    return np.stack([fftconvolve(x[:, c], ir[:, c]) for c in range(2)], axis=1)


def render_sfx(events):
    """Every event: synthesise, pan, add its own reverb (a small warm room; simulated things a
    larger, darker, more distant space), calibrate dry + reverb together to its target loudness
    (max 100 ms K-weighted window), place it. Then a 30 Hz high-pass and the bus leveller."""
    out = np.zeros((N, 2))
    out_small = np.zeros((N, 2))
    placed = []
    per_kind_idx = Counter()
    same_t = Counter()
    human_decision = None  # the first full decision (not a 'reach'): with the deviation, the loudest moments
    for ev in events:
        if ev["kind"] == "decision" and "reach" not in hint(ev):
            human_decision = ev
            break
    room = make_ir(seed_of("ir-room"), rt60=(0.7, 0.55, 0.35), length=1.0, predelay=0.006, early=6, tone=(1.0, 0.75, 0.3))
    far = make_ir(seed_of("ir-far"), rt60=(2.2, 1.8, 1.0), length=2.4, predelay=0.03, early=0, tone=(1.0, 0.6, 0.2))
    lim = int(END_SAFE * SR)
    for ev in events:
        kind = ev["kind"]
        spec = KINDS.get(kind)
        if spec is None:
            warn(f"unknown event kind '{kind}' at {ev['t']}: using the default soft facet tok")
            spec = KINDS[UNKNOWN_FALLBACK]
        fn, trim, send = spec
        key = (kind, round(ev["t"] * 1000))
        rng = rng_for("sfx", kind, key[1], same_t[key])
        same_t[key] += 1
        idx = per_kind_idx[kind]
        per_kind_idx[kind] += 1
        snd = fn(ev, rng, idx) if kind in KINDS else k_arrive({"size": "facet"}, rng, idx)
        try:
            pan = float(ev.get("pan", 0.0) or 0.0)
        except (TypeError, ValueError):
            pan = 0.0
        pan = float(np.clip(pan if math.isfinite(pan) else 0.0, -1.0, 1.0))
        st, pre = snd.render(pan)
        distant = is_distant(ev)
        if distant:  # muted, hollow, a little distant: darker, drier dry, more of a larger space
            st = lp(st, 1500)
            st = 0.7 * np.vstack([st, np.zeros((len(far) - 1, 2))]) + full_conv(st * 0.8, far)
        else:
            st = np.vstack([st, np.zeros((len(room) - 1, 2))]) + full_conv(st * send, room)
        st = trim_tail(st)
        try:
            gdb = float(ev.get("gain_db", 0.0) or 0.0)
        except (TypeError, ValueError):
            gdb = 0.0
        gdb = float(np.clip(gdb if math.isfinite(gdb) else 0.0, -40.0, 6.0))
        target = REF_EVENT_LUFS + trim + gdb + rng.uniform(-EVENT_JITTER_DB, EVENT_JITTER_DB)
        if distant:
            target -= 3.0
        a7, b7, kinds7, d7 = S7_SOFTER
        if kind in kinds7 and a7 <= ev["t"] < b7:
            target += d7
        tier = "key" if (kind == "deviate" or ev is human_decision) else "other"
        if tier == "other" and target > HIERARCHY_CAP_LUFS:
            target = HIERARCHY_CAP_LUFS
        st *= undb(target - event_loudness(st))
        t0 = ev["t"] - pre
        note = []
        if t0 < 0:
            note.append("started before 0: moved to 0")
            t0 = 0.0
        i0 = int(round(t0 * SR))
        i_end_nat = i0 + len(st)
        if i0 >= lim:
            warn(f"{kind} at {ev['t']} starts after {END_SAFE} s: skipped")
            placed.append({"kind": kind, "t": ev["t"], "start": round(t0, 4), "end": round(t0, 4), "lufs_100ms": None, "tier": None, "note": "starts after the safe end: skipped"})
            continue
        if i_end_nat > lim:
            st = st[: lim - i0].copy()
            k = min(len(st), ns(0.5), len(st) // 2)  # a natural fade, not a cut
            st[-k:] *= (1.0 - ramp_on(k))[:, None]
            note.append("tail faded to end by %.2f s (natural end %.3f s)" % (END_SAFE, i_end_nat / SR))
        (out_small if kind in SMALL_KINDS else out)[i0 : i0 + len(st)] += st
        placed.append({"kind": kind, "t": ev["t"], "start": round(i0 / SR, 4), "end": round((i0 + len(st)) / SR, 4), "lufs_100ms": round(target, 1), "tier": tier, "note": "; ".join(note)})
    main_bus, small_bus = hp(out, 30.0), hp(out_small, 30.0)
    _, lev, g = leveller(main_bus + small_bus, SFX_CAP_LUFS, return_gain=True)
    return main_bus * g[:, None], small_bus * g[:, None], placed, lev


def leveller(x, cap_lufs, hold=0.2, rel=0.5, return_gain=False):
    """Slow bus leveller: keeps momentary loudness under cap; passes everything below it untouched.
    hold looks ahead and behind (s) so the gain is already down before a rise; rel is the recovery."""
    tc, L = window_loudness(x, 0.4, 0.01)
    over = np.maximum(0.0, L - cap_lufs)
    if over.max() <= 0:
        g = np.ones(len(x))
        info = {"cap_lufs": round(cap_lufs, 2), "max_reduction_db": 0.0}
        return (x, info, g) if return_gain else (x, info)
    h = max(1, ns(hold) // ns(0.01))
    held = over.copy()
    for j in range(1, h + 1):
        held[:-j] = np.maximum(held[:-j], over[j:])
        held[j:] = np.maximum(held[j:], over[:-j])
    a = math.exp(-0.01 / rel)
    sm = np.empty_like(held)
    cur = 0.0
    for i, v in enumerate(held):
        cur = v if v > cur else v + (cur - v) * a
        sm[i] = cur
    k = max(1, ns(hold) // ns(0.01))  # smooth the attack too (moving average over the hold)
    sm = np.maximum(np.convolve(sm, np.ones(2 * k + 1) / (2 * k + 1), mode="same"), 0.0)
    sm = np.maximum(sm, over)  # never above the cap
    g = 10 ** (-np.interp(np.arange(len(x)) / SR, tc, sm) / 20.0)
    info = {"cap_lufs": round(cap_lufs, 2), "max_reduction_db": round(float(sm.max()), 2)}
    return (x * g[:, None], info, g) if return_gain else (x * g[:, None], info)


# ---------------------------------------------------------------------------------------------
# narration timing


class Timing:
    def __init__(self, path: Path):
        self.d = json.loads(path.read_text())
        self.lines = self.d["lines"]
        self.order = self.d.get("line_order") or sorted(self.lines)

    def word(self, line, w, n=1, fallback=None):
        try:
            L = self.lines[line]
            want = w.lower()
            k = 0
            for x in L["words"]:
                if re.sub(r"[^a-z']", "", x["w"].lower()) == want:
                    k += 1
                    if k == n:
                        return float(x["start"])
        except KeyError:
            pass
        if fallback is None:
            raise KeyError(f"word {w!r} #{n} not in {line}")
        warn(f"timing: word {w!r} not found in {line}, using {fallback}")
        return fallback

    def spans(self, speaker):
        out = []
        for k in self.order:
            L = self.lines[k]
            if L.get("speaker") != speaker:
                continue
            clip = L.get("clip") or [L["start"], L["end"]]
            out.append((k, min(float(clip[0]), float(L["start"])), max(float(clip[1]), float(L["end"]))))
        return out


# ---------------------------------------------------------------------------------------------
# music


# Fallback times for the music's anchor words (v1 timing), used with a warning if the narration
# is re-written and a word disappears: the build never fails on a timing change.
ANCHORS = {
    ("L02", "agents", 1): 6.44, ("W01", "hey", 1): 8.55, ("L03", "priora", 1): 14.80, ("L03", "then", 1): 18.57,
    ("L04", "next", 1): 22.60, ("L04", "need", 1): 25.63, ("L05", "each", 1): 31.20, ("L06", "when", 1): 38.60,
    ("L06", "holds", 1): 39.29, ("L06", "opens", 1): 40.26, ("L06", "disturbed", 1): 44.00, ("L07", "slips", 1): 48.34,
    ("L08", "priora", 1): 52.40, ("L08", "agents", 1): 54.78, ("L09", "three", 1): 57.35, ("L10", "retain", 1): 59.45,
    ("L11", "mitigate", 1): 66.40, ("L11", "checks", 1): 68.54, ("L12", "transfer", 1): 72.20, ("L13", "priora", 1): 78.50,
    ("L13", "the", 2): 81.14, ("L14", "priora", 1): 84.40,
}


def music_plan(tm: Timing, has_wordmark=True):
    def w(line, word, n=1):
        return tm.word(line, word, n, fallback=ANCHORS.get((line, word, n)))

    # (turn time, crossfade width, MIDI notes, level dB, brightness 0..1, reverb send)
    S = [
        (1.6, 3.2, [38, 50, 57, 64], -8.0, 0.25, 0.35),  # quiet open start: D, A, E (no third)
        (w("L02", "agents") - 0.15, 1.6, [38, 50, 57, 64, 69, 76], -7.0, 0.30, 0.38),  # agents: a high open colour
        (w("W01", "hey") - 0.6, 1.6, [38, 45, 50, 57, 64], -7.0, 0.25, 0.35),  # the voice note: low and open
        (w("L03", "priora") - 0.3, 1.6, [38, 45, 54, 57, 61, 64], -5.0, 0.40, 0.35),  # case forms: Dmaj9, warmer
        (w("L03", "then") + 0.1, 1.6, [38, 45, 54, 59, 64, 69], -5.0, 0.42, 0.35),  # D6/9
        (w("L04", "next") - 0.25, 2.0, [43, 50, 54, 57, 59, 66], -4.5, 0.38, 0.35),  # panel: Gmaj9
        (w("L04", "need") + 0.9, 2.0, [40, 47, 54, 55, 62], -4.5, 0.36, 0.35),  # Em9
        (w("L05", "each") - 0.2, 2.0, [35, 47, 54, 57, 62, 64], -5.0, 0.34, 0.35),  # Bm11
        (w("L06", "when") - 3.4, 2.0, [33, 45, 52, 59, 62], -4.5, 0.36, 0.35),  # Asus4(9): waiting
        (w("L06", "holds") + 0.05, 1.0, [38, 45, 54, 57, 62, 66], -3.0, 0.55, 0.38),  # "holds": D major lift
        (w("L06", "opens") + 0.15, 1.0, [38, 45, 54, 57, 62, 66, 69, 76], -2.5, 0.68, 0.42),  # "route opens": opens up
        (w("L06", "disturbed") + 0.2, 2.0, [38, 50, 55, 59, 66, 69], -3.5, 0.55, 0.38),  # G/D, settled
        (w("L07", "slips") + 0.1, 1.2, [35, 42, 50, 57, 61], -5.5, 0.26, 0.38),  # "slips": Bm9, darker
        (w("L08", "priora") + 0.1, 1.5, [31, 43, 50, 54, 61], -4.5, 0.24, 0.40),  # Gmaj7#11: tension held
        (w("L08", "agents") + 0.2, 1.5, [33, 45, 52, 55, 62], -5.5, 0.26, 0.40),  # A7sus4
        (w("L09", "three"), 1.2, [33, 45, 52, 59, 64], -3.5, 0.36, 0.40),  # the rooms open: Asus2
        (w("L10", "retain") - 0.15, 1.5, [31, 43, 50, 57, 59, 66], -4.0, 0.30, 0.36),  # Retain: G, low, grounded
        (w("L11", "mitigate") - 0.4, 1.5, [40, 47, 54, 55, 62, 71], -4.0, 0.50, 0.36),  # Mitigate: Em9, brighter
        (w("L11", "checks"), 1.5, [40, 47, 54, 57, 62, 71], -4.0, 0.52, 0.36),  # Em11: the inner voice moves
        (w("L12", "transfer") - 0.3, 1.5, [47, 52, 57, 62, 67], -6.0, 0.20, 0.62),  # Transfer: quartal, hollow, far
        (w("L13", "priora") - 0.3, 1.5, [33, 45, 52, 55, 59, 62], -5.0, 0.36, 0.40),  # between rooms: A11
        (w("L13", "the", 2) + 0.1, 1.2, [38, 45, 54, 57, 62, 66, 69], -3.5, 0.55, 0.40),  # decision: D, resolved
        (w("L14", "priora") - 0.2, 1.6, [38, 45, 52, 57, 66, 76], -3.0, 0.60, 0.42),  # tagline: open Dadd9
        (88.3, 1.0, [38, 45, 57], -5.0, 0.40, 0.42),  # under the wordmark, held into the bed fade (BED_FADE)
    ]
    P = []  # felt piano: (time, MIDI note, velocity, distant)

    def chord(t, notes, vel, step=0.07, distant=False):
        for k, m in enumerate(notes):
            P.append((t + step * k, m, vel, distant))

    P.append((0.55, 62, 0.28, False))  # opening: one soft D4
    chord(w("L03", "priora") - 0.25, [62, 66], 0.32, 0.35)  # the case forms: D4, F#4
    chord(w("L04", "next") - 0.25, [55, 62], 0.28, 0.05)  # the panel: G3 + D4
    P.append((w("L05", "each") - 0.15, 66, 0.26, False))  # inspect: F#4
    chord(w("L06", "holds"), [62, 66, 69], 0.38)  # "holds": rolled D major
    chord(w("L06", "opens"), [69, 74], 0.30, 0.34)  # "route opens": A4, D5
    P.append((w("L07", "slips") + 0.12, 47, 0.32, False))  # "slips": low B2
    chord(w("L09", "three") + 0.05, [64, 69, 71], 0.28, 0.35)  # three rooms: E4, A4, B4
    chord(w("L10", "retain") - 0.1, [55, 59], 0.30, 0.06)  # Retain: G3, B3
    chord(w("L11", "mitigate") - 0.35, [64, 71], 0.28, 0.30)  # Mitigate: E4, B4
    chord(w("L12", "transfer") - 0.25, [62, 67], 0.26, 0.08, distant=True)  # Transfer: muted D4, G4
    P.append((w("L13", "priora") - 0.25, 57, 0.26, False))  # between rooms: A3
    chord(w("L13", "the", 2), [50, 57, 66], 0.40, 0.08)  # the decision: D3, A3, F#4
    chord(w("L14", "priora") - 0.15, [50, 69, 76], 0.30, 0.21)  # tagline: D3, A4, E5
    if not has_wordmark:  # the sfx wordmark note is the single low note; without it the piano gives one
        P.append((88.4, 38, 0.45, False))
    return S, P


def note_weight(m):
    if m < 45:
        return 0.85
    if m < 57:
        return 0.8
    if m < 69:
        return 0.6
    return 0.38


def build_curves(S, tc):
    """Per-note amplitude envelopes and scalar curves at control rate, with crossfades at turns.
    Notes that enter or leave use equal-power shapes; shared notes simply continue (no dip)."""
    turns = []
    for i, (t, w, notes, lev, br, snd) in enumerate(S):
        if i:
            prev_end = turns[-1][0] + turns[-1][1] / 2
            w = min(w, 2 * (t - prev_end) - 0.01) if t - w / 2 < prev_end else w
        turns.append((t, max(w, 0.2), notes, lev, br, snd))
    allnotes = sorted({m for s in turns for m in s[2]})
    env = {m: np.zeros_like(tc) for m in allnotes}
    bright = np.zeros_like(tc)
    send = np.zeros_like(tc)
    prev = {m: 0.0 for m in allnotes}
    pb, ps = turns[0][4], turns[0][5]
    for t, w, notes, lev, br, snd in turns:
        t0, t1 = t - w / 2, t + w / 2
        x = np.clip((tc - t0) / w, 0, 1)
        sel = tc >= t0
        for m in allnotes:
            a = undb(lev) * note_weight(m) if m in notes else 0.0
            p = prev[m]
            if p == 0.0:
                shape = a * np.sin(np.pi / 2 * x)
            elif a == 0.0:
                shape = p * np.cos(np.pi / 2 * x)
            else:
                shape = p + (a - p) * rc(x)
            env[m][sel] = shape[sel]
            prev[m] = a
        bright[sel] = (pb + (br - pb) * rc(x))[sel]
        send[sel] = (ps + (snd - ps) * rc(x))[sel]
        pb, ps = br, snd
    return env, bright, send


def pad_voice(m, env_c, tc, rng, out):
    """One pad note: three detuned soft oscillators (sine/triangle), each with its own very slow
    amplitude motion and its own place in the stereo field. Phase follows absolute time, so a note
    held across a chord change is continuous."""
    f = hz(m)
    active = env_c > 1e-7
    if not active.any():
        return
    tri = 0.15 if m < 45 else (0.35 if m < 69 else 0.2)
    spread = float(np.clip((m - 36) / 30.0, 0.1, 0.6))
    dets = np.array([-1.0, 0.0, 1.0]) * rng.uniform(3.5, 6.5) + rng.uniform(-0.5, 0.5, 3)
    phs = rng.uniform(0, 2 * np.pi, 3)
    lfo_r = rng.uniform(0.035, 0.11, 3)
    lfo_p = rng.uniform(0, 2 * np.pi, 3)
    # contiguous active runs (split at silences longer than 0.5 s)
    idx = np.nonzero(active)[0]
    breaks = np.nonzero(np.diff(idx) > 500)[0]
    runs = np.split(idx, breaks + 1)
    for r in runs:
        s0 = max(0, int(tc[r[0]] * SR) - SR // 100)
        s1 = min(N, int(tc[r[-1]] * SR) + SR // 100)
        t = np.arange(s0, s1) / SR
        e = np.interp(t, tc, env_c)
        for k in range(3):
            fo = f * 2.0 ** (dets[k] / 1200.0)
            ph = 2 * np.pi * fo * t + phs[k]
            x = np.sin(ph)
            if tri > 0:
                trw = np.zeros_like(x)
                for h, sgn in ((1, 1.0), (3, -1.0), (5, 1.0), (7, -1.0)):
                    if fo * h < 6000:
                        trw += sgn * np.sin(h * ph) / (h * h)
                x = (1 - tri) * x + tri * trw * 8 / np.pi**2
            am = 1.0 + 0.18 * np.sin(2 * np.pi * lfo_r[k] * t + lfo_p[k])
            pan = (k - 1) * spread
            th = (pan + 1) * np.pi / 4
            y = x * am * e / 3.0
            out[s0:s1, 0] += y * math.cos(th)
            out[s0:s1, 1] += y * math.sin(th)


def felt_piano(m, vel, rng, distant=False):
    """Felt piano note by additive synthesis: slightly stretched partials, a soft felt hammer
    (fast high roll-off, slow-ish attack, a little thump), two strings a fraction of a cent
    apart, two-stage decay."""
    f = hz(m)
    dur = float(np.clip(7.0 * (220.0 / f) ** 0.3, 3.5, 8.0))
    n = ns(dur)
    t = tax(n)
    B = 0.00012 * 2.0 ** ((m - 48) / 24.0)
    tau1 = float(np.clip(3.2 * (220.0 / f) ** 0.5, 0.9, 6.0))
    hard = 0.2 + 0.45 * vel
    x = np.zeros(n)
    dets = (-0.45, 0.45)
    for k in range(1, 25):
        fk = k * f * math.sqrt(1 + B * k * k)
        if fk > 7000:
            break
        a = (1.0 / k**1.2) * math.exp(-(k - 1) * (0.55 - 0.35 * hard))
        a *= 0.25 + 0.75 * abs(math.sin(math.pi * k * 0.13))
        tk = tau1 / (1 + 0.35 * (k - 1) ** 1.15)
        dec = 0.72 * np.exp(-t / (tk * 0.45)) + 0.28 * np.exp(-t / (tk * 1.9))
        for dc in dets:
            x += a * dec * np.sin(2 * np.pi * fk * 2.0 ** (dc / 1200.0) * t + rng.uniform(0, 2 * np.pi)) / len(dets)
    k = int((0.0035 + 0.004 * (1 - vel)) * SR)
    x[:k] *= ramp_on(k)
    x /= np.abs(x).max() + 1e-12
    x += cnoise(rng, n, 0, 700) * env_exp(n, 0.008, att=0.001) * 0.05 * vel
    x = lp(x, 900 if distant else 900 + 2600 * vel)
    k = ns(0.3)
    x[-k:] *= 1.0 - ramp_on(k)
    return x * vel**1.4


def render_music(tm: Timing, has_wordmark=True):
    S, P = music_plan(tm, has_wordmark)
    tc = np.arange(0, int(DUR * 1000) + 1) / 1000.0
    env, bright, send = build_curves(S, tc)
    pad = np.zeros((N, 2))
    for m in sorted(env):
        pad_voice(m, env[m], tc, rng_for("pad", m), pad)
    # gentle filtering: crossfade between a dark and a brighter low-pass (zero phase)
    b = np.interp(np.arange(N) / SR, tc, bright)[:, None]
    dark = sosfiltfilt(_sos("lowpass", 600.0, 1), pad, axis=0)
    light = sosfiltfilt(_sos("lowpass", 2400.0, 1), pad, axis=0)
    pad = dark * (1 - b) + light * b
    piano = np.zeros((N, 2))
    piano_far = np.zeros((N, 2))
    notes = []
    for i, (t, m, vel, distant) in enumerate(sorted(P)):
        x = felt_piano(m, vel, rng_for("piano", i, m), distant)
        i0 = int(round(t * SR))
        i1 = min(N, i0 + len(x))
        x = x[: i1 - i0]
        th = (float(np.clip((m - 62) / 40.0, -0.5, 0.5)) + 1) * np.pi / 4
        tgt = piano_far if distant else piano
        tgt[i0:i1, 0] += x * math.cos(th)
        tgt[i0:i1, 1] += x * math.sin(th)
        notes.append({"t": round(t, 3), "note": note_name(m), "hz": round(hz(m), 2), "velocity": vel, "distant": distant})
    piano_gain = undb(PIANO_DB)
    dry = pad + (piano + piano_far * 0.6) * piano_gain
    s = np.interp(np.arange(N) / SR, tc, send)[:, None]
    hall = make_ir(seed_of("ir-hall"), rt60=(3.0, 2.4, 1.4), length=3.6, predelay=0.022, tone=(1.0, 0.6, 0.22))
    wet = convolve_st(dry * s * MUSIC_WET + piano_far * piano_gain * 0.6, hall)
    music = sosfiltfilt(_sos("highpass", 28.0, 2), dry + wet, axis=0)
    # end: a raised-cosine fade of the whole bed, silent from BED_FADE[0] + BED_FADE[1]
    t = np.arange(N) / SR
    music *= (1.0 - rc((t - BED_FADE[0]) / BED_FADE[1]))[:, None]
    L = pyln.Meter(SR).integrated_loudness(music)
    music *= undb(MUSIC_LUFS - L)
    plan = [{"t": round(x[0], 3), "xfade_s": x[1], "notes": [note_name(m) for m in x[2]], "level_db": x[3], "brightness": x[4], "reverb_send": x[5]} for x in S]
    return music, {"segments": plan, "piano": notes, "pre_duck_lufs": MUSIC_LUFS, "bed_fade": {"from": BED_FADE[0], "seconds": BED_FADE[1]}}


PIANO_DB = 3.0  # felt piano bus against the pad
MUSIC_WET = 1.3  # scales the plan's reverb sends (hall normalised to unity over 200 to 4000 Hz)

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def note_name(m):
    return f"{NOTE_NAMES[m % 12]}{m // 12 - 1}"


# ---------------------------------------------------------------------------------------------
# ducking


def duck_curve(tm: Timing, speakers, hold_last=False):
    """Music gain (dB) at control rate 1 kHz: smooth cosine ramps (in dB); the attack ends at the
    first sound of each line, the release starts just after its last. Lines closer than DUCK_BRIDGE
    (whoever speaks) stay ducked through the gap; after the last line the duck is held to the end."""
    tc = np.arange(0, int(DUR * 1000) + 1) / 1000.0
    g = np.zeros_like(tc)
    raw = sorted(((k, s, e, depth) for spk, depth in speakers.items() for k, s, e in tm.spans(spk)), key=lambda x: x[1])
    spans = []
    for k, s, e, depth in raw:
        if spans and s - spans[-1][2] < DUCK_BRIDGE:
            pk, ps, pe, pd = spans[-1]
            if pd == depth:
                spans[-1] = (pk + "+" + k, ps, max(pe, e), pd)
                continue
            spans[-1] = (pk, ps, s, pd)  # different depth: hold the first until the second starts
        spans.append((k, s, e, depth))
    for i, (k, s, e, depth) in enumerate(spans):
        a0 = s - DUCK_ATTACK
        r0 = DUR + 1.0 if (hold_last and i == len(spans) - 1) else e + DUCK_HOLD  # after the last line: no release
        shape = np.where(tc < s, rc((tc - a0) / DUCK_ATTACK), np.where(tc <= r0, 1.0, 1.0 - rc((tc - r0) / DUCK_RELEASE)))
        g = np.minimum(g, -depth * shape)
    return tc, g, [{"lines": k, "start": round(s, 3), "end": round(e, 3) if (i < len(spans) - 1 or not hold_last) else "held to the end", "depth_db": d}
                   for i, (k, s, e, d) in enumerate(spans)]


def word_span(tm: Timing, line, w, n=1):
    want = w.lower()
    k = 0
    for x in tm.lines.get(line, {}).get("words", []):
        if re.sub(r"[^a-z']", "", x["w"].lower()) == want:
            k += 1
            if k == n:
                return float(x["start"]), float(x["end"])
    return None


def voice_segments(tm: Timing):
    """Every narrator sentence and the worker's line, with their level targets (master frame)."""
    segs = []
    for k in tm.order:
        L = tm.lines[k]
        spk = L.get("speaker")
        if spk == "narrator":
            for i, s in enumerate(L.get("sentences") or [{"start": L["start"], "end": L["end"], "text": L.get("text", "")}]):
                segs.append({"line": k, "sentence": i + 1, "speaker": spk, "text": s.get("text", ""), "start": float(s["start"]), "end": float(s["end"]), "target_lufs": NARRATOR_TARGET_LUFS})
        elif spk == "worker":
            segs.append({"line": k, "sentence": None, "speaker": spk, "text": L.get("text", ""), "start": float(L["start"]), "end": float(L["end"]), "target_lufs": WORKER_TARGET_LUFS})
    segs.sort(key=lambda d: d["start"])
    return segs


def seg_window(s):
    return s["start"] - 0.03, s["end"] + 0.08


def voice_gain_curve(tm: Timing, v_st, meter, offset_db, segs=None):
    """Per-sentence levelling of the raw voice, in the mix (voice.wav itself is never changed).
    Each sentence gets the constant gain that puts it on its target (narrator -16 LUFS, the worker
    -16.5) once the master gain is applied (offset_db = -G). Gains change only inside the pauses
    between sentences (raised cosine, at most 0.25 s, centred in the pause). Word rides (RIDES) are
    added on top with 30 to 40 ms ramps. Returns (gain in dB at 1 kHz, segment table, ride table)."""
    segs = [dict(x) for x in (segs or voice_segments(tm))]
    for s in segs:
        a, b = seg_window(s)
        L = meter.integrated_loudness(v_st[int(a * SR) : int(b * SR)])
        s["raw_lufs"] = round(float(L), 2)
        s["gain_db"] = round(float(np.clip(s["target_lufs"] + offset_db - L, -12.0, 12.0)), 2)
    tc = np.arange(0, int(DUR * 1000) + 1) / 1000.0
    g = np.full_like(tc, segs[0]["gain_db"] if segs else 0.0)
    for s0, s1 in zip(segs, segs[1:]):
        gap = s1["start"] - s0["end"]
        mid = 0.5 * (s0["end"] + s1["start"])
        w = float(np.clip(gap - 0.1, 0.03, 0.25))
        x = rc((tc - (mid - w / 2)) / w)
        sel = tc >= mid - w / 2
        g[sel] = (s0["gain_db"] + (s1["gain_db"] - s0["gain_db"]) * x)[sel]
    rides = []
    for line, word, n, d in RIDES:
        span = word_span(tm, line, word, n)
        if span is None:
            warn(f"ride: word {word!r} not found in {line}; skipped")
            continue
        ws, we = span
        up = rc((tc - (ws - 0.03)) / 0.04)
        down = 1.0 - rc((tc - (we - 0.04)) / 0.04)
        g += d * np.minimum(up, down)
        rides.append({"line": line, "word": word, "start": ws, "end": we, "gain_db": d})
    return tc, g, segs, rides


def apply_gain_curve(x, tc, gdb):
    return x * (10 ** (np.interp(np.arange(len(x)) / SR, tc, gdb) / 20.0))[:, None]


# ---------------------------------------------------------------------------------------------
# master: true-peak limiter, loudness normalisation, measurement


def tp_env(x):
    up = resample_poly(x, 4, 1, axis=0)
    a = np.max(np.abs(up), axis=1)
    a = a[: (len(a) // 4) * 4].reshape(-1, 4).max(axis=1)
    a = np.concatenate([a, np.zeros(len(x) - len(a))])
    return np.maximum(a, np.max(np.abs(x), axis=1))


def true_peak_db(x) -> float:
    up = resample_poly(np.atleast_2d(x.T).T, 4, 1, axis=0)
    return db(max(np.abs(up).max(), np.abs(x).max()))


def limiter(x, ceiling_db, look_ms=2.0, rel_ms=120.0, block=32):
    """Look-ahead true-peak limiter (4x oversampled detection), block-rate gain computer.
    Guarantees the gain at every sample is at or below what that sample needs."""
    env = tp_env(x)
    c = undb(ceiling_db)
    req = np.minimum(1.0, c / np.maximum(env, 1e-12))
    nb = -(-len(req) // block)
    rb = np.concatenate([req, np.ones(nb * block - len(req))]).reshape(nb, block).min(axis=1)
    A = max(1, int(round(look_ms * SR / 1000 / block)))
    h = rb.copy()
    for j in range(1, A + 1):
        h[:-j] = np.minimum(h[:-j], rb[j:])
    if h.min() >= 1.0:
        return x.copy(), np.ones(len(x)), 0.0
    a_rel = 1.0 - math.exp(-block / (rel_ms / 1000 * SR))
    g = np.empty(nb)
    cur = 1.0
    for k in range(nb):
        v = h[k]
        cur = v if v < cur else cur + (v - cur) * a_rel
        g[k] = cur
    cs = np.concatenate([np.ones(A), g])
    gs = np.convolve(cs, np.ones(A + 1) / (A + 1), mode="valid")[:nb]
    ge = gs.copy()
    ge[1:] = np.minimum(ge[1:], gs[:-1])
    ge[:-1] = np.minimum(ge[:-1], gs[1:])
    centres = np.arange(nb) * block + (block - 1) / 2.0
    gain = np.interp(np.arange(len(x)), centres, ge)
    return x * gain[:, None], gain, -db(gain.min())


def end_fade(x):
    t = np.arange(len(x)) / SR
    f = 1.0 - rc((t - FADE_OUT[0]) / (FADE_OUT[1] - FADE_OUT[0]))
    k = ns(0.002)
    f[:k] *= ramp_on(k)
    return x * f[:, None]


def quantize24(x):
    q = np.round(np.clip(x, -1.0, 1.0 - 2.0**-23) * 2.0**23) / 2.0**23
    return q


def normalise(mix, target_lufs, meter, label):
    """y = limiter(G * mix): G iterated until the limited result hits target_lufs."""
    G = target_lufs - meter.integrated_loudness(mix)
    ceiling = LIMITER_CEILING
    for _ in range(10):
        y, gain, gr = limiter(end_fade(mix * undb(G)), ceiling)
        L = meter.integrated_loudness(y)
        tp = true_peak_db(quantize24(y))
        if tp > TP_MAX - 0.05:
            ceiling -= tp - (TP_MAX - 0.1)
            continue
        if abs(L - target_lufs) < 0.02:
            break
        G += target_lufs - L
    print(f"  {label}: gain {G:+.2f} dB, limiter max {gr:.2f} dB, {L:.2f} LUFS, {tp:.2f} dBTP")
    return quantize24(y), G, gain, gr


def lufs_or_none(meter, x):
    if len(x) < ns(0.45):
        return None
    v = meter.integrated_loudness(x)
    return None if not math.isfinite(v) else round(float(v), 2)


def stats(path: Path, meter):
    x, sr = sf.read(str(path), dtype="float64", always_2d=True)
    info = sf.info(str(path))
    tcs, M = window_loudness(x, 0.4, 0.01)
    i = int(np.argmax(M))
    tail = x[-ns(0.01) :]
    return x, {
        "samples": int(len(x)),
        "seconds": round(len(x) / sr, 6),
        "sample_rate": int(sr),
        "channels": int(x.shape[1]),
        "subtype": info.subtype,
        "integrated_lufs": round(float(meter.integrated_loudness(x)), 2),
        "true_peak_dbtp": round(true_peak_db(x), 2),
        "sample_peak_dbfs": round(db(np.abs(x).max()), 2),
        "max_momentary_lufs": round(float(M[i]), 2),
        "max_momentary_at_s": round(float(tcs[i]), 2),
        "clipped_samples": int(np.sum(np.abs(x) >= 1.0 - 2.0**-22)),
        "dc_offset": [float("%.2e" % v) for v in x.mean(axis=0)],
        "first_sample_abs": float(np.abs(x[0]).max()),
        "last_10ms_peak_dbfs": round(db(np.abs(tail).max()), 1),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def ffmpeg_check(path: Path):
    try:
        p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.TimeoutExpired):
        return None
    s = p.stderr[p.stderr.rfind("Summary:") :]
    mi = re.search(r"I:\s+(-?[\d.]+) LUFS", s)
    mp = re.search(r"Peak:\s+(-?[\d.]+) dBFS", s)
    if not mi:
        return None
    return {"integrated_lufs": float(mi.group(1)), "true_peak_dbtp": float(mp.group(1)) if mp else None}


D_MAJOR = KEY_PCS


def music_analysis(x, segments, meter):
    """Checks the bed can be trusted without listening: arc (loudness per segment), tuning and key
    (strongest spectral peaks against 12-TET at A = 440 and the D major collection), no dropouts
    (momentary floor) and no hard cuts (largest fall within 100 ms)."""
    tcs, M = window_loudness(x, 0.4, 0.01)
    sel = (tcs >= 3.0) & (tcs <= 88.8)
    i_min = int(np.argmin(np.where(sel, M, np.inf)))
    t10, S = window_loudness(x, 0.1, 0.01)
    fall = S[:-10] - S[10:]
    selc = (t10[:-10] >= 3.0) & (t10[:-10] <= 88.8)
    i_fall = int(np.argmax(np.where(selc, fall, -np.inf)))
    mono = x.mean(axis=1)
    segs = []
    worst_cents = 0.0
    out_of_key = []
    for i, sg in enumerate(segments):
        a = sg["t"] + sg["xfade_s"] / 2
        b = segments[i + 1]["t"] - segments[i + 1]["xfade_s"] / 2 if i + 1 < len(segments) else 89.2
        if b - a < 0.5 or not sg["notes"]:
            continue
        row = {"from": round(a, 2), "to": round(b, 2), "notes": sg["notes"], "lufs": segment_lufs(meter, x, a, b)}
        if b - a >= 1.8:
            w = min(5.0, b - a)
            c = 0.5 * (a + b)
            seg = mono[int((c - w / 2) * SR) : int((c + w / 2) * SR)]
            X = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), 4 * len(seg)))
            f = np.fft.rfftfreq(4 * len(seg), 1 / SR)
            k = np.nonzero((X[1:-1] > X[:-2]) & (X[1:-1] >= X[2:]) & (f[1:-1] > 120) & (f[1:-1] < 2000))[0] + 1
            k = k[X[k] > X[k].max() * undb(-24)]
            groups = {}
            for j in k:
                y0, y1, y2 = np.log(X[j - 1] + 1e-20), np.log(X[j] + 1e-20), np.log(X[j + 1] + 1e-20)
                fr = (j + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2)) * (f[1] - f[0])
                midi = 69 + 12 * math.log2(fr / A4)
                groups.setdefault(int(round(midi)), []).append((X[j] ** 2, 100 * (midi - round(midi))))
            peaks = []
            for mm, lst in sorted(groups.items(), key=lambda kv: -sum(e for e, _ in kv[1]))[:6]:
                wsum = sum(e for e, _ in lst)
                cents = sum(e * c_ for e, c_ in lst) / wsum
                worst_cents = max(worst_cents, abs(cents))
                if mm % 12 not in D_MAJOR:
                    out_of_key.append({"t": round(c, 1), "note": note_name(mm)})
                peaks.append({"note": note_name(mm), "hz_12tet": round(hz(mm), 2), "centre_cents": round(cents, 1), "partials": len(lst)})
            row["strongest_notes"] = sorted(peaks, key=lambda q: q["hz_12tet"])
        segs.append(row)
    return {
        "segments": segs,
        "min_momentary_lufs_3_to_88_8": round(float(M[i_min]), 2), "min_momentary_at_s": round(float(tcs[i_min]), 2),
        "max_fall_in_100ms_db": round(float(fall[i_fall]), 2), "max_fall_at_s": round(float(t10[i_fall]), 2),
        "worst_note_centre_cents": round(worst_cents, 1), "peaks_outside_d_major": out_of_key,
        "tuning_method": "per segment of 1.8 s or more: Hann FFT (5 s max, 4x zero padding), spectral peaks 120 to 2000 Hz within 24 dB of the strongest, grouped by nearest note, magnitude-weighted centre in cents (the pad's chorus spreads each note +-3.5 to 7 cents by design)",
    }


def segment_lufs(meter, x, s, e):
    return lufs_or_none(meter, x[int(s * SR) : int(e * SR)])


# ---------------------------------------------------------------------------------------------
# main


def mono_to_st(x):
    return np.stack([x, x], axis=1)


def load_mono(path: Path):
    x, sr = sf.read(str(path), dtype="float64", always_2d=True)
    if sr != SR:
        raise SystemExit(f"{path} is {sr} Hz, expected {SR}")
    x = x.mean(axis=1)
    if len(x) < N:
        x = np.concatenate([x, np.zeros(N - len(x))])
    return x[:N]


def dc_block(x):
    """voice.wav carries a small DC offset (about -4e-4); a zero-phase 20 Hz high-pass removes it."""
    return sosfiltfilt(_sos("highpass", 20.0, 2), x - x.mean())


def write(path: Path, x):
    assert x.shape == (N, 2), x.shape
    sf.write(str(path), x, SR, subtype="PCM_24")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--cached-events", action="store_true", help="reuse audio/events.json instead of running headless Chrome")
    args = ap.parse_args(argv)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    meter = pyln.Meter(SR)

    print("== events")
    source = "chrome"
    if args.cached_events:
        source = "cache"
        raw = json.loads(EVENTS_JSON.read_text())
    else:
        try:
            raw = extract_events_chrome()
        except Exception as exc:  # noqa: BLE001
            if not EVENTS_JSON.exists():
                raise
            warn(f"event extraction failed ({exc}); using the cached audio/events.json")
            source = "cache (chrome failed)"
            raw = json.loads(EVENTS_JSON.read_text())
        else:
            EVENTS_JSON.write_text(json.dumps(raw, indent=1) + "\n")
    events = clean_events(raw)
    counts = Counter(e["kind"] for e in events)
    unknown = sorted(k for k in counts if k not in KINDS)
    print(f"  {len(events)} events from {source}: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))

    tm = Timing(TIMING_JSON)

    has_wordmark = any(e["kind"] == "wordmark" for e in events)
    print("== sfx")
    sfx_main, sfx_small, placed, lev = render_sfx(events)
    sfx = sfx_main + sfx_small
    print("== music")
    music_raw, mplan = render_music(tm, has_wordmark)

    print("== voice levelling, ducking and mix")
    tcd, g_master, duck_spans = duck_curve(tm, {"narrator": DUCK_NARRATOR_DB, "worker": DUCK_WORKER_DB}, hold_last=True)
    _, g_worker, _ = duck_curve(tm, {"worker": DUCK_WORKER_DB_NONAR})
    music_d = apply_gain_curve(music_raw, tcd, g_master)
    music_w = apply_gain_curve(music_raw, tcd, g_worker)

    v_raw = mono_to_st(dc_block(load_mono(OUT_DIR / "voice.wav")))
    w_raw = mono_to_st(dc_block(load_mono(OUT_DIR / "voice-worker.wav")))
    segs0 = voice_segments(tm)

    # the voice is levelled sentence by sentence in the mix frame (the master gain then moves everything
    # by G, about +0.5 dB); the music's pause cap is a master-frame value, so it iterates with G
    tcv, gv, segs, rides = voice_gain_curve(tm, v_raw, meter, 0.0, segs0)
    voice = apply_gain_curve(v_raw, tcv, gv)
    G_est = 0.0
    for _ in range(6):
        music_m, mcap = leveller(music_d, MUSIC_PAUSE_CAP_LUFS - G_est - 0.15, hold=0.5, rel=1.5)
        G_new = MASTER_LUFS - meter.integrated_loudness(voice + music_m + sfx)
        done = abs(G_new - G_est) < 0.03
        G_est = G_new
        if done:
            break
    w_seg = next((x for x in segs if x["speaker"] == "worker"), None)
    worker = w_raw * undb(w_seg["gain_db"] if w_seg else 0.0)
    gains = ", ".join(f'{x["line"]}{"" if x["sentence"] in (None, 1) else "." + str(x["sentence"])} {x["gain_db"]:+.1f}' for x in segs)
    print(f"  voice gains (dB): {gains}")

    # master: one gain for everything, then the limiter
    mix = voice + music_m + sfx
    master_y, G, lim_gain, gr = normalise(mix, MASTER_LUFS, meter, "master")
    gG = undb(G)
    write(OUT_DIR / "music.wav", quantize24(end_fade(music_m * gG)))
    write(OUT_DIR / "sfx.wav", quantize24(end_fade(sfx * gG)))
    write(OUT_DIR / "master.wav", master_y)

    # no narration: the worker's voice note and the small sounds (flicks, packets) stay at their master
    # level; the music (ducked under W01 only) and the other sounds are raised together to -17 LUFS
    bg = music_w + sfx_main
    w_fixed = (worker + sfx_small) * gG

    def nonar_lufs(gb_db):
        return meter.integrated_loudness(end_fade(w_fixed + bg * undb(gb_db)))

    lo, hi = -6.0, 30.0
    for _ in range(30):
        mid = 0.5 * (lo + hi)
        if nonar_lufs(mid) < NONAR_LUFS:
            lo = mid
        else:
            hi = mid
    Gb = 0.5 * (lo + hi)
    ceiling = LIMITER_CEILING
    for _ in range(10):
        y2, gain2, gr2 = limiter(end_fade(w_fixed + bg * undb(Gb)), ceiling)
        L2 = meter.integrated_loudness(y2)
        tp2 = true_peak_db(quantize24(y2))
        if tp2 > TP_MAX - 0.05:
            ceiling -= tp2 - (TP_MAX - 0.1)
            continue
        if abs(L2 - NONAR_LUFS) < 0.02:
            break
        Gb += (NONAR_LUFS - L2) * 1.2
    print(f"  no narration: background {Gb:+.2f} dB, limiter max {gr2:.2f} dB, {L2:.2f} LUFS, {tp2:.2f} dBTP")
    write(OUT_DIR / "master-no-narration.wav", quantize24(y2))

    print("== QA")
    ctx = dict(meter=meter, tm=tm, events=events, counts=counts, unknown=unknown, placed=placed, lev=lev, mplan=mplan,
               duck_spans=duck_spans, source=source, voice=voice, v_raw=v_raw, worker=worker, music_m=music_m, music_d=music_d,
               music_w=music_w, sfx=sfx, sfx_main=sfx_main, sfx_small=sfx_small, G=G, lim_gain=lim_gain, gr=gr, Gb=Gb,
               gain2=gain2, gr2=gr2, gG=gG, tcd=tcd, g_master=g_master, g_worker=g_worker, music_raw=music_raw,
               segs=segs, rides=rides, tcv=tcv, gv=gv, mcap=mcap, has_wordmark=has_wordmark)
    report = qa(ctx)
    REPORT_JSON.write_text(json.dumps(report, indent=1) + "\n")
    bad = [c for c in report["checks"] if not c["ok"]]
    for c in report["checks"]:
        print(("  ok   " if c["ok"] else "  FAIL ") + c["name"] + ": " + str(c["value"]))
    print("== done: " + ("all checks pass" if not bad else f"{len(bad)} check(s) FAIL"))
    return 0 if not bad else 1


DUCK_WORKER_DB_NONAR = 5.0


def qa(c):
    meter, tm, events, counts, unknown, placed, lev, mplan, duck_spans, source = (c[k] for k in (
        "meter", "tm", "events", "counts", "unknown", "placed", "lev", "mplan", "duck_spans", "source"))
    voice, worker, music_m, music_w, sfx, G, lim_gain, gr, Gb, gain2, gr2, gG, tcd, g_master, g_worker, music_raw = (c[k] for k in (
        "voice", "worker", "music_m", "music_w", "sfx", "G", "lim_gain", "gr", "Gb", "gain2", "gr2", "gG", "tcd", "g_master", "g_worker", "music_raw"))
    outs = {}
    arrays = {}
    for name in ("music.wav", "sfx.wav", "master.wav", "master-no-narration.wav"):
        arrays[name], outs[name] = stats(OUT_DIR / name, meter)
        ff = ffmpeg_check(OUT_DIR / name)
        if ff:
            outs[name]["ffmpeg_ebur128"] = ff

    # speech versus background inside the master (same gain curve as the master)
    g = (gG * lim_gain)[:, None]
    v_m, mu_m, sx_m = voice * g, music_m * g, sfx * g
    bg_m = mu_m + sx_m
    lines = []
    for k in tm.order:
        L = tm.lines[k]
        s, e = float(L["start"]), float(L["end"])
        vl = segment_lufs(meter, v_m, s, e)
        ml = segment_lufs(meter, mu_m, s, e)
        sl = segment_lufs(meter, sx_m, s, e)
        bl = segment_lufs(meter, bg_m, s, e)
        dd = g_master[(tcd >= s) & (tcd <= e)]
        lines.append({
            "line": k, "speaker": L.get("speaker"), "start": s, "end": e,
            "voice_lufs": vl, "music_lufs": ml, "sfx_lufs": sl, "background_lufs": bl,
            "voice_over_music_lu": None if vl is None or ml is None else round(vl - ml, 1),
            "voice_over_background_lu": None if vl is None or bl is None else round(vl - bl, 1),
            "music_duck_db": [round(float(dd.min()), 2), round(float(dd.max()), 2)],
        })
    narr = [x for x in lines if x["speaker"] == "narrator"]
    min_m = min(x["voice_over_background_lu"] for x in narr)
    min_mm = min(x["voice_over_music_lu"] for x in narr)

    # the no-narration version: the worker line against its background
    g2 = gain2[:, None]
    w2 = worker * gG * g2
    sfx2 = (c["sfx_main"] * undb(Gb) + c["sfx_small"] * gG) * g2
    b2 = music_w * undb(Gb) * g2 + sfx2
    wl = tm.lines.get("W01")
    worker_margin = None
    if wl:
        a, b = segment_lufs(meter, w2, wl["start"], wl["end"]), segment_lufs(meter, b2, wl["start"], wl["end"])
        worker_margin = {"worker_lufs": a, "background_lufs": b, "margin_lu": None if a is None or b is None else round(a - b, 1)}

    starts = [p["start"] for p in placed]
    ends = [p["end"] for p in placed]
    span = {
        "earliest_start_s": min(starts) if starts else None,
        "latest_end_s": max(ends) if ends else None,
        "moved_from_before_0": [p for p in placed if "before 0" in p["note"]],
        "faded_at_end": [p for p in placed if "faded" in p["note"]],
        "skipped": [p for p in placed if "skipped" in p["note"]],
    }
    mus, sfxs, mst, nn = outs["music.wav"], outs["sfx.wav"], outs["master.wav"], outs["master-no-narration.wav"]
    mq = music_analysis(music_raw * gG, mplan["segments"], meter)
    checks = []

    def chk(name, ok, value, target):
        checks.append({"name": name, "ok": bool(ok), "value": value, "target": target})

    for name, o in outs.items():
        chk(f"{name} length", o["samples"] == N and o["sample_rate"] == SR and o["channels"] == 2 and o["subtype"] == "PCM_24",
            f'{o["samples"]} samples, {o["sample_rate"]} Hz, {o["channels"]} ch, {o["subtype"]}', f"{N} samples, 48000 Hz, 2 ch, PCM_24")
        chk(f"{name} no clipping", o["clipped_samples"] == 0, o["clipped_samples"], 0)
        chk(f"{name} DC", max(abs(v) for v in o["dc_offset"]) < 1e-4, o["dc_offset"], "|mean| < 1e-4")
        chk(f"{name} clean ends", o["first_sample_abs"] < 1e-4 and o["last_10ms_peak_dbfs"] < -90, f'first {o["first_sample_abs"]:.1e}, last 10 ms {o["last_10ms_peak_dbfs"]} dBFS', "silent first sample and last 10 ms")
    chk("master.wav integrated loudness", abs(mst["integrated_lufs"] - MASTER_LUFS) <= LUFS_TOL, mst["integrated_lufs"], f"{MASTER_LUFS} +- {LUFS_TOL}")
    chk("master.wav true peak", mst["true_peak_dbtp"] <= TP_MAX, mst["true_peak_dbtp"], f"<= {TP_MAX}")
    chk("master-no-narration.wav integrated loudness", abs(nn["integrated_lufs"] - NONAR_LUFS) <= LUFS_TOL, nn["integrated_lufs"], f"{NONAR_LUFS} +- {LUFS_TOL}")
    chk("master-no-narration.wav true peak", nn["true_peak_dbtp"] <= TP_MAX, nn["true_peak_dbtp"], f"<= {TP_MAX}")
    chk("narrator over background (every line)", min_m >= 12.0, min_m, ">= 12 LU per line")
    chk("narrator over music (every line)", min_mm >= 14.0, min_mm, ">= 14 LU per line")
    if worker_margin and worker_margin["margin_lu"] is not None:
        chk("worker over background (no-narration version)", worker_margin["margin_lu"] >= 8.0, worker_margin["margin_lu"], ">= 8 LU")
    narr_duck = [x["music_duck_db"][1] for x in narr]
    chk("music ducked under every narrator line", all(-DUCK_NARRATOR_DB - 0.5 <= d <= -DUCK_NARRATOR_DB + 0.5 for d in narr_duck), narr_duck, f"-{DUCK_NARRATOR_DB:g} dB (+-0.5) throughout each line")

    # --- cut 3: voice levelling (per sentence, in the master)
    v_m = voice * g
    vl_rows = []
    for x in c["segs"]:
        a_, b_ = seg_window(x)
        vl_rows.append({"line": x["line"], "sentence": x["sentence"], "speaker": x["speaker"], "text": x["text"],
                        "raw_lufs_mix_frame": x["raw_lufs"], "gain_db": x["gain_db"], "master_lufs": segment_lufs(meter, v_m, a_, b_),
                        "target_lufs": x["target_lufs"]})
    nar_rows = [x for x in vl_rows if x["speaker"] == "narrator" and x["master_lufs"] is not None]
    nar_vals = [x["master_lufs"] for x in nar_rows]
    chk("narrator sentences levelled", all(abs(v - NARRATOR_TARGET_LUFS) <= NARRATOR_TOL for v in nar_vals),
        [round(min(nar_vals), 2), round(max(nar_vals), 2)], f"every sentence {NARRATOR_TARGET_LUFS} +- {NARRATOR_TOL} LUFS")
    w_rows = [x for x in vl_rows if x["speaker"] == "worker" and x["master_lufs"] is not None]
    if w_rows and nar_vals:
        wv = w_rows[0]["master_lufs"]
        med = float(np.median(nar_vals))
        chk("worker voice note just under the narrator", med - 1.5 <= wv <= med - 0.2, f"{wv} (narrator median {med:.2f})",
            "0.2 to 1.5 LU under the narrator's median sentence")
    ride_rows = []
    for r in c["rides"]:
        wl_ = segment_lufs(meter, v_m, r["start"], max(r["end"], r["start"] + 0.42))
        ride_rows.append(dict(r, word_master_lufs=wl_))

    # --- cut 3: the music never pumps
    tmm, Mm = window_loudness(arrays["music.wav"], 0.4, 0.01)
    sel = (tmm >= 3.5) & (tmm <= BED_FADE[0])
    step = 100  # 1 s at a 10 ms hop
    moves = np.abs(Mm[step:] - Mm[:-step])
    selm = sel[:-step] & sel[step:]
    i_mv = int(np.argmax(np.where(selm, moves, -1)))
    max_move = round(float(moves[i_mv]), 2)
    chk("music pause cap", mus["max_momentary_lufs"] <= MUSIC_PAUSE_CAP_LUFS + 0.05, mus["max_momentary_lufs"], f"<= {MUSIC_PAUSE_CAP_LUFS} LUFS momentary")
    chk("music never moves more than 6 dB within 1 s", max_move <= MUSIC_MAX_MOVE_DB, f"{max_move} dB at {tmm[i_mv]:.2f} s", f"<= {MUSIC_MAX_MOVE_DB} dB (3.5 s to {BED_FADE[0]} s)")

    # --- cut 3: loudness hierarchy, measured in the sfx stem (100 ms windows)
    sx_st = arrays["sfx.wav"]

    def l100(a_, b_):
        seg = sx_st[max(0, int(a_ * SR)) : int(b_ * SR)]
        if len(seg) < ns(0.1):
            return None
        _, L = window_loudness(seg, 0.1, 0.005)
        return round(float(L.max()), 2)

    for pl in placed:
        pl["measured_lufs_100ms"] = None if pl["tier"] is None else l100(pl["start"], min(pl["end"], pl["start"] + 0.5))
    keys = [pl for pl in placed if pl["tier"] == "key"]
    key_windows = [(pl["start"] - 0.1, pl["start"] + 1.5) for pl in keys]
    others = [pl for pl in placed if pl["tier"] == "other" and pl["measured_lufs_100ms"] is not None
              and not any(pl["start"] <= b_ and min(pl["end"], pl["start"] + 0.5) >= a_ for a_, b_ in key_windows)]
    top_other = max(others, key=lambda pl: pl["measured_lufs_100ms"]) if others else None
    if keys and top_other:
        kmin = min(pl["measured_lufs_100ms"] for pl in keys)
        chk("deviation and the human's decision are the loudest sounds", kmin > top_other["measured_lufs_100ms"],
            f'keys >= {kmin}, next loudest {top_other["kind"]} at {top_other["t"]}: {top_other["measured_lufs_100ms"]}', "every key moment louder than every other sound")
    prints = [pl for pl in placed if pl["kind"] == "print" and pl["t"] < 8.0 and pl["measured_lufs_100ms"] is not None]
    if prints:
        pv = [pl["measured_lufs_100ms"] for pl in prints]
        chk("opening print thuds about -28 LUFS", all(abs(v - HIERARCHY_CAP_LUFS) <= 1.5 for v in pv), pv, f"{HIERARCHY_CAP_LUFS} +- 1.5 LUFS (100 ms)")
    flicks = [pl["measured_lufs_100ms"] for pl in placed if pl["kind"] == "speech-fragment" and pl["measured_lufs_100ms"] is not None]

    # --- cut 3: the no-narration master keeps the small sounds small under the worker
    if wl:
        seg = sfx2[int((wl["start"] - 0.1) * SR) : int((wl["end"] + 0.1) * SR)]
        pk_w = round(db(np.abs(seg).max()), 2) if len(seg) else None
        chk("no-narration: sfx peak under the worker's voice note", pk_w is None or pk_w <= NONAR_SFX_W01_PEAK_DBFS, pk_w, f"<= {NONAR_SFX_W01_PEAK_DBFS} dBFS")
    else:
        pk_w = None

    # --- cut 3: the ending
    last = max((tm.lines[k] for k in tm.order if tm.lines[k].get("speaker") == "narrator"), key=lambda L: L["start"], default=None)
    end_info = {}
    if last:
        held = g_master[tcd >= float(last["start"])]
        end_info["duck_after_last_line_db"] = [round(float(held.min()), 2), round(float(held.max()), 2)]
        chk("no duck release after the last line", float(held.max()) <= -DUCK_NARRATOR_DB + 0.01, end_info["duck_after_last_line_db"], f"held at -{DUCK_NARRATOR_DB:g} dB to the end")
    mu_st = arrays["music.wav"]
    t_silent = BED_FADE[0] + BED_FADE[1]
    tail_pk = db(np.abs(mu_st[int(t_silent * SR) :]).max()) if int(t_silent * SR) < N else -240.0
    fade_m = Mm[(tmm >= BED_FADE[0] + 0.2) & (tmm <= t_silent - 0.2)]
    rises = float(np.max(np.diff(fade_m))) if len(fade_m) > 1 else 0.0
    end_info.update({"bed_fade": {"from": BED_FADE[0], "seconds": BED_FADE[1]}, "music_peak_after_fade_dbfs": round(tail_pk, 1),
                     "music_largest_rise_during_fade_db_per_10ms": round(rises, 3)})
    chk("bed fades out cleanly", tail_pk < -90 and rises <= 0.05, f"{tail_pk:.1f} dBFS after {t_silent} s, largest rise {rises:.3f} dB", f"one {BED_FADE[1]} s fade from {BED_FADE[0]} s, silent from {t_silent} s")
    wm = [pl for pl in placed if pl["kind"] == "wordmark" and pl["tier"] is not None]
    if wm:
        tw = wm[-1]["t"]
        w20 = ns(0.02)
        seg = sx_st[int(tw * SR) : int(t_silent * SR)]
        r = np.sqrt(np.convolve(np.mean(seg ** 2, axis=1), np.ones(w20) / w20, mode="valid"))
        rel = db(r[-1]) - db(r.max())
        later = [pl for pl in placed if pl["start"] > wm[-1]["start"] + 0.001 and pl["tier"] is not None]
        end_info.update({"wordmark_t": tw, "wordmark_level_at_silent_point_db_re_peak": round(rel, 1), "events_after_wordmark": [(pl["kind"], pl["t"]) for pl in later]})
        chk("wordmark decays to -60 dB by %.1f s" % t_silent, rel <= -60.0, round(rel, 1), "<= -60 dB re its peak")
        chk("the wordmark is the last sound", not later, end_info["events_after_wordmark"], "no event starts after it")

    w_duck = [x["music_duck_db"] for x in lines if x["speaker"] == "worker"]
    chk("music ducked under the worker line", all(-5.5 <= d[0] and d[1] <= -4.5 for d in w_duck), w_duck, "about -5 dB")
    chk("no sound before 0 or after 90 s", (not starts or min(starts) >= 0) and (not ends or max(ends) <= DUR), [span["earliest_start_s"], span["latest_end_s"]], "[>= 0, <= 90]")
    chk("unknown event kinds", not unknown, unknown, "none (mapped to a default with a warning)")
    chk("music in tune (A = 440)", mq["worst_note_centre_cents"] <= 5.0, mq["worst_note_centre_cents"], "every strong note's centre within 5 cents of 12-TET")
    chk("music in D major", not mq["peaks_outside_d_major"], mq["peaks_outside_d_major"], "strongest peaks in D E F# G A B C#")
    chk("music never drops out (3 to 88.8 s, before ducking)", mq["min_momentary_lufs_3_to_88_8"] >= -45.0, mq["min_momentary_lufs_3_to_88_8"], ">= -45 LUFS momentary")
    chk("music has no hard cuts", mq["max_fall_in_100ms_db"] <= 4.0, mq["max_fall_in_100ms_db"], "<= 4 dB fall within any 100 ms")

    return {
        "schema": "priora-audio-report/1",
        "targets": {
            "format": "48 kHz, 24-bit PCM, stereo, 4,320,000 samples (90.000 s)",
            "master_lufs": MASTER_LUFS, "no_narration_lufs": NONAR_LUFS, "lufs_tolerance": LUFS_TOL, "true_peak_max_dbtp": TP_MAX,
            "duck_narrator_db": DUCK_NARRATOR_DB, "duck_worker_db": DUCK_WORKER_DB, "duck_worker_db_no_narration": DUCK_WORKER_DB_NONAR,
            "duck_attack_s": DUCK_ATTACK, "duck_release_s": DUCK_RELEASE, "duck_bridge_s": DUCK_BRIDGE,
            "music_pre_duck_lufs_mix_frame": MUSIC_LUFS, "event_reference_lufs_100ms": REF_EVENT_LUFS, "sfx_bus_cap_momentary_lufs": SFX_CAP_LUFS,
            "true_peak_method": "4x polyphase oversampling (scipy resample_poly), max of all channels",
            "loudness_method": "ITU-R BS.1770-4 via pyloudnorm (integrated, gated); momentary = ungated 400 ms K-weighted windows, 10 ms hop",
        },
        "inputs": {
            "events_source": source,
            "voice": {"file": "assets/audio/voice.wav", "mono_lufs": round(float(meter.integrated_loudness(voice[:, 0])), 2)},
            "voice_worker": {"file": "assets/audio/voice-worker.wav", "mono_lufs": round(float(meter.integrated_loudness(worker[:, 0])), 2)},
        },
        "gains": {
            "master_gain_db": round(G, 3),
            "master_limiter_max_reduction_db": round(gr, 2),
            "no_narration_worker_gain_db": round(G, 3),
            "no_narration_background_gain_db": round(Gb, 3),
            "no_narration_background_over_master_db": round(Gb - G, 3),
            "no_narration_limiter_max_reduction_db": round(gr2, 2),
            "note": "master.wav = TP-limiter(G * voice.wav as dual mono, DC-blocked + music.wav + sfx.wav); the stems are written post-gain G (the level they have inside master.wav, before the limiter). master-no-narration.wav = TP-limiter(G * voice-worker.wav + Gb * (music ducked under W01 only + sfx)), Gb = no_narration_background_gain_db",
        },
        "outputs": outs,
        "music": {
            "stem_integrated_lufs": mus["integrated_lufs"],
            "loudest_momentary_400ms_lufs": mus["max_momentary_lufs"], "loudest_momentary_at_s": mus["max_momentary_at_s"],
            "analysis_before_ducking": mq,
            "plan": mplan,
        },
        "sfx": {
            "stem_integrated_lufs": sfxs["integrated_lufs"],
            "loudest_momentary_400ms_lufs": sfxs["max_momentary_lufs"], "loudest_momentary_at_s": sfxs["max_momentary_at_s"],
            "bus_leveller": lev,
        },
        "ducking": {"master": duck_spans, "no_narration": "worker line W01 only, %.1f dB" % DUCK_WORKER_DB_NONAR,
                    "music_pause_cap": c["mcap"], "music_max_move_1s_db": max_move},
        "voice_levelling": {"target_narrator_lufs": NARRATOR_TARGET_LUFS, "target_worker_lufs": WORKER_TARGET_LUFS,
                            "sentences": vl_rows, "rides": ride_rows,
                            "note": "measured in master.wav's voice component over each sentence (word times -0.03 s / +0.08 s); voice.wav is untouched"},
        "hierarchy": {"cap_others_lufs_100ms": HIERARCHY_CAP_LUFS, "s7_softer": {"from": S7_SOFTER[0], "to": S7_SOFTER[1], "kinds": list(S7_SOFTER[2]), "db": S7_SOFTER[3]},
                      "key_moments": [{k_: pl[k_] for k_ in ("kind", "t", "lufs_100ms", "measured_lufs_100ms")} for pl in keys],
                      "loudest_others": [{k_: pl[k_] for k_ in ("kind", "t", "lufs_100ms", "measured_lufs_100ms")} for pl in sorted(others, key=lambda q: -q["measured_lufs_100ms"])[:6]],
                      "opening_prints_measured": [pl["measured_lufs_100ms"] for pl in prints], "speech_fragments_measured": flicks},
        "no_narration_small_sounds": {"kinds": list(SMALL_KINDS), "sfx_peak_under_W01_dbfs": pk_w},
        "ending": end_info,
        "speech_vs_background": {"master": lines, "min_narrator_over_background_lu": min_m, "min_narrator_over_music_lu": min_mm,
                                  "no_narration_worker": worker_margin},
        "events": {
            "count": len(events), "per_kind": dict(sorted(counts.items())), "unknown_kinds": unknown,
            "span": span, "placed": placed,
        },
        "warnings": WARNINGS,
        "checks": checks,
        "all_ok": all(c["ok"] for c in checks),
    }


if __name__ == "__main__":
    sys.exit(main())
