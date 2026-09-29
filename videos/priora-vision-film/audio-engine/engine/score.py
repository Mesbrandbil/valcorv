"""The score: restrained, modern, consonant, on the film's 92 BPM grid.

One key family (D major and its relative B minor), slow harmonic rhythm, a
felt piano, slow strings, a warm pad, low strings and a sine sub, rendered
through fluidsynth from generated MIDI, plus a pulse built from operational
sounds (pump strokes, relays, conveyor ticks, valve breaths, a precise wood
tick, a soft felt pulse) synthesised here.

The grid is the edit's: 92 BPM from film time 0 (narration/timing.json
"grid"; beat 0.652 s, bar 2.609 s). Every note and every pulse event starts on
a grid point (bar, beat, half beat or sixteenth); nothing is humanised in
time. Sections change on the bar line nearest the story turn that starts
them, read from the cue sheet, never from fixed seconds; where the nearest bar
would sound before a protected silence has ended, the next bar is taken.

  A   bar near l01 to bar near noOne      sparse: D drone, Dsus2 strings, a felt
                                          piano motif one note per shot; a gentle
                                          operational pulse from the bar near
                                          "contractors" (dimmed under the paper)
  B   bar near noOne to offline           builds under S6: pump, relays, conveyor,
                                          a two-note piano figure; a high B enters
                                          on the bar near "Then"
  C   offline to the bar after L08        subtraction on the word: everything goes
                                          except the one high B, which thins away;
                                          near silence to "afterwards"
  D   bar after "afterwards" to rewind    low tension: contrabass, cello, low
                                          strings, single low piano notes, a faint
                                          felt heartbeat on the bar
  (the rewind is built by rewind.py from this material, reversed; the landing
  is silent)
  E   bar near L12 (after the landing)    clarity: a clean fifth, one piano note
  E2  bar after riskChanged               the quantised pulse enters alone
  F   bar near connects to offline2       8th-note felt ostinato, chord per bar;
                                          accents on "Prevention" and "Proof"
  G   offline2, sees, bar near cross      steps down, then near silence and one
                                          low D through the crossing
  H   bar after riskOwner to ordinary     momentum under the three choices
  I   bar near ordinary to closeIn        a swell under S20's pull back
  J   bar near closeIn to the end         the chain: G, G add9, Em7, A sus4,
                                          resolving to D add9 (wide) on the bar
                                          after "capacity" under the full-chain
                                          hold; nothing new at the wordmark (the
                                          latch stays clean); a long natural decay

Holds (`hold` events, docs/sound-events.md) thin the score over their span:
the pulse and the moving piano stop, the sustained layers are drawn down by
the hold's gain (default -8 dB) and come back over one beat. The designed
silences and tones of the protected moments (the held B, the aftermath, the
crossing tone, the close) are exempt: they already are the moment's weight.
"""
from __future__ import annotations

import math

import numpy as np

from . import dsp, library, midi
from .dsp import SR, ns, rng

GM = {"piano": 0, "strings": 49, "pad": 89, "cello": 42, "bass": 43}

# loudness each layer is calibrated to (integrated, gated) before the mix
TARGET_LUFS = {
    "piano": -26.5, "strings": -27.5, "pad": -35.0, "cello": -34.0, "bass": -38.0,
    "sub": -47.0, "pulse": -30.0,
}

HOLD_DEFAULT_DB = -8.0   # sustained layers under a hold
HOLD_DEEP_DB = -6.0      # a hold at or below this stops the pulse and the moving piano


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
    "D/F#": ["F#2", "D3", "A3", "F#4"],
    "Bm7": ["B2", "F#3", "A3", "D4"],
    "Gmaj7": ["G2", "D3", "B3", "F#4"],
    "G": ["G2", "D3", "B3", "G4"],
    "Gadd9": ["G2", "D3", "A3", "B3"],
    "Em7": ["E3", "B3", "D4", "G4"],
    "Asus4": ["A2", "E3", "D4"],
    "A": ["A2", "E3", "C#4"],
    "A/C#": ["C#3", "A3", "E4"],
    "Bm": ["B2", "F#3", "D4"],
    "Dwide": ["D2", "A2", "F#3", "E4", "A4"],
    "fifth": ["A3", "E4"],
}
ROOT = {"Dsus2": "D2", "Dadd9": "D2", "D": "D2", "D/F#": "F#1", "Bm7": "B1", "Gmaj7": "G1", "G": "G1",
        "Gadd9": "G1", "Em7": "E1", "Asus4": "A1", "A": "A1", "A/C#": "C#2", "Bm": "B1", "Dwide": "D2"}
OSTINATO = {  # 8 eighths per bar over the chord
    "Dadd9": ["D4", "A4", "E5", "A4", "D5", "A4", "E5", "A4"],
    "A/C#": ["C#4", "A4", "E5", "A4", "C#5", "A4", "E5", "A4"],
    "Bm7": ["B3", "F#4", "D5", "F#4", "A4", "F#4", "D5", "F#4"],
    "Gmaj7": ["G3", "D4", "B4", "D4", "F#4", "D4", "B4", "D4"],
    "Bm": ["B3", "F#4", "D5", "F#4", "B4", "F#4", "D5", "F#4"],
    "D": ["D4", "A4", "D5", "A4", "F#4", "A4", "D5", "A4"],
    "D/F#": ["F#3", "A3", "D4", "A3", "F#4", "A3", "D4", "A3"],
    "A": ["A3", "E4", "C#5", "E4", "A4", "E4", "C#5", "E4"],
    "G": ["G3", "D4", "B4", "D4", "G4", "D4", "B4", "D4"],
    "Em7": ["E3", "B3", "G4", "B3", "D4", "B3", "G4", "B3"],
}
OST_VEL = [36, 23, 29, 23, 32, 23, 29, 23]


