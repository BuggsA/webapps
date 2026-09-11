# Tide — brief

Read `building-a-new-app.md` first (house rules), then this, then
`tide-data-research.md` (verified endpoints), `tide-art-direction.md`
(direction — pick pending, see its status line) and `tide-build-plan.md`.

**One sentence:** The moon moving the ocean, on a globe you can turn, and
the next high and low water at your beach — for anyone who lives near, or
loves, a coast.

**Thesis:** *The tide is the moon, made visible.* Every screen answers a
practical question (when does the water turn here?) inside a picture of
the whole planet's sea breathing under the moon. If a feature does not
either sharpen the practical answer or deepen the picture, it is out.

**Why this app (the goal behind the goal):** free, beautiful, no ads, no
account, and genuinely useful every day to a large share of humanity. The
incumbents for "when is low tide" are ad-landfill sites and harbour
tables. The wonder — the tidal wave circling the basins, the still points
mid-ocean — has never been shown to the public well.

**Must-haves (v1):**
- A **globe** (Canvas 2D, orthographic, drag to turn, pinch/scroll to zoom
  toward the coast) with land, the day–night terminator, the **sub-lunar
  point and the moon**, and the **global tide field** animating in real
  time from the shipped EOT20 constituents: sea surface rising and
  falling per cell, the semidiurnal wave visibly travelling, amphidromic
  points visible as still centres.
- **Your place** (device location or search box, saved in `localStorage`
  only): a card with **next high and next low** ("turns at 14:10"), the
  current state in words ("falling, 2 h to low"), a 24–48 h curve, the
  tide range today, **spring or neap**, moon phase, sun and moon rise/set.
  Heights shown as above/below the average sea level here, metres or feet
  by locale.
- **Source honesty:** NOAA official predictions when a station is close
  (labelled by name), otherwise Open-Meteo labelled "model estimate"; and a
  **hand-off line** to the official tables for this coast on every place
  card. Never a navigation or safety claim.
- **Inland grace:** if the place is far from the sea, say so, and show the
  nearest coast instead of pretending.
- **Time:** opens on *now*; a scrub covers **−3 d … +15 d**; a play button
  runs the globe at 1 h/s so the wave can be watched chasing the moon.
- **Offline:** last fetched series and place cached; the globe field and
  astronomy are local, so the globe works with the network unplugged, and
  the place card works for up to 15 days from the last successful fetch.
- The house accessibility floor, in full, including a real
  `prefers-reduced-motion` path (no ambient sea animation; the field still
  updates on scrub).

**Nice-to-haves (later phases / post-v1):**
- Tap anywhere on the coast to get a card for that spot (not just "your"
  place).
- A "this month" strip: the spring–neap rhythm as a 30-day ribbon with the
  moon phases along it.
- Sound: the tide at your place as a slow tone that rises and falls with
  the water (off by default; fits the linger).
- A second saved place; unit override.
- Canadian CHS stations if their API proves CORS-open.

**Non-goals (explicitly out):**
- Anything a mariner would rely on: no currents, no under-keel clearance,
  no surge, no warnings. The app points at official sources for those.
- Tide *tables* as a product (printable month grids). Tables are the
  incumbent; this is the picture.
- Sea temperature, waves, wind, weather. (Separate app if ever.)
- Historical archives, climate trends, sea-level rise.
- Any account, sharing, or social layer.

**Look/feel:** [x] run the full art-direction pass  ·  [ ] utilitarian, skip it
The whole product is the look. Hard constraints: must not read as a
weather app, a marine-chart clone, or a generic dark-mode dashboard with a
globe in it. Sibling of Tonight (same craft, same chrome discipline) but
must *not* be Tonight-with-water — different palette engine, different
composition logic. See `tide-art-direction.md` for the divergent set,
the recommendation and the banned list.

**Data / network:** all keyless + CORS-open, verified 2026-09-10 in
`tide-data-research.md`:
- `marine-api.open-meteo.com/v1/marine` — `minutely_15=sea_level_height_msl`,
  `forecast_days≤15`, `past_days≤92`.
- `api.tidesandcurrents.noaa.gov` — predictions (`interval=hilo` and `6`),
  `harcon.json` (US reference stations).
- `geocoding-api.open-meteo.com/v1/search` (as Tonight).
- Shipped in `data/`: EOT20 constituents downsampled to 1° (CC BY 4.0),
  Natural Earth land 110m + 50m (public domain), NOAA station index
  (~150 KB). `lib/astronomy.js` copied from Tonight (MIT).

**Tier:** 1 (static). No exception needed anywhere.

**Name / path:** `apps/tide/` served at `/tide/`. (One word, like Until and
Tonight; rename to `tides` is a folder rename if preferred — decide before
phase 1 so the docs never drift.)
