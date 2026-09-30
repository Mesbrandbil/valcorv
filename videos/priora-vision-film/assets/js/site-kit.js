/*
 * SiteKit: mounts the Nordhavn Bioprocessing site (the demo's exact geometry)
 * into an SVG, with an optional rough twin for Act I (graphite line, colour pencil
 * and pale watercolour washes), a screen-constant camera, draw-on, act grading,
 * and the rough-to-precise resolve that lands on the precise colours.
 *
 * Deterministic: every jitter comes from a hash of the point and a pass seed,
 * so the same call always produces the same drawing. No clocks, no randomness.
 * Requires window.SITE_SVG and window.SITE_MODEL (assets/js/site-data.js),
 * gsap and DrawSVGPlugin. Colours come only from assets/css/film-color.css
 * (the var(--c-...) tokens; index.html loads it).
 *
 * API
 *   const site = SiteKit.mount(svgEl, { prefix, show: 'rough' | 'precise', rough: true, wobble: 2, grade })
 *     svgEl   an empty <svg> sized 1920x1080 by CSS (width:100%;height:100%)
 *     prefix  unique id prefix for this composition (e.g. 'a1')
 *     show    which layer is visible at mount time
 *     wobble  accepted for compatibility; cut 3 has no tremor filter (the displacement map made frames
 *             depend on seek order). The rough twin's jittered geometry and pencil strokes carry the hand.
 *     grade   'act1' | 'after' | 'full' | 'graphite' | { wash, sat } (default: 'act1' for show 'rough',
 *             'full' for show 'precise'); see site.grade below
 *     field   true shows the pale wash inside the rough envelope at mount (default false: a scene fades it
 *             in with site.field(...) when the envelope is drawn; the precise layer always has its own)
 *   site.el(id)                 precise element by its original id (e.g. 'sprinkler-zone-3')
 *   site.rough                  { root, units[], byBuilding{}, labels, envelope{construct, firm, label, field},
 *                                 heads[], headBeds[], grounds[], zoneText[] }
 *     unit                      { id, building, material, main, over, ext, occ, hatch, wash, chatch, ... }
 *   site.precise                the precise layer <g>
 *   site.cameras                named film cameras (world rects, 16:9)
 *   site.disp                   a pass-through primitive of the site's screen-space filter (scenes append a
 *                               feGaussianBlur to site.disp.parentNode for depth of field; still works)
 *   site.setView(rect)          set the camera immediately (viewBox + --sw)
 *   site.camera(tl, to, t, dur, ease)   tween the camera from the previous camera state in this timeline
 *   site.drawOn(tl, t0, opts)   draw the rough site building by building (line, then wash, then colour
 *                               hatching); returns end time
 *   site.resolve(tl, t0, dur)   rough becomes precise, washes land on the precise flat colours; returns end
 *   site.grade(tl, to, t, dur, ease)   tween the act grading (--sk-wash, --sk-sat on the svg); returns end
 *   site.setGrade(to)           set the grading immediately (build time)
 *   site.field(tl, t, dur, to)  fade the pale field inside the rough envelope (default to 1); returns end
 *   site.bleed(tl, to, t, dur, ease)  a second, independent colour multiplier (--sk-bleed, 1 full, 0 graphite)
 *                               for the rewind: drain the colour as it runs back, flood it back as it lands
 *   site.worldToScreen([x,y], rect)     world point to 1920x1080 screen px for a camera rect
 *   SiteKit.rect(cx, cy, s)      camera rect centred on a world point at s screen px per world unit
 *   SiteKit.color(name)          resolved hex of a film-color.css token ('hot', 'slate-roof', ...)
 *   SiteKit.drainCss(value)      CSS colour expression: value drained toward grey by the inherited --sk-sat
 *   SiteKit.GRADES, SiteKit.MATERIALS, SiteKit.materialOf(unitId, building)
 *   SiteKit.events              film-wide sound event list (window.__filmEvents)
 *
 * GRADING (cut 3, docs/cut3-direction.md section 1). Two custom properties on the svg drive every
 * colour inside it (the site's layers and any SketchKit item drawn in the site):
 *   --sk-wash  0..1 strength of the material washes (Act I 0.85, the aftermath 0.35, Acts II and III 1)
 *   --sk-sat   0..1 saturation of every colour (1 full hues, 0 drained to the same lightness in grey)
 *   presets: act1 { wash: var(--c-wash-act1), sat 1 }, after { wash: var(--c-wash-after), sat 0.22 },
 *            full { wash: var(--c-wash-act2), sat 1 }, graphite { wash 0, sat 0 } (the rewind's bleed)
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080;
  const BUILDINGS = ['ground-crosses', 'roads', 'loading-area', 'utilities', 'tanks', 'pipe-bridge',
    'production-hall', 'production-hall-2', 'laboratory', 'warehouse', 'loading-area-containers', 'sprinkler-zone-3'];
  const ARITY = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };

  window.__filmEvents = window.__filmEvents || [];

  // ---------- colour tokens (assets/css/film-color.css is the only source) ----------
  // The fallback mirrors film-color.css and is used only when the stylesheet is not loaded (a bare test page).
  const TOKEN_FALLBACK = {
    paper: '#f5f3ee', ink: '#1e1c19', graphite: '#3b3a36', shade: '#6b6e72',
    'slate-roof': '#b9c7d2', 'slate-wall': '#d3dce3', 'slate-dark': '#9aabb9',
    'sand-roof': '#e6d7b8', 'sand-wall': '#eee2c9', 'sand-dark': '#cdb68d',
    'sage-roof': '#c9d6c0', 'sage-wall': '#dae4d3', 'sage-dark': '#a9bd9f',
    'stone-roof': '#ddd4c8', 'stone-wall': '#e8e1d7', 'stone-dark': '#c2b6a6',
    terracotta: '#c9785a', steel: '#bcc6cc', 'steel-dark': '#97a3aa', ground: '#e7e9dc', paving: '#dedad1',
    'envelope-line': '#2e7d6b', 'envelope-field': '#dcebe3',
    hot: '#ef8a24', 'hot-soft': '#fbe3c8', lift: '#eebd2b', 'lift-soft': '#fbefc6', gas: '#6f5bb3', 'gas-soft': '#e6e1f4',
    air: '#15877e', 'air-soft': '#d2ebe8', general: '#8a8d91',
    water: '#2b8cc4', 'water-soft': '#d6e9f5', hivis: '#c7d92b', helmet: '#fbfaf7', leather: '#8a5a3c',
    ok: '#2e8b57', 'ok-soft': '#d9eee1', alert: '#e0452b', 'alert-soft': '#fadcd5', offline: '#9c9994',
    priora: '#1f47d6', 'priora-soft': '#dce2f5', 'priora-deep': '#1838a8',
    'wash-act1': '0.85', 'wash-after': '0.35', 'wash-act2': '1',
  };
  const tokenCache = {};
  function token(name) {
    if (tokenCache[name]) return tokenCache[name];
    let v = '';
    try { v = getComputedStyle(document.documentElement).getPropertyValue('--c-' + name).trim(); } catch (e) { v = ''; }
    if (!v) return TOKEN_FALLBACK[name];
    tokenCache[name] = v;
    return v;
  }
  function hexRgb(hex) { const h = String(hex).trim().replace('#', ''); const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h; return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16)); }
  const rgbHex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  /** sRGB mix of two token colours: k of a, 1 - k of b (what color-mix(in srgb, a k, b) and alpha over b give) */
  function mixHex(a, b, k) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A.map((v, i) => v * k + B[i] * (1 - k))); }
  function color(name) { return token(name); }
  /** a CSS colour drained toward grey (same lightness) by the inherited --sk-sat */
  const drainCss = v => `color-mix(in oklab, ${v} calc(var(--sk-sat, 1) * var(--sk-bleed, 1) * 100%), oklch(from ${v} l 0 h))`;
  const tv = n => `var(--c-${n}, ${TOKEN_FALLBACK[n]})`;

  // ---------- materials: building -> pale washes (roof, lit wall, shadow wall) ----------
  const MATERIALS = {
    slate: { t: tv('slate-roof'), r: tv('slate-wall'), l: tv('slate-dark') },
    sand: { t: tv('sand-roof'), r: tv('sand-wall'), l: tv('sand-dark') },
    sage: { t: tv('sage-roof'), r: tv('sage-wall'), l: tv('sage-dark') },
    stone: { t: tv('stone-roof'), r: tv('stone-wall'), l: tv('stone-dark') },
    terracotta: { t: `color-mix(in srgb, ${tv('terracotta')} 42%, ${tv('paper')})`, r: `color-mix(in srgb, ${tv('terracotta')} 56%, ${tv('paper')})`, l: `color-mix(in srgb, ${tv('terracotta')} 72%, ${tv('paper')})` },
    steel: { t: `color-mix(in srgb, ${tv('steel')} 62%, ${tv('paper')})`, r: tv('steel'), l: tv('steel-dark') },
    paving: { t: tv('paving'), r: tv('paving'), l: tv('paving') },
  };
  const MATERIAL_OF = { 'production-hall': 'slate', 'production-hall-2': 'slate', warehouse: 'slate', laboratory: 'sage', utilities: 'stone', tanks: 'steel', 'loading-area-containers': 'steel', 'loading-area': 'paving', roads: 'paving' };
  MATERIAL_OF.warehouse = 'sand';
  function materialOf(unitId, building) {
    if (/^utilities-stack/.test(unitId || '')) return 'terracotta';
    if (/^laboratory-stack/.test(unitId || '')) return 'steel';
    return MATERIAL_OF[building] || null;
  }
  // precise groups that carry a material class (nested groups override their parent)
  const PRECISE_MATERIALS = [['production-hall', 'slate'], ['production-hall-2', 'slate'], ['warehouse', 'sand'], ['laboratory', 'sage'],
    ['laboratory-stacks', 'steel'], ['utilities', 'stone'], ['utilities-stack', 'terracotta'], ['tanks', 'steel'], ['loading-area-containers', 'steel'], ['loading-area', 'paving']];

  // Wash density per face (multiplies --sk-wash): the tokens are the pigment, these keep them pale on paper.
  // Scenes may override --sk-kt / --sk-kr / --sk-kl / --sk-kg on a site svg.
  const K = { t: 0.58, r: 0.5, l: 0.72, g: 0.8 };

  // ---------- act grading ----------
  const GRADES = {
    act1: { wash: 'wash-act1', sat: 1 },
    after: { wash: 'wash-after', sat: 0.22 },
    full: { wash: 'wash-act2', sat: 1 },
    graphite: { wash: 0, sat: 0 },
  };
  function gradeOf(g) {
    if (g && typeof g === 'object') return { wash: +(g.wash != null ? g.wash : 1), sat: +(g.sat != null ? g.sat : 1) };
    const p = GRADES[g] || GRADES.full;
    const w = typeof p.wash === 'string' ? parseFloat(token(p.wash)) : p.wash;
    return { wash: isFinite(w) ? w : 1, sat: p.sat };
  }

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

  // A watercolour wash of a face: the face inset a little (convex polygons), shifted by a small seeded
  // misregistration and jittered, so the colour sits loosely inside the pencil line. Keeps the command
  // structure of the source path, so the resolve can tween it to the exact face.
  function washCmds(cmds, seed, inset, amt) {
    const R = mulberry32(hashStr('wsh' + seed));
    const ox = (R() - 0.5) * 2 * amt * 0.9, oy = (R() - 0.5) * 2 * amt * 0.6;
    const out = [];
    for (const sp of subpaths(cmds)) {
      const pts = sp.filter(c => c[0] === 'M' || c[0] === 'L');
      const lineOnly = pts.length === sp.filter(c => c[0] !== 'Z').length && pts.length >= 3;
      let moved = null;
      if (lineOnly && inset > 0) {
        const P = pts.map(c => [c[1][0], c[1][1]]), n = P.length;
        let area = 0; for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
        const sgn = area > 0 ? 1 : -1;
        // offset each edge inward and intersect neighbours (a convex face stays convex)
        const lines = P.map((a, i) => { const b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; const nx = -sgn * dy / L, ny = sgn * dx / L; const d = Math.min(inset, L * 0.18); return { a: [a[0] + nx * d, a[1] + ny * d], dx, dy }; });
        moved = P.map((p, i) => {
          const l1 = lines[(i - 1 + n) % n], l2 = lines[i];
          const den = l1.dx * l2.dy - l1.dy * l2.dx;
          if (Math.abs(den) < 1e-9) return l2.a.slice();
          const t = ((l2.a[0] - l1.a[0]) * l2.dy - (l2.a[1] - l1.a[1]) * l2.dx) / den;
          const q = [l1.a[0] + l1.dx * t, l1.a[1] + l1.dy * t];
          return Math.hypot(q[0] - p[0], q[1] - p[1]) > inset * 3 ? p.slice() : q;
        });
      }
      let k = 0;
      for (const [c, a] of sp) {
        if (c === 'Z') { out.push([c, a]); continue; }
        const b = a.slice();
        if ((c === 'M' || c === 'L') && moved) { b[0] = moved[k][0]; b[1] = moved[k][1]; k++; }
        const pairs = c === 'A' ? [5] : c === 'C' ? [0, 2, 4] : (c === 'S' || c === 'Q') ? [0, 2] : (c === 'H' || c === 'V') ? [] : [0];
        for (const ix of pairs) { b[ix] += ox; b[ix + 1] += oy; }
        out.push([c, b]);
      }
    }
    return jitter(out, 'w' + seed, amt);
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
    // Act I (rough twin)
    roofEdgeMacro: rect(21.5, 11.0, 30),
    siteOverview: rect(16.5, 44.5, 7.1),
    siteLeft: (() => { const s = 5.4; return { x: 16.5 - 600 / s, y: 44.5 - 560 / s, w: W / s, h: H / s }; })(),
    siteWide: rect(14, 42, 5.5),
    roof03: rect(39.5, 31.5, 16),
    landing: rect(43.5, 33.5, 14.5),
    sz3: rect(56, 37, 12),
    roof03AndSz3: rect(50, 33, 10.5),
    afterwardsWide: rect(30, 40, 7.4),
    // Acts II and III (precise): refined by the interface kit
    roof03Product: rect(47, 30, 11),
    systemRoof: rect(50, 30, 8.83133),
    wholeSite: rect(16.5, 44.5, 6.01038),
  };

  // ---------- styles ----------
  // Rules that restyle the precise (demo) layer go into the demo's own <style>, so a scene that rewrites
  // that style's selectors (a3-close scopes '.priora-site' to its svg) rewrites these with it.
  function preciseCss() {
    // a face is its material laid over paper at the wash strength (times a per-face density --sk-k*)
    const face = (v, k) => `color-mix(in srgb, ${drainCss(v)} calc(var(--sk-wash, 1) * var(--sk-bleed, 1) * var(${k || '--sk-kt'}) * 100%), ${tv('paper')})`;
    const line = `color-mix(in srgb, ${tv('ink')} 84%, ${tv('paper')})`;
    const mat = Object.keys(MATERIALS).map(k => `.priora-site .m-${k}{--mt:${MATERIALS[k].t};--mr:${MATERIALS[k].r};--ml:${MATERIALS[k].l}}`).join('\n');
    const water = drainCss(tv('water')), env = drainCss(tv('envelope-line'));
    return `
/* ---- cut 3 colour (SiteKit): pale material washes, ink lines, meaning colours ---- */
.priora-site,.sk-svg{--mt:${tv('paper')};--mr:${tv('paper')};--ml:${tv('paper')};--sk-kt:${K.t};--sk-kr:${K.r};--sk-kl:${K.l};--sk-kg:${K.g}}
${mat}
.priora-site .e,.priora-site .f{stroke:${line}}
.priora-site .f-t{fill:${face('var(--mt)', '--sk-kt')}}
.priora-site .f-r{fill:${face('var(--mr)', '--sk-kr')}}
.priora-site .f-l{fill:${face('var(--ml)', '--sk-kl')}}
.priora-site .ground{fill:${face(tv('paving'), '--sk-kg')}}
.priora-site .sk-paving{fill:${face(tv('paving'), '--sk-kg')};stroke:none}
.priora-site .det{stroke:color-mix(in srgb, ${tv('ink')} 42%, transparent)}
.priora-site .env-fill{fill:${drainCss(tv('envelope-field'))};fill-opacity:calc(var(--sk-wash, 1) * var(--sk-bleed, 1) * .55)}
.priora-site .env{stroke:${env}}
.priora-site .env-a{stroke-opacity:.9}
.priora-site .env-b{stroke-opacity:.3}
.priora-site .env-lab text{fill:${env};fill-opacity:.85}
.priora-site .sz3 .zf{fill:${drainCss(tv('water-soft'))};fill-opacity:calc(var(--sk-wash, 1) * var(--sk-bleed, 1) * .55)}
.priora-site .sz3 .zo{stroke:${water};stroke-opacity:.85}
.priora-site .sz3 .hd{fill:${water};stroke:${water}}
.priora-site .sz3 .hx{stroke:color-mix(in srgb, ${tv('offline')} 70%, ${tv('ink')})}
.priora-site .szh{stroke:${tv('offline')}}
.priora-site .sz3.off .zo{stroke:${tv('offline')}}
.priora-site .sz3.off .hd{fill:${tv('paper')};stroke:${tv('offline')}}
.priora-site .szl text.st{fill:${water}}
`;
  }
  function roughCss() {
    const water = drainCss(tv('water')), env = drainCss(tv('envelope-line'));
    const mat = Object.keys(MATERIALS).map(k => `.sk-svg .m-${k}{--mt:${MATERIALS[k].t};--mr:${MATERIALS[k].r};--ml:${MATERIALS[k].l}}`).join('\n');
    return `
.sk-svg{--skw:1;--skc:${tv('graphite')}}
.sk-svg .sk-rough path{fill:none;stroke-linecap:round;stroke-linejoin:round}
.sk-svg .sk-rough .sk-main{stroke:var(--skc);stroke-width:calc(var(--sw)*1.5px*var(--skw))}
.sk-svg .sk-rough .sk-main.lite{stroke:color-mix(in srgb, var(--skc) 55%, ${tv('paper')});stroke-width:calc(var(--sw)*1px*var(--skw))}
.sk-svg .sk-rough .sk-over{stroke:var(--skc);stroke-opacity:.32;stroke-width:calc(var(--sw)*1.1px)}
.sk-svg .sk-rough .sk-ext{stroke:var(--skc);stroke-opacity:.28;stroke-width:calc(var(--sw)*.9px)}
.sk-svg .sk-rough .sk-hatch{stroke:var(--skc);stroke-opacity:.26;stroke-width:calc(var(--sw)*.7px)}
.sk-svg .sk-rough .sk-hatch.sparse{stroke-opacity:.14}
.sk-svg .sk-rough path.sk-occ{fill:${tv('paper')};stroke:none}
${mat}
.sk-svg .sk-rough path.sk-wash{stroke:none;fill:${drainCss('var(--mt)')};fill-opacity:calc(var(--sk-wash, .85) * var(--sk-bleed, 1) * var(--sk-kt))}
.sk-svg .sk-rough path.sk-wash.w-r{fill:${drainCss('var(--mr)')};fill-opacity:calc(var(--sk-wash, .85) * var(--sk-bleed, 1) * var(--sk-kr))}
.sk-svg .sk-rough path.sk-wash.w-l{fill:${drainCss('var(--ml)')};fill-opacity:calc(var(--sk-wash, .85) * var(--sk-bleed, 1) * var(--sk-kl))}
.sk-svg .sk-rough path.sk-wash.m-paving{fill-opacity:calc(var(--sk-wash, .85) * var(--sk-bleed, 1) * var(--sk-kg))}
.sk-svg .sk-rough path.sk-chatch{stroke:${drainCss('var(--ml)')};stroke-opacity:calc(var(--sk-wash, .85) * var(--sk-bleed, 1) * .75);stroke-width:calc(var(--sw)*1.2px)}
.sk-svg .sk-rough path.sk-chatch.lt{stroke:${drainCss('var(--mr)')};stroke-opacity:calc(var(--sk-wash, .85) * var(--sk-bleed, 1) * .7);stroke-width:calc(var(--sw)*1.1px)}
.sk-svg .sk-rough .sk-env-construct{stroke:${env};stroke-opacity:.42;stroke-width:calc(var(--sw)*.9px)}
.sk-svg .sk-rough .sk-env-firm{stroke:${env};stroke-width:calc(var(--sw)*1.5px)}
.sk-svg .sk-rough .sk-head{fill:${water}}
.sk-svg .sk-rough .sk-head-bed{fill:${tv('offline')}}
.sk-svg .sk-rough text{fill:var(--skc);font-family:'IBM Plex Mono';font-weight:400;letter-spacing:.12em}
.sk-svg .sk-rough text.sk-env-label{fill:${env}}
.sk-svg .sk-rough .sk-lab line{stroke:var(--skc);stroke-opacity:.6;stroke-width:1}
.sk-svg .sk-field path{fill:${drainCss(tv('envelope-field'))};fill-opacity:calc(var(--sk-wash, .85) * var(--sk-bleed, 1) * .6);stroke:none}
`;
  }

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
    // no fallback fonts in a stack: the HyperFrames compiler would fetch a substitute font for them
    if (styleEl) styleEl.textContent = styleEl.textContent.replace(/'IBM Plex Mono',\s*ui-monospace,\s*monospace/g, "'IBM Plex Mono'").replace(/'IBM Plex Sans',\s*[^;}]+/g, "'IBM Plex Sans'");
    // cut 3 colour for the precise layer, inside the demo's own style (see preciseCss)
    if (styleEl) styleEl.textContent += preciseCss();

    const defs = mk('defs', {}, svg);
    src.querySelectorAll('defs > *').forEach(n => defs.appendChild(document.importNode(n, true)));
    // film additions to the style: rough layer rules
    const extra = mk('style', {}, defs);
    extra.textContent = roughCss();
    // The site's screen-space filter (applied to the svg in rough mode). Cut 3 removed the tremor
    // (feTurbulence + feDisplacementMap): it made frames depend on seek order. What is left is a
    // pass-through primitive, so a scene can still append a depth-of-field blur to site.disp.parentNode.
    const filt = mk('filter', { id: P + 'sk-wobble', x: '-2%', y: '-2%', width: '104%', height: '104%', 'color-interpolation-filters': 'sRGB' }, defs);
    const disp = mk('feOffset', { in: 'SourceGraphic', dx: '0', dy: '0' }, filt);

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
    // material classes on the precise buildings
    PRECISE_MATERIALS.forEach(([id, m]) => { const g = el(id); if (g) g.classList.add('m-' + m); });
    // paving under the roads (the demo draws the roads as single faint lines)
    const roadsEl = el('roads');
    const pavingD = roadsEl ? pavingFor(roadsEl.getAttribute('d')) : '';
    if (roadsEl && pavingD) roadsEl.parentNode.insertBefore(mk('path', { id: P + 'roads-paving', class: 'sk-paving', d: pavingD }), roadsEl);

    // rough layer
    const rough = { root: null, units: [], byBuilding: {}, labels: null, envelope: {}, heads: [], headBeds: [], grounds: [], zoneText: [] };
    let fieldG = null;
    if (opts.rough) {
      // the pale field inside the envelope sits under the buildings (and under SketchKit's ground layer)
      fieldG = mk('g', { class: 'sk-field' }, svg);
      const R = mk('g', { class: 'sk-rough' }, svg);
      rough.root = R;
      const world = el('world');
      const bOf = e => { let n = e; while (n && n.parentNode !== world) n = n.parentNode; return n ? n.getAttribute('id').slice(P.length) : 'world'; };
      const bGroups = {};
      const groupFor = b => bGroups[b] || (bGroups[b] = mk('g', { class: 'sk-b', 'data-b': b }, R));
      let clipN = 0;
      // paving washes under the roads, first in the roads group
      if (pavingD) {
        const pc = parseD(pavingD);
        const wd = fmt(washCmds(pc, 'paving', 0, 0.22));
        const g = groupFor('roads');
        rough.grounds.push({ building: 'roads', material: 'paving', preciseD: pavingD, washD: wd, wash: mk('path', { class: 'sk-wash m-paving', d: wd }, g) });
      }
      world.querySelectorAll('path, ellipse, text').forEach(e => {
        const cls = e.getAttribute('class') || '';
        if (/\bsk-paving\b/.test(cls)) return;
        const b = bOf(e);
        const g = groupFor(b);
        const id = (e.getAttribute('id') || '').slice(P.length);
        if (e.localName === 'ellipse') {
          if (!/\bhd\b/.test(cls)) return;
          // the head over a small drained bed: as a head fades (the zone goes offline), it drains to grey
          const bed = mk('ellipse', { class: 'sk-head-bed', cx: e.getAttribute('cx'), cy: e.getAttribute('cy'), rx: .29, ry: .18, 'data-i': e.getAttribute('data-i') || '' }, g);
          const h = mk('ellipse', { class: 'sk-head', cx: e.getAttribute('cx'), cy: e.getAttribute('cy'), rx: .34, ry: .21, 'data-i': e.getAttribute('data-i') || '' }, g);
          rough.heads.push(h); rough.headBeds.push(bed); return;
        }
        if (e.localName === 'text') {
          const t = mk('text', { transform: e.getAttribute('transform') || '', x: e.getAttribute('x'), y: e.getAttribute('y'), 'font-size': e.getAttribute('font-size') || '2.6' }, g);
          t.textContent = e.textContent; rough.zoneText.push(t); return;
        }
        if (/\bground\b/.test(cls)) {
          const d = e.getAttribute('d'); if (!d) return;
          const m = materialOf(id, b) || 'paving';
          const wd = fmt(washCmds(parseD(d), id, 0.12, 0.2));
          rough.grounds.push({ building: b, material: m, preciseD: d, washD: wd, wash: mk('path', { class: 'sk-wash m-' + m, d: wd }, g) });
          return;
        }
        if (/\b(zx|hx|zf|zone-area|sk-paving)\b/.test(cls)) return;
        const d = e.getAttribute('d'); if (!d) return;
        const cmds = parseD(d);
        const isFace = /\bf\b/.test(cls);
        const lite = /\b(det|grid|faint|dash|zo)\b/.test(cls);
        const unit = { id, building: b, cls, preciseD: d, face: isFace ? (cls.match(/f-[tlr]/) || [''])[0] : null };
        const mainC = jitter(cmds, 'm' + id, isFace || /\be\b/.test(cls) ? .16 : .12);
        unit.roughD = fmt(mainC);
        if (isFace) {
          unit.occ = mk('path', { class: 'sk-occ', d: unit.roughD }, g);
          const m = materialOf(id, b);
          unit.material = m;
          if (m) {
            const wc = washCmds(cmds, id, unit.face === 'f-t' ? 0.2 : 0.16, 0.2);
            unit.washD = fmt(wc);
            unit.wash = mk('path', { class: 'sk-wash m-' + m + ' w-' + (unit.face || 'f-t').slice(2), d: unit.washD }, g);
          }
          const [x0, y0, x1, y1] = bboxOf(cmds);
          const cyl = /\bA/.test(d) && unit.face === 'f-r';   // a tank body: shade its left side
          if (unit.face === 'f-l' || unit.face === 'f-r') {
            const cid = P + 'skc' + (clipN++);
            const cp = mk('clipPath', { id: cid }, defs); mk('path', { d: unit.roughD }, cp);
            const sp = unit.face === 'f-l' ? .72 : 1.55, hgt = y1 - y0;
            let hd = ''; const hr = mulberry32(hashStr('h' + id));
            for (let x = x0 - hgt; x < x1; x += sp) { const j = (hr() - .5) * .16; hd += `M${f2(x + j)} ${f2(y1 + .2)}L${f2(x + hgt + .2 + j)} ${f2(y0 - .2)}`; }
            if (!cyl) unit.hatch = mk('path', { class: 'sk-hatch' + (unit.face === 'f-r' ? ' sparse' : ''), 'clip-path': `url(#${cid})`, d: hd }, g);
            // colour pencil: steeper strokes in the material's shadow tone on the shadow faces
            if (m && (unit.face === 'f-l' || cyl)) {
              let cd = ''; const cr = mulberry32(hashStr('ch' + id));
              const k = 0.55, csp = cyl ? .5 : .46, xe = cyl ? x0 + (x1 - x0) * 0.42 : x1;
              for (let x = x0 - hgt * k; x < xe; x += csp * (0.8 + cr() * 0.4)) { const j = (cr() - .5) * .2, sh = (cr() - .5) * .3; cd += `M${f2(x + j)} ${f2(y1 + .2 + sh)}L${f2(x + hgt * k + .2 + j)} ${f2(y0 - .2 + sh)}`; }
              unit.chatch = mk('path', { class: 'sk-chatch m-' + m, 'clip-path': `url(#${cid})`, d: cd }, g);
            }
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
      // envelope, drawn by hand in two passes, over a pale field
      const envD = el('envelope-outline') && el('envelope-outline').getAttribute('d');
      if (envD) {
        const ec = parseD(envD);
        const fillEl = el('envelope-fill');
        const fd = fillEl ? fillEl.getAttribute('d') : envD;
        rough.envelope.fieldD = fd;
        rough.envelope.field = mk('path', { d: fmt(jitter(parseD(fd), 'envw', .45)) }, fieldG);
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
      fieldG.style.opacity = opts.field ? 1 : 0;
      rough.field = fieldG;
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
    // grading: the current value is tracked at build time (call in time order, like the camera)
    handle.setGrade = function (g) { const v = gradeOf(g); svg.style.setProperty('--sk-wash', v.wash); svg.style.setProperty('--sk-sat', v.sat); handle._grade = v; return v; };
    handle.grade = function (tl, to, t, dur, ease, from) {
      const a = from ? gradeOf(from) : (handle._grade || gradeOf('full')), b = gradeOf(to);
      tl.fromTo(svg, { '--sk-wash': a.wash, '--sk-sat': a.sat }, { '--sk-wash': b.wash, '--sk-sat': b.sat, duration: Math.max(0.001, dur || 0.001), ease: ease || (dur > 0.002 ? 'power1.inOut' : 'none'), immediateRender: false }, t);
      handle._grade = b;
      return t + (dur || 0);
    };
    // the rewind's bleed: an independent multiplier on wash and saturation (1 full, 0 graphite), so a
    // timeline other than the one that owns the grading can drain and restore the colour
    handle._bleed = 1;
    // set inline at mount, so a bleed tween's start value restores on a backward seek
    svg.style.setProperty('--sk-bleed', '1');
    handle.bleed = function (tl, to, t, dur, ease) {
      tl.fromTo(svg, { '--sk-bleed': handle._bleed }, { '--sk-bleed': to, duration: Math.max(0.001, dur || 0.001), ease: ease || (dur > 0.002 ? 'power1.inOut' : 'none'), immediateRender: false }, t);
      handle._bleed = to;
      return t + (dur || 0);
    };
    handle._field = opts.field ? 1 : 0;
    handle.field = function (tl, t, dur, to) {
      if (!fieldG) return t;
      to = to == null ? 1 : to;
      tl.fromTo(fieldG, { opacity: handle._field }, { opacity: to, duration: Math.max(0.001, dur || 0.6), ease: 'power1.inOut', immediateRender: false }, t);
      handle._field = to;
      return t + (dur || 0.6);
    };

    // initial visibility and grading
    handle.setGrade(opts.grade || (opts.show === 'rough' ? 'act1' : 'full'));
    if (opts.show === 'rough') { precise.style.opacity = 0; svg.style.filter = `url(#${P}sk-wobble)`; }
    else if (rough.root) { rough.root.style.opacity = 0; if (fieldG) fieldG.style.opacity = 0; handle._field = 0; }
    handle.setView(CAMERAS.siteOverview);
    return handle;
  }

  // paving bands along the demo's road lines (each road is a straight line on the ground plane)
  function pavingFor(d) {
    if (!d) return '';
    const C30 = 0.8660254, half = 1.55;
    const toPlan = p => { const a = p[0] / C30, b = 2 * p[1]; return [(a + b) / 2, (b - a) / 2]; };
    const toWorld = q => [(q[0] - q[1]) * C30, (q[0] + q[1]) * 0.5];
    let out = '';
    for (const sp of subpaths(parseD(d))) {
      const pts = sp.filter(c => c[0] === 'M' || c[0] === 'L').map(c => toPlan(c[1]));
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L * half, ny = dx / L * half;
        const q = [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]].map(toWorld);
        out += 'M' + q.map(p => f2(p[0]) + ' ' + f2(p[1])).join('L') + 'Z';
      }
    }
    return out;
  }

  function vb(r) { return `${f2(r.x)} ${f2(r.y)} ${f2(r.w)} ${f2(r.h)}`; }
  function applyView(svg, r) {
    svg.setAttribute('viewBox', vb(r));
    svg.style.setProperty('--sw', (r.w / W).toFixed(6));
  }

  // ---------- draw-on (rough twin: pencil line, then wash, then colour hatching) ----------
  function drawOn(h, tl, t0, o) {
    const order = o.order || BUILDINGS;
    const per = o.perBuilding || 0.8;       // seconds for one building's edges
    const gap = o.stagger || 0.28;          // start offset between buildings
    const scene = o.scene || h.prefix;
    let end = t0;
    const bedsAt = order.includes('sprinkler-zone-3') ? 'sprinkler-zone-3' : order.find(b => b === 'production-hall' || b === 'production-hall-2');
    order.forEach((b, bi) => {
      const tb = t0 + bi * gap;
      (h.rough.grounds || []).forEach(gr => {
        if (gr.building !== b) return;
        tl.fromTo(gr.wash, { opacity: 0 }, { opacity: 1, duration: per * .9, ease: 'power1.out', immediateRender: true }, tb + per * .3);
      });
      if (b === bedsAt) (h.rough.headBeds || []).forEach(bd => tl.fromTo(bd, { opacity: 0 }, { opacity: 1, duration: .2, immediateRender: true }, tb + per * .95 + (+bd.getAttribute('data-i') || 0) * .012));
      const units = h.rough.byBuilding[b]; if (!units) return;
      units.forEach((u, ui) => {
        const tu = tb + (ui / Math.max(1, units.length)) * per * .6;
        const d = Math.max(.18, per * .5);
        if (u.occ) tl.fromTo(u.occ, { opacity: 0 }, { opacity: 1, duration: .01, immediateRender: true }, tu);
        tl.fromTo(u.main, { drawSVG: '0%' }, { drawSVG: '100%', duration: d, ease: 'power1.inOut', immediateRender: true }, tu);
        if (u.over) tl.fromTo(u.over, { drawSVG: '0%' }, { drawSVG: '100%', duration: d * .8, ease: 'power1.inOut', immediateRender: true }, tu + d * .45);
        if (u.ext) tl.fromTo(u.ext, { drawSVG: '0%' }, { drawSVG: '100%', duration: .2, ease: 'power1.out', immediateRender: true }, tu + d * .9);
        // the wash is laid once the line is down, loosely, like watercolour after the pencil
        if (u.wash) tl.fromTo(u.wash, { opacity: 0 }, { opacity: 1, duration: per * .8, ease: 'power1.out', immediateRender: true }, tu + d * .55);
        if (u.hatch) tl.fromTo(u.hatch, { drawSVG: '0%' }, { drawSVG: '100%', duration: per * .7, ease: 'none', immediateRender: true }, tu + d);
        if (u.chatch) tl.fromTo(u.chatch, { drawSVG: '0%' }, { drawSVG: '100%', duration: per * .7, ease: 'none', immediateRender: true }, tu + d * 1.15);
        if (!u.cls.includes('grid') && !u.cls.includes('faint')) window.__filmEvents.push({ scene, type: /\b(det|dash|zo)\b/.test(u.cls) ? 'pencil-light' : 'pencil', t: +tu.toFixed(3), dur: +d.toFixed(3) });
        if (u.hatch) window.__filmEvents.push({ scene, type: 'hatch', t: +(tu + d).toFixed(3), dur: +(per * .7).toFixed(3) });
        end = Math.max(end, tu + d + (u.hatch ? per * .7 : 0));   // (cut 2 timing: washes may settle a little after)
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

  // ---------- resolve: rough becomes precise, washes land on the precise flat colours ----------
  function resolve(h, tl, t0, dur, o) {
    const R = h.rough; if (!R.root) return t0;
    const order = o.order || BUILDINGS;
    const ease = o.ease || 'expo.out';
    const span = dur * .55, each = dur * .45;
    order.forEach((b, bi) => {
      const units = R.byBuilding[b];
      const tb = t0 + (bi / order.length) * span;
      (R.grounds || []).forEach(gr => { if (gr.building === b) tl.fromTo(gr.wash, { attr: { d: gr.washD } }, { attr: { d: gr.preciseD }, duration: each, ease, immediateRender: false }, tb); });
      if (!units) return;
      units.forEach(u => {
        tl.fromTo(u.main, { attr: { d: u.roughD } }, { attr: { d: u.preciseD }, duration: each, ease, immediateRender: false }, tb);
        if (u.over) tl.fromTo(u.over, { opacity: 1 }, { opacity: 0, duration: each * .6, ease: 'power2.out', immediateRender: false }, tb);
        if (u.ext) tl.fromTo(u.ext, { drawSVG: '100%' }, { drawSVG: '50% 50%', duration: each * .7, ease: 'power3.inOut', immediateRender: false }, tb);
        if (u.hatch) tl.fromTo(u.hatch, { opacity: 1 }, { opacity: 0, duration: each * .7, ease: 'power2.out', immediateRender: false }, tb);
        if (u.chatch) tl.fromTo(u.chatch, { opacity: 1 }, { opacity: 0, duration: each * .7, ease: 'power2.out', immediateRender: false }, tb);
        if (u.occ) tl.fromTo(u.occ, { attr: { d: u.roughD } }, { attr: { d: u.preciseD }, duration: each, ease, immediateRender: false }, tb);
        // the loose wash snaps to the face: with the grading at full it is exactly the precise face colour
        if (u.wash) tl.fromTo(u.wash, { attr: { d: u.washD } }, { attr: { d: u.preciseD }, duration: each, ease, immediateRender: false }, tb);
      });
    });
    const line = mixHex(token('ink'), token('paper'), .84);
    tl.fromTo(h.svg, { '--skw': 1, '--skc': token('graphite') }, { '--skw': .7, '--skc': line, duration: dur * .8, ease: 'power2.inOut', immediateRender: false }, t0);
    h.grade(tl, 'full', t0, dur * .8, 'power2.inOut');
    if (R.envelope.firm) {
      tl.fromTo(R.envelope.firm, { attr: { d: R.envelope.firm.getAttribute('d') } }, { attr: { d: R.envelope.preciseD }, duration: dur * .7, ease, immediateRender: false }, t0 + dur * .1);
      tl.fromTo(R.envelope.construct, { opacity: 1 }, { opacity: 0, duration: dur * .4, immediateRender: false }, t0);
    }
    if (R.envelope.field && R.envelope.fieldD) tl.fromTo(R.envelope.field, { attr: { d: R.envelope.field.getAttribute('d') } }, { attr: { d: R.envelope.fieldD }, duration: dur * .7, ease, immediateRender: false }, t0 + dur * .1);
    if (R.labels) tl.fromTo(R.labels, { opacity: 1 }, { opacity: 0, duration: dur * .35, immediateRender: false }, t0 + dur * .5);
    if (R.envelope.label) tl.fromTo(R.envelope.label, { opacity: 1 }, { opacity: 0, duration: dur * .35, immediateRender: false }, t0 + dur * .5);
    // hand over to the exact demo layer (its own field and flat colours): the precise layer comes up fully
    // under the (now identical, opaque) rough twin, then the twin lifts off, so the colour never dips
    tl.fromTo(h.precise, { opacity: 0 }, { opacity: 1, duration: dur * .26, ease: 'power1.inOut', immediateRender: false }, t0 + dur * .62);
    tl.fromTo(R.root, { opacity: 1 }, { opacity: 0, duration: dur * .14, ease: 'power1.inOut', immediateRender: false }, t0 + dur * .88);
    if (R.field && h._field > 0) tl.fromTo(R.field, { opacity: h._field }, { opacity: 0, duration: dur * .14, ease: 'power1.inOut', immediateRender: false }, t0 + dur * .88);
    h._field = 0;
    tl.set(h.svg, { filter: 'none' }, t0 + dur);
    window.__filmEvents.push({ scene: o.scene || h.prefix, type: 'resolve', t: +t0.toFixed(3), dur: +dur.toFixed(3) });
    return t0 + dur;
  }

  window.SiteKit = {
    mount, rect, CAMERAS, parseD, fmt, jitter, washCmds, events: window.__filmEvents,
    color, token, mixHex, drainCss, GRADES, gradeOf, MATERIALS, materialOf,
  };
})();
