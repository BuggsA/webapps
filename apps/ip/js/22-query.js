/* apps/ip/js/22-query.js — asking the map a question, and drawing the answer.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ── ASKING THE MAP A QUESTION ─────────────────────────────────────────
 * Phase A of ../../docs/ip-plan-v2.md. *Show me Brazil.* *Show me
 * everything AFRINIC holds.* *Show me the space nobody holds.*
 *
 * There is no search box, and there should not be. The plate is already
 * saying "49 countries, mostly SE" — so the words in that sentence are the
 * query. Read a fact, touch the fact, see it everywhere. No new chrome, no
 * syntax to learn, and the map teaches the question by answering it.
 *
 * A query never hides anything. Matches brighten, the rest stays exactly
 * as true as it was and merely recedes — this is a highlight, not a
 * filter, because a filter would be the map lying about what is there.
 */

function setQuery(q) {
  if (!q && !S.query) return;
  if (q && S.query && q.kind === S.query.kind && q.value === S.query.value) {
    q = null;                              /* touching it again clears it */
  }
  S.query = q;
  rebuild();
  announce();
}

function queryHit(k) {
  var q = S.query;
  if (!q || !REG) return false;
  if (k < 0) return q.kind === 'none';     /* space nobody holds */
  if (q.kind === 'cc') return REG.cc[k] === q.value;
  if (q.kind === 'rir') return REG.rir[k] === q.value;
  if (q.kind === 'era') {
    var y = REG.year[k];
    return y >= q.value && y < q.value + q.span;
  }
  /* EARNED LENSES. A visitor who has finished a chain can ask the map a
   * question the chain taught them to ask. 'marks' and 'roots' are not
   * registry facts, so they are matched in the field loop where the
   * landmarks for that field are already to hand. */
  if (q.kind === 'before') { var yb = REG.year[k]; return !!yb && yb < q.value; }
  return false;
}

function queryLabel(q) {
  if (!q) return '';
  if (q.kind === 'cc') return q.value;
  if (q.kind === 'rir') return RIR_NAME[q.value] || '?';
  if (q.kind === 'era') return q.span === 1 ? String(q.value)
                             : q.value + '–' + (q.value + q.span - 1);
  if (q.kind === 'none') return 'space nobody holds';
  return '';
}

/* How much of the whole family this query covers, because a highlight with
 * no size is just a colour. Counted in addresses, once, when it is set. */
function queryExtent(q, v) {
  if (!REG || !q) return '';
  var n = v === 4 ? REG.n4 : REG.n6;
  var keys = v === 4 ? REG.k4 : REG.k6;
  var lo = v === 4 ? REG.lo4 : REG.lo6;
  var hi = v === 4 ? REG.hi4 : REG.hi6;
  var ranges = 0, total = v === 4 ? 0 : 0n, i;
  for (i = 0; i < n; i++) {
    if (!queryHit(keys[i])) continue;
    ranges++;
    if (v === 4) total += hi[i] - lo[i];
    else total += hi[i] - lo[i];
  }
  if (!ranges) return 'nothing here';
  var addr = v === 4 ? group(String(total))
           : group(String(total >> 64n)) + ' /64 subnets';
  return group(String(ranges)) + (ranges === 1 ? ' range · ' : ' ranges · ')
         + addr + (v === 4 ? ' addresses' : '');
}

/* The plate's own words, made touchable. This is the whole interface. */
function plateQueryable(el, text) {
  el.textContent = '';
  if (!text) return;
  /* the two shapes the plate uses: a country code as a bare pair of
     capitals, and a registry by name */
  var re = /\b(AFRINIC|APNIC|ARIN|LACNIC|RIPE NCC|IANA)\b|(?:^|(?<=[\s·]))([A-Z]{2})(?=$|[\s·,.])/g;
  var at = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > at) el.appendChild(document.createTextNode(text.slice(at, m.index)));
    var word = m[0];
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ask';
    b.textContent = word;
    if (m[1]) {
      var ri = RIR_NAME.indexOf(m[1]);
      b.onclick = (function (i) { return function () { setQuery({ kind: 'rir', value: i }); }; })(ri);
      b.title = 'Show everything ' + m[1] + ' holds';
    } else {
      b.onclick = (function (cc) { return function () { setQuery({ kind: 'cc', value: cc }); }; })(m[2]);
      b.title = 'Show everything registered to ' + m[2];
    }
    el.appendChild(b);
    at = m.index + word.length;
  }
  if (at < text.length) el.appendChild(document.createTextNode(text.slice(at)));
}

