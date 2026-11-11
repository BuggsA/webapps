/* apps/ip/js/11-notebook.js — the notebook: where you have been, kept in localStorage.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ NOTEBOOK ═════════════════════════════════════════════
 * What you found, kept between visits. `localStorage` and nothing else --
 * the same store the RIPEstat cache already uses. Nothing leaves the
 * device, so there is nothing to promise and later break.
 *
 * It is a brag sheet and it is meant to be one. It sits behind a control
 * that can be ignored forever by anyone who does not care, and it is
 * written in a naturalist's register -- sites recorded, a logbook -- which
 * is a matter of wording and not of restraint. Life lists have always been
 * a completionist's hobby.
 *
 * Every number here is sized against something the visitor has already
 * seen. A bare count is inert.
 *
 * Forward compatible on purpose: a stale notebook from an older version is
 * merged over a blank one rather than thrown away, and anything unknown in
 * it is ignored. Losing somebody's logbook to a version bump would be the
 * worst bug this file could have. */

var NOTE_KEY = 'ip.v1.note';

var note = null;

function noteBlank() {
  return { v: 1, first: 0, last: 0, sites: {}, firstSite: '', nets: {},
           ccs: {}, deepest: 0, oldest: 0, dist: 0,
           /* 29-chains: progress through the stories, the lenses they
            * granted, and the line the tracker is pinned to */
           lines: {}, lens: {}, pin: '' };
}

function noteLoad() {
  if (note) return note;
  note = noteBlank();
  try {
    var o = JSON.parse(localStorage.getItem(NOTE_KEY) || 'null');
    if (o && typeof o === 'object') {
      for (var k in note) if (o[k] !== undefined && o[k] !== null) note[k] = o[k];
    }
  } catch (_) { }
  note.v = 1;
  if (!note.first) note.first = Date.now();
  return note;
}

function noteSave() {
  if (!note) return;
  note.last = Date.now();
  /* the single write path, so the single place the map's memory of the
   * notebook goes stale. Miss this and a place stays dark until reload. */
  beenCache = null;
  try { localStorage.setItem(NOTE_KEY, JSON.stringify(note)); } catch (_) { }
}

function noteCount(o) { var n = 0, k; for (k in o) n++; return n; }

/* A place, the moment it answers. Recorded whether or not anybody
 * announces it: "nothing is announced here" is a real answer and finding
 * one is a real find. */
function noteSite(at, rec) {
  var n = noteLoad(), p = parseIp(at);
  var key = (rec && rec.status === 'ready' && rec.prefix) ? rec.prefix : at;
  if (n.sites[key] && n.sites[key] !== 1) {
    /* how MANY times, not merely whether. 'familiar' needs a count and the
     * notebook was only ever recording a first sighting. */
    n.sites[key].n = (n.sites[key].n || 1) + 1;
    n.sites[key].t = Date.now();
    /* upgrade a record written before `a` existed. See below. */
    if (!n.sites[key].a) n.sites[key].a = at;
    noteSave();
  }
  if (!n.sites[key] || n.sites[key] === 1) {
    /* The THING, not a tick against a count. No Man's Sky's answer to
     * "wide as an ocean, shallow as a puddle" was the Discovery Page --
     * what you found, in detail, worth coming back to. A logbook of
     * numbers is a scoreboard; a logbook of places is a logbook.
     * A `1` is an entry written by an older version and is upgraded in
     * place rather than thrown away. */
    var rr0 = p ? regAt(p.big, p.v) : null;
    n.sites[key] = {
      t: Date.now(),
      n: 1,
      /* WHERE THEY ACTUALLY STOOD, added 2026-09-19.
       *
       * The key is the announced PREFIX, which is what became known — but
       * it is not where they were, and the map needs where they were. A
       * /14 is 1,024 cells at the /24 rung: drawing the prefix as "you
       * have been here" lit 38% of the field after five visits and the
       * signal died. Measured, not guessed.
       *
       * One address is one cell at every rung, which is the truthful
       * unit of a visit. Records written before this field existed have
       * no `a` and are drawn only where the prefix IS one cell — see
       * beenRanges. They heal the next time the place is visited. */
      a: at,
      asn: (rec && rec.status === 'ready' && rec.asn >= 0) ? rec.asn : -1,
      who: (rec && rec.holder) || '',
      cc: (rr0 && rr0.cc) || '',
      year: (rr0 && rr0.year) || 0,
      said: !!(rec && rec.status === 'ready')
    };
    if (!n.firstSite) n.firstSite = key;
  }
  if (rec && rec.status === 'ready' && rec.asn >= 0) {
    if (!n.nets[rec.asn]) n.nets[rec.asn] = rec.holder || '';
    else if (rec.holder && !n.nets[rec.asn]) n.nets[rec.asn] = rec.holder;
  }
  if (p) {
    var r = regAt(p.big, p.v);
    if (r) {
      if (r.cc) n.ccs[r.cc] = 1;
      if (r.year && (!n.oldest || r.year < n.oldest)) n.oldest = r.year;
    }
  }
  noteSave();
}

