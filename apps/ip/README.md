# ip — what's my IP

Your public IP address, in the first frame, on a page that asks nobody else
for it.

Fourth in the series. Lives at `https://<distribution>/ip/`.

---

## What this is trying to achieve

Somebody arrives wanting a number. They should have it in the first frame,
from our own edge, with nothing in front of it — no banner, no consent, no
tutorial. That promise is the floor and it is never traded for anything.

Then, **if they want it**, the rest: the address space around them is real,
enormous, and explorable, and almost nobody has ever seen it drawn. The aim
is that somebody who came for a number leaves having felt something true
about the internet — that it is mostly empty, that people built it by hand,
that it runs on trust that has been broken and holds anyway.

Three things make that hard, and they are the whole design problem:

- **It has to be true.** Every mark is a real allocation at a real position.
  Nothing is invented to make the picture better. The beauty is not applied
  afterward — it is what a truthful diagram of this data looks like when it
  is drawn carefully, in the dark, with enough space around it.
- **It has to be worth exploring**, not just worth looking at once. That
  means the open-world loop: see something from here, go to it, find
  something, and from there see the next thing.
- **It has to work for two readers at once** — somebody who has never heard
  the word *prefix*, and somebody who has run networks for thirty years —
  without the second one feeling patronised.

It is an **instrument, not an illustration**: one surveying device with a
home position, and moving the scale moves the instrument rather than the
world.

### Where the thinking lives

| | |
|---|---|
| what the product IS, and must not become | [`../../PRODUCT_SOUL.md`](../../PRODUCT_SOUL.md) |
| the plan | [`../../docs/ip-plan-v2.md`](../../docs/ip-plan-v2.md) |
| why exploring it feels the way it does | [`../../docs/ip-exploration-research.md`](../../docs/ip-exploration-research.md) |
| what story the history can actually tell | [`../../docs/ip-story-research.md`](../../docs/ip-story-research.md) |
| the emotional arc, and what breaks it | [`../../docs/ip-emotional-design.md`](../../docs/ip-emotional-design.md) |
| the guide's voice | [`../../docs/ip-guide-voice.md`](../../docs/ip-guide-voice.md) |
| writing for both readers | [`../../docs/ip-two-audiences.md`](../../docs/ip-two-audiences.md) |

- **Story:** [`../../docs/ip-narrative-and-outline.md`](../../docs/ip-narrative-and-outline.md)
- **Design direction:** [`../../docs/ip-art-direction.md`](../../docs/ip-art-direction.md) — "Survey"
- **Plan:** [`../../docs/ip-build-plan.md`](../../docs/ip-build-plan.md)
- **Data + architecture:** [`../../docs/ip-data-research.md`](../../docs/ip-data-research.md)

---

## Status

**Phases A and B of [`ip-plan-v2.md`](../../docs/ip-plan-v2.md) are built and
live**, on top of phases 1-4.5 of the original plan. Phase C is half done —
the notebook is in, the celebration and the tracker are not. Phase D, the
guide's lines, is being written; `content/guide.json` holds the first
forty-two and nothing loads them yet.

**Much of what follows this line was written during phase 4 and describes
that.** It is kept because it is accurate about how those pieces work, not
because it is a current inventory. For that, see
[`../../CURRENT_STATE.md`](../../CURRENT_STATE.md).

Phase 1 put the address on the page. Phase 2 replaced how the picture is
drawn. Phase 3 added the first thing worth travelling to: the block your
address is actually announced inside. Phase 4.5 step 1 made the axis as deep
as the address family really is. Phase 4 made it somewhere you can **go**.
There is still no network map, no neighbours, no registry tables, no
landmarks, no generated tier, no inward half and no saved image — the rest of
phases 4-7, each built and looked at on its own.

What is here:

- the address, in the first paint, as a real element, first in the focus
  order, with `Copy`
- the chassis every later state will be drawn through — ground plate, polar
  reticle, tick scale, plumb axis — and the one amber mark at the origin,
  which is you
- **the renderer**: raw WebGL2, no library. Feathered depth-aware lines, tight
  round points, a glossy floor by planar reflection, a ground light pool, HDR
  accumulation, a five-level bloom chain, ACES, vignette and grain. The camera
  answers the pointer.
- **a Canvas 2D fallback** for the ~2% without WebGL2. Same scene data, drawn
  flatly and correctly. Force it with `?renderer=2d`.
- **the scale axis**: one continuous value, wheel / drag, arrows and
  PageUp/PageDown for the keyboard. (**Pinch is not implemented** -- this
  line claimed it for months and was wrong.) It is *held, not stepped* — it does not
  snap, because direct manipulation is what makes scale feel like something
  in your hand.
- **the announced block**: the prefix as a field of marks, your address the
  one amber mark at its real index, with a leader out to it. Real data from
  RIPEstat, deferred until you move off Home, cached for a week.
- **the address space itself**, as a LADDER of 12-bit rungs running from the
  visitor's own address out to the whole of their family's space. Every cell
  named by arithmetic, no lookup made or implied, and the ones nobody has
  asked about say so.
- **landmarks.** Places worth finding, lit without being asked about and
  named when you reach them: the 268 million addresses reserved in 1981 and
  never used, the 16 million that all mean *here*, the addresses that exist
  only in documentation, the public resolvers, and all thirteen root
  servers in both families. Every entry is an RFC fact or an address its
  operator published, so none of it needs a lookup — and where a landmark
  has a holder, the holder is still earned by the same lookup as any other
  block. The root addresses come from the IANA root hints, not from memory.
