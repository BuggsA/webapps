# Tonight — palette & gradient research (2026-09-06)

Investigation only — nothing built from this yet. The chrome rework landed,
but the **colour field itself still reads as "AI"**, and the top edge looks
cut off. Here's why, what real twilight actually looks like, and the
direction for a fix. Feeds a future "Palette" subsection of
`tonight-art-direction.md`.

---

## 1. "The top cuts off" — two small, real causes

Investigated the running page (civil dusk, Lisbon):

**a. theme-color / body-background seam.**
`<meta name="theme-color">` is hardcoded `#0b1020` (rgb 11,16,32) and
`body { background: #0b1020 }`. The live sky at the very top edge is
rgb(15,33,62) — lighter and bluer. On a phone the browser paints its
status/URL bar with the static `#0b1020` while the page starts at
(15,33,62): a visible horizontal step between browser UI and sky. Reads as
the gradient being clipped by a dark band.

**b. The gradient plateaus at the top.**
Sky column sampled at civil dusk (px, centre):

| y (css) | rgb |
|--:|---|
| 0 | 15,33,62 |
| 20 | 21,35,62 |
| 40 | 24,36,62 |
| 80 | 34,40,63 |
| 140 | 49,46,64 |
| 220 | 83,59,60 |

Top ~40px moves ~9 units total, then it accelerates. The top ~15-20% is a
near-flat slab; the gradient visibly "starts" lower down. The corner
vignette (30 % black radial) makes the slab look flatter still. Real
twilight skies are not monotonic top-to-bottom (see §3).

---

## 2. Why the colour/gradient still reads as AI

Research is consistent:

- **Blue→purple is the loudest tell.** "The blue-to-purple gradient is the
  single loudest AI tell in 2026" (925studios); from Tailwind `indigo-500`
  flooding training data (prg.sh). Tonight's civil-dusk **mid-band is a
  desaturated violet-grey** (sampled ~rgb 49,46,64 — B>R>G lavender-grey).
  It arrives "physically" from an OKLab blend navy→amber, but a straight
  line between blue and orange in *any* perceptual space passes through
  that purple-grey midpoint. **The midpoint is the problem.**
- **"Timid, evenly-distributed palettes" lose to "dominant colours with
  sharp accents"** (prg.sh). Tonight's field is one smooth even ramp — no
  bands, no value break, no accent. Evenness itself is an AI signature.
- **Smooth banding-prone gradients "look more suspect by the week"**
  (Studio 2am). 8-bit displays band on slow dark ramps. Tonight has
  film-style grain (helps mask) but not *calibrated dithering* — a
  different fix: ±1/255 interleaved-gradient noise (frost.kiwi).
- **Grain is now a double-edged tell.** Grain applied thoughtlessly —
  "noise evenly across the whole frame, repeats at a predictable interval"
  — reads as AI. Grain as a deliberate decision about *how much*, ideally
  real scanned film grain that "clumps unevenly," reads as hand-made
  (Studio 2am). Tonight's grain is a flat procedural `soft-light 0.5α`:
  currently the thoughtless kind.
- **Everyone's fix: anchor the palette to "something true," not a
  statistical average** (prg.sh, 925studios, Studio Maydit). For a sky app
  the true reference is **measured twilight colour and structure** — which
  the hand-picked OKLCH anchors only loosely approximate.
- **"Aurora / mesh gradient" is a named 2026 staple of "AI dashboards"**
  (Kittl). Tonight isn't doing mesh gradients, but a full-bleed smooth
  colour field is adjacent — so it needs *more* real structure to stand
  apart, not less.

### Sources
- <https://www.925studios.co/blog/ai-slop-design-tells>
- <https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website>
- <https://studio2am.co/blogs/news/naive-grainy-and-blurred-on-purpose-2026s-pushback-against-ai-smooth-design>
- <https://studio2am.co/blogs/news/grain-glass-and-gradient-the-background-is-having-a-moment>
- <https://blog.frost.kiwi/GLSL-noise-and-radial-gradient/>
- <https://www.kittl.com/blogs/gradient-graphic-design-trend/>
- <https://medium.com/@kai.ni/design-observation-why-do-ai-generated-websites-always-favour-blue-purple-gradients-ea91bf038d4c>