function noteHolder(asn, holder) {
  if (!(asn >= 0) || !holder) return;
  var n = noteLoad(), k, s, hit = false;
  if (n.nets[asn] !== undefined && !n.nets[asn]) { n.nets[asn] = holder; hit = true; }
  /* and on every site that network announced, so the logbook says who was
   * there rather than only what number they are */
  for (k in n.sites) {
    s = n.sites[k];
    if (s && s.asn === asn && !s.who) { s.who = holder; hit = true; }
  }
  if (hit) noteSave();
}

function noteDepth(axis) {
  var n = noteLoad();
  if (axis > n.deepest) { n.deepest = axis; noteSave(); }
}

function noteDist(fromBig, toBig) {
  if (fromBig === null || toBig === null) return;
  var n = noteLoad();
  var d = fromBig > toBig ? fromBig - toBig : toBig - fromBig;
  n.dist += Number(d);
  noteSave();
}

/* How many countries hold any address space at all, so "eleven countries"
 * has a denominator. Counted once from the registry already loaded. */
var regCCs = 0;

function allCountries() {
  if (regCCs || !REG || !REG.cc) return regCCs;
  var seen = {}, i;
  for (i = 0; i < REG.cc.length; i++) if (REG.cc[i]) seen[REG.cc[i]] = 1;
  regCCs = noteCount(seen);
  return regCCs;
}

/* Rows, not markup. Holder names come from RIPEstat and prefixes come from
 * the wire, so nothing here is pasted into HTML -- the panel builds the
 * structure and sets textContent, the same way the companion already does.
 * Third-party strings never become markup in this file. */
function notebookRows() {
  var n = noteLoad(), out = [], sites = noteCount(n.sites),
      nets = noteCount(n.nets), ccs = noteCount(n.ccs), all = allCountries();
  if (!sites) return out;
  out.push(['Sites recorded', group(sites) + (sites === 1 ? ' place' : ' places'),
            n.firstSite ? 'the first was ' + n.firstSite +
                          ', and it was dark until you asked' : '']);
  if (nets) {
    var first = '', k;
    for (k in n.nets) {
      first = 'AS' + k + (n.nets[k] ? '  ·  ' + n.nets[k] : '');
      break;
    }
    out.push(['Networks entered', group(nets) + (nets === 1 ? ' network' : ' networks'),
              first ? 'starting with ' + first : '']);
  }
  /* Both of these are sized from the registry, and the registry is
   * deferred. Rather than print a bare count while it is still in flight --
   * which is the one thing the copy rules forbid -- the row waits. openNote
   * asks for the file and rebuilds when it lands, so the wait is short and
   * self-healing. */
  if (ccs && all) {
    out.push(['Countries crossed', group(ccs) + (ccs === 1 ? ' country' : ' countries'),
              'of the ' + group(all) + ' that hold any address space at all']);
  }
  if (n.deepest > 0.01) {
    /* said in addresses, not in axis units. The axis is how the instrument
     * is built, not a thing anybody pulled back to look at. One axis unit
     * is STEP_BITS of address space, which is what makes this exact. */
    var bits = Math.round(n.deepest * STEP_BITS);
    var all = S.home ? S.home.bits : 32;
    var span = bits <= 53 ? group(Math.pow(2, bits)) + ' addresses'
                          : '2^' + bits + ' addresses';
    if (bits >= all) {
      /* at the top of the rail there is nothing left to be a fraction of,
       * and saying "4,294,967,296 out of the 4,294,967,296 there are" is
       * a sentence only a machine would write */
      out.push(['Widest view held', all === 32 ? 'All of IPv4' : 'All of global unicast',
                bits <= 53 ? group(Math.pow(2, bits)) + ' addresses, end to end'
                           : 'every address there is']);
    } else {
      out.push(['Widest view held', span,
                'out of the ' + (all === 32 ? '4,294,967,296' : '2^128') +
                ' your address lives in']);
    }
  }
  if (n.oldest && REG && REG.older) {
    var pc = Math.round(REG.older[Math.min(n.oldest, 2100)] * 100);
    out.push(['Oldest block found', String(n.oldest),
              'older than ' + pc + '% of the space anybody holds']);
  }
  if (n.dist > 0) {
    var v4 = 4294967296;
    if (n.dist >= 9007199254740992) {
      /* past 2^53 the count is no longer an integer and group() turns
       * exponential notation into confetti. An IPv6 hop is routinely 10^37
       * addresses, so this is the normal case out there, not the edge:
       * say it in powers of two, which is how the space is actually
       * built, and admit that it is approximate. */
      out.push(['Distance travelled',
                'about 2^' + Math.round(Math.log(n.dist) / Math.LN2) + ' addresses',
                'the whole of IPv4 is 2^32 of them']);
    } else if (n.dist >= v4) {
      out.push(['Distance travelled', group(Math.round(n.dist)) + ' addresses',
                (n.dist / v4).toFixed(n.dist / v4 < 10 ? 1 : 0) +
                ' times the whole of IPv4']);
    } else {
      out.push(['Distance travelled', group(Math.round(n.dist)) + ' addresses',
                (n.dist / v4 * 100).toFixed(2) + '% of the whole of IPv4']);
    }
  }
  return out;
}

