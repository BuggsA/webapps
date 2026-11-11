/* apps/ip/js/03-landmarks.js — named places on the map (root servers and others), resolved at load.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ── LANDMARKS ─────────────────────────────────────────────────────────
 * Places worth finding. Nobody explores a space with no named things in
 * it, and until now every cell was anonymous until it was clicked.
 *
 * THE RULE: every entry here is either a fact fixed by an RFC, or an
 * address published by the organisation that operates it. Nothing needs a
 * lookup and nothing can quietly rot into fiction as space is re-delegated
 * — and where a landmark has a holder, the holder is still EARNED by the
 * same RIPEstat call as every other block. The note says what the place
 * IS; the instrument says who is actually there.
 *
 * The root server addresses are not from memory: they are the contents of
 * the IANA root hints, https://www.internic.net/domain/named.root.
 */
var MARKS = [
  /* IPv4, special use — RFC 6890 and the RFCs it collects */
  { p: '0.0.0.0/8',        n: 'This network',
    w: 'The address a machine uses before it has one.' },
  { p: '10.0.0.0/8',       n: 'Private use',
    w: 'RFC 1918. These addresses exist inside millions of buildings at once, and not one of them is reachable from here.' },
  { p: '100.64.0.0/10',    n: 'Carrier-grade NAT',
    w: 'RFC 6598. Where your phone probably lives: an address your carrier gave you that the internet cannot route to.' },
  { p: '127.0.0.0/8',      n: 'Loopback',
    w: '16,777,216 addresses that all mean here. Almost nobody ever uses more than the first one.' },
  { p: '169.254.0.0/16',   n: 'Link-local',
    w: 'RFC 3927. What a machine gives itself when nothing answered.' },
  { p: '172.16.0.0/12',    n: 'Private use',  w: 'RFC 1918.' },
  { p: '192.0.2.0/24',     n: 'TEST-NET-1',
    w: 'RFC 5737. Addresses that exist only in documentation. Nothing is here, and nothing may ever be.' },
  { p: '192.168.0.0/16',   n: 'Private use',
    w: 'RFC 1918. Almost certainly the range behind your own router.' },
  { p: '198.18.0.0/15',    n: 'Benchmarking',
    w: 'RFC 2544. Set aside for testing network equipment against itself.' },
  { p: '198.51.100.0/24',  n: 'TEST-NET-2',  w: 'RFC 5737. Documentation only.' },
  { p: '203.0.113.0/24',   n: 'TEST-NET-3',  w: 'RFC 5737. Documentation only.' },
  { p: '224.0.0.0/4',      n: 'Multicast',
    w: 'RFC 5771. Not places but conversations, which you join rather than visit.' },
  { p: '240.0.0.0/4',      n: 'Reserved for the future',
    w: '268,435,456 addresses set aside in 1981 for a future that has not arrived. A sixteenth of all IPv4, still empty.' },
  { p: '255.255.255.255/32', n: 'Broadcast', w: 'Everyone on this link, at once.' },

  /* IPv4, published resolvers — the holder is confirmed by lookup */
  { p: '8.8.8.8/32',       n: 'Google Public DNS',
    w: 'Published in 2009, and one of the addresses the most DNS questions on earth are asked at.' },
  { p: '1.1.1.1/32',       n: 'Cloudflare and APNIC resolver',
    w: 'So much misconfigured equipment sent traffic to 1.1.1.1 that the address was considered unusable. There is a public resolver on it anyway.' },
  { p: '9.9.9.9/32',       n: 'Quad9',       w: 'A filtering public resolver.' },

  /* IPv6, special use */
  { p: '::/128',           n: 'Unspecified', w: 'No address at all.' },
  { p: '::1/128',          n: 'Loopback',
    w: 'IPv4 spends 16 million addresses on meaning here. IPv6 spends exactly one.' },
  { p: '64:ff9b::/96',     n: 'NAT64',
    w: 'RFC 6052. The whole of IPv4, embedded inside IPv6 so the two internets can speak.' },
  { p: '2001::/32',        n: 'Teredo',      w: 'RFC 4380. IPv6 smuggled through IPv4.' },
  { p: '2001:db8::/32',    n: 'Documentation',
    w: 'RFC 3849. Every IPv6 address in every textbook and manual is in here. Nothing else ever will be.' },
  { p: '2002::/16',        n: '6to4',
    w: 'RFC 3056. A bridge built between the two internets, and then abandoned.' },
  { p: 'fc00::/7',         n: 'Unique local', w: 'RFC 4193. IPv6 private space.' },
  { p: 'fe80::/10',        n: 'Link-local',
    w: 'RFC 4291. Every IPv6 interface has one of these whether anyone asked for it or not.' },
  { p: 'ff00::/8',         n: 'Multicast',   w: 'RFC 4291.' }
];

