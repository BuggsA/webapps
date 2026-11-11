/* apps/ip/door/door.js — what every door page does, and the one thing each
 * door does differently (owner, 2026-11-11: "many doors", docs/ip-concept.md).
 *
 * A door is a small page for one search people make - "what is my IPv6",
 * "what is my ISP", "is this IP private" - answered at once, with the front
 * page and its map one link away. It loads ../js/01-address.js for parseIp
 * and ipToText (the same parser the app uses, so the two can never
 * disagree about what an address is) and nothing else from js/.
 *
 * The same evidence rule as the app: the edge's own answer, or nothing.
 * A fact whoami did not give is left out, never guessed, and no third party
 * is ever asked about the visitor's address. */

/* ── the visitor's own answer, from this site's own edge ─────────────── */

function doorWhoami() {
  return fetch('/whoami', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    });
}

function doorEl(id) { return document.getElementById(id); }

/* Fill a row of the facts list, or hide it if there is no fact for it. */
function doorRow(id, main, sub) {
  var row = doorEl(id);
  if (!row) return;
  if (!main) { row.hidden = true; return; }
  row.hidden = false;
  row.querySelector('.v').textContent = main;
  var s = row.querySelector('.sub');
  if (s) s.textContent = sub || '';
}

var DOOR_REGION = typeof Intl !== 'undefined' && Intl.DisplayNames
  ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

function doorPlace(w) {
  if (!w) return '';
  var country = '';
  if (w.country) {
    try { country = DOOR_REGION ? DOOR_REGION.of(w.country) : w.country; }
    catch (_) { country = w.country; }
  }
  var parts = [w.city, w.region];
  if (w.country && w.country !== 'US') parts.push(country);
  parts = parts.filter(function (p, i) { return p && parts.indexOf(p) === i; });
  return parts.join(', ') || country;
}

/* The big line: the answer itself. Long IPv6 text gets the smaller size. */
function doorBig(text, pending) {
  var b = doorEl('big');
  /* An IPv6 address may only wrap after a colon, never inside a group. */
  b.textContent = '';
  String(text).split(':').forEach(function (part, i) {
    if (i) { b.appendChild(document.createTextNode(':')); b.appendChild(document.createElement('wbr')); }
    b.appendChild(document.createTextNode(part));
  });
  b.classList.toggle('long', text.length > 22);
  b.classList.toggle('pending', !!pending);
}

