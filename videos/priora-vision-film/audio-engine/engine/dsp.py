"""DSP primitives for the Priora audio engine.

Everything runs at 48 kHz in float64. Mono signals are 1-D arrays, stereo
signals are (n, 2) arrays. Every random source is seeded through rng(), which
derives a generator from a seed plus string salts with SHA-256 (never Python's
per-process salted hash), so every render is bit-identical.
"""
from __future__ import annotations

import hashlib

import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 48000
LN1000 = np.log(1000.0)  # T60 constant: amplitude falls 60 dB = factor 1000


# ---------------------------------------------------------------- basics

def rng(seed, *salt) -> np.random.Generator:
    key = ("%s|" % (seed,) + "|".join(str(s) for s in salt)).encode()
    h = hashlib.sha256(key).digest()
    return np.random.default_rng(int.from_bytes(h[:8], "little"))


def ns(t: float) -> int:
    """Seconds to samples."""
    return int(round(t * SR))


def tvec(n: int) -> np.ndarray:
    return np.arange(n) / SR


def db(x: float) -> float:
    return float(20.0 * np.log10(max(float(x), 1e-12)))


def undb(d) -> np.ndarray | float:
    return 10.0 ** (np.asarray(d, dtype=float) / 20.0)


def mono(x: np.ndarray) -> np.ndarray:
    return x if x.ndim == 1 else x.mean(axis=1)


def st(x: np.ndarray) -> np.ndarray:
    """Force stereo (dual mono for a mono input)."""
    return np.stack([x, x], axis=1) if x.ndim == 1 else x


def peak(x: np.ndarray) -> float:
    return float(np.max(np.abs(x))) if x.size else 0.0


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(x)))) if x.size else 0.0


def normalize(x: np.ndarray, peak_db: float = -1.0) -> np.ndarray:
    p = peak(x)
    return x if p <= 0 else x * (undb(peak_db) / p)


def pad_to(x: np.ndarray, n: int) -> np.ndarray:
    if len(x) >= n:
        return x[:n]
    shape = (n - len(x),) + x.shape[1:]
    return np.concatenate([x, np.zeros(shape)], axis=0)


def mix(*parts) -> np.ndarray:
    """Sum arrays of different lengths (all mono or all stereo), aligned at 0."""
    n = max(len(p) for p in parts)
    out = np.zeros((n,) + parts[0].shape[1:])
    for p in parts:
        out[: len(p)] += p
    return out


def delay(x: np.ndarray, t: float) -> np.ndarray:
    k = ns(t)
    shape = (k,) + x.shape[1:]
    return np.concatenate([np.zeros(shape), x], axis=0)


# ---------------------------------------------------------------- noise

def white(n: int, r: np.random.Generator) -> np.ndarray:
    return r.standard_normal(n)


def colored(n: int, r: np.random.Generator, slope_db_oct: float = -3.0,
            lo: float = 20.0, hi: float | None = None) -> np.ndarray:
    """Noise with a spectral slope (dB/octave), band-limited, unit RMS."""
    n2 = max(n, 16)
    spec = np.fft.rfft(r.standard_normal(n2))
    f = np.fft.rfftfreq(n2, 1.0 / SR)
    f[0] = 1.0
    g = (f / 1000.0) ** (slope_db_oct / 6.0206)
    g *= 1.0 / (1.0 + (lo / f) ** 4)  # smooth 24 dB/oct low roll-off
    if hi:
        g *= 1.0 / (1.0 + (f / hi) ** 4)
    g[0] = 0.0
    y = np.fft.irfft(spec * g, n2)[:n]
    s = rms(y)
    return y / s if s > 0 else y


def pink(n, r, lo=20.0, hi=None):
    return colored(n, r, -3.0, lo, hi)


def brown(n, r, lo=25.0, hi=None):
    return colored(n, r, -6.0, lo, hi)


def poisson_impulses(n: int, rate: float, r: np.random.Generator,
                     amp_sigma: float = 0.6) -> np.ndarray:
    """Sparse random impulse train (rate per second, lognormal amplitudes)."""
    count = r.poisson(rate * n / SR)
    y = np.zeros(n)
    if count:
        idx = r.integers(0, n, count)
        amps = r.lognormal(0.0, amp_sigma, count) * r.choice([-1.0, 1.0], count)
        np.add.at(y, idx, amps)
    return y


# ---------------------------------------------------------------- filters