def root2(chn: str) -> str:
    """The chord's root in the cello's octave (C# a third higher)."""
    r = ROOT.get(chn, "D2")
    return r[:-1] + ("3" if r.startswith("C#") else "2")


class Grid:
    """The film's musical grid: four-beat bars from film time `offset`."""

    def __init__(self, bpm: float = 92.0, offset: float = 0.0):
        self.bpm = float(bpm)
        self.offset = float(offset)
        self.beat = 60.0 / self.bpm
        self.half = self.beat / 2
        self.six = self.beat / 4
        self.bar = 4 * self.beat

    def q(self, t: float, unit: float | None = None) -> float:
        """Nearest grid point of `unit` (default a beat); a tie rounds up."""
        u = unit or self.beat
        return self.offset + math.floor((t - self.offset) / u + 0.5 + 1e-9) * u

    def ceil(self, t: float, unit: float | None = None) -> float:
        u = unit or self.beat
        return self.offset + math.ceil((t - self.offset) / u - 1e-9) * u

    def bar_near(self, t: float, not_before: float | None = None, not_after: float | None = None) -> float:
        """The bar line nearest t, moved a bar later while it is before
        `not_before` (a silence that must finish first) or earlier while it is
        after `not_after`."""
        b = self.q(t, self.bar)
        if not_before is not None:
            while b < not_before - 1e-6:
                b += self.bar
        if not_after is not None:
            while b > not_after + 1e-6:
                b -= self.bar
        return b

    def bars(self, a: float, b: float) -> list:
        out, t = [], a
        while t < b - 1e-6:
            out.append(t)
            t += self.bar
        return out

    def label(self, t: float) -> str:
        """'bar.beat' with beat 1-based (a half beat shows as .5); a time within
        5 ms of a half beat (cue times are rounded to the millisecond) is read
        as that half beat."""
        h = self.q(t, self.half)
        t = h if abs(t - h) <= 0.005 else t
        beats = round((t - self.offset) / self.beat, 3)
        bar = math.floor(beats / 4 + 1e-9)
        return f"{bar}.{beats - 4 * bar + 1:g}"

    def level(self, t: float, tol: float = 0.0015) -> str:
        """The coarsest grid unit t sits on: bar, beat, half, sixteenth or off."""
        for name, u in (("bar", self.bar), ("beat", self.beat), ("half", self.half), ("sixteenth", self.six)):
            if abs(t - self.q(t, u)) <= tol:
                return name
        return "off"


class Part:
    def __init__(self, inst: str, name: str):
        self.inst, self.name = inst, name
        self.program = GM[inst]
        self.notes, self.ccs = [], []

    def note(self, t, dur, pitch, vel):
        p = m(pitch) if isinstance(pitch, str) else int(pitch)
        self.notes.append((max(t, 0.0), max(t, 0.0) + max(dur, 0.02), p, int(vel)))

    def chord(self, t, t_end, names, vel):
        for n in (CH[names] if isinstance(names, str) else names):
            self.note(t, t_end - t, n, vel)

    def expr(self, points, step=0.05):
        """CC11 expression breakpoints [(t, value 0..127)], linearly stepped."""
        pts = sorted(points)
        for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
            k = max(int((t1 - t0) / step), 1)
            for i in range(k):
                self.ccs.append((t0 + i * (t1 - t0) / k, 11, round(v0 + (v1 - v0) * i / k)))
        self.ccs.append((pts[-1][0], 11, pts[-1][1]))


def cue_grid(C) -> Grid:
    g = getattr(C, "grid", None) or {}
    return Grid(g.get("bpm", 92.0), g.get("offset", 0.0))


