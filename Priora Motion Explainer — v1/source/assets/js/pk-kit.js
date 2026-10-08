/*
  pk-kit.js: window.PK, the shared kit for the Priora motion explainer.

  Loaded once in index.html <head>, after GSAP and its plugins, before camera.js,
  world.js and the section files. Deterministic only: no clocks, no Math.random,
  no network, no event handlers, no GSAP callbacks that change visual state.

  Contents
    PK.C, PK.W, PK.H              palette (mirrors film.css) and frame size
    PK.el / PK.g / PK.text         SVG element helpers (text uses var(--sans|--mono))
    PK.prng(seed)                  deterministic random generator
    PK.cam                         viewBox camera: keys, rectAt(t), zoomAt(t), px(t, screenPx), attach(tl, svg)
    PK.glyph.*                     every shape in the film (real world, agents, case, chambers)
    PK.arc(cx, cy, r, a0, a1)      SVG arc path, angles in degrees, clockwise, 0 = +x (y down)
    PK.polar(cx, cy, r, a)         point on a circle
    PK.drawOn / PK.drawOff         DrawSVG reveal / hide on a timeline
    PK.fade / PK.show / PK.hide    opacity helpers (fromTo, seek safe)
    PK.travel(tl, el, d, at, dur)  move a token group along a path (MotionPath)
    PK.trail(tl, layer, d, at, dur) dashed trail that draws behind a traveller and fades
    PK.thread(layer, d, cls)       a rust thread path (screen-constant width)
    PK.sfx(kind, t, opts)          declare a sound event (absolute film seconds)
    PK.section(id, t0, t1, fn)     register a section builder (called in order by index.html)

  Conventions
    Every glyph builder returns an object whose .g is an outer <g> positioned with
    GSAP x/y (world units) and whose .body is an inner <g> for rotation and scale
    around the glyph's own centre (0, 0). Use gsap.set(obj.g, {x, y}) to place it.
*/
(function () {
  "use strict";
  var PK = (window.PK = window.PK || {});
  var NS = "http://www.w3.org/2000/svg";

  PK.W = 1920;
  PK.H = 1080;
  PK.FPS = 30;
  PK.DURATION = 90;

  PK.C = {
    paperGround: "#F7F5F0",
    paper: "#F3F1EC",
    ink: "#111111",
    ink2: "#3A3936",
    grey: "#8F8C86",
    hair: "#CFCBC3",
    rust: "#C4441C",
    rustDeep: "#9E3514",
    rustPale: "#F0DDD3",
    shadow: "rgba(17,17,17,0.13)",
  };

  // ------------------------------------------------------------------ DOM
  PK.el = function (tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(e);
    return e;
  };
  PK.g = function (parent, attrs) {
    return PK.el("g", attrs, parent);
  };

  /*
    PK.text(parent, str, x, y, o)
      o.size    font size in world units (use PK.cam.px(t, screenPx) to size for a shot)
      o.font    "sans" (default) or "mono"
      o.weight  400 / 500 / 600 (mono labels default 500, sans default 500)
      o.fill    colour (default ink)
      o.anchor  "start" | "middle" | "end"
      o.track   letter spacing in em (mono default 0.12)
      o.upper   uppercase the string (mono default true)
      o.baseline dominant-baseline (default "alphabetic"; "central" centres vertically)
  */
  PK.text = function (parent, str, x, y, o) {
    o = o || {};
    var mono = o.font === "mono";
    var t = PK.el(
      "text",
      {
        x: x,
        y: y,
        "text-anchor": o.anchor || "start",
        "dominant-baseline": o.baseline || "alphabetic",
      },
      parent,
    );
    var upper = o.upper !== undefined ? o.upper : mono;
    t.textContent = upper ? String(str).toUpperCase() : String(str);
    var track = o.track !== undefined ? o.track : mono ? 0.12 : 0;
    t.setAttribute(
      "style",
      "font-family:var(" +
        (mono ? "--mono" : "--sans") +
        ");font-size:" +
        (o.size || 12) +
        "px;font-weight:" +
        (o.weight || (mono ? 500 : 500)) +
        ";letter-spacing:" +
        track +
        "em;fill:" +
        (o.fill || PK.C.ink) +
        ";",
    );
    return t;
  };

  /*
    PK.measure(str, face, size, track): width in world units of a string set in a
    self-hosted face ("sans400" | "sans500" | "sans600" | "mono500"), from PK_METRICS.
    PK.words(parent, text, x, y, o): one <text> per word, laid out like a line of type.
      Returns [{ el, word, x, w, cx }] so each word can move on its own.
      o: { size, face ("sans400"), fill, track, font ("sans"|"mono"), weight }
  */
  PK.measure = function (str, face, size, track) {
    var m = (window.PK_METRICS || {})[face || "sans400"] || {};
    var w = 0;
    for (var i = 0; i < str.length; i++) w += m[str[i]] !== undefined ? m[str[i]] : 0.55;
    return (w + (track || 0) * str.length) * size;
  };
  PK.words = function (parent, text, x, y, o) {
    o = o || {};
    var face = o.face || "sans400";
    var size = o.size || 15;
    var space = PK.measure(" ", face, size, o.track);
    var out = [];
    var cx = x;
    text.split(" ").forEach(function (w) {
      var el = PK.text(parent, w, cx, y, { size: size, font: o.font || "sans", weight: o.weight || 400, fill: o.fill || PK.C.ink, upper: false, track: o.track || 0 });
      var ww = PK.measure(w, face, size, o.track);
      out.push({ el: el, word: w, x: cx, w: ww, cx: cx + ww / 2, y: y });
      cx += ww + space;
    });
    return out;
  };

  // ------------------------------------------------------------------ random
  PK.prng = function (seed) {
    var s = typeof seed === "string" ? PK.hash(seed) : seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  PK.hash = function (str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  };

  // ------------------------------------------------------------------ geometry
  PK.polar = function (cx, cy, r, a) {
    var rad = (a * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  PK.arc = function (cx, cy, r, a0, a1) {
    var p0 = PK.polar(cx, cy, r, a0);
    var p1 = PK.polar(cx, cy, r, a1);
    var sweep = a1 >= a0 ? 1 : 0;
    var large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return (
      "M" + f(p0[0]) + " " + f(p0[1]) + " A" + f(r) + " " + f(r) + " 0 " + large + " " + sweep + " " + f(p1[0]) + " " + f(p1[1])
    );
  };
  PK.circlePath = function (cx, cy, r) {
    return (
      "M" + f(cx - r) + " " + f(cy) + " a" + f(r) + " " + f(r) + " 0 1 0 " + f(2 * r) + " 0 a" + f(r) + " " + f(r) + " 0 1 0 " + f(-2 * r) + " 0 Z"
    );
  };
  PK.rectPath = function (x, y, w, h, r) {
    r = Math.min(r || 0, w / 2, h / 2);
    if (!r) return "M" + f(x) + " " + f(y) + " h" + f(w) + " v" + f(h) + " h" + f(-w) + " Z";
    return (
      "M" + f(x + r) + " " + f(y) +
      " H" + f(x + w - r) + " A" + f(r) + " " + f(r) + " 0 0 1 " + f(x + w) + " " + f(y + r) +
      " V" + f(y + h - r) + " A" + f(r) + " " + f(r) + " 0 0 1 " + f(x + w - r) + " " + f(y + h) +
      " H" + f(x + r) + " A" + f(r) + " " + f(r) + " 0 0 1 " + f(x) + " " + f(y + h - r) +
      " V" + f(y + r) + " A" + f(r) + " " + f(r) + " 0 0 1 " + f(x + r) + " " + f(y) + " Z"
    );
  };
  PK.polyPath = function (pts) {
    return "M" + pts.map(function (p) { return f(p[0]) + " " + f(p[1]); }).join(" L") + " Z";
  };
  function f(v) {
    return (Math.round(v * 1000) / 1000).toString();
  }
  PK.fmt = f;

  // ------------------------------------------------------------------ camera
  /*
    PK.cam.keys is set by camera.js:
      { start: [cx, cy, w], moves: [ { t0, t1, to: [cx, cy, w], ease } ... ] }
    Moves must not overlap and are chained (each starts from the previous rect).
    The width is interpolated in log space (uniform zoom), the centre linearly.
  */
  PK.cam = {
    keys: null,
    rectFrom: function (c) {
      var h = (c[2] * PK.H) / PK.W;
      return [c[0] - c[2] / 2, c[1] - h / 2, c[2], h];
    },
    lerpCam: function (a, b, r) {
      return [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r, Math.exp(Math.log(a[2]) + (Math.log(b[2]) - Math.log(a[2])) * r)];
    },
    camAt: function (t) {
      var k = PK.cam.keys;
      var cur = k.start;
      for (var i = 0; i < k.moves.length; i++) {
        var m = k.moves[i];
        if (t < m.t0) return cur;
        if (t < m.t1) {
          var e = gsap.parseEase(m.ease || "power2.inOut");
          return PK.cam.lerpCam(cur, m.to, e((t - m.t0) / (m.t1 - m.t0)));
        }
        cur = m.to;
      }
      return cur;
    },
    rectAt: function (t) {
      return PK.cam.rectFrom(PK.cam.camAt(t));
    },
    zoomAt: function (t) {
      return PK.W / PK.cam.camAt(t)[2];
    },
    // world units for a size of `screenPx` on screen at film time t
    px: function (t, screenPx) {
      return (screenPx * PK.cam.camAt(t)[2]) / PK.W;
    },
    apply: function (svg, c) {
      var r = PK.cam.rectFrom(c);
      svg.setAttribute("viewBox", f(r[0]) + " " + f(r[1]) + " " + f(r[2]) + " " + f(r[3]));
      svg.style.setProperty("--sw", f(r[2] / PK.W));
    },
    attach: function (tl, svg) {
      var k = PK.cam.keys;
      var cur = k.start;
      PK.cam.apply(svg, cur);
      tl.fromTo(svg, { pkCam: { from: cur, to: cur } }, { pkCam: { from: cur, to: cur }, duration: 0.001, ease: "none", immediateRender: true }, 0);
      for (var i = 0; i < k.moves.length; i++) {
        var m = k.moves[i];
        tl.to(svg, { pkCam: { from: cur, to: m.to }, duration: m.t1 - m.t0, ease: m.ease || "power2.inOut", immediateRender: false }, m.t0);
        cur = m.to;
      }
    },
  };
  gsap.registerPlugin({
    name: "pkCam",
    init: function (target, v) {
      this.svg = target;
      this.a = v.from;
      this.b = v.to;
      return true;
    },
    render: function (ratio, data) {
      PK.cam.apply(data.svg, PK.cam.lerpCam(data.a, data.b, ratio));
    },
  });

  // ------------------------------------------------------------------ timeline helpers
  PK.fade = function (tl, el, from, to, at, dur, ease, o) {
    var v = { opacity: to, duration: dur || 0.4, ease: ease || "power1.inOut" };
    if (o && o.later) v.immediateRender = false;
    tl.fromTo(el, { opacity: from }, v, at);
    return tl;
  };
  PK.show = function (tl, el, at, dur, o) {
    return PK.fade(tl, el, 0, 1, at, dur || 0.4, "power2.out", o);
  };
  PK.hide = function (tl, el, at, dur) {
    return PK.fade(tl, el, 1, 0, at, dur || 0.4, "power1.in", { later: true });
  };
  /*
    PK.drawOn(tl, el, at, dur, ease, o)  reveal a stroked path with DrawSVG (0% -> 100%).
      o.from  "start" (default) | "middle" | "end"  where the stroke grows from
      o.later true for any draw of a path that was already drawn earlier in the film
  */
  PK.drawOn = function (tl, el, at, dur, ease, o) {
    o = o || {};
    var from = o.from === "middle" ? "50% 50%" : o.from === "end" ? "100% 100%" : "0% 0%";
    var v = { drawSVG: "0% 100%", duration: dur || 0.6, ease: ease || "power2.inOut" };
    if (o.later) v.immediateRender = false;
    tl.fromTo(el, { drawSVG: from }, v, at);
    return tl;
  };
  PK.drawOff = function (tl, el, at, dur, ease, o) {
    o = o || {};
    var to = o.to === "start" ? "0% 0%" : o.to === "middle" ? "50% 50%" : "100% 100%";
    tl.fromTo(el, { drawSVG: "0% 100%" }, { drawSVG: to, duration: dur || 0.5, ease: ease || "power2.in", immediateRender: false }, at);
    return tl;
  };

  /*
    PK.travel(tl, el, d, at, dur, ease, o): move a positioned group (its .g) along path data d.
      The path is given in world coordinates; the group's x/y follow it.
      o.later  true when the group already moved earlier (default true after first use is safest)
  */
  PK.travel = function (tl, el, d, at, dur, ease, o) {
    o = o || {};
    var v = {
      motionPath: { path: d, autoRotate: false },
      duration: dur || 1,
      ease: ease || "power2.inOut",
      immediateRender: false,
    };
    tl.to(el, v, at);
    return tl;
  };
  /* A straight or curved move from p0 to p1 with an optional bend (perpendicular offset, world units). */
  PK.curve = function (p0, p1, bend) {
    var mx = (p0[0] + p1[0]) / 2,
      my = (p0[1] + p1[1]) / 2;
    var dx = p1[0] - p0[0],
      dy = p1[1] - p0[1];
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var cx = mx + (-dy / len) * (bend || 0),
      cy = my + (dx / len) * (bend || 0);
    return "M" + f(p0[0]) + " " + f(p0[1]) + " Q" + f(cx) + " " + f(cy) + " " + f(p1[0]) + " " + f(p1[1]);
  };

  PK.thread = function (layer, d, cls) {
    return PK.el("path", { d: d, class: cls || "pk-thread" }, layer);
  };

  /*
    PK.trail(tl, layer, d, at, dur, ease): a dashed rust trail along d that is revealed
    BEHIND the traveller (a solid twin inside a mask draws on with the traveller's own
    duration and ease), then fades over 0.8 s from the arrival. Pass the traveller's ease.
    Use for any journey longer than about 150 world units. Trails show where information
    has travelled; they never run ahead of it.
  */
  var trailDefs = null,
    nTrail = 0;
  PK.trail = function (tl, layer, d, at, dur, ease) {
    if (!trailDefs) {
      var svg = layer.ownerSVGElement || layer;
      trailDefs = PK.el("defs", {}, svg);
    }
    var id = "pk-trail-" + nTrail++;
    var mask = PK.el("mask", { id: id, maskUnits: "userSpaceOnUse", x: -4000, y: -4000, width: 12000, height: 12000 }, trailDefs);
    var mp = PK.el("path", { d: d, fill: "none", stroke: "#fff", "stroke-width": 18, "stroke-linecap": "round" }, mask);
    gsap.set(mp, { drawSVG: "0% 0%" });
    var tp = PK.el("path", { d: d, class: "pk-trail", mask: "url(#" + id + ")" }, layer);
    gsap.set(tp, { opacity: 0 });
    tl.fromTo(mp, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: dur, ease: ease || "power2.inOut", immediateRender: false }, at);
    tl.fromTo(tp, { opacity: 0 }, { opacity: 1, duration: 0.05, ease: "none", immediateRender: false }, at);
    tl.fromTo(tp, { opacity: 1 }, { opacity: 0, duration: 0.8, ease: "power1.in", immediateRender: false }, at + dur);
    return tp;
  };

  /* A small rust bead (information in transit). r in world units. */
  PK.bead = function (layer, r, o) {
    o = o || {};
    var g = PK.g(layer);
    var c = PK.el("circle", { cx: 0, cy: 0, r: r || 3.2, fill: o.hollow ? PK.C.paper : PK.C.rust, stroke: o.hollow ? PK.C.rust : "none", "stroke-width": o.hollow ? (r || 3.2) * 0.4 : 0 }, g);
    gsap.set(g, { opacity: 0 });
    return { g: g, dot: c };
  };

  // ------------------------------------------------------------------ sound events
  PK.EVENTS = [];
  PK.sfx = function (kind, t, o) {
    var e = { kind: kind, t: Math.round(t * 1000) / 1000 };
    if (o) for (var k in o) e[k] = o[k];
    PK.EVENTS.push(e);
    return e;
  };

  // ------------------------------------------------------------------ sections
  PK.SECTIONS = [];
  PK.section = function (id, t0, t1, fn) {
    PK.SECTIONS.push({ id: id, t0: t0, t1: t1, fn: fn });
  };

  // ------------------------------------------------------------------ voiceover times
  // PK.word("L03", "repair") -> absolute start of that word; PK.word("L03", "a", 2) -> 2nd "a"
  PK.line = function (id) {
    var l = window.PK_VO && window.PK_VO.lines[id];
    if (!l) throw new Error("unknown VO line " + id);
    return l;
  };
  PK.word = function (id, w, n, edge) {
    var l = PK.line(id);
    var want = String(w).toLowerCase();
    var k = 0;
    for (var i = 0; i < l.words.length; i++) {
      if (l.words[i].w.toLowerCase() === want) {
        k++;
        if (k === (n || 1)) return edge === "end" ? l.words[i].end : l.words[i].start;
      }
    }
    throw new Error("word " + w + " #" + (n || 1) + " not in " + id);
  };

  // ------------------------------------------------------------------ glyphs
  PK.glyph = {};

  function token(parent, silhouette, shape, o) {
    o = o || {};
    var g = PK.g(parent, { class: "pk-token" });
    var body = PK.g(g);
    var shadow = PK.el("path", { d: silhouette, fill: PK.C.shadow, transform: "translate(1.3 2.3)" }, body);
    var fill = PK.el("path", { d: shape, fill: o.fill || PK.C.rust, "fill-rule": "evenodd" }, body);
    return { g: g, body: body, shadow: shadow, fill: fill };
  }

  /* Priora agent: rust disc with a concentric ring cut, an orbit ring and one bead. */
  PK.glyph.priora = function (parent) {
    var R = 17;
    var t = token(parent, PK.circlePath(0, 0, R), PK.circlePath(0, 0, R) + " " + PK.circlePath(0, 0, 11) + " " + PK.circlePath(0, 0, 8));
    t.orbit = PK.el("circle", { cx: 0, cy: 0, r: 26, fill: "none", stroke: PK.C.rust, "stroke-width": 1.1, "stroke-opacity": 0.55 }, t.body);
    t.beadG = PK.g(t.body);
    t.bead = PK.el("circle", { cx: 26, cy: 0, r: 3.4, fill: PK.C.rust }, t.beadG);
    t.body.insertBefore(t.orbit, t.shadow);
    t.R = R;
    return t;
  };

  /* Site rules: rounded square with one horizontal slit. */
  PK.glyph.siteRules = function (parent, s) {
    s = s || 24;
    var h = s / 2;
    var slit = PK.rectPath(-h * 0.58, -h * 0.42, h * 1.16, h * 0.26, h * 0.12);
    return token(parent, PK.rectPath(-h, -h, s, s, s * 0.17), PK.rectPath(-h, -h, s, s, s * 0.17) + " " + slit);
  };

  /* Insurer conditions: two square brackets that can open and close (.left, .right). */
  PK.glyph.insurer = function (parent, s) {
    s = s || 26;
    var h = s / 2,
      w = s * 0.34,
      th = s * 0.17;
    var lb = "M" + f(-h) + " " + f(-h) + " H" + f(-h + w) + " V" + f(-h + th) + " H" + f(-h + th) + " V" + f(h - th) + " H" + f(-h + w) + " V" + f(h) + " H" + f(-h) + " Z";
    var rb = "M" + f(h) + " " + f(-h) + " H" + f(h - w) + " V" + f(-h + th) + " H" + f(h - th) + " V" + f(h - th) + " H" + f(h - w) + " V" + f(h) + " H" + f(h) + " Z";
    var g = PK.g(parent, { class: "pk-token" });
    var body = PK.g(g);
    var left = PK.g(body);
    var right = PK.g(body);
    PK.el("path", { d: lb, fill: PK.C.shadow, transform: "translate(1.3 2.3)" }, left);
    PK.el("path", { d: lb, fill: PK.C.rust }, left);
    PK.el("path", { d: rb, fill: PK.C.shadow, transform: "translate(1.3 2.3)" }, right);
    PK.el("path", { d: rb, fill: PK.C.rust }, right);
    return { g: g, body: body, left: left, right: right };
  };

  /* Fire: triangle apex up with a small round hole; three cue dots above the apex (.dots). */
  PK.glyph.fire = function (parent, s) {
    s = s || 30;
    var h = s / 2;
    var tri = [
      [0, -h * 1.0],
      [h, h * 0.75],
      [-h, h * 0.75],
    ];
    var round = function (pts, r) {
      // rounded triangle via quadratic corners
      var out = "";
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i],
          a = pts[(i + pts.length - 1) % pts.length],
          b = pts[(i + 1) % pts.length];
        var da = Math.hypot(a[0] - p[0], a[1] - p[1]),
          db = Math.hypot(b[0] - p[0], b[1] - p[1]);
        var p1 = [p[0] + ((a[0] - p[0]) * r) / da, p[1] + ((a[1] - p[1]) * r) / da];
        var p2 = [p[0] + ((b[0] - p[0]) * r) / db, p[1] + ((b[1] - p[1]) * r) / db];
        out += (i === 0 ? "M" : " L") + f(p1[0]) + " " + f(p1[1]) + " Q" + f(p[0]) + " " + f(p[1]) + " " + f(p2[0]) + " " + f(p2[1]);
      }
      return out + " Z";
    };
    var shape = round(tri, s * 0.09);
    var t = token(parent, shape, shape + " " + PK.circlePath(0, h * 0.22, s * 0.12));
    t.dots = PK.g(t.body);
    [-1, 0, 1].forEach(function (k) {
      PK.el("circle", { cx: k * s * 0.18, cy: -h * 1.0 - s * 0.2 + Math.abs(k) * s * 0.06, r: s * 0.055, fill: PK.C.rust }, t.dots);
    });
    gsap.set(t.dots, { opacity: 0 });
    return t;
  };

  /* Risk engineering: diamond with a plus cut. */
  PK.glyph.riskEng = function (parent, s) {
    s = s || 30;
    var h = s / 2;
    var dia = PK.polyPath([
      [0, -h],
      [h, 0],
      [0, h],
      [-h, 0],
    ]);
    // aperture: a measuring ring around a centre point (a target), never a plus or a cross
    return token(parent, dia, dia + " " + PK.circlePath(0, 0, s * 0.2) + " " + PK.circlePath(0, 0, s * 0.085));
  };

  /* Evidence: disc with a square lens cut; four viewfinder corner ticks (.corners, hidden). */
  PK.glyph.evidence = function (parent, s) {
    s = s || 26;
    var h = s / 2,
      q = s * 0.17;
    var t = token(parent, PK.circlePath(0, 0, h), PK.circlePath(0, 0, h) + " " + PK.rectPath(-q, -q, 2 * q, 2 * q, q * 0.25));
    t.corners = PK.g(t.body);
    var c = s * 0.78,
      L = s * 0.24;
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].forEach(function (k) {
      var x = k[0] * c,
        y = k[1] * c;
      PK.el("path", { d: "M" + f(x) + " " + f(y - k[1] * L) + " V" + f(y) + " H" + f(x - k[0] * L), fill: "none", stroke: PK.C.rust, "stroke-width": s * 0.07, "stroke-linecap": "round" }, t.corners);
    });
    gsap.set(t.corners, { opacity: 0 });
    return t;
  };

  /* Room agents, smaller: kind = policy | authority | record | eng | verifier */
  PK.glyph.roomAgent = function (parent, kind, s) {
    s = s || 18;
    var h = s / 2;
    if (kind === "eng") return PK.glyph.riskEng(parent, s * 1.15);
    if (kind === "verifier") return PK.glyph.evidence(parent, s * 1.05);
    var sq = PK.rectPath(-h, -h, s, s, s * 0.18);
    var cut = "";
    if (kind === "policy") cut = PK.rectPath(-h * 0.56, -h * 0.14, h * 1.12, h * 0.28, h * 0.1);
    if (kind === "authority") cut = PK.rectPath(-h * 0.22, -h * 0.62, h * 0.44, h * 0.9, h * 0.1);
    // three short vertical slits (the design bible's record): never a head and shoulders, never a document
    if (kind === "record") cut = [-0.5, -0.1, 0.3].map(function (x) { return PK.rectPath(h * x, -h * 0.45, h * 0.2, h * 0.9, h * 0.08); }).join(" ");
    return token(parent, sq, sq + " " + cut);
  };

  /* Transfer room capacity agent: a dashed outline hexagon (simulated). */
  PK.glyph.carrier = function (parent, s) {
    s = s || 22;
    var r = s / 2;
    var pts = [];
    for (var i = 0; i < 6; i++) pts.push(PK.polar(0, 0, r, -90 + i * 60));
    var g = PK.g(parent, { class: "pk-token" });
    var body = PK.g(g);
    var hex = PK.el("path", { d: PK.polyPath(pts), class: "pk-sim" }, body);
    var inner = PK.el("circle", { cx: 0, cy: 0, r: r * 0.22, fill: "none", stroke: PK.C.rust, "stroke-width": r * 0.12, "stroke-dasharray": r * 0.2 + " " + r * 0.16 }, body);
    return { g: g, body: body, hex: hex, inner: inner };
  };

  // ------------------------------------------------------------------ the real world (ink)
  PK.glyph.worker = function (parent) {
    var g = PK.g(parent, { class: "pk-real" });
    var body = PK.g(g);
    PK.el("path", { d: "M-22 0 V-64 Q-22 -86 0 -86 Q22 -86 22 -64 V0 Z", fill: PK.C.ink }, body);
    var head = PK.g(body);
    PK.el("circle", { cx: 0, cy: -99, r: 11, fill: PK.C.ink }, head);
    // hard hat: a domed shell with a short peak, separated from the head by a hairline of paper
    PK.el("path", { d: "M-13.5 -104.5 C-13.5 -119.5 13.5 -119.5 13.5 -104.5 Z", fill: PK.C.ink }, head);
    PK.el("path", { d: "M-17.5 -105.6 H17.5 V-102.6 H-17.5 Z", fill: PK.C.ink }, head);
    PK.el("rect", { x: -1.6, y: -118.6, width: 3.2, height: 9, rx: 1.2, fill: PK.C.paper }, head);
    PK.el("rect", { x: -11, y: -102.6, width: 22, height: 1.3, fill: PK.C.paper }, head);
    return { g: g, body: body, head: head, top: -118 };
  };
  PK.glyph.site = function (parent) {
    var g = PK.g(parent, { class: "pk-real" });
    var body = PK.g(g);
    var shape = "M-80 0 V-98 L-26.67 -124 V-98 L26.67 -124 V-98 L80 -124 V0 Z";
    var door = PK.rectPath(-11, -36, 22, 36, 0);
    var win = PK.rectPath(40, -36, 24, 13, 1.5);
    PK.el("path", { d: shape + " " + door + " " + win, fill: PK.C.ink, "fill-rule": "evenodd" }, body);
    // the packing line point sits in the small window (world 1012, 730.5)
    var spark = PK.g(body, { transform: "translate(52 -29.5)" });
    PK.el("path", { d: "M0 -5.6 L1.3 -1.3 L5.6 0 L1.3 1.3 L0 5.6 L-1.3 1.3 L-5.6 0 L-1.3 -1.3 Z", fill: PK.C.ink }, spark);
    gsap.set(spark, { opacity: 0 });
    return { g: g, body: body, spark: spark, top: -124, packingLocal: [52, -29.5] };
  };
  PK.glyph.riskOwner = function (parent) {
    var g = PK.g(parent, { class: "pk-real" });
    var body = PK.g(g);
    PK.el("path", { d: "M-20 -40 V-64 Q-20 -86 0 -86 Q20 -86 20 -64 V-40 Z", fill: PK.C.ink }, body);
    PK.el("circle", { cx: 0, cy: -101, r: 11.5, fill: PK.C.ink }, body);
    var desk = PK.g(body);
    PK.el("rect", { x: -34, y: -50, width: 68, height: 50, fill: PK.C.ink }, desk);
    PK.el("rect", { x: -34, y: -50, width: 68, height: 1.6, fill: PK.C.paper }, desk);
    return { g: g, body: body, desk: desk, top: -112, hand: [24, -50] };
  };

  // ------------------------------------------------------------------ the case
  /*
    PK.glyph.caseToken(parent, o) -> {
      g, body, ring, core, facets: [ {key, angle, g, chip, mark, spoke, label} ],
      arcs: [ path ], fold(tl, at, dur), unfold(tl, at, dur)
    }
    Facets sit on the ring (folded) or out on spokes (unfolded, radius o.spokeR).
    o.labelSize: world font size for facet labels (create labels sized for the shot
    where they are read; builders may also replace them).
  */
  PK.FACETS = [
    { key: "repair", label: "Repair", angle: 210 },
    { key: "hot", label: "Hot work", angle: 270 },
    { key: "place", label: "Packing line", angle: 330 },
    { key: "time", label: "Before night shift", angle: 30 },
    { key: "conditions", label: "Site + insurance conditions", angle: 90 },
    { key: "photo", label: "Photo", angle: 150 },
  ];
  PK.facetMark = function (parent, key, r) {
    r = r || 4;
    var st = { fill: "none", stroke: PK.C.rust, "stroke-width": r * 0.38, "stroke-linecap": "round", "stroke-linejoin": "round" };
    var g = PK.g(parent);
    if (key === "repair") {
      PK.el("path", Object.assign({ d: "M" + f(-r * 0.7) + " " + f(-r * 0.8) + " V" + f(r * 0.7) + " H" + f(r * 0.8) }, st), g);
      PK.el("path", Object.assign({ d: "M" + f(-r * 1.0) + " " + f(-r * 0.05) + " L" + f(-r * 0.45) + " " + f(r * 0.05) }, st, { "stroke-width": r * 0.22 }), g);
    } else if (key === "hot") {
      var q = r * 0.95,
        k = r * 0.24;
      PK.el("path", { d: "M0 " + f(-q) + " L" + f(k) + " " + f(-k) + " L" + f(q) + " 0 L" + f(k) + " " + f(k) + " L0 " + f(q) + " L" + f(-k) + " " + f(k) + " L" + f(-q) + " 0 L" + f(-k) + " " + f(-k) + " Z", fill: PK.C.rust }, g);
    } else if (key === "place") {
      PK.el("circle", Object.assign({ cx: 0, cy: 0, r: r * 0.55 }, st), g);
      PK.el("path", Object.assign({ d: "M0 " + f(-r) + " V" + f(-r * 0.55) + " M0 " + f(r) + " V" + f(r * 0.55) + " M" + f(-r) + " 0 H" + f(-r * 0.55) + " M" + f(r) + " 0 H" + f(r * 0.55) }, st), g);
    } else if (key === "time") {
      PK.el("path", { d: "M" + f(r * 0.2) + " " + f(-r * 0.9) + " A" + f(r * 0.9) + " " + f(r * 0.9) + " 0 1 0 " + f(r * 0.85) + " " + f(r * 0.45) + " A" + f(r * 0.68) + " " + f(r * 0.68) + " 0 1 1 " + f(r * 0.2) + " " + f(-r * 0.9) + " Z", fill: PK.C.rust }, g);
    } else if (key === "conditions") {
      PK.el("path", Object.assign({ d: "M" + f(-r * 0.4) + " " + f(-r * 0.8) + " H" + f(-r * 0.85) + " V" + f(r * 0.8) + " H" + f(-r * 0.4) + " M" + f(r * 0.4) + " " + f(-r * 0.8) + " H" + f(r * 0.85) + " V" + f(r * 0.8) + " H" + f(r * 0.4) }, st), g);
    } else if (key === "photo") {
      PK.el("rect", Object.assign({ x: -r * 0.75, y: -r * 0.6, width: r * 1.5, height: r * 1.2, rx: r * 0.15 }, st), g);
    }
    return g;
  };

  PK.glyph.caseToken = function (parent, o) {
    o = o || {};
    var R = o.r || 22;
    var g = PK.g(parent, { class: "pk-case" });
    var body = PK.g(g);
    var arcsG = PK.g(body);
    var shadow = PK.el("circle", { cx: 1.3, cy: 2.3, r: R + 1.4, fill: PK.C.shadow }, body);
    var ring = PK.el("circle", { cx: 0, cy: 0, r: R, fill: PK.C.paper, stroke: PK.C.rust, "stroke-width": 2.4 }, body);
    var core = PK.el("circle", { cx: 0, cy: 0, r: 5.5, fill: PK.C.ink }, body);
    var facets = [];
    var spokeR = o.spokeR || 52;
    PK.FACETS.forEach(function (fc) {
      var fg = PK.g(body);
      var spoke = PK.el("path", { d: "M" + f(R + 2) + " 0 H" + f(spokeR - 8), fill: "none", stroke: PK.C.rust, "stroke-width": 1.1, "stroke-linecap": "round" }, fg);
      var chipG = PK.g(fg);
      var chip = PK.el("circle", { cx: 0, cy: 0, r: 7.2, fill: PK.C.paper, stroke: PK.C.rust, "stroke-width": 1.4 }, chipG);
      var mark = PK.facetMark(chipG, fc.key, 4.2);
      gsap.set(fg, { rotation: fc.angle, svgOrigin: "0 0" });
      // the chip counter-rotates so marks stay upright
      gsap.set(chipG, { x: R, rotation: -fc.angle, svgOrigin: "0 0" });
      gsap.set(spoke, { drawSVG: "0% 0%" });
      facets.push({ key: fc.key, angle: fc.angle, label: fc.label, g: fg, chipG: chipG, chip: chip, mark: mark, spoke: spoke, labelEl: null });
    });
    var c = { g: g, body: body, arcsG: arcsG, shadow: shadow, ring: ring, core: core, facets: facets, R: R, spokeR: spokeR };
    c.facet = function (key) {
      for (var i = 0; i < facets.length; i++) if (facets[i].key === key) return facets[i];
      throw new Error("no facet " + key);
    };
    /* a label for a facet, sized in world units, placed outside the unfolded chip */
    c.makeLabel = function (key, size, text) {
      var fc = c.facet(key);
      var p = PK.polar(0, 0, spokeR + 11 + size * 0.2, fc.angle);
      var cos = Math.cos((fc.angle * Math.PI) / 180);
      var anchor = Math.abs(cos) < 0.3 ? "middle" : cos > 0 ? "start" : "end";
      var dy = Math.abs(cos) < 0.3 ? (p[1] > 0 ? size * 0.75 : -size * 0.2) : size * 0.35;
      var t = PK.text(body, text || fc.label, p[0], p[1] + dy, { font: "mono", size: size, fill: PK.C.rust, anchor: anchor });
      gsap.set(t, { opacity: 0 });
      fc.labelEl = t;
      return t;
    };
    c.unfold = function (tl, at, dur, keys, o2) {
      (keys || PK.FACETS.map(function (x) { return x.key; })).forEach(function (k, i) {
        var fc = c.facet(k);
        var t0 = at + i * ((o2 && o2.stagger) || 0);
        tl.fromTo(fc.chipG, { x: R }, { x: spokeR, duration: dur, ease: "power3.out", immediateRender: false }, t0);
        tl.fromTo(fc.spoke, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: dur, ease: "power3.out", immediateRender: false }, t0);
      });
    };
    c.fold = function (tl, at, dur, keys, o2) {
      (keys || PK.FACETS.map(function (x) { return x.key; })).forEach(function (k, i) {
        var fc = c.facet(k);
        var t0 = at + i * ((o2 && o2.stagger) || 0);
        tl.fromTo(fc.chipG, { x: spokeR }, { x: R, duration: dur, ease: "power3.inOut", immediateRender: false }, t0);
        tl.fromTo(fc.spoke, { drawSVG: "0% 100%" }, { drawSVG: "0% 0%", duration: dur * 0.8, ease: "power2.in", immediateRender: false }, t0);
      });
    };
    return c;
  };

  // ------------------------------------------------------------------ chambers
  /*
    PK.glyph.chamber(parent, o) -> { g, walls, leafA, leafB, open(tl, at, dur), close(tl, at, dur), reject(tl, at) }
      o.x, o.y, o.w, o.h, o.r   rectangle in world units
      o.door: { side: "left" | "right", at: centre y of the door, gap }
      o.dashed: true for a simulated chamber
    The walls are drawn as one open path (drawable with PK.drawOn) leaving the door gap;
    the two door leaves cover the gap when closed and slide into the wall to open.
  */
  PK.glyph.chamber = function (parent, o) {
    var x = o.x,
      y = o.y,
      w = o.w,
      h = o.h,
      r = o.r || 16;
    var side = (o.door && o.door.side) || "right";
    var dc = o.door ? o.door.at : y + h / 2;
    var gap = o.door ? o.door.gap || 60 : 0;
    var g = PK.g(parent, { class: "pk-chamber" });
    var cls = o.dashed ? "pk-wall-dash" : "pk-wall";
    var d;
    var x2 = x + w,
      y2 = y + h;
    if (side === "right") {
      d =
        "M" + f(x2) + " " + f(dc + gap / 2) + " V" + f(y2 - r) + " A" + f(r) + " " + f(r) + " 0 0 1 " + f(x2 - r) + " " + f(y2) +
        " H" + f(x + r) + " A" + f(r) + " " + f(r) + " 0 0 1 " + f(x) + " " + f(y2 - r) +
        " V" + f(y + r) + " A" + f(r) + " " + f(r) + " 0 0 1 " + f(x + r) + " " + f(y) +
        " H" + f(x2 - r) + " A" + f(r) + " " + f(r) + " 0 0 1 " + f(x2) + " " + f(y + r) + " V" + f(dc - gap / 2);
    } else {
      d =
        "M" + f(x) + " " + f(dc - gap / 2) + " V" + f(y + r) + " A" + f(r) + " " + f(r) + " 0 0 1 " + f(x + r) + " " + f(y) +
        " H" + f(x2 - r) + " A" + f(r) + " " + f(r) + " 0 0 1 " + f(x2) + " " + f(y + r) +
        " V" + f(y2 - r) + " A" + f(r) + " " + f(r) + " 0 0 1 " + f(x2 - r) + " " + f(y2) +
        " H" + f(x + r) + " A" + f(r) + " " + f(r) + " 0 0 1 " + f(x) + " " + f(y2 - r) + " V" + f(dc + gap / 2);
    }
    var walls = PK.el("path", { d: d, class: cls }, g);
    var wx = side === "right" ? x2 : x;
    var leafA = PK.el("path", { d: "M" + f(wx) + " " + f(dc - gap / 2) + " V" + f(dc), class: cls }, g);
    var leafB = PK.el("path", { d: "M" + f(wx) + " " + f(dc) + " V" + f(dc + gap / 2), class: cls }, g);
    // door jambs: two short ticks marking the opening
    var jambs = PK.el(
      "path",
      {
        d: "M" + f(wx - 4) + " " + f(dc - gap / 2) + " H" + f(wx + 4) + " M" + f(wx - 4) + " " + f(dc + gap / 2) + " H" + f(wx + 4),
        class: "pk-hair",
      },
      g,
    );
    var ch = { g: g, walls: walls, leafA: leafA, leafB: leafB, jambs: jambs, door: { x: wx, y: dc, gap: gap, side: side }, rect: [x, y, w, h] };
    ch.open = function (tl, at, dur) {
      tl.fromTo(leafA, { y: 0 }, { y: -gap / 2 + 0.01, duration: dur || 0.35, ease: "power2.inOut", immediateRender: false }, at);
      tl.fromTo(leafB, { y: 0 }, { y: gap / 2 - 0.01, duration: dur || 0.35, ease: "power2.inOut", immediateRender: false }, at);
    };
    ch.close = function (tl, at, dur) {
      tl.fromTo(leafA, { y: -gap / 2 + 0.01 }, { y: 0, duration: dur || 0.35, ease: "power2.inOut", immediateRender: false }, at);
      tl.fromTo(leafB, { y: gap / 2 - 0.01 }, { y: 0, duration: dur || 0.35, ease: "power2.inOut", immediateRender: false }, at);
    };
    /* rejected: the closed door shudders and stays shut */
    ch.reject = function (tl, at) {
      var k = side === "right" ? 1 : -1;
      [leafA, leafB].forEach(function (lf) {
        tl.fromTo(lf, { x: 0 }, { keyframes: [{ x: 2.2 * k, duration: 0.06 }, { x: -1.6 * k, duration: 0.07 }, { x: 1.0 * k, duration: 0.07 }, { x: 0, duration: 0.08 }], immediateRender: false }, at);
      });
    };
    return ch;
  };
})();
