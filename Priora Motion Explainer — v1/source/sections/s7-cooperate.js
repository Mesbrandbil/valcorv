/*
  s7-cooperate (78 to 84 s): the rooms cooperate; the risk owner stays in control. (cut 3b)

  The camera pulls back to the cooperation shot (77.85 to 78.95) and holds still to 83.3.
  At 78.0 the risk owner's loop lets go of the packet (the loop unwinds to its tip and the line
  steps aside along the Transfer wall, leaving a bay beside the Transfer door). Then one mover
  at a time: Priora carries the packet to a door; the risk owner's black line opens the door
  and stays in it while the room answers; the answer seats on the packet, dashed (rooms only
  propose); the owner's choice prints beside the packet; the line withdraws and the door closes;
  only then the next carry. The order is the brief's logic:
    Mitigate: the Thermal check piece leaves its shelf (the slot stays empty) and seats in part
      of the gap: MITIGATE PART.
    Transfer: a dashed "?" comes out of the open door and seats on the ring: WHAT WOULD IT COST?
    Retain: a dashed clamp bar comes out and bridges the rest of the gap: KEEP THE REST.
  The choices ride with the packet as a short list on one angled leader (newest at the bottom,
  nearest the ring). Back at the dock the line slides in to the packet and closes its loop round
  it, joining the line from the desk tangentially at the lower left; on "control" the loop is
  closed and only then the proposals turn solid, with one soft resolve pulse; DECIDES prints
  after the RISK OWNER name under the desk. Held still to 83.3.

  Contract at 78.0 (docs/cut2-plan.md section 2, unchanged since) is tl.set below; stand-ins are
  built only for missing handles. Hand-over to s8 (same builder): W.coop.
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
  var ARC = 0.85; // the packet's arcsG scale (contract)
  var BIG = 1.25; // the packet's body scale while Priora carries it

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
  var LS = PK.cam.px(80, 19.5); // the owner's choices in the held cooperation shot (78.95 to 83.3)
  // unhinted glyph metrics: under the zooming camera Chrome otherwise lays small SVG text out at
  // screen-scale-dependent widths that depend on seek history (a seek-order difference of ~7% in width)
  function crisp(el) {
    el.style.textRendering = "geometricPrecision";
    return el;
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
    var trunk = W.decisionTrunk = PK.el("path", { d: "M" + pt(tip) + " C" + f(tip[0] + 4) + " " + f(tip[1] - 30) + " " + f(BR0[0]) + " " + f(BR0[1] + 40) + " " + pt(BR0), class: "pk-decision" }, W.L.routes);
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
  if (!W.roomTags) {
    // s6 tags Retain and Mitigate as design proposals (ink-2, top right of each chamber)
    W.roomTags = {};
    ["retain", "mitigate"].forEach(function (k) {
      var r = G.rooms[k];
      var t = crisp(PK.text(W.L.labels, "Design proposal", r.x + r.w - 18, r.y + 28, { font: "mono", size: PK.cam.px(80, 19), fill: C.ink2, anchor: "end" }));
      gsap.set(t, { opacity: 0 });
      tl.set(t, { opacity: 1 }, T0);
      W.roomTags[k] = t;
    });
  }
  var own = W.roomOwnerLines;

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
  if (W.ownerDecides) tl.set(W.ownerDecides, { opacity: 0 }, T0);
  if (W.caseLabel) tl.set(W.caseLabel, { opacity: 0 }, T0);
  var ra = W.roomAgents;
  ra.retain.concat(ra.mitigate, ra.transfer).forEach(function (a) {
    tl.set(a.body, { scale: 1, svgOrigin: "0 0" }, T0);
  });

  // ------------------------------------------------------------ where things are (outside the rooms, clear of the human's line)
  var DESK = (W.decisionLoop && W.decisionLoop.from) || [1182, 710]; // the desk's top-right corner, where the line leaves
  var TIPv = W.decisionTip ? (W.decisionTip.length ? W.decisionTip : [W.decisionTip.x, W.decisionTip.y]) : [DOCK[0] + 42, DOCK[1]];
  // each door: the packet's ring within 40 px of the door gap, above the line that enters it
  // (Retain and Mitigate lines enter low; the Transfer line enters high and the packet sits in the bay below it)
  var PP = { mitigate: [1240, 500], transfer: [1236, 662], retain: [1240, 330] };
  var QOFF = [0, -97]; // Priora above the packet while it carries it (bead down at the packet)
  var PQ = {};
  RK.forEach(function (k) {
    PQ[k] = add(PP[k], QOFF);
  });
  // the decided packet at the dock, its loop round it, and Priora parked above
  var CE = [1224, 670],
    RL = 51; // 10 px or more clear of the ring, its top pieces and the price bead
  var QD = [1236, 565];

  // ------------------------------------------------------------ the human's line as one polyline that can change shape
  var NPT = 200;
  function polyD(pts) {
    var s = "M" + pt(pts[0]);
    for (var i = 1; i < pts.length; i++) s += " L" + pt(pts[i]);
    return s;
  }
  var decD = W.decisionD || valAt(W.decision, "attr", T0, "d") || W.decision.getAttribute("d");
  var stemD = decD,
    loopD = null;
  var cutA = decD.indexOf(" A");
  if (cutA > 0) {
    stemD = decD.slice(0, cutA);
    var sEnd = samplePath(stemD, 4)[4];
    loopD = "M" + pt(sEnd) + decD.slice(cutA);
  }
  var trunkD = W.decisionTrunk ? W.decisionTrunk.getAttribute("d") : "M" + pt(TIPv) + " C" + f(TIPv[0] + 3) + " " + f(TIPv[1] - 30) + " " + f(BR0[0]) + " " + f(BR0[1] + 34) + " " + pt(BR0);
  // A: as s6 leaves it without the loop (desk, under the dock, up to the tip, the trunk to the branch point)
  var hlA = polyD(samplePath(stemD + " " + trunkD.replace(/^\s*M/, "L"), NPT - 1));
  // B: stepped aside while the packet is away: under the bay and up along the Transfer wall to the branch point
  var bayY = 727,
    riserX = 1292;
  var hlB = polyD(
    samplePath(
      "M" + pt(DESK) + " C" + f(DESK[0] + 16) + " " + f(bayY - 3) + " " + f(DESK[0] + 32) + " " + f(bayY) + " " + f(1240) + " " + f(bayY) +
        " C" + f(1272) + " " + f(bayY) + " " + f(riserX) + " " + f(bayY - 5) + " " + f(riserX) + " " + f(bayY - 27) +
        " L" + f(riserX) + " " + f(BR0[1] + 28) + " C" + f(riserX) + " " + f(BR0[1] + 12) + " " + f(riserX - 2) + " " + f(BR0[1] + 2) + " " + pt(BR0),
      NPT - 1,
    ),
  );
  // C: the decision: the line from the desk joins the loop tangentially at its lower left, runs under the packet,
  // and leaves it tangentially on the right, straight up to the branch point (no node on the loop)
  var dq = dist(DESK, CE);
  var aJ = ang(CE, DESK) - (Math.acos(RL / dq) * 180) / Math.PI;
  var J = PK.polar(CE[0], CE[1], RL, aJ),
    E = [CE[0] + RL, CE[1]];
  var hlC = polyD(
    samplePath(
      "M" + pt(DESK) + " L" + pt(J) + " A" + RL + " " + RL + " 0 0 0 " + pt(E) + " C" + f(E[0]) + " " + f(E[1] - 32) + " " + f(BR0[0]) + " " + f(BR0[1] + 30) + " " + pt(BR0),
      NPT - 1,
    ),
  );
  var hl = PK.el("path", { d: hlA, class: "pk-decision" }, W.L.routes);
  W.L.routes.insertBefore(hl, W.decision);
  gsap.set(hl, { opacity: 0 });
  var loopOld = loopD ? PK.el("path", { d: loopD, class: "pk-decision" }, W.L.routes) : null;
  if (loopOld) {
    W.L.routes.insertBefore(loopOld, W.decision);
    gsap.set(loopOld, { opacity: 0, drawSVG: "0% 100%" });
  }
  // the loop that closes at the decision: from where the line leaves on the right, over the top, to the lower left
  var arcTop = PK.el("path", { d: "M" + pt(E) + " A" + RL + " " + RL + " 0 1 0 " + pt(J), class: "pk-decision" }, W.L.routes);
  gsap.set(arcTop, { drawSVG: "0% 0%" });
  // seamless swap at 78.0: the same drawing, now made of this section's own pieces
  tl.set(W.decision, { opacity: 0 }, T0);
  if (W.decisionTrunk) tl.set(W.decisionTrunk, { opacity: 0 }, T0);
  tl.set(hl, { opacity: 1, attr: { d: hlA } }, T0);
  if (loopOld) tl.set(loopOld, { opacity: 1, drawSVG: "0% 100%" }, T0);

  // ------------------------------------------------------------ the pieces, in the packet's arc units (inside arcsG; world = local x ARC x body scale)
  var gR = gapA.r || 40,
    g0 = gapA.a0,
    g1 = gapA.a1;
  var th = W.safeguards.thermal;
  var thA = [g0 + 1, (th.a1 !== undefined ? th.a1 : g0 + (g1 - g0) * 0.6) - 0.5];
  var slA = [thA[1] + 2.5, g1 - 1];
  var K = ARC * BIG;
  var SW = function (px) {
    return px / PK.cam.zoomAt(80) / K; // a screen width in px as local units of the enlarged packet
  };
  var thD = sector(gR - 2.2, gR + 2.2, thA[0], thA[1]);
  var CB = gR + 6; // the clamp bar's radius (close to the ring, so the decision loop stays clear of it)
  var barD =
    "M" + pt(PK.polar(0, 0, gR + 3.2, slA[0] - 2)) + " L" + pt(PK.polar(0, 0, CB, slA[0] - 2)) +
    " A" + CB + " " + CB + " 0 0 1 " + pt(PK.polar(0, 0, CB, slA[1] + 2)) + " L" + pt(PK.polar(0, 0, gR + 3.2, slA[1] + 2));
  var thMidL = PK.polar(0, 0, gR, (thA[0] + thA[1]) / 2);
  var barMidL = PK.polar(0, 0, CB, (slA[0] + slA[1]) / 2);
  function thermalPiece(parent) {
    var g = PK.g(parent);
    var prop = PK.el("path", { d: thD, fill: C.rustPale, stroke: C.rust, "stroke-width": SW(1.75), "stroke-dasharray": f(SW(4)) + " " + f(SW(2.6)), "stroke-linejoin": "round" }, g);
    var solid = PK.el("path", { d: thD, fill: C.rust }, g);
    gsap.set(solid, { opacity: 0 });
    return { g: g, prop: prop, solid: solid };
  }
  function clampBar(parent) {
    var g = PK.g(parent);
    var prop = PK.el("path", { d: barD, fill: "none", stroke: C.rust, "stroke-width": SW(2.6), "stroke-dasharray": f(SW(5)) + " " + f(SW(3.4)), "stroke-linecap": "butt", "stroke-linejoin": "round" }, g);
    var solid = PK.el("path", { d: barD, fill: "none", stroke: C.rust, "stroke-width": SW(2.6), "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    gsap.set(solid, { opacity: 0 });
    return { g: g, prop: prop, solid: solid };
  }
  // the price "?": a bead on the ring (body units: the ring is at 34; at the dock the bead is 30 px or more)
  var QR_ = 9.4,
    QA = 60; // lower right of the ring, on the Evidence arc, facing the Transfer door
  var QS = 11.2; // its "?" (18 px or more at the dock)
  function priceBead(parent, s) {
    var g0 = PK.g(parent);
    var g = PK.g(g0);
    var sw = 1.6 / PK.cam.zoomAt(80) / s;
    var prop = PK.el("circle", { cx: 0, cy: 0, r: f(QR_), fill: C.paper, stroke: C.rust, "stroke-width": f(sw), "stroke-dasharray": f(3.6 / PK.cam.zoomAt(80) / s) + " " + f(2.6 / PK.cam.zoomAt(80) / s) }, g);
    var solid = PK.el("circle", { cx: 0, cy: 0, r: f(QR_), fill: C.paper, stroke: C.rust, "stroke-width": f(sw * 1.2) }, g);
    gsap.set(solid, { opacity: 0 });
    crisp(PK.text(g, "?", 0, QS * 0.36, { font: "mono", size: QS, fill: C.rust, anchor: "middle", upper: false, track: 0, weight: 600 }));
    return { g: g0, s: g, prop: prop, solid: solid };
  }
  // seated copies (they travel with the packet, also in s8)
  var seatTh = thermalPiece(cs.arcsG),
    seatBar = clampBar(cs.arcsG);
  var seatQ = priceBead(cs.body, 1);
  var qL = PK.polar(0, 0, gR * ARC, QA);
  gsap.set(seatQ.g, { x: qL[0], y: qL[1] });
  gsap.set([seatTh.g, seatBar.g, seatQ.g], { opacity: 0 });
  // travelling copies: a group at the packet-centre-equivalent point, a scale group, the piece
  function flyer(make) {
    var g = PK.g(W.L.case);
    var sc = PK.g(g);
    var p = make(sc);
    gsap.set(g, { opacity: 0 });
    gsap.set(sc, { scale: K, svgOrigin: "0 0" });
    return { g: g, sc: sc, p: p };
  }
  var thFly = flyer(thermalPiece),
    barFly = flyer(clampBar);
  var qFly = (function () {
    var g = PK.g(W.L.case);
    var sc = PK.g(g);
    priceBead(sc, BIG);
    gsap.set(g, { opacity: 0 });
    gsap.set(sc, { scale: BIG, svgOrigin: "0 0" });
    return { g: g, sc: sc };
  })();
  var thOff = mul(thMidL, K),
    barOff = mul(barMidL, K),
    qOff = mul(qL, BIG);

  // ------------------------------------------------------------ the owner's choices: a short list that rides with the packet
  // one leader, angled 30 degrees, 40 units (66 px) long, from the newest choice to the ring (228 degrees, on the
  // Site rules arc) with a 3 px dot; older choices step up a line when a new one prints
  var LA = 228,
    LL = 40,
    LANG = 30,
    LH = LS * 1.45;
  function leaderStart(R) {
    var rp = PK.polar(0, 0, R, LA);
    return [rp[0] - LL * Math.cos((LANG * Math.PI) / 180), rp[1] - LL * Math.sin((LANG * Math.PI) / 180)];
  }
  var RB = gR * ARC * BIG,
    R1 = gR * ARC;
  var SB = leaderStart(RB),
    S1 = leaderStart(R1);
  var lst = PK.g(cs.g);
  gsap.set(lst, { x: 0, y: 0 });
  var rpB = PK.polar(0, 0, RB, LA);
  var lead = PK.el("path", { d: "M" + pt(SB) + " L" + pt(rpB), fill: "none", stroke: C.ink, "stroke-width": f(PK.cam.px(80, 1)), "stroke-linecap": "round" }, lst);
  var leadDot = PK.el("circle", { cx: f(rpB[0]), cy: f(rpB[1]), r: f(PK.cam.px(80, 1.6)), fill: C.ink }, lst);
  gsap.set(lead, { drawSVG: "0% 0%" });
  gsap.set(leadDot, { opacity: 0 });
  var listEnd = [SB[0] - 3, SB[1] + 4]; // the newest choice ends here (end-anchored), on the leader's start
  var choices = [];
  function choice(str, at) {
    var g = PK.g(lst);
    var t = crisp(PK.text(g, str, listEnd[0], listEnd[1], { font: "mono", size: LS, fill: C.ink, anchor: "end" }));
    gsap.set(g, { y: 0 });
    gsap.set(t, { opacity: 0 });
    FT(t, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }, at);
    // the ones already there step up a line
    choices.forEach(function (c, i) {
      var k = choices.length - i; // its current slot above the bottom
      FT(c, { y: -LH * (k - 1) }, { y: -LH * k, duration: 0.18, ease: "power2.out" }, at);
    });
    if (!choices.length) {
      FT(lead, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.14, ease: "power2.out" }, at);
      FT(leadDot, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "none" }, at + 0.12);
    }
    choices.push(g);
    return t;
  }

  // ------------------------------------------------------------ moves
  // the risk owner's black line opens a door: it runs from the branch point to the wall, the door opens wide,
  // and the line reaches into the doorway, where it stays while the room answers
  function door(k, at, open, dur) {
    if (W.doorWide) W.doorWide(tl, k, at, open, dur);
    else if (open) RM[k].open(tl, at, dur);
    else RM[k].close(tl, at, dur);
  }
  function opens(k, at, dw) {
    var wall = own[k].pkWall || 85;
    FT(own[k], { drawSVG: "0% 0%" }, { drawSVG: "0% " + f(wall) + "%", duration: dw, ease: "power1.in" }, at);
    door(k, at + dw - 0.06, true, 0.16);
    FT(own[k], { drawSVG: "0% " + f(wall) + "%" }, { drawSVG: "0% 100%", duration: 0.08, ease: "power1.out" }, at + dw);
    return at + dw + 0.1; // the door is open
  }
  // ...and withdraws: the line goes back to the branch point while the door closes behind it
  function withdraws(k, at, dw) {
    PK.drawOff(tl, own[k], at, dw, "power2.inOut", { to: "start" });
    var dd = Math.max(0.14, dw - 0.04);
    door(k, at + 0.04, false, dd);
    return Math.max(at + dw, at + 0.04 + dd); // all still
  }
  var beadNow = ang(PDOCK, DOCK);
  function carry(dP, dQ, at, dur, s0, s1, beadTo) {
    PK.travel(tl, cs.g, dP, at, dur, "power2.inOut");
    PK.travel(tl, W.priora.g, dQ, at, dur, "power2.inOut");
    PK.trail(tl, W.L.trails, dQ, at, dur, "power2.inOut");
    if (s0 !== s1) FT(cs.body, { scale: s0, svgOrigin: "0 0" }, { scale: s1, svgOrigin: "0 0", duration: dur, ease: "power2.inOut" }, at);
    if (beadTo !== undefined && Math.abs(beadTo - beadNow) > 0.01) {
      FT(W.priora.beadG, { rotation: beadNow }, { rotation: beadTo, svgOrigin: "0 0", duration: dur, ease: "power2.inOut" }, at);
      beadNow = beadTo;
    }
    return at + dur;
  }
  function cub(p0, c1, c2, p1) {
    return "M" + pt(p0) + " C" + pt(c1) + " " + pt(c2) + " " + pt(p1);
  }
  // the same bend for Priora's path as for the packet's (it stays above the packet)
  function cubQ(p0, c1, c2, p1, q0, q1) {
    return cub(q0, add(c1, sub(q0, p0)), add(c2, sub(q1, p1)), q1);
  }

  // ------------------------------------------------------------ the timetable (one mover at a time)
  var tm = {
    letGo: T0, letGoD: 0.25,
    c1: 78.12, c1D: 0.45, // to Mitigate, lands 78.57 (the camera is landing too: it follows the packet up)
    dwM: 0.12, flyM: 0.32,
    c2D: 0.5, // to Transfer
    dwT: 0.08, flyT: 0.22,
    c3D: 0.6, // up to Retain
    dwR: 0.18, flyR: 0.24,
    c4D: 0.6, // back to the dock
    control: PK.word("L13", "control"), // 82.64
  };

  // ------------------------------------------------------------ 0. the loop lets go: it unwinds to its tip; the line steps aside to the bay
  if (loopOld) FT(loopOld, { drawSVG: "0% 100%" }, { drawSVG: "0% 0%", duration: tm.letGoD, ease: "power2.inOut" }, tm.letGo);
  FT(hl, { attr: { d: hlA } }, { attr: { d: hlB }, duration: tm.letGoD, ease: "power2.inOut" }, tm.letGo);
  if (W.decisionDot) FT(W.decisionDot, { opacity: 1 }, { opacity: 0, duration: 0.12, ease: "none" }, tm.letGo);

  // ------------------------------------------------------------ 1. Mitigate: the Thermal check piece seats in part of the gap
  var pM = PP.mitigate,
    qM = PQ.mitigate;
  var dPM = cub(DOCK, [1200, 640], [1205, 540], pM);
  var tL = carry(dPM, cub(PDOCK, [1180, 540], [1222, 440], qM), tm.c1, tm.c1D, 1, BIG, 90);
  var dM = DOOR.mitigate;
  var tOpen = opens("mitigate", tL, tm.dwM);
  var shelfC = centreAt(th.g, T0);
  try {
    var pb = th.piece.getBBox(),
      gq = xy(th.g, T0);
    shelfC = [gq[0] + pb.x + pb.width / 2, gq[1] + pb.y + pb.height / 2];
  } catch (e) {}
  var kShelf = 1;
  try {
    var pp = samplePath(th.piece.getAttribute("d"), 40),
      rr = 0;
    pp.forEach(function (q) {
      rr += Math.hypot(q[0], q[1]);
    });
    kShelf = Math.max(0.5, Math.min(1, rr / pp.length / (gR * K)));
  } catch (e) {}
  var thStart = sub(shelfC, mul(thMidL, K * kShelf));
  var thDoor = sub([dM[0] - 2, dM[1] - 20], thOff); // through the open doorway, above the owner's line
  var thPath = "M" + pt(thStart) + " C" + f(thStart[0] - 90) + " " + f(thStart[1] - 4) + " " + f(thDoor[0] + 80) + " " + f(thDoor[1]) + " " + pt(thDoor) +
    " C" + f(thDoor[0] - 30) + " " + f(thDoor[1]) + " " + f(pM[0] + 30) + " " + f(pM[1]) + " " + pt(pM);
  var tFly = tOpen - 0.06; // the answer comes as the door finishes opening
  FT(th.g, { opacity: 1 }, { opacity: 0.28, duration: 0.15, ease: "none" }, tFly);
  FT(thFly.sc, { scale: K * kShelf, svgOrigin: "0 0" }, { scale: K, svgOrigin: "0 0", duration: tm.flyM, ease: "power2.inOut" }, tFly);
  tl.set(thFly.g, { x: thStart[0], y: thStart[1] }, tFly - 0.01);
  FT(thFly.g, { opacity: 0 }, { opacity: 1, duration: 0.05, ease: "none" }, tFly);
  PK.travel(tl, thFly.g, thPath, tFly, tm.flyM, "power3.out");
  var tSeat = tFly + tm.flyM;
  tl.set(thFly.g, { opacity: 0 }, tSeat);
  tl.set(seatTh.g, { opacity: 1 }, tSeat);
  PK.sfx("compare", tSeat, { gain_db: -9, pan: 0.45, room: "mitigate" });
  choice("Mitigate part", tSeat);
  var tGo = withdraws("mitigate", tSeat + 0.06, 0.16) + 0.02;

  // ------------------------------------------------------------ 2. Transfer: down to the bay beside its door; a dashed "?" seats on the ring
  var pT = PP.transfer,
    qT = PQ.transfer;
  var c1T = [1200, 530],
    c2T = [1200, 640];
  tL = carry(cub(pM, c1T, c2T, pT), cubQ(pM, c1T, c2T, pT, qM, qT), tGo, tm.c2D, BIG, BIG);
  tOpen = opens("transfer", tL, tm.dwT);
  var qSeat = add(pT, qOff);
  var qFrom = [DOOR.transfer[0] + 36, qSeat[1] - 6];
  tFly = tOpen - 0.06;
  tl.set(qFly.g, { x: qFrom[0], y: qFrom[1] }, tFly - 0.01);
  FT(qFly.g, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "none" }, tFly);
  FT(qFly.sc, { scale: BIG * 0.6, svgOrigin: "0 0" }, { scale: BIG, svgOrigin: "0 0", duration: tm.flyT, ease: "power2.out" }, tFly);
  PK.travel(tl, qFly.g, "M" + pt(qFrom) + " C" + f(qFrom[0] - 20) + " " + f(qFrom[1]) + " " + f(qSeat[0] + 24) + " " + f(qSeat[1]) + " " + pt(qSeat), tFly, tm.flyT, "power3.out");
  tSeat = tFly + tm.flyT;
  tl.set(qFly.g, { opacity: 0 }, tSeat);
  tl.set(seatQ.g, { opacity: 1 }, tSeat);
  PK.sfx("return", tSeat, { gain_db: -9, pan: 0.45, room: "transfer" });
  choice("What would it cost?", tSeat);
  tGo = withdraws("transfer", tSeat + 0.06, 0.12) + 0.02;

  // ------------------------------------------------------------ 3. Retain: up to its door; a dashed clamp bar bridges the rest of the gap
  var pR = PP.retain,
    qR = PQ.retain;
  var c1R = [1196, 610],
    c2R = [1196, 380];
  tL = carry(cub(pT, c1R, c2R, pR), cubQ(pT, c1R, c2R, pR, qT, qR), tGo, tm.c3D, BIG, BIG);
  tOpen = opens("retain", tL, tm.dwR);
  var dR = DOOR.retain;
  var pol = ra.retain[0];
  var polC = xy(pol.g, T0);
  var barStart = sub([polC[0] - 8, polC[1] - 20], barOff);
  var barDoor = sub([dR[0] - 2, dR[1] - 34], barOff); // high in the doorway, above the owner's line
  var barPath = "M" + pt(barStart) + " C" + f(barStart[0] - 40) + " " + f(barStart[1] - 30) + " " + f(barDoor[0] + 40) + " " + f(barDoor[1]) + " " + pt(barDoor) +
    " C" + f(barDoor[0] - 24) + " " + f(barDoor[1]) + " " + f(pR[0] + 24) + " " + f(pR[1]) + " " + pt(pR);
  tFly = tOpen - 0.06;
  tl.set(barFly.g, { x: barStart[0], y: barStart[1] }, tFly - 0.01);
  FT(barFly.g, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "none" }, tFly);
  PK.travel(tl, barFly.g, barPath, tFly, tm.flyR, "power3.out");
  tSeat = tFly + tm.flyR;
  tl.set(barFly.g, { opacity: 0 }, tSeat);
  tl.set(seatBar.g, { opacity: 1 }, tSeat);
  PK.sfx("lock", tSeat, { gain_db: -9, pan: 0.45, room: "retain" });
  choice("Keep the rest", tSeat);
  tGo = withdraws("retain", tSeat + 0.06, 0.18) + 0.02;

  // ------------------------------------------------------------ 4. back to the dock (the packet returns to its size beside the owner)
  var c1D = [1196, 380],
    c2D = [1190, 620];
  var tDock = carry(cub(pR, c1D, c2D, CE), cub(qR, add(c1D, sub(qR, pR)), [QD[0] - 30, QD[1] - 40], QD), tGo, tm.c4D, BIG, 1, ang(QD, CE));
  // the list and its leader keep their place on the shrinking ring
  FT(lst, { x: 0, y: 0 }, { x: S1[0] - SB[0], y: S1[1] - SB[1], duration: tm.c4D, ease: "power2.inOut" }, tGo);

  // ------------------------------------------------------------ 5. "control": the line slides in to the packet and closes its loop round it
  var tLoop = tDock; // about 82.3
  FT(hl, { attr: { d: hlB } }, { attr: { d: hlC }, duration: 0.14, ease: "power2.inOut" }, tLoop);
  var tClose = Math.max(tm.control + 0.06, tLoop + 0.34);
  FT(arcTop, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: tClose - (tLoop + 0.04), ease: "power2.inOut" }, tLoop + 0.04);
  PK.sfx("decision", tLoop, { gain_db: -4, pan: 0.3, dur: tClose - tLoop });
  // only now the proposals turn solid, with one soft pulse
  var tSolid = tClose;
  [seatTh, seatBar, seatQ].forEach(function (p) {
    FT(p.solid, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "none" }, tSolid);
    FT(p.prop, { opacity: 1 }, { opacity: 0, duration: 0.16, ease: "none" }, tSolid);
  });
  FT([seatTh.g, seatBar.g], { scale: 1 }, { keyframes: [{ scale: 1.08, duration: 0.12, ease: "power1.out" }, { scale: 1, duration: 0.2, ease: "power2.inOut" }], svgOrigin: "0 0" }, tSolid);
  FT(seatQ.s, { scale: 1 }, { keyframes: [{ scale: 1.12, duration: 0.12, ease: "power1.out" }, { scale: 1, duration: 0.2, ease: "power2.inOut" }], svgOrigin: "0 0" }, tSolid);
  PK.sfx("resolve", tSolid + 0.02, { gain_db: -12, pan: 0.3 });
  // RISK OWNER DECIDES: DECIDES prints after the owner's name under the desk (away from the list, across the loop)
  var oLab = W.real.labels.owner;
  ["worker", "site", "owner"].forEach(function (k) {
    if (W.real.labels[k]) crisp(W.real.labels[k]);
  });
  var fsBuild = parseFloat((/font-size:\s*([\d.]+)px/.exec(oLab.getAttribute("style") || "") || [0, 9])[1]);
  var fsNow = parseFloat(valAt(oLab, "fontSize", tSolid)) || fsBuild;
  var wBuild = 0;
  try {
    wBuild = oLab.getComputedTextLength();
  } catch (e) {}
  if (!(wBuild > 0)) wBuild = PK.measure ? PK.measure("RISK OWNER", "mono500", fsBuild, 0.12) : fsBuild * 7.2;
  var oX = parseFloat(oLab.getAttribute("x")) || G.owner[0],
    oY = parseFloat(oLab.getAttribute("y")) || G.realLabelY;
  var decK = wBuild / fsBuild / 2 + 0.72; // DECIDES starts this many font sizes right of the name's centre (one word space)
  var lDec = crisp(PK.text(W.L.real, "Decides", oX + decK * fsNow, oY, { font: "mono", size: fsNow, fill: C.ink, anchor: "start" }));
  gsap.set(lDec, { opacity: 0 });
  FT(lDec, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, tSolid + 0.04);

  W.coop = {
    hl: hl,
    hlC: hlC,
    arcTop: arcTop,
    loop: { c: CE, r: RL, J: J, E: E },
    packetEnd: CE,
    prioraEnd: QD,
    beadEnd: ang(QD, CE),
    packetScale: 1,
    list: lst,
    decides: { el: lDec, label: oLab, k: decK, x: oX, fs: fsNow },
    shelf: th.g,
    branchPoint: BR0,
  };
});
