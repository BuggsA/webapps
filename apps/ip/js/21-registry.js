/* apps/ip/js/21-registry.js — space.bin: every allocation the five registries made.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';



/* ══ REGISTRY ════════════════════════════════════════════════════════
 * Phase A of ../../docs/ip-plan-v2.md: the map stops being empty.
 *
 * Every allocation the five registries have ever made — where it is, who
 * holds it, which country, and the year it was handed out. 439 KB gzipped,
 * built by ../../scripts/ip-build-space-field.py, and it answers questions
 * that used to need a lookup: what IS this, how old is it, whose is it.
 *
 * It arrives on the same trigger as the RIPEstat calls, so arrive-copy-
 * leave still talks to nobody but our own edge.
 *
 * This is the first thing in the app that is KNOWN WITHOUT ASKING, at
 * scale. Landmarks were the precedent — an RFC fact needs no lookup — and
 * the same reasoning covers a published registry: no question was skipped
 * to know it. "Lit = known, dark = unasked" still holds; there is simply a
 * great deal more that is known now.
 */

var REG = null;         /* the parsed file, or null until it lands */
var regState = '';      /* '' | 'loading' | 'ready' | 'none' */

function loadRegistry() {
  loadContent();
  if (regState) return;
  regState = 'loading';
  fetchSpace()
    .then(function (buf) {
      REG = parseRegistry(new Uint8Array(buf));
      regState = REG ? 'ready' : 'none';
      if (REG) afterRegistryLoaded();   /* 26-wiring */
    })
    .catch(function () {
      /* the map is poorer without it and still correct. No message: the
       * visitor never asked for this file and should not be told it
       * failed. */
      regState = 'none';
    });
}

/* The file is 2.9 MB raw and 439 KB gzipped. On AWS the deploy script
 * uploaded it pre-gzipped with Content-Encoding: gzip, so the browser
 * unpacked it invisibly. Cloudflare Pages - the only host since 2026-11-11 -
 * does not compress application/octet-stream and cannot be told a static
 * file is already encoded, so the same fetch downloaded all 2.9 MB.
 *
 * So the page fetches space.bin.gz (written next to space.bin by
 * scripts/ip-build-space-field.py) and unpacks it itself. Any browser
 * without DecompressionStream, or any failure on the way, falls back to the
 * raw file: slower, never wrong. */
function fetchSpace() {
  function raw() {
    return fetch('data/space.bin', { cache: 'force-cache' }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.arrayBuffer();
    });
  }
  if (typeof DecompressionStream === 'undefined') return raw();
  return fetch('data/space.bin.gz', { cache: 'force-cache' })
    .then(function (r) {
      if (!r.ok || !r.body) throw new Error(String(r.status));
      return new Response(r.body.pipeThrough(new DecompressionStream('gzip')))
        .arrayBuffer();
    })
    .catch(raw);
}

function parseRegistry(b) {
  if (b.length < 9 || b[0] !== 73 || b[1] !== 80 || b[2] !== 83 || b[3] !== 70) {
    return null;                                  /* not "IPSF" */
  }
  if (b[4] !== 1) return null;                    /* a version we know */
  var p = 5;
  var built = b[5] | (b[6] << 8) | (b[7] << 16) | (b[8] << 24);
  p = 9;

  function v() {                                  /* varint, as a Number */
    var shift = 0, out = 0, byte;
    do {
      byte = b[p++];
      out += (byte & 0x7f) * Math.pow(2, shift);
      shift += 7;
    } while (byte & 0x80);
    return out;
  }
  function vBig() {                               /* varint, as a BigInt */
    var shift = 0n, out = 0n, byte;
    do {
      byte = b[p++];
      out |= BigInt(byte & 0x7f) << shift;
      shift += 7n;
    } while (byte & 0x80);
    return out;
  }

  var n = v(), i;
  var rir = new Uint8Array(n), cc = new Array(n), year = new Uint16Array(n);
  for (i = 0; i < n; i++) {
    rir[i] = b[p];
    cc[i] = String.fromCharCode(b[p + 1], b[p + 2]);
    year[i] = b[p + 3] | (b[p + 4] << 8);
    p += 5;
  }

  /* IPv4 fits in a double exactly, so it gets typed arrays and a fast
   * search. IPv6 does not fit in anything but BigInt, and 69,000 of them
   * is the price of the only address family with a future. */
  var n4 = v();
  var lo4 = new Float64Array(n4), hi4 = new Float64Array(n4);
  var k4 = new Uint16Array(n4), prev = 0;
  for (i = 0; i < n4; i++) {
    lo4[i] = prev + v();
    hi4[i] = lo4[i] + v();
    k4[i] = v();
    prev = hi4[i];
  }
  var n6 = v();
  var lo6 = new Array(n6), hi6 = new Array(n6);
  var k6 = new Uint16Array(n6), prevB = 0n;
  for (i = 0; i < n6; i++) {
    lo6[i] = prevB + vBig();
    hi6[i] = lo6[i] + vBig();
    k6[i] = v();
    prevB = hi6[i];
  }
  /* How much space is older than a given year, by address volume.
   * "Allocated 1993" is inert on its own; "older than 71% of the space
   * anybody holds" is a fact with a size. One pass, done once. */
  var byYear = new Float64Array(2101), total = 0, y;
  for (i = 0; i < n4; i++) {
    y = year[k4[i]] || 1980;
    byYear[y] += hi4[i] - lo4[i];
    total += hi4[i] - lo4[i];
  }
  var older = new Float64Array(2101), run = 0;
  for (i = 0; i < 2101; i++) { older[i] = total ? run / total : 0; run += byYear[i]; }

  return { rir: rir, cc: cc, year: year, built: built,
           lo4: lo4, hi4: hi4, k4: k4, n4: n4,
           lo6: lo6, hi6: hi6, k6: k6, n6: n6,
           older: older };
}

