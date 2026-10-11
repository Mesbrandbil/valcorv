#!/usr/bin/env python3
"""Makes the film's sound effects: one short sound per kind in CUES of scripts/mix-audio.ts, written to
audio sources/effects/<name>.flac (48 kHz, 24-bit, stereo).

The sounds come from one family of wood, felt and paper, soft and close. Most are physical models built in
numpy and scipy: filtered noise with fast envelopes for the paper and the card, modal resonators struck by a
soft force pulse for the tick, the felt and the card, an extended Karplus-Strong string with a soft pluck for
the thread, inharmonic bell partials with a gentle attack for the tone, and sparse crackles over a faint hiss,
built on a circular timeline so it loops without a seam, for the welding. The two pitched mallet sounds are
real instruments from a General MIDI soundfont rendered with fluidsynth: a marimba for the low wooden note and
a celesta for the delicate higher notes. Every sound then goes into one small, warm room (a seeded synthetic
impulse response, mostly dry; the short contacts hear it from very close, so their tails stay short), starts
at its onset and ends with its own decay to silence.

  name          sound                                      how                                   pitch
  paper         a soft, print-like paper contact           band-limited noise, fibre grains      none
  tick          a dry wooden tick                          14 damped wood modes, light tap       none
  thread        a fine plucked thread                      Karplus-Strong, soft pluck            A5
  thread 1-5    the same pluck, five ascending notes        Karplus-Strong                        E5 F#5 A5 B5 C#6
  felt          a muted felt landing                       low table modes, 4.5 ms felt contact  none
  card          a soft card landing on paper               card modes, slap noise, double touch  none
  weld          a faint welding crackle that loops         crackles over hiss, circular          none
  tone          a soft, clear bell-like tone               inharmonic bell partials              A5
  wood          a low wooden note                          soundfont marimba                     A2
  note          a delicate higher note                     soundfont celesta, damped             E6
  note 1-5      five ascending notes, the same sound       soundfont celesta, damped             A5 B5 D6 E6 F#6

All pitches are in D major and sit in the music's chords where each cue falls (see "sound cues.md" and the
CHORDS table in make-music.py): the thread summons cross Dadd9 into A/C#, the tone and the wood sound the A
that the chords of bars 11 to 30 share, the lone note is the E common to Gmaj13 and Esus4(add9).

Levels: each plain file peaks at -3 dBFS (sample peak). A kind's variants are matched to its plain file in
integrated loudness (ITU-R BS.1770, measured as the mix measures it, padded with 1 s of silence), because the
mix sets every variant's gain from the plain file; the whole family is lowered together if a variant would
peak above -3 dBFS. Nothing is random at run time: every sound has its own fixed seed.

Usage (from priora-motion-film, with a Python that has mido, numpy, scipy and soundfile):
  python -I scripts/audio/make-effects.py [--soundfont FILE] [--fluidsynth PATH] [--out DIR] [--only NAME ...]
or set PRIORA_SOUNDFONT and FLUIDSYNTH. The default soundfont is /usr/share/sounds/sf3/MuseScore_General.sf3
(MIT licensed), then /usr/share/sounds/sf2/FluidR3_GM.sf2.
"""
import argparse
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

import mido
import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

ROOT = Path(__file__).resolve().parents[2]
RATE = 48000
PEAK_DBFS = -3.0  # sample peak of each kind's plain file; variants never go above it
SEED = 4848
NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# the pitches (scientific names, A4 = 440 Hz, equal temperament)
THREAD = 'A5'
THREADS = ['E5', 'F#5', 'A5', 'B5', 'C#6']  # the five summons, one after another
TONE = 'A5'
WOOD = 'A2'
NOTE = 'E6'
NOTES = ['A5', 'B5', 'D6', 'E6', 'F#6']  # the five agents arriving, four frames apart

# soundfont parts: bank, program, the preset name expected, velocity, seconds before the note-off
MARIMBA = dict(bank=0, prog=12, name='Marimba', vel=52, hold=1.6)
CELESTA = dict(bank=0, prog=8, name='Celesta', vel=50, hold=0.07)


