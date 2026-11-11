/* apps/ip/js/06-camera.js — matrices, projection, screen mapping, layer weights.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

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
