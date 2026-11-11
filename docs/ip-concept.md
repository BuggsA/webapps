# The concept — a beautiful sidewalk

**Owner decision, 2026-11-11.** This is the one page everything else in
`apps/ip` is measured against. Where an older document disagrees — the plan,
the art direction, the product soul — this wins, and the older document is
history.

## In the owner's words

> *"Now I want to get traffic, before I wanted to make beauty. My analogy was
> that sidewalks don't have to be dirty, cracked and littered. Make a nice
> one. If people want to stop and see the beauty or interact they can, but
> they can still get to the store down the way. I think the internet has lots
> of cracked sidewalks."*

## What that means

- **The goal is traffic.** Before 2026-11-11 the goal was beauty. Beauty is
  now how we compete, not what we are for.
- **The store is the errand.** Someone came for their IP address, and maybe
  their location, provider or IPv6. They get it instantly, copy it and leave
  happy. Nothing stands between them and it. (This was already the rule
  *"useful first"*; now it is the point.)
- **The sidewalk is beautiful anyway.** The competition is cracked sidewalks:
  ads, clutter, slowness, popups, trackers. We win by being the clean,
  fast, beautiful, honest one.
- **Stopping is optional.** The map, the exploring, the stories and the guide
  are a bench and a view. Never in anyone's way, never slowing the errand,
  there for whoever wants them.

## How to decide things now

Ask, in this order:

1. **Does it make the errand faster or clearer?** Do it.
2. **Does it bring people here** — a search they make, a link they share? Do it.
3. **Does it make the walk more beautiful without slowing anyone?** Do it.
4. **Is it only for the people who stop?** Fine, but it comes after 1–3, and
   it must cost the errand nothing.

## Built for it so far

- **The teaser** (2026-11-11): one true line about the visitor's own block
  under the facts - *"Your address comes from a block registered in 2005,
  the year YouTube launched."* Registry year + `content/anchors.json`.
- **The first pull** (2026-11-11): the first outward gesture glides out to
  the whole address space, and "You are here" names the visitor's mark.

## Why people stop — the thinking behind the stop features

Agreed with the owner 2026-11-11 (*"That is good"*). People on a real
sidewalk stop for five things, and each one maps to a feature here:

| on a sidewalk | the principle | here |
|---|---|---|
| Cloud Gate, "the Bean" — a mirror nobody walks past | **it shows them themselves** | the amber mark, the teaser line about their own block, "You are here" |
| a busker, already playing as you pass | **it answers before you decide to stop** | the teaser sits in the errand itself; nothing to look for |
| the piano stairs | **trying costs nothing; the fun is the path** | the first scroll IS the pull — no button needed |
| a shop window that changes | **it is different tomorrow** | #4, a place of the day |
| the photo at the end | **people want to show someone** | #3, "save my spot" |

### The five stop features

| # | feature | status |
|---|---|---|
| 1 | **The teaser** — one true line about the visitor's own block | **BUILT, live 2026-11-11** |
| 2 | **The first pull + "You are here"** | **BUILT, live 2026-11-11** |
| 3 | **"Save my spot"** — a beautiful image of THEIR dot on the map of the internet, made to share; the IP hidden unless they choose. Every share is a new visitor, so it is also a traffic engine | proposed, **next of the five** |
| 4 | **A place of the day** — a changing window display (Apple's 16 million addresses, the root servers, the space reserved and never used); a reason to come back and something to post | proposed |
| 5 | **Plain words on touch** — tapping a dot says *"Comcast, Philadelphia, since 2005"*, not `73.120.32.0/20 AS7922`; the exact form one tap away | proposed |

**Do not polish #1 and #2 blind.** Recommended (not decided): the owner uses
the live site on a phone for a day and sends it to two or three people
without explaining it — do they read the line, do they scroll? Change #1/#2
only on what that shows. If they fall flat, fixing them comes before
everything below, because a bad first impression undercuts all the traffic
work.

## What is next — recommended order, 2026-11-11

Claude's recommendation, given to the owner and **not approved as a plan**.
Ordered by what brings traffic, the stated goal.

1. **The front door** — the custom domain (owner picks and connects it in
   Cloudflare → ip → Custom domains; owner adds it to Google Search
   Console), then canonical, `sitemap.xml`, share tags and image, a title
   and description written for real searches, and `ip-5q5.pages.dev`
   redirecting to the domain. **Waiting on the domain name.**
2. **Speed, measured on a phone** — the address must appear first on a
   mid-range phone on a slow connection; it now loads 30 scripts and a 3D
   renderer, and this has never been measured. Needs no decision.
3. **More doors** — one small, fast page per neighbouring search: *what is
   my IPv6*, *IP lookup*, *is this IP private*, *IPv4 vs IPv6*. Where most
   new traffic would come from.
4. **"Save my spot"** (#3 above).
5. **The tally** — a privacy-respecting count of visits that go past the
   home screen, so whether people stop is known, not guessed. Not approved;
   it needs the owner's explicit yes (`PRODUCT_SOUL.md` §8.6, "no analytics
   that identify" — this would identify no one).
6. **Small-phone crowding** — on an iPhone SE, at the widest view, the
   guide's line and the suggestions cover the lower third of the map.

**Superseded, not deleted:** territories and the atlas of famous places.
They were answers to "the map has nowhere to go", from before the concept
was "a beautiful sidewalk". Revisit only if the owner asks.

## Proposed — implications not yet decided by the owner

These follow from the concept. They are Claude's reading, listed so they can
be confirmed or struck out, **not approved by being written here.**

- **Speed is measured and defended.** The address appears before anything
  else loads; the 3D map loads after it, never before.
- **Phones are the main road.** Most search traffic is mobile. Every errand
  works fully by touch.
- **Many doors.** Traffic comes from many searches, not one: *what is my
  IPv6*, *what is my ISP*, *IP lookup*, *is this IP private*, *IPv4 vs
  IPv6*, *CIDR calculator*. Each is its own small, fast, beautiful page on
  the same sidewalk.
- **One domain, memorable, canonical.** The pages.dev address redirects to
  it.
- **The exploring becomes the reason people share it** — the thing nobody
  else's IP page has — rather than the thing they must get through.
