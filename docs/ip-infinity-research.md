# ip — the infinite space, and what may be drawn in it

Research + design, 2026-09-16. Commissioned by the owner:

> *"I think there could be a infinite appearance thing kind of build in."*
>
> *"But it should be explorable. Like there is something new, maybe some
> illustration, simulation, or reconstruction rather than ground truth with
> it displayed as not being ground truth, but could make people want to keep
> exploring the space. Almost like no man sky or minecraft."*
>
> *"Also keeping remember you can use some familair things. Thinks people
> might know and recognize how it may interact and display it is illustative,
> like akamai, or google, or china great firewall"*

Companion to `ip-render-research.md`, which settled *how* the picture is
drawn. This one settles *how far it goes* and *what is allowed to be in it*.

---

## 1. The finding that mattered most: the depth is already real

Each field is 64x64 = 4,096 cells, so **one step of the axis is 12 bits**.

| | bits | steps that are *true* | `MAX_AXIS` before this doc |
|---|---|---|---|
| IPv4 | 32 | 2.67 | 3 |
| IPv6 | 128 | **10.67** | 3 |

An IPv6 visitor's axis could be **four times longer** than it is, with every
step verified arithmetic. It stops at 3 because that is what IPv4 needed.
That is not an infinity effect waiting to be added. It is a truncation
waiting to be removed.

**Decision (owner, 2026-09-16): per-family rail, real depth.** `MAX_AXIS`
becomes a property of the address family. The rail keeps an end but rescales,
so an IPv6 rail is visibly ~4x longer than an IPv4 one, and the size gap
becomes furniture instead of a sentence.

Rejected: a truly endless recycled axis. It gives the strongest infinite
feel, but the subject stops being a map of a finite thing, and the finite
thing is the point.

## 2. The app already implements a Shepard tone

`layers()` is:

    layerScale[i] = BASE * pow(ZOOM, i - S.s)
    layerAlpha[i] = cos^2(|S.s - i| * PI/2)      // partition of unity

