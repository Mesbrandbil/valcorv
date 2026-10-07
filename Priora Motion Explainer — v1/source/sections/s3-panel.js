/*
  s3-panel (22.3 to 38 s): the configurable site panel. Cut 2.

  Priora carries the case to the outside of the panel door while the camera moves
  (22.3 to 23.9). The chamber draws from its door once the camera has landed. Eight seats
  appear round the table; three hold ghosts of other possible specialists (Electrical,
  Structural, Security). Priora's bead sweeps the ring: toward each ghost a short dashed
  feeler starts, stops short at the door and retracts, and the seat stays empty. Then the
  bead sweeps back and summons five specialists one by one: the case facet that makes
  each one relevant pulses and sends a bead into the summons thread (PHOTO to Evidence,
  PACKING LINE to Risk engineering, CONDITIONS to Site rules and Insurer conditions,
  HOT WORK to Fire); the thread leaves the bead, runs through the door to the seat, and
  the specialist travels in along it while the thread is taken in behind it. The case
  goes in to the table and opens its facets; Priora stays outside (it conducts, it is not
  on the panel). A pulse from Priora, then copies of the facets fan out to each specialist
  (0.15 s apart). Each specialist checks in its own way (never more than two at once), two
  focused signals pass between them, the findings come back out through the door to
  Priora as five marks on its orbit, and Priora reconciles them (36.6 to 37.9).

  State at 38.0 (handed to s4, same builder): Priora at (700, 470), bead pointing at the
  case (W.s3.beadA), marks absorbed; case at the table centre (380, 520), facets
  unfolded; agents in their first slots, names visible (W.s3.nameSize); rust pale seats
  under them; door closed; three empty seats dashed; the table ring visible.

  Shared with s4 through W.s3: seats, ring, beadA, nameSize.
  Note: GSAP's svgOrigin is in the parent's space, so anything that is positioned with
  x/y and also scaled gets an inner group to scale (see holder()).
*/
PK.section("s3-panel", 22.3, 38, function (tl, W, ctx, S) {
  var G = PK.GEO,
    C = PK.C,
    f = PK.fmt;
  var P = W.priora,
    cs = W.caseT,
    panel = W.panel;
  var T = G.table;
  var T0 = 22.3;
  var PRI = [700, 470]; // Priora outside the door (held to the end of s4)
  var DOCK = [702, 550]; // the case rides here, beside Priora
  var DOOR = [G.panel.x + G.panel.w, G.panel.doorY]; // (620, 505)
  var NAME = PK.cam.px(25, 22); // names: 22 px in the still panel shot (width 1044)
  var STATUS = PK.cam.px(32.5, 19); // mono status labels: 19 px
  var GHOST = PK.cam.px(25, 20);
  var sh = (W.s3 = { beadA: 180, seats: {}, ring: [], nameSize: NAME });

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
    tl.fromTo(P.beadG, { rotation: sh.beadA, svgOrigin: "0 0" }, { rotation: to, svgOrigin: "0 0", duration: dur || 0.3, ease: "power2.inOut", immediateRender: false }, at);
    sh.beadA = to;
  }
  function beadPos(a) {
    return PK.polar(PRI[0], PRI[1], 26, a);
  }
  // a positioned group with an inner group to scale (GSAP svgOrigin is in the parent's space)
  function holder(layer, x, y) {
    var g = PK.g(layer);
    var inner = PK.g(g);
    gsap.set(g, { x: x, y: y, opacity: 0 });
    return { g: g, inner: inner };
  }
  // the panel door (its leaves slide into the wall); open and close strictly alternate
  function openDoor(at, dur) {
    panel.open(tl, at, dur || 0.4);
    PK.sfx("door-open", at, { gain_db: -10, pan: pan(DOOR[0], at) });
  }
  function closeDoor(at, dur) {
    panel.close(tl, at, dur || 0.35);
    PK.sfx("door-close", at, { gain_db: -11, pan: pan(DOOR[0], at) });
  }
  // a paper knockout behind a label, so threads passing under it never cross the letters
  function knockout(el, w) {
    el.setAttribute("style", el.getAttribute("style") + "stroke:" + C.paper + ";stroke-width:" + (w || 3.2) + "px;stroke-linejoin:round;paint-order:stroke;");
    return el;
  }
  // a dashed line that grows and retracts through a mask (dashes are never DrawSVG'd)
  var defs = PK.el("defs", {}, W.svg);
  var nMask = 0;
  function maskedDash(parent, d, cls) {
    var id = "pk-s3-mask-" + nMask++;
    var mask = PK.el("mask", { id: id, maskUnits: "userSpaceOnUse", x: -3000, y: -3000, width: 7000, height: 7000 }, defs);
    var mp = PK.el("path", { d: d, fill: "none", stroke: "#fff", "stroke-width": 12, "stroke-linecap": "round" }, mask);
    gsap.set(mp, { drawSVG: "0% 0%" });
    var el = PK.el("path", { d: d, class: cls || "pk-thread-dash", mask: "url(#" + id + ")" }, parent);
    return { el: el, reveal: mp };
  }

  // ------------------------------------------------------------ contract at 22.3
  tl.set(P.g, { x: 1150, y: 445, opacity: 1 }, T0);
  tl.set(P.body, { scale: 1, svgOrigin: "0 0" }, T0);
  tl.set(P.beadG, { rotation: 180, svgOrigin: "0 0", opacity: 1 }, T0);
  tl.set(P.orbit, { opacity: 1 }, T0);
  tl.set(P.label, { opacity: 0 }, T0);
  tl.set(cs.g, { x: G.caseForm[0], y: G.caseForm[1], opacity: 1 }, T0);
  cs.facets.forEach(function (fc) {
    tl.set(fc.chipG, { x: cs.R, opacity: 1 }, T0);
    tl.set(fc.spoke, { drawSVG: "0% 0%" }, T0);
  });
  tl.set(cs.facet("photo").mark, { opacity: 1 }, T0);
  if (W.caseLabel) tl.set(W.caseLabel, { opacity: 1 }, T0);
  Object.keys(W.agents).forEach(function (k) {
    tl.set(W.agents[k].label, { fontSize: NAME + "px", opacity: 0 }, T0);
  });

  // ------------------------------------------------------------ 22.3 to 23.8: Priora carries the case to the panel door (a follow move)
  var pPath = PK.curve([1150, 445], PRI, 50);
  var cPath = PK.curve(G.caseForm, DOCK, 22);
  PK.travel(tl, P.g, pPath, T0, 1.5, "power2.inOut");
  PK.travel(tl, cs.g, cPath, T0 + 0.08, 1.42, "power2.inOut");
  PK.trail(tl, W.L.trails, pPath, T0, 1.5, "power2.inOut");
  PK.trail(tl, W.L.trails, cPath, T0 + 0.08, 1.42, "power2.inOut");
  if (W.caseLabel) PK.hide(tl, W.caseLabel, T0 + 0.05, 0.3);
  PK.sfx("move", T0, { dur: 1.5, gain_db: -10, pan: -0.3 });
  PK.sfx("packet", T0 + 1.5, { gain_db: -14, size: "small", pan: 0.3 });

  // ------------------------------------------------------------ 23.6 to 24.4: the chamber draws from its door, round to its door
  PK.fade(tl, [panel.leafA, panel.leafB, panel.jambs], 0, 1, 23.5, 0.25, "none", { later: true });
  PK.drawOn(tl, panel.walls, 23.6, 0.8, "power2.inOut", { later: true });
  PK.sfx("thread", 23.6, { dur: 0.8, gain_db: -9, material: "pencil" });
  PK.show(tl, panel.title, 24.2, 0.4, { later: true });
  PK.show(tl, panel.sub, 24.35, 0.4, { later: true });
  // Priora's name, while it conducts from outside the door
  PK.show(tl, P.label, 24.0, 0.4, { later: true });
  PK.hide(tl, P.label, 30.3, 0.4);

  // ------------------------------------------------------------ 24.3 to 24.8: eight seats round the table, three ghosts
  var gapA = 8.5;
  G.slotAngles.forEach(function (a, i) {
    var seg = PK.el("path", { d: PK.arc(T[0], T[1], G.slotR, a + gapA, a + 45 - gapA), class: "pk-hair-soft" }, W.L.chambers);
    gsap.set(seg, { drawSVG: "0% 0%" });
    PK.drawOn(tl, seg, 24.3 + i * 0.03, 0.4, "power2.out", { later: true });
    sh.ring.push(seg);
  });
  [270, 315, 0, 45, 90, 135, 180, 225].forEach(function (a, i) {
    var s = panel.slotAt(a);
    var tA = 24.3 + i * 0.04;
    tl.fromTo(s.el, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "none", immediateRender: false }, tA);
    tl.fromTo(s.el, { scale: 0.6, svgOrigin: pt(s.p) }, { scale: 1, svgOrigin: pt(s.p), duration: 0.35, ease: "power2.out", immediateRender: false }, tA);
  });
  PK.sfx("arrive", 24.3, { gain_db: -17, size: "small", pan: -0.4 });

  // ghosts: dashed grey outlines in three seats, their names outside the ring (radius + 45)
  var GHOST_STYLE = "fill:none;stroke:" + C.grey + ";stroke-width:calc(var(--sw,1)*1.5px);stroke-dasharray:calc(var(--sw,1)*3px) calc(var(--sw,1)*3px);stroke-linecap:round;stroke-linejoin:round;";
  var ghosts = [
    { a: 180, name: "Security", shape: PK.polyPath([0, 1, 2, 3, 4].map(function (k) { return PK.polar(0, 1.2, 10.5, -90 + k * 72); })) },
    { a: 0, name: "Electrical", shape: "M-7.5 9.5 L-2.5 -9.5 L7.5 -9.5 L2.5 9.5 Z" },
    { a: 45, name: "Structural", shape: "M-10.5 -5 H10.5 M-10.5 5 H10.5 M0 -5 V5" },
  ];
  var tGhostOff = PK.word("L04", "need");
  ghosts.forEach(function (gh, i) {
    var p = G.slot(gh.a);
    var hd = holder(W.L.chambers, p[0], p[1]);
    PK.el("path", { d: gh.shape, style: GHOST_STYLE }, hd.inner);
    var lp = onTable(G.slotR + 45, gh.a);
    var name = knockout(PK.text(W.L.labels, gh.name, lp[0], lp[1], { size: GHOST, weight: 500, fill: C.grey, anchor: "middle", baseline: "central" }));
    gsap.set(name, { opacity: 0 });
    var tIn = 24.3 + i * 0.08;
    tl.fromTo([hd.g, name], { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out", immediateRender: false }, tIn);
    tl.fromTo([hd.g, name], { opacity: 1 }, { opacity: 0, duration: 0.45, ease: "power1.in", immediateRender: false }, tGhostOff + i * 0.08);
    gh.hd = hd;
    gh.p = p;
  });

  // ------------------------------------------------------------ 24.5 to 25.75: selection. The bead sweeps the ring and
  // considers each ghost: a short dashed feeler starts toward it, stops short at the door and retracts. The seat stays empty.
  openDoor(24.45, 0.35);
  var tP = 24.5;
  ghosts.forEach(function (gh, i) {
    var A = Math.round(angleOf(gh.p[0] - PRI[0], gh.p[1] - PRI[1]) * 10) / 10;
    turnBead(A, tP, 0.13);
    // the feeler lives in the bead's group, so it points where the bead points
    var fl = maskedDash(P.beadG, "M31 0 H76");
    P.beadG.insertBefore(fl.el, P.bead);
    var t = tP + 0.13;
    tl.fromTo(fl.reveal, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.13, ease: "power2.out", immediateRender: false }, t);
    tl.fromTo(fl.reveal, { drawSVG: "0% 100%" }, { drawSVG: "0% 0%", duration: 0.1, ease: "power2.in", immediateRender: false }, t + 0.19);
    // the ghost answers, once, and stays a ghost
    tl.fromTo(gh.hd.inner, { scale: 1, svgOrigin: "0 0" }, { scale: 1.16, svgOrigin: "0 0", duration: 0.1, ease: "power2.out", immediateRender: false }, t + 0.1);
    tl.fromTo(gh.hd.inner, { scale: 1.16, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.25, ease: "power2.inOut", immediateRender: false }, t + 0.2);
    PK.sfx("request", t, { gain_db: -16, part: "probe", pan: pan(gh.p[0], t) });
    tP = t + 0.29;
  });

  // ------------------------------------------------------------ 25.8 to 29.05: Priora summons five specialists
  // the bead sweeps back, seat by seat; the facet that makes each one relevant calls it in
  var summons = [
    { key: "evidence", facet: "photo", ey: 534, fctl: [650, 556] },
    { key: "riskEng", facet: "place", ey: 528, fctl: [712, 506] },
    { key: "siteRules", facet: "conditions", ey: 482, fctl: [655, 610] },
    { key: "fire", facet: "hot", ey: 494, fctl: [660, 520] },
    { key: "insurer", facet: "conditions", ey: 488, fctl: [655, 610] },
  ];
  var tS0 = tP + 0.1,
    SP = 0.64;
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
  var tLand = 0;
  summons.forEach(function (sm, i) {
    var ag = W.agents[sm.key];
    var slot = panel.slotAt(ag.spec.slot);
    var s = slot.p;
    var ts = tS0 + i * SP;
    // the bead turns to the seat it is about to fill
    var A = Math.round(angleOf(s[0] - PRI[0], s[1] - PRI[1]) * 10) / 10;
    turnBead(A, ts - 0.28, 0.26);
    var b = beadPos(A);
    var E = [DOOR[0], sm.ey];
    var u = unit(b, E);
    var tail = inner[sm.key](E, u, s);
    var dThread = "M" + pt(b) + " L" + pt(E) + tail;
    var Q = lerp(b, E, 0.42);
    var dTravel = "M" + pt(Q) + " L" + pt(E) + tail;
    // the relevant facet on the case pulses and sends a bead into the summons thread
    var fc = cs.facet(sm.facet);
    tl.fromTo(fc.chip, { scale: 1, svgOrigin: "0 0" }, { scale: 1.45, svgOrigin: "0 0", duration: 0.12, ease: "power2.out", immediateRender: false }, ts - 0.24);
    tl.fromTo(fc.chip, { scale: 1.45, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.3, ease: "power2.inOut", immediateRender: false }, ts - 0.12);
    var chipAt = PK.polar(DOCK[0], DOCK[1], cs.R, fc.angle);
    var dCall = "M" + pt(chipAt) + " Q" + pt(sm.fctl) + " " + pt(E) + tail;
    var cb = PK.bead(W.L.threads, 2.9);
    tl.fromTo(cb.g, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "none", immediateRender: false }, ts - 0.12);
    PK.travel(tl, cb.g, dCall, ts - 0.12, 0.62, "power1.inOut");
    tl.fromTo(cb.g, { opacity: 1 }, { opacity: 0, duration: 0.1, ease: "none", immediateRender: false }, ts + 0.48);
    // a small summons pulse at the bead
    var pulse = PK.el("circle", { cx: b[0], cy: b[1], r: 3.6, fill: "none", stroke: C.rust, "stroke-width": 1.1 }, W.L.threads);
    gsap.set(pulse, { opacity: 0 });
    tl.fromTo(pulse, { opacity: 0.85, scale: 1, svgOrigin: pt(b) }, { opacity: 0, scale: 3.2, svgOrigin: pt(b), duration: 0.45, ease: "power2.out", immediateRender: false }, ts - 0.04);
    // the thread leaves the bead, runs through the door to the seat's edge
    var th = PK.thread(W.L.threads, dThread);
    gsap.set(th, { drawSVG: "0% 0%" });
    var e = f(Math.max(80, (1 - 21 / th.getTotalLength()) * 100)) + "%";
    tl.fromTo(th, { drawSVG: "0% 0%" }, { drawSVG: "0% " + e, duration: 0.33, ease: "power2.out", immediateRender: false }, ts);
    PK.sfx("summon", ts, { gain_db: -6, agent: sm.key, pan: pan(s[0], ts) });
    // the specialist travels in along it; the thread is taken in behind it, clearing the door
    var tIn = ts + 0.14,
      dur = 0.52;
    var land = tIn + dur;
    tl.fromTo(ag.g, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "none", immediateRender: false }, tIn);
    PK.travel(tl, ag.g, dTravel, tIn, dur, sm.key === "siteRules" ? "power2.inOut" : "power3.out");
    tl.fromTo(ag.body, { scale: 0.45, svgOrigin: "0 0" }, { scale: 1.07, svgOrigin: "0 0", duration: dur, ease: "power2.out", immediateRender: false }, tIn);
    tl.fromTo(ag.body, { scale: 1.07, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.25, ease: "power2.inOut", immediateRender: false }, land);
    tl.fromTo(th, { drawSVG: "0% " + e }, { drawSVG: e + " " + e, duration: 0.42, ease: "power2.inOut", immediateRender: false }, ts + 0.24);
    tl.fromTo(th, { opacity: 1 }, { opacity: 0, duration: 0.03, ease: "none", immediateRender: false }, ts + 0.66);
    if (sm.key === "insurer") {
      tl.fromTo(ag.left, { x: 0 }, { x: -3.5, duration: 0.25, ease: "power2.out", immediateRender: false }, tIn);
      tl.fromTo(ag.right, { x: 0 }, { x: 3.5, duration: 0.25, ease: "power2.out", immediateRender: false }, tIn);
      tl.fromTo(ag.left, { x: -3.5 }, { x: 0, duration: 0.2, ease: "power2.inOut", immediateRender: false }, land - 0.05);
      tl.fromTo(ag.right, { x: 3.5 }, { x: 0, duration: 0.2, ease: "power2.inOut", immediateRender: false }, land - 0.05);
    }
    // its seat turns from dashed to taken; its name
    var seat = PK.el("circle", { cx: s[0], cy: s[1], r: 19.5, fill: C.rustPale }, W.L.chambers);
    gsap.set(seat, { opacity: 0 });
    tl.fromTo(seat, { opacity: 0, scale: 0.55, svgOrigin: pt(s) }, { opacity: 1, scale: 1, svgOrigin: pt(s), duration: 0.3, ease: "power2.out", immediateRender: false }, land - 0.1);
    tl.fromTo(slot.el, { opacity: 1 }, { opacity: 0, duration: 0.2, ease: "none", immediateRender: false }, land - 0.1);
    sh.seats[sm.key] = seat;
    PK.show(tl, ag.label, land + 0.04, 0.3, { later: true });
    PK.sfx("arrive", land, { gain_db: -8, size: "agent", agent: sm.key, pan: pan(s[0], land) });
    tLand = land;
  });

  // ------------------------------------------------------------ 29.05 to 29.75: the case goes in; Priora stays outside
  var tCase = tLand + 0.02;
  turnBead(Math.round(angleOf(DOCK[0] - PRI[0], DOCK[1] - PRI[1])), tCase - 0.32, 0.28); // to the case beside it
  var dCase = "M" + pt(DOCK) + " C650 490 560 500 " + pt(T);
  PK.travel(tl, cs.g, dCase, tCase, 0.66, "power2.inOut");
  PK.trail(tl, W.L.trails, dCase, tCase, 0.66, "power2.inOut");
  turnBead(160, tCase + 0.1, 0.4); // follows it to the door
  PK.sfx("move", tCase, { dur: 0.66, gain_db: -9, material: "case", pan: 0.1 });
  PK.sfx("arrive", tCase + 0.66, { gain_db: -6, size: "case", pan: pan(T[0], tCase + 0.66) });
  cs.unfold(tl, 29.75, 0.45, null, { stagger: 0.03 }); // its facets open out as marks, no labels

  // ------------------------------------------------------------ 30.0 to 31.3: Priora distributes the case
  var bD = beadPos(160);
  var dPulse = "M" + pt(bD) + " L" + pt([DOOR[0] - 4, 508]) + " L" + pt([T[0] + 24, T[1] - 1.2]);
  var pth = PK.thread(W.L.threads, dPulse);
  gsap.set(pth, { drawSVG: "0% 0%" });
  var tPulse = 30.0;
  PK.drawOn(tl, pth, tPulse, 0.18, "power2.out", { later: true });
  var pb = PK.bead(W.L.threads, 3.1);
  tl.fromTo(pb.g, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "none", immediateRender: false }, tPulse);
  PK.travel(tl, pb.g, dPulse, tPulse, 0.24, "power1.inOut");
  tl.fromTo(pb.g, { opacity: 1 }, { opacity: 0, duration: 0.06, ease: "none", immediateRender: false }, tPulse + 0.24);
  // taken in toward the case, then gone (no fragment)
  PK.drawOff(tl, pth, tPulse + 0.2, 0.3, "power2.in", { to: "end" });
  tl.fromTo(pth, { opacity: 1 }, { opacity: 0, duration: 0.03, ease: "none", immediateRender: false }, tPulse + 0.5);
  PK.sfx("packet", tPulse, { gain_db: -9, pan: 0.15 });
  tl.fromTo(cs.ring, { scale: 1, svgOrigin: "0 0" }, { scale: 1.12, svgOrigin: "0 0", duration: 0.1, ease: "power2.out", immediateRender: false }, tPulse + 0.24);
  tl.fromTo(cs.ring, { scale: 1.12, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.28, ease: "power2.inOut", immediateRender: false }, tPulse + 0.34);
  closeDoor(30.55, 0.35);

  // threads fan out from the case to each specialist, 0.15 s apart, and carry copies of the facets it needs
  var needs = {
    insurer: ["hot", "conditions"],
    fire: ["hot"],
    evidence: ["photo"],
    riskEng: ["place"],
    siteRules: ["place", "conditions"],
  };
  var parkR = { fire: 104, insurer: 104, siteRules: 104, riskEng: 106, evidence: 104 };
  var copies = {};
  var pulseAt = {};
  var fanOrder = ["insurer", "fire", "evidence", "riskEng", "siteRules"];
  var tFan = 30.25;
  var fanThreads = [];
  fanOrder.forEach(function (key, i) {
    var a = W.agents[key].spec.slot;
    var d = "M" + pt(onTable(62, a)) + " L" + pt(onTable(129, a));
    var ft = PK.thread(W.L.threads, d);
    gsap.set(ft, { drawSVG: "0% 0%" });
    var tf = tFan + i * 0.15;
    PK.drawOn(tl, ft, tf, 0.22, "power2.out", { later: true });
    fanThreads.push(ft);
    var park = onTable(parkR[key], a);
    copies[key] = needs[key].map(function (fk, j) {
      var off = needs[key].length === 2 ? (j === 0 ? -10 : 10) : 0;
      var dest = [park[0] + off, park[1]];
      var start = onTable(62, a);
      var hd = holder(W.L.tokens, start[0], start[1]);
      PK.el("circle", { cx: 0, cy: 0, r: 7, fill: C.paper, stroke: C.rust, "stroke-width": 1.4 }, hd.inner);
      PK.facetMark(hd.inner, fk, 4.1);
      var tc = tf + 0.06 + j * 0.09;
      tl.fromTo(hd.g, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none", immediateRender: false }, tc);
      tl.fromTo(hd.inner, { scale: 0.5, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.3, ease: "power2.out", immediateRender: false }, tc);
      PK.travel(tl, hd.g, "M" + pt(start) + " L" + pt(onTable(parkR[key] - 4, a)) + " L" + pt(dest), tc, 0.36, "power2.inOut");
      (pulseAt[fk] = pulseAt[fk] || []).push(tc);
      return { g: hd.g, inner: hd.inner, at: dest, key: fk };
    });
  });
  Object.keys(pulseAt).forEach(function (fk) {
    var fc = cs.facet(fk),
      a0 = Math.min.apply(null, pulseAt[fk]),
      a1 = Math.max.apply(null, pulseAt[fk]);
    tl.fromTo(fc.chip, { scale: 1, svgOrigin: "0 0" }, { scale: 1.3, svgOrigin: "0 0", duration: 0.1, ease: "power2.out", immediateRender: false }, a0);
    tl.fromTo(fc.chip, { scale: 1.3, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.28, ease: "power2.inOut", immediateRender: false }, Math.max(a0 + 0.1, a1 + 0.05));
  });
  PK.sfx("thread", tFan, { dur: 0.8, gain_db: -11, pan: -0.1 });
  PK.sfx("packet", tFan + 0.1, { gain_db: -12, size: "small", pan: 0.1 });
  PK.sfx("packet", tFan + 0.4, { gain_db: -12, size: "small", pan: -0.1 });
  PK.sfx("packet", tFan + 0.7, { gain_db: -12, size: "small", pan: -0.3 });
  fanThreads.forEach(function (ft, i) {
    tl.fromTo(ft, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, 31.12 + i * 0.03);
  });

  // ------------------------------------------------------------ 31.2 to 33.8: each specialist checks its own conditions
  // staggered so that never more than two of them move at once
  var tCheck = PK.word("L05", "each");
  var art = {}; // inspection marks, removed when each one reports back
  function addArt(key, el) {
    (art[key] = art[key] || []).push(el);
  }
  var tIN = tCheck + 0.05,
    tFI = tCheck + 0.4,
    tRE = tCheck + 0.8,
    tEV = tCheck + 1.65,
    tSR = tCheck + 2.0;

  // Insurer conditions: its brackets open and close around the copy of HOT WORK (31.25 to 32.05)
  (function () {
    var t = tIN;
    var ag = W.agents.insurer;
    var hot = copies.insurer[0];
    var home = G.slot(ag.spec.slot);
    tl.fromTo(ag.left, { x: 0 }, { x: -5.5, duration: 0.24, ease: "power2.out", immediateRender: false }, t);
    tl.fromTo(ag.right, { x: 0 }, { x: 5.5, duration: 0.24, ease: "power2.out", immediateRender: false }, t);
    PK.travel(tl, hot.g, PK.curve(hot.at, home, -8), t + 0.12, 0.42, "power2.inOut");
    tl.fromTo(hot.inner, { scale: 1, svgOrigin: "0 0" }, { scale: 0.78, svgOrigin: "0 0", duration: 0.42, ease: "power2.inOut", immediateRender: false }, t + 0.12);
    tl.fromTo(ag.left, { x: -5.5 }, { x: 0, duration: 0.24, ease: "power2.inOut", immediateRender: false }, t + 0.56);
    tl.fromTo(ag.right, { x: 5.5 }, { x: 0, duration: 0.24, ease: "power2.inOut", immediateRender: false }, t + 0.56);
    PK.sfx("inspect", t + 0.6, { gain_db: -8, agent: "insurer", material: "clasp", pan: pan(home[0], t) });
  })();

  // Fire: three dots above its apex, two concentric pings toward what it checks (31.6 to 32.75)
  (function () {
    var t = tFI;
    var ag = W.agents.fire;
    var s = G.slot(ag.spec.slot);
    tl.fromTo(ag.dots, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out", immediateRender: false }, t);
    var dir = angleOf(T[0] - s[0], T[1] - s[1]);
    [0, 1].forEach(function (k) {
      var hd = holder(W.L.threads, s[0], s[1]);
      PK.el("path", { d: PK.arc(0, 0, 50, dir - 40, dir + 40), fill: "none", stroke: C.rust, "stroke-width": 1.8, "stroke-linecap": "round" }, hd.inner);
      var tp = t + 0.12 + k * 0.3;
      tl.fromTo(hd.g, { opacity: 1 }, { opacity: 0, duration: 0.7, ease: "power1.in", immediateRender: false }, tp);
      tl.fromTo(hd.inner, { scale: 0.4, svgOrigin: "0 0" }, { scale: 1.05, svgOrigin: "0 0", duration: 0.7, ease: "power1.out", immediateRender: false }, tp);
      PK.sfx("inspect", tp, { gain_db: -12 - k * 3, agent: "fire", material: "ping", pan: pan(s[0], tp) });
    });
  })();

  // Risk engineering: turns 45 degrees and draws a dashed exposure radius round the place (32.0 to 32.85)
  (function () {
    var t = tRE;
    var ag = W.agents.riskEng;
    var c = copies.riskEng[0].at;
    tl.fromTo(ag.body, { rotation: 0, svgOrigin: "0 0" }, { rotation: 45, svgOrigin: "0 0", duration: 0.45, ease: "power2.inOut", immediateRender: false }, t);
    var R = 23;
    var rad = PK.el("path", { d: "M" + pt(c) + " L" + pt(PK.polar(c[0], c[1], R, 300)), fill: "none", stroke: C.rust, "stroke-width": 1.4, "stroke-linecap": "round" }, W.L.threads);
    gsap.set(rad, { drawSVG: "0% 0%" });
    PK.drawOn(tl, rad, t + 0.2, 0.28, "power2.out", { later: true });
    var ring = PK.el("circle", { cx: c[0], cy: c[1], r: R, class: "pk-thread-dash" }, W.L.threads);
    gsap.set(ring, { opacity: 0 });
    tl.fromTo(ring, { opacity: 0, scale: 0.6, svgOrigin: pt(c) }, { opacity: 1, scale: 1, svgOrigin: pt(c), duration: 0.4, ease: "power2.out", immediateRender: false }, t + 0.42);
    // turns back before it reports
    tl.fromTo(ag.body, { rotation: 45, svgOrigin: "0 0" }, { rotation: 0, svgOrigin: "0 0", duration: 0.45, ease: "power2.inOut", immediateRender: false }, 33.85);
    addArt("riskEng", rad);
    addArt("riskEng", ring);
    PK.sfx("inspect", t, { gain_db: -9, agent: "riskEng", material: "measure", dur: 0.8, pan: pan(c[0], t) });
  })();

  // Evidence: viewfinder corners contract onto the photo, then a small tick (32.85 to 33.6)
  (function () {
    var t = tEV;
    var ag = W.agents.evidence;
    var s = G.slot(ag.spec.slot);
    var c = copies.evidence[0].at;
    var dx = c[0] - s[0],
      dy = c[1] - s[1];
    tl.fromTo(ag.corners, { opacity: 0, x: 0, y: 0, scale: 1, svgOrigin: "0 0" }, { opacity: 1, x: 0, y: 0, scale: 1, svgOrigin: "0 0", duration: 0.15, ease: "none", immediateRender: false }, t);
    tl.fromTo(ag.corners, { x: 0, y: 0, scale: 1, svgOrigin: "0 0" }, { x: dx, y: dy, scale: 0.6, svgOrigin: "0 0", duration: 0.4, ease: "power3.inOut", immediateRender: false }, t + 0.17);
    var tick = PK.el("path", { d: "M" + f(c[0] + 12) + " " + f(c[1] - 0.5) + " l3.2 3.6 l6.6 -8", fill: "none", stroke: C.rust, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, W.L.tokens);
    gsap.set(tick, { drawSVG: "0% 0%" });
    PK.drawOn(tl, tick, t + 0.57, 0.24, "power2.out", { later: true });
    tl.fromTo(ag.corners, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, t + 1.05);
    tl.fromTo(ag.corners, { x: dx, y: dy, scale: 0.6, svgOrigin: "0 0" }, { x: 0, y: 0, scale: 1, svgOrigin: "0 0", duration: 0.01, ease: "none", immediateRender: false }, t + 1.4);
    addArt("evidence", tick);
    PK.sfx("evidence", t + 0.17, { gain_db: -7, part: "focus", pan: pan(c[0], t) });
    PK.sfx("evidence", t + 0.58, { gain_db: -9, part: "accept", pan: pan(c[0], t) });
  })();

  // Site rules: a straight ruled line with end ticks under what it checks (33.2 to 33.75)
  (function () {
    var t = tSR;
    var c = copies.siteRules;
    var y = c[0].at[1] + 13.5,
      x0 = c[0].at[0] - 13,
      x1 = c[1].at[0] + 13;
    var st = { fill: "none", stroke: C.rust, "stroke-width": 1.6, "stroke-linecap": "round" };
    var rule = PK.el("path", Object.assign({ d: "M" + f(x0) + " " + f(y) + " H" + f(x1) }, st), W.L.threads);
    var ticks = PK.el("path", Object.assign({ d: "M" + f(x0) + " " + f(y - 5) + " V" + f(y + 5) + " M" + f(x1) + " " + f(y - 5) + " V" + f(y + 5) }, st), W.L.threads);
    gsap.set(rule, { drawSVG: "0% 0%" });
    gsap.set(ticks, { opacity: 0 });
    tl.fromTo(ticks, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none", immediateRender: false }, t);
    PK.drawOn(tl, rule, t + 0.05, 0.5, "power2.inOut", { later: true });
    sh.ruleEnd = [x1, y];
    addArt("siteRules", rule);
    addArt("siteRules", ticks);
    PK.sfx("inspect", t, { gain_db: -9, agent: "siteRules", material: "ruler", pan: pan(300, t) });
  })();

  // ------------------------------------------------------------ two focused signals
  (function () {
    // Fire and Insurer conditions: the fire watch (32.4 to 33.5, label held to 34.0)
    var a = G.slot(W.agents.fire.spec.slot),
      b = G.slot(W.agents.insurer.spec.slot);
    var u = unit(a, b);
    var p0 = [a[0] + u[0] * 19, a[1] + u[1] * 19],
      p1 = [b[0] - u[0] * 19, b[1] - u[1] * 19];
    var mid = lerp(p0, p1, 0.5);
    var out = PK.polar(0, 0, 1, 292.5);
    var ctl = [mid[0] + out[0] * 44, mid[1] + out[1] * 44];
    var d = "M" + pt(p0) + " Q" + pt(ctl) + " " + pt(p1);
    var back = "M" + pt(p1) + " Q" + pt(ctl) + " " + pt(p0);
    var th = PK.thread(W.L.threads, d);
    gsap.set(th, { drawSVG: "0% 0%" });
    var t = 32.4;
    PK.drawOn(tl, th, t, 0.25, "power2.out", { later: true });
    var bd = PK.bead(W.L.threads, 3);
    tl.fromTo(bd.g, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "none", immediateRender: false }, t + 0.1);
    PK.travel(tl, bd.g, d, t + 0.1, 0.32, "power1.inOut");
    PK.travel(tl, bd.g, back, t + 0.46, 0.32, "power1.inOut");
    tl.fromTo(bd.g, { opacity: 1 }, { opacity: 0, duration: 0.06, ease: "none", immediateRender: false }, t + 0.78);
    var apex = [0.25 * p0[0] + 0.5 * ctl[0] + 0.25 * p1[0], 0.25 * p0[1] + 0.5 * ctl[1] + 0.25 * p1[1]];
    var lab = knockout(PK.text(W.L.labels, "Fire watch", apex[0] + 10, apex[1] - 10, { font: "mono", size: STATUS, fill: C.rust, anchor: "middle" }));
    gsap.set(lab, { opacity: 0 });
    PK.show(tl, lab, t + 0.12, 0.25, { later: true });
    PK.hide(tl, lab, 33.75, 0.3);
    tl.fromTo(th, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, 33.2);
    PK.sfx("request", t + 0.1, { gain_db: -10, pan: pan(apex[0], t) });
    PK.sfx("return", t + 0.46, { gain_db: -13, size: "small", pan: pan(apex[0], t) });
  })();
  (function () {
    // Evidence and Site rules: the photo shows the place (33.8 to 35.0)
    var a = copies.evidence[0].at,
      b = sh.ruleEnd; // the right end of Site rules' ruled line
    var r = 76;
    var aB = 360 - (Math.acos((T[1] - b[1]) / r) * 180) / Math.PI - 90; // where the inner arc reaches the ruler's height
    var pA = onTable(r, 90),
      pB = onTable(r, aB);
    var d = "M" + pt([a[0], a[1] - 8]) + " L" + pt(pA) + " A" + r + " " + r + " 0 0 1 " + pt(pB) + " L" + pt([b[0] + 1.5, b[1]]);
    var back = "M" + pt([b[0] + 1.5, b[1]]) + " L" + pt(pB) + " A" + r + " " + r + " 0 0 0 " + pt(pA) + " L" + pt([a[0], a[1] - 8]);
    var th = PK.thread(W.L.threads, d);
    gsap.set(th, { drawSVG: "0% 0%" });
    var t = 33.8;
    PK.drawOn(tl, th, t, 0.3, "power2.out", { later: true });
    var bd = PK.bead(W.L.threads, 3);
    tl.fromTo(bd.g, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "none", immediateRender: false }, t + 0.1);
    PK.travel(tl, bd.g, d, t + 0.1, 0.4, "power1.inOut");
    PK.travel(tl, bd.g, back, t + 0.55, 0.4, "power1.inOut");
    tl.fromTo(bd.g, { opacity: 1 }, { opacity: 0, duration: 0.06, ease: "none", immediateRender: false }, t + 0.95);
    tl.fromTo(th, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, t + 0.97);
    PK.sfx("request", t + 0.1, { gain_db: -11, pan: pan(330, t) });
    PK.sfx("return", t + 0.55, { gain_db: -13, size: "small", pan: pan(330, t) });
  })();

  // ------------------------------------------------------------ 33.05 to 36.4: findings return to Priora
  // Each specialist sends one finding back out through the door, a bead with a short line
  // behind it that clears the door before the next one comes. They land on Priora's orbit
  // where it faces the door (144 deg) and the marks turn round the orbit to make room.
  var tBack = PK.word("L05", "reports");
  openDoor(tBack + 0.02, 0.35);
  turnBead(180, tBack + 0.05, 0.35); // faces the panel to receive
  var DIN = [DOOR[0] - 16, 504];
  var LAND = 144,
    STEP = 72;
  var landP = PK.polar(PRI[0], PRI[1], 26, LAND);
  var ringG = PK.g(P.body);
  P.body.insertBefore(ringG, P.beadG);
  gsap.set(ringG, { rotation: 0, scale: 1, svgOrigin: "0 0" });
  var marks = [];
  var returns = [
    { key: "insurer", t: 33.2, ctl: [478, 462] },
    { key: "fire", t: 33.8, ctl: [566, 452] },
    { key: "riskEng", t: 34.4, ctl: [436, 612] },
    { key: "evidence", t: 35.0, ctl: [556, 716] },
    { key: "siteRules", t: 35.6, ctl: [436, 430] },
  ];
  returns.forEach(function (rt, i) {
    var ag = W.agents[rt.key];
    var s = G.slot(ag.spec.slot);
    var t = rt.t;
    var u = unit(s, rt.ctl);
    var p0 = [s[0] + u[0] * 14, s[1] + u[1] * 14];
    var v = unit(rt.ctl, DIN);
    var radial = PK.polar(0, 0, 1, LAND);
    var c1 = [DIN[0] + v[0] * 34, DIN[1] + v[1] * 34],
      c2 = [landP[0] + radial[0] * 30, landP[1] + radial[1] * 30];
    var d = "M" + pt(p0) + " Q" + pt(rt.ctl) + " " + pt(DIN) + " C" + pt(c1) + " " + pt(c2) + " " + pt(landP);
    // the copies it checked and its marks fold into one small finding
    copies[rt.key].forEach(function (cp) {
      tl.fromTo(cp.g, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "power1.in", immediateRender: false }, t - 0.2);
    });
    (art[rt.key] || []).forEach(function (el) {
      tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, t - 0.2);
    });
    if (rt.key === "fire") tl.fromTo(ag.dots, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, t - 0.2);
    // the finding and its short line (the tail follows, so the door is clear for the next)
    var bd = PK.bead(W.L.threads, 3.2);
    var rl = PK.thread(W.L.threads, d);
    gsap.set(rl, { drawSVG: "0% 0%" });
    tl.fromTo(rl, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.8, ease: "power2.inOut", immediateRender: false }, t);
    tl.fromTo(rl, { drawSVG: "0% 100%" }, { drawSVG: "100% 100%", duration: 0.62, ease: "power2.inOut", immediateRender: false }, t + 0.24);
    tl.fromTo(rl, { opacity: 1 }, { opacity: 0, duration: 0.03, ease: "none", immediateRender: false }, t + 0.86);
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
    marks.push(tk);
    if (i < returns.length - 1) {
      tl.fromTo(ringG, { rotation: -STEP * i, svgOrigin: "0 0" }, { rotation: -STEP * (i + 1), svgOrigin: "0 0", duration: 0.3, ease: "power2.inOut", immediateRender: false }, t + 0.9);
    }
    PK.sfx("return", t, { gain_db: -8, agent: rt.key, dur: 0.8, pan: pan(s[0], t) });
  });
  closeDoor(36.3, 0.35);

  // ------------------------------------------------------------ 36.6 to 37.9: Priora reconciles the five findings
  // the marks turn slowly round the orbit and are taken in; the bead turns to the case
  var rot0 = -STEP * (returns.length - 1);
  tl.fromTo(ringG, { rotation: rot0, svgOrigin: "0 0" }, { rotation: rot0 + 72, svgOrigin: "0 0", duration: 1.3, ease: "power1.inOut", immediateRender: false }, 36.6);
  tl.fromTo(ringG, { scale: 1, svgOrigin: "0 0" }, { scale: 0.35, svgOrigin: "0 0", duration: 0.7, ease: "power2.in", immediateRender: false }, 37.2);
  tl.fromTo(marks, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: "power1.in", immediateRender: false }, 37.55);
  turnBead(Math.round(angleOf(T[0] - PRI[0], T[1] - PRI[1]) * 10) / 10, 36.7, 0.6);
  tl.fromTo(P.body, { scale: 1, svgOrigin: "0 0" }, { scale: 1.07, svgOrigin: "0 0", duration: 0.13, ease: "power2.out", immediateRender: false }, 37.65);
  tl.fromTo(P.body, { scale: 1.07, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.2, ease: "power2.inOut", immediateRender: false }, 37.78);
  PK.sfx("assemble", 37.3, { gain_db: -10, size: "small", pan: pan(700, 37.3) });
});
