/*
  s8-system (84 to 90 s): the complete system. (cut 3b)

  The camera pulls back to the whole sheet (83.3 to 84.5). While it does, everything that is
  not read at 1:1 fades (the owner's list of choices, the rooms' DESIGN PROPOSAL tags, the inner
  "Site panel" title, any agent names still on), the Thermal check shelf slot fills again, and
  what is read at 1:1 grows to stay legible (room names; WORKER / SITE / RISK OWNER from their
  counter-scaled size, with DECIDES riding after RISK OWNER until it fades, 84.2 to 84.5; the
  single SIMULATED chip). In the still 1:1 frame, staggered: the loop unwinds and the decided
  case drops into the record as a second tick, on a path clear of the RISK OWNER label (84.5 to
  84.85); Priora flies home (84.6 to 85.1); THE COMPLETE SYSTEM IS A DESIGN PROPOSAL (85.0) and
  ONE PRIORA AGENT (85.1), with two thin rust threads from its bead to the panel door and to the
  rooms' branch point; A CONFIGURABLE SITE PANEL (85.3), THREE DECISION ROOMS (85.5), FIRST HOT
  WORK (85.55), POSSIBLY LATER: OTHER INSURED ACTIVITIES (85.6), from which a dashed ghost token
  goes up the panel's outer wall, in at its door and into an empty seat, where it stays. Tagline
  line one on "risk" (only the drawing dims, the headings stay), line two on "while"; the world
  fades out 88.25 to 88.6, the tagline 88.3 to 88.8, and the wordmark comes in at the optical
  centre (88.55 to 88.85) and holds still to 90.

  Reads W.coop from s7 (same builder).
*/
PK.section("s8-system", 84, 90, function (tl, W, ctx, S) {
  var G = PK.GEO,
    C = PK.C,
    f = PK.fmt;
  var cs = W.caseT;
  var A = W.agents;
  var KEYS = ["siteRules", "insurer", "fire", "riskEng", "evidence"];
  var co = W.coop || { packetEnd: G.dock || [1228, 680], prioraEnd: [1236, 565], beadEnd: 90, packetScale: 1, shelf: null };
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
      var v = tw.vars,
        val = v[prop];
      if (val === undefined && v.keyframes && v.keyframes.length) {
        for (var i = v.keyframes.length - 1; i >= 0; i--) if (v.keyframes[i][prop] !== undefined) {
          val = v.keyframes[i][prop];
          break;
        }
      }
      if (val !== undefined && val !== null) {
        best = val;
        bestEnd = end;
      }
    });
    return best;
  }
  function fadeFromCurrent(el, at, dur) {
    if (!el) return;
    var o = valAt(el, "opacity", at);
    if (o === null) o = parseFloat(gsap.getProperty(el, "opacity"));
    if (!(o > 0)) return; // already hidden
    FT(el, { opacity: o }, { opacity: 0, duration: dur || 0.4, ease: "power1.in" }, at);
  }
  // unhinted glyph metrics, so text widths do not depend on the camera's scale history (see s7)
  function crisp(el) {
    el.style.textRendering = "geometricPrecision";
    return el;
  }
  var tPull = 83.3,
    tStill = 84.5;

  // ------------------------------------------------------------ 1. the pull-out: fade what is not read at 1:1, grow what is
  function fontSize(el) {
    var m = /font-size:\s*([\d.]+)px/.exec(el.getAttribute("style") || "");
    return m ? parseFloat(m[1]) : 15;
  }
  // the size a property tween leaves on an element at time t, as GSAP renders it (px values are
  // rounded to whole pixels unless the tween says autoRound: false)
  function sizeAt(el, t) {
    var best = null,
      bestEnd = -1;
    tl.getTweensOf(el).forEach(function (tw) {
      var end = tw.startTime() + tw.duration();
      if (end > t + 1e-6 || end < bestEnd || tw.vars.fontSize === undefined) return;
      var v = parseFloat(tw.vars.fontSize);
      best = tw.vars.autoRound === false ? v : Math.round(v);
      bestEnd = end;
    });
    return best === null ? fontSize(el) : best;
  }
  // the owner's choices have been read; they go as the camera pulls back
  if (co.list) FT(co.list, { opacity: 1 }, { opacity: 0, duration: 0.28, ease: "power1.in" }, tPull + 0.02);
  if (W.roomTags) {
    for (var rk in W.roomTags) fadeFromCurrent(W.roomTags[rk], tPull + 0.05, 0.35);
  }
  fadeFromCurrent(W.panel.title, tPull + 0.05, 0.35);
  fadeFromCurrent(W.panel.sub, tPull + 0.05, 0.35);
  KEYS.forEach(function (k) {
    fadeFromCurrent(A[k].label, tPull + 0.05, 0.35);
  });
  if (W.roomAgents) {
    ["retain", "mitigate", "transfer"].forEach(function (k) {
      (W.roomAgents[k] || []).forEach(function (a) {
        fadeFromCurrent(a.name, tPull + 0.05, 0.35);
        fadeFromCurrent(a.label, tPull + 0.05, 0.35);
      });
    });
  }
  // the Thermal check slot on the library shelf fills again (the library keeps its suggestion)
  if (co.shelf) FT(co.shelf, { opacity: 0.28 }, { opacity: 1, duration: 0.4, ease: "power1.inOut" }, tPull + 0.1);

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
  ["retain", "mitigate", "transfer"].forEach(function (k) {
    var n = W.rooms[k].name;
    grow(n, Math.max(1, 22 / fontSize(n)), tPull);
  });
  // WORKER / SITE / RISK OWNER are counter-scaled by s1 up to 83.2: continue from their current size
  var REAL = 18.5;
  ["worker", "site", "owner"].forEach(function (k) {
    tl.to(W.real.labels[k], { fontSize: REAL, autoRound: false, duration: tStill - tPull, ease: "power2.inOut" }, tPull);
  });
  // DECIDES rides after RISK OWNER as it grows (same timing and ease, so it stays one word space away), then goes
  var dc = co.decides;
  if (dc && dc.el) {
    var fsO = sizeAt(dc.label, tPull);
    FT(dc.el, { fontSize: fsO, attr: { x: dc.x + dc.k * fsO }, autoRound: false }, { fontSize: REAL, attr: { x: dc.x + dc.k * REAL }, autoRound: false, duration: tStill - tPull, ease: "power2.inOut" }, tPull);
    FT(dc.el, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in" }, 84.2);
  }
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

  // ------------------------------------------------------------ 2. still 1:1: the loop opens, the decided case drops into the record
  // (the line stays from the desk to the branch node the dotted branches leave from)
  if (co.arcTop) FT(co.arcTop, { drawSVG: "0% 100%" }, { drawSVG: "0% 0%", duration: 0.3, ease: "power2.inOut" }, tStill);
  var ticks = W.record.ticks;
  var first = ticks.firstElementChild;
  var fb = null;
  try {
    fb = first ? first.getBBox() : null;
  } catch (e) {}
  var ry = G.record.y,
    th = fb && fb.height > 4 && fb.height < 40 ? fb.height / 2 : 9;
  var tickX = 1200; // under the right end of RISK OWNER: the decision is on the record
  var tick2 = PK.el("path", { d: "M" + f(tickX) + " " + f(ry - th) + " V" + f(ry + th), fill: "none", stroke: C.rust, "stroke-width": (first && first.getAttribute("stroke-width")) || 2.6, "stroke-linecap": "round" }, ticks);
  gsap.set(tick2, { drawSVG: "50% 50%", opacity: 0 });
  var p0 = co.packetEnd;
  // about 30 units right of the RISK OWNER label at its 1:1 size, then onto the record
  var oLab = W.real.labels.owner;
  var labRight = G.owner[0] + 66;
  try {
    labRight = parseFloat(oLab.getAttribute("x")) + (oLab.getComputedTextLength() / fontSize(oLab)) * REAL * 0.5;
  } catch (e) {}
  // (the shrinking case's own radius, about 16 units as it passes the label, is added to the 30)
  var xDown = labRight + 30 + 16;
  var legCase = "M" + pt(p0) + " C" + f(p0[0] + 20) + " " + f(p0[1] + 30) + " " + f(xDown) + " " + f(ry - 100) + " " + f(xDown) + " " + f(ry - 36) +
    " C" + f(xDown) + " " + f(ry - 10) + " " + f(tickX + 26) + " " + f(ry) + " " + f(tickX) + " " + f(ry);
  var tCase = tStill,
    durCase = 0.35;
  PK.travel(tl, cs.g, legCase, tCase, durCase, "power2.inOut");
  PK.trail(tl, W.L.trails, legCase, tCase, durCase, "power2.inOut");
  FT(cs.body, { scale: co.packetScale || 1 }, { scale: 0.32, svgOrigin: "0 0", duration: durCase, ease: "power2.out" }, tCase);
  var tLand = tCase + durCase; // 84.85
  FT(cs.g, { opacity: 1 }, { opacity: 0, duration: 0.1, ease: "none" }, tLand - 0.05);
  tl.set(tick2, { opacity: 1 }, tLand - 0.05);
  FT(tick2, { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.18, ease: "power2.out" }, tLand - 0.05);
  FT(tick2, { scale: 1.5, svgOrigin: f(tickX) + " " + f(ry) }, { scale: 1, svgOrigin: f(tickX) + " " + f(ry), duration: 0.35, ease: "power3.out" }, tLand - 0.05);
  PK.sfx("record", tLand, { gain_db: -6, pan: 0.25 });

  // the Insurer conditions token returns upright to its aligned place
  var insP = G.slot(G.agents.insurer.aligned);
  FT(A.insurer.g, { x: insP[0], y: insP[1] - 8 }, { x: insP[0], y: insP[1], duration: 0.5, ease: "power2.inOut" }, tStill + 0.1);
  FT(A.insurer.body, { rotation: 12, svgOrigin: "0 0" }, { rotation: 0, svgOrigin: "0 0", duration: 0.5, ease: "power2.inOut" }, tStill + 0.1);

  // Priora flies home
  var home = G.prioraHome;
  var tHome = 84.6,
    durHome = 0.5;
  var legHome = "M" + pt(co.prioraEnd) + " C" + f(co.prioraEnd[0] - 40) + " " + f(co.prioraEnd[1] - 150) + " " + f(home[0] + 120) + " " + f(home[1]) + " " + pt(home);
  PK.travel(tl, W.priora.g, legHome, tHome, durHome, "power2.inOut");
  PK.trail(tl, W.L.trails, legHome, tHome, durHome, "power2.inOut");
  FT(W.priora.beadG, { rotation: co.beadEnd }, { rotation: 90, svgOrigin: "0 0", duration: durHome, ease: "power2.inOut" }, tHome);
  var tHomeIn = tHome + durHome; // 85.1
  PK.sfx("arrive", tHomeIn, { gain_db: -12, pan: 0 });

  // ------------------------------------------------------------ 3. one mechanism: headings, staggered, all before the tagline
  var LS = 20;
  function label(str, x, y, at, o) {
    o = o || {};
    var t = crisp(PK.text(W.L.top, str, x, y, { font: "mono", size: o.size || LS, fill: o.fill || C.ink, anchor: o.anchor || "middle" }));
    gsap.set(t, { opacity: 0 });
    FT(t, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, at);
    return t;
  }
  var P = G.panel,
    RR = G.rooms;
  var yAgent = home[1] - 26 - 22; // ONE PRIORA AGENT, above Priora's orbit
  // the maturity of the whole system, said once, centred at the top (50 px or more above ONE PRIORA AGENT)
  label("The complete system is a design proposal", 960, yAgent - LS * 0.72 - 50, tHomeIn - 0.1, { fill: C.ink2 });
  label("One Priora agent", home[0], yAgent, tHomeIn);
  PK.sfx("title", tHomeIn, { gain_db: -16, pan: 0 });
  // two thin rust threads from Priora's bead: to the panel door and to the rooms' branch point
  var bead = [home[0], home[1] + 26];
  var BRP = co.branchPoint || G.branch || [1276, 600];
  var doorP = [P.x + P.w + 4, P.doorY];
  var thrA = PK.el("path", { d: PK.curve(bead, doorP, -90), fill: "none", stroke: C.rust, "stroke-width": 1, "stroke-opacity": 0.4, "stroke-linecap": "round" }, W.L.threads);
  var thrB = PK.el("path", { d: PK.curve(bead, BRP, 90), fill: "none", stroke: C.rust, "stroke-width": 1, "stroke-opacity": 0.4, "stroke-linecap": "round" }, W.L.threads);
  gsap.set([thrA, thrB], { drawSVG: "0% 0%" });
  PK.drawOn(tl, thrA, tHomeIn + 0.02, 0.4, "power2.out", { later: true });
  PK.drawOn(tl, thrB, tHomeIn + 0.02, 0.4, "power2.out", { later: true });
  label("A configurable site panel", P.x + P.w / 2, P.y - 22, 85.3);
  label("Three decision rooms", RR.retain.x + RR.retain.w / 2, RR.retain.y - 22, 85.5);

  // hot work first; other insured activities possibly later
  var TS = 18,
    TR = 0.04,
    pad = 7,
    tabH = 28;
  var y1 = P.y + P.h + 34,
    y2 = y1 + tabH + 10;
  var rowG = PK.g(W.L.top);
  var lFirst = crisp(PK.text(rowG, "First", P.x, y1 + TS * 0.36, { font: "mono", size: TS, fill: C.ink2, track: TR }));
  var tabX = P.x + PK.measure("FIRST", "mono500", TS, TR) + 14;
  var hotW = PK.measure("HOT WORK", "mono500", TS, TR) + pad * 2;
  var hot = PK.g(rowG);
  PK.el("path", { d: PK.rectPath(tabX, y1 - tabH / 2, hotW, tabH, 4), class: "pk-hair" }, hot);
  crisp(PK.text(hot, "Hot work", tabX + pad, y1 + TS * 0.36, { font: "mono", size: TS, fill: C.ink, track: TR }));
  var laterStr = "Possibly later: other insured activities";
  var laterW = PK.measure(laterStr.toUpperCase(), "mono500", TS, TR);
  var later = PK.g(rowG);
  crisp(PK.text(later, laterStr, P.x, y2 + TS * 0.36, { font: "mono", size: TS, fill: C.ink2, track: TR }));
  PK.el("path", { d: "M" + f(P.x) + " " + f(y2 + TS * 0.36 + 5) + " H" + f(P.x + laterW), fill: "none", stroke: C.ink2, "stroke-width": 1, "stroke-dasharray": "3 3" }, later);
  gsap.set([lFirst, hot, later], { opacity: 0 });
  var tFirst = 85.55,
    tLater = 85.6;
  FT([lFirst, hot], { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, tFirst);
  FT(later, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, tLater);
  PK.sfx("print", tFirst, { gain_db: -16, pan: -0.6 });
  // a dashed ghost token (full token size) leaves that line, goes up the panel's outer right wall, in at its
  // door and into an empty seat on the ring (through the door, never over a wall), and stays there
  var seat = G.slot(90); // between Evidence check (54) and Risk engineering (126)
  var gx = P.x + P.w + 28, // outside the right wall
    dY = P.doorY;
  var gFrom = [Math.min(P.x + laterW + 22, P.x + P.w + 2), y2];
  var gPath =
    "M" + pt(gFrom) + " C" + f(gx - 8) + " " + f(y2) + " " + f(gx) + " " + f(y2 - 12) + " " + f(gx) + " " + f(y2 - 32) +
    " L" + f(gx) + " " + f(dY + 40) + " C" + f(gx) + " " + f(dY + 14) + " " + f(gx - 10) + " " + f(dY) + " " + f(P.x + P.w) + " " + f(dY) +
    " L" + f(P.x + P.w - 54) + " " + f(dY) + " C" + f(P.x + P.w - 140) + " " + f(dY) + " " + f(seat[0] + 10) + " " + f(seat[1] - 90) + " " + pt(seat);
  var ghost = PK.g(W.L.top);
  var gs = { fill: C.paper, stroke: C.rust, "stroke-width": 2.25, "stroke-dasharray": "5 3.5", "stroke-linejoin": "round" };
  PK.el("path", Object.assign({ d: PK.rectPath(-13, -13, 26, 26, 5) }, gs), ghost);
  PK.el("path", Object.assign({ d: PK.circlePath(0, 0, 4.4) }, gs, { "stroke-dasharray": "2.4 2" }), ghost);
  gsap.set(ghost, { x: gFrom[0], y: gFrom[1], opacity: 0 });
  var tG = tLater;
  FT(ghost, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none" }, tG);
  PK.travel(tl, ghost, gPath, tG, 0.55, "power2.inOut");

  // ------------------------------------------------------------ 4. the tagline, keyed to its spoken words; the world dims so it reads
  var tag = document.createElement("div");
  tag.className = "pk-statement";
  tag.style.top = "884px";
  tag.style.fontSize = "48px";
  tag.style.lineHeight = "1.2";
  var t1 = document.createElement("div");
  t1.textContent = "Priora turns physical work into explicit risk decisions,";
  var t2 = document.createElement("div");
  t2.textContent = "while the work happens.";
  tag.appendChild(t1);
  tag.appendChild(t2);
  tag.style.opacity = "1";
  ctx.overlay.appendChild(tag);
  gsap.set([t1, t2], { opacity: 0 });
  var tL1 = PK.word("L14", "risk"),
    tL2 = PK.word("L14", "while");
  FT(t1, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, tL1 - 0.04);
  FT(t2, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, tL2 - 0.04);
  // only the drawing dims; the headings, the later line and the ghost (the top layer) stay as they are
  var drawing = ["trails", "routes", "chambers", "real", "threads", "tokens", "case", "priora", "labels"]
    .map(function (n) {
      return W.L[n];
    })
    .filter(Boolean);
  FT(drawing, { opacity: 1 }, { opacity: 0.55, duration: 0.45, ease: "power2.inOut" }, tL1 - 0.04);
  PK.sfx("title", tL1 - 0.04, { gain_db: -10 });

  // ------------------------------------------------------------ 5. the end: the world goes, the tagline follows, the wordmark comes in alone
  var world = document.getElementById("pk-world");
  FT(world, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: "power2.inOut" }, 88.25);
  FT(tag, { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "power2.inOut" }, 88.3);
  var wmW = 440,
    wmH = (wmW * 758) / 2617;
  var wm = document.createElement("div");
  wm.style.position = "absolute";
  wm.style.left = f((1920 - wmW) / 2) + "px";
  wm.style.top = f(520 - wmH / 2) + "px"; // the optical centre, a little above the geometric one
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
  FT(wm, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.inOut" }, 88.55);
  PK.sfx("wordmark", 88.55, { gain_db: -6 });
});
