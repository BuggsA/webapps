# Tonight

The sky above you, right now, as a horizon panorama. It finds you (device
location or a search box), then draws twilight, the moon, the naked-eye
planets, the Milky Way band and the bright stars where they actually are
above your horizon — face a direction and swipe to turn. It opens on *now*;
a play button drifts time forward and a scrub runs dusk→dawn. One free
weather call adds a cloud veil and a plain verdict ("mostly clear after
11"). Tap any object for a card: name, height, rise/set, a sentence of
advice. Everything astronomical is computed in the browser.

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

**Status:** v1 complete (phases 1–5). Location, time model, the film-curve
sky, the moon and naked-eye planets, ~500 bright stars + a stylised Milky
Way, tap-to-select cards, a cloud-cover veil + one-line verdict, a faint
compass hint, drag-glide, a full `prefers-reduced-motion` path, and a
responsive/touch pass. ISS passes are phase 6 (post-v1). See
`../../docs/tonight-build-plan.md` and `../../PROJECT_STATE.md`.

`data/stars.json` is a compact HYG subset (mag ≤ 4.0, ~519 stars: RA/Dec
J2000, magnitude, B−V, proper name for the bright ones), derived from the
d3-celestial catalogue (MIT). ~16 KB, shipped; no runtime network.

**Cost:** nothing. Pure static HTML/CSS/JS, no backend, no build step. The
only runtime network is two keyless, CORS-open Open-Meteo calls — geocoding
(only when you use the search box) and cloud cover (cached ~1 h) — and the
sky still renders fully offline without them. Vendors `astronomy-engine`
(`lib/astronomy.js`, ~116 KB, MIT) locally; no CDNs.

**To remove:** delete `apps/tonight/` and run
`aws s3 rm s3://<bucket>/tonight/ --recursive`.
