/* apps/ip/js/13-guide.js — the guide: choosing and speaking a line.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ THE GUIDE ═══════════════════════════════════════════════════════
 * Saying it is a different problem from writing it, and the harder one.
 *
 * There are 47 lines that can fire on an ordinary arrival. Speaking on
 * every one of them would turn a quiet instrument into a game character
 * with ambient barks, which is the opposite of what this is. So the
 * scheduler is not a nicety, it is the feature:
 *
 *   - SILENCE while somebody is moving quickly. If the axis moved in the
 *     last second they are travelling, not looking, and a line lands on
 *     nobody.
 *   - A CADENCE for ordinary lines. Roughly once a minute, no matter how
 *     many blocks get clicked.
 *   - PRECEDENCE. A landmark or a chain beat outranks a generic line and
 *     interrupts it. Those are the ones worth hearing.
 *   - NO REPEATS within a session, which is what the pool is for.
 *   - A MUTE that persists, and the plate never goes quiet with him. The
 *     facts are not his to withhold.
 *
 * Silence is a resource: the rare unguarded lines only land if there is
 * quiet around them. See docs/ip-guide-voice.md. */

var GUIDE_KEY = 'ip.v1.guide';



var GENERIC_GAP = 55000;   /* ordinary lines: about once a minute */
var MOVING_QUIET = 1000;   /* travelling, not looking */
var lastSpoke = 0;

var lastAxisMove = 0;

var guideTimer = 0;

function guideWanted() {
  try { return localStorage.getItem(GUIDE_KEY) !== '0'; } catch (_) { return true; }
}

function setGuide(on) {
  S.guide = !!on;
  try { localStorage.setItem(GUIDE_KEY, S.guide ? '1' : '0'); } catch (_) { }
  if (!S.guide) showGuide('');
  if (el.guideBtn) {
    el.guideBtn.setAttribute('aria-pressed', S.guide ? 'true' : 'false');
    el.guideBtn.textContent = S.guide ? 'Guide on' : 'Guide';
  }
}

function showGuide(text) {
  if (!el.guide) return;
  if (guideTimer) { clearTimeout(guideTimer); guideTimer = 0; }
  el.guide.textContent = text || '';
  el.guide.hidden = !text;
  if (text) {
    /* long enough to read twice, then gone. He does not hold the floor. */
    guideTimer = setTimeout(function () {
      el.guide.hidden = true; el.guide.textContent = ''; guideTimer = 0;
    }, 4200 + text.length * 45);
  }
}

/* rank 0 = generic and interruptible, 1 = a named place or a chain beat */
function speak(bucketId, rank, seen) {
  if (!S.guide || contentState !== 'ready') return false;
  var now = Date.now();
  if (!rank) {
    if (now - lastSpoke < GENERIC_GAP) return false;
    if (now - lastAxisMove < MOVING_QUIET) return false;
  }
  var t = pickLine(bucketId, seen || 0);
  if (!t) return false;
  saidThisSession[t] = 1;
  lastSpoke = now;
  showGuide(t);
  return true;
}
