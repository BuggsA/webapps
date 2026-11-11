/* apps/ip/js/31-share.js — sharing: a place, a finished story or the notebook, as a link and as a card image; and the offer a shared link makes on arrival.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ SHARING ═════════════════════════════════════════════════════════
 * Owner, 2026-11-11: "can you work on making it sharable?" The plan's
 * phase G, the card (docs/ip-plan-v2.md, ip-build-plan-v3 §3): "the
 * notebook exported as an image ... This is how you beat your friend. No
 * leaderboard, because there is no server." Exit: "the image is truthful,
 * legible, gives nothing away unasked, and somebody wants to post it."
 *
 * Three things can be shared, each as a link and as a 1200x630 card:
 *   a place     - wherever the aim is, away from home
 *   a story     - once it is finished: its title and its reveal
 *   the notebook - the brag sheet: places, networks, countries, stories
 *
 * GIVES NOTHING AWAY UNASKED. The visitor's own address is never on a card
 * or in a link. The plate's note is left off the card because it carries
 * "N addresses from yours", which is a position relative to them. A place
 * inside their own network's block can still be shared - they chose it -
 * but the panel says, plainly, that it points close to them.
 *
 * A SHARED LINK COSTS THE ERRAND NOTHING. Opening iphere.app/?at=X shows
 * the recipient THEIR OWN address first, like any visit; the shared place
 * is an offer in "From here you can see", and only their tap goes there.
 * The camera still belongs to the hand holding it.
 *
 * The canvas is captured by drawing a frame and reading it in the same
 * task, so the WebGL context does not need preserveDrawingBuffer. */

var SHARE_ORIGIN = 'https://iphere.app/';
var shareItem = null;          /* what the share panel is showing */
var shareBlobUrl = '';
var sharedOffer = null;        /* { kind, at?, line?, used } from the arriving link */

function shareUrl(params) {
  var u = new URL(SHARE_ORIGIN);
  Object.keys(params || {}).forEach(function (k) { u.searchParams.set(k, params[k]); });
  return u.toString();
}

function firstSentence(t) {
  var m = String(t || '').match(/^.*?[.!?](\s|$)/);
  return m ? m[0].trim() : String(t || '');
}

/* ── what can be shared ─────────────────────────────────────────────── */

function sharePlaceItem() {
  if (!S.home || S.aim === null || !away()) return null;
  /* Built from the PLACE, never from the plate: the plate describes the
   * view, and at some zooms the view is the visitor's own neighbourhood -
   * "4,096 addresses, and one of them is yours" was on the first card. */
  var at = ipToText(S.aim, S.home.v), mk = markAt(S.aim, S.home.v), rec = S.subject || {};
  var title = mk ? mk.n : (rec.status === 'ready' && rec.prefix ? rec.prefix : at);
  var reg = regLine(S.aim, S.home.v);
  var sub = mk ? mk.w
          : rec.status === 'ready'
            ? 'Announced by AS' + rec.asn + (rec.holder ? ', ' + rec.holder : '') + (reg ? '  ·  ' + reg : '')
            : 'Nothing announces it today' + (reg ? '  ·  ' + reg : '');
  var near = !!(S.net && S.net.status === 'ready' && S.net.cidr &&
                (S.aim >> BigInt(S.net.cidr.bits - S.net.cidr.len)) ===
                (S.net.cidr.net >> BigInt(S.net.cidr.bits - S.net.cidr.len)));
  return { kind: 'place', kicker: 'A place on the internet', title: title,
           sub: mk ? at : sub, body: mk ? sub : '',
           url: shareUrl({ at: at }),
           text: title + (mk ? ' (' + at + ')' : '') + ' - a place on the map of every IP address.',
           warn: near ? 'This place is inside your own network’s block, so the link points close to where you are.' : '' };
}

function shareStoryItem(l) {
  var p = chainProgress(l);
  return { kind: 'story', kicker: 'A story, finished', title: l.title,
           body: l.reveal || '', sub: p.of + ' stops on the map of every IP address',
           url: shareUrl({ line: l.id }),
           text: l.title + ': ' + firstSentence(l.reveal) };
}

