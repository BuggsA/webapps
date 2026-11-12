# Tide place pages - what could come next

The place pages (`/tide-times/<place>/`, built by `scripts/tide-build-places.py`)
exist to bring searches like *"Ocean City tide times"*, *"how high is the tide
in ..."* or *"... water temp"* to tidehere.app. This is the list of what could
be added to them, written 2026-11-12 at the owner's request (*"maybe a list
that can be added to the repo?"*).

**Nothing below is approved.** Each item is a proposal until the owner says
yes to it by name. The one rule every item has to pass: **each fact on a page
comes from that place's own data.** If a station has no data for something,
the line is left out, not filled with words. Near-identical pages made in bulk
get a site treated as spam.

Order is by what we expect to bring the most searches for the least work.

## Do first

1. **Wait for Search Console.** Submit `sitemap.xml`, then see how many of the
   235 pages get indexed over 2-4 weeks before adding more. A new domain that
   publishes thousands of pages at once often has most of them crawled but
   not indexed.
2. **Titles that match how people ask.** Add "and heights" to titles
   (*"... tide times, heights & water temperature"*). Lead with the town when
   NOAA names a pier or an inlet ("Ocean City" before "Inlet").
3. **A tide chart for today.** A small curve of the day, drawn from the
   shipped harmonic constants and pinned to NOAA's highs and lows. People
   search for *"tide chart"* as often as for *"tide times"*. The globe
   already draws one (`#curve` in `tide.js`).
4. **Sunrise, sunset and moon phase for today**, from `lib/astronomy.js`, which
   the site already ships. Fishing and tide-pool searches ask for them
   together with the tide.

## Batch two: more places

5. **NOAA subordinate stations (~2,200).** These are mostly town and beach
   names, which is what people type. NOAA publishes official high/low
   predictions for them but no harmonic constants or datums. Their pages
   would carry the week, the range and the year's biggest tides (read from
   a year of predictions), and nearby places. That makes thinner pages, but
   still pages about one place. Add them in groups, watching indexing.
6. **Towns with no station** (e.g. Ocean City, NJ): name them on the nearest
   station's page ("also covers ..."), never on a page of their own. Several
   pages showing one station's tide would be duplicates.
7. **Region pages** (`/tide-times/california/` and so on) in place of the
   anchors on the index, for searches like *"California tides"*. Each needs
   its own content (largest range in the state, the year's king tide dates
   along that coast) to be more than a list.

## More on each page

8. **Water temperature through the year.** Monthly averages from a year of
   NOAA hourly readings, for the 170 gauges that measure it. This answers
   *"is the water warm enough in June"* with that place's own numbers.
9. **High tide flooding days.** NOAA publishes a high-tide-flooding outlook
   for many of these stations (`HTFmonthly` in the station list). *"How many
   days will this street flood in 2027"* is unique, local and newsworthy.
10. **Waves and swell** from Open-Meteo Marine, which the globe already
    calls, for surf searches. Labelled as a model forecast.
11. **A printable month / calendar file**: a month table, and the "Add to
    calendar" `.ics` the globe already makes. Better than separate
    *"tide times March 2027"* pages, which would be thin.
12. **Currents.** NOAA's ~3,000 current prediction stations, for boaters.
    It's a different product with different pages, so do it only if boating
    traffic shows up.

## Linking

13. **Open the globe at the place.** A link from each page into the globe
    already flown to that coast. This needs `?lat=&lon=` support in
    `tide.js`, a change to the app itself.
14. **Find a place on the index**: a search box and "near me" on
    `/tide-times/`, for people who arrive there.

## Keeping it right

15. **The yearly rebuild.** Every January: `tide-fetch-places.py <year>`,
    `tide-build-places.py <year>`, then merge. Until then the pages talk
    about the wrong year's king tides. This could be a scheduled task that
    opens a pull request; merging stays the owner's.
16. **Recheck water temperature yearly** (delete the `watertemp.json` files
    in the cache) so titles stop promising it at gauges that have died, and
    start where new ones appear.
17. **Outside the US**: model-estimate pages for popular coasts (Open-Meteo,
    as the globe uses). Only with the estimate labelled on the page, and
    only after the US pages are proven.
