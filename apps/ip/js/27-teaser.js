/* apps/ip/js/27-teaser.js — the teaser: one true line about the visitor's own address, to make them stop.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* THE TEASER (owner, 2026-11-11). The concept is a beautiful sidewalk
 * (docs/ip-concept.md): the visitor came for their IP and gets it at once,
 * and on the way past they see one thing about THEMSELVES that is true and
 * a little surprising. People stop for their own reflection.
 *
 *   "Your address comes from a block registered in 2005, the year YouTube
 *    launched."
 *
 * The year comes from space.bin, which the site already ships, for the
 * block holding the visitor's own address - nobody is asked anything. The
 * sentence and the anchor years are content (content/anchors.json); this
 * file only picks one.
 *
 * It costs the errand nothing: the registry is fetched only once the
 * answer is already on screen and the browser is idle, and the line's
 * space is reserved in the stylesheet so nothing the visitor might be
 * about to tap moves when it lands. */

var ANCHORS = null;
var anchorsState = '';   /* '' | 'loading' | 'ready' | 'none' */

function loadAnchors() {
  if (anchorsState) return;
  anchorsState = 'loading';
  fetch('content/anchors.json?v=' + contentV(), { cache: 'force-cache' })
    .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then(function (j) { ANCHORS = j; anchorsState = 'ready'; showTeaser(); })
    .catch(function () { anchorsState = 'none'; });
}

/* After the answer is up: the anchors (2 KB) and the registry (439 KB), in
 * the browser's idle time, so the first paint and the Copy button never
 * wait on either. Exploring would fetch the registry anyway; this only
 * fetches it earlier. */
function preloadForTeaser() {
  function go() { loadAnchors(); loadRegistry(); }
  if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 1500 });
  else setTimeout(go, 400);
}

/* The sentence for a registration year, or '' if no anchor is close
 * enough. Rules (in anchors.json `_pick`): exact year first, then the
 * nearest anchor after it, then the nearest before it. */
function teaserText(year) {
  if (!ANCHORS || !(year > 0)) return '';
  var list = ANCHORS.anchors || [], max = ANCHORS.maxGap || 4;
  var same = null, after = null, before = null, i, a, d;
  for (i = 0; i < list.length; i++) {
    a = list[i]; d = a.year - year;
    if (d === 0) same = a;
    else if (d > 0 && d <= max && (!after || d < after.year - year)) after = a;
    else if (d < 0 && -d <= max && (!before || -d < year - before.year)) before = a;
  }
  var pick = same || after || before;
  if (!pick) return '';
  var kind = pick === same ? 'same' : pick === after ? 'before' : 'after';
  var gap = (ANCHORS.gaps || [])[Math.abs(pick.year - year)] || '';
  return String((ANCHORS.line || {})[kind] || '')
    .replace('{year}', String(year))
    .replace('{gap}', gap)
    .replace('{event}', pick.event);
}

function showTeaser() {
  if (!el.teaser) return;
  var rec = (S.home && REG) ? regAt(S.home.big, S.home.v) : null;
  var t = rec ? teaserText(rec.year) : '';
  if (el.teaser.textContent === t) return;
  el.teaser.textContent = t;
  el.teaser.classList.toggle('on', !!t);
  /* a long line wraps on a phone; the answer re-measures itself around the
   * amber mark rather than letting the line land on it */
  fitSoon();
}
