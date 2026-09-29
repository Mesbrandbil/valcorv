"""Measurement and inspection: nobody on this project can listen, so every
decision is checked here. Spectrogram PNGs, EBU R128 loudness (integrated,
short-term, LRA), true peak, crest factor, DC, sub-30 Hz energy, the 2 to 5 kHz
balance, stereo correlation and mono fold-down, and discontinuity scans."""
from __future__ import annotations

import json
import math

import numpy as np
from scipy import signal

from . import dsp
from .dsp import SR

# ---------------------------------------------------------------- loudness

# ITU-R BS.1770 K-weighting at 48 kHz
_K1 = (np.array([1.53512485958697, -2.69169618940638, 1.19839281085285]),
       np.array([1.0, -1.69065929318241, 0.73248077421585]))
_K2 = (np.array([1.0, -2.0, 1.0]), np.array([1.0, -1.99004745483398, 0.99007225036621]))


def kweight(x: np.ndarray) -> np.ndarray:
    y = signal.lfilter(*_K1, dsp.st(x), axis=0)
    return signal.lfilter(*_K2, y, axis=0)


def loudness_curve(x: np.ndarray, win: float = 3.0, hop: float = 0.1):
    """Short-term (3 s) or momentary (0.4 s) loudness over time: (times, LUFS)."""
    z = kweight(x)
    p = np.sum(z ** 2, axis=1)
    w, h = dsp.ns(win), dsp.ns(hop)
    c = np.concatenate([[0.0], np.cumsum(p)])
    starts = np.arange(0, max(len(p) - w, 0) + 1, h)
    ms = (c[starts + w] - c[starts]) / w
    lk = -0.691 + 10 * np.log10(ms + 1e-20)
    return (starts + w / 2) / SR, lk


def lra(x: np.ndarray) -> float:
    _, s = loudness_curve(x, 3.0, 0.1)
    s = s[s > -70]
    if len(s) < 2:
        return 0.0
    rel = 10 * np.log10(np.mean(10 ** (s / 10))) - 20
    s = s[s > rel]
    return float(np.percentile(s, 95) - np.percentile(s, 10)) if len(s) > 1 else 0.0


def band_db(x: np.ndarray, lo: float, hi: float) -> float:
    m = dsp.mono(x)
    f, P = signal.welch(m, SR, nperseg=min(32768, len(m)))  # 1.5 Hz bins: no leakage into 'sub'
    sel = (f >= lo) & (f < hi)
    return float(10 * np.log10(np.sum(P[sel]) + 1e-30))


def metrics(x: np.ndarray) -> dict:
    """The standard measurement set for one signal."""
    xs = dsp.st(x)
    pk = dsp.peak(xs)
    r = dsp.rms(xs)
    tp = dsp.true_peak_db(xs)
    total = band_db(xs, 20, 20000)
    out = {
        "lufs_integrated": round(dsp.lufs(xs), 2),
        "lra_lu": round(lra(xs), 2),
        "true_peak_dbtp": round(tp, 2),
        "sample_peak_dbfs": round(dsp.db(pk), 2),
        "rms_dbfs": round(dsp.db(r), 2),
        "crest_factor_db": round(dsp.db(pk) - dsp.db(r), 2) if r > 0 else None,
        "dc_offset": [float(f"{v:.2e}") for v in xs.mean(axis=0)],
        "sub30_rel_db": round(band_db(xs, 5, 30) - total, 1),
        "band_2k_5k_vs_200_2k_db": round(band_db(xs, 2000, 5000) - band_db(xs, 200, 2000), 1),
    }
    if np.any(xs[:, 0] != xs[:, 1]):
        L, R = xs[:, 0], xs[:, 1]
        den = math.sqrt(float(np.sum(L * L) * np.sum(R * R))) or 1.0
        out["lr_correlation"] = round(float(np.sum(L * R)) / den, 3)
        mono = (L + R) / 2
        out["mono_foldown_loss_db"] = round(dsp.lufs(xs) - (dsp.lufs(np.stack([mono, mono], 1))), 2)
    st_t, st_l = loudness_curve(xs, 3.0, 0.1)
    out["short_term_max_lufs"] = round(float(np.max(st_l)), 2) if len(st_l) else None
    return out


