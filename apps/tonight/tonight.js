/* ==========================================================================
   Tonight — the sky above you, as a horizon panorama.

   Built so far (see docs/tonight-build-plan.md): Phase 1 — location, the
   horizon canvas with drag-to-turn, the time model (now / play / scrub);
   Phase 2 — the moon (phase + lit orientation), the five naked-eye planets,
   tap-to-select with a tethered card. Stars, the Milky Way, weather and the
   final look come next; the structure here is built to take them.

   ART DIRECTION: NOCTURNE (+ two borrows: a graticule that shows only during
   a drag, a leader line only on selection). See docs/tonight-art-direction.md
   — including its CHROME and PALETTE sections — and run its per-phase
   checklist before every commit. The field is the interface: a film-curve
   palette over a structured, azimuth-aware scene-luminance; the horizon is a
   seam, not a line; texture is seeded per night; motion is continuous.

   Model:  state = { lat, lon, tz, place, t, viewAz, playing, located }
           t is the master variable — everything visual derives from it
           plus (lat, lon). viewAz is presentation only (facing direction).

   MAP OF THIS FILE (search the ALL-CAPS tag to jump):
     TUNABLES / STATE / ELEMENTS / CANVAS SIZING / SMALL MATH
     ASTRONOMY GLUE      — observer(), altaz()  (equatorial -> horizontal via the lib)
     SKY COLOUR          — FILM curve, sceneLum (azimuth-aware), daySky, skyColor
     SEEDED CONDITIONS   — xmur3/mulberry32, value noise, bakeConditions()
     GRAIN / DITHER / MOTTLE
     PAINT THE FIELD     — paintField(): base gradient + glow/halation + belt/shadow
                           + airglow + seam + scrim; setChromeVars, syncBrowserChrome
     GRATICULE           — drag-only alt/az scaffold
     STARS + MILKY WAY   — loadStars(), buildMilkyWay(), eqAltAz() (hand-rolled LST),
                           paintMilkyWay() (puffs + rift), paintStars() (dust)
     BODIES              — recomputeBodies(), paintPlanets(), paintMoon() (phase)
     TAP TO SELECT       — pickObject/bodyRef/starRef, openCard/updateCardText,
                           advice(), paintLeader()
     THE LOOP            — frame(); startLoop(); visibilitychange restart
     INPUT               — drag to turn, tap to select, arrow keys / Esc
     TIME MODEL          — computeDuskDawn, scrub, tzParts, updateClock, placard
     LOCATION            — geocode, results, device, savePlace/loadPlace
     ENTRY               — enter(), init()
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
  located: false,           // false until a place is chosen (sky still renders)
  dusk: null, dawn: null,   // civil-twilight bounds for the scrub, for t's day
};

/* --- element handles ------------------------------------------------- */
const el = {
  canvas:   document.getElementById('sky'),
  locate:   document.getElementById('locate'),   // this element IS the <form>
  input:    document.getElementById('place-input'),
  results:  document.getElementById('place-results'),
  useDevice:document.getElementById('use-device'),
  msg:      document.getElementById('locate-msg'),
  controls: document.getElementById('controls'),
  placard:  document.getElementById('placard'),
  card:     document.getElementById('card'),
  btnNow:   document.getElementById('btn-now'),
  btnPlay:  document.getElementById('btn-play'),
  scrub:    document.getElementById('scrub'),
  clock:    document.getElementById('clock'),
  btnWhere: document.getElementById('btn-where'),
};
const ctx = el.canvas.getContext('2d');
const root = document.documentElement;

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
  bakeGrainLayer();                 // grain envelope is size-dependent
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
const rgb    = a => `rgb(${a[0]},${a[1]},${a[2]})`;
const blend  = (a, b, u) => [0, 1, 2].map(c => Math.round(lerp(a[c], b[c], u)));
const smooth01 = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

/* --- sky colour: a FILM CURVE, structured by Belt-of-Venus logic -------
   PALETTE — see docs/tonight-art-direction.md §Palette. The field colour
   is NOT interpolated between designer anchors; it is filmCurve(x) where x
   is a structured scene-luminance. Character: pushed slide film at dusk —
   teal-lifted blacks, muddy WARM-neutral mids (never violet), amber bloom
   + red halation at the sunward horizon. The two antisolar bands (Belt of
   Venus + Earth's shadow) and the sun-side glow are azimuth-blended passes
   on top, so turning the view changes the palette.                        */

// scene-luminance x in 0..1 -> sRGB. Control points OKLCH [L, C, hue].
// NB: no hue in 250..330 — the path is cyan -> cool grey -> warm grey ->
// amber -> bloom. That routing is the whole point (dodges the violet tell).
const FILM = [
  [0.00, [0.150, 0.022, 216]],   // crushed black, lifted to a blue-teal
  [0.14, [0.215, 0.026, 214]],   // dark teal-slate
  [0.34, [0.360, 0.026, 206]],   // cool grey, a little cyan life
  [0.54, [0.530, 0.044,  64]],   // the crossover — warm neutral, not dead
  [0.73, [0.670, 0.074,  50]],   // dusty amber-grey
  [0.89, [0.805, 0.130,  52]],   // amber
  [1.00, [0.950, 0.046,  70]],   // bloom, warm near-white
];
const oklchToRgb = (L, C, h) => oklabToRgb(...lchToLab([L, C, h]));
function filmCurve(x) {
  x = clamp(x, 0, 1);
  let i = 0;
  while (i < FILM.length - 2 && x > FILM[i + 1][0]) i++;
  const [x0, c0] = FILM[i], [x1, c1] = FILM[i + 1];
  const u = smooth01((x - x0) / (x1 - x0 || 1));
  const ts = conditions.tempShift;                        // per-night warm/cool bias
  const a = lchToLab([c0[0], c0[1], c0[2] + ts]);
  const b = lchToLab([c1[0], c1[1], c1[2] + ts]);
  return oklabToRgb(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u));
}

