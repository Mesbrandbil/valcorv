"""The mix: voice-aware carve, stems, master and the true-peak ceiling.

Voice passthrough: assets/audio/voice.wav is never processed. It is played as
dual mono (the same signal on both channels, exactly as a browser or ffmpeg
up-mixes a mono file), so master = voice + music + sfx sample for sample, and
the composition can place voice.wav, music.wav and sfx.wav at volume 1 and get
the master.

Carve (music and the ambience beds, never the voice, never the sync one-shots):
  * voice activity: the voice's own band-limited level, 10 ms frames, 60 ms
    look-ahead, 25 ms attack, 420 ms release (music does not snap back);
  * a gentle broadband duck (music up to -4.5 dB, beds -2.5 dB);
  * a dynamic dip centred at 2.2 kHz spanning about 1 to 4.5 kHz (music up to
    -6 dB, beds -4 dB) and a small low-mid dip at 450 Hz for the voice's body;
  * all applied as one smooth time-varying spectral gain (STFT, 75 percent
    overlap), so there is no pumping and no filter zipper.

Ceiling: a look-ahead limiter acting on the music and SFX only, computed from
the 4x oversampled sum with the voice, so the master's true peak stays at or
under the ceiling without touching the voice. The same gain curve is applied to
music and SFX, so the stems still sum exactly to the master.
"""
from __future__ import annotations

import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d

from . import dsp
from .dsp import SR, ns

FRAME = 0.01


def voice_activity(voice: np.ndarray, lookahead=0.06, attack=0.025, release=0.42):
    """Voice activity 0..1 at FRAME rate: (times, activity)."""
    v = dsp.bp(dsp.mono(voice), 150, 5000, 2)
    h = ns(FRAME)
    k = len(v) // h
    lv = 10 * np.log10(np.mean(v[: k * h].reshape(k, h) ** 2, axis=1) + 1e-14)
    active = lv[lv > -60]
    ref = np.percentile(active, 90) if len(active) else -20.0
    act = np.clip((lv - (ref - 22.0)) / 14.0, 0, 1)
    # look-ahead: the duck starts slightly before the word
    sh = int(round(lookahead / FRAME))
    act = np.concatenate([act[sh:], np.zeros(sh)])
    a = np.exp(-FRAME / attack)
    r_ = np.exp(-FRAME / release)
    out = np.empty_like(act)
    s = 0.0
    for i, x in enumerate(act):
        c = a if x > s else r_
        s = c * s + (1 - c) * x
        out[i] = s
    return (np.arange(k) + 0.5) * FRAME, out


def _bell(freqs, fc, octaves):
    return np.exp(-0.5 * (np.log2(np.maximum(freqs, 1.0) / fc) / octaves) ** 2)


def carve(x: np.ndarray, act_t: np.ndarray, act: np.ndarray, duck_db: float, mid_db: float,
          lowmid_db: float) -> np.ndarray:
    """Dynamic carve of x under the voice (see module docstring)."""
    def gains(times, freqs):
        a = np.interp(times, act_t, act)[:, None]
        mid = _bell(freqs, 2200.0, 0.85)[None, :]
        low = _bell(freqs, 450.0, 0.7)[None, :]
        g_db = -a * (duck_db + mid_db * mid + lowmid_db * low)
        return 10 ** (g_db / 20.0)
    return dsp.stft_shape(x, gains, nper=2048, hop=512)


