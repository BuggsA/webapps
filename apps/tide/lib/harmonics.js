/* ==========================================================================
   Tide — harmonic tide prediction core (no dependencies, browser + Node).

   Predicts sea level from harmonic constituents:
       η(t) = Σ_i  f_i(t) · A_i · cos( V_i(t) + u_i(t) − G_i )
   where A_i, G_i are a station's (or an ocean cell's) amplitude and
   Greenwich phase lag, V_i the astronomical argument from Doodson
   numbers, and f_i/u_i the 18.6-year nodal corrections (Schureman).

   Conventions (validated against NOAA CO-OPS predictions — see
   scripts/tide-test-harmonics.js):
     · time is a JS ms timestamp (UTC); arguments use UT
     · phases in DEGREES, Greenwich epoch (NOAA `phase_GMT`, EOT20 phases)
     · amplitudes in whatever unit you pass (m or cm) — output matches

   Exposed as window.Harmonics in the browser, module.exports in Node.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Harmonics = factory();
}(typeof self !== 'undefined' ? self : this, function () {
'use strict';

const D2R = Math.PI / 180;

/* Doodson numbers [τ, s, h, p, N', p1], phase correction (deg), nodal kind.
   τ = mean lunar time, s/h/p = mean longitudes of moon/sun/lunar perigee,
   N' = −(node longitude) as in Doodson (we apply sign in astro()), p1 =
   solar perigee. Names match NOAA CO-OPS harcon and EOT20 file names. */
const CONST = {
  // semidiurnal
  M2:   { d: [2, 0, 0, 0, 0, 0], ph: 0,   nod: 'M2' },
  S2:   { d: [2, 2,-2, 0, 0, 0], ph: 0,   nod: '1'  },
  N2:   { d: [2,-1, 0, 1, 0, 0], ph: 0,   nod: 'M2' },
  K2:   { d: [2, 2, 0, 0, 0, 0], ph: 0,   nod: 'K2' },
  NU2:  { d: [2,-1, 2,-1, 0, 0], ph: 0,   nod: 'M2' },
  MU2:  { d: [2,-2, 2, 0, 0, 0], ph: 0,   nod: 'M2' },
  '2N2':{ d: [2,-2, 0, 2, 0, 0], ph: 0,   nod: 'M2' },
  L2:   { d: [2, 1, 0,-1, 0, 0], ph: 180, nod: 'M2' },   // nodal approx.
  T2:   { d: [2, 2,-3, 0, 0, 1], ph: 0,   nod: '1'  },
  R2:   { d: [2, 2,-1, 0, 0,-1], ph: 180, nod: '1'  },
  LAM2: { d: [2, 1,-2, 1, 0, 0], ph: 180, nod: 'M2' },
  '2SM2':{d: [2, 4,-4, 0, 0, 0], ph: 0,   nod: '2SM2' },
  // diurnal
  K1:   { d: [1, 1, 0, 0, 0, 0], ph: 90,  nod: 'K1' },
  O1:   { d: [1,-1, 0, 0, 0, 0], ph: -90, nod: 'O1' },
  P1:   { d: [1, 1,-2, 0, 0, 0], ph: -90, nod: '1'  },
  Q1:   { d: [1,-2, 0, 1, 0, 0], ph: -90, nod: 'O1' },
  J1:   { d: [1, 2, 0,-1, 0, 0], ph: 90,  nod: 'J1' },
  OO1:  { d: [1, 3, 0, 0, 0, 0], ph: 90,  nod: 'OO1' },
  '2Q1':{ d: [1,-3, 0, 2, 0, 0], ph: -90, nod: 'O1' },
  RHO:  { d: [1,-3, 2, 0, 0, 0], ph: -90, nod: 'O1' },
  M1:   { d: [1, 0, 0, 1, 0, 0], ph: 90,  nod: '1'  },   // tiny; nodal ignored
  S1:   { d: [1, 1,-1, 0, 0, 0], ph: 0,   nod: '1'  },
  // long period
  SA:   { d: [0, 0, 1, 0, 0, 0], ph: 0,   nod: '1'  },
  SSA:  { d: [0, 0, 2, 0, 0, 0], ph: 0,   nod: '1'  },
  MM:   { d: [0, 1, 0,-1, 0, 0], ph: 0,   nod: 'MM' },
  MF:   { d: [0, 2, 0, 0, 0, 0], ph: 0,   nod: 'MF' },
  MSF:  { d: [0, 2,-2, 0, 0, 0], ph: 0,   nod: '1'  },
  // shallow water / overtides
  M3:   { d: [3, 0, 0, 0, 0, 0], ph: 180, nod: 'M3' },
  M4:   { d: [4, 0, 0, 0, 0, 0], ph: 0,   nod: 'M4' },
  M6:   { d: [6, 0, 0, 0, 0, 0], ph: 0,   nod: 'M6' },
  M8:   { d: [8, 0, 0, 0, 0, 0], ph: 0,   nod: 'M8' },
  MS4:  { d: [4, 2,-2, 0, 0, 0], ph: 0,   nod: 'M2' },
  MN4:  { d: [4,-1, 0, 1, 0, 0], ph: 0,   nod: 'M4' },
  MK3:  { d: [3, 1, 0, 0, 0, 0], ph: 90,  nod: 'MK3' },
  '2MK3':{d: [3,-1, 0, 0, 0, 0], ph: -90, nod: '2MK3' },
  S4:   { d: [4, 4,-4, 0, 0, 0], ph: 0,   nod: '1'  },
  S6:   { d: [6, 6,-6, 0, 0, 0], ph: 0,   nod: '1'  },
};

