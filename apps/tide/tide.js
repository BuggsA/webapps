/* ==========================================================================
   Tide — the moon moving the ocean, on a globe seen from the moon.

   Built (see docs/tide-build-plan.md): Phase 0 data prep + harmonic engine
   (lib/harmonics.js, gated on NOAA); Phase 1 the globe (camera at the
   sub-lunar point, EOT20 tide field as light on water, land, day/night,
   the moon disc); Phase 2 your place (Open-Meteo / NOAA series, the
   readout, inland grace, offline); Phase 3 time (scrub −3 d … +15 d,
   play at 1 h/s); Phase 4 chrome + a11y + reduced motion; Phase 5 finish.

   ART DIRECTION: UNDER THE MOON (+ two borrows: the readout set as table
   rows; height rendered as luminance of one sea hue). See
   docs/tide-art-direction.md and run its checklist before every commit.

   Model:  state.t is the master variable (ms, UTC). Everything on the
           globe derives from t; the camera follows the sub-lunar point
           at t unless the user has zoomed to a place. The readout derives
           from t + the place's sea-level series.

   MAP OF THIS FILE (search the ALL-CAPS tag to jump):
     TUNABLES / STATE / ELEMENTS / SMALL MATH
     COLOUR              — oklch → sRGB, the three luminance LUTs, the η→L map
     ASTRONOMY GLUE      — subPoint() (sub-lunar / sub-solar), moon phase, rise/set
     DATA                — loadLand(), loadCoast(), loadField(), loadStations()
     FIELD               — computeField(t): η per 1° cell from the constituents,
                           plus its spatial gradient (gradLat/gradLon) for RELIEF
     CAMERA              — cam / target / drag offset / ease-back / fly-to
     PROJECTION          — project(), frame constants (sun & moon in camera frame)
     PAINT               — buildLandMask() (lat/lon raster), prepRings()/projectRings()
                           (coast hairline only), paintSea() (per-pixel pass, incl. RELIEF
                           shading — docs/tide-visibility-research.md §2, built 2026-09-16),
                           paintCoast(), paintPlace(), paintMoon() + paintMoonLine()
                           (tracked marker — same doc §3), paintGrain(), paintScrim()
     TIME MODEL          — now0, live / hold / play, scrub, clock
     PLACE + SERIES      — geocode, device, coast distance, NOAA proximity,
                           loadSeries() (cached), turning points, heightAt()
     PICK                — long-press the globe to set your place: unproject(),
                           nearestCoast() snap, a tethered preview card (Tonight's
                           .card shape) with an explicit "Use this place" commit —
                           docs/tide-tap-select-research.md, built 2026-09-17
     READOUT             — updateReadout(): state line, rows, range, moon, sun
     WEEK                — the next 7 days as rows + the 14-day lowest/highest
                           line (docs/tide-v2-plan.md phase 7), inside Detail, source
     DETAIL              — setDetail()/sizeDetail(): the on-demand panel for turns/
                           range/moon/sun (source + hand-off stay always visible) —
                           docs/tide-panel-research.md, Option C, decided 2026-09-16
     CURVE               — paintCurve() (36 h hairline in the readout), nightBands(),
                           sizeCurve(), pointer-drag-to-scrub on the curve
     INPUT               — drag, wheel, pinch, keys, buttons
     THE LOOP / ENTRY
   ========================================================================== */
'use strict';

const A = window.Astronomy;
const H = window.Harmonics;
const track = (window.Telemetry && window.Telemetry.track) || function () {};

/* --- TUNABLES ---------------------------------------------------------- */
const REDUCED    = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DAY        = 86400e3;
const SCRUB_PAST = 3 * DAY, SCRUB_AHEAD = 15 * DAY;
const PLAY_RATE  = 3600;             // simulated seconds per real second (1 h/s)
const ZOOM_PLACE = 3.2;              // zoom when flying to a place
const ZOOM_MAX   = 14;
const EASE_BACK  = 4000;             // ms, drag offset returns to the moon's view
const INLAND_KM  = 25;               // beyond this: "N km from the sea"
const NOAA_KM    = 15;               // within this: official NOAA prediction
const CURVE_BEFORE = 6 * 3600e3, CURVE_AFTER = 30 * 3600e3;  // the readout curve's window
const LONGPRESS_MS   = 550;          // hold time to register a pick — matches Maps' own
const LONGPRESS_SLOP = 8;            // px of drift tolerated before it's a drag, not a hold
const SEA_L0 = 0.35, SEA_LA = 0.20;  // luminance: L = L0 + LA·tanh(|η/0.6|^0.65)
const RELIEF_GAIN = 2, REL_CLAMP = 0.05;    // raking-light relief term — calibrated live: median
// near-terminator ocean gradient ~0.009 raw -> ~0.018 L; the steepest ~10% saturate at the clamp.
const LS_PLACE = 'tide.place';
const FPS_CAP  = REDUCED ? 4 : 30;

/* --- STATE ------------------------------------------------------------- */
const state = {
  t: Date.now(), now0: Date.now(), mode: 'live', playFrom: 0,
  lat: NaN, lon: NaN, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, place: '',
  located: false, inlandKm: 0, coastLat: NaN, coastLon: NaN,
  series: null,           // { src, pts:[{t,v}], turns:[{t,v,type}], name, country }
  units: /-US$/i.test(navigator.language || '') ? 'ft' : 'm',
};
const cam = { lat: 0, lon: 0, zoom: 1 };            // what is drawn
const view = { mode: 'moon', off: { lat: 0, lon: 0 }, pan: { lat: 0, lon: 0 }, zoom: 1,
               ease: null, fly: 0 };                // where it is going
let W = 0, Hh = 0, dpr = 1;
let R = 0, cx = 0, cy = 0;                          // globe radius/centre, CSS px
let land110 = null, land50 = null, stations = null;
let pendingPick = null;             // { lat, lon, x, y, name, country } — the tethered preview, if open
let geo110 = null, geo50 = null;                     // rings as unit vectors + a bounding cap
let field = null;                                   // { names, ampC[], ampS[], N, nlon, nlat, lon0, lat0 }
const eta = new Float32Array(360 * 180);
// spatial gradient of eta (deg^-1), refilled alongside it — feeds the relief-shading term in paintSea()
const gradLat = new Float32Array(360 * 180), gradLon = new Float32Array(360 * 180);
let etaAt = -Infinity;
let lastFrame = 0, dirty = true;

/* --- ELEMENTS ---------------------------------------------------------- */
const $ = id => document.getElementById(id);
const el = {
  canvas: $('globe'), moon: $('moon'), readout: $('readout'), rule: $('ro-rule'),
  roPlace: $('ro-place'), roState: $('ro-state'), roTurns: $('ro-turns'), roRange: $('ro-range'),
  roMoon: $('ro-moon'), roSun: $('ro-sun'), roSrc: $('ro-src'), roHand: $('ro-handoff'),
  locate: $('locate'), input: $('place-input'), results: $('place-results'), msg: $('locate-msg'),
  useDevice: $('use-device'), justLook: $('just-look'),
  controls: $('controls'), btnNow: $('btn-now'), btnPlay: $('btn-play'), scrub: $('scrub'),
  clock: $('clock'), btnWhere: $('btn-where'), btnAbout: $('btn-about'),
  about: $('about'), aboutClose: $('about-close'), curve: $('curve'),
  roDetail: $('ro-detail'), btnDetail: $('btn-detail'),
  roWeek: $('ro-week'), btnWeek: $('btn-week'), roExtreme: $('ro-extreme'),
  pick: $('pick-card'), pickName: $('pick-name'), pickUse: $('pick-use'),
};
const ctx = el.canvas.getContext('2d', { alpha: false });
const curveCtx = el.curve.getContext('2d');
let curveW = 0, curveH = 0;
const buf = document.createElement('canvas');       // low-res sea/land/light pass
const bctx = buf.getContext('2d', { willReadFrequently: true });
let bw = 0, bh = 0, bs = 0.5;                       // buffer size + scale (CSS px → buffer px)

/* --- SMALL MATH -------------------------------------------------------- */
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const wrapLon = d => ((d + 540) % 360) - 180;
const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
// atan2 / asin to ~1e-5 rad (a 6-term odd polynomial) — the per-pixel pass
// spends most of its time here, and Math.atan2 is 2–3× slower.
function fatan(x) { const x2 = x * x; return x * (0.99997726 + x2 * (-0.33262347 + x2 * (0.19354346 + x2 * (-0.11643287 + x2 * (0.05265332 - 0.01172120 * x2))))); }
function fatan2(y, x) {
  const ax = Math.abs(x), ay = Math.abs(y);
  const swap = ay > ax, r = swap ? ax / ay : (ax === 0 ? 0 : ay / ax);
  let a = fatan(r);
  if (swap) a = 1.5707963267948966 - a;
  if (x < 0) a = 3.141592653589793 - a;
  return y < 0 ? -a : a;
}
function fasin(v) { return fatan2(v, Math.sqrt(Math.max(0, 1 - v * v))); }
function kmBetween(lat1, lon1, lat2, lon2) {
  const x = wrapLon(lon2 - lon1) * Math.cos((lat1 + lat2) * 0.5 * D2R), y = lat2 - lat1;
  return Math.sqrt(x * x + y * y) * 111.2;
}

/* --- COLOUR ------------------------------------------------------------ */
function oklchToRgb(L, C, hDeg) {
  const h = hDeg * D2R, a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const enc = x => { x = clamp(x, 0, 1); return Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055)); };
  return [enc(r), enc(g), enc(bb)];
}
function makeLut(C, h) {            // 256 luminance steps → rgb bytes
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) { const [r, g, b] = oklchToRgb(i / 255, C, h); lut[i * 3] = r; lut[i * 3 + 1] = g; lut[i * 3 + 2] = b; }
  return lut;
}
const LUT_SEA  = makeLut(0.080, 235);   // the sea hue (palette: deep clear water)
const LUT_LAND = makeLut(0.020, 260);   // derived: +25°, low chroma
const LUT_WARM = makeLut(0.060, 70);    // the terminator's warm edge
const BG = oklchToRgb(0.13, 0.02, 250);
// η (m) → sea luminance, precomputed at 1 cm from −8 m to +8 m
const ETA_LUT = new Float32Array(1601);
for (let i = 0; i <= 1600; i++) { const e = (i - 800) / 100; ETA_LUT[i] = SEA_L0 + SEA_LA * Math.tanh(Math.sign(e) * Math.pow(Math.abs(e) / 0.6, 0.65)); }

