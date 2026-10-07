/*
  s6-rooms (57 to 78 s): three decision rooms.

  The packet's gap opens three rooms on the right of the risk owner. Each room is its own
  chamber with its own agents and its own rule, and only the risk owner's black line opens
  a door: it reaches out to a branch point and three dashed branches run to the doors.

  Retain (59.2 to 65.8): an agent pushes the closed door from inside and it shudders shut
  (AN AGENT CANNOT CHOOSE IT); a dashed timer runs out around the door and it stays shut
  (SILENCE DOES NOT CHOOSE IT). The black line opens it. Priora sends a copy of the packet
  in; a clamp spans the gap (kept on purpose) and the room's agents hang four terms on it:
  EXPOSURE, AUTHORITY, CONDITIONS, EXPIRY.
  Mitigate (65.8 to 71.6): three safeguards from a reviewed library slide off the shelf onto
  a rail, each with its cost (ink coins) and time (a small arc). Thermal check, tried in the
  gap, fills part of it: PARTIAL, the rest moves on. Extend watch fills it: FULL, the ring
  closes, the verifier's corners land: BACK INSIDE. Previews only: everything reverts.
  (Thermal check's piece covers 234 to 277 degrees, about 60 percent of the gap; Extend watch
  and Move weld to workshop cover all of it.)
  Transfer (71.6 to 77.4): dashed, SIMULATED, NO INSURER ON PRIORA YET. Dashed copies of the
  gap go out to three dashed SIM hexagons; each answers with the same four tags, every value
  an empty line. No names, no numbers.
  76.8 to 78.0: Priora collects the packet and waits by the rooms.

  Contract at 57.0 (from s5) is tl.set below. Contract at 78.0 (for s7): Priora (1200, 480),
  bead 0; packet (1200, 528), arcsG 0.75, insurer arc hidden (gap open); rooms drawn, doors
  closed, names and SIMULATED chip visible (the chip is scaled 1.25 about its centre so it
  reads at 18 px or more in the wide shots); W.decision d "M1174 710 H1226 Q1250 710 1250 686"
  (hand to the branch point B = (1250, 686)) drawn; W.branches = { retain, mitigate,
  transfer } dashed paths from B (mitigate leaves the shared spine at (1250, 530));
  W.roomAgents = { retain: [policy, authority, record], mitigate: [eng, verifier],
  transfer: [carrier, carrier, capacity] } in place, names hidden; W.safeguards = { thermal,
  watch, workshop } each { g, piece, a0, a1 } resting on the Mitigate rail (piece geometry is
  local to the ring centre: an annular sector at radius 28.2 to 31.8 world units, the size of
  the packet's gap with arcsG at 0.75, so moving g to the packet's x/y seats it in the gap).
  W.roomOwnerLines = { retain, mitigate, transfer }: solid black paths from B through each
  door, undrawn (s7 may draw them to open a door again). No transient labels.
*/
PK.section("s6-rooms", 57, 78, function (tl, W, ctx, S) {
  "use strict";
  var G = PK.GEO,
    C = PK.C,
    f = PK.fmt;
  var T0 = 57.0;
  var cs = W.caseT;
  var P = W.priora;
  var RM = W.rooms;
  var KEYS = ["siteRules", "insurer", "fire", "riskEng", "evidence"];
  var px = function (t, s) {
    return PK.cam.px(t, s);
  };

  // ------------------------------------------------------------ small seek-safe helpers
  function FT(el, from, to, at) {
    var v = {};
    for (var k in to) v[k] = to[k];
    v.immediateRender = false;
    tl.fromTo(el, from, v, at);
  }
  function fadeIn(el, at, dur, ease) {
    FT(el, { opacity: 0 }, { opacity: 1, duration: dur || 0.35, ease: ease || "power2.out" }, at);
  }
  function fadeOut(el, at, dur, ease) {
    FT(el, { opacity: 1 }, { opacity: 0, duration: dur || 0.35, ease: ease || "power1.in" }, at);
  }
  function draw(el, at, dur, ease, from) {
    var s = from === "middle" ? "50% 50%" : from === "end" ? "100% 100%" : "0% 0%";
    FT(el, { drawSVG: s }, { drawSVG: "0% 100%", duration: dur || 0.5, ease: ease || "power2.inOut" }, at);
  }
  function undraw(el, at, dur, ease, to) {
    var s = to === "end" ? "100% 100%" : to === "middle" ? "50% 50%" : "0% 0%";
    FT(el, { drawSVG: "0% 100%" }, { drawSVG: s, duration: dur || 0.4, ease: ease || "power2.in" }, at);
  }
  function hide(el) {
    gsap.set(el, { opacity: 0 });
    return el;
  }
  function undrawn(el) {
    gsap.set(el, { drawSVG: "0% 0%" });
    return el;
  }
  function place(el, p) {
    gsap.set(el, { x: p[0], y: p[1] });
    return el;
  }
  function pulse(el, at, s, o) {
    FT(el, { scale: 1, svgOrigin: (o || "0 0") }, { keyframes: [{ scale: s || 1.08, duration: 0.12, ease: "power1.out" }, { scale: 1, duration: 0.28, ease: "power2.inOut" }], svgOrigin: (o || "0 0") }, at);
  }
  // a positioned group (x/y on .g) with an inner group (.s) that scales about the position
  function holder(parent) {
    var g = PK.g(parent);
    return { g: g, s: PK.g(g) };
  }
  function sector(r0, r1, a0, a1) {
    var p0 = PK.polar(0, 0, r1, a0),
      p1 = PK.polar(0, 0, r1, a1),
      p2 = PK.polar(0, 0, r0, a1),
      p3 = PK.polar(0, 0, r0, a0);
    var lg = a1 - a0 > 180 ? 1 : 0;
    return (
      "M" + f(p0[0]) + " " + f(p0[1]) + " A" + f(r1) + " " + f(r1) + " 0 " + lg + " 1 " + f(p1[0]) + " " + f(p1[1]) +
      " L" + f(p2[0]) + " " + f(p2[1]) + " A" + f(r0) + " " + f(r0) + " 0 " + lg + " 0 " + f(p3[0]) + " " + f(p3[1]) + " Z"
    );
  }
  function mono(parent, str, x, y, size, o) {
    o = o || {};
    return PK.text(parent, str, x, y, { font: "mono", size: size, fill: o.fill || C.rust, anchor: o.anchor || "start", weight: o.weight || 500 });
  }
  function sans(parent, str, x, y, size, o) {
    o = o || {};
    return PK.text(parent, str, x, y, { size: size, weight: 500, fill: o.fill || C.ink, anchor: o.anchor || "start" });
  }
  function monoW(str, size) {
    return PK.measure(str.toUpperCase(), "mono500", size, 0.12);
  }

  // ------------------------------------------------------------ layers (inside the world's own stacking order)
  var defs = PK.el("defs", null, W.svg);
  var Lr = PK.g(W.L.routes);
  var Lth = PK.g(W.L.threads);
  var Ltk = PK.g(W.L.tokens);
  var Lcs = PK.g(W.L.case);
  var Llb = PK.g(W.L.labels);

  // ------------------------------------------------------------ the packet's arcs (built here only if s4/s5 are placeholders)
  if (!W.align || !W.align.arcs) {
    var made = {};
    KEYS.forEach(function (k) {
      var a = G.agents[k].aligned;
      made[k] = PK.el("path", { d: PK.arc(0, 0, G.alignR, a - 36, a + 36), fill: "none", stroke: C.rust, "stroke-width": 3, "stroke-linecap": "butt" }, cs.arcsG);
      gsap.set(made[k], { opacity: 0 });
    });
    W.align = { arcs: made };
  }
  if (!W.gap) W.gap = { a0: 234, a1: 306, r: G.alignR };
  var ARC_SW = parseFloat(W.align.arcs.fire.getAttribute("stroke-width")) || 3;

  // ============================================================ contract at 57.0 (from s5)
  var PRI0 = [1060, 600],
    PK0 = [1098, 662];
  tl.set(P.g, { x: PRI0[0], y: PRI0[1], opacity: 1 }, T0);
  tl.set(P.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(P.beadG, { rotation: 60, svgOrigin: "0 0", opacity: 1 }, T0);
  tl.set(P.orbit, { opacity: 1 }, T0);
  tl.set(P.label, { opacity: 0 }, T0);
  tl.set(cs.g, { x: PK0[0], y: PK0[1], opacity: 1 }, T0);
  tl.set(cs.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(cs.arcsG, { scale: 0.75, svgOrigin: "0 0" }, T0);
  KEYS.forEach(function (k) {
    var a = W.align.arcs[k];
    tl.set(a, { opacity: k === "insurer" ? 0 : 1, rotation: 0, x: 0, y: 0, svgOrigin: "0 0" }, T0);
    if (k !== "insurer") tl.set(a, { drawSVG: "0% 100%" }, T0);
  });
  if (W.align.insurerDashed) tl.set(W.align.insurerDashed, { opacity: 0 }, T0);
  cs.facets.forEach(function (fc) {
    tl.set(fc.chipG, { x: cs.R, opacity: 1 }, T0);
    tl.set(fc.spoke, { drawSVG: "0% 0%" }, T0);
    if (fc.labelEl) tl.set(fc.labelEl, { opacity: 0 }, T0);
  });
  tl.set(cs.facet("photo").mark, { opacity: 1 }, T0);
  if (W.caseLabel) tl.set(W.caseLabel, { opacity: 0 }, T0);
  var DEC0 = "M" + G.ownerHand[0] + " " + G.ownerHand[1] + " H1226";
  tl.set(W.decision, { attr: { d: DEC0 }, opacity: 1 }, T0);
  tl.set(W.decision, { drawSVG: "0% 100%" }, T0);
  if (W.ownerDecides) tl.set(W.ownerDecides, { opacity: 1 }, T0);
  // the real world, the panel, the route and the record (as left by s4/s5)
  [W.real.worker, W.real.site, W.real.owner].forEach(function (o) {
    tl.set(o.body, { opacity: 1 }, T0);
  });
  tl.set([W.real.labels.worker, W.real.labels.site, W.real.labels.owner], { opacity: 1 }, T0);
  tl.set(W.real.ground, { drawSVG: "0% 100%" }, T0);
  var PN = W.panel;
  tl.set(PN.walls, { drawSVG: "0% 100%" }, T0);
  tl.set([PN.leafA, PN.leafB, PN.jambs, PN.title, PN.sub], { opacity: 1 }, T0);
  tl.set(PN.leafA, { y: -G.panel.gap / 2 + 0.01 }, T0);
  tl.set(PN.leafB, { y: G.panel.gap / 2 - 0.01 }, T0);
  PN.slots.forEach(function (s) {
    tl.set(s.el, { opacity: 0 }, T0);
  });
  KEYS.forEach(function (k) {
    var ins = k === "insurer";
    var p = PK.polar(G.table[0], G.table[1], G.slotR + (ins ? 8 : 0), G.agents[k].aligned);
    tl.set(W.agents[k].g, { x: p[0], y: p[1], opacity: 1 }, T0);
    tl.set(W.agents[k].body, { rotation: ins ? 12 : 0, svgOrigin: "0 0" }, T0);
    tl.set(W.agents[k].label, { opacity: 1 }, T0);
  });
  tl.set(W.route, { drawSVG: "0% 100%" }, T0);
  tl.set(W.record.spine, { drawSVG: "0% 100%" }, T0);
  // the rooms start hidden (world.js); make it explicit so a mismatch shows as a jump
  ["retain", "mitigate", "transfer"].forEach(function (k) {
    var ch = RM[k];
    if (k !== "transfer") tl.set(ch.walls, { drawSVG: "0% 0%" }, T0);
    tl.set([ch.leafA, ch.leafB], { opacity: 0, x: 0, y: 0 }, T0);
    tl.set([ch.jambs, ch.name], { opacity: 0 }, T0);
  });
  var CHIP_O = "1719 630"; // centre of the SIMULATED chip (world.js)
  tl.set(RM.transfer.chip, { opacity: 0, scale: 1.25, svgOrigin: CHIP_O }, T0);

  // ============================================================ geometry of the rooms' insides
  var B = [1250, 686]; // the branch point of the risk owner's line
  var DOOR = { retain: [1300, 330], mitigate: [1300, 508], transfer: [1300, 686] };
  var CR = [1560, 342]; // the packet copy in Retain
  var CM = [1400, 514]; // in Mitigate
  var CT = [1470, 686]; // in Transfer (dashed)
  var RAIL_Y = 490;
  var SG_R0 = 28.2,
    SG_R1 = 31.8; // safeguard pieces: an annular sector on the gap's radius (30)

  // ============================================================ 57.35 to 59.2: three decision rooms open (overview)
  var tThree = PK.word("L09", "three");
  // faint guide lines from the packet's gap toward the three doors
  var gapPt = [PK0[0], PK0[1] - 30 - 3];
  var guideD = {
    retain: "M" + gapPt[0] + " " + gapPt[1] + " C1098 470 1190 330 1290 330",
    mitigate: "M" + gapPt[0] + " " + gapPt[1] + " C1104 552 1190 508 1290 508",
    transfer: "M" + gapPt[0] + " " + gapPt[1] + " C1110 590 1236 686 1290 686",
  };
  ["retain", "mitigate", "transfer"].forEach(function (k, i) {
    var g = PK.el("path", { d: guideD[k], class: "pk-thread", "stroke-opacity": 0.4 }, Lth);
    undrawn(g);
    draw(g, tThree + i * 0.1, 0.6, "power2.out");
    fadeOut(g, 58.75 + i * 0.05, 0.45);
  });
  PK.sfx("thread", tThree, { gain_db: -14, dur: 0.8, pan: 0.4, material: "pencil" });
  pulse(cs.body, tThree - 0.05, 1.05);

  // the chambers draw from their doors
  var tCh = { retain: 57.4, mitigate: 57.75, transfer: 58.1 };
  draw(RM.retain.walls, tCh.retain, 0.8, "power2.inOut");
  draw(RM.mitigate.walls, tCh.mitigate, 0.8, "power2.inOut");
  // Transfer is dashed (simulated): never DrawSVG it. Clear the hidden dash that world.js left
  // inline so the class dash applies, and reveal it with a clip that grows from its door.
  var trClip = PK.el("clipPath", { id: "s6-clip-transfer", clipPathUnits: "userSpaceOnUse" }, defs);
  var trCirc = PK.el("circle", { cx: DOOR.transfer[0], cy: DOOR.transfer[1], r: 0 }, trClip);
  // (the clip is static: before the reveal its circle has r 0, after it r 520 covers the room)
  RM.transfer.walls.setAttribute("clip-path", "url(#s6-clip-transfer)");
  tl.set(RM.transfer.walls, { attr: { style: "" } }, tCh.transfer);
  FT(trCirc, { attr: { r: 0 } }, { attr: { r: 520 }, duration: 0.85, ease: "power2.inOut" }, tCh.transfer);
  ["retain", "mitigate", "transfer"].forEach(function (k, i) {
    var t = tCh[k] + 0.55;
    fadeIn([RM[k].leafA, RM[k].leafB, RM[k].jambs], t, 0.3);
    FT(RM[k].name, { opacity: 0, x: -4 }, { opacity: 1, x: 0, duration: 0.45, ease: "power2.out" }, t + 0.05);
    PK.sfx("thread", tCh[k], { gain_db: -12, dur: 0.8, pan: 0.5, material: "pencil" });
  });
  FT(RM.transfer.chip, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, tCh.transfer + 0.7);
  FT(RM.transfer.chip, { scale: 1.1, svgOrigin: CHIP_O }, { scale: 1.25, svgOrigin: CHIP_O, duration: 0.4, ease: "back.out(1.4)" }, tCh.transfer + 0.7);
  PK.sfx("simulated", tCh.transfer + 0.7, { gain_db: -10, pan: 0.6 });
  if (W.ownerDecides) fadeOut(W.ownerDecides, 57.4, 0.4);

  // the risk owner's line reaches a branch point; dashed branches run to the three doors
  var tDec = 58.25;
  var TRUNK = DEC0 + " Q1250 " + G.ownerHand[1] + " " + B[0] + " " + B[1];
  tl.set(W.decision, { attr: { d: TRUNK } }, tDec);
  FT(W.decision, { drawSVG: "0 52" }, { drawSVG: "0% 100%", duration: 0.4, ease: "power2.out" }, tDec);
  PK.sfx("decision", tDec, { gain_db: -6, pan: 0.3 });
  var brClip = PK.el("clipPath", { id: "s6-clip-branches", clipPathUnits: "userSpaceOnUse" }, defs);
  var brCirc = PK.el("circle", { cx: B[0], cy: B[1], r: 0 }, brClip);
  var brG = PK.g(Lr, { "clip-path": "url(#s6-clip-branches)" });
  var BR_D = {
    retain: "M1250 686 V352 Q1250 330 1272 330 H1300",
    mitigate: "M1250 530 Q1250 508 1272 508 H1300",
    transfer: "M1250 686 H1300",
  };
  W.branches = {};
  ["retain", "mitigate", "transfer"].forEach(function (k) {
    W.branches[k] = PK.el("path", { d: BR_D[k], class: "pk-decision-dash" }, brG);
  });
  FT(brCirc, { attr: { r: 0 } }, { attr: { r: 400 }, duration: 0.75, ease: "power1.inOut" }, tDec + 0.38);
  PK.sfx("route", tDec + 0.38, { gain_db: -14, dur: 0.75, pan: 0.5 });
  // the solid line that opens a door: from B along the branch, through the doorway
  var OWN_D = {
    retain: "M1250 686 V352 Q1250 330 1272 330 H1305",
    mitigate: "M1250 686 V530 Q1250 508 1272 508 H1305",
    transfer: "M1250 686 H1305",
  };
  var own = {};
  ["retain", "mitigate", "transfer"].forEach(function (k) {
    own[k] = undrawn(PK.el("path", { d: OWN_D[k], class: "pk-decision" }, Lr));
  });
  W.roomOwnerLines = own;
  // B: a small black node where the decision line splits
  var bNode = (W.branchNode = hide(PK.el("circle", { cx: B[0], cy: B[1], r: 2.6, fill: C.ink }, Lr)));
  fadeIn(bNode, tDec + 0.35, 0.25);

  // ------------------------------------------------------------ the rooms' own agents print in, quietly
  var RA = { retain: [], mitigate: [], transfer: [] };
  // lp is the name's offset from the token (the name rides with the token's .g, not its .body)
  function agentAt(make, p, label, lp, anchor, size) {
    var a = make();
    place(a.g, p);
    hide(a.g);
    a.p = p;
    if (label) {
      a.name = sans(a.g, label, lp[0], lp[1], size, { anchor: anchor });
      hide(a.name);
    }
    return a;
  }
  var NS_R = px(62.5, 22),
    NS_M = px(68.5, 22),
    NS_T = px(74.5, 19);
  var policy = agentAt(function () { return PK.glyph.roomAgent(Ltk, "policy", 18); }, [1400, 372], "Policy", [0, 12 + NS_R * 0.78], "middle", NS_R);
  var authority = agentAt(function () { return PK.glyph.roomAgent(Ltk, "authority", 18); }, [1690, 298], "Authority", [15, NS_R * 0.36], "start", NS_R);
  var record = agentAt(function () { return PK.glyph.roomAgent(Ltk, "record", 18); }, [1690, 364], "Record", [15, NS_R * 0.36], "start", NS_R);
  RA.retain = [policy, authority, record];
  var eng = agentAt(function () { return PK.glyph.roomAgent(Ltk, "eng", 18); }, [1468, 452], "Risk engineering", [16, NS_M * 0.36], "start", NS_M);
  var verifier = agentAt(function () { return PK.glyph.roomAgent(Ltk, "eng", 18); }, [1478, 566], "Verifier", [16, NS_M * 0.36], "start", NS_M);
  RA.mitigate = [eng, verifier];
  var HEX_X = 1738,
    HEX_Y = [662, 700, 738];
  var hexNames = ["Carrier · sim", "Carrier · sim", "Capacity · sim"];
  HEX_Y.forEach(function (y, i) {
    var h = agentAt(function () { return PK.glyph.carrier(Ltk, 22); }, [HEX_X, y], null);
    h.name = mono(Llb, hexNames[i], HEX_X - 15, y - 6.5, NS_T, { anchor: "end" });
    hide(h.name);
    RA.transfer.push(h);
  });
  W.roomAgents = RA;
  var tPrint = 58.4;
  RA.retain.concat(RA.mitigate).forEach(function (a, i) {
    var t = tPrint + i * 0.07;
    fadeIn(a.g, t, 0.25, "none");
    FT(a.body, { scale: 0.55, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.45, ease: "back.out(1.4)" }, t);
  });
  RA.transfer.forEach(function (a, i) {
    fadeIn(a.g, tPrint + 0.45 + i * 0.08, 0.35, "none");
  });
  PK.sfx("arrive", tPrint, { gain_db: -16, size: "small", pan: 0.55 });
  PK.sfx("arrive", tPrint + 0.25, { gain_db: -17, size: "small", pan: 0.6 });
  PK.sfx("simulated", tPrint + 0.5, { gain_db: -18, pan: 0.65 });
  // the Transfer room's ports: dashed openings in its right wall that lead outside
  var ports = hide(PK.g(Lth));
  HEX_Y.forEach(function (y) {
    PK.el("path", { d: "M" + (HEX_X + 13) + " " + y + " H1806", fill: "none", stroke: C.rust, "stroke-width": 1, "stroke-dasharray": "2.4 2.2", "stroke-linecap": "butt" }, ports);
    PK.el("circle", { cx: 1811, cy: y, r: 3.4, fill: C.paper, stroke: C.rust, "stroke-width": 1, "stroke-dasharray": "1.8 1.6" }, ports);
    PK.el("path", { d: "M1776 " + (y - 5) + " H1784 M1776 " + (y + 5) + " H1784", fill: "none", stroke: C.ink, "stroke-width": 1, "stroke-linecap": "round" }, ports);
  });
  fadeIn(ports, tPrint + 0.7, 0.4, "none");

  // ------------------------------------------------------------ the Mitigate shelf (the right end of its rail) and the safeguards
  var rail = undrawn(PK.el("path", { d: "M1512 " + RAIL_Y + " H1766", class: "pk-hair" }, Lr));
  var SHELF_FROM = ((1650 - 1512) / (1766 - 1512)) * 100;
  FT(rail, { drawSVG: "100% 100%" }, { drawSVG: f(SHELF_FROM) + "% 100%", duration: 0.45, ease: "power2.out" }, tPrint + 0.2);
  var SG_DEF = {
    thermal: { name: ["Thermal check"], a0: 234, a1: 277, coins: 1, time: 0.25, shelf: 1672, slot: 1555 },
    watch: { name: ["Extend watch", "to 60 min"], a0: 234, a1: 306, coins: 2, time: 0.5, shelf: 1710, slot: 1640 },
    workshop: { name: ["Move weld", "to workshop"], a0: 234, a1: 306, coins: 3, time: 0.85, shelf: 1748, slot: 1725 },
  };
  var SG_KEYS = ["thermal", "watch", "workshop"];
  var ROW_COST = RAIL_Y + 15 + NS_M * 1.18 + 9.5,
    ROW_TIME = ROW_COST + 11.5;
  var SG_YOFF = SG_R0 * Math.sin((54 * Math.PI) / 180) + 0.9; // the sector's lowest corners rest on the rail
  W.safeguards = {};
  SG_KEYS.forEach(function (k, i) {
    var d = SG_DEF[k];
    var g = PK.g(Ltk, { class: "pk-token" });
    var shape = sector(SG_R0, SG_R1, d.a0, d.a1);
    PK.el("path", { d: shape, fill: C.shadow, transform: "translate(1 1.8)" }, g);
    var piece = PK.el("path", { d: shape, fill: C.rust }, g);
    // the visual centre of the sector, so it sits centred on its place on the rail
    var xa = PK.polar(0, 0, SG_R1, d.a0)[0],
      xb = PK.polar(0, 0, SG_R1, d.a1)[0];
    d.cx = -(xa + xb) / 2;
    d.posShelf = [d.shelf + d.cx, RAIL_Y + SG_YOFF];
    d.posRail = [d.slot + d.cx, RAIL_Y + SG_YOFF];
    place(g, d.posShelf);
    hide(g);
    fadeIn(g, tPrint + 0.35 + i * 0.08, 0.3, "none");
    // its name and measures (shown while Mitigate is compared, then put away)
    var info = hide(PK.g(Llb));
    d.name.forEach(function (line, j) {
      sans(info, line, d.slot, RAIL_Y + 15 + j * NS_M * 1.18, NS_M, { anchor: "middle" });
    });
    // cost: one to three ink coins; time: a small arc (one row each, aligned across the rail)
    var coins = PK.g(info);
    for (var c = 0; c < d.coins; c++) {
      var cxp = d.slot + (c - (d.coins - 1) / 2) * 8;
      PK.el("circle", { cx: cxp, cy: ROW_COST, r: 3, fill: C.ink }, coins);
      PK.el("circle", { cx: cxp, cy: ROW_COST, r: 1.7, fill: "none", stroke: C.paper, "stroke-width": 0.5 }, coins);
    }
    var tg = PK.g(info);
    PK.el("circle", { cx: d.slot, cy: ROW_TIME, r: 4.2, fill: "none", stroke: C.hair, "stroke-width": 1 }, tg);
    var tarc = PK.el("path", { d: PK.arc(d.slot, ROW_TIME, 4.2, -90, -90 + 360 * d.time), fill: "none", stroke: C.ink, "stroke-width": 1.8, "stroke-linecap": "round" }, tg);
    PK.el("circle", { cx: d.slot, cy: ROW_TIME, r: 0.8, fill: C.ink }, tg);
    W.safeguards[k] = { g: g, piece: piece, a0: d.a0, a1: d.a1, info: info, coins: coins, timeArc: tarc };
  });

  var LEG = px(68.5, 18);
  var legend = hide(PK.g(Llb));
  mono(legend, "Cost", 1508, ROW_COST + LEG * 0.36, LEG, { fill: C.grey, anchor: "end" });
  mono(legend, "Time", 1508, ROW_TIME + LEG * 0.36, LEG, { fill: C.grey, anchor: "end" });

  // ------------------------------------------------------------ Priora turns to Retain
  var BEAD = { retain: -48, mitigate: -21, transfer: 20 };
  FT(P.beadG, { rotation: 60, svgOrigin: "0 0" }, { rotation: BEAD.retain, svgOrigin: "0 0", duration: 0.5, ease: "power2.inOut" }, 59.0);

  // ------------------------------------------------------------ packet copies (one per room)
  function beadPt(a) {
    return PK.polar(PRI0[0], PRI0[1], 26, a);
  }
  // a copy of the packet: ring, core and the four solid arcs with the gap at the top (no facets)
  function solidCopy() {
    var g = PK.g(Lcs, { class: "pk-case" });
    var body = PK.g(g);
    var arcsG = PK.g(body);
    ["fire", "evidence", "riskEng", "siteRules"].forEach(function (k) {
      var a = G.agents[k].aligned;
      PK.el("path", { d: PK.arc(0, 0, G.alignR, a - 36, a + 36), fill: "none", stroke: C.rust, "stroke-width": ARC_SW, "stroke-linecap": "butt" }, arcsG);
    });
    gsap.set(arcsG, { scale: 0.75, svgOrigin: "0 0" });
    PK.el("circle", { cx: 1.3, cy: 2.3, r: 23.4, fill: C.shadow }, body);
    PK.el("circle", { cx: 0, cy: 0, r: 22, fill: C.paper, stroke: C.rust, "stroke-width": 2.4 }, body);
    PK.el("circle", { cx: 0, cy: 0, r: 5.5, fill: C.ink }, body);
    hide(g);
    return { g: g, body: body, arcsG: arcsG };
  }
  function dashedCopy() {
    var g = PK.g(Lcs);
    var body = PK.g(g);
    ["fire", "evidence", "riskEng", "siteRules"].forEach(function (k) {
      var a = G.agents[k].aligned;
      PK.el("path", { d: PK.arc(0, 0, 30, a - 36 + 2, a + 36 - 2), fill: "none", stroke: C.rust, "stroke-width": 2.2, "stroke-dasharray": "3.4 2.4", "stroke-linecap": "butt" }, body);
    });
    PK.el("circle", { cx: 0, cy: 0, r: 22, fill: C.paper, stroke: C.rust, "stroke-width": 1.8, "stroke-dasharray": "3 2.4" }, body);
    PK.el("circle", { cx: 0, cy: 0, r: 5.5, fill: "none", stroke: C.ink, "stroke-width": 1.4, "stroke-dasharray": "1.6 1.4" }, body);
    hide(g);
    return { g: g, body: body };
  }
  // Priora sends a copy along a thread through the door; it passes the doorway small and grows inside
  function sendCopy(copy, room, to, at, dur, dashed) {
    var b = beadPt(BEAD[room]);
    var dy = DOOR[room][1] - 6;
    var d =
      "M" + f(b[0]) + " " + f(b[1]) +
      " C" + f(b[0] + 70) + " " + f(b[1] + (dy - b[1]) * 0.25) + " " + f(DOOR[room][0] - 80) + " " + f(dy) + " " + f(DOOR[room][0]) + " " + f(dy) +
      " C" + f(DOOR[room][0] + 50) + " " + f(dy) + " " + f(to[0] - 60) + " " + f(to[1]) + " " + f(to[0]) + " " + f(to[1]);
    var th = PK.el("path", { d: d, class: dashed ? "pk-thread-dash" : "pk-thread" }, Lth);
    if (dashed) {
      hide(th);
      fadeIn(th, at, 0.35, "none");
    } else {
      undrawn(th);
      draw(th, at, dur * 0.7, "power2.out");
    }
    gsap.set(copy.g, { x: b[0], y: b[1] });
    tl.set(copy.g, { opacity: 1 }, at + 0.08);
    PK.travel(tl, copy.g, d, at + 0.08, dur, "power2.inOut");
    FT(copy.body, { scale: 0.28, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: dur, ease: "power4.in" }, at + 0.08);
    pulse(P.body, at, 1.08);
    PK.sfx("packet", at + 0.05, { gain_db: -9, pan: 0.5 });
    PK.sfx("arrive", at + 0.08 + dur, { gain_db: -10, size: "case", pan: 0.6 });
    return th;
  }
  // the owner's line runs along its branch; the door opens for it alone
  function ownerOpens(room, at, dur) {
    draw(own[room], at, dur, "power2.inOut");
    RM[room].open(tl, at + dur * 0.78, 0.35);
    PK.sfx("decision", at, { gain_db: -4, dur: dur, pan: 0.5 });
    PK.sfx("door-open", at + dur * 0.78, { gain_db: -6, pan: 0.6 });
  }
  function ownerWithdraws(room, at, closeAt) {
    undraw(own[room], at, 0.4, "power2.inOut", "start");
    RM[room].close(tl, closeAt, 0.35);
    PK.sfx("door-close", closeAt, { gain_db: -7, pan: 0.6 });
  }

  // ============================================================ RETAIN (59.2 to 65.8)
  var SR = px(61.0, 19); // status labels
  var TS = px(64.0, 19); // tags
  RA.retain.forEach(function (a) {
    fadeIn(a.name, 59.95, 0.4);
  });
  // "Retain is never a default": an agent pushes the closed door from inside
  var tPush = PK.word("L10", "never") - 0.2; // 59.98
  var doorR = DOOR.retain;
  var contact = [doorR[0] + 11, doorR[1] + 4];
  FT(policy.g, { x: policy.p[0], y: policy.p[1] }, { x: contact[0], y: contact[1], duration: 0.36, ease: "power2.in" }, tPush);
  RM.retain.reject(tl, tPush + 0.36);
  FT(policy.g, { x: contact[0], y: contact[1] }, { x: contact[0] + 6, y: contact[1] + 1.5, duration: 0.18, ease: "power2.out" }, tPush + 0.36);
  FT(policy.g, { x: contact[0] + 6, y: contact[1] + 1.5 }, { x: policy.p[0], y: policy.p[1], duration: 0.5, ease: "power2.inOut" }, tPush + 0.85);
  FT(policy.body, { rotation: 0, svgOrigin: "0 0" }, { keyframes: [{ rotation: -6, duration: 0.08 }, { rotation: 3, duration: 0.1 }, { rotation: 0, duration: 0.14 }], svgOrigin: "0 0" }, tPush + 0.36);
  PK.sfx("move", tPush, { gain_db: -14, dur: 0.36, pan: 0.2 });
  PK.sfx("reject", tPush + 0.36, { gain_db: -4, pan: 0.1 });
  var lab1 = hide(mono(Llb, "An agent cannot choose it", 1340, 302, SR));
  FT(lab1, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, tPush + 0.42);
  fadeOut(lab1, 61.28, 0.22);

  // then a dashed timer runs out around the door, and the door still stays shut
  var timer = hide(PK.g(Llb));
  var NT = 20,
    dashes = [];
  for (var i = 0; i < NT; i++) {
    var a0 = -90 + i * (360 / NT) + 2.5;
    dashes.push(PK.el("path", { d: PK.arc(doorR[0], doorR[1], 31, a0, a0 + 360 / NT - 7), fill: "none", stroke: C.ink2, "stroke-width": 1.5, "stroke-linecap": "butt" }, timer));
  }
  var tTimer = 60.95;
  fadeIn(timer, tTimer, 0.18, "none");
  dashes.forEach(function (d, i) {
    FT(d, { opacity: 1 }, { opacity: 0, duration: 0.06, ease: "none" }, tTimer + 0.2 + i * 0.033);
  });
  tl.set(timer, { opacity: 0 }, tTimer + 0.2 + NT * 0.033 + 0.06);
  PK.sfx("request", tTimer + 0.2, { gain_db: -12, dur: NT * 0.033, pan: 0.15, variant: "timer" });
  var lab2 = hide(mono(Llb, "Silence does not choose it", 1340, 302, SR));
  FT(lab2, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, 61.52);
  fadeOut(lab2, 62.45, 0.3);

  // "Risk is kept on purpose": the risk owner's line opens it
  var tOpenR = PK.word("L10", "risk") + 0.08; // 61.82
  ownerOpens("retain", tOpenR, 0.55);
  var copyR = solidCopy();
  var thR = sendCopy(copyR, "retain", CR, tOpenR + 0.5, 0.62);
  // a clamp spans the gap: the gap is kept, on purpose
  var CL0 = 32.2,
    CL1 = 40.5;
  var clamp = PK.el(
    "path",
    {
      d: "M" + f(PK.polar(0, 0, CL0, 234)[0]) + " " + f(PK.polar(0, 0, CL0, 234)[1]) + " L" + f(PK.polar(0, 0, CL1, 234)[0]) + " " + f(PK.polar(0, 0, CL1, 234)[1]) +
        " " + PK.arc(0, 0, CL1, 234, 306).replace(/^M[^A]+/, "") +
        " L" + f(PK.polar(0, 0, CL0, 306)[0]) + " " + f(PK.polar(0, 0, CL0, 306)[1]),
      fill: "none", stroke: C.rust, "stroke-width": 2.2, "stroke-linecap": "round", "stroke-linejoin": "round",
    },
    copyR.body,
  );
  undrawn(clamp);
  var tClamp = PK.word("L10", "purpose") + 0.5; // the copy lands open (about 63.0); the clamp follows "purpose"
  draw(clamp, tClamp, 0.42, "power2.out", "middle");
  pulse(copyR.body, tClamp + 0.38, 1.04);
  PK.sfx("lock", tClamp + 0.3, { gain_db: -6, pan: 0.5 });
  // the room's agents hang its terms on the clamp: a short spine rises from it and four tags
  // land on either side of it, each brought by the agent that owns that term
  var apex = [CR[0], CR[1] - CL1];
  var spineTop = apex[1] - 45;
  var spine = undrawn(PK.el("path", { d: "M" + f(apex[0]) + " " + f(apex[1]) + " V" + f(spineTop), fill: "none", stroke: C.rust, "stroke-width": 1.2, "stroke-linecap": "round" }, Llb));
  var knot = hide(PK.el("circle", { cx: apex[0], cy: spineTop, r: 1.7, fill: C.rust }, Llb));
  var tSpine = PK.word("L10", "exposure") - 0.3;
  draw(spine, tSpine, 0.3, "power2.out");
  fadeIn(knot, tSpine + 0.25, 0.15, "none");
  var ROW1 = spineTop + 9,
    ROW2 = ROW1 + TS * 2.9;
  var TAGS_R = [
    { text: "Exposure", by: policy, at: PK.word("L10", "exposure") - 0.08, side: -1, y: ROW1 },
    { text: "Authority", by: authority, at: PK.word("L10", "authority") - 0.08, side: 1, y: ROW1 },
    { text: "Conditions", by: policy, at: 64.66, side: -1, y: ROW2 },
    { text: "Expiry", by: record, at: 64.9, side: 1, y: ROW2 },
  ];
  var tagsR = [spine, knot];
  TAGS_R.forEach(function (T) {
    var w = monoW(T.text, TS) + TS * 1.3,
      h = TS * 1.95;
    var cx = apex[0] + T.side * (4.5 + w / 2);
    var hd = holder(Llb),
      g = hd.g;
    PK.el("path", { d: "M" + f(-T.side * (w / 2)) + " 0 h" + f(-T.side * 4.5), fill: "none", stroke: C.rust, "stroke-width": 1.2 }, hd.s);
    PK.el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 2, fill: C.paper, stroke: C.rust, "stroke-width": 0.9 }, hd.s);
    mono(hd.s, T.text, 0, TS * 0.36, TS, { anchor: "middle" });
    place(g, T.by.p);
    hide(g);
    var path = PK.curve(T.by.p, [cx, T.y], T.by === policy ? 34 : -28);
    tl.set(g, { opacity: 1 }, T.at);
    PK.travel(tl, g, path, T.at, 0.48, "power2.inOut");
    FT(hd.s, { scale: 0.3, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.48, ease: "power2.out" }, T.at);
    pulse(T.by.body, T.at - 0.06, 1.15);
    PK.sfx("record", T.at + 0.45, { gain_db: -9, pan: 0.5 });
    tagsR.push(g);
  });
  // the line withdraws, the door closes; the room is ready again as the camera leaves
  ownerWithdraws("retain", 65.28, 65.5);
  fadeOut(thR, 65.3, 0.35);
  fadeOut([copyR.g].concat(tagsR), 66.0, 0.4);
  RA.retain.forEach(function (a) {
    fadeOut(a.name, 66.0, 0.4);
  });

  // ============================================================ MITIGATE (65.8 to 71.6)
  var SM = px(69.5, 19);
  FT(P.beadG, { rotation: BEAD.retain, svgOrigin: "0 0" }, { rotation: BEAD.mitigate, svgOrigin: "0 0", duration: 0.45, ease: "power2.inOut" }, 65.95);
  var tOpenM = PK.word("L11", "mitigate") - 0.12; // 66.28
  ownerOpens("mitigate", tOpenM, 0.45);
  var copyM = solidCopy();
  var thM = sendCopy(copyM, "mitigate", CM, tOpenM + 0.42, 0.6);
  RA.mitigate.forEach(function (a) {
    fadeIn(a.name, 66.75, 0.4);
  });
  var lib = hide(mono(Llb, "Suggestions from a reviewed library", 1766, 455, SM, { fill: C.grey, anchor: "end" }));
  fadeIn(lib, 66.85, 0.4);
  // "compares safeguards": the pieces slide off the shelf onto the rail
  var tSlide = PK.word("L11", "compares") + 0.05; // 66.91
  FT(rail, { drawSVG: f(SHELF_FROM) + "% 100%" }, { drawSVG: "0% 100%", duration: 0.6, ease: "power2.out" }, tSlide);
  SG_KEYS.forEach(function (k, i) {
    var d = SG_DEF[k];
    var t = tSlide + 0.05 + (2 - i) * 0.07;
    FT(W.safeguards[k].g, { x: d.posShelf[0], y: d.posShelf[1] }, { x: d.posRail[0], y: d.posRail[1], duration: 0.62, ease: "power3.inOut" }, t);
  });
  PK.sfx("move", tSlide, { gain_db: -12, dur: 0.7, pan: 0.55, material: "wood" });
  // risk engineering turns while it measures (a quarter turn: it ends looking as it began)
  FT(eng.body, { rotation: 0, svgOrigin: "0 0" }, { rotation: 90, svgOrigin: "0 0", duration: 0.7, ease: "power2.inOut" }, tSlide);
  SG_KEYS.forEach(function (k, i) {
    var t = tSlide + 0.55 + i * 0.12;
    var sg = W.safeguards[k];
    FT(sg.info, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, t);
    draw(sg.timeArc, t + 0.15, 0.4, "power2.out");
    FT(sg.coins, { scale: 0.4, svgOrigin: f(SG_DEF[k].slot) + " " + f(ROW_COST) }, { scale: 1, svgOrigin: f(SG_DEF[k].slot) + " " + f(ROW_COST), duration: 0.35, ease: "back.out(1.6)" }, t + 0.1);
  });
  FT(legend, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, tSlide + 0.6);
  PK.sfx("print", tSlide + 0.65, { gain_db: -18, size: "small", pan: 0.55 });
  PK.sfx("compare", tSlide + 0.75, { gain_db: -14, pan: 0.55 });

  // ghost copies: a safeguard is tried in the gap as a dashed preview
  function ghost(k) {
    var d = SG_DEF[k];
    var g = PK.g(Lcs);
    PK.el("path", { d: sector(SG_R0, SG_R1, d.a0, d.a1), fill: C.rustPale, stroke: C.rust, "stroke-width": 0.9, "stroke-dasharray": "2.2 1.5", "stroke-linejoin": "round" }, g);
    place(g, d.posRail);
    hide(g);
    return g;
  }
  function tryIn(k, at, dur) {
    var d = SG_DEF[k];
    var gh = ghost(k);
    fadeIn(gh, at, 0.12, "none");
    FT(gh, { x: d.posRail[0], y: d.posRail[1] }, { x: CM[0], y: CM[1], duration: dur, ease: "power2.inOut" }, at);
    FT(W.safeguards[k].g, { y: d.posRail[1] }, { y: d.posRail[1] - 3, duration: 0.25, ease: "power2.out" }, at - 0.05);
    var r0 = k === "thermal" ? 90 : 0;
    FT(eng.body, { rotation: r0, svgOrigin: "0 0" }, { rotation: 90 - r0, svgOrigin: "0 0", duration: 0.5, ease: "power2.inOut" }, at - 0.1);
    PK.sfx("compare", at, { gain_db: -6, pan: 0.5 });
    return gh;
  }
  function tryOut(k, gh, at, dur) {
    var d = SG_DEF[k];
    FT(gh, { x: CM[0], y: CM[1] }, { x: d.posRail[0], y: d.posRail[1], duration: dur, ease: "power2.inOut" }, at);
    fadeOut(gh, at + dur - 0.12, 0.12, "none");
    FT(W.safeguards[k].g, { y: d.posRail[1] - 3 }, { y: d.posRail[1], duration: 0.25, ease: "power2.inOut" }, at + dur - 0.05);
  }
  // Thermal check: part of the gap. The rest would move on.
  var tTh = 68.02;
  var ghTh = tryIn("thermal", tTh, 0.48);
  var sliver = PK.g(Lcs);
  PK.el("path", { d: sector(SG_R0 - 0.6, SG_R1 + 0.6, 279, 306), fill: "none", stroke: C.rust, "stroke-width": 0.9, "stroke-dasharray": "1.6 1.4" }, sliver);
  place(sliver, CM);
  hide(sliver);
  fadeIn(sliver, tTh + 0.5, 0.2, "none");
  // the rest detaches and leaves the room through its door: it would move on
  // (the sliver's shape sits at about (+9, -29) from its group origin; end with it in the doorway)
  var restEnd = [DOOR.mitigate[0] - 22, DOOR.mitigate[1] + 29];
  var restD = "M" + f(CM[0]) + " " + f(CM[1]) + " C" + f(CM[0] + 8) + " " + f(CM[1] - 16) + " " + f(CM[0] - 60) + " " + f(restEnd[1] + 6) + " " + f(restEnd[0]) + " " + f(restEnd[1]);
  PK.travel(tl, sliver, restD, tTh + 0.8, 0.85, "power2.inOut");
  fadeOut(sliver, tTh + 1.4, 0.25, "none");
  PK.sfx("route", tTh + 0.8, { gain_db: -14, pan: 0.6 });
  var labP = hide(mono(Llb, "Partial: rest moves on", CM[0], 566, SM, { anchor: "middle" }));
  FT(labP, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, tTh + 0.52);
  fadeOut(labP, 69.32, 0.22);
  tryOut("thermal", ghTh, 69.12, 0.36);
  // Extend watch: all of it; the ring closes
  var tW = 69.12;
  var ghW = tryIn("watch", tW, 0.45);
  var tFull = tW + 0.45;
  pulse(copyM.body, tFull, 1.05);
  PK.sfx("lock", tFull, { gain_db: -4, pan: 0.5 });
  var labF = hide(mono(Llb, "Full", CM[0], 566, SM, { anchor: "middle" }));
  FT(labF, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, tFull + 0.08);
  // "checks whether the work is back inside": the verifier's corners land on the ring, a tick
  var tVer = PK.word("L11", "back") + 0.05; // 69.69
  FT(verifier.body, { rotation: 0, svgOrigin: "0 0" }, { rotation: 90, svgOrigin: "0 0", duration: 0.55, ease: "power2.inOut" }, tVer - 0.2);
  var cornH = holder(Lcs),
    corners = cornH.g;
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (k) {
    var c = 37,
      L = 9;
    PK.el("path", { d: "M" + f(k[0] * c) + " " + f(k[1] * c - k[1] * L) + " V" + f(k[1] * c) + " H" + f(k[0] * c - k[0] * L), fill: "none", stroke: C.rust, "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" }, cornH.s);
  });
  place(corners, CM);
  hide(corners);
  fadeIn(corners, tVer, 0.15, "none");
  FT(cornH.s, { scale: 1.45, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.42, ease: "power3.out" }, tVer);
  var tick = undrawn(PK.el("path", { d: "M" + f(CM[0] + 30) + " " + f(CM[1] + 31) + " l3.2 3.4 l6.4 -7.2", fill: "none", stroke: C.rust, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, Lcs));
  draw(tick, tVer + 0.42, 0.22, "power2.out");
  PK.sfx("inspect", tVer, { gain_db: -10, pan: 0.5 });
  PK.sfx("resolve", tVer + 0.45, { gain_db: -5, pan: 0.5 });
  var labB = hide(mono(Llb, "Back inside", CM[0], 579, SM, { anchor: "middle" }));
  FT(labB, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, tVer + 0.48);
  // previews only: the pieces go back to the rail, the gap is open again
  var tRev = 70.98;
  fadeOut([labF, labB, corners, tick], tRev, 0.3);
  tryOut("watch", ghW, tRev, 0.36);
  FT([eng.body, verifier.body], { rotation: 90, svgOrigin: "0 0" }, { rotation: 0, svgOrigin: "0 0", duration: 0.55, ease: "power2.inOut" }, tRev);
  PK.sfx("move", tRev, { gain_db: -14, dur: 0.36, pan: 0.55 });
  ownerWithdraws("mitigate", 71.02, 71.3);
  FT(copyM.body, { scale: 1, svgOrigin: "0 0" }, { scale: 0.6, svgOrigin: "0 0", duration: 0.35, ease: "power2.in" }, 71.12);
  fadeOut(copyM.g, 71.12, 0.35);
  fadeOut(thM, 71.1, 0.35);
  var putAway = [lib, legend].concat(RA.mitigate.map(function (a) { return a.name; }), SG_KEYS.map(function (k) { return W.safeguards[k].info; }));
  fadeOut(putAway, 71.42, 0.4);

  // ============================================================ TRANSFER (71.6 to 77.4)
  var ST = px(74.5, 19);
  FT(P.beadG, { rotation: BEAD.mitigate, svgOrigin: "0 0" }, { rotation: BEAD.transfer, svgOrigin: "0 0", duration: 0.45, ease: "power2.inOut" }, 71.7);
  RA.transfer.forEach(function (a) {
    fadeIn(a.name, 72.35, 0.4);
  });
  var tOpenT = PK.word("L12", "transfer") - 0.12; // 72.08
  ownerOpens("transfer", tOpenT, 0.32);
  var copyT = dashedCopy();
  var thT = sendCopy(copyT, "transfer", CT, tOpenT + 0.3, 0.62, true);
  // "simulated for now": the chip pulses, and it says so plainly
  var tSim = PK.word("L12", "simulated");
  FT(RM.transfer.chip, { scale: 1.25, svgOrigin: CHIP_O }, { keyframes: [{ scale: 1.36, duration: 0.16, ease: "power2.out" }, { scale: 1.25, duration: 0.34, ease: "power2.inOut" }], svgOrigin: CHIP_O }, tSim);
  PK.sfx("simulated", tSim, { gain_db: -4, pan: 0.6 });
  var noIns = hide(mono(Llb, "No insurer on Priora yet", 1320, 656, ST, { fill: C.grey }));
  FT(noIns, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, tSim + 0.35);
  // "outside capacity": dashed threads carry dashed copies of the gap to the hexagons
  var tAsk = PK.word("L12", "outside") - 0.05; // 74.56
  var askClip = PK.el("clipPath", { id: "s6-clip-ask", clipPathUnits: "userSpaceOnUse" }, defs);
  var askRect = PK.el("rect", { x: CT[0] + 28, y: 630, width: 0, height: 130 }, askClip);
  var askG = PK.g(Lth, { "clip-path": "url(#s6-clip-ask)" });
  var askD = HEX_Y.map(function (y) {
    return "M" + f(CT[0] + 31) + " " + CT[1] + " C" + f(CT[0] + 110) + " " + CT[1] + " " + f(HEX_X - 150) + " " + y + " " + f(HEX_X - 82) + " " + y + " L" + f(HEX_X - 13) + " " + y;
  });
  askD.forEach(function (d) {
    PK.el("path", { d: d, class: "pk-thread-dash" }, askG);
  });
  FT(askRect, { attr: { width: 0 } }, { attr: { width: HEX_X - 13 - (CT[0] + 28) + 2 }, duration: 0.55, ease: "power2.out" }, tAsk);
  askD.forEach(function (d, i) {
    var gqH = holder(Lcs),
      gq = gqH.g;
    var inner = PK.g(gqH.s, { transform: "translate(0 26)" }); // the gap's sector, recentred on the thread
    PK.el("path", { d: sector(SG_R0 - 1, SG_R1 + 1, 234, 306), fill: C.paper, stroke: C.rust, "stroke-width": 0.9, "stroke-dasharray": "1.8 1.4" }, inner);
    gsap.set(gq, { x: CT[0] + 31, y: CT[1] });
    hide(gq);
    var t = tAsk + 0.1 + i * 0.12;
    fadeIn(gq, t, 0.12, "none");
    PK.travel(tl, gq, d, t, 0.62, "power2.inOut");
    FT(gqH.s, { scale: 1, svgOrigin: "0 0" }, { scale: 0.55, svgOrigin: "0 0", duration: 0.62, ease: "power1.in" }, t);
    fadeOut(gq, t + 0.55, 0.12, "none");
    var hx = RA.transfer[i];
    FT(hx.inner, { rotation: 0, svgOrigin: "0 0" }, { rotation: 120, svgOrigin: "0 0", duration: 0.9, ease: "power2.inOut" }, t + 0.6);
    PK.sfx("request", t, { gain_db: -10, pan: 0.55 + i * 0.1 });
  });
  // "terms and a price": each answers with the same four tags, every value an empty line
  var tAns = PK.word("L12", "terms") - 0.05; // 75.82
  var TAGS_T = ["Eligibility", "Terms", "Safeguards", "Price"];
  var tagW = TAGS_T.map(function (s) {
    return monoW(s, ST) + ST * 0.9 + 16;
  });
  var gapT = 9,
    rowW = tagW.reduce(function (a, b) { return a + b; }, 0) + gapT * (TAGS_T.length - 1);
  var rowY = 744,
    tagH = ST * 1.95;
  var tx = CT[0] - rowW / 2;
  var tagsT = [];
  TAGS_T.forEach(function (s, j) {
    var w = tagW[j];
    var cx = tx + w / 2;
    tx += w + gapT;
    var hd = holder(Llb);
    PK.el("rect", { x: -w / 2, y: -tagH / 2, width: w, height: tagH, rx: 2, fill: C.paper, stroke: C.rust, "stroke-width": 0.85, "stroke-dasharray": "2.2 1.5" }, hd.s);
    mono(hd.s, s, -w / 2 + ST * 0.45, ST * 0.36, ST);
    // the value: an empty line
    PK.el("path", { d: "M" + f(w / 2 - 16 - ST * 0.3) + " " + f(ST * 0.36) + " h14", fill: "none", stroke: C.rust, "stroke-width": 0.9, "stroke-linecap": "butt" }, hd.s);
    place(hd.g, [cx, rowY]);
    hide(hd.g);
    tagsT.push(hd);
  });
  RA.transfer.forEach(function (hx, i) {
    var t = tAns + i * 0.22;
    var bd = PK.bead(Lth, 2.6, { hollow: true });
    tl.set(bd.g, { opacity: 1 }, t);
    var y = HEX_Y[i];
    var revD = "M" + f(HEX_X - 13) + " " + y + " L" + f(HEX_X - 82) + " " + y + " C" + f(HEX_X - 150) + " " + y + " " + f(CT[0] + 110) + " " + CT[1] + " " + f(CT[0] + 31) + " " + CT[1];
    gsap.set(bd.g, { x: HEX_X - 13, y: y });
    PK.travel(tl, bd.g, revD, t, 0.5, "power2.inOut");
    tl.set(bd.g, { opacity: 0 }, t + 0.5);
    pulse(hx.body, t - 0.05, 1.12);
    PK.sfx("return", t, { gain_db: -9, pan: 0.6 - i * 0.05 });
    // the first answer lays the four tags out; the next answers land on the same tags, as empty
    tagsT.forEach(function (hd, j) {
      var tj = t + 0.48 + j * 0.07;
      if (i === 0) {
        fadeIn(hd.g, tj, 0.18, "none");
        FT(hd.s, { scale: 0.6, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.3, ease: "back.out(1.4)" }, tj);
      } else {
        pulse(hd.s, tj, 1.07);
      }
    });
  });
  // the door closes, then the room's labels go
  ownerWithdraws("transfer", 76.95, 77.05);
  var trOut = [noIns, thT, copyT.g, askG].concat(tagsT.map(function (hd) { return hd.g; }), RA.transfer.map(function (a) { return a.name; }));
  fadeOut(trOut, 77.4, 0.38);

  // ============================================================ 76.8 to 78.0: Priora collects the packet
  var PRI1 = [1200, 480],
    PK1 = [1200, 528];
  var tCol = 76.85,
    colDur = 1.05;
  var colP = PK.curve(PRI0, PRI1, -26);
  var colK = PK.curve(PK0, PK1, -26);
  FT(P.beadG, { rotation: BEAD.transfer, svgOrigin: "0 0" }, { rotation: 0, svgOrigin: "0 0", duration: 0.7, ease: "power2.inOut" }, tCol + 0.2);
  PK.travel(tl, P.g, colP, tCol, colDur, "power2.inOut");
  PK.travel(tl, cs.g, colK, tCol + 0.06, colDur - 0.06, "power2.inOut");
  PK.trail(tl, W.L.trails, colP, tCol, colDur);
  PK.sfx("move", tCol, { gain_db: -10, dur: colDur, pan: 0.3 });
  PK.sfx("packet", tCol + colDur - 0.05, { gain_db: -12, pan: 0.35 });
});