# ---------------------------------------------------------------- discontinuities

def edge_check(x: np.ndarray, edges_s, win: float = 0.003, onsets=()) -> list:
    """At each edit time, compare the sample step with the local waveform slope.

    A click at an edit is a step much larger than the signal's own local
    sample-to-sample motion. Returns suspicious edits (time, step, ratio).
    """
    m = dsp.mono(x)
    d = np.abs(np.diff(m))
    bad = []
    w = dsp.ns(win)
    for t in edges_s:
        i = dsp.ns(t)
        if i < w + 1 or i > len(d) - w - 1:
            continue
        local = d[i - w: i + w]
        step = float(local.max())
        ref = float(np.median(d[max(i - 20 * w, 0): i - w]) + 1e-9)
        if step > 1e-3 and step / ref > 40:
            near = [o for o in onsets if abs(o - t) < 0.012]
            bad.append({"t": round(t, 4), "step": round(step, 5), "ratio": round(step / ref, 1),
                        "explained": f"intended onset of a sound event at {near[0]:.3f}s" if near else None})
    return bad


def onset_from_silence(x: np.ndarray, floor_db: float = -75.0, jump_db: float = -45.0) -> list:
    """Find abrupt starts out of digital near-silence (no fade)."""
    m = np.abs(dsp.mono(x))
    pre = dsp.ns(0.004)
    c = np.concatenate([[0.0], np.cumsum(m ** 2)])
    idx = np.nonzero(m > dsp.undb(jump_db))[0]
    hits, last = [], -10 ** 9
    for i in idx:
        if i - last < dsp.ns(0.05) or i < pre:
            last = i if i - last < dsp.ns(0.05) else last
            continue
        e = math.sqrt((c[i] - c[i - pre]) / pre)
        if dsp.db(e) < floor_db and i > 0 and abs(m[i]) - abs(m[i - 1]) > dsp.undb(jump_db):
            hits.append(round(i / SR, 4))
        last = i
    return hits


def hf_spikes(x: np.ndarray, thresh_db: float = 24.0) -> list:
    """Isolated broadband clicks: very short bursts above 12 kHz standing far
    above their local median. Intended transients (ticks) are listed too, so
    the list is compared with the known event times."""
    m = dsp.hp(dsp.mono(x), 12000, 4)
    h = dsp.ns(0.001)
    k = len(m) // h
    e = np.sqrt(np.mean(m[: k * h].reshape(k, h) ** 2, axis=1) + 1e-16)
    ed = 20 * np.log10(e)
    med = signal.medfilt(ed, 201)
    spikes = np.nonzero((ed - med > thresh_db) & (ed > -70))[0]
    out, last = [], -100
    for s in spikes:
        if s - last > 20:
            out.append(round(s * h / SR, 4))
        last = s
    return out


ONSET_OFFSET = {"valve-clunk": 0.15, "latch": 0.036, "align-snap": 0.028, "packet": 0.19, "sheet-in": 0.3}
AT_DUR = ("gauge",)  # the transient sits at the event's dur
LOW = ()  # low-mid transients to be measured through a 60 Hz high-pass instead of 200 Hz
CONTINUOUS = ("van", "footsteps", "pencil-hatch", "pull", "push", "arc", "handwheel", "paper-slide", "stretch",
              "technical-pen", "pencil-stroke", "connect-line", "rewind-suction", "rewind-whoosh")
SHARP = ("valve-clunk", "system-tick", "cross-snap", "choice-accent", "decision-accent", "chain-record",
         "chain-trust", "chain-decision", "chain-price", "chain-capacity", "latch", "stamp", "confirm",
         "latch-soft", "record-append", "focus", "gauge")


