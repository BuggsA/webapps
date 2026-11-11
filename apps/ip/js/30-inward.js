/* apps/ip/js/30-inward.js — the inward half: what this visit told the site, what stayed on the device, and where sight stops.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ THE INWARD HALF ═════════════════════════════════════════════════
 * Phase H of docs/ip-plan-v2.md, built small (owner, 2026-11-11: make the
 * unfinished stories "accurate, complete and interesting ... to the
 * average person"). "The boundary" could not ship without it.
 *
 * The instrument turns around. Four parts, from the plan:
 *   I1 what reached this site     - whoami's own answer, echoed back
 *   I2 what stayed on the device  - read here, now, and sent nowhere
 *   I3 the fingerprint sentence   - why sites collect such things
 *   I4 the boundary               - what this site cannot see at all
 *
 * INFORMS, NEVER ALARMS (PRODUCT_SOUL §8.5). Fear is the cheapest win
 * available here and taking it would make this a worse product. Every row
 * says what a thing is for in plain words, and the relief - how little is
 * kept - is the payoff. No "we know where you are", no red, no countdown.
 *
 * THE EVIDENCE RULE holds. Row 1 shows only what the edge actually echoed
 * (or, in a fixture with no edge, what this browser sends with every
 * request, which is the same thing). A reading of the user-agent is
 * phrased as what the browser SAYS it is, because that is all it is. */

var inwardOpen = false;
var inwardSeen = null;       /* IntersectionObserver on the boundary */

function inwardRow(dl, label, value, note) {
  if (!value) return;
  var d = document.createElement('div'), dt = document.createElement('dt'),
      dd = document.createElement('dd');
  dt.textContent = label;
  dd.appendChild(document.createTextNode(value));
  if (note) {
    var s = document.createElement('span');
    s.className = 'sub';
    s.textContent = note;
    dd.appendChild(s);
  }
  d.appendChild(dt); d.appendChild(dd); dl.appendChild(d);
}

/* What the browser says it is, in words. Order matters: Edge and Opera
 * also say Chrome, and Chrome also says Safari. */
