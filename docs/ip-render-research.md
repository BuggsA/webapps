# ip — render research: why the build looks flat, and what it would take

**Written 2026-09-15 after the user's verdict on the phase-1 build:** *"this
is looking mad ugly... It looks like a dumbed down version of photos. It is
supposed to look better than pictures. Also interactive. I think you are
taking the easy route."*

They are right on all three counts. This document is the diagnosis, the
evidence, and the one decision that follows from it.

**The proof is `../scripts/ip-render-gate.html`** — same geometry, one switch
per technique. All off is the current build. All on is the target. Look at it
before reading further; the gap between those two states is the whole
argument.

---

## 1. What I actually shipped, and why it is flat

Not a matter of taste. Six specific, nameable failures:

| # | What I did | What it costs |
|---|---|---|
| 1 | **Every line is a 1px hairline at constant width.** | A hairline cannot recede. In the stills, near grid lines are wide and soft and far ones are thin and faint — that difference *is* the depth cue. Mine are identical at every distance, so the plate reads as a flat pattern rather than a receding plane. |
| 2 | **No bloom.** I faked it with a three-stop sprite behind each *point*. | Lines, edges and corners have no glow at all, so every wireframe reads as CAD. In the stills the light comes off the *whole* bright structure, not off selected dots. |
| 3 | **No depth of field.** Everything is equally sharp. | Nothing tells the eye where the focal plane is, so the image has no camera — and therefore no volume. |
| 4 | **No atmosphere.** | There is no medium between the viewer and the far field, so distance is communicated only by size. The stills have visible air. |
| 5 | **No tone mapping.** I composite straight to 8-bit. | Bright things clip to flat white instead of rolling off. Light that cannot exceed 1.0 cannot bloom, because there is no headroom for it to bloom *from*. |
| 6 | **Marks are `fillRect` squares.** | Literally axis-aligned squares. At the horizon they read as chunky pixels; up close they are just wrong. |

The root cause behind all six: **I built the picture out of primitives that
cannot carry light, then tried to imply light by tuning alpha values.** That
is the easy route, and it is the one I took.

## 2. What the reference stills are made of

Reading them as renders rather than as mood:

- HDR scene, additively accumulated, then tone-mapped — the cores are blown
  out and roll off smoothly rather than clipping.
- Bloom from the whole bright structure, several radii deep.
- Real camera: focal plane, circle of confusion, near and far softness.
- Exponential atmospheric falloff with a cold scatter.
- Fine film grain over the top, a soft vignette, very slightly warm cores
  against cold structure.
- Blacks that are deep but *not* crushed — there is information in the dark.

None of that is decoration. It is what a camera does to light, and it is the
entire difference between the stills and my build.

## 3. What the browser can and cannot do

### Canvas 2D: the ceiling I hit

