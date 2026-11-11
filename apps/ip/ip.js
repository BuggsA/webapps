/* ip — what's my IP.  PHASE 4: travel.
 *
 * Design:   ../../docs/ip-art-direction.md   ("Survey")
 * Story:    ../../docs/ip-narrative-and-outline.md
 * Plan:     ../../docs/ip-build-plan.md
 * Renderer: ../../docs/ip-render-research.md
 * Depth:    ../../docs/ip-infinity-research.md
 * Data:     ../../docs/ip-data-research.md
 *
 * Phase 1 put the address on the page. Phase 2 replaced the renderer.
 * Phase 3 adds the first thing worth travelling to: the block your address
 * is actually announced inside.
 *
 * Three calls the owner made for this phase, recorded so a later session
 * does not quietly reverse them:
 *   1. The origin holds the SUBJECT, not Home. The block is centred; your
 *      address is the amber mark wherever it genuinely falls inside it.
 *   2. IPv6 is counted in /64 subnets, IPv4 in addresses. Both are true;
 *      only one of them is legible.
 *   5. The axis does NOT stop because the data ran out. An address in no
 *      announced prefix can still travel. (Nothing further out exists yet,
 *      so this one starts mattering in phase 4.)
 *
 * And the standing rule from the same conversation: the axis is HELD, not
 * stepped. It does not snap. Scale is meant to feel like something in the
 * visitor's hand, because wandering is the point of the whole thing.
 *
 * Phase 4.5 step 1 made the depth true. The axis used to stop at 3 for
 * everyone, because 3 is what IPv4 needs. It is now the real bit depth of
 * the address family — 2.67 steps for IPv4, 10.42 for IPv6 — walked as a
 * LADDER of 12-bit rungs through four recycled layer slots. An IPv6 visitor
 * descends ten rungs, through their own /64 and /48, to 2000::/3.
 *
 * Then phase 4 made it somewhere you can GO. The owner's words: "this
 * should feel like ... almost like the universe where you could expore a
 * gyser on mars or check out the milkyway then visit the largest crater on
 * europa. Not a one way slide, but exploration."
 *
 * The whole of that is one substitution. Everything drawn used to be built
 * around the visitor's own address; it is now built around S.aim, which
 * starts as their address and stops being it the moment they travel. Choosing
 * a block does not label it any more, it GOES there: the block takes the
 * origin, the ladder re-anchors to it, and home becomes a place somewhere
 * else with the distance said plainly. Zoom is one axis, travel is the
 * other, and together they are not a slider.
 *
 * Two rules that came out of building it, and hold for every later phase:
 *   - never turn an absolute address into a float, only an offset from the
 *     container that frames it. 128 bits do not fit in a float32.
 *   - text must never wait on a frame. Which state owns the plate changes
 *     continuously, so setAxis syncs the DOM itself.
 *
 * MAP OF THIS FILE — grep the ALL-CAPS tags
 *   CONFIG      palette, camera, layers, scale constants
 *   UTIL        clamp, colour, addresses as BigInt, prefixes
 *   STATE       the one state object
 *   CAMERA      matrices, projection, screen mapping, layer weights
 *   SCENE       the chassis and the block, as renderer-agnostic data
 *   GL          the WebGL2 renderer
 *   C2D         the Canvas 2D fallback
 *   RENDERER    pick one, drive it, stop when nothing is moving
 *   AXIS        the scale axis, picking, and what moves them
 *   DATA        whoami, then RIPEstat — deferred, cached, optional
 *   DOM         answer, plate, mark, rail, companion, about
 *   BOOT
 */

