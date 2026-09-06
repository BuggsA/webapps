/* ==========================================================================
   Tonight — Phase 1: skeleton.

   Location (device -> search -> remembered), the horizon canvas with
   drag-to-turn, the time model (now / play / scrub), and the sky gradient
   driven by the sun's altitude. Bodies, stars, weather and the full look
   come in later phases; the structure here is built to take them.

   ART DIRECTION: NOCTURNE (+ two borrows: a graticule that shows only during
   a drag, a leader line only on selection). See docs/tonight-art-direction.md
   and run its per-phase checklist before every commit. The gradient is the
   interface; colour is derived in OKLCH from sun altitude; the horizon is a
   seam, not a line; motion is continuous cross-fade, never a cut.

   Model:  state = { lat, lon, place, t, viewAz, playing }
           t is the master variable — everything visual derives from it
           plus (lat, lon). viewAz is presentation only (facing direction).
   ========================================================================== */
'use strict';

const A = window.Astronomy;

/* --- tunables --------------------------------------------------------- */
const HFOV      = 110;      // horizontal field of view, degrees
const ALT_TOP   = 80;       // altitude mapped to the top of the canvas
const HORIZON_F = 0.72;     // horizon sits this far down the canvas
const PLAY_RATE = 60;       // sim seconds advanced per real second when playing
const COMPUTE_MS = 500;     // recompute slow-moving bodies at ~2 Hz
const LS_KEY    = 'tonight.place.v1';
const REDUCED   = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- state ---------------------------------------------------------------- */
const state = {
  lat: null, lon: null, place: '',
  tz: Intl.DateTimeFormat().resolvedOptions().timeZone,  // IANA zone of the PLACE
  t: new Date(),
  viewAz: 180,              // start facing due south
  playing: false,
  dusk: null, dawn: null,   // civil-twilight bounds for the scrub, for t's day
};

/* --- element handles ------------------------------------------------- */
const el = {
  canvas:   document.getElementById('sky'),
  locate:   document.getElementById('locate'),
  form:     document.getElementById('place-form'),
  input:    document.getElementById('place-input'),
  results:  document.getElementById('place-results'),
  useDevice:document.getElementById('use-device'),
  msg:      document.getElementById('locate-msg'),
  controls: document.getElementById('controls'),
  placard:  document.getElementById('placard'),
  btnNow:   document.getElementById('btn-now'),
  btnPlay:  document.getElementById('btn-play'),
  scrub:    document.getElementById('scrub'),
  clock:    document.getElementById('clock'),
  btnWhere: document.getElementById('btn-where'),
};
const ctx = el.canvas.getContext('2d');

/* --- canvas sizing (DPR-aware) ------------------------------------------- */
let W = 0, H = 0, horizonY = 0, dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = el.canvas.clientWidth;
  H = el.canvas.clientHeight;
  horizonY = Math.round(H * HORIZON_F);
  el.canvas.width  = Math.round(W * dpr);
  el.canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);

/* --- small math -------------------------------------------------------- */
const clamp  = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp   = (a, b, u) => a + (b - a) * u;
const wrap360 = d => ((d % 360) + 360) % 360;
const wrap180 = d => { d = wrap360(d); return d > 180 ? d - 360 : d; };

/* --- astronomy glue -------------------------------------------------- */
let _obs = null, _obsKey = '';
function observer() {
  const key = state.lat + ',' + state.lon;
  if (key !== _obsKey) { _obs = new A.Observer(state.lat, state.lon, 0); _obsKey = key; }
  return _obs;
}
// equatorial -> horizontal for a body at a given instant. Reused for the
// moon and planets in Phase 2.
function altaz(body, date) {
  const eq = A.Equator(body, date, observer(), true, true);
  const h  = A.Horizon(date, observer(), eq.ra, eq.dec, 'normal');
  return { alt: h.altitude, az: h.azimuth };
}

/* --- sky colour: an OKLCH field derived from sun altitude --------------
   NOCTURNE: the field IS the interface. Colour is derived here from the
   sun-altitude model — never hand-picked as sRGB. Anchors are written in
   OKLCH [L 0..1, C, hue deg] for legibility, but interpolation happens in
   OKLab (rectangular): a warm→cool dusk transition then passes through a
   naturalistic low-chroma neutral instead of swinging through magenta.   */