# ---------------------------------------------------------------- small helpers
def midi_of(name):
    """'F#5' -> 78."""
    letter, rest = name[0], name[1:]
    acc = 1 if rest.startswith('#') else -1 if rest.startswith('b') else 0
    octave = int(rest.lstrip('#b'))
    return 12 * (octave + 1) + {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[letter] + acc


def hz(name):
    return 440.0 * 2 ** ((midi_of(name) - 69) / 12)


def note_name(f):
    m = 69 + 12 * np.log2(f / 440.0)
    r = int(round(m))
    return f'{NAMES[r % 12]}{r // 12 - 1}', (m - r) * 100


def rng_for(name):
    """Each sound has its own seed, so changing one never changes another."""
    return np.random.default_rng([SEED, zlib.crc32(name.encode())])


def samples(seconds):
    return int(round(seconds * RATE))


def filt(x, hp=None, lp=None, order=2):
    if hp:
        x = sosfilt(butter(order, hp, 'highpass', fs=RATE, output='sos'), x, axis=0)
    if lp:
        x = sosfilt(butter(order, lp, 'lowpass', fs=RATE, output='sos'), x, axis=0)
    return x


def band(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'bandpass', fs=RATE, output='sos'), x, axis=0)


def env(n, attack, tau, hold=0.0):
    """A raised-cosine rise over `attack` seconds, an optional hold, then an exponential fall (time constant tau)."""
    t = np.arange(n) / RATE
    a = max(attack, 1.0 / RATE)
    rise = 0.5 - 0.5 * np.cos(np.pi * np.clip(t / a, 0, 1))
    fall = np.exp(-np.clip(t - a - hold, 0, None) / tau)
    return rise * fall


def half_sine(seconds):
    """The force of a soft contact: a half sine as long as the contact lasts (longer is softer)."""
    m = max(2, samples(seconds))
    p = np.sin(np.pi * (np.arange(m) + 0.5) / m)
    return p / p.sum()


def modal(n, freqs, taus, amps, rng=None, detune=0.0):
    """The impulse response of a set of damped modes, each starting at zero (a sine), so a strike never clicks."""
    t = np.arange(n) / RATE
    out = np.zeros(n)
    for f, tau, a in zip(freqs, taus, amps):
        if rng is not None and detune:
            f *= 1 + rng.uniform(-detune, detune)
        out += a * np.exp(-t / tau) * np.sin(2 * np.pi * f * t)
    return out


def struck(n, freqs, taus, energies, contact, rng, detune=0.0):
    """A body struck through a soft contact: damped modes, each holding the given share of the energy as it
    rings freely, driven by the contact's force (a half sine `contact` seconds long). A longer contact is a
    softer one and leaves the higher modes quieter, as a felt pad or a fingertip does. Returns unit peak."""
    f = [fk * (1 + rng.uniform(-detune, detune)) for fk in freqs]
    amps = [np.sqrt(e / tau) for e, tau in zip(energies, taus)]  # a damped sine rings with energy about a^2 tau / 4
    out = fftconvolve(half_sine(contact), modal(n, f, taus, amps))[:n]
    return out / np.abs(out).max()


def place(dst, src, at):
    """Adds src into dst from sample `at` (cut at the end of dst)."""
    end = min(len(dst), at + len(src))
    if end > at:
        dst[at:end] += src[:end - at]
    return dst


def dc_block(x, corner=12.0):
    """A first-order causal high-pass: no DC, no pre-echo before the onset."""
    b, a = butter(1, corner, 'highpass', fs=RATE)
    return lfilter(b, a, x, axis=0)


# ---------------------------------------------------------------- the room
def room_ir(rng, rt=(0.42, 0.32, 0.16), early=0.025, length=0.7, predelay=0.0035):
    """A small, warm room, stereo and decorrelated: a few early reflections within `early` seconds, then a
    diffuse tail that dies faster in the highs (RT60 rt[0] below 500 Hz, rt[1] in the middle, rt[2] above
    3 kHz). Each channel has unit energy."""
    n = samples(length)
    t = np.arange(n) / RATE
    ir = np.zeros((n, 2))
    for c in range(2):
        noise = rng.standard_normal(n)
        low, mid, high = filt(noise, lp=500), band(noise, 500, 3000), filt(noise, hp=3000)
        fall = lambda rt: np.exp(-6.91 * t / rt)
        tail = low * fall(rt[0]) + mid * fall(rt[1]) + 0.4 * high * fall(rt[2])
        tail *= 1 - np.exp(-t / 0.008)  # the diffuse field builds up over the first few ms
        er = np.zeros(n)
        for _ in range(9):
            d = rng.uniform(0.002, early)
            er[samples(d)] += rng.choice([-1, 1]) * rng.uniform(0.4, 0.9) * np.exp(-d / 0.02)
        er = filt(er, lp=5000)
        sig = 0.6 * er / np.sqrt((er ** 2).sum()) + tail / np.sqrt((tail ** 2).sum())
        shift = samples(predelay)
        ir[shift:, c] = sig[:n - shift]
        ir[:, c] /= np.sqrt((ir[:, c] ** 2).sum())
    return ir