/* --- ASTRONOMY GLUE ---------------------------------------------------- */
// Sub-point (lat, lon deg) of a body: where it is straight overhead.
function subPoint(body, ms) {
  const time = A.MakeTime(new Date(ms));
  const vec = A.GeoVector(body, time, true);
  const eqd = A.RotateVector(A.Rotation_EQJ_EQD(time), vec);
  const eq = A.EquatorFromVector(eqd);
  const gst = A.SiderealTime(time);                       // hours
  return { lat: eq.dec, lon: wrapLon((eq.ra - gst) * 15), dist: eq.dist };
}
function moonInfo(ms) {
  const time = A.MakeTime(new Date(ms));
  const ill = A.Illumination(A.Body.Moon, time);
  return { phase: A.MoonPhase(time), frac: ill.phase_fraction };
}
function riseSet(body, lat, lon, dayStartMs) {
  const obs = new A.Observer(lat, lon, 0), t0 = A.MakeTime(new Date(dayStartMs));
  const r = A.SearchRiseSet(body, obs, +1, t0, 1), s = A.SearchRiseSet(body, obs, -1, t0, 1);
  return { rise: r ? r.date.getTime() : null, set: s ? s.date.getTime() : null };
}

/* --- DATA -------------------------------------------------------------- */
async function loadLand() {
  const r = await fetch('data/land-110m.json'); const j = await r.json();
  land110 = j.rings.map(f => new Float32Array(f));
  geo110 = prepRings(land110);
  if (!land50) buildLandMask(land110);
  dirty = true;
}
async function loadCoast() {
  if (land50 || loadCoast.busy) return; loadCoast.busy = true;
  try {
    const r = await fetch('data/land-50m.bin'); const ab = await r.arrayBuffer();
    const dv = new DataView(ab); let o = 8; const n = dv.getUint32(4, true); const rings = [];
    for (let k = 0; k < n; k++) {
      const m = dv.getUint32(o, true); o += 4;
      const ring = new Float32Array(m * 2);
      for (let i = 0; i < m; i++) { ring[i * 2] = dv.getInt16(o, true) / 100; ring[i * 2 + 1] = dv.getInt16(o + 2, true) / 100; o += 4; }
      rings.push(ring);
    }
    land50 = rings; geo50 = prepRings(rings); buildLandMask(land50); dirty = true;
  } catch (_) { loadCoast.busy = false; }
}
async function loadField() {
  try {
    const meta = await (await fetch('data/tide-field.json')).json();
    const ab = await (await fetch('data/' + meta.file)).arrayBuffer();
    const nlon = meta.nlon, nlat = meta.nlat, N = nlon * nlat, names = meta.constituents;
    const ampC = [], ampS = []; let o = 0;
    for (let c = 0; c < names.length; c++) {
      const amp = new Uint16Array(ab, o, N); o += N * 2;
      const ph = new Uint8Array(ab, o, N); o += N;
      const C = new Float32Array(N), S = new Float32Array(N);
      for (let k = 0; k < N; k++) {
        const a = amp[k] * meta.ampScale, g = ph[k] * meta.phaseScale * D2R;
        C[k] = a * Math.cos(g); S[k] = a * Math.sin(g);
      }
      ampC.push(C); ampS.push(S);
    }
    field = { names, ampC, ampS, N, nlon, nlat, lon0: meta.lon0, lat0: meta.lat0 };
    etaAt = -Infinity; dirty = true;
  } catch (_) { /* the globe still runs: flat sea, real light */ }
}
async function loadStations() {
  if (stations) return stations;
  try { stations = await (await fetch('data/noaa-stations.json')).json(); } catch (_) { stations = []; }
  return stations;
}

/* --- FIELD ------------------------------------------------------------- */
// η per cell at time t. Recomputed when t moves by more than a minute.
function computeField(t) {
  if (!field || Math.abs(t - etaAt) < 60e3) return;
  etaAt = t;
  const args = H.args(t, field.names);
  eta.fill(0);
  for (let c = 0; c < field.names.length; c++) {
    const a = args[field.names[c]]; if (!a) continue;
    const fc = a.f * Math.cos(a.arg * D2R), fs = a.f * Math.sin(a.arg * D2R);
    const C = field.ampC[c], S = field.ampS[c];
    for (let k = 0; k < field.N; k++) eta[k] += C[k] * fc + S[k] * fs;
  }
  // Spatial gradient of eta (central differences, deg^-1): wraps in longitude,
  // one-sided at the poles. Feeds paintSea's relief-shading term — a real
  // slope of the actual tide data, not a decorative texture. Cheap: one pass
  // over the same 64,800-cell grid, once per simulated minute, not per pixel.
  const nlon = field.nlon, nlat = field.nlat;
  for (let j = 0; j < nlat; j++) {
    const jN = Math.min(j + 1, nlat - 1), jS = Math.max(j - 1, 0), latSpan = (jN - jS) || 1;
    const row = j * nlon, rowN = jN * nlon, rowS = jS * nlon;
    for (let i = 0; i < nlon; i++) {
      const iE = (i + 1) % nlon, iW = (i - 1 + nlon) % nlon;
      gradLon[row + i] = (eta[row + iE] - eta[row + iW]) / 2;
      gradLat[row + i] = (eta[rowN + i] - eta[rowS + i]) / latSpan;
    }
  }
}
// bilinear sample of η at (lat, lon) degrees
function sampleEta(lat, lon) {
  const nlon = field.nlon, nlat = field.nlat;
  let u = lon - field.lon0; u -= Math.floor(u / 360) * 360;
  let v = clamp(lat - field.lat0, 0, nlat - 1.0001);
  const i0 = Math.floor(u) % nlon, i1 = (i0 + 1) % nlon, fu = u - Math.floor(u);
  const j0 = Math.floor(v), j1 = Math.min(j0 + 1, nlat - 1), fv = v - j0;
  const a = eta[j0 * nlon + i0], b = eta[j0 * nlon + i1], c = eta[j1 * nlon + i0], d = eta[j1 * nlon + i1];
  return (a + (b - a) * fu) * (1 - fv) + (c + (d - c) * fu) * fv;
}
// bilinear sample of the eta gradient at (lat, lon) — same indexing as
// sampleEta, kept as its own function rather than folded together so
// callers that don't need the gradient (most of them) pay nothing for it.
function sampleGrad(lat, lon) {
  const nlon = field.nlon, nlat = field.nlat;
  let u = lon - field.lon0; u -= Math.floor(u / 360) * 360;
  let v = clamp(lat - field.lat0, 0, nlat - 1.0001);
  const i0 = Math.floor(u) % nlon, i1 = (i0 + 1) % nlon, fu = u - Math.floor(u);
  const j0 = Math.floor(v), j1 = Math.min(j0 + 1, nlat - 1), fv = v - j0;
  const r0 = j0 * nlon, r1 = j1 * nlon;
  const loA = gradLon[r0 + i0], loB = gradLon[r0 + i1], loC = gradLon[r1 + i0], loD = gradLon[r1 + i1];
  const laA = gradLat[r0 + i0], laB = gradLat[r0 + i1], laC = gradLat[r1 + i0], laD = gradLat[r1 + i1];
  const gLon = (loA + (loB - loA) * fu) * (1 - fv) + (loC + (loD - loC) * fu) * fv;
  const gLat = (laA + (laB - laA) * fu) * (1 - fv) + (laC + (laD - laC) * fu) * fv;
  return [gLat, gLon];
}

/* --- CAMERA ------------------------------------------------------------ */
let sub = { lat: 0, lon: 0 }, sunPt = { lat: 0, lon: 0 }, moonI = { phase: 0, frac: 0.5 };
function cameraTarget() {
  if (view.mode === 'place') return { lat: view.pan.lat, lon: view.pan.lon, zoom: view.zoom };
  let off = view.off;
  if (view.ease) {                       // easing back to the moon's view
    const u = clamp((performance.now() - view.ease.t0) / EASE_BACK, 0, 1);
    const k = 1 - easeOutCubic(u);
    off = { lat: view.ease.lat * k, lon: view.ease.lon * k };
    view.off = off;
    if (u >= 1) view.ease = null;
  }
  return { lat: clamp(sub.lat + off.lat, -89, 89), lon: wrapLon(sub.lon + off.lon), zoom: 1 };
}
function stepCamera(dtMs) {
  const tg = cameraTarget();
  if (REDUCED && !view.fly) { cam.lat = tg.lat; cam.lon = tg.lon; cam.zoom = tg.zoom; return; }
  const tau = view.fly ? 650 : 220;
  const k = 1 - Math.exp(-dtMs / tau);
  cam.lat += (tg.lat - cam.lat) * k;
  cam.lon = wrapLon(cam.lon + wrapLon(tg.lon - cam.lon) * k);
  cam.zoom += (tg.zoom - cam.zoom) * k;
  if (view.fly && Math.abs(tg.zoom - cam.zoom) < 0.01 && Math.abs(wrapLon(tg.lon - cam.lon)) < 0.05) view.fly = 0;
  const moving = Math.abs(tg.lat - cam.lat) > 0.01 || Math.abs(wrapLon(tg.lon - cam.lon)) > 0.01 || Math.abs(tg.zoom - cam.zoom) > 0.002;
  if (moving) dirty = true;
}
function flyToPlace() {
  view.mode = 'place'; view.pan = { lat: state.coastLat, lon: state.coastLon }; view.zoom = ZOOM_PLACE; view.fly = 1; view.ease = null;
  loadCoast(); dirty = true;
}
function backToMoon() {
  if (view.mode === 'place') {
    view.mode = 'moon'; view.off = { lat: cam.lat - sub.lat, lon: wrapLon(cam.lon - sub.lon) };
  }
  view.ease = { t0: performance.now(), lat: view.off.lat, lon: view.off.lon };
  view.zoom = 1; view.fly = 1; dirty = true;
  track('moon');
}

