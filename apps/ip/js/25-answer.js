/* apps/ip/js/25-answer.js — the answer: address, facts row, Explore, Copy, About, notebook panel.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* WHERE THE EDGE THINKS YOU ARE (owner's request, 2026-11-11).
 *
 * Both hosts' edges already work out a rough place for every connection
 * from their own GeoIP data — CloudFront's viewer headers, Cloudflare's
 * request.cf — and whoami hands it back with the address. Nobody else is
 * asked, which is what keeps this inside "the address comes only from our
 * own edge".
 *
 * It is the place of the NETWORK, not the person: a mobile carrier can put
 * you a city away and a VPN a country away. So its label says "approx."
 * and the note under the facts row says so plainly. It informs; it
 * does not dramatise (PRODUCT_SOUL §8.5 - no "we know where you are").
 * Text only: the field still draws no geography of any kind. */
function countryName(code) {
  if (!code) return '';
  try {
    if (window.Intl && Intl.DisplayNames) {
      return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
    }
  } catch (_) {}
  return code;
}

function placeText(w) {
  if (!w) return null;
  var city = w.city || '', region = w.region || '';
  var country = countryName(w.country);
  /* a city-state reports itself twice, and "Zürich, Zurich" is the same
   * name spelled two ways; neither says anything the first word did not */
  function same(x, y) {
    return x.localeCompare(y, 'en', { sensitivity: 'base' }) === 0;
  }
  if (city && region && same(city, region)) region = '';
  if (city && country && same(city, country)) country = '';
  if (region && country && same(region, country)) country = '';
  var value;
  if (city) value = city + (region ? ', ' + region : '');
  else if (region) value = region;
  else if (country) { value = country; country = ''; }
  else return null;
  return { value: value, sub: country };
}

/* THE FACTS ROW — useful first (owner, 2026-11-11: "It should be an
 * exploration type of thing but it should be useful first before
 * anything"). What a person opens a what's-my-IP page to learn, in one
 * glance under the address: roughly where, through whom, and which
 * internet. Every one of them is read by our own edge for this visit.
 * A fact the edge did not give is left out, never guessed. */
function showFacts() {
  if (!el.facts) return;
  var h = S.home;
  el.facts.hidden = !h;
  el.whereNote.hidden = true;
  if (!h) { el.explore.hidden = true; return; }

  var t = placeText(S.where);
  el.factWhere.hidden = !t;
  el.wherePlace.textContent = t ? t.value : '';
  el.whereSub.textContent = t ? t.sub : '';

  var n = S.edgeNet;
  el.factNet.hidden = !n;
  el.netName.textContent = n ? (n.org || 'AS' + n.asn) : '';
  el.netSub.textContent = (n && n.org && n.asn) ? 'Network AS' + n.asn : '';

  el.kindName.textContent = h.v === 6 ? 'IPv6' : 'IPv4';
  el.kindSub.textContent = h.v === 6
    ? '128-bit · the newer, far larger internet'
    : '32-bit · the original internet';

  if (t || n) {
    el.whereNote.hidden = false;
    el.whereNote.textContent =
      'Approximate, read by this site’s own edge for this visit. Not kept.';
  }
  syncExplore();
  fitSoon();
}

/* The doorway is offered whenever there is a picture to go into. The
 * how-to under it goes once the visitor has moved the axis themselves:
 * after that they know, and it would only be noise. */
function syncExplore() {
  if (!el.explore) return;
  el.explore.hidden = !(S.home && R);
  var moved = S.gone !== null && S.gone > 0.02;
  var touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
  el.exploreHow.textContent = moved ? '' :
    (touch ? 'or drag up to zoom out yourself'
           : 'or scroll down, or drag up, to zoom out yourself');
}

/* NOTHING COVERS THE AMBER MARK. At home it sits at the world origin, so
 * its place on screen is computed, not assumed. Percentages could not do
 * this: a 1280x620 laptop and a 320px phone each put Explore straight
 * through it. So measure: if the answer reaches the mark, slide it up into
 * the empty sky first, and drop the secondary lines only if that is not
 * enough.
 * Called on load and resize only - never per frame, and never moves the
 * camera; it moves text out of the camera's way. */
var fitTimer = 0;

