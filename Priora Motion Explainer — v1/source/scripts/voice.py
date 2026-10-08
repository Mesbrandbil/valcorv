#!/usr/bin/env python3
"""Voiceover for the Priora motion explainer, generated locally with Kokoro.

Reads narration/lines.json (text, designed start 'at' and latest end 'by' for each
line), synthesises every line sentence by sentence, aligns each word with
pocketsphinx (scripts/narration-common.py), fits the pace of any line that would
overrun its window, places the first word of each line exactly on 'at', treats the
worker line as a phone voice note, and writes:

  narration/takes/<id>.wav, <id>.json   one take per line (48 kHz, 24-bit, mono)
  assets/audio/voice.wav                 the voice stem, exactly the film length
  assets/audio/worker-dry.wav            the worker line alone (for the waveform drawing)
  narration/timing.json                  absolute word, sentence and line times
  assets/js/pk-cues.js                   the same timing as window.PK_VO for the picture

Usage (from the project root):
  python3 scripts/voice.py              # all lines
  python3 scripts/voice.py --lines L03  # regenerate some lines, reuse the other takes
"""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

_spec = importlib.util.spec_from_file_location("narration_common", Path(__file__).with_name("narration-common.py"))
nc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(nc)

ROOT = nc.ROOT
LINES = ROOT / "narration" / "lines.json"
TAKES = ROOT / "narration" / "takes"
KOKORO_DIR = Path("/root/.cache/kokoro")
KSR = 24000
SR = nc.OUT_SR
SEG_LEAD, SEG_TAIL = 0.03, 0.06
MAX_SPEED = 1.16

_K = None


def kokoro():
    global _K
    if _K is None:
        from kokoro_onnx import Kokoro

        _K = Kokoro(str(KOKORO_DIR / "kokoro-v1.0.onnx"), str(KOKORO_DIR / "voices-v1.0.bin"))
    return _K


def phonemes_for(text: str, data: dict, lang: str) -> str:
    k = kokoro()
    ph = k.tokenizer.phonemize(text, lang)
    for word, e in (data.get("pronunciations") or {}).items():
        if word.lower() not in text.lower() or not e.get("guide_ipa"):
            continue
        default = k.tokenizer.phonemize(word, lang).rstrip(".")
        if default not in ph:
            default = e.get("guide_espeak_default", default)
        if default not in ph:
            raise RuntimeError(f"cannot find phonemes {default!r} for {word!r} in {ph!r}")
        ph = ph.replace(default, e["guide_ipa"])
    return ph


def synth(text: str, voice: str, speed: float, data: dict, lang: str) -> np.ndarray:
    audio, sr = kokoro().create(phonemes_for(text, data, lang), voice=voice, speed=speed, lang=lang,
                                is_phonemes=True, trim=True)
    assert sr == KSR
    return np.asarray(audio, dtype=np.float32)


def render_line(line: dict, data: dict, speed: float) -> dict:
    g = data["engines"]["guide"]
    lang = g["lang"]
    voice = g["narrator_voice"] if line["speaker"] == "narrator" else g["worker_voice"]
    toks = nc.tokens(line["text"])
    segs = [(" ".join(toks[a:b]), toks[a:b]) for a, b in nc.split_sentences(toks, include_colon=True)]
    pauses = g["default_inner_pause"]
    parts, times, cursor, prons, fallbacks = [], [], 0.0, [], 0
    for si, (text, stoks) in enumerate(segs):
        y = synth(text, voice, speed, data, lang)
        al = nc.align_clip(y, KSR, text, data)
        fallbacks += int(al["fallback"])
        first, last = al["times"][0][0], al["times"][-1][1]
        on, off = nc.speech_edges(y, KSR, first, last)
        on, off = min(on, first), max(off, last)
        a = max(0, int(round((on - SEG_LEAD) * KSR)))
        b = min(len(y), int(round((off + SEG_TAIL) * KSR)))
        y = y[a:b].copy()
        nf = int(0.004 * KSR)
        y[:nf] *= np.linspace(0, 1, nf, dtype=np.float32)
        y[-nf:] *= np.linspace(1, 0, nf, dtype=np.float32)
        shift = a / KSR
        times += [(cursor + t0 - shift, cursor + t1 - shift) for t0, t1 in al["times"]]
        for c in nc.pronunciation_checks(al["details"], text, data):
            prons.append(c)
        parts.append(y)
        cursor += len(y) / KSR
        if si < len(segs) - 1:
            end_char = stoks[-1].rstrip("\"')")[-1]
            gap = max(0.0, pauses.get(end_char, 0.3) - SEG_LEAD - SEG_TAIL)
            parts.append(np.zeros(int(round(gap * KSR)), np.float32))
            cursor += int(round(gap * KSR)) / KSR
    y24 = np.concatenate(parts)
    y48 = nc.resample(y24, KSR, SR).astype(np.float32)
    y48 *= 0.7 / (np.max(np.abs(y48)) + 1e-9)  # takes are peak-normalised; the stem sets loudness
    speech = times[-1][1] - times[0][0]
    return {"y": y48, "times": times, "speech": speech, "speed": speed, "voice": voice,
            "prons": prons, "fallbacks": fallbacks}


