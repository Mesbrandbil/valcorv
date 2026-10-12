#!/usr/bin/env python3
"""Places the review subtitles where they cut nothing in the picture, and writes src/lib/subtitle-places.ts.

The review copy puts each narration line on a solid panel. A panel may cover a drawing completely, but it must
never slice one: a label, icon or figure half under the panel edge looks broken, and the camera keeps moving,
so the only safe test is every frame of the line. For each line this reads every frame of its window from
the rendered master (renders/Priora film master.mp4, which has no subtitles), and for each candidate panel
(at the bottom or the top, on one line or two balanced lines) counts the ink that crosses the panel's edge:
the small shapes it slices: a label, an icon or a figure (a connected drawn shape that fits in about 400 by
240 px and lies wholly near the panel) with drawing both inside and outside the panel. A long stroke or a big
ring that runs on past the surroundings (a ground line, a thread, a room's ring) passing behind the panel reads
as passing behind, and is not counted.
The titles live at the top of the frame (the rooms' names, SIMULATED, which must always show), so a panel at
the top is only allowed where it hides nothing at all in any frame. Of the allowed candidates it keeps the one
with the fewest frames in which anything is sliced (then the fewest pixels), preferring, on a tie, the bottom,
28 px from the frame edge rather than 14, and one row rather than two.

The panel geometry here and in src/film/Subtitles.tsx must agree: 10.8 px a character plus 56, at most 1720
wide; 64 px tall plus 32 for a second line; 28 or 14 px from the frame edge.

Usage (from priora-motion-film, after npm run render:film, with a Python that has numpy):
  python -I scripts/place-subtitles.py [--film FILE] [--narration JSON]
--narration is the NARRATION table as JSON ([{id, from, to, text, who?}]); by default it is read through
scripts/run-ts.mjs from src/lib/timeline.ts.
"""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
W, H = 1920, 1080
INK = 221  # grey level below which a pixel is drawn (the paper sits at about 229 to 243)
BAND = 3  # pixels inside the panel's edge that still count as outside it (the panel's rounded edge)
AROUND = 200  # how far round the panel shapes are followed
SMALL = (400, 240)  # a shape at most this wide and tall is a label, an icon or a figure


def narration_from_timeline():
    with tempfile.TemporaryDirectory() as d:
        entry = Path(d) / 'dump.ts'
        entry.write_text(f"import {{ NARRATION }} from '{ROOT}/src/lib/timeline';\nconsole.log(JSON.stringify(NARRATION));\n")
        out = subprocess.run(['node', str(ROOT / 'scripts/run-ts.mjs'), str(entry)], capture_output=True, text=True, check=True, cwd=ROOT).stdout
    return json.loads(out)


def split(text):
    words = text.split(' ')
    diff = lambda k: abs(len(' '.join(words[:k])) - len(' '.join(words[k:])))
    best = min(range(1, len(words)), key=diff)
    return [' '.join(words[:best]), ' '.join(words[best:])]


def panel(rows, at, edge):
    w = min(1720, max(len(r) for r in rows) * 10.8 + 56)
    h = 64 + (len(rows) - 1) * 32
    x0 = int(round(W / 2 - w / 2))
    x1 = int(round(W / 2 + w / 2))
    y0, y1 = (H - edge - h, H - edge) if at == 'bottom' else (edge, edge + h)
    return x0, int(y0), x1, int(y1)


