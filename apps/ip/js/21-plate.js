/* apps/ip/js/21-plate.js — the plate, sightlines, the companion text, and syncDom.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ DOM ═════════════════════════════════════════════════════════════ */

/* Rebuilt only when the list actually changes, because it is made of
 * buttons and replacing those under a pointer mid-hover is how you make a
 * thing feel broken. */
var sightKey = '';
function syncSight() {
  if (!el.sight) return;
  var f = activeField(), lines = f ? sightlines(f.f) : [];
  var key = lines.map(function (l) { return l.label; }).join('|');
  if (key === sightKey) return;
  sightKey = key;
  el.sight.textContent = '';
  if (!lines.length) { el.sight.hidden = true; return; }
  el.sight.hidden = false;
  var lead = document.createElement('span');
  lead.className = 'lead';
  lead.textContent = 'From here you can see';
  el.sight.appendChild(lead);
  lines.forEach(function (l) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ask';
    b.textContent = l.label;
    b.title = 'Go there';
    b.onclick = function () { travelTo(l.addr, true); };
    el.sight.appendChild(b);
  });
}

function grab(ids) { ids.forEach(function (id) { el[id] = document.getElementById(id); }); }
function say(m) { if (el.live) el.live.textContent = m; }

var V4_TOTAL = '4,294,967,296';
var V6_64 = '18,446,744,073,709,551,616';

/* WHERE YOU ARE, said in terms of your own address — which is the only
 * reason anywhere else is interesting. This replaces the old
 * label-a-chosen-cell plate: the visitor is not pointing at this place
 * from a distance any more, they are standing in it. */
function awayPlate() {
  var rec = S.subject || {}, near = distanceHome();
  var here = ipToText(S.aim, S.home.v);

  if (rec.status === 'loading') {
    return { title: here, sub: 'Asking what is announced here.', note: near };
  }
  if (rec.status !== 'ready') {
    return { title: here,
             sub: 'Nothing announced here.',
             note: near + '. Real address space — RIPE’s collectors just ' +
                   'do not see anything announcing it.' };
  }
  var same = S.net && S.net.status === 'ready' && S.net.asn === rec.asn;
  var note = near + ' · ' + (same
    ? 'the same network that announces your address'
    : 'a different network from yours');
  var size = S.shape && S.shape.status === 'ready' && S.shape.asn === rec.asn
    ? shapeSize() : '';
  var reg = regLine(S.aim, S.home.v);
  return { title: rec.prefix || here,
           sub: 'AS' + rec.asn + (rec.holder ? ' · ' + rec.holder : '') +
                (size ? '  ·  ' + size : ''),
           note: note + (reg ? '  ·  ' + reg : '') };
}

/* A landmark outranks the routing data for the plate, because what makes
 * 240.0.0.0/4 worth standing in is not who announces it — nobody does —
 * but that it was set aside in 1981 and never used. */
function markPlate(m) {
  var rec = S.subject || {};
  var who = rec.status === 'ready'
    ? 'AS' + rec.asn + (rec.holder ? ' · ' + rec.holder : '') : '';
  return { title: m.p,
           sub: m.n + (who ? '  ·  ' + who : ''),
           note: m.w + '  ·  ' + distanceHome() };
}

/* What a rung of the ladder is. Cells are blocks, except at the very
 * bottom of an IPv6 descent where a cell really is one address — and
 * calling 4,096 addresses "blocks" would be a small lie told 4,096
 * times. */
function cellsPhrase(f) {
  return f.cellLen >= f.bits
    ? group(String(FIELD*FIELD)) + ' addresses'
    : group(String(FIELD*FIELD)) + ' blocks of /' + f.cellLen;
}

/* What a field is made of. The number of countries in view falls as the
 * visitor descends — 239 across all of IPv4, around 100 in a /8, one by
 * the time they are inside somebody's own space — and saying it is how
 * that gradient becomes something felt rather than merely true. */