---

## 3. What real twilight looks like (the reference to anchor to)

From atmospheric-optics + sky-rendering literature:

- **Not a monotonic vertical ramp.** A clear twilight sky has *horizontal
  bands* and strong *azimuth* dependence:
  - **Toward the sun, low:** a bright yellow-white "bright segment" /
    twilight arch.
  - **Opposite the sun:** the **Belt of Venus** — a pink/salmon band
    ~10-20° above the horizon (backscattered reddened sunlight), sitting
    *above* the **Earth's shadow** — a distinct **blue-grey band** hugging
    the antisolar horizon.
  - So the *darkest* part of the sky is often **not the zenith** but that
    low antisolar band — the opposite of Tonight's "zenith = darkest".
- **The transition colour is not lavender.** As the sun drops, red/orange
  dominate low down; the mid-sky goes through **dusty rose / peach / warm
  taupe / a hint of green-gold** — not violet. The real "purple light"
  (volcanic aerosols) is rare and high, not a nightly band.
- **Night is not black.** Airglow (green 558 nm, red, sodium yellow) plus,
  near towns, sodium/LED skyglow — "pale orange, grey, washed-out white
  over cities". Scotopic vision makes dim scenes "desaturated and slightly
  bluish-grey". True night sky ≈ very dark **desaturated blue-grey/brown**,
  faintly warm near the horizon — never pure `#04060f`.
- **Physically-based models are the gold standard:** Preetham (1999) →
  Hosek-Wilkie (2012) → Bruneton (multi-scatter). Stellarium uses Preetham
  with "an exponential twilight transition", plus a more advanced
  "ShowMySky" option. No need to port one — their **chromaticity ramps**
  are the thing to sample.

### Sources
- <https://www.astronomy.com/observing/twilights-glow-is-calling/>
- <https://www.colorado.edu/asmagazine/2020/11/30/celestial-phenomena-steve-belt-venus-earths-shadow-and-milky-way>
- <https://atoptics.co.uk/blog/twilight-sky/>
- <https://www.astronomy.com/science/the-sky-isnt-just-blue-airglow-makes-it-green-yellow-and-red-too/>
- <https://stellarium.org/release/2022/03/27/stellarium-0.22.0.html>
- <https://www.cg.tuwien.ac.at/research/publications/2007/zotti-2007-wscg/zotti-2007-wscg-paper.pdf>

---

## 4. Direction for the fix (NOT built — for sign-off)

1. **Replace the 2-anchor vertical blend with a small structured twilight
   model:** zenith / upper sky / antisolar Belt-of-Venus pink band /
   Earth's-shadow blue-grey band / horizon bright segment — with
   **azimuth awareness** (warm toward the sun, pink + grey opposite).
   Sample anchor colours from real twilight photography / Preetham
   chromaticity, not hand-picked OKLCH.
2. **Route the dusk transition around the purple midpoint** — through warm
   neutral / dusty rose / faint gold, never lavender. Explicit waypoints or
   a hue-path constraint.
3. **Give it value structure** — a real darker counter-glow band + a
   brighter horizon band: "dominant colour + accent", not a timid even ramp.
4. **Add calibrated dithering** (±1/255 interleaved-gradient noise) *in
   addition to* grain, so 8-bit banding genuinely goes.
5. **Make the grain a deliberate, uneven decision** — vary density, ideally
   a real scanned-grain tile, not a flat procedural wash.
6. **Night = dark desaturated blue-grey/brown**, faint warm horizon, a hint
   of skyglow — not near-black.
7. **Fix the top:** drive `<meta name="theme-color">` and `body` background
   from the live zenith colour each frame; carry gradient variation to the
   very top edge (or make the zenith a touch lighter than the band just
   below it, per the Earth's-shadow structure); reconsider the corner
   vignette.

If the direction is right, this becomes the Phase-2/5 palette work and a
new **Palette** subsection in `docs/tonight-art-direction.md`.