- **arriving.** A click flies the instrument to the chosen place and settles
  on whatever network is really announced there. The pointer and one line of
  copy say the gesture exists, until you have used it once.
- **travel.** Choosing a block does not label it, it goes there. The block
  takes the origin, the ladder re-anchors to it, and your own address becomes
  a place somewhere else with the distance said plainly — *"2,936,014,475
  addresses from yours · a different network from yours"*. Amber is only ever
  you, so travel somewhere your address is not and there is no amber in the
  frame at all. `Back` retraces, `Home` returns, and lateral travel (drag
  sideways, or the arrow keys) walks the aim along the address line — through
  container boundaries rather than into them, because a wall is what makes a
  thing a slide deck.
- **the real depth of the family.** The axis used to stop at 3 for everyone,
  because 3 is what IPv4 needs. It is now 2.67 steps for IPv4 and **10.42 for
  IPv6** — which is not an effect, it is the size difference walked. An IPv6
  visitor descends ten rungs, framing their own `/64` and `/48` on the way, to
  `2000::/3`. Four layer slots are recycled as a ring, so a ten-rung ladder
  costs exactly what a two-rung one does. The rail rescales to match and
  carries a tick per rung, with a wider one for the announced block.
  Why, and the measurements: [`ip-infinity-research.md`](../../docs/ip-infinity-research.md).
- the CloudFront Function that reads the address at the edge
- the honest state for when that function is not there

The scene is renderer-agnostic data (lines, points, ground pools in world
units), so every later phase adds geometry once and both paths get it.

**Why WebGL2 and not Canvas 2D**, which is what the brief originally said:
[`ip-render-research.md`](../../docs/ip-render-research.md). Short version —
line width is capped at 1px and a bloom chain is not affordable in Canvas 2D,
so the light in the reference stills is unreachable from there. The brief and
the house rules were both amended, on the record, rather than worked around.

The full story is designed and written down. It is not built. Do not treat
the docs as a description of this folder.

## What it asks for

**One request, to our own edge.** `GET ./whoami`, answered by a CloudFront
**Function** (not Lambda) that reads `event.viewer.ip` and generates the
response without touching the origin. ~$0.10 per million invocations.

No third-party address lookup, at any point, ever — rejected on the record in
[`ip-data-research.md` §4](../../docs/ip-data-research.md). No ads, no
analytics, no cookies, no account, no stored history. Telemetry ships dormant
(`telemetry.js`, `ENDPOINT = ''`).

**Cost: $0** plus CloudFront's own per-request price.

## The edge function

[`../../hosting/edge/ip-whoami.js`](../../hosting/edge/ip-whoami.js), wired to
a `/ip/whoami` behaviour in `HostingStack` with caching disabled. It answers
`text/plain` to anything that is not asking for JSON, so

```
curl https://<distribution>/ip/whoami
```

prints the address and nothing else, and JSON (the address plus the request
headers it actually received) to the page.

**This is the first app that needs `hosting/` redeployed, not just an
`s3 sync`** — it breaks the system's standing promise that adding an app never
touches the stack.

**Deployed and verified 2026-09-17.** `X-Cache: FunctionGeneratedResponse
from cloudfront` is the proof that matters: the response is generated at the
edge and never reaches the origin. `curl` gets `text/plain`, the page gets
JSON (`{"ip":...,"headers":{...},"note":"Seen for this response. Not kept."}`),
and the live page shows the real address in the first paint.

If the function is ever absent, `whoami` 404s, the page says so in plain
words, and `?ip=<address>` drives every other check. That empty state is
designed, not accidental — and it is what the page correctly showed for the
half hour between the app deploy and the hosting deploy.

## Checked

Against a plain static server, at 900×560 and at 320×640:

- `?ip=193.0.6.139` — the ordinary case
- `?ip=255.255.255.255` — the longest IPv4
- `?ip=2001:0db8:85a3:0000:0000:8a2e:0370:7334` — the longest IPv6, which is
  why the address sizes itself from its own character count
- no `?ip=` and no edge function — "Not available", Copy gone, the reason
  stated, the field still composed
- Tab reaches Copy first; copy works by pointer and by keyboard; the live
  region reports it
- no console errors; `node --check` passes

The edge function, the real-address path and the `curl` path were the three
things that could not be checked until there was a deploy. All three now
check out against the live distribution.

## Data provenance

None shipped in phase 1. `../../scripts/ip-build-asn-field.py` fetches and
packages the population dataset for phase 5 (RIPEstat `ris-asns`, routing
data by courtesy of the RIPE NCC); it is not run and its output is not in
this folder yet.

Font: Archivo, SIL Open Font License, `fonts/Archivo-OFL.txt`.

## To remove

```
aws s3 rm s3://<bucket>/ip/ --recursive
aws cloudfront create-invalidation --distribution-id <id> --paths "/ip/*"
```

Then delete `apps/ip/`, remove the `/ip/` line from
`hosting/site-root/index.html`, and remove the `IpWhoami` function and its
`/ip/whoami` behaviour from `hosting/hosting_stack/hosting_stack.py`
(followed by a `cdk deploy`).