def cuts(ink, box):
    """Pixels of the small shapes the panel slices: shapes near the panel with drawing both inside and outside."""
    x0, y0, x1, y1 = box
    rx0, ry0, rx1, ry1 = max(0, x0 - AROUND), max(0, y0 - AROUND), min(W, x1 + AROUND), min(H, y1 + AROUND)
    region = ink[ry0:ry1, rx0:rx1]
    if not region.any():
        return 0
    labels, n = ndimage.label(region, structure=np.ones((3, 3), bool))
    if n == 0:
        return 0
    inside = np.zeros_like(region)
    inside[y0 - ry0 + BAND:y1 - ry0 - BAND, x0 - rx0 + BAND:x1 - rx0 - BAND] = True
    hit_in = np.unique(labels[inside & region])
    hit_out = np.unique(labels[~inside & region])
    both = np.intersect1d(hit_in[hit_in > 0], hit_out[hit_out > 0])
    if both.size == 0:
        return 0
    total = 0
    for k, sl in zip(range(1, n + 1), ndimage.find_objects(labels)):
        if k not in both or sl is None:
            continue
        ys, xs = sl
        touches_edge = ys.start == 0 or xs.start == 0 or ys.stop == region.shape[0] or xs.stop == region.shape[1]
        small = (xs.stop - xs.start) <= SMALL[0] and (ys.stop - ys.start) <= SMALL[1]
        # a frame-edge shape counts as small only if it is small where the frame cuts it (the region is clipped there)
        clipped_by_frame = (ys.start == 0 and ry0 == 0) or (xs.start == 0 and rx0 == 0) or (ys.stop == region.shape[0] and ry1 == H) or (xs.stop == region.shape[1] and rx1 == W)
        if small and (not touches_edge or clipped_by_frame):
            total += int((labels[sl] == k).sum())
    return total


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--film', default=str(ROOT / 'renders/Priora film master.mp4'))
    ap.add_argument('--narration')
    ap.add_argument('--out', default=str(ROOT / 'src/lib/subtitle-places.ts'))
    args = ap.parse_args()
    lines = json.load(open(args.narration)) if args.narration else narration_from_timeline()

    # the candidates for every line, scored over every frame of its window
    cands = {}
    for ln in lines:
        text = ('Worker: ' if ln.get('who') else '') + ln['text']
        options = [(at, rows, edge) for at in ('bottom', 'top') for edge in (28, 14) for rows in ([text], split(text))]
        cands[ln['id']] = [{'at': at, 'rows': rows, 'edge': edge, 'box': panel(rows, at, edge), 'cut': 0, 'worst': 0, 'frames': 0, 'hidden': 0} for at, rows, edge in options]
    by_frame = {}
    for ln in lines:
        for f in range(ln['from'], ln['to'] + 1):
            by_frame.setdefault(f, []).append(ln['id'])

    proc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-i', args.film, '-pix_fmt', 'gray', '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
    size = W * H
    f = 0
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        if f in by_frame:
            ink = np.frombuffer(buf, dtype=np.uint8).reshape(H, W) < INK
            for lid in by_frame[f]:
                for c in cands[lid]:
                    n = cuts(ink, c['box'])
                    c['cut'] += n
                    c['worst'] = max(c['worst'], n)
                    c['frames'] += n > 0
                    x0, y0, x1, y1 = c['box']
                    c['hidden'] = max(c['hidden'], int(ink[y0 + BAND:y1 - BAND, x0 + BAND:x1 - BAND].sum()))
        f += 1
    proc.wait()

    places = {}
    for ln in lines:
        cs = cands[ln['id']]
        allowed = [c for c in cs if c['at'] == 'bottom' or c['hidden'] == 0]
        pick = min(allowed, key=lambda c: (c['frames'], c['cut'], cs.index(c)))
        places[ln['id']] = pick
        report = '  '.join(f"{c['at'][0]}{c['edge']}x{len(c['rows'])}:{c['frames']}f/{c['cut']}{'' if c['at'] == 'bottom' or c['hidden'] == 0 else 'H'}" for c in cs)
        print(f"{ln['id']:5} -> {pick['at']} {pick['edge']} px, {len(pick['rows'])} row(s): {pick['frames']} of {ln['to'] - ln['from'] + 1} frames sliced, {pick['cut']} px   [{report}]")

    body = '\n'.join(f"  {lid}: {{ at: '{p['at']}', edge: {p['edge']}, rows: {json.dumps(p['rows'], ensure_ascii=False)} }}," for lid, p in places.items())
    Path(args.out).write_text(
        "// Written by scripts/place-subtitles.py from the rendered master: where each review subtitle sits (bottom or\n"
        "// top), how far from the frame edge, and how it breaks into rows, chosen so its panel cuts no drawing in any\n"
        "// frame of its line. Do not edit by hand; lines not listed sit at the bottom on one row.\n"
        "export const SUBTITLE_PLACES: Partial<Record<string, { at: 'bottom' | 'top'; edge: number; rows: string[] }>> = {\n"
        f"{body}\n}};\n",
        encoding='utf-8',
    )
    print(f'wrote {args.out}')


if __name__ == '__main__':
    main()
