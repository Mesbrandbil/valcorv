#!/usr/bin/env python3
"""ElevenLabs API narration generator for the Priora vision film (TTS with timestamps).

NOT the agreed route: per BRIEF.md (user decision, 2026-09-29) the final audio
is made in the ElevenLabs web app and aligned with scripts/align-uploaded.py.
Do not run this against the API unless the user approves that change.

Runs unchanged once ELEVENLABS_API_KEY is set and api.elevenlabs.io is
reachable. Writes narration/takes/elevenlabs/<id>.wav (48 kHz, 24-bit, mono)
and <id>.json in exactly the same format as the guide takes, so
`assemble-narration.py --engine elevenlabs` re-locks the film to the real
performance.

Environment
  ELEVENLABS_API_KEY           required (never printed)
  ELEVENLABS_NARRATOR_VOICE_ID optional, skips narrator voice selection
  ELEVENLABS_WORKER_VOICE_ID   optional, skips worker voice selection
  ELEVENLABS_MODEL_ID          optional, default eleven_multilingual_v2
  ELEVENLABS_API_BASE          optional, default https://api.elevenlabs.io

Voice selection (when no id is given): lists the account voices
(GET /v1/voices) and the shared library (GET /v1/shared-voices, filtered by
gender, accent=british, language=en and use cases), scores every candidate
against the voice direction (warm, intelligent, composed, credible,
conversational; penalising aristocratic, theatrical, breathy, seductive,
announcer), prints the ranked shortlist, and saves it with the choice to
narration/elevenlabs/voices.json. Later runs reuse that file unless
--reselect is given. A chosen library voice is added to the account
(POST /v1/voices/add/...) unless --no-add-shared.

Generation: POST /v1/text-to-speech/{voice_id}/with-timestamps per line with
voice_settings from lines.json (stability 0.5, similarity_boost 0.8,
style 0.1, use_speaker_boost, speed), previous_text/next_text from the
neighbouring lines of the same speaker, a fixed seed. Audio is decoded with
ffmpeg; the character alignment is converted to word timings and mapped one
to one onto the displayed words. Every take is cross-checked with pocketsphinx
forced alignment (timing agreement and the Priora pronunciation).

Nothing is ever faked: any HTTP or decoding error stops the run with a
non-zero exit code and the error body.

Usage
  python3 scripts/elevenlabs-voice.py --self-test           # offline parsing tests
  python3 scripts/elevenlabs-voice.py --dry-run             # show the plan, no network
  python3 scripts/elevenlabs-voice.py                       # select voices, generate all lines
  python3 scripts/elevenlabs-voice.py --fit-total 90        # also tune voice speed to the target total
  python3 scripts/elevenlabs-voice.py --lines L14a,L20 --speed 1.08
"""

from __future__ import annotations

import argparse
import base64
import importlib.util
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np

_spec = importlib.util.spec_from_file_location("narration_common", Path(__file__).with_name("narration-common.py"))
nc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(nc)

API_BASE = os.environ.get("ELEVENLABS_API_BASE", "https://api.elevenlabs.io").rstrip("/")
OUT_DIR = nc.TAKES / "elevenlabs"
VOICES_PATH = nc.NARRATION / "elevenlabs" / "voices.json"
SPEED_MIN, SPEED_MAX = 0.7, 1.2


class ElevenLabsError(RuntimeError):
    pass


def log(*a):
    print(*a, flush=True)


# --------------------------------------------------------------------------
# HTTP (the transport is swappable so the self-test can run without network)
# --------------------------------------------------------------------------


def _urllib_transport(method: str, url: str, headers: dict, body: bytes | None, timeout: float):
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers or {}), e.read()
    except urllib.error.URLError as e:
        raise ElevenLabsError(
            f"{method} {url}: network error {e.reason!r}. Is api.elevenlabs.io on the network allowlist?") from e


TRANSPORT = _urllib_transport


