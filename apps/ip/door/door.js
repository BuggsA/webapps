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

/* IPv4 vs IPv6 (2026-11-11, from the list in docs/ip-concept.md): which of
 * the two this visit actually used, from our own edge, above a plain
 * comparison. The only fact about the visitor is the one whoami gave. */
DOORS.vs = function () {
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
  }).catch(function () {
    doorBig('Not available', true);
    doorEl('verdict').textContent =
      'This page could not read your address from its own edge, and it will not ask anyone else for it.';
  });
};

/* A count of addresses, readable at any size: exact with commas while it
 * fits in a sentence, and as a power of two once it does not. */
function doorCount(n, hostBits) {
  if (hostBits <= 48) return group(n.toString());
  var s = n.toString();
  return '2^' + hostBits + ' (about ' + s[0] + '.' + s.slice(1, 3) +
         ' × 10^' + (s.length - 1) + ')';
}

/* CIDR calculator (2026-11-11, from the list in docs/ip-concept.md). Pure
 * arithmetic in the browser, with the same parser the app uses: nothing
 * typed here is sent anywhere. */
DOORS.cidr = function () {
  var form = doorEl('check'), input = doorEl('q');
  var ROWS = ['rowFirst', 'rowLast', 'rowCount', 'rowUsable',
              'rowMask', 'rowWild', 'rowKind'];
  function show(text, example) {
    var raw = String(text || '').trim().replace(/\s+/g, '');
    if (raw.indexOf('/') < 0) {
      var bare = parseIp(raw);
      if (bare) raw += '/' + bare.bits;
    }
    var c = parseCidr(raw);
    if (!c) {
      doorBig('Not a range', true);
      doorEl('verdict').textContent =
        'Type an address and a prefix length, like 192.168.1.0/24 or 2001:db8::/48.';
      ROWS.forEach(function (r) { doorRow(r, ''); });
      return;
    }
    var hostBits = c.bits - c.len;
    var size = 1n << BigInt(hostBits);
    var last = c.net + size - 1n;
    var netText = ipToText(c.net, c.v) + '/' + c.len;
    var typed = parseIp(raw.split('/')[0]);
    doorBig(netText, false);
    doorEl('verdict').textContent =
      (example ? 'An example. Type any range above. ' : '') +
      (typed && typed.big !== c.net
        ? raw + ' has host bits set; the block it sits in is ' + netText + '.'
        : 'IPv' + c.v + ', a /' + c.len + ': ' + doorCount(size, hostBits) +
          (size === 1n ? ' address.' : ' addresses.'));
    doorRow('rowFirst', ipToText(c.net, c.v), 'The network address');
    doorRow('rowLast', ipToText(last, c.v), '');
    doorRow('rowCount', doorCount(size, hostBits), '');
    if (c.v === 4) {
      var usable = hostBits === 0 ? 1n : hostBits === 1 ? 2n : size - 2n;
      doorRow('rowUsable', group(usable.toString()),
              hostBits === 1 ? 'Point-to-point link, RFC 3021'
              : hostBits === 0 ? 'A single host'
              : 'Without the network and broadcast addresses');
      var mask = ((1n << 32n) - 1n) ^ (size - 1n);
      doorRow('rowMask', ipToText(mask, 4), '');
      doorRow('rowWild', ipToText(size - 1n, 4), 'Used in ACLs and OSPF');
    } else {
      doorRow('rowUsable', '', '');
      doorRow('rowMask', '', '');
      doorRow('rowWild', '', '');
    }
    var k = doorClassify({ v: c.v, big: c.net, bits: c.bits,
                           text: ipToText(c.net, c.v) });
    doorRow('rowKind', k.name, k.range ? k.range + (k.ref ? ', ' + k.ref : '') : k.ref);
    doorCopy(netText);
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
  input.value = '192.168.1.0/24';
  show(input.value, true);
};

(function () {
  var which = document.body.getAttribute('data-door');
  if (DOORS[which]) DOORS[which]();
})();