/* --- PROJECTION -------------------------------------------------------- */
let sinP0 = 0, cosP0 = 1, lam0 = 0;
let sunCam = [0, 0, 1], moonCam = [0, 0, 1];
function toCam(lat, lon) {             // world unit vector → camera frame (x right, y up, z out)
  const p = lat * D2R, l = lon * D2R, cp = Math.cos(p);
  const v = [cp * Math.cos(l), cp * Math.sin(l), Math.sin(p)];
  const sl = Math.sin(lam0), cl = Math.cos(lam0);
  const right = [-sl, cl, 0], up = [-sinP0 * cl, -sinP0 * sl, cosP0], fwd = [cosP0 * cl, cosP0 * sl, sinP0];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return [dot(v, right), dot(v, up), dot(v, fwd)];
}
function frameConstants() {
  sinP0 = Math.sin(cam.lat * D2R); cosP0 = Math.cos(cam.lat * D2R); lam0 = cam.lon * D2R;
  sunCam = toCam(sunPt.lat, sunPt.lon);
  moonCam = toCam(sub.lat, sub.lon);
  const sl = Math.sin(lam0), cl = Math.cos(lam0);
  basis = { r: [-sl, cl, 0], u: [-sinP0 * cl, -sinP0 * sl, cosP0], f: [cosP0 * cl, cosP0 * sl, sinP0] };
}
// forward: returns [x, y, z] in unit-sphere camera coords
function project(lat, lon) {
  const p = lat * D2R, dl = lon * D2R - lam0, cp = Math.cos(p), sp = Math.sin(p), cdl = Math.cos(dl);
  return [cp * Math.sin(dl), cosP0 * sp - sinP0 * cp * cdl, sinP0 * sp + cosP0 * cp * cdl];
}
// inverse: screen px → {lat,lon} on the sphere, or null if the point misses the globe
function unproject(px, py) {
  const X = (px - cx) / R, Y = (cy - py) / R, r2 = X * X + Y * Y;
  if (r2 >= 1) return null;
  const Z = Math.sqrt(1 - r2);
  return { lat: fasin(clamp(Z * sinP0 + Y * cosP0, -1, 1)) * R2D, lon: wrapLon((lam0 + fatan2(X, Z * cosP0 - Y * sinP0)) * R2D) };
}

/* --- PAINT ------------------------------------------------------------- */
// Rings → unit vectors (x,y,z per vertex) + a bounding cap (centre vector,
// angular radius) so a frame can skip rings that cannot be on screen and
// project the rest with nine multiplies instead of four trig calls.
function prepRings(rings) {
  return rings.map(ring => {
    const n = ring.length >> 1, v = new Float32Array(n * 3);
    let sx = 0, sy = 0, sz = 0;
    for (let i = 0; i < n; i++) {
      const p = ring[i * 2 + 1] * D2R, l = ring[i * 2] * D2R, cp = Math.cos(p);
      const x = cp * Math.cos(l), y = cp * Math.sin(l), z = Math.sin(p);
      v[i * 3] = x; v[i * 3 + 1] = y; v[i * 3 + 2] = z; sx += x; sy += y; sz += z;
    }
    const L = Math.hypot(sx, sy, sz) || 1; const c = [sx / L, sy / L, sz / L];
    let minDot = 1;
    for (let i = 0; i < n; i++) { const d = v[i * 3] * c[0] + v[i * 3 + 1] * c[1] + v[i * 3 + 2] * c[2]; if (d < minDot) minDot = d; }
    return { v, n, c, ang: Math.acos(clamp(minDot, -1, 1)) };
  });
}
let basis = { r: [0, 1, 0], u: [0, 0, 1], f: [1, 0, 0] };
// Land as an equirectangular raster (0.125°), rasterised once from the rings.
// Sampled per pixel by (lat, lon) — no limb clipping, no polar-ring trouble.
const MW = 2880, MH = 1440;
let landMask = null;
function buildLandMask(rings) {
  const c = document.createElement('canvas'); c.width = MW; c.height = MH;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.beginPath();
  for (const ring of rings) {
    const n = ring.length >> 1;
    for (let i = 0; i < n; i++) {
      const x = (ring[i * 2] + 180) / 360 * MW, y = (90 - ring[i * 2 + 1]) / 180 * MH;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  }
  g.fill('evenodd');
  const d = g.getImageData(0, 0, MW, MH).data, m = new Uint8Array(MW * MH);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  landMask = m; dirty = true;
}
function currentGeo() { return (cam.zoom >= 2.2 && geo50) ? geo50 : geo110; }
// project the current ring set once per frame: [{ pts (unit-disc coords), n, front }]
let projected = [];
function projectRings() {
  const geo = currentGeo(); projected = [];
  if (!geo) return;
  const { r, u, f } = basis;
  // how much of the sphere can be on screen: the farthest viewport corner from the centre
  const far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, Hh - cy), Math.hypot(W - cx, Hh - cy));
  const half = far >= R ? Math.PI / 2 : Math.asin(far / R);
  for (const g of geo) {
    const cd = g.c[0] * f[0] + g.c[1] * f[1] + g.c[2] * f[2];
    if (Math.acos(clamp(cd, -1, 1)) - g.ang > half + 0.02) continue;      // entirely off the hemisphere in view
    // the ring's projection lies within a screen circle around its cap centre
    const gx = g.c[0] * r[0] + g.c[1] * r[1] + g.c[2] * r[2], gy = g.c[0] * u[0] + g.c[1] * u[1] + g.c[2] * u[2];
    const rr = R * Math.sin(Math.min(g.ang, Math.PI / 2)) + 2, px = cx + R * gx, py = cy - R * gy;
    if (px + rr < 0 || px - rr > W || py + rr < 0 || py - rr > Hh) continue;   // off the viewport
    const n = g.n, v = g.v, pts = new Float32Array(n * 2), zs = new Float32Array(n); let front = false;
    for (let i = 0; i < n; i++) {
      const vx = v[i * 3], vy = v[i * 3 + 1], vz = v[i * 3 + 2];
      let x = vx * r[0] + vy * r[1] + vz * r[2], y = vx * u[0] + vy * u[1] + vz * u[2];
      const z = vx * f[0] + vy * f[1] + vz * f[2];
      if (z < 0) { const L = Math.hypot(x, y) || 1; x /= L; y /= L; } else front = true;
      pts[i * 2] = x; pts[i * 2 + 1] = y; zs[i] = z;
    }
    if (front) projected.push({ pts, zs, n });
  }
}
function paintSea() {
  const img = bctx.createImageData(bw, bh), d = img.data;
  const bR = R * bs, bcx = cx * bs, bcy = cy * bs;
  const x0 = Math.max(0, Math.floor(bcx - bR - 2)), x1 = Math.min(bw, Math.ceil(bcx + bR + 2));
  const y0 = Math.max(0, Math.floor(bcy - bR - 2)), y1 = Math.min(bh, Math.ceil(bcy + bR + 2));
  const [sx, sy, sz] = sunCam, [mx, my, mz] = moonCam;
  const moonLift = 0.05 * moonI.frac;
  // raking-light relief term (docs/tide-visibility-research.md §2): the real
  // slope of the tide field, dotted against the direction of increasing
  // sunlight — a closed form of "which way does the light come from here,"
  // so it peaks at the terminator and vanishes at local noon/midnight for
  // free, with no per-pixel trig beyond sin/cos of one angle.
  const sinSunLat = Math.sin(sunPt.lat * D2R), cosSunLat = Math.cos(sunPt.lat * D2R), sunLon = sunPt.lon;
  const edge = 1.3 / bR, haveField = !!field;
  // fill the background everywhere first
  for (let i = 0; i < d.length; i += 4) { d[i] = BG[0]; d[i + 1] = BG[1]; d[i + 2] = BG[2]; d[i + 3] = 255; }
  for (let py = y0; py < y1; py++) {
    const Y = (bcy - (py + 0.5)) / bR;
    for (let px = x0; px < x1; px++) {
      const X = (px + 0.5 - bcx) / bR;
      const r2 = X * X + Y * Y;
      if (r2 > (1 + edge) * (1 + edge)) continue;
      const rr = Math.sqrt(r2);
      const aEdge = rr > 1 ? clamp((1 + edge - rr) / edge, 0, 1) : 1;
      const Z = rr >= 1 ? 0 : Math.sqrt(1 - r2);
      const idx = (py * bw + px) * 4;
      const sp = Z * sinP0 + Y * cosP0;
      const lat = fasin(clamp(sp, -1, 1)) * R2D;
      let lon = (lam0 + fatan2(X, Z * cosP0 - Y * sinP0)) * R2D;
      lon -= Math.floor((lon + 180) / 360) * 360;                 // → [−180, 180)
      // land fraction: bilinear over the 0.125° raster → a soft, antialiased coast
      let landF = 0;
      if (landMask) {
        const fy = clamp((90 - lat) / 180 * MH - 0.5, 0, MH - 1.001), fx = (lon + 180) / 360 * MW - 0.5;
        const y0 = fy | 0, y1 = Math.min(y0 + 1, MH - 1), ty = fy - y0;
        const x0 = ((fx | 0) % MW + MW) % MW, x1 = (x0 + 1) % MW, tx = fx - Math.floor(fx);
        const r0 = y0 * MW, r1 = y1 * MW;
        landF = (landMask[r0 + x0] * (1 - tx) + landMask[r0 + x1] * tx) * (1 - ty) + (landMask[r1 + x0] * (1 - tx) + landMask[r1 + x1] * tx) * ty;
      }
      const isLand = landF >= 0.5;
      const dSun = X * sx + Y * sy + Z * sz;
      const dMoon = X * mx + Y * my + Z * mz;
      const day = smooth(-0.12, 0.22, dSun);
      let L;
      if (isLand) {
        L = 0.13 + 0.17 * day;
      } else {
        const e = haveField ? sampleEta(lat, lon) : 0;
        const ei = clamp(Math.round(e * 100) + 800, 0, 1600);
        L = ETA_LUT[ei] * (0.38 + 0.62 * day);     // night keeps the tide readable
        if (haveField) {
          const cp = Math.sqrt(Math.max(0, 1 - sp * sp));
          const dlon = (lon - sunLon) * D2R, sdl = Math.sin(dlon), cdl = Math.cos(dlon);
          const dSunLat = cp * sinSunLat - sp * cosSunLat * cdl;   // ∂(sun altitude term)/∂lat
          const dSunLon = -cp * cosSunLat * sdl;                   // ∂(sun altitude term)/∂lon
          const [gLat, gLon] = sampleGrad(lat, lon);
          L += clamp((gLat * dSunLat + gLon * dSunLon) * RELIEF_GAIN, -REL_CLAMP, REL_CLAMP);
        }
      }
      L += moonLift * Math.max(0, dMoon);
      L *= 0.82 + 0.18 * Z;                       // quiet limb darkening
      const li = clamp(Math.round(L * 255), 0, 255) * 3;
      const lut = isLand ? LUT_LAND : LUT_SEA;
      let r = lut[li], g = lut[li + 1], b = lut[li + 2];
      if (landF > 0.02 && landF < 0.98) {                       // the coast: mix the other side in
        const o = isLand ? LUT_SEA : LUT_LAND, w = isLand ? 1 - landF : landF;
        r += (o[li] - r) * w; g += (o[li + 1] - g) * w; b += (o[li + 2] - b) * w;
      }
      // the warm edge of the terminator, day side
      const wd = (dSun - 0.05) / 0.11, w = 0.30 * Math.exp(-wd * wd) * (isLand ? 0.5 : 1) * Z;   // fades at the limb: never a ring
      if (w > 0.02) { r += (LUT_WARM[li] - r) * w; g += (LUT_WARM[li + 1] - g) * w; b += (LUT_WARM[li + 2] - b) * w; }
      if (aEdge < 1) { r = lerp(BG[0], r, aEdge); g = lerp(BG[1], g, aEdge); b = lerp(BG[2], b, aEdge); }
      d[idx] = r; d[idx + 1] = g; d[idx + 2] = b;
    }
  }
  bctx.putImageData(img, 0, 0);
}

