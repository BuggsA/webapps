# Tonight — Art Direction (LOCKED 2026-09-06)

**Read this before touching any visual code in `apps/tonight/`. Every phase
commit must reference this file. If a change can't be squared with the
per-phase checklist below, stop and re-read — don't drift.**

Chosen from five directions (Field Notes / Instrument / Nocturne / Broadsheet /
Signal). Full brief in the session that produced this; the decision and the
operative parts are captured here so nothing is lost between phases.

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
4. **Colour** — the entire screen is one continuously computed **OKLCH** vertical
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

## Per-phase design checklist

Run this before every phase commit. All must hold (or be explicitly N/A for
that phase's scope):

- [ ] On-screen colour is **derived** from sun altitude in OKLCH — not picked from a palette.
- [ ] **No hard horizon line** — horizon reads as a seam / temperature change.
- [ ] Grain present: static, low-opacity, baked (not animated).
- [ ] Bloom **only** on moon / planets / brightest stars — additive, soft, low-alpha. No glow blobs.
- [ ] Chrome is minimal, bottom-weighted, translucent. Nothing persistent mid-screen.
- [ ] Graticule appears **only during drag**; leader line appears **only on selection**.
- [ ] Motion is continuous / cross-fade. Nothing pulses, blinks or bounces. `prefers-reduced-motion` honoured.
- [ ] Type is the one display serif, large + sparse; times as lining figures.
- [ ] Layout is asymmetric, lower-weighted, full-bleed. No centred hero.
- [ ] Anti-patterns absent (see below).
- [ ] Commit message references `docs/tonight-art-direction.md`.

## Anti-patterns — keep out, every phase

centred hero + CTA · 3-card / feature grids · excessive cards · giant rounded
containers · purple/blue gradients · glowing blobs · glassmorphism · generic
SaaS dashboard imagery · excessive pills · stock photos · default shadcn look ·
generic Inter/Geist type · perfectly symmetrical layouts · repetitive section
structures.

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