function inwardBrowser(ua, hints) {
  ua = ua || '';
  var b = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera'
        : /Firefox\//.test(ua) ? 'Firefox' : /SamsungBrowser\//.test(ua) ? 'Samsung Internet'
        : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  var plat = hints && hints['sec-ch-ua-platform']
    ? hints['sec-ch-ua-platform'].replace(/"/g, '') : '';
  var os = plat || (/iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android'
        : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS'
        : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : '');
  if (!b && !os) return '';
  return (b || 'A browser') + (os ? ' on ' + os : '');
}

function inwardLanguages(al) {
  if (!al) return '';
  var names = [], dn = null;
  try { dn = new Intl.DisplayNames(['en'], { type: 'language' }); } catch (_) { }
  String(al).split(',').slice(0, 3).forEach(function (part) {
    var code = part.split(';')[0].trim();
    if (!code || code === '*') return;
    var n = code;
    try { if (dn) n = dn.of(code) || code; } catch (_) { }
    if (names.indexOf(n) < 0) names.push(n);
  });
  return names.join(', then ');
}

function inwardHTML() {
  var box = document.createElement('div'), h, p, dl;
  var sent = S.sent || {
    'user-agent': navigator.userAgent,
    'accept-language': (navigator.languages || [navigator.language]).join(',')
  };
  var line = function (id, n) {   /* the story's own words, from content/lines.json */
    var l = chainLines().filter(function (x) { return x.id === id; })[0];
    return l && l.beats[n] ? l.beats[n].say : '';
  };

  h = document.createElement('h2');
  h.textContent = 'What your visit told this site';
  box.appendChild(h);
  p = document.createElement('p');
  p.textContent = line('the-boundary', 0) ||
    'Everything this page has shown you started from what your browser sent when it asked for the page. Here is all of it.';
  box.appendChild(p);

  /* I1 */
  h = document.createElement('h3');
  h.textContent = 'What arrived with your visit';
  box.appendChild(h);
  dl = document.createElement('dl');
  dl.className = 'inward';
  inwardRow(dl, 'Your IP address', S.home ? S.home.text : '',
    'Where to send the reply. Every website you visit gets this; nothing works without it.');
  var place = S.where ? placeText(S.where) : null;
  inwardRow(dl, 'Location, approx.', place && (place.value + (place.sub ? ', ' + place.sub : '')),
    'Guessed from the address, not from your device. It is where your network seems to be, which can be a city away.');
  var net = S.edgeNet && (S.edgeNet.org || (S.edgeNet.asn ? 'AS' + S.edgeNet.asn : ''));
  inwardRow(dl, 'Internet provider', net,
    'Who the address belongs to. On a VPN or at work, that is whoever you are connecting through.');
  inwardRow(dl, 'Your browser', inwardBrowser(sent['user-agent'], sent),
    'What your browser says it is, so sites can send pages that work in it. It is allowed to say anything.');
  if (sent['sec-ch-ua-mobile'] === '?1') inwardRow(dl, 'Device', 'Says it is a phone or tablet', '');
  inwardRow(dl, 'Languages', inwardLanguages(sent['accept-language']),
    'The languages you would like pages in, in order.');
  if (sent['sec-gpc'] === '1' || sent.dnt === '1') {
    inwardRow(dl, 'Privacy request', 'Please do not track me',
      'Your browser asks every site this. This one does not track you either way.');
  }
  box.appendChild(dl);

  /* I2 */
  h = document.createElement('h3');
  h.textContent = 'What your device knows, and kept to itself';
  box.appendChild(h);
  dl = document.createElement('dl');
  dl.className = 'inward';
  var tz = '';
  try {
    tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').split('/').pop().replace(/_/g, ' ');
    var long = new Intl.DateTimeFormat('en', { timeZoneName: 'long' }).formatToParts(new Date())
      .filter(function (x) { return x.type === 'timeZoneName'; })[0];
    if (long) tz = tz ? tz + ', ' + long.value : long.value;
  } catch (_) { }
  inwardRow(dl, 'Time zone', tz, 'From your clock settings, not your address.');
  if (window.screen && screen.width) {
    inwardRow(dl, 'Screen', screen.width + ' × ' + screen.height +
      (window.devicePixelRatio > 1 ? ', at ' + Math.round(window.devicePixelRatio * 100) / 100 + '× sharpness' : ''), '');
  }
  if (navigator.hardwareConcurrency) {
    inwardRow(dl, 'Processor', navigator.hardwareConcurrency + ' cores', '');
  }
  var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  inwardRow(dl, 'Appearance', dark ? 'Dark mode' : 'Light mode', '');
  box.appendChild(dl);
  p = document.createElement('p');
  p.textContent = 'This page read these just now, on your device, to show you. None of them was sent anywhere.';
  box.appendChild(p);

  /* I3 */
  h = document.createElement('h3');
  h.textContent = 'Why any of this matters';
  box.appendChild(h);
  p = document.createElement('p');
  p.textContent = 'None of these is unusual on its own. Put together, details like these can be ' +
    'distinctive enough for a site to recognise the same browser again without a cookie, which ' +
    'is why some sites collect them. This one keeps none of them. Your address and the rest are ' +
    'read for each request and not stored. Visits are counted by Cloudflare Web Analytics, which ' +
    'sets no cookie.';
  box.appendChild(p);

  /* I4 */
  var edge = document.createElement('section');
  edge.id = 'inwardEdge';
  h = document.createElement('h3');
  h.textContent = 'Where this site stops being able to see';
  edge.appendChild(h);
  p = document.createElement('p');
  /* accurate, not reassuring: a link CAN tell a site which page sent you */
  p.textContent = 'Your name. Your street address. Your email, your accounts, the other tabs you ' +
    'have open. Your browsing history, except that a link you follow can tell a site which ' +
    'page it was on. None of the rest came with your visit.';
  edge.appendChild(p);
  p = document.createElement('p');
  p.className = 'said';
  p.textContent = line('the-boundary', 1) ||
    'Your address says where to send the answer. It does not say who you are.';
  edge.appendChild(p);
  var s = chainSt('the-boundary');
  if (s && s.done) {
    var l = chainLines().filter(function (x) { return x.id === 'the-boundary'; })[0];
    if (l && l.reveal) {
      p = document.createElement('p');
      p.className = 'reveal';
      p.textContent = l.reveal;
      edge.appendChild(p);
    }
  }
  box.appendChild(edge);
  return box;
}

function openInward() {
  if (!el.inwardPanel) return;
  if (aboutOpen) closeAbout();
  el.inwardBody.textContent = '';
  el.inwardBody.appendChild(inwardHTML());
  el.inwardPanel.hidden = false;
  el.inwardPanel.scrollTop = 0;
  inwardOpen = true;
  el.inwardClose.focus();
  afterInwardOpened();   /* 26-wiring */
  /* reading to the end is the second beat: the boundary, seen */
  if (inwardSeen) inwardSeen.disconnect();
  var edge = document.getElementById('inwardEdge');
  if (edge && window.IntersectionObserver) {
    inwardSeen = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) {
        inwardSeen.disconnect();
        setTimeout(function () { if (inwardOpen) afterInwardEnd(); }, 1200);
      }
    }, { root: el.inwardPanel, threshold: 0.6 });
    inwardSeen.observe(edge);
  }
}

function closeInward() {
  if (!el.inwardPanel) return;
  el.inwardPanel.hidden = true;
  inwardOpen = false;
  if (inwardSeen) inwardSeen.disconnect();
}

function setupInward() {
  if (!el.inwardPanel) return;
  el.inwardClose.addEventListener('click', closeInward);
  var b = document.getElementById('aboutInward');
  if (b) b.addEventListener('click', openInward);
}
