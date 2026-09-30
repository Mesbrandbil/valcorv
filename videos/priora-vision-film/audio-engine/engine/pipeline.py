"""End-to-end build: cues + events + voice -> music, sfx, master (+ QA)."""
from __future__ import annotations

import json
import os
import time

import numpy as np
import soundfile as sf

from . import cues as cuesmod, design, dsp, library, mixer, qa, rewind, score
from .dsp import SR, ns, rng

MACROS = {"pencil-scatter", "snap-cluster", "pencil-set-square", "draw", "subtract-bed", "rewind",
          "ruler-line", "gap-rule", "question", "header-in", "node-return", "layer-slice", "word-token",
          "system-event", "hold"}
# camera-move air (push, pull, whip): a texture, so it is carved under the
# voice like the beds; every other one-shot stays uncarved (sync sounds)
MOTION = {"push", "pull", "whip"}
# the cut 2 editorial vocabulary, reported against the grid
EDITORIAL = ("cut", "push", "pull", "whip", "sheet-lay", "focus", "hold")


def known_kinds():
    return set(library.KINDS) | set(rewind.KIT) | MACROS


def expand_macros(events):
    """Macro kinds become several library events."""
    out, control = [], {}
    for e in events:
        k = e["kind"]
        r = rng(e.get("seed", 0), "macro", k, round(e["t"], 3))
        if k == "subtract-bed":
            control["subtract_at"] = e["t"]
            control["subtract_fade"] = float(e.get("dur", 0.35) or 0.35)
            continue
        if k == "rewind":
            control["rewind_event"] = e["t"]
            continue
        if k == "hold":  # control: a dip in the score and the beds, never a stop (score.py, design.beds)
            control.setdefault("holds", []).append(
                {"t": e["t"], "dur": e.get("dur"), "gain_db": float(e.get("gain_db", 0.0) or 0.0),
                 "scene": e.get("scene"), "name": e.get("name")})
            continue
        s0 = int(e.get("seed", 0))
        d = e.get("dur")
        if k == "ruler-line":
            out.append(dict(e, kind="ruler-contact"))
            out.append(dict(e, kind="pencil-stroke", t=e["t"] + 0.04, dur=float(d or 0.8), pressure=0.75, speed=1.2,
                            seed=s0 + 1))
            continue
        if k == "gap-rule":
            out.append(dict(e, kind="ruler-contact"))
            out.append(dict(e, kind="technical-pen", t=e["t"] + 0.04, dur=float(d or 1.0), seed=s0 + 1))
            continue
        if k == "question":
            out.append(dict(e, kind="paper-slide", dur=0.18, gain_db=e["gain_db"] - 10.0))
            continue
        if k == "header-in":
            out.append(dict(e, kind="sheet-in", gain_db=e["gain_db"] - 3.0))
            for j, dt in enumerate((0.25, 0.4)):
                out.append(dict(e, kind="align-snap", t=e["t"] + dt, seed=s0 + 1 + j))
            continue
        if k == "node-return":
            out.append(dict(e, kind="align-snap"))
            out.append(dict(e, kind="confirm", t=e["t"] + 0.02, variant=0, gain_db=e["gain_db"] - 6.0, seed=s0 + 1))
            continue
        if k == "layer-slice":
            out.append(dict(e, kind="connect-line", dur=float(d or 0.6)))
            continue
        if k == "word-token":
            out.append(dict(e, kind="align-snap", gain_db=e["gain_db"] - 4.0))
            continue
        if k == "system-event":
            out.append(dict(e, kind="record-append"))
            out.append(dict(e, kind="relay-click", t=e["t"] + 0.01, gain_db=e["gain_db"] - 6.0, seed=s0 + 1))
            continue
        if k in ("confirm", "choice-accent") and "variant" not in e:
            out.append(dict(e, variant=int(e.get("index", 0))))
            continue
        if k == "footsteps" and "count" not in e and d:
            out.append(dict(e, count=max(2, int(round(float(d) / 0.55)))))
            continue
        if k == "pencil-set-square":
            out.append(dict(e, kind="set-square-tap"))
            out.append(dict(e, kind="pencil-stroke", t=e["t"] + 0.03, dur=float(e.get("dur", 0.6) or 0.6),
                            pressure=0.8, seed=e.get("seed", 0) + 1))
            continue
        if k == "snap-cluster":
            d = float(e.get("dur", 1.6) or 1.6)
            cnt = int(e.get("count", max(int(d * 7), 3)))
            for i in range(cnt):
                out.append(dict(e, kind="align-snap", t=e["t"] + d * i / cnt + float(r.uniform(-0.02, 0.02)),
                                gain_db=e["gain_db"] - (i % 3) * 2, pan=float(r.uniform(-0.6, 0.6)),
                                seed=e.get("seed", 0) * 31 + i))
            continue
        if k in ("pencil-scatter", "draw"):
            d = float(e.get("dur", 1.2) or 1.2)
            t = e["t"]
            i = 0
            while t < e["t"] + d:
                sd = float(r.uniform(0.15, 0.5)) if k == "draw" else float(r.uniform(0.08, 0.3))
                kind = "pencil-stroke" if (k == "draw" or r.random() < 0.55) else "pencil-tick"
                out.append(dict(e, kind=kind, t=t, dur=sd, gain_db=e["gain_db"] + float(r.uniform(-6, -1)),
                                pan=float(e.get("pan", 0)) + float(r.uniform(-0.4, 0.4)), seed=e.get("seed", 0) * 97 + i))
                if k == "draw" and r.random() < 0.2:
                    out.append(dict(e, kind="ruler-contact", t=t - 0.02, gain_db=e["gain_db"] - 5, seed=e.get("seed", 0) * 89 + i))
                t += float(r.uniform(0.18, 0.4)) if k == "draw" else float(r.uniform(0.08, 0.2))
                i += 1
            continue
        out.append(e)
    out.sort(key=lambda x: x["t"])
    return out, control


