/* ==========================================================================
   The moon page (/moon/) - everything on it that moves.

   All of it is worked out here, from lib/astronomy.js (astronomy-engine,
   the same file the globe uses). Nothing is fetched except the place
   search, and only when someone types in it.

   The answer comes first and needs no place: the phase, drawn and named,
   how much is lit, and when the next full and new moon come. A place adds
   moonrise, moonset and where the moon is now. The place is the one the
   globe saved (localStorage "tide.places", same origin and same shape -
   rememberPlace() in tide.js), so someone who has used the globe gets
   their times without being asked again. Choosing a place here saves it
   there too.

   Times are in the place's time zone (Open-Meteo's geocoder gives it), and
   in the browser's when there is no place: someone reading the page for
   Sydney from London wants Sydney's moonrise clock.

   Naming: a principal phase (new, first quarter, full, last quarter) is an
   instant. The day it falls on carries its name - the convention of every
   printed moon calendar - and every other day is named by its stretch
   (waxing crescent and so on). So "Full moon" shows on one day, not three.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.Astronomy;
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var DAY = 86400000;
  var LS_PLACES = 'tide.places', LS_PLACE = 'tide.place', MAX_PLACES = 3;
  var BROWSER_TZ = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (_) { return 'UTC'; } })();
  var QNAME = ['New moon', 'First quarter', 'Full moon', 'Last quarter'];
  var QSHORT = ['New', '1st qtr', 'Full', '3rd qtr'];

  // ---- the place ---------------------------------------------------------------
  function readPlaces() {
    try {
      var p = JSON.parse(localStorage.getItem(LS_PLACES) || 'null');
      if (Array.isArray(p)) return p.filter(function (x) { return x && isFinite(x.lat) && isFinite(x.lon); });
    } catch (_) {}
    try {
      var old = JSON.parse(localStorage.getItem(LS_PLACE) || 'null');
      if (old && isFinite(old.lat) && isFinite(old.lon)) return [old];
    } catch (_) {}
    return [];
  }
  function km(aLat, aLon, bLat, bLon) {
    var r = Math.PI / 180, dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 12742 * Math.asin(Math.sqrt(h));
  }
  // the same rule as rememberPlace() in tide.js: newest first, one per km, three at most
  function savePlace(cur) {
    var list = [cur].concat(readPlaces().filter(function (p) { return km(p.lat, p.lon, cur.lat, cur.lon) > 1; })).slice(0, MAX_PLACES);
    try { localStorage.setItem(LS_PLACES, JSON.stringify(list)); } catch (_) {}
  }
  var place = readPlaces()[0] || null;
  function tz() { return (place && place.tz) || BROWSER_TZ; }

  // ---- time in the place's zone (the method of tide-times/place.js) -------------
  var F = {};
  function formatters() {
    var z = tz();
    if (F.z === z) return F;
    F = { z: z,
      key:  new Intl.DateTimeFormat('en-CA', { timeZone: z, year: 'numeric', month: '2-digit', day: '2-digit' }),
      time: new Intl.DateTimeFormat('en-US', { timeZone: z, hour: 'numeric', minute: '2-digit' }),
      day:  new Intl.DateTimeFormat('en-US', { timeZone: z, weekday: 'short', month: 'short', day: 'numeric' }),
      wd:   new Intl.DateTimeFormat('en-US', { timeZone: z, weekday: 'short' }),
      parts: new Intl.DateTimeFormat('en-US', { timeZone: z, hourCycle: 'h23', year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
    return F;
  }
  function zoneOffset(ms) {
    var p = formatters().parts.formatToParts(new Date(ms)).reduce(function (o, x) { o[x.type] = x.value; return o; }, {});
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
  }
  function localToMs(y, mo, d, h) {          // a wall-clock time in the place's zone -> ms
    var guess = Date.UTC(y, mo, d, h || 0);
    return guess - zoneOffset(guess - zoneOffset(guess));
  }
  function key(ms) { return formatters().key.format(new Date(ms)); }
  function dayStart(ms) { var k = key(ms).split('-'); return localToMs(+k[0], +k[1] - 1, +k[2], 0); }
  function time(ms) { return formatters().time.format(new Date(ms)).replace(' AM', ' am').replace(' PM', ' pm'); }
  function dayName(ms) { return formatters().day.format(new Date(ms)); }
  // "today", "tomorrow", "in 8 days" - counted in the place's calendar days
  function daysAway(ms, now) {
    var n = Math.round((dayStart(ms) - dayStart(now)) / DAY);
    return n === 0 ? 'today' : n === 1 ? 'tomorrow' : n === -1 ? 'yesterday' : n > 0 ? 'in ' + n + ' days' : n + ' days ago';
  }
  // a time with its day when it is not today: "6:12 pm" or "6:12 am tomorrow" or "6:12 am Thu"
  function when(ms, now) {
    var n = Math.round((dayStart(ms) - dayStart(now)) / DAY);
    return time(ms) + (n === 0 ? '' : n === 1 ? ' tomorrow' : ' ' + formatters().wd.format(new Date(ms)));
  }

  // ---- the disc ---------------------------------------------------------------------
  // P is the moon's phase angle (A.MoonPhase: 0 new, 90 first quarter, 180
  // full, 270 last quarter). The lit half is drawn on the right, then the
  // whole disc is mirrored for a waning moon, and mirrored again south of the
  // equator, where the moon is seen the other way up. The terminator is a
  // half-ellipse whose width is |cos P| of the radius: bulging toward the lit
  // limb for a crescent (cos P > 0), away from it for a gibbous moon.
  function southern() {
    if (place) return place.lat < 0;
    // no place yet: guess the hemisphere from the browser's time zone
    return /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Noumea|Port_Moresby)|^America\/(Argentina|Santiago|Sao_Paulo|Montevideo|Asuncion|Lima|La_Paz)|^Africa\/(Johannesburg|Maputo|Windhoek|Harare|Lusaka|Gaborone|Maseru|Mbabane|Antananarivo)|^Indian\/(Mauritius|Reunion)/.test(BROWSER_TZ);
  }
  function disc(svg, P, r) {
    r = r || 46;
    var c = Math.cos(P * Math.PI / 180), rx = Math.max(Math.abs(c) * r, 0.01);
    var flip = (P > 180) !== southern();
    svg.innerHTML = '';
    var dark = document.createElementNS(NS, 'circle');
    dark.setAttribute('r', r); dark.setAttribute('class', 'dark');
    var lit = document.createElementNS(NS, 'path');
    lit.setAttribute('d', 'M0 ' + (-r) + 'A' + r + ' ' + r + ' 0 0 1 0 ' + r +
      'A' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + (c > 0 ? 0 : 1) + ' 0 ' + (-r) + 'Z');
    lit.setAttribute('class', 'lit');
    if (flip) lit.setAttribute('transform', 'scale(-1 1)');
    svg.appendChild(dark); svg.appendChild(lit);
  }
  function smallDisc(P) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '-50 -50 100 100'); s.setAttribute('aria-hidden', 'true');
    disc(s, P, 44);
    return s;
  }

  // ---- the astronomy ------------------------------------------------------------------
  function phaseAt(ms) { return A.MoonPhase(A.MakeTime(new Date(ms))); }
  function quartersFrom(ms, n) {            // the next n principal phases after ms
    var out = [], q = A.SearchMoonQuarter(new Date(ms));
    while (out.length < n) { out.push({ q: q.quarter, ms: q.time.date.getTime() }); q = A.NextMoonQuarter(q); }
    return out;
  }
  function stretch(P) {
    return P < 90 ? 'Waxing crescent' : P < 180 ? 'Waxing gibbous' : P < 270 ? 'Waning gibbous' : 'Waning crescent';
  }
  var COMPASS = ['north', 'north-northeast', 'northeast', 'east-northeast', 'east', 'east-southeast', 'southeast',
    'south-southeast', 'south', 'south-southwest', 'southwest', 'west-southwest', 'west', 'west-northwest', 'northwest', 'north-northwest'];
  function compass(az) { return COMPASS[Math.round(((az % 360) + 360) % 360 / 22.5) % 16]; }

  // ---- the answer -----------------------------------------------------------------------
  function renderNow(now) {
    var P = phaseAt(now), d0 = dayStart(now);
    var lit = A.Illumination(A.Body.Moon, A.MakeTime(new Date(now))).phase_fraction;
    var today = quartersFrom(d0, 1)[0];
    var isToday = today.ms < dayStart(d0 + 1.5 * DAY);
    var name = isToday ? QNAME[today.q] : stretch(P);
    disc($('disc'), isToday ? today.q * 90 : P);
    $('disc').setAttribute('aria-label', name + ', ' + Math.round(lit * 100) + '% lit');
    $('ph-name').textContent = name;
    var newMs = A.SearchMoonPhase(0, new Date(now), -31).date.getTime();
    $('ph-lit').textContent = Math.round(lit * 100) + '% lit · day ' + Math.floor((now - newMs) / DAY) + ' of 29.5';
    $('ph-way').textContent = isToday
      ? 'At ' + time(today.ms) + ' today'
      : P < 180 ? 'Waxing - a little fuller each night' : 'Waning - a little thinner each night';

    // the next full and the next new moon, sooner first
    var full = A.SearchMoonPhase(180, new Date(now), 40).date.getTime();
    var nw = A.SearchMoonPhase(0, new Date(now), 40).date.getTime();
    var two = [{ n: 'Next full moon', ms: full }, { n: 'Next new moon', ms: nw }].sort(function (a, b) { return a.ms - b.ms; });
    var cells = $('next').children;
    two.forEach(function (x, i) {
      cells[i].querySelector('.lab').textContent = x.n;
      cells[i].querySelector('.t').textContent = dayName(x.ms);
      cells[i].querySelector('.h').textContent = time(x.ms) + ' · ' + daysAway(x.ms, now);
    });
  }

  // ---- your place ------------------------------------------------------------------------
  function cell(label, ms, sub, past) {
    var d = document.createElement('div');
    d.className = 'wt' + (past ? ' past' : ''); d.setAttribute('role', 'listitem');
    d.innerHTML = '<span class="k"></span><span class="t"></span><span class="h"></span>';
    d.querySelector('.k').textContent = label;
    d.querySelector('.t').textContent = ms == null ? '–' : time(ms);
    d.querySelector('.h').textContent = sub || ' ';
    return d;
  }
  function renderHere(now) {
    if (!place) { $('here').hidden = true; $('here-name').textContent = ''; showLocate(true); return; }
    showLocate(false);
    $('here').hidden = false;
    $('here-name').textContent = 'in ' + place.place;
    var obs = new A.Observer(place.lat, place.lon, 0), M = A.Body.Moon;
    var d0 = dayStart(now), d1 = dayStart(d0 + 1.5 * DAY);
    var inDay = function (ev) { return ev && ev.date.getTime() < d1 ? ev.date.getTime() : null; };
    var rise = inDay(A.SearchRiseSet(M, obs, +1, new Date(d0), 1.2));
    var set = inDay(A.SearchRiseSet(M, obs, -1, new Date(d0), 1.2));
    var tr = A.SearchHourAngle(M, obs, 0, new Date(d0));
    var top = tr.time.date.getTime() < d1 ? tr : null;

    var row = [
      { k: 'Rises', ms: rise, sub: rise == null ? 'not today' : '' },
      { k: 'Highest', ms: top ? top.time.date.getTime() : null,
        sub: top ? Math.round(top.hor.altitude) + '° ' + (top.hor.altitude > 0 ? compass(top.hor.azimuth) : 'below the horizon') : 'not today' },
      { k: 'Sets', ms: set, sub: set == null ? 'not today' : '' }
    ].sort(function (a, b) { return (a.ms == null ? Infinity : a.ms) - (b.ms == null ? Infinity : b.ms); });
    var box = $('here-times'); box.innerHTML = '';
    row.forEach(function (x) { box.appendChild(cell(x.k, x.ms, x.sub, x.ms != null && x.ms < now)); });

    // where it is now, and what it does next
    var t = A.MakeTime(new Date(now));
    var eq = A.Equator(M, t, obs, true, true), hor = A.Horizon(t, obs, eq.ra, eq.dec, 'normal');
    var line;
    if (hor.altitude > 0) {
      var s = A.SearchRiseSet(M, obs, -1, new Date(now), 3);
      line = 'Up now, ' + Math.round(hor.altitude) + '° high in the ' + compass(hor.azimuth) + '.' +
        (s ? ' Sets at ' + when(s.date.getTime(), now) + '.' : '');
    } else {
      var r = A.SearchRiseSet(M, obs, +1, new Date(now), 30);
      line = 'Below the horizon now.' + (r ? ' Rises at ' + when(r.date.getTime(), now) + ' in the ' + compass(riseAz(obs, r)) + '.' : '');
    }
    $('here-now').textContent = line;
  }
  function riseAz(obs, ev) {
    var eq = A.Equator(A.Body.Moon, ev, obs, true, true);
    return A.Horizon(ev, obs, eq.ra, eq.dec, 'normal').azimuth;
  }

  // ---- choosing a place (as the globe does: search by name, or the device) -------------
  var el = { form: $('locate'), q: $('loc-q'), res: $('loc-results'), msg: $('loc-msg') };
  function showLocate(show) {
    el.form.hidden = !show;
    if (show) { el.res.hidden = true; say(''); }
  }
  function say(t) { el.msg.textContent = t; el.msg.hidden = !t; }
  function geocode(name) {
    var url = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(name) + '&count=6&language=en&format=json';
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('geocode ' + r.status); return r.json(); }).then(function (j) {
      return (j.results || []).map(function (x) {
        return { lat: x.latitude, lon: x.longitude, tz: x.timezone, name: x.name, country: x.country_code,
          sub: [x.admin1, x.country].filter(Boolean).join(', ') };
      });
    });
  }
  function enter(item) {
    place = { lat: item.lat, lon: item.lon, place: item.name, tz: item.tz || BROWSER_TZ, country: item.country || '' };
    savePlace(place);
    el.q.value = '';
    calMonth = null;                       // the calendar follows the new place's "today"
    renderAll();
  }
  function renderResults(list) {
    el.res.innerHTML = '';
    if (!list.length) { el.res.hidden = true; return; }
    list.forEach(function (item) {
      var li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<span class="p-name"></span><span class="p-sub"></span>';
      b.querySelector('.p-name').textContent = item.name; b.querySelector('.p-sub').textContent = item.sub;
      b.addEventListener('click', function () { enter(item); });
      li.appendChild(b); el.res.appendChild(li);
    });
    el.res.hidden = false;
  }
  var seq = 0, timer = 0;
  el.q.addEventListener('input', function () {
    var q = el.q.value.trim(), mine = ++seq;
    clearTimeout(timer);
    if (q.length < 2) { el.res.hidden = true; return; }
    timer = setTimeout(function () {
      geocode(q).then(function (l) { if (mine === seq) renderResults(l); })
        .catch(function () { if (mine === seq) say('Search is offline - try "Use my location".'); });
    }, 250);
  });
  el.form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = el.q.value.trim(); if (!q) return;
    geocode(q).then(function (l) { if (l.length) enter(l[0]); else say('Nothing found by that name.'); })
      .catch(function () { say('Search is offline - try "Use my location".'); });
  });
  $('loc-device').addEventListener('click', function () {
    if (!navigator.geolocation) { say('This browser has no location.'); return; }
    say('Finding you…');
    navigator.geolocation.getCurrentPosition(
      function (p) { enter({ lat: p.coords.latitude, lon: p.coords.longitude, name: 'Where you are', tz: BROWSER_TZ }); },
      function () { say('Location was refused - search by name instead.'); },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600e3 });
  });
  $('here-change').addEventListener('click', function () { showLocate(el.form.hidden); if (!el.form.hidden) el.q.focus(); });

  // ---- the next phases, and the tide they bring -------------------------------------------
  function renderPhases(now) {
    var box = $('phases'); box.innerHTML = '';
    var qs = quartersFrom(now, 8);
    qs.forEach(function (x) {
      var r = document.createElement('div');
      r.className = 'ph-row' + (x.q % 2 === 0 ? ' big' : '');
      r.appendChild(smallDisc(x.q * 90));
      var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = QNAME[x.q];
      var w = document.createElement('span'); w.className = 'when'; w.textContent = dayName(x.ms) + ' · ' + time(x.ms);
      nm.appendChild(document.createElement('br'));
      var inn = document.createElement('span'); inn.className = 'in'; inn.textContent = daysAway(x.ms, now);
      nm.appendChild(inn);
      r.appendChild(nm); r.appendChild(w);
      box.appendChild(r);
    });
    var spring = qs.filter(function (x) { return x.q % 2 === 0; })[0];
    var neap = qs.filter(function (x) { return x.q % 2 === 1; })[0];
    $('tide-next').textContent = 'Next spring tides: after the ' + QNAME[spring.q].toLowerCase() + ' on ' + dayName(spring.ms) +
      '. Next neap tides: after the ' + QNAME[neap.q].toLowerCase() + ' on ' + dayName(neap.ms) + '.';
  }

  // ---- the month ------------------------------------------------------------------------------
  var calMonth = null;                      // [year, month0] in the place's zone
  function renderCal(now) {
    if (!calMonth) { var k = key(now).split('-'); calMonth = [+k[0], +k[1] - 1]; }
    var y = calMonth[0], m = calMonth[1];
    var len = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    var first = new Date(Date.UTC(y, m, 1)).getUTCDay();          // weekday of the 1st (calendar arithmetic, zone-free)
    var mName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });
    var mShort = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
    $('cal-title').textContent = 'Moon calendar, ' + mName.format(Date.UTC(y, m, 1)) + ' ' + y;
    $('cal-prev').querySelector('span').textContent = mShort.format(Date.UTC(y, m - 1, 1));
    $('cal-next').querySelector('span').textContent = mShort.format(Date.UTC(y, m + 1, 1));

    // the principal phases inside this month, by local day
    var start = localToMs(y, m, 1, 0), end = localToMs(y, m + 1, 1, 0), onDay = {};
    quartersFrom(start - DAY, 6).forEach(function (x) { if (x.ms >= start && x.ms < end) onDay[key(x.ms)] = x.q; });

    var box = $('cal'); box.innerHTML = '';
    'SMTWTFS'.split('').forEach(function (c) { var h = document.createElement('div'); h.className = 'dow'; h.textContent = c; box.appendChild(h); });
    for (var b = 0; b < first; b++) { var e = document.createElement('div'); e.className = 'd blank'; box.appendChild(e); }
    var todayKey = key(now);
    for (var d = 1; d <= len; d++) {
      var noon = localToMs(y, m, d, 12), k2 = key(noon), q = onDay[k2];
      var c = document.createElement('div');
      c.className = 'd' + (k2 === todayKey ? ' today' : '');
      c.setAttribute('role', 'gridcell');
      var P = q != null ? q * 90 : phaseAt(noon);
      c.setAttribute('aria-label', d + ' ' + mName.format(Date.UTC(y, m, 1)) + ': ' + (q != null ? QNAME[q] : stretch(P).toLowerCase()));
      c.appendChild(smallDisc(P));
      var n = document.createElement('span'); n.className = 'n'; n.textContent = d; c.appendChild(n);
      var ql = document.createElement('span'); ql.className = 'q' + (q % 2 === 1 ? ' small' : '');
      ql.textContent = q != null ? QSHORT[q] : ''; c.appendChild(ql);
      box.appendChild(c);
    }
  }
  $('cal-prev').addEventListener('click', function () { calMonth = calMonth[1] ? [calMonth[0], calMonth[1] - 1] : [calMonth[0] - 1, 11]; renderCal(nowMs()); });
  $('cal-next').addEventListener('click', function () { calMonth = calMonth[1] < 11 ? [calMonth[0], calMonth[1] + 1] : [calMonth[0] + 1, 0]; renderCal(nowMs()); });

  // ---- go --------------------------------------------------------------------------------------
  // ?t=<ISO time> renders another moment - for checking the page, not linked anywhere.
  var fixed = (function () { var m = /[?&]t=([^&]+)/.exec(location.search); var t = m && Date.parse(decodeURIComponent(m[1])); return isFinite(t) ? t : null; })();
  function nowMs() { return fixed != null ? fixed : Date.now(); }
  function renderAll() {
    var now = nowMs();
    renderNow(now); renderHere(now); renderPhases(now); renderCal(now);
  }
  renderAll();
  if (fixed == null) setInterval(renderAll, 60000);
})();