const SKY = [
  { alt:  90, zen: [0.55, 0.110, 245], hor: [0.82, 0.050, 235] }, // full day
  { alt:  10, zen: [0.50, 0.115, 248], hor: [0.78, 0.075, 236] }, // low day
  { alt:   0, zen: [0.42, 0.085, 255], hor: [0.68, 0.125,  62] }, // sunset gold
  { alt:  -4, zen: [0.33, 0.080, 258], hor: [0.52, 0.120,  42] }, // golden / rose
  { alt:  -6, zen: [0.27, 0.070, 260], hor: [0.42, 0.100,  34] }, // civil ember
  { alt: -12, zen: [0.155, 0.050, 258], hor: [0.205, 0.055, 250] }, // nautical blue
  { alt: -18, zen: [0.085, 0.028, 260], hor: [0.115, 0.033, 252] }, // astronomical
  { alt: -90, zen: [0.052, 0.016, 258], hor: [0.072, 0.020, 250] }, // deep night
];

// OKLab -> sRGB (Björn Ottosson's matrices), clamped 0..255. No deps.
function oklabToRgb(L, a, b) {
  let l = L + 0.3963377774 * a + 0.2158037573 * b;
  let m = L - 0.1055613458 * a - 0.0638541728 * b;
  let s = L - 0.0894841775 * a - 1.2914855480 * b;
  l = l * l * l; m = m * m * m; s = s * s * s;
  const lin = [
     4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
  return lin.map(v => {
    v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
    return clamp(Math.round(v * 255), 0, 255);
  });
}
const lchToLab = ([L, C, h]) => { const r = h * Math.PI / 180; return [L, C * Math.cos(r), C * Math.sin(r)]; };
const rgb   = a => `rgb(${a[0]},${a[1]},${a[2]})`;
const blend = (a, b, u) => [0, 1, 2].map(c => Math.round(lerp(a[c], b[c], u)));

// sun altitude -> derived field colours (interpolated in OKLab)
function skyColors(sunAlt) {
  let hi = SKY[0], lo = SKY[SKY.length - 1];
  for (let i = 0; i < SKY.length - 1; i++) {
    if (sunAlt <= SKY[i].alt && sunAlt >= SKY[i + 1].alt) { hi = SKY[i]; lo = SKY[i + 1]; break; }
  }
  const u = clamp((hi.alt - sunAlt) / (hi.alt - lo.alt || 1), 0, 1);
  const mix = k => {
    const a = lchToLab(hi[k]), b = lchToLab(lo[k]);
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  };
  const z = mix('zen'), hz = mix('hor');
  // below the horizon: same family, darker + desaturated + a touch cooler —
  // a temperature change, not a black fill. No hard line anywhere.
  const gd = [hz[0] * 0.58, hz[1] * 0.45, hz[2] * 0.45 - 0.006];
  return {
    zenLab: z, horLab: hz, grdLab: gd,
    zen: oklabToRgb(z[0], z[1], z[2]),
    hor: oklabToRgb(hz[0], hz[1], hz[2]),
    grd: oklabToRgb(gd[0], gd[1], gd[2]),
  };
}
const labLerp = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
// OKLCH wrapper — still handy for the one hand-placed warm glow colour
const oklchToRgb = (L, C, h) => oklabToRgb(...lchToLab([L, C, h]));

/* --- projection ------------------------------------------------------- */
// (alt, az) in degrees -> canvas point, plus whether it's on screen.
function project(alt, az) {
  const daz = wrap180(az - state.viewAz);
  const x = W / 2 + (daz / HFOV) * W;
  const y = horizonY - (alt / ALT_TOP) * horizonY;
  return { x, y, daz, visible: Math.abs(daz) < HFOV / 2 + 10 && alt > -3 };
}

/* --- grain: static, baked once, low opacity ------------------------- */
let grainPat = null;
function makeGrain() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const img = g.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 116 + Math.random() * 24;           // low-contrast grey noise
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainPat = ctx.createPattern(c, 'repeat');
}
function paintGrain() {
  if (!grainPat) return;
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = grainPat;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* --- paint the field -------------------------------------------------- */
let sun = { alt: 90, az: 180 };
let field = skyColors(90);

function paintField() {
  field = skyColors(sun.alt);
  const glow = clamp(1 - Math.abs(sun.alt + 5) / 16, 0, 1);   // afterglow strength

  // zenith -> horizon -> a short way under the horizon, sampled in OKLab
  // across many stops so the ramp never bands.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const p = i / N;                              // 0 at top .. 1 at bottom
    let lab;
    if (p <= HORIZON_F) lab = labLerp(field.zenLab, field.horLab, p / HORIZON_F);
    else                lab = labLerp(field.horLab, field.grdLab,
                                      (p - HORIZON_F) / (1 - HORIZON_F));
    g.addColorStop(p, rgb(oklabToRgb(lab[0], lab[1], lab[2])));
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // afterglow pooled toward the sun's azimuth, strongest around alt 0..-10
  if (glow > 0.01) {
    const gx = clamp(project(0, sun.az).x, -0.4 * W, 1.4 * W);
    const warm = oklchToRgb(0.72, 0.145, 52);
    const rgG = ctx.createRadialGradient(gx, horizonY, 0, gx, horizonY, W * 0.85);
    rgG.addColorStop(0, `rgba(${warm[0]},${warm[1]},${warm[2]},${0.34 * glow})`);
    rgG.addColorStop(1, `rgba(${warm[0]},${warm[1]},${warm[2]},0)`);
    ctx.fillStyle = rgG;
    ctx.fillRect(0, horizonY - H * 0.5, W, H);
  }

  // the seam: the horizon is a soft brighter band, never a drawn line
  const sc = blend(field.hor, [255, 255, 255], 0.16);
  const seam = ctx.createLinearGradient(0, horizonY - 24, 0, horizonY + 12);
  seam.addColorStop(0,   `rgba(${sc[0]},${sc[1]},${sc[2]},0)`);
  seam.addColorStop(0.62, `rgba(${sc[0]},${sc[1]},${sc[2]},${0.09 + 0.11 * glow})`);
  seam.addColorStop(1,   `rgba(${sc[0]},${sc[1]},${sc[2]},0)`);
  ctx.fillStyle = seam;
  ctx.fillRect(0, horizonY - 24, W, 36);

  // a breath of vignette — weight the frame low, keep the edges quiet
  const vg = ctx.createRadialGradient(W / 2, H * 0.62, Math.min(W, H) * 0.2,
                                      W / 2, H * 0.62, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

/* --- graticule: alt/az scaffold, visible ONLY during a drag ---------- */
const DIRS = [
  { az: 0, s: 'N' }, { az: 45, s: 'NE' }, { az: 90, s: 'E' }, { az: 135, s: 'SE' },
  { az: 180, s: 'S' }, { az: 225, s: 'SW' }, { az: 270, s: 'W' }, { az: 315, s: 'NW' },
];
const GFONT = '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
let gratT = 0, gratTarget = 0;   // eased 0..1 — fast in on drag, slow out after

function paintGraticule() {
  if (gratT < 0.012) return;
  const k = gratT;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.textBaseline = 'alphabetic';

  // faint horizon reference — only here, never at rest
  ctx.strokeStyle = `rgba(255,255,255,${0.13 * k})`;
  ctx.beginPath(); ctx.moveTo(0, horizonY + 0.5); ctx.lineTo(W, horizonY + 0.5); ctx.stroke();

  // compass ticks + labels along the horizon
  ctx.textAlign = 'center';
  for (const d of DIRS) {
    const p = project(0, d.az);
    if (!p.visible) continue;
    const major = d.s.length === 1;
    ctx.strokeStyle = `rgba(255,255,255,${(major ? 0.34 : 0.18) * k})`;
    ctx.beginPath();
    ctx.moveTo(p.x, horizonY - (major ? 9 : 5));
    ctx.lineTo(p.x, horizonY + (major ? 9 : 5));
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${(major ? 0.62 : 0.34) * k})`;
    ctx.font = `${major ? 13 : 11}px ${GFONT}`;
    ctx.fillText(d.s, p.x, horizonY + (major ? 25 : 19));
  }

  // altitude scale up the left edge (borrowed from Signal)
  ctx.textAlign = 'left';
  ctx.font = `11px ${GFONT}`;
  for (const a of [30, 60]) {
    const y = horizonY - (a / ALT_TOP) * horizonY;
    ctx.strokeStyle = `rgba(255,255,255,${0.15 * k})`;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(18, y); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.4 * k})`;
    ctx.fillText(a + '°', 22, y + 4);
  }
  ctx.restore();
}

/* --- the loop ---------------------------------------------------------- */
let lastFrame = 0, lastCompute = 0, running = false;
function frame(now) {
  if (!running) return;
  const dtReal = lastFrame ? (now - lastFrame) / 1000 : 0;
  lastFrame = now;

  if (state.playing) {
    state.t = new Date(state.t.getTime() + dtReal * PLAY_RATE * 1000);
    if (state.t >= state.dawn) { state.t = new Date(state.dawn); setPlaying(false); }
    syncScrubFromT();
    updateClock();
  }

  if (now - lastCompute >= COMPUTE_MS || !lastCompute) {
    lastCompute = now;
    sun = altaz(A.Body.Sun, state.t);
  }

  // graticule ease: fast in on drag, slow out after; snaps if reduced-motion
  if (REDUCED) gratT = gratTarget;
  else gratT += (gratTarget - gratT) * clamp(dtReal * (gratTarget > gratT ? 15 : 4), 0, 1);

  ctx.clearRect(0, 0, W, H);
  paintField();
  paintGraticule();
  paintGrain();

  requestAnimationFrame(frame);
}
function startLoop() {
  if (running) return;
  running = true; lastFrame = 0; lastCompute = 0;
  requestAnimationFrame(frame);
}

/* --- drag to turn ---------------------------------------------------- */
let drag = null;
el.canvas.addEventListener('pointerdown', e => {
  drag = { x: e.clientX, az: state.viewAz };
  el.canvas.setPointerCapture(e.pointerId);
  el.canvas.classList.add('dragging');
  gratTarget = 1;                       // fade the alt/az scaffold in
});
el.canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  state.viewAz = wrap360(drag.az - dx * (HFOV / W));  // drag right -> turn left
});
function endDrag(e) {
  if (!drag) return;
  drag = null;
  el.canvas.classList.remove('dragging');
  gratTarget = 0;                       // and fade it back out
  try { el.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
}
el.canvas.addEventListener('pointerup', endDrag);
el.canvas.addEventListener('pointercancel', endDrag);

/* --- time model ---------------------------------------------------------- */
function setPlaying(on) {
  state.playing = on;
  el.btnPlay.setAttribute('aria-pressed', String(on));
  el.btnPlay.querySelector('.ctl-play-t').textContent = on ? 'Pause' : 'Play';
}
function computeDuskDawn() {
  // Anchor the search so we always get THIS night's dusk and the next dawn,
  // whether the app opened in the evening or after midnight. tz-independent.
  let anchor = new Date(state.t);
  try {
    if (altaz(A.Body.Sun, state.t).alt < -6) anchor = new Date(state.t.getTime() - 12 * 3600e3);
  } catch (_) {}
  let dusk = null, dawn = null;
  try {
    const d = A.SearchAltitude(A.Body.Sun, observer(), -1, anchor, 1.5, -6);
    if (d) {
      dusk = d.date;
      const w = A.SearchAltitude(A.Body.Sun, observer(), +1, dusk, 1, -6);
      if (w) dawn = w.date;
    }
  } catch (_) {}
  state.dusk = dusk || new Date(anchor.getTime() + 6 * 3600e3);
  state.dawn = dawn || new Date(state.dusk.getTime() + 10 * 3600e3);
}
function syncScrubFromT() {
  const span = state.dawn - state.dusk;
  const u = span > 0 ? (state.t - state.dusk) / span : 0;
  el.scrub.value = String(Math.round(clamp(u, 0, 1) * 1000));
}
// date/time parts in the PLACE's timezone (not the viewer's)
function tzParts(d) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: state.tz, year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).reduce((o, p) => (o[p.type] = p.value, o), {});
}
const dayKey = p => `${p.year}-${p.month}-${p.day}`;