ROOM = None  # the small warm room, for the sounds that ring (thread, tone, wood, note, weld)
NEAR = None  # the same kind of room heard from very close, for the short contacts (paper, tick, felt, card)


def room(dry, wet_db, near=False, mono_below=None):
    """The dry sound in the middle of both channels plus the room at wet_db (energy against the dry).
    mono_below (Hz): the room's lows are made the same in both channels. A sustained low note rings at one
    frequency, where each channel of a random room adds to the dry with its own strength and phase, so the
    note would otherwise drift to one side as it rings (the A2 wood went 10 dB left)."""
    ir = NEAR if near else ROOM
    g = 10 ** (wet_db / 20)
    wet = np.stack([g * fftconvolve(dry, ir[:, c]) for c in range(2)], axis=1)
    if mono_below:
        low = filt(wet, lp=mono_below, order=4)
        wet = wet - low + low.mean(axis=1, keepdims=True)
    out = wet.copy()
    out[:len(dry)] += dry[:, None]
    return out


def room_circular(dry, wet_db):
    """The same room for a loop: circular convolution, so the reverb of the end runs into the start."""
    g = 10 ** (wet_db / 20)
    n = len(dry)
    out = np.zeros((n, 2))
    for c in range(2):
        d = dry[:, c] if dry.ndim == 2 else dry
        out[:, c] = d + g * np.fft.irfft(np.fft.rfft(d) * np.fft.rfft(ROOM[:, c], n), n)
    return out


def finish(x, floor_db=-60.0, fade=0.015, max_s=None):
    """Removes DC, cuts the sound a few ms after its envelope falls 60 dB under its peak and fades the last
    few ms to exactly zero, so the file ends with its own decay to silence."""
    x = dc_block(x)
    mono = np.abs(x).max(axis=1)
    w = samples(0.005)
    e = np.sqrt(np.convolve(mono ** 2, np.ones(w) / w, 'same'))
    above = np.nonzero(e > e.max() * 10 ** (floor_db / 20))[0]
    end = min(len(x), above[-1] + samples(0.005))
    if max_s:
        end = min(end, samples(max_s))
    x = x[:end].copy()
    f = min(samples(fade), end // 4)
    x[end - f:] *= (0.5 + 0.5 * np.cos(np.pi * np.arange(f) / (f - 1)))[:, None]
    return x


# ---------------------------------------------------------------- loudness (ITU-R BS.1770, as the mix measures it)
def lufs(x):
    """Integrated loudness, padded with 1 s of silence like the mix (so a sound shorter than one 400 ms block
    can be measured); absolute gate -70 LUFS, relative gate -10 LU."""
    x = np.vstack([x, np.zeros((RATE, x.shape[1]))])
    y = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
    y = lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], y, axis=0)
    blk, hop = samples(0.4), samples(0.1)
    z = np.array([(y[i:i + blk] ** 2).mean(axis=0).sum() for i in range(0, len(y) - blk + 1, hop)])
    level = -0.691 + 10 * np.log10(z + 1e-30)
    z = z[level > -70]
    rel = -0.691 + 10 * np.log10(z.mean()) - 10
    z = z[-0.691 + 10 * np.log10(z) > rel]
    return -0.691 + 10 * np.log10(z.mean())


# ---------------------------------------------------------------- paper
def paper(rng):
    """A soft, print-like contact: a sheet meeting a surface. A quick puff of band-limited noise (the air and
    the fibres, 0.7 to 5 kHz) over a slower, quieter settle, a scatter of tiny fibre grains in the first
    tens of milliseconds, and a very small low thump of the table underneath."""
    n = samples(0.25)
    out = np.zeros(n)
    contact = band(rng.standard_normal(n), 700, 5000) * env(n, 0.0015, 0.014)
    settle = band(rng.standard_normal(n), 400, 2600) * env(n, 0.004, 0.022) * 0.3
    out += contact + settle
    grains = np.zeros(n)
    t = 0.001
    while t < 0.06:  # the grains thin out as the sheet comes to rest
        m = samples(rng.uniform(0.0003, 0.0011))
        g = rng.standard_normal(m) * np.hanning(m) * rng.uniform(0.3, 1.0) * np.exp(-t / 0.03)
        place(grains, g, samples(t))
        t += rng.exponential(0.0045)
    out += 0.5 * filt(grains, hp=1800, lp=7000)
    thump = fftconvolve(half_sine(0.004), modal(n, [165, 270], [0.012, 0.008], [1.0, 0.5]))[:n]
    out += 0.45 * thump / np.abs(thump).max() * np.abs(contact).max()
    out = filt(out, hp=110, lp=6000)
    return finish(room(out, -20, near=True))