// overall sky brightness for a sun altitude — piecewise, tuned by eye to
// *feel* right (perceptual), not to physical luminance ratios. Floored so
// deepest night is never black.
function daylight(sunAlt) {
  if (sunAlt >=  3) return 1;
  if (sunAlt >= -6) return lerp(0.60, 1.00, (sunAlt + 6) / 9);    // civil
  if (sunAlt >= -12) return lerp(0.30, 0.60, (sunAlt + 12) / 6);  // nautical
  if (sunAlt >= -18) return lerp(0.12, 0.30, (sunAlt + 18) / 6);  // astronomical
  return 0.12;                                                    // night (continuous at −18°)
}
// scene-luminance at an altitude fraction (0 = horizon, 1 = zenith) for a
// given sun altitude and azBright (0 = view faces away from the sun, 1 =
// straight at it). The bright segment concentrates toward the sun; the
// antisolar horizon goes dark (Earth's-shadow territory). Zenith stays a
// clear fraction of the horizon — never a black slab.
function sceneLum(altFrac, sunAlt, azBright) {
  const d = daylight(sunAlt);
  const twi = clamp(1 - (sunAlt + 2) / 16, 0, 1);        // 0 day .. 1 deep twilight
  const zenRatio = lerp(0.74, 0.50, twi);
  let base = lerp(1, zenRatio, smooth01(altFrac));       // horizon -> zenith
  // azimuth-weighted horizon term — only near the horizon, only at twilight
  const nearH = 1 - smooth01(clamp(altFrac / 0.55, 0, 1));
  base += twi * nearH * lerp(-0.34, 0.44, azBright);     // sunward brighter, antisolar darker
  return clamp(d * clamp(base, 0.12, 1.25), 0.04, 1);
}
// The film curve is a DUSK response — it maps "bright" to amber. In daylight
// the sky is bright AND blue, so blend toward a plain blue day sky above the
// sunset. dayMix: 1 above ~+2°, 0 below −6°.
const dayMix = sunAlt => smooth01((sunAlt + 6) / 8);
function daySky(altFrac, azBright) {
  const c = blend([190, 208, 226], [68, 114, 172], smooth01(altFrac));  // horizon -> zenith
  return blend(c, [236, 238, 240], azBright * 0.22 * (1 - smooth01(altFrac)));  // brighter toward the sun
}
function skyColor(altFrac, sunAlt, azBright) {
  let x = sceneLum(Math.max(altFrac, 0), sunAlt, azBright);
  if (altFrac < 0) x *= 0.80;
  const dm = dayMix(sunAlt);
  return dm > 0.001
    ? blend(filmCurve(x), daySky(Math.max(altFrac, 0), azBright), dm)
    : filmCurve(x);
}

/* --- seeded "conditions" + value noise -----------------------------
   One seed = hash(place | date). Drives a correlated bundle: turbidity,
   Belt-of-Venus geometry, the atmospheric mottling field, grain amount.
   Low-amplitude — a screenshot must never look "randomised", just like
   THIS night. Never touches data (positions / times), only texture.     */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// hash-based 2D value noise, smoothstep interpolation -> 0..1
function makeNoise(seed) {
  const rand = mulberry32(seed);
  const perm = new Float32Array(512);
  for (let i = 0; i < 512; i++) perm[i] = rand();
  const h2 = (xi, yi) => perm[((xi * 137 + yi * 311) & 511)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth01(x - xi), yf = smooth01(y - yi);
    const a = h2(xi, yi),       b = h2(xi + 1, yi);
    const c = h2(xi, yi + 1),   e = h2(xi + 1, yi + 1);
    return lerp(lerp(a, b, xf), lerp(c, e, xf), yf);
  };
}

const conditions = {
  turbidity: 0.4, beltAlt: 14, beltThick: 9, beltHue: 26,
  tempShift: 0, airglowHue: 120, airglowAmt: 0.06, noise: null, seed: 1,
};
function bakeConditions() {
  const d = state.located ? tzParts(state.t) : { year: '2026', month: '01', day: '01' };
  const key = `${state.lat == null ? 0 : state.lat.toFixed(2)}|`
            + `${state.lon == null ? 0 : state.lon.toFixed(2)}|${d.year}-${d.month}-${d.day}`;
  const seed = xmur3(key)();
  const r = mulberry32(seed);
  conditions.seed = seed;
  conditions.turbidity = 0.15 + 0.62 * r();     // 0.15 crisp/clear .. 0.77 hazy
  conditions.beltAlt   = 11 + 8 * r();          // 11..19 deg
  conditions.beltThick = 6 + 6 * r();           // 6..12 deg
  conditions.beltHue   = 20 + 16 * r();         // 20 salmon .. 36 rose-pink
  conditions.tempShift = -4 + 9 * r();          // per-night warm/cool bias, small
  conditions.airglowHue = r() < 0.72 ? 108 + 34 * r()   // usually green airglow
                                     : 38 + 16 * r();    // sometimes sodium skyglow
  conditions.airglowAmt = 0.05 + 0.07 * r();
  conditions.noise     = makeNoise(seed ^ 0x9e3779b9);
  bakeGrain();
  bakeGrainLayer();
}

// Relative luminance of an [r,g,b] 0..255 — used to size the bottom scrim.
const srgbLin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const relLum = c => 0.2126 * srgbLin(c[0]) + 0.7152 * srgbLin(c[1]) + 0.0722 * srgbLin(c[2]);

// Chrome colour derives from the live field: a light tint carrying a hint of
// the sky's temperature. Legibility over a bright day sky is held by the
// bottom scrim in paintField, not by flipping the chrome dark.
let chromeRGB = [240, 238, 232];      // also the canvas graticule + leader ink
function setChromeVars() {
  const z = field.zen;
  const m = [0, 1, 2].map(k => Math.round(lerp(z[k], 236, 0.72)));
  m[0] = clamp(m[0] + 5, 0, 255); m[2] = clamp(m[2] - 3, 0, 255);   // never cold-blue
  chromeRGB = m;
  root.style.setProperty('--chrome',      `rgba(${m[0]},${m[1]},${m[2]},0.94)`);
  root.style.setProperty('--chrome-soft', `rgba(${m[0]},${m[1]},${m[2]},0.60)`);
  root.style.setProperty('--chrome-line', `rgba(${m[0]},${m[1]},${m[2]},0.28)`);
}

/* --- projection ------------------------------------------------------- */
// (alt, az) in degrees -> canvas point, plus whether it's on screen.
function project(alt, az) {
  const daz = wrap180(az - state.viewAz);
  const x = W / 2 + (daz / HFOV) * W;
  const y = horizonY - (alt / ALT_TOP) * horizonY;
  return { x, y, daz, visible: Math.abs(daz) < HFOV / 2 + 10 && alt > -3 };
}

/* --- grain (uneven, seeded), dither (technical), mottling (drifts) --- */
let grainTile = null, ditherPat = null;
const grainLayer = document.createElement('canvas');   // grain × vertical envelope, W×H
const mottleCv = document.createElement('canvas');
mottleCv.width = 64; mottleCv.height = 40;

