/* apps/ip/js/29-chains.js — the stories: chains from content/lines.json, the tracker, and earned lenses.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ THE STORIES ═════════════════════════════════════════════════════
 * Owner, 2026-11-11: "can you work on wiring up the stories. Also making
 * sure it is engaging and interesting?" Plan of record: phase 1 of
 * docs/ip-build-plan-v3.md, the chain engine. Until today nine chains and
 * their beats were loaded and never read.
 *
 * WHAT A CHAIN IS. A row in content/lines.json: a title, beats in order,
 * a reveal, maybe a lens it grants. Each beat names a `rule` - the test
 * this file knows how to run - and a `goal`, the tracker's one line. A new
 * chain built from existing rules is rows only. A new KIND of beat is a new
 * case in beatMet(), and nothing else.
 *
 * THE RULES OF PLAY, all from docs/ip-plan-v2.md:
 *   - Chains are offers, never requirements. The main line is offered
 *     unprompted; a side line is offered when its next place is in view
 *     (it appears in "From here you can see"), and any of them can simply
 *     be stumbled into - the ones nobody was told about.
 *   - Hitting an objective is LOUD: the flare, the ring, his line, and the
 *     objective visibly crossing off. A beat that completes in silence may
 *     as well not exist.
 *   - Crossed-off is kept and visible, never cleared.
 *   - The camera belongs to the hand holding it. A goal you can touch
 *     moves the AIM (like a sightline) or asks the map a question. It never
 *     zooms for you; "pull back" goals are words, not buttons.
 *   - Lit = known: every beat is met by something that actually happened
 *     on screen, and his line is said only once it has.
 *
 * Progress lives in the notebook (note.lines), forward compatible like
 * everything else there. Beats are recorded by their index in the file, so
 * a visitor on IPv4 at home and IPv6 at work keeps one set of progress. */

var TRACK_KEY = 'ip.v1.track';    /* 'min' (default) | 'full' | 'hidden' */
var chainTimer = 0;               /* the queue of things he has to say */
var trackFlash = null;            /* { id, until }: the line that just advanced */
var trackKey = null;
var homeShapeAt = null;           /* { asn, addr }: another block of their own network */

function chainLines() {
  return (CONTENT && CONTENT.chains && CONTENT.chains.lines) || [];
}

function chainSt(id, make) {
  var n = noteLoad();
  if (!n.lines || typeof n.lines !== 'object') n.lines = {};
  if (!n.lines[id] && make) n.lines[id] = { d: [], k: [], t: 0, done: 0 };
  return n.lines[id] || null;
}

function tagsHave(list) {
  var tags = visitorTags();
  for (var i = 0; i < list.length; i++) if (tags.indexOf(list[i]) < 0) return false;
  return true;
}

/* An `at` beat's address in THIS visitor's family, or null. The map is one
 * family at a time, so an IPv4 address is unreachable from IPv6 until the
 * doors exist - and a beat that can never be met is skipped, not offered
 * (PRODUCT_SOUL §8.11, content that can never fire). */
function beatAddr(b) {
  if (!b || b.rule !== 'at' || !S.home) return null;
  var a = parseIp(S.home.v === 6 ? (b.at6 || b.at) : b.at);
  return a && a.v === S.home.v ? a.big : null;
}

/* Another block the visitor's own network announces, as far from them as
 * possible: "same network, different part of the map entirely". null =
 * not known yet; false = their network has no other block in this family. */
function sameNetTarget() {
  if (!S.home || !S.net || S.net.status !== 'ready') return S.net && S.net.status === 'none' ? false : null;
  if (homeShapeAt && homeShapeAt.asn === S.net.asn) return homeShapeAt.addr;
  var sh = S.shape;
  if (!sh || sh.asn !== S.net.asn || sh.status !== 'ready') return null;
  var best = null, bd = -1n, i, p, d;
  for (i = 0; i < sh.list.length; i++) {
    p = sh.list[i];
    if (p.v !== S.home.v || (S.home.big >= p.net && S.home.big <= p.last)) continue;
    d = p.net > S.home.big ? p.net - S.home.big : S.home.big - p.net;
    if (d > bd) { bd = d; best = p.net; }
  }
  homeShapeAt = { asn: S.net.asn, addr: best === null ? false : best };
  return homeShapeAt.addr;
}

