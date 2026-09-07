# Tonight

The sky above you, right now, as a horizon panorama. It finds you (device
location or a search box), then draws twilight, the moon, the naked-eye
planets, the Milky Way band and the bright stars where they actually are
above your horizon — face a direction and swipe to turn. It opens on *now*;
the scrub runs dusk→dawn, and one button taps through the time modes —
**Live** (tracks the real clock) → a 24-hour time-lapse at **10m / 3m /
1m / 20s** to completion, each looping back to where you started it.
One free weather call adds a cloud veil (toggleable) and a plain verdict
("mostly clear after 11"). Tap any object for a card: name, height,
rise/set, a sentence of advice. When the **ISS** makes a visible pass
tonight, a line by the place name calls it out ("ISS · 21:14, rises WNW
→ 61°") — tap to play the pass; its arc and a moving mark ride the sky.
Everything astronomical is computed in the browser.

**Design direction:** Nocturne + two borrows — see
[`../../docs/tonight-art-direction.md`](../../docs/tonight-art-direction.md),
including its Chrome and Palette sections. The field is the interface: a
film-response-curve palette (teal-lifted blacks, warm-neutral mids, amber
bloom + halation at the sunward horizon) over a structured, azimuth-aware
scene-luminance, with Belt-of-Venus and Earth's-shadow bands on the
antisolar side — so turning the view changes the sky. Texture (grain,
mottling, haze, belt geometry) is seeded per place + night. Chrome is
Fraunces written onto the field: no boxes, blur, shadows or radii. A faint
alt/az graticule appears only while you drag; a hairline leader line tethers
a tapped object to its card.

**Status:** v1 complete (phases 1–5) **plus phase 6 (ISS passes)**.
Location, time model, the film-curve sky, the moon and naked-eye planets,
~500 bright stars + a stylised Milky Way, tap-to-select cards, a
cloud-cover veil + one-line verdict, a faint compass hint, drag-glide,
tonight's visible ISS passes (arc + moving mark + callout), a full
`prefers-reduced-motion` path, and a responsive/touch pass. See
`../../docs/tonight-build-plan.md` and `../../PROJECT_STATE.md`.

`data/stars.json` is a compact HYG subset (mag ≤ 4.0, ~519 stars: RA/Dec
J2000, magnitude, B−V, proper name for the bright ones), derived from the
d3-celestial catalogue (MIT). ~16 KB, shipped; no runtime network.

`data/iss-tle.json` is a committed ISS two-line element set (from
Celestrak) — the offline fallback for the pass computation. At runtime the
app makes one best-effort keyless call to `api.wheretheiss.at` for fresher
elements (cached ~12 h, only used if newer than the snapshot, **no
location sent**); SGP4 drifts within ~1 week of the epoch, so replace the
file on deploy to keep the offline path current.

**Cost:** nothing. Pure static HTML/CSS/JS, no backend, no build step. The
only runtime network is three keyless, CORS-open calls — Open-Meteo
geocoding (only with the search box), Open-Meteo cloud cover (cached ~1 h),
and wheretheiss.at for the ISS elements (cached ~12 h) — and the sky still
renders fully offline without any of them. Vendors `astronomy-engine`
(`lib/astronomy.js`, ~116 KB, MIT) and `satellite.js`
(`lib/satellite.min.js`, ~23 KB, MIT — v5.0.0 UMD; 7.x has no UMD build)
locally; no CDNs.

**Telemetry:** `telemetry.js` (a copy of `apps/_shared/telemetry.js`) is a
tiny, portable event logger, loaded before `tonight.js`. It is **off by
default** — `ENDPOINT = ''`, so nothing is sent; events only accumulate in a
capped in-memory buffer (`window.__telemetry.buf`, or load with
`?debug=telemetry`). It is **PII-free**: no latitude/longitude, no stable
identifier — a random per-load session id plus coarse context (viewport,
dpr, timezone name, language, reduced-motion, touch, referrer host). The app
records interaction and one per-session frame-time sample. To actually
collect, point `ENDPOINT` at a POST collector and add a line to the privacy
copy above.

**To remove:** delete `apps/tonight/` and run
`aws s3 rm s3://<bucket>/tonight/ --recursive`.
