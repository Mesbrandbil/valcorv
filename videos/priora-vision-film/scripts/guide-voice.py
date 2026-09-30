#!/usr/bin/env python3
"""GUIDE narration for the Priora vision film, generated locally with Kokoro.

This is a guide voice only. ElevenLabs is the mandated final voice
(scripts/elevenlabs-voice.py); the guide exists so the film can be built and
reviewed while api.elevenlabs.io is unreachable. Every output is labelled guide.

What it does
  1. Voice selection (cached in narration/takes/guide/voice-selection.json):
     synthesises test material with each candidate British voice and scores
     objective measures, since nobody can listen here:
       pitch variability (semitone spread; composed but not monotone,
       conversational but not theatrical), speaking rate stability across
       sentences, harmonic-to-noise ratio (clarity, the inverse of breathiness),
       spectral flatness of voiced frames (breathiness / noise), spectral
       balance (presence versus warmth band), forced-alignment agreement
       (articulation), plus the Kokoro model card quality grade as a prior.
  2. Synthesis: each line is split into sentences; each sentence is
     phonemised (espeak-ng en-gb via Kokoro) with pronunciation overrides
     (Priora -> pri-OR-a), synthesised, and joined with the designed inner
     pauses from lines.json. Nothing is time-stretched.
  3. Word timing: pocketsphinx 5 forced alignment of the known text per
     sentence, edges refined against signal energy, verified against energy
     pauses. Documented fallback: proportional alignment over voiced regions
     (flagged in the take JSON).
  4. Output: narration/takes/guide/<id>.wav (48 kHz, 24-bit, mono) and
     <id>.json (word timings relative to the take start).
  5. --fit-total: tunes the narrator speed so the assembled film (pacing plan
     intact) lands on the target total, iterating on the real synthesis.

Usage
  python3 scripts/guide-voice.py                     # all lines, cached voices/speed
  python3 scripts/guide-voice.py --fit-total 90      # tune narrator speed, then write
  python3 scripts/guide-voice.py --select-voices     # re-run voice selection
  python3 scripts/guide-voice.py --lines L14a,L20    # regenerate some lines
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
import time
from pathlib import Path

import numpy as np

_spec = importlib.util.spec_from_file_location("narration_common", Path(__file__).with_name("narration-common.py"))
nc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(nc)

KOKORO_DIR = Path("/root/.cache/kokoro")
MODEL = KOKORO_DIR / "kokoro-v1.0.onnx"
VOICES = KOKORO_DIR / "voices-v1.0.bin"
KSR = 24000
OUT_DIR = nc.TAKES / "guide"
SELECTION_PATH = OUT_DIR / "voice-selection.json"
HEAD_PAD, TAIL_PAD = 0.12, 0.20
SEG_LEAD, SEG_TAIL = 0.01, 0.03  # kept around each sentence when joining

# Overall quality grades published on the Kokoro-82M model card (VOICES.md,
# hexgrad), reflecting the amount and quality of each voice's training data.
MODEL_CARD_GRADE = {
    "bf_emma": "B-", "bf_isabella": "C", "bf_alice": "D", "bf_lily": "D",
    "bm_george": "C", "bm_fable": "C", "bm_lewis": "D+", "bm_daniel": "D",
}
GRADE_VALUE = {"A": 1.0, "B": 0.8, "C": 0.6, "D": 0.4, "F": 0.2}

# Scoring material. Narrator: real script lines covering statements, lists,
# questions and the longest sentences. Worker: the worker line plus casual site
# phrases used only for scoring (never in the film).
NARRATOR_TEST_LINES = ["L01", "L03", "L05", "L08", "L10", "L14a", "L14b", "L17"]
WORKER_TEST_TEXT = [
    "I'm welding on Roof oh-three until six.",
    "Yeah, the fire watch is with me for the whole job.",
    "The extinguisher is by the hatch, and the area is clear.",
]

# Targets that encode the voice direction as numbers.
TARGETS = {
    "narrator": {
        "pitch_std_st": 2.6,   # composed conversational spread; <1.6 monotone, >3.8 theatrical
        "pitch_tol": 1.1,
        "presence_minus_warmth_db": -11.0,  # warm but clear balance
        "balance_tol": 6.0,
    },
    "worker": {
        "pitch_std_st": 2.4,
        "pitch_tol": 1.2,
        "presence_minus_warmth_db": -10.0,
        "balance_tol": 6.0,
    },
}
WEIGHTS = {"pitch": 0.22, "stability": 0.18, "clarity": 0.16, "breath": 0.12,
           "balance": 0.1, "alignment": 0.1, "model_card": 0.12}


def log(*a):
    print(*a, flush=True)


# --------------------------------------------------------------------------
# Kokoro
# --------------------------------------------------------------------------

_KOKORO = None


def kokoro():
    global _KOKORO
    if _KOKORO is None:
        from kokoro_onnx import Kokoro

        _KOKORO = Kokoro(str(MODEL), str(VOICES))
    return _KOKORO


def phonemes_for(text: str, data: dict, lang: str) -> str:
    """espeak-ng phonemes for text, with lines.json pronunciation overrides."""
    k = kokoro()
    ph = k.tokenizer.phonemize(text, lang)
    for word, e in (data.get("pronunciations") or {}).items():
        if not e.get("guide_ipa"):
            continue
        if word.lower() in text.lower():
            default = k.tokenizer.phonemize(word, lang).rstrip(".")
            wanted = e["guide_ipa"]
            if default not in ph:
                default = e.get("guide_espeak_default", default)
            if default not in ph:
                raise RuntimeError(f"cannot find espeak phonemes {default!r} for {word!r} in {ph!r}")
            ph = ph.replace(default, wanted)
    return ph


def synth_segment(text: str, voice: str, speed: float, data: dict, lang: str) -> np.ndarray:
    ph = phonemes_for(text, data, lang)
    audio, sr = kokoro().create(ph, voice=voice, speed=speed, lang=lang, is_phonemes=True, trim=True)
    assert sr == KSR
    return np.asarray(audio, dtype=np.float32)


def segments_of(line: dict, engine: str = "guide") -> list[tuple[str, list[str]]]:
    toks = nc.tokens(nc.spoken_text(line, engine))
    return [(" ".join(toks[a:b]), toks[a:b]) for a, b in nc.split_sentences(toks, include_colon=True)]


def inner_pauses(line: dict, data: dict, segs) -> list[float]:
    if "guide_inner_pauses" in line:
        p = list(line["guide_inner_pauses"])
        if len(p) != len(segs) - 1:
            raise ValueError(f"{line['id']}: guide_inner_pauses needs {len(segs) - 1} values, has {len(p)}")
        return p
    d = data["engines"]["guide"]["default_inner_pause"]
    return [d.get(s[1][-1].rstrip("\"')")[-1], 0.3) for s in segs[:-1]]


def render_line(line: dict, data: dict, voice: str, speed: float, lang: str) -> dict:
    """Synthesise one line, align it, and return audio + timing (24 kHz)."""
    segs = segments_of(line)
    pauses = inner_pauses(line, data, segs)
    parts, times, seg_meta, synth_dur = [np.zeros(int(HEAD_PAD * KSR), np.float32)], [], [], 0.0
    cursor = HEAD_PAD
    methods, fallbacks, prons = set(), 0, []
    # Optional per-line delivery pace (lines.json "pace", default 1.0): lets the
    # opening, the key beats and the close run slower than the global speed.
    speed = speed * float(line.get("pace", 1.0))
    for si, (text, toks) in enumerate(segs):
        y = synth_segment(text, voice, speed, data, lang)
        al = nc.align_clip(y, KSR, text, data)
        # Cut the sentence to its own speech (Kokoro leaves up to ~0.25 s of
        # low-level tail) so the inserted pause is the pause the listener hears,
        # measured speech to speech exactly like the gaps between lines.
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
        synth_dur += len(y) / KSR
        methods.add(al["method"].split(" ")[0])
        fallbacks += int(al["fallback"])
        for c in nc.pronunciation_checks(al["details"], text, data):
            c["segment"] = si
            prons.append(c)
        times += [(cursor + t0 - shift, cursor + t1 - shift) for t0, t1 in al["times"]]
        seg_meta.append({"text": text, "start": round(cursor, 3), "end": round(cursor + len(y) / KSR, 3),
                         "alignment_quality": al["quality"], "fallback": al["fallback"]})
        parts.append(y)
        cursor += len(y) / KSR
        if si < len(segs) - 1:
            gap = max(0.0, pauses[si] - SEG_LEAD - SEG_TAIL)
            parts.append(np.zeros(int(round(gap * KSR)), np.float32))
            cursor += int(round(gap * KSR)) / KSR
    parts.append(np.zeros(int(TAIL_PAD * KSR), np.float32))
    y = np.concatenate(parts)
    q = nc.verify_alignment(times, y, KSR)
    return {"audio": y, "times": times, "segments": seg_meta, "synth_speech": synth_dur,
            "inner_pauses": pauses, "methods": sorted(methods), "fallbacks": fallbacks,
            "quality": q, "pronunciation": prons}


# --------------------------------------------------------------------------
# Voice analysis
# --------------------------------------------------------------------------

_CMU = None


def syllables(word: str) -> int:
    global _CMU
    if _CMU is None:
        from pocketsphinx import get_model_path

        _CMU = {}
        for ln in open(Path(get_model_path()) / "en-us" / "cmudict-en-us.dict", encoding="utf-8"):
            parts = ln.split()
            w = parts[0]
            if "(" in w:
                continue
            _CMU[w] = sum(1 for p in parts[1:] if p.rstrip("012") in nc._ARPA_VOWELS)
    w = word.lower()
    if w in _CMU:
        return max(1, _CMU[w])
    if w == "priora":
        return 3
    return max(1, len(nc._VOWELS.findall(w)))


def hnr_db(y: np.ndarray, sr: int, f0: np.ndarray, voiced: np.ndarray, hop: int, fmin: float, fmax: float) -> float:
    vals = []
    win = int(0.04 * sr)
    for i in np.flatnonzero(voiced)[::2]:
        a = i * hop
        f = y[a:a + win].astype(np.float64)
        if len(f) < win:
            continue
        f = (f - f.mean()) * np.hanning(win)
        if np.sum(f * f) < 1e-7:
            continue
        ac = np.correlate(f, f, "full")[win - 1:]
        w_ac = np.correlate(np.hanning(win), np.hanning(win), "full")[win - 1:]
        ac = ac / ac[0] / (w_ac / w_ac[0] + 1e-9)
        lo, hi = int(sr / fmax), min(int(sr / fmin), win - 1)
        r = float(np.clip(np.max(ac[lo:hi]), 1e-4, 0.9999))
        vals.append(10 * math.log10(r / (1 - r)))
    return float(np.median(vals)) if vals else float("nan")


def analyse_voice(voice: str, role: str, data: dict, lang: str, speed: float = 1.0) -> dict:
    import librosa
    from scipy.signal import welch

    L = nc.line_by_id(data)
    if role == "narrator":
        texts = [s for lid in NARRATOR_TEST_LINES for s, _ in segments_of(L[lid])]
    else:
        texts = WORKER_TEST_TEXT
    ys, rates, aligns, prons = [], [], [], []
    for t in texts:
        y = synth_segment(t, voice, speed, data, lang)
        al = nc.align_clip(y, KSR, t, data)
        span = al["times"][-1][1] - al["times"][0][0]
        syl = sum(syllables(w) for tok in nc.tokens(t) for w in nc.aligner_words(tok, data.get("pronunciations")))
        rates.append(syl / max(span, 0.2))
        aligns.append(al["quality"]["pause_agreement"] * (0.0 if al["fallback"] else 1.0))
        prons += nc.pronunciation_checks(al["details"], t, data)
        ys.append(y)
    y = np.concatenate([np.concatenate([a, np.zeros(int(0.2 * KSR), np.float32)]) for a in ys])
    sr16 = 16000
    y16 = nc.resample(y, KSR, sr16)
    fmin, fmax = (110.0, 420.0) if role == "narrator" else (60.0, 240.0)
    hop = 160
    f0, vflag, _ = librosa.pyin(y16, fmin=fmin, fmax=fmax, sr=sr16, frame_length=1024, hop_length=hop)
    ok = vflag & ~np.isnan(f0)
    f = f0[ok]
    st = 12 * np.log2(f / np.median(f))
    # Robust spread: pYIN makes occasional octave errors, which a plain standard
    # deviation turns into false "theatrical" readings. The 10th to 90th
    # percentile range divided by 2.563 equals sigma for a normal distribution.
    robust_sigma = float(np.percentile(st, 90) - np.percentile(st, 10)) / 2.563
    hnr = hnr_db(y16, sr16, f0, ok, hop, fmin, fmax)
    vy = np.concatenate([y[i * hop * 3 // 2: i * hop * 3 // 2 + 240] for i in np.flatnonzero(ok)])
    fr, P = welch(vy, KSR, nperseg=2048)

    def band(a, b):
        return 10 * math.log10(float(P[(fr >= a) & (fr < b)].sum()) + 1e-20)

    flat = librosa.feature.spectral_flatness(y=vy, n_fft=1024, hop_length=512)[0]
    rates = np.array(rates)
    return {
        "voice": voice,
        "role": role,
        "f0_median_hz": round(float(np.median(f)), 1),
        "pitch_std_semitones": round(robust_sigma, 2),
        "pitch_plain_std_semitones": round(float(st.std()), 2),
        "pitch_range_p10_p90_semitones": round(float(np.percentile(st, 90) - np.percentile(st, 10)), 2),
        "articulation_rate_syll_per_s": round(float(rates.mean()), 2),
        "rate_cv": round(float(rates.std() / rates.mean()), 3),
        "hnr_db": round(hnr, 2),
        "voiced_spectral_flatness": round(float(np.median(flat)), 5),
        "presence_minus_warmth_db": round(band(2000, 5000) - band(150, 500), 2),
        "air_minus_presence_db": round(band(6000, 11000) - band(2000, 5000), 2),
        "alignment_agreement": round(float(np.mean(aligns)), 3),
        "priora_ok": all(p["intended"] for p in prons) if prons else None,
        "model_card_grade": MODEL_CARD_GRADE.get(voice),
        "test_segments": len(texts),
    }


def score_voices(metrics: list[dict], role: str) -> list[dict]:
    t = TARGETS[role]
    flats = [m["voiced_spectral_flatness"] for m in metrics]
    fmin, fmax = min(flats), max(flats)
    out = []
    for m in metrics:
        g = m.get("model_card_grade") or "D"
        gv = GRADE_VALUE[g[0]] + (0.05 if g.endswith("+") else -0.05 if g.endswith("-") else 0.0)
        parts = {
            "pitch": math.exp(-((m["pitch_std_semitones"] - t["pitch_std_st"]) / t["pitch_tol"]) ** 2),
            "stability": float(np.clip(1 - m["rate_cv"] / 0.25, 0, 1)),
            "clarity": float(np.clip((m["hnr_db"] - 3.0) / 12.0, 0, 1)),
            "breath": 1.0 - 0.6 * ((m["voiced_spectral_flatness"] - fmin) / (fmax - fmin + 1e-12)),
            "balance": math.exp(-((m["presence_minus_warmth_db"] - t["presence_minus_warmth_db"]) / t["balance_tol"]) ** 2),
            "alignment": m["alignment_agreement"],
            "model_card": gv,
        }
        score = sum(WEIGHTS[k] * v for k, v in parts.items())
        if m.get("priora_ok") is False:
            score -= 0.1
        out.append({**m, "components": {k: round(v, 3) for k, v in parts.items()}, "score": round(score, 4)})
    return sorted(out, key=lambda r: -r["score"])


def select_voices(data: dict, lang: str) -> dict:
    g = data["engines"]["guide"]
    result = {"created": nc.now_iso(), "method": "objective scoring, nobody can listen in this environment",
              "weights": WEIGHTS, "targets": TARGETS, "model_card_grades": MODEL_CARD_GRADE}
    for role, key in (("narrator", "narrator_candidates"), ("worker", "worker_candidates")):
        ms = []
        for v in g[key]:
            t0 = time.time()
            ms.append(analyse_voice(v, role, data, lang))
            log(f"  analysed {v:12s} ({role}) in {time.time() - t0:.1f}s")
        ranked = score_voices(ms, role)
        result[role] = {"ranking": ranked, "chosen": ranked[0]["voice"]}
        log(f"  {role} ranking: " + ", ".join(f"{r['voice']} {r['score']:.3f}" for r in ranked))
    return result


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------


def generate(data: dict, ids: list[str], voices: dict, speeds: dict, lang: str) -> dict:
    out = {}
    for line in data["lines"]:
        if line["id"] not in ids:
            continue
        role = line["speaker"]
        r = render_line(line, data, voices[role], speeds[role], lang)
        out[line["id"]] = r
    return out


def speech_span(r: dict) -> float:
    """Same measure the assembly uses to place the line (energy edges)."""
    on, off = nc.take_speech_bounds(r["audio"], KSR, r["times"][0][0], r["times"][-1][1])
    return off - on


def word_span(r: dict) -> float:
    return r["times"][-1][1] - r["times"][0][0]


def project(data: dict, rendered: dict) -> float:
    return nc.place(data, {k: speech_span(v) for k, v in rendered.items()})["total"]


def write_takes(data: dict, rendered: dict, voices: dict, speeds: dict, lang: str) -> None:
    L = nc.line_by_id(data)
    for lid, r in rendered.items():
        line = L[lid]
        y48 = nc.resample(r["audio"], KSR, nc.OUT_SR)
        peak = float(np.max(np.abs(y48)))
        if peak > 0.98:
            y48 = y48 * (0.98 / peak)
        words = nc.words_from_times(line, "guide", r["times"])
        q = r["quality"]
        meta = {
            "provider": "kokoro-onnx 0.6.1, kokoro-v1.0.onnx (local guide)",
            "voice": {"id": voices[line["speaker"]], "lang": lang},
            "speed": speeds[line["speaker"]],
            "inner_pauses": r["inner_pauses"],
            "segments_synth": r["segments"],
            "alignment": {"method": "+".join(r["methods"]), "fallback": r["fallbacks"] > 0,
                          "quality": q, "quality_ok": nc.quality_ok(q)},
            "pronunciation_checks": r["pronunciation"],
        }
        nc.write_take(OUT_DIR, line, "guide", y48, words, meta)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lines", help="comma separated line ids (default: all)")
    ap.add_argument("--narrator-voice")
    ap.add_argument("--worker-voice")
    ap.add_argument("--speed", type=float, help="narrator speed (Kokoro, 0.5 to 2.0)")
    ap.add_argument("--worker-speed", type=float)
    ap.add_argument("--select-voices", action="store_true", help="re-run objective voice selection")
    ap.add_argument("--fit-total", type=float, help="tune narrator speed so the assembled total lands here")
    ap.add_argument("--tolerance", type=float, default=0.25)
    ap.add_argument("--no-write-back", action="store_true", help="do not store chosen voices/speed in lines.json")
    args = ap.parse_args()

    data = nc.load_lines()
    g = data["engines"]["guide"]
    lang = g.get("lang", "en-gb")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if args.select_voices or (not SELECTION_PATH.exists() and not (g.get("narrator_voice") and g.get("worker_voice"))):
        log("Voice selection (objective measures):")
        sel = select_voices(data, lang)
        SELECTION_PATH.write_text(nc.dump_json(sel), encoding="utf-8")
        g["narrator_voice"], g["worker_voice"] = sel["narrator"]["chosen"], sel["worker"]["chosen"]
    elif SELECTION_PATH.exists() and not (g.get("narrator_voice") and g.get("worker_voice")):
        sel = json.loads(SELECTION_PATH.read_text())
        g["narrator_voice"], g["worker_voice"] = sel["narrator"]["chosen"], sel["worker"]["chosen"]
    voices = {"narrator": args.narrator_voice or g["narrator_voice"], "worker": args.worker_voice or g["worker_voice"]}
    speeds = {"narrator": args.speed or g.get("narrator_speed", 1.0), "worker": args.worker_speed or g.get("worker_speed", 1.0)}
    log(f"Voices: narrator {voices['narrator']} @ {speeds['narrator']}, worker {voices['worker']} @ {speeds['worker']}")

    all_ids = [l["id"] for l in data["lines"]]
    ids = args.lines.split(",") if args.lines else all_ids
    unknown = set(ids) - set(all_ids)
    if unknown:
        raise SystemExit(f"unknown line ids: {sorted(unknown)}")

    if args.fit_total:
        ids = all_ids
        rendered = generate(data, ids, voices, speeds, lang)
        for it in range(6):
            total = project(data, rendered)
            log(f"  fit {it}: narrator speed {speeds['narrator']:.4f} -> projected total {total:.2f}s")
            if abs(total - args.fit_total) <= args.tolerance:
                break
            var = sum(r["synth_speech"] for lid, r in rendered.items() if nc.line_by_id(data)[lid]["speaker"] == "narrator")
            want = var - (total - args.fit_total)
            s = float(np.clip(speeds["narrator"] * var / want, 0.7, 1.4))
            speeds["narrator"] = round(s, 4)
            narr = [l for l in ids if nc.line_by_id(data)[l]["speaker"] == "narrator"]
            rendered.update(generate(data, narr, voices, speeds, lang))
        else:
            log("WARNING: speed fitting did not converge within tolerance")
    else:
        rendered = generate(data, ids, voices, speeds, lang)

    write_takes(data, rendered, voices, speeds, lang)

    if not args.no_write_back:
        g["narrator_voice"], g["worker_voice"] = voices["narrator"], voices["worker"]
        g["narrator_speed"], g["worker_speed"] = speeds["narrator"], speeds["worker"]
        nc.LINES_PATH.write_text(nc.dump_json(data), encoding="utf-8")

    log("\nGUIDE takes written to narration/takes/guide (not final; ElevenLabs replaces them)")
    log(f"{'id':5s} {'dur':>6s} {'speech':>6s} {'words':>5s} {'w/s':>5s} {'pause_agree':>11s} {'on_err':>6s} {'off_err':>7s}  method")
    for lid in ids:
        r = rendered[lid]
        span = word_span(r)
        n = len(r["times"])
        q = r["quality"]
        log(f"{lid:5s} {len(r['audio']) / KSR:6.2f} {span:6.2f} {n:5d} {n / span:5.2f} {q['pause_agreement']:11.2f} "
            f"{q['onset_error_ms']:6.0f} {q['offset_error_ms']:7.0f}  {'+'.join(r['methods'])}{' FALLBACK' if r['fallbacks'] else ''}")
        for p in r["pronunciation"]:
            log(f"      {p['word']}: aligner chose {p['chosen_variant']} (intended={p['intended']}, "
                f"longest vowel {p['longest_vowel']})")
    if len(ids) == len(all_ids):
        log(f"Projected total with pacing plan: {project(data, rendered):.2f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
