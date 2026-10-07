/*
  s5-deviation (47 to 57 s): a deviation. Cut 2 (docs/cut2-plan.md).

  Camera: still on the panel [530, 510, 1044] from 48.1 to 52.75 (the site window is in
  frame on the right), pull out 52.75 to 53.95, still [930, 560, 1340] to 56.95.

  48.1 the Insurer re-checks (brackets open, its arc trembles). On "slips" its arc rotates
  out of line, drifts outward and turns dashed (its tie from s4 goes dashed with it); the
  token tilts and its brackets fail to close. Two rust-deep ticks and a faint grey ghost
  mark the gap at the top of the ring. Fire pings the Insurer. Beside the gap: FIRE WATCH
  PLANNED: 30 MIN with a solid 30-unit length, then on "half" POLICY ASKS: 60 MIN with a
  dashed 60-unit length stacked above it. 50.3 to 52.6 an unengaged, dashed grey barrier
  outline sits on the route outside the door (the route runs over it unbroken) with NO HARD
  STOP CONFIGURED, the spark flickering in the same frame. 52.1 to 52.75 (still frame) the
  finding fades, the ring contracts to one compact decision packet (arcsG 0.85, the facets
  slide aside so the gap at the top is clear, the gap ticks stay), the packet comes out
  through the door and waits beside Priora: DECISION PACKET, held. Pull out. 53.95 to 55.5
  (still frame) Priora carries the packet to the risk owner: Priora to GEO.prioraDock, the
  packet to GEO.dock, beside the risk owner on the side toward the rooms. On "the human
  decides" the risk owner's black line leaves the desk, reaches the packet, loops once round
  it and ends at its right side with a round end dot: RISK OWNER DECIDES. Still to 56.95.

  Contract at 47.0 (from s4): docs/cut2-plan.md section 2. If s4 has not provided W.align,
  this section builds the 47.0 state itself (arcs, agents, panel, route, record, spark).

  Contract at 57.0 (for s6):
    Priora (1186, 612) = GEO.prioraDock, scale 1, beadG rotation 58.3 (pointing at the packet).
    Packet W.caseT.g (1228, 680) = GEO.dock, body scale 1, arcsG scale 0.85 (svgOrigin 0 0).
    Insurer arc opacity 0 (back at its aligned place); the four other arcs solid, opacity 1.
    Facets folded (chipG x 22, chipG untouched) and slid aside round the ring: fc.g rotation
      = W.facetRotations[key] (repair 210, hot 330, place 378 = 18, time 66, conditions 114,
      photo 162; W.facetAngles has them mod 360) and each fc.mark carries the transform
      attribute rotate(fc.angle - that) so the marks stay upright. No facet in the gap 234-306.
    W.gapTicks: two rust-deep ticks at 234 and 306 deg (radius 34 to 46 local, inside arcsG),
      opacity 1. W.gap = { a0: 234, a1: 306, r: 40 } (local to arcsG).
    W.decision (class pk-decision) d = W.decisionD, drawn, opacity 1: from the desk top right
      (1180, 711) to the packet, one loop round it (radius 40 to 46), ending at
      W.decisionTip = [1274, 680] heading straight up. W.decisionDot: round ink end dot at
      the tip, opacity 1 (s6 may hide it under the trunk).
    W.ownerDecides ("RISK OWNER DECIDES", ink mono) visible; s6 fades it at 57.9.
    W.align.insurerDashed (the dashed twin of the insurer arc) opacity 0.
    The Insurer conditions token tilted 12 deg and 8 units outward, brackets shut, name visible.
    Panel, route, record and real world as at 47. No barrier, no other labels.
*/
PK.section("s5-deviation", 47, 57, function (tl, W, ctx, S) {
  var G = PK.GEO,
    C = PK.C,
    f = PK.fmt;
  var T0 = 47.0;
  var cs = W.caseT;
  var A = W.agents;
  var tc = G.table; // the case at the table, (380, 520)
  var AR = G.alignR; // 40
  var KEYS = ["siteRules", "insurer", "fire", "riskEng", "evidence"];
  var DOCK = G.dock || [1228, 680];
  var PDOCK = G.prioraDock || [1186, 612];
  function pt(p) {
    return f(p[0]) + " " + f(p[1]);
  }
  function pan(x, t) {
    var c = PK.cam.camAt(t);
    var p = (x - c[0]) / (c[2] / 2);
    return Math.round(Math.max(-1, Math.min(1, p)) * 100) / 100;
  }

  // ------------------------------------------------------------ standalone: build the 47.0 state if s4 has not
  var standalone = !(W.align && W.align.arcs && W.align.arcs.insurer);
  var alignArcs = standalone ? null : W.align.arcs;
  if (standalone) {
    var made = {};
    KEYS.forEach(function (k) {
      var a = G.agents[k].aligned;
      made[k] = PK.el("path", { d: PK.arc(0, 0, AR, a - 36, a + 36), fill: "none", stroke: C.rust, "stroke-width": 3.2, "stroke-linecap": "butt" }, cs.arcsG);
      gsap.set(made[k], { opacity: 0 });
    });
    alignArcs = made;
    if (!W.align) W.align = { arcs: made };
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
    var tick0 = PK.el("path", { d: "M" + (G.record.x0 + 6) + " " + (G.record.y - 9) + " V" + (G.record.y + 9), fill: "none", stroke: C.rust, "stroke-width": 2.6, "stroke-linecap": "round" }, W.record.ticks);
    gsap.set(tick0, { opacity: 0 });
    tl.set(tick0, { opacity: 1 }, T0);
    tl.set(W.caseLabel || {}, { opacity: 0 }, T0);
    // what s4 clears from s3 (seats, table ring, the marks on Priora); the facets fold
    var s3 = W.s3 || {};
    var s3els = [].concat(s3.ring || [], s3.ringG || []);
    Object.keys(s3.seats || {}).forEach(function (k) {
      s3els.push(s3.seats[k]);
    });
    (s3.marks || []).forEach(function (m) {
      s3els.push(m && (m.g || m.tick || m));
    });
    s3els = s3els.filter(function (el) {
      return el && el.nodeType === 1;
    });
    if (s3els.length) tl.set(s3els, { opacity: 0 }, T0);
    cs.facets.forEach(function (fc) {
      tl.set(fc.chipG, { x: cs.R }, T0);
      tl.set(fc.spoke, { drawSVG: "0% 0%" }, T0);
    });
    // the welding spark flickers (s4 builds this for the whole film; this is the stand-in)
    var rnd = PK.prng("s5-spark");
    for (var st = T0; st < 57.0; st += 1 / 15) {
      tl.set(W.spark, { opacity: rnd() < 0.22 ? 0.35 : 0.65 + rnd() * 0.35 }, st);
    }
  }
  var arcs = alignArcs;
  var arcIns = arcs.insurer;

  // ------------------------------------------------------------ contract at 47.0 (everything this section animates)
  var ins = A.insurer,
    fire = A.fire;
  var insP = G.slot(G.agents.insurer.aligned); // (380, 370)
  var fireP = G.slot(G.agents.fire.aligned);
  var prioraP = [700, 470];
  tl.set(W.priora.g, { x: prioraP[0], y: prioraP[1], opacity: 1 }, T0);
  tl.set(W.priora.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(W.priora.beadG, { rotation: 180, svgOrigin: "0 0" }, T0);
  tl.set(W.priora.label, { opacity: 0 }, T0);
  tl.set(cs.g, { x: tc[0], y: tc[1], opacity: 1 }, T0);
  tl.set(cs.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(cs.arcsG, { scale: 1, svgOrigin: "0 0" }, T0);
  KEYS.forEach(function (k) {
    tl.set(arcs[k], { opacity: 1 }, T0);
  });
  tl.set(ins.g, { x: insP[0], y: insP[1], opacity: 1 }, T0);
  tl.set(ins.body, { rotation: 0, svgOrigin: "0 0" }, T0);
  tl.set([ins.left, ins.right], { x: 0 }, T0);
  tl.set(fire.dots, { opacity: 0 }, T0);
  tl.set(W.decision, { opacity: 0 }, T0);
  cs.facets.forEach(function (fc) {
    tl.set(fc.g, { rotation: fc.angle, svgOrigin: "0 0" }, T0);
    fc.mark.setAttribute("transform", "rotate(0)");
    tl.set(fc.mark, { attr: { transform: "rotate(0)" } }, T0);
  });

  // ------------------------------------------------------------ the insurer arc moves inside a wrapper of its own
  // (so this section never overrides how s4 placed it), with a dashed twin (never DrawSVG'd)
  var insW = PK.g(null);
  arcIns.parentNode.insertBefore(insW, arcIns);
  insW.appendChild(arcIns);
  var twin = arcIns.cloneNode(true);
  twin.removeAttribute("id");
  var dashEls = twin.tagName.toLowerCase() === "path" ? [twin] : [].slice.call(twin.querySelectorAll("path"));
  twin.style.removeProperty("opacity");
  dashEls.forEach(function (el) {
    el.removeAttribute("id");
    ["stroke-dasharray", "stroke-dashoffset", "visibility", "opacity"].forEach(function (p) {
      el.style.removeProperty(p);
    });
    var sw = parseFloat(el.getAttribute("stroke-width"));
    el.style.strokeDasharray = sw > 0 ? f(sw * 1.55) + " " + f(sw * 1.15) : "calc(var(--sw, 1) * 6px) calc(var(--sw, 1) * 4.5px)";
    el.style.strokeDashoffset = "0";
    el.style.strokeLinecap = "butt";
  });
  insW.appendChild(twin);
  gsap.set(twin, { opacity: 0 });
  // the wrapper moves by its transform attribute (rotation about the case centre, no origin bookkeeping)
  function wT(x, y, r) {
    return "translate(" + f(x) + " " + f(y) + ") rotate(" + f(r) + ")";
  }
  insW.setAttribute("transform", wT(0, 0, 0));
  tl.set(insW, { attr: { transform: wT(0, 0, 0) } }, T0);

  // ------------------------------------------------------------ the specialists' ties to their arcs (s4), if any
  var tieSrc = (W.align && (W.align.ties || W.align.tie)) || W.ties || null;
  var ties = {};
  if (tieSrc) {
    KEYS.forEach(function (k) {
      var el = tieSrc[k];
      if (el && el.nodeType === 1 && typeof el.getTotalLength === "function") ties[k] = el;
    });
  }
  // which end of a tie is the agent's: retract toward it
  function agentEnd(el, k) {
    try {
      var len = el.getTotalLength();
      var p0 = el.getPointAtLength(0),
        p1 = el.getPointAtLength(len);
      var ap = G.slot(G.agents[k].aligned);
      var d0 = Math.min(Math.hypot(p0.x - ap[0], p0.y - ap[1]), Math.hypot(p0.x - (ap[0] - tc[0]), p0.y - (ap[1] - tc[1])));
      var d1 = Math.min(Math.hypot(p1.x - ap[0], p1.y - ap[1]), Math.hypot(p1.x - (ap[0] - tc[0]), p1.y - (ap[1] - tc[1])));
      return d0 <= d1 ? "start" : "end";
    } catch (e) {
      return "start";
    }
  }

  // ------------------------------------------------------------ the case stays compact (a no-op when s4 folded the facets)
  cs.facets.forEach(function (fc, i) {
    tl.to(fc.chipG, { x: cs.R, duration: 0.6, ease: "power3.inOut", immediateRender: false }, 47.15 + i * 0.03);
    tl.to(fc.spoke, { drawSVG: "0% 0%", duration: 0.5, ease: "power2.in", immediateRender: false }, 47.15 + i * 0.03);
  });

  // ------------------------------------------------------------ 48.1 (camera landed): the Insurer re-checks
  var tCheck = 48.1;
  tl.fromTo(ins.left, { x: 0 }, { x: -3.5, duration: 0.25, ease: "power2.out", immediateRender: false }, tCheck);
  tl.fromTo(ins.right, { x: 0 }, { x: 3.5, duration: 0.25, ease: "power2.out", immediateRender: false }, tCheck);
  tl.fromTo(
    insW,
    { attr: { transform: wT(0, 0, 0) } },
    {
      keyframes: [
        { attr: { transform: wT(0, 0, 1.3) }, duration: 0.08, ease: "power1.out" },
        { attr: { transform: wT(0, 0, -0.8) }, duration: 0.08, ease: "power1.inOut" },
        { attr: { transform: wT(0, 0, 0) }, duration: 0.07, ease: "power1.in" },
      ],
      immediateRender: false,
    },
    tCheck + 0.01,
  );
  PK.sfx("inspect", tCheck, { gain_db: -14, pan: pan(insP[0], tCheck), agent: "insurer" });

  // ------------------------------------------------------------ "slips": deviate
  var tSlip = PK.word("L07", "slips");
  var devRot = 9,
    drift = 15;
  var dv = PK.polar(0, 0, drift, 270 + devRot);
  tl.fromTo(insW, { attr: { transform: wT(0, 0, 0) } }, { attr: { transform: wT(dv[0], dv[1], devRot) }, duration: 1.0, ease: "power2.inOut", immediateRender: false }, tSlip);
  tl.fromTo(arcIns, { opacity: 1 }, { opacity: 0, duration: 0.45, ease: "power1.inOut", immediateRender: false }, tSlip + 0.3);
  tl.fromTo(twin, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.inOut", immediateRender: false }, tSlip + 0.25);
  tl.fromTo(ins.body, { rotation: 0, svgOrigin: "0 0" }, { rotation: 12, svgOrigin: "0 0", duration: 1.0, ease: "power2.inOut", immediateRender: false }, tSlip + 0.06);
  tl.fromTo(ins.g, { x: insP[0], y: insP[1] }, { x: insP[0], y: insP[1] - 8, duration: 1.0, ease: "power2.inOut", immediateRender: false }, tSlip + 0.06);
  // the brackets try to close and cannot
  tl.fromTo(ins.left, { x: -3.5 }, { x: -2.1, duration: 0.3, ease: "power2.out", immediateRender: false }, tSlip + 0.2);
  tl.fromTo(ins.right, { x: 3.5 }, { x: 2.1, duration: 0.3, ease: "power2.out", immediateRender: false }, tSlip + 0.2);
  PK.sfx("deviate", tSlip, { gain_db: -2, dur: 1.0, pan: pan(tc[0], tSlip) });

  // the insurer's tie goes dashed with its arc: the solid tie fades, a dashed tie follows token and arc
  var dashTie = null;
  if (ties.insurer) {
    var tieIns = ties.insurer;
    var tieOp = parseFloat(tieIns.getAttribute("stroke-opacity") || tieIns.getAttribute("opacity") || "") || 0.6;
    var arcMid0 = [tc[0], tc[1] - AR - 2],
      arcMid1 = [tc[0] + PK.polar(0, 0, AR + 2, 270 + devRot)[0] + dv[0], tc[1] + PK.polar(0, 0, AR + 2, 270 + devRot)[1] + dv[1]];
    var tok0 = [insP[0], insP[1] + 17],
      tok1 = [insP[0] + 2.5, insP[1] - 8 + 17];
    dashTie = PK.el("path", { d: "M" + pt(tok0) + " L" + pt(arcMid0) }, W.L.threads);
    dashTie.setAttribute(
      "style",
      "fill:none;stroke:" + C.rust + ";stroke-opacity:" + Math.max(0.55, tieOp) + ";stroke-width:calc(var(--sw, 1) * 1.25px);stroke-linecap:butt;" +
        "stroke-dasharray:calc(var(--sw, 1) * 3px) calc(var(--sw, 1) * 3px);",
    );
    gsap.set(dashTie, { opacity: 0 });
    tl.to(tieIns, { opacity: 0, duration: 0.35, ease: "power1.inOut", immediateRender: false }, tSlip + 0.3);
    tl.fromTo(dashTie, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.inOut", immediateRender: false }, tSlip + 0.3);
    tl.fromTo(dashTie, { attr: { d: "M" + pt(tok0) + " L" + pt(arcMid0) } }, { attr: { d: "M" + pt(tok1) + " L" + pt(arcMid1) }, duration: 1.0, ease: "power2.inOut", immediateRender: false }, tSlip);
  }

  // the gap, measured: two rust-deep ticks at its edges (they stay with the packet) and a faint ghost
  var gapGhost = PK.el("path", { d: PK.arc(0, 0, AR, 236, 304), class: "pk-ghost" }, cs.arcsG);
  gsap.set(gapGhost, { opacity: 0 });
  var gapTicks = PK.g(cs.arcsG);
  [234, 306].forEach(function (a) {
    var p0 = PK.polar(0, 0, AR - 6, a),
      p1 = PK.polar(0, 0, AR + 6, a);
    PK.el("path", { d: "M" + pt(p0) + " L" + pt(p1), fill: "none", stroke: C.rustDeep, "stroke-width": 1.5, "stroke-linecap": "round" }, gapTicks);
  });
  gsap.set(gapTicks, { opacity: 0 });
  var tGap = tSlip + 0.75;
  tl.fromTo(gapTicks, { opacity: 0, scale: 0.6, svgOrigin: "0 0" }, { opacity: 1, scale: 1, svgOrigin: "0 0", duration: 0.3, ease: "power2.out", immediateRender: false }, tGap);
  tl.fromTo(gapGhost, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out", immediateRender: false }, tGap + 0.05);
  PK.sfx("lock", tGap, { gain_db: -16, pan: pan(tc[0], tGap), material: "tick" });

  // ------------------------------------------------------------ "The fire watch ...": Fire pings the Insurer
  var tFire = PK.word("L07", "fire");
  var toIns = (Math.atan2(insP[1] - 8 - fireP[1], insP[0] - fireP[0]) * 180) / Math.PI;
  tl.fromTo(fire.dots, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power1.out", immediateRender: false }, tFire - 0.1);
  tl.fromTo(fire.dots, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: "power1.in", immediateRender: false }, tFire + 1.1);
  var pingG = PK.g(W.L.threads);
  gsap.set(pingG, { x: fireP[0], y: fireP[1] });
  [0, 1].forEach(function (k) {
    var pa = PK.el("path", { d: PK.arc(0, 0, 19, toIns - 26, toIns + 26), class: "pk-thread" }, pingG);
    gsap.set(pa, { opacity: 0 });
    var t0 = tFire + 0.02 + k * 0.2;
    tl.fromTo(pa, { scale: 0.75, svgOrigin: "0 0" }, { scale: 1.7, svgOrigin: "0 0", duration: 0.7, ease: "power2.out", immediateRender: false }, t0);
    tl.fromTo(pa, { opacity: 0 }, { keyframes: [{ opacity: 1, duration: 0.12 }, { opacity: 0, duration: 0.58, ease: "power1.in" }], immediateRender: false }, t0);
  });
  PK.sfx("inspect", tFire, { gain_db: -10, pan: pan(fireP[0], tFire), agent: "fire", material: "ping" });

  // ------------------------------------------------------------ the finding, beside the gap (right of the insurer's tie)
  // two plain rust lengths stacked like rulers: the policy's 60 (dashed) over the planned 30 (solid)
  var FS = PK.cam.px(50.5, 19); // 10.3 world units = 19 px in the still panel shot
  var findG = PK.g(W.L.labels);
  var fx = 402,
    yP = 396,
    yF = yP + FS * 1.7,
    yRd = yF + FS * 1.05,
    yRs = yRd + 6;
  var linePolicy = PK.text(findG, "Policy asks: 60 min", fx, yP, { font: "mono", size: FS, fill: C.rust });
  var linePlanned = PK.text(findG, "Fire watch planned: 30 min", fx, yF, { font: "mono", size: FS, fill: C.rust });
  var rulerD = PK.el("path", { d: "M" + f(fx) + " " + f(yRd) + " H" + f(fx + 60) }, findG);
  rulerD.setAttribute("style", "fill:none;stroke:" + C.rust + ";stroke-width:2.2;stroke-linecap:butt;stroke-dasharray:4.2 3;");
  var rulerS = PK.el("path", { d: "M" + f(fx) + " " + f(yRs) + " H" + f(fx + 30), fill: "none", stroke: C.rust, "stroke-width": 2.2, "stroke-linecap": "butt" }, findG);
  gsap.set([linePolicy, linePlanned, rulerD], { opacity: 0 });
  gsap.set(rulerS, { drawSVG: "0% 0%" });
  var tWatch = PK.word("L07", "watch");
  tl.fromTo(linePlanned, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, tWatch - 0.15);
  PK.drawOn(tl, rulerS, tWatch + 0.05, 0.4, "power2.out", { later: true });
  PK.sfx("return", tWatch - 0.15, { gain_db: -12, pan: pan(fx, tWatch) });
  var tHalf = PK.word("L07", "half");
  tl.fromTo(linePolicy, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, tHalf - 0.05);
  tl.fromTo(rulerD, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out", immediateRender: false }, tHalf);
  PK.sfx("compare", tHalf, { gain_db: -9, pan: pan(fx, tHalf) });

  // ------------------------------------------------------------ no hard stop: an unengaged, dashed barrier outline on the route
  function routeAt(x) {
    var len = W.route.getTotalLength();
    for (var s = 0; s <= len; s += 0.5) {
      var q = W.route.getPointAtLength(s);
      if (q.x >= x) return [q.x, q.y];
    }
    return [x, G.panel.doorY];
  }
  var gp = routeAt(756);
  // under the route layer, so the route runs over it unbroken: an outline, not engaged
  var gate = PK.g(W.L.trails);
  gsap.set(gate, { x: gp[0], y: gp[1] });
  var barW = 10,
    barL = 58;
  var bar = PK.el("path", { d: PK.rectPath(-barW / 2, -barL / 2, barW, barL, 3) }, gate);
  bar.setAttribute(
    "style",
    "fill:" + C.paper + ";stroke:" + C.grey + ";stroke-width:calc(var(--sw, 1) * 1.6px);stroke-linecap:butt;stroke-linejoin:round;" +
      "stroke-dasharray:calc(var(--sw, 1) * 4.5px) calc(var(--sw, 1) * 3.5px);",
  );
  gsap.set(gate, { opacity: 0 });
  var BS = PK.cam.px(51.0, 19);
  var gateLabel = PK.text(W.L.labels, "No hard stop configured", gp[0], gp[1] + barL / 2 + BS * 1.9, { font: "mono", size: BS, fill: C.grey, anchor: "middle" });
  gsap.set(gateLabel, { opacity: 0 });
  var tGate = 50.3;
  tl.fromTo(gate, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out", immediateRender: false }, tGate);
  tl.fromTo(gateLabel, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, tGate + 0.15);
  tl.fromTo([gate, gateLabel], { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, 52.3);
  PK.sfx("thread", tGate, { gain_db: -16, material: "pencil", dur: 0.35, pan: pan(gp[0], tGate) });

  // ------------------------------------------------------------ 52.1 to 52.75 (still): assemble one compact decision packet
  var tA = PK.word("L08", "priora") - 0.3; // 52.10
  var gapPt = [tc[0], tc[1] - AR * 0.85];
  // the finding fades before it shrinks below 85 percent, drawn toward the gap
  tl.fromTo(findG, { scale: 1, svgOrigin: pt(gapPt) }, { scale: 0.85, svgOrigin: pt(gapPt), duration: 0.25, ease: "power2.in", immediateRender: false }, tA);
  tl.fromTo(findG, { opacity: 1 }, { opacity: 0, duration: 0.22, ease: "power1.in", immediateRender: false }, tA);
  tl.fromTo([twin, gapGhost], { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, tA);
  if (dashTie) tl.fromTo(dashTie, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, tA);
  // the other ties retract toward their agents (nothing left pointing at an empty table)
  KEYS.forEach(function (k, i) {
    if (!ties[k] || k === "insurer") return;
    var keep = agentEnd(ties[k], k) === "start" ? "0% 0%" : "100% 100%";
    tl.to(ties[k], { drawSVG: keep, duration: 0.35, ease: "power2.in", immediateRender: false }, tA + 0.05 + i * 0.03);
    tl.to(ties[k], { opacity: 0, duration: 0.05, ease: "none", immediateRender: false }, tA + 0.38 + i * 0.03); // no round-cap dot left behind
  });
  tl.fromTo(cs.arcsG, { scale: 1, svgOrigin: "0 0" }, { scale: 0.85, svgOrigin: "0 0", duration: 0.4, ease: "power3.inOut", immediateRender: false }, tA + 0.02);
  // the facets slide aside round the ring so the gap at the top is clear: each facet group turns
  // about the ring centre; its mark counter-turns (transform attribute) so it stays upright
  var FACET_TO = { repair: 210, hot: 330, place: 18, time: 66, conditions: 114, photo: 162 };
  var FACET_ROT = {};
  cs.facets.forEach(function (fc) {
    var to = FACET_TO[fc.key];
    var from = fc.angle;
    if (to - from > 180) to -= 360;
    if (to - from < -180) to += 360; // place: 330 -> 378 (= 18)
    FACET_ROT[fc.key] = to;
    tl.fromTo(fc.g, { rotation: from, svgOrigin: "0 0" }, { rotation: to, svgOrigin: "0 0", duration: 0.45, ease: "power2.inOut", immediateRender: false }, tA + 0.05);
    tl.fromTo(fc.mark, { attr: { transform: "rotate(0)" } }, { attr: { transform: "rotate(" + f(from - to) + ")" }, duration: 0.45, ease: "power2.inOut", immediateRender: false }, tA + 0.05);
  });
  PK.sfx("assemble", tA + 0.02, { gain_db: -4, dur: 0.45, pan: pan(tc[0], tA) });
  // reset the hidden insurer arc and its twin to the aligned place (s6 to s8 may use the arc again)
  tl.set(insW, { attr: { transform: wT(0, 0, 0) } }, tA + 0.5);

  // Priora steps up clear of the door; the packet comes out and waits beside it
  var waitP = [710, 402];
  var pkWait = [668, 470]; // just outside the door, above the route
  PK.travel(tl, W.priora.g, PK.curve(prioraP, waitP, 8), tA, 0.5, "power2.inOut");
  tl.fromTo(W.priora.beadG, { rotation: 180, svgOrigin: "0 0" }, { rotation: 122, svgOrigin: "0 0", duration: 0.45, ease: "power2.inOut", immediateRender: false }, tA + 0.05);
  PK.sfx("move", tA, { gain_db: -15, dur: 0.5, pan: pan(700, tA), size: "small" });
  var door = [G.panel.x + G.panel.w, G.panel.doorY];
  // under Fire, through the middle of the door, up beside Priora
  var outD = "M" + pt(tc) + " C" + pt([450, 560]) + " " + pt([540, 552]) + " " + pt([door[0], door[1]]) + " Q" + pt([646, door[1]]) + " " + pt(pkWait);
  var tOut = tA + 0.02,
    outDur = 0.6;
  PK.travel(tl, cs.g, outD, tOut, outDur, "power2.inOut");
  PK.trail(tl, W.L.trails, outD, tOut, outDur, "power2.inOut");
  PK.sfx("move", tOut, { gain_db: -11, dur: outDur, pan: pan(520, tOut) });
  PK.sfx("packet", tOut + outDur, { gain_db: -8, pan: pan(pkWait[0], tOut + outDur) });

  // DECISION PACKET: still beside the packet at the door, through the pull out
  var PS = PK.cam.px(53.95, 19); // 19 px in the escalation shot, larger in the close-up
  var pLabel = PK.text(W.L.labels, "Decision packet", pkWait[0] + AR * 0.85 + 10, pkWait[1] + PS * 0.36, { font: "mono", size: PS, fill: C.rust, anchor: "start" });
  gsap.set(pLabel, { opacity: 0 });
  tl.fromTo(pLabel, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "power1.out", immediateRender: false }, tOut + outDur - 0.17);
  tl.fromTo(pLabel, { opacity: 1 }, { opacity: 0, duration: 0.15, ease: "power1.in", immediateRender: false }, 53.85);
  // the brackets settle shut during the pull out (nothing to read there)
  tl.fromTo(ins.left, { x: -2.1 }, { x: 0, duration: 0.4, ease: "power2.inOut", immediateRender: false }, 53.0);
  tl.fromTo(ins.right, { x: 2.1 }, { x: 0, duration: 0.4, ease: "power2.inOut", immediateRender: false }, 53.0);

  // ------------------------------------------------------------ 53.95 to 55.5 (still): Priora carries the packet to the risk owner
  var tEsc = 53.95,
    escDur = 1.55,
    escE = "power2.inOut";
  var off0 = [pkWait[0] - waitP[0], pkWait[1] - waitP[1]],
    off1 = [DOCK[0] - PDOCK[0], DOCK[1] - PDOCK[1]];
  var c1 = [860, 320],
    c2 = [PDOCK[0], 440];
  var escD = "M" + pt(waitP) + " C" + pt(c1) + " " + pt(c2) + " " + pt(PDOCK);
  var escPk = "M" + pt(pkWait) + " C" + pt([c1[0] + off0[0], c1[1] + off0[1]]) + " " + pt([c2[0] + off1[0], c2[1] + off1[1]]) + " " + pt(DOCK);
  var beadAt = (Math.atan2(DOCK[1] - PDOCK[1], DOCK[0] - PDOCK[0]) * 180) / Math.PI; // 58.3: at the packet
  tl.fromTo(W.priora.beadG, { rotation: 122, svgOrigin: "0 0" }, { rotation: 20, svgOrigin: "0 0", duration: 0.4, ease: "power2.inOut", immediateRender: false }, tEsc - 0.05);
  PK.travel(tl, W.priora.g, escD, tEsc, escDur, escE);
  PK.travel(tl, cs.g, escPk, tEsc, escDur, escE);
  PK.trail(tl, W.L.trails, escD, tEsc, escDur, escE);
  PK.trail(tl, W.L.trails, escPk, tEsc, escDur, escE);
  PK.sfx("escalate", tEsc, { gain_db: -4, dur: escDur, pan: pan(950, tEsc) });
  var tArr = tEsc + escDur; // 55.5
  tl.fromTo(W.priora.beadG, { rotation: 20, svgOrigin: "0 0" }, { rotation: beadAt, svgOrigin: "0 0", duration: 0.35, ease: "power2.inOut", immediateRender: false }, tArr - 0.15);
  PK.sfx("arrive", tArr - 0.05, { gain_db: -8, size: "case", pan: pan(DOCK[0], tArr) });

  // ------------------------------------------------------------ "the human decides": the risk owner's black line loops the packet
  var tDec = PK.word("L08", "the", 2); // 55.72
  var hand = [1180, 711];
  var th0 = 120,
    sweep = 480,
    r0 = AR,
    r1 = AR + 6;
  var join = PK.polar(DOCK[0], DOCK[1], r0, th0);
  var decD = "M" + pt(hand) + " C" + pt([hand[0] + 9, hand[1] + 1]) + " " + pt([join[0] - 8.5, join[1] - 5]) + " " + pt(join);
  for (var s2 = 3; s2 <= sweep; s2 += 3) {
    var u = s2 / sweep;
    decD += " L" + pt(PK.polar(DOCK[0], DOCK[1], r0 + (r1 - r0) * u, th0 - s2));
  }
  var tip = PK.polar(DOCK[0], DOCK[1], r1, th0 - sweep); // (1274, 680), heading straight up
  tl.set(W.decision, { attr: { d: decD } }, tDec - 0.1);
  tl.set(W.decision, { opacity: 1 }, tDec);
  PK.drawOn(tl, W.decision, tDec, 0.68, "power2.inOut", { later: true });
  var decDot = PK.el("circle", { cx: f(tip[0]), cy: f(tip[1]), r: 3.4, fill: C.ink }, W.L.routes);
  gsap.set(decDot, { opacity: 0 });
  tl.fromTo(decDot, { opacity: 0, scale: 0.4, svgOrigin: pt(tip) }, { opacity: 1, scale: 1, svgOrigin: pt(tip), duration: 0.18, ease: "power2.out", immediateRender: false }, tDec + 0.64);
  PK.sfx("decision", tDec, { gain_db: -2, dur: 0.68, pan: pan(DOCK[0], tDec) });
  var DS = PK.cam.px(56.2, 19);
  W.ownerDecides = PK.text(W.L.labels, "Risk owner decides", tip[0] + 14, DOCK[1] - 30, { font: "mono", size: DS, fill: C.ink, anchor: "start" });
  gsap.set(W.ownerDecides, { opacity: 0 });
  tl.fromTo(W.ownerDecides, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", immediateRender: false }, tDec + 0.3);

  // ------------------------------------------------------------ hand-over
  W.gap = { a0: 234, a1: 306, r: AR };
  W.gapTicks = gapTicks;
  W.facetAngles = FACET_TO; // fc.g rotation at 57.0 (place is 378, i.e. 18)
  W.facetRotations = FACET_ROT;
  W.decisionD = decD;
  W.decisionTip = [Math.round(tip[0] * 1000) / 1000, Math.round(tip[1] * 1000) / 1000];
  W.decisionDot = decDot;
  if (W.align.arcs === arcs) W.align.insurerDashed = twin;
});
