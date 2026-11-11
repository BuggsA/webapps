/* apps/ip/js/09-c2d.js — the Canvas 2D fallback renderer.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

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
