# Tide — build plan (v1, DONE — live 2026-09-13)

**Status:** phases 0–5 below are built and deployed (`apps/tide/`, commits
`7b78f0e` + `ed61b14`). The next work is **`tide-v2-plan.md`** — making the
readout useful to people who actually use tides (today's curve, the week,
datum/units/rate, daylight windows, phone-first layout). Start there.


A map to build from, not a spec. Brief: `tide-brief.md`. Data:
`tide-data-research.md`. Look: `tide-art-direction.md` (must be LOCKED
before phase 1 starts). Each phase lands something you can open and look
at; commit per phase, message references the art-direction doc.

## What it is (from the brief)

One page. A Canvas 2D globe seen from the moon's point of view, the
world's sea rising and falling under it in real time from a shipped tide
model; your place found by device location or search; a readout with the
next high and low water, the state in words, spring/neap and the moon;
a scrub from three days ago to fifteen days ahead. NOAA official
predictions where a US station is close, Open-Meteo's model estimate
everywhere else, a hand-off line to official tables always. Fully usable
offline on cached data. Tier 1, no exceptions.

## Architecture at a glance

- **Lives at** `apps/tide/`, served at `/tide/`, deploys with
  `.\scripts\deploy-app.ps1 -Name tide` (human-run).
- **Files:** `index.html`, `tide.css`, `tide.js`, `lib/astronomy.js`
  (copied from Tonight, MIT), `data/tide-field.bin` + `data/tide-field.json`
  (EOT20 1°, CC BY 4.0), `data/land-110m.json`, `data/coast-50m.bin`,
  `data/noaa-stations.json`, `fonts/` (Fraunces + Space Grotesk, OFL, with
  licence files), `README.md`. Optional `telemetry.js` copied from
  `apps/_shared/`, dormant.
- **Build-time scripts** (repo `scripts/`, not shipped, run once, Python
  with `xarray`/`netCDF4` for EOT20; Node or Python for the rest):
  `tide-field-from-eot20.py`, `tide-coast-from-naturalearth.py`,
  `tide-noaa-stations.py`. Each writes into `apps/tide/data/` and prints
  the output sizes. Record the exact EOT20 file versions in the README.
- **Runtime network (all optional, all cached):** Open-Meteo marine
  (15-minutely sea level, −3 d … +15 d), Open-Meteo geocoding (search
  box), NOAA predictions + harcon (only when a US station is chosen).
- **No framework, no build step, no CDN.** `node --check` on `tide.js`.

## Data sources (real endpoints)

| Need | Source | Notes |
|---|---|---|
| sea level at a place | `marine-api.open-meteo.com/v1/marine?latitude=…&longitude=…&minutely_15=sea_level_height_msl&past_days=3&forecast_days=15&timezone=auto` | keyless, CORS; cache 6 h keyed by 2-dp lat/lon |
| official US predictions | `api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&station=ID&begin_date=YYYYMMDD&range=432&datum=MLLW&units=metric&time_zone=lst_ldt&interval=hilo&format=json` | keyless, CORS; cache 24 h per station |
| US harmonic constants | `…/mdapi/prod/webapi/stations/ID/harcon.json?units=metric` | keyless, CORS; cache indefinitely |
| name → lat/lon | `geocoding-api.open-meteo.com/v1/search?name=…&count=5` | as Tonight |
| global field | shipped `data/tide-field.*` | EOT20, 8 constituents (or 4 if size bites) |
| moon, sun, phase, rise/set | `lib/astronomy.js` | local |
| land, coast, distance-to-sea | shipped Natural Earth derivatives | local |

## Phases

### Phase 0 — data prep + tide maths (nothing visible yet, but testable)
- Scripts above; outputs in `apps/tide/data/`; sizes recorded.
- `tide.js` gets the **harmonic prediction core**: constituent table
  (speed, Doodson numbers), astronomical arguments V0 at an epoch, nodal
  factors f and u (Schureman), `heightAt(cellOrStation, t)`.
- **Test:** predict Boston (8443970) from its NOAA harcon for today and
  compare to the NOAA hi/lo endpoint: turning points within 10 min,
  heights within 0.15 m. Same for one Pacific and one Gulf (diurnal)
  station. A tiny `test/` page or a Node script; keep it in the repo.
- Copy `lib/astronomy.js`; verify sub-lunar point against a known moon
  transit (e.g. moon on the meridian at Greenwich → sub-lunar longitude
  ≈ 0).

### Phase 1 — the globe (viewable)
- Canvas 2D orthographic globe centred on the sub-lunar point, land
  silhouette from 110m, day–night terminator, moonlight lift, the moon
  disc. Drag with inertia and ease-back; wheel/pinch zoom toward a point.
