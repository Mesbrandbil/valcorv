"""The signature rewind.

Picture scrubs the story backward from rewindStart to the landing (the instant
before Sprinkler Zone 3 went offline) over the rewind window, with a slow
start, a fast middle and a very hard deceleration into the landing. The sound
does the same thing, built from the film's own Act I audio:

  1. the forward sound falls away (Act I layers fade out in 0.3 s, score.py);
  2. granular reverse: short grains of the Act I music and ambience, each
     played backward, taken from the story time the picture is showing, so the
     sound literally travels back with the image (pitch is preserved; no
     varispeed, no tape-stop);
  3. a controlled suction: a reverse-reverb swell of the Act I bed, closing in
     brightness, inhaled into near-silence exactly at the landing;
  4. an elegant reverse whoosh (a narrowing band rising, the stereo image
     collapsing to centre);
  5. mechanical state changes run backward: the sprinkler valve clunk reversed,
     landing where the picture passes the moment the zone went offline;
     reversed paper and pencil as evidence clears and sprinkler heads re-ink.

Also exported as a kit of one-shots for the events API (rewind-* kinds).
"""
from __future__ import annotations

import numpy as np
from scipy.ndimage import uniform_filter1d

from . import dsp, library
from .dsp import SR, ns, rng


def ease(u: np.ndarray | float) -> np.ndarray:
    """Slow start, fast middle, very hard deceleration into the landing."""
    u = np.clip(np.asarray(u, float), 0, 1)
    a = u ** 1.7
    return 1 - (1 - a) ** 4.5


def story_time(tau, rs, re_, landing):
    """Film time inside the rewind -> story time the picture is showing."""
    u = (np.asarray(tau, float) - rs) / max(re_ - rs, 1e-3)
    return rs - (rs - landing) * ease(u)


def film_time_of_story(s, rs, re_, landing):
    """Inverse of story_time (numerically)."""
    taus = np.linspace(rs, re_, 4001)
    st_ = story_time(taus, rs, re_, landing)
    return float(np.interp(-s, -st_, taus))


def reverse(x: np.ndarray, fin=0.02, fout=0.006) -> np.ndarray:
    return dsp.fade(np.ascontiguousarray(x[::-1]), fin, fout)


# ---------------------------------------------------------------- kit one-shots

def rewind_paper(seed=0) -> np.ndarray:
    return library._out(reverse(library.page_turn(seed, direction=-1.0)), rng(seed, "rp"), 0)


def rewind_pencil(seed=0, dur=0.45) -> np.ndarray:
    return library._out(reverse(library.pencil_stroke(seed, dur=dur, speed=1.3)), rng(seed, "rpen"), 0)


def rewind_mechanism(seed=0) -> np.ndarray:
    """The valve clunk and its room, backward: a swell that snaps shut."""
    y = library.valve_clunk(seed, muted=True, flow=True)
    y = dsp.verb(y, "hall", 0.35, seed=83)[: ns(2.4)]
    return library._out(reverse(y, 0.05, 0.004), rng(seed, "rmech"), 0)


def rewind_whoosh(seed=0, dur=1.3) -> np.ndarray:
    """Reverse whoosh without tape-stop: a band rising and narrowing, the
    image collapsing to centre, a clean stop."""
    r = rng(seed, "rwhoosh", dur)
    n = ns(dur)
    cen = np.geomspace(260, 5200, 24)
    wid = np.linspace(1.4, 0.35, 24)
    a = dsp.band_sweep(n, r, cen, wid, nper=2048, hop=256)
    b = dsp.band_sweep(n, r, cen * 1.03, wid, nper=2048, hop=256)
    env = dsp.curve([(0, -48), (dur * 0.5, -18), (dur * 0.88, -4), (dur, 0)], n, "db")
    env = dsp.fade(env, 0.0, 0.008)
    w = np.linspace(1.0, 0.0, n) ** 1.5  # wide to centre
    mid = (a + b) * 0.5
    side = (a - b) * 0.5 * w * 2.0
    y = np.stack([mid + side, mid - side], 1) * env[:, None]
    return library._out(y, r, 0)


