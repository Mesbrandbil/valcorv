#!/usr/bin/env python3
"""Seek-order determinism check for the whole film.

HyperFrames renders a frame by seeking the timeline, and a frame must look the
same whatever was rendered before it. This captures the same film times twice,
once in ascending order and once in a shuffled order (fixed seed), and compares
the pixels of every pair.

    python3 scripts/seek-check.py --out /path/to/scratch/seek [--times 1,2,3] [--project .]

Default times: every scene's start + 0.35 s, midpoint and end - 0.35 s, plus the
key cues (see KEY_CUES). Exit 1 when any pair differs by more than the tolerance
(max channel difference > --tol on more than --area pixels).
"""

from __future__ import annotations

import argparse
import json
import random
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
KEY_CUES = ["hour", "equipment", "workMoves", "accepted", "translate", "checklists", "noOne", "head", "hotWork",
            "certificate", "landing", "then", "offline", "changed", "nobody", "afterwards", "q2", "gap",
            "rewindStart", "rewindEnd", "riskChanged", "welding", "connects", "connectionHold", "certificate2",
            "keeps", "proof", "l16", "sees", "cross", "change", "retain", "whether", "few", "closeIn",
            "chainTrust", "chainHold", "priora"]


def default_times(project: Path) -> list[float]:
    r = json.loads((project / "cues" / "resolved.json").read_text())
    end = r["film"]["duration"]
    ts = set()
    for s in r["scenes"].values():
        a, b = s["start"], s["start"] + s["duration"]
        for t in (a + 0.35, (a + b) / 2, b - 0.35):
            ts.add(round(min(max(t, 0.05), end - 0.05), 2))
    for k in KEY_CUES:
        if k in r["cues"]:
            for off in (0.2, 0.9):
                t = r["cues"][k] + off
                if 0 < t < end:
                    ts.add(round(t, 2))
    return sorted(ts)


def snap(project: Path, times: list[float], out: Path) -> dict[float, Path]:
    out.mkdir(parents=True, exist_ok=True)
    at = ",".join(f"{t:g}" for t in times)
    subprocess.run(["npx", "--yes", "hyperframes@0.8.92", "snapshot", ".", "--at", at, "--no-end", "-o", str(out)],
                   cwd=project, check=True, stdout=subprocess.DEVNULL)
    found = {}
    for f in out.glob("frame-*-at-*s.png"):
        m = re.search(r"-at-([0-9.]+)s\.png$", f.name)
        if m:
            found[round(float(m.group(1)), 2)] = f
    return found


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", required=True, help="scratch directory for the two snapshot runs")
    ap.add_argument("--project", default=str(ROOT))
    ap.add_argument("--times", help="comma separated film times (default: scene edges, midpoints and key cues)")
    ap.add_argument("--tol", type=int, default=8, help="max channel difference counted as equal")
    ap.add_argument("--area", type=int, default=40, help="pixels allowed above the tolerance")
    ap.add_argument("--batch", type=int, default=40, help="times per snapshot run")
    args = ap.parse_args()
    project, out = Path(args.project).resolve(), Path(args.out).resolve()
    times = [round(float(x), 2) for x in args.times.split(",")] if args.times else default_times(project)
    shuffled = times[:]
    random.Random(4217).shuffle(shuffled)

    a, b = {}, {}
    for i in range(0, len(times), args.batch):
        a.update(snap(project, times[i:i + args.batch], out / f"asc-{i // args.batch:02d}"))
    for i in range(0, len(shuffled), args.batch):
        b.update(snap(project, shuffled[i:i + args.batch], out / f"shuf-{i // args.batch:02d}"))

    bad = []
    for t in times:
        if t not in a or t not in b:
            bad.append((t, "missing", 0))
            continue
        x = np.asarray(Image.open(a[t]).convert("RGB"), dtype=np.int16)
        y = np.asarray(Image.open(b[t]).convert("RGB"), dtype=np.int16)
        d = np.abs(x - y).max(axis=2)
        n = int((d > args.tol).sum())
        if n > args.area:
            ys, xs = np.nonzero(d > args.tol)
            bad.append((t, f"{n} px differ (max {int(d.max())}), box x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()}", n))
    print(f"seek-check: {len(times)} times, ascending vs shuffled order")
    for t, msg, _ in bad:
        print(f"  DIFF at {t:.2f}s: {msg}")
    print("seek-check: PASS" if not bad else f"seek-check: FAIL ({len(bad)} of {len(times)} frames)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
