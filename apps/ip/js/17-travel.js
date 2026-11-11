/* apps/ip/js/17-travel.js — travel, back, asking about the subject, and all input handling.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* CHOOSING, which is not the same as being taken there.
 *
 * The owner's model, and it is better than the two I built before it:
 * "click then that is new focus I zoom in at my pace on it with the center
 * not being what you clicked until you get in far enough."
 *
 * So a click moves the AIM and nothing else. The camera does not move —
 * not instantly, not eased. What the visitor is looking at right now does
 * not change either, because at the scale they are at, the block they
 * picked is inside the same container as the one they were already in:
 * only the marker moves, and the plate fills in underneath.
 *
 * Then they zoom in, at their own pace, and the framing converges on their
 * choice by itself — every rung derives its container from the aim, so the
 * deeper they go the more of the frame is the thing they picked, until it
 * IS the frame. Nothing teleports and nothing is centred before it has
 * earned it.
 *
 * Two earlier versions of this were wrong. Re-aiming the axis at whatever
 * the lookup announced moved the camera on its own, a beat late. Flying to
 * the chosen cell moved it too, and put the visitor somewhere they had not
 * asked to be. The axis belongs to the hand holding it. */
function travelTo(addrBig, remember) {
  if (addrBig === null || addrBig === undefined) return;
  if (S.aim === addrBig) return;
  if (remember && S.aim !== null) {
    S.trail.push(S.aim);
    if (S.trail.length > 64) S.trail.shift();
    S.travelled = true;
  }
  /* the zoom this choice was made at: the frame is container-centred here
   * and slides onto the choice from here inward */
  if (remember) S.pickAxis = S.s;
  if (remember) noteDist(S.aim, addrBig);
  S.aim = addrBig;
  S.subject = (S.home && addrBig === S.home.big) ? S.net : { status: 'loading' };
  rebuild();
  askSubject();
  announce();
}

/* There used to be an `arrive()` here that re-aimed the axis at whatever
 * prefix the lookup turned out to announce. It was a mistake, and the
 * owner named it: "I kind of want the zoom to follow the last click. Not
 * whatever it is."
 *
 * Two things were wrong with it. The camera moved a second time, on its
 * own, after the visitor had already stopped — nothing on screen asked for
 * that and nothing explained it. And it overruled a direct choice with an
 * asynchronous one: you pointed at a block, and the instrument took you
 * somewhere else because a server said so. The announced prefix is still
 * drawn and still named on the plate. It just does not get to steer.
 *
 * THE RULE: the axis goes where the visitor sent it and stops there. */

function back() {
  if (!S.trail.length) { goHome(); return; }
  travelTo(S.trail.pop(), false);
}

/* What is announced at the aim. Same path as every other lookup, and the
 * same three honest states — the instrument does not know anything about
 * a place it has not asked about. */
