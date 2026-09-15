/* ip — the form generator.
 *
 * Direction: docs/ip-art-direction.md (LOCKED: Cordage). Plan: docs/ip-build-plan.md.
 *
 * Your address is a knot, tied in a cord, that hangs from heavier cords.
 * Containment is drawn as suspension: the IANA block holds the announced
 * prefix, which holds the address. Cord make (ply, twist, dye) comes from the
 * ASN, so everyone on one network is tied in cord of the same make.
 *
 * Pure: no DOM, no network, no globals beyond the export. Structure comes
 * from real facts; the address hash seeds only micro-variation (which way a
 * cord sags, where a strand starts), never structure and never colour.
 *
 * MAP OF THIS FILE
 *   HASH       address -> stable small numbers
 *   FACTS      normalising what the network layer hands us
 *   BUILD      facts -> geometry (cages, cord, fray, knot)
 *   PROJECT    surface-of-revolution -> screen, with depth
 *   DRAW       geometry -> canvas
 *   MOTION     the measured pulse and sway
 */

(function (root) {
  'use strict';

  var Dyes = root.IPDyes;

  /* ---- HASH ----------------------------------------------------------- */

  function hash32(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }

  // A deterministic little stream of 0..1 values from one seed.
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  /* ---- FACTS ---------------------------------------------------------- */

  // facts: { addr, version, blockLen, prefixLen, asn, rttMs, jitterMs, uncertainty }
  // Only addr and version are required; everything else frays if absent.
  function normalise(facts) {
    var f = facts || {};
    var version = f.version === 6 ? 6 : 4;
    var maxLen = version === 6 ? 128 : 32;
    var levels = [];

    // The containment chain, from real published boundaries only. No invented
    // intermediate levels: if we only know one, we draw one.
    if (typeof f.blockLen === 'number') levels.push(f.blockLen);
    if (typeof f.prefixLen === 'number') levels.push(f.prefixLen);
    levels = levels
      .filter(function (n) { return n > 0 && n < maxLen; })
      .sort(function (a, b) { return a - b; })
      .filter(function (n, i, a) { return i === 0 || n !== a[i - 1]; });

    return {
      addr: String(f.addr || ''),
      version: version,
      maxLen: maxLen,
      levels: levels,
      asn: typeof f.asn === 'number' ? f.asn : null,
      rttMs: typeof f.rttMs === 'number' ? Math.max(0.5, f.rttMs) : null,
      jitterMs: typeof f.jitterMs === 'number' ? Math.max(0, f.jitterMs) : 0,
      // 0 = everything known, 1 = nothing known. RIPEstat publishes this.
      uncertainty: Math.max(0, Math.min(1, typeof f.uncertainty === 'number' ? f.uncertainty : 0.5))
    };
  }

  /* ---- BUILD ---------------------------------------------------------- */

  // Prefix length -> relative size. Bigger block, bigger cage; monotonic,
  // never zero, and it keeps a /8 and a /29 visibly different without letting
  // the /29 collapse to nothing.
  function sizeOf(len, maxLen) {
    return Math.pow(1 - len / (maxLen + 4), 0.75);
  }

  function build(facts) {
    var f = normalise(facts);
    var seed = hash32(f.addr + '|' + f.version);
    var r = rng(seed);
    var asnSeed = f.asn === null ? seed : hash32('AS' + f.asn);
    var ar = rng(asnSeed);

    // Cord make — a property of the NETWORK, so siblings match.
    var ply = f.version === 6 ? 6 : 4;
    var twist = 0.20 + ar() * 0.42;          // turns over a cage's height
    if (ar() < 0.5) twist = -twist;
    var dye = f.asn === null ? null : Dyes.dyeForAsn(f.asn);

    // Cages, outermost first. The INNERMOST known boundary — the announced
    // prefix — is the object you actually look at; the blocks containing it
    // are drawn larger than the frame and crop, because you are inside them
    // and cannot see all of one. If we know only one boundary we draw one
    // cage: the floor case, and it has to be as good as the rich one.
    var inner = f.levels.length ? f.levels[f.levels.length - 1] : Math.round(f.maxLen * 0.7);
    var cages = [];
    for (var i = 0; i < f.levels.length; i++) {
      var len = f.levels[i];
      var s = sizeOf(len, f.maxLen);
      // log of the real size ratio: a /8 holds 2^13 /21s, and the picture
      // should feel that without becoming literally 8000x.
      var scale = Math.min(4.4, 1 + (inner - len) * 0.17);
      cages.push({
        len: len,
        size: s,
        scale: scale,
        // Sparse, so you can see through it. Asawa's beauty is the seeing
        // through; density turns it to moiré mush.
        strands: ply * 2 + (i === f.levels.length - 1 ? 2 : 0),
        width: 0.55 + 2.1 * s,
        // each cage sags a touch differently, seeded by the address.
        // >1 puts the fat part of the bulge below the middle, which is what
        // a hanging form does and a floating one does not.
        sag: 1.10 + r() * 0.20,
        phase: r() * Math.PI * 2
      });
    }

    return {
      facts: f,
      seed: seed,
      ply: ply,
      twist: twist,
      dye: dye,
      cages: cages,
      // How big the object itself sits in the frame: a /9 is a big thing,
      // a /29 a small one in a large field.
      baseSize: sizeOf(inner, f.maxLen),
      // Proportion varies per address, so a wall of forms is not one object
      // repeated. Cord make stays the network's; the silhouette is yours.
      aspect: 1.02 + r() * 0.78,
      knotSize: 0.055 + 0.02 * r(),
      // Known data ends in a finished whipping; unknown data frays.
      fray: f.uncertainty,
      swayAmp: Math.min(1, f.jitterMs / 40),
      swayPhase: r() * Math.PI * 2
    };
  }

  /* ---- PROJECT -------------------------------------------------------- */

  var TILT = 0.17; // looking very slightly down on the object

  // The bulge of a hanging form: fattest below the middle, pinched at both
  // knots. `sag` moves the fat part down.
  function profile(t, sag) {
    var u = Math.pow(t, sag);
    var p = Math.sin(Math.PI * u);
    return Math.pow(Math.max(0, p), 0.88);
  }

  /* ---- DRAW ----------------------------------------------------------- */

  function strandPath(ctx, cage, cx, cy, halfH, R, twist, k, strands, pulse) {
    var steps = 30;
    var theta0 = cage.phase + (Math.PI * 2 * k) / strands;
    var frontSum = 0;
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var y = cy - halfH + 2 * halfH * t;
      var rad = R * profile(t, cage.sag);
      var th = theta0 + twist * Math.PI * 2 * t;
      var x = cx + rad * Math.cos(th);
      var z = rad * Math.sin(th);
      frontSum += Math.sin(th);
      if (i === 0) ctx.moveTo(x, y + z * TILT);
      else ctx.lineTo(x, y + z * TILT);
    }
    return frontSum / (steps + 1); // -1 behind .. +1 in front
  }

  function drawCage(ctx, form, cage, cx, cy, halfH, R, colour, alphaScale) {
    for (var k = 0; k < cage.strands; k++) {
      var front = strandPath(ctx, cage, cx, cy, halfH, R, form.twist, k, cage.strands);
      var d = (front + 1) / 2;                       // 0 back, 1 front
      ctx.strokeStyle = Dyes.css(colour, alphaScale * (0.20 + 0.80 * d));
      ctx.lineWidth = cage.width * (0.68 + 0.5 * d);
      ctx.stroke();
    }
  }

  // The weft. Each ring is drawn as two arcs — the near half heavier than the
  // far half — because a ring drawn at one weight all the way round is what
  // makes a woven form read flat.
  function drawRings(ctx, cage, cx, cy, halfH, R, colour, alphaScale) {
    var n = Math.max(3, Math.round(4 + 5 * cage.size));
    for (var i = 0; i < n; i++) {
      // Keep off the very ends and off the widest point: the fattest ring
      // draws a rim around the form and flattens it into a bowl.
      var t = 0.17 + (0.66 * i) / (n - 1 || 1);
      var y = cy - halfH + 2 * halfH * t;
      var rad = R * profile(t, cage.sag);
      if (rad < 1.2) continue;
      var ry = Math.max(0.8, rad * TILT);
      var fade = 1 - Math.abs(t - 0.5) * 0.7;

      ctx.lineWidth = cage.width * 0.42;
      // far half (drawn higher on screen, since we look slightly down)
      ctx.beginPath();
      ctx.ellipse(cx, y, rad, ry, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = Dyes.css(colour, alphaScale * 0.17 * fade);
      ctx.stroke();
      // near half
      ctx.beginPath();
      ctx.ellipse(cx, y, rad, ry, 0, 0, Math.PI);
      ctx.strokeStyle = Dyes.css(colour, alphaScale * 0.44 * fade);
      ctx.stroke();
    }
  }

  // A knot is a tangle, not a small cage: a bight with two ends passing
  // through it. Drawn small and tight — it is the address, and it is the one
  // thing in the picture wearing the network's dye.
  function drawKnot(ctx, form, cx, cy, r, colour) {
    var rot = -0.22 + Math.sin(form.swayPhase) * 0.34;
    var lw = Math.max(1.3, r * 0.17) / r;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(r, r);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // one cord, looped over itself and tucked back through — an overhand
    // knot, drawn in local units and scaled into place
    ctx.beginPath();
    ctx.moveTo(-1.55, 0.85);
    ctx.bezierCurveTo(-0.95, 0.15, -0.85, -0.85, 0, -0.85);
    ctx.bezierCurveTo(0.85, -0.85, 0.90, 0.15, 0.10, 0.45);
    ctx.bezierCurveTo(-0.50, 0.66, -0.62, -0.20, 0.15, -0.35);
    ctx.bezierCurveTo(0.80, -0.47, 1.15, 0.35, 1.55, 0.85);
    ctx.strokeStyle = Dyes.css(colour, 0.82);
    ctx.lineWidth = lw;
    ctx.stroke();

    // the end that passes OVER: cut a gap in what is behind it, then lay it
    // back down. This is the whole reason it reads as a knot and not a scribble.
    ctx.beginPath();
    ctx.moveTo(0.15, -0.35);
    ctx.bezierCurveTo(0.80, -0.47, 1.15, 0.35, 1.55, 0.85);
    ctx.strokeStyle = Dyes.css(Dyes.GROUND, 1);
    ctx.lineWidth = lw * 2.8;
    ctx.stroke();
    ctx.strokeStyle = Dyes.css(colour, 0.95);
    ctx.lineWidth = lw;
    ctx.stroke();

    ctx.restore();
  }

  function drawCord(ctx, cx, y0, y1, width, colour, alpha, wob, seed) {
    var steps = 26;
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var y = y0 + (y1 - y0) * t;
      var x = cx + Math.sin(t * 4.2 + seed) * wob * (0.2 + t * 0.8);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = Dyes.css(colour, alpha);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Where the data stops being certain, the cord stops being cord.
  function drawEnd(ctx, form, cx, y0, len, colour) {
    var u = form.fray;
    if (u < 0.04) {
      // Known: a finished end, whipped off with two short turns.
      ctx.beginPath();
      ctx.moveTo(cx - 5, y0 + 4); ctx.lineTo(cx + 5, y0 + 4);
      ctx.moveTo(cx - 4, y0 + 8); ctx.lineTo(cx + 4, y0 + 8);
      ctx.strokeStyle = Dyes.css(colour, 0.42);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      return;
    }
    var fibres = Math.round(6 + 16 * u);
    var reach = len * (0.25 + 0.75 * u);
    var r = rng(form.seed ^ 0x9e3779b9);
    for (var i = 0; i < fibres; i++) {
      var side = (i / (fibres - 1)) - 0.5;
      var spread = reach * (0.5 + r() * 0.9);
      ctx.beginPath();
      ctx.moveTo(cx, y0);
      ctx.bezierCurveTo(
        cx + side * spread * 0.4, y0 + reach * 0.4,
        cx + side * spread * 1.0, y0 + reach * 0.72,
        cx + side * spread * 1.7, y0 + reach * (0.8 + r() * 0.25)
      );
      ctx.strokeStyle = Dyes.css(colour, (0.30 - Math.abs(side) * 0.22) * (0.4 + 0.6 * u));
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }

  /* ---- MOTION --------------------------------------------------------- */

  // A pulse on a cord really does reflect off a fixed end, and the round trip
  // really is the measurement. Screen time is dilated by a constant so a 24 ms
  // connection is watchable at all — the RATIOS stay true, which is what makes
  // it a measurement rather than an animation.
  var DILATION = 40;

  function pulseAt(form, tMs) {
    if (form.facts.rttMs === null) return null;
    var period = form.facts.rttMs * DILATION;   // out and back
    var phase = (tMs % period) / period;        // 0..1
    return phase < 0.5 ? phase * 2 : (1 - phase) * 2; // 0 -> 1 -> 0
  }

  /* ---- render --------------------------------------------------------- */

  // opts: { w, h, tMs, reducedMotion, ground (bool) }
  function draw(ctx, form, opts) {
    var o = opts || {};
    var w = o.w, h = o.h;
    var linen = Dyes.LINEN;

    if (o.ground !== false) {
      ctx.fillStyle = Dyes.css(Dyes.GROUND, 1);
      ctx.fillRect(0, 0, w, h);
      var g = ctx.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.46, Math.max(w, h) * 0.62);
      g.addColorStop(0, Dyes.css(Dyes.GROUND, 0.55, 0.075));
      g.addColorStop(1, Dyes.css(Dyes.GROUND, 0.0, 0.075));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    var cx = w * 0.5;
    var cy = h * 0.5;
    var unit = Math.min(w, h);
    // R0/H0 describe the ANNOUNCED PREFIX — the object you look at. The
    // blocks that contain it are multiples of this and crop off-frame.
    var R0 = unit * (0.085 + 0.205 * form.baseSize);
    var H0 = R0 * form.aspect;

    // Sway: amplitude is the measured jitter, and it is deliberately small.
    var sway = 0;
    if (!o.reducedMotion && form.swayAmp > 0) {
      var t = (o.tMs || 0) / 1000;
      sway = form.swayAmp * unit * 0.012 *
        (Math.sin(t * 0.47 + form.swayPhase) * 0.7 + Math.sin(t * 0.83 + form.swayPhase * 2) * 0.3);
    }
    cx += sway;

    var main = form.cages.length ? form.cages[form.cages.length - 1] : null;

    // The cord it hangs from, entering from off-frame. It meets the prefix
    // cage's top knot — the containing blocks' own knots are outside the
    // frame, which is the point: you cannot see all of a /8.
    drawCord(ctx, cx - sway * 0.6, -4, cy - H0, main ? main.width : 2,
             linen, 0.40, unit * 0.006, form.swayPhase);

    // Cages, outermost (largest, faintest, cropped) first.
    for (var i = 0; i < form.cages.length; i++) {
      var c = form.cages[i];
      var R = R0 * c.scale;
      var halfH = H0 * c.scale;
      var alpha = 0.60 / Math.pow(c.scale, 0.85);
      drawCage(ctx, form, c, cx, cy, halfH, R, linen, alpha);
    }
    // Rings only on the object itself. The containing blocks are cord alone.
    if (main) drawRings(ctx, main, cx, cy, H0, R0, linen, 0.34);

    // The address: one knot, in the one dyed colour its network owns.
    drawKnot(ctx, form, cx, cy, R0 * (0.16 + form.knotSize * 1.1), form.dye || linen);

    // Below the form: cord, then the end — whipped if known, frayed if not.
    var tail0 = cy + H0;
    var tailLen = Math.min(h - tail0 - 6, unit * 0.13);
    if (tailLen > 8) {
      drawCord(ctx, cx, tail0, tail0 + tailLen, (main ? main.width : 2) * 0.62,
               linen, 0.26, unit * 0.004, form.swayPhase + 1.7);
      drawEnd(ctx, form, cx, tail0 + tailLen, Math.max(18, h - tail0 - tailLen - 4), linen);
    }

    // The measured round trip, travelling down the cord, through the form,
    // and back. Frozen at a composed phase under reduced motion.
    var p = o.reducedMotion ? 0.42 : pulseAt(form, o.tMs || 0);
    if (p !== null) {
      drawPulse(ctx, form, {
        cx: cx, cy: cy, unit: unit, R0: R0, H0: H0,
        width: main ? main.width : 2,
        tail0: tail0, tailLen: tailLen > 8 ? tailLen : 0, colour: linen
      }, p);
    }
  }

  // The pulse is a BRIGHTENING of whatever it is passing through — the cord
  // above, then the rings of each cage it crosses, then the tail. Never a
  // glowing dot travelling along a line: the banned list is explicit.
  function drawPulse(ctx, form, g, p) {
    var top = g.cy - g.H0;
    var end = g.tail0 + g.tailLen;
    var y = -4 + (end + 4) * p;
    var reach = g.unit * 0.030;

    ctx.save();
    ctx.beginPath();
    ctx.rect(g.cx - g.unit * 0.5, y - reach, g.unit, reach * 2);
    ctx.clip();

    if (y < top + reach) {
      drawCord(ctx, g.cx, -4, top, g.width * 1.1,
               g.colour, 0.88, g.unit * 0.006, form.swayPhase);
    }
    if (y > g.tail0 - reach && g.tailLen > 0) {
      drawCord(ctx, g.cx, g.tail0, end, g.width * 0.7,
               g.colour, 0.80, g.unit * 0.004, form.swayPhase + 1.7);
    }
    // inside the form: light the rings it is crossing
    for (var i = 0; i < form.cages.length; i++) {
      var c = form.cages[i];
      var halfH = g.H0 * c.scale;
      if (y < g.cy - halfH - reach || y > g.cy + halfH + reach) continue;
      var t = (y - (g.cy - halfH)) / (2 * halfH);
      if (t <= 0 || t >= 1) continue;
      var rad = g.R0 * c.scale * profile(t, c.sag);
      if (rad < 1.5) continue;
      ctx.beginPath();
      ctx.ellipse(g.cx, y, rad, Math.max(0.9, rad * TILT), 0, 0, Math.PI * 2);
      ctx.strokeStyle = Dyes.css(g.colour, 0.62);
      ctx.lineWidth = c.width * 0.8;
      ctx.stroke();
    }
    ctx.restore();
  }

  root.IPForm = {
    hash32: hash32,
    normalise: normalise,
    build: build,
    draw: draw,
    DILATION: DILATION
  };
})(typeof window !== 'undefined' ? window : globalThis);