class Arrangement:
    """All notes, synth events and gain automation, computed from cues."""

    def __init__(self, C, holds=None):
        self.C = C
        self.g = cue_grid(C)
        self.holds = [h for h in (holds or []) if float(h.get("dur", 0) or 0) > 0]
        self.parts: dict[str, Part] = {}
        self.pulse = []      # (t, kind, gain_db, pan, seed, exempt)
        self.sub = []        # (t0, t1, chord, level dB, release, exempt)
        self.auto = {}       # part name -> [(t, gain 0..1)] cos-interpolated
        self.exempt: set[str] = set()
        self.sections = []
        self.removed = {"piano_notes": 0, "pulse_events": 0}
        self.r = rng(7, "arrangement")
        self._build()
        self._apply_holds()

    # ------------------------------------------------------------------ helpers
    def part(self, inst, act, exempt=False):
        key = f"{inst}-{act}"
        if key not in self.parts:
            self.parts[key] = Part(inst, key)
        if exempt:
            self.exempt.add(key)
        return self.parts[key]

    def vel(self, v, amount=3):
        return int(np.clip(v + self.r.integers(-amount, amount + 1), 1, 127))

    def mark(self, name, t, cue, what):
        c = self.C[cue]
        self.sections.append({"section": name, "t": round(t, 3), "bar": self.g.label(t), "cue": cue,
                              "cue_t": round(c, 3), "from_cue_beats": round((t - c) / self.g.beat, 2),
                              "what": what})

    def beat_pulse(self, t, kind, gain, pan, seed, until=None, exempt=False):
        if until is not None and t >= until - 0.02:
            return
        self.pulse.append((t, kind, gain, pan, seed, exempt))

    def progression(self, part, items, t_end, vel):
        """Chords [(t, name or notes)], each held to the next change (legato by
        one sixteenth). Two changes on one bar: the later one in the list wins."""
        byt = {}
        for t, n in items:
            if t < t_end - 1e-6:
                byt[round(t, 6)] = (t, n)
        seq = [byt[k] for k in sorted(byt)]
        for i, (t, n) in enumerate(seq):
            t1 = seq[i + 1][0] + self.g.six if i + 1 < len(seq) else t_end
            part.chord(t, min(t1, t_end), n, vel)
        return seq

    # ------------------------------------------------------------------ build
    def _build(self):
        C, g = self.C, self.g
        B, H, S, BAR = g.beat, g.half, g.six, g.bar
        Q = g.q
        end = C.duration
        rs, re_ = C["rewindStart"], C["rewindEnd"]
        off = C["offline"]

        # ---------------- section starts: the bar lines nearest the story turns
        bA1 = g.bar_near(C["l01"])
        bPulse = max(g.bar_near(C["contractors"]), bA1)
        bB = max(g.bar_near(C["noOne"]), bPulse)
        bTone = max(g.bar_near(C["then"], not_after=off - B), bB)
        bD = g.bar_near(C["afterwards"], not_before=C["afterwards"])
        bToneEnd = min(g.bar_near(C["nobodyEnd"], not_before=C["nobodyEnd"]), bD)
        bE = g.bar_near(C["l12"], not_before=re_ + H)
        bPulse2 = max(g.bar_near(C["riskChanged"], not_before=C["riskChanged"]), bE)
        bF = max(g.bar_near(C["connects"]), bPulse2)
        tStep = max(Q(C["offline2"]), bF)
        tSees = max(Q(C["sees"]), tStep)
        bG = g.bar_near(C["cross"])
        if bG <= tSees + 1e-6:
            bG = tSees + 2 * B
        bH = max(g.bar_near(C["riskOwner"], not_before=C["riskOwner"]), bG + B)
        bI = g.bar_near(C["ordinary"], not_before=bH + BAR)
        tPeak = max(Q(C["closeIn"]), bI + B)
        bJ = max(g.bar_near(C["closeIn"]), bI + BAR)
        bRec = max(g.bar_near(C["chainRecord"]), bJ)
        bDec = max(g.bar_near(C["chainDecision"]), bRec)
        bPri = max(g.bar_near(C["chainPrice"]), bDec)
        bRes = g.bar_near(C["chainCapacity"], not_before=C["chainCapacity"])
        if bRes > C["priora"] - B:
            bRes = g.ceil(C["chainCapacity"], B)
        bRes = max(bRes, bPri)
        tPri = Q(C["priora"])
        self.marks = dict(bA1=bA1, bPulse=bPulse, bB=bB, bTone=bTone, bToneEnd=bToneEnd, bD=bD, bE=bE,
                          bPulse2=bPulse2, bF=bF, tStep=tStep, tSees=tSees, bG=bG, bH=bH, bI=bI, tPeak=tPeak,
                          bJ=bJ, bRec=bRec, bDec=bDec, bPri=bPri, bRes=bRes)
        self.mark("A strings enter", bA1, "l01", "Dsus2, D drone, felt piano motif")
        self.mark("A pulse", bPulse, "contractors", "gentle operational pulse")
        self.mark("B build", bB, "noOne", "the rhythmic system builds under S6")
        self.mark("B high B", bTone, "then", "the tone that will remain")
        self.mark("C subtraction", off, "offline", "on the word: all but the high B removed")
        self.mark("C tone out", bToneEnd, "nobodyEnd", "the high B has thinned away")
        self.mark("D aftermath", bD, "afterwards", "low tension")
        self.mark("E clarity", bE, "l12", "a clean fifth and one piano note")
        self.mark("E pulse", bPulse2, "riskChanged", "the quantised pulse enters after the resolve")
        self.mark("F ostinato", bF, "connects", "clarity: felt ostinato, chord per bar")
        self.mark("G step down", tStep, "offline2", "piano and cello step out")
        self.mark("G near silence", bG, "cross", "one low D through the crossing")
        self.mark("H momentum", bH, "riskOwner", "the three choices")
        self.mark("I swell", bI, "ordinary", "swell under the pull back")
        self.mark("I peak", tPeak, "closeIn", "the swell's crest")
        self.mark("J close", bJ, "closeIn", "the chain harmony")
        self.mark("J record", bRec, "chainRecord", "G add9")
        self.mark("J decision", bDec, "chainDecision", "Em7")
        self.mark("J price", bPri, "chainPrice", "A sus4")
        self.mark("J resolution", bRes, "chainCapacity", "D add9 wide under the full-chain hold")

        # ================= A: sparse, operational, a gentle pulse
        s1, p1, d1, c1 = (self.part("strings", "a1"), self.part("piano", "a1"), self.part("pad", "a1"),
                          self.part("cello", "a1"))
        a1_end = g.ceil(off + 0.4, S)
        d1.note(0.0, a1_end, "D2", 50)
        d1.note(0.0, a1_end, "A2", 50)
        d1.expr([(0.0, 0), (2 * B, 0), (bA1, 16), (bA1 + 2 * BAR, 62), (bB, 82), (off, 94)])
        seqA = [(bA1, "Dsus2"), (g.bar_near(C["insurance"]), "Bm7"), (g.bar_near(C["accepted"]), "Gmaj7"),
                (g.bar_near(C["checklists"]), "Asus4")]
        barsB = g.bars(bB, off)
        seqB = ["D", "D", "Gmaj7", "Gmaj7"]
        chB = [(t, seqB[i % len(seqB)]) for i, t in enumerate(barsB)]
        self.progression(s1, [x for x in seqA if bA1 <= x[0] < bB] + chB, a1_end, 46)
        c1.expr([(0.0, 90)])
        s1.expr([(0.0, 16), (bA1, 26), (bA1 + 1.5 * BAR, 62), (seqA[1][0], 72), (seqA[3][0], 70), (bB, 76),
                 (off - 0.05, 80)])
        # one felt piano note per shot, on the beat nearest its word
        motif = [("hour", "A4", 34, 2.2), ("contractors", "F#4", 29, 1.6), ("equipment", "E4", 29, 1.6),
                 ("workMoves", "D4", 31, 2.6), ("workMoves", "A3", 25, 2.6), ("accepted", "D5", 31, 1.8),
                 ("accepted", "B3", 24, 1.8), ("permits", "C#5", 27, 1.4), ("checklists", "A4", 27, 1.6)]
        used = {}
        for cue, n, v, dur in motif:
            t = Q(C[cue])
            while used.get(round(t, 4), cue) != cue:  # two words on one beat: the later takes the next beat
                t += B
            used[round(t, 4)] = cue
            if t < bB:
                p1.note(t, dur, n, self.vel(v))
        # the gentle pulse: a distant pump on the bar, a relay on beat 3; from
        # "Work moves" a late relay and a valve breath; the site recedes under the paper
        paper = C.get("paperIn") or C["accepted"]
        bWork = g.bar_near(C["workMoves"])
        for i, t in enumerate(g.bars(bPulse, bB)):
            dim = -4.0 if t >= paper - 1e-6 else 0.0
            self.beat_pulse(t, "pump", -15.0 + dim, 0.0, 11)
            self.beat_pulse(t + 2 * B, "relay", -17.0 + dim, 0.3, 21, until=bB)
            if t >= bWork - 1e-6:
                self.beat_pulse(t + 3.5 * B, "relay", -21.0 + dim, -0.3, 22, until=bB)
                if i % 2 == 1:
                    self.beat_pulse(t + 1.5 * B, "breath", -20.0 + dim, -0.2, 40, until=bB)

        # ================= B: the rhythmic system builds (S6), then Roof 03
        for i, bt in enumerate(barsB):
            chn = chB[i][1]
            c1.note(bt, min(BAR + S, a1_end - bt), root2(chn), 42)
            self.sub.append((bt, min(bt + BAR, off), chn, -2.0, 0.12, False))
            if i >= 1:  # quarter-note two-note figure, rising softly
                fig = {"D": ["A4", "D5"], "Gmaj7": ["B4", "D5"]}[chn]
                for b in range(4):
                    t = bt + b * B
                    if t < off - 0.05:
                        p1.note(t, B * 0.9, fig[b % 2], self.vel(24 + 3 * min(i, 3) + (4 if b == 0 else 0)))
            ramp = min(i / 2.0, 1.0)
            for b in (0, 2):  # pump strokes on 1 and 3
                self.beat_pulse(bt + b * B, "pump", -9.0 + 6.0 * ramp, 0.0, 11 + b, until=off)
            for b in range(4):  # relay ticks on the off-beat eighths
                self.beat_pulse(bt + (b + 0.5) * B, "relay", -16.0 + 2.0 * ramp, 0.35 if b % 2 else -0.35, 20 + b,
                                until=off)
            if i >= 1:  # conveyor sixteenths and a valve breath every other bar
                for s_ in range(16):
                    self.beat_pulse(bt + s_ * S, "conveyor", -17.0 - 2.0 * (i == 1) + [0, -8, -5, -8][s_ % 4], 0.15,
                                    30 + s_ % 4, until=off)
                if i % 2 == 1:
                    self.beat_pulse(bt + 3.5 * B, "breath", -16.0, -0.2, 40, until=off)

        # ================= C: the unnoticed change. Everything goes on the word
        # except one high B, entered earlier inside the texture; it thins away
        hs = self.part("strings", "held", exempt=True)
        hs.note(bTone, bToneEnd - bTone, "B4", 34)
        hs.expr([(0.0, 0), (bTone, 0), (off, 26), (off + 2 * B, 44), (Q(C["changed"]), 40), (Q(C["nobody"]), 26),
                 (max(bToneEnd - B, Q(C["nobody"]) + S), 6), (bToneEnd, 0)])
        for key, fall in (("strings-a1", 0.35), ("piano-a1", 0.12), ("pad-a1", 0.35), ("cello-a1", 0.3)):
            self.auto[key] = [(0, 1.0), (off - 0.02, 1.0), (off + fall, 0.0)]
        self.auto["strings-held"] = [(0, 1.0), (rs, 1.0), (rs + 0.32, 0.0)]

        # ================= D: aftermath, a low tension
        bb, cD, sD, pD = (self.part("bass", "aft", True), self.part("cello", "aft", True),
                          self.part("strings", "aft", True), self.part("piano", "aft", True))
        d_end = g.ceil(rs + 0.4, S)
        tQ1 = g.bar_near(C["q1"], not_before=bD)
        bGap = g.bar_near(C["gap"], not_before=tQ1)
        bb.note(bD, d_end - bD, "B1", 40)
        bb.expr([(bD, 0), (bD + 2 * B, 70), (bGap, 64), (rs, 50)])
        cD.note(bD, d_end - bD, "F#2", 36)
        cD.expr([(bD, 0), (bD + 3 * B, 86), (rs, 76)])
        self.progression(sD, [(tQ1, ["F#3", "B3", "D4"]), (bGap, "Gmaj7")], d_end, 36)
        sD.expr([(0.0, 0), (tQ1, 0), (tQ1 + 2 * B, 52), (Q(C["q3"]), 60), (bGap, 58), (rs, 44)])
        for t, n, v, dur in [(bD, "B2", 33, 2.4), (Q(C["q1"]), "F#3", 27, 2.0), (Q(C["q3"]), "D4", 27, 2.0),
                             (Q(C["gap"]), "G2", 35, 3.0), (Q(C["gap"]), "D3", 29, 3.0)]:
            pD.note(t, dur, n, self.vel(v))
        for t in g.bars(tQ1, rs):  # a faint felt heartbeat on the bar
            self.beat_pulse(t, "soft", -18.0, 0.0, 150, until=rs)
        for key in ("bass-aft", "cello-aft", "strings-aft", "piano-aft"):
            self.auto[key] = [(0, 1.0), (rs, 1.0), (rs + 0.32, 0.0)]

        # ================= E: after the landing, clarity
        s2, p2, d2, c2 = (self.part("strings", "a2"), self.part("piano", "a2"), self.part("pad", "a2"),
                          self.part("cello", "a2"))
        d2.note(bE, bG + B - bE, "A3", 46)
        d2.note(bE, bG + B - bE, "E4", 46)
        d2.expr([(bE, 0), (bE + 2 * B, 70), (bF, 84), (tStep, 74), (tSees, 44), (bG, 0)])
        p2.note(bE, 2.4, "D5", self.vel(30))
        for i, t in enumerate(g.bars(bPulse2, bF)):  # the precise wood tick enters alone, on the grid
            for e in range(8):
                self.beat_pulse(t + e * H, "tick", -16.0 if e % 2 == 0 else -22.0, 0.25 if e % 2 else -0.1,
                                70 + e % 4, until=bF)
            if i >= 1:
                self.beat_pulse(t, "soft", -15.0, 0.0, 80, until=bF)

        # ================= F: clarity (ostinato), then G: the step down
        seqF = ["Dadd9", "A/C#", "Bm7", "Gmaj7"]
        chF = [(t, seqF[i % 4]) for i, t in enumerate(g.bars(bF, bG))]
        self.progression(s2, [(bPulse2, "Dsus2")] + chF, bG + S, 44)
        for i, (t, chn) in enumerate(chF):
            if t < tStep - 1e-6:
                c2.note(t, min(BAR, tStep - t) + S, root2(chn), 40)
                self.sub.append((t, min(t + BAR, tStep), chn, -2.0, 0.12, False))
            for e in range(8):
                te = t + e * H
                if te < tStep - 0.03:
                    p2.note(te, B * 0.55, OSTINATO[chn][e], self.vel(OST_VEL[e] + (2 if i >= 2 else 0), 2))
                    self.beat_pulse(te, "tick", -16.0 if e % 2 == 0 else -21.0, 0.25 if e % 2 else -0.1, 70 + e % 4)
                    if e in (0, 4):
                        self.beat_pulse(te, "soft", -12.0, 0.0, 80 + e)
                    if e in (2, 6):
                        self.beat_pulse(te, "relay", -19.0, 0.3, 90 + e)
                elif te < tSees - 0.03:  # stepped down: quarters, one soft pulse a bar
                    if e % 2 == 0:
                        self.beat_pulse(te, "tick", -18.0, -0.1, 70 + e % 4)
                    if e == 0:
                        self.beat_pulse(te, "soft", -15.0, 0.0, 80)
        tPv, tPf = Q(C["prevention"], H), Q(C["proof"], H)
        p2.note(tPv, 3.0, "D2", self.vel(44))
        p2.note(tPv, 3.0, "A2", self.vel(38))
        p2.note(tPf, 3.0, "G2", self.vel(42))
        p2.note(tPf, 3.0, "D3", self.vel(36))
        s2.expr([(0.0, 0), (bPulse2, 0), (bPulse2 + 2 * B, 40), (bF, 64), (tPv - B, 60), (tPv + B, 76),
                 (tPf, 70), (tPf + B, 74), (tStep, 66), (tSees, 40), (bG, 0)])
        self.auto["piano-a2"] = [(0, 1.0), (tStep - 0.02, 1.0), (tStep + 0.25, 0.0)]
        self.auto["cello-a2"] = [(0, 1.0), (tStep - 0.02, 1.0), (tStep + 0.4, 0.0)]
        self.auto["pad-a2"] = [(0, 1.0), (bG, 1.0), (bG + 0.3, 0.0)]
        self.auto["strings-a2"] = [(0, 1.0), (bG, 1.0), (bG + 0.3, 0.0)]

        # the crossing: near silence, one low D
        lo = self.part("cello", "cross", exempt=True)
        lo.note(tSees, bH + S - tSees, "D2", 38)
        lo.expr([(tSees, 0), (tSees + 2 * B, 50), (bG, 64), (Q(C["riskOwner"]), 44), (bH, 0)])
        self.sub.append((tSees, bH, "Dsus2", -7.0, 0.3, True))

        # ================= H: momentum through the three choices
        s3, p3, c3, d3 = (self.part("strings", "a3"), self.part("piano", "a3"), self.part("cello", "a3"),
                          self.part("pad", "a3"))
        seqH = ["Bm", "G", "D", "A"]
        chH = [(t, seqH[i % 4]) for i, t in enumerate(g.bars(bH, bI))]
        d3.note(bH, bI + S - bH, "B2", 44)
        d3.note(bH, bI + S - bH, "F#3", 44)
        d3.expr([(bH, 0), (bH + BAR, 60), (bI, 66)])
        self.progression(s3, chH, bI + S, 42)
        pts = [(bH, 24), (bH + BAR, 58), (bI, 68)]
        if bH + BAR + B < Q(C["carriers"]) < bI - B:
            pts.append((Q(C["carriers"]), 72))
        s3.expr(pts)
        for i, (t, chn) in enumerate(chH):
            c3.note(t, min(BAR, bI - t) + S, root2(chn), 42)
            self.sub.append((t, min(t + BAR, bI), chn, -2.0, 0.12, False))
            for e in range(8):
                te = t + e * H
                if te >= bI - 0.03:
                    break
                grow = -7.0 * (1.0 - min(1.0, (8 * i + e) / 8.0))  # the first bar grows out of the silence
                p3.note(te, B * 0.55, OSTINATO[chn][e], self.vel(OST_VEL[e] + 4 + int(round(grow)), 2))
                self.beat_pulse(te, "tick", -16.0 + grow, 0.25 if e % 2 else -0.1, 100 + e % 4)
                if i >= 1:
                    self.beat_pulse(te + S, "tick", -24.0, -0.1 if e % 2 else 0.25, 102 + e % 2)
                if e in (0, 4):
                    self.beat_pulse(te, "soft", -11.0 + grow, 0.0, 110 + e)
                if e in (2, 6):
                    self.beat_pulse(te, "relay", -18.0 + grow, 0.3, 120 + e)
        self.auto["strings-a3"] = [(0, 1.0), (bI - 0.05, 1.0), (bI + 0.6, 0.0)]
        self.auto["cello-a3"] = [(0, 1.0), (bI - 0.05, 1.0), (bI + 0.4, 0.0)]
        self.auto["pad-a3"] = [(0, 1.0), (bI - 0.05, 1.0), (bI + 0.6, 0.0)]
        self.auto["piano-a3"] = [(0, 1.0), (bJ - 0.05, 1.0), (bJ + 0.5, 0.0)]

        # ================= I: the swell under the pull back, then J: the chain
        s4, d4, c4, b4, p4 = (self.part("strings", "close", True), self.part("pad", "close", True),
                              self.part("cello", "close", True), self.part("bass", "close", True),
                              self.part("piano", "close", True))
        seqI = ["D/F#", "Em7"]
        chI = [(t, seqI[i % 2]) for i, t in enumerate(g.bars(bI, bJ))]
        for i, (t, chn) in enumerate(chI):  # the pulse thins to quarters and falls away
            u = i / max(len(chI), 1)
            for e in range(0, 8, 2):
                te = t + e * H
                p3.note(te, B * 0.9, OSTINATO[chn][e], self.vel(OST_VEL[e] - 3, 2))
                self.beat_pulse(te, "tick", -18.0 - 5.0 * u - 1.0 * e / 2, -0.1, 130 + e % 4, until=bJ)
            self.beat_pulse(t, "soft", -14.0 - 4.0 * u, 0.0, 140, until=bJ)
        chJ = chI + [(bJ, "Gmaj7"), (bRec, "Gadd9"), (bDec, "Em7"), (bPri, "Asus4"), (bRes, "Dwide")]
        close_end = end - 1.0
        seqJ = self.progression(s4, chJ, close_end, 42)
        for i, (t, chn) in enumerate(seqJ):  # cello roots under the swell and the arrival, not the chain
            if t >= bRec - 1e-6:
                break
            t1 = seqJ[i + 1][0] if i + 1 < len(seqJ) else bRec
            c4.note(t, min(t1, bRec) - t + S, root2(chn), 40)
        d4.note(bI, close_end - bI, "A2", 44)
        d4.note(bI, close_end - bI, "D3", 44)
        d4.expr([(bI, 0), (tPeak, 70), (bRec, 50), (bRes, 56), (tPri + 2 * B, 54), (end - 3.0, 24),
                 (end - 1.2, 0)])
        c4.expr([(bI, 0), (bI + B, 44), (tPeak, 84), (bRec, 40)])
        b4.note(bRes, close_end - bRes, "D2", 40)
        b4.expr([(bRes, 0), (bRes + 2 * B, 52), (tPri, 50), (end - 2.5, 26), (end - 1.2, 0)])
        for t, n, v, dur in [(bRec, "G2", 30, 3.0), (bDec, "E2", 29, 3.0), (bPri, "A2", 29, 2.6),
                             (bRes, "D2", 36, close_end - bRes), (bRes, "A2", 32, close_end - bRes),
                             (bRes, "F#3", 29, close_end - bRes), (bRes, "E4", 23, close_end - bRes)]:
            p4.note(t, dur, n, self.vel(v))
        s4.expr([(bI, 34), (bI + B, 46), (tPeak, 96), (tPeak + 2 * B, 72), (bRec, 58), (bDec, 60), (bPri, 62),
                 (bRes, 60), (bRes + 2 * B, 58), (tPri, 56), (tPri + 2 * B, 52), (end - 3.0, 20), (end - 1.2, 0)])
        for t0, t1, chn, lvl in [(bJ, bRec, "Gmaj7", -5.0), (bRec, bDec, "Gadd9", -5.0), (bDec, bPri, "Em7", -6.0),
                                 (bPri, bRes, "Asus4", -5.0)]:
            if t1 > t0:
                self.sub.append((t0, t1, chn, lvl, 0.12, True))
        for t, chn in chI:
            self.sub.append((t, min(t + BAR, bJ), chn, -3.0, 0.12, True))
        self.sub.append((bRes, end - 3.2, "Dwide", -6.0, 2.8, True))
        for key in ("strings-close", "piano-close", "pad-close", "bass-close", "cello-close"):
            self.auto[key] = [(0, 1.0), (end - 1.2, 1.0), (end - 0.15, 0.0)]

    # ------------------------------------------------------------------ holds
    def in_deep_hold(self, t: float) -> bool:
        return any(h["t"] - 0.01 <= t < h["t"] + h["dur"] - 0.01 for h in self.holds if h["gain_db"] <= HOLD_DEEP_DB)

    def _apply_holds(self):
        """Inside a deep hold nothing new starts in the moving layers: the pulse
        events and the non-exempt piano notes are removed (their tails ring)."""
        if not self.holds:
            return
        for key, p in self.parts.items():
            if key in self.exempt or p.inst != "piano":
                continue
            keep = [nn for nn in p.notes if not self.in_deep_hold(nn[0])]
            self.removed["piano_notes"] += len(p.notes) - len(keep)
            p.notes = keep
        keep = [e for e in self.pulse if e[5] or not self.in_deep_hold(e[0])]
        self.removed["pulse_events"] += len(self.pulse) - len(keep)
        self.pulse = keep

    def hold_db(self, times, scale=1.0):
        return hold_curve_db(self.holds, times, self.g.beat, scale)

    # ------------------------------------------------------------------ report
    def onsets(self):
        """Every scheduled musical onset: (t, layer)."""
        out = [(nn[0], k) for k, p in self.parts.items() for nn in p.notes]
        out += [(e[0], "pulse-" + e[1]) for e in self.pulse]
        return sorted(out)

    def grid_check(self):
        levels = {}
        worst = 0.0
        for t, _ in self.onsets():
            lv = self.g.level(t)
            levels[lv] = levels.get(lv, 0) + 1
            worst = max(worst, abs(t - self.g.q(t, self.g.six)))
        return {"onsets": sum(levels.values()), "by_grid_unit": levels,
                "max_offset_from_sixteenth_ms": round(worst * 1000, 3)}


