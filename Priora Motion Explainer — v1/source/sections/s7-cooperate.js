/*
  s7-cooperate (78 to 84 s): the rooms cooperate; the risk owner stays in control. (cut 3)

  The camera lands at 78.95 and holds still to 83.3. On "carries" (79.07) the risk owner's
  loop at the dock lets go and Priora carries the same packet, grown to a readable 1.25x, to
  each door in turn, one mover at a time, along the outside of the rooms. At every door the
  risk owner's black line opens it and stays in the open door while the room answers; the
  rooms only propose, so what they send out stays dashed:
    Mitigate: the Thermal check piece leaves its shelf (the slot stays empty) and seats in
      part of the gap, dashed: MITIGATE PART.
    Retain: a dashed clamp bar comes out and bridges the rest of the gap: KEEP THE REST.
    Transfer (its door is beside the dock): a hollow dashed "?" comes back from the
      carriers: WHAT WOULD IT COST?
  The owner's choices and question are ink mono beside the packet on short leaders. On
  "control" the black line closes its loop round the packet at the dock again; only then do
  the proposals turn solid, with one soft resolve pulse: RISK OWNER DECIDES. Held to 83.3.
  (Order Mitigate, Retain, Transfer: the brief's own order, "mitigate one part, retain what
  remains or ask what transfer would cost before deciding"; the Transfer door is the one
  beside the dock, so the decision lands on "control" without a long last journey.)

  Contract at 78.0 (docs/cut2-plan.md section 2, unchanged in cut 3) is tl.set below;
  stand-ins are built only for missing handles. Hand-over to s8 (same builder): W.coop.
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
  // unhinted glyph metrics: under the zooming camera Chrome otherwise lays small SVG text out at
  // screen-scale-dependent widths that depend on seek history (a seek-order difference of ~7% in width)
  function crisp(el) {
    el.style.textRendering = "geometricPrecision";
    return el;
  }
  function mono(str, x, y, o) {
    o = o || {};
    var t = crisp(PK.text(W.L.labels, str, x, y, { font: "mono", size: o.size || LS, fill: o.fill || C.rust, anchor: o.anchor || "start" }));
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
  tl.set(W.decision, { opacity: 1 }, T0);
  if (W.ownerDecides) tl.set(W.ownerDecides, { opacity: 0 }, T0);
  if (W.caseLabel) tl.set(W.caseLabel, { opacity: 0 }, T0);
  var ra = W.roomAgents;
  ra.retain.concat(ra.mitigate, ra.transfer).forEach(function (a) {
    tl.set(a.body, { scale: 1, svgOrigin: "0 0" }, T0);
  });

  // ------------------------------------------------------------ the human's line, split so its loop can let go and close again
  // W.decision = desk -> (pre) -> loop round the packet (loopSeg) -> tip (post); the chord replaces the loop while the packet is away
  var decD = W.decisionD || valAt(W.decision, "attr", T0, "d") || W.decision.getAttribute("d");
  var dec = null;
  try {
    var dp = samplePath(decD, 360);
    var LC = (W.decisionLoop && W.decisionLoop.c) || DOCK,
      LRr = (W.decisionLoop && W.decisionLoop.r) || 44;
    var near = [];
    dp.forEach(function (p, i) {
      if (dist(p, LC) < LRr + 6) near.push(i);
    });
    if (near.length > 40) {
      var i1 = near[0],
        i2 = near[near.length - 1],
        sweep = 0;
      for (var i = i1 + 1; i <= i2; i++) {
        var da = ang(LC, dp[i]) - ang(LC, dp[i - 1]);
        while (da > 180) da -= 360;
        while (da < -180) da += 360;
        sweep += Math.abs(da);
      }
      if (sweep > 300) {
        var poly = function (a, b) {
          var s = "M" + pt(dp[a]);
          for (var j = a + 1; j <= b; j++) s += " L" + pt(dp[j]);
          return s;
        };
        dec = {
          pre: PK.el("path", { d: poly(0, i1), class: "pk-decision" }, W.L.routes),
          post: i2 < dp.length - 1 ? PK.el("path", { d: poly(i2, dp.length - 1), class: "pk-decision" }, W.L.routes) : null,
          loop: PK.el("path", { d: poly(i1, i2), class: "pk-decision" }, W.L.routes),
          chord: PK.el("path", { d: "M" + pt(dp[i1]) + " L" + pt(dp[i2]), class: "pk-decision" }, W.L.routes),
        };
        [dec.pre, dec.post, dec.loop, dec.chord].forEach(function (e) {
          if (!e) return;
          W.L.routes.insertBefore(e, W.decision);
          gsap.set(e, { opacity: 0 });
        });
        gsap.set(dec.loop, { drawSVG: "0% 100%" });
      }
    }
  } catch (e) {}

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
  var CB = gR + 8.5; // the clamp bar's radius
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
  // seated copies (they travel with the packet, also in s8)
  var seatTh = thermalPiece(cs.arcsG),
    seatBar = clampBar(cs.arcsG);
  gsap.set([seatTh.g, seatBar.g], { opacity: 0 });
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

  // ------------------------------------------------------------ positions (outside the rooms, clear of the human's line by 24 units or more)
  var dM = DOOR.mitigate,
    dT = DOOR.transfer,
    dR = DOOR.retain;
  var RV = gR * K; // the packet's visible radius while carried (42.5)
  var PM = [1192, dM[1]],
    QM = [1110, dM[1] - 56];
  var PR = [1192, dR[1]],
    QR = [1110, dR[1] - 56];
  var PT = DOCK, // the Transfer door is the one beside the dock
    QT = [1196, 536];
  var thOff = mul(thMidL, K),
    barOff = mul(barMidL, K);

  var tm = {
    lift: PK.word("L13", "carries"), // 79.07
    goM: 0.43,
    openM: 79.12,
    thermal: 79.5, thermalD: 0.34,
    leaveM: 80.42, goR: 0.42,
    openR: 80.7,
    bar: 81.0, barD: 0.26,
    leaveR: 81.84, goT: 0.5,
    openT: 82.0,
    ask: 82.36, askD: 0.24,
    decide: PK.word("L13", "control"), // 82.64
    decideD: 0.38,
  };
  var tSolid = tm.decide + tm.decideD; // 83.02

  // the risk owner's black line opens a door and stays in it while the room answers
  // (s6 opens doors wide, 88 units, with W.doorWide; its lines enter the doorway off-centre, so things pass beside them)
  function door(k, at, open) {
    if (W.doorWide) W.doorWide(tl, k, at, open, 0.28);
    else if (open) RM[k].open(tl, at, 0.28);
    else RM[k].close(tl, at, 0.28);
  }
  function opens(k, at) {
    var wall = own[k].pkWall;
    if (wall) {
      FT(own[k], { drawSVG: "0% 0%" }, { drawSVG: "0% " + f(wall) + "%", duration: 0.24, ease: "power2.inOut" }, at);
      door(k, at + 0.24, true);
      FT(own[k], { drawSVG: "0% " + f(wall) + "%" }, { drawSVG: "0% 100%", duration: 0.12, ease: "power2.out" }, at + 0.4);
    } else {
      PK.drawOn(tl, own[k], at, 0.28, "power2.inOut", { later: true });
      door(k, at + 0.22, true);
    }
  }
  function withdraws(k, at) {
    PK.drawOff(tl, own[k], at, 0.28, "power2.inOut", { to: "start" });
    door(k, at + 0.12, false);
  }
  // an owner's choice: ink mono beside the packet on a short leader (the leader retracts when the packet leaves)
  function choice(str, P, at, leaveAt) {
    var y = P[1] + LS * 0.36,
      xEnd = P[0] - RV - 22;
    var t = mono(str, xEnd, y, { fill: C.ink, anchor: "end" });
    var ld = PK.el("path", { d: "M" + f(xEnd + 5) + " " + f(P[1]) + " H" + f(P[0] - RV - 5), fill: "none", stroke: C.ink, "stroke-width": 1, "stroke-linecap": "round" }, W.L.labels);
    gsap.set(ld, { drawSVG: "0% 0%" });
    labelIn(t, at);
    PK.drawOn(tl, ld, at, 0.2, "power2.out", { later: true });
    if (leaveAt) PK.drawOff(tl, ld, leaveAt, 0.2, "power2.in", { to: "start" });
    // read for 1.25 s, then it goes: the decided packet carries the result
    FT(t, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in" }, at + 1.25);
    return { t: t, ld: ld };
  }
  function carry(Pfrom, Pto, Qfrom, Qto, at, dur, s0, s1, bend) {
    var dP = PK.curve(Pfrom, Pto, bend || 0),
      dQ = PK.curve(Qfrom, Qto, bend || 0);
    PK.travel(tl, cs.g, dP, at, dur, "power2.inOut");
    PK.travel(tl, W.priora.g, dQ, at, dur, "power2.inOut");
    PK.trail(tl, W.L.trails, dQ, at, dur, "power2.inOut");
    if (s0 !== s1) FT(cs.body, { scale: s0, svgOrigin: "0 0" }, { scale: s1, svgOrigin: "0 0", duration: dur, ease: "power2.inOut" }, at);
  }
  function beadTo(from, to, at, dur) {
    FT(W.priora.beadG, { rotation: from }, { rotation: to, svgOrigin: "0 0", duration: dur, ease: "power2.inOut" }, at);
  }

  // ------------------------------------------------------------ 1. "carries": the loop lets go; Priora carries the packet to Mitigate
  var tL = tm.lift;
  if (dec) {
    tl.set([dec.pre, dec.post, dec.chord].filter(Boolean), { opacity: 1 }, tL);
    FT(W.decision, { opacity: 1 }, { opacity: 0, duration: 0.24, ease: "power1.inOut" }, tL + 0.02);
  }
  carry(DOCK, PM, PDOCK, QM, tL, tm.goM, 1, BIG, -24);
  beadTo(beadDock, ang(QM, PM), tL, tm.goM);
  opens("mitigate", tm.openM);
  // Mitigate proposes: the Thermal check piece leaves its shelf (its slot stays empty) and seats in part of the gap, dashed
  var shelfC = centreAt(th.g, T0);
  try {
    var pb = th.piece.getBBox(),
      gp = xy(th.g, T0);
    shelfC = [gp[0] + pb.x + pb.width / 2, gp[1] + pb.y + pb.height / 2];
  } catch (e) {}
  var kShelf = 1;
  try {
    var pp = samplePath(th.piece.getAttribute("d"), 40),
      rr = 0;
    pp.forEach(function (q) {
      rr += Math.hypot(q[0], q[1]);
    });
    kShelf = Math.max(0.5, Math.min(1, rr / pp.length / RV));
  } catch (e) {}
  var thStart = sub(shelfC, mul(thMidL, K * kShelf));
  var thPath = "M" + pt(thStart) + " C" + f(thStart[0] - 70) + " " + f(thStart[1]) + " " + f(dM[0] + 50) + " " + f(dM[1] - 10 - thOff[1]) + " " + pt([dM[0] - 4 - thOff[0], dM[1] - 10 - thOff[1]]) +
    " C" + f(dM[0] - 30 - thOff[0]) + " " + f(dM[1] - 10 - thOff[1]) + " " + f(PM[0] + 40) + " " + f(PM[1]) + " " + pt(PM);
  FT(th.g, { opacity: 1 }, { opacity: 0.28, duration: 0.18, ease: "none" }, tm.thermal);
  FT(thFly.sc, { scale: K * kShelf, svgOrigin: "0 0" }, { scale: K, svgOrigin: "0 0", duration: tm.thermalD, ease: "power2.inOut" }, tm.thermal);
  tl.set(thFly.g, { x: thStart[0], y: thStart[1] }, tm.thermal - 0.01);
  FT(thFly.g, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "none" }, tm.thermal);
  PK.travel(tl, thFly.g, thPath, tm.thermal, tm.thermalD, "power3.out");
  PK.trail(tl, W.L.trails, shiftPath(thPath, thOff), tm.thermal, tm.thermalD, "power3.out");
  var tSeatM = tm.thermal + tm.thermalD;
  tl.set(thFly.g, { opacity: 0 }, tSeatM);
  tl.set(seatTh.g, { opacity: 1 }, tSeatM);
  PK.sfx("compare", tSeatM, { gain_db: -9, pan: 0.45, room: "mitigate" });
  var cM = choice("Mitigate part", PM, tSeatM - 0.02, tm.leaveM);

  // ------------------------------------------------------------ 2. Retain: up to the Retain door; a dashed clamp bar bridges the rest
  withdraws("mitigate", tm.leaveM);
  carry(PM, PR, QM, QR, tm.leaveM, tm.goR, BIG, BIG, 0);
  beadTo(ang(QM, PM), ang(QR, PR), tm.leaveM, tm.goR);
  opens("retain", tm.openR);
  var pol = ra.retain[0];
  var polC = xy(pol.g, T0);
  var barTarget = PR;
  var barStart = sub([polC[0] - 6, polC[1] - 22], barOff);
  var barPath = "M" + pt(barStart) + " C" + f(barStart[0] - 40) + " " + f(barStart[1] - 30) + " " + f(dR[0] + 40 - barOff[0]) + " " + f(dR[1] - 10 - barOff[1]) + " " + pt([dR[0] - 4 - barOff[0], dR[1] - 10 - barOff[1]]) +
    " C" + f(dR[0] - 34 - barOff[0]) + " " + f(dR[1] - 10 - barOff[1]) + " " + f(barTarget[0] + 40) + " " + f(barTarget[1] - 20) + " " + pt(barTarget);
  tl.set(barFly.g, { x: barStart[0], y: barStart[1] }, tm.bar - 0.01);
  FT(barFly.g, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "none" }, tm.bar);
  FT(pol.body, { scale: 1, svgOrigin: "0 0" }, { keyframes: [{ scale: 1.12, duration: 0.1 }, { scale: 1, duration: 0.22, ease: "power2.inOut" }], svgOrigin: "0 0" }, tm.bar - 0.06);
  PK.travel(tl, barFly.g, barPath, tm.bar, tm.barD, "power3.out");
  var tSeatR = tm.bar + tm.barD;
  tl.set(barFly.g, { opacity: 0 }, tSeatR);
  tl.set(seatBar.g, { opacity: 1 }, tSeatR);
  PK.sfx("lock", tSeatR, { gain_db: -9, pan: 0.45, room: "retain" });
  var cR = choice("Keep the rest", PR, tSeatR - 0.02, tm.leaveR);

  // ------------------------------------------------------------ 3. Transfer: back down to the dock beside the Transfer door; the carriers answer "?"
  withdraws("retain", tm.leaveR);
  carry(PR, PT, QR, QT, tm.leaveR, tm.goT, BIG, 1, -40);
  beadTo(ang(QR, PR), ang(QT, PT), tm.leaveR, tm.goT);
  opens("transfer", tm.openT);
  ra.transfer.forEach(function (h, i) {
    FT(h.body, { scale: 1, svgOrigin: "0 0" }, { keyframes: [{ scale: 1.1, duration: 0.1 }, { scale: 1, duration: 0.22, ease: "power2.inOut" }], svgOrigin: "0 0" }, tm.ask - 0.24 + i * 0.04);
  });
  var BRAD = PK.cam.px(80, 11);
  var qBead = PK.g(W.L.labels);
  PK.el("circle", { cx: 0, cy: 0, r: f(BRAD), fill: C.paper, stroke: C.rust, "stroke-width": PK.cam.px(80, 1.6), "stroke-dasharray": f(PK.cam.px(80, 3.6)) + " " + f(PK.cam.px(80, 2.6)) }, qBead);
  crisp(PK.text(qBead, "?", 0, LS * 0.36, { font: "mono", size: LS, fill: C.rust, anchor: "middle", upper: false, track: 0 }));
  gsap.set(qBead, { opacity: 0 });
  // it comes out to the open Transfer doorway, below the owner's line, beside the packet (the human's line runs between)
  var qFrom = [dT[0] + 64, dT[1] + 16],
    qTo = [dT[0] + 2, dT[1] + 16];
  var qPath = "M" + pt(qFrom) + " L" + pt(qTo);
  tl.set(qBead, { x: qFrom[0], y: qFrom[1] }, tm.ask - 0.01);
  FT(qBead, { opacity: 0, scale: 0.6, svgOrigin: "0 0" }, { opacity: 1, scale: 1, svgOrigin: "0 0", duration: 0.12, ease: "power2.out" }, tm.ask);
  PK.travel(tl, qBead, qPath, tm.ask, tm.askD, "power3.out");
  var tAns = tm.ask + tm.askD;
  PK.sfx("return", tAns, { gain_db: -9, pan: 0.4, room: "transfer" });
  // the owner's question sits above the packet (the owner is to its left), its leader to the packet's top
  var qx = PT[0] + 18,
    qy = PT[1] - 34 - 32 - LS * 1.45; // the decision will sit below it, nearest the packet
  var lQ = mono("What would it cost?", qx, qy, { fill: C.ink, anchor: "end" });
  var ldQ = PK.el("path", { d: "M" + f(qx - 6) + " " + f(qy + 6) + " V" + f(PT[1] - 34 - 4), fill: "none", stroke: C.ink, "stroke-width": 1, "stroke-linecap": "round" }, W.L.labels);
  gsap.set(ldQ, { drawSVG: "0% 0%" });
  labelIn(lQ, tAns - 0.02);
  PK.drawOn(tl, ldQ, tAns - 0.02, 0.2, "power2.out", { later: true });

  // ------------------------------------------------------------ 4. "control": the black line closes its loop round the packet again; the proposals turn solid
  withdraws("transfer", tm.decide);
  if (dec) {
    tl.set(dec.loop, { opacity: 1 }, tm.decide);
    FT(dec.loop, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: tm.decideD, ease: "power2.inOut" }, tm.decide);
    FT(dec.chord, { opacity: 1 }, { opacity: 0, duration: 0.22, ease: "power1.in" }, tm.decide + 0.1);
    // seamless swap back to the whole line once the loop is closed
    tl.set(W.decision, { opacity: 1 }, tSolid);
    tl.set([dec.pre, dec.post, dec.loop].filter(Boolean), { opacity: 0 }, tSolid);
  }
  PK.sfx("decision", tm.decide, { gain_db: -4, pan: 0.3, dur: tm.decideD });
  FT(ldQ, { opacity: 1 }, { opacity: 0, duration: 0.2, ease: "none" }, tm.decide);
  // the proposals turn solid, the question has had its answer; one soft resolve pulse
  [seatTh, seatBar].forEach(function (p) {
    FT(p.solid, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "none" }, tSolid);
    FT(p.prop, { opacity: 1 }, { opacity: 0, duration: 0.16, ease: "none" }, tSolid);
  });
  FT(qBead, { opacity: 1 }, { opacity: 0, duration: 0.2, ease: "power1.in" }, tSolid);
  FT(cs.body, { scale: 1 }, { keyframes: [{ scale: 1.06, duration: 0.12, ease: "power1.out" }, { scale: 1, duration: 0.18, ease: "power2.inOut" }], svgOrigin: "0 0" }, tSolid);
  PK.sfx("resolve", tSolid, { gain_db: -12, pan: 0.3 });
  var lD = mono("Risk owner decides", qx, qy + LS * 1.45, { fill: C.ink, anchor: "end" });
  labelIn(lD, tSolid);

  W.coop = {
    dec: dec,
    packetEnd: PT,
    prioraEnd: QT,
    beadEnd: ang(QT, PT),
    packetScale: 1,
    labels: { done: [], late: [lQ, lD] },
    shelf: th.g,
    branchPoint: BR0,
  };
});