def _butter(kind, f, order):
    nyq = SR / 2.0
    if isinstance(f, (tuple, list)):
        f = [min(max(v, 1.0), nyq * 0.98) for v in f]
    else:
        f = min(max(f, 1.0), nyq * 0.98)
    return signal.butter(order, f, kind, fs=SR, output="sos")


def _apply(sos, x, zp=False):
    if zp:
        return signal.sosfiltfilt(sos, x, axis=0)
    return signal.sosfilt(sos, x, axis=0)


def hp(x, f, order=2, zp=False):
    return _apply(_butter("highpass", f, order), x, zp)


def lp(x, f, order=2, zp=False):
    return _apply(_butter("lowpass", f, order), x, zp)


def bp(x, lo, hi, order=2, zp=False):
    return _apply(_butter("bandpass", (lo, hi), order), x, zp)


def rbj(kind: str, f: float, q: float = 0.7071, gain_db: float = 0.0):
    """RBJ cookbook biquad coefficients (b, a)."""
    A = 10 ** (gain_db / 40.0)
    w0 = 2 * np.pi * min(f, SR * 0.49) / SR
    cw, sw = np.cos(w0), np.sin(w0)
    alpha = sw / (2 * q)
    if kind == "peak":
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
        a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    elif kind == "lowshelf":
        sa = 2 * np.sqrt(A) * alpha
        b = [A * ((A + 1) - (A - 1) * cw + sa), 2 * A * ((A - 1) - (A + 1) * cw),
             A * ((A + 1) - (A - 1) * cw - sa)]
        a = [(A + 1) + (A - 1) * cw + sa, -2 * ((A - 1) + (A + 1) * cw),
             (A + 1) + (A - 1) * cw - sa]
    elif kind == "highshelf":
        sa = 2 * np.sqrt(A) * alpha
        b = [A * ((A + 1) + (A - 1) * cw + sa), -2 * A * ((A - 1) + (A + 1) * cw),
             A * ((A + 1) + (A - 1) * cw - sa)]
        a = [(A + 1) - (A - 1) * cw + sa, 2 * ((A - 1) - (A + 1) * cw),
             (A + 1) - (A - 1) * cw - sa]
    elif kind == "bandpass":  # constant 0 dB peak gain
        b = [alpha, 0.0, -alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    else:
        raise ValueError(kind)
    b, a = np.array(b), np.array(a)
    return b / a[0], a / a[0]


def eq(x, kind, f, gain_db=0.0, q=0.7071):
    b, a = rbj(kind, f, q, gain_db)
    return signal.lfilter(b, a, x, axis=0)


def reson(x, f, q):
    """Resonant band-pass (0 dB at f)."""
    b, a = rbj("bandpass", f, q)
    return signal.lfilter(b, a, x, axis=0)


def dc_block(x, f=12.0):
    return hp(x, f, order=2)


def tilt(x, db_per_oct: float, pivot: float = 1000.0):
    """Gentle spectral tilt via a low shelf and a high shelf around a pivot."""
    y = eq(x, "lowshelf", pivot / 2.0, -db_per_oct * 1.0, 0.5)
    return eq(y, "highshelf", pivot * 2.0, db_per_oct * 1.0, 0.5)


def stft_shape(x: np.ndarray, gain_fn, nper: int = 1024, hop: int = 256) -> np.ndarray:
    """Time-varying spectral gain. gain_fn(times, freqs) -> (frames, bins) linear.

    Hann analysis/synthesis at 75 percent overlap (COLA), so a unity gain
    reconstructs the input to numerical precision.
    """
    if x.ndim == 2:
        return np.stack([stft_shape(x[:, c], gain_fn, nper, hop) for c in range(x.shape[1])], 1)
    n = len(x)
    f, t, Z = signal.stft(x, fs=SR, window="hann", nperseg=nper, noverlap=nper - hop,
                          boundary="zeros", padded=True)
    G = np.asarray(gain_fn(t, f))  # (frames, bins)
    Z = Z * G.T
    _, y = signal.istft(Z, fs=SR, window="hann", nperseg=nper, noverlap=nper - hop,
                        boundary=True)
    return pad_to(y, n)


def band_sweep(n: int, r: np.random.Generator, centers, q_path, nper=1024, hop=256,
               base: np.ndarray | None = None) -> np.ndarray:
    """Noise through a moving Gaussian band (in log frequency).

    centers and q_path are arrays sampled over the sound (any length); each is
    linearly resampled onto the STFT frames. q is the band width in octaves.
    """
    src = base if base is not None else white(n, r)
    cen = np.asarray(centers, float)
    wid = np.asarray(q_path, float)

    def g(times, freqs):
        u = np.clip(times / max(n / SR, 1e-9), 0, 1)
        grid = np.linspace(0, 1, len(cen))
        c = np.interp(u, grid, cen)[:, None]
        w = np.interp(u, np.linspace(0, 1, len(wid)), wid)[:, None]
        lf = np.log2(np.maximum(freqs[None, :], 1.0) / c)
        return np.exp(-0.5 * (lf / w) ** 2)

    return stft_shape(src, g, nper, hop)


# ---------------------------------------------------------------- envelopes

def curve(points, n: int, kind: str = "lin") -> np.ndarray:
    """Breakpoint envelope. points = [(t_seconds, value), ...].

    kind 'lin' interpolates linearly, 'cos' uses raised-cosine segments (smooth,
    no corners), 'db' interpolates values given in dB and returns linear gain.
    """
    pts = sorted(points)
    ts = np.array([p[0] for p in pts], float)
    vs = np.array([p[1] for p in pts], float)
    t = tvec(n)
    if kind == "cos":
        idx = np.clip(np.searchsorted(ts, t, side="right") - 1, 0, len(ts) - 1)
        nxt = np.clip(idx + 1, 0, len(ts) - 1)
        span = np.where(ts[nxt] > ts[idx], ts[nxt] - ts[idx], 1.0)
        u = np.clip((t - ts[idx]) / span, 0, 1)
        u = 0.5 - 0.5 * np.cos(np.pi * u)
        y = vs[idx] + (vs[nxt] - vs[idx]) * u
        y[t < ts[0]] = vs[0]
        y[t >= ts[-1]] = vs[-1]
        return y
    y = np.interp(t, ts, vs)
    if kind == "db":
        return undb(y)
    return y


def decay(n: int, t60: float) -> np.ndarray:
    return np.exp(-LN1000 * tvec(n) / max(t60, 1e-4))


def ar(n: int, attack: float, release: float, hold: float | None = None,
       shape: float = 1.0) -> np.ndarray:
    """Attack / hold / release envelope with raised-cosine edges."""
    a, r_ = max(ns(attack), 1), max(ns(release), 1)
    h = n - a - r_ if hold is None else ns(hold)
    h = max(h, 0)
    up = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    dn = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r_))
    e = np.concatenate([up, np.ones(h), dn])
    return pad_to(e ** shape, n)


