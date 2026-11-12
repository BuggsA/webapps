/* ==========================================================================
   Tide times - the live part of a place page.

   The page is built once a year from NOAA's data (scripts/tide-build-places.py)
   and everything on it that does not move is already written into the HTML.
   This file fills in the one thing that does: the next eight days of high
   and low water, and whether the tide is rising or falling now.

   First choice: NOAA's own official predictions for the station, asked for
   straight from the browser (keyless, CORS-open - the globe does the same).
   If NOAA does not answer, the page predicts for itself from the station's
   harmonic constants, which are shipped in the page (#station), with
   lib/harmonics.js - the engine gated against NOAA in
   scripts/tide-test-harmonics.js - and SAYS so. Nothing is ever shown
   without its source.

   Times are the station's local time (NOAA's lst_ldt), not the reader's:
   someone in Denver reading the Seattle page wants Seattle's tide clock.
   ========================================================================== */
(function () {
  'use strict';
  var S = JSON.parse(document.getElementById('station').textContent);
  var elState = document.getElementById('now-state');
  var elSrc = document.getElementById('now-src');
  var elWeek = document.getElementById('week');
  var DAYS = 8;

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
    var t = guess - zoneOffset(guess);
    return guess - zoneOffset(t);
  }
  var fDay = new Intl.DateTimeFormat('en-US', { timeZone: S.tz, weekday: 'short', month: 'short', day: 'numeric' });
  var fKey = new Intl.DateTimeFormat('en-CA', { timeZone: S.tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  var fTime = new Intl.DateTimeFormat('en-US', { timeZone: S.tz, hour: 'numeric', minute: '2-digit' });
  function time(ms) { return fTime.format(new Date(ms)).replace(' AM', ' am').replace(' PM', ' pm'); }
  function ft(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('-0.0', '0.0') + ' ft'; }
  function span(ms) {
    var m = Math.round(ms / 60000), h = Math.floor(m / 60);
    return h ? h + ' h ' + String(m % 60).padStart(2, '0') : (m % 60) + ' min';
  }

  function start() {
    // begin at the start of today, station time
    var now = Date.now();
    var key = fKey.format(new Date(now)).replace(/-/g, '');
    return { now: now, key: key };
  }

  function fromNoaa(b) {
    var url = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions'
      + '&station=' + S.id + '&begin_date=' + b.key + '&range=' + (DAYS * 24)
      + '&datum=MLLW&units=english&time_zone=lst_ldt&interval=hilo&format=json&application=tidehere';
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('noaa ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j.predictions || !j.predictions.length) throw new Error('noaa empty');
        return j.predictions.map(function (p) { return { t: localToMs(p.t), v: +p.v, type: p.type }; });
      });
  }

  function fromHarmonics(b) {
    // midnight station-time today, minus a margin so the first turn is found
    var k = b.key, d0 = Date.UTC(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8));
    var t0 = d0 - zoneOffset(d0) - 2 * 3600e3, step = 6 * 60e3;
    var n = Math.round(((DAYS * 24 + 4) * 3600e3) / step);
    var cons = S.cons.map(function (c) { return { name: c[0], amp: c[1], phase: c[2] }; });
    var ser = window.Harmonics.series(cons, t0, step, n);
    return window.Harmonics.extrema(ser, t0, step).map(function (e) { return { t: e.t, v: e.v + S.off, type: e.type }; });
  }

  function render(turns, b, source) {
    var days = {}, order = [];
    turns.forEach(function (x) {
      var k = fKey.format(new Date(x.t));
      if (!days[k]) { days[k] = []; order.push(k); }
      days[k].push(x);
    });
    var todayKey = fKey.format(new Date(b.now));
    order = order.filter(function (k) { return k >= todayKey; }).slice(0, DAYS);
    var rows = order.map(function (k) {
      var lis = days[k].map(function (x) {
        var past = x.t < b.now ? ' past' : '';
        return '<li class="' + x.type + past + '"><span class="k">' + (x.type === 'H' ? 'High' : 'Low') + '</span>'
          + time(x.t) + '<span class="v">' + ft(x.v) + '</span></li>';
      }).join('');
      var label = k === todayKey ? 'Today' : fDay.format(new Date(days[k][0].t));
      return '<tr' + (k === todayKey ? ' class="today"' : '') + '><th scope="row">' + label + '</th><td><ul class="turns">' + lis + '</ul></td></tr>';
    });
    elWeek.innerHTML = '<caption class="visually-hidden">High and low tides at ' + S.name + ', next ' + DAYS + ' days</caption><tbody>' + rows.join('') + '</tbody>';

    var next = turns.filter(function (x) { return x.t > b.now; })[0];
    if (next) {
      elState.innerHTML = (next.type === 'H' ? 'Rising' : 'Falling') + ' now · ' + (next.type === 'H' ? 'high' : 'low')
        + ' of <span class="n">' + ft(next.v) + '</span> at <span class="n">' + time(next.t) + '</span>'
        + ' <span class="n" style="color:var(--chrome-soft)">(in ' + span(next.t - b.now) + ')</span>';
    }
    elSrc.textContent = source;
  }

  var b = start();
  fromNoaa(b).then(function (t) {
    render(t, b, 'Official NOAA predictions for station ' + S.id + ', just now. Heights above mean lower low water (MLLW). Times are local time at ' + S.name + '.');
  }).catch(function () {
    try {
      render(fromHarmonics(b), b, 'NOAA did not answer, so these are computed on this page from the station’s NOAA harmonic constants - usually within a few minutes of the official table. Heights above MLLW, local time.');
    } catch (e) {
      elState.textContent = 'The tide times could not be loaded.';
      elSrc.innerHTML = 'NOAA’s official table for this station: <a href="https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=' + S.id + '">tidesandcurrents.noaa.gov</a>.';
    }
  });
})();
