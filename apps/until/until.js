/* Until — a calm countdown. Tier 1: pure static, no network, no deps. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'until.event.v1';

  // --- elements --------------------------------------------------------
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

  // --- state ---------------------------------------------------------
  let ev = null;            // { name, target (ms), createdAt (ms) }
  let mode = 'lights';
  let ambient = false;
  let raf = 0;
  let lastDraw = 0;
  let srKey = '';
  let dpr = 1;
  let exitTimer = 0;

  // --- soft glow sprite (drawn once, blitted many times) ------------
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  {
    const s = sprite.getContext('2d');
    const g = s.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0.00, 'rgba(255,244,228,1)');
    g.addColorStop(0.22, 'rgba(255,214,176,0.70)');
    g.addColorStop(0.55, 'rgba(232,134,90,0.24)');
    g.addColorStop(1.00, 'rgba(232,134,90,0)');
    s.fillStyle = g;
    s.fillRect(0, 0, 64, 64);
  }
  function blob(x, y, r, a) {
    if (a <= 0) return;
    ctx.globalAlpha = a > 1 ? 1 : a;
    ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  // --- procedural point field (phyllotaxis on a unit disc) ----------
  const FIELD = [];
  (() => {
    const N = 440, GA = Math.PI * (3 - Math.sqrt(5));
    const h = n => { const v = Math.sin(n * 127.1) * 43758.545; return v - Math.floor(v); };
    for (let i = 0; i < N; i++) {
      const r = Math.sqrt((i + 0.5) / N);
      const a = i * GA;
      FIELD.push({
        x: Math.cos(a) * r + (h(i) * 2 - 1) * 0.018,
        y: Math.sin(a) * r + (h(i + 7777) * 2 - 1) * 0.018,
        ph: h(i + 3) * Math.PI * 2,
      });
    }
  })();

  // --- stars for the horizon scene ---------------------------------
  const STARS = [];
  (() => {
    const h = n => { const v = Math.sin(n * 78.233) * 43758.545; return v - Math.floor(v); };
    for (let i = 0; i < 70; i++) {
      STARS.push({ x: h(i), y: h(i + 50) * 0.6, ph: h(i + 9) * Math.PI * 2, s: 0.5 + h(i + 3) * 1.1 });
    }
  })();

  // --- helpers -----------------------------------------------------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const hex   = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
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
    evValue.textContent = str;
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
        if (abs / LADDER[k][1] <= 400) { idx = k; break; }
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
  }

  // --- scenes ---------------------------------------------
  function background(w, h, centre) {
    ctx.fillStyle = '#16150f';
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h * 0.5, 0, w / 2, h * 0.5, Math.max(w, h) * 0.78);
    g.addColorStop(0, centre);
    g.addColorStop(1, 'rgba(9,8,6,0.92)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawLights(w, h, now, remaining) {
    background(w, h, 'rgba(34,29,21,0.55)');
    const m = lightsModel(remaining);
    unitNote.textContent = 'each point · ' + m.label;

    const MAX = 400;
    const n = Math.floor(m.units);
    const frac = m.units - n;
    const cx = w / 2, cy = h * 0.55, R = Math.min(w, h) * 0.44;
    const count = Math.min(n, MAX);

    for (let i = 0; i < count; i++) {
      const p = FIELD[i];
      let a = 0.9;
      if (!reduced) a *= 0.72 + 0.28 * Math.sin(now * 0.0011 + p.ph);
      blob(cx + p.x * R, cy + p.y * R, 7, a);
    }
    if (n < MAX) {                             // the frontier point: fades out (future) / in (past)
      const p = FIELD[Math.max(0, n)];
      let a = frac * 0.9;
      if (!reduced) a *= 0.72 + 0.28 * Math.sin(now * 0.0011 + p.ph);
      blob(cx + p.x * R, cy + p.y * R, 7, a);
    }
  }

  function drawOrbit(w, h, now) {
    background(w, h, 'rgba(28,26,20,0.5)');
    const cx = w / 2, cy = h * 0.55, R = Math.min(w, h) * 0.34;
    const start = -Math.PI / 2, sweep = Math.PI * 1.6;
    const prog = progressAt(now);

    ctx.strokeStyle = 'rgba(236,233,224,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    const p = clamp(prog, 0, 1);
    ctx.strokeStyle = 'rgba(232,134,90,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, start, start + p * sweep); ctx.stroke();

    const de = start + sweep;                  // understated destination tick
    ctx.strokeStyle = 'rgba(236,233,224,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(de) * (R - 8), cy + Math.sin(de) * (R - 8));
    ctx.lineTo(cx + Math.cos(de) * (R + 8), cy + Math.sin(de) * (R + 8));
    ctx.stroke();

    const pulse = reduced ? 1 : 0.94 + 0.06 * Math.sin(now * 0.0016);
    blob(cx, cy, Math.min(w, h) * 0.16 * pulse, 0.5);
    ctx.fillStyle = 'rgba(255,240,220,0.9)';
    ctx.beginPath(); ctx.arc(cx, cy, Math.min(w, h) * 0.02, 0, Math.PI * 2); ctx.fill();

    let ang, dotA;
    if (prog <= 1) { ang = start + prog * sweep; dotA = 1; }
    else {
      const over = Math.min(prog - 1, 1);
      ang = start + sweep + over * (Math.PI * 2 - sweep);
      dotA = Math.max(0.22, 1 - (prog - 1));
    }
    const dx = cx + Math.cos(ang) * R, dy = cy + Math.sin(ang) * R;
    if (!reduced) {
      for (let k = 1; k <= 9; k++) {
        const a2 = ang - k * 0.028;
        blob(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R, 6, dotA * (1 - k / 9) * 0.35);
      }
    }
    blob(dx, dy, 11, dotA);
    ctx.globalAlpha = dotA;
    ctx.fillStyle = 'rgba(255,244,230,0.95)';
    ctx.beginPath(); ctx.arc(dx, dy, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawHorizon(w, h, now) {
    const prog = progressAt(now);
    const p = clamp(prog, 0, 1);
    const hy = h * 0.72;

    const sky = ctx.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0.00, mix('#12131f', '#09090e', p));
    sky.addColorStop(0.62, mix('#241a24', '#140e12', p));
    sky.addColorStop(1.00, mix('#c9744a', '#1b1210', p));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, hy);

    const grd = ctx.createLinearGradient(0, hy, 0, h);
    grd.addColorStop(0, mix('#241a15', '#0c0a09', p));
    grd.addColorStop(1, '#080706');
    ctx.fillStyle = grd;
    ctx.fillRect(0, hy, w, h - hy);

    const starA = clamp((prog - 0.12) / 0.55, 0, 1) * 0.75;
    if (starA > 0.01) {
      ctx.fillStyle = 'rgba(236,233,224,0.9)';
      for (const st of STARS) {
        let a = starA;
        if (!reduced) a *= 0.55 + 0.45 * Math.sin(now * 0.002 + st.ph);
        ctx.globalAlpha = clamp(a, 0, 1);
        ctx.fillRect(st.x * w, st.y * hy, st.s, st.s);
      }
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = 'rgba(236,233,224,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, hy + 0.5); ctx.lineTo(w, hy + 0.5); ctx.stroke();

    const sunX = w * (0.30 + 0.06 * p);
    let sunY;
    if (prog <= 1) sunY = lerp(h * 0.15, hy, prog);
    else sunY = Math.min(hy + (prog - 1) * h * 0.22, h * 0.98);
    const gsize = Math.min(w, h) * (0.13 + 0.10 * p);
    const sunA = prog <= 1 ? 1 : Math.max(0.12, 1.25 - (prog - 1));

    if (prog < 1.15) {
      const rg = ctx.createLinearGradient(0, hy, 0, h);
      rg.addColorStop(0, `rgba(232,134,90,${0.16 * sunA * (1 - p * 0.4)})`);
      rg.addColorStop(1, 'rgba(232,134,90,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(sunX - gsize, hy, gsize * 2, h - hy);
    }
    blob(sunX, sunY, gsize, sunA);
    ctx.globalAlpha = sunA;
    ctx.fillStyle = 'rgba(255,241,220,0.96)';
    ctx.beginPath(); ctx.arc(sunX, sunY, Math.min(w, h) * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // --- loop -------------------------------------------------
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const remaining = ev.target - now;
    if (mode === 'lights')      drawLights(w, h, now, remaining);
    else if (mode === 'orbit')  drawOrbit(w, h, now);
    else                        drawHorizon(w, h, now);
  }
  function startLoop() {
    stopLoop();
    lastDraw = 0;
    srKey = '';
    frame();
  }
  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // --- commit an event ------------------------------------
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

  // --- shortcuts ----------------------------------------
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

  // --- wiring -----------------------------------------
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

  // --- init ---------------------------------------
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