function fieldMix(f) {
  if (!f.reg || !REG) return '';
  var ccs = {}, nc = 0, lo = 9999, hi = 0, held = 0, i, k, y, c;
  for (i = 0; i < FIELD * FIELD; i++) {
    k = f.reg.key[i];
    if (k < 0) continue;
    held++;
    c = REG.cc[k];
    if (!ccs[c]) { ccs[c] = 0; nc++; }
    ccs[c]++;
    y = REG.year[k];
    if (y) { if (y < lo) lo = y; if (y > hi) hi = y; }
  }
  if (!held) return 'nobody holds any of this';
  var best = '', bestN = 0;
  for (c in ccs) if (ccs.hasOwnProperty(c) && ccs[c] > bestN) { bestN = ccs[c]; best = c; }
  var out;
  if (nc === 1) out = 'all of it ' + best;
  else out = group(String(nc)) + ' countries, mostly ' + best;
  if (hi >= lo) out += ' · ' + (lo === hi ? lo : lo + '–' + hi);
  var empty = FIELD * FIELD - held;
  if (empty > 0) {
    out += ' · ' + Math.round(100 * empty / (FIELD * FIELD)) +
           '% held by nobody';
  }
  return out;
}

function rungPlate(r) {
  var f = r.f;
  /* computed before the floor branch, which returns early and was quietly
   * reading it as undefined */
  var mix = fieldMix(f);
  if (r.len === floorLen(f.v)) {
    if (f.v === 4) {
      return { title: 'All of IPv4',
               sub: V4_TOTAL + ' addresses · ' + cellsPhrase(f) +
                    (mix ? '  ·  ' + mix : ''),
               note: 'One ordinary IPv6 subnet, a /64, holds ' + V6_64 +
                     ' — about four billion times this entire space.' };
    }
    return { title: containerName(f),
             sub: 'global unicast · where IPv6 is allocated from' +
                  (mix ? '  ·  ' + mix : ''),
             note: 'One ordinary /64 inside this holds ' + V6_64 +
                   ' addresses — about four billion times the whole of IPv4.' };
  }
  /* only claim one of them is yours when one of them actually is. After
   * travel the field routinely does not contain the visitor at all, and
   * the sentence was still saying it did. */
  var sub = cellsPhrase(f) + (f.homeIdx >= 0 ? ', and one of them is yours' : '');

  /* If the network in hand has blocks in this field, say so and say how
   * many. This is where the exploring stops being a caption: the lit cells
   * are that network's real footprint, and a field with eight of them is a
   * different object from a field with four hundred. It also makes the
   * standing disclaimer honest — once a network has been asked about, it
   * is no longer true that only the visitor's own block is known. */
  var sh = S.shape, fs = f.shape;
  /* Both disclaimers below used to say, flatly, that nothing but the
   * visitor's own block had been asked about. That was already untrue the
   * moment they travelled, and it was invisible only because the visited
   * cells were never drawn. Now that they are, the sentence sat next to a
   * plateful of evidence against itself. Fixed 2026-09-19 with the bug
   * that hid it. */
  var bn = beenCountIn(f);
  var mine = bn === 1 ? ' other block here has' : ' other blocks here have';
  return (function () {
    if (fs && fs.here && sh && sh.status === 'ready') {
      var who = 'AS' + sh.asn +
                (S.subject && S.subject.asn === sh.asn && S.subject.holder
                   ? ' · ' + S.subject.holder : '');
      var all = shapeSize();
      return { title: containerName(f), sub: sub + (mix ? '  ·  ' + mix : ''),
               note: group(String(fs.here)) +
                     (fs.here === 1 ? ' of these blocks is' : ' of these blocks are') +
                     ' announced by ' + who +
                     (all ? ', which announces ' + all + ' in all' : '') +
                     (bn ? '. ' + group(String(bn)) + mine + ' been asked about.'
                         : '. Nothing else here has been asked about.') };
    }
    return { title: containerName(f), sub: sub + (mix ? '  ·  ' + mix : ''),
             /* the quiet part: where knowing stops and space begins. The
              * registries now say a great deal about this field; what they
              * cannot say is whether anything actually answers there. */
             note: mix
               ? 'The registries say that much. Whether anything announces ' +
                 'any of it is a different question, and ' +
                 (bn ? 'you have asked it of ' + group(String(bn)) + ' of them.'
                     : 'only yours has been asked.')
               : 'Address space. ' +
                 (bn ? 'Yours and ' + group(String(bn)) + ' more have been looked up'
                     : 'Only yours has been looked up') +
                 ' — whether anything announces the rest is not known here.' };
  })();
}

