/* Until — a calm countdown. Tier 1: pure static, no network, no deps.
   Fonts are self-hosted in ./fonts (SIL OFL). Nothing is fetched at runtime.

   Rendering:
   - LIGHTS + ORBIT: Canvas2D scene + a poor-man's pyramid bloom (downscale
     then upscale is the blur), warm-tinted and lightly desaturated, added
     back over the scene with 'lighter'.
   - HORIZON: a single raw-WebGL fullscreen triangle (fog + marched god-rays
     + filmic tone-map + grain/dither). The Canvas2D horizon is kept as a
     fallback and is used whenever WebGL context creation fails, the context
     is lost, or prefers-reduced-motion is set. Both ship. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'until.event.v1';

  // --- elements ------------------------------------------------------
  const setupEl  = $('#setup');
  const resultEl = $('#result');
  const form     = $('#form');
  const nameIn   = $('#name');
  const dateIn   = $('#date');
  const timeIn   = $('#time');
  const evName   = $('#ev-name');
  const evTime   = $('#ev-time');
  const evValue  = $('.value', evTime);
  const unitNote = $('#unit-note');
  const modesEl  = $('#modes');
  const keepBtn  = $('#keep');
  const backBtn  = $('#back');
  const exitBtn  = $('#exit');
  const srEl     = $('#sr');
  const canvas   = $('#viz');
  const ctx      = canvas.getContext('2d');
  const glCanvas = $('#glviz');

  // --- state ------------------------------------------------------
  let ev = null;            // { name, target (ms), createdAt (ms) }
  let mode = 'lights';
  let ambient = false;
  let raf = 0;
  let lastDraw = 0;
  let srKey = '';
  let dpr = 1;
  let exitTimer = 0;

  // WebGL horizon state
  let gl = null, glProg = null, glBuf = null;
  let glOK = false, glLost = false, glTried = false;
  const glLoc = {};

  // --- glow sprite: tight hot core + wide faint halo ---------------
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 128;
  {
    const s = sprite.getContext('2d');
    const g = s.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0.00, 'rgba(255,247,234,1)');
    g.addColorStop(0.07, 'rgba(255,239,216,0.92)');
    g.addColorStop(0.19, 'rgba(255,214,170,0.55)');
    g.addColorStop(0.44, 'rgba(232,150,96,0.17)');
    g.addColorStop(1.00, 'rgba(232,134,90,0)');
    s.fillStyle = g;
    s.fillRect(0, 0, 128, 128);
  }
  function blob(x, y, r, a, c) {
    c = c || ctx;
    if (a <= 0) return;
    c.globalAlpha = a > 1 ? 1 : a;
    c.drawImage(sprite, x - r, y - r, r * 2, r * 2);
    c.globalAlpha = 1;
  }

  // --- tiny noise + easing ---------------------------------------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const easeOut   = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  function hash2(x, y) { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi);
    const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }

  // --- point field: phyllotaxis, biased denser toward the centre ---
  const MAXP = 600;
  const FIELD = [];
  (() => {
    const N = 620, GA = Math.PI * (3 - Math.sqrt(5));
    const h = n => { const v = Math.sin(n * 127.1) * 43758.545; return v - Math.floor(v); };
    for (let i = 0; i < N; i++) {
      const rr = Math.pow((i + 0.5) / N, 0.72);   // exponent > 0.5 => denser core, thinner rim
      const a = i * GA;
      FIELD.push({
        x: Math.cos(a) * rr + (h(i) * 2 - 1) * 0.028,
        y: Math.sin(a) * rr + (h(i + 7777) * 2 - 1) * 0.028,
        rr,
        ph: h(i + 3) * Math.PI * 2,
        ns: h(i + 13),
      });
    }
  })();

  // --- stars for the 2D horizon fallback -------------------------
  const STARS = [];
  (() => {
    const h = n => { const v = Math.sin(n * 78.233) * 43758.545; return v - Math.floor(v); };
    for (let i = 0; i < 70; i++) {
      STARS.push({ x: h(i), y: h(i + 50) * 0.6, ph: h(i + 9) * Math.PI * 2, s: 0.5 + h(i + 3) * 1.1 });
    }
  })();

  // --- misc helpers -------------------------------------------
  const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  function mix(c1, c2, t) {
    t = clamp(t, 0, 1);
    const a = hex(c1), b = hex(c2);
    return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
  }
  const pad = n => (n < 10 ? '0' : '') + n;
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  function formatDuration(ms) {
    const s   = Math.floor(ms / 1000);
    const d   = Math.floor(s / 86400);
    const h   = Math.floor((s % 86400) / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (ms < 3600000) {                       // under an hour: seconds are welcome
      if (s < 60) return plural(s, 'second');
      return plural(m, 'minute') + ' · ' + plural(sec, 'second');
    }
    if (d > 0) return h > 0 ? plural(d, 'day') + ' · ' + plural(h, 'hour') : plural(d, 'day');
    return m > 0 ? plural(h, 'hour') + ' · ' + plural(m, 'minute') : plural(h, 'hour');
  }

  function inputsFromDate(dt) {
    return {
      date: dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()),
      time: pad(dt.getHours()) + ':' + pad(dt.getMinutes()),
    };
  }

  // --- persistence ----------------------------------------------
  function save() {
    if (!ev) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({
        name: ev.name, target: ev.target, createdAt: ev.createdAt, mode,
      }));
    } catch (e) { /* private mode / disabled storage — no harm */ }
  }
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!o || typeof o.target !== 'number' || isNaN(o.target)) return null;
      return {
        name: String(o.name || 'Something'),
        target: o.target,
        createdAt: typeof o.createdAt === 'number' ? o.createdAt : Date.now(),
        mode: ['lights', 'orbit', 'horizon'].includes(o.mode) ? o.mode : 'lights',
      };
    } catch (e) { return null; }
  }

  // --- view switching -----------------------------------------
  function toResult(animate) {
    save();
    evName.textContent = ev.name;
    setMode(mode, false);
    resizeCanvas();

    if (reduced || !animate) {
      setupEl.hidden = true;
      resultEl.hidden = false;
      startLoop();
      return;
    }
    setupEl.classList.add('leaving');
    resultEl.hidden = false;
    document.body.classList.add('entering');
    void resultEl.offsetWidth;                // flush, so the transition runs
    requestAnimationFrame(() => document.body.classList.remove('entering'));
    setTimeout(() => { setupEl.hidden = true; setupEl.classList.remove('leaving'); }, 560);
    startLoop();
  }

  function toSetup() {
    stopLoop();
    if (ambient) setAmbient(false);
    document.body.classList.remove('gl-active');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resultEl.hidden = true;
    document.body.classList.remove('entering');
    setupEl.hidden = false;
    if (ev) {
      const i = inputsFromDate(new Date(ev.target));
      nameIn.value = ev.name;
      dateIn.value = i.date;
      timeIn.value = i.time;
    }
    nameIn.focus();
  }

  function setMode(m, persist) {
    mode = m;
    for (const b of modesEl.children) b.classList.toggle('is-active', b.dataset.m === m);
    unitNote.textContent = '';
    lastDraw = 0;
    if (m === 'horizon') ensureGL();
    else document.body.classList.remove('gl-active');
    if (persist) save();
  }

  function setAmbient(on) {
    ambient = on;
    document.body.classList.toggle('ambient', on);
    exitBtn.hidden = !on;
    if (on) flashExit();
    else exitBtn.classList.remove('show');
  }
  function flashExit() {
    if (!ambient) return;
    exitBtn.classList.add('show');
    clearTimeout(exitTimer);
    exitTimer = setTimeout(() => exitBtn.classList.remove('show'), 2600);
  }

  // --- live readout -------------------------------------------
  function updateText(now) {
    const remaining = ev.target - now;
    const past = remaining < 0;
    const abs = Math.abs(remaining);
    const str = formatDuration(abs);
    // emit each unit as a non-breaking span so the line can only break at the
    // "·" — never mid-unit ("13" orphaned from "minutes")
    while (evValue.firstChild) evValue.removeChild(evValue.firstChild);
    str.split(' · ').forEach((part, i) => {
      if (i) evValue.appendChild(document.createTextNode(' '));
      const u = document.createElement('span');
      u.className = 'unit';
      u.textContent = i ? '· ' + part : part;
      evValue.appendChild(u);
    });
    evTime.classList.toggle('past', past);

    // announce sparingly: only when the coarse value actually changes
    const bucket = abs < 3600000 ? Math.floor(abs / 1000) : Math.floor(abs / 60000);
    const key = past + '|' + bucket;
    if (key !== srKey) {
      srKey = key;
      srEl.textContent = past ? ev.name + ' was ' + str + ' ago'
                              : str + ' until ' + ev.name;
    }
  }

  // fraction of the journey travelled — drives ORBIT and HORIZON
  function progressAt(now) {
    const total = ev.target - ev.createdAt;
    if (total > 1000) return (now - ev.createdAt) / total;
    return 1 + clamp((now - ev.target) / 3600000, 0, 1.2); // already-past events: drift across
  }

  // choose a unit so the LIGHTS count stays in a sensible range
  const LADDER = [
    ['one second', 1000],
    ['one minute', 60000],
    ['5 minutes', 300000],
    ['15 minutes', 900000],
    ['one hour', 3600000],
    ['3 hours', 10800000],
    ['6 hours', 21600000],
    ['one day', 86400000],
    ['one week', 604800000],
  ];
  function lightsModel(remaining) {
    const abs = Math.abs(remaining);
    let idx = 1;
    if (abs < 60000) idx = 0;
    else {
      idx = LADDER.length - 1;
      for (let k = 1; k < LADDER.length; k++) {
        if (abs / LADDER[k][1] <= 520) { idx = k; break; }
      }
    }
    return { label: LADDER[idx][0], units: abs / LADDER[idx][1] };
  }

  // --- canvas sizing ----------------------------------------
  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    if (gl) glResize();
  }

  // --- poor-man's pyramid bloom (LIGHTS + ORBIT) --------------
  const glowCv = document.createElement('canvas');
  const sBuf   = document.createElement('canvas');
  function glowCtx(w, h) {
    if (glowCv.width !== canvas.width || glowCv.height !== canvas.height) {
      glowCv.width = canvas.width; glowCv.height = canvas.height;
    }
    const g = glowCv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    return g;
  }
  function bloomComposite() {
    const pw = canvas.width, ph = canvas.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // crisp emissive first, a touch dimmed to leave headroom for the add
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.88;
    ctx.drawImage(glowCv, 0, 0);

    // additive multi-scale blur: down- then up-scale IS the blur
    ctx.globalCompositeOperation = 'lighter';
    if ('filter' in ctx) ctx.filter = 'saturate(0.8)';
    const levels = [[2, 0.32], [4, 0.46], [8, 0.62]];
    const sctx = sBuf.getContext('2d');
    for (let i = 0; i < levels.length; i++) {
      const f = levels[i][0];
      const dw = Math.max(1, Math.round(pw / f));
      const dh = Math.max(1, Math.round(ph / f));
      if (sBuf.width !== dw || sBuf.height !== dh) { sBuf.width = dw; sBuf.height = dh; }
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.globalCompositeOperation = 'source-over';
      sctx.clearRect(0, 0, dw, dh);
      sctx.imageSmoothingEnabled = true;
      sctx.drawImage(glowCv, 0, 0, dw, dh);                 // downscale = blur
      // warm-tint the bloom only where it already has energy
      sctx.globalCompositeOperation = 'source-atop';
      sctx.fillStyle = 'rgba(255,205,158,0.26)';
      sctx.fillRect(0, 0, dw, dh);
      ctx.globalAlpha = levels[i][1];
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(sBuf, 0, 0, dw, dh, 0, 0, pw, ph);      // upscale = blur
    }
    if ('filter' in ctx) ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // --- LIGHTS: dissolve bookkeeping (no per-unit blink) -------
  const dissolve = [];
  let dlastN = -1;
  function pushDissolve(idx, dir, now) {
    const seed = (FIELD[idx] && FIELD[idx].ns) || Math.random();
    dissolve.push({
      idx, dir, t0: now,
      dur: 8000 + seed * 7000,             // 8–15 s — a deliberate per-unit irregularity
      vx: Math.cos(seed * 6.2832) * (0.02 + seed * 0.03),
      vy: Math.sin(seed * 6.2832) * (0.02 + seed * 0.03),
    });
  }
  function updateDissolve(n, now) {
    if (dlastN < 0) { dlastN = n; return; }
    if (n === dlastN) return;
    if (n < dlastN) {                       // future: units elapsed -> spend points
      for (let i = n + 1; i <= dlastN && i < MAXP; i++) if (i >= 0) pushDissolve(i, -1, now);
    } else {                                // past event continuing -> points condense in
      for (let i = dlastN + 1; i <= n && i < MAXP; i++) if (i >= 0) pushDissolve(i, 1, now);
    }
    dlastN = n;
    if (dissolve.length > 140) dissolve.splice(0, dissolve.length - 140);
  }

  // --- scenes -----------------------------------------------
  function background(w, h, centre) {
    ctx.fillStyle = '#141310';
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w * 0.5, h * 0.52, 0, w * 0.5, h * 0.52, Math.max(w, h) * 0.8);
    g.addColorStop(0, centre);
    g.addColorStop(1, 'rgba(7,6,4,0.96)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawLights(w, h, now, remaining) {
    background(w, h, 'rgba(32,27,20,0.55)');
    const m = lightsModel(remaining);
    unitNote.textContent = 'each point · ' + m.label;

    const units = m.units;
    const n = Math.floor(units);
    const frac = units - n;
    const count = clamp(n, 0, MAXP);

    updateDissolve(n, now);
    for (let i = dissolve.length - 1; i >= 0; i--) {
      if (now - dissolve[i].t0 >= dissolve[i].dur) dissolve.splice(i, 1);
    }

    const dr = reduced ? 0 : 1;
    const cx = w / 2 + dr * Math.sin(now * 0.00004) * w * 0.012;
    const cy = h * 0.57 + dr * Math.cos(now * 0.000031) * h * 0.010;
    const breath = reduced ? 1 : 1 + (vnoise(now * 0.00012, 4.2) - 0.5) * 0.03;
    const R = Math.min(w, h) * 0.46 * breath;

    const g = glowCtx(w, h);

    // the wide, hazy centre light this field gathers around
    blob(cx, cy, R * 0.62, 0.10, g);
    blob(cx, cy, R * 0.16, 0.42, g);

    // steady field — one motif, continuous size/opacity from a slow noise field
    for (let i = 0; i < count; i++) {
      const p = FIELD[i];
      const edge = 1 - clamp((p.rr - 0.80) / 0.20, 0, 1);   // thin out toward the rim
      if (edge <= 0) continue;
      const nz = vnoise(p.x * 2.6 + now * 0.00006, p.y * 2.6 - now * 0.00004);
      let a = (0.42 + 0.5 * nz) * edge;
      const r = 4.6 + 3.6 * nz;
      if (!reduced) a *= 0.82 + 0.18 * Math.sin(now * 0.0009 + p.ph);
      blob(cx + p.x * R, cy + p.y * R, r, a, g);
    }

    // frontier unit — continuous fade with the fraction, never a 1 s blink
    if (n >= 0 && n < MAXP) {
      const p = FIELD[n];
      const edge = 1 - clamp((p.rr - 0.80) / 0.20, 0, 1);
      let a = easeOut(frac) * 0.6 * edge;
      if (!reduced) a *= 0.82 + 0.18 * Math.sin(now * 0.0009 + p.ph);
      blob(cx + p.x * R, cy + p.y * R, 5.5, a, g);
    }

    // spent / condensing units — dissolve over 8–15 s with a little drift
    for (const d of dissolve) {
      const p = FIELD[d.idx];
      if (!p) continue;
      const t = clamp((now - d.t0) / d.dur, 0, 1);
      const k = d.dir < 0 ? (1 - easeOut(t)) : easeOut(t);
      const edge = 1 - clamp((p.rr - 0.80) / 0.20, 0, 1);
      blob(cx + (p.x + d.vx * t) * R, cy + (p.y + d.vy * t) * R,
           4.6 + 2.4 * t, k * 0.5 * Math.max(edge, 0.25), g);
    }

    bloomComposite();
  }

  function drawOrbit(w, h, now) {
    background(w, h, 'rgba(26,24,18,0.5)');
    const dr = reduced ? 0 : 1;
    const cx = w / 2 + dr * Math.sin(now * 0.00003) * w * 0.010;
    const cy = h * 0.575;
    const R = Math.min(w, h) * 0.34;
    const start = -Math.PI / 2, sweep = Math.PI * 1.6;
    const prog = progressAt(now);
    const pe = easeInOut(clamp(prog, 0, 1));
    const hue = lerp(36, 216, pe), sat = lerp(72, 42, pe), lit = lerp(60, 68, pe);

    // barely-there full path — still legible as an orbit
    ctx.strokeStyle = 'rgba(236,233,224,0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    // travelled arc — a slow warm -> cool hue drift along its length
    ctx.strokeStyle = `hsla(${hue.toFixed(1)}, ${sat.toFixed(1)}%, ${lit.toFixed(1)}%, 0.34)`;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, R, start, start + pe * sweep); ctx.stroke();

    // destination — a single hairline tick
    const de = start + sweep;
    ctx.strokeStyle = 'rgba(236,233,224,0.26)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(de) * (R - 5), cy + Math.sin(de) * (R - 5));
    ctx.lineTo(cx + Math.cos(de) * (R + 5), cy + Math.sin(de) * (R + 5));
    ctx.stroke();

    const g = glowCtx(w, h);
    const pulse = reduced ? 1 : 0.97 + 0.03 * Math.sin(now * 0.0011);

    // faint god-ray from the hero light — feathered radial, no seam
    const ray = g.createRadialGradient(cx, cy - R * 0.1, 0, cx, cy + R * 1.5, R * 1.7);
    ray.addColorStop(0, 'rgba(255,222,184,0.10)');
    ray.addColorStop(1, 'rgba(255,222,184,0)');
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = ray;
    g.fillRect(0, 0, w, h);
    g.restore();

    // hero central light: larger, hazier than the moving point
    blob(cx, cy, R * 0.95 * pulse, 0.09, g);
    blob(cx, cy, R * 0.42 * pulse, 0.24, g);
    blob(cx, cy, R * 0.12, 0.55, g);

    // moving point — small and quiet
    let ang, dotA;
    if (prog <= 1) { ang = start + pe * sweep; dotA = 1; }
    else {
      const over = Math.min(prog - 1, 1);
      ang = start + sweep + easeInOut(over) * (Math.PI * 2 - sweep);
      dotA = Math.max(0.2, 1 - (prog - 1));
    }
    const dx = cx + Math.cos(ang) * R, dy = cy + Math.sin(ang) * R;
    if (!reduced) {
      for (let k = 1; k <= 6; k++) {
        const a2 = ang - k * 0.02;
        blob(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R, 4.4, dotA * (1 - k / 6) * 0.16, g);
      }
    }
    blob(dx, dy, 7, dotA * 0.8, g);

    bloomComposite();

    ctx.globalAlpha = dotA;
    ctx.fillStyle = `hsla(${hue.toFixed(1)}, ${sat.toFixed(1)}%, 84%, 0.95)`;
    ctx.beginPath(); ctx.arc(dx, dy, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // --- HORIZON (Canvas2D fallback) --------------------------
  function drawHorizon(w, h, now) {
    const prog = progressAt(now);
    const p = clamp(prog, 0, 1);
    const pe = easeInOut(p);
    const hy = h * 0.80;                     // horizon dropped low

    // sky — a Rothko-ish stack of wide bands, darkening on an ease curve
    const sky = ctx.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0.00, mix('#141525', '#08080d', p));
    sky.addColorStop(0.42, mix('#1e1830', '#0e0b14', p));
    sky.addColorStop(0.72, mix('#3a2333', '#140d13', p));
    sky.addColorStop(0.90, mix('#8a4a3c', '#1c1210', p));
    sky.addColorStop(1.00, mix('#d98a52', '#241512', p));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, hy);

    const grd = ctx.createLinearGradient(0, hy, 0, h);
    grd.addColorStop(0, mix('#20160f', '#0a0908', p));
    grd.addColorStop(1, '#060505');
    ctx.fillStyle = grd;
    ctx.fillRect(0, hy, w, h - hy);

    const starA = clamp((prog - 0.1) / 0.5, 0, 1) * 0.7;
    if (starA > 0.01) {
      ctx.fillStyle = 'rgba(236,233,224,0.9)';
      for (const st of STARS) {
        let a = starA;
        if (!reduced) a *= 0.5 + 0.5 * Math.sin(now * 0.0016 + st.ph);
        ctx.globalAlpha = clamp(a, 0, 1);
        ctx.fillRect(st.x * w, st.y * hy, st.s, st.s);
      }
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = 'rgba(236,233,224,0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, hy + 0.5); ctx.lineTo(w, hy + 0.5); ctx.stroke();

    const sunX = w * (0.27 + 0.05 * pe);
    let sunY;
    if (prog <= 1) sunY = lerp(h * 0.12, hy, pe);
    else sunY = Math.min(hy + easeInOut(Math.min(prog - 1, 1)) * h * 0.2, h * 0.98);
    const gsize = Math.min(w, h) * (0.12 + 0.10 * pe);
    const sunA = prog <= 1 ? 1 : Math.max(0.12, 1.2 - (prog - 1));

    // feathered foreground glow — radial, full width: no vertical seam
    if (prog < 1.2) {
      const fa = 0.20 * sunA * (1 - p * 0.35);
      const fg = ctx.createRadialGradient(sunX, hy, 0, sunX, hy, gsize * 3.0);
      fg.addColorStop(0.0, `rgba(235,140,92,${fa})`);
      fg.addColorStop(0.5, `rgba(210,110,70,${fa * 0.4})`);
      fg.addColorStop(1.0, 'rgba(210,110,70,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(0, hy, w, h - hy);
    }

    blob(sunX, sunY, gsize, sunA);
    ctx.globalAlpha = sunA;
    ctx.fillStyle = 'rgba(255,241,220,0.96)';
    ctx.beginPath(); ctx.arc(sunX, sunY, Math.min(w, h) * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // --- HORIZON (raw WebGL) ---------------------------------
  const GL_VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';
  const GL_FRAG = [
    'precision highp float;',
    'uniform vec2  u_res;',
    'uniform float u_time;',
    'uniform vec2  u_sun;',
    'uniform float u_sunVis;',
    'uniform float u_night;',
    'uniform float u_horizon;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
    'float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);',
    ' return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),',
    '            mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}',
    'float fbm(vec2 p){float s=0.0,a=0.5;for(int k=0;k<4;k++){s+=a*vnoise(p);p*=2.03;a*=0.5;}return s;}',
    'float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715))));}',
    'vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/u_res;',
    ' float aspect=u_res.x/u_res.y;',
    ' vec2 sun=u_sun;',
    ' vec3 warm=vec3(1.0,0.58,0.30);',
    ' float hz=u_horizon;',
    ' float above=clamp((uv.y-hz)/max(1.0-hz,0.001),0.0,1.0);',
    ' float below=clamp((hz-uv.y)/max(hz,0.001),0.0,1.0);',
    ' float fog=1.0-exp(-above*2.4);',
    ' vec3 zenith=mix(vec3(0.055,0.065,0.115),vec3(0.010,0.012,0.022),u_night);',
    ' vec3 midc  =mix(vec3(0.230,0.140,0.190),vec3(0.030,0.024,0.040),u_night);',
    ' vec3 horiz =mix(vec3(0.900,0.470,0.290),vec3(0.090,0.055,0.055),u_night);',
    ' vec3 col=mix(horiz,midc,smoothstep(0.0,0.5,above));',
    ' col=mix(col,zenith,smoothstep(0.35,1.0,above));',
    ' col=mix(col,col*0.9+zenith*0.1,fog*0.3);',
    ' float sd=distance(vec2(uv.x*aspect,uv.y),vec2(sun.x*aspect,sun.y));',
    ' col+=warm*exp(-sd*3.2)*0.55*mix(0.5,1.0,u_night);',
    ' float haze=exp(-abs(uv.y-hz)*10.0);',
    ' col+=warm*haze*(0.10+0.06*fbm(vec2(uv.x*6.0,u_time*0.03)));',
    ' if(uv.y<hz){',
    '  vec3 gnd=mix(vec3(0.060,0.042,0.032),vec3(0.008,0.008,0.010),below);',
    '  gnd+=warm*exp(-sd*4.5)*0.12*(1.0-below);',
    '  col=gnd;',
    ' }',
    ' vec2 delta=(sun-uv)/32.0;',
    ' vec2 pos=uv;',
    ' float illum=1.0;',
    ' float rays=0.0;',
    ' for(int i=0;i<32;i++){',
    '  pos+=delta;',
    '  float d=distance(vec2(pos.x*aspect,pos.y),vec2(sun.x*aspect,sun.y));',
    '  float s=smoothstep(0.55,0.0,d)*step(hz,pos.y);',
    '  rays+=s*illum;',
    '  illum*=0.955;',
    ' }',
    ' rays/=32.0;',
    ' col+=warm*rays*0.6*mix(0.35,1.1,u_night);',
    ' if(uv.y>hz+0.04){',
    '  vec2 cell=floor(vec2(uv.x*aspect,uv.y)*140.0);',
    '  float r=hash(cell);',
    '  float star=smoothstep(0.9975,1.0,r);',
    '  float tw=0.75+0.25*sin(u_time*0.5+r*90.0);',
    '  col+=vec3(0.90,0.92,1.0)*star*u_night*tw*0.9;',
    ' }',
    ' float glow=exp(-sd*6.5)*0.9+exp(-sd*20.0)*0.7;',
    ' col+=warm*glow*u_sunVis;',
    ' float disc=smoothstep(0.045,0.028,sd);',
    ' col+=vec3(1.0,0.96,0.90)*disc*1.6*u_sunVis;',
    ' vec2 vc=uv-0.5;',
    ' col*=clamp(1.0-dot(vc,vc)*0.9,0.0,1.0);',
    ' col=aces(col*1.05);',
    ' float g1=ign(gl_FragCoord.xy+mod(u_time,137.0)*61.0)-0.5;',
    ' col+=g1*0.028;',
    ' col+=(ign(gl_FragCoord.xy+0.5)-0.5)/255.0;',
    ' gl_FragColor=vec4(col,1.0);',
    '}',
  ].join('\n');

  function glCompile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      try { console.warn('until: shader compile failed\n' + gl.getShaderInfoLog(sh)); } catch (e) {}
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function glInit() {
    if (!glCanvas || reduced) { glOK = false; return false; }
    const opts = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' };
    try {
      gl = glCanvas.getContext('webgl', opts) || glCanvas.getContext('experimental-webgl', opts);
    } catch (e) { gl = null; }
    if (!gl) { glOK = false; return false; }

    const vs = glCompile(gl.VERTEX_SHADER, GL_VERT);
    const fs = glCompile(gl.FRAGMENT_SHADER, GL_FRAG);
    if (!vs || !fs) { glOK = false; return false; }

    glProg = gl.createProgram();
    gl.attachShader(glProg, vs);
    gl.attachShader(glProg, fs);
    gl.linkProgram(glProg);
    if (!gl.getProgramParameter(glProg, gl.LINK_STATUS)) {
      try { console.warn('until: GL link failed\n' + gl.getProgramInfoLog(glProg)); } catch (e) {}
      glOK = false; return false;
    }
    gl.useProgram(glProg);

    glBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aLoc = gl.getAttribLocation(glProg, 'a');
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

    glLoc.time    = gl.getUniformLocation(glProg, 'u_time');
    glLoc.res     = gl.getUniformLocation(glProg, 'u_res');
    glLoc.sun     = gl.getUniformLocation(glProg, 'u_sun');
    glLoc.sunVis  = gl.getUniformLocation(glProg, 'u_sunVis');
    glLoc.night   = gl.getUniformLocation(glProg, 'u_night');
    glLoc.horizon = gl.getUniformLocation(glProg, 'u_horizon');

    glCanvas.addEventListener('webglcontextlost', onGLLost, false);
    glCanvas.addEventListener('webglcontextrestored', onGLRestored, false);

    glOK = true;
    glResize();
    return true;
  }

  function ensureGL() {
    if (glTried) return glOK && !glLost;
    glTried = true;
    return glInit();
  }

  function onGLLost(e) {
    e.preventDefault();
    glLost = true; glOK = false;
    document.body.classList.remove('gl-active');   // next frame falls back to Canvas2D horizon
  }
  function onGLRestored() {
    glLost = false; glOK = false; glProg = null; glTried = false;
    // re-initialised lazily on the next horizon frame
  }

  function glResize() {
    if (!gl) return;
    const cap = Math.min(window.devicePixelRatio || 1, 1.5);
    const scale = 0.66;                                   // render below native, upscale via CSS
    const w = Math.max(1, Math.round(window.innerWidth * scale * cap));
    const h = Math.max(1, Math.round(window.innerHeight * scale * cap));
    glCanvas.width = w;
    glCanvas.height = h;
    glCanvas.style.width = window.innerWidth + 'px';
    glCanvas.style.height = window.innerHeight + 'px';
    gl.viewport(0, 0, w, h);
  }

  function glHorizonUniforms(now) {
    const prog = progressAt(now);
    const p = clamp(prog, 0, 1);
    const pe = easeInOut(p);
    const horizonY = 0.20;
    let sunY;
    if (prog <= 1) sunY = lerp(0.90, horizonY, pe);       // uv y-up: top -> horizon
    else sunY = Math.max(horizonY - easeInOut(Math.min(prog - 1, 1)) * 0.17, 0.02);
    return {
      sunX: 0.27 + 0.05 * pe,
      sunY,
      sunVis: prog <= 1 ? 1 : Math.max(0, 1.2 - (prog - 1)),
      night: pe,
      horizonY,
    };
  }

  function glRender(now) {
    const u = glHorizonUniforms(now);
    gl.useProgram(glProg);
    gl.uniform1f(glLoc.time, (now / 1000) % 3600);        // wrapped, no float drift
    gl.uniform2f(glLoc.res, glCanvas.width, glCanvas.height);
    gl.uniform2f(glLoc.sun, u.sunX, u.sunY);
    gl.uniform1f(glLoc.sunVis, u.sunVis);
    gl.uniform1f(glLoc.night, u.night);
    gl.uniform1f(glLoc.horizon, u.horizonY);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // --- loop -----------------------------------------------
  function frame() {
    raf = requestAnimationFrame(frame);
    const now = Date.now();

    // reduced motion: still fully live, but repaint at a calm ~1 Hz
    if (reduced && lastDraw !== 0 && now - lastDraw < 1000) {
      updateText(now);
      return;
    }
    lastDraw = now;
    updateText(now);

    const w = window.innerWidth, h = window.innerHeight;

    // HORIZON via WebGL when it is available and motion is allowed
    if (mode === 'horizon' && !reduced && ensureGL()) {
      if (!document.body.classList.contains('gl-active')) document.body.classList.add('gl-active');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      glRender(now);
      return;
    }
    if (document.body.classList.contains('gl-active')) document.body.classList.remove('gl-active');

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const remaining = ev.target - now;
    if (mode === 'lights')      drawLights(w, h, now, remaining);
    else if (mode === 'orbit')  drawOrbit(w, h, now);
    else                        drawHorizon(w, h, now);    // WebGL failed / lost / reduced-motion
  }
  function startLoop() {
    stopLoop();
    lastDraw = 0;
    srKey = '';
    dlastN = -1;
    dissolve.length = 0;
    frame();
  }
  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // --- commit an event ----------------------------------
  function commit(name, dateStr, timeStr, animate) {
    if (!dateStr) {
      form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      dateIn.focus();
      return;
    }
    const t = new Date(dateStr + 'T' + (timeStr || '00:00'));
    if (isNaN(t.getTime())) { dateIn.focus(); return; }
    ev = { name: (name || '').trim() || 'Something', target: t.getTime(), createdAt: Date.now() };
    toResult(animate);
  }

  // --- shortcuts --------------------------------------
  const SHORTCUTS = {
    today() {
      const d = new Date(); d.setHours(23, 59, 0, 0);
      return ['End of today', d];
    },
    tomorrow() {
      const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0);
      return ['Tomorrow morning', d];
    },
    weekend() {
      const d = new Date();
      d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
      d.setHours(10, 0, 0, 0);
      if (d.getTime() < Date.now()) d.setDate(d.getDate() + 7);
      return ['The weekend', d];
    },
    newyear() {
      const d = new Date(new Date().getFullYear() + 1, 0, 1, 0, 0, 0, 0);
      return ['New Year', d];
    },
  };

  // --- wiring ---------------------------------------
  form.addEventListener('submit', e => {
    e.preventDefault();
    commit(nameIn.value, dateIn.value, timeIn.value, true);
  });

  $('#shortcuts').addEventListener('click', e => {
    const btn = e.target.closest('button[data-s]');
    if (!btn) return;
    const [label, d] = SHORTCUTS[btn.dataset.s]();
    const i = inputsFromDate(d);
    nameIn.value = label;
    dateIn.value = i.date;
    timeIn.value = i.time;
    commit(label, i.date, i.time, true);
  });

  modesEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-m]');
    if (b) setMode(b.dataset.m, true);
  });

  keepBtn.addEventListener('click', () => setAmbient(true));
  exitBtn.addEventListener('click', () => setAmbient(false));
  backBtn.addEventListener('click', toSetup);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && ambient) setAmbient(false);
  });
  window.addEventListener('mousemove', () => { if (ambient) flashExit(); }, { passive: true });
  window.addEventListener('touchstart', () => { if (ambient) flashExit(); }, { passive: true });

  window.addEventListener('resize', () => {
    if (!resultEl.hidden) { resizeCanvas(); lastDraw = 0; }
  });

  // --- init -------------------------------------
  (function init() {
    const now = new Date();
    const def = new Date(now.getTime());
    def.setHours(19, 0, 0, 0);
    if (def.getTime() < now.getTime()) def.setDate(def.getDate() + 1);
    const di = inputsFromDate(def);
    dateIn.value = di.date;
    timeIn.value = di.time;

    const stored = load();
    if (stored) {
      ev = { name: stored.name, target: stored.target, createdAt: stored.createdAt };
      mode = stored.mode;
      const i = inputsFromDate(new Date(ev.target));
      nameIn.value = ev.name;
      dateIn.value = i.date;
      timeIn.value = i.time;
      toResult(false);
    }
  })();
})();
