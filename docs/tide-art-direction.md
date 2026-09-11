# Tide — art direction

**STATUS: LOCKED 2026-09-10 — Under the Moon**, with the two borrows below.
Picked by the human on the recommendation. Every phase commit references
this file. The four unpicked candidates are kept as one-liners under
"Considered and not taken".

Process per `building-a-new-app.md` §2b: diverge wide first, non-web
references, no named genres, then converge.

---

## The five candidates

### 1. Under the Moon — motion / structure-led (RECOMMENDED)

*Reference:* the Earth as seen from the moon in the Apollo 8 and 11
photographs, and the Lunar Reconnaissance Orbiter "Earthrise" frame; the
slow, unbothered rotation of a planet seen from something that is pulling
on it.

The camera is the moon. The globe is always shown from the **sub-lunar
point**: the moon is behind the viewer, the tidal bulge faces the viewer,
and the Earth turns beneath it once a day. The tide wave is therefore not
"animated" — it is what you see when a planet rotates under a bulge that
stays put. Drag turns the globe *away* from the moon's view and it eases
back when released (a gentle spring, ~4 s), so the picture always returns
to the physics. Zooming toward your coast is the only time the camera
leaves the sub-lunar frame. The moon itself appears only as light: a
soft, warm-neutral, phase-correct illumination on the near limb, and a
small true-phase disc at the top edge as an anchor. Utility lives in one
corner as an **instrument readout** — numerals first, words second.

Why: the physics *is* the composition, so the thesis ("the tide is the
moon, made visible") is delivered by the camera, not by a caption. And it
is structurally different from Tonight (horizon, from the ground, looking
up) — Tide is a planet, from the moon, looking down.

### 2. Harbour Table — structure-led (breaks the globe-hero rule)

*Considered.* The printed tide table as an object (Admiralty Tide Tables, Swiss timetables); globe as a stamp-sized inset. Lent the readout discipline.

### 3. Sounding Chart — colour-led

*Considered.* Nautical-chart conventions carried whole (buff land, depth bands, soundings). A genre with a median; not taken.

### 4. Cyanotype — texture-led, single hue

*Considered.* Anna Atkins' 1843 cyanotypes: one Prussian-blue ground, white light, value carries all. Lent "value carries height".

### 5. Strandline — rule-breaker

*Considered.* The page as a beach in section, the water line as the interface. Lent the rising/falling hairline only.

---

## Recommendation and two borrows

**Direction: Under the Moon (1).** Two borrows, in the Tonight tradition:

- **From Harbour Table (2): the readout discipline.** The place card is
  set like a table row, not like a card: tabular numerals, a hairline
  above, unit as a small cap after the number, one line per fact. No box.
- **From Cyanotype (4): value carries height.** The tide field is *one
  sea hue at varying luminance*, never a colour scale. High water is
  lighter, low water darker, the wave is a band of brightness travelling.
  This keeps the globe from looking like a data visualisation.

Direction 5 lends one behaviour only: when the readout says "rising", the
hairline above the numbers drifts upward a few pixels over the next hour;
"falling", downward. Nothing else moves in the chrome.

---

## The spec (Under the Moon) — ten points

1. **Camera.** Orthographic projection on Canvas 2D, centre = sub-lunar
   point (recomputed every frame from `astronomy-engine`). Drag rotates
   with inertia; release eases back to the sub-lunar frame over ~4 s
   (cubic ease-out). Zoom (scroll / pinch / double-tap) scales the
   projection toward the chosen coast and suspends the ease-back until
   the user zooms out or taps the moon disc.
2. **Sea.** Each ocean cell's height η(t) from the shipped constituents.
   Rendered as luminance of one sea hue on a 1° grid, bilinearly smoothed
   at draw time; no contour lines, no arrows, no colour scale. Amplitude
   is also felt: cells with large range have a wider luminance swing than
   cells with small range, so the Bay of Fundy visibly breathes harder
   than the Mediterranean.
3. **Land.** A matte, low-chroma silhouette derived from the sea hue (see
   Palette), no borders, no labels at globe scale. At coast zoom, the
   50m coastline appears as a hairline and the nearest place names are
   set in the readout, not on the map.
4. **Light.** Day–night from the sub-solar point: a soft terminator with
   a warm edge on the day side. Moonlight: a faint warm-neutral lift on
   the sub-lunar hemisphere's limb, phase-correct (new moon → almost
   none). No atmosphere ring, no specular highlight, no starfield.