/* the thirteen, named a to m */
var ROOTS = [
  ['a', '198.41.0.4', '2001:503:ba3e::2:30'], ['b', '170.247.170.2', '2801:1b8:10::b'],
  ['c', '192.33.4.12', '2001:500:2::c'],      ['d', '199.7.91.13', '2001:500:2d::d'],
  ['e', '192.203.230.10', '2001:500:a8::e'],  ['f', '192.5.5.241', '2001:500:2f::f'],
  ['g', '192.112.36.4', '2001:500:12::d0d'],  ['h', '198.97.190.53', '2001:500:1::53'],
  ['i', '192.36.148.17', '2001:7fe::53'],     ['j', '192.58.128.30', '2001:503:c27::2:30'],
  ['k', '193.0.14.129', '2001:7fd::1'],       ['l', '199.7.83.42', '2001:500:9f::42'],
  ['m', '202.12.27.33', '2001:dc3::35']
];
ROOTS.forEach(function (r) {
  var w = r[0] + '.root-servers.net — one of the thirteen addresses every ' +
          'name on the internet is ultimately looked up through.';
  MARKS.push({ p: r[1] + '/32',  n: 'Root server ' + r[0].toUpperCase(), w: w });
  MARKS.push({ p: r[2] + '/128', n: 'Root server ' + r[0].toUpperCase(), w: w });
});

MARKS.forEach(function (m) {
  var c = parseCidr(m.p);
  if (!c) { m.bad = 1; return; }
  m.v = c.v; m.net = c.net; m.len = c.len; m.bits = c.bits;
  m.last = c.net + ((1n << BigInt(c.bits - c.len)) - 1n);
});
MARKS = MARKS.filter(function (m) { return !m.bad; });

/* Which cells of a field a landmark touches. Computed per landmark rather
 * than per cell: 4096 cells against 50 landmarks would be 200,000
 * comparisons on every rebuild, where this is 50. A landmark larger than a
 * cell lights every cell it covers, which is the point — 240.0.0.0/4
 * should read as a whole empty region of the map, not as a dot. */
function marksInField(f) {
  var out = {}, list = [], cells = FIELD * FIELD, i, m, a, b, k, n, lit, sz;
  var lo = f.containerNet;
  var hi = lo + (BigInt(cells) << f.cellShift) - 1n;
  for (i = 0; i < MARKS.length; i++) {
    m = MARKS[i];
    if (m.v !== f.v || m.last < lo || m.net > hi) continue;
    a = m.net < lo ? 0 : Number((m.net - lo) >> f.cellShift);
    b = m.last > hi ? cells - 1 : Number((m.last - lo) >> f.cellShift);
    if (b >= cells) b = cells - 1;
    /* A landmark the size of one cell is a lamp; a landmark covering a
     * sixteenth of IPv4 is a REGION, and lighting 256 cells as brightly as
     * one lamp turns a quarter of the map into a single white smear that
     * the tone map then crushes everything else against. Brightness per
     * cell falls with the square root of how many cells it covers, so a
     * big landmark reads as a lit territory and a small one as a point. */
    n = b - a + 1;
    lit = 0.66 * clamp(3.2 / Math.sqrt(n), 0.15, 1);
    sz = n > 1 ? lerp(1.9, 3.4, clamp(4 / Math.sqrt(n), 0, 1)) : 3.4;
    for (k = a; k <= b; k++) {
      if (out[k] === undefined || out[k].n < n) out[k] = { m: m, i: lit, s: sz, n: n };
    }
    list.push({ m: m, a: a, b: b, n: n, i: lit });
  }
  /* `cells` is the per-cell map the field reads while it draws; `list` is
   * the landmarks themselves, so each can be drawn ONCE as a shape instead
   * of only as a scatter of brighter dots. A landmark has to be a
   * different KIND of thing, not a brighter instance of the same thing --
   * that is what makes it navigable. See docs/ip-exploration-research.md. */
  return { cells: out, list: list };
}

/* WHERE YOU HAVE BEEN, as cells of this field.
 *
 * A BUG FIX, found 2026-09-19 while giving visited cells their own
 * colour. S.asked is keyed by the aim's bare address ("193.0.6.139").
 * The field looked up S.asked[fieldPrefix(f, i)] — "193.0.0.0/24" — and
 * NOTHING has ever written a key in that shape. The two honest states
 * the field means to draw, asked-and-announced and asked-and-empty,
 * could therefore never be reached, at any rung, since they were
 * written. The same dead lookup drove the hover note, which is why a
 * cell you had stood in still read as unasked when you pointed at it.
 *
 * Keying by cell prefix could not have worked in any case: a visit is a
 * POINT and a cell is an AREA, and one visit has to show at every rung,
 * where the cell containing it is a different prefix each time. So the
 * visit stays an address and is mapped into cells here, exactly the way
 * marksInField maps a landmark's range.
 *
 * Cheap enough to do on every scene build because buildSpace runs on
 * rung crossings, not on frames, and S.asked holds tens of entries. */
