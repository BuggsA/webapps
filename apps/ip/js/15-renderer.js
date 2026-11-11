/* apps/ip/js/15-renderer.js — choosing a renderer, driving frames, stopping when still.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ RENDERER ════════════════════════════════════════════════════════ */

var needsFrame = true, lastT = 0;

function invalidate() {
  needsFrame = true;
  if (S.running) return;
  S.running = true;
  requestAnimationFrame(tick);
}

function tick(now) {
  var dt = clamp((now - (lastT || now)) / 1000, 0, 0.1);
  lastT = now;
  var moving = false;

  if (!S.reduced) {
    var k = 1 - Math.exp(-dt / 0.13);
    if (Math.abs(S.tx - S.px) > 0.0008 || Math.abs(S.ty - S.py) > 0.0008) {
      S.px += (S.tx - S.px) * k;
      S.py += (S.ty - S.py) * k;
      moving = true;
    } else if (S.px !== S.tx || S.py !== S.ty) {
      /* the last hop onto the exact pose. It counts as a moving frame so
       * that the highlight is redecided once more against where the camera
       * finally came to rest -- without this the ease stops within 0.0008
       * of the target and the pick can settle one cell out. The frame
       * after this one has nothing left to move, so it does not repeat. */
      S.px = S.tx; S.py = S.ty; moving = true;
    }
  }

  if (celFrame(now)) moving = true;

  if (moving || needsFrame) {
    needsFrame = false;
    layers();
    soundFrame();
    /* WHAT THE POINTER IS OVER, decided against the camera as it will
     * actually be drawn this frame.
     *
     * The parallax leans the eye toward the pointer and eases there over
     * about 130 ms. pointermove sets the TARGET of that lean and then
     * immediately asks what is under the pointer -- against the pose the
     * camera has not finished leaving. So the answer was decided by a
     * camera that was about to move, and the highlight settled a little
     * away from the pointer. Measured: the same pixel named
     * 193.10.4.0/24 on the move and 193.11.90.0/24 once the lean had
     * finished.
     *
     * Redeciding here costs a few frames of picking after each move and
     * nothing at rest, and it has to come AFTER layers(), because both
     * pick() and cursorAt() read the layer weights it computes.
     *
     * onTap still reads the stored cursor rather than recasting. That
     * guard is about the gap between the last move and the click, which
     * this does not close. */
    if (moving && S.ptr && !S.reduced) {
      setCursor(cursorAt(S.ptr.x, S.ptr.y));
      pick(S.ptr.x, S.ptr.y);
    }
    if (R) R.frame(S.hot);
    syncDom();
  }
  if (moving) requestAnimationFrame(tick);
  else { S.running = false; lastT = 0; }
}

function resize() {
  S.DPR = Math.min(window.devicePixelRatio || 1, 2);
  S.W = cv.clientWidth;
  S.H = cv.clientHeight;
  needsFrame = false;
  layers();
  if (R) R.frame(S.hot);
  syncDom();
}

function rebuild() {
  buildScene();
  /* where the arrays end with no celebration in them. After the WHOLE
   * scene, not after each rung - the block is built last and truncating to
   * a per-rung length would have thrown it away. */
  celBase = { l: lines.length, p: points.length, o: pools.length };
  if (R) R.upload();
  syncRail();
  syncDom();      /* text updates now, not on the next animation frame */
  invalidate();
}

/* The rail is the only thing on the page that says "there is further to
 * go" without words, so it has to say how MUCH further. It keeps an end —
 * this is a map of a finite thing — but its length is the depth of this
 * address family, and it carries a tick for every rung.
 *
 * Sub-linear on purpose: an IPv6 ladder is 3.9x an IPv4 one, and a rail
 * 3.9x taller would not fit a phone. At the square root it is about twice
 * as long, which reads as "much deeper" and still fits. The ticks carry
 * the exact count for anyone who wants it. */
function syncRail() {
  if (!el.rail || !S.home) return;
  var rel = Math.sqrt(S.maxAxis / (32 / STEP_BITS));   /* 1 for IPv4 */
  el.rail.style.height = 'min(' + (22 * rel).toFixed(1) + 'vh, ' +
                         Math.round(160 * rel) + 'px)';
  var html = '', i, a;
  for (i = 0; i < S.ladder.length; i++) {
    var ra = axisOfLen(S.ladder[i]);
    a = ra / S.maxAxis * 100;
    html += '<i data-a="' + ra.toFixed(4) + '" style="top:' +
            a.toFixed(2) + '%"></i>';
  }
  if (S.net && S.net.status === 'ready') {
    a = S.blockAxis / S.maxAxis * 100;
    html += '<i class="block" style="top:' + a.toFixed(2) + '%"></i>';
  }
  el.railTrack.innerHTML = html;
}
