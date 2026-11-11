/* apps/ip/js/20-network.js — whoami is elsewhere; this is RIPEstat: the network, and its shape.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ DATA ════════════════════════════════════════════════════════════
 * Nothing here fires during an arrive-copy-leave visit. The first
 * RIPEstat request happens only once the visitor has moved off Home.
 */

function ripe(call, resource) {
  var key = call + '|' + resource, hit = cacheGet(key);
  if (hit) return Promise.resolve(hit);
  return fetch(RIPE + call + '/data.json?resource=' + encodeURIComponent(resource) +
               '&sourceapp=whats-my-ip', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then(function (j) {
      if (!j || j.status !== 'ok') throw new Error('status');
      cacheSet(key, j.data || {});
      return j.data || {};
    });
}

/* RIPEstat holder strings are "HANDLE - Legal Name". The handle is
 * registry bookkeeping; the name is what a person recognises. */
function tidyHolder(h) {
  if (!h) return '';
  /* the separator goes with the number: RIPE returns "AS8151 - UNINET",
   * and stripping only the number left the plate reading "- UNINET". */
  h = String(h).trim().replace(/\s+/g, ' ').replace(/^AS\d+\s*-?\s*/i, '');
  var m = h.match(/^(?:[A-Z0-9][A-Z0-9_\-]{1,})\s+-\s+(.+)$/);
  if (m && m[1].length >= 3) h = m[1];
  else {
    m = h.match(/^(?:[A-Z0-9][A-Z0-9_\-]{2,})\s+(.+)$/);
    if (m && m[1].length >= 4 && (/[a-z]/.test(m[1]) || / /.test(m[1]))) h = m[1];
  }
  if (h.length > 34) {
    var par = h.match(/\(([^()]{2,22})\)\s*$/);
    if (par) return par[1];
  }
  h = h.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (h.length > 30) h = h.slice(0, 29).replace(/[\s,.\-]+$/, '') + '…';
  return h;
}

function ensureData() {
  if (S.s > 0.06 && S.home && !S.net) loadNet();
  if (S.s > 0.06 && S.home) loadRegistry();
}

function loadNet() {
  S.net = { status: 'loading' };
  if (!away()) S.subject = S.net;
  syncDom();
  ripe('network-info', S.home.text).then(function (d) {
    var prefix = d && d.prefix;
    var asn = (d && d.asns && d.asns.length) ? parseInt(d.asns[0], 10) : NaN;
    var cidr = parseCidr(prefix);
    if (!cidr || !(asn >= 0)) {
      S.net = { status: 'none' };
      if (!away()) S.subject = S.net;
      rebuild(); announce(); return;
    }
    S.net = { status: 'ready', prefix: prefix, cidr: cidr, asn: asn, holder: '' };
    if (!away()) { S.subject = S.net; loadShape(asn); }
    rebuild(); announce();
    afterHomeNetwork();   /* 26-wiring */
    return ripe('as-overview', 'AS' + asn).then(function (o) {
      var h = tidyHolder(o && o.holder);
      if (h && S.net && S.net.asn === asn) { S.net.holder = h; syncDom(); announce(); }
    }).catch(function () {});
  }).catch(function () {
    S.net = { status: 'none' };
    if (!away()) S.subject = S.net;
    rebuild(); announce();
  });
}

/* ── THE SHAPE OF A NETWORK ────────────────────────────────────────────
 * The complaint this exists to answer: "there doesn't seem like a ton of
 * information ... it just feels like the sliding in and out with a new ip
 * address on top." Correct, and the cause was that every network looked
 * exactly the same. A university and a CDN drew the identical grid of
 * dots; only the caption changed. Travelling to twenty places showed you
 * one picture twenty times.
 *
 * A network is not one block. It is every block it announces, and that is
 * wildly different from one network to the next:
 *
 *     RIPE NCC   AS3333        8 blocks, clustered
 *     Google     AS15169   1,414 blocks
 *     Akamai     AS20940   4,727 blocks, scattered over the whole map
 *
 * So arriving somewhere lights up everywhere else that network lives. That
 * is a different picture per place, it is entirely real, and it is the
 * difference between a caption and a thing to look at.
 */
function loadShape(asn) {
  if (!(asn >= 0)) return;
  if (S.shape && S.shape.asn === asn) return;
  S.shape = { asn: asn, status: 'loading', list: [], total: 0n };
  var key = 'ap' + asn;
  var hit = cacheGet(key);
  if (hit) { applyShape(asn, hit); return; }
  ripe('announced-prefixes', 'AS' + asn).then(function (d) {
    var raw = (d && d.prefixes) || [];
    var out = [], i, p;
    /* the list is uncapped for counting but capped for drawing: a few
     * thousand is fine, a pathological answer should not be able to stall
     * a rebuild */
    for (i = 0; i < raw.length && i < 8000; i++) {
      p = raw[i] && raw[i].prefix;
      if (p) out.push(p);
    }
    cacheSet(key, out);
    applyShape(asn, out);
  }).catch(function () {
    if (S.shape && S.shape.asn === asn) S.shape.status = 'none';
    syncDom();
  });
}

function applyShape(asn, list) {
  var i, c, parsed = [], t4 = 0n, t6 = 0n, n4 = 0, n6 = 0;
  for (i = 0; i < list.length; i++) {
    c = parseCidr(list[i]);
    if (!c) continue;
    var span = 1n << BigInt(c.bits - c.len);
    parsed.push({ v: c.v, net: c.net, last: c.net + span - 1n, len: c.len });
    /* per family. A network announcing one IPv6 /32 and eight IPv4 /23s
     * was being reported as holding 20 septillion addresses, because the
     * two were added together. They are not the same unit and never were. */
    if (c.v === 4) { t4 += span; n4++; } else { t6 += span; n6++; }
  }
  parsed.sort(function (a, b) { return a.net < b.net ? -1 : a.net > b.net ? 1 : 0; });
  S.shape = { asn: asn, status: 'ready', list: parsed,
              n4: n4, n6: n6, t4: t4, t6: t6 };
  rebuild();
  announce();
}

/* Which cells of a field this network occupies. Same shape of loop as the
 * landmarks: per prefix, not per cell, so a 4,727-prefix network costs
 * 4,727 steps and not 4,727 x 4,096 comparisons. */
function shapeInField(f) {
  var sh = S.shape, out = null, cells = FIELD * FIELD, i, b, a, e, k, n;
  if (!sh || sh.status !== 'ready' || !sh.list.length) return null;
  var lo = f.containerNet, here = 0, lit = 0;
  var hi = lo + (BigInt(cells) << f.cellShift) - 1n;
  for (i = 0; i < sh.list.length; i++) {
    b = sh.list[i];
    if (b.v !== f.v || b.last < lo || b.net > hi) continue;
    here++;
    a = b.net < lo ? 0 : Number((b.net - lo) >> f.cellShift);
    e = b.last > hi ? cells - 1 : Number((b.last - lo) >> f.cellShift);
    if (e >= cells) e = cells - 1;
    if (!out) out = {};
    for (k = a; k <= e; k++) if (out[k] === undefined) { out[k] = 1; lit++; }
  }
  if (!out) return null;
  /* Dimmed by how much of the FIELD the network covers, not by how big
   * each prefix is. Akamai holds thousands of separate /24s, each one cell
   * — individually tiny, collectively the entire frame at full brightness,
   * which is a white slab and not a footprint. */
  return { cells: out, here: here, lit: lit,
           i: 0.70 * clamp(6 / Math.sqrt(lit), 0.10, 1) };
}

/* how much of the space this network holds, in the unit that reads */
function shapeSize() {
  var sh = S.shape;
  if (!sh || sh.status !== 'ready') return '';
  var v6 = S.home && S.home.v === 6;
  var n = v6 ? sh.n6 : sh.n4, tot = v6 ? sh.t6 : sh.t4;
  if (!n) { v6 = !v6; n = v6 ? sh.n6 : sh.n4; tot = v6 ? sh.t6 : sh.t4; }
  if (!n) return '';
  var blocks = group(String(n)) + (n === 1 ? ' block' : ' blocks');
  if (v6) {
    var subs = tot >> 64n;
    return blocks + ' · ' + group(subs.toString()) +
           (subs === 1n ? ' subnet' : ' subnets');
  }
  return blocks + ' · ' + group(tot.toString()) + ' addresses';
}
