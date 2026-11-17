// Gate for every tide place page's own first answer (2026-11-16).
//
//     node scripts/tide-test-pages.js 2027            the gate
//     node scripts/tide-test-pages.js 2027 --engine   also report the engine
//
// THE GATE. Every page carries NOAA's official turns (#station "turns",
// written by tide-build-places.py) and shows them first. Each page's saved
// turns must decode - in its own time zone, as tide-times/place.js decodes
// them - to exactly NOAA's official predictions in the cache (hilo-lead and
// hilo-YEAR: same minute, same height to 0.001 ft, same kind), from the day
// before the build to the end of YEAR.
//
// --engine: the harmonic engine's own answer, which a page uses only once it
// has outlived its saved turns. Predicts the year from the page's constants
// (and a subordinate's corrections) and compares it with NOAA's both ways.
// This found the engine wrong at 177 of 408 stations (2026-11-16), which is
// why the pages now carry NOAA's turns. Reported, not gated.
const fs = require('fs'), path = require('path');
const H = require('../apps/tide/lib/harmonics.js');
const YEAR = process.argv[2] || String(new Date().getFullYear() + 1);
const PAGES = process.env.TIDE_PAGES || path.join(__dirname, '..', 'apps', 'tide', 'tide-times');
const CACHE = path.join(__dirname, '.tide-places-cache');
const rd = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const q = (a, f) => a.slice().sort((x, y) => x - y)[Math.floor(f * (a.length - 1))];
const ENGINE = process.argv.includes('--engine');
let pass = 0, fail = 0, skipped = 0, failed = [], gate = 0, gateBad = [];
// NOAA's lst_ldt "YYYY-MM-DD HH:MM" in zone tz -> ms (the method of place.js)
const fmts = {};
function localToMs(s, tz) {
  const f = fmts[tz] || (fmts[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const off = ms => { const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value])); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000; };
  const m = s.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+)/), g = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return g - off(g - off(g));
}

for (const slug of fs.readdirSync(PAGES).sort()) {
  const f = path.join(PAGES, slug, 'index.html');
  if (!fs.existsSync(f)) continue;
  const m = fs.readFileSync(f, 'utf8').match(/<script type="application\/json" id="station">(.*?)<\/script>/);
  if (!m) continue;
  const S = JSON.parse(m[1]);
  let st, preds, lead = [];
  try { st = rd(path.join(CACHE, S.id, 'station.json')); preds = rd(path.join(CACHE, S.id, `hilo-${YEAR}.json`)).predictions; }
  catch (e) { console.log('NO CACHE', slug); gateBad.push(slug); continue; }
  try { lead = rd(path.join(CACHE, S.id, `hilo-lead-${YEAR}.json`)).predictions || []; } catch (e) { /* built in YEAR */ }

  // ---- the gate: saved turns == NOAA's official turns
  const want = new Map();
  for (const p of lead.concat(preds)) want.set(localToMs(p.t, S.tz), p);
  const got = [];
  if (S.turns) { let mm = S.turns[0]; for (let k = 0; k < S.turns[1].length; k++) { mm += S.turns[2][2 * k]; got.push({ t: mm * 60e3, v: S.turns[2][2 * k + 1] / 1000, type: S.turns[1][k] }); } }
  const bad = got.length !== want.size || got.some(g => { const p = want.get(g.t); return !p || p.type !== g.type || Math.abs(+p.v - g.v) > 0.00051; });
  if (bad) { gateBad.push(slug); console.log('GATE FAIL', S.id, slug, `saved ${got.length} turns, NOAA ${want.size}`); } else gate++;
  if (!ENGINE) continue;

  if (!S.cons.length) { skipped++; continue; }
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
  if (ok) pass++; else fail++;
  if (!ok || process.argv.includes('-v'))
    console.log(ok ? 'ok  ' : 'FAIL', S.id, slug, U ? `(subordinate, ${U.adj})` : '(harmonic)',
      `time median ${q(dt, .5).toFixed(0)} / 95% ${q(dt, .95).toFixed(0)} / worst ${Math.max(...dt).toFixed(0)} min,`,
      `height median ${q(dv, .5).toFixed(2)} / worst ${Math.max(...dv).toFixed(2)} ft,`, `${extra} of ${mine} turns not NOAA's`);
}
console.log(`gate: ${gate} pages carry exactly NOAA's official turns, ${gateBad.length} do not`);
if (ENGINE) console.log(`engine (report only): ${pass} pass, ${fail} fail, ${skipped} without constants`);
process.exitCode = gateBad.length ? 1 : 0;