(function () {
  'use strict';

  /* ══ CONFIG ══════════════════════════════════════════════════════════ */

  var C = {
    ground: [0.0035, 0.0048, 0.0095],
    groundCss: '#05070d',
    cold: [0.40, 0.56, 0.82],
    coldHi: [0.80, 0.89, 1.0],
    amber: [1.0, 0.66, 0.13],
    /* WHERE YOU HAVE BEEN. A FOURTH colour role, added 2026-09-19 by the
     * owner's decision, against the locked three-role rule. Recorded as
     * their decision, with the date, in docs/ip-art-direction.md.
     *
     * What it fixes: the map had no memory. Nothing the visitor did changed
     * it, so three days of wandering left a frame identical to the first
     * one. S.trail is never drawn and the notebook is never read by the
     * renderer, despite the art direction claiming amber covers the trail.
     *
     * Why not amber: amber is you, NOW. Spending it on your history would
     * put hundreds of you on the plate, and the one mark meaning "here I
     * am" would stop being scarce. The owner's own framing - it must not
     * compete with your own address.
     *
     * Why warmer than the CSS cream: #F2EDE3 is very nearly white, and
     * white is what blown-out looks like in an additive HDR frame. The hue
     * has to survive the bloom and the tone map, so it is pushed warmer at
     * the source in order to LAND at cream on screen. */
    been: [1.0, 0.94, 0.82]
  };

  /* The camera. Horizon at 0.33H, origin at 0.59H, at every state in every
   * phase. That is what makes them one instrument, so nothing animates it. */
  var CAM = { y: 0.55, z: -2.2, pitch: 0.16, fov: 0.888 };

  /* CONVENTION, and a trap worth knowing about before laying out any grid:
   * the camera faces +z, so in a right-handed world **+x renders on the
   * LEFT of the screen**. Anything that should read left-to-right — a block
   * of addresses in index order, a row of prefixes, the Hilbert field —
   * has to be laid out along -x. SCREEN_X flips it in one place. */
  function SCREEN_X(x) { return -x; }

  var FIELD = 64;      /* the space fields are always 64x64 cells, stated */
  var STEP_BITS = 12;  /* 4096 cells, so one whole step of the axis is 12 bits */

  var BASE = 0.58;     /* world units per scene unit at rest */
  /* Apparent size per whole step of the axis.
   *
   * TRUE REGISTRATION IS NOT AVAILABLE HERE, and it is worth writing down
   * why. A rung's container is one cell of the rung above it, so for two
   * rungs to overlay exactly, the scale between them would have to be FIELD
   * (64) AND each field would have to be drawn at the position its container
   * occupies inside its parent, rather than centred. Setting ZOOM to 64 on
   * its own makes things worse, not better — measured: the same block landed
   * 147px apart across a cross-fade instead of 23px, because scaling up an
   * unregistered offset only magnifies it. Proper registration is the
   * unbounded-Hilbert redesign, which is deferred.
   *
   * What IS available: the aim itself is locked across every layer once the
   * convergence completes, because every layer then puts it at the origin.
   * So the convergence is tuned to finish within one step — one layer
   * transition — and the thing the visitor is watching stays put through it
   * even though the texture around it does not. */
  /* PHASE B: registration forces this. A rung's container is one cell of the
   * rung above, and a field is FIELD x FIELD cells, so the scale between
   * adjacent rungs must be exactly FIELD or the two cannot overlay. Setting
   * it to 64 alone was tried once and made things worse — 23px of
   * disagreement became 147px — because scaling up an unregistered offset
   * only magnifies it. It needs the positions too, which it now has.
   *
   * FIELD is declared above this on purpose: `var` hoists the declaration
   * and not the value, so writing this before FIELD was assigned made ZOOM
   * undefined and every scale in the app silently NaN, with a blank frame
   * and nothing in the console. */
  var ZOOM = FIELD;
  var FOG = 0.085;
  var FOCAL = 2.55;

  /* Layers let one instance buffer carry geometry at different scales and
   * opacities, so one state grows into frame while another shrinks out of it.
   *
   * Three are fixed. The rest are a RING: the ladder can be any length, and
   * the slots are recycled as the visitor travels along it, so an IPv6
   * descent of eleven rungs costs the same four slots as an IPv4 one of two.
   * A rung contributes nothing once it is a whole step away, so at most
   * three are ever live and the fourth is headroom. */
  var SLOTS = 4;
  var LY = { CHASSIS: 0, BLOCK: 1, HOME: 2, SLOT0: 3 };
  var LAYERS = LY.SLOT0 + SLOTS;


  var RIPE = 'https://stat.ripe.net/data/';
  var CACHE_TTL = 1000 * 60 * 60 * 24 * 7;   /* routing facts move in months */
  var CACHE_KEY = 'ip.v1.';

  /* ══ UTIL ════════════════════════════════════════════════════════════ */

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function rgba(c, a) {
    return 'rgba(' + Math.round(c[0]*255) + ',' + Math.round(c[1]*255) + ',' +
           Math.round(c[2]*255) + ',' + a + ')';
  }
  function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ── addresses ─────────────────────────────────────────────────────── */

  function parseIp4(str) {
    var p = str.split('.'), v = 0n, i, n;
    if (p.length !== 4) return null;
    for (i = 0; i < 4; i++) {
      if (!/^\d{1,3}$/.test(p[i])) return null;
      n = parseInt(p[i], 10);
      if (n > 255) return null;
      v = (v << 8n) | BigInt(n);
    }
    return { v: 4, big: v, bits: 32, text: str };
  }
  function parseIp6(str) {
    var halves = str.split('::');
    if (halves.length > 2) return null;
    function words(part) {
      if (!part) return [];
      var out = [], seg = part.split(':'), i, f;
      for (i = 0; i < seg.length; i++) {
        if (seg[i] === '') return null;
        if (seg[i].indexOf('.') >= 0) {
          f = parseIp4(seg[i]);
          if (!f) return null;
          out.push(Number((f.big >> 16n) & 0xffffn));
          out.push(Number(f.big & 0xffffn));
          continue;
        }
        if (!/^[0-9a-fA-F]{1,4}$/.test(seg[i])) return null;
        out.push(parseInt(seg[i], 16));
      }
      return out;
    }
    var head = words(halves[0]);
    var tail = halves.length === 2 ? words(halves[1]) : [];
    if (head === null || tail === null) return null;
    var fill = 8 - head.length - tail.length, i;
    if (halves.length === 1) { if (head.length !== 8) return null; fill = 0; }
    else if (fill < 0) return null;
    var all = head.concat(new Array(fill).fill(0), tail), v = 0n;
    if (all.length !== 8) return null;
    for (i = 0; i < 8; i++) v = (v << 16n) | BigInt(all[i]);
    return { v: 6, big: v, bits: 128, text: str };
  }
  function parseIp(str) {
    if (!str) return null;
    str = String(str).trim();
    if (str.length > 45) return null;
    return str.indexOf(':') >= 0 ? parseIp6(str) : parseIp4(str);
  }
  function parseCidr(str) {
    if (!str) return null;
    var bits = String(str).split('/');
    if (bits.length !== 2) return null;
    var a = parseIp(bits[0]);
    if (!a) return null;
    var len = parseInt(bits[1], 10);
    if (!(len >= 0 && len <= a.bits)) return null;
    var host = BigInt(a.bits - len);
    return { v: a.v, net: (a.big >> host) << host, len: len, bits: a.bits, text: str };
  }

  function ipToText(big, ver) {
    var i, out = [];
    if (ver === 4) {
      for (i = 3; i >= 0; i--) out.push(Number((big >> BigInt(i*8)) & 255n));
      return out.join('.');
    }
    /* RFC 5952 text form: collapse the LONGEST run of zero groups, and only
     * a run of two or more. A regex for this is fragile — 2000::/3 came out
     * as 2000:0:0:0:0:0:0:0/3 — so it is done by hand. */
    var g = [];
    for (i = 7; i >= 0; i--) g.push(Number((big >> BigInt(i*16)) & 0xffffn));
    var best = -1, bestLen = 0, cur = -1, curLen = 0;
    for (i = 0; i < 8; i++) {
      if (g[i] === 0) {
        if (cur < 0) { cur = i; curLen = 0; }
        curLen++;
        if (curLen > bestLen) { best = cur; bestLen = curLen; }
      } else { cur = -1; curLen = 0; }
    }
    var parts = g.map(function (v) { return v.toString(16); });
    if (bestLen >= 2) {
      return parts.slice(0, best).join(':') + '::' +
             parts.slice(best + bestLen).join(':');
    }
    return parts.join(':');
  }

  /* The unit a block is measured in. IPv4 counts addresses; IPv6 counts /64
   * subnets, because that is the unit IPv6 is actually handed out in and
   * because "1,208,925,819,614,629,174,706,176 addresses" tells a person
   * nothing at all. Both statements are exactly true. (Owner's call.) */
  function prefixUnit(cidr) {
    if (cidr.v === 6 && cidr.len <= 64) {
      return { bits: 64 - cidr.len, shift: 64n, one: 'subnet', many: 'subnets',
               tail: ' of the usual size (/64)' };
    }
    return { bits: cidr.bits - cidr.len, shift: 0n, one: 'address',
             many: 'addresses', tail: '' };
  }

  function prefixGrid(cidr, addrBig) {
    var u = prefixUnit(cidr);
    var colBits = Math.min(Math.ceil(u.bits / 2), 6);
    var rowBits = Math.max(Math.min(u.bits - colBits, 6), 0);
    var cols = 1 << colBits, rows = 1 << rowBits;
    var shown = BigInt(cols) * BigInt(rows);
    var total = 1n << BigInt(u.bits);
    var per = total / shown;
    if (per < 1n) per = 1n;
    var cell = -1;
    if (addrBig !== null && addrBig !== undefined) {
      var off = ((addrBig - cidr.net) >> u.shift) / per;
      if (off >= 0n && off < shown) cell = Number(off);
    }
    return { cols: cols, rows: rows, cell: cell, per: per, total: total,
             shown: shown, unit: u };
  }

  function splitAddr(text, cidr) {
    if (!cidr) return { fixed: '', vary: text, bits: 0 };
    var host = BigInt(cidr.bits - cidr.len);
    var a = ipToText(cidr.net, cidr.v);
    var b = ipToText(cidr.net + ((1n << host) - 1n), cidr.v);
    var i = 0;
    while (i < a.length && i < b.length && a.charAt(i) === b.charAt(i)) i++;
    var sep = cidr.v === 6 ? ':' : '.';
    var cut = text.lastIndexOf(sep, i);
    cut = cut < 0 ? 0 : cut + 1;
    var fixed = text.slice(0, cut);
    /* only claim it if it really is a prefix of this address — an IPv6
     * text form can compress differently and then the claim would be false */
    if (!fixed || text.indexOf(fixed) !== 0) return { fixed: '', vary: text, bits: 0 };
    return { fixed: fixed, vary: text.slice(cut), bits: cidr.len };
  }

  function setSplit(fixedEl, varyEl, text, cidr) {
    var sp = splitAddr(text, cidr);
    fixedEl.textContent = sp.fixed;
    varyEl.textContent = sp.vary;
  }

  /* The one-sentence rule the whole space field rests on: a block's
   * position is the Hilbert index of its number. Numerically adjacent
   * blocks stay spatially adjacent, which is why the clumps and voids in
   * the field are real allocation history and not decoration. */
  function d2xy(n, d) {
    var rx, ry, t = d, x = 0, y = 0, sc, tmp;
    for (sc = 1; sc < n; sc *= 2) {
      rx = 1 & (t >> 1);
      ry = 1 & (t ^ rx);
      if (ry === 0) {
        if (rx === 1) { x = sc - 1 - x; y = sc - 1 - y; }
        tmp = x; x = y; y = tmp;
      }
      x += sc * rx; y += sc * ry;
      t >>= 2;
    }
    return [x, y];
  }
  function xy2d(n, x, y) {
    var rx, ry, d = 0, sc, tmp;
    for (sc = n / 2; sc > 0; sc = Math.floor(sc / 2)) {
      rx = (x & sc) > 0 ? 1 : 0;
      ry = (y & sc) > 0 ? 1 : 0;
      d += sc * sc * ((3 * rx) ^ ry);
      if (ry === 0) {
        if (rx === 1) { x = sc - 1 - x; y = sc - 1 - y; }
        tmp = x; x = y; y = tmp;
      }
    }
    return d;
  }

  /* ── ONE CURVE, NOT ONE PER RUNG ───────────────────────────────────────
   * Phase B of ../../docs/ip-plan-v2.md, and the whole of why the descent
   * used to fall apart between layers.
   *
   * Every rung used to lay out its own container with its own d2xy over
   * 0..4095. Two rungs therefore disagreed about where an address was, the
   * same block appeared in two places 23px apart through every cross-fade,
   * and travel read as flicking between slides of different sizes.
   *
   * The fix is not to reconcile them. It is to stop having two. A cell's
   * position is its index on ONE curve over the whole address space at that
   * cell size, so a container is automatically an aligned 64x64 tile of its
   * parent and `child >> 12 === parent` falls out with no rotation state
   * carried anywhere. Verified before building; see the plan.
   *
   * ~20 ms a rung, flat with depth, because BigInt work below 2^128 costs
   * about the same whatever the magnitude. Rebuilds are rare. It is fine.
   */

  function d2xyB(order, d) {
    var x = 0n, y = 0n, t = d, s = 1n, n = 1n << BigInt(order), rx, ry, tmp;
    for (; s < n; s <<= 1n) {
      rx = 1n & (t >> 1n);
      ry = 1n & (t ^ rx);
      if (ry === 0n) {
        if (rx === 1n) { x = s - 1n - x; y = s - 1n - y; }
        tmp = x; x = y; y = tmp;
      }
      x += s * rx; y += s * ry;
      t >>= 2n;
    }
    return [x, y];
  }

  function xy2dB(order, x, y) {
    var d = 0n, s = 1n << BigInt(order - 1), rx, ry, tmp;
    for (; s > 0n; s >>= 1n) {
      rx = (x & s) > 0n ? 1n : 0n;
      ry = (y & s) > 0n ? 1n : 0n;
      d += s * s * ((3n * rx) ^ ry);
      if (ry === 0n) {
        if (rx === 1n) { x = s - 1n - x; y = s - 1n - y; }
        tmp = x; x = y; y = tmp;
      }
    }
    return d;
  }

  /* Where a rung's 4,096 cells sit on the global curve, and where the aim
   * sits among them.
   *
   * A container's cells are contiguous on the curve, and by the nesting
   * property they occupy an aligned 64x64 tile — so this is still the
   * container the plate names, merely laid out in the one coordinate system
   * every other rung also uses.
   *
   * `ox`/`oy` are the aim's exact position in this rung's grid, carried as a
   * fraction so that the rungs agree with each other to well below a pixel.
   * They are measured against the deepest rung on screen, which is the only
   * level fine enough to place the aim precisely; when the deepest rung
   * changes the reference moves by less than one of its cells, which is
   * sub-pixel by construction and so cannot be seen.
   */
  function rungLayout(f, refOrder, refX, refY) {
    var k = f.cellLen >> 1;                       /* cells are 2^cellLen */
    var base = (f.containerNet >> f.cellShift);   /* first cell, globally */
    var cells = FIELD * FIELD, i;
    var gx = new Float64Array(cells), gy = new Float64Array(cells);
    /* and the way back, for picking: grid square -> which cell is there */
    var inv = new Int32Array(cells);
    var xy = d2xyB(k, base);
    var tileX = xy[0] >> 6n, tileY = xy[1] >> 6n;
    /* the tile is aligned, so the local layout is the global curve restricted
     * to it — computed cell by cell because that is what makes it the same
     * curve rather than a copy of one */
    for (i = 0; i < cells; i++) {
      var p = d2xyB(k, base + BigInt(i));
      gx[i] = Number(p[0] - (tileX << 6n));
      gy[i] = Number(p[1] - (tileY << 6n));
      inv[gy[i] * FIELD + gx[i]] = i;
    }
    /* the aim's position in this rung's grid, to a fraction of a cell */
    var drop = refOrder - k;
    var div = Math.pow(2, drop);
    var mask = (1n << BigInt(drop)) - 1n;
    var aimX = Number((refX >> BigInt(drop)) - (tileX << 6n));
    var aimY = Number((refY >> BigInt(drop)) - (tileY << 6n));
    var subX = (Number(refX & mask) + 0.5) / div;
    var subY = (Number(refY & mask) + 0.5) / div;
    /* ox/oy are the aim's EXACT position in this rung's grid, as a real
     * number. Not the centre of the cell it happens to be in: that is a
     * different point at every level, and the difference is multiplied by
     * FIELD on the way up, so a half-cell fudge here came out as 28px of
     * disagreement two rungs away. The exact position is the only thing all
     * the levels can agree about. */
    return { gx: gx, gy: gy, inv: inv, k: k,
             ox: aimX + subX, oy: aimY + subY };
  }

  /* A field of 4096 blocks: a container, and the 12 bits below it.
   * Everything here is arithmetic on the visitor's own number -- no lookup
   * is made, and none is implied.
   *
   * FLOATING ORIGIN, and why this is already safe: 128 bits do not survive a
   * float32's 24-bit mantissa, so a deep IPv6 descent would jitter and then
   * quantise if any absolute address ever reached the renderer. None does.
   * A field is a container plus a cell OFFSET inside it, and an offset is
   * never larger than 4095. The rule for every later phase is the same —
   * never turn an absolute address into a float, only an offset from the
   * container that frames it. */
  function fieldAt(containerLen) {
    if (!S.home || S.aim === null) return null;
    var bits = S.home.bits;
    var cellLen = containerLen + STEP_BITS;
    if (cellLen > bits || containerLen < 0) return null;
    var cShift = BigInt(bits - containerLen);
    /* the container is whatever holds the AIM, not whatever holds you. That
     * one substitution is the difference between a slider and a place you
     * can travel in. */
    var containerNet = (S.aim >> cShift) << cShift;
    var cellShift = BigInt(bits - cellLen);
    var idx = Number((S.aim - containerNet) >> cellShift);
    if (!(idx >= 0 && idx < FIELD * FIELD)) return null;
    /* Your own address is drawn only when it is genuinely inside this
     * container. Travel far enough and it is simply not here — which is the
     * honest state, and the one that makes the distance mean anything. */
    var homeIdx = -1;
    if ((S.home.big >> cShift) === containerNet >> cShift) {
      homeIdx = Number((S.home.big - containerNet) >> cellShift);
      if (!(homeIdx >= 0 && homeIdx < FIELD * FIELD)) homeIdx = -1;
    }
    return { containerNet: containerNet, containerLen: containerLen,
             cellLen: cellLen, cellShift: cellShift, idx: idx,
             homeIdx: homeIdx, bits: bits, v: S.home.v };
  }

  /* How far the aim has travelled from the visitor's own address. IPv6
   * counts /64 subnets for the same reason the block does: the true number
   * of addresses is exact and tells a person nothing. */
  function distanceHome() {
    if (!S.home || S.aim === null) return '';
    var d = S.aim > S.home.big ? S.aim - S.home.big : S.home.big - S.aim;
    if (d === 0n) return 'your own address';
    if (S.home.v === 6 && (d >> 64n) > 0n) {
      var subs = d >> 64n;
      return group(subs.toString()) + (subs === 1n ? ' subnet' : ' subnets') +
             ' from yours';
    }
    return group(d.toString()) + (d === 1n ? ' address' : ' addresses') +
           ' from yours';
  }

  /* ── LANDMARKS ─────────────────────────────────────────────────────────
   * Places worth finding. Nobody explores a space with no named things in
   * it, and until now every cell was anonymous until it was clicked.
   *
   * THE RULE: every entry here is either a fact fixed by an RFC, or an
   * address published by the organisation that operates it. Nothing needs a
   * lookup and nothing can quietly rot into fiction as space is re-delegated
   * — and where a landmark has a holder, the holder is still EARNED by the
   * same RIPEstat call as every other block. The note says what the place
   * IS; the instrument says who is actually there.
   *
   * The root server addresses are not from memory: they are the contents of
   * the IANA root hints, https://www.internic.net/domain/named.root.
   */
  var MARKS = [
    /* IPv4, special use — RFC 6890 and the RFCs it collects */
    { p: '0.0.0.0/8',        n: 'This network',
      w: 'The address a machine uses before it has one.' },
    { p: '10.0.0.0/8',       n: 'Private use',
      w: 'RFC 1918. These addresses exist inside millions of buildings at once, and not one of them is reachable from here.' },
    { p: '100.64.0.0/10',    n: 'Carrier-grade NAT',
      w: 'RFC 6598. Where your phone probably lives: an address your carrier gave you that the internet cannot route to.' },
    { p: '127.0.0.0/8',      n: 'Loopback',
      w: '16,777,216 addresses that all mean here. Almost nobody ever uses more than the first one.' },
    { p: '169.254.0.0/16',   n: 'Link-local',
      w: 'RFC 3927. What a machine gives itself when nothing answered.' },
    { p: '172.16.0.0/12',    n: 'Private use',  w: 'RFC 1918.' },
    { p: '192.0.2.0/24',     n: 'TEST-NET-1',
      w: 'RFC 5737. Addresses that exist only in documentation. Nothing is here, and nothing may ever be.' },
    { p: '192.168.0.0/16',   n: 'Private use',
      w: 'RFC 1918. Almost certainly the range behind your own router.' },
    { p: '198.18.0.0/15',    n: 'Benchmarking',
      w: 'RFC 2544. Set aside for testing network equipment against itself.' },
    { p: '198.51.100.0/24',  n: 'TEST-NET-2',  w: 'RFC 5737. Documentation only.' },
    { p: '203.0.113.0/24',   n: 'TEST-NET-3',  w: 'RFC 5737. Documentation only.' },
    { p: '224.0.0.0/4',      n: 'Multicast',
      w: 'RFC 5771. Not places but conversations, which you join rather than visit.' },
    { p: '240.0.0.0/4',      n: 'Reserved for the future',
      w: '268,435,456 addresses set aside in 1981 for a future that has not arrived. A sixteenth of all IPv4, still empty.' },
    { p: '255.255.255.255/32', n: 'Broadcast', w: 'Everyone on this link, at once.' },

    /* IPv4, published resolvers — the holder is confirmed by lookup */
    { p: '8.8.8.8/32',       n: 'Google Public DNS',
      w: 'Published in 2009, and one of the addresses the most DNS questions on earth are asked at.' },
    { p: '1.1.1.1/32',       n: 'Cloudflare and APNIC resolver',
      w: 'So much misconfigured equipment sent traffic to 1.1.1.1 that the address was considered unusable. There is a public resolver on it anyway.' },
    { p: '9.9.9.9/32',       n: 'Quad9',       w: 'A filtering public resolver.' },

    /* IPv6, special use */
    { p: '::/128',           n: 'Unspecified', w: 'No address at all.' },
    { p: '::1/128',          n: 'Loopback',
      w: 'IPv4 spends 16 million addresses on meaning here. IPv6 spends exactly one.' },
    { p: '64:ff9b::/96',     n: 'NAT64',
      w: 'RFC 6052. The whole of IPv4, embedded inside IPv6 so the two internets can speak.' },
    { p: '2001::/32',        n: 'Teredo',      w: 'RFC 4380. IPv6 smuggled through IPv4.' },
    { p: '2001:db8::/32',    n: 'Documentation',
      w: 'RFC 3849. Every IPv6 address in every textbook and manual is in here. Nothing else ever will be.' },
    { p: '2002::/16',        n: '6to4',
      w: 'RFC 3056. A bridge built between the two internets, and then abandoned.' },
    { p: 'fc00::/7',         n: 'Unique local', w: 'RFC 4193. IPv6 private space.' },
    { p: 'fe80::/10',        n: 'Link-local',
      w: 'RFC 4291. Every IPv6 interface has one of these whether anyone asked for it or not.' },
    { p: 'ff00::/8',         n: 'Multicast',   w: 'RFC 4291.' }
  ];

  /* the thirteen, named a to m */
  var ROOTS = [
    ['a', '198.41.0.4', '2001:503:ba3e::2:30'], ['b', '170.247.170.2', '2801:1b8:10::b'],
    ['c', '192.33.4.12', '2001:500:2::c'],      ['d', '199.7.91.13', '2001:500:2d::d'],
    ['e', '192.203.230.10', '2001:500:a8::e'],  ['f', '192.5.5.241', '2001:500:2f::f'],
    ['g', '192.112.36.4', '2001:500:12::d0d'],  ['h', '198.97.190.53', '2001:500:1::53'],
    ['i', '192.36.148.17', '2001:7fe::53'],     ['j', '192.58.128.30', '2001:503:c27::2:30'],
    ['k', '193.0.14.129', '2001:7fd::1'],       ['l', '199.7.83.42', '2001:500:9f::42'],
    ['m', '202.12.27.33', '2001:dc3::35']
  ];
  ROOTS.forEach(function (r) {
    var w = r[0] + '.root-servers.net — one of the thirteen addresses every ' +
            'name on the internet is ultimately looked up through.';
    MARKS.push({ p: r[1] + '/32',  n: 'Root server ' + r[0].toUpperCase(), w: w });
    MARKS.push({ p: r[2] + '/128', n: 'Root server ' + r[0].toUpperCase(), w: w });
  });

  MARKS.forEach(function (m) {
    var c = parseCidr(m.p);
    if (!c) { m.bad = 1; return; }
    m.v = c.v; m.net = c.net; m.len = c.len; m.bits = c.bits;
    m.last = c.net + ((1n << BigInt(c.bits - c.len)) - 1n);
  });
  MARKS = MARKS.filter(function (m) { return !m.bad; });

  /* Which cells of a field a landmark touches. Computed per landmark rather
   * than per cell: 4096 cells against 50 landmarks would be 200,000
   * comparisons on every rebuild, where this is 50. A landmark larger than a
   * cell lights every cell it covers, which is the point — 240.0.0.0/4
   * should read as a whole empty region of the map, not as a dot. */
  function marksInField(f) {
    var out = {}, list = [], cells = FIELD * FIELD, i, m, a, b, k, n, lit, sz;
    var lo = f.containerNet;
    var hi = lo + (BigInt(cells) << f.cellShift) - 1n;
    for (i = 0; i < MARKS.length; i++) {
      m = MARKS[i];
      if (m.v !== f.v || m.last < lo || m.net > hi) continue;
      a = m.net < lo ? 0 : Number((m.net - lo) >> f.cellShift);
      b = m.last > hi ? cells - 1 : Number((m.last - lo) >> f.cellShift);
      if (b >= cells) b = cells - 1;
      /* A landmark the size of one cell is a lamp; a landmark covering a
       * sixteenth of IPv4 is a REGION, and lighting 256 cells as brightly as
       * one lamp turns a quarter of the map into a single white smear that
       * the tone map then crushes everything else against. Brightness per
       * cell falls with the square root of how many cells it covers, so a
       * big landmark reads as a lit territory and a small one as a point. */
      n = b - a + 1;
      lit = 0.66 * clamp(3.2 / Math.sqrt(n), 0.15, 1);
      sz = n > 1 ? lerp(1.9, 3.4, clamp(4 / Math.sqrt(n), 0, 1)) : 3.4;
      for (k = a; k <= b; k++) {
        if (out[k] === undefined || out[k].n < n) out[k] = { m: m, i: lit, s: sz, n: n };
      }
      list.push({ m: m, a: a, b: b, n: n, i: lit });
    }
    /* `cells` is the per-cell map the field reads while it draws; `list` is
     * the landmarks themselves, so each can be drawn ONCE as a shape instead
     * of only as a scatter of brighter dots. A landmark has to be a
     * different KIND of thing, not a brighter instance of the same thing --
     * that is what makes it navigable. See docs/ip-exploration-research.md. */
    return { cells: out, list: list };
  }

  /* WHERE YOU HAVE BEEN, as cells of this field.
   *
   * A BUG FIX, found 2026-09-19 while giving visited cells their own
   * colour. S.asked is keyed by the aim's bare address ("193.0.6.139").
   * The field looked up S.asked[fieldPrefix(f, i)] — "193.0.0.0/24" — and
   * NOTHING has ever written a key in that shape. The two honest states
   * the field means to draw, asked-and-announced and asked-and-empty,
   * could therefore never be reached, at any rung, since they were
   * written. The same dead lookup drove the hover note, which is why a
   * cell you had stood in still read as unasked when you pointed at it.
   *
   * Keying by cell prefix could not have worked in any case: a visit is a
   * POINT and a cell is an AREA, and one visit has to show at every rung,
   * where the cell containing it is a different prefix each time. So the
   * visit stays an address and is mapped into cells here, exactly the way
   * marksInField maps a landmark's range.
   *
   * Cheap enough to do on every scene build because buildSpace runs on
   * rung crossings, not on frames, and S.asked holds tens of entries. */
  /* The notebook as address RANGES, parsed once and kept until it changes.
   *
   * A visit is a POINT, and `a` records it. The key is the announced
   * PREFIX, which is what became known but is not where anybody stood.
   *
   * Drawing the prefix instead was tried and measured: five visits lit
   * 1,541 of 4,096 cells, because an announced /14 is 1,024 cells at the
   * /24 rung. At that rate the map is mostly cream after a morning and the
   * mark stops meaning anything.
   *
   * Records written before `a` existed keep only the prefix, so we do not
   * know which cell inside it they stood in. Those are drawn ONLY at rungs
   * where the prefix is a single cell — where the question does not arise.
   * Finer than that we decline to guess, which is the same rule the rest of
   * the instrument runs on. They heal on the next visit. */
  var beenCache = null;
  function beenRanges() {
    if (beenCache) return beenCache;
    var out = [], n, k, s, sl, a, bits, len;
    try { n = noteLoad(); } catch (e) { return (beenCache = out); }
    for (k in n.sites) {
      s = n.sites[k];
      if (!s) continue;
      sl = k.indexOf('/');
      a = parseIp(sl < 0 ? k : k.slice(0, sl));
      if (!a) continue;
      bits = a.v === 4 ? 32 : 128;
      len = sl < 0 ? bits : parseInt(k.slice(sl + 1), 10);
      if (!(len >= 0 && len <= bits)) continue;
      /* a `1` is a record written by an older version, which kept no
       * details; it is still a place that was visited. */
      var said = (s !== 1 && s.said && s.asn >= 0);
      var pt = (s !== 1 && s.a) ? parseIp(s.a) : null;
      out.push({ net: a.big, last: a.big + (1n << BigInt(bits - len)) - 1n,
                 at: (pt && pt.v === a.v) ? pt.big : null,
                 v: a.v, status: said ? 'ready' : 'empty',
                 asn: said ? s.asn : -1, holder: (s !== 1 && s.who) || '' });
    }
    return (beenCache = out);
  }

  function beenInField(f) {
    var out = {}, cells = FIELD * FIELD, lo = f.containerNet;
    var hi = lo + (BigInt(cells) << f.cellShift) - 1n;
    var k, a, rec, i, j, list, r, aa, bb;

    /* announced outranks empty, because the cell does contain something;
     * among equals the brighter claim wins. */
    function put(idx, status, asn, holder, at) {
      var cur = out[idx];
      if (cur && cur.status === 'ready' && status !== 'ready') return;
      if (cur && cur.status === status && cur.i >= at) return;
      out[idx] = { status: status, asn: asn, holder: holder, i: at };
    }

    /* THIS session, from the lookup cache. A point: one cell, full weight. */
    for (k in S.asked) {
      rec = S.asked[k];
      /* 'loading' is a question in flight, not an answer. Lighting it would
       * say the instrument knows something it is still waiting for. */
      if (!rec || rec.status === 'loading') continue;
      a = parseIp(k);
      if (!a || a.v !== f.v || a.big < lo || a.big > hi) continue;
      i = Number((a.big - lo) >> f.cellShift);
      if (i < 0 || i >= cells) continue;
      put(i, rec.status, rec.asn, rec.holder, 1);
    }

    /* EVERY session, from the notebook. One cell each: a visit is a point,
     * and a point is one cell at every rung. */
    list = beenRanges();
    for (j = 0; j < list.length; j++) {
      r = list[j];
      if (r.v !== f.v || r.last < lo || r.net > hi) continue;
      if (r.at !== null) {
        if (r.at < lo || r.at > hi) continue;
        i = Number((r.at - lo) >> f.cellShift);
      } else {
        /* no recorded address: only place it where the prefix IS the cell,
         * because anywhere finer we would be inventing which one. */
        aa = r.net < lo ? 0 : Number((r.net - lo) >> f.cellShift);
        bb = r.last > hi ? cells - 1 : Number((r.last - lo) >> f.cellShift);
        if (bb >= cells) bb = cells - 1;
        if (bb !== aa) continue;
        i = aa;
      }
      if (i < 0 || i >= cells) continue;
      put(i, r.status, r.asn, r.holder, 1);
    }
    return out;
  }

  /* How many cells of this field the visitor has asked about, NOT counting
   * their own. Computed here rather than read off f.been, because the plate
   * must never wait on a frame: buildSpace runs on rung crossings, and the
   * text has to be right before the next one. That invariant has been
   * broken three times in this file already. */
  function beenCountIn(f) {
    var b = beenInField(f), k, n = 0;
    for (k in b) if (+k !== f.homeIdx) n++;
    return n;
  }

  /* The landmark an address is standing in, if any; the most specific wins,
   * so a root server inside a /8 reports as the root server. */
  function markAt(big, v) {
    var i, m, best = null;
    for (i = 0; i < MARKS.length; i++) {
      m = MARKS[i];
      if (m.v === v && big >= m.net && big <= m.last) {
        if (!best || m.len > best.len) best = m;
      }
    }
    return best;
  }

  /* ── THE LADDER ────────────────────────────────────────────────────────
   * The axis is a prefix length read as a continuous number: s = 0 frames a
   * single address, s = maxAxis frames the whole of the family's space, and
   * one whole step of the axis is STEP_BITS of the address.
   *
   * This is where IPv4 and IPv6 stop being the same shape. A v4 /21 has
   * 21 bits above it and nothing usable below, so its ladder is two rungs
   * and the axis is 2.67 steps long. A v6 /32 has 96 bits of its own space
   * underneath it, so its ladder is ten rungs and the axis is 10.4 steps.
   * That asymmetry is not an effect laid over the data. It is the size
   * difference, walked.
   *
   * Before this the axis stopped at 3 for everyone, because 3 is what IPv4
   * needed. See ../../docs/ip-infinity-research.md §1. */
  function floorLen(v) { return v === 6 ? 3 : 0; }

  function axisOfLen(len) {
    return (S.home.bits - len) / STEP_BITS;
  }

  /* The rungs, deep first.
   *
   * The lattice has to be 12 bits apart and nothing else will do: a rung's
   * cells are the next rung's containers, so the nesting is only exact on a
   * uniform step. That leaves one real choice — where to pin it.
   *
   * Pinning it to the announced block was the obvious idea and it is wrong.
   * A v6 /32 anchored on itself gives rungs at /44, /56, /68 — straddling
   * /64 and never framing it. But /64 is the one boundary every IPv6 network
   * shares: it is the subnet. So the lattice is pinned to /64 for v6 and /24
   * for v4, and the announced block becomes a LANDMARK BETWEEN RUNGS, drawn
   * by its own layer at its own position and marked on the rail. Which is
   * truer anyway — your prefix length is a fact about you, not about the
   * shape of the space.
   *
   * The payoff is the rung at /52: four thousand subnets, one of them yours. */
  function planLadder() {
    if (!S.home) { S.ladder = []; S.maxAxis = 3; S.anchor = 0; S.blockAxis = 1; return; }
    var sub = S.subject;
    var hasBlock = !!(sub && sub.status === 'ready' && sub.cidr);
    var lo = floorLen(S.home.v), hi = S.home.bits, L, out = [];
    S.anchor = S.home.v === 6 ? 64 : 24;
    S.maxAxis = (hi - lo) / STEP_BITS;
    S.blockAxis = hasBlock ? axisOfLen(sub.cidr.len) : axisOfLen(S.anchor);

    for (L = S.anchor; L > lo; L -= STEP_BITS) out.push(L);
    if (out[out.length - 1] !== lo) out.push(lo);
    for (L = S.anchor + STEP_BITS; L < hi; L += STEP_BITS) out.unshift(L);
    /* and the deepest rung the family allows, on-lattice or not. Without it
     * the first pull of the axis moves nothing for a whole step, because the
     * nearest rung is still out of range — a dead gesture, and the first one
     * the visitor makes. It drops out again if it crowds what is already
     * there, which is what happens on IPv4. */
    if (out[0] !== hi - STEP_BITS) out.unshift(hi - STEP_BITS);

    /* A rung needs a full field under it, must not BE the block, and must
     * not crowd the rung below it.
     *
     * The block rule used to be "drop anything within a third of a step",
     * which quietly deleted both of its neighbours: a /16 block sits 0.333
     * from the rungs either side of it, so both were culled and the ladder
     * collapsed to a single rung. Travel to somewhere with a /16 and the
     * axis did nothing across most of its range. The only genuine duplicate
     * is a rung whose CONTAINER is the block itself — that field and the
     * block's own grid are the same thing drawn twice. Everything else is a
     * different scale and is welcome to overlap; the weights are normalised,
     * so nothing gets brighter for it. */
    var blockLen = hasBlock ? sub.cidr.len : -1;
    var kept = [], i, a, last = -99;
    for (i = 0; i < out.length; i++) {
      L = out[i];
      if (L > hi - STEP_BITS) continue;
      if (L === blockLen) continue;
      a = axisOfLen(L);
      if (a - last < 0.34) continue;
      kept.push(L); last = a;
    }
    if (kept.length && kept[kept.length - 1] !== lo) {
      if (S.maxAxis - axisOfLen(kept[kept.length - 1]) < 0.34) kept.pop();
      kept.push(lo);
    }
    S.ladder = kept;
  }

  /* Which rungs are close enough to contribute, and which slot each takes.
   * Consecutive rungs never collide because they are one whole step apart
   * and there are four slots. */
  function liveRungs() {
    var out = new Array(SLOTS), i, a;
    for (i = 0; i < S.ladder.length; i++) {
      a = axisOfLen(S.ladder[i]);
      if (Math.abs(a - S.s) >= 1) continue;
      out[i % SLOTS] = { len: S.ladder[i], axis: a, k: i, slot: i % SLOTS,
                         f: fieldAt(S.ladder[i]) };
    }
    return out;
  }

  /* The set of live rungs, as a string. When this changes the geometry has
   * to be rebuilt, because a slot is about to start showing a different
   * rung. It is the whole mechanism of the ring. */
  function rungKey() {
    var i, k = '';
    for (i = 0; i < S.ladder.length; i++) {
      if (Math.abs(axisOfLen(S.ladder[i]) - S.s) < 1) k += S.ladder[i] + ',';
    }
    return k;
  }
  function fieldPrefix(f, index) {
    return ipToText(f.containerNet + (BigInt(index) << f.cellShift), f.v) +
           '/' + f.cellLen;
  }
  function containerName(f) {
    return ipToText(f.containerNet, f.v) + '/' + f.containerLen;
  }

  /* ── cache: public routing facts only, never anything about you ────── */

  function cacheGet(k) {
    try {
      var raw = localStorage.getItem(CACHE_KEY + k);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return (!o || Date.now() - o.t > CACHE_TTL) ? null : o.d;
    } catch (_) { return null; }
  }
  function cacheSet(k, d) {
    try { localStorage.setItem(CACHE_KEY + k, JSON.stringify({ t: Date.now(), d: d })); }
    catch (_) { /* private mode or full quota: not a failure worth showing */ }
  }

  /* ══ STATE ═══════════════════════════════════════════════════════════ */

  var S = {
    home: null,
    source: '',
    net: null,
    asked: {},          /* cell prefix -> what came back when we asked */
    aim: null,          /* BigInt: the address the instrument is POINTED AT.
                         * starts as yours and stops being yours the moment
                         * the visitor travels. Everything drawn is built
                         * around this, not around home. */
    subject: null,      /* the announced block at the aim, as S.net is for home */
    trail: [],          /* where the aim has been, so there is a way back */
    ptr: null,          /* where the pointer last was, in client pixels, so the
                         * highlight can be recomputed as the camera settles
                         * underneath it. Null when it is off the canvas. */
    sound: false,       /* the ears are off until asked, always */
    guide: true,        /* the guide is ON by default and mutes persistently */
    gone: null,         /* and the coarsest. Together with `been` these are the
                         * two ends of the traverse, so every rung between
                         * them is one the visitor has genuinely passed. */
    been: null,         /* the finest axis actually HELD. The descent leaves a
                         * trail behind it, not a diagram of the hierarchy:
                         * a container is outlined because the visitor went
                         * there, not because it happens to contain them. */
    renderFail: '',     /* why there is no picture, if there is no picture */
    query: null,        /* what the visitor asked the map to show, if anything */
    pickAxis: null,     /* the zoom the last choice was made at; the frame
                         * slides onto that choice as you go in from here */
    shape: null,        /* every block the subject's network announces */
    travelled: false,   /* has this visitor ever gone anywhere */
    s: 0,
    maxAxis: 3,         /* the real depth of THIS address family */
    anchor: 0,          /* the prefix length the ladder is pinned to */
    blockAxis: 1,       /* where on the axis the announced block sits */
    ladder: [],         /* container prefix lengths, deep first */
    rungs: [],          /* what each live slot is showing right now */
    ref: null,          /* the frame every rung positions itself against */
    rungKey: '',
    yaw: 0,
    reduced: false,
    W: 0, H: 0, DPR: 1,
    px: 0, py: 0, tx: 0, ty: 0,
    hot: 0,
    running: false,
    renderer: ''
  };

  var cv, el = {}, R = null;

  /* ══ CAMERA ══════════════════════════════════════════════════════════ */

  function mul(a, b) {
    var o = new Float32Array(16), i, j, k, s;
    for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) {
      s = 0;
      for (k = 0; k < 4; k++) s += a[k*4+j] * b[i*4+k];
      o[i*4+j] = s;
    }
    return o;
  }
  function persp(fov, asp, n, f) {
    var t = 1 / Math.tan(fov / 2);
    return new Float32Array([t/asp,0,0,0, 0,t,0,0, 0,0,(f+n)/(n-f),-1,
                             0,0,2*f*n/(n-f),0]);
  }
  function look(eye, at, up) {
    function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
    function nz(v){var l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l];}
    function cr(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
    function dt(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
    var z=nz(sub(eye,at)), x=nz(cr(up,z)), y=cr(z,x);
    return new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
                             -dt(x,eye),-dt(y,eye),-dt(z,eye),1]);
  }
  /* The camera basis, yaw included. `look` builds its axes from
   * z = normalize(eye - at), so for a camera facing +z the right vector is
   * (-1, 0, 0) and world +x renders on the LEFT. Everything that reasons
   * about screen direction by hand has to use THIS, not an assumed +x. */
  function camBasis() {
    var cy = Math.cos(S.yaw), sy = Math.sin(S.yaw);
    var cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch);
    function ry(v) { return [v[0]*cy + v[2]*sy, v[1], -v[0]*sy + v[2]*cy]; }
    return { right: ry([-1, 0, 0]), up: ry([0, cp, sp]), fwd: ry([0, -sp, cp]) };
  }
  function eyePos() {
    var b = camBasis(), cy = Math.cos(S.yaw), sy = Math.sin(S.yaw);
    var e = [CAM.z * sy, CAM.y, CAM.z * cy];
    if (!S.reduced) {
      /* lean toward the pointer, along the camera's own right */
      e[0] += b.right[0] * S.px * 0.16;
      e[2] += b.right[2] * S.px * 0.16;
      e[1] -= S.py * 0.05;
    }
    return e;
  }
  function viewProj() {
    var eye = eyePos(), b = camBasis();
    var at = [eye[0] + b.fwd[0]*10, eye[1] + b.fwd[1]*10, eye[2] + b.fwd[2]*10];
    return mul(persp(CAM.fov, S.W / S.H, 0.02, 400), look(eye, at, [0,1,0]));
  }
  function toScreen(VP, x, y, z) {
    var cx = VP[0]*x + VP[4]*y + VP[8]*z + VP[12];
    var cy = VP[1]*x + VP[5]*y + VP[9]*z + VP[13];
    var cw = VP[3]*x + VP[7]*y + VP[11]*z + VP[15];
    if (cw <= 1e-4) return null;
    return { x: (cx/cw*0.5+0.5) * S.W, y: (1-(cy/cw*0.5+0.5)) * S.H };
  }

  var layerScale = new Float32Array(LAYERS);
  var layerAlpha = new Float32Array(LAYERS);
  /* What each layer WEIGHS, and what each layer EMITS, are not the same
   * number. layerAlpha is the weight: which state owns the plate, which
   * field answers the pointer, which rung the sound is on. layerLight is
   * what the shader gets, and it carries the concentration fade on top. The
   * two were one array until a rung dimmed for being small also stopped
   * being pickable and handed the plate to the block. */
  var layerLight = new Float32Array(LAYERS);
  var layerPan = new Float32Array(LAYERS * 2);   /* x,z per layer */

  /* Each state fades in over its own window and is drawn at its own scale,
   * so pulling the axis is travel rather than a slide change. Adjacent
   * windows overlap, which is what makes it continuous. */
  /* Superposed octaves, each fading in as the one before it fades out, the
   * weights summing to one. That is exactly the construction of a Shepard
   * tone — the barber pole that rises forever without getting higher — which
   * is why pulling the axis reads as travel and not as a slide change. It
   * was built before anyone noticed what it was; see
   * ../../docs/ip-infinity-research.md §2. */
  function weightAt(a) {
    var d = Math.abs(S.s - a);
    if (d >= 1) return 0;
    var c = Math.cos(d * Math.PI / 2);
    return c * c;
  }
  function scaleAt(a) { return BASE * Math.pow(ZOOM, a - S.s); }
  function panX(ly) { return layerPan[ly * 2]; }
  function panZ(ly) { return layerPan[ly * 2 + 1]; }

  /* The states are NORMALISED to sum to one.
   *
   * cos² is a partition of unity only while the things being weighted are
   * exactly one step apart, and on this ladder they are not: the floor clamp
   * and the announced block both sit off-lattice, leaving gaps of up to 1.33
   * steps. Left alone the picture would visibly dim every time the axis
   * crossed one. Dividing through by the sum costs one pass and makes the
   * brightness independent of how the rungs happen to fall — which is what
   * lets the block be a landmark wherever it really is, instead of being
   * shoved onto the lattice to keep the maths tidy. */
  function layers() {
    var i, ly, r, sum = 0;
    layerScale[LY.CHASSIS] = BASE;  layerAlpha[LY.CHASSIS] = 1;
    layerScale[LY.HOME] = BASE;     layerAlpha[LY.HOME] = weightAt(0);
    layerScale[LY.BLOCK] = scaleAt(S.blockAxis);
    /* only if there is actually a block drawn. An address with no announced
     * prefix still HAS a blockAxis — it is where the anchor sits — and
     * letting that empty layer take a share of the normalised weight would
     * dim the field around it for exactly the visitors who have least to
     * look at. */
    /* CONCENTRATION. Accumulation is additive, so a layer that has shrunk
     * puts the same geometry through fewer pixels and each one gets hotter.
     * The block is where this bites: pulled a step past it, a /16 packs a
     * thousand marks, four bright corners and a rim into a hundred pixels,
     * the bloom takes it to white, and the tone map then crushes the field
     * behind it to nothing. Fading it by its own shrinkage cancels that,
     * and because the weights are normalised the light goes to the field
     * rather than being lost. Zoomed IN past the block this is 1 and
     * nothing changes. */
    var shrink = Math.min(1, Math.pow(ZOOM, S.blockAxis - S.s));
    layerAlpha[LY.BLOCK] = blockGeom ? weightAt(S.blockAxis) * shrink : 0;
    for (i = 0; i < SLOTS; i++) {
      ly = LY.SLOT0 + i; r = S.rungs[i];
      layerScale[ly] = r ? scaleAt(r.axis) : BASE;
      layerAlpha[ly] = r ? weightAt(r.axis) : 0;
    }
    /* CONVERGENCE. Every rung frames an ALIGNED container, so before this
     * the chosen block jumped to a new place on screen at every boundary it
     * crossed and never travelled toward anything — flicking through slides
     * of different sizes rather than going somewhere. The owner: "it feels
     * less like you are going to the point you click."
     *
     * The fix is the standard one. van Wijk & Nuij model a view as a centre
     * and a width, and moving to a target is a path along which the centre
     * slides toward it as the width shrinks; pointer-anchored zoom in every
     * map and image viewer is the same idea. The container stays aligned,
     * because the arithmetic has to — but the FIELD is panned, from
     * container-centred at the zoom the choice was made at, to
     * choice-centred as the visitor goes in.
     *
     * conv = 0 at the instant of the click, so nothing moves when it
     * happens; conv -> 1 over about two rungs, so by the time the block is
     * large enough to be the subject it is also under the reticle. Panned in
     * 2D rather than in address space, because the field is laid out on a
     * Hilbert curve and "halfway between two addresses" is not a place on
     * screen. */
    /* With the rungs registered the aim is world zero in every one of them,
     * so it would otherwise sit dead centre from the instant of the click —
     * and the owner's model is that the centre is NOT what you clicked until
     * you have gone in far enough.
     *
     * So the convergence survives as a RIGID translation: one world offset,
     * applied to every layer at once, running from container-centred at the
     * moment of choosing to aim-centred as the visitor descends. Rigid is
     * the load-bearing word — translating the whole stack together is the
     * only kind of pan that cannot pull the layers out of register. Each
     * layer divides it by its own scale because the shader multiplies after
     * adding. */
    var conv = S.pickAxis === null ? 1
             : 1 - clamp(Math.pow(2, 8 * (S.s - S.pickAxis)), 0, 1);
    layerPan.fill(0);
    if (conv < 0.9995) {
      var domi = -1, domA = 0;
      for (i = 0; i < SLOTS; i++) {
        if (fieldGeoms[LY.SLOT0 + i] && layerAlpha[LY.SLOT0 + i] > domA) {
          domA = layerAlpha[LY.SLOT0 + i]; domi = i;
        }
      }
      if (domi >= 0) {
        var dg = fieldGeoms[LY.SLOT0 + domi];
        var dws = layerScale[LY.SLOT0 + domi];
        /* the world offset that would put the dominant container's centre
         * on the origin, faded out as the descent converges on the choice */
        var ox = -(dg.x0 + 0.65) * dws * (1 - conv);
        var oz = -(dg.z0 + 0.65) * dws * (1 - conv);
        for (i = 0; i < LAYERS; i++) {
          var ws = layerScale[i];
          if (!(ws > 0)) continue;
          layerPan[i * 2] = SCREEN_X(ox) / ws;
          layerPan[i * 2 + 1] = oz / ws;
        }
      }
    }

    sum = layerAlpha[LY.HOME] + layerAlpha[LY.BLOCK];
    for (i = 0; i < SLOTS; i++) sum += layerAlpha[LY.SLOT0 + i];
    if (sum > 0.001) {
      layerAlpha[LY.HOME] /= sum;
      layerAlpha[LY.BLOCK] /= sum;
      for (i = 0; i < SLOTS; i++) layerAlpha[LY.SLOT0 + i] /= sum;
    }

    /* CONCENTRATION, for the rungs, and it has to be HERE -- after the
     * normalisation, not before it.
     *
     * A rung draws 4,096 marks whatever size it is on screen. Pulled a
     * fraction of a step past one, the same 4,096 marks go through a
     * quarter of the pixels, additive accumulation piles them up, the bloom
     * finishes the job, and the middle of the field becomes a solid white
     * slab. It sits exactly where the container you came out of is drawn,
     * so it was hiding the whole point of phase B.
     *
     * The block has had this fix since phase 3. Extending it to the rungs
     * the obvious way does nothing at all, because the rung weights are
     * NORMALISED straight afterwards and normalising divides the fade back
     * out: measured, /12 at axis 1.85 went 0.8716 -> 0.8392, a four percent
     * change against a slab that needed halving. A weight cannot express
     * this, because it is not a question of which rung deserves the light --
     * it is that the same geometry through fewer pixels should emit less
     * light in total. So it is an absolute attenuation, applied last, and
     * the frame is genuinely dimmer for it. That is the correct answer.
     *
     * Zoomed in past a rung it is 1 and nothing changes. */
    layerLight.set(layerAlpha);
    for (i = 0; i < SLOTS; i++) {
      r = S.rungs[i];
      if (!r) continue;
      layerLight[LY.SLOT0 + i] *= Math.min(1, Math.pow(ZOOM, r.axis - S.s));
    }
  }

  /* ══ SCENE ═══════════════════════════════════════════════════════════ */

  var lines = [], points = [], pools = [], surfs = [], targets = [];
  var markAnchor = null;
  var blockGeom = null;   /* what pick() needs to invert the projection */
  var fieldGeoms = {};    /* layer -> the same, for whichever rungs are live */
  var cursor = null;      /* the mark the pointer is nearest, and what it is */

  function L(a, b, col, i, w, glow, layer, id) {
    lines.push({ a:a, b:b, col:col, i:i, w:w||1.0,
                 glow: glow === undefined ? 0.3 : glow,
                 layer: layer||0, id: id||0 });
  }
  function P(p, col, i, size, layer, id) {
    points.push({ p:p, col:col, i:i, size:size||6, layer:layer||0, id:id||0 });
  }
  function Pool(x, z, r, col, i, layer) {
    pools.push({ x:x, z:z, r:r, col:col, i:i, layer:layer||0 });
  }
  function Surf(cen, u, v, col, i, layer, id) {
    surfs.push({ cen:cen, u:u, v:v, col:col, i:i, layer:layer||0, id:id||0 });
  }

  function buildScene() {
    lines.length = 0; points.length = 0; pools.length = 0;
    surfs.length = 0; targets.length = 0;
    markAnchor = null; blockGeom = null; cursor = null;
    fieldGeoms = {};
    var i, j, r, t0, t1, CH = LY.CHASSIS;

    var EXT = 14;
    for (i = -EXT; i <= EXT; i++) {
      L([i,0,-2], [i,0,20], C.cold, 0.17, 1.0, 0.24, CH);
      L([-EXT,0,i+6], [EXT,0,i+6], C.cold, 0.13, 1.0, 0.20, CH);
    }
    var rings = [0.22, 0.40, 0.68, 1.12, 1.85, 3.0];
    for (i = 0; i < rings.length; i++) {
      r = rings[i];
      for (j = 0; j < 96; j += 2) {
        t0 = j/96*6.2832; t1 = (j+1)/96*6.2832;
        L([Math.cos(t0)*r,0,Math.sin(t0)*r], [Math.cos(t1)*r,0,Math.sin(t1)*r],
          C.cold, 0.36, 1.0, 0.32, CH);
      }
    }
    for (i = -24; i <= 24; i++) {
      if (!i) continue;
      L([i*0.5,0,0], [i*0.5,(i%4===0)?0.05:0.026,0], C.cold, 0.26, 1.0, 0.26, CH);
    }
    L([0,0,0], [0,2.6,0], C.cold, 0.22, 1.0, 0.40, CH);

    /* You, at Home. The origin holds the AIM, so this mark is only your
     * address while the aim still is — once the visitor travels, the origin
     * is somewhere else and this goes cold. */
    var lit = S.home ? 1 : 0.22;
    var atHome = S.home && S.aim !== null && S.aim === S.home.big;
    P([0,0.004,0], atHome ? C.amber : C.coldHi, 1.7*lit, 5.5, LY.HOME, 99);
    Pool(0, 0, 0.15, atHome ? C.amber : C.coldHi, 0.16*lit, LY.HOME);

    if (S.subject && S.subject.status === 'ready') buildBlock();

    /* The ladder, at whichever rungs the axis is near. All of it is pure
     * arithmetic on the visitor's own number: no lookup is made here, and
     * the drawing is careful not to imply one. Only the rungs within a whole
     * step get built, so the cost is the same whether the ladder is two
     * rungs long or eleven. */
    if (S.home) {
      planLadder();
      S.rungs = liveRungs();
      S.rungKey = rungKey();
      /* One reference frame for every rung on screen, taken from the finest
       * one, because that is the only level able to place the aim precisely
       * enough for the others to agree with it. */
      var deepest = 0;
      for (i = 0; i < SLOTS; i++) {
        if (S.rungs[i] && S.rungs[i].f && S.rungs[i].f.cellLen > deepest) {
          deepest = S.rungs[i].f.cellLen;
        }
      }
      if (deepest) {
        var refK = deepest >> 1;
        var refCell = S.aim >> BigInt(S.home.bits - deepest);
        var rxy = d2xyB(refK, refCell);
        S.ref = { k: refK, x: rxy[0], y: rxy[1] };
      }
      for (i = 0; i < SLOTS; i++) {
        if (S.rungs[i] && S.rungs[i].f) buildSpace(LY.SLOT0 + i, S.rungs[i].f, S.rungs[i]);
      }
    }
  }

  /* O1. The block is the subject, so the block is centred on the origin and
   * the address sits where it really sits inside it. */
  function buildBlock() {
    var n = S.subject;
    /* the amber mark inside the block is HOME, and only if home is actually
     * in this block. Travel to somebody else's prefix and there is no amber
     * in it, which is exactly right. */
    var inside = S.home && n.cidr &&
      ((S.home.big >> BigInt(n.cidr.bits - n.cidr.len)) << BigInt(n.cidr.bits - n.cidr.len)) === n.cidr.net;
    var g = prefixGrid(n.cidr, inside ? S.home.big : null);
    var BL = LY.BLOCK, i, j;

    var W = 1.45, D = 1.45 * (g.rows / g.cols);
    if (D > 0.82) { W *= 0.82 / D; D = 0.82; }
    var H0 = 0.035, x0 = -W/2, z0 = -D/2 + 0.06;
    var cw = W / Math.max(g.cols - 1, 1), cd = D / Math.max(g.rows - 1, 1);

    /* the field of marks, bounded. When one mark stands for many, the plate
     * says so rather than implying one each.
     * Density matters: 2,048 marks at the brightness that suits 256 merge
     * into one lit slab, and then it is not a field of anything. */
    var dens = clamp(900 / (g.cols * g.rows), 0.22, 1);
    var dotI = 0.62 * dens, dotS = lerp(2.1, 3.0, dens);
    var step = (g.cols * g.rows > 2600) ? 2 : 1;
    for (j = 0; j < g.rows; j += step) {
      for (i = 0; i < g.cols; i += step) {
        if (j * g.cols + i === g.cell) continue;
        P([SCREEN_X(x0 + i*cw), H0 + 0.001, z0 + j*cd], C.coldHi, dotI, dotS, BL, 1);
      }
    }

    /* The frame around the block -- rim, corners, surface -- is fixed
     * brightness, while the block it frames is not: a square prefix is
     * barely half the screen width of a wide one, so the same four corner
     * lamps land close enough together to merge into a single white capsule
     * and the field of marks inside it disappears. Nobody saw this while
     * only the visitor's own block was ever drawn. Travel made every shape
     * of prefix reachable, and the fix is that the frame is worth what the
     * thing it frames is: a wide block is untouched, a square one is calm.
     * The marks themselves were never the problem -- a /14 draws FEWER per
     * unit area than a /21 does. */
    var spread = clamp(Math.min(W, 1.45) / 1.45, 0.4, 1);
    var rimI = 1.35 * spread, cornI = 2.3 * spread, cornS = lerp(4.4, 7, spread);
    var c0=[x0,H0,z0], c1=[x0+W,H0,z0], c2=[x0+W,H0,z0+D], c3=[x0,H0,z0+D];
    L(c0,c1,C.coldHi,rimI,1.4,0.7,BL,1); L(c1,c2,C.coldHi,rimI,1.4,0.7,BL,1);
    L(c2,c3,C.coldHi,rimI,1.4,0.7,BL,1); L(c3,c0,C.coldHi,rimI,1.4,0.7,BL,1);
    [c0,c1,c2,c3].forEach(function (c) { P(c, C.coldHi, cornI, cornS, BL, 1); });
    Surf([0,H0,z0+D/2],[W,0,0],[0,0,D], C.coldHi, 0.18 * spread, BL, 1);
    Pool(0, z0 + D/2, Math.max(W, D) * 0.66, C.coldHi, 0.13 * spread, BL);

    targets.push({ x:0, y:H0, z:z0+D/2, r:Math.max(W,D)*0.45, id:1, layer:BL });
    blockGeom = { x0:x0, z0:z0, cw:cw, cd:cd, cols:g.cols, rows:g.rows,
                  H0:H0, W:W, D:D, per:g.per, unit:g.unit, cell:g.cell };

    if (g.cell >= 0) {
      var li = g.cell % g.cols, lj = Math.floor(g.cell / g.cols);
      var mx = SCREEN_X(x0 + li*cw), mz = z0 + lj*cd;
      P([mx, H0 + 0.004, mz], C.amber, 2.1, 7, BL, 99);
      Pool(mx, mz, 0.12, C.amber, 0.22, BL);

      /* the leader, in world space, so it belongs to the picture rather
       * than being drawn over the top of it */
      /* point the leader away from the bulk of the block */
      var side = (li < (g.cols - 1) / 2) ? -1 : 1;
      var up = H0 + 0.46, out = mx + side * 0.52;
      L([mx, H0 + 0.01, mz], [mx, up, mz], C.cold, 0.5, 1.0, 0.3, BL);
      L([mx, up, mz], [out, up, mz], C.cold, 0.5, 1.0, 0.3, BL);
      markAnchor = { x: out, y: up, z: mz, mx: mx, mz: mz };
    }
  }

  /* A field of 4096 blocks. Yours is the only lit one, and that is the
   * honest state of it: every other cell is real address space, but whether
   * anything announces it is not known unless it is asked. */
  function buildSpace(layer, f, rung) {
    if (!f || !S.ref) return;
    /* A cell is an AREA, not a point: FIELD cells span exactly W, so a
     * container is exactly one cell of its parent and the nesting is exact.
     * The old W/(FIELD-1) put 64 points across 63 gaps, which is a fencepost
     * error you cannot see until you try to register two levels. */
    var W = 1.30, step = W / FIELD, i, px, pz;
    var lay = rungLayout(f, S.ref.k, S.ref.x, S.ref.y);
    f.lay = lay;
    /* Every position is measured from the aim's exact position, which is
     * world zero in every rung at once — that is what registration IS. The
     * +0.5 puts a mark at its cell's centre rather than its corner. */
    function wx(gx) { return SCREEN_X((gx + 0.5 - lay.ox) * step); }
    function wz(gy) { return (gy + 0.5 - lay.oy) * step; }

    var lmAll = marksInField(f);
    var lm = lmAll.cells;
    f.marks = lm;
    /* what the registries say about every cell here: allocated or not, and
     * how old. Free, and it is what stops the field being 4,096 identical
     * dark dots. */
    var reg = regInField(f);
    f.reg = reg;
    /* where this visitor has already been, mapped onto this rung's cells.
     * Kept on f so the hover note reads the same answer the picture drew. */
    var been = beenInField(f);
    f.been = been;
    /* how many cells this question lights, so it can be lit at a brightness
     * the frame can carry */
    var qn = 0, qi = 0.78;
    if (S.query && reg) {
      for (i = 0; i < FIELD * FIELD; i++) if (queryHit(reg.key[i])) qn++;
      qi = spread(qn, 0.78, 0.16);
    }
    /* every other block this network announces. Cold and bright, because it
     * is structure rather than the visitor — amber stays spent on one thing
     * only. Dimmed by how many cells the prefix covers, for the same reason
     * the landmarks are: a network holding a quarter of the frame should
     * read as territory, not as a bank of lamps. */
    var sh = shapeInField(f);
    f.shape = sh;
    for (i = 0; i < FIELD * FIELD; i++) {
      if (i === f.idx || i === f.homeIdx) continue;
      px = wx(lay.gx[i]); pz = wz(lay.gy[i]);
      /* A landmark is lit WITHOUT having been asked about, and it is the one
       * thing in the field allowed to be: it is a fact fixed by an RFC or an
       * address its operator published, so no lookup was skipped to know it.
       * Everything else still obeys lit = known, dark = unasked. */
      if (sh && sh.cells[i] !== undefined) {
        P([px, 0.007, pz], C.coldHi, sh.i, sh.lit > 600 ? 2.4 : 3.6, layer, 0);
        continue;
      }
      if (lm[i]) {
        P([px, 0.006, pz], C.coldHi, lm[i].i, lm[i].s, layer, 0);
        continue;
      }
      /* three honest states: unasked, asked-and-announced, asked-and-empty.
       * "Unasked" is no longer uniform: the registries already say whether
       * anybody holds this and since when, and that costs nobody a question. */
      var rec = been[i];
      if (!rec) {
        var lv = reg ? reg.level[i] : 0.16;
        if (S.query && reg) {
          /* a highlight, not a filter: the unmatched are still drawn and
           * still true, they simply stop competing for the eye */
          if (queryHit(reg.key[i])) {
            P([px, 0.006, pz], C.coldHi, qi, qn > 600 ? 2.4 : 3.4, layer, 0);
          }
          else { P([px, 0.003, pz], C.cold, lv * 0.35, 1.3, layer, 0); }
          continue;
        }
        P([px, 0.003, pz], C.cold, lv, lv > 0.3 ? 1.9 : 1.5, layer, 0);
      } else if (rec.status === 'ready') {
        /* C.been, not C.coldHi: a cell you asked about is no longer plain
         * structure. The intensity is DOWN from 0.95 because been is a much
         * brighter colour than coldHi (luminance 0.94 against 0.88) and the
         * swap would otherwise have raised the whole visited set by a stop. */
        P([px, 0.005, pz], C.been, 0.88 * rec.i, 4.2, layer, 0);
        /* the floor only catches a place you can point at. A remembered
         * prefix spanning hundreds of cells would otherwise lay down
         * hundreds of pools and wash the plate out. */
        if (rec.i > 0.6) Pool(px, pz, 0.055, C.been, 0.12, layer);
      } else {
        /* asked, and the answer was that nothing is announced here. That is
         * a real answer, so it is marked — just not as light. Still been:
         * going somewhere and finding nothing is still having been. Down
         * from 0.34 for the same luminance reason, been being 1.73x cold. */
        P([px, 0.004, pz], C.been, 0.20 * rec.i, 2.4, layer, 0);
      }
    }

    /* HOME, wherever it falls in this container — and nowhere at all once
     * the visitor has travelled out of it. Amber is only ever you. */
    if (f.homeIdx >= 0 && f.homeIdx !== f.idx) {
      px = wx(lay.gx[f.homeIdx]); pz = wz(lay.gy[f.homeIdx]);
      P([px, 0.010, pz], C.amber, 2.4, 7.5, layer, 98);
      Pool(px, pz, 0.085, C.amber, 0.30, layer);
    }

    /* THE AIM: what the instrument is pointed at. Amber when it is still
     * your own address, cold once you have gone somewhere. */
    var mx = wx(lay.gx[f.idx]), mz = wz(lay.gy[f.idx]);
    var own = f.idx === f.homeIdx;
    P([mx, 0.010, mz], own ? C.amber : C.coldHi, 2.4, 7.5, layer, 99);
    Pool(mx, mz, 0.085, own ? C.amber : C.coldHi, 0.30, layer);
    if (!own) {
      var br = step * 1.7;
      var b0=[mx-br,0.006,mz-br], b1=[mx+br,0.006,mz-br];
      var b2=[mx+br,0.006,mz+br], b3=[mx-br,0.006,mz+br];
      L(b0,b1,C.coldHi,0.9,1.2,0.5,layer); L(b1,b2,C.coldHi,0.9,1.2,0.5,layer);
      L(b2,b3,C.coldHi,0.9,1.2,0.5,layer); L(b3,b0,C.coldHi,0.9,1.2,0.5,layer);
    }
    targets.push({ x: mx, y: 0.010, z: mz, r: step * 2, id: 99, layer: layer,
                   idx: f.idx });

    /* where the aim sits in this field. With the rungs registered this is
     * near zero by construction — the aim IS the origin — so the
     * convergence pan has almost nothing left to correct, which is the
     * point. It has to be read AFTER mx/mz exist, which the first attempt
     * at this did not do, and undefined propagates as NaN silently all the
     * way to a blank frame with nothing in the console. */
    var aimX = mx, aimZ = mz;

    /* LANDMARKS AS THINGS.
     *
     * A landmark used to be a cell drawn brighter, which is the same kind of
     * mark as everything around it with the volume turned up. The level
     * design literature is consistent that a landmark -- a dominant, a focal
     * point, Disney's "wienie" -- has to be a UNIQUE ELEMENT OF THE
     * ARCHITECTURE that stands out from the composition. Brightness is a
     * degree; a landmark needs to differ in kind, or the eye has no reason
     * to pick it out of four thousand other dots.
     *
     * The art direction gives four materials -- points, hairlines, rimmed
     * surfaces, ground pools -- and landmarks were only using the first. So
     * a one-cell landmark gets a pool: it becomes a thing that casts light
     * on the floor rather than a dot. A landmark covering many cells gets a
     * hairline rim around its extent: it becomes a TERRITORY with a border,
     * and the shape of 10.0.0.0/8 is suddenly a thing you can see.
     *
     * An aligned prefix always lands on a Hilbert rectangle -- square when
     * it spans an even number of bits, a 2:1 domino when odd -- so the
     * bounding box IS the extent. That is asserted rather than trusted: if
     * the box does not contain exactly as many cells as the landmark does,
     * no rim is drawn, because a true rectangle around the wrong cells is
     * worse than no rectangle. See docs/ip-exploration-research.md. */
    var li, lk, lmr, lgx0, lgx1, lgy0, lgy1, lgxk, lgyk;
    for (li = 0; li < lmAll.list.length; li++) {
      lmr = lmAll.list[li];
      if (lmr.n === 1) {
        /* a lamp: it now stands on its own light */
        Pool(wx(lay.gx[lmr.a]), wz(lay.gy[lmr.a]), 0.052, C.coldHi,
             0.10 * lmr.i, layer);
        continue;
      }
      lgx0 = lgy0 = Infinity; lgx1 = lgy1 = -Infinity;
      for (lk = lmr.a; lk <= lmr.b; lk++) {
        lgxk = lay.gx[lk]; lgyk = lay.gy[lk];
        if (lgxk < lgx0) lgx0 = lgxk;
        if (lgxk > lgx1) lgx1 = lgxk;
        if (lgyk < lgy0) lgy0 = lgyk;
        if (lgyk > lgy1) lgy1 = lgyk;
      }
      if ((lgx1 - lgx0 + 1) * (lgy1 - lgy0 + 1) !== lmr.n) continue;
      var rx0 = (lgx0 - lay.ox) * step, rz0 = (lgy0 - lay.oy) * step;
      var rx1 = (lgx1 + 1 - lay.ox) * step, rz1 = (lgy1 + 1 - lay.oy) * step;
      /* Capped below the container boundary's 0.42. A landmark is a thing
       * inside the field; it does not get to outshout the edge of the field
       * it is inside. */
      var ri = clamp(0.22 * lmr.i * Math.sqrt(lmr.n), 0.08, 0.34);
      var q0=[SCREEN_X(rx0),0.003,rz0], q1=[SCREEN_X(rx1),0.003,rz0];
      var q2=[SCREEN_X(rx1),0.003,rz1], q3=[SCREEN_X(rx0),0.003,rz1];
      L(q0,q1,C.coldHi,ri,1.0,0.3,layer); L(q1,q2,C.coldHi,ri,1.0,0.3,layer);
      L(q2,q3,C.coldHi,ri,1.0,0.3,layer); L(q3,q0,C.coldHi,ri,1.0,0.3,layer);
    }

    /* the boundary of the container, so the field is a THING and not a
     * texture that happens to fill the frame. In global coordinates the tile
     * spans 64 cells from its own corner, wherever the aim happens to be
     * inside it. */
    var bx0 = -lay.ox * step, bz0 = -lay.oy * step;
    var c0=[SCREEN_X(bx0),0.002,bz0], c1=[SCREEN_X(bx0+W),0.002,bz0];
    var c2=[SCREEN_X(bx0+W),0.002,bz0+W], c3=[SCREEN_X(bx0),0.002,bz0+W];
    L(c0,c1,C.cold,0.42,1.1,0.3,layer); L(c1,c2,C.cold,0.42,1.1,0.3,layer);
    L(c2,c3,C.cold,0.42,1.1,0.3,layer); L(c3,c0,C.cold,0.42,1.1,0.3,layer);

    /* WHERE YOU CAME FROM.
     *
     * The aim's own cell, outlined -- and that cell IS the container of the
     * rung one finer, because registration makes a rung's whole field
     * exactly one cell of the rung above it. So this rectangle and that
     * rung's own boundary are the SAME rectangle on screen. As the finer
     * rung fades out its boundary does not vanish: this one is already drawn
     * underneath it, at this rung's alpha, and takes over. That handoff is
     * the whole effect. The place you just stood becomes one cell of the
     * place you are now, and stays outlined while it shrinks.
     *
     * Drawn only for rungs the visitor has actually been below. It is a
     * trail, not a diagram: the outline is there because they went there. On
     * a first descent the two are identical -- passing through the ladder is
     * the ladder -- and they part company the moment somebody travels away
     * and comes back.
     *
     * Contrast carries the depth because it is the only cue available here:
     * nested frames never occlude one another, and contrast reads as
     * distance even when size argues the other way (Rohaly & Wilson, 1994).
     * One frame, not a stack. Powers of Ten uses one, and the geometry
     * agrees -- a second level in is 1/64 of this one, which is under a
     * pixel. The nesting the eye actually sees comes from the live rungs
     * each drawing their own, which is three deep during a pull-back. */
    /* It is NOT always one cell. Rungs are pinned to a lattice, so the gap
     * between two of them is a whole step only some of the time -- an IPv4
     * ladder runs /20, /12, /0, and /20 to /12 is eight bits, not twelve.
     * The rectangle wanted is the finer rung's CONTAINER, which is a square
     * of 2^m cells on a side. The global curve makes that square contiguous
     * and lattice-aligned, so its corner is the aim's cell floored to it.
     * Outlining one cell regardless would draw a true rectangle that is not
     * the one the visitor came out of, which is worse than drawing none. */
    if (S.been !== null && rung && rung.k > 0) {
      var finerLen = S.ladder[rung.k - 1];
      var finerAxis = axisOfLen(finerLen);
      var bits = f.cellLen - finerLen;
      /* bits can be NEGATIVE: where two rungs are more than a step apart the
       * finer container is smaller than one cell of this field, and a
       * quarter-cell outline is still true and still visible. Below a
       * sixteenth it is not, so it is dropped rather than drawn as a smudge.
       *
       * ODD bits are skipped entirely. A prefix an odd number of bits inside
       * a square grid level covers half a cell, and which half depends on
       * the curve's local orientation -- it is a domino, not a square.
       * Rounding it up to the enclosing cell would draw a rectangle that is
       * not the container the visitor came out of, and a true rectangle in
       * the wrong place is worse than none. Happens once on an IPv6 ladder,
       * at /16 inside /3, which is the outermost view of all. */
      if (S.been <= finerAxis + 0.1 && bits >= -4 && bits % 2 === 0) {
        var side = Math.pow(2, bits / 2);
        /* aligned off the aim's EXACT position, not its cell index, so the
         * same line works for sub-cell containers */
        var cgx = Math.floor(lay.ox / side) * side;
        var cgy = Math.floor(lay.oy / side) * side;
        var ax0 = (cgx - lay.ox) * step, az0 = (cgy - lay.oy) * step;
        var aw = side * step;
        /* Flat, deliberately. The depth ramp the research asks for is
         * already here and already continuous: layerAlpha falls away from
         * whichever rung the axis is nearest and multiplies this, so the
         * container just left reads as nearest and the ones above it recede,
         * per frame, for free. Contrast does the work occlusion does
         * everywhere else, because nested frames never occlude.
         *
         * An intensity keyed to S.s was tried and taken out: buildScene runs
         * on rung crossings, not on frames, so it would have been frozen at
         * whatever the axis read when a slot last changed hands. Same shape
         * of bug as the plate going stale mid-travel, which cost three
         * fixes. Anything that must vary within a rung belongs in a uniform,
         * not in the geometry. */
        var camI = 0.70;
        if (camI > 0.03) {
          var e0=[SCREEN_X(ax0),0.004,az0], e1=[SCREEN_X(ax0+aw),0.004,az0];
          var e2=[SCREEN_X(ax0+aw),0.004,az0+aw], e3=[SCREEN_X(ax0),0.004,az0+aw];
          L(e0,e1,C.cold,camI,1.0,0.35,layer); L(e1,e2,C.cold,camI,1.0,0.35,layer);
          L(e2,e3,C.cold,camI,1.0,0.35,layer); L(e3,e0,C.cold,camI,1.0,0.35,layer);
          f.cameFrom = { x0:ax0, z0:az0, w:aw, len:finerLen };
        }
      }
    }

    fieldGeoms[layer] = { x0:bx0, z0:bz0, step:step, f:f, layer:layer,
                          lay:lay, aimX:aimX, aimZ:aimZ };
  }

  /* ══ GL ══════════════════════════════════════════════════════════════ */

  function makeGL(canvas) {
    var gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) return null;
    var hasFloat = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');

    function sh(t, src) {
      var s = gl.createShader(t);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function prog(vs, fs) {
      var p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      p.u = {};
      var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), i, inf;
      for (i = 0; i < n; i++) {
        inf = gl.getActiveUniform(p, i);
        p.u[inf.name.replace('[0]', '')] = gl.getUniformLocation(p, inf.name);
      }
      return p;
    }

    var H = '#version 300 es\nprecision highp float;\n';

    /* uFlip = -1 mirrors the world about the ground plane: the whole of the
     * planar reflection, with no second camera and no second target. The
     * gloss falloff falls out of height above the plane. */
    var COMMON = [
      'uniform mat4 uVP;',
      'uniform vec3 uEye;',
      'uniform vec2 uRes;',
      'uniform float uScale[' + LAYERS + '];',
      'uniform float uAlpha[' + LAYERS + '];',
      'uniform vec2 uPan[' + LAYERS + '];',
      'uniform float uFocal;',
      'uniform float uFlip;',
      'uniform float uGloss;',
      'uniform float uFogK;',
      'uniform float uHot;',
      'vec3 pan(vec3 p, int li){ return p + vec3(uPan[li].x, 0.0, uPan[li].y); }',
      'vec3 place(vec3 p, float ws){ vec3 q = p * ws; q.y *= uFlip; return q; }',
      'float reflFade(float h, float ws){ return uFlip > 0.0 ? 1.0 : uGloss * exp(-h*ws*9.0); }',
      'float reflBlur(float h, float ws){ return uFlip > 0.0 ? 0.0 : clamp(h*ws*3.4, 0.0, 1.0); }'
    ].join('\n') + '\n';

    var LINE_VS = H + COMMON + [
      'layout(location=0) in vec2 aCorner;',
      'layout(location=1) in vec3 aA;',
      'layout(location=2) in vec3 aB;',
      'layout(location=3) in vec4 aCol;',
      'layout(location=4) in vec4 aMeta;',
      'out float vSide; out vec4 vCol; out float vFeather; out float vFog; out float vGlow;',
      'void main(){',
      '  int li = int(aMeta.z);',
      '  float ws = uScale[li], la = uAlpha[li];',
      '  float hi = max(aA.y, aB.y);',
      '  if (la < 0.002 || (uFlip < 0.0 && hi < 0.004)) { gl_Position = vec4(2.0); return; }',
      '  vec3 A = place(pan(aA, li), ws), B = place(pan(aB, li), ws);',
      '  vec4 ca = uVP*vec4(A,1.0), cb = uVP*vec4(B,1.0);',
      '  vec4 cp = mix(ca, cb, aCorner.x);',
      '  vec3 wp = mix(A, B, aCorner.x);',
      '  vec2 na = ca.xy/max(ca.w,1e-4), nb = cb.xy/max(cb.w,1e-4);',
      '  vec2 d = (nb-na)*uRes; d /= max(length(d),1e-4);',
      '  vec2 nrm = vec2(-d.y, d.x);',
      '  float dist = distance(wp, uEye);',
      '  float coc = clamp(abs(dist-uFocal)/max(uFocal,0.001), 0.0, 3.0);',
      '  float blur = reflBlur(hi, ws);',
      '  float depthW = clamp(2.1/max(dist,0.6), 0.5, 1.7);',
      '  float lit = (uHot > 0.5 && abs(aMeta.w-uHot) < 0.5) ? 1.45 : 1.0;',
      '  float w = aMeta.x * depthW * (1.0 + coc*2.0) * (1.0 + blur*3.0);',
      '  cp.xy += (nrm * aCorner.y * w * 0.5 / uRes) * 2.0 * cp.w;',
      '  gl_Position = cp;',
      '  vSide = aCorner.y;',
      '  vCol = vec4(aCol.rgb, aCol.a * la * reflFade(hi, ws) * lit);',
      '  vFeather = clamp(0.24 + coc*0.5 + blur*0.5, 0.24, 0.97);',
      '  vFog = exp(-uFogK * dist);',
      '  vGlow = aMeta.y;',
      '}'
    ].join('\n');

    var LINE_FS = H + [
      'in float vSide; in vec4 vCol; in float vFeather; in float vFog; in float vGlow;',
      'out vec4 o;',
      'void main(){',
      '  float a = abs(vSide);',
      '  float core = 1.0 - smoothstep(1.0-vFeather, 1.0, a);',
      '  o = vec4(vCol.rgb * vCol.a * (core + exp(-a*a*2.6)*vGlow) * vFog, 1.0);',
      '}'
    ].join('\n');

    /* A tight core; the spreading is the bloom chain's job. */
    var PT_VS = H + COMMON + [
      'layout(location=0) in vec3 aP;',
      'layout(location=1) in vec4 aCol;',
      'layout(location=2) in vec3 aMeta;',
      'uniform float uDpr;',
      'out vec4 vCol; out float vFog; out float vSoft;',
      'void main(){',
      '  int li = int(aMeta.y);',
      '  float ws = uScale[li], la = uAlpha[li];',
      '  if (la < 0.002 || (uFlip < 0.0 && aP.y < 0.004)) { gl_Position = vec4(2.0); gl_PointSize = 1.0; return; }',
      '  vec3 Pp = place(pan(aP, li), ws);',
      '  float dist = distance(Pp, uEye);',
      '  float coc = clamp(abs(dist-uFocal)/max(uFocal,0.001), 0.0, 3.0);',
      '  float blur = reflBlur(aP.y, ws);',
      '  float lit = (uHot > 0.5 && abs(aMeta.z-uHot) < 0.5) ? 1.5 : 1.0;',
      '  float s = aMeta.x * clamp(2.1/max(dist,0.6), 0.35, 1.8) * (1.0+coc*1.5) * (1.0+blur*2.4);',
      '  gl_PointSize = max(s, 1.0) * uDpr;',
      '  gl_Position = uVP * vec4(Pp, 1.0);',
      '  vCol = vec4(aCol.rgb, aCol.a * la * reflFade(aP.y, ws) * lit);',
      '  vFog = exp(-uFogK * dist);',
      '  vSoft = clamp(0.10 + coc*0.30 + blur*0.55, 0.10, 0.92);',
      '}'
    ].join('\n');

    var PT_FS = H + [
      'in vec4 vCol; in float vFog; in float vSoft; out vec4 o;',
      'void main(){',
      '  float r = length(gl_PointCoord*2.0-1.0);',
      '  float core = 1.0 - smoothstep(1.0-vSoft, 1.0, r);',
      '  o = vec4(vCol.rgb * vCol.a * (core + exp(-r*r*3.6)*0.34) * vFog, 1.0);',
      '}'
    ].join('\n');

    /* A faint face with a bright rim: the difference between a solid and a
     * handful of sticks. */
    var SURF_VS = H + COMMON + [
      'layout(location=0) in vec2 aCorner;',
      'layout(location=1) in vec3 aC;',
      'layout(location=2) in vec3 aU;',
      'layout(location=3) in vec3 aV;',
      'layout(location=4) in vec4 aCol;',
      'layout(location=5) in vec2 aMeta;',
      'out vec2 vUv; out vec4 vCol; out float vFog; out float vGraze;',
      'void main(){',
      '  int li = int(aMeta.x);',
      '  float ws = uScale[li], la = uAlpha[li];',
      '  if (la < 0.002 || (uFlip < 0.0 && aC.y < 0.004)) { gl_Position = vec4(2.0); return; }',
      '  vec3 p = pan(aC, li) + aU*aCorner.x + aV*aCorner.y;',
      '  vec3 Pp = place(p, ws);',
      '  gl_Position = uVP * vec4(Pp, 1.0);',
      '  vUv = aCorner + 0.5;',
      '  float lit = (uHot > 0.5 && abs(aMeta.y-uHot) < 0.5) ? 1.55 : 1.0;',
      '  vCol = vec4(aCol.rgb, aCol.a * la * reflFade(aC.y, ws) * lit);',
      '  vFog = exp(-uFogK * distance(Pp, uEye));',
      '  vec3 nn = normalize(cross(aU, aV));',
      '  vGraze = pow(1.0 - abs(dot(nn, normalize(uEye - Pp))), 2.2);',
      '}'
    ].join('\n');

    var SURF_FS = H + [
      'in vec2 vUv; in vec4 vCol; in float vFog; in float vGraze; out vec4 o;',
      'void main(){',
      '  vec2 d = min(vUv, 1.0-vUv);',
      '  float rim = 1.0 - smoothstep(0.0, 0.035, min(d.x, d.y));',
      '  o = vec4(vCol.rgb * vCol.a * (0.020 + vGraze*0.12 + rim*1.15) * vFog, 1.0);',
      '}'
    ].join('\n');

    var POOL_VS = H + [
      'layout(location=0) in vec2 aCorner;',
      'layout(location=1) in vec3 aC;',
      'layout(location=2) in vec4 aCol;',
      'layout(location=3) in vec2 aMeta;',
      'uniform mat4 uVP; uniform vec3 uEye; uniform float uFogK;',
      'uniform float uScale[' + LAYERS + '];',
      'uniform float uAlpha[' + LAYERS + '];',
      /* the pool program does not include COMMON, so it needs its own copy
         of uPan and its own pan(): leaving it out was a compile error, which
         took the whole renderer down rather than just the pools */
      'uniform vec2 uPan[' + LAYERS + '];',
      'vec3 pan(vec3 p, int li){ return p + vec3(uPan[li].x, 0.0, uPan[li].y); }',
      'out vec2 vUv; out vec4 vCol; out float vFog;',
      'void main(){',
      '  int li = int(aMeta.y);',
      '  float ws = uScale[li], la = uAlpha[li];',
      '  if (la < 0.002) { gl_Position = vec4(2.0); return; }',
      '  vec3 p = pan(vec3(aC.x,0.0,aC.z), li)*ws + vec3(aCorner.x,0.0,aCorner.y)*aMeta.x*ws*2.0;',
      '  p.y = 0.0015 * ws;',
      '  gl_Position = uVP * vec4(p,1.0);',
      '  vUv = aCorner; vCol = vec4(aCol.rgb, aCol.a * la);',
      '  vFog = exp(-uFogK * distance(p, uEye));',
      '}'
    ].join('\n');

    var POOL_FS = H + [
      'in vec2 vUv; in vec4 vCol; in float vFog; out vec4 o;',
      'void main(){',
      '  float r = length(vUv)*2.0;',
      '  o = vec4(vCol.rgb * vCol.a * exp(-r*r*2.6) * (1.0-smoothstep(0.70,1.0,r)) * vFog, 1.0);',
      '}'
    ].join('\n');

    var FS_VS = H + [
      'out vec2 vUv;',
      'void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);',
      '  vUv = p; gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }'
    ].join('\n');

    var BRIGHT_FS = H + [
      'in vec2 vUv; out vec4 o;',
      'uniform sampler2D uTex; uniform float uThresh; uniform float uKnee;',
      'void main(){',
      '  vec3 c = texture(uTex, vUv).rgb;',
      '  float b = max(c.r, max(c.g, c.b));',
      '  float s = clamp((b-uThresh+uKnee)/max(2.0*uKnee,1e-4), 0.0, 1.0);',
      '  float w = max(s*s*uKnee, b-uThresh);',
      '  o = vec4(c * clamp(w/max(b,1e-4), 0.0, 1.0), 1.0);',
      '}'
    ].join('\n');

    var DOWN_FS = H + [
      'in vec2 vUv; out vec4 o;',
      'uniform sampler2D uTex; uniform vec2 uTexel;',
      'void main(){',
      '  vec3 a = texture(uTex, vUv+uTexel*vec2(-1.0, 1.0)).rgb;',
      '  vec3 b = texture(uTex, vUv+uTexel*vec2( 0.0, 1.0)).rgb;',
      '  vec3 c = texture(uTex, vUv+uTexel*vec2( 1.0, 1.0)).rgb;',
      '  vec3 d = texture(uTex, vUv+uTexel*vec2(-1.0, 0.0)).rgb;',
      '  vec3 e = texture(uTex, vUv).rgb;',
      '  vec3 f = texture(uTex, vUv+uTexel*vec2( 1.0, 0.0)).rgb;',
      '  vec3 g = texture(uTex, vUv+uTexel*vec2(-1.0,-1.0)).rgb;',
      '  vec3 h = texture(uTex, vUv+uTexel*vec2( 0.0,-1.0)).rgb;',
      '  vec3 i = texture(uTex, vUv+uTexel*vec2( 1.0,-1.0)).rgb;',
      '  o = vec4(e*0.25 + (b+d+f+h)*0.125 + (a+c+g+i)*0.0625, 1.0);',
      '}'
    ].join('\n');

    var UP_FS = H + [
      'in vec2 vUv; out vec4 o;',
      'uniform sampler2D uTex; uniform vec2 uTexel;',
      'void main(){',
      '  vec3 s = texture(uTex, vUv+uTexel*vec2(-1.0, 1.0)).rgb',
      '         + texture(uTex, vUv+uTexel*vec2( 0.0, 1.0)).rgb*2.0',
      '         + texture(uTex, vUv+uTexel*vec2( 1.0, 1.0)).rgb',
      '         + texture(uTex, vUv+uTexel*vec2(-1.0, 0.0)).rgb*2.0',
      '         + texture(uTex, vUv).rgb*4.0',
      '         + texture(uTex, vUv+uTexel*vec2( 1.0, 0.0)).rgb*2.0',
      '         + texture(uTex, vUv+uTexel*vec2(-1.0,-1.0)).rgb',
      '         + texture(uTex, vUv+uTexel*vec2( 0.0,-1.0)).rgb*2.0',
      '         + texture(uTex, vUv+uTexel*vec2( 1.0,-1.0)).rgb;',
      '  o = vec4(s/16.0, 1.0);',
      '}'
    ].join('\n');

    var COMP_FS = H + [
      'in vec2 vUv; out vec4 o;',
      'uniform sampler2D uScene; uniform sampler2D uBloom;',
      'uniform float uBloomAmt; uniform float uSeed;',
      'vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }',
      'void main(){',
      '  vec3 c = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uBloomAmt;',
      '  c = aces(c);',
      '  vec2 q = vUv - 0.5;',
      '  c *= clamp(1.0 - dot(q,q)*1.05, 0.0, 1.0);',
      '  float g = (hash(gl_FragCoord.xy + uSeed) - 0.5) * 0.030;',
      '  c += g * smoothstep(0.0, 0.10, max(c.r, max(c.g, c.b)));',
      '  o = vec4(c, 1.0);',
      '}'
    ].join('\n');

    var pLine, pPt, pSurf, pPool, pBright, pDown, pUp, pComp;
    try {
      pLine = prog(LINE_VS, LINE_FS);
      pPt = prog(PT_VS, PT_FS);
      pSurf = prog(SURF_VS, SURF_FS);
      pPool = prog(POOL_VS, POOL_FS);
      pBright = prog(FS_VS, BRIGHT_FS);
      pDown = prog(FS_VS, DOWN_FS);
      pUp = prog(FS_VS, UP_FS);
      pComp = prog(FS_VS, COMP_FS);
    } catch (_) { return null; }

    var qLine = new Float32Array([0,-1, 1,-1, 0,1, 1,1]);
    var qCen = new Float32Array([-0.5,-0.5, 0.5,-0.5, -0.5,0.5, 0.5,0.5]);
    var emptyVao = gl.createVertexArray();
    var vaos = {}, counts = {}, owned = [];

    /* every VAO and buffer this renderer makes, so a rebuild can release
     * the previous set instead of orphaning it */
    function keep(o) { owned.push(o); return o; }
    function releaseAll() {
      owned.forEach(function (o) {
        if (o.vao) gl.deleteVertexArray(o.vao);
        if (o.buf) gl.deleteBuffer(o.buf);
      });
      owned = [];
    }

    function instVao(quad, data, stride, attrs) {
      var vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      var qb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, qb);
      gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      var ib = gl.createBuffer();
      keep({ vao: vao, buf: ib }); keep({ buf: qb });
      gl.bindBuffer(gl.ARRAY_BUFFER, ib);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      attrs.forEach(function (a) {
        gl.enableVertexAttribArray(a[0]);
        gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, stride, a[2]);
        gl.vertexAttribDivisor(a[0], 1);
      });
      gl.bindVertexArray(null);
      return { vao: vao, buf: ib };
    }

    function upload() {
      var i, o;
      releaseAll();
      counts.line = lines.length; counts.pt = points.length;
      counts.surf = surfs.length; counts.pool = pools.length;

      var ld = new Float32Array(Math.max(counts.line, 1) * 14);
      for (i = 0; i < counts.line; i++) {
        o = i * 14;
        ld.set(lines[i].a, o); ld.set(lines[i].b, o+3); ld.set(lines[i].col, o+6);
        ld[o+9] = lines[i].i; ld[o+10] = lines[i].w; ld[o+11] = lines[i].glow;
        ld[o+12] = lines[i].layer; ld[o+13] = lines[i].id;
      }
      vaos.line = instVao(qLine, ld, 56, [[1,3,0],[2,3,12],[3,4,24],[4,4,40]]).vao;

      var sd = new Float32Array(Math.max(counts.surf, 1) * 15);
      for (i = 0; i < counts.surf; i++) {
        o = i * 15;
        sd.set(surfs[i].cen, o); sd.set(surfs[i].u, o+3); sd.set(surfs[i].v, o+6);
        sd.set(surfs[i].col, o+9); sd[o+12] = surfs[i].i;
        sd[o+13] = surfs[i].layer; sd[o+14] = surfs[i].id;
      }
      vaos.surf = instVao(qCen, sd, 60, [[1,3,0],[2,3,12],[3,3,24],[4,4,36],[5,2,52]]).vao;

      var od = new Float32Array((counts.pool + 1) * 9);
      for (i = 0; i < counts.pool; i++) {
        o = i * 9;
        od[o] = pools[i].x; od[o+1] = 0; od[o+2] = pools[i].z;
        od.set(pools[i].col, o+3); od[o+6] = pools[i].i;
        od[o+7] = pools[i].r; od[o+8] = pools[i].layer;
      }
      var pk = instVao(qCen, od, 36, [[1,3,0],[2,4,12],[3,2,28]]);
      vaos.pool = pk.vao; vaos.poolBuf = pk.buf;

      var pd = new Float32Array((counts.pt + 1) * 10);
      for (i = 0; i < counts.pt; i++) {
        o = i * 10;
        pd.set(points[i].p, o); pd.set(points[i].col, o+3);
        pd[o+6] = points[i].i; pd[o+7] = points[i].size;
        pd[o+8] = points[i].layer; pd[o+9] = points[i].id;
      }
      vaos.pt = gl.createVertexArray();
      keep({ vao: vaos.pt });
      gl.bindVertexArray(vaos.pt);
      vaos.ptBuf = gl.createBuffer();
      keep({ buf: vaos.ptBuf });
      gl.bindBuffer(gl.ARRAY_BUFFER, vaos.ptBuf);
      gl.bufferData(gl.ARRAY_BUFFER, pd, gl.DYNAMIC_DRAW);
      [[0,3,0],[1,4,12],[2,3,28]].forEach(function (a) {
        gl.enableVertexAttribArray(a[0]);
        gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, 40, a[2]);
      });
      gl.bindVertexArray(null);
    }

    var MIPS = 5, sceneT = null, chain = [], PW = 0, PH = 0;

    function mkTarget(w, h) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, hasFloat ? gl.RGBA16F : gl.RGBA8, w, h, 0,
                    gl.RGBA, hasFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { fb: f, tex: t, w: w, h: h };
    }
    function sized() {
      var w = Math.max(2, Math.round(S.W * S.DPR));
      var h = Math.max(2, Math.round(S.H * S.DPR));
      if (w === PW && h === PH) return;
      PW = w; PH = h;
      canvas.width = w; canvas.height = h;
      if (sceneT) { gl.deleteTexture(sceneT.tex); gl.deleteFramebuffer(sceneT.fb); }
      chain.forEach(function (c) { gl.deleteTexture(c.tex); gl.deleteFramebuffer(c.fb); });
      chain = [];
      sceneT = mkTarget(w, h);
      var cw = w, ch = h, i;
      for (i = 0; i < MIPS; i++) {
        cw = Math.max(2, cw >> 1); ch = Math.max(2, ch >> 1);
        chain.push(mkTarget(cw, ch));
      }
    }

    function geometry(VP, eye, flip, hot) {
      var gloss = flip < 0 ? 0.55 : 1.0;
      function common(p) {
        gl.uniformMatrix4fv(p.u.uVP, false, VP);
        gl.uniform3fv(p.u.uEye, eye);
        gl.uniform1fv(p.u.uScale, layerScale);
        gl.uniform1fv(p.u.uAlpha, layerLight);
        gl.uniform2fv(p.u.uPan, layerPan);
        gl.uniform1f(p.u.uFocal, FOCAL);
        gl.uniform1f(p.u.uFlip, flip);
        gl.uniform1f(p.u.uGloss, gloss);
        gl.uniform1f(p.u.uFogK, FOG);
        gl.uniform1f(p.u.uHot, hot);
        if (p.u.uRes) gl.uniform2f(p.u.uRes, PW, PH);
      }
      if (counts.surf) {
        gl.useProgram(pSurf); common(pSurf);
        gl.bindVertexArray(vaos.surf);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, counts.surf);
      }
      gl.useProgram(pLine); common(pLine);
      gl.bindVertexArray(vaos.line);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, counts.line);

      gl.useProgram(pPt); common(pPt);
      gl.uniform1f(pPt.u.uDpr, S.DPR);
      gl.bindVertexArray(vaos.pt);
      gl.drawArrays(gl.POINTS, 0, counts.pt + 1);
    }

    /* the cursor lives in the spare slot on the end of each buffer, so the
     * field it moves over is never re-uploaded */
    var cur = new Float32Array(10), curPool = new Float32Array(9);
    function writeCursor() {
      var c = cursor;
      cur.fill(0); curPool.fill(0);
      if (c) {
        cur[0] = c.x; cur[1] = c.y; cur[2] = c.z;
        if (c.mine) { cur[3] = C.amber[0]; cur[4] = C.amber[1]; cur[5] = C.amber[2]; }
        else { cur[3] = 1.0; cur[4] = 0.97; cur[5] = 0.88; }
        /* IN THE CURSOR'S OWN LAYER. This was pinned to LY.BLOCK, so a
         * highlight whose coordinates are in a field's local space was being
         * drawn at the block's world scale — a glowing ball wandering the
         * frame nowhere near the cell it was meant to be on. It only ever
         * looked right back when the block was the one pickable thing. */
        var cl = c.layer === undefined ? LY.BLOCK : c.layer;
        cur[6] = 2.2; cur[7] = 5.0; cur[8] = cl; cur[9] = 0;
        curPool[0] = c.x; curPool[2] = c.z;
        curPool[3] = cur[3]; curPool[4] = cur[4]; curPool[5] = cur[5];
        curPool[6] = 0.20; curPool[7] = 0.07; curPool[8] = cl;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, vaos.ptBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, counts.pt * 40, cur);
      gl.bindBuffer(gl.ARRAY_BUFFER, vaos.poolBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, counts.pool * 36, curPool);
    }

    function frame(hot) {
      sized();
      writeCursor();
      var VP = viewProj(), eye = eyePos(), i;

      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneT.fb);
      gl.viewport(0, 0, PW, PH);
      gl.clearColor(C.ground[0], C.ground[1], C.ground[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);

      geometry(VP, eye, -1.0, hot);

      {
        gl.useProgram(pPool);
        gl.uniformMatrix4fv(pPool.u.uVP, false, VP);
        gl.uniform3fv(pPool.u.uEye, eye);
        gl.uniform1fv(pPool.u.uScale, layerScale);
        gl.uniform1fv(pPool.u.uAlpha, layerLight);
        gl.uniform2fv(pPool.u.uPan, layerPan);
        gl.uniform1f(pPool.u.uFogK, FOG);
        gl.bindVertexArray(vaos.pool);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, counts.pool + 1);
      }

      geometry(VP, eye, 1.0, hot);

      gl.disable(gl.BLEND);
      gl.bindVertexArray(emptyVao);

      gl.useProgram(pBright);
      gl.bindFramebuffer(gl.FRAMEBUFFER, chain[0].fb);
      gl.viewport(0, 0, chain[0].w, chain[0].h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sceneT.tex);
      gl.uniform1i(pBright.u.uTex, 0);
      gl.uniform1f(pBright.u.uThresh, 0.68);
      gl.uniform1f(pBright.u.uKnee, 0.26);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.useProgram(pDown);
      var src = chain[0];
      for (i = 1; i < MIPS; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, chain[i].fb);
        gl.viewport(0, 0, chain[i].w, chain[i].h);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, src.tex);
        gl.uniform1i(pDown.u.uTex, 0);
        gl.uniform2f(pDown.u.uTexel, 1/src.w, 1/src.h);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        src = chain[i];
      }
      gl.useProgram(pUp);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      for (i = MIPS - 1; i > 0; i--) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, chain[i-1].fb);
        gl.viewport(0, 0, chain[i-1].w, chain[i-1].h);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, chain[i].tex);
        gl.uniform1i(pUp.u.uTex, 0);
        gl.uniform2f(pUp.u.uTexel, 1/chain[i].w, 1/chain[i].h);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      gl.disable(gl.BLEND);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, PW, PH);
      gl.useProgram(pComp);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sceneT.tex);
      gl.uniform1i(pComp.u.uScene, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, chain[0].tex);
      gl.uniform1i(pComp.u.uBloom, 1);
      gl.uniform1f(pComp.u.uBloomAmt, 0.85);
      gl.uniform1f(pComp.u.uSeed, S.reduced ? 7.0 : (Date.now() % 10000) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    return { kind: 'gl', upload: upload, frame: frame };
  }

  /* ══ C2D ═════════════════════════════════════════════════════════════
   * The fallback for the ~2% without WebGL2. Same scene, drawn flatly and
   * correctly. The floor, not the ceiling.
   */

  function make2D(canvas) {
    var ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;
    var sprites = {};

    function sprite(key, col) {
      if (sprites[key]) return sprites[key];
      var Rr = 48, c = document.createElement('canvas');
      c.width = c.height = Rr * 2;
      var g = c.getContext('2d');
      [[1.0,0.030],[0.38,0.10],[0.11,0.85]].forEach(function (st, i) {
        var m = i === 2 ? 0.55 : i === 1 ? 0.2 : 0;
        var t = [lerp(col[0],1,m), lerp(col[1],1,m), lerp(col[2],1,m)];
        var gr = g.createRadialGradient(Rr, Rr, 0, Rr, Rr, Rr * st[0]);
        gr.addColorStop(0, rgba(t, st[1]));
        gr.addColorStop(0.45, rgba(t, st[1] * 0.34));
        gr.addColorStop(1, rgba(t, 0));
        g.fillStyle = gr;
        g.fillRect(0, 0, Rr*2, Rr*2);
      });
      sprites[key] = c;
      return c;
    }

    function frame() {
      canvas.width = Math.max(2, Math.round(S.W * S.DPR));
      canvas.height = Math.max(2, Math.round(S.H * S.DPR));
      ctx.setTransform(S.DPR, 0, 0, S.DPR, 0, 0);
      ctx.fillStyle = C.groundCss;
      ctx.fillRect(0, 0, S.W, S.H);

      var VP = viewProj(), eye = eyePos(), i, ws, la, a, b, dist, fog, al, o;

      for (i = 0; i < lines.length; i++) {
        o = lines[i];
        la = layerLight[o.layer];
        if (la < 0.004) continue;
        ws = layerScale[o.layer];
        var qx = panX(o.layer), qz = panZ(o.layer);
        a = toScreen(VP, (o.a[0]+qx)*ws, o.a[1]*ws, (o.a[2]+qz)*ws);
        b = toScreen(VP, (o.b[0]+qx)*ws, o.b[1]*ws, (o.b[2]+qz)*ws);
        if (!a || !b) continue;
        dist = Math.hypot((o.a[0]+qx)*ws-eye[0], o.a[1]*ws-eye[1], (o.a[2]+qz)*ws-eye[2]);
        fog = Math.exp(-FOG * dist);
        ctx.strokeStyle = rgba(o.col, clamp(o.i * la * fog, 0, 1));
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      for (i = 0; i < points.length; i++) {
        o = points[i];
        la = layerLight[o.layer];
        if (la < 0.004) continue;
        ws = layerScale[o.layer];
        var px2 = panX(o.layer), pz2 = panZ(o.layer);
        a = toScreen(VP, (o.p[0]+px2)*ws, o.p[1]*ws, (o.p[2]+pz2)*ws);
        if (!a) continue;
        dist = Math.hypot((o.p[0]+px2)*ws-eye[0], o.p[1]*ws-eye[1], (o.p[2]+pz2)*ws-eye[2]);
        fog = Math.exp(-FOG * dist);
        al = clamp(o.i * la * fog, 0, 1);
        if (al <= 0.004) continue;
        var ss = o.size * clamp(2.1 / Math.max(dist, 0.6), 0.35, 1.8);
        /* A halo sprite per mark is the expensive part, and a field of
         * 4,096 cells does not need one each. Only the bright marks — the
         * lit edges, the corners, you — earn a sprite; the rest are a
         * couple of pixels, which is all they are on screen anyway. */
        if (al > 0.34) {
          var Rr = Math.max(ss * 3.4, 17);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = al;
          ctx.drawImage(sprite(o.col.join(','), o.col), a.x-Rr, a.y-Rr, Rr*2, Rr*2);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.fillStyle = rgba([lerp(o.col[0],1,0.5), lerp(o.col[1],1,0.5),
                              lerp(o.col[2],1,0.5)], clamp(al*1.1, 0, 1));
        ctx.beginPath();
        ctx.arc(a.x, a.y, Math.max(ss*0.32, 1.5), 0, 6.2832);
        ctx.fill();
      }

      var curLy = cursor && cursor.layer !== undefined ? cursor.layer : LY.BLOCK;
      if (cursor && layerAlpha[curLy] > 0.35) {
        ws = layerScale[curLy];
        a = toScreen(VP, (cursor.x+panX(curLy))*ws, cursor.y*ws,
                         (cursor.z+panZ(curLy))*ws);
        if (a) {
          var col = cursor.mine ? C.amber : [1.0, 0.97, 0.88];
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 1;
          ctx.drawImage(sprite(col.join(',') + '|c', col), a.x-22, a.y-22, 44, 44);
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = rgba(col, 1);
          ctx.beginPath(); ctx.arc(a.x, a.y, 2.4, 0, 6.2832); ctx.fill();
        }
      }
    }

    return { kind: '2d', upload: function () {}, frame: frame };
  }

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
             ccs: {}, deepest: 0, oldest: 0, dist: 0 };
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

  /* ══ THE CELEBRATION ═════════════════════════════════════════════════
   * The mark ignites, the flare blooms, the floor catches it, a ring runs
   * out across the field, a hard bright line of type, and he says something.
   * The owner's words: this is a good moment and it should feel like one.
   *
   * IT DOES NOT FIRE EVERY TIME. If every recorded place got the full
   * instrument the flare would stop being information and become wallpaper,
   * which is the note the emotional design makes about this exact beat.
   * Ordinary arrivals get a mark and, at most, a dry half-line. This is for
   * a named place you have never recorded before.
   *
   * It is drawn by mutating a handful of primitives and re-uploading, NOT by
   * rebuilding the scene: buildScene costs about twenty milliseconds a rung
   * in BigInt and cannot run per frame, while upload() reads the same arrays
   * and is cheap. So the arrays are truncated back to a saved length each
   * frame and the celebration re-appended.
   *
   * It is not decoration and it does not decorate idle time: it is a
   * response to an event, it happens once, and then the field is quiet
   * again. */

  var CEL_MS = 1150;
  var celBase = null;    /* array lengths with no celebration in them */
  var cel = null;        /* { t0, x, z, layer, label } */

  function celebrate(x, z, layer, label) {
    if (S.reduced) { showFound(label); return; }   /* a composed still, not a firework */
    cel = { t0: performance.now(), x: x, z: z, layer: layer, label: label };
    showFound(label);
    strike();
    invalidate();
  }

  function celFrame(now) {
    if (!cel || !celBase) return false;
    var k = (now - cel.t0) / CEL_MS;
    if (k >= 1) {
      cel = null;
      lines.length = celBase.l; points.length = celBase.p; pools.length = celBase.o;
      if (R) R.upload();
      return false;
    }
    lines.length = celBase.l; points.length = celBase.p; pools.length = celBase.o;

    var ly = cel.layer, x = cel.x, z = cel.z;
    /* IGNITION: hard and early, gone by a third of the way through. The bloom
     * chain does the blooming; this only has to be bright. */
    var ig = Math.pow(Math.max(0, 1 - k * 3), 1.6);
    if (ig > 0.001) {
      P([x, 0.012, z], C.coldHi, 0.9 + 7 * ig, 6 + 16 * ig, ly, 0);
    }
    /* THE FLOOR CATCHES IT: a pool that swells and goes. */
    var pk = Math.pow(Math.max(0, 1 - k * 1.5), 1.4);
    if (pk > 0.002) Pool(x, z, 0.06 + 0.22 * (1 - pk), C.coldHi, 0.5 * pk, ly);

    /* THE RING RUNS OUT. Twenty-eight segments is enough to read as a circle
     * at this size and cheap enough to re-upload every frame. */
    var rk = Math.min(1, k * 1.25);
    var rad = 0.03 + 0.62 * (1 - Math.pow(1 - rk, 2.2));
    var ri = 0.85 * Math.pow(1 - rk, 1.7);
    if (ri > 0.004) {
      var N = 28, i, a0, a1;
      for (i = 0; i < N; i++) {
        a0 = i / N * 6.2832; a1 = (i + 1) / N * 6.2832;
        L([x + Math.cos(a0) * rad, 0.006, z + Math.sin(a0) * rad],
          [x + Math.cos(a1) * rad, 0.006, z + Math.sin(a1) * rad],
          C.coldHi, ri, 1.15, 0.55, ly);
      }
    }
    if (R) R.upload();
    return true;
  }

  function showFound(label) {
    if (!el.found || !label) return;
    el.found.textContent = label;
    el.found.hidden = false;
    clearTimeout(showFound.t);
    showFound.t = setTimeout(function () {
      el.found.hidden = true; el.found.textContent = '';
    }, 2600);
  }

  /* ══ THE GUIDE ═══════════════════════════════════════════════════════
   * Saying it is a different problem from writing it, and the harder one.
   *
   * There are 47 lines that can fire on an ordinary arrival. Speaking on
   * every one of them would turn a quiet instrument into a game character
   * with ambient barks, which is the opposite of what this is. So the
   * scheduler is not a nicety, it is the feature:
   *
   *   - SILENCE while somebody is moving quickly. If the axis moved in the
   *     last second they are travelling, not looking, and a line lands on
   *     nobody.
   *   - A CADENCE for ordinary lines. Roughly once a minute, no matter how
   *     many blocks get clicked.
   *   - PRECEDENCE. A landmark or a chain beat outranks a generic line and
   *     interrupts it. Those are the ones worth hearing.
   *   - NO REPEATS within a session, which is what the pool is for.
   *   - A MUTE that persists, and the plate never goes quiet with him. The
   *     facts are not his to withhold.
   *
   * Silence is a resource: the rare unguarded lines only land if there is
   * quiet around them. See docs/ip-guide-voice.md. */

  var GUIDE_KEY = 'ip.v1.guide';
  var GENERIC_GAP = 55000;   /* ordinary lines: about once a minute */
  var MOVING_QUIET = 1000;   /* travelling, not looking */
  var lastSpoke = 0;
  var lastAxisMove = 0;
  var guideTimer = 0;

  function guideWanted() {
    try { return localStorage.getItem(GUIDE_KEY) !== '0'; } catch (_) { return true; }
  }
  function setGuide(on) {
    S.guide = !!on;
    try { localStorage.setItem(GUIDE_KEY, S.guide ? '1' : '0'); } catch (_) { }
    if (!S.guide) showGuide('');
    if (el.guideBtn) {
      el.guideBtn.setAttribute('aria-pressed', S.guide ? 'true' : 'false');
      el.guideBtn.textContent = S.guide ? 'Guide on' : 'Guide';
    }
  }

  function showGuide(text) {
    if (!el.guide) return;
    if (guideTimer) { clearTimeout(guideTimer); guideTimer = 0; }
    el.guide.textContent = text || '';
    el.guide.hidden = !text;
    if (text) {
      /* long enough to read twice, then gone. He does not hold the floor. */
      guideTimer = setTimeout(function () {
        el.guide.hidden = true; el.guide.textContent = ''; guideTimer = 0;
      }, 4200 + text.length * 45);
    }
  }

  /* rank 0 = generic and interruptible, 1 = a named place or a chain beat */
  function speak(bucketId, rank, seen) {
    if (!S.guide || contentState !== 'ready') return false;
    var now = Date.now();
    if (!rank) {
      if (now - lastSpoke < GENERIC_GAP) return false;
      if (now - lastAxisMove < MOVING_QUIET) return false;
    }
    var t = pickLine(bucketId, seen || 0);
    if (!t) return false;
    saidThisSession[t] = 1;
    lastSpoke = now;
    showGuide(t);
    return true;
  }

  /* ══ SOUND ════════════════════════════════════════════════
   * The descent, sounded. Synthesised, never sampled: zero bytes shipped,
   * and it keeps the rule the whole app is built on -- a sampled chime is
   * decoration, a tone computed from the address is the same kind of object
   * as every mark on screen.
   *
   * layers() was already a Shepard tone and nobody noticed for weeks. Its
   * octaves are superposed, each fading in as the one before fades out, and
   * the weights sum to one. That is the equation, built for visual reasons.
   * So this does not invent an envelope: it reads layerAlpha, the same array
   * the picture is drawn from, and hands it to oscillators. The picture and
   * the sound are the same mathematics read twice.
   *
   * A rung's octave is its index on the ladder, wrapped at OCTAVES. The wrap
   * is the illusion -- pitch descends forever without getting lower -- and it
   * is honest here rather than a trick, because every rung really does look
   * like every other rung: 64x64 cells, whatever depth you are at. The rail
   * carries the true count for anyone who wants it.
   *
   * Nothing decorates idle time, and that applies to the ears. There is no
   * loop. The master gain is pushed up by movement and left with a decay
   * scheduled, so silence returns on its own without needing a frame to
   * arrive -- which matters, because frames stop when the axis does. */

  var OCTAVES = 4;
  var SOUND_KEY = 'ip.v1.sound';
  var snd = null;      /* the audio graph, once a gesture has allowed one */

  function soundRemembered() {
    try { return localStorage.getItem(SOUND_KEY) === '1'; } catch (_) { return false; }
  }
  function rememberSound(on) {
    try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch (_) { }
  }

  /* The visitor's own note. Two people hear different ones, and rotating
   * your address changes yours -- a fact about addresses, delivered through
   * the ears rather than written down. */
  function baseHz() {
    if (!S.home) return 523.25;
    var n = Number(S.home.big % BigInt(12));
    return 523.25 * Math.pow(2, n / 12);
  }

  function soundStart() {
    if (snd) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      var ctx = new AC();
      var master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      var voices = [], i, o, g;
      for (i = 0; i < OCTAVES; i++) {
        o = ctx.createOscillator(); g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = baseHz() / Math.pow(2, i);
        g.gain.value = 0;
        o.connect(g); g.connect(master); o.start();
        voices.push({ osc: o, gain: g });
      }
      snd = { ctx: ctx, master: master, voices: voices };
      return true;
    } catch (_) { snd = null; return false; }
  }

  /* Called from the frame, after layers(), because that is what computes the
   * weights this reads. */
  /* Wrapped, and deliberately. This runs inside the frame, and the first
   * cut of it threw -- voices[i].gain is the GainNode, its .gain is the
   * AudioParam -- which took the exception straight out of tick() and
   * stopped the picture dead. Sound is the most optional thing in the
   * product and it does not get to do that. Same principle as the renderer
   * falling back without the address ever noticing. */
  function soundFrame() {
    if (!S.sound || !snd) return;
    try { soundFrameInner(); } catch (_) { S.sound = false; }
  }
  function soundFrameInner() {
    var ctx = snd.ctx, t = ctx.currentTime, i, k, r, w;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) { } }
    var acc = new Array(OCTAVES);
    for (i = 0; i < OCTAVES; i++) acc[i] = 0;
    for (i = 0; i < SLOTS; i++) {
      r = S.rungs[i];
      if (!r) continue;
      w = layerAlpha[LY.SLOT0 + i];
      if (!(w > 0)) continue;
      /* ladder index, not slot: slots are a recycled ring and carry no
       * pitch meaning, while the ladder index IS the depth */
      k = ((r.k % OCTAVES) + OCTAVES) % OCTAVES;
      acc[k] += w;
    }
    for (i = 0; i < OCTAVES; i++) {
      snd.voices[i].gain.gain.setTargetAtTime(Math.min(acc[i], 1) * 0.22, t, 0.05);
    }
    /* up now, and down by itself shortly after. Re-pushed on every frame the
     * axis moves, so holding a drag holds the tone and letting go ends it
     * without anything having to notice that it stopped. */
    snd.master.gain.cancelScheduledValues(t);
    snd.master.gain.setTargetAtTime(1, t, 0.04);
    snd.master.gain.setTargetAtTime(0, t + 0.10, 0.09);
  }

  /* THE STRIKE. One clear hit, on the visitor's own note two octaves up, so
   * the celebration belongs to the same instrument as the descent rather
   * than being a sound effect laid over it. Lands with the flare. */
  function strike() {
    if (!S.sound || !snd) return;
    try {
      var ctx = snd.ctx, t = ctx.currentTime;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(baseHz() * 4, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.connect(g); g.connect(snd.master);
      /* straight past the master's movement gate: this is an event, and it
       * has to be heard whether or not the axis happens to be moving */
      snd.master.gain.cancelScheduledValues(t);
      snd.master.gain.setTargetAtTime(1, t, 0.01);
      snd.master.gain.setTargetAtTime(0, t + 1.0, 0.12);
      o.start(t); o.stop(t + 1.2);
    } catch (_) { }
  }

  function setSound(on) {
    if (on && !soundStart()) return;
    S.sound = !!on;
    rememberSound(S.sound);
    if (!S.sound && snd) {
      var t = snd.ctx.currentTime;
      snd.master.gain.cancelScheduledValues(t);
      snd.master.gain.setTargetAtTime(0, t, 0.05);
    }
    if (el.sound) {
      el.sound.setAttribute('aria-pressed', S.sound ? 'true' : 'false');
      el.sound.textContent = S.sound ? 'Sound on' : 'Sound';
    }
  }

  /* ══ RENDERER ════════════════════════════════════════════════════════ */

  var needsFrame = true, lastT = 0;

  function invalidate() {
    needsFrame = true;
    if (S.running) return;
    S.running = true;
    requestAnimationFrame(tick);
  }

  function tick(now) {
    var dt = clamp((now - (lastT || now)) / 1000, 0, 0.1);
    lastT = now;
    var moving = false;

    if (!S.reduced) {
      var k = 1 - Math.exp(-dt / 0.13);
      if (Math.abs(S.tx - S.px) > 0.0008 || Math.abs(S.ty - S.py) > 0.0008) {
        S.px += (S.tx - S.px) * k;
        S.py += (S.ty - S.py) * k;
        moving = true;
      } else if (S.px !== S.tx || S.py !== S.ty) {
        /* the last hop onto the exact pose. It counts as a moving frame so
         * that the highlight is redecided once more against where the camera
         * finally came to rest -- without this the ease stops within 0.0008
         * of the target and the pick can settle one cell out. The frame
         * after this one has nothing left to move, so it does not repeat. */
        S.px = S.tx; S.py = S.ty; moving = true;
      }
    }

    if (celFrame(now)) moving = true;

    if (moving || needsFrame) {
      needsFrame = false;
      layers();
      soundFrame();
      /* WHAT THE POINTER IS OVER, decided against the camera as it will
       * actually be drawn this frame.
       *
       * The parallax leans the eye toward the pointer and eases there over
       * about 130 ms. pointermove sets the TARGET of that lean and then
       * immediately asks what is under the pointer -- against the pose the
       * camera has not finished leaving. So the answer was decided by a
       * camera that was about to move, and the highlight settled a little
       * away from the pointer. Measured: the same pixel named
       * 193.10.4.0/24 on the move and 193.11.90.0/24 once the lean had
       * finished.
       *
       * Redeciding here costs a few frames of picking after each move and
       * nothing at rest, and it has to come AFTER layers(), because both
       * pick() and cursorAt() read the layer weights it computes.
       *
       * onTap still reads the stored cursor rather than recasting. That
       * guard is about the gap between the last move and the click, which
       * this does not close. */
      if (moving && S.ptr && !S.reduced) {
        setCursor(cursorAt(S.ptr.x, S.ptr.y));
        pick(S.ptr.x, S.ptr.y);
      }
      if (R) R.frame(S.hot);
      syncDom();
    }
    if (moving) requestAnimationFrame(tick);
    else { S.running = false; lastT = 0; }
  }

  function resize() {
    S.DPR = Math.min(window.devicePixelRatio || 1, 2);
    S.W = cv.clientWidth;
    S.H = cv.clientHeight;
    needsFrame = false;
    layers();
    if (R) R.frame(S.hot);
    syncDom();
  }

  function rebuild() {
    buildScene();
    /* where the arrays end with no celebration in them. After the WHOLE
     * scene, not after each rung - the block is built last and truncating to
     * a per-rung length would have thrown it away. */
    celBase = { l: lines.length, p: points.length, o: pools.length };
    if (R) R.upload();
    syncRail();
    syncDom();      /* text updates now, not on the next animation frame */
    invalidate();
  }

  /* The rail is the only thing on the page that says "there is further to
   * go" without words, so it has to say how MUCH further. It keeps an end —
   * this is a map of a finite thing — but its length is the depth of this
   * address family, and it carries a tick for every rung.
   *
   * Sub-linear on purpose: an IPv6 ladder is 3.9x an IPv4 one, and a rail
   * 3.9x taller would not fit a phone. At the square root it is about twice
   * as long, which reads as "much deeper" and still fits. The ticks carry
   * the exact count for anyone who wants it. */
  function syncRail() {
    if (!el.rail || !S.home) return;
    var rel = Math.sqrt(S.maxAxis / (32 / STEP_BITS));   /* 1 for IPv4 */
    el.rail.style.height = 'min(' + (22 * rel).toFixed(1) + 'vh, ' +
                           Math.round(160 * rel) + 'px)';
    var html = '', i, a;
    for (i = 0; i < S.ladder.length; i++) {
      var ra = axisOfLen(S.ladder[i]);
      a = ra / S.maxAxis * 100;
      html += '<i data-a="' + ra.toFixed(4) + '" style="top:' +
              a.toFixed(2) + '%"></i>';
    }
    if (S.net && S.net.status === 'ready') {
      a = S.blockAxis / S.maxAxis * 100;
      html += '<i class="block" style="top:' + a.toFixed(2) + '%"></i>';
    }
    el.railTrack.innerHTML = html;
  }

  /* ══ AXIS ════════════════════════════════════════════════════════════
   * One scale axis, held rather than stepped. It does not snap: direct
   * manipulation is what makes scale feel like something in the hand, and
   * snapping takes it back out at the end of every gesture. The keyboard
   * moves between whole states, because that is what a keyboard is for.
   */

  function setAxis(v) {
    var next = clamp(v, 0, S.maxAxis);
    if (next === S.s) return;
    S.s = next;
    /* the low-water mark of the whole session. Recorded before the ring
     * can rebuild and return early, or a rung crossing would lose it. */
    S.been = S.been === null ? next : Math.min(S.been, next);
    lastAxisMove = Date.now();   /* travelling, not looking. he waits. */
    S.gone = S.gone === null ? next : Math.max(S.gone, next);
    noteDepth(next);
    if (cursor && layerAlpha[cursor.layer === undefined ? LY.BLOCK : cursor.layer] < 0.35) {
      cursor = null;
    }
    ensureData();
    /* the ring: when the axis moves far enough that a slot has to start
     * showing a different rung, the geometry is rebuilt. Everywhere else
     * this is just a uniform change and costs nothing. */
    if (S.home && rungKey() !== S.rungKey) { rebuild(); return; }
    /* and the text moves NOW. Which state owns the plate changes
     * continuously between rungs, not only when one is crossed, so leaving
     * this to the frame leaves the plate naming a rung the axis has already
     * travelled past. */
    syncDom();
    invalidate();
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

  /* Which mark the pointer is nearest. Not a hit test: the field answers
   * the hand continuously, so there is no way to miss and nothing to aim at.
   * Done by casting the pointer as a ray onto the block's own plane and
   * turning the hit back into a cell — O(1), rather than projecting two
   * thousand points every frame. */
  function planeHit(cx, cy, planeY) {
    var eye = eyePos(), b = camBasis();
    var ta = Math.tan(CAM.fov / 2), asp = S.W / S.H;
    var ndcx = (cx / S.W) * 2 - 1, ndcy = 1 - (cy / S.H) * 2;
    var sx = ndcx * ta * asp, sy2 = ndcy * ta;
    var dx = b.fwd[0] + b.right[0]*sx + b.up[0]*sy2;
    var dy = b.fwd[1] + b.right[1]*sx + b.up[1]*sy2;
    var dz = b.fwd[2] + b.right[2]*sx + b.up[2]*sy2;
    if (Math.abs(dy) < 1e-5) return null;
    var t = (planeY - eye[1]) / dy;
    if (t <= 0) return null;
    return { x: eye[0] + dx * t, z: eye[2] + dz * t };
  }

  /* Whichever rung the axis is actually sitting on — the brightest live one.
   * Everything that used to name LY.SPACE or LY.WIDE asks this instead, so
   * none of it has to know how long the ladder is. */
  /* 0.34, not 0.45: the weights are normalised, so where the block and two
   * rungs overlap none of the three reaches a half and a higher bar would
   * leave the field unpickable exactly where there is most to point at. */
  var LIVE = 0.34;

  /* How close counts as pointing at something. See pick(). */
  var PICK_FLOOR = 30;
  try {
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
      PICK_FLOOR = 11;
    }
  } catch (_) { }

  function activeField() {
    var i, ly, best = null, bw = LIVE;
    for (i = 0; i < SLOTS; i++) {
      ly = LY.SLOT0 + i;
      if (fieldGeoms[ly] && layerAlpha[ly] > bw) { bw = layerAlpha[ly]; best = fieldGeoms[ly]; }
    }
    return best;
  }
  function activeRung() {
    var i, best = null, bw = LIVE;
    for (i = 0; i < SLOTS; i++) {
      if (S.rungs[i] && S.rungs[i].f && layerAlpha[LY.SLOT0 + i] > bw) {
        bw = layerAlpha[LY.SLOT0 + i]; best = S.rungs[i];
      }
    }
    if (best) best.alpha = bw;
    return best;
  }

  function cursorAt(cx, cy) {
    /* whichever field the axis is actually showing */
    var g = activeField(), kind = g ? 'space' : '';
    if (!g && layerAlpha[LY.BLOCK] >= LIVE && blockGeom) { g = blockGeom; kind = 'block'; }
    if (!g) return null;

    var ws = layerScale[g.layer !== undefined ? g.layer : LY.BLOCK];
    if (kind === 'block') ws = layerScale[LY.BLOCK];
    var hit = planeHit(cx, cy, (kind === 'block' ? g.H0 : 0.003) * ws);
    if (!hit) return null;
    var ly = g.layer === undefined ? LY.BLOCK : g.layer;
    var lx = hit.x / ws - panX(ly), lz = hit.z / ws - panZ(ly);

    if (kind === 'block') {
      if (!S.subject || !S.subject.cidr) return null;
      var bn = S.subject.cidr;
      var col = Math.round((SCREEN_X(lx) - g.x0) / g.cw);
      var row = Math.round((lz - g.z0) / g.cd);
      if (col < -1 || row < -1 || col > g.cols || row > g.rows) return null;
      col = clamp(col, 0, g.cols - 1);
      row = clamp(row, 0, g.rows - 1);
      var cell = row * g.cols + col;
      var first = bn.net + ((BigInt(cell) * g.per) << g.unit.shift);
      var text = ipToText(first, bn.v), note = '';
      if (g.per > 1n) {
        var last = bn.net + (((BigInt(cell) + 1n) * g.per - 1n) << g.unit.shift);
        note = text + ' – ' + ipToText(last, bn.v);
        text = group(g.per.toString()) + ' ' + g.unit.many;
      }
      /* `field` is what onTap looks for, and the block was the one thing on
       * screen you could look at but not go to — in the most detailed view
       * there is. `cidr` is the SUBJECT's prefix, not home's: after travel
       * the two are different and splitting the address against home's
       * would underline the wrong digits. */
      return { key: 'b' + cell, field: true, layer: LY.BLOCK, first: first,
               x: SCREEN_X(g.x0 + col*g.cw), z: g.z0 + row*g.cd,
               y: g.H0 + 0.002, text: text, note: note, mine: cell === g.cell,
               cidr: bn };
    }

    /* a space field: a cell is a block, and its name is arithmetic. The
     * layout is the global curve now, so the way back is the lookup built
     * with it rather than a second, local, disagreeing xy2d. */
    var lay = g.lay;
    if (!lay) return null;
    /* HALF A CELL, AGAIN.
     *
     * A cell is an AREA and its mark is drawn at the CENTRE of it:
     * buildSpace puts a mark at (gx + 0.5 - ox) * step. The inverse used to
     * subtract that half back off, which does not undo it -- it shifts the
     * whole pick grid half a cell against the marks, so a mark sits exactly
     * on a cell boundary and hovering on one resolves to its neighbour
     * whenever the arithmetic lands a hair low. The highlight then drew half
     * a cell up and left of the thing being pointed at: an orb near the
     * cursor, never under it.
     *
     * Invisible at a small window, where half a cell is about a pixel, and
     * obvious at full size, where it is fourteen. This is the third
     * half-cell error in this file and they have all had the same shape:
     * one place treats a cell as a point and another treats it as an area.
     * Without the offset, a mark's centre lands at gx + 0.5 -- the middle of
     * the cell's own range, as far from either boundary as it can be. */
    var gx = Math.floor(SCREEN_X(lx) / g.step + lay.ox);
    var gy = Math.floor(lz / g.step + lay.oy);
    if (!(gx > -2 && gy > -2 && gx < FIELD + 1 && gy < FIELD + 1)) return null;
    gx = clamp(gx, 0, FIELD - 1); gy = clamp(gy, 0, FIELD - 1);
    var idx = lay.inv[gy * FIELD + gx];
    /* a NaN ray, a stale layout: either way there is no cell here, and
     * BigInt(undefined) throws rather than returning nothing */
    if (!(idx >= 0)) return null;
    var mine = idx === g.f.homeIdx;
    var first = g.f.containerNet + (BigInt(idx) << g.f.cellShift);
    var name = fieldPrefix(g.f, idx);
    var lmc = (g.f.marks && g.f.marks[idx]) || null;
    var lmk = lmc ? lmc.m : null;
    var ours = !!(g.f.shape && g.f.shape.cells[idx] !== undefined);
    /* the same answer the picture drew — see beenInField. This used to be
     * S.asked[name], a key nothing writes, so every one of the rec branches
     * below was unreachable and a visited cell read as 'not asked'. */
    var rec = (g.f.been && g.f.been[idx]) || null;
    var rg = REG ? regAt(first, g.f.v) : null;
    var note = ours && S.shape && S.shape.status === 'ready'
               ? 'announced by AS' + S.shape.asn
             : lmk ? lmk.n
             : (!rec && rg) ? rg.cc + ' · ' + rg.year
             : (!rec && REG && !rg) ? 'nobody holds this'
             : mine ? 'yours · announced'
             : !rec ? 'not asked'
             : rec.status === 'loading' ? 'asking…'
             : rec.status === 'ready'
               ? 'AS' + rec.asn + (rec.holder ? ' · ' + rec.holder : '')
               : 'nothing announced here';
    return { key: 'f' + g.layer + '-' + idx, field: true, layer: g.layer,
             idx: idx, f: g.f, first: first,
             /* the cell's CENTRE, which is where its mark actually is */
             x: SCREEN_X(g.x0 + (gx + 0.5) * g.step),
             z: g.z0 + (gy + 0.5) * g.step, y: 0.006,
             text: name, mine: mine, note: note, mark: lmk };
  }

  /* what the pointer is over. The radius is measured, not guessed. */
  function pick(cx, cy) {
    var VP = viewProj(), best = 0, bd = 1e9, i, t, ws, sp, se, d, r;
    for (i = 0; i < targets.length; i++) {
      t = targets[i];
      if (layerAlpha[t.layer] < 0.25) continue;
      /* THE ORB THAT WAS NEVER WHERE THE POINTER WAS.
       *
       * The aim carries a pick radius of two whole cells, and the floor
       * below is another thirty pixels. On a small window that is a few
       * pixels and nobody noticed; on a full-size display a cell is about
       * thirty pixels, so the aim lit up whenever the pointer was anywhere
       * within two cells of it -- an orb hanging near the cursor, following
       * it, never under it.
       *
       * The cause is two systems answering the same question differently:
       * targets are grabbed by screen distance, cells are resolved by
       * casting a ray at the plane. Widening one to be forgiving made it
       * disagree with the other. So when the field has resolved a cell, that
       * answer wins and a target on the same layer only stays lit if it IS
       * that cell. The radius still does its job everywhere the field has no
       * answer, which is what it was for. */
      if (t.idx !== undefined && cursor && cursor.field &&
          cursor.layer === t.layer && cursor.idx !== t.idx) continue;
      ws = layerScale[t.layer];
      var tqx = panX(t.layer), tqz = panZ(t.layer);
      sp = toScreen(VP, (t.x+tqx)*ws, t.y*ws, (t.z+tqz)*ws);
      se = toScreen(VP, (t.x + t.r + tqx)*ws, t.y*ws, (t.z+tqz)*ws);
      if (!sp || !se) continue;
      /* The floor is a THUMB, and a mouse is not a thumb. Thirty pixels is
       * a touch target: it makes a small mark grabbable by a finger. With a
       * pointer that can hover it means the aim lights up from thirty pixels
       * away while the cursor is over empty floor -- an orb near the cursor
       * but never under it. Devices that can hover get a floor the size of a
       * mark; devices that cannot keep the thumb. */
      r = Math.max(PICK_FLOOR, Math.hypot(se.x - sp.x, se.y - sp.y));
      d = Math.hypot(sp.x - cx, sp.y - cy);
      if (d < r && d - r < bd) { bd = d - r; best = t.id; }
    }
    if (best !== S.hot) {
      S.hot = best;
      cv.classList.toggle('pick', !!best || !!(cursor && cursor.field));
      invalidate();
    }
  }

  /* Choosing a block is the whole of the wandering: you point at address
   * space nobody has asked about, and asking is what turns it into a place
   * with a name. */
  function onTap() {
    /* whatever is lit and named right now — NOT a fresh raycast. The
     * parallax eases the camera between the last move and the click, so
     * re-casting picks a different cell than the one being pointed at. */
    var c = cursor;
    if (!c || !c.field || c.first === undefined) return;
    travelTo(c.first, true);
  }

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

  /* ══ DATA ════════════════════════════════════════════════════════════
   * Nothing here fires during an arrive-copy-leave visit. The first
   * RIPEstat request happens only once the visitor has moved off Home.
   */

  function ripe(call, resource) {
    var key = call + '|' + resource, hit = cacheGet(key);
    if (hit) return Promise.resolve(hit);
    return fetch(RIPE + call + '/data.json?resource=' + encodeURIComponent(resource) +
                 '&sourceapp=whats-my-ip', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (j) {
        if (!j || j.status !== 'ok') throw new Error('status');
        cacheSet(key, j.data || {});
        return j.data || {};
      });
  }

  /* RIPEstat holder strings are "HANDLE - Legal Name". The handle is
   * registry bookkeeping; the name is what a person recognises. */
  function tidyHolder(h) {
    if (!h) return '';
    /* the separator goes with the number: RIPE returns "AS8151 - UNINET",
     * and stripping only the number left the plate reading "- UNINET". */
    h = String(h).trim().replace(/\s+/g, ' ').replace(/^AS\d+\s*-?\s*/i, '');
    var m = h.match(/^(?:[A-Z0-9][A-Z0-9_\-]{1,})\s+-\s+(.+)$/);
    if (m && m[1].length >= 3) h = m[1];
    else {
      m = h.match(/^(?:[A-Z0-9][A-Z0-9_\-]{2,})\s+(.+)$/);
      if (m && m[1].length >= 4 && (/[a-z]/.test(m[1]) || / /.test(m[1]))) h = m[1];
    }
    if (h.length > 34) {
      var par = h.match(/\(([^()]{2,22})\)\s*$/);
      if (par) return par[1];
    }
    h = h.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (h.length > 30) h = h.slice(0, 29).replace(/[\s,.\-]+$/, '') + '…';
    return h;
  }

  function ensureData() {
    if (S.s > 0.06 && S.home && !S.net) loadNet();
    if (S.s > 0.06 && S.home) loadRegistry();
  }

  function loadNet() {
    S.net = { status: 'loading' };
    if (!away()) S.subject = S.net;
    syncDom();
    ripe('network-info', S.home.text).then(function (d) {
      var prefix = d && d.prefix;
      var asn = (d && d.asns && d.asns.length) ? parseInt(d.asns[0], 10) : NaN;
      var cidr = parseCidr(prefix);
      if (!cidr || !(asn >= 0)) {
        S.net = { status: 'none' };
        if (!away()) S.subject = S.net;
        rebuild(); announce(); return;
      }
      S.net = { status: 'ready', prefix: prefix, cidr: cidr, asn: asn, holder: '' };
      if (!away()) { S.subject = S.net; loadShape(asn); }
      rebuild(); announce();
      return ripe('as-overview', 'AS' + asn).then(function (o) {
        var h = tidyHolder(o && o.holder);
        if (h && S.net && S.net.asn === asn) { S.net.holder = h; syncDom(); announce(); }
      }).catch(function () {});
    }).catch(function () {
      S.net = { status: 'none' };
      if (!away()) S.subject = S.net;
      rebuild(); announce();
    });
  }

  /* ── THE SHAPE OF A NETWORK ────────────────────────────────────────────
   * The complaint this exists to answer: "there doesn't seem like a ton of
   * information ... it just feels like the sliding in and out with a new ip
   * address on top." Correct, and the cause was that every network looked
   * exactly the same. A university and a CDN drew the identical grid of
   * dots; only the caption changed. Travelling to twenty places showed you
   * one picture twenty times.
   *
   * A network is not one block. It is every block it announces, and that is
   * wildly different from one network to the next:
   *
   *     RIPE NCC   AS3333        8 blocks, clustered
   *     Google     AS15169   1,414 blocks
   *     Akamai     AS20940   4,727 blocks, scattered over the whole map
   *
   * So arriving somewhere lights up everywhere else that network lives. That
   * is a different picture per place, it is entirely real, and it is the
   * difference between a caption and a thing to look at.
   */
  function loadShape(asn) {
    if (!(asn >= 0)) return;
    if (S.shape && S.shape.asn === asn) return;
    S.shape = { asn: asn, status: 'loading', list: [], total: 0n };
    var key = 'ap' + asn;
    var hit = cacheGet(key);
    if (hit) { applyShape(asn, hit); return; }
    ripe('announced-prefixes', 'AS' + asn).then(function (d) {
      var raw = (d && d.prefixes) || [];
      var out = [], i, p;
      /* the list is uncapped for counting but capped for drawing: a few
       * thousand is fine, a pathological answer should not be able to stall
       * a rebuild */
      for (i = 0; i < raw.length && i < 8000; i++) {
        p = raw[i] && raw[i].prefix;
        if (p) out.push(p);
      }
      cacheSet(key, out);
      applyShape(asn, out);
    }).catch(function () {
      if (S.shape && S.shape.asn === asn) S.shape.status = 'none';
      syncDom();
    });
  }

  function applyShape(asn, list) {
    var i, c, parsed = [], t4 = 0n, t6 = 0n, n4 = 0, n6 = 0;
    for (i = 0; i < list.length; i++) {
      c = parseCidr(list[i]);
      if (!c) continue;
      var span = 1n << BigInt(c.bits - c.len);
      parsed.push({ v: c.v, net: c.net, last: c.net + span - 1n, len: c.len });
      /* per family. A network announcing one IPv6 /32 and eight IPv4 /23s
       * was being reported as holding 20 septillion addresses, because the
       * two were added together. They are not the same unit and never were. */
      if (c.v === 4) { t4 += span; n4++; } else { t6 += span; n6++; }
    }
    parsed.sort(function (a, b) { return a.net < b.net ? -1 : a.net > b.net ? 1 : 0; });
    S.shape = { asn: asn, status: 'ready', list: parsed,
                n4: n4, n6: n6, t4: t4, t6: t6 };
    rebuild();
    announce();
  }

  /* Which cells of a field this network occupies. Same shape of loop as the
   * landmarks: per prefix, not per cell, so a 4,727-prefix network costs
   * 4,727 steps and not 4,727 x 4,096 comparisons. */
  function shapeInField(f) {
    var sh = S.shape, out = null, cells = FIELD * FIELD, i, b, a, e, k, n;
    if (!sh || sh.status !== 'ready' || !sh.list.length) return null;
    var lo = f.containerNet, here = 0, lit = 0;
    var hi = lo + (BigInt(cells) << f.cellShift) - 1n;
    for (i = 0; i < sh.list.length; i++) {
      b = sh.list[i];
      if (b.v !== f.v || b.last < lo || b.net > hi) continue;
      here++;
      a = b.net < lo ? 0 : Number((b.net - lo) >> f.cellShift);
      e = b.last > hi ? cells - 1 : Number((b.last - lo) >> f.cellShift);
      if (e >= cells) e = cells - 1;
      if (!out) out = {};
      for (k = a; k <= e; k++) if (out[k] === undefined) { out[k] = 1; lit++; }
    }
    if (!out) return null;
    /* Dimmed by how much of the FIELD the network covers, not by how big
     * each prefix is. Akamai holds thousands of separate /24s, each one cell
     * — individually tiny, collectively the entire frame at full brightness,
     * which is a white slab and not a footprint. */
    return { cells: out, here: here, lit: lit,
             i: 0.70 * clamp(6 / Math.sqrt(lit), 0.10, 1) };
  }

  /* how much of the space this network holds, in the unit that reads */
  function shapeSize() {
    var sh = S.shape;
    if (!sh || sh.status !== 'ready') return '';
    var v6 = S.home && S.home.v === 6;
    var n = v6 ? sh.n6 : sh.n4, tot = v6 ? sh.t6 : sh.t4;
    if (!n) { v6 = !v6; n = v6 ? sh.n6 : sh.n4; tot = v6 ? sh.t6 : sh.t4; }
    if (!n) return '';
    var blocks = group(String(n)) + (n === 1 ? ' block' : ' blocks');
    if (v6) {
      var subs = tot >> 64n;
      return blocks + ' · ' + group(subs.toString()) +
             (subs === 1n ? ' subnet' : ' subnets');
    }
    return blocks + ' · ' + group(tot.toString()) + ' addresses';
  }

  /* ══ REGISTRY ════════════════════════════════════════════════════════
   * Phase A of ../../docs/ip-plan-v2.md: the map stops being empty.
   *
   * Every allocation the five registries have ever made — where it is, who
   * holds it, which country, and the year it was handed out. 439 KB gzipped,
   * built by ../../scripts/ip-build-space-field.py, and it answers questions
   * that used to need a lookup: what IS this, how old is it, whose is it.
   *
   * It arrives on the same trigger as the RIPEstat calls, so arrive-copy-
   * leave still talks to nobody but our own edge.
   *
   * This is the first thing in the app that is KNOWN WITHOUT ASKING, at
   * scale. Landmarks were the precedent — an RFC fact needs no lookup — and
   * the same reasoning covers a published registry: no question was skipped
   * to know it. "Lit = known, dark = unasked" still holds; there is simply a
   * great deal more that is known now.
   */

  var REG = null;         /* the parsed file, or null until it lands */
  var regState = '';      /* '' | 'loading' | 'ready' | 'none' */

  function loadRegistry() {
    loadContent();
    if (regState) return;
    regState = 'loading';
    fetch('data/space.bin', { cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.arrayBuffer();
      })
      .then(function (buf) {
        REG = parseRegistry(new Uint8Array(buf));
        regState = REG ? 'ready' : 'none';
        if (REG) {
          rebuild(); announce();
          /* now, and not before, the registry can say something about where
           * they started. This has no fallback on purpose: if there is
           * nothing interesting in the record, he says nothing. */
          speak('open.registry', 1, 0);
        }
      })
      .catch(function () {
        /* the map is poorer without it and still correct. No message: the
         * visitor never asked for this file and should not be told it
         * failed. */
        regState = 'none';
      });
  }

  function parseRegistry(b) {
    if (b.length < 9 || b[0] !== 73 || b[1] !== 80 || b[2] !== 83 || b[3] !== 70) {
      return null;                                  /* not "IPSF" */
    }
    if (b[4] !== 1) return null;                    /* a version we know */
    var p = 5;
    var built = b[5] | (b[6] << 8) | (b[7] << 16) | (b[8] << 24);
    p = 9;

    function v() {                                  /* varint, as a Number */
      var shift = 0, out = 0, byte;
      do {
        byte = b[p++];
        out += (byte & 0x7f) * Math.pow(2, shift);
        shift += 7;
      } while (byte & 0x80);
      return out;
    }
    function vBig() {                               /* varint, as a BigInt */
      var shift = 0n, out = 0n, byte;
      do {
        byte = b[p++];
        out |= BigInt(byte & 0x7f) << shift;
        shift += 7n;
      } while (byte & 0x80);
      return out;
    }

    var n = v(), i;
    var rir = new Uint8Array(n), cc = new Array(n), year = new Uint16Array(n);
    for (i = 0; i < n; i++) {
      rir[i] = b[p];
      cc[i] = String.fromCharCode(b[p + 1], b[p + 2]);
      year[i] = b[p + 3] | (b[p + 4] << 8);
      p += 5;
    }

    /* IPv4 fits in a double exactly, so it gets typed arrays and a fast
     * search. IPv6 does not fit in anything but BigInt, and 69,000 of them
     * is the price of the only address family with a future. */
    var n4 = v();
    var lo4 = new Float64Array(n4), hi4 = new Float64Array(n4);
    var k4 = new Uint16Array(n4), prev = 0;
    for (i = 0; i < n4; i++) {
      lo4[i] = prev + v();
      hi4[i] = lo4[i] + v();
      k4[i] = v();
      prev = hi4[i];
    }
    var n6 = v();
    var lo6 = new Array(n6), hi6 = new Array(n6);
    var k6 = new Uint16Array(n6), prevB = 0n;
    for (i = 0; i < n6; i++) {
      lo6[i] = prevB + vBig();
      hi6[i] = lo6[i] + vBig();
      k6[i] = v();
      prevB = hi6[i];
    }
    /* How much space is older than a given year, by address volume.
     * "Allocated 1993" is inert on its own; "older than 71% of the space
     * anybody holds" is a fact with a size. One pass, done once. */
    var byYear = new Float64Array(2101), total = 0, y;
    for (i = 0; i < n4; i++) {
      y = year[k4[i]] || 1980;
      byYear[y] += hi4[i] - lo4[i];
      total += hi4[i] - lo4[i];
    }
    var older = new Float64Array(2101), run = 0;
    for (i = 0; i < 2101; i++) { older[i] = total ? run / total : 0; run += byYear[i]; }

    return { rir: rir, cc: cc, year: year, built: built,
             lo4: lo4, hi4: hi4, k4: k4, n4: n4,
             lo6: lo6, hi6: hi6, k6: k6, n6: n6,
             older: older };
  }

  var RIR_NAME = ['AFRINIC', 'APNIC', 'ARIN', 'LACNIC', 'RIPE NCC', 'IANA'];

  /* One line about a place, from the registries, with the age sized against
   * everything else anybody holds. Never a number without something already
   * seen to measure it by. */
  function regLine(big, v) {
    var r = regAt(big, v);
    if (!r) return '';
    var out = 'allocated ' + (r.year || '?');
    if (r.year && REG.older) {
      /* always sized, never bare. A year on its own is inert. */
      var pc = Math.round(REG.older[Math.min(r.year, 2100)] * 100);
      out += ', older than ' + pc + '% of the space anybody holds';
    }
    return out + '  ·  ' + r.rirName + '  ·  ' + r.cc;
  }

  /* The index of the range holding this address, or -1. One binary search. */
  function regIndex(big, v) {
    if (!REG) return -1;
    var lo, hi, mid;
    if (v === 4) {
      var a = Number(big);
      lo = 0; hi = REG.n4 - 1;
      while (lo <= hi) {
        mid = (lo + hi) >> 1;
        if (a < REG.lo4[mid]) hi = mid - 1;
        else if (a >= REG.hi4[mid]) lo = mid + 1;
        else return mid;
      }
      return -1;
    }
    lo = 0; hi = REG.n6 - 1;
    while (lo <= hi) {
      mid = (lo + hi) >> 1;
      if (big < REG.lo6[mid]) hi = mid - 1;
      else if (big >= REG.hi6[mid]) lo = mid + 1;
      else return mid;
    }
    return -1;
  }

  /* What is known about an address without anyone being asked. */
  function regAt(big, v) {
    var i = regIndex(big, v);
    if (i < 0) return null;
    var k = v === 4 ? REG.k4[i] : REG.k6[i];
    return { rir: REG.rir[k], rirName: RIR_NAME[REG.rir[k]] || '?',
             cc: REG.cc[k], year: REG.year[k] };
  }

  /* ERA — what a cell's age looks like.
   *
   * Brightness, never hue: the art direction allows three colour roles and
   * age is not one of them. Unallocated space is the darkest thing on the
   * plate because it is genuinely nothing, and the gradient upward is age,
   * so the oldest space on the internet is the brightest thing in an
   * untouched field. That is a fact about the world, drawn.
   *
   * The whole range sits well below an answered lookup (0.95) and below a
   * network's own footprint (0.70), so nothing here can outshout something
   * that was actually asked about.
   */
  /* CONCENTRATION, once, instead of a sixth time.
   *
   * Accumulation is additive and the bloom is generous, so N marks drawn at
   * the same brightness in the same place do not read as N marks — they read
   * as one white hole, and the tone map then crushes everything around them.
   * This has now bitten the block, the landmarks, a network's footprint and
   * a query highlight, each time discovered separately and patched
   * separately. It is the same function every time.
   *
   * Full brightness for a handful of marks, falling with the square root of
   * how many share the frame, floored so a dense answer is still visible. */
  function spread(n, full, floorAt) {
    return full * clamp(6 / Math.sqrt(Math.max(n, 1)), floorAt === undefined ? 0.12 : floorAt, 1);
  }

  function eraLevel(year) {
    if (!year) return 0.10;
    if (year < 1990) return 0.40;
    if (year < 1995) return 0.32;
    if (year < 2000) return 0.27;
    if (year < 2005) return 0.23;
    if (year < 2011) return 0.19;
    if (year < 2016) return 0.16;
    if (year < 2021) return 0.13;
    return 0.11;
  }
  var UNALLOCATED = 0.055;   /* darker than anything held by anybody */

  /* Every cell of a field, keyed by era brightness, in one pass over the
   * ranges rather than 4,096 binary searches. */
  function regInField(f) {
    if (!REG) return null;
    var cells = FIELD * FIELD, out = new Float32Array(cells);
    var keys = new Int32Array(cells);
    var i, a, e, k;
    keys.fill(-1);
    out.fill(UNALLOCATED);
    if (f.v === 4) {
      var lo = Number(f.containerNet);
      var span = Math.pow(2, 32 - f.containerLen);
      var hi = lo + span, cellSize = span / cells;
      /* find the first range that could touch this container */
      var L = 0, R = REG.n4 - 1, first = REG.n4;
      while (L <= R) {
        var mid = (L + R) >> 1;
        if (REG.hi4[mid] <= lo) L = mid + 1;
        else { first = mid; R = mid - 1; }
      }
      for (i = first; i < REG.n4 && REG.lo4[i] < hi; i++) {
        a = Math.max(0, Math.floor((REG.lo4[i] - lo) / cellSize));
        e = Math.min(cells - 1, Math.floor((REG.hi4[i] - 1 - lo) / cellSize));
        k = REG.k4[i];
        for (; a <= e; a++) {
          if (keys[a] < 0) { keys[a] = k; out[a] = eraLevel(REG.year[k]); }
        }
      }
      return { level: out, key: keys };
    }
    var loB = f.containerNet;
    var hiB = loB + (BigInt(cells) << f.cellShift);
    var Lb = 0, Rb = REG.n6 - 1, firstB = REG.n6;
    while (Lb <= Rb) {
      var m2 = (Lb + Rb) >> 1;
      if (REG.hi6[m2] <= loB) Lb = m2 + 1;
      else { firstB = m2; Rb = m2 - 1; }
    }
    for (i = firstB; i < REG.n6 && REG.lo6[i] < hiB; i++) {
      var s = REG.lo6[i] < loB ? 0n : (REG.lo6[i] - loB) >> f.cellShift;
      var t = REG.hi6[i] > hiB ? BigInt(cells - 1)
                               : (REG.hi6[i] - 1n - loB) >> f.cellShift;
      a = Number(s); e = Number(t); k = REG.k6[i];
      if (e > cells - 1) e = cells - 1;
      for (; a <= e; a++) {
        if (keys[a] < 0) { keys[a] = k; out[a] = eraLevel(REG.year[k]); }
      }
    }
    return { level: out, key: keys };
  }

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
    document.body.dataset.state = (!away() && S.s < 0.5) ? 'home' : 'out';

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

  function showAddress() {
    if (S.home && S.aim === null) S.aim = S.home.big;
    if (S.home) {
      el.addressText.textContent = S.home.text;
      el.address.style.setProperty('--addr-chars', S.home.text.length);
      el.address.classList.remove('is-pending');
      el.answerNote.textContent = '';
      el.copy.hidden = false;
      document.title = S.home.text + ' — what’s my IP';
      /* The cold open, once the address is up and never before it. It fires
       * at rank 1 so the cadence does not swallow the one line that has to
       * land. Content is deferred, so it only speaks if it is already here -
       * nothing waits on him. */
      loadContent();
    } else {
      el.addressText.textContent = 'Not available';
      el.address.classList.add('is-pending');
      el.copy.hidden = true;
      el.answerNote.textContent =
        'This page could not read your address from its own edge, and it will ' +
        'not ask anyone else for it.';
      say('Your address could not be read.');
    }
    rebuild();
  }

  function loadAddress() {
    var fixture = new URLSearchParams(location.search).get('ip');
    if (fixture) {
      var f = parseIp(fixture);
      if (f) { S.home = f; S.source = 'fixture'; showAddress(); return; }
    }
    var settled = false;
    function give(addr, src) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      S.home = addr || null;
      S.source = addr ? src : '';
      showAddress();
    }
    var timer = setTimeout(function () { give(null, ''); }, 4000);
    fetch('whoami', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        var ct = r.headers.get('content-type') || '';
        return ct.indexOf('json') >= 0 ? r.json()
             : r.text().then(function (t) { return { ip: t.trim() }; });
      })
      .then(function (d) { give(parseIp(d && d.ip), 'edge'); })
      .catch(function () { give(null, ''); });
  }

  function setupCopy() {
    el.copy.addEventListener('click', function () {
      if (!S.home) return;
      var txt = S.home.text;
      function done() {
        el.copy.dataset.done = '1';
        el.copy.textContent = 'Copied';
        say('Copied ' + txt);
        setTimeout(function () {
          el.copy.dataset.done = ''; el.copy.textContent = 'Copy';
        }, 1800);
      }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = txt; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); }
        catch (_) { say('Copying failed. The address is ' + txt + '.'); }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, fallback);
      } else fallback();
    });
  }

  /* Built on open, never kept warm: it is a page of numbers that only
   * matter when somebody is looking at them. */
  function openNote() {
    /* the logbook sizes itself against the registry, so opening it is a
     * reason to fetch one. Harmless if it is already here or already on its
     * way -- loadRegistry guards itself. */
    loadRegistry();
    loadContent();
    if (regState === 'loading') {
      var wait = setInterval(function () {
        if (regState === 'loading') return;
        clearInterval(wait);
        if (!el.notePanel.hidden) buildNotebook();
      }, 120);
    }
    buildNotebook();
    el.notePanel.hidden = false;
    el.notebook.setAttribute('aria-expanded', 'true');
    el.noteClose.focus();
  }
  function closeNote() {
    el.notePanel.hidden = true;
    el.notebook.setAttribute('aria-expanded', 'false');
    el.notebook.focus();
  }

  function aboutHTML() {
    /* The page asks for `whoami` relative to itself, so the curl line is
     * derived the same way: /ip/whoami on AWS, /whoami on Cloudflare Pages. */
    var whoPath = location.pathname.replace(/[^\/]*$/, '')
      .replace(/[^A-Za-z0-9\/._~-]/g, '') + 'whoami';
    return [
      '<h2>What this page does</h2>',
      '<p>It shows your public IP address. If you move the view, it shows the ',
      'block that address is actually announced inside, and the network that ',
      'announces it.</p>',

      '<h3>What it asks for</h3>',
      '<p>Arriving, copying and leaving talks to nobody but this site’s own ',
      'edge, which reads your address from the connection itself. No ',
      'third-party address lookup is used at any point — your address is ',
      'never handed to someone else to find out what it is.</p>',
      '<p>Only once you move outward, the block and the network are looked up ',
      'against <a href="https://stat.ripe.net/" rel="noopener">RIPEstat</a>, ',
      'the RIPE NCC’s public data service. Moving outward sends your address ',
      'to RIPE. Staying on the answer does not.</p>',

      '<h3>What it keeps</h3>',
      '<p>No account, no cookies for product behaviour, no advertising, no ',
      'analytics. Public routing answers are cached in this browser’s local ',
      'storage so the same lookup is not repeated; that is public data about ',
      'networks, not a history of you.</p>',

      '<h3>For scripts</h3>',
      '<p>Anything that is not asking for JSON gets the address as plain text ',
      'and nothing else:</p>',
      '<p class="mono">curl https://<span class="dim">&lt;this host&gt;</span>' + whoPath + '</p>',

      '<div class="plate">',
      '<p>Routing data by courtesy of the RIPE NCC, from RIPEstat.</p>',
      '<p>Drawn with WebGL2 where the browser has it, and with Canvas 2D ',
      'where it does not. Neither is needed to tell you your address.</p>',
      '</div>'
    ].join('');
  }

  var aboutOpen = false;
  function openAbout() {
    if (!el.aboutBody.dataset.built) {
      el.aboutBody.innerHTML = aboutHTML();
      el.aboutBody.dataset.built = '1';
    }
    el.aboutPanel.hidden = false;
    el.about.setAttribute('aria-expanded', 'true');
    aboutOpen = true;
    el.aboutClose.focus();
  }
  function closeAbout() {
    el.aboutPanel.hidden = true;
    el.about.setAttribute('aria-expanded', 'false');
    aboutOpen = false;
    el.about.focus();
  }

  /* ══ BOOT ════════════════════════════════════════════════════════════ */

  /* Pick a renderer, and survive not getting one.
   *
   * The old line was `makeGL(cv) || make2D(cv)`, and the fallback in it has
   * never once worked. Not because it is never reached — makeGL catches its
   * own shader failures and returns null, so it is reached exactly as
   * intended — but because of this:
   *
   *   A CANVAS CAN ONLY EVER HAVE ONE KIND OF CONTEXT.
   *
   * Once getContext('webgl2') has succeeded, getContext('2d') on that same
   * element returns null forever, whatever happens afterwards. So on a
   * device that HAS WebGL2 but cannot compile the shaders — a phone without
   * highp in fragment shaders, an old GPU, a browser with acceleration off —
   * makeGL took the context, failed, returned null, and then the 2D path
   * could not have the canvas back. Both renderers gone, silently, and a
   * black screen with a perfectly good address sitting on top of it.
   *
   * Falling back therefore means putting a FRESH canvas in place first. The
   * try/catch is kept as well, because a link failure can throw from outside
   * makeGL's own guard, and by then the same rule applies.
   */
  function pickRenderer() {
    var force = new URLSearchParams(location.search).get('renderer');
    var tried = false, gl = null;
    if (force !== '2d') {
      tried = true;
      try {
        gl = makeGL(cv);
      } catch (e) {
        S.renderFail = (e && e.message ? String(e.message) : 'WebGL2 failed')
                         .split(String.fromCharCode(10))[0].slice(0, 160);
      }
      if (gl) return gl;
      if (!S.renderFail) S.renderFail = 'WebGL2 present but unusable';
    }
    if (tried) {
      /* the old canvas is spoken for whether makeGL threw or merely gave up;
       * the 2D path needs one nobody has claimed */
      var fresh = document.createElement('canvas');
      fresh.id = cv.id;
      fresh.setAttribute('aria-hidden', 'true');
      cv.parentNode.replaceChild(fresh, cv);
      cv = fresh;
    }
    var two = null;
    try { two = make2D(cv); } catch (e2) { }
    if (!two && !S.renderFail) S.renderFail = 'no renderer';
    return two;
  }

  function boot() {
    cv = document.getElementById('field');
    grab(['address', 'addressText', 'copy', 'answerNote', 'live',
          'plate', 'plateTitle', 'plateSub', 'plateNote',
          'mark', 'markFixed', 'markVary', 'markNote',
          'tipWrap', 'tipFixed', 'tipVary', 'tipMine', 'tipNote',
          'rail', 'railTrack', 'railMark', 'goHome', 'goBack', 'hint',
          'companionState', 'companionSummary', 'companionFacts',
          'about', 'aboutPanel', 'aboutClose', 'aboutBody', 'sound',
          'notebook', 'notePanel', 'noteClose', 'noteBody', 'sight',
          'guide', 'guideBtn', 'found']);

    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    S.reduced = mq.matches;
    try {
      mq.addEventListener('change', function (e) {
        S.reduced = e.matches;
        if (S.reduced) { S.px = S.tx = 0; S.py = S.ty = 0; }
        invalidate();
      });
    } catch (_) { }

    S.DPR = Math.min(window.devicePixelRatio || 1, 2);
    S.W = cv.clientWidth;
    S.H = cv.clientHeight;

    /* THE ADDRESS GOES FIRST, before anything that can fail.
     *
     * index.html: "nothing optional is ever allowed in front of it". A
     * shader is optional and was in front of it. Starting the request here
     * also means it is in flight while the renderer is still compiling,
     * which is strictly better even when everything works. */
    loadAddress();

    buildScene();
    layers();
    R = pickRenderer();
    S.renderer = R ? R.kind : '';
    /* whichever canvas survived that is the one to measure and wire */
    S.W = cv.clientWidth; S.H = cv.clientHeight;
    if (R) { resize(); R.upload(); R.frame(0); }
    syncDom();

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    setupAxis();
    setupCopy();
    /* Off until asked, and the asking is the gesture browsers require
     * anyway. prefers-reduced-motion starts silent even if it was on last
     * time: the people who ask for less movement usually want less noise,
     * and one press gets it back. */
    if (el.guideBtn) {
      el.guideBtn.addEventListener('click', function () { setGuide(!S.guide); });
      setGuide(guideWanted());
    }
    if (el.notebook) {
      el.notebook.addEventListener('click', function () {
        if (el.notePanel.hidden) openNote(); else closeNote();
      });
      el.noteClose.addEventListener('click', closeNote);
    }
    if (el.sound) {
      el.sound.addEventListener('click', function () { setSound(!S.sound); });
      if (soundRemembered() && !S.reduced) {
        /* remembered, but still not running until they touch something */
        var wake = function () {
          document.removeEventListener('pointerdown', wake, true);
          document.removeEventListener('keydown', wake, true);
          setSound(true);
        };
        document.addEventListener('pointerdown', wake, true);
        document.addEventListener('keydown', wake, true);
      }
    }
    el.goHome.addEventListener('click', goHome);
    if (el.goBack) el.goBack.addEventListener('click', back);
    el.about.addEventListener('click', function () {
      if (aboutOpen) closeAbout(); else openAbout();
    });
    el.aboutClose.addEventListener('click', closeAbout);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(invalidate);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else boot();

  /* for the build's own checks only */
  window.__ip = {
    renderer: function () { return S.renderer; },
    axis: function (v) { if (v !== undefined) setAxis(v); return S.s; },
    net: function () { return S.net; },
    reg: function (t) {
      var a = parseIp(t);
      return a ? regAt(a.big, a.v) : null;
    },
    /* WHERE YOU HAVE BEEN, counted rather than eyeballed.
     *
     * Exists because the visited states were unreachable for their whole
     * life and nobody noticed: they fail SILENTLY, by drawing the same
     * picture as an unvisited cell. A screenshot cannot tell you the
     * difference between "no cells are visited" and "the lookup is dead",
     * which is exactly how it survived. `answered` against `drawn` is the
     * check: if you have been places and `drawn` is 0 at every rung, the
     * mapping is broken again. */
    been: function () {
      var out = [], i, ly, fg, k, n = 0;
      for (k in S.asked) if (S.asked[k] && S.asked[k].status !== 'loading') n++;
      for (i = 0; i < SLOTS; i++) {
        ly = LY.SLOT0 + i; fg = fieldGeoms[ly];
        if (!fg || !fg.f) continue;
        var b = fg.f.been || {}, c = 0, ready = 0, kk;
        for (kk in b) { c++; if (b[kk].status === 'ready') ready++; }
        out.push({ len: fg.f.containerLen, drawn: c, announced: ready });
      }
      return { answered: n, rungs: out };
    },
    query: function (q) { setQuery(q); return S.query; },
    lay: function () {
      var out = [], i, ly, fg;
      for (i = 0; i < SLOTS; i++) {
        ly = LY.SLOT0 + i; fg = fieldGeoms[ly];
        if (!fg) continue;
        var L = fg.lay;
        out.push({ len: fg.f.containerLen, k: L && L.k,
                   ox: L && L.ox, oy: L && L.oy,
                   gxAim: L && L.gx[fg.f.idx], gyAim: L && L.gy[fg.f.idx],
                   gx0: L && L.gx[0], gx1: L && L.gx[1],
                   aimX: fg.aimX, aimZ: fg.aimZ, step: fg.step,
                   scale: layerScale[ly] });
      }
      return { ref: S.ref && { k: S.ref.k, x: String(S.ref.x), y: String(S.ref.y) },
               fields: out };
    },
    regState: function () {
      return { state: regState, built: REG && REG.built,
               v4: REG && REG.n4, v6: REG && REG.n6,
               keys: REG && REG.rir.length };
    },
    aim: function () { return S.home && S.aim !== null ? ipToText(S.aim, S.home.v) : null; },
    subject: function () { return S.subject; },
    travel: function (t) { var a = parseIp(t); if (a) travelTo(a.big, true); return S.aim; },
    step: function (n) { stepAim(n); },
    back: back,
    home: goHome,
    trail: function () { return S.trail.length; },
    celebrate: function (label) {
      var fg = activeField();
      if (!fg) return 'no field on screen to celebrate in';
      celebrate(fg.aimX, fg.aimZ, fg.layer, label || 'Test find');
      return 'celebrating';
    },
    cel: function () {
      return { running: !!cel, base: celBase,
               lines: lines.length, points: points.length, pools: pools.length };
    },
    guide: function (bucket, seen) {
      if (bucket) return pickLine(bucket, seen || 0);
      return { state: contentState, on: S.guide,
               buckets: CONTENT ? CONTENT.guide.lines.length : 0,
               chains: CONTENT ? CONTENT.chains.lines.length : 0,
               tags: visitorTags(), saidThisSession: Object.keys(saidThisSession).length,
               msSinceSpoke: lastSpoke ? Date.now() - lastSpoke : null,
               msSinceAxisMoved: lastAxisMove ? Date.now() - lastAxisMove : null };
    },
    /* Where the highlight is drawn, against where the mark it names
     * actually is. Half-cell drift between those two has now been found
     * three times in this file, and it is invisible at a small window --
     * half a cell is about a pixel -- so it wants a probe rather than an
     * eye. Both should be the same point, to the pixel. */
    cur: function () {
      if (!cursor) return null;
      var ly = cursor.layer === undefined ? LY.BLOCK : cursor.layer;
      var ws = layerScale[ly], VP = viewProj();
      var orb = toScreen(VP, (cursor.x + panX(ly)) * ws, cursor.y * ws,
                             (cursor.z + panZ(ly)) * ws);
      var g = activeField(), markPt = null;
      if (g && g.lay && cursor.idx !== undefined) {
        var L = g.lay, st = g.step;
        var mxw = SCREEN_X((L.gx[cursor.idx] + 0.5 - L.ox) * st);
        var mzw = (L.gy[cursor.idx] + 0.5 - L.oy) * st;
        markPt = toScreen(VP, (mxw + panX(ly)) * ws, 0.006 * ws,
                              (mzw + panZ(ly)) * ws);
      }
      return { orb: orb, mark: markPt, text: cursor.text };
    },
    snd: function () {
      if (!snd) return { on: S.sound, built: false };
      var v = [], i;
      for (i = 0; i < snd.voices.length; i++) {
        v.push({ hz: +snd.voices[i].osc.frequency.value.toFixed(2),
                 g: +snd.voices[i].gain.gain.value.toFixed(4) });
      }
      return { on: S.sound, built: true, state: snd.ctx.state,
               master: +snd.master.gain.value.toFixed(4), voices: v };
    },
    probe: function () {
      layers();
      return { s: S.s, maxAxis: S.maxAxis, anchor: S.anchor,
               blockAxis: S.blockAxis, ladder: S.ladder.slice(),
               rungKey: S.rungKey, live: rungKey(),
               rungs: S.rungs.map(function (r, i) {
                 return r ? { len: r.len, axis: r.axis, slot: i,
                              alpha: layerAlpha[LY.SLOT0 + i] } : null;
               }),
               blockAlpha: layerAlpha[LY.BLOCK], homeAlpha: layerAlpha[LY.HOME],
               /* where the chosen block actually lands on screen, which is
                  the only way to check that it travels to the middle */
               /* where the chosen block lands on screen IN EVERY LIVE
                  LAYER. If two layers that are cross-fading disagree, the
                  visitor sees the same block in two places at once, which is
                  exactly what a transition falling apart looks like. */
               aimScreen: (function () {
                 var out = [], i, ly, fg, ws, sp;
                 for (i = 0; i < SLOTS; i++) {
                   ly = LY.SLOT0 + i; fg = fieldGeoms[ly];
                   if (!fg || layerAlpha[ly] < 0.02) continue;
                   ws = layerScale[ly];
                   sp = toScreen(viewProj(), (fg.aimX + panX(ly)) * ws,
                                 0.01 * ws, (fg.aimZ + panZ(ly)) * ws);
                   if (sp) out.push({ len: fg.f.containerLen,
                                      a: +layerAlpha[ly].toFixed(2),
                                      x: Math.round(sp.x), y: Math.round(sp.y) });
                 }
                 return { cx: Math.round(S.W / 2), cy: Math.round(S.H / 2), layers: out };
               })() };
    }
  };
})();
