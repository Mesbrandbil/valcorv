"""Shared narration helpers for the Priora vision film.

Loaded by guide-voice.py, elevenlabs-voice.py, align-uploaded.py and
assemble-narration.py through importlib (the file name is kebab-case, so it is
not importable with a plain import statement):

    import importlib.util, pathlib
    spec = importlib.util.spec_from_file_location(
        "narration_common", pathlib.Path(__file__).with_name("narration-common.py"))
    nc = importlib.util.module_from_spec(spec); spec.loader.exec_module(nc)

It holds everything that must behave identically across engines: the line
table, tokenisation of display text versus spoken text, forced alignment with
pocketsphinx, the energy based verification of word boundaries, the documented
proportional fallback aligner, audio IO, and the take JSON format.
"""

from __future__ import annotations

import datetime as _dt
import json
import math
import re
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parent.parent
NARRATION = ROOT / "narration"
LINES_PATH = NARRATION / "lines.json"
TAKES = NARRATION / "takes"
OUT_SR = 48000
ALIGN_SR = 16000
TAKE_SCHEMA = "priora-narration-take/1"
FRAME = 0.01  # 10 ms analysis frames, the aligner's frame rate

# --------------------------------------------------------------------------
# Line table
# --------------------------------------------------------------------------


def load_lines(path: Path = LINES_PATH) -> dict:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    validate_lines(data)
    return data


def validate_lines(data: dict) -> None:
    ids = set()
    for line in data["lines"]:
        lid = line["id"]
        if lid in ids:
            raise ValueError(f"duplicate line id {lid}")
        ids.add(lid)
        if line["speaker"] not in ("narrator", "worker"):
            raise ValueError(f"{lid}: speaker must be narrator or worker")
        if "—" in line["text"]:
            raise ValueError(f"{lid}: em dash in display text")
        n = len(tokens(line["text"]))
        for engine in ("guide", "elevenlabs"):
            spoken = spoken_text(line, engine)
            m = len(tokens(spoken))
            if m != n:
                raise ValueError(
                    f"{lid}: {engine} spoken text has {m} tokens but display text has {n}; "
                    "respellings must keep one spoken token per displayed token"
                )


def spoken_text(line: dict, engine: str) -> str:
    return (line.get("tts_text") or {}).get(engine) or line["text"]


def line_by_id(data: dict) -> dict:
    return {l["id"]: l for l in data["lines"]}


# --------------------------------------------------------------------------
# Tokens
# --------------------------------------------------------------------------

_EDGE_PUNCT = "\"'‘’“”.,;:!?()[]"


def tokens(text: str) -> list[str]:
    return text.split()


def clean_token(tok: str) -> str:
    """Display word without surrounding punctuation (keeps I'm, activity-level)."""
    t = tok.strip(_EDGE_PUNCT)
    return t.replace("’", "'")


def ends_sentence(tok: str) -> bool:
    return tok.rstrip("\"'”’)").endswith((".", "?", "!"))


def ends_segment(tok: str) -> bool:
    """Segment ends are sentence ends plus a colon (used for synthesis splits)."""
    return ends_sentence(tok) or tok.rstrip("\"'”’)").endswith(":")


def split_sentences(toks: list[str], include_colon: bool = False) -> list[tuple[int, int]]:
    """Token index ranges [a, b) for each sentence."""
    out, a = [], 0
    for i, t in enumerate(toks):
        if (ends_segment(t) if include_colon else ends_sentence(t)):
            out.append((a, i + 1))
            a = i + 1
    if a < len(toks):
        out.append((a, len(toks)))
    return out


_ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
_TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def _num_words(n: int) -> list[str]:
    if n < 20:
        return [_ONES[n]]
    if n < 100:
        return [_TENS[n // 10]] + ([_ONES[n % 10]] if n % 10 else [])
    return [str(n)]


def aligner_words(tok: str, pronunciations: dict | None = None) -> list[str]:
    """Words the acoustic aligner should look for when this spoken token is said."""
    t = clean_token(tok)
    low = t.lower()
    for key, entry in (pronunciations or {}).items():
        forms = {key.lower()}
        for k in ("elevenlabs", "guide_text"):
            if entry.get(k):
                forms.add(entry[k].lower().strip(_EDGE_PUNCT))
        if low in forms:
            return [entry.get("aligner_word", key.lower())]
    out = []
    for part in re.split(r"[-–/]", low):
        part = part.strip(_EDGE_PUNCT)
        if not part:
            continue
        if part.isdigit():
            if len(part) == 2 and part[0] == "0":
                out += ["oh"] + _num_words(int(part[1]))
            else:
                out += _num_words(int(part))
        else:
            out.append(re.sub(r"[^a-z']", "", part))
    return [w for w in out if w]


# --------------------------------------------------------------------------
# Audio
# --------------------------------------------------------------------------


def read_audio(path: Path, sr: int | None = None) -> tuple[np.ndarray, int]:
    """Read any audio file as mono float32; resample when sr is given."""
    path = Path(path)
    try:
        y, fs = sf.read(str(path), dtype="float32", always_2d=True)
        y = y.mean(axis=1)
    except Exception:
        y, fs = decode_with_ffmpeg(path.read_bytes(), sr or OUT_SR), (sr or OUT_SR)
    if sr and fs != sr:
        y, fs = resample(y, fs, sr), sr
    return y.astype(np.float32), fs


def decode_with_ffmpeg(data: bytes, sr: int = OUT_SR) -> np.ndarray:
    """Decode encoded audio bytes (mp3, m4a, ...) to mono float32 at sr."""
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", "pipe:0",
         "-ac", "1", "-ar", str(sr), "-f", "f32le", "pipe:1"],
        input=data, capture_output=True, check=False,
    )
    if proc.returncode != 0 or not proc.stdout:
        raise RuntimeError(f"ffmpeg could not decode audio: {proc.stderr.decode(errors='replace')[:400]}")
    return np.frombuffer(proc.stdout, dtype=np.float32).copy()