function doorCopy(text) {
  var btn = doorEl('copy');
  if (!btn) return;
  btn.hidden = !text;
  btn.onclick = function () {
    function done() {
      btn.dataset.done = '1'; btn.textContent = 'Copied';
      setTimeout(function () { btn.dataset.done = ''; btn.textContent = 'Copy'; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    }
  };
}

/* ── what kind of address it is: the IANA special-purpose registries ──── */

/* Most specific first. [range, verdict, name, defined in, what it means].
 * verdict: 'private' - for use inside a network, never routed on the
 * internet; 'special' - reserved for something particular, neither private
 * nor public; 'public' - routed on the internet. Anything in no row is
 * public (IPv4) or reserved (IPv6, outside 2000::/3). */
var DOOR_RANGES = [
  ['0.0.0.0/8',        'special', '“This network”', 'RFC 791', 'Means “this host on this network”. Never a real destination.'],
  ['10.0.0.0/8',       'private', 'Private network', 'RFC 1918', 'For use inside homes, offices and data centres. The internet never routes it.'],
  ['100.64.0.0/10',    'special', 'Shared address space (carrier-grade NAT)', 'RFC 6598', 'Used by providers between their network and yours. If this is your router’s outside address, you share a public address with other customers.'],
  ['127.0.0.0/8',      'special', 'Loopback', 'RFC 1122', 'The machine talking to itself. It never leaves the device.'],
  ['169.254.0.0/16',   'special', 'Link-local', 'RFC 3927', 'What a device gives itself when nothing hands it an address. It only reaches the same cable or Wi-Fi.'],
  ['172.16.0.0/12',    'private', 'Private network', 'RFC 1918', 'For use inside homes, offices and data centres. The internet never routes it.'],
  ['192.0.0.0/24',     'special', 'IETF protocol assignments', 'RFC 6890', 'Reserved for particular protocols.'],
  ['192.0.2.0/24',     'special', 'Documentation (TEST-NET-1)', 'RFC 5737', 'For examples in books and manuals. Never used on a real network.'],
  ['192.88.99.0/24',   'special', 'Former 6to4 relay', 'RFC 7526', 'Once an IPv6 transition relay; deprecated.'],
  ['192.168.0.0/16',   'private', 'Private network', 'RFC 1918', 'The range most home routers use. The internet never routes it.'],
  ['198.18.0.0/15',    'special', 'Benchmarking', 'RFC 2544', 'For testing network equipment in a lab.'],
  ['198.51.100.0/24',  'special', 'Documentation (TEST-NET-2)', 'RFC 5737', 'For examples in books and manuals. Never used on a real network.'],
  ['203.0.113.0/24',   'special', 'Documentation (TEST-NET-3)', 'RFC 5737', 'For examples in books and manuals. Never used on a real network.'],
  ['224.0.0.0/4',      'special', 'Multicast', 'RFC 5771', 'One sender, many receivers. Not an address any single device has.'],
  ['255.255.255.255/32','special','Broadcast', 'RFC 919', 'Everyone on this network at once.'],
  ['240.0.0.0/4',      'special', 'Reserved', 'RFC 1112', 'Set aside for future use since 1989, and still not used.'],

  ['::/128',           'special', 'Unspecified', 'RFC 4291', 'Means “no address yet”.'],
  ['::1/128',          'special', 'Loopback', 'RFC 4291', 'The machine talking to itself. It never leaves the device.'],
  ['64:ff9b::/96',     'special', 'NAT64', 'RFC 6052', 'An IPv4 address dressed as IPv6, for networks that translate between them.'],
  ['100::/64',         'special', 'Discard', 'RFC 6666', 'Traffic sent here is thrown away on purpose.'],
  ['2001::/32',        'special', 'Teredo', 'RFC 4380', 'An old way of tunnelling IPv6 through IPv4.'],
  ['2001:db8::/32',    'special', 'Documentation', 'RFC 3849', 'For examples in books and manuals. Never used on a real network.'],
  ['3fff::/20',        'special', 'Documentation', 'RFC 9637', 'For examples in books and manuals. Never used on a real network.'],
  ['2002::/16',        'special', '6to4', 'RFC 3056', 'An old way of carrying IPv6 inside IPv4.'],
  ['fc00::/7',         'private', 'Unique local address', 'RFC 4193', 'IPv6’s private range, for use inside a network. The internet never routes it.'],
  ['fe80::/10',        'special', 'Link-local', 'RFC 4291', 'Every IPv6 device has one. It only reaches the same cable or Wi-Fi.'],
  ['ff00::/8',         'special', 'Multicast', 'RFC 4291', 'One sender, many receivers. Not an address any single device has.']
].map(function (r) {
  var c = parseCidr(r[0]);
  return { net: c.net, len: c.len, v: c.v, bits: c.bits,
           verdict: r[1], name: r[2], ref: r[3], note: r[4], range: r[0] };
});

function doorClassify(a) {
  /* An IPv4 address written as IPv6 (::ffff:192.168.1.1) is that IPv4
   * address, and is judged as one. */
  if (a.v === 6 && (a.big >> 32n) === 0xffffn) {
    var four = parseIp(ipToText(a.big & 0xffffffffn, 4));
    var k = doorClassify(four);
    k.mapped = four.text;
    return k;
  }
  var best = null;
  DOOR_RANGES.forEach(function (r) {
    if (r.v !== a.v) return;
    var host = BigInt(r.bits - r.len);
    if ((a.big >> host) << host !== r.net) return;
    if (!best || r.len > best.len) best = r;
  });
  if (best) return { verdict: best.verdict, name: best.name, ref: best.ref,
                     note: best.note, range: best.range };
  if (a.v === 6 && (a.big >> 125n) !== 1n) {
    return { verdict: 'special', name: 'Reserved', ref: 'RFC 4291',
             note: 'Outside the part of IPv6 handed out so far (2000::/3).', range: '' };
  }
  return { verdict: 'public', name: a.v === 6 ? 'Global unicast' : 'Public',
           ref: a.v === 6 ? 'RFC 4291' : '',
           note: 'Routed on the internet. Somewhere, a network announces it.', range: '' };
}

/* ── the doors ───────────────────────────────────────────────────────── */

var DOORS = {};

DOORS.ipv6 = function () {
  doorWhoami().then(function (d) {
    var a = parseIp(d && d.ip);
    if (!a) throw new Error('no address');
    doorRow('rowNet', d.net && d.net.org, d.net && d.net.asn ? 'AS' + d.net.asn : '');
    doorRow('rowWhere', doorPlace(d.where), '');
    if (a.v === 6) {
      var k = doorClassify(a);
      doorBig(a.text);
      doorCopy(a.text);
      doorEl('verdict').textContent = 'Yes. This visit reached us over IPv6.';
      doorRow('rowKind', k.name, k.ref);
      doorRow('rowOther', '', '');
    } else {
      doorBig('Not seen', true);
      doorCopy('');
      doorEl('verdict').textContent =
        'This visit reached us over IPv4, not IPv6. Your network may not ' +
        'have IPv6, or your device chose IPv4 this time.';
      doorRow('rowKind', '', '');
      doorRow('rowOther', a.text, 'This visit’s IPv4 address');
    }
  }).catch(function () {
    doorBig('Not available', true);
    doorEl('verdict').textContent =
      'This page could not read your address from its own edge, and it will not ask anyone else for it.';
  });
};

DOORS.isp = function () {
  doorWhoami().then(function (d) {
    var a = parseIp(d && d.ip);
    if (!a) throw new Error('no address');
    var org = d.net && d.net.org;
    doorBig(org || 'Not known', !org);
    doorCopy(org || '');
    doorEl('verdict').textContent = org
      ? 'The network this visit arrived from, as our own edge names it.'
      : 'Our edge did not name the network this visit came from, so this page will not guess.';
    doorRow('rowAsn', d.net && d.net.asn ? 'AS' + d.net.asn : '',
            'Its autonomous system number');
    doorRow('rowAddr', a.text, a.v === 6 ? 'IPv6' : 'IPv4');
    doorRow('rowWhere', doorPlace(d.where), 'Where the network is, approximately');
  }).catch(function () {
    doorBig('Not available', true);
    doorEl('verdict').textContent =
      'This page could not read your address from its own edge, and it will not ask anyone else for it.';
  });
};

DOORS.private = function () {
  var form = doorEl('check'), input = doorEl('q');
  var VERDICT = { private: 'Private', public: 'Public', special: 'Special-use' };
  function show(text, mine) {
    var raw = String(text || '').trim().replace(/%.*$/, '');   /* fe80::1%eth0 */
    var slash = raw.indexOf('/');
    if (slash >= 0) raw = raw.slice(0, slash);
    var a = parseIp(raw);
    if (!a) {
      doorBig('Not an address', true);
      doorEl('verdict').textContent =
        'That does not read as an IPv4 or IPv6 address. Try something like 192.168.1.10 or fd00::1.';
      ['rowRange', 'rowRef', 'rowRoute'].forEach(function (r) { doorRow(r, ''); });
      return;
    }
    var k = doorClassify(a);
    doorBig(VERDICT[k.verdict], false);
    doorEl('verdict').textContent =
      (mine ? 'Your address, ' : '') + a.text +
      (k.mapped ? ' (the IPv4 address ' + k.mapped + ')' : '') + (mine ? ',' : '') +
      (k.verdict === 'private' ? ' is private. '
       : k.verdict === 'public' ? ' is public. '
       : ' is neither private nor public. ') + k.note;
    doorRow('rowRange', k.name, k.range);
    doorRow('rowRef', k.ref, k.ref ? 'Where it is defined' : '');
    doorRow('rowRoute', k.verdict === 'public' ? 'Yes' : 'No',
            k.verdict === 'public' ? 'Reachable across the internet'
                                   : 'Not routed across the public internet');
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    show(input.value, false);
    var u = new URL(location.href);
    u.searchParams.set('q', input.value.trim());
    history.replaceState(null, '', u);
  });
  var q = new URLSearchParams(location.search).get('q');
  if (q) { input.value = q; show(q, false); return; }
  /* Nothing asked yet: answer for the visitor's own address. */
  doorWhoami().then(function (d) {
    if (input.value) return;
    var a = parseIp(d && d.ip);
    if (!a) throw new Error('no address');
    input.value = a.text;
    show(a.text, true);
  }).catch(function () {
    if (input.value) return;
    doorBig('Ask about one', true);
    doorEl('verdict').textContent = 'Type an address above to check it.';
  });
};

/* ── shared by the two reference doors ──────────────────────────────── */

/* A count of addresses, readable at any size: exact with commas while it
 * fits in a sentence, and as a power of two once it does not. */
function doorCount(n, hostBits) {
  if (hostBits <= 48) return group(n.toString());
  var s = n.toString();
  return '2^' + hostBits + ' (about ' + s[0] + '.' + s.slice(1, 3) +
         ' × 10^' + (s.length - 1) + ')';
}

/* "Copy link": a result you can send is a result somebody can link to,
 * which is the whole point of these two pages (owner, 2026-11-11: "for
 * backlinks and seo"). Copies the canonical address with the question in
 * it, so the link opens on the same answer. */
function doorShare(btnId, params) {
  var btn = doorEl(btnId);
  if (!btn) return;
  btn.hidden = false;
  btn.onclick = function () {
    var u = new URL(location.pathname, 'https://iphere.app');
    Object.keys(params).forEach(function (k) { if (params[k]) u.searchParams.set(k, params[k]); });
    var text = u.toString();
    history.replaceState(null, '', location.pathname + u.search);
    function done() {
      btn.dataset.done = '1'; btn.textContent = 'Link copied';
      setTimeout(function () { btn.dataset.done = ''; btn.textContent = 'Copy link'; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    }
  };
}

function hex4(n) { return Number(n).toString(16); }
function hex4pad(n) { return ('000' + Number(n).toString(16)).slice(-4); }

/* ── IPv4 vs IPv6 ─────────────────────────────────────────────────────── */

/* (2026-11-11, from the list in docs/ip-concept.md.) Which of the two this
 * visit actually used, from our own edge, above a converter and a plain
 * comparison. The converter is v2's best unbuilt egg, as a tool: your IPv4
 * address already exists inside IPv6, at addresses anyone can compute -
 * pure arithmetic, defined by RFCs, nothing asked of anybody. */
function doorConvert(text) {
  var raw = String(text || '').trim().replace(/%.*$/, '').replace(/\/\d+$/, '');
  var a = parseIp(raw), rows = {};
  if (!a) return null;
  if (a.v === 4) {
    var hi = (a.big >> 16n) & 0xffffn, lo = a.big & 0xffffn;
    rows.rowMapped = ['::ffff:' + a.text, '::ffff:' + hex4(hi) + ':' + hex4(lo) +
                      ' - IPv4-mapped IPv6, how a dual-stack system writes an IPv4 peer (RFC 4291)'];
    rows.rowNat64 = ['64:ff9b::' + a.text, '64:ff9b::' + hex4(hi) + ':' + hex4(lo) +
                     ' - NAT64, how an IPv6-only network reaches this address (RFC 6052)'];
    rows.row6to4 = ['2002:' + hex4(hi) + ':' + hex4(lo) + '::/48',
                    '6to4, the old tunnelling scheme, now deprecated (RFC 3056)'];
    rows.rowInt = [group(a.big.toString()), 'The same address as one number'];
    return { a: a, rows: rows, title: 'IPv4' };
  }
  var full = [], i;
  for (i = 7; i >= 0; i--) full.push(hex4pad((a.big >> BigInt(i * 16)) & 0xffffn));
  rows.rowFull = [full.join(':'), 'Written out in full: eight groups of four'];
  rows.rowShort = [a.text, 'The shortest standard form (RFC 5952)'];
  var four = function (x) { return ipToText(x & 0xffffffffn, 4); };
  if ((a.big >> 32n) === 0xffffn) rows.rowEmbedded = [four(a.big), 'IPv4-mapped: this IS an IPv4 address'];
  else if ((a.big >> 32n) === (0x64ff9bn << 64n)) rows.rowEmbedded = [four(a.big), 'NAT64: the IPv4 address inside it'];
  else if ((a.big >> 112n) === 0x2002n) rows.rowEmbedded = [four(a.big >> 80n), '6to4: the IPv4 address of the tunnel end'];
  return { a: a, rows: rows, title: 'IPv6' };
}

DOORS.vs = function () {
  var ALL = ['rowMapped', 'rowNat64', 'row6to4', 'rowInt', 'rowFull', 'rowShort', 'rowEmbedded'];
  var form = doorEl('check'), input = doorEl('q');
  function convert(text, mine) {
    var r = doorConvert(text);
    ALL.forEach(function (id) { doorRow(id, ''); });
    if (!r) {
      doorEl('convNote').textContent = 'That does not read as an IPv4 or IPv6 address. Try 192.0.2.1 or 2001:db8::1.';
      return;
    }
    doorEl('convNote').textContent = (mine ? 'Your address, ' : '') + r.a.text + ', an ' + r.title +
      ' address' + (r.a.v === 4 ? ', as it appears inside IPv6:' : ':');
    Object.keys(r.rows).forEach(function (id) {
      doorRow(id, r.rows[id][0], r.rows[id][1]);
      /* an IPv6 address may only wrap after a colon, never inside a group */
      var v = doorEl(id).querySelector('.v'), t = v.textContent;
      if (t.indexOf(':') < 0) return;
      v.textContent = '';
      t.split(':').forEach(function (part, i) {
        if (i) { v.appendChild(document.createTextNode(':')); v.appendChild(document.createElement('wbr')); }
        v.appendChild(document.createTextNode(part));
      });
    });
    doorShare('share', { q: r.a.text });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    convert(input.value, false);
    var u = new URL(location.href);
    u.searchParams.set('q', input.value.trim());
    history.replaceState(null, '', u);
  });
  var q = new URLSearchParams(location.search).get('q');
  if (q) { input.value = q; convert(q, false); }
  doorWhoami().then(function (d) {
    var a = parseIp(d && d.ip);
    if (!a) throw new Error('no address');
    doorBig(a.v === 6 ? 'IPv6' : 'IPv4');
    doorEl('verdict').textContent = a.v === 6
      ? 'This visit reached us over IPv6, the newer of the two.'
      : 'This visit reached us over IPv4. Your network may not have IPv6, or your device chose IPv4 this time.';
    doorRow('rowAddr', a.text, 'This visit’s address');
    doorCopy(a.text);
    doorRow('rowNet', d.net && d.net.org, d.net && d.net.asn ? 'AS' + d.net.asn : '');
    if (!q) { input.value = a.text; convert(a.text, true); }
  }).catch(function () {
    doorBig('Not available', true);
    doorEl('verdict').textContent =
      'This page could not read your address from its own edge, and it will not ask anyone else for it.';
    if (!q) { input.value = '192.0.2.1'; convert('192.0.2.1', false); }
  });
};

/* ── CIDR / subnet calculator ─────────────────────────────────────────── */

/* (2026-11-11, from the list in docs/ip-concept.md.) Pure arithmetic in
 * the browser, with the same parser the app uses: nothing typed here is
 * sent anywhere. It reads the four ways people actually write a block:
 *   192.168.1.0/24          CIDR
 *   192.168.1.7             one address
 *   192.168.1.0 255.255.255.0   an address and a netmask
 *   10.0.0.0 - 10.0.3.255   a range, turned into the fewest CIDR blocks */

function maskLen(text) {
  var m = parseIp(text);
  if (!m || m.v !== 4) return -1;
  var x = m.big, len = 0, i;
  for (i = 31; i >= 0; i--) {
    if ((x >> BigInt(i)) & 1n) { if (len !== 31 - i) return -1; len++; }
  }
  return len;
}

/* The fewest CIDR blocks that exactly cover lo..hi. Capped: a range can
 * need up to 2 x bits blocks, and nothing sane needs more than a page. */
function rangeToCidrs(lo, hi, bits) {
  var out = [];
  while (lo <= hi && out.length < 256) {
    var k = 0;
    while (k < bits && ((lo >> BigInt(k)) & 1n) === 0n &&
           lo + (1n << BigInt(k + 1)) - 1n <= hi) k++;
    out.push({ net: lo, len: bits - k });
    lo += 1n << BigInt(k);
  }
  return out;
}

function cidrInput(text) {
  var raw = String(text || '').trim().replace(/[–—]/g, '-');
  var m = raw.match(/^(\S+)\s*-\s*(\S+)$/);
  if (m) {
    var x = parseIp(m[1]), y = parseIp(m[2]);
    if (!x || !y || x.v !== y.v) return null;
    if (x.big > y.big) { var t = x; x = y; y = t; }
    return { range: true, v: x.v, bits: x.bits, lo: x.big, hi: y.big,
             list: rangeToCidrs(x.big, y.big, x.bits) };
  }
  m = raw.match(/^(\S+?)(?:\s+|\/)(\d+\.\d+\.\d+\.\d+)$/);
  if (m) {
    var len = maskLen(m[2]);
    if (len < 0 || !parseIp(m[1])) return null;
    raw = m[1] + '/' + len;
  }
  raw = raw.replace(/\s+/g, '');
  if (raw.indexOf('/') < 0) {
    var bare = parseIp(raw);
    if (bare) raw += '/' + bare.bits;
  }
  var c = parseCidr(raw);
  if (!c) return null;
  return { range: false, c: c, typed: parseIp(raw.split('/')[0]), raw: raw };
}

DOORS.cidr = function () {
  var form = doorEl('check'), input = doorEl('q'), split = doorEl('split');
  var ROWS = ['rowFirst', 'rowLast', 'rowCount', 'rowUsable', 'rowMask', 'rowWild',
              'rowBin', 'rowKind', 'rowBlocks'];
  var cur = null;

  function binary(c) {
    var row = doorEl('rowBin');
    if (c.v !== 4) { row.hidden = true; return; }
    row.hidden = false;
    var v = row.querySelector('.v'), bits = '', i;
    for (i = 31; i >= 0; i--) bits += (c.net >> BigInt(i)) & 1n ? '1' : '0';
    v.textContent = '';
    for (i = 0; i < 32; i += 8) {
      var oct = bits.slice(i, i + 8);
      for (var j = 0; j < 8; j++) {
        var sp = document.createElement('span');
        sp.className = i + j < c.len ? 'net' : 'host';
        sp.textContent = oct[j];
        v.appendChild(sp);
      }
      if (i < 24) v.appendChild(document.createTextNode('.'));
    }
    row.querySelector('.sub').textContent = c.len === 32
      ? 'All 32 bits fixed: one address'
      : 'The first ' + c.len + ' bits are the network; the other ' + (32 - c.len) + ' are hosts';
  }

  function fillSplit(c) {
    split.textContent = '';
    var none = document.createElement('option');
    none.value = ''; none.textContent = 'Split it into…';
    split.appendChild(none);
    for (var l = c.len + 1; l <= Math.min(c.len + 8, c.bits); l++) {
      var o = document.createElement('option');
      o.value = String(l);
      o.textContent = (1 << (l - c.len)) + ' × /' + l;
      split.appendChild(o);
    }
    split.parentNode.hidden = c.len >= c.bits;
    doorEl('subnets').textContent = '';
  }

  function showSplit(len) {
    var box = doorEl('subnets');
    box.textContent = '';
    if (!cur || !len) return;
    var n = 1 << (len - cur.len), size = 1n << BigInt(cur.bits - len), i;
    var tb = document.createElement('table');
    for (i = 0; i < n; i++) {
      var net = cur.net + BigInt(i) * size, tr = document.createElement('tr');
      var a = document.createElement('td'), b = document.createElement('td');
      a.textContent = ipToText(net, cur.v) + '/' + len;
      b.textContent = ipToText(net, cur.v) + ' – ' + ipToText(net + size - 1n, cur.v);
      tr.appendChild(a); tr.appendChild(b); tb.appendChild(tr);
    }
    box.appendChild(tb);
  }

  function show(text, example) {
    var r = cidrInput(text);
    ROWS.forEach(function (id) { doorRow(id, ''); });
    cur = null;
    if (!r) {
      doorBig('Not a range', true);
      doorEl('verdict').textContent =
        'Try 192.168.1.0/24, 10.0.0.0 255.255.252.0, 10.0.0.0 - 10.0.5.255 or 2001:db8::/48.';
      split.parentNode.hidden = true; doorEl('subnets').textContent = '';
      doorCopy(''); return;
    }
    if (r.range) {
      var bl = r.list.map(function (x) { return ipToText(x.net, r.v) + '/' + x.len; });
      doorBig(bl.length === 1 ? bl[0] : bl.length + ' blocks', false);
      doorEl('verdict').textContent = ipToText(r.lo, r.v) + ' – ' + ipToText(r.hi, r.v) +
        (bl.length === 1 ? ' is exactly one CIDR block.'
                         : ' is not one block. These are the fewest CIDR blocks that cover it exactly:');
      doorRow('rowBlocks', bl.join('  ·  '), '');
      doorRow('rowCount', doorCount(r.hi - r.lo + 1n, r.bits), '');
      split.parentNode.hidden = true; doorEl('subnets').textContent = '';
      doorCopy(bl.join(', '));
      doorShare('share', { q: ipToText(r.lo, r.v) + ' - ' + ipToText(r.hi, r.v) });
      return;
    }
    var c = r.c, hostBits = c.bits - c.len;
    var size = 1n << BigInt(hostBits), last = c.net + size - 1n;
    var netText = ipToText(c.net, c.v) + '/' + c.len;
    cur = c;
    doorBig(netText, false);
    doorEl('verdict').textContent =
      (example ? 'An example. Type any block, address, netmask or range above. ' : '') +
      (r.typed && r.typed.big !== c.net
        ? r.raw + ' has host bits set; the block it sits in is ' + netText + '.'
        : 'IPv' + c.v + ', a /' + c.len + ': ' + doorCount(size, hostBits) +
          (size === 1n ? ' address.' : ' addresses.'));
    doorRow('rowFirst', ipToText(c.net, c.v), 'The network address');
    doorRow('rowLast', ipToText(last, c.v), c.v === 4 && hostBits > 1 ? 'The broadcast address' : '');
    doorRow('rowCount', doorCount(size, hostBits), '');
    if (c.v === 4) {
      var usable = hostBits === 0 ? 1n : hostBits === 1 ? 2n : size - 2n;
      doorRow('rowUsable', group(usable.toString()),
              hostBits === 1 ? 'Point-to-point link, RFC 3021'
              : hostBits === 0 ? 'A single host'
              : ipToText(c.net + 1n, 4) + ' – ' + ipToText(last - 1n, 4));
      doorRow('rowMask', ipToText(((1n << 32n) - 1n) ^ (size - 1n), 4), '');
      doorRow('rowWild', ipToText(size - 1n, 4), 'Used in ACLs and OSPF');
    }
    binary(c);
    var k = doorClassify({ v: c.v, big: c.net, bits: c.bits, text: ipToText(c.net, c.v) });
    doorRow('rowKind', k.name, k.range ? k.range + (k.ref ? ', ' + k.ref : '') : k.ref);
    doorCopy(netText);
    fillSplit(c);
    doorShare('share', { q: netText });
  }

  split.addEventListener('change', function () {
    showSplit(+split.value);
    var u = new URL(location.href);
    if (split.value) u.searchParams.set('split', split.value); else u.searchParams.delete('split');
    history.replaceState(null, '', u);
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    show(input.value, false);
    var u = new URL(location.href);
    u.searchParams.set('q', input.value.trim());
    u.searchParams.delete('split');
    history.replaceState(null, '', u);
  });
  var sp = new URLSearchParams(location.search), q = sp.get('q');
  if (q) {
    input.value = q; show(q, false);
    var sl = sp.get('split');
    if (sl && cur && split.querySelector('option[value="' + (+sl) + '"]')) { split.value = String(+sl); showSplit(+sl); }
    return;
  }
  input.value = '192.168.1.0/24';
  show(input.value, true);
};

(function () {
  var which = document.body.getAttribute('data-door');
  if (DOORS[which]) DOORS[which]();
})();