def render_event(e):
    k = e["kind"]
    seed = int(e.get("seed", 0))
    params = {kk: e[kk] for kk in ("dur", "pressure", "speed", "rate", "pan0", "pan1", "direction", "count",
                                   "interval", "surface", "variant", "muted", "flow", "material") if kk in e}
    if k in library.KINDS:
        return library.render_kind(k, seed, **params), library.KINDS[k][1]
    fn, lvl, acc = rewind.KIT[k]
    kw = {kk: v for kk, v in params.items() if kk in acc}
    return fn(seed=seed, **kw), lvl


def place(buf, snd, t, gain_db=0.0, pan=0.0):
    score.dsp_place(buf, snd, t, gain_db, pan)


def _key(e):
    return (e["kind"], e.get("seed"), e.get("dur"), e.get("variant"), e.get("pressure"), e.get("count"),
            e.get("material"), e.get("direction"), e.get("pan0"), e.get("pan1"))


def resolve_holds(holds, C, rs, re_, warns):
    """Holds get a duration (default one bar) and a depth (gain_db below 0,
    default score.HOLD_DEFAULT_DB, never deeper than score.HOLD_MAX_DB: a hold
    is a dip, not a stop); inside the rewind they have no effect."""
    beat = score.cue_grid(C).beat
    out = []
    for h in holds or []:
        d = h.get("dur")
        d = float(d) if d not in (None, 0, "") else 4 * beat
        g = float(h.get("gain_db", 0.0) or 0.0)
        if g < score.HOLD_MAX_DB:
            warns.append(f"hold '{h.get('name') or 'hold'}' at {h['t']:.2f}s asks for {g:g} dB; holds are dips, "
                         f"drawn to {score.HOLD_MAX_DB:g} dB at most")
        g = score.HOLD_DEFAULT_DB if g >= 0 else max(g, score.HOLD_MAX_DB)
        if rs - 0.01 <= h["t"] < re_:
            warns.append(f"hold '{h.get('name') or 'hold'}' at {h['t']:.2f}s lies inside the rewind and is ignored")
            continue
        out.append(dict(h, dur=d, gain_db=g))
    return sorted(out, key=lambda x: x["t"])