def api(method: str, path: str, key: str, params: dict | None = None, body: dict | None = None,
        timeout: float = 180.0) -> tuple[dict, dict]:
    """Call the ElevenLabs API and return (json, headers); raise on any non-2xx."""
    if not key:
        raise ElevenLabsError("ELEVENLABS_API_KEY is not set")
    url = API_BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    headers = {"xi-api-key": key, "Accept": "application/json"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    status, rh, raw = TRANSPORT(method, url, headers, data, timeout)
    if not 200 <= status < 300:
        detail = raw.decode("utf-8", errors="replace")[:800] if raw else ""
        raise ElevenLabsError(f"{method} {path} failed with HTTP {status}: {detail}")
    try:
        return json.loads(raw.decode("utf-8")), rh
    except Exception as e:
        raise ElevenLabsError(f"{method} {path}: response is not JSON ({len(raw or b'')} bytes)") from e


# --------------------------------------------------------------------------
# Voice selection
# --------------------------------------------------------------------------

DIRECTION = {
    "narrator": {
        "gender": "female",
        "use_cases": ["narrative_story", "informative_educational"],
        "positive": {
            "warm": 3.0, "intelligent": 2.5, "composed": 2.5, "calm": 2.0, "credible": 2.5,
            "trustworthy": 2.0, "trusted": 1.5, "conversational": 2.5, "natural": 1.5, "clear": 2.0,
            "measured": 1.5, "confident": 1.5, "grounded": 1.5, "articulate": 1.5, "professional": 1.0,
            "neutral": 1.0, "documentary": 1.5, "informative": 1.0, "narration": 1.0, "narrator": 1.0,
            "thoughtful": 1.0, "smooth": 0.5, "relaxed": 0.5, "friendly": 0.5, "authoritative": 0.5,
            "reassuring": 1.0, "modern": 0.5, "engaging": 0.5, "mature": 0.5,
        },
        "negative": {
            "aristocratic": 4.0, "posh": 3.5, "upper class": 3.0, "upper-class": 3.0, "royal": 2.5,
            "theatrical": 4.0, "dramatic": 3.0, "breathy": 4.0, "whisper": 4.0, "whispering": 4.0,
            "asmr": 4.0, "seductive": 5.0, "sultry": 5.0, "sexy": 5.0, "sensual": 5.0, "flirty": 4.0,
            "announcer": 4.0, "commercial": 2.5, "advert": 2.0, "advertisement": 2.0, "radio": 2.0,
            "hype": 3.0, "energetic": 2.0, "excited": 2.5, "upbeat": 1.5, "bubbly": 2.5, "cheerful": 1.0,
            "childish": 3.0, "child": 2.0, "cartoon": 4.0, "character": 2.0, "villain": 4.0, "witch": 4.0,
            "elderly": 2.0, "old": 1.5, "grandmother": 2.0, "raspy": 2.0, "gravelly": 2.0, "husky": 1.5,
            "meditation": 2.0, "sleep": 2.5, "fairy": 2.0, "robotic": 3.0, "anime": 3.0, "trailer": 3.0,
            "epic": 3.0, "sentimental": 3.0, "emotional": 1.0, "news": 1.0, "newsreader": 1.5,
            "sassy": 2.0, "sarcastic": 2.0, "gossip": 3.0, "valley": 2.0, "girly": 2.5,
        },
    },
    "worker": {
        "gender": "male",
        "use_cases": ["conversational", "narrative_story"],
        "positive": {
            "natural": 2.5, "conversational": 3.0, "casual": 2.5, "everyday": 2.0, "real": 1.5,
            "authentic": 2.0, "grounded": 2.0, "down-to-earth": 2.5, "friendly": 1.0, "clear": 1.5,
            "relaxed": 1.5, "calm": 1.0, "practical": 1.5, "young": 0.5, "middle-aged": 0.5,
            "regular": 1.0, "genuine": 1.5, "unpolished": 1.0,
        },
        "negative": {
            "announcer": 4.0, "narrator": 1.5, "narration": 1.0, "documentary": 1.5, "trailer": 4.0,
            "epic": 3.5, "deep": 1.5, "posh": 3.5, "aristocratic": 4.0, "theatrical": 4.0,
            "dramatic": 3.0, "commercial": 2.5, "radio": 2.0, "hype": 3.0, "energetic": 1.5,
            "seductive": 5.0, "breathy": 3.0, "whisper": 4.0, "asmr": 4.0, "villain": 4.0,
            "cartoon": 4.0, "character": 2.0, "elderly": 2.5, "old": 1.5, "wise": 1.5, "royal": 2.5,
            "authoritative": 1.0, "news": 1.0, "meditation": 2.0, "sleep": 2.5, "robotic": 3.0,
        },
    },
}
ACCENT_GOOD = {"british": 2.0, "english": 1.5, "uk": 1.5, "standard british": 2.0, "london": 0.5}
ACCENT_BAD = {"scottish": 2.5, "irish": 2.5, "welsh": 2.0, "cockney": 3.0, "essex": 2.5, "northern": 1.5,
              "yorkshire": 2.0, "geordie": 3.0, "scouse": 3.0, "australian": 4.0, "american": 5.0,
              "indian": 4.0, "south african": 4.0, "new zealand": 4.0, "canadian": 4.0}
AGE_PREF = {"narrator": {"middle_aged": 1.0, "middle aged": 1.0, "young": 0.4, "old": -2.0},
            "worker": {"young": 0.6, "middle_aged": 0.8, "middle aged": 0.8, "old": -2.0}}
USE_CASE_PREF = {"narrator": {"informative_educational": 1.5, "narrative_story": 1.0, "conversational": 0.5,
                              "advertisement": -1.5, "characters_animation": -2.5, "entertainment_tv": -0.5,
                              "social_media": -0.5},
                 "worker": {"conversational": 1.5, "narrative_story": 0.3, "social_media": 0.3,
                            "characters_animation": -2.0, "advertisement": -1.5}}


def normalise_voice(v: dict, source: str) -> dict:
    labels = v.get("labels") or {}
    return {
        "voice_id": v.get("voice_id"),
        "name": v.get("name"),
        "source": source,
        "public_owner_id": v.get("public_owner_id"),
        "category": v.get("category"),
        "gender": (v.get("gender") or labels.get("gender") or "").lower(),
        "accent": (v.get("accent") or labels.get("accent") or "").lower(),
        "age": (v.get("age") or labels.get("age") or "").lower(),
        "language": (v.get("language") or labels.get("language") or "").lower(),
        "use_case": (v.get("use_case") or labels.get("use_case") or labels.get("use case") or "").lower(),
        "descriptive": (v.get("descriptive") or labels.get("descriptive") or labels.get("description") or "").lower(),
        "description": v.get("description") or "",
        "usage_1y": int(v.get("usage_character_count_1y") or 0),
        "cloned_by_count": int(v.get("cloned_by_count") or 0),
        "preview_url": v.get("preview_url"),
        "original_voice_id": ((v.get("sharing") or {}).get("original_voice_id")),
    }


def _has(text: str, term: str) -> bool:
    return re.search(r"(?<![a-z])" + re.escape(term) + r"(?![a-z])", text) is not None


def score_voice(v: dict, role: str) -> dict:
    d = DIRECTION[role]
    text = " ".join([v["descriptive"], v["description"].lower(), v["use_case"], v["accent"]])
    reasons, score = [], 0.0
    if v["gender"] and v["gender"] != d["gender"]:
        return {**v, "score": -99.0, "reasons": [f"gender {v['gender']}"]}
    if v["language"] and not v["language"].startswith("en"):
        return {**v, "score": -99.0, "reasons": [f"language {v['language']}"]}
    for term, w in d["positive"].items():
        if _has(text, term):
            score += w
            reasons.append(f"+{w:g} {term}")
    for term, w in d["negative"].items():
        if _has(text, term):
            score -= w
            reasons.append(f"-{w:g} {term}")
    acc = v["accent"]
    bad = [w for t, w in ACCENT_BAD.items() if _has(acc, t) or _has(v["description"].lower(), t + " accent")]
    good = [w for t, w in ACCENT_GOOD.items() if _has(acc, t)]
    if bad:
        score -= max(bad)
        reasons.append(f"-{max(bad):g} accent {acc or 'described as non-standard'}")
    elif good:
        score += max(good)
        reasons.append(f"+{max(good):g} accent {acc}")
    elif acc:
        score -= 1.0
        reasons.append(f"-1 accent {acc}")
    for a, w in AGE_PREF[role].items():
        if v["age"] == a or v["age"].replace("_", " ") == a:
            score += w
            reasons.append(f"{w:+g} age {v['age']}")
            break
    for u, w in USE_CASE_PREF[role].items():
        if v["use_case"].replace(" ", "_") == u:
            score += w
            reasons.append(f"{w:+g} use case {u}")
            break
    pop = min(1.0, math.log10(1 + v["usage_1y"]) / 8) + min(0.5, math.log10(1 + v["cloned_by_count"]) / 8)
    if pop:
        score += pop
        reasons.append(f"+{pop:.2f} proven usage")
    if v["source"] == "account":
        score += 0.25
        reasons.append("+0.25 already in account")
    return {**v, "score": round(score, 3), "reasons": reasons}


def list_candidates(key: str, role: str, pages: int = 3) -> list[dict]:
    d = DIRECTION[role]
    out = []
    acct, _ = api("GET", "/v1/voices", key)
    for v in acct.get("voices", []):
        out.append(normalise_voice(v, "account"))
    seen = {v["voice_id"] for v in out} | {v["original_voice_id"] for v in out if v["original_voice_id"]}
    for use_case in d["use_cases"]:
        for page in range(pages):
            params = {"page_size": 100, "gender": d["gender"], "accent": "british", "language": "en",
                      "use_cases": [use_case], "sort": "usage_character_count_1y", "page": page}
            res, _ = api("GET", "/v1/shared-voices", key, params=params)
            for v in res.get("voices", []):
                nv = normalise_voice(v, "library")
                if nv["voice_id"] not in seen:
                    seen.add(nv["voice_id"])
                    out.append(nv)
            if not res.get("has_more"):
                break
    return out


def rank(cands: list[dict], role: str) -> list[dict]:
    scored = [score_voice(v, role) for v in cands]
    return sorted([s for s in scored if s["score"] > -50], key=lambda s: (-s["score"], s["name"] or ""))


def ensure_in_account(key: str, v: dict, role: str, allow_add: bool) -> str:
    if v["source"] == "account":
        return v["voice_id"]
    if not allow_add:
        log(f"  note: {v['name']} is a library voice; using its id directly (--no-add-shared)")
        return v["voice_id"]
    if not v.get("public_owner_id"):
        raise ElevenLabsError(f"library voice {v['voice_id']} has no public_owner_id; cannot add it")
    log(f"  adding library voice '{v['name']}' to the account (POST /v1/voices/add)")
    res, _ = api("POST", f"/v1/voices/add/{v['public_owner_id']}/{v['voice_id']}", key,
                 body={"new_name": f"Priora {role} {v['name']}"[:100]})
    if not res.get("voice_id"):
        raise ElevenLabsError(f"voice add returned no voice_id: {res}")
    return res["voice_id"]


def select_voices(key: str, reselect: bool, allow_add: bool, dry_run: bool) -> dict:
    env = {"narrator": os.environ.get("ELEVENLABS_NARRATOR_VOICE_ID"),
           "worker": os.environ.get("ELEVENLABS_WORKER_VOICE_ID")}
    saved = json.loads(VOICES_PATH.read_text()) if VOICES_PATH.exists() else {}
    result = {"created": nc.now_iso(), "api_base": API_BASE}
    for role in ("narrator", "worker"):
        if env[role]:
            result[role] = {"chosen": {"voice_id": env[role], "name": None, "source": "env"},
                            "why": f"ELEVENLABS_{role.upper()}_VOICE_ID"}
            log(f"{role}: using voice id from ELEVENLABS_{role.upper()}_VOICE_ID")
            continue
        if not reselect and saved.get(role, {}).get("chosen", {}).get("use_voice_id"):
            result[role] = saved[role]
            log(f"{role}: reusing {saved[role]['chosen']['name']} ({saved[role]['chosen']['use_voice_id']}) "
                f"from {VOICES_PATH.relative_to(nc.ROOT)}")
            continue
        if dry_run:
            result[role] = {"chosen": None, "why": "dry run: would list /v1/voices and /v1/shared-voices"}
            log(f"{role}: [dry run] would rank account + shared library voices "
                f"(gender={DIRECTION[role]['gender']}, accent=british, language=en, use_cases={DIRECTION[role]['use_cases']})")
            continue
        cands = list_candidates(key, role)
        ranked = rank(cands, role)
        if not ranked:
            raise ElevenLabsError(f"no {role} voice candidates found")
        log(f"\n{role} shortlist ({len(cands)} candidates scored):")
        for i, v in enumerate(ranked[:10], 1):
            log(f"  {i:2d}. {v['score']:6.2f}  {v['name']}  [{v['source']}, {v['accent']}, {v['age']}, {v['use_case']}]"
                f"  {v['descriptive']}  {'; '.join(v['reasons'][:6])}")
        chosen = dict(ranked[0])
        if dry_run:
            chosen["use_voice_id"] = chosen["voice_id"]
        else:
            chosen["use_voice_id"] = ensure_in_account(key, chosen, role, allow_add)
        log(f"{role}: chosen {chosen['name']} ({chosen['use_voice_id']})")
        result[role] = {"chosen": chosen, "shortlist": ranked[:10], "candidates_scored": len(cands),
                        "direction": DIRECTION[role]}
    if not dry_run and any(result[r].get("shortlist") for r in ("narrator", "worker")):
        VOICES_PATH.parent.mkdir(parents=True, exist_ok=True)
        VOICES_PATH.write_text(nc.dump_json(result), encoding="utf-8")
    return result


def voice_id_for(sel: dict, role: str) -> str | None:
    c = sel.get(role, {}).get("chosen")
    if not c:
        return None
    return c.get("use_voice_id") or c.get("voice_id")


# --------------------------------------------------------------------------
# Response parsing (exercised by --self-test)
# --------------------------------------------------------------------------

_PUNCT = set(".,;:!?\"'()[]‘’“”")


def char_alignment_to_tokens(text: str, alignment: dict) -> list[tuple[str, float, float]]:
    """Group the character alignment into whitespace tokens of `text`.

    Returns [(token, start, end)]; end is the end of the token's last
    non-punctuation character (a trailing full stop has no sound)."""
    chars = alignment["characters"]
    st = alignment["character_start_times_seconds"]
    en = alignment["character_end_times_seconds"]
    if not (len(chars) == len(st) == len(en)):
        raise ElevenLabsError("alignment arrays have different lengths")
    if "".join(chars) != text:
        raise ElevenLabsError("alignment characters do not reproduce the request text")
    out, cur = [], []
    for c, a, b in zip(chars, st, en):
        if c.isspace():
            if cur:
                out.append(cur)
                cur = []
            continue
        cur.append((c, float(a), float(b)))
    if cur:
        out.append(cur)
    toks = []
    for grp in out:
        tok = "".join(c for c, _, _ in grp)
        sounding = [g for g in grp if g[0] not in _PUNCT] or grp
        toks.append((tok, sounding[0][1], sounding[-1][2]))
    return toks


def process_response(line: dict, resp: dict, data: dict, out_dir: Path, meta: dict,
                     raw_audio_name: str | None = None) -> dict:
    """Turn a /with-timestamps response into a take (wav + json). Returns a summary."""
    spoken = nc.spoken_text(line, "elevenlabs")
    b64 = resp.get("audio_base64")
    if not b64:
        raise ElevenLabsError(f"{line['id']}: response has no audio_base64")
    audio_bytes = base64.b64decode(b64)
    y = nc.decode_with_ffmpeg(audio_bytes, nc.OUT_SR)
    if len(y) < nc.OUT_SR * 0.2:
        raise ElevenLabsError(f"{line['id']}: decoded audio is only {len(y)} samples")
    peak = float(np.max(np.abs(y)))
    if peak > 0.999:
        y = y * (0.999 / peak)

    method, toks = None, None
    for key in ("alignment", "normalized_alignment"):
        al = resp.get(key)
        if not al:
            continue
        try:
            t = char_alignment_to_tokens(spoken, al)
        except ElevenLabsError:
            continue
        if len(t) == len(nc.tokens(line["text"])):
            method, toks = f"elevenlabs-character-alignment ({key})", t
            break
    cross = nc.align_clip(y, nc.OUT_SR, spoken, data)
    if toks is None:
        if cross["fallback"]:
            raise ElevenLabsError(f"{line['id']}: no usable API alignment and forced alignment failed")
        method = "pocketsphinx-5-forced-alignment (API alignment unusable)"
        times = cross["times"]
    else:
        times = [(a, b) for _, a, b in toks]
    diffs = [abs(a - c) for (a, _), (c, _) in zip(times, cross["times"])] if not cross["fallback"] else []
    q = nc.verify_alignment(times, y, nc.OUT_SR)
    crosscheck = {
        "forced_alignment_method": cross["method"],
        "median_start_diff_ms": round(float(np.median(diffs)) * 1000, 1) if diffs else None,
        "max_start_diff_ms": round(float(np.max(diffs)) * 1000, 1) if diffs else None,
        "mean_signed_offset_ms": (round(float(np.mean([a - c for (a, _), (c, _) in zip(times, cross["times"])])) * 1000, 1)
                                  if diffs else None),
    }
    words = nc.words_from_times(line, "elevenlabs", times)
    full_meta = {
        **meta,
        "alignment": {"method": method, "fallback": toks is None, "quality": q, "quality_ok": nc.quality_ok(q),
                      "crosscheck": crosscheck},
        "pronunciation_checks": nc.pronunciation_checks(cross["details"], spoken, data),
    }
    out_dir = Path(out_dir)
    nc.write_take(out_dir, line, "elevenlabs", y, words, full_meta)
    if raw_audio_name:
        (out_dir / raw_audio_name).write_bytes(audio_bytes)
    api_al = {k: resp.get(k) for k in ("alignment", "normalized_alignment") if resp.get(k)}
    (out_dir / f"{line['id']}.alignment.json").write_text(nc.dump_json(api_al), encoding="utf-8")
    if crosscheck["median_start_diff_ms"] is not None and crosscheck["median_start_diff_ms"] > 150:
        log(f"  WARNING {line['id']}: API and forced alignment disagree by {crosscheck['median_start_diff_ms']} ms (median)")
    return {"id": line["id"], "duration": len(y) / nc.OUT_SR, "words": words, "method": method,
            "quality": q, "crosscheck": crosscheck, "pronunciation": full_meta["pronunciation_checks"]}


# --------------------------------------------------------------------------
# Generation
# --------------------------------------------------------------------------


def neighbours(data: dict, idx: int) -> tuple[str | None, str | None]:
    lines = data["lines"]
    spk = lines[idx]["speaker"]
    if spk != "narrator":
        return None, None
    prev = next((nc.spoken_text(l, "elevenlabs") for l in reversed(lines[:idx]) if l["speaker"] == spk), None)
    nxt = next((nc.spoken_text(l, "elevenlabs") for l in lines[idx + 1:] if l["speaker"] == spk), None)
    return prev, nxt


def request_body(data: dict, idx: int, model_id: str, speeds: dict) -> dict:
    e = data["engines"]["elevenlabs"]
    line = data["lines"][idx]
    vs = dict(e["voice_settings"] if line["speaker"] == "narrator" else e.get("worker_voice_settings", e["voice_settings"]))
    vs["speed"] = float(np.clip(speeds[line["speaker"]], SPEED_MIN, SPEED_MAX))
    body = {"text": nc.spoken_text(line, "elevenlabs"), "model_id": model_id, "voice_settings": vs,
            "apply_text_normalization": "auto"}
    prev, nxt = neighbours(data, idx)
    if prev:
        body["previous_text"] = prev
    if nxt:
        body["next_text"] = nxt
    if e.get("seed") is not None:
        body["seed"] = int(e["seed"])
    return body


def generate(key: str, data: dict, ids: list[str], voices: dict, model_id: str, output_format: str,
             speeds: dict, out_dir: Path) -> dict:
    results = {}
    for idx, line in enumerate(data["lines"]):
        if line["id"] not in ids:
            continue
        vid = voices[line["speaker"]]
        body = request_body(data, idx, model_id, speeds)
        log(f"  {line['id']}: POST /v1/text-to-speech/{vid}/with-timestamps  speed {body['voice_settings']['speed']:.3f}"
            f"  ({len(body['text'])} chars)")
        resp, headers = api("POST", f"/v1/text-to-speech/{vid}/with-timestamps", key,
                            params={"output_format": output_format}, body=body, timeout=300)
        ext = output_format.split("_")[0]
        meta = {"provider": "elevenlabs", "voice": {"id": vid, "role": line["speaker"]}, "model_id": model_id,
                "voice_settings": body["voice_settings"], "speed": body["voice_settings"]["speed"],
                "output_format": output_format, "request_id": headers.get("request-id") or headers.get("Request-Id"),
                "previous_text": body.get("previous_text"), "next_text": body.get("next_text"), "seed": body.get("seed")}
        if ext == "pcm":
            sr = int(output_format.split("_")[1])
            resp = dict(resp)
            pcm = np.frombuffer(base64.b64decode(resp["audio_base64"]), dtype="<i2").astype(np.float32) / 32768
            resp["audio_base64"] = base64.b64encode(_wav_bytes(pcm, sr)).decode()
            ext = "wav"
        results[line["id"]] = process_response(line, resp, data, out_dir, meta, raw_audio_name=f"{line['id']}.source.{ext}")
    return results


def _wav_bytes(y: np.ndarray, sr: int) -> bytes:
    import io

    import soundfile as sf

    buf = io.BytesIO()
    sf.write(buf, y, sr, format="WAV", subtype="PCM_16")
    return buf.getvalue()


def projected_total(data: dict, out_dir: Path) -> float:
    durs = {}
    for line in data["lines"]:
        doc, y = nc.read_take(out_dir, line["id"])
        on, off = nc.take_speech_bounds(y, nc.OUT_SR, doc["words"][0]["start"], doc["words"][-1]["end"])
        durs[line["id"]] = off - on
    return nc.place(data, durs)["total"]


def narrator_speech(data: dict, out_dir: Path) -> float:
    s = 0.0
    for line in data["lines"]:
        if line["speaker"] == "narrator":
            doc = json.loads((out_dir / f"{line['id']}.json").read_text())
            s += doc["words"][-1]["end"] - doc["words"][0]["start"]
    return s


# --------------------------------------------------------------------------
# Self-test (no network)
# --------------------------------------------------------------------------


def _synthetic_response(text: str, lead: float = 0.15) -> dict:
    """A fake /with-timestamps response: per-character timings plus MP3 audio
    whose loud stretches match the words, encoded with ffmpeg like the API."""
    chars, st, en, t = [], [], [], lead
    for c in text:
        d = 0.02 if c.isspace() else (0.0 if c in _PUNCT else 0.065)
        chars.append(c)
        st.append(round(t, 3))
        t += d
        en.append(round(t, 3))
    total = t + 0.25
    sr = 44100
    y = np.zeros(int(total * sr), np.float32)
    rng = np.random.default_rng(1)
    for c, a, b in zip(chars, st, en):
        if not c.isspace() and c not in _PUNCT:
            i0, i1 = int(a * sr), int(b * sr)
            tt = np.arange(i1 - i0) / sr
            y[i0:i1] = 0.3 * np.sin(2 * np.pi * 180 * tt) + 0.05 * rng.standard_normal(i1 - i0)
    raw = _wav_bytes(y, sr)
    mp3 = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "wav", "-i", "pipe:0",
                          "-codec:a", "libmp3lame", "-b:a", "128k", "-f", "mp3", "pipe:1"],
                         input=raw, capture_output=True, check=True).stdout
    al = {"characters": chars, "character_start_times_seconds": st, "character_end_times_seconds": en}
    return {"audio_base64": base64.b64encode(mp3).decode(), "alignment": al, "normalized_alignment": al}