var RIR_NAME = ['AFRINIC', 'APNIC', 'ARIN', 'LACNIC', 'RIPE NCC', 'IANA'];

/* One line about a place, from the registries, with the age sized against
 * everything else anybody holds. Never a number without something already
 * seen to measure it by. */
function regLine(big, v) {
  var r = regAt(big, v);
  if (!r) return '';
  var out = 'allocated ' + (r.year || '?');
  if (r.year && REG.older) {
    /* always sized, never bare. A year on its own is inert. */
    var pc = Math.round(REG.older[Math.min(r.year, 2100)] * 100);
    out += ', older than ' + pc + '% of the space anybody holds';
  }
  return out + '  ·  ' + r.rirName + '  ·  ' + r.cc;
}

/* The index of the range holding this address, or -1. One binary search. */
function regIndex(big, v) {
  if (!REG) return -1;
  var lo, hi, mid;
  if (v === 4) {
    var a = Number(big);
    lo = 0; hi = REG.n4 - 1;
    while (lo <= hi) {
      mid = (lo + hi) >> 1;
      if (a < REG.lo4[mid]) hi = mid - 1;
      else if (a >= REG.hi4[mid]) lo = mid + 1;
      else return mid;
    }
    return -1;
  }
  lo = 0; hi = REG.n6 - 1;
  while (lo <= hi) {
    mid = (lo + hi) >> 1;
    if (big < REG.lo6[mid]) hi = mid - 1;
    else if (big >= REG.hi6[mid]) lo = mid + 1;
    else return mid;
  }
  return -1;
}

/* What is known about an address without anyone being asked. */
function regAt(big, v) {
  var i = regIndex(big, v);
  if (i < 0) return null;
  var k = v === 4 ? REG.k4[i] : REG.k6[i];
  return { rir: REG.rir[k], rirName: RIR_NAME[REG.rir[k]] || '?',
           cc: REG.cc[k], year: REG.year[k] };
}

/* ERA — what a cell's age looks like.
 *
 * Brightness, never hue: the art direction allows three colour roles and
 * age is not one of them. Unallocated space is the darkest thing on the
 * plate because it is genuinely nothing, and the gradient upward is age,
 * so the oldest space on the internet is the brightest thing in an
 * untouched field. That is a fact about the world, drawn.
 *
 * The whole range sits well below an answered lookup (0.95) and below a
 * network's own footprint (0.70), so nothing here can outshout something
 * that was actually asked about.
 */
/* CONCENTRATION, once, instead of a sixth time.
 *
 * Accumulation is additive and the bloom is generous, so N marks drawn at
 * the same brightness in the same place do not read as N marks — they read
 * as one white hole, and the tone map then crushes everything around them.
 * This has now bitten the block, the landmarks, a network's footprint and
 * a query highlight, each time discovered separately and patched
 * separately. It is the same function every time.
 *
 * Full brightness for a handful of marks, falling with the square root of
 * how many share the frame, floored so a dense answer is still visible. */
function spread(n, full, floorAt) {
  return full * clamp(6 / Math.sqrt(Math.max(n, 1)), floorAt === undefined ? 0.12 : floorAt, 1);
}

function eraLevel(year) {
  if (!year) return 0.10;
  if (year < 1990) return 0.40;
  if (year < 1995) return 0.32;
  if (year < 2000) return 0.27;
  if (year < 2005) return 0.23;
  if (year < 2011) return 0.19;
  if (year < 2016) return 0.16;
  if (year < 2021) return 0.13;
  return 0.11;
}


var UNALLOCATED = 0.055;   /* darker than anything held by anybody */

/* Every cell of a field, keyed by era brightness, in one pass over the
 * ranges rather than 4,096 binary searches. */
