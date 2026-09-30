"""The score (cut 3): one continuous piece in D at 92 BPM.

A sustained harmonic bed, the thread (engine/thread.py, synthesised in exact
equal temperament), runs from the first frame to END and carries one chord
timeline through the whole film. Every other layer (slow strings, felt piano,
cello, contrabass, a sine sub and a pulse of operational sounds) plays over
that timeline and enters or leaves on level curves of one to two bars, never
by starting or stopping: a section change is a crossfade, and a quiet moment
is a dip inside the same sound. Chord changes are voice-led: tones common to
two chords are held, the others move by the smallest step.

The grid is the edit's: 92 BPM from film time 0 (narration/timing.json
"grid"; beat 0.652 s, bar 2.609 s). Every note and every pulse event starts on
a bar, beat, half beat or sixteenth; nothing is humanised in time. Chords
change on bar lines chosen from the cue sheet (the bar line nearest the story
turn), never from fixed seconds.

  A  site wakes     D pedal from the first frame; Dsus2 from the bar near L01,
                    Bm7, Gmaj7, Asus4 near insurance, accepted, checklists; a
                    felt piano motif, one note per shot; a gentle pulse fades
                    in over three bars from the bar near "contractors"
  B  S6 build       D D Gmaj7 Gmaj7 from the bar near "But": pump strokes on 1
                    and 3, relays on the off-beats, a two-note piano figure,
                    cello and sub roots; one high B enters near "Then"
  C  unnoticed      on "offline" the pump winds down over a bar (the sprinkler
     change         stops), the strings, cello and sub fall away over a bar
                    and a half, the relays thin over three bars ("work
                    continues"); the thread dips and holds, the high B stays;
                    the harmony darkens to Em9 near "changed"
  D  afterwards     B minor from the bar after "afterwards", grown over a bar
                    and a half: contrabass, cello, low strings, low piano
                    notes, a faint tuned heartbeat; Gmaj7 near "gap"
     rewind         the thread continues underneath (G to Dsus2), the rest is
                    reversed (rewind.py) and lands on the thread's low point
  E  clarity        from that floor: a clean fifth and one piano note; the
                    wood tick fades in after "changed"
  F  Priora today   felt ostinato over Dadd9, A/C#, Bm7, Gmaj7
  G  offline again  the ostinato thins to quarters over a bar and falls away;
                    the crossing is the thread's dip on a bare D-A fifth with
                    the cello's low D
  H  three choices  Bm G D A, grown over two bars from the crossing's dip
  S  scenarios      a light, forward pulse (3+3+2 accents) over a rising bass,
                    D Em7 F#m7 G A, one chord a bar under the four vignettes
  O  pull back      the pulse thins over the bar before "ordinary"; the
                    harmony opens (Bm7, Gmaj9 wide with the contrabass, Em9)
  K  close          Asus4 at closeIn, the resolution to D add9 under "the gap
                    closes", nothing new at "Priora" (the latch stays clean),
                    G/D under the line, D again after it; a natural decay to END

Holds (`hold` events, docs/sound-events.md) are dips, never stops: over a
hold every family is drawn down by a share of the hold's depth (default
-5 dB, at most -12), the moving layers the most and the thread the least,
into the hold over up to one beat and back over a beat and a half.
"""
from __future__ import annotations

import itertools
import math

import numpy as np

from . import dsp, library, midi, thread
from .dsp import SR, ns, rng

GM = {"piano": 0, "strings": 49, "cello": 42, "bass": 43}

# loudness each family is calibrated to (integrated, gated) before the mix
TARGET_LUFS = {
    "thread": -30.5, "piano": -28.0, "strings": -30.0, "cello": -34.5, "bass": -38.5,
    "sub": -46.0, "pulse": -31.5,
}

HOLD_DEFAULT_DB = -5.0   # a hold's default depth (the moving layers)
HOLD_MAX_DB = -12.0      # a hold is a dip, never a stop
# share of a hold's depth taken by each family (and by the beds, design.py)
HOLD_SCALE = {"pulse": 1.0, "piano": 1.0, "strings": 0.7, "cello": 0.7, "bass": 0.7, "sub": 0.7,
              "thread": 0.45}

PCN = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def m(name: str) -> int:
    """Note name to MIDI number (C4 = 60)."""
    p, o = name[:-1], int(name[-1])
    return 12 * (o + 1) + PCN[p]


def hz(midi_note: int) -> float:
    return 440.0 * 2 ** ((midi_note - 69) / 12.0)


# name: (bass, chord tones, tones the upper voices must cover)
CHORDS = {
    "D5": ("D", ["D", "A"], ["D", "A"]),
    "Dsus2": ("D", ["D", "E", "A"], ["E", "A"]),
    "D": ("D", ["D", "F#", "A"], ["F#", "A"]),
    "Dadd9": ("D", ["D", "E", "F#", "A"], ["E", "F#", "A"]),
    "Bm": ("B", ["B", "D", "F#"], ["D", "F#"]),
    "Bm7": ("B", ["B", "D", "F#", "A"], ["D", "F#", "A"]),
    "G": ("G", ["G", "B", "D"], ["B", "D"]),
    "Gmaj7": ("G", ["G", "B", "D", "F#"], ["B", "D", "F#"]),
    "Gadd9": ("G", ["G", "A", "B", "D"], ["A", "B", "D"]),
    "Gmaj9": ("G", ["G", "A", "B", "D", "F#"], ["A", "B", "F#"]),
    "G/D": ("D", ["G", "B", "D"], ["G", "B"]),
    "Em7": ("E", ["E", "G", "B", "D"], ["G", "B", "D"]),
    "Em9": ("E", ["E", "F#", "G", "B", "D"], ["F#", "G", "D"]),
    "F#m7": ("F#", ["F#", "A", "C#", "E"], ["A", "C#", "E"]),
    "Asus4": ("A", ["A", "D", "E"], ["D", "E"]),
    "A": ("A", ["A", "C#", "E"], ["C#", "E"]),
    "A/C#": ("C#", ["A", "C#", "E"], ["A", "E"]),
}

