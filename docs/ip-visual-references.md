# ip — visual reference states

**Purpose:** a manual golden-screenshot procedure. There is no screenshot
testing framework in this repo and none was installed. Everything below is
reproducible by hand in a browser.

Written 2026-09-17. Each description is of the state **as actually observed
on that date**, not of an intention.

---

## How to reproduce any state

```
Local server: .claude/launch.json config "webapps", port 8766, repo root
URL base:     http://localhost:8766/apps/ip/
```

| parameter | effect |
|---|---|
| `?ip=<address>` | drive a fixture address instead of the edge |
| `&renderer=2d` | force the Canvas 2D fallback |
| `&cb=<n>` | cache-buster; the pane caches `index.html` aggressively |

Driving the axis from the console: `__ip.axis(v)`. Travelling:
`__ip.travel('8.8.8.8')`. Full surface is listed in `CURRENT_STATE.md`.

**Wait ~5 s after first moving the axis** before judging any field state —
the RIPEstat lookup and the 439 KB registry file both load on that trigger.

---

## The reference states

### R1 — Home, IPv4 *(the main screen)*

```
?ip=193.0.6.139
```

Address large, centred, cream, with `COPY` beside it. One **amber** point at
the origin inside the polar reticle, with an amber ground pool. Dark blue-
black field, receding grid, dashed rings. `ABOUT` bottom right; `HOME` and
`BACK` hidden.

**Intentional:** the address is the largest thing on screen and arrives in
the first paint. Amber appears exactly once.
**Regression if:** the address is not first, anything sits in front of it, or
amber appears anywhere else.

### R2 — The announced block

```
?ip=193.0.6.139   then __ip.axis(0.92)
```

Plate reads `193.0.0.0/21` / `AS3333 · RIPE NCC` / `2,048 addresses · this
network announces 6 blocks · 4,608 addresses · allocated 1993, older than
19% of the space anybody holds · RIPE NCC · NL`. A bright lattice slab on the
plate with a rim and corner lamps; the visitor's own mark amber with a leader.

**Intentional:** every number sized against something. `RIPE NCC` is a
touchable query word.
**Known imperfection:** the block renders hot; `spread()` reduced it, it is
not solved.

### R3 — A field with era brightness *(visually distinctive)*

```
?ip=193.0.6.139   then __ip.axis(1.9)
```

Plate: `193.0.0.0/12` / `4,096 blocks of /24, and one of them is yours · 49
countries, mostly SE · 1992–2025`. A 64×64 grid of marks of **visibly
differing brightness** — that variation is allocation age, and unallocated
cells are darkest.

**Intentional:** age is brightness, never hue. `SE` is touchable.
**Regression if:** every cell is the same brightness (the registry failed to
load, or era shading was removed), or age is drawn as a colour.

### R4 — All of IPv4

```
?ip=193.0.6.139   then __ip.axis(2.6667)
```

Plate: `All of IPv4` / `4,294,967,296 addresses · 4,096 blocks of /12 · 111
countries, mostly US · 1983–2026 · 14% held by nobody`. Visible texture and
structure across the whole plate.

**Regression if:** the sub-line lost the country/era mix (this broke once —
`rungPlate` read the mix before computing it).

### R5 — Travelled away *(signature interaction)*

```
?ip=193.0.6.139   →  __ip.axis(1.67)  →  wait 5 s  →  __ip.travel('18.0.0.0')
```

Plate names MIT's block, `AS3 · Massachusetts Institute of Te…`, and **`…
addresses from yours · a different network from yours`**. `BACK` and `HOME`
both appear. The compact `HOME · 193.0.6.139` marker stays top-left.

**Intentional and load-bearing:** **there is no amber anywhere in the frame**,
because the visitor's address is not in this block. That absence is what
makes the distance mean something.
**Regression if:** amber appears, the camera moves on its own when the
lookup lands, or the big centred address returns while away.

### R6 — A query active

```
R3, then click the touchable `SE` in the plate
```

Plate note: `Showing SE · 1,962 ranges · 31,306,528 addresses · touch it
again to stop`. Swedish blocks brighten into a legible **shape**; everything
else dims but is still drawn.

**Intentional:** a highlight, never a filter — the unmatched stay visible
because hiding them would be the map lying.
**Regression if:** non-matching cells disappear, or the match blows out into
a white blob (that is `spread()` regressing).

### R7 — Canvas 2D fallback

```
?ip=2a00:1450:4009:81f::200e&renderer=2d
```

Same scene, flatter: no bloom, no reflection, sprites instead of HDR points.
Plate identical.

**Regression if:** it does not draw, or `__ip.renderer()` is not `"2d"`.

### R8 — No renderer at all *(error state)*

Cannot be produced by a URL. Temporarily make every shader compile report
failure — patch `WebGL2RenderingContext.prototype.getShaderParameter` to
return `false` for `COMPILE_STATUS`, **and** make `getContext('2d')` return
`null` — in a copy of `index.html`. **Delete the copy afterwards.**

Expected: the **address still loads and Copy still works**; the plate and
companion still work; one quiet line at the bottom reads *"No picture: this
browser would not give it the graphics it needs. Everything written here is
unaffected."*

**Intentional:** not an apology and not a dialog. **Regression if:** the
address fails to load — that is the founding promise breaking.

### R9 — IPv6 depth

```
?ip=2a00:1450:4009:81f::200e   then __ip.axis(5.33) and __ip.axis(10.42)
```

At 5.33: `2a00:1450:4009:81f::/64` / `all of it IE · 2009`. At 10.42:
`2000::/3` / `global unicast · … 21 countries, mostly US · 1999–2024 · **99%
held by nobody**`.

**Intentional:** the IPv6 rail is visibly ~2× the IPv4 rail and carries ~10
ticks against IPv4's 2. That difference is the size gap made furniture.

### R10 — Address unavailable

```
(no ?ip=, and no deployed edge function)
```

*"Not available"* in cold blue, `COPY` gone, and *"This page could not read
your address from its own edge, and it will not ask anyone else for it."*

**Intentional:** the refusal is the product. **Regression if:** it ever falls
back to a third-party lookup.

---

## Procedure for capturing goldens by hand

1. Run the `webapps` preview server.
2. Set the window to a fixed size and record it in the filename.
3. Visit each state above in order; wait 5 s after the first axis move.
4. Screenshot full-window.
5. Save as `docs/visual-goldens/<date>/R<n>-<slug>-<WxH>.png`.
6. Note the renderer (`__ip.renderer()`) and the address used.

Compare a later run **state by state against the descriptions above**, not
pixel-by-pixel: the grain is multiplied noise and the parallax follows the
pointer, so exact pixel equality is not expected and is not the test.
