# Tide — v2 plan: useful to the people who actually use tides (handoff)

**Status 2026-09-13.** v1 is live at `https://<DISTRIBUTION_DOMAIN>/tide/`
(commit `ed61b14` deployed; landing page re-synced). v1 is the picture —
the moon's view of the Earth with the real tide as light on water — plus a
minimal readout. **It is beautiful and it does not yet earn a daily visit
from a swimmer, an angler, a dog walker or a boater.** This document is
the plan to fix that, written to be picked up cold by a different model.

Read in this order: `building-a-new-app.md` (house rules) →
`tide-brief.md` → `tide-art-direction.md` (LOCKED; every visual change
runs its checklist) → `tide-data-research.md` (verified endpoints) →
`tide-build-plan.md` (what v1 did) → this file → **`tide-panel-research.md`**
(2026-09-15: the readout blocks small screens; three progressive-
disclosure shapes researched against real precedent — **decided and
built 2026-09-16, Option C**: glance stays permanent, the rest is one
on-demand "Detail" toggle. Read before touching phase 7 — phase 7's
week rows have a home now, inside that same toggle, not a new panel) →
**`tide-visibility-research.md`** (2026-09-16: can't actually tell high
from low tide by looking at the globe, and the moon's location/pull
isn't legible even though its phase is — **built same day**: raking-
light relief shading + the moon as a tracked marker) →
**`tide-tap-select-research.md`** (2026-09-17: long-press the globe to
set your place instead of typing every time — researched, not decided,
recommends long-press + a tethered preview over a toggle mode).

---

## 1. What exists (so you don't rediscover it)

`apps/tide/` — Tier 1 static, no build step, no CDN, no keys.

| File | What |
|---|---|
| `index.html` | canvas `#globe`; `#moon` hit target; `#readout` (rows); `#locate` prompt; `#controls` (Now / Play / scrub / clock / where / about); `#about` |
| `tide.css` | chrome per art direction: words on the field, hairlines, Fraunces + Space Grotesk tabular numerals; narrow layout wraps controls to two rows |
| `tide.js` (~950 lines) | see its **MAP OF THIS FILE** header; sections below |
| `lib/harmonics.js` | harmonic prediction core (Doodson args + Schureman nodal f/u, 37 constituents); browser global `Harmonics` + Node `module.exports` |
| `lib/astronomy.js` | astronomy-engine (MIT): sub-lunar/sub-solar points, phase, rise/set |
| `data/tide-field.bin` + `.json` | EOT20, 1°, 8 constituents; per constituent uint16 amp (mm) then uint8 phase (360/256°); rows south→north, `idx = row*360 + col`, lon0 −179.5, lat0 −89.5. 1.55 MB (CloudFront serves it uncompressed) |
| `data/land-110m.json`, `data/land-50m.bin` | Natural Earth land rings (2-dp JSON / int16×100 binary, `TCST` header) |
| `data/noaa-stations.json` | `[id, name, lat, lon, type R/S, state, reference_id]` × 3,499 |
| `telemetry.js` | dormant (`ENDPOINT = ''`) |

**tide.js in one paragraph.** `state.t` (ms UTC) is the master variable.
Each frame: `subPoint(Moon/Sun)` → camera target (`view.mode` `'moon'`
follows the sub-lunar point with a drag offset that eases back over 4 s;
`'place'` holds `view.pan` at `view.zoom`) → `stepCamera` eases `cam` →
`computeField(t)` sums the constituents into `eta[64800]` once per
simulated minute → `paint()`: a low-res per-pixel pass (`paintSea`) over
the visible disc computes lat/lon per pixel (fast `fasin`/`fatan2`),
samples the **land raster** (`landMask`, 0.125° equirectangular, built
once from the rings by `buildLandMask` — bilinear, so the coast is
antialiased), samples `eta` bilinearly, maps height→luminance through
`ETA_LUT` and one of three OKLCH LUTs (sea 235°, land 260°, warm 70°),
applies day/night (`sunCam`), moonlight lift and limb darkening; then
upscales to the main canvas, strokes the 50m coast hairline when
`cam.zoom ≥ 2` (`projectRings` → `paintCoast`), the place mark, a scrim
under the readout, grain, the moon disc. The readout (`updateReadout`)
derives from `state.series` — either NOAA hi/lo (`turns`, MLLW minus the
hi/lo mean) or Open-Meteo 15-minute samples (`pts` + extrema) — with
`heightAt(t)` (linear on pts, cosine between turns). Time: `live` /
`hold` / `play` (1 h/s), scrub over `now0 −3 d … +15 d`.