OSTINATO = {  # 8 eighths per bar over the chord (felt piano)
    "Dadd9": ["D4", "A4", "E5", "A4", "D5", "A4", "E5", "A4"],
    "Dsus2": ["D4", "A4", "E5", "A4", "D5", "A4", "E5", "A4"],
    "D": ["D4", "A4", "D5", "A4", "F#4", "A4", "D5", "A4"],
    "D5": ["D4", "A4", "D5", "A4", "A4", "A4", "D5", "A4"],
    "A/C#": ["C#4", "A4", "E5", "A4", "C#5", "A4", "E5", "A4"],
    "Bm7": ["B3", "F#4", "D5", "F#4", "A4", "F#4", "D5", "F#4"],
    "Bm": ["B3", "F#4", "D5", "F#4", "B4", "F#4", "D5", "F#4"],
    "Gmaj7": ["G3", "D4", "B4", "D4", "F#4", "D4", "B4", "D4"],
    "G": ["G3", "D4", "B4", "D4", "G4", "D4", "B4", "D4"],
    "Gadd9": ["G3", "D4", "A4", "D4", "B4", "D4", "A4", "D4"],
    "A": ["A3", "E4", "C#5", "E4", "A4", "E4", "C#5", "E4"],
    "Asus4": ["A3", "E4", "D5", "E4", "A4", "E4", "D5", "E4"],
    "Em7": ["E4", "B4", "G4", "B4", "D5", "B4", "G4", "B4"],
    "F#m7": ["F#4", "C#5", "A4", "C#5", "E5", "C#5", "A4", "C#5"],
}
OST_VEL = [36, 23, 29, 23, 32, 23, 29, 23]
OST_VEL_332 = [36, 22, 25, 34, 22, 25, 33, 23]   # 3 + 3 + 2: accents on eighths 0, 3, 6


def bass_pc(chord: str) -> int:
    return PCN[CHORDS[chord][0]]


def in_range(pc: int, lo: int, hi: int) -> int:
    """The MIDI pitch of pitch class pc in [lo, hi) (lowest if several)."""
    p = lo + (pc - lo) % 12
    return p if p < hi else p - 12


def rc(t: float, t0: float, t1: float, a: float, b: float) -> float:
    """Raised-cosine ramp from a (t <= t0) to b (t >= t1)."""
    if t1 <= t0:
        return b if t >= t0 else a
    u = min(max((t - t0) / (t1 - t0), 0.0), 1.0)
    return a + (b - a) * (0.5 - 0.5 * math.cos(math.pi * u))


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
        `not_before` or earlier while it is after `not_after`."""
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
        5 ms of a half beat is read as that half beat."""
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
        self.notes = []

    def note(self, t, dur, pitch, vel):
        p = m(pitch) if isinstance(pitch, str) else int(pitch)
        self.notes.append((max(t, 0.0), max(t, 0.0) + max(dur, 0.02), p, int(np.clip(vel, 1, 127))))


def cue_grid(C) -> Grid:
    g = getattr(C, "grid", None) or {}
    return Grid(g.get("bpm", 92.0), g.get("offset", 0.0))


# ---------------------------------------------------------------- voice leading

def voice_lead(prev: list, chord: str, n: int = 4, lo: int = 50, hi: int = 71, center: float | None = None) -> list:
    """Upper voices for `chord`: each moves at most a fifth from where it
    was, the chord's colour tones are covered, no unisons, no seconds below
    C4; the smallest total movement wins (ties by pitch, so it is
    deterministic)."""
    _, tones, need = CHORDS[chord]
    pcs = {PCN[x] for x in tones}
    needs = {PCN[x] for x in need}
    prev = sorted(prev)
    if len(prev) != n:  # a voice added on top, or the top voice dropped
        prev = (prev + [prev[-1] + 4 * (k + 1) for k in range(n - len(prev))])[:n]
    cands = []
    for p in prev:
        c = [q for q in range(lo, hi + 1) if q % 12 in pcs and abs(q - p) <= 7]
        if not c:
            c = sorted((q for q in range(lo, hi + 1) if q % 12 in pcs), key=lambda q: (abs(q - p), q))[:2]
        cands.append(c)
    best = None
    for combo in itertools.product(*cands):
        s = tuple(sorted(combo))
        cost = float(sum(abs(a - b) for a, b in zip(s, prev)))
        cost += 7.0 * len(needs - {q % 12 for q in s})
        cost += 9.0 * (len(s) - len(set(s)))
        cost += 4.0 * sum(1 for a, b in zip(s, s[1:]) if b - a <= 2 and a < 60)
        if center is not None:
            cost += 0.35 * abs(float(np.mean(s)) - center)
        if best is None or (cost, s) < best:
            best = (cost, s)
    return list(best[1])


