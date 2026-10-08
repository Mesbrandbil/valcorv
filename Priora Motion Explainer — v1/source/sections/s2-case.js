/*
  s2-case (8 to 22.3 s): everyday language becomes a case.
  The worker sends a voice note; the words appear as they are spoken, in ink (a
  person's words). Priora listens on a fine dashed thread and quietly underlines what
  matters in rust. Then the sentence separates: the ordinary words fall away, a thread
  from Priora's bead draws a new ring, and the meaningful phrases fly into it and become
  its facets: repair, hot work, the packing line, before the night shift. The site's own
  conditions flow up from the building. The photo is missing: Priora asks the worker,
  the worker sends one, the facet fills. The finished case holds, then folds to travel.

  Contract at 22.3 (for s3): Priora at (1150, 445), scale 1, bead at 180 deg, label hidden;
  case at GEO.caseForm (1000, 455), all facets folded and visible, photo filled,
  W.caseLabel ("Case", 22 px) visible since 21.35 at (1000, 499); transcript, waveform, threads
  and question gone; the worker's phone is down (faded).
*/
PK.section("s2-case", 8, 22.3, function (tl, W, ctx) {
  var G = PK.GEO,
    C = PK.C;
  var cs = W.caseT;
  var V = PK.line("W01");
  var LS = 15.4; // transcript size (30 px at this shot's zoom, 1.96)
  var FS = 10.2; // facet and status label size (20 px)
  var listen = G.prioraListen;
  var cx = G.caseForm[0],
    cy = G.caseForm[1];
  function beadAt(angle) {
    return PK.polar(listen[0], listen[1], 26, angle);
  }

  // ------------------------------------------------------------ Priora is introduced and listens
  PK.show(tl, W.priora.label, 8.9, 0.5);
  PK.hide(tl, W.priora.label, 12.6, 0.5);
  tl.fromTo(W.priora.beadG, { rotation: 0, svgOrigin: "0 0" }, { rotation: 85, svgOrigin: "0 0", duration: 0.7, ease: "power2.inOut", immediateRender: false }, 9.0);

  // ------------------------------------------------------------ the voice note
  // the worker raises a phone to the mouth: an ink forearm and a small slab, each cut from the
  // silhouette by a hairline of paper, so it reads as a voice message, not speech
  var phone = PK.g(W.real.worker.body);
  PK.el("path", { d: "M13 -66 C19 -74 21 -84 18.5 -92", fill: "none", stroke: C.paper, "stroke-width": 9.6, "stroke-linecap": "round" }, phone);
  PK.el("path", { d: "M13 -66 C19 -74 21 -84 18.5 -92", fill: "none", stroke: C.ink, "stroke-width": 7, "stroke-linecap": "round" }, phone);
  var slab = PK.g(phone, { transform: "translate(18.5 -100) rotate(-14)" });
  PK.el("rect", { x: -4.6, y: -8, width: 9.2, height: 16, rx: 1.8, fill: C.ink, stroke: C.paper, "stroke-width": 1.3 }, slab);
  PK.el("rect", { x: -2.6, y: -5.6, width: 5.2, height: 8.6, rx: 0.6, fill: "none", stroke: C.paper, "stroke-width": 0.7, opacity: 0.85 }, slab);
  gsap.set(phone, { opacity: 0 });
  tl.fromTo(phone, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", immediateRender: false }, V.start - 0.55);
  tl.to(phone, { opacity: 0, y: 6, duration: 0.35, ease: "power2.in" }, 14.2);
  var head = [G.worker[0] + 21, G.worker[1] - 109];
  var waveY = 600,
    waveX0 = 814;
  var wave = PK.g(W.L.real);
  var lead = PK.el("path", { d: "M" + head[0] + " " + head[1] + " L" + (waveX0 - 6) + " " + waveY, fill: "none", stroke: C.ink, "stroke-width": 1.2, "stroke-linecap": "round" }, wave);
  var dot = PK.el("circle", { cx: waveX0 - 6, cy: waveY, r: 2.6, fill: C.ink }, wave);
  PK.drawOn(tl, lead, V.start - 0.25, 0.25, "power2.out");
  tl.fromTo(dot, { scale: 0, svgOrigin: waveX0 - 6 + " " + waveY }, { scale: 1, svgOrigin: waveX0 - 6 + " " + waveY, duration: 0.2, ease: "back.out(2)" }, V.start - 0.05);
  var env = window.PK_VO.worker_envelope;
  var step = 2; // 40 values per second -> 20 bars per second
  for (var i = 0, b = 0; i + step <= env.values.length; i += step, b++) {
    var v = Math.max(env.values[i], env.values[i + 1] || 0);
    var hgt = Math.max(1.2, Math.pow(v, 0.8) * 24);
    var x = waveX0 + b * 2.3;
    var bar = PK.el("rect", { x: x, y: waveY - hgt / 2, width: 1.35, height: hgt, rx: 0.6, fill: C.ink }, wave);
    tl.fromTo(bar, { scaleY: 0, svgOrigin: x + " " + waveY }, { scaleY: 1, svgOrigin: x + " " + waveY, duration: 0.12, ease: "power2.out" }, env.start + i / env.rate);
  }
  tl.to(wave, { opacity: 0, duration: 0.7, ease: "power1.in" }, 14.3);

  // ------------------------------------------------------------ the transcript, word by word, as it is spoken
  var lineA = "Hey, the bracket by the packing line has cracked again.";
  var lineB = "We're going to weld it before the night shift.";
  var tx = PK.g(W.L.labels);
  var words = PK.words(tx, lineA, 814, 534, { size: LS }).concat(PK.words(tx, lineB, 814, 563, { size: LS }));
  words.forEach(function (w, k) {
    tl.fromTo(w.el, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.22, ease: "power2.out" }, V.words[k].start - 0.02);
  });

  // what Priora hears: groups of words that become facets
  var groups = { repair: [2, 8], place: [5, 6], hot: [13], time: [15, 16, 17, 18] };
  var keyIdx = {};
  Object.keys(groups).forEach(function (g) {
    groups[g].forEach(function (k) {
      keyIdx[k] = g;
    });
  });
  // a key word that ends in punctuation keeps the bare word; the mark becomes its own glyph that falls away
  var marks = [];
  words.forEach(function (w, k) {
    var m = w.word.match(/^(.*?)([.,]+)$/);
    if (!keyIdx[k] || !m) return;
    w.el.textContent = m[1];
    var bare = PK.measure(m[1], "sans400", LS);
    var p = PK.text(tx, m[2], w.x + bare, w.y, { size: LS, font: "sans", weight: 400, upper: false, track: 0 });
    tl.fromTo(p, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: "power2.out" }, V.words[k].start - 0.02);
    w.w = bare;
    w.cx = w.x + bare / 2;
    marks.push(p);
  });

  // Priora listens: a fine dashed thread from its bead, down past the end of the sentence and
  // in along the wave's line to the wave's growing head, with small beads of meaning running
  // back up it while the worker speaks
  var lisFrom = beadAt(85);
  var nBars = Math.floor(env.values.length / step);
  function waveHead(t) {
    var b = Math.max(0, Math.min(nBars - 1, ((t - env.start) * env.rate) / step));
    return waveX0 + b * 2.3;
  }
  function lisPath(xh) {
    return "M" + PK.fmt(lisFrom[0]) + " " + PK.fmt(lisFrom[1]) + " C1263 560 1242 " + waveY + " 1192 " + waveY + " L" + PK.fmt(xh + 7) + " " + waveY;
  }
  function lisBackPath(xh) {
    return "M" + PK.fmt(xh + 7) + " " + waveY + " L1192 " + waveY + " C1242 " + waveY + " 1263 560 " + PK.fmt(lisFrom[0]) + " " + PK.fmt(lisFrom[1]);
  }
  var tLis = 9.45,
    tLisEnd = env.start + (nBars * step) / env.rate;
  var lis = PK.el("path", { d: lisPath(waveHead(tLis)), class: "pk-thread-dash" }, W.L.threads);
  PK.fade(tl, lis, 0, 0.8, tLis, 0.4, "none");
  tl.fromTo(lis, { attr: { d: lisPath(waveHead(tLis)) } }, { attr: { d: lisPath(waveHead(tLisEnd)) }, duration: tLisEnd - tLis, ease: "none", immediateRender: false }, tLis);
  tl.to(lis, { opacity: 0, duration: 0.4, ease: "power1.in" }, 14.1);
  [10.15, 10.95, 12.55, 13.55].forEach(function (t, n) {
    var bd = PK.bead(W.L.threads, 2.2);
    tl.set(bd.g, { opacity: 1 }, t);
    PK.travel(tl, bd.g, lisBackPath(waveHead(t)), t, 0.5, "power1.in");
    tl.set(bd.g, { opacity: 0 }, t + 0.5);
    PK.sfx("packet", t + 0.5, { gain_db: -16, size: "small", pan: 0.5 });
  });

  // the underlines: one per contiguous phrase, drawn shortly after each is spoken
  var underlineAt = { place: V.words[6].end + 0.18, repair: V.words[8].end + 0.22, hot: V.words[13].end + 0.2, time: V.words[18].end + 0.12 };
  var lines = {};
  Object.keys(groups).forEach(function (g) {
    lines[g] = [];
    var runs = [];
    groups[g].forEach(function (k) {
      var last = runs[runs.length - 1];
      if (last && last[last.length - 1] === k - 1 && words[k].y === words[k - 1].y) last.push(k);
      else runs.push([k]);
    });
    runs.forEach(function (run, j) {
      var a = words[run[0]],
        z = words[run[run.length - 1]];
      var u = PK.el("path", { d: "M" + a.x + " " + (a.y + 4.2) + " H" + (z.x + z.w), class: "pk-thread" }, tx);
      PK.drawOn(tl, u, underlineAt[g] + j * 0.08, 0.32, "power2.out");
      lines[g].push(u);
    });
    groups[g].forEach(function (k) {
      tl.to(words[k].el, { fill: C.rust, duration: 0.3, ease: "none" }, underlineAt[g]);
    });
    PK.sfx("speech-fragment", underlineAt[g], { gain_db: -8, pan: -0.2 });
  });

  // the rest of the sentence falls away
  words.forEach(function (w, k) {
    if (keyIdx[k]) return;
    tl.to(w.el, { fill: C.grey, duration: 0.35, ease: "none" }, 14.05 + k * 0.012);
    tl.to(w.el, { opacity: 0, y: 7, duration: 0.55, ease: "power2.in" }, 14.35 + k * 0.02);
  });
  tl.to(marks, { opacity: 0, y: 7, duration: 0.45, ease: "power2.in" }, 14.4);
  PK.sfx("move", 14.3, { dur: 0.7, gain_db: -14, material: "paper" });

  // ------------------------------------------------------------ Priora draws the case
  cs.facets.forEach(function (fc) {
    gsap.set(fc.chipG, { opacity: 0 });
  });
  gsap.set([cs.ring], { drawSVG: "0% 0%" });
  gsap.set([cs.core, cs.shadow], { opacity: 0 });
  var tCase = 14.55;
  tl.to(W.priora.beadG, { rotation: 174, svgOrigin: "0 0", duration: 0.35, ease: "power2.inOut" }, 14.0);
  var birthD = PK.curve(beadAt(174), [cx + 24, cy - 2], -10);
  var birth = PK.thread(W.L.threads, birthD);
  PK.drawOn(tl, birth, 14.25, 0.35, "power2.out");
  tl.to(birth, { opacity: 0, duration: 0.5, ease: "power1.in" }, 15.0);
  tl.set(cs.g, { opacity: 1 }, tCase);
  tl.fromTo(cs.ring, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.55, ease: "power2.inOut", immediateRender: false }, tCase);
  tl.fromTo(cs.core, { opacity: 0, scale: 0, svgOrigin: "0 0" }, { opacity: 1, scale: 1, svgOrigin: "0 0", duration: 0.35, ease: "back.out(2)", immediateRender: false }, tCase + 0.25);
  PK.fade(tl, cs.shadow, 0, 1, tCase + 0.3, 0.4, "none", { later: true });
  PK.sfx("thread", 14.25, { dur: 0.35, gain_db: -12 });
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

  // phrases fly from the sentence toward their facet: they shrink and fade before they
  // reach the ring, and the facet appears where they were going
  function fly(g, arrive) {
    var fc = cs.facet(g);
    var target = PK.polar(cx, cy, cs.spokeR + 6, fc.angle);
    var dur = 0.62;
    var lead = groups[g][0];
    groups[g].forEach(function (k, j) {
      var w = words[k];
      var dx = target[0] - w.cx,
        dy = target[1] - (w.y - LS * 0.35);
      var path = PK.curve([0, 0], [dx, dy], 22);
      var t0 = arrive - dur - 0.04 + j * 0.035;
      tl.to(w.el, { motionPath: { path: path }, duration: dur, ease: "power2.inOut" }, t0);
      tl.to(w.el, { scale: 0.4, transformOrigin: "50% 50%", duration: dur * 0.7, ease: "power2.in" }, t0);
      tl.to(w.el, { opacity: 0, duration: dur * 0.3, ease: "none" }, t0 + dur * 0.5);
      if (k === lead) PK.trail(tl, W.L.trails, PK.curve([w.cx, w.y - LS * 0.35], target, 22), t0, dur, "power2.inOut");
    });
    lines[g].forEach(function (u) {
      tl.to(u, { opacity: 0, duration: 0.25, ease: "none" }, arrive - dur - 0.04);
    });
    PK.sfx("speech-fragment", arrive - dur, { gain_db: -12, pan: 0.1 });
    facetIn(g, arrive - 0.12);
  }
  fly("repair", PK.word("L03", "repair"));
  fly("hot", PK.word("L03", "hot"));
  fly("place", PK.word("L03", "place"));
  fly("time", PK.word("L03", "deadline"));

  // the site's own conditions flow up from the building
  var tCond = PK.word("L03", "deadline") + 0.35;
  var cpos = PK.polar(cx, cy, cs.spokeR, 90);
  // straight up from the roof to just under the facet's label (never through it); the bead
  // lands there, the facet lights, and the thread draws back down before the request
  var condEnd = [cx, cpos[1] + 11 + FS * 0.95 + 9];
  var condD = PK.curve([G.site[0] + 20, G.site[1] - 128], condEnd, -12);
  var cond = PK.thread(W.L.threads, condD);
  PK.drawOn(tl, cond, tCond, 0.5, "power2.out");
  var cb = PK.bead(W.L.threads, 2.6);
  tl.set(cb.g, { opacity: 1 }, tCond);
  PK.travel(tl, cb.g, condD, tCond, 0.5, "power2.out");
  tl.set(cb.g, { opacity: 0 }, tCond + 0.5);
  PK.sfx("thread", tCond, { dur: 0.5, gain_db: -10 });
  facetIn("conditions", tCond + 0.42);
  tl.to(cond, { drawSVG: "0% 0%", duration: 0.35, ease: "power2.in" }, tCond + 0.6);
  tl.set(cond, { opacity: 0 }, tCond + 0.96);

  // the photo is missing: a dashed, empty facet with a question mark
  var ph = cs.facet("photo");
  var ghost = PK.g(ph.chipG);
  PK.el("circle", { cx: 0, cy: 0, r: 7.2, fill: C.paper, stroke: C.rust, "stroke-width": 1.3, "stroke-dasharray": "2.2 2" }, ghost);
  PK.text(ghost, "?", 0, 0.4, { size: 9.5, weight: 600, fill: C.rust, anchor: "middle", baseline: "central" });
  gsap.set(ph.mark, { opacity: 0 });
  facetIn("photo", tCond + 0.62);

  // ------------------------------------------------------------ Priora asks the worker for a photo
  var tAsk = PK.word("L03", "then") + 0.05;
  tl.to(W.priora.beadG, { rotation: 152, svgOrigin: "0 0", duration: 0.4, ease: "power2.inOut" }, tAsk - 0.3);
  var wHead = [G.worker[0] + 20, G.worker[1] - 130];
  // the request runs below the case and its labels, straight to the worker
  // it drops steeply first, so it passes right of the end of BEFORE NIGHT SHIFT and under it
  var askD = "M" + PK.fmt(beadAt(152)[0]) + " " + PK.fmt(beadAt(152)[1]) + " C1235 540 960 610 " + wHead[0] + " " + wHead[1];
  var ask = PK.el("path", { d: askD, class: "pk-thread-dash" }, W.L.threads);
  PK.fade(tl, ask, 0, 1, tAsk, 0.35, "none");
  var q = PK.bead(W.L.threads, 3, { hollow: true });
  tl.set(q.g, { opacity: 1 }, tAsk);
  PK.travel(tl, q.g, askD, tAsk, 0.8, "power2.inOut");
  tl.set(q.g, { opacity: 0 }, tAsk + 0.8);
  PK.sfx("request", tAsk, { gain_db: -6 });
  var question = PK.text(W.L.labels, "Photo of the bracket?", wHead[0] - 34, wHead[1] - 20, { font: "mono", size: FS, fill: C.rust, anchor: "end" });
  PK.show(tl, question, tAsk + 0.7, 0.35);

  // the worker sends one: a small printed photo of the cracked bracket travels up into the facet
  var tSend = tAsk + 1.05;
  var phPos = PK.polar(cx, cy, cs.spokeR, 150);
  var photo = PK.g(W.L.case);
  var pin = PK.g(photo, { transform: "rotate(-6)" });
  // a printed photo: paper border, an ink picture, and in it an L bracket in paper with a
  // jagged break through its corner
  PK.el("rect", { x: -18, y: -21, width: 36, height: 42, rx: 1.2, fill: C.paper, stroke: C.ink, "stroke-width": 0.9 }, pin);
  PK.el("rect", { x: -15, y: -18, width: 30, height: 30, fill: C.ink }, pin);
  PK.el("path", { d: "M-7 -11 V5 H9", fill: "none", stroke: C.paper, "stroke-width": 3.4, "stroke-linecap": "butt" }, pin);
  // the crack: a dark jagged break straight across the upright, the two parts slightly offset
  PK.el("path", { d: "M-10.5 -3.2 L-8.1 -1.4 L-7.2 -3.6 L-5.4 -1.8 L-3.6 -2.9", fill: "none", stroke: C.ink, "stroke-width": 2.1, "stroke-linejoin": "miter" }, pin);
  gsap.set(photo, { x: wHead[0], y: wHead[1], opacity: 0 });
  // up from the worker first, then across above the case labels to the photo facet
  var back = "M" + PK.fmt(wHead[0]) + " " + PK.fmt(wHead[1]) + " C" + PK.fmt(wHead[0] - 6) + " " + PK.fmt(wHead[1] - 120) + " " + PK.fmt(phPos[0] - 70) + " " + PK.fmt(phPos[1] - 14) + " " + PK.fmt(phPos[0]) + " " + PK.fmt(phPos[1]);
  tl.fromTo(photo, { opacity: 0, scale: 0.5, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.25, ease: "power2.out", immediateRender: false }, tSend);
  PK.travel(tl, photo, back, tSend + 0.15, 0.7, "power2.inOut");
  tl.to(photo, { scale: 0.22, transformOrigin: "50% 50%", duration: 0.3, ease: "power2.in" }, tSend + 0.62);
  tl.to(photo, { opacity: 0, duration: 0.12, ease: "none" }, tSend + 0.88);
  PK.sfx("evidence", tSend, { gain_db: -6, part: "send" });
  // answered: the photo's own path is drawn solid behind it and the request goes
  var answer = PK.el("path", { d: back, class: "pk-thread" }, W.L.threads);
  PK.drawOn(tl, answer, tSend + 0.15, 0.7, "power2.inOut");
  tl.to(ask, { opacity: 0, duration: 0.3, ease: "none" }, tSend + 0.2);
  var tFill = tSend + 0.86;
  tl.to(labels.photo, { opacity: 0, duration: 0.15, ease: "power1.in" }, tSend + 0.4);
  tl.to(labels.photo, { opacity: 1, duration: 0.25, ease: "power1.out" }, tFill + 0.05);
  tl.to(ghost, { opacity: 0, duration: 0.2, ease: "none" }, tFill);
  tl.fromTo(ph.mark, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none", immediateRender: false }, tFill);
  tl.fromTo(ph.chip, { scale: 1.35, svgOrigin: "0 0" }, { scale: 1, svgOrigin: "0 0", duration: 0.4, ease: "back.out(2)", immediateRender: false }, tFill);
  PK.sfx("evidence", tFill, { gain_db: -4, part: "accept" });
  tl.to([question, answer], { opacity: 0, duration: 0.4, ease: "power1.in" }, tFill + 0.3);

  // ------------------------------------------------------------ the finished case holds, then folds to travel
  var tFold = 21.0;
  var allLabels = Object.keys(labels).map(function (k) {
    return labels[k];
  });
  tl.to(allLabels, { opacity: 0, duration: 0.3, ease: "power1.in" }, tFold);
  cs.fold(tl, tFold + 0.08, 0.38, null, { stagger: 0.03 });
  PK.sfx("assemble", tFold + 0.1, { gain_db: -10, size: "small" });
  W.caseLabel = PK.text(W.L.labels, "Case", cx, cy + cs.R + 22, { font: "mono", size: PK.cam.px(21.35, 22), fill: C.rust, anchor: "middle" });
  gsap.set(W.caseLabel, { opacity: 0 });
  PK.show(tl, W.caseLabel, 21.35, 0.3);
  // Priora closes in, facing the case
  tl.to(W.priora.beadG, { rotation: 180, svgOrigin: "0 0", duration: 0.5, ease: "power2.inOut" }, 21.4);
  PK.travel(tl, W.priora.g, PK.curve(listen, [1150, 445], 8), 21.4, 0.5, "power2.inOut");
});
