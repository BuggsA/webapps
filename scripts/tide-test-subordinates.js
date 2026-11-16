// Gate for the subordinate-station place pages (Batch B, 2026-11-16).
//
//     node scripts/tide-test-subordinates.js 2027
//
// For every subordinate station in scripts/.tide-places-cache, predicts the
// whole year the way tide-times/place.js does - the reference station's
// highs and lows from its constants, moved and scaled by NOAA's corrections -
// and compares every turn with NOAA's official predictions for that year.
// A station fails at a median over 6 min or 0.25 ft, 95% of turns not within
// 20 min, or any height off by over 1 ft. Not the single worst time: where
// two turns are nearly level (Hawaii's small mixed tide) the minute of a
// near-flat "high" is ill-defined, and was 34-40 min off while the heights
// agreed to 0.05 ft. Failures are printed, and should go in DROP in
// tide-build-places.py rather than ship a page whose first answer is wrong.
const fs = require('fs'), path = require('path');
const H = require('../apps/tide/lib/harmonics.js');
const YEAR = process.argv[2] || String(new Date().getFullYear() + 1);
const CACHE = path.join(__dirname, '.tide-places-cache'), M2FT = 3.28084;
const rd = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const q = (a, f) => a.slice().sort((x, y) => x - y)[Math.floor(f * (a.length - 1))];
let pass = 0, fail = 0;
for (const id of fs.readdirSync(CACHE).sort()) {
  const d = path.join(CACHE, id);
  let st; try { st = rd(path.join(d, 'station.json')); } catch (e) { continue; }
  if (!st.sub) continue;
  let o, hc, dm, hl;
  try { o = rd(path.join(d, 'offsets.json')); hc = rd(path.join(d, 'ref-harcon.json')); dm = rd(path.join(d, 'ref-datums.json')); hl = rd(path.join(d, `hilo-${YEAR}.json`)); }
  catch (e) { console.log('MISSING', id, st.name); fail++; continue; }
  const dat = Object.fromEntries((dm.datums || []).map(x => [x.name, x.value]));
  const cons = (hc.HarmonicConstituents || []).filter(c => c.amplitude > 0 && H.NAMES.includes(c.name))
    .map(c => ({ name: c.name, amp: c.amplitude * M2FT, phase: c.phase_GMT }));
  const preds = hl.predictions || [];
  if (!cons.length || dat.MSL == null || dat.MLLW == null || !preds.length) { console.log('NO DATA', id, st.name); fail++; continue; }
  const off = (dat.MSL - dat.MLLW) * M2FT, tzms = st.timezonecorr * 3600e3;
  // NOAA's lst_ldt times; compared as standard time +/- an hour of DST, so match within the nearest turn
  const t0 = Date.UTC(+YEAR, 0, 1) - 2 * 864e5, step = 6 * 60e3, n = Math.round(369 * 864e5 / step);
  const pad = (Math.max(Math.abs(o.timeOffsetHighTide), Math.abs(o.timeOffsetLowTide)) + 60) * 60e3;
  const ex = H.extrema(H.series(cons, t0 - pad, step, n), t0 - pad, step).map(e => {
    const v = e.v + off, hi = e.type === 'H', k = hi ? o.heightOffsetHighTide : o.heightOffsetLowTide;
    return { t: e.t + 60e3 * (hi ? o.timeOffsetHighTide : o.timeOffsetLowTide), v: o.heightAdjustedType === 'R' ? v * k : v + k, type: e.type };
  });
  const byType = { H: ex.filter(e => e.type === 'H'), L: ex.filter(e => e.type === 'L') };
  const dt = [], dv = [];
  for (const p of preds) {
    const loc = Date.parse(p.t.replace(' ', 'T') + 'Z') - tzms;      // as standard time
    const list = byType[p.type];
    let best = list[0], bd = Infinity;
    for (const e of list) { const dd = Math.min(Math.abs(e.t - loc), Math.abs(e.t - (loc - 3600e3))); if (dd < bd) { bd = dd; best = e; } }
    dt.push(bd / 60e3); dv.push(Math.abs(best.v - +p.v));
  }
  const ok = q(dt, .5) <= 6 && q(dv, .5) <= 0.25 && q(dt, .95) <= 20 && Math.max(...dv) <= 1;
  ok ? pass++ : fail++;
  if (!ok || process.argv.includes('-v'))
    console.log(ok ? 'ok  ' : 'FAIL', id, st.name, `(${o.heightAdjustedType}, ref ${o.refStationId})`,
      `time median ${q(dt, .5).toFixed(0)} / 95% ${q(dt, .95).toFixed(0)} / worst ${Math.max(...dt).toFixed(0)} min,`,
      `height median ${q(dv, .5).toFixed(2)} / worst ${Math.max(...dv).toFixed(2)} ft`);
}
console.log(`${pass} pass, ${fail} fail`);
process.exitCode = fail ? 1 : 0;
