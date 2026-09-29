"""Sound design: the beds, the designed story sounds, and the default drawing
events used for any scene that has not published its own events yet.

Three sources of one-shots end up in the SFX stem:

  designed  story-level sounds tied to cues (radio, footsteps, the sprinkler
            valve, the system tick, the crossing, the three choices, the five
            chain confirmations, the latch). Always present; a scene event of
            the same kind within 0.3 s replaces the designed one.
  scene     events published by the compositions (cues/resolved.json events,
            or an --events file): every stroke, tick, stamp and click.
  auto      a plausible default set of drawing and interface events, tagged by
            scene. For each scene, auto events are used only while that scene
            publishes no events of its own.
"""
from __future__ import annotations

import numpy as np

from . import dsp, library
from .dsp import SR, ns, rng


# ---------------------------------------------------------------- beds

BED_LUFS = {"ventilation": -45.0, "machinery": -47.0, "roof": -47.0, "roomtone": -60.0, "siteair": -52.0}


def _cal(x, target):
    L = dsp.lufs(x)
    return x * dsp.undb(target - L) if L > -100 else x


def beds(C, subtract_at=None, subtract_fade=0.35) -> dict:
    """Continuous ambience layers, each the film's length, automated by cues."""
    n = ns(C.duration)
    end = C.duration
    rs, re_ = C["rewindStart"], C["rewindEnd"]
    off = subtract_at if subtract_at is not None else C["offline"]
    out = {}

    v = _cal(library.ventilation(3, C.duration), BED_LUFS["ventilation"])
    ve = dsp.curve([(0, -80), (0.05, -40), (1.8, 0), (off, 0), (off + subtract_fade, -3), (C["afterwards"], -3),
                    (C["afterwards"] + 1.5, -6), (rs, -6), (rs + 0.3, -80), (end, -80)], n, "db")
    out["ventilation"] = v * ve[:, None]

    mh = _cal(library.machinery_hum(5, C.duration), BED_LUFS["machinery"])
    t_in = C["isolated"] - 0.6
    me = dsp.curve([(0, -80), (t_in, -80), (t_in + 2.5, -3), (C["noOne"], -3), (C["noOne"] + 4.0, 1.5),
                    (off - 0.01, 1.5), (off + subtract_fade, -80), (end, -80)], n, "db")
    out["machinery"] = mh * me[:, None]

    ra = _cal(library.roof_air(7, C.duration), BED_LUFS["roof"])
    w0, w1 = C["worker"], C["workerEnd"]
    re2 = dsp.curve([(0, -80), (w0 - 0.7, -80), (w0 - 0.2, 0), (w1 + 0.3, 0), (w1 + 1.1, -80), (end, -80)], n, "db")
    out["roof"] = ra * re2[:, None]

    rt = _cal(library.room_tone(9, C.duration), BED_LUFS["roomtone"])
    cr = C["chainRecord"]
    rte = dsp.curve([(0, -80), (re_ - 0.2, -80), (re_ + 0.4, 0), (cr + 2.0, 0), (end - 1.5, -80), (end, -80)], n, "db")
    out["roomtone"] = rt * rte[:, None]

    sa = _cal(library.ventilation(11, C.duration), BED_LUFS["siteair"])
    sae = dsp.curve([(0, -80), (re_ + 0.8, -80), (C["worker"] + 0.5, 0), (cr - 0.5, 0), (cr + 2.5, -80),
                     (end, -80)], n, "db")
    out["siteair"] = sa * sae[:, None]
    return out


# ---------------------------------------------------------------- designed story sounds

def designed(C) -> list:
    ev = []

    def add(t, kind, gain=0.0, **kw):
        if t is not None:
            ev.append(dict(t=float(t), kind=kind, gain_db=gain, source="designed", **kw))

    # Act I site: a radio in a pause, contractors on gravel, a lockout
    add(C.nearest_gap(C["contractors"] + 0.9, need=0.35), "radio-squelch", 0.0, seed=3, pan=0.45)
    add(C["contractors"] + 0.05, "footsteps", -2.0, seed=4, count=6, interval=0.55, surface="gravel",
        pan0=-0.5, pan1=-0.1)
    add(C["isolated"] + 0.3, "solenoid-click", -2.0, seed=5, pan=0.3)
    add(C["isolated"] + 0.36, "relay-click", -6.0, seed=6, pan=0.3)
    add(C.nearest_gap(C["workMoves"] + 1.0, need=0.3), "distant-clank", 0.0, seed=7, pan=-0.6)
    add(C["noOne"] + 3.4, "distant-clank", -3.0, seed=8, pan=0.55)
    add(C.nearest_gap(C["head"] + 1.0, need=0.3), "radio-click", -2.0, seed=9, pan=-0.4)
    # the condition failure: a muted valve, no alarm (impact lands on the word)
    add(C["offline"] - 0.15, "valve-clunk", 0.0, seed=10, pan=0.35)
    # Act III
    add(C["offline2"] - 0.15, "valve-clunk", -4.0, seed=11, pan=0.35, flow=False)
    add(C["sees"], "system-tick", 0.0, seed=12)
    add(C["cross"], "stretch", 0.0, seed=13, dur=0.9)
    add(C["cross"] + 0.9, "cross-snap", 0.0, seed=14)
    add(C["change"], "choice-accent", 0.0, seed=15, variant=0, pan=-0.2)
    add(C["retain"], "choice-accent", 0.0, seed=16, variant=1)
    add(C["carriers"], "choice-accent", 0.0, seed=17, variant=2, pan=0.2)
    add(C["decisionsL18"], "decision-accent", 0.0, seed=18, pan=-0.25)
    add(C["decisionsL18"] + 0.55, "decision-accent", -3.0, seed=19, pan=0.25)
    # the chain and the mark
    for k, name in enumerate(["Record", "Trust", "Decision", "Price", "Capacity"]):
        add(C[f"chain{name}"], f"chain-{name.lower()}", 0.0, seed=20 + k, pan=-0.3 + 0.15 * k)
    add(C["priora"], "latch", 0.0, seed=30)
    return ev


