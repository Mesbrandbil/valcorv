/*
  s5-deviation (47 to 57 s): a deviation. Cut 3 (docs/cut3-plan.md, section "C: s5").

  Camera: still on the panel [540, 514, 1090] from 48.1 to 53.35; a pan right 53.35 to 54.35
  to [930, 600, 1020] (the escalation follows it); still to 56.95 (the decision is held there).

  48.10 the Insurer re-checks: its brackets tremble, its arc trembles. On "slips" (48.34) its
  arc rotates out of line and turns dashed (clearly out by 48.55), its tie from s4 goes dashed
  with it, the token tilts (by 48.75) and its brackets fail to close; 48.75 two short rust-deep
  ticks lock onto the ring at the gap's edges (a faint grey ghost shows where the arc belongs).
  CONFIGURED FOR THIS SITE fades at 48.1. Fire pings the Insurer. In the clear paper right of
  the panel (reported out, above Priora), each label with its own ruler under it from one
  shared origin tick: FIRE WATCH PLANNED: 30 MIN
  (a solid 30-minute length, about 150 px) then on "half" POLICY ASKS: 60 MIN (a dashed
  60-minute length, about 300 px). 50.3 an unengaged dashed grey barrier outline on the route
  outside the door, the route running over it unbroken: NO HARD STOP CONFIGURED (ink-2).
  51.55 the finding and the barrier fade; the five ties retract into their agents; Priora
  steps up clear of the door; its bead pulses and a thread reaches in through the door to the
  ring, which contracts at the table into one compact decision packet (arcsG 0.85, the
  facets slide aside so the gap at the top stays clear); on "Priora brings it" the packet
  comes out along the thread through the open door to Priora (52.45 to 52.85), and the thread
  that is left ties it to Priora's bead: DECISION PACKET. The route lets go of the empty
  table (it now runs from the panel door to the window). Pan: the panel names fade; Priora
  carries the packet to the dock beside the risk owner (53.45 to 54.65), landing before
  "Agents prepare". On "the human decides" the risk owner's black line leaves the desk's
  top-right corner on a diagonal, swings under the packet, rises at its right side and loops
  once round it, ending where the loop began, with a round end dot: RISK OWNER DECIDES,
  above the risk owner. Still to 56.95.

  Contract at 47.0 (from s4): docs/cut2-plan.md section 2 (unchanged). If s4 has not provided
  W.align, this section builds the 47.0 state itself.

  Contract at 57.0 (for s6):
    Priora at GEO.prioraDock (1186, 612), scale 1, beadG rotation 58.3 (at the packet).
    Packet W.caseT.g at GEO.dock (1228, 680), body scale 1, arcsG scale 0.85 (svgOrigin 0 0).
    Insurer arc opacity 0 (back at its aligned place); the four other arcs solid, opacity 1.
    Facets folded (chipG untouched) and slid aside: fc.g rotation = W.facetRotations[key]
      (repair 210, hot 330, place 378 = 18, time 66, conditions 114, photo 162), each fc.mark
      with transform attribute rotate(fc.angle - that), so the marks stay upright.
    W.gapTicks: two short rust-deep radial ticks on the ring line at 234 and 306 degrees
      (local radius 35.5 to 41.55 inside arcsG: on the arc ends, just inside, pointing to the
      core; nothing beyond the ring outline).
      W.gap = { a0: 234, a1: 306, r: 40 } (local to arcsG).
    W.decision (pk-decision) d = W.decisionD, drawn, opacity 1: from the desk's top-right
      corner (1182, 710) on a diagonal under the packet, up its right side to W.decisionTip,
      then one turn round the packet (radius W.decisionLoop.r = 42, counter-clockwise on
      screen: right, top, left, bottom, right) ending at W.decisionTip = [1270, 680], heading
      straight up. W.decisionDot: round ink end dot at the tip, opacity 1.
    W.ownerDecides ("RISK OWNER DECIDES", ink mono, 19 px) above the risk owner, visible.
    W.route drawn from the panel door to the window: drawSVG W.routeDraw (start at the door).
    Panel agent names and CONFIGURED FOR THIS SITE at opacity 0 (hidden for the rest of the film).
    W.align.insurerDashed opacity 0. The Insurer conditions token tilted 12 degrees and 8 units
    outward, brackets shut. No barrier, no other labels.
*/
PK.section("s5-deviation", 47, 57, function (tl, W, ctx, S) {
  var G = PK.GEO,
    C = PK.C,
    f = PK.fmt;
  var T0 = 47.0;
  var cs = W.caseT;
  var A = W.agents;
  var P = W.priora;
  var tc = G.table; // the case at the table, (380, 520)
  var AR = G.alignR; // 40
  var KEYS = ["siteRules", "insurer", "fire", "riskEng", "evidence"];
  var DOCK = G.dock || [1228, 680];
  var PDOCK = G.prioraDock || [1186, 612];
  var INK2 = C.ink2 || "#3A3936";
  function pt(p) {
    return f(p[0]) + " " + f(p[1]);
  }
  function pan(x, t) {
    var c = PK.cam.camAt(t);
    var p = (x - c[0]) / (c[2] / 2);
    return Math.round(Math.max(-1, Math.min(1, p)) * 100) / 100;
  }
  function FT(el, from, to, at) {
    to.immediateRender = false;
    tl.fromTo(el, from, to, at);
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
    var PN = W.panel;
    tl.set(PN.walls, { drawSVG: "0% 100%" }, T0);
    tl.set([PN.leafA, PN.leafB, PN.jambs, PN.title], { opacity: 1 }, T0);
    tl.set(PN.leafA, { y: -G.panel.gap / 2 + 0.01 }, T0);
    tl.set(PN.leafB, { y: G.panel.gap / 2 - 0.01 }, T0);
    PN.slots.forEach(function (s) {
      tl.set(s.el, { opacity: 0 }, T0);
    });
    KEYS.forEach(function (k) {
      var p = G.slot(G.agents[k].aligned);
      tl.set(A[k].g, { x: p[0], y: p[1], opacity: 1 }, T0);
      tl.set(A[k].body, { rotation: 0, scale: 1, svgOrigin: "0 0" }, T0);
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
  var names = KEYS.map(function (k) {
    return A[k].label;
  });
  tl.set(P.g, { x: prioraP[0], y: prioraP[1], opacity: 1 }, T0);
  tl.set(P.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(P.beadG, { rotation: 180, svgOrigin: "0 0" }, T0);
  tl.set(P.bead, { scale: 1, svgOrigin: "26 0" }, T0);
  tl.set(P.label, { opacity: 0 }, T0);
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
  tl.set(names, { opacity: 1 }, T0);
  tl.set(W.panel.sub, { opacity: 1 }, T0);
  tl.set(W.route, { drawSVG: "0% 100%" }, T0);
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

  // ------------------------------------------------------------ 48.1 (camera landed): the subtitle goes, the Insurer re-checks
  var tCheck = 48.1;
  FT(W.panel.sub, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in" }, tCheck);
  // a visible tremble of the brackets (about 2 world units = 3.5 px) and of its arc, 48.10 to 48.30
  FT(ins.left, { x: 0 }, { keyframes: [{ x: -2, duration: 0.05 }, { x: -0.3, duration: 0.05 }, { x: -2, duration: 0.05 }, { x: 0, duration: 0.05 }] }, tCheck);
  FT(ins.right, { x: 0 }, { keyframes: [{ x: 2, duration: 0.05 }, { x: 0.3, duration: 0.05 }, { x: 2, duration: 0.05 }, { x: 0, duration: 0.05 }] }, tCheck);
  FT(
    insW,
    { attr: { transform: wT(0, 0, 0) } },
    {
      keyframes: [
        { attr: { transform: wT(0, 0, 1.4) }, duration: 0.05, ease: "power1.out" },
        { attr: { transform: wT(0, 0, -0.9) }, duration: 0.07, ease: "power1.inOut" },
        { attr: { transform: wT(0, 0, 0.6) }, duration: 0.05, ease: "power1.inOut" },
        { attr: { transform: wT(0, 0, 0) }, duration: 0.05, ease: "power1.in" },
      ],
    },
    tCheck,
  );
  PK.sfx("inspect", tCheck, { gain_db: -14, pan: pan(insP[0], tCheck), agent: "insurer" });

  // ------------------------------------------------------------ "slips" (48.34): deviate, on the word
  var tSlip = PK.word("L07", "slips");
  var devRot = 9,
    drift = 15;
  var dv = PK.polar(0, 0, drift, 270 + devRot);
  FT(insW, { attr: { transform: wT(0, 0, 0) } }, { attr: { transform: wT(dv[0], dv[1], devRot) }, duration: 0.55, ease: "power2.out" }, tSlip); // clearly out by 48.55
  FT(twin, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "power1.out" }, tSlip);
  FT(arcIns, { opacity: 1 }, { opacity: 0, duration: 0.18, ease: "power1.in" }, tSlip + 0.02);
  FT(ins.body, { rotation: 0, svgOrigin: "0 0" }, { rotation: 12, svgOrigin: "0 0", duration: 0.41, ease: "power2.out" }, tSlip); // tilted by 48.75
  FT(ins.g, { x: insP[0], y: insP[1] }, { x: insP[0], y: insP[1] - 8, duration: 0.41, ease: "power2.out" }, tSlip);
  // the brackets open, try to close and cannot
  FT(ins.left, { x: 0 }, { x: -3.5, duration: 0.16, ease: "power2.out" }, tSlip);
  FT(ins.right, { x: 0 }, { x: 3.5, duration: 0.16, ease: "power2.out" }, tSlip);
  FT(ins.left, { x: -3.5 }, { x: -2.1, duration: 0.25, ease: "power2.out" }, tSlip + 0.22);
  FT(ins.right, { x: 3.5 }, { x: 2.1, duration: 0.25, ease: "power2.out" }, tSlip + 0.22);
  PK.sfx("deviate", tSlip, { gain_db: -2, dur: 0.55, pan: pan(tc[0], tSlip) });

  // the insurer's tie goes dashed with its arc: the solid tie fades, a dashed tie follows token and arc
  var dashTie = null;
  if (ties.insurer) {
    var tieIns = ties.insurer;
    var midA = PK.polar(0, 0, AR + 3, 270 + devRot);
    var arcMid0 = [tc[0], tc[1] - AR - 3],
      arcMid1 = [tc[0] + midA[0] + dv[0], tc[1] + midA[1] + dv[1]];
    var tok0 = [insP[0], insP[1] + 17],
      tok1 = [insP[0] + 2.5, insP[1] - 8 + 17];
    dashTie = PK.el("path", { d: "M" + pt(tok0) + " L" + pt(arcMid0) }, W.L.threads);
    dashTie.setAttribute(
      "style",
      "fill:none;stroke:" + C.rust + ";stroke-opacity:0.55;stroke-width:calc(var(--sw, 1) * 1.25px);stroke-linecap:butt;" +
        "stroke-dasharray:calc(var(--sw, 1) * 3px) calc(var(--sw, 1) * 3px);",
    );
    gsap.set(dashTie, { opacity: 0 });
    tl.to(tieIns, { opacity: 0, duration: 0.18, ease: "power1.in", immediateRender: false }, tSlip + 0.02);
    FT(dashTie, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "power1.out" }, tSlip);
    FT(dashTie, { attr: { d: "M" + pt(tok0) + " L" + pt(arcMid0) } }, { attr: { d: "M" + pt(tok1) + " L" + pt(arcMid1) }, duration: 0.55, ease: "power2.out" }, tSlip);
  }

  // the gap: two short rust-deep ticks lock onto the ring line at its edges (they stay with the
  // packet; nothing sticks out of the ring) and a faint grey ghost of where the arc belongs
  var gapGhost = PK.el("path", { d: PK.arc(0, 0, AR, 236, 304), class: "pk-ghost" }, cs.arcsG);
  gsap.set(gapGhost, { opacity: 0 });
  var gapTicks = PK.g(cs.arcsG);
  [234, 306].forEach(function (a) {
    var p0 = PK.polar(0, 0, AR - 4.5, a),
      p1 = PK.polar(0, 0, AR + 1.55, a);
    PK.el("path", { d: "M" + pt(p0) + " L" + pt(p1), fill: "none", stroke: C.rustDeep, "stroke-width": 1.9, "stroke-linecap": "butt" }, gapTicks);
  });
  gsap.set(gapTicks, { opacity: 0 });
  var tGap = tSlip + 0.41; // 48.75, as the token settles
  FT(gapTicks, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "none" }, tGap);
  FT(gapGhost, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" }, tGap + 0.05);
  PK.sfx("lock", tGap, { gain_db: -16, pan: pan(tc[0], tGap), material: "tick" });

  // ------------------------------------------------------------ "The fire watch ...": Fire pings the Insurer
  var tFire = PK.word("L07", "fire");
  var toIns = (Math.atan2(insP[1] - 8 - fireP[1], insP[0] - fireP[0]) * 180) / Math.PI;
  FT(fire.dots, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power1.out" }, tFire - 0.1);
  FT(fire.dots, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: "power1.in" }, tFire + 1.1);
  var pingG = PK.g(W.L.threads);
  gsap.set(pingG, { x: fireP[0], y: fireP[1] });
  [0, 1].forEach(function (k) {
    var pa = PK.el("path", { d: PK.arc(0, 0, 19, toIns - 26, toIns + 26), class: "pk-thread" }, pingG);
    gsap.set(pa, { opacity: 0 });
    var t0 = tFire + 0.02 + k * 0.2;
    FT(pa, { scale: 0.75, svgOrigin: "0 0" }, { scale: 1.7, svgOrigin: "0 0", duration: 0.7, ease: "power2.out" }, t0);
    FT(pa, { opacity: 0 }, { keyframes: [{ opacity: 1, duration: 0.12 }, { opacity: 0, duration: 0.58, ease: "power1.in" }] }, t0);
  });
  PK.sfx("inspect", tFire, { gain_db: -10, pan: pan(fireP[0], tFire), agent: "fire", material: "ping" });

  // ------------------------------------------------------------ the finding, reported out beside the door: each label with its own ruler
  // one shared origin tick; 60 min is about 300 px on screen, 30 min about 150 px
  var FS = PK.cam.px(50.5, 19); // 10.8 world units = 19 px in the panel frame
  var U60 = PK.cam.px(50.5, 300),
    U30 = U60 / 2;
  var findG = PK.g(W.L.labels);
  var ox = 652, // the shared origin (in the clear paper right of the panel, above Priora)
    tx = ox + 6, // text starts just right of the origin tick
    yL1 = 300,
    yR1 = yL1 + 8,
    yL2 = yR1 + FS * 2.25,
    yR2 = yL2 + 8;
  var linePlanned = PK.text(findG, "Fire watch planned: 30 min", tx, yL1, { font: "mono", size: FS, fill: C.rust });
  var rulerS = PK.el("path", { d: "M" + f(ox) + " " + f(yR1) + " H" + f(ox + U30), fill: "none", stroke: C.rust, "stroke-width": 2.6, "stroke-linecap": "butt" }, findG);
  var linePolicy = PK.text(findG, "Policy asks: 60 min", tx, yL2, { font: "mono", size: FS, fill: C.rust });
  var rulerD = PK.el("path", { d: "M" + f(ox) + " " + f(yR2) + " H" + f(ox + U60) }, findG);
  rulerD.setAttribute("style", "fill:none;stroke:" + C.rust + ";stroke-width:2.6;stroke-linecap:butt;stroke-dasharray:6.5 4.2;");
  var origin = PK.el("path", { d: "M" + f(ox) + " " + f(yR1 - 6) + " V" + f(yR2 + 6), fill: "none", stroke: C.rust, "stroke-width": 1.3, "stroke-linecap": "butt" }, findG);
  gsap.set([linePlanned, linePolicy, rulerD], { opacity: 0 });
  gsap.set(rulerS, { drawSVG: "0% 0%" });
  gsap.set(origin, { drawSVG: "50% 50%" });
  var tWatch = PK.word("L07", "watch");
  FT(linePlanned, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, tWatch - 0.15);
  FT(origin, { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.2, ease: "power2.out" }, tWatch - 0.05);
  PK.drawOn(tl, rulerS, tWatch + 0.05, 0.35, "power2.out", { later: true });
  PK.sfx("return", tWatch + 0.38, { gain_db: -12, pan: pan(ox + U30, tWatch) }); // the 30-minute length lands
  var tHalf = PK.word("L07", "half");
  FT(linePolicy, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, tHalf - 0.05);
  FT(rulerD, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power1.out" }, tHalf);
  PK.sfx("compare", tHalf + 0.05, { gain_db: -9, pan: pan(ox + U60 / 2, tHalf) });

  // ------------------------------------------------------------ no hard stop: an unengaged, dashed barrier outline on the route
  function routeAt(x) {
    var len = W.route.getTotalLength();
    for (var s = 0; s <= len; s += 0.5) {
      var q = W.route.getPointAtLength(s);
      if (q.x >= x) return { p: [q.x, q.y], s: s, len: len };
    }
    return { p: [x, G.panel.doorY], s: 0, len: len };
  }
  var gp = routeAt(756).p;
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
  var BS = PK.cam.px(50.5, 20);
  var gateLabel = PK.text(W.L.labels, "No hard stop configured", gp[0], gp[1] + barL / 2 + BS * 1.8, { font: "mono", size: BS, fill: INK2, anchor: "middle" });
  gsap.set(gateLabel, { opacity: 0 });
  var tGate = 50.3;
  FT(gate, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" }, tGate);
  FT(gateLabel, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, tGate + 0.12);

  // ------------------------------------------------------------ 51.55: the finding is gathered
  var tF = 51.55;
  FT([findG, gate, gateLabel, twin, gapGhost], { opacity: 1 }, { opacity: 0, duration: 0.2, ease: "power1.in" }, tF);
  if (dashTie) FT(dashTie, { opacity: 1 }, { opacity: 0, duration: 0.2, ease: "power1.in" }, tF);
  // the ties retract into their agents (51.6 to 51.8), leaving nothing behind
  KEYS.forEach(function (k, i) {
    if (!ties[k] || k === "insurer") return;
    var keep = agentEnd(ties[k], k) === "start" ? "0% 0%" : "100% 100%";
    tl.to(ties[k], { drawSVG: keep, duration: 0.2, ease: "power2.in", immediateRender: false }, 51.6);
    tl.to(ties[k], { opacity: 0, duration: 0.02, ease: "none", immediateRender: false }, 51.8);
  });
  tl.set(insW, { attr: { transform: wT(0, 0, 0) } }, 51.8); // the hidden insurer arc back to its aligned place

  // Priora steps up clear of the door (51.6 to 51.95), its bead toward the door
  var waitP = [712, 404];
  var pkWait = [668, 470]; // just outside the door, above the route
  PK.travel(tl, P.g, PK.curve(prioraP, waitP, 8), 51.6, 0.35, "power2.inOut");
  FT(P.beadG, { rotation: 180, svgOrigin: "0 0" }, { rotation: 122, svgOrigin: "0 0", duration: 0.35, ease: "power2.inOut" }, 51.6);
  var beadAt = PK.polar(waitP[0], waitP[1], 26, 122);

  // Priora gathers: its bead pulses and a thread reaches in through the door to the ring
  function beadPulse(at) {
    FT(P.bead, { scale: 1, svgOrigin: "26 0" }, { keyframes: [{ scale: 1.7, duration: 0.1, ease: "power2.out" }, { scale: 1, duration: 0.22, ease: "power2.inOut" }], svgOrigin: "26 0" }, at);
  }
  var door = [G.panel.x + G.panel.w, G.panel.doorY];
  var outD = "M" + pt(tc) + " C" + pt([450, 560]) + " " + pt([540, 552]) + " " + pt([door[0], door[1]]) + " Q" + pt([646, door[1]]) + " " + pt(pkWait);
  var gatherD = "M" + pt(beadAt) + " L" + pt(pkWait) + " Q" + pt([646, door[1]]) + " " + pt([door[0], door[1]]) + " C" + pt([540, 552]) + " " + pt([450, 560]) + " " + pt(tc);
  var gather = PK.thread(W.L.threads, gatherD);
  gsap.set(gather, { drawSVG: "0% 0%" });
  var linkPct = (Math.hypot(pkWait[0] - beadAt[0], pkWait[1] - beadAt[1]) / gather.getTotalLength()) * 100;
  var tG = 51.95;
  beadPulse(tG);
  PK.drawOn(tl, gather, tG, 0.25, "power2.out", { later: true });
  PK.sfx("assemble", tG, { gain_db: -5, dur: 0.5, pan: pan(500, tG) });
  // the ring contracts at the table into one compact packet (51.8 to 52.45)
  FT(cs.arcsG, { scale: 1, svgOrigin: "0 0" }, { scale: 0.85, svgOrigin: "0 0", duration: 0.65, ease: "power3.inOut" }, 51.8);
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
    FT(fc.g, { rotation: from, svgOrigin: "0 0" }, { rotation: to, svgOrigin: "0 0", duration: 0.6, ease: "power3.inOut" }, 51.85);
    FT(fc.mark, { attr: { transform: "rotate(0)" } }, { attr: { transform: "rotate(" + f(from - to) + ")" }, duration: 0.6, ease: "power3.inOut" }, 51.85);
  });
  beadPulse(52.22);

  // ------------------------------------------------------------ "Priora brings it": the packet comes out along the thread (52.45 to 52.85)
  var tOut = 52.45,
    outDur = 0.4,
    outE = "power3.out";
  PK.travel(tl, cs.g, outD, tOut, outDur, outE);
  PK.trail(tl, W.L.trails, outD, tOut, outDur, outE);
  // the thread follows the packet back to the bead: what is left ties the packet to Priora
  FT(gather, { drawSVG: "0% 100%" }, { drawSVG: "0% " + f(linkPct) + "%", duration: outDur, ease: outE }, tOut);
  PK.sfx("packet", tOut + outDur, { gain_db: -8, pan: pan(pkWait[0], tOut + outDur) });

  // DECISION PACKET: still beside the packet at the door, then it rides with the packet into the carry
  var PS = PK.cam.px(52.9, 19);
  var pLabel = PK.text(cs.g, "Decision packet", AR * 0.85 + 11, PS * 0.36, { font: "mono", size: PS, fill: C.rust, anchor: "start" });
  gsap.set(pLabel, { opacity: 0 });
  FT(pLabel, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power1.out" }, tOut + outDur);
  FT(pLabel, { opacity: 1 }, { opacity: 0, duration: 0.2, ease: "power1.in" }, 54.05);

  // the route lets go of the empty table: from now on it runs from the panel door to the window
  var rDoor = routeAt(door[0]);
  var routeDraw = f((rDoor.s / rDoor.len) * 100) + "% 100%";
  FT(W.route, { drawSVG: "0% 100%" }, { drawSVG: routeDraw, duration: 0.4, ease: "power2.inOut" }, 52.95);

  // ------------------------------------------------------------ the pan (53.35 to 54.35): names fade, Priora carries the packet to the dock
  FT(names, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: "power1.in" }, 53.35);
  FT(ins.left, { x: -2.1 }, { x: 0, duration: 0.3, ease: "power2.inOut" }, 53.4);
  FT(ins.right, { x: 2.1 }, { x: 0, duration: 0.3, ease: "power2.inOut" }, 53.4);
  FT(gather, { drawSVG: "0% " + f(linkPct) + "%" }, { drawSVG: "0% 0%", duration: 0.12, ease: "power1.in" }, 53.33); // the tie draws into the bead
  FT(P.beadG, { rotation: 122, svgOrigin: "0 0" }, { rotation: 20, svgOrigin: "0 0", duration: 0.3, ease: "power2.inOut" }, 53.35);
  var tEsc = 53.45,
    escDur = 1.2,
    escE = "power2.inOut";
  var off0 = [pkWait[0] - waitP[0], pkWait[1] - waitP[1]],
    off1 = [DOCK[0] - PDOCK[0], DOCK[1] - PDOCK[1]];
  var c1 = [860, 320],
    c2 = [PDOCK[0], 440];
  var escD = "M" + pt(waitP) + " C" + pt(c1) + " " + pt(c2) + " " + pt(PDOCK);
  var escPk = "M" + pt(pkWait) + " C" + pt([c1[0] + off0[0], c1[1] + off0[1]]) + " " + pt([c2[0] + off1[0], c2[1] + off1[1]]) + " " + pt(DOCK);
  var beadDock = (Math.atan2(DOCK[1] - PDOCK[1], DOCK[0] - PDOCK[0]) * 180) / Math.PI; // 58.3: at the packet
  PK.travel(tl, P.g, escD, tEsc, escDur, escE);
  PK.travel(tl, cs.g, escPk, tEsc, escDur, escE);
  PK.trail(tl, W.L.trails, escD, tEsc, escDur, escE);
  PK.sfx("escalate", tEsc, { gain_db: -5, dur: escDur, pan: pan(950, tEsc + 0.6) });
  var tArr = tEsc + escDur; // 54.65, before "Agents prepare" (54.78)
  FT(P.beadG, { rotation: 20, svgOrigin: "0 0" }, { rotation: beadDock, svgOrigin: "0 0", duration: 0.3, ease: "power2.inOut" }, tArr - 0.12);
  PK.sfx("arrive", tArr, { gain_db: -8, size: "case", pan: pan(DOCK[0], tArr) });

  // ------------------------------------------------------------ "the human decides": the risk owner's black line loops the packet
  var tDec = PK.word("L08", "the", 2); // 55.72: the line leaves the desk
  var corner = [1182, 710]; // the desk's top-right corner
  var LR = 42; // loop radius: about 10 px clear of the packet ring, about 20 px clear of Priora's orbit
  var tip = [DOCK[0] + LR, DOCK[1]];
  var decD =
    "M" + pt(corner) +
    " C" + pt([1196, 736]) + " " + pt([1282, 770]) + " " + pt(tip) + // a diagonal off the corner, under the packet, up its right side
    " A" + LR + " " + LR + " 0 0 0 " + pt([DOCK[0], DOCK[1] - LR]) +
    " A" + LR + " " + LR + " 0 0 0 " + pt([DOCK[0] - LR, DOCK[1]]) +
    " A" + LR + " " + LR + " 0 0 0 " + pt([DOCK[0], DOCK[1] + LR]) +
    " A" + LR + " " + LR + " 0 0 0 " + pt(tip); // one turn: right, top, left, bottom, right
  tl.set(W.decision, { attr: { d: decD } }, tDec - 0.1);
  tl.set(W.decision, { opacity: 1 }, tDec);
  PK.drawOn(tl, W.decision, tDec, 0.65, "power2.inOut", { later: true }); // reaches the packet about 55.95, loop done 56.37
  var decDot = PK.el("circle", { cx: f(tip[0]), cy: f(tip[1]), r: 3.6, fill: C.ink }, W.L.routes);
  gsap.set(decDot, { opacity: 0 });
  var tEnd = tDec + 0.63; // 56.35
  FT(decDot, { opacity: 0, scale: 0.4, svgOrigin: pt(tip) }, { opacity: 1, scale: 1, svgOrigin: pt(tip), duration: 0.12, ease: "power2.out" }, tEnd);
  PK.sfx("decision", tDec, { gain_db: -2, dur: 0.65, pan: pan(DOCK[0], tDec) });
  // RISK OWNER DECIDES, ink, above the risk owner (clear of Priora, the packet and the trunk s6 draws up from the tip)
  var DS = PK.cam.px(56.4, 19);
  W.ownerDecides = PK.text(W.L.labels, "Risk owner decides", 1144, 614, { font: "mono", size: DS, fill: C.ink, anchor: "end" });
  gsap.set(W.ownerDecides, { opacity: 0 });
  FT(W.ownerDecides, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }, tEnd);

  // ------------------------------------------------------------ hand-over
  W.gap = { a0: 234, a1: 306, r: AR };
  W.gapTicks = gapTicks;
  W.facetAngles = FACET_TO; // fc.g rotation at 57.0, mod 360
  W.facetRotations = FACET_ROT;
  W.decisionD = decD;
  W.decisionTip = [tip[0], tip[1]];
  W.decisionLoop = { c: [DOCK[0], DOCK[1]], r: LR, from: corner };
  W.decisionDot = decDot;
  W.routeDraw = routeDraw;
  if (W.align.arcs === arcs) W.align.insurerDashed = twin;
});