/* The sites themselves, newest first. Bounded, because a logbook that has
 * to be scrolled for a minute before it says anything is a database. */
function noteSites(limit) {
  var n = noteLoad(), out = [], k, s;
  for (k in n.sites) {
    s = n.sites[k];
    out.push({ p: k, t: (s && s.t) || 0, asn: (s && s.asn >= 0) ? s.asn : -1,
               who: (s && s.who) || '', cc: (s && s.cc) || '',
               year: (s && s.year) || 0, said: !!(s && s.said) });
  }
  out.sort(function (a, b) { return b.t - a.t; });
  return { rows: out.slice(0, limit), more: Math.max(0, out.length - limit) };
}

function buildNotebook() {
  if (!el.noteBody) return;
  var rows = notebookRows(), i, h2, p2, b, s;
  el.noteBody.innerHTML = '';
  h2 = document.createElement('h2');
  h2.textContent = 'Your notebook';
  el.noteBody.appendChild(h2);
  if (!rows.length) {
    p2 = document.createElement('p');
    p2.textContent = 'Nothing recorded yet. Move the view, pick a block, and ' +
      'what you find is written down here — on this device, and nowhere else.';
    el.noteBody.appendChild(p2);
    return;
  }
  /* 31-share: the brag sheet, as a card */
  var shb = document.createElement('button');
  shb.type = 'button'; shb.className = 'ask shareNote';
  shb.textContent = 'Share your notebook';
  shb.onclick = function () { openShare(shareNotebookItem()); };
  p2 = document.createElement('p'); p2.appendChild(shb); el.noteBody.appendChild(p2);
  for (i = 0; i < rows.length; i++) {
    h2 = document.createElement('h3');
    h2.textContent = rows[i][0];
    el.noteBody.appendChild(h2);
    p2 = document.createElement('p');
    b = document.createElement('b');
    b.textContent = rows[i][1];
    p2.appendChild(b);
    if (rows[i][2]) {
      p2.appendChild(document.createElement('br'));
      s = document.createElement('span');
      s.textContent = rows[i][2];
      p2.appendChild(s);
    }
    el.noteBody.appendChild(p2);
  }
  notebookLines(el.noteBody);   /* 29-chains */
  var got = noteSites(30);
  if (got.rows.length) {
    h2 = document.createElement('h3');
    h2.textContent = 'The places themselves';
    el.noteBody.appendChild(h2);
    var ul = document.createElement('ul');
    ul.className = 'sites';
    for (i = 0; i < got.rows.length; i++) {
      var g = got.rows[i], liEl = document.createElement('li');
      b = document.createElement('b');
      b.textContent = g.p;
      liEl.appendChild(b);
      var bits = [];
      if (g.asn >= 0) bits.push('AS' + g.asn + (g.who ? '  ·  ' + g.who : ''));
      else if (!g.said) bits.push('nothing announced here');
      if (g.cc) bits.push(g.cc);
      if (g.year) bits.push(String(g.year));
      if (bits.length) {
        liEl.appendChild(document.createElement('br'));
        s = document.createElement('span');
        s.textContent = bits.join('  ·  ');
        liEl.appendChild(s);
      }
      ul.appendChild(liEl);
    }
    el.noteBody.appendChild(ul);
    if (got.more) {
      p2 = document.createElement('p');
      p2.className = 'foot';
      p2.textContent = 'and ' + group(got.more) + ' more before these.';
      el.noteBody.appendChild(p2);
    }
  }
  p2 = document.createElement('p');
  p2.className = 'foot';
  p2.textContent = 'Kept on this device only. Nothing is sent anywhere, and ' +
    'clearing your browser data clears this too.';
  el.noteBody.appendChild(p2);
}

/* Record an answered place. Returns how many times it had been seen BEFORE
 * this visit, which is what the guide and the flare decide on - so it is
 * read first and written second. */
function recordArrival(at, rec) {
  var key = (rec.status === 'ready' && rec.prefix) ? rec.prefix : at;
  var seen = seenCount(key);
  noteSite(at, rec);
  return seen;
}
