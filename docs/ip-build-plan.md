# ip — build plan (v2)

Rewritten 2026-09-15 after the first attempt was rejected. Direction:
`ip-art-direction.md` (Sea Fire). Brief: `ip-brief.md`. Data:
`ip-data-research.md`.

App folder: `apps/ip/`, served at `/ip/`. Tier 1 + one CloudFront Function.

---

## What v1 of this plan got wrong

The gate was a **contact sheet** — a wall of still pictures — so it could
only ever answer "is this a nice image?". It could not answer the two
questions that actually matter:

- Does it respond, and does responding feel good?
- Is there any visible reason to stay?

And a contact sheet cannot fail the three-year-old test, because a
three-year-old was never in the room. The new gate puts them in it.

## The gate (phase 1) — one screen you can touch

**Not a page. Not the app. One screen, and two minutes of playing with it.**

`scripts/ip-play.html` — the medium, the body, and the response, with
plausible fake facts. No address, no network calls, no chrome, no copy
button, no scroll.

Exit conditions, all of them, judged by looking and touching rather than by
a checklist:

1. **It is beautiful on arrival**, before anything is touched, at the
   standard of the reference stills — not "clean", not "tasteful". If the
   first frame does not stop you, nothing later saves it.
2. **It answers the hand immediately.** Move, and light happens under the
   pointer inside ~100 ms. Press, and it blooms. Every time, everywhere on
   the screen, with no wrong moves.
3. **You keep touching it.** The honest version of the three-year-old test:
   after a minute, do you still want to poke it? If the interaction is
   exhausted in ten seconds, it fails.
4. **It holds a smooth rhythm on a real phone**, not just in a desktop
   browser. Per `real-device-testing-over-isolated-checks` — this gets
   checked on actual hardware before the phase is called done, because every
   automated check passing has already proved worthless once on this app.
5. **The still (reduced motion) is beautiful too**, and the pointer still
   lights it.

If any of those fail, the fix is here, not later. Nothing else gets built
until they all hold.

## Phase 2 — The answer, over the field

The utility, complete and shippable.

- Address large and legible over the live field, `Copy` beside it, in the
  first paint. No layout shift, no animation before the number.
- The edge function in `hosting/`: `Accept` without `text/html` → plaintext
  address straight from the edge; otherwise fall through to S3. Committed
  here, **deployed by the human**, and this is the one app that needs a
  `cdk deploy` rather than only an `s3 sync`.
- A dev stub so it runs from a plain static server.
- Contrast checked against the brightest state the field can reach behind
  the type — the field moves, so this is a real constraint, not a formality.
- Keyboard path, focus states, 320px, reduced motion, offline.

## Phase 3 — The body is yours

- The real facts drive the anatomy: prefix, ASN, holder, v4/v6.
- RIPEstat lookups fire **only** once the visitor moves past the answer, so
  an arrive-copy-leave visit talks to nobody but us.
- The measured round trip sends a mote out and back.
- **Save the image**: the still, address and date set beneath it like a
  plate, with the series mark. Same code path as reduced motion.

## Phase 4 — There is an out there

- Filaments run off the edge, one per real AS neighbour, and motes arrive
  along them from off-screen.
- Following one (scroll, pinch, drag) pulls the camera out. Your body stays
  as your marker; the address stays pinned and reachable at every depth.
- Unlit water where the data is uncertain.
- Explicitly not a globe, not a map, and not a second visual vocabulary.

## Phase 5 — The light is real

- RIS Live over WebSocket, subscribed narrowly to prefixes on screen.
- An announcement lights a filament; a withdrawal darkens one and lets it
  drift apart. Because routing actually changed, at that moment, somewhere.
- Hard rule: if nothing real is happening, no light appears. A screensaver
  version of this is worse than not having it.

## Phase 6 — Somewhere to go

- Search by name over AS holders — a bank, a university, an ISP, a country.
  Type a name, go there.
- Size alone is exhausted fast; motivation the visitor brings is not.
- Off the path: a rushed visit never routes through it.

---

## Decisions resolved up front

- **Rendering: Canvas 2D with additive compositing** (`lighter`), soft
  multi-stop sprites pre-rendered to offscreen canvases, and a particle
  budget that scales with screen size. WebGL is the escape hatch **only** if
  phase 1 cannot hit both the beauty bar and the phone floor; raw WebGL, no
  three.js, if it comes to that. Decide it in phase 1, not later.
- **Glow is drawn, not filtered.** No `ctx.filter = 'blur()'` — it is slow
  on exactly the phones that matter. Halos come from stacked sprite passes.
- **Determinism:** anatomy from real fields; an address hash seeds only
  micro-variation. Two addresses in one /24 are siblings, never clones.
- **Colour:** curated warm hues selected by ASN. Never address bytes → RGB.
- **Latency:** repeated small same-origin requests to our own edge, timed
  with `performance.now()`, median of a handful.
- **Offline:** the field, the body and the address all still work; the
  network-derived parts are simply unlit water.

## Definition of done

Per `building-a-new-app.md` §3, plus: the phase-1 gate conditions still hold
at every later phase (they are not a one-time check); contrast holds against
the field's brightest state; a real phone is used before anything visual is
called finished; and the plaintext path is verified with a real `curl`
against production after the human deploys.
