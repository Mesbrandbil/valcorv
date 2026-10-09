// The text registry: every piece of text in the film, verbatim from the storyboard, with when and where it
// appears. Free text is drawn by the text layer; text that belongs to a component (room names, chip labels,
// agent names, the voice note) is listed with drawnBy 'component' so the checker sees it too.
import type { TextItem } from '../text/items';
import { COLOR } from '../lib/tokens';
import type { Pt } from '../lib/geometry';
import { lerp, prog } from '../lib/motion';
import {
  BARRIER_LABEL,
  MITIGATE_INSIDE,
  REAL_LABELS,
  RECORD,
  NO_ONE_DISTURBED,
  RETAIN_INSIDE,
  RISK_OWNER_DECIDES,
  RULERS,
  SHORT_LIST,
  TRANSFER_INSIDE,
  S1 as S1L,
} from '../lib/layout';
import { S1, S2, S3, S4, S5, S6, S7, S8 } from '../lib/timeline';
import { casePos } from './cast';
import { SHOTS } from '../camera/shots';

const below = (dy: number) => (f: number): Pt => {
  const [x, y] = casePos(f);
  return [x, y + dy];
};

const FIRE_WATCH_FROM: Pt = [1620, 1745];
const FIRE_WATCH_TO: Pt = [1510, 1800];

const leaders = RETAIN_INSIDE.leaders.map((l, i) => ({
  id: `leader-${l.text}`,
  text: l.text,
  kind: 'label' as const,
  font: 'mono' as const,
  at: l.at,
  anchor: l.anchor,
  size: 24,
  in: S6.leaderLabels[i],
  out: S6.retainTextOut,
  outDur: 7,
}));

const safeguardNames = MITIGATE_INSIDE.safeguards.map((s, i) => ({
  id: `safeguard-${s.key}`,
  text: s.name.join(' '),
  lines: [...s.name],
  kind: 'name' as const,
  font: 'sans500' as const,
  at: [s.at[0], s.at[1] + 62] as Pt,
  anchor: 'middle' as const,
  size: 22,
  in: S6.safeguardNames[i],
  out: S6.safeguardNamesOut,
}));

const answers = ['ELIGIBILITY', 'TERMS', 'SAFEGUARDS', 'PRICE ?'].map((t, i) => ({
  id: `answer-${i}`,
  text: t,
  kind: 'label' as const,
  font: 'mono' as const,
  at: [TRANSFER_INSIDE.answers[0] + 34, TRANSFER_INSIDE.answers[1] + i * 40] as Pt,
  anchor: 'start' as const,
  size: 24,
  color: COLOR.cobalt,
  in: S6.answerLabels[i],
  out: S6.answersOut,
}));

const STATEMENT = ['Priora turns physical work', 'into explicit risk decisions,', 'while the work happens.'];
const statementX = SHOTS.S8_SHEET.x;

