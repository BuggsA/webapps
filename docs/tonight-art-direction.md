# Tonight — Art Direction (LOCKED 2026-09-06)

**Read this before touching any visual code in `apps/tonight/`. Every phase
commit must reference this file. If a change can't be squared with the
per-phase checklist below, stop and re-read — don't drift.**

Chosen from five directions (Field Notes / Instrument / Nocturne / Broadsheet /
Signal). Full brief in the session that produced this; the decision and the
operative parts are captured here so nothing is lost between phases.

---

## Process — divergent generation ("raise the temperature")

A chain of highest-probability choices **is** the median look — which is what
reads as "AI". Counter it in the *design process*, not only in the render.
For any visual-direction decision (palette, motion, a new phase's look — not
every micro-choice), before converging:

1. **Two passes, never one.** Divergent pass first: many rough options, no
   usability or taste filtering. Convergent pass second: judge against the
   checklist, the brand, and taste; kill or hybridise. Filtering *while*
   generating collapses everything to the median.
2. **Quotas that force spread.** Options must span the space — e.g. one
   breaks a rule normally kept; one is colour-led, one motion-led, one
   grid-led (rotate which axis is primary); one is deliberately slightly
   wrong.
3. **Forcing constraints, seeded not chaos.** Roll a `(non-web reference,
   structure restriction, value logic)` tuple and design *genuinely to it*
   even if it seems wrong. Then judge what survives.
4. **Non-web references only**, and avoid *named genres* (a genre is its own
   median — "make it look like an instrument" is still a template).
5. **Mutate / cross-pollinate** two options; keep the interesting hybrids.
6. **End with one recommendation + rationale.** High temperature to
   generate, low temperature (taste + checklist + brand) to choose. Both,
   or it just thrashes.

The runtime analogue — seeded per-night "conditions" variation in the
render — is in `docs/tonight-palette-research.md` §"Variation".

---

## The direction: NOCTURNE, plus two borrows

### Thesis
Strip the sky to its essentials — colour and time — as a living colour-field
that happens to be astronomically exact. The gradient **is** the interface.
Naturalistic dusk, not screen-neon. Unhurried. A painting that's alive:
screenshots an hour apart should look like different artworks.

### The ten points (the spec)

1. **Concept** — Nocturne: colour-field dusk.
2. **Thesis** — colour + time as the whole content; minimal chrome; the field is the UI.
3. **Typography** — one refined high-contrast display serif, used *large and rare*.
   Place name set big, low-contrast, *into* the field. Times as small lining
   figures. Every other label is summoned, never persistent. (Self-hosted woff2,
   `font-display: swap`, system-serif first paint — same approach as `apps/until/`.)
4. **Colour** *(the original statement — the mechanism was superseded by §Palette on 2026-09-06; the intent below still holds)* — the entire screen is one continuously computed **OKLCH** vertical
   field, shifting with sun altitude. Every colour **derived** from the sun-altitude
   model, none hand-picked. Objects are the only non-field marks.
   *This is NOT the purple/blue SaaS gradient* — it's a measured naturalistic sky,
   and it is the content.
5. **Grid/composition** — none visible. Full-bleed, deliberately asymmetric,
   everything weighted into the lower third, text hung on an optical margin.
6. **Image treatment** — barely there. Stars as fine dust that only fully resolves
   when the view is still. Milky Way as a breath of lighter field. The moon is the
   single hard object on screen.
7. **Motion** — continuous and slow. The field is always imperceptibly moving as
   real time passes; **play** just speeds the same drift; transitions cross-fade,
   never cut. Reduced-motion: keep updating, drop the fades and any bloom animation.
8. **Signature device** — the horizon is **not a line**. It's a change in the
   field's temperature and grain, with one thin brighter seam where the afterglow sits.
9. **Hero (opening view)** — pure colour field; place name very large, lower-left,
   translucent serif; one small line under it (`6 Sept · clear after 11`); a faint
   moon high-right if it's up. Nothing else. No card, no CTA, no button cluster.
10. **Recognizable by** — it reads as living art, not a website about the sky.

---

## The two borrows (the "fix" for pure-minimal going empty)

### 1. Fading graticule — borrowed from *Instrument*
- **While a drag is active**, fade in (~150 ms) a faint alt/az scaffold:
  horizon arc + compass ticks (N/E/S/W major, intercardinals minor) +
  altitude ticks at 30° and 60°.
