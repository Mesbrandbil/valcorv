// The one timeline file: every frame range in the film, as named constants (absolute frames, 30 fps).
// Sequence lengths are settled (plan section 8). Inside each sequence the beats follow the storyboard's
// order (plan section 7.1). A pair [a, b] runs from frame a to frame b.

import { VOICE_LENGTH } from './voice-lengths';

export const FILM_FRAMES = 2883;

export type Span = readonly [number, number];

export const SEQ = {
  s1: [0, 237],
  s2: [238, 653],
  s3: [654, 1123],
  s4: [1124, 1391],
  s5: [1392, 1690],
  s6r: [1691, 1929],
  s6m: [1930, 2153],
  s6t: [2154, 2350],
  s7: [2351, 2529],
  s8: [2530, 2882],
} as const satisfies Record<string, Span>;

// ---------------------------------------------------------------- Sequence 1: Real work in the middle
export const S1 = {
  ground: [0, 34],
  sentence1In: 10,
  worker: [80, 100],
  workerLabel: 105,
  site: [104, 124],
  siteLabel: 129,
  riskOwner: [128, 148],
  riskOwnerLabel: 153,
  priora: [152, 168],
  beadArc: [160, 178],
  ellipse: [172, 190],
  // five specialists along the ellipse, stagger 4, 12 frames each, each with its own small turn
  specialistsStart: 176,
  specialistStagger: 4,
  specialistDur: 12,
  sentence2In: 204, // after the specialists have settled (F0204): the whole relationship then holds still from F0216 to F0238
  // the exit runs under Sequence 2's first camera move
  labelsOut: 244,
  sentence1Out: 246, // leaves the frame as the camera closes in
  sentence2Out: 248, // early in the move, so the worker raising the phone is the only subject
  ellipseOut: [240, 258],
  specialistsOut: [244, 270],
} as const;

// ---------------------------------------------------------------- Sequence 2: A voice becomes a case
export const S2 = {
  prioraBeadToWorker: [244, 250],
  prioraGlide: [250, 296], // towards the worker, to hover just above and to its right
  raisePhone: [260, 276],
  voice: [272, 483], // the worker's message at 2.7 words per second (W1)
  beadToWave: [298, 304],
  listenThread: [304, 314], // the thread reaches the tip; then follows it until the voice ends
  wordsGrey: [484, 494],
  phrasesSeparate: [488, 504],
  greyOut: [494, 504], // grey words, waveform and underlines gone before the camera rises
  prioraBeadToCase: [492, 498],
  prioraToCase: [498, 534],
  // camera rise F0498 to F0538 (camera-keys.ts)
  phrasesTravel: [506, 538],
  circle: [524, 538],
  core: [534, 542],
  chipsStart: 540, // REPAIR, HOT WORK, PACKING LINE, BEFORE NIGHT SHIFT, stagger 4, 12 frames each
  chipStagger: 4,
  chipDur: 12,
  chipLabelDelay: 4,
  conditionsLine: [558, 574],
  conditionsChip: [572, 584],
  conditionsLabel: 588,
  photoFacet: [580, 592],
  photoLabel: 596,
  beadToWorker: [590, 596],
  request: 596, // "Photo of the bracket?"
  requestThread: [598, 612],
  requestOut: 646,
  tiltPhone: [612, 622],
  photoTravel: [622, 638], // rises from below the facet, clear of the PHOTO label
  photoSettle: [638, 644],
  photoSolid: [640, 646],
  chipLabelsOut: 626,
  fold: [642, 652], // the six facets fold slightly closer to the centre
  caseLabelIn: 648, // then CASE, in by F0654 when the camera starts to move
} as const;

// ---------------------------------------------------------------- Sequence 3: The site chooses its cast
export const S3 = {
  travel: [654, 710], // Priora leads, the case follows on a short thread; facets fold in flight
  caseLabelOut: 690,
  wall: [672, 706],
  table: [684, 708],
  seats: [690, 712],
  ghosts: [696, 716],
  title: 714,
  sub: 720,
  ghostNames: [728, 734, 740],
  beadToGhosts: [744, 758],
  beadBack: [764, 778],
  summonStart: 782, // one every 18 frames: pulse 8, thread 12, slide in 18, through the entrance 20, settle 8
  summonEvery: 18,
  caseIn: [918, 950],
  // camera to the table F0970 to F1014; the case opens in the move
  caseOpen: [976, 1008],
  checkEvidence: [1016, 1040],
  checkRiskEng: [1028, 1052],
  checkSiteRules: [1040, 1060],
  checkFire: [1052, 1072],
  checkInsurer: [1064, 1084],
  fireWatchIn: 1076,
  fireWatchRide: [1086, 1100],
  fireWatchOut: 1102,
  answerJoins: [1100, 1110],
  // the findings (src/film/findings.ts): each waits 6 frames by its agent, then takes 28 to move round inside
  // the table to wait near the entrance; the fifth joins them; the five leave together, 2 frames apart
  markWaits: 6,
  markToSlot: 28,
  insurerToSlot: [1104, 1122],
  marksLeave: [1120, 1138],
  leaveStagger: 2,
  leaveFrames: 22,
} as const;