def onset_timing(sfx: np.ndarray, events, frame: float = 0.0005) -> dict:
    """Measure where each sharp sync sound actually starts in the rendered
    SFX stem, against where it was asked to start (t plus the sound's own
    internal onset). The onset is where the level rises fastest (over 2 ms)
    among 0.5 ms frames within 12 dB of the local peak, so a texture that
    leads into a sound does not count as its start."""
    h = max(int(frame * SR), 1)

    def levels(hp_hz):
        m = dsp.hp(dsp.mono(sfx), hp_hz, 2)
        k = len(m) // h
        return 20 * np.log10(np.abs(m[: k * h]).reshape(k, h).max(axis=1) + 1e-12)
    lv_hi, lv_lo = levels(200), levels(60)
    k = len(lv_hi)
    rows = []
    for e in events:
        if e["kind"] not in SHARP:
            continue
        lv = lv_lo if e["kind"] in LOW else lv_hi
        t0 = e["t"] + ONSET_OFFSET.get(e["kind"], 0.0) + (float(e.get("dur") or 0.0) if e["kind"] in AT_DUR else 0.0)
        # another sound starting close by, or a continuous one running through it, masks the reading
        masked = any(o is not e and ((abs(o["t"] - t0) < 0.08) or
                                     (o["kind"] in CONTINUOUS and o["t"] < t0 < o["t"] + float(o.get("dur") or 0.5)))
                     for o in events)
        a, b = int((t0 - 0.04) / frame), int((t0 + 0.06) / frame)
        if a < 0 or b >= k:
            continue
        w = lv[a:b]
        pk = w.max()
        rise = np.full(len(w), -np.inf)
        rise[4:] = w[4:] - w[:-4]  # level rise over 2 ms
        rise[w < pk - 12.0] = -np.inf
        on = a + int(np.argmax(rise)) - 3
        rows.append({"kind": e["kind"], "t": round(t0, 4), "delta_ms": round((on * frame - t0) * 1000, 2),
                     "masked": bool(masked)})
    clear = [abs(r["delta_ms"]) for r in rows if not r["masked"]]
    d = np.array(clear) if clear else np.array([0.0])
    dall = np.array([abs(r["delta_ms"]) for r in rows]) if rows else np.array([0.0])
    return {"count": len(rows), "clear": len(clear),
            "max_abs_delta_ms": round(float(d.max()), 2), "median_abs_delta_ms": round(float(np.median(d)), 2),
            "max_abs_delta_ms_including_masked": round(float(dall.max()), 2),
            "note": "clear rows have no other sound starting within 80 ms and no continuous sound running "
                    "through them; a masked reading measures its neighbour, not a timing error (placement is "
                    "sample exact)", "rows": rows}


# ---------------------------------------------------------------- the grid, heard

