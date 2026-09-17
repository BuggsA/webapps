# ip — art direction

**STATUS: PROPOSED 2026-09-15 — Sea Fire.** Replaces the previous lock
(Cordage), which was built, looked at, and rejected. The record of that is at
the bottom, because the reasons matter more than the result.

Brief: `ip-brief.md`. Plan: `ip-build-plan.md`. Data: `ip-data-research.md`.

---

## What changed, and why

Three pieces of feedback from the human after seeing the Cordage prototype:

1. **The reference stills were right and I talked them out of them.** They
   liked those pictures. They show beauty immediately. I argued they were
   close to the AI-render median and wrote a banned list that removed bloom,
   glow and luminous depth — which is most of what makes them good. Beauty
   was goal number one in their own document and I optimised for *not looking
   like the median* instead, which is a weaker goal and produced something
   thin.
2. **There was nothing to do.** A generative portrait is a picture. You look
   once.
3. **Discovery wasn't clear.** Everything past the answer was below the fold
   with no visible signal that it existed.

And the test that reframes all of it:

> **If a three-year-old finds it interesting, it is probably doing its job.**

That is not a softer bar than "a network engineer respects it". It is a
*harder* one, and it rules out most of what I did. A three-year-old does not
read, does not scroll to find things, and does not care what an ASN is. What
holds them is **cause and effect**: I touched it and something happened,
immediately, and it happens every time, and it is never wrong.

## The thesis

**Light is what happens when something moves through.**

In real water, bioluminescent plankton light up when they are disturbed —
a wake, an oar, a hand. The light is not decoration on the movement; the
light *is* the movement, made visible. Cornish fishermen called it sea fire.

That gives one mechanic that serves everyone at once:

- **A three-year-old:** you move your hand and the dark lights up under it.
  Nothing to learn, no wrong moves, works everywhere on the screen, works on
  the hundredth try.
- **Someone who stays ten seconds:** the light that just bloomed over
  *there* — nobody touched that. Something else moved through.
- **A network engineer:** that flare was a real BGP announcement, and the
  thing in the middle is their own prefix.

Same material, same vocabulary, three depths. Nothing is a metaphor: real
traffic really does move through, and the app's rule is that movement makes
light.

## References (non-web)

- **Noctiluca / dinoflagellate bloom** — the primary one. Dark water, a
  bright wake where anything passes, light that fades after a few seconds.
- **Deep-sea siphonophores** — a filamentary body that is mostly empty
  space, with light travelling *along* the filaments rather than sitting on
  them.
- **A plasma lamp**, for the interaction only: filaments that reach toward a
  finger on the glass, instantly and every time.
- The human's own four stills, for the register: near-black field, one
  luminous body, cool filaments with warm points in them, enormous empty
  space, a display serif for the numerals.

## The spec

1. **The answer first, and it never moves.** Address set large and legible,
   `Copy` beside it, in the first paint, over the field. Nothing about the
   light is allowed to make it harder to read.

2. **The body is already there.** Composed deterministically from the
   address and its network, alive in the first frame. No entrance, no
   assembly, ever.

3. **Everything responds to the pointer, everywhere.** Not a hit target — the
   whole screen. Filaments lean toward the cursor or finger; the medium
   lights where it passes; faster movement makes more light. Response is
   under ~100 ms, or it fails the test.

4. **Press and it blooms.** A touch sends a pulse outward along the
   filaments, which reach the ends and come back. Repeatable forever,
   satisfying every time, never a mode, never a state to get out of.

5. **Real light comes in from outside.** Motes arrive along filaments from
   off-screen, from real routing events. This is the discovery cue and it
   needs no words: *something out there is doing that, so there is an out
   there.*

6. **Discovery is visible, not buried.** Filaments run off the edge of the
   frame. Following one — scroll, pinch, drag — pulls the camera out along
   it. The affordance is a thing on screen pointing outward, not a scroll
   hint below the fold.

7. **Light has a hot core and a huge faint halo, at once.** (The lesson from
   `until-redesign.md`: one radial gradient reads as a pasted PNG.) Every
   luminous thing is at least three stops — tight bright core, mid falloff,
   wide dim halo — with a warm-to-cool shift from core to edge, drawn
   additively, with grain riding on top.

8. **Depth of field.** Things far away are larger, softer and dimmer; things
   near are small and sharp. This is what makes a flat canvas read as a
   volume, and it is most of the difference between the stills and my last
   attempt.

9. **Colour.** Deep blue-black water, cool cyan-white filaments, warm gold
   at the points where light is strongest. The **network's own colour** is
   the hue of its warm points, chosen from a curated set by ASN — so your
   provider has a colour and keeps it, and two addresses on one network are
   visibly the same species.

10. **Reduced motion is a still, and it is beautiful.** The field settles
    into a composed frame, the pointer still lights it locally (that is a
    response, not an animation), and nothing drifts on its own.

## What the data drives

Unchanged from the previous pass — this part was never the problem:

| Fact | In the picture |
|---|---|
| Your address | the bright core |
| Announced prefix | the body it sits in |
| Containing block | the dim surround, larger than the frame |
| ASN | anatomy: filament count, branching rhythm, warm hue |
| Others on your network | visibly the same species |
| IPv4 / IPv6 | 4-fold vs 6-fold symmetry |
| Measured round trip | a mote leaves, reaches the dark, returns |
| Jitter | how steady the drift is |
| AS neighbours | filaments running off-frame, one per neighbour |
| Announcement / withdrawal | a filament lights up, or goes dark and drifts apart |
| Published uncertainty | unlit water — fog, not a guess |

## Banned

- **No entrance animation.** Still the most important structural rule.
- No `border-radius`, no `backdrop-filter`, no `box-shadow` on chrome.
- No system-UI / Inter. Chrome is the display serif (Fraunces, self-hosted).
- No globe, no map, no geography.
- No purple-to-blue SaaS gradient, no filled-pill CTA, no centred card.
- No icon set, no legend, no tutorial, no modal, no onboarding.
- **No motion that is not caused by either the visitor or a real event.**
  Ambient drift is allowed only as the medium settling; nothing pretends to
  be data that isn't.
- No text that explains the picture before the visitor has touched it.

## Considered and rejected

- **Cordage** (Asawa's hanging wire, quipu; containment as suspension, the
  address as a knot). Built as `apps/ip/lib/form.js` and rejected on sight.
  It was a line drawing — no material, no light, no volume — and being a
  static portrait, it gave a visitor nothing to do. The *data mapping*
  underneath it was sound and is carried over wholesale. Kept in git history
  at commit `4cdd4d0`; the code comes out of `apps/ip/` when Sea Fire's gate
  passes.
- Suminagashi, Chladni, Watermark, Daylight Register — the other three from
  the first pass, all of which share Cordage's fatal property: they are
  images, not things you can touch.
