"""The score: restrained, modern, consonant, locked to the cue sheet.

One key family (D major and its relative B minor), slow harmonic rhythm, a
felt piano, slow strings, a warm pad, low strings and a sine sub, rendered
through fluidsynth from generated MIDI, plus a pulse built from operational
sounds (pump strokes, relays, conveyor ticks, valve breaths) synthesised here.

Nothing is time-stretched. Every phrase starts at a cue time; inside a phrase
the pulse runs on a 96 BPM grid anchored so that a bar line lands on the
phrase's cue. The music is arranged by act:

  A  0 to noOne           sparse: D drone, a felt piano motif, slow strings
  B  noOne to offline     the site grows: a quiet rhythmic system builds
  C  offline to afterwards  subtraction: pulse, drone, low end and piano removed;
                          one high held interval thins away
  D  afterwards to rewindStart  aftermath: low strings, single low piano notes
  (rewind is built by rewind.py from this material, reversed)
  E  rewindEnd to connects  clean fifth, one piano note, a precise tick enters
  F  connects to offline2 clarity: 8th-note felt ostinato, chord per bar,
                          accents on "Prevention" and "Proof"
  G  offline2 to riskOwner  a layer steps down; near silence and one low tone
                          for the crossing
  H  change to ordinary   momentum through the three decision paths
  I  ordinary to chainRecord  quiet rhythmic flow
  J  chainRecord to end   the chain: G add9, A sus4, resolving to D add9 on the
                          Priora latch, long natural decay into silence
"""
from __future__ import annotations

import math

import numpy as np

from . import dsp, library, midi
from .dsp import SR, ns, rng

BPM = 96.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT

GM = {"piano": 0, "strings": 49, "pad": 89, "cello": 42, "bass": 43}

# loudness each layer is calibrated to (integrated, gated) before the mix
TARGET_LUFS = {
    "piano": -31.0, "strings": -32.0, "pad": -37.0, "cello": -35.0, "bass": -37.0,
    "sub": -40.0, "pulse": -34.0,
}


def m(name: str) -> int:
    """Note name to MIDI number (C4 = 60)."""
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8,
             "A": 9, "A#": 10, "B": 11}
    p, o = name[:-1], int(name[-1])
    return 12 * (o + 1) + names[p]


def hz(midi_note: int) -> float:
    return 440.0 * 2 ** ((midi_note - 69) / 12.0)


CH = {
    "Dsus2": ["D3", "A3", "E4"],
    "Dadd9": ["D3", "A3", "E4", "F#4"],
    "D": ["D3", "A3", "F#4"],
    "Bm7": ["B2", "F#3", "A3", "D4"],
    "Gmaj7": ["G2", "D3", "B3", "F#4"],
    "Gadd9": ["G2", "D3", "A3", "B3"],
    "Asus4": ["A2", "E3", "D4"],
    "A": ["A2", "E3", "C#4"],
    "A/C#": ["C#3", "A3", "E4"],
    "Bm": ["B2", "F#3", "D4"],
    "Dwide": ["D2", "A2", "F#3", "E4", "A4"],
    "fifth": ["A3", "E4"],
}
ROOT = {"Dsus2": "D2", "Dadd9": "D2", "D": "D2", "Bm7": "B1", "Gmaj7": "G1", "Gadd9": "G1",
        "Asus4": "A1", "A": "A1", "A/C#": "C#2", "Bm": "B1", "Dwide": "D2", "G": "G1"}
OSTINATO = {  # 8 eighths per bar over the chord
    "Dadd9": ["D4", "A4", "E5", "A4", "D5", "A4", "E5", "A4"],
    "A/C#": ["C#4", "A4", "E5", "A4", "C#5", "A4", "E5", "A4"],
    "Bm7": ["B3", "F#4", "D5", "F#4", "A4", "F#4", "D5", "F#4"],
    "Gmaj7": ["G3", "D4", "B4", "D4", "F#4", "D4", "B4", "D4"],
    "Bm": ["B3", "F#4", "D5", "F#4", "B4", "F#4", "D5", "F#4"],
    "D": ["D4", "A4", "D5", "A4", "F#4", "A4", "D5", "A4"],
    "A": ["A3", "E4", "C#5", "E4", "A4", "E4", "C#5", "E4"],
    "G": ["G3", "D4", "B4", "D4", "G4", "D4", "B4", "D4"],
}
OST_VEL = [36, 23, 29, 23, 32, 23, 29, 23]