function nearestRoot() {
  if (!S.home) return null;
  var from = S.aim !== null ? S.aim : S.home.big, best = null, bd = -1n, i, m, d;
  for (i = 0; i < MARKS.length; i++) {
    m = MARKS[i];
    if (m.v !== S.home.v || !/^Root server /.test(m.n)) continue;
    d = m.net > from ? m.net - from : from - m.net;
    if (bd < 0n || d < bd) { bd = d; best = m.net; }
  }
  return best;
}

/* Can this visitor ever meet this beat? */
function beatLive(b) {
  if (!S.home || !b.rule || b.rule === 'other-family' || b.rule === 'inward') return false;
  if (b.only && !tagsHave(b.only)) return false;
  if (b.rule === 'at') return beatAddr(b) !== null;
  if (b.rule === 'same-network') return sameNetTarget() !== false;
  /* nothing announces them: there is no block of theirs to pull back to */
  if (b.rule === 'own-block') return !(S.net && S.net.status === 'none');
  return true;
}

function liveBeats(l) {
  var out = [];
  for (var i = 0; i < l.beats.length; i++) if (beatLive(l.beats[i])) out.push(i);
  return out;
}

/* Offered to this visitor at all: shipped, theirs, and more than one beat
 * long - a chain of one is a fact, not a story. */
function chainUsable(l) {
  if (l.provisional || !S.home) return false;
  if (l.only && !tagsHave(l.only)) return false;
  return liveBeats(l).length >= 2;
}

function chainGateOpen(l) {
  var n = l.needs || [];
  for (var i = 0; i < n.length; i++) {
    var s = chainSt(n[i]);
    if (!s || !s.done) return false;
  }
  return true;
}

function chainNext(l, after) {
  var s = chainSt(l.id), live = liveBeats(l), i;
  for (i = 0; i < live.length; i++) {
    if (after !== undefined && live[i] <= after) continue;
    if (!s || s.d.indexOf(live[i]) < 0) return live[i];
  }
  return -1;
}

function chainProgress(l) {
  var s = chainSt(l.id), live = liveBeats(l), n = 0;
  for (var i = 0; i < live.length; i++) if (s && s.d.indexOf(live[i]) >= 0) n++;
  return { n: n, of: live.length };
}

/* Started, unfinished, and still playable here. */
function chainOpen(l) {
  var s = chainSt(l.id);
  return !!(s && s.d.length && !s.done && chainUsable(l) && chainGateOpen(l));
}

/* Did this event meet this beat? The vocabulary of the stories. */
function beatMet(b, ev, l) {
  var v = S.home.v, rec = ev.rec, s = chainSt(l.id), r;
  switch (b.rule) {
    case 'copied':
      return ev.kind === 'copied';
    case 'own-block':
      return ev.kind === 'axis' && !!S.net && S.net.status === 'ready' &&
             S.s >= S.blockAxis - 0.02;
    case 'whole-family':
      return ev.kind === 'axis' && S.s >= S.maxAxis - 0.02;
    case 'same-network':
      return ev.kind === 'arrive' && rec.status === 'ready' && !!S.net &&
             S.net.status === 'ready' && rec.asn === S.net.asn &&
             rec.prefix !== S.net.prefix &&
             !(rec.cidr && S.home.big >> BigInt(rec.cidr.bits - rec.cidr.len) ===
               rec.cidr.net >> BigInt(rec.cidr.bits - rec.cidr.len));
    case 'root':
      r = ev.kind === 'arrive' ? markAt(ev.big, v) : null;
      return !!r && /^Root server /.test(r.n);
    case 'other-origin':
      return ev.kind === 'arrive' && rec.status === 'ready' && rec.asn >= 0 &&
             !(S.net && S.net.asn === rec.asn);
    case 'at':
      return ev.kind === 'arrive' && atIn(beatAddr(b), ev.big, rec);
    case 'query-cc':
      return ev.kind === 'query' && !!S.query && S.query.kind === 'cc' &&
             S.query.value === b.cc;
    case 'quiet':
      if (ev.kind !== 'arrive' || rec.status !== 'empty' || !REG) return false;
      r = regAt(ev.big, v);
      return !!(r && r.year && r.year < 2000) &&
             !(s && s.k.indexOf('q' + regIndex(ev.big, v)) >= 0);
    case 'cc-mismatch':
      return ev.kind === 'mismatch' && !(s && s.k.indexOf('r' + ev.rir) >= 0);
  }
  return false;
}