function paintCoast() {
  if (!geo50 || cam.zoom < 2 || currentGeo() !== geo50) return;
  const a = clamp((cam.zoom - 2) / 2.5, 0, 1) * 0.55;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgb(243,238,228)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (const p of projected) {
    const pts = p.pts, zs = p.zs; let pen = false;
    for (let i = 0; i < p.n; i++) {
      if (zs[i] <= 0.02) { pen = false; continue; }
      const sx = cx + R * pts[i * 2], sy = cy - R * pts[i * 2 + 1];
      if (sx < -50 || sy < -50 || sx > W + 50 || sy > Hh + 50) { pen = false; continue; }
      if (!pen) { ctx.moveTo(sx, sy); pen = true; } else ctx.lineTo(sx, sy);
    }
  }
  ctx.stroke(); ctx.restore();
}
function paintPlace() {
  if (!state.located) return;
  const [x, y, z] = project(state.coastLat, state.coastLon);
  if (z <= 0.01) return;
  const sx = cx + R * x, sy = cy - R * y;
  ctx.save(); ctx.strokeStyle = 'rgba(243,238,228,0.9)'; ctx.fillStyle = 'rgba(243,238,228,0.9)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// The pending pick (docs/tide-tap-select-research.md): a lighter, dashed
// ring — deliberately distinct from paintPlace()'s committed marker above —
// tethered to #pick-card by a hairline, the same leader-line shape Tonight
// uses for its tap-to-select card. Positions from the live projection every
// frame, same as the moon marker, so it drifts correctly with the globe;
// if the point rotates past the limb the preview no longer means anything
// concrete, so it's dropped rather than left stranded off in space.
function paintPick() {
  if (!pendingPick) return;
  const [X, Y, Z] = project(pendingPick.lat, pendingPick.lon);
  if (Z <= 0.02) { cancelPick(); return; }
  const px = cx + R * X, py = cy - R * Y;
  ctx.save();
  ctx.strokeStyle = 'rgba(243,238,228,0.55)'; ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(243,238,228,0.85)';
  ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
  const cw = el.pick.offsetWidth || 220, ch = el.pick.offsetHeight || 70;
  const m = 14, topLimit = 14;
  const bottomLimit = (el.controls.hidden ? Hh : el.controls.getBoundingClientRect().top) - m;
  const lx = clamp(px + 18, m, Math.max(m, W - cw - m));
  const ly = clamp(py + 16, topLimit, Math.max(topLimit, bottomLimit - ch));
  el.pick.style.left = lx + 'px'; el.pick.style.top = ly + 'px';
  const tx = clamp(px, lx, lx + cw), ty = clamp(py, ly, ly + ch);
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.restore();
}
// The moon is a tracked object, not fixed chrome (docs/tide-visibility-research.md
// §3, built 2026-09-16): its screen position comes from moonCam — the same
// vector already driving the moonlight-lift term — projected to just
// outside the globe's rim in whatever direction the moon actually is from
// the current camera, and clamped inside the safe viewport margins like an
// off-screen/edge indicator. Drag away from the moon's view and it visibly
// swings toward the edge; release, and it eases back to centre with the
// camera — the causal link is demonstrated by the motion, not asserted by
// a caption. Works identically whether the camera is following the moon
// or is zoomed to a place, since moonCam is computed the same way in both.
function moonMarkerPos() {
  const [mx, my, mz] = moonCam;
  const mag = Math.hypot(mx, my);
  const dirx = mag > 1e-4 ? mx / mag : 0, diry = mag > 1e-4 ? my / mag : 1;   // home: straight up
  const orbitR = R * 1.18 + 26;
  let x = cx + dirx * orbitR, y = cy - diry * orbitR;
  const m = 26;                                    // half the 44px target + a couple px
  const bottomLimit = (el.controls.hidden ? Hh : el.controls.getBoundingClientRect().top) - m - 4;
  x = clamp(x, m, W - m);
  y = clamp(y, m, Math.max(m, bottomLimit));
  // the marker sits above the readout in z-index (it's a real hit target,
  // not just a drawing) — never let it land on the readout's text, or its
  // 44px target would steal taps meant for the curve/turns underneath.
  // Check feasibility before picking a direction to push, not after —
  // picking blind and re-clamping can undo the push right back into the
  // collision it was meant to escape.
  if (!el.readout.hidden) {
    const rr = el.readout.getBoundingClientRect();
    if (x > rr.left - m && x < rr.right + m && y > rr.top - m && y < rr.bottom + m) {
      const downY = rr.bottom + m, rightX = rr.right + m;
      const canDown = downY <= bottomLimit, canRight = rightX <= W - m;
      if (canDown && (!canRight || (downY - y) <= (rightX - x))) y = downY;
      else if (canRight) x = rightX;
      else y = bottomLimit;             // neither escape fits: settle at the floor, clear of the text above
      x = clamp(x, m, W - m);
      y = clamp(y, m, Math.max(m, bottomLimit));
    }
  }
  const alpha = 0.12 + 0.88 * smooth(-0.15, 0.15, mz);   // fades toward a faint ghost, never vanishes outright
  return { x, y, alpha };
}
function positionMoonButton(mm) {
  el.moon.style.left = (mm.x - 22) + 'px';
  el.moon.style.top = (mm.y - 22) + 'px';
  el.moon.style.transform = 'none';
}
// A faint hairline from the marker to the sub-lunar point on the globe —
// only while the sub-lunar point is actually visible and the two aren't
// already coincident (the default, undragged view), so it confirms the
// relationship rather than restating it.
function paintMoonLine(mm) {
  const [X, Y, Z] = project(sub.lat, sub.lon);
  if (Z <= 0.02) return;
  const px = cx + R * X, py = cy - R * Y;
  if (Math.hypot(mm.x - px, mm.y - py) < 30) return;
  ctx.save();
  ctx.globalAlpha = 0.20 * mm.alpha;
  ctx.strokeStyle = 'rgb(243,238,228)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(mm.x, mm.y); ctx.lineTo(px, py); ctx.stroke();
  ctx.restore();
}
function paintMoon(mm) {
  const { x, y, alpha } = mm; const r = 10;
  const P = moonI.phase, waxing = P < 180, rx = Math.abs(Math.cos(P * D2R)) * r, bulgeOut = Math.cos(P * D2R) > 0;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (!waxing) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(243,238,228,0.16)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(243,238,228,0.92)';
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);            // lit limb (right)
  ctx.ellipse(0, 0, Math.max(rx, 0.01), r, 0, Math.PI / 2, -Math.PI / 2, bulgeOut);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
let grainPat = null;
function bakeGrain() {
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d'), im = g.createImageData(96, 96);
  let s = 0x9e3779b9;
  for (let i = 0; i < im.data.length; i += 4) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    const v = 128 + ((s >>> 0) % 97) - 48;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  grainPat = ctx.createPattern(c, 'repeat');
}
function paintGrain() {
  if (!grainPat) return;
  ctx.save(); ctx.globalAlpha = 0.05; ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grainPat; ctx.fillRect(0, 0, W, Hh); ctx.restore();
}
// a soft darkening under the readout so type keeps 4.5:1 over high water
function paintScrim() {
  if (el.readout.hidden) return;
  const rect = el.readout.getBoundingClientRect();
  const g = ctx.createRadialGradient(rect.left + rect.width * 0.35, rect.top + rect.height * 0.4, 10,
                                     rect.left + rect.width * 0.35, rect.top + rect.height * 0.4, Math.max(rect.width, rect.height) * 1.1);
  g.addColorStop(0, 'rgba(5,9,18,0.55)'); g.addColorStop(1, 'rgba(5,9,18,0)');
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh); ctx.restore();
}

function layout() {
  const rr = el.readout.hidden ? null : el.readout.getBoundingClientRect();
  const base = 0.40 * Math.min(W, Hh);
  R = base * cam.zoom;
  cx = W / 2; cy = Hh * 0.53;
  if (!el.locate.hidden && W < 640 && cam.zoom < 1.6) {   // the prompt is open: globe up top
    const lr = el.locate.getBoundingClientRect();
    const r2 = Math.min(0.42 * W, (lr.top - 40) / 2);
    if (r2 > 60) { R = r2 * cam.zoom; cy = 40 + r2; }
  } else if (rr && cam.zoom < 1.6) {
    if (W < 640) {
      if (el.roDetail.hidden) {                       // phones: globe below the readout
        const top = rr.bottom + 8, bottom = Hh - 90;
        const r2 = Math.min(0.42 * W, (bottom - top) / 2);
        if (r2 > 60) { R = r2 * cam.zoom; cy = top + r2; }
      }
      // Detail open: there isn't room below a full-length readout on a
      // phone, so don't fight it for space — leave the globe at its
      // default centred size and let the (translucent, scrim-backed)
      // panel sit over it, the same way #about and #locate already do.
    } else if (cx - R < rr.right + 12) {
      cx = Math.min(rr.right + 12 + R, W - R - 12);
    }
  }
}
function paint() {
  if (!bw || !bh || !W || !Hh) { resize(); if (!bw || !bh) return; }
  layout(); frameConstants();
  // buffer resolution follows the globe's on-screen area (~160k px in the pass)
  const want = clamp(Math.sqrt(90000 / Math.max(1, Math.min(Math.PI * R * R, W * Hh))), 0.25, 1);
  if (Math.abs(want - bs) > 0.08) { bs = want; bw = Math.ceil(W * bs); bh = Math.ceil(Hh * bs); buf.width = bw; buf.height = bh; paint.sig = null; }
  // rings are projected only for the coast hairline (zoomed in), and only
  // when the camera has moved
  if (cam.zoom >= 2 && geo50) {
    const sig = [cam.lat.toFixed(3), cam.lon.toFixed(3), cam.zoom.toFixed(3), cx | 0, cy | 0].join(',');
    if (sig !== paint.sig) { projectRings(); paint.sig = sig; }
  }
  paintSea();
  ctx.fillStyle = `rgb(${BG[0]},${BG[1]},${BG[2]})`; ctx.fillRect(0, 0, W, Hh);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(buf, 0, 0, bw, bh, 0, 0, W, Hh);
  paintCoast(); paintPlace(); paintPick(); paintScrim(); paintGrain();
  const mm = moonMarkerPos();
  positionMoonButton(mm);
  paintMoonLine(mm);
  paintMoon(mm);
}