function updateClock() {
  const p = tzParts(state.t);
  let s = `${p.weekday} ${p.hour}:${p.minute}`;
  if (dayKey(p) > dayKey(tzParts(new Date()))) s = '+1 ' + s;  // rolled past midnight
  el.clock.value = s;
  updatePlacard();
}

let _placardDay = '';
function updatePlacard() {
  el.placard.querySelector('.placard-place').textContent = state.place || 'Here';
  const k = dayKey(tzParts(state.t));
  if (k === _placardDay) return;                   // date-line changes rarely
  _placardDay = k;
  el.placard.querySelector('.placard-sub').textContent =
    new Intl.DateTimeFormat(undefined, { timeZone: state.tz, day: 'numeric', month: 'long' })
      .format(state.t);
}
el.btnNow.addEventListener('click', () => {
  setPlaying(false);
  state.t = new Date();
  computeDuskDawn();
  syncScrubFromT();
  updateClock();
});
el.btnPlay.addEventListener('click', () => {
  if (!state.playing && state.t >= state.dawn) state.t = new Date(state.dusk);
  setPlaying(!state.playing);
});
el.scrub.addEventListener('input', () => {
  setPlaying(false);
  const u = Number(el.scrub.value) / 1000;
  state.t = new Date(state.dusk.getTime() + u * (state.dawn - state.dusk));
  updateClock();
});

