// Gate for every tide place page's own first answer (2026-11-16).
//
//     node scripts/tide-test-pages.js 2027 [-v]
//
// Each page in apps/tide/tide-times/ draws an answer at once from the
// station data written into it (#station: constants, datum offset, and for
// a subordinate station NOAA's corrections), before NOAA's official times
// arrive - and keeps it if NOAA does not answer. This predicts the whole
// year from that same data, the way tide-times/place.js does, and compares
// it with NOAA's official predictions for the year (scripts/.tide-places-cache,
// from tide-fetch-places.py) in both directions:
//   - every official turn against the page's nearest turn of the same kind;
//   - every turn the page would show must be one NOAA shows (within an hour).
//     Matching only one way missed Lahaina's near-flat extra low and high.
// A page fails at a median over 6 min or 0.25 ft, 95% of turns not within
// 20 min, any height off by over 1 ft, or any turn NOAA does not list.
// Not the single worst time: where two turns are nearly level the minute of
// a near-flat "high" is ill-defined. A failing page should make no answer of
// its own: list its station in "noaa-only" in tide-extra-stations.json.
// Pages already without constants are counted as noaa-only and not tested.
const fs = require('fs'), path = require('path');
const H = require('../apps/tide/lib/harmonics.js');
const YEAR = process.argv[2] || String(new Date().getFullYear() + 1);
const PAGES = path.join(__dirname, '..', 'apps', 'tide', 'tide-times');
const CACHE = path.join(__dirname, '.tide-places-cache');
const rd = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const q = (a, f) => a.slice().sort((x, y) => x - y)[Math.floor(f * (a.length - 1))];
let pass = 0, fail = 0, skipped = 0, failed = [];

for (const slug of fs.readdirSync(PAGES).sort()) {
  const f = path.join(PAGES, slug, 'index.html');
  if (!fs.existsSync(f)) continue;
  const m = fs.readFileSync(f, 'utf8').match(/<script type="application\/json" id="station">(.*?)<\/script>/);
  if (!m) continue;
  const S = JSON.parse(m[1]);
  if (!S.cons.length) { skipped++; continue; }
  let st, preds;
  try { st = rd(path.join(CACHE, S.id, 'station.json')); preds = rd(path.join(CACHE, S.id, `hilo-${YEAR}.json`)).predictions; }
  catch (e) { console.log('NO CACHE', slug); fail++; continue; }
  const cons = S.cons.map(c => ({ name: c[0], amp: c[1], phase: c[2] })), U = S.sub;
  const tzms = st.timezonecorr * 3600e3;
  const official = preds.map(p => ({ t: Date.parse(p.t.replace(' ', 'T') + 'Z') - tzms, v: +p.v, type: p.type }));
  // the page's turns, exactly as place.js makes them
  const t0 = Date.UTC(+YEAR, 0, 1) - 2 * 864e5, step = 6 * 60e3, n = Math.round(369 * 864e5 / step);
  const pad = U ? (Math.max(Math.abs(U.hiT), Math.abs(U.loT)) + 60) * 60e3 : 0;
  let ex = H.extrema(H.series(cons, t0 - pad, step, n), t0 - pad, step).map(e => ({ t: e.t, v: e.v + S.off, type: e.type }));
  if (U) ex = ex.map(e => {
    const hi = e.type === 'H', k = hi ? U.hiH : U.loH;
    return { t: e.t + 60e3 * (hi ? U.hiT : U.loT), v: U.adj === 'R' ? e.v * k : e.v + k, type: e.type };
  });
  // official times are local clock time (lst_ldt): compare as standard time, or an hour earlier in summer
  const near = (a, b) => Math.min(Math.abs(a - b), Math.abs(a - 3600e3 - b));
  const byType = { H: ex.filter(e => e.type === 'H'), L: ex.filter(e => e.type === 'L') };
  const dt = [], dv = [];
  for (const o of official) {
    let best = null, bd = Infinity;
    for (const e of byType[o.type]) { const d = near(o.t, e.t); if (d < bd) { bd = d; best = e; } }
    dt.push(bd / 60e3); dv.push(Math.abs(best.v - o.v));
  }
  const y0 = official[0].t + 864e5, y1 = official[official.length - 1].t - 864e5;
  let extra = 0, mine = 0;
  for (const e of ex) {
    if (e.t < y0 || e.t > y1) continue;
    mine++;
    if (!official.some(o => o.type === e.type && near(o.t, e.t) < 3600e3)) extra++;
  }
  const ok = extra === 0 && q(dt, .5) <= 6 && q(dv, .5) <= 0.25 && q(dt, .95) <= 20 && Math.max(...dv) <= 1;
  if (ok) pass++; else { fail++; failed.push(S.id); }
  if (!ok || process.argv.includes('-v'))
    console.log(ok ? 'ok  ' : 'FAIL', S.id, slug, U ? `(subordinate, ${U.adj})` : '(harmonic)',
      `time median ${q(dt, .5).toFixed(0)} / 95% ${q(dt, .95).toFixed(0)} / worst ${Math.max(...dt).toFixed(0)} min,`,
      `height median ${q(dv, .5).toFixed(2)} / worst ${Math.max(...dv).toFixed(2)} ft,`, `${extra} of ${mine} turns not NOAA's`);
}
console.log(`${pass} pass, ${fail} fail, ${skipped} noaa-only (not tested)`);
if (failed.length) console.log('failing station ids:', JSON.stringify(failed));
process.exitCode = fail ? 1 : 0;
