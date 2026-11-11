/* apps/ip/js/01-address.js — small utilities, and addresses as BigInt: parsing, formatting, prefixes.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ UTIL ════════════════════════════════════════════════════════════ */

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function lerp(a, b, t) { return a + (b - a) * t; }

function smooth(t) { return t * t * (3 - 2 * t); }

function rgba(c, a) {
  return 'rgba(' + Math.round(c[0]*255) + ',' + Math.round(c[1]*255) + ',' +
         Math.round(c[2]*255) + ',' + a + ')';
}

function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

/* ── addresses ─────────────────────────────────────────────────────── */

function parseIp4(str) {
  var p = str.split('.'), v = 0n, i, n;
  if (p.length !== 4) return null;
  for (i = 0; i < 4; i++) {
    if (!/^\d{1,3}$/.test(p[i])) return null;
    n = parseInt(p[i], 10);
    if (n > 255) return null;
    v = (v << 8n) | BigInt(n);
  }
  return { v: 4, big: v, bits: 32, text: str };
}

function parseIp6(str) {
  var halves = str.split('::');
  if (halves.length > 2) return null;
  function words(part) {
    if (!part) return [];
    var out = [], seg = part.split(':'), i, f;
    for (i = 0; i < seg.length; i++) {
      if (seg[i] === '') return null;
      if (seg[i].indexOf('.') >= 0) {
        f = parseIp4(seg[i]);
        if (!f) return null;
        out.push(Number((f.big >> 16n) & 0xffffn));
        out.push(Number(f.big & 0xffffn));
        continue;
      }
      if (!/^[0-9a-fA-F]{1,4}$/.test(seg[i])) return null;
      out.push(parseInt(seg[i], 16));
    }
    return out;
  }
  var head = words(halves[0]);
  var tail = halves.length === 2 ? words(halves[1]) : [];
  if (head === null || tail === null) return null;
  var fill = 8 - head.length - tail.length, i;
  if (halves.length === 1) { if (head.length !== 8) return null; fill = 0; }
  else if (fill < 0) return null;
  var all = head.concat(new Array(fill).fill(0), tail), v = 0n;
  if (all.length !== 8) return null;
  for (i = 0; i < 8; i++) v = (v << 16n) | BigInt(all[i]);
  return { v: 6, big: v, bits: 128, text: str };
}

function parseIp(str) {
  if (!str) return null;
  str = String(str).trim();
  if (str.length > 45) return null;
  return str.indexOf(':') >= 0 ? parseIp6(str) : parseIp4(str);
}

function parseCidr(str) {
  if (!str) return null;
  var bits = String(str).split('/');
  if (bits.length !== 2) return null;
  var a = parseIp(bits[0]);
  if (!a) return null;
  var len = parseInt(bits[1], 10);
  if (!(len >= 0 && len <= a.bits)) return null;
  var host = BigInt(a.bits - len);
  return { v: a.v, net: (a.big >> host) << host, len: len, bits: a.bits, text: str };
}

function ipToText(big, ver) {
  var i, out = [];
  if (ver === 4) {
    for (i = 3; i >= 0; i--) out.push(Number((big >> BigInt(i*8)) & 255n));
    return out.join('.');
  }
  /* RFC 5952 text form: collapse the LONGEST run of zero groups, and only
   * a run of two or more. A regex for this is fragile — 2000::/3 came out
   * as 2000:0:0:0:0:0:0:0/3 — so it is done by hand. */
  var g = [];
  for (i = 7; i >= 0; i--) g.push(Number((big >> BigInt(i*16)) & 0xffffn));
  var best = -1, bestLen = 0, cur = -1, curLen = 0;
  for (i = 0; i < 8; i++) {
    if (g[i] === 0) {
      if (cur < 0) { cur = i; curLen = 0; }
      curLen++;
      if (curLen > bestLen) { best = cur; bestLen = curLen; }
    } else { cur = -1; curLen = 0; }
  }
  var parts = g.map(function (v) { return v.toString(16); });
  if (bestLen >= 2) {
    return parts.slice(0, best).join(':') + '::' +
           parts.slice(best + bestLen).join(':');
  }
  return parts.join(':');
}

