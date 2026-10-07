/*
  s8-system (84 to 90 s): the complete system. (cut 2)

  The camera pulls back to the whole sheet (83.1 to 84.4); while it does, every label that is
  not read at 1:1 fades (the panel's agent names, CONFIGURED FOR THIS SITE, the rooms' agent
  names, the s7 labels) and the names that are read at 1:1 grow to stay legible (room names,
  the panel title, WORKER / SITE / RISK OWNER, the single SIMULATED chip). In the still 1:1
  frame: Priora flies home (84.4 to 85.0); the decided case drops into the record as a second
  tick; the Insurer conditions token returns upright; the route retracts into the panel door.
  Text, staggered: ONE PRIORA AGENT 84.6, A CONFIGURABLE SITE PANEL 84.9, THREE DECISION ROOMS
  with DESIGN PROPOSAL under it 85.2, FIRST HOT WORK 85.4, the LATER row 85.7 while one dashed
  ghost token slides from the LIFTING tab into an empty panel slot and back. The tagline: line
  one on "risk", line two on "while". The world, the labels and the tabs fade 88.0 to 88.5,
  the tagline 88.5 to 88.8; the Priora wordmark appears alone at 88.75 and holds to 90.

  Reads W.coop from s7 (same builder).
*/
PK.section("s8-system", 84, 90, function (tl, W, ctx, S) {
  var G = PK.GEO,
    C = PK.C,
    f = PK.fmt;
  var cs = W.caseT;
  var A = W.agents;
  var KEYS = ["siteRules", "insurer", "fire", "riskEng", "evidence"];
  var co = W.coop || { packetEnd: [1206, 508], prioraEnd: [1130, 432], beadEnd: 45, packetScale: 1.4, labels: [], loop: null };
  function pt(p) {
    return f(p[0]) + " " + f(p[1]);
  }
  function FT(el, from, to, at) {
    var v = {};
    for (var k in to) v[k] = to[k];
    v.immediateRender = false;
    tl.fromTo(el, from, v, at);
  }
  function valAt(el, prop, t) {
    var best = null,
      bestEnd = -1;
    tl.getTweensOf(el).forEach(function (tw) {
      var end = tw.startTime() + tw.duration();
      if (end > t + 1e-6 || end < bestEnd) return;
      var v = tw.vars;
      if (v[prop] !== undefined && v[prop] !== null) {
        best = v[prop];
        bestEnd = end;
      }
    });
    return best;
  }
  var tPull = 83.1,
    tStill = 84.4;

  // ------------------------------------------------------------ 1. during the pull-out: fade what is not read at 1:1, grow what is
  var fadeOut = [W.panel.sub];
  KEYS.forEach(function (k) {
    if (A[k].label) fadeOut.push(A[k].label);
  });
  if (W.roomAgents) {
    ["retain", "mitigate", "transfer"].forEach(function (k) {
      (W.roomAgents[k] || []).forEach(function (a) {
        if (a.name) fadeOut.push(a.name);
        if (a.label) fadeOut.push(a.label);
      });
    });
  }
  (co.labels || []).forEach(function (l) {
    fadeOut.push(l);
  });
  fadeOut.forEach(function (el) {
    var o = valAt(el, "opacity", tPull);
    if (o === null) o = parseFloat(gsap.getProperty(el, "opacity"));
    if (!(o > 0)) return; // already hidden
    FT(el, { opacity: o }, { opacity: 0, duration: 0.4, ease: "power1.in" }, tPull + 0.02);
  });

  function grow(el, to, at, dur) {
    if (!el) return;
    var b = null;
    try {
      b = el.getBBox();
    } catch (e) {}
    if (!b) return;
    var anchor = el.getAttribute("text-anchor") || "start";
    var ox = anchor === "middle" ? b.x + b.width / 2 : anchor === "end" ? b.x + b.width : b.x;
    var oy = parseFloat(el.getAttribute("y")) || b.y + b.height;
    var o = f(ox) + " " + f(oy);
    FT(el, { scale: 1, svgOrigin: o }, { scale: to, svgOrigin: o, duration: dur || tStill - tPull, ease: "power2.inOut" }, at);
  }
  function fontSize(el) {
    var m = /font-size:\s*([\d.]+)px/.exec(el.getAttribute("style") || "");
    return m ? parseFloat(m[1]) : 15;
  }
  ["retain", "mitigate", "transfer"].forEach(function (k) {
    var n = W.rooms[k].name;
    grow(n, Math.max(1, 22 / fontSize(n)), tPull);
  });
  grow(W.panel.title, Math.max(1, 22 / fontSize(W.panel.title)), tPull);
  // WORKER / SITE / RISK OWNER are counter-scaled by font-size up to 83.1 (s1): continue from the current value
  ["worker", "site", "owner"].forEach(function (k) {
    tl.to(W.real.labels[k], { fontSize: 18.5, duration: tStill - tPull, ease: "power2.inOut" }, tPull);
  });
  // the SIMULATED chip stays one chip: it grows to 19 px type at 1:1 and moves clear of the carriers
  var chip = W.rooms.transfer.chip;
  var tr = G.rooms.transfer;
  var cBox = [tr.x + tr.w - 104, tr.y + 14, 86, 20]; // the chip's own rect (world.js)
  var cO = valAt(chip, "svgOrigin", 78) || "1719 630";
  var oxy = String(cO).split(/[ ,]+/).map(parseFloat);
  var s0 = valAt(chip, "scale", 78);
  if (s0 === null) s0 = 1;
  var x0 = valAt(chip, "x", 78) || 0,
    y0 = valAt(chip, "y", 78) || 0;
  var s1 = 19 / 9; // the chip's type is 9 units
  var hexLeft = tr.x + tr.w - 8;
  if (W.roomAgents && W.roomAgents.transfer) {
    W.roomAgents.transfer.forEach(function (h) {
      var hx = valAt(h.g, "x", 78);
      if (hx === null) hx = gsap.getProperty(h.g, "x");
      var hb = null;
      try {
        hb = h.g.getBBox();
      } catch (e) {}
      hexLeft = Math.min(hexLeft, hx + (hb ? hb.x : -17));
    });
  }
  var rightT = Math.min(tr.x + tr.w - 10, hexLeft - 14),
    topT = tr.y + 8;
  var x1 = rightT - oxy[0] - s1 * (cBox[0] + cBox[2] - oxy[0]),
    y1 = topT - oxy[1] - s1 * (cBox[1] - oxy[1]);
  FT(chip, { scale: s0, x: x0, y: y0, svgOrigin: cO }, { scale: s1, x: x1, y: y1, svgOrigin: cO, duration: tStill - tPull, ease: "power2.inOut" }, tPull);

  // ------------------------------------------------------------ 2. in the still 1:1 frame: Priora home, the case into the record
  var home = G.prioraHome;
  var tHome = tStill,
    durHome = 0.62;
  var legHome = "M" + pt(co.prioraEnd) + " C" + f(co.prioraEnd[0] - 30) + " " + f(co.prioraEnd[1] - 120) + " " + f(home[0] + 110) + " " + f(home[1]) + " " + pt(home);
  PK.travel(tl, W.priora.g, legHome, tHome, durHome, "power2.inOut");
  PK.trail(tl, W.L.trails, legHome, tHome, durHome, "power2.inOut");
  FT(W.priora.beadG, { rotation: co.beadEnd }, { rotation: 90, svgOrigin: "0 0", duration: durHome, ease: "power2.inOut" }, tHome);
  PK.sfx("move", tHome, { gain_db: -10, dur: durHome, pan: 0.1 });

  // the human's loop lets go of the decided case (the line rests at the branch point)
  if (co.loop) PK.drawOff(tl, co.loop, tStill, 0.42, "power2.inOut", { to: "start" });

  // the record: a second tick near the spine's right end, the same style as the first
  var ticks = W.record.ticks;
  var first = ticks.firstElementChild;
  var fb = null;
  try {
    fb = first ? first.getBBox() : null;
  } catch (e) {}
  var ry = G.record.y,
    th = fb && fb.height > 4 && fb.height < 40 ? fb.height / 2 : 9;
  var tickX = G.owner[0] + 24; // under the risk owner: the decision is on the record
  var tick2 = PK.el("path", { d: "M" + f(tickX) + " " + f(ry - th) + " V" + f(ry + th), fill: "none", stroke: C.rust, "stroke-width": (first && first.getAttribute("stroke-width")) || 2.6, "stroke-linecap": "round" }, ticks);
  gsap.set(tick2, { drawSVG: "50% 50%", opacity: 0 });
  var p0 = co.packetEnd;
  var legCase = "M" + pt(p0) + " C" + f(p0[0] + 40) + " " + f(p0[1] + 90) + " " + f(1254) + " " + f(ry - 120) + " " + f(1254) + " " + f(ry - 30) + " Q" + f(1252) + " " + f(ry) + " " + f(tickX) + " " + f(ry);
  var tCase = tStill,
    durCase = 0.58;
  PK.travel(tl, cs.g, legCase, tCase, durCase, "power2.inOut");
  PK.trail(tl, W.L.trails, legCase, tCase, durCase, "power2.inOut");
  FT(cs.body, { scale: co.packetScale || 1.4 }, { scale: 0.28, svgOrigin: "0 0", duration: durCase, ease: "power2.in" }, tCase);
  var tLand = tCase + durCase;
  FT(cs.g, { opacity: 1 }, { opacity: 0, duration: 0.12, ease: "none" }, tLand - 0.06);
  tl.set(tick2, { opacity: 1 }, tLand - 0.06);
  FT(tick2, { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.2, ease: "power2.out" }, tLand - 0.06);
  FT(tick2, { scale: 1.5, svgOrigin: f(tickX) + " " + f(ry) }, { scale: 1, svgOrigin: f(tickX) + " " + f(ry), duration: 0.4, ease: "power2.out" }, tLand - 0.06);
  PK.sfx("move", tCase, { gain_db: -12, dur: durCase, pan: 0.25, size: "case" });
  PK.sfx("record", tLand, { gain_db: -5, pan: 0.25 });

  // the Insurer conditions token returns upright to its aligned place
  var insP = G.slot(G.agents.insurer.aligned);
  FT(A.insurer.g, { x: insP[0], y: insP[1] - 8 }, { x: insP[0], y: insP[1], duration: 0.6, ease: "power2.inOut" }, tStill);
  FT(A.insurer.body, { rotation: 12, svgOrigin: "0 0" }, { rotation: 0, svgOrigin: "0 0", duration: 0.6, ease: "power2.inOut" }, tStill);
  PK.sfx("align", tStill + 0.45, { gain_db: -16, pan: -0.5, size: "small" });

  // the route retracts into the panel door (it no longer starts from an empty table)
  var rl = W.route.getTotalLength(),
    dDoor = 0;
  for (var sL = 0; sL < rl; sL += 1) {
    if (W.route.getPointAtLength(sL).x >= G.panel.x + G.panel.w) {
      dDoor = sL;
      break;
    }
  }
  FT(W.route, { drawSVG: "0% 100%" }, { drawSVG: f((dDoor / rl) * 100) + "% 100%", duration: 0.6, ease: "power2.inOut" }, tStill);

  // ------------------------------------------------------------ 3. text, staggered (nothing new after the tagline's second line)
  var LS = 20;
  function label(str, x, y, at, o) {
    o = o || {};
    var t = PK.text(W.L.top, str, x, y, { font: "mono", size: o.size || LS, fill: o.fill || C.ink, anchor: "middle" });
    gsap.set(t, { opacity: 0 });
    FT(t, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, at);
    if (!o.silent) PK.sfx("title", at, { gain_db: -16, pan: (x - 960) / 960 });
    return t;
  }
  var P = G.panel,
    RR = G.rooms;
  var rx = RR.retain.x + RR.retain.w / 2;
  label("One Priora agent", home[0], home[1] - 26 - 22, 84.6);
  label("A configurable site panel", P.x + P.w / 2, P.y - 22, 84.9);
  label("Three decision rooms", rx, RR.retain.y - 50, 85.2);
  label("Design proposal", rx, RR.retain.y - 22, 85.2, { fill: C.ink2, silent: true });

  // FIRST HOT WORK, then the LATER row: the row labels sit in the margin, the tabs inside the panel width
  var TS = 18,
    TR = 0.02,
    pad = 6,
    tabH = 28,
    gapX = 5;
  var tabsG = PK.g(W.L.top);
  var y1 = P.y + P.h + 34,
    y2 = y1 + tabH + 10;
  var tx0 = P.x;
  function rowLabel(str, y, fill) {
    return PK.text(tabsG, str, P.x - 12, y + TS * 0.36, { font: "mono", size: TS, fill: fill, track: TR, anchor: "end" });
  }
  function tab(str, x, y, solid) {
    var w = PK.measure(str.toUpperCase(), "mono500", TS, TR) + pad * 2;
    var g = PK.g(tabsG);
    PK.el("path", { d: PK.rectPath(x, y - tabH / 2, w, tabH, 4), class: solid ? "pk-hair" : "pk-ghost" }, g);
    PK.text(g, str, x + pad, y + TS * 0.36, { font: "mono", size: TS, fill: solid ? C.ink : C.grey, track: TR });
    return { g: g, w: w, x: x, y: y };
  }
  var lFirst = rowLabel("First", y1, C.rust);
  var tHot = tab("Hot work", tx0, y1, true);
  var lLater = rowLabel("Later", y2, C.grey);
  var later = [];
  var cx = tx0;
  ["Lifting", "Confined space", "Work at height"].forEach(function (s) {
    var t = tab(s, cx, y2, false);
    later.push(t);
    cx += t.w + gapX;
  });
  gsap.set([lFirst, tHot.g, lLater].concat(later.map(function (t) { return t.g; })), { opacity: 0 });
  var tTab1 = 85.4,
    tTab2 = 85.7;
  FT([lFirst, tHot.g], { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, tTab1);
  PK.sfx("print", tTab1, { gain_db: -14, pan: -0.6 });
  FT(lLater, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, tTab2);
  later.forEach(function (t, i) {
    FT(t.g, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, tTab2 + i * 0.08);
  });
  PK.sfx("print", tTab2, { gain_db: -18, pan: -0.55, material: "ghost" });

  // one dashed ghost token slides from the LIFTING tab into an empty panel slot and back
  var lift = later[0];
  var from = [lift.x + lift.w / 2, lift.y - tabH / 2 - 16];
  var slotA = 90; // between Evidence (54) and Risk engineering (126): an empty place on the ring
  var to = G.slot(slotA);
  var ghost = PK.g(W.L.tokens);
  var gst = { fill: "none", stroke: C.grey, "stroke-width": 1.6, "stroke-dasharray": "3.2 2.6", "stroke-linejoin": "round" };
  PK.el("path", Object.assign({ d: PK.rectPath(-13, -13, 26, 26, 5) }, gst), ghost);
  PK.el("path", Object.assign({ d: PK.rectPath(-6, -2, 12, 4, 1.5) }, gst, { "stroke-dasharray": "none", "stroke-width": 1.3 }), ghost);
  gsap.set(ghost, { x: from[0], y: from[1], opacity: 0 });
  var slotRing = PK.el("circle", { cx: f(to[0]), cy: f(to[1]), r: 21, fill: "none", stroke: C.hair, "stroke-width": 1.2, "stroke-dasharray": "2 3" }, W.L.tokens);
  gsap.set(slotRing, { opacity: 0 });
  var tG = tTab2 + 0.05;
  var gUp = PK.curve(from, to, 30),
    gDown = PK.curve(to, from, 30);
  FT(ghost, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none" }, tG);
  FT(slotRing, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "none" }, tG);
  PK.travel(tl, ghost, gUp, tG, 0.24, "power2.inOut");
  PK.travel(tl, ghost, gDown, tG + 0.32, 0.22, "power2.inOut");
  FT(ghost, { opacity: 1 }, { opacity: 0, duration: 0.1, ease: "none" }, tG + 0.5);
  FT(slotRing, { opacity: 1 }, { opacity: 0, duration: 0.2, ease: "none" }, tG + 0.42);
  PK.sfx("summon", tG, { gain_db: -18, pan: -0.6, material: "ghost" });

  // ------------------------------------------------------------ 4. the tagline, keyed to its spoken words
  var tag = document.createElement("div");
  tag.className = "pk-statement";
  tag.style.top = "892px";
  tag.style.fontSize = "36px";
  tag.style.lineHeight = "1.3";
  var t1 = document.createElement("div");
  t1.textContent = "Priora turns physical work into explicit risk decisions";
  var t2 = document.createElement("div");
  t2.textContent = "while the work happens.";
  tag.appendChild(t1);
  tag.appendChild(t2);
  tag.style.opacity = "1";
  ctx.overlay.appendChild(tag);
  gsap.set([t1, t2], { opacity: 0 });
  var tL1 = PK.word("L14", "risk"),
    tL2 = PK.word("L14", "while");
  FT(t1, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, tL1 - 0.05);
  FT(t2, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, tL2 - 0.05);
  PK.sfx("title", tL1 - 0.05, { gain_db: -10 });

  // ------------------------------------------------------------ 5. the world fades to paper; the wordmark alone
  var world = document.getElementById("pk-world");
  FT(world, { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "power1.inOut" }, 88.0);
  FT(tag, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in" }, 88.5);

  var wmW = 440,
    wmH = (wmW * 758) / 2617;
  var wm = document.createElement("div");
  wm.style.position = "absolute";
  wm.style.left = f((1920 - wmW) / 2) + "px";
  wm.style.top = f((1080 - wmH) / 2) + "px";
  wm.style.width = wmW + "px";
  wm.style.height = f(wmH) + "px";
  wm.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2617.0 758.0" width="' + wmW + '" height="' + f(wmH) + '" aria-label="Priora"><g transform="translate(-82.0,746.0)"><path fill="#111111" d="' +
    "M82.0 0V-698H396.0Q444.0 -698 482.5 -682.5Q521.0 -667 548.0 -638.5Q575.0 -610 589.0 -570.0Q603.0 -530 603.0 -482Q603.0 -433 589.0 -393.5Q575.0 -354 548.0 -325.5Q521.0 -297 482.5 -281.5Q444.0 -266 396.0 -266H214.0V0ZM214.0 -380H384.0Q422.0 -380 444.0 -400.5Q466.0 -421 466.0 -459V-505Q466.0 -543 444.0 -563.0Q422.0 -583 384.0 -583H214.0Z " +
    "M690.0 0V-522H818.0V-414H823.0Q828.0 -435 838.5 -454.5Q849.0 -474 866.0 -489.0Q883.0 -504 906.5 -513.0Q930.0 -522 961.0 -522H989.0V-401H949.0Q884.0 -401 851.0 -382.0Q818.0 -363 818.0 -320V0Z " +
    "M1132.0 -598Q1092.0 -598 1074.5 -616.0Q1057.0 -634 1057.0 -662V-682Q1057.0 -710 1074.5 -728.0Q1092.0 -746 1132.0 -746Q1171.0 -746 1189.0 -728.0Q1207.0 -710 1207.0 -682V-662Q1207.0 -634 1189.0 -616.0Q1171.0 -598 1132.0 -598ZM1068.0 -522H1196.0V0H1068.0Z " +
    "M1536.0 12Q1480.0 12 1435.5 -7.0Q1391.0 -26 1359.5 -62.0Q1328.0 -98 1311.0 -148.5Q1294.0 -199 1294.0 -262Q1294.0 -325 1311.0 -375.0Q1328.0 -425 1359.5 -460.5Q1391.0 -496 1435.5 -515.0Q1480.0 -534 1536.0 -534Q1592.0 -534 1637.0 -515.0Q1682.0 -496 1713.5 -460.5Q1745.0 -425 1762.0 -375.0Q1779.0 -325 1779.0 -262Q1779.0 -199 1762.0 -148.5Q1745.0 -98 1713.5 -62.0Q1682.0 -26 1637.0 -7.0Q1592.0 12 1536.0 12ZM1536.0 -91Q1587.0 -91 1616.0 -122.0Q1645.0 -153 1645.0 -213V-310Q1645.0 -369 1616.0 -400.0Q1587.0 -431 1536.0 -431Q1486.0 -431 1457.0 -400.0Q1428.0 -369 1428.0 -310V-213Q1428.0 -153 1457.0 -122.0Q1486.0 -91 1536.0 -91Z " +
    "M1877.0 0V-522H2005.0V-414H2010.0Q2015.0 -435 2025.5 -454.5Q2036.0 -474 2053.0 -489.0Q2070.0 -504 2093.5 -513.0Q2117.0 -522 2148.0 -522H2176.0V-401H2136.0Q2071.0 -401 2038.0 -382.0Q2005.0 -363 2005.0 -320V0Z " +
    "M2628.0 0Q2586.0 0 2561.5 -24.5Q2537.0 -49 2531.0 -90H2525.0Q2512.0 -39 2472.0 -13.5Q2432.0 12 2373.0 12Q2293.0 12 2250.0 -30.0Q2207.0 -72 2207.0 -142Q2207.0 -223 2265.0 -262.5Q2323.0 -302 2430.0 -302H2519.0V-340Q2519.0 -384 2496.0 -408.0Q2473.0 -432 2422.0 -432Q2377.0 -432 2349.5 -412.5Q2322.0 -393 2303.0 -366L2227.0 -434Q2256.0 -479 2304.0 -506.5Q2352.0 -534 2431.0 -534Q2537.0 -534 2592.0 -486.0Q2647.0 -438 2647.0 -348V-102H2699.0V0ZM2416.0 -81Q2459.0 -81 2489.0 -100.0Q2519.0 -119 2519.0 -156V-225H2437.0Q2337.0 -225 2337.0 -161V-144Q2337.0 -112 2357.5 -96.5Q2378.0 -81 2416.0 -81Z" +
    '"/></g></svg>';
  ctx.overlay.appendChild(wm);
  gsap.set(wm, { opacity: 0 });
  FT(wm, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out" }, 88.75);
  PK.sfx("wordmark", 88.75, { gain_db: -6 });
});
