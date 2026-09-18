# PROJECT_STATE

Living status file. Update it when something material changes.

## 2026-09-02 -- bootstrap

- Fresh repo created at `C:\Users\you\Downloads\scratch-repo\webapps`
  (separate from the frozen `story-app` repo).
- Subagent definitions written: `builder`, `researcher`, `deployer`.
  Frontmatter format (`isolation: worktree`, comma-form `tools:`,
  `model:`) confirmed valid against current Claude Code docs.
- Hosting stack **code** written (`hosting/`): one private S3 bucket
  (OAC, versioned, RETAIN), one CloudFront distribution (URI-rewrite
  function for path prefixes, 403->404), optional account-wide $10
  budget. Landing page + 404 in `hosting/site-root/`.
- Tier 2 template copied to `reference/` from story-app.

## 2026-09-02 -- hosting stack deployed

`WebappsHostingStack` CREATE_COMPLETE in `<AWS_ACCOUNT_ID>` / `us-east-1`.
Landing page live at https://<DISTRIBUTION_DOMAIN>/

- BucketName: `<APPS_BUCKET>`
- DistributionId: `<DISTRIBUTION_ID>`
- DistributionDomain: `<DISTRIBUTION_DOMAIN>`

Also mirrored (gitignored) in `hosting/.hosting-outputs.env`, which
`scripts/deploy-app.ps1` reads.

## 2026-09-02 -- until redesign (installation-grade)

- Full 5-phase redesign per `docs/until-redesign.md` (three research
  passes -> plan -> builder -> orchestrator tuning). Fraunces + Space
  Grotesk self-hosted (`apps/until/fonts/`, ~167 KB, SIL OFL); baked
  SVG grain; OKLCH ramp; Canvas2D pyramid bloom for lights/orbit;
  a raw-WebGL fragment-shader horizon (fog + marched god-rays + ACES)
  with the Canvas2D horizon kept as the reduced-motion / no-WebGL
  fallback. Still Tier 1, no runtime network.
- **Deployed?** No -- run `.\scripts\deploy-app.ps1 -Name until`.
- Note: `.claude/worktrees/agent-a444900e1c7e95828/` is an orphaned
  builder worktree dir (git no longer tracks it; a file handle blocked
  rmdir). Gitignored; safe to delete manually later.

## 2026-09-02 -- first app: until

- `apps/until/` built by the `builder` subagent from a full spec: a
  calm single-page countdown. Three canvas visualizations (lights /
  orbit / horizon), live updates, past-event reversal, "keep this
  open" ambient mode, `localStorage` persistence. Tier 1, no network.
- Orchestrator review + fixes: mobile viewport overflow in `.setup`
  (grid track), added a data-URI favicon (no `/favicon.ico` 403 on
  CloudFront), hardened the ambient control-hide with `visibility`.
  Verified in-browser: opening screen (desktop + mobile), all three
  modes, past event, ambient.
- Landing page (`hosting/site-root/index.html`) updated to list it.
- **Not yet deployed.** Run `.\scripts\deploy-app.ps1 -Name until`,
  and re-sync `site-root/` for the updated index.

## 2026-09-06 -- second app: tonight (in progress)

- `apps/tonight/` -- the sky above you as a horizon panorama (twilight,
  moon, planets, Milky Way, bright stars; now/play/scrub; cloud verdict;
  tap for a card). Plan: `docs/tonight-build-plan.md`. Structural map
  (built to cut rebuild cost): `../tonight-app-map.md` (in Downloads).
- **Art direction LOCKED: Nocturne + two borrows** --
  `docs/tonight-art-direction.md`. Chosen from five directions. Every
  phase commit references that file; it carries a per-phase checklist.
- All six "decisions still open" in the build plan are now resolved
  (table in the art-direction doc). Astronomy: vendored
  `astronomy-engine` (`lib/astronomy.js`, 116 KB, MIT).
- **Phase 1 (skeleton): DONE, committed 3cdd073.** Location
  (device/search/remembered, tz-aware), horizon canvas + drag-to-turn,
  time model (now/play/scrub), and the sky as an OKLab colour field
  derived from sun altitude -- Nocturne (seam horizon, baked grain,
  drag-only graticule, place name in the field).
- **Chrome rework: DONE.** The bottom pill / glass blur / rounded card /
  system-sans / shadcn button pair all read as "generic AI site" -- see
  the research-backed **CHROME section** now in
  `docs/tonight-art-direction.md` (banned list, per-phase drift check).
  Rebuilt: Fraunces self-hosted for *all* chrome; time controls are a
  caption line on the field (underlined words + a hairline scrub);
  locate is a prompt written into the field, not a card; chrome colour
  derived from the live field each frame; a bottom scrim holds daytime
  legibility. No border-radius (bar the scrub knob), no backdrop-filter,
  no box-shadow. Drift check passed at day / civil dusk / deep night /
  drag / mobile.
- **Palette rework: DONE (first pass).** Research
  (`docs/tonight-palette-research.md`) + a divergent generation pass
  concluded the smooth OKLab navy->amber field still read as "AI" (violet
  midpoint, timid even ramp, flat grain, black-slab top). Replaced per the
  new **Palette** section of `docs/tonight-art-direction.md` with **E x C**:
  a *film response curve* (Ektachrome-at-dusk -- teal-lifted blacks,
  warm-neutral mids never violet, amber bloom + red halation at the
  sunward horizon) *structured* by Belt-of-Venus logic (Belt of Venus +
  Earth's-shadow bands + sun-side glow, all **azimuth-blended** so turning
  the view changes the palette). Plus: seeded per-night "conditions"
  (`hash(place|date)` -> turbidity, belt geometry, drifting mottling),
  uneven clumped grain, a +/-1-level dither tile, and `theme-color` /
  `body-bg` driven from the live zenith (fixes the top-edge seam).
  Daylight blends to a plain blue sky above -6 deg. Verified across
  day / civil dusk / Belt-of-Venus / deep night / mobile.
- **Process note added:** `docs/tonight-art-direction.md` section
  "Process -- divergent generation" -- generate wide (forcing constraints,
  quotas, non-web refs), then converge. Applies to every visual call.
- **Palette tuning pass: DONE.** The bright segment now concentrates
  toward the sun's azimuth (base scene-luminance is azimuth-weighted;
  antisolar horizon goes dark = Earth's-shadow territory) rather than a
  uniform horizon band -- turning the view genuinely changes it. Tighter
  hot halation core (additive `screen`). Faint seeded airglow / skyglow
  band at deep night (usually green, sometimes sodium). Mid-band carries a
  little more chroma + a per-night warm/cool `tempShift`. Belt of Venus
  more present, hue seeded salmon..rose. Daytime brightens toward the
  sun's side. Seam no longer lifts the antisolar horizon.
- **Test-env note:** the browser pane restores a localStorage snapshot on
  reload (stale "Reston" place) and reports the tab `hidden` (rAF paused)
  -- test the sky by calling `enter()` + driving `frame()` manually. Not
  app bugs. A `visibilitychange` restart was added for real users.
- **Phase 2 (bodies): DONE.** Moon (position, phase, correctly-oriented
  crescent/gibbous via a terminator ellipse, lit limb faces the sun on
  screen, soft additive bloom) + the five naked-eye planets (mag-scaled
  dots, per-planet tint, visibility gated by sky darkness + magnitude,
  off-screen culled). Recomputed at 2 Hz alongside the sun. Tap-to-select
  (tap vs drag by movement < 6 px) opens a **card** -- a quiet overlay
  (hairline top rule, Fraunces, chrome colours, no box) with name /
  `alt-az` / rise-set / a rule-based advice sentence (altitude band +
  twilight visibility + rise-set proximity; moon adds a phase phrase). A
  canvas **leader line** tethers the card to the object (the Field Notes
  borrow); card and placard are mutually exclusive; empty tap deselects.
  "Twilight bands" from the plan are covered by the palette work.
  Verified desktop + mobile (moon + Mars + Jupiter pre-dawn, Lisbon).
- **Review pass (fresh model, full read of the code + docs).** Fixed:
  `riseSetFor` searched from t-6h and returned *past* events, so a body
  that rose and set earlier tonight was told "below the horizon for the
  rest of the night" even when it rises again before dawn (now: next
  rise/set from t; the advice only promises a return before this night's
  dawn); culled bodies kept a stale tap target for up to 500 ms; a new moon
  still drew as a grey disc; search results were click-only `<li>`s (now
  real `<button>`s -- keyboard-operable, per the a11y floor); arrow keys
  turn the view and Esc closes the card; the mottling regenerated 2,560
  noise samples every frame (now throttled); the dither tile re-baked on
  every conditions bake; dead `labLerp`; a step at -18 deg in `daylight()`;
  stale "Phase 1 / OKLCH" wording in the JS header, README, checklist and
  the Downloads map. Astronomy sanity-checked against real ephemeris
  (Aug 28 2026 total lunar eclipse = full moon; Sep 11 new -> Sep 6 is a
  ~22% waning crescent, as computed). Deploy-safe: no `../` refs, all
  assets inside `apps/tonight/`, one external URL (Open-Meteo geocoding).
- **Phase 3 (stars + Milky Way): DONE.** `data/stars.json` -- a 16 KB HYG
  subset (mag <= 4.0, 519 stars: RA/Dec J2000, mag, B-V, proper names for
  the bright ones), built from the d3-celestial catalogue. Drawn as
  Nocturne "dust": equatorial->horizontal is hand-rolled from
  `A.SiderealTime` + local latitude (validated within ~0.25 deg of
  astronomy-engine's DefineStar/Equator/Horizon over 26 yr of unmodelled
  precession -- fine for naked-eye dust), magnitude -> size/alpha, a B-V
  colour tint, a gentle seeded twinkle (off under reduced-motion), and a
  bloom only on mag < 1.2. Faint stars (mag > 2.2) fade with a
  `steadiness` value that eases 0 -> 1 ~0.8 s after the view stops moving
  -- "dust that resolves when you're still". The Milky Way is a stylised
  painted band: the galactic equator (from the galactic pole, J2000)
  sampled every 1.5 deg, stroked fat + round onto an offscreen with
  `lighten` (brightness varies along it -- Sagittarius peak + a Cygnus
  lobe), blurred once via `ctx.filter` and composited low with `screen`.
  Only appears from sun < -13 deg. Named stars are tappable -> the same
  card (no rise/set line for stars). ~0.3-0.5 ms/frame incl. the blur,
  desktop and mobile.
- **MW rework** (it was reading as a searchlight beam): now drawn as many
  soft overlapping "puffs" along the galactic equator (feathered on every
  edge, so it never reads as a shaft even running vertically), with a
  carved Great Rift, seeded patchy brightness, a centreline wobble, and a
  top/bottom edge-fade so it dissolves into the field rather than exiting
  frame. Composited much fainter (0.17). Still "stylised" -- final polish
  is Phase 5.
- Added a **"MAP OF THIS FILE"** index comment atop `tonight.js`. The
  standalone `../tonight-app-map.md` (Downloads) is marked historical /
  unmaintained -- git + PROJECT_STATE + the art-direction doc + that
  comment are the living record now.
- **Phase 4 (weather): DONE.** One keyless Open-Meteo call
  (`hourly=cloud_cover&forecast_days=2&timezone=auto`), cached in
  localStorage 1 h keyed by rounded lat/lon; the wall-clock hour strings
  are converted to UTC instants via `utc_offset_seconds`. `cloudAt(t)`
  interpolates the hourly series. `makeVerdict()` -> one short line from
  the dusk->dawn window: clear / mostly clear / broken cloud / cloudy /
  overcast, plus "clearing after HH" / "clouding over after HH" when it
  turns -- shown on the placard sub ("September 6 · clear tonight").
  `paintVeil()` lays a soft, lumpy, slowly drifting grey layer over the
  whole sky, coverage set by cloud % at `t` (stars show through the
  gaps). Real avg cloud nudges `conditions.turbidity` (grain re-baked) so
  cloudy nights render washier. Graceful offline: `wx` stays null -> no
  veil, date-only line, no throw. `btnNow` re-verdicts. ~0.5 ms/frame.
- **Phase 5 (the look): DONE -- v1 complete.** The palette landed earlier
  (film curve); this phase added: a faint always-on **compass hint**
  (facing letter + a horizon tick, hides while the graticule is up) plus
  a one-time "drag to turn the sky" cue that clears on first
  drag/arrow-key; **drag glide** -- a released flick carries a clamped
  velocity and eases to a stop over ~1 s (never under reduced-motion);
  a full **`prefers-reduced-motion`** sweep -- mottle + veil domain-warp
  frozen, twinkle off, glide off, dust-resolve instant, graticule snaps;
  a **responsive/touch** pass -- `overflow-y:auto` + max-height on the
  locate prompt and the result list, `<22rem` and `max-height:34rem`
  (landscape) media queries, `--sat` safe-area read into the card clamp,
  `font-optical-sizing: auto` + `font-synthesis: none`. Fraunces was
  already self-hosted from the chrome rework. ~0.2 ms/frame day, ~0.6-0.8
  ms/frame deep night; no console errors; controls verified end to end.