/* The notebook as address RANGES, parsed once and kept until it changes.
 *
 * A visit is a POINT, and `a` records it. The key is the announced
 * PREFIX, which is what became known but is not where anybody stood.
 *
 * Drawing the prefix instead was tried and measured: five visits lit
 * 1,541 of 4,096 cells, because an announced /14 is 1,024 cells at the
 * /24 rung. At that rate the map is mostly cream after a morning and the
 * mark stops meaning anything.
 *
 * Records written before `a` existed keep only the prefix, so we do not
 * know which cell inside it they stood in. Those are drawn ONLY at rungs
 * where the prefix is a single cell — where the question does not arise.
 * Finer than that we decline to guess, which is the same rule the rest of
 * the instrument runs on. They heal on the next visit. */
var beenCache = null;

function beenRanges() {
  if (beenCache) return beenCache;
  var out = [], n, k, s, sl, a, bits, len;
  try { n = noteLoad(); } catch (e) { return (beenCache = out); }
  for (k in n.sites) {
    s = n.sites[k];
    if (!s) continue;
    sl = k.indexOf('/');
    a = parseIp(sl < 0 ? k : k.slice(0, sl));
    if (!a) continue;
    bits = a.v === 4 ? 32 : 128;
    len = sl < 0 ? bits : parseInt(k.slice(sl + 1), 10);
    if (!(len >= 0 && len <= bits)) continue;
    /* a `1` is a record written by an older version, which kept no
     * details; it is still a place that was visited. */
    var said = (s !== 1 && s.said && s.asn >= 0);
    var pt = (s !== 1 && s.a) ? parseIp(s.a) : null;
    out.push({ net: a.big, last: a.big + (1n << BigInt(bits - len)) - 1n,
               at: (pt && pt.v === a.v) ? pt.big : null,
               v: a.v, status: said ? 'ready' : 'empty',
               asn: said ? s.asn : -1, holder: (s !== 1 && s.who) || '' });
  }
  return (beenCache = out);
}

function beenInField(f) {
  var out = {}, cells = FIELD * FIELD, lo = f.containerNet;
  var hi = lo + (BigInt(cells) << f.cellShift) - 1n;
  var k, a, rec, i, j, list, r, aa, bb;

  /* announced outranks empty, because the cell does contain something;
   * among equals the brighter claim wins. */
  function put(idx, status, asn, holder, at) {
    var cur = out[idx];
    if (cur && cur.status === 'ready' && status !== 'ready') return;
    if (cur && cur.status === status && cur.i >= at) return;
    out[idx] = { status: status, asn: asn, holder: holder, i: at };
  }

  /* THIS session, from the lookup cache. A point: one cell, full weight. */
  for (k in S.asked) {
    rec = S.asked[k];
    /* 'loading' is a question in flight, not an answer. Lighting it would
     * say the instrument knows something it is still waiting for. */
    if (!rec || rec.status === 'loading') continue;
    a = parseIp(k);
    if (!a || a.v !== f.v || a.big < lo || a.big > hi) continue;
    i = Number((a.big - lo) >> f.cellShift);
    if (i < 0 || i >= cells) continue;
    put(i, rec.status, rec.asn, rec.holder, 1);
  }

  /* EVERY session, from the notebook. One cell each: a visit is a point,
   * and a point is one cell at every rung. */
  list = beenRanges();
  for (j = 0; j < list.length; j++) {
    r = list[j];
    if (r.v !== f.v || r.last < lo || r.net > hi) continue;
    if (r.at !== null) {
      if (r.at < lo || r.at > hi) continue;
      i = Number((r.at - lo) >> f.cellShift);
    } else {
      /* no recorded address: only place it where the prefix IS the cell,
       * because anywhere finer we would be inventing which one. */
      aa = r.net < lo ? 0 : Number((r.net - lo) >> f.cellShift);
      bb = r.last > hi ? cells - 1 : Number((r.last - lo) >> f.cellShift);
      if (bb >= cells) bb = cells - 1;
      if (bb !== aa) continue;
      i = aa;
    }
    if (i < 0 || i >= cells) continue;
    put(i, r.status, r.asn, r.holder, 1);
  }
  return out;
}

/* How many cells of this field the visitor has asked about, NOT counting
 * their own. Computed here rather than read off f.been, because the plate
 * must never wait on a frame: buildSpace runs on rung crossings, and the
 * text has to be right before the next one. That invariant has been
 * broken three times in this file already. */
function beenCountIn(f) {
  var b = beenInField(f), k, n = 0;
  for (k in b) if (+k !== f.homeIdx) n++;
  return n;
}

/* The landmark an address is standing in, if any; the most specific wins,
 * so a root server inside a /8 reports as the root server. */
function markAt(big, v) {
  var i, m, best = null;
  for (i = 0; i < MARKS.length; i++) {
    m = MARKS[i];
    if (m.v === v && big >= m.net && big <= m.last) {
      if (!best || m.len > best.len) best = m;
    }
  }
  return best;
}
