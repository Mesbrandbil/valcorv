"""The thread: the score's sustained harmonic bed (cut 3).

One sound runs from the first frame to END and ties the film together. It is
synthesised here, not played from the soundfont, for three reasons measured
on cut 2: the soundfont pads and slow strings beat against themselves (their
layers are detuned by 5 to 20 cents, 14 to 27 dB of amplitude beating on a
held note), a MIDI chord change re-attacks every voice, and a family that
must stop and start between sections cannot be one continuous sound.

Each chord tone is a band-limited harmonic tone in exact equal temperament at
A = 440 Hz (two wavetables per channel, dark and bright, crossfaded by a
brightness curve). A tone that is common to two chords simply continues;
tones that leave fade out and tones that arrive fade in on equal-power curves
around the chord's bar line, so a chord change is a voice-led crossfade and
never a re-attack. Life comes from a very slow amplitude drift and a pitch
drift of about 1 cent (mean zero), never from detuning. The stereo image
comes from static phase offsets between the channels (the fundamental is
identical in both, so the mono fold-down keeps its body).
"""
from __future__ import annotations

import numpy as np

from . import dsp
from .dsp import SR, ns, rng

N_TAB = 4096
_TABLES: dict = {}


def hz(p: int) -> float:
    return 440.0 * 2 ** ((p - 69) / 12.0)


def _tables(p: int, seed: int):
    """Dark and bright single-cycle tables (left, right) for MIDI pitch p,
    each normalised to unit RMS so brightness changes colour, not level."""
    key = (p, seed)
    if key in _TABLES:
        return _TABLES[key]
    f = hz(p)
    r = rng(seed, "thread-tables", p)
    K = int(max(1, min(24, 5200.0 // f)))
    k = np.arange(1, K + 1, dtype=float)
    dark = k ** -2.2 * np.exp(-(k * f) / 2600.0)
    bright = k ** -1.4 * np.exp(-(k * f) / 4200.0)
    ph_l = r.uniform(0, 2 * np.pi, K)
    dphi = r.uniform(-0.75, 0.75, K)
    dphi[0] = 0.0
    ph_r = ph_l + dphi
    x = np.arange(N_TAB) / N_TAB
    arg = 2 * np.pi * k[:, None] * x[None, :]

    def tab(a, ph):
        y = np.sum(a[:, None] * np.sin(arg + ph[:, None]), axis=0)
        y = y / np.sqrt(np.mean(y * y))
        return np.append(y, y[0])
    out = (tab(dark, ph_l), tab(dark, ph_r), tab(bright, ph_l), tab(bright, ph_r))
    _TABLES[key] = out
    return out


def render(tones, n: int, bright: np.ndarray, seed: int = 0) -> np.ndarray:
    """Render the thread's tones into a stereo array of n samples.

    tones: [{"p": MIDI pitch, "t0", "t1": seconds, "fin", "fout": seconds of
    equal-power fade at each end, "w": linear weight}]; bright: per-sample
    brightness 0..1 (length n).
    """
    out = np.zeros((n, 2))
    grid = np.arange(N_TAB + 1, dtype=float)
    for i, tn in enumerate(tones):
        a, b = max(ns(tn["t0"]), 0), min(ns(tn["t1"]), n)
        m = b - a
        if m <= 8:
            continue
        p = int(tn["p"])
        f = hz(p)
        r = rng(seed, "thread-tone", i, p, round(float(tn["t0"]), 4))
        drift = 1.0 * dsp.smooth_noise(m, r, 0.22)             # cents, about +-1
        inst = f * 2 ** (drift / 1200.0)
        ph = (r.uniform(0, 1) + np.cumsum(inst) / SR) % 1.0
        idx = ph * N_TAB
        dl, dr, bl, br = _tables(p, seed)
        bb = bright[a:b]
        left = np.interp(idx, grid, dl)
        left += bb * (np.interp(idx, grid, bl) - left)
        right = np.interp(idx, grid, dr)
        right += bb * (np.interp(idx, grid, br) - right)
        t = np.arange(m) / SR
        env = np.ones(m)
        fi, fo = max(float(tn["fin"]), 0.005), max(float(tn["fout"]), 0.005)
        u = np.clip(t / fi, 0, 1)
        env *= np.sin(0.5 * np.pi * u)
        u = np.clip((m / SR - t) / fo, 0, 1)
        env *= np.sin(0.5 * np.pi * u)
        env *= float(tn["w"]) * (1.0 + 0.06 * dsp.smooth_noise(m, r, 0.09))
        out[a:b, 0] += left * env
        out[a:b, 1] += right * env
    return out
