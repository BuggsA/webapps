# ip — brief

**Status:** DRAFT, not yet locked. Written 2026-09-15 from the human's idea
document (the long "What's My IP" write-up) plus four reference stills.
Their framing: "the text is just thoughts, not something that really needs
to be followed" — so this is a compression of it into the house template
(`building-a-new-app.md` §4), keeping the load-bearing parts and treating
the rest as intent rather than spec.

Fourth app in the series, after `until`, `tonight`, `tide`.

---

**One sentence:** A "what's my IP?" page that answers in the first frame, on
a page good enough that some people stay — and for those who stay, the
address turns out to be a position inside a real, live, published structure.

**Thesis:** *Your address is a place in something enormous, and the
something is real.* Utility gets people in the door; beauty is why the door
was worth building. If a feature serves neither the instant answer nor that
idea, it is out.

**Order of goals** (the human's, kept): beauty first, wonder second, utility
is what gets people in the door — while the utility itself never gets slower
or harder. A half-second visit and a one-hour visit are both correct ways to
use the site.

---

## Must-haves (v1)

- **The answer, first, with no ceremony.** The address visible in the first
  paint, a copy affordance beside it. No loading state, no layout shift, no
  animation before the number, no consent wall, no account.
- **The answer stays pinned.** However far the visitor drifts into anything
  below, the address is never more than a glance away.
- **Plaintext for machines.** `curl` gets the address and nothing else;
  browsers get the page. Content negotiation on `Accept` — see
  `ip-data-research.md` §4; this is the one decision that reaches outside
  `apps/`.
- **A form that is already there.** Deterministic from the address and its
  network, composed instantly, not animated in. No entrance sequence. This
  is the single most important structural decision in the source document:
  an opening ceremony is delightful once and an obstacle by the fifth visit.
- **Derived from real facts, not from address bytes as RGB.** Prefix, ASN,
  holder, v4/v6, latency. Colour comes from a curated palette *selected by*
  the address (see The gate).
- **`prefers-reduced-motion` gives a still form as beautiful as the moving
  one** — a still, not a degraded version.
- **Save the image.** One affordance: the form as it is now, address and
  date set underneath like a museum plate. It is the only artifact that
  leaves the site and the only distribution that asks nothing of anyone.
- **Privacy, stated precisely and actually true.** No account, no cookies,
  no fingerprinting, no IP history stored, no ads. Whatever is *not* true
  (a third-party lookup — see Open questions) gets one plain disclosing line
  rather than a broad claim that needs a footnote.
- **Performance floor:** the form breathes smoothly on a cheap Android
  phone. This caps the particle/shader budget hard, and it is a design input
  rather than a later optimisation.
- **A door to the series, not a nav bar.** One small plate: this is one of a
  set. Enough that the curious follow it and nobody else notices.

## Nice-to-haves (later phases)

- **The pullback.** The camera moves away; the visitor's form stays as their
  marker, and the threads holding it to its network — and that network to
  others — become visible. Structural, not geographic: explicitly not a
  globe, and never quietly becoming one.
- **Visual ancestry.** Forms on the same network share anatomy, rhythm,
  density — readable as related species before any label explains why.
- **The live rewiring.** Real announcements and withdrawals from RIPE RIS
  Live, so threads form and break while you watch *because routing actually
  changed*. This is the answer to "why would anyone come back", and it is
  legible with no words at all.
- **Landmarks and search.** Every network belongs to someone nameable — a
  bank, a university, an ISP, a country. Type a name, go there. Size alone
  does not hold attention; having somewhere you want to go does.
- **The journey as ambient pulse.** Real measured latency drives a recurring
  out-and-back, never a gate the visitor waits through.

## Non-goals (explicitly out)

- Any entrance animation, narrative or sequence a returning visitor would
  have to sit through or skip.
- A globe, a world map, or geolocation dressed up as precision.
- An engagement layer: feed, recommendations, streaks, manufactured novelty.
- A second visual vocabulary for the environment (weather, icons, overlays)
  competing with the forms. One structure, rewiring.
- The "everything your browser leaks" section. Strong material, computable
  entirely client-side — but the privacy promise stops being simple the
  moment it needs a footnote. Trade accepted, deliberately.
- Claiming the BGP AS-path is the path the visitor's packets took. A browser
  cannot traceroute. Say what is announced and known, never a measured
  journey.
- Teaching networking. Understanding is a reward for the curious, not the
  point.

## Look/feel

[x] Run the full art-direction pass (`building-a-new-app.md` §2b): 3–5 named
directions, non-web references, diverge before converging, the human picks,
lock it in `docs/ip-art-direction.md` with a banned list and a derived
palette.

Constraints going into that pass:

- The four reference stills read as: near-black field, one luminous organic
  form, a light display serif for the numerals, wide-tracked micro-caps for
  labels, everything else empty. That mood is the input. **It is also close
  to the current AI-render median** — near-black plus blue volumetric bloom
  plus particle bokeh — which is the exact failure §2b exists to prevent,
  and two of the three existing apps are already dark fields. The pass has
  to find what makes this one structurally its own (thread, line, ink,
  weave — something with edges) rather than a third glow.
- The beauty must land before language: no caption, no concept, no
  networking knowledge required. The reaction to design against is not
  "nice site", it is "what *is* that?"
- Voice: sparse and documentary. `7 networks carried this here.` `42 ms
  away.` Not "Your connection traveled across 7 networks!"
- Where the data is uncertain the picture may be unresolved — fog, softness,
  incomplete structure. Uncertainty is part of the language, not something
  to hide.

## Data / network

All verified live 2026-09-15 — see `docs/ip-data-research.md`.

- **The address itself:** from our own edge, not a third-party echo service.
- **RIPEstat Data API** (`stat.ripe.net/data/…`): keyless, sends
  `Access-Control-Allow-Origin: *`. IP → ASN + announced prefix; prefix →
  holder; AS overview; AS neighbours; announced prefixes.
- **RIPE RIS Live** (`wss://ris-live.ripe.net/v1/ws/`): keyless WebSocket,
  accepts a foreign `Origin`. The live announcement/withdrawal stream.
- **Not usable as the source document assumes:** Team Cymru's IP-to-ASN
  service is DNS/whois only and unreachable from a browser (RIPEstat covers
  the same ground); Cloudflare Radar needs a token, so server-side only,
  plus attribution; IODA carries an academic-research licence.

## Tier

**Tier 1 plus one CloudFront Function** — not Tier 2. See
`ip-data-research.md` §4: the function reads `event.viewer.ip` at
viewer-request and answers `curl` in plaintext from the edge, while the page
stays static in S3. This is the first app that touches `hosting/`, which the
system otherwise promises apps never do. Flagged, not assumed.

## Open questions for the human

1. **The reference stills** — mood, or the direction itself? (Changes
   whether the art-direction pass diverges or converges.)
2. **The third-party lookup.** Everything past the bare address needs the
   visitor's prefix/ASN, and the only browser-reachable source is RIPEstat,
   so their address goes to RIPE. Options: disclose it in one line; or defer
   every lookup until the visitor scrolls past the answer, so a pure
   "what's my IP" visit talks to nobody but us.
3. **Name and path.** `/ip/` is short, memorable and the best `curl` target;
   the series otherwise uses one evocative word (`until`, `tonight`,
   `tide`).

## The gate (build this first)

From the source document, and it is right: **the generator must never be
ugly.** Not usually beautiful — never ugly, across every address, every hop
count, every latency, on every screen. If beauty is a coin flip, the premise
fails for the visitors who lose the flip, and they will never know they
lost.

So phase 1 is a harness, not a page: feed the generator a few thousand real
addresses and look at the worst output, holding the sparsest possible
structure to the same bar as the richest. A four-hop route cannot look
impoverished beside a fifteen-hop one. That result decides whether the rest
of this document is worth executing.