/* FROM HERE YOU CAN SEE.
 *
 * The open-world loop is: see something from here, go to it, get
 * something, and from the new position see the next thing. We had beat two
 * working and beat four only sometimes -- a network's footprint lights up
 * every other block it announces, which is real level design supplied by
 * the internet's own topology, but it only fires when the network is big.
 * Land somewhere with one prefix, or in space nobody announces, and
 * arriving revealed nothing at all. The chain terminated exactly where the
 * map is emptiest, which is most of it.
 *
 * So every arrival now offers two or three named, reachable things,
 * computed from data already on the device. No authoring, no lookups, and
 * it works in empty space -- an empty field still has an oldest block and
 * still has a largest hole.
 *
 * Everything here is a real cell of this field, so touching one travels to
 * a place that genuinely exists. Nothing is invented to fill the line.
 * See docs/ip-exploration-research.md. */
function sightlines(f) {
  if (!f || !f.lay || !f.lay.gx) return [];
  var out = [], cells = FIELD * FIELD, i, best, bd, k;
  var gx0 = f.lay.gx[f.idx], gy0 = f.lay.gy[f.idx];
  function d2(j) {
    var dx = f.lay.gx[j] - gx0, dy = f.lay.gy[j] - gy0;
    return dx * dx + dy * dy;
  }
  function at(j) { return f.containerNet + (BigInt(j) << f.cellShift); }

  /* ALREADY BEEN THERE.
   *
   * Without this the chain is a two-cycle: from Root server E the nearest
   * landmark is K, and from K it is E, forever. And at the widest view the
   * field does not change when you travel -- it is already everything --
   * so the oldest block and the largest hole are the same two answers on
   * every arrival. Both are the same failure, and it is the one the owner
   * named first: *they do not want to return to the starting point.*
   *
   * The trail already knows. Offering only places it has not got makes the
   * chain advance instead of oscillating, which is the whole difference
   * between a loop and a corridor. */
  function been(b) {
    if (S.aim !== null && b === S.aim) return true;
    for (var q = 0; q < S.trail.length; q++) if (S.trail[q] === b) return true;
    return false;
  }

  /* the nearest named place, which is the closest thing this map has to a
   * landmark on the horizon */
  if (f.marks) {
    best = -1; bd = Infinity;
    for (k in f.marks) {
      i = +k;
      var mk = f.marks[i].m;
      /* not the one you are standing in. Offering "Documentation" to
       * somebody who is already inside 2001:db8::/32 is the chain pointing
       * at the floor. */
      if (i === f.idx || been(mk.net)) continue;
      if (S.aim !== null && S.aim >= mk.net && S.aim <= mk.last) continue;
      var dd = d2(i);
      if (dd < bd) { bd = dd; best = i; }
    }
    if (best >= 0) {
      /* the landmark's OWN address, not the cell that happens to contain
       * it. The line says "Root server E" and the visitor should arrive at
       * Root server E, not at the /12 it lives in. */
      out.push({ label: f.marks[best].m.n, addr: f.marks[best].m.net });
    }
  }

  if (f.reg) {
    /* the oldest thing in view. Age is the one fact every allocated cell
     * carries, and the oldest is reliably the most interesting. */
    best = -1; var by = 9999;
    for (i = 0; i < cells; i++) {
      if (i === f.idx || f.reg.key[i] < 0 || been(at(i))) continue;
      var yr = REG ? REG.year[f.reg.key[i]] : 0;
      if (yr && yr < by) { by = yr; best = i; }
    }
    if (best >= 0) out.push({ label: 'the oldest here, ' + by, addr: at(best) });

    /* the largest run nobody holds. A hole is a real feature of this
     * landscape and it is the only one that gets MORE interesting the
     * emptier the neighbourhood is. */
    var run = 0, bestRun = 0, bestAt = -1;
    for (i = 0; i < cells; i++) {
      if (f.reg.key[i] < 0) {
        run++;
        if (run > bestRun) { bestRun = run; bestAt = i - ((run - 1) >> 1); }
      } else run = 0;
    }
    if (bestRun > 1 && bestAt >= 0 && bestAt !== f.idx && !been(at(bestAt))) {
      out.push({ label: group(bestRun) + ' in a row nobody holds',
                 addr: at(bestAt) });
    }
  }
  return out.slice(0, 3);
}