def editorial_grid(events, holds, C):
    """Where each editorial accent sits against the grid (half beats)."""
    g = score.cue_grid(C)
    rows = [(e["t"], e["kind"], e.get("scene"), e.get("name")) for e in events if e["kind"] in EDITORIAL]
    rows += [(h["t"], "hold", h.get("scene"), h.get("name")) for h in holds]
    rows.sort()
    offs = [abs(t - g.q(t, g.half)) for t, *_ in rows]
    return {"count": len(rows),
            "on_half_beat_within_20ms": int(sum(o <= 0.02 for o in offs)),
            "max_offset_from_half_beat_ms": round(1000 * max(offs), 1) if offs else 0.0,
            "rows": [{"t": round(t, 3), "kind": k, "scene": sc, "name": nm, "at": g.label(g.q(t, g.half)),
                      "offset_ms": round(1000 * (t - g.q(t, g.half)), 1)} for (t, k, sc, nm) in rows]}


def run(project: str, resolved_path: str, timing_path: str | None, voice_path: str, out_dir: str,
        qa_dir: str | None, extra_events: list[str] | None = None, use_auto: bool = True,
        ceiling_db: float = -1.0, target_lufs: float | None = -16.0, master_gain_db: float | None = None,
        pngs: bool = True, log=print) -> dict:
    t_start = time.time()
    _log = log

    def log(msg):
        _log(f"[{time.time() - t_start:5.1f}s] {msg}")
    report: dict = {"inputs": {"cues": resolved_path, "timing": timing_path, "voice": voice_path,
                               "events": extra_events or []}}
    C = cuesmod.load(resolved_path, timing_path)
    n = ns(C.duration)
    report["duration"] = C.duration
    report["cues"] = C.report()
    missing = [k for k, v in report["cues"].items() if v["t"] is None]
    if missing:
        raise SystemExit(f"unresolved cues: {missing}")

    # ---------------- voice
    v, sr = sf.read(voice_path, dtype="float64", always_2d=True)
    if sr != SR:
        from scipy.signal import resample_poly
        v = resample_poly(v, SR, sr, axis=0)
    voice = v.mean(axis=1)
    if len(voice) > n and dsp.peak(voice[n:]) > 1e-4:
        report.setdefault("warnings", []).append(
            f"voice is {len(voice) / SR:.2f}s, film {C.duration:.2f}s: audible voice after the end is trimmed")
    voice = dsp.pad_to(voice, n)

    # ---------------- events
    with open(resolved_path) as fh:
        resolved = json.load(fh)
    raw = list(resolved.get("events") or [])
    for p in extra_events or []:
        with open(p) as fh:
            d = json.load(fh)
        raw += d.get("events", d) if isinstance(d, dict) else d
    scene_ev, warns = cuesmod.normalize_events({"events": raw}, C, known_kinds())
    scene_ev, control = expand_macros(scene_ev)
    for e in scene_ev:  # a cut sounds of paper in Act I and of felt in the product acts
        if e["kind"] == "cut" and not e.get("material"):
            e["material"] = "paper" if e["t"] < C["rewindEnd"] else "felt"
    auto_ev = design.auto(C) if use_auto else []
    events = design.merge(design.designed(C), scene_ev, auto_ev)
    events, control2 = expand_macros(events)
    control.update(control2)
    # one-shots fall away at rewindStart and stay muted until rewindEnd (the
    # rewind replaces them); only the rewind-* kit plays there. Say so.
    for e in scene_ev:
        if C["rewindStart"] <= e["t"] < C["rewindEnd"] - 0.01 and not e["kind"].startswith("rewind-"):
            warns.append(f"scene event '{e.get('name', e['kind'])}' ({e['kind']}) at {e['t']:.2f}s lies inside the "
                         f"rewind ({C['rewindStart']:.2f} to {C['rewindEnd']:.2f}s) and is faded out or muted; "
                         f"only rewind-* kinds play there")
    holds = resolve_holds(control.get("holds"), C, C["rewindStart"], C["rewindEnd"], warns)
    if warns:
        report.setdefault("warnings", []).extend(warns)
    counts = {}
    for e in events:
        key = f"{e.get('source', 'scene')}:{e['kind']}"
        counts[key] = counts.get(key, 0) + 1
    report["events"] = {"total": len(events), "by_source_kind": dict(sorted(counts.items())),
                        "control": {k: v for k, v in control.items() if k != "holds"}, "holds": len(holds)}
    report["editorial_grid"] = editorial_grid(events, holds, C)
    log(f"cues ok, {len(events)} events ({len(scene_ev)} from scenes)")

    # ---------------- music
    fam, arr = score.render(C, report, holds)
    log("score rendered")
    music_pre = sum(fam.values())
    # the thread continues through the rewind; only the rest is reversed
    music_rev_src = music_pre - fam["thread"] - fam["verb-thread"]

    # ---------------- sfx: beds and one-shots
    bed = design.beds(C, control.get("subtract_at"), control.get("subtract_fade", 0.35), holds)
    beds_sum = sum(bed.values())
    shots = np.zeros((n, 2))
    motion = np.zeros((n, 2))
    cache = {}
    for e in events:
        key = _key(e)
        if key not in cache:
            cache[key] = render_event(e)
        snd, lvl = cache[key]
        place(motion if e["kind"] in MOTION else shots, snd, e["t"], lvl + float(e.get("gain_db", 0.0)),
              float(e.get("pan", 0.0) or 0.0))
    log(f"sfx rendered ({len(cache)} unique one-shots)")

    # one-shots of Act I fall away with the rest at the rewind
    rs, re_ = C["rewindStart"], C["rewindEnd"]
    fall = dsp.curve([(0, 1.0), (rs, 1.0), (rs + 0.3, 0.0), (re_ - 0.01, 0.0), (re_, 1.0)], n, "cos")
    rew_shots = np.zeros((n, 2))
    for e in events:  # scene-published rewind kit sounds play inside the window
        if e["kind"].startswith("rewind-"):
            snd, lvl = cache[_key(e)]
            place(rew_shots, snd, e["t"], lvl + float(e.get("gain_db", 0.0)), float(e.get("pan", 0.0) or 0.0))
    shots_fwd = (shots - rew_shots) * fall[:, None]
    motion_fwd = motion * fall[:, None]

    # ---------------- rewind (built from Act I as heard)
    sfx_pre = beds_sum + shots_fwd + motion_fwd
    m_add, s_add = rewind.render(C, music_rev_src, sfx_pre, events, report)
    log("rewind built")

    # ---------------- carve under the voice
    at, act = mixer.voice_activity(voice)
    music = mixer.carve(music_pre, at, act, 3.0, 7.0, 3.0) + m_add
    beds_c = mixer.carve(beds_sum, at, act, 2.5, 4.0, 1.5)
    motion_c = mixer.carve(motion_fwd, at, act, 2.5, 4.0, 1.5) if np.any(motion_fwd) else motion_fwd
    sfx = beds_c + motion_c + shots_fwd + rew_shots + s_add
    # bus hygiene: no sub rumble, no DC, clean head and tail
    music = dsp.hp(music, 32, 4)
    music = dsp.eq(music, "lowshelf", 110, -4.0, 0.7)  # a lighter low end for a restrained score
    sfx = dsp.hp(sfx, 30, 4)
    edge = dsp.curve([(0, 0.0), (0.004, 1.0), (C.duration - 0.2, 1.0), (C.duration - 0.02, 0.0),
                      (C.duration, 0.0)], n, "cos")
    music *= edge[:, None]
    sfx *= edge[:, None]
    report["voice_activity_seconds"] = round(float(np.sum(act > 0.5)) * mixer.FRAME, 2)

    # ---------------- master
    vst, mu, sx, master = mixer.build_master(voice, music, sfx, ceiling_db, target_lufs, master_gain_db, report)
    os.makedirs(out_dir, exist_ok=True)
    paths = {"voice": os.path.join(out_dir, "master-voice.wav"), "music": os.path.join(out_dir, "music.wav"),
             "sfx": os.path.join(out_dir, "sfx.wav"), "master": os.path.join(out_dir, "master.wav")}
    sf.write(paths["voice"], vst, SR, subtype="PCM_24")
    sf.write(paths["music"], mu, SR, subtype="PCM_24")
    sf.write(paths["sfx"], sx, SR, subtype="PCM_24")
    sf.write(paths["master"], master, SR, subtype="PCM_24")
    report["outputs"] = paths
    log("stems written")

    # ---------------- verification
    rd = {k: sf.read(p, dtype="float64", always_2d=True)[0] for k, p in paths.items()}
    vv = rd["voice"]
    if vv.shape[1] == 1:
        vv = np.repeat(vv, 2, axis=1)
    vv = dsp.pad_to(vv, n)
    summ = vv + rd["music"] + rd["sfx"]
    diff = np.abs(summ - rd["master"])
    report["stem_sum_check"] = {"max_abs_diff": float(diff.max()),
                                "max_abs_diff_dbfs": round(dsp.db(diff.max()), 1),
                                "note": "24-bit quantisation of three stems bounds this at about -132 dBFS"}
    tonal = sum(v for k, v in fam.items() if k != "pulse")
    report["qa"] = qa_block(C, rd, vv, voice, qa_dir, pngs, events, tonal)
    report["qa"]["grid"] = qa.grid_audio_check(fam, rd["music"], arr, C)
    report["qa"]["silences"] = qa.silence_windows(rd["music"] + rd["sfx"], C, arr, holds)
    report["qa"]["transitions"] = qa.transitions(rd["music"], rd["music"] + rd["sfx"], arr, C, holds)
    report["seconds"] = round(time.time() - t_start, 1)
    if qa_dir:
        os.makedirs(qa_dir, exist_ok=True)
        qa.write_json(report, os.path.join(qa_dir, "report.json"))
        ev_out = [{k: (round(v, 4) if isinstance(v, float) else v) for k, v in e.items()} for e in events]
        qa.write_json(ev_out, os.path.join(qa_dir, "events-used.json"))
    return report


