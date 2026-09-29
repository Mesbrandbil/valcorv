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
    f, P = signal.welch(m, SR, nperseg=8192)
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

def edge_check(x: np.ndarray, edges_s, win: float = 0.003) -> list:
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
            bad.append({"t": round(t, 4), "step": round(step, 5), "ratio": round(step / ref, 1)})
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
        pk = dsp.peak(x)
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