# ---------------------------------------------------------------- tick
def tick(rng):
    """A dry wooden tick: a small piece of hardwood tapped with something hard and light. Wood has many close,
    heavily damped modes: fourteen of them, spread at random between 0.9 and 5.5 kHz and damped in 5 to 2 ms,
    share the energy evenly, so no pitch stands out. A 0.3 ms contact and a breath of contact noise; almost no
    room."""
    n = samples(0.1)
    freqs = np.sort(np.exp(rng.uniform(np.log(900), np.log(5500), 14)))
    taus = np.exp(np.interp(np.log(freqs), np.log([900, 5500]), np.log([0.005, 0.0018])))
    body = struck(n, freqs, taus, np.ones(len(freqs)), 0.0003, rng)
    noise = band(rng.standard_normal(n), 1500, 7000) * env(n, 0.0003, 0.0014)
    out = body + 0.3 * noise / np.abs(noise).max()
    out = filt(out, hp=400, lp=7000)
    return finish(room(out, -32, near=True))


# ---------------------------------------------------------------- thread (extended Karplus-Strong)
def ks_pluck(f0, rng, t60=0.48, length=0.95, S=0.5, pluck=0.21, soft=0.6):
    """A plucked string: an extended Karplus-Strong loop (the delay line, a two-point damping filter and a
    first-order all-pass that tunes the fractional delay), written as one IIR filter. The pluck is a soft one:
    the bridge force of a string released from a rounded triangle, low-passed (a fingertip, not a plectrum),
    with a little noise for the irregularity of a real thread. The loop gain makes the fundamental die 60 dB
    in t60 seconds whatever the pitch, so the five notes match."""
    P = RATE / f0
    N = int(np.floor(P - S - 0.1))
    D = P - S - N  # the all-pass supplies the rest of the period
    c = (1 - D) / (1 + D)
    w = 2 * np.pi * f0 / RATE
    g = 10 ** (-3 / (f0 * t60)) / abs((1 - S) + S * np.exp(-1j * w))
    # the denominator of 1 / (1 - g * L(z) * A(z) * z^-N), cleared of the all-pass's own denominator
    den = np.zeros(N + 3)
    den[0], den[1] = 1.0, c
    den[N] -= g * (1 - S) * c
    den[N + 1] -= g * ((1 - S) + S * c)
    den[N + 2] -= g * S
    num = np.array([1.0, c])
    k = np.arange(N)
    u = (k + 0.5) / N
    force = np.where(u < pluck, 1 / pluck, -1 / (1 - pluck))  # the slope of the triangle: zero mean
    force = lfilter([1 - soft], [1, -soft], np.tile(force, 3))[N:2 * N]  # rounded by the fingertip
    force += 0.12 * np.abs(force).max() * filt(rng.standard_normal(N), lp=6000)
    force -= force.mean()
    force *= np.hanning(N + 2)[1:-1] ** 0.25  # the release has no edge
    n = samples(length)
    x = np.zeros(n)
    x[:N] = force
    y = lfilter(num, den, x)
    y = filt(y, hp=200, lp=7000)
    return y / np.abs(y).max()


def thread(rng, name):
    return finish(room(ks_pluck(hz(name), rng), -18))


# ---------------------------------------------------------------- felt
def felt(rng):
    """A muted felt landing: a felt-covered weight settling on a table. The felt makes the contact long (4.5 ms),
    which leaves only the table's low modes (105 to 640 Hz, damped within tens of ms, none ringing on its own)
    and a little muffled fibre noise; nothing above about 1.5 kHz, so no click."""
    n = samples(0.3)
    body = struck(n, [105, 152, 207, 274, 358, 470, 640], [0.026, 0.021, 0.017, 0.014, 0.011, 0.009, 0.007],
                  [0.5, 0.8, 1.0, 1.0, 1.0, 0.9, 0.8], 0.0045, rng, detune=0.03)
    fibre = filt(rng.standard_normal(n), lp=1100) * env(n, 0.003, 0.016)
    out = body / np.abs(body).max() + 0.25 * fibre / np.abs(fibre).max()
    out = filt(out, hp=45, lp=1500, order=4)
    return finish(room(out, -22, near=True))


