#!/usr/bin/env python3
"""Assemble the narration track and its timing data from per-line takes.

    python3 scripts/assemble-narration.py --engine guide
    python3 scripts/assemble-narration.py --engine elevenlabs

Reads narration/lines.json (pacing plan) and narration/takes/<engine>/<id>.wav
+ <id>.json, then:

  * trims each take to its speech (energy edges anchored to the aligned first
    and last word) keeping a 40 ms pad on both sides, with 5 ms edge fades;
  * evens out take-to-take level differences by half the deviation from the
    median line loudness (at most 3 dB), so generation differences disappear
    but the performance keeps its own dynamics;
  * applies a subtle close-mic treatment to the worker line only (140 Hz
    high-pass, +2.5 dB presence at 3.2 kHz, faint small-room early
    reflections and a very short tail, 2 dB under the narrator);
  * places every line by the pacing plan: designed silence is measured from
    the end of one line's speech to the start of the next;
  * normalises the voice stem to -18 LUFS integrated with a true-peak ceiling
    of -1 dBTP (gain only, no limiting, no time-stretching);
  * writes assets/audio/voice.wav (48 kHz, 24-bit, mono),
    narration/timing.json (absolute film seconds) and narration/captions.vtt.

Takes are never mixed across engines: a missing take is an error.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

_spec = importlib.util.spec_from_file_location("narration_common", Path(__file__).with_name("narration-common.py"))
nc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(nc)

SR = nc.OUT_SR
VOICE_OUT = nc.ROOT / "assets" / "audio" / "voice.wav"
TIMING_OUT = nc.NARRATION / "timing.json"
VTT_OUT = nc.NARRATION / "captions.vtt"
FADE = 0.005


# --------------------------------------------------------------------------
# Worker close-mic treatment
# --------------------------------------------------------------------------


def _peaking(f0: float, gain_db: float, q: float, sr: int):
    a = 10 ** (gain_db / 40)
    w0 = 2 * math.pi * f0 / sr
    alpha = math.sin(w0) / (2 * q)
    b = np.array([1 + alpha * a, -2 * math.cos(w0), 1 - alpha * a])
    den = np.array([1 + alpha / a, -2 * math.cos(w0), 1 - alpha / a])
    return b / den[0], den / den[0]


def small_room_ir(sr: int) -> np.ndarray:
    """Deterministic small-room impulse response: direct sound, six early
    reflections (4 to 26 ms, -19 to -29 dB) and a 0.2 s diffuse tail at about
    -31 dB, the reflections low-passed at 6 kHz as soft walls would."""
    n = int(0.26 * sr)
    refl = np.zeros(n)
    taps = [(0.0043, -19), (0.0071, -21), (0.0109, -23), (0.0152, -25), (0.0197, -27), (0.0261, -29)]
    for k, (t, g) in enumerate(taps):
        refl[int(t * sr)] += (1 if k % 2 == 0 else -1) * 10 ** (g / 20)
    rng = np.random.default_rng(3031)
    t = np.arange(n) / sr
    tail = rng.standard_normal(n) * np.exp(-t / (0.2 / 6.91)) * 10 ** (-31 / 20)
    tail[: int(0.012 * sr)] = 0
    refl += tail * 0.6
    refl = sosfilt(butter(2, 6000, "lowpass", fs=sr, output="sos"), refl)
    ir = refl
    ir[0] += 1.0
    return ir


def worker_treatment(y: np.ndarray, sr: int) -> np.ndarray:
    y = sosfilt(butter(2, 140, "highpass", fs=sr, output="sos"), y.astype(np.float64))
    b, a = _peaking(3200, 2.5, 0.9, sr)
    y = lfilter(b, a, y)
    ir = small_room_ir(sr)
    return fftconvolve(y, ir)[: len(y) + int(0.22 * sr)].astype(np.float32)


# --------------------------------------------------------------------------
# Assembly
# --------------------------------------------------------------------------


def fmt_vtt(t: float) -> str:
    t = max(0.0, t)
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t - 3600 * h - 60 * m
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--engine", required=True, choices=["guide", "elevenlabs"])
    ap.add_argument("--takes-dir", help="override narration/takes/<engine>")
    ap.add_argument("--target-lufs", type=float, default=-18.0)
    ap.add_argument("--ceiling-dbtp", type=float, default=-1.0)
    ap.add_argument("--out-voice", default=str(VOICE_OUT))
    ap.add_argument("--out-timing", default=str(TIMING_OUT))
    ap.add_argument("--out-vtt", default=str(VTT_OUT))
    ap.add_argument("--strict", action="store_true", help="exit 2 when the total is outside the allowed range")
    args = ap.parse_args()

    data = nc.load_lines()
    pacing = data["pacing"]
    pad = pacing.get("edge_pad", 0.04)
    tdir = Path(args.takes_dir) if args.takes_dir else nc.TAKES / args.engine
    missing = [l["id"] for l in data["lines"] if not (tdir / f"{l['id']}.wav").exists() or not (tdir / f"{l['id']}.json").exists()]
    if missing:
        print(f"ERROR: {args.engine} takes missing in {tdir}: {', '.join(missing)}", file=sys.stderr)
        return 1

    clips = {}
    for line in data["lines"]:
        lid = line["id"]
        doc, y = nc.read_take(tdir, lid)
        if doc["engine"] != args.engine:
            print(f"ERROR: {lid} take is engine {doc['engine']}, expected {args.engine}", file=sys.stderr)
            return 1
        if doc["text"] != line["text"]:
            print(f"ERROR: {lid} take text differs from lines.json; regenerate it", file=sys.stderr)
            return 1
        words = doc["words"]
        on, off = nc.speech_edges(y, SR, words[0]["start"], words[-1]["end"])
        on, off = min(on, words[0]["start"]), max(off, words[-1]["end"])
        a = max(0, int(round((on - pad) * SR)))
        b = min(len(y), int(round((off + pad) * SR)))
        seg = y[a:b].astype(np.float64).copy()
        nf = int(FADE * SR)
        seg[:nf] *= np.linspace(0, 1, nf)
        seg[-nf:] *= np.linspace(1, 0, nf)
        clips[lid] = {"doc": doc, "audio": seg, "clip_offset": a / SR, "onset": on, "offset": off,
                      "lufs": nc.lufs(seg, SR)}

    narr = [c["lufs"] for lid, c in clips.items() if c["doc"]["speaker"] == "narrator"]
    ref = float(np.median(narr))
    for lid, c in clips.items():
        if c["doc"]["speaker"] == "narrator":
            gain = float(np.clip(0.5 * (ref - c["lufs"]), -3.0, 3.0))
            c["audio"] = c["audio"] * 10 ** (gain / 20)
        else:
            treated = worker_treatment(c["audio"], SR)
            gain = (ref - 2.0) - nc.lufs(treated[: len(c["audio"])], SR)
            c["audio"] = treated * 10 ** (gain / 20)
        c["gain_db"] = round(gain, 2)

    placement = nc.place(data, {lid: c["offset"] - c["onset"] for lid, c in clips.items()})
    total = placement["total"]
    n = int(math.ceil(total * SR))
    track = np.zeros(n + SR, dtype=np.float64)
    timing_lines, order = {}, []
    for line in data["lines"]:
        lid = line["id"]
        c = clips[lid]
        s_abs, e_abs = placement["lines"][lid]
        shift = s_abs - c["onset"]  # take time -> film time
        clip_start = c["onset"] - pad + shift
        i0 = int(round(clip_start * SR))
        seg = c["audio"]
        track[i0:i0 + len(seg)] += seg
        words = [{"w": w["w"], "start": round(w["start"] + shift, 3), "end": round(w["end"] + shift, 3)}
                 for w in c["doc"]["words"]]
        sentences = [{"text": s["text"], "start": round(s["start"] + shift, 3), "end": round(s["end"] + shift, 3)}
                     for s in c["doc"]["sentences"]]
        timing_lines[lid] = {
            "start": words[0]["start"],
            "end": words[-1]["end"],
            "speaker": line["speaker"],
            "text": line["text"],
            "section": line.get("section"),
            "pre_gap": line.get("pre_gap", 0.0),
            "gap_after": line.get("gap_after", 0.0),
            "clip": {"start": round(clip_start, 3), "end": round(clip_start + len(seg) / SR, 3)},
            "gain_db": c["gain_db"],
            "words": words,
            "sentences": sentences,
        }
        order.append(lid)
    track = track[:n]

    integ = nc.lufs(track, SR)
    gain = args.target_lufs - integ
    tp = nc.true_peak_db(track * 10 ** (gain / 20))
    if tp > args.ceiling_dbtp:
        gain -= tp - args.ceiling_dbtp
    track *= 10 ** (gain / 20)
    final_lufs, final_tp = nc.lufs(track, SR), nc.true_peak_db(track)
    Path(args.out_voice).parent.mkdir(parents=True, exist_ok=True)
    nc.write_wav(Path(args.out_voice), track.astype(np.float32), SR, "PCM_24")

    sections = {}
    for lid in order:
        t = timing_lines[lid]
        s = sections.setdefault(t["section"], {"start": t["start"], "end": t["end"], "lines": []})
        s["end"] = t["end"]
        s["lines"].append(lid)
    rewind = None
    for idx, line in enumerate(data["lines"]):
        if idx and line.get("pre_gap", 0.0) >= 2.0:
            prev = order[idx - 1]
            rewind = {"start": timing_lines[prev]["end"], "end": timing_lines[line["id"]]["start"],
                      "designed_pre_gap": line["pre_gap"], "after_line": prev, "before_line": line["id"],
                      "note": f"Silence from the end of {prev} to the start of {line['id']}: the signature rewind."}
            break
    takes_meta = {lid: {"voice": clips[lid]["doc"].get("voice"), "speed": clips[lid]["doc"].get("speed"),
                        "alignment_method": (clips[lid]["doc"].get("alignment") or {}).get("method"),
                        "alignment_fallback": (clips[lid]["doc"].get("alignment") or {}).get("fallback")}
                  for lid in order}
    speech_words = sum(len(timing_lines[l]["words"]) for l in order)
    speech_time = sum(timing_lines[l]["end"] - timing_lines[l]["start"] for l in order)
    timing = {
        "schema": "priora-narration-timing/1",
        "engine": args.engine,
        "guide": args.engine == "guide",
        "label": ("GUIDE narration (local Kokoro). Build and review only; re-lock to ElevenLabs before final."
                  if args.engine == "guide" else "ElevenLabs narration"),
        "sample_rate": SR,
        "duration_total": round(total, 3),
        "lead_in": pacing["lead_in"],
        "end_hold": pacing["end_hold"],
        "audio": str(Path(args.out_voice).resolve().relative_to(nc.ROOT)) if Path(args.out_voice).resolve().is_relative_to(nc.ROOT) else args.out_voice,
        "captions": str(Path(args.out_vtt).resolve().relative_to(nc.ROOT)) if Path(args.out_vtt).resolve().is_relative_to(nc.ROOT) else args.out_vtt,
        "time_base": "absolute film seconds from 0.000; word end = end of the word's last phone",
        "loudness": {"integrated_lufs": round(final_lufs, 2), "true_peak_dbtp": round(final_tp, 2),
                     "target_lufs": args.target_lufs, "ceiling_dbtp": args.ceiling_dbtp},
        "speech": {"words": speech_words, "speech_seconds": round(speech_time, 2),
                   "words_per_second": round(speech_words / speech_time, 3)},
        "rewind": rewind,
        "sections": sections,
        "line_order": order,
        "takes": takes_meta,
        "lines": timing_lines,
        "created": nc.now_iso(),
    }
    Path(args.out_timing).write_text(nc.dump_json(timing), encoding="utf-8")

    cues = []
    for lid in order:
        t = timing_lines[lid]
        for s in t["sentences"]:
            cues.append({"start": s["start"], "end": s["end"], "text": s["text"], "speaker": t["speaker"]})
    vtt = ["WEBVTT", ""]
    if args.engine == "guide":
        vtt += ["NOTE", "Guide narration timing (local Kokoro voice). Regenerate after the ElevenLabs take.", ""]
    for i, c in enumerate(cues):
        nxt = cues[i + 1]["start"] if i + 1 < len(cues) else total
        end = min(c["end"] + 0.6, max(c["end"], nxt - 0.05))
        text = f"<v Worker>{c['text']}" if c["speaker"] == "worker" else c["text"]
        vtt += [str(i + 1), f"{fmt_vtt(c['start'])} --> {fmt_vtt(end)}", text, ""]
    Path(args.out_vtt).write_text("\n".join(vtt), encoding="utf-8")

    print(f"Engine: {args.engine}{'  (GUIDE, not final)' if args.engine == 'guide' else ''}")
    print(f"{'id':5s} {'start':>7s} {'end':>7s} {'dur':>5s} {'words':>5s} {'w/s':>5s} {'gain':>5s}  text")
    for lid in order:
        t = timing_lines[lid]
        d = t["end"] - t["start"]
        print(f"{lid:5s} {t['start']:7.2f} {t['end']:7.2f} {d:5.2f} {len(t['words']):5d} {len(t['words']) / d:5.2f} "
              f"{t['gain_db']:5.1f}  {t['text'][:60]}")
    print(f"Speech: {speech_words} words in {speech_time:.2f}s of speech = {speech_words / speech_time:.2f} words/s")
    print(f"Voice stem: {final_lufs:.1f} LUFS integrated, {final_tp:.1f} dBTP true peak -> {args.out_voice}")
    print(f"TOTAL DURATION: {total:.2f}s")
    ok = pacing["min_total"] <= total <= pacing["max_total"]
    if not ok:
        print(f"WARNING: total {total:.2f}s is outside {pacing['min_total']}-{pacing['max_total']}s. "
              "Adjust the voice speed (not the designed gaps).")
        if args.strict:
            return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