- **Post-v1 tweaks (per user feedback):**
  - **Cloud veil rework** -- was blobby + too opaque (erased the sky).
    Now 3-octave fbm + domain warp on a 148x96 buffer, tighter scale,
    feathered ramp; colour flipped to a pale skyglow-lit grey that
    *dims* stars (not a dark void); peak opacity ~0.5; regen rate-limited
    (~4 ms, ~4x/s). New **cloud toggle** (`btn-clouds`, a cloud glyph in
    the controls, shown only when avg cover > 12 %).
  - **Play reworked into a tap-cycle** (one button, no crowding):
    `Play` (frozen, only via scrubbing) then **Live** (tracks the real
    clock -- the new default on `enter`) -> **10m / 3m / 1m / 20s** =
    a full **24 h** cycle in that long, each **looping back to where the
    lapse started** (start at now+5 h -> loop returns to now+5 h).
    `Now` -> Live; scrub -> Play(frozen). Faint dust hides during the
    fast lapses; dusk/dawn recompute on day-change. `dtReal` clamped to
    [0, 0.05] so a clock jump / bg tab can't fling time. `PLAY_RATE`
    const removed.
  - **Telemetry added** (`apps/_shared/telemetry.js`, canonical, copied to
    `apps/tonight/telemetry.js` and loaded before `tonight.js`). Portable,
    **off by default** -- `ENDPOINT = ''` so nothing leaves the device;
    events accumulate in a capped in-memory ring only (`window.__telemetry.buf`,
    or `?debug=telemetry` to log them). **PII-free**: no lat/lon, no stable
    id -- a random per-load session id plus coarse context (viewport, dpr,
    timezone *name*, lang, reduced-motion, touch, referrer host). ~20
    `track()` calls in `tonight.js`: `located` (with a `via` source),
    `play` mode changes, `scrub`, `turn` (drag/key), `select`, `forecast`
    ok/cache/fail, `geo`/`geocode`, `clouds` toggle, `relocate`, and one
    per-session `perf` sample (median / p95 frame time + fps over 120 real
    frames). To actually collect: set `ENDPOINT` to a POST collector and
    add a line to the privacy copy. `track()` merges `base()` context
    first then caller props on top, so a metric key always wins over a
    same-named context field.
- **v1 is ready to deploy:** `.\scripts\deploy-app.ps1 -Name tonight`
  (human-run), then re-sync `hosting/site-root/` with the app listed.
- **Phase 6 (ISS passes): DONE 2026-09-06.** `apps/tonight/lib/satellite.min.js`
  (satellite.js 5.0.0 UMD, MIT, 23 KB -- vendored; 7.x dropped the UMD
  bundle, SGP4 is fixed math so the version is immaterial) +
  `data/iss-tle.json` (committed Celestrak TLE snapshot = the offline
  fallback) with a best-effort keyless runtime refresh from
  `api.wheretheiss.at` (cached ~12 h in localStorage, only accepted if the
  epoch is newer than what's held, **no location sent** -- less invasive
  than the weather call). `recomputePasses()` scans `state.t` + 26 h
  (coarse 30 s bracket -> 4 s refine), keeping windows where the ISS is
  above 10 deg, in sunlight (cylindrical Earth-shadow test against the
  J2000 Sun vector -- ~0.4 deg TEME/J2000 frame slop, immaterial), and the
  observer is past civil dusk; magnitude from range + Sun-ISS-observer
  phase angle. Draws a hairline predicted arc (chrome ink, **no glow** --
  like the graticule/leader borrows) + a peak tick/time, and a small mark
  riding `state.t` through the pass (short trail, restrained planet-grade
  bloom). Placard callout "ISS - 21:14, rises WNW -> 61 deg"; tap it to
  **play the pass** (one-shot ~11 s eased sweep of `state.t`; reduced-motion
  jumps to peak, static arc). Tap the mark -> the object card. No-ops
  entirely without the library or elements; ` - approx` suffix if elements
  are > 6 days stale. ~0.9 ms/frame (unchanged); recompute ~11 ms, deferred
  off `enter()` / `Now` / sim-day change (skipped during fast lapses).
  **Deploy note:** replace `data/iss-tle.json` on deploy to keep the
  offline path fresh (a `scripts/refresh-tle.ps1` could automate it).
- Tier 1; runtime network is now three keyless CORS-open fetches (two
  Open-Meteo + wheretheiss.at), all optional -- the sky renders fully
  offline. Deploy (human-run): `.\scripts\deploy-app.ps1 -Name tonight`.
- **Cloud toggle fix (`6f51dab`):** the button only gated `paintVeil()`;
  the forecast's turbidity bump (whole-sky haze) stayed. Now
  `bakeConditions()` stashes `seedTurb`, `applyForecast()` records
  `wxTurb` (from the seed, idempotent), `applyTurbidity()` swaps by
  `veilOn` + re-bakes grain, and the button calls it -- so the toggle
  reads as "show the clear sky". Each new place resets `veilOn = true`.

## 2026-09-10 -- house rules doc for new apps

- **`docs/building-a-new-app.md`** added -- the briefing doc to hand a
  builder (AI or human) alongside a per-app brief. Distilled from `until`
  + `tonight`: the stable constraints (Tier 1, self-contained folder,
  keyless/CORS/optional network, privacy posture, human-run deploy, the
  a11y floor), the process that worked (research -> art-direction pass +
  locked doc *before code* -> phased plan -> doc discipline), a
  definition-of-done checklist, and an app-brief template. `README.md`
  layout + status lines refreshed to match reality (`apps/_shared/` holds
  portable modules like `telemetry.js`, not a shared stylesheet; two apps
  built).


## 2026-09-10 -- third app: tide (groundwork, no code yet)

- **What it is.** The moon moving the ocean on a globe seen from the
  moon's point of view, plus the next high/low water at your place. Chosen
  2026-09-10 over Rivers (national gauge data, tiles, river topology),
  Quakes (wonder but no daily utility) and a beautiful whatismyip (thin,
  single-visit) for: deepest wonder, daily utility for anyone near a
  coast, ad-landfill incumbents, and Tier 1 with zero exceptions.
- **Research verified (curl, CORS headers checked):**
  `docs/tide-data-research.md`. Open-Meteo Marine
  `sea_level_height_msl` is global, keyless, CORS-open, 15-minutely,
  -92 d..+15 d, matches NOAA Boston to within hourly sampling (~7 % low in
  amplitude). NOAA CO-OPS predictions + harmonic constants keyless +
  CORS (3,499 stations). EOT20 global tide model is CC BY 4.0 -- shipped
  downsampled to 1 deg for the globe field. astronomy-engine already
  vendored in Tonight. Inland points still get a series from Open-Meteo,
  so the app needs its own distance-to-coast guard.
- **Docs written:** `docs/tide-brief.md` (filled template),
  `docs/tide-art-direction.md` (five directions, "Under the Moon"
  recommended -- **pick pending, not locked**), `docs/tide-build-plan.md`
  (phases 0-5, decisions resolved, risks).
- **Next:** human picks the art direction and flips the status line to
  LOCKED; then phase 0 (data-prep scripts + tide maths gated on the NOAA
  comparison test). No code in `apps/tide/` before the lock.

## 2026-09-10 -- tide built (phases 0-5), not deployed

- **Art direction locked** the same day: "Under the Moon" (camera at the
  sub-lunar point; the Earth turns under the bulge; sea height as
  luminance of one hue; readout as table rows). `docs/tide-art-direction.md`.
- **Phase 0.** `apps/tide/lib/harmonics.js` (Doodson arguments + Schureman
  nodal corrections, 37 constituents) passes the NOAA gate in
  `scripts/tide-test-harmonics.js`: Boston / Pensacola / San Francisco
  turning points within 12 min and 0.05 m using NOAA's own constants
  (Anchorage is informational -- NOAA uses 83 shallow-water constituents
  there). EOT20 downloaded from SEANOE (2.3 GB outer zip, nested
  `ocean_tides.zip`; the server ignores HTTP Range) and reduced by
  `scripts/tide-prep-field.py` to `data/tide-field.bin` (1° grid, 8
  constituents, 1.56 MB raw / 693 KB gzipped; amplitude outliers clipped
  at the 99.95th percentile). Natural Earth land -> `data/land-110m.json`
  (66 KB) + `data/land-50m.bin` (248 KB); NOAA station index 241 KB.
- **Phases 1-4** in `apps/tide/` (`index.html`, `tide.css`, `tide.js`):
  Canvas 2D orthographic globe with a per-pixel low-res pass (sea
  luminance from the field, land mask from vector rings, day/night with a
  warm terminator edge, moonlight lift), rings pre-converted to unit
  vectors + cap culling + Sutherland-Hodgman clipping so a frame is
  ~10-20 ms; drag with ease-back to the moon's view; wheel/pinch/dbl-tap
  zoom; fly-to-place; readout (state line, four turning points, range,
  springs/neaps, moon, sun, source, hand-off); Open-Meteo 15-minutely
  series everywhere, NOAA hi/lo when a station is within 15 km (MLLW
  minus the hi/lo mean, since subordinate stations have no MSL datum);
  inland grace; localStorage caches; scrub -3 d..+15 d; Play at 1 h/s;
  About panel; keyboard (Space, Esc, M, +/-); reduced-motion path;
  narrow layout (controls wrap to two rows, moon disc top-right).
- **Verified in the in-app browser** at 319x944 and 1280x800: NOAA path
  (Wildwood NJ), model path (Brighton UK), fresh-launch prompt, About,
  Play, drag, zoom. `node --check` clean.
- **Deployed 2026-09-13** by the human at
  `https://<DISTRIBUTION_DOMAIN>/tide/` (all files 200; the field
  .bin is served uncompressed at 1.55 MB because CloudFront does not gzip
  `application/octet-stream`). The landing page was **not** re-synced yet
  (`.\scripts\deploy-site-root.ps1`) -- it still lists only Until.
- **2026-09-13 fix, needs a redeploy:** the live view showed land and sea
  swapped when Antarctica straddled the limb -- a ring spanning all
  longitudes, clamped to the rim, swept the whole disc and flipped the
  even-odd land mask. The projected mask is gone: land is now a 0.125°
  lat/lon raster built once from the rings (`buildLandMask`) and sampled
  bilinearly per pixel (soft coast), which also removed the mask cost.
  Per-pixel asin/atan2 replaced by ~1e-6-rad polynomial approximations;
  pixel budget 90k. Frames: ~18 ms at planet scale and at coast zoom on
  this machine.
- **Still not done:** a real-phone performance pass; official-table links
  beyond US/GB; optionally pre-gzipping `tide-field.bin` (deploy-script
  change: upload with `Content-Encoding: gzip`).

## 2026-09-13 -- tide redeployed with the limb fix; v2 plan written

- Human redeployed `tide` (commit `ed61b14`, verified live: `tide.js`
  contains `buildLandMask`) and re-synced the landing page (Until,
  Tonight, Tide all listed).
- **Assessment:** v1 is the picture; the readout is too thin for people
  who use tides (no today curve, no week, no chart datum, no rate, no
  daylight windows, globe first on phones). Written up as
  **`docs/tide-v2-plan.md`** -- a cold-start handoff (file map, how
  tide.js works, verified numbers, gotchas already paid for, the critique
  by user type, phases 6-11 with files/acceptance, decisions not to
  reopen, three open questions for the human, how to work). The model
  working on this is about to change; that doc is the entry point.
