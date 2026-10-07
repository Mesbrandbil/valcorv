/*
  s3-panel (22 to 38 s): the configurable site panel.

  Priora takes the case to the outside of the panel door. The chamber draws, its eight
  seats appear around the table and the ghosts of other possible specialists (Electrical,
  Confined space, Lifting) show in three of them, then fade: this panel is configured for
  this site and this job, it is not a permanent cast. Priora summons five specialists one
  by one: its bead turns to the seat, a thread leaves the bead, runs through the door to
  the seat, and the specialist travels in along it and takes the seat (Site rules moves
  only in straight orthogonal steps). The case goes in through the door to the table and
  opens its facets; Priora stays outside the door (it conducts, it is not on the panel).
  A pulse from Priora, then threads fan out from the case and carry copies of the
  relevant facets to each specialist. Each one inspects in its own way, two focused
  signals pass between them, and the findings come back out through the door to Priora
  as five small ticks on its orbit.

  Contract at 38.0 (for s4, same builder): Priora at (700, 470), bead 180, five ticks on
  its orbit (W.s3.marks); case at the table centre (380, 520), facets unfolded; agents in
  their first slots, names visible, seats (rust pale) under them; door closed; empty seats
  dashed; the table ring visible; Priora's label hidden.

  Shared with s4 through W.s3: marks, seats, ring, beadA, labelSize.
*/
PK.section("s3-panel", 22, 38, function (tl, W, ctx, S) {
  var G = PK.GEO,
    C = PK.C,
    f = PK.fmt;
  var P = W.priora,
    cs = W.caseT,
    panel = W.panel;
  var T = G.table;
  var PRI = [700, 470]; // Priora outside the door (held to the end of s4)
  var DOCK = [704, 536]; // the case rides here, beside Priora
  var DOOR = [G.panel.x + G.panel.w, G.panel.doorY]; // (620, 505)
  var NAME0 = 11.8; // agent names while they are summoned (about 22 px at width 1040)
  var NAME1 = 10.3; // after the push in to the table (about 23 px at width 846)
  var sh = (W.s3 = { beadA: 180, marks: [], seats: {}, ring: [], labelSize: NAME1 });

  // ------------------------------------------------------------ helpers
  function pan(x, t) {
    var c = PK.cam.camAt(t);
    var p = (x - c[0]) / (c[2] / 2);
    return Math.round(Math.max(-1, Math.min(1, p)) * 100) / 100;
  }
  function angleOf(dx, dy) {
    var a = (Math.atan2(dy, dx) * 180) / Math.PI;
    return a < 0 ? a + 360 : a;
  }
  function unit(a, b) {
    var dx = b[0] - a[0],
      dy = b[1] - a[1],
      l = Math.sqrt(dx * dx + dy * dy) || 1;
    return [dx / l, dy / l];
  }
  function pt(p) {
    return f(p[0]) + " " + f(p[1]);
  }
  function lerp(a, b, r) {
    return [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r];
  }
  function onTable(r, a) {
    return PK.polar(T[0], T[1], r, a);
  }
  function turnBead(to, at, dur) {
    tl.fromTo(P.beadG, { rotation: sh.beadA, svgOrigin: "0 0" }, { rotation: to, svgOrigin: "0 0", duration: dur || 0.32, ease: "power2.inOut", immediateRender: false }, at);
    sh.beadA = to;
  }
  function beadPos(a) {
    return PK.polar(PRI[0], PRI[1], 26, a);
  }
  // a dashed trail that is revealed behind the traveller (a solid twin in a mask draws on
  // with the traveller's ease, so the dashes are never DrawSVG'd) and fades over 1.1 s
  var defs = PK.el("defs", {}, W.svg);
  var nTrail = 0;
  function trail(d, at, dur, ease) {
    var id = "pk-s3-trail-" + nTrail++;
    var mask = PK.el("mask", { id: id, maskUnits: "userSpaceOnUse", x: -2000, y: -2000, width: 6000, height: 6000 }, defs);
    var mp = PK.el("path", { d: d, fill: "none", stroke: "#fff", "stroke-width": 16, "stroke-linecap": "round" }, mask);
    gsap.set(mp, { drawSVG: "0% 0%" });
    var tp = PK.el("path", { d: d, class: "pk-trail", mask: "url(#" + id + ")" }, W.L.trails);
    gsap.set(tp, { opacity: 0 });
    tl.fromTo(mp, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: dur, ease: ease || "power2.inOut", immediateRender: false }, at);
    tl.fromTo(tp, { opacity: 0 }, { opacity: 1, duration: 0.05, ease: "none", immediateRender: false }, at);
    tl.fromTo(tp, { opacity: 1 }, { opacity: 0, duration: 1.1, ease: "power1.in", immediateRender: false }, at + dur);
    return tp;
  }
  sh.trail = trail;
  // a positioned group with an inner group to scale (GSAP svgOrigin is in the parent's space)
  function holder(layer, x, y) {
    var g = PK.g(layer);
    var inner = PK.g(g);
    gsap.set(g, { x: x, y: y, opacity: 0 });
    return { g: g, inner: inner };
  }
  // door: track its state so every tween states where it starts
  var door = { open: false };
  function openDoor(at, dur) {
    panel.open(tl, at, dur || 0.4);
    door.open = true;
    PK.sfx("door-open", at, { gain_db: -10, pan: pan(DOOR[0], at) });
  }
  function closeDoor(at, dur) {
    panel.close(tl, at, dur || 0.35);
    door.open = false;
    PK.sfx("door-close", at, { gain_db: -11, pan: pan(DOOR[0], at) });
  }

  // ------------------------------------------------------------ contract at 22.0
  var t0 = 22.0;
  tl.set(P.g, { x: 1150, y: 400, opacity: 1 }, t0);
  tl.set(P.body, { scale: 1, svgOrigin: "0 0" }, t0);
  tl.set(P.beadG, { rotation: 180, svgOrigin: "0 0", opacity: 1 }, t0);
  tl.set(P.orbit, { opacity: 1 }, t0);
  tl.set(P.label, { opacity: 0 }, t0);
  tl.set(cs.g, { x: G.caseForm[0], y: G.caseForm[1], opacity: 1 }, t0);
  cs.facets.forEach(function (fc) {
    tl.set(fc.chipG, { x: cs.R, opacity: 1 }, t0);
    tl.set(fc.spoke, { drawSVG: "0% 0%" }, t0);
  });
  tl.set(cs.facet("photo").mark, { opacity: 1 }, t0);
  if (W.caseLabel) tl.set(W.caseLabel, { opacity: 1 }, t0);
  // the specialists' names: sized for the summons (see NAME0 / NAME1)
  Object.keys(W.agents).forEach(function (k) {
    tl.set(W.agents[k].label, { fontSize: NAME0 + "px", opacity: 0 }, t0);
  });

  // ------------------------------------------------------------ 22.0 to 23.5: Priora takes the case to the panel door
  var pPath = PK.curve([1150, 400], PRI, 60);
  var cPath = PK.curve(G.caseForm, DOCK, 18);
  PK.travel(tl, P.g, pPath, 22.0, 1.5, "power2.inOut");
  PK.travel(tl, cs.g, cPath, 22.12, 1.42, "power2.inOut");
  trail(pPath, 22.0, 1.5);
  trail(cPath, 22.12, 1.42);
  if (W.caseLabel) PK.hide(tl, W.caseLabel, 22.2, 0.35);
  PK.sfx("move", 22.0, { dur: 1.5, gain_db: -10, pan: -0.3 });
  PK.sfx("packet", 23.5, { gain_db: -14, size: "small", pan: 0.2 });

  // ------------------------------------------------------------ 22.6 to 23.6: the chamber draws, from its door round to its door
  var tWall = PK.word("L04", "next");
  PK.drawOn(tl, panel.walls, tWall, 1.0, "power2.inOut", { later: true });
  PK.fade(tl, [panel.leafA, panel.leafB, panel.jambs], 0, 1, tWall + 0.75, 0.3, "none", { later: true });
  PK.sfx("thread", tWall, { dur: 1.0, gain_db: -9, material: "pencil" });
  PK.show(tl, panel.title, 23.4, 0.45, { later: true });
  PK.show(tl, panel.sub, 23.55, 0.45, { later: true });
  PK.sfx("door-close", tWall + 0.95, { gain_db: -16, pan: 0.1 });

  // Priora's name, while it conducts from outside the door
  PK.show(tl, P.label, 23.5, 0.4, { later: true });
  PK.hide(tl, P.label, 30.3, 0.4);

  // ------------------------------------------------------------ 23.7 to 24.3: eight seats round the table
  // a faint table ring between the seats (broken at each seat)
  var gapA = 8.5;
  G.slotAngles.forEach(function (a, i) {
    var seg = PK.el("path", { d: PK.arc(T[0], T[1], G.slotR, a + gapA, a + 45 - gapA), class: "pk-hair-soft" }, W.L.chambers);
    gsap.set(seg, { drawSVG: "0% 0%" });
    PK.drawOn(tl, seg, 23.65 + i * 0.045, 0.45, "power2.out", { later: true });
    sh.ring.push(seg);
  });
  // the seats themselves (dashed, empty) appear clockwise from the top
  var order8 = [270, 315, 0, 45, 90, 135, 180, 225];
  order8.forEach(function (a, i) {
    var s = panel.slotAt(a);
    var tA = 23.7 + i * 0.06;
    tl.fromTo(s.el, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "none", immediateRender: false }, tA);
    tl.fromTo(s.el, { scale: 0.6, svgOrigin: pt(s.p) }, { scale: 1, svgOrigin: pt(s.p), duration: 0.35, ease: "power2.out", immediateRender: false }, tA);
  });
  PK.sfx("arrive", 23.7, { gain_db: -17, size: "small", pan: -0.4 });

  // ghosts of other possible specialists, in three seats this job does not need
  var ghosts = [
    { a: 0, name: "Electrical", shape: "M-7.5 9 L-2.5 -9 L7.5 -9 L2.5 9 Z", lab: [0, 42], anchor: "middle" },
    { a: 45, name: "Confined space", shape: PK.rectPath(-5.5, -10, 11, 20, 5.5), lab: [24, 27.5], anchor: "start" },
    { a: 180, name: "Lifting", shape: PK.polyPath([0, 1, 2, 3, 4].map(function (k) { return PK.polar(0, 1.5, 10.5, -90 + k * 72); })), lab: [-34, 3.8], anchor: "end" },
  ];
  var tGhost = 23.95,
    tGhostOff = PK.word("L04", "site") + 0.15;
  ghosts.forEach(function (gh, i) {
    var p = G.slot(gh.a);
    var gg = PK.g(W.L.chambers);
    gsap.set(gg, { x: p[0], y: p[1], opacity: 0 });
    PK.el("path", { d: gh.shape, class: "pk-ghost" }, gg);
    PK.text(gg, gh.name, gh.lab[0], gh.lab[1], { size: 11, weight: 500, fill: C.grey, anchor: gh.anchor });
    tl.fromTo(gg, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out", immediateRender: false }, tGhost + i * 0.12);
    tl.fromTo(gg, { opacity: 1 }, { opacity: 0, duration: 0.55, ease: "power1.in", immediateRender: false }, tGhostOff + i * 0.1);
  });
  PK.sfx("move", tGhost, { gain_db: -18, material: "paper", pan: -0.5 });
  PK.sfx("move", tGhostOff, { gain_db: -18, material: "paper", pan: -0.5 });

  // ------------------------------------------------------------ 24.3 to 29.1: Priora summons five specialists
  openDoor(24.0, 0.4);
  var summons = [
    { key: "siteRules", ts: 24.35, ey: 482 },
    { key: "insurer", ts: 25.25, ey: 490 },
    { key: "fire", ts: 26.15, ey: 497 },
    { key: "riskEng", ts: 27.05, ey: 514 },
    { key: "evidence", ts: 27.95, ey: 522 },
  ];
  // the inside part of each thread, from the door to the seat (control points by hand)
  var inner = {
    siteRules: function (E, u, s) {
      return " L" + pt([s[0], E[1]]) + " L" + pt(s); // ruled: straight orthogonal steps only
    },
    insurer: function (E, u, s) {
      return " C" + pt([E[0] + u[0] * 60, E[1] + u[1] * 60]) + " " + pt([s[0], s[1] + 75]) + " " + pt(s);
    },
    fire: function (E, u, s) {
      return " C" + pt([E[0] + u[0] * 45, E[1] + u[1] * 45]) + " " + pt([s[0], s[1] + 56]) + " " + pt(s);
    },
    riskEng: function (E, u, s) {
      return " C" + pt([E[0] + u[0] * 90, E[1] + u[1] * 90]) + " " + pt([s[0] + 56, s[1] - 36]) + " " + pt(s);
    },
    evidence: function (E, u, s) {
      return " C" + pt([E[0] + u[0] * 70, E[1] + u[1] * 70]) + " " + pt([s[0] + 30, s[1] - 55]) + " " + pt(s);
    },
  };
  summons.forEach(function (sm, i) {
    var ag = W.agents[sm.key];
    var slot = panel.slotAt(ag.spec.slot);
    var s = slot.p;
    var ts = sm.ts;
    // the bead turns to the seat it is about to fill
    var A = Math.round(angleOf(s[0] - PRI[0], s[1] - PRI[1]) * 10) / 10;
    turnBead(A, ts - 0.34, 0.32);
    var b = beadPos(A);
    var E = [DOOR[0], sm.ey];
    var u = unit(b, E);
    var tail = inner[sm.key](E, u, s);
    var dThread = "M" + pt(b) + " L" + pt(E) + tail;
    var Q = lerp(b, E, 0.42);
    var dTravel = "M" + pt(Q) + " L" + pt(E) + tail;
    // a small summons pulse at the bead
    var pulse = PK.el("circle", { cx: b[0], cy: b[1], r: 3.6, fill: "none", stroke: C.rust, "stroke-width": 1.1 }, W.L.threads);
    gsap.set(pulse, { opacity: 0 });
    tl.fromTo(pulse, { opacity: 0.85, scale: 1, svgOrigin: pt(b) }, { opacity: 0, scale: 3.2, svgOrigin: pt(b), duration: 0.5, ease: "power2.out", immediateRender: false }, ts - 0.04);
    // the thread leaves the bead, runs through the door to the seat
    var th = PK.thread(W.L.threads, dThread);
    gsap.set(th, { drawSVG: "0% 0%" });
    var e = f(Math.max(80, (1 - 21 / th.getTotalLength()) * 100)) + "%"; // stop at the seat's edge
    tl.fromTo(th, { drawSVG: "0% 0%" }, { drawSVG: "0% " + e, duration: 0.45, ease: "power2.out", immediateRender: false }, ts);
    PK.sfx("summon", ts, { gain_db: -6, pan: pan(s[0], ts) });
    // the specialist travels in along it and takes the seat
    var tIn = ts + 0.18,
      dur = sm.key === "siteRules" ? 0.78 : 0.7;
    var land = tIn + dur;
    tl.fromTo(ag.g, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: "none", immediateRender: false }, tIn);
    PK.travel(tl, ag.g, dTravel, tIn, dur, sm.key === "siteRules" ? "power2.inOut" : "power3.out");
    tl.fromTo(ag.body, { scale: 0.45, svgOrigin: "0 0" }, { scale: 1.07, svgOrigin: "0 0", duration: dur, ease: "power2.out", immediateRender: false }, tIn);
    tl.fromTo(ag.body, { scale: 1.07, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.25, ease: "power2.inOut", immediateRender: false }, land);
    if (sm.key === "insurer") {
      // brackets open while it travels, close as it sits
      tl.fromTo(ag.left, { x: 0 }, { x: -3.5, duration: 0.3, ease: "power2.out", immediateRender: false }, tIn);
      tl.fromTo(ag.right, { x: 0 }, { x: 3.5, duration: 0.3, ease: "power2.out", immediateRender: false }, tIn);
      tl.fromTo(ag.left, { x: -3.5 }, { x: 0, duration: 0.22, ease: "power2.inOut", immediateRender: false }, land - 0.05);
      tl.fromTo(ag.right, { x: 3.5 }, { x: 0, duration: 0.22, ease: "power2.inOut", immediateRender: false }, land - 0.05);
    }
    // its seat turns from dashed to taken
    var seat = PK.el("circle", { cx: s[0], cy: s[1], r: 19.5, fill: C.rustPale }, W.L.chambers);
    gsap.set(seat, { opacity: 0 });
    tl.fromTo(seat, { opacity: 0, scale: 0.55, svgOrigin: pt(s) }, { opacity: 1, scale: 1, svgOrigin: pt(s), duration: 0.35, ease: "power2.out", immediateRender: false }, land - 0.12);
    tl.fromTo(slot.el, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "none", immediateRender: false }, land - 0.12);
    sh.seats[sm.key] = seat;
    PK.sfx("arrive", land, { gain_db: -8, size: "agent", agent: sm.key, pan: pan(s[0], land) });
    // its name
    PK.show(tl, ag.label, land + 0.06, 0.35, { later: true });
    // the thread is taken in behind it
    tl.fromTo(th, { drawSVG: "0% " + e }, { drawSVG: e + " " + e, duration: 0.45, ease: "power2.inOut", immediateRender: false }, land + 0.02);
    tl.fromTo(th, { opacity: 1 }, { opacity: 0, duration: 0.05, ease: "none", immediateRender: false }, land + 0.45); // no round-cap dot left behind
  });
  // the names hold their screen size through the push in to the table (29.3 to 30.8)
  Object.keys(W.agents).forEach(function (k) {
    tl.fromTo(W.agents[k].label, { fontSize: NAME0 + "px" }, { fontSize: NAME1 + "px", duration: 1.5, ease: "power2.inOut", immediateRender: false }, 29.3);
  });

  // ------------------------------------------------------------ 28.7 to 29.9: the case goes in; Priora stays outside
  turnBead(92, 28.68, 0.3); // to the case beside it
  var tCase = 28.98;
  var dCase = "M" + pt(DOCK) + " C650 490 560 500 " + pt(T);
  PK.travel(tl, cs.g, dCase, tCase, 0.85, "power2.inOut");
  trail(dCase, tCase, 0.85);
  turnBead(160, tCase + 0.12, 0.45); // follows it to the door
  PK.sfx("move", tCase, { dur: 0.85, gain_db: -9, material: "case", pan: 0.1 });
  PK.sfx("arrive", tCase + 0.85, { gain_db: -6, size: "case", pan: pan(T[0], tCase + 0.85) });
  // its facets open out as marks, no labels
  cs.unfold(tl, tCase + 0.78, 0.5, null, { stagger: 0.035 });

  // ------------------------------------------------------------ 29.9 to 31.2: Priora distributes the case
  var bD = beadPos(160);
  var dPulse = "M" + pt(bD) + " L" + pt([DOOR[0] - 4, 506]) + " L" + pt([T[0] + 24, T[1] - 1.5]);
  var pth = PK.thread(W.L.threads, dPulse);
  gsap.set(pth, { drawSVG: "0% 0%" });
  var tPulse = 29.86;
  PK.drawOn(tl, pth, tPulse, 0.3, "power2.out", { later: true });
  var pb = PK.bead(W.L.threads, 3.1);
  tl.fromTo(pb.g, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "none", immediateRender: false }, tPulse + 0.04);
  PK.travel(tl, pb.g, dPulse, tPulse + 0.04, 0.36, "power1.inOut");
  tl.fromTo(pb.g, { opacity: 1 }, { opacity: 0, duration: 0.08, ease: "none", immediateRender: false }, tPulse + 0.4);
  PK.drawOff(tl, pth, tPulse + 0.36, 0.3, "power2.in", { to: "end" });
  tl.fromTo(pth, { opacity: 1 }, { opacity: 0, duration: 0.05, ease: "none", immediateRender: false }, tPulse + 0.62);
  PK.sfx("packet", tPulse, { gain_db: -9, pan: 0.15 });
  // the case ring answers the pulse
  tl.fromTo(cs.ring, { scale: 1, svgOrigin: "0 0" }, { scale: 1.12, svgOrigin: "0 0", duration: 0.12, ease: "power2.out", immediateRender: false }, tPulse + 0.4);
  tl.fromTo(cs.ring, { scale: 1.12, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.3, ease: "power2.inOut", immediateRender: false }, tPulse + 0.52);
  closeDoor(30.42, 0.35);

  // threads fan out from the case to each specialist and carry copies of the facets it needs
  var needs = {
    fire: ["hot"],
    insurer: ["hot", "conditions"],
    siteRules: ["place", "conditions"],
    riskEng: ["place"],
    evidence: ["photo"],
  };
  var parkR = { fire: 106, insurer: 106, siteRules: 106, riskEng: 110, evidence: 106 };
  var copies = {};
  var fanOrder = ["fire", "insurer", "siteRules", "riskEng", "evidence"];
  var tFan = 30.4;
  var fanThreads = [];
  fanOrder.forEach(function (key, i) {
    var a = W.agents[key].spec.slot;
    var d = "M" + pt(onTable(62, a)) + " L" + pt(onTable(129, a));
    var ft = PK.thread(W.L.threads, d);
    gsap.set(ft, { drawSVG: "0% 0%" });
    var tf = tFan + i * 0.09;
    PK.drawOn(tl, ft, tf, 0.32, "power2.out", { later: true });
    fanThreads.push(ft);
    var park = onTable(parkR[key], a);
    copies[key] = needs[key].map(function (fk, j) {
      var off = needs[key].length === 2 ? (j === 0 ? -9.5 : 9.5) : 0;
      var dest = [park[0] + off, park[1]];
      var start = onTable(62, a);
      var hd = holder(W.L.tokens, start[0], start[1]);
      var cg = hd.g;
      PK.el("circle", { cx: 0, cy: 0, r: 6.6, fill: C.paper, stroke: C.rust, "stroke-width": 1.3 }, hd.inner);
      PK.facetMark(hd.inner, fk, 3.9);
      var tc = tf + 0.1 + j * 0.12;
      tl.fromTo(cg, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none", immediateRender: false }, tc);
      tl.fromTo(hd.inner, { scale: 0.5, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.35, ease: "power2.out", immediateRender: false }, tc);
      PK.travel(tl, cg, "M" + pt(start) + " L" + pt(onTable(parkR[key] - 4, a)) + " L" + pt(dest), tc, 0.5, "power2.inOut");
      // its facet in the case answers as the copy leaves
      var fc = cs.facet(fk);
      tl.fromTo(fc.chip, { scale: 1, svgOrigin: "0 0" }, { scale: 1.3, svgOrigin: "0 0", duration: 0.12, ease: "power2.out", immediateRender: false }, tc);
      tl.fromTo(fc.chip, { scale: 1.3, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.3, ease: "power2.inOut", immediateRender: false }, tc + 0.12);
      return { g: cg, inner: hd.inner, at: dest, key: fk };
    });
  });
  PK.sfx("thread", tFan, { dur: 0.7, gain_db: -11, pan: -0.1 });
  PK.sfx("packet", tFan + 0.15, { gain_db: -12, size: "small", pan: 0.25 });
  PK.sfx("packet", tFan + 0.45, { gain_db: -12, size: "small", pan: -0.25 });
  fanThreads.forEach(function (ft, i) {
    tl.fromTo(ft, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: "power1.in", immediateRender: false }, 31.05 + i * 0.03);
  });

  // ------------------------------------------------------------ 31.2 to 33.0: each specialist checks its own conditions
  var tCheck = PK.word("L05", "each");
  var art = {}; // inspection marks, removed when each one reports back
  function addArt(key, el) {
    (art[key] = art[key] || []).push(el);
  }

  // Site rules: a straight ruled line with end ticks under what it checks
  (function () {
    var t = tCheck + 0.05;
    var c = copies.siteRules;
    var y = c[0].at[1] + 12.5,
      x0 = c[0].at[0] - 12,
      x1 = c[1].at[0] + 12;
    var rule = PK.el("path", { d: "M" + f(x0) + " " + f(y) + " H" + f(x1), fill: "none", stroke: C.rust, "stroke-width": 1.3, "stroke-linecap": "round" }, W.L.threads);
    var ticks = PK.el("path", { d: "M" + f(x0) + " " + f(y - 4) + " V" + f(y + 4) + " M" + f(x1) + " " + f(y - 4) + " V" + f(y + 4), fill: "none", stroke: C.rust, "stroke-width": 1.3, "stroke-linecap": "round" }, W.L.threads);
    gsap.set(rule, { drawSVG: "0% 0%" });
    gsap.set(ticks, { opacity: 0 });
    tl.fromTo(ticks, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none", immediateRender: false }, t);
    PK.drawOn(tl, rule, t + 0.05, 0.5, "power2.inOut", { later: true });
    sh.ruleEnd = [x1, y];
    addArt("siteRules", rule);
    addArt("siteRules", ticks);
    PK.sfx("inspect", t, { gain_db: -9, agent: "siteRules", material: "ruler", pan: pan(300, t) });
  })();

  // Insurer conditions: its brackets open and close around the copy of HOT WORK
  (function () {
    var t = tCheck + 0.38;
    var ag = W.agents.insurer;
    var hot = copies.insurer[0];
    var home = ag.spec ? G.slot(ag.spec.slot) : [380, 370];
    tl.fromTo(ag.left, { x: 0 }, { x: -4.5, duration: 0.24, ease: "power2.out", immediateRender: false }, t);
    tl.fromTo(ag.right, { x: 0 }, { x: 4.5, duration: 0.24, ease: "power2.out", immediateRender: false }, t);
    PK.travel(tl, hot.g, PK.curve(hot.at, home, -8), t + 0.12, 0.42, "power2.inOut");
    tl.fromTo(hot.inner, { scale: 1, svgOrigin: "0 0" }, { scale: 0.82, svgOrigin: "0 0", duration: 0.42, ease: "power2.inOut", immediateRender: false }, t + 0.12);
    tl.fromTo(ag.left, { x: -4.5 }, { x: 0, duration: 0.24, ease: "power2.inOut", immediateRender: false }, t + 0.56);
    tl.fromTo(ag.right, { x: 4.5 }, { x: 0, duration: 0.24, ease: "power2.inOut", immediateRender: false }, t + 0.56);
    PK.sfx("inspect", t + 0.6, { gain_db: -8, agent: "insurer", material: "clasp", pan: pan(home[0], t) });
  })();

  // Fire: three dots above its apex, two concentric pings toward what it checks
  (function () {
    var t = tCheck + 0.72;
    var ag = W.agents.fire;
    var s = G.slot(ag.spec.slot);
    tl.fromTo(ag.dots, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.22, ease: "power2.out", immediateRender: false }, t);
    var dir = angleOf(T[0] - s[0], T[1] - s[1]);
    [0, 1].forEach(function (k) {
      var hd = holder(W.L.threads, s[0], s[1]);
      PK.el("path", { d: PK.arc(0, 0, 40, dir - 42, dir + 42), fill: "none", stroke: C.rust, "stroke-width": 1.4, "stroke-linecap": "round" }, hd.inner);
      var tp = t + 0.15 + k * 0.32;
      tl.fromTo(hd.g, { opacity: 0.95 }, { opacity: 0, duration: 0.75, ease: "power1.in", immediateRender: false }, tp);
      tl.fromTo(hd.inner, { scale: 0.45, svgOrigin: "0 0" }, { scale: 1.05, svgOrigin: "0 0", duration: 0.75, ease: "power1.out", immediateRender: false }, tp);
      PK.sfx("inspect", tp, { gain_db: -12 - k * 3, agent: "fire", material: "ping", pan: pan(s[0], tp) });
    });
  })();

  // Risk engineering: turns 45 degrees and draws a dashed exposure radius round the place
  (function () {
    var t = tCheck + 1.05;
    var ag = W.agents.riskEng;
    var c = copies.riskEng[0].at;
    tl.fromTo(ag.body, { rotation: 0, svgOrigin: "0 0" }, { rotation: 45, svgOrigin: "0 0", duration: 0.5, ease: "power2.inOut", immediateRender: false }, t);
    var rad = PK.el("path", { d: "M" + pt(c) + " L" + pt(PK.polar(c[0], c[1], 19, 300)), fill: "none", stroke: C.rust, "stroke-width": 1.1, "stroke-linecap": "round" }, W.L.threads);
    gsap.set(rad, { drawSVG: "0% 0%" });
    PK.drawOn(tl, rad, t + 0.2, 0.3, "power2.out", { later: true });
    var ring = PK.el("circle", { cx: c[0], cy: c[1], r: 19, class: "pk-thread-dash" }, W.L.threads);
    gsap.set(ring, { opacity: 0 });
    tl.fromTo(ring, { opacity: 0, scale: 0.6, svgOrigin: pt(c) }, { opacity: 1, scale: 1, svgOrigin: pt(c), duration: 0.45, ease: "power2.out", immediateRender: false }, t + 0.42);
    tl.fromTo(ag.body, { rotation: 45, svgOrigin: "0 0" }, { rotation: 0, svgOrigin: "0 0", duration: 0.5, ease: "power2.inOut", immediateRender: false }, t + 1.15);
    addArt("riskEng", rad);
    addArt("riskEng", ring);
    PK.sfx("inspect", t, { gain_db: -9, agent: "riskEng", material: "measure", dur: 0.8, pan: pan(c[0], t) });
  })();

  // Evidence: viewfinder corners contract onto the photo, then a small tick
  (function () {
    var t = tCheck + 1.32;
    var ag = W.agents.evidence;
    var s = G.slot(ag.spec.slot);
    var c = copies.evidence[0].at;
    var dx = c[0] - s[0],
      dy = c[1] - s[1];
    tl.fromTo(ag.corners, { opacity: 0, x: 0, y: 0, scale: 1, svgOrigin: "0 0" }, { opacity: 1, x: 0, y: 0, scale: 1, svgOrigin: "0 0", duration: 0.18, ease: "none", immediateRender: false }, t);
    tl.fromTo(ag.corners, { x: 0, y: 0, scale: 1, svgOrigin: "0 0" }, { x: dx, y: dy, scale: 0.5, svgOrigin: "0 0", duration: 0.42, ease: "power3.inOut", immediateRender: false }, t + 0.2);
    var tick = PK.el("path", { d: "M" + f(c[0] + 10) + " " + f(c[1] - 1) + " l2.6 3 l5.4 -6.6", fill: "none", stroke: C.rust, "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" }, W.L.tokens);
    gsap.set(tick, { drawSVG: "0% 0%" });
    PK.drawOn(tl, tick, t + 0.62, 0.25, "power2.out", { later: true });
    tl.fromTo(ag.corners, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, t + 1.1);
    tl.fromTo(ag.corners, { x: dx, y: dy, scale: 0.5, svgOrigin: "0 0" }, { x: 0, y: 0, scale: 1, svgOrigin: "0 0", duration: 0.01, ease: "none", immediateRender: false }, t + 1.45);
    addArt("evidence", tick);
    PK.sfx("evidence", t + 0.2, { gain_db: -7, part: "focus", pan: pan(c[0], t) });
    PK.sfx("evidence", t + 0.64, { gain_db: -9, part: "accept", pan: pan(c[0], t) });
  })();

  // ------------------------------------------------------------ 32.6 to 33.7: two focused signals
  var FS = 8.6; // about 19.5 px at the table
  (function () {
    // Fire and Insurer conditions: the fire watch
    var a = G.slot(W.agents.fire.spec.slot),
      b = G.slot(W.agents.insurer.spec.slot);
    var u = unit(a, b);
    var p0 = [a[0] + u[0] * 19, a[1] + u[1] * 19],
      p1 = [b[0] - u[0] * 19, b[1] - u[1] * 19];
    var mid = lerp(p0, p1, 0.5);
    var out = PK.polar(0, 0, 1, 292.5);
    var ctl = [mid[0] + out[0] * 42, mid[1] + out[1] * 42];
    var d = "M" + pt(p0) + " Q" + pt(ctl) + " " + pt(p1);
    var back = "M" + pt(p1) + " Q" + pt(ctl) + " " + pt(p0);
    var th = PK.thread(W.L.threads, d);
    gsap.set(th, { drawSVG: "0% 0%" });
    var t = 32.6;
    PK.drawOn(tl, th, t, 0.3, "power2.out", { later: true });
    var bd = PK.bead(W.L.threads, 2.9);
    tl.fromTo(bd.g, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "none", immediateRender: false }, t + 0.12);
    PK.travel(tl, bd.g, d, t + 0.12, 0.34, "power1.inOut");
    PK.travel(tl, bd.g, back, t + 0.52, 0.34, "power1.inOut");
    tl.fromTo(bd.g, { opacity: 1 }, { opacity: 0, duration: 0.08, ease: "none", immediateRender: false }, t + 0.86);
    var apex = [0.25 * p0[0] + 0.5 * ctl[0] + 0.25 * p1[0], 0.25 * p0[1] + 0.5 * ctl[1] + 0.25 * p1[1]];
    var lab = PK.text(W.L.labels, "Fire watch", apex[0] + 6, apex[1] - 9, { font: "mono", size: FS, fill: C.rust, anchor: "middle" });
    gsap.set(lab, { opacity: 0 });
    PK.show(tl, lab, t + 0.15, 0.3, { later: true });
    PK.hide(tl, lab, 33.45, 0.3);
    tl.fromTo(th, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, 33.45);
    PK.sfx("request", t + 0.12, { gain_db: -10, pan: pan(apex[0], t) });
    PK.sfx("return", t + 0.52, { gain_db: -13, size: "small", pan: pan(apex[0], t) });
  })();
  (function () {
    // Evidence and Site rules: the photo shows the place
    var a = copies.evidence[0].at,
      b = sh.ruleEnd; // the right end of Site rules' ruled line
    var r = 76;
    var aB = 360 - (Math.acos((T[1] - b[1]) / r) * 180) / Math.PI - 90; // the angle where the inner arc reaches the ruler's height
    var pA = onTable(r, 90),
      pB = onTable(r, aB);
    var d = "M" + pt([a[0], a[1] - 7]) + " L" + pt(pA) + " A" + r + " " + r + " 0 0 1 " + pt(pB) + " L" + pt([b[0] + 1.5, b[1]]);
    var back = "M" + pt([b[0] + 1.5, b[1]]) + " L" + pt(pB) + " A" + r + " " + r + " 0 0 0 " + pt(pA) + " L" + pt([a[0], a[1] - 7]);
    var th = PK.thread(W.L.threads, d);
    gsap.set(th, { drawSVG: "0% 0%" });
    var t = 32.88;
    PK.drawOn(tl, th, t, 0.35, "power2.out", { later: true });
    var bd = PK.bead(W.L.threads, 2.9);
    tl.fromTo(bd.g, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "none", immediateRender: false }, t + 0.12);
    PK.travel(tl, bd.g, d, t + 0.12, 0.4, "power1.inOut");
    PK.travel(tl, bd.g, back, t + 0.56, 0.4, "power1.inOut");
    tl.fromTo(bd.g, { opacity: 1 }, { opacity: 0, duration: 0.08, ease: "none", immediateRender: false }, t + 0.96);
    tl.fromTo(th, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, t + 0.98);
    PK.sfx("request", t + 0.12, { gain_db: -11, pan: pan(330, t) });
    PK.sfx("return", t + 0.56, { gain_db: -13, size: "small", pan: pan(330, t) });
  })();

  // ------------------------------------------------------------ 33.2 to 35.9: findings return to Priora
  // Each specialist sends one small finding back out through the door. They land on
  // Priora's orbit where it faces the door (144 deg) and the marks turn round the orbit
  // to make room for the next: five evenly spaced marks, the bead resting between two.
  var tBack = PK.word("L05", "reports");
  openDoor(tBack + 0.17, 0.35);
  turnBead(180, tBack + 0.1, 0.4); // faces the panel to receive
  var DIN = [DOOR[0] - 16, 504];
  var LAND = 144,
    STEP = 72,
    GAP = 0.37;
  var landP = PK.polar(PRI[0], PRI[1], 26, LAND);
  var ringG = PK.g(P.body);
  P.body.insertBefore(ringG, P.beadG);
  gsap.set(ringG, { rotation: 0, svgOrigin: "0 0" });
  sh.ringG = ringG;
  var returns = [
    { key: "fire", ctl: [566, 452] },
    { key: "insurer", ctl: [566, 330] },
    { key: "evidence", ctl: [540, 700] },
    { key: "riskEng", ctl: [436, 612] },
    { key: "siteRules", ctl: [436, 430] },
  ];
  returns.forEach(function (rt, i) {
    var ag = W.agents[rt.key];
    var s = G.slot(ag.spec.slot);
    var t = tBack + 0.42 + i * GAP;
    var u = unit(s, rt.ctl);
    var p0 = [s[0] + u[0] * 14, s[1] + u[1] * 14];
    var v = unit(rt.ctl, DIN);
    var radial = PK.polar(0, 0, 1, LAND);
    var c1 = [DIN[0] + v[0] * 34, DIN[1] + v[1] * 34],
      c2 = [landP[0] + radial[0] * 30, landP[1] + radial[1] * 30];
    var d = "M" + pt(p0) + " Q" + pt(rt.ctl) + " " + pt(DIN) + " C" + pt(c1) + " " + pt(c2) + " " + pt(landP);
    var bd = PK.bead(W.L.threads, 3.2);
    // the line of the report, drawn behind the finding and taken in by Priora
    var rl = PK.thread(W.L.threads, d);
    gsap.set(rl, { drawSVG: "0% 0%" });
    tl.fromTo(rl, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.8, ease: "power2.inOut", immediateRender: false }, t);
    tl.fromTo(rl, { drawSVG: "0% 100%" }, { drawSVG: "100% 100%", duration: 0.45, ease: "power2.inOut", immediateRender: false }, t + 0.8);
    tl.fromTo(rl, { opacity: 1 }, { opacity: 0, duration: 0.05, ease: "none", immediateRender: false }, t + 1.24);
    // the copies it checked fold into one small finding
    copies[rt.key].forEach(function (cp) {
      tl.fromTo(cp.g, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "power1.in", immediateRender: false }, t - 0.2);
    });
    (art[rt.key] || []).forEach(function (el) {
      tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, t - 0.2);
    });
    if (rt.key === "fire") tl.fromTo(ag.dots, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, t - 0.2);
    tl.fromTo(bd.g, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none", immediateRender: false }, t);
    tl.fromTo(bd.dot, { scale: 0.4, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.2, ease: "power2.out", immediateRender: false }, t);
    PK.travel(tl, bd.g, d, t, 0.8, "power2.inOut");
    tl.fromTo(bd.g, { opacity: 1 }, { opacity: 0, duration: 0.08, ease: "none", immediateRender: false }, t + 0.8);
    // it lands as a mark on Priora's orbit (in the turning ring, so it lands at LAND)
    var la = LAND + STEP * i;
    var tk = PK.el("path", { d: PK.arc(0, 0, 26, la - 7, la + 7), fill: "none", stroke: C.rust, "stroke-width": 3.6, "stroke-linecap": "round" }, ringG);
    gsap.set(tk, { opacity: 0 });
    tl.fromTo(tk, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none", immediateRender: false }, t + 0.76);
    tl.fromTo(tk, { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.28, ease: "power2.out", immediateRender: false }, t + 0.76);
    sh.marks.push({ tick: tk, angle: (((la - STEP * (returns.length - 1)) % 360) + 360) % 360 });
    // the ring turns on to make room for the next
    if (i < returns.length - 1) {
      tl.fromTo(ringG, { rotation: -STEP * i, svgOrigin: "0 0" }, { rotation: -STEP * (i + 1), svgOrigin: "0 0", duration: 0.3, ease: "power2.inOut", immediateRender: false }, t + 0.95);
    }
    PK.sfx("return", t, { gain_db: -8, agent: rt.key, dur: 0.8, pan: pan(s[0], t) });
  });
  var tLast = tBack + 0.42 + (returns.length - 1) * GAP + 0.8;
  closeDoor(tLast + 0.12, 0.35);
  // hold: nothing else moves until s4 (38.0)
});