/* Is the place that answered the beat's place? Exactly; or inside the
 * block that answered; or in the same cell of the rung it was chosen at,
 * so long as cells there are no bigger than a /8 of IPv4 or a /32 of IPv6
 * - pointing at "somewhere near 12.0.0.0" from the whole of IPv4 is not
 * having found it. */
function atIn(target, big, rec) {
  if (target === null || big === undefined) return false;
  if (big === target) return true;
  if (rec && rec.status === 'ready' && rec.cidr) {
    var h = BigInt(rec.cidr.bits - rec.cidr.len);
    if ((big >> h) === (target >> h)) return true;
  }
  var r = activeRung();
  if (r && r.f && S.home) {
    var cellLen = S.home.bits - Number(r.f.cellShift);
    if (cellLen >= (S.home.v === 4 ? 8 : 32)) {
      return (big >> r.f.cellShift) === (target >> r.f.cellShift);
    }
  }
  return false;
}

/* Record a beat. Returns what happened, for the telling. */
function chainMark(l, i, ev, quiet) {
  var s = chainSt(l.id, true), first = !s.d.length;
  if (s.d.indexOf(i) < 0) s.d.push(i);
  s.t = Date.now();
  var b = l.beats[i];
  if (b.rule === 'quiet') s.k.push('q' + regIndex(ev.big, S.home.v));
  if (b.rule === 'cc-mismatch') s.k.push('r' + ev.rir);
  var done = chainNext(l) < 0;
  if (done) {
    s.done = Date.now();
    if (l.grants) {
      var n = noteLoad();
      if (!n.lens || typeof n.lens !== 'object') n.lens = {};
      n.lens[l.id] = 1;
    }
  }
  noteSave();
  return quiet ? null : { l: l, b: b, opened: first && l.kind !== 'main', done: done };
}

/* Something happened. Test every open chain's current beat against it. */
function chainEvent(ev) {
  if (!CONTENT || !S.home) return false;
  var hits = [];
  chainLines().forEach(function (l) {
    if (!chainUsable(l) || !chainGateOpen(l)) return;
    var s = chainSt(l.id);
    if (s && s.done) return;
    var i = chainNext(l);
    if (i < 0) return;
    if (beatMet(l.beats[i], ev, l)) { hits.push(chainMark(l, i, ev)); return; }
    /* a soft beat ("copy your address") can be walked past: if the one
     * after it is met, it is crossed off without a word */
    if (l.beats[i].soft) {
      var j = chainNext(l, i);
      if (j >= 0 && beatMet(l.beats[j], ev, l)) {
        chainMark(l, i, ev, true);
        hits.push(chainMark(l, j, ev));
      }
    }
  });
  if (!hits.length) return false;
  /* The loudest first: a finished line, then the main line, then the rest.
   * Every hit crosses off; only the first gets his voice, because three
   * paragraphs at once is a wall, not a moment. */
  hits.sort(function (a, b) {
    return (b.done - a.done) || ((a.l.kind === 'main' ? 0 : 1) - (b.l.kind === 'main' ? 0 : 1));
  });
  var h = hits[0], p = chainProgress(h.l);
  var label = h.done ? h.l.title + ' — complete'
            : h.opened ? 'New line · ' + h.l.title
            : h.l.title + ' · ' + p.n + ' of ' + p.of;
  var fg = activeField();
  if (fg) celebrate(fg.aimX, fg.aimZ, fg.layer, label);
  else { showFound(label); strike(); }
  chainSay(h.done ? [h.b.say, h.l.reveal, h.l.grants && h.l.grants.say] : [h.b.say]);
  /* a finished line that teaches the map a new question asks it at once:
   * the consequence is seen, not described. Touching the plate clears it. */
  if (h.done && h.l.grants) setQuery(lensQuery(h.l.grants));
  trackFlash = { id: h.l.id, until: Date.now() + 2400 };
  setTimeout(function () { trackFlash = null; trackKey = null; syncTrack(); }, 2500);
  trackKey = null;
  syncDom();
  return true;
}

/* His part. In order, each long enough to read, and only while he is on.
 * The facts - the crossing off, the reveal in the notebook - do not wait
 * for him. */
