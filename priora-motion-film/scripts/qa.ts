// The checker (plan section 10.2): reads the timeline, camera keys, cast tracks and the text registry,
// and checks every frame of the film. Run with: npm run qa
import * as fontkit from 'fontkit';
import path from 'node:path';
import fs from 'node:fs';
import { cameraAt, cameraMoving, MOVES } from '../src/camera/camera-keys';
import { TEXTS } from '../src/film/texts';
import { textOpacity, textPos, type TextItem } from '../src/text/items';
import { beadAt, caseAt, casePos, prioraAt, prioraPos } from '../src/film/cast';
import { FILM_FRAMES, S6, S7 } from '../src/lib/timeline';
import { findingMarksAt } from '../src/film/findings';
import { MIN_PX, READABLE_EXPONENT, MONO_TRACKING_EM, WIDTH, HEIGHT } from '../src/lib/tokens';
import { ROOM_LABEL, ROOM_STATUS_PX } from '../src/lib/layout';
import { monoWidth, simulatedAt, transferInFrame, transferReach } from '../src/lib/simulated';
import { roomsAt } from '../src/film/system';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sans = fontkit.openSync(path.join(ROOT, 'public/fonts/ibm-plex-sans-latin.woff2')) as fontkit.Font;
const mono = fontkit.openSync(path.join(ROOT, 'public/fonts/ibm-plex-mono-500-latin.woff2')) as fontkit.Font;

const width = (text: string, size: number, font: TextItem['font']) => {
  const f = font === 'mono' ? mono : sans;
  const adv = f.layout(text).positions.reduce((a, p) => a + p.xAdvance, 0) / f.unitsPerEm;
  if (font === 'mono') return size * adv + MONO_TRACKING_EM * size * Math.max(0, [...text].length - 1);
  return size * adv * (font === 'sans600' ? 1.05 : 1.03); // the variable font's default instance is 400
};

const problems: string[] = [];
const report = (s: string) => problems.push(s);
const ranges = (frames: number[]) => {
  const out: string[] = [];
  let a = -1;
  let b = -1;
  for (const f of frames) {
    if (f === b + 1) b = f;
    else {
      if (a >= 0) out.push(a === b ? `F${a}` : `F${a}–F${b}`);
      a = b = f;
    }
  }
  if (a >= 0) out.push(a === b ? `F${a}` : `F${a}–F${b}`);
  return out.join(', ');
};

// ---------------------------------------------------------------- camera
for (const m of MOVES) if (m.to - m.from < 40) report(`camera: move to ${m.shot} lasts ${m.to - m.from} frames (minimum 40)`);
for (let i = 1; i < MOVES.length; i++) if (MOVES[i].from < MOVES[i - 1].to) report(`camera: moves to ${MOVES[i - 1].shot} and ${MOVES[i].shot} overlap`);

// ---------------------------------------------------------------- text
const floor = (t: TextItem) => (t.kind === 'sentence' ? MIN_PX.sentence : MIN_PX.label);
const words = (t: TextItem) => t.text.split(/\s+/).filter((w) => /[A-Za-z0-9?]/.test(w)).length;
for (const t of TEXTS) {
  if (t.drawnBy === 'component') continue;
  const small: number[] = [];
  const edge: number[] = [];
  const moving: number[] = [];
  let readable = 0;
  for (let f = Math.max(0, t.in); f < FILM_FRAMES; f++) {
    const o = textOpacity(t, f);
    if (o <= 0.05) {
      if (t.out !== null && f > t.out) break;
      continue;
    }
    const cam = cameraAt(f);
    const size = t.readablePx !== undefined ? (t.readablePx * Math.pow(cam.zoom, READABLE_EXPONENT)) / cam.zoom : (t.size ?? 24);
    const px = size * cam.zoom;
    const lines = t.lines ?? [t.text];
    const w = Math.max(...lines.map((l) => width(l, size, t.font)));
    const [x, y] = textPos(t, f);
    const anchor = t.anchor ?? 'middle';
    const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
    const top = y - 0.72 * size;
    const bottom = y + 0.22 * size + (lines.length - 1) * size * (t.lineHeight ?? 1.25);
    const sx0 = WIDTH / 2 + (x0 - cam.x) * cam.zoom;
    const sx1 = WIDTH / 2 + (x0 + w - cam.x) * cam.zoom;
    const sy0 = HEIGHT / 2 + (top - cam.y) * cam.zoom;
    const sy1 = HEIGHT / 2 + (bottom - cam.y) * cam.zoom;
    const inFrame = sx0 >= 40 && sx1 <= WIDTH - 40 && sy0 >= 40 && sy1 <= HEIGHT - 40;
    const tooSmall = px < floor(t) - 0.25;
    if (tooSmall) small.push(f);
    if (!inFrame && o > 0.3) edge.push(f);
    if (f < t.in + (t.inDur ?? 10) && cameraMoving(f)) moving.push(f);
    if (o >= 0.95 && inFrame && !tooSmall) readable++;
  }
  const needed = t.kind === 'wordmark' ? 20 : Math.max(20, 10 * words(t));
  if (small.length) report(`text "${t.text}": under ${floor(t)} px at ${ranges(small)}`);
  if (edge.length) report(`text "${t.text}": outside the 40 px margin at ${ranges(edge)}`);
  if (moving.length) report(`text "${t.text}": appears while the camera moves at ${ranges(moving)}`);
  if (readable < needed) report(`text "${t.text}": readable ${readable} frames, needs ${needed}`);
}

