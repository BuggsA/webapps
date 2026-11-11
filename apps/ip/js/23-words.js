/* apps/ip/js/23-words.js — the words: what the plate and the companion say about where you are.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

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

function announce() { say(summary()); }
