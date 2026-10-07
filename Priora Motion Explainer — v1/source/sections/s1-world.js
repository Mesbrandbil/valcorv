/*
  s1-world (0 to 8 s): the real world.
  Three black forms print onto one ground line: the site (on "middle"), the worker, the
  risk owner. "Real work in the middle." Then a rust orbit draws around them and small
  agent tokens ride it: "Agents around it." Priora prints first, alone, on "Priora", and the
  orbit grows out of it on "agents". At the end the specialists step out, the orbit withdraws
  and Priora flies up to listen; it arrives at GEO.prioraListen at 8.75 s (overhanging into
  s2 by design).
*/
PK.section("s1-world", 0, 8, function (tl, W, ctx) {
  var G = PK.GEO,
    C = PK.C,
    R = W.real;

  // ------------------------------------------------------------ ground and forms
  PK.drawOn(tl, R.ground, 0.3, 1.0, "power2.inOut", { from: "middle" });
  PK.sfx("thread", 0.3, { dur: 1.0, gain_db: -6, material: "pencil" });

  function print(form, at) {
    tl.fromTo(form.body, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, at);
    tl.fromTo(form.body, { scaleY: 0.0, svgOrigin: "0 0" }, { scaleY: 1, svgOrigin: "0 0", duration: 0.62, ease: "expo.out" }, at);
    tl.fromTo(form.body, { scaleX: 1.06, svgOrigin: "0 0" }, { scaleX: 1, svgOrigin: "0 0", duration: 0.5, ease: "power2.out" }, at + 0.12);
    PK.sfx("print", at, { gain_db: -7 });
  }
  var tSite = PK.word("L01", "middle") - 0.08;
  var tWorker = PK.word("L01", "worker") - 0.1;
  var tOwner = PK.word("L01", "risk") - 0.12;
  print(R.site, tSite);
  print(R.worker, tWorker);
  print(R.owner, tOwner);
  PK.show(tl, R.labels.site, PK.word("L01", "site") - 0.05, 0.4);
  PK.show(tl, R.labels.worker, tWorker + 0.2, 0.4);
  PK.show(tl, R.labels.owner, tOwner + 0.3, 0.4);

  // the real world's names stay about 19 px on screen in every shot: their size follows
  // each camera move (up to the final pull-out, where s8 takes them to the 1:1 size)
  var nameEls = [R.labels.worker, R.labels.site, R.labels.owner];
  var nameSize = 9;
  PK.cam.keys.moves.forEach(function (m) {
    if (m.t0 < 7.5 || m.t1 > 83.2) return;
    var size = Math.max(9, 19 / (PK.W / m.to[2]));
    tl.fromTo(nameEls, { fontSize: nameSize }, { fontSize: size, duration: m.t1 - m.t0, ease: m.ease, immediateRender: false }, m.t0);
    nameSize = size;
  });

  // ------------------------------------------------------------ the statement
  var l1 = document.createElement("div");
  l1.className = "pk-statement";
  l1.style.top = "150px";
  l1.textContent = "Real work in the middle.";
  var l2 = document.createElement("div");
  l2.className = "pk-statement";
  l2.style.top = "222px";
  l2.innerHTML = '<span class="rust">Agents around it.</span>';
  ctx.overlay.appendChild(l1);
  ctx.overlay.appendChild(l2);
  tl.fromTo(l1, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, PK.word("L01", "real") + 0.05);
  tl.fromTo(l2, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, PK.word("L02", "agents") - 0.1);
  tl.to([l1, l2], { opacity: 0, y: -8, duration: 0.3, ease: "power2.in" }, 7.6);
  PK.sfx("title", PK.word("L01", "real"), { gain_db: -8 });

  // ------------------------------------------------------------ Priora, then the orbit: agents around it
  // On "Priora" its own glyph prints alone on the orbit's line (with its ring and bead, named);
  // on "agents" the orbit grows out of it in both directions and the specialists appear as the
  // line reaches them. At 7.7 the specialists step outward and go, the orbit withdraws away
  // from Priora, and Priora leaves it and flies up to listen.
  var oc = [960, 700],
    rx = 342,
    ry = 132;
  // the full ellipse, clockwise from the left (over the top first): positions and riding
  var ell =
    "M" + (oc[0] - rx) + " " + oc[1] +
    " A" + rx + " " + ry + " 0 1 1 " + (oc[0] + rx) + " " + oc[1] +
    " A" + rx + " " + ry + " 0 1 1 " + (oc[0] - rx) + " " + oc[1];
  var rawEll = MotionPathPlugin.getRawPath(ell);
  var at = function (p) {
    p = ((p % 1) + 1) % 1;
    var q = MotionPathPlugin.getPositionOnPath(rawEll, p);
    return [q.x, q.y];
  };

  var pP = 0.38; // Priora's place on the orbit
  var rate = 0.02; // riding speed, orbit fractions per second
  var tP = PK.word("L02", "priora") + 0.02;
  var tGrow = PK.word("L02", "agents") - 0.27;
  var growDur = 0.8;
  var tLeave = 7.7; // the specialists step out
  var tFly = 7.95; // Priora leaves the orbit

  // Priora prints alone, small, with its ring and bead; its name under the statement's rule
  var P = W.priora;
  gsap.set(P.g, { x: at(pP)[0], y: at(pP)[1], opacity: 0 });
  tl.fromTo(P.g, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none", immediateRender: false }, tP);
  tl.fromTo(P.body, { scale: 0.2, svgOrigin: "0 0" }, { scale: 0.62, svgOrigin: "0 0", duration: 0.4, ease: "back.out(1.4)", immediateRender: false }, tP);
  if (P.orbit) tl.fromTo([P.orbit, P.beadG], { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out", immediateRender: false }, tP + 0.1);
  PK.sfx("arrive", tP + 0.03, { gain_db: -11, pan: 0.3, size: "agent" });
  var pLab = PK.text(W.L.labels, "Priora agent", 0, 0, { size: PK.cam.px(tP, 17), weight: 500, anchor: "middle", fill: C.ink });
  gsap.set(pLab, { x: at(pP)[0], y: at(pP)[1] - 30, opacity: 0 });
  tl.fromTo(pLab, { opacity: 0, y: at(pP)[1] - 26 }, { opacity: 1, y: at(pP)[1] - 30, duration: 0.35, ease: "power2.out", immediateRender: false }, tP + 0.15);
  // Priora rides from the moment the orbit grows; the name rides with it and goes before the flight
  var pFly = pP + rate * (tFly - tGrow);
  tl.fromTo(P.g, { motionPath: { path: ell, start: pP, end: pP } }, { motionPath: { path: ell, start: pP, end: pFly }, duration: tFly - tGrow, ease: "none", immediateRender: false }, tGrow);
  tl.to(pLab, { x: at(pFly)[0], y: at(pFly)[1] - 30, duration: tFly - tGrow - 0.4, ease: "none" }, tGrow);
  tl.to(pLab, { opacity: 0, duration: 0.3, ease: "power1.in" }, tFly - 0.4);

  // the orbit: two halves that start at Priora's place at tGrow and meet on the far side
  var pc = at(pP),
    pq = [2 * oc[0] - pc[0], 2 * oc[1] - pc[1]];
  var halfD = function (sweep) {
    return "M" + f2(pc[0]) + " " + f2(pc[1]) + " A" + rx + " " + ry + " 0 0 " + sweep + " " + f2(pq[0]) + " " + f2(pq[1]);
  };
  function f2(v) {
    return Math.round(v * 100) / 100;
  }
  var halves = [PK.el("path", { d: halfD(1), class: "pk-thread", opacity: 0.5 }, W.L.routes), PK.el("path", { d: halfD(0), class: "pk-thread", opacity: 0.5 }, W.L.routes)];
  tl.fromTo(halves, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: growDur, ease: "sine.inOut", immediateRender: true }, tGrow);
  PK.sfx("thread", tGrow, { dur: growDur, gain_db: -9 });
  // the time the growing line reaches a point d (fraction of the whole orbit) away from Priora
  function reach(d) {
    var prog = Math.min(1, d / 0.5);
    return tGrow + (growDur * Math.acos(1 - 2 * prog)) / Math.PI;
  }

  // five specialists, small; each appears as the orbit's line reaches it, rides, steps out at 7.7
  var holder = PK.g(W.L.tokens);
  var minis = [
    { make: PK.glyph.siteRules, p: 0.06 },
    { make: PK.glyph.insurer, p: 0.22 },
    { make: PK.glyph.fire, p: 0.55 },
    { make: PK.glyph.riskEng, p: 0.72 },
    { make: PK.glyph.evidence, p: 0.88 },
  ];
  minis.forEach(function (m, i) {
    var tok = m.make(holder);
    var d = Math.abs(m.p - pP);
    d = Math.min(d, 1 - d);
    var tIn = reach(d) - 0.04;
    var pEnd = m.p + rate * (tLeave + i * 0.06 - tIn);
    gsap.set(tok.g, { opacity: 0 });
    tl.fromTo(tok.g, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none", immediateRender: false }, tIn);
    tl.fromTo(tok.body, { scale: 0.2, svgOrigin: "0 0" }, { scale: 0.62, svgOrigin: "0 0", duration: 0.35, ease: "back.out(1.4)" }, tIn);
    tl.fromTo(tok.g, { motionPath: { path: ell, start: m.p, end: m.p } }, { motionPath: { path: ell, start: m.p, end: pEnd }, duration: tLeave + i * 0.06 - tIn, ease: "none", immediateRender: true }, tIn);
    PK.sfx("arrive", tIn + 0.05, { gain_db: -15, pan: (at(m.p)[0] - 960) / 400, size: "small" });
    // they step back off the orbit, outward, and go (they return later, summoned)
    var q = at(pEnd);
    var dx = q[0] - oc[0],
      dy = (q[1] - oc[1]) * (rx / ry);
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var out = PK.curve(q, [q[0] + (dx / len) * 34, q[1] + (dy / len) * 34 * (ry / rx)], 0);
    PK.travel(tl, tok.g, out, tLeave + i * 0.06, 0.45, "power2.in");
    tl.to(tok.g, { opacity: 0, duration: 0.4, ease: "power1.in" }, tLeave + 0.1 + i * 0.06);
  });

  // the orbit withdraws away from Priora's place (both halves shrink toward the far side)
  tl.to(halves, { drawSVG: "100% 100%", duration: 0.4, ease: "power2.in" }, 7.8);
  tl.to(halves, { opacity: 0, duration: 0.15, ease: "none" }, 8.05);

  // ------------------------------------------------------------ Priora leaves the orbit and flies up to listen
  var pStart = at(pFly);
  var listen = PK.GEO.prioraListen;
  var fly = PK.curve(pStart, listen, -90);
  var flyDur = 0.8;
  PK.travel(tl, P.g, fly, tFly, flyDur, "power2.inOut");
  PK.trail(tl, W.L.trails, fly, tFly, flyDur, "power2.inOut");
  tl.fromTo(P.body, { scale: 0.62 }, { scale: 1, svgOrigin: "0 0", duration: flyDur - 0.05, ease: "power2.inOut", immediateRender: false }, tFly + 0.05);
  PK.sfx("move", tFly, { dur: flyDur, gain_db: -10 });
});