5. **The moon.** A small disc at the top centre, true phase, true libration
   not required. Tapping it resets the camera. It is the only icon.
6. **The readout.** Top-left (safe-area aware): place name; "Falling · low
   in 2 h 10"; the next four turning points as rows (`14:10  low  −1.8 m`);
   range today; spring / neap; sunrise, sunset, moonrise, moonset. Source
   line in small type: "NOAA · Boston Harbor" or "model estimate ·
   Open-Meteo". Hand-off line last.
7. **Time.** A hairline scrub across the bottom, −3 d … +15 d, the present
   marked; a single play/pause word. Playing runs the globe at 1 h/s and
   the readout follows. Reduced motion: no autoplay, scrub updates
   discretely.
8. **Chrome.** Words written onto the field. No boxes, blur, shadows or
   radii. Fraunces for words; tabular numerals in Space Grotesk (both
   already licensed and hosted in-repo). Sizes from a 1.25 modular scale
   off 16 px.
9. **Texture.** A single, deliberate film grain over the whole frame
   (as Tonight, different seed) and *no other texture*. The sea's
   smoothing is the softness; do not add noise to it.
10. **Sound (post-v1 only).** If ever added: one slow tone following your
    place's height, off by default. Nothing on load, nothing on tap.

## Palette — derived, not picked

- **Sea hue:** anchor at the spectral colour of deep clear water, OKLCH
  hue ≈ 235°, chroma 0.08. Luminance maps height: L = 0.22 + 0.30 ·
  (η − η_min) / (η_max − η_min) per cell, then through a film-style
  shoulder so highs bloom slightly rather than clip.
- **Land:** same hue rotated +25°, chroma 0.02, L 0.16 (night) → 0.30
  (day). It must never be lighter than high water.
- **Moonlight lift:** add L +0.05 with a hue shift toward 80° (warm
  neutral), scaled by illuminated fraction.
- **Type:** L 0.93 warm neutral on the field; secondary L 0.70. Contrast
  checked against the *brightest* sea state behind it (high water in
  daylight), not the average.
- **One accent:** the present-time mark on the scrub and the "now" row:
  sea hue rotated 180°, chroma 0.10, L 0.75. Used nowhere else.

## Banned list (hard rules; in the per-phase checklist)

House list (`building-a-new-app.md` §2b) plus, specific to Tide:

- No colour scale on the field (no viridis/turbo/rainbow, no legend).
- No glossy 3D globe: no atmosphere glow ring, no specular highlight, no
  satellite-imagery texture, no starfield behind the Earth.
- No tide-clock dial skeuomorph; no wave icons; no anchor/boat clip art.
- No chart gridlines, axis labels, or "dashboard" tiles on the readout.
- No blue-gradient hero, no card with a shadow for the place.
- No labels drawn on the globe at planet scale.
- Nothing pulses, glows, or bounces to attract attention.

## Per-phase design checklist

- [ ] Camera is on the sub-lunar point at load; ease-back works; zoom
      suspends it; the moon disc resets it.
- [ ] Field reads as *light on water*, not as a heat-map. Squint test:
      you should see a bright band moving, not colours.
- [ ] Land is always darker than high water in the same light.
- [ ] Readout is rows, not a card; numerals tabular; unit small-cap.
- [ ] Source line and hand-off line present on every place state.
- [ ] Text contrast ≥ 4.5:1 against high-water-in-daylight behind it.
- [ ] `prefers-reduced-motion`: no ease-back animation (snap), no autoplay,
      no ambient breathing; scrub still works.
- [ ] ~320 px: readout stacks above the globe, scrub stays reachable,
      hit targets ≥ 44 px.
- [ ] Nothing in the banned list is present. Nothing reads as a component
      library default.

## Considered and not taken

Harbour Table, Sounding Chart, Cyanotype, Strandline — see above; each
contributed at most one borrow.
