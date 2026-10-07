/*
  s6-rooms (57 to 78 s): three decision rooms (cut 3).

  The rooms open from the human's line only: the risk owner's black line runs from the
  packet loop to a branch point, fine dotted grey branches run to the three doors, and each
  chamber draws from its door as its branch arrives. Retain and Mitigate carry a plain
  DESIGN PROPOSAL tag where Transfer carries SIMULATED. When Priora lifts the packet off the
  dock the human's loop lets go (the line keeps its run from the desk to the tip); Priora
  carries the same packet to each door in frame; it goes in only through a door the black
  line holds open, and comes back out to Priora. Priora never enters a room. At the end the
  packet is back at the dock and the loop closes round it again.

  Retain (59.2 to 66.1): Priora leads the packet to the closed door; its bead touches the
  door, the door shakes and Priora recoils: AN AGENT CANNOT CHOOSE IT. A small dial runs out
  outside the door and the door stays shut: NO ANSWER DOES NOT CHOOSE IT. The black line
  (tagged RISK OWNER at its tip) holds the door open while the packet passes in; a rust bar
  bridges the gap and the room's agents attach its terms: EXPOSURE, AUTHORITY, CONDITIONS,
  EXPIRY. Kept state held; the packet comes back out.
  Mitigate (66.1 to 71.3): three safeguards from a reviewed library are objects on a shelf,
  each carrying its own measures (rust-deep discs for cost, a grey clock arc for time). On
  "compares" each lifts in turn and its measures pulse. Two dashed previews are tried in the
  gap: THERMAL CHECK: PARTIAL (the rest of the gap stays open), EXTEND WATCH: FULL (the ring
  joins), the verifier's corners land: BACK INSIDE. Nothing is applied; everything reverts.
  Transfer (71.3 to 78.0): dashed, SIMULATED, NO INSURER ON PRIORA YET. Dashed copies of the
  gap go to three dashed SIM hexagons and out through the ports; hollow dashed beads come
  back along the threads and settle round the packet near the gap with plain words on short
  leaders: ELIGIBILITY, TERMS, SAFEGUARDS, PRICE "?". Then the packet goes back to the dock.

  Contract at 57.0 (from s5): tl.set below; W.decisionD, W.decisionTip, W.gap and
  W.gapTicks are read from W (a stand-in is built only if s5 has not provided them).
  Contract at 78.0 (for s7): Priora at GEO.prioraDock, bead toward the packet; the packet at
  GEO.dock, arcsG 0.85, insurer arc hidden (gap open), gap ticks visible. W.decision drawn,
  opacity 1, its loop closed round the packet again (its d is never changed here; the open
  run used while the packet is away, W.decisionOpenS6, is hidden at 78). W.decisionTrunk
  (solid black, W.decisionTip to GEO.branch) and W.branchNode drawn; W.branches = { retain,
  mitigate, transfer } fine dotted grey from GEO.branch to the door centres. W.roomOwnerLines
  undrawn solid black lines from GEO.branch into each doorway (Retain and Mitigate enter low,
  Transfer high, so a packet can pass beside the line in a wide-open door). Rooms drawn,
  doors closed, names visible; the SIMULATED chip and W.roomTags = { retain, mitigate }
  (DESIGN PROPOSAL, ink-2) visible, all three scaled 1.22 about their right-centre so they
  stay about 19 px in the s7 shot (E fades the tags in the 83.3 pull-out). W.roomAgents =
  { retain: [policy, authority, record], mitigate: [eng, verifier], transfer: [3 carriers] }
  in place, names hidden. W.safeguards = { thermal, watch, workshop }, each { g, piece, a0,
  a1, coins, clock, name } on the shelf (piece path local to the ring centre: an annular
  sector at radius 32.2 to 35.8 world units, the packet's gap with arcsG 0.85). W.doorWide(tl,
  room, at, open) opens/closes a door wide (88 world units). No transient labels.
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
  var RK = ["retain", "mitigate", "transfer"];
  var KEYS = ["siteRules", "insurer", "fire", "riskEng", "evidence"];
  var ARC = 0.85;
  var INK2 = "#3A3936";
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
    FT(el, { opacity: 0 }, { opacity: 1, duration: dur || 0.3, ease: ease || "power2.out" }, at);
  }
  function fadeOut(el, at, dur, ease) {
    FT(el, { opacity: 1 }, { opacity: 0, duration: dur || 0.3, ease: ease || "power1.in" }, at);
  }
  function fadeTo(el, from, to, at, dur) {
    FT(el, { opacity: from }, { opacity: to, duration: dur || 0.3, ease: "power1.inOut" }, at);
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
  function move(el, p0, p1, at, dur, ease) {
    FT(el, { x: p0[0], y: p0[1] }, { x: p1[0], y: p1[1], duration: dur, ease: ease || "power2.inOut" }, at);
  }
  function pulse(el, at, s, dur) {
    var d = dur || 0.4;
    FT(el, { scale: 1, svgOrigin: "0 0" }, { keyframes: [{ scale: s || 1.08, duration: d * 0.35, ease: "power1.out" }, { scale: 1, duration: d * 0.65, ease: "power2.inOut" }], svgOrigin: "0 0" }, at);
  }
  // a positioned group (x/y on .g) with an inner group (.s) that scales about that position
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
  function ang(a, b) {
    return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  }
  function pt(p) {
    return f(p[0]) + " " + f(p[1]);
  }
  function dist(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
  // screen-constant strokes written as inline CSS (they scale with the camera like the classes)
  function dotted(el, colour, w, on, off) {
    el.setAttribute(
      "style",
      "fill:none;stroke:" + colour + ";stroke-linecap:round;stroke-width:calc(var(--sw, 1) * " + w + "px);stroke-dasharray:calc(var(--sw, 1) * " + on + "px) calc(var(--sw, 1) * " + off + "px);",
    );
    return el;
  }
  function samplePath(d, n) {
    var tmp = PK.el("path", { d: d }, W.L.routes);
    var L = tmp.getTotalLength(),
      out = [];
    for (var i = 0; i <= n; i++) {
      var q = tmp.getPointAtLength((L * i) / n);
      out.push([q.x, q.y]);
    }
    tmp.remove();
    return out;
  }

  // ------------------------------------------------------------ layers (inside the world's own stacking order)
  var defs = PK.el("defs", null, W.svg);
  var Lr = PK.g(W.L.routes);
  var Lth = PK.g(W.L.threads);
  var Ltk = PK.g(W.L.tokens);
  var Lcs = PK.g(W.L.case);
  var Llb = PK.g(W.L.labels);

  // ------------------------------------------------------------ geometry
  var DOCK = G.dock || [1228, 680],
    PDOCK = G.prioraDock || [1186, 612],
    BR = G.branch || [1276, 600];
  var DOOR = { retain: [1300, 330], mitigate: [1300, 508], transfer: [1300, 686] };
  var WIDE = 44; // a door opened wide: the leaves slide 44 units each way (88 units open)
  // Priora and the packet outside each door (Retain: Priora leads at the door, the packet behind)
  var PW = { retain: [1238, 326], mitigate: [1206, 440], transfer: PDOCK };
  var KW = { retain: [1162, 334], mitigate: [1180, 512], transfer: DOCK };
  var PASIDE = [1206, 262]; // Retain: Priora steps up out of the packet's way
  var KIN_Y = { retain: 324, mitigate: 502, transfer: 692 }; // where the packet crosses the doorway
  var LINE_Y = { retain: 368, mitigate: 546, transfer: 648 }; // where the black line holds the doorway
  var IN = { retain: [1540, 330], mitigate: [1420, 512], transfer: [1420, 696] };
  var GAP_R = G.alignR * ARC; // 34: the gap's radius at arcsG 0.85
  var SG_R0 = GAP_R - 1.8,
    SG_R1 = GAP_R + 1.8;
  var PK_R = GAP_R + 1.6; // the packet's outer radius (arcs plus stroke)
  var BEAD_DOCK = ang(PDOCK, DOCK);
  var LAB = px(64.0, 19); // 19 px mono in the room close-ups

  // ------------------------------------------------------------ the packet's arcs (only if s4/s5 are placeholders)
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

  // ============================================================ contract at 57.0 (from s5)
  if (!W.decisionTip || !W.decisionD) {
    // stand-in: the human's line from the desk to the packet, once round it, ending at its right side
    var LR0 = 42;
    var dD = "M1180 711 C1196 711 1204 " + f(DOCK[1] + LR0) + " " + pt([DOCK[0], DOCK[1] + LR0]);
    [180, 270, 360].forEach(function (a) {
      dD += " A" + LR0 + " " + LR0 + " 0 0 1 " + pt(PK.polar(DOCK[0], DOCK[1], LR0, a));
    });
    W.decisionD = dD;
    W.decisionTip = [DOCK[0] + LR0, DOCK[1]];
    tl.set(W.decision, { attr: { d: dD } }, T0);
    cs.facets.forEach(function (fc) {
      tl.set(fc.g, { rotation: fc.angle + 30, svgOrigin: "0 0" }, T0);
      tl.set(fc.mark, { attr: { transform: "rotate(-30)" } }, T0);
    });
  }
  if (!W.gapTicks) {
    var gt = [];
    [W.gap.a0, W.gap.a1].forEach(function (a) {
      var tk = PK.el("path", { d: "M" + pt(PK.polar(0, 0, G.alignR - 6, a)) + " L" + pt(PK.polar(0, 0, G.alignR + 1, a)), fill: "none", stroke: C.rustDeep, "stroke-width": 2.6, "stroke-linecap": "round" }, cs.arcsG);
      gsap.set(tk, { opacity: 0 });
      tl.set(tk, { opacity: 1 }, T0);
      gt.push(tk);
    });
    W.gapTicks = gt;
  }
  var TIP = W.decisionTip.length ? W.decisionTip : [W.decisionTip.x, W.decisionTip.y];
  var gapTicks = [].concat(W.gapTicks);
  tl.set(P.g, { x: PDOCK[0], y: PDOCK[1], opacity: 1 }, T0);
  tl.set(P.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(P.beadG, { rotation: BEAD_DOCK, svgOrigin: "0 0", opacity: 1 }, T0);
  tl.set(P.orbit, { opacity: 1 }, T0);
  tl.set(P.label, { opacity: 0 }, T0);
  tl.set(cs.g, { x: DOCK[0], y: DOCK[1], opacity: 1 }, T0);
  tl.set(cs.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(cs.arcsG, { scale: ARC, svgOrigin: "0 0" }, T0);
  KEYS.forEach(function (k) {
    tl.set(W.align.arcs[k], { opacity: k === "insurer" ? 0 : 1 }, T0);
  });
  if (W.align.insurerDashed) tl.set(W.align.insurerDashed, { opacity: 0 }, T0);
  tl.set(gapTicks, { opacity: 1 }, T0);
  if (W.caseLabel) tl.set(W.caseLabel, { opacity: 0 }, T0);
  tl.set(W.decision, { opacity: 1 }, T0);
  tl.set(W.decision, { drawSVG: "0% 100%" }, T0);
  if (W.ownerDecides) tl.set(W.ownerDecides, { opacity: 1 }, T0);
  // the rooms start hidden (world.js); make it explicit so a mismatch shows as a jump
  RK.forEach(function (k) {
    var ch = RM[k];
    if (k !== "transfer") tl.set(ch.walls, { drawSVG: "0% 0%" }, T0);
    tl.set([ch.leafA, ch.leafB], { opacity: 0, x: 0, y: 0 }, T0);
    tl.set([ch.jambs, ch.name], { opacity: 0 }, T0);
  });
  // the SIMULATED chip and the DESIGN PROPOSAL tags: type counter-scaled per shot
  var CHIP_O = "1762 630"; // right-centre of the SIMULATED chip
  var chipRect = RM.transfer.chip.firstElementChild;
  chipRect.setAttribute("vector-effect", "non-scaling-stroke");
  chipRect.setAttribute("stroke-width", "1.5");
  var SC_OVER = 1.15, // about 19 px type in the overview (zoom 1.81)
    SC_CLOSE = 0.88, // about 20 px in the room close-ups (zoom 2.53)
    SC_END = 1.22; // about 19 px in the s7 shot (zoom 1.64)
  tl.set(RM.transfer.chip, { opacity: 0, scale: SC_OVER, svgOrigin: CHIP_O }, T0);

  // ============================================================ 57.7 to 59.2: three decision rooms open, from the human's line
  if (W.ownerDecides) fadeOut(W.ownerDecides, 57.9, 0.3);
  var tThree = PK.word("L09", "three"); // 57.70
  // the trunk: from the loop's tip up to the branch point
  var trunk = (W.decisionTrunk = undrawn(
    PK.el("path", { d: "M" + pt(TIP) + " C" + f(TIP[0] + 3) + " " + f(TIP[1] - 30) + " " + f(BR[0]) + " " + f(BR[1] + 34) + " " + pt(BR), class: "pk-decision" }, Lr),
  ));
  var tTrunk = tThree + 0.05;
  draw(trunk, tTrunk, 0.25, "power2.out");
  var bNode = (W.branchNode = hide(PK.el("circle", { cx: BR[0], cy: BR[1], r: 3, fill: C.ink }, Lr)));
  fadeIn(bNode, tTrunk + 0.2, 0.12, "none");
  PK.sfx("decision", tTrunk + 0.25, { gain_db: -7, pan: 0.3, part: "reach" });
  // fine dotted grey branches to the door centres (revealed by a clip that grows from the branch point)
  var BR_D = {
    retain: "M" + pt(BR) + " V352 Q" + f(BR[0]) + " 330 " + f(BR[0] + 22) + " 330 H1300",
    mitigate: "M" + pt(BR) + " V530 Q" + f(BR[0]) + " 508 " + f(BR[0] + 22) + " 508 H1300",
    transfer: "M" + pt(BR) + " C" + f(BR[0] + 14) + " " + f(BR[1] + 2) + " " + f(BR[0] + 16) + " " + f(BR[1] + 16) + " " + f(BR[0] + 16) + " " + f(BR[1] + 32) + " L" + f(BR[0] + 16) + " 672 Q" + f(BR[0] + 16) + " 686 1300 686",
  };
  var brClip = PK.el("clipPath", { id: "s6-clip-branches", clipPathUnits: "userSpaceOnUse" }, defs);
  var brCirc = PK.el("circle", { cx: BR[0], cy: BR[1], r: 0 }, brClip);
  var brG = PK.g(Lr, { "clip-path": "url(#s6-clip-branches)" });
  W.branches = {};
  RK.forEach(function (k) {
    W.branches[k] = dotted(PK.el("path", { d: BR_D[k] }, brG), C.grey, 2, 0.1, 4.6);
  });
  var tBr = tTrunk + 0.25; // 58.0
  FT(brCirc, { attr: { r: 0 } }, { attr: { r: 300 }, duration: 0.22, ease: "none" }, tBr);
  // the solid lines that open each door: from the branch point into the doorway, low for Retain and
  // Mitigate (their branches come from below) and high for Transfer, leaving room for the packet
  var OWN_D = {
    retain: "M" + pt(BR) + " V" + f(LINE_Y.retain + 22) + " Q" + f(BR[0]) + " " + LINE_Y.retain + " " + f(BR[0] + 22) + " " + LINE_Y.retain + " H1312",
    mitigate: "M" + pt(BR) + " V" + f(LINE_Y.mitigate + 22) + " Q" + f(BR[0]) + " " + LINE_Y.mitigate + " " + f(BR[0] + 22) + " " + LINE_Y.mitigate + " H1312",
    transfer: "M" + pt(BR) + " C" + f(BR[0] + 14) + " " + f(BR[1] + 2) + " " + f(BR[0] + 16) + " " + f(BR[1] + 12) + " " + f(BR[0] + 16) + " " + f(BR[1] + 26) + " L" + f(BR[0] + 16) + " " + f(LINE_Y.transfer - 14) + " Q" + f(BR[0] + 16) + " " + LINE_Y.transfer + " " + f(BR[0] + 30) + " " + LINE_Y.transfer + " H1312",
  };
  var own = {};
  RK.forEach(function (k) {
    own[k] = undrawn(PK.el("path", { d: OWN_D[k], class: "pk-decision" }, Lth)); // above the walls it passes through
    var tmp = PK.el("path", { d: OWN_D[k] }, W.L.routes);
    own[k].pkWall = (100 * (tmp.getTotalLength() - 14)) / tmp.getTotalLength(); // percent of the run up to the wall
    tmp.remove();
  });
  W.roomOwnerLines = own;
  // each chamber draws from its door as its branch arrives
  var arrive = function (k) {
    return tBr + (0.22 * dist(DOOR[k], BR)) / 300;
  };
  var tCh = { retain: arrive("retain") - 0.03, mitigate: arrive("mitigate") - 0.02, transfer: arrive("transfer") - 0.02 };
  draw(RM.retain.walls, tCh.retain, 0.45, "power2.out");
  draw(RM.mitigate.walls, tCh.mitigate, 0.45, "power2.out");
  // Transfer is dashed (simulated): never DrawSVG it. Clear the hidden dash that world.js left inline,
  // and reveal it with a static clip whose circle grows from its door (r 0 before, 520 after).
  var trClip = PK.el("clipPath", { id: "s6-clip-transfer", clipPathUnits: "userSpaceOnUse" }, defs);
  var trCirc = PK.el("circle", { cx: DOOR.transfer[0], cy: DOOR.transfer[1], r: 0 }, trClip);
  RM.transfer.walls.setAttribute("clip-path", "url(#s6-clip-transfer)");
  tl.set(RM.transfer.walls, { attr: { style: "" } }, tCh.transfer);
  FT(trCirc, { attr: { r: 0 } }, { attr: { r: 520 }, duration: 0.45, ease: "power2.out" }, tCh.transfer);
  RK.forEach(function (k) {
    fadeIn([RM[k].leafA, RM[k].leafB, RM[k].jambs], tCh[k] + 0.3, 0.15);
  });
  PK.sfx("thread", tCh.mitigate, { gain_db: -12, dur: 0.6, pan: 0.5, material: "pencil" });
  // SIMULATED appears with the dashed walls, DESIGN PROPOSAL with the other two; then the names
  fadeIn(RM.transfer.chip, tCh.transfer, 0.2);
  PK.sfx("simulated", tCh.transfer + 0.2, { gain_db: -10, pan: 0.6 });
  W.roomTags = {};
  ["retain", "mitigate"].forEach(function (k) {
    var r = G.rooms[k];
    var cy = r.y + 24;
    var tag = PK.g(Llb);
    PK.text(tag, "Design proposal", 1762, cy + 9.5 * 0.36, { font: "mono", size: 9.5, fill: INK2, anchor: "end", weight: 500 });
    gsap.set(tag, { opacity: 0 });
    tl.set(tag, { scale: SC_OVER, svgOrigin: "1762 " + cy }, T0);
    fadeIn(tag, tCh[k] + 0.15, 0.25);
    tag.pkOrigin = "1762 " + cy;
    W.roomTags[k] = tag;
  });
  FT(RM.retain.name, { opacity: 0, x: -4 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }, tCh.retain + 0.3);
  FT(RM.mitigate.name, { opacity: 0, x: -4 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }, tCh.mitigate + 0.3);
  FT(RM.transfer.name, { opacity: 0, x: -4 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }, tCh.transfer + 0.25);
  // the chip and the tags step to close-up size while the camera moves away, and back for s7
  var scaled = [RM.transfer.chip, W.roomTags.retain, W.roomTags.mitigate];
  var origins = [CHIP_O, W.roomTags.retain.pkOrigin, W.roomTags.mitigate.pkOrigin];
  scaled.forEach(function (el, i) {
    FT(el, { scale: SC_OVER, svgOrigin: origins[i] }, { scale: SC_CLOSE, svgOrigin: origins[i], duration: 0.6, ease: "power2.inOut" }, 59.35);
    if (i > 0) FT(el, { scale: SC_CLOSE, svgOrigin: origins[i] }, { scale: SC_END, svgOrigin: origins[i], duration: 0.14, ease: "power2.inOut" }, 77.86);
  });

  // ------------------------------------------------------------ the rooms' own agents
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
  var NS = px(62.0, 22);
  var policy = agentAt(function () { return PK.glyph.roomAgent(Ltk, "policy", 18); }, [1390, 380], "Policy", [0, 12 + NS * 0.78], "middle", NS);
  var authority = agentAt(function () { return PK.glyph.roomAgent(Ltk, "authority", 18); }, [1690, 300], "Authority", [15, NS * 0.36], "start", NS);
  var record = agentAt(function () { return PK.glyph.roomAgent(Ltk, "record", 18); }, [1690, 366], "Record", [15, NS * 0.36], "start", NS);
  RA.retain = [policy, authority, record];
  var eng = agentAt(function () { return PK.glyph.roomAgent(Ltk, "eng", 18); }, [1560, 560], "Risk engineering", [16, NS * 0.36], "start", NS);
  var verifier = agentAt(function () { return PK.glyph.roomAgent(Ltk, "eng", 18); }, [1700, 560], "Verifier", [16, NS * 0.36], "start", NS);
  RA.mitigate = [eng, verifier];
  // Transfer: three dashed carrier hexagons at full token size, near the right wall
  var HEX_X = 1738,
    HEX_Y = [660, 702, 744],
    HEX_S = 34,
    HEX_R = HEX_S / 2;
  var hexNames = ["Carrier · sim", "Carrier · sim", "Capacity · sim"];
  HEX_Y.forEach(function (y, i) {
    var h = agentAt(function () { return PK.glyph.carrier(Ltk, HEX_S); }, [HEX_X, y], null);
    h.hex.setAttribute("style", "stroke-width:calc(var(--sw, 1) * 1.75px);");
    h.name = mono(Llb, hexNames[i], HEX_X - HEX_R - 4, y - 6, LAB, { anchor: "end" });
    hide(h.name);
    RA.transfer.push(h);
  });
  W.roomAgents = RA;
  var tPrint = 58.3;
  RA.retain.concat(RA.mitigate).forEach(function (a, i) {
    var t = tPrint + i * 0.05;
    fadeIn(a.g, t, 0.2, "none");
    FT(a.body, { scale: 0.6, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.3, ease: "back.out(1.4)" }, t);
  });
  RA.transfer.forEach(function (a, i) {
    fadeIn(a.g, tPrint + 0.1 + i * 0.05, 0.2, "none");
  });
  // the Transfer room's ports: openings in its right wall that lead outside (grey ticks, dashed rust way out)
  var ports = hide(PK.g(Lth));
  HEX_Y.forEach(function (y) {
    PK.el("path", { d: "M" + f(HEX_X + HEX_R) + " " + y + " H1806", fill: "none", stroke: C.rust, "stroke-width": 1, "stroke-dasharray": "2.4 2.2", "stroke-linecap": "butt" }, ports);
    PK.el("circle", { cx: 1812, cy: y, r: 3.6, fill: C.paper, stroke: C.rust, "stroke-width": 1, "stroke-dasharray": "1.8 1.6" }, ports);
    PK.el("path", { d: "M1775 " + (y - 6) + " H1785 M1775 " + (y + 6) + " H1785", fill: "none", stroke: C.grey, "stroke-width": 1.2, "stroke-linecap": "round" }, ports);
  });
  fadeIn(ports, tPrint + 0.15, 0.2, "none");

  // ------------------------------------------------------------ Mitigate: a shelf of safeguards, each an object carrying its own measures
  var SHELF_Y = 500;
  var shelf = undrawn(PK.el("path", { d: "M1528 " + SHELF_Y + " H1770", fill: "none", stroke: C.grey, "stroke-width": 1, "stroke-linecap": "round" }, Lr));
  draw(shelf, tPrint, 0.3, "power2.out", "end");
  var SG_DEF = {
    thermal: { name: ["Thermal check"], label: "Thermal check: partial", a0: 234, a1: 277, coins: 1, time: 0.25, x: 1574 },
    watch: { name: ["Extend watch", "to 60 min"], label: "Extend watch: full", a0: 234, a1: 306, coins: 2, time: 0.5, x: 1652 },
    workshop: { name: ["Move weld", "to workshop"], a0: 234, a1: 306, coins: 3, time: 0.85, x: 1730 },
  };
  var SG_KEYS = ["thermal", "watch", "workshop"];
  var SG_Y = SHELF_Y + SG_R0 * Math.sin((54 * Math.PI) / 180) + 0.6; // the sector's lowest corners rest on the shelf
  W.safeguards = {};
  SG_KEYS.forEach(function (k, i) {
    var d = SG_DEF[k];
    var xa = PK.polar(0, 0, SG_R1, d.a0)[0],
      xb = PK.polar(0, 0, SG_R1, d.a1)[0];
    d.pos = [d.x - (xa + xb) / 2, SG_Y];
    var g = PK.g(Ltk, { class: "pk-token" });
    var shape = sector(SG_R0, SG_R1, d.a0, d.a1);
    PK.el("path", { d: shape, fill: C.shadow, transform: "translate(1 1.8)" }, g);
    var piece = PK.el("path", { d: shape, fill: C.rust }, g);
    // cost: a small stack of rust-deep discs sitting on the piece's highest point (ring x 0, y -SG_R1)
    var coins = PK.g(g);
    for (var c = 0; c < d.coins; c++) {
      var cy = -SG_R1 - 2.6 - c * 3.5;
      PK.el("ellipse", { cx: 0, cy: cy + 0.9, rx: 5.7, ry: 2.1, fill: C.rustDeep }, coins);
      PK.el("ellipse", { cx: 0, cy: cy, rx: 5.7, ry: 2.1, fill: C.rustDeep, stroke: C.paper, "stroke-width": 0.5 }, coins);
    }
    d.coinsO = "0 " + f(-SG_R1 - 2);
    // time: a small grey clock arc beside the piece
    var clock = PK.g(g, { transform: "translate(" + f((xa + xb) / 2 + 30) + " " + f(-SG_R1 + 4) + ")" });
    var clockIn = PK.g(clock);
    PK.el("circle", { cx: 0, cy: 0, r: 6.2, fill: C.paper, stroke: C.grey, "stroke-width": 0.9 }, clockIn);
    PK.el("path", { d: PK.arc(0, 0, 6.2, -90, -90 + 360 * d.time), fill: "none", stroke: C.grey, "stroke-width": 2.2, "stroke-linecap": "butt" }, clockIn);
    PK.el("path", { d: "M0 0 L" + pt(PK.polar(0, 0, 4.2, -90 + 360 * d.time)), fill: "none", stroke: C.grey, "stroke-width": 0.9, "stroke-linecap": "round" }, clockIn);
    place(g, d.pos);
    hide(g);
    fadeIn(g, tPrint + 0.1 + i * 0.06, 0.2, "none");
    var name = hide(PK.g(Llb));
    d.name.forEach(function (line, j) {
      sans(name, line, d.x, SHELF_Y + 15 + j * NS * 1.15, NS, { anchor: "middle" });
    });
    W.safeguards[k] = { g: g, piece: piece, a0: d.a0, a1: d.a1, coins: coins, clock: clock, clockIn: clockIn, name: name };
  });

  // ------------------------------------------------------------ the human's loop at the dock lets go while the packet is away
  // (the same open run E builds at 79.07: the line keeps its run from the desk to the tip, without the loop)
  var openRun = null,
    loopStart = 0.5;
  try {
    var dp = samplePath(W.decisionD, 240);
    var near = [];
    dp.forEach(function (p, i) {
      if (dist(p, DOCK) < 55) near.push(i);
    });
    if (near.length > 40) {
      var i1 = near[0],
        i2 = near[near.length - 1];
      var nd = "M" + pt(dp[0]);
      for (var j = 2; j <= i1; j += 2) nd += " L" + pt(dp[j]);
      nd += " L" + pt(dp[i2]);
      for (var j2 = i2 + 2; j2 < dp.length; j2 += 2) nd += " L" + pt(dp[j2]);
      nd += " L" + pt(dp[dp.length - 1]);
      openRun = PK.el("path", { d: nd, class: "pk-decision" }, W.L.routes);
      W.L.routes.insertBefore(openRun, W.decision);
      gsap.set(openRun, { opacity: 0 });
      loopStart = i1 / 240;
      W.decisionOpenS6 = openRun;
    }
  } catch (e) {}
  function loopLetsGo(at) {
    if (!openRun) return;
    tl.set(openRun, { opacity: 1 }, at);
    FT(W.decision, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.inOut" }, at + 0.04);
  }
  function loopCloses(at, dur) {
    if (!openRun) return;
    tl.set(W.decision, { opacity: 1 }, at);
    FT(W.decision, { drawSVG: "0% " + f(loopStart * 100) + "%" }, { drawSVG: "0% 100%", duration: dur, ease: "power2.inOut" }, at);
    FT(openRun, { opacity: 1 }, { opacity: 0, duration: dur, ease: "power1.in" }, at);
    PK.sfx("decision", at, { gain_db: -10, dur: dur, pan: 0.2, part: "loop" });
  }

  // ------------------------------------------------------------ Priora, the packet and the doors: shared moves
  var beadNow = BEAD_DOCK;
  function turnBead(to, at, dur) {
    FT(P.beadG, { rotation: beadNow, svgOrigin: "0 0" }, { rotation: to, svgOrigin: "0 0", duration: dur || 0.45, ease: "power2.inOut" }, at);
    beadNow = to;
  }
  var where = { p: PDOCK, k: DOCK };
  // Priora and the packet travel outside the rooms, each on its own path (trails behind both)
  function fly(pTo, kTo, at, dur, bendP, bendK, lagK) {
    var dP = PK.curve(where.p, pTo, bendP || 0),
      dK = PK.curve(where.k, kTo, bendK || 0);
    var lk = lagK || 0;
    PK.travel(tl, P.g, dP, at, dur, "power2.inOut");
    PK.travel(tl, cs.g, dK, at + lk, dur - lk, "power2.inOut");
    if (dist(where.p, pTo) > 150) PK.trail(tl, W.L.trails, dP, at, dur, "power2.inOut");
    if (dist(where.k, kTo) > 150) PK.trail(tl, W.L.trails, dK, at + lk, dur - lk, "power2.inOut");
    PK.sfx("arrive", at + dur, { gain_db: -12, size: "case", pan: 0.35 });
    where = { p: pTo, k: kTo };
  }
  // a door opened wide: the leaves slide 44 units, and a paper knockout clears the wall between them
  var knock = {};
  RK.forEach(function (k) {
    var d = DOOR[k];
    var kn = PK.el("path", { d: "M" + d[0] + " " + (d[1] - WIDE) + " V" + (d[1] + WIDE), fill: "none", stroke: C.paperGround, "stroke-width": 2.6, "stroke-linecap": "butt" }, RM[k].g);
    RM[k].g.insertBefore(kn, RM[k].leafA);
    undrawn(kn);
    knock[k] = kn;
  });
  function doorWide(tl2, room, at, open, dur) {
    var ch = RM[room],
      D = dur || 0.3;
    var a0 = open ? 0 : -WIDE + 0.01,
      a1 = open ? -WIDE + 0.01 : 0;
    tl2.fromTo(ch.leafA, { y: a0 }, { y: a1, duration: D, ease: "power2.inOut", immediateRender: false }, at);
    tl2.fromTo(ch.leafB, { y: -a0 }, { y: -a1, duration: D, ease: "power2.inOut", immediateRender: false }, at);
    tl2.fromTo(knock[room], { drawSVG: open ? "50% 50%" : "0% 100%" }, { drawSVG: open ? "0% 100%" : "50% 50%", duration: D, ease: "power2.inOut", immediateRender: false }, at);
    tl2.fromTo(ch.jambs, { opacity: open ? 1 : 0 }, { opacity: open ? 0 : 1, duration: D * 0.5, ease: "none", immediateRender: false }, open ? at : at + D * 0.5);
  }
  W.doorWide = doorWide;
  function door(room, at, open, dur) {
    var D = dur || 0.3;
    doorWide(tl, room, at, open, D);
    PK.sfx(open ? "door-open" : "door-close", at + (open ? 0.05 : D - 0.05), { gain_db: -8, pan: 0.6 });
  }
  // the packet passes through the wide-open door at full size, 0.5 s, with its trail
  function packetIn(room, at) {
    var d = DOOR[room],
      w = where.k,
      inP = IN[room],
      y = KIN_Y[room];
    var path = "M" + pt(w) + " C" + f(w[0] + 50) + " " + f(w[1]) + " " + f(d[0] - 60) + " " + f(y) + " " + f(d[0]) + " " + f(y) + " C" + f(d[0] + 70) + " " + f(y) + " " + f(inP[0] - 80) + " " + f(inP[1]) + " " + pt(inP);
    PK.travel(tl, cs.g, path, at, 0.5, "power3.out");
    PK.trail(tl, W.L.trails, path, at, 0.5, "power3.out");
    PK.sfx("packet", at + 0.5, { gain_db: -9, pan: 0.6 });
  }
  function packetOut(room, at, to) {
    var d = DOOR[room],
      inP = IN[room],
      y = KIN_Y[room];
    var path = "M" + pt(inP) + " C" + f(inP[0] - 80) + " " + f(inP[1]) + " " + f(d[0] + 70) + " " + f(y) + " " + f(d[0]) + " " + f(y) + " C" + f(d[0] - 60) + " " + f(y) + " " + f(to[0] + 50) + " " + f(to[1]) + " " + pt(to);
    PK.travel(tl, cs.g, path, at, 0.5, "power2.inOut");
    PK.trail(tl, W.L.trails, path, at, 0.5, "power2.inOut");
    PK.sfx("return", at + 0.5, { gain_db: -10, pan: 0.45 });
    where.k = to;
  }
  // the risk owner's line runs along its branch into the doorway and holds the door open
  // it reaches the wall, the door slides open wide for it, and it enters the doorway (the door opens at tArr)
  function ownerHolds(room, at, dur, hold, tag) {
    var wallPc = f(own[room].pkWall) + "%";
    FT(own[room], { drawSVG: "0% 0%" }, { drawSVG: "0% " + wallPc, duration: dur, ease: "power2.inOut" }, at);
    var tArr = at + dur;
    FT(own[room], { drawSVG: "0% " + wallPc }, { drawSVG: "0% 100%", duration: 0.14, ease: "power2.out" }, tArr + 0.18);
    door(room, tArr, true);
    PK.sfx("decision", tArr, { gain_db: -4, pan: 0.5, part: "door" });
    if (tag) {
      // the tag rides the tip into the doorway and goes back out with it
      var tip = [1312, LINE_Y[room]];
      var tg = PK.g(Llb);
      mono(tg, "Risk owner", 0, LAB * 0.36, LAB, { fill: C.ink });
      place(tg, [tip[0] + 6 - 26, tip[1]]);
      hide(tg);
      FT(tg, { x: tip[0] + 6 - 14 }, { x: tip[0] + 6, duration: 0.14, ease: "power2.out" }, tArr + 0.18);
      fadeIn(tg, tArr + 0.18, 0.12, "none");
      FT(tg, { x: tip[0] + 6 }, { x: tip[0] + 6 - 22, duration: 0.18, ease: "power2.in" }, tArr + hold);
      fadeOut(tg, tArr + hold, 0.16, "none");
    }
    undraw(own[room], tArr + hold, 0.3, "power2.in", "start");
    return tArr;
  }
  // a little bead from an agent to a place (information in transit)
  function beadTo(from, to, at, dur, o) {
    var b = PK.bead(Llb, (o && o.r) || 2.4, o);
    place(b.g, from);
    tl.set(b.g, { opacity: 1 }, at);
    PK.travel(tl, b.g, PK.curve(from, to, (o && o.bend) || 14), at, dur, "power2.inOut");
    tl.set(b.g, { opacity: 0 }, at + dur);
    return b;
  }

  // ============================================================ RETAIN (camera 59.2 to 60.2)
  // the loop lets go as Priora lifts the packet off the dock; Priora leads, the packet follows
  var tLift = 59.6;
  loopLetsGo(tLift);
  turnBead(0, tLift + 0.2, 0.5);
  fly(PW.retain, KW.retain, tLift, 0.9, 34, -70, 0.12); // lands 60.5
  RA.retain.forEach(function (a) {
    fadeIn(a.name, 60.2, 0.3);
  });
  // "Retain is never a default": Priora leads the packet to the closed door; its bead touches it
  var tGo = 60.75,
    tHit = 60.95;
  var NUDGE = DOOR.retain[0] - 3.6 - 26 - PW.retain[0]; // the bead (orbit 26, bead 3.4) to the door
  var pR = PW.retain,
    kR = KW.retain;
  var pHit = [pR[0] + NUDGE, pR[1]],
    kHit = [kR[0] + NUDGE, kR[1]];
  move(P.g, pR, pHit, tGo, tHit - tGo, "power2.in");
  move(cs.g, kR, kHit, tGo, tHit - tGo, "power2.in");
  [RM.retain.leafA, RM.retain.leafB].forEach(function (lf) {
    var kf = [];
    for (var c = 0; c < 3; c++) kf.push({ x: 2.5, duration: 0.05, ease: "none" }, { x: -2.5, duration: 0.05, ease: "none" });
    kf.push({ x: 0, duration: 0.02, ease: "none" });
    FT(lf, { x: 0 }, { keyframes: kf }, tHit);
  });
  var pBack = [pHit[0] - 14, pHit[1]],
    kBack = [kHit[0] - 14, kHit[1]];
  move(P.g, pHit, pBack, tHit + 0.05, 0.35, "back.out(1.4)");
  move(cs.g, kHit, kBack, tHit + 0.05, 0.35, "back.out(1.4)");
  PK.sfx("reject", tHit, { gain_db: -3, pan: 0.35 });
  var LX = 1268,
    LY = 422; // the captions sit outside the door, under Priora and the packet, left of the branch
  var lab1 = hide(mono(Llb, "An agent cannot choose it", LX, LY, LAB, { fill: INK2, anchor: "end" }));
  FT(lab1, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, tHit);
  fadeOut(lab1, 62.1, 0.12);
  // then no answer: a small dial outside the door, above the branch, runs out; the door stays shut
  var DIAL = [1282, 284],
    DR = 7.9;
  var dial = hide(PK.g(Llb));
  PK.el("circle", { cx: DIAL[0], cy: DIAL[1], r: DR, fill: C.paper, stroke: C.grey, "stroke-width": 1 }, dial);
  var dialRun = PK.el("path", { d: PK.arc(DIAL[0], DIAL[1], DR * 0.5, -90, 269.5), fill: "none", stroke: C.grey, "stroke-width": DR, "stroke-linecap": "butt" }, dial);
  fadeIn(dial, 61.9, 0.1, "none");
  FT(dialRun, { drawSVG: "0% 100%" }, { drawSVG: "100% 100%", duration: 0.75, ease: "none" }, 62.0);
  fadeOut(dial, 62.8, 0.2, "none");
  PK.sfx("request", 62.0, { gain_db: -14, dur: 0.75, pan: 0.3, variant: "timer" });
  var lab2 = hide(PK.g(Llb));
  mono(lab2, "No answer", LX, LY - LAB * 1.45, LAB, { fill: INK2, anchor: "end" });
  mono(lab2, "does not choose it", LX, LY, LAB, { fill: INK2, anchor: "end" });
  FT(lab2, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, 62.2);
  fadeOut(lab2, 63.45, 0.15);
  // the pair settles back off the door, clear of the black line's way
  // "Risk is kept on purpose": the risk owner's line holds the door open; the packet passes in beside it
  var tRisk = PK.word("L10b", "risk"); // 62.60
  var tArrR = ownerHolds("retain", tRisk, 0.35, 1.0, true); // at the door 62.95, holds the doorway to 63.95
  move(P.g, pBack, PASIDE, tArrR - 0.05, 0.4, "power2.inOut"); // Priora steps up out of the packet's way
  turnBead(ang(PASIDE, DOOR.retain), tArrR - 0.05, 0.4);
  where = { p: PASIDE, k: kBack };
  var tInR = tArrR + 0.2;
  packetIn("retain", tInR); // 63.05 to 63.55, beside the held line
  door("retain", tArrR + 1.25, false);
  RA.retain.forEach(function (a) {
    fadeTo(a.name, 1, 0.35, tInR + 0.5, 0.3);
  });
  var cR = IN.retain;
  // a simple rust bar bridges the gap: kept, on purpose
  var clamp = undrawn(
    PK.el(
      "path",
      { d: "M" + f(cR[0] - 21) + " " + f(cR[1] - 30) + " V" + f(cR[1] - 42) + " H" + f(cR[0] + 21) + " V" + f(cR[1] - 30), fill: "none", stroke: C.rust, "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round" },
      Llb,
    ),
  );
  var tClamp = tInR + 0.55;
  draw(clamp, tClamp, 0.25, "power2.out", "middle");
  PK.sfx("lock", tClamp + 0.25, { gain_db: -6, pan: 0.5 });
  // the agents attach the terms: plain labels on short leaders, two each side, clear of the bar
  var ROWA = cR[1] - 50,
    ROWB = cR[1] - 18;
  var TERMS = [
    { text: "Exposure", by: policy, side: -1, y: ROWA, from: [cR[0] - 26, cR[1] - 45], at: tClamp + 0.1 },
    { text: "Authority", by: authority, side: 1, y: ROWA, from: [cR[0] + 26, cR[1] - 45], at: tClamp + 0.1 },
    { text: "Conditions", by: policy, side: -1, y: ROWB, from: [cR[0] - 30, cR[1] - 24], at: tClamp + 0.4 },
    { text: "Expiry", by: record, side: 1, y: ROWB, from: [cR[0] + 30, cR[1] - 24], at: tClamp + 0.4 },
  ];
  var termEls = [clamp];
  TERMS.forEach(function (T, i) {
    var end = [cR[0] + T.side * 52, T.y];
    beadTo(T.by.p, end, T.at, 0.26, { bend: T.side * 12 });
    pulse(T.by.body, T.at - 0.05, 1.15);
    var lead = undrawn(PK.el("path", { d: "M" + pt(end) + " L" + pt(T.from), fill: "none", stroke: C.rust, "stroke-width": 1, "stroke-linecap": "round" }, Llb));
    draw(lead, T.at + 0.24, 0.15, "power2.out");
    var lab = hide(mono(Llb, T.text, cR[0] + T.side * 56, T.y + LAB * 0.36, LAB, { anchor: T.side < 0 ? "end" : "start" }));
    fadeIn(lab, T.at + 0.24, 0.15);
    if (i % 2 === 0) PK.sfx("record", T.at + 0.26, { gain_db: -10, pan: 0.5 });
    termEls.push(lead, lab);
  });
  // the kept state holds to 65.45; then the terms go, the door opens, the packet comes out, the door closes
  var tExitR = 65.45;
  fadeOut(termEls, tExitR, 0.28);
  door("retain", tExitR + 0.1, true);
  packetOut("retain", tExitR + 0.15, KW.retain); // 65.6 to 66.1
  door("retain", tExitR + 0.66, false);
  RA.retain.forEach(function (a) {
    fadeOut(a.name, tExitR + 0.3, 0.3); // (from the 35 percent they were dimmed to)
  });

  // ============================================================ MITIGATE (camera 66.1 to 67.0)
  var tFlyM = 66.12;
  turnBead(ang(PW.mitigate, DOOR.mitigate), tFlyM, 0.5);
  fly(PW.mitigate, KW.mitigate, tFlyM, 0.82, -10, -10, 0.06); // a follow move, lands 66.94
  var tCloseUpM = 67.0;
  RA.mitigate.forEach(function (a) {
    fadeIn(a.name, tCloseUpM, 0.3);
  });
  var LIB = hide(mono(Llb, "Suggestions from a reviewed library", 1770, 470, LAB, { fill: INK2, anchor: "end" }));
  fadeIn(LIB, tCloseUpM, 0.3);
  SG_KEYS.forEach(function (k, i) {
    fadeIn(W.safeguards[k].name, tCloseUpM + 0.05 + i * 0.05, 0.3);
  });
  var tArrM = ownerHolds("mitigate", tCloseUpM, 0.25, 1.0, false); // at the door 67.25, holds to 68.25
  var tInM = tArrM + 0.2;
  packetIn("mitigate", tInM); // 67.33 to 67.83
  door("mitigate", tArrM + 1.25, false);
  var cM = IN.mitigate;
  var prev = hide(mono(Llb, "Preview", cM[0], cM[1] - PK_R - 12, LAB, { fill: INK2, anchor: "middle" }));
  fadeIn(prev, tInM + 0.5, 0.2);
  // "compares safeguards": each object lifts in turn and its own measures pulse
  var tCmp = PK.word("L11", "compares"); // 67.41
  SG_KEYS.forEach(function (k, i) {
    var d = SG_DEF[k],
      sg = W.safeguards[k];
    var t = tCmp + 0.05 + i * 0.2;
    FT(sg.g, { y: d.pos[1] }, { keyframes: [{ y: d.pos[1] - 4, duration: 0.15, ease: "power2.out" }, { y: d.pos[1], duration: 0.25, ease: "power2.inOut" }] }, t);
    FT(sg.coins, { scale: 1, svgOrigin: d.coinsO }, { keyframes: [{ scale: 1.25, duration: 0.14, ease: "power1.out" }, { scale: 1, duration: 0.26, ease: "power2.inOut" }], svgOrigin: d.coinsO }, t);
    FT(sg.clockIn, { scale: 1, svgOrigin: "0 0" }, { keyframes: [{ scale: 1.3, duration: 0.14, ease: "power1.out" }, { scale: 1, duration: 0.26, ease: "power2.inOut" }], svgOrigin: "0 0" }, t);
  });
  // dashed previews, at full strength: a copy of a safeguard leaves its piece and is tried in the gap
  function ghost(k) {
    var d = SG_DEF[k];
    var g = PK.g(Lcs);
    var gp = PK.el("path", { d: sector(SG_R0, SG_R1, d.a0, d.a1), fill: C.rustPale, stroke: C.rust, "stroke-linejoin": "round" }, g);
    gp.setAttribute("style", "stroke-width:calc(var(--sw, 1) * 1.75px);stroke-dasharray:calc(var(--sw, 1) * 4px) calc(var(--sw, 1) * 2.6px);");
    place(g, d.pos);
    hide(g);
    return g;
  }
  var engTurn = 0;
  function tryIn(k, at, dur) {
    var d = SG_DEF[k];
    var gh = ghost(k);
    FT(W.safeguards[k].g, { y: d.pos[1] }, { y: d.pos[1] - 4, duration: 0.2, ease: "power2.out" }, at - 0.1);
    fadeIn(gh, at, 0.1, "none");
    var path = PK.curve(d.pos, cM, -26);
    PK.travel(tl, gh, path, at, dur, "power3.out");
    FT(eng.body, { rotation: engTurn, svgOrigin: "0 0" }, { rotation: engTurn + 45, svgOrigin: "0 0", duration: 0.4, ease: "power2.inOut" }, at - 0.08);
    engTurn += 45;
    PK.sfx("compare", at + dur, { gain_db: -6, pan: 0.5 });
    return gh;
  }
  function tryOut(k, gh, at, dur) {
    var d = SG_DEF[k];
    PK.travel(tl, gh, PK.curve(cM, d.pos, 26), at, dur, "power2.inOut");
    fadeOut(gh, at + dur - 0.12, 0.12, "none");
    FT(W.safeguards[k].g, { y: d.pos[1] - 4 }, { y: d.pos[1], duration: 0.2, ease: "power2.inOut" }, at + dur - 0.05);
  }
  var SY1 = cM[1] + PK_R + 14,
    SY2 = SY1 + LAB * 1.75;
  // Thermal check: part of the gap; the rest of the gap stays open, with its tick
  var tTh = 68.0;
  var ghTh = tryIn("thermal", tTh, 0.45); // seats 68.45
  var labP = hide(mono(Llb, SG_DEF.thermal.label, cM[0], SY1, LAB, { anchor: "middle" }));
  FT(labP, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.15, ease: "power2.out" }, tTh + 0.45);
  fadeOut(labP, 69.5, 0.2);
  tryOut("thermal", ghTh, 69.5, 0.35);
  // Extend watch: all of it; the gap ticks give way, the ring joins with one pulse
  var tW = 69.6;
  var ghW = tryIn("watch", tW, 0.42); // seats 70.02
  var tFull = tW + 0.42;
  fadeOut(gapTicks, tFull - 0.05, 0.12, "none");
  pulse(cs.body, tFull, 1.05, 0.3);
  var labF = hide(mono(Llb, SG_DEF.watch.label, cM[0], SY1, LAB, { anchor: "middle" }));
  FT(labF, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.15, ease: "power2.out" }, tFull + 0.03);
  // "back inside": the verifier's corners land on the joined ring, a tick inside the bracket
  var tBack = PK.word("L11", "back"); // 70.19
  FT(verifier.body, { rotation: 0, svgOrigin: "0 0" }, { rotation: 45, svgOrigin: "0 0", duration: 0.4, ease: "power2.inOut" }, tBack - 0.3);
  var CO = PK_R + 7.5;
  var cornH = holder(Lcs);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (k) {
    var L = 9;
    PK.el("path", { d: "M" + f(k[0] * CO) + " " + f(k[1] * CO - k[1] * L) + " V" + f(k[1] * CO) + " H" + f(k[0] * CO - k[0] * L), fill: "none", stroke: C.rust, "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" }, cornH.s);
  });
  place(cornH.g, cM);
  hide(cornH.g);
  fadeIn(cornH.g, tBack - 0.25, 0.1, "none");
  FT(cornH.s, { scale: 1.4, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.25, ease: "power3.out" }, tBack - 0.25);
  var TI = 6.4; // 16 px inside the bracket
  var tick = undrawn(PK.el("path", { d: "M" + f(cM[0] + CO - TI - 10) + " " + f(cM[1] + CO - TI - 4) + " l3.2 3.4 l6.4 -7.2", fill: "none", stroke: C.rust, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, Lcs));
  draw(tick, tBack, 0.15, "power2.out");
  PK.sfx("resolve", tBack, { gain_db: -5, pan: 0.5 });
  var labB = hide(mono(Llb, "Back inside", cM[0], SY2, LAB, { anchor: "middle" }));
  FT(labB, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.15, ease: "power2.out" }, tBack);
  // nothing is applied: the preview goes back to its piece, the gap opens again, the packet goes out
  var tRev = 70.8;
  fadeOut([labF, labB, prev, cornH.g, tick], tRev, 0.28);
  tryOut("watch", ghW, tRev, 0.35);
  fadeIn(gapTicks, tRev + 0.2, 0.15, "none");
  FT([eng.body, verifier.body], { rotation: function (i) { return i === 0 ? engTurn : 45; }, svgOrigin: "0 0" }, { rotation: 0, svgOrigin: "0 0", duration: 0.4, ease: "power2.inOut" }, tRev);
  door("mitigate", tRev - 0.05, true);
  packetOut("mitigate", tRev, KW.mitigate); // 70.8 to 71.3
  door("mitigate", tRev + 0.5, false);
  fadeOut([LIB].concat(RA.mitigate.map(function (a) { return a.name; }), SG_KEYS.map(function (k) { return W.safeguards[k].name; })), 71.3, 0.3);

  // ============================================================ TRANSFER (camera 71.3 to 72.2)
  var tFlyT = 71.32;
  turnBead(ang(PDOCK, DOOR.transfer), tFlyT, 0.5);
  fly(PDOCK, DOCK, tFlyT, 0.82, 0, 0, 0.06); // a follow move back down beside the Transfer door, lands 72.14
  RA.transfer.forEach(function (a) {
    fadeIn(a.name, 72.2, 0.3);
  });
  var tArrT = ownerHolds("transfer", PK.word("L12", "transfer") + 0.0, 0.25, 1.0, false); // at the door 72.5, holds to 73.5
  var tInT = tArrT + 0.2;
  packetIn("transfer", tInT);
  door("transfer", tArrT + 1.25, false);
  var cT = IN.transfer;
  // "simulated for now": the chip pulses; it says so plainly
  var tSim = PK.word("L12", "simulated");
  FT(RM.transfer.chip, { scale: SC_CLOSE, svgOrigin: CHIP_O }, { keyframes: [{ scale: SC_CLOSE * 1.1, duration: 0.15, ease: "power2.out" }, { scale: SC_CLOSE, duration: 0.3, ease: "power2.inOut" }], svgOrigin: CHIP_O }, tSim + 0.15);
  PK.sfx("simulated", tSim + 0.15, { gain_db: -6, pan: 0.6 });
  var noIns = hide(mono(Llb, "No insurer on Priora yet", 1320, 754, LAB, { fill: INK2 }));
  FT(noIns, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }, tSim + 0.4);
  // one dashed thread from the gap to each hexagon; a dashed copy of the gap goes out by the ports
  var tAsk = 74.2;
  var gapTop = [cT[0], cT[1] - PK_R - 2];
  var askD = HEX_Y.map(function (y) {
    return (
      "M" + pt(gapTop) + " C" + f(gapTop[0] + 4) + " " + f(gapTop[1] - 46) + " 1580 604 1606 632 L1606 " + f(y - 14) + " Q1606 " + y + " 1620 " + y + " L" + f(HEX_X - HEX_R) + " " + y
    );
  });
  var askClip = PK.el("clipPath", { id: "s6-clip-ask", clipPathUnits: "userSpaceOnUse" }, defs);
  var askRect = PK.el("rect", { x: gapTop[0] - 6, y: 590, width: 0, height: 180 }, askClip);
  var askG = PK.g(Lth, { "clip-path": "url(#s6-clip-ask)" });
  askD.forEach(function (d) {
    PK.el("path", { d: d, class: "pk-thread-dash" }, askG);
  });
  FT(askRect, { attr: { width: 0 } }, { attr: { width: HEX_X - gapTop[0] }, duration: 0.4, ease: "power1.out" }, tAsk);
  askD.forEach(function (d, i) {
    var gqH = holder(Lcs);
    var inner = PK.g(gqH.s, { transform: "translate(0 " + f(GAP_R) + ")" }); // the gap's sector, centred on the thread
    PK.el("path", { d: sector(SG_R0 - 1, SG_R1 + 1, 234, 306), fill: C.paper, stroke: C.rust, "stroke-width": 0.9, "stroke-dasharray": "1.8 1.4" }, inner);
    place(gqH.g, gapTop);
    hide(gqH.g);
    var t = tAsk + 0.08 + i * 0.12;
    var out = d + " L1812 " + HEX_Y[i];
    fadeIn(gqH.g, t, 0.1, "none");
    PK.travel(tl, gqH.g, out, t, 0.9, "power1.inOut");
    FT(gqH.s, { scale: 1, svgOrigin: "0 0" }, { scale: 0.5, svgOrigin: "0 0", duration: 0.9, ease: "power1.in" }, t);
    fadeOut(gqH.g, t + 0.76, 0.14, "none");
    FT(RA.transfer[i].inner, { rotation: 0, svgOrigin: "0 0" }, { rotation: 120, svgOrigin: "0 0", duration: 0.7, ease: "power2.inOut" }, t + 0.55);
  });
  PK.sfx("request", tAsk + 0.7, { gain_db: -10, pan: 0.65 });
  // the answers: hollow dashed beads come back along their carriers' threads and settle round the
  // packet near the gap, each at its own angle, with a plain word on a short leader
  var ANS = [
    { text: "Eligibility", hex: 0, a: 318, land: 75.62 },
    { text: "Terms", hex: 1, a: 340, land: 75.95 },
    { text: "Safeguards", hex: 2, a: 2, land: 76.25 },
    { text: "Price", hex: 1, a: 25, land: PK.word("L12", "price") }, // 76.55
  ];
  var answerEls = [askG, noIns];
  ANS.forEach(function (A) {
    var price = A.text === "Price";
    var y = HEX_Y[A.hex];
    var seat = PK.polar(cT[0], cT[1], PK_R + 6, A.a);
    var back =
      "M" + f(HEX_X - HEX_R) + " " + y + " L1620 " + y + " Q1606 " + y + " 1606 " + f(y - 14) + " L1606 632 C1580 604 " + f(gapTop[0] + 4) + " " + f(gapTop[1] - 46) + " " + pt(gapTop) +
      " Q" + pt(PK.polar(cT[0], cT[1], PK_R + 10, (270 + A.a) / 2 + (A.a < 90 ? 180 : 0))) + " " + pt(seat);
    var bh = holder(Llb);
    PK.el("circle", { cx: 0, cy: 0, r: price ? 5.4 : 3.3, fill: C.paper, stroke: C.rust, "stroke-width": 1, "stroke-dasharray": price ? "1.9 1.3" : "1.5 1.1" }, bh.s);
    if (price) PK.text(bh.s, "?", 0, LAB * 0.36, { font: "mono", size: LAB, fill: C.rust, anchor: "middle", weight: 600, upper: false, track: 0 });
    place(bh.g, [HEX_X - HEX_R, y]);
    hide(bh.g);
    var dur = 0.55;
    var t0 = A.land - dur;
    pulse(RA.transfer[A.hex].body, t0 - 0.05, 1.1);
    tl.set(bh.g, { opacity: 1 }, t0);
    PK.travel(tl, bh.g, back, t0, dur, "power3.out");
    FT(bh.s, { scale: 0.6, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: dur, ease: "power2.out" }, t0);
    // the word on a short leader, fanned out from the bead
    var l0 = PK.polar(cT[0], cT[1], PK_R + (price ? 12 : 10), A.a),
      l1 = PK.polar(cT[0], cT[1], PK_R + 24, A.a);
    var lead = undrawn(PK.el("path", { d: "M" + pt(l0) + " L" + pt(l1), fill: "none", stroke: C.rust, "stroke-width": 1, "stroke-linecap": "round" }, Llb));
    draw(lead, A.land, 0.14, "power2.out");
    var lp = PK.polar(cT[0], cT[1], PK_R + 28, A.a);
    var lab = hide(mono(Llb, A.text, lp[0] + 1, lp[1] + LAB * 0.36, LAB));
    fadeIn(lab, A.land + 0.04, 0.15);
    PK.sfx("return", A.land, { gain_db: -9, pan: 0.5 });
    answerEls.push(bh.g, lead, lab);
  });
  // held still to 77.4; then the packet goes back out to Priora and the dock, and the loop closes round it
  var tOutT = 77.4;
  fadeOut(answerEls, tOutT, 0.25);
  fadeOut(RA.transfer.map(function (a) { return a.name; }), tOutT, 0.25);
  door("transfer", tOutT - 0.02, true);
  packetOut("transfer", tOutT + 0.02, DOCK); // 77.42 to 77.92
  door("transfer", tOutT + 0.38, false, 0.2); // after the packet has cleared the doorway, closed by 78.0
  loopCloses(77.6, 0.4);
  turnBead(BEAD_DOCK, tOutT + 0.1, 0.4);
  FT(RM.transfer.chip, { scale: SC_CLOSE, svgOrigin: CHIP_O }, { scale: SC_END, svgOrigin: CHIP_O, duration: 0.14, ease: "power2.inOut" }, 77.86);
});