class Arrangement:
    """The chord timeline, every note, every pulse event and every level
    curve, computed from cues."""

    def __init__(self, C, holds=None):
        self.C = C
        self.g = cue_grid(C)
        self.holds = [h for h in (holds or []) if float(h.get("dur", 0) or 0) > 0]
        self.parts: dict[str, Part] = {}
        self.levels: dict[str, list] = {}   # part or family -> [(t, dB)]
        self.pulse = []                      # (t, kind, gain_db, pan, seed)
        self.timeline = []                   # [(t, chord, crossfade in beats)]
        self.sections = []
        self.r = rng(7, "arrangement")
        self._build()
        self._voice()

    # ------------------------------------------------------------------ helpers
    def part(self, inst, act):
        key = f"{inst}-{act}"
        if key not in self.parts:
            self.parts[key] = Part(inst, key)
        return self.parts[key]

    def vel(self, v, amount=3):
        return int(np.clip(v + self.r.integers(-amount, amount + 1), 1, 127))

    def mark(self, name, t, cue, what):
        c = self.C[cue]
        self.sections.append({"section": name, "t": round(t, 3), "bar": self.g.label(t), "cue": cue,
                              "cue_t": round(c, 3), "from_cue_beats": round((t - c) / self.g.beat, 2),
                              "what": what})

    def chord(self, t, name, xf=1.25):
        self.timeline.append((float(t), name, float(xf)))

    def chord_at(self, t):
        cur = self.timeline[0][1]
        for (t0, nm, _) in self.timeline:
            if t0 <= t + 1e-6:
                cur = nm
            else:
                break
        return cur

    def pulse_ev(self, t, kind, gain, pan, seed, until=None):
        if until is not None and t >= until - 0.02:
            return
        if gain <= -40:
            return
        self.pulse.append((t, kind, float(gain), pan, seed))

    def lv(self, key, pts):
        self.levels[key] = sorted(pts)

    # ------------------------------------------------------------------ build
    def _build(self):
        C, g = self.C, self.g
        B, H, S, BAR = g.beat, g.half, g.six, g.bar
        Q = g.q
        end = C.duration
        rs, re_ = C["rewindStart"], C["rewindEnd"]
        off = C["offline"]
        OFF = -90.0

        # ---------------- the story turns, on bar lines
        bA1 = g.bar_near(C["l01"])
        bPulse = max(g.bar_near(C["contractors"]), bA1)
        bB = max(g.bar_near(C["noOne"]), bPulse + BAR)
        bTone = max(g.bar_near(C["then"], not_after=off - B), bB)
        bOff = g.ceil(off + 1e-3, BAR)                          # the first bar line after the word
        bChg = max(g.bar_near(C["changed"]), bOff)
        bD = max(g.bar_near(C["afterwards"], not_before=C["afterwards"]), bChg + BAR)
        tLow = min(max(C["nobodyEnd"], bOff + H), bD - H)        # the deepest point of the dip
        tQ1 = max(g.bar_near(C["q1"], not_before=bD), bD)
        bGap = max(g.bar_near(C["gap"], not_before=tQ1), tQ1 + BAR)
        mid = 0.5 * (rs + re_)
        bRw = g.bar_near(mid)
        if not (rs + B <= bRw <= re_ - B):
            bRw = Q(mid)
        bE = g.bar_near(C["l12"], not_before=re_ + H)
        bPulse2 = max(g.bar_near(C["riskChanged"], not_before=C["riskChanged"]), bE)
        bF = max(g.bar_near(C["connects"]), bPulse2)
        tStep = max(Q(C["offline2"]), bF + BAR)
        tSees = max(Q(C["sees"]), tStep + B)
        bG = max(g.bar_near(C["cross"]), g.ceil(tSees + H, BAR))
        bH = max(g.bar_near(C["riskOwner"]), bG + BAR)
        bS = max(g.bar_near(C["everyKind"]), bH + 2 * BAR)
        bOpen = max(g.bar_near(C["ordinary"]), bS + 2 * BAR)
        bThin = bOpen - BAR
        bDec = max(g.bar_near(C["decisionsL18"]), bOpen + BAR)
        bClose = max(g.bar_near(C["closeIn"]), bDec + BAR)
        bRes = max(g.bar_near(C["gapCloses"]), bClose + BAR)
        tPri = Q(C["priora"])
        bTag = max(g.bar_near(C["tagline"], not_before=bRes + BAR), bRes + BAR)
        l20_end = C.line_end_at(C["tagline"]) if C.speaking(C["tagline"]) else C["tagline"] + 2.0
        bFin = max(g.ceil(l20_end, BAR), bTag + BAR)
        if bFin > end - 2.0 * B:     # no room for the return: stay on D from the tagline
            bFin = None
        if bTag > end - 2.0 * B:
            bTag = None
        tRel = min((bFin if bFin is not None else (bTag if bTag is not None else bRes)) + B, end - 0.5)

        def release(db0, db_end=-32.0):
            """A natural decay from tRel to END: straight in dB (exponential in
            amplitude), written as close anchors so the raised-cosine
            interpolation cannot hold and then drop."""
            k = max(int((end - tRel) / 0.25), 1)
            return [(tRel + (end - tRel) * i / k, db0 + (db_end - db0) * i / k) for i in range(k + 1)]
        self.marks = dict(bA1=bA1, bPulse=bPulse, bB=bB, bTone=bTone, bOff=bOff, bChg=bChg, bD=bD, tLow=tLow,
                          tQ1=tQ1, bGap=bGap, bRw=bRw, bE=bE, bPulse2=bPulse2, bF=bF, tStep=tStep, tSees=tSees,
                          bG=bG, bH=bH, bS=bS, bThin=bThin, bOpen=bOpen, bDec=bDec, bClose=bClose, bRes=bRes,
                          bTag=bTag, bFin=bFin)
        self.mark("A strings enter", bA1, "l01", "Dsus2 over the D pedal; felt piano motif")
        self.mark("A pulse", bPulse, "contractors", "the operational pulse fades in over two bars")
        self.mark("B build", bB, "noOne", "the rhythmic system builds under S6")
        self.mark("B high B", bTone, "then", "the tone that will remain")
        self.mark("C unnoticed change", off, "offline", "on the word: the pump winds down, the rest thins over a bar")
        self.mark("C darker", bChg, "changed", "Em9: the harmony darkens")
        self.mark("D aftermath", bD, "afterwards", "B minor, grown over a bar and a half")
        self.mark("D gap", bGap, "gap", "Gmaj7")
        self.mark("rewind thread", bRw, "rewindStart", "the thread moves to Dsus2 under the rewind")
        self.mark("E clarity", bE, "l12", "a clean fifth and one piano note from the landing's floor")
        self.mark("E pulse", bPulse2, "riskChanged", "the wood tick fades in")
        self.mark("F ostinato", bF, "connects", "felt ostinato, chord per bar")
        self.mark("G step down", tStep, "offline2", "the ostinato thins over a bar")
        self.mark("G crossing", bG, "cross", "the thread's dip on a bare fifth, the cello's low D")
        self.mark("H momentum", bH, "riskOwner", "the three choices, grown over two bars")
        self.mark("S scenarios", bS, "everyKind", "a light, forward pulse over a rising bass")
        self.mark("O thinning", bThin, "ordinary", "the pulse thins over the bar before the pull back")
        self.mark("O pull back", bOpen, "ordinary", "the harmony opens: Gmaj9 wide, the contrabass")
        self.mark("O decisions", bDec, "decisionsL18", "Em9")
        self.mark("K close", bClose, "closeIn", "Asus4")
        self.mark("K resolution", bRes, "gapCloses", "D add9 under 'the gap closes'")
        if bTag is not None:
            self.mark("K line", bTag, "tagline", "G/D under the line")
        if bFin is not None:
            self.mark("K home", bFin, "tagline", "D again after the line, a natural decay to END")

        # ================= the chord timeline (the thread carries it all)
        self.chord(0.0, "D5")
        seqA = [(bA1, "Dsus2"), (g.bar_near(C["insurance"]), "Bm7"), (g.bar_near(C["accepted"]), "Gmaj7"),
                (g.bar_near(C["checklists"]), "Asus4")]
        for t, nm in seqA:
            if bA1 <= t < bB:
                self.chord(t, nm)
        barsB = g.bars(bB, bOff)
        seqB = ["D", "D", "Gmaj7", "Gmaj7"]
        chB = [(t, seqB[i % 4]) for i, t in enumerate(barsB)]
        for t, nm in chB:
            self.chord(t, nm)
        lastB = chB[-1][1] if chB else "Gmaj7"
        if lastB != "Gmaj7":
            self.chord(bOff, "Gmaj7", 2.0)
        self.chord(bChg, "Em9", 2.0)
        self.chord(bD, "Bm", 2.0)
        self.chord(bGap, "Gmaj7")
        self.chord(bRw, "Dsus2", 4.0)          # under the rewind, a slow move home
        barsF = g.bars(bF, bG)
        seqF = ["Dadd9", "A/C#", "Bm7", "Gmaj7"]
        chF = [(t, seqF[i % 4]) for i, t in enumerate(barsF)]
        for t, nm in chF:
            self.chord(t, nm)
        self.chord(bG, "D5", 2.0)
        barsH = g.bars(bH, bS)
        seqH = ["Bm", "G", "D", "A"]
        chH = [(t, seqH[i % 4]) for i, t in enumerate(barsH)]
        if len(chH) >= 2:
            chH[-1] = (chH[-1][0], "Gadd9")     # the approach to the scenarios' D
        for t, nm in chH:
            self.chord(t, nm)
        barsS = g.bars(bS, bThin)
        rise = ["Dadd9", "Em7", "F#m7", "G", "A"]
        if len(barsS) <= len(rise):
            seqS = rise[:max(len(barsS) - 1, 0)] + ["A"] if len(barsS) > 1 else ["Dadd9"]
        else:
            seqS = rise[:4] + ["Asus4"] * (len(barsS) - 5) + ["A"]
        chS = list(zip(barsS, seqS))
        for t, nm in chS:
            self.chord(t, nm)
        self.chord(bThin, "Bm7", 2.0)
        self.chord(bOpen, "Gmaj9", 2.0)
        self.chord(bDec, "Em9", 2.0)
        self.chord(bClose, "Asus4", 2.0)
        self.chord(bRes, "Dadd9", 1.5)
        if bTag is not None:
            self.chord(bTag, "G/D", 2.0)
        if bFin is not None:
            self.chord(bFin, "Dadd9", 2.0)
        self.timeline.sort()
        self.open_from = bOpen                 # the thread's voicing widens here
        self.open_until = end + 1.0

        # ================= level curves (dB), one to two bar ramps everywhere
        self.lv("thread", [(0.0, -40.0), (bA1, -10.0), (bPulse, -7.0), (bB, -4.0), (bTone, -3.0), (off, -3.0),
                           (off + BAR, -7.0), (tLow, -10.0), (bD - H, -10.5), (bD + BAR, -5.0), (rs, -5.0),
                           (re_, -10.5), (bE + BAR, -7.0), (bF, -4.5), (tStep, -4.5), (tSees, -8.0), (bG, -13.5),
                           (bH, -13.5), (bH + 2 * BAR, -4.0), (bS, -3.0), (bThin, -3.0), (bOpen + H, -1.5),
                           (bClose, -3.0), (bRes + B, -2.5), (tPri, -4.5)]
                + ([(bTag, -5.0)] if bTag is not None else [])
                + release(-4.0))
        br = [(0.0, 0.15), (bB, 0.35), (off, 0.4), (off + BAR, 0.15), (bD + BAR, 0.2), (rs, 0.2), (re_, 0.1),
              (bF, 0.35), (tSees, 0.3), (bG, 0.12), (bH + 2 * BAR, 0.4), (bS, 0.5), (bThin, 0.45),
              (bOpen + BAR, 0.55), (bRes + B, 0.45), (end, 0.2)]
        self.bright = sorted(br)

        # ---------------- strings: Act I and the aftermath (one part), the held B, Acts II and III
        self.lv("strings-a1", [(bA1, OFF), (bA1 + 1.5 * BAR, -7.0), (seqA[1][0], -5.0), (bB, -4.0), (off, -4.0),
                               (off + BAR, -24.0), (off + 1.5 * BAR, OFF), (tQ1 - H, OFF), (tQ1 + BAR, -8.0),
                               (Q(C["q3"]), -6.0), (bGap, -6.0), (rs, -7.0)])
        self.lv("strings-held", [(bTone, OFF), (max(off, bTone + B), -18.0), (off + 2 * B, -8.0),
                                 (Q(C["changed"]), -9.0), (Q(C["nobody"]), -12.0), (bD, -15.0), (rs, -17.0)])
        self.lv("strings-a2", [(re_, OFF), (bE - H, OFF), (bE + 2 * BAR, -9.0), (bF, -6.0),
                               (Q(C["prevention"]) - B, -6.0), (Q(C["prevention"]) + B, -4.0), (tStep, -6.0),
                               (tSees, -9.0), (bG, -24.0), (bH, -24.0), (bH + 2 * BAR, -6.0), (bS - H, -6.0),
                               (bS + H, -8.0), (bThin, -8.0), (bOpen + H, -4.0), (bClose, -4.5), (bRes + B, -3.0),
                               (tPri, -5.5)]
                + ([(bTag, -6.5)] if bTag is not None else [])
                + release(-5.0))
        self.strings_windows = [("strings-a1", bA1, off + 1.5 * BAR), ("strings-a1", tQ1, rs + 0.4),
                                ("strings-a2", bE, end)]
        hs = self.part("strings", "held")
        hs.note(bTone, rs + 0.4 - bTone, "B4", 34)
        # the aftermath voicing sits above the soundfont's wobbly low zone
        self.string_floor = m("G3")

        # ---------------- cello, contrabass and sub: roots, legato, level curves
        self.lv("cello-a1", [(bB - H, OFF), (bB + BAR, -4.0), (off, -4.0), (off + 1.5 * BAR, OFF), (bD - H, OFF),
                             (bD + BAR, -3.0), (rs, -4.0)])
        self.cello_windows = [("cello-a1", bB, off + 1.5 * BAR, None), ("cello-a1", bD, rs + 0.4, "F#")]
        self.lv("cello-a2", [(bF - H, OFF), (bF + BAR, -4.0), (tStep, -4.0), (tStep + BAR, -10.0), (bG, -7.0),
                             (bH, -7.0), (bH + 2 * BAR, -4.0), (bS, -5.0), (bThin, -6.0), (bOpen, -4.0),
                             (bRes + B, -4.0), (tPri, -6.0)]
                + release(-6.0))
        self.cello_windows.append(("cello-a2", bF, end, None))
        self.lv("bass-a1", [(bD - H, OFF), (bD + BAR, -3.0), (bGap, -4.0), (rs, -5.0)])
        self.bass_windows = [("bass-a1", bD, rs + 0.4, "B")]
        self.lv("bass-a2", [(bThin + 2 * B, -30.0), (bOpen + BAR, -4.0), (bRes + B, -4.0), (tPri, -6.0)]
                + release(-6.0))
        self.bass_windows.append(("bass-a2", bThin + 2 * B, end, None))
        self.lv("sub", [(0.0, OFF), (bB - H, OFF), (bB + BAR, -2.0), (off, -2.0), (off + BAR, -12.0),
                        (tLow, -30.0), (bD - H, -30.0), (bD + BAR, -6.0), (rs, -6.0), (re_, OFF),
                        (bF - H, OFF), (bF + BAR, -3.0), (tStep, -3.0), (tStep + BAR, -8.0), (bG, -8.0),
                        (bH, -8.0), (bH + 2 * BAR, -3.0), (bS, -4.0), (bThin, -4.0), (bOpen, -2.0),
                        (bRes + B, -2.0), (tPri, -4.0)]
                + release(-4.0))

        # ================= piano (felt), one part per side of the rewind
        p1 = self.part("piano", "a1")
        motif = [("hour", "A4", 34, 2.2), ("contractors", "F#4", 29, 1.6), ("equipment", "E4", 29, 1.6),
                 ("workMoves", "D4", 31, 2.6), ("workMoves", "A3", 25, 2.6), ("accepted", "D5", 31, 1.8),
                 ("accepted", "B3", 24, 1.8), ("permits", "C#5", 27, 1.4), ("checklists", "A4", 27, 1.6)]
        used = {}
        for cue, nn, v, dur in motif:
            if C.get(cue) is None:
                continue
            t = Q(C[cue])
            while used.get(round(t, 4), cue) != cue:  # two words on one beat: the later takes the next beat
                t += B
            used[round(t, 4)] = cue
            if t < bB:
                p1.note(t, dur, nn, self.vel(v))
        # the build's two-note figure, winding down over the bar after "offline"
        for i, bt in enumerate(g.bars(bB, off + BAR)):
            chn = self.chord_at(bt + 0.01)
            fig = {"D": ["A4", "D5"], "Gmaj7": ["B4", "D5"]}.get(chn, ["B4", "D5"])
            if i < 1:
                continue
            for b in range(4):
                t = bt + b * B
                if t >= off + BAR - 0.02:
                    break
                fade = rc(t, off, off + BAR, 1.0, 0.45)
                v = (24 + 3 * min(i, 3) + (4 if b == 0 else 0)) * fade
                p1.note(t, B * 0.9, fig[b % 2], self.vel(v))
        # the aftermath: single low notes
        for t, nn, v, dur in [(bD, "B2", 31, 2.4), (Q(C["q1"]), "F#3", 27, 2.0), (Q(C["q3"]), "D4", 27, 2.0),
                              (Q(C["gap"]), "G2", 33, 3.0), (Q(C["gap"]), "D3", 28, 3.0)]:
            if bD - 1e-6 <= t < rs:
                p1.note(t, dur, nn, self.vel(v))
        self.lv("piano-a1", [(0.0, 0.0), (end, 0.0)])

        p2 = self.part("piano", "a2")
        p2.note(bE, 2.4, "D5", self.vel(25))
        for i, (t, chn) in enumerate(chF):
            for e in range(8):
                te = t + e * H
                if te < tStep - 0.03:
                    grow = rc(te, bF, bF + BAR, -6.0, 0.0)
                    if i == 0 and e % 2 == 1:
                        continue  # the first bar enters in quarters
                    p2.note(te, B * 0.55, OSTINATO[chn][e], self.vel(OST_VEL[e] + (2 if i >= 2 else 0) + grow, 2))
                elif te < tSees + B - 0.03 and e % 2 == 0:  # stepped down: quarters, fading
                    p2.note(te, B * 0.9, OSTINATO[chn][e], self.vel((OST_VEL[e] - 2) * rc(te, tStep, tSees + B, 1.0,
                                                                                            0.55), 2))
        tPv, tPf = Q(C["prevention"], H), Q(C["proof"], H)
        p2.note(tPv, 3.0, "D2", self.vel(42))
        p2.note(tPv, 3.0, "A2", self.vel(36))
        p2.note(tPf, 3.0, "G2", self.vel(40))
        p2.note(tPf, 3.0, "D3", self.vel(34))
        for i, (t, chn) in enumerate(chH):   # the three choices: grown over two bars
            ost = OSTINATO.get(chn, OSTINATO["D"])
            for e in range(8):
                te = t + e * H
                grow = rc(te, bH, bH + 2 * BAR, -12.0, 0.0)
                if (i == 0 and e % 4) or (i == 1 and e % 2):
                    continue  # half notes, then quarters, then eighths
                p2.note(te, B * (1.6 if i == 0 else 0.9 if i == 1 else 0.55), ost[e],
                        self.vel(OST_VEL[e] + 3 + grow, 2))
        for i, (t, chn) in enumerate(chS):   # the scenarios: 3 + 3 + 2, light
            ost = OSTINATO.get(chn, OSTINATO["D"])
            for e in range(8):
                te = t + e * H
                p2.note(te, B * 0.5, ost[e], self.vel(OST_VEL_332[e] - 1, 2))
        for e in range(0, 8, 2):              # the bar before the pull back: quarters, falling away
            te = bThin + e * H
            ost = OSTINATO.get(self.chord_at(te), OSTINATO["Bm7"])
            p2.note(te, B * 0.9, ost[e], self.vel(30 * rc(te, bThin, bOpen, 1.0, 0.6), 2))
        # the open pull back and the close: single notes, wide
        for t, nn, v, dur in [(bOpen, "F#5", 26, 3.0), (bOpen + 2 * B, "A4", 22, 2.4), (bDec, "D5", 24, 3.0),
                              (bClose, "E5", 24, 3.0),
                              (bRes, "D2", 30, 5.0), (bRes, "A2", 27, 5.0), (bRes, "F#3", 24, 5.0),
                              (bRes, "E4", 20, 5.0)]:
            p2.note(t, dur, nn, self.vel(v))
        if bTag is not None:
            p2.note(bTag, 3.0, "B4", self.vel(21))
        if bFin is not None:
            p2.note(bFin, min(4.0, end - bFin), "D5", self.vel(22))
            p2.note(bFin, min(4.0, end - bFin), "A4", self.vel(19))
        self.lv("piano-a2", [(0.0, 0.0), (bG, 0.0), (bH, -6.0), (bH + 2 * BAR, 0.0), (end, 0.0)])

        # ================= the pulse: operational sounds on the grid, every
        # entrance and exit a level ramp of one to three bars
        paper = C.get("paperIn") or C["accepted"]
        bWork = g.bar_near(C["workMoves"])
        for i, t in enumerate(g.bars(bPulse, bB)):
            dim = -4.0 if t >= paper - 1e-6 else 0.0
            grow = rc(t, bPulse, bPulse + 3 * BAR, -14.0, 0.0)
            self.pulse_ev(t, "pump", -15.0 + dim + grow, 0.0, 11)
            self.pulse_ev(t + 2 * B, "relay", -18.0 + dim + grow, 0.3, 21, until=bB)
            if t >= bWork - 1e-6:
                g2 = rc(t, bWork, bWork + BAR, -8.0, 0.0)
                self.pulse_ev(t + 3.5 * B, "relay", -22.0 + dim + grow + g2, -0.3, 22, until=bB)
        for i, bt in enumerate(g.bars(bB, off + 3 * BAR)):
            ramp = min(i / 2.0, 1.0)
            for b in (0, 2):  # pump strokes on 1 and 3: the sprinkler's pump winds down after the word
                t = bt + b * B
                if t < off + BAR:
                    self.pulse_ev(t, "pump", -10.0 + 5.0 * ramp + rc(t, off, off + BAR, 0.0, -18.0), 0.0, 11 + b)
            for b in range(4):  # relays on the off-beats: work continues, thinning over three bars
                t = bt + (b + 0.5) * B
                self.pulse_ev(t, "relay", -16.0 + 2.0 * ramp + rc(t, off, off + 3 * BAR, 0.0, -22.0),
                              0.35 if b % 2 else -0.35, 20 + b, until=off + 3 * BAR)
        for t in g.bars(tQ1, rs):  # a faint tuned heartbeat on the bar
            self.pulse_ev(t, "soft", -18.0 + rc(t, tQ1, tQ1 + 2 * BAR, -10.0, 0.0), 0.0, 150, until=rs)
        for i, t in enumerate(g.bars(bPulse2, bF)):  # the precise wood tick fades in, alone
            grow = rc(t, bPulse2, bPulse2 + 2 * BAR, -14.0, 0.0)
            for e in range(8):
                self.pulse_ev(t + e * H, "tick", (-16.0 if e % 2 == 0 else -22.0) + grow,
                              0.25 if e % 2 else -0.1, 70 + e % 4, until=bF)
            if i >= 1:
                self.pulse_ev(t, "soft", -15.0 + rc(t, bPulse2 + BAR, bPulse2 + 3 * BAR, -8.0, 0.0), 0.0, 80,
                              until=bF)
        for i, (t, chn) in enumerate(chF):
            for e in range(8):
                te = t + e * H
                new = rc(te, bF, bF + BAR, -10.0, 0.0)
                if te < tStep - 0.03:
                    self.pulse_ev(te, "tick", -16.0 if e % 2 == 0 else -21.0, 0.25 if e % 2 else -0.1, 70 + e % 4)
                    if e == 0:
                        self.pulse_ev(te, "soft", -12.0, 0.0, 80)
                    if e == 4:
                        self.pulse_ev(te, "soft", -12.0 + new, 0.0, 84)
                    if e in (2, 6):
                        self.pulse_ev(te, "relay", -19.0 + new, 0.3, 90 + e)
                elif te < bG - 0.03 and e % 2 == 0:  # stepped down: quarters, falling away to the crossing
                    fall = rc(te, tStep, bG, 0.0, -16.0)
                    self.pulse_ev(te, "tick", -17.0 + fall, -0.1, 70 + e % 4)
                    if e == 0:
                        self.pulse_ev(te, "soft", -14.0 + fall, 0.0, 80)
        for i, (t, chn) in enumerate(chH):  # the three choices
            for e in range(8):
                te = t + e * H
                grow = rc(te, bH, bH + 2 * BAR, -14.0, 0.0)
                leave = rc(te, bS - BAR, bS, 0.0, -10.0)
                self.pulse_ev(te, "tick", (-16.0 if e % 2 == 0 else -21.0) + grow, 0.25 if e % 2 else -0.1,
                              100 + e % 4)
                if e in (0, 4):
                    self.pulse_ev(te, "soft", -11.0 + grow, 0.0, 110 + e)
                if e in (2, 6):
                    self.pulse_ev(te, "relay", -18.0 + grow + leave, 0.3, 120 + e)
        for i, (t, chn) in enumerate(chS):  # the scenarios: light and forward, 3 + 3 + 2
            for e in range(8):
                te = t + e * H
                acc = e in (0, 3, 6)
                self.pulse_ev(te, "tick", -15.0 if acc else -22.0, 0.25 if e % 2 else -0.1, 100 + e % 4)
                if acc:
                    self.pulse_ev(te, "soft", {0: -12.0, 3: -15.0, 6: -14.0}[e], 0.0, 110 + e)
                if e in (2, 5):  # a ghost sixteenth leaning into the next accent
                    self.pulse_ev(te + S, "tick", -25.0, -0.1 if e % 2 else 0.25, 102 + e % 2)
        for e in range(0, 12, 2):  # thinning: a bar and a half of quarters, falling away into the pull back
            te = bThin + e * H
            fall = rc(te, bThin, bOpen + 2 * B, 0.0, -18.0)
            self.pulse_ev(te, "tick", -17.0 + fall, -0.1, 130 + e % 4)
            if e == 0:
                self.pulse_ev(te, "soft", -14.0 + fall, 0.0, 140)
        self.lv("pulse", [(0.0, 0.0), (end, 0.0)])

    # ------------------------------------------------------------------ voicing
    def _voice(self):
        """Voice every chord of the timeline for the thread (bass, a low
        fifth, four or five upper voices), then derive the strings, cello,
        contrabass and sub from the same voicings, so every layer shares one
        harmony and one voice leading."""
        g, end = self.g, self.C.duration
        B = g.beat
        prev_up = [m("A3"), m("D4"), m("E4"), m("A4")]
        prev_bass = m("D2")
        self.voicings = []
        for i, (t, name, xf) in enumerate(self.timeline):
            opened = self.open_from - 1e-6 <= t < self.open_until
            n_up = 5 if opened else 4
            up = voice_lead(prev_up, name, n_up, lo=m("D3"), hi=m("E5") if opened else m("B4"),
                            center=(m("A4") if opened else None))
            bpc = bass_pc(name)
            cands = [p for p in range(m("D2"), m("C#3") + 1) if p % 12 == bpc]
            bass = min(cands, key=lambda p: (abs(p - prev_bass), p))
            _, tones, _ = CHORDS[name]
            pcs = {PCN[x] for x in tones}
            low2 = [p for p in range(bass + 5, bass + 13) if p % 12 in pcs and p != bass]
            low2 = [p for p in low2 if (p - bass) in (7, 12)] or low2[:1]
            voices = sorted(set([bass] + low2[:1] + up))
            t1 = self.timeline[i + 1][0] if i + 1 < len(self.timeline) else end
            self.voicings.append({"t": t, "t1": t1, "chord": name, "xf": xf, "voices": voices, "upper": up,
                                  "bass": bass, "at": g.label(t)})
            prev_up, prev_bass = up, bass
        # thread tones: a pitch common to consecutive chords is one tone
        tones, live = [], {}
        for v in self.voicings:
            t, xf = v["t"], v["xf"]
            pre, post = 0.25 * B, xf * B - 0.25 * B
            new = set(v["voices"])
            for p in list(live):
                if p not in new:
                    tn = live.pop(p)
                    tn["t1"] = t + post if t > 0 else t
                    tn["fout"] = pre + post
            for p in sorted(new):
                if p not in live:
                    t0 = max(t - pre, 0.0)
                    live[p] = {"p": p, "t0": t0, "t1": end, "fin": (t + post) - t0 if t > 0 else 0.02,
                               "fout": 0.02, "w": self._weight(p)}
                    tones.append(live[p])
        self.thread_tones = tones

        # strings, cello, contrabass: legato notes from the voicings inside each part's windows
        for key, a, b in self.strings_windows:
            spans = []
            for v in self.voicings:
                s0, s1 = max(v["t"], a), min(v["t1"], b)
                if s1 - s0 > 0.05:
                    ps = [p for p in v["upper"] if p >= self.string_floor]
                    if len(ps) < 3:  # keep three voices: lift the lowest by an octave
                        ps = sorted(set(ps + [p + 12 for p in v["upper"] if p < self.string_floor]))
                    spans.append((s0, s1, ps[-4:]))
            self._legato(self.part("strings", key.split("-", 1)[1]), spans, 40)
        for key, a, b, fixed in self.cello_windows:
            spans = []
            for v in self.voicings:
                s0, s1 = max(v["t"], a), min(v["t1"], b)
                if s1 - s0 > 0.05:
                    pc = PCN[fixed] if fixed else bass_pc(v["chord"])
                    spans.append((s0, s1, [in_range(pc, m("D2"), m("D3"))]))
            self._legato(self.part("cello", key.split("-", 1)[1]), spans, 42)
        for key, a, b, fixed in self.bass_windows:
            spans = []
            for v in self.voicings:
                s0, s1 = max(v["t"], a), min(v["t1"], b)
                if s1 - s0 > 0.05:
                    pc = PCN[fixed] if fixed else bass_pc(v["chord"])
                    spans.append((s0, s1, [in_range(pc, m("G1"), m("G2"))]))
            self._legato(self.part("bass", key.split("-", 1)[1]), spans, 40)

    def _weight(self, p):
        return 1.0 if p < m("C3") else 0.8 if p < m("C4") else 0.62 if p < m("G4") else 0.5

    def _legato(self, part, spans, vel):
        """Held notes over consecutive spans: a pitch in two consecutive spans
        is one note; a pitch that leaves overlaps the next chord by a sixteenth."""
        S = self.g.six
        live = {}
        for i, (s0, s1, ps) in enumerate(spans):
            joined = i > 0 and abs(spans[i - 1][1] - s0) < 1e-3
            for p in list(live):
                if p not in ps or not joined:
                    t0 = live.pop(p)
                    part.note(t0, (spans[i - 1][1] + (S if joined else 0.0)) - t0, p, self.vel(vel, 2))
            for p in ps:
                if p not in live:
                    live[p] = s0
        if spans:
            for p, t0 in live.items():
                part.note(t0, spans[-1][1] - t0, p, self.vel(vel, 2))

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
                "max_offset_from_sixteenth_ms": round(worst * 1000, 3),
                "note": "thread chord changes are crossfades centred a quarter beat before their bar line"}


