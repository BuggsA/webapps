/* apps/ip/js/02-curve.js — the one global Hilbert curve every rung is laid out on.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ── ONE CURVE, NOT ONE PER RUNG ───────────────────────────────────────
 * Phase B of ../../docs/ip-plan-v2.md, and the whole of why the descent
 * used to fall apart between layers.
 *
 * Every rung used to lay out its own container with its own d2xy over
 * 0..4095. Two rungs therefore disagreed about where an address was, the
 * same block appeared in two places 23px apart through every cross-fade,
 * and travel read as flicking between slides of different sizes.
 *
 * The fix is not to reconcile them. It is to stop having two. A cell's
 * position is its index on ONE curve over the whole address space at that
 * cell size, so a container is automatically an aligned 64x64 tile of its
 * parent and `child >> 12 === parent` falls out with no rotation state
 * carried anywhere. Verified before building; see the plan.
 *
 * ~20 ms a rung, flat with depth, because BigInt work below 2^128 costs
 * about the same whatever the magnitude. Rebuilds are rare. It is fine.
 */

function d2xyB(order, d) {
  var x = 0n, y = 0n, t = d, s = 1n, n = 1n << BigInt(order), rx, ry, tmp;
  for (; s < n; s <<= 1n) {
    rx = 1n & (t >> 1n);
    ry = 1n & (t ^ rx);
    if (ry === 0n) {
      if (rx === 1n) { x = s - 1n - x; y = s - 1n - y; }
      tmp = x; x = y; y = tmp;
    }
    x += s * rx; y += s * ry;
    t >>= 2n;
  }
  return [x, y];
}

function xy2dB(order, x, y) {
  var d = 0n, s = 1n << BigInt(order - 1), rx, ry, tmp;
  for (; s > 0n; s >>= 1n) {
    rx = (x & s) > 0n ? 1n : 0n;
    ry = (y & s) > 0n ? 1n : 0n;
    d += s * s * ((3n * rx) ^ ry);
    if (ry === 0n) {
      if (rx === 1n) { x = s - 1n - x; y = s - 1n - y; }
      tmp = x; x = y; y = tmp;
    }
  }
  return d;
}

/* Where a rung's 4,096 cells sit on the global curve, and where the aim
 * sits among them.
 *
 * A container's cells are contiguous on the curve, and by the nesting
 * property they occupy an aligned 64x64 tile — so this is still the
 * container the plate names, merely laid out in the one coordinate system
 * every other rung also uses.
 *
 * `ox`/`oy` are the aim's exact position in this rung's grid, carried as a
 * fraction so that the rungs agree with each other to well below a pixel.
 * They are measured against the deepest rung on screen, which is the only
 * level fine enough to place the aim precisely; when the deepest rung
 * changes the reference moves by less than one of its cells, which is
 * sub-pixel by construction and so cannot be seen.
 */
function rungLayout(f, refOrder, refX, refY) {
  var k = f.cellLen >> 1;                       /* cells are 2^cellLen */
  var base = (f.containerNet >> f.cellShift);   /* first cell, globally */
  var cells = FIELD * FIELD, i;
  var gx = new Float64Array(cells), gy = new Float64Array(cells);
  /* and the way back, for picking: grid square -> which cell is there */
  var inv = new Int32Array(cells);
  var xy = d2xyB(k, base);
  var tileX = xy[0] >> 6n, tileY = xy[1] >> 6n;
  /* the tile is aligned, so the local layout is the global curve restricted
   * to it — computed cell by cell because that is what makes it the same
   * curve rather than a copy of one */
  for (i = 0; i < cells; i++) {
    var p = d2xyB(k, base + BigInt(i));
    gx[i] = Number(p[0] - (tileX << 6n));
    gy[i] = Number(p[1] - (tileY << 6n));
    inv[gy[i] * FIELD + gx[i]] = i;
  }
  /* the aim's position in this rung's grid, to a fraction of a cell */
  var drop = refOrder - k;
  var div = Math.pow(2, drop);
  var mask = (1n << BigInt(drop)) - 1n;
  var aimX = Number((refX >> BigInt(drop)) - (tileX << 6n));
  var aimY = Number((refY >> BigInt(drop)) - (tileY << 6n));
  var subX = (Number(refX & mask) + 0.5) / div;
  var subY = (Number(refY & mask) + 0.5) / div;
  /* ox/oy are the aim's EXACT position in this rung's grid, as a real
   * number. Not the centre of the cell it happens to be in: that is a
   * different point at every level, and the difference is multiplied by
   * FIELD on the way up, so a half-cell fudge here came out as 28px of
   * disagreement two rungs away. The exact position is the only thing all
   * the levels can agree about. */
  return { gx: gx, gy: gy, inv: inv, k: k,
           ox: aimX + subX, oy: aimY + subY };
}

/* A field of 4096 blocks: a container, and the 12 bits below it.
 * Everything here is arithmetic on the visitor's own number -- no lookup
 * is made, and none is implied.
 *
 * FLOATING ORIGIN, and why this is already safe: 128 bits do not survive a
 * float32's 24-bit mantissa, so a deep IPv6 descent would jitter and then
 * quantise if any absolute address ever reached the renderer. None does.
 * A field is a container plus a cell OFFSET inside it, and an offset is
 * never larger than 4095. The rule for every later phase is the same —
 * never turn an absolute address into a float, only an offset from the
 * container that frames it. */
function fieldAt(containerLen) {
  if (!S.home || S.aim === null) return null;
  var bits = S.home.bits;
  var cellLen = containerLen + STEP_BITS;
  if (cellLen > bits || containerLen < 0) return null;
  var cShift = BigInt(bits - containerLen);
  /* the container is whatever holds the AIM, not whatever holds you. That
   * one substitution is the difference between a slider and a place you
   * can travel in. */
  var containerNet = (S.aim >> cShift) << cShift;
  var cellShift = BigInt(bits - cellLen);
  var idx = Number((S.aim - containerNet) >> cellShift);
  if (!(idx >= 0 && idx < FIELD * FIELD)) return null;
  /* Your own address is drawn only when it is genuinely inside this
   * container. Travel far enough and it is simply not here — which is the
   * honest state, and the one that makes the distance mean anything. */
  var homeIdx = -1;
  if ((S.home.big >> cShift) === containerNet >> cShift) {
    homeIdx = Number((S.home.big - containerNet) >> cellShift);
    if (!(homeIdx >= 0 && homeIdx < FIELD * FIELD)) homeIdx = -1;
  }
  return { containerNet: containerNet, containerLen: containerLen,
           cellLen: cellLen, cellShift: cellShift, idx: idx,
           homeIdx: homeIdx, bits: bits, v: S.home.v };
}

/* How far the aim has travelled from the visitor's own address. IPv6
 * counts /64 subnets for the same reason the block does: the true number
 * of addresses is exact and tells a person nothing. */
function distanceHome() {
  if (!S.home || S.aim === null) return '';
  var d = S.aim > S.home.big ? S.aim - S.home.big : S.home.big - S.aim;
  if (d === 0n) return 'your own address';
  if (S.home.v === 6 && (d >> 64n) > 0n) {
    var subs = d >> 64n;
    return group(subs.toString()) + (subs === 1n ? ' subnet' : ' subnets') +
           ' from yours';
  }
  return group(d.toString()) + (d === 1n ? ' address' : ' addresses') +
         ' from yours';
}