function chainSay(list) {
  clearTimeout(chainTimer);
  list = list.filter(Boolean);
  if (!list.length || !S.guide || contentState !== 'ready') return;
  (function next(i) {
    if (!S.guide) return;
    var t = list[i];
    saidThisSession[t] = 1;
    lastSpoke = Date.now();
    showGuide(t);
    if (i + 1 < list.length) {
      chainTimer = setTimeout(function () { next(i + 1); }, 4200 + t.length * 45 + 500);
    }
  })(0);
}

/* ── the moments, called from 26-wiring ─────────────────────────────── */

/* A place answered. True if a beat was met there, so the ordinary greeting
 * stands aside for it. */
function chainsOnArrival(at, rec) {
  if (!S.home || S.aim === null) return false;
  var big = S.aim, hit = chainEvent({ kind: 'arrive', at: at, rec: rec, big: big });
  /* Where the map is wrong: needs the origin network's own country, which
   * is one RIPEstat lookup by AS NUMBER, never by address - and only asked
   * for once the line is actually open to this visitor. */
  var l = chainLines().filter(function (x) { return x.id === 'map-is-wrong'; })[0];
  if (l && rec.status === 'ready' && rec.asn >= 0 && REG && chainUsable(l) &&
      chainGateOpen(l) && chainNext(l) >= 0) {
    var r = regAt(big, S.home.v);
    if (r && /^[A-Z]{2}$/.test(r.cc)) {
      ripe('rir-stats-country', 'AS' + rec.asn).then(function (d) {
        var loc = d && d.located_resources && d.located_resources[0] &&
                  d.located_resources[0].location;
        if (!loc || loc === r.cc || S.aim !== big) return;
        chainEvent({ kind: 'mismatch', rir: r.rir, big: big });
      }).catch(function () {});
    }
  }
  return hit;
}

function chainsAfterAxis() { if (CONTENT) chainEvent({ kind: 'axis' }); }
function chainsAfterCopy() { chainEvent({ kind: 'copied' }); }
function chainsAfterQuery() { if (S.query) chainEvent({ kind: 'query' }); }

/* ── where a goal points ────────────────────────────────────────────── */

/* What touching a goal does: { addr } moves the aim there, { query } asks
 * the map. Nothing here moves the camera. null = it is words only. */
function beatTarget(b) {
  switch (b.rule) {
    case 'at': var a = beatAddr(b); return a === null ? null : { addr: a };
    case 'root': var rt = nearestRoot(); return rt === null ? null : { addr: rt };
    case 'same-network': var sn = sameNetTarget(); return sn ? { addr: sn } : null;
    case 'query-cc': return { query: { kind: 'cc', value: b.cc } };
  }
  return null;
}

function goTarget(t) {
  if (!t) return;
  if (t.addr !== undefined) travelTo(t.addr, true);
  else if (t.query) setQuery(t.query);
}

/* STORIES ON THE HORIZON, for 22-query's "From here you can see". The
 * tracked line's next place if it is in this field, else the first beat
 * of a line not yet started whose place is - which is how a side line is
 * offered "once you are near". One at most: it is a direction, not a list. */
function chainSights(f) {
  if (!CONTENT || !S.home || !f || f.containerNet === undefined) return [];
  var lo = f.containerNet, hi = lo + (BigInt(FIELD * FIELD) << f.cellShift) - 1n;
  var cur = trackLine(), cands = [], i, l, s;
  if (cur) cands.push(cur);
  var all = chainLines();
  for (i = 0; i < all.length; i++) {
    l = all[i]; s = chainSt(l.id);
    if (l !== cur && !(s && s.d.length) && chainUsable(l) && chainGateOpen(l)) cands.push(l);
  }
  for (i = 0; i < cands.length; i++) {
    l = cands[i];
    var bi = chainNext(l);
    if (bi < 0) continue;
    var t = beatTarget(l.beats[bi]);
    if (!t) continue;
    if (t.addr !== undefined) {
      if (t.addr < lo || t.addr > hi || t.addr === S.aim) continue;
      /* the line you are following names the PLACE ("Root server K");
       * a line not yet started names itself, which is the hook */
      var mk = markAt(t.addr, S.home.v);
      return [{ label: l === cur ? (mk ? mk.n : ipToText(t.addr, S.home.v)) : l.title,
                addr: t.addr, story: true }];
    }
    if (t.query && f.reg && REG) {
      if (S.query && S.query.kind === 'cc' && S.query.value === t.query.value) continue;
      for (var k = 0; k < FIELD * FIELD; k++) {
        var key = f.reg.key[k];
        if (key >= 0 && REG.cc[key] === t.query.value) {
          return [{ label: l.title, addr: 'q:' + t.query.value, story: true,
                    go: (function (q) { return function () { setQuery(q); }; })(t.query) }];
        }
      }
    }
  }
  return [];
}