# ---------------------------------------------------------------- auto drawing events

def auto(C) -> list:
    """Default drawing and interface events per scene (deterministic)."""
    r = rng(17, "auto")
    ev = []

    def add(scene, t, kind, gain=0.0, **kw):
        if t is None:
            return
        ev.append(dict(t=float(t), kind=kind, gain_db=gain, scene=scene, source="auto",
                       seed=int(r.integers(0, 10 ** 6)), **kw))

    W = "a1-world"
    # first roof edge with a set square, then two more edges
    add(W, 0.30, "set-square-tap", 0.0, pan=-0.1)
    add(W, 0.34, "pencil-stroke", 0.0, dur=0.9, pressure=0.8, pan=-0.1)
    add(W, 1.35, "pencil-stroke", -2.0, dur=0.6, pan=0.1)
    add(W, 2.05, "ruler-contact", -2.0, pan=0.15)
    add(W, 2.1, "pencil-stroke", -2.0, dur=0.7, pan=0.15)
    # the site draws itself, radiating out from Roof 03
    t = 2.9
    while t < C["contractors"] + 2.2:
        add(W, t, "pencil-stroke", float(r.uniform(-7, -3)), dur=float(r.uniform(0.18, 0.55)),
            pressure=float(r.uniform(0.5, 0.85)), pan=float(r.uniform(-0.5, 0.5)))
        if r.random() < 0.18:
            add(W, t - 0.03, "ruler-contact", -5.0, pan=float(r.uniform(-0.4, 0.4)))
        t += float(r.uniform(0.22, 0.45))
    add(W, C["contractors"] + 0.2, "technical-pen", -3.0, dur=0.9, pan=-0.35)
    add(W, C["isolated"] + 0.45, "pencil-tick", -3.0, pan=0.3)
    for k in range(5):
        add(W, C["workMoves"] + 0.05 + 0.2 * k, "pencil-tick", -4.0 - k, pan=float(r.uniform(-0.5, 0.5)))
    # the envelope drawn in two passes, closing on "accepted"
    add(W, C["insurance"] + 0.5, "pencil-stroke", -5.0, dur=1.5, pressure=0.35, speed=1.2, pan=-0.2)
    add(W, C["accepted"] - 1.05, "pencil-stroke", -2.0, dur=1.05, pressure=0.85, pan=-0.1)

    Pp = "a1-paper"
    add(Pp, C["insurance"] - 0.3, "paper-slide", -1.0, dur=0.7, pan0=0.6, pan1=0.25)
    add(Pp, C["insurance"] + 0.45, "technical-pen", -4.0, dur=1.3, pan=0.3)
    add(Pp, C["accepted"] + 0.15, "technical-pen", -4.0, dur=1.0, pan=0.35)
    add(Pp, C["translate"], "pencil-stroke", -4.0, dur=0.5, pan=0.2)
    add(Pp, C["permits"] + 0.3, "stamp", 0.0, pan=0.3)
    add(Pp, C["permits"] + 0.9, "pencil-stroke", -6.0, dur=0.35, pan=0.35)
    for k in range(3):
        add(Pp, C["checklists"] + 0.25 + 0.24 * k, "pencil-tick", -3.0 - k, pan=0.45)
    add(Pp, C["noOne"] + 0.35, "paper-lift", -2.0, pan=0.4)

    # complexity: overlapping waves of markers and tags, and three containment lines
    t = C["noOne"] + 0.3
    head = C["head"]
    wave = 0
    while t < head + 0.4:
        add(W, t, "pencil-tick" if r.random() < 0.6 else "pencil-stroke", float(r.uniform(-11, -5)),
            dur=float(r.uniform(0.12, 0.3)), pan=float(r.uniform(-0.7, 0.7)))
        t += float(r.uniform(0.07, 0.19))
    for k in range(3):
        add(W, C["noOne"] + 0.4 + 0.55 * k, "pencil-stroke", -6.0, dur=0.9, pressure=0.5, pan=-0.3 + 0.3 * k)
    # Roof 03, the hot-work label, five ticks, the zone outline
    add(W, C["hotWork"] + 0.2, "pencil-stroke", -3.0, dur=0.45, pan=0.1)
    for k in range(5):
        add(W, C["safeguards"] + 0.05 + 0.22 * k, "pencil-tick", -2.0 - 0.5 * k, pan=-0.3 + 0.15 * k)
    add(W, C["inPlace"] + 0.1, "pencil-hatch", -8.0, dur=0.6, rate=9.0, pan=0.3)
    # a different hand tags the valve (technical pen), then the envelope moves inward
    add(W, C.word_time(["sprinkler"], "landing") if C.word_time(["sprinkler"], "landing", strict=False) else C["landing"] + 0.3,
        "technical-pen", -5.0, dur=0.7, speed=0.8, pan=0.35)
    add(W, C["changed"], "pencil-stroke", -7.0, dur=0.8, pressure=0.4, pan=0.05)

    A = "a1-after"
    t = C["afterwards"] - 0.3
    for k in range(7):
        add(A, t, "paper-slide", -5.0 - k * 0.6, dur=float(r.uniform(0.25, 0.4)), pan0=float(r.uniform(-0.7, 0.7)),
            pan1=float(r.uniform(-0.3, 0.3)))
        add(A, t + 0.22, "paper-stack", -7.0, pan=float(r.uniform(-0.5, 0.5)))
        t += float(r.uniform(0.45, 0.75)) if k < 3 else float(r.uniform(0.6, 1.0))
    add(A, C["gap"] - 0.7, "technical-pen", -4.0, dur=1.1, pan=0.0)
    add(A, C["gap"] - 0.72, "ruler-contact", -3.0, pan=0.0)
    add(A, C["gap"] + 0.05, "set-square-tap", -4.0, pan=0.1)

    R = "a2-resolve"
    t0 = C["l12"]
    for k in range(14):  # lines snap into precise geometry, staggered by building
        add(R, t0 + 0.12 + k * 0.16 + float(r.uniform(-0.03, 0.03)), "align-snap", -3.0 - (k % 3) * 2,
            pan=float(r.uniform(-0.6, 0.6)))
    for k in range(4):  # four recognised fields
        add(R, C["workerEnd"] + 0.12 + 0.2 * k, "align-snap", -1.0, pan=-0.4 + 0.1 * k)
    add(R, C["connects"] + 0.15, "packet", -2.0, pan=-0.2)
    add(R, C["connects"] + 0.85, "packet", -4.0, pan=0.25)
    ver = C.get("verifies") or C.word_time(["checks", "verifies"], "connects", strict=False) or C["connects"] + 3.0
    for k in range(5):
        add(R, ver + 0.1 + 0.42 * k, "confirm", 0.0, variant=k, pan=-0.35)
    add(R, C["keepsRecord"] + 0.05, "record-append", 0.0, pan=0.4)
    add(R, C["keepsRecord"] + 0.62, "record-append", -2.0, pan=0.4)

    X = "a3-change"
    add(X, C["l16"] + 0.25, "record-append", -2.0, pan=0.4)
    add(X, C["sees"] + 0.4, "relay-click", -4.0, pan=-0.35)
    add(X, C["change"] + 0.85, "align-snap", 0.0, pan=0.0)
    add(X, C["retain"] + 0.95, "record-append", -1.0, pan=0.35)
    add(X, C["carriers"] + 0.25, "packet", -2.0, pan=0.3)
    for k in range(4):
        add(X, C["carriers"] + 0.75 + 0.33 * k + float(r.uniform(0, 0.08)), "response-tick", -2.0 - k,
            pan=0.15 + 0.12 * k)
    t = C["ordinary"] - 0.6
    while t < C["decisionsL18"] - 0.25:
        add(X, t, "node-pass", float(r.uniform(-9, -3)), pan=float(r.uniform(-0.7, 0.7)))
        t += float(r.uniform(0.28, 0.5))
    add(X, C["decisionsL18"] + 0.95, "record-append", -3.0, pan=0.45)
    add(X, C["decisionsL18"] + 1.3, "record-append", -5.0, pan=0.45)
    return ev


def merge(designed_ev, scene_ev, auto_ev, window=0.3):
    """Scene events win over designed events of the same kind nearby; auto
    events only for scenes that published nothing."""
    covered = {e.get("scene") for e in scene_ev if e.get("scene")}
    has_unscoped = any(not e.get("scene") for e in scene_ev)
    out = list(scene_ev)
    for d in designed_ev:
        if not any(e["kind"] == d["kind"] and abs(e["t"] - d["t"]) < window for e in scene_ev):
            out.append(d)
    for a in auto_ev:
        if a["scene"] in covered or has_unscoped:
            continue
        out.append(a)
    out.sort(key=lambda e: e["t"])
    return out