/* --- location ---------------------------------------------------------- */
function savePlace() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      lat: state.lat, lon: state.lon, place: state.place, tz: state.tz,
    }));
  } catch (_) {}
}
function loadPlace() {
  try {
    const p = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (p && Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
      state.lat = p.lat; state.lon = p.lon; state.place = p.place || '';
      if (p.tz) state.tz = p.tz;
      return true;
    }
  } catch (_) {}
  return false;
}

function showLocate(show) {
  el.locate.hidden = !show;
  el.controls.hidden = show;
  el.placard.hidden = show;
  if (show) { el.input.value = ''; el.results.hidden = true; el.msg.hidden = true; el.input.focus(); }
}
function say(text) { el.msg.textContent = text; el.msg.hidden = !text; }

async function geocode(name) {
  const url = 'https://geocoding-api.open-meteo.com/v1/search'
    + '?name=' + encodeURIComponent(name) + '&count=5&language=en&format=json';
  const r = await fetch(url);
  if (!r.ok) throw new Error('geocode ' + r.status);
  const j = await r.json();
  return (j.results || []).map(x => ({
    lat: x.latitude, lon: x.longitude, tz: x.timezone,
    name: x.name,
    sub: [x.admin1, x.country].filter(Boolean).join(', '),
  }));
}
function renderResults(list) {
  el.results.innerHTML = '';
  if (!list.length) { el.results.hidden = true; return; }
  for (const item of list) {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.innerHTML = `<span class="p-name"></span> <span class="p-sub"></span>`;
    li.querySelector('.p-name').textContent = item.name;
    li.querySelector('.p-sub').textContent = item.sub;
    li.addEventListener('click', () => enter(item.lat, item.lon, item.name, item.tz));
    el.results.appendChild(li);
  }
  el.results.hidden = false;
}

