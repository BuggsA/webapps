/* apps/ip/js/26-boot.js — boot: wire everything up, start, and the window.__ip debug surface.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ BOOT ════════════════════════════════════════════════════════════ */

/* Pick a renderer, and survive not getting one.
 *
 * The old line was `makeGL(cv) || make2D(cv)`, and the fallback in it has
 * never once worked. Not because it is never reached — makeGL catches its
 * own shader failures and returns null, so it is reached exactly as
 * intended — but because of this:
 *
 *   A CANVAS CAN ONLY EVER HAVE ONE KIND OF CONTEXT.
 *
 * Once getContext('webgl2') has succeeded, getContext('2d') on that same
 * element returns null forever, whatever happens afterwards. So on a
 * device that HAS WebGL2 but cannot compile the shaders — a phone without
 * highp in fragment shaders, an old GPU, a browser with acceleration off —
 * makeGL took the context, failed, returned null, and then the 2D path
 * could not have the canvas back. Both renderers gone, silently, and a
 * black screen with a perfectly good address sitting on top of it.
 *
 * Falling back therefore means putting a FRESH canvas in place first. The
 * try/catch is kept as well, because a link failure can throw from outside
 * makeGL's own guard, and by then the same rule applies.
 */
function pickRenderer() {
  var force = new URLSearchParams(location.search).get('renderer');
  var tried = false, gl = null;
  if (force !== '2d') {
    tried = true;
    try {
      gl = makeGL(cv);
    } catch (e) {
      S.renderFail = (e && e.message ? String(e.message) : 'WebGL2 failed')
                       .split(String.fromCharCode(10))[0].slice(0, 160);
    }
    if (gl) return gl;
    if (!S.renderFail) S.renderFail = 'WebGL2 present but unusable';
  }
  if (tried) {
    /* the old canvas is spoken for whether makeGL threw or merely gave up;
     * the 2D path needs one nobody has claimed */
    var fresh = document.createElement('canvas');
    fresh.id = cv.id;
    fresh.setAttribute('aria-hidden', 'true');
    cv.parentNode.replaceChild(fresh, cv);
    cv = fresh;
  }
  var two = null;
  try { two = make2D(cv); } catch (e2) { }
  if (!two && !S.renderFail) S.renderFail = 'no renderer';
  return two;
}

function boot() {
  cv = document.getElementById('field');
  grab(['address', 'addressText', 'copy', 'answerNote', 'live',
        'facts', 'factWhere', 'wherePlace', 'whereSub', 'factNet', 'netName',
        'netSub', 'kindName', 'kindSub', 'whereNote', 'explore', 'exploreBtn',
        'exploreHow',
        'plate', 'plateTitle', 'plateSub', 'plateNote',
        'mark', 'markFixed', 'markVary', 'markNote',
        'tipWrap', 'tipFixed', 'tipVary', 'tipMine', 'tipNote',
        'rail', 'railTrack', 'railMark', 'goHome', 'goBack', 'hint',
        'companionState', 'companionSummary', 'companionFacts',
        'about', 'aboutPanel', 'aboutClose', 'aboutBody', 'sound',
        'notebook', 'notePanel', 'noteClose', 'noteBody', 'sight',
        'guide', 'guideBtn', 'found']);

  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  S.reduced = mq.matches;
  try {
    mq.addEventListener('change', function (e) {
      S.reduced = e.matches;
      if (S.reduced) { S.px = S.tx = 0; S.py = S.ty = 0; }
      invalidate();
    });
  } catch (_) { }

  S.DPR = Math.min(window.devicePixelRatio || 1, 2);
  S.W = cv.clientWidth;
  S.H = cv.clientHeight;

  /* THE ADDRESS GOES FIRST, before anything that can fail.
   *
   * index.html: "nothing optional is ever allowed in front of it". A
   * shader is optional and was in front of it. Starting the request here
   * also means it is in flight while the renderer is still compiling,
   * which is strictly better even when everything works. */
  loadAddress();

  buildScene();
  layers();
  R = pickRenderer();
  S.renderer = R ? R.kind : '';
  /* whichever canvas survived that is the one to measure and wire */
  S.W = cv.clientWidth; S.H = cv.clientHeight;
  if (R) { resize(); R.upload(); R.frame(0); }
  syncDom();

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  setupAxis();
  setupCopy();
  /* Off until asked, and the asking is the gesture browsers require
   * anyway. prefers-reduced-motion starts silent even if it was on last
   * time: the people who ask for less movement usually want less noise,
   * and one press gets it back. */
  if (el.guideBtn) {
    el.guideBtn.addEventListener('click', function () { setGuide(!S.guide); });
    setGuide(guideWanted());
  }
  if (el.notebook) {
    el.notebook.addEventListener('click', function () {
      if (el.notePanel.hidden) openNote(); else closeNote();
    });
    el.noteClose.addEventListener('click', closeNote);
  }
  if (el.sound) {
    el.sound.addEventListener('click', function () { setSound(!S.sound); });
    if (soundRemembered() && !S.reduced) {
      /* remembered, but still not running until they touch something */
      var wake = function () {
        document.removeEventListener('pointerdown', wake, true);
        document.removeEventListener('keydown', wake, true);
        setSound(true);
      };
      document.addEventListener('pointerdown', wake, true);
      document.addEventListener('keydown', wake, true);
    }
  }
  el.goHome.addEventListener('click', goHome);
  window.addEventListener('resize', fitSoon);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);
  /* one stop outward, exactly what ArrowDown does: the press is the hand */
  if (el.exploreBtn) el.exploreBtn.addEventListener('click', function () {
    stepAxis(1);
  });
  if (el.goBack) el.goBack.addEventListener('click', back);
  el.about.addEventListener('click', function () {
    if (aboutOpen) closeAbout(); else openAbout();
  });
  el.aboutClose.addEventListener('click', closeAbout);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(invalidate);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else boot();

