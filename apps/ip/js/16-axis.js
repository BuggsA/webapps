/* apps/ip/js/16-axis.js — the scale axis: setting it, stepping it between stops, and its gain.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ AXIS ════════════════════════════════════════════════════════════
 * One scale axis, held rather than stepped. It does not snap: direct
 * manipulation is what makes scale feel like something in the hand, and
 * snapping takes it back out at the end of every gesture. The keyboard
 * moves between whole states, because that is what a keyboard is for.
 */

function setAxis(v) {
  var next = clamp(v, 0, S.maxAxis);
  if (next === S.s) return;
  S.s = next;
  /* the low-water mark of the whole session. Recorded before the ring
   * can rebuild and return early, or a rung crossing would lose it. */
  S.been = S.been === null ? next : Math.min(S.been, next);
  S.gone = S.gone === null ? next : Math.max(S.gone, next);
  /* everything that follows from the move - the guide, the notebook, the
   * cursor, data, the picture, the text - is listed in one place */
  afterAxisMoved(next);
}

/* A deep ladder should FEEL deep, so the gesture does not simply stretch to
 * fit: it scales by the square root of the depth. An IPv6 axis is 3.9x
 * longer than an IPv4 one and takes about 2x the gesture to cross, so each
 * rung still passes at close to the speed it did before, and the extra
 * distance is felt rather than compressed away. Tuning value — look at it
 * on a real deep descent before trusting it. */
function axisGain() { return Math.sqrt(S.maxAxis / 3); }

/* The stops a keyboard moves between: Home, every rung of the ladder, and
 * the announced block, which is the one place on the axis that is a fact
 * about this visitor rather than arithmetic. The pointer is not stepped —
 * it is held — but a keyboard is a stepping instrument and pretending
 * otherwise makes the whole ladder unreachable without a mouse. */
function axisStops() {
  var out = [0], i;
  for (i = 0; i < S.ladder.length; i++) out.push(axisOfLen(S.ladder[i]));
  if (S.net && S.net.status === 'ready') out.push(S.blockAxis);
  out.push(S.maxAxis);
  out.sort(function (a, b) { return a - b; });
  return out;
}

function stepAxis(dir) {
  var st = axisStops(), i, EPS = 1e-4;
  if (dir > 0) {
    for (i = 0; i < st.length; i++) if (st[i] > S.s + EPS) return setAxis(st[i]);
    return setAxis(S.maxAxis);
  }
  for (i = st.length - 1; i >= 0; i--) if (st[i] < S.s - EPS) return setAxis(st[i]);
  return setAxis(0);
}

function setYaw(v) {
  var t = v % 6.2832;
  if (t === S.yaw) return;
  S.yaw = t;
  invalidate();
}
