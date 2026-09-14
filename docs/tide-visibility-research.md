# Tide — making high/low and the moon's pull actually visible

Research only. No code changed. Priority set by the user: **beauty and
wow first — utility is what brings people to the site, not the point of
the globe itself.** Read after `tide-panel-research.md`; this is the
same kind of pass, aimed at what was found by testing the globe directly
(see the conversation: sampled real rendered pixels at real high/low
tide moments, at the most extreme location on Earth) — the brightness
encoding is real and correctly scaled to each region's actual tidal
range, but it competes with day/night for the same channel and there is
no way, by design (no legend, per the banned list), to read it cold.
Separately, the moon's **phase** reads clearly (the disc); its
**location and causal role** — why the water does what it does, right
here — does not.

## 1. The precedent that solves this: Bartosz Ciechanowski, *Moon*

[ciechanow.ski/moon](https://ciechanow.ski/moon/) (Dec 2024) is an
interactive essay on the Moon — motion, gravity, tides, eclipses — done
in an aesthetic close to what Tide is already reaching for: thin
precise lines, restrained colour, no chrome, the diagram *is* the
explanation. It handles tides in two deliberate, separate moves, and
the second one is the important discovery:

**Move 1 — force, as arrows.** A water-covered toy planet, orbited by a
smaller body. *"The white arrows symbolize the neighbor's gravity
forces acting on the water at that location."* Water nearer the orbiting
body gets a longer arrow (stronger pull); water farther away, a shorter
one. Then he takes the *difference* between the force on the water and
the force on the planet's centre — that difference, not the raw pull, is
what actually deforms the ocean, and showing it as arrows first is what
makes the next step legible rather than magic.

**Move 2 — the payoff: an actually-deformed ocean.** *"The demonstration
below shows an exaggerated view of that tidally deformed ocean."* Not a
colour change — the water's silhouette itself bulges toward the near
body and away on the far side, exaggerated far past real scale (real
tidal bulges are centimetres against a 6,371 km radius; genuinely
invisible at true scale, same problem Tide already has and already
solves by exaggerating brightness rather than pretending otherwise).
A draggable figure lets you stand anywhere on the deformed surface and
feel why the water is high or low right there.

This is the same move Tide's own brief already commits to in words
("the tidal bulge faces the viewer") without ever committing to it
*visually* — the bulge is asserted in the art-direction doc, not shown.

**The standard textbook version** (NOAA's tides tutorial, and every
astronomy text) draws the same idea more simply: Earth as two aligned
bulges, one toward the moon, one away, staying locked to the Earth-moon
axis as the planet spins underneath — the two-bulge shape is a very
old, very legible convention. Worth knowing as the "obvious" version
Ciechanowski's essay earns the right to deviate from with real physics.

## 2. Why Tide can't just copy the literal geometry, and what to do instead

Tide's camera sits *at* the sub-lunar point by design — the near bulge
is always dead-centre of the screen, the far bulge is on the hidden
back of the sphere. Canvas 2D's orthographic projection has no
perspective: a true "toward the camera" bump at screen-centre produces
*zero* visible parallax or foreshortening change, no matter how big you
make it. A literal Ciechanowski-style deformed silhouette mostly
wouldn't read here — the one place it's most needed (the centre) is
exactly where flat projection can't show it.

**What does work at any screen position, including dead-centre, is
relief shading** — the illusion of a raised or sunken surface, made
with light and shadow rather than actual displacement. This is not a
compromise; it's the technique humans already read fastest. It's how
every embossed coin, bas-relief carving, and lunar photograph shows
shape: not by moving anything, by lighting a real height field from a
raking angle so the high side of every rise catches light and the low
side falls into shadow.

**The concrete version, in what the code already has:**

1. `computeField()` already produces `eta` (η, sea height) on the same
   360×180 grid every frame. Precompute its **gradient** on that grid
   at the same time — a cheap finite difference, `∂η/∂lon` and
   `∂η/∂lat` per cell — the same shape of work `sampleEta()` already
   does, just two more arrays, bilinear-sampled the same way.
2. Light it with a **raking** direction, not the flat overhead light
   already used for day/night. The sun's position in camera space
   (`sunCam`) is already computed every frame; its *tangential*
   component (`sx, sy`, ignoring `sz`) is exactly a raking light —
   strongest and most acute right at the terminator, vanishing at local
   noon and midnight. That is a gift: it means the relief is most
   visible exactly where the picture is already most dramatic (dawn and
   dusk), for free, using geometry Tide already computes.
3. Per pixel: `bump = clamp(gradX*sx + gradY*sy, -1, 1) * bumpStrength`,
   added to `L` alongside the existing height→brightness term. Keep
   `bumpStrength` modest — order `±0.04`, similar magnitude to the
   existing moonlight lift (`0.05`) — so it reads as *texture on top of*
   the honest brightness encoding, not a replacement for it.
4. The effect: right at the terminator, the sea stops looking like a
   flat wash and starts looking like an engraved, dimensional surface —
   a ridge where the tide is rising catches a highlight on one side and
   a shadow on the other, exactly like raking light across real ocean
   swell in a photograph. Nothing new to animate (it rides the existing
   terminator sweep and tide cycle); no legend; no new colour; nothing
   that reads as a "glowing blob" (the banned-list risk of anything
   distortion-shaped) because nothing's silhouette actually moves —
   only shading.
5. Honest caveat: this makes the tide *legible as shape* near the
   terminator and at oblique viewing angles (i.e. whenever you're
   looking across the ocean rather than straight down at local noon).
   At the exact centre in full flat daylight, gradX·sx+gradY·sy is
   small because the light is closer to overhead there too — but that's
   also where the base brightness signal (day multiplier ≈ 1, full
   range of the height LUT) is already at its clearest, so the two
   effects cover for each other across a full rotation rather than
   fighting.

A second, smaller, optional move for later: once the field's gradient
exists, a *very* subtle silhouette wobble at the visible limb (radius
modulated a few tenths of a percent by local η, `R(θ) = R·(1 + k·η(θ))`)
would let the actual rim of the planet show real bumps and dips where
they *are* visible in projection — around the edge, not the centre.
Keep it hairline-subtle: a distorted circle reads as engineering
(honest data) at a few tenths of a percent, and as a soft "blob" hero
graphic — the exact thing the banned list rules out — the moment it
gets rounder or bigger. Treat this as a maybe, not a should.

## 3. The moon's location and causal role

Two gaps, one cheap fix each, both matching precedent already proven
in this codebase:

**Default (moon) view — the connection is real but unstated.** The
camera *is* standing at the sub-lunar point; the near bulge is always
centred. Nothing on screen says so. A single hairline from the moon
disc down to the centre of the globe — Tonight's own `paintLeader()`
pattern, already built, already in the palette, a thin line and nothing
else — would say "the water here answers to the point that line comes
from" without a word of copy. Cheap, in-house precedent, matches
Ciechanowski's arrow instinct (a line showing *where the influence comes
from*) without borrowing his literal force-vector diagram, which would
look too technical for Tide's register.