var askTimer = 0;
function askSubject() {
  clearTimeout(askTimer);
  if (!S.home || S.aim === null) return;
  if (S.home && S.aim === S.home.big) { S.subject = S.net; return; }
  var at = ipToText(S.aim, S.home.v);
  var hit = S.asked[at];
  if (hit && hit.status !== 'loading') {
    applySubject(at, hit);
    if (hit.asn >= 0) loadShape(hit.asn);
    return;
  }
  /* debounced, because stepping sideways moves the aim a cell at a time
   * and a request per keystroke would be rude to RIPE and useless to us */
  askTimer = setTimeout(function () {
    if (S.asked[at]) { applySubject(at, S.asked[at]); return; }
    S.asked[at] = { status: 'loading' };
    ripe('network-info', at).then(function (d) {
      var pr = d && d.prefix;
      var asn = (d && d.asns && d.asns.length) ? parseInt(d.asns[0], 10) : NaN;
      S.asked[at] = (pr && asn >= 0)
        ? { status: 'ready', prefix: pr, asn: asn, holder: '', cidr: parseCidr(pr) }
        : { status: 'empty' };
      applySubject(at, S.asked[at]);
      if (asn >= 0) {
        loadShape(asn);
        ripe('as-overview', 'AS' + asn).then(function (o) {
          var h = tidyHolder(o && o.holder);
          if (h && S.asked[at] && S.asked[at].asn === asn) {
            S.asked[at].holder = h;
            /* the name lands on a later call than the number did, so the
             * logbook gets it when it arrives rather than keeping a
             * network it can only call by its AS number */
            noteHolder(S.asked[at].asn, h);
            if (S.subject === S.asked[at]) { syncDom(); announce(); }
          }
        }).catch(function () {});
      }
    }).catch(function () {
      S.asked[at] = { status: 'empty' };
      applySubject(at, S.asked[at]);
    });
  }, 360);
}
function applySubject(at, rec) {
  if (!S.home || S.aim === null || ipToText(S.aim, S.home.v) !== at) return;
  S.subject = rec;
  /* the notebook records the ANSWER, not the asking: a place becomes a
   * place when it says what it is, including when what it says is that
   * nobody announces it. */
  if (rec && (rec.status === 'ready' || rec.status === 'empty')) {
    var key = (rec.status === 'ready' && rec.prefix) ? rec.prefix : at;
    var seen = seenCount(key);
    noteSite(at, rec);
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
  rebuild();
  announce();
}

function setYaw(v) {
  var t = v % 6.2832;
  if (t === S.yaw) return;
  S.yaw = t;
  invalidate();
}

function setCursor(c) {
  var was = cursor;
  if (!c && !was) return;
  if (c && was && c.key === was.key) return;
  cursor = c;
  /* a cell that can be named is a cell that can be travelled to, and the
   * pointer is the only thing that was ever going to say so */
  cv.classList.toggle('pick', !!(c && c.field) || !!S.hot);
  syncDom();
  invalidate();
}

/* A deep ladder should FEEL deep, so the gesture does not simply stretch to
 * fit: it scales by the square root of the depth. An IPv6 axis is 3.9x
 * longer than an IPv4 one and takes about 2x the gesture to cross, so each
 * rung still passes at close to the speed it did before, and the extra
 * distance is felt rather than compressed away. Tuning value — look at it
 * on a real deep descent before trusting it. */
function axisGain() { return Math.sqrt(S.maxAxis / 3); }

/* LATERAL TRAVEL. Moving sideways is moving the aim along the address
 * line, one cell of the current rung at a time.
 *
 * Deliberately NOT a pan in grid space. A container's 4096 cells would be
 * a wall, and walls are the thing that makes this a slide deck; stepping
 * by address just carries on into the next container, which is what
 * "there is always more space" has to mean if it means anything. The mark
 * walks the Hilbert path on screen rather than travelling in a straight
 * line — which is honest, because that path IS what numerically adjacent
 * looks like laid out in two dimensions. */
function stepAim(cells) {
  if (!S.home || S.aim === null || !cells) return;
  var r = activeRung();
  var cell = r && r.f ? (1n << r.f.cellShift)
           : (S.subject && S.subject.cidr
               ? (1n << BigInt(S.subject.cidr.bits - S.subject.cidr.len))
               : 1n);
  var next = S.aim + BigInt(Math.round(cells)) * cell;
  var top = (1n << BigInt(S.home.bits)) - 1n;
  if (next < 0n) next = 0n;
  if (next > top) next = top;
  if (next === S.aim) return;
  /* stepping does not go on the trail: the trail is for places chosen,
   * not for every cell crossed on the way past them */
  S.aim = next;
  S.subject = { status: 'loading' };
  rebuild();
  askSubject();
}

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

function setupAxis() {
  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    var d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= S.H;
    setAxis(S.s + (e.ctrlKey ? -d : d) * 0.0022 * axisGain());
  }, { passive: false });

  var drag = null;
  cv.addEventListener('pointerdown', function (e) {
    cv.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, y: e.clientY, x: e.clientX, moved: 0 };
  });
  cv.addEventListener('pointermove', function (e) {
    /* if the button came up somewhere we never heard about — the pointer
     * left the window, the tab lost focus — the drag is over. Without
     * this a stale drag keeps travelling on every later move. */
    if (drag && e.buttons === 0) drag = null;
    if (!S.reduced) {
      S.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      S.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      invalidate();
    }
    S.ptr = { x: e.clientX, y: e.clientY };
    /* cursor first: pick() defers to whichever cell the field resolved, so
     * the two cannot disagree about what is being pointed at */
    setCursor(cursorAt(e.clientX, e.clientY));
    pick(e.clientX, e.clientY);
    if (!drag || drag.id !== e.pointerId) return;
    var dy = e.clientY - drag.y, dxp = e.clientX - drag.x;
    drag.moved += Math.abs(dy) + Math.abs(dxp);
    drag.y = e.clientY; drag.x = e.clientX;
    /* dragging up pulls the instrument back: outward.
       dragging sideways TRAVELS, which is the point of the whole thing.
       shift-drag keeps the old behaviour of walking around the subject. */
    if (Math.abs(dy) > 0) setAxis(S.s - dy * 0.0042 * axisGain());
    if (Math.abs(dxp) > 0) {
      if (e.shiftKey) setYaw(S.yaw - dxp * 0.005);
      else {
        drag.pan = (drag.pan || 0) + dxp;
        var cells = drag.pan / 13;
        if (Math.abs(cells) >= 1) {
          stepAim(cells > 0 ? Math.floor(cells) : Math.ceil(cells));
          drag.pan -= Math.trunc(cells) * 13;
        }
      }
    }
  });
  function end(e) {
    if (!drag || drag.id !== e.pointerId) return;
    var wasTap = drag.moved < 8;
    drag = null;
    if (wasTap) onTap();
  }
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', function () {
    S.ptr = null; setCursor(null);
  });
  window.addEventListener('blur', function () { drag = null; });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;   /* shift is ours */
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    switch (e.key) {
      case 'ArrowUp': case 'PageUp':
        e.preventDefault(); stepAxis(1); break;
      case 'ArrowDown': case 'PageDown':
        e.preventDefault(); stepAxis(-1); break;
      case 'ArrowLeft':
        e.preventDefault();
        if (e.shiftKey) setYaw(S.yaw - 0.26); else stepAim(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (e.shiftKey) setYaw(S.yaw + 0.26); else stepAim(1);
        break;
      case 'Backspace': e.preventDefault(); back(); break;
      case 'Enter': case ' ':
        if (cursor && cursor.field) { e.preventDefault(); onTap(); }
        else return;
        break;
      case 'Home': e.preventDefault(); S.yaw = 0; goHome(); break;
      case 'End': e.preventDefault(); setAxis(S.maxAxis); break;
      case 'Escape':
        if (!el.aboutPanel.hidden) closeAbout();
        else if (el.notePanel && !el.notePanel.hidden) closeNote();
        else goHome();
        break;
      default: return;
    }
    announce();
  });
}
