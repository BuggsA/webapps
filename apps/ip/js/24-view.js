/* apps/ip/js/24-view.js — the view: syncDom writes state into the page, one named step at a time.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

function syncDom() {
  /* The weights decide which state owns the plate, and they are computed
   * per frame — so reading them here without recomputing would make the
   * text wait on an animation frame that a throttled tab may never run.
   * Same rule as the plate copy: TEXT MUST NEVER WAIT ON A FRAME. It is a
   * handful of pow() calls and it is idempotent with the frame's own. */
  layers();
  var w = layerAlpha[LY.BLOCK];
  /* Then each part of the page, in this order. The order is the one the
   * single 197-line syncDom had; nothing in one step reads what a later
   * step writes. `w` is read once, here, exactly where it always was. */
  syncHomeState();
  syncPlate();
  syncSight();
  syncTrack();         /* 29-chains: what you are in the middle of */
  syncMark(w);
  syncHere();          /* 28-pullback: "You are here" at the floor */
  syncTip();
  syncHint();
  syncExplore();
  syncButtons();
  syncRailPosition();
  syncCompanion();
}

/* Home or out: the one switch the stylesheet keys the answer's two forms off. */
function syncHomeState() {
  /* The answer only takes its big centred form when the visitor is
   * actually at home. Keying it off the axis alone was right until travel
   * existed: you can now be deep inside somebody else's network at a low
   * axis, and the address would balloon back over the middle of the frame
   * as though you had never left. Same mistake the Home button made. */
  var wasState = document.body.dataset.state;
  document.body.dataset.state = (!away() && S.s < 0.5) ? 'home' : 'out';
  if (document.body.dataset.state !== wasState) fitSoon();
}

/* The plate: what the instrument is pointed at, and how visible it is. */
function syncPlate() {
  /* the plate fades in as the visitor leaves Home — but "Home" means their
   * own address, not a low axis. Away from it the plate is the only thing
   * naming where they are, so it stays up. Third thing keyed off the axis
   * that should have been keyed off away(). */
  var plateOn = away() ? 1 : smooth(clamp((S.s - 0.28) / 0.42, 0, 1));
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
}

/* The annotation on the visitor's own mark, at the end of its leader. */
function syncMark(w) {
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
}

/* The label on whatever the pointer is nearest. */
function syncTip() {
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
}

/* The bottom line: how to travel, or that there is no picture. */
function syncHint() {
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
      /* a touchscreen has no click and no hover (phones are the main road
       * since 2026-11-11, docs/ip-concept.md) */
      var tap = window.matchMedia && window.matchMedia('(hover: none)').matches;
      el.hint.textContent = show
        ? (cursor && cursor.field
            ? 'Click to focus here, then zoom in'
            : tap ? 'Tap a block, then drag down to go in'
                  : 'Click any block to focus it — then zoom in on it yourself')
        : '';
      el.hint.style.opacity = show ? '1' : '0';
    }
  }
}

/* Back and Home, offered only when they would do something. */
function syncButtons() {
  if (el.goBack) el.goBack.hidden = !S.trail.length && !away();
  if (el.goHome) el.goHome.hidden = !away() && S.s < 0.5;
}

/* The scale rail: where on the axis, and which rungs have been passed. */
function syncRailPosition() {
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
}

/* The companion: everything on screen, as text, for assistive technology. */
function syncCompanion() {
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

/* ── SIGHTLINES: beat one of the loop, the named places in view ─────── */

/* Rebuilt only when the list actually changes, because it is made of
 * buttons and replacing those under a pointer mid-hover is how you make a
 * thing feel broken. */
var sightKey = '';

function syncSight() {
  if (!el.sight) return;
  var f = sightField(), lines = f ? sightlines(f) : [];
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
    b.title = l.story ? 'A story starts here' : 'Go there';
    if (l.story) b.classList.add('story');
    b.onclick = l.go || function () { travelTo(l.addr, true); };
    el.sight.appendChild(b);
  });
}
