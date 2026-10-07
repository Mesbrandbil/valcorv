/*
  s1-world (0 to 8 s): the real world.
  Three black forms print onto one ground line: the site (on "middle"), the worker, the
  risk owner. "Real work in the middle." Then a rust orbit draws around them and small
  agent tokens ride it: "Agents around it." The Priora token leaves the orbit at the
  end and flies up to listen; it arrives at GEO.prioraListen at 8.6 s (overhanging into
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
    PK.sfx("print", at, { gain_db: -3 });
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
  tl.to([l1, l2], { opacity: 0, y: -8, duration: 0.45, ease: "power2.in" }, 7.6);
  PK.sfx("title", PK.word("L01", "real"), { gain_db: -8 });

  // ------------------------------------------------------------ the orbit: agents around it
  var oc = [960, 700],
    rx = 342,
    ry = 132;
  // ellipse as a path starting at the left (180 deg), running clockwise (over the top first)
  var ell =
    "M" + (oc[0] - rx) + " " + oc[1] +
    " A" + rx + " " + ry + " 0 1 1 " + (oc[0] + rx) + " " + oc[1] +
    " A" + rx + " " + ry + " 0 1 1 " + (oc[0] - rx) + " " + oc[1];
  var orbit = PK.el("path", { d: ell, class: "pk-thread", opacity: 0.5 }, W.L.routes);
  var tOrbit = PK.word("L02", "agents") - 0.25;
  PK.drawOn(tl, orbit, tOrbit, 0.7, "power2.inOut");
  PK.sfx("thread", tOrbit, { dur: 0.7, gain_db: -9 });

  // six tokens ride the orbit: Priora plus one of each specialist, small. They are all in
  // place by about 7.0 and the full picture holds (riding slowly) until 7.6.
  var holder = PK.g(W.L.tokens);
  var minis = [
    { make: PK.glyph.siteRules, p: 0.06 },
    { make: PK.glyph.insurer, p: 0.22 },
    { make: null, p: 0.38 }, // the Priora agent itself
    { make: PK.glyph.fire, p: 0.55 },
    { make: PK.glyph.riskEng, p: 0.72 },
    { make: PK.glyph.evidence, p: 0.88 },
  ];
  var tLeave = 7.6;
  var drift = 0.035; // how far along the orbit they ride before they leave
  var rawEll = MotionPathPlugin.getRawPath(ell);
  minis.forEach(function (m, i) {
    var tok = m.make ? m.make(holder) : W.priora;
    var s = 0.62;
    var tIn = tOrbit + 0.04 + m.p * 0.6;
    gsap.set(tok.g, { opacity: 0 });
    tl.fromTo(tok.g, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none", immediateRender: false }, tIn);
    tl.fromTo(tok.body, { scale: 0.2, svgOrigin: "0 0" }, { scale: s, svgOrigin: "0 0", duration: 0.35, ease: "back.out(1.4)" }, tIn);
    tl.fromTo(
      tok.g,
      { motionPath: { path: ell, start: m.p, end: m.p } },
      { motionPath: { path: ell, start: m.p, end: m.p + drift }, duration: tLeave - tIn, ease: "none", immediateRender: true },
      tIn,
    );
    PK.sfx("arrive", tIn, { gain_db: -14, pan: (i - 2.5) / 3, size: "small" });
    if (m.make) {
      // the specialists step back off the orbit, outward, and go (they return later, summoned)
      var p = MotionPathPlugin.getPositionOnPath(rawEll, m.p + drift);
      var dx = p.x - oc[0],
        dy = (p.y - oc[1]) * (rx / ry);
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var out = PK.curve([p.x, p.y], [p.x + (dx / len) * 70, p.y + (dy / len) * 70 * (ry / rx)], 0);
      PK.travel(tl, tok.g, out, tLeave + i * 0.03, 0.45, "power2.in");
      tl.to(tok.g, { opacity: 0, duration: 0.4, ease: "power1.in" }, tLeave + 0.05 + i * 0.03);
    }
  });
  if (W.priora.orbit) gsap.set([W.priora.orbit, W.priora.beadG], { opacity: 0 });
  tl.to(orbit, { opacity: 0, duration: 0.5, ease: "power1.in" }, tLeave);

  // ------------------------------------------------------------ Priora leaves the orbit and flies up to listen
  var pStart = MotionPathPlugin.getPositionOnPath(rawEll, 0.38 + drift);
  var listen = PK.GEO.prioraListen;
  var fly = PK.curve([pStart.x, pStart.y], listen, -90);
  PK.travel(tl, W.priora.g, fly, tLeave, 1.0, "power2.inOut");
  PK.trail(tl, W.L.trails, fly, tLeave, 1.0, "power2.inOut");
  tl.fromTo(W.priora.body, { scale: 0.62 }, { scale: 1, svgOrigin: "0 0", duration: 0.95, ease: "power2.inOut", immediateRender: false }, tLeave + 0.05);
  tl.fromTo([W.priora.orbit, W.priora.beadG], { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out", immediateRender: false }, tLeave + 0.6);
  PK.sfx("move", tLeave, { dur: 1.0, gain_db: -10 });
});