def fade(x: np.ndarray, fin: float = 0.002, fout: float = 0.005) -> np.ndarray:
    """Raised-cosine fade in and out (click-free edges)."""
    y = x.copy()
    a, b = min(ns(fin), len(y)), min(ns(fout), len(y))
    if a > 1:
        w = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
        y[:a] *= w if y.ndim == 1 else w[:, None]
    if b > 1:
        w = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, b))
        y[-b:] *= w if y.ndim == 1 else w[:, None]
    return y


def smooth_noise(n: int, r: np.random.Generator, rate_hz: float) -> np.ndarray:
    """Slow random wander in [-1, 1] (band-limited to rate_hz)."""
    k = max(int(n / SR * rate_hz) + 4, 4)
    pts = r.uniform(-1, 1, k)
    x = np.linspace(0, k - 1, n)
    i = np.floor(x).astype(int)
    u = x - i
    u = 0.5 - 0.5 * np.cos(np.pi * u)
    i2 = np.minimum(i + 1, k - 1)
    return pts[i] * (1 - u) + pts[i2] * u


# ---------------------------------------------------------------- synthesis

def modal(freqs, t60s, amps, dur: float, mallet_ms: float = 0.0,
          r: np.random.Generator | None = None, jitter_cents: float = 0.0) -> np.ndarray:
    """Sum of exponentially decaying sine modes (sine phase: starts at zero).

    mallet_ms convolves with a half-sine contact pulse: a soft (felt) mallet
    is a longer contact and therefore a darker, rounder strike.
    """
    n = ns(dur)
    t = tvec(n)
    y = np.zeros(n)
    for i, (f, T, a) in enumerate(zip(freqs, t60s, amps)):
        if f >= SR * 0.45:
            continue
        if r is not None and jitter_cents:
            f = f * 2 ** (r.uniform(-1, 1) * jitter_cents / 1200.0)
        y += a * np.exp(-LN1000 * t / T) * np.sin(2 * np.pi * f * t)
    if mallet_ms > 0:
        m = max(ns(mallet_ms / 1000.0), 2)
        pulse = np.sin(np.linspace(0, np.pi, m))
        y = signal.fftconvolve(y, pulse / pulse.sum())[:n]
    return y