def hold_curve_db(holds, times, beat, scale=1.0):
    """Gain in dB at `times` for a set of holds: a dip into the hold over up
    to one beat (a third of a short hold), held, and back over a beat and a
    half after it. Overlapping holds take the deeper."""
    times = np.asarray(times, float)
    y = np.zeros_like(times)
    for h in holds or []:
        t0, d = float(h["t"]), float(h["dur"])
        gd = float(h.get("gain_db", HOLD_DEFAULT_DB)) * scale
        a = max(min(beat, d / 3.0), 0.05)
        u_in = np.clip((times - t0) / a, 0, 1)
        u_out = np.clip((times - (t0 + d)) / (1.5 * beat), 0, 1)
        w = (0.5 - 0.5 * np.cos(np.pi * u_in)) * (0.5 + 0.5 * np.cos(np.pi * u_out))
        y = np.minimum(y, gd * w)
    return y


def hold_gain(holds, n, beat, scale=1.0):
    """Linear per-sample gain (length n) for hold_curve_db, via a 2 kHz control rate."""
    k = int(n / SR * 2000) + 2
    tc = np.arange(k) / 2000.0
    g = dsp.undb(hold_curve_db(holds, tc, beat, scale))
    return np.interp(dsp.tvec(n), tc, g)


def level_gain(pts, n):
    """Per-sample linear gain from dB anchors [(t, dB)], raised-cosine in dB
    between anchors (at or under -80 dB is silence)."""
    pts = sorted(pts)
    fixed, last = [], None
    for t, v in pts:  # two anchors at one time: the later one moves by a millisecond
        if last is not None and t <= last + 1e-4:
            t = last + 0.001
        fixed.append((t, v))
        last = t
    k = int(n / SR * 2000) + 2
    tc = np.arange(k) / 2000.0
    db = dsp._curve_at(fixed, tc, "cos")
    g = np.where(db <= -80.0, 0.0, 10 ** (db / 20.0))
    return np.interp(dsp.tvec(n), tc, g)


