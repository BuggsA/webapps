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

**First pass at this (superseded below).** The obvious cheap fix is a
static hairline from the moon disc to the globe's centre, reusing
Tonight's `paintLeader()` pattern verbatim. It's honest and costs
almost nothing. But "cheapest" and "best" aren't the same question, and
on reflection this one is weaker than it looks: a line from a fixed
icon to a fixed centre-point only means something if the viewer already
understands "the camera stands at the moon" — the exact thing not yet
legible. It explains a static fact; it doesn't do anything.

**The better answer: stop treating the moon icon as chrome. Make it a
real tracked object.** Right now `.moon` is a decorative button pinned
at a fixed screen position (`moonDiscPos()` just reads its CSS
coordinates); `paintMoon()` draws the phase disc there regardless of
where the camera is actually looking. But the app **already computes**,
every single frame, in both the default and the zoomed-to-a-place view,
exactly the vector that answers "which way is the moon from here" —
`moonCam` in `frameConstants()` (`moonCam = toCam(sub.lat, sub.lon)`),
the same call already feeding the moonlight-lift lighting term. That
number is sitting right there, unused for this.

Use it to actually move the disc. Project `moonCam` to a screen
position just outside the globe's rim, in whatever direction it
currently points; when it points more away than toward the viewer, slip
the marker along the rim rather than letting it leave the screen —
exactly the **off-screen/edge indicator** pattern from games (the
waypoint arrow that slides along the edge of the view toward an
objective that's currently behind you, popularised by open-world games
and now a completely standard UI pattern), and functionally the same
move as Ciechanowski's sky-panorama arrow, just applied to Tide's own
camera rather than a literal star-map. Drag the globe away from the
moon's view and the marker visibly swings out toward the edge in the
correct direction, in real time, tied to a gesture the app already has;
release, and as the camera eases back to the sub-lunar point (the
existing `EASE_BACK` animation), the marker eases back to centre with
it — the causal link gets demonstrated by the motion itself, not
asserted by a line.

This single mechanism also **unifies the two cases** the first pass
treated as separate problems. `moonCam` is computed identically whether
`view.mode` is `'moon'` or `'place'`, so the same code that makes the
marker swing during a drag also makes it correctly show the moon's real
bearing once zoomed to a coast — no second, bolt-on "bearing indicator"
needed.

The one implementation wrinkle: the `.moon` element is a real
`<button>` (44px target, keyboard-reachable, per the accessibility
floor), not just a canvas glyph. Its DOM position needs to follow the
computed screen position each frame — reposition the element itself
(clamped inside the safe-area margins) rather than only redrawing the
icon, so the visible glyph and the tap/click target never separate.

**Combine, don't choose.** Once the marker is real, the original
hairline idea gets better rather than obsolete: draw a faint line from
wherever the marker currently sits to the sub-lunar point on the globe,
*only* while they're both on screen and not already close together. The
motion teaches the relationship; the line, shown only when useful,
confirms it. That combination is the actual recommendation, not either
piece alone.

**A third option, more atmospheric, worth naming even though it needs a
caveat.** The real, named, universally-recognised phenomenon this whole
app is implicitly about is the *moon glade* — the shimmering path
moonlight lays across water, pointing straight at the moon. Rendering
that would be extraordinarily on-theme and beautiful, and it would
double as a location cue for free (the glade always points at the
source). The catch: the art direction's banned list rules out "a
specular highlight" explicitly, aimed at the cheap glossy-3D-globe
look. A literal Blinn-Phong glint would trip that. What wouldn't: break
the highlight up through the same grain/dither texture the sea already
uses, so it reads as scattered, broken sparkle on ripples — which is
also what a real moon glade actually looks like, never a smooth glossy
streak — rather than a rendered light-model artifact. Higher risk,
highest ceiling; worth a prototype before deciding it either fits the
locked direction or doesn't.

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
2. The moon as a tracked, off-screen-indicator marker (§3) — bigger
   than the hairline alone, reuses the drag/ease-back interaction
   already built, unifies the default and zoomed-to-a-place cases in
   one mechanism. The recommended answer to "where is the moon and why
   does it matter here," not the hairline by itself.
3. The confirming hairline, layered on top of #2 once the marker is
   real — small addition, meaningfully better together than either
   alone.
4. Limb wobble (§2, optional) and the moon-glade shimmer (§3, optional)
   — both worth a prototype before committing, both carry real taste
   risk (bulge-vs-blob; glint-vs-banned-specular) that the rest of this
   list doesn't.

Nothing here has been built. Say which of these to take forward.

## Sources

- [Moon — Bartosz Ciechanowski](https://ciechanow.ski/moon/) — the tides section, under "Gravity at Scale"
- [Gravity, Inertia, and the Two Bulges — NOAA Ocean Service](https://oceanservice.noaa.gov/education/tutorial_tides/tides03_gravity.html)
- [Barotropic Global Ocean Tides — NASA SVS](https://svs.gsfc.nasa.gov/4821) (exaggerated-tide convention, for context)