/* --- CANVAS SIZING ----------------------------------------------------- */
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; Hh = window.innerHeight;
  if (!W || !Hh) { dirty = true; return; }
  el.canvas.width = Math.round(W * dpr); el.canvas.height = Math.round(Hh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bs = clamp(Math.sqrt(90000 / (W * Hh)), 0.25, 1);
  bw = Math.ceil(W * bs); bh = Math.ceil(Hh * bs); paint.sig = null;
  buf.width = bw; buf.height = bh;
  if (!grainPat) bakeGrain();
  dirty = true;
}

/* --- TIME MODEL -------------------------------------------------------- */
function scrubRange() { return { a: state.now0 - SCRUB_PAST, b: state.now0 + SCRUB_AHEAD }; }
function setScrubFromT() {
  const { a, b } = scrubRange();
  const u = clamp((state.t - a) / (b - a), 0, 1);
  el.scrub.value = Math.round(u * 1000);
  el.scrub.style.setProperty('--p', (u * 100).toFixed(2) + '%');
}
function setMode(mode) {
  state.mode = mode;
  el.btnPlay.textContent = mode === 'play' ? 'Pause' : 'Play';
  el.btnPlay.setAttribute('aria-pressed', mode === 'play' ? 'true' : 'false');
  if (mode === 'play') state.playFrom = state.t;
  dirty = true;
}
function stepTime(dtMs) {
  if (state.mode === 'live') { state.t = Date.now(); if (Date.now() - state.now0 > 6 * 3600e3) state.now0 = Date.now(); }
  else if (state.mode === 'play') {
    state.t += dtMs * PLAY_RATE;
    if (state.t > scrubRange().b) state.t = state.playFrom;
    dirty = true;
  }
}
const fmtCache = {};
function fmt(kind, tz) {
  const key = kind + '|' + tz;
  if (!fmtCache[key]) {
    const o = { timeZone: tz };
    if (kind === 'time') { o.hour = 'numeric'; o.minute = '2-digit'; }
    if (kind === 'day')  { o.weekday = 'short'; }
    if (kind === 'wday') { o.weekday = 'short'; o.day = 'numeric'; }
    if (kind === 'clock'){ o.weekday = 'short'; o.day = 'numeric'; o.hour = 'numeric'; o.minute = '2-digit'; }
    if (kind === 'date') { o.year = 'numeric'; o.month = '2-digit'; o.day = '2-digit'; }
    try { fmtCache[key] = new Intl.DateTimeFormat(undefined, o); } catch (_) { fmtCache[key] = new Intl.DateTimeFormat(undefined, { ...o, timeZone: undefined }); }
  }
  return fmtCache[key];
}
function localDayKey(ms) { return fmt('date', state.tz).format(new Date(ms)); }
let clockAt = 0;
function updateClock() {
  if (Math.abs(state.t - clockAt) < 30e3 && state.mode === 'live') return;
  clockAt = state.t;
  const live = state.mode === 'live';
  el.clock.textContent = live ? 'now · ' + fmt('time', state.tz).format(new Date(state.t)) : fmt('clock', state.tz).format(new Date(state.t));
  el.clock.classList.toggle('now', live);
  setScrubFromT();
}

/* --- PLACE + SERIES ---------------------------------------------------- */
function nearestCoast(lat, lon) {
  const rings = land50 || land110; if (!rings) return { km: 0, lat, lon };
  let best = Infinity, bl = lat, bo = lon;
  const cl = Math.cos(lat * D2R);
  for (const ring of rings) {
    const n = ring.length >> 1;
    for (let i = 0; i < n; i++) {
      const x = wrapLon(ring[i * 2] - lon) * cl, y = ring[i * 2 + 1] - lat, d = x * x + y * y;
      if (d < best) { best = d; bl = ring[i * 2 + 1]; bo = ring[i * 2]; }
    }
  }
  return { km: Math.sqrt(best) * 111.2, lat: bl, lon: bo };
}
function nearestStation(lat, lon) {
  if (!stations || !stations.length) return null;
  let best = null, bd = Infinity;
  for (const s of stations) { const d = kmBetween(lat, lon, s[2], s[3]); if (d < bd) { bd = d; best = s; } }
  return best && bd <= NOAA_KM ? { id: best[0], name: best[1], lat: best[2], lon: best[3], km: bd } : null;
}
function cacheGet(key, ttl) {
  try { const c = JSON.parse(localStorage.getItem(key) || 'null'); if (c && Date.now() - c.at < ttl) return c.v; if (c) return { stale: c.v }; } catch (_) {}
  return null;
}
function cacheSet(key, v) { try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), v })); } catch (_) {} }

function titleCase(s) { return s.toLowerCase().replace(/\b[a-z]/g, m => m.toUpperCase()); }
function ymd(ms) { const d = new Date(ms); return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0'); }

async function loadSeries() {
  const lat = state.coastLat, lon = state.coastLon;
  await loadStations();
  const st = nearestStation(lat, lon);
  const key = st ? 'tide.noaa:' + st.id : 'tide.om:' + lat.toFixed(2) + ',' + lon.toFixed(2);
  const cached = cacheGet(key, st ? 24 * 3600e3 : 6 * 3600e3);
  if (cached && !cached.stale) { state.series = cached; updateReadout(true); return; }
  try {
    let series;
    if (st) {
      const url = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&station=' + st.id
        + '&begin_date=' + ymd(Date.now() - 4 * DAY) + '&end_date=' + ymd(Date.now() + 16 * DAY)
        + '&datum=MLLW&units=metric&time_zone=gmt&interval=hilo&format=json';
      const j = await (await fetch(url)).json();
      if (!j.predictions || !j.predictions.length) throw new Error('noaa');
      // MLLW → about mean tide level: subtract the mean of the highs and lows
      // (subordinate stations have no MSL datum; MTL ≈ MSL to a few cm)
      const raw = j.predictions.map(p => ({ t: Date.parse(p.t.replace(' ', 'T') + 'Z'), v: Number(p.v), type: p.type }));
      const mean = raw.reduce((a, x) => a + x.v, 0) / raw.length;
      const turns = raw.map(x => ({ t: x.t, v: x.v - mean, type: x.type }));
      series = { src: 'noaa', name: titleCase(st.name), turns, pts: null };
    } else {
      const url = 'https://marine-api.open-meteo.com/v1/marine?latitude=' + lat.toFixed(3) + '&longitude=' + lon.toFixed(3)
        + '&minutely_15=sea_level_height_msl&past_days=3&forecast_days=15&timeformat=unixtime&timezone=UTC';
      const j = await (await fetch(url)).json();
      const T = j.minutely_15.time, V = j.minutely_15.sea_level_height_msl;
      const vals = new Float64Array(V.length);
      for (let i = 0; i < V.length; i++) vals[i] = V[i] == null ? (i ? vals[i - 1] : 0) : V[i];
      const t0 = T[0] * 1000, step = (T[1] - T[0]) * 1000;
      const turns = H.extrema(vals, t0, step).map(x => ({ t: x.t, v: x.v, type: x.type }));
      series = { src: 'model', name: '', turns, pts: { t0, step, v: Array.from(vals) } };
    }
    state.series = series; cacheSet(key, series);
    track('series', { src: series.src, ok: 1 });
  } catch (_) {
    state.series = cached ? cached.stale : null;
    track('series', { ok: 0 });
  }
  updateReadout(true);
}
function heightAt(t) {
  const s = state.series; if (!s) return null;
  if (s.pts) {
    const i = (t - s.pts.t0) / s.pts.step;
    if (i < 0 || i >= s.pts.v.length - 1) return null;
    const i0 = Math.floor(i), u = i - i0; return s.pts.v[i0] * (1 - u) + s.pts.v[i0 + 1] * u;
  }
  const T = s.turns; let k = -1;
  for (let i = 0; i < T.length - 1; i++) if (T[i].t <= t && t < T[i + 1].t) { k = i; break; }
  if (k < 0) return null;
  const a = T[k], b = T[k + 1], u = (t - a.t) / (b.t - a.t);
  return a.v + (b.v - a.v) * (1 - Math.cos(u * Math.PI)) / 2;
}
function heightNum(m) {
  const v = state.units === 'ft' ? m * 3.28084 : m;
  return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1);
}
function fmtHeight(m) {
  return `<span class="n">${heightNum(m)}</span><span class="u">${state.units}</span>`;
}
function fmtHeightPlain(m) { return heightNum(m) + state.units; }   // for canvas text
function fmtDur(ms) {
  const m = Math.round(ms / 60e3);
  if (m < 60) return `<span class="n">${m}</span> min`;
  const h = Math.floor(m / 60), mm = m % 60;
  return `<span class="n">${h}</span> h${mm ? ` <span class="n">${String(mm).padStart(2, '0')}</span>` : ''}`;
}
function springNeap(phase) {
  const p = phase % 180, d = Math.min(p, 180 - p);
  if (d < 22) return 'springs';
  if (Math.abs(p - 90) < 22) return 'neaps';
  return p < 90 ? 'easing toward neaps' : 'building toward springs';
}