- The **field**: every ocean cell's η(t) at the current time, drawn as
  luminance per the palette; bilinear smoothing at draw. Real time: the
  wave moves ~15° of longitude per hour, so at 1× the motion is felt over
  minutes; a temporary dev speed control is fine (removed by phase 3).
- Reduced motion: snap instead of ease-back; no inertia.
- **Checkpoint:** squint test passes; amphidromic points visible in the
  North Atlantic and Pacific; Fundy visibly breathes harder than the Med.

### Phase 2 — your place (viewable, useful)
- Location: device geolocation (permission prompt only on tap, never on
  load) or the search box; saved in `localStorage` only.
- Distance-to-coast; inland message and nearest-coast fallback.
- Source choice: NOAA if a station is ≤ 15 km and coastal, else
  Open-Meteo. Fetch, cache, parse; turning points from the 15-minute
  series with parabolic refinement.
- The **readout** per the spec (rows, tabular numerals, source line,
  hand-off line by country). Units by locale, override later.
- Offline: render from cache; if no cache and no network, the readout says
  so in one line and the globe still runs.
- **Checkpoint:** three places — Boston (NOAA), Brighton (model), Kansas
  (inland) — all read correctly; unplug the network, reload, still works.

### Phase 3 — time (the linger)
- Scrub −3 d … +15 d at the bottom; the readout and the globe follow.
- Play at 1 h/s; the moon disc and terminator move; spring/neap swelling
  visible across the fortnight. Loops back to where it started.
- Camera: zoom to your coast on place set (once), moon-disc tap resets.
- Remove the dev speed control.
- **Checkpoint:** play through 15 days at Brighton; the range visibly
  grows and shrinks with the phase shown on the disc.

### Phase 4 — chrome, art-direction pass, accessibility
- Fonts self-hosted; type scale; the "rising/falling hairline" borrow.
- Full art-direction checklist at ≥ 3 states (globe at load, place set
  in daylight, place set at night, inland).
- Accessibility floor: keyboard for scrub (arrows), search, play; focus
  states; 44 px targets; ~320 px layout; safe-area insets; contrast
  check against high-water-in-daylight.
- `prefers-reduced-motion` end-to-end.

### Phase 5 — finish
- Copy: the about panel (what it is, what it is not, sources with
  attribution lines: EOT20 CC BY 4.0, Natural Earth, NOAA, Open-Meteo).
- `README.md` with design-direction pointer, status, **Cost** line
  ($0 + the exact runtime calls) and **To remove**.
- `PROJECT_STATE.md` entry; landing page line in
  `hosting/site-root/index.html`; `node --check`; no console errors.
- Definition-of-done pass from `building-a-new-app.md` §3. Do **not**
  deploy; hand the human the deploy command.

## Decisions resolved up front

- **Name:** `tide` (folder, path, title). One word like Until and Tonight.
- **Datum:** everything shown as height relative to the average sea level
  at that place (Open-Meteo is MSL natively; NOAA MLLW converted with the
  station's MSL offset from `datums.json`, fetched once and cached). Never
  mix datums on one curve.
- **Units:** metres by default; feet when the browser locale is `en-US`.
- **Inland:** ≥ 25 km from the nearest 50m coastline vertex → "You're
  about N km from the sea. Nearest coast: …" and the readout switches to
  that coast point.
- **Field size:** ship 8 constituents if `data/` stays under ~1.5 MB total
  gzipped; otherwise 4 (M2, S2, K1, O1).
- **Location permission:** never requested on load; only on "Use my
  location".
- **Sound:** post-v1, off by default. Not in the plan.
- **Telemetry:** ship `telemetry.js` dormant, as Tonight.

## Risks and where they bite

- **Tide maths correctness** (phase 0). Nodal corrections and phase
  conventions are where every tide implementation goes wrong. The NOAA
  comparison test is the gate; don't start phase 1 until it passes.
- **Field rendering cost** (phase 1). 360×180 cells × 8 constituents per
  frame is fine in JS if η is computed once per cell per frame (~0.5 M
  cos calls); precompute per-constituent phase per frame and reuse. Cap
  at 30 fps; 15 fps under reduced motion. Test on a phone.
- **Open-Meteo estuary error** (phase 2). Expect the model to be off in
  rivers and enclosed harbours; the "model estimate" label and the
  hand-off line are the mitigation, not a fix.
- **Data size** (phase 0). Natural Earth 50m and the field are the two
  large files; quantise to binary before reaching for anything cleverer.