function shareNotebookItem() {
  var n = noteLoad(), sites = noteCount(n.sites), nets = noteCount(n.nets),
      ccs = noteCount(n.ccs), all = chainLines(), done = 0, usable = 0;
  all.forEach(function (l) {
    if (!chainUsable(l)) return;
    usable++;
    var s = chainSt(l.id);
    if (s && s.done) done++;
  });
  var facts = [];
  if (sites) facts.push(group(sites) + (sites === 1 ? ' place' : ' places') + ' found');
  if (nets) facts.push(group(nets) + (nets === 1 ? ' network' : ' networks') + ' entered');
  if (ccs) facts.push(group(ccs) + (ccs === 1 ? ' country' : ' countries') + ' crossed');
  if (n.oldest) facts.push('the oldest from ' + n.oldest);
  if (usable) facts.push(done + ' of ' + usable + ' stories finished');
  return { kind: 'notebook', kicker: 'My notebook', title: 'What I found on the internet',
           facts: facts, url: SHARE_ORIGIN,
           text: 'I have been exploring the map of every IP address on iphere.app: ' +
                 (facts.slice(0, 2).join(', ') || 'have a look') + '.' };
}

/* ── the card ───────────────────────────────────────────────────────── */

function cardWrap(ctx, text, maxW, maxLines) {
  var words = String(text || '').split(/\s+/), lines = [], cur = '';
  words.forEach(function (w) {
    var t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = t;
  });
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}

/* The still: whatever the instrument shows right now, cropped to fill the
 * right of the card. Drawn and read in one task (see the header). */
function cardStill(ctx, x, y, w, h) {
  if (!R || !cv || !cv.width) return false;
  try {
    S.redact = true;
    rebuild();
    layers();
    R.frame(S.hot);
    var sw = cv.width, sh = cv.height, k = Math.max(w / sw, h / sh);
    var cw = w / k, ch = h / k;
    ctx.drawImage(cv, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h);
    return true;
  } catch (_) { return false; }
  finally {
    if (S.redact) { S.redact = false; rebuild(); }
  }
}

function renderCard(item) {
  var W = 1200, H = 630, c = document.createElement('canvas');
  c.width = W; c.height = H;
  var ctx = c.getContext('2d'), L = 64, TW = 520;
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, W, H);
  var still = cardStill(ctx, 600, 0, 600, H);
  /* the hairline between the words and the picture: the app's one material */
  ctx.fillStyle = 'rgba(92,127,168,0.55)';
  if (still) ctx.fillRect(600, 0, 1, H);

  var y = 84;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#5c7fa8';
  ctx.font = '500 17px Archivo, sans-serif';
  ctx.fillText(item.kicker.toUpperCase().split('').join(String.fromCharCode(8202)), L, y);

  y += 58;
  ctx.fillStyle = '#f2ede3';
  ctx.font = '300 50px Archivo, sans-serif';
  cardWrap(ctx, item.title, still ? TW - 20 : W - 2 * L, 3).forEach(function (t) {
    ctx.fillText(t, L, y); y += 58;
  });
  if (item.sub) {
    ctx.fillStyle = '#8fa9c9';
    ctx.font = '400 22px Archivo, sans-serif';
    cardWrap(ctx, item.sub, still ? TW - 20 : W - 2 * L, 3).forEach(function (t) {
      ctx.fillText(t, L, y); y += 30;
    });
    y += 10;
  }
  if (item.body) {
    ctx.fillStyle = '#f2ede3';
    ctx.font = '340 24px Archivo, sans-serif';
    cardWrap(ctx, item.body, still ? TW - 20 : W - 2 * L, 7).forEach(function (t) {
      if (y < H - 110) { ctx.fillText(t, L, y + 8); y += 34; }
    });
  }
  if (item.facts) {
    ctx.font = '340 26px Archivo, sans-serif';
    item.facts.forEach(function (f) {
      if (y > H - 120) return;
      ctx.fillStyle = 'rgba(92,127,168,0.45)';
      ctx.fillRect(L, y - 2, TW - L, 1);
      ctx.fillStyle = '#f2ede3';
      ctx.fillText(f, L, y + 34);
      y += 50;
    });
  }
  ctx.fillStyle = '#f2ede3';
  ctx.font = '500 22px Archivo, sans-serif';
  ctx.fillText('iphere.app', L, H - 56);
  ctx.fillStyle = '#5c7fa8';
  ctx.font = '400 17px Archivo, sans-serif';
  ctx.fillText('What’s my IP, and the map of every address around it', L, H - 30);
  return new Promise(function (res) { c.toBlob(function (b) { res(b); }, 'image/png'); });
}

/* ── the share panel ────────────────────────────────────────────────── */