function away() {
  return !!(S.home && S.aim !== null && S.aim !== S.home.big);
}

function plateFor() {
  var n = S.subject, r = activeRung();

  /* Whichever of the block and the nearest rung is BRIGHTER owns the
   * plate. Deciding it by position in an if-chain instead meant the block
   * kept the plate while a rung that was half again as strong was the
   * thing actually filling the frame. */
  /* When does a landmark own the plate? When it is big enough to be what
   * you are looking at, and you have not pulled out past it.
   *
   *   - a single host — a root server, a public resolver — always, because
   *     the visitor went to that exact address and nothing else about it
   *     is more interesting than what it is;
   *   - a region, while it covers at least one cell of the frame;
   *   - never at the whole of the family's space, where the space itself
   *     is the subject and the landmark is only where the marker happens
   *     to have landed. */
  if (away()) {
    var lmk = markAt(S.aim, S.home.v);
    var cl = r && r.f ? r.f.containerLen
           : (layerAlpha[LY.BLOCK] > LIVE && S.subject && S.subject.cidr
               ? S.subject.cidr.len : null);
    if (lmk && cl !== floorLen(S.home.v) &&
        (lmk.len === lmk.bits || cl === null || lmk.len <= cl + STEP_BITS)) {
      return markPlate(lmk);
    }
  }
  if (away() && layerAlpha[LY.BLOCK] > LIVE &&
      (!r || layerAlpha[LY.BLOCK] >= r.alpha)) return awayPlate();

  if (r && r.alpha >= layerAlpha[LY.BLOCK]) return rungPlate(r);
  if (away()) return awayPlate();

  if (!n) return { title: '', sub: '', note: '' };
  if (n.status === 'loading') {
    return { title: '—', sub: 'Reading the routing data for this address.', note: '' };
  }
  if (n.status !== 'ready') {
    return { title: 'No announced block',
             sub: 'RIPE’s collectors do not see this address inside an announced prefix.',
             note: 'Your address is still your address, and the space around it is ' +
                   'still there. Keep going out.' };
  }
  var g = prefixGrid(n.cidr, S.home ? S.home.big : null), u = g.unit;
  var note = g.per > 1n
    ? 'One mark per ' + group(g.per.toString()) + ' ' + u.many + ' · ' +
      group(g.total.toString()) + ' in the block'
    : group(g.total.toString()) + ' ' + (g.total === 1n ? u.one : u.many) + u.tail;
  /* this block is one of however many the network announces, and saying so
   * is the difference between "a prefix" and "a network with a shape" */
  var sz = S.shape && S.shape.status === 'ready' && S.shape.asn === n.asn
    ? shapeSize() : '';
  if (sz) note = note + '  ·  this network announces ' + sz;
  var rl = S.home ? regLine(S.home.big, S.home.v) : '';
  if (rl) note = note + '  ·  ' + rl;
  return { title: n.prefix,
           sub: 'AS' + n.asn + (n.holder ? ' · ' + n.holder : ''),
           note: note };
}

