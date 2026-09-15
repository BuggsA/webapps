# ip

A "what's my IP?" page that answers in the first frame, and — for anyone who
stays — shows the address as a position inside a real, live, published
structure.

Fourth app in the series, after `until`, `tonight`, `tide`.

- **Brief:** `../../docs/ip-brief.md`
- **Design direction:** `../../docs/ip-art-direction.md` (LOCKED: Cordage).
  Read it before touching anything visual.
- **Build plan:** `../../docs/ip-build-plan.md`
- **Data + architecture:** `../../docs/ip-data-research.md`

## Status

**Phase 1 of 6 (the gate) complete.** There is no page yet — only the
generator and its harness:

- `lib/dyes.js` — the natural-dye palette in OKLCH, selected by ASN.
- `lib/form.js` — `facts -> geometry -> canvas`. Pure, no DOM, no network.
- `../../scripts/ip-contact-sheet.html` — the gate harness (dev only, and
  deliberately outside this folder so it is never synced to production).

Phase 2 is the answer itself. Nothing here is deployed.

## The form

Your address is a knot, tied in a cord, that hangs from heavier cords.
Containment is drawn as suspension: the announced prefix is the object you
look at, and the blocks containing it are drawn larger than the frame and
crop, because you are inside them and cannot see all of one. Prefix length
sets cord diameter; the ASN sets cord make (ply, twist, dye), so everyone on
one network is tied in cord of the same make; IPv4 is 4-strand and IPv6
6-strand; where the data stops being certain, the cord frays.

Motion is only ever a measurement: a pulse travels down the cord, through
the form and back, with the period of the real round trip (dilated by a
constant so it is watchable — the ratios stay true), and the sway amplitude
is the measured jitter.

## Running the harness

Serve the repo root and open `/scripts/ip-contact-sheet.html`:

```
python -m http.server 8766 --directory <repo>
```

Modes: extremes sweep, random sample, sparsest-only (the floor), and one
network many addresses (ancestry). Click a cell to inspect it full-window.
Look at the worst cell, not the best one.

## Cost

$0. No build step, no dependencies, no backend. Planned runtime network
calls (phase 3+), all keyless and CORS-open:

- our own edge, for the address itself and the latency measurement;
- `stat.ripe.net` for prefix / ASN / holder / neighbours, cached in
  `localStorage`, and **not called at all** until the visitor moves past the
  answer;
- `wss://ris-live.ripe.net` for live routing changes (phase 5).

One paid line item when it ships: a CloudFront Function at ~$0.10 per
million invocations.

## To remove

```
aws s3 rm s3://<bucket>/ip/ --recursive
```

Then delete `apps/ip/`, `scripts/ip-contact-sheet.html`, the `ip` entry on
the landing page, and — unlike every other app in this repo — the
CloudFront Function and its cache behaviour from `hosting/`, followed by a
`cdk deploy`.
