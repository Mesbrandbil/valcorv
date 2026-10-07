/*
  s6-rooms (57 to 78 s): three decision rooms (cut 2).

  The rooms open from the human's line only: the risk owner's black line runs from the
  packet loop to a branch point, fine dotted grey branches run to the three doors, and each
  chamber draws from its door as its branch arrives. Priora carries the same packet to each
  door, in frame, and hands it in only after the black line has opened the door; Priora
  itself never enters a room, and the packet comes back to Priora at the door afterwards.

  Retain (59.2 to 66.0): Priora is refused at the closed door (it shudders, Priora bounces
  back): AN AGENT CANNOT CHOOSE IT. A grey timer runs out and the door stays shut: SILENCE
  DOES NOT CHOOSE IT. On "Risk" the black line (tagged RISK OWNER) opens the door and
  withdraws; the packet goes in, a rust bar bridges the gap (kept on purpose) and the
  room's agents attach its terms as plain labels: EXPOSURE, AUTHORITY, CONDITIONS, EXPIRY.
  Mitigate (65.95 to 71.5): three safeguards from a reviewed library are objects on a shelf,
  each carrying its own measures (a stack of rust-deep discs for cost, a grey clock arc for
  time). Dashed PREVIEWs are tried in the gap: Thermal check fills part of it (PARTIAL: REST
  MOVES ON, the remainder leaves by the door), Extend watch fills it (FULL), the verifier's
  corners land (BACK INSIDE), Move weld to workshop also fills it. Everything reverts.
  Transfer (71.3 to 77.6): dashed and SIMULATED, NO INSURER ON PRIORA YET. Dashed copies of
  the gap go to three dashed SIM hexagons and out through the ports; hollow dashed beads come
  back with plain labels ELIGIBILITY, TERMS, SAFEGUARDS, PRICE (price beads marked "?").
  Priora and the packet are back at the dock by 77.6.

  Contract at 57.0 (from s5): tl.set below. If s5 has not provided W.decisionTip yet, this
  section builds a stand-in for the 57.0 state (the human's loop round the packet, the
  facets turned 30 degrees, rust-deep gap ticks).
  Contract at 78.0 (for s7): Priora at GEO.prioraDock, bead toward the packet; the packet at
  GEO.dock, arcsG 0.85, insurer arc hidden (gap open). Rooms drawn, doors closed, names and
  the SIMULATED chip visible (chip scaled 1.22 about its centre so it stays 18 px in the
  s7 shot; its outline is a 1.5 px non-scaling stroke). W.decision drawn (owner to the
  loop); W.decisionTrunk (solid black, W.decisionTip to GEO.branch) drawn; W.branchNode;
  W.branches = { retain, mitigate, transfer } fine dotted grey from GEO.branch to each door
  (mitigate shares the retain branch up to (1276, 530)); W.roomOwnerLines undrawn solid black
  lines from GEO.branch through each door. W.roomAgents = { retain: [policy, authority,
  record], mitigate: [eng, verifier], transfer: [3 carriers] } in place, names hidden.
  W.safeguards = { thermal, watch, workshop }, each { g, piece, a0, a1, coins, clock, name }:
  g is the whole object on the shelf (piece plus its measures); the piece path is local to the
  ring centre, an annular sector at radius 28.2 + 4 to 31.8 + 4 (32.2 to 35.8) world units,
  the packet's gap with arcsG 0.85. No transient labels.
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
  function add(p, d) {
    return [p[0] + d[0], p[1] + d[1]];
  }
  // screen-constant dotted / dashed strokes written as inline CSS (scale with the camera like the classes)
  function dotted(el, colour, w, on, off) {
    el.setAttribute(
      "style",
      "fill:none;stroke:" + colour + ";stroke-linecap:round;stroke-width:calc(var(--sw, 1) * " + w + "px);stroke-dasharray:calc(var(--sw, 1) * " + on + "px) calc(var(--sw, 1) * " + off + "px);",
    );
    return el;
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
  var OFF = [DOCK[0] - PDOCK[0], DOCK[1] - PDOCK[1]]; // the packet rides at this offset from Priora
  var DOOR = { retain: [1300, 330], mitigate: [1300, 508], transfer: [1300, 686] };
  // where the packet waits outside each door (Transfer's is the dock itself), and Priora with it
  var WAITK = { retain: [1226, 334], mitigate: [1226, 512], transfer: DOCK };
  var WAITP = {};
  RK.forEach(function (k) {
    WAITP[k] = [WAITK[k][0] - OFF[0], WAITK[k][1] - OFF[1]];
  });
  // where the packet sits inside each room
  var IN = { retain: [1540, 330], mitigate: [1420, 512], transfer: [1420, 696] };
  var GAP_R = G.alignR * ARC; // 34: the gap's radius at arcsG 0.85
  var SG_R0 = GAP_R - 1.8,
    SG_R1 = GAP_R + 1.8;
  var PK_R = GAP_R + 1.6; // the packet's outer radius (arcs plus stroke)
  var BEAD_DOCK = ang(PDOCK, DOCK);

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
  var standIn = !W.decisionTip;
  if (standIn) {
    // the human's line as s5 should leave it: from the desk to the packet, once round it, ending at its right side
    var LR0 = 42;
    var dD = "M1180 711 C1196 711 1204 " + f(DOCK[1] + LR0) + " " + pt([DOCK[0], DOCK[1] + LR0]);
    [180, 270, 360].forEach(function (a) {
      dD += " A" + LR0 + " " + LR0 + " 0 0 1 " + pt(PK.polar(DOCK[0], DOCK[1], LR0, a));
    });
    W.decisionTip = [DOCK[0] + LR0, DOCK[1]];
    tl.set(W.decision, { attr: { d: dD } }, T0);
    // the facets turned so none sits in the gap; two rust-deep ticks mark the gap's edges
    cs.facets.forEach(function (fc) {
      tl.set(fc.g, { rotation: fc.angle + 30, svgOrigin: "0 0" }, T0);
      tl.set(fc.mark, { attr: { transform: "rotate(-30)" } }, T0);
    });
    [234, 306].forEach(function (a) {
      var p0 = PK.polar(0, 0, G.alignR + 3.5, a),
        p1 = PK.polar(0, 0, G.alignR + 10, a);
      var tk = PK.el("path", { d: "M" + pt(p0) + " L" + pt(p1), fill: "none", stroke: C.rustDeep, "stroke-width": 2.6, "stroke-linecap": "round" }, cs.arcsG);
      gsap.set(tk, { opacity: 0 });
      tl.set(tk, { opacity: 1 }, T0);
    });
  }
  var TIP = W.decisionTip.length ? W.decisionTip : [W.decisionTip.x, W.decisionTip.y];
  tl.set(P.g, { x: PDOCK[0], y: PDOCK[1], opacity: 1 }, T0);
  tl.set(P.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(P.beadG, { rotation: BEAD_DOCK, svgOrigin: "0 0", opacity: 1 }, T0);
  tl.set(P.orbit, { opacity: 1 }, T0);
  tl.set(P.label, { opacity: 0 }, T0);
  tl.set(cs.g, { x: DOCK[0], y: DOCK[1], opacity: 1 }, T0);
  tl.set(cs.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(cs.arcsG, { scale: ARC, svgOrigin: "0 0" }, T0);
  KEYS.forEach(function (k) {
    var a = W.align.arcs[k];
    tl.set(a, { opacity: k === "insurer" ? 0 : 1 }, T0);
  });
  if (W.align.insurerDashed) tl.set(W.align.insurerDashed, { opacity: 0 }, T0);
  if (W.caseLabel) tl.set(W.caseLabel, { opacity: 0 }, T0);
  tl.set(W.decision, { opacity: 1 }, T0);
  tl.set(W.decision, { drawSVG: "0% 100%" }, T0);
  if (W.ownerDecides) tl.set(W.ownerDecides, { opacity: 1 }, T0);
  tl.set(W.real.labels.owner, { opacity: 1 }, T0);
  // the rooms start hidden (world.js); make it explicit so a mismatch shows as a jump
  RK.forEach(function (k) {
    var ch = RM[k];
    if (k !== "transfer") tl.set(ch.walls, { drawSVG: "0% 0%" }, T0);
    tl.set([ch.leafA, ch.leafB], { opacity: 0, x: 0, y: 0 }, T0);
    tl.set([ch.jambs, ch.name], { opacity: 0 }, T0);
  });
  // the SIMULATED chip: one chip, its outline a 1.5 px hairline at any scale, its type sized per shot
  var CHIP_O = "1719 630";
  var chipRect = RM.transfer.chip.firstElementChild;
  chipRect.setAttribute("vector-effect", "non-scaling-stroke");
  chipRect.setAttribute("stroke-width", "1.5");
  var CHIP_OVER = 1.15, // 19 px type in the overview (world size 9 x zoom 1.81 x 1.15)
    CHIP_CLOSE = 0.88, // 20 px type in the room close-ups (zoom 2.53)
    CHIP_END = 1.22; // 18 px type in the s7 shot (zoom 1.64)
  tl.set(RM.transfer.chip, { opacity: 0, scale: CHIP_OVER, svgOrigin: CHIP_O }, T0);

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
  PK.sfx("decision", tTrunk, { gain_db: -6, pan: 0.3 });
  // fine dotted grey branches to the doors (revealed by a clip that grows from the branch point)
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
  PK.sfx("route", tBr, { gain_db: -14, dur: 0.25, pan: 0.5 });
  // the solid lines that open each door later: from the branch point along the branch, through the doorway
  var own = {};
  RK.forEach(function (k) {
    own[k] = undrawn(PK.el("path", { d: BR_D[k] + " H1318", class: "pk-decision" }, Lr));
  });
  W.roomOwnerLines = own;
  // each chamber draws from its door as its branch arrives
  var arrive = function (k) {
    var d = Math.hypot(DOOR[k][0] - BR[0], DOOR[k][1] - BR[1]);
    return tBr + (0.22 * d) / 300;
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
    PK.sfx("thread", tCh[k], { gain_db: -12, dur: 0.45, pan: 0.5, material: "pencil" });
  });
  // the SIMULATED chip appears with the dashed walls; the room name after it
  fadeIn(RM.transfer.chip, tCh.transfer, 0.2);
  PK.sfx("simulated", tCh.transfer, { gain_db: -10, pan: 0.6 });
  FT(RM.retain.name, { opacity: 0, x: -4 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }, tCh.retain + 0.3);
  FT(RM.mitigate.name, { opacity: 0, x: -4 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }, tCh.mitigate + 0.3);
  FT(RM.transfer.name, { opacity: 0, x: -4 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }, tCh.transfer + 0.25);
  // the qualifier, the first time Retain and Mitigate appear
  var DP = px(58.6, 19);
  var designP = hide(mono(Llb, "Design proposal", 1794, 262, DP, { fill: C.grey }));
  FT(designP, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "none" }, 58.45);
  fadeOut(designP, 59.2, 0.25);

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
  var NS_R = px(62.0, 22),
    NS_M = px(68.0, 22),
    LAB = px(64.0, 19); // 19 px mono in the room close-ups
  var policy = agentAt(function () { return PK.glyph.roomAgent(Ltk, "policy", 18); }, [1390, 380], "Policy", [0, 12 + NS_R * 0.78], "middle", NS_R);
  var authority = agentAt(function () { return PK.glyph.roomAgent(Ltk, "authority", 18); }, [1690, 296], "Authority", [15, NS_R * 0.36], "start", NS_R);
  var record = agentAt(function () { return PK.glyph.roomAgent(Ltk, "record", 18); }, [1690, 366], "Record", [15, NS_R * 0.36], "start", NS_R);
  RA.retain = [policy, authority, record];
  var eng = agentAt(function () { return PK.glyph.roomAgent(Ltk, "eng", 18); }, [1560, 560], "Risk engineering", [16, NS_M * 0.36], "start", NS_M);
  var verifier = agentAt(function () { return PK.glyph.roomAgent(Ltk, "eng", 18); }, [1700, 560], "Verifier", [16, NS_M * 0.36], "start", NS_M);
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
  PK.sfx("arrive", tPrint, { gain_db: -16, size: "small", pan: 0.55 });
  PK.sfx("arrive", tPrint + 0.15, { gain_db: -17, size: "small", pan: 0.6 });
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
    thermal: { name: ["Thermal check"], a0: 234, a1: 277, coins: 1, time: 0.25, x: 1574 },
    watch: { name: ["Extend watch", "to 60 min"], a0: 234, a1: 306, coins: 2, time: 0.5, x: 1652 },
    workshop: { name: ["Move weld", "to workshop"], a0: 234, a1: 306, coins: 3, time: 0.85, x: 1730 },
  };
  var SG_KEYS = ["thermal", "watch", "workshop"];
  var SG_Y = SHELF_Y + SG_R0 * Math.sin((54 * Math.PI) / 180) + 0.6; // the sector's lowest corners rest on the shelf
  W.safeguards = {};
  SG_KEYS.forEach(function (k, i) {
    var d = SG_DEF[k];
    // the piece's ring centre sits so the piece is centred on its place
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
    // time: a small grey clock arc beside the piece
    var clock = PK.g(g, { transform: "translate(" + f((xa + xb) / 2 + 30) + " " + f(-SG_R1 + 4) + ")" });
    PK.el("circle", { cx: 0, cy: 0, r: 6.2, fill: C.paper, stroke: C.grey, "stroke-width": 0.9 }, clock);
    PK.el("path", { d: PK.arc(0, 0, 6.2, -90, -90 + 360 * d.time), fill: "none", stroke: C.grey, "stroke-width": 2.2, "stroke-linecap": "butt" }, clock);
    PK.el("path", { d: "M0 0 L" + pt(PK.polar(0, 0, 4.2, -90 + 360 * d.time)), fill: "none", stroke: C.grey, "stroke-width": 0.9, "stroke-linecap": "round" }, clock);
    place(g, d.pos);
    hide(g);
    fadeIn(g, tPrint + 0.1 + i * 0.06, 0.2, "none");
    // its short name (shown while Mitigate is in the close-up)
    var name = hide(PK.g(Llb));
    d.name.forEach(function (line, j) {
      sans(name, line, d.x, SHELF_Y + 15 + j * NS_M * 1.15, NS_M, { anchor: "middle" });
    });
    W.safeguards[k] = { g: g, piece: piece, a0: d.a0, a1: d.a1, coins: coins, clock: clock, name: name };
  });

  // ------------------------------------------------------------ Priora, the packet and the doors: shared moves
  var beadNow = BEAD_DOCK;
  function turnBead(to, at, dur) {
    FT(P.beadG, { rotation: beadNow, svgOrigin: "0 0" }, { rotation: to, svgOrigin: "0 0", duration: dur || 0.45, ease: "power2.inOut" }, at);
    beadNow = to;
  }
  // Priora flies with the packet outside the rooms (a trail behind Priora)
  function fly(fromRoom, toRoom, at, dur) {
    var pa = fromRoom ? WAITP[fromRoom] : PDOCK,
      pb = toRoom ? WAITP[toRoom] : PDOCK;
    var ka = add(pa, OFF),
      kb = add(pb, OFF);
    var bend = pb[1] < pa[1] ? -22 : 22;
    var dP = PK.curve(pa, pb, bend),
      dK = PK.curve(ka, kb, bend);
    PK.travel(tl, P.g, dP, at, dur, "power2.inOut");
    PK.travel(tl, cs.g, dK, at + 0.04, dur - 0.04, "power2.inOut");
    if (Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) > 150) PK.trail(tl, W.L.trails, dP, at, dur, "power2.inOut");
    PK.sfx("move", at, { gain_db: -10, dur: dur, pan: 0.3 });
  }
  // the packet goes in through the open door: small at the threshold, full size inside; Priora stays outside
  function handIn(room, at) {
    var d = DOOR[room],
      w = WAITK[room],
      inP = IN[room];
    var thr = [d[0], d[1]];
    move(cs.g, w, thr, at, 0.2, "power2.in");
    FT(cs.body, { scale: 1, svgOrigin: "0 0" }, { scale: 0.58, svgOrigin: "0 0", duration: 0.2, ease: "power2.in" }, at);
    move(cs.g, thr, inP, at + 0.2, 0.42, "power3.out");
    FT(cs.body, { scale: 0.58, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.42, ease: "power3.out" }, at + 0.2);
    var p = WAITP[room];
    FT(P.g, { x: p[0], y: p[1] }, { keyframes: [{ x: p[0] + 7, y: p[1] - 1, duration: 0.16, ease: "power2.out" }, { x: p[0], y: p[1], duration: 0.3, ease: "power2.inOut" }] }, at - 0.04);
    PK.sfx("packet", at, { gain_db: -9, pan: 0.5 });
    PK.sfx("arrive", at + 0.55, { gain_db: -11, size: "case", pan: 0.6 });
  }
  // and comes back out to Priora at the door
  function handOut(room, at) {
    var d = DOOR[room],
      w = WAITK[room],
      inP = IN[room];
    var thr = [d[0], d[1]];
    move(cs.g, inP, thr, at, 0.2, "power2.in");
    FT(cs.body, { scale: 1, svgOrigin: "0 0" }, { scale: 0.58, svgOrigin: "0 0", duration: 0.2, ease: "power2.in" }, at);
    move(cs.g, thr, w, at + 0.2, 0.2, "power3.out");
    FT(cs.body, { scale: 0.58, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.2, ease: "power3.out" }, at + 0.2);
    PK.sfx("return", at, { gain_db: -10, pan: 0.5 });
  }
  // the risk owner's line runs along its branch into the door, the door opens for it alone, it withdraws
  function ownerOpens(room, at, dur, hold) {
    draw(own[room], at, dur, "power2.inOut");
    RM[room].open(tl, at + dur * 0.82, 0.25);
    undraw(own[room], at + dur + hold, 0.25, "power2.in", "start");
    PK.sfx("decision", at, { gain_db: -4, dur: dur, pan: 0.5 });
    PK.sfx("door-open", at + dur * 0.82, { gain_db: -6, pan: 0.6 });
    return at + dur + hold + 0.25;
  }
  function closeDoor(room, at) {
    RM[room].close(tl, at, 0.3);
    PK.sfx("door-close", at, { gain_db: -7, pan: 0.6 });
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

  // the chip: 19 px in the overview; it steps down to 20 px close-up size while the camera moves away
  FT(RM.transfer.chip, { scale: CHIP_OVER, svgOrigin: CHIP_O }, { scale: CHIP_CLOSE, svgOrigin: CHIP_O, duration: 0.6, ease: "power2.inOut" }, 59.35);

  // ============================================================ RETAIN (camera lands 60.2)
  var tFlyR = 59.85;
  turnBead(ang(WAITP.retain, DOOR.retain), tFlyR + 0.2, 0.5);
  fly(null, "retain", tFlyR, 0.75); // arrives 60.6
  RA.retain.forEach(function (a) {
    fadeIn(a.name, 60.2, 0.3);
  });
  // "Retain is never a default": Priora nudges the packet at the closed door and is refused
  var tNudge = PK.word("L10", "never") - 0.27; // 60.65
  var nudge = PK_R + 0.8 - (DOOR.retain[0] - WAITK.retain[0]); // packet edge to the door
  nudge = -nudge;
  var kR = WAITK.retain,
    pR = WAITP.retain;
  move(cs.g, kR, [kR[0] + nudge, kR[1]], tNudge, 0.27, "power2.in");
  move(P.g, pR, [pR[0] + nudge, pR[1]], tNudge, 0.27, "power2.in");
  var tHit = tNudge + 0.27;
  [RM.retain.leafA, RM.retain.leafB].forEach(function (lf) {
    FT(lf, { x: 0 }, { keyframes: [{ x: 2, duration: 0.05 }, { x: -2, duration: 0.07 }, { x: 2, duration: 0.07 }, { x: -2, duration: 0.07 }, { x: 1.4, duration: 0.07 }, { x: 0, duration: 0.07 }] }, tHit);
  });
  move(cs.g, [kR[0] + nudge, kR[1]], [kR[0] + nudge - 14, kR[1]], tHit, 0.45, "back.out(1.4)");
  move(P.g, [pR[0] + nudge, pR[1]], [pR[0] + nudge - 14, pR[1]], tHit, 0.45, "back.out(1.4)");
  PK.sfx("move", tNudge, { gain_db: -14, dur: 0.27, pan: 0.3 });
  PK.sfx("reject", tHit, { gain_db: -3, pan: 0.35 });
  var LX = 1342,
    LY = 300;
  var lab1 = hide(mono(Llb, "An agent cannot choose it", LX, LY, LAB));
  FT(lab1, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, tNudge + 0.03);
  fadeOut(lab1, 62.02, 0.1);
  // the pair settles back to its place outside the door, clear of the black line's way
  move(cs.g, [kR[0] + nudge - 14, kR[1]], kR, 61.5, 0.42, "power2.inOut");
  move(P.g, [pR[0] + nudge - 14, pR[1]], pR, 61.5, 0.42, "power2.inOut");
  // then silence: a grey dashed timer runs out round the door, and the door stays shut
  var timer = hide(PK.g(Llb));
  var NT = 20,
    dashes = [];
  for (var i = 0; i < NT; i++) {
    var a0 = -90 + i * (360 / NT) + 2.5;
    dashes.push(PK.el("path", { d: PK.arc(DOOR.retain[0], DOOR.retain[1], 31, a0, a0 + 360 / NT - 7), fill: "none", stroke: C.grey, "stroke-width": 1.6, "stroke-linecap": "butt" }, timer));
  }
  var tTimer = 61.9;
  fadeIn(timer, tTimer, 0.12, "none");
  dashes.forEach(function (d, i) {
    FT(d, { opacity: 1 }, { opacity: 0, duration: 0.05, ease: "none" }, tTimer + 0.1 + i * 0.026);
  });
  tl.set(timer, { opacity: 0 }, tTimer + 0.1 + NT * 0.026 + 0.05);
  PK.sfx("request", tTimer + 0.1, { gain_db: -13, dur: NT * 0.026, pan: 0.3, variant: "timer" });
  var lab2 = hide(mono(Llb, "Silence does not choose it", LX, LY, LAB));
  FT(lab2, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, 62.12);
  fadeOut(lab2, 63.42, 0.15);
  // "Risk is kept on purpose": the risk owner's line opens it; the packet goes in only after it withdraws
  var tRisk = PK.word("L10b", "risk"); // 62.60
  var tClear = ownerOpens("retain", tRisk, 0.35, 0.3);
  var ownTag = hide(mono(Llb, "Risk owner", 1306, 321, LAB, { fill: C.ink }));
  FT(ownTag, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, tRisk + 0.3);
  fadeOut(ownTag, tRisk + 1.1, 0.2);
  var tInR = tClear - 0.2; // the line's top and doorway part are already gone
  handIn("retain", tInR);
  var cR = IN.retain;
  // a simple rust bar bridges the gap: kept, on purpose
  var clamp = undrawn(
    PK.el(
      "path",
      { d: "M" + f(cR[0] - 21) + " " + f(cR[1] - 30) + " V" + f(cR[1] - 42) + " H" + f(cR[0] + 21) + " V" + f(cR[1] - 30), fill: "none", stroke: C.rust, "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round" },
      Llb,
    ),
  );
  var tClamp = tInR + 0.6;
  draw(clamp, tClamp, 0.25, "power2.out", "middle");
  PK.sfx("lock", tClamp + 0.2, { gain_db: -6, pan: 0.5 });
  // the agents attach the terms: plain labels on short leaders, two each side, clear of the bar
  var ROWA = cR[1] - 50,
    ROWB = cR[1] - 18;
  var TERMS = [
    { text: "Exposure", by: policy, side: -1, y: ROWA, from: [cR[0] - 26, cR[1] - 45], at: tClamp + 0.08 },
    { text: "Authority", by: authority, side: 1, y: ROWA, from: [cR[0] + 26, cR[1] - 45], at: tClamp + 0.08 },
    { text: "Conditions", by: policy, side: -1, y: ROWB, from: [cR[0] - 30, cR[1] - 24], at: tClamp + 0.24 },
    { text: "Expiry", by: record, side: 1, y: ROWB, from: [cR[0] + 30, cR[1] - 24], at: tClamp + 0.24 },
  ];
  var termEls = [clamp];
  TERMS.forEach(function (T) {
    var end = [cR[0] + T.side * 52, T.y];
    beadTo(T.by.p, end, T.at, 0.26, { bend: T.side * 12 });
    pulse(T.by.body, T.at - 0.05, 1.15);
    var lead = undrawn(PK.el("path", { d: "M" + pt(end) + " L" + pt(T.from), fill: "none", stroke: C.rust, "stroke-width": 1, "stroke-linecap": "round" }, Llb));
    draw(lead, T.at + 0.24, 0.15, "power2.out");
    var lab = hide(mono(Llb, T.text, cR[0] + T.side * 56, T.y + LAB * 0.36, LAB, { anchor: T.side < 0 ? "end" : "start" }));
    fadeIn(lab, T.at + 0.24, 0.15);
    PK.sfx("record", T.at + 0.24, { gain_db: -10, pan: 0.5 + T.side * 0.1 });
    termEls.push(lead, lab);
  });
  // the kept state holds; then the packet comes back out to Priora and the door closes
  var tOutR = 65.62;
  fadeOut(termEls, tOutR - 0.05, 0.15);
  handOut("retain", tOutR);
  closeDoor("retain", tOutR + 0.42);
  RA.retain.forEach(function (a) {
    fadeOut(a.name, tOutR + 0.3, 0.25);
  });

  // ============================================================ MITIGATE (camera 65.95 to 66.9)
  var tFlyM = tOutR + 0.42;
  turnBead(ang(WAITP.mitigate, DOOR.mitigate), tFlyM, 0.45);
  fly("retain", "mitigate", tFlyM, 0.72);
  var tCloseUpM = 66.9;
  RA.mitigate.forEach(function (a) {
    fadeIn(a.name, tCloseUpM, 0.3);
  });
  var LIB = hide(mono(Llb, "Suggestions from a reviewed library", 1770, 452, LAB, { fill: C.grey, anchor: "end" }));
  fadeIn(LIB, tCloseUpM, 0.3);
  SG_KEYS.forEach(function (k, i) {
    fadeIn(W.safeguards[k].name, tCloseUpM + 0.05 + i * 0.05, 0.3);
  });
  var tClearM = ownerOpens("mitigate", tCloseUpM - 0.05, 0.22, 0.18);
  var tInM = tClearM - 0.15;
  handIn("mitigate", tInM);
  var cM = IN.mitigate;
  var prev = hide(mono(Llb, "Preview", cM[0], cM[1] - PK_R - 12, LAB, { fill: C.grey, anchor: "middle" }));
  fadeIn(prev, tInM + 0.5, 0.15);
  // dashed previews: a copy of a safeguard tried in the gap
  function ghost(k) {
    var d = SG_DEF[k];
    var g = PK.g(Lcs);
    PK.el("path", { d: sector(SG_R0, SG_R1, d.a0, d.a1), fill: C.rustPale, stroke: C.rust, "stroke-width": 0.9, "stroke-dasharray": "2.2 1.5", "stroke-linejoin": "round" }, g);
    place(g, d.pos);
    hide(g);
    return g;
  }
  var engTurn = 0;
  function tryIn(k, at, dur) {
    var d = SG_DEF[k];
    var gh = ghost(k);
    fadeIn(gh, at, 0.1, "none");
    move(gh, d.pos, cM, at, dur, "power3.out");
    FT(W.safeguards[k].g, { y: d.pos[1] }, { y: d.pos[1] - 3, duration: 0.2, ease: "power2.out" }, at - 0.05);
    FT(eng.body, { rotation: engTurn, svgOrigin: "0 0" }, { rotation: engTurn + 45, svgOrigin: "0 0", duration: 0.4, ease: "power2.inOut" }, at - 0.08);
    engTurn += 45;
    PK.sfx("compare", at, { gain_db: -6, pan: 0.5 });
    return gh;
  }
  function tryOut(k, gh, at, dur) {
    var d = SG_DEF[k];
    move(gh, cM, d.pos, at, dur, "power2.inOut");
    fadeOut(gh, at + dur - 0.1, 0.1, "none");
    FT(W.safeguards[k].g, { y: d.pos[1] - 3 }, { y: d.pos[1], duration: 0.2, ease: "power2.inOut" }, at + dur - 0.05);
  }
  var SY1 = cM[1] + PK_R + 14,
    SY2 = SY1 + LAB * 1.75;
  // Thermal check: part of the gap; the rest moves on, out of the door
  var tTh = tInM + 0.62; // about 67.95
  var ghTh = tryIn("thermal", tTh, 0.38);
  var labP = hide(mono(Llb, "Partial: rest moves on", cM[0], SY1, LAB, { anchor: "middle" }));
  FT(labP, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.15, ease: "power2.out" }, tTh + 0.38);
  var sliverH = holder(Lcs);
  PK.el("path", { d: sector(SG_R0 - 0.6, SG_R1 + 0.6, 279, 305), fill: "none", stroke: C.rust, "stroke-width": 1, "stroke-dasharray": "1.6 1.4" }, sliverH.s);
  place(sliverH.g, cM);
  hide(sliverH.g);
  fadeIn(sliverH.g, tTh + 0.45, 0.15, "none");
  // the sliver's shape sits about (+9, -33) from its origin: end with it in the doorway
  var restEnd = [DOOR.mitigate[0] - 18, DOOR.mitigate[1] + 33];
  var restD = "M" + pt(cM) + " C" + f(cM[0] + 6) + " " + f(cM[1] - 14) + " " + f(cM[0] - 56) + " " + f(restEnd[1] + 4) + " " + pt(restEnd);
  PK.travel(tl, sliverH.g, restD, tTh + 0.62, 0.5, "power2.inOut");
  fadeOut(sliverH.g, tTh + 1.0, 0.15, "none");
  PK.sfx("route", tTh + 0.62, { gain_db: -14, pan: 0.45 });
  tryOut("thermal", ghTh, tTh + 1.05, 0.28);
  // Extend watch: all of it; the ring closes with one pulse
  var tW = tTh + 1.15; // about 69.1
  var ghW = tryIn("watch", tW, 0.38);
  var tFull = tW + 0.38;
  pulse(cs.body, tFull, 1.05, 0.3);
  PK.sfx("lock", tFull, { gain_db: -4, pan: 0.5 });
  fadeOut(labP, tFull - 0.02, 0.12);
  var labF = hide(mono(Llb, "Full", cM[0], SY1, LAB, { anchor: "middle" }));
  FT(labF, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.15, ease: "power2.out" }, tFull + 0.08);
  // "checks whether the work is back inside": the verifier's corners land, a tick inside the bracket
  var tVer = tFull + 0.25;
  FT(verifier.body, { rotation: 0, svgOrigin: "0 0" }, { rotation: 45, svgOrigin: "0 0", duration: 0.4, ease: "power2.inOut" }, tVer - 0.15);
  var CO = PK_R + 7.5;
  var cornH = holder(Lcs);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (k) {
    var L = 9;
    PK.el("path", { d: "M" + f(k[0] * CO) + " " + f(k[1] * CO - k[1] * L) + " V" + f(k[1] * CO) + " H" + f(k[0] * CO - k[0] * L), fill: "none", stroke: C.rust, "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" }, cornH.s);
  });
  place(cornH.g, cM);
  hide(cornH.g);
  fadeIn(cornH.g, tVer, 0.12, "none");
  FT(cornH.s, { scale: 1.4, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.35, ease: "power3.out" }, tVer);
  var TI = 6.4; // 16 px inside the bracket
  var tick = undrawn(PK.el("path", { d: "M" + f(cM[0] + CO - TI - 10) + " " + f(cM[1] + CO - TI - 4) + " l3.2 3.4 l6.4 -7.2", fill: "none", stroke: C.rust, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, Lcs));
  draw(tick, tVer + 0.35, 0.15, "power2.out");
  PK.sfx("inspect", tVer, { gain_db: -10, pan: 0.5 });
  PK.sfx("resolve", tVer + 0.38, { gain_db: -5, pan: 0.5 });
  var labB = hide(mono(Llb, "Back inside", cM[0], SY2, LAB, { anchor: "middle" }));
  FT(labB, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.15, ease: "power2.out" }, tVer + 0.4);
  // Move weld to workshop also fills it (heavier cost, longer time): tried in the closed ring
  var tWs = tVer + 0.7; // about 70.45
  tryOut("watch", ghW, tWs, 0.3);
  var ghWs = tryIn("workshop", tWs + 0.05, 0.3);
  pulse(cs.body, tWs + 0.35, 1.03, 0.3);
  // previews only: the piece goes back to the shelf, the gap is open again
  var tRev = tWs + 0.5; // about 70.95
  fadeOut([labF, labB, prev, cornH.g, tick], tRev + 0.17, 0.15);
  tryOut("workshop", ghWs, tRev, 0.28);
  FT([eng.body, verifier.body], { rotation: function (i) { return i === 0 ? engTurn : 45; }, svgOrigin: "0 0" }, { rotation: 0, svgOrigin: "0 0", duration: 0.4, ease: "power2.inOut" }, tRev);
  PK.sfx("move", tRev, { gain_db: -14, dur: 0.3, pan: 0.55 });
  var tOutM = tRev + 0.2; // about 71.15
  handOut("mitigate", tOutM);
  closeDoor("mitigate", tOutM + 0.4);
  fadeOut([LIB].concat(RA.mitigate.map(function (a) { return a.name; }), SG_KEYS.map(function (k) { return W.safeguards[k].name; })), 71.3, 0.3);

  // ============================================================ TRANSFER (camera 71.3 to 72.2)
  // the risk owner's name would be cut by the frame edge in this close-up: it steps out for the shot
  fadeOut(W.real.labels.owner, 71.35, 0.3);
  fadeIn(W.real.labels.owner, 77.65, 0.3);
  var tFlyT = tOutM + 0.42;
  turnBead(ang(PDOCK, DOOR.transfer), tFlyT, 0.45);
  fly("mitigate", "transfer", tFlyT, 0.62); // back to the dock, just outside the Transfer door
  RA.transfer.forEach(function (a) {
    fadeIn(a.name, 72.2, 0.3);
  });
  var tT = PK.word("L12", "transfer");
  var tClearT = ownerOpens("transfer", tT - 0.02, 0.28, 0.25);
  var tInT = tClearT - 0.12;
  handIn("transfer", tInT);
  var cT = IN.transfer;
  // "simulated for now": the chip pulses; it says so plainly
  var tSim = PK.word("L12", "simulated");
  FT(RM.transfer.chip, { scale: CHIP_CLOSE, svgOrigin: CHIP_O }, { keyframes: [{ scale: CHIP_CLOSE * 1.1, duration: 0.15, ease: "power2.out" }, { scale: CHIP_CLOSE, duration: 0.3, ease: "power2.inOut" }], svgOrigin: CHIP_O }, tSim);
  PK.sfx("simulated", tSim, { gain_db: -4, pan: 0.6 });
  var noIns = hide(mono(Llb, "No insurer on Priora yet", 1320, 754, LAB, { fill: C.grey }));
  FT(noIns, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }, tSim + 0.25);
  // "outside capacity": one dashed thread from the gap to each hexagon; a dashed copy of the gap goes out by the ports
  var tAsk = PK.word("L12", "outside"); // 74.66
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
    var t = tAsk + 0.08 + i * 0.1;
    var out = d + " L1812 " + HEX_Y[i];
    fadeIn(gqH.g, t, 0.1, "none");
    PK.travel(tl, gqH.g, out, t, 0.85, "power1.inOut");
    FT(gqH.s, { scale: 1, svgOrigin: "0 0" }, { scale: 0.5, svgOrigin: "0 0", duration: 0.85, ease: "power1.in" }, t);
    fadeOut(gqH.g, t + 0.72, 0.13, "none");
    FT(RA.transfer[i].inner, { rotation: 0, svgOrigin: "0 0" }, { rotation: 120, svgOrigin: "0 0", duration: 0.7, ease: "power2.inOut" }, t + 0.5);
    PK.sfx("request", t, { gain_db: -10, pan: 0.55 + i * 0.1 });
  });
  // the answers: hollow dashed beads come back and land clustered at the packet, with plain labels
  var tAns = PK.word("L12", "capacity", 1, "end") - 0.05; // 75.76
  var TT = ["Eligibility", "Terms", "Safeguards", "Price"];
  var ROWS = [cT[1] - 30, cT[1] - 10, cT[1] + 10, cT[1] + 30];
  var BX = cT[0] + PK_R + 14; // first bead column
  var answerEls = [];
  TT.forEach(function (s, j) {
    var lab = hide(mono(Llb, s, BX + 3 * 12.5 + 2, ROWS[j] + LAB * 0.36, LAB));
    answerEls.push(lab);
    fadeIn(lab, tAns + j * 0.07 + 0.42, 0.15);
  });
  RA.transfer.forEach(function (hx, k) {
    var y = HEX_Y[k];
    var back = "M" + f(HEX_X - HEX_R) + " " + y + " L1620 " + y + " Q1606 " + y + " 1606 " + f(y - 14) + " L1606 632 C1580 604 " + f(gapTop[0] + 4) + " " + f(gapTop[1] - 46) + " " + pt(gapTop);
    pulse(hx.body, tAns + k * 0.1 - 0.05, 1.1);
    TT.forEach(function (s, j) {
      var price = j === 3;
      var spot = [BX + k * 12.5, ROWS[j]];
      var bh = holder(Llb);
      PK.el("circle", { cx: 0, cy: 0, r: price ? 4.8 : 3.2, fill: C.paper, stroke: C.rust, "stroke-width": 0.9, "stroke-dasharray": price ? "1.8 1.2" : "1.4 1.1" }, bh.s);
      if (price) PK.text(bh.s, "?", 0, LAB * 0.36, { font: "mono", size: LAB, fill: C.rust, anchor: "middle", weight: 600, upper: false, track: 0 });
      place(bh.g, [HEX_X - HEX_R, y]);
      hide(bh.g);
      var t = tAns + k * 0.1 + j * 0.07;
      tl.set(bh.g, { opacity: 1 }, t);
      PK.travel(tl, bh.g, back + " L" + pt(spot), t, 0.42, "power2.inOut");
      FT(bh.s, { scale: 0.6, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.42, ease: "power2.out" }, t);
      answerEls.push(bh.g);
    });
    PK.sfx("return", tAns + k * 0.1, { gain_db: -9, pan: 0.6 - k * 0.05 });
  });
  PK.sfx("simulated", tAns + 0.75, { gain_db: -14, pan: 0.6 });
  // held still to 77.3; then the packet comes back to Priora at the door, the door closes, all at the dock
  var tOutT = 77.25;
  fadeOut(answerEls.concat([askG, noIns]), tOutT, 0.15);
  fadeOut(RA.transfer.map(function (a) { return a.name; }), tOutT + 0.05, 0.2);
  handOut("transfer", tOutT);
  closeDoor("transfer", tOutT + 0.38);
  turnBead(BEAD_DOCK, tOutT + 0.2, 0.4);
  // the chip grows back so it reads at 18 px in the cooperating-rooms shot
  FT(RM.transfer.chip, { scale: CHIP_CLOSE, svgOrigin: CHIP_O }, { scale: CHIP_END, svgOrigin: CHIP_O, duration: 0.4, ease: "power2.inOut" }, 77.6);
});
