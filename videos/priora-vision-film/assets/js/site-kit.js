/*
 * SiteKit: mounts the Nordhavn Bioprocessing site (the demo's exact geometry)
 * into an SVG, with an optional graphite twin for Act I, a screen-constant
 * camera, draw-on, and the graphite-to-precise resolve.
 *
 * Deterministic: every jitter comes from a hash of the point and a pass seed,
 * so the same call always produces the same drawing. No clocks, no randomness.
 * Requires window.SITE_SVG and window.SITE_MODEL (assets/js/site-data.js),
 * gsap and DrawSVGPlugin.
 *
 * API
 *   const site = SiteKit.mount(svgEl, { prefix, show: 'rough' | 'precise', rough: true, wobble: 2 })
 *     svgEl   an empty <svg> sized 1920x1080 by CSS (width:100%;height:100%)
 *     prefix  unique id prefix for this composition (e.g. 'a1')
 *     show    which layer is visible at mount time
 *   site.el(id)                 precise element by its original id (e.g. 'sprinkler-zone-3')
 *   site.rough                  { root, units[], byBuilding{}, labels, envelope{construct, firm, label}, heads[], zoneText[] }
 *   site.precise                the precise layer <g>
 *   site.cameras                named film cameras (world rects, 16:9)
 *   site.setView(rect)          set the camera immediately (viewBox + --sw)
 *   site.camera(tl, to, t, dur, ease)   tween the camera from the previous camera state in this timeline
 *   site.drawOn(tl, t0, opts)   draw the graphite site building by building; returns end time
 *   site.resolve(tl, t0, dur)   graphite becomes precise; returns end time
 *   site.worldToScreen([x,y], rect)     world point to 1920x1080 screen px for a camera rect
 *   SiteKit.rect(cx, cy, s)      camera rect centred on a world point at s screen px per world unit
 *   SiteKit.events              film-wide sound event list (window.__filmEvents)
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080;
  const GRAPHITE = '#3B3A36', GRAPHITE_LITE = '#8F8C86', PRECISE_EDGE = '#5E5D59', PAPER = '#F5F3EE';
  const FACE_TONE = { 'f-t': '#FBFAF6', 'f-r': '#EAE6DD', 'f-l': '#E1DCD1' };
  const BUILDINGS = ['ground-crosses', 'roads', 'loading-area', 'utilities', 'tanks', 'pipe-bridge',
    'production-hall', 'production-hall-2', 'laboratory', 'warehouse', 'loading-area-containers', 'sprinkler-zone-3'];
  const ARITY = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };

  window.__filmEvents = window.__filmEvents || [];

  // ---------- deterministic noise ----------
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pointJitter(x, y, pass, amt) {
    const r = mulberry32(hashStr(x.toFixed(2) + ',' + y.toFixed(2) + '#' + pass));
    return [(r() - 0.5) * 2 * amt, (r() - 0.5) * 2 * amt];
  }

  // ---------- path parsing (absolute commands) ----------
  function parseD(d) {
    const out = []; const re = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g; let m;
    while ((m = re.exec(d))) {
      const c = m[1].toUpperCase();
      const nums = (m[2].match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
      const n = ARITY[c];
      if (n === 0) { out.push([c, []]); continue; }
      for (let i = 0; i < nums.length; i += n) out.push([i === 0 ? c : (c === 'M' ? 'L' : c), nums.slice(i, i + n)]);
    }
    return out;
  }
  const f2 = v => (Math.round(v * 1000) / 1000).toString();
  function fmt(cmds) { return cmds.map(([c, a]) => c + a.map(f2).join(' ')).join(''); }

  // Split into subpaths and decide per subpath whether it is dense (use smooth noise).
  function subpaths(cmds) { const s = []; let cur = null; for (const c of cmds) { if (c[0] === 'M') { cur = []; s.push(cur); } if (!cur) { cur = []; s.push(cur); } cur.push(c); } return s; }

  function jitter(cmds, pass, amt) {
    const out = [];
    for (const sp of subpaths(cmds)) {
      const dense = sp.length > 12;
      let acc = 0, px = null, py = null;
      const ph = mulberry32(hashStr('sp' + pass + fmt(sp.slice(0, 1))));
      const p1 = ph() * 6.283, p2 = ph() * 6.283, p3 = ph() * 6.283;
      for (const [c, a] of sp) {
        if (c === 'Z') { out.push([c, a]); continue; }
        const b = a.slice();
        if (c === 'H' || c === 'V') { b[0] += (mulberry32(hashStr(pass + c + b[0]))() - 0.5) * 2 * amt; out.push([c, b]); continue; }
        const pairs = c === 'A' ? [5] : c === 'C' ? [0, 2, 4] : (c === 'S' || c === 'Q') ? [0, 2] : [0];
        for (const ix of pairs) {
          const iy = ix + 1;
          const x = b[ix], y = b[iy];
          if (dense) {
            if (px !== null) acc += Math.hypot(x - px, y - py);
            px = x; py = y;
            const n1 = Math.sin(acc * 0.16 + p1) + 0.55 * Math.sin(acc * 0.47 + p2);
            const n2 = Math.sin(acc * 0.13 + p3) + 0.55 * Math.sin(acc * 0.41 + p1);
            b[ix] = x + n1 / 1.55 * amt; b[iy] = y + n2 / 1.55 * amt;
          } else {
            const [jx, jy] = pointJitter(x, y, pass, amt);
            b[ix] = x + jx; b[iy] = y + jy;
          }
        }
        out.push([c, b]);
      }
    }
    return out;
  }

  function straightSegments(cmds) {
    const segs = []; let cur = null, start = null;
    for (const [c, a] of cmds) {
      if (c === 'M') { cur = [a[0], a[1]]; start = cur; }
      else if (c === 'L') { segs.push([cur, [a[0], a[1]]]); cur = [a[0], a[1]]; }
      else if (c === 'Z') { if (cur && start && (cur[0] !== start[0] || cur[1] !== start[1])) segs.push([cur, start]); cur = start; }
      else if (c === 'A') { cur = [a[5], a[6]]; }
      else if (c === 'H') { cur = [a[0], cur[1]]; } else if (c === 'V') { cur = [cur[0], a[0]]; }
    }
    return segs;
  }
  function bboxOf(cmds) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [c, a] of cmds) { if (c === 'Z') continue; const px = c === 'A' ? a[5] : a[0], py = c === 'A' ? a[6] : a[1]; if (c === 'A') { const r = Math.max(a[0], a[1]); x0 = Math.min(x0, px - r); x1 = Math.max(x1, px + r); y0 = Math.min(y0, py - r); y1 = Math.max(y1, py + r); } x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
    return [x0, y0, x1, y1];
  }

  function mk(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  // ---------- cameras ----------
  function rect(cx, cy, s) { const w = W / s, h = H / s; return { x: cx - w / 2, y: cy - h / 2, w, h }; }
  const CAMERAS = {
    // Act I (graphite)
    roofEdgeMacro: rect(21.5, 11.0, 30),
    siteOverview: rect(16.5, 44.5, 7.1),
    siteLeft: (() => { const s = 5.4; return { x: 16.5 - 600 / s, y: 44.5 - 560 / s, w: W / s, h: H / s }; })(),
    siteWide: rect(14, 42, 5.5),
    roof03: rect(39.5, 31.5, 16),
    landing: rect(43.5, 33.5, 14.5),
    sz3: rect(56, 37, 12),
    roof03AndSz3: rect(50, 33, 10.5),
    afterwardsWide: rect(30, 40, 7.4),
    // Acts II and III (precise) — refined by the interface kit
    roof03Product: rect(47, 30, 11),
    systemRoof: rect(50, 30, 8.83133),
    wholeSite: rect(16.5, 44.5, 6.01038),
  };

  // ---------- mount ----------
  function mount(svg, opts) {
    opts = Object.assign({ prefix: 'site', show: 'precise', rough: true, wobble: 2 }, opts || {});
    const P = opts.prefix + '-';
    svg.setAttribute('class', ((svg.getAttribute('class') || '') + ' priora-site sk-svg').trim());
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.style.overflow = 'hidden';

    const doc = new DOMParser().parseFromString(window.SITE_SVG, 'image/svg+xml');
    const src = doc.documentElement;
    // prefix ids and internal references
    src.querySelectorAll('[id]').forEach(e => e.setAttribute('id', P + e.getAttribute('id')));
    src.querySelectorAll('*').forEach(e => {
      for (const at of ['href', 'xlink:href', 'clip-path', 'fill', 'mask', 'filter']) {
        const v = e.getAttribute(at); if (!v) continue;
        if (v.startsWith('#')) e.setAttribute(at, '#' + P + v.slice(1));
        else if (v.includes('url(#')) e.setAttribute(at, v.replace(/url\(#/g, 'url(#' + P));
      }
    });
    const styleEl = src.querySelector('style');
    if (styleEl) styleEl.textContent = styleEl.textContent.replace(/url\(#/g, 'url(#' + P);

    const defs = mk('defs', {}, svg);
    src.querySelectorAll('defs > *').forEach(n => defs.appendChild(document.importNode(n, true)));
    // film additions to the style: rough layer rules
    const extra = mk('style', {}, defs);
    extra.textContent = `
.sk-svg{--skw:1;--skc:${GRAPHITE}}
.sk-svg .sk-rough path{fill:none;stroke-linecap:round;stroke-linejoin:round}
.sk-svg .sk-rough .sk-main{stroke:var(--skc);stroke-width:calc(var(--sw)*1.5px*var(--skw))}
.sk-svg .sk-rough .sk-main.lite{stroke:${GRAPHITE_LITE};stroke-width:calc(var(--sw)*1px*var(--skw))}
.sk-svg .sk-rough .sk-over{stroke:var(--skc);stroke-opacity:.32;stroke-width:calc(var(--sw)*1.1px)}
.sk-svg .sk-rough .sk-ext{stroke:var(--skc);stroke-opacity:.28;stroke-width:calc(var(--sw)*.9px)}
.sk-svg .sk-rough .sk-hatch{stroke:var(--skc);stroke-opacity:.34;stroke-width:calc(var(--sw)*.7px)}
.sk-svg .sk-rough .sk-hatch.sparse{stroke-opacity:.2}
.sk-svg .sk-rough path.sk-occ{fill:${PAPER};stroke:none}
.sk-svg .sk-rough .sk-env-construct{stroke:var(--skc);stroke-opacity:.35;stroke-width:calc(var(--sw)*.9px)}
.sk-svg .sk-rough .sk-env-firm{stroke:var(--skc);stroke-width:calc(var(--sw)*1.4px)}
.sk-svg .sk-rough .sk-head{fill:var(--skc)}
.sk-svg .sk-rough text{fill:var(--skc);font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:400;letter-spacing:.12em}
.sk-svg .sk-rough .sk-lab line{stroke:var(--skc);stroke-opacity:.6;stroke-width:1}
`;
    // tremor filter (applied in screen space via CSS filter on the svg)
    const filt = mk('filter', { id: P + 'sk-wobble', x: '-2%', y: '-2%', width: '104%', height: '104%', 'color-interpolation-filters': 'sRGB' }, defs);
    mk('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.018', numOctaves: '2', seed: '3', result: 'n' }, filt);
    const disp = mk('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: String(opts.wobble), xChannelSelector: 'R', yChannelSelector: 'G' }, filt);

    // precise layer: everything except defs, title, desc, anchors
    const precise = mk('g', { class: 'sk-precise' }, svg);
    for (const n of Array.from(src.childNodes)) {
      if (n.nodeType !== 1) continue;
      const tag = n.localName;
      if (tag === 'defs' || tag === 'title' || tag === 'desc') continue;
      if (n.getAttribute('id') === P + 'anchors') continue;
      precise.appendChild(document.importNode(n, true));
    }
    const el = id => svg.querySelector('#' + CSS.escape(P + id));

    // rough layer
    const rough = { root: null, units: [], byBuilding: {}, labels: null, envelope: {}, heads: [], zoneText: [] };
    if (opts.rough) {
      const R = mk('g', { class: 'sk-rough' }, svg);
      rough.root = R;
      const world = el('world');
      const bOf = e => { let n = e; while (n && n.parentNode !== world) n = n.parentNode; return n ? n.getAttribute('id').slice(P.length) : 'world'; };
      const bGroups = {};
      const groupFor = b => bGroups[b] || (bGroups[b] = mk('g', { class: 'sk-b', 'data-b': b }, R));
      let clipN = 0;
      world.querySelectorAll('path, ellipse, text').forEach(e => {
        const cls = e.getAttribute('class') || '';
        const b = bOf(e);
        const g = groupFor(b);
        const id = (e.getAttribute('id') || '').slice(P.length);
        if (e.localName === 'ellipse') {
          if (!/\bhd\b/.test(cls)) return;
          const h = mk('ellipse', { class: 'sk-head', cx: e.getAttribute('cx'), cy: e.getAttribute('cy'), rx: .34, ry: .21, 'data-i': e.getAttribute('data-i') || '' }, g);
          rough.heads.push(h); return;
        }
        if (e.localName === 'text') {
          const t = mk('text', { transform: e.getAttribute('transform') || '', x: e.getAttribute('x'), y: e.getAttribute('y'), 'font-size': e.getAttribute('font-size') || '2.6' }, g);
          t.textContent = e.textContent; rough.zoneText.push(t); return;
        }
        if (/\b(zx|hx|zf|ground|zone-area)\b/.test(cls)) return;
        const d = e.getAttribute('d'); if (!d) return;
        const cmds = parseD(d);
        const isFace = /\bf\b/.test(cls);
        const lite = /\b(det|grid|faint|dash|zo)\b/.test(cls);
        const unit = { id, building: b, cls, preciseD: d, face: isFace ? (cls.match(/f-[tlr]/) || [''])[0] : null };
        const mainC = jitter(cmds, 'm' + id, isFace || /\be\b/.test(cls) ? .16 : .12);
        unit.roughD = fmt(mainC);
        if (isFace) {
          unit.occ = mk('path', { class: 'sk-occ', d: unit.roughD }, g);
          if (unit.face === 'f-l' || unit.face === 'f-r') {
            const cid = P + 'skc' + (clipN++);
            const cp = mk('clipPath', { id: cid }, defs); mk('path', { d: unit.roughD }, cp);
            const [x0, y0, x1, y1] = bboxOf(cmds);
            const sp = unit.face === 'f-l' ? .72 : 1.55, hgt = y1 - y0;
            let hd = ''; const hr = mulberry32(hashStr('h' + id));
            for (let x = x0 - hgt; x < x1; x += sp) { const j = (hr() - .5) * .16; hd += `M${f2(x + j)} ${f2(y1 + .2)}L${f2(x + hgt + .2 + j)} ${f2(y0 - .2)}`; }
            unit.hatch = mk('path', { class: 'sk-hatch' + (unit.face === 'f-r' ? ' sparse' : ''), 'clip-path': `url(#${cid})`, d: hd }, g);
          }
        }
        unit.main = mk('path', { class: 'sk-main' + (lite ? ' lite' : ''), d: unit.roughD, 'data-src': id }, g);
        if (!lite) unit.over = mk('path', { class: 'sk-over', d: fmt(jitter(cmds, 'o' + id, .22)) }, g);
        if (isFace) {
          let ed = ''; const er = mulberry32(hashStr('e' + id));
          for (const [p0, p1] of straightSegments(cmds)) {
            const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy); if (L < 3) continue;
            const ux = dx / L, uy = dy / L, e0 = .5 + er() * .9, e1 = .5 + er() * .9;
            ed += `M${f2(p0[0] - ux * e0)} ${f2(p0[1] - uy * e0)}L${f2(p0[0])} ${f2(p0[1])}M${f2(p1[0])} ${f2(p1[1])}L${f2(p1[0] + ux * e1)} ${f2(p1[1] + uy * e1)}`;
          }
          if (ed) unit.ext = mk('path', { class: 'sk-ext', d: ed }, g);
        }
        rough.units.push(unit);
        (rough.byBuilding[b] = rough.byBuilding[b] || []).push(unit);
      });
      // envelope, drawn by hand in two passes
      const envD = el('envelope-outline') && el('envelope-outline').getAttribute('d');
      if (envD) {
        const ec = parseD(envD);
        rough.envelope.construct = mk('path', { class: 'sk-env-construct', d: fmt(jitter(ec, 'envc', .55)) }, R);
        rough.envelope.firm = mk('path', { class: 'sk-env-firm', d: fmt(jitter(ec, 'envf', .22)) }, R);
        rough.envelope.preciseD = envD;
        const lp = el('envelope-label-path');
        if (lp) {
          const t = mk('text', { class: 'sk-env-label', 'font-size': '2.2' }, R);
          const tp = mk('textPath', { href: '#' + P + 'envelope-label-path', startOffset: '4%' }, t);
          tp.textContent = 'ACCEPTED CONDITIONS · PROPERTY + BI PROGRAMME';
          rough.envelope.label = t;
        }
      }
      // labels: graphite twins of the zone labels, slightly irregular
      const labs = mk('g', { class: 'sk-labels' }, R);
      ['zone-labels', 'sz3-label'].forEach(gid => {
        const s = el(gid); if (!s) return;
        const c = s.cloneNode(true); c.removeAttribute('id');
        c.querySelectorAll('[id]').forEach(n => n.setAttribute('id', n.getAttribute('id') + '-r'));
        c.querySelectorAll('.zl, .szl').forEach(n => n.classList.add('sk-lab'));
        if (c.classList) c.classList.add('sk-lab');
        c.querySelectorAll('text').forEach((t, i) => {
          const r = mulberry32(hashStr('lab' + gid + i));
          const a = (r() - .5) * 1.4;
          t.setAttribute('transform', `rotate(${a.toFixed(2)} ${t.getAttribute('x') || 0} ${t.getAttribute('y') || 0})`);
        });
        labs.appendChild(c);
      });
      rough.labels = labs;
    }

    const handle = {
      svg, prefix: opts.prefix, el, precise, rough, cameras: CAMERAS, disp,
      view: { ...CAMERAS.siteOverview },
      setView(r) { this.view = { ...r }; applyView(svg, r); },
      worldToScreen(p, r) { r = r || this.view; return [(p[0] - r.x) * W / r.w, (p[1] - r.y) * H / r.h]; },
    };
    // Camera moves tween the viewBox attribute and --sw directly. Never drive
    // visual state from onUpdate: HyperFrames seeks with callbacks suppressed.
    handle.camera = function (tl, to, t, dur, ease, from) {
      const f = { ...(from || handle._lastCam || handle.view) };
      tl.fromTo(svg,
        { attr: { viewBox: vb(f) }, '--sw': +(f.w / W).toFixed(6) },
        { attr: { viewBox: vb(to) }, '--sw': +(to.w / W).toFixed(6), duration: dur, ease: ease || 'power2.inOut', immediateRender: false }, t);
      handle._lastCam = { ...to };
      return t + dur;
    };
    handle.drawOn = function (tl, t0, o) { return drawOn(handle, tl, t0, o || {}); };
    handle.resolve = function (tl, t0, dur, o) { return resolve(handle, tl, t0, dur, o || {}); };

    // initial visibility
    if (opts.show === 'rough') { precise.style.opacity = 0; svg.style.filter = `url(#${P}sk-wobble)`; }
    else if (rough.root) { rough.root.style.opacity = 0; }
    handle.setView(CAMERAS.siteOverview);
    return handle;
  }

  function vb(r) { return `${f2(r.x)} ${f2(r.y)} ${f2(r.w)} ${f2(r.h)}`; }
  function applyView(svg, r) {
    svg.setAttribute('viewBox', vb(r));
    svg.style.setProperty('--sw', (r.w / W).toFixed(6));
  }

  // ---------- draw-on (graphite) ----------
  function drawOn(h, tl, t0, o) {
    const order = o.order || BUILDINGS;
    const per = o.perBuilding || 0.8;       // seconds for one building's edges
    const gap = o.stagger || 0.28;          // start offset between buildings
    const scene = o.scene || h.prefix;
    let t = t0, end = t0;
    order.forEach((b, bi) => {
      const units = h.rough.byBuilding[b]; if (!units) return;
      const tb = t0 + bi * gap;
      units.forEach((u, ui) => {
        const tu = tb + (ui / Math.max(1, units.length)) * per * .6;
        const d = Math.max(.18, per * .5);
        if (u.occ) tl.fromTo(u.occ, { opacity: 0 }, { opacity: 1, duration: .01, immediateRender: true }, tu);
        tl.fromTo(u.main, { drawSVG: '0%' }, { drawSVG: '100%', duration: d, ease: 'power1.inOut', immediateRender: true }, tu);
        if (u.over) tl.fromTo(u.over, { drawSVG: '0%' }, { drawSVG: '100%', duration: d * .8, ease: 'power1.inOut', immediateRender: true }, tu + d * .45);
        if (u.ext) tl.fromTo(u.ext, { drawSVG: '0%' }, { drawSVG: '100%', duration: .2, ease: 'power1.out', immediateRender: true }, tu + d * .9);
        if (u.hatch) tl.fromTo(u.hatch, { drawSVG: '0%' }, { drawSVG: '100%', duration: per * .7, ease: 'none', immediateRender: true }, tu + d);
        if (!u.cls.includes('grid') && !u.cls.includes('faint')) window.__filmEvents.push({ scene, type: /\b(det|dash|zo)\b/.test(u.cls) ? 'pencil-light' : 'pencil', t: +tu.toFixed(3), dur: +d.toFixed(3) });
        if (u.hatch) window.__filmEvents.push({ scene, type: 'hatch', t: +(tu + d).toFixed(3), dur: +(per * .7).toFixed(3) });
        end = Math.max(end, tu + d + (u.hatch ? per * .7 : 0));
      });
      (h.rough.heads || []).forEach(hd => { if (b === 'sprinkler-zone-3') tl.fromTo(hd, { opacity: 0 }, { opacity: 1, duration: .2, immediateRender: true }, tb + per * .6 + (+hd.getAttribute('data-i') || 0) * .012); });
    });
    (h.rough.zoneText || []).forEach((z, i) => tl.fromTo(z, { opacity: 0 }, { opacity: .85, duration: .3, immediateRender: true }, end - .4 + i * .05));
    if (o.labels !== false && h.rough.labels) {
      // zone labels arrive last, one by one; the sprinkler-zone label is left to the scene
      h.rough.labels.querySelectorAll('.zl').forEach((g, i) => tl.fromTo(g, { opacity: 0 }, { opacity: 1, duration: .35, immediateRender: true }, end - .3 + i * .08));
      const szl = h.rough.labels.querySelector('.szl'); if (szl) tl.set(szl, { opacity: 0 }, 0);
    }
    return end;
  }

  // ---------- resolve: graphite becomes precise ----------
  function resolve(h, tl, t0, dur, o) {
    const R = h.rough; if (!R.root) return t0;
    const order = o.order || BUILDINGS;
    const ease = o.ease || 'expo.out';
    const span = dur * .55, each = dur * .45;
    order.forEach((b, bi) => {
      const units = R.byBuilding[b]; if (!units) return;
      const tb = t0 + (bi / order.length) * span;
      units.forEach(u => {
        tl.fromTo(u.main, { attr: { d: u.roughD } }, { attr: { d: u.preciseD }, duration: each, ease, immediateRender: false }, tb);
        if (u.over) tl.fromTo(u.over, { opacity: 1 }, { opacity: 0, duration: each * .6, ease: 'power2.out', immediateRender: false }, tb);
        if (u.ext) tl.fromTo(u.ext, { drawSVG: '100%' }, { drawSVG: '50% 50%', duration: each * .7, ease: 'power3.inOut', immediateRender: false }, tb);
        if (u.hatch) tl.fromTo(u.hatch, { opacity: 1 }, { opacity: 0, duration: each * .7, ease: 'power2.out', immediateRender: false }, tb);
        if (u.occ) tl.fromTo(u.occ, { attr: { d: u.roughD }, fill: PAPER }, { attr: { d: u.preciseD }, fill: FACE_TONE[u.face] || PAPER, duration: each, ease, immediateRender: false }, tb);
      });
    });
    tl.fromTo(h.svg, { '--skw': 1, '--skc': GRAPHITE }, { '--skw': .7, '--skc': PRECISE_EDGE, duration: dur * .8, ease: 'power2.inOut', immediateRender: false }, t0);
    tl.fromTo(h.disp, { attr: { scale: +(h.disp.getAttribute('scale')) || 2 } }, { attr: { scale: 0 }, duration: dur * .6, ease: 'power2.out', immediateRender: false }, t0);
    if (R.envelope.firm) {
      tl.fromTo(R.envelope.firm, { attr: { d: R.envelope.firm.getAttribute('d') } }, { attr: { d: R.envelope.preciseD }, duration: dur * .7, ease, immediateRender: false }, t0 + dur * .1);
      tl.fromTo(R.envelope.construct, { opacity: 1 }, { opacity: 0, duration: dur * .4, immediateRender: false }, t0);
    }
    if (R.labels) tl.fromTo(R.labels, { opacity: 1 }, { opacity: 0, duration: dur * .35, immediateRender: false }, t0 + dur * .5);
    if (R.envelope.label) tl.fromTo(R.envelope.label, { opacity: 1 }, { opacity: 0, duration: dur * .35, immediateRender: false }, t0 + dur * .5);
    // hand over to the exact demo layer
    tl.fromTo(h.precise, { opacity: 0 }, { opacity: 1, duration: dur * .3, ease: 'power1.inOut', immediateRender: false }, t0 + dur * .7);
    tl.fromTo(R.root, { opacity: 1 }, { opacity: 0, duration: dur * .3, ease: 'power1.inOut', immediateRender: false }, t0 + dur * .72);
    tl.set(h.svg, { filter: 'none' }, t0 + dur);
    window.__filmEvents.push({ scene: o.scene || h.prefix, type: 'resolve', t: +t0.toFixed(3), dur: +dur.toFixed(3) });
    return t0 + dur;
  }

  window.SiteKit = { mount, rect, CAMERAS, parseD, fmt, jitter, events: window.__filmEvents };
})();
