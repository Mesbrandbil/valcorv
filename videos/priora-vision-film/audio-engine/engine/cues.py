"""Cue and event input contract.

The engine reads cues/resolved.json (written by scripts/build-cues.mjs):

    {"cues": {name: seconds}, "scenes": {id: {"start", "duration"|"end"}},
     "lines": {Lxx: {"start", "end", "words": [{"w", "start", "end"}]}},
     "events": [{"t" | "at", "kind", ...}], "duration" | "film": {"duration"}}

Every cue the sound needs has a list of accepted names (the cue sheet's own
names first) and, if the cue sheet does not define it, a fallback derived from
the narration words (narration/timing.json supplies words when resolved.json
does not). Each resolved cue records where it came from, so a missing cue is
visible in the build report instead of silently wrong.
"""
from __future__ import annotations

import json
import os
import re


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(s).lower())


# name: (accepted names, fallback)
# fallback forms: ("word", [prefixes], after_cue or None, "start"|"end")
#                 ("line", line_id_or_None, "start"|"end", after_cue)  # first line starting after a cue
#                 ("expr", callable(C) -> seconds)
SPEC = {
    "l01": (["l01", "siteWakes"], ("word", ["every"], None, "start")),
    "hour": (["hour"], ("word", ["hour"], None, "start")),
    "contractors": (["contractors"], ("word", ["contractors"], None, "start")),
    "isolated": (["isolated"], ("word", ["isolated"], None, "start")),
    "workMoves": (["workMoves"], ("word", ["moves"], None, "start")),
    "insurance": (["insurance"], ("word", ["insurance"], None, "start")),
    "accepted": (["accepted"], ("word", ["accepted"], "insurance", "start")),
    "translate": (["translate"], ("word", ["translate"], "accepted", "start")),
    "permits": (["permits"], ("word", ["permits"], "accepted", "start")),
    "checklists": (["checklists"], ("word", ["checklists"], "accepted", "start")),
    "noOne": (["noOne", "movingSite", "l05"], ("word", ["but"], "checklists", "start")),
    "moving": (["moving"], ("word", ["moving"], "checklists", "start")),
    "head": (["head"], ("word", ["head"], "noOne", "start")),
    "roof03": (["roof03"], ("word", ["roof"], "head", "start")),
    "hotWork": (["hotWork"], ("word", ["hot"], "head", "start")),
    "safeguards": (["safeguards"], ("word", ["safeguards"], "hotWork", "start")),
    "inPlace": (["inPlace"], ("word", ["place"], "safeguards", "end")),
    "landing": (["landing"], ("expr", lambda C: C.word_time(["then", "sprinkler"], "inPlace", "start") - 0.25)),
    "offline": (["offline", "sz3Offline"], ("word", ["offline"], "inPlace", "start")),
    "nothingLooks": (["nothingLooks", "l08"], ("word", ["nothing"], "offline", "start")),
    "changed": (["changed", "conditionsChanged"], ("word", ["changed"], "nothingLooks", "start")),
    "nobody": (["nobody", "nobodySees"], ("word", ["nobody"], "nothingLooks", "start")),
    "afterwards": (["afterwards", "l09"], ("word", ["if"], "nobody", "start")),
    "q1": (["q1", "questions"], ("word", ["what"], "afterwards", "start")),
    "q3": (["q3"], ("word", ["can"], "q1", "start")),
    "gap": (["gap"], ("word", ["gap"], "afterwards", "start")),
    "tooLate": (["tooLate"], ("word", ["late"], "gap", "end")),
    "rewindStart": (["rewindStart"], ("expr", lambda C: C.word_time(["late"], "gap", "end") + 0.35)),
    "rewindEnd": (["rewindEnd", "resolve"], ("expr", lambda C: C.word_time(["what"], "rewindStart", "start") - 0.3)),
    "l12": (["l12"], ("word", ["what"], "rewindStart", "start")),
    "decisionWord": (["decisionWord"], ("word", ["decision"], "rewindStart", "start")),
    "worker": (["worker", "welding"], ("word", ["im", "i"], "l12", "start")),
    "workerEnd": (["six", "workerEnd"], ("word", ["six"], "worker", "end")),
    "connects": (["connects"], ("word", ["connects", "priora"], "worker", "start")),
    "keepsRecord": (["keepsRecord", "record"], ("word", ["record"], "connects", "start")),
    "prevention": (["prevention"], ("word", ["prevention"], "connects", "start")),
    "proof": (["proof"], ("word", ["proof"], "prevention", "start")),
    "l16": (["l16", "again"], ("line_after", "proof", "start")),
    "offline2": (["offline2", "offlineAgain"], ("word", ["offline"], "prevention", "start")),
    "sees": (["sees"], ("word", ["sees"], "offline2", "start")),
    "cross": (["cross"], ("expr", lambda C: C.line_end_at(C["sees"]) + 0.1)),
    "riskOwner": (["riskOwner", "l17"], ("line_after", "cross", "start")),
    "change": (["change"], ("word", ["change"], "cross", "start")),
    "retain": (["retain"], ("word", ["retain"], "change", "start")),
    "carriers": (["carriers", "transfer"], ("word", ["carriers"], "retain", "start")),
    "ordinary": (["ordinary"], ("word", ["ordinary"], "carriers", "start")),
    "decisionsL18": (["decisionsL18"], ("word", ["decisions"], "ordinary", "start")),
    "chainRecord": (["chainRecord"], ("word", ["record"], "decisionsL18", "start")),
    "chainTrust": (["chainTrust"], ("word", ["trust"], "chainRecord", "start")),
    "chainDecision": (["chainDecision"], ("word", ["decisions"], "chainTrust", "start")),
    "chainPrice": (["chainPrice"], ("word", ["price"], "chainDecision", "start")),
    "chainCapacity": (["chainCapacity"], ("word", ["capacity"], "chainPrice", "start")),
    "priora": (["priora", "mark", "wordmark", "latch"], ("word", ["priora"], "chainCapacity", "start")),
    "infrastructure": (["infrastructure", "descriptor"], ("word", ["infrastructure"], "priora", "start")),
}


