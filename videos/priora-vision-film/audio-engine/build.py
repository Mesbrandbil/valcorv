#!/usr/bin/env python3
"""Priora film audio engine: one command builds the score, the sound design and
the mix from the cue sheet, the scene events and the voice stem.

    python3 audio-engine/build.py

Defaults (relative to the project root): cues/resolved.json,
narration/timing.json, assets/audio/voice.wav -> assets/audio/music.wav,
sfx.wav, master.wav, and a QA report with spectrograms in
audio-engine/reports/. See docs/sound-design.md.
"""
from __future__ import annotations

import argparse
import os
import sys

sys.dont_write_bytecode = True  # keep the project free of __pycache__ folders
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from engine import library, pipeline, qa  # noqa: E402


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cues", default=os.path.join(ROOT, "cues", "resolved.json"))
    ap.add_argument("--timing", default=os.path.join(ROOT, "narration", "timing.json"),
                    help="word timings, used when resolved.json lines carry no words")
    ap.add_argument("--voice", default=os.path.join(ROOT, "assets", "audio", "voice.wav"))
    ap.add_argument("--events", action="append", default=[],
                    help="extra events JSON file(s), in addition to resolved.json events")
    ap.add_argument("--out", default=os.path.join(ROOT, "assets", "audio"))
    ap.add_argument("--qa", default=os.path.join(HERE, "reports"), help="QA report directory ('' to skip)")
    ap.add_argument("--pngs", action="store_true", help="also draw spectrogram and spectrum pictures into --qa")
    ap.add_argument("--no-auto", action="store_true", help="no default drawing events for silent scenes")
    ap.add_argument("--ceiling", type=float, default=-1.0, help="true-peak ceiling, dBTP")
    ap.add_argument("--target-lufs", type=float, default=-16.0,
                    help="integrated loudness of the master (EBU R128), default -16")
    ap.add_argument("--voice-passthrough", action="store_true",
                    help="leave the voice untouched (master loudness then follows the voice stem)")
    ap.add_argument("--master-gain-db", type=float, default=None,
                    help="force one gain for the whole mix instead of measuring it")
    ap.add_argument("--library", metavar="DIR", help="also write every library sound and a sheet to DIR")
    a = ap.parse_args(argv)

    if a.library:
        os.makedirs(a.library, exist_ok=True)
        import soundfile as sf
        from engine import rewind
        items = []
        for kind in list(library.KINDS) + list(rewind.KIT):
            x = pipeline.render_event({"kind": kind, "seed": 1})[0]
            sf.write(os.path.join(a.library, f"{kind}.wav"), x, 48000, subtype="PCM_24")
            items.append((kind, x))
        for k in range(0, len(items), 16):
            qa.sheet_png(items[k:k + 16], os.path.join(a.library, f"sheet-{k // 16 + 1}.png"), 4,
                         f"library {k // 16 + 1}")
        print(f"library: {len(items)} sounds -> {a.library}")

    rep = pipeline.run(ROOT, a.cues, a.timing, a.voice, a.out, a.qa or None, a.events, not a.no_auto,
                       a.ceiling, None if a.voice_passthrough else a.target_lufs, a.master_gain_db,
                       pngs=a.pngs)
    st = rep["qa"]["stems"]["master"]
    print(f"master: {st['lufs_integrated']} LUFS, {st['true_peak_dbtp']} dBTP, LRA {st['lra_lu']} LU; "
          f"stem sum error {rep['stem_sum_check']['max_abs_diff_dbfs']} dBFS; {rep['seconds']} s")
    for w in rep.get("warnings", []):
        print("warning:", w)
    for k, v in rep["outputs"].items():
        print(f"{k:7s} {v}")


if __name__ == "__main__":
    main()