# ---------------------------------------------------------------- synth layers

def root_hz(pc: int, lo: float, hi: float) -> float:
    f = hz(60 + (pc - 60) % 12)
    while f >= hi:
        f /= 2
    while f < lo:
        f *= 2
    return f


def _sub_layer(arr: Arrangement, n: int) -> np.ndarray:
    """Sine sub on each chord's bass, kept between 45 and 90 Hz; one tone per
    run of the same bass, crossfaded over a beat at a change."""
    y = np.zeros(n)
    B = arr.g.beat
    runs = []
    for v in arr.voicings:
        f = root_hz(bass_pc(v["chord"]), 45.0, 90.0)
        if runs and abs(runs[-1][2] - f) < 1e-6:
            runs[-1][1] = v["t1"]
        else:
            runs.append([v["t"], v["t1"], f])
    for i, (t0, t1, f) in enumerate(runs):
        a = max(ns(t0 - 0.25 * B), 0)
        b = min(ns(t1 + 0.75 * B), n) if i + 1 < len(runs) else n
        if b <= a:
            continue
        tt = np.arange(a, b) / SR
        seg = np.sin(2 * np.pi * f * tt)
        env = np.ones(b - a)
        k = min(ns(B), (b - a) // 2)
        if i > 0 and k > 1:
            env[:k] *= np.sin(0.5 * np.pi * np.linspace(0, 1, k))
        if i + 1 < len(runs) and k > 1:
            env[-k:] *= np.cos(0.5 * np.pi * np.linspace(0, 1, k))
        y[a:b] += seg * env
    y = y * level_gain(arr.levels["sub"], n)
    y = dsp.hp(dsp.lp(y, 140, 2), 32, 4)
    return dsp.st(y)


def _pulse_sound(kind: str, seed: int, root: float | None = None) -> np.ndarray:
    r = rng(seed, "pulse", kind)
    if kind == "pump":  # a distant press stroke, its body settling on the chord's bass
        f = root or 55.0
        y = dsp.mix(dsp.thump(f * 1.18, f, 0.3, 0.55),
                    dsp.bp(dsp.white(ns(0.05), r) * dsp.decay(ns(0.05), 0.03), 140, 600, 2) * 0.3)
        y = dsp.hp(dsp.lp(y, 900, 2), 36, 4)
        return library._out(dsp.verb(y, "roof", 0.3, seed=59, hp_hz=70)[: ns(1.1)], r, 0)
    if kind == "relay":  # the control-room relay, softened (no bright snap)
        return dsp.lp(library.relay_click(seed), 6500, 2) * 0.8
    if kind == "tick":  # precise wood-click
        y = dsp.mix(library.tuned("wood", library.NOTE[["D6", "A6", "E6", "A6"][seed % 4]], r, 0.12) * 0.7,
                    dsp.click(r, 2500, 8000, 0.002, 0.0004) * 0.3)
        return dsp.normalize(dsp.st(dsp.hp(y, 200, 2)), -1)
    if kind == "soft":  # a soft, low pulse: felt on a drum skin, tuned to the chord's bass
        f = root or 73.42
        y = dsp.mix(dsp.thump(f * 1.25, f, 0.24, 0.4) * 0.9,
                    dsp.lp(dsp.white(ns(0.03), r), 400, 2) * dsp.perc(ns(0.03), 0.002, 0.03) * 0.2)
        y = dsp.hp(dsp.lp(y, 700, 2), 38, 4)
        return dsp.normalize(dsp.st(y), -1)
    raise ValueError(kind)


PULSE_LEVEL = {"pump": -9.0, "relay": -7.0, "tick": -6.0, "soft": -7.0}
PULSE_RANGE = {"pump": (41.0, 82.0), "soft": (49.0, 98.0)}


def _pulse_layer(arr: Arrangement, n: int) -> np.ndarray:
    buf = np.zeros((n, 2))
    cache = {}
    times = np.array([e[0] for e in arr.pulse]) if arr.pulse else np.zeros(0)
    hdb = hold_curve_db(arr.holds, times, arr.g.beat, HOLD_SCALE["pulse"]) if len(times) else times
    for k, (t, kind, gdb, pan_, seed) in enumerate(arr.pulse):
        root = None
        if kind in PULSE_RANGE:
            root = root_hz(bass_pc(arr.chord_at(t)), *PULSE_RANGE[kind])
        key = (kind, seed % 6, None if root is None else round(root, 3))
        if key not in cache:
            cache[key] = _pulse_sound(kind, seed % 6, root)
        dsp_place(buf, cache[key], t, PULSE_LEVEL[kind] + gdb + float(hdb[k]), pan_)
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


FX = {  # per family: high-pass, low-pass, reverb bus, send level
    "piano": (45, 12000, "plate", 0.28),
    "strings": (60, 7500, "hall", 0.32),
    "cello": (38, 5000, "hall", 0.26),
    "bass": (35, 3000, "hall", 0.2),
    "thread": (40, 6000, "thread", 0.3),
}
TAIL = 4.0  # seconds of release and room processed after a part's last note


def render(C, report: dict | None = None, holds=None):
    """Render every music layer to stereo arrays of the film's length.

    Returns ({family: stereo array}, arrangement). Families: thread (and its
    own reverb return, verb-thread), piano, strings, cello, bass (fluidsynth,
    tuned note by note), sub, pulse, verb-plate and verb-hall. Level curves
    and holds are applied to the dry signal, so reverb tails ring out
    naturally. Everything but the thread falls away at rewindStart (the
    rewind replaces it) and is silent until rewindEnd; the thread continues
    through the rewind, so the landing is a dip, not a silence.
    """
    arr = Arrangement(C, holds)
    n = ns(C.duration)
    beat = arr.g.beat
    rs, re_ = C["rewindStart"], C["rewindEnd"]
    rw = dsp.curve([(0, 1.0), (rs, 1.0), (rs + 0.3, 0.0), (re_ - 0.01, 0.0), (re_, 1.0)], n, "cos")
    fam: dict[str, np.ndarray] = {}
    tuning_rep = {}
    for key, part in arr.parts.items():
        if not part.notes:
            continue
        pitches = sorted({nn[2] for nn in part.notes})
        tun = midi.measure_tuning(part.program, pitches)
        corr = {p: -v["cents"] for p, v in tun.items()}
        tuning_rep[key] = {str(p): {"measured_cents": v["cents"], "sd_cents": v["sd"], "bend_cents": corr[p]}
                           for p, v in tun.items()}
        y = midi.render(part.program, part.notes, [], length_s=C.duration + 6.0, gain=0.6, tuning=corr)
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
        lvl = arr.levels.get(key)
        if lvl:
            seg = seg * level_gain([(t - t_a, v) for t, v in lvl], len(seg))[:, None]
        if arr.holds:
            seg = seg * hold_gain(arr.holds, n, beat, HOLD_SCALE[part.inst])[a:b, None]
        seg = dsp.fade(seg, 0.0, 0.05)
        buf = fam.setdefault(part.inst, np.zeros((n, 2)))
        buf[a:a + len(seg)] += seg[: n - a]
    fam["sub"] = _sub_layer(arr, n)
    fam["pulse"] = _pulse_layer(arr, n)
    br = np.clip(dsp.curve(arr.bright, n, "cos"), 0, 1)
    th = thread.render(arr.thread_tones, n, br, seed=3)
    th = dsp.lp(dsp.hp(th, FX["thread"][0], 2), FX["thread"][1], 2)
    th = th * level_gain(arr.levels["thread"], n)[:, None]
    fam["thread"] = th
    for f in ("sub",):
        if arr.holds:
            fam[f] = fam[f] * hold_gain(arr.holds, n, beat, HOLD_SCALE[f])[:, None]
    if arr.holds:
        fam["thread"] = fam["thread"] * hold_gain(arr.holds, n, beat, HOLD_SCALE["thread"])[:, None]
    for f in list(fam):  # the rewind replaces everything but the thread
        if f != "thread":
            fam[f] = fam[f] * rw[:, None]

    # calibrate each family to its target loudness (deterministic)
    gains = {}
    for f, y in fam.items():
        L = dsp.lufs(y)
        g = TARGET_LUFS.get(f, -36.0) - L if L > -100 else 0.0
        gains[f] = round(g, 2)
        fam[f] = y * dsp.undb(g)

    # shared reverb sends (muted through the rewind), and the thread's own room
    mute = rw
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
    send = dsp.lp(dsp.hp(fam["thread"] * FX["thread"][3], 120, 2), 7000, 2)
    fam["verb-thread"] = dsp.convolve(send, dsp.make_ir("hall", 73))[:n]
    if report is not None:
        report["score"] = {
            "bpm": arr.g.bpm, "grid_offset": arr.g.offset, "beat_s": round(arr.g.beat, 5),
            "bar_s": round(arr.g.bar, 5), "sections": arr.sections,
            "chords": [{"t": round(v["t"], 3), "at": v["at"], "chord": v["chord"],
                        "voices": [NAMES[p % 12] + str(p // 12 - 1) for p in v["voices"]]} for v in arr.voicings],
            "parts": {k: len(p.notes) for k, p in arr.parts.items()},
            "thread_tones": len(arr.thread_tones),
            "pulse_events": len(arr.pulse), "family_gain_db": gains,
            "tuning": tuning_rep,
            "holds": [{"t": round(h["t"], 3), "dur": round(h["dur"], 3), "gain_db": h["gain_db"],
                       "at": arr.g.label(h["t"]), "scene": h.get("scene"),
                       "dip_db": {f: round(h["gain_db"] * k, 2) for f, k in HOLD_SCALE.items()},
                       "ramp_in_s": round(max(min(beat, h["dur"] / 3.0), 0.05), 3),
                       "ramp_out_s": round(1.5 * beat, 3)} for h in arr.holds],
            "grid_check": arr.grid_check(),
        }
    return fam, arr
