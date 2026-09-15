# ip — art direction

**STATUS: LOCKED 2026-09-15 — Cordage**, with the two borrows below. Picked
by the human on the recommendation, after a five-direction pass per
`building-a-new-app.md` §2b. Every phase commit references this file.

Brief: `ip-brief.md`. Data: `ip-data-research.md`.

The four reference stills the human supplied are **mood, not direction**
(their call): they set the register — calm, one thing in a large empty
field, display serif numerals, wide-tracked micro-caps, nothing decorative.
They are *not* the palette or the rendering, and the near-black + blue bloom
+ particle bokeh they share is on the banned list below.

---

## The thesis

**Your address is a knot, tied in a cord, that hangs from heavier cords.**

Address space is nested intervals — your address sits in a /24, inside a
/16, inside an IANA block — and containment is drawn as *suspension*. The
networks that carry you are cords tied into yours. Routing changing is cord
being tied on and cut. Every relationship in the picture is one the data
actually publishes.

Structurally this is the first app in the series made of **line** rather
than light: `tonight` is a colour field, `tide` is a luminance field, this
is edges, tension, weight and shadow.

## References (non-web, keep these in view)

- **Ruth Asawa's hanging looped-wire sculptures** — the primary one. Nested
  lobes suspended inside other lobes, read as line and overlap rather than
  as mass, with the cast shadow doing half the work.
- **Andean quipu** — a real information system whose entire content is cord,
  ply, knot and position.
- **Anni Albers, *On Weaving*** — structure as the subject.
- **Standing rigging**: splices, whippings, the way load is carried.

Not: nautical décor, macramé, hemp texture, knot-tying diagrams.

---

## The spec — ten points

1. **The form is already there.** Composed deterministically from the
   address and its network, drawn in the first frame. No entrance sequence,
   no assembly, no reveal, ever — on any visit, including the first. The
   visitor finds it there the way a window is already full of weather.

2. **Containment is suspension.** Outermost cage = the IANA block;
   inside it the announced prefix; inside that the /24 (or the v6
   equivalent); innermost, the address itself as a single small knot in the
   one dyed colour its network owns. Prefix length sets cord diameter — a
   /12 is a rope, a /29 a thread.

3. **Cord make carries ancestry.** Ply count, twist rate and dye are
   derived from the ASN, so every address on the same network is tied in
   cord of the same make. A cluster is readable as related species before
   any label explains why. IPv4 is 4-strand, IPv6 is 6-strand — honest, and
   legible once you know.

4. **Motion is a measurement.** Nothing moves unless a real number moved it.
   A pulse travels down the cord, reflects off the fixed end and returns;
   its period is the actual measured round trip. Jitter makes the sway
   irregular rather than metronomic. There is no idle animation anywhere,
   and no animation whose duration was chosen by a designer.

5. **Value carries everything.** One ground, cords read as light against it,
   one dyed accent that belongs to your network. Depth comes from line
   weight and opacity (strands nearer the front read heavier and brighter),
   never from blur or bloom.

6. **Uncertainty frays.** Where the data stops being certain — RIPEstat
   publishes an `uncertain` neighbour count, and it is usually large — the
   cord stops being cord and frays into unspun fibre. Unknown regions are
   drawn as fibre, not as a guess and not as an error state.

7. **The answer is chrome, not composition.** The address is set large at
   the optical margin, never centred, never in a box, with `Copy` as an
   underlined word. It stays reachable at every depth. The register beneath
   it — prefix, holder, distance — is set as printed type, one line per
   fact, hairline above.

8. **The pullback keeps the material.** Zooming out does not switch to a
   different visual language. Your form stays as your marker; other cords
   come into view tied into yours. No globe, no map, no second vocabulary
   for the environment.

9. **Texture.** One deliberate film grain over the whole frame (as
   `tonight` and `tide`, different seed) and *no other texture*. No fibre
   detail, no paper photography, no noise on the cords themselves.

10. **Reduced motion is a still, not a downgrade.** The pulse stops and the
    sway freezes at a composed phase. The frame that results must be as good
    as any moving one — it is what gets saved as the image, so it is the
    canonical view, not the fallback.

