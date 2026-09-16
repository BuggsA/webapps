# "What's My IP" — the pieces, for whoever tells the story

**This document is a parts list, not a plan.** Everything in it is either a
verified fact, a decision already made, or a failure already paid for. What it
deliberately does *not* contain is the narrative: the order the pieces go in,
how each one is introduced, what gets cut, and how the page reads from the
first frame to the last.

**That is the job.** Compose these pieces into one page that tells one story.

Self-contained on purpose — you do not need the conversation that produced it.

---

## 1. What the thing is

A "what's my IP?" page. It answers in the first frame, on a page good enough
that some people stay. For those who stay, the address turns out to be a
position: you can travel **outward** from it until you are one speck in the
whole internet, or **inward** into everything you handed over just by opening
the page.

Fourth in a series of small, free, single-purpose web apps whose premise is
that ordinary tools do not have to be ugly.

### The order of goals, which the owner set and which decides arguments

1. **Beauty.**
2. **Wonder.**
3. **Utility** — which is what gets people in the door, and must never get
   slower or harder in service of 1 and 2.

---

## 2. The hard problem you are being asked to solve

The page has to be three incompatible things at once:

- **A tool** someone opens for the hundredth time, in a hurry, and leaves in
  four seconds.
- **A page with no entrance ceremony.** Nothing is allowed to be sequenced in
  front of the answer. An opening is delightful once and an obstacle by the
  fifth visit.
- **A story**, which by definition has an order, a build, and a payoff.

A fixed narrative becomes hostile once you know the ending — you start
skipping to the part you remember, and then you stop coming. But a pile of
unordered material is what the last three attempts produced, and it reads as
a toy with no point.

**Resolving that tension is the design problem.** Everything below is
material for it.

Constraints that any resolution must respect:

- The answer is in the first paint. No loading state, no layout shift, no
  animation before the number, no consent wall, no account.
- The address stays reachable at every depth. Never more than a glance away,
  always copyable.
- Nothing below the answer is on the path. A rushed visit never routes
  through any of it.
- Depth is entered by choice and can be left at any point without losing the
  utility.

---

## 3. The tests that decide whether it worked

These came out of three rejected attempts. Use them as acceptance criteria,
not as garnish.

| Test | Statement |
|---|---|
| **The ten-second test** | After ten seconds, could the visitor tell someone **one true thing they didn't know before?** |
| **The three-year-old test** | If a three-year-old finds it interesting, it is probably doing its job. That means cause and effect, and things getting bigger and smaller — not things to read. |
| **Distraction vs. wonder** | Sensation with no referent is a fidget toy: fun for five minutes, nothing kept. Wonder comes from recognising something true. Google Earth holds people because it is *their actual roof*, not because it is pretty. |
| **The beauty test** | The beauty lands *before language*. No caption, no concept, no networking knowledge. The reaction to design against is not "nice site", it is "what **is** that?" |
| **The hundredth visit** | Fast, calm, familiar, nothing demanding attention, nothing that has become irritating. |
| **The floor** | Never ugly — not "usually beautiful". Across every address, every latency, every screen. If beauty is a coin flip, it fails for the visitors who lose, and they never know they lost. |

---

## 4. The pieces — outward

Six stops from the visitor's address to the whole internet. Address space
genuinely is blocks nested inside blocks, so this ladder **is** the data
structure, not a metaphor laid over it.

Each piece below carries the fact it rests on and a sentence in the app's
voice. The sentences are raw material — rewrite them, but do not make them
less true.

| # | Stop | What is on screen | The fact underneath | Sentence |
|---|---|---|---|---|
| 0 | **You** | One address, one point | The viewer IP, from our own edge | *This is you.* |
| 1 | **The street** | The /24 it sits in | 256 addresses; the smallest block that normally travels the internet as one piece | *255 other addresses move through the world tied to yours.* |
| 2 | **The block** | The prefix the provider announces | RIPEstat `network-info` → prefix + origin ASN | *Your provider announces this whole block as one thing.* |
| 3 | **The provider** | Every block that network announces | RIPEstat `announced-prefixes`; they are scattered, not contiguous | *They announce 37 separate blocks, nowhere near each other.* |
| 4 | **The neighbours** | Who they hand traffic to | RIPEstat `asn-neighbours`; published by the networks themselves | *11 networks carry your traffic onward.* |
| 5 | **All of it** | ~80,000 networks, yours still marked | Active ASNs, order 10⁵; announced prefixes, order 10⁶ | *You are one speck in about 80,000 networks — and you can still see which one.* |