def self_test() -> int:
    global TRANSPORT
    data = nc.load_lines()
    L = nc.line_by_id(data)
    failures = []

    def check(cond, msg):
        log(("  PASS  " if cond else "  FAIL  ") + msg)
        if not cond:
            failures.append(msg)

    tmp = Path(tempfile.mkdtemp(prefix="priora-el-selftest-"))
    try:
        log("1. character alignment -> words -> take files (L14a, respelled Priora)")
        line = L["L14a"]
        resp = _synthetic_response(nc.spoken_text(line, "elevenlabs"))
        summ = process_response(line, resp, data, tmp, {"provider": "elevenlabs", "voice": {"id": "fixture"}})
        doc = json.loads((tmp / "L14a.json").read_text())
        disp = [nc.clean_token(t) for t in nc.tokens(line["text"])]
        check(doc["schema"] == nc.TAKE_SCHEMA and doc["engine"] == "elevenlabs", "take JSON schema and engine")
        check([w["w"] for w in doc["words"]] == disp, "words map one to one onto displayed words")
        check(doc["words"][0]["w"] == "Priora" and doc["words"][0].get("spoken") == "Pree-OR-uh",
              "respelled token maps back to 'Priora'")
        check(abs(doc["words"][0]["start"] - 0.15) < 0.002, f"first word start 0.15 (got {doc['words'][0]['start']})")
        mono = all(a["start"] < a["end"] <= b["start"] + 1e-6 for a, b in zip(doc["words"], doc["words"][1:]))
        check(mono, "word timings are ordered and non-overlapping")
        w2 = doc["words"][1]
        exp_end = 0.15 + 10 * 0.065 + 0.02 + 8 * 0.065  # "Pree-OR-uh" (10 chars) + space + "connects"
        check(abs(w2["end"] - exp_end) < 0.002, f"'connects' ends at {exp_end:.3f} (got {w2['end']})")
        info = nc.read_audio(tmp / "L14a.wav")[1]
        import soundfile as sf

        check(info == 48000 and sf.info(str(tmp / "L14a.wav")).subtype == "PCM_24", "take wav is 48 kHz 24-bit")
        check(abs(doc["duration"] - summ["duration"]) < 1e-3, "duration recorded")
        last = doc["words"][-1]
        check(last["w"] == "matter" and last["end"] < doc["duration"], "trailing full stop excluded from last word")

        log("2. worker line with 'Roof oh-three' displayed as 'Roof 03'")
        line = L["L13"]
        process_response(line, _synthetic_response(nc.spoken_text(line, "elevenlabs")), data, tmp, {"voice": {"id": "fx"}})
        doc = json.loads((tmp / "L13.json").read_text())
        check([w["w"] for w in doc["words"]][4] == "03" and doc["words"][4]["spoken"] == "oh-three",
              "03 displayed, oh-three spoken")

        log("3. alignment text mismatch is rejected, not guessed")
        bad = dict(_synthetic_response("Something else entirely."))
        try:
            char_alignment_to_tokens(nc.spoken_text(L["L01"], "elevenlabs"), bad["alignment"])
            check(False, "mismatched alignment raises")
        except ElevenLabsError:
            check(True, "mismatched alignment raises")

        log("4. HTTP errors fail loudly")
        TRANSPORT = lambda m, u, h, b, t: (401, {}, b'{"detail":{"status":"invalid_api_key"}}')
        try:
            api("GET", "/v1/voices", "xi-test")
            check(False, "HTTP 401 raises ElevenLabsError")
        except ElevenLabsError as e:
            check("401" in str(e) and "invalid_api_key" in str(e), "HTTP 401 raises ElevenLabsError with body")
        TRANSPORT = lambda m, u, h, b, t: (200, {}, b"<html>not json</html>")
        try:
            api("GET", "/v1/voices", "xi-test")
            check(False, "non-JSON 200 raises")
        except ElevenLabsError:
            check(True, "non-JSON 200 raises")
        try:
            api("GET", "/v1/voices", "")
            check(False, "missing key raises")
        except ElevenLabsError:
            check(True, "missing key raises")
        try:
            process_response(L["L01"], {"alignment": None}, data, tmp, {})
            check(False, "response without audio raises")
        except ElevenLabsError:
            check(True, "response without audio raises")

        log("5. voice scoring follows the direction")
        fake = [
            {"voice_id": "a", "name": "Warm Narrator", "gender": "female", "accent": "british", "age": "middle_aged",
             "language": "en", "use_case": "informative_educational", "descriptive": "warm, calm, clear",
             "description": "A warm, composed and credible British voice with a natural conversational delivery."},
            {"voice_id": "b", "name": "Velvet", "gender": "female", "accent": "british", "age": "young",
             "language": "en", "use_case": "narrative_story", "descriptive": "seductive",
             "description": "Breathy, sultry whisper for late night stories."},
            {"voice_id": "c", "name": "Lady P", "gender": "female", "accent": "british", "age": "middle_aged",
             "language": "en", "use_case": "narrative_story", "descriptive": "posh",
             "description": "Aristocratic, theatrical upper-class narrator."},
            {"voice_id": "d", "name": "Promo", "gender": "female", "accent": "british", "age": "young",
             "language": "en", "use_case": "advertisement", "descriptive": "energetic",
             "description": "Upbeat commercial announcer voice."},
            {"voice_id": "e", "name": "Glasgow", "gender": "female", "accent": "scottish", "age": "middle_aged",
             "language": "en", "use_case": "narrative_story", "descriptive": "warm",
             "description": "Warm, calm Scottish storyteller."},
            {"voice_id": "f", "name": "Mark", "gender": "male", "accent": "british", "age": "middle_aged",
             "language": "en", "use_case": "narrative_story", "descriptive": "warm", "description": "Warm, calm."},
        ]
        ranked = rank([normalise_voice(v, "library") for v in fake], "narrator")
        names = [r["name"] for r in ranked]
        check(names[0] == "Warm Narrator", f"best narrator is the warm composed voice (ranking {names})")
        check("Mark" not in names, "wrong gender excluded")
        check(names.index("Velvet") > names.index("Glasgow") and names.index("Lady P") > 0 and names.index("Promo") > 0,
              "breathy / aristocratic / announcer voices rank below")

        log("6. request body")
        idx = [l["id"] for l in data["lines"]].index("L14a")
        body = request_body(data, idx, "eleven_multilingual_v2", {"narrator": 1.35, "worker": 1.0})
        check(body["voice_settings"]["speed"] == SPEED_MAX, "speed clamped to the API range")
        check(body.get("previous_text") == nc.spoken_text(L["L12"], "elevenlabs"),
              "previous_text skips the worker line and uses the previous narrator line")
        check(body.get("next_text") == nc.spoken_text(L["L14b"], "elevenlabs"), "next_text is the next narrator line")
        check(body["voice_settings"]["stability"] == 0.5 and body["voice_settings"]["similarity_boost"] == 0.8,
              "voice settings from lines.json")
        wb = request_body(data, [l["id"] for l in data["lines"]].index("L13"), "m", {"narrator": 1, "worker": 1})
        check("previous_text" not in wb, "worker line has no narrator context")
    finally:
        TRANSPORT = _urllib_transport
        shutil.rmtree(tmp, ignore_errors=True)
    log(f"\nself-test: {'FAILED ' + str(len(failures)) if failures else 'all passed'}")
    return 1 if failures else 0


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--self-test", action="store_true", help="offline tests of parsing, errors and scoring")
    ap.add_argument("--dry-run", action="store_true", help="print the plan and request bodies; no network writes")
    ap.add_argument("--lines", help="comma separated line ids (default all)")
    ap.add_argument("--speed", type=float, help="narrator voice_settings.speed (0.7 to 1.2)")
    ap.add_argument("--worker-speed", type=float)
    ap.add_argument("--model", default=os.environ.get("ELEVENLABS_MODEL_ID"))
    ap.add_argument("--output-format", help="default from lines.json (mp3_44100_128)")
    ap.add_argument("--reselect", action="store_true", help="ignore narration/elevenlabs/voices.json")
    ap.add_argument("--no-add-shared", action="store_true", help="do not add a chosen library voice to the account")
    ap.add_argument("--fit-total", type=float, help="regenerate narrator lines at a tuned speed to land this total")
    ap.add_argument("--max-passes", type=int, default=2, help="speed fitting passes after the first (credits!)")
    ap.add_argument("--out-dir", default=str(OUT_DIR))
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    data = nc.load_lines()
    e = data["engines"]["elevenlabs"]
    key = os.environ.get("ELEVENLABS_API_KEY", "")
    model_id = args.model or e.get("model_id", "eleven_multilingual_v2")
    output_format = args.output_format or e.get("output_format", "mp3_44100_128")
    speeds = {"narrator": args.speed or e["voice_settings"].get("speed", 1.0),
              "worker": args.worker_speed or e.get("worker_voice_settings", {}).get("speed", 1.0)}
    all_ids = [l["id"] for l in data["lines"]]
    ids = args.lines.split(",") if args.lines else all_ids
    if set(ids) - set(all_ids):
        log(f"unknown line ids: {sorted(set(ids) - set(all_ids))}")
        return 1
    out_dir = Path(args.out_dir)

    if not key and not args.dry_run:
        log("ERROR: ELEVENLABS_API_KEY is not set. Nothing was generated. See narration/README.md.")
        return 1

    try:
        sel = select_voices(key, args.reselect, not args.no_add_shared, args.dry_run)
        voices = {r: voice_id_for(sel, r) for r in ("narrator", "worker")}
        chars = sum(len(nc.spoken_text(l, "elevenlabs")) for l in data["lines"] if l["id"] in ids)
        log(f"\nModel {model_id}, format {output_format}, {len(ids)} lines, {chars} characters per pass")
        if args.dry_run:
            for idx, line in enumerate(data["lines"]):
                if line["id"] in ids:
                    body = request_body(data, idx, model_id, speeds)
                    log(f"\n[{line['id']}] POST {API_BASE}/v1/text-to-speech/{voices[line['speaker']] or '<' + line['speaker'] + '-voice>'}"
                        f"/with-timestamps?output_format={output_format}")
                    log(json.dumps(body, indent=2, ensure_ascii=False))
            log("\nDry run: no requests were sent and nothing was written.")
            return 0
        try:
            sub, _ = api("GET", "/v1/user/subscription", key)
            left = int(sub.get("character_limit", 0)) - int(sub.get("character_count", 0))
            log(f"Character quota remaining: {left}")
            if left < chars:
                raise ElevenLabsError(f"only {left} characters left, this pass needs {chars}")
        except ElevenLabsError as err:
            if "characters left" in str(err):
                raise
            log(f"WARNING: could not read the subscription quota ({err}); continuing")
        if None in voices.values():
            raise ElevenLabsError(f"voice selection incomplete: {voices}")

        log("\nGenerating:")
        res = generate(key, data, ids, voices, model_id, output_format, speeds, out_dir)
        if args.fit_total:
            if set(ids) != set(all_ids):
                raise ElevenLabsError("--fit-total needs all lines")
            for p in range(args.max_passes + 1):
                total = projected_total(data, out_dir)
                log(f"  fit pass {p}: narrator speed {speeds['narrator']:.3f} -> projected total {total:.2f}s")
                if abs(total - args.fit_total) <= 0.5 or p == args.max_passes:
                    break
                var = narrator_speech(data, out_dir)
                want = var - (total - args.fit_total)
                new = float(np.clip(speeds["narrator"] * var / want, SPEED_MIN, SPEED_MAX))
                if abs(new - speeds["narrator"]) < 0.005:
                    log(f"  speed limit reached ({new:.3f}); cannot fit further with speed alone")
                    break
                speeds["narrator"] = round(new, 3)
                narr = [l["id"] for l in data["lines"] if l["speaker"] == "narrator"]
                res.update(generate(key, data, narr, voices, model_id, output_format, speeds, out_dir))
    except ElevenLabsError as err:
        log(f"\nERROR: {err}")
        log("ElevenLabs generation did NOT complete. Existing takes were not replaced beyond the lines listed above.")
        return 1

    log(f"\n{'id':5s} {'dur':>6s} {'words':>5s} {'xchk_ms':>7s} {'pause_agree':>11s}  pronunciation")
    for lid, r in res.items():
        pr = "; ".join(f"{p['word']} {'OK' if p['intended'] else 'CHECK ' + p['chosen_variant']}" for p in r["pronunciation"])
        log(f"{lid:5s} {r['duration']:6.2f} {len(r['words']):5d} {str(r['crosscheck']['median_start_diff_ms']):>7s} "
            f"{r['quality']['pause_agreement']:11.2f}  {pr}")
    bad = [r["id"] for r in res.values() for p in r["pronunciation"] if not p["intended"]]
    if bad:
        log(f"WARNING: Priora may be mispronounced in {sorted(set(bad))}; try an alternate respelling from "
            "lines.json pronunciations.Priora.elevenlabs_alternates and regenerate those lines.")
    if set(ids) == set(all_ids):
        log(f"Projected total with pacing plan: {projected_total(data, out_dir):.2f}s")
    log("Next: python3 scripts/assemble-narration.py --engine elevenlabs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