// ---------------------------------------------------------------- Sequence 4: When the conditions hold
export const S4 = {
  linkOut: [1152, 1166], // Priora's fine connection to the case lets go as the camera approaches
  ghostsOut: [1124, 1150],
  namesOut: 1124,
  fold: [1152, 1172], // the facets draw in to clear the ring; their marks stay
  // the marks rest beside Priora, then go back in one after another at an even pace, each round to its
  // agent's side, where it becomes its arc (its slide starts the moment it arrives: src/film/findings.ts)
  marksIn: 1150,
  marksInStagger: 3,
  markSpeed: 16, // world units a frame, on average
  arcDur: 12,
  arcsSlide: [1226, 1234], // after the last arc is in (F1228)
  lock: [1234, 1242],
  insideIn: 1238, // 4 frames after the lock begins
  insideOut: 1278,
  route: [1244, 1292],
  prioraBead: [1256, 1262],
  prioraGlide: [1262, 1312],
  spark: 1292,
  record: [1302, 1322],
  mark1: [1322, 1330],
  recordKept: 1334,
  noOneDisturbed: 1346,
  beadToWork: [1360, 1376],
} as const;

// ---------------------------------------------------------------- Sequence 5: A condition slips
export const S5 = {
  // the slip starts once the camera has settled on S5_GAP (F1438)
  arcLoosens: [1440, 1466],
  arcDashed: 1450,
  insurerApart: [1444, 1460],
  coralEnds: [1458, 1468],
  ruler1Label: 1470,
  ruler1: [1472, 1486],
  ruler2Label: 1484,
  ruler2: [1486, 1514], // twice as long at the same speed
  barrier: [1496, 1512],
  barrierLabel: 1512,
  rulersOut: 1534,
  prioraToEntrance: [1534, 1560],
  fold: [1540, 1560],
  barrierOut: 1562,
  packetLabelIn: 1560,
  packetOut: [1560, 1584], // through the entrance to Priora
  carry: [1584, 1644], // along ROUTE_ESCALATE to the dock; the camera follows F1590 to F1644
  packetLabelOut: 1592, // read, and gone before Priora's carry swings past it
  loop: [1650, 1674],
  decidesIn: 1678,
  decidesOut: 1718,
} as const;

// ---------------------------------------------------------------- Sequence 6: Three decision rooms
export const S6 = {
  contextDim: [1691, 1731],
  forecourt: [1695, 1715],
  paths: [1697, 1721],
  // Transfer prints once the camera has settled, so SIMULATED can arrive with it, 6 frames after it starts
  bands: { retain: [1700, 1726], mitigate: [1706, 1732], transfer: [1733, 1755] },
  names: { retain: 1731, mitigate: 1737, transfer: 1739 },
  statuses: { retain: 1733, mitigate: 1739, transfer: 1739 },
  loopLetsGo: [1741, 1757],
  // Retain
  carryToRetain: [1757, 1811],
  // camera to Retain F1774 to F1814
  stopShort: [1814, 1828],
  agentCannot: 1830,
  agentCannotOut: 1890, // read in full, and gone before the leaders arrive
  lineToRetain: [1832, 1850],
  retainOpens: [1850, 1856],
  riskOwnerLabel: 1856,
  intoRetain: [1862, 1886],
  roomAgents: [1880, 1894],
  bridge: [1884, 1898],
  leaders: [1892, 1906],
  leaderLabels: [1894, 1897, 1900, 1903],
  // Mitigate (camera F1930 to F1970)
  retainFalls: [1930, 1946],
  retainTextOut: 1933, // gone before the pan to Mitigate takes them to the frame edge
  lineLeavesRetain: [1936, 1950],
  carryToMitigate: [1934, 1966],
  lineToMitigate: [1954, 1970],
  mitigateOpens: [1970, 1978],
  intoMitigate: [1984, 2016], // a long way down the room, so a long, even glide
  safeguards: [1998, 2010], // each prints over 12 frames: thermal at +0, workshop at +4, watch at +10, after Priora has passed it
  safeguardDelay: [0, 10, 4], // thermal, watch, workshop
  safeguardNames: [2008, 2018, 2012],
  thermalRise: [2026, 2040],
  thermalPiece: [2040, 2050],
  partial: 2054,
  thermalBack: [2084, 2098],
  watchRise: [2086, 2100],
  watchPiece: [2100, 2112],
  full: 2116,
  corners: [2118, 2132],
  backInside: 2134,
  safeguardNamesOut: 2150,
  proposalWithdraws: [2150, 2166],
  resultsOut: 2164,
  // Transfer (camera F2154 to F2194)
  carryToTransfer: [2160, 2192],
  lineLeavesMitigate: [2160, 2174],
  retainLabelsOut: [2154, 2164],
  noInsurer: 2196,
  lineToTransfer: [2198, 2212],
  transferOpens: [2212, 2218],
  intoTransfer: [2222, 2242],
  agentLabels: [2240, 2244, 2248],
  copiesOut: [2242, 2262],
  answersBack: [2262, 2284],
  answerLabels: [2286, 2290, 2294, 2298],
  answersOut: 2330, // the labels go as Priora gathers the answers into the packet
  gather: [2330, 2344],
  outToForecourt: [2344, 2350],
} as const;

