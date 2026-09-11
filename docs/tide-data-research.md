# Tide — data research (verified 2026-09-10)

Every claim below was checked with `curl` from a non-browser origin
(`Origin: https://example.com`) on 2026-09-10. "CORS" means the response
carried `Access-Control-Allow-Origin: *`. Re-verify before phase 2 if more
than a couple of months have passed.

## Summary

| Need | Source | Keyless | CORS | Verdict |
|---|---|---|---|---|
| Sea level at *your* place, anywhere | **Open-Meteo Marine** `sea_level_height_msl` (hourly **and 15-minutely**) | yes | yes | **Backbone for "your beach"** — global, forecast 0–15 days, `past_days` up to 92 works |
| Official predictions, US coasts | **NOAA CO-OPS** predictions API (hi/lo or 6-min) | yes | yes | Use when within reach of one of 3,499 stations; authoritative |
| Harmonic constants, US stations | NOAA CO-OPS `harcon.json` (1,256 reference stations) | yes | yes | Lets the app predict any date locally for US stations, no network |
| The **global tide field** for the globe | **EOT20** (DGFI-TUM), global 0.125°, 66°S–66°N + FES2014b poleward fill | download once at build time | n/a (shipped in `data/`) | **CC-BY 4.0** — redistributable with attribution |
| Moon / sun position, phase, sub-lunar point | `astronomy-engine` (already vendored in `apps/tonight/lib/astronomy.js`, MIT) | n/a | n/a | Copy the file; no network |
| Name → lat/lon | Open-Meteo geocoding (as Tonight) | yes | yes | Proven |
| Coastlines / land for the globe | Natural Earth 110m (globe) + 50m (zoomed), public domain | build time | n/a | ~200 KB + ~800 KB GeoJSON; convert to compact binary if size bites |

Nothing needs a key, a backend, or a licence agreement. Tier 1 holds.

## 1. Open-Meteo Marine — `sea_level_height_msl`

```
https://marine-api.open-meteo.com/v1/marine?latitude=50.82&longitude=-0.14
  &minutely_15=sea_level_height_msl&forecast_days=3&timezone=auto
```

- Field label in their docs: "Sea Level Height including tides (above global
  mean sea level)". Units metres, datum **MSL**.
- `hourly=` gives 24 values/day; `minutely_15=` gives 96/day (verified 95
  returned for `forecast_days=1`, i.e. 96 minus the current partial).
- `forecast_days` allowed 0–15 (16 rejected with a clear error).
  `past_days=92` returned 200. So one call can cover **−92 d … +15 d**.
- Coverage is global; the request for **an inland point (Kansas) still
  returns a series** (nearest ocean cell), so the app must guard with its
  own "how far is the coast" test (nearest Natural Earth coastline vertex;
  say "you are N km from the sea" and show the nearest coast instead).
- **Accuracy check, Boston (42.3547, −71.0534), 2026-09-10**, against the
  official NOAA station 8443970:

  | Event | NOAA (MLLW) | Open-Meteo hourly (MSL) | Timing gap |
  |---|---|---|---|
  | Low | 04:58 | 05:00 min at −2.06 m | ≈ 0 |
  | High | 11:12 | 11:00 max at +0.93 m | ≈ 12 min (hourly resolution) |
  | Low | 17:15 | 17:00 min at −2.04 m | ≈ 15 min |
  | High | 23:31 | 23:00 max at +1.11 m | ≈ 30 min |

  Range ≈ 3.0 m vs NOAA ≈ 3.2–3.3 m: Open-Meteo runs ~7 % low in amplitude
  here and its turning-point times are only as good as the sampling, so
  **always use `minutely_15` for turning points** and interpolate the
  extremum (fit a parabola through the three samples around each min/max).
- Brighton (UK) returned a plausible ~6 m range — consistent with the known
  spring range there. Not an official check; UK official tables are UKHO
  (keyed API), so the UK gets Open-Meteo + the "official tables" hand-off.
- Cache: `localStorage`, key by rounded lat/lon (2 dp) + fetch day; TTL
  6 h. Because the forecast is 15 days long, the cached series makes the
  app **fully usable offline for two weeks** after one successful call.

## 2. NOAA CO-OPS (United States, territories, some Pacific)

Station index (2 MB — **do not fetch at runtime**; reduce at build time to
`data/noaa-stations.json` with id, name, lat, lon, type, ~150 KB):

```
https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions
```
3,499 stations: 1,256 type `R` (reference, have harmonic constants) and
2,243 type `S` (subordinate, time/height offsets from a reference station).

