# Tonight — build plan

From the nine picks in *Shaping Tonight*. A map to build from, not a spec.

## What it is (locked)

One page. On open it finds you (device location, or a search box), then
draws **tonight's sky as a horizon panorama** — you face a direction and
swipe to turn, objects sit where they really are above the horizon. It
**opens on *now*** with a play button that drifts time forward; a scrub
handles dusk→dawn. The picture carries **twilight, the moon, the naked-eye
planets, the Milky Way band and the bright stars**, all computed in the
browser. A **cloud-cover veil** from one free call answers "is it worth
going out," with a plain line ("mostly clear after 11"). **Tap any object**
for a card: name, height, rise/set, and a sentence of advice. The look is
**naturalistic dusk** — real sky-colour gradients, faint grain, soft glow.
**v1 ships everything except satellites; ISS passes are phase 6.**

## Architecture at a glance

- **Tier 1 + two keyless calls.** No backend, no keys, no cost. Astronomy
  is local. Network: Open-Meteo geocoding (search box) and Open-Meteo
  forecast (cloud cover). Both free, CORS-open. ISS (phase 6) adds a third
  source with a caveat — see below.
- **Lives at** `apps/tonight/`, deploys with `.\scripts\deploy-app.ps1
  -Name tonight`, served at `/tonight/`.
- **No framework, no build step.** Vanilla + Canvas 2D. One bundled
  astronomy library (shipped as a local file, not fetched).
- **Files:** `index.html`, `tonight.css`, `tonight.js`,
  `lib/astronomy.js` (vendored), `data/stars.json`, `data/milkyway.json`,
  `README.md`.

## Data sources (real endpoints)

| Need | Source | Notes |
|---|---|---|
| name → lat/lon | `geocoding-api.open-meteo.com/v1/search?name=…&count=5` | keyless, CORS |
| cloud cover tonight | `api.open-meteo.com/v1/forecast?…&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high&forecast_days=2&timezone=auto` | keyless, CORS; cache in `localStorage` ~1 h |
| sun / moon / planets / rise-set / phase | **`astronomy-engine`** (Don Cross, MIT, single file, no deps, sub-arcminute) | vendored into `lib/` — no network |
| bright stars | HYG subset, mag ≤ 4.0 (~500 rows: RA, Dec, mag, name for the ~50 named) | ~20 KB JSON, shipped |
| Milky Way | stylised polygon band in galactic coords + soft noise fill | not 10k faint stars — a painted band |
| ISS orbit (phase 6) | `celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON` + SGP4 via `satellite.js` | **Celestrak CORS is unreliable from a static page.** Fallback: commit a TLE snapshot to the repo, refresh it on deploys. That keeps phase 6 Tier 1. |

## Core model

`state = { lat, lon, place, t }`. `t` is the master variable; everything
derives from it.

Per frame (rAF):
1. `t` → sun/moon/planet **equatorial** coords (astronomy-engine), then
   **→ horizontal (alt, az)** for `(lat, lon, t)`.
2. Sun altitude → sky state: day / civil (0…−6°) / nautical (−6…−12°) /
   astronomical (−12…−18°) / night → drives the gradient.
3. Project each object to the canvas:
   `x = w/2 + wrap180(az − viewAz)/hfov · w`,
   `y = h · (1 − alt/altTop)` (hfov ≈ 110°, altTop ≈ 80°); below the
   horizon → hidden/faded.
4. Paint: gradient → Milky Way band → stars → planets → moon (lit fraction
   correctly oriented) → cloud veil (opacity = cloud % at `t`) → grain.

Positions move slowly — recompute bodies at ~2 Hz, rotate the star/MW
transform every frame. `now` resets `t` to real time; play advances it
(~1 min per real second); scrub maps `[dusk, dawn] → t`.

## Build phases

Each is independently viewable.

1. **Skeleton** — location (device → search fallback → remember last),
   the horizon canvas with drag-to-turn, the time model (now / play /
   scrub), and the sky gradient driven by sun altitude. Nothing else on
   screen yet. *~1 day.*
2. **Bodies** — moon (position + phase + lit orientation), the five
   planets, twilight bands. Tap-to-select → info card with the advice
   sentence (rule-based per object: altitude band, twilight visibility,
   rise/set). *~1–1.5 days.*
3. **Stars + Milky Way** — bundled catalogue, magnitude → size/brightness;
   the stylised MW band. *~1 day.*
4. **Weather** — Open-Meteo forecast fetch + cache, the veil tracking
   cloud % across the scrubbed night, the one-line verdict computed from
   the hourly series. Graceful when offline (veil just absent). *~½ day.*
5. **The look** — OKLCH sky gradients per twilight state, grain overlay,
   soft bloom on the moon/planets/bright stars, motion easing, a compass
   hint on the horizon, `prefers-reduced-motion`, responsive + touch.
   *~1–1.5 days.* → **ship v1.**
6. **ISS (post-v1)** — vendored TLE snapshot + `satellite.js` SGP4,
   tonight's visible passes (satellite sunlit, observer dark, above the
   horizon), a callout line and a moving mark on the panorama. *~1 day.*

## Decisions still open

1. **Astronomy library** — vendor `astronomy-engine` (recommended: one
   MIT file, accurate, no deps) vs. hand-roll Meeus formulae (smaller,
   less accurate, much more code)?
2. **Star catalogue depth** — bright only (~500, mag ≤ 4, ~20 KB) /
   to mag 5 (~1,600, ~60 KB) / denser. Prettier vs. heavier.
3. **Turning the view** — drag only, or also a tap-a-compass-point strip?
   And on load, auto-face the direction with the moon/planets, or always
   start due south?
4. **Milky Way** — stylised painted band (light, on-brand) vs. real dense
   faint-star field (heavier, more "accurate").
5. **ISS data** — accept a committed TLE snapshot refreshed on deploy
   (keeps it Tier 1), or a tiny relay (Tier 2) for always-live elements?
6. **Confirm:** ISS is phase 6 (post-v1), per pick #09. If it belongs in
   v1, say so.

## Stays true to the system

Tier 1 through v1 (two keyless fetches, both optional to the core).
No backend, no secrets, no per-use cost. The `builder` subagent builds it
in its worktree; a human runs `deploy-app.ps1`. Per-app `README.md` with
the cost line ($0) and removal steps, same as every other app.