function fitAnswer() {
  var box = document.getElementById('answer');
  if (!box) return;
  box.classList.remove('tight');
  box.style.top = '';
  if (!R || !S.home || document.body.dataset.state !== 'home') return;
  var sp = toScreen(viewProj(), 0, 0, 0);
  if (!sp) return;
  var limit = sp.y - 26;
  /* the empty sky above the address is spent first; the secondary lines
   * only go when there is no more sky to spend */
  var ceiling = Math.max(16, S.H * 0.07);
  function lift() {
    var r = box.getBoundingClientRect();
    var over = r.bottom - limit;
    if (over <= 0) return true;
    var up = Math.min(over, Math.max(0, r.top - ceiling));
    if (up > 0) box.style.top = ((r.top + r.bottom) / 2 - up) + 'px';
    return over - up <= 0;
  }
  if (lift()) return;
  box.style.top = '';
  box.classList.add('tight');
  lift();
}

function fitSoon() {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(fitAnswer, 60);
}

/* An AS number with no name - CloudFront gives only the number. The name
 * is asked of RIPEstat by that number alone; the address is not sent, so
 * staying on the answer still sends your address to nobody. */
function nameEdgeNet() {
  var n = S.edgeNet;
  if (!n || n.org || !(n.asn > 0)) return;
  ripe('as-overview', 'AS' + n.asn).then(function (o) {
    var hName = tidyHolder(o && o.holder);
    if (hName && S.edgeNet === n) { n.org = hName; showFacts(); syncDom(); }
  }).catch(function () {});
}

function showAddress() {
  if (S.home && S.aim === null) S.aim = S.home.big;
  showFacts();
  nameEdgeNet();
  if (S.home) {
    el.addressText.textContent = S.home.text;
    el.address.style.setProperty('--addr-chars', S.home.text.length);
    el.address.classList.remove('is-pending');
    el.answerNote.textContent = '';
    el.copy.hidden = false;
    document.title = S.home.text + ' — what’s my IP';
    /* The cold open, once the address is up and never before it. It fires
     * at rank 1 so the cadence does not swallow the one line that has to
     * land. Content is deferred, so it only speaks if it is already here -
     * nothing waits on him. */
    loadContent();
  } else {
    el.addressText.textContent = 'Not available';
    el.address.classList.add('is-pending');
    el.copy.hidden = true;
    el.answerNote.textContent =
      'This page could not read your address from its own edge, and it will ' +
      'not ask anyone else for it.';
    say('Your address could not be read.');
  }
  rebuild();
}

function loadAddress() {
  var fixture = new URLSearchParams(location.search).get('ip');
  if (fixture) {
    var f = parseIp(fixture);
    if (f) {
      S.home = f; S.source = 'fixture';
      /* &where=City,Region,CC — for previewing the location line, which
       * only a deployed edge can otherwise produce */
      var qs = new URLSearchParams(location.search);
      var fw = qs.get('where');
      if (fw) {
        var parts = fw.split(',');
        S.where = { city: parts[0] || '', region: parts[1] || '',
                    country: parts[2] || '' };
      }
      /* &asn=7922&org=Comcast — the provider, likewise */
      var fa = parseInt(qs.get('asn'), 10), fo = qs.get('org') || '';
      if (fa > 0 || fo) S.edgeNet = { asn: fa > 0 ? fa : 0, org: fo };
      showAddress(); return;
    }
  }
  var settled = false;
  function give(addr, src, where, net) {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    S.home = addr || null;
    S.source = addr ? src : '';
    S.where = (addr && where && typeof where === 'object') ? where : null;
    S.edgeNet = (addr && net && typeof net === 'object' &&
                 (net.asn > 0 || net.org))
      ? { asn: net.asn > 0 ? net.asn : 0, org: net.org ? String(net.org) : '' }
      : null;
    showAddress();
  }
  var timer = setTimeout(function () { give(null, ''); }, 4000);
  fetch('whoami', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      var ct = r.headers.get('content-type') || '';
      return ct.indexOf('json') >= 0 ? r.json()
           : r.text().then(function (t) { return { ip: t.trim() }; });
    })
    .then(function (d) { give(parseIp(d && d.ip), 'edge', d && d.where, d && d.net); })
    .catch(function () { give(null, ''); });
}

