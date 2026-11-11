/* apps/ip/js/07-scene.js — the chassis, the block and the fields, as renderer-agnostic geometry.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

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