// ---------------------------------------------------------------- verbatim
const story = fs.readFileSync(path.join(ROOT, 'Priora storyboard.md'), 'utf8');
for (const t of TEXTS) for (const l of t.lines ?? [t.text]) if (!story.includes(l)) report(`text "${l}" is not in the storyboard`);
for (const t of TEXTS) {
  const digits = (t.text.match(/\d+/g) ?? []).filter((d) => !['30', '60'].includes(d));
  if (digits.length) report(`text "${t.text}" has a number that is not in the storyboard`);
}

// ---------------------------------------------------------------- continuity: nothing jumps, nothing is too fast to follow
// A jump is a single frame that moves much further than the frames round it. Too fast is measured as the
// viewer sees it: against the paper and against the frame, whichever is smaller, so a thing the camera
// follows is judged by how it moves on screen, and a thing the camera pans past by the pan.
const FAST = { thing: 90, camera: 110, zoom: 0.06, bead: 30 }; // zoom: 6 percent a frame at the peak of a 40 frame eased move
const jumps: Record<string, number[]> = { priora: [], case: [] };
const fast: Record<string, number[]> = { priora: [], bead: [], case: [], camera: [], 'finding marks': [] };
const step = (pos: (f: number) => [number, number], live: (f: number) => unknown, f: number) => {
  if (!live(f) || !live(f - 1)) return { paper: 0, screen: 0 };
  const a = cameraAt(f - 1);
  const b = cameraAt(f);
  const p0 = pos(f - 1);
  const p1 = pos(f);
  const paper = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * b.zoom;
  const s0 = [(p0[0] - a.x) * a.zoom, (p0[1] - a.y) * a.zoom];
  const s1 = [(p1[0] - b.x) * b.zoom, (p1[1] - b.y) * b.zoom];
  return { paper, screen: Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) };
};
const things = { priora: { pos: prioraPos, live: prioraAt }, case: { pos: casePos, live: caseAt } } as const;
for (const [k, t] of Object.entries(things)) {
  const d = Array.from({ length: FILM_FRAMES }, (_, f) => (f === 0 ? { paper: 0, screen: 0 } : step(t.pos, t.live, f)));
  for (let f = 1; f < FILM_FRAMES; f++) {
    const near = Math.max(d[f - 1]?.paper ?? 0, d[f - 2]?.paper ?? 0, d[f + 1]?.paper ?? 0, d[f + 2]?.paper ?? 0);
    if (d[f].paper > 12 && d[f].paper > 2.5 * near) jumps[k].push(f);
    if (Math.min(d[f].paper, d[f].screen) > FAST.thing) fast[k].push(f);
  }
}
for (let f = 1; f < FILM_FRAMES; f++) {
  const a = cameraAt(f - 1);
  const b = cameraAt(f);
  if (Math.hypot(b.x - a.x, b.y - a.y) * b.zoom > FAST.camera || Math.abs(Math.log(b.zoom / a.zoom)) > FAST.zoom) fast.camera.push(f);
  if (prioraAt(f) && prioraAt(f - 1)) {
    const d = Math.abs(((((beadAt(f) - beadAt(f - 1)) % 360) + 540) % 360) - 180);
    if (d > FAST.bead) fast.bead.push(f);
  }
}
for (let f = 1; f < FILM_FRAMES; f++) {
  const prev = new Map(findingMarksAt(f - 1).map((m) => [m.k, m.at]));
  for (const m of findingMarksAt(f)) {
    const p0 = prev.get(m.k);
    if (!p0) continue;
    const a = cameraAt(f - 1);
    const b = cameraAt(f);
    const paper = Math.hypot(m.at[0] - p0[0], m.at[1] - p0[1]) * b.zoom;
    const screen = Math.hypot((m.at[0] - b.x) * b.zoom - (p0[0] - a.x) * a.zoom, (m.at[1] - b.y) * b.zoom - (p0[1] - a.y) * a.zoom);
    if (Math.min(paper, screen) > FAST.thing) { fast['finding marks'].push(f); break; }
  }
}
for (const [k, fs_] of Object.entries(jumps)) if (fs_.length) report(`motion: ${k} jumps at ${ranges(fs_)}`);
for (const [k, fs_] of Object.entries(fast)) if (fs_.length) report(`motion: ${k} too fast at ${ranges(fs_)}`);