let searchSeq = 0;
el.input.addEventListener('input', () => {
  const q = el.input.value.trim();
  const mine = ++searchSeq;
  if (q.length < 2) { el.results.hidden = true; return; }
  clearTimeout(el.input._t);
  el.input._t = setTimeout(async () => {
    try {
      const list = await geocode(q);
      if (mine === searchSeq) renderResults(list);
    } catch (_) { if (mine === searchSeq) say('Search is offline — try "Use my location".'); }
  }, 250);
});
el.form.addEventListener('submit', async e => {
  e.preventDefault();
  const q = el.input.value.trim();
  if (q.length < 2) return;
  say('Searching…');
  try {
    const list = await geocode(q);
    say('');
    if (list.length === 1) enter(list[0].lat, list[0].lon, list[0].name, list[0].tz);
    else renderResults(list);
  } catch (_) { say('Search is offline — try "Use my location".'); }
});
el.useDevice.addEventListener('click', () => {
  if (!navigator.geolocation) { say('This device has no location service.'); return; }
  say('Asking your device…');
  navigator.geolocation.getCurrentPosition(
    pos => { say(''); enter(pos.coords.latitude, pos.coords.longitude, 'My location'); },
    err => say(err.code === err.PERMISSION_DENIED
      ? 'Location permission denied — search for a place instead.'
      : 'Could not get your location — search for a place instead.'),
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
  );
});
el.btnWhere.addEventListener('click', () => showLocate(true));

/* --- entry ----------------------------------------------------------- */
function enter(lat, lon, place, tz) {
  state.lat = lat; state.lon = lon; state.place = place || '';
  // tz of the place; device location has none -> fall back to the viewer's
  state.tz = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  _placardDay = '';
  savePlace();
  showLocate(false);
  resize();
  if (!state.playing) state.t = new Date();
  computeDuskDawn();
  syncScrubFromT();
  updateClock();
  startLoop();
}

function init() {
  resize();
  makeGrain();
  setPlaying(false);
  if (loadPlace()) enter(state.lat, state.lon, state.place, state.tz);
  else showLocate(true);
}

if (!A || !A.Observer) {
  document.body.innerHTML =
    '<p style="padding:2rem;font-family:sans-serif">Tonight needs its astronomy '
    + 'library (lib/astronomy.js) and it did not load.</p>';
} else {
  init();
}