def fit_line(line: dict, data: dict) -> dict:
    g = data["engines"]["guide"]
    base = g["narrator_speed"] if line["speaker"] == "narrator" else g["worker_speed"]
    window = line["by"] - line["at"]
    r = render_line(line, data, base)
    for _ in range(4):
        if r["speech"] <= window or r["speed"] >= MAX_SPEED:
            break
        speed = min(MAX_SPEED, r["speed"] * (r["speech"] / window) * 1.015)
        r = render_line(line, data, speed)
    r["window"] = window
    return r


def phone_voice_note(y: np.ndarray, sr: int) -> np.ndarray:
    """A phone voice message: band limited, a little compressed and warm, with a quiet room under it."""
    sos_hp = butter(2, 280, "highpass", fs=sr, output="sos")
    sos_lp = butter(4, 4200, "lowpass", fs=sr, output="sos")
    sos_pk = butter(2, [1400, 2600], "bandpass", fs=sr, output="sos")
    v = sosfilt(sos_lp, sosfilt(sos_hp, y))
    v = v + 0.35 * sosfilt(sos_pk, v)
    peak = np.max(np.abs(v)) + 1e-9
    v = np.tanh(2.2 * v / peak) / np.tanh(2.2) * peak
    rng = np.random.default_rng(20261007)
    room = rng.standard_normal(len(v)).astype(np.float32)
    room = sosfilt(butter(2, [180, 1600], "bandpass", fs=sr, output="sos"), room)
    room *= 0.0035 / (np.std(room) + 1e-9)
    t = np.arange(len(v)) / sr
    hum = 0.0016 * np.sin(2 * np.pi * 110 * t) + 0.0009 * np.sin(2 * np.pi * 220 * t)
    fade = np.minimum(1, np.minimum(t / 0.08, (t[-1] - t) / 0.12))
    return ((v + room + hum) * fade).astype(np.float32)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lines", default="")
    args = ap.parse_args()
    data = json.loads(LINES.read_text(encoding="utf-8"))
    total = float(data["film_duration"])
    want = set(filter(None, args.lines.split(",")))
    TAKES.mkdir(parents=True, exist_ok=True)

    renders = {}
    for line in data["lines"]:
        lid = line["id"]
        take_json = TAKES / f"{lid}.json"
        if want and lid not in want and take_json.exists():
            doc, y = nc.read_take(TAKES, lid)
            renders[lid] = {"y": y, "doc": doc}
            continue
        r = fit_line(line, data)
        words = nc.words_from_times(line, "guide", r["times"])
        meta = {"provider": data["engines"]["guide"]["provider"], "voice": r["voice"],
                "speed": round(r["speed"], 4), "window": round(r["window"], 3),
                "fallback_words": r["fallbacks"], "pronunciation_checks": r["prons"]}
        nc.write_take(TAKES, line, "guide", r["y"], words, meta)
        doc, y = nc.read_take(TAKES, lid)
        renders[lid] = {"y": y, "doc": doc}
        print(f"{lid}: speech {r['speech']:.2f}s in window {r['window']:.2f}s at speed {r['speed']:.3f}"
              f"{'  FALLBACK' if r['fallbacks'] else ''}"
              + "".join(f"  Priora {'OK' if c['intended'] else 'CHECK'}" for c in r["prons"]), flush=True)

    n = int(round(total * SR))
    stem = np.zeros(n, np.float32)
    worker_dry = np.zeros(n, np.float32)
    worker_stem = np.zeros(n, np.float32)
    timing = {"schema": "priora-explainer-timing/1", "engine": "kokoro (local)", "duration_total": total,
              "sample_rate": SR, "lines": {}, "line_order": [l["id"] for l in data["lines"]]}
    narrator_words = 0
    for line in data["lines"]:
        lid = line["id"]
        doc, y = renders[lid]["doc"], renders[lid]["y"]
        first = doc["words"][0]["start"]
        offset = line["at"] - first
        if line["speaker"] == "worker":
            yv = phone_voice_note(y, SR)
        else:
            yv = y
            narrator_words += len(doc["words"])
        a = int(round(offset * SR))
        b = a + len(yv)
        if a < 0 or b > n:
            raise SystemExit(f"{lid} does not fit in the film ({offset:.2f}s offset)")
        stem[a:b] += yv
        if line["speaker"] == "worker":
            worker_dry[a:b] += y
            worker_stem[a:b] += yv
        words = [{"w": w["w"], "start": round(w["start"] + offset, 3), "end": round(w["end"] + offset, 3)}
                 for w in doc["words"]]
        sents = [{"text": s["text"], "start": round(s["start"] + offset, 3), "end": round(s["end"] + offset, 3)}
                 for s in doc["sentences"]]
        end = words[-1]["end"]
        if end > line["by"] + 0.05:
            print(f"WARNING {lid}: ends at {end:.2f}, window ends {line['by']:.2f}")
        timing["lines"][lid] = {"speaker": line["speaker"], "section": line["section"], "text": line["text"],
                                "start": words[0]["start"], "end": end, "clip": [round(offset, 3), round(b / SR, 3)],
                                "words": words, "sentences": sents}

    # Loudness: narrator stem to about -19 LUFS with a -2 dBTP ceiling (the mix engine adds the rest).
    gain = 10 ** ((-19.0 - nc.lufs(stem, SR)) / 20)
    stem *= gain
    worker_dry *= gain
    worker_stem *= gain
    tp = nc.true_peak_db(stem)
    if tp > -2.0:
        k = 10 ** ((-2.0 - tp) / 20)
        stem *= k
        worker_stem *= k
    nc.write_wav(ROOT / "assets" / "audio" / "voice.wav", stem, SR)
    # the same voice split in two stems: the narrator (removed in the no-narration version)
    # and the worker's voice note (part of the story, kept in both versions)
    nc.write_wav(ROOT / "assets" / "audio" / "voice-worker.wav", worker_stem, SR)
    nc.write_wav(ROOT / "assets" / "audio" / "voice-narrator.wav", stem - worker_stem, SR)
    nc.write_wav(ROOT / "assets" / "audio" / "worker-dry.wav", worker_dry, SR)

    # The worker's waveform for the voice-note drawing: 40 bars per second of RMS.
    w = timing["lines"]["W01"]
    a, b = int(w["clip"][0] * SR), int(w["clip"][1] * SR)
    seg = worker_dry[a:b]
    hop = SR // 40
    env = [float(np.sqrt(np.mean(seg[i:i + hop] ** 2) + 1e-12)) for i in range(0, len(seg) - hop, hop)]
    mx = max(env)
    timing["worker_envelope"] = {"start": w["clip"][0], "rate": 40, "values": [round(v / mx, 3) for v in env]}

    timing["narrator_words"] = narrator_words
    (ROOT / "narration" / "timing.json").write_text(json.dumps(timing, indent=1), encoding="utf-8")
    js = ("/* Generated by scripts/voice.py from narration/lines.json. Do not edit by hand. */\n"
          "window.PK_VO = " + json.dumps(timing, separators=(",", ":")) + ";\n")
    (ROOT / "assets" / "js" / "pk-cues.js").write_text(js, encoding="utf-8")
    print(f"narrator words: {narrator_words}; stem LUFS {nc.lufs(stem, SR):.1f}, true peak {nc.true_peak_db(stem):.1f} dBTP")


if __name__ == "__main__":
    main()