**The name is the payload.** Every stop has a real, nameable owner: a bank, a
university, an ISP, a government, a country. That is what makes it
recognition instead of decoration, and it is the single thing the two failed
attempts lacked.

---

## 5. The pieces — inward

The same axis, the other direction: everything the visitor gave away in the
first few milliseconds without being asked. Outward is wonder ("I am very
small"). Inward is **recognition** ("that is me, and I never told it any of
that").

| # | Stop | Content | Sentence |
|---|---|---|---|
| −1 | **The request** | The ~six lines the browser actually sent | *You said hello in about six lines, and only one of them was the address.* |
| −2 | **What they say** | OS + version, languages read, dark-mode preference | *Six lines told a stranger your OS, your version, and every language you read.* |
| −3 | **What the device answers** | Screen, timezone, cores, touch, fonts, GPU — no permission prompt | *Your timezone alone narrows you to one stripe of the planet, and nothing asked you.* |
| −4 | **The combination** | Joint rarity — the only part that actually identifies a person | *No one fact identifies you. All of them together usually do.* |
| −5 | **What nobody can see** | Your name, your files, your other tabs, your street address | The piece that makes it an instrument instead of a fear machine. |

Three rules for this half, all load-bearing:

1. **It ends calm.** The last beat is what is genuinely private. Without it,
   this is just another "you've been fingerprinted!" page, which is noise.
2. **No fabricated rarity number.** The app stores nothing about anyone, so it
   genuinely cannot compute how rare a combination is from its own visitors.
   Cite published research or say nothing. Refusing the impressive-sounding
   number *is* the ethic being visible.
3. **The promise splits in two, precisely.** What *reached the server* —
   request headers, unavoidable, seen and discarded. What *never left the
   device* — everything computed in the browser; no request fires, and the
   page can demonstrate that.

> **Known reversal, flagged deliberately.** The owner's original brief ruled
> this whole half out: *"the promise stops being simple the moment it needs a
> footnote, and a simple promise is worth more than a good section. Trade
> accepted."* They later asked for it back. The design answer to their own
> objection is rule 3 — the promise does not gain a footnote, it gains
> precision. Keep that visible rather than quietly dropping it.

---

## 6. The interaction pieces

- **One axis, one gesture.** Scroll, pinch, or drag. The visitor's address is
  the middle. Right goes out to the internet; left goes into the connection.
  This is the most universally understood gesture that exists — no tutorial,
  no wrong move, nothing to get stuck in. Precedent: *Powers of Ten* travels
  out to the galaxy **and** inward through skin and cell and atom, from the
  same spot.
- **Home.** One press flies back to the visitor's own address from anywhere.
  Finding yourself again is half the pleasure of a map.
- **The answer, pinned.** Visible at every depth, always copyable.
- **Plaintext for machines.** `curl` gets the address and nothing else;
  browsers get the page. This is how `icanhazip` and `ifconfig.me` spread;
  developers are a real distribution channel and cost nothing to serve.
- **Reduced motion** gets a still that is as beautiful as the moving version —
  a still, not a degraded one. It is also what gets saved as the image, so it
  is the canonical frame, not the fallback.
- **Save the image.** The only artifact that leaves the site and the only
  distribution that asks nothing of anyone. Address and date set underneath
  like a museum plate, with whatever marks the series.
- **Performance floor.** Must hold a smooth rhythm on a cheap Android phone.
  This caps the particle and shader budget hard; it is a design input, not a
  later optimisation.

---

## 7. The door — where it leads after

The owner specifically wants the page to lead somewhere beyond itself.

- **The far end (outward)**: the places that publish all of this, for anyone
  who wants to keep pulling the thread — RIPEstat (look up any network),
  bgp.tools (who announces what), the submarine cable map (the physical
  version), RFC 791 (the 1981 document that defined the address they started
  from).
- **The near end (inward)**: the settings that change what the browser says,
  and the honest reason most of it cannot be turned off.
- **The series plate.** The other apps are not a portfolio to link to — they
  are *the same instrument pointed at different things*, and each answers
  **"where am I, inside something bigger than me?"**
  - *Tonight* — where you are under the sky
  - *Tide* — where you are in the moon's pull on the ocean
  - *Until* — where you are in time
  - *This one* — where you are in the network

  Said once, quietly, at the end of the journey, to someone who has just felt
  small inside the internet, this lands. Said as a menu at the top, it is
  noise. Closer to a small plate on a museum wall than to a nav bar.

---

## 8. Verified facts and their sources

Checked live on 2026-09-15 from a plain shell sending a foreign `Origin` —
i.e. the conditions a static page actually faces. Re-verify before relying on
any of it.

**Usable, keyless, CORS-open:**

- **RIPEstat Data API** — `https://stat.ripe.net/data/<call>/data.json?resource=…`
  Returns `Access-Control-Allow-Origin: *`. Calls confirmed working:
  `network-info` (address → prefix + origin ASN), `prefix-overview` (holder
  name), `as-overview`, `asn-neighbours`, `announced-prefixes`.
  `asn-neighbours` took ~1 s server-side — never put it on the first paint.
  Responses carry a `data_call_status` worth checking, since some calls are
  deprecated; degrade quietly rather than throwing.
- **RIPE RIS Live** — `wss://ris-live.ripe.net/v1/ws/?client=<name>`
  Returned `101 Switching Protocols` with a foreign Origin and began
  streaming. Real BGP announcements and withdrawals, continuously, no account.
  Subscribe narrowly (by prefix or AS), never the firehose.

**Not usable, despite appearing in earlier planning:**

- **Team Cymru IP-to-ASN** — DNS and whois only. A browser cannot issue
  either. RIPEstat covers the same ground.
- **Cloudflare Radar** — needs an account and a bearer token, so it cannot be
  called from a static page without shipping a secret. Requires attribution.
- **IODA** — academic-research licence; check before shipping publicly.

**Truths that constrain what the page may claim:**

- The real navigable units are **announced prefixes** (order 10⁶) and
  **autonomous systems** (order 10⁵, roughly 80,000 active). *Not* 4.3 billion
  addresses. A tractable dataset with real relationships beats an intractable
  one with invented ones.
- **A browser cannot traceroute.** What is available is the BGP path to a
  prefix, which is *not* the path the visitor's packets took. Phrase it as
  what is announced and known — never as a measured journey.
- **Uncertainty is published.** `asn-neighbours` reports an `uncertain` count
  alongside `unique` (862 of 909 for AS3333). Where the data is unresolved the
  picture may be unresolved too — fog, darkness, incompleteness — rather than
  a guess dressed as a fact.
- **Relationships are published, not inferred.** Every line the page draws
  between networks is something a network said about itself. There are no
  invented links.
- **Not geographic.** Two networks adjacent in the graph may be on opposite
  sides of the planet. The shape of the internet is who connects to whom, not
  who is near whom.

**Documentation-reserved identifiers**, for mockups and examples, so nothing
names a real customer or claims a real relationship: `203.0.113.0/24`
(RFC 5737) and `AS64496–AS64511` (RFC 5398).

---

## 9. Architecture, already decided

- **Tier 1 static + one CloudFront Function.** The function reads
  `event.viewer.ip` at viewer-request (confirmed present in the CloudFront
  Functions event object) and may return a generated response. `Accept`
  without `text/html` → plaintext address straight from the edge; otherwise
  fall through to the static page, which fetches the same path same-origin.
  ~$0.10 per million invocations, no Lambda, no cold start.
  - Function source is capped at **10 KB**, so the edge cannot render the
    whole page. The concession: in a browser the number needs JavaScript.
  - Disable caching on that behaviour; the response varies per viewer.
  - **This is the first app in the series needing a `cdk deploy` of shared
    hosting rather than only an `s3 sync`.** Known, flagged, accepted.
- **Rejected:** a third-party echo service (`ipify` and friends) — it sends
  every visitor's address to a company with nothing to do with this site, on a
  page whose whole ethic is that it does not do that.
- **Rejected:** rendering the page from a Lambda — a cold-start tail on the
  one thing that must never feel slow.
- **Privacy timing:** no RIPEstat lookup fires until the visitor moves past
  the answer. An arrive-copy-leave visit talks to nobody but us, which keeps
  the simple promise simple.
- **Latency** is measured with repeated small same-origin requests to our own
  edge, timed with `performance.now()`, median of a handful. Real
  measurement, no third party, no packet fiction.
- **Offline:** the address and the page still work; network-derived parts are
  simply unresolved.

---

## 10. Voice

Sparse and documentary. Let the visitor infer.

> `7 networks carried this here.`
> `24 ms away.`
> `193.0.0.0/21 · announced by AS3333`

Not: *"Your connection traveled across 7 networks!"* No exclamation marks. No
two-abstract-noun phrases. No Empower / Unlock / Seamless. Say what is true,
plainly, and stop.

The ideal reaction is not *"I understand the visualization."* It is
*"Wait. Is that actually me?"* → *"What are all those?"* → *"How big is
this?"*

---

## 11. Three attempts already failed. Do not repeat them.

1. **"Cordage"** — the address as a knot in hanging cord, containment drawn as
   suspension, an Asawa-like looped-wire form. Built and rejected on sight:
   a line drawing with no material, no light and no volume, and — being a
   static portrait — nothing to do.
2. **"Sea Fire"** — bioluminescence; the field lights where your hand
   disturbs it, a press sends an expanding ring. Genuinely responsive and
   genuinely pretty. Rejected anyway, and the verdict is the important part:
   *"fun for 5 mins but I am not sure if I got anything from it… more a
   distraction instead of wonder."*
3. **The common cause, and the thing to avoid.** Both made a beautiful form
   whose shape was **arbitrary with respect to the truth** — anatomy derived
   from an ASN, which the viewer cannot see, verify, or care about. The data
   was a costume. Polish does not fix that; only a recognisable referent does.

A fourth failure is available and it is the opposite one: a page so keen to
be meaningful that it explains itself, captions its own pictures, and turns
into a lecture. The material is extraordinary; the job is to set it well and
get out of the way.

### Also explicitly out

No globe, no world map, no geography. No engagement machinery — feed,
recommendations, streaks, manufactured novelty. No second visual vocabulary
for the environment competing with the main one. No entrance animation. No
tutorial, modal, or onboarding. No claim the AS-path is the packets' path.
Not an engineering dashboard with artistic styling, and not a WebGL demo
looking for a purpose.

---

## 12. House constraints (non-negotiable, don't relitigate)

- One folder: `index.html`, one `.css`, one `.js`, a `README.md`, plus
  `fonts/` `lib/` `data/` as needed. **No framework, no bundler, no build
  step.** Vanilla HTML + Canvas 2D + JS.
- **Self-contained.** The deploy copies only that folder: no `../`
  references, no CDN `<script>`/`<link>`, fonts self-hosted with their licence
  beside them, data-URI favicon.
- **Network: keyless, CORS-open, cached, and optional.** The app renders
  fully and usefully with the network unplugged.
- **Privacy posture.** State lives in `localStorage` only. No account, no
  cookies, no fingerprinting stored, no IP history, no ads. Only claim what is
  technically true.
- **Accessibility floor, checked every phase.** Real semantic elements;
  keyboard operable; a visible focus state (a hairline or underline, not a
  rounded ring); hit targets ≥ 44px even when the visible mark is a word or a
  hairline; a complete `prefers-reduced-motion` path; text contrast ≥ 4.5:1
  against the worst case the moving field can put behind it; responsive from
  ~320px with no horizontal body scroll; `viewport-fit=cover` + safe-area
  insets.
- **Deploy is human-run, always.** Finish, update the docs, stop, and hand
  over the command.

---

## 13. What is still open — your call, or ask the owner

1. **How far inward?** Stopping at "here is what you sent" is calm and safe.
   Going all the way to the fingerprint combination is the startling one, and
   the one that reverses the owner's original decision.
2. **How far outward?** Stopping at the provider and its neighbours is honest
   and tractable. All eighty thousand networks is the breathtaking one, and
   the one most likely to turn into soup.
3. **Search, or not?** Type a name — a bank, a university, a country — and go
   there. This is what turns a large space into somewhere a visitor *wants* to
   go; motivation the visitor brings from outside is the only kind that lasts.
   Size alone is exhausted far faster than its dimensions suggest. It is also
   the most work.
4. **The narrative itself** — the whole reason this document exists. What
   order, what framing, what gets cut, and how a page that must not have an
   entrance still manages to tell a story.

---

## 14. Your deliverable

A page narrative: the sequence of what a visitor meets, in what order, with
what words, resolving §2. Say plainly which pieces you dropped and why —
dropping pieces is expected and welcome; quietly losing them is not.

Every fact you state must be one from §8 or one you verified yourself. If a
better story needs a fact that is not true, the story loses.
