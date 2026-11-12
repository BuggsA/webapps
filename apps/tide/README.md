# Tide

The moon moving the ocean, on a globe seen from the moon — and the next
high and low water where you are. The camera sits at the point directly
beneath the moon, so the tidal bulge faces you and the Earth turns under
it; the world's sea rises and falls cell by cell from a real global tide
model (EOT20), rendered as light on water rather than as a colour scale.
Find your coast (device location or a search box) and the globe flies
down to it; a readout gives the state in words ("Falling · low in 2 h
10"), the next four turning points, today's range, springs or neaps, the
moon's phase and rise/set, and the sun's. A hairline scrub runs from
three days ago to fifteen days ahead; **Play** runs the globe at an hour a
second so the wave can be watched chasing the moon. Tap the moon disc to
return to its view. Where a NOAA station is within 15 km the numbers are
official predictions, labelled by station; everywhere else they are a
model estimate from Open-Meteo, labelled as such, with a hand-off line to
the official tables for that coast. Inland places are told how far they
are from the sea and shown the nearest coast.

**Design direction:** Under the Moon + two borrows — see
[`../../docs/tide-art-direction.md`](../../docs/tide-art-direction.md).
One sea hue whose luminance carries the tide height; land as a matte
silhouette derived from it; a soft terminator with a warm edge;
moonlight as a faint lift on the near limb; the readout set as table
rows under a hairline, never a card; Fraunces for words, Space Grotesk
tabular numerals for numbers; a single film grain; nothing pulses.

**Status:** v1 live at `/tide/` (deployed 2026-09-13) — phases 0–5 of
[`../../docs/tide-build-plan.md`](../../docs/tide-build-plan.md). See
`../../PROJECT_STATE.md`. **Next:** `../../docs/tide-v2-plan.md` — the
readout is thin for real users (no curve, no week, wrong datum for
boaters); v2 fixes that, answer first, globe second.

**Data shipped in `data/`:**
- `tide-field.bin` + `tide-field.json` — EOT20 ocean tide (Hart-Davis
  et al., 2021, DGFI-TUM; CC BY 4.0, <https://doi.org/10.17882/79489>)
  downsampled to 1°, eight constituents (M2 S2 N2 K2 K1 O1 P1 Q1),
  amplitude in mm (uint16) + Greenwich phase (uint8). Built once by
  `scripts/tide-prep-field.py`.
- `land-110m.json`, `land-50m.bin` — Natural Earth land (public domain),
  built by `scripts/tide-prep-coast.py`.
- `noaa-stations.json` — NOAA CO-OPS tide-prediction station index
  (id, name, lat, lon, type, state, reference), reduced from the public
  MDAPI.
- `lib/astronomy.js` — astronomy-engine (Don Cross, MIT).
  `lib/harmonics.js` — the harmonic prediction core (ours), gated against
  NOAA official predictions by `scripts/tide-test-harmonics.js`.

**Cost:** nothing. Pure static HTML/CSS/JS — no backend, no build, no
CDNs. Runtime network, all keyless, CORS-open, cached in `localStorage`
and optional: Open-Meteo Marine (`sea_level_height_msl`, 15-minutely,
one call per place, 6 h cache), Open-Meteo geocoding (search box only),
NOAA CO-OPS predictions (one call per nearby US station, 24 h cache).
The globe, the tide field and all astronomy are computed locally; with
the network unplugged the globe runs and the readout works from cache
for up to fifteen days. Your place is stored in `localStorage` only and
never sent anywhere except as the coordinates of the sea-level request.
Telemetry (`telemetry.js`) ships dormant — `ENDPOINT = ''`.

**Place pages** (`tide-times/`, 2026-11-12): one page per NOAA tidal
station, built from NOAA data, and rebuilt every January:

    python scripts/tide-fetch-places.py 2028
    python scripts/tide-build-places.py 2028

The generated `tide-times/<place>/` folders and `sitemap.xml` are output;
edit the script, not them. `tide-times/place.js` fills in the live week.
What could come next: `../../docs/tide-places-backlog.md`.

**Hosting:** a Cloudflare Worker with static assets, no script —
`../../cloudflare/tide/wrangler.jsonc` serves this folder as it is.
See `../../cloudflare/README.md`.

**To remove:** delete `apps/tide/` and `cloudflare/tide/`, and delete the
`tide` Worker in the Cloudflare dashboard.