def _energy_onsets(x: np.ndarray, lo_hz: float = 150.0, rise_db: float = 6.0, context_db: float = 18.0,
                   floor_db: float = -62.0, hop: float = 0.001, win: float = 0.012, span: float = 0.024):
    """Onset times (s): where the level (above lo_hz, 12 ms windows every 1 ms,
    longer than one period of any note that passes the high-pass, so a low
    sustained note does not flicker) rises by rise_db within span, while
    standing within context_db of the
    loudest moment in the surrounding 1.5 s. Sustained sounds with vibrato,
    decaying tails, slow swells and anything 36 dB under the signal's loud
    level do not trigger it; attacks do. Returns the
    first frame of each rise (window centre), at least 50 ms apart."""
    from scipy.ndimage import maximum_filter1d, minimum_filter1d
    m = dsp.hp(dsp.mono(x), lo_hz, 2)
    h, w = max(dsp.ns(hop), 1), max(dsp.ns(win), 1)
    c = np.concatenate([[0.0], np.cumsum(m * m)])
    k = (len(m) - w) // h
    if k < 4:
        return np.zeros(0)
    st_ = np.arange(k) * h
    E = 10 * np.log10((c[st_ + w] - c[st_]) / w + 1e-20)
    L = max(int(round(span / hop)), 1)
    prev = minimum_filter1d(E, size=L, origin=(L - 1) // 2, mode="nearest")  # min over the L frames before
    prev = np.concatenate([np.full(1, E[0]), prev[:-1]])
    ctx = maximum_filter1d(E, size=int(1.5 / hop), mode="nearest")
    floor = max(floor_db, float(np.percentile(E, 99)) - 36.0)  # quiet stretches never count as attacks
    cand = np.nonzero((E - prev >= rise_db) & (E >= ctx - context_db) & (E > floor))[0]
    out, last = [], -10 ** 9
    for i in cand:
        if i - last > int(0.05 / hop):
            out.append((i * h + w / 2) / SR)
        last = i
    return np.array(out)


def _detector_latency():
    """The onset detector's own offset, measured on sharp clicks at known times."""
    from . import library
    n = dsp.ns(6.0)
    y = np.zeros((n, 2))
    at = [0.5 + 0.61 * k for k in range(9)]
    click_ = dsp.st(library.relay_click(3)) * 0.1
    for a in at:
        i = dsp.ns(a)
        y[i:i + len(click_)] += click_[: n - i]
    det = _energy_onsets(y)
    lat = [min(det, key=lambda v: abs(v - a)) - a for a in at] if len(det) else []
    return float(np.median(lat)) if lat else 0.0


def _grid_stats(x, g, lat, C):
    det = _energy_onsets(x) - lat
    rs, re_ = C["rewindStart"], C["rewindEnd"]
    det = det[(det > 0.1) & ((det < rs) | (det > re_ + 0.2)) & (det < C.duration - 0.1)]
    so = np.array([t - g.q(t, g.six) for t in det])
    if not len(so):
        return {"detected_onsets": 0}
    a = np.abs(so)
    return {"detected_onsets": int(len(det)),
            "signed_median_offset_ms": round(float(np.median(so)) * 1000, 2),
            "median_abs_offset_from_sixteenth_ms": round(float(np.median(a)) * 1000, 2),
            "p90_abs_offset_ms": round(float(np.percentile(a, 90)) * 1000, 2),
            "within_5ms_of_grid": round(float(np.mean(a <= 0.005)), 3),
            "within_10ms_of_grid": round(float(np.mean(a <= 0.010)), 3),
            "within_20ms_of_grid": round(float(np.mean(a <= 0.020)), 3)}


def grid_audio_check(fam: dict, music_stem: np.ndarray, arr, C) -> dict:
    """Listen for the grid: the attacks heard in the layers that articulate
    it (the pulse and the felt piano, rendered, before the carve), in each
    score family, and in the delivered music stem, each against the nearest
    sixteenth of the film's grid, after removing the detector's own offset
    (measured on sharp clicks). The rewind (the score backward) is left out.
    Onsets at random would give a median offset of about 41 ms at 92 BPM (a
    quarter of a sixteenth); a soft felt-piano attack reads about 5 to 8 ms
    after its note-on by nature."""
    g = arr.g
    lat = _detector_latency()
    rhythm = sum(fam[k] for k in ("pulse", "piano") if k in fam)
    per = {k: _grid_stats(v, g, lat, C) for k, v in fam.items()}
    rs, re_ = C["rewindStart"], C["rewindEnd"]
    det = _energy_onsets(fam["piano"]) - lat if "piano" in fam else np.zeros(0)
    sched = sorted({nn[0] for p in arr.parts.values() if p.inst == "piano" for nn in p.notes
                    if not (rs < nn[0] < re_ + 0.2)})
    d = np.array([det[np.argmin(np.abs(det - t))] - t for t in sched]) if len(det) and sched else np.zeros(0)
    return {
        "detector_offset_ms": round(lat * 1000, 2),
        "rhythmic_layers_pulse_and_piano": _grid_stats(rhythm, g, lat, C),
        "piano_note_ons_to_nearest_attack": {
            "notes": len(sched), "median_ms": round(float(np.median(d)) * 1000, 2) if len(d) else None,
            "within_15ms": round(float(np.mean(np.abs(d) <= 0.015)), 3) if len(d) else None,
            "note": "notes that start over their own sustain (repeated ostinato notes, chord tones) show "
                    "no separate 6 dB rise; they are not late, only unheard as attacks"},
        "by_family": per,
        "music_stem": _grid_stats(music_stem, g, lat, C),
        "note": "a sixteenth is %.0f ms; an attack is a 6 dB rise within 24 ms, prominent within 18 dB of "
                "its surroundings. Sustained families (pad, strings, reverb returns) have few true attacks; "
                "their readings are the patches' own slow shimmer and are not a timing measure." % (g.six * 1000),
        "scheduled": arr.grid_check(),
    }


def silence_windows(bed: np.ndarray, C, arr, holds) -> dict:
    """Music plus SFX in the moments that must be quiet (momentary, 400 ms)."""
    tt, lm = loudness_curve(bed, 0.4, 0.05)
    mk = arr.marks
    B = arr.g.beat

    def win(a, b):
        sel = (tt >= a) & (tt <= b)
        if b - a < 0.2 or not np.any(sel):
            return None
        v = lm[sel]
        return {"from": round(a, 2), "to": round(b, 2), "median_lufs_m": round(float(np.median(v)), 1),
                "max_lufs_m": round(float(np.max(v)), 1)}
    out = {
        "unnoticed_change (offline + 1 beat to L08 end)": win(C["offline"] + B, C["nobodyEnd"]),
        "after_L08 (to afterwards)": win(C["nobodyEnd"] + 0.3, C["afterwards"] - 0.05),
        "landing (rewindEnd to first note)": win(C["rewindEnd"] + 0.05, mk["bE"]),
        "crossing (cross to riskOwner)": win(C["cross"], C["riskOwner"]),
        "full_chain_hold (chainHold to priora)": win(C["chainHold"], C["priora"] - 0.05),
        "final_2s": win(C.duration - 2.0, C.duration),
        "reference_act2_ostinato (bar near connects + 4 bars)": win(mk["bF"], mk["bF"] + 4 * arr.g.bar),
    }
    hl = []
    for h in holds or []:
        a, b = h["t"] + min(0.25, h["dur"] / 3), h["t"] + h["dur"]
        before = win(max(h["t"] - 2.0, 0), h["t"] - 0.05)
        inside = win(a, b)
        hl.append({"t": round(h["t"], 2), "dur": round(h["dur"], 2), "gain_db": h["gain_db"],
                   "before_median": before["median_lufs_m"] if before else None,
                   "inside_median": inside["median_lufs_m"] if inside else None})
    out["holds"] = hl
    return out


# ---------------------------------------------------------------- pictures

def _mpl():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    return plt


def _spec_ax(ax, x, t0=0.0, fmax=20000, nper=2048, vmin=-110, vmax=-20, marks=None):
    m = dsp.mono(x)
    f, t, S = signal.spectrogram(m, SR, window="hann", nperseg=nper, noverlap=nper * 3 // 4,
                                 scaling="spectrum", mode="magnitude")
    Sdb = 20 * np.log10(S + 1e-12)
    sel = (f >= 20) & (f <= fmax)
    ax.pcolormesh(t + t0, f[sel], Sdb[sel], shading="auto", cmap="magma", vmin=vmin, vmax=vmax)
    ax.set_yscale("log")
    ax.set_ylim(20, fmax)
    ax.set_yticks([30, 100, 300, 1000, 2000, 5000, 10000])
    ax.set_yticklabels(["30", "100", "300", "1k", "2k", "5k", "10k"], fontsize=6)
    for y in (30, 2000, 5000):
        ax.axhline(y, color="#6fd3ff", lw=0.4, alpha=0.5)
    if marks:
        for name, tm in marks:
            ax.axvline(tm, color="white", lw=0.5, alpha=0.6)
            ax.text(tm, fmax * 0.8, name, color="white", fontsize=5, rotation=90, va="top")
    ax.tick_params(labelsize=6)


def spectrogram_png(x, path, title="", t0=0.0, marks=None, level=True, fmax=20000,
                    vmin=-110, vmax=-20, width=14, height=5):
    plt = _mpl()
    if level:
        fig, (a1, a2) = plt.subplots(2, 1, figsize=(width, height), sharex=True,
                                     gridspec_kw={"height_ratios": [1, 3]})
        tt, lk = loudness_curve(x, 0.4, 0.02) if len(x) > dsp.ns(0.5) else (np.array([0]), np.array([-70]))
        a1.plot(tt + t0, lk, lw=0.6, color="#223")
        a1.set_ylim(-60, -5)
        a1.set_ylabel("LUFS-M", fontsize=6)
        a1.grid(alpha=0.3)
        a1.tick_params(labelsize=6)
        a1.set_title(title, fontsize=8)
        _spec_ax(a2, x, t0, fmax, marks=marks, vmin=vmin, vmax=vmax)
    else:
        fig, a2 = plt.subplots(1, 1, figsize=(width, height))
        a2.set_title(title, fontsize=8)
        _spec_ax(a2, x, t0, fmax, marks=marks, vmin=vmin, vmax=vmax)
    fig.tight_layout()
    fig.savefig(path, dpi=110)
    plt.close(fig)


def sheet_png(items, path, cols=4, title="", nper=1024):
    """Grid of small spectrograms (with waveform) for a set of sounds."""
    plt = _mpl()
    rows = math.ceil(len(items) / cols)
    fig, axes = plt.subplots(rows * 2, cols, figsize=(cols * 3.6, rows * 2.6),
                             gridspec_kw={"height_ratios": [1, 3] * rows})
    for k, (name, x) in enumerate(items):
        rr, cc = divmod(k, cols)
        aw, asp = axes[rr * 2][cc], axes[rr * 2 + 1][cc]
        m = dsp.mono(x)
        t = np.arange(len(m)) / SR
        aw.plot(t, m, lw=0.3, color="#223")
        aw.set_xlim(0, t[-1] if len(t) else 1)
        aw.set_ylim(-1, 1)
        aw.set_xticks([])
        aw.set_yticks([])
        aw.set_title(f"{name}  {len(m) / SR:.2f}s  tilt2-5k {band_db(x, 2000, 5000) - band_db(x, 200, 2000):+.0f}dB",
                     fontsize=6)
        _spec_ax(asp, x, 0, 20000, nper=nper, vmin=-120, vmax=-25)
        asp.set_xlim(0, t[-1] if len(t) else 1)
    for k in range(len(items), rows * cols):
        rr, cc = divmod(k, cols)
        axes[rr * 2][cc].axis("off")
        axes[rr * 2 + 1][cc].axis("off")
    fig.suptitle(title, fontsize=9)
    fig.tight_layout()
    fig.savefig(path, dpi=100)
    plt.close(fig)


def ltas_png(named, path, title=""):
    """Long-term average spectra, 1/6-octave smoothed, of several signals."""
    plt = _mpl()
    fig, ax = plt.subplots(figsize=(10, 4))
    for name, x in named:
        m = dsp.mono(x)
        if len(m) < 8192 or dsp.peak(m) == 0:
            continue
        f, P = signal.welch(m, SR, nperseg=8192)
        Pd = 10 * np.log10(P + 1e-30)
        cen = np.geomspace(25, 18000, 120)
        sm = [np.mean(Pd[(f >= c / 2 ** (1 / 12)) & (f < c * 2 ** (1 / 12))]) if np.any(
            (f >= c / 2 ** (1 / 12)) & (f < c * 2 ** (1 / 12))) else np.nan for c in cen]
        ax.semilogx(cen, sm, lw=1, label=name)
    ax.axvspan(2000, 5000, color="orange", alpha=0.08)
    ax.axvline(30, color="red", lw=0.5)
    ax.set_xlim(20, 20000)
    ax.set_ylim(-150, -40)
    ax.grid(alpha=0.3, which="both")
    ax.legend(fontsize=7)
    ax.set_title(title, fontsize=9)
    ax.set_xlabel("Hz", fontsize=7)
    ax.set_ylabel("dB (PSD)", fontsize=7)
    fig.tight_layout()
    fig.savefig(path, dpi=110)
    plt.close(fig)


def write_json(obj, path):
    with open(path, "w") as fh:
        json.dump(obj, fh, indent=2)
