/*
  s4-inside (38 to 47 s): inside the conditions. Cut 3.

  The table ring and the empty seats go; the case folds its facets (reconciled). The
  specialists align: each slides along the ring's line to an even spacing (Site rules in
  straight orthogonal steps) and lays one rust arc round the case, reaching in to it with
  a line; on "holds" the gaps close, the five arcs lock into one ring, and each line stays
  as a thin faint tie (the ring belongs to the five specialists). INSIDE THE CONDITIONS
  under the ring, on a paper band so the ties never cross it, held still in the close
  frame. On "opens" (40.26) the door opens and the route starts drawing from the case
  through the door in the still frame; the camera follows it out (40.35 to 41.25); its bead
  lands in the packing line window at 41.25 and the welding spark starts on "Work"
  (41.35). The record spine draws with one tick (RECORD KEPT); NO ONE DISTURBED near the
  risk owner, who does not change. In the wide frame the panel names rest at 40 percent
  (not being read) and come back for the deviation shot at 46.9.

  Facets: folded from 38.4 on; the alignment ring sits clear of them.
  The spark's flicker is built here for the whole film (41.35 to 88.2, deterministic):
  an ink star in the window with paper-coloured light leaking onto the ink wall round it;
  scale and opacity only, rotation within plus or minus 10 degrees.

  Contract at 47.0 (for s5): Priora (700, 470), scale 1, bead 180, no marks. Case at
  (380, 520), facets folded, W.caseLabel hidden. W.align.arcs.{siteRules, insurer, fire,
  riskEng, evidence}: arcs in W.caseT.arcsG, radius 40, fully drawn, solid, opacity 1
  (stroke-width 3.2, butt caps, attributes). W.align.ties.{...}: thin rust ties (1 px
  screen, stroke-opacity 0.4, inline style) from each agent to the middle of its arc, in
  W.L.threads. Agents at their aligned angles, opacity 1, names visible (100 percent),
  body rotation 0. Panel drawn, title and sub visible, door open, seats, slot circles and
  table ring hidden. W.route drawn, spark flickering, W.record.spine drawn with one tick
  in W.record.ticks. No status labels.
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
  var STATUS = PK.cam.px(42, 19.5); // status labels read in the 1300-wide hold
  function pt(p) {
    return f(p[0]) + " " + f(p[1]);
  }
  function pan(x, t) {
    var c = PK.cam.camAt(t);
    var p = (x - c[0]) / (c[2] / 2);
    return Math.round(Math.max(-1, Math.min(1, p)) * 100) / 100;
  }
  function knockout(el, w) {
    el.setAttribute("style", el.getAttribute("style") + "stroke:" + C.paper + ";stroke-width:" + (w || 3.5) + "px;stroke-linejoin:round;paint-order:stroke;");
    return el;
  }
  var beadA = sh.beadA !== undefined ? sh.beadA : 180;

  // ------------------------------------------------------------ contract at 38.0
  tl.set(P.g, { x: 700, y: 470 }, 38.0);
  tl.set(P.body, { scale: 1, svgOrigin: "0 0" }, 38.0);
  tl.set(P.beadG, { rotation: beadA, svgOrigin: "0 0" }, 38.0);
  tl.set(cs.g, { x: T[0], y: T[1], opacity: 1 }, 38.0);
  Object.keys(W.agents).forEach(function (k) {
    var a = W.agents[k];
    var p = G.slot(a.spec.slot);
    tl.set(a.g, { x: p[0], y: p[1], opacity: 1 }, 38.0);
    tl.set(a.body, { rotation: 0, scale: 1, svgOrigin: "0 0" }, 38.0);
    tl.set(a.label, { opacity: 1 }, 38.0);
  });

  // ------------------------------------------------------------ 38.0 to 38.4: the case folds its facets (reconciled)
  cs.fold(tl, 38.0, 0.4, null, { stagger: 0.03 });
  PK.sfx("assemble", 38.35, { gain_db: -14, size: "small", pan: pan(T[0], 38) });
  // the table ring and the empty seats go completely before the slide (no fragments survive)
  (sh.ring || []).forEach(function (seg, i) {
    tl.fromTo(seg, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, 38.0 + i * 0.01);
  });
  [0, 45, 180].forEach(function (a, i) {
    tl.fromTo(panel.slotAt(a).el, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, 38.02 + i * 0.02);
  });

  // ------------------------------------------------------------ 38.4 to 39.25: the specialists align
  var tAl = 38.4;
  var R = G.slotR;
  Object.keys(sh.seats || {}).forEach(function (k) {
    tl.fromTo(sh.seats[k], { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, tAl);
  });
  // along the ring, never across it
  ["fire", "evidence", "riskEng"].forEach(function (k) {
    var a = W.agents[k];
    PK.travel(tl, a.g, PK.arc(T[0], T[1], R, a.spec.slot, a.spec.aligned), tAl, 0.85, "power3.inOut");
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
      var ts = tAl + 0.02 + k * 0.28;
      PK.travel(tl, a.g, "M" + pt(p0) + " L" + pt([p1[0], p0[1]]) + " L" + pt(p1), ts, 0.26, "power2.inOut");
    }
  })();
  // Insurer conditions holds its place; its brackets open, and close on the lock
  var ins = W.agents.insurer;
  tl.fromTo(ins.left, { x: 0 }, { x: -3, duration: 0.3, ease: "power2.out", immediateRender: false }, tAl + 0.1);
  tl.fromTo(ins.right, { x: 0 }, { x: 3, duration: 0.3, ease: "power2.out", immediateRender: false }, tAl + 0.1);
  PK.sfx("align", tAl + 0.1, { dur: 0.8, gain_db: -7 });

  // each lays its own arc round the case (a 72 degree sector less a small gap) and reaches in to it
  var tHold = PK.word("L06", "holds");
  var arcs = {},
    ties = {};
  ["siteRules", "insurer", "fire", "riskEng", "evidence"].forEach(function (k, i) {
    var A = W.agents[k].spec.aligned;
    var arc = PK.el("path", { d: PK.arc(0, 0, G.alignR, A - 36, A + 36), fill: "none", stroke: C.rust, "stroke-width": 3.2, "stroke-linecap": "butt" }, cs.arcsG);
    gsap.set(arc, { drawSVG: "50% 50%", opacity: 1 });
    tl.fromTo(arc, { drawSVG: "50% 50%" }, { drawSVG: "7% 93%", duration: 0.55, ease: "power2.out", immediateRender: false }, tAl + 0.25 + i * 0.05); // ends before the lock
    tl.fromTo(arc, { drawSVG: "7% 93%" }, { drawSVG: "0% 100%", duration: 0.22, ease: "power2.inOut", immediateRender: false }, tHold);
    arcs[k] = arc;
    var dTie = "M" + pt(PK.polar(T[0], T[1], 128, A)) + " L" + pt(PK.polar(T[0], T[1], G.alignR + 3, A));
    // the reach: a full thread from the agent in to its arc ...
    var reach = PK.el("path", { d: dTie, class: "pk-thread" }, W.L.threads);
    gsap.set(reach, { drawSVG: "0% 0%" });
    tl.fromTo(reach, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.3, ease: "power2.out", immediateRender: false }, tHold - 0.36 + i * 0.02);
    tl.fromTo(reach, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.inOut", immediateRender: false }, tHold + 0.15);
    // ... that stays as a thin faint tie
    var tie = PK.el("path", { d: dTie, style: "fill:none;stroke:" + C.rust + ";stroke-opacity:0.4;stroke-width:calc(var(--sw,1)*1px);stroke-linecap:round;" }, W.L.threads);
    gsap.set(tie, { opacity: 0 });
    tl.fromTo(tie, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.inOut", immediateRender: false }, tHold + 0.15);
    ties[k] = tie;
  });
  W.align = { arcs: arcs, ties: ties };
  // the lock: brackets close, one short pulse (over before the camera moves)
  tl.fromTo(ins.left, { x: -3 }, { x: 0, duration: 0.2, ease: "power2.inOut", immediateRender: false }, tHold - 0.04);
  tl.fromTo(ins.right, { x: 3 }, { x: 0, duration: 0.2, ease: "power2.inOut", immediateRender: false }, tHold - 0.04);
  var pulse = PK.el("circle", { cx: T[0], cy: T[1], r: G.alignR, fill: "none", stroke: C.rust, "stroke-width": 2 }, W.L.threads);
  gsap.set(pulse, { opacity: 0 });
  tl.fromTo(pulse, { opacity: 0.7, scale: 1, svgOrigin: pt(T) }, { opacity: 0, scale: 1.35, svgOrigin: pt(T), duration: 0.32, ease: "power2.out", immediateRender: false }, tHold + 0.06);
  PK.sfx("lock", tHold + 0.06, { gain_db: -3, pan: pan(T[0], tHold) });

  // ------------------------------------------------------------ status labels (sized for the 1300-wide shot)
  function status(str, x, y, fill, anchor) {
    var el = knockout(PK.text(W.L.labels, str, x, y, { font: "mono", size: STATUS, fill: fill, anchor: anchor || "middle" }));
    gsap.set(el, { opacity: 0 });
    return el;
  }
  // INSIDE THE CONDITIONS sits on a paper band above the two ties that pass under it
  var insideY = 596;
  var insideW = PK.measure("INSIDE THE CONDITIONS", "mono500", STATUS, 0.12) + 14;
  var band = PK.el("rect", { x: f(T[0] - insideW / 2), y: f(insideY - STATUS * 0.95), width: f(insideW), height: f(STATUS * 1.3), rx: 2, fill: C.paper }, W.L.labels);
  gsap.set(band, { opacity: 0 });
  var inside = status("Inside the conditions", T[0], insideY, C.rust);
  PK.show(tl, [band, inside], 39.45, 0.35, { later: true });

  // ------------------------------------------------------------ the wide shot (39.65 to 46.9): names not being read rest at 40 percent
  var names = Object.keys(W.agents).map(function (k) {
    return W.agents[k].label;
  });
  tl.fromTo(names, { opacity: 1 }, { opacity: 0.4, duration: 0.6, ease: "power1.inOut", immediateRender: false }, 40.45);
  tl.fromTo(panel.sub, { opacity: 1 }, { opacity: 0, duration: 0.6, ease: "power1.inOut", immediateRender: false }, 40.45);
  tl.fromTo(names, { opacity: 0.4 }, { opacity: 1, duration: 0.35, ease: "power1.inOut", immediateRender: false }, 46.55);
  tl.fromTo(panel.sub, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.inOut", immediateRender: false }, 46.55);

  // ------------------------------------------------------------ on "opens" (40.26): the door opens and the route starts in the still close
  // frame; the camera follows it out (40.35 to 41.25) and its bead lands in the packing line window at 41.25
  var tDoor = PK.word("L06", "opens");
  panel.open(tl, tDoor, 0.4);
  var tRoute = tDoor,
    dRoute = W.route.getAttribute("d"),
    RD = 41.25 - tDoor;
  PK.drawOn(tl, W.route, tRoute, RD, "power2.inOut", { later: true });
  var rb = PK.bead(W.L.threads, 3.6);
  tl.fromTo(rb.g, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "none", immediateRender: false }, tRoute);
  PK.travel(tl, rb.g, dRoute, tRoute, RD, "power2.inOut");
  tl.fromTo(rb.g, { opacity: 1 }, { opacity: 0, duration: 0.12, ease: "none", immediateRender: false }, tRoute + RD);
  PK.sfx("door-open", tDoor, { gain_db: -10, pan: pan(620, tDoor) });
  PK.sfx("route", tRoute, { dur: RD, gain_db: -6, pan: 0 });

  // ------------------------------------------------------------ the welding spark, seen through the window, to 88.2
  var tSpark = PK.word("L06", "work"); // 41.35, just after the route's bead lands (41.25)
  (function () {
    var sp = W.spark;
    var kids = Array.prototype.slice.call(sp.childNodes);
    var inner = PK.g(sp);
    // paper-coloured light leaking from the window onto the ink wall (behind the ink star)
    var flare = PK.el("path", { d: "M0 -13.5 L1.7 -1.7 L21 0 L1.7 1.7 L0 13.5 L-1.7 1.7 L-21 0 L-1.7 -1.7 Z", fill: C.paper }, inner);
    var core = PK.g(inner);
    kids.forEach(function (n) {
      core.appendChild(n);
    });
    W.sparkInner = inner;
    gsap.set(inner, { rotation: 0, svgOrigin: "0 0" });
    tl.fromTo(sp, { opacity: 0 }, { opacity: 1, duration: 0.04, ease: "none", immediateRender: false }, tSpark);
    // deterministic flicker: changes 2 to 4 frames apart, never dark (the work goes on)
    var rnd = PK.prng("priora-s4-spark-cut2");
    var t = tSpark,
      END = 88.2,
      prev = { fs: 0.4, fo: 0.6, cs: 0.7, co: 0.8, rot: 0 };
    while (t < END - 0.001) {
      var stepF = 2 + Math.floor(rnd() * 3);
      var dt = Math.min(stepF / PK.FPS, END - t);
      var r1 = rnd(),
        r2 = rnd(),
        r3 = rnd(),
        r4 = rnd();
      var next = {
        fs: Math.round((0.55 + r1 * 0.6) * 1000) / 1000,
        fo: Math.round((0.55 + r2 * 0.45) * 1000) / 1000,
        cs: Math.round((1.0 + r1 * 0.38) * 1000) / 1000,
        co: Math.round((0.75 + r3 * 0.25) * 1000) / 1000,
        rot: Math.round((r4 - 0.5) * 20 * 10) / 10,
      };
      var d1 = 1 / PK.FPS;
      tl.fromTo(flare, { scale: prev.fs, opacity: prev.fo, svgOrigin: "0 0" }, { scale: next.fs, opacity: next.fo, svgOrigin: "0 0", duration: d1, ease: "none", immediateRender: false }, t);
      tl.fromTo(core, { scale: prev.cs, opacity: prev.co, svgOrigin: "0 0" }, { scale: next.cs, opacity: next.co, svgOrigin: "0 0", duration: d1, ease: "none", immediateRender: false }, t);
      tl.fromTo(inner, { rotation: prev.rot, svgOrigin: "0 0" }, { rotation: next.rot, svgOrigin: "0 0", duration: d1, ease: "none", immediateRender: false }, t);
      prev = next;
      t += dt;
    }
  })();

  // ------------------------------------------------------------ on "record is kept": the record spine and one tick
  var tRec = PK.word("L06", "record");
  PK.drawOn(tl, W.record.spine, tRec, 0.7, "power2.inOut", { later: true });
  var rx = G.record.x0 + 6,
    ry = G.record.y;
  var tick = PK.el("path", { d: "M" + f(rx) + " " + f(ry - 9) + " V" + f(ry + 9), fill: "none", stroke: C.rust, "stroke-width": 2.8, "stroke-linecap": "round" }, W.record.ticks);
  gsap.set(tick, { opacity: 0 });
  var tTick = tRec + 0.4;
  tl.fromTo(tick, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.in", immediateRender: false }, tTick);
  PK.sfx("record", tTick + 0.28, { gain_db: -5, pan: pan(rx, tTick) });
  var kept = status("Record kept", G.record.x0, ry + 36, C.rust, "start");
  PK.show(tl, kept, tTick + 0.3, 0.4, { later: true });

  // ------------------------------------------------------------ 0.4 s after "disturbed": nobody was disturbed
  var tNo = PK.word("L06", "disturbed") + 0.4;
  var calm = status("No one disturbed", G.owner[0], 626, C.ink2, "middle");
  PK.show(tl, calm, tNo, 0.4, { later: true });

  // ------------------------------------------------------------ the status labels go before the camera moves back (46.9)
  tl.fromTo([band, inside, kept], { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "power1.in", immediateRender: false }, 45.7);
  tl.fromTo(calm, { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "power1.in", immediateRender: false }, 46.3);
  // the bead rests at 180 again for the deviation
  tl.fromTo(P.beadG, { rotation: beadA, svgOrigin: "0 0" }, { rotation: 180, svgOrigin: "0 0", duration: 0.35, ease: "power2.inOut", immediateRender: false }, 46.4);
});