**Zoomed to a place — the moon's bearing disappears entirely.** Once
the camera flies to a coast, the moon disc docks at a fixed screen
position (top, or top-right on narrow layouts) and stops indicating
direction at all. Ciechanowski's sky-panorama demo solves the same
problem with *"the little arrow will guide you to its position"* — a
small arrow that always points toward the moon regardless of where the
camera is looking. Tide's readout already computes moonrise/moonset
locally (`riseSet(A.Body.Moon, …)`); the bearing itself
(`A.Horizon`-style azimuth from the place to the current sub-lunar
point) is one more astronomy-engine call away. A short tick or arrow
near the moon disc, or a bearing degree folded into the existing "Moon
…% · rises … · sets …" line, would close this without adding a diagram.
This is the more *utilitarian* of the two fixes — worth doing, but
secondary to §2 under the stated priority.

## 4. What this is not proposing

- No legend, scale, or colour key — stays inside the banned list.
- No second hue for "tide" separate from the locked sea hue — relief
  shading works in luminance only, same as the rest of the palette.
- No WebGL, no true 3D, no framework — everything above is achievable
  in the existing Canvas 2D per-pixel pass, reusing arrays and camera
  math already computed every frame.
- Not a redesign of the readout or the curve — those already carry the
  precise numeric answer; this is entirely about the globe reading as
  *alive with cause and effect* to someone who never opens the panel.

## 5. Suggested order, if this gets built

1. Field gradient + raking relief shading (§2) — the main "wow," and
   the direct answer to "can you tell high and low tide by looking."
2. The moon → sub-lunar hairline in the default view (§3) — cheap,
   reuses Tonight's own code shape, answers "why is the water like this
   right here."
3. The moon-bearing indicator when zoomed to a place (§3) — smaller,
   more utilitarian, fine to defer.
4. Limb wobble (§2, optional) — the one item worth prototyping and
   looking at before committing; it's the only piece with real taste
   risk (bulge-vs-blob), everything else above is low-risk.

Nothing here has been built. Say which of these to take forward.

## Sources

- [Moon — Bartosz Ciechanowski](https://ciechanow.ski/moon/) — the tides section, under "Gravity at Scale"
- [Gravity, Inertia, and the Two Bulges — NOAA Ocean Service](https://oceanservice.noaa.gov/education/tutorial_tides/tides03_gravity.html)
- [Barotropic Global Ocean Tides — NASA SVS](https://svs.gsfc.nasa.gov/4821) (exaggerated-tide convention, for context)