// ---------------------------------------------------------------- Sequence 7: The rooms work together
export const S7 = {
  // camera widens F2351 to F2391
  transferTextOut: 2351,
  lineBack: [2351, 2371], // quick, so the only black line drawn in Sequence 7 is the closing one
  toMitigateDoor: [2351, 2391],
  roomsBack: [2351, 2391],
  retainLabelsBack: 2392,
  safeguardPiece: [2391, 2403],
  toRetainDoor: [2403, 2421],
  mitigatePart: 2407,
  bridge: [2421, 2433],
  keepTheRest: 2437,
  toDesk: [2437, 2463],
  line: [2465, 2485],
  solid: [2485, 2495],
  decides: 2489,
  pulse: [2495, 2507],
} as const;

// ---------------------------------------------------------------- Sequence 8: The whole system
export const S8 = {
  // camera withdraws F2530 to F2570
  textOut: 2530,
  contextBack: [2530, 2570],
  caseLowers: [2532, 2554],
  mark2: [2554, 2562],
  prioraRises: [2564, 2594],
  statusesOut: [2574, 2584],
  designProposal: 2596,
  designProposalOut: 2636,
  recede: [2610, 2640],
  statement: 2640,
  dissolve: [2808, 2853],
  statementOut: [2808, 2824], // the words go first, so the wordmark never sits on them
  wordmark: 2824, // straight after, with no empty beat; in by F2836, then well over a second alone
} as const;

// ---------------------------------------------------------------- Narration ("narration script.md"; inclusive frames)
/** The voice is written to 90 BPM: one beat is 20 frames, one bar of four is 80. Every line starts on a beat. */
export const BEAT = 20;
export const BAR = 4 * BEAT;
/** The recorded lines: each starts on its beat and must be over by frame `by`. */
export const VOICE = [
  { id: 'N1a', beat: 1, by: 150, text: 'Real work in the middle: a worker, a site, a risk owner.' },
  { id: 'N1b', beat: 8, by: 236, text: 'Priora places agents around it.' },
  { id: 'W1', beat: 14, by: 490, text: 'Hey, the bracket by the packing line has cracked again. We’re going to weld it before the night shift.', who: 'worker' },
  { id: 'N2', beat: 25, by: 620, text: 'Priora hears the job, and asks for a photo.' },
  { id: 'N3a', beat: 38, by: 899, text: 'Next, it summons only the specialists this site and job need.' },
  { id: 'N3b', beat: 50, by: 1100, text: 'Each checks its own conditions and reports back.' },
  { id: 'N4a', beat: 60, by: 1270, text: 'When everything holds, the route opens.' },
  { id: 'N4b', beat: 64, by: 1420, text: 'Work goes on, the record is kept, no one is disturbed.' },
  { id: 'N5a', beat: 72, by: 1560, text: 'One condition slips: the fire watch is half the policy.' },
  { id: 'N5b', beat: 80, by: 1660, text: 'Priora brings it to the risk owner.' },
  { id: 'N5c', beat: 84, by: 1760, text: 'Agents prepare, the human decides.' },
  { id: 'N6Ra', beat: 89, by: 1850, text: 'Retain is never a default.' },
  { id: 'N6Rb', beat: 93, by: 1940, text: 'Risk is kept on purpose, with its terms explicit.' },
  { id: 'N6M', beat: 100, by: 2150, text: 'Mitigate compares safeguards, and checks whether the work is back inside.' },
  { id: 'N6T', beat: 110, by: 2350, text: 'Transfer, simulated for now, asks outside capacity for terms and a price.' },
  { id: 'N7a', beat: 118, by: 2440, text: 'Priora carries the case between rooms.' },
  { id: 'N7b', beat: 123, by: 2530, text: 'The risk owner stays in control.' },
  { id: 'N8', beat: 132, by: 2800, text: 'Priora turns physical work into explicit risk decisions, while the work happens.' },
] as const;
export type VoiceId = (typeof VOICE)[number]['id'];
/** Each line's window: from its beat for the recorded length (voice-lengths.ts, written by the mix), else to `by`. */
export const NARRATION = VOICE.map((v) => {
  const from = v.beat * BEAT;
  const to = from + (VOICE_LENGTH[v.id] ?? v.by - from) - 1;
  return 'who' in v ? { id: v.id, from, to, text: v.text, who: v.who } : { id: v.id, from, to, text: v.text };
});