## Palette — derived, not picked

**Natural dyes.** Madder, weld, indigo, cochineal, walnut, logwood, oak
gall, safflower — roughly a dozen colours that have been put next to each
other on cloth for two thousand years, which is a stronger guarantee against
clashing than any generated scheme.

- The dye is **selected by ASN** from that curated set, never computed from
  address bytes mapped to RGB. Your provider gets a colour and keeps it.
- **Ground:** a deep, warm, near-neutral — dyer's vat, walnut ink.
  Explicitly **not** blue-black, so this is not a third dark-blue field in a
  series of four.
- **Cords:** raw linen, off-white, low chroma. Only the knot is dyed.
- Every text colour is checked ≥ 4.5:1 against the worst-case ground behind
  it, as in `tonight`.

## Banned (hard rules — in the per-phase checklist)

- **No bloom, no volumetric glow, no particle bokeh, no lens flare.** This
  is the single most important line in the file: it is what separates the
  app from the reference stills' median, and the pull toward it will be
  constant.
- **No blue-to-violet gradient.** No indigo/violet as the ground.
- **No `border-radius`** on any control or container. **No
  `backdrop-filter`/blur. No `box-shadow`.**
- **No system-UI / Inter / Geist.** All chrome is the display serif
  (Fraunces, already self-hosted in `until` and `tonight`, SIL OFL).
- **No centred hero stack**, no pill buttons, no filled-primary + ghost-
  secondary pair, no toolbar `<div>` with its own background, no hover
  background wash.
- **No globe, no world map, no geographic layout of any kind.**
- **No animation not driven by a measured number**, and no entrance
  animation of any kind.
- **No nautical or craft iconography.** If a sketch reads as a craft blog,
  the drawing is wrong — fix it before committing.
- **No claim that the AS-path is the path the packets took.**

## Voice

Sparse and documentary. `7 networks carried this here.` `24 ms away.`
`193.0.0.0/21 · announced by AS3333`. Never "Your connection traveled
across 7 networks!", never two abstract nouns, never an exclamation mark.
Say what is true, plainly, and let the visitor infer the rest.

## Accessibility floor (so "beautiful" never breaks "usable")

Real semantic elements; keyboard operable; focus as a hairline/underline
state, not a rounded ring; hit targets ≥ 44px even where the mark is a word;
a complete `prefers-reduced-motion` path (point 10); text ≥ 4.5:1; ~320px up
with no horizontal body scroll; `viewport-fit=cover` + safe-area insets.

## Per-phase checklist

- [ ] No bloom / glow / bokeh / flare anywhere in the frame.
- [ ] Banned chrome list holds (radius, blur, shadow, system font, centred
      stack, pill buttons, toolbar div, hover wash).
- [ ] Colour came from the curated dye set via ASN — not from address bytes.
- [ ] Every moving thing traces back to a measured number; nothing animates
      on load.
- [ ] Reduced-motion still frame inspected and as good as the moving one.
- [ ] Text ≥ 4.5:1 against the worst-case ground; focus is a hairline.
- [ ] **Drift check:** render at ≥ 3 very different inputs (sparse/rich,
      fast/slow, v4/v6) and ask out loud — *does any part of this look like
      it came from a component library, or like an AI render?* Name it and
      fix it before committing.

---

## Considered and not taken

- **Suminagashi** — colour-led, one ink; nested rings as containment,
  neighbouring drops deforming them. Best floor of the five. Lends the floor
  guarantee: one ground, one ink, value carries everything.
- **Chladni** — motion-led; sand on a bowed plate driven by real latency.
  Weak floor (low modes are dull) and the physics would have been simulated
  rather than represented. Lends "motion is a measurement".
- **Watermark** — texture-led; the form is in the sheet, seen only by
  transmitted light. The only direction that made uncertainty the main
  material. Lends point 6.
- **Daylight Register** — the rule-breaker: white sheet, no picture, the
  real names set as type. Fails the brief's own beauty test on purpose.
  Lends the register typography and the plate under the saved image.