- **Line width is the whole problem.** `GL_LINES` is capped at 1.0px by
  ANGLE, which is what Chrome uses on Windows; canvas hairlines look the
  same. Matt DesLauriers' survey of the problem concludes native line
  primitives are *"inadequate for production quality line rendering"*
  ([Drawing Lines is Hard](https://mattdesl.svbtle.com/drawing-lines-is-hard)).
- **Additive blending works.** `globalCompositeOperation = 'lighter'` is
  supported everywhere since 2015, and is what my point sprites use. So
  accumulation is possible.
- **A real blur is not affordable.** `ctx.filter = 'blur(Npx)'` exists, but
  it is [known to be very slow](https://bugzilla.mozilla.org/show_bug.cgi?id=1498291)
  in both Firefox and Chrome — there are long-standing bugs on exactly this.
  A bloom chain needs several blurs per frame. It will not hold 60fps.
- `OffscreenCanvas` does not help: Firefox still does not ship the 2D context
  for it.

**Verdict: Canvas 2D can do additive glow on sprites and nothing else on this
list.** No thick feathered lines, no bloom chain, no tone mapping, no DOF.
The ceiling is roughly where the current build already is.

### WebGL2: everything on the list, and cheaply

- **Thick, feathered, depth-aware lines** by expanding each segment into a
  screen-space quad in the vertex shader and shading it with a signed
  distance from the centre line. The same SDF gives the glow for free.
- **HDR accumulation** into an `RGBA16F` target with additive blending, so
  light adds up the way light does.
- **Bloom** as a bright-pass with a soft knee, then a downsample/upsample
  chain ([LearnOpenGL: Bloom](https://learnopengl.com/Advanced-Lighting/Bloom),
  [Physically Based Bloom](https://learnopengl.com/Guest-Articles/2022/Phys.-Based-Bloom)).
  Cost scales with *resolution*, not with how much data is on screen.
- **Depth of field** almost free in this scene: everything is a line or a
  point, so the circle of confusion just widens and softens the primitive.
  No separate blur pass at all.
- **Tone mapping, vignette, grain, chromatic aberration** in the composite
  pass.
- Custom blend equations and shaders are precisely what Canvas 2D does not
  expose ([WebGL vs Canvas 2D](https://svilenkovic.com/3d/webgl-vs-canvas-2d)).

**All of the above is implemented and running in
`../scripts/ip-render-gate.html`**: 535 lines, 541 points, half-float HDR,
five-level bloom chain, ~58fps at DPR 2.

### Support and the performance floor

- WebGL2 is at **~98% of global browser usage**; Safari shipped it in iOS 15
  / macOS Monterey in 2021. The gap is pre-2012 GPUs, which need a WebGL1 or
  canvas fallback ([WebGL2 support](https://www.testmuai.com/learning-hub/webgl-2-browser-compatibility/),
  [Web3D Survey](https://web3dsurvey.com/webgl2)).
- **Geometry is not the cost.** 87,000 horizon marks is one draw call; any
  GPU eats that. The post chain is the cost, and it is a function of
  resolution — which is why the phone budget is "cap DPR and render bloom at
  half resolution", not "draw fewer networks".

## 4. The constraint this collides with

`ip-narrative-and-outline.md` §7, the user's own brief:

> Vanilla HTML, CSS, and JavaScript with **Canvas 2D**. No framework,
> bundler, or build step.

And `building-a-new-app.md` §1 says the same for the whole repo.

**So the thing being asked for and the constraint written down are in
conflict, and that needs an explicit decision rather than a quiet
substitution.** Worth being precise about how big the change actually is:

| House rule | Still satisfied with WebGL2? |
|---|---|
| No framework | Yes — raw WebGL2 and GLSL, no three.js, no library at all |
| No bundler, no build step | Yes — one `.js` file, shaders as template strings |
| No CDN, self-contained folder | Yes |
| Tier 1, pure static | Yes |
| Works offline after first load | Yes |
| Accessibility floor | Unchanged — the canvas was always `aria-hidden`; the semantic companion carries the facts either way |

**Only the literal words "Canvas 2D" change.** WebGL2 is a browser API, not a
dependency. The fallback for the ~2% is the Canvas 2D renderer that already
exists — it becomes the floor rather than the ceiling.

## 5. "Better than pictures" — what that has to mean

A still can be beautiful. It cannot be *any* of these, at any budget:

1. **Parallax coupled to the viewer.** Motion parallax is the strongest
   monocular depth cue there is, and head-coupled perspective raises the
   sense of presence more than stereo does. The gate already does this on
   pointer move — it is the single cheapest thing that makes the frame stop
   being a picture.
2. **Light that answers within one frame.** Feedback under ~100ms reads as
   instantaneous; the target is ~16ms. Nothing in the current build responds
   to the pointer at all.
3. **Continuity through scale.** The stills show seven separate moments. The
   thing can travel between them without a cut.
4. **It is true, and it is yours.** The referent is the whole point —
   Google Earth holds people because it is their actual roof. See
   `[[beauty-needs-a-referent]]`.

So the honest target is: **match the stills on material, and beat them on the
four things above.** Claiming to beat a rendered still on pure image quality
would be overselling it.

## 6. The interaction failures, separately

Worth listing because they are not fixed by the renderer:

- **Scale snaps to states.** The thing that makes scale exploration feel good
  is direct manipulation — *The Scale of the Universe* works because dragging
  "turns size into something you feel in your hand". Snapping takes the
  object out of the visitor's hand at the end of every gesture.
- **Nothing responds to the pointer.** No hover, no proximity lighting, no
  parallax. The whole field is inert until you scroll.
- **Nothing responds to a press.** Cause and effect is the three-year-old
  test from the brief, and there is currently no effect to cause.

## 7. The decision

**Recommendation: rebuild the renderer on raw WebGL2, keep everything else.**
The data layer, the semantic companion, the DOM answer, the privacy posture
and the phase plan are all unaffected — this replaces the drawing code and
nothing above it.

The alternative, staying on Canvas 2D, is a real option but it should be
chosen knowing the ceiling: roughly the current build, plus better sprites.
The stills are not reachable from there.

---

---

# Addendum, same day — the floor, and why "stick figures"

**Verdict on the v1 gate:** *"This does look better. The rendering settings
does heavily distract... things look too precise. like stick figures. maybe
shadows or reflections. do research I think the images have a glow and
reflection."*

Correct on all counts, and the diagnosis is sharper than v1's. Going back to
the stills with this in mind: **the ground plane is doing most of the work I
had ignored.** It is not a grid drawn on black. It is a surface.

## What the stills actually do with the floor

Three separate things, all visible in reference 3 (the 37 prefixes) and
reference 5 (the wide neighbour field):

1. **It is glossy.** Every luminous object has a soft vertical reflection
   under it — sharp where the object touches the plane, smearing out with
   distance. That is the single biggest reason the objects look like they are
   *somewhere* rather than pasted on.
2. **It is lit.** Every luminous object spills a pool of light onto the plane
   around it. This is what makes an object sit ON something. Without it, a
   glowing wireframe floats in front of the background instead of standing in
   the scene.
3. **The objects have surfaces.** A slab in the stills is a faint face with a
   bright rim, not twelve edges. That is precisely the "stick figures"
   problem: I drew only the edges, so there was no solid for the light to be
   on.

## The techniques, and what they cost here

| Effect | Technique | Cost in this scene |
|---|---|---|
| **Reflection** | Planar reflection: mirror the world about y=0 and draw it again. No second camera and no second render target are needed, because the plane is axis-aligned and fixed. Gloss falloff comes out of the object's original height above the plane: fade with `exp(-h·k)` and widen the feather with `h`, which reproduces "sharper at the contact point, blurrier further away" for free. | **One extra geometry pass.** Doubles draw calls, not fill rate, because the reflection is dimmer and mostly off-screen. |
| **Light pools** | An additive decal on the plane under each luminous object, radial falloff. This is the light-decal / blob-shadow trick inverted: instead of darkening under an object, brighten. | **8 instanced quads.** Free. |
| **Surfaces** | A quad per face, very faint fill, bright rim, plus a grazing-angle term standing in for Fresnel — a face seen edge-on catches more light than one seen flat. | **31 instanced quads.** Free. |

**Shadows specifically: they do not apply here, and that is worth saying
rather than quietly skipping.** This scene is additive light over near-black.
A shadow darkens ambient light, and there is no ambient light to darken —
there is nothing under the objects to take away. Everything grounding the
objects has to be *added*: the pool and the reflection. The stills confirm
this; there is no shadow anywhere in any of the seven.

## Measured

Gate v2, at DPR 2: 535 lines, 541 points, 31 surfaces, 8 pools, reflection
pass on, five-level bloom chain — **60fps**. The floor work was the cheapest
part of the whole pipeline.

## The other note: the settings were competing with the picture

Fair, and fixed. The panel is behind one word in the corner and closed on
load. The gate has three presets: everything off, **the phase-1 build**
(which reproduces the stick-figure look for direct comparison), and
everything on.

---

# v3 — the settings come out, and six tuning notes

*"they probably shouldn't have access to the render settings to modify
things. I think it takes away from it all. Things maybe should be clickable,
ip address again should always be available. The dark space should be more
dark. The points should be sharper and more defined with glow. The planes
should be lighter."*

All acted on. The gate is now a picture, not a tool.

| Note | What changed |
|---|---|
| **No settings** | Panel and all toggles deleted. One tuned state. Perf is on `window.__fps` for the build, not on screen for the visitor. |
| **Clickable** | Every object is a hit target. Hover lights it, raises its light pool, and names it; click makes it the subject and the plate follows. Hit radius is *measured* — project the centre and a point one radius to the side, take the screen distance — because guessing it left the far slabs unhittable. Hysteresis on the hover, or the parallax nudging the scene under the cursor makes it flicker. |
| **Address always available** | Persistent `HOME · <address>` marker with Copy, exactly as the app has it. |
| **Darker dark** | Bloom threshold 0.50 → 0.68, knee 0.35 → 0.26, clear colour down by a third, vignette 0.80 → 1.05, far grid dies at z=20 instead of 34. The grain now *multiplies into what is already lit* instead of being added flat, so it cannot lift the black at all. |
| **Sharper points** | The core feather goes from 0.28 to 0.10 and the point halo tightens from `exp(-r²·2.2)·0.55` to `exp(-r²·3.6)·0.34`. The spreading is left to the bloom chain, which is where it belongs — a soft sprite pretending to be glow is what read as mushy. |
| **Lighter planes** | The announced block's marks go 0.26 → 0.62, its edges 0.95 → 1.35, its corners 1.5 → 2.3, its surface 0.20 → 0.34. It reads as a lit field now rather than a dark one with lit edges. |

One more fix found while tuning: the reflection was nearly as bright as the
object, so a slab read as **two stacked boxes** rather than one box on a
glossy floor. The height falloff was far too slow — `exp(-h·2.6)` over
objects only 0.2 units tall is barely any falloff at all. Now `exp(-h·9.0)`,
which is what a reflection actually does.

60fps at DPR 2, everything on.

## Sources

- [Drawing Lines is Hard — Matt DesLauriers](https://mattdesl.svbtle.com/drawing-lines-is-hard)
- [LearnOpenGL — Bloom](https://learnopengl.com/Advanced-Lighting/Bloom)
- [LearnOpenGL — Physically Based Bloom](https://learnopengl.com/Guest-Articles/2022/Phys.-Based-Bloom)
- [WebGL vs Canvas 2D — when 3D is overkill](https://svilenkovic.com/3d/webgl-vs-canvas-2d)
- [Firefox bug 1498291 — canvas filter blur is very slow](https://bugzilla.mozilla.org/show_bug.cgi?id=1498291)
- [MDN — globalCompositeOperation](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation)
- [WebGL2 browser support in 2026](https://www.testmuai.com/learning-hub/webgl-2-browser-compatibility/)
- [Web3D Survey — WebGL2 statistics](https://web3dsurvey.com/webgl2)
- [Volumetric lighting techniques](https://garagefarm.net/blog/volumetric-lighting-in-rendering-techniques-and-performance)
- [Atmospheric perspective in rendering](https://www.d5render.com/posts/atmospheric-perspective-for-aerial-rendering)
- [Infinite ground plane using GLSL shaders](https://github.com/martin-pr/possumwood/wiki/Infinite-ground-plane-using-GLSL-shaders)
- [Scale of the Universe — the direct-manipulation precedent](https://webiano.digital/the-scale-of-the-universe-still-feels-impossible-to-close/)