function summary() {
  var n = S.subject, r = activeRung(), f;
  if (away() && layerAlpha[LY.BLOCK] > LIVE &&
      (!r || layerAlpha[LY.BLOCK] >= r.alpha)) {
    var fp = awayPlate();
    return fp.title + '. ' + fp.sub + ' ' + fp.note;
  }
  if (r && r.alpha >= layerAlpha[LY.BLOCK]) {
    f = r.f;
    if (r.len === floorLen(f.v)) {
      return f.v === 4
        ? 'All of IPv4: ' + V4_TOTAL + ' addresses, drawn as ' +
          group(String(FIELD*FIELD)) + ' blocks. Yours is marked. One ordinary ' +
          'IPv6 /64 subnet holds about four billion times this entire space.'
        : containerName(f) + ', the global unicast space IPv6 is allocated from. ' +
          'One ordinary /64 inside it holds about four billion times the whole of IPv4.';
    }
    return containerName(f) + ': ' + cellsPhrase(f) +
           (f.homeIdx >= 0 ? ', one of them yours' : '') +
           '. Only yours has been looked up; whether anything announces the ' +
           'rest is not known here.';
  }
  if (S.s < 0.5) {
    return S.home ? 'Your public IP address is ' + S.home.text + '.'
                  : 'Your public IP address is not available on this page.';
  }
  if (!n) return 'Looking up the block this address is announced in.';
  if (n.status === 'loading') return 'Reading the routing data for this address.';
  if (n.status !== 'ready') {
    return 'No announced block: RIPE’s collectors do not see this address ' +
           'inside an announced prefix.';
  }
  return (S.home ? S.home.text : 'This address') + ' is announced as part of ' +
         n.prefix + ', by AS' + n.asn + (n.holder ? ', ' + n.holder : '') + '.';
}

