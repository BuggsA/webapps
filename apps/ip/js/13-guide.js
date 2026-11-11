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

/* The axis moved: travelling, not looking. He waits. (MOVING_QUIET above
 * is measured from here.) */
function noteAxisMoved() {
  lastAxisMove = Date.now();
}

/* A place answered. Say something about it, or celebrate it if it is a
 * named place nobody has recorded before. `seen` is how many times the
 * notebook had it BEFORE this visit. */
function greetArrival(rec, seen) {
  /* A named place outranks a generic line and interrupts the cadence,
   * because those are the ones worth hearing. Everything else waits its
   * turn or says nothing at all. */
  var lm = markAt(S.aim, S.home ? S.home.v : 4);
  /* the thirteen share one pool rather than carrying twenty-six near
   * identical lines, and the plate already names which letter */
  var lmId = lm ? (/^Root server /.test(lm.n) ? 'landmark.root' : 'landmark.' + lm.p) : '';
  if (lm) {
    /* A NAMED PLACE, NEVER RECORDED BEFORE. That is the whole condition,
     * and it is deliberately narrow: this has to stay rare or the flare
     * stops being information. Coming back to one is not a find. */
    if (!seen) {
      var fg = activeField();
      if (fg) celebrate(fg.aimX, fg.aimZ, fg.layer, lm.n);
      else showFound(lm.n);
    }
    speak(lmId, 1, seen);
  }
  else if (rec.status === 'ready') speak('arrive.ordinary', 0, seen);
  else if (REG && regAt(S.aim, S.home.v)) speak('arrive.unannounced', 0, seen);
  else speak('arrive.unallocated', 0, seen);
}

/* The registry's opening line ("You are sitting in old space...").
 *
 * It used to fire the moment the registry landed, and the registry only
 * ever landed after the visitor's first move outward. Since 2026-11-11 the
 * registry is fetched at home, for the teaser - so landing is no longer
 * that moment, and firing then would talk over the cold open, which is the
 * one line that has to land. So it waits for the first move out, which is
 * when it always used to be heard. Once a visit. No fallback on purpose:
 * if there is nothing interesting in the record, he says nothing. */
var registryOpenSaid = false;
function sayRegistryOpen() {
  if (registryOpenSaid || !REG || !(S.s > 0.06 || away())) return;
  registryOpenSaid = true;
  speak('open.registry', 1, 0);
}