function bakeGrain() {
  const s = 168;
  const c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  const img = g.createImageData(s, s);
  const rnd = mulberry32(conditions.seed ^ 0x5bd1e995);
  const clump = makeNoise(conditions.seed ^ 0xa53f9c);
  const amt = lerp(9, 26, conditions.turbidity);       // hazier night -> more grain
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const k = 0.3 + 0.7 * clump(x / 21, y / 21);       // uneven density (not a grid)
    const v = 128 + (rnd() - 0.5) * 2 * amt * k;
    const i = (y * s + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = ctx.createPattern(c, 'repeat');
  if (!ditherPat) bakeDither();
}

// fine ±1-level dither tile — kills 8-bit banding, not an aesthetic grain.
// Seed is fixed, so it's baked exactly once.
function bakeDither() {
  const ds = 64;
  const dc = document.createElement('canvas'); dc.width = dc.height = ds;
  const dg = dc.getContext('2d');
  const dimg = dg.createImageData(ds, ds);
  const drnd = mulberry32(0x1234abcd);
  for (let i = 0; i < dimg.data.length; i += 4) {
    const v = 127 + Math.round(drnd() * 2);            // 127..129
    dimg.data[i] = dimg.data[i + 1] = dimg.data[i + 2] = v;
    dimg.data[i + 3] = 255;
  }
  dg.putImageData(dimg, 0, 0);
  ditherPat = ctx.createPattern(dc, 'repeat');
}

// grain × a vertical envelope (lives in the mid band; near-absent in the
// bloom highlight and deep zenith). Static -> bake once per size/conditions.
function bakeGrainLayer() {
  if (!grainTile || !W || !H) return;
  grainLayer.width = W; grainLayer.height = H;
  const g = grainLayer.getContext('2d');
  g.fillStyle = grainTile;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-in';
  const env = g.createLinearGradient(0, 0, 0, H);
  env.addColorStop(0.00, 'rgba(0,0,0,0.22)');
  env.addColorStop(0.40, 'rgba(0,0,0,0.80)');
  env.addColorStop(0.72, 'rgba(0,0,0,0.34)');
  env.addColorStop(1.00, 'rgba(0,0,0,0.52)');
  g.fillStyle = env;
  g.fillRect(0, 0, W, H);
}

// The mottling drifts with sim time, but only very slowly — regenerate the
// tiny noise image at most a few times a second, blit it every frame.
let _mottleImg = null, _mottleAt = -1;
function paintMottle() {
  if (!conditions.noise) return;
  const w = mottleCv.width, h = mottleCv.height;
  const mx = mottleCv.getContext('2d');
  const drift = (state.t.getTime() / 1000) * 0.0016;      // very slow domain-warp
  const key = Math.round(drift * 400);                    // changes ~every 0.25 s of sim drift
  if (key !== _mottleAt) {
    _mottleAt = key;
    if (!_mottleImg) _mottleImg = mx.createImageData(w, h);
    const img = _mottleImg;
    const amp = lerp(7, 15, conditions.turbidity);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = conditions.noise(x / 8.5 + drift, y / 8.5 - drift * 0.6);
      const v = 128 + (n - 0.5) * 2 * amp;
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    mx.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.5;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(mottleCv, 0, 0, w, h, 0, 0, W, H);
  ctx.restore();
}

function paintGrain() {
  if (ditherPat) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 1;
    ctx.fillStyle = ditherPat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (grainLayer.width) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.9;
    ctx.drawImage(grainLayer, 0, 0);
    ctx.restore();
  }
}

/* --- paint the field -------------------------------------------------- */
let sun = { alt: 90, az: 180 };
let field = { zen: [22, 28, 34], hor: [46, 48, 46], grd: [16, 22, 26] };

function paintField() {
  // what is the view facing? (drives the azimuth-weighted horizon + passes)
  const dSun = wrap180(sun.az - state.viewAz) * Math.PI / 180;
  const azBright = 0.5 + 0.5 * Math.cos(dSun);          // 1 at the sun, 0 opposite
  const sunFace  = clamp(Math.cos(dSun), 0, 1);
  const antiFace = clamp(-Math.cos(dSun), 0, 1);
  const twil  = clamp(1 - Math.abs(sun.alt + 6) / 17, 0, 1);   // twilight strength
  const night = clamp(1 - (sun.alt + 11) / 9, 0, 1);           // 0 at −11° .. 1 at −20°

  // base: the film curve over a structured, azimuth-weighted scene-luminance
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const N = 24;
  let zenRGB = null;
  for (let i = 0; i <= N; i++) {
    const p = i / N;                                   // 0 top .. 1 bottom
    const altFrac = (horizonY - p * H) / horizonY;     // 1 top, 0 horizon, <0 below
    const c = skyColor(altFrac, sun.alt, azBright);
    g.addColorStop(p, rgb(c));
    if (i === 0) zenRGB = c;
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  field = {
    zen: zenRGB,
    hor: skyColor(0, sun.alt, azBright),
    grd: skyColor(-0.12, sun.alt, azBright),
  };

  // faint airglow / skyglow low at the horizon once it's properly dark
  if (night > 0.02) {
    const ag = oklchToRgb(0.42, 0.05, conditions.airglowHue);
    const gy = horizonY - (22 / ALT_TOP) * horizonY;
    const air = ctx.createLinearGradient(0, gy, 0, horizonY + 8);
    air.addColorStop(0, `rgba(${ag[0]},${ag[1]},${ag[2]},0)`);
    air.addColorStop(1, `rgba(${ag[0]},${ag[1]},${ag[2]},${conditions.airglowAmt * night})`);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = air;
    ctx.fillRect(0, gy, W, horizonY - gy + 8);
    ctx.restore();
  }

  // sunward horizon: a bright, tight bloom core + a wider red halation.
  // Additive ('screen') so it reads as light, not paint.
  const glow = clamp(1 - Math.abs(sun.alt + 3) / 20, 0, 1) * (0.28 + 0.72 * sunFace);
  if (glow > 0.01) {
    const gx = clamp(project(0, sun.az).x, -0.5 * W, 1.5 * W);
    const reach = W * (0.42 + 0.5 * conditions.turbidity);
    const gcore = Math.round(206 - 30 * conditions.turbidity);
    const gwarm = Math.round(150 + 46 * conditions.turbidity);
    const core = ctx.createRadialGradient(gx, horizonY + 6, 0, gx, horizonY + 6, reach);
    core.addColorStop(0.00, `rgba(255,242,220,${0.60 * glow})`);         // hot near-white core
    core.addColorStop(0.13, `rgba(255,${gcore},${gwarm},${0.40 * glow})`);
    core.addColorStop(0.36, `rgba(255,120,78,${0.15 * glow})`);          // halation ring
    core.addColorStop(0.70, `rgba(255,120,78,${0.04 * glow})`);
    core.addColorStop(1.00, 'rgba(255,120,78,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // antisolar horizon: Belt of Venus above the Earth's shadow
  if (twil > 0.02 && antiFace > 0.02) {
    const bA = antiFace * twil;
    const bc = oklchToRgb(0.74, 0.105, conditions.beltHue);   // salmon .. rose
    const by = horizonY - (conditions.beltAlt / ALT_TOP) * horizonY;
    const bh = (conditions.beltThick / ALT_TOP) * horizonY;
    const belt = ctx.createLinearGradient(0, by - bh, 0, by + bh);
    belt.addColorStop(0.0, `rgba(${bc[0]},${bc[1]},${bc[2]},0)`);
    belt.addColorStop(0.5, `rgba(${bc[0]},${bc[1]},${bc[2]},${0.27 * bA})`);
    belt.addColorStop(1.0, `rgba(${bc[0]},${bc[1]},${bc[2]},0)`);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = belt;
    ctx.fillRect(0, by - bh, W, bh * 2);
    ctx.restore();

    const sh = (7 / ALT_TOP) * horizonY;
    const shadow = ctx.createLinearGradient(0, horizonY - sh, 0, horizonY + 6);
    shadow.addColorStop(0, 'rgba(26,38,60,0)');
    shadow.addColorStop(1, `rgba(24,36,58,${0.34 * bA})`);         // cool dip
    ctx.fillStyle = shadow;
    ctx.fillRect(0, horizonY - sh, W, sh + 6);
  }

  // the seam: a soft brightening at the horizon, never a drawn line —
  // mostly a sunward effect (scaled by azBright so it doesn't lift the
  // antisolar / Earth's-shadow horizon)
  const sc = blend(field.hor, [255, 250, 240], 0.18);
  const seamA = (0.05 + 0.10 * glow) * (0.35 + 0.65 * azBright);
  const seam = ctx.createLinearGradient(0, horizonY - 22, 0, horizonY + 12);
  seam.addColorStop(0,    `rgba(${sc[0]},${sc[1]},${sc[2]},0)`);
  seam.addColorStop(0.62, `rgba(${sc[0]},${sc[1]},${sc[2]},${seamA.toFixed(3)})`);
  seam.addColorStop(1,    `rgba(${sc[0]},${sc[1]},${sc[2]},0)`);
  ctx.fillStyle = seam;
  ctx.fillRect(0, horizonY - 22, W, 34);

  // bottom scrim: hold light-chrome legibility over a bright day sky
  const scrimA = clamp(0.10 + relLum(field.hor) * 1.0, 0.10, 0.60);
  const sg = ctx.createLinearGradient(0, H * 0.55, 0, H);
  sg.addColorStop(0, 'rgba(4,6,10,0)');
  sg.addColorStop(0.7, `rgba(4,6,10,${(scrimA * 0.6).toFixed(3)})`);
  sg.addColorStop(1, `rgba(4,6,10,${scrimA.toFixed(3)})`);
  ctx.fillStyle = sg;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);

  setChromeVars();
  syncBrowserChrome();
}

// browser UI blends into the sky — theme-color + body bg from the zenith
let _lastChrome = 0;
function syncBrowserChrome() {
  const now = performance.now();
  if (now - _lastChrome < 900) return;
  _lastChrome = now;
  const z = rgb(field.zen);
  document.body.style.background = z;
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.setAttribute('content', z);
}

/* --- graticule: alt/az scaffold, visible ONLY during a drag ---------- */
const DIRS = [
  { az: 0, s: 'N' }, { az: 45, s: 'NE' }, { az: 90, s: 'E' }, { az: 135, s: 'SE' },
  { az: 180, s: 'S' }, { az: 225, s: 'SW' }, { az: 270, s: 'W' }, { az: 315, s: 'NW' },
];
const GFONT = 'ui-serif, "Iowan Old Style", Georgia, serif';
let gratT = 0, gratTarget = 0;   // eased 0..1 — fast in on drag, slow out after

function paintGraticule() {
  if (gratT < 0.012) return;
  const k = gratT;
  const C = chromeRGB.join(',');            // graticule ink = the chrome colour
  const ink = alpha => `rgba(${C},${alpha})`;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.textBaseline = 'alphabetic';

  // faint horizon reference — only here, never at rest
  ctx.strokeStyle = ink(0.13 * k);
  ctx.beginPath(); ctx.moveTo(0, horizonY + 0.5); ctx.lineTo(W, horizonY + 0.5); ctx.stroke();

  // compass ticks + labels along the horizon
  ctx.textAlign = 'center';
  for (const d of DIRS) {
    const p = project(0, d.az);
    if (!p.visible) continue;
    const major = d.s.length === 1;
    ctx.strokeStyle = ink((major ? 0.34 : 0.18) * k);
    ctx.beginPath();
    ctx.moveTo(p.x, horizonY - (major ? 9 : 5));
    ctx.lineTo(p.x, horizonY + (major ? 9 : 5));
    ctx.stroke();
    ctx.fillStyle = ink((major ? 0.66 : 0.38) * k);
    ctx.font = `${major ? 13 : 11}px ${GFONT}`;
    ctx.fillText(d.s, p.x, horizonY + (major ? 25 : 19));
  }

  // altitude scale up the left edge (borrowed from Signal)
  ctx.textAlign = 'left';
  ctx.font = `12px ${GFONT}`;
  for (const a of [30, 60]) {
    const y = horizonY - (a / ALT_TOP) * horizonY;
    ctx.strokeStyle = ink(0.15 * k);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(18, y); ctx.stroke();
    ctx.fillStyle = ink(0.42 * k);
    ctx.fillText(a + '°', 22, y + 4);
  }
  ctx.restore();
}

/* --- stars + the Milky Way ------------------------------------------
   Real bright-star positions (data/stars.json, HYG subset, mag <= 4.0),
   but drawn as Nocturne "dust": they only fully resolve when the view is
   still, twinkle a hair, and only the brightest carry a bloom. The Milky
   Way is a stylised painted band along the galactic equator — a breath
   of lighter field, not ten thousand faint points.                      */
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
let starCat = null;      // { list: [{ra, sinDec, cosDec, mag, name, tint, twPh, twRate}] }
let mwPath = null;       // galactic-equator samples: [{ra, sinDec, cosDec, bright}]
let steadiness = 1;      // 0 while turning -> 1 when the view settles (dust resolves)

// B-V colour index -> a gentle star tint (hot blue-white .. cool warm)
function bvTint(bv) {
  return blend([206, 220, 255], [255, 212, 168], clamp((bv + 0.3) / 2.1, 0, 1));
}
// naked-eye limiting magnitude for a given sun altitude (rough, tuned)
const limMag = sunAlt => -sunAlt * 0.5 - 3;   // sun -6 -> 0, -12 -> 3, -18 -> 6

async function loadStars() {
  try {
    const j = await (await fetch('data/stars.json')).json();
    const rnd = mulberry32(0x51de0001);
    starCat = { list: j.s.map(r => {
      const dec = r[1] * D2R;
      return {
        ra: r[0], sinDec: Math.sin(dec), cosDec: Math.cos(dec),
        mag: r[2], name: r[4] || null, tint: bvTint(r[3] || 0),
        twPh: rnd() * 6.283, twRate: 1.5 + rnd() * 2.6, _x: null, _y: null,
      };
    }) };
  } catch (_) { starCat = { list: [] }; }
  buildMilkyWay();
}

// galactic longitude l (b = 0) -> equatorial, J2000. Each sample also carries
// its along-band brightness, a per-sample lump (seeded) so the glow is never
// smooth, and how far the Great Rift bites here.
function buildMilkyWay() {
  const aNGP = 192.85948 * D2R, dNGP = 27.12825 * D2R, lNCP = 122.93192 * D2R;
  const sdN = Math.sin(dNGP), cdN = Math.cos(dNGP);
  const lump = makeNoise(0x9d1c5b);
  mwPath = [];
  for (let l = 0; l < 360; l += 2) {
    const dl = lNCP - l * D2R;
    const dec = Math.asin(clamp(cdN * Math.cos(dl), -1, 1));
    const ra = aNGP + Math.atan2(Math.sin(dl), -sdN * Math.cos(dl));
    const centre = Math.pow(0.5 + 0.5 * Math.cos(l * D2R), 2.1);       // Sagittarius peak
    const cygnus = 0.28 * Math.exp(-(wrap180(l - 80) ** 2) / 700);     // a softer second lobe
    // Great Rift: Cygnus (~l 70) round through Aquila to the centre
    const rift = 0.95 * Math.exp(-(wrap180(l - 30) ** 2) / 4200);
    const ln = lump(l / 24, 0) * lump(0, l / 37);
    mwPath.push({
      ra: wrap360(ra * R2D), sinDec: Math.sin(dec), cosDec: Math.cos(dec),
      bright: clamp(0.12 + 0.88 * centre + cygnus, 0, 1.25),
      width: 0.5 + 0.9 * centre + 0.4 * cygnus,                         // band swells & narrows
      lump: clamp(0.2 + 1.4 * ln * ln, 0, 1.1),                         // genuinely patchy
      rift, wob: (lump(l / 55, 3.1) - 0.5) * 2,                         // centreline wander
    });
  }
}

// equatorial (J2000) -> horizontal, hand-rolled from local sidereal time
let lstDeg = 0, sinLat = 0, cosLat = 1;
function updateStarTransform() {
  lstDeg = wrap360(A.SiderealTime(state.t) * 15 + state.lon);
  const lat = state.lat * D2R;
  sinLat = Math.sin(lat); cosLat = Math.cos(lat);
}
function eqAltAz(ra, sinDec, cosDec) {
  const H = (lstDeg - ra) * D2R, cH = Math.cos(H), sH = Math.sin(H);
  const alt = Math.asin(clamp(sinDec * sinLat + cosDec * cosLat * cH, -1, 1));
  const az = Math.atan2(-cosDec * sH, sinDec * cosLat - cosDec * sinLat * cH);
  return { alt: alt * R2D, az: wrap360(az * R2D) };
}

// a soft round brush (white -> transparent), baked once, splatted per puff
const mwBrush = document.createElement('canvas');
(function bakeMwBrush() {
  const s = 128; mwBrush.width = mwBrush.height = s;
  const g = mwBrush.getContext('2d');
  const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, s, s);
})();

const mwLayer = document.createElement('canvas');
function paintMilkyWay() {
  if (!mwPath) return;
  // the Milky Way only shows once the sky is genuinely dark (astronomical)
  const k = smooth01((-sun.alt - 13) / 6);   // 0 at −13°, 1 by −19°
  if (k < 0.03) return;

  // Draw it as many soft overlapping "puffs" along the galactic equator on an
  // offscreen (lighten -> no white blow-out), carve the Great Rift out of it,
  // then blur once and composite low. Puffs feather on every edge, so the
  // band never reads as a shaft — even when it runs vertically.
  const Lc = mwLayer; Lc.width = W; Lc.height = H;
  const g = Lc.getContext('2d');

  // project the whole ring first (also gives us the local band direction)
  const P = mwPath.map(s => {
    const aa = eqAltAz(s.ra, s.sinDec, s.cosDec);
    const p = project(aa.alt, aa.az);
    return { x: p.x, y: p.y, daz: p.daz, on: aa.alt > -5 && Math.abs(p.daz) < HFOV * 0.7, s };
  });
  const perp = i => {
    const a = P[(i - 1 + P.length) % P.length], b = P[(i + 1) % P.length];
    let dx = b.x - a.x, dy = b.y - a.y; const L = Math.hypot(dx, dy) || 1;
    return [-dy / L, dx / L];
  };

  // fade puffs near the top and bottom of the frame so the band never reads
  // as a shaft "going somewhere" — it dissolves into the field at the edges
  const edgeFade = cy => smooth01(cy / (H * 0.20)) * smooth01((H - cy) / (H * 0.24));

  g.globalCompositeOperation = 'lighten';
  for (let i = 0; i < P.length; i++) {
    const pt = P[i]; if (!pt.on) continue;
    const s = pt.s;
    const [nx, ny] = perp(i);
    const r = H * (0.05 + 0.055 * clamp(s.width, 0, 2)) * (0.75 + 0.5 * s.lump);
    const cx = pt.x + nx * s.wob * H * 0.02, cy = pt.y + ny * s.wob * H * 0.02;
    g.globalAlpha = clamp(0.5 * s.bright * s.lump * edgeFade(cy), 0, 0.85);
    if (g.globalAlpha < 0.01) continue;
    g.drawImage(mwBrush, cx - r, cy - r, r * 2, r * 2);
  }

  // carve the Great Rift: dark puffs just off the band's centre
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < P.length; i++) {
    const pt = P[i]; if (!pt.on || pt.s.rift < 0.05) continue;
    const s = pt.s, [nx, ny] = perp(i);
    const r = H * (0.028 + 0.03 * s.width);
    const cx = pt.x + nx * H * 0.028, cy = pt.y + ny * H * 0.028;
    g.globalAlpha = clamp(s.rift * (0.5 + 0.4 * s.lump), 0, 0.8);
    g.drawImage(mwBrush, cx - r, cy - r, r * 2, r * 2);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.17 * k;
  ctx.filter = `blur(${Math.round(H * 0.022)}px)`;
  ctx.drawImage(Lc, 0, 0);
  ctx.filter = 'none';
  ctx.restore();
}

function paintStars() {
  if (!starCat || !starCat.list.length) return;
  const dark = skyDark();
  const lm = limMag(sun.alt);
  if (dark < 0.03 || lm < -2) return;
  const nowS = state.t.getTime() / 1000;
  const dustK = lerp(0.22, 1, steadiness);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const st of starCat.list) {
    st._x = st._y = null;
    let vis = smooth01((lm - st.mag) / 1.3);
    if (vis < 0.02) continue;
    if (st.mag > 2.2) vis *= dustK;
    if (vis < 0.02) continue;
    const aa = eqAltAz(st.ra, st.sinDec, st.cosDec);
    if (aa.alt < -0.5) continue;
    const p = project(aa.alt, aa.az);
    if (!p.visible) continue;
    st._x = p.x; st._y = p.y;
    const tw = REDUCED ? 1 : 1 + 0.16 * Math.sin(nowS * st.twRate + st.twPh);
    const size = clamp(0.6 + (3.4 - st.mag) * 0.52, 0.55, 3.2);
    const alpha = clamp(0.36 + (3 - st.mag) * 0.24, 0.28, 1) * vis * dark * tw;
    if (st.mag < 1.2) bloom(p.x, p.y, size * 4.2, st.tint, 0.09 * vis * dark);
    ctx.fillStyle = `rgba(${st.tint[0]},${st.tint[1]},${st.tint[2]},${clamp(alpha, 0, 1).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, 7); ctx.fill();
  }
  ctx.restore();
}

/* --- bodies: the moon and the naked-eye planets --------------------- */
const PLANETS = [
  { name: 'Mercury', tint: [222, 214, 200] },
  { name: 'Venus',   tint: [255, 250, 236] },
  { name: 'Mars',    tint: [234, 150, 112] },
  { name: 'Jupiter', tint: [246, 238, 220] },
  { name: 'Saturn',  tint: [236, 220, 182] },
];
let bodies = { moon: null, planets: [] };

// how dark the sky is for spotting things — 0 in bright twilight, 1 at night
const skyDark = () => clamp(-(sun.alt + 2) / 14, 0, 1);
// a planet of magnitude `mag` shows once the sun is this far down
const planetShows = mag => smooth01(((-3 - (mag + 5) * 1.35) - sun.alt) / 4);

function moonState(t) {
  const aa = altaz(A.Body.Moon, t);
  const il = A.Illumination(A.Body.Moon, t);
  return { alt: aa.alt, az: aa.az, illum: il.phase_fraction, phase: A.MoonPhase(t), mag: il.mag };
}
function recomputeBodies(t) {
  try {
    bodies.moon = moonState(t);
    bodies.planets = PLANETS.map(p => {
      const aa = altaz(A.Body[p.name], t);
      return { ...p, alt: aa.alt, az: aa.az, mag: A.Illumination(A.Body[p.name], t).mag };
    });
  } catch (_) {}
}

function bloom(x, y, r, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
  g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

function paintPlanets() {
  if (!bodies.planets.length) return;
  const dark = skyDark();
  for (const pl of bodies.planets) {
    pl._x = pl._y = null;                 // no stale hit-target if culled this frame
    if (pl.alt < -0.6) continue;
    const p = project(pl.alt, pl.az);
    if (!p.visible) continue;
    const vis = clamp(planetShows(pl.mag) * (0.35 + 0.65 * dark), 0, 1);
    if (vis < 0.03) continue;
    pl._x = p.x; pl._y = p.y; pl._vis = vis;
    const r = clamp(1.25 + (-pl.mag) * 0.55, 1.1, 4.2);
    bloom(p.x, p.y, r * 4.5, pl.tint, 0.16 * vis);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(${pl.tint[0]},${pl.tint[1]},${pl.tint[2]},${0.55 + 0.45 * vis})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
    ctx.restore();
  }
}

function paintMoon() {
  const m = bodies.moon;
  if (!m) return;
  m._x = m._y = null;                     // no stale hit-target if culled this frame
  if (m.alt < -1.2 || m.illum < 0.02) return;   // below the horizon, or new (invisible)
  const p = project(m.alt, m.az);
  if (!p.visible) return;
  m._x = p.x; m._y = p.y;
  const r = Math.max(9, W * 0.017);
  const dark = skyDark();
  const s = project(sun.alt, sun.az);                 // sun's screen point (may be off-screen)
  const a = Math.atan2(s.y - p.y, s.x - p.x);         // lit limb faces the sun

  // soft bloom — fuller moon + darker sky => stronger
  bloom(p.x, p.y, r * 5.5, [244, 240, 226], (0.05 + 0.16 * m.illum) * (0.3 + 0.7 * dark));

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(a);
  // unlit disc (faint earthshine — a touch warm), then the lit shape
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7);
  ctx.fillStyle = `rgba(58,60,66,${0.5 + 0.4 * dark})`;
  ctx.fill();
  const t = (clamp(m.illum, 0, 1) - 0.5) * 2;         // -1..1 terminator factor
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false); // bright-limb semicircle (toward sun)
  // crescent (t<0): terminator curves INTO the lit side; gibbous (t>0): bulges away
  ctx.ellipse(0, 0, Math.abs(t) * r, r, 0, Math.PI / 2, -Math.PI / 2, t < 0);
  ctx.closePath();
  ctx.fillStyle = `rgba(236,232,220,${0.72 + 0.28 * dark})`;
  ctx.fill();
  ctx.restore();
}

/* --- tap to select an object -> a tethered card -------------------- */
let selected = null;   // { kind, name, tint?, get x(), get y(), rise, set, ... }

function compass(az) {
  return ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW',
          'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(wrap360(az) / 22.5) % 16];
}
function hhmm(d) {
  const p = tzParts(d);
  return `${p.hour}:${p.minute}`;
}
// the NEXT rise and the NEXT set after t — what the card and the advice want
function riseSetFor(bodyName) {
  const from = state.t;
  let rise = null, set = null;
  try { const r = A.SearchRiseSet(A.Body[bodyName], observer(), +1, from, 2); rise = r && r.date; } catch (_) {}
  try { const s = A.SearchRiseSet(A.Body[bodyName], observer(), -1, from, 2); set = s && s.date; } catch (_) {}
  return { rise, set };
}
function moonPhaseWord(phase, illum) {
  const p = wrap360(phase);
  if (illum > 0.985) return 'full';
  if (illum < 0.03) return 'new';
  const wax = p < 180;
  if (Math.abs(p - 90) < 8) return 'at first quarter';
  if (Math.abs(p - 270) < 8) return 'at last quarter';
  const shape = illum < 0.5 ? 'crescent' : 'gibbous';
  return `a ${wax ? 'waxing' : 'waning'} ${shape}`;
}

function advice(o) {
  const t = state.t;
  const dir = compass(o.az);
  if (o.alt < -0.5) {
    // only promise a return if it happens before this night's dawn
    return o.rise && o.rise > t && state.dawn && o.rise < state.dawn
      ? `Below the horizon — up again around ${hhmm(o.rise)}.`
      : `Below the horizon tonight.`;
  }
  if (o.kind === 'planet' && o._vis != null && o._vis < 0.4) {
    return `Still washed out by the twilight — give it half an hour.`;
  }
  const settingSoon = o.set && o.set > t && (o.set - t) < 75 * 60e3;
  if (settingSoon) return `Sinking toward the ${dir} — gone by about ${hhmm(o.set)}.`;
  if (o.alt < 10) return `Low in the ${dir}; you'll want an open horizon.`;
  if (o.kind === 'moon') {
    const w = moonPhaseWord(o.phase, o.illum);
    return o.alt > 45
      ? `High in the ${dir}, ${w}.`
      : `${w[0].toUpperCase()}${w.slice(1)}, well up in the ${dir}.`;
  }
  if (o.kind === 'star') {
    const bright = o.mag != null && o.mag < 1.5;
    if (o.alt > 55) return `Nearly overhead${bright ? ' — one of the bright ones' : ''}.`;
    return `${bright ? 'A bright star, well' : 'Well'} up in the ${dir}.`;
  }
  if (o.alt > 45) return `High in the ${dir} — hard to miss.`;
  return `Well up in the ${dir}.`;
}

function openCard(sel) {
  selected = sel;
  el.card.querySelector('.card-name').textContent = sel.name;
  el.card.hidden = false;
  el.placard.hidden = true;          // one thing at a time in the lower-left
  refreshCardRiseSet();
  updateCardText();
  positionCard();
}
function closeCard() {
  selected = null;
  el.card.hidden = true;
  if (state.located && el.locate.hidden) el.placard.hidden = false;
}
function refreshCardRiseSet() {
  if (!selected) return;
  if (selected.kind === 'star') { selected.rise = selected.set = null; return; }
  const rs = riseSetFor(selected.name);
  selected.rise = rs.rise; selected.set = rs.set;
}
function updateCardText() {
  if (!selected) return;
  const s = selected;
  el.card.querySelector('.card-pos').textContent =
    s.alt > -0.5 ? `${Math.round(s.alt)}° up · ${compass(s.az)}` : `below the horizon`;
  const soon = ms => ms && ms > state.t && (ms - state.t) < 8 * 3600e3;
  const rsLine = s.alt >= -0.5
    ? (soon(s.set) ? `sets ${hhmm(s.set)}` : (s.set && s.alt > 20 ? 'up for hours' : ''))
    : (soon(s.rise) ? `rises ${hhmm(s.rise)}` : '');
  el.card.querySelector('.card-rise').textContent = rsLine;
  el.card.querySelector('.card-advice').textContent = advice(s);
}

function positionCard() {
  if (!selected) return;
  const ox = selected.x, oy = selected.y;
  const cw = el.card.offsetWidth || 260, ch = el.card.offsetHeight || 110;
  let cx = ox + 22, cy = oy + 20;
  cx = clamp(cx, 12, Math.max(12, W - cw - 12));
  cy = clamp(cy, 12, Math.max(12, H - ch - 88));      // keep clear of the controls
  el.card.style.left = cx + 'px';
  el.card.style.top = cy + 'px';
  selected._cx = cx; selected._cy = cy; selected._cw = cw; selected._ch = ch;
}
function paintLeader() {
  if (!selected) return;
  positionCard();
  const ox = selected.x, oy = selected.y;
  // nearest corner of the card to the object
  const cx = clamp(ox, selected._cx, selected._cx + selected._cw);
  const cy = clamp(oy, selected._cy, selected._cy + selected._ch);
  ctx.save();
  ctx.strokeStyle = `rgba(${chromeRGB.join(',')},0.5)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(cx, cy);
  ctx.stroke();
  ctx.fillStyle = `rgba(${chromeRGB.join(',')},0.7)`;
  ctx.beginPath(); ctx.arc(ox, oy, 2.5, 0, 7); ctx.fill();
  ctx.restore();
}

// a live view of a body by name — survives the bodies cache being replaced
function bodyRef(name) {
  const isMoon = name === 'Moon';
  const cur = () => isMoon ? bodies.moon : bodies.planets.find(p => p.name === name);
  return {
    kind: isMoon ? 'moon' : 'planet', name,
    get alt()   { return (cur() || {}).alt ?? -99; },
    get az()    { return (cur() || {}).az ?? 0; },
    get x()     { return (cur() || {})._x; },
    get y()     { return (cur() || {})._y; },
    get illum() { return bodies.moon && bodies.moon.illum; },
    get phase() { return bodies.moon && bodies.moon.phase; },
    get _vis()  { return isMoon ? 1 : ((cur() || {})._vis ?? 0); },
  };
}
function starRef(name) {
  const cur = () => starCat && starCat.list.find(s => s.name === name);
  const aa = () => { const s = cur(); return s ? eqAltAz(s.ra, s.sinDec, s.cosDec) : { alt: -99, az: 0 }; };
  return {
    kind: 'star', name,
    get alt() { return aa().alt; },
    get az()  { return aa().az; },
    get x()   { return (cur() || {})._x; },
    get y()   { return (cur() || {})._y; },
    get mag() { return (cur() || {}).mag; },
    _vis: 1,
  };
}
function pickObject(x, y) {
  let key = null, kind = null, bestD = 999;
  const consider = (o, rad, k, name) => {
    if (!o || o._x == null) return;
    const d = Math.hypot(o._x - x, o._y - y);
    if (d < rad && d < bestD) { bestD = d; key = name; kind = k; }
  };
  consider(bodies.moon, 34, 'moon', 'Moon');
  for (const pl of bodies.planets) consider(pl, 20, 'planet', pl.name);
  if (starCat) for (const st of starCat.list) if (st.name) consider(st, 13, 'star', st.name);
  if (!key) return null;
  return kind === 'star' ? starRef(key) : bodyRef(key);
}

/* --- the loop ---------------------------------------------------------- */
let lastFrame = 0, lastCompute = 0, running = false, rafId = 0, _stillAt = 0;
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

  if (!state.located) {
    // no place yet — hold a calm nautical-twilight sky behind the prompt
    sun = { alt: -8, az: 245 };
  } else {
    if (now - lastCompute >= COMPUTE_MS || !lastCompute) {
      lastCompute = now;
      sun = altaz(A.Body.Sun, state.t);
      recomputeBodies(state.t);
    }
    updateStarTransform();       // cheap; keeps the sky rotating smoothly
  }

  // graticule ease: fast in on drag, slow out after; snaps if reduced-motion
  if (REDUCED) gratT = gratTarget;
  else gratT += (gratTarget - gratT) * clamp(dtReal * (gratTarget > gratT ? 15 : 4), 0, 1);

  // steadiness: dust resolves ~0.8 s after the view stops moving
  if (drag) { steadiness = 0; _stillAt = 0; }
  else {
    if (!_stillAt) _stillAt = now;
    const settled = clamp((now - _stillAt - 280) / 520, 0, 1);
    steadiness += (settled - steadiness) * clamp(dtReal * 3.5, 0, 1);
    if (REDUCED) steadiness = settled;
  }

  ctx.clearRect(0, 0, W, H);
  paintField();
  paintMottle();
  if (state.located) {
    paintMilkyWay();
    paintStars();
    paintPlanets();
    paintMoon();
    paintGraticule();
    if (selected) { updateCardText(); paintLeader(); }
  }
  paintGrain();

  rafId = requestAnimationFrame(frame);
}
function startLoop() {
  running = true; lastFrame = 0; lastCompute = 0;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(frame);
}
// a rAF chain scheduled while the tab is hidden can be dropped — restart on return
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && running) startLoop();
});

/* --- drag to turn · tap to select ---------------------------------- */
let drag = null;
el.canvas.addEventListener('pointerdown', e => {
  drag = { x: e.clientX, y: e.clientY, az: state.viewAz, moved: 0, t: e.timeStamp };
  el.canvas.setPointerCapture(e.pointerId);
  el.canvas.classList.add('dragging');
  gratTarget = 1;                       // fade the alt/az scaffold in
});
el.canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  drag.moved = Math.max(drag.moved, Math.hypot(dx, e.clientY - drag.y));
  state.viewAz = wrap360(drag.az - dx * (HFOV / W));  // drag right -> turn left
});
function endDrag(e) {
  if (!drag) return;
  const tap = drag.moved < 6 && (e.timeStamp - drag.t) < 500;
  drag = null;
  el.canvas.classList.remove('dragging');
  gratTarget = 0;                       // and fade it back out
  try { el.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  if (tap && state.located) {
    const rect = el.canvas.getBoundingClientRect();
    const hit = pickObject(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) openCard(hit); else closeCard();
  }
}
el.canvas.addEventListener('pointerup', endDrag);
el.canvas.addEventListener('pointercancel', endDrag);

// keyboard: ← → turn the view, Esc closes the card. Arrows are left alone
// whenever a form control has focus (the scrub, the place input, buttons).
const inControl = t => !!(t && t.closest && t.closest('input, button, select, textarea'));
document.addEventListener('keydown', e => {
  if (!state.located) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (inControl(e.target)) return;
    state.viewAz = wrap360(state.viewAz + (e.key === 'ArrowLeft' ? -10 : 10));
    e.preventDefault();
  } else if (e.key === 'Escape' && selected) {
    closeCard();
  }
});

/* --- time model ---------------------------------------------------------- */
function setPlaying(on) {
  state.playing = on;
  el.btnPlay.setAttribute('aria-pressed', String(on));
  el.btnPlay.textContent = on ? 'Pause' : 'Play';
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
  setScrubFill();
}
function setScrubFill() {
  el.scrub.style.setProperty('--p', (Number(el.scrub.value) / 10) + '%');
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
  refreshCardRiseSet();
});
el.btnPlay.addEventListener('click', () => {
  if (!state.playing && state.t >= state.dawn) state.t = new Date(state.dusk);
  setPlaying(!state.playing);
});
el.scrub.addEventListener('input', () => {
  setPlaying(false);
  const u = Number(el.scrub.value) / 1000;
  state.t = new Date(state.dusk.getTime() + u * (state.dawn - state.dusk));
  setScrubFill();
  updateClock();
});
el.scrub.addEventListener('change', refreshCardRiseSet);   // once, on release

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
  if (show) {
    closeCard();
    el.input.value = ''; el.results.hidden = true; el.msg.hidden = true; el.input.focus();
  }
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
// each result is a real <button> so it's focusable and Enter-able, not
// a click-only <li>
function renderResults(list) {
  el.results.innerHTML = '';
  if (!list.length) { el.results.hidden = true; return; }
  for (const item of list) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'place-pick';
    b.innerHTML = `<span class="p-name"></span> <span class="p-sub"></span>`;
    b.querySelector('.p-name').textContent = item.name;
    b.querySelector('.p-sub').textContent = item.sub;
    b.addEventListener('click', () => enter(item.lat, item.lon, item.name, item.tz));
    li.appendChild(b);
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
el.locate.addEventListener('submit', async e => {
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
  state.located = true;
  _placardDay = '';
  closeCard();
  savePlace();
  showLocate(false);
  resize();
  if (!state.playing) state.t = new Date();
  computeDuskDawn();
  recomputeBodies(state.t);   // so a tap works before the first 2 Hz tick
  bakeConditions();           // seed tonight's texture from place + date
  syncScrubFromT();
  updateClock();
  startLoop();
}

function init() {
  resize();
  bakeConditions();           // a default seed so the pre-location sky has texture
  loadStars();                // async; the loop tolerates starCat being null
  startLoop();                // the sky renders even before a place is chosen
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
