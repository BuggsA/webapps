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

- **The errand, early** (2026-11-11, approved): the address is asked for
  from an inline script while the page is still parsing, not after the
  thirty `js/` files - about a second sooner on a real connection.
- **The doors** (2026-11-11, approved): `/ipv6/`, `/isp/`, `/private/` -
  one small fast page per search, no map, linked from About and the sitemap.
  Shared look and behaviour in `door/`.

- **Search** (2026-11-11, asked for: *"make it SEO optimal"*): titles and
  descriptions in the words people search, structured data, the common
  questions answered in plain HTML behind About, a crawler-safe tab title,
  and two more doors - `/ipv4-vs-ipv6/` and `/cidr/`. The first frame is
  unchanged.

- **The stories, playable** (2026-11-11, asked for: *"wiring up the
  stories"*): the chains in `content/lines.json` now run, with a one-line
  tracker that never appears on a first visit's first frame. For the people
  who stop; it costs the errand nothing.

## Proposed — implications not yet decided by the owner

These follow from the concept. They are Claude's reading, listed so they can
be confirmed or struck out, **not approved by being written here.**

- **Speed is measured and defended.** *(the first step of this is now built: the errand, early)* The address appears before anything
  else loads; the 3D map loads after it, never before.
- **Phones are the main road.** Most search traffic is mobile. Every errand
  works fully by touch.
- **Many doors.** *(APPROVED 2026-11-11; the first three are built)* Traffic comes from many searches, not one: *what is my
  IPv6*, *what is my ISP*, *IP lookup*, *is this IP private*, *IPv4 vs
  IPv6*, *CIDR calculator*. Each is its own small, fast, beautiful page on
  the same sidewalk.
- **One domain, memorable, canonical.** The pages.dev address redirects to
  it.
- **The exploring becomes the reason people share it** — the thing nobody
  else's IP page has — rather than the thing they must get through.