function syncDom() {
  /* The weights decide which state owns the plate, and they are computed
   * per frame — so reading them here without recomputing would make the
   * text wait on an animation frame that a throttled tab may never run.
   * Same rule as the plate copy: TEXT MUST NEVER WAIT ON A FRAME. It is a
   * handful of pow() calls and it is idempotent with the frame's own. */
  layers();
  var w = layerAlpha[LY.BLOCK];
  /* the plate fades in as the visitor leaves Home — but "Home" means their
   * own address, not a low axis. Away from it the plate is the only thing
   * naming where they are, so it stays up. Third thing keyed off the axis
   * that should have been keyed off away(). */
  var plateOn = away() ? 1 : smooth(clamp((S.s - 0.28) / 0.42, 0, 1));
  /* The answer only takes its big centred form when the visitor is
   * actually at home. Keying it off the axis alone was right until travel
   * existed: you can now be deep inside somebody else's network at a low
   * axis, and the address would balloon back over the middle of the frame
   * as though you had never left. Same mistake the Home button made. */
  var wasState = document.body.dataset.state;
  document.body.dataset.state = (!away() && S.s < 0.5) ? 'home' : 'out';
  if (document.body.dataset.state !== wasState) fitSoon();

  var p = plateFor();
  if (S.query) {
    p = { title: p.title,
          sub: p.sub,
          note: 'Showing ' + queryLabel(S.query) + '  ·  ' +
                queryExtent(S.query, S.home ? S.home.v : 4) +
                '  ·  touch it again to stop' };
  }
  el.plate.style.opacity = plateOn.toFixed(3);
  if (el.plateTitle.textContent !== p.title) {
    el.plateTitle.textContent = p.title;
    var longest = 0;
    (p.title || '').split(/\s+/).forEach(function (t) {
      if (t.length > longest) longest = t.length;
    });
    document.body.dataset.longtitle = longest > 14 ? '1' : '0';
  }
  if (el.plateSub.dataset.text !== p.sub) {
    el.plateSub.dataset.text = p.sub;
    plateQueryable(el.plateSub, p.sub);
  }
  if (el.plateNote.textContent !== p.note) el.plateNote.textContent = p.note;
  syncSight();

  if (markAnchor && w > 0.25 && S.home) {
    var ws = layerScale[LY.BLOCK];
    var sp = toScreen(viewProj(), markAnchor.x*ws, markAnchor.y*ws, markAnchor.z*ws);
    if (sp) {
      /* which way the leader actually went, in screen terms — world +x is
       * screen-left, so this cannot be assumed from the world offset */
      var mp = toScreen(viewProj(), markAnchor.mx*ws, (markAnchor.y - 0.45)*ws,
                        markAnchor.mz*ws);
      var side = (mp && sp.x < mp.x) ? -1 : 1;
      /* a 39-character IPv6 address will run off the frame from the side
       * the leader happens to point; flip it rather than clip it */
      var wid = el.mark.offsetWidth || 180, pad = 14;
      if (side > 0 && sp.x + 8 + wid > S.W - pad) side = -1;
      if (side < 0 && sp.x - 8 - wid < pad) side = 1;
      el.mark.style.opacity = ((w - 0.25) / 0.75).toFixed(3);
      el.mark.style.left = clamp(sp.x + side * 8,
                                 side < 0 ? wid + pad : pad,
                                 side < 0 ? S.W - pad : S.W - wid - pad) + 'px';
      el.mark.style.top = (sp.y - 10) + 'px';
      el.mark.classList.toggle('left', side < 0);
      if (el.markVary.dataset.of !== S.home.text) {
        el.markVary.dataset.of = S.home.text;
        setSplit(el.markFixed, el.markVary, S.home.text, S.net && S.net.cidr);
        el.markNote.textContent = S.net && S.net.cidr
          ? S.net.cidr.len + ' bits fixed · ' +
            (S.net.cidr.bits - S.net.cidr.len) + ' vary'
          : '';
      }
    } else el.mark.style.opacity = '0';
  } else {
    el.mark.style.opacity = '0';
  }

  /* whatever the pointer is nearest, named. Every mark in the block is a
   * real address, and its position IS its offset — no lookup involved. */
  /* the label goes where the cursor's own layer puts it, for the same
   * reason the highlight does */
  var curLy = cursor && cursor.layer !== undefined ? cursor.layer : LY.BLOCK;
  if (cursor && layerAlpha[curLy] > 0.35) {
    var cws = layerScale[curLy];
    var cp = toScreen(viewProj(), (cursor.x+panX(curLy))*cws, cursor.y*cws,
                                  (cursor.z+panZ(curLy))*cws);
    if (cp) {
      if (cursor.cidr && !cursor.note) {
        setSplit(el.tipFixed, el.tipVary, cursor.text, cursor.cidr);
      } else {
        el.tipFixed.textContent = '';
        el.tipVary.textContent = cursor.text;
      }
      el.tipMine.textContent = (cursor.mine && !cursor.note) ? '  ·  yours' : '';
      el.tipNote.textContent = cursor.note;
      el.tipWrap.style.left = clamp(cp.x, 70, S.W - 70) + 'px';
      el.tipWrap.style.top = (cp.y - 30) + 'px';
      el.tipWrap.style.opacity = '1';
    } else el.tipWrap.style.opacity = '0';
  } else {
    el.tipWrap.style.opacity = '0';
  }

  /* Both controls are offered only when they would do something. Home used
   * to be hidden by the axis alone, which was right until travel existed —
   * a visitor can now be a long way from their own address while the axis
   * has barely moved, and that is exactly when Home matters most. */
  if (el.hint) {
    /* The bottom line carries whichever of two things is true: how to
     * travel, or — if there is no picture at all — that there is no
     * picture. It is free, it is out of the plate's way, and a status
     * belongs on it more than an invitation to click nothing. */
    if (!R && S.renderFail) {
      el.hint.textContent =
        'No picture: this browser would not give it the graphics it needs. ' +
        'Everything written here is unaffected.';
      el.hint.style.opacity = '1';
    } else {
      var canTravel = !!R && !!(activeField() || layerAlpha[LY.BLOCK] > LIVE);
      var show = canTravel && !S.travelled && !!S.home;
      el.hint.textContent = show
        ? (cursor && cursor.field
            ? 'Click to focus here, then zoom in'
            : 'Click any block to focus it — then zoom in on it yourself')
        : '';
      el.hint.style.opacity = show ? '1' : '0';
    }
  }
  syncExplore();
  if (el.goBack) el.goBack.hidden = !S.trail.length && !away();
  if (el.goHome) el.goHome.hidden = !away() && S.s < 0.5;
  el.railMark.style.top = (S.s / S.maxAxis * 100).toFixed(2) + '%';
  /* THE DESCENT ACCUMULATES -- here, because the field cannot carry it.
   * Each rung is 64x the last, so the second container in is 1/4096th of
   * the frame and the third is under a pixel: about two levels are ever
   * visible down there, however they are drawn. The rail is logarithmic,
   * so all ten fit on it at once. "At rung eight the seven above are still
   * on screen" is true of this, and could never have been true of the
   * field.
   *
   * Every rung between the two ends of the traverse is lit, and they stay
   * lit -- going back in does not un-pass them. Lit = known, dark =
   * unasked, on the one piece of furniture that shows the whole ladder. */
  if (el.railTrack && S.been !== null) {
    var tk = el.railTrack.children, ti, ta;
    for (ti = 0; ti < tk.length; ti++) {
      ta = tk[ti].getAttribute('data-a');
      if (ta === null) continue;
      tk[ti].classList.toggle('been', +ta >= S.been && +ta <= S.gone);
    }
  }
  var ar = activeRung();
  el.companionState.textContent =
    ar ? (ar.len === floorLen(ar.f.v)
            ? (ar.f.v === 6 ? 'Global unicast' : 'All of IPv4')
            : containerName(ar.f))
    : layerAlpha[LY.BLOCK] > LIVE ? 'The announced block' : 'Home';
  el.companionSummary.textContent = summary();

  /* the facts, as real text, for anything that cannot read the canvas */
  if (el.companionFacts) {
    var n = S.net, facts = [];
    if (S.home) facts.push(['Your address', S.home.text]);
    var pt = S.home ? placeText(S.where) : null;
    if (pt) facts.push(['Approximate location', pt.value + (pt.sub ? ', ' + pt.sub : '')]);
    if (S.edgeNet) facts.push(['Internet provider',
      (S.edgeNet.org || '') + (S.edgeNet.asn ? (S.edgeNet.org ? ' · ' : '') + 'AS' + S.edgeNet.asn : '')]);
    if (n && n.status === 'ready') {
      facts.push(['Announced prefix', n.prefix]);
      facts.push(['Announced by', 'AS' + n.asn + (n.holder ? ' · ' + n.holder : '')]);
    } else if (n && n.status === 'none') {
      facts.push(['Announced prefix', 'none that RIPE’s collectors see']);
    }
    if (ar) {
      facts.push(['Containing block', containerName(ar.f)]);
      facts.push(['Depth', 'rung ' + (ar.k + 1) + ' of ' + S.ladder.length +
                           ' · ' + S.home.bits + '-bit space']);
    }
    if (away()) {
      var rr = S.subject || {};
      facts.push(['You are looking at', ipToText(S.aim, S.home.v)]);
      facts.push(['Announced there',
                  rr.status === 'ready'
                    ? (rr.prefix + ' by AS' + rr.asn + (rr.holder ? ' · ' + rr.holder : ''))
                    : rr.status === 'loading' ? 'asking' : 'nothing']);
      facts.push(['Distance from your address', distanceHome()]);
      if (S.trail.length) facts.push(['Places behind you', String(S.trail.length)]);
    }
    var html = '';
    facts.forEach(function (f2) { html += '<p></p>'; });
    el.companionFacts.innerHTML = html;
    var ps = el.companionFacts.querySelectorAll('p');
    facts.forEach(function (f2, i2) { ps[i2].textContent = f2[0] + ': ' + f2[1]; });
  }
}

function announce() { say(summary()); }