def hold_curve_db(holds, times, beat, scale=1.0):
    """Gain in dB at `times` for a set of holds: drawn down from the hold's
    start over a quarter of a second (or a third of a short hold), held, and
    restored over one beat after its end. Overlapping holds take the deeper."""
    times = np.asarray(times, float)
    y = np.zeros_like(times)
    for h in holds or []:
        t0, d = float(h["t"]), float(h["dur"])
        gd = float(h.get("gain_db", HOLD_DEFAULT_DB)) * scale
        a = max(min(0.25, d / 3.0), 0.02)
        u_in = np.clip((times - t0) / a, 0, 1)
        u_out = np.clip((times - (t0 + d)) / beat, 0, 1)
        w = (0.5 - 0.5 * np.cos(np.pi * u_in)) * (0.5 + 0.5 * np.cos(np.pi * u_out))
        y = np.minimum(y, gd * w)
    return y


def hold_gain(holds, n, beat, scale=1.0):
    """Linear per-sample gain (length n) for hold_curve_db, via a 2 kHz control rate."""
    k = int(n / SR * 2000) + 2
    tc = np.arange(k) / 2000.0
    g = dsp.undb(hold_curve_db(holds, tc, beat, scale))
    return np.interp(dsp.tvec(n), tc, g)


# ---------------------------------------------------------------- synth layers

