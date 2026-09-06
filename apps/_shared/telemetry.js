/* ==========================================================================
   telemetry.js — a tiny, portable, privacy-respecting event logger.

   CANONICAL COPY. Each app under apps/<name>/ ships its own copy of this
   file (the deploy syncs only the app folder) and loads it BEFORE its main
   script:  <script src="telemetry.js"></script>

   Design:
   - OFF BY DEFAULT. With ENDPOINT = '' nothing leaves the device — events
     accumulate in a capped in-memory ring buffer only. Inspect them in the
     console via  window.__telemetry.buf , or load the page with
     ?debug=telemetry  to have every event logged as it happens.
   - No UX surface: no consent banner, no blocking. Sends (when an endpoint
     is set) use navigator.sendBeacon on tab-hide / pagehide — fire & forget.
   - PII-free: no lat/lon, no stable identifier. The session id is random and
     lives only for the page load. Only coarse context (viewport, dpr,
     timezone NAME, language, reduced-motion, touch, referrer host).
   - To actually collect: set ENDPOINT to a POST collector (e.g. a Tier-2
     Lambda Function URL) and add a line to the app's privacy copy.

   API:  Telemetry.track('event.name', { any: 'props' })
         Telemetry.flush()            // force a send (usually automatic)
   ========================================================================== */
window.Telemetry = (function () {
  'use strict';

  var ENDPOINT = '';        // <-- set to a collector URL to enable sending
  var APP      = (document.querySelector('meta[name="app"]') || {}).content
              || location.pathname.replace(/\/+$/,'').split('/').pop() || 'app';
  var MAX      = 500;       // ring-buffer cap
  var BATCH    = 25;        // send after this many un-sent events (if ENDPOINT set)
  var DEBUG    = /[?&]debug=telemetry\b/.test(location.search);

  var sid  = Math.random().toString(36).slice(2, 10);
  var born = Date.now();
  var buf  = [];
  var sent = 0;

  function base() {
    var d = document.referrer;
    return {
      sid: sid,
      ms: Date.now() - born,
      w: innerWidth, h: innerHeight,
      dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone) || '',
      lang: (navigator.language || '').slice(0, 5),
      rm: matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0,
      touch: matchMedia('(hover: none)').matches ? 1 : 0,
      ref: d ? (function () { try { return new URL(d).hostname; } catch (e) { return ''; } })() : ''
    };
  }

  function track(name, props) {
    if (!name) return;
    // base() first, then caller props on top — an explicit prop always wins
    // over a context field of the same name (e.g. a 'ms' metric vs session age)
    var e = base();
    e.n = String(name);
    if (props) for (var k in props) if (Object.prototype.hasOwnProperty.call(props, k)) e[k] = props[k];
    buf.push(e);
    if (buf.length > MAX) { buf.shift(); if (sent > 0) sent--; }
    if (DEBUG) try { console.debug('[telemetry]', name, props || ''); } catch (x) {}
    if (ENDPOINT && buf.length - sent >= BATCH) flush();
  }

  function flush(isFinal) {
    if (!ENDPOINT) return;
    var batch = buf.slice(sent);
    if (!batch.length) return;
    var body = JSON.stringify({ app: APP, sid: sid, sent_at: Date.now(), events: batch });
    var ok = false;
    try { ok = !!(navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, body)); } catch (e) {}
    if (ok) { sent = buf.length; return; }
    // sendBeacon unavailable/failed — try keepalive fetch, don't block, don't retry hard
    try {
      fetch(ENDPOINT, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' })
        .then(function () { sent = buf.length; })
        .catch(function () {});
    } catch (e) { if (isFinal) sent = buf.length; }
  }

  addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { track('session.hide'); flush(true); }
  });
  addEventListener('pagehide', function () { track('session.end'); flush(true); });
  addEventListener('error', function (ev) {
    track('error', {
      msg: String(ev && ev.message || 'error').slice(0, 200),
      src: String(ev && ev.filename || '').split('/').pop(),
      ln: ev && ev.lineno || 0
    });
  });
  addEventListener('unhandledrejection', function (ev) {
    var r = ev && ev.reason;
    track('error', { msg: ('reject: ' + (r && r.message || r)).slice(0, 200) });
  });

  window.__telemetry = { buf: buf, flush: flush, sid: sid, endpoint: ENDPOINT };
  track('session.start', { path: location.pathname });
  return { track: track, flush: flush };
})();
