/*
 * UIKit: the Priora interface at video scale, for Acts II and III of the vision film.
 *
 * The demo's own components (assets/css/product.css, scoped under .pui and scaled
 * with --pui-scale) composed for 1080p, plus the film-only pieces (capture strip,
 * clause labels, statements, programme layer, chain, end card) in assets/css/film-ui.css.
 * Signal is cobalt (#1F47D6). Full reference: docs/ui-kit.md.
 *
 * Rules this file keeps (and every caller must keep too):
 *   - Seek-safe. Visual state is a pure function of timeline time. Helpers only add
 *     fromTo tweens with explicit from-states and immediateRender:false to the caller's
 *     timeline; they never use onUpdate/onStart/onComplete (HyperFrames seeks with
 *     callbacks suppressed). The initial DOM state a builder creates IS the state at
 *     time 0. Stateful helpers (node states, swaps, counters, clock, choices) track
 *     their current value at build time, so call them in time order per component.
 *   - Deterministic. No Math.random, no Date, no performance.now. Seeds come from
 *     string hashes (mulberry32, as SiteKit).
 *   - Every element gets an id that starts with opts.prefix (unique per composition).
 *   - Sound events go to window.__filmEvents as {scene, type, t, dur, meta}; t is the
 *     position on the timeline passed to the helper plus opts.eventOffset.
 *   - Elements, never global selectors (scene scripts run in a scoped document).
 *
 * Requires gsap 3 (+ DrawSVGPlugin; MotionPathPlugin optional), window.SITE_MODEL and
 * window.SITE_GLYPHS (assets/js/site-data.js), SiteKit (assets/js/site-kit.js) for the
 * site-bound helpers, product.css and film-ui.css.
 */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080, FPS = 30;
  const C = {
    paper: '#F5F3EE', paper2: '#EFECE5', paper3: '#EAE6DD', paperHi: '#FBFAF7', card: '#FBFAF7',
    ink: '#111111', ink2: 'rgba(17,17,17,.68)', ink3: 'rgba(17,17,17,.47)', ink4: 'rgba(17,17,17,.28)',
    hair: 'rgba(17,17,17,.13)', graphite: '#3B3A36', grey1: '#5E5D59', grey2: '#6A6863', grey3: '#9C9994',
    signal: '#1F47D6', signalInk: '#1838A8', signalSoft: '#DCE2F5',
  };

  window.__filmEvents = window.__filmEvents || [];
  if (window.gsap) {
    const plugs = [window.DrawSVGPlugin, window.MotionPathPlugin, window.CustomEase].filter(Boolean);
    if (plugs.length) window.gsap.registerPlugin(...plugs);
  }
  const hasDraw = () => !!(window.gsap && window.gsap.plugins && window.gsap.plugins.drawSVG);
  const hasMotion = () => !!(window.gsap && window.gsap.plugins && window.gsap.plugins.motionPath);

  // ------------------------------------------------------------------ core
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rng = seed => mulberry32(typeof seed === 'number' ? seed : hashStr(String(seed)));
  const f3 = v => (Math.round(v * 1000) / 1000).toString();
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerp2 = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
  const EASE = {
    none: x => x,
    inOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outCubic: x => 1 - Math.pow(1 - x, 3),
    outExpo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
    inOutQuad: x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
    smooth: x => x * x * (3 - 2 * x),
  };
  const easeFn = e => (typeof e === 'function' ? e : (EASE[e] || (window.gsap ? window.gsap.parseEase(e) : EASE.inOutCubic)));

  const ids = {};
  function nextId(prefix, comp) { const k = prefix + '|' + comp; ids[k] = (ids[k] || 0) + 1; return prefix + '-' + comp + (ids[k] > 1 ? ids[k] : ''); }
  /** give every element under root (root included) an id with the component prefix */
  function idAll(root, base) {
    let n = 0;
    const walk = e => { if (e.nodeType !== 1) return; if (!e.id) e.id = base + '-e' + (n++); for (const c of e.children) walk(c); };
    walk(root);
    return root;
  }
  /** merge options over defaults, ignoring undefined values (so callers can pass through optional fields) */
  function opt(def, o) { const r = Object.assign({}, def); if (o) for (const k in o) if (o[k] !== undefined) r[k] = o[k]; return r; }
  function ctx(opts, comp) {
    if (!opts || !opts.prefix) throw new Error('UIKit.' + comp + ': opts.prefix is required');
    const base = nextId(opts.prefix, comp);
    return {
      prefix: opts.prefix, base, scene: opts.scene || opts.prefix, off: +opts.eventOffset || 0,
      id: name => base + (name ? '-' + name : ''),
      ev(type, t, dur, meta) { return pushEvent(this.scene, type, t + this.off, dur, meta); },
    };
  }
  /**
   * Kit event type -> the shared sound vocabulary kind (docs/sound-events.md), copied into
   * meta.kind so a scene can write compositions/<scene>.events.json straight from the log.
   * Types with no entry (null) are timing marks the engine may ignore or map itself.
   */
  const KIND = {
    'header-assemble': 'header-in', 'stretch': 'node-stretch', 'snap': 'node-cross', 'return-inside': 'node-return',
    'zone-offline': 'valve-clunk', 'verify': 'verify-tick', 'row-unavailable': 'row-unavailable',
    'voice-in': 'capture-start', 'field': 'word-token', 'connect': 'connect-line', 'append': 'record-append',
    'sheet-enter': 'sheet-in', 'choice': 'choice-accent', 'send': 'packet-send', 'response': 'carrier-response',
    'layer': 'layer-slice', 'node-pass': 'node-pass', 'decision-flip': 'decision-accent', 'latch': 'latch',
    'confirm-1': 'chain-confirm-1', 'confirm-2': 'chain-confirm-2', 'confirm-3': 'chain-confirm-3', 'confirm-4': 'chain-confirm-4', 'confirm-5': 'chain-confirm-5',
  };
  function pushEvent(scene, type, t, dur, meta) {
    meta = meta || {};
    if (meta.kind === undefined) meta.kind = KIND[type] || null;
    const e = { scene, type, t: +(+t).toFixed(3), dur: +(+(dur || 0)).toFixed(3), meta };
    window.__filmEvents.push(e);
    return e;
  }
  function h(tag, cls, parent, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function sv(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  /**
   * Transform priming. An HTML element GSAP has never transformed has transform: none; once any
   * transform tween has rendered it (even reverted to its start) it keeps an identity
   * translate(0, 0). The two render differently (a layer boundary moves text and hairlines by a
   * sub-pixel), so a frame would depend on seek history. Every element the kit transforms is given
   * its identity transform at build time, before any render, so both paths paint the same.
   */
  const TRANSFORM_KEYS = ['x', 'y', 'xPercent', 'yPercent', 'scale', 'scaleX', 'scaleY', 'rotation', 'rotate', 'skewX', 'skewY'];
  const primed = new WeakSet();
  function prime(target) {
    if (!window.gsap || !target) return;
    const list = Array.isArray(target) ? target : [target];
    for (const el of list) {
      if (!el || primed.has(el) || (el.ownerSVGElement)) continue;   // SVG children use attribute transforms
      primed.add(el);
      window.gsap.set(el, { x: '+=0' });
    }
  }
  /** seek-safe fromTo: explicit from-state, never rendered at build time */
  function ft(tl, target, from, to, t) {
    if (TRANSFORM_KEYS.some(k => k in from || k in to)) prime(target);
    return tl.fromTo(target, from, Object.assign({ immediateRender: false }, to), t);
  }
  /** SVG scale about a fixed point as a transform attribute string (never GSAP's SVG transform cache, whose smoothOrigin depends on history) */
  function sc(sx, sy, ox, oy) { return `translate(${f3(ox)} ${f3(oy)}) scale(${f3(sx)} ${f3(sy)}) translate(${f3(-ox)} ${f3(-oy)})`; }
  /** instant, seek-safe switch (a 1 ms fromTo) */
  function cut(tl, target, from, to, t) { return ft(tl, target, from, Object.assign({ duration: 0.001, ease: 'none' }, to), t); }
  function place(el, o) {
    if (!o) return;
    const st = el.style;
    if (o.left != null || o.top != null || o.right != null || o.bottom != null) st.position = 'absolute';
    for (const k of ['left', 'top', 'right', 'bottom', 'width', 'height']) if (o[k] != null) st[k] = typeof o[k] === 'number' ? o[k] + 'px' : o[k];
    if (o.style) for (const k in o.style) st.setProperty(k, o.style[k]);
  }
  // component roots are primed too: scenes move them (card down, record out) with their own tweens
  function mountTo(el, opts) { place(el, opts); if (opts && opts.parent) opts.parent.appendChild(el); prime(el); return el; }
  function drawFrom(tl, el, t, dur, ease, from, to) {
    if (hasDraw()) return ft(tl, el, { drawSVG: from || '0%' }, { drawSVG: to || '100%', duration: dur, ease: ease || 'power2.inOut' }, t);
    const L = el.getTotalLength ? el.getTotalLength() : 1000;
    el.style.strokeDasharray = L + ' ' + L;
    return ft(tl, el, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: dur, ease: ease || 'power2.inOut' }, t);
  }

  // ------------------------------------------------------------------ glyphs (inlined, no shared ids)
  let GLY = null;
  function glyphDefs() {
    if (GLY) return GLY;
    GLY = {};
    const src = window.SITE_GLYPHS || '';
    if (!src) return GLY;
    const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
    doc.querySelectorAll('symbol').forEach(s => { GLY[s.getAttribute('id')] = s; });
    return GLY;
  }
  /** an inline <svg> copy of a glyphs.svg symbol (g-inside, g-outside, g-mark ...) */
  function glyph(name, cls, parent, color) {
    const sym = glyphDefs()[name];
    const el = sv('svg', { class: cls == null ? 'g' : cls, viewBox: sym ? sym.getAttribute('viewBox') : '-10 -10 20 20', 'aria-hidden': 'true' }, parent);
    if (sym) for (const c of Array.from(sym.childNodes)) if (c.nodeType === 1) el.appendChild(document.importNode(c, true));
    if (color) el.style.color = color;
    return el;
  }

  // ------------------------------------------------------------------ Swap: stacked variants, crossfaded
  /**
   * Swap(parent, variants, initial, opts): an inline-grid holding every variant in the
   * same cell, so its size is the largest variant's and nothing reflows.
   * variants: { key: text | (span) => void }. swap.to(tl, t, key, dur) crossfades.
   */
  function Swap(parent, variants, initial, o) {
    o = o || {};
    const root = h(o.tag || 'span', 'fui-swap' + (o.cls ? ' ' + o.cls : ''), parent);
    const nodes = {};
    for (const k in variants) {
      const n = h('span', 'fui-sw fui-sw-' + k.replace(/[^a-z0-9-]/gi, ''), root);
      const v = variants[k];
      if (typeof v === 'function') v(n); else n.textContent = v;
      n.style.opacity = k === initial ? 1 : 0;
      nodes[k] = n;
    }
    return {
      root, nodes, cur: initial, dy: o.dy == null ? 6 : o.dy,
      to(tl, t, key, dur) {
        if (key === this.cur || !nodes[key]) return t;
        dur = dur == null ? 0.3 : dur;
        const a = nodes[this.cur], b = nodes[key];
        if (dur <= 0.002) {
          if (a) cut(tl, a, { opacity: 1 }, { opacity: 0 }, t);
          cut(tl, b, { opacity: 0 }, { opacity: 1 }, t);
        } else {
          if (a) ft(tl, a, { opacity: 1, y: 0 }, { opacity: 0, y: -this.dy, duration: dur * 0.4, ease: 'power2.in' }, t);
          ft(tl, b, { opacity: 0, y: this.dy }, { opacity: 1, y: 0, duration: dur, ease: 'power3.out' }, t + dur * 0.36);
        }
        this.cur = key;
        return t + dur * 1.3;
      },
    };
  }

  // ------------------------------------------------------------------ Odometer: per-digit strips tweened by y
  /**
   * Digits are vertical strips "0 1 2 ... c-1 0" in a window one line tall. A value is
   * mapped to a continuous strip position per digit (mechanical carry), sampled once per
   * frame; each change becomes a fromTo on the strip's y, split at cycle boundaries so the
   * strip never runs out. Pure function of time, seek-safe in any order.
   *   units: [[unitSize, cycle], ...] most significant first
   *   seps:  { index: ':' } separators inserted before digit index
   */
  function Odometer(parent, o) {
    const root = h('span', 'fui-odo' + (o.cls ? ' ' + o.cls : ''), parent);
    const lh = o.lh;
    root.style.setProperty('--lh', lh + 'px');
    const digits = [];
    o.units.forEach((u, i) => {
      if (o.seps && o.seps[i]) h('span', 'fui-odo-sep', root, o.seps[i]);
      const win = h('span', 'fui-odo-w', root);
      const strip = h('span', 'fui-odo-s', win);
      let txt = ''; for (let k = 0; k <= u[1]; k++) txt += (k % u[1]) + (k < u[1] ? '\n' : '');
      strip.textContent = txt;
      digits.push({ win, strip, U: u[0], c: u[1], u: 0, y: 0, vis: 1 });
    });
    const od = {
      root, digits, lh, v: o.value || 0, lastEnd: -1e9, blank: !!o.blankLeading,
      pos(v) {
        return digits.map(d => {
          if (d.U === 1) return v;
          const r = ((v % d.U) + d.U) % d.U;
          return Math.floor(v / d.U) + clamp(r - (d.U - 1), 0, 1);
        });
      },
      visible(v) {
        const n = Math.round(v);
        return digits.map((d, i) => (!this.blank || i === digits.length - 1 || n >= d.U) ? 1 : 0);
      },
      _loc(u, c) { return u - c * Math.floor(u / c); },
      _seg(tl, d, uA, uB, ta, tb) {
        const c = d.c, dir = Math.sign(uB - uA);
        if (!dir) return;
        const pts = [uA];
        if (dir > 0) { for (let k = Math.floor(uA / c) + 1; k * c < uB - 1e-9; k++) pts.push(k * c); }
        else { for (let k = Math.ceil(uA / c) - 1; k * c > uB + 1e-9; k--) pts.push(k * c); }
        pts.push(uB);
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[i], p1 = pts[i + 1];
          const band = dir > 0 ? Math.floor(p0 / c + 1e-9) : Math.ceil(p0 / c - 1e-9) - 1;
          const l0 = p0 - band * c, l1 = p1 - band * c;
          const t0 = ta + (tb - ta) * (p0 - uA) / (uB - uA), t1 = ta + (tb - ta) * (p1 - uA) / (uB - uA);
          ft(tl, d.strip, { y: -l0 * lh }, { y: -l1 * lh, duration: Math.max(0.001, t1 - t0), ease: 'none' }, t0);
          d.y = -l1 * lh;
        }
        d.u = uB;
      },
      _vis(tl, d, on, t, dur) {
        if (d.vis === on) return;
        ft(tl, d.win, { opacity: d.vis, width: d.vis ? '0.6em' : '0em' }, { opacity: on, width: on ? '0.6em' : '0em', duration: dur, ease: 'power2.out' }, t);
        d.vis = on;
      },
      /** jump to a value at t (no roll) */
      set(tl, t, v) {
        const us = this.pos(v), vs = this.visible(v);
        digits.forEach((d, i) => {
          const y1 = -this._loc(us[i], d.c) * lh;
          if (Math.abs(y1 - d.y) > 1e-6) cut(tl, d.strip, { y: d.y }, { y: y1 }, t);
          d.y = y1; d.u = us[i];
          this._vis(tl, d, vs[i], t, 0.001);
        });
        this.v = v; this.lastEnd = Math.max(this.lastEnd, t);
        return t;
      },
      /** roll from the current value to v over dur (mechanical carry, one sample per frame) */
      roll(tl, t, v, dur, ease) {
        t = Math.max(t, this.lastEnd);
        const v0 = this.v, e = easeFn(ease || 'inOutCubic');
        return this.track(tl, t, t + Math.max(dur, 1 / FPS), x => v0 + (v - v0) * e(x), true);
      },
      /** follow an arbitrary value curve fn(u) over [t0, t1] (u = 0..1, or absolute time if abs) */
      track(tl, t0, t1, fn, normalised) {
        const N = Math.max(1, Math.round((t1 - t0) * FPS));
        for (let k = 1; k <= N; k++) {
          const tk0 = t0 + (k - 1) * (t1 - t0) / N, tk1 = t0 + k * (t1 - t0) / N;
          const v = normalised ? fn(k / N) : fn(tk1);
          const us = this.pos(v), vs = this.visible(v);
          digits.forEach((d, i) => {
            if (Math.abs(us[i] - d.u) > 1e-9) this._seg(tl, d, d.u, us[i], tk0, tk1);
            this._vis(tl, d, vs[i], tk0, Math.max(0.08, tk1 - tk0));
          });
          this.v = v;
        }
        this.lastEnd = Math.max(this.lastEnd, t1);
        return t1;
      },
    };
    // initial state
    const us = od.pos(od.v), vs = od.visible(od.v);
    const v0 = od.v;
    /** back to the build-time value and bookkeeping (a rebuilt schedule starts from here) */
    od.reset = function () { const u0 = this.pos(v0), s0 = this.visible(v0); digits.forEach((d, i) => { d.u = u0[i]; d.y = -this._loc(u0[i], d.c) * lh; d.vis = s0[i]; }); this.v = v0; this.lastEnd = -1e9; return this; };
    digits.forEach((d, i) => {
      d.u = us[i]; d.y = -od._loc(us[i], d.c) * lh; d.vis = vs[i];
      if (window.gsap) window.gsap.set(d.strip, { y: d.y }); else d.strip.style.transform = `translateY(${d.y}px)`;
      if (!vs[i]) { d.win.style.width = '0em'; d.win.style.opacity = 0; }
    });
    return od;
  }
  const CLOCK_LH = 49;   // the chrome clock's digits: IBM Plex Mono 38 px at line-height normal (1.3 em, measured)
  const hhmm = s => { const [a, b, c] = String(s).split(':').map(Number); return c == null ? a * 60 + b : a * 3600 + b * 60 + c; };
  function clockOdo(parent, time, lh, seconds) {
    const units = seconds ? [[36000, 10], [3600, 10], [600, 6], [60, 10], [10, 6], [1, 10]] : [[600, 10], [60, 10], [10, 6], [1, 10]];
    const seps = seconds ? { 2: ':', 4: ':' } : { 2: ':' };
    return Odometer(parent, { units, seps, lh, value: hhmm(time), cls: 'fui-clock-odo' });
  }
  function counterOdo(parent, value, lh, digits) {
    const units = []; for (let i = digits - 1; i >= 0; i--) units.push([Math.pow(10, i), 10]);
    return Odometer(parent, { units, lh, value, blankLeading: true, cls: 'fui-count-odo' });
  }

  // ------------------------------------------------------------------ data (the demo's texts, adapted per demo-map section 5)
  const DATA = {
    site: { name: 'Nordhavn Bioprocessing', sub: 'Copenhagen · fictional site' },
    programme: 'Property + BI programme',
    statuses: {
      inside: ['g-inside', 'All activity inside'],
      checking: ['g-checking', 'Recalculating 1 activity'],
      outside: ['g-outside', '1 activity outside conditions', true],
      retained: ['g-retained', '1 increment retained'],
      cover: ['g-cover', '1 slice on temporary cover'],
      changed: ['g-changed', '1 decision recorded · back inside'],
      today: ['g-inside', '3 explicit decisions today'],   // the system view's end state (DECISIONS 3)
    },
    card: {
      ref: 'Activity · ACT-1418-R03', title: 'Hot work', sub: 'ROOF 03 · 14:18–18:00', meta: 'Contractor · certified operator',
      rows: ['Certified operator', 'Extinguishing equipment', 'Fire watch', 'Combustibles cleared', 'Automatic sprinkler protection'],
    },
    capture: {
      label: 'Voice · Roof 03 · 14:18', text: "I'm welding on Roof 03 until six.",
      fields: [
        { key: 'activity', k: 'Activity', v: 'Hot work (welding)', match: [1] },
        { key: 'location', k: 'Location', v: 'Roof 03', match: [3, 4] },
        { key: 'window', k: 'Window', v: '14:18–18:00', mono: true, match: [5, 6] },
        { key: 'by', k: 'By', v: 'Contractor, certified operator', match: [] },
      ],
    },
    clauses: {
      '4.2': 'Hot work · Permit · Certified operator · Fire watch',
      '4.3': 'Sprinkler protection in service',
    },
    records: {
      open: { t: '08:55', kind: 'event', x: 'Day opened · site baseline verified', s: 'Annual programme conditions loaded · Property + BI', i: 'REC-0401-46C5 · fd43 16b4' },
      hotStart: { t: '14:18', kind: 'event', x: 'Hot work started · Roof 03 · inside envelope', s: 'Contractor · certified operator · planned 14:18–18:00', i: 'REC-0403-AA9A · e0b9 4d12' },
      verified: { t: '14:18', kind: 'event', x: '5 of 5 conditions verified', i: 'REC-0404-E3F8 · 6721 7a99' },
      szOffline: { t: '14:42', kind: 'dev', x: 'Sprinkler Zone 3 taken offline', s: 'Roof 03 and Production Hall 2 · automatic protection unavailable', i: 'REC-0405-0AF1 · 0d9b 70f9' },
      outside: { t: '14:42', kind: 'dev', sig: true, x: 'Risk state moved outside annual programme conditions', s: 'Hot work · Roof 03 · incremental exposure temporary, 3h 18m', i: 'REC-0406-EFBE · a74b ec1f' },
      requested: { t: '14:43', kind: 'event', x: 'Decision requested · Site Risk Manager', i: 'REC-0407-A4EE · fe32 ac67' },
      restored: { t: '14:47', kind: 'event', x: 'Sprinkler Zone 3 restored', i: 'REC-0408-83D9 · efd1 8ae7' },
      changed: { t: '14:48', kind: 'decision', x: 'Risk state returned inside accepted conditions · Incremental DKK 0', s: 'Decision: change activity · Restore sprinkler protection · Anna Møller', i: 'REC-0409-CE15 · 9c21 55fb' },
      retained: { t: '14:46', kind: 'decision', x: 'Incremental risk retained by Nordhavn Bioprocessing', s: 'Decision: Anna Møller · Site Risk Manager · 3h 18m · until 18:00 · no additional insurance purchased', i: 'REC-0408-48F6 · aaf8 08c5' },
      requestedCapacity: { t: '14:47', kind: 'event', x: 'Capacity requested · risk packet sent to 4 carriers', s: 'PKT-0412 · 9 fields of observed state', i: 'REC-0408-D0B4 · f230 b4aa' },
      responses: { t: '14:47', kind: 'event', x: '4 carrier responses · 3 quotes', s: 'Northstar Commercial declined · outside appetite', i: 'REC-0409-4115 · 23a5 546e' },
      craneLift: { t: '15:12', kind: 'decision', x: 'Crane lift rescheduled outside wind limit', i: 'REC-0410-52FB · 838d ef09' },
      gasBypass: { t: '15:41', kind: 'decision', x: 'Gas detector bypass retained · Laboratory', s: 'Decision: Mikkel Sørensen · Laboratory Manager', i: 'REC-0412-3F2B · 074c 6cbd' },
    },
    sheet: {
      eyebrow: '14:43 · Decision requested · Site Risk Manager', title: 'Risk state changed',
      text: 'Roof hot work is continuing while sprinkler protection in the affected zone is unavailable.',
      facts: [['Existing programme', 'Outside agreed conditions'], ['Incremental exposure', 'TEMPORARY', true], ['Expected duration', '3h 18m', true, '14:42–18:00']],
      obs: [['14:18 · observed', 'g-inside', 'Inside · 5 of 5 verified'], ['14:42 · changed', 'g-system', 'Sprinkler Zone 3 offline'], ['14:43 · now', 'g-outside', 'Outside · your decision', true]],
      ask: 'WHAT DO YOU WANT TO DO?',
      choices: [
        { key: 'change', g: 'g-changed', b: 'Change activity', d: 'Modify the work or restore a safeguard until it returns inside the envelope.', o: 'Incremental DKK 0' },
        { key: 'retain', g: 'g-retained', b: 'Retain risk', d: 'Knowingly carry the incremental exposure. Priora records who, what and for how long.', o: 'Owned and recorded' },
        { key: 'transfer', g: 'g-cover', b: 'Transfer risk', d: 'Ask the market whether a carrier will cover this temporary slice.', o: 'Carrier priced' },
      ],
      foot: 'Priora supplies the observed state. The decision stays with the risk owner.',
    },
    packet: [['Activity', 'Hot work'], ['Location', 'Roof 03'], ['Duration', '3h 18m'], ['Current protection', 'Sprinkler Zone 3 offline', true], ['Operator', 'Certified'], ['Fire watch', 'Active'], ['Extinguishing equipment', 'Confirmed'], ['Asset exposure', 'Production Hall 2'], ['Existing programme', 'Outside accepted conditions', true]],
    carriers: [
      { key: 'northstar', name: 'Northstar Commercial', kind: 'Existing carrier', declined: true, dec: 'Outside appetite', decS: 'No quote' },
      { key: 'atlas', name: 'Atlas Specialty', kind: 'Temporary activity cover', stat: 'Quote · 14:47', price: '980', ded: 'DKK 100,000', cap: 'DKK 25m' },
      { key: 'boreal', name: 'Boreal Risk', kind: 'Temporary activity cover', stat: 'Quote · 14:47', price: '1,240', ded: 'DKK 50,000', cap: 'DKK 25m' },
      { key: 'helvetic', name: 'Helvetic Industrial', kind: 'Temporary activity cover', stat: 'Quote · 14:47', price: '1,680', ded: 'DKK 25,000', cap: 'DKK 25m' },
    ],
    carrierNote: 'Carriers set appetite and price. The risk owner chooses.',
    // arrival order in the film: the demo's order happens to be ascending price, which reads as a
    // ranking, so the film's (fictional) answers arrive in an order that is not sorted by anything
    carrierOrder: ['northstar', 'boreal', 'atlas', 'helvetic'],
    chain: [['Record', 'what was true'], ['Trust', 'shared observed state'], ['Decision', 'owned and explicit'], ['Price', "the carrier's own terms"], ['Capacity', 'a layer alongside the programme']],
    end: {
      descriptor: 'Infrastructure for activity-level physical risk',
      qualifier: 'Conceptual future-state demonstration. Risk transfer, carrier quotes, prices, people, carriers, and the Nordhavn site are illustrative. Priora today focuses on prevention and proof.',
    },
    // assets/brand/priora-wordmark.svg (IBM Plex Sans SemiBold outlines), embedded so no fetch is needed
    wordmark: { viewBox: '0 0 2617 758', transform: 'translate(-82,746)', d: 'M82.0 0V-698H396.0Q444.0 -698 482.5 -682.5Q521.0 -667 548.0 -638.5Q575.0 -610 589.0 -570.0Q603.0 -530 603.0 -482Q603.0 -433 589.0 -393.5Q575.0 -354 548.0 -325.5Q521.0 -297 482.5 -281.5Q444.0 -266 396.0 -266H214.0V0ZM214.0 -380H384.0Q422.0 -380 444.0 -400.5Q466.0 -421 466.0 -459V-505Q466.0 -543 444.0 -563.0Q422.0 -583 384.0 -583H214.0Z M690.0 0V-522H818.0V-414H823.0Q828.0 -435 838.5 -454.5Q849.0 -474 866.0 -489.0Q883.0 -504 906.5 -513.0Q930.0 -522 961.0 -522H989.0V-401H949.0Q884.0 -401 851.0 -382.0Q818.0 -363 818.0 -320V0Z M1132.0 -598Q1092.0 -598 1074.5 -616.0Q1057.0 -634 1057.0 -662V-682Q1057.0 -710 1074.5 -728.0Q1092.0 -746 1132.0 -746Q1171.0 -746 1189.0 -728.0Q1207.0 -710 1207.0 -682V-662Q1207.0 -634 1189.0 -616.0Q1171.0 -598 1132.0 -598ZM1068.0 -522H1196.0V0H1068.0Z M1536.0 12Q1480.0 12 1435.5 -7.0Q1391.0 -26 1359.5 -62.0Q1328.0 -98 1311.0 -148.5Q1294.0 -199 1294.0 -262Q1294.0 -325 1311.0 -375.0Q1328.0 -425 1359.5 -460.5Q1391.0 -496 1435.5 -515.0Q1480.0 -534 1536.0 -534Q1592.0 -534 1637.0 -515.0Q1682.0 -496 1713.5 -460.5Q1745.0 -425 1762.0 -375.0Q1779.0 -325 1779.0 -262Q1779.0 -199 1762.0 -148.5Q1745.0 -98 1713.5 -62.0Q1682.0 -26 1637.0 -7.0Q1592.0 12 1536.0 12ZM1536.0 -91Q1587.0 -91 1616.0 -122.0Q1645.0 -153 1645.0 -213V-310Q1645.0 -369 1616.0 -400.0Q1587.0 -431 1536.0 -431Q1486.0 -431 1457.0 -400.0Q1428.0 -369 1428.0 -310V-213Q1428.0 -153 1457.0 -122.0Q1486.0 -91 1536.0 -91Z M1877.0 0V-522H2005.0V-414H2010.0Q2015.0 -435 2025.5 -454.5Q2036.0 -474 2053.0 -489.0Q2070.0 -504 2093.5 -513.0Q2117.0 -522 2148.0 -522H2176.0V-401H2136.0Q2071.0 -401 2038.0 -382.0Q2005.0 -363 2005.0 -320V0Z M2628.0 0Q2586.0 0 2561.5 -24.5Q2537.0 -49 2531.0 -90H2525.0Q2512.0 -39 2472.0 -13.5Q2432.0 12 2373.0 12Q2293.0 12 2250.0 -30.0Q2207.0 -72 2207.0 -142Q2207.0 -223 2265.0 -262.5Q2323.0 -302 2430.0 -302H2519.0V-340Q2519.0 -384 2496.0 -408.0Q2473.0 -432 2422.0 -432Q2377.0 -432 2349.5 -412.5Q2322.0 -393 2303.0 -366L2227.0 -434Q2256.0 -479 2304.0 -506.5Q2352.0 -534 2431.0 -534Q2537.0 -534 2592.0 -486.0Q2647.0 -438 2647.0 -348V-102H2699.0V0ZM2416.0 -81Q2459.0 -81 2489.0 -100.0Q2519.0 -119 2519.0 -156V-225H2437.0Q2337.0 -225 2337.0 -161V-144Q2337.0 -112 2357.5 -96.5Q2378.0 -81 2416.0 -81Z' },
  };

  // ================================================================== 1. header
  function header(opts) {
    // inset: the band keeps its full height below a top margin (default 36 px, the registration-mark
    // line), so its reading sits near the safe area and the chrome clock's line. clockStyle 'chrome'
    // sets the clock exactly where and how the chrome scene sets its own (right 96, label top 60,
    // digits 38 px top 86 at inset 36), so the two can hand over invisibly; 'inline' is the demo's.
    opts = opt({ scale: 1.6, chip: 'End-state concept', chipVisible: true, status: 'inside', time: '14:18', seconds: true, clock: true, inset: 36, clockStyle: 'chrome' }, opts);
    const c = ctx(opts, 'header');
    const root = h('header', 'pui pui-top fui fui-header');
    root.id = c.id();
    root.style.setProperty('--pui-scale', opts.scale);
    const bandH = +(68 * opts.scale).toFixed(1);
    root.style.boxSizing = 'border-box';
    root.style.height = (bandH + opts.inset) + 'px';
    root.style.paddingTop = opts.inset + 'px';
    const brand = h('div', 'brand', root);
    glyph('g-mark', 'mk', brand);
    h('span', 'wm', brand, 'Priora');
    const chip = opts.chip ? h('span', 'tag fui-chip', brand, opts.chip) : null;
    if (chip && !opts.chipVisible) chip.style.opacity = 0;
    h('div', 'hsep', root);
    const site = h('div', 'siteid', root);
    h('div', 'nm', site, DATA.site.name);
    h('div', 'sb', site, DATA.site.sub);
    const pill = h('div', 'pui-proghead', root);
    const pf = h('div', 'pf pstat', pill);
    h('em', '', pf, DATA.programme);
    const pb = h('b', 'pui-pstat', pf);
    const statuses = Object.assign({}, DATA.statuses, opts.statuses || {});
    const vars = {};
    for (const k in statuses) {
      const [g, txt, sig] = statuses[k];
      vars[k] = n => { n.classList.add('fui-pstat-v'); glyph(g, 'g', n, sig ? 'var(--pui-signal)' : null); h('span', '', n, txt); };
    }
    const status = Swap(pb, vars, opts.status, { dy: 5 });
    h('div', 'spacer', root);
    // the clock can be left to the chrome scene (opts.clock false): the right of the strip stays empty
    let clockEl = null, clock = null;
    if (opts.clock) {
      const chromeClock = opts.clockStyle === 'chrome';
      clockEl = h('div', 'clock' + (chromeClock ? ' fui-clock-chrome' : ''), root);
      if (chromeClock) clockEl.style.top = (opts.inset + 24) + 'px';
      h('span', 'lab', clockEl, 'Site time');
      const cb = h('b', 'fui-clock', clockEl);
      const fs = chromeClock ? 38 : 22 * opts.scale;
      clock = clockOdo(cb, opts.time, chromeClock ? CLOCK_LH : Math.round(fs * 1.12), opts.seconds);
    }
    const rule = h('i', 'fui-hrule', root);
    idAll(root, c.base);
    mountTo(root, opts);
    const items = [brand, site, pill, clockEl].filter(Boolean);
    const height = bandH + opts.inset;
    const noClock = () => { throw new Error('UIKit.header: built with clock: false'); };
    return {
      el: root, clock, status, chip, items, ctx: c, height,
      setClock(tl, t, time) { if (!clock) noClock(); return clock.set(tl, t, hhmm(time)); },
      /** rollClock(tl, t, to, dur, ease, from): odometer roll from the current value (or from 'from', set at t) to 'to' */
      rollClock(tl, t, time, dur, ease, from) { if (!clock) noClock(); if (from != null) clock.set(tl, t, hhmm(from)); c.ev('clock-roll', t, dur, { from: from || null, to: time }); return clock.roll(tl, t, hhmm(time), dur, ease); },
      setStatus(tl, t, key, dur) {
        const end = status.to(tl, t, key, dur);
        c.ev('status', t, dur || 0.3, { status: key });
        return end;
      },
      showChip(tl, t, on, dur) { if (!chip) return t; ft(tl, chip, { opacity: on ? 0 : 1 }, { opacity: on ? 1 : 0, duration: dur || 0.4, ease: 'power2.out' }, t); return t + (dur || 0.4); },
      /** the header assembles: hairline draws across, items settle left to right */
      enter(tl, t, dur) {
        dur = dur || 1.1;
        ft(tl, rule, { scaleX: 0 }, { scaleX: 1, duration: dur * 0.8, ease: 'power3.inOut' }, t);
        items.forEach((e, i) => ft(tl, e, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: dur * 0.55, ease: 'power3.out' }, t + dur * 0.12 + i * dur * 0.09));
        c.ev('header-assemble', t, dur);
        return t + dur;
      },
      /** build-time: hide everything (the state before enter) */
      hideForEnter() { gsap.set(rule, { scaleX: 0 }); items.forEach(e => gsap.set(e, { opacity: 0 })); return this; },
    };
  }

  // ================================================================== 2. node glyph (site SVG, world coordinates, screen-constant size)
  const NODE_STATES = {
    //          ring chk out  own  cap  dot sq  dotFill      dotStroke     dotSW
    checking: [0, 1, 0, 0, 0, 1, 0, C.ink, C.ink, 0],
    inside: [1, 0, 0, 0, 0, 1, 0, C.ink, C.ink, 0],
    outside: [0, 0, 1, 0, 0, 1, 0, C.paper, C.signal, 1.3],
    changed: [1, 0, 0, 0, 0, 0, 1, C.ink, C.ink, 0],
    retained: [0, 0, 0, 1, 0, 1, 0, C.ink, C.ink, 0],
    cover: [0, 0, 0, 0, 1, 1, 0, C.ink, C.ink, 0],
  };
  const NODE_PARTS = ['ring', 'chk', 'out', 'own', 'cap', 'dot', 'sq'];
  function nodeGlyph(svgParent, xy, state, opts) {
    opts = opt({ k: 1, reticle: false, visible: true, events: true }, opts);
    state = state || 'inside';
    const c = ctx(opts, 'node' + (opts.name ? '-' + opts.name : ''));
    const g = sv('g', { class: 'fui-node', transform: `translate(${f3(xy[0])} ${f3(xy[1])})` }, svgParent);
    const px = sv('g', { class: 'fui-npx' }, g);
    px.style.setProperty('--k', opts.k);
    const P = {};
    P.pulse = sv('circle', { class: 'fui-n-pulse', r: 7 }, px);
    P.own = sv('g', { class: 'fui-n-own' }, px);
    sv('circle', { class: 'ob', r: 14 }, P.own);
    sv('path', { class: 'oh', d: 'M-12.13 3.37L-3.37 12.13M-12.26 -1.57L1.57 12.26M-11.08 -5.20L5.20 11.08M-9.15 -8.07L8.07 9.15M-6.57 -10.30L10.30 6.57M-3.30 -11.85L11.85 3.30M0.92 -12.43L12.43 -0.92M8.21 -9.95L9.95 -8.21' }, P.own);
    sv('circle', { class: 'op', r: 5.4 }, P.own);
    P.cap = sv('g', { class: 'fui-n-cap' }, px);
    sv('rect', { class: 'c1', x: -12, y: -10, width: 40, height: 20, rx: 10 }, P.cap);
    sv('rect', { class: 'c2', x: -9, y: -7, width: 34, height: 14, rx: 7 }, P.cap);
    sv('circle', { class: 'ck', cx: 15.5, cy: 0, r: 3.6 }, P.cap);
    sv('path', { class: 'ck', d: 'M15.5 -2V0H17.2' }, P.cap);
    P.ring = sv('circle', { class: 'fui-n-ring', r: 6.6 }, px);
    P.chk = sv('circle', { class: 'fui-n-chk', r: 9, transform: 'rotate(0)' }, px);
    P.out = sv('g', { class: 'fui-n-out', transform: sc(1, 1, 0, 0) }, px);
    sv('circle', { r: 8.5 }, P.out);
    sv('path', { d: 'M0 -11.5V-16M0 11.5V16M-11.5 0H-16M11.5 0H16' }, P.out);
    P.dot = sv('circle', { class: 'fui-n-dot', r: 3.1 }, px);
    P.sq = sv('rect', { class: 'fui-n-sq', x: -3.4, y: -3.4, width: 6.8, height: 6.8 }, px);
    const retG = sv('g', { class: 'fui-nret' }, g);
    const ret = sv('path', { class: 'fui-nret-p', d: 'M-22 -14V-22H-14M14 -22H22V-14M22 14V22H14M-14 22H-22V14', transform: 'scale(1)' }, retG);
    retG.style.setProperty('--kr', opts.kr || Math.max(1, opts.k * 0.88));
    // initial state
    const S = NODE_STATES[state];
    NODE_PARTS.forEach((p, i) => { P[p].style.opacity = S[i]; });
    P.dot.style.fill = S[7]; P.dot.style.stroke = S[8]; P.dot.style.strokeWidth = S[9];
    P.pulse.style.opacity = 0;
    retG.style.opacity = opts.reticle ? 1 : 0;
    if (!opts.visible) g.style.opacity = 0;
    idAll(g, c.base);
    const N = {
      el: g, g, px, parts: P, reticleEl: retG, k: opts.k, cur: state, pos: [xy[0], xy[1]], rot: 0,
      vis: opts.visible ? 1 : 0, ret: opts.reticle ? 1 : 0, ctx: c,
      state(tl, t, to, dur) {
        if (to === this.cur) return t;
        dur = dur == null ? 0.3 : dur;
        const A = NODE_STATES[this.cur], B = NODE_STATES[to];
        NODE_PARTS.forEach((p, i) => {
          if (A[i] !== B[i]) {
            if (dur <= 0.002) cut(tl, P[p], { opacity: A[i] }, { opacity: B[i] }, t);
            else ft(tl, P[p], { opacity: A[i] }, { opacity: B[i], duration: dur, ease: B[i] ? 'power2.out' : 'power2.in' }, t);
          }
        });
        if (A[7] !== B[7] || A[8] !== B[8] || A[9] !== B[9]) {
          const f = { fill: A[7], stroke: A[8], strokeWidth: A[9] }, e = { fill: B[7], stroke: B[8], strokeWidth: B[9] };
          if (dur <= 0.002) cut(tl, P.dot, f, e, t); else ft(tl, P.dot, f, Object.assign(e, { duration: dur, ease: 'power2.out' }), t);
        }
        // outside and resolved states land with a small settle of the ring
        if (to === 'outside' && dur > 0.002) ft(tl, P.out, { attr: { transform: sc(1.35, 1.35, 0, 0) } }, { attr: { transform: sc(1, 1, 0, 0) }, duration: Math.max(dur, 0.45), ease: 'expo.out' }, t);
        if (opts.events && ['outside', 'changed', 'retained', 'cover'].includes(to)) c.ev('node-' + to, t, dur, { from: this.cur });
        this.cur = to;
        return t + dur;
      },
      moveTo(tl, t, p, dur, ease) {
        const a = this.pos;
        ft(tl, g, { attr: { transform: `translate(${f3(a[0])} ${f3(a[1])})` } }, { attr: { transform: `translate(${f3(p[0])} ${f3(p[1])})` }, duration: dur || 0.001, ease: ease || 'power2.inOut' }, t);
        this.pos = [p[0], p[1]];
        return t + (dur || 0);
      },
      /** the checking ring turns (2.2 s per turn, as the demo) between t0 and t1 */
      spin(tl, t0, t1) {
        const a0 = this.rot, a1 = a0 + 360 * (t1 - t0) / 2.2;
        ft(tl, P.chk, { attr: { transform: `rotate(${f3(a0)})` } }, { attr: { transform: `rotate(${f3(a1)})` }, duration: t1 - t0, ease: 'none' }, t0);
        this.rot = a1;
        return t1;
      },
      pulse(tl, t, dur) {
        dur = dur || 1.5;
        ft(tl, P.pulse, { attr: { r: 7 }, opacity: 0.8 }, { attr: { r: 24 }, opacity: 0, duration: dur, ease: 'power2.out' }, t);
        return t + dur;
      },
      show(tl, t, on, dur) {
        on = on ? 1 : 0;
        if (on === this.vis) return t;
        dur = dur == null ? 0.25 : dur;
        if (dur <= 0.002) cut(tl, g, { opacity: this.vis }, { opacity: on }, t);
        else ft(tl, g, { opacity: this.vis }, { opacity: on, duration: dur, ease: 'power2.out' }, t);
        this.vis = on;
        return t + dur;
      },
      /** fade to a quieter opacity (background activity) */
      quiet(tl, t, to, dur) {
        const from = this.vis;
        ft(tl, g, { opacity: from }, { opacity: to, duration: dur || 1, ease: 'power1.inOut' }, t);
        this.vis = to;
        return t + (dur || 1);
      },
      reticle(tl, t, on, dur) {
        on = on ? 1 : 0;
        if (on === this.ret) return t;
        dur = dur == null ? 0.45 : dur;
        if (dur <= 0.002) cut(tl, retG, { opacity: this.ret }, { opacity: on }, t);
        else {
          ft(tl, retG, { opacity: this.ret }, { opacity: on, duration: dur * 0.6, ease: 'power2.out' }, t);
          if (on) ft(tl, ret, { attr: { transform: 'scale(1.5)' } }, { attr: { transform: 'scale(1)' }, duration: dur, ease: 'expo.out' }, t);
        }
        this.ret = on;
        return t + dur;
      },
    };
    return N;
  }

  // ------------------------------------------------------------------ the demo's outside-envelope geometry (verified port, site-model.json outsideState.deformation)
  function heroDeviation(envPts, envNrm, envCenter, heroWorld, s, v, notchK) {
    if (notchK == null) notchK = 1;
    const N = envPts.length;
    const norm = q => { const l = Math.hypot(q[0], q[1]) || 1; return [q[0] / l, q[1] / l]; };
    const easeOut = p => 1 - Math.pow(1 - p, 3);
    const rayHit = (pts, A, d) => { let best = null; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; const ex = q[0] - p[0], ey = q[1] - p[1]; const den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-9) continue; const t = ((p[0] - A[0]) * ey - (p[1] - A[1]) * ex) / den; const u = ((p[0] - A[0]) * d[1] - (p[1] - A[1]) * d[0]) / den; if (t > 0 && u >= 0 && u <= 1 && (best === null || t < best)) best = t; } return best === null ? null : [A[0] + d[0] * best, A[1] + d[1] * best]; };
    const px = 1 / s;
    const offPx = clamp(34 + 6.2 * s, 58, 118);
    const A = heroWorld, dir = norm([A[0] - envCenter[0], A[1] - envCenter[1]]);
    const E = rayHit(envPts, A, dir) || A;
    const T = [E[0] + dir[0] * offPx * px, E[1] + dir[1] * offPx * px];
    const arc = Math.sin(Math.PI * v) * 16 * px, perp = [dir[1], -dir[0]], sg = perp[1] < 0 ? 1 : -1;
    const Pl = [lerp(A[0], T[0], v), lerp(A[1], T[1], v)];
    const P = [Pl[0] + perp[0] * arc * sg, Pl[1] + perp[1] * arc * sg];
    const crossV = clamp(Math.hypot(E[0] - A[0], E[1] - A[1]) / (Math.hypot(T[0] - A[0], T[1] - A[1]) || 1), 0.2, 0.8);
    const u = ((Pl[0] - E[0]) * dir[0] + (Pl[1] - E[1]) * dir[1]) / px, uT = offPx;
    const pinch = 44, rN = 11, relax = Math.max(8, (uT - pinch) * 0.9);
    let bulge = 0, notch = 0, ring = 0;
    if (v > 0.001) {
      if (u < pinch) bulge = clamp(u + rN, 0, pinch + rN);
      else { const k = clamp((u - pinch) / relax, 0, 1); bulge = (pinch + rN) * (1 - easeOut(k)); ring = easeOut(k); }
      notch = (u >= pinch ? 6 * clamp((u - pinch) / relax, 0, 1) : 0) * notchK;
    }
    const outline = [], outer = [];
    for (let i = 0; i < N; i++) {
      const p = envPts[i], nv = envNrm[i];
      let x = p[0], y = p[1];
      if (v > 0.001 && (bulge > 0.1 || notch > 0.1)) {
        const dist = Math.hypot(p[0] - E[0], p[1] - E[1]) / px;
        const sig = 26 + bulge * 0.55;
        const gb = Math.exp(-(dist * dist) / (2 * sig * sig)), gn = Math.exp(-(dist * dist) / (2 * 16 * 16));
        x += (dir[0] * bulge * gb - nv[0] * notch * gn) * px;
        y += (dir[1] * bulge * gb - nv[1] * notch * gn) * px;
      }
      outline.push([x, y]); outer.push([x + nv[0] * 4.5 * px, y + nv[1] * 4.5 * px]);
    }
    let notchTicks = '', notchOpacity = 0;
    if (notch > 0.5) {
      const pp = [dir[1], -dir[0]], o = 15 * px;
      const t1 = [E[0] + pp[0] * o, E[1] + pp[1] * o], t2 = [E[0] - pp[0] * o, E[1] - pp[1] * o];
      const a = (t, k) => (t[0] + dir[0] * k * px).toFixed(3) + ' ' + (t[1] + dir[1] * k * px).toFixed(3);
      notchTicks = 'M' + a(t1, -5) + 'L' + a(t1, 9) + 'M' + a(t2, -5) + 'L' + a(t2, 9);
      notchOpacity = clamp(notch / 6, 0, 1) * 0.6;
    }
    return { P, A, E, T, dir, crossV, uPx: u, bulgePx: bulge, notchPx: notch, ring,
      sliceRingRadiusPx: ring > 0.02 ? 8 + 20 * ring : 0, sliceRingOpacity: ring > 0.02 ? 0.9 * ring : 0,
      outline, outer, notchTicks, notchOpacity, offPx, state: v >= crossV ? 'outside' : 'checking' };
  }
  function polyD(pts) { let d = 'M' + f3(pts[0][0]) + ' ' + f3(pts[0][1]); for (let i = 1; i < pts.length; i++) d += 'L' + f3(pts[i][0]) + ' ' + f3(pts[i][1]); return d + 'Z'; }
  /** closed stadium (capsule) from p0 to p1 with radius r; same command structure at any length */
  function stadium(p0, p1, r, dirFallback) {
    let dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy);
    if (L < 1e-6) { dx = dirFallback[0]; dy = dirFallback[1]; L = 1; }
    const ux = dx / L, uy = dy / L, nx = -uy * r, ny = ux * r;
    const a = [p0[0] + nx, p0[1] + ny], b = [p1[0] + nx, p1[1] + ny], cc = [p1[0] - nx, p1[1] - ny], d = [p0[0] - nx, p0[1] - ny];
    const R = f3(r);
    return `M${f3(a[0])} ${f3(a[1])}L${f3(b[0])} ${f3(b[1])}A${R} ${R} 0 0 0 ${f3(cc[0])} ${f3(cc[1])}L${f3(d[0])} ${f3(d[1])}A${R} ${R} 0 0 0 ${f3(a[0])} ${f3(a[1])}Z`;
  }

  /**
   * siteLabels(site, k): the demo's zone labels are 10 screen px; at video scale they are
   * drawn k times larger (default 1.8, i.e. 18 px). Use a smaller k (1.2 to 1.4) in wide
   * views where the labels are context, not reading. Returns the svg. tl/t optional:
   * siteLabels(site, k, tl, t, dur) tweens the scale seek-safely from the current value.
   */
  function siteLabels(site, k, tl, t, dur) {
    const svg = site.svg || site;
    svg.classList.add('fui-labels');
    const cur = svg.__fuiLab == null ? 1.8 : svg.__fuiLab;
    if (tl) ft(tl, svg, { '--fui-lab': cur }, { '--fui-lab': k, duration: dur || 0.6, ease: 'power2.inOut' }, t);
    else svg.style.setProperty('--fui-lab', k);
    svg.__fuiLab = k;
    return svg;
  }
  /** overlay layer on a SiteKit site (or any svg): nodes, connections and labels live here */
  function overlay(siteOrSvg, prefix) {
    const svg = siteOrSvg.svg || siteOrSvg;
    if (svg.__fuiOverlay) return svg.__fuiOverlay;
    const g = sv('g', { class: 'fui-ov', id: (prefix || (siteOrSvg.prefix) || 'fui') + '-fui-ov' }, svg);
    svg.__fuiOverlay = g;
    svg.classList.add('fui-site');
    return g;
  }

  // ------------------------------------------------------------------ the crossing: stretch across the envelope, then snap outside
  /**
   * crossing(tl, t0, node, site, opts) -> handle
   * The film's primary product reveal. The hot-work node (in its checking state, at
   * outsideState.heroOriginWorld) elongates as a capsule: its dashed checking ring
   * stretches into a stadium with a hairline spine, the dot rides the head along the
   * demo's exit path (heroDeviation P(v), with its 16 px arc) to the settle point just
   * outside the envelope. The membrane flexes with the demo's own deformation, driven by
   * the head until the pinch point (44 px past the edge), and holds that tension while
   * the head travels on. When the head crosses the edge the capsule turns cobalt. After a
   * short hold it snaps (expo.out): the tail retracts to the head, the dashed tether is
   * left behind it, the membrane relaxes to the demo's notch and exit ticks, and the node
   * lands in the outside state with reticle and slice ring. The landed geometry equals
   * the demo's (heroDeviation at v = 1) exactly.
   *   opts: s (camera px per world unit the shot holds, default 8.83133, the demo's
   *         'somethingChanges'), stretch (1.5 s), hold (0.16 s), snap (0.46 s),
   *         ease (stretch easing, default 'inOutCubic' as the demo), tether, ring
   */
  function crossing(tl, t0, node, site, opts) {
    opts = opt({ s: 8.83133, stretch: 1.5, hold: 0.16, snap: 0.46, ease: 'inOutCubic', tether: true, ring: true }, opts);
    const c = ctx(Object.assign({ prefix: opts.prefix || node.ctx.prefix, scene: opts.scene || node.ctx.scene, eventOffset: opts.eventOffset }), 'crossing');
    const M = window.SITE_MODEL, E = M.envelope, OS = M.outsideState;
    const A = OS.heroOriginWorld, s = opts.s, K = node.k, px = 1 / s;
    const dev = (v, nk) => heroDeviation(E.pointsWorld, E.normalsWorld, E.centreWorld, A, s, v, nk);
    const r1 = dev(1, 1), r0 = dev(0, 1), T = r1.P, dir = r1.dir;
    const vPinch = clamp((44 - r0.uPx) / (r1.offPx - r0.uPx), 0, 1);   // head 44 px past the edge
    const ov = node.el.parentNode;
    const outlineEl = site.el('envelope-outline'), outerEl = site.el('envelope-outer'), fillEl = site.el('envelope-fill');
    const fillMatches = fillEl && outlineEl && fillEl.getAttribute('d') === outlineEl.getAttribute('d');
    const RO = 9 * K * px, RD = 3.1 * K * px, RT = 1.9 * K * px;         // ring, head dot, tail dot (world units)
    // capsule (under the node glyph) and what it leaves behind
    const trail = sv('g', { class: 'fui-trail' }, ov);
    ov.insertBefore(trail, node.el);
    const g = sv('g', { class: 'fui-caps' }, ov);
    ov.insertBefore(g, node.el);
    g.style.setProperty('--k', K);
    g.style.opacity = 0;
    const capFill = sv('path', { class: 'fui-caps-fill', d: stadium(A, A, RO, dir) }, g);
    const capRing = sv('path', { class: 'fui-caps-ring', d: stadium(A, A, RO, dir) }, g);
    const spine = sv('line', { class: 'fui-caps-spine', x1: f3(A[0]), y1: f3(A[1]), x2: f3(A[0]), y2: f3(A[1]) }, g);
    const tailDot = sv('circle', { class: 'fui-caps-tail', cx: f3(A[0]), cy: f3(A[1]), r: f3(RT) }, g);
    const headDot = sv('circle', { class: 'fui-caps-head', cx: f3(A[0]), cy: f3(A[1]), r: f3(RD) }, g);
    const ticks = sv('path', { class: 'fui-exit-ticks', d: r1.notchTicks }, trail);
    ticks.style.opacity = 0;
    const tether = sv('line', { class: 'fui-tether', x1: f3(A[0]), y1: f3(A[1]), x2: f3(A[0]), y2: f3(A[1]) }, trail);
    tether.style.opacity = 0;
    const anc = sv('g', { class: 'fui-anchor', transform: `translate(${f3(A[0])} ${f3(A[1])})` }, trail);
    sv('ellipse', { rx: 7, ry: 4 }, sv('g', { class: 'fui-px1' }, anc));
    anc.style.opacity = 0;
    const ringG = sv('g', { class: 'fui-slice-ring', transform: `translate(${f3(T[0])} ${f3(T[1])})` }, trail);
    const sliceRing = sv('circle', { r: 8 }, sv('g', { class: 'fui-px1' }, ringG));
    ringG.style.opacity = 0;
    idAll(g, c.base + '-caps'); idAll(trail, c.base + '-trail');

    const env = r => ({ o: polyD(r.outline), u: polyD(r.outer), tick: r.notchOpacity });
    const cap = (tail, head) => ({ st: stadium(tail, head, RO, dir), tail, head });
    const step = (ta, tb, E0, E1, C0, C1) => {
      const d = { duration: Math.max(0.001, tb - ta), ease: 'none' };
      if (E0.o !== E1.o) {
        if (outlineEl) ft(tl, outlineEl, { attr: { d: E0.o } }, Object.assign({ attr: { d: E1.o } }, d), ta);
        if (outerEl) ft(tl, outerEl, { attr: { d: E0.u } }, Object.assign({ attr: { d: E1.u } }, d), ta);
        if (fillMatches) ft(tl, fillEl, { attr: { d: E0.o } }, Object.assign({ attr: { d: E1.o } }, d), ta);
      }
      if (E0.tick !== E1.tick) ft(tl, ticks, { opacity: E0.tick }, Object.assign({ opacity: E1.tick }, d), ta);
      if (C0.st !== C1.st) {
        ft(tl, [capFill, capRing], { attr: { d: C0.st } }, Object.assign({ attr: { d: C1.st } }, d), ta);
        ft(tl, spine, { attr: { x1: f3(C0.tail[0]), y1: f3(C0.tail[1]), x2: f3(C0.head[0]), y2: f3(C0.head[1]) } }, Object.assign({ attr: { x1: f3(C1.tail[0]), y1: f3(C1.tail[1]), x2: f3(C1.head[0]), y2: f3(C1.head[1]) } }, d), ta);
        if (C0.head !== C1.head) ft(tl, headDot, { attr: { cx: f3(C0.head[0]), cy: f3(C0.head[1]) } }, Object.assign({ attr: { cx: f3(C1.head[0]), cy: f3(C1.head[1]) } }, d), ta);
        if (C0.tail !== C1.tail) ft(tl, tailDot, { attr: { cx: f3(C0.tail[0]), cy: f3(C0.tail[1]) } }, Object.assign({ attr: { cx: f3(C1.tail[0]), cy: f3(C1.tail[1]) } }, d), ta);
      }
    };
    // ---- stretch: one keyframe per frame
    const e = easeFn(opts.ease);
    const Ns = Math.max(8, Math.round(opts.stretch * FPS));
    const nodeVis0 = node.vis;
    cut(tl, node.el, { opacity: nodeVis0 }, { opacity: 0 }, t0);
    cut(tl, g, { opacity: 0 }, { opacity: 1 }, t0);
    let pv = 0, pE = env(r0), pC = cap(A, A), tCross = t0;
    for (let k = 1; k <= Ns; k++) {
      const ta = t0 + (k - 1) * opts.stretch / Ns, tb = t0 + k * opts.stretch / Ns;
      const v = e(k / Ns);
      const head = dev(v, 1).P;                       // the demo's exit path, arc included
      const mem = v <= vPinch ? dev(v, 1) : dev(vPinch, 1);   // the membrane holds its tension
      const E1 = env(mem), C1 = cap(A, head);
      step(ta, tb, pE, E1, pC, C1);
      if (pv < r0.crossV && v >= r0.crossV) tCross = ta + (tb - ta) * (r0.crossV - pv) / Math.max(1e-6, v - pv);
      pv = v; pE = E1; pC = C1;
    }
    // colour: ink to cobalt as the head passes the edge
    ft(tl, capRing, { stroke: C.ink }, { stroke: C.signal, duration: 0.24, ease: 'power2.out' }, tCross);
    ft(tl, spine, { stroke: C.ink }, { stroke: C.signal, duration: 0.24, ease: 'power2.out' }, tCross);
    ft(tl, headDot, { fill: C.ink }, { fill: C.signal, duration: 0.24, ease: 'power2.out' }, tCross);
    c.ev('stretch', t0, opts.stretch, { from: A, to: T, pinchAt: +(t0 + opts.stretch * 0.5).toFixed(3) });
    c.ev('cross-edge', tCross, 0.2, {});
    // ---- snap: tail retracts to the head, membrane relaxes to the notch, tether follows the tail
    const tS = t0 + opts.stretch + opts.hold;
    const Nn = Math.max(6, Math.round(opts.snap * FPS));
    if (opts.tether) cut(tl, tether, { opacity: 0 }, { opacity: 1 }, tS);
    let pTail = A;
    for (let k = 1; k <= Nn; k++) {
      const ta = tS + (k - 1) * opts.snap / Nn, tb = tS + k * opts.snap / Nn;
      const w = EASE.outExpo(k / Nn);
      const tail = lerp2(A, T, w);
      const E1 = env(dev(lerp(vPinch, 1, w), 1));
      const C0 = cap(pTail, T), C1 = cap(tail, T);
      C0.head = C1.head;   // the head is parked on T: no head tween
      step(ta, tb, pE, E1, Object.assign(C0, { st: pC.st }), C1);
      if (opts.tether) ft(tl, tether, { attr: { x2: f3(pTail[0]), y2: f3(pTail[1]) } }, { attr: { x2: f3(tail[0]), y2: f3(tail[1]) }, duration: tb - ta, ease: 'none' }, ta);
      pTail = tail; pE = E1; pC = C1;
    }
    const tLand = tS + opts.snap * 0.5;
    node.moveTo(tl, tS, T, 0.001);
    node.state(tl, tS, 'outside', 0.001);
    cut(tl, node.el, { opacity: 0 }, { opacity: 1 }, tLand);
    node.vis = 1;
    ft(tl, node.parts.out, { attr: { transform: sc(1.5, 1.5, 0, 0) } }, { attr: { transform: sc(1, 1, 0, 0) }, duration: 0.55, ease: 'expo.out' }, tLand);
    ft(tl, g, { opacity: 1 }, { opacity: 0, duration: 0.1, ease: 'power1.out' }, tLand);
    node.reticle(tl, tLand, true, 0.6);
    ft(tl, anc, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' }, tS + 0.05);
    if (opts.ring) {
      ft(tl, ringG, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' }, tLand);
      ft(tl, sliceRing, { attr: { r: 8 } }, { attr: { r: 28 }, duration: 0.8, ease: 'expo.out' }, tLand);
    }
    const tEnd = tS + opts.snap + 0.3;
    c.ev('snap', tS, opts.snap, { latch: +tLand.toFixed(3) });
    const X = {
      t0, tCross, tSnap: tS, tLand, tEnd, A, T, E: r1.E, dir, vPinch, node, capsule: g, tether, anchor: anc, ringEl: ringG, ticks,
      where: 'outside', notchK: 1, ctx: c,
      /** the change branch: the node travels back inside to its roof position, the notch heals */
      back(tl, t, dur, ease) {
        dur = dur || 1.2; ease = ease || 'power2.inOut';
        if (this.where !== 'outside') return t;
        node.moveTo(tl, t, A, dur, ease);
        ft(tl, tether, { attr: { x1: f3(A[0]), y1: f3(A[1]), x2: f3(T[0]), y2: f3(T[1]) } }, { attr: { x1: f3(A[0]), y1: f3(A[1]), x2: f3(A[0]), y2: f3(A[1]) }, duration: dur, ease }, t);
        ft(tl, ringG, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: 'power1.out' }, t);
        ft(tl, anc, { opacity: 1 }, { opacity: 0, duration: dur * 0.5, ease: 'power1.in' }, t + dur * 0.5);
        this._notch(tl, t + dur * 0.4, 0, dur * 0.8);
        c.ev('return-inside', t, dur, {});
        this.where = 'inside';
        return t + dur;
      },
      /** a clean state swap back to the landed outside configuration (retain / transfer branches) */
      outside(tl, t) {
        if (this.where === 'outside') return t;
        node.moveTo(tl, t, T, 0.001);
        cut(tl, tether, { attr: { x1: f3(A[0]), y1: f3(A[1]), x2: f3(A[0]), y2: f3(A[1]) } }, { attr: { x1: f3(A[0]), y1: f3(A[1]), x2: f3(T[0]), y2: f3(T[1]) } }, t);
        cut(tl, ringG, { opacity: 0 }, { opacity: 1 }, t);
        cut(tl, anc, { opacity: 0 }, { opacity: 1 }, t);
        this._notch(tl, t, 1, 0.001);
        this.where = 'outside';
        return t;
      },
      _notch(tl, t, to, dur) {
        const from = this.notchK;
        if (from === to) return;
        const ra = dev(1, from), rb = dev(1, to);
        const fn = dur <= 0.002 ? cut : ft;
        const d = dur <= 0.002 ? {} : { duration: dur, ease: 'power2.inOut' };
        if (outlineEl) fn(tl, outlineEl, { attr: { d: polyD(ra.outline) } }, Object.assign({ attr: { d: polyD(rb.outline) } }, d), t);
        if (outerEl) fn(tl, outerEl, { attr: { d: polyD(ra.outer) } }, Object.assign({ attr: { d: polyD(rb.outer) } }, d), t);
        if (fillMatches) fn(tl, fillEl, { attr: { d: polyD(ra.outline) } }, Object.assign({ attr: { d: polyD(rb.outline) } }, d), t);
        fn(tl, ticks, { opacity: ra.notchOpacity }, Object.assign({ opacity: rb.notchOpacity }, d), t);
        this.notchK = to;
      },
    };
    return X;
  }

  // ------------------------------------------------------------------ Sprinkler Zone 3 states on a SiteKit site
  function sprinkler(tl, site, t, to, opts) {
    opts = opt({ step: 0.055, labelSignal: true }, opts);
    const c = ctx({ prefix: opts.prefix || site.prefix, scene: opts.scene, eventOffset: opts.eventOffset }, 'sz3');
    let S = site.__fuiSz;
    if (!S) {
      const heads = [], crosses = [];
      for (let i = 0; i <= 30; i++) { const k = String(i).padStart(2, '0'); heads.push(site.el('sz3-head-' + k)); crosses.push(site.el('sz3-cross-' + k)); }
      const order = heads.map((hd, i) => [hd, crosses[i], +(hd.getAttribute('data-i') || i)]).sort((a, b) => a[2] - b[2]);
      const outline = site.el('sz3-outline');
      const offLine = outline.cloneNode(false); offLine.removeAttribute('id'); offLine.setAttribute('class', 'fui-sz-offline');
      offLine.style.opacity = 0; outline.parentNode.insertBefore(offLine, outline.nextSibling);
      const status = site.el('sz3-label-status');
      const mkStat = (txt, cls) => { const n = status.cloneNode(false); n.removeAttribute('id'); n.setAttribute('class', 'st ' + cls); n.textContent = txt; n.style.opacity = 0; status.parentNode.appendChild(n); return n; };
      const labels = { active: status, offline: mkStat('OFFLINE', 'fui-sz-st-off' + (opts.labelSignal ? ' fui-sig-t' : '')), restored: mkStat('RESTORED', 'fui-sz-st-res') };
      idAll(offLine, c.base + '-ol'); idAll(labels.offline, c.base + '-off'); idAll(labels.restored, c.base + '-res');
      S = site.__fuiSz = { state: 'active', order, outline, offLine, fill: site.el('sz3-fill'), hatch: site.el('sz3-hatch'), labels };
    }
    if (S.state === to) return t;
    const from = S.state;
    const off = to === 'offline';
    const n = S.order.length;
    S.order.forEach(([hd, cr], i) => {
      const ti = t + i * opts.step;
      ft(tl, hd, { fill: off ? '#6A6863' : C.paper, opacity: off ? 1 : 0.9 }, { fill: off ? C.paper : '#6A6863', opacity: off ? 0.9 : 1, duration: 0.45, ease: 'power2.out' }, off ? ti : t + (n - 1 - i) * opts.step);
      if (cr) ft(tl, cr, { opacity: off ? 0 : 1 }, { opacity: off ? 1 : 0, duration: 0.45, ease: 'power2.out' }, off ? ti : t + (n - 1 - i) * opts.step);
    });
    if (off || from === 'offline') {
      ft(tl, S.hatch, { opacity: off ? 0 : 1 }, { opacity: off ? 1 : 0, duration: 1.1, ease: 'power1.inOut' }, t + (off ? 0.35 : 0));
      ft(tl, S.fill, { opacity: off ? 1 : 0 }, { opacity: off ? 0 : 1, duration: 0.6, ease: 'power1.inOut' }, t);
      ft(tl, S.offLine, { opacity: off ? 0 : 1 }, { opacity: off ? 1 : 0, duration: 0.4, ease: 'power1.inOut' }, t);
      ft(tl, S.outline, { opacity: off ? 1 : 0 }, { opacity: off ? 0 : 1, duration: 0.4, ease: 'power1.inOut' }, t);
    }
    ft(tl, S.labels[from], { opacity: 1 }, { opacity: 0, duration: 0.2, ease: 'power1.in' }, t);
    ft(tl, S.labels[to], { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' }, t + 0.15);
    c.ev(off ? 'zone-offline' : 'zone-' + to, t, n * opts.step + 0.45, { from });
    S.state = to;
    return t + n * opts.step + 0.45;
  }

  // ================================================================== 3. activity card
  const ROW = {
    waiting: { color: C.ink3, cw: 1, cp: 1, cx: 0, em: 'none' },
    checking: { color: C.ink, cw: 1, cp: 1, cx: 0, em: 'none' },
    verified: { color: C.ink, cw: 0, cp: 0, cx: 0, em: 'verified' },
    unavailable: { color: C.ink, cw: 0, cp: 1, cx: 1, em: 'unavailable' },
  };
  function activityCard(opts) {
    opts = opt({ scale: 1.8, state: 'waiting' }, opts);
    const c = ctx(opts, 'card');
    const D = Object.assign({}, DATA.card, opts.data || {});
    const root = h('div', 'pui pui-herocard fui fui-card');
    root.style.setProperty('--pui-scale', opts.scale);
    const top = h('div', 'hc-top', root);
    h('span', 'lab', top, D.ref);
    const initRow = opts.state === 'verified' ? 'verified' : 'waiting';
    const glyphSwap = Swap(top, {
      checking: n => glyph('g-checking', 'g', n), inside: n => glyph('g-inside', 'g', n), outside: n => glyph('g-outside', 'g', n, 'var(--pui-signal)'),
    }, initRow === 'verified' ? 'inside' : 'checking', { dy: 0, cls: 'fui-card-g' });
    h('div', 'hc-title', root, D.title);
    h('div', 'hc-sub', root, D.sub);
    h('div', 'hc-meta', root, D.meta);
    const ul = h('ul', 'conds', root);
    const rows = D.rows.map((label, i) => {
      const li = h('li', 'fui-row', ul);
      const ck = sv('svg', { class: 'ck', viewBox: '0 0 16 16' }, li);
      const cw = sv('circle', { class: 'c-w', cx: 8, cy: 8, r: 6 }, ck);
      const cp = sv('path', { class: 'c-p', pathLength: 1, d: 'M3.4 8.4L6.6 11.4L12.8 4.6' }, ck);
      const cx = sv('g', { class: 'c-x fui-cx', transform: sc(1, 1, 8, 8) }, ck);
      sv('circle', { cx: 8, cy: 8, r: 6 }, cx); sv('path', { d: 'M4 12L12 4' }, cx);
      h('span', '', li, label);
      const em = Swap(li, { none: '', verified: 'VERIFIED', unavailable: n => { n.textContent = 'UNAVAILABLE'; n.classList.add('fui-sig-t'); } }, ROW[initRow].em, { tag: 'em', dy: 4 });
      const R = ROW[initRow];
      li.style.color = R.color; cw.style.opacity = R.cw; cp.style.strokeDashoffset = R.cp; cx.style.opacity = R.cx;
      return { li, cw, cp, cx, em, label, cur: initRow };
    });
    const foot = h('div', 'hc-foot', root);
    const leftV = { c0: 'Checking 0 of 5', c1: 'Checking 1 of 5', c2: 'Checking 2 of 5', c3: 'Checking 3 of 5', c4: 'Checking 4 of 5', v5: '5 of 5 verified', h4: '4 of 5 hold' };
    const footL = Swap(foot, leftV, initRow === 'verified' ? 'v5' : 'c0', { dy: 4 });
    const fr = h('b', '', foot);
    const footR = Swap(fr, { checking: 'Checking state', inside: 'Inside envelope', recalc: 'Recalculating', outside: n => { n.textContent = 'Outside envelope'; } }, initRow === 'verified' ? 'inside' : 'checking', { dy: 4 });
    root.id = c.id();
    idAll(root, c.base);
    mountTo(root, opts);
    const card = {
      el: root, rows, footL, footR, glyph: glyphSwap, ctx: c,
      enter(tl, t, dur) {
        dur = dur || 0.8;
        ft(tl, root, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: dur, ease: 'power3.out' }, t);
        c.ev('card-enter', t, dur, {});
        return t + dur;
      },
      hideForEnter() { gsap.set(root, { opacity: 0 }); return this; },
      /** setRowState(tl, i, state, t): 'waiting' | 'checking' | 'verified' | 'unavailable' */
      setRowState(tl, i, state, t, dur) {
        const r = rows[i]; if (!r || r.cur === state) return t;
        dur = dur == null ? 0.36 : dur;
        const A = ROW[r.cur], B = ROW[state];
        if (A.color !== B.color) ft(tl, r.li, { color: A.color }, { color: B.color, duration: dur * 0.6, ease: 'power1.out' }, t);
        if (A.cw !== B.cw) ft(tl, r.cw, { opacity: A.cw }, { opacity: B.cw, duration: dur * 0.5, ease: 'power1.out' }, t);
        if (A.cp !== B.cp) ft(tl, r.cp, { strokeDashoffset: A.cp }, { strokeDashoffset: B.cp, duration: B.cp === 0 ? dur : dur * 0.4, ease: B.cp === 0 ? 'power2.out' : 'power1.in' }, t + (B.cp === 0 ? dur * 0.15 : 0));
        if (A.cx !== B.cx) {
          ft(tl, r.cx, { opacity: A.cx }, { opacity: B.cx, duration: dur * 0.6, ease: 'power2.out' }, t + dur * 0.2);
          if (B.cx) ft(tl, r.cx, { attr: { transform: sc(0.6, 0.6, 8, 8) } }, { attr: { transform: sc(1, 1, 8, 8) }, duration: dur * 1.4, ease: 'expo.out' }, t + dur * 0.2);
        }
        r.em.to(tl, t + dur * 0.45, B.em, 0.28);
        if (state === 'verified') c.ev('verify', t + dur * 0.15, dur, { row: i, label: r.label });
        if (state === 'unavailable') c.ev('row-unavailable', t, dur, { row: i, label: r.label });
        r.cur = state;
        return t + dur;
      },
      setFooter(tl, t, left, right, dur) { if (left) footL.to(tl, t, left, dur); if (right) footR.to(tl, t, right, dur); return t + (dur || 0.3); },
      setGlyph(tl, t, key, dur) { return glyphSwap.to(tl, t, key, dur == null ? 0.25 : dur); },
      /** verifyRows(tl, t0, stagger): rows resolve to VERIFIED one by one (the demo's 600 ms) */
      verifyRows(tl, t0, stagger) {
        stagger = stagger || 0.6;
        this.setFooter(tl, t0, 'c0', 'checking', 0.2);
        this.setGlyph(tl, t0, 'checking');
        rows.forEach((r, i) => {
          const ti = t0 + 0.12 + i * stagger;
          this.setRowState(tl, i, 'verified', ti);
          footL.to(tl, ti + 0.18, i < rows.length - 1 ? 'c' + (i + 1) : 'v5', 0.24);
        });
        const tEnd = t0 + 0.12 + (rows.length - 1) * stagger + 0.45;
        footR.to(tl, tEnd - 0.05, 'inside', 0.3);
        this.setGlyph(tl, tEnd - 0.05, 'inside');
        c.ev('verified-all', tEnd, 0.3, { n: rows.length });
        return tEnd + 0.3;
      },
      /** the fifth condition fails: UNAVAILABLE (cobalt), footer 4 OF 5 HOLD · RECALCULATING */
      conditionLost(tl, t, i) {
        i = i == null ? rows.length - 1 : i;
        this.setRowState(tl, i, 'unavailable', t);
        footL.to(tl, t + 0.15, 'h4', 0.3);
        footR.to(tl, t + 0.15, 'recalc', 0.3);
        this.setGlyph(tl, t + 0.15, 'checking');
        return t + 0.5;
      },
    };
    return card;
  }

  // ================================================================== 4. capture strip (speech intake)
  /** a deterministic amplitude envelope from word timings (for tests or when no audio envelope is supplied) */
  function envelopeFromWords(words, dur, n, seed) {
    n = n || 240; const r = rng(seed || 'voice'); const out = [];
    const t0 = words[0].start;
    for (let i = 0; i < n; i++) {
      const tt = t0 + dur * (i + 0.5) / n;
      let a = 0.03;
      for (const w of words) {
        if (tt >= w.start && tt <= w.end) { const x = (tt - w.start) / Math.max(0.05, w.end - w.start); a = Math.max(a, Math.sin(Math.PI * x) * (0.55 + 0.45 * r())); }
      }
      out.push(clamp(a, 0, 1));
    }
    return out;
  }
  function captureStrip(opts) {
    opts = opt({ width: 1040, waveH: 64 }, opts);
    const c = ctx(opts, 'capture');
    const D = DATA.capture;
    const text = opts.text || D.text;
    const fields = opts.fields || D.fields;
    const root = h('div', 'pui fui fui-capture');
    root.style.width = opts.width + 'px';
    const head = h('div', 'fui-cap-head', root);
    h('i', 'fui-cap-dot', head);
    h('span', 'fui-cap-lab', head, opts.label || D.label);
    const state = Swap(head, { listening: 'Listening', resolved: 'Structured' }, 'listening', { cls: 'fui-cap-state', dy: 4 });
    // waveform: mirrored hairline bars from the amplitude envelope (one bar per opts.barPitch px,
    // each the peak of its slice), revealed by a clip whose edge is the playhead
    const ww = opts.width - 72, wh = opts.waveH;
    const wave = sv('svg', { class: 'fui-cap-wave', viewBox: `0 0 ${ww} ${wh}`, width: ww, height: wh }, root);
    sv('line', { class: 'ax', x1: 0, y1: wh / 2, x2: ww, y2: wh / 2 }, wave);
    const env = opts.envelope || (opts.words ? envelopeFromWords(opts.words, opts.duration || (opts.words[opts.words.length - 1].end - opts.words[0].start + 0.3)) : new Array(200).fill(0.3));
    const n = env.length, pitch = opts.barPitch || 5, nb = Math.max(8, Math.floor(ww / pitch));
    const peak = env.reduce((m, v) => Math.max(m, v), 1e-6);
    let d = '';
    for (let j = 0; j < nb; j++) {
      const i0 = Math.floor(j * n / nb), i1 = Math.max(i0 + 1, Math.floor((j + 1) * n / nb));
      let a = 0; for (let i = i0; i < i1 && i < n; i++) a = Math.max(a, env[i]);
      const hh = Math.max(0.8, Math.pow(clamp(a / peak, 0, 1), 0.85) * (wh / 2 - 4));
      const x = (j + 0.5) * ww / nb;
      d += 'M' + f3(x) + ' ' + f3(wh / 2 - hh) + 'V' + f3(wh / 2 + hh);
    }
    const clipId = c.id('wclip');
    const clip = sv('clipPath', { id: clipId }, sv('defs', {}, wave));
    const clipR = sv('rect', { x: -2, y: 0, width: 0, height: wh }, clip);
    const wpath = sv('path', { class: 'wv', d, 'clip-path': `url(#${clipId})` }, wave);
    const headLine = sv('line', { class: 'hd', x1: 0, y1: 2, x2: 0, y2: wh - 2 }, wave);
    headLine.style.opacity = 0;
    // transcript
    const tx = h('div', 'fui-cap-tx', root);
    const tokens = text.split(' ').map(tok => { const s = h('span', 'fui-w', tx, tok); tx.appendChild(document.createTextNode(' ')); s.style.opacity = 0; return s; });
    // structured fields
    const fl = h('div', 'fui-cap-fields', root);
    const F = fields.map(f => {
      const cell = h('div', 'fui-field', fl);
      const k = h('span', 'k', cell, f.k);
      const v = h('span', 'v' + (f.mono ? ' mono' : ''), cell, f.v);
      const u = h('i', 'u', cell);
      k.style.opacity = 0; v.style.opacity = 0; if (window.gsap) gsap.set(u, { scaleX: 0, transformOrigin: '0% 50%' });
      return { f, cell, k, v, u };
    });
    root.id = c.id();
    idAll(root, c.base);
    mountTo(root, opts);
    return {
      el: root, tokens, fields: F, wave: wpath, ctx: c,
      enter(tl, t, dur) { dur = dur || 0.6; ft(tl, root, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: dur, ease: 'power3.out' }, t); return t + dur; },
      hideForEnter() { gsap.set(root, { opacity: 0 }); return this; },
      /** play(tl, offset, words): waveform draws with the take, words set on their times (+offset) */
      play(tl, offset, words, dur) {
        words = words || opts.words;
        offset = offset || 0;
        // the envelope spans the reveal window: opts.envelopeSpan [t0, t1] in take seconds when the
        // envelope was cut to a known window, else the words' window (first start - 0.05 to last end + 0.1)
        const sp = opts.envelopeSpan;
        const ta = (sp ? sp[0] : words[0].start - 0.05) + offset, tb = (sp ? sp[1] : words[words.length - 1].end + 0.1) + offset;
        dur = dur || (tb - ta);
        ft(tl, clipR, { attr: { width: 0 } }, { attr: { width: ww + 4 }, duration: dur, ease: 'none' }, ta);
        ft(tl, headLine, { opacity: 0 }, { opacity: 1, duration: 0.15 }, ta);
        ft(tl, headLine, { attr: { x1: 0, x2: 0 } }, { attr: { x1: ww, x2: ww }, duration: dur, ease: 'none' }, ta);
        ft(tl, headLine, { opacity: 1 }, { opacity: 0, duration: 0.3 }, ta + dur);
        tokens.forEach((s, i) => { const w = words[i] || words[words.length - 1]; ft(tl, s, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.32, ease: 'power3.out' }, w.start + offset); });
        c.ev('voice-in', ta, dur, { words: words.length });
        return ta + dur;
      },
      /** the transcript resolves into the four structured fields, each underlined in cobalt */
      resolve(tl, t, stagger) {
        stagger = stagger || 0.22;
        state.to(tl, t, 'resolved', 0.3);
        tokens.forEach(s => ft(tl, s, { color: C.ink }, { color: C.ink3, duration: 0.5, ease: 'power1.inOut' }, t));
        F.forEach((x, i) => {
          const ti = t + 0.15 + i * stagger;
          ft(tl, x.k, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, ti);
          ft(tl, x.v, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, ti + 0.06);
          ft(tl, x.u, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'expo.out' }, ti + 0.2);
          (x.f.match || []).forEach(j => tokens[j] && ft(tl, tokens[j], { color: C.ink3 }, { color: C.ink, duration: 0.3, ease: 'power1.out' }, ti + 0.2));
          c.ev('field', ti + 0.2, 0.5, { key: x.f.key, value: x.f.v });
        });
        return t + 0.15 + (F.length - 1) * stagger + 0.7;
      },
    };
  }

  // ================================================================== 5. clause labels and live connections (site SVG, world units)
  function conditionLabel(svgParent, opts) {
    opts = opt({ num: '4.2', s: 11, size: 21, align: 'left', lead: 22, maxChars: 32 }, opts);
    const c = ctx(opts, 'clause-' + opts.num.replace('.', '-'));
    const text = (opts.text || DATA.clauses[opts.num] || '').toUpperCase();
    // wrap on the middle dots, never inside a phrase
    const lines = [];
    const push = (piece, sep) => {
      const last = lines.length ? lines[lines.length - 1] : null;
      if (last != null && (last + sep + piece).length <= opts.maxChars) lines[lines.length - 1] = last + sep + piece;
      else lines.push(piece);
    };
    text.split(' · ').forEach(ph => {
      if (ph.length <= opts.maxChars) push(ph, ' · ');
      else ph.split(' ').forEach((wd, j) => (j ? push(wd, ' ') : push(wd, ' · ')));   // a long phrase wraps on spaces
    });
    const k = 1 / opts.s;
    const at = opts.at;
    const g = sv('g', { class: 'fui-clause', transform: `translate(${f3(at[0])} ${f3(at[1])}) scale(${f3(k)})` }, svgParent);
    g.style.setProperty('--fui-s', opts.s);
    const fs = opts.size, cw = fs * (0.6 + 0.12), lh = fs * 1.5;
    const numW = opts.num.length * cw + 22, boxH = fs + 18;
    const dirx = opts.align === 'left' ? 1 : -1;
    const textW = Math.max(...lines.map(l => l.length)) * cw;
    const x0 = dirx * opts.lead;
    const boxX = dirx > 0 ? x0 : x0 - numW;
    const txX = dirx > 0 ? boxX + numW + 14 : boxX - 14 - textW;
    const term = sv('circle', { class: 'fui-clause-term', r: 4.5 }, g);
    const lead = sv('path', { class: 'fui-clause-lead', d: `M${dirx * 5} 0H${f3(x0)}` }, g);
    const box = sv('rect', { class: 'fui-clause-box', x: f3(boxX), y: f3(-boxH / 2), width: f3(numW), height: f3(boxH) }, g);
    const num = sv('text', { class: 'fui-clause-num', x: f3(boxX + numW / 2), y: f3(fs * 0.36), 'font-size': fs, 'text-anchor': 'middle' }, g);
    num.textContent = opts.num;
    const tx = sv('text', { class: 'fui-clause-tx', x: f3(txX), y: f3(fs * 0.36), 'font-size': fs }, g);
    lines.forEach((l, i) => { const ts = sv('tspan', { x: f3(txX), dy: i ? f3(lh) : 0 }, tx); ts.textContent = l; });
    const ruleY = boxH / 2 + 10 + (lines.length - 1) * lh;
    const rule = sv('path', { class: 'fui-clause-rule', d: `M${f3(Math.min(boxX, txX))} ${f3(ruleY)}H${f3(Math.max(boxX + numW, txX + textW))}` }, g);
    const parts2 = [term, lead, box, num, tx, rule];
    parts2.forEach(p => { p.style.opacity = 0; });
    box.style.fillOpacity = 0;
    idAll(g, c.base);
    const L = {
      el: g, at, lines, ctx: c, on: false,
      reveal(tl, t, dur) {
        dur = dur || 0.9;
        ft(tl, term, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t);
        cut(tl, lead, { opacity: 0 }, { opacity: 1 }, t);
        drawFrom(tl, lead, t, dur * 0.3, 'power2.out');
        cut(tl, box, { opacity: 0 }, { opacity: 1 }, t + dur * 0.2);
        drawFrom(tl, box, t + dur * 0.2, dur * 0.45, 'power2.inOut');
        // the paper fill arrives once the outline is drawn (never a blank box ahead of its line)
        ft(tl, box, { fillOpacity: 0 }, { fillOpacity: 1, duration: dur * 0.3, ease: 'power1.out' }, t + dur * 0.55);
        ft(tl, num, { opacity: 0 }, { opacity: 1, duration: dur * 0.35, ease: 'power2.out' }, t + dur * 0.4);
        ft(tl, tx, { opacity: 0, attr: { transform: `translate(${-dirx * 10} 0)` } }, { opacity: 1, attr: { transform: 'translate(0 0)' }, duration: dur * 0.55, ease: 'power3.out' }, t + dur * 0.45);
        cut(tl, rule, { opacity: 0 }, { opacity: 1 }, t + dur * 0.5);
        drawFrom(tl, rule, t + dur * 0.5, dur * 0.5, 'power2.inOut');
        c.ev('clause', t, dur, { num: opts.num });
        return t + dur;
      },
      /** the terminal and number box take the live (cobalt) colour when connected */
      live(tl, t, on) {
        on = on !== false;
        if (on === this.on) return t;
        const a = on ? C.ink : C.signal, b = on ? C.signal : C.ink;
        ft(tl, [term, box], { stroke: a }, { stroke: b, duration: 0.3, ease: 'power1.out' }, t);
        ft(tl, num, { fill: a }, { fill: b, duration: 0.3, ease: 'power1.out' }, t);
        this.on = on;
        return t + 0.3;
      },
      fade(tl, t, to, dur) { ft(tl, g, { opacity: 1 }, { opacity: to == null ? 0 : to, duration: dur || 0.5, ease: 'power1.inOut' }, t); return t + (dur || 0.5); },
    };
    return L;
  }
  /**
   * connect(tl, t, svgParent, from, to, opts): a cobalt live connection drawn on, world coords.
   * shape: 'straight' | 'elbow' (horizontal first) | 'elbow-v' (vertical first) | 'arc'
   */
  function connect(tl, t, svgParent, from, to, opts) {
    opts = opt({ dur: 0.8, shape: 'straight', bend: 0.5, terminals: true, ease: 'power2.inOut' }, opts);
    const c = ctx(opts, 'live');
    const g = sv('g', { class: 'fui-live' }, svgParent);
    let d;
    if (opts.shape === 'elbow') { const mx = lerp(from[0], to[0], opts.bend); d = `M${f3(from[0])} ${f3(from[1])}H${f3(mx)}L${f3(to[0])} ${f3(to[1])}`; }
    else if (opts.shape === 'elbow-v') { const my = lerp(from[1], to[1], opts.bend); d = `M${f3(from[0])} ${f3(from[1])}V${f3(my)}L${f3(to[0])} ${f3(to[1])}`; }
    else if (opts.shape === 'arc') { const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2, dx = to[0] - from[0], dy = to[1] - from[1]; const k = opts.bend - 0.5; d = `M${f3(from[0])} ${f3(from[1])}Q${f3(mx - dy * k)} ${f3(my + dx * k)} ${f3(to[0])} ${f3(to[1])}`; }
    else d = `M${f3(from[0])} ${f3(from[1])}L${f3(to[0])} ${f3(to[1])}`;
    const path = sv('path', { class: 'fui-live-p', d }, g);
    const mkT = p => { const tg = sv('g', { class: 'fui-live-t', transform: `translate(${f3(p[0])} ${f3(p[1])})` }, g); sv('circle', { r: 3.4 }, sv('g', { class: 'fui-px1' }, tg)); tg.style.opacity = 0; return tg; };
    const ta = opts.terminals && opts.fromTerminal !== false ? mkT(from) : null;
    const tb = opts.terminals && opts.toTerminal !== false ? mkT(to) : null;
    path.style.opacity = 0;
    idAll(g, c.base);
    cut(tl, path, { opacity: 0 }, { opacity: 1 }, t);
    drawFrom(tl, path, t, opts.dur, opts.ease);
    if (ta) ft(tl, ta, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t);
    if (tb) ft(tl, tb, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' }, t + opts.dur * 0.92);
    c.ev('connect', t, opts.dur, { name: opts.name || '' });
    return { el: g, path, end: t + opts.dur, ctx: c,
      fade(tl, t2, dur, to) { ft(tl, g, { opacity: 1 }, { opacity: to == null ? 0 : to, duration: dur || 0.4 }, t2); return t2 + (dur || 0.4); },
      ink(tl, t2, dur) { ft(tl, path, { stroke: C.signal }, { stroke: C.ink, duration: dur || 0.5 }, t2); return t2 + (dur || 0.5); } };
  }

  // ================================================================== readout (the node's tooltip)
  function readout(opts) {
    opts = opt({ scale: 1.8, state: 'outside', slice: true }, opts);
    const c = ctx(opts, 'readout');
    const root = h('div', 'pui pui-readout fui fui-readout');
    root.style.setProperty('--pui-scale', opts.scale);
    h('div', 'ro-name', root, opts.name || 'Hot work · Roof 03');
    const V = {
      checking: ['Checking state', 'Verifying 5 conditions'],
      inside: ['Inside programme', 'DKK 0 incremental', 'mono'],
      recalc: ['Recalculating risk state', 'Sprinkler Zone 3 offline'],
      outside: ['Outside agreed conditions', 'Decision required', '', true],
      back: ['Back inside accepted envelope', 'DKK 0 incremental', 'mono'],
      retained: ['Risk retained · Nordhavn', 'Owned and recorded · until 18:00'],
    };
    const vars = {};
    for (const k in V) vars[k] = n => { n.classList.add('fui-ro-v'); const a = h('div', 'ro-a', n, V[k][0]); if (V[k][3]) a.classList.add('fui-sig-t'); h('div', 'ro-b' + (V[k][2] ? ' ' + V[k][2] : ''), n, V[k][1]); };
    const sw = Swap(root, vars, opts.state, { tag: 'div', dy: 5, cls: 'fui-ro-swap' });
    let bar = null, sliceEl = null;
    if (opts.slice) {
      sliceEl = h('div', 'slice fui-slice', root);
      const s = sv('svg', { viewBox: '0 0 236 36' }, sliceEl);
      const pid = c.id('hatch');
      const pat = sv('pattern', { id: pid, width: 4, height: 4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, sv('defs', {}, s));
      sv('rect', { width: 4, height: 4, fill: C.paper }, pat);
      sv('line', { x1: 0, y1: 0, x2: 0, y2: 4, stroke: C.signal, 'stroke-width': 1.1, 'stroke-opacity': 0.55 }, pat);
      sv('text', { x: 6, y: 9 }, s).textContent = 'EXPOSURE · TEMPORARY · 3H 18M';
      sv('line', { class: 'ax', x1: 6, y1: 20, x2: 228, y2: 20 }, s);
      [6, 55.33, 104.67, 154, 203.33].forEach(x => sv('line', { class: 'ax', x1: x, y1: 17, x2: x, y2: 23 }, s));
      bar = sv('rect', { class: 'fui-seg', x: 40.5, y: 16, width: 162.8, height: 8, rx: 1, fill: `url(#${pid})`, transform: sc(1, 1, 40.5, 20) }, s);
      sv('text', { x: 40.5, y: 35 }, s).textContent = '14:42';
      sv('text', { x: 173.3, y: 35 }, s).textContent = '18:00';
      if (opts.state !== 'outside') sliceEl.style.opacity = 0;
    }
    root.id = c.id();
    idAll(root, c.base);
    mountTo(root, opts);
    return {
      el: root, swap: sw, ctx: c, sliceOn: opts.state === 'outside' ? 1 : 0,
      enter(tl, t, dur) { dur = dur || 0.5; ft(tl, root, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: dur, ease: 'power3.out' }, t); return t + dur; },
      hideForEnter() { gsap.set(root, { opacity: 0 }); return this; },
      set(tl, t, key, dur) {
        const end = sw.to(tl, t, key, dur);
        if (sliceEl) {
          const on = key === 'outside' ? 1 : 0;
          if (on !== this.sliceOn) {
            ft(tl, sliceEl, { opacity: this.sliceOn }, { opacity: on, duration: 0.3 }, t + 0.1);
            if (on) ft(tl, bar, { attr: { transform: sc(0, 1, 40.5, 20) } }, { attr: { transform: sc(1, 1, 40.5, 20) }, duration: 0.6, ease: 'expo.out' }, t + 0.15);
            this.sliceOn = on;
          }
        }
        return end;
      },
    };
  }

  // ================================================================== 6. trusted record column
  function recordColumn(opts) {
    opts = opt({ scale: 1.8, width: 560, height: null, tail: false, title: 'Trusted record', sub: 'Append-only', panel: false }, opts);
    const c = ctx(opts, 'record');
    const root = h('div', 'pui fui fui-record' + (opts.panel ? ' fui-panel' : ''));
    root.style.setProperty('--pui-scale', opts.scale);
    root.style.width = opts.width + 'px';
    const head = h('div', 'r-head fui-rec-head', root);
    const hl = h('span', 'lab', head);
    h('span', 'fui-rec-t', hl, opts.title);
    if (opts.sub) { h('i', 'fui-rec-sep', hl, '·'); h('span', 'fui-rec-s', hl, opts.sub); }
    const cnt = h('span', 'lab fui-rec-n', head);
    const initial = (opts.entries || []).map(x => (typeof x === 'string' ? DATA.records[x] : x));
    const counter = counterOdo(cnt, initial.length, Math.round(10 * opts.scale * 1.25), 2);
    h('span', 'fui-rec-nl', cnt, ' entries');
    const list = h('div', 'pui-record fui-rec-list' + (opts.tail ? ' tail' : ''), root);
    if (opts.height) list.style.height = opts.height + 'px';
    const entries = [];
    const mkEntry = (x, visible) => {
      const wrap = h('div', 'fui-rr-wrap', list);
      const inner = h('div', 'fui-rr-in', wrap);
      const kind = x.kind === 'dev' ? 'k-dev' : x.kind === 'decision' ? 'k-decision' : x.kind === 'sched' ? 'k-sched' : 'k-event';
      const rr = h('div', 'rr ' + kind + (x.sig ? ' sig' : '') + (entries.length === 0 ? ' fui-first' : ''), inner);
      h('span', 't', rr, x.t);
      h('span', 'm', rr);
      const body = h('div', '', rr);
      // a middle dot stays at the end of its line, never at the start of the next
      const nb = str => String(str).replace(/ · /g, '\u00a0· ');
      h('div', 'x', body, nb(x.x));
      if (x.s) h('div', 's', body, nb(x.s));
      if (x.i) h('div', 'i', body, x.i);
      if (!visible) { wrap.style.gridTemplateRows = '0fr'; rr.style.opacity = 0; rr.style.setProperty('--fui-rail', 0); rr.style.setProperty('--fui-mk', 0); }
      const e = { x, wrap, rr, body };
      entries.push(e);
      return e;
    };
    initial.forEach(x => mkEntry(x, true));
    root.id = c.id();
    idAll(root, c.base);
    mountTo(root, Object.assign({}, opts, { height: null }));   // opts.height sizes the list, not the column
    let n = initial.length;
    return {
      el: root, list, entries, counter, ctx: c,
      enter(tl, t, dur) { dur = dur || 0.7; ft(tl, root, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: dur, ease: 'power3.out' }, t); return t + dur; },
      hideForEnter() { gsap.set(root, { opacity: 0 }); return this; },
      /** append(tl, t, entry): entry is a DATA.records key or {t, kind, x, s, i, sig} */
      append(tl, t, entry, dur) {
        dur = dur || 0.75;
        const x = typeof entry === 'string' ? DATA.records[entry] : entry;
        const e = mkEntry(x, false);
        idAll(e.wrap, c.base + '-a' + entries.length);
        ft(tl, e.wrap, { gridTemplateRows: '0fr' }, { gridTemplateRows: '1fr', duration: dur * 0.6, ease: 'power2.inOut' }, t);
        ft(tl, e.rr, { '--fui-rail': 0 }, { '--fui-rail': 1, duration: dur * 0.5, ease: 'power2.out' }, t + dur * 0.1);
        ft(tl, e.rr, { '--fui-mk': 0 }, { '--fui-mk': 1, duration: dur * 0.5, ease: 'expo.out' }, t + dur * 0.35);
        ft(tl, e.rr, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: dur * 0.7, ease: 'power3.out' }, t + dur * 0.3);
        n += 1;
        counter.roll(tl, t + dur * 0.35, n, 0.3, 'outCubic');
        c.ev('append', t + dur * 0.35, dur, { id: (x.i || '').split(' ')[0], entry: x.kind || 'event', kind: x.kind === 'dev' ? 'system-event' : 'record-append' });
        return t + dur;
      },
    };
  }

  // ================================================================== 7. decision sheet and outcomes
  function decisionSheet(opts) {
    opts = opt({ scale: 1.5, width: 980 }, opts);
    const c = ctx(opts, 'sheet');
    const D = DATA.sheet;
    const root = h('div', 'pui pui-sheet fui fui-sheet');
    root.style.setProperty('--pui-scale', opts.scale);
    root.style.width = opts.width + 'px';
    const svw = h('div', 'sv', root);
    const eb = h('div', 'eyebrow', svw);
    h('span', 'sd sig', eb);
    h('span', '', eb, D.eyebrow);
    h('h2', 'sheet-h', svw, D.title);
    h('p', 'sheet-p', svw, D.text);
    const ctxFold = h('div', 'fui-fold fui-open', svw);
    const ctxIn = h('div', 'fui-fold-in', ctxFold);
    const facts = h('dl', 'facts', ctxIn);
    D.facts.forEach(([dt, dd, mono, small]) => { const d = h('div', '', facts); h('dt', '', d, dt); const e = h('dd', mono ? 'mono' : '', d, dd); if (small) h('small', '', e, small); });
    const obs = h('div', 'obs', ctxIn);
    D.obs.forEach(([tt, g, x, sig], i) => {
      if (i) glyph('g-arrow-s', 'oa', obs);
      const ob = h('div', 'ob', obs);
      h('span', 't', ob, tt);
      const xx = h('span', 'x', ob);
      glyph(g, 'g', xx, sig ? 'var(--pui-signal)' : null);
      h('span', '', xx, x);
    });
    h('div', 'ask', svw, D.ask);
    const ch = h('div', 'choices', svw);
    const choices = {};
    D.choices.forEach(o => {
      const b = h('div', 'choice fui-choice', ch);
      glyph(o.g, 'g', b);
      h('b', '', b, o.b);
      h('span', 'd', b, o.d);
      h('span', 'o', b, o.o);
      choices[o.key] = b;
    });
    // outcomes (collapsed)
    const outcomes = {};
    const mkFold = key => { const f = h('div', 'fui-fold fui-oc fui-oc-' + key, svw); f.style.gridTemplateRows = '0fr'; const inner = h('div', 'fui-fold-in', f); const box = h('div', 'fui-outcome', inner); box.style.opacity = 0; return { fold: f, box }; };
    // change
    {
      const o = mkFold('change');
      const r1 = h('div', 'fui-oc-row', o.box);
      const opt = h('div', 'fui-oc-opt', r1);
      h('b', '', opt, 'Restore sprinkler protection');
      h('span', '', opt, 'Reopen the Zone 3 valve. Protection back within minutes.');
      const res = h('div', 'fui-oc-res', o.box);
      const st = h('div', 'fui-oc-state', res);
      glyph('g-changed', 'g', st);
      h('span', '', st, 'Back inside accepted envelope');
      const bv = h('div', 'fui-oc-val', res);
      h('em', '', bv, 'Incremental');
      h('b', '', bv, 'DKK 0');
      o.res = res; o.st = st; o.val = bv;
      gsap.set([st, bv], { opacity: 0 });
      outcomes.change = o;
    }
    // retain
    {
      const o = mkFold('retain');
      const ack = h('div', 'ack fui-ack', o.box);
      const bx = h('span', 'bx', ack);
      const bs = glyph('g-check', '', bx);
      h('span', '', ack, 'Nordhavn Bioprocessing knowingly carries this incremental exposure until 18:00.');
      const by = h('div', 'fui-oc-by', o.box, 'Decided by Anna Møller · Site Risk Manager · Rationale recorded');
      const own = h('div', 'fui-oc-own', o.box);
      glyph('g-retained', 'g', own);
      h('span', '', own, 'Owned and recorded · until 18:00');
      o.ack = ack; o.bx = bx; o.bs = bs; o.by = by; o.own = own;
      gsap.set([by, own], { opacity: 0 });
      outcomes.retain = o;
    }
    // transfer (in-sheet summary; the carriers live in transferPanel)
    {
      const o = mkFold('transfer');
      const r = h('div', 'fui-oc-tr', o.box);
      h('span', 'fui-future', r, 'Future state');
      h('span', 'fui-oc-trt', r, 'Priora shares the trusted observed state with selected carriers.');
      h('div', 'fui-oc-note', o.box, DATA.carrierNote);
      outcomes.transfer = o;
    }
    h('div', 'sheet-foot', svw, D.foot);
    root.id = c.id();
    idAll(root, c.base);
    mountTo(root, opts);
    const S = {
      el: root, choices, outcomes, ctx: c, sel: null, open: null, ctxOpen: true,
      enter(tl, t, dur) { dur = dur || 0.8; ft(tl, root, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: dur, ease: 'power3.out' }, t); c.ev('sheet-enter', t, dur, {}); return t + dur; },
      hideForEnter() { gsap.set(root, { opacity: 0 }); return this; },
      /** highlight(tl, t, key): 'change' | 'retain' | 'transfer' | null */
      highlight(tl, t, key, dur) {
        dur = dur || 0.45;
        const prev = this.sel;
        if (prev === key) return t;
        const look = (k, sel) => (sel === k ? { borderColor: C.ink, backgroundColor: '#FFFFFF', y: -3, opacity: 1 } : sel ? { borderColor: C.hair, backgroundColor: C.paper, y: 0, opacity: 0.42 } : { borderColor: C.hair, backgroundColor: C.paper, y: 0, opacity: 1 });
        for (const k in choices) {
          const a = look(k, prev), b = look(k, key);
          if (JSON.stringify(a) !== JSON.stringify(b)) ft(tl, choices[k], a, Object.assign(b, { duration: dur, ease: 'power2.out' }), t);
        }
        if (key) c.ev('choice', t, dur, { choice: key });
        this.sel = key;
        return t + dur;
      },
      /** collapse facts and timeline (true) or restore them (false) */
      focus(tl, t, on, dur) {
        const open = !on;
        if (open === this.ctxOpen) return t;
        dur = dur || 0.6;
        ft(tl, ctxFold, { gridTemplateRows: this.ctxOpen ? '1fr' : '0fr', opacity: this.ctxOpen ? 1 : 0 }, { gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0, duration: dur, ease: 'power2.inOut' }, t);
        this.ctxOpen = open;
        return t + dur;
      },
      /** outcome(tl, t, key): opens that choice's outcome under the choices (closes the previous) */
      outcome(tl, t, key, dur) {
        dur = dur || 0.6;
        if (this.open === key) return t;
        if (this.open) {
          const p = outcomes[this.open];
          ft(tl, p.fold, { gridTemplateRows: '1fr' }, { gridTemplateRows: '0fr', duration: dur, ease: 'power2.inOut' }, t);
          ft(tl, p.box, { opacity: 1 }, { opacity: 0, duration: dur * 0.4, ease: 'power1.in' }, t);
        }
        if (key) {
          const o = outcomes[key];
          ft(tl, o.fold, { gridTemplateRows: '0fr' }, { gridTemplateRows: '1fr', duration: dur, ease: 'power2.inOut' }, t);
          ft(tl, o.box, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: dur * 0.8, ease: 'power3.out' }, t + dur * 0.35);
        }
        this.open = key;
        return t + dur;
      },
      /** change: the protection is restored, the state comes back inside, DKK 0 */
      resolveChange(tl, t) {
        const o = outcomes.change;
        ft(tl, o.st, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }, t);
        ft(tl, o.val, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, t + 0.25);
        c.ev('outcome-change', t, 0.75, {});
        return t + 0.75;
      },
      /** retain: the acknowledgement is ticked, the owner and the record appear */
      resolveRetain(tl, t) {
        const o = outcomes.retain;
        cut(tl, o.ack, { borderStyle: 'dashed' }, { borderStyle: 'solid' }, t);
        ft(tl, o.ack, { borderColor: C.ink4, color: C.ink2 }, { borderColor: C.ink3, color: C.ink, duration: 0.3 }, t);
        ft(tl, o.bx, { backgroundColor: 'rgba(17,17,17,0)', borderColor: C.ink3 }, { backgroundColor: C.ink, borderColor: C.ink, duration: 0.25, ease: 'power2.out' }, t);
        ft(tl, o.bs, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'expo.out' }, t + 0.08);
        ft(tl, o.by, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, t + 0.35);
        ft(tl, o.own, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, t + 0.65);
        c.ev('outcome-retain', t, 1.1, {});
        return t + 1.1;
      },
    };
    return S;
  }

  /** the transfer outcome at video scale: packet, hairlines, carriers in arrival order, note */
  function transferPanel(opts) {
    opts = opt({ width: 1728, packetW: 560, gap: 170, rowH: 104, rowGap: 12 }, opts);
    const c = ctx(opts, 'transfer');
    const root = h('div', 'pui fui fui-transfer');
    root.style.width = opts.width + 'px';
    const head = h('div', 'fui-tr-head', root);
    h('span', 'fui-tr-title', head, 'Transfer risk');
    h('span', 'fui-future', head, 'Future state');
    h('span', 'fui-tr-sub', head, 'Selected carriers see the trusted observed state and answer on their own terms.');
    const body = h('div', 'fui-tr-body', root);
    // packet
    const pk = h('div', 'fui-packet', body);
    pk.style.width = opts.packetW + 'px';
    const ph = h('div', 'fui-pk-h', pk);
    h('span', 'fui-pk-t', ph, 'Trusted observed state');
    h('span', 'fui-pk-id', ph, 'PKT-0412');
    const pul = h('ul', 'fui-pk-list', pk);
    const pkRows = DATA.packet.map(([k, v, u]) => { const li = h('li', '', pul); h('span', '', li, k); h('b', u ? 'u' : '', li, v); return li; });
    const pf = h('div', 'fui-pk-f', pk);
    h('span', '', pf, 'Observed state · sealed');
    h('span', 'fui-hash', pf, 'f230 b4aa');
    // carriers
    const cx = opts.packetW + opts.gap;
    const cw = opts.width - cx;
    const list = h('div', 'fui-carriers', body);
    list.style.left = cx + 'px'; list.style.width = cw + 'px';
    h('div', 'fui-car-h', list, 'Responses · in order of arrival');
    const order = opts.order || DATA.carrierOrder;
    const carriers = order.map(k => DATA.carriers.find(x => x.key === k)).filter(Boolean);
    const rows = carriers.map((d, i) => {
      const r = h('div', 'fui-car' + (d.declined ? ' declined' : ''), list);
      r.style.marginBottom = opts.rowGap + 'px';
      r.style.height = opts.rowH + 'px';
      const l = h('div', 'fui-car-l', r);
      h('div', 'nm', l, d.name);
      h('div', 'kd', l, d.kind);
      const st = Swap(r, { waiting: 'Waiting', evaluating: 'Evaluating', done: d.declined ? 'Declined' : d.stat }, 'waiting', { cls: 'fui-car-st', dy: 4 });
      const res = h('div', 'fui-car-res', r);
      if (d.declined) {
        const dd = h('div', 'fui-car-dec', res);
        h('b', '', dd, d.dec);
        h('span', '', dd, d.decS);
      } else {
        const fx = h('div', 'fui-car-facts', res);
        [['Duration', 'Until 18:00'], ['Deductible', d.ded], ['Capacity', d.cap]].forEach(([k, v]) => { const f = h('div', '', fx); h('em', '', f, k); h('b', '', f, v); });
        const pr = h('div', 'fui-car-price', res);
        h('span', '', pr, 'DKK');
        h('b', '', pr, d.price);
      }
      const wait = h('i', 'fui-car-wait', r);
      h('i', '', wait);
      res.style.opacity = 0; wait.style.opacity = 0;
      return { d, r, st, res, wait };
    });
    const note = h('div', 'fui-tr-note', list, DATA.carrierNote);
    note.style.opacity = 0;
    // hairlines (fixed layout, no measurement)
    const headH = 44, listTop = 56;
    const bodyH = listTop + rows.length * (opts.rowH + opts.rowGap);
    body.style.height = (bodyH + 70) + 'px';
    const svgL = sv('svg', { class: 'fui-tr-lines', width: opts.width, height: bodyH, viewBox: `0 0 ${opts.width} ${bodyH}` }, body);
    const pkH = 118 + DATA.packet.length * 40;
    pk.style.height = pkH + 'px';
    pk.style.top = listTop + 'px';
    const pOut = [opts.packetW, listTop + Math.min(pkH, bodyH) / 2];
    const lines = rows.map((r, i) => {
      const y = listTop + i * (opts.rowH + opts.rowGap) + opts.rowH / 2;
      const x0 = pOut[0], x1 = cx;
      const d = `M${x0} ${f3(pOut[1])}C${f3(x0 + (x1 - x0) * 0.55)} ${f3(pOut[1])} ${f3(x0 + (x1 - x0) * 0.45)} ${f3(y)} ${x1} ${f3(y)}`;
      const p = sv('path', { class: 'fui-tr-line', d }, svgL);
      p.style.opacity = 0;
      const tok = sv('rect', { class: 'fui-tr-tok', x: f3(pOut[0] - 5), y: f3(pOut[1] - 5), width: 10, height: 10, rx: 1.5 }, svgL);
      tok.style.opacity = 0;
      // cubic bezier sampled by arc length, so the token matches DrawSVG's tip
      const B = [[x0, pOut[1]], [x0 + (x1 - x0) * 0.55, pOut[1]], [x0 + (x1 - x0) * 0.45, y], [x1, y]];
      const bz = u => { const m = 1 - u; return [0, 1].map(j => m * m * m * B[0][j] + 3 * m * m * u * B[1][j] + 3 * m * u * u * B[2][j] + u * u * u * B[3][j]); };
      const samp = [], NS2 = 240; let acc = 0, pr = bz(0); samp.push([0, pr]);
      for (let k = 1; k <= NS2; k++) { const q = bz(k / NS2); acc += Math.hypot(q[0] - pr[0], q[1] - pr[1]); samp.push([acc, q]); pr = q; }
      const at = f => { const target = f * acc; let lo = 0, hi = samp.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (samp[mid][0] < target) lo = mid; else hi = mid; } const a = samp[lo], b = samp[hi]; const w = (target - a[0]) / Math.max(1e-9, b[0] - a[0]); return lerp2(a[1], b[1], clamp(w, 0, 1)); };
      return { p, tok, d, end: [x1, y], at };
    });
    root.id = c.id();
    idAll(root, c.base);
    mountTo(root, opts);
    return {
      el: root, packet: pk, rows, lines, note, ctx: c,
      enter(tl, t, dur) {
        dur = dur || 0.9;
        ft(tl, head, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: dur * 0.6, ease: 'power3.out' }, t);
        ft(tl, pk, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: dur * 0.7, ease: 'power3.out' }, t + dur * 0.15);
        pkRows.forEach((li, i) => ft(tl, li, { opacity: 0 }, { opacity: 1, duration: 0.25 }, t + dur * 0.3 + i * 0.06));
        ft(tl, list, { opacity: 0 }, { opacity: 1, duration: dur * 0.6, ease: 'power2.out' }, t + dur * 0.4);
        c.ev('packet-seal', t + dur * 0.3 + pkRows.length * 0.06, 0.3, { id: 'PKT-0412' });
        return t + dur * 0.3 + pkRows.length * 0.06 + 0.3;
      },
      hideForEnter() { gsap.set([head, pk, list, ...pkRows], { opacity: 0 }); return this; },
      /** the packet goes to each selected carrier along its hairline */
      send(tl, t, stagger, dur) {
        stagger = stagger == null ? 0.12 : stagger; dur = dur || 0.8;
        lines.forEach((L, i) => {
          const ti = t + i * stagger;
          cut(tl, L.p, { opacity: 0 }, { opacity: 1 }, ti);
          drawFrom(tl, L.p, ti, dur, 'power2.inOut');
          // the token rides the drawn tip: arc-length keyframes, one per frame
          cut(tl, L.tok, { opacity: 0 }, { opacity: 1 }, ti);
          const e2 = easeFn('inOutQuad'), Nk = Math.max(6, Math.round(dur * FPS));
          let q0 = L.at(0);
          for (let k = 1; k <= Nk; k++) {
            const q1 = L.at(e2(k / Nk));
            ft(tl, L.tok, { attr: { x: f3(q0[0] - 5), y: f3(q0[1] - 5) } }, { attr: { x: f3(q1[0] - 5), y: f3(q1[1] - 5) }, duration: dur / Nk, ease: 'none' }, ti + (k - 1) * dur / Nk);
            q0 = q1;
          }
          ft(tl, L.tok, { opacity: 1 }, { opacity: 0, duration: 0.2 }, ti + dur);
          rows[i].st.to(tl, ti + dur * 0.9, 'evaluating', 0.25);
          ft(tl, rows[i].wait, { opacity: 0 }, { opacity: 1, duration: 0.2 }, ti + dur * 0.9);
          c.ev('send', ti, dur, { carrier: rows[i].d.key });
        });
        return t + (lines.length - 1) * stagger + dur;
      },
      /** respond(tl, times): each carrier answers at its own time, shown in arrival order */
      respond(tl, times) {
        rows.forEach((r, i) => {
          const ti = times[i];
          const tw = ti - 0.9;
          ft(tl, r.wait.firstChild, { xPercent: -100 }, { xPercent: 330, duration: 0.9, ease: 'power1.inOut' }, tw);
          ft(tl, r.wait, { opacity: 1 }, { opacity: 0, duration: 0.2 }, ti);
          r.st.to(tl, ti, 'done', 0.3);
          ft(tl, r.res, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, ti + 0.05);
          c.ev('response', ti, 0.5, { carrier: r.d.key, kind: r.d.declined ? 'declined' : 'quote', order: i + 1 });
        });
        const tn = times[times.length - 1] + 0.6;
        ft(tl, note, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, tn);
        return tn + 0.5;
      },
    };
  }

  // ================================================================== 8. programme layer
  function programmeLayer(opts) {
    opts = opt({ width: 1728, from: '14:42', to: '18:00', axis: [0, 24], today: 'Today' }, opts);
    const c = ctx(opts, 'programme');
    // compact (140 px): label row, the day's slice of the annual programme as a ruled bar (hour marks
    // set inside it), the temporary layer as a hatched slice alongside it, its label on a short lead
    const Wd = opts.width, Hd = 140;
    const root = h('div', 'fui fui-programme');
    root.style.width = Wd + 'px'; root.style.height = Hd + 'px';
    const s = sv('svg', { width: Wd, height: Hd, viewBox: `0 0 ${Wd} ${Hd}` }, root);
    const pid = c.id('hatch');
    const pat = sv('pattern', { id: pid, width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, sv('defs', {}, s));
    sv('rect', { width: 7, height: 7, fill: C.signalSoft }, pat);
    sv('line', { x1: 0, y1: 0, x2: 0, y2: 7, stroke: C.signal, 'stroke-width': 1.6, 'stroke-opacity': 0.8 }, pat);
    const IN = 64;
    const X = hr => IN + (Wd - 2 * IN) * (hr - opts.axis[0]) / (opts.axis[1] - opts.axis[0]);
    const hrOf = str => { const [a, b] = str.split(':').map(Number); return a + b / 60; };
    const barY = 38, barH = 38, sliceY = barY + barH + 6, sliceH = 14;
    const lab = sv('text', { class: 'fui-pg-lab', x: IN, y: 22 }, s); lab.textContent = 'ANNUAL PROGRAMME · PROPERTY + BI';
    const tdy = sv('text', { class: 'fui-pg-today', x: Wd - IN, y: 22, 'text-anchor': 'end' }, s); tdy.textContent = String(opts.today || '').toUpperCase();
    const bar = sv('rect', { class: 'fui-pg-bar', x: IN, y: barY, width: Wd - 2 * IN, height: barH }, s);
    const ends = sv('path', { class: 'fui-pg-ends', d: `M0 ${barY}H${IN}M0 ${barY + barH}H${IN}M${Wd - IN} ${barY}H${Wd}M${Wd - IN} ${barY + barH}H${Wd}` }, s);
    const x0 = X(hrOf(opts.from)), x1 = X(hrOf(opts.to));
    const slice = sv('rect', { class: 'fui-pg-slice', x: f3(x0), y: sliceY, width: f3(x1 - x0), height: sliceH, fill: `url(#${pid})` }, s);
    const lead = sv('path', { class: 'fui-pg-lead', d: `M${f3(x0)} ${sliceY + sliceH}V${sliceY + sliceH + 30}` }, s);
    const sl = sv('text', { class: 'fui-pg-slab', x: f3(x0 + 12), y: sliceY + sliceH + 28 }, s); sl.textContent = `TEMPORARY LAYER · ROOF 03 HOT WORK · ${opts.from}–${opts.to}`;
    const axis = sv('g', { class: 'fui-pg-axis' }, s);
    for (let hr = opts.axis[0] + 6; hr < opts.axis[1]; hr += 6) {
      const x = X(hr);
      sv('line', { x1: f3(x), y1: barY + 1, x2: f3(x), y2: barY + barH - 1 }, axis);
      const tt = sv('text', { x: f3(x + 10), y: barY + 25 }, axis);
      tt.textContent = String(hr).padStart(2, '0') + ':00';
    }
    [lab, tdy, lead, sl, axis].forEach(e => { e.style.opacity = 0; });
    bar.setAttribute('transform', sc(0, 1, IN, barY));
    ends.style.opacity = 0;
    slice.setAttribute('transform', sc(0, 1, x0, sliceY));
    root.id = c.id();
    idAll(root, c.base);
    mountTo(root, opts);
    return {
      el: root, ctx: c, height: Hd,
      reveal(tl, t) {
        ft(tl, [lab, tdy], { opacity: 0 }, { opacity: 1, duration: 0.4 }, t);
        ft(tl, bar, { attr: { transform: sc(0, 1, IN, barY) } }, { attr: { transform: sc(1, 1, IN, barY) }, duration: 0.9, ease: 'power3.inOut' }, t + 0.1);
        ft(tl, [ends, axis], { opacity: 0 }, { opacity: 1, duration: 0.5 }, t + 0.95);
        ft(tl, slice, { attr: { transform: sc(0, 1, x0, sliceY) } }, { attr: { transform: sc(1, 1, x0, sliceY) }, duration: 0.7, ease: 'expo.out' }, t + 1.2);
        ft(tl, lead, { opacity: 0 }, { opacity: 1, duration: 0.3 }, t + 1.5);
        ft(tl, sl, { opacity: 0, attr: { transform: 'translate(-8 0)' } }, { opacity: 1, attr: { transform: 'translate(0 0)' }, duration: 0.5, ease: 'power3.out' }, t + 1.55);
        c.ev('programme-bar', t + 0.1, 0.9, {});
        c.ev('layer', t + 1.2, 0.7, { from: opts.from, to: opts.to });
        return t + 2.05;
      },
    };
  }

  // ================================================================== 9. system view (whole site product composition)
  function systemView(opts) {
    // counts at the start of the pull back: the hero's change is decided and back inside (1 decision)
    opts = opt({ railW: 600, headerScale: 1.6, railScale: 1.6, status: 'inside', time: '15:02', counts: [190, 190, 1], chip: 'End-state concept', labels: 1.8 }, opts);
    const c = ctx(opts, 'system');
    const root = h('div', 'fui fui-system');
    root.id = c.id();
    const svg = sv('svg', { class: 'fui-sys-site' }, root);
    const site = opts.site || window.SiteKit.mount(svg, { prefix: c.base + '-site', show: 'precise', rough: false });
    svg.classList.add('fui-labels');
    svg.style.setProperty('--fui-lab', opts.labels);
    const hdr = header({ prefix: opts.prefix, scene: opts.scene, eventOffset: opts.eventOffset, scale: opts.headerScale, status: opts.status, statuses: opts.statuses, time: opts.time, seconds: opts.seconds, clock: opts.clock, chip: opts.chip, parent: root });
    hdr.el.classList.add('fui-sys-header');
    const headerH = Math.round(hdr.height);
    // rail
    const rail = h('aside', 'pui pui-rail fui fui-sys-rail', root);
    rail.style.setProperty('--pui-scale', opts.railScale);
    rail.style.width = opts.railW + 'px'; rail.style.top = headerH + 'px';
    const live = h('section', 'pui-r-live fui-sys-live', rail);
    const rh = h('div', 'r-head', live);
    const lab = h('span', 'lab', rh); h('i', 'live on', lab); h('span', '', lab, 'Live activity');
    h('span', 'lab', rh, 'Nordhavn · today');
    const stats = h('div', 'stats', live);
    const counters = ['Observed', 'Inside', 'Decisions'].map((k, i) => { const d = h('div', '', stats); h('em', '', d, k); const b = h('b', '', d); return counterOdo(b, opts.counts[i], Math.round(22 * opts.railScale * 1.1), 3); });
    const recWrap = h('section', 'pui-r-rec fui-sys-rec', rail);
    const record = recordColumn({ prefix: opts.prefix, scene: opts.scene, eventOffset: opts.eventOffset, parent: recWrap, scale: opts.railScale, width: opts.railW, entries: opts.entries || [], tail: true, sub: false, height: opts.recordH || 1080 - headerH - 330 });
    // camera: the envelope centred in the free region
    const eb = window.SITE_MODEL.envelope.boundsWorld, ec = window.SITE_MODEL.envelope.centreWorld;
    const fx = (W - opts.railW) / 2, fy = headerH + (H - headerH) / 2 + (opts.dy || 10);
    const s = opts.s || Math.min((W - opts.railW - 150) / eb[2], (H - headerH - 120) / eb[3]);
    const cam = { x: ec[0] - fx / s, y: ec[1] - fy / s, w: W / s, h: H / s };
    site.setView(cam);
    const ov = overlay(site, c.base);
    // activity nodes: the demo's routine and portfolio positions, then ambient spots
    const A = window.SITE_MODEL.activities;
    const pts = [];
    A.routine.forEach(a => pts.push({ id: a.id, name: a.name, world: a.world, time: a.time }));
    A.portfolio.filter(a => a.outcome === 'inside').forEach(a => pts.push({ id: a.id, name: a.name, world: a.world, time: a.t }));
    const amb = A.ambientSpots.spots;
    for (let i = 0; pts.length < (opts.nodes || 30) && i < amb.length; i += 5) pts.push({ id: 'amb-' + i, world: amb[i].world });
    const nodes = pts.map((p, i) => nodeGlyph(ov, p.world, 'checking', { prefix: opts.prefix, scene: opts.scene, eventOffset: opts.eventOffset, name: 's' + i, visible: false, events: false }));
    const decisions = {
      changed: A.portfolio.find(a => a.id === 'd-01'),
      retained: A.portfolio.find(a => a.id === 'd-03'),
    };
    const decNodes = {};
    for (const k in decisions) decNodes[k] = nodeGlyph(ov, decisions[k].world, 'checking', { prefix: opts.prefix, scene: opts.scene, eventOffset: opts.eventOffset, name: 'dec-' + k, visible: false, k: 1.2 });
    idAll(root, c.base);
    mountTo(root, opts);
    // Counters: one schedule of steps for all three (arrivals, passes, decisions), rebuilt on its own
    // sub-timeline whenever scatter() or decide() adds steps, so they can be called in any order and
    // overlapping windows never fight over the same digit strip.
    const steps = [];            // { k: counter index, t, dur, ease }
    let sub = null, subOwner = null;
    const rebuild = tl => {
      if (!sub) { sub = gsap.timeline(); tl.add(sub, 0); subOwner = tl; }
      else if (subOwner !== tl) throw new Error('UIKit.systemView: scatter() and decide() must use the same timeline');
      sub.clear();
      counters.forEach((od, k) => {
        const mine = steps.filter(x => x.k === k);
        od.reset();
        if (!mine.length) return;
        const base = od.v;
        const t0 = Math.min(...mine.map(x => x.t)), t1 = Math.max(...mine.map(x => x.t + x.dur));
        od.track(sub, t0, t1, tt => { let v = base; for (const x of mine) v += easeFn(x.ease)(clamp((tt - x.t) / x.dur, 0, 1)); return v; });
      });
    };
    const V = {
      el: root, site, header: hdr, rail, counters, record, nodes, decNodes, camera: cam, overlay: ov, ctx: c, steps,
      /** scatter(tl, t0, dur): ~30 activities arrive, are checked and pass quietly inside */
      scatter(tl, t0, dur, o) {
        o = opt({ check: 0.7, quietAfter: 2.2, quiet: 0.55 }, o);
        const r = rng(c.base + 'scatter');
        const order = nodes.map((n, i) => ({ n, i, k: r() })).sort((a, b) => a.k - b.k);
        const arrivals = [], passes = [];
        order.forEach((x, j) => {
          const ti = t0 + dur * (j + 0.2 + 0.6 * r()) / order.length;
          const n = x.n;
          n.show(tl, ti, true, 0.2);
          n.pulse(tl, ti, 1.4);
          n.spin(tl, ti, ti + o.check);
          n.state(tl, ti + o.check, 'inside', 0.25);
          n.quiet(tl, ti + o.check + o.quietAfter, o.quiet, 1.2);
          arrivals.push(ti); passes.push(ti + o.check);
          if (j % 3 === 0) c.ev('node-pass', ti + o.check, 0.2, { i: x.i });
        });
        arrivals.forEach(a => steps.push({ k: 0, t: a, dur: 0.16, ease: 'smooth' }));
        passes.forEach(a => steps.push({ k: 1, t: a, dur: 0.16, ease: 'smooth' }));
        rebuild(tl);
        return t0 + dur + o.check + 0.4;
      },
      /** decide(tl, t, 'changed' | 'retained'): a node turns cobalt (outside), then resolves */
      decide(tl, t, outcome, o) {
        o = opt({ hold: 1.0, record: true, plate: true }, o);
        const n = decNodes[outcome], d = decisions[outcome];
        n.show(tl, t, true, 0.2);
        n.pulse(tl, t, 1.2);
        n.spin(tl, t, t + 0.5);
        n.state(tl, t + 0.5, 'outside', 0.35);
        n.state(tl, t + 0.5 + o.hold, outcome, 0.35);
        const tr = t + 0.5 + o.hold;
        // observed on arrival; DECISIONS on the resolve; a changed activity is back inside, a retained one is not
        steps.push({ k: 0, t, dur: 0.16, ease: 'smooth' }, { k: 2, t: tr, dur: 0.3, ease: 'outCubic' });
        if (outcome === 'changed') steps.push({ k: 1, t: tr, dur: 0.3, ease: 'outCubic' });
        rebuild(tl);
        if (o.plate) plate(ov, d.world, outcome === 'changed' ? ['DECISION MADE · CHANGED', d.name.toUpperCase(), (d.note || '').toUpperCase()] : ['RISK RETAINED · NORDHAVN', d.name.toUpperCase(), (d.note || '').toUpperCase()], { prefix: opts.prefix, side: o.side || 'right', dy: o.dy || 0, gap: o.gap }).reveal(tl, tr + 0.1);
        if (o.record) record.append(tl, tr + 0.2, outcome === 'changed' ? 'craneLift' : 'gasBypass');
        c.ev('decision-flip', t + 0.5, 0.35, { outcome });
        c.ev('decision-resolve', tr, 0.35, { outcome });
        return tr + 0.8;
      },
    };
    return V;
  }
  /** a node plate (demo .nlab) in the site's screen-constant px space, with a hairline leader */
  function plate(svgParent, world, lines, opts) {
    opts = opt({ side: 'right', size: 18, gap: 26, dy: 0 }, opts);
    const c = ctx(opts, 'plate');
    const g = sv('g', { class: 'fui-plate', transform: `translate(${f3(world[0])} ${f3(world[1])})` }, svgParent);
    const px = sv('g', { class: 'fui-px1' }, g);
    const cw = opts.size * 0.7;
    const wMax = Math.max(...lines.map(l => l.length)) * cw + 26;
    const hh = lines.length * (opts.size * 1.4) + 18;
    const right = opts.side === 'right';
    const x0 = right ? opts.gap : -opts.gap - wMax, y0 = -hh / 2 + opts.dy;
    const ax = right ? x0 : x0 + wMax, ay = clamp(0, y0 + 10, y0 + hh - 10);
    sv('path', { class: 'fui-plate-lead', d: `M${right ? 9 : -9} 0L${f3(ax)} ${f3(ay)}` }, px);
    sv('rect', { class: 'fui-plate-bg', x: f3(x0), y: f3(y0), width: f3(wMax), height: f3(hh), rx: 8 }, px);
    lines.forEach((l, i) => { const tt = sv('text', { class: 'fui-plate-t' + i, x: f3(x0 + 13), y: f3(y0 + 11 + opts.size * 0.95 + i * opts.size * 1.4), 'font-size': opts.size }, px); tt.textContent = l; });
    g.style.opacity = 0;
    idAll(g, c.base);
    return { el: g, reveal(tl, t) { ft(tl, g, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, t); return t + 0.45; } };
  }

  // ================================================================== 10. the chain
  function chain(opts) {
    opts = opt({ width: 1728, size: 44, bracketY: 176 }, opts);
    const c = ctx(opts, 'chain');
    const n = DATA.chain.length, fs = opts.size;
    const vis = DATA.chain.map(([w]) => w.length * fs * 0.76 - fs * 0.16);   // IBM Plex Mono: 0.6em advance + 0.16em tracking
    // each column is as wide as its word or its one-line descriptor (Plex Sans 22 px runs at most
    // 0.5 em per character on these strings, measured 0.455 to 0.493), so no descriptor wraps
    // words sit at one even rhythm (equal gaps, equal arrows); the last column is as wide as its
    // word or its descriptor, and every other descriptor must end 24 px before the next word
    const dfs = opts.descSize || 22;
    const dW = DATA.chain.map(([w, d]) => d.length * dfs * 0.5);
    const colW = DATA.chain.map((x, i) => Math.max(vis[i], dW[i]));
    let gapW = (opts.width - vis.slice(0, n - 1).reduce((a, b) => a + b, 0) - colW[n - 1]) / (n - 1);
    const fits = dW.every((w, i) => i === n - 1 || w + 24 <= vis[i] + gapW);
    const xs = []; let acc = 0;
    if (fits) vis.forEach(v => { xs.push(acc); acc += v + gapW; });
    else { gapW = (opts.width - colW.reduce((a, b) => a + b, 0)) / (n - 1); colW.forEach(v => { xs.push(acc); acc += v + gapW; }); }
    const root = h('div', 'fui fui-chain');
    root.style.width = opts.width + 'px';
    root.style.setProperty('--fui-chain-size', fs + 'px');
    const words = [], descs = [];
    DATA.chain.forEach(([w, d], i) => {
      const col = h('div', 'fui-ch-col', root);
      col.style.left = f3(xs[i]) + 'px';
      const b = h('b', 'fui-ch-w', col, w.toUpperCase());
      const sp = h('span', 'fui-ch-d', col, d);
      sp.style.width = f3(colW[i] + 4) + 'px';
      b.style.opacity = 0; sp.style.opacity = 0;
      words.push(b); descs.push(sp);
    });
    const svg = sv('svg', { class: 'fui-ch-svg', width: opts.width, height: 300, viewBox: `0 0 ${opts.width} 300` }, root);
    const ay = fs * 0.5;
    const arrows = [];
    for (let i = 0; i < n - 1; i++) {
      const x0 = xs[i] + vis[i] + 28, x1 = xs[i + 1] - 28;
      const a = sv('path', { class: 'fui-ch-ar', d: `M${f3(x0)} ${f3(ay)}H${f3(x1)}M${f3(x1 - 9)} ${f3(ay - 7)}L${f3(x1)} ${f3(ay)}L${f3(x1 - 9)} ${f3(ay + 7)}` }, svg);
      a.style.opacity = 0;
      arrows.push(a);
    }
    const by = opts.bracketY;
    const br = (x0, x1, dashed, label) => {
      const g = sv('g', { class: 'fui-ch-br' + (dashed ? ' dashed' : '') }, svg);
      let dd = `M${f3(x0)} ${by - 12}V${by}`;
      if (dashed) { for (let x = x0; x < x1 - 1; x += 12) dd += `M${f3(x)} ${by}H${f3(Math.min(x1, x + 6))}`; dd += `M${f3(x1)} ${by}V${by - 12}`; }
      else dd += `H${f3(x1)}V${by - 12}`;
      const p = sv('path', { d: dd }, g);
      const tt = sv('text', { x: f3((x0 + x1) / 2), y: by + 36, 'text-anchor': 'middle' }, g);
      tt.textContent = label;
      g.style.opacity = 0;
      return { g, p, tt };
    };
    const brToday = br(xs[0], xs[1] + colW[1], false, 'TODAY · PREVENTION AND PROOF');
    const brLater = br(xs[2], xs[4] + colW[4], true, 'OVER TIME');
    root.id = c.id();
    idAll(root, c.base);
    mountTo(root, opts);
    return {
      el: root, words, descs, arrows, xs, ctx: c,
      /** reveal(tl, t, i): word i (0 RECORD .. 4 CAPACITY) with its arrow and a confirm-N sound */
      reveal(tl, t, i) {
        if (i > 0) {
          const a = arrows[i - 1];
          cut(tl, a, { opacity: 0 }, { opacity: 1 }, t - 0.32);
          ft(tl, a, { stroke: C.signal }, { stroke: C.signal, duration: 0.001 }, t - 0.32);
          drawFrom(tl, a, t - 0.32, 0.42, 'power2.inOut');
          ft(tl, a, { stroke: C.signal }, { stroke: C.ink3, duration: 0.6, ease: 'power1.inOut' }, t + 0.35);
        }
        ft(tl, words[i], { opacity: 0, y: 14, letterSpacing: '0.3em' }, { opacity: 1, y: 0, letterSpacing: '0.16em', duration: 0.7, ease: 'expo.out' }, t);
        ft(tl, descs[i], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, t + 0.22);
        c.ev('confirm-' + (i + 1), t, 0.4, { word: DATA.chain[i][0].toUpperCase() });
        return t + 0.7;
      },
      /** bracket(tl, t, 'today' | 'overtime') */
      bracket(tl, t, which) {
        const b = which === 'today' ? brToday : brLater;
        cut(tl, b.g, { opacity: 0 }, { opacity: 1 }, t);
        drawFrom(tl, b.p, t, 0.6, 'power2.inOut');
        ft(tl, b.tt, { opacity: 0, attr: { transform: 'translate(0 6)' } }, { opacity: 1, attr: { transform: 'translate(0 0)' }, duration: 0.5, ease: 'power3.out' }, t + 0.3);
        c.ev('bracket', t, 0.6, { which });
        return t + 0.8;
      },
      lift(tl, t, dur) { dur = dur || 0.7; ft(tl, root, { opacity: 1, y: 0 }, { opacity: 0, y: -24, duration: dur, ease: 'power2.in' }, t); return t + dur; },
    };
  }

  // ================================================================== 11. end card
  function endCard(opts) {
    opts = opt({ wordmarkW: 653, wordmarkTop: 356 }, opts);
    const c = ctx(opts, 'end');
    const root = h('div', 'fui fui-end');
    // the wordmark sits in a box that clips at its baseline; it rises out of the hairline drawn there
    const boxH = +(opts.wordmarkW * 758 / 2617).toFixed(2), left = (W - opts.wordmarkW) / 2;
    const wmBox = h('div', 'fui-end-wm', root);
    place(wmBox, { left, top: opts.wordmarkTop, width: opts.wordmarkW, height: boxH });
    const wm = sv('svg', { viewBox: DATA.wordmark.viewBox, width: opts.wordmarkW, height: f3(boxH) }, wmBox);
    sv('path', { d: DATA.wordmark.d, fill: C.ink, transform: DATA.wordmark.transform }, wm);
    const rule = h('i', 'fui-end-rule', root);
    // the letters' baseline is 12 of 758 units above the box bottom (the round letters overshoot it)
    place(rule, { left: left - 24, top: opts.wordmarkTop + boxH - 12 * boxH / 758, width: opts.wordmarkW + 48 });
    const desc = h('div', 'fui-end-desc', root, opts.descriptor || DATA.end.descriptor);
    desc.style.top = f3(opts.wordmarkTop + boxH + 64) + 'px';
    const qual = h('p', 'fui-end-q', root, opts.qualifier || DATA.end.qualifier);
    gsap.set(wm, { y: boxH });
    gsap.set(rule, { scaleX: 0, transformOrigin: '50% 50%' });
    desc.style.opacity = 0; qual.style.opacity = 0;
    root.id = c.id();
    idAll(root, c.base);
    mountTo(root, opts);
    return {
      el: root, wordmark: wmBox, descriptor: desc, qualifier: qual, ctx: c,
      /** reveal(tl, t, {descriptorAt, qualifierAt}): the hairline draws, the wordmark rises out of it and latches */
      reveal(tl, t, o) {
        o = o || {};
        ft(tl, rule, { scaleX: 0, opacity: 1 }, { scaleX: 1, opacity: 1, duration: 0.45, ease: 'power3.inOut' }, t);
        ft(tl, wm, { y: boxH }, { y: 0, duration: 0.7, ease: 'expo.out' }, t + 0.32);
        const tLatch = t + 0.32 + 0.16;
        ft(tl, rule, { opacity: 1 }, { opacity: 0, duration: 0.8, ease: 'power1.inOut' }, t + 1.2);
        const td = o.descriptorAt != null ? o.descriptorAt : t + 1.0;
        ft(tl, desc, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, td);
        const tq = o.qualifierAt != null ? o.qualifierAt : td + 0.9;
        ft(tl, qual, { opacity: 0 }, { opacity: 1, duration: 1.0, ease: 'power1.inOut' }, tq);
        c.ev('latch', tLatch, 0.12, {});
        return tq + 1.0;
      },
    };
  }

  // ================================================================== statements (Frame 4.4)
  /** the last point of an SVG path (absolute or relative M L H V C S Q T A Z) */
  function pathEnd(d) {
    const ar = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };
    let x = 0, y = 0, sx = 0, sy = 0; const re = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi; let m;
    while ((m = re.exec(d))) {
      const cmd = m[1], C0 = cmd.toUpperCase(), rel = cmd !== C0, n = ar[C0];
      const v = (m[2].match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
      if (!n) { x = sx; y = sy; continue; }
      for (let i = 0; i + n <= v.length; i += n) {
        const a = v.slice(i, i + n);
        if (C0 === 'H') x = rel ? x + a[0] : a[0];
        else if (C0 === 'V') y = rel ? y + a[0] : a[0];
        else { const px = a[n - 2], py = a[n - 1]; x = rel ? x + px : px; y = rel ? y + py : py; }
        if (C0 === 'M' && i === 0) { sx = x; sy = y; }
      }
    }
    return [x, y];
  }
  function statements(opts) {
    opts = opt({ label: 'What Priora does today', items: [] }, opts);
    const c = ctx(opts, 'statements');
    const root = h('div', 'fui fui-statements');
    const lab = h('div', 'fui-st-lab', root, opts.label);
    if (opts.labelAt) place(lab, { left: opts.labelAt[0], top: opts.labelAt[1] });
    const svg = sv('svg', { class: 'fui-st-links', width: W, height: H, viewBox: `0 0 ${W} ${H}` }, root);
    const items = opts.items.map(it => {
      const el = h('div', 'fui-st', root, it.text);
      place(el, { left: it.at[0], top: it.at[1] });
      if (it.align === 'right') gsap.set(el, { xPercent: -100 });
      el.style.opacity = 0;
      let link = null, dot = null;
      if (it.link) {
        link = sv('path', { class: 'fui-st-link', d: it.link }, svg); link.style.opacity = 0;
        // a small terminal where the leader meets its evidence (the last point of the path)
        const end = pathEnd(it.link);
        if (it.dot !== false && end) { dot = sv('circle', { class: 'fui-st-dot', cx: f3(end[0]), cy: f3(end[1]), r: 3.5 }, svg); dot.style.opacity = 0; }
      }
      return { el, link, dot, it };
    });
    lab.style.opacity = 0;
    root.id = c.id();
    idAll(root, c.base);
    mountTo(root, opts);
    return {
      el: root, items, ctx: c,
      reveal(tl, t, i) {
        if (i === 0) ft(tl, lab, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, t - 0.3);
        const x = items[i];
        ft(tl, x.el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t);
        if (x.link) { cut(tl, x.link, { opacity: 0 }, { opacity: 1 }, t + 0.2); drawFrom(tl, x.link, t + 0.2, 0.7, 'power2.inOut'); }
        if (x.dot) ft(tl, x.dot, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' }, t + 0.82);
        c.ev('statement', t, 0.8, { i, text: x.it.text });
        return t + 0.9;
      },
    };
  }

  const cam = (cx, cy, s, sx, sy) => ({ x: cx - (sx == null ? W / 2 : sx) / s, y: cy - (sy == null ? H / 2 : sy) / s, w: W / s, h: H / s, s });
  /** film framings for the interface shots (world rects, 16:9, with s = px per world unit) */
  const CAMERAS = {
    roof03Product: cam(47, 30, 11),              // Roof 03 close-up (Frame 4): the node near centre, room for card left and record right
    systemRoof: cam(50, 30, 8.83133),            // Roof 03 + Zone 3 at the demo's 'somethingChanges' scale (Frame 5.1, 5.2)
    decision: cam(16.454, 46.5, 3.85, 430, 566), // whole envelope framed left of the decision sheet (Frame 5.3), its label inside the frame
    wholeSite: cam(16.454, 46.5, 6.01038),       // the demo overview, centred
  };

  window.UIKit = {
    version: '1.0.0', W, H, FPS, C, DATA, EASE, CAMERAS, cam,
    // components
    header, nodeGlyph, crossing, sprinkler, activityCard, captureStrip, conditionLabel, connect, readout,
    recordColumn, decisionSheet, transferPanel, programmeLayer, systemView, plate, chain, endCard, statements,
    // helpers
    overlay, siteLabels, glyph, Swap, Odometer, clockOdo, counterOdo, heroDeviation, stadium, envelopeFromWords, event: pushEvent,
    hashStr, mulberry32, rng, hhmm,
  };
})();