/* --- CURVE --------------------------------------------------------------
   A 36 h hairline in the readout (−6 h … +30 h around the shown moment):
   no axes, no gridlines, no fill — a line, a night wash, the turning
   points labelled, and an accent mark at "now". Draggable as a shortcut
   into the nearby hours; the <input type=range> scrub is the keyboard-
   accessible way to move in time, so this canvas stays aria-hidden. */
function sizeCurve() {
  const r = el.curve.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (w < 4 || h < 4) return false;
  if (w !== curveW || h !== curveH) {
    curveW = w; curveH = h;
    el.curve.width = Math.round(w * dpr); el.curve.height = Math.round(h * dpr);
  }
  return true;
}
// Night intervals (sun below the horizon) across [lo, hi], from the sunrise/
// sunset pairs of every local day the window touches.
function nightBands(lo, hi) {
  const events = [];
  for (let dayStart = lo - DAY, i = 0; i < 4 && dayStart < hi; i++, dayStart += DAY) {
    const r = riseSet(A.Body.Sun, state.lat, state.lon, dayStart);
    if (r.rise != null) events.push({ t: r.rise, on: true });
    if (r.set != null) events.push({ t: r.set, on: false });
  }
  events.sort((a, b) => a.t - b.t);
  const bands = [];
  let start = events.length && events[0].on ? lo : null;
  for (const e of events) {
    if (e.on) { if (start != null) bands.push([Math.max(start, lo), Math.min(e.t, hi)]); start = null; }
    else if (start == null) start = e.t;
  }
  if (start != null) bands.push([Math.max(start, lo), hi]);
  return bands.filter(b => b[1] > b[0]);
}
// win: optional { lo, hi } to freeze the window during a drag; otherwise
// it recentres on state.t every call.
function paintCurve(win) {
  if (el.curve.hidden || !sizeCurve()) return;
  curveCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  curveCtx.clearRect(0, 0, curveW, curveH);
  const s = state.series;
  if (!s) return;
  const t = state.t, lo = win ? win.lo : t - CURVE_BEFORE, hi = win ? win.hi : t + CURVE_AFTER;
  const N = 144, pts = [];
  for (let i = 0; i <= N; i++) {
    const tt = lo + (hi - lo) * i / N, v = heightAt(tt);
    if (v != null) pts.push([tt, v]);
  }
  if (pts.length < 2) return;
  let vmin = Infinity, vmax = -Infinity;
  for (const [, v] of pts) { if (v < vmin) vmin = v; if (v > vmax) vmax = v; }
  if (vmax - vmin < 0.2) { const mid = (vmax + vmin) / 2; vmin = mid - 0.1; vmax = mid + 0.1; }
  const topPad = 15, botPad = 17;
  const xOf = tt => (tt - lo) / (hi - lo) * curveW;
  const yOf = v => topPad + (vmax - v) / (vmax - vmin) * (curveH - topPad - botPad);

  curveCtx.fillStyle = 'rgba(4,8,16,0.30)';
  let bands = [];
  try { bands = nightBands(lo, hi); } catch (_) {}
  for (const [a, b] of bands) curveCtx.fillRect(xOf(a), 0, Math.max(0.5, xOf(b) - xOf(a)), curveH);

  curveCtx.strokeStyle = 'rgba(243,238,228,0.82)';
  curveCtx.lineWidth = 1;
  curveCtx.beginPath();
  pts.forEach(([tt, v], i) => { const X = xOf(tt), Y = yOf(v); i ? curveCtx.lineTo(X, Y) : curveCtx.moveTo(X, Y); });
  curveCtx.stroke();

  curveCtx.font = "10.5px 'Space Grotesk', ui-serif, Georgia, serif";
  curveCtx.textBaseline = 'alphabetic';
  const tf = fmt('time', state.tz);
  // labels sit on two independent rows (above highs, below lows); a label
  // that would overlap the previous one on its own row is dropped — its
  // dot still marks the turn on the line — rather than let text collide.
  let lastRightHigh = -Infinity, lastRightLow = -Infinity;
  for (const x of (s.turns || [])) {
    if (x.t < lo || x.t > hi) continue;
    const X = xOf(x.t), Y = yOf(x.v), high = x.type === 'H';
    curveCtx.fillStyle = 'rgba(243,238,228,0.92)';
    curveCtx.beginPath(); curveCtx.arc(X, Y, 1.6, 0, Math.PI * 2); curveCtx.fill();
    const label = tf.format(new Date(x.t)) + '  ' + fmtHeightPlain(x.v);
    const align = X < 32 ? 'left' : X > curveW - 32 ? 'right' : 'center';
    const w = curveCtx.measureText(label).width;
    const left = align === 'left' ? X : align === 'right' ? X - w : X - w / 2;
    if (left < (high ? lastRightHigh : lastRightLow) + 6) continue;   // would collide — dot only
    if (high) lastRightHigh = left + w; else lastRightLow = left + w;
    curveCtx.textAlign = align;
    curveCtx.fillStyle = 'rgba(243,238,228,0.78)';
    curveCtx.fillText(label, X, high ? Y - 6 : Y + 15);
  }

  const X0 = xOf(t);
  if (X0 >= -1 && X0 <= curveW + 1) {
    curveCtx.strokeStyle = 'rgb(214,190,150)';
    curveCtx.globalAlpha = 0.85;
    curveCtx.beginPath(); curveCtx.moveTo(X0, 0); curveCtx.lineTo(X0, curveH); curveCtx.stroke();
    curveCtx.globalAlpha = 1;
    const nowV = heightAt(t);
    if (nowV != null) {
      curveCtx.fillStyle = 'rgb(214,190,150)';
      curveCtx.beginPath(); curveCtx.arc(X0, yOf(nowV), 2.2, 0, Math.PI * 2); curveCtx.fill();
    }
  }
}
// A light-weight refresh used while dragging the curve: reposition the
// state line and the curve itself without touching the turns list, the
// moon/sun rise-set calls, or the source line (those catch up on release).
function updateReadoutLite(win) {
  const t = state.t, s = state.series, h = heightAt(t);
  if (s && s.turns.length) {
    const k = s.turns.findIndex(x => x.t > t);
    if (k > 0) {
      const next = s.turns[k], rising = next.type === 'H';
      el.roState.innerHTML = `${rising ? 'Rising' : 'Falling'} · ${rising ? 'high' : 'low'} in ${fmtDur(next.t - t)}` + (h == null ? '' : ` · ${fmtHeight(h)}`);
      el.rule.className = 'ro-rule ' + (rising ? 'rising' : 'falling');
    }
  }
  updateClock();
  paintCurve(win);
}
let curveDrag = null;
function curveTimeFromX(clientX, win) {
  const r = el.curve.getBoundingClientRect();
  const u = clamp((clientX - r.left) / Math.max(1, r.width), 0, 1);
  return win.lo + u * (win.hi - win.lo);
}
el.curve.addEventListener('pointerdown', e => {
  if (!state.series || el.curve.hidden) return;
  el.curve.setPointerCapture(e.pointerId);
  curveDrag = { lo: state.t - CURVE_BEFORE, hi: state.t + CURVE_AFTER };
  setMode('hold');
  state.t = curveTimeFromX(e.clientX, curveDrag);
  updateReadoutLite(curveDrag);
});
el.curve.addEventListener('pointermove', e => {
  if (!curveDrag) return;
  state.t = curveTimeFromX(e.clientX, curveDrag);
  updateReadoutLite(curveDrag);
});
function endCurveDrag() {
  if (!curveDrag) return;
  curveDrag = null;
  updateReadout(true);
  track('curve-scrub');
}
el.curve.addEventListener('pointerup', endCurveDrag);
el.curve.addEventListener('pointercancel', endCurveDrag);

/* --- READOUT ----------------------------------------------------------- */
let readoutAt = 0;
function updateReadout(force) {
  if (!state.located) return;
  if (!force && Math.abs(state.t - readoutAt) < 60e3) return;
  readoutAt = state.t;
  const t = state.t, s = state.series, tz = state.tz;
  const tf = fmt('time', tz), df = fmt('day', tz);
  const mi = moonInfo(t);                       // at t, not at the last painted frame
  el.roPlace.textContent = state.place;
  const inland = state.inlandKm > INLAND_KM
    ? `You are about <span class="n">${Math.round(state.inlandKm)}</span> km from the sea. The nearest coast: ` : '';
  el.curve.hidden = !s || !s.turns.length;
  if (!s || !s.turns.length) {
    el.roState.innerHTML = inland + (navigator.onLine === false ? 'Offline, and nothing cached yet for this coast.' : 'Reading the sea…');
    el.roTurns.innerHTML = ''; el.roRange.textContent = ''; el.rule.className = 'ro-rule';
  } else {
    const T = s.turns; let k = T.findIndex(x => x.t > t);
    const h = heightAt(t);
    if (k <= 0) {
      el.roState.innerHTML = inland + (k === 0 ? 'Before the first prediction here.' : 'Past the last prediction here — press Now.');
      el.rule.className = 'ro-rule';
    } else {
      const prev = T[k - 1], next = T[k];
      const rising = next.type === 'H';
      const near = Math.min(t - prev.t, next.t - t) < 20 * 60e3;
      const word = near ? ((next.t - t < 20 * 60e3 ? next : prev).type === 'H' ? 'High water' : 'Low water') : (rising ? 'Rising' : 'Falling');
      el.roState.innerHTML = inland + `${word} · ${rising ? 'high' : 'low'} in ${fmtDur(next.t - t)}` + (h == null ? '' : ` · ${fmtHeight(h)}`);
      el.rule.className = 'ro-rule ' + (rising ? 'rising' : 'falling');
    }
    const today = localDayKey(t);
    el.roTurns.innerHTML = T.slice(Math.max(k, 0), Math.max(k, 0) + 4).map((x, i) =>
      `<li class="${i === 0 ? 'next' : ''}"><span>${tf.format(new Date(x.t))}</span><span class="k">${x.type === 'H' ? 'high' : 'low'}</span><span>${fmtHeight(x.v)}${localDayKey(x.t) !== today ? `<span class="d">${df.format(new Date(x.t))}</span>` : ''}</span></li>`).join('');
    const dayT = T.filter(x => localDayKey(x.t) === today);
    const rng = dayT.length >= 2 ? Math.max(...dayT.map(x => x.v)) - Math.min(...dayT.map(x => x.v)) : null;
    el.roRange.innerHTML = (rng != null ? `Range today <span class="n">${(state.units === 'ft' ? rng * 3.28084 : rng).toFixed(1)}</span> ${state.units} · ` : '') + springNeap(mi.phase);
    paintCurve();
  }
  // moon + sun for the local day of t
  const dayStart = t - 12 * 3600e3;
  try {
    const mr = riseSet(A.Body.Moon, state.lat, state.lon, dayStart), sr = riseSet(A.Body.Sun, state.lat, state.lon, dayStart);
    const tt = ms => ms == null ? '—' : `<span class="n">${tf.format(new Date(ms))}</span>`;
    el.roMoon.innerHTML = `Moon <span class="n">${Math.round(mi.frac * 100)}</span>% · rises ${tt(mr.rise)} · sets ${tt(mr.set)}`;
    el.roSun.innerHTML = `Sun rises ${tt(sr.rise)} · sets ${tt(sr.set)}`;
  } catch (_) { el.roMoon.textContent = ''; el.roSun.textContent = ''; }
  if (s) el.roSrc.textContent = s.src === 'noaa' ? `Official NOAA prediction · ${s.name}` : 'Model estimate · Open-Meteo · heights about mean sea level';
  else el.roSrc.textContent = '';
  const cc = (state.country || '').toUpperCase();
  const off = cc === 'US' ? '<a href="https://tidesandcurrents.noaa.gov/" rel="noopener">NOAA Tides &amp; Currents</a>'
    : cc === 'GB' ? '<a href="https://easytide.admiralty.co.uk/" rel="noopener">UKHO EasyTide</a>'
    : 'your national tide tables';
  el.roHand.innerHTML = `Not for navigation or safety. Official: ${off}.`;
  renderWeek();
  dirty = true;
}