class Cues:
    """Resolved cue times plus narration lines, words and scenes."""

    def __init__(self, resolved: dict, timing: dict | None = None):
        self.raw = {k: float(v) for k, v in (resolved.get("cues") or {}).items()
                    if isinstance(v, (int, float))}
        self._by_norm = {_norm(k): v for k, v in self.raw.items()}
        self.scenes = resolved.get("scenes") or {}
        dur = resolved.get("duration")
        if dur is None:
            dur = (resolved.get("film") or {}).get("duration")
        if dur is None and timing:
            dur = timing.get("duration_total")
        if dur is None:
            raise ValueError("resolved.json has no duration (top-level 'duration' or film.duration)")
        self.duration = float(dur)
        # lines: prefer resolved.json, take words from timing.json when missing
        lines = {k: dict(v) for k, v in (resolved.get("lines") or {}).items()}
        tl = (timing or {}).get("lines") or {}
        has_words = any(v.get("words") for v in lines.values())
        if not has_words and tl:
            # resolved.json carries no word timings: take whole lines from
            # timing.json so line spans and words come from one source
            lines = {k: dict(v) for k, v in tl.items()}
        self.lines = dict(sorted(lines.items(), key=lambda kv: float(kv[1].get("start", 0))))
        self.words = []
        for lid, ln in self.lines.items():
            for w in ln.get("words") or []:
                self.words.append((float(w["start"]), float(w["end"]), _norm(w.get("w", w.get("word", ""))), lid))
        self.words.sort()
        self.times: dict[str, float] = {}
        self.source: dict[str, str] = {}
        for name in SPEC:
            self._resolve(name)

    # --------------------------------------------------------- lookups
    def word_time(self, prefixes, after, which="start", strict=True):
        t0 = self[after] if isinstance(after, str) else (after or -1.0)
        for (s, e, w, lid) in self.words:
            if s < t0 - 1e-6:
                continue
            if any(w == _norm(p) or (len(_norm(p)) >= 4 and w.startswith(_norm(p))) for p in prefixes):
                return s if which == "start" else e
        if strict:
            raise KeyError(f"no word {prefixes} after {after}")
        return None

    def line_end_at(self, t):
        """End of the narration line that contains time t."""
        for lid, ln in self.lines.items():
            if float(ln["start"]) - 1e-3 <= t <= float(ln["end"]) + 1e-3:
                return float(ln["end"])
        raise KeyError(f"no line at {t}")

    def line_after(self, after, which="start"):
        t0 = self[after]
        for lid, ln in self.lines.items():
            if float(ln["start"]) > t0 + 1e-3:
                return float(ln[which])
        raise KeyError(f"no line after {after}")

    def _resolve(self, name):
        if name in self.times:
            return self.times[name]
        names, fb = SPEC[name]
        for n in names:
            if _norm(n) in self._by_norm:
                self.times[name] = self._by_norm[_norm(n)]
                self.source[name] = f"cue:{n}"
                return self.times[name]
        try:
            if fb[0] == "word":
                _, prefixes, after, which = fb
                t = self.word_time(prefixes, after, which)
            elif fb[0] == "line_after":
                t = self.line_after(fb[1], fb[2])
            else:
                t = fb[1](self)
            self.times[name] = float(t)
            self.source[name] = f"derived:{fb[0]}"
        except Exception as exc:  # noqa: BLE001
            self.times[name] = None
            msg = str(exc).strip("'\"")
            self.source[name] = "missing: " + (msg if "unresolved" not in msg else "depends on an unresolved cue")
        return self.times[name]

    def __getitem__(self, name) -> float:
        if name not in self.times:
            if name in SPEC:
                self._resolve(name)
            elif _norm(name) in self._by_norm:
                return self._by_norm[_norm(name)]
            else:
                raise KeyError(name)
        v = self.times[name]
        if v is None:
            raise KeyError(f"cue {name} unresolved: {self.source[name]}")
        return v

    def get(self, name, default=None):
        try:
            return self[name]
        except KeyError:
            return default

    def any(self, name):
        """Any cue in resolved.json by its own name (not only the SPEC ones)."""
        if _norm(name) in self._by_norm:
            return self._by_norm[_norm(name)]
        return self.get(name)

    # --------------------------------------------------------- speech
    def speech_spans(self):
        return [(float(v["start"]), float(v["end"])) for v in self.lines.values()]

    def speaking(self, t, pad=0.08) -> bool:
        return any(a - pad <= t <= b + pad for a, b in self.speech_spans())

    def nearest_gap(self, t, need=0.25, window=0.8):
        """Nudge a non-sync sound into the nearest pause in the narration."""
        best, bd = t, None
        for dt in [k * 0.02 for k in range(0, int(window / 0.02) + 1)]:
            for c in (t + dt, t - dt):
                if all(not self.speaking(c + u) for u in (0.0, need * 0.5, need)):
                    return c
        return best

    def report(self):
        return {k: {"t": (round(v, 3) if v is not None else None), "source": self.source[k]}
                for k, v in self.times.items()}


