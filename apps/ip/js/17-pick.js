/* apps/ip/js/17-pick.js — what the pointer is on: the cursor, picking a cell, a tap.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

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

/* A cursor on a layer that has faded out is pointing at nothing visible:
 * drop it rather than keep naming it. */
function dropFadedCursor() {
  if (cursor && layerAlpha[cursor.layer === undefined ? LY.BLOCK : cursor.layer] < 0.35) {
    cursor = null;
  }
}
