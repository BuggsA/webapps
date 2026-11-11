/* apps/ip/js/18-travel.js — moving the aim: travel, back, Home, stepping, and asking what is there.
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

function goHome() {
  S.yaw = 0;
  S.pickAxis = null;
  S.trail.length = 0;
  /* Seeded at the home axis, not left null. setAxis returns early when the
   * axis is already where it is asked for, so relying on it to seed these
   * leaves the visitor's own starting rung marked unvisited -- and they
   * are standing on it. */
  S.been = 0;
  S.gone = 0;
  S.aim = S.home ? S.home.big : null;
  S.subject = S.net;
  rebuild();
  setAxis(0);
  if (el.address) el.address.focus({ preventScroll: true });
}

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
