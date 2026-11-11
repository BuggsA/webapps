/* apps/ip/js/12-celebration.js — the celebration when something real is found.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ THE CELEBRATION ═════════════════════════════════════════════════
 * The mark ignites, the flare blooms, the floor catches it, a ring runs
 * out across the field, a hard bright line of type, and he says something.
 * The owner's words: this is a good moment and it should feel like one.
 *
 * IT DOES NOT FIRE EVERY TIME. If every recorded place got the full
 * instrument the flare would stop being information and become wallpaper,
 * which is the note the emotional design makes about this exact beat.
 * Ordinary arrivals get a mark and, at most, a dry half-line. This is for
 * a named place you have never recorded before.
 *
 * It is drawn by mutating a handful of primitives and re-uploading, NOT by
 * rebuilding the scene: buildScene costs about twenty milliseconds a rung
 * in BigInt and cannot run per frame, while upload() reads the same arrays
 * and is cheap. So the arrays are truncated back to a saved length each
 * frame and the celebration re-appended.
 *
 * It is not decoration and it does not decorate idle time: it is a
 * response to an event, it happens once, and then the field is quiet
 * again. */

var CEL_MS = 1150;
var celBase = null;    /* array lengths with no celebration in them */
var cel = null;        /* { t0, x, z, layer, label } */

function celebrate(x, z, layer, label) {
  if (S.reduced) { showFound(label); return; }   /* a composed still, not a firework */
  cel = { t0: performance.now(), x: x, z: z, layer: layer, label: label };
  showFound(label);
  strike();
  invalidate();
}

function celFrame(now) {
  if (!cel || !celBase) return false;
  var k = (now - cel.t0) / CEL_MS;
  if (k >= 1) {
    cel = null;
    lines.length = celBase.l; points.length = celBase.p; pools.length = celBase.o;
    if (R) R.upload();
    return false;
  }
  lines.length = celBase.l; points.length = celBase.p; pools.length = celBase.o;

  var ly = cel.layer, x = cel.x, z = cel.z;
  /* IGNITION: hard and early, gone by a third of the way through. The bloom
   * chain does the blooming; this only has to be bright. */
  var ig = Math.pow(Math.max(0, 1 - k * 3), 1.6);
  if (ig > 0.001) {
    P([x, 0.012, z], C.coldHi, 0.9 + 7 * ig, 6 + 16 * ig, ly, 0);
  }
  /* THE FLOOR CATCHES IT: a pool that swells and goes. */
  var pk = Math.pow(Math.max(0, 1 - k * 1.5), 1.4);
  if (pk > 0.002) Pool(x, z, 0.06 + 0.22 * (1 - pk), C.coldHi, 0.5 * pk, ly);

  /* THE RING RUNS OUT. Twenty-eight segments is enough to read as a circle
   * at this size and cheap enough to re-upload every frame. */
  var rk = Math.min(1, k * 1.25);
  var rad = 0.03 + 0.62 * (1 - Math.pow(1 - rk, 2.2));
  var ri = 0.85 * Math.pow(1 - rk, 1.7);
  if (ri > 0.004) {
    var N = 28, i, a0, a1;
    for (i = 0; i < N; i++) {
      a0 = i / N * 6.2832; a1 = (i + 1) / N * 6.2832;
      L([x + Math.cos(a0) * rad, 0.006, z + Math.sin(a0) * rad],
        [x + Math.cos(a1) * rad, 0.006, z + Math.sin(a1) * rad],
        C.coldHi, ri, 1.15, 0.55, ly);
    }
  }
  if (R) R.upload();
  return true;
}

function showFound(label) {
  if (!el.found || !label) return;
  el.found.textContent = label;
  el.found.hidden = false;
  clearTimeout(showFound.t);
  showFound.t = setTimeout(function () {
    el.found.hidden = true; el.found.textContent = '';
  }, 2600);
}
