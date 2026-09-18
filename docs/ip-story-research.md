# Is it the right story? — narrative research

Researched 2026-09-18, after the owner asked whether the story we have is the
right one, and said it should be rich, emotional, include the dark side, and
**at the end, despite everything, appear beautiful.**

The existing spine is in `docs/ip-narrative-and-outline.md` Part I — *the
address is Home → Outward → Inward → the boundary* — and phase E turns it
into seven beats. This document tests that spine against what the history
actually contains, and it changes the ending.

**The hard constraint throughout:** this app can only tell a story about
places you can go to. A fact that is not an address is not usable here,
however good it is. Every thread below is anchored to a real range.

---

## 1. Six threads that are true, pointable, and mostly untold

### The one who kept the numbers by hand

Jon Postel ran the Internet Assigned Numbers Authority, at first **manually**
— he personally tracked the protocols, the identifiers, the networks and the
addresses. *The Economist* called him the God of the Internet. To a lot of
people he simply **was** the IANA.

In January 1998 he emailed eight of the twelve root nameserver operators and,
on his own authority, told them to point at his server instead of Network
Solutions'. All eight did. **For a few hours half the internet's root
infrastructure answered to one man.** He died nine months later, at 55.

*Anchors:* the root server ranges (already in `MARKS`, all thirteen).

### The day the numbers ran out, and the ceremony for it

**3 February 2011.** IANA handed out its last five /8s — one to each registry,
simultaneously, by a policy written years earlier specifically to govern the
end. Then the regions ran dry one at a time: APNIC April 2011, RIPE NCC
September 2012, LACNIC June 2014, **ARIN September 2015.**

*Anchors:* the five final /8s; every post-2011 allocation in `space.bin` is
downstream of this, which means **era brightness is already drawing it.**

### What happened once it was finite: one sold, one gave it back

**MIT** held all of `18.0.0.0/8` from 1977 — sixteen million addresses — and
**sold half to Amazon in 2017.**

**Stanford** held `36.0.0.0/8` and **gave it back**, to APNIC, to push the
exhaustion date out.

Addresses now have a price: roughly **$25 each** in 2026, so a /24 runs
$6,400–$9,000.

*Anchors:* `18.0.0.0/8`, `36.0.0.0/8`. Both live, both renderable, and the
pair is the whole argument in two places you can stand in.

### It runs on trust, and trust is not a mechanism

**April 1997:** a router at AS7007 leaked a chunk of the routing table as if
it originated there. Traffic poured into the hole. **The internet essentially
stopped working for several hours.** A bug, not an attack.

**24 February 2008:** Pakistan ordered YouTube blocked. Pakistan Telecom
announced `208.65.153.0/24` to do it. Their upstream, PCCW, passed it on to
everyone. **A national censorship order leaked out and took YouTube off the
internet for the whole world for about two hours.**

*Anchors:* `208.65.153.0/24` — an ordinary-looking /24 you can travel to.

### The quiet ones are quiet because somebody forgot

The plan already has *The quiet ones* — allocated decades ago, never
announced — as a side line. The research gives it a second half, and it is
dark.

Legacy ranges issued before 1997 **cannot be revoked for unpaid fees**, so
they sit there forever. ARIN holds **30,556 legacy records and has a
validated contact for only 54% of them** — roughly **14,000 networks nobody
can reach.** Spammers burn through address reputation constantly and need
fresh space, and dormant legacy blocks are the cheapest source there is.

**So every dark allocated cell in our field is two things at once: a mystery,
and a target.** We are already drawing this and did not know what we were
drawing.

*Anchors:* computed, not authored — allocated in `space.bin`, announced by
nobody. The sightline engine already finds these.

### The doors, which are just arithmetic

Already in the plan and still the best egg: your IPv4 address already exists
inside IPv6 at an address anyone can compute. NAT64, IPv4-mapped, 6to4,
Teredo. 6to4 is the one with a story — built, used, abandoned.

---

## 2. What this changes about the ending

The current thesis is *your address is not you*, and the brief's rule is that
**the ending informs rather than alarms.** Both hold. But the research offers
something better than reassurance, and it is the thing the owner asked for:
**beauty that is earned rather than asserted.**

The dark and the light here are not two subjects. They are one fact:

> **The internet routes by trust. Anyone can announce anything. There is no
> enforcement, there never was, and it has been abused — by accident in 1997,
> by a government in 2008, and quietly by spammers on forgotten blocks every
> day since.**
>
> **And it works anyway. All of it. Every day. Because mostly, people don't.**

That is not a consolation tacked onto the end. It is the same sentence as the
dark part, read the other way, and it is *true* — which is the only kind of
beauty this product is allowed to claim.

It also fixes something the ending did not have: a reason for the guide to
drop the armour. He is dry because he has seen six hundred million empty
blocks and knows what the quiet ones are for. **The 15% unguarded belongs
here**, at the end, on the fact that the thing holds together at all.

## 3. How the threads sort

Applying the rule proposed earlier — *random finds are computed, quests are
chained, eggs are arithmetic* — and it survives contact:

| thread | kind | why |
|---|---|---|
| the numbers ran out | **main line** | it is the reason the space is shaped as it is |
| trust, and the two failures | **main line**, late | it is the thesis; everything else is evidence |
| Postel and the thirteen | **side chain** | a person, found by walking the root servers |
| sold and given back | **side chain** | two places, one argument |
| the quiet ones | **half computed, half chained** | the engine finds them; the meaning is authored |
| the doors | **eggs** | pure arithmetic on the visitor's own number |
| oldest hands, unusable space, small countries | **side chains** | already in the plan, unchanged |

**The one genuinely new structural finding:** *the quiet ones* is the first
thread that is **half authored and half computed.** The sightline engine
already points at dormant allocated space with no authoring at all; the story
of *why* it is dormant is a written line that can attach to any of them. That
is the interlock between the two layers, and it is a template — a chain that
does not need fixed addresses because the engine supplies them.

## 4. What is not usable, and why

Good history that this app cannot tell, because it has no address:

- The first ARPANET message in 1969, and RFC 1.
- The protocol arguments of the eighties; OSI versus TCP/IP.
- Anything about DNS as such. Names are a different space and we survey
  numbers. *(Postel's root incident is usable only because the root servers
  have addresses and we already mark them.)*

Recording these here so a later session does not rediscover them and try to
force one in. **If it is not a place, it is not for us.**

## 5b. Verified 2026-09-18 — results

The section below asked for a second source before anything reached a shipped
line. This is what that pass found. **Three things changed and one was
wrong**, which is roughly the rate that justifies doing it.

**Confirmed, and now in shipped content:**

- `240.0.0.0/4` reserved since **RFC 791, 1981-09** — and our own registry
  independently confirms it is unallocated, so both halves of that line stand
  on our own data rather than on a source.
- **6to4 deprecated by RFC 7526, 2015**, for uncontrolled anycast relays
  causing unpredictable failures. "Built, used, and abandoned" holds.
- Root server A `198.41.0.4` and E `192.203.230.10`, checked against our own
  `ROOTS` table, whose provenance is the IANA root hints.
- **Singapore 66.0% pre-1993** and **North Korea one range of 1,024
  addresses**, both computed from `space.bin` rather than borrowed.

**Wrong, and corrected:**

- `1.1.1.1` — I had written *"years of cleaning"*. That is not what happened.
  The address was an unusually strong attractor for stray traffic, **over 50
  Gbps** of it, and nobody could announce it at all; Cloudflare got it by
  being large enough to stand in front of the noise, in exchange for APNIC
  being able to study it. **The true story is better than the one I wrote**,
  which is worth remembering the next time a line feels good enough to skip
  checking.
- `8.8.8.8` — *"chosen so you could remember it"* claims a motive with no
  source behind it. Now an observation instead.
- The legacy-reclaim claim was scoped to ARIN's 1997 founding in the source
  and stated generally in the reveal. Now says "before the registries began
  charging" and names no year.

**Caveat carried forward:** there is a live IETF effort to redesignate
`240/4` as usable unicast space. If it lands, that line needs rewriting
rather than deleting — it becomes a better fact, not a dead one.

## 5. Verify before writing

Every fact above came from a search on 2026-09-18 and wants a second source
before it reaches a shipped line, especially:

- exact dates for the regional exhaustions,
- that `208.65.153.0/24` is the prefix and that it still resolves sensibly in
  our data,
- the ARIN legacy-contact figures, which move,
- address prices, which move a lot and probably should not be quoted as a
  number at all — *"a /24 costs about as much as a used car"* ages better.

---

## Sources

- [Jon Postel — Wikipedia](https://en.wikipedia.org/wiki/Jon_Postel) · [A Ten Year Tribute to Jon Postel — Internet Society](https://www.internetsociety.org/grants-and-awards/postel-service-award/ten-year-tribute-jon-postel/)
- [The IANA IPv4 Free Pool has Depleted — ARIN](https://www.arin.net/vault/blog/2011/02/03/iana-ipv4-free-pool-depletion/) · [Free Pool of IPv4 Address Space Depleted — NRO](https://www.nro.net/ipv4-free-pool-depleted/)
- [A Brief History of the Internet's Biggest BGP Incidents — NANOG](https://nanog.org/stories/articles/a-brief-history-of-the-internets-biggest-bgp-incidents/) · [AS 7007 incident](https://en.wikipedia.org/wiki/AS_7007_incident)
- [YouTube Hijacking: a RIPE NCC RIS case study](https://www.ripe.net/about-us/news/youtube-hijacking-a-ripe-ncc-ris-case-study/)
- [MIT Goes on IPv4 Selling Spree — Internet Society](https://www.internetsociety.org/blog/2017/05/mit-goes-on-ipv4-selling-spree/) · [List of assigned /8 IPv4 address blocks](https://en.wikipedia.org/wiki/List_of_assigned_/8_IPv4_address_blocks)
- [Network Hijacking on the Rise — Spamhaus](https://www.spamhaus.org/resource-hub/hijacking/network-hijacking-on-the-rise/) · [Who is squatting IPv4 addresses? — benjojo](https://blog.benjojo.co.uk/post/ip-address-squatting)
