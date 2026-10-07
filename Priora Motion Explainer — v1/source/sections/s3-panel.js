/*
  s3-panel (22.3 to 38 s): the configurable site panel. Cut 3.

  Priora carries the case (its "Case" label riding with it) to the outside of the panel
  door while the camera moves (22.3 to 23.9). The chamber draws from its door. Eight seats
  appear round the table; three hold ghosts of other possible specialists (Security,
  Electrical, Structural). Priora's bead considers each ghost: a dashed feeler runs toward
  it through the door, stops short and retracts; the ghost dims to 35 percent and stays,
  its seat empty, until 29.0. Then Priora summons five specialists. For each one the case
  facet that makes it relevant pulses and sends its bead to Priora's bead; Priora sends the
  call out along a thread to the edge of the frame (above or below the door, well clear of
  Priora); the specialist appears there, at the far end of the thread, and comes in along
  its own thread through the door to its seat. The case goes in to the table and opens its
  facets; Priora stays outside (it conducts, it is not on the panel). A pulse from Priora,
  then copies of the facets fan out and stay tethered to their specialists. Each one checks
  in its own way (never more than two at once); FIRE WATCH? passes between Fire and Insurer
  conditions; the findings come back out through the door and land on Priora's orbit as
  five marks; Priora reconciles them (36.8 to 37.95).

  State at 38.0 (handed to s4, same builder): Priora at (700, 470), bead pointing at the
  case (W.s3.beadA), marks absorbed; case at the table centre (380, 520), facets
  unfolded; agents in their first slots, names visible; rust pale seats under them; door
  closed; three empty seats dashed; the table ring visible.

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
  var NAME = PK.cam.px(25, 22); // names: 22 px in the still panel shot (width 1090)
  var STATUS = PK.cam.px(32.5, 19.5); // mono status labels
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
  function dist(a, b) {
    return Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2));
  }
  function pt(p) {
    return f(p[0]) + " " + f(p[1]);
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
  // the panel door: its two leaves slide apart into the wall (35 units each) and back
  function openDoor(at, dur, sound) {
    panel.open(tl, at, dur || 0.4);
    if (sound !== false) PK.sfx("door-open", at, { gain_db: -11, pan: pan(DOOR[0], at) });
  }
  function closeDoor(at, dur) {
    panel.close(tl, at, dur || 0.35);
    PK.sfx("door-close", at + (dur || 0.35), { gain_db: -12, pan: pan(DOOR[0], at) });
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
  // a rust thread that draws on and is later taken in (never leaves a fragment)
  function thread(d, layer) {
    var th = PK.thread(layer || W.L.threads, d);
    gsap.set(th, { drawSVG: "0% 0%" });
    return th;
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
  if (W.caseLabel) tl.set(W.caseLabel, { opacity: 1, x: 0, y: 0 }, T0);
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
  if (W.caseLabel) {
    // "Case" rides with the case (same curve, relative), then fades as the walls draw
    PK.travel(tl, W.caseLabel, PK.curve([0, 0], [DOCK[0] - G.caseForm[0], DOCK[1] - G.caseForm[1]], 22), T0 + 0.08, 1.42, "power2.inOut");
    PK.hide(tl, W.caseLabel, 24.0, 0.3);
  }
  PK.sfx("arrive", T0 + 1.5, { gain_db: -12, size: "case", pan: pan(DOCK[0], T0 + 1.5) });

  // ------------------------------------------------------------ 23.5 to 24.4: the chamber draws from its door, round to its door
  PK.fade(tl, [panel.leafA, panel.leafB, panel.jambs], 0, 1, 23.5, 0.25, "none", { later: true });
  PK.drawOn(tl, panel.walls, 23.6, 0.8, "power2.inOut", { later: true });
  PK.show(tl, panel.title, 24.2, 0.4, { later: true });
  PK.show(tl, panel.sub, 24.35, 0.4, { later: true });
  // Priora's name while it considers the ghosts; again while the case goes in and Priora stays out
  PK.show(tl, P.label, 23.95, 0.35, { later: true });
  PK.hide(tl, P.label, 25.5, 0.3);
  PK.show(tl, P.label, 29.4, 0.35, { later: true });
  PK.hide(tl, P.label, 30.75, 0.35);

  // ------------------------------------------------------------ 24.2 to 24.5: eight seats round the table, three ghosts
  var gapA = 8.5;
  G.slotAngles.forEach(function (a, i) {
    var seg = PK.el("path", { d: PK.arc(T[0], T[1], G.slotR, a + gapA, a + 45 - gapA), class: "pk-hair-soft" }, W.L.chambers);
    gsap.set(seg, { drawSVG: "0% 0%" });
    PK.drawOn(tl, seg, 24.15 + i * 0.03, 0.35, "power2.out", { later: true });
    sh.ring.push(seg);
  });
  [270, 315, 0, 45, 90, 135, 180, 225].forEach(function (a, i) {
    var s = panel.slotAt(a);
    var tA = 24.15 + i * 0.03;
    tl.fromTo(s.el, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: "none", immediateRender: false }, tA);
    tl.fromTo(s.el, { scale: 0.6, svgOrigin: pt(s.p) }, { scale: 1, svgOrigin: pt(s.p), duration: 0.3, ease: "power2.out", immediateRender: false }, tA);
  });

  // ghosts: dashed grey outlines in three seats, their names outside the ring (radius + 45)
  var GHOST_STYLE = "fill:none;stroke:" + C.grey + ";stroke-width:calc(var(--sw,1)*1.5px);stroke-dasharray:calc(var(--sw,1)*3px) calc(var(--sw,1)*3px);stroke-linecap:round;stroke-linejoin:round;";
  var ghosts = [
    { a: 180, name: "Security", shape: PK.polyPath([0, 1, 2, 3, 4].map(function (k) { return PK.polar(0, 1.2, 10.5, -90 + k * 72); })) },
    { a: 0, name: "Electrical", shape: "M-7.5 9.5 L-2.5 -9.5 L7.5 -9.5 L2.5 9.5 Z" },
    { a: 45, name: "Structural", shape: "M-10.5 -5 H10.5 M-10.5 5 H10.5 M0 -5 V5" },
  ];
  ghosts.forEach(function (gh, i) {
    var p = G.slot(gh.a);
    var hd = holder(W.L.chambers, p[0], p[1]);
    PK.el("path", { d: gh.shape, style: GHOST_STYLE }, hd.inner);
    var lp = onTable(G.slotR + 45, gh.a);
    var name = knockout(PK.text(W.L.labels, gh.name, lp[0], lp[1], { size: GHOST, weight: 500, fill: C.grey, anchor: "middle", baseline: "central" }));
    gsap.set(name, { opacity: 0 });
    tl.fromTo([hd.g, name], { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power1.out", immediateRender: false }, 24.15 + i * 0.06);
    gh.hd = hd;
    gh.name = name;
    gh.p = p;
  });

  // ------------------------------------------------------------ 24.05 to 25.55: selection. The bead considers each ghost: a dashed
  // feeler runs toward it through the door, stops short and retracts; the ghost dims and stays, its seat empty.
  openDoor(24.05, 0.35);
  var tP = 24.32;
  ghosts.forEach(function (gh, i) {
    var A = Math.round(angleOf(gh.p[0] - PRI[0], gh.p[1] - PRI[1]) * 10) / 10;
    turnBead(A, tP, 0.1);
    // the feeler lives in the bead's group, so it runs straight at the ghost (through the door gap) and stops short of it
    var fl = maskedDash(P.beadG, "M31 0 H" + f(dist(gh.p, PRI) - 52));
    P.beadG.insertBefore(fl.el, P.bead);
    var t = tP + 0.1;
    tl.fromTo(fl.reveal, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.14, ease: "power2.out", immediateRender: false }, t);
    tl.fromTo(fl.reveal, { drawSVG: "0% 100%" }, { drawSVG: "0% 0%", duration: 0.11, ease: "power2.in", immediateRender: false }, t + 0.2);
    // the ghost answers once, then rests at 35 percent beside the panel that was chosen (to 29.0)
    tl.fromTo(gh.hd.inner, { scale: 1, svgOrigin: "0 0" }, { scale: 1.18, svgOrigin: "0 0", duration: 0.1, ease: "power2.out", immediateRender: false }, t + 0.12);
    tl.fromTo(gh.hd.inner, { scale: 1.18, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.22, ease: "power2.inOut", immediateRender: false }, t + 0.22);
    tl.fromTo([gh.hd.g, gh.name], { opacity: 1 }, { opacity: 0.35, duration: 0.3, ease: "power1.inOut", immediateRender: false }, t + 0.32);
    tl.fromTo([gh.hd.g, gh.name], { opacity: 0.35 }, { opacity: 0, duration: 0.4, ease: "power1.in", immediateRender: false }, 29.0 + i * 0.05);
    if (i !== 1) PK.sfx("request", t, { gain_db: -17, part: "probe", pan: pan(gh.p[0], t) });
    tP = t + 0.32;
  });

  // ------------------------------------------------------------ 25.55 to 29.4: Priora summons five specialists from outside
  // the relevant facet pulses (1.4, held 0.3 s) and sends its bead to Priora's bead; Priora sends the call out along a
  // thread to the frame edge above or below the door; the specialist appears there and comes in along its own thread.
  var O_TOP = [662, 242],
    O_BOT = [662, 790];
  var callTop = 214,
    callBot = 150; // bead angles for calls up and down (clear of Priora's label and of the case)
  var summons = [
    { key: "evidence", facet: "photo", ey: 526, from: "bot", hop: [655, 528] },
    { key: "riskEng", facet: "place", ey: 520, from: "bot", hop: [705, 505] },
    { key: "siteRules", facet: "conditions", ey: 482, from: "top", hop: [645, 540] },
    { key: "fire", facet: "hot", ey: 494, from: "top", hop: [672, 498] },
    { key: "insurer", facet: "conditions", ey: 488, from: "top", hop: [645, 540] },
  ];
  var tS0 = 26.05,
    SP = 0.6;
  // the inside part of each entry thread, from the door to the seat (control points by hand)
  var inner = {
    siteRules: function (E, s) {
      return " L" + pt([s[0], E[1]]) + " L" + pt(s); // ruled: straight orthogonal steps only
    },
    insurer: function (E, s) {
      return " C" + pt([E[0] - 60, E[1]]) + " " + pt([s[0], s[1] + 75]) + " " + pt(s);
    },
    fire: function (E, s) {
      return " C" + pt([E[0] - 45, E[1]]) + " " + pt([s[0], s[1] + 56]) + " " + pt(s);
    },
    riskEng: function (E, s) {
      return " C" + pt([E[0] - 80, E[1] + 20]) + " " + pt([s[0] + 56, s[1] - 36]) + " " + pt(s);
    },
    evidence: function (E, s) {
      return " C" + pt([E[0] - 60, E[1] + 12]) + " " + pt([s[0] + 10, s[1] - 90]) + " " + pt(s);
    },
  };
  var tLand = 0;
  summons.forEach(function (sm, i) {
    var ag = W.agents[sm.key];
    var slot = panel.slotAt(ag.spec.slot);
    var s = slot.p;
    var ts = tS0 + i * SP;
    var top = sm.from === "top";
    var O = top ? O_TOP : O_BOT;
    var A = top ? callTop : callBot;
    var b = beadPos(A);
    var E = [DOOR[0], sm.ey];
    // Priora's bead turns to where it will call (as the previous call is taken in from the bead's end)
    turnBead(A, ts - 0.3, 0.22);
    // the relevant facet pulses and holds, then sends its bead to Priora's bead
    var fc = cs.facet(sm.facet);
    tl.fromTo(fc.chip, { scale: 1, svgOrigin: "0 0" }, { scale: 1.4, svgOrigin: "0 0", duration: 0.12, ease: "power2.out", immediateRender: false }, ts - 0.5);
    tl.fromTo(fc.chip, { scale: 1.4, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.2, ease: "power2.inOut", immediateRender: false }, ts - 0.08);
    var chipAt = PK.polar(DOCK[0], DOCK[1], cs.R, fc.angle);
    var dHop = "M" + pt(chipAt) + " Q" + pt(sm.hop) + " " + pt(b);
    // the call: from the bead out to the frame edge, clear of Priora
    var dir = PK.polar(0, 0, 1, A);
    var dCall = top
      ? "M" + pt(b) + " C" + pt([b[0] + dir[0] * 28, b[1] + dir[1] * 28]) + " 640 360 " + pt(O)
      : "M" + pt(b) + " C" + pt([b[0] + dir[0] * 28, b[1] + dir[1] * 28]) + " 638 650 " + pt(O);
    var cb = PK.bead(W.L.threads, 2.9);
    tl.fromTo(cb.g, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "none", immediateRender: false }, ts - 0.2);
    PK.travel(tl, cb.g, dHop, ts - 0.2, 0.2, "power1.inOut");
    PK.travel(tl, cb.g, dCall, ts, 0.3, "power2.out");
    tl.fromTo(cb.g, { opacity: 1 }, { opacity: 0, duration: 0.06, ease: "none", immediateRender: false }, ts + 0.3);
    var call = thread(dCall);
    tl.fromTo(call, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.3, ease: "power2.out", immediateRender: false }, ts);
    // taken in toward the specialist that answered it
    tl.fromTo(call, { drawSVG: "0% 100%" }, { drawSVG: "100% 100%", duration: 0.24, ease: "power2.in", immediateRender: false }, ts + 0.3);
    tl.fromTo(call, { opacity: 1 }, { opacity: 0, duration: 0.03, ease: "none", immediateRender: false }, ts + 0.54);
    if (i === 0) PK.sfx("summon", ts, { gain_db: -8, pan: pan(O[0], ts) });
    // the specialist appears at the far end of the call, outside the chamber
    var dEntry = "M" + pt(O) + (top ? " C" + pt([O[0] - 6, O[1] + 140]) + " " + pt([E[0] + 34, E[1] - 6]) + " " + pt(E) : " C" + pt([O[0] - 6, O[1] - 150]) + " " + pt([E[0] + 34, E[1] + 6]) + " " + pt(E)) + inner[sm.key](E, s);
    var entry = thread(dEntry);
    var e = f(Math.max(80, (1 - 21 / entry.getTotalLength()) * 100)) + "%";
    tl.set(ag.g, { x: O[0], y: O[1] }, ts + 0.27);
    tl.fromTo(ag.g, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "none", immediateRender: false }, ts + 0.28);
    tl.fromTo(ag.body, { scale: 0.5, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.22, ease: "power2.out", immediateRender: false }, ts + 0.28);
    // it comes in along its own thread through the door to its seat; the thread is taken in behind it
    tl.fromTo(entry, { drawSVG: "0% 0%" }, { drawSVG: "0% " + e, duration: 0.3, ease: "power2.out", immediateRender: false }, ts + 0.3);
    var tIn = ts + 0.36,
      dur = 0.6;
    var land = tIn + dur;
    PK.travel(tl, ag.g, dEntry, tIn, dur, sm.key === "siteRules" ? "power2.inOut" : "power3.out");
    tl.fromTo(entry, { drawSVG: "0% " + e }, { drawSVG: e + " " + e, duration: 0.5, ease: "power2.inOut", immediateRender: false }, tIn + 0.1);
    tl.fromTo(entry, { opacity: 1 }, { opacity: 0, duration: 0.03, ease: "none", immediateRender: false }, tIn + 0.6);
    tl.fromTo(ag.body, { scale: 1, svgOrigin: "0 0" }, { scale: 1.06, svgOrigin: "0 0", duration: 0.1, ease: "power2.out", immediateRender: false }, land - 0.06);
    tl.fromTo(ag.body, { scale: 1.06, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.22, ease: "back.out(1.4)", immediateRender: false }, land + 0.04);
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
    PK.show(tl, ag.label, land + 0.02, 0.3, { later: true });
    PK.sfx("arrive", land, { gain_db: -9, size: "agent", agent: sm.key, pan: pan(s[0], land) });
    tLand = land;
  });

  // ------------------------------------------------------------ 29.45 to 29.97: the case goes in through the open door; Priora stays outside
  var tCase = Math.max(29.45, tLand + 0.04);
  turnBead(Math.round(angleOf(DOCK[0] - PRI[0], DOCK[1] - PRI[1])), tCase - 0.3, 0.26); // to the case beside it
  var dCase = "M" + pt(DOCK) + " C650 490 560 500 " + pt(T);
  PK.travel(tl, cs.g, dCase, tCase, 0.52, "power3.out");
  PK.trail(tl, W.L.trails, dCase, tCase, 0.52, "power3.out");
  turnBead(160, tCase + 0.08, 0.35); // follows it to the door
  PK.sfx("arrive", tCase + 0.52, { gain_db: -7, size: "case", pan: pan(T[0], tCase + 0.52) });
  cs.unfold(tl, tCase + 0.52, 0.4, null, { stagger: 0.03 }); // its facets open out as marks, no labels

  // ------------------------------------------------------------ 30.1 to 31.4: Priora distributes the case
  var bD = beadPos(160);
  var dPulse = "M" + pt(bD) + " L" + pt([DOOR[0] - 4, 508]) + " L" + pt([T[0] + 24, T[1] - 1.2]);
  var pth = thread(dPulse);
  var tPulse = tCase + 0.66;
  tl.fromTo(pth, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.18, ease: "power2.out", immediateRender: false }, tPulse);
  var pb = PK.bead(W.L.threads, 3.1);
  tl.fromTo(pb.g, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "none", immediateRender: false }, tPulse);
  PK.travel(tl, pb.g, dPulse, tPulse, 0.24, "power1.inOut");
  tl.fromTo(pb.g, { opacity: 1 }, { opacity: 0, duration: 0.06, ease: "none", immediateRender: false }, tPulse + 0.24);
  // taken in toward the case, then gone (no fragment)
  PK.drawOff(tl, pth, tPulse + 0.2, 0.3, "power2.in", { to: "end" });
  tl.fromTo(pth, { opacity: 1 }, { opacity: 0, duration: 0.03, ease: "none", immediateRender: false }, tPulse + 0.5);
  PK.sfx("packet", tPulse + 0.24, { gain_db: -10, pan: pan(T[0], tPulse) });
  tl.fromTo(cs.ring, { scale: 1, svgOrigin: "0 0" }, { scale: 1.12, svgOrigin: "0 0", duration: 0.1, ease: "power2.out", immediateRender: false }, tPulse + 0.24);
  tl.fromTo(cs.ring, { scale: 1.12, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.28, ease: "power2.inOut", immediateRender: false }, tPulse + 0.34);
  closeDoor(tPulse + 0.5, 0.35);

  // threads fan out from the case to each specialist, 0.15 s apart; each carries copies of the facets it needs,
  // which come to rest beside their specialist on a short tether (never floating free in the ring)
  var needs = {
    insurer: ["hot", "conditions"],
    fire: ["hot"],
    evidence: ["photo"],
    riskEng: ["place"],
    siteRules: ["place", "conditions"],
  };
  var parkR = 110;
  var copies = {};
  var pulseAt = {};
  var fanOrder = ["insurer", "fire", "evidence", "riskEng", "siteRules"];
  var tFan = tPulse + 0.32;
  var fanThreads = [];
  fanOrder.forEach(function (key, i) {
    var ag = W.agents[key];
    var a = ag.spec.slot;
    var sp = G.slot(a);
    var d = "M" + pt(onTable(62, a)) + " L" + pt(onTable(129, a));
    var ft = thread(d);
    var tf = tFan + i * 0.15;
    tl.fromTo(ft, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.22, ease: "power2.out", immediateRender: false }, tf);
    fanThreads.push(ft);
    var park = onTable(parkR, a);
    var tang = PK.polar(0, 0, 1, a + 90);
    copies[key] = needs[key].map(function (fk, j) {
      var off = needs[key].length === 2 ? (j === 0 ? -10.5 : 10.5) : 0;
      var dest = [park[0] + tang[0] * off, park[1] + tang[1] * off];
      var start = onTable(62, a);
      var hd = holder(W.L.tokens, start[0], start[1]);
      PK.el("circle", { cx: 0, cy: 0, r: 7, fill: C.paper, stroke: C.rust, "stroke-width": 1.4 }, hd.inner);
      PK.facetMark(hd.inner, fk, 4.1);
      var tc = tf + 0.06 + j * 0.09;
      tl.fromTo(hd.g, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none", immediateRender: false }, tc);
      tl.fromTo(hd.inner, { scale: 0.5, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.3, ease: "power2.out", immediateRender: false }, tc);
      PK.travel(tl, hd.g, "M" + pt(start) + " L" + pt(onTable(parkR - 4, a)) + " L" + pt(dest), tc, 0.36, "power3.out");
      // its tether: from the specialist's edge to the copy
      var u = unit(sp, dest);
      var teth = PK.el("path", { d: "M" + pt([sp[0] + u[0] * 15, sp[1] + u[1] * 15]) + " L" + pt([dest[0] - u[0] * 7, dest[1] - u[1] * 7]), class: "pk-thread", style: "stroke-width:calc(var(--sw,1)*1.25px);" }, W.L.threads);
      gsap.set(teth, { drawSVG: "0% 0%" });
      tl.fromTo(teth, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.2, ease: "power2.out", immediateRender: false }, tc + 0.3);
      (pulseAt[fk] = pulseAt[fk] || []).push(tc);
      return { g: hd.g, inner: hd.inner, at: dest, key: fk, tether: teth };
    });
  });
  Object.keys(pulseAt).forEach(function (fk) {
    var fc = cs.facet(fk),
      a0 = Math.min.apply(null, pulseAt[fk]),
      a1 = Math.max.apply(null, pulseAt[fk]);
    tl.fromTo(fc.chip, { scale: 1, svgOrigin: "0 0" }, { scale: 1.3, svgOrigin: "0 0", duration: 0.1, ease: "power2.out", immediateRender: false }, a0);
    tl.fromTo(fc.chip, { scale: 1.3, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.28, ease: "power2.inOut", immediateRender: false }, Math.max(a0 + 0.1, a1 + 0.05));
  });
  fanThreads.forEach(function (ft, i) {
    tl.fromTo(ft, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, 31.12 + i * 0.03);
  });

  // ------------------------------------------------------------ 31.2 to 33.75: each specialist checks its own conditions
  // 0.45 s apart, each about 0.8 s, so never more than two of them move at once
  var tCheck = PK.word("L05", "each");
  var art = {}; // inspection marks, removed when each one reports back
  function addArt(key, el) {
    (art[key] = art[key] || []).push(el);
  }
  var tIN = tCheck,
    tFI = tCheck + 0.45,
    tRE = tCheck + 0.9,
    tEV = tCheck + 1.35,
    tSR = tCheck + 2.0;

  // Insurer conditions: its brackets open and close around the copy of HOT WORK (31.2 to 31.95)
  (function () {
    var t = tIN;
    var ag = W.agents.insurer;
    var hot = copies.insurer[0];
    var home = G.slot(ag.spec.slot);
    tl.fromTo(ag.left, { x: 0 }, { x: -5.5, duration: 0.22, ease: "power2.out", immediateRender: false }, t);
    tl.fromTo(ag.right, { x: 0 }, { x: 5.5, duration: 0.22, ease: "power2.out", immediateRender: false }, t);
    // the copy is drawn in along its tether
    tl.fromTo(hot.tether, { drawSVG: "0% 100%" }, { drawSVG: "0% 0%", duration: 0.36, ease: "power2.inOut", immediateRender: false }, t + 0.1);
    PK.travel(tl, hot.g, "M" + pt(hot.at) + " L" + pt(home), t + 0.1, 0.36, "power2.inOut");
    tl.fromTo(hot.inner, { scale: 1, svgOrigin: "0 0" }, { scale: 0.78, svgOrigin: "0 0", duration: 0.36, ease: "power2.inOut", immediateRender: false }, t + 0.1);
    tl.fromTo(ag.left, { x: -5.5 }, { x: 0, duration: 0.22, ease: "power2.inOut", immediateRender: false }, t + 0.5);
    tl.fromTo(ag.right, { x: 5.5 }, { x: 0, duration: 0.22, ease: "power2.inOut", immediateRender: false }, t + 0.5);
    PK.sfx("inspect", t + 0.7, { gain_db: -9, agent: "insurer", material: "clasp", pan: pan(home[0], t) });
  })();

  // Fire: three dots above its apex, two concentric pings toward what it checks (31.65 to 32.45)
  (function () {
    var t = tFI;
    var ag = W.agents.fire;
    var s = G.slot(ag.spec.slot);
    tl.fromTo(ag.dots, { opacity: 0, y: 2 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out", immediateRender: false }, t);
    var dir = angleOf(T[0] - s[0], T[1] - s[1]);
    [0, 1].forEach(function (k) {
      var hd = holder(W.L.threads, s[0], s[1]);
      PK.el("path", { d: PK.arc(0, 0, 50, dir - 40, dir + 40), fill: "none", stroke: C.rust, "stroke-width": 1.8, "stroke-linecap": "round" }, hd.inner);
      var tp = t + 0.1 + k * 0.2;
      tl.fromTo(hd.g, { opacity: 1 }, { opacity: 0, duration: 0.55, ease: "power1.in", immediateRender: false }, tp);
      tl.fromTo(hd.inner, { scale: 0.4, svgOrigin: "0 0" }, { scale: 1.05, svgOrigin: "0 0", duration: 0.55, ease: "power1.out", immediateRender: false }, tp);
    });
    PK.sfx("inspect", t + 0.1, { gain_db: -13, agent: "fire", material: "ping", pan: pan(s[0], t) });
  })();

  // Risk engineering: turns 45 degrees and draws a dashed exposure radius round the place (32.1 to 32.9)
  (function () {
    var t = tRE;
    var ag = W.agents.riskEng;
    var c = copies.riskEng[0].at;
    tl.fromTo(ag.body, { rotation: 0, svgOrigin: "0 0" }, { rotation: 45, svgOrigin: "0 0", duration: 0.4, ease: "power2.inOut", immediateRender: false }, t);
    var R = 20;
    var rad = PK.el("path", { d: "M" + pt(c) + " L" + pt(PK.polar(c[0], c[1], R, 330)), fill: "none", stroke: C.rust, "stroke-width": 1.4, "stroke-linecap": "round" }, W.L.threads);
    gsap.set(rad, { drawSVG: "0% 0%" });
    PK.drawOn(tl, rad, t + 0.2, 0.25, "power2.out", { later: true });
    var ring = PK.el("circle", { cx: c[0], cy: c[1], r: R, class: "pk-thread-dash" }, W.L.threads);
    gsap.set(ring, { opacity: 0 });
    tl.fromTo(ring, { opacity: 0, scale: 0.6, svgOrigin: pt(c) }, { opacity: 1, scale: 1, svgOrigin: pt(c), duration: 0.36, ease: "power2.out", immediateRender: false }, t + 0.42);
    addArt("riskEng", rad);
    addArt("riskEng", ring);
    PK.sfx("inspect", t + 0.42, { gain_db: -10, agent: "riskEng", material: "measure", pan: pan(c[0], t) });
  })();

  // Evidence check: viewfinder corners contract onto the photo, then a small tick (32.55 to 33.2)
  (function () {
    var t = tEV;
    var ag = W.agents.evidence;
    var s = G.slot(ag.spec.slot);
    var c = copies.evidence[0].at;
    var dx = c[0] - s[0],
      dy = c[1] - s[1];
    tl.fromTo(ag.corners, { opacity: 0, x: 0, y: 0, scale: 1, svgOrigin: "0 0" }, { opacity: 1, x: 0, y: 0, scale: 1, svgOrigin: "0 0", duration: 0.12, ease: "none", immediateRender: false }, t);
    tl.fromTo(ag.corners, { x: 0, y: 0, scale: 1, svgOrigin: "0 0" }, { x: dx, y: dy, scale: 0.6, svgOrigin: "0 0", duration: 0.36, ease: "power3.inOut", immediateRender: false }, t + 0.12);
    var tick = PK.el("path", { d: "M" + f(c[0] + 12) + " " + f(c[1] - 0.5) + " l3.2 3.6 l6.6 -8", fill: "none", stroke: C.rust, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, W.L.tokens);
    gsap.set(tick, { drawSVG: "0% 0%" });
    PK.drawOn(tl, tick, t + 0.48, 0.2, "power2.out", { later: true });
    tl.fromTo(ag.corners, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, t + 1.0);
    tl.fromTo(ag.corners, { x: dx, y: dy, scale: 0.6, svgOrigin: "0 0" }, { x: 0, y: 0, scale: 1, svgOrigin: "0 0", duration: 0.01, ease: "none", immediateRender: false }, t + 1.32);
    addArt("evidence", tick);
  })();

  // Site rules: a straight ruled line with end ticks under what it checks (33.2 to 33.75)
  (function () {
    var t = tSR;
    var c = copies.siteRules;
    var y = Math.max(c[0].at[1], c[1].at[1]) + 13.5,
      x0 = Math.min(c[0].at[0], c[1].at[0]) - 13,
      x1 = Math.max(c[0].at[0], c[1].at[0]) + 13;
    var st = { fill: "none", stroke: C.rust, "stroke-width": 1.6, "stroke-linecap": "round" };
    var rule = PK.el("path", Object.assign({ d: "M" + f(x0) + " " + f(y) + " H" + f(x1) }, st), W.L.threads);
    var ticks = PK.el("path", Object.assign({ d: "M" + f(x0) + " " + f(y - 5) + " V" + f(y + 5) + " M" + f(x1) + " " + f(y - 5) + " V" + f(y + 5) }, st), W.L.threads);
    gsap.set(rule, { drawSVG: "0% 0%" });
    gsap.set(ticks, { opacity: 0 });
    tl.fromTo(ticks, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none", immediateRender: false }, t);
    PK.drawOn(tl, rule, t + 0.05, 0.45, "power2.inOut", { later: true });
    addArt("siteRules", rule);
    addArt("siteRules", ticks);
    PK.sfx("inspect", t + 0.05, { gain_db: -10, agent: "siteRules", material: "ruler", pan: pan(300, t) });
  })();

  // ------------------------------------------------------------ 32.9 to 33.5: Fire asks Insurer conditions about the fire watch
  (function () {
    var a = G.slot(W.agents.fire.spec.slot),
      b = G.slot(W.agents.insurer.spec.slot);
    var u = unit(a, b);
    var p0 = [a[0] + u[0] * 19, a[1] + u[1] * 19],
      p1 = [b[0] - u[0] * 19, b[1] - u[1] * 19];
    var mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    var out = PK.polar(0, 0, 1, 292.5);
    var ctl = [mid[0] + out[0] * 44, mid[1] + out[1] * 44];
    var d = "M" + pt(p0) + " Q" + pt(ctl) + " " + pt(p1);
    var back = "M" + pt(p1) + " Q" + pt(ctl) + " " + pt(p0);
    var th = thread(d);
    var t = 32.9;
    tl.fromTo(th, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.22, ease: "power2.out", immediateRender: false }, t);
    var bd = PK.bead(W.L.threads, 3);
    tl.fromTo(bd.g, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "none", immediateRender: false }, t + 0.08);
    PK.travel(tl, bd.g, d, t + 0.08, 0.24, "power1.inOut");
    PK.travel(tl, bd.g, back, t + 0.34, 0.24, "power1.inOut");
    tl.fromTo(bd.g, { opacity: 1 }, { opacity: 0, duration: 0.06, ease: "none", immediateRender: false }, t + 0.58);
    var apex = [0.25 * p0[0] + 0.5 * ctl[0] + 0.25 * p1[0], 0.25 * p0[1] + 0.5 * ctl[1] + 0.25 * p1[1]];
    var lab = knockout(PK.text(W.L.labels, "Fire watch?", apex[0] + 12, apex[1] - 10, { font: "mono", size: STATUS, fill: C.rust, anchor: "middle" }));
    gsap.set(lab, { opacity: 0 });
    PK.show(tl, lab, t + 0.08, 0.2, { later: true });
    PK.hide(tl, lab, 34.3, 0.3); // still for about 1.3 s
    tl.fromTo(th, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, 34.3);
    PK.sfx("request", t + 0.08, { gain_db: -10, pan: pan(apex[0], t) });
  })();

  // ------------------------------------------------------------ 33.6 to 36.7: findings return to Priora
  // Each specialist sends one finding back out through the door, a bead with a short line behind it that clears
  // the door before the next one comes. They land on Priora's orbit where it faces the door (144 deg) and the
  // marks turn round the orbit to make room. Each landing has its own sound.
  openDoor(33.3, 0.35, false); // silent: the passage is already busy
  turnBead(180, 33.25, 0.3); // faces the panel to receive
  var DIN = [DOOR[0] - 16, 504];
  var LAND = 144,
    STEP = 72;
  var landP = PK.polar(PRI[0], PRI[1], 26, LAND);
  var ringG = PK.g(P.body);
  P.body.insertBefore(ringG, P.beadG);
  gsap.set(ringG, { rotation: 0, scale: 1, svgOrigin: "0 0" });
  var marks = [];
  var returns = [
    { key: "insurer", t: 33.6, ctl: [478, 462] },
    { key: "fire", t: 34.2, ctl: [566, 452] },
    { key: "riskEng", t: 34.8, ctl: [436, 612] },
    { key: "evidence", t: 35.35, ctl: [556, 716] },
    { key: "siteRules", t: 35.9, ctl: [436, 430] },
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
    // the copies it checked, their tethers and its marks fold into one small finding
    copies[rt.key].forEach(function (cp) {
      tl.fromTo([cp.g, cp.tether], { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "power1.in", immediateRender: false }, t - 0.25);
    });
    (art[rt.key] || []).forEach(function (el) {
      tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "power1.in", immediateRender: false }, t - 0.25);
    });
    if (rt.key === "fire") tl.fromTo(ag.dots, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "power1.in", immediateRender: false }, t - 0.25);
    if (rt.key === "riskEng") tl.fromTo(ag.body, { rotation: 45, svgOrigin: "0 0" }, { rotation: 0, svgOrigin: "0 0", duration: 0.35, ease: "power2.inOut", immediateRender: false }, t - 0.4);
    // the finding and its short line (the tail follows, so the door is clear for the next)
    var bd = PK.bead(W.L.threads, 3.2);
    var rl = thread(d);
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
      tl.fromTo(ringG, { rotation: -STEP * i, svgOrigin: "0 0" }, { rotation: -STEP * (i + 1), svgOrigin: "0 0", duration: 0.28, ease: "power2.inOut", immediateRender: false }, t + 0.9);
    }
    PK.sfx("return", t + 0.8, { gain_db: -9, agent: rt.key, pan: pan(PRI[0], t + 0.8) });
  });
  closeDoor(36.55, 0.35);

  // ------------------------------------------------------------ 36.8 to 37.95: Priora reconciles the five findings
  // the marks turn slowly round the orbit and are taken in; the bead turns to the case
  var rot0 = -STEP * (returns.length - 1);
  tl.fromTo(ringG, { rotation: rot0, svgOrigin: "0 0" }, { rotation: rot0 + 72, svgOrigin: "0 0", duration: 1.15, ease: "power1.inOut", immediateRender: false }, 36.8);
  tl.fromTo(ringG, { scale: 1, svgOrigin: "0 0" }, { scale: 0.35, svgOrigin: "0 0", duration: 0.6, ease: "power2.in", immediateRender: false }, 37.3);
  tl.fromTo(marks, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, 37.6);
  turnBead(Math.round(angleOf(T[0] - PRI[0], T[1] - PRI[1]) * 10) / 10, 36.85, 0.6);
  tl.fromTo(P.body, { scale: 1, svgOrigin: "0 0" }, { scale: 1.07, svgOrigin: "0 0", duration: 0.12, ease: "power2.out", immediateRender: false }, 37.62);
  tl.fromTo(P.body, { scale: 1.07, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.22, ease: "power2.inOut", immediateRender: false }, 37.74);
  PK.sfx("assemble", 37.62, { gain_db: -11, size: "small", pan: pan(700, 37.6) });
});