def resample(y: np.ndarray, fs: int, target: int) -> np.ndarray:
    if fs == target:
        return y
    g = math.gcd(fs, target)
    return resample_poly(y, target // g, fs // g).astype(np.float32)


def write_wav(path: Path, y: np.ndarray, sr: int = OUT_SR, subtype: str = "PCM_24") -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    peak = float(np.max(np.abs(y))) if len(y) else 0.0
    if peak > 1.0:
        raise ValueError(f"refusing to write clipped audio to {path} (peak {peak:.3f})")
    sf.write(str(path), y.astype(np.float32), sr, subtype=subtype)


def frame_db(y: np.ndarray, sr: int, frame: float = FRAME) -> np.ndarray:
    """RMS level per 10 ms frame in dBFS."""
    n = int(round(frame * sr))
    m = len(y) // n
    if m == 0:
        return np.array([-120.0])
    e = np.sqrt(np.mean(y[: m * n].reshape(m, n).astype(np.float64) ** 2, axis=1))
    return 20 * np.log10(e + 1e-9)


def speech_reference_db(db: np.ndarray) -> float:
    return float(np.percentile(db, 95))


def silence_mask(db: np.ndarray, rel: float = 38.0, floor: float = -62.0) -> np.ndarray:
    ref = speech_reference_db(db)
    return db < max(ref - rel, floor)


def pauses_from_mask(quiet: np.ndarray, min_len: float, frame: float = FRAME) -> list[tuple[float, float]]:
    out, i, n = [], 0, len(quiet)
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            if (j - i) * frame >= min_len:
                out.append((i * frame, j * frame))
            i = j
        else:
            i += 1
    return out


def energy_bounds(y: np.ndarray, sr: int, rel: float = 40.0) -> tuple[float, float]:
    """First and last non-silent instants of a clip (seconds)."""
    db = frame_db(y, sr)
    loud = ~silence_mask(db, rel)
    idx = np.flatnonzero(loud)
    if len(idx) == 0:
        return 0.0, len(y) / sr
    return idx[0] * FRAME, (idx[-1] + 1) * FRAME


def speech_edges(y: np.ndarray, sr: int, first_start: float, last_end: float,
                 rel: float = 40.0) -> tuple[float, float]:
    """Refine a take's speech onset and offset around the aligned first/last word.

    The search window is anchored to the word timings so that pre-breaths,
    mouth clicks or decoder padding far from the words never extend the clip.
    """
    db = frame_db(y, sr)
    loud = ~silence_mask(db, rel)
    n = len(db)
    a0 = max(0, int((first_start - 0.12) / FRAME))
    a1 = min(n, int((first_start + 0.10) / FRAME) + 1)
    onset = first_start
    for i in range(a0, a1):
        if loud[i] and loud[min(i + 1, n - 1)]:
            onset = i * FRAME
            break
    b0 = max(0, int((last_end - 0.10) / FRAME))
    b1 = min(n, int((last_end + 0.25) / FRAME) + 1)
    offset = last_end
    last_loud = None
    for i in range(b0, b1):
        if loud[i]:
            last_loud = i
    if last_loud is not None:
        offset = (last_loud + 1) * FRAME
    return max(0.0, onset), min(len(y) / sr, max(offset, onset + 0.05))


def lufs(y: np.ndarray, sr: int) -> float:
    import pyloudnorm as pyln

    meter = pyln.Meter(sr, block_size=0.4 if len(y) / sr >= 0.8 else max(0.1, len(y) / sr / 2))
    return float(meter.integrated_loudness(y.astype(np.float64)))


def true_peak_db(y: np.ndarray) -> float:
    up = resample_poly(y.astype(np.float64), 4, 1)
    return 20 * math.log10(float(np.max(np.abs(up))) + 1e-12)


# --------------------------------------------------------------------------
# Forced alignment (pocketsphinx 5)
# --------------------------------------------------------------------------


class AlignmentError(RuntimeError):
    pass


def _decoder(extra_prons: dict[str, list[str]]):
    from pocketsphinx import Decoder

    d = Decoder(samprate=ALIGN_SR, bestpath=False, loglevel="FATAL")
    for word, prons in extra_prons.items():
        for k, p in enumerate(prons):
            d.add_word(word if k == 0 else f"{word}({k + 1})", p, True)
    return d


def custom_prons(data: dict) -> dict[str, list[str]]:
    """Aligner dictionary additions from lines.json pronunciations.

    The first variant(s) are the intended pronunciation, the entries listed in
    `aligner_wrong` are the mispronunciations we want to detect. All are added
    so the aligner picks whichever the audio supports.
    """
    out: dict[str, list[str]] = {}
    for key, e in (data.get("pronunciations") or {}).items():
        w = e.get("aligner_word", key.lower())
        out[w] = list(e.get("aligner_right", [])) + list(e.get("aligner_wrong", []))
    return out


def forced_align(y16: np.ndarray, spoken_tokens: list[str], data: dict) -> dict:
    """Word-level forced alignment of known text with pocketsphinx 5.

    Returns {"tokens": [{start, end, words:[{name, start, end, phones}]}],
             "sil": [(start, end)], "scores": [...]} in seconds from clip start.
    Raises AlignmentError when the decoder cannot align the text.
    """
    prons = data.get("pronunciations") or {}
    words, owner = [], []
    for ti, tok in enumerate(spoken_tokens):
        aw = aligner_words(tok, prons)
        if not aw:
            raise AlignmentError(f"token {tok!r} has no alignable word")
        for w in aw:
            words.append(w)
            owner.append(ti)
    d = _decoder(custom_prons(data))
    missing = [w for w in words if d.lookup_word(w) is None]
    if missing:
        raise AlignmentError(f"words missing from the aligner dictionary: {missing}")
    pcm = (np.clip(y16, -1, 1) * 32767).astype(np.int16).tobytes()
    d.set_align_text(" ".join(words))
    d.start_utt()
    d.process_raw(pcm, full_utt=True)
    d.end_utt()
    if d.hyp() is None:
        raise AlignmentError("pocketsphinx found no alignment for the text")
    d.set_alignment()
    d.start_utt()
    d.process_raw(pcm, full_utt=True)
    d.end_utt()
    al = d.get_alignment()
    if al is None:
        raise AlignmentError("pocketsphinx returned no sub-word alignment")
    seq, sil = [], []
    for w in al:
        name = w.name
        s, e = w.start * FRAME, (w.start + w.duration) * FRAME
        if name in ("<sil>", "<s>", "</s>", "[NOISE]", "++NOISE++"):
            sil.append((s, e))
            continue
        phones = [(p.name, p.start * FRAME, (p.start + p.duration) * FRAME) for p in w]
        seq.append({"name": name, "base": re.sub(r"\(\d+\)$", "", name), "start": s, "end": e, "phones": phones})
    if [x["base"] for x in seq] != words:
        raise AlignmentError(
            f"alignment word sequence mismatch: expected {words}, got {[x['base'] for x in seq]}")
    toks = []
    for ti in range(len(spoken_tokens)):
        ws = [seq[k] for k in range(len(seq)) if owner[k] == ti]
        toks.append({"start": ws[0]["start"], "end": ws[-1]["end"], "words": ws})
    return {"tokens": toks, "sil": sil}


def refine_with_energy(result: dict, y16: np.ndarray, sr: int = ALIGN_SR) -> dict:
    """Snap token edges that touch silence to the energy edge (within 80 ms).

    pocketsphinx boundaries are 10 ms quantised and tend to let a word absorb
    the first frames of a following pause (fricative tails, release noise).
    Only boundaries next to aligner silence (or clip edges) are moved; joins
    between two words that run together are kept exactly as aligned.
    """
    db = frame_db(y16, sr)
    quiet = silence_mask(db, 40.0)
    n = len(db)
    toks = result["tokens"]
    for i, t in enumerate(toks):
        prev_end = toks[i - 1]["end"] if i else 0.0
        next_start = toks[i + 1]["start"] if i + 1 < len(toks) else n * FRAME
        if i == 0 or t["start"] - prev_end >= 0.03:
            k = int(round(t["start"] / FRAME))
            lim = min(n - 1, k + 8)
            while k < lim and quiet[k]:
                k += 1
            t["start"] = k * FRAME
        if i == len(toks) - 1 or next_start - t["end"] >= 0.03:
            k = int(round(t["end"] / FRAME)) - 1
            lim = max(0, k - 8)
            while k > lim and k < n and quiet[k]:
                k -= 1
            t["end"] = max(t["start"] + 0.03, (k + 1) * FRAME)
    return result


def verify_alignment(tok_times: list[tuple[float, float]], y: np.ndarray, sr: int,
                     min_pause: float = 0.12) -> dict:
    """Objective alignment evidence from the signal alone.

    * pause_agreement: of the silent gaps (>= min_pause) found by energy inside
      the spoken span, the fraction that fall between two words rather than
      inside one (a gap inside a word means a boundary is misplaced).
    * onset_error_ms / offset_error_ms: distance between the first word start /
      last word end and the energy onset / offset of the clip.
    * pause_onset_error_ms: for every word that begins after a pause, how far
      its aligned start is from the energy onset that ends the pause.
    """
    db = frame_db(y, sr)
    quiet = silence_mask(db, 38.0)
    on, off = energy_bounds(y, sr, 40.0)
    first, last = tok_times[0][0], tok_times[-1][1]
    pauses = [p for p in pauses_from_mask(quiet, min_pause) if p[0] > on + 0.02 and p[1] < off - 0.02]
    agree, bad = 0, []
    for a, b in pauses:
        c = (a + b) / 2
        inside = [i for i, (s, e) in enumerate(tok_times) if s + 0.04 < c < e - 0.04]
        if inside:
            bad.append({"pause": [round(a, 3), round(b, 3)], "word_index": inside[0]})
        else:
            agree += 1
    pe = []
    for a, b in pauses:
        nxt = [s for s, _ in tok_times if s >= a - 0.05]
        if nxt:
            pe.append(abs(nxt[0] - b))
    return {
        "energy_pauses": len(pauses),
        "pause_agreement": round(agree / len(pauses), 3) if pauses else 1.0,
        "pauses_inside_words": bad,
        "onset_error_ms": round(abs(first - on) * 1000, 1),
        "offset_error_ms": round(abs(last - off) * 1000, 1),
        "pause_onset_error_ms_mean": round(float(np.mean(pe)) * 1000, 1) if pe else None,
        "pause_onset_error_ms_max": round(float(np.max(pe)) * 1000, 1) if pe else None,
    }


def quality_ok(q: dict) -> bool:
    return (q["pause_agreement"] >= 0.8 and q["onset_error_ms"] <= 80 and q["offset_error_ms"] <= 150)


# --------------------------------------------------------------------------
# Fallback: proportional alignment on voiced regions
# --------------------------------------------------------------------------

_VOWELS = re.compile(r"[aeiouy]+")


def _weight(tok: str) -> float:
    t = clean_token(tok).lower()
    syl = max(1, len(_VOWELS.findall(t)))
    return 0.6 * syl + 0.08 * len(t)


def proportional_align(y: np.ndarray, sr: int, spoken_tokens: list[str]) -> list[tuple[float, float]]:
    """Fallback word timing when forced alignment fails.

    1. Find voiced regions by energy (pauses of 90 ms or more split regions).
    2. Remove the pauses to get a continuous speech timeline and spread the
       tokens over it in proportion to a syllable+length weight.
    3. Map back to real time and snap token boundaries that fall within
       150 ms of a pause onto that pause (sentence punctuation prefers pauses).
    Accuracy is typically +-80 ms; takes aligned this way are flagged
    `alignment.fallback = true` and should be re-aligned before picture lock.
    """
    db = frame_db(y, sr)
    quiet = silence_mask(db, 38.0)
    on, off = energy_bounds(y, sr, 40.0)
    pauses = [p for p in pauses_from_mask(quiet, 0.09) if p[0] > on and p[1] < off]
    regions, cur = [], on
    for a, b in pauses:
        regions.append((cur, a))
        cur = b
    regions.append((cur, off))
    total = sum(b - a for a, b in regions)
    w = np.array([_weight(t) for t in spoken_tokens])
    cum = np.concatenate([[0], np.cumsum(w)]) / w.sum() * total

    def to_real(x: float) -> float:
        acc = 0.0
        for a, b in regions:
            if x <= acc + (b - a) + 1e-9:
                return a + (x - acc)
            acc += b - a
        return regions[-1][1]

    edges = [to_real(x) for x in cum]
    out = []
    for i in range(len(spoken_tokens)):
        out.append([edges[i], edges[i + 1]])
    for a, b in pauses:
        for i in range(len(out) - 1):
            if abs(out[i][1] - a) < 0.15 or abs(out[i + 1][0] - b) < 0.15:
                if ends_segment(spoken_tokens[i]) or abs(out[i][1] - (a + b) / 2) < 0.15:
                    out[i][1], out[i + 1][0] = a, b
                    break
    return [(float(s), float(e)) for s, e in out]


# --------------------------------------------------------------------------
# Aligning a clip end to end
# --------------------------------------------------------------------------


def align_clip(y: np.ndarray, sr: int, spoken: str, data: dict) -> dict:
    """Align a clip (any sample rate) to its spoken text.

    Returns {"times": [(s, e)] per token, "method", "fallback", "quality",
    "details"} with times in seconds from the clip start.
    """
    toks = tokens(spoken)
    y16 = resample(y, sr, ALIGN_SR)
    try:
        res = refine_with_energy(forced_align(y16, toks, data), y16)
        times = [(t["start"], t["end"]) for t in res["tokens"]]
        method, fallback, details = "pocketsphinx-5-forced-alignment+energy-refine", False, res
    except AlignmentError as err:
        times = proportional_align(y, sr, toks)
        method, fallback, details = f"proportional-fallback ({err})", True, None
    q = verify_alignment(times, y, sr)
    return {"times": times, "method": method, "fallback": fallback, "quality": q, "details": details}


def pronunciation_checks(details: dict | None, spoken: str, data: dict) -> list[dict]:
    """Which dictionary variant the aligner chose for each respelled word."""
    out = []
    if not details:
        return out
    prons = data.get("pronunciations") or {}
    cp = custom_prons(data)
    toks = tokens(spoken)
    for key, e in prons.items():
        aw = e.get("aligner_word", key.lower())
        right = len(e.get("aligner_right", []))
        for ti, tok in enumerate(toks):
            if aligner_words(tok, prons) != [aw]:
                continue
            wd = details["tokens"][ti]["words"][0]
            m = re.search(r"\((\d+)\)$", wd["name"])
            variant = int(m.group(1)) if m else 1
            phones = [p[0] for p in wd["phones"]]
            durs = {f"{p[0]}#{k}": round(p[2] - p[1], 3) for k, p in enumerate(wd["phones"])}
            vowel_durs = [(p[0], round(p[2] - p[1], 3)) for p in wd["phones"] if p[0] in _ARPA_VOWELS]
            stressed = max(vowel_durs, key=lambda v: v[1])[0] if vowel_durs else None
            out.append({
                "word": key,
                "token_index": ti,
                "chosen_variant": cp[aw][variant - 1],
                "intended": variant <= right,
                "phones": " ".join(phones),
                "phone_durations": durs,
                "longest_vowel": stressed,
                "stress_on_middle_syllable": stressed == e.get("stressed_vowel"),
            })
    return out


_ARPA_VOWELS = {"AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"}


# --------------------------------------------------------------------------
# Take files
# --------------------------------------------------------------------------


def words_from_times(line: dict, engine: str, times: list[tuple[float, float]]) -> list[dict]:
    disp = tokens(line["text"])
    spk = tokens(spoken_text(line, engine))
    out = []
    for d, s, (a, b) in zip(disp, spk, times):
        w = {"w": clean_token(d), "start": round(float(a), 3), "end": round(float(b), 3)}
        if clean_token(s) != clean_token(d):
            w["spoken"] = clean_token(s)
        out.append(w)
    return out


def sentences_from_words(line: dict, words: list[dict]) -> list[dict]:
    disp = tokens(line["text"])
    out = []
    for a, b in split_sentences(disp, include_colon=True):
        out.append({"text": " ".join(disp[a:b]), "start": words[a]["start"], "end": words[b - 1]["end"],
                    "word_range": [a, b]})
    return out


def write_take(dir_: Path, line: dict, engine: str, y48: np.ndarray, words: list[dict],
               meta: dict) -> Path:
    dir_ = Path(dir_)
    dir_.mkdir(parents=True, exist_ok=True)
    wav = dir_ / f"{line['id']}.wav"
    write_wav(wav, y48, OUT_SR)
    doc = {
        "schema": TAKE_SCHEMA,
        "id": line["id"],
        "engine": engine,
        "guide": engine == "guide",
        "label": ("GUIDE VOICE (local Kokoro). Not the final ElevenLabs performance." if engine == "guide"
                  else "ElevenLabs take"),
        "speaker": line["speaker"],
        "text": line["text"],
        "spoken_text": spoken_text(line, engine),
        "sample_rate": OUT_SR,
        "duration": round(len(y48) / OUT_SR, 4),
        "speech_start": words[0]["start"],
        "speech_end": words[-1]["end"],
        "words": words,
        "sentences": sentences_from_words(line, words),
        "created": _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"),
    }
    doc.update(meta)
    (dir_ / f"{line['id']}.json").write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return wav


def read_take(dir_: Path, lid: str) -> tuple[dict, np.ndarray]:
    doc = json.loads((Path(dir_) / f"{lid}.json").read_text(encoding="utf-8"))
    y, sr = read_audio(Path(dir_) / f"{lid}.wav", OUT_SR)
    if doc.get("schema") != TAKE_SCHEMA:
        raise ValueError(f"{lid}: unexpected take schema {doc.get('schema')}")
    return doc, y


# --------------------------------------------------------------------------
# Placement (shared by assembly and speed fitting)
# --------------------------------------------------------------------------


def place(data: dict, speech_durs: dict[str, float]) -> dict:
    """Absolute speech start/end for every line from the pacing plan.

    speech_durs: line id -> duration from first word onset to last word offset.
    Designed silence is measured speech to speech (the 40 ms edge pads sit
    inside it), so gap_after is what the listener hears.
    """
    pacing = data["pacing"]
    t = pacing["lead_in"]
    out = {}
    for i, line in enumerate(data["lines"]):
        t += line.get("pre_gap", 0.0)
        s = t
        e = s + speech_durs[line["id"]]
        out[line["id"]] = (s, e)
        t = e + (line.get("gap_after", 0.0) if i + 1 < len(data["lines"]) else 0.0)
    total = t + pacing["end_hold"]
    return {"lines": out, "total": total}


def designed_silence(data: dict) -> float:
    p = data["pacing"]
    s = p["lead_in"] + p["end_hold"]
    for i, line in enumerate(data["lines"]):
        s += line.get("pre_gap", 0.0)
        if i + 1 < len(data["lines"]):
            s += line.get("gap_after", 0.0)
    return s


def now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds")
