# ip — build plan

Six phases, each independently viewable. Every phase commit references
`ip-art-direction.md` (LOCKED: Cordage). Brief: `ip-brief.md`. Data and
architecture: `ip-data-research.md`.

App folder: `apps/ip/`, served at `/ip/`. Tier 1 + one CloudFront Function.

---

## Decisions resolved up front

- **Rendering:** Canvas 2D, no WebGL, no library. The form is a few hundred
  polyline points per cage — cheap enough for the phone floor, and line
  quality is the whole direction.
- **Determinism:** structure comes from real fields (prefix length, depth of
  containment, ASN, v4/v6); a small hash of the address seeds only the
  *micro* variation (which way a cord sags, where a strand crosses). Two
  addresses in one /24 look like siblings, never like the same object.
- **Colour:** a fixed table of natural-dye values in OKLCH; the ASN selects
  one by index. Never computed from address bytes.
- **Latency measurement:** repeated small same-origin requests to our own
  edge path, timed with `performance.now()`, median of a handful. Real
  measurement, no third party, no packet fiction.
- **Lookup timing:** nothing is fetched from RIPEstat until the visitor
  moves past the answer (`ip-data-research.md` §5). An arrive-copy-leave
  visit talks to nobody but us.
- **Offline:** with no network at all the page still renders the address (it
  came with the page's own fetch from our edge) and a form built from the
  address alone, with the network-derived parts fraying into fibre —
  uncertainty is already the language, so the degraded state is a designed
  state, not an error.

---

## Phase 1 — The gate (no page)

The human's own document is right that this decides everything: **the
generator must never be ugly**, not "usually beautiful".

- `apps/ip/lib/form.js` — pure, no DOM: `(facts) -> geometry`, where facts
  are `{ addr, version, prefixLen, blockLen, asn, rttMs, jitterMs,
  uncertainty }`.
- `apps/ip/lib/dyes.js` — the curated palette + the ASN → dye selection.
- `scripts/ip-contact-sheet.html` — a harness, not a page: N forms in a
  grid, seeded from a corpus that deliberately includes the extremes (a /8
  and a /29; 3 ms and 400 ms; v4 and v6; one containment level and five;
  fully uncertain and fully known).
- Look at the **worst** cell, not the best one. The sparsest structure must
  be as good as the richest.

**Exit condition:** the worst cell on a sheet of a few thousand is still
something you would be glad to be shown. If it is not, stop and say so
rather than proceeding — that is what this phase is for.

## Phase 2 — The answer

The utility, complete and shippable on its own.

- `apps/ip/index.html` + `ip.css`: address set large at the optical margin,
  `Copy` as an underlined word, the register beneath it, the series plate.
  First paint has no animation and no layout shift.
- The edge function (`hosting/`): `Accept` without `text/html` → plaintext
  address; otherwise fall through to S3. `Cache-Control: no-store` on the
  generated response. Written and committed here; **deployed by the human**,
  and this is the one app that needs a `cdk deploy`, not just an `s3 sync`.
- A local dev stub so the page works opened from a plain static server.
- Full keyboard path, focus states, 320px, reduced motion, offline.

## Phase 3 — The form, live

- The phase-1 generator on the real page, composed in the first frame.
- RIPEstat `network-info` + `prefix-overview` for prefix, origin ASN and
  holder — fired only once the visitor moves past the answer, cached in
  `localStorage` with a long TTL.
- The measured round trip drives the pulse; jitter drives the sway.
- **Save the image**: the still form, address and date set beneath it like a
  plate, with the series mark. The reduced-motion still is the canonical
  frame, so this is the same code path.

## Phase 4 — The pullback

- Camera moves out; the visitor's form stays as their marker.
- `asn-neighbours` brings other cords into view, tied into yours. The
  published `uncertain` count decides how much of the view frays.
- Same material at every zoom — no second vocabulary, no globe.
- The address stays pinned and reachable at every depth.

## Phase 5 — The rewiring

- RIS Live over WebSocket, subscribed **narrowly** to prefixes currently on
  screen — never the firehose.
- An announcement ties a cord on; a withdrawal cuts one. Because routing
  actually changed, at that moment, somewhere.
- Hard rule: if nothing real is happening, nothing moves. A screensaver
  version of this is worse than not having it.

## Phase 6 — Landmarks and search

- Search by name over AS holders — a bank, a university, an ISP, a country.
  Type a name, go there.
- This is the layer that gives the space somewhere to go. Size alone is
  exhausted fast; motivation the visitor brings with them is not.
- Explicitly off the path: a rushed visit never routes through any of it.

---

## Definition of done

Per `building-a-new-app.md` §3, plus: the art-direction checklist passes at
sparse/rich, fast/slow and v4/v6; the reduced-motion still is inspected
beside a moving frame; the form holds a smooth rhythm on a cheap Android;
and the plaintext path is verified with a real `curl` against production
after the human deploys.
