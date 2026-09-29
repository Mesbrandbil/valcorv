#!/usr/bin/env python3
"""Agreed route: split and force-align uploaded narration audio into takes.

Use this for the ElevenLabs narration generated in the ElevenLabs web app
(the route agreed with the user, see BRIEF.md) and exported as a file. The
file must contain every line of narration/lines.json once, in order (the
worker line may instead come from a second file with --worker-audio, or be
left out with --exclude L13 when a worker take already exists).

    python3 scripts/align-uploaded.py uploads/priora-narration.mp3
    python3 scripts/align-uploaded.py narrator.wav --worker-audio worker.wav
    python3 scripts/align-uploaded.py narrator.wav --exclude L13

Steps
  1. Decode the file (any format ffmpeg reads) to 48 kHz mono.
  2. Force-align the complete script against the whole file with pocketsphinx 5
     (Priora may be spoken from either 'Priora' or a respelling; Roof 03 as
     'oh three'). Fallback when that fails: choose the line boundaries among
     the file's silences so line lengths best match the text (dynamic
     programming), then align each line on its own.
  3. Cut between lines at the quietest 10 ms frame of each inter-line gap.
  4. Re-align each cut line on its own for exact word timings, verify them
     against the signal, and check the Priora pronunciation.
  5. Write narration/takes/elevenlabs/<id>.wav + <id>.json in the same format
     as scripts/elevenlabs-voice.py, then run
     `python3 scripts/assemble-narration.py --engine elevenlabs`.
"""

from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path

import numpy as np

_spec = importlib.util.spec_from_file_location("narration_common", Path(__file__).with_name("narration-common.py"))
nc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(nc)

SR = nc.OUT_SR
HEAD, TAIL = 0.25, 0.35  # context kept around each line inside its cut range


def log(*a):
    print(*a, flush=True)


def line_tokens(lines: list[dict], engine: str) -> tuple[list[str], list[int]]:
    toks, owner = [], []
    for i, l in enumerate(lines):
        t = nc.tokens(nc.spoken_text(l, engine))
        toks += t
        owner += [i] * len(t)
    return toks, owner


def global_alignment(y: np.ndarray, lines: list[dict], data: dict, engine: str) -> list[tuple[float, float]] | None:
    """Per-line (first word start, last word end) from one pass over the file."""
    toks, owner = line_tokens(lines, engine)
    y16 = nc.resample(y, SR, nc.ALIGN_SR)
    try:
        res = nc.refine_with_energy(nc.forced_align(y16, toks, data), y16)
    except nc.AlignmentError as err:
        log(f"  global forced alignment failed: {err}")
        return None
    spans = []
    for i in range(len(lines)):
        ts = [res["tokens"][k] for k in range(len(toks)) if owner[k] == i]
        spans.append((ts[0]["start"], ts[-1]["end"]))
    return spans


def _line_aligns(y: np.ndarray, span: tuple[float, float], line: dict, data: dict, engine: str) -> bool:
    i0, i1 = int(max(0.0, span[0] - 0.05) * SR), int((span[1] + 0.05) * SR)
    clip = y[i0:i1]
    if len(clip) < SR * 0.2:
        return False
    y16 = nc.resample(clip, SR, nc.ALIGN_SR)
    try:
        res = nc.refine_with_energy(nc.forced_align(y16, nc.tokens(nc.spoken_text(line, engine)), data), y16)
    except nc.AlignmentError:
        return False
    q = nc.verify_alignment([(t["start"], t["end"]) for t in res["tokens"]], y16, nc.ALIGN_SR)
    return q["pause_agreement"] >= 0.99 and q["onset_error_ms"] <= 120 and q["offset_error_ms"] <= 200