**Verified numbers.** `scripts/tide-test-harmonics.js`: engine vs NOAA
official predictions within 12 min / 0.05 m at Boston, Pensacola, San
Francisco (Anchorage informational). Open-Meteo vs NOAA at Boston: turning
points within the 15-min sampling, amplitude ~7 % low.

**Gotchas already paid for (don't repeat):**
- Never project land polygons and fill with even-odd on the disc: a ring
  spanning all longitudes (Antarctica) clamped to the rim sweeps the whole
  disc and inverts the mask. That is why land is a raster now.
- NOAA subordinate stations (`type S`) have no MSL datum → request MLLW
  and subtract the mean of highs and lows (≈ MTL ≈ MSL).
- Open-Meteo returns a sea-level series for **inland** points (nearest
  ocean cell); the app's own distance-to-coast test decides.
- Open-Meteo `forecast_days` max is 15 (16 is rejected); `past_days=92`
  works; use `timeformat=unixtime`.
- SEANOE serves EOT20 as a 2.3 GB zip **nested** (`ocean_tides.zip`
  inside) with no HTTP Range support; the prep script wants the inner zip
  or an extracted dir. Some cells carry artefacts (S2 > 30 m) — clipped at
  the 99.95th percentile.
- The in-app preview browser caches `tide.js`/`tide.css` hard: after an
  edit run `await fetch('tide.js', {cache:'reload'})` then navigate, or
  swap the stylesheet `href` with a query string.
- Python in Git Bash cannot open `/tmp/...`; use `cygpath -w`.
- `aws` is not on PATH in Git Bash; deploys are PowerShell and human-run:
  `.\scripts\deploy-app.ps1 -Name tide`, landing page
  `.\scripts\deploy-site-root.ps1`.
- Frame budget: ~18 ms on a 2024 laptop at any zoom with a 90k-pixel
  budget. Untested on a real phone.

---

## 2. The problem, honestly

Open the live page as each of these people and ask "did it help me?":

- **Beach walker / dog walker / tide-pooler / beachcomber.** Wants: when
  today (and this weekend, in daylight) is the water lowest, how low
  compared with normal, how long the low lasts. Gets: four times in a
  list, a range number, "springs". No curve, no daylight, no week.
- **Swimmer / paddleboarder / parent at the beach.** Wants: is it coming in
  or going out, when is high water, is the water warm, is it safe-ish
  (not a safety product — but the state in words matters). Gets: state
  line, good. No curve, no water temperature.
- **Angler.** Wants: the week's highs and lows with heights, the turn
  times, springs/neaps rhythm, moon. Gets: four turns, moon line. No
  week.
- **Small-boat owner / kayaker.** Wants: heights on **chart datum** (MLLW
  or the local chart datum) because that is what the chart's soundings
  are relative to; when there is enough water at a ramp or over a bar.
  Gets: heights "about mean sea level", which is the wrong datum for them.
- **Someone crossing sand or a causeway.** Wants: how fast it is rising,
  the window. Gets: nothing about rate.
- **Everyone.** Wants it to load fast on a phone and put the answer above
  the fold. Gets: a 1.5 MB field before the sea moves, a globe that pushes
  the readout down on phones, and a readout that stops at four rows.

The globe stays. It is the reason to stay and the thing nobody else has.
But the order of the page and the depth of the readout must change so the
**answer comes first and the picture second**.

---

## 3. v2 goals, non-goals, rules

**Goal.** A person who needs the tide gets the answer in one screen, in
their datum and units, for today, tonight and the week — and then, if
they linger, the planet.

**Non-goals (unchanged from the brief).** Not a navigation or safety
product: no currents, no surge, no under-keel clearance, no warnings.
Every safety-adjacent line keeps the hand-off to official tables. No
account, no ads, no server.

**Rules.** Tier 1 stays. Art direction stays LOCKED: everything new is
rows, hairlines and tabular numerals written onto the field; a curve is a
hairline, not a chart with axes and gridlines; no cards, no boxes, no
icons beyond the moon. Accessibility floor holds (44 px targets, focus
states, reduced motion, 320 px). Each phase ships viewable and is
committed with a message that references `tide-art-direction.md`.

---

## 4. Phases

Order is by value per effort. Phases 6 and 7 are the whole difference
between "pretty" and "used"; do them first, ship, then continue.

### Phase 6 — Today's curve (the single biggest gap) — DONE 2026-09-13

Built in `apps/tide/tide.js` (CURVE section) + `.ro-curve` in
`tide.css` + `<canvas id="curve">` in `index.html`. A 36-hour sea-level curve in the readout: from 6 h before now to 30 h
after, drawn as one hairline on a small canvas inside `#readout` (or on
the main canvas under the readout — choose the small canvas: it stacks on
phones and is easy to size). Night shaded as a slightly darker band from
sunset to sunrise (from `riseSet(Sun)`). The present as a vertical
hairline in the accent colour with the current height beside it. Each
high and low labelled with time above/below and height (`+1.8 m`), in
tabular numerals. Tapping or dragging on the curve sets `state.t`
(`setMode('hold')`, same as the scrub) so the globe follows; **Now**
returns. Data: `series.pts` when present; for NOAA (turns only) sample
`heightAt` every 15 min. Datum/unit follow phase 8's setting.

- Files: `index.html` (a `<canvas id="curve">` between `#ro-state` and
  `#ro-turns`), `tide.css` (height 5.5rem, 3.4rem on short viewports),
  `tide.js` (`sizeCurve`, `nightBands`, `paintCurve`, `updateReadoutLite`
  + pointer-drag handlers, all in the new CURVE section; wired from
  `updateReadout` and the resize listener).
- **Built as:** the curve window is `state.t − 6 h … state.t + 30 h`,
  drawn as a hairline with a night wash (from `riseSet(Sun)` day-by-day,
  clipped to the window), the turning points from `s.turns` as dots with
  time+height labels, and the "now" mark in the accent colour with the
  live height. Dragging on the curve freezes the window at the values it
  had on pointerdown so the gesture reads as a fixed ruler (not a
  recentring one) — `updateReadoutLite()` repaints just the state line
  and the curve during the drag; the full `updateReadout(true)` runs on
  release, which recentres the window and refreshes the rows, moon/sun,
  and source line. `role`/`aria-label` were dropped in favour of
  `aria-hidden="true"`: the curve is a pointer-only progressive
  enhancement over the already-accessible rows and the keyboard-operable
  scrub, so a screen reader gets nothing new from it and nothing less
  without it.
- **Bug found and fixed while testing:** two turning points of the same
  type (~12h25m apart, both highs or both lows) landed close enough in
  a 320–340px-wide curve that their text labels overlapped into
  unreadable runs (`"4:58 PM −2.4ft5:10 AM −2.3ft"`). Fixed with
  per-row (above/below) last-label-right-edge tracking: a label that
  would collide is dropped and only its dot remains — verified by
  reading the actual rendered pixels, not just eyeballing a screenshot.
- **Also fixed (pre-existing, found in the same pass):** the short-
  viewport rule meant to hide the moon/sun lines,
  `.ro-sun, .ro-moon { display: none; }`, never matched anything — both
  elements carry `class="ro-line"` and only their `id` is `ro-sun`/
  `ro-moon`. Changed to `#ro-sun, #ro-moon`. Verified: at 375×420 CSS px
  the readout (place, state, curve, two rows, source, hand-off) now fits
  the viewport with zero scroll, where before the dead rule silently
  cost ~40px of vertical budget on exactly the phones that need it most.
- **Verified:** NOAA path (Wildwood) and Open-Meteo path (Brighton) both
  render correctly; drag-to-scrub moves `state.t` and the globe follows;
  pixel-level check that the night wash actually paints (alpha ≈0.30 at
  night x-positions, 0 at day x-positions); 320×690, 375×560, 375×480,
  375×420 all fit without scrolling; `paintCurve()` costs ~1.1 ms/call.
- Acceptance (met): at 320 px wide the place name, state line, curve and
  next two turns fit above the controls without scrolling; reduced
  motion: the curve only repaints on data/time changes, never on a
  timer, so nothing animates on its own.

### Phase 7 — The week

Below the curve, the next seven days as rows, one per day: the day name
(small caps), then that day's turning points in order: `05:41 ▾ −1.5`
style is banned (no glyphs) — use the row grammar already in use:
`5:41 AM  low  −1.5 m`, and mark daylight turns by setting the time in
`--chrome` and night turns in `--chrome-soft`. A final line: the lowest
low and the highest high of the next 14 days with their dates ("Lowest
water: Sat 21, 3:10 PM, −0.6 m"). Springs/neaps stays on the range line.
Rows collapse to today + tomorrow by default on short viewports with a
word control "This week" that expands them.

- Data: NOAA hilo already covers +16 d; Open-Meteo extrema cover +15 d.
- Acceptance: a person can plan a weekend low-tide walk from this screen
  alone.

### Phase 8 — Datum, units, rate

- **Datum.** A word control on the range line cycles `above mean sea
  level` → `above chart datum (MLLW)` → back, persisted in `localStorage`
  (`tide.datum`). For NOAA stations fetch `datums.json` once (cached
  indefinitely) and use the real MSL−MLLW offset; for the Open-Meteo path
  estimate MLLW as the mean of the lower low waters over the 92-day
  history that one extra `past_days=92&hourly=` call provides (cache 30
  days) and **label it "estimated chart datum"**. Every height on the
  page (state line, curve, rows) follows the setting.
- **Units.** A word control `m` / `ft` beside the datum, persisted
  (`tide.units`), replacing the locale guess as the source of truth
  (locale remains the first-run default).
- **Rate.** On the state line, when rising or falling: `rising · 0.4 m
  in the next hour` computed from the series (height at t+1 h minus
  height at t). Add "fastest part of the tide" only when the rate is
  within 10 % of the cycle's maximum. This is the line that matters to
  anyone on sand.
- Acceptance: a boater can read a NOAA station's numbers here and see the
  same values as NOAA's own page in feet on MLLW.

### Phase 9 — Answers: daylight windows, water temperature, calendar

- **Windows.** Two lines under the week: "Low water in daylight:" the
  next three daylight lows with date, time, height; and "High water in
  daylight:" likewise. Daylight = between civil twilight times (compute
  from astronomy-engine: `SearchAltitude(Sun, −6°)` or approximate with
  sunrise−30 min / sunset+30 min).
- **Water temperature.** Add `hourly=sea_surface_temperature` to the
  Open-Meteo marine call (same call, no extra request) and show "Sea
  15 °C" on the sun line. Skip when the field is null.
- **Add to calendar.** A word control "Add to calendar" that builds an
  `.ics` (next 14 days of highs and lows for this place as 0-minute
  events, plus the daylight-low windows) and offers it via a `data:`
  URL / `Blob` download. Works in real browsers; the in-app preview
  sandbox blocks downloads, so test by inspecting the generated text.
- Acceptance: the three questions in §2 for walkers, swimmers and anglers
  have a visible answer.

### Phase 10 — Layout for use, and first paint

- **Phone (≤ 640 px):** the page becomes a column: readout (place, state,
  curve, next turns, week) first, then the globe as a full-width square
  you scroll to, with the controls docked at the bottom. The moon-view
  opening flourish plays only when nothing is saved (first launch) and on
  "Just look". Body scrolls vertically; the canvas stays `touch-action:
  none` for drag. Desktop keeps readout-left / globe-right.
- **First paint.** Draw the globe with land and light immediately; load
  `tide-field.bin` after `land-110m.json` and the place series (it is the
  linger, not the answer). Pre-gzip the field: change
  `scripts/deploy-app.ps1` to upload `data/tide-field.bin` with
  `--content-encoding gzip` from a gzipped copy (1.55 MB → ~690 KB) —
  deploy-script change, human-run; document it in `DEPLOY.md`.
- **Places.** Up to three saved places; the place name in the readout
  becomes a word control that cycles them; "Change place" adds/replaces.
- Acceptance: on a 360 × 780 phone viewport the answer (state + curve +
  next two turns) is visible without scrolling and the field loads after
  it; Lighthouse-style check: no layout shift when the field arrives.

### Phase 11 — Trust and coverage

- **Official links by country.** Extend the hand-off table beyond US/GB:
  AU (BOM), CA (CHS), NZ (LINZ), IE (Marine Institute), FR (SHOM), ES
  (IHM), PT (IH), DE (BSH), NL (RWS), DK (DMI), NO (Kartverket), JP
  (JMA), ZA (SAN Hydrographic), IN (Survey of India), BR (DHN). Country
  comes from the geocoder (`country_code`); device location has none →
  pick by nearest NOAA station (US) else generic.
- **Model vs official.** When the place uses the model and a NOAA station
  is 15–40 km away, add a line "NOAA at <station>, 22 km: high 11:12,
  ours 11:00" once per day — makes the model's honesty visible.
- **Error note.** One sentence in the About panel and on the source line
  for the model path: "Open-coast estimate; harbours and estuaries can
  differ by 20–40 cm and 20–30 min."
- Acceptance: no coast in the world sees "your national tide tables"
  without a link if a public one exists.

### Phase 12 (post-v2, optional) — Sound

One slow tone following the place's height, off by default, a word
control "Listen". Only after everything above; the brief keeps it out of
v2 proper.

---

## 5. Decisions already made (do not reopen)

- The globe stays as the second screen, not the first, on phones.
- Heights: MSL default, chart datum optional (phase 8). Never mix on one
  curve.
- Curves are hairlines with labels, no axes, no gridlines, no fill.
- No icons beyond the moon; daylight vs night is expressed by colour
  weight, not glyphs.
- No weather, wind, waves, currents. Water temperature is the one
  exception because it rides on the existing call and swimmers ask for it.
- NOAA within 15 km wins over the model; the threshold stays.

## 6. Open questions for the human (answer before phase 8/10)

1. Datum default for NOAA stations: MSL (consistent everywhere) or MLLW
   (what NOAA's own pages and US charts show)? Recommendation: MLLW for
   NOAA places, MSL elsewhere, both switchable.
2. Should the phone layout keep any of the moon's view above the fold
   (a thin strip of the globe) or none? Recommendation: none; the answer
   owns the first screen.
3. Pre-gzip the field in the deploy script (touches the human-run
   script) — yes/no.

## 7. How to work on it

```powershell
# preview (story-app/.claude/launch.json has a "tide" entry; or plainly):
python -m http.server 8765 --directory C:\Users\you\Downloads\scratch-repo\webapps\apps\tide
# engine gate (network):
node scripts/tide-test-harmonics.js
# syntax:
node --check apps/tide/tide.js
# deploy (human, PowerShell, profile story-deploy):
.\scripts\deploy-app.ps1 -Name tide
.\scripts\deploy-site-root.ps1
```

Commit per phase; message references `docs/tide-art-direction.md`; append
a dated entry to `PROJECT_STATE.md`; update `apps/tide/README.md` status
and its Cost line if a new endpoint field is used. Do **not** deploy.
