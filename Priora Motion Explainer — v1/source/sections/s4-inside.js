/*
  s4-inside (38 to 47 s): inside the conditions.

  Priora takes in the five findings. The specialists align: each slides along the table
  ring to an even spacing (Site rules in straight orthogonal steps) and lays one rust arc
  round the case; on "holds" the gaps close and the five arcs lock into one ring. Inside
  the conditions, the route opens: the door opens and a line runs from the case to the
  packing line, the welding spark starts in the site's window, the record spine draws
  with one tick, and nobody is disturbed: the risk owner does not change.

  Facets: folded (on the case ring) from 38.6 on; the alignment ring sits clear of them.
  The spark's flicker is built here for the whole film (41.35 to 88.2, deterministic).

  Contract at 47.0 (for s5): Priora (700, 470), scale 1, bead 180, no marks. Case at
  (380, 520), facets folded, W.caseLabel hidden. W.align.arcs.{siteRules, insurer, fire,
  riskEng, evidence}: arcs in W.caseT.arcsG, radius 40, fully drawn, solid, opacity 1
  (stroke-width 3.2, butt caps, attributes). Agents at their aligned angles, opacity 1,
  names visible (font 10.3), body rotation 0. Panel drawn, door open, seats and slot
  circles hidden. W.route drawn, spark flickering, W.record.spine drawn with one tick in
  W.record.ticks. No status labels.
*/
PK.section("s4-inside", 38, 47, function (tl, W, ctx, S) {
  var G = PK.GEO,
    C = PK.C,
    f = PK.fmt;
  var P = W.priora,
    cs = W.caseT,
    panel = W.panel;
  var T = G.table;
  var sh = W.s3 || {};
  function pt(p) {
    return f(p[0]) + " " + f(p[1]);
  }
  function pan(x, t) {
    var c = PK.cam.camAt(t);
    var p = (x - c[0]) / (c[2] / 2);
    return Math.round(Math.max(-1, Math.min(1, p)) * 100) / 100;
  }

  // ------------------------------------------------------------ contract at 38.0
  tl.set(P.g, { x: 700, y: 470 }, 38.0);
  tl.set(P.beadG, { rotation: 180, svgOrigin: "0 0" }, 38.0);
  tl.set(cs.g, { x: T[0], y: T[1], opacity: 1 }, 38.0);
  Object.keys(W.agents).forEach(function (k) {
    var a = W.agents[k];
    var p = G.slot(a.spec.slot);
    tl.set(a.g, { x: p[0], y: p[1], opacity: 1 }, 38.0);
    tl.set(a.body, { rotation: 0, scale: 1, svgOrigin: "0 0" }, 38.0);
    tl.set(a.label, { opacity: 1 }, 38.0);
  });

  // ------------------------------------------------------------ 38.0 to 38.6: Priora takes in the five findings
  var tAbs = 38.0;
  if (sh.ringG) {
    tl.fromTo(sh.ringG, { scale: 1, svgOrigin: "0 0" }, { scale: 0.45, svgOrigin: "0 0", duration: 0.5, ease: "power2.in", immediateRender: false }, tAbs);
    (sh.marks || []).forEach(function (m) {
      tl.fromTo(m.tick, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, tAbs + 0.22);
    });
  }
  tl.fromTo(P.body, { scale: 1, svgOrigin: "0 0" }, { scale: 1.08, svgOrigin: "0 0", duration: 0.2, ease: "power2.out", immediateRender: false }, tAbs + 0.45);
  tl.fromTo(P.body, { scale: 1.08, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.35, ease: "power2.inOut", immediateRender: false }, tAbs + 0.65);
  PK.sfx("assemble", tAbs + 0.1, { gain_db: -10, size: "small", pan: pan(700, tAbs) });
  // the case folds its facets: reconciled, ready to be held
  cs.fold(tl, 38.05, 0.5, null, { stagger: 0.03 });

  // ------------------------------------------------------------ 38.4 to 39.6: the specialists align
  var tAl = 38.4;
  var R = G.slotR;
  Object.keys(sh.seats || {}).forEach(function (k) {
    tl.fromTo(sh.seats[k], { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, tAl);
  });
  [0, 45, 180].forEach(function (a, i) {
    tl.fromTo(panel.slotAt(a).el, { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "power1.in", immediateRender: false }, tAl + 0.25 + i * 0.05);
  });
  // along the ring, never across it
  ["fire", "evidence", "riskEng"].forEach(function (k) {
    var a = W.agents[k];
    var d = PK.arc(T[0], T[1], R, a.spec.slot, a.spec.aligned);
    PK.travel(tl, a.g, d, tAl, 0.85, "power3.inOut");
  });
  // Site rules keeps to straight orthogonal steps: three small L-steps that follow the ring
  (function () {
    var a = W.agents.siteRules;
    var a0 = a.spec.slot,
      a1 = a.spec.aligned,
      n = 3;
    for (var k = 0; k < n; k++) {
      var p0 = G.slot(a0 + ((a1 - a0) * k) / n),
        p1 = G.slot(a0 + ((a1 - a0) * (k + 1)) / n);
      var d = "M" + pt(p0) + " L" + pt([p1[0], p0[1]]) + " L" + pt(p1);
      var ts = tAl + 0.02 + k * 0.28;
      PK.travel(tl, a.g, d, ts, 0.26, "power2.inOut");
      PK.sfx("move", ts, { gain_db: -17, material: "step", agent: "siteRules", pan: pan(p0[0], ts) });
    }
  })();
  // Insurer conditions holds its place; its brackets open and close on the lock
  var ins = W.agents.insurer;
  tl.fromTo(ins.left, { x: 0 }, { x: -3, duration: 0.3, ease: "power2.out", immediateRender: false }, tAl + 0.1);
  tl.fromTo(ins.right, { x: 0 }, { x: 3, duration: 0.3, ease: "power2.out", immediateRender: false }, tAl + 0.1);
  PK.sfx("align", tAl, { dur: 0.9, gain_db: -6 });

  // each lays its own arc round the case, a 72 degree sector less a small gap
  var tHold = PK.word("L06", "holds");
  var arcs = {};
  ["siteRules", "insurer", "fire", "riskEng", "evidence"].forEach(function (k, i) {
    var A = W.agents[k].spec.aligned;
    var arc = PK.el("path", { d: PK.arc(0, 0, G.alignR, A - 36, A + 36), fill: "none", stroke: C.rust, "stroke-width": 3.2, "stroke-linecap": "butt" }, cs.arcsG);
    gsap.set(arc, { drawSVG: "50% 50%", opacity: 1 });
    tl.fromTo(arc, { drawSVG: "50% 50%" }, { drawSVG: "7% 93%", duration: 0.7, ease: "power2.out", immediateRender: false }, tAl + 0.25 + i * 0.06);
    tl.fromTo(arc, { drawSVG: "7% 93%" }, { drawSVG: "0% 100%", duration: 0.22, ease: "power2.inOut", immediateRender: false }, tHold);
    arcs[k] = arc;
    // and reaches in to it: a short line from the agent to the middle of its arc
    var reach = PK.el("path", { d: "M" + pt(G.slot(A).map(function (v, j) { return T[j] + (v - T[j]) * (128 / R); })) + " L" + pt(PK.polar(T[0], T[1], G.alignR + 4, A)), class: "pk-thread" }, W.L.threads);
    gsap.set(reach, { drawSVG: "0% 0%" });
    tl.fromTo(reach, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.3, ease: "power2.out", immediateRender: false }, tHold - 0.36 + i * 0.02);
    tl.fromTo(reach, { drawSVG: "0% 100%" }, { drawSVG: "100% 100%", duration: 0.4, ease: "power2.inOut", immediateRender: false }, tHold + 0.3);
    tl.fromTo(reach, { opacity: 1 }, { opacity: 0, duration: 0.05, ease: "none", immediateRender: false }, tHold + 0.7);
  });
  W.align = { arcs: arcs };
  // the lock: brackets close, one pulse
  tl.fromTo(ins.left, { x: -3 }, { x: 0, duration: 0.2, ease: "power2.inOut", immediateRender: false }, tHold - 0.04);
  tl.fromTo(ins.right, { x: 3 }, { x: 0, duration: 0.2, ease: "power2.inOut", immediateRender: false }, tHold - 0.04);
  var pulse = PK.el("circle", { cx: T[0], cy: T[1], r: G.alignR, fill: "none", stroke: C.rust, "stroke-width": 2 }, W.L.threads);
  gsap.set(pulse, { opacity: 0 });
  tl.fromTo(pulse, { opacity: 0.7, scale: 1, svgOrigin: pt(T) }, { opacity: 0, scale: 1.4, svgOrigin: pt(T), duration: 0.6, ease: "power2.out", immediateRender: false }, tHold + 0.2);
  PK.sfx("lock", tHold + 0.2, { gain_db: -3, pan: pan(T[0], tHold) });
  // the table ring has done its work
  (sh.ring || []).forEach(function (seg, i) {
    tl.fromTo(seg, { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "power1.in", immediateRender: false }, tHold + 0.15 + i * 0.02);
  });

  // ------------------------------------------------------------ status labels
  function status(str, x, y, size, fill, anchor) {
    var el = PK.text(W.L.labels, str, x, y, { font: "mono", size: size, fill: fill, anchor: anchor || "middle" });
    gsap.set(el, { opacity: 0 });
    return el;
  }
  // read at the table (width 846): about 20 px; it keeps that screen size as the camera pulls out
  var inside = status("Inside the conditions", T[0], 728, PK.cam.px(39.5, 20), C.rust);
  PK.show(tl, inside, 39.5, 0.4, { later: true });
  var k0 = PK.cam.camAt(40.3)[2],
    k1 = PK.cam.camAt(42.2)[2];
  tl.fromTo(inside, { scale: 1, svgOrigin: T[0] + " 724" }, { scale: k1 / k0, svgOrigin: T[0] + " 724", duration: 1.9, ease: "power2.inOut", immediateRender: false }, 40.3);

  // ------------------------------------------------------------ on "route opens": the door opens, the route runs to the packing line
  var tRoute = PK.word("L06", "opens");
  panel.open(tl, tRoute, 0.4);
  PK.sfx("door-open", tRoute, { gain_db: -9, pan: pan(620, tRoute) });
  var dRoute = W.route.getAttribute("d");
  PK.drawOn(tl, W.route, tRoute + 0.04, 1.05, "power1.inOut", { later: true });
  var rb = PK.bead(W.L.routes, 3.4);
  tl.fromTo(rb.g, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none", immediateRender: false }, tRoute + 0.04);
  PK.travel(tl, rb.g, dRoute, tRoute + 0.04, 1.05, "power1.inOut");
  tl.fromTo(rb.g, { opacity: 1 }, { opacity: 0, duration: 0.15, ease: "none", immediateRender: false }, tRoute + 1.09);
  PK.sfx("route", tRoute, { dur: 1.05, gain_db: -5 });
  PK.sfx("arrive", tRoute + 1.08, { gain_db: -12, size: "small", pan: pan(G.packing[0], tRoute + 1) });

  // ------------------------------------------------------------ on "Work goes on": the spark (welding seen through the window), to 88.2
  var tWork = PK.word("L06", "work");
  (function () {
    var sp = W.spark;
    var kids = Array.prototype.slice.call(sp.childNodes);
    var inner = PK.g(sp);
    kids.forEach(function (n) {
      inner.appendChild(n);
    });
    W.sparkInner = inner;
    gsap.set(inner, { scale: 1, rotation: 0, opacity: 1, svgOrigin: "0 0" });
    tl.fromTo(sp, { opacity: 0 }, { opacity: 1, duration: 0.05, ease: "none", immediateRender: false }, tWork);
    // deterministic flicker: short bursts of changes 2 to 4 frames apart, never dark (the work goes on)
    var rnd = PK.prng("priora-s4-spark");
    var t = tWork,
      END = 88.2,
      prev = { scale: 0.55, opacity: 0.6, rotation: 0 };
    while (t < END - 0.001) {
      var stepF = 2 + Math.floor(rnd() * 3); // frames
      var dt = Math.min(stepF / PK.FPS, END - t);
      var r1 = rnd(),
        r2 = rnd(),
        r3 = rnd();
      var next = {
        scale: Math.round((0.68 + r1 * 0.5) * 1000) / 1000,
        opacity: Math.round((0.55 + r2 * 0.45) * 1000) / 1000,
        rotation: r3 < 0.12 ? 45 : Math.round((r3 - 0.5) * 18),
      };
      tl.fromTo(
        inner,
        { scale: prev.scale, opacity: prev.opacity, rotation: prev.rotation, svgOrigin: "0 0" },
        { scale: next.scale, opacity: next.opacity, rotation: next.rotation, svgOrigin: "0 0", duration: 1 / PK.FPS, ease: "none", immediateRender: false },
        t,
      );
      prev = next;
      t += dt;
    }
  })();
  var work = status("Work continues", 942, 618, PK.cam.px(42.2, 19), C.ink2, "end");
  PK.show(tl, work, tWork + 0.15, 0.45, { later: true });

  // ------------------------------------------------------------ on "record is kept": the record spine and one tick
  var tRec = PK.word("L06", "record");
  PK.drawOn(tl, W.record.spine, tRec, 0.9, "power2.inOut", { later: true });
  PK.sfx("thread", tRec, { dur: 0.9, gain_db: -12, material: "pencil", pan: 0.1 });
  var rx = G.record.x0 + 6,
    ry = G.record.y;
  var tick = PK.el("path", { d: "M" + f(rx) + " " + f(ry - 9) + " V" + f(ry + 9), fill: "none", stroke: C.rust, "stroke-width": 2.6, "stroke-linecap": "round" }, W.record.ticks);
  gsap.set(tick, { opacity: 0 });
  var tTick = tRec + 0.45;
  tl.fromTo(tick, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.in", immediateRender: false }, tTick);
  PK.sfx("record", tTick + 0.28, { gain_db: -5, pan: pan(rx, tTick) });
  var kept = status("Record kept", G.record.x0, ry + 34, PK.cam.px(42.6, 19), C.rust, "start");
  PK.show(tl, kept, tTick + 0.3, 0.45, { later: true });

  // ------------------------------------------------------------ on "no one is disturbed"
  var tNo = PK.word("L06", "no");
  var calm = status("No one disturbed", G.owner[0], 627, PK.cam.px(43.4, 19), C.ink2, "middle");
  PK.show(tl, calm, tNo + 0.05, 0.5, { later: true });

  // ------------------------------------------------------------ 45.6 to 46.3: the status labels go
  [inside, work, kept, calm].forEach(function (el, i) {
    tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: 0.55, ease: "power1.in", immediateRender: false }, 45.6 + i * 0.05);
  });
});