/* ── lenses: what finishing a line lets you ask ─────────────────────── */

function lensQuery(g) {
  return g.kind === 'before' ? { kind: 'before', value: g.value } : { kind: g.kind, value: 1 };
}

function lensesEarned() {
  var n = noteLoad(), out = [];
  chainLines().forEach(function (l) {
    if (l.grants && n.lens && n.lens[l.id]) out.push(l.grants);
  });
  return out;
}

/* ── the tracker ────────────────────────────────────────────────────── */

function trackMode() {
  try { var m = localStorage.getItem(TRACK_KEY); return m === 'full' || m === 'hidden' ? m : 'min'; }
  catch (_) { return 'min'; }
}

function setTrackMode(m) {
  try { localStorage.setItem(TRACK_KEY, m); } catch (_) { }
  trackKey = null;
  syncTrack();
  if (el.notePanel && !el.notePanel.hidden) buildNotebook();
}

/* Which line the tracker follows: the one pinned, else the one most
 * recently advanced, else the main line. A finished line is not followed,
 * except for the moment it finishes, so the crossing-off is seen. */
function trackLine() {
  var n = noteLoad(), all = chainLines(), best = null, bt = -1, i, l, s;
  if (trackFlash) {
    for (i = 0; i < all.length; i++) if (all[i].id === trackFlash.id) return all[i];
  }
  for (i = 0; i < all.length; i++) {
    l = all[i];
    if (n.pin === l.id && chainOpen(l)) return l;
  }
  for (i = 0; i < all.length; i++) {
    l = all[i]; s = chainSt(l.id);
    if (chainOpen(l) && s.t > bt) { bt = s.t; best = l; }
  }
  if (best) return best;
  for (i = 0; i < all.length; i++) {
    l = all[i]; s = chainSt(l.id);
    if (l.kind === 'main' && chainUsable(l) && !(s && s.done)) return l;
  }
  return null;
}

function pinLine(id) {
  var n = noteLoad();
  n.pin = n.pin === id ? '' : id;
  noteSave();
  trackKey = null;
  syncDom();
}

function trackBtn(text, cls, fn, title) {
  var b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = text;
  if (title) b.title = title;
  b.onclick = fn;
  return b;
}

/* One quiet line: what you are in the middle of. Never on the first frame
 * of a first visit - nothing optional stands in front of the errand - so
 * it appears once the visitor has moved, or has something in progress. */