// ---------------------------------------------------------------- the gap stays readable until the decision
const gapBad: number[] = [];
for (let f = 1468; f < S7.solid[0]; f++) {
  const c = caseAt(f);
  if (!c) continue;
  if ((c.coralEnds ?? 0) < 0.99) gapBad.push(f);
  if (c.piece && !c.piece.dashed) gapBad.push(f);
  if (c.bridge && f >= S7.bridge[0] && !c.bridge.dashed) gapBad.push(f);
}
if (gapBad.length) report(`gap: not readable at ${ranges(gapBad)}`);

// ---------------------------------------------------------------- SIMULATED is in frame whenever Transfer is
const simBad: number[] = [];
for (let f = 0; f < FILM_FRAMES; f++) {
  const r = roomsAt(f);
  const tr = r?.rooms?.transfer;
  if (!r || !tr || (tr.print ?? 0) <= 0.05) continue;
  const cam = cameraAt(f);
  if (transferReach(cam) <= 0) continue;
  const sw = (ROOM_STATUS_PX * Math.pow(cam.zoom, READABLE_EXPONENT)) / cam.zoom;
  const home: [number, number] = [ROOM_LABEL.transfer.name[0], ROOM_LABEL.transfer.name[1] - sw * 1.4];
  const w = width('SIMULATED', sw, 'mono');
  const [x, y] = r.holdSimulated ? simulatedAt(cam, home, monoWidth('SIMULATED', sw), sw) : home;
  const sx0 = WIDTH / 2 + (x - w / 2 - cam.x) * cam.zoom;
  const sx1 = WIDTH / 2 + (x + w / 2 - cam.x) * cam.zoom;
  const sy0 = HEIGHT / 2 + (y - 0.72 * sw - cam.y) * cam.zoom;
  const sy1 = HEIGHT / 2 + (y + 0.22 * sw - cam.y) * cam.zoom;
  const inside = sx0 >= 40 && sx1 <= WIDTH - 40 && sy0 >= 40 && sy1 <= HEIGHT - 40;
  const shown = (tr.status ?? 0) * (r.holdSimulated ? transferInFrame(cam) : 1);
  if (!inside || (f > 1760 && shown < 0.95)) simBad.push(f);
}
if (simBad.length) report(`SIMULATED: Transfer on screen without its label at ${ranges(simBad)}`);

// ---------------------------------------------------------------- the human line reaches each threshold before Priora crosses
if (!(S6.retainOpens[1] < S6.intoRetain[0])) report('human line: Retain opens after Priora starts to cross');
if (!(S6.mitigateOpens[1] + 6 <= S6.intoMitigate[0])) report('human line: Mitigate opens less than 6 frames before Priora crosses');
if (!(S6.transferOpens[1] <= S6.intoTransfer[0])) report('human line: Transfer opens after Priora starts to cross');

if (problems.length) {
  console.log(`${problems.length} problem(s):`);
  for (const p of problems) console.log(`- ${p}`);
  process.exitCode = 1;
} else console.log('every check passes');