class Part:
    def __init__(self, inst: str, name: str):
        self.inst, self.name = inst, name
        self.program = GM[inst]
        self.notes, self.ccs = [], []

    def note(self, t, dur, pitch, vel):
        p = m(pitch) if isinstance(pitch, str) else int(pitch)
        self.notes.append((max(t, 0.0), max(t, 0.0) + max(dur, 0.02), p, int(vel)))

    def chord(self, t, t_end, names, vel, roll=0.0):
        for i, n in enumerate(CH[names] if isinstance(names, str) else names):
            self.note(t + i * roll, t_end - t - i * roll, n, vel)

    def expr(self, points, step=0.05):
        """CC11 expression breakpoints [(t, value 0..127)], linearly stepped."""
        pts = sorted(points)
        for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
            k = max(int((t1 - t0) / step), 1)
            for i in range(k):
                self.ccs.append((t0 + i * (t1 - t0) / k, 11, round(v0 + (v1 - v0) * i / k)))
        self.ccs.append((pts[-1][0], 11, pts[-1][1]))


def _grid(anchor: float, start_limit: float):
    """Bar grid with a bar line on `anchor`, first bar at or after start_limit."""
    k = math.floor((anchor - start_limit) / BAR + 1e-9)
    return anchor - k * BAR


class Arrangement:
    """All notes, synth events and gain automation, computed from cues."""

    def __init__(self, C):
        self.C = C
        self.parts: dict[str, Part] = {}
        self.pulse = []      # (t, kind, gain_db, pan, seed)
        self.sub = []        # (t0, t1, root name, level dB)
        self.auto = {}       # part name -> [(t, gain 0..1)] cos-interpolated
        self.grid_anchors = {}
        self.r = rng(7, "arrangement")
        self._build()

    def part(self, inst, act):
        key = f"{inst}-{act}"
        if key not in self.parts:
            self.parts[key] = Part(inst, key)
        return self.parts[key]

    def hum(self, t, amount=0.008):
        return t + float(self.r.uniform(-amount, amount))

    def vel(self, v, amount=3):
        return int(np.clip(v + self.r.integers(-amount, amount + 1), 1, 127))

    # ------------------------------------------------------------------ build
    def _build(self):
        C = self.C
        end = C.duration
        rs, re_ = C["rewindStart"], C["rewindEnd"]
        off = C["offline"]

        # ---------------- A: sparse
        s1, p1, d1, c1, b1 = (self.part("strings", "a1"), self.part("piano", "a1"), self.part("pad", "a1"),
                              self.part("cello", "a1"), self.part("bass", "a1"))
        t_ins, t_acc, t_chk, t_no = C["insurance"], C["accepted"], C["checklists"], C["noOne"]
        s1.chord(0.6, t_ins + 0.15, "Dsus2", 48)
        s1.chord(t_ins, t_acc + 0.15, "Bm7", 46)
        s1.chord(t_acc, t_chk + 0.15, "Gmaj7", 46)
        s1.chord(t_chk, t_no + 0.2, "Asus4", 44)
        s1.expr([(0.0, 18), (0.6, 22), (4.0, 64), (t_ins, 74), (t_chk, 70), (t_no, 76)])
        d1.chord(0.9, off + 0.4, ["D2", "A2"], 50)
        d1.expr([(0.0, 0), (0.9, 10), (5.0, 70), (t_no, 84), (off, 96)])
        motif = [(C["hour"], "A4", 34, 2.2), (C["contractors"] + 0.95, "F#4", 29, 1.6),
                 (C["isolated"], "E4", 29, 1.6), (C["workMoves"], "D4", 31, 2.6),
                 (C["workMoves"] + 0.02, "A3", 25, 2.6), (t_acc, "D5", 31, 1.8),
                 (t_acc + 0.03, "B3", 24, 1.8), (C["permits"], "C#5", 27, 1.4), (t_chk, "A4", 27, 1.6)]
        for (t, n, v, dur) in motif:
            p1.note(self.hum(t), dur, n, self.vel(v))

        # ---------------- B: the rhythmic system builds (grid anchored on noOne)
        g0 = t_no
        self.grid_anchors["B"] = g0
        bars = []
        k = 0
        while g0 + k * BAR < off:
            bars.append(g0 + k * BAR)
            k += 1
        seqB = ["D", "D", "Gmaj7", "Gmaj7", "D", "D"]
        for i, bt in enumerate(bars):
            chn = seqB[i % len(seqB)]
            s1.chord(bt, min(bt + BAR + 0.15, off + 0.4), chn, 44)
            c1.note(bt, min(BAR + 0.1, off + 0.4 - bt), ROOT[chn][:-1] + "2", 42)
            if i >= 1:  # quarter-note two-note figure, rising softly
                fig = {"D": ["A4", "D5"], "Gmaj7": ["B4", "D5"]}[chn]
                for b in range(4):
                    t = bt + b * BEAT
                    if t < off - 0.05:
                        p1.note(self.hum(t), BEAT * 0.9, fig[b % 2], self.vel(24 + 3 * min(i, 3) + (4 if b == 0 else 0)))
            ramp = min(i / 3.0, 1.0)
            for b in (0, 2):  # pump strokes
                t = bt + b * BEAT
                if t < off - 0.03:
                    self.pulse.append((t, "pump", -9 + 6 * ramp, 0.0, 11 + b))
            if i >= 1:  # relay ticks on off-beat eighths
                for b in range(4):
                    t = bt + (b + 0.5) * BEAT
                    if t < off - 0.03:
                        self.pulse.append((t, "relay", -14.0, 0.35 if b % 2 else -0.35, 20 + b))
            if i >= 2:  # conveyor sixteenths and a valve breath every other bar
                for s in range(16):
                    t = bt + s * BEAT / 4
                    if t < off - 0.03:
                        self.pulse.append((t, "conveyor", -17.0 + [0, -8, -5, -8][s % 4], 0.15, 30 + s % 4))
                if i % 2 == 0:
                    t = bt + 3.5 * BEAT
                    if t < off - 0.03:
                        self.pulse.append((t, "breath", -16.0, -0.2, 40))
        self.sub.append((t_no, off, "D", -2.0))
        s1.expr([(t_no, 76), (off - 0.05, 80), (off + 0.35, 0), (C["afterwards"] - 0.1, 0)])
        c1.expr([(0, 90)])

        # ---------------- C: subtraction at the condition failure
        # relays keep a thinned half-time pulse, then fade out by "nobody"
        nb = C["nobody"]
        t = bars[-1] if bars else off
        while t < off:
            t += BEAT
        k = 0
        while t < nb + 0.6:
            u = (t - off) / max(nb + 0.6 - off, 0.1)
            self.pulse.append((t + 0.5 * BEAT, "relay", -15.0 - 12 * u, 0.3 if k % 2 else -0.3, 60 + k % 4))
            t += 2 * BEAT
            k += 1
        # one high held interval, thinning
        hs = self.part("strings", "held")
        hs.note(off + 0.25, C["afterwards"] - off, "B4", 34)
        hs.note(off + 0.45, C["afterwards"] - off - 0.2, "E5", 32)
        hs.expr([(off, 0), (off + 0.25, 8), (off + 2.2, 46), (C["changed"], 40), (nb, 26),
                 (C["afterwards"] - 0.3, 0)])

        # ---------------- D: aftermath
        af, q1, q3, gap = C["afterwards"], C["q1"], C["q3"], C["gap"]
        b1.note(af, rs + 0.4 - af, "B1", 40)
        b1.expr([(af, 0), (af + 1.5, 70), (gap, 64), (rs, 50)])
        c1.note(af + 0.1, rs + 0.4 - af - 0.1, "F#2", 36)
        s1.chord(q1, gap + 0.2, ["F#3", "B3", "D4"], 38)
        s1.chord(gap, rs + 0.4, "Gmaj7", 36)
        s1.expr([(q1 - 0.1, 0), (q1 + 1.2, 52), (q3, 60), (gap, 58), (rs, 44)])
        for (t, n, v, dur) in [(af + 0.2, "B2", 33, 2.4), (q1, "F#3", 27, 2.0), (q3, "D4", 27, 2.0),
                               (gap, "G2", 35, 3.0), (gap + 0.02, "D3", 29, 3.0)]:
            p1.note(self.hum(t), dur, n, self.vel(v))

        # Act I everything falls away at the rewind
        for key in ("strings-a1", "piano-a1", "pad-a1", "cello-a1", "bass-a1", "strings-held"):
            self.auto[key] = [(0, 1.0), (rs, 1.0), (rs + 0.32, 0.0)]
        self.auto["pad-a1"] = [(0, 1.0), (off - 0.02, 1.0), (off + 0.35, 0.0)]
        self.auto["cello-a1"] = [(0, 1.0), (off - 0.02, 1.0), (off + 0.3, 0.0), (af, 0.0), (af + 0.01, 1.0),
                                 (rs, 1.0), (rs + 0.32, 0.0)]
        self.auto["piano-a1"] = [(0, 1.0), (off - 0.02, 1.0), (off + 0.12, 0.0), (af - 0.2, 0.0), (af, 1.0),
                                 (rs, 1.0), (rs + 0.32, 0.0)]

        # ---------------- E: after the rewind
        s2, p2, d2, c2 = (self.part("strings", "a2"), self.part("piano", "a2"), self.part("pad", "a2"),
                          self.part("cello", "a2"))
        con = C["connects"]
        d2.chord(re_ + 0.3, C["offline2"] + 0.2, "fifth", 46)
        d2.expr([(re_ + 0.3, 0), (re_ + 1.8, 72), (con, 84)])
        s2.chord(C["decisionWord"], con + 0.15, "Dsus2", 40)
        s2.expr([(C["decisionWord"] - 0.1, 0), (C["decisionWord"] + 1.8, 56), (con, 64)])
        p2.note(self.hum(C["decisionWord"]), 2.4, "D5", self.vel(30))
        gF = _grid(con, re_ + 1.2)
        self.grid_anchors["F"] = gF
        t = gF
        while t < con - 1e-6:  # precise tick enters, alone, before the full pulse
            for e in range(8):
                self.pulse.append((t + e * BEAT / 2, "tick", -16.0 if e % 2 == 0 else -22.0, 0.25 if e % 2 else -0.1, 70 + e % 4))
            t += BAR

        # ---------------- F: clarity
        off2 = C["offline2"]
        seqF = ["Dadd9", "A/C#", "Bm7", "Gmaj7"]
        i = 0
        t = con
        while t < off2 - 0.05:
            chn = seqF[i % 4]
            s2.chord(t, min(t + BAR + 0.12, off2 + 1.6), chn, 44)
            root = ROOT[chn]
            c2.note(t, min(BAR, off2 - t) + 0.08, root[:-1] + ("3" if root.startswith("C#") else "2"), 40)
            self.sub.append((t, min(t + BAR, off2), chn, -2.0))
            for e in range(8):
                te = t + e * BEAT / 2
                if te < off2 - 0.03:
                    p2.note(self.hum(te, 0.005), BEAT * 0.55, OSTINATO[chn][e], self.vel(OST_VEL[e] + (2 if i >= 2 else 0), 2))
                    self.pulse.append((te, "tick", -16.0 if e % 2 == 0 else -21.0, 0.25 if e % 2 else -0.1, 70 + e % 4))
                    if e in (0, 4):
                        self.pulse.append((te, "soft", -12.0, 0.0, 80 + e))
                    if e in (2, 6):
                        self.pulse.append((te, "relay", -19.0, 0.3, 90 + e))
            t += BAR
            i += 1
        pv, pf = C["prevention"], C["proof"]
        p2.note(self.hum(pv), 3.0, "D2", self.vel(44))
        p2.note(self.hum(pv) + 0.01, 3.0, "A2", self.vel(38))
        p2.note(self.hum(pf), 3.0, "G2", self.vel(42))
        p2.note(self.hum(pf) + 0.01, 3.0, "D3", self.vel(36))
        s2.expr([(con, 64), (pv - 0.4, 60), (pv + 0.6, 80), (pf, 72), (pf + 0.8, 82), (off2, 70),
                 (C["sees"], 40), (C["cross"] - 0.2, 0)])
        self.auto["piano-a2"] = [(0, 1.0), (off2 - 0.02, 1.0), (off2 + 0.25, 0.0)]
        self.auto["cello-a2"] = [(0, 1.0), (off2 - 0.02, 1.0), (off2 + 0.4, 0.0)]
        self.auto["pad-a2"] = [(0, 1.0), (C["sees"], 1.0), (C["cross"] - 0.1, 0.0)]

        # ---------------- G: the crossing (near silence, one low tone)
        lo = self.part("cello", "cross")
        sees, cross = C["sees"], C["cross"]
        lo.note(sees + 0.3, cross + 1.1 - sees - 0.3, "D2", 38)
        lo.expr([(sees + 0.3, 0), (sees + 0.9, 60), (cross, 70), (cross + 1.0, 0)])
        self.sub.append((sees + 0.3, cross + 1.0, "Dsus2", -6.0))

        # ---------------- H and I: momentum, then quiet flow
        s3, p3, c3, d3 = (self.part("strings", "a3"), self.part("piano", "a3"), self.part("cello", "a3"),
                          self.part("pad", "a3"))
        ro, ch, od, cr = C["riskOwner"], C["change"], C["ordinary"], C["chainRecord"]
        d3.chord(ro, cr + 0.6, ["B2", "F#3"], 44)
        d3.expr([(ro, 0), (ch, 60), (od, 72), (cr, 60)])
        s3.chord(ro + 0.05, ch + 0.15, "Bm", 36)
        gH = ch
        self.grid_anchors["H"] = gH
        seqH = ["Bm", "G", "D", "A", "G", "A"]
        i = 0
        t = gH
        while t < cr - 0.3:
            chn = seqH[min(i, len(seqH) - 1)] if i < len(seqH) else seqH[-2 + (i % 2)]
            quiet = t >= od - 0.5
            s3.chord(t, min(t + BAR + 0.12, cr + 0.3), chn if chn in CH else {"G": "Gmaj7"}.get(chn, chn), 42 if not quiet else 38)
            c3.note(t, min(BAR, cr - t) + 0.05, ROOT.get(chn, ROOT.get(chn + "7", "D2"))[:-1] + "2", 42 if not quiet else 36)
            self.sub.append((t, min(t + BAR, cr), chn, -2.0 if not quiet else -5.0))
            for e in range(8):
                te = t + e * BEAT / 2
                if te >= cr - 0.05:
                    break
                if not quiet or e % 2 == 0:
                    p3.note(self.hum(te, 0.005), BEAT * (0.55 if not quiet else 0.9), OSTINATO[chn][e],
                            self.vel(OST_VEL[e] + (4 if not quiet else -2), 2))
                if not quiet:
                    for s_ in range(2):
                        self.pulse.append((te + s_ * BEAT / 4, "tick", -16.0 if s_ == 0 else -24.0, 0.25 if (e + s_) % 2 else -0.1, 100 + (e + s_) % 4))
                    if e in (0, 4):
                        self.pulse.append((te, "soft", -11.0, 0.0, 110 + e))
                    if e in (2, 6):
                        self.pulse.append((te, "relay", -18.0, 0.3, 120 + e))
                else:
                    if e % 2 == 0:
                        self.pulse.append((te, "tick", -18.0, 0.2 if e % 4 else -0.1, 130 + e % 4))
                    if e == 0:
                        self.pulse.append((te, "soft", -14.0, 0.0, 140))
            t += BAR
            i += 1
        s3.expr([(ro, 0), (ro + 1.0, 50), (ch, 62), (C["carriers"], 72), (od, 64), (cr, 56)])
        for key in ("piano-a3", "cello-a3", "strings-a3", "pad-a3"):
            self.auto[key] = [(0, 1.0), (cr - 0.05, 1.0), (cr + 0.6, 0.0)]

        # ---------------- J: the chain and the mark
        s4, p4, d4, b4 = (self.part("strings", "close"), self.part("piano", "close"), self.part("pad", "close"),
                          self.part("bass", "close"))
        cp, pr = C["chainPrice"], C["priora"]
        s4.chord(cr - 0.1, cp + 0.2, "Gadd9", 40)
        s4.chord(cp, pr + 0.2, "Asus4", 40)
        s4.chord(pr, end - 0.6, "Dwide", 42)
        s4.expr([(cr - 0.1, 30), (cr + 1.2, 58), (cp, 60), (pr, 66), (pr + 1.6, 60), (end - 3.2, 26), (end - 0.8, 0)])
        d4.chord(cr, end - 0.6, ["D2", "A2"], 44)
        d4.expr([(cr, 0), (cr + 1.5, 60), (pr, 72), (end - 3.0, 30), (end - 0.8, 0)])
        b4.note(pr, end - 0.8 - pr, "D2", 40)
        b4.expr([(pr, 0), (pr + 0.4, 64), (end - 2.5, 30), (end - 0.8, 0)])
        for (t, n, v, dur) in [(cr, "G2", 30, 3.0), (cp, "A2", 29, 2.6), (pr, "D2", 36, 5.0),
                               (pr + 0.02, "A2", 32, 5.0), (pr + 0.04, "F#3", 29, 5.0)]:
            p4.note(self.hum(t), dur, n, self.vel(v))
        self.sub.append((cr, cp, "Gadd9", -5.0))
        self.sub.append((cp, pr, "Asus4", -5.0))
        self.sub.append((pr, end - 1.0, "Dwide", -4.0))
        for key in ("strings-close", "piano-close", "pad-close", "bass-close"):
            self.auto[key] = [(0, 1.0), (end - 1.2, 1.0), (end - 0.15, 0.0)]