/* --- WEEK -----------------------------------------------------------------
   Phase 7 (docs/tide-v2-plan.md): the curve and the next-4-turns list only
   reach a day or so out — not far enough to plan a weekend low-tide walk.
   This groups the same turns already in state.series by calendar day, up
   to 7 days out, using the exact row grammar .ro-turns already renders
   (time / high-or-low / height) rather than inventing a second style. */
let weekOpen = false;
// state.series.turns grouped into calendar days, starting at the day
// containing t, up to 7 days — turns are already time-sorted, so this is
// one linear pass, no date-boundary arithmetic needed.
function weekRows(t) {
  const s = state.series;
  if (!s || !s.turns || !s.turns.length) return [];
  const today = localDayKey(t), df = fmt('day', state.tz);
  const days = []; let seenToday = false;
  for (const x of s.turns) {
    const key = localDayKey(x.t);
    if (!seenToday) { if (key !== today) continue; seenToday = true; }
    let day = days.length && days[days.length - 1].key === key ? days[days.length - 1] : null;
    if (!day) {
      if (days.length >= 7) break;
      day = { key, label: df.format(new Date(x.t)), turns: [] };
      days.push(day);
    }
    day.turns.push(x);
  }
  return days;
}
// the lowest low and highest high in [t, t+14d] — turning points are the
// extrema by construction, so no need to scan the interpolated curve.
function extremes14(t) {
  const s = state.series; if (!s || !s.turns) return null;
  let lo = null, hi = null;
  for (const x of s.turns) {
    if (x.t < t || x.t > t + 14 * DAY) continue;
    if (x.type === 'L' && (!lo || x.v < lo.v)) lo = x;
    if (x.type === 'H' && (!hi || x.v > hi.v)) hi = x;
  }
  return (lo || hi) ? { lo, hi } : null;
}
function fmtWhen(ms) { return fmt('wday', state.tz).format(new Date(ms)) + ', ' + fmt('time', state.tz).format(new Date(ms)); }
function renderWeek() {
  if (!state.located) return;
  const days = weekRows(state.t), tf = fmt('time', state.tz);
  if (!days.length) { el.roWeek.innerHTML = ''; el.btnWeek.hidden = true; el.roExtreme.textContent = ''; return; }
  el.roWeek.innerHTML = days.map((d, i) => `<div class="ro-week-day"${i >= 2 && !weekOpen ? ' hidden' : ''}>
      <p class="ro-week-label">${d.label}</p>
      <ol class="ro-turns">${d.turns.map(x =>
        `<li><span>${tf.format(new Date(x.t))}</span><span class="k">${x.type === 'H' ? 'high' : 'low'}</span><span>${fmtHeight(x.v)}</span></li>`).join('')}</ol>
    </div>`).join('');
  el.btnWeek.hidden = days.length <= 2;
  el.btnWeek.setAttribute('aria-expanded', weekOpen ? 'true' : 'false');
  el.btnWeek.textContent = weekOpen ? 'Less' : 'This week';
  const ex = extremes14(state.t), parts = [];
  if (ex) {
    if (ex.lo) parts.push(`Lowest ${fmtHeight(ex.lo.v)} ${fmtWhen(ex.lo.t)}`);
    if (ex.hi) parts.push(`Highest ${fmtHeight(ex.hi.v)} ${fmtWhen(ex.hi.t)}`);
  }
  el.roExtreme.innerHTML = parts.join(' · ');
}
el.btnWeek.addEventListener('click', () => {
  weekOpen = !weekOpen;
  renderWeek();
  sizeDetail();
  track('week', { open: weekOpen ? 1 : 0 });
});

/* --- DETAIL -------------------------------------------------------------
   The rest of the turns, range/springs, moon, sun — collapsed by default
   (docs/tide-panel-research.md, Option C, decided 2026-09-16). The
   glance (place + state + curve) already carries the one fact that
   matters; this is opt-in, so a short phone never has it forced open.
   Content is populated continuously by updateReadout() regardless of
   whether the panel is open — only its visibility and height live here. */
function sizeDetail() {
  if (el.roDetail.hidden) return;
  const top = el.roDetail.getBoundingClientRect().top;
  const controlsTop = el.controls.hidden ? Hh : el.controls.getBoundingClientRect().top;
  const avail = Math.max(120, controlsTop - top - 16);
  el.roDetail.style.maxHeight = Math.min(avail, Hh * 0.7) + 'px';
}
function setDetail(open) {
  el.roDetail.hidden = !open;
  el.btnDetail.setAttribute('aria-expanded', open ? 'true' : 'false');
  el.btnDetail.textContent = open ? 'Less' : 'Detail';
  if (open) sizeDetail(); else el.btnDetail.focus();   // never strand focus on close
  dirty = true;
}
el.btnDetail.addEventListener('click', () => {
  const open = el.roDetail.hidden;
  setDetail(open);
  track('detail', { open: open ? 1 : 0 });
});

/* --- LOCATION UI ------------------------------------------------------- */
function savePlace() {
  try { localStorage.setItem(LS_PLACE, JSON.stringify({ lat: state.lat, lon: state.lon, place: state.place, tz: state.tz, country: state.country || '' })); } catch (_) {}
}
function loadPlace() {
  try {
    const p = JSON.parse(localStorage.getItem(LS_PLACE) || 'null');
    if (p && Number.isFinite(p.lat) && Number.isFinite(p.lon)) return p;
  } catch (_) {}
  return null;
}
function showLocate(show) {
  el.locate.hidden = !show;
  el.controls.hidden = show;                      // one thing at the bottom edge at a time
  el.justLook.hidden = !(show && !state.located);
  if (show) { el.input.value = ''; el.results.hidden = true; el.msg.hidden = true; el.input.focus(); }
}
function say(text) { el.msg.textContent = text; el.msg.hidden = !text; }
async function geocode(name) {
  const url = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(name) + '&count=6&language=en&format=json';
  const r = await fetch(url); if (!r.ok) throw new Error('geocode ' + r.status);
  const j = await r.json();
  return (j.results || []).map(x => ({ lat: x.latitude, lon: x.longitude, tz: x.timezone, name: x.name, country: x.country_code,
                                       sub: [x.admin1, x.country].filter(Boolean).join(', ') }));
}
function renderResults(list) {
  el.results.innerHTML = '';
  if (!list.length) { el.results.hidden = true; return; }
  for (const item of list) {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.className = 'place-pick';
    b.innerHTML = '<span class="p-name"></span> <span class="p-sub"></span>';
    b.querySelector('.p-name').textContent = item.name; b.querySelector('.p-sub').textContent = item.sub;
    b.addEventListener('click', () => enter(item, 'search'));
    li.appendChild(b); el.results.appendChild(li);
  }
  el.results.hidden = false;
}
let searchSeq = 0;
el.input.addEventListener('input', () => {
  const q = el.input.value.trim(), mine = ++searchSeq;
  if (q.length < 2) { el.results.hidden = true; return; }
  clearTimeout(el.input._t);
  el.input._t = setTimeout(async () => {
    try { const list = await geocode(q); if (mine === searchSeq) renderResults(list); }
    catch (_) { if (mine === searchSeq) say('Search is offline — try "Use my location".'); }
  }, 250);
});
el.locate.addEventListener('submit', async e => {
  e.preventDefault();
  const q = el.input.value.trim(); if (!q) return;
  try { const list = await geocode(q); if (list.length) enter(list[0], 'search'); else say('Nothing found by that name.'); }
  catch (_) { say('Search is offline — try "Use my location".'); }
});
el.useDevice.addEventListener('click', () => {
  if (!navigator.geolocation) { say('This browser has no location.'); return; }
  say('Finding you…');
  navigator.geolocation.getCurrentPosition(
    p => enter({ lat: p.coords.latitude, lon: p.coords.longitude, name: 'Where you are', tz: Intl.DateTimeFormat().resolvedOptions().timeZone, country: '' }, 'device'),
    () => say('Location was refused — search by name instead.'),
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 600e3 });
});
el.justLook.addEventListener('click', () => { showLocate(false); track('justlook'); });
el.btnWhere.addEventListener('click', () => showLocate(el.locate.hidden));

async function enter(item, how) {
  state.lat = item.lat; state.lon = item.lon; state.place = item.name; state.tz = item.tz || state.tz; state.country = item.country || '';
  state.located = true; state.series = null; weekOpen = false;
  await loadCoast();
  const nc = nearestCoast(state.lat, state.lon);
  state.inlandKm = nc.km;
  if (nc.km > INLAND_KM) { state.coastLat = nc.lat; state.coastLon = nc.lon; } else { state.coastLat = state.lat; state.coastLon = state.lon; }
  savePlace();
  showLocate(false);
  el.readout.hidden = false; el.controls.hidden = false;
  updateReadout(true);
  flyToPlace();
  loadSeries();
  track('enter', { how, inland: nc.km > INLAND_KM ? 1 : 0 });
}