function syncTrack() {
  if (!el.track) return;
  var l = CONTENT && S.home ? trackLine() : null;
  var mode = trackMode();
  var any = false, all = chainLines(), i, s;
  for (i = 0; i < all.length; i++) {
    s = chainSt(all[i].id);
    if (s && s.d.length) { any = true; break; }
  }
  var show = !!l && mode !== 'hidden' && (any || S.travelled || S.s > 0.06);
  var p = l ? chainProgress(l) : null, bi = l ? chainNext(l) : -1;
  var key = show ? [l.id, mode, p.n, bi, trackFlash ? 1 : 0, noteLoad().pin || '',
                    lensesEarned().length, S.query ? S.query.kind + S.query.value : ''].join('|') : '';
  if (key === trackKey) return;
  trackKey = key;
  el.track.textContent = '';
  el.track.hidden = !show;
  if (!show) return;
  el.track.classList.toggle('flash', !!trackFlash);
  el.track.classList.toggle('full', mode === 'full');

  var head = trackBtn(l.title + '  ·  ' + p.n + ' of ' + p.of, 'lead',
    function () { setTrackMode(mode === 'full' ? 'min' : 'full'); },
    mode === 'full' ? 'Show less' : 'Show the whole line');
  head.setAttribute('aria-expanded', mode === 'full' ? 'true' : 'false');
  el.track.appendChild(head);

  var st = chainSt(l.id), live = liveBeats(l);
  /* crossed off: the evidence of the journey. In full, every one; in the
   * minimal line, only the one that was just crossed, while it flashes. */
  for (i = 0; i < live.length; i++) {
    var j = live[i];
    if (!(st && st.d.indexOf(j) >= 0)) continue;
    var justNow = trackFlash && st.d[st.d.length - 1] === j;
    if (mode !== 'full' && !justNow) continue;
    var x = document.createElement('s');
    x.className = 'beat done' + (justNow ? ' now' : '');
    x.textContent = l.beats[j].goal || l.beats[j].find || '';
    el.track.appendChild(x);
  }
  if (bi >= 0) {
    var b = l.beats[bi], t = beatTarget(b), g;
    if (t) g = trackBtn(b.goal, 'beat ask', function () { goTarget(t); },
                        t.query ? 'Ask the map' : 'Go there');
    else { g = document.createElement('span'); g.className = 'beat'; g.textContent = b.goal; }
    el.track.appendChild(g);
  } else {
    var dn = document.createElement('span');
    dn.className = 'beat';
    dn.textContent = 'Complete. The reveal is in your notebook.';
    el.track.appendChild(dn);
  }

  if (mode !== 'full') return;
  /* the other lines you are in the middle of, any of which can be followed
   * instead, and what finishing them has let you ask */
  for (i = 0; i < all.length; i++) {
    var o = all[i];
    if (o === l || !chainOpen(o)) continue;
    var op = chainProgress(o);
    el.track.appendChild(trackBtn(o.title + '  ·  ' + op.n + ' of ' + op.of, 'other ask',
      (function (id) { return function () { pinLine(id); }; })(o.id), 'Follow this line'));
  }
  lensesEarned().forEach(function (g2) {
    var q = lensQuery(g2), on = S.query && S.query.kind === q.kind;
    el.track.appendChild(trackBtn((on ? 'Showing: ' : 'Ask the map: ') + g2.label, 'lens ask',
      function () { setQuery(q); }, 'A question a finished line taught you'));
  });
  el.track.appendChild(trackBtn('Hide', 'hide', function () { setTrackMode('hidden'); },
                                'Hide the tracker. Your notebook keeps everything.'));
}

/* ── the notebook's page of lines ───────────────────────────────────── */

function notebookLines(into) {
  if (!CONTENT || !S.home) return;
  var all = chainLines(), shown = 0, i, l, s, h, p;
  var wrap = document.createElement('div');
  for (i = 0; i < all.length; i++) {
    l = all[i]; s = chainSt(l.id);
    if (!chainUsable(l)) continue;
    var pr = chainProgress(l);
    h = document.createElement('h3');
    h.textContent = l.title + (s && s.done ? ' — complete' : '');
    wrap.appendChild(h);
    p = document.createElement('p');
    if (!(s && s.d.length)) {
      p.textContent = !chainGateOpen(l) ? 'Opens once another line is finished.'
                    : l.kind === 'main' ? 'Not started. ' + (l.beats[chainNext(l)] || {}).goal + '.'
                    : 'Not found yet.';
      p.className = 'dim';
      wrap.appendChild(p);
      continue;
    }
    shown++;
    var b = document.createElement('b');
    b.textContent = pr.n + ' of ' + pr.of;
    p.appendChild(b);
    if (s.done && l.reveal) {
      p.appendChild(document.createElement('br'));
      var sp = document.createElement('span');
      sp.textContent = l.reveal;
      p.appendChild(sp);
    } else {
      var nx = chainNext(l);
      if (nx >= 0) {
        p.appendChild(document.createElement('br'));
        var sp2 = document.createElement('span');
        sp2.textContent = 'Next: ' + l.beats[nx].goal;
        p.appendChild(sp2);
      }
    }
    wrap.appendChild(p);
  }
  var title = document.createElement('h3');
  title.textContent = 'Lines';
  into.appendChild(title);
  var lead = document.createElement('p');
  var done = all.filter(function (x) { var t = chainSt(x.id); return chainUsable(x) && t && t.done; }).length;
  var usable = all.filter(chainUsable).length;
  lead.appendChild(document.createElement('b')).textContent = done + ' of ' + usable + ' finished';
  lead.appendChild(document.createElement('br'));
  lead.appendChild(document.createElement('span')).textContent = shown
    ? 'Some are offered; some you only find by wandering into them.'
    : 'Stories the map tells once you start walking. Some are offered; some you only find by wandering into them.';
  into.appendChild(lead);
  into.appendChild(wrap);
  if (trackMode() === 'hidden') {
    var sb = trackBtn('Show the tracker', 'ask', function () { setTrackMode('min'); });
    var pp = document.createElement('p');
    pp.appendChild(sb);
    into.appendChild(pp);
  }
}
