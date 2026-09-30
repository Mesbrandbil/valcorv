"""Procedural material sound library.

Every function takes a seed plus physical parameters and returns a stereo
float array at 48 kHz, peak normalised to -1 dBFS. The designed playback level
of each kind lives in KINDS (level_db): an event's own gain is relative to it.

Design notes: sounds are built from the physics of the material, not from
presets. Friction (graphite, pen, paper) is band-limited noise modulated by
the surface's tooth; impacts (ruler, stamp, valve, latch) are a contact pulse
exciting a small set of damped modes, with the mallet contact time setting
the brightness (felt is a long contact, hence round and dark); air (vent,
wind) is coloured noise with slow motion. Nothing is sampled.
"""
from __future__ import annotations

import numpy as np

from . import dsp
from .dsp import (SR, ns, rng, white, colored, bp, lp, hp, eq, reson, modal, click,
                  thump, ar, perc, fade, mix, delay, normalize, curve, spread, pan,
                  band_sweep, smooth_noise, poisson_impulses, decay, tvec, verb)

NOTE = {}
_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
for _m in range(21, 109):
    NOTE[f"{_names[_m % 12]}{_m // 12 - 1}"] = 440.0 * 2 ** ((_m - 69) / 12.0)


def _out(y: np.ndarray, r=None, width: float = 0.12, peak_db: float = -1.0) -> np.ndarray:
    """Finish a mono or stereo sound: stereo image, micro fades, normalise."""
    if y.ndim == 1:
        y = spread(y, r if r is not None else rng(0, "spread"), width) if width > 0 else dsp.st(y)
    y = hp(y, 28, 2)  # no DC, no sub rumble from any one-shot
    y = fade(y, 0.0003, 0.004)
    return normalize(y, peak_db)


# ================================================================ friction

