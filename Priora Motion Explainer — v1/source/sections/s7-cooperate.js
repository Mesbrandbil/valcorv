/*
  s7-cooperate (78 to 84 s): the rooms cooperate, the risk owner stays in control.
  The same packet moves between the rooms, carried by Priora; only the risk owner's black
  line opens a door. Mitigate: the packet goes into the open door and a thermal check piece
  from the library fills part of the gap (MITIGATE PART). The rest of the gap, a dashed
  sliver, lifts off and Priora carries it to Transfer: the dashed carriers return a PRICE
  tag with an empty value (WHAT WOULD IT COST?). Priora collects the packet and takes the
  sliver up to Retain, whose agents clamp it with its terms (KEEP THE REST). The sliver
  seats back in the packet, which is whole again: part mitigated, rest kept on purpose. On
  "The risk owner stays in control" the black line draws straight to the packet and closes
  a loop around it: RISK OWNER DECIDES. Labels fade, the doors close and the reaches of the
  black line withdraw as the camera pulls back.

  Contract at 78.0 (from s6): see docs/storyboard.md. If s3 to s6 are still placeholders,
  this section builds the 78.0 state itself (stand-ins, created only for missing handles).
  Hand-over to s8 (same builder): W.coop = { loop, thermalSeat, sliverSeat, clampSeat,
  packetEnd, prioraEnd, reaches, labels, ownerLabel }.
*/
PK.section("s7-cooperate", 78, 84, function (tl, W, ctx, S) {
  var G = PK.GEO,
    C = PK.C,
    f = PK.fmt;
  var T0 = 78.0;
  var cs = W.caseT;
  var A = W.agents;
  var ROOMS = W.rooms;
  var AR = G.alignR; // 40 (local units inside arcsG)
  var SC = 0.75; // arcsG scale of the packet
  var KEYS = ["siteRules", "insurer", "fire", "riskEng", "evidence"];
  var RK = ["retain", "mitigate", "transfer"];

  // ------------------------------------------------------------ small geometry helpers
  function sector(r0, r1, a0, a1) {
    var p0 = PK.polar(0, 0, r1, a0),
      p1 = PK.polar(0, 0, r1, a1),
      p2 = PK.polar(0, 0, r0, a1),
      p3 = PK.polar(0, 0, r0, a0);
    var lg = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return (
      "M" + f(p0[0]) + " " + f(p0[1]) + " A" + f(r1) + " " + f(r1) + " 0 " + lg + " 1 " + f(p1[0]) + " " + f(p1[1]) +
      " L" + f(p2[0]) + " " + f(p2[1]) + " A" + f(r0) + " " + f(r0) + " 0 " + lg + " 0 " + f(p3[0]) + " " + f(p3[1]) + " Z"
    );
  }
  function add(a, b) {
    return [a[0] + b[0], a[1] + b[1]];
  }
  function sub(a, b) {
    return [a[0] - b[0], a[1] - b[1]];
  }
  function dist(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
  function ang(a, b) {
    return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  }
  function pt(p) {
    return f(p[0]) + " " + f(p[1]);
  }
  function door(k) {
    return G.roomDoor(k); // [x, y] of the left-wall door
  }
  // centre of a group's own drawing, in its local units (for svgOrigin)
  function localCentre(g) {
    var b = null;
    try {
      b = g.getBBox();
    } catch (e) {}
    if (b && (b.width || b.height)) return [b.x + b.width / 2, b.y + b.height / 2];
    return [0, 0];
  }
  // world position of a group placed with GSAP x/y, plus the centre of its own drawing
  function posOf(g) {
    var x = gsap.getProperty(g, "x") || 0,
      y = gsap.getProperty(g, "y") || 0;
    var b = null;
    try {
      b = g.getBBox();
    } catch (e) {}
    if (b && (b.width || b.height)) return [x + b.x + b.width / 2, y + b.y + b.height / 2];
    return [x, y];
  }

  // ------------------------------------------------------------ stand-ins (only for handles other sections have not made yet)
  var BP0 = [1262, 600]; // branch point of the risk owner's line (s6)
  var gapA = W.gap || { a0: 234, a1: 306, r: AR };

  if (!W.align) {
    // s3/s4 not built yet: panel drawn, door open, five aligned agents, aligned arcs, route, record
    var made = {};
    KEYS.forEach(function (k) {
      var a = G.agents[k].aligned;
      made[k] = PK.el("path", { d: PK.arc(0, 0, AR, a - 36, a + 36), fill: "none", stroke: C.rust, "stroke-width": 3, "stroke-linecap": "butt" }, cs.arcsG);
      gsap.set(made[k], { opacity: 0 });
    });
    W.align = { arcs: made };
    var P = W.panel;
    tl.set(P.walls, { drawSVG: "0% 100%" }, T0);
    tl.set([P.leafA, P.leafB, P.jambs, P.title, P.sub], { opacity: 1 }, T0);
    tl.set(P.leafA, { y: -G.panel.gap / 2 + 0.01 }, T0);
    tl.set(P.leafB, { y: G.panel.gap / 2 - 0.01 }, T0);
    P.slots.forEach(function (s) {
      tl.set(s.el, { opacity: 0 }, T0);
    });
    KEYS.forEach(function (k) {
      var p = G.slot(G.agents[k].aligned);
      tl.set(A[k].g, { x: p[0], y: p[1], opacity: 1 }, T0);
      tl.set(A[k].body, { rotation: 0, scale: 1, svgOrigin: "0 0" }, T0);
      tl.set(A[k].label, { opacity: 1 }, T0);
    });
    tl.set(W.route, { drawSVG: "0% 100%" }, T0);
    tl.set(W.record.spine, { drawSVG: "0% 100%" }, T0);
    if (!W.record.ticks.firstElementChild) {
      var tick0 = PK.el("path", { d: "M" + (G.record.x0 + 12) + " " + (G.record.y - 7) + " V" + (G.record.y + 7), class: "pk-thread" }, W.record.ticks);
      gsap.set(tick0, { opacity: 0 });
      tl.set(tick0, { opacity: 1 }, T0);
    }
    tl.set(W.spark, { opacity: 0.8 }, T0);
  }
  if (!W.gap) {
    // s5 not built yet: the deviation left the insurer tilted and outward, the packet with its gap
    W.gap = gapA;
    var insP0 = G.slot(G.agents.insurer.aligned);
    tl.set(A.insurer.g, { x: insP0[0], y: insP0[1] - 8, opacity: 1 }, T0);
    tl.set(A.insurer.body, { rotation: 12, svgOrigin: "0 0" }, T0);
  }
  if (!W.roomAgents) {
    // s6 not built yet: three rooms drawn and closed, their agents in place
    RK.forEach(function (k) {
      var ch = ROOMS[k];
      tl.set(ch.walls, { drawSVG: "0% 100%" }, T0);
      tl.set([ch.leafA, ch.leafB, ch.jambs, ch.name], { opacity: 1 }, T0);
    });
    tl.set(ROOMS.transfer.chip, { opacity: 1 }, T0);
    var NS = 9.6;
    var mk = function (kind, x, y, name) {
      var t = kind === "carrier" ? PK.glyph.carrier(W.L.tokens, 22) : PK.glyph.roomAgent(W.L.tokens, kind, 18);
      gsap.set(t.g, { x: x, y: y, opacity: 0 });
      tl.set(t.g, { opacity: 1 }, T0);
      if (name) {
        t.label = PK.text(t.g, name, 0, kind === "carrier" ? 24 : 24, { font: kind === "carrier" ? "mono" : "sans", size: NS, weight: 500, fill: C.ink2, anchor: "middle" });
      }
      return t;
    };
    var rr = G.rooms;
    W.roomAgents = {
      retain: [mk("policy", 1560, rr.retain.y + 78, "Policy"), mk("authority", 1640, rr.retain.y + 78, "Authority"), mk("record", 1720, rr.retain.y + 78, "Record")],
      mitigate: [mk("eng", 1470, rr.mitigate.y + 52), mk("eng", 1520, rr.mitigate.y + 52)],
      transfer: [mk("carrier", 1714, rr.transfer.y + 62, "Sim"), mk("carrier", 1714, rr.transfer.y + 100, ""), mk("carrier", 1660, rr.transfer.y + 81, "")],
    };
  }
  if (!W.safeguards) {
    var railY = G.rooms.mitigate.y + 132;
    var rail = PK.el("path", { d: "M1580 " + railY + " H1752", class: "pk-hair-soft" }, W.L.chambers);
    gsap.set(rail, { opacity: 0 });
    tl.set(rail, { opacity: 1 }, T0);
    var pieceSpec = { watch: [234, 306], thermal: [235.5, 276.2], workshop: [234, 306] };
    W.safeguards = {};
    ["watch", "thermal", "workshop"].forEach(function (k, i) {
      var g = PK.g(W.L.tokens);
      var sp = pieceSpec[k];
      var mid = PK.polar(0, 0, AR * SC, (sp[0] + sp[1]) / 2);
      var inner = PK.g(g, { transform: "translate(" + f(-mid[0]) + " " + f(-mid[1]) + ") scale(" + SC + ")" });
      var piece = PK.el("path", { d: sector(34.5, 45.5, sp[0], sp[1]), fill: C.rustPale, stroke: C.rust, "stroke-width": 1.4, "stroke-linejoin": "round" }, inner);
      gsap.set(g, { x: 1608 + i * 58, y: railY - 7, opacity: 0 });
      tl.set(g, { opacity: 1 }, T0);
      W.safeguards[k] = { g: g, piece: piece };
    });
  }
  if (!W.branches) {
    // the risk owner's line: trunk from the hand to the branch point, dashed branches to the three doors
    W.branches = {};
    RK.forEach(function (k) {
      var d = door(k);
      var pth = PK.el("path", { d: "M" + pt(BP0) + " C" + f(BP0[0]) + " " + f(BP0[1] + (d[1] - BP0[1]) * 0.55) + " " + f(d[0] - 26) + " " + f(d[1]) + " " + pt(d), class: "pk-decision-dash" }, W.L.routes);
      gsap.set(pth, { opacity: 0 });
      tl.set(pth, { opacity: 1 }, T0);
      W.branches[k] = pth;
    });
    var trunk = "M" + pt(G.ownerHand) + " H1226 C1250 710 " + f(BP0[0]) + " 676 " + pt(BP0);
    tl.set(W.decision, { attr: { d: trunk } }, T0 - 0.01);
    tl.set(W.decision, { opacity: 1, drawSVG: "0% 100%" }, T0);
  }

  // ------------------------------------------------------------ the branch point and the reaches of the black line
  // A reach is a solid black line that follows a dashed branch from the branch point into a door.
  function samplePath(el, n) {
    var L = el.getTotalLength(),
      out = [];
    for (var i = 0; i <= n; i++) {
      var q = el.getPointAtLength((L * i) / n);
      out.push([q.x, q.y]);
    }
    return out;
  }
  var branchPts = {};
  RK.forEach(function (k) {
    var pts = samplePath(W.branches[k], 64);
    // orient each branch from the branch point to the door
    if (dist(pts[0], door(k)) < dist(pts[pts.length - 1], door(k))) pts.reverse();
    branchPts[k] = pts;
  });
  var BP = [
    (branchPts.retain[0][0] + branchPts.mitigate[0][0] + branchPts.transfer[0][0]) / 3,
    (branchPts.retain[0][1] + branchPts.mitigate[0][1] + branchPts.transfer[0][1]) / 3,
  ];
  var reach = {};
  RK.forEach(function (k) {
    var d = door(k);
    var pts = branchPts[k];
    var s = "M" + pt(pts[0]);
    for (var i = 1; i < pts.length; i++) s += " L" + pt(pts[i]);
    s += " L" + f(d[0] + 12) + " " + f(d[1]);
    reach[k] = PK.el("path", { d: s, class: "pk-decision" }, W.L.routes);
    gsap.set(reach[k], { drawSVG: "0% 0%" });
  });

  // ------------------------------------------------------------ contract at 78.0 (everything this section animates)
  var Q0 = [1200, 480],
    P0 = [1200, 528];
  tl.set(W.priora.g, { x: Q0[0], y: Q0[1], opacity: 1 }, T0);
  tl.set(W.priora.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(W.priora.beadG, { rotation: 0, svgOrigin: "0 0" }, T0);
  tl.set([W.priora.orbit, W.priora.beadG], { opacity: 1 }, T0);
  tl.set(W.priora.label, { opacity: 0 }, T0);
  tl.set(cs.g, { x: P0[0], y: P0[1], opacity: 1 }, T0);
  tl.set(cs.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(cs.arcsG, { scale: SC, svgOrigin: "0 0" }, T0);
  KEYS.forEach(function (k) {
    tl.set(W.align.arcs[k], { opacity: k === "insurer" ? 0 : 1 }, T0);
  });
  if (W.align.insurerDashed) tl.set(W.align.insurerDashed, { opacity: 0 }, T0);
  RK.forEach(function (k) {
    tl.set([ROOMS[k].leafA, ROOMS[k].leafB], { x: 0, y: 0 }, T0);
  });
  if (W.ownerDecides) tl.set(W.ownerDecides, { opacity: 0 }, T0);
  if (W.caseLabel) tl.set(W.caseLabel, { opacity: 0 }, T0);

  // ------------------------------------------------------------ the pieces: thermal check (fills part of the gap) and the rest (a dashed sliver)
  var g0 = gapA.a0,
    g1 = gapA.a1,
    gw = g1 - g0;
  var thA = [g0 + 1.5, g0 + gw * 0.6 - 1]; // about 60 % of the gap
  var slA = [g0 + gw * 0.6 + 1, g1 - 1.5]; // the remaining 40 %
  var TR0 = 34.5,
    TR1 = 45.5;
  var thMid = PK.polar(0, 0, AR * SC, (thA[0] + thA[1]) / 2); // world offset of each piece's centre from the packet centre
  var slMid = PK.polar(0, 0, AR * SC, (slA[0] + slA[1]) / 2);
  var thD = sector(TR0, TR1, thA[0], thA[1]);
  var slD = sector(TR0, TR1, slA[0], slA[1]);
  var clampD =
    "M" + pt(PK.polar(0, 0, TR0 - 1.5, slA[0] - 3.5)) + " L" + pt(PK.polar(0, 0, TR1 + 4.5, slA[0] - 3.5)) +
    " A" + f(TR1 + 4.5) + " " + f(TR1 + 4.5) + " 0 0 1 " + pt(PK.polar(0, 0, TR1 + 4.5, slA[1] + 3.5)) +
    " L" + pt(PK.polar(0, 0, TR0 - 1.5, slA[1] + 3.5));
  function termTicks(parent) {
    // the terms written on the clamp: four short marks (exposure, authority, conditions, expiry)
    var g = PK.g(parent);
    for (var i = 0; i < 4; i++) {
      var a = slA[0] + ((i + 0.5) * (slA[1] - slA[0])) / 4;
      PK.el("path", { d: "M" + pt(PK.polar(0, 0, TR1 + 4.5, a)) + " L" + pt(PK.polar(0, 0, TR1 + 10, a)), fill: "none", stroke: C.rust, "stroke-width": 1.6, "stroke-linecap": "round" }, g);
    }
    return g;
  }
  var tileStyle = { fill: C.rustPale, stroke: C.rust, "stroke-width": 1.4, "stroke-linejoin": "round" };
  var sliverStyle = { fill: C.paper, stroke: C.rust, "stroke-width": 1.5, "stroke-linejoin": "round", "stroke-dasharray": "3.2 2.4" };
  var clampStyle = { fill: "none", stroke: C.rust, "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round" };

  // seated copies inside the packet's arcs (they travel with the packet in s8)
  var thermalSeat = PK.el("path", Object.assign({ d: thD }, tileStyle), cs.arcsG);
  var sliverSeatG = PK.g(cs.arcsG);
  var sliverSeat = PK.el("path", Object.assign({ d: slD }, sliverStyle), sliverSeatG);
  var clampSeat = PK.g(sliverSeatG);
  PK.el("path", Object.assign({ d: clampD }, clampStyle), clampSeat);
  termTicks(clampSeat);
  gsap.set([thermalSeat, sliverSeatG, clampSeat], { opacity: 0 });

  // the thermal check piece, travelling from the library to the packet
  var thermT = PK.g(W.L.case);
  var thermTi = PK.g(thermT, { transform: "scale(" + SC + ")" });
  PK.el("path", Object.assign({ d: thD }, tileStyle), thermTi);
  gsap.set(thermT, { opacity: 0 });

  // the sliver, carried by Priora (a child of Priora's group: it rides with it)
  var slRide = PK.g(W.priora.g);
  var slRideI = PK.g(slRide, { transform: "scale(" + SC + ")" });
  PK.el("path", Object.assign({ d: slD }, sliverStyle), slRideI);
  var clampRide = PK.g(slRideI);
  PK.el("path", Object.assign({ d: clampD }, clampStyle), clampRide);
  termTicks(clampRide);
  gsap.set(slRide, { opacity: 0 });
  gsap.set(clampRide, { opacity: 0 });
  W.priora.g.insertBefore(slRide, W.priora.body); // under Priora's body

  // ------------------------------------------------------------ positions
  var dM = door("mitigate"),
    dT = door("transfer"),
    dR = door("retain");
  var PM = [dM[0] + 22, dM[1]]; // the packet in Mitigate's open door (the ring just fits the door)
  var QM = [1232, 462]; // Priora at the threshold, outside the room
  var QT = [1214, 634];
  var ST = [dT[0] + 18, dT[1]]; // the sliver presented in Transfer's door
  var QR = [1244, 302];
  var SR = [dR[0] + 18, dR[1]];
  var PR = [1214, 388]; // the packet, collected, waits by Retain's door for the decision
  var slDock = PK.polar(0, 0, 44, 0); // where the sliver rides, beside the bead (bead angle set per leg)
  function rideAt(local) {
    return sub(local, slMid); // group offset that puts the sliver's centre at `local`
  }

  var LS = PK.cam.px(80.2, 19.5); // label size for the rooms shot (about 19.5 px)

  // ------------------------------------------------------------ beat times (absolute film seconds)
  var tm = {
    reachM: 78.15, doorM: 78.36, goM: 78.3, goMd: 0.6,
    thermal: 78.84, thermalD: 0.42,
    reachT: 79.3, doorT: 79.52, lift: 79.36, goT: 79.46, goTd: 0.5,
    ask: 80.04, tag: 80.14, tagD: 0.36,
    reachR: 80.36, doorR: 80.6, goR: 80.52, goRd: 0.6,
    clampA: 81.2,
    decide: PK.word("L13", "risk") + 0.08,
    end: 82.62,
  };

  // ------------------------------------------------------------ 1. the black line opens Mitigate; Priora carries the packet in
  PK.drawOn(tl, reach.mitigate, tm.reachM, 0.36, "power2.inOut");
  PK.sfx("decision", tm.reachM, { gain_db: -10, pan: 0.35, part: "reach" });
  ROOMS.mitigate.open(tl, tm.doorM, 0.34);
  PK.sfx("door-open", tm.doorM, { gain_db: -9, pan: 0.45, room: "mitigate" });

  var aM = ang(QM, PM);
  tl.fromTo(W.priora.beadG, { rotation: 0, svgOrigin: "0 0" }, { rotation: aM, svgOrigin: "0 0", duration: 0.5, ease: "power2.inOut", immediateRender: false }, tm.goM);
  PK.travel(tl, W.priora.g, PK.curve(Q0, QM, -8), tm.goM, tm.goMd, "power2.inOut");
  PK.travel(tl, cs.g, PK.curve(P0, PM, 14), tm.goM + 0.04, tm.goMd, "power2.inOut");
  PK.sfx("move", tm.goM, { gain_db: -12, dur: tm.goMd, pan: 0.4 });

  // the library offers the thermal check: a copy flies into the gap and fills part of it
  var rail = W.safeguards.thermal;
  var railW = posOf(rail.g);
  var railL = localCentre(rail.g);
  tl.fromTo(rail.g, { scale: 1, svgOrigin: pt(railL) }, { keyframes: [{ scale: 1.2, duration: 0.14, ease: "power1.out" }, { scale: 1, duration: 0.3, ease: "power2.inOut" }], svgOrigin: pt(railL), immediateRender: false }, tm.thermal - 0.14);
  var thPath = PK.curve(sub(railW, thMid), PM, -50);
  tl.set(thermT, { x: railW[0] - thMid[0], y: railW[1] - thMid[1] }, tm.thermal - 0.01);
  tl.fromTo(thermT, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none", immediateRender: false }, tm.thermal);
  PK.travel(tl, thermT, thPath, tm.thermal, tm.thermalD, "power2.inOut");
  PK.trail(tl, W.L.trails, PK.curve(railW, add(PM, thMid), -50), tm.thermal, tm.thermalD);
  var tSeat = tm.thermal + tm.thermalD;
  tl.set(thermT, { opacity: 0 }, tSeat);
  tl.set(thermalSeat, { opacity: 1 }, tSeat);
  tl.fromTo(cs.body, { scale: 1, svgOrigin: "0 0" }, { keyframes: [{ scale: 1.05, duration: 0.12, ease: "power1.out" }, { scale: 1, duration: 0.3, ease: "power2.inOut" }], svgOrigin: "0 0", immediateRender: false }, tSeat - 0.02);
  PK.sfx("compare", tm.thermal - 0.12, { gain_db: -10, pan: 0.6 });
  PK.sfx("lock", tSeat, { gain_db: -7, pan: 0.45, size: "small" });

  var lM = PK.text(W.L.labels, "Mitigate part", dM[0] + 66, dM[1] + LS * 0.38, { font: "mono", size: LS, fill: C.rust, anchor: "start" });
  gsap.set(lM, { opacity: 0 });
  tl.fromTo(lM, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, tSeat - 0.16);

  // ------------------------------------------------------------ 2. the rest moves on: Priora carries the sliver to Transfer
  tl.fromTo(sliverSeatG, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none", immediateRender: false }, tSeat + 0.02);
  tl.set(sliverSeatG, { opacity: 0 }, tm.lift);
  tl.set(slRide, { opacity: 1 }, tm.lift);
  PK.sfx("packet", tm.lift, { gain_db: -12, pan: 0.45, size: "small" });

  PK.drawOn(tl, reach.transfer, tm.reachT, 0.34, "power2.inOut");
  PK.sfx("decision", tm.reachT, { gain_db: -11, pan: 0.35, part: "reach" });
  ROOMS.transfer.open(tl, tm.doorT, 0.3);
  PK.sfx("door-open", tm.doorT, { gain_db: -10, pan: 0.45, room: "transfer" });

  var aT = ang(QT, ST);
  var legT = "M" + pt(QM) + " C" + f(QM[0] - 46) + " " + f(QM[1] + 70) + " " + f(QT[0] - 30) + " " + f(QT[1] - 60) + " " + pt(QT);
  PK.travel(tl, W.priora.g, legT, tm.goT, tm.goTd, "power2.inOut");
  PK.trail(tl, W.L.trails, legT, tm.goT, tm.goTd);
  tl.fromTo(W.priora.beadG, { rotation: aM }, { rotation: aT, svgOrigin: "0 0", duration: tm.goTd, ease: "power2.inOut", immediateRender: false }, tm.goT);
  PK.sfx("move", tm.goT, { gain_db: -11, dur: tm.goTd, pan: 0.4 });
  // the sliver lifts off the packet and rides beside Priora's bead, then is presented in the open door
  var lift0 = sub(PM, QM);
  var dockT = rideAt(PK.polar(0, 0, 44, aT));
  var tArrT = tm.goT + tm.goTd;
  tl.fromTo(slRide, { x: lift0[0], y: lift0[1] }, { x: dockT[0], y: dockT[1], duration: tArrT - tm.lift - 0.06, ease: "power2.inOut", immediateRender: false }, tm.lift);
  var inT = rideAt(sub(ST, QT));
  tl.fromTo(slRide, { x: dockT[0], y: dockT[1] }, { x: inT[0], y: inT[1], duration: 0.2, ease: "power2.out", immediateRender: false }, tArrT - 0.06);

  // simulated: the dashed carriers are asked; a PRICE tag comes back with an empty value
  var hexes = W.roomAgents.transfer;
  var hexP = hexes.map(function (h) {
    return posOf(h.g);
  });
  var askLines = hexP.map(function (hp) {
    var d = "M" + pt([ST[0] + 10, ST[1]]) + " L" + pt([hp[0] - 15, hp[1]]);
    var l = PK.el("path", { d: d, class: "pk-thread-dash" }, W.L.threads);
    gsap.set(l, { opacity: 0 });
    return l;
  });
  askLines.forEach(function (l, i) {
    tl.fromTo(l, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "none", immediateRender: false }, tm.ask + i * 0.04);
  });
  PK.sfx("request", tm.ask, { gain_db: -10, pan: 0.6 });
  PK.sfx("simulated", tm.ask + 0.08, { gain_db: -14, pan: 0.7 });
  hexes.forEach(function (h, i) {
    tl.fromTo(h.body, { scale: 1, svgOrigin: "0 0" }, { keyframes: [{ scale: 1.16, duration: 0.1 }, { scale: 1, duration: 0.24, ease: "power2.inOut" }], svgOrigin: "0 0", immediateRender: false }, tm.ask + 0.1 + i * 0.04);
  });
  var TS = PK.cam.px(80.4, 18.5);
  var tagW = PK.measure("PRICE", "mono500", TS, 0.12) + TS * 3.6,
    tagH = TS * 1.75;
  var tag = PK.g(W.L.labels);
  PK.el("path", { d: PK.rectPath(0, -tagH / 2, tagW, tagH, 3), class: "pk-sim" }, tag);
  PK.text(tag, "Price", TS * 0.55, TS * 0.36, { font: "mono", size: TS, fill: C.rust });
  PK.el("path", { d: "M" + f(tagW - TS * 2.6) + " " + f(TS * 0.42) + " H" + f(tagW - TS * 0.55), fill: "none", stroke: C.rust, "stroke-width": 1, "stroke-linecap": "round" }, tag);
  gsap.set(tag, { opacity: 0 });
  var src = hexP[0];
  var tagEnd = [ST[0] + 24, ST[1] - tagH * 0.5 - 14];
  var tagStart = [src[0] - 18 - tagW, src[1]];
  tl.set(tag, { x: tagStart[0], y: tagStart[1] }, tm.tag - 0.01);
  tl.fromTo(tag, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none", immediateRender: false }, tm.tag);
  PK.travel(tl, tag, PK.curve(tagStart, tagEnd, -18), tm.tag, tm.tagD, "power2.inOut");
  PK.sfx("return", tm.tag + tm.tagD, { gain_db: -10, pan: 0.5 });
  var lT = PK.text(W.L.labels, "What would it cost?", ST[0] + 24, ST[1] + LS * 1.6, { font: "mono", size: LS, fill: C.rust, anchor: "start" });
  gsap.set(lT, { opacity: 0 });
  tl.fromTo(lT, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, tm.ask + 0.06);
  tl.fromTo(askLines, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, tm.tag + tm.tagD);

  // ------------------------------------------------------------ 3. Retain: Priora collects the packet and takes the sliver up; Retain keeps the rest
  PK.drawOn(tl, reach.retain, tm.reachR, 0.36, "power2.inOut");
  PK.sfx("decision", tm.reachR, { gain_db: -11, pan: 0.35, part: "reach" });
  ROOMS.retain.open(tl, tm.doorR, 0.3);
  PK.sfx("door-open", tm.doorR, { gain_db: -10, pan: 0.45, room: "retain" });

  var aR = ang(QR, SR);
  var legR = "M" + pt(QT) + " C" + f(QT[0] - 44) + " " + f(QT[1] - 120) + " " + f(QR[0] - 70) + " " + f(QR[1] + 150) + " " + pt(QR);
  PK.travel(tl, W.priora.g, legR, tm.goR, tm.goRd, "power2.inOut");
  PK.trail(tl, W.L.trails, legR, tm.goR, tm.goRd);
  tl.fromTo(W.priora.beadG, { rotation: aT }, { rotation: aR, svgOrigin: "0 0", duration: tm.goRd, ease: "power2.inOut", immediateRender: false }, tm.goR);
  PK.sfx("move", tm.goR, { gain_db: -10, dur: tm.goRd, pan: 0.35 });
  var dockR = rideAt(PK.polar(0, 0, 44, aR));
  var tArrR = tm.goR + tm.goRd;
  tl.fromTo(slRide, { x: inT[0], y: inT[1] }, { x: dockR[0], y: dockR[1], duration: tm.goRd + 0.02, ease: "power2.inOut", immediateRender: false }, tm.goR - 0.06);
  var inR = rideAt(sub(SR, QR));
  tl.fromTo(slRide, { x: dockR[0], y: dockR[1] }, { x: inR[0], y: inR[1], duration: 0.2, ease: "power2.out", immediateRender: false }, tArrR - 0.04);
  // the packet leaves Mitigate's door as Priora passes and rides up with it
  var legPk = "M" + pt(PM) + " C" + f(PM[0] - 60) + " " + f(PM[1] + 4) + " " + f(PR[0] + 10) + " " + f(PR[1] + 60) + " " + pt(PR);
  PK.travel(tl, cs.g, legPk, tm.goR + 0.12, tm.goRd - 0.08, "power2.inOut");
  PK.sfx("move", tm.goR + 0.12, { gain_db: -14, dur: tm.goRd - 0.08, pan: 0.3, size: "case" });

  // the Retain agents attach the terms: three short threads, then the clamp
  var ra = W.roomAgents.retain;
  ra.forEach(function (a, i) {
    var ap = posOf(a.g);
    var d = PK.curve([ap[0] - 12, ap[1]], [SR[0] + 18, SR[1] - 4 + (i - 1) * 4], 12 + i * 6);
    var th = PK.thread(W.L.threads, d);
    gsap.set(th, { drawSVG: "0% 0%" });
    PK.drawOn(tl, th, tm.clampA + i * 0.04, 0.24, "power2.out");
    tl.fromTo(th, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, tm.clampA + 0.5);
    tl.fromTo(a.body, { scale: 1, svgOrigin: "0 0" }, { keyframes: [{ scale: 1.14, duration: 0.1 }, { scale: 1, duration: 0.24, ease: "power2.inOut" }], svgOrigin: "0 0", immediateRender: false }, tm.clampA + i * 0.04);
  });
  PK.sfx("inspect", tm.clampA, { gain_db: -12, pan: 0.6, agent: "retain" });
  var tClamp = tm.clampA + 0.24;
  var clampO = pt(PK.polar(0, 0, 40, (slA[0] + slA[1]) / 2));
  tl.fromTo(clampRide, { opacity: 0, scale: 1.3, svgOrigin: clampO }, { opacity: 1, scale: 1, svgOrigin: clampO, duration: 0.26, ease: "power3.out", immediateRender: false }, tClamp);
  PK.sfx("lock", tClamp, { gain_db: -6, pan: 0.45 });
  var lR = PK.text(W.L.labels, "Keep the rest", SR[0] + 24, SR[1] + LS * 1.6, { font: "mono", size: LS, fill: C.rust, anchor: "start" });
  gsap.set(lR, { opacity: 0 });
  tl.fromTo(lR, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, tClamp + 0.02);

  // the sliver, kept with its terms, seats back in the packet: whole again
  var tBack = tClamp + 0.3;
  var seatLocal = sub(PR, QR);
  tl.fromTo(slRide, { x: inR[0], y: inR[1] }, { x: seatLocal[0], y: seatLocal[1], duration: 0.32, ease: "power2.inOut", immediateRender: false }, tBack);
  var tWhole = tBack + 0.32;
  tl.set(slRide, { opacity: 0 }, tWhole);
  tl.set([sliverSeatG, clampSeat], { opacity: 1 }, tWhole);
  tl.fromTo(cs.body, { scale: 1, svgOrigin: "0 0" }, { keyframes: [{ scale: 1.06, duration: 0.12, ease: "power1.out" }, { scale: 1, duration: 0.3, ease: "power2.inOut" }], svgOrigin: "0 0", immediateRender: false }, tWhole - 0.02);
  PK.sfx("assemble", tWhole, { gain_db: -8, pan: 0.3, size: "small" });
  tl.fromTo(W.priora.beadG, { rotation: aR }, { rotation: ang(QR, PR), svgOrigin: "0 0", duration: 0.35, ease: "power2.inOut", immediateRender: false }, tBack);

  // ------------------------------------------------------------ 4. "The risk owner stays in control": the black line closes a loop around the packet
  var LR = 41;
  var loopStart = [PR[0], PR[1] + LR];
  var loopD = "M" + pt(BP) + " L" + pt(loopStart);
  for (var s = 1; s <= 4; s++) {
    var pa = PK.polar(PR[0], PR[1], LR, 90 + s * 92); // a little more than a full turn: it closes
    loopD += " A" + LR + " " + LR + " 0 0 1 " + pt(pa);
  }
  var loop = PK.el("path", { d: loopD, class: "pk-decision" }, W.L.routes);
  gsap.set(loop, { drawSVG: "0% 0%" });
  var tDec = Math.max(tm.decide, tWhole - 0.4);
  PK.drawOn(tl, loop, tDec, 0.8, "power3.inOut");
  PK.sfx("decision", tDec, { gain_db: -3, pan: 0.3, dur: 0.8 });
  PK.sfx("resolve", tDec + 0.78, { gain_db: -6, pan: 0.3 });
  var DS = PK.cam.px(82.2, 20);
  var lD = PK.text(W.L.labels, "Risk owner decides", G.owner[0], G.owner[1] - 112 - DS * 1.1, { font: "mono", size: DS, fill: C.ink, anchor: "middle" });
  gsap.set(lD, { opacity: 0 });
  tl.fromTo(lD, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", immediateRender: false }, tDec + 0.5);

  // ------------------------------------------------------------ 5. labels fade, doors close, the reaches withdraw (the loop stays for s8)
  var tEnd = tm.end;
  tl.fromTo([lM, lT, lR, tag], { opacity: 1 }, { opacity: 0, duration: 0.45, ease: "power1.in", immediateRender: false }, tEnd);
  RK.forEach(function (k, i) {
    ROOMS[k].close(tl, tEnd + 0.08 + i * 0.08, 0.34);
    PK.drawOff(tl, reach[k], tEnd + 0.1 + i * 0.08, 0.45, "power2.inOut", { to: "start" });
  });
  PK.sfx("door-close", tEnd + 0.1, { gain_db: -9, pan: 0.45 });

  W.coop = {
    loop: loop,
    loopCentre: PR,
    thermalSeat: thermalSeat,
    sliverSeat: sliverSeatG,
    clampSeat: clampSeat,
    packetEnd: PR,
    prioraEnd: QR,
    beadEnd: ang(QR, PR),
    ownerLabel: lD,
    branchPoint: BP,
  };
});