# ---------------------------------------------------------------- card
def card(rng):
    """A soft card landing flat on paper: a shorter, stiffer contact than the felt (1 ms), so the card's own
    modes (240 Hz to 2.3 kHz) and a slap of trapped air (0.5 to 3 kHz) come through, with the paper under it;
    the card settles with a second, smaller touch 16 ms later."""
    n = samples(0.28)

    def touch(scale):
        body = struck(n, [240, 390, 610, 880, 1250, 1700, 2300], [0.012, 0.011, 0.010, 0.008, 0.006, 0.005, 0.004],
                      [0.1, 0.35, 0.8, 1.0, 1.0, 0.9, 0.8], 0.001, rng, detune=0.02)
        slap = band(rng.standard_normal(n), 500, 3000) * env(n, 0.0007, 0.009)
        sheet = band(rng.standard_normal(n), 1000, 6000) * env(n, 0.001, 0.018)
        s = body + 0.6 * slap / np.abs(slap).max() + 0.14 * sheet / np.abs(sheet).max()
        return scale * s

    out = touch(1.0)
    place(out, touch(0.28), samples(0.016))
    out = filt(out, hp=80, lp=5000)
    return finish(room(out, -21, near=True))


# ---------------------------------------------------------------- weld (a seamless loop)
def weld(rng, length=3.0):
    """A faint, local welding crackle that loops: sparse crackles and a few softer pops, their rate breathing
    with a slow flicker, over a faint hiss. Everything lives on a circular timeline: a grain that runs past
    the end continues at the start, the hiss and the filters are applied in the frequency domain of the whole
    loop, and the room is a circular convolution. So the last sample leads into the first exactly as any
    sample leads into the next. The loop point sits in the quietest moment, between crackles."""
    n = samples(length)
    t = np.arange(n) / RATE

    def flicker(k_lo, k_hi, seed_rng):
        # a smooth periodic random curve: a sum of whole cycles per loop, so it joins itself
        f = np.zeros(n)
        for k in range(k_lo, k_hi + 1):
            f += seed_rng.standard_normal() / k ** 0.7 * np.cos(2 * np.pi * k * t / length + seed_rng.uniform(0, 2 * np.pi))
        return f / np.abs(f).max()

    rate_curve = 1 + 0.65 * flicker(3, 36, rng)  # 1 to 12 Hz
    level_curve = 0.75 + 0.25 * flicker(2, 20, rng)
    out = np.zeros((n, 2))

    def add(grain, at, pan):
        idx = (at + np.arange(len(grain))) % n
        np.add.at(out[:, 0], idx, grain * np.cos((pan + 1) * np.pi / 4))
        np.add.at(out[:, 1], idx, grain * np.sin((pan + 1) * np.pi / 4))

    # the crackle sits mostly above the speech band (a welding arc sizzles high), so it stays audible however
    # faint, without crowding the voice
    shapes = [butter(2, [2500, 9000], 'bandpass', fs=RATE, output='sos'),
              butter(2, [1800, 6000], 'bandpass', fs=RATE, output='sos'),
              butter(2, 3500, 'highpass', fs=RATE, output='sos')]
    max_rate = 140.0  # thinned to about 40 a second on average, more where the flicker is up
    at = 0.0
    while True:
        at += rng.exponential(1 / max_rate)
        if at >= length:
            break
        i = int(at * RATE)
        if rng.uniform() > 0.5 * rate_curve[i] / 1.65:  # thinning: the rate follows the flicker
            continue
        amp = rng.lognormal(0, 0.55) * level_curve[i]
        if rng.uniform() > 0.08:  # a crackle
            m = samples(rng.uniform(0.0015, 0.004))
            g = rng.standard_normal(m) * np.exp(-np.arange(m) / RATE / rng.uniform(0.00015, 0.0006))
            g = sosfilt(shapes[rng.integers(0, 3)], np.concatenate([g, np.zeros(samples(0.004))]))
        else:  # a softer, lower pop
            m = samples(0.012)
            tt = np.arange(m) / RATE
            tau = rng.uniform(0.0015, 0.0035)
            g = np.sin(2 * np.pi * rng.uniform(900, 2000) * tt) * np.exp(-tt / tau)
            g += 0.6 * sosfilt(shapes[1], rng.standard_normal(m)) * np.exp(-tt / tau)
            amp *= 0.6
        add(amp * g / (np.abs(g).max() + 1e-12), i, rng.uniform(-0.35, 0.35))
    # the hiss: white noise shaped in the frequency domain of the whole loop (so it is periodic too)
    hiss = np.zeros((n, 2))
    fr = np.fft.rfftfreq(n, 1 / RATE)
    shape = 1 / np.sqrt(1 + (3000 / np.maximum(fr, 1)) ** 4) / np.sqrt(1 + (fr / 10000) ** 4)
    for c in range(2):
        hiss[:, c] = np.fft.irfft(np.fft.rfft(rng.standard_normal(n)) * shape, n)
    hiss *= (0.8 + 0.2 * flicker(4, 30, rng))[:, None]
    hiss *= 0.085 * np.abs(out).max() / np.abs(hiss).max()
    out += hiss
    # a soft overall tone, circular as well: a high-pass at 600 Hz and a firm low-pass at 7.5 kHz (24 dB an
    # octave), so the crackles sizzle between 2 and 8 kHz and do not run as sharp clicks up to 24 kHz
    tone = 1 / np.sqrt(1 + (fr / 7500) ** 8) / np.sqrt(1 + (600 / np.maximum(fr, 1)) ** 4)
    for c in range(2):
        out[:, c] = np.fft.irfft(np.fft.rfft(out[:, c]) * tone, n)
    out = room_circular(out, -14)
    out -= out.mean(axis=0)  # a periodic signal: removing the mean keeps the seam intact
    # turn the loop so that it starts (and so joins itself) in its quietest 10 ms, between crackles, as a
    # loop point is chosen by hand; turning a periodic signal keeps it periodic
    w = samples(0.01)
    power = np.abs(out).max(axis=1) ** 2
    ring = np.convolve(np.concatenate([power, power[:w - 1]]), np.ones(w), 'valid')
    start = (int(np.argmin(ring)) + w // 2) % n
    return np.roll(out, -start, axis=0)


# ---------------------------------------------------------------- tone
def tone(rng):
    """A soft, clear bell-like tone: the ring locking. A small tuned bell struck with a soft mallet: the prime
    (A5) and its hum an octave below, the nominal an octave above, each a slowly beating pair as in a real
    bell; a few weak, short-lived inharmonic partials give the metal; every partial rises over a few ms. It
    rings about 1.9 s."""
    f0 = hz(TONE)
    n = samples(2.4)
    t = np.arange(n) / RATE
    # ratio to the prime, amplitude, T60 (s), attack (s), beat (Hz, the second of a pair)
    partials = [(0.5, 0.15, 1.9, 0.012, 0.35), (1.0, 1.0, 1.95, 0.010, 0.9), (2.0, 0.21, 1.15, 0.008, 1.6),
                (8 / 3, 0.06, 0.6, 0.005, 0.0), (4.18, 0.028, 0.32, 0.004, 0.0), (5.43, 0.014, 0.2, 0.003, 0.0)]
    out = np.zeros(n)
    for ratio, amp, t60, att, beat in partials:
        f = f0 * ratio
        e = env(n, att, t60 / 6.91)
        ph = rng.uniform(0, 2 * np.pi)
        s = np.sin(2 * np.pi * f * t + ph) - np.sin(ph) * np.exp(-t / 0.002)  # starts from zero
        if beat:
            s += 0.4 * np.sin(2 * np.pi * (f + beat) * t + ph)
            s /= 1.4
        out += amp * e * s
    mallet = filt(rng.standard_normal(n), lp=1200) * env(n, 0.002, 0.004)
    out += 0.02 * mallet / np.abs(mallet).max()
    out = filt(out, hp=150)
    # under 2 s: the mix measures each file with ffmpeg's loudnorm, which reads a decaying sound low once the
    # file and its 1 s of padding pass 3 s, and would then set this one too loud
    return finish(room(out, -17), max_s=1.95)


# ---------------------------------------------------------------- the soundfont instruments
class Fluid:
    def __init__(self, fluidsynth, soundfont, work):
        self.bin, self.sf, self.work = fluidsynth, soundfont, Path(work)

    def render(self, part, pitch, bend=0, total=None):
        """One note, dry (fluidsynth's reverb and chorus off), mono, cut to its onset."""
        total = total or part['hold'] + 2.0
        mid = mido.MidiFile(type=0, ticks_per_beat=480)
        tr = mido.MidiTrack()
        mid.tracks.append(tr)
        tr.append(mido.MetaMessage('set_tempo', tempo=500000, time=0))  # 960 ticks a second
        for m in [mido.Message('control_change', control=0, value=part['bank']),
                  mido.Message('control_change', control=32, value=0),
                  mido.Message('program_change', program=part['prog']),
                  mido.Message('control_change', control=7, value=100),
                  mido.Message('control_change', control=10, value=64),
                  mido.Message('control_change', control=11, value=127),
                  mido.Message('control_change', control=91, value=0),
                  mido.Message('control_change', control=93, value=0),
                  mido.Message('pitchwheel', pitch=int(bend))]:
            tr.append(m)
        tr.append(mido.Message('note_on', note=midi_of(pitch), velocity=part['vel'], time=0))
        tr.append(mido.Message('note_off', note=midi_of(pitch), velocity=0, time=int(part['hold'] * 960)))
        tr.append(mido.MetaMessage('end_of_track', time=int((total - part['hold']) * 960)))
        mp, wp = self.work / f'{pitch}.mid', self.work / f'{pitch}.wav'
        mid.save(str(mp))
        subprocess.run([self.bin, '-ni', '-q', '-R', '0', '-C', '0', '-O', 'float', '-r', str(RATE), '-g', '1.0',
                        '-F', str(wp), str(self.sf), str(mp)], check=True, capture_output=True)
        x, sr = sf.read(str(wp), dtype='float64', always_2d=True)
        if sr != RATE:
            raise SystemExit(f'fluidsynth wrote {sr} Hz, expected {RATE}')
        x = x.mean(axis=1)
        on = np.argmax(np.abs(x) > np.abs(x).max() * 1e-3)  # the first sample within 60 dB of the peak
        return x[on:]

    def tuned(self, part, pitch):
        """Renders the note, measures its fundamental and, if the sample is off by more than 2 cents, renders it
        again with the pitch wheel set to correct it (the GM bend range is 2 semitones)."""
        x = self.render(part, pitch)
        cents = cents_off(x, hz(pitch))
        if abs(cents) > 2:
            x = self.render(part, pitch, bend=int(round(-cents / 200 * 8192)))
        return x


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


def cents_off(x, f_expected):
    """How far the strongest partial within a semitone of f_expected is from it, in cents (20 to 400 ms)."""
    seg = x[samples(0.02):samples(0.4)]
    nfft = 1 << 20
    spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), nfft))
    fr = np.fft.rfftfreq(nfft, 1 / RATE)
    win = (fr > f_expected * 2 ** (-1 / 12)) & (fr < f_expected * 2 ** (1 / 12))
    i = np.nonzero(win)[0][np.argmax(spec[win])]
    a, b, c = np.log(spec[i - 1:i + 2])
    f = fr[i] + 0.5 * (a - c) / (a - 2 * b + c) * (fr[1] - fr[0])
    return 1200 * np.log2(f / f_expected)