- **Next:** phase 6 (today's curve) and phase 7 (the week) first, ship,
  then 8-11.

## 2026-09-15 -- tide phase 6 (today's curve), not deployed

- Model switched mid-session (Fable 5.1 -> Sonnet 5); picked up
  `docs/tide-v2-plan.md` phase 6, the highest-value gap: a 36 h sea-level
  curve in the readout (state.t -6h..+30h), night-washed, turning points
  labelled, a draggable "now" mark. `apps/tide/index.html` +`.ro-curve` in
  `tide.css` + a new CURVE section in `tide.js` (`sizeCurve`,
  `nightBands`, `paintCurve`, `updateReadoutLite` + pointer-drag).
  aria-hidden: purely a pointer enhancement over the already-accessible
  rows and the keyboard scrub.
- **Two real bugs found and fixed while testing, not just eyeballing
  screenshots:**
  - Same-type turning points (~12h25m apart) collided into unreadable
    overlapping label text in the curve at typical widths (320-340px).
    Fixed with per-row (above/below) collision tracking that drops a
    label rather than let it overlap -- verified by re-rendering and
    checking the pixels, not just looking.
  - **Pre-existing v1 bug**, found via the phase-6 short-viewport
    acceptance test: the max-height:34rem rule meant to hide the moon/sun
    lines targeted `.ro-sun, .ro-moon`, but those elements only carry
    `id="ro-sun"`/`id="ro-moon"` (class is `ro-line`) -- the rule never
    matched anything. Fixed to `#ro-sun, #ro-moon`. Verified with a
    pixel-level readback (`getComputedStyle(...).display`) at 420px
    height, and that the full readout now fits 320x690 / 375x560 /
    375x480 / 375x420 with zero scroll.
  - Also verified with real pixel reads (not screenshots) that the night
    wash actually paints (alpha ~0.30 at night x-positions, 0 at day).
- Verified on both series sources (NOAA hi/lo at Wildwood NJ, Open-Meteo
  15-min at Brighton UK); drag-to-scrub moves `state.t` and the globe
  follows; `paintCurve()` costs ~1.1 ms/call; `node --check` clean.
- **Not deployed.** `docs/tide-v2-plan.md` phase 6 marked done with the
  detail above. **Next:** phase 7 (the week).

## 2026-09-16 -- tide: on-demand Detail panel (panel-research Option C), not deployed

- User confirmed the recommendation from `docs/tide-panel-research.md`:
  Option C, hybrid. Built the same day.
- The readout's permanent glance is now just rule + place + state +
  curve. Everything that scales with more data -- the remaining turns,
  range/springs, moon, sun -- moved behind a `.word`-styled "Detail" /
  "Less" toggle (`#btn-detail` -> `#ro-detail`), collapsed by default,
  built on the exact `hidden` + `aria-expanded` shape the About panel
  already used. Source and the hand-off line stay outside it, always
  visible (safety-adjacent text shouldn't be opt-in).
- `sizeDetail()` measures the real gap to the controls bar and caps the
  panel's height to it (min of that and 70svh), so it is provably unable
  to push content off-screen, on any viewport -- not a guess. It scrolls
  internally (styled as a 3px hairline in `--chrome-line`, not the
  browser's default grey bar) rather than the old media query's silent
  truncation, which is now removed as redundant.
- `layout()`'s phone-only "shrink the globe below the readout" branch
  now only applies while Detail is closed; open, it overlays the globe
  translucently like `#about`/`#locate` already do, since there usually
  isn't room for both on a short phone.
- Escape closes Detail (added to the existing Escape chain); closing it
  any way returns focus to the toggle, matching `showAbout()`.
- **Verified**, not just built: default-collapsed state fits 320x690,
  375x560, 375x480 and 320x500 with zero page scroll (checked
  `document.body.scrollHeight === innerHeight` directly); both NOAA and
  Open-Meteo data paths; Detail's measured max-height never exceeds the
  controls bar's top edge; Escape + focus-return confirmed.
- **A real testing-environment bug found and fixed along the way** (not
  an app defect): the long-running local preview server plus the
  browser's HTTP cache meant `fetch('index.html', {cache:'reload'})` was
  busting the wrong cache key (`/index.html`, not `/`, which is what the
  page actually loads from) -- several apparent crashes mid-session were
  stale pre-Detail markup paired with current JS, confirmed by reading
  what the browser actually received over the network, not by curl
  (which was hitting the live file correctly the entire time and was
  the misleading signal). Detail in `docs/tide-panel-research.md`.
- Not deployed. `node --check` clean.

## 2026-09-16 -- tide: relief shading + tracked moon marker, not deployed

- Built docs/tide-visibility-research.md items 1-3: raking-light relief
  shading on the sea (a real slope of the tide field, dotted against the
  direction of increasing sunlight -- peaks at the terminator, vanishes
  at local noon/midnight, no legend, no new colour) and the moon icon
  as a tracked off-screen-indicator marker (driven by moonCam, already
  computed for the moonlight-lift term) instead of fixed chrome, plus a
  confirming hairline from the marker to the sub-lunar point.
- User pushed back on the first pass at the moon fix ("is this the best,
  not just the cheapest") -- the static hairline-only idea was replaced
  before building anything, in favour of the tracked marker (see the
  doc's history). Built the better idea, not the cheap one.
- Calibrated the relief gain against real sampled data (median/p90/max
  of the raw term across every near-terminator open-ocean cell on a real
  load), not guessed. Caught and fixed a real bug in the same pass: the
  clamp was applied before the gain instead of after, doubling the
  intended range.
- Caught and fixed a real layout bug: the moon marker is a live 44px hit
  target (not just a drawing) and could land on the readout's text on
  narrow phones, silently stealing taps. Fixed with a feasibility-checked
  push, verified by sweeping the drag angle at 320px width with zero
  collisions against the state line, turns, and Detail toggle.
- Verified: frame cost unchanged (~18.5 ms); drag-and-release swings the
  marker out and eases it back with the camera; alpha correctly fades
  toward a floor (never a hard vanish) when the moon is below the
  horizon at a zoomed place, checked against Brighton's real moonset
  time; reduced motion inherited for free (the marker only reads
  cam/moonCam, which stepCamera() already snaps under REDUCED).
- Not deployed. `node --check` clean. Limb wobble and the moon-glade
  shimmer remain research only (item 4), not built.

## 2026-09-17 -- tide: Detail button dead on the live site, fixed

- User reported the Detail toggle wasn't working after deploy. Reproduced
  with a real click on the live site (not a JS-triggered `.click()` --
  the diagnostic that mattered): `#btn-detail` had computed
  `pointer-events: none`, inherited from `.readout`'s blanket
  `pointer-events: none` (so the globe underneath can be dragged through
  the chrome). Every other interactive child of `.readout` --
  `.ro-curve`, `.ro-src a`, `.ro-detail` itself -- has its own
  `pointer-events: auto` override; `.ro-detail-toggle` was missing one,
  a straight oversight when it was added.
- **Root cause of why this passed testing before deploy:** all local
  verification of Detail used `el.btnDetail.click()` from
  `javascript_exec`, which calls the click handler directly and never
  goes through real hit-testing/pointer-events -- so a real mouse click
  landing on a `pointer-events: none` element (falling through to the
  globe canvas underneath) was never exercised. Lesson: a programmatic
  `.click()` proves the handler works, not that the element is
  clickable. Real click tests are the ones that catch this class of bug.
- Fixed: added `pointer-events: auto` to `.ro-detail-toggle`. Verified
  with an actual mouse click (not `.click()`) against a real place, both
  before (reproduced: no state change, `elementFromPoint` at the
  button's centre returned the globe canvas, not the button) and after
  (fixed: click opens the panel, toggles to "Less").
- Redeployed by the user; confirmed live.

## 2026-09-17 -- tide: long-press to set your place, not deployed

- Built the recommendation from `docs/tide-tap-select-research.md`:
  hold a finger/mouse on the globe (~550ms, tolerating ~8px of drift)
  and it snaps through the existing `nearestCoast()` to the nearest
  coast, shows a tethered, non-modal preview card (Tonight's `.card`
  shape -- hairline, no box), and only becomes the saved place on an
  explicit "Use this place". A plain tap or a drag is unaffected --
  the long-press timer is cancelled the moment movement exceeds the
  slop, or on release, so the existing pan/tap behaviour didn't change.
  Not a toggle: no mode to forget, per the research doc's Raskin
  citation.
- New `unproject(px,py)` factored out of `zoomBy`'s inline screen ->
  lat/lon math (behaviour-preserving refactor, same fallback when the
  point misses the globe).
- Reverse geocoding via BigDataCloud's `reverse-geocode-client`
  (keyless, CORS-open, confirmed in the research doc): remote coasts
  often return a "exclusive economic zone of ..." locality instead of a
  real place name, so that's filtered out in favour of
  subdivision+country, then a plain "This coast" fallback.
- **Verified the click-through lesson from the Detail bug applies here
  too:** `.pick-use` needs its own `pointer-events: auto` since
  `.pick-card` is `pointer-events: none` like `.readout`/`.card`. Set
  it from the start this time, but still verified with a real
  `computer` click (not `.click()`) on both desktop and mobile widths,
  not just the JS-dispatched long-press gesture used to open the card.
- Tested: long-press opens + resolves a name; drag past the slop pans
  normally with no pick; a quick tap elsewhere dismisses an open pick;
  Escape dismisses; the preview auto-cancels if its point rotates past
  the limb; committing flies to the place, loads its tide series, and
  updates the readout -- all via real synthetic PointerEvents (not
  direct handler calls) plus a real mouse click for the commit button.
- Deployed by the user; confirmed live against the production URL with
  a real click (not `.click()`) committing a picked place end to end.

## Not done yet

- **Credential envelope -- confirm.** DEPLOY.md step 0 (rename
  `[default]` -> `[story-deploy]`) needs to be verified done: open a
  fresh PowerShell with `AWS_PROFILE` unset and check
  `aws sts get-caller-identity` fails. That's the environment
  `Bash`-capable subagents run in.
- **Budget alarm** only exists if `-c alert_email=...` was passed to
  the deploy.

## Verified live 2026-09-02

- `/` serves the "small things" landing page.
- `/does-not-exist/` serves `404.html` (URI-rewrite function + 403->404
  error mapping both working).

## Known machine gotchas (from docs/SYSTEM_PLAN_NOTES.md §6)

- `aws` not on PATH -> `C:\Program Files\Amazon\AWSCLIV2\aws.exe`.
- Run `aws`/`cdk` from PowerShell, not Git Bash.
- CDK needs the venv python first on PATH; system Python 3.10 lacks
  `aws-cdk-lib`.
- `JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1` (Node 26).
- Account <AWS_ACCOUNT_ID> / us-east-1 already CDK-bootstrapped.

## 2026-09-17 -- tide: phase 7, the week

- Built docs/tide-v2-plan.md phase 7: inside Detail, right after the
  existing next-4-turns list, the next 7 days grouped by calendar day
  (weekRows()), collapsed to today+tomorrow with a "This week" word
  control, plus a 14-day lowest-low/highest-high summary line
  (extremes14()). Reuses the existing .ro-turns row markup/CSS for each
  day's rows rather than inventing a new style.
- Verified against both data paths (Open-Meteo model turns and NOAA
  hilo turns) and at desktop + mobile widths; expand/collapse tested
  with real clicks, not `.click()`.
- Deployed by the user alongside phase 8; confirmed live.

## 2026-09-14 -- tide: phase 8, datum/units/rate

- Built docs/tide-v2-plan.md phase 8: a datum toggle (mean sea level /
  chart datum MLLW) and a units toggle (m/ft), both persisted, plus a
  rate line ("0.4 m in the next hour", + "fastest part of the tide"
  near a half-cycle's midpoint) on the state line when rising/falling.
- **Spec correction found live:** NOAA's `datums.json` endpoint the plan
  named is retired (404s, redirects to the Metadata API). Turned out
  unnecessary anyway -- NOAA predictions are already fetched with
  `datum=MLLW` and re-centred by subtracting the window's own mean
  (pre-existing code); that mean is the *exact* offset back to MLLW, so
  the toggle reproduces NOAA's own numbers algebraically. Only the
  Open-Meteo/model path is a real estimate (92-day past_days call,
  mean of each day's lower low), labelled "estimated" accordingly.
- **Bug found and fixed before it shipped:** a NOAA series cached before
  this phase (no `mllwOffset` field) would never self-heal -- the async
  backfill path only covers the model path, since NOAA needs no extra
  fetch. Fixed with a cache-key version bump (`:v2`) so stale entries
  are cleanly bypassed rather than silently showing MSL numbers under
  an MLLW label.
- Every height on the page routes through one function (`heightNum()`)
  for the datum shift, so state line / curve labels / turns / week rows
  all follow the setting without individually knowing about it. Range
  and the new rate line are left alone -- both are differences, and a
  constant datum offset cancels out of a subtraction.
- Deployed by the user; confirmed live with a real click toggling the
  datum on the production San Francisco/NOAA station.

## 2026-09-14 -- tide: phase 9, daylight windows/water temp/calendar, not deployed

- Built docs/tide-v2-plan.md phase 9: "Low/high water in daylight" lines
  (next 3 of each, filtered by real civil twilight via astronomy-engine's
  SearchAltitude -- went with the precise option over the plan's rough
  sunrise+/-30min fallback, since the library already had it); sea
  surface temperature on the sun line (model path only, converts to F
  when units=ft); an "Add to calendar" .ics export (14 days of turns as
  0-minute events + one dawn-to-dusk span event per day whose twilight
  window contains a low).
- Verified by inspecting the generated .ics text directly (the preview
  sandbox blocks real downloads, as the plan itself warns) -- well-formed
  on both data paths; real click (not `.click()`) on the button at
  desktop and mobile widths.
- **Bug caught before shipping (same class as phase 8's):** a model-path
  series cached before seaTemp existed would never pick it up, since it's
  part of the one fetch rather than a separately-backfillable field like
  mllwOffset. Fixed with a `:v2` bump on the model cache key too.
- Deployed by the user; confirmed live (sea temp + daylight lines +
  a real click on "Add to calendar", no console errors).

## 2026-09-14 -- tide: phase 10, layout for use + first paint + places, not deployed

- Built docs/tide-v2-plan.md phase 10, the biggest restructure of the
  three remaining phases:
  - **Real phone scroll.** New #globe-wrap div hangs the canvas/moon-
    marker/pick-preview off one positioned box: fixed+inset:0 by default
    (desktop and onboarding, pixel-identical to before), switched to a
    normal-flow aspect-ratio:1 square only via
    `body:has(#readout:not([hidden]))` at <=40rem -- true exactly when
    state.located, so onboarding/"Just look" keeps its old fixed-overlay
    layout untouched. resize() now reads the canvas's own
    getBoundingClientRect() instead of window.innerWidth/innerHeight.
    layout()'s old "phones: globe below readout" shrink hack is dead
    code with real scroll and was removed.
  - **First paint.** init() starts the frame loop before awaiting
    loadLand(), then (for a returning visitor) awaits enter() -- which
    dispatches the series fetch -- before calling loadField(). Verified
    via performance.getEntriesByType: land starts ~49ms, field ~458ms,
    a real gap.
  - **Pre-gzip.** deploy-app.ps1 gzips any apps\<name>\data\*.bin after
    the s3 sync and re-uploads with --content-encoding gzip (generic,
    not Tide-specific). Verified locally: tide-field.bin 1519KB->672KB,
    byte-identical round-trip. Documented in docs/DEPLOY.md.
  - **Up to 3 saved places.** localStorage 'tide.places' (migrated once
    from the old single-place key), MRU-first, capped at 3 by
    rememberPlace() (called from every enter() path). The place name
    (#ro-place, now <h1><button>) cycles them; a no-op when only one is
    saved.
- **Tool limitation encountered (not a code bug):** this session's
  `computer` click tool intermittently reports a click coordinate that
  doesn't match where the real DOM click event actually fires --
  reproduced on stock example.com and against the unchanged Detail
  button, so it's environmental. Also separately reproduced: large
  custom viewport sizes (1280x900, 768x1024) render the globe confined
  to a small corner even on the live unmodified production site -- a
  pre-existing rendering artifact of this test tool at those sizes, not
  a Tide bug. Fell back to elementFromPoint() (the browser's real hit-
  test) + a properly-targeted synthetic event at the verified point,
  weaker than the real clicks used in phases 6-9 but the strongest
  check available once the click tool itself was shown unreliable.
- Deployed by the user alongside the phone-layout revert and the
  Hide-text control below; confirmed live.

## 2026-09-14 -- tide: phase 10's phone layout reverted after real-phone testing

- User tested phase 10 live on their actual phone: "It is deployed but
  it seems a whole lot worse than before. The information part is not
  transparent, The viewing window got smaller on the phone." Both real,
  both a direct consequence of the real-scroll restructure, not a bug
  in it -- moving the readout into normal flow above a separate globe
  box put it on the plain page background instead of over the globe,
  losing the "words written onto the field" transparency the art
  direction depends on; capping the globe to a viewport-width square
  is smaller than a globe that could use the full screen height.
- Reverted in commit fb2359b: #globe-wrap and the
  body:has(#readout:not([hidden])) media query removed;
  #globe/.moon/.pick-card back to position:fixed; layout()'s original
  "phones: globe below the readout" shrink-to-fit branch restored;
  resize() back to window.innerWidth/innerHeight. Verified in a fresh
  browser tab (the reused tab was showing a stale/confined render, a
  known test-tool artifact -- see
  testing-tool-click-coordinate-bug in Claude's memory) that the globe
  and transparent readout overlay are back to the pre-phase-10 look at
  both mobile and desktop widths, console-clean.
- First paint and up to 3 saved places (the other two pieces of phase
  10) were untouched -- the phone complaint had nothing to do with
  either -- and stay in place.
- Deployed by the user alongside the Hide-text control below;
  confirmed live.

## 2026-09-14 -- tide: a "Hide" control for the text

- User request after seeing the reverted layout live: an option to
  make the readout text disappear completely and just look at the
  globe. Added a "Hide"/"Show" word control (commit 11a6532) to the
  always-visible controls bar, toggling a `.force-hidden` CSS class
  (not the `hidden` attribute -- showAbout() already borrows that for
  "one column of words at a time" and restores it on close, which
  would silently undo this; verified opening/closing About while text
  is hidden leaves it hidden). paintScrim() also checks the new flag,
  otherwise a pointless dark patch would sit over the globe where the
  text used to be. Not persisted -- resets to visible on next visit.
- Verified real hit-testing + targeted dispatch (the click tool itself
  is unreliable this session -- see testing-tool-click-coordinate-bug)
  at both mobile and desktop widths, in a fresh tab: the globe now
  fills the entire screen with zero text when hidden, and toggles back
  correctly.
- Deployed by the user; confirmed live with a real hit-test + targeted
  click against production (readout correctly goes to `display:none`).

## 2026-09-14 -- tide: phase 11, trust and coverage, not deployed

- Built docs/tide-v2-plan.md phase 11: official tide-table links for 15
  more countries (AU/CA/NZ/IE/FR/ES/PT/DE/NL/DK/NO/JP/ZA/IN/BR) beyond
  the existing US/GB, every URL web-searched and checked live before
  going in (a wrong safety-hand-off link is worse than the generic
  fallback it replaces). IN uses INCOIS rather than the plan's literal
  "Survey of India" -- that agency doesn't run a public tide service,
  INCOIS does. Device-location entries (no geocoded country) infer US
  when a NOAA station is nearby, else fall back to the generic phrase.
- Model-vs-NOAA honesty line: when the model path has a real NOAA
  station 15-40km away, fetches just its hi/lo times (cached a day at
  a time) and shows "NOAA at <station>, X km: high/low <time>, ours
  <time>" -- but only when the model's own next turn has a same-type
  match within 6h of the station's, so a genuine mismatch (tested for
  real near Port Fourchon, LA -- Louisiana's complex tides put the
  model's next low within 22 min of the station's next HIGH, a
  half-cycle mismatch) correctly shows nothing rather than a
  misleading pairing. Verified the matching arithmetic itself with
  synthetic same-type and >6h cases.
- Error note ("open-coast estimate; harbours/estuaries can differ by
  20-40cm and 20-30min") tightened into the About panel (which already
  had a looser version from v1) and added fresh to the always-visible
  source line for the model path only -- :empty-collapses to nothing
  on the NOAA path.
- attachMLLW() renamed attachExtras(), now backfills both mllwOffset
  and the new cmp field independently, so a series cached before this
  phase self-heals on next load with no cache-key version bump needed.
- **Not yet deployed** -- needs `.\scripts\deploy-app.ps1 -Name tide`.

## 2026-09-15 -- tide: phase 12 (optional), sound -- v2 plan complete

- Built docs/tide-v2-plan.md phase 12, the last item on the roadmap: a
  single Web Audio sine oscillator, one octave (160-320Hz), mapped
  against the PLACE'S OWN loaded height range (not a fixed scale) so a
  few cm in the Mediterranean and several metres in the Bay of Fundy
  both use the full register. Pitch glides toward the current height
  via setTargetAtTime (2.5s time constant) every frame rather than
  jumping -- "slow" is a property of the tone itself. AudioContext
  created lazily on first "Listen" click (autoplay policy needs a real
  gesture anyway); gain fades in/out over 0.4-0.6s, no click. "Listen"
  <-> "Quiet" word control in the controls bar, off by default,
  untouched by anything else on the page.
- Verified the frequency formula by hand against real place data; the
  glide itself by freezing time (setMode('hold') -- live mode's own
  state.t=Date.now() every frame would otherwise fight a manual time
  jump in the test) and confirming ~80% of the gap closed after ~1.6
  time constants, matching the exponential model to the percent; real
  hit-test-verified clicks starting/stopping the tone at both mobile
  and desktop widths, AudioContext reaching "running", no console
  errors.
- **This closes out docs/tide-v2-plan.md.** Every phase (6-12) is now
  either live or was built-and-deliberately-reverted with the reasons
  recorded (phase 10's phone layout). Updated the plan doc's top status
  line to reflect this and point at the per-phase notes for the record
  of what shipped, what didn't, and why.
- **Not yet deployed** -- needs `.\scripts\deploy-app.ps1 -Name tide`.

## 2026-09-15 -- ip: a fourth app, and phase 1 (the gate) passes

- New app from the user's own idea document ("What's My IP") plus four
  reference stills. Compressed into the house brief template
  (docs/ip-brief.md); their text treated as intent, not spec.
- Data layer VERIFIED LIVE before anything was written down
  (docs/ip-data-research.md): RIPEstat is keyless and sends
  Access-Control-Allow-Origin: *, and RIS Live's WebSocket returns 101
  with a foreign Origin, so both are reachable from a static page.
  Team Cymru's IP-to-ASN is DNS/whois only and is NOT usable from a
  browser, which the source document had assumed; Cloudflare Radar needs
  a token; IODA is academic-licensed. RIPEstat + RIS Live is the whole
  data layer and both are free.
- Architecture: Tier 1 plus ONE CloudFront Function reading
  event.viewer.ip at viewer-request, so `curl` gets plaintext off the
  edge and the page stays static in S3. Rejected a third-party echo
  (sends every visitor to a company with nothing to do with the site)
  and Tier 2 (a Lambda cold-start tail on the one thing that must never
  feel slow). Cost: the browser needs JS for the number.
  **This is the first app that needs a `cdk deploy` of hosting/ rather
  than only an `s3 sync`** -- it breaks the system's standing promise
  that adding an app never touches the stack. Flagged to the user.
- Privacy: every RIPEstat lookup is deferred until the visitor moves past
  the answer, so an arrive-copy-leave visit talks to nobody but us and
  "no IP history stored" needs no footnote.
- Art direction: five directions generated (Cordage / Suminagashi /
  Chladni / Watermark / Daylight Register), user picked the recommended
  **Cordage** -- Ruth Asawa's hanging looped wire, quipu, Anni Albers.
  Containment drawn as suspension, the address as a knot, a natural-dye
  palette selected by ASN, motion only ever driven by a measured number.
  The user's own reference stills were explicitly treated as MOOD, not
  direction: near-black + blue bloom + particle bokeh is the current
  AI-render median and two apps in this series are already dark fields,
  so bloom/bokeh/blue-black are on the banned list. LOCKED in
  docs/ip-art-direction.md.
- **Phase 1 (the gate) built and passed.** The user's own gating
  assumption -- "the generator must never be ugly" -- got a harness
  rather than a page: apps/ip/lib/{form,dyes}.js plus
  scripts/ip-contact-sheet.html (dev-only, kept OUT of apps/ip/ so it is
  never synced), with four corpora including a sparsest-only floor mode
  and a one-network ancestry mode.
- It failed twice before it passed, which is what the gate is for.
  (1) First sheet: every form was the same object at the same size --
  the outermost cage was always the IANA /8 so prefix length changed
  almost nothing. Fixed by making the ANNOUNCED PREFIX the object you
  look at, sized by its length, with containing blocks scaled by the log
  of the real size ratio so they crop off-frame (you are inside them and
  cannot see all of one), plus per-address aspect variation.
  (2) Second sheet: rings drawn at one weight all the way round made the
  form read flat, and the knot -- a scaled copy of the cage -- came out
  looking like the atomic-energy logo. Fixed with near/far ring halves at
  different weights, and a real overhand knot drawn as one cord looped
  through itself with a proper over-and-under (a ground-coloured gap
  stroked under the crossing strand).
- Verified on the sheet: the floor (one cage, no ASN, no latency, fully
  frayed) is restrained and good, not impoverished; ancestry reads --
  same dye, same twist, same cord make, different proportion and knot
  angle, so siblings without being clones; and the reduced-motion still
  is as good as the moving frame (pulse frozen at a composed phase).
- Next: phase 2, the answer itself (page + edge function + dev stub).
  Nothing deployed; nothing in apps/ip/ is production yet.

## 2026-09-15 -- ip: direction relocked from the user's stills; built the whole thing, rolled back to phase 1

- The user supplied a full narrative + outline brief ("What's My IP") and
  seven reference stills. Copied verbatim to docs/ip-narrative-and-outline.md;
  it supersedes the old parts list (docs/ip-handoff.md), which it critiques
  directly in its own section 17.
- **Art direction relocked: "Survey"** (docs/ip-art-direction.md). This time
  the stills ARE the direction, not mood -- the previous pass explicitly
  talked the user out of their own references and produced something thin.
  Cordage (built, rejected) and Sea Fire (proposed, never built) archived to
  docs/ip-art-direction-rejected-seafire-cordage.md; their code removed from
  apps/ip/ (still at commit 4cdd4d0).
  The chassis: a near-black plate, a perspective ground grid under dotted
  polar rings, a tick scale, a plumb axis, horizon at 0.33H and origin at
  0.59H -- three camera constants that every one of the nine states must be
  drawn through, which is what makes them one instrument. Three colour roles
  only: cream = what you are told, cold blue = structure, amber = you, and
  amber is spent on nothing else. Archivo, self-hosted (OFL), no serif.
- Data layer re-verified live: RIPEstat network-info / as-overview /
  announced-prefixes / asn-neighbours all CORS-open, plus **as-names**, which
  takes a comma-separated list and returns every neighbour's name in ONE
  request instead of twelve. ris-asns returns 87,519 originating ASNs
  (87,204 after dropping private/reserved space) at query time
  2026-09-16 00:00 UTC.
- **Built all six phases in one pass, then deliberately rolled back to phase
  1 at the user's call.** The spike worked end to end against live data --
  all nine states, recursion into real neighbours, the horizon field, the
  inward strata, the saved still -- but it was made without a gate between
  phases and the craft showed it: O2/O3 layouts tuned by screenshot rather
  than designed, a label-collision test bolted on afterwards, and motion
  never actually seen (rAF is throttled in the test harness, so every state
  was verified through the reduced-motion path). Archived outside the repo.
  **Working rule from here: one phase, then stop and show it.**
- What survived the rollback, and is worth more than the code was:
  - **Seven open design decisions**, now collected at the bottom of
    docs/ip-art-direction.md as PROPOSALS awaiting the user's call rather
    than quietly written in -- the origin holding the subject rather than
    Home, IPv6 measured in /64 subnets, the Hilbert horizon rule, uniform
    horizon marks (the one visible departure from the stills, because
    per-AS prefix counts have no bulk keyless source), the axis stopping
    where the data stops, the bounds on big collections, and the physical
    form of the scale axis.
  - scripts/ip-build-asn-field.py -- fetches and packages the phase-5
    population dataset, with the filtering rules that were checked live.
    Not run; its output is not in apps/ip/.
- **Phase 1 shipped in apps/ip/**: the address in the first paint as a real
  element first in the focus order, Copy, the chassis, the amber origin mark,
  a minimal About carrying the privacy account, and the honest
  "Not available" state. The address sizes itself from its own character
  count, so the longest IPv6 (39 chars) fits at 900px and the longest IPv4
  fits at 320px. Fixed a real bug found in testing: setting canvas.width
  clears the bitmap, so a resize that only *queued* a repaint left the field
  stale until the next animation frame -- resize now paints synchronously.
- **hosting/ now has a stack change**: hosting/edge/ip-whoami.js, a
  CloudFront Function on a new /ip/whoami behaviour with caching disabled.
  Reads event.viewer.ip, returns text/plain to anything not asking for JSON
  (so `curl` gets the address and nothing else) and JSON to the page. 3.4 KB
  against the 10 KB quota. **Written and reviewed, never run** -- it needs a
  `cdk deploy` of WebappsHostingStack, which is the first time adding an app
  has needed more than an `s3 sync`.
- **Nothing deployed, nothing committed.** Next: the user's call on the seven
  open decisions, then phase 2 (O1, the announced block) on its own.

## 2026-09-16 -- ip: the renderer (phase 2 of 7), and the Canvas 2D rule changed

- The phase-1 picture was judged flat ("a dumbed down version of photos...
  I think you are taking the easy route"). Correct: it was built out of
  primitives that cannot carry light -- 1px hairlines and square fillRect
  marks -- with light implied by tuning alpha.
- Researched properly (docs/ip-render-research.md) with a live proof
  (scripts/ip-render-gate.html, dev-only, three revisions against their
  notes). Findings: Canvas 2D is capped at 1px line width by ANGLE and
  ctx.filter blur is too slow for a bloom chain, so the stills are
  unreachable from it. Raw WebGL2 reaches all of it at ~98% support.
- **The user's own brief said "Canvas 2D" (section 7), so it was amended
  rather than worked around** -- both docs/ip-narrative-and-outline.md and
  docs/building-a-new-app.md section 1 now read "Canvas 2D or raw WebGL2,
  with a Canvas 2D fallback", with the reason recorded inline. This is the
  first app in the repo to use WebGL2.
- The second big finding was the FLOOR, which the stills use and I had
  ignored entirely: a glossy planar reflection under every luminous object,
  a pool of light spilled onto the plane around it, and actual surfaces with
  bright rims rather than bare edges (that last one is why it read as "stick
  figures"). **Shadows do not apply here** -- additive light over black has
  no ambient to occlude, so grounding is added, never subtracted.
- **The plan was re-phased from 6 to 7**, with the renderer INSERTED as
  phase 2 rather than appended, because it is the foundation under every
  later phase. Phase 1 is done in part: the DOM answer, whoami, the edge
  function, the a11y floor and the failure states all survive; the Canvas 2D
  chassis drawing became the fallback.
- **Phase 2 built.** apps/ip/ip.js restructured: SCENE is renderer-agnostic
  data, GL and C2D both consume it, so later phases add geometry once.
  Planar reflection is done by mirroring about y=0 -- no second camera and no
  second render target, and the gloss falloff drops out of height above the
  plane. rAF runs only while the parallax is easing; an idle page costs
  nothing. Reduced motion disables parallax and freezes the grain seed so the
  still is a still.
- Verified: WebGL2 path and forced `?renderer=2d` fallback both render Home
  correctly with the address in the first paint; longest IPv6 at 320px with
  no horizontal scroll; clean network (4 same-origin requests, no third
  party); no console errors; node --check passes.
- **Not deployed, not committed.** Next: phase 3 (O1, the announced block),
  which needs the user's call on open decisions 1, 2 and 5 in
  docs/ip-art-direction.md first.

## 2026-09-16 -- ip: phase 3, the announced block

- Three design calls put to the owner before building, per their standing
  request to be asked rather than told. 1 (the origin holds the SUBJECT, so
  the block is centred and the address sits at its real index inside it) and
  2 (IPv6 counted in /64 subnets, IPv4 in addresses) went as recommended.
  **5 did NOT**: the recommendation was to stop the axis where the routing
  data stops; the owner chose to let an unannounced address travel anyway.
  Their reason, given separately and now written into the plan as a standing
  rule: wandering is the point of the product and is not a reward for having
  good routing data.
- Owner also flagged mid-build that the wander/explore aspect was getting
  squeezed out by renderer work. Fair. Written into docs/ip-build-plan.md as
  "The thing that must not get squeezed out": the axis is held not stepped,
  anything real can be touched, the axis never stops because the data ran
  out, and no phase is done if it made the space smaller.
- **Built.** The scene gained LAYERS -- one instance buffer carrying geometry
  at different world scales and opacities, so one state grows into frame as
  another shrinks out of it. That is the mechanism every later state needs,
  so it was worth building properly now rather than per-phase. Surfaces were
  ported from the gate too (first phase with a face to put one on).
- The axis is continuous and does NOT snap. Keyboard steps whole states.
- Data: RIPEstat network-info + as-overview, fired only once the visitor has
  moved off Home, cached in localStorage for a week. An arrive-copy-leave
  visit still talks to nobody but our own edge.
- Two real bugs found and fixed while verifying:
  (1) A NUL byte had got into ip.css from a mangled `\00b7` escape -- it made
      the file binary. Replaced with a literal middle dot.
  (2) The plate is DOM but was only updating inside the render loop, so on a
      throttled or backgrounded tab the text lagged the data. Text now
      updates synchronously; only the picture waits for a frame.
  Also: the annotation on the visitor's mark now flips and clamps rather than
  running a 39-character IPv6 address off the frame.
- Verified live: 193.0.6.139 -> 193.0.0.0/21, AS3333, RIPE NCC, 2,048
  addresses; 2001:67c:2e8:22::c100:68b -> 2001:67c:2e8::/48, "one mark per 16
  subnets, 65,536 in the block"; 203.0.113.42 -> "No announced block" stated
  immediately. 320px with no horizontal scroll. node --check passes.
- Tuning note worth keeping: 2,048 marks at the brightness that suits 256
  merge into one lit slab. Mark intensity and size now scale with density.
- **Not deployed, not committed.** Next: phase 4, which is where the
  wandering actually starts -- O2 the network's other blocks, O3 observed
  neighbours, and selection re-pointing the instrument.

## 2026-09-16 -- ip: phase 3.5, the block becomes a place

- Owner asked whether any wandering could be added before phase 4 that is
  still beauty. The answer that needed no new data at all: **every one of the
  2,048 marks in the announced block is a real address**, and a mark's
  POSITION IS its offset in the block. So the field can name whichever mark
  the pointer is nearest, continuously, with zero network requests -- it is
  arithmetic, not a lookup.
- Deliberately NOT a hit target. The field answers the hand continuously, so
  there is nothing to aim at and no way to miss -- which is the three-year-old
  test from the brief (touch it, something happens, every time).
- Done by casting the pointer as a ray onto the block's own plane and turning
  the hit back into a cell: O(1), rather than projecting two thousand points
  every frame. The camera has no roll and no yaw, so the basis is constant and
  the ray is three lines of arithmetic.
- The cursor mark and its light pool live in ONE RESERVED SLOT on the end of
  the point and pool instance buffers, written with bufferSubData each frame,
  so the field it moves over is never re-uploaded.
- When one mark stands for many (a /21 shows one mark per address, but a
  large IPv6 block does not), the readout says the range rather than implying
  a single address: "16 subnets" with "2001:db8::  -  2001:db8:0:f::" under it.
- Verified live on 193.0.0.0/21: hovering names 193.0.4.23, 193.0.0.102 and so
  on, all genuinely inside the block, and the visitor's own mark reads
  "193.0.6.139 - yours".
- **Not deployed, not committed.** Phase 4 next: O2, O3, and selection
  re-pointing the instrument.

## 2026-09-16 -- ip: orbit, the address's own structure, and an inverted-pointer bug

- **Bug the owner reported: the pointer was inverted while wandering the
  block.** Root cause worth remembering. `look()` builds its basis from
  `z = normalize(eye - at)`, which for a camera facing +z gives a right
  vector of (-1, 0, 0) -- that is correct for a right-handed world, not a
  bug. But the hand-rolled ray in `cursorAt` assumed right = (+1, 0, 0), so
  it ran the wrong way; and the parallax had the same sign wrong, pushing the
  eye AWAY from the pointer instead of leaning toward it. Both now derive
  from a single `camBasis()`, so they cannot drift apart again.
- **A second bug the first one exposed: the block read right-to-left.** With
  world +x rendering on the screen LEFT, laying columns out along +x put
  address offset 0 on the right. Fixed with a `SCREEN_X()` helper and a loud
  comment in CONFIG, because every later phase lays out a grid (O2's slabs,
  the Hilbert field) and would have inherited it. Verified: hovering left
  gives column 27, right gives column 34.
- **Orbit added.** Yaw only -- rotating about Y leaves the pitch, the horizon
  and the origin exactly where the art direction fixes them, so it is still
  one instrument and you are walking around the plate rather than tilting it.
  Horizontal drag orbits, vertical drag still moves the scale axis, left/right
  arrows step it, Home resets both.
- **The address's own structure.** The part every address in the block shares
  is dimmed; only the varying tail is bright, in both the visitor's own mark
  and the hover readout. Wander and the dim part never changes -- the prefix
  shown rather than said -- with "21 bits fixed, 11 vary" under it. Computed
  from the common text prefix of the block's first and last address, split
  only at a separator, and only claimed when it really is a prefix of that
  address (an IPv6 text form can compress differently, and then the claim
  would be false).
- **Not deployed, not committed.** Phase 4 next.

## 2026-09-16 -- ip: phase 3b, the address space (and IPv6 as a real place)

- Owner asked whether the OTHER address space could be explored, and flagged
  IPv6 explicitly. Put to them first, because it **reverses their own brief's
  section 17**, which had replaced a six-stop address-space ladder with the
  network ladder. They chose "both, space first". The argument that won it:
  address space is free (pure arithmetic, zero lookups), it gives IPv6 equal
  standing, and it becomes the wandering the product is for --
  **space is the map, networks are what you find in it.**
- Their extra ask, and the best note in the whole thing: *"maybe a note or
  disclaimer that isn't too loud if the exploration goes away from the actual
  truth"*. So the field draws the epistemic line: your block is lit because
  it was looked up; every other cell is dark because it is real address space
  that **nobody has asked about**. Hovering one says "not asked". The plate
  says it once, quietly, and never again.
- Two new axis states, both 64x64 Hilbert fields of 4,096 blocks:
  axis 2 = the containing block (e.g. 193.0.0.0/9 for a /21, or 2001:67c::/36
  for a /48); axis 3 = all of IPv4, or 2000::/3 for an IPv6 visitor.
- **The IPv6 size gap is stated rather than implied**: one ordinary /64 holds
  18,446,744,073,709,551,616 addresses, about four billion times the entire
  IPv4 space. Verified against IANA/RFC 4291 before putting a number on
  screen.
- The layer system earned itself: four outward states now cross-fade on a
  cos-squared partition of unity and each is drawn at its own power of ZOOM,
  so pulling the axis is travel rather than a slide change.
- **Bug found and fixed: IPv6 text compression.** The regex form produced
  `2000:0:0:0:0:0:0:0/3` instead of `2000::/3`. Replaced with a proper
  RFC 5952 longest-zero-run collapse, done by hand, and unit-checked.
- Also fixed: the plate's opacity was still tied to the block layer, so it
  vanished at the new states.
- **Not deployed, not committed.** Phase 4 next: the network ladder, which
  the space now feeds into.

## 2026-09-16 -- ip: blocks are choosable, and five bugs

- Owner asked whether the other cells should be clickable and become the
  focus "with new info in context to the user's ip". Yes, and it is now the
  wandering mechanic: point at address space nobody has asked about, click,
  and asking is what turns it into a place with a name.
- **The field records what has been asked.** Three honest states per cell:
  unasked (dark), asked-and-announced (lit, and it stays lit), and
  asked-and-nothing-there (marked, but dimmer -- "nothing announced here" is
  a real answer, not an absence). Exploration literally lights the map, and
  only with things actually looked up. Hover reads "not asked" / "asking" /
  the AS and holder.
- **A chosen block is described in terms of the visitor's own address**,
  which is the only reason another block is interesting: how many blocks away
  it is, whether it is the same network as theirs, and -- the good one -- when
  the announced prefix differs in size from the cell they pointed at:
  "You pointed at 193.106.8.0/21; what is announced there is 193.106.8.0/22."
  Live-verified against AS215722 LapIT Oy and AS1241 Nova Telecommunications.

### Bugs found and fixed this pass

1. **Hard boot break.** `syncDom` referenced `n` (the net) without declaring
   it; the throw happened during boot, so the address never loaded at all.
2. **GL object leak.** `upload()` built new VAOs and buffers on every rebuild
   and orphaned the previous set. Now tracked and released. This mattered
   more once rebuilds became frequent (every lookup rebuilds the field).
3. **Fallback did 4,096 sprite blits a frame** at the space states -- ~21ms a
   frame on a fast desktop, on the renderer that exists for slow devices.
   Only marks above an alpha threshold earn a halo sprite now; the rest are
   a couple of pixels, which is all they are on screen anyway.
4. **Tap selected a different cell than the hover.** `onTap` re-cast the ray,
   but the parallax eases the camera between the last pointermove and the
   click, so the same screen point had moved to a neighbouring cell. Taps now
   act on whatever is actually lit and labelled. Rule worth keeping: act on
   what is displayed, never on a fresh raycast.
5. **Plate opacity** was still tied to the block layer, so it vanished at the
   space states.
- Console 404s chased and confirmed harmless: all four of the page's own
  resources return 200; the 404s are `whoami` (the edge function is not
  deployed) and stale entries in the tool's console buffer.
- **Not deployed, not committed.**

## ip — phase 4.5 step 1: the ladder (2026-09-16)

Research first: `docs/ip-infinity-research.md`, commissioned by the owner
("I think there could be a infinite appearance thing kind of build in", then
"it should be explorable ... rather than ground truth with it displayed as
not being ground truth ... Almost like no man sky or minecraft"). Three
decisions locked by the owner, all of them the recommendation: per-family
rail at real bit depth, ghost networks only, ship every registry table that
packs small enough. `docs/ip-build-plan.md` gained phase 4.5, inserted after
the ladder rather than appended.

### The depth is now true

The axis used to stop at 3 for everyone, because 3 is what IPv4 needs. It is
now the real bit depth of the family: **2.67 steps for IPv4, 10.42 for IPv6**.
One step is 12 bits (4096 cells), walked as a ladder of rungs through four
recycled layer slots, so a ten-rung ladder costs what a two-rung one does.

Live-checked. IPv4 193.0.6.139 is unchanged from before: block /21 AS3333
RIPE NCC, then /12, then all of IPv4. IPv6 2a00:1450:4009:81f::200e walks
/116, /100, /88, /76, **/64**, **/48 (AS15169 Google LLC)**, /40, /28, /16,
2000::/3 — ten stops, all correct, in both renderers, no console errors.

### Three things worth not re-deriving

1. **Floating origin was already satisfied**, by construction rather than by
   design. A field is a container plus a cell offset, and an offset is never
   above 4095, so no absolute address ever reaches a float. 128 bits would
   not survive one. Written down as a standing rule and commented in place.
2. **The lattice is pinned to /64, not to the announced block.** Pinning to
   the block was the obvious idea and it is wrong: a v6 /32 anchored on
   itself gives rungs at /44, /56, /68, straddling /64 and never framing it.
   /64 is the one boundary every IPv6 network shares. So the block became a
   LANDMARK BETWEEN RUNGS — drawn by its own layer at its own position,
   marked wider on the rail, and hit by the keyboard. Truer anyway: a prefix
   length is a fact about the visitor, not about the shape of the space.
   The payoff state is the rung at /52: "4,096 blocks of /64, and one of
   them is yours."
3. **`layers()` already implemented a Shepard tone** — superposed octaves,
   cos-squared partition of unity, one fading in as another fades out —
   built without anyone noticing what it was.

### Bugs found and fixed while verifying

1. **Plate text went stale mid-travel.** `setAxis` only reached `syncDom`
   when a rung boundary was crossed, so between rungs the plate kept naming
   a rung the axis had already passed. Same rule as before, now enforced in
   two more places: TEXT MUST NEVER WAIT ON A FRAME.
2. **`syncDom` read `layerAlpha` without recomputing it.** The weights decide
   which state owns the plate and are computed per frame, so on a throttled
   tab the text could read weights that were never updated. `syncDom` now
   calls `layers()` itself; it is idempotent with the frame's own call.
3. **An empty BLOCK layer took a share of the normalised weight**, dimming
   the field for exactly the visitors with no announced prefix — the ones
   with least to look at. It only counts when there is geometry.
4. **A dead first gesture on IPv6.** The nearest rung was a whole step out of
   range, so the first pull of the axis moved nothing. The deepest rung the
   family allows is now always offered; it drops out again on IPv4, where it
   would crowd the block.
5. **Weights had to be normalised.** cos-squared is a partition of unity only
   while the rungs are exactly one step apart, and the floor clamp and the
   block both sit off-lattice, leaving gaps of up to 1.33 steps. Left alone
   the picture dimmed at every crossing. Dividing through by the sum is what
   lets the block sit wherever it really is instead of being shoved onto the
   lattice to keep the maths tidy.
6. **`PROJECT_STATE.md` itself had a NUL byte** — from the note *about* the
   NUL byte in `ip.css`, whose middle-dot CSS escape got mangled a second
   time on the way in. Repaired. Standing rule: do not write that escape
   sequence literally in any file in this repo -- name it in words. It has
   now corrupted three files, including this sentence's own first draft.

### Measured, for phase 4.5 step 3

Full NRO delegation dataset, range-merged on (RIR, country), delta-varint
packed: **291 KB gzipped** (IPv4 204 from 143,466 ranges, IPv6 87 from
68,863), 240 countries. Too heavy for the first paint, fine deferred to the
same trigger as the RIPEstat lookups. The small tables — IANA /8s, the 51
rows that describe all of 2000::/3, RFC 6890 — are a few KB and ship inline.

### Still true

- **Not deployed, not committed.** The edge function has still never run.
- Steps 2-5 of phase 4.5 not started: registry tables, landmarks, ghosts.
- Phase 4 (the network ladder: O2, O3, selection re-pointing the instrument)
  is still open and still carries open decisions 6 and 7.

## ip — phase 4: travel (2026-09-16)

The owner, after the ladder landed:

> *"Hmm this should feel like a powerpoint, but almost like the universe
> where you could expore a gyser on mars or check out the milkyway then visit
> the largest crater on europa. Not a one way slide, but exploration."*

Correct, and the cause was structural rather than cosmetic. **One axis
anchored to the visitor's own address is a slider however many rungs it
has.** Every rung was a container around *you*, so the ten rungs built the
day before were ten zoom levels of one place, in a fixed sequence, always
ending at the same slide. Clicking a cell labelled it; nothing anywhere in
the app moved sideways.

### The whole fix is one substitution

`S.aim` — a BigInt — replaces home as the thing everything is built around.
It starts as the visitor's address and stops being it the moment they travel.

- **Choosing a block goes there.** The block takes the origin, the ladder
  re-anchors to it, `S.subject` replaces `S.net` as what the block layer
  draws, and the plate describes where you are relative to home:
  *"2,936,014,475 addresses from yours · a different network from yours"*.
- **Amber is only ever you.** Travel somewhere your address is not and there
  is no amber in the frame at all — `fieldAt` returns `homeIdx: -1` and
  nothing is drawn for it. That absence is what makes the distance mean
  something.
- **`Back` retraces a trail, `Home` returns.** Back is hidden until there is
  somewhere to go back to.
- **Lateral travel** by horizontal drag and by arrow keys, walking the aim
  along the address line — so a container boundary is crossed, not hit. A
  wall is what makes a thing a slide deck. Shift-drag keeps the old yaw.

Owner's calls on the three questions: home becomes a distant marker *plus* a
Home button (not a permanent tether); landmarks should glow as you near them
rather than sit in an index; lateral motion should feel free but stay inside
the nesting.

### Verified live, by real clicks and by the debug API

- `193.0.6.139` home → `193.0.0.0/21` AS3333 RIPE NCC.
- Click a cell in the `/12` field → travelled to `193.1.36.0`, which is
  announced as `193.1.0.0/16` by **AS1213 Asiera**; then `193.13.53.0` →
  `193.12.0.0/14` **AS1257 Tele2 Sverige AB**, 863,861 addresses from home.
- `18.0.0.0` → `18.0.0.0/16` **AS3, Massachusetts Institute of Technology**.
  AS3 is genuinely MIT's, and 18/8 has been theirs since 1981.
- `8.8.8.8` → `8.8.8.0/24` AS15169 Google LLC.
- Back and Home both work from the buttons and from the keyboard.
- Both renderers, no console errors.

### Bugs found and fixed while verifying

1. **The block was blowing out to a white capsule and erasing the field
   behind it.** Two separate causes, both only visible now that travel makes
   every shape of prefix reachable:
   - *Concentration.* Accumulation is additive, so a layer that has shrunk
     puts the same geometry through fewer pixels. Pulled a step past the
     block, the bloom took it to white and the tone map crushed the field to
     nothing. The block now fades by its own shrinkage; because the weights
     are normalised the light goes to the field instead of being lost.
   - *Fixed-brightness furniture.* The rim and the four corner lamps are the
     same brightness whatever they frame, and a square prefix is barely half
     the screen width of a wide one, so they merged. They now scale with the
     block. **The marks were never the problem** — a /14 draws fewer per unit
     area than a /21 does. A wide block is untouched, which keeps the look
     the owner already approved.
2. **`tidyHolder` left an orphan dash.** RIPE returns `"AS8151 - UNINET"` and
   stripping the number alone left the plate reading `"- UNINET"`.
3. **A drag that never got its pointerup kept travelling** on every later
   move. Now cleared when `e.buttons` is 0 and on window blur.

### The one anomaly: explained, and it was not a bug

During one batched check the aim reported `187.144.0.0` after a
`travel('18.0.0.0')`. It could not be reproduced in isolation. **The owner
was clicking the same live page while the checks were driving it** -- their
travel, not a fault. Recorded because the lesson generalises: a shared
preview is a shared session, so an unreproducible anomaly during automated
checking is worth asking about before it is written up as a defect.

The stale-drag guard added above stands on its own merits -- a drag whose
pointerup is lost really would keep travelling -- but it fixed nothing here.

### Still true

- **Not deployed, not committed.** The edge function has still never run.
- Phase 4 still owes **O2** (the network's other announced blocks) and **O3**
  (observed neighbours), plus open decisions 6 and 7.
- **Free spatial panning is deferred on purpose.** Doing it properly means an
  unbounded Hilbert window and a BigInt Hilbert transform, with a tiled
  fast path so a 64x64 window does not cost 237k BigInt iterations a rebuild.
  Deferred until the travel model had been looked at, which it now has.
- Phase 4.5 steps 2-5 untouched: registry tables, the 291 KB dataset,
  landmarks, the ghost tier. Landmarks are what will make travel have
  destinations rather than only coordinates.

### Deploy tooling fix, 2026-09-16

`scripts\deploy-hosting.ps1` line 62 had `"...$envFile:"`. PowerShell parses
`$name:` as a drive-qualified variable (the same syntax as `$env:PATH`), so
the file failed to PARSE -- meaning the script never ran a single line and no
AWS call was made. Fixed to `${envFile}`. All three deploy scripts now pass
`[Parser]::ParseFile`, which is a non-executing check worth running on any
`.ps1` before handing it to the owner, since a parse error hides behind a
script that has "always worked" until a new caller trips it.

## ip — DEPLOYED AND VERIFIED, 2026-09-17

Live: `https://<DISTRIBUTION_DOMAIN>/ip/`

**The CloudFront Function ran for the first time and works.** The header that
proves it is `X-Cache: FunctionGeneratedResponse from cloudfront` -- the
response is generated at viewer-request and never reaches the origin, which
is the whole architecture in one line. `curl` gets `text/plain`; the page
gets JSON with the request headers and `"note":"Seen for this response. Not
kept."`. The live page shows the real address in the first paint. No console
errors, WebGL2 path.

This is also the first time the system's rule that adding an app never
touches the stack has been broken on purpose, and it held together: the
hosting deploy added the `IpWhoami` function, the `/ip/whoami` behaviour and
the `/ip/` link on the landing page.

### What went wrong on the way, and what each thing taught

1. **`deploy-hosting.ps1` would not parse.** `"...$envFile:"` -- PowerShell
   reads `$name:` as a drive-qualified variable, the same syntax as
   `$env:PATH`. Because it is a PARSE error the script never executed a line,
   so nothing was half-deployed. Fixed to `${envFile}`. All three deploy
   scripts now pass `[Parser]::ParseFile`, a non-executing check worth
   running on any `.ps1` before handing it over -- this bug had sat in the
   file since 2026-09-02 and only surfaced when a new caller tripped it.

2. **`/ip/whoami` 404'd after the app deploy.** Diagnosed from evidence
   rather than guessed: the 404 carried `Server: AmazonS3` and a
   `Last-Modified` of 2026-09-02, `hosting/cdk-outputs.json` did not exist,
   `.hosting-outputs.env` was still dated 02 Sep, and the live landing page
   had no `/ip/` link. All four said the same thing -- `deploy-app.ps1` had
   run, `deploy-hosting.ps1` never had. `deploy-app` succeeds without it
   because the September env file still holds valid bucket and distribution
   ids, which is a sharp edge worth remembering.

3. **The Back button showed at Home with nothing behind it.** `hidden` was
   being overridden: the UA rule for `[hidden]` is `display:none`, but any
   author `display` on the element outranks it, and `#controls button` sets
   `display: inline-flex`. The same trap was already known in this very file
   -- `#copy[hidden]` carries a comment about it -- and the new buttons
   simply did not inherit the fix.

4. **Home was hidden by the axis.** `body[data-state="home"]` is about how
   far out the axis is, which was correct until travel existed. A visitor can
   now be a long way from their own address while the axis has barely moved,
   and that is exactly when Home matters most. Both controls are now decided
   in `syncDom` from `away()` and the trail, not in CSS.

### A correction to this file's own record

The earlier note about an unexplained aim jump to `187.144.0.0` is resolved:
**the owner was clicking the same live page while the automated checks were
driving it.** Not a fault. The lesson generalises -- a shared preview is a
shared session, so ask before writing an unreproducible anomaly up as a
defect.

Separately, I briefly reported the deployed `ip.js` as stale. It was not: I
compared a byte count (106,621) against a character count (104,755). Same
file. Check the units before calling something stale.

### Still true

- Phases 5-7 unbuilt; phase 4 still owes O2 and O3; phase 4.5 steps 2-5
  (registry tables, the 291 KB dataset, landmarks, the ghost tier) untouched.
- **Nothing is committed.** The repo has the whole of `apps/ip/` untracked.
- A CSS + JS fix (items 3 and 4 above) is on disk and NOT yet deployed --
  it needs another `deploy-app.ps1 -Name ip`.

## ip — travel was half-broken; found by the owner, 2026-09-17

> *"I cant seem to zoom in on other things. Is that correct?"*

Not correct. Two real bugs, both introduced with travel and both invisible
while the only reachable place was the visitor's own address.

1. **The ladder collapsed after travelling.** The anti-crowding rule dropped
   any rung within a third of a step of the block. A /16 block sits exactly
   0.333 from the rungs on *both* sides, so both were culled: travel to
   `18.0.0.0` and the ladder went from three rungs to **one**, leaving the
   axis doing nothing across most of its range. The only genuine duplicate is
   a rung whose container IS the block -- that field and the block's own grid
   are the same thing drawn twice. Everything else is a different scale and
   may overlap freely; the weights are normalised, so nothing brightens.
   Now `[20, 12, 0]` again, and the axis reads /20 -> the /16 block -> /12 ->
   all of IPv4.

2. **Cells inside the block were not clickable.** `cursorAt` never set
   `field: true` on the block branch, so `onTap` bailed. The most detailed
   view in the app was the one place you could look but not go -- against the
   plan's own standing rule that anything real on screen can be touched and
   touching it does something. Clicking a block cell now travels to that
   address. Also fixed there: the tip was splitting the address against
   `S.net.cidr` (home's prefix) rather than the subject's, so after travel it
   underlined the wrong digits.

3. **The plate was decided by if-order, not by weight.** While away, the
   block kept the plate even when a rung half again as bright was the thing
   filling the frame. Both `plateFor` and `summary` now compare alphas.

### The part that is NOT a bug, and is worth saying out loud

**IPv4 has almost no inward depth, and that is the truth of IPv4.** The whole
axis is 2.67 steps. A /16 leaves 16 bits underneath it -- 1.33 steps -- and
the block's own grid already shows all of it. There is genuinely not much
"in" to go. IPv6 is a different object: travelling to Cloudflare's
`2606:4700:4700::1111` gives the full ten-rung descent through `/116, /100,
/88, /76, /64, /52, /40, /28, /16` to `2000::/3`, with the announced `/48`
(Cloudflare, Inc.) as a landmark between rungs at s=6.67. The asymmetry the
owner can feel here is the size difference, not a defect.

### Lesson

A feature exercised only against the user's own data hides its bugs. Travel
made every prefix shape and every ladder anchoring reachable, and three
separate faults surfaced within minutes of the owner actually wandering.
Build the general case, then go somewhere that is not home.

**Needs `deploy-app.ps1 -Name ip` -- these fixes plus the two control bugs
are on disk and not yet live.**

## ip — arriving, and landmarks (2026-09-17)

> *"I still dont know how I would zoom in on other point. It would be good to
> learn about other things."*

Two separate failures, and the first was mine to have caught: travel worked
but was **unguessable and gave no feedback**. Nothing said a cell could be
clicked, the pointer did not change over one, and a click re-aimed the
instrument without moving it -- so it read as a dead control. Building a
mechanic is not the same as making it findable.

### Arriving

- **A click now flies.** The axis eases to the scale that frames what was
  chosen, then settles on whatever network turns out to be announced there
  once the lookup answers. Eased on the same curve as the parallax, jumped
  instantly under reduced motion, and cancelled the moment a hand touches the
  wheel or drags -- the instrument never fights the visitor.
- This does not reopen "the axis is held, not stepped". That rule is about a
  DRAG not snapping when the hand lets go. An explicit choice of somewhere to
  go is a request to be taken there.
- **The pointer says so** (`.pick` over any nameable cell) and a line under
  the frame says it outright -- "Point at any block, then click to travel to
  it" -- until the visitor has travelled once, then never again.

### Landmarks: things to learn about

A static table, every entry either a fact fixed by an RFC or an address
published by whoever operates it, so nothing needs a lookup and nothing can
rot into fiction. Where a landmark has a holder, the holder is still earned
by the same RIPEstat call as every other block -- the note says what the
place IS, the instrument says who is actually there.

Verified live: `240.0.0.0/4` "Reserved for the future"; `127.0.0.0/8`
"16,777,216 addresses that all mean here"; `192.0.2.0/24` TEST-NET-1;
`8.8.8.8` Google Public DNS (AS15169 confirmed by lookup); `1.1.1.1`
Cloudflare + APNIC (AS13335 confirmed); and all thirteen root servers in both
families. **The root addresses are not from memory** -- they are the current
contents of the IANA root hints, https://www.internic.net/domain/named.root,
fetched and read rather than recalled.

Best accident so far: `193.0.14.129` is `k.root-servers.net`, and the
development fixture `193.0.6.139` is **2,038 addresses from it**. The test
address has been next door to a root server the entire build.

Landmarks are lit WITHOUT being asked about, and are the only thing allowed
to be -- no lookup was skipped to know them. Everything else still obeys
lit = known, dark = unasked.

### Bugs found while building this

1. **The plate claimed "and one of them is yours" about fields home is not
   in.** Introduced by travel and false on every travelled-to field. Now
   conditional on `f.homeIdx >= 0`.
2. **A landmark covering a sixteenth of IPv4 lit 256 cells at lamp
   brightness**, blowing a quarter of the map to white and crushing the rest
   against it. Brightness per cell now falls with the square root of the
   cells covered, so a big landmark reads as lit territory and a small one as
   a point. Same concentration problem as the block, third time in this app.
3. **The fly-in stepped blindly inward**, so from an already-close axis it
   flew to zero -- a single address with nothing around it. It now targets
   the scale that frames the chosen cell.
4. **Point landmarks never got the plate.** The rule was "the frame is inside
   the landmark", which is true of regions and never of a single host, so
   root servers and resolvers were silently outranked by their own block.

### Still true

- **Needs `deploy-app.ps1 -Name ip`.**
- Nothing committed. Phase 4 still owes O2/O3; phase 4.5 steps 2-3 (the
  registry tables and the 291 KB dataset) and step 5 (the ghost tier) remain.
- Free spatial panning still deferred (unbounded Hilbert window).

## ip — the shape of a network (2026-09-17)

> *"a ball seems to follow the mouse but it is weird spots. Also there
> doesn't seem like a ton of information ... It just feels like the sliding
> in and out with a new ipaddress on top."*

Both fair. The first was a bug; the second was the truth about the design.

### The ball

`writeCursor` pinned the highlight to `LY.BLOCK`, so a cursor whose
coordinates are in a FIELD's local space was drawn at the block layer's world
scale — a glowing ball wandering the frame nowhere near the cell it belonged
to. It only ever looked right back when the block was the only pickable
thing. Fixed to use the cursor's own layer, in the GL path, the Canvas 2D
path, the stale-cursor rule and the label placement. Measured after: pointer
at CSS (268, 181), highlight at (268.7, 180.7) — sub-pixel.

### Why it felt like an address on top of a slider

Because it was. **Every network looked identical.** A university and a CDN
drew the same grid of dots; only the caption changed, so travelling to twenty
places showed one picture twenty times. Landmarks gave destinations but not
substance on arrival.

A network is not one block — it is every block it announces, and that is
wildly different from one to the next:

    RIPE NCC  AS3333        6 blocks,     4,608 addresses
    Google    AS15169   ~1,400 blocks
    Akamai    AS20940    3,953 blocks, 15,624,128 addresses

Arriving now lights up everywhere else that network lives, and the plate
says how many of the blocks in view are theirs and how much they hold in
all. RIPE lights six cells in a corner; Akamai lights 532 in the same frame.
Same data path as everything else (RIPEstat `announced-prefixes`, cached).

It also makes the standing disclaimer honest: once a network has been asked
about, "only yours has been looked up" is no longer true, and the copy now
says what IS known and that nothing else here has been.

### Bugs found while building it

1. **Address totals were summed across families.** `announced-prefixes`
   returns IPv4 and IPv6 together, and one IPv6 /32 is 2^96 addresses, so
   RIPE NCC was reported as holding 20,551,738,933,448,695,970,009,600
   addresses. Counted per family now, and reported in the family in view.
2. **"N blocks here" was counting lit CELLS, not prefixes** — so a single
   aggregate covering the frame read as "4,096 blocks". It counts prefixes
   that reach into the field, which is the number that means anything.
3. **The footprint blew out.** Akamai holds thousands of separate /24s, each
   one cell: individually tiny, collectively the whole frame at full
   brightness. Dimmed by how much of the FIELD is covered rather than by the
   size of each prefix. Fourth time concentration has bitten in this app —
   it is now a standing thing to check whenever anything can be drawn many
   times at once.

### Still true

- **Needs `deploy-app.ps1 -Name ip`.**
- Nothing committed.
- O3 (observed neighbours — AS3333 has 965) is still unbuilt, and is the
  obvious next source of "what is this network" information.
- Phase 4.5 steps 2-3 (registry tables; the 291 KB dataset) would give the
  MAP structure, so different regions look different even before anything is
  asked about. That is the other half of the answer to "not a ton of
  information".

## ip — the zoom follows the click (2026-09-17)

> *"First I kind of want the zoom to follow the last click. Not whatever it
> is."*

`arrive()` removed. It re-aimed the axis at whatever prefix the lookup turned
out to announce, which was wrong twice over: the camera moved a SECOND time,
on its own, a beat after the visitor had already stopped — nothing on screen
asked for it and nothing explained it — and it overruled a direct choice with
an asynchronous one. You pointed at a block and the instrument took you
somewhere else because a server said so.

**Standing rule: the axis goes where the visitor sent it and stops there.**
The announced prefix is still drawn and still named on the plate. It does not
get to steer.

Verified: click a cell in the /12 field at s=1.67 and the axis eases
1.62 / 1.02 / 0.79 / 0.71 / 0.68 / 0.67 and then holds at 0.67 through the
lookup landing and for six seconds after. The plate fills in underneath it —
"193.13.48.0/20 · 4,096 addresses · 1 of these blocks is announced by AS1257
· Tele2 Sverige AB, which announces 383 blocks" — without the frame moving.

**Needs `deploy-app.ps1 -Name ip`.**

## ip — the camera belongs to the hand holding it (2026-09-17)

> *"I would like to zoom in myself click then that is new focus I zoom in at
> my pace on it with the center not being what you clicked until you get in
> far enough."*

A better model than either of the two I built, and the third correction in a
row on the same theme. **A click moves the AIM and nothing else.** No flight,
no easing, no re-aiming when a lookup lands. The camera never moves unless
the visitor moves it.

What makes this work is that the framing converges on its own. Every rung
derives its container from the aim, so at the scale the visitor is already
at, the block they picked is inside the same container they were in — only
the marker moves and the plate fills in. Zoom in and the containers get
smaller around the new aim until the chosen thing IS the frame. Measured,
after clicking 193.13.53.0 from the /12 field:

    s=1.67  frame 193.0.0.0/12     (unchanged by the click)
    s=1.40  frame 193.12.0.0/14    (the announced block)
    s=1.20  frame 193.13.48.0/20   (the choice is now the centre)
    s=0.67  frame 193.13.48.0/20

Nothing teleports, and nothing is centred before it has earned it.

All three earlier attempts failed the same way: the instrument moved itself.
`arrive()` re-aimed at whatever the lookup announced, a beat late. The flight
took the visitor somewhere they had not asked to be. Both were me deciding
where the frame should sit.

**Standing rule, now in the source and in memory: the axis belongs to the
hand holding it. Late-arriving data may fill in the text; it may never move
the frame. Nor may a click.**

The hint copy teaches the model rather than promising travel: "Click any
block to focus it — then zoom in on it yourself."

**Needs `deploy-app.ps1 -Name ip`.**

## ip — zoom that converges on the choice (2026-09-17)

> *"It feel less like you are going to the point you click. That is part of
> the journey. I found a point now let me zoom in on that point. Can you do
> some research?"*

The owner was right and their explanation was not the problem; mine was.

### What the research says

- **Pointer-anchored zoom** is the standard: the point you picked holds its
  place on screen while everything scales around it. Google Maps, GIMP,
  OpenSeadragon, Qt's `AnchorUnderMouse`.
- **van Wijk & Nuij, "Smooth and efficient zooming and panning" (InfoVis
  2003)** is the formal model: a view is a (centre, width) pair, and moving
  to a target traces a path along which **the centre slides toward the target
  as the width shrinks**. https://vanwijk.win.tue.nl/zoompan.pdf
- Furnas & Bederson's space-scale diagrams (CHI '95) are the underlying
  theory of pan-and-zoom as a single space.

### What was wrong

Every rung frames an ALIGNED container, because the arithmetic demands it.
So the chosen block jumped to a new place on screen at every boundary it
crossed and never travelled toward anything — flicking through slides of
different sizes rather than going somewhere. There was no centre sliding
anywhere, because there was no centre: only a stack of boxes.

### The fix

The container stays aligned; the FIELD is panned. `conv` runs 0 -> 1 over
about a rung and a half from the zoom the choice was made at, and each live
rung is translated from container-centred to choice-centred by that amount.
Measured, clicking a block 46px off centre and then zooming in by hand:

    s=1.67  frame /12   off-centre 46px      (the click: nothing moves)
    s=1.55  frame /12   off-centre 43px
    s=1.40  frame /12   off-centre 39px
    s=1.25  frame /20   off-centre 17px      (the frame hands over)
    s=0.95  frame /20   off-centre 14px
    s=0.40  frame /20   off-centre  9px

Monotonic, no jumps, and the visitor drives all of it.

Implemented as a per-layer uniform `uPan[]`, not as baked geometry: it has to
change continuously with the axis, and rebuilding twelve thousand points per
frame to express a translation would be absurd. Picking, the hover targets,
the tip label and the Canvas 2D path all apply the same pan, or the hand and
the picture disagree.

### Bugs found while doing it

1. **The pool program does not include the COMMON shader block**, so adding
   `uPan` only to COMMON was a compile error — which took the WHOLE renderer
   down, not just the pools. Black screen, no console error, because the
   throw was swallowed. Worth remembering: this file has two uniform blocks.
2. **Three separate things were keyed off the axis that should have been
   keyed off `away()`**: the Home button, the body `data-state` (so the big
   centred address ballooned back over the frame while the visitor was deep
   inside somebody else's network), and the plate opacity (so the only label
   naming where they were faded out at low zoom). Travel made "Home" mean a
   place rather than a zoom level, and these three did not get the memo.

**Needs `deploy-app.ps1 -Name ip`.**

## ip — layer transitions: measured, improved, root cause named (2026-09-17)

> *"def a lot better not quite there. I think it is the transition between
> layers where it falls apart a bit."*

Right, and measurable. Instrumented the probe to report where the chosen
block lands **in every live layer at once**. During a cross-fade the two
layers placed it **23px apart**, both at meaningful alpha — the same block
visibly in two places. That is what falling apart looks like.

### Root cause, which is structural

The layers are not spatially registered. Each rung draws its container as a
64x64 grid CENTRED at the origin at its own scale, so a given address lands
somewhere different in each. For two rungs to overlay exactly, two things
must hold at once:

1. the scale between adjacent rungs must be FIELD (64), because a rung's
   container is one cell of the rung above it; and
2. each field must be drawn at the position its container occupies inside
   its parent, rather than centred.

**Tried (1) alone: it made things worse, 23px -> 147px.** Scaling up an
unregistered offset only magnifies it. Recorded because it is the kind of
half-fix that looks obviously right on paper. ZOOM is back to 3.4 with the
reasoning written into the source so nobody tries it again.

Proper registration is the unbounded-Hilbert redesign already deferred twice
(a global Hilbert layout with orientation carried down, so every level is a
window onto one curve rather than its own local grid). It is the same fix
that free spatial panning needs.

### What was done instead, and what it bought

The aim IS registered across every layer once the convergence completes,
because every layer then places it at the origin. So the convergence was
retuned to finish inside a single step — one layer transition — which locks
the thing the visitor is actually watching even though the texture around it
still does not agree. Measured at the crossover, where the two layers are
equally visible:

    before   19px apart at alphas 0.31 / 0.29
    after     6px apart at alphas 0.31 / 0.29
    worst disagreement anywhere, weighted by the fainter layer: 3.2

Honest summary: better, not solved. The residual is the unregistered
surrounding texture, and it will stay until the layout is global.

**Needs `deploy-app.ps1 -Name ip`.**

## ip — plan v2, and phase A begun (2026-09-17)

A long design conversation ended somewhere neither of us expected. The whole
of it is in `docs/ip-plan-v2.md`, which supersedes the old plan from phase 5
onward. Nine phases, ordered, plus cross-cutting design for the guide, the
content format, the cold open, the tracker, sound, beauty and wonder.

### The findings that changed the product

- **The emptiness was never a content problem.** Open worlds run on a
  four-beat loop: see something from here, go to it, get something, and from
  the new position see the next thing. This app had beat two and a weak beat
  three. Bethesda places points of interest within sight of one another;
  Breath of the Wild introduces one every ~40 seconds.
- **The sightline mechanism was already built.** The network footprint IS
  beat four. It shipped as an information feature and was used as a caption.
- **The map was never empty.** 86% of cells at the top view and 100% deeper
  already carry a country, an era and a registry, from data that was sitting
  on disk unused.
- **Awe has two conditions and we delivered neither** (Keltner & Haidt):
  perceived vastness and a need for accommodation. We print a number, which
  is a string, and nothing we show has ever contradicted anything anyone
  believed. Kant's mathematical sublime is sharper still: the feeling is a
  comprehension attempt that FAILS, and the ladder never asks anyone to try.
- **The curriculum is the wonder engine.** Every misconception broken is an
  accommodation event, so the quests are not an educational strand bolted to
  an aesthetic one. They are the same mechanism.
- **Layer registration is not polish.** It is what lets someone watch the
  place they just stood become one cell of the place they are now. Deferred
  twice as a 6px artefact; that judged the artefact right and the stakes
  wrong. It is phase B.

### Owner decisions, recorded

Quests with a real taxonomy (main, side, gated, optional, eggs), a narrator
with character who exclaims and congratulates and is sarcastic, completion
counts, badges, metrics, celebrations, an exported card to brag with, sound,
and the ghost tier restored. **Four separate drafts trimmed the fun on
aesthetic grounds and called it judgement; all four were wrong and the plan
carries a standing note not to reintroduce them.**

Two things were nearly lost silently and were caught: the ghost tier, which
the owner had explicitly chosen on 2026-09-16 and which a draft cut in a
bullet, and sound, which nobody had mentioned in the entire project.

### Phase A begun: `scripts/ip-build-space-field.py`

Builds `apps/ip/data/space.bin` — every allocation the five RIRs have made,
with registry, country and exact year, as sorted non-overlapping ranges with
a delta-varint encoding. Round trip verified by binary search against real
addresses: 193.0.6.139 -> ripencc/NL/1993, 1.1.1.1 -> apnic/AU/2011,
2606:4700:4700::1111 -> arin/US/2011.

**438,937 bytes gzipped.** Four cleverer encodings were tried and all four
lost to the naive one, because gzip's dictionary already beats a hand-rolled
delta scheme; the numbers are recorded in the script's docstring so nobody
re-derives them. The year is what costs: five named eras would be 343 KB,
no year at all 288 KB. Exact years were kept, because 96 KB buys a specific
and surprising per-place fact about every block in the world, on a file that
is deferred until the visitor moves off Home.

The delivery path already exists: `deploy-app.ps1` pre-gzips `apps/*/data/
*.bin` and uploads with the right Content-Encoding. It was built for Tide,
which ships a multi-megabyte binary through it.

**Not wired into the app yet, not deployed.** Next: load it, and draw era,
registry and country into the field.

### Phase A, part two: the registry is in the app (2026-09-17)

`space.bin` loads on the same trigger as the RIPEstat calls and is parsed in
**139 ms** — 171,333 IPv4 ranges and 69,327 IPv6, 6,285 distinct
(registry, country, year) keys. Verified in the live app by binary search:

    193.0.6.139           RIPE NCC  NL  1993
    129.6.15.30           ARIN      US  1987
    1.1.1.1               APNIC     AU  2011
    2606:4700:4700::1111  ARIN      US  2011
    240.0.0.1             null
    127.0.0.1             null
    2001:db8::1           null

The nulls are the point: reserved and special-use space is absent from the
registries because nobody holds it, so it draws as the darkest thing on the
plate and that darkness is true.

**Era is brightness, never hue** — the art direction allows three colour
roles and age is not one of them. Unallocated is darkest at 0.055, and the
gradient runs up to 0.40 for pre-1990 space, which keeps the whole range
below an answered lookup (0.95) and below a network footprint (0.70) so
nothing known-without-asking can outshout something actually asked about.

**Every number is now sized against something.** A year alone is inert, so
`regLine` always states the percentile: *allocated 1993, older than 19% of
the space anybody holds*.

**`fieldMix` makes the descent sayable**, which is what the wonder research
asked for — vastness perceived rather than printed:

    all of IPv4      111 countries, mostly US  1983-2026  14% held by nobody
    193.0.0.0/12      49 countries, mostly SE  1992-2025
    193.0.0.0/20     all of it NL  1993
    2000::/3          21 countries, mostly US  1999-2024  99% held by nobody
    2a00::/16         72 countries, mostly GB  2005-2026  56% held by nobody
    a /64            all of it IE  2009

**IPv6 global unicast is 99% held by nobody.** That is the first line this
app has ever produced that qualifies as an accommodation event under
Keltner & Haidt — something that does not fit what a visitor already
believes. It came out of the data for free.

Both renderers, no console errors. **Not deployed.** Next in phase A: the
queries — *show me Brazil* — which the same file already answers.

One bug found and fixed: `rungPlate` computed the field mix after the
floor-rung early return, so the whole-space view silently read it as
`undefined` and said nothing.

### Phase A complete: the map answers questions (2026-09-17)

**There is no search box, and there should not be.** The plate already says
"49 countries, mostly SE" — so those words ARE the query. Touch one and the
map shows you everywhere it applies; touch it again to stop. No new chrome,
no syntax, and the question is taught by the answer it came out of.

Verified live at the whole-IPv4 view:

    US        34,880 ranges   1,606,217,376 addresses
    BR         5,056 ranges      79,645,184 addresses
    SE         1,962 ranges      31,306,528 addresses
    IS           163 ranges         920,576 addresses
    VA             4 ranges          10,752 addresses
    AFRINIC    4,492 ranges     116,144,896 addresses
    RIPE NCC  81,386 ranges     854,641,184 addresses

The Brazil figure matches the offline analysis exactly, which is the check
that the shipped file and the source agree.

**A query highlights, it never filters.** Matches brighten; everything else
stays exactly as true as it was and merely recedes. A filter would be the
map lying about what is there.

### Concentration, made a function instead of a fifth patch

`spread(n, full, floor)`. Accumulation is additive and the bloom is
generous, so N marks at one brightness in one place read as a single white
hole and the tone map crushes everything around them. This has now bitten
the block, the landmarks, a network footprint and a query highlight — four
separate discoveries, four separate patches, one function. Sweden at the /12
view went from a white blob to a legible shape with the Hilbert structure
visible in it.

**Standing note: anything that can draw many marks at once goes through
`spread()`.**

### Also

- `docs/ip-plan-v2.md` gained **the doors** (phase F): NAT64 `64:ff9b::/96`,
  IPv4-mapped `::ffff:0:0/96`, 6to4 `2002::/16`, Teredo `2001::/32`. Owner's
  easter-egg request, and it is entirely true — 193.0.6.139 is also
  `64:ff9b::c100:68b`, arithmetic verified. Walking through one re-derives
  the ladder at the other family's depth, so an IPv4 visitor steps from a
  2.67-step axis onto a 10.42-step one. The size gap as an event rather than
  a sentence.
- One bug: `rungPlate` read the field mix before computing it, so the
  whole-space view silently said nothing.

**Phase A is done. Not deployed.** Next is phase B — layer registration, the
wonder mechanism, watching the place you just stood become one cell of the
place you are now.

### Phase B: the rungs register (2026-09-17)

**One curve, not one per rung.** Every rung used to run its own `d2xy` over
its own container, so two rungs disagreed about where an address was and the
same block appeared twice through every cross-fade. They now index a single
global Hilbert curve over the whole space at that cell size, which makes a
container an aligned 64x64 tile of its parent automatically. Researched
before building: `child >> 12 === parent` verified for a whole window, and
~20 ms a rung flat with depth, so no tiled fast path was needed.

`ZOOM` is now `FIELD`. It has to be: a rung's container is one cell of the
rung above, so the scale between adjacent rungs is forced. Setting it alone
was tried once and made things worse (23px became 147px) because it needs
the positions too, which it now has.

**Registration verified by geometry, not by eye.** A deeper rung's whole
field must be exactly the extent of the corresponding cells of the shallower
one:

    /12 field = 0.743619    one /0 cell = 0.743619    ratio 1.000000
    /20 field = 0.046476    one /12 cell = 0.011619   ratio 4.000000

Both exact. The 4 is correct, not an error: the ladder's deepest rung is
forced on at `bits - 12` regardless of the lattice, so /20 and /12 are 8 bits
apart rather than 12, and the /20 container really is 4 cells per axis of the
/12 field.

**The convergence survived as a rigid translation.** With the rungs
registered the aim is world zero in every one of them, so it would otherwise
be dead centre from the instant of the click — against the owner's model that
the centre is not what you clicked until you have gone in far enough. So the
pan is now ONE world offset applied to every layer at once, running from
container-centred to aim-centred. Rigid is the load-bearing word: translating
the whole stack together is the only kind of pan that cannot pull the layers
out of register.

### Three bugs, all silent

1. **`var ZOOM = FIELD;` was written above `var FIELD = 64;`.** `var` hoists
   the declaration and not the value, so ZOOM was `undefined`, every scale in
   the app became NaN, and the frame went blank with nothing in the console.
   FIELD is now declared first, with a comment saying why.
2. **`var aimX = mx` ran before `mx` existed**, so `undefined` propagated as
   NaN to the same blank frame. Moved below its inputs.
3. **A half-cell offset in the reference frame.** `ox` was the centre of the
   cell the aim sits in rather than the aim's exact position — a different
   point at every level, and the difference is multiplied by FIELD on the way
   up, so it came out as 28px of disagreement two rungs away. The exact
   position is the only thing every level can agree about.

Also: a NaN ray could index the inverse lookup out of bounds and reach
`BigInt(undefined)`, which throws. Guarded. Verified zero errors across a
hover sweep — the console entries that persisted through several checks were
stale buffer, not live faults.

Both renderers clean. Hovering reads registry facts: `193.4.179.0/24 · IS ·
1993`.

**Still to do in phase B, and it is the wonder half:** the place you just
stood staying outlined as it becomes one cell, and the descent accumulating
so the rungs above are still on screen. The registration is what makes both
possible; neither is built yet. **Not deployed.**

### The phone bug: the fallback never worked (2026-09-17)

Owner reported a black screen on their phone with the text and the controls
still there. **My first diagnosis was wrong and is worth recording as wrong**:
I read `R = makeGL(cv) || make2D(cv)` and concluded that a shader failure
threw out of `boot()` and took `loadAddress()` down with it. It does not.
`makeGL` has its own `try { ... } catch (_) { return null; }` around program
creation, so it returns null and the fallback IS reached, exactly as
designed.

**The real cause, and it has been there since phase 2:**

> A canvas can only ever have one kind of context.

Once `getContext('webgl2')` has succeeded, `getContext('2d')` on that same
element returns null forever. So on a device that HAS WebGL2 but cannot
compile the shaders — a phone without highp in fragment shaders, an old GPU,
a browser with acceleration switched off — makeGL took the context, failed,
returned null, and then the 2D path could not have the canvas back. Both
renderers gone, silently, and a black screen with a perfectly good address
sitting on top of it. **The documented Canvas 2D fallback has never once
worked in the wild.** It only ever ran in tests via `?renderer=2d`, which
skips makeGL and leaves the canvas unclaimed.

Falling back now replaces the canvas element first. Proved with a harness
that forces every shader compile to report failure:

    shaders fail      renderer "2d", picture drawn, address fine, no notice
    both fail         no renderer, address fine, Copy works, plate works,
                      companion works, one quiet line on the bottom

Zero live errors in both, and at a 375x812 viewport. (The console errors that
kept reappearing through several checks were stale buffer entries, confirmed
with an error counter — not live faults. Second time that has cost time this
session.)

Also done, and worth keeping regardless:

- **`loadAddress()` moved above the renderer.** `index.html` promises that
  nothing optional is ever allowed in front of the address, and a shader is
  optional. It also puts the request in flight while shaders compile, which
  is better even when everything works.
- The no-picture notice sits on the bottom line, which was free, rather than
  printing itself through the plate.
- The hint does not invite clicking a picture that is not there.
- That line now wraps: it ran off both edges of a phone and off a desktop.

**Deliberately not done.** The owner's call, and I agree with it: the phone
is not a first-class target yet. Its reasoning — people who use "what's my
IP" for more than twenty seconds are probably at a keyboard, because every
practical reason to look it up is a desktop task — matches how the thing is
used. One caveat recorded for later: **the share path is mobile**, so phase
G's card will land on phones, and that is when mobile has to be good.

The likely shape when it comes: **the phone gets the personal half and the
desktop gets the map.** The inward half (phase H) is DOM, not canvas, so it
works on a phone with no renderer work at all — and it is the better fit for
a short visit anyway. That is a split along a line the product already has,
not a degraded desktop build.

Still open on mobile: the exploration model assumes hover, which phones do
not have, and pinch is not implemented despite the README claiming it.

## 2026-09-18 -- tide: air temperature, not deployed

- User follow-up after the v2 plan closed out: "I forgot something
  important. Air temp and water temp." Water temp already existed
  (phase 9); added air temperature alongside it on the sun line
  ("Air 23C - Sea 26C") from Open-Meteo's plain weather forecast
  (temperature_2m) -- a separate fetch from the tide series, since it
  isn't a tide product and NOAA stations don't carry it. Own
  state.airTemp slot (not tied to state.series), own 3h cache (weather
  goes stale faster than tide predictions), fetched once per place
  alongside loadSeries().
- Shows on BOTH data paths (NOAA and model), unlike sea temp which is
  model-only -- verified San Francisco (NOAA, no sea temp) correctly
  shows "Air 67F" alone with no dangling " - " where Sea would go, and
  Chioggia (model) shows both. Verified units toggle (C/F), and that
  scrubbing beyond the 7-day forecast window correctly drops the line
  rather than showing stale data.
- **Not yet deployed** -- needs `.\scripts\deploy-app.ps1 -Name tide`.
