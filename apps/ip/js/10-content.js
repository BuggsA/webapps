/* apps/ip/js/10-content.js — loading the guide and chain content from content/*.json.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ CONTENT ═════════════════════════════════════════════════════════
 * The guide's lines and the chains, loaded rather than written here. The
 * owner's requirement, and it governs every phase after this one: adding a
 * quest, a story or a line must mean adding rows, not editing logic. If
 * anybody ever has to open this file to add a side line, this was built
 * wrong.
 *
 * Deferred like the registry. Nothing is fetched until the visitor moves
 * off Home, because the address is the product and nothing optional gets
 * to go in front of it. */

var CONTENT = null;
var contentState = '';

function loadContent() {
  if (contentState) return;
  contentState = 'loading';
  Promise.all([
    fetch('content/guide.json', { cache: 'force-cache' }).then(function (r) { return r.json(); }),
    fetch('content/lines.json', { cache: 'force-cache' }).then(function (r) { return r.json(); })
  ]).then(function (both) {
    CONTENT = { guide: both[0], chains: both[1] };
    contentState = 'ready';
    /* The cold open could never fire while this was deferred behind the
     * first axis move: its whole job is to give somebody a reason to make
     * that move. So it goes now, if they are still at home and have not
     * already been spoken to. It is a line under the address, arriving
     * after it, blocking nothing - which is not the same as being in
     * front of it. */
    if (!lastSpoke) speak('open.cold', 1, 0);
  }).catch(function () {
    /* the instrument is complete without him. No message: nobody asked for
     * a narrator and nobody should be told one failed to arrive. */
    contentState = 'none';
  });
}

/* WHAT THE VISITOR IS, for only[] to test against. Every token here has to
 * be something we can actually establish - the CGNAT branch was cut once
 * already for claiming a test we cannot perform from one request. */
function visitorTags() {
  var out = [], n = noteLoad();
  if (!S.home) return out;
  out.push(S.home.v === 6 ? 'v6' : 'v4');
  if (S.home.v === 4) {
    var a = Number(S.home.big);
    if (a >= 0x64400000 && a < 0x64800000) out.push('addr-in-100.64/10');
  }
  if (S.net && S.net.status === 'empty') out.push('no-prefix');
  var r = REG ? regAt(S.home.big, S.home.v) : null;
  if (r && r.year && r.year < 1995) out.push('era<1995');
  if (r && r.rirName) out.push('rir=' + r.rirName.toLowerCase().replace(/\s+/g, ''));
  return out;
}

/* HOW WELL THEY KNOW THIS PLACE. The notebook already had the answer and
 * the guide had no way to ask it. Thresholds are in guide.json's `_when`
 * so they can be reviewed rather than discovered in here. */
function seenCount(key) {
  var n = noteLoad(), s = n.sites[key];
  return (s && s.n) ? s.n : (s ? 1 : 0);
}

var saidThisSession = {};

function pickLine(bucketId, seen) {
  if (!CONTENT) return '';
  var i, b = null, lines = CONTENT.guide.lines;
  for (i = 0; i < lines.length; i++) if (lines[i].id === bucketId) { b = lines[i]; break; }
  if (!b) return '';
  var tags = visitorTags(), once = b.fires === 'once per visit', pool = [];
  for (i = 0; i < b.text.length; i++) {
    var t = b.text[i];
    if (saidThisSession[t.t]) continue;
    if (t.when === 'revisit' && seen < 1) continue;
    if (t.when === 'familiar' && seen < 2) continue;
    if (!t.when && seen >= 2 && Math.random() < 0.5 && b.text.some(function (x) {
      return x.when && !saidThisSession[x.t];
    })) continue;
    if (t.only) {
      var ok = true;
      for (var j = 0; j < t.only.length; j++) if (tags.indexOf(t.only[j]) < 0) ok = false;
      if (!ok) continue;
    }
    /* only[] means two different things and conflating them was a real bug.
     * A bucket that fires once is a branch: first match wins, most specific
     * first, fallback last. A pool is an eligibility filter and order in
     * the array carries no meaning at all. */
    if (once) return t.t;
    pool.push(t.t);
  }
  if (!pool.length) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}