def rewind_suction(seed=0, dur=1.8, source: np.ndarray | None = None) -> np.ndarray:
    """Reverse-reverb swell into silence. With a source, the bed itself is
    inhaled; without one, a soft air burst is used."""
    r = rng(seed, "rsuck", dur)
    if source is None:
        k = ns(0.35)
        source = dsp.st(dsp.pink(k, r, lo=120, hi=6000) * dsp.ar(k, 0.02, 0.25))
    ir = dsp.make_ir("space", 89, t60=max(dur * 1.6, 2.5))
    wet = dsp.convolve(dsp.hp(source, 120, 2), ir)
    tail = wet[len(source): len(source) + ns(dur)]
    tail = dsp.pad_to(tail, ns(dur))
    y = reverse(tail, 0.2, 0.008)
    # brightness closes in as it is drawn away
    def g(times, freqs):
        u = np.clip(times / dur, 0, 1)[:, None]
        fc = 9000 * (1 - u) + 2200 * u
        return 1.0 / np.sqrt(1 + (freqs[None, :] / fc) ** 4)
    y = dsp.stft_shape(y, g, 2048, 512)
    y = dsp.fade(y, 0.2, 0.008)
    return library._out(y, r, 0)


KIT = {
    "rewind-paper": (rewind_paper, -30.0, ()),
    "rewind-pencil": (rewind_pencil, -32.0, ("dur",)),
    "rewind-mechanism": (rewind_mechanism, -31.0, ()),
    "rewind-whoosh": (rewind_whoosh, -27.0, ("dur",)),
    "rewind-suction": (rewind_suction, -26.0, ("dur",)),
}


# ---------------------------------------------------------------- granular reverse