/* Mean astronomical longitudes (deg) at a UTC ms timestamp. Meeus / IERS
   polynomial forms in Julian centuries from J2000; UT≈TT is fine here. */
function astro(ms) {
  const jd = ms / 86400000 + 2440587.5;
  const T  = (jd - 2451545.0) / 36525;
  const s  = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  const h  = 280.46646   + 36000.76983     * T + 0.0003032 * T * T;
  const p  = 83.3532465  + 4069.0137287    * T - 0.0103200 * T * T;
  const N  = 125.04452   - 1934.136261     * T + 0.0020708 * T * T;
  const p1 = 282.93734   + 1.71946         * T;
  const hours = ((jd + 0.5) % 1) * 24;         // UT hours of day
  const tau = 15 * hours + h - s;               // mean lunar time (deg)
  return { tau, s, h, p, N, p1 };
}

/* Nodal factor f and angle u (deg) for the kinds above, from the node
   longitude N (deg). Schureman's standard approximations. */
function nodal(N) {
  const n = N * D2R, cN = Math.cos(n), sN = Math.sin(n), c2 = Math.cos(2 * n), s2 = Math.sin(2 * n);
  const M2 = { f: 1.0004 - 0.0373 * cN + 0.0002 * c2, u: -2.14 * sN };
  const K1 = { f: 1.0060 + 0.1150 * cN - 0.0088 * c2, u: -8.86 * sN + 0.68 * s2 };
  const O1 = { f: 1.0089 + 0.1871 * cN - 0.0147 * c2, u: 10.80 * sN - 1.34 * s2 };
  const K2 = { f: 1.0241 + 0.2863 * cN + 0.0083 * c2, u: -17.74 * sN + 0.68 * s2 };
  const J1 = { f: 1.0129 + 0.1676 * cN - 0.0170 * c2, u: -12.94 * sN + 1.34 * s2 };
  const OO1= { f: 1.1027 + 0.6504 * cN + 0.0317 * c2, u: -36.68 * sN + 4.02 * s2 };
  const MF = { f: 1.0429 + 0.4135 * cN - 0.0040 * c2, u: -23.74 * sN + 2.68 * s2 };
  const MM = { f: 1.0000 - 0.1300 * cN + 0.0013 * c2, u: 0 };
  return {
    '1': { f: 1, u: 0 }, M2, K1, O1, K2, J1, OO1, MF, MM,
    M3:  { f: Math.pow(M2.f, 1.5), u: 1.5 * M2.u },
    M4:  { f: M2.f * M2.f, u: 2 * M2.u },
    M6:  { f: Math.pow(M2.f, 3), u: 3 * M2.u },
    M8:  { f: Math.pow(M2.f, 4), u: 4 * M2.u },
    MK3: { f: M2.f * K1.f, u: M2.u + K1.u },
    '2MK3': { f: M2.f * M2.f * K1.f, u: 2 * M2.u - K1.u },
    '2SM2': { f: M2.f, u: -M2.u },
  };
}

/* Per-constituent argument at time t: returns { name: { f, arg } } where
   arg = V + u (deg). Compute once per time step, reuse for every station /
   cell — that is what the globe does per frame. */
function args(ms, names) {
  const a = astro(ms), nod = nodal(a.N);
  const base = [a.tau, a.s, a.h, a.p, -a.N, a.p1];
  const out = {};
  for (const name of names || Object.keys(CONST)) {
    const c = CONST[name];
    if (!c) continue;
    let V = c.ph;
    for (let k = 0; k < 6; k++) V += c.d[k] * base[k];
    const nd = nod[c.nod] || nod['1'];
    out[name] = { f: nd.f, arg: V + nd.u };
  }
  return out;
}

/* Height at time t for a list of { name, amp, phase } (phase deg, Greenwich).
   Unknown constituent names are skipped (and reported via .skipped). */
function predict(constituents, ms) {
  const names = constituents.map(c => c.name);
  const A = args(ms, names);
  let eta = 0;
  for (const c of constituents) {
    const a = A[c.name];
    if (!a) continue;
    eta += a.f * c.amp * Math.cos((a.arg - c.phase) * D2R);
  }
  return eta;
}

/* Series: [t0, t0+step, ...] over n samples. */
function series(constituents, t0, stepMs, n) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = predict(constituents, t0 + i * stepMs);
  return out;
}

/* Turning points (highs/lows) of a sampled series with parabolic refinement.
   values: array-like, t0/step in ms. Returns [{ t, v, type: 'H'|'L' }]. */
function extrema(values, t0, stepMs) {
  const out = [];
  for (let i = 1; i < values.length - 1; i++) {
    const a = values[i - 1], b = values[i], c = values[i + 1];
    const isMax = b > a && b >= c, isMin = b < a && b <= c;
    if (!isMax && !isMin) continue;
    const denom = a - 2 * b + c;
    const off = denom === 0 ? 0 : 0.5 * (a - c) / denom;   // vertex offset in samples
    const v = b - 0.25 * (a - c) * off;
    out.push({ t: t0 + (i + off) * stepMs, v, type: isMax ? 'H' : 'L' });
  }
  return out;
}

/* Names known to this engine (for filtering shipped/constituent lists). */
const NAMES = Object.keys(CONST);

return { CONST, NAMES, astro, nodal, args, predict, series, extrema };
}));