Superposed octaves, each cross-fading, one fading in at the bottom as another
fades out at the top. That is precisely the construction of a
[Shepard tone](https://en.wikipedia.org/wiki/Shepard_tone) — the "sonic
barber pole" that rises forever without getting higher — and the same
"zoom stack" pyramid used in multiscale visualization
([A Design Space for Multiscale Visualization](https://arxiv.org/pdf/2404.01485)).

It was built without knowing that, and then capped at four layers indexed to
named states (`LY.BLOCK`, `LY.SPACE`, `LY.WIDE`). To reach the depth in §1
the named slots must become **ring slots**: three or four live layers
recycled modulo, serving any depth.

## 3. Floating origin is not optional

A 128-bit address cannot be held in a float32's 24 bits of mantissa. This is
exactly the problem large-world renderers solve with a
[floating origin](https://en.wikipedia.org/wiki/Floating_origin): keep the
camera at zero, move the world, rebase to the nearest node so coordinates
stay near zero ([spatial rebasing](https://gamedevtricks.com/post/origin-rebasing-space/)).

Addresses are already BigInt. The standing rule from here:

> **Never convert an absolute address to a float. Only ever an offset from
> the current cell.**

Without this, deep IPv6 descent visibly jitters and then quantises. With it,
§1 and §2 are structurally possible rather than merely plausible.

Deferred until measured: a
[logarithmic depth buffer](https://cesium.com/blog/2018/05/24/logarithmic-depth/),
which large-scale scenes need once one frame spans many orders of magnitude.
Not needed yet; noted so it is not a surprise later.

Rejected: [Droste / complex-log self-similarity](http://roy.red/posts/droste/).
It is the one technique researched that is a *lie* — it fabricates detail
that is not there, which breaks the epistemic rule in §4. It is also
unnecessary: real address space is genuinely self-similar because it is
genuinely recursive.

---

## 4. Four grades of truth, and the material says which

The owner asked for generated content "displayed as not being ground truth".
A text disclaimer is the weak form. This is the strong one.

| | what it is | how it is drawn |
|---|---|---|
| **Measured** | our own edge saw this address | amber; the only one |
| **Answered** | RIPEstat replied about this block | lit, solid, **reflects** |
| **Derived** | provable from arithmetic + shipped registry tables; no lookup, still true | lit, cooler, **reflects** |
| **Imagined** | generated from the address as seed | wireframe, unlit, **the floor does not reflect it** |

**Real things cast light and have a reflection. Imagined things are line
drawings that the floor refuses to acknowledge.**

This is the load-bearing idea of the whole document. It needs no words, it
cannot be misread, it reuses machinery that already exists (planar
reflection, light pools), and it is *more* beautiful than the honest-but-
wordy version: a ghost city standing on a mirror that shows nothing.

It also keeps the extension inside the locked rule in
`beauty-needs-a-referent`: a generated inhabitant always stands in a location
that is really named, so there is never pure fiction on screen.

## 5. The address is the seed

No Man's Sky does not store its universe. Every planet is derived from its
coordinates through a **64-bit seed**, deterministically — same seed, same
planet, forever, which is why you can fly back and find it as you left it
([procedural generation](https://nomanssky.fandom.com/wiki/Procedural_generation)).
Minecraft is the same trick with a world seed.

An IPv6 address is **128 bits**. No Man's Sky has 1.8 x 10^19 seeds. IPv6 has
3.4 x 10^38 — **18 quintillion times as many.** And unlike a game's
coordinates, this seed space is not invented: it is the real numbering of the
real internet, and the visitor arrived already holding one of them.

So generation here is not a gimmick bolted on. It is the most natural thing
the material can do. Two people who visit the same address see the same
place. Come back next year, it is the same. That stability is the entire
reason No Man's Sky reads as a universe rather than as noise, and it is free
here.

**Decision (owner): ghost *networks*, not terrain, and no invented names.**
What gets generated is network shape — prefix subdivision, host clusters, a
peering figure — seeded by the address but **shaped by real distributions**
(prefix-length and AS-degree, from the `ris-asns` data that
`scripts/ip-build-asn-field.py` already fetches). A ghost is a plausible
inhabitant drawn from how networks actually are.

Rejected: generated holder names and AS numbers. Invented names sitting next
to real ones is the riskiest thing available, even marked. Rejected:
landscape-style terrain — prettier and more varied, but it drifts off the
referent.

## 6. Tier 3 is large, true, and free of lookups

Before any generation, a great deal of the space is **genuinely knowable with
zero network calls**, because it ships as static data.

- [IANA IPv4 registry](https://www.iana.org/assignments/ipv4-address-space/ipv4-address-space.txt)
  — all 256 /8s and which RIR holds each. **256 rows.**
- [IANA IPv6 unicast assignments](https://www.iana.org/assignments/ipv6-unicast-address-assignments/ipv6-unicast-address-assignments.txt)
  — 38 allocated entries and 13 reserved, covering the whole of `2000::/3`.
  APNIC holds `2400::/12`, RIPE `2a00::/12`, ARIN `2600::/12`, LACNIC
  `2800::/12`, AFRINIC `2c00::/12`. **The entire IPv6 internet's top-level
  structure is 51 rows.**
- RFC 6890 special-use ranges — see §7.
- [NRO delegated-extended stats](https://www.apnic.net/about-apnic/corporate-documents/documents/resource-guidelines/rir-statistics-exchange-format/)
  — every allocation the five RIRs have made, with country.

### Measured, 2026-09-16

Source: `https://ftp.ripe.net/pub/stats/ripencc/nro-stats/latest/nro-delegated-stats`
(56.8 MB). Records with status `allocated` or `assigned`, range-merged on
equal (RIR, country), delta-varint packed as (gap, length, payload).

| | records | merged | packed | gzipped |
|---|---|---|---|---|
| IPv4 | 261,257 | 143,466 | 655 KB | **204 KB** |
| IPv6 | 70,590 | 68,863 | 1.9 MB | **87 KB** |
| total | | | 2.6 MB | **291 KB** |

240 countries.

**291 KB is too much for the first paint and fine deferred.** It loads on the
same trigger as the RIPEstat lookups — when the visitor moves off Home — so
arrive / copy / leave still talks to nobody but our own edge. The small
tables above (a few KB) ship inline and name the whole space coarsely from
the first frame, with the fine dataset upgrading it on arrival.

Reproduce with `scripts/ip-build-space-field.py` (not yet written).

## 7. Landmarks: the Minecraft loop

Minecraft's hook is not the terrain, it is that the terrain *occasionally
contains something*. The equivalent here costs one small table, and every
entry is true with no lookup:

- **`240.0.0.0/4`** — 268 million addresses reserved in 1981 for a future
  that never arrived. Still reserved.
- **`127.0.0.0/8`** — 16.7 million addresses that all mean *here*.
- **`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32`** —
  addresses that exist only in documentation. Nothing is there, and nothing
  may ever be there.
- **`100.64.0.0/10`** — carrier-grade NAT. Where a phone probably lives.
- **`2002::/16`** — 6to4. A bridge built between the two internets, then
  abandoned.
- **`10/8`, `172.16/12`, `192.168/16`, `fc00::/7`, `fe80::/10`** — the
  private ranges, which exist simultaneously in millions of buildings.

### Recognisable landmarks (owner, 2026-09-16)

> *"you can use some familair things ... like akamai, or google, or china
> great firewall"*

These split across the tiers, which is the best argument for the tier system
in this document.

**Tier 2, fully true** — Google Public DNS `8.8.8.8` /
`2001:4860:4860::8888`; Cloudflare `1.1.1.1` / `2606:4700:4700::1111`;
Quad9 `9.9.9.9`; Akamai; and the thirteen root nameservers `a` through `m`.

**Build rule: ship only the address, never the label.** The holder is
confirmed through the same RIPEstat path that names every other block. A
landmark earns its name through the same instrument as everything else, and
if the lookup disagrees with the expected label, **the lookup wins and the
page says so.** This keeps a hardcoded table from silently rotting into
fiction as the internet is re-delegated.

Akamai is the strongest of the three: a CDN's whole purpose is being
everywhere, so its space is genuinely scattered and wandering keeps bumping
into it. That is a discovery which teaches something real about the shape of
the internet.

Note: `k.root-servers.net` is `193.0.14.129` — RIPE NCC's own space, next
door to the `193.0.6.139` fixture used throughout development.

**Tier 4, illustrated** — the Great Firewall. It is the thing people most
expect to find on a map of the internet, and **it cannot be found there,
because it is not a place.** It is something that happens to traffic at a
border. But the territory *is* real, and is already in the §6 dataset. So:

- the region states *APNIC · CN · allocated* — tier 3, hard truth, no lookup
- the firewall is drawn as an illustrated behaviour at that boundary, in
  ghost material, with a line saying it is a behaviour and not a location

The honest version is more interesting than the naive one. Someone goes
looking for the famous wall, finds the territory genuinely there, and learns
that the wall is not a thing you can point at.

---

## 8. What this costs, and where it goes in the plan

This is **its own phase, not a slice of phase 4** — provisionally phase 4.5,
after the network ladder and ahead of the inward half, because the ghost tier
needs the ladder's real-network vocabulary to have something to imitate.

Order within it, each step independently visible:

1. **Ring layers + floating origin + per-family `MAX_AXIS`.** Mostly a
   refactor of code that exists. Makes the depth true.
2. **Tier 3 small tables**, inline: IANA /8s, IPv6 unicast, RFC 6890. A few
   KB, and the whole space names itself coarsely from the first frame.
3. **Tier 3 full dataset**, deferred, with `scripts/ip-build-space-field.py`.
4. **Landmarks**, address-only, labels earned by lookup.
5. **Tier 4 ghosts**: unlit wireframe, no reflection, seeded by address,
   shaped by `ris-asns` distributions.

Steps 1-4 add no fiction at all. If step 5 is ever cut, everything before it
still stands on its own, and the space is still four times deeper and almost
entirely named.

## Sources

- [Shepard tone](https://en.wikipedia.org/wiki/Shepard_tone)
- [Floating origin](https://en.wikipedia.org/wiki/Floating_origin) ·
  [Spatial rebasing: an Unreal Engine odyssey](https://gamedevtricks.com/post/origin-rebasing-space/)
- [A Design Space for Multiscale Visualization](https://arxiv.org/pdf/2404.01485)
- [Powers of Ten](https://www.johngrimwade.com/blog/2018/01/29/powers-of-ten/)
- [Infinite ground plane using GLSL shaders](https://github.com/martin-pr/possumwood/wiki/Infinite-ground-plane-using-GLSL-shaders)
- [Cesium: hybrid multi-frustum logarithmic depth buffer](https://cesium.com/blog/2018/05/24/logarithmic-depth/)
- [Implementing the Droste effect in WebGL](http://roy.red/posts/droste/) (rejected)
- [No Man's Sky procedural generation](https://nomanssky.fandom.com/wiki/Procedural_generation) ·
  [The algorithms of No Man's Sky](https://www.rambus.com/blogs/the-algorithms-of-no-mans-sky-2/)
- [IANA IPv4 address space registry](https://www.iana.org/assignments/ipv4-address-space/ipv4-address-space.txt)
- [IANA IPv6 unicast address assignments](https://www.iana.org/assignments/ipv6-unicast-address-assignments/ipv6-unicast-address-assignments.txt)
- [RIR statistics exchange format](https://www.apnic.net/about-apnic/corporate-documents/documents/resource-guidelines/rir-statistics-exchange-format/)

Routing and delegation data by courtesy of the RIPE NCC and the NRO.