/* for the build's own checks only */
window.__ip = {
  renderer: function () { return S.renderer; },
  axis: function (v) { if (v !== undefined) setAxis(v); return S.s; },
  net: function () { return S.net; },
  reg: function (t) {
    var a = parseIp(t);
    return a ? regAt(a.big, a.v) : null;
  },
  /* WHERE YOU HAVE BEEN, counted rather than eyeballed.
   *
   * Exists because the visited states were unreachable for their whole
   * life and nobody noticed: they fail SILENTLY, by drawing the same
   * picture as an unvisited cell. A screenshot cannot tell you the
   * difference between "no cells are visited" and "the lookup is dead",
   * which is exactly how it survived. `answered` against `drawn` is the
   * check: if you have been places and `drawn` is 0 at every rung, the
   * mapping is broken again. */
  been: function () {
    var out = [], i, ly, fg, k, n = 0;
    for (k in S.asked) if (S.asked[k] && S.asked[k].status !== 'loading') n++;
    for (i = 0; i < SLOTS; i++) {
      ly = LY.SLOT0 + i; fg = fieldGeoms[ly];
      if (!fg || !fg.f) continue;
      var b = fg.f.been || {}, c = 0, ready = 0, kk;
      for (kk in b) { c++; if (b[kk].status === 'ready') ready++; }
      out.push({ len: fg.f.containerLen, drawn: c, announced: ready });
    }
    return { answered: n, rungs: out };
  },
  query: function (q) { setQuery(q); return S.query; },
  lay: function () {
    var out = [], i, ly, fg;
    for (i = 0; i < SLOTS; i++) {
      ly = LY.SLOT0 + i; fg = fieldGeoms[ly];
      if (!fg) continue;
      var L = fg.lay;
      out.push({ len: fg.f.containerLen, k: L && L.k,
                 ox: L && L.ox, oy: L && L.oy,
                 gxAim: L && L.gx[fg.f.idx], gyAim: L && L.gy[fg.f.idx],
                 gx0: L && L.gx[0], gx1: L && L.gx[1],
                 aimX: fg.aimX, aimZ: fg.aimZ, step: fg.step,
                 scale: layerScale[ly] });
    }
    return { ref: S.ref && { k: S.ref.k, x: String(S.ref.x), y: String(S.ref.y) },
             fields: out };
  },
  regState: function () {
    return { state: regState, built: REG && REG.built,
             v4: REG && REG.n4, v6: REG && REG.n6,
             keys: REG && REG.rir.length };
  },
  aim: function () { return S.home && S.aim !== null ? ipToText(S.aim, S.home.v) : null; },
  subject: function () { return S.subject; },
  travel: function (t) { var a = parseIp(t); if (a) travelTo(a.big, true); return S.aim; },
  step: function (n) { stepAim(n); },
  back: back,
  home: goHome,
  trail: function () { return S.trail.length; },
  celebrate: function (label) {
    var fg = activeField();
    if (!fg) return 'no field on screen to celebrate in';
    celebrate(fg.aimX, fg.aimZ, fg.layer, label || 'Test find');
    return 'celebrating';
  },
  cel: function () {
    return { running: !!cel, base: celBase,
             lines: lines.length, points: points.length, pools: pools.length };
  },
  guide: function (bucket, seen) {
    if (bucket) return pickLine(bucket, seen || 0);
    return { state: contentState, on: S.guide,
             buckets: CONTENT ? CONTENT.guide.lines.length : 0,
             chains: CONTENT ? CONTENT.chains.lines.length : 0,
             tags: visitorTags(), saidThisSession: Object.keys(saidThisSession).length,
             msSinceSpoke: lastSpoke ? Date.now() - lastSpoke : null,
             msSinceAxisMoved: lastAxisMove ? Date.now() - lastAxisMove : null };
  },
  /* Where the highlight is drawn, against where the mark it names
   * actually is. Half-cell drift between those two has now been found
   * three times in this file, and it is invisible at a small window --
   * half a cell is about a pixel -- so it wants a probe rather than an
   * eye. Both should be the same point, to the pixel. */
  cur: function () {
    if (!cursor) return null;
    var ly = cursor.layer === undefined ? LY.BLOCK : cursor.layer;
    var ws = layerScale[ly], VP = viewProj();
    var orb = toScreen(VP, (cursor.x + panX(ly)) * ws, cursor.y * ws,
                           (cursor.z + panZ(ly)) * ws);
    var g = activeField(), markPt = null;
    if (g && g.lay && cursor.idx !== undefined) {
      var L = g.lay, st = g.step;
      var mxw = SCREEN_X((L.gx[cursor.idx] + 0.5 - L.ox) * st);
      var mzw = (L.gy[cursor.idx] + 0.5 - L.oy) * st;
      markPt = toScreen(VP, (mxw + panX(ly)) * ws, 0.006 * ws,
                            (mzw + panZ(ly)) * ws);
    }
    return { orb: orb, mark: markPt, text: cursor.text };
  },
  snd: function () {
    if (!snd) return { on: S.sound, built: false };
    var v = [], i;
    for (i = 0; i < snd.voices.length; i++) {
      v.push({ hz: +snd.voices[i].osc.frequency.value.toFixed(2),
               g: +snd.voices[i].gain.gain.value.toFixed(4) });
    }
    return { on: S.sound, built: true, state: snd.ctx.state,
             master: +snd.master.gain.value.toFixed(4), voices: v };
  },
  probe: function () {
    layers();
    return { s: S.s, maxAxis: S.maxAxis, anchor: S.anchor,
             blockAxis: S.blockAxis, ladder: S.ladder.slice(),
             rungKey: S.rungKey, live: rungKey(),
             rungs: S.rungs.map(function (r, i) {
               return r ? { len: r.len, axis: r.axis, slot: i,
                            alpha: layerAlpha[LY.SLOT0 + i] } : null;
             }),
             blockAlpha: layerAlpha[LY.BLOCK], homeAlpha: layerAlpha[LY.HOME],
             /* where the chosen block actually lands on screen, which is
                the only way to check that it travels to the middle */
             /* where the chosen block lands on screen IN EVERY LIVE
                LAYER. If two layers that are cross-fading disagree, the
                visitor sees the same block in two places at once, which is
                exactly what a transition falling apart looks like. */
             aimScreen: (function () {
               var out = [], i, ly, fg, ws, sp;
               for (i = 0; i < SLOTS; i++) {
                 ly = LY.SLOT0 + i; fg = fieldGeoms[ly];
                 if (!fg || layerAlpha[ly] < 0.02) continue;
                 ws = layerScale[ly];
                 sp = toScreen(viewProj(), (fg.aimX + panX(ly)) * ws,
                               0.01 * ws, (fg.aimZ + panZ(ly)) * ws);
                 if (sp) out.push({ len: fg.f.containerLen,
                                    a: +layerAlpha[ly].toFixed(2),
                                    x: Math.round(sp.x), y: Math.round(sp.y) });
               }
               return { cx: Math.round(S.W / 2), cy: Math.round(S.H / 2), layers: out };
             })() };
  }
};
