/* apps/ip/js/28-pullback.js — the first pull: one gesture from home glides out to "You are here".
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* THE FIRST PULL (owner, 2026-11-11: "That is good yes can you work on
 * those 2 first").
 *
 * The most remarkable frame this app can show is the visitor's own amber
 * mark, lit, inside ALL of the address space - one of four billion. It was
 * three separate scroll gestures away, and a scroll over the big address
 * itself did nothing at all, because the address sits above the canvas.
 * Somebody on their way to the store does not do three of anything.
 *
 * So the FIRST outward gesture from home - a scroll anywhere on the page, a
 * swipe up, the arrow key, or the Explore button - glides the axis all the
 * way out to the family's floor, where "You are here" names the mark.
 *
 * WHY THIS DOES NOT BREAK "THE CAMERA BELONGS TO THE HAND HOLDING IT".
 * That rule was written against the camera moving when nobody asked: a
 * re-aim on late data, a fly-to after a click. Here the visitor asked,
 * the glide only ever goes outward along their own axis (it never moves the
 * aim, never centres anything), and ANY input while it runs - a scroll, a
 * touch, a key - stops it dead where it is and is then handled as normal.
 * It happens once per visit; after that the axis is exactly as it always
 * was. Under reduced motion there is no glide: the end frame, at once. */

var pull = null;          /* { t0, from, to, dur } while gliding */
var pulledOnce = false;   /* the automatic first pull happens once a visit */

/* Is the visitor at home, never pulled, with a picture to pull back on? */
function pullEligible() {
  return !pulledOnce && !!R && !!S.home && !away() && S.s < 0.05;
}

function startPull() {
  pulledOnce = true;
  var to = S.maxAxis;
  if (S.reduced) { setAxis(to); announce(); return; }
  /* longer for IPv6: it has ten rungs to cross where IPv4 has under three,
   * and the same speed per rung reads as the same motion */
  var dur = 1300 + 170 * (to - S.s);
  pull = { t0: 0, from: S.s, to: to, dur: Math.min(3200, dur) };
  requestAnimationFrame(pullFrame);
}

function pullFrame(now) {
  if (!pull) return;
  if (!pull.t0) pull.t0 = now;
  var t = clamp((now - pull.t0) / pull.dur, 0, 1);
  /* ease in and out: it should feel like being drawn back, not thrown */
  var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  setAxis(lerp(pull.from, pull.to, e));
  if (t < 1) requestAnimationFrame(pullFrame);
  else { pull = null; announce(); }
}

/* Any input while gliding stops it where it is. */
function stopPull() {
  if (!pull) return false;
  pull = null;
  announce();
  return true;
}

/* A wheel tick. Returns true if this file handled it (the caller then does
 * nothing more with it). A trackpad sends a stream of ticks per gesture,
 * so outward ticks during the glide are swallowed - the glide is already
 * going that way - and only an inward tick, or any other input, stops it. */
function pullWheel(d) {
  if (pull) {
    if (d > 0) return true;
    stopPull();
    return false;
  }
  if (d > 0 && pullEligible()) { startPull(); return true; }
  return false;
}

/* Gestures that start OFF the canvas: the big address and the facts sit
 * above it, so a scroll or a swipe over them never reached the axis.
 * At home those now start the first pull too. Buttons, links and the
 * panels keep their own behaviour. */
function setupPull() {
  function offCanvas(t) {
    return t !== cv && !(t.closest && t.closest('button, a, #aboutPanel, #notePanel, #controls'));
  }
  window.addEventListener('wheel', function (e) {
    if (!offCanvas(e.target) || e.ctrlKey) return;
    var d = e.deltaY;
    if (pullWheel(-d)) e.preventDefault();   /* scroll UP is outward (19-input) */
  }, { passive: false });

  var sw = null;
  window.addEventListener('pointerdown', function (e) {
    if (pull && e.target === cv) stopPull();
    /* touch and pen only: a mouse dragging over the address is selecting
     * it to copy, and a mouse has a wheel */
    sw = (e.pointerType !== 'mouse' && offCanvas(e.target))
      ? { id: e.pointerId, y: e.clientY, x: e.clientX } : null;
  }, true);
  window.addEventListener('pointermove', function (e) {
    if (!sw || sw.id !== e.pointerId) return;
    /* a swipe DOWN is outward, as on the canvas (19-input) */
    var out = e.clientY - sw.y, side = Math.abs(e.clientX - sw.x);
    if (out > 28 && out > side * 1.5) {
      sw = null;
      if (pullEligible()) startPull();
    }
  }, true);
  window.addEventListener('pointerup', function () { sw = null; }, true);
  window.addEventListener('keydown', function () { stopPull(); }, true);
}

/* "You are here": the label on the visitor's own mark, only at the floor
 * of their family - all of IPv4, or the whole space public IPv6 comes from -
 * and only while they are at home. Said once, plainly, with the one number
 * that sizes it. A step of syncDom (24-view). */
function syncHere() {
  if (!el.here) return;
  var ar = activeRung(), fg = activeField();
  var show = !!R && !!S.home && !away() && !!ar && !!fg &&
             ar.len === floorLen(ar.f.v) && layerAlpha[fg.layer] > 0.5;
  if (show) {
    var ws = layerScale[fg.layer];
    var sp = toScreen(viewProj(), (fg.aimX + panX(fg.layer)) * ws, 0.01 * ws,
                      (fg.aimZ + panZ(fg.layer)) * ws);
    if (sp) {
      if (el.hereNote.dataset.v !== String(S.home.v)) {
        el.hereNote.dataset.v = String(S.home.v);
        /* IPv4: 4,096 dots, each 2^20 addresses. IPv6 at 2000::/3: each dot
         * is a /15, 2^113 addresses - 2^81, about 2.4 trillion trillion,
         * times all of IPv4. Both computed, not estimated. */
        el.hereNote.textContent = S.home.v === 6
          ? 'Each dot holds two trillion trillion times all of IPv4.'
          : 'Each dot is about a million addresses.';
      }
      el.here.style.left = clamp(sp.x, 90, S.W - 90) + 'px';
      el.here.style.top = sp.y + 'px';
      el.here.style.opacity = ((layerAlpha[fg.layer] - 0.5) * 2).toFixed(3);
      return;
    }
  }
  el.here.style.opacity = '0';
}

/* The Explore button: the same glide, every time it is pressed at home -
 * a button is not a fine control, and what it promises is the whole view.
 * Anywhere else, one stop outward, as it always was. */
function explorePressed() {
  if (!!R && !!S.home && !away() && S.s < 0.05) startPull();
  else stepAxis(1);
}