def click(r: np.random.Generator, lo=1500.0, hi=9000.0, dur=0.004, decay_s=0.0012) -> np.ndarray:
    """Tiny mechanical click: band-limited noise impulse with a fast decay."""
    n = ns(dur)
    e = np.exp(-tvec(n) / decay_s)
    y = bp(white(n, r) * e, lo, hi, 2)
    return fade(y, 0.0002, 0.001)


def thump(freq0: float, freq1: float, t60: float, dur: float) -> np.ndarray:
    """Low body thump: a sine with a downward pitch glide and exponential decay."""
    n = ns(dur)
    t = tvec(n)
    f = freq1 + (freq0 - freq1) * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-LN1000 * t / t60)


def sine(freq: float, dur: float, phase: float = 0.0) -> np.ndarray:
    return np.sin(2 * np.pi * freq * tvec(ns(dur)) + phase)


# ---------------------------------------------------------------- stereo

def pan(x: np.ndarray, p: float) -> np.ndarray:
    """Constant-power pan of a mono signal, p in [-1, 1] (-3 dB centre)."""
    if x.ndim == 2:
        return balance(x, p)
    th = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], axis=1)


def balance(x: np.ndarray, p: float) -> np.ndarray:
    """Stereo balance, keeps the centre at unity."""
    p = float(np.clip(p, -1, 1))
    gl = 1.0 if p <= 0 else 1.0 - p
    gr = 1.0 if p >= 0 else 1.0 + p
    return x * np.array([gl, gr])


def width(x: np.ndarray, w: float) -> np.ndarray:
    m = (x[:, 0] + x[:, 1]) * 0.5
    s = (x[:, 0] - x[:, 1]) * 0.5 * w
    return np.stack([m + s, m - s], axis=1)


def spread(x: np.ndarray, r: np.random.Generator, amount: float = 0.5,
           taps: int = 24) -> np.ndarray:
    """Mono to stereo via two short decorrelating FIR diffusers (1 to 12 ms).

    amount 0 is dual mono, 1 fully decorrelated. Mono sum stays close to the
    source because the diffusers share their first (direct) tap.
    """
    out = []
    for c in range(2):
        h = np.zeros(ns(0.013))
        h[0] = 1.0
        pos = r.integers(ns(0.001), len(h), taps)
        h[pos] += r.standard_normal(taps) * (0.35 / np.sqrt(taps)) * 2.0
        h /= np.sqrt(np.sum(h ** 2))
        out.append(signal.fftconvolve(x, h)[: len(x)])
    wet = np.stack(out, axis=1)
    return (1 - amount) * st(x) + amount * wet


# ---------------------------------------------------------------- reverb

_IR_PRESETS = {
    # t60 in seconds, per band multipliers (low, low-mid, high-mid, high)
    "booth": dict(t60=0.16, pre=0.002, mult=(1.1, 1.0, 0.8, 0.5), er=6, er_span=0.012, build=0.002),
    "room": dict(t60=0.42, pre=0.004, mult=(1.15, 1.0, 0.75, 0.45), er=10, er_span=0.03, build=0.004),
    "roof": dict(t60=0.9, pre=0.012, mult=(0.9, 1.0, 0.7, 0.35), er=5, er_span=0.06, build=0.02),
    "plate": dict(t60=1.7, pre=0.008, mult=(0.85, 1.0, 0.95, 0.75), er=0, er_span=0.0, build=0.003),
    "hall": dict(t60=2.8, pre=0.022, mult=(1.25, 1.0, 0.7, 0.4), er=14, er_span=0.07, build=0.018),
    "space": dict(t60=5.5, pre=0.03, mult=(1.2, 1.0, 0.65, 0.35), er=8, er_span=0.09, build=0.04),
}