Predictions (hi/lo, metric, local time):
```
https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions
  &station=8443970&begin_date=20260910&range=72&datum=MLLW&units=metric
  &time_zone=lst_ldt&interval=hilo&format=json
```
(`date=today` also works; `interval=6` gives the 6-minute curve.) Datum:
NOAA predictions are relative to **MLLW**; Open-Meteo is **MSL**. The
`datums.json` endpoint gives the MSL–MLLW offset per station if the two
ever need to be shown together. Simplest UI rule: **present heights as
"above/below the average sea level here"** and never mix datums on one
curve.

Harmonic constants (reference stations only):
```
https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/8443970/harcon.json?units=metric
```
37 constituents with amplitude (m), `phase_GMT`, `speed` (°/h). With these
plus nodal corrections the app can predict **any date** for a US reference
station with no network at all (cache per station indefinitely).

Rule for choosing a source at a place: if the nearest NOAA station is
≤ 15 km away **and on the same water body** (cheap proxy: nearest station
by great-circle distance and both within 2 km of the coastline), use NOAA
and label it "official NOAA prediction, station name". Otherwise Open-Meteo,
labelled "model estimate".

## 3. EOT20 — the field that makes the globe breathe

- Hart-Davis et al. 2021, DGFI-TUM. SEANOE record 79489,
  <https://doi.org/10.17882/79489>. Licence confirmed on the SEANOE API:
  **CC BY 4.0**. Open access, "should be used for all applications".
- Contents: ocean tide amplitude/phase for 17 constituents on a 0.125°
  global grid (NetCDF), 66°S–66°N observed, FES2014b fills the poles.
- **Build-time pipeline (a script in `scripts/`, not shipped, run once):**
  download `ocean_tides/{M2,S2,N2,K2,K1,O1,P1,Q1}_ocean_eot20.nc`,
  downsample to **1°** (nearest-cell of the 8×8 block, keeping NaN for
  land), quantise amplitude to cm (uint16) and phase to 0–359° (uint16),
  write `data/tide-field.bin` + a tiny JSON header. Budget: 8 constituents
  × 360 × 180 × 4 bytes ≈ **2 MB raw, ~600 KB gzipped** — or drop to M2,
  S2, K1, O1 for ~300 KB and lose almost nothing visually. Ship whichever
  the size budget allows; the globe only needs the shape of the wave.
- **In the app**, sea level at a cell and time t is
  `η = Σ_i f_i · A_i · cos(ω_i·t + (V0+u)_i − G_i)` where `V0` is the
  astronomical argument at the epoch, `f`/`u` the 18.6-year nodal
  corrections (Schureman / IHO formulas — port from `pyTMD`, which is MIT
  and documents EOT20 conventions: phase lags are Greenwich, in degrees).
  This is ~150 lines of JS, unit-testable against NOAA predictions for a
  station whose constants you also have.
- What it shows: the semidiurnal wave circling the basins, the
  **amphidromic points** (where amplitude → 0 and phase lines converge,
  e.g. three in the North Sea, one south of Greenland, several in the
  Pacific), spring/neap swelling as S2 beats against M2, and the diurnal
  dominance of the Gulf of Mexico and parts of SE Asia. All true, all
  rarely seen.
- Attribution line for the README and the about panel: "Global tide field:
  EOT20 (Hart-Davis et al., 2021, DGFI-TUM), CC BY 4.0."

## 4. Astronomy

`astronomy-engine` (MIT, already at `apps/tonight/lib/astronomy.js`):
moon and sun geocentric vectors → **sub-lunar and sub-solar points**
(RA/Dec + Greenwich sidereal time → lat/lon), moon phase, moonrise/set,
sunrise/set, distance (perigee → bigger tides). No network.

## 5. Coastline and "distance to the sea"

Natural Earth (public domain): `ne_110m_land` for the globe (~200 KB
GeoJSON; fine), `ne_50m_land` or `ne_50m_coastline` for the zoomed view
(~800 KB; acceptable, or convert to a quantised int16 binary at build
time). Distance-to-coast: nearest coastline vertex at 50m resolution
(≈ 1–2 km spacing near shores) is good enough for "you are 40 km inland".

## 6. What is *not* available keyless

- UK: UKHO Admiralty Tidal API needs a key. → Open-Meteo + hand-off to
  EasyTide.
- Australia (BOM), France (SHOM), Canada (CHS has an open API, CORS
  unverified — worth a look in phase 2 if a Canadian station is wanted),
  Japan (JMA): keyed, licensed, or unverified. → Open-Meteo everywhere,
  and an "official tables for this coast" link chosen by country.
- Surge / weather effects: Open-Meteo's field "includes tides" and may
  include some meteorological component; the app never claims to.

## 7. Safety posture (carry into the brief and the copy)

Tide is an exploration and information experience, **not a navigation or
safety product**. The place card always carries a one-line hand-off ("For
navigation or anything safety-critical use the official tables: NOAA /
UKHO EasyTide / …" chosen by country), and any cut-off-time phrasing
("the water turns at 14:10") is framed as an estimate with the source
named beside it.