def load(resolved_path: str, timing_path: str | None = None) -> Cues:
    with open(resolved_path) as fh:
        resolved = json.load(fh)
    timing = None
    if timing_path and os.path.exists(timing_path):
        with open(timing_path) as fh:
            timing = json.load(fh)
    return Cues(resolved, timing)


# ---------------------------------------------------------------- events

# Accepted synonyms for event kinds used by the scenes
ALIASES = {
    "pencil": "pencil-stroke", "graphite": "pencil-stroke", "stroke": "pencil-stroke",
    "pen": "technical-pen", "tick": "pencil-tick", "check": "pencil-tick",
    "ruler": "ruler-contact", "set-square": "set-square-tap", "square": "set-square-tap",
    "slide": "paper-slide", "lift": "paper-lift", "page": "page-turn", "stack": "paper-stack",
    "relay": "relay-click", "solenoid": "solenoid-click", "valve": "valve-clunk",
    "verify": "confirm", "verified": "confirm", "append": "record-append",
    "snap": "align-snap", "latch-soft": "cross-snap", "pin": "paper-stack",
    "precision-snap": "snap-cluster", "chain-tick": "chain", "node": "node-pass",
}


def _event_time(ev: dict, cues: Cues, scenes: dict):
    if "t" in ev and isinstance(ev["t"], (int, float)) and not ev.get("space") == "scene":
        return float(ev["t"])
    at = ev.get("at")
    local = ev.get("local", ev.get("t"))
    if isinstance(at, str):
        m = re.match(r"^(cue|local):([^+-]+)([+-][0-9.]+)?$", at.strip())
        if m:
            kind, ref, off = m.group(1), m.group(2), float(m.group(3) or 0)
            if kind == "cue":
                return cues.any(ref) + off
            local = float(ref) + off
    sc = scenes.get(ev.get("scene")) if ev.get("scene") else None
    if sc is not None and local is not None:
        return float(sc.get("start", 0)) + float(local)
    raise ValueError(f"event without a usable time: {ev}")


def normalize_events(raw, cues: Cues, known_kinds) -> tuple[list, list]:
    """Returns (events, warnings). Each event: {t, kind, dur?, gain_db, pan, seed, ...}.

    Series are expanded ({"series": {"count", "every"}}), kinds pass through
    ALIASES, unknown kinds are reported and skipped.
    """
    if isinstance(raw, dict):
        items = list(raw.get("events") or [])
        for sid, evs in (raw.get("scenes") or {}).items():
            if isinstance(evs, list):
                for e in evs:
                    items.append(dict(e, scene=sid, space="scene"))
    else:
        items = list(raw or [])
    out, warns = [], []
    for k, ev in enumerate(items):
        try:
            t = _event_time(ev, cues, cues.scenes)
        except Exception as exc:  # noqa: BLE001
            warns.append(str(exc))
            continue
        kind = str(ev.get("kind", "")).strip().lower()
        kind = ALIASES.get(kind, kind)
        if kind not in known_kinds:
            warns.append(f"unknown kind '{ev.get('kind')}' at {t:.2f}s skipped")
            continue
        base = {kk: vv for kk, vv in ev.items() if kk not in ("t", "at", "local", "kind", "series")}
        base["kind"] = kind
        base["gain_db"] = float(ev.get("gain_db", ev.get("gain", 0.0)) or 0.0)
        ser = ev.get("series")
        count = int(ser.get("count", 1)) if isinstance(ser, dict) else 1
        every = float(ser.get("every", 0.5)) if isinstance(ser, dict) else 0.0
        for i in range(count):
            e = dict(base)
            e["t"] = t + i * every
            e.setdefault("index", i)
            e.setdefault("seed", 1000 + k * 37 + i)
            out.append(e)
    out.sort(key=lambda e: e["t"])
    return out, warns