/* The unit a block is measured in. IPv4 counts addresses; IPv6 counts /64
 * subnets, because that is the unit IPv6 is actually handed out in and
 * because "1,208,925,819,614,629,174,706,176 addresses" tells a person
 * nothing at all. Both statements are exactly true. (Owner's call.) */
function prefixUnit(cidr) {
  if (cidr.v === 6 && cidr.len <= 64) {
    return { bits: 64 - cidr.len, shift: 64n, one: 'subnet', many: 'subnets',
             tail: ' of the usual size (/64)' };
  }
  return { bits: cidr.bits - cidr.len, shift: 0n, one: 'address',
           many: 'addresses', tail: '' };
}

function prefixGrid(cidr, addrBig) {
  var u = prefixUnit(cidr);
  var colBits = Math.min(Math.ceil(u.bits / 2), 6);
  var rowBits = Math.max(Math.min(u.bits - colBits, 6), 0);
  var cols = 1 << colBits, rows = 1 << rowBits;
  var shown = BigInt(cols) * BigInt(rows);
  var total = 1n << BigInt(u.bits);
  var per = total / shown;
  if (per < 1n) per = 1n;
  var cell = -1;
  if (addrBig !== null && addrBig !== undefined) {
    var off = ((addrBig - cidr.net) >> u.shift) / per;
    if (off >= 0n && off < shown) cell = Number(off);
  }
  return { cols: cols, rows: rows, cell: cell, per: per, total: total,
           shown: shown, unit: u };
}

function splitAddr(text, cidr) {
  if (!cidr) return { fixed: '', vary: text, bits: 0 };
  var host = BigInt(cidr.bits - cidr.len);
  var a = ipToText(cidr.net, cidr.v);
  var b = ipToText(cidr.net + ((1n << host) - 1n), cidr.v);
  var i = 0;
  while (i < a.length && i < b.length && a.charAt(i) === b.charAt(i)) i++;
  var sep = cidr.v === 6 ? ':' : '.';
  var cut = text.lastIndexOf(sep, i);
  cut = cut < 0 ? 0 : cut + 1;
  var fixed = text.slice(0, cut);
  /* only claim it if it really is a prefix of this address — an IPv6
   * text form can compress differently and then the claim would be false */
  if (!fixed || text.indexOf(fixed) !== 0) return { fixed: '', vary: text, bits: 0 };
  return { fixed: fixed, vary: text.slice(cut), bits: cidr.len };
}

function setSplit(fixedEl, varyEl, text, cidr) {
  var sp = splitAddr(text, cidr);
  fixedEl.textContent = sp.fixed;
  varyEl.textContent = sp.vary;
}

/* The one-sentence rule the whole space field rests on: a block's
 * position is the Hilbert index of its number. Numerically adjacent
 * blocks stay spatially adjacent, which is why the clumps and voids in
 * the field are real allocation history and not decoration. */
function d2xy(n, d) {
  var rx, ry, t = d, x = 0, y = 0, sc, tmp;
  for (sc = 1; sc < n; sc *= 2) {
    rx = 1 & (t >> 1);
    ry = 1 & (t ^ rx);
    if (ry === 0) {
      if (rx === 1) { x = sc - 1 - x; y = sc - 1 - y; }
      tmp = x; x = y; y = tmp;
    }
    x += sc * rx; y += sc * ry;
    t >>= 2;
  }
  return [x, y];
}

function xy2d(n, x, y) {
  var rx, ry, d = 0, sc, tmp;
  for (sc = n / 2; sc > 0; sc = Math.floor(sc / 2)) {
    rx = (x & sc) > 0 ? 1 : 0;
    ry = (y & sc) > 0 ? 1 : 0;
    d += sc * sc * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) { x = sc - 1 - x; y = sc - 1 - y; }
      tmp = x; x = y; y = tmp;
    }
  }
  return d;
}