function setupCopy() {
  el.copy.addEventListener('click', function () {
    if (!S.home) return;
    var txt = S.home.text;
    function done() {
      el.copy.dataset.done = '1';
      el.copy.textContent = 'Copied';
      say('Copied ' + txt);
      setTimeout(function () {
        el.copy.dataset.done = ''; el.copy.textContent = 'Copy';
      }, 1800);
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = txt; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); }
      catch (_) { say('Copying failed. The address is ' + txt + '.'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, fallback);
    } else fallback();
  });
}

/* Built on open, never kept warm: it is a page of numbers that only
 * matter when somebody is looking at them. */
function openNote() {
  /* the logbook sizes itself against the registry, so opening it is a
   * reason to fetch one. Harmless if it is already here or already on its
   * way -- loadRegistry guards itself. */
  loadRegistry();
  loadContent();
  if (regState === 'loading') {
    var wait = setInterval(function () {
      if (regState === 'loading') return;
      clearInterval(wait);
      if (!el.notePanel.hidden) buildNotebook();
    }, 120);
  }
  buildNotebook();
  el.notePanel.hidden = false;
  el.notebook.setAttribute('aria-expanded', 'true');
  el.noteClose.focus();
}

function closeNote() {
  el.notePanel.hidden = true;
  el.notebook.setAttribute('aria-expanded', 'false');
  el.notebook.focus();
}

function aboutHTML() {
  /* The page asks for `whoami` relative to itself, so the curl line is
   * derived the same way: /ip/whoami on AWS, /whoami on Cloudflare Pages. */
  var whoPath = location.pathname.replace(/[^\/]*$/, '')
    .replace(/[^A-Za-z0-9\/._~-]/g, '') + 'whoami';
  return [
    '<h2>What this page does</h2>',
    '<p>It shows your public IP address. If you move the view, it shows the ',
    'block that address is actually announced inside, and the network that ',
    'announces it.</p>',

    '<h3>What it asks for</h3>',
    '<p>Arriving, copying and leaving talks to nobody but this site’s own ',
    'edge, which reads your address from the connection itself. No ',
    'third-party address lookup is used at any point — your address is ',
    'never handed to someone else to find out what it is.</p>',
    '<p>The location and internet provider under your address come from ',
    'that same edge, which estimates them for every connection it serves. ',
    'The location is where your network appears to be, not where you are: ',
    'a phone carrier or a VPN can put it a city or a country away. Both are ',
    'shown to you and not kept. Where the edge knows only your network’s ',
    'number, its name is looked up by that number alone — never by your ',
    'address.</p>',
    '<p>Only once you move outward, the block and the network are looked up ',
    'against <a href="https://stat.ripe.net/" rel="noopener">RIPEstat</a>, ',
    'the RIPE NCC’s public data service. Moving outward sends your address ',
    'to RIPE. Staying on the answer does not.</p>',

    '<h3>What it keeps</h3>',
    '<p>No account, no cookies for product behaviour, no advertising, no ',
    'analytics. Public routing answers are cached in this browser’s local ',
    'storage so the same lookup is not repeated; that is public data about ',
    'networks, not a history of you.</p>',

    '<h3>For scripts</h3>',
    '<p>Anything that is not asking for JSON gets the address as plain text ',
    'and nothing else:</p>',
    '<p class="mono">curl https://<span class="dim">&lt;this host&gt;</span>' + whoPath + '</p>',

    '<div class="plate">',
    '<p>Routing data by courtesy of the RIPE NCC, from RIPEstat.</p>',
    '<p>Drawn with WebGL2 where the browser has it, and with Canvas 2D ',
    'where it does not. Neither is needed to tell you your address.</p>',
    '</div>'
  ].join('');
}

var aboutOpen = false;

function openAbout() {
  if (!el.aboutBody.dataset.built) {
    el.aboutBody.innerHTML = aboutHTML();
    el.aboutBody.dataset.built = '1';
  }
  el.aboutPanel.hidden = false;
  el.about.setAttribute('aria-expanded', 'true');
  aboutOpen = true;
  el.aboutClose.focus();
}

function closeAbout() {
  el.aboutPanel.hidden = true;
  el.about.setAttribute('aria-expanded', 'false');
  aboutOpen = false;
  el.about.focus();
}