def _sub_layer(arr: Arrangement, n: int, exempt: bool) -> np.ndarray:
    """Sine sub on each chord root, kept between 45 and 90 Hz."""
    y = np.zeros(n)
    for (t0, t1, chn, lvl, rel, ex) in arr.sub:
        if ex != exempt:
            continue
        f = hz(m(ROOT.get(chn, "D2")))
        while f < 45:
            f *= 2
        while f >= 90:
            f /= 2
        a, b = ns(t0), min(ns(t1 + rel), n)
        if b <= a:
            continue
        seg = np.sin(2 * np.pi * f * np.arange(b - a) / SR) * dsp.undb(lvl)
        y[a:b] += seg * dsp.ar(b - a, 0.09, rel)
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


PULSE_LEVEL = {"pump": -9.0, "relay": -6.0, "conveyor": -8.0, "breath": -10.0, "tick": -6.0, "soft": -7.0}


def _pulse_layer(arr: Arrangement, n: int) -> np.ndarray:
    buf = np.zeros((n, 2))
    cache = {}
    times = np.array([e[0] for e in arr.pulse]) if arr.pulse else np.zeros(0)
    hdb = arr.hold_db(times) if len(times) else times
    for k, (t, kind, g, pan_, seed, ex) in enumerate(arr.pulse):
        key = (kind, seed % 6)
        if key not in cache:
            cache[key] = _pulse_sound(kind, seed % 6)
        extra = 0.0 if ex else float(hdb[k])
        dsp_place(buf, cache[key], t, PULSE_LEVEL[kind] + g + extra, pan_)
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


