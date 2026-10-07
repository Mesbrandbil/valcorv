/*
  world.js: builds the one drawing the whole film lives in, and every persistent element.

  PK.buildWorld(svg) -> W. Everything persistent starts hidden (opacity 0 or undrawn);
  sections reveal, move and hide it. Sections create their own transient elements in
  the layers below (W.L.*), so the stacking order stays the same everywhere.

  Geometry (world units, the final frame shows the sheet 1:1): PK.GEO.
*/
(function () {
  "use strict";

  var GEO = (PK.GEO = {
    prioraHome: [960, 175],
    ground: { y: 760, x0: 690, x1: 1230 },
    worker: [775, 760],
    site: [960, 760],
    owner: [1148, 760],
    packing: [1012, 730.5],
    realLabelY: 786,
    record: { y: 814, x0: 700, x1: 1220 },
    caseForm: [1000, 410],
    panel: { x: 140, y: 250, w: 480, h: 510, r: 18, doorY: 505, gap: 70 },
    table: [380, 520],
    slotR: 150,
    slotAngles: [270, 315, 0, 45, 90, 135, 180, 225],
    alignR: 40,
    rooms: {
      retain: { x: 1300, y: 250, w: 480, h: 160 },
      mitigate: { x: 1300, y: 428, w: 480, h: 160 },
      transfer: { x: 1300, y: 606, w: 480, h: 160 },
    },
    roomDoorGap: 44,
    // the five specialists: first slot (where they land when summoned) and aligned angle
    agents: {
      siteRules: { name: "Site rules", slot: 225, aligned: 198 },
      insurer: { name: "Insurer conditions", slot: 270, aligned: 270 },
      fire: { name: "Fire", slot: 315, aligned: 342 },
      riskEng: { name: "Risk engineering", slot: 135, aligned: 126 },
      evidence: { name: "Evidence", slot: 90, aligned: 54 },
    },
  });
  GEO.slot = function (a) {
    return PK.polar(GEO.table[0], GEO.table[1], GEO.slotR, a);
  };
  GEO.roomDoor = function (k) {
    var r = GEO.rooms[k];
    return [r.x, r.y + r.h / 2];
  };
  GEO.ownerHand = [GEO.owner[0] + 26, GEO.owner[1] - 50];

  PK.buildWorld = function (svg) {
    var W = { svg: svg, L: {} };
    var root = PK.g(svg, { id: "pk-world" });
    ["trails", "routes", "chambers", "real", "threads", "tokens", "case", "priora", "labels", "top"].forEach(function (n) {
      W.L[n] = PK.g(root, { id: "pk-L-" + n });
    });

    // ---------------------------------------------------------------- the real world
    var real = (W.real = {});
    real.ground = PK.el(
      "path",
      { d: "M" + GEO.ground.x0 + " " + GEO.ground.y + " H" + GEO.ground.x1, fill: "none", stroke: PK.C.ink, "stroke-width": 2.4, "stroke-linecap": "round" },
      W.L.real,
    );
    gsap.set(real.ground, { drawSVG: "50% 50%" });
    real.worker = PK.glyph.worker(W.L.real);
    gsap.set(real.worker.g, { x: GEO.worker[0], y: GEO.worker[1] });
    real.site = PK.glyph.site(W.L.real);
    gsap.set(real.site.g, { x: GEO.site[0], y: GEO.site[1] });
    real.owner = PK.glyph.riskOwner(W.L.real);
    gsap.set(real.owner.g, { x: GEO.owner[0], y: GEO.owner[1] });
    [real.worker, real.site, real.owner].forEach(function (o) {
      gsap.set(o.body, { opacity: 0 });
    });
    real.labels = {
      worker: PK.text(W.L.real, "Worker", GEO.worker[0], GEO.realLabelY, { font: "mono", size: 9, fill: PK.C.ink2, anchor: "middle" }),
      site: PK.text(W.L.real, "Site", GEO.site[0], GEO.realLabelY, { font: "mono", size: 9, fill: PK.C.ink2, anchor: "middle" }),
      owner: PK.text(W.L.real, "Risk owner", GEO.owner[0], GEO.realLabelY, { font: "mono", size: 9, fill: PK.C.ink2, anchor: "middle" }),
    };
    for (var k in real.labels) gsap.set(real.labels[k], { opacity: 0 });
    W.spark = real.site.spark;

    // ---------------------------------------------------------------- record spine, route, decision line
    W.record = {
      spine: PK.el("path", { d: "M" + GEO.record.x0 + " " + GEO.record.y + " H" + GEO.record.x1, class: "pk-thread" }, W.L.routes),
      ticks: PK.g(W.L.routes),
    };
    gsap.set(W.record.spine, { drawSVG: "0% 0%" });
    // the route from the panel door to the packing line (opened in s4, open to the end)
    var d0 = [GEO.panel.x + GEO.panel.w, GEO.panel.doorY];
    W.route = PK.el(
      "path",
      {
        d:
          "M" + GEO.table[0] + " " + GEO.table[1] + " L" + d0[0] + " " + (d0[1] + 12) + " L" + (d0[0] + 70) + " " + (d0[1] + 12) +
          " C" + (d0[0] + 250) + " " + (d0[1] + 12) + " " + GEO.packing[0] + " " + (GEO.packing[1] - 150) + " " + GEO.packing[0] + " " + (GEO.packing[1] - 12),
        class: "pk-thread",
      },
      W.L.routes,
    );
    gsap.set(W.route, { drawSVG: "0% 0%" });
    // the risk owner's decision line (black). Sections set its d as needed.
    W.decision = PK.el("path", { d: "M" + GEO.ownerHand[0] + " " + GEO.ownerHand[1] + " h0.01", class: "pk-decision" }, W.L.routes);
    gsap.set(W.decision, { opacity: 0 });

    // ---------------------------------------------------------------- the site panel
    var P = GEO.panel;
    var panel = (W.panel = PK.glyph.chamber(W.L.chambers, { x: P.x, y: P.y, w: P.w, h: P.h, r: P.r, door: { side: "right", at: P.doorY, gap: P.gap } }));
    gsap.set(panel.walls, { drawSVG: "0% 0%" });
    gsap.set([panel.leafA, panel.leafB, panel.jambs], { opacity: 0 });
    panel.title = PK.text(W.L.chambers, "Site panel", P.x + 24, P.y + 38, { size: 17, weight: 500 });
    panel.sub = PK.text(W.L.chambers, "Configured for this site", P.x + 24, P.y + 60, { font: "mono", size: 10, fill: PK.C.grey });
    gsap.set([panel.title, panel.sub], { opacity: 0 });
    panel.slots = GEO.slotAngles.map(function (a) {
      var p = GEO.slot(a);
      var c = PK.el("circle", { cx: p[0], cy: p[1], r: 18, class: "pk-ghost" }, W.L.chambers);
      gsap.set(c, { opacity: 0 });
      return { angle: a, el: c, p: p };
    });
    panel.slotAt = function (a) {
      for (var i = 0; i < panel.slots.length; i++) if (panel.slots[i].angle === a) return panel.slots[i];
      throw new Error("no slot " + a);
    };

    // ---------------------------------------------------------------- the five specialists
    W.agents = {};
    var makers = { siteRules: PK.glyph.siteRules, insurer: PK.glyph.insurer, fire: PK.glyph.fire, riskEng: PK.glyph.riskEng, evidence: PK.glyph.evidence };
    Object.keys(GEO.agents).forEach(function (key) {
      var spec = GEO.agents[key];
      var t = makers[key](W.L.tokens);
      var p = GEO.slot(spec.slot);
      gsap.set(t.g, { x: p[0], y: p[1], opacity: 0 });
      // name label rides with the token (child of .g, not of .body, so tilts do not turn it)
      var a = spec.slot;
      var off = PK.polar(0, 0, 34, a);
      var cos = Math.cos((a * Math.PI) / 180);
      var anchor = Math.abs(cos) < 0.35 ? "middle" : cos > 0 ? "start" : "end";
      var dy = Math.abs(cos) < 0.35 ? (off[1] > 0 ? 8 : -2) : 3.5;
      t.label = PK.text(t.g, spec.name, off[0], off[1] + dy, { size: 10.5, weight: 500, anchor: anchor });
      gsap.set(t.label, { opacity: 0 });
      t.key = key;
      t.spec = spec;
      W.agents[key] = t;
    });

    // ---------------------------------------------------------------- the Priora agent
    W.priora = PK.glyph.priora(W.L.priora);
    gsap.set(W.priora.g, { x: GEO.prioraHome[0], y: GEO.prioraHome[1], opacity: 0 });
    W.priora.label = PK.text(W.priora.g, "Priora agent", 0, -40, { size: 12, weight: 500, anchor: "middle", fill: PK.C.ink });
    gsap.set(W.priora.label, { opacity: 0 });

    // ---------------------------------------------------------------- the case
    W.caseT = PK.glyph.caseToken(W.L.case, {});
    gsap.set(W.caseT.g, { x: GEO.caseForm[0], y: GEO.caseForm[1], opacity: 0 });

    // ---------------------------------------------------------------- the decision rooms
    W.rooms = {};
    ["retain", "mitigate", "transfer"].forEach(function (k) {
      var r = GEO.rooms[k];
      var ch = PK.glyph.chamber(W.L.chambers, { x: r.x, y: r.y, w: r.w, h: r.h, r: 14, door: { side: "left", at: r.y + r.h / 2, gap: GEO.roomDoorGap }, dashed: k === "transfer" });
      gsap.set(ch.walls, { drawSVG: "0% 0%" });
      gsap.set([ch.leafA, ch.leafB, ch.jambs], { opacity: 0 });
      ch.name = PK.text(W.L.chambers, k.charAt(0).toUpperCase() + k.slice(1), r.x + 20, r.y + 30, { size: 15, weight: 500 });
      gsap.set(ch.name, { opacity: 0 });
      ch.key = k;
      W.rooms[k] = ch;
    });
    // the SIMULATED chip on the Transfer room
    var tr = GEO.rooms.transfer;
    var chip = (W.rooms.transfer.chip = PK.g(W.L.chambers));
    PK.el("rect", { x: tr.x + tr.w - 104, y: tr.y + 14, width: 86, height: 20, rx: 3, fill: PK.C.paper, stroke: PK.C.rust, "stroke-width": 1.1 }, chip);
    PK.text(chip, "Simulated", tr.x + tr.w - 61, tr.y + 28.2, { font: "mono", size: 9, fill: PK.C.rust, anchor: "middle", weight: 600 });
    gsap.set(chip, { opacity: 0 });

    return W;
  };
})();