def silence_split(y: np.ndarray, lines: list[dict], data: dict, engine: str) -> list[tuple[float, float]]:
    """Fallback when the whole-file alignment fails.

    1. Candidate boundaries are the file's silences of 0.2 s or more.
    2. Dynamic programming picks len(lines)-1 of them so every line's length
       best matches its expected length (syllable weight of its words plus
       0.35 s for each sentence break inside the line), preferring longer
       silences.
    3. Repair: each line is force-aligned inside its span; where a line fails
       (a boundary landed on a pause inside a line), the boundary moves to a
       neighbouring silence until both lines on either side align.
    """
    db = nc.frame_db(y, SR)
    quiet = nc.silence_mask(db, 38.0)
    on, off = nc.energy_bounds(y, SR, 40.0)
    pauses = [p for p in nc.pauses_from_mask(quiet, 0.2) if p[0] > on and p[1] < off]
    k = len(lines) - 1
    if len(pauses) < k:
        raise SystemExit(f"cannot split: found {len(pauses)} silences of 0.2 s or more, need {k}. "
                         "Is every line in the file, with a pause between lines?")
    inner = np.array([len(nc.split_sentences(nc.tokens(nc.spoken_text(l, engine)), True)) - 1 for l in lines])
    w = np.array([sum(nc._weight(t) for t in nc.tokens(nc.spoken_text(l, engine))) for l in lines])
    total = off - on
    between = sum(b - a for a, b in pauses) * 0.5
    rate = max(1e-3, (total - between - 0.35 * inner.sum()) / w.sum())
    share = (w * rate + 0.35 * inner) / total
    P = len(pauses)
    mids = [(a + b) / 2 for a, b in pauses]
    lens = [b - a for a, b in pauses]
    INF = 1e18
    cost = np.full((k, P), INF)
    back = np.full((k, P), -1, dtype=int)
    for p in range(P):
        cost[0][p] = ((mids[p] - on) / total - share[0]) ** 2 - 0.002 * lens[p]
    for j in range(1, k):
        for p in range(j, P):
            best, arg = INF, -1
            for q in range(j - 1, p):
                c = cost[j - 1][q] + ((mids[p] - mids[q]) / total - share[j]) ** 2
                if c < best:
                    best, arg = c, q
            cost[j][p] = best - 0.002 * lens[p]
            back[j][p] = arg
    final = [cost[k - 1][p] + ((off - mids[p]) / total - share[k]) ** 2 if cost[k - 1][p] < INF else INF
             for p in range(P)]
    p = int(np.argmin(final))
    chosen = [p]
    for j in range(k - 1, 0, -1):
        p = back[j][p]
        chosen.append(p)
    chosen = sorted(chosen)

    def spans_of(ch):
        out, start = [], on
        for q in ch:
            out.append((start, pauses[q][0]))
            start = pauses[q][1]
        out.append((start, off))
        return out

    ok = [None] * len(lines)

    def line_ok(i, sp):
        return _line_aligns(y, sp[i], lines[i], data, engine)

    for sweep in range(3):
        changed = False
        sp = spans_of(chosen)
        ok = [line_ok(i, sp) for i in range(len(lines))]
        for j in range(k):
            if ok[j] and ok[j + 1]:
                continue
            lo = chosen[j - 1] + 1 if j else 0
            hi = chosen[j + 1] - 1 if j + 1 < k else P - 1
            for cand in sorted(range(lo, hi + 1), key=lambda q: abs(q - chosen[j])):
                if cand == chosen[j]:
                    continue
                trial = chosen[:j] + [cand] + chosen[j + 1:]
                tsp = spans_of(trial)
                if line_ok(j, tsp) and line_ok(j + 1, tsp):
                    log(f"  repair: boundary {j + 1} moved from silence {chosen[j]} to {cand}")
                    chosen, changed = trial, True
                    ok[j] = ok[j + 1] = True
                    break
        if not changed:
            break
    failed = [lines[i]["id"] for i in range(len(lines)) if not ok[i]]
    if failed:
        log(f"  WARNING: silence split could not verify lines {failed}; check the file order and content")
    return spans_of(chosen)


def cut_points(y: np.ndarray, spans: list[tuple[float, float]]) -> list[float]:
    db = nc.frame_db(y, SR)
    cuts = []
    for (_, e0), (s1, _) in zip(spans, spans[1:]):
        a, b = int(e0 / nc.FRAME), int(s1 / nc.FRAME)
        if b <= a + 1:
            log(f"  WARNING: no gap between lines at {e0:.2f}s; cutting at the boundary")
            cuts.append((e0 + s1) / 2)
            continue
        i = a + int(np.argmin(db[a:b]))
        cuts.append((i + 0.5) * nc.FRAME)
    return cuts


