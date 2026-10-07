/*
  s7-cooperate (78 to 84 s): the rooms cooperate; the risk owner stays in control.

  The same packet moves between the rooms, carried by Priora, and only the risk owner's black
  line opens a door (it runs from the branch point along the dashed branch into the door).
  Mitigate: Priora carries the packet into the open door; a solid copy of the thermal check
  piece leaves the library rail and fills part of the gap (MITIGATE PART). The rest of the
  gap shows as a dashed sliver; it lifts off and Priora carries it to Transfer, where the
  dashed SIM carriers are asked and a PRICE tag comes back with an empty value (WHAT WOULD
  IT COST?). Priora takes the sliver up to Retain, collecting the packet on the way; the
  Retain agents clamp the sliver with its terms (KEEP THE REST) and it seats back in the
  packet, which is whole again: part mitigated, the rest kept on purpose. On "The risk owner
  stays in control" the black line swings from the room to the packet and closes a loop
  around it: RISK OWNER DECIDES. The rooms' labels fade as the camera pulls back.

  Contract at 78.0 (from s6, see docs/storyboard.md) is tl.set below. If s3 to s6 are still
  placeholders, stand-ins are built for the missing handles only (they mirror s6's geometry).
  Hand-over to s8 (same builder): W.coop = { loop, packetEnd, prioraEnd, beadEnd, ownerLabel }.
  At 84.0: Priora at prioraEnd (1210, 300), packet whole at packetEnd (1196, 392) with the
  thermal piece and the clamped sliver seated in its arcs, the black loop drawn around it,
  all three doors closed, owner lines withdrawn, room labels gone, "Risk owner decides" gone.
*/
PK.section("s7-cooperate", 78, 84, function (tl, W, ctx, S) {
  var G = PK.GEO,
    C = PK.C,
    f = PK.fmt;
  var T0 = 78.0;
  var cs = W.caseT;
  var A = W.agents;
  var RM = W.rooms;
  var SC = 0.75; // the packet's arcsG scale
  var KEYS = ["siteRules", "insurer", "fire", "riskEng", "evidence"];
  var RK = ["retain", "mitigate", "transfer"];

  // ------------------------------------------------------------ helpers
  function FT(el, from, to, at) {
    var v = {};
    for (var k in to) v[k] = to[k];
    v.immediateRender = false;
    tl.fromTo(el, from, v, at);
  }
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
  function ang(a, b) {
    return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  }
  function pt(p) {
    return f(p[0]) + " " + f(p[1]);
  }
  // the value a property has at film time t, read from the timeline's own tweens (the latest
  // one that has finished by t), so positions left by earlier sections are read correctly
  function valAt(el, prop, t) {
    var best = null,
      bestEnd = -1;
    tl.getTweensOf(el).forEach(function (tw) {
      var st = tw.startTime(),
        end = st + tw.duration();
      if (end > t + 1e-6 || end < bestEnd) return;
      var v = tw.vars,
        val;
      if (v.motionPath && (prop === "x" || prop === "y")) {
        var mp = v.motionPath.path || v.motionPath;
        if (typeof mp === "string") {
          var raw = MotionPathPlugin.getRawPath(mp);
          var q = MotionPathPlugin.getPositionOnPath(raw, v.motionPath.end !== undefined ? v.motionPath.end : 1);
          val = prop === "x" ? q.x : q.y;
        }
      } else if (v.keyframes && v.keyframes.length) {
        for (var i = v.keyframes.length - 1; i >= 0; i--) {
          if (v.keyframes[i][prop] !== undefined) {
            val = v.keyframes[i][prop];
            break;
          }
        }
      } else if (v[prop] !== undefined) val = v[prop];
      if (typeof val === "number") {
        best = val;
        bestEnd = end;
      }
    });
    return best !== null ? best : gsap.getProperty(el, prop) || 0;
  }
  function xy(g, t) {
    return [valAt(g, "x", t === undefined ? T0 : t), valAt(g, "y", t === undefined ? T0 : t)];
  }
  function pulse(el, at, s) {
    FT(el, { scale: 1, svgOrigin: "0 0" }, { keyframes: [{ scale: s || 1.1, duration: 0.11, ease: "power1.out" }, { scale: 1, duration: 0.26, ease: "power2.inOut" }], svgOrigin: "0 0" }, at);
  }
  function mono(str, x, y, size, fill, anchor) {
    var t = PK.text(W.L.labels, str, x, y, { font: "mono", size: size, fill: fill || C.rust, anchor: anchor || "start" });
    gsap.set(t, { opacity: 0 });
    return t;
  }
  function labelIn(el, at) {
    FT(el, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.32, ease: "power2.out" }, at);
  }

  // ------------------------------------------------------------ geometry shared with s6
  var B = [1250, 686]; // the branch point of the risk owner's line
  var DOOR = { retain: G.roomDoor("retain"), mitigate: G.roomDoor("mitigate"), transfer: G.roomDoor("transfer") };
  var SG_R0 = 28.2,
    SG_R1 = 31.8; // safeguard pieces: an annular sector on the gap's radius (world units)
  var gapA = W.gap || { a0: 234, a1: 306, r: G.alignR };

  // ------------------------------------------------------------ stand-ins (only for handles other sections have not made)
  if (!W.align) {
    var made = {};
    KEYS.forEach(function (k) {
      var a = G.agents[k].aligned;
      made[k] = PK.el("path", { d: PK.arc(0, 0, G.alignR, a - 36, a + 36), fill: "none", stroke: C.rust, "stroke-width": 3, "stroke-linecap": "butt" }, cs.arcsG);
      gsap.set(made[k], { opacity: 0 });
    });
    W.align = { arcs: made };
    var PN = W.panel;
    tl.set(PN.walls, { drawSVG: "0% 100%" }, T0);
    tl.set([PN.leafA, PN.leafB, PN.jambs, PN.title, PN.sub], { opacity: 1 }, T0);
    tl.set(PN.leafA, { y: -G.panel.gap / 2 + 0.01 }, T0);
    tl.set(PN.leafB, { y: G.panel.gap / 2 - 0.01 }, T0);
    PN.slots.forEach(function (s) {
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
      var tick0 = PK.el("path", { d: "M" + (G.record.x0 + 6) + " " + (G.record.y - 9) + " V" + (G.record.y + 9), fill: "none", stroke: C.rust, "stroke-width": 2.6, "stroke-linecap": "round" }, W.record.ticks);
      gsap.set(tick0, { opacity: 0 });
      tl.set(tick0, { opacity: 1 }, T0);
    }
    tl.set(W.spark, { opacity: 0.8 }, T0);
  }
  if (!W.gap) {
    W.gap = gapA;
    var insP0 = G.slot(G.agents.insurer.aligned);
    tl.set(A.insurer.g, { x: insP0[0], y: insP0[1] - 8, opacity: 1 }, T0);
    tl.set(A.insurer.body, { rotation: 12, svgOrigin: "0 0" }, T0);
  }
  if (!W.roomAgents) {
    RK.forEach(function (k) {
      var ch = RM[k];
      tl.set(ch.walls, { drawSVG: "0% 100%" }, T0);
      tl.set([ch.leafA, ch.leafB, ch.jambs, ch.name], { opacity: 1 }, T0);
    });
    tl.set(RM.transfer.chip, { opacity: 1, scale: 1.25, svgOrigin: "1719 630" }, T0);
    var mk = function (t, p) {
      gsap.set(t.g, { x: p[0], y: p[1], opacity: 0 });
      tl.set(t.g, { opacity: 1 }, T0);
      return t;
    };
    W.roomAgents = {
      retain: [mk(PK.glyph.roomAgent(W.L.tokens, "policy", 18), [1400, 372]), mk(PK.glyph.roomAgent(W.L.tokens, "authority", 18), [1690, 298]), mk(PK.glyph.roomAgent(W.L.tokens, "record", 18), [1690, 364])],
      mitigate: [mk(PK.glyph.roomAgent(W.L.tokens, "eng", 18), [1468, 452]), mk(PK.glyph.roomAgent(W.L.tokens, "eng", 18), [1482, 548])],
      transfer: [mk(PK.glyph.carrier(W.L.tokens, 22), [1738, 662]), mk(PK.glyph.carrier(W.L.tokens, 22), [1738, 700]), mk(PK.glyph.carrier(W.L.tokens, 22), [1738, 738])],
    };
  }
  if (!W.safeguards) {
    var rail = PK.el("path", { d: "M1512 490 H1766", class: "pk-hair" }, W.L.routes);
    gsap.set(rail, { opacity: 0 });
    tl.set(rail, { opacity: 1 }, T0);
    W.safeguards = {};
    [["thermal", 234, 277, 1555], ["watch", 234, 306, 1640], ["workshop", 234, 306, 1725]].forEach(function (s) {
      var g = PK.g(W.L.tokens, { class: "pk-token" });
      var shape = sector(SG_R0, SG_R1, s[1], s[2]);
      PK.el("path", { d: shape, fill: C.shadow, transform: "translate(1 1.8)" }, g);
      var piece = PK.el("path", { d: shape, fill: C.rust }, g);
      var cx = -(PK.polar(0, 0, SG_R1, s[1])[0] + PK.polar(0, 0, SG_R1, s[2])[0]) / 2;
      gsap.set(g, { x: s[3] + cx, y: 490 + SG_R0 * Math.sin((54 * Math.PI) / 180) + 0.9, opacity: 0 });
      tl.set(g, { opacity: 1 }, T0);
      W.safeguards[s[0]] = { g: g, piece: piece, a0: s[1], a1: s[2] };
    });
  }
  if (!W.branches) {
    var BR_D = {
      retain: "M1250 686 V352 Q1250 330 1272 330 H1300",
      mitigate: "M1250 530 Q1250 508 1272 508 H1300",
      transfer: "M1250 686 H1300",
    };
    W.branches = {};
    RK.forEach(function (k) {
      var p = PK.el("path", { d: BR_D[k], class: "pk-decision-dash" }, W.L.routes);
      gsap.set(p, { opacity: 0 });
      tl.set(p, { opacity: 1 }, T0);
      W.branches[k] = p;
    });
    var bNode = PK.el("circle", { cx: B[0], cy: B[1], r: 2.6, fill: C.ink }, W.L.routes);
    gsap.set(bNode, { opacity: 0 });
    tl.set(bNode, { opacity: 1 }, T0);
    tl.set(W.decision, { attr: { d: "M1174 710 H1226 Q1250 710 1250 686" } }, T0 - 0.01);
    tl.set(W.decision, { opacity: 1, drawSVG: "0% 100%" }, T0);
  }
  if (!W.roomOwnerLines) {
    var OWN_D = {
      retain: "M1250 686 V352 Q1250 330 1272 330 H1305",
      mitigate: "M1250 686 V530 Q1250 508 1272 508 H1305",
      transfer: "M1250 686 H1305",
    };
    W.roomOwnerLines = {};
    RK.forEach(function (k) {
      var p = PK.el("path", { d: OWN_D[k], class: "pk-decision" }, W.L.routes);
      gsap.set(p, { drawSVG: "0% 0%" });
      W.roomOwnerLines[k] = p;
    });
  }
  var own = W.roomOwnerLines;
  // the branch point is where the owner lines start
  try {
    var q0 = own.transfer.getPointAtLength(0);
    B = [q0.x, q0.y];
  } catch (e) {}

  // ------------------------------------------------------------ contract at 78.0 (everything this section animates)
  var Q0 = [1200, 480],
    P0 = [1200, 528];
  tl.set(W.priora.g, { x: Q0[0], y: Q0[1], opacity: 1 }, T0);
  tl.set(W.priora.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(W.priora.beadG, { rotation: 0, svgOrigin: "0 0", opacity: 1 }, T0);
  tl.set(W.priora.orbit, { opacity: 1 }, T0);
  tl.set(W.priora.label, { opacity: 0 }, T0);
  tl.set(cs.g, { x: P0[0], y: P0[1], opacity: 1 }, T0);
  tl.set(cs.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(cs.arcsG, { scale: SC, svgOrigin: "0 0" }, T0);
  KEYS.forEach(function (k) {
    tl.set(W.align.arcs[k], { opacity: k === "insurer" ? 0 : 1 }, T0);
  });
  if (W.align.insurerDashed) tl.set(W.align.insurerDashed, { opacity: 0 }, T0);
  RK.forEach(function (k) {
    tl.set([RM[k].leafA, RM[k].leafB], { x: 0, y: 0, opacity: 1 }, T0);
    tl.set(own[k], { drawSVG: "0% 0%" }, T0);
  });
  if (W.ownerDecides) tl.set(W.ownerDecides, { opacity: 0 }, T0);
  if (W.caseLabel) tl.set(W.caseLabel, { opacity: 0 }, T0);
  var ra = W.roomAgents;
  ra.retain.concat(ra.mitigate, ra.transfer).forEach(function (a) {
    tl.set(a.body, { scale: 1, svgOrigin: "0 0" }, T0);
  });

  // ------------------------------------------------------------ the pieces (world units, relative to the packet's centre)
  var thSrc = W.safeguards.thermal;
  var thD = thSrc.piece.getAttribute("d");
  var thA0 = thSrc.a0 !== undefined ? thSrc.a0 : 234,
    thA1 = thSrc.a1 !== undefined ? thSrc.a1 : 277;
  var slA = [thA1 + 2, gapA.a1]; // the rest of the gap
  var slD = sector(SG_R0 - 0.6, SG_R1 + 0.6, slA[0], slA[1]);
  var CL0 = 33.6,
    CL1 = 41;
  var clampD =
    "M" + pt(PK.polar(0, 0, CL0, slA[0] - 2)) + " L" + pt(PK.polar(0, 0, CL1, slA[0] - 2)) +
    " A" + CL1 + " " + CL1 + " 0 0 1 " + pt(PK.polar(0, 0, CL1, slA[1] + 2)) + " L" + pt(PK.polar(0, 0, CL0, slA[1] + 2));
  var thMid = PK.polar(0, 0, (SG_R0 + SG_R1) / 2, (thA0 + thA1) / 2);
  var slMid = PK.polar(0, 0, (SG_R0 + SG_R1) / 2, (slA[0] + slA[1]) / 2);
  var pieceStyle = { fill: C.rust };
  var sliverStyle = { fill: C.paper, stroke: C.rust, "stroke-width": 0.9, "stroke-dasharray": "1.6 1.4", "stroke-linejoin": "round" };
  var clampStyle = { fill: "none", stroke: C.rust, "stroke-width": 2.2, "stroke-linecap": "round", "stroke-linejoin": "round" };
  function pieceSet(parent, withClamp) {
    var th = PK.g(parent);
    PK.el("path", { d: thD, fill: C.shadow, transform: "translate(1 1.8)" }, th);
    PK.el("path", Object.assign({ d: thD }, pieceStyle), th);
    var sl = PK.g(parent);
    PK.el("path", Object.assign({ d: slD }, sliverStyle), sl);
    var cl = PK.g(sl);
    PK.el("path", Object.assign({ d: clampD }, clampStyle), cl);
    return { th: th, sl: sl, cl: cl };
  }
  // seated copies inside the packet's arcs (scaled back to world units): they travel with it in s8
  var seatG = PK.g(cs.arcsG, { transform: "scale(" + f(1 / SC) + ")" });
  var seat = pieceSet(seatG);
  gsap.set([seat.th, seat.sl, seat.cl], { opacity: 0 });
  // the thermal piece in flight from the rail
  var thFly = PK.g(W.L.case);
  var thFlyI = pieceSet(thFly);
  thFlyI.sl.remove();
  gsap.set(thFly, { opacity: 0 });
  // the sliver carried by Priora: a child of Priora's group, so it rides with it; shown larger while away
  var slRide = PK.g(W.priora.g);
  W.priora.g.insertBefore(slRide, W.priora.body);
  var slBig = PK.g(slRide);
  var ride = pieceSet(slBig);
  ride.th.remove();
  gsap.set(slRide, { opacity: 0 });
  gsap.set(ride.cl, { opacity: 0 });
  var BIG = 1.7;
  var slO = pt(slMid);

  // ------------------------------------------------------------ positions
  var dM = DOOR.mitigate,
    dT = DOOR.transfer,
    dR = DOOR.retain;
  var PM = [dM[0] + 22, dM[1]]; // the packet in Mitigate's open door (the ring just fits the doorway)
  var QM = [1212, 462]; // Priora at the threshold, outside the room
  var QT = [1206, 626];
  var ST = [dT[0] + 20, dT[1]]; // the sliver presented in Transfer's door
  var QR = [1210, 298];
  var SR = [dR[0] + 20, dR[1]];
  var PR = [1196, 392]; // the packet, collected, waits by Retain for the decision
  function rideAt(local) {
    return sub(local, slMid); // group offset that puts the sliver's centre at `local` (relative to Priora)
  }
  var LS = PK.cam.px(80.4, 19.5);

  // ------------------------------------------------------------ beat times (absolute film seconds)
  var tm = {
    openM: 78.12, openMd: 0.42,
    goM: 78.32, goMd: 0.62,
    thermal: 78.84, thermalD: 0.42,
    openT: 79.36, openTd: 0.3,
    lift: 79.54, goT: 79.58, goTd: 0.5,
    ask: 80.18, tag: 80.28, tagD: 0.36,
    outT: 80.6,
    openR: 80.42, openRd: 0.46,
    goR: 80.64, goRd: 0.6,
    pkUp: 80.76, pkUpD: 0.5,
    clampA: 81.34,
    back: 81.72, backD: 0.34,
    decide: Math.max(PK.word("L13", "risk") + 0.34, 81.62),
    end: 82.62,
  };
  function opens(k, at, dur, reachSound) {
    PK.drawOn(tl, own[k], at, dur, "power2.inOut", { later: true });
    RM[k].open(tl, at + dur * 0.78, 0.34);
    if (reachSound) PK.sfx("decision", at, { gain_db: -9, dur: dur, pan: 0.35, part: "reach" });
    PK.sfx("door-open", at + dur * 0.78, { gain_db: -8, pan: 0.5, room: k });
  }
  function withdraws(k, at, closeAt, sound) {
    PK.drawOff(tl, own[k], at, 0.4, "power2.inOut", { to: "start" });
    RM[k].close(tl, closeAt, 0.34);
    if (sound) PK.sfx("door-close", closeAt, { gain_db: -10, pan: 0.5, room: k });
  }

  // ------------------------------------------------------------ 1. Mitigate: the black line opens it; Priora carries the packet in
  opens("mitigate", tm.openM, tm.openMd, true);
  var aM = ang(QM, PM);
  FT(W.priora.beadG, { rotation: 0, svgOrigin: "0 0" }, { rotation: aM, svgOrigin: "0 0", duration: 0.5, ease: "power2.inOut" }, tm.goM);
  PK.travel(tl, W.priora.g, PK.curve(Q0, QM, -6), tm.goM, tm.goMd, "power2.inOut");
  PK.travel(tl, cs.g, PK.curve(P0, PM, 16), tm.goM + 0.04, tm.goMd, "power2.inOut");
  PK.sfx("move", tm.goM, { gain_db: -12, dur: tm.goMd, pan: 0.4 });

  // the library offers the thermal check: a solid copy leaves the rail and fills part of the gap
  var railP = xy(thSrc.g);
  FT(thSrc.g, { y: railP[1] }, { keyframes: [{ y: railP[1] - 4, duration: 0.16, ease: "power2.out" }, { y: railP[1], duration: 0.3, ease: "power2.inOut" }] }, tm.thermal - 0.16);
  var thPath = PK.curve(railP, PM, -46);
  tl.set(thFly, { x: railP[0], y: railP[1] }, tm.thermal - 0.01);
  FT(thFly, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none" }, tm.thermal);
  PK.travel(tl, thFly, thPath, tm.thermal, tm.thermalD, "power2.inOut");
  PK.trail(tl, W.L.trails, PK.curve(add(railP, thMid), add(PM, thMid), -46), tm.thermal, tm.thermalD);
  var tSeat = tm.thermal + tm.thermalD;
  tl.set(thFly, { opacity: 0 }, tSeat);
  tl.set(seat.th, { opacity: 1 }, tSeat);
  pulse(cs.body, tSeat - 0.02, 1.05);
  PK.sfx("compare", tm.thermal - 0.12, { gain_db: -10, pan: 0.6 });
  PK.sfx("lock", tSeat, { gain_db: -6, pan: 0.45, size: "small" });
  var lM = mono("Mitigate part", dM[0] + 36, dM[1] + 54, LS);
  labelIn(lM, tSeat - 0.14);

  // ------------------------------------------------------------ 2. Transfer: the rest lifts off; Priora carries it; a price is asked
  FT(seat.sl, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none" }, tSeat + 0.03);
  tl.set(seat.sl, { opacity: 0 }, tm.lift);
  tl.set(slRide, { opacity: 1 }, tm.lift);
  PK.sfx("packet", tm.lift, { gain_db: -12, pan: 0.45, size: "small" });
  opens("transfer", tm.openT, tm.openTd);
  var aT = ang(QT, ST);
  var legT = "M" + pt(QM) + " C" + f(QM[0] - 44) + " " + f(QM[1] + 60) + " " + f(QT[0] - 40) + " " + f(QT[1] - 70) + " " + pt(QT);
  PK.travel(tl, W.priora.g, legT, tm.goT, tm.goTd, "power2.inOut");
  PK.trail(tl, W.L.trails, legT, tm.goT, tm.goTd);
  FT(W.priora.beadG, { rotation: aM }, { rotation: aT, svgOrigin: "0 0", duration: tm.goTd, ease: "power2.inOut" }, tm.goT);
  PK.sfx("move", tm.goT, { gain_db: -11, dur: tm.goTd, pan: 0.4 });
  // the sliver lifts off the packet, grows a little to be seen, rides beside the bead, then is presented in the door
  var lift0 = sub(PM, QM);
  var dockT = rideAt(PK.polar(0, 0, 48, aT));
  var tArrT = tm.goT + tm.goTd;
  FT(slRide, { x: lift0[0], y: lift0[1] }, { x: dockT[0], y: dockT[1], duration: tArrT - tm.lift - 0.06, ease: "power2.inOut" }, tm.lift);
  FT(slBig, { scale: 1, svgOrigin: slO }, { scale: BIG, svgOrigin: slO, duration: 0.4, ease: "power2.out" }, tm.lift);
  var inT = rideAt(sub(ST, QT));
  FT(slRide, { x: dockT[0], y: dockT[1] }, { x: inT[0], y: inT[1], duration: 0.22, ease: "power2.out" }, tArrT - 0.06);

  // simulated: the dashed carriers are asked; a PRICE tag comes back, its value an empty line
  var hexes = ra.transfer;
  var hexP = hexes.map(function (h) {
    return xy(h.g);
  });
  var askG = PK.g(W.L.threads);
  hexP.forEach(function (hp) {
    PK.el("path", { d: "M" + f(ST[0] + 14) + " " + f(ST[1]) + " C" + f(ST[0] + 120) + " " + f(ST[1]) + " " + f(hp[0] - 120) + " " + f(hp[1]) + " " + f(hp[0] - 14) + " " + f(hp[1]), class: "pk-thread-dash" }, askG);
  });
  gsap.set(askG, { opacity: 0 });
  FT(askG, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none" }, tm.ask);
  hexes.forEach(function (h, i) {
    pulse(h.body, tm.ask + 0.12 + i * 0.05, 1.14);
  });
  PK.sfx("request", tm.ask, { gain_db: -10, pan: 0.6 });
  PK.sfx("simulated", tm.ask + 0.1, { gain_db: -14, pan: 0.7 });
  var TS = PK.cam.px(80.6, 18.5);
  var tagW = PK.measure("PRICE", "mono500", TS, 0.12) + TS * 0.9 + 18,
    tagH = TS * 1.95;
  var tag = PK.g(W.L.labels);
  PK.el("rect", { x: 0, y: -tagH / 2, width: tagW, height: tagH, rx: 2, fill: C.paper, stroke: C.rust, "stroke-width": 0.9, "stroke-dasharray": "2.2 1.5" }, tag);
  PK.text(tag, "Price", TS * 0.45, TS * 0.36, { font: "mono", size: TS, fill: C.rust });
  PK.el("path", { d: "M" + f(tagW - 17 - TS * 0.3) + " " + f(TS * 0.36) + " h15", fill: "none", stroke: C.rust, "stroke-width": 0.9 }, tag);
  gsap.set(tag, { opacity: 0 });
  var tagStart = [hexP[1][0] - 16 - tagW, hexP[1][1]];
  var tagEnd = [ST[0] + 24, ST[1]];
  tl.set(tag, { x: tagStart[0], y: tagStart[1] }, tm.tag - 0.01);
  FT(tag, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, tm.tag);
  PK.travel(tl, tag, PK.curve(tagStart, tagEnd, -16), tm.tag, tm.tagD, "power2.inOut");
  PK.sfx("return", tm.tag + tm.tagD, { gain_db: -9, pan: 0.5 });
  FT(askG, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in" }, tm.tag + tm.tagD - 0.05);
  var lT = mono("What would it cost?", dT[0] + 36, dT[1] - 26, LS);
  labelIn(lT, tm.ask + 0.08);

  // ------------------------------------------------------------ 3. Retain: up to Retain, collecting the packet; Retain keeps the rest
  withdraws("transfer", tm.outT + 0.08, tm.outT + 0.2, false);
  opens("retain", tm.openR, tm.openRd);
  var aR = ang(QR, SR);
  var legR = "M" + pt(QT) + " C" + f(QT[0] - 50) + " " + f(QT[1] - 120) + " " + f(QR[0] - 60) + " " + f(QR[1] + 140) + " " + pt(QR);
  PK.travel(tl, W.priora.g, legR, tm.goR, tm.goRd, "power2.inOut");
  PK.trail(tl, W.L.trails, legR, tm.goR, tm.goRd);
  FT(W.priora.beadG, { rotation: aT }, { rotation: aR, svgOrigin: "0 0", duration: tm.goRd, ease: "power2.inOut" }, tm.goR);
  PK.sfx("move", tm.goR, { gain_db: -10, dur: tm.goRd, pan: 0.35 });
  var dockR = rideAt(PK.polar(0, 0, 48, aR));
  var tArrR = tm.goR + tm.goRd;
  FT(slRide, { x: inT[0], y: inT[1] }, { x: dockR[0], y: dockR[1], duration: tm.goRd + 0.04, ease: "power2.inOut" }, tm.outT);
  var inR = rideAt(sub(SR, QR));
  FT(slRide, { x: dockR[0], y: dockR[1] }, { x: inR[0], y: inR[1], duration: 0.2, ease: "power2.out" }, tArrR - 0.04);
  // the packet leaves Mitigate's door as Priora passes and comes up with it
  var legPk = "M" + pt(PM) + " C" + f(PM[0] - 70) + " " + f(PM[1] + 6) + " " + f(PR[0] + 20) + " " + f(PR[1] + 70) + " " + pt(PR);
  PK.travel(tl, cs.g, legPk, tm.pkUp, tm.pkUpD, "power2.inOut");
  withdraws("mitigate", tm.pkUp + 0.12, tm.pkUp + 0.3, false);
  PK.sfx("door-close", tm.outT + 0.35, { gain_db: -11, pan: 0.5, rooms: "transfer, mitigate" });

  // the Retain agents attach its terms: three threads converge on the sliver, the clamp snaps on
  ra.retain.forEach(function (a, i) {
    var ap = xy(a.g);
    var to = [SR[0] + 16, SR[1] + 2];
    var d = PK.curve([ap[0] - 10, ap[1] + 4], to, ap[1] < SR[1] ? 22 : -22);
    var th = PK.thread(W.L.threads, d);
    gsap.set(th, { drawSVG: "0% 0%" });
    PK.drawOn(tl, th, tm.clampA + i * 0.04, 0.24, "power2.out", { later: true });
    FT(th, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in" }, tm.clampA + 0.46);
    pulse(a.body, tm.clampA + i * 0.04, 1.14);
  });
  var tClamp = tm.clampA + 0.22;
  var clO = pt(PK.polar(0, 0, CL1, (slA[0] + slA[1]) / 2));
  FT(ride.cl, { opacity: 0, scale: 1.35, svgOrigin: clO }, { opacity: 1, scale: 1, svgOrigin: clO, duration: 0.24, ease: "power3.out" }, tClamp);
  PK.sfx("lock", tClamp, { gain_db: -5, pan: 0.45 });
  var lR = mono("Keep the rest", dR[0] + 36, dR[1] - 26, LS);
  labelIn(lR, tClamp + 0.02);

  // the sliver, kept with its terms, seats back in the packet: whole again
  var seatLocal = sub(PR, QR);
  FT(slRide, { x: inR[0], y: inR[1] }, { x: seatLocal[0], y: seatLocal[1], duration: tm.backD, ease: "power2.inOut" }, tm.back);
  FT(slBig, { scale: BIG, svgOrigin: slO }, { scale: 1, svgOrigin: slO, duration: tm.backD, ease: "power2.inOut" }, tm.back);
  var tWhole = tm.back + tm.backD;
  tl.set(slRide, { opacity: 0 }, tWhole);
  tl.set([seat.sl, seat.cl], { opacity: 1 }, tWhole);
  pulse(cs.body, tWhole - 0.02, 1.06);
  PK.sfx("assemble", tWhole, { gain_db: -7, pan: 0.3, size: "small" });
  var beadEnd = ang(QR, PR);
  FT(W.priora.beadG, { rotation: aR }, { rotation: beadEnd, svgOrigin: "0 0", duration: 0.4, ease: "power2.inOut" }, tm.back);
  withdraws("retain", tm.back + 0.1, tm.back + 0.3, false);

  // ------------------------------------------------------------ 4. "The risk owner stays in control": the line closes a loop round the packet
  var LR = 46; // clear of the clamp (radius 41)
  var dB = Math.hypot(B[0] - PR[0], B[1] - PR[1]);
  var aCB = ang(PR, B);
  var aTan = aCB + (Math.acos(LR / dB) * 180) / Math.PI; // tangent point, so the line runs into the loop smoothly
  var tp = PK.polar(PR[0], PR[1], LR, aTan);
  var loopD = "M" + pt(B) + " L" + pt(tp);
  for (var s = 1; s <= 4; s++) {
    loopD += " A" + LR + " " + LR + " 0 0 1 " + pt(PK.polar(PR[0], PR[1], LR, aTan + s * 94)); // a little more than one turn: it closes
  }
  var loop = PK.el("path", { d: loopD, class: "pk-decision" }, W.L.routes);
  gsap.set(loop, { drawSVG: "0% 0%" });
  PK.drawOn(tl, loop, tm.decide, 0.8, "power3.inOut", { later: true });
  PK.sfx("decision", tm.decide, { gain_db: -2, pan: 0.3, dur: 0.8 });
  PK.sfx("resolve", tm.decide + 0.78, { gain_db: -6, pan: 0.3 });
  var DS = PK.cam.px(82.3, 20);
  var lD = mono("Risk owner decides", G.owner[0], G.owner[1] - 112 - DS * 1.1, DS, C.ink, "middle");
  labelIn(lD, tm.decide + 0.5);

  // ------------------------------------------------------------ 5. the rooms' labels fade as the camera pulls back
  FT([lM, lT, lR, tag], { opacity: 1 }, { opacity: 0, duration: 0.45, ease: "power1.in" }, tm.end);
  FT(lD, { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "power1.in" }, 83.05);

  W.coop = { loop: loop, packetEnd: PR, prioraEnd: QR, beadEnd: beadEnd, ownerLabel: lD, branchPoint: B };
});