def _felt(piano: np.ndarray, part: Part, offset: float = 0.0) -> np.ndarray:
    """Felt piano: darker, closer, with the soft thock of felt hammers."""
    n = len(piano)
    y = dsp.lp(piano, 2900, 2)
    y = dsp.eq(y, "lowshelf", 260, 1.5, 0.7)
    r = rng(5, "thock", part.name)
    th = np.zeros(n)
    k = ns(0.035)
    for (on, off, p, v) in part.notes:
        a = ns(on - offset)
        if a < 0 or a + k >= n:
            continue
        g = (v / 127.0) ** 1.5 * 0.06
        th[a:a + k] += dsp.lp(dsp.white(k, r), 520, 2) * dsp.perc(k, 0.001, 0.03) * g
    return y + dsp.st(th)


FX = {  # per instrument: high-pass, low-pass, reverb bus, send level
    "piano": (45, 12000, "plate", 0.28),
    "strings": (60, 7500, "hall", 0.32),
    "pad": (50, 3200, "plate", 0.22),
    "cello": (38, 5000, "hall", 0.26),
    "bass": (35, 3000, "hall", 0.2),
}
TAIL = 4.0  # seconds of release and room processed after a part's last note


def render(C, report: dict | None = None, holds=None):
    """Render every music layer to stereo arrays of the film's length.

    Returns ({family: stereo array}, arrangement). Families: piano, strings,
    pad, cello, bass (fluidsynth), sub, pulse (synthesised), verb-plate and
    verb-hall (the two shared reverb returns). Each part is processed only
    over its active span; automation (and the holds' dips) is applied to the
    dry signal, so reverb tails ring out naturally after a subtraction or
    into a hold. The reverb returns are muted through the rewind (the rewind
    has its own space).
    """
    arr = Arrangement(C, holds)
    n = ns(C.duration)
    hg = hold_gain(arr.holds, n, arr.g.beat) if arr.holds else None
    fam: dict[str, np.ndarray] = {}
    for key, part in arr.parts.items():
        if not part.notes:
            continue
        y = midi.render(part.program, part.notes, part.ccs, length_s=C.duration + 6.0, gain=0.6)
        t_a = max(min(nn[0] for nn in part.notes) - 0.05, 0.0)
        t_b = min(max(nn[1] for nn in part.notes) + TAIL, C.duration)
        a, b = ns(t_a), ns(t_b)
        if b <= a:
            continue
        seg = y[a:b]
        if part.inst == "piano":
            seg = _felt(seg, part, t_a)
        hp_, lp_, _, _ = FX[part.inst]
        seg = dsp.lp(dsp.hp(seg, hp_, 2), lp_, 2)
        if key in arr.auto:
            pts = [(t - t_a, v) for (t, v) in arr.auto[key]]
            seg = seg * dsp.curve(pts, len(seg), "cos")[:, None]
        if hg is not None and key not in arr.exempt:
            seg = seg * hg[a:a + len(seg), None]
        seg = dsp.fade(seg, 0.0, 0.05)
        buf = fam.setdefault(part.inst, np.zeros((n, 2)))
        buf[a:a + len(seg)] += seg[: n - a]
    sub = _sub_layer(arr, n, False)
    if hg is not None:
        sub = sub * hg[:, None]
    fam["sub"] = sub + _sub_layer(arr, n, True)
    fam["pulse"] = _pulse_layer(arr, n)

    # calibrate each family to its target loudness (deterministic)
    gains = {}
    for f, y in fam.items():
        L = dsp.lufs(y)
        g = TARGET_LUFS.get(f, -36.0) - L if L > -100 else 0.0
        gains[f] = round(g, 2)
        fam[f] = y * dsp.undb(g)

    # two shared reverb sends
    rs, re_ = C["rewindStart"], C["rewindEnd"]
    mute = dsp.curve([(0, 1.0), (rs + 0.05, 1.0), (rs + 0.6, 0.0), (re_ - 0.05, 0.0), (re_, 1.0)], n, "cos")
    for bus, ir_kind in (("plate", "plate"), ("hall", "hall")):
        send = np.zeros((n, 2))
        for f, (_, _, rv, wet) in FX.items():
            if rv == bus and f in fam:
                send += fam[f] * wet
        if not np.any(send):
            continue
        send = dsp.lp(dsp.hp(send, 150, 2), 9000, 2)
        w = dsp.convolve(send, dsp.make_ir(ir_kind, 71))[:n]
        fam["verb-" + bus] = w * mute[:, None]
    if report is not None:
        report["score"] = {
            "bpm": arr.g.bpm, "grid_offset": arr.g.offset, "beat_s": round(arr.g.beat, 5), "bar_s": round(arr.g.bar, 5),
            "sections": arr.sections,
            "parts": {k: len(p.notes) for k, p in arr.parts.items()},
            "hold_exempt_parts": sorted(arr.exempt),
            "pulse_events": len(arr.pulse), "family_gain_db": gains,
            "holds": [{"t": round(h["t"], 3), "dur": round(h["dur"], 3), "gain_db": h["gain_db"],
                       "at": arr.g.label(h["t"]), "scene": h.get("scene")} for h in arr.holds],
            "removed_by_holds": arr.removed,
            "grid_check": arr.grid_check(),
        }
    return fam, arr