# ---------------------------------------------------------------- synth layers

def _sub_layer(arr: Arrangement, n: int) -> np.ndarray:
    """Sine sub on each chord root, kept between 45 and 90 Hz, glided."""
    y = np.zeros(n)
    for (t0, t1, chn, lvl) in arr.sub:
        root = ROOT.get(chn, "D2")
        f = hz(m(root))
        while f < 45:
            f *= 2
        while f >= 90:
            f /= 2
        a, b = ns(t0), min(ns(t1 + 0.12), n)
        if b <= a:
            continue
        seg = np.sin(2 * np.pi * f * np.arange(b - a) / SR) * dsp.undb(lvl)
        e = dsp.ar(b - a, 0.09, 0.12)
        y[a:b] += seg * e
    y = dsp.hp(dsp.lp(y, 140, 2), 32, 4)
    return dsp.st(y)


def _pulse_sound(kind: str, seed: int) -> np.ndarray:
    r = rng(seed, "pulse", kind)
    if kind == "pump":
        return library.pump_thud(seed)
    if kind == "relay":
        return library.relay_click(seed) * 0.8
    if kind == "conveyor":
        n = ns(0.03)
        y = dsp.bp(dsp.white(n, r), 2500, 8000, 2) * dsp.perc(n, 0.001, 0.02)
        y += dsp.modal([r.uniform(1800, 2300)], [0.02], [0.3], 0.03, mallet_ms=0.2)
        return dsp.normalize(dsp.st(dsp.lp(y, 9000, 2)), -1)
    if kind == "breath":
        n = ns(0.28)
        y = dsp.band_sweep(n, r, [900, 1800, 1300], [0.9, 0.7, 0.9]) * dsp.ar(n, 0.02, 0.24)
        return dsp.normalize(dsp.spread(y, r, 0.4), -1)
    if kind == "tick":  # precise wood-click
        y = dsp.mix(library.tuned("wood", library.NOTE[["D6", "A6", "E6", "A6"][seed % 4]], r, 0.12) * 0.7,
                    dsp.click(r, 2500, 8000, 0.002, 0.0004) * 0.35)
        return dsp.normalize(dsp.st(dsp.hp(y, 200, 2)), -1)
    if kind == "soft":  # a soft, low pulse: felt on a drum skin, not a kick
        y = dsp.mix(dsp.thump(92, 58, 0.22, 0.4) * 0.9,
                    dsp.lp(dsp.white(ns(0.03), r), 400, 2) * dsp.perc(ns(0.03), 0.002, 0.03) * 0.2)
        y = dsp.hp(dsp.lp(y, 700, 2), 38, 4)
        return dsp.normalize(dsp.st(y), -1)
    raise ValueError(kind)