- **Fade out (~600 ms) once the drag ends.** Never visible at rest.
- The object card carries an `altitude / azimuth` readout line.
- Purpose: "I know where I'm pointing" without a permanent HUD.

### 2. Leader line — borrowed from *Field Notes*
- On tap-select, draw a **single hairline** (~0.75 px, low-alpha, the field's
  ink colour) from the object's projected point to the card's anchor corner.
- The card is a quiet overlay that nudges the field ~4% darker beneath it.
- Deselect fades both the line and the card.
- Purpose: the card belongs *to the sky*, not pasted over it — keeps the
  "considered" quality bare minimalism loses.

---

## Palette (LOCKED 2026-09-06 — replaces the OKLCH-anchor gradient)

Came out of a research pass (`docs/tonight-palette-research.md`) + a
divergent generation pass. The old field — a smooth OKLab blend between a
navy zenith and an amber horizon — still read as "AI": it passed straight
through a **violet-grey midpoint** (the #1 tell), it was a *timid even ramp*
(no value structure), it had raw banding, its grain was a flat procedural
wash, and its top plateaued into a dark slab.

**Direction: `E × C` — a film curve, structured by Belt-of-Venus logic.**

### 1. Colour/value engine — a film response curve (from *Ektachrome at dusk*)
The field colour is **not** interpolated between designer anchors. It is
`filmCurve(x)` where `x` is a scene-luminance value (see §2). The curve has
the character of pushed slide film at dusk:
- **Crushed blacks lift to teal-cyan.** Deepest sky is a lifted dark
  blue-green, never `#000` or pure navy. (Also the "night isn't black" fix.)
- **Midtones are a muddy *warm* neutral** — grey-taupe with a faint green
  cast, crossing to warm. **No control point sits in hue 250–330** (the
  purple/violet band). The path is cyan → cool-grey → warm-grey → amber.
- **Highlight bloom + red halation** where the sky clips bright (the sunward
  horizon): an over-exposed amber-white core with an orange halation ring
  bleeding up and out. A separate additive pass, not a curve stop.

### 2. Spatial structure — Belt-of-Venus logic (from *Belt of Venus, only*)
Scene luminance feeding the curve is **structured, not just "altitude"**:
- **Upper sky (> ~30° alt): quiet.** Low, nearly flat scene-luminance;
  near-neutral colour (curve's cool-grey). The zenith is **not** the darkest
  point and **not** a flat slab — it carries the mottling (§4) and a slight
  lift.
- **Antisolar horizon: two bands.** A soft **Belt of Venus** (salmon/pink,
  additive) centred ~10–18° alt, sitting above an **Earth's-shadow** band
  (cool blue-grey, slight value dip + desaturation) at 0–6° alt.
- **Sunward horizon:** the bright amber segment + the bloom/halation.
- **Azimuth-blended.** Belt/shadow strongest at the antisolar azimuth, glow
  strongest at the sun azimuth, both fading to nothing by ±90°. **Turning
  the view genuinely changes the palette** — sunset side vs shadow side.

### 3. Dithering — technical, separate from grain
±~1.5/255 blue-noise-ish tile, static, tiny alpha, tiled over the field to
kill 8-bit banding in the smooth curve regions. Not the grain.

### 4. Grain — a deliberate, uneven decision
Density and opacity **modulated by a low-freq mask** so it clumps — heaviest
in the midtone band, near-absent in the bloom highlight and the deepest
shadow. Non-grid distribution. Static (baked per place+date). Amount is
itself seeded (hazier night → more grain).

### 5. Seeded "conditions" — variation with provenance
One seed = `hash(round(lat,2) | round(lon,2) | YYYY-MM-DD)`. Drives a
*correlated bundle*: `turbidity` (→ halation spread & warmth, glow reach,
overall chroma, grain amount), Belt-of-Venus centre height & thickness, the
atmospheric **mottling** field (±~4% luminance, features ~40% of screen,
domain-warped slowly by `t`). All low-amplitude — a screenshot must never
look "randomised", just like *this* night. **Phase 4 done:** when the
forecast loads, `turbidity` is nudged by tonight's average cloud cover
(`turbidity*0.45 + (0.32 + 0.42·avgCloud)`, then re-baked) so cloudy nights
render hazier/washier and clear nights crisper — and a drifting cloud
**veil** (`paintVeil`) covers the sky in proportion to the cloud % at `t`.

### 6. The top edge
`<meta name="theme-color">` and `body{background}` are set from JS to the
live **zenith** colour (curve output at zenith scene-luminance) so the
browser UI blends into the sky. No flat slab; the corner vignette is
dropped or made much subtler (the Belt-of-Venus structure weights the frame).

### 7. Stays exact
Sun altitude → the twilight brightness model → scene luminance is real. Body
positions, rise/set, advice: real. The seed only touches **texture and
conditions**, never **data**.

**Deferred to Phase 5:** a seeded ragged horizon *silhouette* (terrain
profile) — it interacts with where bodies clip, so not in this pass.

---

## Chrome (added 2026-09-06, research-backed)

The sky rendering already carries the direction. The **chrome** — buttons,
inputs, the time bar, the locate prompt — was the part that still "looked
like an AI site". This is why, and what to do instead.

**Why it drifted:** homogenised UI is a documented phenomenon (CHI 2021,
Goree et al., *Investigating the Homogenization of Web Design* — designs
~30% more similar 2007→2020, driven by shared libraries, not content; the
AI wave — "Tailwind indigo-500", the "beige internet" — accelerated it).
Tools hand everyone the same defaults, so the defaults *become* the look.
The repo's tokens (`ink`/`ember`) were already right; the chrome went
generic anyway because it **reached for the patterns**: a frosted pill bar,
`border-radius` everywhere, drop shadows, a centred card, system-UI type,
a filled-primary + ghost-secondary button pair.

**Principle:** chrome is *marginalia written onto the field*, not components
placed on top of it. Tonight's hero is a real sky computed for the viewer's
location — "yours and no one else's". The chrome's job is to get out of its
way, not compete with it.

### Banned in chrome (hard rules — in the checklist)
- **No `border-radius`** on any control, input, or container. The only
  curves are the type itself and the scrub knob (a circle).
- **No `backdrop-filter` / blur.** Anywhere.
- **No `box-shadow` / drop shadows.** Depth is the field + type weight/contrast.
- **No system-UI / Inter / Geist font.** All chrome is the display serif.
- **No centred containers or modals.** Chrome hangs on the lower-left optical
  margin, asymmetric, aligned to the placard.
- **No bordered pill buttons; no filled-primary + ghost-secondary pair.**
- **No `<div>` toolbar with its own background.** Controls sit on the field.
- **No background-colour hover wash.** (See feedback, below.)

### Positive spec
- **Type:** Fraunces, self-hosted woff2 in `apps/tonight/fonts/` (SIL OFL,
  same font as `apps/until/`). Used for *all* chrome — words, clock, prompt,
  the Phase-2 object card. `font-display: swap`; `ui-serif` first paint.
  Numerals: Fraunces lining figures — one family, for unity.
- **Time controls = a caption line** on the field, one baseline near the
  bottom, aligned to the placard's left edge (not centred). *Now* and
  *Play* are words with a thin underline; real `<button>`s underneath.
- **Scrub = a hairline timeline** + a small filled knob. Native
  `<input type="range">` kept for keyboard/AT, visually reduced to a ~1 px
  rule; elapsed portion a touch brighter.
- **Clock =** set serif text beside the words, in the *place's* timezone.
- **Locate prompt =** a line of serif text into the field ("Where are you
  tonight?"), the input rendered as a bare **bottom-border writing line**
  (no box, no radius), results as a plain hairline-separated list, "use my
  location" as an underlined phrase. Same lower-left margin as the placard.
  Sky renders live behind it.
- **Chrome colour is derived from the live field:** take the zenith colour,
  raise L, drop C, clamp to ≥ 4.5:1 contrast against the darkest field
  state it sits over. Chrome is warm at dusk, cool at midnight — in the scene.
- **Feedback:** underline draws in / letter-spacing opens a hair / the word
  dims on press. Never a background wash. All collapse to instant under
  `prefers-reduced-motion`.
- **Voice:** unhurried, concrete, a little warm. No "Empower / Unlock /
  Seamless / two abstract nouns". Say what's true, plainly.

### Accessibility floor (so "beautiful" never breaks "usable")
- Real semantic elements, keyboard operable, **visible focus** as a
  hairline/underline state (not a rounded ring).
- Every chrome text colour ≥ 4.5:1 against the worst-case field behind it.
- Full `prefers-reduced-motion` path.
- Interactive hit target ≥ 44 px even when the visible mark is a word or a
  hairline — pad the hit area.

### Drift check (do this, periodically)
At each phase, before commit: screenshot at **≥ 3 times of night**, then ask
out loud — *"does any part of this look like it came from a component
library?"* If yes, name it and fix it before committing. Keep the tells
list in view: Inter · rounded-2xl · shadow-lg · glass blur · indigo/violet ·
centred stack · filled+ghost button pair · abstract 3D blob.

---

## Per-phase design checklist

Run this before every phase commit. All must hold (or be explicitly N/A for
that phase's scope):

- [ ] On-screen colour is **derived** from sun altitude + view azimuth through the film curve (§Palette) — never hand-picked sRGB anchors; no control point in the violet band.
- [ ] **No hard horizon line** — horizon reads as a seam / temperature change.
- [ ] Grain present: static, low-opacity, baked (not animated).
- [ ] Bloom **only** on moon / planets / brightest stars — additive, soft, low-alpha. No glow blobs.
- [ ] Chrome is minimal, bottom-weighted, translucent. Nothing persistent mid-screen.
- [ ] Graticule appears **only during drag**; leader line appears **only on selection**.
- [ ] Motion is continuous / cross-fade. Nothing pulses, blinks or bounces. `prefers-reduced-motion` honoured.
- [ ] Type is the one display serif (Fraunces), large + sparse — **including all chrome**; times as lining figures.
- [ ] Layout is asymmetric, lower-weighted, full-bleed. No centred hero, no centred prompt.
- [ ] **Chrome banned list holds:** no `border-radius`, no `backdrop-filter`, no `box-shadow`, no system-UI font, no centred container, no pill/ghost buttons, no toolbar `<div>` background, no hover wash.
- [ ] Chrome text colour is derived from the field and ≥ 4.5:1 contrast; focus is a hairline/underline, not a ring.
- [ ] Interactive hit targets ≥ 44 px even where the mark is a word or hairline.
- [ ] **Drift check done:** screenshots at ≥ 3 times of night; nothing reads as component-library.
- [ ] Anti-patterns absent (see below).
- [ ] Commit message references `docs/tonight-art-direction.md`.

## Anti-patterns — keep out, every phase

centred hero + CTA · 3-card / feature grids · excessive cards · giant rounded
containers · `border-radius` reflex · `shadow-lg` drop shadows · purple/blue
gradients · Tailwind indigo/violet accents · glowing blobs · glassmorphism /
`backdrop-filter` · frosted pill toolbars · generic SaaS dashboard imagery ·
excessive pills · filled-primary + ghost-secondary button pair · stock photos ·
default shadcn look · system-UI / Inter / Geist type · perfectly symmetrical
layouts · repetitive section structures.

Originality must not hurt usability: **familiar interaction patterns**
(drag to turn, a scrub, tap for detail), **distinctive** type / composition /
imagery / atmosphere.

---

## Where this is wired in (so it can't be forgotten)

- `apps/tonight/tonight.css` — header comment points here.
- `apps/tonight/tonight.js` — header comment points here.
- `apps/tonight/README.md` — "Design direction" line points here.
- `docs/tonight-build-plan.md` — "Decisions resolved" block points here.
- `PROJECT_STATE.md` — the `tonight` entries reference it.
- Every phase commit message: `(art direction: docs/tonight-art-direction.md)`.

## Decisions resolved (were "still open" in the build plan)

| # | Decision | Resolved |
|---|---|---|
| 1 | Astronomy library | **Vendor `astronomy-engine`** (in `lib/astronomy.js`, 116 KB, MIT) |
| 2 | Star catalogue depth | **Bright only**, mag ≤ 4.0 (~500 rows) |
| 3 | Turning the view | **Drag + a compass strip that only shows during drag**; on load **face due south** |
| 4 | Milky Way | **Stylised painted band** (a breath of lighter field, per Nocturne) |
| 5 | ISS data | **Committed TLE snapshot**, refreshed on deploy — keeps phase 6 Tier 1 |
| 6 | ISS timing | **Phase 6 / post-v1**, confirmed |
