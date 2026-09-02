# Until — from "nice" to beautiful

A plan, not a changeset. Built from three research passes (typography,
procedural light/grain, art references). Sources are inline.

---

## Why it reads "nice, not beautiful" now

1. **The type is operating-system chrome.** `-apple-system` at display
   size for "How long until…" and for "21 minutes · 46 seconds" — the
   same font as a macOS dialog. Nothing says *designed*. Biggest single
   tell.
2. **The light is a blurry sticker.** Each glow is one `radial-gradient`
   sprite blitted onto the canvas: one falloff curve, one colour, linear
   alpha, pasted on top. Real light has a hot tight core *and* a huge
   faint halo at once, a warm→cool shift core-to-edge, and texture riding
   on it. A single gradient does none of that, so the eye files it as
   "PNG glow."
3. **Everything is dead-centre.** Number centred, field centred, sun
   near-centre. The work that feels like an installation (Eliasson;
   *If the Moon Were Only 1 Pixel*) puts one small element low or
   off-axis in a large empty field and lets the emptiness carry it.
4. **It ticks.** The per-minute point fades in ~1s — a visible blink.
   Turrell / Long Now: change should sit *below* the threshold of
   motion; you notice only by looking away and back.
5. **Gradients band; nothing has grain.** The horizon sky stair-steps on
   a good panel. Not one noise pixel anywhere. Cheapest fix, highest
   payoff.
6. **The orange button is the SaaS moment.** A big filled `#e8865a`
   rectangle on the opening screen is the one element that looks like a
   product, not an instrument.

The bones are right — three real modes, past-event handling, ambient
mode, reduced-motion. This is a finish problem, not a structure problem.

---

## The thesis: Light and Space

Turrell, Eliasson, Robert Irwin — art whose entire content is a single
luminous field changing so slowly you register it only in retrospect.
Every mode becomes a variation on **one warm light source in a large,
hazy, near-monochrome dark field**. Value and glow carry the
information; hue never becomes a legend.

Across all three modes:
- one hue family (warm amber → brown-black); brightness does the talking
- no hard edges — bloom, atmospheric falloff, grain, vignette; the
  composition fades at its edges so it reads as a fragment of something
  bigger
- the focal element is small, often low or off-centre
- motion is accumulated drift over tens of seconds, never a per-tick step

Refs: Eliasson *The Weather Project* (semicircle sun, mist,
near-monochrome); Turrell Ganzfeld / Skyspace (dusk colour sweep, no
frame); teamLab *Infinite Crystal Universe* (identical point primitives
reading as one body).

---

## Lever 1 — Typography (biggest visible gain, lowest risk)

Ship two variable fonts as `woff2` **inside `apps/until/`** (all SIL OFL
1.1 — self-hosting + redistribution allowed; ship `OFL.txt` beside them):

- **Heading / event name — Fraunces** (variable; `wght`, `opsz`, `SOFT`
  for inky terminals that survive on dark, `WONK` for personality).
  Warm literary editorial revival, heavy in award work. ~100 KB.
  *Alt:* Instrument Serif (static, ~30 KB, current minimal-award look) —
  but hairlines flicker reversed-out large; needs warm off-black + a
  little tracking.
- **The number — Space Grotesk** (variable, `wght` 300–700; true tabular
  figures via `font-variant-numeric: tabular-nums slashed-zero`).
  Reads like an installation wall label, holds up massive. ~45 KB.
  *Alt:* Recursive with `MONO 1` — one file covers digits *and* UI text;
  `CASL` axis adds warmth.

Set the number light-weight, tabular, generous tracking. Set the heading
with `opsz` high and `SOFT` ~30–50. Warm off-black, never `#000`.

Refs: github.com/undercasetype/Fraunces,
github.com/floriankarsten/space-grotesk, github.com/arrowtype/recursive,
Awwwards "100 best free fonts 2025". Pre-built variable woff2 also on
Fontsource.

---

## Lever 2 — Grain + perceptual colour (cheap, global)