/* --- PICK -----------------------------------------------------------------
   Long-press the globe to set your place, instead of typing every time
   (docs/tide-tap-select-research.md). Deliberately not a toggle/mode: the
   gesture itself (a hold, not a tap or a drag) carries the intent every
   time, so there's no invisible state to forget. A preview only — nothing
   is saved until "Use this place". */
function cancelPick() {
  if (!pendingPick) return;
  pendingPick = null;
  el.pick.hidden = true;
  dirty = true;
}
// BigDataCloud's reverse-geocode-client (keyless, CORS-open — confirmed
// live in tide-tap-select-research.md). Open ocean and remote coasts often
// have no locality, just a description like "exclusive economic zone of
// the United States" — not a place name, so it's excluded in favour of
// falling back to the subdivision/country, and finally a plain label.
function pickName(j) {
  const loc = j.locality && !/^exclusive economic zone/i.test(j.locality) ? j.locality : (j.city || '');
  if (loc) return loc;
  if (j.principalSubdivision && j.countryName) return j.principalSubdivision + ', ' + j.countryName;
  return j.countryName || 'This coast';
}
async function startPick(px, py) {
  const u = unproject(px, py);
  if (!u) return;                                      // missed the globe
  const nc = nearestCoast(u.lat, u.lon);
  const lat = nc.km > INLAND_KM ? nc.lat : u.lat, lon = nc.km > INLAND_KM ? nc.lon : u.lon;
  pendingPick = { lat, lon, name: '', country: '' };
  el.pickName.textContent = 'Finding this place…';
  el.pick.hidden = false;
  dirty = true;
  if (navigator.vibrate) navigator.vibrate(12);
  track('longpress');
  try {
    const url = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat.toFixed(4) + '&longitude=' + lon.toFixed(4) + '&localityLanguage=en';
    const j = await (await fetch(url)).json();
    if (!pendingPick || pendingPick.lat !== lat || pendingPick.lon !== lon) return;   // superseded by a newer pick
    pendingPick.name = pickName(j); pendingPick.country = j.countryCode || '';
    el.pickName.textContent = pendingPick.name;
  } catch (_) {
    if (pendingPick && pendingPick.lat === lat && pendingPick.lon === lon) el.pickName.textContent = 'This coast';
  }
}
el.pickUse.addEventListener('click', () => {
  if (!pendingPick) return;
  const item = { lat: pendingPick.lat, lon: pendingPick.lon, name: pendingPick.name || 'This coast', tz: state.tz, country: pendingPick.country };
  cancelPick();
  enter(item, 'pick');
});

/* --- INPUT ------------------------------------------------------------- */
let drag = null;
el.canvas.addEventListener('pointerdown', e => {
  if (e.button !== undefined && e.button !== 0) return;
  if (pendingPick) cancelPick();                          // a fresh touch elsewhere dismisses the preview
  el.canvas.setPointerCapture(e.pointerId);
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, downX: e.clientX, downY: e.clientY, moved: false, vx: 0, vy: 0, at: performance.now() };
  el.canvas.classList.add('dragging');
  view.ease = null;
  const pid = e.pointerId;
  drag.pressTimer = setTimeout(() => {
    if (!drag || drag.id !== pid) return;                 // released, or superseded, before the hold completed
    const d = drag; drag = null;
    el.canvas.classList.remove('dragging');
    startPick(d.downX, d.downY);
  }, LONGPRESS_MS);
});
el.canvas.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX; drag.y = e.clientY;
  if (Math.abs(dx) + Math.abs(dy) > 0) drag.moved = true;
  if (drag.pressTimer && Math.hypot(e.clientX - drag.downX, e.clientY - drag.downY) > LONGPRESS_SLOP) {
    clearTimeout(drag.pressTimer); drag.pressTimer = null;   // drifted too far to be a hold — it's a drag now
  }
  const degPerPx = R2D / R;                              // radians per px at the centre
  const dLon = -dx * degPerPx / Math.max(0.2, Math.cos(cam.lat * D2R)), dLat = dy * degPerPx;
  if (view.mode === 'place') { view.pan.lat = clamp(view.pan.lat + dLat, -89, 89); view.pan.lon = wrapLon(view.pan.lon + dLon); }
  else { view.off.lat += dLat; view.off.lon += dLon; }
  const now = performance.now(), dt = Math.max(1, now - drag.at); drag.at = now;
  drag.vx = dLon / dt; drag.vy = dLat / dt;
  dirty = true;
});
function endDrag(e) {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  if (drag.pressTimer) clearTimeout(drag.pressTimer);
  el.canvas.classList.remove('dragging');
  const d = drag; drag = null;
  if (view.mode === 'moon') {
    if (!REDUCED) { view.off.lon += d.vx * 260; view.off.lat += d.vy * 260; }   // a short glide
    view.ease = { t0: performance.now(), lat: view.off.lat, lon: view.off.lon };
  }
  if (!d.moved && view.mode === 'moon') track('tap');
  dirty = true;
}
el.canvas.addEventListener('pointerup', endDrag);
el.canvas.addEventListener('pointercancel', endDrag);
el.canvas.addEventListener('wheel', e => {
  e.preventDefault();
  zoomBy(Math.exp(-e.deltaY * 0.0012), e.clientX, e.clientY);
}, { passive: false });
function zoomBy(f, px, py) {
  const z = clamp((view.mode === 'place' ? view.zoom : 1) * f, 1, ZOOM_MAX);
  if (view.mode !== 'place') {
    if (z <= 1.02) return;
    // zoom toward the point under the pointer
    const u = unproject(px, py);
    view.mode = 'place'; view.pan = u || { lat: cam.lat, lon: cam.lon }; view.ease = null; loadCoast();
  }
  view.zoom = z;
  if (z <= 1.02) backToMoon();
  dirty = true;
}
// pinch
const touches = new Map();
el.canvas.addEventListener('touchstart', e => { for (const t of e.changedTouches) touches.set(t.identifier, { x: t.clientX, y: t.clientY }); }, { passive: true });
el.canvas.addEventListener('touchmove', e => {
  if (e.touches.length !== 2) return;
  e.preventDefault();
  const a = e.touches[0], b = e.touches[1], pa = touches.get(a.identifier), pb = touches.get(b.identifier);
  if (!pa || !pb) return;
  const d0 = Math.hypot(pa.x - pb.x, pa.y - pb.y), d1 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  if (d0 > 0) zoomBy(d1 / d0, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
  touches.set(a.identifier, { x: a.clientX, y: a.clientY }); touches.set(b.identifier, { x: b.clientX, y: b.clientY });
  if (drag) { if (drag.pressTimer) clearTimeout(drag.pressTimer); drag = null; el.canvas.classList.remove('dragging'); }
}, { passive: false });
el.canvas.addEventListener('touchend', e => { for (const t of e.changedTouches) touches.delete(t.identifier); }, { passive: true });
el.canvas.addEventListener('dblclick', e => { zoomBy(view.mode === 'place' ? 1.8 : ZOOM_PLACE, e.clientX, e.clientY); });

el.moon.addEventListener('click', backToMoon);
el.btnNow.addEventListener('click', () => { setMode('live'); state.now0 = Date.now(); state.t = Date.now(); updateClock(); updateReadout(true); track('now'); });
el.btnPlay.addEventListener('click', () => { setMode(state.mode === 'play' ? 'hold' : 'play'); track('play', { on: state.mode === 'play' ? 1 : 0 }); });
el.scrub.addEventListener('input', () => {
  setMode('hold');
  const { a, b } = scrubRange(); const u = Number(el.scrub.value) / 1000;
  state.t = a + u * (b - a); updateClock(); updateReadout(true);
});
el.scrub.addEventListener('change', () => track('scrub'));
function showAbout(show) {
  el.about.hidden = !show;
  el.btnAbout.setAttribute('aria-expanded', show ? 'true' : 'false');
  if (state.located) el.readout.hidden = show;          // one column of words at a time
  if (show) el.aboutClose.focus(); else el.btnAbout.focus();
  dirty = true;
}
el.btnAbout.addEventListener('click', () => showAbout(el.about.hidden));
el.aboutClose.addEventListener('click', () => showAbout(false));
window.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key === 'Escape') {
    if (pendingPick) cancelPick();
    else if (!el.about.hidden) showAbout(false);
    else if (!el.roDetail.hidden) setDetail(false);
    else if (!el.locate.hidden && state.located) showLocate(false);
    else backToMoon();
  }
  if (e.key === ' ' && e.target === document.body) { e.preventDefault(); el.btnPlay.click(); }
  if (e.key === 'm' || e.key === 'M') backToMoon();
  if (e.key === '+' || e.key === '=') zoomBy(1.4, cx, cy);
  if (e.key === '-' || e.key === '_') zoomBy(1 / 1.4, cx, cy);
});
window.addEventListener('resize', () => { resize(); if (state.located) updateReadout(true); sizeDetail(); });
window.addEventListener('online', () => { if (state.located && !state.series) loadSeries(); });

/* --- THE LOOP ---------------------------------------------------------- */
let prevT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(100, now - prevT);
  if (now - lastFrame < 1000 / FPS_CAP) return;
  prevT = now;
  stepTime(dt);
  const astroT = state.t;
  sub = subPoint(A.Body.Moon, astroT); sunPt = subPoint(A.Body.Sun, astroT); moonI = moonInfo(astroT);
  stepCamera(now - lastFrame);
  computeField(state.t);
  if (state.mode !== 'hold' || dirty || drag) {
    const fieldMoved = Math.abs(state.t - (frame.paintedT || -Infinity)) > 60e3;
    if (dirty || fieldMoved || drag || state.mode === 'play') { paint(); frame.paintedT = state.t; dirty = false; }
  }
  lastFrame = now;
  updateClock();
  updateReadout(false);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { dirty = true; prevT = performance.now(); } });

/* --- ENTRY ------------------------------------------------------------- */
async function init() {
  resize();
  const saved = loadPlace();
  loadLand().then(() => { if (saved) enter({ ...saved, name: saved.place }, 'saved'); });
  loadField();
  if (!saved) showLocate(true);
  el.moon.hidden = false;
  requestAnimationFrame(frame);
  track('load', { saved: saved ? 1 : 0, reduced: REDUCED ? 1 : 0 });
}
init();
