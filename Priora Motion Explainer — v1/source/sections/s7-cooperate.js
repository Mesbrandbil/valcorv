/*
  s7-cooperate (78 to 84 s): the rooms cooperate; the risk owner stays in control. (cut 2)

  The camera lands at 78.9 and holds still to 83.1. On "carries" (79.07) Priora lifts the
  packet out of the risk owner's loop at the dock (the loop lets go) and carries it, grown
  to a readable 1.4x, to the Mitigate door. Only the risk owner's black line opens a door: it
  runs from the branch point through the door, the door opens for it and the line withdraws.
  Mitigate: the Thermal check piece slides off the shelf, out through the door and into the
  gap (solid); the gap narrows: MITIGATE PART. The rest of the gap is a dashed sliver.
  Redirect: a rust thread runs from the Mitigate door and bends into the Transfer door (the
  chamber redirects); the sliver rides it into Transfer; the carriers answer with a hollow
  dashed price bead marked "?": WHAT WOULD IT COST? A second redirect thread bends from the
  Transfer door up into Retain; the sliver rides it; the clamp bar bridges it: KEEP THE REST.
  The sliver comes back and seats in the packet. On "The risk owner stays in control" the
  black line runs from the branch point to the packet and closes a loop round it; one soft
  resolve pulse on the whole ring: RISK OWNER DECIDES. Held still to 83.1.

  Contract at 78.0 (docs/cut2-plan.md section 2) is tl.set below; stand-ins are built only for
  handles that are missing. Hand-over to s8 (same builder): W.coop = { loop, packetEnd,
  prioraEnd, beadEnd, packetScale, labels, branchPoint }.
*/
PK.section("s7-cooperate", 78, 84, function (tl, W, ctx, S) {
  var G = PK.GEO,
    C = PK.C,
    f = PK.fmt;
  var T0 = 78.0;
  var cs = W.caseT;
  var A = W.agents;
  var RM = W.rooms;
  var KEYS = ["siteRules", "insurer", "fire", "riskEng", "evidence"];
  var RK = ["retain", "mitigate", "transfer"];
  var ARC = 0.85; // the packet's arcsG scale (57.0 / 78.0 contract)
  var BIG = 1.4; // the packet's body scale while it travels in s7 (readable)

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
  function mul(a, k) {
    return [a[0] * k, a[1] * k];
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
  // the value a property has at film time t, read from the timeline's own tweens (the latest one
  // finished by t), so positions and shapes left by earlier sections are read correctly
  function valAt(el, prop, t, sub2) {
    var best = null,
      bestEnd = -1;
    tl.getTweensOf(el).forEach(function (tw) {
      var st = tw.startTime(),
        end = st + tw.duration();
      if (end > t + 1e-6 || end < bestEnd) return;
      var v = tw.vars,
        val;
      if (sub2) {
        if (v[prop] && v[prop][sub2] !== undefined) val = v[prop][sub2];
      } else if (v.motionPath && (prop === "x" || prop === "y")) {
        var mp = v.motionPath.path || v.motionPath;
        if (typeof mp === "string") {
          var q = MotionPathPlugin.getPositionOnPath(MotionPathPlugin.getRawPath(mp), v.motionPath.end !== undefined ? v.motionPath.end : 1);
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
      if (val !== undefined && val !== null) {
        best = val;
        bestEnd = end;
      }
    });
    if (best !== null) return best;
    return sub2 ? el.getAttribute(sub2) : gsap.getProperty(el, prop) || 0;
  }
  function xy(g, t) {
    return [valAt(g, "x", t === undefined ? T0 : t), valAt(g, "y", t === undefined ? T0 : t)];
  }
  function centreAt(g, t) {
    // world centre of a group's drawing at time t (its x/y plus the centre of its own bbox)
    var p = xy(g, t),
      b = null;
    try {
      b = g.getBBox();
    } catch (e) {}
    return b && (b.width || b.height) ? [p[0] + b.x + b.width / 2, p[1] + b.y + b.height / 2] : p;
  }
  // move every coordinate pair of an absolute M/L/C/Q path by an offset
  function shiftPath(d, off) {
    return d.replace(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, function (m, a, b) {
      return f(+a + off[0]) + " " + f(+b + off[1]);
    });
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
  function pulse(el, at, s, o) {
    FT(el, { scale: 1, svgOrigin: o || "0 0" }, { keyframes: [{ scale: s || 1.1, duration: 0.11, ease: "power1.out" }, { scale: 1, duration: 0.26, ease: "power2.inOut" }], svgOrigin: o || "0 0" }, at);
  }
  var LS = PK.cam.px(80, 19.5); // mono status labels in the held cooperation shot (78.9 to 83.1)
  function mono(str, x, y, o) {
    o = o || {};
    var t = PK.text(W.L.labels, str, x, y, { font: "mono", size: o.size || LS, fill: o.fill || C.rust, anchor: o.anchor || "start" });
    gsap.set(t, { opacity: 0 });
    return t;
  }
  function labelIn(el, at) {
    FT(el, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, at);
  }

  // ------------------------------------------------------------ geometry
  var DOCK = G.dock || [1228, 680],
    PDOCK = G.prioraDock || [1186, 612],
    BR0 = G.branch || [1276, 600];
  var DOOR = { retain: G.roomDoor("retain"), mitigate: G.roomDoor("mitigate"), transfer: G.roomDoor("transfer") };
  var gapA = W.gap || { a0: 234, a1: 306, r: G.alignR };

  // ------------------------------------------------------------ stand-ins (only for handles that are missing)
  if (!W.align) {
    var made = {};
    KEYS.forEach(function (k) {
      var a = G.agents[k].aligned;
      made[k] = PK.el("path", { d: PK.arc(0, 0, G.alignR, a - 36, a + 36), fill: "none", stroke: C.rust, "stroke-width": 3.2, "stroke-linecap": "butt" }, cs.arcsG);
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
      if (k !== "transfer") tl.set(ch.walls, { drawSVG: "0% 100%" }, T0);
      else tl.set(ch.walls, { attr: { style: "" } }, T0);
      tl.set([ch.leafA, ch.leafB, ch.jambs, ch.name], { opacity: 1 }, T0);
    });
    tl.set(RM.transfer.chip, { opacity: 1, scale: 1.25, svgOrigin: "1719 630" }, T0);
    var mk = function (t, p) {
      gsap.set(t.g, { x: p[0], y: p[1], opacity: 0 });
      tl.set(t.g, { opacity: 1 }, T0);
      return t;
    };
    W.roomAgents = {
      retain: [mk(PK.glyph.roomAgent(W.L.tokens, "policy", 18), [1430, 372]), mk(PK.glyph.roomAgent(W.L.tokens, "authority", 18), [1690, 298]), mk(PK.glyph.roomAgent(W.L.tokens, "record", 18), [1690, 364])],
      mitigate: [mk(PK.glyph.roomAgent(W.L.tokens, "eng", 18), [1468, 452]), mk(PK.glyph.roomAgent(W.L.tokens, "eng", 18), [1482, 560])],
      transfer: [mk(PK.glyph.carrier(W.L.tokens, 30), [1736, 674]), mk(PK.glyph.carrier(W.L.tokens, 30), [1736, 710]), mk(PK.glyph.carrier(W.L.tokens, 30), [1736, 746])],
    };
  }
  if (!W.safeguards) {
    var shelf = PK.el("path", { d: "M1540 506 H1766", class: "pk-hair" }, W.L.routes);
    gsap.set(shelf, { opacity: 0 });
    tl.set(shelf, { opacity: 1 }, T0);
    W.safeguards = {};
    [["thermal", 234, 277, 1580], ["watch", 234, 306, 1650], ["workshop", 234, 306, 1720]].forEach(function (s) {
      var g = PK.g(W.L.tokens, { class: "pk-token" });
      var r0 = 32.2,
        r1 = 35.8;
      var shape = sector(r0, r1, s[1], s[2]);
      PK.el("path", { d: shape, fill: C.shadow, transform: "translate(1 1.8)" }, g);
      var piece = PK.el("path", { d: shape, fill: C.rust }, g);
      var cx = -(PK.polar(0, 0, r1, s[1])[0] + PK.polar(0, 0, r1, s[2])[0]) / 2;
      gsap.set(g, { x: s[3] + cx, y: 506 + r0 * Math.sin((54 * Math.PI) / 180) + 0.9, opacity: 0 });
      tl.set(g, { opacity: 1 }, T0);
      W.safeguards[s[0]] = { g: g, piece: piece, a0: s[1], a1: s[2] };
    });
  }
  if (!W.decisionTip) {
    // the human's line as s5/s6 leave it: from the desk to the packet, once round it, ending at its right side
    var LR0 = 46;
    var dD = "M1180 711 C1196 711 1204 " + f(DOCK[1] + LR0) + " " + pt([DOCK[0], DOCK[1] + LR0]);
    for (var s0 = 1; s0 <= 4; s0++) dD += " A" + LR0 + " " + LR0 + " 0 0 1 " + pt(PK.polar(DOCK[0], DOCK[1], LR0, 90 + s0 * 90));
    dD += " C" + f(DOCK[0] + 30) + " " + f(DOCK[1] + LR0) + " " + f(DOCK[0] + LR0) + " " + f(DOCK[1] + 26) + " " + pt([DOCK[0] + LR0, DOCK[1]]);
    W.decisionTip = [DOCK[0] + LR0, DOCK[1]];
    tl.set(W.decision, { attr: { d: dD } }, T0 - 0.01);
    tl.set(W.decision, { opacity: 1, drawSVG: "0% 100%" }, T0);
  }
  if (!W.roomOwnerLines || !W.branches) {
    // trunk from the tip to the branch point, fine dotted grey branches to the doors, undrawn owner lines
    var tip = W.decisionTip;
    var trunk = PK.el("path", { d: "M" + pt(tip) + " C" + f(tip[0] + 4) + " " + f(tip[1] - 30) + " " + f(BR0[0]) + " " + f(BR0[1] + 40) + " " + pt(BR0), class: "pk-decision" }, W.L.routes);
    gsap.set(trunk, { opacity: 0 });
    tl.set(trunk, { opacity: 1 }, T0);
    var node = PK.el("circle", { cx: BR0[0], cy: BR0[1], r: 3, fill: C.ink }, W.L.routes);
    gsap.set(node, { opacity: 0 });
    tl.set(node, { opacity: 1 }, T0);
    var brD = function (k, extra) {
      var d = DOOR[k];
      return "M" + pt(BR0) + " C" + f(BR0[0]) + " " + f(BR0[1] + (d[1] - BR0[1]) * 0.7) + " " + f(d[0] - 18) + " " + f(d[1]) + " " + pt(d) + (extra ? " H" + f(d[0] + extra) : "");
    };
    W.branches = {};
    W.roomOwnerLines = {};
    RK.forEach(function (k) {
      var b = PK.el("path", { d: brD(k), fill: "none", stroke: C.grey, "stroke-width": 1.1, "stroke-linecap": "round", "stroke-dasharray": "0.1 3.4" }, W.L.routes);
      gsap.set(b, { opacity: 0 });
      tl.set(b, { opacity: 1 }, T0);
      W.branches[k] = b;
      var o = PK.el("path", { d: brD(k, 6), class: "pk-decision" }, W.L.routes);
      gsap.set(o, { drawSVG: "0% 0%" });
      W.roomOwnerLines[k] = o;
    });
  }
  var own = W.roomOwnerLines;
  var BP = BR0;
  try {
    var q0 = own.mitigate.getPointAtLength(0);
    BP = [q0.x, q0.y];
  } catch (e) {}

  // ------------------------------------------------------------ contract at 78.0 (everything this section animates)
  var beadDock = ang(PDOCK, DOCK);
  tl.set(W.priora.g, { x: PDOCK[0], y: PDOCK[1], opacity: 1 }, T0);
  tl.set(W.priora.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(W.priora.beadG, { rotation: beadDock, svgOrigin: "0 0", opacity: 1 }, T0);
  tl.set(W.priora.orbit, { opacity: 1 }, T0);
  tl.set(W.priora.label, { opacity: 0 }, T0);
  tl.set(cs.g, { x: DOCK[0], y: DOCK[1], opacity: 1 }, T0);
  tl.set(cs.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(cs.arcsG, { scale: ARC, svgOrigin: "0 0" }, T0);
  KEYS.forEach(function (k) {
    tl.set(W.align.arcs[k], { opacity: k === "insurer" ? 0 : 1 }, T0);
  });
  if (W.align.insurerDashed) tl.set(W.align.insurerDashed, { opacity: 0 }, T0);
  RK.forEach(function (k) {
    tl.set([RM[k].leafA, RM[k].leafB], { x: 0, y: 0, opacity: 1 }, T0);
    tl.set(own[k], { drawSVG: "0% 0%" }, T0);
  });
  tl.set(W.decision, { opacity: 1 }, T0);
  if (W.ownerDecides) tl.set(W.ownerDecides, { opacity: 0 }, T0);
  if (W.caseLabel) tl.set(W.caseLabel, { opacity: 0 }, T0);
  var ra = W.roomAgents;
  ra.retain.concat(ra.mitigate, ra.transfer).forEach(function (a) {
    tl.set(a.body, { scale: 1, svgOrigin: "0 0" }, T0);
  });

  // ------------------------------------------------------------ the pieces, drawn in the packet's arc units (inside arcsG)
  // world size = local x ARC x body scale. The gap is W.gap (local radius 40).
  var gR = gapA.r || 40,
    g0 = gapA.a0,
    g1 = gapA.a1;
  var th = W.safeguards.thermal;
  var thA = [g0 + 1, (th.a1 !== undefined ? th.a1 : g0 + (g1 - g0) * 0.6) - 0.5];
  var slA = [thA[1] + 2.5, g1 - 1];
  var thD = sector(gR - 2.4, gR + 2.4, thA[0], thA[1]);
  var slD = sector(gR - 3, gR + 3, slA[0], slA[1]);
  var CB = gR + 8.5; // the clamp bar's radius
  var clampD =
    "M" + pt(PK.polar(0, 0, gR + 3.5, slA[0] - 2.5)) + " L" + pt(PK.polar(0, 0, CB, slA[0] - 2.5)) +
    " A" + CB + " " + CB + " 0 0 1 " + pt(PK.polar(0, 0, CB, slA[1] + 2.5)) + " L" + pt(PK.polar(0, 0, gR + 3.5, slA[1] + 2.5));
  var slMidL = PK.polar(0, 0, gR, (slA[0] + slA[1]) / 2); // the sliver's centre in local units
  var thMidL = PK.polar(0, 0, gR, (thA[0] + thA[1]) / 2);
  function pieceSet(parent) {
    var thG = PK.g(parent);
    PK.el("path", { d: thD, fill: C.shadow, transform: "translate(0.9 1.5)" }, thG);
    PK.el("path", { d: thD, fill: C.rust }, thG);
    var slG = PK.g(parent);
    PK.el("path", { d: slD, fill: C.paper, stroke: C.rust, "stroke-width": 1.2, "stroke-dasharray": "2.2 1.6", "stroke-linejoin": "round" }, slG);
    var clG = PK.g(slG);
    PK.el("path", { d: clampD, fill: "none", stroke: C.rust, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, clG);
    return { th: thG, sl: slG, cl: clG };
  }
  // seated copies (they travel with the packet, also in s8)
  var seat = pieceSet(cs.arcsG);
  gsap.set([seat.th, seat.sl, seat.cl], { opacity: 0 });
  // travelling copies, positioned in world units: a group at the packet-centre-equivalent point, scaled like the packet
  function flyer(keep) {
    var g = PK.g(W.L.case);
    var sc = PK.g(g); // scale group (packet scale x arc scale)
    var set = pieceSet(sc);
    if (keep !== "th") set.th.remove();
    if (keep !== "sl") set.sl.remove();
    gsap.set(g, { opacity: 0 });
    return { g: g, sc: sc, set: set };
  }
  var thFly = flyer("th");
  var slFly = flyer("sl");
  var K = ARC * BIG; // local units to world units while the packet is big
  gsap.set(thFly.sc, { scale: K, svgOrigin: "0 0" });
  gsap.set(slFly.sc, { scale: K, svgOrigin: "0 0" });
  var SLBIG = 1.5; // the sliver is shown larger while it rides (at least 40 px)

  // ------------------------------------------------------------ positions and times
  var dM = DOOR.mitigate,
    dT = DOOR.transfer,
    dR = DOOR.retain;
  var PM = [1206, 508]; // the packet waits outside the Mitigate door (clear of the wall and the branches)
  var QM = [1130, 432]; // Priora beside it, outside the rooms
  var ST = [dT[0] + 52, dT[1]]; // the sliver inside Transfer, 52 units in from the door
  var SR = [dR[0] + 52, dR[1]];
  var slOff = mul(slMidL, K); // the sliver's centre offset from the packet centre (world, packet big)
  var thOff = mul(thMidL, K);
  var tm = {
    lift: PK.word("L13", "carries"), // 79.07
    goD: 0.44,
    openM: 79.1,
    thermal: 79.42, thermalD: 0.38,
    openT: 79.78,
    redirMT: 80.04, rideT: 80.14, rideTD: 0.4,
    ask: 80.5, bead: 80.56, beadD: 0.3,
    openR: 80.7,
    redirTR: 80.96, rideR: 81.06, rideRD: 0.42,
    clamp: 81.5,
    back: 81.78, backD: 0.3,
    decide: PK.word("L13", "owner"), // 81.80
    decideD: 0.6,
    end: 83.1,
  };

  // the black line opens a door: it runs from the branch point through the door, the door opens for
  // it, the line holds a moment and withdraws before anything goes through
  function opens(k, at) {
    PK.drawOn(tl, own[k], at, 0.28, "power2.inOut", { later: true });
    RM[k].open(tl, at + 0.22, 0.28);
    PK.drawOff(tl, own[k], at + 0.4, 0.3, "power2.inOut", { to: "start" });
    PK.sfx("door-open", at + 0.22, { gain_db: -8, pan: 0.5, room: k, by: "risk owner" });
  }
  function closes(k, at) {
    RM[k].close(tl, at, 0.3);
  }

  // ------------------------------------------------------------ 1. "carries": the loop lets go, Priora carries the packet to Mitigate
  // the human's loop at the dock opens: the line keeps its run from the desk to the tip, without the loop
  var decD = valAt(W.decision, "attr", T0, "d") || W.decision.getAttribute("d");
  var tLift = tm.lift;
  try {
    var dp = samplePath(decD, 240);
    var near = [];
    dp.forEach(function (p, i) {
      if (dist(p, DOCK) < 55) near.push(i);
    });
    if (near.length > 40) {
      var i1 = near[0],
        i2 = near[near.length - 1];
      var sweep = 0;
      for (var i = i1 + 1; i <= i2; i++) {
        var da = ang(DOCK, dp[i]) - ang(DOCK, dp[i - 1]);
        while (da > 180) da -= 360;
        while (da < -180) da += 360;
        sweep += Math.abs(da);
      }
      if (sweep > 300) {
        var nd = "M" + pt(dp[0]);
        for (var j = 2; j <= i1; j += 2) nd += " L" + pt(dp[j]);
        nd += " L" + pt(dp[i2]);
        for (var j2 = i2 + 2; j2 < dp.length; j2 += 2) nd += " L" + pt(dp[j2]);
        nd += " L" + pt(dp[dp.length - 1]);
        var noLoop = PK.el("path", { d: nd, class: "pk-decision" }, W.L.routes);
        W.L.routes.insertBefore(noLoop, W.decision);
        gsap.set(noLoop, { opacity: 0 });
        tl.set(noLoop, { opacity: 1 }, tLift);
        FT(W.decision, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.inOut" }, tLift + 0.04);
        W.decisionOpen = noLoop;
      }
    }
  } catch (e) {}

  var aM = ang(QM, PM);
  var legP = PK.curve(DOCK, PM, -40);
  var legQ = PK.curve(PDOCK, QM, -30);
  PK.travel(tl, cs.g, legP, tLift, tm.goD, "power2.inOut");
  PK.trail(tl, W.L.trails, legP, tLift, tm.goD, "power2.inOut");
  FT(cs.body, { scale: 1, svgOrigin: "0 0" }, { scale: BIG, svgOrigin: "0 0", duration: tm.goD, ease: "power2.inOut" }, tLift);
  PK.travel(tl, W.priora.g, legQ, tLift, tm.goD, "power2.inOut");
  FT(W.priora.beadG, { rotation: beadDock, svgOrigin: "0 0" }, { rotation: aM, svgOrigin: "0 0", duration: tm.goD, ease: "power2.inOut" }, tLift);
  PK.sfx("move", tLift, { gain_db: -10, dur: tm.goD, pan: 0.3, size: "case" });

  opens("mitigate", tm.openM);
  PK.sfx("decision", tm.openM, { gain_db: -9, dur: 0.28, pan: 0.35, part: "reach" });

  // Mitigate: the Thermal check piece slides off the shelf, out through the door, into the gap
  // the shelf piece's own centre (the object on the shelf may also carry its measures)
  var shelfC = centreAt(th.g, T0);
  try {
    var pb = th.piece.getBBox(),
      gp = xy(th.g, T0);
    shelfC = [gp[0] + pb.x + pb.width / 2, gp[1] + pb.y + pb.height / 2];
  } catch (e) {}
  var gapC = add(PM, thOff); // where the piece's centre lands
  var kShelf = 1;
  try {
    var pp = samplePath(th.piece.getAttribute("d"), 40),
      rr = 0;
    pp.forEach(function (q) {
      rr += Math.hypot(q[0], q[1]);
    });
    rr /= pp.length;
    kShelf = Math.max(0.5, Math.min(1, rr / (gR * K)));
  } catch (e) {}
  var thStartG = sub(shelfC, mul(thMidL, K * kShelf)); // the flyer's centre starts on the shelf piece, at its size
  FT(thFly.sc, { scale: K * kShelf, svgOrigin: "0 0" }, { scale: K, svgOrigin: "0 0", duration: tm.thermalD, ease: "power2.inOut" }, tm.thermal);
  var thPath = "M" + pt(thStartG) + " C" + f(thStartG[0] - 60) + " " + f(thStartG[1]) + " " + f(dM[0] + 40) + " " + f(dM[1]) + " " + pt([dM[0] - 2 - thOff[0], dM[1] - thOff[1]]) +
    " C" + f(dM[0] - 40 - thOff[0]) + " " + f(dM[1] - thOff[1]) + " " + f(PM[0] + 30) + " " + f(PM[1]) + " " + pt(PM);
  tl.set(thFly.g, { x: thStartG[0], y: thStartG[1] }, tm.thermal - 0.01);
  FT(thFly.g, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "none" }, tm.thermal);
  FT(th.g, { opacity: 1 }, { opacity: 0.35, duration: 0.2, ease: "none" }, tm.thermal);
  PK.travel(tl, thFly.g, thPath, tm.thermal, tm.thermalD, "power2.inOut");
  PK.trail(tl, W.L.trails, shiftPath(thPath, thOff), tm.thermal, tm.thermalD, "power2.inOut");
  var tSeat = tm.thermal + tm.thermalD;
  tl.set(thFly.g, { opacity: 0 }, tSeat);
  tl.set(seat.th, { opacity: 1 }, tSeat);
  FT(th.g, { opacity: 0.35 }, { opacity: 1, duration: 0.3, ease: "none" }, tSeat + 0.1);
  FT(cs.body, { scale: BIG }, { keyframes: [{ scale: BIG * 1.04, duration: 0.1, ease: "power1.out" }, { scale: BIG, duration: 0.22, ease: "power2.inOut" }], svgOrigin: "0 0" }, tSeat - 0.02);
  PK.sfx("compare", tm.thermal, { gain_db: -10, pan: 0.6 });
  PK.sfx("lock", tSeat, { gain_db: -6, pan: 0.45, size: "small" });
  var lM = mono("Mitigate part", dM[0] + 34, dM[1] + 58);
  labelIn(lM, tSeat - 0.06);
  // the rest of the gap shows as a dashed sliver
  FT(seat.sl, { opacity: 0 }, { opacity: 1, duration: 0.14, ease: "none" }, tSeat + 0.08);
  closes("mitigate", tm.redirMT + 0.5);

  // ------------------------------------------------------------ 2. Redirect: the Mitigate door sends the rest on to Transfer
  opens("transfer", tm.openT);
  // the redirect thread: out of the Mitigate door, bending down into the Transfer door
  var rMT = "M" + f(dM[0] + 14) + " " + f(dM[1] + 6) + " C" + f(dM[0] - 26) + " " + f(dM[1] + 8) + " " + f(dM[0] - 30) + " " + f(dT[1] - 6) + " " + f(dT[0] + 4) + " " + f(dT[1]) + " L" + pt(ST);
  var thrMT = PK.thread(W.L.threads, rMT);
  gsap.set(thrMT, { drawSVG: "0% 0%" });
  PK.drawOn(tl, thrMT, tm.redirMT, 0.34, "power2.out", { later: true });
  PK.sfx("route", tm.redirMT, { gain_db: -9, dur: 0.34, pan: 0.5 });
  // the sliver lifts off the packet, rides to the Mitigate door and along the thread into Transfer
  var sl0 = PM; // group at the packet centre: the flyer sits exactly on the seated sliver
  var doorM2 = [dM[0] + 14 - slOff[0], dM[1] + 6 - slOff[1]];
  var rideTpath = "M" + pt(sl0) + " C" + f(sl0[0] + 50) + " " + f(sl0[1] - 10) + " " + f(doorM2[0] - 30) + " " + f(doorM2[1]) + " " + pt(doorM2) +
    " " + shiftPath(rMT.replace(/^M[^C]+C/, "C"), mul(slOff, -1));
  tl.set(seat.sl, { opacity: 0 }, tm.rideT);
  tl.set(slFly.g, { x: sl0[0], y: sl0[1], opacity: 1 }, tm.rideT);
  var slO = pt(slMidL);
  FT(slFly.set.sl, { scale: 1, svgOrigin: slO }, { scale: SLBIG, svgOrigin: slO, duration: 0.3, ease: "power2.out" }, tm.rideT);
  PK.travel(tl, slFly.g, rideTpath, tm.rideT, tm.rideTD, "power2.inOut");
  PK.trail(tl, W.L.trails, shiftPath(rideTpath, slOff), tm.rideT, tm.rideTD, "power2.inOut");
  PK.sfx("packet", tm.rideT, { gain_db: -11, pan: 0.5, size: "small" });
  // the thread is cleared from its source end once the sliver is through
  PK.drawOff(tl, thrMT, tm.rideT + tm.rideTD - 0.02, 0.3, "power2.inOut", { to: "end" });

  // simulated: the carriers are asked; a hollow dashed price bead marked "?" comes back
  var hexes = ra.transfer;
  var hexC = hexes.map(function (h) {
    return xy(h.g);
  });
  var hMid = hexC[Math.floor(hexC.length / 2)] || [1726, 696];
  var askD = "M" + f(ST[0] + 18) + " " + f(ST[1] - 4) + " C" + f(ST[0] + 140) + " " + f(ST[1] - 8) + " " + f(hMid[0] - 140) + " " + f(hMid[1]) + " " + f(hMid[0] - 22) + " " + f(hMid[1]);
  var ask = PK.el("path", { d: askD, class: "pk-thread-dash" }, W.L.threads);
  gsap.set(ask, { opacity: 0 });
  FT(ask, { opacity: 0 }, { opacity: 1, duration: 0.14, ease: "none" }, tm.ask);
  hexes.forEach(function (h, i) {
    pulse(h.body, tm.ask + 0.06 + i * 0.04, 1.1);
  });
  PK.sfx("request", tm.ask, { gain_db: -10, pan: 0.65 });
  PK.sfx("simulated", tm.ask + 0.06, { gain_db: -14, pan: 0.7 });
  var BR = PK.cam.px(80, 11); // bead radius (22 px across)
  var bead = PK.g(W.L.labels);
  PK.el("circle", { cx: 0, cy: 0, r: f(BR), fill: C.paper, stroke: C.rust, "stroke-width": 1.2, "stroke-dasharray": "2.4 1.8" }, bead);
  PK.text(bead, "?", 0, LS * 0.36, { font: "mono", size: LS, fill: C.rust, anchor: "middle", upper: false, track: 0 });
  gsap.set(bead, { opacity: 0 });
  var beadEndP = [ST[0] + 34, ST[1] + 20];
  var beadD = "M" + f(hMid[0] - 22) + " " + f(hMid[1] + 4) + " C" + f(hMid[0] - 140) + " " + f(hMid[1] + 20) + " " + f(ST[0] + 150) + " " + f(ST[1] + 24) + " " + pt(beadEndP);
  tl.set(bead, { x: hMid[0] - 22, y: hMid[1] + 4 }, tm.bead - 0.01);
  FT(bead, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "none" }, tm.bead);
  PK.travel(tl, bead, beadD, tm.bead, tm.beadD, "power2.inOut");
  PK.sfx("return", tm.bead + tm.beadD, { gain_db: -9, pan: 0.55 });
  var lPrice = mono("Price", beadEndP[0] + BR + 6, beadEndP[1] + LS * 0.36);
  labelIn(lPrice, tm.bead + tm.beadD - 0.02);
  var lT = mono("What would it cost?", dT[0] + 34, dT[1] + 48);
  labelIn(lT, tm.bead + tm.beadD - 0.02);
  FT(ask, { opacity: 1 }, { opacity: 0, duration: 0.22, ease: "power1.in" }, tm.bead + tm.beadD - 0.12);
  closes("transfer", tm.rideR + 0.32);

  // ------------------------------------------------------------ 3. Retain: the rest goes up to Retain, the clamp bar bridges it
  opens("retain", tm.openR);
  var rTR = "M" + f(dT[0] + 14) + " " + f(dT[1] - 6) + " C" + f(dT[0] - 34) + " " + f(dT[1] - 12) + " " + f(dR[0] - 34) + " " + f(dR[1] + 12) + " " + f(dR[0] + 4) + " " + f(dR[1]) + " L" + pt(SR);
  var thrTR = PK.thread(W.L.threads, rTR);
  gsap.set(thrTR, { drawSVG: "0% 0%" });
  PK.drawOn(tl, thrTR, tm.redirTR, 0.36, "power2.out", { later: true });
  PK.sfx("route", tm.redirTR, { gain_db: -10, dur: 0.36, pan: 0.5 });
  var rideRpath = "M" + pt(sub(ST, slOff)) + " L" + pt(sub([dT[0] + 14, dT[1] - 6], slOff)) + " " + shiftPath(rTR.replace(/^M[^C]+C/, "C"), mul(slOff, -1));
  PK.travel(tl, slFly.g, rideRpath, tm.rideR, tm.rideRD, "power2.inOut");
  PK.trail(tl, W.L.trails, rTR, tm.rideR, tm.rideRD, "power2.inOut");
  PK.sfx("move", tm.rideR, { gain_db: -12, dur: tm.rideRD, pan: 0.5, size: "small" });
  PK.drawOff(tl, thrTR, tm.rideR + tm.rideRD - 0.02, 0.3, "power2.inOut", { to: "end" });
  // the Retain agents bring the clamp bar: short threads converge, the bar bridges the rest
  ra.retain.forEach(function (a, i) {
    var ap = xy(a.g);
    var to = [SR[0] + 14, SR[1] + 4];
    var d = PK.curve([ap[0] - 12, ap[1]], to, ap[1] < SR[1] ? 22 : -22);
    var thr = PK.thread(W.L.threads, d);
    gsap.set(thr, { drawSVG: "0% 0%" });
    PK.drawOn(tl, thr, tm.clamp - 0.22 + i * 0.03, 0.22, "power2.out", { later: true });
    PK.drawOff(tl, thr, tm.clamp + 0.12, 0.26, "power2.inOut", { to: "start" });
    pulse(a.body, tm.clamp - 0.22 + i * 0.03, 1.12);
  });
  var clO = pt(PK.polar(0, 0, CB, (slA[0] + slA[1]) / 2));
  gsap.set(slFly.set.cl, { opacity: 0 });
  FT(slFly.set.cl, { opacity: 0, scale: 1.3, svgOrigin: clO }, { opacity: 1, scale: 1, svgOrigin: clO, duration: 0.2, ease: "power3.out" }, tm.clamp);
  PK.sfx("lock", tm.clamp, { gain_db: -5, pan: 0.45 });
  var lR = mono("Keep the rest", dR[0] + 34, dR[1] - 26);
  labelIn(lR, tm.clamp + 0.02);
  // the rest, kept with its clamp, comes back and seats in the packet: whole again
  var backD = "M" + pt(sub(SR, slOff)) + " C" + f(dR[0] - 10 - slOff[0]) + " " + f(dR[1] - slOff[1]) + " " + f(PM[0] + 70) + " " + f(PM[1] - 60) + " " + pt(PM);
  PK.travel(tl, slFly.g, backD, tm.back, tm.backD, "power2.inOut");
  FT(slFly.set.sl, { scale: SLBIG, svgOrigin: slO }, { scale: 1, svgOrigin: slO, duration: tm.backD, ease: "power2.inOut" }, tm.back);
  var tWhole = tm.back + tm.backD;
  tl.set(slFly.g, { opacity: 0 }, tWhole);
  tl.set([seat.sl, seat.cl], { opacity: 1 }, tWhole);
  PK.sfx("assemble", tWhole, { gain_db: -7, pan: 0.3, size: "small" });
  closes("retain", tm.back + 0.1);
  var beadEnd = ang(QM, PM);

  // ------------------------------------------------------------ 4. "The risk owner stays in control": the line closes a loop round the packet
  var LR = 66; // clear of the packet (about 58 with the clamp bar at 1.4x)
  var dB = dist(BP, PM);
  var aTan = ang(PM, BP) + (Math.acos(LR / dB) * 180) / Math.PI; // tangent point: the line runs into the loop smoothly
  var tp = PK.polar(PM[0], PM[1], LR, aTan);
  var loopD = "M" + pt(BP) + " L" + pt(tp);
  for (var s1 = 1; s1 <= 4; s1++) loopD += " A" + LR + " " + LR + " 0 0 1 " + pt(PK.polar(PM[0], PM[1], LR, aTan + s1 * 93));
  var loop = PK.el("path", { d: loopD, class: "pk-decision" }, W.L.routes);
  gsap.set(loop, { drawSVG: "0% 0%" });
  PK.drawOn(tl, loop, tm.decide, tm.decideD, "power3.inOut", { later: true });
  PK.sfx("decision", tm.decide, { gain_db: -2, pan: 0.3, dur: tm.decideD });
  // one soft resolve pulse on the whole ring
  var tRes = Math.max(tm.decide + tm.decideD, tWhole) + 0.02;
  FT(cs.body, { scale: BIG }, { keyframes: [{ scale: BIG * 1.06, duration: 0.12, ease: "power1.out" }, { scale: BIG, duration: 0.18, ease: "power2.inOut" }], svgOrigin: "0 0" }, tRes);
  PK.sfx("resolve", tRes, { gain_db: -5, pan: 0.3 });
  var DS = PK.cam.px(82, 20);
  var lD = mono("Risk owner decides", G.owner[0], G.owner[1] - 112 - DS * 1.2, { size: DS, fill: C.ink, anchor: "middle" });
  labelIn(lD, tm.decide + 0.36);

  W.coop = {
    loop: loop,
    packetEnd: PM,
    prioraEnd: QM,
    beadEnd: beadEnd,
    packetScale: BIG,
    labels: [lM, lT, lPrice, bead, lR, lD],
    branchPoint: BP,
  };
});
