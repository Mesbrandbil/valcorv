/*
  s8-system (84 to 90 s): the complete system.
  The camera pulls back to the whole sheet (82.8 to 84.6). Priora flies home above the
  real world; the decided case drops into the record and settles as a second tick; the
  Insurer conditions token returns upright; the risk owner's line rests. Three mono labels
  name the mechanism: ONE PRIORA AGENT, A CONFIGURABLE SITE PANEL, THREE DECISION ROOMS.
  Under the panel, the first use case (HOT WORK) and the later ones, dashed: the panel's
  agents briefly turn to ghost outlines and back, as if configured for another activity.
  DESIGN PROPOSAL, small, bottom left. The tagline in two lines. Then the world fades to
  paper and the Priora wordmark, ink, still, holds to the end.

  Reads W.coop from s7 (same builder). Everything persistent it animates was set to the
  78.0 contract in s7.
*/
PK.section("s8-system", 84, 90, function (tl, W, ctx, S) {
  var G = PK.GEO,
    C = PK.C,
    f = PK.fmt;
  var cs = W.caseT;
  var A = W.agents;
  var KEYS = ["siteRules", "insurer", "fire", "riskEng", "evidence"];
  var co = W.coop || { packetEnd: [1214, 388], prioraEnd: [1244, 302], beadEnd: 90, loop: null };
  function pt(p) {
    return f(p[0]) + " " + f(p[1]);
  }

  // ------------------------------------------------------------ 1. Priora flies home; the decided case drops into the record
  var home = G.prioraHome;
  var tHome = 83.24,
    durHome = 1.5;
  var legHome = "M" + pt(co.prioraEnd) + " C" + f(co.prioraEnd[0] - 60) + " " + f(co.prioraEnd[1] - 90) + " " + f(home[0] + 150) + " " + f(home[1] - 10) + " " + pt(home);
  PK.travel(tl, W.priora.g, legHome, tHome, durHome, "power2.inOut");
  PK.trail(tl, W.L.trails, legHome, tHome, durHome);
  tl.fromTo(W.priora.beadG, { rotation: co.beadEnd }, { rotation: 90, svgOrigin: "0 0", duration: 0.9, ease: "power2.inOut", immediateRender: false }, tHome + durHome - 0.7);
  PK.sfx("move", tHome, { gain_db: -10, dur: durHome, pan: 0.1 });
  PK.sfx("arrive", tHome + durHome, { gain_db: -12, pan: 0 });

  // the black loop lets go (the line rests at the branch point, the trunk stays)
  if (co.loop) PK.drawOff(tl, co.loop, 83.22, 0.7, "power2.inOut", { to: "start" });

  // the record: the second tick sits beside the first
  var ticks = W.record.ticks;
  var first = ticks.lastElementChild;
  var fb = null;
  try {
    fb = first ? first.getBBox() : null;
  } catch (e) {}
  var fx = fb ? fb.x + fb.width / 2 : G.record.x0 + 12;
  var tickX = fx + 26,
    ry = G.record.y;
  var tick2 = PK.el("path", { d: "M" + f(tickX) + " " + f(ry - 7) + " V" + f(ry + 7), class: "pk-thread" }, ticks);
  gsap.set(tick2, { drawSVG: "50% 50%", opacity: 0 });

  var p0 = co.packetEnd;
  var legCase =
    "M" + pt(p0) +
    " C" + f(p0[0] + 40) + " " + f(p0[1] + 150) + " " + f(1262) + " " + f(ry - 150) + " " + f(1250) + " " + f(ry - 30) +
    " C" + f(1240) + " " + f(ry) + " " + f(1200) + " " + f(ry) + " " + f(1160) + " " + f(ry) +
    " L" + f(tickX) + " " + f(ry);
  var tCase = 83.3,
    durCase = 1.6;
  PK.travel(tl, cs.g, legCase, tCase, durCase, "power2.inOut");
  PK.trail(tl, W.L.trails, legCase, tCase, durCase);
  tl.fromTo(cs.body, { scale: 1, svgOrigin: "0 0" }, { scale: 0.32, svgOrigin: "0 0", duration: durCase, ease: "power2.inOut", immediateRender: false }, tCase);
  var tLand = tCase + durCase;
  tl.fromTo(cs.g, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "power1.in", immediateRender: false }, tLand - 0.08);
  tl.set(tick2, { opacity: 1 }, tLand - 0.06);
  tl.fromTo(tick2, { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.3, ease: "power2.out", immediateRender: false }, tLand - 0.06);
  PK.sfx("move", tCase, { gain_db: -12, dur: durCase, pan: 0.2, size: "case" });
  PK.sfx("record", tLand, { gain_db: -6, pan: -0.25 });

  // the Insurer conditions token returns upright to its aligned place
  var insP = G.slot(G.agents.insurer.aligned);
  var tUp = 84.2;
  tl.fromTo(A.insurer.g, { x: insP[0], y: insP[1] - 8 }, { x: insP[0], y: insP[1], duration: 0.8, ease: "power2.inOut", immediateRender: false }, tUp);
  tl.fromTo(A.insurer.body, { rotation: 12, svgOrigin: "0 0" }, { rotation: 0, svgOrigin: "0 0", duration: 0.8, ease: "power2.inOut", immediateRender: false }, tUp);
  PK.sfx("align", tUp + 0.6, { gain_db: -16, pan: -0.5, size: "small" });

  // ------------------------------------------------------------ 2. the three mono labels at 1:1
  var LS = 20;
  function label(str, x, y, at, fill) {
    var t = PK.text(W.L.top, str, x, y, { font: "mono", size: LS, fill: fill || C.ink, anchor: "middle" });
    gsap.set(t, { opacity: 0 });
    tl.fromTo(t, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", immediateRender: false }, at);
    PK.sfx("title", at, { gain_db: -16, pan: (x - 960) / 960 });
    return t;
  }
  var P = G.panel,
    RR = G.rooms;
  var labels = [
    label("One Priora agent", home[0], home[1] - 26 - 22, 84.7),
    label("A configurable site panel", P.x + P.w / 2, P.y - 22, 85.1),
    label("Three decision rooms", RR.retain.x + RR.retain.w / 2, RR.retain.y - 22, 85.5),
  ];

  // ------------------------------------------------------------ 3. hot work first, other activities later
  var TS = 18,
    TR = 0.06,
    pad = 9,
    tabH = 28,
    gapX = 8;
  var tabsG = PK.g(W.L.top);
  var x0 = P.x,
    y1 = P.y + P.h + 26,
    y2 = y1 + tabH + 12;
  var lw = PK.measure("LATER", "mono500", TS, TR);
  var tx0 = x0 + lw + 16;
  function rowLabel(str, y, fill) {
    var t = PK.text(tabsG, str, x0, y + TS * 0.36, { font: "mono", size: TS, fill: fill, track: TR });
    return t;
  }
  function tab(str, x, y, solid) {
    var w = PK.measure(str.toUpperCase(), "mono500", TS, TR) + pad * 2;
    var g = PK.g(tabsG);
    PK.el("path", { d: PK.rectPath(x, y - tabH / 2, w, tabH, 4), class: solid ? "pk-hair" : "pk-ghost" }, g);
    PK.text(g, str, x + pad, y + TS * 0.36, { font: "mono", size: TS, fill: solid ? C.ink : C.grey, track: TR });
    return { g: g, w: w };
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
    tTab2 = 85.8;
  tl.fromTo([lFirst, tHot.g], { opacity: 0, y: -5 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", immediateRender: false }, tTab1);
  PK.sfx("print", tTab1, { gain_db: -14, pan: -0.6 });
  tl.fromTo(lLater, { opacity: 0, y: -5 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", immediateRender: false }, tTab2);
  later.forEach(function (t, i) {
    tl.fromTo(t.g, { opacity: 0, y: -5 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", immediateRender: false }, tTab2 + 0.1 + i * 0.1);
  });
  PK.sfx("print", tTab2 + 0.1, { gain_db: -18, pan: -0.55, material: "ghost" });

  // the panel's agents turn to ghost outlines and back: the panel can be configured for other work
  var tGhost = 86.05;
  var ghosts = PK.g(W.L.tokens);
  KEYS.forEach(function (k) {
    var p = G.slot(G.agents[k].aligned);
    PK.el("circle", { cx: f(p[0]), cy: f(p[1]), r: 18, class: "pk-ghost" }, ghosts);
  });
  gsap.set(ghosts, { opacity: 0 });
  var bodies = KEYS.map(function (k) {
    return A[k].body;
  });
  tl.fromTo(bodies, { opacity: 1 }, { opacity: 0.1, duration: 0.3, ease: "power2.inOut", immediateRender: false }, tGhost);
  tl.fromTo(ghosts, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.inOut", immediateRender: false }, tGhost);
  tl.fromTo(ghosts, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: "power2.inOut", immediateRender: false }, tGhost + 0.55);
  tl.fromTo(bodies, { opacity: 0.1 }, { opacity: 1, duration: 0.35, ease: "power2.inOut", immediateRender: false }, tGhost + 0.55);
  PK.sfx("summon", tGhost, { gain_db: -18, pan: -0.6, material: "ghost" });

  // a design proposal, said once
  var lDP = PK.text(W.L.top, "Design proposal", P.x, 1036, { font: "mono", size: 18, fill: C.grey });
  gsap.set(lDP, { opacity: 0 });
  tl.fromTo(lDP, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out", immediateRender: false }, 85.9);

  // ------------------------------------------------------------ 4. the tagline, two lines, under the system
  var tag = document.createElement("div");
  tag.className = "pk-statement";
  tag.style.top = "892px";
  tag.style.fontSize = "34px";
  tag.style.lineHeight = "1.32";
  var t1 = document.createElement("div");
  t1.textContent = "Priora turns physical work into explicit risk decisions";
  var t2 = document.createElement("div");
  t2.textContent = "while the work happens.";
  tag.appendChild(t1);
  tag.appendChild(t2);
  tag.style.opacity = "1";
  ctx.overlay.appendChild(tag);
  gsap.set([t1, t2], { opacity: 0 });
  tl.fromTo(t1, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", immediateRender: false }, 85.8);
  tl.fromTo(t2, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", immediateRender: false }, 86.25);
  PK.sfx("title", 85.8, { gain_db: -10 });

  // ------------------------------------------------------------ 5. the world fades to paper; the wordmark
  var world = document.getElementById("pk-world");
  tl.fromTo(world, { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "power1.inOut", immediateRender: false }, 88.2);
  tl.fromTo(tag, { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "power1.inOut", immediateRender: false }, 88.25);

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
  tl.fromTo(wm, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power1.inOut", immediateRender: false }, 88.4);
  PK.sfx("wordmark", 88.4, { gain_db: -6 });
});