export const TEXTS: TextItem[] = [
  // Sequence 1
  { id: 'sentence-1', text: 'Real work in the middle.', kind: 'sentence', font: 'sans600', at: S1L.sentence1, size: S1L.sentenceSize, in: S1.sentence1In, out: S1.sentence1Out, inDur: 12 },
  { id: 'label-worker', text: 'WORKER', kind: 'label', font: 'mono', at: [REAL_LABELS.worker, REAL_LABELS.y], size: REAL_LABELS.size, in: S1.workerLabel, out: S1.labelsOut },
  { id: 'label-site', text: 'SITE', kind: 'label', font: 'mono', at: [REAL_LABELS.site, REAL_LABELS.y], size: REAL_LABELS.size, in: S1.siteLabel, out: S1.labelsOut },
  { id: 'label-risk-owner', text: 'RISK OWNER', kind: 'label', font: 'mono', at: [REAL_LABELS.riskOwner, REAL_LABELS.y], size: REAL_LABELS.size, in: S1.riskOwnerLabel, out: S1.labelsOut },
  { id: 'sentence-2', text: 'Agents around it.', kind: 'sentence', font: 'sans600', at: S1L.sentence2, size: S1L.sentenceSize, color: COLOR.cobalt, in: S1.sentence2In, out: S1.sentence2Out, inDur: 12 },

  // Sequence 2 (the voice note and the chip labels are drawn by their components)
  { id: 'voice', text: 'Hey, the bracket by the packing line has cracked again. We’re going to weld it before the night shift.', kind: 'sentence', font: 'sans500', at: [0, 0], in: S2.voice[0], out: S2.greyOut[0], drawnBy: 'component' },
  ...['REPAIR', 'HOT WORK', 'PACKING LINE', 'BEFORE NIGHT SHIFT', 'SITE + INSURANCE CONDITIONS', 'PHOTO'].map((t) => ({ id: `chip-${t}`, text: t, kind: 'label' as const, font: 'mono' as const, at: [0, 0] as Pt, in: S2.chipsStart, out: S2.chipLabelsOut, drawnBy: 'component' as const })),
  { id: 'request', text: 'Photo of the bracket?', kind: 'sentence', font: 'sans500', at: [2540, 1890], anchor: 'end', size: 32, in: S2.request, out: S2.requestOut, outDur: 8 },
  { id: 'case-label', text: 'CASE', kind: 'label', font: 'mono', at: below(150), size: 32, in: S2.caseLabelIn, inDur: 6, out: S3.caseLabelOut },

  // Sequence 3 (title, ghost and agent names are drawn by the panel)
  { id: 'fire-watch', text: 'FIRE WATCH?', kind: 'label', font: 'mono', anchor: 'start', readablePx: 25, color: COLOR.coral, in: S3.fireWatchIn, out: S3.fireWatchOut + 6, at: (f) => {
    const u = prog(f, S3.fireWatchRide[0], S3.fireWatchRide[1]);
    return [lerp(FIRE_WATCH_FROM[0], FIRE_WATCH_TO[0], u), lerp(FIRE_WATCH_FROM[1], FIRE_WATCH_TO[1], u)];
  } },

  // Sequence 4
  { id: 'inside', text: 'INSIDE THE CONDITIONS', kind: 'label', font: 'mono', at: [1300, 1660], size: 24, in: S4.insideIn, out: S4.insideOut, outDur: 6 },
  { id: 'record-kept', text: 'RECORD KEPT', kind: 'label', font: 'mono', at: RECORD.keptLabel, size: 25, in: S4.recordKept, out: 1392 },
  { id: 'no-one-disturbed', text: 'NO ONE DISTURBED', kind: 'label', font: 'mono', at: NO_ONE_DISTURBED, anchor: 'start', size: 25, in: S4.noOneDisturbed, out: 1392 },

  // Sequence 5
  { id: 'ruler-1', text: 'FIRE WATCH PLANNED: 30 MIN', kind: 'label', font: 'mono', at: [RULERS.x0, RULERS.label1Y], anchor: 'start', size: RULERS.size, color: COLOR.coral, in: S5.ruler1Label, out: S5.rulersOut },
  { id: 'ruler-2', text: 'POLICY ASKS: 60 MIN', kind: 'label', font: 'mono', at: [RULERS.x0, RULERS.label2Y], anchor: 'start', size: RULERS.size, color: COLOR.coral, in: S5.ruler2Label, out: S5.rulersOut },
  { id: 'no-hard-stop', text: 'NO HARD STOP CONFIGURED', kind: 'label', font: 'mono', at: BARRIER_LABEL, anchor: 'start', size: 28, color: COLOR.greyText, in: S5.barrierLabel, out: S5.barrierOut },
  { id: 'decision-packet', text: 'DECISION PACKET', kind: 'label', font: 'mono', at: below(108), size: 27, in: S5.packetLabelIn, out: S5.packetLabelOut, outDur: 8 },
  { id: 'decides-5', text: 'RISK OWNER DECIDES', kind: 'label', font: 'mono', at: RISK_OWNER_DECIDES, anchor: 'start', readablePx: 27, in: S5.decidesIn, out: S5.decidesOut },

  // Sequence 6 (room names, statuses, NO INSURER ON PRIORA YET and the role labels are drawn by the rooms)
  { id: 'agent-cannot', text: 'AN AGENT CANNOT CHOOSE IT', kind: 'label', font: 'mono', at: RETAIN_INSIDE.agentCannot, size: 24, in: S6.agentCannot, out: S6.agentCannotOut, outDur: 8 },
  { id: 'risk-owner-6', text: 'RISK OWNER', kind: 'label', font: 'mono', at: RETAIN_INSIDE.riskOwnerLabel, anchor: 'end', size: 24, in: S6.riskOwnerLabel, out: S6.retainTextOut, outDur: 7 },
  ...leaders,
  ...safeguardNames,
  { id: 'partial', text: 'PARTIAL', kind: 'label', font: 'mono', at: MITIGATE_INSIDE.resultLabel, anchor: 'start', size: MITIGATE_INSIDE.resultSize, in: S6.partial, out: S6.thermalBack[0] },
  { id: 'full', text: 'FULL', kind: 'label', font: 'mono', at: MITIGATE_INSIDE.resultLabel, anchor: 'start', size: MITIGATE_INSIDE.resultSize, in: S6.full, out: S6.resultsOut },
  { id: 'back-inside', text: 'BACK INSIDE', kind: 'label', font: 'mono', at: [MITIGATE_INSIDE.resultLabel[0], MITIGATE_INSIDE.resultLabel[1] + 34], anchor: 'start', size: MITIGATE_INSIDE.resultSize, in: S6.backInside, out: S6.resultsOut },
  ...answers,

  // Sequence 7: the short list joins the packet at the desk, then the decision
  // the short list builds at the desk, one line as each room's proposal meets the packet at its doorway
  { id: 'mitigate-part', text: 'MITIGATE PART', kind: 'label', font: 'mono', at: SHORT_LIST, size: 38, in: S7.mitigatePart, out: S8.textOut },
  { id: 'keep-the-rest', text: 'KEEP THE REST', kind: 'label', font: 'mono', at: [SHORT_LIST[0], SHORT_LIST[1] + 46], size: 38, in: S7.keepTheRest, out: S8.textOut },
  { id: 'decides-7', text: 'RISK OWNER DECIDES', kind: 'label', font: 'mono', at: RISK_OWNER_DECIDES, anchor: 'start', readablePx: 27, in: S7.decides, out: S8.textOut },

  // Sequence 8
  { id: 'design-proposal', text: 'A DESIGN PROPOSAL', kind: 'label', font: 'mono', at: [statementX, 560], size: 62, in: S8.designProposal, out: S8.designProposalOut },
  ...STATEMENT.map((l, i) => ({
    id: `statement-${i}`,
    text: l,
    kind: 'sentence' as const,
    font: 'sans600' as const,
    at: [statementX, 1492 + i * 206] as Pt,
    size: 165,
    in: S8.statement,
    inDur: 14,
    out: S8.statementOut[0],
    outDur: S8.statementOut[1] - S8.statementOut[0],
  })),
  { id: 'wordmark', text: 'Priora', kind: 'wordmark', font: 'sans600', at: [statementX, SHOTS.S8_SHEET.y + 92], size: 260, in: S8.wordmark, inDur: 20, out: null },
];
