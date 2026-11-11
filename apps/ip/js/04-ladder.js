/* apps/ip/js/04-ladder.js — the ladder of 12-bit rungs, and the cache of public routing facts.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ── THE LADDER ────────────────────────────────────────────────────────
 * The axis is a prefix length read as a continuous number: s = 0 frames a
 * single address, s = maxAxis frames the whole of the family's space, and
 * one whole step of the axis is STEP_BITS of the address.
 *
 * This is where IPv4 and IPv6 stop being the same shape. A v4 /21 has
 * 21 bits above it and nothing usable below, so its ladder is two rungs
 * and the axis is 2.67 steps long. A v6 /32 has 96 bits of its own space
 * underneath it, so its ladder is ten rungs and the axis is 10.4 steps.
 * That asymmetry is not an effect laid over the data. It is the size
 * difference, walked.
 *
 * Before this the axis stopped at 3 for everyone, because 3 is what IPv4
 * needed. See ../../docs/ip-infinity-research.md §1. */
function floorLen(v) { return v === 6 ? 3 : 0; }

function axisOfLen(len) {
  return (S.home.bits - len) / STEP_BITS;
}

/* The rungs, deep first.
 *
 * The lattice has to be 12 bits apart and nothing else will do: a rung's
 * cells are the next rung's containers, so the nesting is only exact on a
 * uniform step. That leaves one real choice — where to pin it.
 *
 * Pinning it to the announced block was the obvious idea and it is wrong.
 * A v6 /32 anchored on itself gives rungs at /44, /56, /68 — straddling
 * /64 and never framing it. But /64 is the one boundary every IPv6 network
 * shares: it is the subnet. So the lattice is pinned to /64 for v6 and /24
 * for v4, and the announced block becomes a LANDMARK BETWEEN RUNGS, drawn
 * by its own layer at its own position and marked on the rail. Which is
 * truer anyway — your prefix length is a fact about you, not about the
 * shape of the space.
 *
 * The payoff is the rung at /52: four thousand subnets, one of them yours. */
function planLadder() {
  if (!S.home) { S.ladder = []; S.maxAxis = 3; S.anchor = 0; S.blockAxis = 1; return; }
  var sub = S.subject;
  var hasBlock = !!(sub && sub.status === 'ready' && sub.cidr);
  var lo = floorLen(S.home.v), hi = S.home.bits, L, out = [];
  S.anchor = S.home.v === 6 ? 64 : 24;
  S.maxAxis = (hi - lo) / STEP_BITS;
  S.blockAxis = hasBlock ? axisOfLen(sub.cidr.len) : axisOfLen(S.anchor);

  for (L = S.anchor; L > lo; L -= STEP_BITS) out.push(L);
  if (out[out.length - 1] !== lo) out.push(lo);
  for (L = S.anchor + STEP_BITS; L < hi; L += STEP_BITS) out.unshift(L);
  /* and the deepest rung the family allows, on-lattice or not. Without it
   * the first pull of the axis moves nothing for a whole step, because the
   * nearest rung is still out of range — a dead gesture, and the first one
   * the visitor makes. It drops out again if it crowds what is already
   * there, which is what happens on IPv4. */
  if (out[0] !== hi - STEP_BITS) out.unshift(hi - STEP_BITS);

  /* A rung needs a full field under it, must not BE the block, and must
   * not crowd the rung below it.
   *
   * The block rule used to be "drop anything within a third of a step",
   * which quietly deleted both of its neighbours: a /16 block sits 0.333
   * from the rungs either side of it, so both were culled and the ladder
   * collapsed to a single rung. Travel to somewhere with a /16 and the
   * axis did nothing across most of its range. The only genuine duplicate
   * is a rung whose CONTAINER is the block itself — that field and the
   * block's own grid are the same thing drawn twice. Everything else is a
   * different scale and is welcome to overlap; the weights are normalised,
   * so nothing gets brighter for it. */
  var blockLen = hasBlock ? sub.cidr.len : -1;
  var kept = [], i, a, last = -99;
  for (i = 0; i < out.length; i++) {
    L = out[i];
    if (L > hi - STEP_BITS) continue;
    if (L === blockLen) continue;
    a = axisOfLen(L);
    if (a - last < 0.34) continue;
    kept.push(L); last = a;
  }
  if (kept.length && kept[kept.length - 1] !== lo) {
    if (S.maxAxis - axisOfLen(kept[kept.length - 1]) < 0.34) kept.pop();
    kept.push(lo);
  }
  S.ladder = kept;
}

/* Which rungs are close enough to contribute, and which slot each takes.
 * Consecutive rungs never collide because they are one whole step apart
 * and there are four slots. */
function liveRungs() {
  var out = new Array(SLOTS), i, a;
  for (i = 0; i < S.ladder.length; i++) {
    a = axisOfLen(S.ladder[i]);
    if (Math.abs(a - S.s) >= 1) continue;
    out[i % SLOTS] = { len: S.ladder[i], axis: a, k: i, slot: i % SLOTS,
                       f: fieldAt(S.ladder[i]) };
  }
  return out;
}

/* The set of live rungs, as a string. When this changes the geometry has
 * to be rebuilt, because a slot is about to start showing a different
 * rung. It is the whole mechanism of the ring. */
function rungKey() {
  var i, k = '';
  for (i = 0; i < S.ladder.length; i++) {
    if (Math.abs(axisOfLen(S.ladder[i]) - S.s) < 1) k += S.ladder[i] + ',';
  }
  return k;
}
function fieldPrefix(f, index) {
  return ipToText(f.containerNet + (BigInt(index) << f.cellShift), f.v) +
         '/' + f.cellLen;
}
function containerName(f) {
  return ipToText(f.containerNet, f.v) + '/' + f.containerLen;
}

/* ── cache: public routing facts only, never anything about you ────── */

function cacheGet(k) {
  try {
    var raw = localStorage.getItem(CACHE_KEY + k);
    if (!raw) return null;
    var o = JSON.parse(raw);
    return (!o || Date.now() - o.t > CACHE_TTL) ? null : o.d;
  } catch (_) { return null; }
}
function cacheSet(k, d) {
  try { localStorage.setItem(CACHE_KEY + k, JSON.stringify({ t: Date.now(), d: d })); }
  catch (_) { /* private mode or full quota: not a failure worth showing */ }
}
