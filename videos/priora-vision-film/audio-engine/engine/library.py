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
    env = curve([(0, 0.0), (dur * 0.6, 0.45), (dur, 1.0)], n, "cos")
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
        modal([176, 412], [0.12, 0.06], [0.75, 0.3], 0.2, mallet_ms=1.0),
        tuned("resonant", NOTE["D3"], r, 0.8) * 0.2,
    )
    y = mix(slide, delay(catch, 0.036))
    y = hp(y, 45, 2)
    return _out(verb(y, "plate", 0.1, seed=43)[: ns(1.8)], r, 0.05)


CHAIN = {  # the five chain links: word -> (material, note, character)
    "record": ("paper", "A4"),
    "trust": ("wood", "D5"),
    "decision": ("string", "E5"),
    "price": ("metal", "F#5"),
    "capacity": ("resonant", "A3"),
}


def chain_link(seed=0, link="record") -> np.ndarray:
    """RECORD paper, TRUST wood, DECISION felt-hammer string, PRICE metal,
    CAPACITY a deep resonant block. Quiet, tuned into the closing D major."""
    r = rng(seed, "chain", link)
    mat, note = CHAIN[link]
    body = tuned(mat, NOTE[note], r, 1.0)
    if link == "record":
        body = mix(body, tuned("felt", NOTE["A4"], r, 0.5) * 0.35)
    if link == "capacity":
        body = mix(body, tuned("felt", NOTE["A4"], r, 0.7) * 0.25)
    y = mix(body, _precise(r, 0.1))
    return _out(verb(y, "plate", 0.14, seed=47)[: ns(2.4)], r, 0.12)


# ================================================================ beds (long)

def _decorrelated_pair(n, r, corr=0.4, **kw):
    a = colored(n, r, **kw)
    b = colored(n, r, **kw)
    c = colored(n, r, **kw)
    k = np.sqrt(corr)
    q = np.sqrt(1 - corr)
    return np.stack([k * a + q * b, k * a + q * c], 1)


def ventilation(seed=0, dur=10.0) -> np.ndarray:
    """Ventilation air: soft coloured air, duct modes, a faint fan blade tone."""
    r = rng(seed, "vent", dur)
    n = ns(dur)
    air = _decorrelated_pair(n, r, 0.45, slope_db_oct=-4.5, lo=55, hi=2600)
    duct = np.stack([reson(air[:, c], 185, 5) * 0.6 + reson(air[:, c], 420, 6) * 0.4 for c in range(2)], 1)
    t = tvec(n)
    wob = 1 + 0.003 * smooth_noise(n, r, 0.3)
    ph = 2 * np.pi * np.cumsum(118.0 * wob) / SR
    fan = (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * 0.03 * (1 + 0.3 * smooth_noise(n, r, 0.5))
    motion = 1 + 0.07 * smooth_noise(n, r, 0.25)
    y = (air + duct * 0.35) * motion[:, None] + dsp.st(fan)
    y = hp(y, 42, 4)
    return fade(y, 0.05, 0.05)


def machinery_hum(seed=0, dur=10.0) -> np.ndarray:
    """Distant plant machinery: 50 Hz mains harmonics, a cyclic load, far away."""
    r = rng(seed, "hum", dur)
    n = ns(dur)
    t = tvec(n)
    tones = (np.sin(2 * np.pi * 100.0 * t) + 0.8 * np.sin(2 * np.pi * 100.35 * t + 1.0) +
             0.35 * np.sin(2 * np.pi * 150.0 * t) + 0.5 * np.sin(2 * np.pi * 200.0 * t) +
             0.15 * np.sin(2 * np.pi * 300.0 * t))
    load = 1 + 0.25 * np.sin(2 * np.pi * 1.3 * t) * (0.6 + 0.4 * smooth_noise(n, r, 0.2))
    gear = bp(white(n, r), 380, 900, 2) * 0.5 * load
    whine = np.sin(2 * np.pi * 612.0 * t + 0.4 * smooth_noise(n, r, 0.4)) * 0.04
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
    y = mix(thump(64, 47, 0.28, 0.5), bp(white(ns(0.05), r) * decay(ns(0.05), 0.03), 140, 600, 2) * 0.35)
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
    "pencil-stroke": (pencil_stroke, -30.0, ("dur", "pressure", "speed")),
    "pencil-tick": (pencil_tick, -29.0, ()),
    "pencil-hatch": (pencil_hatch, -33.0, ("dur", "rate")),
    "technical-pen": (technical_pen, -33.0, ("dur", "speed")),
    "ruler-contact": (ruler_contact, -28.0, ()),
    "set-square-tap": (set_square_tap, -29.0, ()),
    "paper-slide": (paper_slide, -31.0, ("dur", "pan0", "pan1")),
    "paper-lift": (paper_lift, -31.0, ()),
    "page-turn": (page_turn, -29.0, ("direction",)),
    "paper-stack": (paper_stack, -30.0, ()),
    "stamp": (stamp, -24.0, ()),
    "radio-click": (radio_click, -33.0, ()),
    "radio-squelch": (radio_squelch, -34.0, ("dur",)),
    "footstep": (footstep, -34.0, ("surface",)),
    "footsteps": (footsteps, -34.0, ("count", "interval", "surface", "pan0", "pan1")),
    "valve-clunk": (valve_clunk, -24.0, ("muted", "flow")),
    "relay-click": (relay_click, -32.0, ()),
    "solenoid-click": (solenoid_click, -30.0, ()),
    "confirm": (confirm, -27.0, ("variant",)),
    "record-append": (record_append, -29.0, ()),
    "system-tick": (system_tick, -26.0, ()),
    "choice-accent": (choice_accent, -25.0, ("variant",)),
    "decision-accent": (decision_accent, -25.0, ()),
    "response-tick": (response_tick, -31.0, ()),
    "node-pass": (node_pass, -36.0, ()),
    "packet": (packet, -31.0, ()),
    "align-snap": (align_snap, -33.0, ()),
    "stretch": (stretch, -27.0, ("dur",)),
    "cross-snap": (cross_snap, -24.0, ()),
    "latch": (latch, -20.0, ()),
    "chain-record": (lambda seed=0: chain_link(seed, "record"), -24.0, ()),
    "chain-trust": (lambda seed=0: chain_link(seed, "trust"), -25.0, ()),
    "chain-decision": (lambda seed=0: chain_link(seed, "decision"), -25.0, ()),
    "chain-price": (lambda seed=0: chain_link(seed, "price"), -26.0, ()),
    "chain-capacity": (lambda seed=0: chain_link(seed, "capacity"), -23.0, ()),
    "distant-clank": (distant_clank, -38.0, ()),
    "pump-thud": (pump_thud, -30.0, ()),
}


def render_kind(kind: str, seed: int = 0, **params) -> np.ndarray:
    fn, _, accepted = KINDS[kind]
    kw = {k: v for k, v in params.items() if k in accepted and v is not None}
    return fn(seed=seed, **kw)