PULSE_LEVEL = {"pump": -8.0, "relay": -6.0, "conveyor": -8.0, "breath": -10.0, "tick": -6.0, "soft": -4.0}


def _pulse_layer(arr: Arrangement, n: int) -> np.ndarray:
    buf = np.zeros((n, 2))
    cache = {}
    for (t, kind, g, pan_, seed) in arr.pulse:
        key = (kind, seed % 6)
        if key not in cache:
            cache[key] = _pulse_sound(kind, seed % 6)
        dsp_place(buf, cache[key], t, PULSE_LEVEL[kind] + g, pan_)
    return buf


def dsp_place(buf, snd, t, gain_db=0.0, pan_=0.0):
    """Add a sound into a stereo buffer at time t (click-safe at the edges)."""
    s = dsp.balance(dsp.st(snd), pan_) if pan_ else dsp.st(snd)
    s = s * dsp.undb(gain_db)
    i = ns(t)
    if i < 0:
        s = dsp.fade(s[-i:], 0.002, 0.0)
        i = 0
    if i >= len(buf):
        return
    k = min(len(s), len(buf) - i)
    if k < len(s):
        s = dsp.fade(s[:k], 0.0, 0.005)
    buf[i:i + k] += s[:k]


def _felt(piano: np.ndarray, part: Part, n: int) -> np.ndarray:
    """Felt piano: darker, closer, with the soft thock of felt hammers."""
    y = dsp.lp(piano, 2900, 2)
    y = dsp.eq(y, "lowshelf", 260, 1.5, 0.7)
    r = rng(5, "thock", part.name)
    th = np.zeros(n)
    for (on, off, p, v) in part.notes:
        k = ns(0.035)
        a = ns(on)
        if a + k >= n:
            continue
        g = (v / 127.0) ** 1.5 * 0.06
        th[a:a + k] += dsp.lp(dsp.white(k, r), 520, 2) * dsp.perc(k, 0.001, 0.03) * g
    return y + dsp.st(th)