def smooth_gain(greq: np.ndarray, lookahead: float, release: float):
    """Turn a per-sample gain requirement into a smooth gain that never
    exceeds it: 32-sample blocks, a look-ahead minimum over blocks
    [k-2, k+L+1], an attack average over [k-L, k], exponential release and
    linear interpolation between block centres (each step keeps every
    sample at or below its own requirement)."""
    n = len(greq)
    B = 32
    nb = int(np.ceil(n / B))
    gb = np.ones(nb * B)
    gb[:n] = greq
    gb = gb.reshape(nb, B).min(axis=1)
    L = max(int(np.ceil(lookahead * SR / B)), 1)
    size = L + 4
    lam = minimum_filter1d(gb, size=size, origin=2 - size // 2, mode="nearest")
    att = np.convolve(np.concatenate([np.ones(L), lam]), np.ones(L + 1) / (L + 1), mode="valid")[:nb]
    alpha = 1 - np.exp(-B / (release * SR))
    out = np.empty(nb)
    s = 1.0
    for i, v in enumerate(att):
        s = min(v, s + (1 - s) * alpha)
        out[i] = s
    centers = (np.arange(nb) + 0.5) * B
    return np.interp(np.arange(n), centers, out), float(-20 * np.log10(max(out.min(), 1e-6)))


def ceiling_gain(voice_st: np.ndarray, bed: np.ndarray, ceiling_db: float = -1.0,
                 lookahead: float = 0.003, release: float = 0.08):
    """Per-sample gain (0..1) for the non-voice part so that the 4x
    oversampled |voice + g * bed| stays under the ceiling."""
    c = float(dsp.undb(ceiling_db))
    V = signal.resample_poly(voice_st, 4, 1, axis=0)
    U = signal.resample_poly(bed, 4, 1, axis=0)
    S = V + U
    over = np.abs(S) > c
    n = len(voice_st)
    if not np.any(over):
        return np.ones(n), 0.0
    with np.errstate(divide="ignore", invalid="ignore"):
        gm = (np.sign(U) * c - V) / U
    gm = np.where(over, np.clip(np.nan_to_num(gm, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0), 1.0)
    greq = gm.min(axis=1)[: 4 * n].reshape(n, 4).min(axis=1)
    return smooth_gain(greq, lookahead, release)


def voice_limiter(vst: np.ndarray, ceiling_db: float, lookahead: float = 0.0015, release: float = 0.06):
    """Transparent look-ahead true-peak limiter for the voice stem."""
    c = float(dsp.undb(ceiling_db))
    V = np.abs(signal.resample_poly(vst, 4, 1, axis=0)).max(axis=1)
    n = len(vst)
    with np.errstate(divide="ignore"):
        req = np.minimum(1.0, c / np.maximum(V, 1e-12))
    greq = req[: 4 * n].reshape(n, 4).min(axis=1)
    if greq.min() >= 1.0:
        return vst, np.ones(n), 0.0
    g, gr = smooth_gain(greq, lookahead, release)
    return vst * g[:, None], g, gr


def build_master(voice_mono: np.ndarray, music: np.ndarray, sfx: np.ndarray, ceiling_db: float = -1.0,
                 target_lufs: float | None = -16.0, gain_db: float | None = None,
                 report: dict | None = None):
    """Returns (voice_stem, music_stem, sfx_stem, master), all stereo, with
    master == voice_stem + music_stem + sfx_stem exactly (before quantisation).

    target_lufs None (voice passthrough): the voice is untouched, only the
    music and SFX yield to the ceiling. Otherwise one gain G scales the whole
    mix to the target; the voice is DC-blocked and, only where G pushes it
    over (ceiling - 0.4 dB), held by a transparent look-ahead limiter, leaving
    0.4 dB for the beds. gain_db forces G instead of measuring it.
    """
    n = len(music)
    v = dsp.pad_to(dsp.mono(voice_mono), n)
    info = {"mode": "passthrough" if target_lufs is None and gain_db is None else "target"}
    if info["mode"] == "passthrough":
        G_db = 0.0
    else:
        v = dsp.dc_block(v, 10.0)
        G_db = gain_db if gain_db is not None else target_lufs - dsp.lufs(dsp.st(v) + music + sfx)
    for it in range(6):
        G = float(dsp.undb(G_db))
        vst = dsp.st(v) * G
        vgr, vtime = 0.0, 0.0
        if info["mode"] != "passthrough":
            vst, gv, vgr = voice_limiter(vst, ceiling_db - 0.4)
            vtime = float(np.sum(gv < dsp.undb(-0.5))) / SR
        mu, sx = music * G, sfx * G
        target = ceiling_db - 0.05
        for _ in range(4):
            g, gr = ceiling_gain(vst, mu + sx, target)
            mu2, sx2 = mu * g[:, None], sx * g[:, None]
            master = vst + mu2 + sx2
            tp = dsp.true_peak_db(master)
            if tp <= ceiling_db + 1e-6:
                break
            target -= (tp - ceiling_db) + 0.02
        L = dsp.lufs(master)
        info.update({"iterations": it + 1, "gain_db": round(G_db, 3), "lufs": round(L, 3),
                     "true_peak_dbtp": round(tp, 3), "voice_limiter_max_db": round(vgr, 2),
                     "voice_limited_over_0_5db_seconds": round(vtime, 3),
                     "bed_ceiling_max_db": round(gr, 2),
                     "bed_ceiling_seconds": round(float(np.sum(g < 0.999)) / SR, 3)})
        if info["mode"] == "passthrough" or gain_db is not None or abs(L - target_lufs) < 0.05:
            break
        G_db += target_lufs - L
    if report is not None:
        report["master"] = info
    return vst, mu2, sx2, master
