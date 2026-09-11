#!/usr/bin/env node
/* Tide — phase-0 gate: the harmonic engine vs NOAA CO-OPS official predictions.

   For each station: fetch its harmonic constants (harcon), its MSL/MLLW
   datums and 3 days of official hi/lo predictions (GMT), predict with
   apps/tide/lib/harmonics.js using NOAA's own constants, and compare
   every turning point. Gate: |dt| ≤ 15 min and |dh| ≤ 0.15 m on every
   turning point, at a semidiurnal, a diurnal and a mixed station.

   Usage: node scripts/tide-test-harmonics.js [YYYYMMDD]
*/
const H = require('../apps/tide/lib/harmonics.js');

const STATIONS = [
  ['8443970', 'Boston MA (semidiurnal)'],
  ['8729840', 'Pensacola FL (diurnal)'],
  ['9414290', 'San Francisco CA (mixed)'],
  ['9455920', 'Anchorage AK (large range) — informational: NOAA uses 120 constituents here, 83 shallow-water ones no shipped engine has', false],
];
const day = process.argv[2] || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const base = 'https://api.tidesandcurrents.noaa.gov';

async function j(url) { const r = await fetch(url); if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); }

(async () => {
  let worst = { dt: 0, dh: 0 }, fail = false, unknown = new Set();
  for (const [id, label, gated = true] of STATIONS) {
    const hc = await j(`${base}/mdapi/prod/webapi/stations/${id}/harcon.json?units=metric`);
    const dt = await j(`${base}/mdapi/prod/webapi/stations/${id}/datums.json?units=metric`);
    const pr = await j(`${base}/api/prod/datagetter?product=predictions&station=${id}&begin_date=${day}&range=72&datum=MLLW&units=metric&time_zone=gmt&interval=hilo&format=json`);
    const get = n => (dt.datums.find(d => d.name === n) || {}).value;
    const off = get('MSL') - get('MLLW');           // MLLW height = η(about MSL) + off
    const cons = hc.HarmonicConstituents
      .filter(c => c.amplitude > 0)
      .map(c => ({ name: c.name, amp: c.amplitude, phase: c.phase_GMT }));
    cons.forEach(c => { if (!H.CONST[c.name]) unknown.add(c.name); });
    const used = cons.filter(c => H.CONST[c.name]);
    const t0 = Date.parse(day.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3T00:00:00Z')) - 3 * 3600e3;
    const step = 6 * 60e3, n = Math.round((78 * 3600e3) / step);
    const ser = H.series(used, t0, step, n);
    const mine = H.extrema(ser, t0, step);
    console.log(`\n${label} — ${id}: ${used.length}/${cons.length} constituents used, MSL−MLLW = ${off.toFixed(3)} m`);
    console.log('  NOAA (GMT)          type   NOAA m   mine m    dh m    dt min');
    for (const p of pr.predictions) {
      const t = Date.parse(p.t.replace(' ', 'T') + 'Z'), v = Number(p.v);
      let best = null;
      for (const m of mine) if (m.type === p.type) { const d = Math.abs(m.t - t); if (!best || d < best.d) best = { d, m }; }
      if (!best || best.d > 3 * 3600e3) { console.log(`  ${p.t}  ${p.type}   ${v.toFixed(3)}   (no match)`); if (gated) fail = true; continue; }
      const dh = best.m.v + off - v, dmin = (best.m.t - t) / 60e3;
      if (gated) { worst.dt = Math.max(worst.dt, Math.abs(dmin)); worst.dh = Math.max(worst.dh, Math.abs(dh)); }
      const over = Math.abs(dmin) > 15 || Math.abs(dh) > 0.15;
      const flag = over ? (gated ? '  <-- over gate' : '  (over, not gated)') : '';
      if (over && gated) fail = true;
      console.log(`  ${p.t}    ${p.type}    ${v.toFixed(3).padStart(6)}   ${(best.m.v + off).toFixed(3).padStart(6)}   ${dh.toFixed(3).padStart(6)}   ${dmin.toFixed(1).padStart(6)}${flag}`);
    }
  }
  console.log(`\nunknown constituent names (ignored): ${[...unknown].join(', ') || 'none'}`);
  console.log(`worst |dt| = ${worst.dt.toFixed(1)} min, worst |dh| = ${worst.dh.toFixed(3)} m — ${fail ? 'FAIL' : 'PASS'} (gate 15 min / 0.15 m)`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