def granular_reverse(src: np.ndarray, t0: float, t1: float, story_fn, grain: float = 0.075,
                     overlap: int = 4, seed: int = 3) -> np.ndarray:
    """Overlap-add of reversed Hann grains read at story_fn(film time).

    Each grain is a short slice of the source around the story time, played
    backward. Grain positions are jittered a little so regular repetition
    does not comb. Output is normalised by the window overlap sum.
    """
    r = rng(seed, "grains")
    N = ns(t1 - t0)
    g = ns(grain)
    H = max(g // overlap, 1)
    win = np.hanning(g)
    out = np.zeros((N + g, 2))
    wsum = np.zeros(N + g)
    src = dsp.st(src)
    for k in range(0, N, H):
        tau = t0 + (k + g / 2) / SR
        s = float(story_fn(tau)) + r.uniform(-0.012, 0.012)
        i = ns(s) - g // 2
        if i < 0 or i + g > len(src):
            continue
        seg = src[i:i + g][::-1]
        out[k:k + g] += seg * win[:, None]
        wsum[k:k + g] += win
    out = out[:N] / np.maximum(wsum[:N], 0.5)[:, None]
    return out


def render(C, music_pre: np.ndarray, sfx_pre: np.ndarray, events: list | None = None,
           report: dict | None = None):
    """Build the rewind for both stems. Returns (music_add, sfx_add), each the
    length of the film, silent outside the rewind window."""
    n = len(music_pre)
    rs, re_ = C["rewindStart"], C["rewindEnd"]
    landing = C["landing"]
    off = C["offline"]
    dur = re_ - rs
    music_add = np.zeros((n, 2))
    sfx_add = np.zeros((n, 2))

    def sfn(tau):
        return story_time(tau, rs, re_, landing)

    # 2. granular reverse of each stem, fading in after the fall-away
    gm = granular_reverse(music_pre, rs, re_, sfn, seed=5)
    gs = granular_reverse(sfx_pre, rs, re_, sfn, seed=6)
    m_ = len(gm)

    def shape(times, freqs):
        u = np.clip(times / dur, 0, 1)[:, None]
        # open until the deceleration, then drawn thin from both ends:
        # the top closes from 14 kHz to 900 Hz, the bottom rises 40 to 300 Hz
        c = np.where(u < 0.55, 14000.0, 14000.0 * (900 / 14000.0) ** ((u - 0.55) / 0.45))
        h = np.where(u < 0.55, 40.0, 40.0 * (300 / 40.0) ** ((u - 0.55) / 0.45))
        f = freqs[None, :]
        return 1.0 / np.sqrt(1 + (f / c) ** 4) / np.sqrt(1 + (h / np.maximum(f, 1.0)) ** 4)

    gm = dsp.stft_shape(gm, shape, 2048, 256)
    gs = dsp.stft_shape(gs, shape, 2048, 256)
    # the texture follows a designed loudness arc relative to the Act I bed,
    # whatever the story material under the scrub happens to be
    ref = music_pre[max(ns(rs - 10.0), 0):ns(rs)] + sfx_pre[max(ns(rs - 10.0), 0):ns(rs)]
    Lb = dsp.db(dsp.rms(ref) + 1e-9)
    arc = [(0.0, -60.0), (0.1, -30.0), (0.25 * dur, -2.0), (0.5 * dur, 0.0), (0.72 * dur, -5.0),
           (0.9 * dur, -15.0), (dur, -32.0)]
    tgt = Lb + dsp.curve(arc, m_, "lin")
    tot = dsp.mono(gm + gs)
    win = ns(0.12)
    pw = uniform_filter1d(tot * tot, win, mode="nearest")
    cur = 10 * np.log10(pw + 1e-14)
    gdb = np.clip(tgt - cur, -40.0, 12.0)
    gdb = uniform_filter1d(gdb, ns(0.06), mode="nearest")
    env = dsp.undb(gdb) * dsp.curve([(0, 0.0), (0.1, 0.0), (0.2, 1.0), (dur - 0.012, 1.0), (dur, 0.0)], m_, "cos")
    gm = gm * env[:, None]
    gs = gs * env[:, None]
    a = ns(rs)
    music_add[a:a + m_] += gm[: max(min(m_, n - a), 0)]
    sfx_add[a:a + m_] += gs[: max(min(m_, n - a), 0)]

    # 3. suction: the Act I bed around the moment before the rewind, inhaled
    src_a = max(ns(rs - 1.2), 0)
    src = (music_pre + sfx_pre)[src_a:ns(rs)]
    sdur = min(1.9, dur * 0.6)
    su = rewind_suction(41, sdur, source=src)
    # controlled: the swell's last 150 ms peaks at the Act I bed's own level
    su = su * (dsp.undb(Lb - 4.0) / (dsp.rms(su[-ns(0.15):]) + 1e-12))
    b = ns(re_) - len(su)
    music_add[b:b + len(su)] += su * 0.6
    sfx_add[b:b + len(su)] += su * 0.4

    # 4. reverse whoosh ending at the landing
    wd = min(1.3, dur * 0.45)
    wh = rewind_whoosh(43, wd) * dsp.undb(KIT["rewind-whoosh"][1] - 3.0)
    b = ns(re_) - len(wh)
    sfx_add[b:b + len(wh)] += wh

    # 5. mechanical state change backward at the story time of "offline"
    t_off = film_time_of_story(off, rs, re_, landing)
    mech = rewind_mechanism(47) * dsp.undb(KIT["rewind-mechanism"][1])
    # the reversed clunk's peak sits near its end: align the peak with t_off
    pk = int(np.argmax(np.abs(dsp.mono(mech))))
    b = ns(min(t_off, re_ - 0.08)) - pk
    b = min(b, ns(re_) - len(mech))
    sfx_add[max(b, 0):max(b, 0) + len(mech)] += mech[max(-b, 0):]

    # reversed paper as the evidence clears, reversed pencil as heads re-ink
    user = [e for e in (events or []) if e["kind"].startswith("rewind-") and rs - 0.1 <= e["t"] <= re_ + 0.1]
    if not user:
        pp = rewind_paper(51) * dsp.undb(KIT["rewind-paper"][1])
        _add(sfx_add, pp, rs + 0.25)
        pp2 = rewind_paper(52) * dsp.undb(KIT["rewind-paper"][1] - 3)
        _add(sfx_add, pp2, rs + 0.45 * dur)
        for k in range(5):  # sprinkler heads re-ink one by one (reverse order)
            t = rs + dur * (0.55 + 0.07 * k)
            pc = rewind_pencil(60 + k, 0.2) * dsp.undb(KIT["rewind-pencil"][1] - 2 * k)
            _add(sfx_add, pc, t)

    # hard guarantee: silence after the landing, clean edges at both ends
    for buf in (music_add, sfx_add):
        e = dsp.curve([(0, 0.0), (rs - 0.01, 0.0), (rs + 0.01, 1.0), (re_ - 0.006, 1.0), (re_, 0.0)], n, "cos")
        buf *= e[:, None]
    if report is not None:
        report["rewind"] = {"start": round(rs, 3), "end": round(re_, 3), "landing_story_time": round(landing, 3),
                            "act1_bed_rms_dbfs": round(Lb, 1),
                            "offline_passes_at": round(t_off, 3), "scrub_seconds_of_story": round(rs - landing, 2)}
    return music_add, sfx_add


def _add(buf, snd, t):
    i = ns(t)
    k = min(len(snd), len(buf) - i)
    if k > 0 and i >= 0:
        buf[i:i + k] += dsp.st(snd)[:k]