function regInField(f) {
  if (!REG) return null;
  var cells = FIELD * FIELD, out = new Float32Array(cells);
  var keys = new Int32Array(cells);
  var i, a, e, k;
  keys.fill(-1);
  out.fill(UNALLOCATED);
  if (f.v === 4) {
    var lo = Number(f.containerNet);
    var span = Math.pow(2, 32 - f.containerLen);
    var hi = lo + span, cellSize = span / cells;
    /* find the first range that could touch this container */
    var L = 0, R = REG.n4 - 1, first = REG.n4;
    while (L <= R) {
      var mid = (L + R) >> 1;
      if (REG.hi4[mid] <= lo) L = mid + 1;
      else { first = mid; R = mid - 1; }
    }
    for (i = first; i < REG.n4 && REG.lo4[i] < hi; i++) {
      a = Math.max(0, Math.floor((REG.lo4[i] - lo) / cellSize));
      e = Math.min(cells - 1, Math.floor((REG.hi4[i] - 1 - lo) / cellSize));
      k = REG.k4[i];
      for (; a <= e; a++) {
        if (keys[a] < 0) { keys[a] = k; out[a] = eraLevel(REG.year[k]); }
      }
    }
    return { level: out, key: keys };
  }
  var loB = f.containerNet;
  var hiB = loB + (BigInt(cells) << f.cellShift);
  var Lb = 0, Rb = REG.n6 - 1, firstB = REG.n6;
  while (Lb <= Rb) {
    var m2 = (Lb + Rb) >> 1;
    if (REG.hi6[m2] <= loB) Lb = m2 + 1;
    else { firstB = m2; Rb = m2 - 1; }
  }
  for (i = firstB; i < REG.n6 && REG.lo6[i] < hiB; i++) {
    var s = REG.lo6[i] < loB ? 0n : (REG.lo6[i] - loB) >> f.cellShift;
    var t = REG.hi6[i] > hiB ? BigInt(cells - 1)
                             : (REG.hi6[i] - 1n - loB) >> f.cellShift;
    a = Number(s); e = Number(t); k = REG.k6[i];
    if (e > cells - 1) e = cells - 1;
    for (; a <= e; a++) {
      if (keys[a] < 0) { keys[a] = k; out[a] = eraLevel(REG.year[k]); }
    }
  }
  return { level: out, key: keys };
}

/* TERRITORIES (owner, 2026-11-11: approved as "Let's do all 3").
 *
 * The map's whole vocabulary of destinations used to be brightness: one
 * dot, four thousand times. But every cell already carries a registry and
 * a country, and where two neighbouring cells differ the data itself has
 * drawn a border. Nothing here is invented - the line is exactly where the
 * registries' records change hands.
 *
 * Two strengths, no hue (three colour roles only, and this is not a
 * political map - these are administrative allocations, not territory in
 * any sense a state would recognise):
 *   2 - one REGISTRY against another. Continent-sized shapes at the
 *       widest view, and the rarest line, so the strongest.
 *   1 - the same registry, a different COUNTRY; or held against unheld.
 *       The finer grain inside. Held-against-unheld is already visible as
 *       light against dark, so it does not get the strong line.
 * When the fine grain is too fragmented to read as shapes (measured: 838
 * short runs across all of IPv4) it is dropped for that field - a border
 * is only worth drawing if it encloses something the eye can point at.
 *
 * Returned in grid units, already merged into straight runs, so a border
 * along a whole side of a block is one hairline and not sixty-four - the
 * renderer pays per line, and the eye reads a run as an edge. */
function regBorders(f) {
  if (!REG || !f || !f.reg || !f.lay || !f.lay.inv) return [];
  var key = f.reg.key, inv = f.lay.inv, out = [];
  function kind(a, b) {
    var ka = key[a], kb = key[b];
    if (ka === kb) return 0;
    if (ka < 0 || kb < 0) return 1;
    if (REG.rir[ka] !== REG.rir[kb]) return 2;
    return REG.cc[ka] !== REG.cc[kb] ? 1 : 0;
  }
  var x, y, k, run, runK;
  /* vertical edges: between (x-1, y) and (x, y), along x */
  for (x = 1; x < FIELD; x++) {
    run = 0; runK = 0;
    for (y = 0; y <= FIELD; y++) {
      k = y < FIELD ? kind(inv[y * FIELD + x - 1], inv[y * FIELD + x]) : 0;
      if (k !== runK) {
        if (runK) out.push([x, y - run, x, y, runK]);
        run = 0; runK = k;
      }
      if (k) run++;
    }
  }
  /* horizontal edges: between (x, y-1) and (x, y), along y */
  for (y = 1; y < FIELD; y++) {
    run = 0; runK = 0;
    for (x = 0; x <= FIELD; x++) {
      k = x < FIELD ? kind(inv[(y - 1) * FIELD + x], inv[y * FIELD + x]) : 0;
      if (k !== runK) {
        if (runK) out.push([x - run, y, x, y, runK]);
        run = 0; runK = k;
      }
      if (k) run++;
    }
  }
  var fine = 0, i;
  for (i = 0; i < out.length; i++) if (out[i][4] === 1) fine++;
  if (fine > BORDER_FINE_MAX) out = out.filter(function (r) { return r[4] === 2; });
  return out;
}
var BORDER_FINE_MAX = 320;