def pencil_stroke(seed=0, dur=0.5, pressure=0.7, speed=1.0, corners=None) -> np.ndarray:
    """Graphite on cartridge paper. Dry, grainy, soft-edged.

    pressure (0..1) darkens and thickens the line; speed scales the grain rate;
    corners (list of 0..1 positions) insert brief lifts where the stroke turns.
    """
    r = rng(seed, "pencil", round(dur, 4), pressure, speed)
    n = ns(dur + 0.045)
    env = ar(n, 0.012 + 0.01 * (1 - speed), 0.028)
    if corners is None and dur > 0.45:
        corners = sorted(r.uniform(0.25, 0.8, int(dur // 0.45)))
    for c in corners or []:
        i = int(c * n)
        w = ns(0.022)
        lo_, hi_ = max(i - w, 0), min(i + w, n)
        env[lo_:hi_] *= 1 - 0.5 * np.sin(np.linspace(0, np.pi, hi_ - lo_))
    # graphite grain: dense micro-fractures with heavy-tailed amplitudes
    top = 7600 - 2200 * pressure
    grain = bp(poisson_impulses(n, 2600 * speed, r, 1.0), 1400, top, 2)
    grain /= dsp.rms(grain) + 1e-12
    # continuous friction under the grain
    hiss = colored(n, r, -2.5, lo=900, hi=top)
    # paper fibres: slow irregular pressure texture
    fib = lp(np.abs(poisson_impulses(n, 70 * speed, r, 0.6)), 45, 2)
    fib = 0.62 + 0.38 * np.clip(fib / (np.percentile(fib, 97) + 1e-12), 0, 1)
    wander = 1.0 + 0.15 * smooth_noise(n, r, 5.0)
    y = (grain * 0.85 + hiss * 0.32) * fib * wander * env
    # paper and desk body: faint, gives weight without boom
    body = lp(hp(white(n, r), 150, 2), 560, 2) * env * (0.04 + 0.06 * pressure)
    y = y + body
    y = mix(y, click(r, 1400, 6500, 0.004, 0.0009) * 0.8)  # the graphite landing
    y = eq(y, "peak", 3300, -3.0, 0.9)  # keep the 2 to 5 kHz region calm
    return _out(y, r, 0.1)


def pencil_tick(seed=0) -> np.ndarray:
    """A check mark: short down stroke, turn, longer up stroke."""
    r = rng(seed, "tick")
    a = pencil_stroke(seed * 7 + 1, dur=r.uniform(0.05, 0.07), pressure=0.8, speed=1.3, corners=[])
    b = pencil_stroke(seed * 7 + 2, dur=r.uniform(0.11, 0.15), pressure=0.6, speed=1.6, corners=[])
    return _out(mix(a, delay(b * 0.8, r.uniform(0.055, 0.075))), r, 0)


def pencil_hatch(seed=0, dur=0.8, rate=7.0) -> np.ndarray:
    """Hatching: rapid back and forth strokes."""
    r = rng(seed, "hatch", dur, rate)
    parts, t = [], 0.0
    k = 0
    while t < dur:
        d = (1.0 / rate) * r.uniform(0.6, 0.8)
        s = pencil_stroke(seed * 31 + k, dur=d, pressure=0.55, speed=1.4, corners=[])
        parts.append(delay(s * r.uniform(0.7, 1.0), t))
        t += 1.0 / rate * r.uniform(0.92, 1.08)
        k += 1
    return _out(mix(*parts), r, 0)


def technical_pen(seed=0, dur=0.6, speed=1.0) -> np.ndarray:
    """Technical pen (fine nib, ink): smoother and finer than graphite."""
    r = rng(seed, "pen", round(dur, 4), speed)
    n = ns(dur + 0.03)
    env = ar(n, 0.008, 0.018)
    grain = bp(poisson_impulses(n, 6500 * speed, r, 0.45), 2400, 9500, 2)
    grain /= dsp.rms(grain) + 1e-12
    hiss = colored(n, r, -3.0, lo=1500, hi=9000)
    nib = (reson(white(n, r), r.uniform(4100, 4700), 18) +
           0.7 * reson(white(n, r), r.uniform(6300, 7200), 22))
    nib /= dsp.rms(nib) + 1e-12
    drag = lp(hp(white(n, r), 180, 2), 900, 2)
    wander = 1.0 + 0.1 * smooth_noise(n, r, 4.0)
    y = (grain * 0.55 + hiss * 0.45 + nib * 0.12 + drag * 0.1) * env * wander
    y = eq(y, "peak", 3500, -3.0, 1.0)
    return _out(y, r, 0.08)


def paper_slide(seed=0, dur=0.8, pan0=-0.25, pan1=0.25) -> np.ndarray:
    """A sheet sliding over paper: soft broadband friction, moving in space."""
    r = rng(seed, "slide", dur)
    n = ns(dur)
    base = colored(n, r, -3.5, lo=320, hi=6500)
    imp = np.abs(poisson_impulses(n, 260, r, 0.6))
    tex = lp(imp, 180, 2)
    tex = tex / (np.percentile(tex, 95) + 1e-9)
    am = 0.8 + 0.2 * np.clip(tex, 0, 1.5) / 1.5
    env = ar(n, 0.07 + 0.08 * dur, 0.2 * dur + 0.05) * (0.85 + 0.15 * np.sin(np.pi * np.linspace(0, 1, n)))
    body = lp(hp(white(n, r), 90, 2), 320, 2) * 0.22
    y = (base * am + body) * env
    y = eq(y, "peak", 3000, -2.5, 0.8)
    # moving pan (constant power)
    p = np.linspace(pan0, pan1, n)
    th = (p + 1) * np.pi / 4
    s = np.stack([y * np.cos(th), y * np.sin(th)], 1)
    return _out(s, r)


def _crinkle(r, n, count_rate=110.0, lo=1800, hi=7500, dur=None) -> np.ndarray:
    """Paper cracks: sparse sharp events through a bright resonant body."""
    imp = poisson_impulses(n, count_rate, r, 0.8)
    y = (reson(imp, r.uniform(2300, 2700), 6) + reson(imp, r.uniform(3700, 4300), 7) * 0.8 +
         reson(imp, r.uniform(5200, 6000), 8) * 0.5)
    return bp(y, lo, hi, 2)


def paper_lift(seed=0) -> np.ndarray:
    """A sheet lifted off the pile: crackle, a short rising air, a soft whuff."""
    r = rng(seed, "lift")
    n = ns(0.42)
    cr = _crinkle(r, ns(0.09), 90) * perc(ns(0.09), 0.003, 0.08)
    sw_n = ns(0.24)
    sw = band_sweep(sw_n, r, [500, 1300, 2400, 1700], [0.9, 0.7, 0.6, 0.8]) * ar(sw_n, 0.05, 0.14)
    sw = sw * (0.8 + 0.2 * smooth_noise(sw_n, r, 35.0))
    sw = sw + _crinkle(r, sw_n, 70) * ar(sw_n, 0.05, 0.14) * 0.05
    wh_n = ns(0.14)
    wh = lp(hp(white(wh_n, r), 60, 2), 240, 2) * perc(wh_n, 0.02, 0.12) * 0.6
    y = mix(cr * 0.35, delay(sw, 0.03), delay(wh, 0.06))
    y = dsp.pad_to(y, n)
    return _out(pan(y, 0.0) * 1.4, r)


def page_turn(seed=0, direction=1.0) -> np.ndarray:
    """A page turned: lift crackle, the sweep across, the soft settle."""
    r = rng(seed, "page", direction)
    lift = paper_lift(seed * 3 + 1) * 0.55
    n = ns(0.42)
    sw = band_sweep(n, r, [380, 1100, 2600, 1900, 900], [1.0, 0.8, 0.6, 0.7, 0.9], nper=2048, hop=512)
    sw = sw * ar(n, 0.12, 0.2)
    p = np.linspace(-0.45 * direction, 0.45 * direction, n)
    th = (p + 1) * np.pi / 4
    sws = np.stack([sw * np.cos(th), sw * np.sin(th)], 1)
    sn = ns(0.18)
    settle = (lp(hp(white(sn, r), 120, 2), 380, 2) * perc(sn, 0.006, 0.14) * 0.9 +
              bp(white(sn, r), 1000, 4200, 2) * perc(sn, 0.002, 0.03) * 0.35 +
              _crinkle(r, sn, 40) * perc(sn, 0.01, 0.12) * 0.15)
    y = mix(lift, delay(sws, 0.08), delay(pan(settle, 0.3 * direction), 0.47))
    return _out(y, r)


def paper_stack(seed=0) -> np.ndarray:
    """Soft stack of sheets settling on a desk."""
    r = rng(seed, "stack")
    parts = []
    for k, (off, g) in enumerate([(0.0, 1.0), (0.035, 0.7), (0.075, 0.5), (0.11, 0.35)]):
        m = ns(r.uniform(0.07, 0.12))
        f = band_sweep(m, r, [700, r.uniform(1200, 1800), 800], [0.9, 0.8, 0.9]) * ar(m, 0.01, 0.06)
        parts.append(delay(pan(f * g, r.uniform(-0.3, 0.3)), off))
    tn = ns(0.12)
    th = lp(hp(white(tn, r), 90, 2), 330, 2) * perc(tn, 0.004, 0.1) * 1.2
    parts.append(delay(dsp.st(th), 0.1))
    return _out(mix(*parts), r)


# ================================================================ impacts

def ruler_contact(seed=0) -> np.ndarray:
    """Plastic ruler set down on paper over a desk: soft 'tak' plus settle."""
    r = rng(seed, "ruler")
    body = thump(200, 150, 0.05, 0.12) * 0.55
    modes = modal([620, 1450, 2380, 3700], [0.07, 0.05, 0.035, 0.02], [1, 0.55, 0.3, 0.15],
                  0.2, mallet_ms=0.7, r=r, jitter_cents=40)
    clk = click(r, 1500, 6500, 0.003, 0.0007) * 0.4
    sn = ns(0.05)
    scrape = bp(white(sn, r), 700, 4500, 2) * perc(sn, 0.01, 0.04) * 0.07
    y = mix(body, modes * 0.55, clk, delay(scrape, 0.012))
    y = lp(y, 8500, 2)
    return _out(verb(y, "room", 0.08, seed=3)[: ns(0.35)], r)


def set_square_tap(seed=0) -> np.ndarray:
    """Acrylic set square: corner, then edge, a brighter crisper double tap."""
    r = rng(seed, "square")
    def tap(g, s):
        m = modal([1150, 2470, 3920, 5600], [0.09, 0.06, 0.04, 0.025], [1, 0.5, 0.28, 0.12],
                  0.22, mallet_ms=0.4, r=s, jitter_cents=35)
        return mix(m * 0.6, thump(230, 170, 0.04, 0.1) * 0.35, click(s, 2000, 8000, 0.003, 0.0006) * 0.3) * g
    y = mix(tap(1.0, r), delay(tap(0.55, rng(seed, "square2")), r.uniform(0.02, 0.03)))
    y = lp(y, 9000, 2)
    return _out(verb(y, "room", 0.07, seed=3)[: ns(0.4)], r)


def stamp(seed=0) -> np.ndarray:
    """Rubber stamp on paper on a desk: thud, slap, desk ring, peel."""
    r = rng(seed, "stamp")
    thud = thump(112, 76, 0.16, 0.36)
    sn = ns(0.06)
    slap = bp(white(sn, r) * decay(sn, 0.03), 280, 2600, 2) * 0.55
    desk = modal([185, 410, 730, 1180], [0.14, 0.09, 0.06, 0.04], [0.5, 0.35, 0.22, 0.1],
                  0.3, mallet_ms=1.6, r=r, jitter_cents=20)
    qn = ns(0.04)
    squish = lp(white(qn, r), 650, 2) * perc(qn, 0.004, 0.035) * 0.25
    pn = ns(0.08)
    peel = (bp(poisson_impulses(pn, 380, r, 0.7), 1500, 6500, 2) * 0.6 +
            bp(white(pn, r), 1200, 5000, 2) * 0.12) * perc(pn, 0.01, 0.07)
    y = mix(thud * 0.9, slap, desk * 0.8, squish, delay(peel * 0.3, 0.27))
    y = dsp.saturate(y, 5.0)
    y = lp(y, 7500, 2)
    return _out(verb(y, "room", 0.1, seed=5)[: ns(0.6)], r)


# ================================================================ site

def radio_click(seed=0) -> np.ndarray:
    """Two-way radio push-to-talk: mechanical click and a small electrical pop."""
    r = rng(seed, "radio")
    a = click(r, 1200, 5200, 0.004, 0.0009)
    b = click(r, 1500, 6000, 0.004, 0.0007) * 0.6
    pn = ns(0.015)
    pop = bp(white(pn, r) * decay(pn, 0.008), 300, 3000, 2) * 0.3
    y = mix(a, delay(b, 0.0035), delay(pop, 0.001))
    y = bp(y, 260, 4800, 4)
    return _out(verb(y, "room", 0.12, seed=7)[: ns(0.2)], r, 0.05)


def radio_squelch(seed=0, dur=0.3) -> np.ndarray:
    """Short squelch: key-up click, a carrier breath, the tail burst, release."""
    r = rng(seed, "squelch", dur)
    n = ns(dur)
    t = tvec(n)
    hiss = bp(white(n, r), 480, 3300, 2) * (0.75 + 0.25 * np.sin(2 * np.pi * 47 * t) * smooth_noise(n, r, 9))
    hiss *= ar(n, 0.004, 0.012) * 0.22
    tn = ns(0.05)
    tail = bp(white(tn, r), 850, 2900, 2) * 0.55 * ar(tn, 0.002, 0.006, hold=0.04)
    y = mix(radio_click(seed) * 0.5, hiss, delay(tail, dur - 0.05), delay(radio_click(seed + 1) * 0.35, dur))
    y = bp(y, 300, 3800, 4)
    return _out(y, r, 0.05)


def footstep(seed=0, surface="gravel") -> np.ndarray:
    r = rng(seed, "step", surface)
    if surface == "gravel":
        def crunch(g, d):
            m = ns(d)
            grains = poisson_impulses(m, 3200, r, 0.8)
            y = (reson(grains, r.uniform(1600, 2200), 4) + reson(grains, r.uniform(3200, 4200), 5) * 0.7)
            y = bp(y, 900, 7000, 2) * perc(m, 0.004, d * 0.9)
            return y * g
        heel = mix(crunch(1.0, 0.08), thump(125, 85, 0.05, 0.09) * 0.25)
        toe = crunch(0.6, 0.06)
        y = mix(heel, delay(toe, r.uniform(0.09, 0.13)))
    else:
        hn = ns(0.03)
        heel = mix(click(r, 700, 6000, 0.006, 0.0016), reson(white(hn, r) * decay(hn, 0.02), 1500, 3) * 0.35,
                   thump(150, 105, 0.04, 0.07) * 0.35)
        sn = ns(0.06)
        scuff = bp(white(sn, r), 1800, 6500, 2) * perc(sn, 0.01, 0.05) * 0.12
        toe = click(r, 900, 5000, 0.005, 0.0012) * 0.5
        y = mix(heel, delay(scuff, 0.02), delay(toe, r.uniform(0.09, 0.12)))
    y = lp(y, 6000, 2)
    return _out(verb(y, "roof", 0.25, seed=9)[: ns(0.6)], r, 0.05)


def footsteps(seed=0, count=6, interval=0.52, surface="gravel", pan0=-0.35, pan1=0.2) -> np.ndarray:
    """A short, sparse walk. Alternating feet, human timing."""
    r = rng(seed, "walk", count, surface)
    parts = []
    for k in range(count):
        t = k * interval + r.uniform(-0.025, 0.025)
        g = (0.85 if k % 2 else 1.0) * dsp.undb(r.uniform(-2, 1))
        p = pan0 + (pan1 - pan0) * k / max(count - 1, 1)
        parts.append(delay(dsp.balance(footstep(seed * 17 + k, surface), p) * g, max(t, 0)))
    return _out(mix(*parts), r, 0)


# ================================================================ mechanical

def valve_clunk(seed=0, muted=True, flow=True) -> np.ndarray:
    """Sprinkler control valve changing state: a muted mechanical clunk.

    Handle turn, a heavy damped metal impact with pipe resonance, then the
    water flow settling. Low-passed: heard through a wall, never an alarm.
    """
    r = rng(seed, "valve", muted, flow)
    hn = ns(0.15)
    turn = bp(white(hn, r), 900, 3400, 2) * ar(hn, 0.03, 0.06, hold=0.05) * 0.1
    ratchet = mix(*[delay(click(r, 1200, 5000, 0.003, 0.0008) * 0.25, 0.03 + 0.035 * k) for k in range(3)])
    impact = mix(
        thump(76, 55, 0.32, 0.8) * 0.95,
        modal([236, 598, 1127, 1790, 2610], [0.4, 0.25, 0.15, 0.09, 0.05],
              [0.6, 0.4, 0.24, 0.12, 0.05], 0.8, mallet_ms=2.6, r=r, jitter_cents=15),
        modal([110, 221], [0.9, 0.55], [0.2, 0.08], 1.0, mallet_ms=4.0),
    )
    parts = [turn, ratchet, delay(impact, 0.15)]
    if flow:
        fn = ns(0.9)
        fl = band_sweep(fn, r, [1400, 800, 450], [1.0, 0.9, 0.8], nper=2048, hop=512)
        parts.append(delay(fl * perc(fn, 0.02, 0.9) * 0.14, 0.17))
    y = mix(*parts)
    if muted:
        y = lp(y, 2600, 2)
    y = hp(y, 40, 2)
    return _out(verb(y, "room", 0.22, seed=13)[: ns(1.4)], r, 0.1)


def relay_click(seed=0) -> np.ndarray:
    """Control-panel relay: armature click with a contact bounce."""
    r = rng(seed, "relay")
    def c1(g, s):
        return mix(modal([3300, 5200, 7600], [0.015, 0.01, 0.006], [1, 0.55, 0.3], 0.04,
                         mallet_ms=0.08, r=s, jitter_cents=60) * 0.6,
                   click(s, 2000, 9000, 0.003, 0.0005) * 0.5) * g
    coil = modal([430], [0.014], [0.35], 0.03, mallet_ms=0.5)
    y = mix(c1(1.0, r), delay(c1(0.42, rng(seed, "relay2")), 0.0022), coil)
    y = lp(y, 11000, 2)
    return _out(y, r, 0.05)


def solenoid_click(seed=0) -> np.ndarray:
    """Solenoid actuation: a small body thunk under a precise click."""
    r = rng(seed, "solenoid")
    body = modal([210, 480, 900], [0.05, 0.03, 0.02], [0.8, 0.4, 0.2], 0.1, mallet_ms=0.6, r=r, jitter_cents=20)
    y = mix(body, click(r, 1500, 7000, 0.004, 0.0008) * 0.6)
    y = lp(y, 9000, 2)
    return _out(verb(y, "room", 0.1, seed=17)[: ns(0.3)], r, 0.05)


# ================================================================ tuned product sounds

def tuned(material: str, f: float, r: np.random.Generator, length: float = 1.0) -> np.ndarray:
    """A pitched material body. Modes are physical ratios for each object.

    The mallet contact time scales with the period (k / f), so a material keeps
    its character across pitches: the fundamental always sits inside the
    contact pulse's main lobe and the upper modes are rounded off by it.
    """
    def ms(k):
        return 1000.0 * k / f
    if material == "wood":        # tuned bar (marimba-like 1:4:10), rubber mallet
        return modal([f, f * 3.98, f * 9.2], [0.26 * length, 0.07, 0.025], [1, 0.3, 0.08],
                     0.5 * length + 0.12, mallet_ms=ms(0.4), r=r, jitter_cents=4)
    if material == "felt":        # metal bar under a felt mallet (vibraphone-like, no motor)
        return modal([f, f * 3.99, f * 9.9], [0.75 * length, 0.22, 0.06], [1, 0.3, 0.06],
                     0.95 * length + 0.12, mallet_ms=ms(0.62), r=r, jitter_cents=3)
    if material == "metal":       # free-free steel bar, felt-covered mallet
        return modal([f, f * 2.756, f * 5.404, f * 8.933], [0.85 * length, 0.36, 0.15, 0.06],
                     [1, 0.4, 0.16, 0.06], 1.05 * length + 0.12, mallet_ms=ms(0.45), r=r, jitter_cents=3)
    if material == "tine":        # kalimba-like tine
        return modal([f, f * 6.27, f * 17.5], [0.9 * length, 0.12, 0.03], [1, 0.25, 0.05],
                     1.05 * length + 0.12, mallet_ms=ms(0.3), r=r, jitter_cents=3)
    if material == "paper":       # card set down, pitched only by its desk body
        n = ns(0.16)
        body = modal([f, f * 2.01], [0.09, 0.035], [1, 0.25], 0.16, mallet_ms=ms(0.5), r=r)
        snap = bp(white(n, r) * decay(n, 0.018), 900, 5200, 2)
        snap *= 0.35 / (dsp.peak(snap) + 1e-12)
        return mix(body, snap)
    if material == "string":      # felt hammer on a piano string, slight inharmonicity
        B = 0.00035
        ks = np.arange(1, 7)
        fr = [f * k * np.sqrt(1 + B * k * k) for k in ks]
        return modal(fr, [1.5 * length / k ** 0.6 for k in ks], [1 / k ** 1.1 for k in ks],
                     1.6 * length + 0.12, mallet_ms=ms(0.7), r=r, jitter_cents=2)
    if material == "resonant":    # a deep resonant block (glass-free), long ring
        return modal([f, f * 2.0, f * 3.01, f * 4.23], [1.5 * length, 0.75, 0.3, 0.15],
                     [1, 0.4, 0.16, 0.07], 1.7 * length + 0.12, mallet_ms=ms(0.55), r=r, jitter_cents=2)
    raise ValueError(material)


def _precise(r, g=0.18) -> np.ndarray:
    """The mechanical precision tick that sits on top of product sounds."""
    return click(r, 2200, 7500, 0.003, 0.0005) * g


VERIFY_NOTES = ["D5", "E5", "F#5", "A5", "B5"]


def confirm(seed=0, variant=0) -> np.ndarray:
    """A verification confirmation: felt-metal body with a precision tick.

    Five variants rise through the D major pentatonic so a checklist of five
    resolves as a phrase, never as five identical pings.
    """
    r = rng(seed, "confirm", variant)
    f = NOTE[VERIFY_NOTES[variant % 5]]
    y = mix(tuned("felt", f, r, 0.55) * 0.8, tuned("wood", f * 2, r, 0.35) * 0.12, _precise(r, 0.22))
    return _out(verb(y, "room", 0.1, seed=19)[: ns(0.9)], r, 0.1)


def record_append(seed=0) -> np.ndarray:
    """A record entry appended: tactile paper click with a low tuned body."""
    r = rng(seed, "append")
    y = mix(tuned("paper", NOTE["D4"], r) * 0.8, click(r, 900, 5000, 0.004, 0.0008) * 0.35)
    return _out(verb(y, "room", 0.08, seed=23)[: ns(0.35)], r, 0.08)


def system_tick(seed=0) -> np.ndarray:
    """Priora sees a change: a crisp relay tick over a short metal body."""
    r = rng(seed, "systick")
    y = mix(relay_click(seed + 101) * 0.35, tuned("metal", NOTE["A5"], r, 0.25) * 0.55)
    return _out(verb(y, "room", 0.08, seed=29)[: ns(0.6)], r, 0.08)


def choice_accent(seed=0, variant=0) -> np.ndarray:
    """Three decision paths, three materials: change (wood), retain (felt), transfer (tine)."""
    r = rng(seed, "choice", variant)
    v = variant % 3
    if v == 0:
        y = mix(tuned("wood", NOTE["D5"], r, 0.9), tuned("wood", NOTE["A5"], r, 0.7) * 0.45, _precise(r))
    elif v == 1:
        y = mix(tuned("felt", NOTE["F#4"], r, 1.0), tuned("string", NOTE["D4"], r, 0.8) * 0.5, _precise(r, 0.12))
    else:
        y = mix(tuned("tine", NOTE["E5"], r, 1.0), tuned("tine", NOTE["B5"], r, 0.8) * 0.35, _precise(r, 0.14))
    return _out(verb(y, "plate", 0.12, seed=31)[: ns(1.6)], r, 0.18)


def decision_accent(seed=0) -> np.ndarray:
    """A firmer decision mark: felt body over a felt-hammer string."""
    r = rng(seed, "decision")
    y = mix(tuned("felt", NOTE["D5"], r, 0.8), tuned("string", NOTE["D3"], r, 0.9) * 0.6, _precise(r, 0.2))
    return _out(verb(y, "plate", 0.12, seed=37)[: ns(1.8)], r, 0.15)


def response_tick(seed=0) -> np.ndarray:
    """A carrier response arriving: small wood tick, its own pitch."""
    r = rng(seed, "response")
    f = NOTE[["A5", "B5", "D6", "E6"][int(r.integers(0, 4))]]
    y = mix(tuned("wood", f, r, 0.4), _precise(r, 0.15))
    return _out(y, r, 0.1)


def node_pass(seed=0) -> np.ndarray:
    """A node passing quietly inside the envelope: the softest felt tick."""
    r = rng(seed, "node")
    f = NOTE[["D5", "E5", "F#5", "A5", "B5"][int(r.integers(0, 5))]]
    y = tuned("felt", f, r, 0.3)
    return _out(y, r, 0.15)


def packet(seed=0) -> np.ndarray:
    """The trusted observed state sent: a small rising air ending on a tick."""
    r = rng(seed, "packet")
    n = ns(0.2)
    sw = band_sweep(n, r, [900, 2200, 3600], [0.7, 0.5, 0.4]) * ar(n, 0.15, 0.02, shape=1.5) * 0.5
    y = mix(dsp.st(sw), delay(dsp.st(_precise(r, 0.5)), 0.19), delay(dsp.st(tuned("wood", NOTE["E6"], r, 0.25) * 0.3), 0.19))
    return _out(y, r)


def align_snap(seed=0) -> np.ndarray:
    """A drawn line snapping into precise geometry: a tiny slide, then a lock."""
    r = rng(seed, "snap")
    sn = ns(0.028)
    slide = bp(white(sn, r), 1500, 6000, 2) * ar(sn, 0.024, 0.003, shape=2.0) * 0.18
    lock = mix(modal([r.uniform(2400, 2900), r.uniform(4000, 4500)], [0.02, 0.012], [1, 0.4], 0.05,
                     mallet_ms=0.15, r=r) * 0.5, click(r, 2500, 8000, 0.002, 0.0004) * 0.4,
               modal([r.uniform(280, 360)], [0.03], [0.4], 0.05, mallet_ms=0.6))
    y = mix(slide, delay(lock, 0.028))
    return _out(y, r, 0.08)


def stretch(seed=0, dur=1.2) -> np.ndarray:
    """The node stretching toward the envelope: a quiet, tightening tension.

    Narrowing band noise rising in centre plus a pair of tones leaning up by a
    quarter tone. Ends abruptly (clean 6 ms) where the snap takes over.
    """
    r = rng(seed, "stretch", dur)
    n = ns(dur)
    nz = band_sweep(n, r, [320, 520, 900], [1.2, 0.6, 0.28], nper=2048, hop=512)
    t = tvec(n)
    glide = 2 ** ((0.5 * (t / dur) ** 2) / 12.0)
    ph1 = 2 * np.pi * np.cumsum(NOTE["A3"] * glide) / SR
    ph2 = 2 * np.pi * np.cumsum(NOTE["E4"] * glide) / SR
    tone = np.sin(ph1) * 0.6 + np.sin(ph2) * 0.35
    env = curve([(0, 0.0), (dur * 0.6, 0.45), (dur * 0.9, 1.0), (dur, 0.55)], n, "cos")
    y = (nz * 0.7 + tone * 0.35) * env
    y = fade(y, 0.02, 0.006)
    return _out(spread(y, r, 0.35), r, 0)


def cross_snap(seed=0) -> np.ndarray:
    """The node crossing the boundary: a precise latch-like snap, light."""
    r = rng(seed, "cross")
    y = mix(click(r, 1800, 9000, 0.003, 0.0006) * 0.7,
            modal([1900, 3100, 4800], [0.045, 0.03, 0.018], [1, 0.5, 0.25], 0.08, mallet_ms=0.12, r=r) * 0.6,
            modal([320, 640], [0.06, 0.03], [0.6, 0.2], 0.1, mallet_ms=0.8))
    return _out(verb(y, "room", 0.1, seed=41)[: ns(0.4)], r, 0.05)


def latch(seed=0) -> np.ndarray:
    """The Priora mark: one clean mechanical latch. Bolt slides, catch seats."""
    r = rng(seed, "latch")
    sn = ns(0.036)
    slide = bp(white(sn, r), 1500, 5800, 2) * ar(sn, 0.03, 0.004, shape=2.0) * 0.12
    catch = mix(
        click(r, 1500, 9000, 0.003, 0.0006) * 0.8,
        modal([2150, 3480, 5230, 7900], [0.06, 0.04, 0.025, 0.012], [1, 0.55, 0.3, 0.12], 0.1,
              mallet_ms=0.15, r=r) * 0.55,
        modal([NOTE["F#3"], NOTE["A4"]], [0.12, 0.06], [0.75, 0.3], 0.2, mallet_ms=1.0),
        tuned("resonant", NOTE["D3"], r, 0.8) * 0.2,
    )
    y = mix(slide, delay(catch, 0.036))
    y = hp(y, 45, 2)
    return _out(verb(y, "plate", 0.1, seed=43)[: ns(1.8)], r, 0.05)


def pin(seed=0) -> np.ndarray:
    """An evidence fragment pinned to the board: a sheet settles, a pin seats."""
    r = rng(seed, "pin")
    fn = ns(0.08)
    flutter = band_sweep(fn, r, [900, 1600, 1000], [0.8, 0.7, 0.9]) * ar(fn, 0.01, 0.05) * 0.35
    seat = mix(click(r, 1200, 6000, 0.003, 0.0006) * 0.5,
               modal([r.uniform(260, 320), r.uniform(1900, 2300)], [0.03, 0.012], [0.8, 0.25], 0.06,
                     mallet_ms=0.8, r=r))
    y = mix(flutter, delay(seat, 0.06))
    return _out(verb(y, "room", 0.08, seed=97)[: ns(0.3)], r, 0.08)


def van(seed=0, dur=3.0) -> np.ndarray:
    """The contractors' van arriving far off: engine harmonics and tyres on
    gravel growing out of the distance, then settling. Heard across the site."""
    r = rng(seed, "van", dur)
    n = ns(dur)
    t = tvec(n)
    rpm = 900 + 250 * np.clip(1 - t / dur, 0, 1) * (1 + 0.1 * smooth_noise(n, r, 0.8))
    fire = rpm / 60.0 * 2.0  # four-stroke, four cylinders: two firings per revolution
    ph = 2 * np.pi * np.cumsum(fire) / SR
    eng = sum(np.sin(k * ph) / k ** 0.8 for k in range(2, 9))
    eng = lp(eng, 700, 2) * (0.8 + 0.2 * smooth_noise(n, r, 6.0))
    tyres = bp(poisson_impulses(n, 900, r, 0.7), 700, 4000, 2) * 0.25
    env = curve([(0, 0.0), (dur * 0.7, 1.0), (dur * 0.85, 0.8), (dur, 0.0)], n, "cos")
    bright = curve([(0, 600.0), (dur * 0.7, 2600.0), (dur, 1200.0)], n, "lin")
    y = (eng * 0.6 + tyres) * env
    y = dsp.stft_shape(y, lambda tt, ff: 1.0 / np.sqrt(1 + (ff[None, :] / np.interp(tt, t, bright)[:, None]) ** 4))
    y = hp(y, 40, 4)
    return _out(verb(y, "hall", 0.8, seed=99)[: n + ns(1.5)], r, 0.1)


def fray(seed=0, dur=0.5) -> np.ndarray:
    """The connection parting: fine fibres giving way, near silent."""
    r = rng(seed, "fray", dur)
    n = ns(dur)
    dens = curve([(0, 400.0), (dur * 0.6, 160.0), (dur, 20.0)], n, "lin")
    imp = np.zeros(n)
    u = r.random(n)
    hits = u < dens / SR
    imp[hits] = r.lognormal(0, 0.5, int(hits.sum())) * r.choice([-1.0, 1.0], int(hits.sum()))
    y = bp(reson(imp, r.uniform(4200, 5200), 5) + reson(imp, r.uniform(6500, 7800), 6) * 0.6, 2500, 9500, 2)
    y *= ar(n, 0.02, dur * 0.5)
    return _out(y, r, 0.3)


def incident(seed=0) -> np.ndarray:
    """The restrained incident mark: a far, muffled low thud and a short low swell."""
    r = rng(seed, "incident")
    th = lp(thump(NOTE["E2"], NOTE["B1"], 0.5, 1.0), 380, 2)
    sn = ns(1.6)
    swell = lp(hp(white(sn, r), 60, 2), 260, 2) * curve([(0, 0.0), (0.3, 1.0), (1.6, 0.0)], sn, "cos") * 0.18
    y = mix(th, swell)
    y = hp(y, 38, 4)
    return _out(verb(y, "hall", 0.5, seed=101, hp_hz=60)[: ns(3.0)], r, 0.05)


def latch_soft(seed=0) -> np.ndarray:
    """The rewind landing: the catch of the latch alone, small and close."""
    r = rng(seed, "latchsoft")
    y = mix(click(r, 1500, 8000, 0.003, 0.0005) * 0.5,
            modal([2300, 3700], [0.03, 0.02], [1, 0.4], 0.06, mallet_ms=0.12, r=r) * 0.4,
            modal([190, 430], [0.07, 0.04], [0.7, 0.25], 0.12, mallet_ms=0.9))
    y = hp(y, 45, 2)
    return _out(verb(y, "room", 0.08, seed=103)[: ns(0.5)], r, 0.05)


def capture_start(seed=0) -> np.ndarray:
    """The voice capture strip opening: a soft felt tick with a tiny click."""
    r = rng(seed, "capture")
    y = mix(tuned("felt", NOTE["A5"], r, 0.3) * 0.7, _precise(r, 0.12))
    return _out(y, r, 0.1)


def row_unavailable(seed=0) -> np.ndarray:
    """A check flipping to UNAVAILABLE: two soft falling felt notes, not an alarm."""
    r = rng(seed, "unavail")
    y = mix(tuned("felt", NOTE["A5"], r, 0.3) * 0.7, delay(tuned("felt", NOTE["E5"], r, 0.45) * 0.8, 0.09),
            _precise(r, 0.15))
    return _out(verb(y, "room", 0.1, seed=107)[: ns(0.9)], r, 0.1)


def connect_line(seed=0, dur=0.6) -> np.ndarray:
    """A live connection drawing: a fine narrow air rising in pitch, landing on a tick."""
    r = rng(seed, "connect", dur)
    n = ns(dur)
    sw = band_sweep(n, r, np.geomspace(1100, 3000, 12), np.linspace(0.45, 0.3, 12))
    sw *= curve([(0, 0.0), (dur * 0.3, 0.6), (dur, 1.0)], n, "cos")
    sw = fade(sw, 0.01, 0.004) * 0.35
    end = mix(tuned("wood", NOTE["E6"], r, 0.2) * 0.5, _precise(r, 0.3))
    y = mix(dsp.st(sw), delay(dsp.st(end), dur - 0.004))
    return _out(y, r, 0.15)


def sheet_in(seed=0) -> np.ndarray:
    """The decision sheet arriving: a soft low-mid air, settling on a tick."""
    r = rng(seed, "sheet")
    n = ns(0.32)
    sw = band_sweep(n, r, [500, 1100, 800], [0.9, 0.7, 0.8]) * ar(n, 0.12, 0.18) * 0.5
    y = mix(spread(sw, r, 0.5), delay(dsp.st(mix(_precise(r, 0.25), tuned("wood", NOTE["B5"], r, 0.2) * 0.3)), 0.3))
    return _out(y, r, 0)


# ================================================================ cut 2 editorial accents
#
# The edit's own sounds: cuts, camera moves, a sheet laid down, a hero
# isolation, and three physical close-ups (the arc, the handwheel, the
# gauge). Restrained by construction: short, low-mid, no bright attacks, no
# risers, no booms. The air of a camera move stays under 3 kHz and is carved
# under the voice like the beds (pipeline.MOTION).

def _soft_contact(x: np.ndarray, ms: float) -> np.ndarray:
    """Round an impact by a half-sine contact pulse of `ms` (felt, cushion)."""
    m = max(ns(ms / 1000.0), 2)
    p = np.sin(np.linspace(0, np.pi, m))
    from scipy.signal import fftconvolve
    return fftconvolve(x, p / p.sum())[: len(x)]


def _rise(n: int, t: float) -> np.ndarray:
    """Raised-cosine attack of t seconds, then flat (for a bloom or a settle)."""
    u = np.clip(tvec(n) / max(t, 1e-4), 0, 1)
    return 0.5 - 0.5 * np.cos(np.pi * u)


def _pan_path(y: np.ndarray, p0: float, p1: float) -> np.ndarray:
    """Constant-power pan moving linearly from p0 to p1 (mono in, stereo out)."""
    p = np.clip(np.linspace(p0, p1, len(y)), -1, 1)
    th = (p + 1) * np.pi / 4
    return np.stack([y * np.cos(th), y * np.sin(th)], 1)


def _image(a: np.ndarray, b: np.ndarray, w0: float, w1: float) -> np.ndarray:
    """Two decorrelated takes as mid/side with a width moving from w0 to w1."""
    w = np.linspace(w0, w1, len(a))
    mid, side = (a + b) * 0.5, (a - b) * 0.5 * w
    return np.stack([mid + side, mid - side], 1)


CUT_MATERIALS = ("paper", "felt", "graphite", "wood")


def cut(seed=0, material="paper") -> np.ndarray:
    """A hard picture cut: a very short, soft transient, felt more than heard.

    paper: a card edge meeting the desk through a cushion of air; felt: a felt
    mallet on a padded surface (long contact, dark and round); graphite: a
    pencil point set down on paper over the desk; wood: a soft knock on a
    small block. All under a quarter of a second with the energy in the low
    mids; the attack is rounded so it never clicks. Cut 3: every body is
    tuned to the key (D3 falling to A2, the wood block on A4) and the
    contacts are longer, so a cut supports the picture instead of marking it.
    """
    mat = str(material or "paper").lower()
    mat = mat if mat in CUT_MATERIALS else "paper"
    r = rng(seed, "cut", mat)
    if mat == "felt":
        body = thump(NOTE["D3"], NOTE["A2"], 0.07, 0.16)
        body = _soft_contact(body, 5.5)
        n = ns(0.06)
        brush = lp(white(n, r), 550, 2) * perc(n, 0.006, 0.045) * 0.08
        y = lp(mix(body, brush), 1200, 2)
    elif mat == "graphite":
        n = ns(0.04)
        y = mix(click(r, 1100, 4200, 0.004, 0.001) * 0.16, thump(NOTE["A3"], NOTE["D3"], 0.045, 0.08) * 0.7,
                bp(white(n, r), 650, 2600, 2) * perc(n, 0.003, 0.025) * 0.08)
        y = lp(_soft_contact(y, 2.6), 3000, 2)
    elif mat == "wood":
        f = NOTE["A4"]
        y = mix(modal([f, f * 2.57, f * 4.1], [0.05, 0.025, 0.012], [1, 0.25, 0.08], 0.12, mallet_ms=2.4,
                      r=r) * 0.8, thump(NOTE["D3"], NOTE["A2"], 0.045, 0.09) * 0.45)
        y = lp(_soft_contact(y, 2.0), 2200, 2)
    else:
        n = ns(0.1)
        cushion = lp(hp(white(n, r), 70, 2), 320, 2) * perc(n, 0.008, 0.06) * 0.7
        body = thump(NOTE["D3"], NOTE["A2"], 0.055, 0.1) * 0.55
        tap = bp(white(n, r), 450, 2600, 2) * perc(n, 0.004, 0.03) * 0.18
        y = lp(mix(cushion, body, tap), 2800, 2)
    y = verb(y, "room", 0.05, seed=151)[: ns(0.25)]
    return _out(y, r, 0.1)


def push(seed=0, dur=0.65) -> np.ndarray:
    """A push-in to a closer shot (dur = the move): a short rising air, low
    and narrow, the image closing to centre, landing in a soft low bloom at
    dur. The bloom is the only weight; nothing bright, no riser."""
    D = float(np.clip(dur or 0.65, 0.2, 3.0))
    r = rng(seed, "push", round(D, 4))
    n = ns(D)
    cen = np.geomspace(230, 1250, 16)
    wid = np.linspace(1.15, 0.55, 16)
    a = band_sweep(n, r, cen, wid)
    b = band_sweep(n, r, cen * 1.04, wid)
    env = curve([(0, 0.0), (D * 0.4, 0.2), (D * 0.84, 0.85), (D, 0.45)], n, "cos")
    air = _image(a, b, 1.0, 0.2) * env[:, None]
    air = lp(fade(air, 0.0, 0.035), 2400, 2)
    air *= 0.16 / (dsp.rms(air[-ns(min(0.25, D * 0.4)):]) + 1e-12)
    bn = ns(0.95)
    bloom = thump(NOTE["G2"], NOTE["D2"], 0.55, 0.95) * _rise(bn, 0.03)
    bloom += lp(hp(white(bn, r), 45, 2), 200, 2) * perc(bn, 0.03, 0.45) * 0.12
    bloom = lp(bloom, 250, 2)
    bloom /= dsp.peak(bloom) + 1e-12
    y = mix(air, delay(dsp.st(bloom), D - 0.012))
    y = verb(y, "room", 0.07, seed=153)[: ns(D + 1.1)]
    return _out(y, r, 0)


def pull(seed=0, dur=1.3) -> np.ndarray:
    """A pull-back reveal (dur = the move): a soft descending air, the image
    opening from centre to wide, over a gentle low swell. A long pull is
    spread thinner (lower peak), so a two-bar move stays under the voice."""
    D = float(np.clip(dur or 1.3, 0.3, 8.0))
    r = rng(seed, "pull", round(D, 4))
    tail = min(0.45, 0.3 * D)
    Tn = D + tail
    n = ns(Tn)
    cen = np.geomspace(1450, 290, 16)
    wid = np.linspace(0.6, 1.25, 16)
    a = band_sweep(n, r, cen, wid, nper=2048, hop=512)
    b = band_sweep(n, r, cen * 0.97, wid, nper=2048, hop=512)
    env = curve([(0, 0.0), (min(0.3 * D, 0.5), 0.75), (0.45 * D, 1.0), (D, 0.3), (Tn, 0.0)], n, "cos")
    air = lp(_image(a, b, 0.25, 1.0) * env[:, None], 2800, 2)
    air /= dsp.rms(air) + 1e-12
    sw = colored(n, r, -6.0, lo=40, hi=320)
    sw = lp(hp(sw, 40, 2), 150, 2) * curve([(0, 0.0), (0.55 * D, 1.0), (Tn, 0.0)], n, "cos")
    sw /= dsp.rms(sw) + 1e-12
    y = mix(air * 0.5, dsp.st(sw) * 0.62)
    y = verb(y, "room", 0.06, seed=157)[: n + ns(0.3)]
    return _out(y, r, 0, -1.0 - max(0.0, 10 * np.log10(D / 1.3)))


def whip(seed=0, dur=0.33, direction=1.0) -> np.ndarray:
    """A snappy lateral move (half a second or less): brief, filtered, very
    quiet air crossing the image in the move's direction (+1 left to right)."""
    D = float(np.clip(dur or 0.33, 0.12, 0.6))
    d = 1.0 if float(direction or 1.0) >= 0 else -1.0
    r = rng(seed, "whip", round(D, 4), d)
    n = ns(D)
    a = band_sweep(n, r, [620, 1650, 900], [0.85, 0.5, 0.75], nper=512, hop=128)
    env = curve([(0, 0.0), (0.45 * D, 1.0), (D, 0.0)], n, "cos") ** 1.6
    y = lp(a * env, 3600, 2)
    return _out(_pan_path(y, -0.55 * d, 0.55 * d), r, 0)


def sheet_lay(seed=0, dur=0.5, pan0=0.5, pan1=0.05) -> np.ndarray:
    """A paper sheet laid flat over the drawing: it slides in (from the right
    by default), then settles at dur as its air cushion lets go."""
    D = float(np.clip(dur or 0.5, 0.2, 2.0))
    r = rng(seed, "sheetlay", round(D, 4))
    slide = paper_slide(seed * 5 + 3, D, pan0, pan1)
    sn = ns(0.28)
    puff = lp(hp(white(sn, r), 60, 2), 340, 2) * ar(sn, 0.01, 0.24, hold=0.0)
    touch = bp(white(sn, r), 800, 3000, 2) * perc(sn, 0.002, 0.035) * 0.22
    crack = _crinkle(r, sn, 35) * perc(sn, 0.004, 0.08) * 0.02
    settle = mix(puff / (dsp.peak(puff) + 1e-12), touch, crack)
    settle /= dsp.peak(settle) + 1e-12
    y = mix(slide * 0.62, delay(pan(settle, pan1) * 0.8, D - 0.03))
    y = verb(y, "room", 0.07, seed=159)[: ns(D + 0.55)]
    return _out(y, r, 0)


def focus(seed=0) -> np.ndarray:
    """An interface element isolated to a hero shot: a tiny precise click, a
    detent seating (a click, a smaller one 6 ms later, a faint small body)."""
    r = rng(seed, "focus")
    a = mix(click(r, 2600, 9000, 0.0025, 0.0004) * 0.5,
            modal([r.uniform(3300, 3600), r.uniform(5500, 5900)], [0.016, 0.009], [1, 0.35], 0.04,
                  mallet_ms=0.08, r=r) * 0.3,
            modal([NOTE["A5"]], [0.03], [0.25], 0.05, mallet_ms=0.5))
    y = mix(a, delay(click(r, 2400, 8000, 0.002, 0.0003) * 0.22, 0.006))
    return _out(lp(_soft_contact(y, 0.5), 7000, 2), r, 0.05)  # cut 3: a softer seat


def arc(seed=0, dur=1.3) -> np.ndarray:
    """The welding arc: a very quiet, dry crackle that flickers (dur). Sparse
    sharp cracks in bursts over a faint sizzle; no hum, no roar, no alarm."""
    D = float(np.clip(dur or 1.3, 0.2, 20.0))
    r = rng(seed, "arc", round(D, 4))
    n = ns(D)
    t = tvec(n)
    flick = np.clip(0.5 + 0.5 * smooth_noise(n, r, 7.0), 0, 1) ** 2
    rate = 70.0 + 190.0 * flick
    u = r.random(n)
    hits = u < rate / SR
    imp = np.zeros(n)
    k = int(hits.sum())
    imp[hits] = r.lognormal(0, 0.7, k) * r.choice([-1.0, 1.0], k)
    crack = bp(imp, 1800, 8500, 2) + reson(imp, r.uniform(3000, 3500), 4) * 0.35
    crack /= dsp.rms(crack) + 1e-12
    sizzle = bp(white(n, r), 2400, 7500, 2) * (0.65 + 0.35 * np.abs(np.sin(2 * np.pi * 50.0 * t)))
    sizzle *= (0.5 + 0.5 * flick) / (dsp.rms(sizzle) + 1e-12)
    y = (crack * 0.6 + sizzle * 0.16) * ar(n, 0.06, min(0.14, D * 0.3))
    y = lp(eq(y, "peak", 3300, -3.0, 0.9), 8500, 2)
    return _out(spread(y, r, 0.3), r, 0)


def handwheel(seed=0, dur=0.9) -> np.ndarray:
    """A valve handwheel turning (dur): low metal friction of the stem in its
    packing and thread, one effort swell per hand push, the pipe body
    answering faintly. No ratchet, nothing bright."""
    D = float(np.clip(dur or 0.9, 0.2, 6.0))
    r = rng(seed, "wheel", round(D, 4))
    n = ns(D + 0.2)
    pushes = max(1, int(round(D / 0.6)))
    env = np.zeros(n)
    span = D / pushes
    for k in range(pushes):
        a, b = k * span, min((k + 1) * span + 0.12, D + 0.18)
        seg = curve([(0, 0.0), (0.3 * (b - a), 1.0 - 0.12 * k), (b - a, 0.0)], ns(b - a), "cos")
        i = ns(a)
        env[i:i + len(seg)] = np.maximum(env[i:i + len(seg)], seg[: n - i])
    fric = colored(n, r, -4.5, lo=90, hi=1300)
    grit = bp(poisson_impulses(n, 380, r, 0.8), 260, 1900, 2)
    grit /= dsp.rms(grit) + 1e-12
    body = reson(fric, r.uniform(225, 255), 9) + reson(fric, r.uniform(590, 650), 11) * 0.6 + \
        reson(fric, r.uniform(1080, 1180), 14) * 0.25
    body /= dsp.rms(body) + 1e-12
    y = (fric * 0.45 + grit * 0.22 + body * 0.5) * env
    y = hp(lp(y, 2200, 2), 60, 2)
    y = verb(y, "room", 0.12, seed=161)[: n + ns(0.25)]
    return _out(y, r, 0.12)


def gauge(seed=0, dur=0.0, direction=-1.0) -> np.ndarray:
    """A pressure-gauge needle (dur = its travel): a faint gear-train whirr,
    then a small sprung-metal tick at dur. Falling (-1) the needle meets its
    stop pin and bounces once; rising (+1) it settles on a reading, lighter."""
    D = float(np.clip(dur or 0.0, 0.0, 3.0))
    falling = float(direction if direction is not None else -1.0) < 0
    r = rng(seed, "gauge", round(D, 4), falling)
    parts = []
    if D > 0.08:
        n = ns(D)
        speed = curve([(0, 0.2), (0.6 * D, 1.0), (D, 1.0 if falling else 0.3)], n, "cos")
        ph = np.cumsum(90.0 * speed) / SR
        teeth = np.zeros(n)
        idx = np.nonzero(np.diff(np.floor(ph)) > 0)[0]
        teeth[idx] = r.uniform(0.6, 1.0, len(idx))
        whirr = bp(teeth, 2500, 7000, 2) + bp(white(n, r), 3000, 8000, 2) * 0.02
        whirr *= speed * ar(n, 0.02, 0.02) * 0.08
        parts.append(whirr)

    def tick(g, s):
        return mix(click(s, 2400, 9000, 0.003, 0.0005) * 0.6,
                   modal([s.uniform(2900, 3200), s.uniform(4700, 5100), s.uniform(7300, 7800)],
                         [0.05, 0.035, 0.02], [1, 0.55, 0.28], 0.09, mallet_ms=0.1, r=s) * 0.35,
                   modal([s.uniform(1050, 1150)], [0.12], [0.12], 0.14, mallet_ms=0.3),
                   modal([s.uniform(420, 480)], [0.03], [0.3], 0.05, mallet_ms=0.5)) * g
    if falling:
        stop = mix(tick(1.0, r), delay(tick(0.3, rng(seed, "gauge2")), r.uniform(0.03, 0.04)))
    else:
        stop = tick(1.0, r)
    parts.append(delay(stop, max(D - 0.001, 0.0)))
    y = mix(*parts)
    y = verb(lp(y, 11000, 2), "room", 0.06, seed=163)[: ns(D + 0.35)]
    return _out(y, r, 0.05, -1.0 if falling else -5.0)


# ================================================================ beds (long)

def _decorrelated_pair(n, r, corr=0.4, **kw):
    a = colored(n, r, **kw)
    b = colored(n, r, **kw)
    c = colored(n, r, **kw)
    k = np.sqrt(corr)
    q = np.sqrt(1 - corr)
    return np.stack([k * a + q * b, k * a + q * c], 1)


def ventilation(seed=0, dur=10.0) -> np.ndarray:
    """Ventilation air: soft coloured air, duct modes, a faint fan blade tone
    (tuned to A2, 110 Hz, with its harmonics A3 and E4: in cut 2 it was
    118 Hz, a B flat 22 cents sharp, under a D major score)."""
    r = rng(seed, "vent", dur)
    n = ns(dur)
    air = _decorrelated_pair(n, r, 0.45, slope_db_oct=-4.5, lo=55, hi=2600)
    duct = np.stack([reson(air[:, c], 185, 5) * 0.6 + reson(air[:, c], 420, 6) * 0.4 for c in range(2)], 1)
    wob = 1 + 0.003 * smooth_noise(n, r, 0.3)
    ph = 2 * np.pi * np.cumsum(110.0 * wob) / SR
    fan = (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * 0.03 * (1 + 0.3 * smooth_noise(n, r, 0.5))
    motion = 1 + 0.07 * smooth_noise(n, r, 0.25)
    y = (air + duct * 0.35) * motion[:, None] + dsp.st(fan)
    y = hp(y, 42, 4)
    return fade(y, 0.05, 0.05)


def machinery_hum(seed=0, dur=10.0) -> np.ndarray:
    """Distant plant machinery: a hum, a cyclic load, far away.

    Tuned to the score's D (D2, A2, D3, A3 and a D5 whine). Cut 2 used real
    50 Hz mains harmonics, which sit 35 cents sharp of G and 37 cents sharp
    of D, with a whine between D5 and E flat 5: a sour drone under Act I."""
    r = rng(seed, "hum", dur)
    n = ns(dur)
    t = tvec(n)
    d2 = NOTE["D2"]
    tones = (np.sin(2 * np.pi * d2 * t) + 0.8 * np.sin(2 * np.pi * d2 * 2 ** (1.5 / 1200) * t + 1.0) +
             0.35 * np.sin(2 * np.pi * NOTE["A2"] * t) + 0.5 * np.sin(2 * np.pi * NOTE["D3"] * t) +
             0.15 * np.sin(2 * np.pi * NOTE["A3"] * t))
    load = 1 + 0.25 * np.sin(2 * np.pi * 1.3 * t) * (0.6 + 0.4 * smooth_noise(n, r, 0.2))
    gear = bp(white(n, r), 380, 900, 2) * 0.5 * load
    whine = np.sin(2 * np.pi * NOTE["D5"] * t + 0.4 * smooth_noise(n, r, 0.4)) * 0.03
    y = tones * 0.25 * (1 + 0.05 * smooth_noise(n, r, 0.3)) + gear * 0.35 + whine
    y = lp(y, 1400, 2)
    y = hp(y, 48, 4)
    # heard across the site: mostly reverberant
    ir = dsp.make_ir("hall", 53)
    w = dsp.convolve(y, ir)[:n]
    out = dsp.st(y) * 0.35 + w * 0.8
    return fade(out, 0.1, 0.1)


def pump_thud(seed=0) -> np.ndarray:
    """A distant press or pump stroke: the low industrial pulse, one hit."""
    r = rng(seed, "pump")
    y = mix(thump(NOTE["A1"] * 1.36, NOTE["A1"], 0.28, 0.5), bp(white(ns(0.05), r) * decay(ns(0.05), 0.03), 140, 600, 2) * 0.35)
    y = lp(y, 900, 2)
    y = hp(y, 36, 4)
    return _out(verb(y, "roof", 0.3, seed=59, hp_hz=70)[: ns(1.1)], r, 0)


def roof_air(seed=0, dur=5.0) -> np.ndarray:
    """Open roof air around the worker: low wind with slow gusts."""
    r = rng(seed, "roof", dur)
    n = ns(dur)
    w = _decorrelated_pair(n, r, 0.3, slope_db_oct=-6.0, lo=60, hi=1100)
    g = 0.7 + 0.3 * smooth_noise(n, r, 0.35)
    y = w * g[:, None]
    y = hp(y, 55, 4)
    return fade(y, 0.2, 0.2)


def room_tone(seed=0, dur=5.0) -> np.ndarray:
    """The product space: an almost-silent, clean air floor."""
    r = rng(seed, "roomtone", dur)
    n = ns(dur)
    y = _decorrelated_pair(n, r, 0.6, slope_db_oct=-5.0, lo=70, hi=3500)
    return fade(hp(y, 55, 4), 0.2, 0.2)


def distant_clank(seed=0) -> np.ndarray:
    """A far-off metal knock somewhere on site (sparse site texture)."""
    r = rng(seed, "clank")
    base = r.uniform(180, 260)
    y = modal([base, base * 2.43, base * 3.9, base * 5.7], [0.5, 0.3, 0.18, 0.1], [1, 0.5, 0.3, 0.15],
              0.8, mallet_ms=1.2, r=r, jitter_cents=30)
    y = lp(y, 2400, 2)
    return _out(verb(y, "hall", 0.9, seed=61)[: ns(2.8)], r, 0)


# ================================================================ registry

KINDS = {
    # kind: (function, default level dB, parameters taken from the event)
    "pencil-stroke": (pencil_stroke, -23.0, ("dur", "pressure", "speed")),
    "pencil-tick": (pencil_tick, -22.0, ()),
    "pencil-hatch": (pencil_hatch, -26.0, ("dur", "rate")),
    "technical-pen": (technical_pen, -26.0, ("dur", "speed")),
    "ruler-contact": (ruler_contact, -21.0, ()),
    "set-square-tap": (set_square_tap, -22.0, ()),
    "paper-slide": (paper_slide, -24.0, ("dur", "pan0", "pan1")),
    "paper-lift": (paper_lift, -24.0, ()),
    "page-turn": (page_turn, -22.0, ("direction",)),
    "paper-stack": (paper_stack, -23.0, ()),
    "stamp": (stamp, -17.0, ()),
    "radio-click": (radio_click, -26.0, ()),
    "radio-squelch": (radio_squelch, -27.0, ("dur",)),
    "footstep": (footstep, -27.0, ("surface",)),
    "footsteps": (footsteps, -27.0, ("count", "interval", "surface", "pan0", "pan1")),
    "valve-clunk": (valve_clunk, -17.0, ("muted", "flow")),
    "relay-click": (relay_click, -25.0, ()),
    "solenoid-click": (solenoid_click, -23.0, ()),
    "confirm": (confirm, -20.0, ("variant",)),
    "record-append": (record_append, -22.0, ()),
    "system-tick": (system_tick, -19.0, ()),
    "choice-accent": (choice_accent, -18.0, ("variant",)),
    "decision-accent": (decision_accent, -18.0, ()),
    "response-tick": (response_tick, -24.0, ()),
    "node-pass": (node_pass, -29.0, ()),
    "packet": (packet, -24.0, ()),
    "align-snap": (align_snap, -26.0, ()),
    "stretch": (stretch, -26.0, ("dur",)),
    "cross-snap": (cross_snap, -17.0, ()),
    "latch": (latch, -13.0, ()),
    "distant-clank": (distant_clank, -33.0, ()),
    "pin": (pin, -24.0, ()),
    "van": (van, -30.0, ("dur",)),
    "fray": (fray, -36.0, ("dur",)),
    "incident": (incident, -24.0, ()),
    "latch-soft": (latch_soft, -24.0, ()),
    "capture-start": (capture_start, -26.0, ()),
    "row-unavailable": (row_unavailable, -22.0, ()),
    "connect-line": (connect_line, -26.0, ("dur",)),
    "sheet-in": (sheet_in, -26.0, ()),
    "pump-thud": (pump_thud, -23.0, ()),
    # editorial accents (felt more than heard; cut 3: 3 to 4 dB quieter than cut 2)
    "cut": (cut, -30.0, ("material",)),
    "push": (push, -34.0, ("dur",)),
    "pull": (pull, -34.0, ("dur",)),
    "whip": (whip, -39.0, ("dur", "direction")),
    "sheet-lay": (sheet_lay, -28.0, ("dur", "pan0", "pan1")),
    "focus": (focus, -29.0, ()),
    "arc": (arc, -32.0, ("dur",)),
    "handwheel": (handwheel, -31.0, ("dur",)),
    "gauge": (gauge, -28.0, ("dur", "direction")),
}


def render_kind(kind: str, seed: int = 0, **params) -> np.ndarray:
    fn, _, accepted = KINDS[kind]
    kw = {k: v for k, v in params.items() if k in accepted and v is not None}
    return fn(seed=seed, **kw)