def make_ir(kind: str = "room", seed: int = 11, t60: float | None = None) -> np.ndarray:
    """Synthetic stereo impulse response (deterministic).

    Late tail: decorrelated noise split into four bands, each with its own
    decay (air absorption: highs die first), with a soft density build-up.
    Early reflections: sparse low-passed taps. Normalised to unit energy.
    """
    p = dict(_IR_PRESETS[kind])
    T = t60 or p["t60"]
    r = rng(seed, "ir", kind, T)
    n = ns(T * 1.1 + p["pre"] + 0.05)
    t = tvec(n)
    edges = [(20, 250), (250, 1200), (1200, 5000), (5000, 20000)]
    chans = []
    for c in range(2):
        tail = np.zeros(n)
        base = r.standard_normal(n)
        for (lo, hi), m in zip(edges, p["mult"]):
            band = bp(base, lo, hi, 2, zp=True)
            tail += band * np.exp(-LN1000 * t / (T * m))
        tail *= 1 - np.exp(-t / max(p["build"], 1e-4))
        er = np.zeros(n)
        for k in range(p["er"]):
            dt = p["pre"] + r.uniform(0.001, max(p["er_span"], 0.002))
            i = ns(dt)
            if i < n:
                er[i] += r.uniform(0.3, 0.8) * (1 if r.random() > 0.5 else -1) * np.exp(-dt / 0.05)
        if p["er"]:
            er = lp(er, 6000, 2)
        ir = np.concatenate([np.zeros(ns(p["pre"])), tail])[:n] * 0.55 + er * 0.45
        ir = fade(ir, 0.0, 0.05)
        chans.append(ir)
    ir = np.stack(chans, axis=1)
    ir /= np.sqrt(np.sum(ir ** 2) / 2)
    return ir


def convolve(x: np.ndarray, ir: np.ndarray, keep_tail: bool = True) -> np.ndarray:
    """Convolve mono or stereo x with a stereo IR, returns stereo (wet only)."""
    xs = st(x)
    n = len(xs) + (len(ir) - 1 if keep_tail else 0)
    out = np.zeros((n, 2))
    for c in range(2):
        y = signal.oaconvolve(xs[:, c], ir[:, c])
        out[:, c] = y[:n]
    return out


def verb(x: np.ndarray, kind: str = "room", wet: float = 0.2, seed: int = 11,
         hp_hz: float = 150.0, lp_hz: float = 9000.0, t60: float | None = None) -> np.ndarray:
    """Dry plus filtered convolution send. Returns stereo, length + tail."""
    ir = make_ir(kind, seed, t60)
    send = lp(hp(st(x), hp_hz, 2), lp_hz, 2)
    w = convolve(send, ir)
    return mix(st(x), w * wet)


# ---------------------------------------------------------------- nonlinear

def saturate(x: np.ndarray, drive_db: float = 6.0, mix_: float = 1.0) -> np.ndarray:
    """tanh saturation that keeps small-signal gain at unity, DC-blocked."""
    g = float(undb(drive_db))
    y = np.tanh(g * x) / g
    y = dc_block(y, 8.0)
    return (1 - mix_) * x + mix_ * y


# ---------------------------------------------------------------- measurement

def true_peak(x: np.ndarray) -> float:
    """True peak (linear) by 4x polyphase oversampling (ITU-R BS.1770 style)."""
    up = signal.resample_poly(st(x), 4, 1, axis=0)
    return float(np.max(np.abs(up)))


def true_peak_db(x: np.ndarray) -> float:
    return db(true_peak(x))


def lufs(x: np.ndarray) -> float:
    import pyloudnorm as pyln
    if len(x) < ns(0.45):
        x = pad_to(x, ns(0.45))
    v = pyln.Meter(SR).integrated_loudness(x)
    return float(v) if np.isfinite(v) else -120.0


def env_follow(x: np.ndarray, attack: float, release: float, frame: float = 0.005):
    """Frame-rate RMS envelope (dB) with attack / release smoothing.

    Returns (times, level_db). Vectorised in frames, looped only over frames.
    """
    m = mono(x)
    h = ns(frame)
    k = len(m) // h
    fr = np.sqrt(np.mean(m[: k * h].reshape(k, h) ** 2, axis=1) + 1e-14)
    lv = 20 * np.log10(fr)
    a = np.exp(-frame / max(attack, 1e-4))
    r_ = np.exp(-frame / max(release, 1e-4))
    out = np.empty_like(lv)
    s = lv[0]
    for i, v in enumerate(lv):
        c = a if v > s else r_
        s = c * s + (1 - c) * v
        out[i] = s
    return (np.arange(k) + 0.5) * frame, out