def sections(C):
    return [("act1", 0.0, C["rewindStart"]), ("rewind", C["rewindStart"], C["rewindEnd"]),
            ("act2", C["rewindEnd"], C["l16"] - 0.3), ("act3", C["l16"] - 0.3, C["scenariosIn"]),
            ("scenarios", C["scenariosIn"], C["closeIn"]), ("close", C["closeIn"], C.duration)]


def qa_block(C, rd, voice_st, voice_mono, qa_dir, pngs, events, tonal):
    out = {"stems": {}, "sections": {}}
    master, music, sfx = rd["master"], rd["music"], rd["sfx"]
    for name, x in (("master", master), ("music", music), ("sfx", sfx), ("voice", voice_st)):
        out["stems"][name] = qa.metrics(x)
    bed = music + sfx
    for name, a, b in sections(C):
        i, j = ns(a), ns(b)
        seg = {"master": qa.metrics(master[i:j]), "music+sfx": qa.metrics(bed[i:j])}
        out["sections"][name] = {"start": round(a, 3), "end": round(b, 3), **seg}
    # music under speech versus in the pauses (short-term loudness)
    at, act = mixer.voice_activity(voice_mono)
    tt, lm = qa.loudness_curve(music + sfx, 0.4, 0.1)
    tv, lv = qa.loudness_curve(voice_st, 0.4, 0.1)
    a_i = np.interp(tt, at, act)
    speak = (a_i > 0.7) & (lv > -45)
    out["bed_vs_voice"] = {
        "voice_momentary_median_lufs": round(float(np.median(lv[speak])), 1) if np.any(speak) else None,
        "bed_under_speech_median_lufs": round(float(np.median(lm[speak])), 1) if np.any(speak) else None,
        "bed_in_pauses_median_lufs": round(float(np.median(lm[(a_i < 0.05) & (lm > -70)])), 1),
    }
    # discontinuities at every edit point
    edits = [0.0, C.duration - 0.02] + [t for _, t in [(k, C[k]) for k in (
        "offline", "rewindStart", "rewindEnd", "offline2", "cross", "scenariosIn", "closeIn", "priora")]]
    edits += [C["rewindStart"] + 0.3, C["offline"] + 0.35, C["offline2"] + 0.25]
    ons = [e["t"] for e in events]
    out["edges"] = {"music": qa.edge_check(music, edits, onsets=ons), "sfx": qa.edge_check(sfx, edits, onsets=ons),
                    "master": qa.edge_check(master, edits, onsets=ons)}
    out["onsets_from_silence"] = {"music": qa.onset_from_silence(music), "sfx": qa.onset_from_silence(sfx)}
    out["onset_timing"] = qa.onset_timing(sfx, events)
    sp = qa.hf_spikes(tonal)  # the pitched layers only: any spike there is a click
    out["tonal_music_hf_spikes"] = {"count": len(sp), "times": sp[:40]}
    out["head_tail"] = {"first_sample_abs": float(np.abs(master[0]).max()),
                        "last_sample_abs": float(np.abs(master[-1]).max()),
                        "last_50ms_peak_dbfs": round(dsp.db(dsp.peak(master[-ns(0.05):])), 1)}
    if qa_dir and pngs:
        os.makedirs(qa_dir, exist_ok=True)
        marks = [(k, C[k]) for k in ("noOne", "offline", "afterwards", "rewindStart", "rewindEnd", "worker",
                                     "connects", "prevention", "offline2", "cross", "change", "ordinary",
                                     "scenariosIn", "ordinary", "closeIn", "gapCloses", "priora")]
        qa.spectrogram_png(master, os.path.join(qa_dir, "film-master.png"), "master (voice + music + sfx)", marks=marks,
                           vmin=-120, vmax=-30, width=18)
        qa.spectrogram_png(music, os.path.join(qa_dir, "film-music.png"), "music stem", marks=marks,
                           vmin=-120, vmax=-35, width=18)
        qa.spectrogram_png(sfx, os.path.join(qa_dir, "film-sfx.png"), "sfx stem", marks=marks,
                           vmin=-120, vmax=-35, width=18)
        for name, a, b in sections(C):
            i, j = ns(a), ns(b)
            mk = [(k, t) for k, t in marks if a <= t <= b]
            qa.spectrogram_png(master[i:j], os.path.join(qa_dir, f"section-{name}-master.png"),
                               f"{name} master {a:.2f}-{b:.2f}s", t0=a, marks=mk, vmin=-120, vmax=-30)
            qa.spectrogram_png(bed[i:j], os.path.join(qa_dir, f"section-{name}-bed.png"),
                               f"{name} music+sfx {a:.2f}-{b:.2f}s", t0=a, marks=mk, vmin=-120, vmax=-35)
            qa.ltas_png([("master", master[i:j]), ("music", music[i:j]), ("sfx", sfx[i:j]),
                         ("voice", voice_st[i:j])], os.path.join(qa_dir, f"section-{name}-ltas.png"),
                        f"{name}: long-term spectra")
    return out
