/*
  s2-case (8 to 22 s): everyday language becomes a case.
  The worker sends a voice note; the words appear as they are spoken, in ink (a
  person's words). Priora listens and quietly underlines what matters in rust. Then the
  sentence separates: the ordinary words fall away, the meaningful ones fly to a new
  ring and become its facets: repair, hot work, the packing line, before the night
  shift. The site's own conditions flow up from the building. The photo is missing:
  Priora asks, the worker sends one, the facet fills. The case folds, ready to travel.

  Contract at 22.0 (for s3): Priora at (1150, 400), scale 1, bead at 180 deg, label hidden;
  case at (1000, 410), all facets folded and visible, photo filled, W.caseLabel ("Case")
  visible; transcript, waveform, threads and question gone.
*/
PK.section("s2-case", 8, 22, function (tl, W, ctx) {
  var G = PK.GEO,
    C = PK.C;
  var cs = W.caseT;
  var V = PK.line("W01");
  var LS = 15.4; // transcript size (30 px at the shot's zoom)
  var FS = 10.2; // facet label size (20 px)

  // ------------------------------------------------------------ Priora is introduced and listens
  var listen = [1250, 380];
  PK.show(tl, W.priora.label, 9.45, 0.5);
  PK.hide(tl, W.priora.label, 12.7, 0.5);
  tl.fromTo(W.priora.beadG, { rotation: 0, svgOrigin: "0 0" }, { rotation: 150, svgOrigin: "0 0", duration: 0.7, ease: "power2.inOut", immediateRender: false }, 9.5);

  // ------------------------------------------------------------ the voice note
  var head = [G.worker[0] + 16, G.worker[1] - 116];
  var waveY = 600,
    waveX0 = 814;
  var wave = PK.g(W.L.real);
  var lead = PK.el("path", { d: "M" + head[0] + " " + head[1] + " L" + (waveX0 - 6) + " " + waveY, fill: "none", stroke: C.ink, "stroke-width": 1.2, "stroke-linecap": "round" }, wave);
  var dot = PK.el("circle", { cx: waveX0 - 6, cy: waveY, r: 2.6, fill: C.ink }, wave);
  PK.drawOn(tl, lead, V.start - 0.25, 0.25, "power2.out");
  tl.fromTo(dot, { scale: 0, svgOrigin: waveX0 - 6 + " " + waveY }, { scale: 1, svgOrigin: waveX0 - 6 + " " + waveY, duration: 0.2, ease: "back.out(2)" }, V.start - 0.05);
  var env = window.PK_VO.worker_envelope;
  var step = 2; // 40 values per second -> 20 bars per second
  var bars = [];
  for (var i = 0, b = 0; i + step <= env.values.length; i += step, b++) {
    var v = Math.max(env.values[i], env.values[i + 1] || 0);
    var hgt = Math.max(1.2, Math.pow(v, 0.8) * 24);
    var x = waveX0 + b * 2.3;
    var bar = PK.el("rect", { x: x, y: waveY - hgt / 2, width: 1.35, height: hgt, rx: 0.6, fill: C.ink }, wave);
    var t = env.start + i / env.rate;
    tl.fromTo(bar, { scaleY: 0, svgOrigin: x + " " + waveY }, { scaleY: 1, svgOrigin: x + " " + waveY, duration: 0.12, ease: "power2.out" }, t);
    bars.push(bar);
  }
  tl.to(wave, { opacity: 0, duration: 0.7, ease: "power1.in" }, 14.3);

  // ------------------------------------------------------------ the transcript, word by word, as it is spoken
  var lineA = "Hey, the bracket by the packing line has cracked again.";
  var lineB = "We're going to weld it before the night shift.";
  var tx = PK.g(W.L.labels);
  var wa = PK.words(tx, lineA, 814, 534, { size: LS });
  var wb = PK.words(tx, lineB, 814, 563, { size: LS });
  var words = wa.concat(wb);
  words.forEach(function (w, k) {
    var t = V.words[k].start;
    tl.fromTo(w.el, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.22, ease: "power2.out" }, t - 0.02);
  });

  // what Priora hears: groups of words that become facets
  var groups = {
    repair: [2, 8],
    place: [5, 6],
    hot: [13],
    time: [15, 16, 17, 18],
  };
  var keyIdx = {};
  var underlineAt = { place: V.words[6].end + 0.18, repair: V.words[8].end + 0.22, hot: V.words[13].end + 0.2, time: V.words[18].end + 0.12 };
  var lines = {};
  Object.keys(groups).forEach(function (g) {
    lines[g] = [];
    groups[g].forEach(function (k, j) {
      keyIdx[k] = g;
      var w = words[k];
      var clean = w.word.replace(/[.,]$/, "");
      var wl = PK.measure(clean, "sans400", LS);
      var u = PK.el("path", { d: "M" + w.x + " " + (w.y + 4.2) + " h" + wl, class: "pk-thread" }, tx);
      PK.drawOn(tl, u, underlineAt[g] + j * 0.06, 0.32, "power2.out");
      tl.to(w.el, { fill: C.rust, duration: 0.3, ease: "none" }, underlineAt[g] + j * 0.06);
      lines[g].push(u);
    });
    PK.sfx("speech-fragment", underlineAt[g], { gain_db: -8, pan: -0.2 });
  });

  // the rest of the sentence falls away
  words.forEach(function (w, k) {
    if (keyIdx[k]) return;
    tl.to(w.el, { fill: C.grey, duration: 0.35, ease: "none" }, 14.05 + k * 0.012);
    tl.to(w.el, { opacity: 0, y: 7, duration: 0.55, ease: "power2.in" }, 14.35 + k * 0.02);
  });
  PK.sfx("move", 14.3, { dur: 0.7, gain_db: -14, material: "paper" });

  // ------------------------------------------------------------ the case forms
  var cx = G.caseForm[0],
    cy = G.caseForm[1];
  cs.facets.forEach(function (fc) {
    gsap.set(fc.chipG, { opacity: 0 });
  });
  gsap.set([cs.ring], { drawSVG: "0% 0%" });
  gsap.set([cs.core, cs.shadow], { opacity: 0 });
  var tCase = 14.55;
  tl.set(cs.g, { opacity: 1 }, tCase);
  tl.fromTo(cs.ring, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.55, ease: "power2.inOut", immediateRender: false }, tCase);
  tl.fromTo(cs.core, { opacity: 0, scale: 0, svgOrigin: "0 0" }, { opacity: 1, scale: 1, svgOrigin: "0 0", duration: 0.35, ease: "back.out(2)", immediateRender: false }, tCase + 0.25);
  PK.fade(tl, cs.shadow, 0, 1, tCase + 0.3, 0.4, "none", { later: true });
  PK.sfx("arrive", tCase + 0.25, { gain_db: -6, size: "case" });

  var labels = {};
  PK.FACETS.forEach(function (f) {
    labels[f.key] = cs.makeLabel(f.key, FS, f.label);
  });

  function facetIn(key, at) {
    var fc = cs.facet(key);
    tl.fromTo(fc.chipG, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "none", immediateRender: false }, at);
    cs.unfold(tl, at, 0.42, [key]);
    tl.fromTo(fc.chip, { scale: 0.4, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.45, ease: "back.out(2)", immediateRender: false }, at);
    tl.fromTo(labels[key], { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out", immediateRender: false }, at + 0.2);
    PK.sfx("arrive", at, { gain_db: -9, size: "facet", pan: Math.cos((fc.angle * Math.PI) / 180) * 0.4 });
  }

  // phrases fly from the sentence into their facet
  function fly(g, arrive) {
    var fc = cs.facet(g);
    var target = PK.polar(cx, cy, cs.spokeR, fc.angle);
    var dur = 0.62;
    groups[g].forEach(function (k, j) {
      var w = words[k];
      var dx = target[0] - w.cx,
        dy = target[1] - (w.y - LS * 0.35);
      var path = PK.curve([0, 0], [dx, dy], 22);
      var t0 = arrive - dur - 0.04 + j * 0.035;
      tl.to(w.el, { motionPath: { path: path }, duration: dur, ease: "power2.inOut" }, t0);
      tl.to(w.el, { scale: 0.45, svgOrigin: w.cx + " " + (w.y - LS * 0.35), duration: dur, ease: "power2.in" }, t0);
      tl.to(w.el, { opacity: 0, duration: 0.18, ease: "none" }, t0 + dur - 0.14);
      if (j === 0) PK.trail(tl, W.L.trails, PK.curve([w.cx, w.y - LS * 0.35], target, 22), t0, dur);
    });
    lines[g].forEach(function (u) {
      tl.to(u, { opacity: 0, duration: 0.25, ease: "none" }, arrive - dur - 0.04);
    });
    PK.sfx("speech-fragment", arrive - dur, { gain_db: -12, pan: 0.1 });
    facetIn(g, arrive - 0.05);
  }
  fly("repair", PK.word("L03", "repair"));
  fly("hot", PK.word("L03", "hot"));
  fly("place", PK.word("L03", "place"));
  fly("time", PK.word("L03", "deadline"));

  // the site's own conditions flow up from the building
  var tCond = PK.word("L03", "deadline", 1, "end") + 0.2;
  var cpos = PK.polar(cx, cy, cs.spokeR, 90);
  var condD = PK.curve([G.site[0] + 20, G.site[1] - 128], [cpos[0], cpos[1] + 9], -30);
  var cond = PK.thread(W.L.threads, condD);
  PK.drawOn(tl, cond, tCond, 0.5, "power2.out");
  var cb = PK.bead(W.L.threads, 2.6);
  tl.set(cb.g, { opacity: 1 }, tCond);
  PK.travel(tl, cb.g, condD, tCond, 0.5, "power2.out");
  tl.set(cb.g, { opacity: 0 }, tCond + 0.5);
  PK.sfx("thread", tCond, { dur: 0.5, gain_db: -10 });
  facetIn("conditions", tCond + 0.45);
  tl.to(cond, { opacity: 0, duration: 0.5, ease: "power1.in" }, tCond + 1.3);

  // the photo is missing: a dashed, empty facet
  var ph = cs.facet("photo");
  var ghost = PK.g(ph.chipG);
  PK.el("circle", { cx: 0, cy: 0, r: 7.2, fill: C.paper, stroke: C.rust, "stroke-width": 1.3, "stroke-dasharray": "2.2 2" }, ghost);
  PK.text(ghost, "?", 0, 0.4, { size: 9.5, weight: 600, fill: C.rust, anchor: "middle", baseline: "central" });
  gsap.set(ph.mark, { opacity: 0 });
  var tMiss = tCond + 0.75;
  facetIn("photo", tMiss);

  // ------------------------------------------------------------ Priora asks for a photo
  var tAsk = PK.word("L03", "then") + 0.05;
  tl.to(W.priora.beadG, { rotation: 152, svgOrigin: "0 0", duration: 0.4, ease: "power2.inOut" }, tAsk - 0.3);
  var beadPos = PK.polar(listen[0], listen[1], 26, 152);
  var phPos = PK.polar(cx, cy, cs.spokeR, 150);
  var wHead = [G.worker[0] + 18, G.worker[1] - 128];
  var legA = PK.curve(beadPos, [phPos[0] + 8, phPos[1] + 3], -22);
  var legB = PK.curve([phPos[0] - 8, phPos[1] + 4], wHead, -34);
  var askA = PK.el("path", { d: legA, class: "pk-thread-dash" }, W.L.threads);
  var askB = PK.el("path", { d: legB, class: "pk-thread-dash" }, W.L.threads);
  PK.fade(tl, askA, 0, 1, tAsk, 0.35, "none");
  PK.fade(tl, askB, 0, 1, tAsk + 0.3, 0.35, "none");
  var q = PK.bead(W.L.threads, 3, { hollow: true });
  tl.set(q.g, { opacity: 1 }, tAsk);
  PK.travel(tl, q.g, legA, tAsk, 0.45, "power1.in");
  PK.travel(tl, q.g, legB, tAsk + 0.45, 0.55, "power2.out");
  tl.set(q.g, { opacity: 0 }, tAsk + 1.0);
  PK.sfx("request", tAsk, { gain_db: -6 });
  var question = PK.text(W.L.labels, "Photo of the bracket?", wHead[0] - 30, wHead[1] - 22, { font: "mono", size: FS, fill: C.rust, anchor: "end" });
  PK.show(tl, question, tAsk + 0.85, 0.35);

  // the worker sends one: a small ink picture travels up into the facet
  var tSend = tAsk + 1.05;
  var photo = PK.g(W.L.case);
  PK.el("rect", { x: -7.5, y: -6, width: 15, height: 12, rx: 1.4, fill: C.ink }, photo);
  PK.el("path", { d: "M-5 3.6 L-1.4 -0.6 L1.2 2 L2.6 0.6 L5 3.6 Z", fill: C.paper }, photo);
  PK.el("circle", { cx: 2.6, cy: -2.6, r: 1.2, fill: C.paper }, photo);
  gsap.set(photo, { x: wHead[0], y: wHead[1], opacity: 0 });
  var back = PK.curve(wHead, phPos, 34);
  tl.fromTo(photo, { opacity: 0, scale: 0.5, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.25, ease: "power2.out", immediateRender: false }, tSend);
  PK.travel(tl, photo, back, tSend + 0.15, 0.7, "power2.inOut");
  tl.to(photo, { scale: 0.45, transformOrigin: "50% 50%", duration: 0.3, ease: "power2.in" }, tSend + 0.62);
  tl.to(photo, { opacity: 0, duration: 0.12, ease: "none" }, tSend + 0.88);
  PK.sfx("evidence", tSend, { gain_db: -6, part: "send" });
  // answered: the request lines turn solid, then go
  var solidB = PK.el("path", { d: legB, class: "pk-thread" }, W.L.threads);
  PK.drawOn(tl, solidB, tSend + 0.15, 0.75, "power2.inOut", { from: "end" });
  tl.to(askB, { opacity: 0, duration: 0.3, ease: "none" }, tSend + 0.2);
  var tFill = tSend + 0.86;
  tl.to(ghost, { opacity: 0, duration: 0.2, ease: "none" }, tFill);
  tl.fromTo(ph.mark, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none", immediateRender: false }, tFill);
  tl.fromTo(ph.chip, { scale: 1.35, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.4, ease: "back.out(2)", immediateRender: false }, tFill);
  PK.sfx("evidence", tFill, { gain_db: -4, part: "accept" });
  tl.to([question, askA, solidB], { opacity: 0, duration: 0.4, ease: "power1.in" }, tFill + 0.25);

  // ------------------------------------------------------------ the case folds, ready to travel
  var tFold = 21.0;
  var allLabels = Object.keys(labels).map(function (k) {
    return labels[k];
  });
  tl.to(allLabels, { opacity: 0, duration: 0.35, ease: "power1.in" }, tFold);
  cs.fold(tl, tFold + 0.12, 0.55, null, { stagger: 0.04 });
  PK.sfx("assemble", tFold + 0.15, { gain_db: -10, size: "small" });
  W.caseLabel = PK.text(W.L.labels, "Case", cx, cy + cs.R + 20, { font: "mono", size: FS, fill: C.rust, anchor: "middle" });
  gsap.set(W.caseLabel, { opacity: 0 });
  PK.show(tl, W.caseLabel, tFold + 0.55, 0.35);
  // Priora closes in, facing the case
  tl.to(W.priora.beadG, { rotation: 180, svgOrigin: "0 0", duration: 0.5, ease: "power2.inOut" }, 21.2);
  PK.travel(tl, W.priora.g, PK.curve(listen, [1150, 400], 10), 21.15, 0.8, "power2.inOut");
});