def process_file(path: Path, lines: list[dict], data: dict, engine: str, out_dir: Path, label: str) -> list[dict]:
    y, _ = nc.read_audio(path, SR)
    log(f"{label}: {path} ({len(y) / SR:.2f}s, {len(lines)} lines)")
    spans = global_alignment(y, lines, data, engine)
    method = "global pocketsphinx alignment"
    if spans is None:
        spans = silence_split(y, lines, data, engine)
        method = "silence split (dynamic programming)"
    cuts = cut_points(y, spans) if len(lines) > 1 else []
    bounds = [0.0] + cuts + [len(y) / SR]
    out = []
    for i, line in enumerate(lines):
        lo, hi = bounds[i], bounds[i + 1]
        a = max(lo, spans[i][0] - HEAD)
        b = min(hi, spans[i][1] + TAIL)
        i0, i1 = int(round(a * SR)), int(round(b * SR))
        clip = y[i0:i1].copy()
        spoken = nc.spoken_text(line, engine)
        al = nc.align_clip(clip, SR, spoken, data)
        times, how = al["times"], al["method"]
        q = al["quality"]
        words = nc.words_from_times(line, engine, times)
        meta = {
            "provider": "uploaded audio",
            "source_file": str(path),
            "source_offset": round(a, 4),
            "split_method": method,
            "voice": {"id": None, "note": "uploaded performance"},
            "alignment": {"method": how, "fallback": al["fallback"], "quality": q, "quality_ok": nc.quality_ok(q)},
            "pronunciation_checks": nc.pronunciation_checks(al["details"], spoken, data),
        }
        nc.write_take(out_dir, line, engine, clip, words, meta)
        out.append({"id": line["id"], "offset": a, "dur": len(clip) / SR, "words": words, "quality": q,
                    "fallback": al["fallback"], "pron": meta["pronunciation_checks"]})
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio", help="uploaded narration file (wav, mp3, m4a, flac ...)")
    ap.add_argument("--worker-audio", help="separate file holding the worker line(s)")
    ap.add_argument("--exclude", default="", help="comma separated line ids not present in the file")
    ap.add_argument("--engine", default="elevenlabs", choices=["elevenlabs", "guide"],
                    help="take set to write (and spoken text to expect)")
    ap.add_argument("--out-dir", help="default narration/takes/<engine>")
    args = ap.parse_args()

    data = nc.load_lines()
    out_dir = Path(args.out_dir) if args.out_dir else nc.TAKES / args.engine
    excl = {x for x in args.exclude.split(",") if x}
    unknown = excl - {l["id"] for l in data["lines"]}
    if unknown:
        log(f"unknown line ids: {sorted(unknown)}")
        return 1
    main_lines = [l for l in data["lines"] if l["id"] not in excl and not (args.worker_audio and l["speaker"] == "worker")]
    results = process_file(Path(args.audio), main_lines, data, args.engine, out_dir, "main file")
    if args.worker_audio:
        wl = [l for l in data["lines"] if l["speaker"] == "worker" and l["id"] not in excl]
        results += process_file(Path(args.worker_audio), wl, data, args.engine, out_dir, "worker file")

    log(f"\n{'id':5s} {'offset':>7s} {'clip':>5s} {'words':>5s} {'pause_agree':>11s} {'on_err':>6s}  notes")
    bad = 0
    for r in results:
        q = r["quality"]
        notes = []
        if r["fallback"]:
            notes.append("FALLBACK timing")
        for p in r["pron"]:
            notes.append(f"{p['word']} {'OK' if p['intended'] else 'CHECK ' + p['chosen_variant']}")
        if not nc.quality_ok(q):
            notes.append("CHECK alignment")
            bad += 1
        log(f"{r['id']:5s} {r['offset']:7.2f} {r['dur']:5.2f} {len(r['words']):5d} {q['pause_agreement']:11.2f} "
            f"{q['onset_error_ms']:6.0f}  {' | '.join(notes)}")
    log(f"\nWrote {len(results)} takes to {out_dir}. Next: python3 scripts/assemble-narration.py --engine {args.engine}")
    return 0 if bad == 0 else 3


if __name__ == "__main__":
    sys.exit(main())