- **Baked SVG `feTurbulence` grain**, one `::after` at `inset:0;
  pointer-events:none`, `data:` URI (static — never animate a
  full-screen feTurbulence, it's a known jank source).
  `type="fractalNoise"`, `baseFrequency ~0.7`, `numOctaves 3`,
  `color-interpolation-filters="sRGB"`, `mix-blend-mode: soft-light`,
  **opacity 3–5%**. Wrap the stage in `isolation:isolate`.
  Refs: CSS-Tricks "Grainy Gradients"; Frontend Masters "Grainy
  Gradients" (non-darkening displacement variant).
- **OKLCH gradients** wherever a gradient exists: `linear-gradient(in
  oklab, …)` for light-falloff ramps (even lightness, no muddy-grey
  midpoint), `in oklch` for a warm hue rotation. Precompute 6–8 stops as
  a plain fallback (~92% native support). Ref: Josh Comeau "Make
  Beautiful Gradients".
- **Dither** the very dark ramps (8×8 Bayer or blue-noise offset) if
  banding survives OKLCH. Ref: Maxime Heckel "The Art of Dithering".

---

## Lever 3 — Real bloom (the "PNG glow" fix)

**Option A — Canvas2D poor-man's pyramid (stay in current architecture).**
Scene → offscreen canvas → extract bright parts → `drawImage` into a
canvas ¼ size then back to full with smoothing (the up/down-scale *is*
the blur) → composite with `globalCompositeOperation='lighter'`. Repeat
at 2–3 downscale factors and add. Tint bloom warmer, desaturate slightly.
Add a Reinhard/ACES-ish highlight rolloff so cores don't clip to flat
white; add a vignette. ~80% of the result.

**Option B — one hand-rolled WebGL fragment shader (bigger lever, best
for HORIZON).** Single fullscreen triangle, ~50 lines JS + ~80–150 lines
GLSL, **no library**. True multi-scale glow, exponential distance fog
with warm directional in-scatter, god-rays marched from the light's
screen position, filmic tone-map, grain+dither in the same pass. Render
at 0.5–0.75× resolution, cap DPR ~1.5, `precision highp float`, wrap
`u_time`, gate rAF on `prefers-reduced-motion` + `document.hidden`,
handle `webglcontextlost`. Request `{alpha:false, antialias:false}`.
Refs: Iñigo Quílez "Fog"; frost.kiwi "dual Kawase"; Fabien Sanglard
light-scattering; LearnOpenGL "Bloom".

**Recommendation: A for LIGHTS + ORBIT, B for HORIZON only.** Horizon is
the mode that genuinely wants volumetric light + god-rays, and a shader
there is self-contained. The other two look great with pyramid bloom and
don't need the risk.

---

## Lever 4 — Per-mode redesign

### LIGHTS
Keep phyllotaxis (research endorses it) but:
- grow the field to fill more of the frame, with a **density gradient** —
  denser toward the centre light, thinning outward
- identical soft-glow primitive for every point, but vary size/opacity
  **continuously** with a slow noise field so the mass breathes as one
  body
- the spent-minute point does **not** blink — it dissolves over 8–15s,
  drifting slightly: "the field breathing, not a cell blanking"
- consider blue-noise / Poisson-disc instead if you want less visible
  spiral structure

Refs: teamLab *Infinite Crystal Universe*; Tyler Hobbs flow-fields & QQL
philosophy — minimum spacing sacred, one motif, continuous variation,
seed with circle-packing not a grid.

### ORBIT
Lower contrast, more restraint. Right now the moving dot + comet is the
loudest thing on screen.
- central light is the hero: bigger, hazier, a faint god-ray
- orbital path barely-there; moving point small and quiet; destination a
  single hairline tick ("marked but understated")
- map orbital position to a slow warm→cool hue drift along the path —
  Eliasson *Your Rainbow Panorama*: a closed loop where position is a
  continuous colour shift, felt as "where am I in the loop," not a number
- pace so a casual glance sees no motion (Long Now Orrery — "motion so
  slow it's an idea")

### HORIZON
Strongest mode already; push it furthest.
- drop the horizon line lower (~78–82% down)
- sky = a Rothko-ish stack of 3–4 wide OKLCH bands
- real atmospheric haze (shader fog), one low god-ray from the sun
- stars resolve in *below the threshold of motion* as it darkens
- fix the visible vertical seam in the foreground glow (un-feathered
  `fillRect`)
- sun descends on an ease curve, never linear

Refs: Eliasson *The Weather Project*; Turrell Skyspace; Rothko colour
fields; *Do Nothing for 2 Minutes* (sun-to-horizon as a calm countdown).

---

## Lever 5 — Composition & motion (everywhere)

- Move the readout off dead-centre — upper third or a quiet lower corner
  even in the non-ambient view. Let 60–70% of the frame be empty field.
- Every transition eased (no `linear`), paced in seconds not frames; the
  idle state still drifts faintly (Refik Anadol — "alive even when
  nothing's happening").
- A deliberate very slight irregularity in cadence reads as "hand-made /
  installation"; metronomic perfection reads as "dashboard" (Maarten
  Baas *Real Time*).
- Opening screen: demote the orange. Ghost/outline button with a soft
  glow on hover, or text-only ("See the time →") with the accent as a
  thin underline. Save the accent for one small moment in the result
  view.

---

## Tier-1 / constraint check

All of the above stays inside "self-contained, no network, no backend":

| Item | Fits? |
|---|---|
| 2 × variable woff2 (~150 KB) + `OFL.txt` in `apps/until/` | yes, no requests |
| baked SVG grain (`data:` URI) | yes, zero requests |
| bloom option A (Canvas2D) | yes |
| bloom option B (raw WebGL, one shader, no lib) | yes |
| CSS OKLCH + static-stops fallback | yes |

No new dependencies. Deploy path unchanged
(`.\scripts\deploy-app.ps1 -Name until`).

---

## Suggested phasing (each independently shippable)

| Phase | Work | Effort | Payoff |
|---|---|---|---|
| 1 | Typography (2 fonts; set heading + number properly) + demote the orange | ~½ day | Largest visible jump |
| 2 | Grain overlay + OKLCH gradients + vignette + fix horizon seam | ~½ day | Removes the "cheap" tells globally |
| 3 | Canvas2D pyramid bloom for LIGHTS + ORBIT; per-mode restraint pass | ~1 day | Light stops looking like stickers |
| 4 | WebGL HORIZON: fog + god-rays + filmic tone-map | ~1–2 days | The "leave it open" mode |
| 5 | Composition/motion polish, cadence irregularity, idle drift | ~½ day | Final 10% |

Phases 1–2 alone move it from "nice" to "clearly designed." 1–4 is
"interactive installation."

---

## Decisions needed before building

1. **Font pairing** — Fraunces + Space Grotesk (recommended) /
   Instrument Serif + Space Grotesk / Recursive only / other
2. **How far** — Phase 1–2 / 1–3 / all the way
3. **HORIZON** — OK to bring in one hand-rolled WebGL shader, or keep
   everything Canvas2D (option A only)?

---

## Full source list

Typography: undercasetype/Fraunces · productiontype/Newsreader ·
Instrument/instrument-serif · floriankarsten/space-grotesk ·
arrowtype/recursive · IBM/plex · ateliertriay/bricolage · Syne (Bonjour
Monde) · MCKL Redaction · Awwwards best-free-fonts.

Light / grain / colour: css-tricks.com/grainy-gradients ·
frontendmasters.com/blog/grainy-gradients ·
joshwcomeau.com/css/make-beautiful-gradients ·
blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web ·
blog.frost.kiwi/dual-kawase · learnopengl.com/Advanced-Lighting/Bloom ·
iquilezles.org/articles/fog · fabiensanglard.net/lightScattering ·
evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl ·
css-tricks.com/revisiting-prefers-reduced-motion.

Art / references: tate.org.uk Weather Project · olafureliasson.net ·
aros.dk Your Rainbow Panorama · ekebergparken.com Turrell ·
teamlab.art/w/infinite_crystaluniverse · refikanadol.com ·
random-international.com/rain-room · en.wikipedia.org/wiki/Real_Time_(art_series) ·
tylerxhobbs.com/words/flow-fields ·
tylerxhobbs.com/words/the-design-philosophy-of-the-qql-algorithm ·
zachlieberman.medium.com · joshworth.com/projects/if-the-moon-were-only-1-pixel ·
experiments.withgoogle.com/100000-stars · web.dev/case-studies/100000stars ·
longnow.org/ideas/orrery-interval-invitation-long-term-thinking ·
donothingfor2minutes.com · everestpipkin.itch.io/screensaver-collection ·
en.wikipedia.org/wiki/Slow_media.
