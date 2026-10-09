// Sequence 2: the worker's voice becomes a case. The waveform grows from the phone, the words arrive in
// spoken groups, Priora listens along a dotted thread, the important phrases separate and rise into the
// case's facets, the conditions line rises from the factory, and the photo comes up from the worker.
import React, { useLayoutEffect, useRef, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { COLOR, FONT, STROKE_PX } from '../../lib/tokens';
import { arrive, ease, lerp, prog } from '../../lib/motion';
import { polar, type Pt } from '../../lib/geometry';
import { CASE, CASE_A, FACET_ANGLE, SITE, VOICE, WORKER, type FacetKey } from '../../lib/layout';
import { chipAnchor, chipLabelAt } from '../../cast/Case';
import { S2 } from '../../lib/timeline';
import { usePx } from '../../camera/Camera';
import { DottedThread, DrawnLine } from '../../cast/lines';
import { PhotoCard } from '../../cast/Case';
import { beadAt, caseAt, prioraPos, waveProgress, waveTip } from '../cast';

// ---------------------------------------------------------------- the words
const WORDS = VOICE.lines.map((l) => l.split(' '));
const FLAT = WORDS.flat();
const PER_WORD = (S2.voice[1] - S2.voice[0]) / FLAT.length; // 2.7 words per second
const wordAt = (i: number) => S2.voice[0] + i * PER_WORD;
// spoken groups (first word index of each); a group appears just after its first word is spoken
const GROUPS = [0, 3, 7, 10, 13, 15];
const groupOf = (i: number) => GROUPS.filter((g) => g <= i).length - 1;
const groupIn = (g: number) => wordAt(GROUPS[g]) + 4;

// the important phrases: word index ranges, the chip each rises into, and its underline colour
type Phrase = { from: number; to: number; chip: FacetKey; color: string };
const PHRASES: Phrase[] = [
  { from: 2, to: 2, chip: 'repair', color: COLOR.cobalt }, // bracket
  { from: 5, to: 6, chip: 'packingLine', color: COLOR.cobalt }, // packing line
  { from: 8, to: 8, chip: 'repair', color: COLOR.coral }, // cracked
  { from: 13, to: 13, chip: 'hotWork', color: COLOR.cobalt }, // weld
  { from: 15, to: 18, chip: 'nightShift', color: COLOR.cobalt }, // before the night shift
];
const phraseOf = (i: number) => PHRASES.findIndex((p) => i >= p.from && i <= p.to);

/** Word positions in world units, measured once in the browser from the real glyphs. */
type Layout = Array<{ x: number; w: number }>;

const Measure: React.FC<{ refs: React.MutableRefObject<Array<SVGTextElement | null>> }> = ({ refs }) => (
  <g opacity={0}>
    {VOICE.lines.map((l, i) => (
      <text key={l} ref={(el) => { refs.current[i] = el; }} x={0} y={0} fontFamily={FONT.sans} fontWeight={500} fontSize={VOICE.size}>
        {l}
      </text>
    ))}
  </g>
);

const lineOf = (i: number) => (i < WORDS[0].length ? 0 : i < WORDS[0].length + WORDS[1].length ? 1 : 2);
/** Where the chip's mono label will sit, and how it is anchored: the phrase travels there and becomes it. */
const labelSpot = (k: FacetKey): { at: Pt; anchor: 'start' | 'middle' | 'end' } => {
  const [x, y] = chipLabelAt(CASE.facetOpenR, CASE.chipR, FACET_ANGLE[k], 18);
  return { at: [CASE_A[0] + x, CASE_A[1] + y], anchor: chipAnchor(FACET_ANGLE[k]) };
};
// the phrase ends about the size of the chip label it becomes
const PHRASE_END_SCALE = 0.75;
// Each phrase travels for 20 frames, leaving in turn so that every phrase whose path it will cross has
// already gone: packing line, bracket, cracked, before the night shift, weld. Offsets from phrasesTravel[0],
// in PHRASES order (bracket, packing line, cracked, weld, before the night shift).
const PHRASE_LEAVES = [2, 0, 8, 16, 12];
const PHRASE_FRAMES = 20;

const PALE = '#BDB8AE';
const mixColor = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], t))).join(',')})`;
};

const VoiceWords: React.FC<{ f: number }> = ({ f }) => {
  const refs = useRef<Array<SVGTextElement | null>>([]);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [handle] = useState(() => delayRender('measure the voice note'));
  const px = usePx();
  useLayoutEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      const out: Layout = [];
      VOICE.lines.forEach((l, li) => {
        const el = refs.current[li];
        let idx = 0;
        for (const w of l.split(' ')) {
          out.push({ x: el && idx > 0 ? el.getSubStringLength(0, idx) : 0, w: el ? el.getSubStringLength(idx, w.length) : 0 });
          idx += w.length + 1;
        }
      });
      setLayout(out);
      continueRender(handle);
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);
  if (!layout) return <Measure refs={refs} />;

  const grey = prog(f, S2.wordsGrey[0], S2.wordsGrey[1]);
  const greyOut = 1 - prog(f, S2.greyOut[0], S2.greyOut[1]);
  const separate = prog(f, S2.phrasesSeparate[0], S2.phrasesSeparate[1]);
  return (
    <g>
      {FLAT.map((w, i) => {
        const g = groupOf(i);
        const a = prog(f, groupIn(g), groupIn(g) + 8, arrive);
        if (a <= 0) return null;
        const li = lineOf(i);
        const base: Pt = [VOICE.textX + layout[i].x, VOICE.baselines[li]];
        const pi = phraseOf(i);
        const rise = (1 - a) * 6;
        if (pi < 0) {
          // ordinary words: fade to pale grey as the message ends, then go
          const o = a * greyOut;
          if (o <= 0) return null;
          return (
            <text key={i} x={base[0]} y={base[1] + px(rise)} fontFamily={FONT.sans} fontWeight={500} fontSize={VOICE.size} fill={mixColor(COLOR.ink, PALE, grey)} opacity={o}>
              {w}
            </text>
          );
        }
        // important phrases stay dark, separate gently, then rise into their chips and dissolve as the chips print
        const ph = PHRASES[pi];
        const first = layout[ph.from];
        const offset = layout[i].x - first.x;
        const phraseStart: Pt = [VOICE.textX + first.x, VOICE.baselines[li] - 10 * separate];
        const spot = labelSpot(ph.chip);
        const widthAll = layout[ph.to].x + layout[ph.to].w - first.x;
        const scale = lerp(1, PHRASE_END_SCALE, prog(f, S2.phrasesTravel[0] + PHRASE_LEAVES[pi], S2.phrasesTravel[0] + PHRASE_LEAVES[pi] + PHRASE_FRAMES));
        const w1 = widthAll * PHRASE_END_SCALE;
        // "cracked" travels with "bracket" and comes to rest just beside it, where it dissolves into REPAIR
        const besideBracket = pi === 2 ? ((layout[PHRASES[0].to].x + layout[PHRASES[0].to].w - layout[PHRASES[0].from].x) * PHRASE_END_SCALE) / 2 + 22 + w1 / 2 : 0;
        const dest: Pt = [(spot.anchor === 'start' ? spot.at[0] : spot.anchor === 'end' ? spot.at[0] - w1 : spot.at[0] - w1 / 2) + besideBracket, spot.at[1]];
        const leave = S2.phrasesTravel[0] + PHRASE_LEAVES[pi];
        const tp = ease(prog(f, leave, leave + PHRASE_FRAMES, (t) => t));
        const p0: Pt = [lerp(phraseStart[0], dest[0], tp), lerp(phraseStart[1], dest[1], tp)];
        // the phrase hands over to the chip's own label as that label arrives
        const chipIdx = ['repair', 'hotWork', 'packingLine', 'nightShift'].indexOf(ph.chip);
        const labelIn = S2.chipsStart + chipIdx * S2.chipStagger + S2.chipDur + S2.chipLabelDelay;
        // "cracked" joins "bracket" in REPAIR: it fades on the way, so the two never sit on top of each other
        const merge = pi === 2 ? 1 - prog(f, S2.phrasesTravel[1] - 4, S2.phrasesTravel[1] + 8) : 1;
        // gone before the label prints, so the two are never on top of each other
        const o = a * merge * (1 - prog(f, labelIn - 8, labelIn));
        // the sentence's full stop is not part of the phrase: it greys and goes with the ordinary words
        const stop = i === ph.to && w.endsWith('.');
        const dot = stop ? (
          <text key={`${i}-stop`} x={base[0] + layout[i].w - VOICE.size * 0.26} y={base[1] + px(rise)} fontFamily={FONT.sans} fontWeight={500} fontSize={VOICE.size} fill={mixColor(COLOR.ink, PALE, grey)} opacity={a * greyOut}>
            .
          </text>
        ) : null;
        if (o <= 0) return dot;
        return (
          <React.Fragment key={i}>
            <text x={p0[0] + offset * scale} y={p0[1] + px(rise)} fontFamily={FONT.sans} fontWeight={500} fontSize={VOICE.size * scale} fill={COLOR.ink} opacity={o}>
              {stop ? w.slice(0, -1) : w}
            </text>
            {dot}
          </React.Fragment>
        );
      })}
      {/* short printed underlines under the selected phrases, coral beneath "cracked" */}
      {PHRASES.map((ph, k) => {
        const start = wordAt(ph.from) + 8;
        const draw = prog(f, start, start + Math.max(12, (ph.to - ph.from + 1) * 7));
        const o = (1 - prog(f, S2.greyOut[0], S2.greyOut[1])) * (1 - separate);
        if (draw <= 0 || o <= 0) return null;
        const first = layout[ph.from];
        const last = layout[ph.to];
        const li = lineOf(ph.from);
        const x0 = VOICE.textX + first.x;
        // the closing full stop is not underlined
        const trailing = FLAT[ph.to].endsWith('.') ? VOICE.size * 0.26 : 0;
        const x1 = VOICE.textX + last.x + last.w - trailing;
        const y = VOICE.baselines[li] + VOICE.size * 0.42; // clear of the descenders
        return <line key={k} x1={x0} y1={y} x2={x0 + (x1 - x0) * draw} y2={y} stroke={ph.color} strokeWidth={px(3)} strokeLinecap="round" opacity={o} />;
      })}
    </g>
  );
};

const BARS = 112;
const Waveform: React.FC<{ f: number }> = ({ f }) => {
  const px = usePx();
  const p = waveProgress(f);
  const o = prog(f, S2.voice[0] - 6, S2.voice[0]) * (1 - prog(f, S2.greyOut[0], S2.greyOut[1]));
  if (o <= 0) return null;
  const shown = p * BARS;
  return (
    <g opacity={o}>
      {/* a fine stem from the phone up to the start of the waveform */}
      <DrawnLine
        d={`M ${WORKER.phoneRaised[0] + 8} ${WORKER.phoneRaised[1] - 12} C ${WORKER.phoneRaised[0] + 10} ${VOICE.waveY + 30}, ${VOICE.waveX0 - 14} ${VOICE.waveY}, ${VOICE.waveX0} ${VOICE.waveY}`}
        progress={prog(f, S2.voice[0] - 6, S2.voice[0] + 4)}
        color={COLOR.ink}
        px={2}
      />
      {Array.from({ length: BARS }, (_, i) => {
        const g = Math.max(0, Math.min(1, shown - i)); // each new bar grows in
        if (g <= 0) return null;
        const x = VOICE.waveX0 + (i * (VOICE.waveX1 - VOICE.waveX0)) / BARS;
        const env = Math.sin((i / BARS) * Math.PI) ** 0.5 * (0.45 + 0.55 * Math.abs(Math.sin(i * 0.71) * Math.cos(i * 0.23)));
        const h = (3 + VOICE.waveAmp * env) * g;
        return <line key={i} x1={x} y1={VOICE.waveY - h} x2={x} y2={VOICE.waveY + h} stroke={COLOR.ink} strokeWidth={px(2.2)} strokeLinecap="round" />;
      })}
    </g>
  );
};

/** Priora listening: a dotted thread from the bead to the waveform's growing tip; dots travel back in small groups. */
const ListenThread: React.FC<{ f: number }> = ({ f }) => {
  const reach = prog(f, S2.listenThread[0], S2.listenThread[1]);
  const o = 1 - prog(f, S2.voice[1] + 1, S2.voice[1] + 11);
  if (reach <= 0 || o <= 0) return null;
  const pr = prioraPos(f);
  const bead = polar(pr, 50, beadAt(f));
  const tip = waveTip(f);
  // its long run sits halfway between the last line of the message and the top of the waveform
  const d = `M ${bead[0].toFixed(1)} ${bead[1].toFixed(1)} Q ${(bead[0] + 6).toFixed(1)} ${(tip[1] - 42).toFixed(1)} ${tip[0].toFixed(1)} ${(tip[1] - 30).toFixed(1)}`;
  return <DottedThread d={d} progress={reach} opacity={o} phase={-(f - S2.listenThread[0]) * 1.6} groups />;
};

const ConditionsLine: React.FC<{ f: number }> = ({ f }) => {
  const p = prog(f, S2.conditionsLine[0], S2.conditionsLine[1]);
  // the line has contributed its facet; it goes before CASE is set beneath the case
  const o = 1 - prog(f, S2.conditionsChip[1] + 16, S2.conditionsChip[1] + 30);
  if (p <= 0 || o <= 0) return null;
  const end = CASE_A[1] + CASE.facetOpenR + CASE.chipR;
  return <DrawnLine d={`M ${SITE.roofEmit[0]} ${SITE.roofEmit[1]} L ${SITE.roofEmit[0]} ${end}`} progress={p} color={COLOR.cobalt} px={STROKE_PX.thread} opacity={o} />;
};

/** The request: a dotted thread descends from the bead to the worker's phone. */
const RequestThread: React.FC<{ f: number }> = ({ f }) => {
  const p = prog(f, S2.requestThread[0], S2.requestThread[1]);
  const o = 1 - prog(f, S2.photoTravel[0], S2.photoTravel[0] + 10);
  if (p <= 0 || o <= 0) return null;
  const pr = prioraPos(f);
  const bead = polar(pr, 50, beadAt(f));
  const phone = WORKER.phoneRaised;
  const d = `M ${bead[0].toFixed(1)} ${bead[1].toFixed(1)} C ${bead[0] - 20} ${bead[1] + 120}, ${phone[0] + 40} ${phone[1] - 140}, ${phone[0] + 10} ${phone[1] - 24}`;
  return <DottedThread d={d} progress={p} opacity={o} phase={(f - S2.requestThread[0]) * 1.6} />;
};

/** The photo travels up from the phone and shrinks into its facet. */
const Photo: React.FC<{ f: number }> = ({ f }) => {
  const t = prog(f, S2.photoTravel[0], S2.photoTravel[1]);
  if (t <= 0) return null;
  const settle = prog(f, S2.photoSettle[0], S2.photoSettle[1]);
  const o = prog(f, S2.photoTravel[0], S2.photoTravel[0] + 4) * (1 - settle);
  if (o <= 0) return null;
  const from: Pt = [WORKER.phoneRaised[0] + 20, WORKER.phoneRaised[1] - 40];
  // into the facet wherever the fold has taken it, coming up from below so it never crosses the PHOTO label
  const to = polar(CASE_A, caseAt(f)?.facetR ?? CASE.facetOpenR, FACET_ANGLE.photo);
  const mid: Pt = [to[0] + 30, to[1] + 190];
  const u = ease(t);
  const at: Pt = [lerp(lerp(from[0], mid[0], u), lerp(mid[0], to[0], u), u), lerp(lerp(from[1], mid[1], u), lerp(mid[1], to[1], u), u)];
  return <PhotoCard at={at} scale={lerp(0.45, 0.8, Math.sin(Math.PI * Math.min(1, u * 1.2)) ** 0.6) * (1 - 0.6 * settle)} opacity={o} />;
};

export const Seq2Overlay: React.FC<{ f: number }> = ({ f }) => {
  if (f < S2.voice[0] - 8 || f > 680) return null;
  return (
    <g>
      <Waveform f={f} />
      <VoiceWords f={f} />
      <ListenThread f={f} />
      <ConditionsLine f={f} />
      <RequestThread f={f} />
      <Photo f={f} />
    </g>
  );
};

