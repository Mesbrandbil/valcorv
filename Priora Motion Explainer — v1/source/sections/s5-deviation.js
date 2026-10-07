/*
  s5-deviation (47 to 57 s): a deviation.
  The aligned ring holds for a breath; then one condition slips. The Insurer conditions
  arc rotates out of line, drifts outward and turns dashed; its token tilts and its
  brackets fail to close. The gap at the top of the ring is the finding: Fire pings the
  Insurer, and beside the gap two short lines say why (fire watch planned 30 min, the
  policy asks 60), with a small meter that fills only half. On the route outside the door
  an unengaged dashed barrier outline (the route runs over it unbroken) reads NO HARD STOP
  CONFIGURED: the route stays drawn, the spark keeps flickering, nothing is stopped. The
  finding collapses into the gap and the case and its arcs contract into one compact
  decision packet (ring with a clean gap at the top). Priora rises clear of the door, the
  packet comes out to it, and Priora carries it with a trail to the risk owner. The risk
  owner's black decision line reaches out of the desk: RISK OWNER DECIDES.

  Contract at 47.0 (from s4): see docs/storyboard.md. If s4 has not provided W.align yet,
  this section builds the 47.0 state itself (aligned arcs, agents, panel, route, record).
  Contract at 57.0 (for s6): Priora (1060, 600), bead 60 deg; packet W.caseT.g (1098, 662),
  arcsG scale 0.75, insurer arc hidden (reset to its aligned place), other four arcs solid;
  W.gap = { a0: 234, a1: 306, r: 40 }; W.decision "M1174 710 H1226" drawn; W.ownerDecides
  visible; the Insurer conditions token tilted 12 deg and 8 units outward, name visible,
  brackets shut. Also W.align.insurerDashed (the dashed twin, hidden). The insurer arc and its
  twin sit in a wrapper <g> this section adds inside arcsG (reset to identity by 53.5).
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

  // ------------------------------------------------------------ standalone: build the 47.0 state if s4 has not
  var standalone = !(W.align && W.align.arcs && W.align.arcs.insurer);
  var alignArcs = standalone ? null : W.align.arcs;
  if (standalone) {
    var made = {};
    KEYS.forEach(function (k) {
      var a = G.agents[k].aligned;
      made[k] = PK.el("path", { d: PK.arc(0, 0, AR, a - 36, a + 36), fill: "none", stroke: C.rust, "stroke-width": 3, "stroke-linecap": "butt" }, cs.arcsG);
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
    var tick0 = PK.el("path", { d: "M" + (G.record.x0 + 12) + " " + (G.record.y - 7) + " V" + (G.record.y + 7), class: "pk-thread" }, W.record.ticks);
    gsap.set(tick0, { opacity: 0 });
    tl.set(tick0, { opacity: 1 }, T0);
    tl.set(W.caseLabel || {}, { opacity: 0 }, T0);
    // what s4 clears from s3 (seats, table ring, the five marks on Priora); the facets fold
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
      var r1 = rnd();
      tl.set(W.spark, { opacity: r1 < 0.22 ? 0.18 : 0.62 + rnd() * 0.38 }, st);
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

  // ------------------------------------------------------------ the case gathers itself while the camera pushes in
  // (if s4 leaves the facets out on spokes they fold onto the ring, so the gap reads clean; otherwise a no-op)
  cs.facets.forEach(function (fc, i) {
    tl.to(fc.chipG, { x: cs.R, duration: 0.6, ease: "power3.inOut", immediateRender: false }, 47.15 + i * 0.03);
    tl.to(fc.spoke, { drawSVG: "0% 0%", duration: 0.5, ease: "power2.in", immediateRender: false }, 47.15 + i * 0.03);
  });

  // ------------------------------------------------------------ "Then one condition ..." : the insurer re-checks
  var tCond = PK.word("L07", "condition");
  tl.fromTo(ins.left, { x: 0 }, { x: -3.5, duration: 0.35, ease: "power2.out", immediateRender: false }, tCond);
  tl.fromTo(ins.right, { x: 0 }, { x: 3.5, duration: 0.35, ease: "power2.out", immediateRender: false }, tCond);
  // the insurer's arc trembles: a check that does not quite hold
  tl.fromTo(
    insW,
    { attr: { transform: wT(0, 0, 0) } },
    {
      keyframes: [
        { attr: { transform: wT(0, 0, 1.4) }, duration: 0.12, ease: "power1.out" },
        { attr: { transform: wT(0, 0, -0.9) }, duration: 0.14, ease: "power1.inOut" },
        { attr: { transform: wT(0, 0, 0.4) }, duration: 0.12, ease: "power1.inOut" },
        { attr: { transform: wT(0, 0, 0) }, duration: 0.12, ease: "power1.in" },
      ],
      immediateRender: false,
    },
    tCond + 0.05,
  );
  PK.sfx("inspect", tCond, { gain_db: -14, pan: -0.05, agent: "insurer" });

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
  PK.sfx("deviate", tSlip, { gain_db: -2, dur: 1.0, pan: -0.05 });

  // the gap, measured: two ink ticks at its edges and a faint ghost of where the condition should be
  var gapMarks = PK.g(cs.arcsG);
  var ghost = PK.el("path", { d: PK.arc(0, 0, AR, 236, 304), class: "pk-ghost" }, gapMarks);
  var ticks = [234, 306].map(function (a) {
    var p0 = PK.polar(0, 0, AR - 6, a),
      p1 = PK.polar(0, 0, AR + 6, a);
    return PK.el("path", { d: "M" + f(p0[0]) + " " + f(p0[1]) + " L" + f(p1[0]) + " " + f(p1[1]), fill: "none", stroke: C.ink, "stroke-width": 1.1, "stroke-linecap": "round" }, gapMarks);
  });
  gsap.set(gapMarks, { opacity: 0 });
  var tGap = tSlip + 0.75;
  tl.fromTo(gapMarks, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out", immediateRender: false }, tGap);
  ticks.forEach(function (tk, i) {
    tl.fromTo(tk, { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.3, ease: "power2.out", immediateRender: false }, tGap + i * 0.06);
  });
  PK.sfx("lock", tGap, { gain_db: -16, pan: -0.05, material: "tick" });

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
  PK.sfx("inspect", tFire, { gain_db: -10, pan: 0.2, agent: "fire", material: "ping" });

  // ------------------------------------------------------------ the finding, beside the gap
  var FS = PK.cam.px(50.5, 19); // ~8.8 world units = 19 px in the table shot
  var findG = PK.g(W.L.labels);
  var fy = 404;
  var l1 = PK.text(findG, "Fire watch planned: 30 min", tc[0], fy, { font: "mono", size: FS, fill: C.rust, anchor: "middle" });
  var l2 = PK.text(findG, "Policy asks: 60 min", tc[0], fy + FS * 1.75, { font: "mono", size: FS, fill: C.rust, anchor: "middle" });
  gsap.set([l1, l2], { opacity: 0 });
  // a small meter: the policy's length, the planned watch fills only half of it
  var mW = 112,
    mH = 4.4,
    mx0 = tc[0] - mW / 2,
    my = fy + FS * 3.0;
  var track = PK.el("rect", { x: mx0, y: my - mH / 2, width: mW, height: mH, rx: mH / 2, fill: "none", stroke: C.rust, "stroke-width": 0.85 }, findG);
  var fill = PK.el("rect", { x: mx0, y: my - mH / 2, width: mH, height: mH, rx: mH / 2, fill: C.rust }, findG);
  var half = PK.el("path", { d: "M" + f(tc[0]) + " " + f(my - mH / 2 - 3) + " V" + f(my + mH / 2 + 3), fill: "none", stroke: C.rust, "stroke-width": 0.85, "stroke-linecap": "round" }, findG);
  gsap.set([track, fill, half], { opacity: 0 });
  var tWatch = PK.word("L07", "watch");
  tl.fromTo(l1, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, tWatch - 0.15);
  tl.fromTo(l2, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, tWatch + 0.1);
  PK.sfx("return", tWatch - 0.15, { gain_db: -12, pan: -0.05 });
  var tHalf = PK.word("L07", "half");
  tl.fromTo([track, half], { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "none", immediateRender: false }, tHalf - 0.25);
  tl.set(fill, { opacity: 1 }, tHalf - 0.02);
  tl.fromTo(fill, { attr: { width: mH } }, { attr: { width: mW / 2 }, duration: 0.45, ease: "power2.out", immediateRender: false }, tHalf - 0.02);
  PK.sfx("compare", tHalf, { gain_db: -9, pan: -0.05 });

  // ------------------------------------------------------------ no hard stop: an unengaged, dashed barrier outline on the route
  function routeAt(x) {
    var len = W.route.getTotalLength();
    for (var s = 0; s <= len; s += 0.5) {
      var q = W.route.getPointAtLength(s);
      if (q.x >= x) {
        var q2 = W.route.getPointAtLength(Math.min(len, s + 2));
        return { p: [q.x, q.y], a: (Math.atan2(q2.y - q.y, q2.x - q.x) * 180) / Math.PI };
      }
    }
    return { p: [x, G.panel.doorY], a: 0 };
  }
  var gr = routeAt(756);
  // drawn under the route layer, so the route runs over it unbroken: an outline, not engaged
  var gate = PK.g(W.L.trails);
  gsap.set(gate, { x: gr.p[0], y: gr.p[1] });
  var barW = 10,
    barL = 58;
  var bar = PK.el("path", { d: PK.rectPath(-barW / 2, -barL / 2, barW, barL, 3) }, gate);
  bar.setAttribute(
    "style",
    "fill:" + C.paper + ";stroke:" + C.ink + ";stroke-opacity:0.7;stroke-width:calc(var(--sw, 1) * 1.5px);stroke-linecap:butt;stroke-linejoin:round;" +
      "stroke-dasharray:calc(var(--sw, 1) * 4.5px) calc(var(--sw, 1) * 3.5px);",
  );
  gsap.set(gate, { opacity: 0 });
  var clear = barL / 2;
  var BS = PK.cam.px(51.0, 19);
  var gateLabel = PK.text(W.L.labels, "No hard stop configured", gr.p[0], gr.p[1] + clear + BS * 1.9, { font: "mono", size: BS, fill: C.grey, anchor: "middle" });
  gsap.set(gateLabel, { opacity: 0 });
  var tGate = PK.word("L07", "policy") - 0.1;
  tl.fromTo(gate, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out", immediateRender: false }, tGate);
  tl.fromTo(gateLabel, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", immediateRender: false }, tGate + 0.25);
  tl.fromTo([gate, gateLabel], { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "power1.in", immediateRender: false }, 52.65);
  PK.sfx("thread", tGate, { gain_db: -16, material: "pencil", dur: 0.5, pan: 0.3 });

  // ------------------------------------------------------------ "Priora brings it": assemble one compact packet
  var tA = PK.word("L08", "priora") - 0.15; // 52.25
  var gapPt = [tc[0], tc[1] - AR * 0.75];
  tl.fromTo(findG, { scale: 1, svgOrigin: f(gapPt[0]) + " " + f(gapPt[1]) }, { scale: 0.08, svgOrigin: f(gapPt[0]) + " " + f(gapPt[1]), duration: 0.55, ease: "power2.in", immediateRender: false }, tA);
  tl.fromTo(findG, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "none", immediateRender: false }, tA + 0.32);
  tl.fromTo([twin, gapMarks], { opacity: 1 }, { opacity: 0, duration: 0.35, ease: "power1.in", immediateRender: false }, tA + 0.12);
  tl.fromTo(cs.arcsG, { scale: 1, svgOrigin: "0 0" }, { scale: 0.75, svgOrigin: "0 0", duration: 0.8, ease: "power3.inOut", immediateRender: false }, tA + 0.1);
  PK.sfx("assemble", tA + 0.1, { gain_db: -4, dur: 0.8 });
  // reset the hidden insurer arc to its aligned place (s6 to s8 may use it again)
  tl.set(insW, { attr: { transform: wT(0, 0, 0) } }, tA + 1.2);
  // the brackets settle shut while the eye follows the packet
  tl.fromTo(ins.left, { x: -2.1 }, { x: 0, duration: 0.4, ease: "power2.inOut", immediateRender: false }, 53.6);
  tl.fromTo(ins.right, { x: 2.1 }, { x: 0, duration: 0.4, ease: "power2.inOut", immediateRender: false }, 53.6);

  // Priora rises clear of the door to take the packet
  var takeP = [706, 404];
  PK.travel(tl, W.priora.g, PK.curve(prioraP, takeP, 6), tA + 0.2, 0.7, "power2.inOut");
  tl.fromTo(W.priora.beadG, { rotation: 180, svgOrigin: "0 0" }, { rotation: 132, svgOrigin: "0 0", duration: 0.6, ease: "power2.inOut", immediateRender: false }, tA + 0.25);
  PK.sfx("move", tA + 0.2, { gain_db: -14, dur: 0.7, pan: 0.15, size: "small" });

  // ------------------------------------------------------------ the packet goes out through the door to Priora
  var dock = [38, 62]; // the packet rides below and ahead of Priora
  var dockP = [takeP[0] + dock[0], takeP[1] + dock[1]];
  var door = [G.panel.x + G.panel.w, G.panel.doorY];
  var outD =
    "M" + tc[0] + " " + tc[1] +
    " Q" + f(492) + " " + f(560) + " " + f(door[0] - 8) + " " + f(door[1] + 2) +
    " Q" + f(door[0] + 62) + " " + f(door[1] - 10) + " " + f(dockP[0]) + " " + f(dockP[1]);
  var tOut = tA + 0.6;
  var outDur = 0.75;
  PK.travel(tl, cs.g, outD, tOut, outDur, "power2.inOut");
  PK.trail(tl, W.L.trails, outD, tOut, outDur);
  PK.sfx("move", tOut, { gain_db: -11, dur: outDur, pan: 0.1 });
  PK.sfx("packet", tOut + outDur - 0.05, { gain_db: -8, pan: 0.15 });

  // "DECISION PACKET" rides beside the packet, gone before the desk
  var PS = PK.cam.px(53.9, 19);
  var pLabel = PK.text(cs.g, "Decision packet", AR * 0.75 + 9, PS * 0.36, { font: "mono", size: PS, fill: C.rust, anchor: "start" });
  gsap.set(pLabel, { opacity: 0 });
  tl.fromTo(pLabel, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out", immediateRender: false }, tOut + outDur - 0.2);
  tl.fromTo(pLabel, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, 54.25);

  // ------------------------------------------------------------ "to the risk owner": escalate
  var tTo = PK.word("L08", "to");
  tl.fromTo(W.priora.beadG, { rotation: 132, svgOrigin: "0 0" }, { rotation: 22, svgOrigin: "0 0", duration: 0.55, ease: "power2.inOut", immediateRender: false }, tTo - 0.02);
  var endP = [1060, 600];
  var c1 = [830, 340],
    c2 = [1060, 420];
  var escD = "M" + takeP[0] + " " + takeP[1] + " C" + c1[0] + " " + c1[1] + " " + c2[0] + " " + c2[1] + " " + endP[0] + " " + endP[1];
  var escPk =
    "M" + dockP[0] + " " + dockP[1] + " C" + (c1[0] + dock[0]) + " " + (c1[1] + dock[1]) + " " + (c2[0] + dock[0]) + " " + (c2[1] + dock[1]) + " " + (endP[0] + dock[0]) + " " + (endP[1] + dock[1]);
  var tEsc = tOut + outDur + 0.02; // as the packet docks (about 53.6)
  var escDur = 1.35;
  PK.travel(tl, W.priora.g, escD, tEsc, escDur, "power2.inOut");
  PK.travel(tl, cs.g, escPk, tEsc, escDur, "power2.inOut");
  PK.trail(tl, W.L.trails, escD, tEsc, escDur);
  PK.sfx("escalate", tEsc, { gain_db: -4, dur: escDur, pan: 0.35 });

  // ------------------------------------------------------------ "Agents prepare": the packet settles in front of the desk
  var tArr = tEsc + escDur;
  tl.fromTo(cs.body, { scale: 1, svgOrigin: "0 0" }, { keyframes: [{ scale: 1.045, duration: 0.14, ease: "power1.out" }, { scale: 1, duration: 0.32, ease: "power2.inOut" }], svgOrigin: "0 0", immediateRender: false }, tArr - 0.04);
  tl.fromTo(W.priora.beadG, { rotation: 22, svgOrigin: "0 0" }, { rotation: 60, svgOrigin: "0 0", duration: 0.45, ease: "power2.inOut", immediateRender: false }, tArr + 0.05);
  PK.sfx("arrive", tArr - 0.04, { gain_db: -8, size: "case", pan: 0.4 });

  // ------------------------------------------------------------ "the human decides": the black decision line
  var tDec = PK.word("L08", "the", 2);
  var decD = "M" + G.ownerHand[0] + " " + G.ownerHand[1] + " H1226";
  tl.set(W.decision, { attr: { d: decD } }, tDec - 0.1);
  tl.set(W.decision, { opacity: 1 }, tDec);
  PK.drawOn(tl, W.decision, tDec, 0.55, "power2.out", { later: true });
  PK.sfx("decision", tDec, { gain_db: -2, pan: 0.45 });
  var DS = PK.cam.px(56.4, 19);
  W.ownerDecides = PK.text(W.L.labels, "Risk owner decides", G.ownerHand[0] + 14, G.ownerHand[1] - DS * 0.9, { font: "mono", size: DS, fill: C.ink, anchor: "start" });
  gsap.set(W.ownerDecides, { opacity: 0 });
  tl.fromTo(W.ownerDecides, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", immediateRender: false }, tDec + 0.25);

  // ------------------------------------------------------------ hand-over
  W.gap = { a0: 234, a1: 306, r: AR };
  if (W.align.arcs === arcs) W.align.insurerDashed = twin; // the dashed twin of the insurer arc (opacity 0 from 52.7)
});