FX = {  # per instrument: high-pass, low-pass, reverb kind, wet
    "piano": (45, 12000, "plate", 0.28),
    "strings": (60, 7500, "hall", 0.32),
    "pad": (50, 3200, "plate", 0.22),
    "cello": (38, 5000, "hall", 0.26),
    "bass": (32, 3000, "hall", 0.2),
}


def render(C, report: dict | None = None) -> dict:
    """Render every music layer to stereo arrays of the film's length."""
    arr = Arrangement(C)
    n = ns(C.duration)
    layers = {}
    irs = {}
    for key, part in arr.parts.items():
        if not part.notes:
            continue
        y = midi.render(part.program, part.notes, part.ccs, length_s=C.duration + 6.0, gain=0.6)
        if part.inst == "piano":
            y = _felt(y, part, len(y))
        hp_, lp_, rv, wet = FX[part.inst]
        y = dsp.lp(dsp.hp(y, hp_, 2), lp_, 2)
        if rv not in irs:
            irs[rv] = dsp.make_ir(rv, 71)
        w = dsp.convolve(dsp.lp(dsp.hp(y, 150, 2), 9000, 2), irs[rv])[: len(y)]
        y = y + w * wet
        y = y[:n] if len(y) >= n else dsp.pad_to(y, n)
        if key in arr.auto:
            y = y * dsp.curve(arr.auto[key], n, "cos")[:, None]
        layers[key] = y
    layers["sub"] = _sub_layer(arr, n)
    layers["pulse"] = _pulse_layer(arr, n)

    # calibrate each instrument family to its target loudness (deterministic)
    fam = {}
    for key, y in layers.items():
        fam.setdefault(key.split("-")[0], []).append(key)
    gains = {}
    for f, keys in fam.items():
        tot = sum(layers[k] for k in keys)
        L = dsp.lufs(tot)
        g = TARGET_LUFS.get(f, -36.0) - L if L > -100 else 0.0
        gains[f] = round(g, 2)
        for k in keys:
            layers[k] = layers[k] * dsp.undb(g)
    if report is not None:
        report["score"] = {
            "bpm": BPM, "grid_anchors": {k: round(v, 3) for k, v in arr.grid_anchors.items()},
            "parts": {k: len(p.notes) for k, p in arr.parts.items()},
            "pulse_events": len(arr.pulse), "family_gain_db": gains,
        }
    return layers, arr