def wood(fluid):
    """A low wooden note: a real marimba bar (soundfont), A2, struck with a soft mallet; its resonator tube
    gives the slow bloom of the first 100 ms. A gentle low-pass keeps it warm."""
    x = fluid.tuned(MARIMBA, WOOD)
    x = filt(x, hp=40, lp=3000)
    return finish(room(x, -17, mono_below=300), max_s=1.5)


def note(fluid, pitch):
    """A delicate higher note: a real celesta (soundfont), damped soon after the strike so it rings under a
    second and five quick notes do not blur."""
    x = fluid.tuned(CELESTA, pitch)
    x = filt(x, hp=250, lp=9000)
    return finish(room(x, -18), max_s=1.0)


# ---------------------------------------------------------------- writing
def write(out_dir, name, x):
    for ext in ('.wav', '.mp3', '.m4a', '.flac'):  # the mix prefers .wav, so no stale copy may stay behind
        p = out_dir / f'{name}{ext}'
        if p.exists():
            p.unlink()
    sf.write(str(out_dir / f'{name}.flac'), x, RATE, subtype='PCM_24', format='FLAC')


def peak_db(x):
    return 20 * np.log10(np.abs(x).max())


def main():
    global ROOM, NEAR
    default_sf = next((p for p in ('/usr/share/sounds/sf3/MuseScore_General.sf3', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
                       if Path(p).exists()), None)
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--soundfont', default=os.environ.get('PRIORA_SOUNDFONT', default_sf), help='GM soundfont (or PRIORA_SOUNDFONT)')
    ap.add_argument('--fluidsynth', default=os.environ.get('FLUIDSYNTH', 'fluidsynth'), help='fluidsynth binary (or FLUIDSYNTH)')
    ap.add_argument('--out', default=str(ROOT / 'audio sources' / 'effects'))
    ap.add_argument('--only', nargs='*', help='make only these kinds (for example: thread weld)')
    args = ap.parse_args()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    ROOM = room_ir(rng_for('room'))
    NEAR = room_ir(rng_for('near'), rt=(0.20, 0.15, 0.08), early=0.012, length=0.35)

    kinds = ['paper', 'tick', 'thread', 'felt', 'card', 'weld', 'tone', 'wood', 'note']
    if args.only:
        kinds = [k for k in kinds if k in args.only]
    needs_fluid = any(k in ('wood', 'note') for k in kinds)
    fluid, work = None, None
    if needs_fluid:
        if not args.soundfont or not Path(args.soundfont).exists():
            raise SystemExit('no soundfont: pass --soundfont or set PRIORA_SOUNDFONT')
        binary = shutil.which(args.fluidsynth) or args.fluidsynth
        if not Path(binary).exists():
            raise SystemExit(f'fluidsynth not found: {args.fluidsynth}')
        have = presets(args.soundfont)
        for part in (MARIMBA, CELESTA):
            got = have.get((part['bank'], part['prog']))
            if not got or part['name'].lower() not in got.lower():
                raise SystemExit(f"{args.soundfont} has no {part['name']} at bank {part['bank']}, program {part['prog']} (found: {got})")
        work = tempfile.mkdtemp(prefix='priora-effects-')
        fluid = Fluid(binary, args.soundfont, work)

    # each kind: its plain sound and its variants, as (file name, samples, pitch or None)
    families = {}
    for k in kinds:
        if k == 'paper':
            families[k] = [('paper', paper(rng_for('paper')), None)]
        elif k == 'tick':
            families[k] = [('tick', tick(rng_for('tick')), None)]
        elif k == 'thread':
            families[k] = [('thread', thread(rng_for('thread'), THREAD), THREAD)] + [
                (f'thread {i + 1}', thread(rng_for(f'thread {i + 1}'), p), p) for i, p in enumerate(THREADS)]
        elif k == 'felt':
            families[k] = [('felt', felt(rng_for('felt')), None)]
        elif k == 'card':
            families[k] = [('card', card(rng_for('card')), None)]
        elif k == 'weld':
            families[k] = [('weld', weld(rng_for('weld')), None)]
        elif k == 'tone':
            families[k] = [('tone', tone(rng_for('tone')), TONE)]
        elif k == 'wood':
            families[k] = [('wood', wood(fluid), WOOD)]
        elif k == 'note':
            families[k] = [('note', note(fluid, NOTE), NOTE)] + [
                (f'note {i + 1}', note(fluid, p), p) for i, p in enumerate(NOTES)]

    print(f"{'file':10} {'ms':>6} {'peak':>7} {'LUFS':>7}  pitch")
    for k, members in families.items():
        # the plain file to PEAK_DBFS, the variants to its loudness, then the family lowered if any peak is over
        # (measured at the level written, as the mix measures it: the absolute gate makes loudness level-dependent)
        def to_peak(x, db):
            return x * 10 ** ((db - peak_db(x)) / 20)

        def match(x, target):
            for _ in range(3):
                x = x * 10 ** ((target - lufs(x)) / 20)
            return x

        top = PEAK_DBFS
        for _ in range(4):
            plain = to_peak(members[0][1], top)
            scaled = [plain] + [match(to_peak(x, top), lufs(plain)) for _, x, _ in members[1:]]
            over = max(peak_db(x) for x in scaled) - PEAK_DBFS
            if over <= 0.005:
                break
            top -= over
        for (name, _, pitch), x in zip(members, scaled):
            write(out_dir, name, x)
            p = ''
            if pitch:
                f, c = note_name(hz(pitch) * 2 ** (cents_off(x.mean(axis=1), hz(pitch)) / 1200))
                p = f'{pitch} ({f} {c:+.0f} c)'
            print(f'{name:10} {len(x) / RATE * 1000:6.0f} {peak_db(x):7.2f} {lufs(x):7.2f}  {p}')
    if work:
        shutil.rmtree(work, ignore_errors=True)
    print(f'wrote {sum(len(m) for m in families.values())} files to {out_dir}')


if __name__ == '__main__':
    sys.exit(main())
