/* ==========================================================================
   Tide times - the live part of a place page.

   The page is built once a year from NOAA's data (scripts/tide-build-places.py)
   and everything on it that does not move is already written into the HTML.
   This file fills in what does: rising or falling, the next turn and the one
   after, today's curve, today's and the next seven days' highs and lows, and
   the water temperature.

   Owner, 2026-11-12: "Slow to receive the information you actually need if
   you are in a rush." So the answer is drawn AT ONCE from the page's own
   prediction - the station's NOAA harmonic constants (#station) through
   lib/harmonics.js, the engine gated against NOAA in
   scripts/tide-test-harmonics.js - and then replaced by NOAA's official
   times when they arrive (keyless, CORS-open; the globe does the same).
   The source line always says which one you are reading. If NOAA does not
   answer, the page's own prediction stays, and says so.

   Times are the station's local time (NOAA's lst_ldt), not the reader's:
   someone in Denver reading the Seattle page wants Seattle's tide clock.
   ========================================================================== */
(function () {
  'use strict';
  var S = JSON.parse(document.getElementById('station').textContent);
  var $ = function (id) { return document.getElementById(id); };
  var DAYS = 8;
  var NS = 'http://www.w3.org/2000/svg';

  // ---- time in the station's zone -------------------------------------------
  // Offset (ms) of the station's zone from UTC at instant ms.
  function zoneOffset(ms) {
    var p = new Intl.DateTimeFormat('en-US', { timeZone: S.tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(ms)).reduce(function (o, x) { o[x.type] = x.value; return o; }, {});
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
  }
  // "2026-11-12 03:42" in the station's zone -> ms
  function localToMs(s) {
    var m = s.match(/(\d+)-(\d+)-(\d+) (\d+):(\d+)/);
    var guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    return guess - zoneOffset(guess - zoneOffset(guess));
  }
  // Midnight that starts the station-local day with key "YYYY-MM-DD" -> ms
  function dayStart(key) {
    return localToMs(key + ' 00:00');
  }
  var fWd = new Intl.DateTimeFormat('en-US', { timeZone: S.tz, weekday: 'short' });
  var fMd = new Intl.DateTimeFormat('en-US', { timeZone: S.tz, month: 'short', day: 'numeric' });
  var fKey = new Intl.DateTimeFormat('en-CA', { timeZone: S.tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  var fTime = new Intl.DateTimeFormat('en-US', { timeZone: S.tz, hour: 'numeric', minute: '2-digit' });
  function key(ms) { return fKey.format(new Date(ms)); }
  function time(ms) { return fTime.format(new Date(ms)).replace(' AM', ' am').replace(' PM', ' pm'); }
  function ft(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('-0.0', '0.0') + ' ft'; }
  function span(ms) {
    var m = Math.round(ms / 60000), h = Math.floor(m / 60);
    return h ? h + ' h ' + String(m % 60).padStart(2, '0') + ' min' : (m % 60) + ' min';
  }

  // ---- the two sources ---------------------------------------------------------
  var cons = S.cons.map(function (c) { return { name: c[0], amp: c[1], phase: c[2] }; });
  function height(ms) { return window.Harmonics.predict(cons, ms) + S.off; }

  function fromHarmonics(t0, t1) {
    var step = 6 * 60e3, n = Math.round((t1 - t0) / step);
    var ser = window.Harmonics.series(cons, t0, step, n);
    return window.Harmonics.extrema(ser, t0, step).map(function (e) { return { t: e.t, v: e.v + S.off, type: e.type }; });
  }

  function fromNoaa(today) {
    var url = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions'
      + '&station=' + S.id + '&begin_date=' + today.replace(/-/g, '') + '&range=' + (DAYS * 24 + 12)
      + '&datum=MLLW&units=english&time_zone=lst_ldt&interval=hilo&format=json&application=tidehere';
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('noaa ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j.predictions || !j.predictions.length) throw new Error('noaa empty');
        return j.predictions.map(function (p) { return { t: localToMs(p.t), v: +p.v, type: p.type }; });
      });
  }

  // ---- drawing -----------------------------------------------------------------
  function cell(x, now) {
    return '<div class="wt ' + x.type + (x.t < now ? ' past' : '') + '" role="listitem">'
      + '<span class="k">' + (x.type === 'H' ? 'High' : 'Low') + '</span>'
      + '<span class="t">' + time(x.t) + '</span><span class="h">' + ft(x.v) + '</span></div>';
  }

  function hero(turns, now) {
    var fut = turns.filter(function (x) { return x.t > now; });
    var a = fut[0], b = fut[1];
    if (!a) return;
    $('dir').innerHTML = '<span class="arrow" aria-hidden="true">' + (a.type === 'H' ? '↑' : '↓') + '</span>'
      + (a.type === 'H' ? 'Rising' : 'Falling') + ' now';
    function nx(x, lab, cls, withIn) {
      var when = key(x.t) === key(now) ? '' : key(x.t) === key(now + 864e5) ? ' \u00b7 tomorrow' : ' \u00b7 ' + fWd.format(new Date(x.t));
      return '<div class="nx' + cls + '"><span class="lab">' + lab + ' ' + (x.type === 'H' ? 'high' : 'low') + when + '</span>'
        + '<span class="t">' + time(x.t) + '</span>'
        + '<span class="h">' + ft(x.v) + (withIn ? ' · in ' + span(x.t - now) : '') + '</span></div>';
    }
    $('next').innerHTML = nx(a, 'Next', '', true) + (b ? nx(b, 'Then', ' then', false) : '');
  }

  // Today, midnight to midnight: the shape from the harmonic prediction,
  // nudged so its highs and lows sit exactly on the times and heights shown
  // (NOAA's, once they arrive); the turns as dots; now as a hairline.
  function curve(turns, now) {
    var svg = $('curve'); if (!svg) return;
    var d0 = dayStart(key(now)), d1 = d0 + 24 * 3600e3;
    var W = 360, H = 120, PAD = 10, step = 10 * 60e3;
    var pts = [];
    for (var t = d0; t <= d1; t += step) pts.push([t, height(t)]);
    // Correct the model to the turns being shown: linear blend of each turn's
    // height error between turns (the shape is the model's, the extremes are the table's).
    var near = turns.filter(function (x) { return x.t > d0 - 14 * 3600e3 && x.t < d1 + 14 * 3600e3; });
    var err = near.map(function (x) { return [x.t, x.v - height(x.t)]; });
    function corr(t) {
      if (!err.length) return 0;
      if (t <= err[0][0]) return err[0][1];
      for (var i = 1; i < err.length; i++) if (t <= err[i][0]) {
        var f = (t - err[i - 1][0]) / (err[i][0] - err[i - 1][0]);
        return err[i - 1][1] * (1 - f) + err[i][1] * f;
      }
      return err[err.length - 1][1];
    }
    pts = pts.map(function (p) { return [p[0], p[1] + corr(p[0])]; });
    var vs = pts.map(function (p) { return p[1]; });
    var lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs), r = (hi - lo) || 1;
    function X(t) { return ((t - d0) / (d1 - d0)) * W; }
    function Y(v) { return PAD + (1 - (v - lo) / r) * (H - 2 * PAD); }
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join('');
    var g = '<path class="c-fill" d="' + line + 'L' + W + ' ' + H + 'L0 ' + H + 'Z"/>'
      + '<path class="c-line" d="' + line + '" vector-effect="non-scaling-stroke"/>';
    [6, 12, 18].forEach(function (h) {
      var x = X(d0 + h * 3600e3);
      g += '<line class="c-tick" x1="' + x + '" x2="' + x + '" y1="0" y2="' + H + '" vector-effect="non-scaling-stroke"/>';
    });
    if (now >= d0 && now <= d1) {
      var xn = X(now);
      g += '<line class="c-now" x1="' + xn + '" x2="' + xn + '" y1="0" y2="' + H + '" vector-effect="non-scaling-stroke"/>';
    }
    svg.innerHTML = g;
    // Dots are HTML, not SVG circles: the SVG is stretched to the width,
    // and a stretched circle is an ellipse. They are placed in percent of
    // the curve's own box (.cv), so nothing that moves the page later - the
    // water temperature line appearing, a font loading, a resize - can
    // shift them off the line.
    var fig = svg.parentNode, old = fig.querySelectorAll('.c-dot');
    for (var i = 0; i < old.length; i++) old[i].remove();
    function dot(t, v, cls) {
      var el = document.createElement('span');
      el.className = 'c-dot ' + cls;
      el.style.left = (100 * X(t) / W) + '%';
      el.style.top = (100 * Y(v) / H) + '%';
      fig.appendChild(el);
    }
    turns.forEach(function (x) { if (x.t >= d0 && x.t <= d1) dot(x.t, x.v, x.type); });
    if (now >= d0 && now <= d1) dot(now, height(now) + corr(now), 'now');
  }

  function week(turns, now) {
    var today = key(now), days = {}, order = [];
    turns.forEach(function (x) {
      var k = key(x.t);
      if (k < today) return;
      if (!days[k]) { days[k] = []; order.push(k); }
      days[k].push(x);
    });
    $('today').innerHTML = (days[today] || []).map(function (x) { return cell(x, now); }).join('');
    $('week').innerHTML = order.filter(function (k) { return k > today; }).slice(0, DAYS - 1).map(function (k) {
      var t = days[k][0].t;
      return '<div class="wk" role="list" aria-label="' + fWd.format(new Date(t)) + ' ' + fMd.format(new Date(t)) + '">'
        + '<div class="wd"><span>' + fWd.format(new Date(t)) + '</span><span class="md">' + fMd.format(new Date(t)) + '</span></div>'
        + days[k].map(function (x) { return cell(x, now); }).join('') + '</div>';
    }).join('');
  }

  function draw(turns, source) {
    var now = Date.now();
    hero(turns, now);
    curve(turns, now);
    week(turns, now);
    $('now-src').innerHTML = source;
  }

  // ---- water temperature -------------------------------------------------------
  // Only on pages whose gauge measures it (S.wt, decided at build from NOAA).
  // A reading more than six hours old says so rather than passing for now.
  function waterTemp() {
    var el = $('now-temp');
    if (!S.wt || !el) return;
    var url = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_temperature&date=latest'
      + '&station=' + S.id + '&units=english&time_zone=lst_ldt&format=json&application=tidehere';
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var d = j.data && j.data[0];
      if (!d || d.v === '' || isNaN(+d.v)) throw new Error('no reading');
      var f = +d.v, c = (f - 32) * 5 / 9, t = localToMs(d.t), age = Date.now() - t;
      var when = age > 6 * 3600e3 ? 'last reading ' + fMd.format(new Date(t)) + ', ' + time(t) : 'at ' + time(t);
      el.innerHTML = 'Water <span class="n">' + f.toFixed(0) + '°F</span> <span class="soft"><span class="n">'
        + c.toFixed(0) + '°C</span> · ' + when + '</span>';
      el.hidden = false;
    }).catch(function () {
      el.innerHTML = '<span class="soft">Water temperature: the gauge is not reporting right now.</span>';
      el.hidden = false;
    });
  }

  // ---- go ------------------------------------------------------------------------
  var now = Date.now(), today = key(now);
  var t0 = dayStart(today) - 14 * 3600e3, t1 = dayStart(today) + (DAYS * 24 + 14) * 3600e3;
  var link = '<a href="https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=' + S.id + '">NOAA ' + S.id + '</a>';
  var mine = null;
  try {
    mine = fromHarmonics(t0, t1);
    draw(mine, 'Predicted on this page from ' + link + '’s constants · checking NOAA…');
  } catch (e) { /* no engine: wait for NOAA */ }
  waterTemp();
  fromNoaa(today).then(function (t) {
    draw(t, 'Official NOAA predictions, ' + link + ' · local time · heights above MLLW');
  }).catch(function () {
    if (mine) {
      $('now-src').innerHTML = 'NOAA did not answer, so these are predicted on this page from ' + link
        + '’s constants - usually within a few minutes · local time · above MLLW';
    } else {
      $('dir').textContent = 'The tide times could not be loaded.';
      $('now-src').innerHTML = 'NOAA’s official table: ' + link + '.';
    }
  });
})();
