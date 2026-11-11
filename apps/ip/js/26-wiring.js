/* apps/ip/js/26-wiring.js — what happens after the axis moves, and after a place answers.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* THE WIRING (owner, 2026-11-11: "do the wiring file next").
 *
 * Two moments fan out into most of the app, and they used to do it from
 * the middle of their own logic: setAxis reached into the guide, the
 * notebook, the cursor, the data, the scene and the page; applySubject
 * into the notebook, the content, the flare, the guide and the page.
 * Reading either one meant reading nine files to know what a zoom or an
 * arrival actually does.
 *
 * Now each of them changes its own state and calls one function here, and
 * this file is the whole answer to "what happens when". Each step is one
 * call into the file that owns it. THE ORDER IS BEHAVIOUR - it is the
 * order the steps always ran in, and it was proven identical to the
 * single-file app. Add a reaction by adding a line, in the right place. */

/* After the axis moves (16-axis: setAxis, once S.s / S.been / S.gone are
 * set). */
function afterAxisMoved(next) {
  noteAxisMoved();     /* 13-guide: travelling, not looking. he waits. */
  noteDepth(next);     /* 11-notebook: the deepest and furthest held */
  dropFadedCursor();   /* 17-pick: nothing invisible stays named */
  ensureData();        /* 20-network, 21-registry: fetch once the visitor leaves */
  sayRegistryOpen();   /* 13-guide: once, on the first move out, if it has landed */
  /* the ring: when the axis moves far enough that a slot has to start
   * showing a different rung, the geometry is rebuilt. Everywhere else
   * this is just a uniform change and costs nothing. A rebuild syncs the
   * page itself, so it returns here. */
  if (S.home && rungKey() !== S.rungKey) { rebuild(); return; }
  /* and the text moves NOW. Which state owns the plate changes
   * continuously between rungs, not only when one is crossed, so leaving
   * this to the frame leaves the plate naming a rung the axis has already
   * travelled past. */
  syncDom();           /* 24-view */
  invalidate();        /* 15-renderer: one more frame */
}

/* After a place answers (18-travel: applySubject, once S.subject is set).
 */
function afterSubjectResolved(at, rec) {
  /* the notebook records the ANSWER, not the asking: a place becomes a
   * place when it says what it is, including when what it says is that
   * nobody announces it. */
  if (rec && (rec.status === 'ready' || rec.status === 'empty')) {
    var seen = recordArrival(at, rec);   /* 11-notebook */
    greetArrival(rec, seen);             /* 13-guide, 12-celebration */
  }
  rebuild();           /* 07-scene: the picture */
  announce();          /* 23-words: the words, for assistive technology */
}

/* After the registry lands (21-registry). Since 2026-11-11 that can be at
 * home - it is fetched early for the teaser - or after the first move. */
function afterRegistryLoaded() {
  rebuild();           /* 07-scene: ages and countries on the fields */
  announce();          /* 23-words */
  showTeaser();        /* 27-teaser: the line about their own block */
  sayRegistryOpen();   /* 13-guide: only if they have already moved out */
}
