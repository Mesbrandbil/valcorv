/*
 * SketchKit: Act I's hand-drawn world for the Priora vision film.
 *
 * Graphite props, people and annotations drawn on the Nordhavn site (WORLD mode,
 * inside the site-kit SVG, world units) and on the paper around it (PAPER mode,
 * a 1920x1080 SVG overlay in screen px). Same visual universe as the graphite
 * site twin in site-kit.js: seeded vertex jitter (SiteKit.jitter), a 32 percent
 * overdraw pass, construction overshoot on straight edges, paper-filled solids,
 * clipped diagonal hatching, Plex Mono uppercase lettering with a tiny seeded
 * rotation and slightly irregular spacing. Graphite #3B3A36 and #8F8C86 only.
 *
 * Deterministic and seek-safe: every visual state is a tween property (DrawSVG,
 * attr, CSS opacity) placed with fromTo and explicit from-states. No callbacks
 * drive state, no randomness (mulberry32 on string hashes), no clocks, no
 * infinite repeats. Seeds come from content (kind + text + position), never from
 * the id prefix, so the same item built in two compositions draws identically
 * (the Act I landing frame and the Act II handoff frame match).
 *
 * Requires: gsap + DrawSVGPlugin (registered by the caller or here), site-data.js
 * (window.SITE_MODEL), site-kit.js (window.SiteKit), and assets/css/film-sketch.css.
 * Full documentation: docs/sketch-kit.md.
 *
 * CONTEXTS
 *   const W = SketchKit.world(site, { prefix, scene, refScale })   WORLD mode (site = SiteKit.mount(...))
 *   const P = SketchKit.paper(hostEl, { prefix, scene })          PAPER mode (appends svg.skt-paper, or adopts an <svg>)
 *     prefix    id prefix for every element this context creates (default: site prefix)
 *     scene     scene name written into sound events (default: prefix)
 *     refScale  screen px per world unit used to size screen-px parts at build time (default: the
 *               site camera at build time). Pass SketchKit.scaleOf(site.cameras.roof03) etc. per item.
 *   Positions (WORLD): [wx, wy] world, { plan: [x, y, z] }, an anchor name from SITE_MODEL.anchors or
 *   SketchKit.PLACES ('roof03Centre', 'sprinklerZone3Valve', 'loadingAreaCentre', 'gate', ...), or
 *   { anchor: name, plan: [dx, dy, dz] } (plan offset). Positions (PAPER): [x, y] screen px.
 *
 * ITEMS: every builder returns a handle
 *   h.root, h.id, h.parts            the <g> and named elements
 *   h.drawOn(tl, t, { speed, scene, events, eventOffset }) -> end time   stroke by stroke with DrawSVG
 *   h.undraw(tl, t, { dur }) -> end   reverse, for exits (scrubbing a story timeline needs none)
 *   h.fade(tl, t, from, to, dur, ease) -> end   root opacity (dim to 25 percent, recede, clear)
 *   h.slide(tl, t, { dx, dy, dur, fade }) -> end   root moves and fades (paper exits)
 *   Groups (h.children) draw their children in sequence; every child is itself an item.
 *
 * BUILDERS (see docs/sketch-kit.md for options and defaults)
 *   label(ctx, at, text|lines, o)                       hand-lettered Plex Mono label, optional leader
 *   figure(ctx, at, { pose, facing, heightPx })         entourage figure: standing, standing-side, walking, carrying
 *     fig.walk(tl, t, route, { dur | speedPx, stopShortPx, stepPeriod, fadeIn })   seek-safe walk + 2-step gait
 *   groupFigures(ctx, { kind: 'semicircle', centre, n, label } | { kind: 'file', route, n })
 *     grp.walk(tl, t, o)                                (file) contractors in file from the gate
 *   van(ctx, at, { heading, size });  van.drive(tl, t, { from, dur, ease })
 *   gate(ctx, at, { label })
 *   dottedPath(ctx, points, { arrow, closed, plan, spacingPx, lite, dash, label })
 *   valveTag(ctx, at, { text | lines, hand: 'a' | 'b', side, drop })
 *   activityMarker(ctx, at, { variant: 'small' | 'normal' | 'hot', label, dir }); m.breathe(tl, t, dur, o)
 *   activityField(ctx, { count, seed, exclude });       dense accumulation with dotted trails
 *   containment(ctx, points, o)                         loose HSE loop around a cluster
 *   safeguardItems(ctx, anchor, { refScale })           the five ticked safeguards around Roof 03
 *   conditionConnection(ctx, from, to, o); c.fray(tl, t, o); c.rejoin(tl, t, o)
 *   envelopeRedraw(ctx, { target, marginPx, refScale }) the envelope redrawn inward near Roof 03
 *   incidentBox(ctx, at, o)                             'INCIDENT · ROOF 03 · 16:07'
 *   detailCallout(ctx, box, { leaderTo })               Frame 2 clause detail D1 (PAPER)
 *   translationChain(ctx, box, o)                       procedure, permit, briefing, checklist + arrows (PAPER)
 *   evidence(ctx, kind, { x, y, pin }); evidenceBoard(ctx, { pins })   Frame 3 fragments (PAPER)
 *   questionMark(ctx, at, o); investigationLine(ctx, a, b, o)
 *   gapTimeline(ctx, o)                                 14:42 to DAY +2, THE GAP (PAPER)
 *   typeStack(ctx, at, lines, o)                        typeset Plex Sans statements (the three questions)
 * STATE HELPERS
 *   SketchKit.sprinklerHeadsFade(tl, site, t, { to, step, dur })   heads fade one by one from the valve
 *   SketchKit.followPin(tl, fragment, world, camFrom, camTo, t, dur, ease)   keep an evidence pin on a site point during a camera move
 *
 * SOUND EVENTS pushed to window.__filmEvents as { scene, type, t, dur, meta }:
 *   pencil, pencil-light, pencil-dots, hatch, letter, pen, ruler, tick, stamp,
 *   paper-slide, pin, footsteps, van, erase, fray (silent by design: a subtraction marker).
 */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const FW = 1920, FH = 1080, COS30 = 0.8660254;
  window.__filmEvents = window.__filmEvents || [];

  function SK() {
    const s = window.SiteKit;
    if (!s || !s.parseD || !s.jitter || !s.fmt) throw new Error('SketchKit: load assets/js/site-kit.js before sketch-kit.js');
    return s;
  }
  if (window.gsap && window.DrawSVGPlugin) window.gsap.registerPlugin(window.DrawSVGPlugin);

  // ------------------------------------------------------------ deterministic noise (as site-kit)
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rng = seed => mulberry32(hashStr(String(seed)));
  const f2 = v => (Math.round(v * 1000) / 1000).toString();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

  // ------------------------------------------------------------ type metrics (IBM Plex, from the woff2 files)
  const SANS_CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~·’‘“”–";
  const SANS_ADV = {
    300: '236,272,401,713,578,909,687,233,334,334,416,600,260,397,260,356,600,600,600,600,600,600,600,600,600,600,280,280,600,600,600,469,887,625,638,617,666,574,550,684,701,389,492,610,491,806,701,697,601,697,636,568,567,668,594,884,592,575,570,311,356,311,600,567,600,528,574,497,574,543,309,528,563,243,243,513,264,875,563,552,574,574,357,477,335,563,476,751,493,481,446,332,284,332,600,315,260,260,446,445,588',
    400: '236,284,419,713,598,927,694,242,335,335,450,600,272,399,272,383,600,600,600,600,600,600,600,600,600,600,292,292,600,600,600,477,891,641,653,621,671,583,559,695,707,400,510,634,501,812,707,708,606,708,640,581,572,678,609,891,613,593,580,317,383,317,600,565,600,534,580,503,580,549,324,528,568,250,250,527,272,873,568,560,580,580,367,487,351,568,492,768,507,499,464,343,314,343,600,326,273,273,475,474,588',
    500: '236,299,451,678,599,947,706,253,336,336,514,600,288,401,288,416,600,600,600,600,600,600,600,600,600,600,308,308,600,600,600,487,896,660,659,634,682,593,570,705,714,414,531,660,513,815,714,711,627,711,655,599,577,685,627,926,639,617,592,324,416,324,600,561,600,549,592,509,592,555,340,538,580,265,265,548,285,882,580,562,592,592,383,494,365,580,512,799,530,514,487,355,352,355,600,340,285,285,501,500,588',
  };
  const ADV = {};
  for (const w in SANS_ADV) { const a = SANS_ADV[w].split(',').map(Number); ADV[w] = {}; for (let i = 0; i < SANS_CHARS.length; i++) ADV[w][SANS_CHARS[i]] = a[i] / 1000; }
  function sansWidth(text, size, weight) { const t = ADV[weight] || ADV[400]; let w = 0; for (const ch of text) w += (t[ch] != null ? t[ch] : 0.56); return w * size; }
  function monoWidth(text, size, lsEm) { const n = text.length; return n * 0.6 * size + Math.max(0, n - 1) * (lsEm || 0) * size; }

  // ------------------------------------------------------------ geometry
  const iso = (x, y, z) => [(x - y) * COS30, (x + y) * 0.5 - (z || 0)];
  const planFromWorld = (w, z) => { const a = w[0] / COS30, b = 2 * (w[1] + (z || 0)); return [(a + b) / 2, (b - a) / 2, z || 0]; };
  function lineCmds(pts, closed) { const out = pts.map((p, i) => [i ? 'L' : 'M', [p[0], p[1]]]); if (closed) out.push(['Z', []]); return out; }
  function smoothCmds(pts, closed, k) {
    k = k == null ? 1 : k;
    const n = pts.length;
    if (n < 3) return lineCmds(pts, closed);
    const P = i => closed ? pts[((i % n) + n) % n] : pts[clamp(i, 0, n - 1)];
    const out = [['M', [pts[0][0], pts[0][1]]]];
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      out.push(['C', [p1[0] + (p2[0] - p0[0]) / 6 * k, p1[1] + (p2[1] - p0[1]) / 6 * k, p2[0] - (p3[0] - p1[0]) / 6 * k, p2[1] - (p3[1] - p1[1]) / 6 * k, p2[0], p2[1]]]);
    }
    if (closed) out.push(['Z', []]);
    return out;
  }
  function ellipseCmds(cx, cy, rx, ry) {
    const k = 0.5523;
    return [['M', [cx + rx, cy]], ['C', [cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry]], ['C', [cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy]],
      ['C', [cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry]], ['C', [cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy]], ['Z', []]];
  }
  // an open, slightly spiralling hand circle that overshoots its start (the way a pencil closes a ring)
  function handCircleCmds(cx, cy, r, seed, o) {
    o = o || {};
    const R = rng('hc' + seed);
    const a0 = o.a0 != null ? o.a0 : R() * 6.283, over = o.over != null ? o.over : 0.35 + R() * 0.4, ph = R() * 6.283;
    const ry = o.ry != null ? o.ry : r, n = o.n || 16, tot = (o.sweep || 6.283) + over, pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + tot * i / n, f = 1 + 0.035 * Math.sin(2 * a + ph) + (o.spiral != null ? o.spiral : 0.06) * (i / n - 0.5);
      pts.push([cx + Math.cos(a) * r * f, cy + Math.sin(a) * ry * f]);
    }
    return smoothCmds(pts, false);
  }
  function flatten(cmds, n) {
    n = n || 10;
    const polys = []; let cur = null, start = null, p = [0, 0];
    for (const [c, a] of cmds) {
      if (c === 'M') { cur = [[a[0], a[1]]]; polys.push(cur); start = p = [a[0], a[1]]; continue; }
      if (!cur) { cur = [[p[0], p[1]]]; polys.push(cur); }
      if (c === 'L') { p = [a[0], a[1]]; cur.push(p); }
      else if (c === 'H') { p = [a[0], p[1]]; cur.push(p); }
      else if (c === 'V') { p = [p[0], a[0]]; cur.push(p); }
      else if (c === 'C') {
        const [x1, y1, x2, y2, x, y] = a, x0 = p[0], y0 = p[1];
        for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; cur.push([u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y]); }
        p = [x, y];
      } else if (c === 'Q') {
        const [x1, y1, x, y] = a, x0 = p[0], y0 = p[1];
        for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; cur.push([u * u * x0 + 2 * u * t * x1 + t * t * x, u * u * y0 + 2 * u * t * y1 + t * t * y]); }
        p = [x, y];
      } else if (c === 'A') { p = [a[5], a[6]]; cur.push(p); }
      else if (c === 'Z') { if (start) { cur.push([start[0], start[1]]); p = start; } }
    }
    return polys;
  }
  function plLen(pl) { let L = 0; for (let i = 1; i < pl.length; i++) L += dist(pl[i - 1], pl[i]); return L; }
  function pointAt(pl, s) {
    let acc = 0;
    for (let i = 1; i < pl.length; i++) {
      const L = dist(pl[i - 1], pl[i]);
      if (acc + L >= s || i === pl.length - 1) {
        const t = L > 0 ? clamp((s - acc) / L, 0, 1) : 0;
        const tx = L > 0 ? (pl[i][0] - pl[i - 1][0]) / L : 1, ty = L > 0 ? (pl[i][1] - pl[i - 1][1]) / L : 0;
        return { p: [lerp(pl[i - 1][0], pl[i][0], t), lerp(pl[i - 1][1], pl[i][1], t)], t: [tx, ty] };
      }
      acc += L;
    }
    return { p: pl[0].slice(), t: [1, 0] };
  }
  function polyD(pts, closed) { return 'M' + pts.map(p => f2(p[0]) + ' ' + f2(p[1])).join('L') + (closed ? 'Z' : ''); }
  function straightSegs(cmds) {
    const segs = []; let cur = null, start = null;
    for (const [c, a] of cmds) {
      if (c === 'M') { cur = [a[0], a[1]]; start = cur; }
      else if (c === 'L') { segs.push([cur, [a[0], a[1]]]); cur = [a[0], a[1]]; }
      else if (c === 'Z') { if (cur && start && (cur[0] !== start[0] || cur[1] !== start[1])) segs.push([cur, start]); cur = start; }
      else if (c === 'C') { cur = [a[4], a[5]]; }
    }
    return segs;
  }
  function bbox(pts) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return [x0, y0, x1, y1]; }
  function hull(points) {
    const P = points.map(p => p.slice()).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (P.length < 3) return P;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    up.pop(); lo.pop();
    return lo.concat(up);
  }
  function segX(a, b, c, d) { // intersection parameter t on a->b with segment c->d, or null
    const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return (t >= 0 && t <= 1 && u >= 0 && u <= 1) ? t : null;
  }

  // ------------------------------------------------------------ DOM
  function mk(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  // ------------------------------------------------------------ places (plan) used by Act I, beyond SITE_MODEL.anchors
  const PLACES = {
    gate: { plan: [112, 40, 0], note: 'East end of the main road (y = 40). The demo draws no gate; site access reads from the road ends.' },
    gateOutside: { plan: [121, 40, 0] },
    contractorsStop: { plan: [98, 50, 0], note: 'Loading area apron, east of the trailer cabs.' },
    vanParked: { plan: [101, 44.5, 0] },
    lotoValve: { plan: [27.4, 19.5, 0], note: 'Foot of the Utilities east face, beside the road x = 29.' },
    toolboxTalk: { plan: [22, 63.5, 0], note: 'In front of the Laboratory south face.' },
    hseWalkLoop: { plan: [[31, 42.2, 0], [71.8, 42.2, 0], [72.2, 74.8, 0], [31.2, 75.2, 0]], note: 'Around the Warehouse on its ring roads.' },
  };
  function anchorWorld(name) {
    const M = window.SITE_MODEL || {};
    const a = (M.anchors && M.anchors[name]) || PLACES[name];
    if (!a) throw new Error("SketchKit: unknown anchor '" + name + "'");
    if (a.world && !Array.isArray(a.world[0])) return a.world.slice();
    if (a.plan && !Array.isArray(a.plan[0])) return iso(a.plan[0], a.plan[1], a.plan[2] || 0);
    throw new Error("SketchKit: anchor '" + name + "' has no single position");
  }
  function anchorPlan(name) {
    const M = window.SITE_MODEL || {};
    const a = (M.anchors && M.anchors[name]) || PLACES[name];
    if (a && a.plan && !Array.isArray(a.plan[0])) return a.plan.slice();
    return null;
  }

  // ------------------------------------------------------------ contexts
  const COUNTERS = {};
  function baseCtx(mode, o) {
    const ctx = { mode, prefix: o.prefix, scene: o.scene || o.prefix, refScale: 1 };
    ctx.id = kind => { const k = ctx.prefix; COUNTERS[k] = (COUNTERS[k] || 0) + 1; return ctx.prefix + '-sk-' + kind + '-' + COUNTERS[k]; };
    ctx.layer = l => (l && l.nodeType === 1) ? l : (l === 'ground' ? ctx.ground : ctx.top);
    ctx.u = o2 => (ctx.mode === 'world' ? 1 / ((o2 && o2.refScale) || ctx.refScale) : 1);
    return ctx;
  }
  function world(site, o) {
    o = o || {}; SK();
    const prefix = o.prefix || site.prefix || 'sk';
    const ctx = baseCtx('world', { prefix, scene: o.scene || prefix });
    ctx.site = site; ctx.svg = site.svg;
    ctx.refScale = o.refScale || (site.view ? FW / site.view.w : 7.1);
    ctx.ground = mk('g', { id: ctx.id('ground'), class: 'skt skt-world skt-ground-layer' });
    const before = site.rough && site.rough.root;
    if (before && before.parentNode === site.svg) site.svg.insertBefore(ctx.ground, before); else site.svg.appendChild(ctx.ground);
    ctx.top = mk('g', { id: ctx.id('top'), class: 'skt skt-world skt-top-layer' }, site.svg);
    ctx.defs = mk('defs', {}, ctx.top);
    ctx.pt = spec => {
      if (Array.isArray(spec)) return [spec[0], spec[1]];
      if (typeof spec === 'string') return anchorWorld(spec);
      if (spec && spec.plan && spec.anchor) { const b = anchorPlan(spec.anchor) || planFromWorld(anchorWorld(spec.anchor)); return iso(b[0] + spec.plan[0], b[1] + spec.plan[1], (b[2] || 0) + (spec.plan[2] || 0)); }
      if (spec && spec.plan) return iso(spec.plan[0], spec.plan[1], spec.plan[2] || 0);
      if (spec && spec.world) return spec.world.slice();
      throw new Error('SketchKit: bad position ' + JSON.stringify(spec));
    };
    ctx.plan = spec => {
      if (typeof spec === 'string') return anchorPlan(spec) || planFromWorld(anchorWorld(spec));
      if (spec && spec.plan && spec.anchor) { const b = anchorPlan(spec.anchor) || planFromWorld(anchorWorld(spec.anchor)); return [b[0] + spec.plan[0], b[1] + spec.plan[1], (b[2] || 0) + (spec.plan[2] || 0)]; }
      if (spec && spec.plan) return [spec.plan[0], spec.plan[1], spec.plan[2] || 0];
      if (Array.isArray(spec)) return planFromWorld(spec, 0);
      throw new Error('SketchKit: bad plan position ' + JSON.stringify(spec));
    };
    return ctx;
  }
  function paper(host, o) {
    o = o || {}; SK();
    const ctx = baseCtx('paper', { prefix: o.prefix || (host && host.id) || 'skp', scene: o.scene });
    let svg;
    if (host && host.localName === 'svg') { svg = host; svg.classList.add('skt', 'skt-paper'); svg.setAttribute('viewBox', '0 0 1920 1080'); }
    else svg = mk('svg', { id: ctx.id('paper'), class: 'skt skt-paper', viewBox: '0 0 1920 1080', width: '1920', height: '1080' }, host);
    ctx.svg = svg;
    ctx.defs = mk('defs', {}, svg);
    ctx.ground = ctx.top = mk('g', { class: 'skt-top-layer' }, svg);
    ctx.pt = spec => { if (Array.isArray(spec)) return [spec[0], spec[1]]; throw new Error('SketchKit paper: positions are [x, y] screen px'); };
    ctx.plan = () => { throw new Error('SketchKit paper: plan positions exist only in world mode'); };
    return ctx;
  }
  // screen-constant group at a position: world -> translate + scale(--sw) with --sw reset to 1 inside
  function pxAt(ctx, parent, p) {
    const g = mk('g', { transform: 'translate(' + f2(p[0]) + ' ' + f2(p[1]) + ')' }, parent);
    if (ctx.mode !== 'world') return g;
    return mk('g', { class: 'skt-u' }, mk('g', { class: 'skt-px' }, g));
  }
  function clipRect(ctx, el, x, y, w, h) {
    const cid = ctx.id('clip');
    const cp = mk('clipPath', { id: cid }, ctx.defs);
    const r = mk('rect', { x: f2(x), y: f2(y), width: f2(w), height: f2(h) }, cp);
    el.setAttribute('clip-path', 'url(#' + cid + ')');
    return r;
  }

  // ------------------------------------------------------------ primitives
  // hand(): one drawn line = main pass + overdraw pass (+ construction overshoot), like the site twin.
  // Amounts are in screen px at the reference scale; o.u converts to the current space (world units per px).
  function hand(ctx, parent, d, o) {
    const S = SK(); o = o || {};
    const u = o.u != null ? o.u : 1;
    const cmds = typeof d === 'string' ? S.parseD(d) : d;
    const amt = (o.jit != null ? o.jit : 0.8) * u;
    const seed = o.seed || 'x';
    const mc = amt > 0 ? S.jitter(cmds, 'm' + seed, amt) : cmds;
    const rec = { cmds, u, amt, seed, d: S.fmt(mc) };
    if (o.occ) rec.occ = mk('path', { class: 'skt-occ', d: rec.d }, parent);
    rec.main = mk('path', { class: 'skt-m' + (o.cls ? ' ' + o.cls : ''), d: rec.d }, parent);
    if (o.over !== false) rec.over = mk('path', { class: 'skt-o', d: S.fmt(S.jitter(cmds, 'o' + seed, amt * 1.5 + 0.25 * u)) }, parent);
    if (o.ext) {
      const r = rng('e' + seed); let ed = '';
      for (const [p0, p1] of straightSegs(cmds)) {
        const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy);
        if (L < (o.extMin || 18) * u) continue;
        const ux = dx / L, uy = dy / L, e0 = (3 + r() * 6) * u, e1 = (3 + r() * 6) * u;
        ed += 'M' + f2(p0[0] - ux * e0) + ' ' + f2(p0[1] - uy * e0) + 'L' + f2(p0[0]) + ' ' + f2(p0[1]) + 'M' + f2(p1[0]) + ' ' + f2(p1[1]) + 'L' + f2(p1[0] + ux * e1) + ' ' + f2(p1[1] + uy * e1);
      }
      if (ed) rec.ext = mk('path', { class: 'skt-x', d: ed }, parent);
    }
    rec.len = flatten(cmds).reduce((a, p) => a + plLen(p), 0) / u;
    const straight = cmds.length === 2 && cmds[1][0] === 'L';
    rec.type = o.type || (o.cls && /lite|pale/.test(o.cls) ? 'pencil-light' : (straight && rec.len >= 160 ? 'ruler' : 'pencil'));
    return rec;
  }
  // clipped diagonal hatching inside a polygon (site-kit's shade language)
  function hatch(ctx, parent, poly, o) {
    o = o || {};
    const u = o.u != null ? o.u : 1;
    const cid = ctx.id('hc');
    const cp = mk('clipPath', { id: cid }, ctx.defs);
    mk('path', { d: o.clipD || polyD(poly, true), 'clip-rule': o.evenodd ? 'evenodd' : null }, cp);
    const [x0, y0, x1, y1] = bbox(poly), hgt = y1 - y0, sp = (o.spacing || 5) * u, r = rng('h' + (o.seed || ''));
    const dir = o.dir === -1 ? -1 : 1;
    let d = '';
    for (let x = x0 - hgt; x < x1 + hgt; x += sp) {
      const j = (r() - 0.5) * sp * 0.18;
      if (dir === 1) d += 'M' + f2(x + j) + ' ' + f2(y1 + u) + 'L' + f2(x + hgt + j + u) + ' ' + f2(y0 - u);
      else d += 'M' + f2(x + j) + ' ' + f2(y0 - u) + 'L' + f2(x + hgt + j + u) + ' ' + f2(y1 + u);
    }
    return mk('path', { class: 'skt-h' + (o.sparse ? ' skt-sparse' : ''), 'clip-path': 'url(#' + cid + ')', d }, parent);
  }
  // hand lettering: Plex Mono uppercase, per-glyph irregular spacing, rotation under 0.8 degrees, wipe-in clip
  function letters(ctx, parent, text, x, y, o) {
    o = o || {};
    text = o.keepCase ? String(text) : String(text).toUpperCase();
    const fs = o.size || 15, lsEm = o.ls != null ? o.ls : 0.12, n = text.length;
    const r = rng('lt' + (o.seed || '') + text);
    const irr = o.irregular === false ? 0 : (o.irr != null ? o.irr : 0.06);
    const dx = []; let extra = 0;
    for (let i = 0; i < n; i++) { const j = i ? (r() - 0.5) * 2 * irr * fs : 0; dx.push(j); extra += j; }
    const w = monoWidth(text, fs, lsEm) + extra;
    const rot = o.rot != null ? o.rot : (r() - 0.5) * 1.4;
    const anchor = o.anchor || 'start';
    const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    const wrap = mk('g', { class: 'skt-tw' }, parent);
    const t = mk('text', {
      class: 'skt-lab' + (o.weight >= 600 ? ' skt-w6' : o.weight >= 500 ? ' skt-w5' : '') + (o.tone ? ' ' + o.tone : ''),
      x: f2(x0), y: f2(y), 'font-size': fs, 'letter-spacing': f2(lsEm * fs),
      transform: 'rotate(' + rot.toFixed(2) + ' ' + f2(x0) + ' ' + f2(y) + ')',
    }, wrap);
    if (irr) t.setAttribute('dx', dx.map(f2).join(' '));
    t.textContent = text;
    const full = w + 8 + lsEm * fs;
    const clip = clipRect(ctx, wrap, x0 - 4, y - fs * 1.2, full, fs * 1.8);
    return { el: t, wrap, clip, w, x0, x1: x0 + w, y, fs, full, text };
  }
  // typeset Plex Sans (clauses, statements): clean, no jitter, set with a quick wipe
  function sans(ctx, parent, text, x, y, o) {
    o = o || {};
    const fs = o.size || 26, wt = o.weight || 400, ls = o.ls || 0;
    const w = sansWidth(text, fs, wt) + ls * fs * Math.max(0, text.length - 1);
    const anchor = o.anchor || 'start';
    const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    const wrap = mk('g', { class: 'skt-tw' }, parent);
    const t = mk('text', {
      class: 'skt-sans' + (wt <= 300 ? ' skt-w3' : wt >= 500 ? ' skt-w5' : '') + (o.tone ? ' ' + o.tone : ''),
      x: f2(x0), y: f2(y), 'font-size': fs, 'letter-spacing': ls ? f2(ls * fs) : null,
    }, wrap);
    t.textContent = text;
    const full = w + fs * 0.6;
    const clip = clipRect(ctx, wrap, x0 - fs * 0.2, y - fs * 1.15, full, fs * 1.6);
    return { el: t, wrap, clip, w, x0, x1: x0 + w, y, fs, full, text };
  }
  function tickCmds(x, y, s) { s = s || 1; return [['M', [x - 5 * s, y - 0.8 * s]], ['L', [x - 1.4 * s, y + 4 * s]], ['L', [x + 7.6 * s, y - 7.4 * s]]]; }
  function qmarkCmds(x, y, s) {
    const P = [[-0.25, -0.70], [-0.19, -0.87], [0, -0.95], [0.2, -0.88], [0.26, -0.71], [0.17, -0.55], [0.03, -0.44], [-0.005, -0.31], [0, -0.2]];
    return smoothCmds(P.map(p => [x + p[0] * s, y + p[1] * s]), false);
  }
  function scribbleCmds(x, y, w, h, seed) { // a signature: a few connected loops, then a trailing stroke
    const R = rng('sig' + seed), pts = []; const n = 9;
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([x + w * t * 0.82 + (i % 2 ? -w * 0.05 : 0), y + (i % 2 ? -h : h * 0.35) * (0.55 + R() * 0.5)]); }
    pts.push([x + w * 0.9, y + h * 0.1], [x + w, y - h * 0.15]);
    return smoothCmds(pts, false);
  }

  // ------------------------------------------------------------ items and groups
  function strokeDur(lenPx, pace) { return clamp(0.1 + lenPx / (pace || 720), 0.12, 1.4); }
  function emit(ctx, o, type, t, dur, meta) {
    if (o && o.events === false) return;
    window.__filmEvents.push({ scene: (o && o.scene) || ctx.scene, type, t: +((t + ((o && o.eventOffset) || 0))).toFixed(3), dur: +dur.toFixed(3), meta: meta || {} });
  }
  class Item {
    constructor(ctx, kind, o) {
      o = o || {};
      this.ctx = ctx; this.kind = kind; this.id = ctx.id(kind);
      this.root = mk('g', { id: this.id, class: 'skt-item skt-' + kind }, ctx.layer(o.layer));
      this.steps = []; this.cur = 0; this.parts = {};
    }
    add(s) { if (s.at == null) s.at = this.cur; this.steps.push(s); this.cur = s.at + s.dur * (s.advance != null ? s.advance : 1); return s; }
    gap(sec) { this.cur += sec; return this; }
    stroke(rec, o) { o = o || {}; return this.add({ kind: 'stroke', rec, dur: o.dur || strokeDur(rec.len, o.pace), at: o.at, advance: o.advance != null ? o.advance : 0.82, type: o.type !== undefined ? o.type : rec.type, meta: o.meta, ease: o.ease }); }
    draw(el, lenPx, o) { o = o || {}; return this.add({ kind: 'draw', el, dur: o.dur || strokeDur(lenPx, o.pace), at: o.at, advance: o.advance, type: o.type !== undefined ? o.type : 'pencil', meta: o.meta, ease: o.ease || 'none' }); }
    wipe(lab, o) { o = o || {}; return this.add({ kind: 'wipe', lab, dur: o.dur || clamp(0.12 + lab.w / (o.pace || 300), 0.2, 1.8), at: o.at, advance: o.advance, type: o.type !== undefined ? o.type : 'letter', meta: Object.assign({ text: lab.text }, o.meta || {}), ease: o.ease }); }
    fadeIn(el, o) { o = o || {}; return this.add({ kind: 'fade', el, from: o.from != null ? o.from : 0, to: o.to != null ? o.to : 1, dur: o.dur || 0.3, at: o.at, advance: o.advance, type: o.type || null, meta: o.meta }); }
    pop(el, o) { o = o || {}; return this.add({ kind: 'pop', el, cx: o.cx || 0, cy: o.cy || 0, dur: o.dur || 0.12, at: o.at, advance: o.advance, type: o.type || null, meta: o.meta, scale: o.scale || 1.12 }); }
    fn(f, o) { o = o || {}; return this.add({ kind: 'fn', f, dur: o.dur || 0.2, at: o.at, advance: o.advance, type: o.type || null, meta: o.meta }); }
    get duration() { let e = 0; for (const s of this.steps) e = Math.max(e, s.at + s.dur); return e; }
    drawOn(tl, t, o) {
      o = o || {};
      const k = 1 / (o.speed || 1); let end = t;
      for (const s of this.steps) {
        const t0 = t + s.at * k, d = Math.max(0.02, s.dur * k);
        runStep(tl, s, t0, d);
        if (s.type) emit(this.ctx, o, s.type, t0, d, Object.assign({ item: this.id }, s.meta || {}));
        end = Math.max(end, t0 + d);
      }
      return end;
    }
    undraw(tl, t, o) {
      o = o || {};
      const dur = o.dur || 0.6, list = this.steps.slice().reverse(), n = Math.max(1, list.length);
      list.forEach((s, i) => { const t0 = t + (i / n) * dur * 0.6, d = dur * 0.4; unrunStep(tl, s, t0, d); });
      if (o.sound) emit(this.ctx, o, 'erase', t, dur, { item: this.id });
      return t + dur;
    }
    fade(tl, t, from, to, dur, ease) {
      tl.fromTo(this.root, { opacity: from }, { opacity: to, duration: dur || 0.4, ease: ease || 'power1.inOut', immediateRender: false }, t);
      return t + (dur || 0.4);
    }
    slide(tl, t, o) {
      o = o || {};
      const dur = o.dur || 0.8, dx = o.dx != null ? o.dx : -140, dy = o.dy || 0;
      tl.fromTo(this.root, { attr: { transform: 'translate(0 0)' } }, { attr: { transform: 'translate(' + dx + ' ' + dy + ')' }, duration: dur, ease: o.ease || 'power2.in', immediateRender: false }, t);
      if (o.fade !== false) tl.fromTo(this.root, { opacity: 1 }, { opacity: 0, duration: dur * 0.9, ease: 'power1.in', immediateRender: false }, t + dur * 0.1);
      emit(this.ctx, o, 'paper-slide', t, dur, { item: this.id, exit: true });
      return t + dur;
    }
  }
  function runStep(tl, s, t0, d) {
    const IR = true;
    if (s.kind === 'stroke') {
      const r = s.rec;
      if (r.occ) tl.fromTo(r.occ, { opacity: 0 }, { opacity: 1, duration: 0.01, immediateRender: IR }, t0);
      tl.fromTo(r.main, { drawSVG: '0%' }, { drawSVG: '100%', duration: d, ease: s.ease || 'power1.inOut', immediateRender: IR }, t0);
      if (r.over) tl.fromTo(r.over, { drawSVG: '0%' }, { drawSVG: '100%', duration: d * 0.8, ease: 'power1.inOut', immediateRender: IR }, t0 + d * 0.45);
      if (r.ext) tl.fromTo(r.ext, { drawSVG: '0%' }, { drawSVG: '100%', duration: Math.min(0.22, d * 0.6), ease: 'power1.out', immediateRender: IR }, t0 + d * 0.9);
    } else if (s.kind === 'draw') {
      tl.fromTo(s.el, { drawSVG: '0%' }, { drawSVG: '100%', duration: d, ease: s.ease, immediateRender: IR }, t0);
    } else if (s.kind === 'wipe') {
      tl.fromTo(s.lab.clip, { attr: { width: 0 } }, { attr: { width: f2(s.lab.full) }, duration: d, ease: s.ease || 'power1.inOut', immediateRender: IR }, t0);
    } else if (s.kind === 'fade') {
      tl.fromTo(s.el, { opacity: s.from }, { opacity: s.to, duration: d, ease: 'power1.inOut', immediateRender: IR }, t0);
    } else if (s.kind === 'pop') {
      const a = f2(s.cx), b = f2(s.cy), m = (v) => 'translate(' + a + ' ' + b + ') scale(' + v + ') translate(' + f2(-s.cx) + ' ' + f2(-s.cy) + ')';
      tl.fromTo(s.el, { opacity: 0 }, { opacity: 1, duration: Math.min(0.06, d), ease: 'none', immediateRender: IR }, t0);
      tl.fromTo(s.el, { attr: { transform: m(s.scale) } }, { attr: { transform: m(1) }, duration: d, ease: 'power3.out', immediateRender: IR }, t0);
    } else if (s.kind === 'fn') {
      s.f(tl, t0, d);
    }
  }
  function unrunStep(tl, s, t0, d) {
    if (s.kind === 'stroke') {
      const r = s.rec;
      tl.fromTo(r.main, { drawSVG: '0% 100%' }, { drawSVG: '0% 0%', duration: d, ease: 'power1.in', immediateRender: false }, t0);
      if (r.over) tl.fromTo(r.over, { drawSVG: '0% 100%' }, { drawSVG: '0% 0%', duration: d * 0.8, ease: 'power1.in', immediateRender: false }, t0);
      if (r.ext) tl.fromTo(r.ext, { opacity: 1 }, { opacity: 0, duration: d * 0.5, immediateRender: false }, t0);
      if (r.occ) tl.fromTo(r.occ, { opacity: 1 }, { opacity: 0, duration: 0.01, immediateRender: false }, t0 + d);
    } else if (s.kind === 'draw') {
      tl.fromTo(s.el, { drawSVG: '0% 100%' }, { drawSVG: '0% 0%', duration: d, ease: 'power1.in', immediateRender: false }, t0);
    } else if (s.kind === 'wipe') {
      tl.fromTo(s.lab.clip, { attr: { width: f2(s.lab.full) } }, { attr: { width: 0 }, duration: d, ease: 'power1.in', immediateRender: false }, t0);
    } else if (s.kind === 'fade') {
      tl.fromTo(s.el, { opacity: s.to }, { opacity: s.from, duration: d, immediateRender: false }, t0);
    } else if (s.kind === 'pop') {
      tl.fromTo(s.el, { opacity: 1 }, { opacity: 0, duration: d * 0.5, immediateRender: false }, t0);
    }
  }
  class Group extends Item {
    constructor(ctx, kind, o) { super(ctx, kind, o); this.children = []; this.after = []; }
    child(item, o) { this.children.push(item); this.after.push(o || {}); return item; }
    get duration() { let t = 0, e = 0; this.children.forEach((c, i) => { const a = this.after[i]; const st = i === 0 ? 0 : (a.stagger != null ? t + a.stagger : e + (a.gap != null ? a.gap : -0.1)); t = st; e = Math.max(e, st + c.duration); }); return e; }
    drawOn(tl, t, o) {
      o = o || {};
      const k = 1 / (o.speed || 1);
      let start = t, end = t;
      this.children.forEach((c, i) => {
        const a = this.after[i];
        const st = i === 0 ? t : (a.stagger != null ? start + a.stagger * k : end + (a.gap != null ? a.gap : -0.1) * k);
        start = st;
        end = Math.max(end, c.drawOn(tl, st, o));
      });
      end = Math.max(end, Item.prototype.drawOn.call(this, tl, t, o));
      return end;
    }
    undraw(tl, t, o) {
      o = o || {};
      const dur = o.dur || 0.8, n = this.children.length;
      this.children.slice().reverse().forEach((c, i) => c.undraw(tl, t + (i / Math.max(1, n)) * dur * 0.5, { dur: dur * 0.5, events: false }));
      Item.prototype.undraw.call(this, tl, t, o);
      return t + dur;
    }
  }

  // ------------------------------------------------------------ 0. label
  function label(ctx, at, text, o) {
    o = o || {};
    const it = new Item(ctx, 'label', o);
    const g = pxAt(ctx, it.root, ctx.pt(at));
    const lines = Array.isArray(text) ? text : String(text).split('\n');
    const fs = o.size || 15, lh = o.lh || fs * 1.32;
    let lx = 0, ly = 0, anchor = o.anchor || 'start';
    const seed = o.seed || ('lb' + lines.join('|'));
    if (o.leader) {
      const [dx, dy] = o.leader;
      if (o.dot !== false) { const dot = mk('circle', { class: 'skt-fill', r: o.dotR || 1.9 }, g); it.pop(dot, { dur: 0.1, scale: 1.6 }); }
      const rec = hand(ctx, g, 'M0 0L' + f2(dx) + ' ' + f2(dy), { seed: seed + 'l', cls: 'skt-lite', over: false, jit: 0.45 });
      it.stroke(rec, { dur: 0.22 });
      if (!o.anchor) anchor = dx < 0 ? 'end' : 'start';
      lx = dx + (anchor === 'end' ? -5 : anchor === 'start' ? 5 : 0);
      ly = dy <= 0 ? dy - 4 - (lines.length - 1) * lh : dy + fs * 0.95;
      if (o.shelf !== false && Math.abs(dy) > 2) {
        // label sits on the leader's end, the way a draughtsman letters on a leader
        ly = dy + fs * 0.34 - (lines.length - 1) * lh * 0.5;
      }
    }
    it.lines = lines.map((ln, i) => { const lb = letters(ctx, g, ln, lx + (o.dx || 0), ly + (o.dy || 0) + i * lh, { size: fs, weight: o.weight, anchor, seed, ls: o.ls, tone: o.tone, rot: o.rot }); it.wipe(lb, { pace: o.pace }); return lb; });
    it.parts.group = g;
    return it;
  }

  // ------------------------------------------------------------ 1. figures (entourage)
  function armShape(pts, w) {
    const left = [], right = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
      const ww = w * (i === pts.length - 1 ? 0.82 : 1);
      left.push([pts[i][0] - ty * ww, pts[i][1] + tx * ww]); right.push([pts[i][0] + ty * ww, pts[i][1] - tx * ww]);
    }
    const e = pts[pts.length - 1], p = pts[pts.length - 2]; let tx = e[0] - p[0], ty = e[1] - p[1]; const L = Math.hypot(tx, ty) || 1;
    return left.concat([[e[0] + tx / L * w * 0.95, e[1] + ty / L * w * 0.95]], right.reverse());
  }
  function poseFront() {
    const L = [[-0.030, -0.842], [-0.088, -0.829], [-0.122, -0.806], [-0.136, -0.752], [-0.141, -0.655], [-0.137, -0.556], [-0.127, -0.482], [-0.109, -0.478],
      [-0.104, -0.585], [-0.099, -0.700], [-0.093, -0.612], [-0.091, -0.492], [-0.086, -0.300], [-0.079, -0.066], [-0.087, -0.006], [-0.031, -0.006],
      [-0.025, -0.212], [-0.011, -0.418], [0, -0.442]];
    const R = L.slice(0, -1).reverse().map(([x, y]) => [-x, y]);
    return { body: L.concat(R), head: [0, -0.909, 0.055, 0.066], arms: [] };
  }
  function poseSide(f1, f2v, sw) {
    const hipY = -0.465;
    const leg = (hx, f) => {
      const ax = t => hx + (f - hx) * t, ay = t => hipY + (-0.04 - hipY) * t;
      const bend = f > hx ? 0.012 : -0.004;
      return {
        back: [[ax(0.28) - 0.045, ay(0.28)], [ax(0.55) - 0.036 + bend, ay(0.55)], [ax(0.8) - 0.03, ay(0.8)], [f - 0.026, -0.046]],
        foot: [[f - 0.033, -0.005], [f + 0.058, -0.005], [f + 0.052, -0.027]],
        fr: [[f + 0.016, -0.056], [ax(0.8) + 0.02, ay(0.8)], [ax(0.55) + 0.03 + bend, ay(0.55)], [ax(0.28) + 0.036, ay(0.28)]],
      };
    };
    const l1 = leg(-0.012, f1), l2 = leg(0.012, f2v);
    const body = [[-0.024, -0.840], [-0.056, -0.809], [-0.066, -0.733], [-0.064, -0.620], [-0.058, -0.505]]
      .concat(l1.back, l1.foot, l1.fr, [[0.004, -0.43]], l2.back, l2.foot, l2.fr,
        [[0.052, -0.49], [0.058, -0.602], [0.062, -0.716], [0.050, -0.801], [0.018, -0.840]]);
    const sh = [0.0, -0.792], el = [sw * 0.052, -0.645], hd = [0.004 + sw * 0.112, -0.508];
    return { body, head: [0.012, -0.909, 0.057, 0.066], arms: [armShape([sh, el, hd], 0.023)], hand: hd };
  }
  function poseGeo(pose, phase) {
    if (pose === 'standing' || pose === 'front') return poseFront();
    if (pose === 'standing-side') return poseSide(-0.02, 0.028, 0.05);
    if (pose === 'carrying') return phase ? poseSide(0.1, -0.11, 0.08) : poseSide(-0.11, 0.1, 0.08);
    // walking: legs scissor, the near arm swings against the near leg
    return phase ? poseSide(0.105, -0.125, 0.75) : poseSide(-0.125, 0.105, -0.75);
  }
  function figure(ctx, at, o) {
    o = o || {};
    const it = new Item(ctx, 'figure', o);
    const S = SK();
    const u = ctx.u(o);
    const h = (o.heightPx || (ctx.mode === 'world' ? 26 : 34)) * u;
    const p = ctx.pt(at);
    it.u = u; it.h = h; it.pos = p;
    it.root.setAttribute('transform', 'translate(' + f2(p[0]) + ' ' + f2(p[1]) + ')');
    const facing = o.facing === -1 ? -1 : 1;
    it.face = mk('g', { transform: 'scale(' + facing + ' 1)' }, it.root);
    const pose = o.pose || 'standing';
    const seed = o.seed || ('fig' + pose + f2(p[0]) + f2(p[1]));
    const jit = o.jit != null ? o.jit : 0.32;
    const sc = pts => pts.map(([x, y]) => [x * h, y * h]);
    const A = poseGeo(pose, 0);
    const bodyC = smoothCmds(sc(A.body), true);
    const headC = ellipseCmds(A.head[0] * h, A.head[1] * h, A.head[2] * h, A.head[3] * h);
    const head = hand(ctx, it.face, headC, { u, seed: seed + 'h', jit: jit * 0.5, occ: true, over: o.over });
    const body = hand(ctx, it.face, bodyC, { u, seed: seed + 'b', jit, occ: true, over: o.over });
    if (o.tone) {
      const toneClip = flatten(bodyC)[0];
      it.parts.tone = hatch(ctx, it.face, toneClip.filter(q => q[0] < 0.02 * h), { u, spacing: 2.2, seed: seed + 't', sparse: true });
    }
    const arms = A.arms.map((a, i) => hand(ctx, it.face, smoothCmds(sc(a), true), { u, seed: seed + 'a' + i, jit: jit * 0.8, occ: true, over: false, cls: 'skt-fine' }));
    const extras = [];
    if (o.carry === 'box' || (pose === 'carrying' && o.carry !== 'pipe' && o.carry !== false)) {
      const hd = A.hand || [0.06, -0.5];
      const bx = hd[0] * h, by = hd[1] * h;
      const bw = 0.15 * h, bh = 0.1 * h;
      extras.push(hand(ctx, it.face, 'M' + f2(bx - bw * 0.35) + ' ' + f2(by + 0.02 * h) + 'L' + f2(bx + bw * 0.65) + ' ' + f2(by + 0.02 * h) + 'L' + f2(bx + bw * 0.65) + ' ' + f2(by + 0.02 * h + bh) + 'L' + f2(bx - bw * 0.35) + ' ' + f2(by + 0.02 * h + bh) + 'Z', { u, seed: seed + 'bx', jit: jit * 0.6, occ: true, over: false, cls: 'skt-fine' }));
    } else if (o.carry === 'pipe') {
      extras.push(hand(ctx, it.face, 'M' + f2(-0.34 * h) + ' ' + f2(-0.868 * h) + 'L' + f2(0.4 * h) + ' ' + f2(-0.812 * h), { u, seed: seed + 'pp', jit: jit * 0.6, over: false, cls: 'skt-fine' }));
    }
    it.stroke(head, { dur: 0.16 }); it.stroke(body, { dur: 0.42 });
    arms.forEach(a => it.stroke(a, { dur: 0.14 }));
    extras.forEach(a => it.stroke(a, { dur: 0.14 }));
    it.parts = Object.assign(it.parts, { face: it.face, head, body, arms, extras });
    // the two gait poses for walking figures (same command structure, seek-safe attr d morph)
    if (pose === 'walking' || pose === 'carrying') {
      const B = poseGeo(pose, 1);
      const bB = smoothCmds(sc(B.body), true);
      const gait = [];
      const dA = body.d, dB = S.fmt(S.jitter(bB, 'm' + seed + 'b', body.amt));
      gait.push([body.main, dA, dB], [body.occ, dA, dB]);
      if (body.over) gait.push([body.over, body.over.getAttribute('d'), S.fmt(S.jitter(bB, 'o' + seed + 'b', body.amt * 1.5 + 0.25 * u))]);
      B.arms.forEach((a, i) => { const c = smoothCmds(sc(a), true); const d2 = S.fmt(S.jitter(c, 'm' + seed + 'a' + i, arms[i].amt)); gait.push([arms[i].main, arms[i].d, d2], [arms[i].occ, arms[i].d, d2]); });
      it.gait = gait;
    }
    it.walk = (tl, t, route, wo) => walkFigure(it, tl, t, route, wo);
    return it;
  }
  function routePolyline(ctx, route, smooth) {
    const P = route.map(ctx.pt);
    if (P.length < 2) return P;
    return smooth === false || P.length < 3 ? P : flatten(smoothCmds(P, false), 12)[0];
  }
  function walkFigure(it, tl, t, route, wo) {
    wo = wo || {};
    const ctx = it.ctx, u = it.u;
    const pl = Array.isArray(route[0]) && route.plPrepared ? route : routePolyline(ctx, route, wo.smooth);
    const L = plLen(pl);
    const s0 = clamp((wo.startPx || 0) * u, 0, L), s1 = clamp(L - (wo.stopShortPx || 0) * u, s0, L);
    const speed = (wo.speedPx || 30) * u;
    const dur = wo.dur || Math.max(0.4, (s1 - s0) / speed);
    const N = Math.max(2, Math.ceil(dur / (wo.stepDt || 0.2)));
    const ease = gsap.parseEase(wo.ease || 'none');
    const pos = s => pointAt(pl, clamp(s, 0, L)).p;
    const tr = q => 'translate(' + f2(q[0]) + ' ' + f2(q[1]) + ')';
    it.root.setAttribute('transform', tr(pos(s0)));
    let facing = null;
    for (let i = 0; i < N; i++) {
      const a = pos(s0 + (s1 - s0) * ease(i / N)), b = pos(s0 + (s1 - s0) * ease((i + 1) / N));
      const ti = t + i * dur / N;
      tl.fromTo(it.root, { attr: { transform: tr(a) } }, { attr: { transform: tr(b), }, duration: dur / N, ease: 'none', immediateRender: false }, ti);
      const dx = b[0] - a[0], seg = Math.hypot(dx, b[1] - a[1]);
      if (seg < 1e-6) continue;
      const dir = dx >= 0 ? 1 : -1;
      if (facing === null) { facing = dir; it.face.setAttribute('transform', 'scale(' + dir + ' 1)'); }
      else if (dir !== facing && Math.abs(dx) > seg * 0.3) {
        tl.fromTo(it.face, { attr: { transform: 'scale(' + facing + ' 1)' } }, { attr: { transform: 'scale(' + dir + ' 1)' }, duration: 0.01, ease: 'none', immediateRender: false }, ti);
        facing = dir;
      }
    }
    if (it.gait && wo.gait !== false) {
      const per = wo.stepPeriod || 0.42, n = Math.max(1, Math.round(dur / per));
      it.gait.forEach(([el, dA, dB]) => { if (el) tl.fromTo(el, { attr: { d: dA } }, { attr: { d: dB }, duration: dur / n, ease: 'sine.inOut', repeat: n - 1, yoyo: true, immediateRender: false }, t); });
    }
    if (wo.fadeIn) tl.fromTo(it.root, { opacity: 0 }, { opacity: 1, duration: wo.fadeIn, ease: 'power1.out', immediateRender: true }, t);
    if (wo.events !== false && wo.sound !== false) emit(ctx, wo, 'footsteps', t, dur, { item: it.id, figures: 1, stepPeriod: wo.stepPeriod || 0.42 });
    return t + dur;
  }
  function groupFigures(ctx, spec) {
    spec = spec || {};
    const grp = new Group(ctx, 'figures-' + (spec.kind || 'semicircle'), spec);
    const n = spec.n || 5;
    const figs = [];
    if ((spec.kind || 'semicircle') === 'semicircle') {
      const u = ctx.u(spec);
      let spots;
      if (ctx.mode === 'world') {
        const c = ctx.plan(spec.centre || 'toolboxTalk'), r = spec.radius || 3.1;
        spots = [];
        for (let i = 0; i < n; i++) { const a = (135 + i * (180 / (n - 1))) * Math.PI / 180; spots.push({ w: iso(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2] || 0), depth: c[0] + Math.cos(a) * r + c[1] + Math.sin(a) * r }); }
        grp.centreW = iso(c[0], c[1], c[2] || 0);
      } else {
        const c = spec.centre, rx = spec.radius || 44, ry = rx * (spec.squash || 0.42);
        spots = [];
        for (let i = 0; i < n; i++) { const a = (180 + i * (180 / (n - 1))) * Math.PI / 180; spots.push({ w: [c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry], depth: Math.sin(a) }); }
        grp.centreW = c.slice();
      }
      const cx = grp.centreW[0];
      spots.sort((a, b) => a.depth - b.depth);
      const mark = new Item(ctx, 'talk-point', { layer: grp.root });
      const mg = pxAt(ctx, mark.root, grp.centreW);
      const ring = hand(ctx, mg, handCircleCmds(0, 0, spec.markR || 3.2, 'tp' + f2(cx), { ry: (spec.markR || 3.2) * 0.62, spiral: 0.02 }), { jit: 0.3, over: false, cls: 'skt-fine' });
      const dot = mk('circle', { class: 'skt-fill', r: 1.3 }, mg);
      mark.stroke(ring, { dur: 0.2 }); mark.pop(dot, { dur: 0.08 });
      grp.child(mark);
      spots.forEach((sp, i) => {
        const dx = cx - sp.w[0];
        const side = Math.abs(dx) > (ctx.mode === 'world' ? 1.2 : 16);
        const f = figure(ctx, sp.w, { layer: grp.root, pose: side ? 'standing-side' : 'standing', facing: dx >= 0 ? 1 : -1, heightPx: spec.heightPx, refScale: spec.refScale, seed: (spec.seed || 'talk') + i });
        figs.push(f); grp.child(f, { stagger: 0.12 });
      });
      if (spec.label) {
        const lab = label(ctx, grp.centreW, spec.label, Object.assign({ layer: grp.root, leader: spec.labelLeader || [-26, 30], size: spec.labelSize || 15, refScale: spec.refScale }, spec.labelOpts || {}));
        grp.child(lab, { gap: 0.1 }); grp.labelItem = lab;
      }
    } else {
      // a file of contractors on a route, walking seek-safely from its start
      const route = spec.route || [{ plan: PLACES.gateOutside.plan }, 'gate', { plan: [104, 41.5, 0] }, { plan: PLACES.contractorsStop.plan }];
      const pl = routePolyline(ctx, route, spec.smooth); pl.plPrepared = true;
      grp.polyline = pl;
      const poses = spec.poses || ['walking', 'carrying', 'walking', 'walking', 'carrying'];
      for (let i = 0; i < n; i++) {
        const f = figure(ctx, pl[0], { layer: grp.root, pose: poses[i % poses.length], carry: i % 2 ? 'box' : (i === 2 ? 'pipe' : false), heightPx: spec.heightPx, refScale: spec.refScale, seed: (spec.seed || 'file') + i });
        figs.push(f); grp.child(f, { stagger: 0.1 });
      }
      grp.walk = (tl, t, wo) => {
        wo = wo || {};
        const u = ctx.u(spec), gapPx = wo.gapPx || spec.gapPx || 12, speedPx = wo.speedPx || 30;
        const L = plLen(pl) / u;
        let end = t;
        figs.forEach((f, i) => {
          const delay = i * gapPx / speedPx;
          const dur = wo.dur ? wo.dur - delay : undefined;
          end = Math.max(end, walkFigure(f, tl, t + delay, pl, { speedPx, dur, stopShortPx: i * gapPx, fadeIn: wo.fadeIn != null ? wo.fadeIn : 0.35, stepPeriod: wo.stepPeriod, events: false, ease: wo.ease }));
        });
        emit(ctx, wo, 'footsteps', t, end - t, { item: grp.id, figures: n, stepPeriod: wo.stepPeriod || 0.42, lengthPx: +L.toFixed(1) });
        return end;
      };
    }
    grp.figures = figs;
    return grp;
  }

  // ------------------------------------------------------------ 2. van (isometric line van)
  function van(ctx, at, o) {
    o = o || {};
    const it = new Item(ctx, 'van', o);
    const u = ctx.u(o);
    const base = ctx.plan(at || 'vanParked');
    const hd = (o.heading != null ? o.heading : 180) * Math.PI / 180, ch = Math.cos(hd), sh = Math.sin(hd), S = o.size || 1;
    const toPlan = ([uu, vv, zz]) => [base[0] + (uu * ch - vv * sh) * S, base[1] + (uu * sh + vv * ch) * S, (base[2] || 0) + zz * S];
    const P = q => { const p = toPlan(q); return iso(p[0], p[1], p[2]); };
    const seed = o.seed || ('van' + f2(base[0]) + f2(base[1]));
    const Lh = 2.85, wv = 1.05, zb = 0.46;
    const faces = [];
    const quad = (pts, nrm, tag) => faces.push({ pts, nrm, tag });
    // cargo box u -Lh..1.3, full height 2.5
    const u0 = -Lh, u1 = 1.3, zt = 2.5;
    quad([[u0, -wv, zt], [u1, -wv, zt], [u1, wv, zt], [u0, wv, zt]], [0, 0, 1], 'top');
    quad([[u0, wv, zb], [u1, wv, zb], [u1, wv, zt], [u0, wv, zt]], [0, 1, 0], 'side+');
    quad([[u0, -wv, zb], [u1, -wv, zb], [u1, -wv, zt], [u0, -wv, zt]], [0, -1, 0], 'side-');
    quad([[u0, -wv, zb], [u0, wv, zb], [u0, wv, zt], [u0, -wv, zt]], [-1, 0, 0], 'rear');
    quad([[u1, -wv, zb], [u1, wv, zb], [u1, wv, zt], [u1, -wv, zt]], [1, 0, 0], 'bulkhead');
    // cab: profile in (u, z), extruded across v
    const cw = wv * 0.97;
    const prof = [[u1, zb], [Lh, zb], [Lh, 1.2], [Lh - 0.78, 2.02], [u1, 2.02]];
    quad(prof.map(([a, z]) => [a, cw, z]), [0, 1, 0], 'cab+');
    quad(prof.map(([a, z]) => [a, -cw, z]), [0, -1, 0], 'cab-');
    for (let i = 0; i < prof.length; i++) {
      const a = prof[i], b = prof[(i + 1) % prof.length];
      if (i === prof.length - 1) continue; // against the bulkhead
      const du = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(du, dz) || 1;
      let nu = dz / L, nz = -du / L;
      const mu = (a[0] + b[0]) / 2 - (u1 + Lh) / 2, mz = (a[1] + b[1]) / 2 - (zb + 1.6) / 2;
      if (nu * mu + nz * mz < 0) { nu = -nu; nz = -nz; }
      if (nz < -0.5) continue; // underside
      quad([[a[0], -cw, a[1]], [b[0], -cw, b[1]], [b[0], cw, b[1]], [a[0], cw, a[1]]], [nu, 0, nz], i === 2 ? 'screen' : 'cabface');
    }
    const view = n => { const nx = n[0] * ch - n[1] * sh, ny = n[0] * sh + n[1] * ch; return { nx, ny, nz: n[2], vis: nx + ny + n[2] > 0.02 }; };
    const vis = faces.map(f => Object.assign(f, view(f.nrm), { depth: f.pts.reduce((a, q) => { const p = toPlan(q); return a + p[0] + p[1] + p[2]; }, 0) / f.pts.length })).filter(f => f.vis);
    vis.sort((a, b) => a.depth - b.depth);
    const g = it.root;
    const drawn = [];
    vis.forEach((f, i) => {
      const pts = f.pts.map(P);
      const rec = hand(ctx, g, lineCmds(pts, true), { u, seed: seed + f.tag + i, jit: 0.45, occ: true, ext: true, extMin: 10 });
      drawn.push(rec);
      if (f.tag !== 'top' && f.nz < 0.6) {
        const left = f.ny > f.nx;
        if (left || f.tag === 'screen') rec.hatch = hatch(ctx, g, pts, { u, spacing: left ? 2.6 : 4.2, seed: seed + 'h' + i, sparse: !left });
      }
      // details on the visible faces
      if (f.tag === 'side+' || f.tag === 'side-') {
        const v = f.tag === 'side+' ? wv : -wv;
        const door = hand(ctx, g, lineCmds([P([-0.35, v, zb + 0.12]), P([-0.35, v, zt - 0.14])], false), { u, seed: seed + 'dr', jit: 0.35, over: false, cls: 'skt-lite' });
        drawn.push(door);
        [[-1.95, 0.44], [1.9, 0.44]].forEach(([wu, r], k) => {
          const circ = []; for (let a = 0; a < 16; a++) { const th = a / 16 * 6.283; circ.push(P([wu + Math.cos(th) * r, v * 1.001, zb * 0.95 + Math.sin(th) * r])); }
          const wh = hand(ctx, g, smoothCmds(circ, true), { u, seed: seed + 'w' + k, jit: 0.3, occ: true, over: false });
          drawn.push(wh);
          const hub = []; for (let a = 0; a < 10; a++) { const th = a / 10 * 6.283; hub.push(P([wu + Math.cos(th) * r * 0.36, v * 1.002, zb * 0.95 + Math.sin(th) * r * 0.36])); }
          drawn.push(hand(ctx, g, smoothCmds(hub, true), { u, seed: seed + 'hb' + k, jit: 0.2, over: false, cls: 'skt-lite' }));
        });
      }
      if (f.tag === 'cab+' || f.tag === 'cab-') {
        const v = (f.tag === 'cab+' ? cw : -cw) * 1.002;
        const win = [[u1 + 0.14, v, 1.28], [Lh - 0.62, v, 1.28], [Lh - 0.86, v, 1.9], [u1 + 0.14, v, 1.9]].map(P);
        drawn.push(hand(ctx, g, lineCmds(win, true), { u, seed: seed + 'win', jit: 0.3, over: false, cls: 'skt-fine' }));
      }
    });
    drawn.forEach(rec => {
      it.stroke(rec, { dur: clamp(0.08 + rec.len / 900, 0.1, 0.4), advance: 0.6 });
      if (rec.hatch) it.draw(rec.hatch, 40, { dur: 0.3, advance: 0.3, type: 'hatch' });
    });
    it.parts.faces = drawn; it.basePlan = base;
    it.drive = (tl, t, d) => {
      d = d || {};
      const from = d.from ? ctx.pt(d.from) : ctx.pt({ plan: [base[0] + 14 * ch, base[1] + 14 * sh, 0] });
      const b0 = iso(base[0], base[1], base[2] || 0);
      const dx = from[0] - b0[0], dy = from[1] - b0[1];
      const dur = d.dur || 2.2;
      it.root.setAttribute('transform', 'translate(' + f2(dx) + ' ' + f2(dy) + ')');
      tl.fromTo(it.root, { attr: { transform: 'translate(' + f2(dx) + ' ' + f2(dy) + ')' } }, { attr: { transform: 'translate(0 0)' }, duration: dur, ease: d.ease || 'power2.out', immediateRender: false }, t);
      emit(ctx, d, 'van', t, dur, { item: it.id });
      return t + dur;
    };
    return it;
  }
  function gate(ctx, at, o) {
    o = o || {};
    const it = new Item(ctx, 'gate', o);
    const u = ctx.u(o);
    const b = ctx.plan(at || 'gate');
    const half = o.halfWidth || 3.4, hgt = 2.2;
    const P = (x, y, z) => iso(x, y, z);
    const recs = [
      hand(ctx, it.root, lineCmds([P(b[0], b[1] - half, 0), P(b[0], b[1] - half, hgt)]), { u, seed: 'gp1', jit: 0.35 }),
      hand(ctx, it.root, lineCmds([P(b[0], b[1] + half, 0), P(b[0], b[1] + half, hgt)]), { u, seed: 'gp2', jit: 0.35 }),
      hand(ctx, it.root, lineCmds([P(b[0], b[1] - half, 1.7), P(b[0] - 3.1, b[1] - half - 2.1, 1.7)]), { u, seed: 'gb1', jit: 0.35 }),
      hand(ctx, it.root, lineCmds([P(b[0], b[1] - half, 0.9), P(b[0] - 3.1, b[1] - half - 2.1, 0.9)]), { u, seed: 'gb2', jit: 0.3, cls: 'skt-lite', over: false }),
    ];
    recs.forEach(r => it.stroke(r, { dur: 0.18 }));
    if (o.label !== false) {
      const lab = letters(ctx, pxAt(ctx, it.root, P(b[0], b[1] + half, hgt)), o.label || 'GATE 2', 6, -8, { size: o.labelSize || 14, seed: 'gate' });
      it.wipe(lab);
    }
    return it;
  }

  // ------------------------------------------------------------ 3. dotted path (routes, trails, loops)
  function dottedPath(ctx, pts, o) {
    o = o || {};
    const it = new Item(ctx, o.kind || 'route', o);
    const u = ctx.u(o);
    const P = (o.plan ? pts.map(p => ({ plan: p })) : pts).map(ctx.pt);
    const cm = o.smooth === false ? lineCmds(P, !!o.closed) : smoothCmds(P, !!o.closed);
    const pl = flatten(cm, 14)[0], L = plLen(pl);
    const sp = (o.spacingPx || (o.dash ? 9 : 6.5)) * u;
    const R = rng('dp' + (o.seed || '') + f2(P[0][0]) + f2(P[0][1]) + f2(L));
    const arrow = o.arrow !== false;
    const stop = o.closed ? L - sp * (o.gapEnd != null ? o.gapEnd : 3) : L - (arrow ? sp * 0.8 : 0);
    const dl = (o.dash ? (o.dashPx || 4.2) : 0.35) * u, jn = (o.jitterPx != null ? o.jitterPx : 0.8) * u;
    let s = (o.startGapPx || 0) * u, d = ''; const dots = [];
    while (s <= stop) {
      const q = pointAt(pl, s), j = (R() - 0.5) * 2 * jn;
      const x = q.p[0] - q.t[1] * j, y = q.p[1] + q.t[0] * j;
      d += 'M' + f2(x) + ' ' + f2(y) + 'L' + f2(x + q.t[0] * dl) + ' ' + f2(y + q.t[1] * dl);
      dots.push({ p: [x, y], s });
      s += sp * (0.88 + R() * 0.24);
    }
    const el = mk('path', { class: 'skt-d' + (o.lite ? ' skt-lite' : '') + (o.dash ? ' skt-dash' : ''), d }, it.root);
    it.parts.dots = el; it.dots = dots; it.polyline = pl; it.length = L; it.u = u;
    const dur = o.dur || clamp(L / u / (o.pacePx || 360), 0.25, 4);
    it.draw(el, 0, { dur, type: o.sound === false ? null : 'pencil-dots', meta: { dots: dots.length, dashed: !!o.dash }, ease: 'none', advance: 1 });
    if (arrow) {
      const tipS = o.closed ? L * (o.arrowAt != null ? o.arrowAt : 0.62) : L;
      const q = pointAt(pl, tipS), a = (o.arrowPx || 9) * u, ang = 0.47;
      const back = [-q.t[0], -q.t[1]];
      const rot = (v, th) => [v[0] * Math.cos(th) - v[1] * Math.sin(th), v[0] * Math.sin(th) + v[1] * Math.cos(th)];
      const l = rot(back, ang), r = rot(back, -ang);
      const head = hand(ctx, it.root, lineCmds([[q.p[0] + l[0] * a, q.p[1] + l[1] * a], q.p, [q.p[0] + r[0] * a, q.p[1] + r[1] * a]]), { u, seed: 'ah' + (o.seed || '') + f2(q.p[0]), jit: 0.35, cls: o.lite ? 'skt-lite' : (o.dash ? 'skt-fine' : ''), over: false });
      it.parts.arrow = head;
      if (o.closed) it.stroke(head, { dur: 0.16, at: dur * (tipS / L) });
      else it.stroke(head, { dur: 0.16 });
    }
    if (o.label) {
      const lp = o.labelAt ? ctx.pt(o.labelAt) : pointAt(pl, L * (o.labelFrac != null ? o.labelFrac : 0.5)).p;
      const lab = label(ctx, lp, o.label, Object.assign({ layer: it.root, leader: o.labelLeader || [18, -22], size: o.labelSize || 14, refScale: o.refScale }, o.labelOpts || {}));
      it.parts.label = lab;
      it.fn((tl, t0) => lab.drawOn(tl, t0, { events: true }), { dur: lab.duration });
    }
    return it;
  }

  // ------------------------------------------------------------ 4. valve with lockout tag
  function splitTag(text, maxc) {
    const toks = String(text).split(/\s*·\s*/), out = [];
    let cur = '';
    for (const t of toks) { if (!cur) cur = t; else if ((cur + ' · ' + t).length <= maxc) cur += ' · ' + t; else { out.push(cur); cur = t; } }
    if (cur) out.push(cur);
    return out;
  }
  function valveTag(ctx, at, o) {
    o = o || {};
    const it = new Item(ctx, 'valve-tag', o);
    const hb = o.hand === 'b';
    const g = pxAt(ctx, it.root, ctx.pt(at));
    const seed = (o.seed || (hb ? 'hand-b' : 'hand-a')) + (o.text || (o.lines || []).join('|'));
    const cls = hb ? 'skt-heavy' : '';
    const jit = hb ? 1.0 : 0.7;
    const vs = o.valveSize || 10;
    // P&ID gate valve: pipe stubs, bow tie, stem, T handwheel
    if (o.valve !== false) {
      const pipe = hand(ctx, g, 'M' + (-2.2 * vs) + ' 0L' + (-vs) + ' 0M' + vs + ' 0L' + (2.2 * vs) + ' 0', { seed: seed + 'pp', jit: jit * 0.6, cls });
      const bow = hand(ctx, g, 'M' + (-vs) + ' ' + (-0.62 * vs) + 'L' + vs + ' ' + (0.62 * vs) + 'L' + vs + ' ' + (-0.62 * vs) + 'L' + (-vs) + ' ' + (0.62 * vs) + 'Z', { seed: seed + 'bw', jit: jit * 0.6, cls, occ: true });
      const stem = hand(ctx, g, 'M0 0L0 ' + (-1.3 * vs) + 'M' + (-0.75 * vs) + ' ' + (-1.3 * vs) + 'L' + (0.75 * vs) + ' ' + (-1.3 * vs), { seed: seed + 'st', jit: jit * 0.5, cls });
      [pipe, bow, stem].forEach(r => it.stroke(r, { dur: 0.2 }));
      it.parts.valve = { pipe, bow, stem };
    }
    // string from the handwheel to the tag's eyelet
    const side = o.side === 'left' ? -1 : 1;
    const lines = o.lines || splitTag(o.text || 'ISOLATED · LOTO · 07:40', o.maxChars || 14);
    const fs = o.size || 16, lh = fs * 1.28, ls = hb ? 0.1 : 0.13;
    const tw = Math.max(...lines.map(l => monoWidth(l, fs, ls))) + 44, th = lines.length * lh + 18;
    const eye = [side * (o.reach || 0.75 * vs + 26), (o.drop != null ? o.drop : 30)];
    const ang = o.angle != null ? o.angle : (hb ? -3.2 : 4.5);
    const w0 = [side * 0.72 * vs, -1.3 * vs];
    const str = hand(ctx, g, [['M', w0], ['C', [w0[0] + side * 10, w0[1] + 2, eye[0] - side * 8, eye[1] - 18, eye[0], eye[1]]]], { seed: seed + 'str', jit: jit * 0.5, cls: hb ? 'skt-fine' : 'skt-fine', over: false });
    it.stroke(str, { dur: 0.3 });
    const tg = mk('g', { transform: 'translate(' + f2(eye[0]) + ' ' + f2(eye[1]) + ') rotate(' + f2(ang) + ')' }, g);
    // luggage tag: chamfered end with an eyelet, hanging from the string
    const ex = side === 1 ? 0 : -tw, dir = side;
    const c = hb ? 12 : 9;
    const outline = side === 1
      ? [[0, -c], [c, -c - 6], [tw, -c - 6], [tw, th - c - 6], [c, th - c - 6], [0, th - 2 * c - 6]]
      : [[0, -c], [-c, -c - 6], [-tw, -c - 6], [-tw, th - c - 6], [-c, th - c - 6], [0, th - 2 * c - 6]];
    const tag = hand(ctx, tg, lineCmds(outline, true), { seed: seed + 'tg', jit, cls, occ: true, ext: !hb, extMin: 30 });
    const eyelet = hand(ctx, tg, handCircleCmds(dir * 11, (th - 2 * c - 6) / 2 - c + 3, 3.4, seed + 'ey', { spiral: 0.02 }), { seed: seed + 'eyl', jit: 0.3, over: false, cls: hb ? '' : 'skt-fine' });
    it.stroke(tag, { dur: 0.5 }); it.stroke(eyelet, { dur: 0.14 });
    if (hb) { const dbl = hand(ctx, tg, lineCmds(side === 1 ? [[c + 6, -c], [tw - 5, -c], [tw - 5, th - c - 11], [c + 6, th - c - 11]] : [[-c - 6, -c], [-tw + 5, -c], [-tw + 5, th - c - 11], [-c - 6, th - c - 11]], true), { seed: seed + 'db', jit: 0.5, over: false, cls: 'skt-lite' }); it.stroke(dbl, { dur: 0.3 }); }
    const tx = side === 1 ? 28 : -tw + 16;
    it.lines = lines.map((ln, i) => { const lb = letters(ctx, tg, ln, tx, -c - 6 + 9 + fs * 0.92 + i * lh, { size: fs, weight: hb ? 500 : 400, ls, seed: seed + i, irr: hb ? 0.08 : 0.05, rot: 0 }); it.wipe(lb, { pace: hb ? 170 : 210, type: hb ? 'pen' : 'letter' }); return lb; });
    it.parts.tag = tag; it.parts.string = str;
    return it;
  }

  // ------------------------------------------------------------ 5. activity marker
  const DIRS = { ne: -40, n: -90, nw: -140, e: -12, w: -168, se: 35, sw: 145, s: 90 };
  function activityMarker(ctx, at, o) {
    o = o || {};
    const v = o.variant || 'normal';
    const V = { small: { r: 4.4, fs: 12, lead: 13, dot: 1.35 }, normal: { r: 7.2, fs: 14, lead: 19, dot: 1.9 }, hot: { r: 11.5, fs: 18, lead: 30, dot: 2.6, ring: 17.5 } }[v] || {};
    const it = new Item(ctx, 'marker', o);
    const p = ctx.pt(at);
    const g = pxAt(ctx, it.root, p);
    const seed = o.seed || ('mk' + v + (o.label || '') + f2(p[0]) + f2(p[1]));
    const breath = mk('g', { transform: 'scale(1)' }, g);
    const circ = hand(ctx, breath, handCircleCmds(0, 0, V.r, seed), { seed: seed + 'c', jit: 0.35, cls: v === 'hot' ? 'skt-heavy' : (v === 'small' ? 'skt-fine' : '') });
    const dot = mk('circle', { class: 'skt-fill', r: V.dot }, breath);
    it.stroke(circ, { dur: v === 'small' ? 0.18 : 0.3 });
    it.pop(dot, { dur: 0.08, scale: 1.6 });
    if (V.ring) { const ring = hand(ctx, breath, handCircleCmds(0, 0, V.ring, seed + 'r', { sweep: 5.2, over: 0 }), { seed: seed + 'rr', jit: 0.4, cls: 'skt-lite', over: false }); it.stroke(ring, { dur: 0.3 }); it.parts.ring = ring; }
    it.parts.breath = breath; it.parts.circle = circ; it.parts.dot = dot;
    if (o.label) {
      const lines = Array.isArray(o.label) ? o.label : String(o.label).split('\n');
      const dname = o.dir || 'ne';
      const a = (DIRS[dname] != null ? DIRS[dname] : -40) * Math.PI / 180;
      const r0 = (V.ring || V.r) + 2.5, len = o.leadPx || V.lead;
      const s0 = [Math.cos(a) * r0, Math.sin(a) * r0], k = [Math.cos(a) * (r0 + len), Math.sin(a) * (r0 + len)];
      const west = Math.cos(a) < -0.05;
      const shelf = [k[0] + (west ? -7 : 7), k[1]];
      const lead = hand(ctx, g, lineCmds([s0, k, shelf]), { seed: seed + 'ld', jit: 0.4, cls: 'skt-lite', over: false });
      it.stroke(lead, { dur: 0.2 });
      const fs = o.size || V.fs, lh = fs * 1.3;
      const y0 = k[1] + fs * 0.34 - (lines.length - 1) * lh * 0.5;
      it.lines = lines.map((ln, i) => { const lb = letters(ctx, g, ln, shelf[0] + (west ? -5 : 5), y0 + i * lh, { size: fs, weight: o.weight || (v === 'hot' ? 500 : 400), anchor: west ? 'end' : 'start', seed: seed + i }); it.wipe(lb, { pace: o.pace }); return lb; });
      it.parts.leader = lead;
    }
    it.breathe = (tl, t, dur, bo) => {
      bo = bo || {};
      const per = bo.period || 2.6, amp = bo.amp != null ? bo.amp : 0.06;
      const n = Math.max(1, Math.floor(dur / (per / 2)));
      tl.fromTo(breath, { attr: { transform: 'scale(1)' } }, { attr: { transform: 'scale(' + f2(1 + amp) + ')' }, duration: dur / n, ease: 'sine.inOut', repeat: n - 1, yoyo: true, immediateRender: false }, t);
      return t + dur;
    };
    return it;
  }
  const FIELD_LABELS = ['LIFT · BAY 2', 'ISOLATION · MCC-3', 'DELIVERY · DOCK 3', 'CONFINED SPACE · T2', 'SCAFFOLD · WAREHOUSE', 'PTW 0398', 'EXCAVATION · ROAD 4',
    'LOTO · V-12', 'FORKLIFT · BAY 4', 'WORK AT HEIGHT · ROOF 01', 'CHEMICAL DELIVERY', 'PTW 0402', 'PUMP SWAP · P1', 'FILTER CHANGE · LINE 3', 'DRAIN CLEARING · ROOF 02', 'CRANE LIFT · YARD'];
  function activityField(ctx, o) {
    o = o || {};
    const grp = new Group(ctx, 'field', o);
    const M = window.SITE_MODEL || {};
    const A = M.activities || {};
    let cands = [];
    (A.ambientSpots && A.ambientSpots.spots || []).forEach(s => cands.push(s.world));
    (A.routine || []).forEach(s => cands.push(s.world));
    (A.portfolio || []).forEach(s => cands.push(s.world));
    (o.extra || []).forEach(s => cands.push(ctx.pt(s)));
    const R = rng('field' + (o.seed || ''));
    for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const tmp = cands[i]; cands[i] = cands[j]; cands[j] = tmp; }
    const excl = (o.exclude || [{ at: 'roof03Centre', r: 6 }]).map(e => ({ p: ctx.pt(e.at), r: e.r }));
    const minD = o.minDist || 3.4, count = o.count || 36;
    const chosen = [];
    for (const c of cands) {
      if (chosen.length >= count) break;
      if (excl.some(e => dist(e.p, c) < e.r)) continue;
      if (chosen.some(q => dist(q, c) < minD)) continue;
      chosen.push(c);
    }
    const labels = o.labels || FIELD_LABELS;
    const labelEvery = o.labelEvery || 2.4;
    const markers = [], trails = [];
    let li = 0;
    chosen.forEach((c, i) => {
      const r2 = rng('fm' + i + (o.seed || ''));
      if (r2() < (o.trailFrac != null ? o.trailFrac : 0.5)) {
        const a = r2() * 6.283, L = (o.trailMin || 4) + r2() * (o.trailVar || 9), bend = (r2() - 0.5) * 0.9;
        const st = [c[0] + Math.cos(a) * L, c[1] + Math.sin(a) * L * 0.6];
        const mid = [(st[0] + c[0]) / 2 + Math.cos(a + 1.57) * L * bend * 0.4, (st[1] + c[1]) / 2 + Math.sin(a + 1.57) * L * bend * 0.25];
        const endp = [c[0] + (st[0] - c[0]) * 0.16, c[1] + (st[1] - c[1]) * 0.16];
        const tr = dottedPath(ctx, [st, mid, endp], { layer: grp.root, lite: true, arrow: false, spacingPx: 5.5, seed: 'tr' + i, refScale: o.refScale, sound: false });
        trails.push(tr); markers.push({ trail: tr });
      } else markers.push({});
      const lab = (i % Math.round(labelEvery) === 0 && li < labels.length) ? labels[li++] : null;
      const small = !lab && r2() < 0.55;
      const east = c[0] > (o.flipX != null ? o.flipX : 60);
      const m = activityMarker(ctx, c, { layer: grp.root, variant: small ? 'small' : 'normal', label: lab, dir: east ? (r2() < 0.5 ? 'nw' : 'w') : (r2() < 0.5 ? 'ne' : 'e'), seed: 'fld' + i + (o.seed || '') });
      markers[i].marker = m;
    });
    grp.markers = markers.map(x => x.marker); grp.trails = trails; grp.points = chosen;
    grp.drawOn = (tl, t, fo) => {
      fo = fo || {};
      const span = fo.span || 6, n = markers.length;
      let end = t;
      const order = markers.map((_, i) => i);
      order.forEach((i, rank) => {
        const x = rank / Math.max(1, n - 1);
        const ti = t + span * Math.pow(x, fo.accel || 0.82) + (rng('fw' + i)() - 0.5) * 0.12;
        const mk2 = markers[i];
        if (mk2.trail) end = Math.max(end, mk2.trail.drawOn(tl, Math.max(t, ti - 0.35), { speed: 1.6, events: false }));
        end = Math.max(end, mk2.marker.drawOn(tl, ti, { speed: fo.speed || 1.5, scene: fo.scene, eventOffset: fo.eventOffset, events: fo.events }));
      });
      emit(ctx, fo, 'pencil-dots', t, span, { item: grp.id, trails: trails.length, bed: true });
      return end;
    };
    grp.dim = (tl, t, to, dur, except) => { const ex = new Set((except || []).map(e => e.id || e)); grp.markers.concat(grp.trails).forEach(m => { if (!ex.has(m.id)) m.fade(tl, t, 1, to, dur || 0.6); }); return t + (dur || 0.6); };
    return grp;
  }
  function containment(ctx, pts, o) {
    o = o || {};
    const it = new Item(ctx, 'containment', o);
    const u = ctx.u(o);
    const P = pts.map(ctx.pt);
    const H = hull(P);
    const c = H.reduce((a, p) => [a[0] + p[0] / H.length, a[1] + p[1] / H.length], [0, 0]);
    const pad = (o.padPx || 16) * u;
    const R = rng('ct' + (o.seed || '') + f2(c[0]) + f2(c[1]));
    const ring = [];
    const n = Math.max(10, H.length * 3);
    const angOf = p => Math.atan2(p[1] - c[1], p[0] - c[0]);
    // sample the padded hull in angle order, a little more than one turn, loosely
    const radAt = th => { let best = 0; for (const p of H) { const d = Math.hypot(p[0] - c[0], p[1] - c[1]); const da = Math.cos(angOf(p) - th); if (da > 0) best = Math.max(best, d * da); } return best + pad; };
    const a0 = R() * 6.283, turn = 6.283 * (1.06 + R() * 0.06);
    for (let i = 0; i <= n; i++) { const th = a0 + turn * i / n; const rr = radAt(th) * (1 + (R() - 0.5) * 0.08) * (1 + 0.05 * i / n); ring.push([c[0] + Math.cos(th) * rr, c[1] + Math.sin(th) * rr * (o.squash || 1)]); }
    const rec = hand(ctx, it.root, smoothCmds(ring, false), { u, seed: 'ct' + (o.seed || ''), jit: 0.9, cls: o.lite ? 'skt-lite' : '' });
    it.stroke(rec, { dur: o.dur || 1.1, ease: 'power1.inOut' });
    it.parts.loop = rec;
    return it;
  }

  // ------------------------------------------------------------ 6. the five safeguards around Roof 03
  function tickAfter(ctx, it, g, x, y, o) {
    o = o || {};
    const rec = hand(ctx, g, tickCmds(x, y, o.s || 1), { seed: 'tk' + (o.seed || '') + f2(x) + f2(y), jit: 0.35, cls: 'skt-heavy', over: false });
    it.stroke(rec, { dur: 0.16, type: 'tick', ease: 'power2.out' });
    return rec;
  }
  function safeguardItems(ctx, anchor, o) {
    o = o || {};
    anchor = anchor || 'roof03Centre';
    const refScale = o.refScale || 16, u = 1 / refScale;
    const grp = new Group(ctx, 'safeguards', o);
    const A = ctx.plan(anchor);
    const W0 = ctx.pt(anchor);
    const at = (dxPx, dyPx) => [W0[0] + dxPx * u, W0[1] + dyPx * u];
    const fs = o.size || 15;
    const items = {};
    const mkLabel = (it, g, text, x, y, anchorSide) => {
      const lb = letters(ctx, g, text, anchorSide === 'end' ? x : x + 20, y, { size: fs, weight: 500, anchor: anchorSide || 'start', seed: 'sg' + text });
      it.wipe(lb);
      const tx = anchorSide === 'end' ? lb.x0 - 14 : x + 6;
      tickAfter(ctx, it, g, tx, y - fs * 0.38, { seed: text, s: 1.05 });
      return lb;
    };
    // 1 CERTIFICATE: a small card with typed lines and a seal
    {
      const it = new Item(ctx, 'safeguard-certificate', { layer: grp.root });
      const lay = (o.layout && o.layout.certificate) || [-250, -118];
      const g = pxAt(ctx, it.root, at(lay[0], lay[1]));
      const card = hand(ctx, g, 'M-22 -15L22 -15L22 15L-22 15Z', { seed: 'cert', jit: 0.5, occ: true, ext: true, extMin: 20 });
      const lines = hand(ctx, g, 'M-15 -7L10 -7M-15 -1L14 -1M-15 5L2 5', { seed: 'certl', jit: 0.4, cls: 'skt-lite', over: false });
      const seal = hand(ctx, g, handCircleCmds(13, 7, 4, 'certs', { spiral: 0.02 }), { seed: 'certs', jit: 0.3, over: false, cls: 'skt-fine' });
      it.stroke(card, { dur: 0.3 }); it.stroke(lines, { dur: 0.25 }); it.stroke(seal, { dur: 0.12 });
      it.label = mkLabel(it, g, 'CERTIFICATE', -24, 38);
      items.certificate = it; grp.child(it);
    }
    // 2 FIRE WATCH: one standing figure on the roof
    {
      const it = new Group(ctx, 'safeguard-firewatch', { layer: grp.root });
      const fp = (o.layout && o.layout.fireWatch) || [-3.6, 5.8];
      const fw = figure(ctx, { plan: [A[0] + fp[0], A[1] + fp[1], A[2] || 0] }, { layer: it.root, pose: 'standing', heightPx: o.figureHeightPx || 26 * refScale / 7.1, refScale, seed: 'firewatch', tone: true });
      it.child(fw);
      const lab = new Item(ctx, 'safeguard-firewatch-label', { layer: it.root });
      const g = pxAt(ctx, lab.root, iso(A[0] + fp[0], A[1] + fp[1], A[2] || 0));
      lab.label = mkLabel(lab, g, 'FIRE WATCH', -26, -30, 'end');
      it.child(lab, { gap: 0.05 });
      it.figure = fw; items.fireWatch = it; grp.child(it, { stagger: o.stagger || 0.6 });
    }
    // 3 EXTINGUISHER: a line icon standing on the roof
    {
      const it = new Item(ctx, 'safeguard-extinguisher', { layer: grp.root });
      const ep = (o.layout && o.layout.extinguisher) || [4.4, -3.2];
      const g = pxAt(ctx, it.root, iso(A[0] + ep[0], A[1] + ep[1], A[2] || 0));
      const body = hand(ctx, g, smoothCmds([[-6, 0], [-6.4, -20], [-5, -25], [0, -27], [5, -25], [6.4, -20], [6, 0]], false).concat([['Z', []]]), { seed: 'ext', jit: 0.4, occ: true });
      const valve = hand(ctx, g, 'M-2 -27L-2 -31L3 -31L3 -27M-3 -33L9 -35M3 -30C10 -29 11 -22 9 -12', { seed: 'extv', jit: 0.3, over: false, cls: 'skt-fine' });
      const band = hand(ctx, g, 'M-6 -9L6 -9', { seed: 'extb', jit: 0.25, over: false, cls: 'skt-lite' });
      it.stroke(body, { dur: 0.3 }); it.stroke(valve, { dur: 0.25 }); it.stroke(band, { dur: 0.1 });
      it.label = mkLabel(it, g, 'EXTINGUISHER', 14, -8);
      items.extinguisher = it; grp.child(it, { stagger: o.stagger || 0.6 });
    }
    // 4 AREA CLEARED: a hatched ring drawn on the roof plane around the hot-work point
    {
      const it = new Item(ctx, 'safeguard-area', { layer: grp.root });
      const rIn = o.ringIn || 2.55, rOut = o.ringOut || 3.35;
      const ell = r => { const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283; pts.push(iso(A[0] + Math.cos(a) * r, A[1] + Math.sin(a) * r, A[2] || 0)); } return pts; };
      const outer = ell(rOut), inner = ell(rIn);
      const clipD = polyD(outer, true) + polyD(inner.slice().reverse(), true);
      const hc = hatch(ctx, it.root, outer, { u, spacing: 4.2, seed: 'area', clipD, evenodd: true, dir: -1 });
      const ro = hand(ctx, it.root, handCircleCmds(0, 0, 1, 'areao', { n: 20, spiral: 0.02, over: 0.3 }).map(([c, a]) => [c, a.map((v, i) => i % 2 ? v : v)]), { u, seed: 'x', jit: 0 });
      ro.main.remove(); if (ro.over) ro.over.remove();
      // build the rings in the roof plane: unit circle points mapped through iso
      const ringCmds = (r, sd) => { const R2 = rng('ar' + sd); const a0 = R2() * 6.283, tot = 6.283 + 0.35, pts = []; for (let i = 0; i <= 22; i++) { const a = a0 + tot * i / 22, rr = r * (1 + 0.025 * Math.sin(3 * a) + 0.03 * (i / 22 - 0.5)); pts.push(iso(A[0] + Math.cos(a) * rr, A[1] + Math.sin(a) * rr, A[2] || 0)); } return smoothCmds(pts, false); };
      const o1 = hand(ctx, it.root, ringCmds(rOut, 'o'), { u, seed: 'areaO', jit: 0.4 });
      const i1 = hand(ctx, it.root, ringCmds(rIn, 'i'), { u, seed: 'areaI', jit: 0.35, cls: 'skt-fine', over: false });
      it.stroke(o1, { dur: 0.42 }); it.stroke(i1, { dur: 0.36 }); it.draw(hc, 0, { dur: 0.45, type: 'hatch' });
      const lp = (o.layout && o.layout.areaLabel) || [3.35, 1.6];
      const g = pxAt(ctx, it.root, iso(A[0] + lp[0], A[1] + lp[1], A[2] || 0));
      const lead = hand(ctx, g, 'M0 0L26 30L32 30', { seed: 'areal', jit: 0.4, cls: 'skt-lite', over: false });
      it.stroke(lead, { dur: 0.18 });
      it.label = mkLabel(it, g, 'AREA CLEARED', 34, 30 + fs * 0.34);
      items.areaCleared = it; grp.child(it, { stagger: o.stagger || 0.6 });
    }
    // 5 SPRINKLERS: a loose ring round a few of Roof 03's sprinkler heads, ticked
    {
      const it = new Item(ctx, 'safeguard-sprinklers', { layer: grp.root });
      const heads = (o.heads || [[71.5, 11.5], [71.5, 17], [67, 11.5]]).map(h => iso(h[0], h[1], A[2] || 12));
      const loop = containment(ctx, heads, { layer: it.root, padPx: 11, refScale, seed: 'sprk', squash: 1 });
      it.fn((tl, t0) => loop.drawOn(tl, t0, { events: false }), { dur: loop.duration, type: 'pencil' });
      const top = heads.reduce((a, b) => (b[1] < a[1] ? b : a));
      const g = pxAt(ctx, it.root, top);
      const lead = hand(ctx, g, 'M12 -12L30 -34L36 -34', { seed: 'sprl', jit: 0.4, cls: 'skt-lite', over: false });
      it.stroke(lead, { dur: 0.18 });
      it.label = mkLabel(it, g, 'SPRINKLERS', 38, -34 + fs * 0.34);
      it.loop = loop;
      items.sprinklers = it; grp.child(it, { stagger: o.stagger || 0.6 });
    }
    grp.items = items;
    return grp;
  }

  // ------------------------------------------------------------ 7. the condition connection (and its fray)
  function conditionConnection(ctx, from, to, o) {
    o = o || {};
    const it = new Item(ctx, 'connection', o);
    const u = ctx.u(o);
    const A = ctx.pt(from || 'heroExitPoint'), B = ctx.pt(to || 'roof03Centre');
    const L0 = dist(A, B), nx = -(B[1] - A[1]) / L0, ny = (B[0] - A[0]) / L0, bow = (o.bow != null ? o.bow : 0.05) * L0;
    const M = [(A[0] + B[0]) / 2 + nx * bow, (A[1] + B[1]) / 2 + ny * bow];
    const pl = flatten(smoothCmds([A, M, B], false), 24)[0], L = plLen(pl);
    const sp = (o.spacingPx || 6.5) * u, k = o.breakAt != null ? o.breakAt : 0.52;
    const R = rng('cc' + f2(A[0]) + f2(B[0]));
    const dl = 0.35 * u, jn = 0.6 * u;
    const partA = [], partB = [];
    for (let s = (o.startGapPx || 5) * u; s <= L - (o.endGapPx || 9) * u; s += sp * (0.9 + R() * 0.2)) {
      const q = pointAt(pl, s), j = (R() - 0.5) * 2 * jn;
      const p = [q.p[0] - q.t[1] * j, q.p[1] + q.t[0] * j];
      (s < k * L ? partA : partB).push({ p, t: q.t, s });
    }
    const dOf = arr => arr.map(({ p, t }) => 'M' + f2(p[0]) + ' ' + f2(p[1]) + 'L' + f2(p[0] + t[0] * dl) + ' ' + f2(p[1] + t[1] * dl)).join('');
    const cls = 'skt-d' + (o.lite !== false ? ' skt-lite' : '');
    const gA = mk('g', {}, it.root), gB = mk('g', { transform: 'rotate(0 ' + f2(B[0]) + ' ' + f2(B[1]) + ')' }, it.root);
    const elA = mk('path', { class: cls, d: dOf(partA) }, gA), elB = mk('path', { class: cls, d: dOf(partB) }, gB);
    // loose dots at the break: copies of the dots nearest the break, used only by fray()
    const nLoose = o.loose || 3;
    const looseSrc = partA.slice(-nLoose).concat(partB.slice(0, nLoose));
    const loose = looseSrc.map(({ p, t }, i) => mk('path', { class: cls, d: 'M' + f2(p[0]) + ' ' + f2(p[1]) + 'L' + f2(p[0] + t[0] * dl) + ' ' + f2(p[1] + t[1] * dl), opacity: 0, transform: 'translate(0 0)' }, i < nLoose ? gA : gB));
    // knot at the envelope end, small dot at the activity end
    const kg = pxAt(ctx, it.root, A);
    const knot = hand(ctx, kg, handCircleCmds(0, 0, 3.4, 'knot' + f2(A[0]), { spiral: 0.02 }), { seed: 'knot', jit: 0.3, over: false, cls: 'skt-fine' });
    it.stroke(knot, { dur: 0.14 });
    let lab = null;
    if (o.label !== false) { lab = letters(ctx, kg, o.label || '4.3', 7, -7, { size: o.labelSize || 13, weight: 500, seed: 'cclab' }); it.wipe(lab, { dur: 0.25 }); }
    const durA = clamp(L * k / u / (o.pacePx || 340), 0.3, 2.5), durB = clamp(L * (1 - k) / u / (o.pacePx || 340), 0.3, 2.5);
    it.draw(elA, 0, { dur: durA, type: 'pencil-dots', ease: 'none', advance: 1 });
    it.draw(elB, 0, { dur: durB, type: null, ease: 'none', advance: 1 });
    it.parts = { a: elA, b: elB, gA, gB, loose, knot, label: lab };
    it.breakPoint = pointAt(pl, k * L).p; it.polyline = pl;
    const fracA = partA.length ? partA[partA.length - 1].s : 1, fracB0 = partB.length ? partB[0].s : L;
    it.fray = (tl, t, fo) => {
      fo = fo || {};
      const dur = fo.dur || 1.8, gap = (fo.gapPx || 26) * u, drift = (fo.driftPx || 6) * u;
      const cutA = clamp((k * L - gap / 2 - (partA[0] ? partA[0].s : 0)) / Math.max(1e-6, fracA - (partA[0] ? partA[0].s : 0)), 0, 1);
      const cutB = clamp((k * L + gap / 2 - fracB0) / Math.max(1e-6, (partB.length ? partB[partB.length - 1].s : L) - fracB0), 0, 1);
      tl.fromTo(elA, { drawSVG: '0% 100%' }, { drawSVG: '0% ' + (cutA * 100).toFixed(2) + '%', duration: dur, ease: 'power2.inOut', immediateRender: false }, t);
      tl.fromTo(elB, { drawSVG: '0% 100%' }, { drawSVG: (cutB * 100).toFixed(2) + '% 100%', duration: dur, ease: 'power2.inOut', immediateRender: false }, t);
      const Lb = Math.max(1e-6, dist(it.breakPoint, B)), ang = (drift / Lb) * 180 / Math.PI * (fo.side || 1);
      tl.fromTo(gB, { attr: { transform: 'rotate(0 ' + f2(B[0]) + ' ' + f2(B[1]) + ')' } }, { attr: { transform: 'rotate(' + f2(ang) + ' ' + f2(B[0]) + ' ' + f2(B[1]) + ')' }, duration: dur * 1.2, ease: 'sine.inOut', immediateRender: false }, t + dur * 0.2);
      loose.forEach((el, i) => {
        const r = rng('ls' + i + f2(A[0]));
        const dx = (r() - 0.5) * 7 * u, dy = (r() - 0.2) * 6 * u;
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.01, immediateRender: false }, t + i * 0.04);
        tl.fromTo(el, { attr: { transform: 'translate(0 0)' } }, { attr: { transform: 'translate(' + f2(dx) + ' ' + f2(dy) + ')' }, duration: dur * 0.9, ease: 'sine.out', immediateRender: false }, t + i * 0.04);
        tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: dur * 0.6, ease: 'power1.in', immediateRender: false }, t + dur * 0.35 + i * 0.05);
      });
      emit(ctx, fo, 'fray', t, dur, { item: it.id, silent: true });
      return t + dur * 1.4;
    };
    it.rejoin = (tl, t, fo) => {
      fo = fo || {};
      const dur = fo.dur || 1.2;
      tl.fromTo(elA, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: dur, ease: 'power2.inOut', immediateRender: false }, t);
      tl.fromTo(elB, { drawSVG: '100% 100%' }, { drawSVG: '0% 100%', duration: dur, ease: 'power2.inOut', immediateRender: false }, t);
      tl.fromTo(gB, { attr: { transform: gB.getAttribute('transform') } }, { attr: { transform: 'rotate(0 ' + f2(B[0]) + ' ' + f2(B[1]) + ')' }, duration: dur, ease: 'sine.inOut', immediateRender: false }, t);
      return t + dur;
    };
    return it;
  }

  // ------------------------------------------------------------ 8. envelope redrawn inward near Roof 03
  function envelopeRedraw(ctx, o) {
    o = o || {};
    const S = SK();
    const it = new Item(ctx, 'envelope-redraw', o);
    const env = (window.SITE_MODEL || {}).envelope;
    if (!env) throw new Error('SketchKit.envelopeRedraw: SITE_MODEL.envelope missing');
    const P = env.pointsWorld, N = env.normalsWorld, n = P.length;
    const refScale = o.refScale || 10.5, u = 1 / refScale;
    const target = ctx.pt(o.target || 'roof03Centre');
    const s = [0]; for (let i = 1; i < n; i++) s[i] = s[i - 1] + dist(P[i - 1], P[i]);
    const Ltot = s[n - 1] + dist(P[n - 1], P[0]);
    let c = 0, best = Infinity;
    for (let i = 0; i < n; i++) { const d = dist(P[i], target); if (d < best) { best = d; c = i; } }
    const inward = [-N[c][0], -N[c][1]];
    const proj = (target[0] - P[c][0]) * inward[0] + (target[1] - P[c][1]) * inward[1];
    const depth = o.depth != null ? o.depth : (o.depthPx != null ? o.depthPx * u : proj + (o.marginPx != null ? o.marginPx : 18) * u);
    const sigma = o.sigma || Math.max(7, depth * (o.width || 0.6));
    const ds = i => { let d = s[i] - s[c]; if (d > Ltot / 2) d -= Ltot; if (d < -Ltot / 2) d += Ltot; return d; };
    const win = [];
    for (let i = 0; i < n; i++) { const d = ds(i); if (Math.abs(d) <= 3.2 * sigma) win.push({ i, d }); }
    win.sort((a, b) => a.d - b.d);
    const disp = win.map(({ i, d }) => { const w = Math.exp(-d * d / (2 * sigma * sigma)); return { i, w, p: [P[i][0] - N[i][0] * depth * w, P[i][1] - N[i][1] * depth * w] }; });
    const newPts = disp.map(q => q.p);
    const oldPts = disp.filter(q => q.w > 0.03).map(q => P[q.i]);
    const construct = hand(ctx, it.root, lineCmds(newPts), { u: 1, seed: 'envc2', jit: 0.5, cls: 'skt-env-c', over: false });
    const firm = hand(ctx, it.root, lineCmds(newPts), { u: 1, seed: 'envf2', jit: 0.2, cls: 'skt-env', over: false });
    // the old section is not erased away: it stays as a ghost, the way a redrawn pencil line leaves one
    const env0 = ctx.site && ctx.site.rough && ctx.site.rough.envelope;
    let cut = null;
    if (env0 && env0.firm) {
      const mid = ctx.id('envmask');
      const [bx0, by0, bx1, by1] = env.boundsWorld || bbox(P);
      const mask = mk('mask', { id: mid, maskUnits: 'userSpaceOnUse', x: f2(bx0 - 30), y: f2(by0 - 30), width: f2(bx1 - bx0 + 60), height: f2(by1 - by0 + 60) }, ctx.defs);
      mk('rect', { x: f2(bx0 - 30), y: f2(by0 - 30), width: f2(bx1 - bx0 + 60), height: f2(by1 - by0 + 60), fill: '#fff' }, mask);
      cut = mk('path', { d: polyD(oldPts, false), fill: 'none', stroke: '#000', 'stroke-opacity': 0, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', style: 'stroke-width:calc(var(--sw) * 9px)' }, mask);
      [env0.firm, env0.construct].forEach(e => e && e.setAttribute('mask', 'url(#' + mid + ')'));
    }
    const ghost = o.ghost != null ? o.ghost : 0.2;
    it.stroke(construct, { dur: o.constructDur || 1.1, ease: 'power1.inOut', type: 'pencil-light' });
    it.stroke(firm, { dur: o.firmDur || 1.4, at: 0.55, ease: 'power1.inOut', type: 'pencil' });
    if (cut) it.fn((tl, t0, d) => { tl.fromTo(cut, { attr: { 'stroke-opacity': 0 } }, { attr: { 'stroke-opacity': f2(1 - ghost) }, duration: d, ease: 'power1.inOut', immediateRender: true }, t0); }, { at: 0.8, dur: 1.3, type: 'erase' });
    it.parts = { construct, firm, cut };
    it.newPoints = newPts; it.depth = depth; it.sigma = sigma; it.closestIndex = c;
    it.crossing = (a, b) => { a = ctx.pt(a); b = ctx.pt(b); let tBest = null; for (let i = 1; i < newPts.length; i++) { const t = segX(a, b, newPts[i - 1], newPts[i]); if (t != null && (tBest == null || t < tBest)) tBest = t; } return tBest; };
    if (o.morph) {
      // alternative: move the site's own firm envelope line inward (same command structure, attr d tween)
      it.morph = (tl, t, dur) => {
        const el = env0 && env0.firm; if (!el) return t;
        const d0 = el.getAttribute('d'), cm = S.parseD(d0);
        const byI = {}; disp.forEach(q => { byI[q.i] = q.w; });
        let vi = 0;
        const cm2 = cm.map(([cc, a]) => { if (cc === 'Z') return [cc, a]; const i = vi++; const w = byI[i] || 0; return [cc, [a[0] - N[i % n][0] * depth * w, a[1] - N[i % n][1] * depth * w]]; });
        tl.fromTo(el, { attr: { d: d0 } }, { attr: { d: S.fmt(cm2) }, duration: dur || 1.6, ease: 'power2.inOut', immediateRender: false }, t);
        return t + (dur || 1.6);
      };
    }
    return it;
  }

  // ------------------------------------------------------------ 13. incident box
  function incidentBox(ctx, at, o) {
    o = o || {};
    const it = new Item(ctx, 'incident', o);
    const g = pxAt(ctx, it.root, ctx.pt(at || 'roof03Centre'));
    const text = o.text || 'INCIDENT · ROOF 03 · 16:07';
    const fs = o.size || 18, ls = 0.12;
    const tw = monoWidth(text, fs, ls);
    const band = 8, padX = 22;
    const w = tw + 2 * padX + 2 * band, h = fs * 1.9 + 2 * band;
    const off = o.offset || [54, -118];
    const x0 = off[0], y0 = off[1];
    const cross = hand(ctx, g, 'M-5 -5L5 5M5 -5L-5 5', { seed: 'incx', jit: 0.3, over: false });
    const lead = hand(ctx, g, lineCmds([[6, -6], [x0 + 18, y0 + h]]), { seed: 'incl', jit: 0.4, cls: 'skt-lite', over: false });
    const outerP = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
    const innerP = [[x0 + band, y0 + band], [x0 + w - band, y0 + band], [x0 + w - band, y0 + h - band], [x0 + band, y0 + h - band]];
    const outer = hand(ctx, g, lineCmds(outerP, true), { seed: 'inco', jit: 0.5, occ: true, ext: true, extMin: 20 });
    const inner = hand(ctx, g, lineCmds(innerP, true), { seed: 'inci', jit: 0.4, over: false, cls: 'skt-fine' });
    const hc = hatch(ctx, g, outerP, { spacing: 4.6, seed: 'inch', clipD: polyD(outerP, true) + polyD(innerP.slice().reverse(), true), evenodd: true });
    const lab = letters(ctx, g, text, x0 + band + padX, y0 + h / 2 + fs * 0.35, { size: fs, weight: 500, ls, seed: 'incident' });
    it.stroke(cross, { dur: 0.16 }); it.stroke(lead, { dur: 0.22 }); it.stroke(outer, { dur: 0.5 }); it.stroke(inner, { dur: 0.35 });
    it.draw(hc, 0, { dur: 0.5, type: 'hatch' }); it.wipe(lab);
    it.parts = { cross, lead, outer, inner, hatch: hc, label: lab };
    return it;
  }

  // ------------------------------------------------------------ PAPER: shared bits
  function rectCmds(x, y, w, h) { return lineCmds([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true); }
  function greek(ctx, it, g, x, y, w, rows, o) { // "lines of text": light pencil rules standing in for copy
    o = o || {};
    const R = rng('gk' + (o.seed || '') + x + y);
    let d = '';
    for (let i = 0; i < rows; i++) { const ln = w * (o.min || 0.55 + R() * 0.4) * (i === rows - 1 ? 0.6 : 1); d += 'M' + f2(x) + ' ' + f2(y + i * (o.lh || 16)) + 'L' + f2(x + ln) + ' ' + f2(y + i * (o.lh || 16)); }
    const rec = hand(ctx, g, d, { seed: 'gk' + (o.seed || '') + x, jit: 0.45, cls: 'skt-lite', over: false });
    it.stroke(rec, { dur: o.dur || 0.12 * rows + 0.1, type: 'pencil-light' });
    return rec;
  }
  function frame(ctx, it, g, x, y, w, h, o) {
    o = o || {};
    const rec = hand(ctx, g, rectCmds(x, y, w, h), { seed: 'fr' + (o.seed || '') + x + y, jit: o.jit != null ? o.jit : 0.6, ext: o.ext !== false, extMin: 30, cls: o.cls || 'skt-fine', occ: o.occ });
    it.stroke(rec, { dur: o.dur || 0.55, type: o.type || 'ruler' });
    return rec;
  }
  function arrowCmds(a, b, o) {
    o = o || {};
    const L = dist(a, b), tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L, hs = o.head || 10, ang = 0.44;
    const rot = (v, th) => [v[0] * Math.cos(th) - v[1] * Math.sin(th), v[0] * Math.sin(th) + v[1] * Math.cos(th)];
    const l = rot([-tx, -ty], ang), r = rot([-tx, -ty], -ang);
    return { shaft: [a, b], head: [[b[0] + l[0] * hs, b[1] + l[1] * hs], b, [b[0] + r[0] * hs, b[1] + r[1] * hs]] };
  }
  // a hand arrow: 'solid' | 'dashed' | 'dotted'
  function handArrow(ctx, a, b, o) {
    o = o || {};
    const it = new Item(ctx, 'arrow', o);
    const style = o.style || 'solid';
    const bend = o.bend != null ? o.bend : 0.06;
    const L = dist(a, b), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    const m = [(a[0] + b[0]) / 2 + nx * L * bend, (a[1] + b[1]) / 2 + ny * L * bend];
    const pl = flatten(smoothCmds([a, m, b], false), 16)[0];
    const end = pl[pl.length - 1], pre = pointAt(pl, plLen(pl) - 6).p;
    const ac = arrowCmds(pre, end, { head: o.head || 10 });
    if (style === 'solid') {
      const shaft = hand(ctx, it.root, smoothCmds([a, m, b], false), { seed: 'ar' + f2(a[0]) + f2(b[0]), jit: 0.6, cls: o.cls });
      it.stroke(shaft, { dur: o.dur || 0.45, type: 'pencil' });
    } else {
      const dp = dottedPath(ctx, [a, m, b], { layer: it.root, arrow: false, dash: style === 'dashed', spacingPx: style === 'dashed' ? 10 : 7, lite: style === 'dotted', seed: 'ar' + style + f2(a[0]), dur: o.dur || 0.55 });
      it.fn((tl, t0) => dp.drawOn(tl, t0, { events: false }), { dur: dp.duration, type: 'pencil-dots', meta: { style } });
    }
    const head = hand(ctx, it.root, lineCmds(ac.head), { seed: 'ah' + f2(b[0]) + f2(b[1]), jit: 0.4, over: false, cls: style === 'dotted' ? 'skt-lite' : (style === 'dashed' ? 'skt-fine' : o.cls) });
    it.stroke(head, { dur: 0.15 });
    it.style = style;
    return it;
  }

  // ------------------------------------------------------------ 9. detail callout (Frame 2)
  function detailCallout(ctx, box, o) {
    o = o || {};
    box = Object.assign({ x: 858, y: 128, w: 966, h: 318 }, box || {});
    const grp = new Group(ctx, 'detail-callout', o);
    const { x, y, w, h } = box;
    // frame, detail bubble D1 / 01, heading, rule
    const head = new Item(ctx, 'detail-head', { layer: grp.root });
    head.add({ kind: 'fn', f: () => {}, dur: 0.3, type: 'paper-slide', meta: { what: 'detail callout' }, advance: 0.2 });
    frame(ctx, head, head.root, x, y, w, h, { seed: 'd1', dur: 0.8, cls: 'skt-fine' });
    const bub = hand(ctx, head.root, handCircleCmds(x, y, 31, 'bubble', { spiral: 0.015, over: 0.25 }), { seed: 'bub', jit: 0.4, occ: true });
    const bl = hand(ctx, head.root, 'M' + (x - 29) + ' ' + y + 'L' + (x + 29) + ' ' + y, { seed: 'bubl', jit: 0.35, over: false, cls: 'skt-fine' });
    head.stroke(bub, { dur: 0.35 }); head.stroke(bl, { dur: 0.14 });
    const d1 = letters(ctx, head.root, o.tag || 'D1', x, y - 8, { size: 19, weight: 600, anchor: 'middle', seed: 'D1', rot: 0, irr: 0.03, ls: 0.06 });
    const sh = letters(ctx, head.root, o.sheet || '01', x, y + 19, { size: 13, weight: 500, anchor: 'middle', seed: 'sh', rot: 0, irr: 0.02, ls: 0.1 });
    head.wipe(d1, { dur: 0.2 }); head.wipe(sh, { dur: 0.15 });
    const hx = x + 56, hy = y + 62;
    const hd = letters(ctx, head.root, o.heading || 'PROPERTY + BI PROGRAMME · CONDITIONS', hx, hy, { size: 20, weight: 500, ls: 0.14, seed: 'dh', rot: 0.15, irr: 0.03 });
    head.wipe(hd, { pace: 520 });
    const rule = hand(ctx, head.root, 'M' + hx + ' ' + (hy + 20) + 'L' + (x + w - 44) + ' ' + (hy + 20), { seed: 'drule', jit: 0.3, over: false, cls: 'skt-lite' });
    head.stroke(rule, { dur: 0.45, type: 'ruler' });
    grp.child(head);
    // clauses, typeset in Plex Sans 26, one line at a time
    const clauses = o.clauses || [
      { num: '4.2', lines: ['Hot work requires a permit, a certified operator', 'and a fire watch.'] },
      { num: '4.3', lines: ['Automatic sprinkler protection must remain in service.'] },
    ];
    const fs = o.size || 26, lh = Math.round(fs * 1.42);
    let cy = hy + 76;
    grp.clauses = clauses.map((cl, ci) => {
      const it = new Item(ctx, 'clause', { layer: grp.root });
      const num = letters(ctx, it.root, cl.num, hx, cy, { size: 20, weight: 500, seed: 'cn' + cl.num, rot: 0, irr: 0.02, ls: 0.04 });
      it.wipe(num, { dur: 0.18, type: null });
      it.lines = cl.lines.map((ln, li) => { const t = sans(ctx, it.root, ln, hx + 66, cy + li * lh, { size: fs }); it.wipe(t, { pace: 1300, type: 'pen', ease: 'power1.inOut' }); return t; });
      it.num = num; it.baseline = cy;
      cy += cl.lines.length * lh + Math.round(fs * 0.55);
      grp.child(it, { gap: 0.15 });
      return it;
    });
    // leader from the callout to the envelope on the site (screen point)
    if (o.leaderTo) {
      const it = new Item(ctx, 'detail-leader', { layer: grp.root });
      const a = [x, y + h * 0.66], b = o.leaderTo;
      const m = [lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5) - 26];
      const rec = hand(ctx, it.root, smoothCmds([a, m, b], false), { seed: 'dlead', jit: 0.5, cls: 'skt-fine', over: false });
      const ring = hand(ctx, it.root, handCircleCmds(b[0], b[1], 5, 'dlr', { spiral: 0.02 }), { seed: 'dlr', jit: 0.3, over: false, cls: 'skt-fine' });
      it.stroke(rec, { dur: 0.6 }); it.stroke(ring, { dur: 0.15 });
      grp.leader = it; grp.child(it, { gap: 0.1 });
    }
    grp.head = head; grp.box = box;
    // the 4.3 clause's line, for the chain's first arrow
    const last = grp.clauses[grp.clauses.length - 1];
    grp.sprinklerAnchor = [hx + 66 + (last.lines[0] ? last.lines[0].w * 0.42 : 200), last.baseline + 12];
    return grp;
  }

  // ------------------------------------------------------------ 10. translation chain (Frame 2)
  function translationChain(ctx, box, o) {
    o = o || {};
    box = Object.assign({ x: 858, y: 500, w: 966, h: 336 }, box || {});
    const grp = new Group(ctx, 'chain', o);
    const gapX = o.gap || 54, n = 4, aw = (box.w - gapX * (n - 1)) / n, ah = box.h;
    const xs = [0, 1, 2, 3].map(i => box.x + i * (aw + gapX)), y = box.y;
    const ys = y + (o.sprinklerRow || 208); // the sprinkler condition sits on one row across all four
    const pad = 16;
    // PROCEDURE: HSE-PR-12 · Hot work, lines of text, one line reads 'Confirm sprinklers in service'
    const proc = new Item(ctx, 'procedure', { layer: grp.root });
    {
      const x = xs[0];
      proc.add({ kind: 'fn', f: () => {}, dur: 0.25, type: 'paper-slide', meta: { what: 'procedure' }, advance: 0.2 });
      frame(ctx, proc, proc.root, x, y, aw, ah, { seed: 'proc', occ: true });
      const id = letters(ctx, proc.root, 'HSE-PR-12', x + pad, y + 34, { size: 17, weight: 500, seed: 'pr', rot: 0.2 });
      proc.wipe(id, { type: 'pen' });
      const tt = sans(ctx, proc.root, 'Hot work', x + pad, y + 64, { size: 22, weight: 500 });
      proc.wipe(tt, { type: 'pen', pace: 600 });
      proc.stroke(hand(ctx, proc.root, 'M' + (x + pad) + ' ' + (y + 80) + 'L' + (x + aw - pad) + ' ' + (y + 80), { seed: 'prr', jit: 0.3, over: false, cls: 'skt-lite' }), { dur: 0.2, type: 'ruler' });
      greek(ctx, proc, proc.root, x + pad, y + 104, aw - 2 * pad, 5, { seed: 'pr1', lh: 17 });
      const s1 = sans(ctx, proc.root, 'Confirm sprinklers', x + pad, ys, { size: 19 });
      const s2 = sans(ctx, proc.root, 'in service', x + pad, ys + 24, { size: 19 });
      proc.wipe(s1, { type: 'pen', pace: 500 }); proc.wipe(s2, { type: 'pen', pace: 500 });
      const ul = hand(ctx, proc.root, 'M' + (x + pad) + ' ' + (ys + 6) + 'L' + f2(s1.x1 + 2) + ' ' + (ys + 6) + 'M' + (x + pad) + ' ' + (ys + 30) + 'L' + f2(s2.x1 + 2) + ' ' + (ys + 30), { seed: 'prul', jit: 0.45, over: false });
      proc.stroke(ul, { dur: 0.3, type: 'pen' });
      greek(ctx, proc, proc.root, x + pad, ys + 58, aw - 2 * pad, 4, { seed: 'pr2', lh: 17 });
      proc.sprinkler = [s1.x1, ys - 6];
      proc.parts.sprinklerText = [s1, s2];
    }
    // PERMIT: PERMIT HW-0412, fields, a signature, an APPROVED · HSE stamp, row 'Sprinklers ✓'
    const perm = new Item(ctx, 'permit', { layer: grp.root });
    {
      const x = xs[1];
      perm.add({ kind: 'fn', f: () => {}, dur: 0.25, type: 'paper-slide', meta: { what: 'permit' }, advance: 0.2 });
      frame(ctx, perm, perm.root, x, y, aw, ah, { seed: 'perm', occ: true });
      const k = letters(ctx, perm.root, 'PERMIT', x + pad, y + 30, { size: 13, weight: 500, ls: 0.18, seed: 'pk', tone: 'skt-t2', rot: 0.1 });
      const id = letters(ctx, perm.root, 'HW-0412', x + pad, y + 58, { size: 21, weight: 500, seed: 'pid', rot: -0.2 });
      perm.wipe(k, { type: 'pen' }); perm.wipe(id, { type: 'pen' });
      [['OPERATOR', y + 92], ['FIRE WATCH', y + 136]].forEach(([f, fy], i) => {
        const lb = letters(ctx, perm.root, f, x + pad, fy, { size: 12, weight: 500, ls: 0.14, seed: 'pf' + i, tone: 'skt-t2', rot: 0 });
        perm.wipe(lb, { type: null, dur: 0.15 });
        const rl = hand(ctx, perm.root, 'M' + (x + pad) + ' ' + (fy + 20) + 'L' + (x + aw - pad) + ' ' + (fy + 20), { seed: 'pfr' + i, jit: 0.3, over: false, cls: 'skt-lite' });
        perm.stroke(rl, { dur: 0.18, type: 'ruler' });
        const val = hand(ctx, perm.root, scribbleCmds(x + pad + 6, fy + 13, 70 + i * 16, 4, 'pv' + i), { seed: 'pv' + i, jit: 0.3, over: false, cls: 'skt-fine' });
        perm.stroke(val, { dur: 0.3, type: 'pen' });
      });
      const sp = sans(ctx, perm.root, 'Sprinklers', x + pad, ys, { size: 19 });
      perm.wipe(sp, { type: 'pen', pace: 500 });
      tickAfter(ctx, perm, perm.root, sp.x1 + 16, ys - 7, { seed: 'permtick', s: 1.15 });
      const sig = hand(ctx, perm.root, scribbleCmds(x + pad + 4, ys + 54, 118, 11, 'perm-sig'), { seed: 'psig', jit: 0.35, over: false, cls: 'skt-heavy' });
      perm.stroke(sig, { dur: 0.55, type: 'pen', meta: { what: 'signature' } });
      const sl = letters(ctx, perm.root, 'SIGNED', x + pad, ys + 78, { size: 11, weight: 500, ls: 0.16, seed: 'psl', tone: 'skt-t2', rot: 0 });
      perm.wipe(sl, { type: null, dur: 0.12 });
      // the stamp: a double rule box, set at once (stamp sound), slightly turned as a hand stamp is
      const sg = mk('g', { transform: 'translate(' + f2(x + aw * 0.5) + ' ' + f2(ys + 104) + ') rotate(-4.5)' }, perm.root);
      const stampInner = mk('g', {}, sg);
      const stw = 146, sth = 36;
      mk('path', { class: 'skt-m skt-heavy', d: 'M' + (-stw / 2) + ' ' + (-sth / 2) + 'h' + stw + 'v' + sth + 'h' + (-stw) + 'Z', opacity: 0.86 }, stampInner);
      mk('path', { class: 'skt-m skt-fine', d: 'M' + (-stw / 2 + 4) + ' ' + (-sth / 2 + 4) + 'h' + (stw - 8) + 'v' + (sth - 8) + 'h' + (-(stw - 8)) + 'Z', opacity: 0.7 }, stampInner);
      const stt = mk('text', { class: 'skt-lab skt-w6', x: 0, y: 5, 'font-size': 14, 'letter-spacing': f2(0.1 * 14), 'text-anchor': 'middle', opacity: 0.88 }, stampInner);
      stt.textContent = 'APPROVED · HSE';
      perm.pop(stampInner, { dur: 0.16, type: 'stamp', scale: 1.1, meta: { text: 'APPROVED · HSE' } });
      perm.sprinkler = [sp.x1 + 26, ys - 6];
      perm.parts.sprinklerText = [sp];
    }
    // BRIEFING: five small figures around a point, 07:15 · TOOLBOX TALK, a spoken note 'sprinklers on'
    const brief = new Group(ctx, 'briefing', { layer: grp.root });
    {
      const x = xs[2];
      const top = new Item(ctx, 'briefing-sheet', { layer: brief.root });
      top.add({ kind: 'fn', f: () => {}, dur: 0.25, type: 'paper-slide', meta: { what: 'briefing' }, advance: 0.2 });
      frame(ctx, top, top.root, x, y, aw, ah, { seed: 'brief', occ: true });
      const t1 = letters(ctx, top.root, '07:15', x + pad, y + 34, { size: 17, weight: 500, seed: 'bt1', rot: -0.2 });
      const t2 = letters(ctx, top.root, 'TOOLBOX TALK', x + pad, y + 56, { size: 15, weight: 500, ls: 0.12, seed: 'bt2', rot: 0.25 });
      top.wipe(t1, { type: 'pen' }); top.wipe(t2, { type: 'pen' });
      brief.child(top);
      const figs = groupFigures(ctx, { kind: 'semicircle', centre: [x + aw / 2, y + 148], n: 5, radius: 62, squash: 0.36, heightPx: 40, layer: brief.root, seed: 'brief' });
      brief.child(figs, { gap: -0.05 });
      const note = new Item(ctx, 'briefing-note', { layer: brief.root });
      const nt = sans(ctx, note.root, 'sprinklers on', x + pad + 14, ys, { size: 18, tone: 'skt-t2' });
      const bw = nt.w + 26, bx = x + pad + 2, by = ys - 22, bh = 34;
      const bubble = hand(ctx, note.root, smoothCmds([[bx + 8, by], [bx + bw - 8, by - 1], [bx + bw + 1, by + bh / 2], [bx + bw - 8, by + bh], [bx + 44, by + bh + 1], [bx + 36, by + bh + 12], [bx + 30, by + bh], [bx + 7, by + bh - 1], [bx - 1, by + bh / 2]], true), { seed: 'bnote', jit: 0.5, cls: 'skt-lite', over: false });
      note.stroke(bubble, { dur: 0.4, type: 'pencil-light' });
      note.wipe(nt, { type: 'pen', pace: 420 });
      brief.child(note, { gap: 0.05 });
      brief.sprinkler = [bx + bw + 4, ys - 6];
      brief.parts.sprinklerText = [nt];
      brief.figures = figs;
    }
    // CHECKLIST: Fire watch ☑, Extinguisher ☑, Sprinklers ?
    const chk = new Item(ctx, 'checklist', { layer: grp.root });
    {
      const x = xs[3];
      chk.add({ kind: 'fn', f: () => {}, dur: 0.25, type: 'paper-slide', meta: { what: 'checklist' }, advance: 0.2 });
      frame(ctx, chk, chk.root, x, y, aw, ah, { seed: 'chk', occ: true });
      const h1 = letters(ctx, chk.root, 'CHECKLIST', x + pad, y + 30, { size: 13, weight: 500, ls: 0.18, seed: 'ch1', tone: 'skt-t2', rot: 0 });
      const h2 = letters(ctx, chk.root, 'HOT WORK', x + pad, y + 56, { size: 18, weight: 500, seed: 'ch2', rot: 0.2 });
      chk.wipe(h1, { type: 'pen' }); chk.wipe(h2, { type: 'pen' });
      const rows = [['Fire watch', ys - 88, 'tick'], ['Extinguisher', ys - 44, 'tick'], ['Sprinklers', ys, 'q'], ['', ys + 44, 'empty'], ['', ys + 88, 'empty']];
      rows.forEach(([txt, ry, st], i) => {
        const bx = x + pad, bs = 16;
        const box2 = hand(ctx, chk.root, rectCmds(bx, ry - 14, bs, bs), { seed: 'cb' + i, jit: 0.45, over: false, cls: st === 'empty' ? 'skt-lite' : 'skt-fine' });
        chk.stroke(box2, { dur: 0.16, type: 'pencil-light' });
        if (txt) {
          const tt = sans(ctx, chk.root, txt, bx + bs + 12, ry, { size: 19, tone: st === 'q' ? 'skt-t3' : null });
          chk.wipe(tt, { type: 'pen', pace: 520 });
          if (st === 'tick') tickAfter(ctx, chk, chk.root, bx + 8, ry - 8, { seed: 'ct' + i, s: 1.05 });
          else {
            const q = hand(ctx, chk.root, qmarkCmds(tt.x1 + 16, ry + 1, 22), { seed: 'cq', jit: 0.35, over: false });
            const qd = mk('circle', { class: 'skt-fill', cx: f2(tt.x1 + 16), cy: f2(ry - 0.5), r: 1.7 }, chk.root);
            chk.stroke(q, { dur: 0.3, type: 'pencil' }); chk.pop(qd, { dur: 0.06 });
            chk.sprinkler = [bx, ry - 6];
            chk.parts.sprinklerText = [tt];
          }
        } else greek(ctx, chk, chk.root, bx + bs + 12, ry - 5, aw - 2 * pad - bs - 20, 1, { seed: 'cg' + i, min: 0.6, dur: 0.15 });
      });
    }
    // hand arrows between the sprinkler mentions: solid, dashed, dotted
    const styles = o.arrowStyles || ['solid', 'dashed', 'dotted'];
    const stations = [proc, perm, brief, chk];
    grp.arrows = [];
    for (let i = 0; i < 3; i++) {
      const a = [xs[i] + aw + 6, ys - 8], b = [xs[i + 1] - 7, ys - 8];
      grp.arrows.push(handArrow(ctx, a, b, { layer: grp.root, style: styles[i], bend: 0, head: 9 }));
    }
    grp.procedure = proc; grp.permit = perm; grp.briefing = brief; grp.checklist = chk;
    if (o.from) { grp.lead = handArrow(ctx, o.from, [xs[0] + aw * 0.5, y - 8], { layer: grp.root, style: 'solid', bend: 0.12, head: 10 }); }
    // default sequence: lead, procedure, arrow, permit, arrow, briefing, arrow, checklist
    if (grp.lead) grp.child(grp.lead);
    grp.child(proc, { gap: 0 });
    stations.slice(1).forEach((st, i) => { grp.child(grp.arrows[i], { gap: 0 }); grp.child(st, { gap: 0 }); });
    grp.stations = stations; grp.box = box; grp.sprinklerRow = ys;
    return grp;
  }

  // ------------------------------------------------------------ 11. evidence fragments (Frame 3)
  const EVIDENCE = {
    photo: { title: 'PHOTO · ROOF 03 · 16:09', w: 236, h: 152 },
    call: { title: 'CALL LOG · 14:40', lines: ['VALVE ROOM', '2 MIN 13 S'], w: 262, h: 116 },
    permit: { title: 'PERMIT HW-0412', lines: ['SIGNED 14:12', 'SPRINKLERS'], w: 262, h: 128 },
    workorder: { title: 'WORK ORDER WO-2291', lines: ['SZ3 ISOLATION', '14:42'], w: 290, h: 116 },
    programme: { title: 'PROGRAMME · 4.3', lines: ['SPRINKLER PROTECTION'], w: 316, h: 112 },
    statement: { title: 'STATEMENT · FIRE WATCH', lines: ['"I THOUGHT THE', 'SPRINKLERS WERE ON"'], w: 330, h: 124 },
    email: { title: 'EMAIL · 15:02', lines: ['RE: ROOF WORK'], w: 262, h: 122 },
  };
  function evidence(ctx, kind, o) {
    o = o || {};
    const spec = Object.assign({}, EVIDENCE[kind] || {}, o);
    const it = new Item(ctx, 'evidence-' + kind, o);
    const x = spec.x, y = spec.y, w = spec.w, h = spec.h;
    const g = it.root;
    const fsT = o.titleSize || 16, fsB = o.size || 17, pad = 14;
    const seed = 'ev' + kind;
    it.add({ kind: 'fn', f: () => {}, dur: 0.22, type: 'paper-slide', meta: { what: kind }, advance: 0.3 });
    if (kind === 'photo') {
      // not a photograph: a hatched frame with a lens crosshair and viewfinder corners
      const fr = frame(ctx, it, g, x, y, w, h, { seed, occ: true, dur: 0.4 });
      const inner = [[x + 8, y + 8], [x + w - 8, y + 8], [x + w - 8, y + h - 8], [x + 8, y + h - 8]];
      const hc = hatch(ctx, g, inner, { spacing: 6, seed: seed + 'h' });
      it.draw(hc, 0, { dur: 0.45, type: 'hatch' });
      const cx = x + w / 2, cy = y + h / 2;
      const lens = mk('circle', { class: 'skt-occ', cx: f2(cx), cy: f2(cy), r: 27 }, g);
      it.fadeIn(lens, { dur: 0.01 });
      const ring = hand(ctx, g, handCircleCmds(cx, cy, 22, seed + 'r', { spiral: 0.02 }), { seed: seed + 'r', jit: 0.4 });
      const crs = hand(ctx, g, 'M' + (cx - 34) + ' ' + cy + 'L' + (cx - 8) + ' ' + cy + 'M' + (cx + 8) + ' ' + cy + 'L' + (cx + 34) + ' ' + cy + 'M' + cx + ' ' + (cy - 34) + 'L' + cx + ' ' + (cy - 8) + 'M' + cx + ' ' + (cy + 8) + 'L' + cx + ' ' + (cy + 34), { seed: seed + 'x', jit: 0.3, over: false, cls: 'skt-fine' });
      const cn = 16, c2 = 20;
      const corners = hand(ctx, g, ['M', x + c2, y + c2 + cn, 'L', x + c2, y + c2, 'L', x + c2 + cn, y + c2, 'M', x + w - c2 - cn, y + c2, 'L', x + w - c2, y + c2, 'L', x + w - c2, y + c2 + cn, 'M', x + w - c2, y + h - c2 - cn, 'L', x + w - c2, y + h - c2, 'L', x + w - c2 - cn, y + h - c2, 'M', x + c2 + cn, y + h - c2, 'L', x + c2, y + h - c2, 'L', x + c2, y + h - c2 - cn].join(' '), { seed: seed + 'c', jit: 0.3, over: false, cls: 'skt-fine' });
      it.stroke(ring, { dur: 0.25 }); it.stroke(crs, { dur: 0.2 }); it.stroke(corners, { dur: 0.3 });
      const cap = letters(ctx, g, spec.title, x, y + h + 24, { size: fsT, weight: 500, seed: seed + 't' });
      it.wipe(cap);
      it.frameRec = fr;
    } else {
      frame(ctx, it, g, x, y, w, h, { seed, occ: true, dur: 0.38 });
      const t = letters(ctx, g, spec.title, x + pad, y + 28, { size: fsT, weight: 500, seed: seed + 't', ls: 0.1 });
      it.wipe(t);
      it.stroke(hand(ctx, g, 'M' + (x + pad) + ' ' + (y + 40) + 'L' + (x + w - pad) + ' ' + (y + 40), { seed: seed + 'r', jit: 0.3, over: false, cls: 'skt-lite' }), { dur: 0.16, type: 'pencil-light' });
      const lines = spec.lines || [];
      const tone = kind === 'statement' ? null : null;
      it.lines = lines.map((ln, i) => { const lb = letters(ctx, g, ln, x + pad, y + 66 + i * 24, { size: fsB, seed: seed + i, tone }); it.wipe(lb, { type: 'pen' }); return lb; });
      const last = it.lines[it.lines.length - 1];
      if (kind === 'permit') {
        tickAfter(ctx, it, g, last.x1 + 18, last.y - 6, { seed: 'evp' });
        const sig = hand(ctx, g, scribbleCmds(x + w - 108, y + 78, 88, 8, 'ev-sig'), { seed: 'evsig', jit: 0.3, over: false, cls: 'skt-fine' });
        it.stroke(sig, { dur: 0.4, type: 'pen' });
      } else if (kind === 'call') {
        const bx = x + pad, by = y + h - 14, bw = w - 2 * pad;
        const bar = hand(ctx, g, 'M' + bx + ' ' + by + 'L' + (bx + bw) + ' ' + by + 'M' + bx + ' ' + (by - 5) + 'L' + bx + ' ' + (by + 5) + 'M' + f2(bx + bw * 0.62) + ' ' + (by - 5) + 'L' + f2(bx + bw * 0.62) + ' ' + (by + 5), { seed: 'callbar', jit: 0.3, over: false, cls: 'skt-fine' });
        it.stroke(bar, { dur: 0.3, type: 'pencil' });
      } else if (kind === 'email' || kind === 'programme') {
        greek(ctx, it, g, x + pad, y + (kind === 'email' ? 88 : 88), w - 2 * pad, kind === 'email' ? 2 : 1, { seed: seed + 'g', lh: 14 });
      } else if (kind === 'workorder') {
        const st = hand(ctx, g, 'M' + (x + w - 96) + ' ' + (y + 60) + 'L' + (x + w - pad) + ' ' + (y + 60) + 'M' + (x + w - 96) + ' ' + (y + 84) + 'L' + (x + w - pad - 20) + ' ' + (y + 84), { seed: 'wo', jit: 0.3, over: false, cls: 'skt-lite' });
        it.stroke(st, { dur: 0.2, type: 'pencil-light' });
      }
    }
    // the pin: a fine leader from the fragment to a site point, and a small ring there
    if (o.pin) {
      const side = o.pinFrom || 'auto';
      const P2 = o.pin;
      const cx = x + w / 2, cy = y + h / 2;
      let a;
      if (Array.isArray(side)) a = [x + side[0], y + side[1]];
      else {
        const dx = P2[0] - cx, dy = P2[1] - cy;
        a = Math.abs(dx) / w > Math.abs(dy) / h ? [dx > 0 ? x + w : x, clamp(P2[1], y + 14, y + h - 14)] : [clamp(P2[0], x + 14, x + w - 14), dy > 0 ? y + h + (kind === 'photo' ? 32 : 0) : y];
      }
      const lead = mk('path', { class: 'skt-lead', d: 'M' + f2(a[0]) + ' ' + f2(a[1]) + 'L' + f2(P2[0]) + ' ' + f2(P2[1]), pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }, g);
      const pg = mk('g', { transform: 'translate(' + f2(P2[0]) + ' ' + f2(P2[1]) + ')' }, g);
      const pr = hand(ctx, pg, handCircleCmds(0, 0, 4.2, 'pin' + kind, { spiral: 0.02 }), { seed: 'pin' + kind, jit: 0.3, over: false, cls: 'skt-fine' });
      const pd = mk('circle', { class: 'skt-fill', r: 1.4 }, pg);
      it.fn((tl, t0, d) => { tl.fromTo(lead, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: d, ease: 'power2.out', immediateRender: true }, t0); }, { dur: 0.4, advance: 1 });
      it.stroke(pr, { dur: 0.12, type: 'pin', meta: { kind } });
      it.pop(pd, { dur: 0.06 });
      it.parts.leader = lead; it.parts.pin = pg; it.leaderFrom = a; it.pinAt = P2.slice();
    }
    it.box = { x, y, w, h };
    return it;
  }
  function questionMark(ctx, at, o) {
    o = o || {};
    const it = new Item(ctx, 'question', o);
    const p = ctx.pt(at), s = o.size || 44;
    const g = pxAt(ctx, it.root, p);
    const rot = o.rot != null ? o.rot : (rng('q' + f2(p[0]))() - 0.5) * 12;
    g.setAttribute('transform', (g.getAttribute('transform') || '') + ' rotate(' + f2(rot) + ')');
    const q = hand(ctx, g, qmarkCmds(0, 0, s), { seed: 'qm' + f2(p[0]) + f2(p[1]), jit: 0.5, cls: s > 36 ? '' : 'skt-fine' });
    const d = mk('circle', { class: 'skt-fill', cx: 0, cy: f2(-0.02 * s), r: f2(Math.max(1.6, s * 0.045)) }, g);
    it.stroke(q, { dur: 0.35 }); it.pop(d, { dur: 0.06 });
    return it;
  }
  function investigationLine(ctx, a, b, o) {
    o = o || {};
    return dottedPath(ctx, [a, [lerp(a[0], b[0], 0.5) + (o.bend || 0) * (b[1] - a[1]), lerp(a[1], b[1], 0.5) - (o.bend || 0) * (b[0] - a[0])], b], Object.assign({ kind: 'investigation', dash: true, lite: true, arrow: false, spacingPx: 12, dashPx: 6, seed: 'inv' + f2(a[0]) + f2(b[1]) }, o));
  }
  function evidenceBoard(ctx, o) {
    o = o || {};
    const grp = new Group(ctx, 'evidence-board', o);
    const pins = o.pins || {};
    const L = Object.assign({
      email: [520, 96], photo: [1168, 84], call: [1566, 238], permit: [1472, 452], workorder: [1560, 694], programme: [1140, 868], statement: [560, 860],
    }, o.layout || {});
    const order = o.order || ['photo', 'call', 'permit', 'workorder', 'programme', 'statement', 'email'];
    grp.fragments = {};
    order.forEach((k, i) => {
      const f = evidence(ctx, k, { layer: grp.root, x: L[k][0], y: L[k][1], pin: pins[k] });
      grp.fragments[k] = f; grp.child(f, { stagger: o.stagger || 0.42 });
    });
    const F = grp.fragments;
    const edge = (f, sx, sy) => [f.box.x + f.box.w * sx, f.box.y + f.box.h * sy];
    grp.lines = [
      investigationLine(ctx, edge(F.permit, 0.5, 1), edge(F.workorder, 0.2, 0), { layer: grp.root, bend: 0.1 }),
      investigationLine(ctx, edge(F.call, 0, 0.8), edge(F.permit, 0.8, 0), { layer: grp.root, bend: -0.12 }),
      investigationLine(ctx, edge(F.statement, 1, 0.4), edge(F.programme, 0, 0.5), { layer: grp.root, bend: 0.06 }),
      investigationLine(ctx, edge(F.photo, 1, 0.7), edge(F.call, 0.3, 0), { layer: grp.root, bend: 0.1 }),
    ];
    grp.lines.forEach(l => grp.child(l, { stagger: 0.3 }));
    grp.questions = (o.questionMarks || [[1440, 390, 48], [1368, 800, 40], [1080, 300, 36], [1010, 960, 44]]).map(([qx, qy, s]) => { const q = questionMark(ctx, [qx, qy], { layer: grp.root, size: s }); grp.child(q, { stagger: 0.25 }); return q; });
    return grp;
  }
  function followPin(tl, frag, worldPt, camFrom, camTo, t, dur, ease, steps) {
    if (!frag.parts.leader) return t;
    steps = steps || 16;
    const e = gsap.parseEase(ease || 'power2.inOut');
    const at = p => { const k = e(p), r = { x: lerp(camFrom.x, camTo.x, k), y: lerp(camFrom.y, camTo.y, k), w: lerp(camFrom.w, camTo.w, k), h: lerp(camFrom.h, camTo.h, k) }; return [(worldPt[0] - r.x) * FW / r.w, (worldPt[1] - r.y) * FH / r.h]; };
    const a = frag.leaderFrom;
    const dOf = q => 'M' + f2(a[0]) + ' ' + f2(a[1]) + 'L' + f2(q[0]) + ' ' + f2(q[1]);
    for (let i = 0; i < steps; i++) {
      const q0 = at(i / steps), q1 = at((i + 1) / steps), ti = t + i * dur / steps;
      tl.fromTo(frag.parts.leader, { attr: { d: dOf(q0) } }, { attr: { d: dOf(q1) }, duration: dur / steps, ease: 'none', immediateRender: false }, ti);
      tl.fromTo(frag.parts.pin, { attr: { transform: 'translate(' + f2(q0[0]) + ' ' + f2(q0[1]) + ')' } }, { attr: { transform: 'translate(' + f2(q1[0]) + ' ' + f2(q1[1]) + ')' }, duration: dur / steps, ease: 'none', immediateRender: false }, ti);
    }
    return t + dur;
  }

  // ------------------------------------------------------------ 12. the gap timeline (Frame 3)
  function gapTimeline(ctx, o) {
    o = o || {};
    const grp = new Group(ctx, 'gap-timeline', o);
    const y = o.y || 786, x0 = o.x0 || 180, x1 = o.x1 || 1740, lx = o.leftX || 330, rx = o.rightX || 1590;
    const rule = new Item(ctx, 'gap-rule', { layer: grp.root });
    const r = hand(ctx, rule.root, 'M' + x0 + ' ' + y + 'L' + x1 + ' ' + y, { seed: 'gaprule', jit: 0.25, over: false, cls: 'skt-rule', ext: true, extMin: 100 });
    rule.stroke(r, { dur: 0.9, type: 'ruler', ease: 'power2.inOut' });
    let td = '';
    for (let x = x0 + 40; x < x1 - 20; x += 60) td += 'M' + x + ' ' + (y - 5) + 'L' + x + ' ' + (y + 5);
    const ticks = hand(ctx, rule.root, td, { seed: 'gapt', jit: 0.25, over: false, cls: 'skt-lite' });
    rule.stroke(ticks, { dur: 0.5, at: 0.35, type: 'pencil-light' });
    grp.child(rule);
    const marker = (x, text, anchor, name) => {
      const it = new Item(ctx, 'gap-marker', { layer: grp.root });
      const m = hand(ctx, it.root, 'M' + x + ' ' + (y + 7) + 'L' + x + ' ' + (y - 30), { seed: 'gm' + name, jit: 0.3, over: false, cls: 'skt-heavy' });
      const dot = mk('circle', { class: 'skt-fill', cx: x, cy: y, r: 3.6 }, it.root);
      it.pop(dot, { dur: 0.08, cx: x, cy: y, scale: 1.6, type: 'tick' });
      it.stroke(m, { dur: 0.2 });
      const lb = letters(ctx, it.root, text, x + (anchor === 'end' ? 4 : -4), y - 44, { size: o.size || 20, weight: 500, anchor, ls: 0.12, seed: 'gl' + name, rot: 0.1 });
      it.wipe(lb, { pace: 420 });
      it.label = lb;
      return it;
    };
    grp.left = marker(lx, o.leftText || '14:42 · CONDITION CHANGED', 'start', 'l');
    grp.right = marker(rx, o.rightText || 'DAY +2 · FOUND', 'end', 'r');
    grp.child(grp.left, { gap: 0.1 }); grp.child(grp.right, { gap: 0.25 });
    const br = new Item(ctx, 'gap-bracket', { layer: grp.root });
    const mid = (lx + rx) / 2, by = y + 22;
    const bd = 'M' + lx + ' ' + (by - 8) + 'L' + lx + ' ' + by + 'L' + (mid - 12) + ' ' + by + 'L' + mid + ' ' + (by + 11) + 'L' + (mid + 12) + ' ' + by + 'L' + rx + ' ' + by + 'L' + rx + ' ' + (by - 8);
    const b = hand(ctx, br.root, bd, { seed: 'gapbr', jit: 0.4, cls: '' });
    br.stroke(b, { dur: 0.9, type: 'pencil', ease: 'power1.inOut' });
    const gl = letters(ctx, br.root, o.gapText || 'THE GAP', mid, by + 50, { size: o.gapSize || 22, weight: 600, anchor: 'middle', ls: 0.24, seed: 'thegap', rot: 0 });
    br.wipe(gl, { pace: 260 });
    grp.bracket = br; grp.child(br, { gap: 0.2 });
    const nt = new Item(ctx, 'gap-note', { layer: grp.root });
    const line = sans(ctx, nt.root, o.note || 'Insurance position may have changed at 14:42.', mid, by + 100, { size: o.noteSize || 26, anchor: 'middle', tone: 'skt-t2' });
    nt.wipe(line, { pace: 1400, type: null });
    grp.note = nt; grp.child(nt, { gap: 0.25 });
    return grp;
  }

  // ------------------------------------------------------------ typeset statements (the three questions)
  function typeStack(ctx, at, lines, o) {
    o = o || {};
    const grp = new Group(ctx, 'type-stack', o);
    const p = ctx.pt(at), fs = o.size || 76, lh = o.lh || Math.round(fs * 1.16);
    grp.lines = lines.map((ln, i) => {
      const it = new Item(ctx, 'type-line', { layer: grp.root });
      const t = sans(ctx, it.root, ln, p[0], p[1] + i * lh, { size: fs, weight: o.weight || 300, ls: o.ls != null ? o.ls : -0.015 });
      it.wipe(t, { pace: o.pace || 2600, type: o.sound ? 'set' : null, ease: 'power2.out' });
      it.text = t;
      grp.child(it, { stagger: o.stagger || 1.2 });
      return it;
    });
    return grp;
  }

  // ------------------------------------------------------------ state helpers
  function sprinklerHeadsFade(tl, site, t, o) {
    o = o || {};
    const heads = (site.rough && site.rough.heads) || [];
    const step = o.step != null ? o.step : 0.055, dur = o.dur || 0.45, to = o.to != null ? o.to : 0.2, from = o.from != null ? o.from : 1;
    let end = t;
    heads.forEach(h => {
      const i = +h.getAttribute('data-i') || 0;
      tl.fromTo(h, { opacity: from }, { opacity: to, duration: dur, ease: 'power1.inOut', immediateRender: false }, t + i * step);
      end = Math.max(end, t + i * step + dur);
    });
    return end;
  }
  const scaleOf = r => FW / r.w;

  window.SketchKit = {
    version: '1.0.0',
    world, paper,
    label, figure, groupFigures, van, gate, dottedPath, valveTag, activityMarker, activityField, containment,
    safeguardItems, conditionConnection, envelopeRedraw, incidentBox,
    detailCallout, translationChain, handArrow, evidence, evidenceBoard, questionMark, investigationLine, gapTimeline, typeStack,
    sprinklerHeadsFade, followPin, scaleOf,
    iso, planFromWorld, PLACES, EVIDENCE, FIELD_LABELS,
    util: { rng, hashStr, smoothCmds, lineCmds, flatten, pointAt, plLen, hand, letters, sans, hatch, pxAt, monoWidth, sansWidth },
    events: window.__filmEvents,
  };
})();
