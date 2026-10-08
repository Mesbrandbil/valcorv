// The one timeline file: every frame range in the film, as named constants (absolute frames, 30 fps).
// Sequence lengths are settled (plan section 8). Inside each sequence the beats follow the storyboard's
// order (plan section 7.1). A pair [a, b] runs from frame a to frame b.

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
  worker: [84, 104],
  workerLabel: 109,
  site: [110, 130],
  siteLabel: 135,
  riskOwner: [136, 156],
  riskOwnerLabel: 161,
  priora: [164, 180],
  beadArc: [172, 190],
  ellipse: [186, 204],
  // five specialists along the ellipse, stagger 4, 12 frames each, each with its own small turn
  specialistsStart: 190,
  specialistStagger: 4,
  specialistDur: 12,
  sentence2In: 218, // after the specialists have settled (F0218)
  // the exit runs under Sequence 2's first camera move
  labelsOut: 244,
  sentence1Out: 246, // leaves the frame as the camera closes in
  sentence2Out: 262, // stays inside the closing frame, so it can be read for its full 30 frames
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
  tiltPhone: [614, 624],
  photoTravel: [624, 640],
  photoSettle: [640, 648],
  photoSolid: [644, 652],
  chipLabelsOut: 628,
  caseLabelIn: 638,
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
  caseIn: [924, 948],
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
  marksLeave: [1108, 1123],
} as const;

// ---------------------------------------------------------------- Sequence 4: When the conditions hold
export const S4 = {
  marksIntoPriora: [1124, 1140],
  ghostsOut: [1124, 1150],
  namesOut: 1124,
  fold: [1134, 1154],
  arcsStart: 1138, // five arcs, stagger 5, 18 frames each, each from its agent's direction
  arcStagger: 5,
  arcDur: 18,
  arcsSlide: [1176, 1196],
  lock: [1196, 1204],
  insideIn: 1208,
  insideOut: 1250,
  route: [1224, 1274],
  prioraBead: [1248, 1254],
  prioraGlide: [1254, 1304],
  spark: 1274,
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
  prioraToEntrance: [1534, 1562],
  fold: [1540, 1560],
  barrierOut: 1562,
  packetLabelIn: 1560,
  packetOut: [1562, 1580], // through the entrance to Priora
  carry: [1580, 1636], // along ROUTE_ESCALATE to the dock; the camera follows F1584 to F1638
  packetLabelOut: 1610,
  loop: [1648, 1672],
  decidesIn: 1676,
  decidesOut: 1716,
} as const;

// ---------------------------------------------------------------- Sequence 6: Three decision rooms
export const S6 = {
  contextDim: [1691, 1731],
  forecourt: [1695, 1715],
  paths: [1697, 1721],
  bands: { retain: [1700, 1726], mitigate: [1706, 1732], transfer: [1712, 1738] },
  names: { retain: 1731, mitigate: 1737, transfer: 1743 },
  statuses: { retain: 1733, mitigate: 1739, transfer: 1745 },
  loopLetsGo: [1741, 1757],
  // Retain
  carryToRetain: [1757, 1811],
  // camera to Retain F1774 to F1814
  stopShort: [1814, 1828],
  agentCannot: 1830,
  lineToRetain: [1834, 1852],
  retainOpens: [1852, 1860],
  riskOwnerLabel: 1858,
  intoRetain: [1862, 1880],
  roomAgents: [1874, 1888],
  bridge: [1882, 1896],
  leaders: [1890, 1908],
  leaderLabels: [1896, 1900, 1904, 1908],
  // Mitigate (camera F1930 to F1970)
  retainFalls: [1930, 1946],
  retainTextOut: 1940,
  lineLeavesRetain: [1936, 1950],
  carryToMitigate: [1934, 1966],
  lineToMitigate: [1956, 1972],
  mitigateOpens: [1972, 1980],
  intoMitigate: [1986, 2004],
  safeguards: [1996, 2010],
  safeguardNames: [2006, 2010, 2014],
  thermalRise: [2020, 2036],
  thermalPiece: [2036, 2048],
  partial: 2052,
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
  intoTransfer: [2222, 2238],
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
  lineBack: [2355, 2391],
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
  designProposal: 2596,
  designProposalOut: 2636,
  recede: [2610, 2640],
  statement: 2640,
  dissolve: [2808, 2853],
  statementOut: [2808, 2826], // the words go first, so the wordmark never sits on them
  wordmark: 2830, // in by F2850: a full second alone after that
} as const;

// ---------------------------------------------------------------- Narration (plan section 9; inclusive frames)
export const NARRATION = [
  { id: 'N1', from: 8, to: 229, text: 'Real work in the middle: a worker, a site, a risk owner. Priora places agents around it.' },
  { id: 'W1', from: 272, to: 483, text: 'Hey, the bracket by the packing line has cracked again. We’re going to weld it before the night shift.', who: 'worker' },
  { id: 'N2', from: 506, to: 623, text: 'Priora hears the job, and asks for a photo.' },
  { id: 'N3a', from: 756, to: 899, text: 'Next, it summons only the specialists this site and job need.' },
  { id: 'N3b', from: 988, to: 1092, text: 'Each checks its own conditions and reports back.' },
  { id: 'N4', from: 1170, to: 1391, text: 'When everything holds, the route opens. Work goes on, the record is kept, no one is disturbed.' },
  { id: 'N5', from: 1404, to: 1690, text: 'One condition slips: the fire watch is half the policy. Priora brings it to the risk owner. Agents prepare, the human decides.' },
  { id: 'N6R-a', from: 1745, to: 1810, text: 'Retain is never a default.' },
  { id: 'N6R-b', from: 1811, to: 1928, text: 'Risk is kept on purpose, with its terms explicit.' },
  { id: 'N6M', from: 1982, to: 2125, text: 'Mitigate compares safeguards, and checks whether the work is back inside.' },
  { id: 'N6T', from: 2194, to: 2350, text: 'Transfer, simulated for now, asks outside capacity for terms and a price.' },
  { id: 'N7-a', from: 2363, to: 2441, text: 'Priora carries the case between rooms.' },
  { id: 'N7-b', from: 2451, to: 2529, text: 'The risk owner stays in control.' },
  { id: 'N8', from: 2636, to: 2792, text: 'Priora turns physical work into explicit risk decisions, while the work happens.' },
] as const;