function openShare(item) {
  if (!item || !el.sharePanel) return;
  shareItem = item;
  var ready = document.fonts && document.fonts.load
    ? Promise.all(['300 50px Archivo', '500 17px Archivo', '340 24px Archivo'].map(function (f) {
        return document.fonts.load(f).catch(function () {});
      })) : Promise.resolve();
  /* draw the still NOW, before the panel covers the canvas */
  var cardP = ready.then(function () { return renderCard(item); });
  if (aboutOpen) closeAbout();
  if (el.notePanel && !el.notePanel.hidden) closeNote();
  el.sharePanel.hidden = false;
  el.shareTitle.textContent = item.kind === 'place' ? 'Share this place'
    : item.kind === 'story' ? 'Share this story' : 'Share your notebook';
  el.shareWarn.textContent = item.warn || '';
  el.shareWarn.hidden = !item.warn;
  el.shareLink.textContent = item.url.replace(/^https:\/\//, '');
  el.shareImg.removeAttribute('src');
  el.shareNative.hidden = !navigator.share;
  el.shareClose.focus();
  cardP.then(function (blob) {
    if (!blob || shareItem !== item) return;
    if (shareBlobUrl) URL.revokeObjectURL(shareBlobUrl);
    shareBlobUrl = URL.createObjectURL(blob);
    item.blob = blob;
    el.shareImg.src = shareBlobUrl;
    el.shareSave.href = shareBlobUrl;
    el.shareSave.download = 'iphere-' + item.kind + '.png';
  });
}

function closeShare() {
  if (!el.sharePanel) return;
  el.sharePanel.hidden = true;
  shareItem = null;
}

function shareFlash(btn, text) {
  var was = btn.textContent;
  btn.textContent = text;
  setTimeout(function () { btn.textContent = was; }, 1800);
}

function setupShare() {
  if (!el.sharePanel) return;
  el.shareClose.addEventListener('click', closeShare);
  el.shareCopy.addEventListener('click', function () {
    if (!shareItem || !navigator.clipboard) return;
    navigator.clipboard.writeText(shareItem.url).then(function () {
      shareFlash(el.shareCopy, 'Link copied');
    }, function () {});
  });
  el.shareNative.addEventListener('click', function () {
    if (!shareItem || !navigator.share) return;
    var it = shareItem, data = { title: it.title + ' - iphere', text: it.text, url: it.url };
    if (it.blob && window.File) {
      var f = new File([it.blob], 'iphere-' + it.kind + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) data.files = [f];
    }
    navigator.share(data).catch(function () {});
  });
  if (el.sharePlace) {
    el.sharePlace.addEventListener('click', function () { openShare(sharePlaceItem()); });
  }
  readSharedLink();
}

/* The plate's share control: only away from home, where there is a place
 * that is not the visitor's own address. A step of syncDom (24-view). */
function syncShare() {
  if (!el.sharePlace) return;
  el.sharePlace.hidden = !(R && away() && S.subject && S.subject.status !== 'loading');
}

/* ── arriving on a shared link ──────────────────────────────────────── */

function readSharedLink() {
  var q = new URLSearchParams(location.search), at = q.get('at'), line = q.get('line');
  if (at && parseIp(at)) sharedOffer = { kind: 'place', at: parseIp(at) };
  else if (line && /^[a-z0-9-]{1,40}$/.test(line)) sharedOffer = { kind: 'story', line: line };
}

/* For 22-query's "From here you can see": first in the row, and gone once
 * taken. A place in the other address family cannot be reached from this
 * visit's map, so it is not offered rather than offered and broken. */
function sharedSights() {
  var o = sharedOffer;
  if (!o || o.used || !S.home) return [];
  var go = function (fn) {
    return function () {
      o.used = true;
      if (pullEligible()) startPull();
      fn();
      sightKey = '';
      syncDom();
    };
  };
  if (o.kind === 'place') {
    if (o.at.v !== S.home.v) return [];
    var mk = markAt(o.at.big, S.home.v);
    return [{ label: 'Shared with you: ' + (mk ? mk.n : o.at.text), addr: 'shared', story: true,
              go: go(function () { travelTo(o.at.big, true); }) }];
  }
  if (!CONTENT) return [];
  var l = chainLines().filter(function (x) { return x.id === o.line; })[0];
  if (!l || !chainUsable(l)) return [];
  /* a gated story starts at the story it needs */
  var first = l;
  if (!chainGateOpen(l)) {
    first = chainLines().filter(function (x) { return (l.needs || []).indexOf(x.id) >= 0 && chainUsable(x); })[0] || l;
  }
  var bi = chainNext(first), t = bi >= 0 ? beatTarget(first.beats[bi]) : null;
  return [{ label: 'Shared with you: ' + l.title, addr: 'shared', story: true,
            go: go(function () { if (t) goTarget(t); }) }];
}
